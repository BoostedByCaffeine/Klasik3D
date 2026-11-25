import type { BaristaStationId } from './rules';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface CameraTargetPair {
  pos: Vec3Like;
  look: Vec3Like;
}

export interface MilkPourPose {
  position: Vec3Like;
  rotationX: number;
  rotationZ: number;
  steamWandTiltZ: number;
  vortexSpinActive: boolean;
  streamActive: boolean;
  streamStrength: number;
  badgePos: Vec3Like | null;
}

export interface TeaSteepPose {
  position: Vec3Like;
  rotationZ: number;
  streamActive: boolean;
  streamStrength: number;
  badgePos: Vec3Like | null;
}

export const MILK_PITCHER_REST_POS: Readonly<Vec3Like> = { x: 0.96, y: 1.0, z: 0.38 };
export const STEAM_WAND_FROTH_POS: Readonly<Vec3Like> = { x: 0.26, y: 1.12, z: 0.38 };
export const MILK_POUR_HOVER_POS: Readonly<Vec3Like> = { x: 1.03, y: 1.255, z: 0.38 };
export const ACTIVE_CUP_STATION4_POS: Readonly<Vec3Like> = { x: 1.18, y: 1.01, z: 0.38 };
export const ACTIVE_CUP_ESPRESSO_POS: Readonly<Vec3Like> = { x: -0.16, y: 1.055, z: 0.30 };

// Front-right beside the cup on a clear walnut wooden coaster so Realism Mode clicks never collide with the cup
export const TEA_POT_REST_POS: Readonly<Vec3Like> = { x: 1.44, y: 1.0, z: 0.42 };
export const TEA_POT_POUR_HOVER_POS: Readonly<Vec3Like> = { x: 1.335, y: 1.24, z: 0.38 };

// Recessed stainless-steel ice compartment with hinged lid set flush into the counter below the rinsing sink
export const ICE_COMPARTMENT_POS: Readonly<Vec3Like> = { x: 0.74, y: 1.0, z: 0.56 };
export const RINSING_SINK_POS: Readonly<Vec3Like> = { x: 0.52, y: 1.0, z: 0.28 };

export const TEA_POT_HITBOX_RADIUS = 0.095;
export const CUP_SERVE_HITBOX_RADIUS = 0.095;

/**
 * Duration (seconds) after pull_espresso finishes during which the camera stays locked onto
 * Station 4 (Milk & Tea) while React commits the station transition — eliminates the 1-3 frame
 * snap-back jerk toward Station 3.
 */
export const POST_PULL_HANDOFF_DURATION_SEC = 0.48;

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

export function smootherStep(t: number): number {
  const u = clamp01(t);
  return u * u * u * (u * (u * 6 - 15) + 10);
}

export function lerpScalar(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function evalQuadBezier1D(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/**
 * C1-continuous 4-phase milk steaming & latte-art pouring choreography:
 *   Phase 1 (0.00..0.30): Smooth lift from counter pad to steam wand & vortex froth dwell
 *   Phase 2 (0.30..0.48): Continuous overhead carry arc directly from steam wand to pour-ready hover (zero return/teleport!)
 *   Phase 3 (0.48..0.84): Smooth wrist tilt (-0.24 -> -1.04 -> -0.68 rad) + figure-8 latte-art micro-sway + live pour stream
 *   Phase 4 (0.84..1.00): Continuous un-tilt (-0.68 -> 0 rad) and graceful landing back onto counter pad
 */
export function evaluateMilkPourPose(rawP: number, elapsedSec: number): MilkPourPose {
  const p = clamp01(rawP);

  // Phase 1: Lift to steam wand & froth (0.00 .. 0.28)
  if (p < 0.28) {
    const arriveT = smootherStep(p / 0.18);
    const frothDwell = p >= 0.18 ? (p - 0.18) / 0.10 : 0;
    const frothPulse = p >= 0.18 ? Math.sin(frothDwell * Math.PI) : 0;

    const x = evalQuadBezier1D(MILK_PITCHER_REST_POS.x, 0.62, STEAM_WAND_FROTH_POS.x, arriveT);
    const y =
      evalQuadBezier1D(MILK_PITCHER_REST_POS.y, 1.16, STEAM_WAND_FROTH_POS.y, arriveT) +
      frothPulse * 0.012;
    const z = MILK_PITCHER_REST_POS.z;

    return {
      position: { x, y, z },
      rotationX: 0,
      rotationZ: 0.12 * frothPulse,
      steamWandTiltZ: -0.34 * arriveT,
      vortexSpinActive: p > 0.08,
      streamActive: false,
      streamStrength: 0,
      badgePos: { x: STEAM_WAND_FROTH_POS.x, y: 1.38, z: 0.36 },
    };
  }

  // Phase 2: Continuous overhead carry arc directly from steam wand -> pour hover (0.28 .. 0.48)
  if (p < 0.48) {
    const carryT = smootherStep((p - 0.28) / 0.20);
    const x = evalQuadBezier1D(STEAM_WAND_FROTH_POS.x, 0.68, MILK_POUR_HOVER_POS.x, carryT);
    const y = evalQuadBezier1D(STEAM_WAND_FROTH_POS.y, 1.31, MILK_POUR_HOVER_POS.y, carryT);
    const z = evalQuadBezier1D(STEAM_WAND_FROTH_POS.z, 0.41, MILK_POUR_HOVER_POS.z, carryT);
    const preTiltZ = lerpScalar(0, -0.24, carryT);

    return {
      position: { x, y, z },
      rotationX: 0,
      rotationZ: preTiltZ,
      steamWandTiltZ: -0.34 * (1 - carryT),
      vortexSpinActive: carryT < 0.35,
      streamActive: false,
      streamStrength: 0,
      badgePos: carryT < 0.4 ? { x: STEAM_WAND_FROTH_POS.x, y: 1.38, z: 0.36 } : null,
    };
  }

  // Phase 3: Controlled wrist pour & gentle latte-art figure-8 micro-sway (0.48 .. 0.84)
  if (p < 0.84) {
    const pourU = (p - 0.48) / 0.36; // 0 .. 1
    // Smooth ramp-in (0..0.22), steady pour plateau (0.22..0.78), gentle ease-out (0.78..1.0)
    let tiltZ: number;
    let streamStrength: number;
    if (pourU < 0.22) {
      const e = smootherStep(pourU / 0.22);
      tiltZ = lerpScalar(-0.24, -1.02, e);
      streamStrength = e;
    } else if (pourU < 0.78) {
      const mid = (pourU - 0.22) / 0.56;
      tiltZ = -1.02 - Math.sin(mid * Math.PI) * 0.06;
      streamStrength = 1.0;
    } else {
      const e = smootherStep((pourU - 0.78) / 0.22);
      tiltZ = lerpScalar(-1.02, -0.68, e);
      streamStrength = 1 - e;
    }

    // Smoothly windowed micro-sway (strictly 0 at pourU === 0 and pourU === 1 for C1 continuity)
    const swayWindow = Math.sin(pourU * Math.PI);
    const swayZ = Math.sin(elapsedSec * 15.0) * 0.009 * swayWindow;
    const swayX = Math.sin(elapsedSec * 7.5) * 0.006 * swayWindow;
    const dipY = -0.016 * swayWindow;

    return {
      position: {
        x: MILK_POUR_HOVER_POS.x + swayX,
        y: MILK_POUR_HOVER_POS.y + dipY,
        z: MILK_POUR_HOVER_POS.z + swayZ,
      },
      rotationX: swayZ * 1.6,
      rotationZ: tiltZ,
      steamWandTiltZ: 0,
      vortexSpinActive: false,
      streamActive: streamStrength > 0.08,
      streamStrength,
      badgePos: { x: ACTIVE_CUP_STATION4_POS.x, y: 1.44, z: 0.36 },
    };
  }

  // Phase 4: Continuous un-tilt (-0.68 -> 0 rad) and graceful set-down to pad (0.84 .. 1.00)
  const restT = smootherStep((p - 0.84) / 0.16);
  const x = evalQuadBezier1D(MILK_POUR_HOVER_POS.x, 0.99, MILK_PITCHER_REST_POS.x, restT);
  const y = evalQuadBezier1D(MILK_POUR_HOVER_POS.y, 1.14, MILK_PITCHER_REST_POS.y, restT);
  const z = evalQuadBezier1D(MILK_POUR_HOVER_POS.z, 0.38, MILK_PITCHER_REST_POS.z, restT);

  return {
    position: { x, y, z },
    rotationX: 0,
    rotationZ: lerpScalar(-0.68, 0, restT),
    steamWandTiltZ: 0,
    vortexSpinActive: false,
    streamActive: false,
    streamStrength: 0,
    badgePos: null,
  };
}

/**
 * C1-continuous 3-phase tea steeping arc starting from the front-right walnut coaster (1.44, 1.0, 0.42).
 * Lifts cleanly up-and-left over the cup at (1.18, 1.01, 0.38), tilts left (+rotationZ) so the
 * left-facing borosilicate spout pours smoothly into the cup, and returns flush onto its coaster.
 */
export function evaluateTeaSteepPose(rawP: number): TeaSteepPose {
  const p = clamp01(rawP);

  if (p < 0.24) {
    const liftT = smootherStep(p / 0.24);
    return {
      position: {
        x: evalQuadBezier1D(TEA_POT_REST_POS.x, 1.42, TEA_POT_POUR_HOVER_POS.x, liftT),
        y: evalQuadBezier1D(TEA_POT_REST_POS.y, 1.22, TEA_POT_POUR_HOVER_POS.y, liftT),
        z: evalQuadBezier1D(TEA_POT_REST_POS.z, 0.41, TEA_POT_POUR_HOVER_POS.z, liftT),
      },
      rotationZ: lerpScalar(0, 0.34, liftT),
      streamActive: false,
      streamStrength: 0,
      badgePos: null,
    };
  }

  if (p < 0.78) {
    const pourU = (p - 0.24) / 0.54;
    const bell = Math.sin(pourU * Math.PI);
    const tiltZ = 0.34 + bell * 0.34;
    return {
      position: {
        x: TEA_POT_POUR_HOVER_POS.x - bell * 0.014,
        y: TEA_POT_POUR_HOVER_POS.y + bell * 0.01,
        z: TEA_POT_POUR_HOVER_POS.z,
      },
      rotationZ: tiltZ,
      streamActive: bell > 0.14,
      streamStrength: bell,
      badgePos: { x: ACTIVE_CUP_STATION4_POS.x + 0.06, y: 1.44 + pourU * 0.04, z: 0.36 },
    };
  }

  const returnT = smootherStep((p - 0.78) / 0.22);
  return {
    position: {
      x: evalQuadBezier1D(TEA_POT_POUR_HOVER_POS.x, 1.42, TEA_POT_REST_POS.x, returnT),
      y: evalQuadBezier1D(TEA_POT_POUR_HOVER_POS.y, 1.21, TEA_POT_REST_POS.y, returnT),
      z: evalQuadBezier1D(TEA_POT_POUR_HOVER_POS.z, 0.41, TEA_POT_REST_POS.z, returnT),
    },
    rotationZ: lerpScalar(0.34, 0, returnT),
    streamActive: false,
    streamStrength: 0,
    badgePos: null,
  };
}

/**
 * Resolves the jerk-free barista camera target across Espresso Pull -> Station 4 (Milk & Tea).
 * Eliminates the classic 1-3 frame backward snap to Station 3 when pull_espresso finishes just
 * before React advances activeStation from 3 -> 4.
 */
export function resolveBaristaCameraTarget(params: {
  activeStation: BaristaStationId;
  stationPreset: CameraTargetPair;
  station4Preset: CameraTargetPair;
  stepAnimType: string | null;
  stepAnimProgress: number;
  cupPos: Vec3Like;
  pullTransitionHoldTimer: number;
}): CameraTargetPair {
  const {
    activeStation,
    stationPreset,
    station4Preset,
    stepAnimType,
    stepAnimProgress,
    cupPos,
    pullTransitionHoldTimer,
  } = params;

  if (stepAnimType === 'grind') {
    return {
      pos: { x: -0.52, y: 1.48, z: 1.28 },
      look: { x: -0.74, y: 1.1, z: 0.28 },
    };
  }
  if (stepAnimType === 'tamp') {
    return {
      pos: { x: -0.38, y: 1.46, z: 1.26 },
      look: { x: -0.43, y: 1.06, z: 0.36 },
    };
  }
  if (stepAnimType === 'pull_espresso') {
    if (stepAnimProgress < 0.84) {
      return {
        pos: { x: -0.16, y: 1.46, z: 1.28 },
        look: { x: -0.16, y: 1.08, z: 0.30 },
      };
    }
    // Smoothly blend straight into Station 4 framing during the cup's final glide (0.84 -> 1.00)
    const handoffT = smootherStep((stepAnimProgress - 0.84) / 0.16);
    return {
      pos: {
        x: lerpScalar(-0.16, station4Preset.pos.x, handoffT),
        y: lerpScalar(1.46, station4Preset.pos.y, handoffT),
        z: lerpScalar(1.28, station4Preset.pos.z, handoffT),
      },
      look: {
        x: lerpScalar(-0.16, station4Preset.look.x, handoffT),
        y: lerpScalar(1.08, station4Preset.look.y, handoffT),
        z: lerpScalar(0.30, station4Preset.look.z, handoffT),
      },
    };
  }
  if (stepAnimType === 'rinse_cup') {
    return {
      pos: { x: 0.62, y: 1.48, z: 1.24 },
      look: { x: 0.62, y: 1.08, z: 0.28 },
    };
  }
  if (stepAnimType === 'add_ice') {
    return {
      pos: { x: 1.04, y: 1.5, z: 1.46 },
      look: { x: 0.98, y: 1.08, z: 0.45 },
    };
  }
  if (
    stepAnimType === 'steam_milk' ||
    stepAnimType === 'steep_tea' ||
    stepAnimType === 'add_syrup'
  ) {
    return {
      pos: { x: 1.26, y: 1.48, z: 1.38 },
      look: { x: cupPos.x, y: 1.1, z: 0.36 },
    };
  }
  if (stepAnimType === 'serve_drink') {
    return {
      pos: { x: -1.32, y: 1.54, z: 1.38 },
      look: { x: -1.32, y: 1.15, z: -0.42 },
    };
  }

  // Post-pull handoff bridge: while activeStation is briefly still 3 right after pull_espresso
  // finishes, keep targeting Station 4 smoothly so the camera NEVER snaps back left!
  if (pullTransitionHoldTimer > 0 && activeStation === 3) {
    return {
      pos: { ...station4Preset.pos },
      look: { ...station4Preset.look },
    };
  }

  return {
    pos: { ...stationPreset.pos },
    look: { ...stationPreset.look },
  };
}

/**
 * Pure 3D ray-clearance check verifying that a ray from the Station 4 camera directly to the
 * teapot center clears the active cup's vertical cylinder hitbox with comfortable margin.
 */
export function checkTeaPotClickClearance(
  cameraPos: Vec3Like,
  cupPos: Vec3Like = ACTIVE_CUP_STATION4_POS,
  teaPos: Vec3Like = TEA_POT_REST_POS,
  cupRadius: number = CUP_SERVE_HITBOX_RADIUS,
  teaRadius: number = TEA_POT_HITBOX_RADIUS
): {
  centerSeparationXZ: number;
  hitboxesOverlap: boolean;
  rayDistanceToCupAxisXZ: number;
  isUnobstructed: boolean;
} {
  const centerSeparationXZ = Math.hypot(teaPos.x - cupPos.x, teaPos.z - cupPos.z);
  const hitboxesOverlap = centerSeparationXZ < cupRadius + teaRadius;

  // Closest distance from cup XZ center to segment [cameraPos -> teaPos] in XZ plane
  const dx = teaPos.x - cameraPos.x;
  const dz = teaPos.z - cameraPos.z;
  const lenSq = dx * dx + dz * dz;
  const t =
    lenSq > 1e-6
      ? clamp01(((cupPos.x - cameraPos.x) * dx + (cupPos.z - cameraPos.z) * dz) / lenSq)
      : 0;
  const closestX = cameraPos.x + dx * t;
  const closestZ = cameraPos.z + dz * t;
  const rayDistanceToCupAxisXZ = Math.hypot(cupPos.x - closestX, cupPos.z - closestZ);

  return {
    centerSeparationXZ,
    hitboxesOverlap,
    rayDistanceToCupAxisXZ,
    isUnobstructed: !hitboxesOverlap && rayDistanceToCupAxisXZ > cupRadius + 0.04,
  };
}

/**
 * Pure 3D layout & ray-clearance check verifying that the recessed ice compartment sits cleanly
 * below the rinsing sink row (greater Z) with zero obstruction from milk, cup, or steep tea.
 */
export function checkIceCompartmentClearance(
  cameraPos: Vec3Like,
  icePos: Vec3Like = ICE_COMPARTMENT_POS
): {
  isBelowRinsingSinkRow: boolean;
  minSeparationFromRow1: number;
  minRayClearanceToRow1: number;
  isUnobstructed: boolean;
} {
  const row1Blockers: Array<{ pos: Vec3Like; radius: number }> = [
    { pos: RINSING_SINK_POS, radius: 0.11 },
    { pos: MILK_PITCHER_REST_POS, radius: 0.085 },
    { pos: ACTIVE_CUP_STATION4_POS, radius: CUP_SERVE_HITBOX_RADIUS },
    { pos: TEA_POT_REST_POS, radius: TEA_POT_HITBOX_RADIUS },
  ];

  const isBelowRinsingSinkRow =
    icePos.z > RINSING_SINK_POS.z + 0.18 &&
    icePos.z > MILK_PITCHER_REST_POS.z + 0.12 &&
    icePos.x < MILK_PITCHER_REST_POS.x;

  let minSeparationFromRow1 = Infinity;
  let minRayClearanceToRow1 = Infinity;

  const dx = icePos.x - cameraPos.x;
  const dz = icePos.z - cameraPos.z;
  const lenSq = dx * dx + dz * dz;

  for (const blocker of row1Blockers) {
    const sep = Math.hypot(icePos.x - blocker.pos.x, icePos.z - blocker.pos.z) - blocker.radius;
    if (sep < minSeparationFromRow1) minSeparationFromRow1 = sep;

    const t =
      lenSq > 1e-6
        ? clamp01(((blocker.pos.x - cameraPos.x) * dx + (blocker.pos.z - cameraPos.z) * dz) / lenSq)
        : 0;
    const closestX = cameraPos.x + dx * t;
    const closestZ = cameraPos.z + dz * t;
    const rayClear = Math.hypot(blocker.pos.x - closestX, blocker.pos.z - closestZ) - blocker.radius;
    if (rayClear < minRayClearanceToRow1) minRayClearanceToRow1 = rayClear;
  }

  return {
    isBelowRinsingSinkRow,
    minSeparationFromRow1,
    minRayClearanceToRow1,
    isUnobstructed:
      isBelowRinsingSinkRow && minSeparationFromRow1 > 0.10 && minRayClearanceToRow1 > 0.10,
  };
}
