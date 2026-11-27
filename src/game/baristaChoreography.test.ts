import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  ACTIVE_CUP_STATION4_POS,
  ICE_COMPARTMENT_POS,
  MILK_PITCHER_REST_POS,
  POST_PULL_HANDOFF_DURATION_SEC,
  TEA_POT_REST_POS,
  checkIceCompartmentClearance,
  checkTeaPotClickClearance,
  evaluateMilkPourPose,
  evaluateTeaSteepPose,
  resolveBaristaCameraTarget,
} from './baristaChoreography';
import {
  FAVELA_DANCER_PHASE_DURATIONS,
  FAVELA_DANCE_LOOP_START_SEC,
  FAVELA_DANCE_PHRASE_DURATION_SEC,
  FAVELA_DANCE_VIDEO_BPM,
  MIXAMO_BONES,
  advanceFavelaDancerLifecycle,
  createBrazilianLRLRLRLRClip,
  createInitialFavelaDancerLifecycle,
  remapMixamoTracks,
  resolveVideoBeatSyncTime,
} from './brazilianLRLRLRLRDance';
import { resolveSecretNpcAppearance } from './rules';

test('evaluateMilkPourPose is C1-continuous across all 4 phases with zero teleports or snaps', () => {
  const samples = 200;
  let prev = evaluateMilkPourPose(0, 1.0);
  // Starts cleanly on counter rest pad
  assert.ok(Math.hypot(prev.position.x - MILK_PITCHER_REST_POS.x, prev.position.y - MILK_PITCHER_REST_POS.y) < 1e-4);
  assert.equal(prev.rotationZ, 0);

  let maxStepDist = 0;
  let maxRotJump = 0;
  let sawPourStream = false;

  for (let i = 1; i <= samples; i++) {
    const p = i / samples;
    const curr = evaluateMilkPourPose(p, 1.0 + p * 1.55);
    const stepDist = Math.hypot(
      curr.position.x - prev.position.x,
      curr.position.y - prev.position.y,
      curr.position.z - prev.position.z
    );
    const rotJump = Math.abs(curr.rotationZ - prev.rotationZ);
    maxStepDist = Math.max(maxStepDist, stepDist);
    maxRotJump = Math.max(maxRotJump, rotJump);
    if (curr.streamActive) sawPourStream = true;
    prev = curr;
  }

  // No single 0.5% step may jump more than 4cm or 0.14 rad (old code teleported > 35cm and snapped > 0.95 rad!)
  assert.ok(maxStepDist < 0.04, `Expected smooth milk pitcher step (<0.04m), got ${maxStepDist.toFixed(4)}m`);
  assert.ok(maxRotJump < 0.14, `Expected smooth milk pitcher tilt (<0.14 rad), got ${maxRotJump.toFixed(4)} rad`);
  assert.equal(sawPourStream, true);

  // Ends cleanly back on counter rest pad at p = 1
  const end = evaluateMilkPourPose(1, 2.55);
  assert.ok(Math.hypot(end.position.x - MILK_PITCHER_REST_POS.x, end.position.y - MILK_PITCHER_REST_POS.y) < 1e-4);
  assert.ok(Math.abs(end.rotationZ) < 1e-4);
  assert.equal(end.streamActive, false);
});

test('evaluateTeaSteepPose lifts smoothly from front-right coaster, tilts left to pour, and lands cleanly', () => {
  const start = evaluateTeaSteepPose(0);
  assert.ok(
    Math.hypot(start.position.x - TEA_POT_REST_POS.x, start.position.z - TEA_POT_REST_POS.z) < 1e-4
  );
  assert.equal(start.rotationZ, 0);
  assert.equal(start.streamActive, false);

  const mid = evaluateTeaSteepPose(0.5);
  assert.equal(mid.streamActive, true);
  assert.ok(mid.rotationZ > 0.5, 'Teapot should tilt left (+Z) toward cup on its left');
  assert.ok(mid.position.x < TEA_POT_REST_POS.x, 'Teapot should arc leftward toward the cup');

  let prev = start;
  let maxStep = 0;
  for (let i = 1; i <= 120; i++) {
    const curr = evaluateTeaSteepPose(i / 120);
    maxStep = Math.max(
      maxStep,
      Math.hypot(curr.position.x - prev.position.x, curr.position.y - prev.position.y, curr.position.z - prev.position.z)
    );
    prev = curr;
  }
  assert.ok(maxStep < 0.03, `Expected smooth teapot motion (<0.03m), got ${maxStep.toFixed(4)}m`);

  const end = evaluateTeaSteepPose(1);
  assert.ok(
    Math.hypot(end.position.x - TEA_POT_REST_POS.x, end.position.y - TEA_POT_REST_POS.y, end.position.z - TEA_POT_REST_POS.z) < 1e-4
  );
  assert.equal(end.streamActive, false);
});

test('resolveBaristaCameraTarget moves monotonically from Espresso Pull to Station 4 with zero snap-back jerk', () => {
  const st3Preset = {
    pos: { x: -0.08, y: 1.56, z: 1.72 },
    look: { x: -0.22, y: 1.15, z: 0.25 },
  };
  const st4Preset = {
    pos: { x: 1.44, y: 1.58, z: 1.84 },
    look: { x: 1.38, y: 1.12, z: 0.28 },
  };

  let lastX = -Infinity;
  // Phase A: pull_espresso handoff window 0.84 .. 1.00
  for (let p = 0.84; p <= 1.0; p += 0.02) {
    const cam = resolveBaristaCameraTarget({
      activeStation: 3,
      stationPreset: st3Preset,
      station4Preset: st4Preset,
      stepAnimType: 'pull_espresso',
      stepAnimProgress: p,
      cupPos: ACTIVE_CUP_STATION4_POS,
      pullTransitionHoldTimer: POST_PULL_HANDOFF_DURATION_SEC,
    });
    assert.ok(cam.pos.x >= lastX - 1e-6, `Camera X regressed during pull handoff: ${cam.pos.x} < ${lastX}`);
    lastX = cam.pos.x;
  }

  // Phase B: Critical 1-3 frame gap where stepAnim === null while activeStation is briefly still 3
  const bridgeCam = resolveBaristaCameraTarget({
    activeStation: 3,
    stationPreset: st3Preset,
    station4Preset: st4Preset,
    stepAnimType: null,
    stepAnimProgress: 0,
    cupPos: ACTIVE_CUP_STATION4_POS,
    pullTransitionHoldTimer: 0.35,
  });
  assert.equal(bridgeCam.pos.x, st4Preset.pos.x);
  assert.ok(bridgeCam.pos.x >= lastX - 1e-6, 'Camera must NOT snap back toward Station 3 after pull completes');

  // Phase C: React commits activeStation === 4
  const st4Cam = resolveBaristaCameraTarget({
    activeStation: 4,
    stationPreset: st4Preset,
    station4Preset: st4Preset,
    stepAnimType: null,
    stepAnimProgress: 0,
    cupPos: ACTIVE_CUP_STATION4_POS,
    pullTransitionHoldTimer: 0,
  });
  assert.equal(st4Cam.pos.x, st4Preset.pos.x);
});

test('Front-right teapot coaster clears active cup hitbox and Realism Mode camera ray', () => {
  const st4CameraPos = { x: 1.44, y: 1.58, z: 1.84 };
  const clearance = checkTeaPotClickClearance(st4CameraPos);
  assert.equal(clearance.hitboxesOverlap, false);
  assert.equal(clearance.isUnobstructed, true);
  assert.ok(clearance.centerSeparationXZ >= 0.24, `Expected >=0.24m center separation, got ${clearance.centerSeparationXZ}`);
  assert.ok(clearance.rayDistanceToCupAxisXZ > 0.18, `Expected clear ray margin >0.18m, got ${clearance.rayDistanceToCupAxisXZ}`);
});

test('Brazilian L-R-L-RLR Mixamo clip satisfies 20-bone spec, exact loop closure, grounding & quaternion continuity', () => {
  const clip = createBrazilianLRLRLRLRClip({
    patternId: 'lrl_rlr_lrlr_85',
    bpm: 70,
    fastBurstSnap: 0.7,
    bounceSwag: 0.8,
    armFlare: 0.2,
    targetFps: 60,
  });

  // 20 bone quaternion tracks + 1 Hips.position track = 21 tracks
  assert.equal(MIXAMO_BONES.length, 20);
  assert.equal(clip.tracks.length, 21);

  // 8.5 beats at 70 BPM = 7.285714... seconds
  const expectedDuration = 8.5 * (60 / 70);
  assert.ok(Math.abs(clip.duration - expectedDuration) < 1e-4);

  // Check exact loop closure (frame[0] === frame[last]) & quaternion sign continuity
  const hipsPosTrack = clip.tracks.find((t) => t.name === 'Hips.position');
  assert.ok(hipsPosTrack);
  const posVals = hipsPosTrack.values;
  const lastPosIdx = posVals.length - 3;
  assert.ok(Math.abs(posVals[0] - posVals[lastPosIdx]) < 1e-4);
  assert.ok(Math.abs(posVals[1] - posVals[lastPosIdx + 1]) < 1e-4);
  assert.ok(Math.abs(posVals[2] - posVals[lastPosIdx + 2]) < 1e-4);

  // Analytical grounding: Hips Y stays within plausible standing-to-knee-bend range (0.72..1.02m)
  for (let i = 1; i < posVals.length; i += 3) {
    assert.ok(posVals[i] > 0.72 && posVals[i] < 1.02, `Hip Y out of grounded range: ${posVals[i]}`);
  }

  for (const track of clip.tracks) {
    if (!track.name.endsWith('.quaternion')) continue;
    const v = track.values;
    const nFrames = v.length / 4;
    for (let f = 1; f < nFrames; f++) {
      const i0 = (f - 1) * 4;
      const i1 = f * 4;
      const dot = v[i0] * v[i1] + v[i0 + 1] * v[i1 + 1] + v[i0 + 2] * v[i1 + 2] + v[i0 + 3] * v[i1 + 3];
      assert.ok(dot >= -1e-5, `Quaternion sign flip detected in ${track.name} at frame ${f}: dot=${dot}`);
    }
    // Loop closure dot product ~ 1.0
    const last = (nFrames - 1) * 4;
    const loopDot = Math.abs(v[0] * v[last] + v[1] * v[last + 1] + v[2] * v[last + 2] + v[3] * v[last + 3]);
    assert.ok(loopDot > 0.999, `Loop closure mismatch on ${track.name}: |dot|=${loopDot}`);
  }

  // Test remapMixamoTracks with mixamorig: prefix
  const fakeMixamoModel = new THREE.Group();
  for (const boneName of MIXAMO_BONES) {
    const node = new THREE.Object3D();
    node.name = `mixamorig:${boneName}`;
    fakeMixamoModel.add(node);
  }
  const remapped = remapMixamoTracks(clip, fakeMixamoModel);
  assert.equal(remapped.tracks.length, 21);
  assert.ok(remapped.tracks.every((t) => t.name.startsWith('mixamorig:')));
});

test('Secret NPC (Anton / Beb / Duminiki) always keeps hood down across every climate & weather', () => {
  for (const climate of ['summer', 'winter'] as const) {
    for (const isRain of [false, true]) {
      for (const roll of [0.05, 0.35, 0.65, 0.95]) {
        const app = resolveSecretNpcAppearance(climate, isRain, () => roll);
        assert.equal(app.hoodUp, false, `Expected hoodUp=false for ${climate}, rain=${isRain}, roll=${roll}`);
      }
    }
  }
});

test('Recessed ice compartment sits cleanly below rinsing sink row with zero camera ray obstruction', () => {
  const st4CameraPos = { x: 1.44, y: 1.58, z: 1.84 };
  const clearance = checkIceCompartmentClearance(st4CameraPos, ICE_COMPARTMENT_POS);
  assert.equal(clearance.isBelowRinsingSinkRow, true);
  assert.equal(clearance.isUnobstructed, true);
  assert.ok(
    clearance.minSeparationFromRow1 > 0.1,
    `Expected >0.10m separation from Row 1 assets, got ${clearance.minSeparationFromRow1.toFixed(3)}m`
  );
  assert.ok(
    clearance.minRayClearanceToRow1 > 0.1,
    `Expected >0.10m ray clearance to Row 1 assets, got ${clearance.minRayClearanceToRow1.toFixed(3)}m`
  );
});

test('Favela Boombox Special NPC cycles walk_in -> place -> dancing -> pickup -> walk_out -> cooldown with exact 88 BPM guide beat lock', () => {
  // 1. Verify exact 88 BPM 8-beat mirrored guide clip duration (~5.4545s)
  const clip = createBrazilianLRLRLRLRClip();
  const expected88Loop = (8 * 60) / 88;
  assert.ok(
    Math.abs(clip.duration - expected88Loop) < 1e-3,
    `Expected 88 BPM 8-beat loop duration ${expected88Loop}s, got ${clip.duration}`
  );

  // 2. Verify microscopic audio-clock beat sync locks cleanly to loop start & playback-rate-adjusted time
  assert.ok(Math.abs(resolveVideoBeatSyncTime(FAVELA_DANCE_LOOP_START_SEC, 0) - 0) < 1e-4);
  const rate = 88 / (FAVELA_DANCE_VIDEO_BPM / 2);
  assert.ok(
    Math.abs(
      resolveVideoBeatSyncTime(FAVELA_DANCE_LOOP_START_SEC + (expected88Loop + 0.5) * rate, 0) - 0.5
    ) < 1e-3
  );

  // 3. Verify complete special NPC lifecycle transitions so dancer never loops forever
  let lc = createInitialFavelaDancerLifecycle();
  assert.equal(lc.phase, 'walk_in');

  const seenPhases = new Set<string>([lc.phase]);
  const totalCycleSec =
    FAVELA_DANCER_PHASE_DURATIONS.walk_in +
    FAVELA_DANCER_PHASE_DURATIONS.place_boombox +
    FAVELA_DANCER_PHASE_DURATIONS.dancing +
    FAVELA_DANCER_PHASE_DURATIONS.pickup_boombox +
    FAVELA_DANCER_PHASE_DURATIONS.walk_out +
    FAVELA_DANCER_PHASE_DURATIONS.cooldown +
    1.0;

  for (let t = 0; t < totalCycleSec; t += 0.25) {
    lc = advanceFavelaDancerLifecycle(lc, 0.25);
    seenPhases.add(lc.phase);
  }

  for (const requiredPhase of [
    'walk_in',
    'place_boombox',
    'dancing',
    'pickup_boombox',
    'walk_out',
    'cooldown',
  ]) {
    assert.ok(seenPhases.has(requiredPhase), `Missing Favela dancer phase: ${requiredPhase}`);
  }
  assert.equal(lc.phase, 'walk_in', 'Lifecycle should wrap cleanly back to walk_in after cooldown');
});

