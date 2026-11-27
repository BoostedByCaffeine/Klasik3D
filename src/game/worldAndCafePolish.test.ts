import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChairSafeExitWaypoints,
  computeArticulatedWalkGait,
  computeCatenaryLeashPoints,
  computeCrowdAndObstacleSteering,
  getSceneryStaticObstacles,
  getTitleScreenMiataObstacles,
  rollDineInStaySeconds,
  selectSpreadLoungeSeat,
  stepSpringScalar,
} from './npcPhysicsAndSteering';
import {
  FAVELA_STAIR_END_Z,
  FAVELA_STAIR_START_Z,
  FAVELA_STAIR_STEP_COUNT,
  FAVELA_STAIR_TOP_OFFSET,
  FAVELA_STAIR_TREAD_DEPTH,
  FAVELA_UPPER_CURVE_STEP_COUNT,
  evaluateFavelaAlleyLifecycle,
  getFavelaHillHeight,
  getFavelaStairCenterX,
  getFavelaUpperCurveDir,
  sampleFavelaStairSurfaceY,
} from './outdoorLod';
import {
  computeAdaptiveCameraFov,
  mapPointerToViewportNdc,
  resolveIosSafariViewport,
} from './iosViewport';
import {
  BRAZILIAN_GUIDE_DANCE_STEPS,
  FAVELA_DANCE_AUDIO_PLAYBACK_RATE,
  FAVELA_DANCE_BEAT_SEC,
  FAVELA_DANCE_GUIDE_BPM,
  FAVELA_DANCE_LOOP_DURATION_SEC,
  FAVELA_DANCER_WALK_END_X,
  FAVELA_DANCER_WALK_START_X,
  computeBeatSnappedPulse,
  createBrazilianLRLRLRLRClip,
  evaluateBrazilianGuideDanceFrame,
  resolveFavelaDanceAudioUrl,
  resolveVideoBeatSyncTime,
} from './brazilianLRLRLRLRDance';
import {
  INTERIOR_THEME_LIGHTING,
  buildInteriorDecorThemes3D,
} from './interiorDecorThemes3d';
import {
  ALL_INTERIOR_THEME_IDS,
  INTERIOR_THEMES_CATALOG,
  KlasikGameState,
  LOUNGE_SEAT_COORDS,
  LOUNGE_TABLE_LAYOUT,
  SCENERY_CATALOG,
  acceptCustomerOrder,
  advanceSimulationTick,
  createInitialGameState,
  exportSaveJson,
  importSaveJson,
  performCupAction,
  preparePastry,
  purchaseOrEquipInteriorTheme,
  serveCurrentCupToCustomer,
  unlockAllEverythingCheat,
} from './rules';
import {
  APP_VERSION,
  canUpgradeApkInPlace,
  formatApkFileName,
  formatAppVersionBadge,
} from './appVersion';
import { resolveFirstDrinkTutorialStep } from './onboarding';

test('articulated walk gait produces phase-true uphill climb, downhill braking, and jog joint physics', () => {
  const flat = computeArticulatedWalkGait({ phase: 0.4, speedNorm: 1.0, slopePitch: 0 });
  const uphill = computeArticulatedWalkGait({ phase: 0.4, speedNorm: 1.0, slopePitch: 0.42 });
  const downhill = computeArticulatedWalkGait({ phase: 0.4, speedNorm: 1.0, slopePitch: -0.42 });
  const jog = computeArticulatedWalkGait({ phase: 0.4, speedNorm: 1.2, isJogging: true });

  // Uphill leans torso further forward and drives high knee tuck (> flat)
  assert.ok(uphill.torsoPitchX > flat.torsoPitchX + 0.08);
  assert.ok(Math.max(uphill.leftKneeX, uphill.rightKneeX) > Math.max(flat.leftKneeX, flat.rightKneeX));
  // Downhill leans slightly back/upright with deep trailing knee absorption
  assert.ok(downhill.torsoPitchX < flat.torsoPitchX);
  assert.ok(Math.max(downhill.leftKneeX, downhill.rightKneeX) > 0.45);
  // Jogging pumps elbows much tighter than walking
  assert.ok(jog.leftElbowX < -1.0);
  assert.ok(flat.leftElbowX > -0.6);

  // Critically damped spring converges cleanly toward target without NaN
  let sp = { value: 0, velocity: 0 };
  for (let i = 0; i < 40; i++) {
    sp = stepSpringScalar(sp, 1.0, 120, 18, 0.016);
  }
  assert.ok(Math.abs(sp.value - 1.0) < 0.05);
});

test('forward-monotonic hysteresis steering avoids street fixtures and oncoming NPCs without stalling or glitching', () => {
  const obstacles = getSceneryStaticObstacles('busy_street', true);
  assert.ok(obstacles.length >= 6);

  // Place walker heading +X right toward a streetlight obstacle
  const lamp = obstacles[4];
  const steerObs = computeCrowdAndObstacleSteering({
    selfId: 'ped-0',
    x: lamp.x - 0.85,
    z: lamp.z,
    dir: 1,
    baseLaneZ: lamp.z,
    minZ: -9.3,
    maxZ: -7.5,
    obstacles,
    neighbors: [],
  });
  assert.ok(Math.abs(steerObs.avoidZOffset) > 0.15, 'Should steer laterally around street fixture');
  assert.equal(steerObs.lateralPushX, 0, 'Must never push NPC backward or stall forward progress');
  assert.ok(steerObs.chosenAvoidSide === 1 || steerObs.chosenAvoidSide === -1);

  // Hysteresis check: feeding chosenAvoidSide back keeps the same committed side while passing
  const steerNext = computeCrowdAndObstacleSteering({
    selfId: 'ped-0',
    x: lamp.x - 0.35,
    z: lamp.z + steerObs.avoidZOffset * 0.5,
    dir: 1,
    baseLaneZ: lamp.z,
    minZ: -9.3,
    maxZ: -7.5,
    obstacles,
    neighbors: [],
    preferredAvoidSide: steerObs.chosenAvoidSide,
  });
  assert.equal(steerNext.chosenAvoidSide, steerObs.chosenAvoidSide, 'Sticky hysteresis prevents side oscillation');

  // Place oncoming pedestrian directly ahead in same lane (simulating title-screen encounter)
  const steerCrowd = computeCrowdAndObstacleSteering({
    selfId: 'ped-0',
    x: 0,
    z: -8.2,
    dir: 1,
    baseLaneZ: -8.2,
    minZ: -9.3,
    maxZ: -7.5,
    obstacles: [],
    neighbors: [
      { id: 'ped-0', x: 0, z: -8.2, vx: 1.2, vz: 0, radius: 0.45 },
      { id: 'ped-1', x: 1.15, z: -8.2, vx: -1.2, vz: 0, radius: 0.45 },
    ],
  });
  assert.ok(Math.abs(steerCrowd.avoidZOffset) > 0.1, 'Should sidestep oncoming NPC');
  assert.equal(steerCrowd.lateralPushX, 0, 'Oncoming encounter must never stall or reverse X');
  assert.ok(steerCrowd.speedScale >= 0.72 && steerCrowd.speedScale <= 1.0);
});

test('catenary leash pins exact hand and collar endpoints and sags more when slack than taut', () => {
  const hand = { x: 0.22, y: 0.78, z: 0.22 };
  const collarClose = { x: 0.28, y: 0.32, z: 0.68 };
  const collarFar = { x: 0.28, y: 0.32, z: 1.16 };

  const slackPts = computeCatenaryLeashPoints(hand, collarClose, 8, 1.05, 0);
  const tautPts = computeCatenaryLeashPoints(hand, collarFar, 8, 1.05, 0);

  assert.equal(slackPts.length, 9);
  assert.deepEqual(slackPts[0], hand);
  assert.deepEqual(slackPts[8], collarClose);
  assert.deepEqual(tautPts[0], hand);
  assert.deepEqual(tautPts[8], collarFar);

  const slackMidY = slackPts[4].y;
  const tautMidY = tautPts[4].y;
  const linearMidY = (hand.y + collarClose.y) * 0.5;
  assert.ok(slackMidY < linearMidY - 0.05, 'Slack leash must dip visibly below straight chord');
  assert.ok(slackMidY < tautMidY, 'Slack leash must sag deeper than taut leash');
});

test('Brazilian 88 BPM dance guide choreography matches exact 10-step mirrored timing, snap-to-hold, 70% fast bursts, and synced audio rate', () => {
  assert.equal(FAVELA_DANCE_GUIDE_BPM, 88);
  assert.equal(BRAZILIAN_GUIDE_DANCE_STEPS.length, 10);
  assert.ok(Math.abs(FAVELA_DANCE_LOOP_DURATION_SEC - 5.4545) < 0.01);
  assert.ok(FAVELA_DANCE_AUDIO_PLAYBACK_RATE > 1.02 && FAVELA_DANCE_AUDIO_PLAYBACK_RATE < 1.06);
  assert.ok(FAVELA_DANCER_WALK_START_X <= -30 && FAVELA_DANCER_WALK_END_X >= 30);

  // Relative GitHub Pages URL resolution
  assert.equal(resolveFavelaDanceAudioUrl('/'), '/assets/aistudio/brazillian_danceq_c4c19f70.MP4');
  assert.equal(resolveFavelaDanceAudioUrl('./'), './assets/aistudio/brazillian_danceq_c4c19f70.MP4');
  assert.equal(
    resolveFavelaDanceAudioUrl('/klasik-cafe/'),
    '/klasik-cafe/assets/aistudio/brazillian_danceq_c4c19f70.MP4'
  );

  // Step 1 (slow Pose R) completes snap by u = 0.27 and holds +1.00 amplitude
  const step1Hold = evaluateBrazilianGuideDanceFrame(FAVELA_DANCE_BEAT_SEC * 0.45);
  assert.equal(step1Hold.stepIndex, 0);
  assert.equal(step1Hold.dir, 1);
  assert.equal(step1Hold.fast, false);
  assert.ok(Math.abs(step1Hold.poseBlend - 1.0) < 0.001);
  assert.ok(step1Hold.hipBounce < 0, 'Hip bounce dips downward during impact window');

  // Step 4 (fast burst 1: L @ t = 3.0..3.5 beats) holds 70% amplitude (-0.70)
  const step4Hold = evaluateBrazilianGuideDanceFrame(FAVELA_DANCE_BEAT_SEC * 3.35);
  assert.equal(step4Hold.stepIndex, 3);
  assert.equal(step4Hold.dir, -1);
  assert.equal(step4Hold.fast, true);
  assert.ok(Math.abs(step4Hold.poseBlend - -0.7) < 0.001);

  // Step 6 (Phrase 2 start: mirrored Landing Pose L @ beat 4.0..5.0) holds -1.00 amplitude
  const step6Hold = evaluateBrazilianGuideDanceFrame(FAVELA_DANCE_BEAT_SEC * 4.5);
  assert.equal(step6Hold.stepIndex, 5);
  assert.equal(step6Hold.dir, -1);
  assert.equal(step6Hold.fast, false);
  assert.ok(Math.abs(step6Hold.poseBlend - -1.0) < 0.001);

  // Generated 20-bone Mixamo clip has exact 8-beat 88 BPM duration
  const clip = createBrazilianLRLRLRLRClip();
  assert.ok(Math.abs(clip.duration - FAVELA_DANCE_LOOP_DURATION_SEC) < 0.01);

  // Sync time scales MP4 media clock cleanly by playback rate
  const synced = resolveVideoBeatSyncTime(3.175 + 1.0 * FAVELA_DANCE_AUDIO_PLAYBACK_RATE, 0);
  assert.ok(Math.abs(synced - 1.0) < 0.02);

  // Legacy beat pulse helper still snaps cleanly on downbeat
  assert.ok(computeBeatSnappedPulse(0.22, false) > 0.95);
  assert.ok(computeBeatSnappedPulse(0.18, true) > 0.95);
});

test('Favela 32-step realistic stair sampler clears every tread box top with compact risers and step-synced lifecycle', () => {
  const alleyX = -5.2;
  const upperDir = getFavelaUpperCurveDir(alleyX);
  assert.ok(upperDir === 1 || upperDir === -1);
  assert.ok(FAVELA_STAIR_STEP_COUNT >= 32);

  // Verify compact human-scale risers (~0.23m average) and zero buried feet across every step
  let prevTopY: number | null = null;
  let totalRiser = 0;
  for (let step = 0; step < FAVELA_STAIR_STEP_COUNT; step++) {
    const stepT = step / FAVELA_STAIR_STEP_COUNT;
    const tz = FAVELA_STAIR_START_Z + (FAVELA_STAIR_END_Z - FAVELA_STAIR_START_Z) * stepT;
    const tx = getFavelaStairCenterX(alleyX, stepT);
    const treadTopY = getFavelaHillHeight(tx, tz) + FAVELA_STAIR_TOP_OFFSET;
    if (prevTopY !== null) {
      const riser = treadTopY - prevTopY;
      totalRiser += riser;
      assert.ok(riser > 0.05 && riser < 0.30, `Step ${step} riser=${riser.toFixed(3)}m must be realistic human scale`);
    }
    prevTopY = treadTopY;

    const sampledCenter = sampleFavelaStairSurfaceY(alleyX, tz);
    const sampledFrontLip = sampleFavelaStairSurfaceY(alleyX, tz + FAVELA_STAIR_TREAD_DEPTH * 0.42);
    assert.ok(
      sampledCenter >= treadTopY - 0.001,
      `Step ${step} center Y=${sampledCenter.toFixed(3)} sank below treadTopY=${treadTopY.toFixed(3)}`
    );
    assert.ok(
      sampledFrontLip >= treadTopY - 0.001,
      `Step ${step} front-lip Y=${sampledFrontLip.toFixed(3)} sank below treadTopY=${treadTopY.toFixed(3)}`
    );
  }
  const avgRiser = totalRiser / (FAVELA_STAIR_STEP_COUNT - 1);
  assert.ok(avgRiser <= 0.25, `Average stair riser (${avgRiser.toFixed(3)}m) should stay compact and realistic`);

  // Lifecycle starts far off-screen (±31.5m), climbs 32 steps + 8 upper curved steps, and conceals behind upper house
  const edgeStart = evaluateFavelaAlleyLifecycle(0.0, alleyX, 'uphill', 1);
  assert.ok(Math.abs(edgeStart.x) >= 30.5, 'Sidewalk start must be completely off-screen');

  const startPose = evaluateFavelaAlleyLifecycle(0.05, alleyX, 'uphill', 1);
  const turnPose = evaluateFavelaAlleyLifecycle(0.25, alleyX, 'uphill', 1);
  const midStairPose = evaluateFavelaAlleyLifecycle(0.55, alleyX, 'uphill', 1);
  const curvePose = evaluateFavelaAlleyLifecycle(0.85, alleyX, 'uphill', 1);
  const endPose = evaluateFavelaAlleyLifecycle(0.96, alleyX, 'uphill', 1);

  assert.equal(startPose.phaseKind, 'sidewalk');
  assert.equal(startPose.isConcealed, false);
  assert.equal(turnPose.phaseKind, 'stair_entry_turn');
  assert.equal(midStairPose.phaseKind, 'stairs');
  assert.ok(midStairPose.stepIndex > 8 && midStairPose.stepIndex < FAVELA_STAIR_STEP_COUNT);
  assert.ok(midStairPose.slopePitch > 0.15, 'Uphill climber must have positive slope pitch');
  assert.ok(midStairPose.y > startPose.y + 1.0, 'Climber elevates up the favela hillside');
  assert.equal(curvePose.phaseKind, 'upper_curve');
  assert.ok(
    curvePose.stepIndex >= FAVELA_STAIR_STEP_COUNT &&
      curvePose.stepIndex <= FAVELA_STAIR_STEP_COUNT + FAVELA_UPPER_CURVE_STEP_COUNT
  );
  assert.equal(endPose.phaseKind, 'concealed_behind_building');
  assert.equal(endPose.isConcealed, true);

  // Downhill resident emerges concealed behind the upper building, descends with negative slope, and exits off-screen
  const downStart = evaluateFavelaAlleyLifecycle(0.04, alleyX, 'downhill', 1);
  const downMid = evaluateFavelaAlleyLifecycle(0.45, alleyX, 'downhill', 1);
  const downEnd = evaluateFavelaAlleyLifecycle(1.0, alleyX, 'downhill', 1);
  assert.equal(downStart.isConcealed, true);
  assert.ok(downMid.slopePitch < -0.15, 'Downhill walker must have negative slope pitch');
  assert.equal(downEnd.phaseKind, 'sidewalk');
  assert.ok(Math.abs(downEnd.x) >= 30.5, 'Downhill walker must exit completely off-screen');
});

test('lounge seat distribution spreads across all 4 tables and dine-in stays are 35 to 60 seconds', () => {
  const occupied = new Set<number>();
  const firstFourTables = new Set<number>();

  for (let i = 0; i < 4; i++) {
    const seat = selectSpreadLoungeSeat(occupied, LOUNGE_SEAT_COORDS.length, 2, () => 0.25);
    assert.notEqual(seat, null);
    occupied.add(seat!);
    firstFourTables.add(Math.floor(seat! / 2));
  }
  assert.equal(firstFourTables.size, 4, 'First 4 dine-in patrons should spread across all 4 distinct tables');

  assert.equal(rollDineInStaySeconds(() => 0), 35);
  assert.equal(rollDineInStaySeconds(() => 1), 60);
  for (let r = 0; r <= 10; r++) {
    const stay = rollDineInStaySeconds(() => r / 10);
    assert.ok(stay >= 35 && stay <= 60);
  }
});

test('chair-safe exit routing clears table footprints from every lounge seat without colliding', () => {
  const exitGoal = { x: 9.2, z: -8.15 };

  for (let sIdx = 0; sIdx < LOUNGE_SEAT_COORDS.length; sIdx++) {
    const seat = LOUNGE_SEAT_COORDS[sIdx];
    const waypoints = buildChairSafeExitWaypoints({
      from: { x: seat.x, z: seat.z },
      goal: exitGoal,
      seatExitOrigin: { x: seat.x, z: seat.z },
      tables: LOUNGE_TABLE_LAYOUT,
      egressLaneX: -0.05,
      doorX: -1.15,
      corridorZ: -1.78,
      centerAisleZ: -3.65,
    });
    assert.ok(waypoints.length >= 4, `Seat ${sIdx} must emit structured aisle-safe exit waypoints`);

    const fullPath = [{ x: seat.x, z: seat.z }, ...waypoints];
    for (let wi = 0; wi < fullPath.length - 1; wi++) {
      const a = fullPath[wi];
      const b = fullPath[wi + 1];
      for (let t = 0.05; t <= 0.95; t += 0.1) {
        const px = a.x + (b.x - a.x) * t;
        const pz = a.z + (b.z - a.z) * t;
        for (const tbl of LOUNGE_TABLE_LAYOUT) {
          const d = Math.hypot(px - tbl.x, pz - tbl.z);
          assert.ok(
            d > 0.36,
            `Seat ${sIdx} exit segment ${wi} clipped table at (${tbl.x}, ${tbl.z}) with dist=${d.toFixed(3)}`
          );
        }
      }
    }
  }
});

test('full-room architectural interior themes build barista-visible walls, raised floors, counter wraps, and hanging fixtures', () => {
  const rig = buildInteriorDecorThemes3D(LOUNGE_TABLE_LAYOUT);
  const customThemes = ALL_INTERIOR_THEME_IDS.filter((id) => id !== 'garage_garden');

  for (const themeId of customThemes) {
    const grp = rig.themeGroups[themeId];
    assert.ok(grp.children.length >= 30, `${themeId} must construct rich full-room architectural meshes`);
    assert.equal(
      INTERIOR_THEME_LIGHTING[themeId].hideDefaultPendants,
      true,
      `${themeId} should replace default garage pendants with its own hanging lighting`
    );

    // Confirm floor overlay sits strictly ABOVE loungeDeck (y = 0.016) and walls/fixtures are placed in front of barista (z < 0)
    let hasRaisedFloor = false;
    let hasBaristaVisibleFixtures = false;
    grp.traverse((obj) => {
      if (obj.position.y >= 0.02 && obj.position.y <= 0.035 && obj.position.z < 0) {
        hasRaisedFloor = true;
      }
      if (obj.position.y >= 1.9 && obj.position.y <= 2.45 && obj.position.z <= -1.2) {
        hasBaristaVisibleFixtures = true;
      }
    });
    assert.ok(hasRaisedFloor, `${themeId} must have a raised floor overlay above loungeDeck (y >= 0.02)`);
    assert.ok(hasBaristaVisibleFixtures, `${themeId} must place hanging fixtures/walls inside the barista camera FOV`);
  }

  // Verify applyTheme toggles visibility exclusively to active theme
  const profile = rig.applyTheme('parisian_bistro', false, 1.2);
  assert.equal(rig.themeGroups.parisian_bistro.visible, true);
  assert.equal(rig.themeGroups.garage_garden.visible, false);
  assert.equal(rig.themeGroups.kyoto_timber.visible, false);
  assert.equal(profile.hideDefaultPendants, true);
  rig.dispose();

  // Catalog & save round-trip
  assert.equal(INTERIOR_THEMES_CATALOG.length, 6);
  let state = createInitialGameState();
  state = { ...state, cash: 500 };
  const unlocked = purchaseOrEquipInteriorTheme(state, 'botanical_greenhouse');
  assert.equal(unlocked.decor.interiorTheme, 'botanical_greenhouse');
  assert.equal(unlocked.cash, 320);

  const exported = exportSaveJson(unlocked);
  const restored = importSaveJson(exported);
  assert.ok(restored);
  assert.equal(restored!.decor.interiorTheme, 'botanical_greenhouse');

  const allUnlocked = unlockAllEverythingCheat(state);
  assert.equal(allUnlocked.unlockedInteriorThemes.length, 6);
});

test('Title Screen pedestrians curve curbside around the parked red Miata without penetrating its bodywork', () => {
  const miataObstacles = getTitleScreenMiataObstacles();
  assert.equal(miataObstacles.length, 3);
  const obstacles = [...getSceneryStaticObstacles('busy_street', true), ...miataObstacles];

  for (const dir of [1, -1] as const) {
    let x = dir === 1 ? -8.5 : 1.5;
    const baseLaneZ = -8.25;
    let z = baseLaneZ;
    let avoidSide: -1 | 0 | 1 = 0;
    let minZReached = z;
    const dt = 0.04;
    const speed = 1.45;

    for (let step = 0; step < 260; step++) {
      const steer = computeCrowdAndObstacleSteering({
        selfId: `title-walker-${dir}`,
        x,
        z,
        dir,
        baseLaneZ,
        minZ: -10.65,
        maxZ: -7.48,
        obstacles,
        neighbors: [],
        preferredAvoidSide: avoidSide,
      });
      avoidSide = steer.chosenAvoidSide;
      const targetZ = Math.max(-10.65, Math.min(-7.48, baseLaneZ + steer.avoidZOffset));
      z += (targetZ - z) * Math.min(1, dt * 7.2);
      x += dir * speed * steer.speedScale * dt;
      minZReached = Math.min(minZReached, z);

      for (const carCircle of miataObstacles) {
        const dist = Math.hypot(x - carCircle.x, z - carCircle.z);
        assert.ok(
          dist > carCircle.radius * 0.96,
          `dir=${dir} walker at (${x.toFixed(2)}, ${z.toFixed(2)}) penetrated ${carCircle.id} (dist=${dist.toFixed(2)}, r=${carCircle.radius})`
        );
      }
    }

    assert.ok(
      minZReached < -9.55,
      `dir=${dir} walker should route curbside around the Miata (minZReached=${minZReached.toFixed(2)})`
    );
  }
});

test('iOS Safari viewport resolver prioritizes visualViewport, maps rotated portrait touches, and adapts camera FOV', () => {
  // iPhone Portrait with Safari top & bottom toolbars visible (visualViewport smaller than innerHeight)
  const portrait = resolveIosSafariViewport({
    innerWidth: 390,
    innerHeight: 844,
    visualViewportWidth: 390,
    visualViewportHeight: 664,
    visualViewportOffsetTop: 0,
    visualViewportOffsetLeft: 0,
  });
  assert.equal(portrait.vw, 390);
  assert.equal(portrait.vh, 664);
  assert.equal(portrait.isPortraitRotated, true);
  assert.equal(portrait.effectiveWidth, 664);
  assert.equal(portrait.effectiveHeight, 390);

  // Portrait-rotated touch mapping: top-right of portrait screen (clientX=390, clientY=0)
  // rotates 90deg CW to top-left of landscape stage -> ndcX=-1, ndcY=+1
  const topRightNdc = mapPointerToViewportNdc({ clientX: 390, clientY: 0, viewport: portrait });
  assert.ok(Math.abs(topRightNdc.x - -1) < 0.001);
  assert.ok(Math.abs(topRightNdc.y - 1) < 0.001);

  // Bottom-right of portrait screen (clientX=390, clientY=664) -> top-right of landscape stage (ndcX=+1, ndcY=+1)
  const bottomRightNdc = mapPointerToViewportNdc({ clientX: 390, clientY: 664, viewport: portrait });
  assert.ok(Math.abs(bottomRightNdc.x - 1) < 0.001);
  assert.ok(Math.abs(bottomRightNdc.y - 1) < 0.001);

  // iPhone Landscape with Safari toolbar visible (844x336 -> wide aspect ~2.51)
  const landscape = resolveIosSafariViewport({
    innerWidth: 844,
    innerHeight: 390,
    visualViewportWidth: 844,
    visualViewportHeight: 336,
  });
  assert.equal(landscape.vw, 844);
  assert.equal(landscape.vh, 336);
  assert.equal(landscape.isPortraitRotated, false);
  assert.equal(landscape.effectiveWidth, 844);
  assert.equal(landscape.effectiveHeight, 336);

  // Adaptive FOV stays baseline at 16:9 and gently widens on ultrawide iPhone landscape and 4:3 iPad
  const desktopFov = computeAdaptiveCameraFov(46, 16 / 9);
  const ultrawideFov = computeAdaptiveCameraFov(46, 844 / 336);
  const ipadFov = computeAdaptiveCameraFov(46, 4 / 3);
  assert.equal(desktopFov, 46);
  assert.ok(ultrawideFov > 46 && ultrawideFov <= 52);
  assert.ok(ipadFov > 46 && ipadFov <= 54);
});

test('app versioning defines stable package ID, versionName/versionCode, and validates in-place APK upgrades', () => {
  assert.equal(APP_VERSION.applicationId, 'com.boostedbycaffeine.klasik3d');
  assert.match(APP_VERSION.versionName, /^\d+\.\d+\.\d+$/);
  assert.ok(Number.isInteger(APP_VERSION.versionCode) && APP_VERSION.versionCode >= 250);
  assert.equal(formatAppVersionBadge(), `v${APP_VERSION.versionName} · Build ${APP_VERSION.versionCode}`);
  assert.equal(formatApkFileName(), `Klasik3D-v${APP_VERSION.versionName}.apk`);

  // Higher versionCode with identical package ID allows seamless in-place APK upgrade
  assert.equal(
    canUpgradeApkInPlace(
      { applicationId: APP_VERSION.applicationId, versionCode: APP_VERSION.versionCode },
      { applicationId: APP_VERSION.applicationId, versionCode: APP_VERSION.versionCode + 1 }
    ),
    true
  );
  // Same/lower versionCode or mismatched package ID must be rejected
  assert.equal(
    canUpgradeApkInPlace(
      { applicationId: APP_VERSION.applicationId, versionCode: APP_VERSION.versionCode },
      { applicationId: APP_VERSION.applicationId, versionCode: APP_VERSION.versionCode }
    ),
    false
  );
  assert.equal(
    canUpgradeApkInPlace(
      { applicationId: APP_VERSION.applicationId, versionCode: APP_VERSION.versionCode },
      { applicationId: 'com.other.pkg', versionCode: APP_VERSION.versionCode + 10 }
    ),
    false
  );
});

test('interactive first-drink tutorial advances dynamically across espresso/milk/serve steps and pauses customer mood drain', () => {
  let state: KlasikGameState = { ...createInitialGameState(), phase: 'playing' };
  const baseline = state.totalCupsServed;
  const firstCustomer = state.customers.find((c) => c.state === 'ordering');
  assert.ok(firstCustomer, 'Initial shift should spawn a waiting guest');

  // Step 1: waiting customer prompts Accept Order
  const step1 = resolveFirstDrinkTutorialStep(state, baseline);
  assert.equal(step1.stepId, 'accept_order');
  assert.equal(step1.stepNumber, 1);

  // Accept order -> verify patience drain stays paused during tutorialActive ticks
  state = acceptCustomerOrder(state, firstCustomer!.id);
  const ticked = advanceSimulationTick(state, 0.25, { tutorialActive: true });
  const tickedCust = ticked.customers.find((c) => c.id === firstCustomer!.id);
  assert.equal(tickedCust?.mood, 100, 'Customer mood must remain paused at 100% during tutorial');

  // Force a latte order to verify full grind -> tamp -> espresso -> milk -> serve progression
  state = {
    ...state,
    customers: state.customers.map((c) =>
      c.id === firstCustomer!.id
        ? { ...c, recipeId: 'velvet-latte', requestedPastry: null, customAddOns: [] }
        : c
    ),
  };

  assert.equal(resolveFirstDrinkTutorialStep(state, baseline).stepId, 'grinder');
  state = performCupAction(state, 'grind');
  assert.equal(resolveFirstDrinkTutorialStep(state, baseline).stepId, 'tamper');
  state = performCupAction(state, 'tamp');
  assert.equal(resolveFirstDrinkTutorialStep(state, baseline).stepId, 'espresso');
  state = performCupAction(state, 'pull_espresso');
  assert.equal(resolveFirstDrinkTutorialStep(state, baseline).stepId, 'finish_drink');
  state = performCupAction(state, 'steam_milk');
  assert.equal(resolveFirstDrinkTutorialStep(state, baseline).stepId, 'serve');

  // If customer also wants a pastry, tutorial dynamically inserts pastry step before serve
  const withPastry = {
    ...state,
    customers: state.customers.map((c) =>
      c.id === firstCustomer!.id ? { ...c, requestedPastry: 'croissant' as const } : c
    ),
  };
  assert.equal(resolveFirstDrinkTutorialStep(withPastry, baseline).stepId, 'pastry');
  const pastryReady = preparePastry(withPastry, 'croissant');
  assert.equal(resolveFirstDrinkTutorialStep(pastryReady, baseline).stepId, 'serve');

  // Serving completes the tutorial
  const served = serveCurrentCupToCustomer(state, firstCustomer!.id);
  const finalStep = resolveFirstDrinkTutorialStep(served, baseline);
  assert.equal(finalStep.stepId, 'completed');
  assert.equal(finalStep.isCompleted, true);
});

test('all real-life landmark sceneries frame subtitles and descriptions as Inspired by real places', () => {
  const realWorldIds = [
    'mayon_volcano',
    'hilltop_city_lights',
    'japanese_tranquility',
    'brazilian_favela',
    'eiffel_tower',
    'switzerland_hilltop',
    'mt_everest',
  ] as const;

  for (const id of realWorldIds) {
    const spec = SCENERY_CATALOG.find((s) => s.id === id);
    assert.ok(spec, `Missing scenery spec for ${id}`);
    assert.match(spec!.subtitle, /^Inspired by /i, `${id} subtitle should start with "Inspired by"`);
    assert.match(spec!.description, /inspired by/i, `${id} description should clearly say "Inspired by"`);
  }
});


