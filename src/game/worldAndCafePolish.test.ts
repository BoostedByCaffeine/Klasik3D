import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChairSafeExitWaypoints,
  computeArticulatedWalkGait,
  computeCatenaryLeashPoints,
  computeCrowdAndObstacleSteering,
  getSceneryStaticObstacles,
  rollDineInStaySeconds,
  selectSpreadLoungeSeat,
  stepSpringScalar,
} from './npcPhysicsAndSteering';
import {
  evaluateFavelaAlleyLifecycle,
  getFavelaHillHeight,
  getFavelaUpperCurveDir,
  sampleFavelaStairSurfaceY,
} from './outdoorLod';
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
  LOUNGE_SEAT_COORDS,
  LOUNGE_TABLE_LAYOUT,
  createInitialGameState,
  exportSaveJson,
  importSaveJson,
  purchaseOrEquipInteriorTheme,
  unlockAllEverythingCheat,
} from './rules';

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

test('Favela discrete stair sampler clears every tread box top and lifecycle starts/ends off-screen or concealed', () => {
  const alleyX = -5.2;
  const upperDir = getFavelaUpperCurveDir(alleyX);
  assert.ok(upperDir === 1 || upperDir === -1);

  // Verify sampleFavelaStairSurfaceY sits at or above every single discrete stair tread top (zero buried feet!)
  for (let step = 0; step < 16; step++) {
    const stepT = step / 16;
    const tz = -17.6 + (-32.6 - -17.6) * stepT;
    const tx = alleyX + Math.sin(step * 0.38) * 1.15;
    const treadTopY = getFavelaHillHeight(tx, tz) + 0.48;
    const sampledCenter = sampleFavelaStairSurfaceY(alleyX, tz);
    const sampledFrontLip = sampleFavelaStairSurfaceY(alleyX, tz + 0.44);
    assert.ok(
      sampledCenter >= treadTopY - 0.001,
      `Step ${step} center Y=${sampledCenter.toFixed(3)} sank below treadTopY=${treadTopY.toFixed(3)}`
    );
    assert.ok(
      sampledFrontLip >= treadTopY - 0.001,
      `Step ${step} front-lip Y=${sampledFrontLip.toFixed(3)} sank below treadTopY=${treadTopY.toFixed(3)}`
    );
  }

  // Lifecycle starts far off-screen (±31.5m), climbs stairs, and conceals behind upper house
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
  assert.ok(midStairPose.slopePitch > 0.15, 'Uphill climber must have positive slope pitch');
  assert.ok(midStairPose.y > startPose.y + 1.0, 'Climber elevates up the favela hillside');
  assert.equal(curvePose.phaseKind, 'upper_curve');
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
