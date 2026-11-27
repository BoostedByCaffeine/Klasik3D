import * as THREE from 'three';
import { soundEngine } from './sound';

/**
 * Ipsilateral (Same-Side) Brazilian TikTok Dance — L R L RLR L R L R Special Favela NPC
 *
 * Calibrated directly against `public/assets/aistudio/brazillian_danceq_c4c19f70.MP4`:
 *   - Measured beat phrase period: 2.825s (8 beats @ 169.9115 BPM, drop @ 3.175s -> 14.475s)
 *   - Exact video pose: hands tucked tightly close to upper chest/sternum with bent elbows,
 *     knees driven sharply higher up on every ipsilateral L R L RLR L R L R step
 *   - Special NPC Lifecycle:
 *     walk_in (carrying boombox) -> place_boombox -> dancing (audio-clock locked) ->
 *     pickup_boombox -> walk_out -> cooldown (returns periodically so he doesn't dance forever)
 */

/**
 * Resolves the Favela boombox MP4 path relative to Vite's BASE_URL so audio works seamlessly
 * on both localhost root hosting and GitHub Pages repository subpaths (e.g. `/klasik-cafe/`).
 */
export function resolveFavelaDanceAudioUrl(baseUrl?: string): string {
  const rawBase =
    baseUrl !== undefined
      ? baseUrl
      : (typeof import.meta !== 'undefined' &&
          (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
        './';
  const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  return `${normalizedBase}assets/aistudio/brazillian_danceq_c4c19f70.MP4`;
}

export const FAVELA_DANCE_AUDIO_URL = resolveFavelaDanceAudioUrl();
export const FAVELA_DANCE_LOOP_START_SEC = 3.175;
export const FAVELA_DANCE_PHRASE_DURATION_SEC = 2.825;
export const FAVELA_DANCE_PHRASE_COUNT = 4;
export const FAVELA_DANCE_LOOP_END_SEC =
  FAVELA_DANCE_LOOP_START_SEC + FAVELA_DANCE_PHRASE_DURATION_SEC * FAVELA_DANCE_PHRASE_COUNT; // 14.475s
export const FAVELA_DANCE_VIDEO_BPM = (8 * 60) / FAVELA_DANCE_PHRASE_DURATION_SEC; // 169.9115 BPM (84.95575 half-time)

/** Exact 88 BPM guide choreography constants (8-beat mirrored seamless loop = 5.4545s) */
export const FAVELA_DANCE_GUIDE_BPM = 88;
export const FAVELA_DANCE_BEAT_SEC = 60 / FAVELA_DANCE_GUIDE_BPM; // ~0.6818s
export const FAVELA_DANCE_LOOP_DURATION_SEC = (8 * 60) / FAVELA_DANCE_GUIDE_BPM; // ~5.4545s
/** Speeds the 84.956 BPM half-time MP4 track cleanly up to exact 88 BPM */
export const FAVELA_DANCE_AUDIO_PLAYBACK_RATE =
  FAVELA_DANCE_GUIDE_BPM / (FAVELA_DANCE_VIDEO_BPM / 2);

export interface BrazilianGuideStepDef {
  /** +1 = Pose R (weight on right leg), -1 = Pose L (weight on left leg) */
  dir: 1 | -1;
  beats: number;
  fast: boolean;
}

/** Exact 10-step 8-beat mirrored sequence from Brazilian Dance Animation Guide */
export const BRAZILIAN_GUIDE_DANCE_STEPS: readonly BrazilianGuideStepDef[] = [
  // Phrase 1 (4 beats)
  { dir: 1, beats: 1.0, fast: false },
  { dir: -1, beats: 1.0, fast: false },
  { dir: 1, beats: 1.0, fast: false },
  { dir: -1, beats: 0.5, fast: true }, // Quick burst 1: L (70%)
  { dir: 1, beats: 0.5, fast: true }, // Quick burst 2: R (70%)
  // Phrase 2 (exact mirror, 4 beats)
  { dir: -1, beats: 1.0, fast: false }, // Landing: L (100%)
  { dir: 1, beats: 1.0, fast: false },
  { dir: -1, beats: 1.0, fast: false },
  { dir: 1, beats: 0.5, fast: true }, // Quick burst 1: R (70%)
  { dir: -1, beats: 0.5, fast: true }, // Quick burst 2: L (70%)
] as const;

export interface BrazilianGuideDanceFrame {
  stepIndex: number;
  u: number;
  dir: 1 | -1;
  fast: boolean;
  /** Cubic ease-out snap progress in [0, 1] */
  eased: number;
  /** Lateral pose blend in [-1, +1] (+1 = Pose R, -1 = Pose L; +/-0.70 on fast bursts) */
  poseBlend: number;
  /** Downward impact hip bounce in [-1, 0] (0.5x depth on fast bursts) */
  hipBounce: number;
}

/**
 * Evaluates the exact 88 BPM snap-to-hold choreography frame from the Brazilian Dance Animation Guide.
 */
export function evaluateBrazilianGuideDanceFrame(
  tSec: number,
  bpm: number = FAVELA_DANCE_GUIDE_BPM
): BrazilianGuideDanceFrame {
  const beatSec = 60 / Math.max(1, bpm);
  const totalBeats = 8;
  const loopDur = totalBeats * beatSec;
  const wrappedT = ((tSec % loopDur) + loopDur) % loopDur;
  const beatPos = wrappedT / beatSec;

  const steps = BRAZILIAN_GUIDE_DANCE_STEPS;
  const n = steps.length;
  let cursor = 0;
  let stepIndex = 0;
  let stepStartBeat = 0;
  for (let i = 0; i < n; i++) {
    const nextCursor = cursor + steps[i].beats;
    if (beatPos >= cursor && (beatPos < nextCursor || i === n - 1)) {
      stepIndex = i;
      stepStartBeat = cursor;
      break;
    }
    cursor = nextCursor;
  }

  const step = steps[stepIndex];
  const prevStep = steps[(stepIndex - 1 + n) % n];
  const u = Math.max(0, Math.min(0.999999, (beatPos - stepStartBeat) / step.beats));

  const snapRatio = step.fast ? 0.42 : 0.27;
  const snapT = Math.min(1, u / snapRatio);
  const eased = 1 - Math.pow(1 - snapT, 3);

  const prevAmp = prevStep.fast ? 0.7 : 1.0;
  const currAmp = step.fast ? 0.7 : 1.0;
  const poseBlend = prevStep.dir * prevAmp * (1 - eased) + step.dir * currAmp * eased;

  const bounceAmp = step.fast ? 0.5 : 1.0;
  const hipBounce = -Math.sin(Math.min(1, u / 0.55) * Math.PI) * bounceAmp;

  return {
    stepIndex,
    u,
    dir: step.dir,
    fast: step.fast,
    eased,
    poseBlend,
    hipBounce,
  };
}

export const MIXAMO_BONES = [
  'Hips',
  'Spine',
  'Spine1',
  'Spine2',
  'Neck',
  'Head',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
] as const;

export type MixamoBoneName = (typeof MIXAMO_BONES)[number];

export interface BrazilianDanceStepDef {
  side: 'L' | 'R';
  dur: number;
  fast: boolean;
}

export type BrazilianDancePatternId =
  | 'lrl_rlr_lrlr_85'
  | 'lrl_rlr_lrlr_triplet'
  | 'lrl_rlr_lrlr_funk8'
  | 'lrl_rlr_lrlr_x2';

export const PATTERN_DEFS: Record<BrazilianDancePatternId, readonly BrazilianDanceStepDef[]> = {
  lrl_rlr_lrlr_85: [
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 0.5, fast: true },
    { side: 'L', dur: 0.5, fast: true },
    { side: 'R', dur: 0.5, fast: true },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
  ],
  lrl_rlr_lrlr_triplet: [
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1 / 3, fast: true },
    { side: 'L', dur: 1 / 3, fast: true },
    { side: 'R', dur: 1 / 3, fast: true },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
  ],
  lrl_rlr_lrlr_funk8: [
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 0.25, fast: true },
    { side: 'L', dur: 0.25, fast: true },
    { side: 'R', dur: 0.5, fast: true },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
  ],
  lrl_rlr_lrlr_x2: [
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1 / 3, fast: true },
    { side: 'L', dur: 1 / 3, fast: true },
    { side: 'R', dur: 1 / 3, fast: true },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1 / 3, fast: true },
    { side: 'L', dur: 1 / 3, fast: true },
    { side: 'R', dur: 1 / 3, fast: true },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
    { side: 'L', dur: 1.0, fast: false },
    { side: 'R', dur: 1.0, fast: false },
  ],
};

export type FavelaDancerPhase =
  | 'walk_in'
  | 'place_boombox'
  | 'dancing'
  | 'pickup_boombox'
  | 'walk_out'
  | 'cooldown';

export const FAVELA_DANCER_WALK_START_X = -32.0;
export const FAVELA_DANCER_WALK_END_X = 32.0;

export const FAVELA_DANCER_PHASE_DURATIONS: Record<FavelaDancerPhase, number> = {
  walk_in: 12.0,
  place_boombox: 1.15,
  dancing: FAVELA_DANCE_LOOP_DURATION_SEC * 2, // ~10.91s (2 full 8-beat mirrored 88 BPM loops)
  pickup_boombox: 1.15,
  walk_out: 12.2,
  cooldown: 22.0,
};

export interface FavelaDancerLifecycleState {
  phase: FavelaDancerPhase;
  phaseTime: number;
  visitCount: number;
}

export function createInitialFavelaDancerLifecycle(): FavelaDancerLifecycleState {
  return {
    phase: 'walk_in',
    phaseTime: 0,
    visitCount: 1,
  };
}

const PHASE_ORDER: readonly FavelaDancerPhase[] = [
  'walk_in',
  'place_boombox',
  'dancing',
  'pickup_boombox',
  'walk_out',
  'cooldown',
];

/**
 * Pure deterministic state machine for the visiting Favela Boombox Dancer NPC:
 * walk_in (carry) -> place_boombox -> dancing (4 beat-locked phrases) -> pickup_boombox -> walk_out -> cooldown -> repeat.
 */
export function advanceFavelaDancerLifecycle(
  state: FavelaDancerLifecycleState,
  dt: number
): FavelaDancerLifecycleState {
  if (dt <= 0) return state;
  let phase = state.phase;
  let phaseTime = state.phaseTime + dt;
  let visitCount = state.visitCount;

  // Step across phase boundaries cleanly (bounded loop for safety on large dt spikes)
  for (let guard = 0; guard < 12; guard++) {
    const dur = FAVELA_DANCER_PHASE_DURATIONS[phase];
    if (phaseTime < dur) break;
    phaseTime -= dur;
    const nextIdx = (PHASE_ORDER.indexOf(phase) + 1) % PHASE_ORDER.length;
    phase = PHASE_ORDER[nextIdx];
    if (phase === 'walk_in') {
      visitCount += 1;
    }
  }

  return { phase, phaseTime, visitCount };
}

/**
 * Computes exact animation clip playback time locked to the reference video's beat audio clock.
 * Falls back cleanly to deterministic `phaseTime` when audio isn't playing or is muted.
 */
export function resolveVideoBeatSyncTime(
  audioCurrentTime: number | null,
  phaseTime: number,
  loopDurationSec: number = FAVELA_DANCE_LOOP_DURATION_SEC
): number {
  const raw =
    audioCurrentTime !== null &&
    Number.isFinite(audioCurrentTime) &&
    audioCurrentTime >= FAVELA_DANCE_LOOP_START_SEC - 0.05
      ? Math.max(0, audioCurrentTime - FAVELA_DANCE_LOOP_START_SEC) /
        FAVELA_DANCE_AUDIO_PLAYBACK_RATE
      : Math.max(0, phaseTime);
  return ((raw % loopDurationSec) + loopDurationSec) % loopDurationSec;
}

export interface BrazilianDanceClipOptions {
  patternId?: BrazilianDancePatternId;
  bpm?: number;
  fastBurstSnap?: number;
  bounceSwag?: number;
  armFlare?: number;
  targetFps?: number;
  hipHeight?: number;
  thighLength?: number;
  shinLength?: number;
  footHeight?: number;
}



/**
 * Beat-snapped attack-release funk groove curve: peaks sharply right on the musical beat strike
 * (u ≈ 0.22) instead of lagging behind at u = 0.5, eliminating offbeat visual drift.
 */
export function computeBeatSnappedPulse(
  stepU: number,
  isFast: boolean,
  fastBurstSnap = 0.85
): number {
  const u = Math.max(0, Math.min(1, stepU));
  const attackPeak = isFast ? 0.18 : 0.22;
  if (u <= attackPeak) {
    const t = u / attackPeak;
    const easeOut = 1 - Math.pow(1 - t, 2.4);
    return easeOut;
  }
  const decayT = (u - attackPeak) / Math.max(1e-5, 1 - attackPeak);
  const expPow = isFast ? Math.max(0.85, 1.45 - fastBurstSnap * 0.45) : 1.35;
  return Math.pow(Math.cos(decayT * (Math.PI / 2)), expPow);
}

/**
 * Generates the production 20-bone Mixamo AnimationClip matching the 88 BPM Brazilian Dance Animation Guide:
 *  - Exact 8-beat mirrored 10-step loop (5.4545s @ 88 BPM: R-L-R-l-r | L-R-L-r-l)
 *  - Fast cubic ease-out snap-to-hold (0.27 slow / 0.42 fast) with 70% fast-burst amplitude
 *  - Downward beat-impact hip bounce + analytical stance-leg grounding (zero float/sink)
 *  - Signature arms: 90° elbows, lead arm crosses chest to opposite collarbone, other arm flares outward
 *  - 15°–20° upper-torso twist with counter-rotated head & beat nod
 */
export function createBrazilianLRLRLRLRClip(
  options: BrazilianDanceClipOptions = {}
): THREE.AnimationClip {
  const patternId = options.patternId ?? 'lrl_rlr_lrlr_funk8';
  const bpm = options.bpm ?? FAVELA_DANCE_GUIDE_BPM;
  const bounceSwag = options.bounceSwag ?? 1.0;
  const targetFps = options.targetFps ?? 60;
  const thighLen = options.thighLength ?? 0.41;
  const shinLen = options.shinLength ?? 0.39;
  const footHeight = options.footHeight ?? 0.08;
  const standingHipY = options.hipHeight ?? thighLen + shinLen + footHeight;

  const pattern = options.patternId ? PATTERN_DEFS[options.patternId] : undefined;
  const totalBeats = pattern ? pattern.reduce((sum, s) => sum + s.dur, 0) : 8;
  const durationSec = (totalBeats * 60) / bpm;
  const totalFrames = Math.max(64, Math.round(durationSec * targetFps));

  const times = new Float32Array(totalFrames + 1);
  const hipsPosValues = new Float32Array((totalFrames + 1) * 3);
  const quatArrays: Record<MixamoBoneName, Float32Array> = {} as Record<
    MixamoBoneName,
    Float32Array
  >;
  const prevQuats: Record<MixamoBoneName, THREE.Quaternion | null> = {} as Record<
    MixamoBoneName,
    THREE.Quaternion | null
  >;
  for (const bone of MIXAMO_BONES) {
    quatArrays[bone] = new Float32Array((totalFrames + 1) * 4);
    prevQuats[bone] = null;
  }

  const euler = new THREE.Euler(0, 0, 0, 'XYZ');
  const qTmp = new THREE.Quaternion();

  const writeBoneQuat = (bone: MixamoBoneName, frameIdx: number, rx: number, ry: number, rz: number) => {
    euler.set(rx, ry, rz, 'XYZ');
    qTmp.setFromEuler(euler);
    const prev = prevQuats[bone];
    if (prev && prev.dot(qTmp) < 0) {
      qTmp.set(-qTmp.x, -qTmp.y, -qTmp.z, -qTmp.w);
    }
    const base = frameIdx * 4;
    const arr = quatArrays[bone];
    arr[base] = qTmp.x;
    arr[base + 1] = qTmp.y;
    arr[base + 2] = qTmp.z;
    arr[base + 3] = qTmp.w;
    if (!prev) {
      prevQuats[bone] = qTmp.clone();
    } else {
      prev.copy(qTmp);
    }
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const guideLoopSec = (8 * 60) / bpm;
  for (let f = 0; f <= totalFrames; f++) {
    // Wrap exact final frame to phase 0 so Step 10 -> Step 1 loop closure is 100% seamless
    const evalSec = f === totalFrames ? 0 : (f / totalFrames) * guideLoopSec;
    times[f] = (f / totalFrames) * durationSec;

    const frame = evaluateBrazilianGuideDanceFrame(evalSec, bpm);
    const pb = frame.poseBlend; // +1 = Pose R, -1 = Pose L (+/-0.70 on fast bursts)
    const pR = Math.max(0, pb); // Right-stance weight
    const pL = Math.max(0, -pb); // Left-stance weight
    const absPb = Math.abs(pb);
    const dip = Math.max(0, -frame.hipBounce) * bounceSwag; // 0..1 downward impact dip

    // 1. LEGS & FEET:
    // Planted stance leg has soft ~15° knee bend (0.26 rad) + impact dip;
    // Free leg pops knee inward and forward, lifting heel/foot ~12–15cm off the ground.
    const stanceKnee = 0.26 + 0.22 * dip;
    const stanceHip = -stanceKnee * 0.52;
    const stanceFoot = -(stanceHip + stanceKnee);

    // Smooth blend per leg: Pose R plants Right leg & lifts Left knee; Pose L mirrors!
    const leftLift = pR;
    const rightLift = pL;

    const leftUpLegX = lerp(stanceHip, -0.58, leftLift);
    const leftUpLegZ = lerp(-0.02, 0.16, leftLift); // +Z pops Left knee (-X) slightly inward
    const leftLegX = lerp(stanceKnee, 0.78, leftLift);
    const leftFootX = lerp(stanceFoot, 0.26, leftLift);

    const rightUpLegX = lerp(stanceHip, -0.58, rightLift);
    const rightUpLegZ = lerp(0.02, -0.16, rightLift); // -Z pops Right knee (+X) slightly inward
    const rightLegX = lerp(stanceKnee, 0.78, rightLift);
    const rightFootX = lerp(stanceFoot, 0.26, rightLift);

    // Analytical trigonometric grounding over the dominant planted leg
    const stanceUpX = pb >= 0 ? rightUpLegX : leftUpLegX;
    const stanceKneeX = pb >= 0 ? rightLegX : leftLegX;
    const groundedHipY =
      footHeight +
      thighLen * Math.cos(stanceUpX) +
      shinLen * Math.cos(stanceUpX + stanceKneeX);
    const clampedHipY = Math.max(
      standingHipY * 0.74,
      Math.min(standingHipY, groundedHipY - 0.018 * dip)
    );

    // Lateral pelvis shift toward planted foot (+X on Pose R, -X on Pose L)
    const hipShiftX = 0.088 * pb;
    const hipShiftZ = 0.015 * dip;
    hipsPosValues[f * 3] = hipShiftX;
    hipsPosValues[f * 3 + 1] = clampedHipY;
    hipsPosValues[f * 3 + 2] = hipShiftZ;

    // 2. PELVIS & TORSO:
    // Tilt pelvis slightly upward on lifted leg side (-Z tilts -X up on Pose R)
    // Twist upper torso ~18° (0.32 rad) toward planted side with relaxed groove lean
    const hipRollZ = -0.075 * pb;
    const hipYawY = 0.08 * pb;
    const hipPitchX = 0.02 + 0.04 * dip;

    writeBoneQuat('Hips', f, hipPitchX, hipYawY, hipRollZ);
    writeBoneQuat('Spine', f, -0.04 * absPb + 0.04 * dip, 0.07 * pb, 0.05 * pb);
    writeBoneQuat('Spine1', f, -0.025 * absPb + 0.02 * dip, 0.11 * pb, 0.03 * pb);
    writeBoneQuat('Spine2', f, -0.02 * absPb, 0.13 * pb, 0.02 * pb);

    // 3. HEAD: Counter-rotate toward camera so eyes stay locked forward + subtle beat nod on impact
    writeBoneQuat('Neck', f, 0.05 * dip, -0.11 * pb, -0.03 * pb);
    writeBoneQuat('Head', f, 0.13 * dip, -0.18 * pb, -0.025 * pb);

    // 4. ARMS (SIGNATURE SHAPE):
    // Both elbows stay bent ~90° (-1.52 rad).
    // On Pose R (pb = +1): Left arm crosses diagonally across chest to Right collarbone;
    //                      Right arm flares outward to Right side at rib-to-chest height.
    // On Pose L (pb = -1): Exact mirror!
    const leftCrossW = 0.5 + 0.5 * pb; // 1 on Pose R, 0 on Pose L
    const rightCrossW = 1 - leftCrossW; // 0 on Pose R, 1 on Pose L
    const ampScale = 0.3 + 0.7 * absPb; // Tighter 70% amplitude on fast bursts

    // Left Arm (sideSign = -1): cross -> (+Z forward, +Z adduct inward, +Y turn across chest); flare -> (-Z abduct outward)
    const leftShoulderZ = lerp(-0.12, 0.08, leftCrossW) * ampScale;
    const leftArmX = lerp(-0.24, -0.82, leftCrossW) * ampScale - 0.12 * dip;
    const leftArmY = lerp(0.22, 0.58, leftCrossW) * ampScale;
    const leftArmZ = lerp(-0.96, 0.52, leftCrossW) * ampScale;
    const leftForeArmX = lerp(-1.46, -1.58, leftCrossW) - 0.08 * dip;
    const leftForeArmZ = lerp(0.24, 0.18, leftCrossW);

    // Right Arm (sideSign = +1): exact mirror
    const rightShoulderZ = lerp(0.12, -0.08, rightCrossW) * ampScale;
    const rightArmX = lerp(-0.24, -0.82, rightCrossW) * ampScale - 0.12 * dip;
    const rightArmY = lerp(-0.22, -0.58, rightCrossW) * ampScale;
    const rightArmZ = lerp(0.96, -0.52, rightCrossW) * ampScale;
    const rightForeArmX = lerp(-1.46, -1.58, rightCrossW) - 0.08 * dip;
    const rightForeArmZ = lerp(-0.24, -0.18, rightCrossW);

    writeBoneQuat('LeftShoulder', f, 0, 0, leftShoulderZ);
    writeBoneQuat('LeftArm', f, leftArmX, leftArmY, leftArmZ);
    writeBoneQuat('LeftForeArm', f, leftForeArmX, 0, leftForeArmZ);
    writeBoneQuat('LeftHand', f, 0.12 * dip, 0, 0.08 * leftCrossW);

    writeBoneQuat('RightShoulder', f, 0, 0, rightShoulderZ);
    writeBoneQuat('RightArm', f, rightArmX, rightArmY, rightArmZ);
    writeBoneQuat('RightForeArm', f, rightForeArmX, 0, rightForeArmZ);
    writeBoneQuat('RightHand', f, 0.12 * dip, 0, -0.08 * rightCrossW);

    // 5. LEGS & FEET TRACKS
    writeBoneQuat('LeftUpLeg', f, leftUpLegX, -0.08 * leftLift, leftUpLegZ);
    writeBoneQuat('LeftLeg', f, leftLegX, 0, 0);
    writeBoneQuat('LeftFoot', f, leftFootX, 0, 0);

    writeBoneQuat('RightUpLeg', f, rightUpLegX, 0.08 * rightLift, rightUpLegZ);
    writeBoneQuat('RightLeg', f, rightLegX, 0, 0);
    writeBoneQuat('RightFoot', f, rightFootX, 0, 0);
  }

  const tracks: THREE.KeyframeTrack[] = [
    new THREE.VectorKeyframeTrack('Hips.position', times, hipsPosValues),
  ];
  for (const bone of MIXAMO_BONES) {
    tracks.push(new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, quatArrays[bone]));
  }

  return new THREE.AnimationClip(`brazilian_tiktok_${patternId}`, durationSec, tracks);
}

/**
 * Remaps Mixamo-standard track names (`Hips.quaternion`, etc.) onto any target model whose bones
 * may carry `mixamorig:`, `mixamorig_`, or plain Mixamo naming conventions.
 */
export function remapMixamoTracks(
  clip: THREE.AnimationClip,
  targetModel: THREE.Object3D
): THREE.AnimationClip {
  const boneMap = new Map<string, string>();
  targetModel.traverse((obj) => {
    if (!obj.name) return;
    const cleaned = obj.name.replace(/^mixamorig[:_]?/i, '');
    if ((MIXAMO_BONES as readonly string[]).includes(cleaned)) {
      boneMap.set(cleaned, obj.name);
    }
  });

  const remappedTracks = clip.tracks.map((track) => {
    const cloned = track.clone();
    const dotIdx = cloned.name.indexOf('.');
    if (dotIdx > 0) {
      const baseBone = cloned.name.slice(0, dotIdx);
      const prop = cloned.name.slice(dotIdx);
      const mappedName = boneMap.get(baseBone);
      if (mappedName) {
        cloned.name = `${mappedName}${prop}`;
      }
    }
    return cloned;
  });

  return new THREE.AnimationClip(clip.name, clip.duration, remappedTracks);
}

export interface BrazilianStreetDancerHandle {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
  clip: THREE.AnimationClip;
  boomboxLedMat: THREE.MeshStandardMaterial;
  getPhase: () => FavelaDancerPhase;
  stopAudio: () => void;
  update: (dt: number, elapsed: number, isNight: boolean, isPlayerOutside: boolean) => void;
}

/**
 * Builds the Special Favela Boombox Dancer NPC (20-bone Mixamo rig + portable retro boombox):
 * Walks along the sidewalk carrying the boombox, sets it on the ground, plays the video's
 * beat audio outdoors synced microscopically to the L R L RLR L R L R high-knee chest-arm groove,
 * then picks up the boombox and walks off before returning after a cooldown.
 */
export function createBrazilianStreetDancerRig(): BrazilianStreetDancerHandle {
  const root = new THREE.Group();
  root.name = 'favela_brazilian_street_dancer';
  root.userData.outdoorOnly = true;
  root.userData.noMerge = true;
  root.userData.skipStaticBatch = true;

  // Mover group translates horizontally along sidewalk relative to plaza anchor (-1.6, 0.08, -16.85)
  const npcMover = new THREE.Group();
  npcMover.name = 'favela_dancer_mover';
  root.add(npcMover);

  // Materials (vibrant Rio streetwear palette with calibrated PBR roughness variation)
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc2835a, roughness: 0.56 });
  const jerseyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.52 });
  const jerseyAccentMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.48 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 });
  const sneakerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.36 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x171412, roughness: 0.76 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.2 });

  // Ground contact shadow disc so feet sit crisply grounded
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 18),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  npcMover.add(shadowDisc);

  // Skeleton rig scaled to match outdoor NPC proportions (~1.68m tall)
  const rigRoot = new THREE.Group();
  rigRoot.name = 'dancer_skeleton_root';
  npcMover.add(rigRoot);

  const thighLen = 0.41;
  const shinLen = 0.39;
  const footHeight = 0.08;
  const hipHeight = thighLen + shinLen + footHeight; // 0.88

  const boneRefs: Record<MixamoBoneName, THREE.Group> = {} as Record<MixamoBoneName, THREE.Group>;

  const jerseyBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.48 });
  const sockStripeMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.55 });
  const laceMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
  const smileMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.32 });

  // 1. Hips (sculpted athletic pelvis & relaxed shorts waistband with drawstring)
  const hips = new THREE.Group();
  hips.name = 'Hips';
  hips.position.set(0, hipHeight, 0);
  rigRoot.add(hips);
  boneRefs.Hips = hips;

  const pelvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.174, 0.184, 0.185, 16), shortsMat);
  pelvisMesh.scale.set(1.14, 1, 0.84);
  pelvisMesh.position.y = -0.01;
  hips.add(pelvisMesh);

  const waistband = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.016, 8, 20), jerseyAccentMat);
  waistband.rotation.x = Math.PI / 2;
  waistband.scale.set(1.12, 0.82, 1);
  waistband.position.y = 0.082;
  hips.add(waistband);

  // 2. Spine -> Spine1 -> Spine2 -> Neck -> Head (draped volumetric Rio football jersey!)
  const spine = new THREE.Group();
  spine.name = 'Spine';
  spine.position.set(0, 0.1, 0);
  hips.add(spine);
  boneRefs.Spine = spine;

  const waistMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.182, 0.16, 16), jerseyMat);
  waistMesh.scale.set(1.14, 1, 0.84);
  waistMesh.position.y = 0.068;
  spine.add(waistMesh);

  const jerseyHem = new THREE.Mesh(new THREE.TorusGeometry(0.178, 0.012, 8, 20), jerseyAccentMat);
  jerseyHem.rotation.x = Math.PI / 2;
  jerseyHem.scale.set(1.13, 0.84, 1);
  jerseyHem.position.y = -0.008;
  spine.add(jerseyHem);

  const spine1 = new THREE.Group();
  spine1.name = 'Spine1';
  spine1.position.set(0, 0.14, 0);
  spine.add(spine1);
  boneRefs.Spine1 = spine1;

  const midTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.194, 0.172, 0.175, 16), jerseyMat);
  midTorso.scale.set(1.15, 1, 0.85);
  midTorso.position.y = 0.082;
  spine1.add(midTorso);

  const chestStripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.197, 0.186, 0.055, 16),
    jerseyAccentMat
  );
  chestStripe.scale.set(1.15, 1, 0.86);
  chestStripe.position.y = 0.095;
  spine1.add(chestStripe);

  // Classic Brazil crest patch + subtle chest number badge
  const crestBadge = new THREE.Mesh(new THREE.CircleGeometry(0.026, 10), jerseyBlueMat);
  crestBadge.position.set(0.082, 0.135, 0.166);
  spine1.add(crestBadge);

  const spine2 = new THREE.Group();
  spine2.name = 'Spine2';
  spine2.position.set(0, 0.16, 0);
  spine1.add(spine2);
  boneRefs.Spine2 = spine2;

  const upperChest = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.192, 0.165, 16), jerseyMat);
  upperChest.scale.set(1.18, 1, 0.84);
  upperChest.position.y = 0.075;
  spine2.add(upperChest);

  // Rounded trapezius & upper shoulder yoke so torso connects organically into the arms
  const shoulderYoke = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.28, 8, 14), jerseyMat);
  shoulderYoke.rotation.z = Math.PI / 2;
  shoulderYoke.scale.set(1, 1, 0.92);
  shoulderYoke.position.set(0, 0.132, 0);
  spine2.add(shoulderYoke);

  const vCollar = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.015, 8, 18), jerseyAccentMat);
  vCollar.rotation.x = Math.PI / 2 + 0.16;
  vCollar.position.set(0, 0.162, 0.016);
  spine2.add(vCollar);

  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.102, 0.0065, 6, 18), goldMat);
  chain.rotation.x = Math.PI / 2 + 0.36;
  chain.position.set(0, 0.132, 0.044);
  spine2.add(chain);

  const chainPendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.014, 0), goldMat);
  chainPendant.scale.set(0.9, 1.2, 0.45);
  chainPendant.position.set(0, 0.068, 0.166);
  spine2.add(chainPendant);

  const neck = new THREE.Group();
  neck.name = 'Neck';
  neck.position.set(0, 0.17, 0);
  spine2.add(neck);
  boneRefs.Neck = neck;

  const neckCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.105, 12), skinMat);
  neckCyl.position.y = 0.046;
  neck.add(neckCyl);

  const head = new THREE.Group();
  head.name = 'Head';
  head.position.set(0, 0.09, 0);
  neck.add(head);
  boneRefs.Head = head;

  // Sculpted expressive head with jaw, ears, nose, confident grin & sleek street shades
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 16), skinMat);
  skull.scale.set(0.94, 1.08, 0.98);
  skull.position.y = 0.15;
  head.add(skull);

  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.112, 14, 10), skinMat);
  jaw.scale.set(0.92, 0.78, 0.96);
  jaw.position.set(0, 0.078, 0.022);
  head.add(jaw);

  [-0.142, 0.142].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), skinMat);
    ear.scale.set(0.48, 1.08, 0.76);
    ear.position.set(ex, 0.142, -0.004);
    head.add(ear);
  });

  const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.022, 6, 8), skinMat);
  nose.rotation.x = 0.25;
  nose.position.set(0, 0.136, 0.148);
  head.add(nose);

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 8, 14, Math.PI), smileMat);
  smile.rotation.z = Math.PI;
  smile.position.set(0, 0.102, 0.138);
  head.add(smile);

  const shadesMat = new THREE.MeshStandardMaterial({
    color: 0x090b10,
    roughness: 0.1,
    metalness: 0.78,
  });
  const shadesFrame = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.05, 0.026), shadesMat);
  shadesFrame.position.set(0, 0.168, 0.136);
  head.add(shadesFrame);
  [-0.105, 0.105].forEach((sx) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.145), shadesMat);
    arm.position.set(sx, 0.172, 0.072);
    head.add(arm);
  });

  // Tapered Rio curly high-top fade hair
  const hairFade = new THREE.Mesh(
    new THREE.SphereGeometry(0.156, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  hairFade.scale.set(0.99, 0.96, 1.03);
  hairFade.position.set(0, 0.17, -0.01);
  hairFade.rotation.x = -0.14;
  head.add(hairFade);

  const hairCurls: Array<[number, number, number, number]> = [
    [-0.072, 0.278, 0.036, 0.056],
    [0.0, 0.298, 0.032, 0.064],
    [0.072, 0.278, 0.036, 0.056],
    [-0.056, 0.285, -0.048, 0.058],
    [0.056, 0.285, -0.048, 0.058],
    [0.0, 0.265, -0.095, 0.056],
    [-0.095, 0.242, -0.02, 0.048],
    [0.095, 0.242, -0.02, 0.048],
  ];
  hairCurls.forEach(([cx, cy, cz, r]) => {
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), hairMat);
    tuft.position.set(cx, cy, cz);
    head.add(tuft);
  });

  // 3. Sculpted Athletic Arms (broad draped sleeves, volumetric biceps/forearms, sweatband, sculpted hands)
  const buildMixamoArm = (prefix: 'Left' | 'Right', sideSign: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.name = `${prefix}Shoulder`;
    shoulder.position.set(sideSign * 0.178, 0.135, 0);
    spine2.add(shoulder);
    boneRefs[`${prefix}Shoulder`] = shoulder;

    const arm = new THREE.Group();
    arm.name = `${prefix}Arm`;
    arm.position.set(sideSign * 0.068, -0.01, 0);
    shoulder.add(arm);
    boneRefs[`${prefix}Arm`] = arm;

    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 10), jerseyMat);
    deltoid.scale.set(1.04, 1.08, 0.98);
    arm.add(deltoid);

    const sleeveMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.076, 0.068, 0.155, 12),
      jerseyMat
    );
    sleeveMesh.position.y = -0.076;
    arm.add(sleeveMesh);

    const sleeveTrim = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.0085, 6, 16), jerseyAccentMat);
    sleeveTrim.rotation.x = Math.PI / 2;
    sleeveTrim.position.y = -0.152;
    arm.add(sleeveTrim);

    const upperSkin = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.054, 0.09, 6, 10),
      skinMat
    );
    upperSkin.position.y = -0.205;
    arm.add(upperSkin);

    const foreArm = new THREE.Group();
    foreArm.name = `${prefix}ForeArm`;
    foreArm.position.set(0, -0.25, 0);
    arm.add(foreArm);
    boneRefs[`${prefix}ForeArm`] = foreArm;

    const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skinMat);
    foreArm.add(elbowCap);

    const lowerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.041, 0.225, 12),
      skinMat
    );
    lowerMesh.position.y = -0.112;
    foreArm.add(lowerMesh);

    if (prefix === 'Left') {
      const sweatband = new THREE.Mesh(
        new THREE.CylinderGeometry(0.046, 0.045, 0.042, 12),
        jerseyAccentMat
      );
      sweatband.position.y = -0.19;
      foreArm.add(sweatband);
    }

    const hand = new THREE.Group();
    hand.name = `${prefix}Hand`;
    hand.position.set(0, -0.235, 0);
    foreArm.add(hand);
    boneRefs[`${prefix}Hand`] = hand;

    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), skinMat);
    palm.scale.set(0.88, 1.16, 0.65);
    palm.position.y = -0.036;
    hand.add(palm);

    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.026, 4, 6), skinMat);
    thumb.position.set(-sideSign * 0.032, -0.025, 0.022);
    thumb.rotation.z = sideSign * 0.55;
    hand.add(thumb);
  };
  buildMixamoArm('Left', -1);
  buildMixamoArm('Right', 1);

  // 4. Sculpted Athletic Legs (relaxed baggy shorts, fuller thighs & calves, striped crew socks, chunky street sneakers)
  const buildMixamoLeg = (prefix: 'Left' | 'Right', sideSign: -1 | 1) => {
    const upLeg = new THREE.Group();
    upLeg.name = `${prefix}UpLeg`;
    upLeg.position.set(sideSign * 0.112, -0.02, 0);
    hips.add(upLeg);
    boneRefs[`${prefix}UpLeg`] = upLeg;

    const hipCap = new THREE.Mesh(new THREE.SphereGeometry(0.096, 12, 10), shortsMat);
    upLeg.add(hipCap);

    const shortLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.102, 0.096, 0.265, 14),
      shortsMat
    );
    shortLeg.position.y = -0.132;
    upLeg.add(shortLeg);

    const shortTrim = new THREE.Mesh(new THREE.TorusGeometry(0.096, 0.008, 6, 16), jerseyMat);
    shortTrim.rotation.x = Math.PI / 2;
    shortTrim.position.y = -0.262;
    upLeg.add(shortTrim);

    const thighSkin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.074, 0.064, thighLen - 0.22, 12),
      skinMat
    );
    thighSkin.position.y = -0.22 - (thighLen - 0.22) * 0.5;
    upLeg.add(thighSkin);

    const leg = new THREE.Group();
    leg.name = `${prefix}Leg`;
    leg.position.set(0, -thighLen, 0);
    upLeg.add(leg);
    boneRefs[`${prefix}Leg`] = leg;

    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), skinMat);
    leg.add(kneeCap);

    // Tapered muscular calf contour
    const upperCalf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.058, (shinLen - 0.1) * 0.55, 12),
      skinMat
    );
    upperCalf.position.y = -(shinLen - 0.1) * 0.275;
    leg.add(upperCalf);

    const lowerCalf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.047, (shinLen - 0.1) * 0.45, 12),
      skinMat
    );
    lowerCalf.position.y = -(shinLen - 0.1) * 0.775;
    leg.add(lowerCalf);

    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.115, 12), sneakerMat);
    sock.position.y = -(shinLen - 0.052);
    leg.add(sock);

    const sockStripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0535, 0.0535, 0.018, 12),
      sockStripeMat
    );
    sockStripe.position.y = -(shinLen - 0.092);
    leg.add(sockStripe);

    const foot = new THREE.Group();
    foot.name = `${prefix}Foot`;
    foot.position.set(0, -shinLen, 0);
    leg.add(foot);
    boneRefs[`${prefix}Foot`] = foot;

    const sneakerHeel = new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.066, 0.14), sneakerMat);
    sneakerHeel.position.set(0, -footHeight * 0.44, 0.015);
    foot.add(sneakerHeel);

    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 10), sneakerMat);
    toeCap.scale.set(1.0, 0.58, 1.38);
    toeCap.position.set(0, -footHeight * 0.54, 0.095);
    foot.add(toeCap);

    const sneakerStripe = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.022, 0.065), jerseyAccentMat);
    sneakerStripe.position.set(0, -footHeight * 0.46, 0.036);
    foot.add(sneakerStripe);

    const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.02, 0.068), laceMat);
    tongue.position.set(0, -footHeight * 0.16, 0.055);
    tongue.rotation.x = 0.28;
    foot.add(tongue);

    const sneakerSole = new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.028, 0.228), soleMat);
    sneakerSole.position.set(0, -footHeight + 0.014, 0.048);
    foot.add(sneakerSole);
  };
  buildMixamoLeg('Left', -1);
  buildMixamoLeg('Right', 1);

  // 5. Portable Retro Rio Street Boombox (carried on shoulder/hip while walking, placed on pavement during dance)
  const boombox = new THREE.Group();
  boombox.name = 'favela_dancer_boombox';
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.55, metalness: 0.35 });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.72 });
  const boomboxLedMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  const bbBody = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.28, 0.18), boxMat);
  bbBody.position.y = 0.14;
  boombox.add(bbBody);
  const bbHandle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.014, 6, 14, Math.PI), boxMat);
  bbHandle.position.set(0, 0.28, 0);
  boombox.add(bbHandle);
  const wooferMeshes: THREE.Mesh[] = [];
  [-0.16, 0.16].forEach((sx) => {
    const woofer = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.02, 12), coneMat);
    woofer.rotation.x = Math.PI / 2;
    woofer.position.set(sx, 0.14, 0.088);
    boombox.add(woofer);
    wooferMeshes.push(woofer);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.008, 6, 14), goldMat);
    ring.position.set(sx, 0.14, 0.095);
    boombox.add(ring);
  });
  const eqStrip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.036, 0.014), boomboxLedMat);
  eqStrip.position.set(0, 0.20, 0.09);
  boombox.add(eqStrip);
  root.add(boombox);

  // Create exact 88 BPM 10-step mirrored Brazilian Dance Animation Guide clip (5.4545s 8-beat loop)
  const rawClip = createBrazilianLRLRLRLRClip({
    patternId: 'lrl_rlr_lrlr_funk8',
    bpm: FAVELA_DANCE_GUIDE_BPM,
    bounceSwag: 1.0,
    targetFps: 60,
    hipHeight,
    thighLength: thighLen,
    shinLength: shinLen,
    footHeight,
  });
  const remappedClip = remapMixamoTracks(rawClip, rigRoot);
  const mixer = new THREE.AnimationMixer(rigRoot);
  const action = mixer.clipAction(remappedClip);
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.play();

  // Outdoor Boombox HTML5 Audio synced to 88 BPM via playbackRate + 88 BPM WebAudio funk beat fallback for GitHub Pages
  let boomboxAudio: HTMLAudioElement | null = null;
  let audioStartedForVisit = false;
  let mp4Unavailable = false;
  let synthCtx: AudioContext | null = null;
  let lastSynthSubBeat = -1;

  const triggerSynthFunkHit = (subBeatIdx: number) => {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!synthCtx) {
      try {
        synthCtx = new AudioCtx();
      } catch {
        return;
      }
    }
    if (synthCtx.state === 'suspended') {
      synthCtx.resume().catch(() => {});
    }
    const now = synthCtx.currentTime;
    // 16 sixteenth-note subdivisions per 4-beat phrase @ 88 BPM (accents steps 1-2-3 slow + 4-5 fast double-time burst!)
    const step16 = ((subBeatIdx % 16) + 16) % 16;
    const isKick = step16 === 0 || step16 === 4 || step16 === 8 || step16 === 12 || step16 === 14;
    const isSnare = step16 === 2 || step16 === 6 || step16 === 10 || step16 === 13 || step16 === 15;

    if (isKick) {
      const osc = synthCtx.createOscillator();
      const gain = synthCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(118, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.11);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(synthCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
    if (isSnare) {
      const osc = synthCtx.createOscillator();
      const gain = synthCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(step16 >= 12 ? 340 : 255, now);
      osc.frequency.exponentialRampToValueAtTime(125, now + 0.065);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      osc.connect(gain);
      gain.connect(synthCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  };

  const ensureBoomboxAudio = (): HTMLAudioElement | null => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (!boomboxAudio) {
      boomboxAudio = new Audio(resolveFavelaDanceAudioUrl());
      boomboxAudio.preload = 'metadata';
      boomboxAudio.volume = 0.42;
      boomboxAudio.playbackRate = FAVELA_DANCE_AUDIO_PLAYBACK_RATE;
      boomboxAudio.loop = false;
      boomboxAudio.addEventListener('error', () => {
        mp4Unavailable = true;
      });
    }
    return boomboxAudio;
  };

  const stopAudio = () => {
    audioStartedForVisit = false;
    lastSynthSubBeat = -1;
    if (boomboxAudio && !boomboxAudio.paused) {
      boomboxAudio.pause();
    }
  };

  const resetRigPose = () => {
    for (const bone of MIXAMO_BONES) {
      boneRefs[bone].rotation.set(0, 0, 0);
    }
    hips.position.set(0, hipHeight, 0);
  };

  const applyWalkCarryPose = (walkCycle: number) => {
    resetRigPose();
    const stride = Math.sin(walkCycle);
    const cosStride = Math.cos(walkCycle);
    const bounce = Math.abs(stride) * 0.028;
    hips.position.set(0, hipHeight - bounce, 0);
    hips.rotation.set(0, stride * 0.06, stride * 0.028);
    boneRefs.Spine.rotation.set(0.055, -stride * 0.075, -0.045); // Slight counterweight lean carrying heavy boombox
    boneRefs.Head.rotation.set(0.025 * Math.sin(walkCycle * 2), stride * 0.05, 0.03);

    // Multi-joint articulated legs with knee lift & ankle roll
    boneRefs.LeftUpLeg.rotation.x = stride * 0.5;
    boneRefs.LeftLeg.rotation.x = Math.max(0.08, Math.max(0, -cosStride) * 0.62);
    boneRefs.LeftFoot.rotation.x = -stride * 0.18;
    boneRefs.RightUpLeg.rotation.x = -stride * 0.5;
    boneRefs.RightLeg.rotation.x = Math.max(0.08, Math.max(0, cosStride) * 0.62);
    boneRefs.RightFoot.rotation.x = stride * 0.18;

    // Left arm swings naturally with elbow flex
    boneRefs.LeftArm.rotation.set(-stride * 0.44, 0, -0.08);
    boneRefs.LeftForeArm.rotation.set(-0.26 - Math.max(0, -stride) * 0.22, 0, 0);

    // Right arm securely carries the boombox handle at side-hip height (minimal sway, locked grip!)
    boneRefs.RightShoulder.rotation.set(0, 0, -0.06);
    boneRefs.RightArm.rotation.set(0.06 + stride * 0.04, 0, 0.14);
    boneRefs.RightForeArm.rotation.set(-0.28, 0, -0.06);
    boneRefs.RightHand.rotation.set(0.18, 0, 0);
  };

  const applyBendBoomboxPose = (crouchAmount: number) => {
    resetRigPose();
    const c = Math.max(0, Math.min(1, crouchAmount));
    hips.position.set(0, hipHeight - c * 0.34, c * 0.04);
    boneRefs.Spine.rotation.set(c * 0.48, c * 0.18, 0);
    boneRefs.Spine1.rotation.set(c * 0.24, c * 0.12, 0);
    boneRefs.Head.rotation.set(-c * 0.28, -c * 0.12, 0);

    // Squat bend on both knees
    boneRefs.LeftUpLeg.rotation.set(-c * 0.85, 0, -0.06);
    boneRefs.LeftLeg.rotation.set(c * 1.45, 0, 0);
    boneRefs.LeftFoot.rotation.set(-c * 0.58, 0, 0);

    boneRefs.RightUpLeg.rotation.set(-c * 0.85, 0, 0.06);
    boneRefs.RightLeg.rotation.set(c * 1.45, 0, 0);
    boneRefs.RightFoot.rotation.set(-c * 0.58, 0, 0);

    // Right arm reaching down firmly holding the boombox handle
    boneRefs.RightArm.rotation.set(-0.18 - c * 0.62, -c * 0.14, 0.16);
    boneRefs.RightForeArm.rotation.set(-0.28 + c * 0.12, 0, 0);
    boneRefs.LeftArm.rotation.set(-0.18 - c * 0.22, 0, -0.18);
    boneRefs.LeftForeArm.rotation.set(-0.45, 0, 0);
  };

  // Scratch vectors to anchor boombox handle strictly to RightHand world position (zero floating!)
  const _handWorldPos = new THREE.Vector3();
  const _handLocalPos = new THREE.Vector3();
  const snapBoomboxToRightHand = () => {
    root.updateMatrixWorld(true);
    boneRefs.RightHand.getWorldPosition(_handWorldPos);
    _handLocalPos.copy(_handWorldPos);
    root.worldToLocal(_handLocalPos);
    // Boombox handle apex sits at local y = +0.40 inside boombox group -> offset by -0.39 so fingers wrap the handle!
    boombox.position.set(_handLocalPos.x, _handLocalPos.y - 0.39, _handLocalPos.z);
    boombox.rotation.set(0, npcMover.rotation.y - Math.PI / 2, 0);
  };

  const GROUND_BOX_POS = new THREE.Vector3(0.68, 0, 0.06);
  const WALK_START_X = FAVELA_DANCER_WALK_START_X;
  const WALK_END_X = FAVELA_DANCER_WALK_END_X;
  const DANCE_FACING_Y = 0.14;

  let lifecycle = createInitialFavelaDancerLifecycle();
  let walkCyclePhase = 0;

  return {
    root,
    mixer,
    action,
    clip: remappedClip,
    boomboxLedMat,
    getPhase: () => lifecycle.phase,
    stopAudio,
    update: (dt, elapsed, isNight, isPlayerOutside) => {
      if (!isPlayerOutside) {
        stopAudio();
        return;
      }

      const prevPhase = lifecycle.phase;
      lifecycle = advanceFavelaDancerLifecycle(lifecycle, dt);

      if (prevPhase === 'dancing' && lifecycle.phase !== 'dancing') {
        stopAudio();
      }

      const phaseDur = FAVELA_DANCER_PHASE_DURATIONS[lifecycle.phase];
      const u = Math.max(0, Math.min(1, lifecycle.phaseTime / Math.max(0.001, phaseDur)));

      if (lifecycle.phase === 'cooldown') {
        npcMover.visible = false;
        boombox.visible = false;
        stopAudio();
        return;
      }

      npcMover.visible = true;
      boombox.visible = true;

      if (lifecycle.phase === 'walk_in') {
        // Constant natural street-walk cadence from far off-view (-23.5) decelerating smoothly in the final 10%
        const decelStart = 0.88;
        const posU =
          u < decelStart
            ? (u / decelStart) * 0.94
            : 0.94 + 0.06 * Math.sin(((u - decelStart) / (1 - decelStart)) * (Math.PI / 2));
        const curX = WALK_START_X * (1 - posU);
        npcMover.position.set(curX, 0, 0);
        // Face +X along sidewalk until arrival, then smoothly pivot to face cafe storefront
        const turnT = u > 0.9 ? (u - 0.9) / 0.1 : 0;
        const smoothTurn = turnT * turnT * (3 - 2 * turnT);
        npcMover.rotation.y = Math.PI / 2 + (DANCE_FACING_Y - Math.PI / 2) * smoothTurn;

        const strideSpeed = u < decelStart ? 7.6 : 7.6 * Math.max(0.25, 1 - (u - decelStart) / (1 - decelStart));
        walkCyclePhase += dt * strideSpeed;
        applyWalkCarryPose(walkCyclePhase);

        // Boombox handle strictly locked inside his right hand palm while walking (zero float!)
        snapBoomboxToRightHand();
        boomboxLedMat.emissiveIntensity = isNight ? 0.45 : 0.2;
        return;
      }

      if (lifecycle.phase === 'place_boombox') {
        npcMover.position.set(0, 0, 0);
        npcMover.rotation.y = DANCE_FACING_Y;
        const crouch =
          u < 0.55
            ? Math.sin((u / 0.55) * (Math.PI / 2))
            : Math.cos(((u - 0.55) / 0.45) * (Math.PI / 2));
        applyBendBoomboxPose(crouch);

        const placeT = Math.min(1, u / 0.55);
        const easePlace = placeT * placeT * (3 - 2 * placeT);
        if (placeT < 0.96) {
          root.updateMatrixWorld(true);
          boneRefs.RightHand.getWorldPosition(_handWorldPos);
          _handLocalPos.copy(_handWorldPos);
          root.worldToLocal(_handLocalPos);
          boombox.position.set(
            THREE.MathUtils.lerp(_handLocalPos.x, GROUND_BOX_POS.x, easePlace),
            Math.max(0, THREE.MathUtils.lerp(_handLocalPos.y - 0.39, GROUND_BOX_POS.y, easePlace)),
            THREE.MathUtils.lerp(_handLocalPos.z, GROUND_BOX_POS.z, easePlace)
          );
        } else {
          boombox.position.copy(GROUND_BOX_POS);
        }
        boombox.rotation.set(0, -0.28 * easePlace, 0);
        boomboxLedMat.emissiveIntensity = (isNight ? 0.9 : 0.4) + easePlace * 0.4;
        return;
      }

      if (lifecycle.phase === 'dancing') {
        npcMover.position.set(0, 0, 0);
        npcMover.rotation.y = DANCE_FACING_Y;
        boombox.position.copy(GROUND_BOX_POS);
        boombox.rotation.set(0, -0.28, 0);

        // Play video beat audio outdoors (if SFX/game audio not muted) + automatic synthesized funk beat fallback!
        const audio = ensureBoomboxAudio();
        const isMuted = soundEngine.getMuted();
        let mp4ActivelyPlaying = false;
        if (audio && !mp4Unavailable) {
          audio.volume = isMuted ? 0 : 0.42;
          if (!isMuted && !audioStartedForVisit) {
            audioStartedForVisit = true;
            try {
              audio.currentTime = FAVELA_DANCE_LOOP_START_SEC;
              const p = audio.play();
              if (p && typeof p.catch === 'function') {
                p.catch(() => {
                  mp4Unavailable = true;
                });
              }
            } catch {
              mp4Unavailable = true;
            }
          } else if (isMuted && !audio.paused) {
            audio.pause();
          } else if (
            !isMuted &&
            audioStartedForVisit &&
            audio.paused &&
            lifecycle.phaseTime < phaseDur - 0.3
          ) {
            audio.play().catch(() => {
              mp4Unavailable = true;
            });
          }
          if (audio.currentTime >= FAVELA_DANCE_LOOP_END_SEC - 0.05) {
            try {
              audio.currentTime = FAVELA_DANCE_LOOP_START_SEC;
            } catch {
              // ignore
            }
          }
          mp4ActivelyPlaying = !audio.paused && !audio.ended && audio.readyState >= 2;
        }

        // MICROSCOPIC 88 BPM BEAT LOCK: drive AnimationMixer directly from synced boombox audio clock (or exact 88 BPM phaseTime!)
        if (audio) {
          audio.playbackRate = FAVELA_DANCE_AUDIO_PLAYBACK_RATE;
        }
        const audioTime = mp4ActivelyPlaying && audio ? audio.currentTime : null;
        const syncedClipTime = resolveVideoBeatSyncTime(
          audioTime,
          lifecycle.phaseTime,
          FAVELA_DANCE_LOOP_DURATION_SEC
        );
        mixer.setTime(syncedClipTime);

        // Synthesized 88 BPM Brazilian funk percussion fallback whenever MP4 cannot play (e.g. GitHub Pages / codec block)
        if (!isMuted && !mp4ActivelyPlaying) {
          const curSubBeat = Math.floor((lifecycle.phaseTime / FAVELA_DANCE_BEAT_SEC) * 4);
          if (curSubBeat !== lastSynthSubBeat) {
            lastSynthSubBeat = curSubBeat;
            triggerSynthFunkHit(curSubBeat);
          }
        }

        const beatPhase = syncedClipTime / FAVELA_DANCE_BEAT_SEC;
        const beatPulse = Math.pow(0.5 + 0.5 * Math.cos((beatPhase % 1) * Math.PI * 2), 2);
        boomboxLedMat.emissiveIntensity = (isNight ? 1.65 : 0.75) + beatPulse * 0.75;
        const wooferScale = 1.0 + beatPulse * 0.1;
        for (const w of wooferMeshes) {
          w.scale.set(wooferScale, 1, wooferScale);
        }
        return;
      }

      if (lifecycle.phase === 'pickup_boombox') {
        stopAudio();
        npcMover.position.set(0, 0, 0);
        npcMover.rotation.y = DANCE_FACING_Y;
        const crouch =
          u < 0.45
            ? Math.sin((u / 0.45) * (Math.PI / 2))
            : Math.cos(((u - 0.45) / 0.55) * (Math.PI / 2));
        applyBendBoomboxPose(crouch);

        const liftT = u < 0.45 ? 0 : (u - 0.45) / 0.55;
        const easeLift = liftT * liftT * (3 - 2 * liftT);
        if (liftT <= 0.02) {
          boombox.position.copy(GROUND_BOX_POS);
        } else {
          root.updateMatrixWorld(true);
          boneRefs.RightHand.getWorldPosition(_handWorldPos);
          _handLocalPos.copy(_handWorldPos);
          root.worldToLocal(_handLocalPos);
          boombox.position.set(
            THREE.MathUtils.lerp(GROUND_BOX_POS.x, _handLocalPos.x, easeLift),
            Math.max(0, THREE.MathUtils.lerp(GROUND_BOX_POS.y, _handLocalPos.y - 0.39, easeLift)),
            THREE.MathUtils.lerp(GROUND_BOX_POS.z, _handLocalPos.z, easeLift)
          );
        }
        boombox.rotation.set(0, -0.28 * (1 - easeLift), 0);
        boomboxLedMat.emissiveIntensity = (isNight ? 0.5 : 0.25) * (1 - easeLift);
        for (const w of wooferMeshes) {
          w.scale.set(1, 1, 1);
        }
        return;
      }

      // walk_out — smoothly accelerate & walk all the way past the far-right street edge (+24.5) out of sight
      const accelEnd = 0.1;
      const posU =
        u < accelEnd
          ? 0.05 * (1 - Math.cos((u / accelEnd) * (Math.PI / 2)))
          : 0.05 + 0.95 * ((u - accelEnd) / (1 - accelEnd));
      const curX = WALK_END_X * posU;
      npcMover.position.set(curX, 0, 0);
      const turnT = u < 0.09 ? u / 0.09 : 1;
      const smoothTurn = turnT * turnT * (3 - 2 * turnT);
      npcMover.rotation.y = DANCE_FACING_Y + (Math.PI / 2 - DANCE_FACING_Y) * smoothTurn;

      const strideSpeed = u < accelEnd ? 3.5 + 4.1 * (u / accelEnd) : 7.6;
      walkCyclePhase += dt * strideSpeed;
      applyWalkCarryPose(walkCyclePhase);

      // Boombox handle stays strictly gripped in dancer's right hand as he walks off-screen!
      snapBoomboxToRightHand();
      boomboxLedMat.emissiveIntensity = isNight ? 0.35 : 0.15;
    },
  };
}
