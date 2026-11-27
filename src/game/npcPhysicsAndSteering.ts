import * as THREE from 'three';
import type { SceneryId } from './sceneryData';

export interface Vec2XZ {
  x: number;
  z: number;
}

export interface Vec3Point {
  x: number;
  y: number;
  z: number;
}

export interface StaticObstacleCircle {
  id: string;
  x: number;
  z: number;
  radius: number;
  /** Optional preferred bypass side (-1 = curbside / -Z, +1 = building-side / +Z) when room permits. */
  preferredSide?: -1 | 1;
}

export interface NpcAgentFootprint {
  id: string;
  x: number;
  z: number;
  vx?: number;
  vz?: number;
  radius?: number;
}

export interface SpringState {
  value: number;
  velocity: number;
}

/**
 * Critically-damped spring integration (zero overshoot jitter, frame-rate independent).
 */
export function stepSpringScalar(
  state: SpringState,
  target: number,
  stiffness: number,
  damping: number,
  dt: number
): SpringState {
  const clampedDt = Math.min(Math.max(dt, 0), 0.05);
  const force = (target - state.value) * stiffness;
  const nextVel = (state.velocity + force * clampedDt) * Math.exp(-damping * clampedDt);
  const nextVal = state.value + nextVel * clampedDt;
  return { value: nextVal, velocity: nextVel };
}

export interface ArticulatedGaitInput {
  phase: number;
  speedNorm: number; // 0..1.5
  slopePitch?: number; // positive = uphill, negative = downhill
  lateralTurnRate?: number; // rad/s for subtle body banking
  isJogging?: boolean;
}

export interface ArticulatedGaitPose {
  pelvisBobY: number;
  pelvisRollZ: number;
  pelvisYawY: number;
  torsoPitchX: number;
  torsoYawY: number;
  torsoBankZ: number;
  leftHipX: number;
  rightHipX: number;
  leftKneeX: number;
  rightKneeX: number;
  leftAnkleX: number;
  rightAnkleX: number;
  leftShoulderX: number;
  rightShoulderX: number;
  leftElbowX: number;
  rightElbowX: number;
  secondaryBounce: number;
}

/**
 * Multi-joint articulated bipedal locomotion solver supporting flat walking, jogging,
 * uphill stair climbing (high leading knee lift + flat riser-clearing foot + forward torso lean),
 * downhill stair descent (trailing knee absorption + upright braced torso + cautious lower-step reach),
 * and smooth turn banking.
 *
 * Coordinate convention (Three.js right-handed, character facing +Z, legs hanging along -Y):
 *   - Hip X < 0 swings the thigh FORWARD (+Z); Hip X > 0 extends the thigh BACKWARD (-Z).
 *   - Knee X > 0 bends the shin BACKWARD (-Z) naturally at the knee hinge.
 */
export function computeArticulatedWalkGait(input: ArticulatedGaitInput): ArticulatedGaitPose {
  const spd = Math.max(0, Math.min(1.6, input.speedNorm));
  const slope = Math.max(-0.75, Math.min(0.75, input.slopePitch ?? 0));
  const turn = Math.max(-2.5, Math.min(2.5, input.lateralTurnRate ?? 0));
  const jogBoost = input.isJogging ? 1.35 : 1.0;

  const s = Math.sin(input.phase);
  const c = Math.cos(input.phase);
  // Normalize uphill / downhill stair factor cleanly into [0, 1]
  const uphill = Math.max(0, Math.min(1, slope / 0.42));
  const downhill = Math.max(0, Math.min(1, -slope / 0.42));
  const flatFactor = Math.max(0, 1 - uphill - downhill);

  // Swing progress: leftSwingLift peaks when left leg is travelling forward (c > 0), rightSwingLift on c < 0
  const leftSwingLift = Math.max(0, c);
  const rightSwingLift = Math.max(0, -c);
  // Forward placement: leftForward > 0 when left leg is in front of pelvis (s > 0)
  const leftForward = Math.max(0, s);
  const rightForward = Math.max(0, -s);
  // Trailing stance: leftBack > 0 when left leg is behind pelvis pushing off / lowering
  const leftBack = Math.max(0, -s);
  const rightBack = Math.max(0, s);

  // Double-frequency vertical pelvis bounce (grounded double-support dip, crisp rise on stair push-off)
  const pelvisBobY =
    (Math.abs(s) * 0.032 * jogBoost * flatFactor +
      uphill * (0.012 + Math.abs(s) * 0.022) +
      downhill * (-0.014 + Math.abs(c) * 0.016)) *
    spd;
  const pelvisRollZ = s * (0.034 + uphill * 0.018) * spd;
  const pelvisYawY = s * (0.065 + uphill * 0.018) * spd;

  // Uphill leans torso naturally forward over climbing knee; downhill stays upright/braced back
  const torsoPitchX =
    (0.045 * jogBoost * flatFactor + uphill * 0.21 - downhill * 0.09) * spd;
  const torsoYawY = -s * 0.082 * spd;
  const torsoBankZ = Math.max(-0.14, Math.min(0.14, -turn * 0.05 - s * 0.02 * spd));

  // --- HIP PITCH (negative X = thigh forward, positive X = thigh backward) ---
  const flatHipAmp = 0.46 * jogBoost;
  const leftHipFlat = -s * flatHipAmp;
  const rightHipFlat = s * flatHipAmp;

  // Uphill compact-stair climb: realistic forward thigh raise to clear ~0.21m riser, crisp push-off extension
  const leftHipUp = -leftForward * 0.54 - leftSwingLift * 0.36 + leftBack * 0.22;
  const rightHipUp = -rightForward * 0.54 - rightSwingLift * 0.36 + rightBack * 0.22;

  // Downhill compact-stair descent: controlled forward step reach and compact trailing leg
  const leftHipDown = -leftForward * 0.34 - leftSwingLift * 0.12 + leftBack * 0.16;
  const rightHipDown = -rightForward * 0.34 - rightSwingLift * 0.12 + rightBack * 0.16;

  const leftHipX = (leftHipFlat * flatFactor + leftHipUp * uphill + leftHipDown * downhill) * spd;
  const rightHipX = (rightHipFlat * flatFactor + rightHipUp * uphill + rightHipDown * downhill) * spd;

  // --- KNEE FLEXION (always >= 0; positive X bends shin backward cleanly) ---
  const leftKneeFlat = Math.max(0.08, leftSwingLift * 0.56 * jogBoost + leftForward * 0.1);
  const rightKneeFlat = Math.max(0.08, rightSwingLift * 0.56 * jogBoost + rightForward * 0.1);

  // Uphill: natural human stair knee tuck (+0.88 rad) while lifting foot over compact step lip, then straightening
  const leftKneeUp = Math.max(0.10, leftSwingLift * 0.88 + leftForward * 0.26);
  const rightKneeUp = Math.max(0.10, rightSwingLift * 0.88 + rightForward * 0.26);

  // Downhill: trailing stance knee bends smoothly to lower body onto the next lower tread,
  // while leading leg reaches down with cushioned shock-absorbing bend
  const leftKneeDown = 0.22 + leftBack * 0.52 + leftSwingLift * 0.32 + leftForward * 0.14;
  const rightKneeDown = 0.22 + rightBack * 0.52 + rightSwingLift * 0.32 + rightForward * 0.14;

  const leftKneeX = (leftKneeFlat * flatFactor + leftKneeUp * uphill + leftKneeDown * downhill) * spd;
  const rightKneeX = (rightKneeFlat * flatFactor + rightKneeUp * uphill + rightKneeDown * downhill) * spd;

  // --- ANKLE PITCH (keeps shoe horizontal over stair treads & rolls naturally on flat ground) ---
  const leftAnkleFlat = Math.max(-0.3, Math.min(0.32, s * 0.2 - leftSwingLift * 0.14));
  const rightAnkleFlat = Math.max(-0.3, Math.min(0.32, -s * 0.2 - rightSwingLift * 0.14));
  // On stairs, counter-pitch ankle against (hip + knee) so sole stays flat & clears step lip cleanly
  const leftAnkleUp = Math.max(-0.38, Math.min(0.34, -(leftHipUp + leftKneeUp) * 0.64));
  const rightAnkleUp = Math.max(-0.38, Math.min(0.34, -(rightHipUp + rightKneeUp) * 0.64));
  const leftAnkleDown = Math.max(-0.32, Math.min(0.38, leftForward * 0.22 - leftBack * 0.2));
  const rightAnkleDown = Math.max(-0.32, Math.min(0.38, rightForward * 0.22 - rightBack * 0.2));

  const leftAnkleX = (leftAnkleFlat * flatFactor + leftAnkleUp * uphill + leftAnkleDown * downhill) * spd;
  const rightAnkleX = (rightAnkleFlat * flatFactor + rightAnkleUp * uphill + rightAnkleDown * downhill) * spd;

  // --- COUNTER-SWINGING ARMS (left leg forward -> right arm forward = negative shoulder X) ---
  const armAmp = (0.42 + uphill * 0.14 - downhill * 0.12) * jogBoost * spd;
  const leftShoulderX = s * armAmp;
  const rightShoulderX = -s * armAmp;
  const baseElbow = input.isJogging ? -1.16 : uphill > 0.2 ? -0.44 : downhill > 0.2 ? -0.3 : -0.22;
  const leftElbowX = baseElbow - Math.max(0, -s) * (input.isJogging ? 0.15 : 0.24) * spd;
  const rightElbowX = baseElbow - Math.max(0, s) * (input.isJogging ? 0.15 : 0.24) * spd;

  // Secondary spring-like lag signal for hair/ponytails/backpacks/scarves
  const secondaryBounce = Math.sin(input.phase * 2 - 0.65) * 0.04 * spd * jogBoost;

  return {
    pelvisBobY,
    pelvisRollZ,
    pelvisYawY,
    torsoPitchX,
    torsoYawY,
    torsoBankZ,
    leftHipX,
    rightHipX,
    leftKneeX,
    rightKneeX,
    leftAnkleX,
    rightAnkleX,
    leftShoulderX,
    rightShoulderX,
    leftElbowX,
    rightElbowX,
    secondaryBounce,
  };
}

/**
 * Returns static circular obstacle footprints (trees, streetlights, benches, planters, parked Miata,
 * signposts) across both near and far sidewalks so passersby & overlook NPCs glide cleanly around them
 * without blocking narrow curb corridors.
 */
export const TITLE_MIATA_PARKED_TRANSFORM = {
  x: -3.55,
  z: -8.68,
  rotationY: 1.36,
} as const;

/**
 * 3-circle composite capsule tightly hugging the parked 1990 Mazda Miata along its true 1.36 rad
 * Title Screen heading (rear bumper, cabin center, front pop-up headlight nose).
 * Sets `preferredSide: -1` so near-sidewalk pedestrians smoothly walk around the Miata curbside.
 */
export function getTitleScreenMiataObstacles(): StaticObstacleCircle[] {
  const { x, z, rotationY } = TITLE_MIATA_PARKED_TRANSFORM;
  const fwdX = Math.sin(rotationY);
  const fwdZ = Math.cos(rotationY);
  return [
    { id: 'miata-rear', x: x - fwdX * 1.28, z: z - fwdZ * 1.28, radius: 0.94, preferredSide: -1 },
    { id: 'miata-mid', x, z, radius: 0.96, preferredSide: -1 },
    { id: 'miata-front', x: x + fwdX * 1.28, z: z + fwdZ * 1.28, radius: 0.94, preferredSide: -1 },
  ];
}

export function getSceneryStaticObstacles(
  sceneryId: SceneryId,
  isMiataParkedOutside: boolean
): StaticObstacleCircle[] {
  const obs: StaticObstacleCircle[] = [
    // Cafe flanking cedar planters (hugging storefront at z = -6.95)
    { id: 'planter-w1', x: -4.6, z: -6.95, radius: 0.56 },
    { id: 'planter-w2', x: -3.2, z: -6.95, radius: 0.56 },
    { id: 'planter-e1', x: 0.85, z: -6.95, radius: 0.56 },
    { id: 'planter-e2', x: 2.55, z: -6.95, radius: 0.56 },
    // Curb streetlamps on near sidewalk edge (z = -9.05)
    { id: 'lamp-w', x: -5.4, z: -9.05, radius: 0.42 },
    { id: 'lamp-m', x: 0.55, z: -9.05, radius: 0.42 },
    { id: 'lamp-e', x: 5.8, z: -9.05, radius: 0.42 },
    // Far-sidewalk street furniture / utility poles & trees
    { id: 'far-lamp-w', x: -11.0, z: -17.95, radius: 0.48 },
    { id: 'far-lamp-e', x: 1.5, z: -17.95, radius: 0.48 },
    { id: 'far-tree-w', x: -16.8, z: -17.65, radius: 0.62 },
    { id: 'far-tree-e', x: 13.6, z: -17.65, radius: 0.62 },
  ];

  if (isMiataParkedOutside) {
    obs.push(...getTitleScreenMiataObstacles());
  }

  if (sceneryId === 'brazilian_favela') {
    // Respect the street dancer's plaza performance circle at (-1.6, -16.85) + utility poles
    obs.push(
      { id: 'favela-dancer-stage', x: -1.6, z: -16.95, radius: 1.05 },
      { id: 'favela-pole-far-w', x: -22.0, z: -17.9, radius: 0.48 }
    );
  } else if (
    sceneryId === 'japanese_tranquility' ||
    sceneryId === 'eiffel_tower' ||
    sceneryId === 'busy_street'
  ) {
    obs.push(
      { id: 'promenade-bench-w', x: -8.2, z: -17.55, radius: 0.62 },
      { id: 'promenade-bench-e', x: 8.6, z: -17.55, radius: 0.62 }
    );
  } else if (sceneryId === 'mt_everest') {
    obs.push(
      { id: 'everest-cairn-w', x: -7.5, z: -14.3, radius: 0.68 },
      { id: 'everest-cairn-e', x: 7.2, z: -14.3, radius: 0.68 }
    );
  }

  return obs;
}

export interface SteeringResult {
  avoidZOffset: number;
  speedScale: number;
  /** Always 0: forward-monotonic sidewalk steering never pushes NPCs backward or stalls them in place. */
  lateralPushX: number;
  lateralPushZ: number;
  /** Committed lateral avoidance side (-1 or +1, or 0 when path is clear) for zero-jitter hysteresis. */
  chosenAvoidSide: -1 | 0 | 1;
}

/**
 * Forward-monotonic spatial steering & personal-space separation solver for outdoor & title-screen NPCs.
 * Uses predictive lookahead + sticky lateral side-commitment hysteresis so walkers glide cleanly around
 * street props, the parked Miata, and oncoming NPCs without ever stalling, reversing, or oscillating.
 */
export function computeCrowdAndObstacleSteering(params: {
  selfId: string;
  x: number;
  z: number;
  dir: 1 | -1;
  baseLaneZ: number;
  minZ: number;
  maxZ: number;
  selfRadius?: number;
  preferredAvoidSide?: -1 | 0 | 1;
  obstacles: readonly StaticObstacleCircle[];
  neighbors: readonly NpcAgentFootprint[];
}): SteeringResult {
  const { selfId, x, z, dir, baseLaneZ, minZ, maxZ, obstacles, neighbors } = params;
  const selfR = params.selfRadius ?? 0.34;
  const prevSide = params.preferredAvoidSide ?? 0;

  let desiredZShift = 0;
  let speedScale = 1.0;
  let strongSide: -1 | 0 | 1 = 0;
  let strongWeight = 0;

  // 1. Predictive static obstacle steering (pure lateral lane arc, NEVER stalls X progress!)
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const ahead = (obs.x - x) * dir;
    const lookahead = obs.radius + selfR + 2.35;
    // Ignore obstacles well behind or far ahead
    if (ahead < -(obs.radius + 0.65) || ahead > lookahead) continue;

    const clearanceZ = obs.radius + selfR + 0.36;
    const dz = baseLaneZ - obs.z;
    // Only steer if the obstacle actually intrudes on our walking lane
    if (Math.abs(dz) >= clearanceZ + 0.45) continue;

    // Smooth longitudinal bell envelope peaking while alongside the obstacle
    let longWeight = 1.0;
    if (ahead > obs.radius + 0.25) {
      const t = 1 - (ahead - (obs.radius + 0.25)) / Math.max(0.2, lookahead - (obs.radius + 0.25));
      const c = Math.max(0, Math.min(1, t));
      longWeight = c * c * (3 - 2 * c);
    } else if (ahead < -(obs.radius * 0.25)) {
      const t = 1 - (-(obs.radius * 0.25) - ahead) / Math.max(0.2, obs.radius * 0.75 + 0.65);
      const c = Math.max(0, Math.min(1, t));
      longWeight = c * c * (3 - 2 * c);
    }

    // Choose which side of the obstacle has strictly more open walkway room within [minZ, maxZ],
    // honoring obstacle-specific curbside routing (e.g., parked Title Screen Miata -> preferredSide: -1)
    const posTargetZ = obs.z + clearanceZ;
    const negTargetZ = obs.z - clearanceZ;
    const posFits = posTargetZ <= maxZ - 0.04;
    const negFits = negTargetZ >= minZ + 0.04;

    let sideSign: -1 | 1;
    if (obs.preferredSide === -1 && negFits) {
      sideSign = -1;
    } else if (obs.preferredSide === 1 && posFits) {
      sideSign = 1;
    } else if (posFits && !negFits) {
      sideSign = 1;
    } else if (negFits && !posFits) {
      sideSign = -1;
    } else if (prevSide !== 0) {
      // Hysteresis: keep committed side while passing so walker never twitches left/right!
      sideSign = prevSide;
    } else {
      sideSign = dz >= 0 ? 1 : -1;
    }

    const goalZForObs = Math.max(minZ, Math.min(maxZ, obs.z + sideSign * clearanceZ));
    const neededShift = (goalZForObs - baseLaneZ) * longWeight;
    if (obs.preferredSide !== undefined && longWeight > 0.15) {
      // Strong curbside priority for large hero obstacles like the parked Miata so smaller lamps never push walkers into the car
      if (Math.abs(neededShift) >= Math.abs(desiredZShift) * 0.65) {
        desiredZShift = neededShift;
      }
    } else if (Math.abs(neededShift) > Math.abs(desiredZShift)) {
      desiredZShift = neededShift;
    } else {
      desiredZShift += neededShift * 0.35;
    }
    if (longWeight > strongWeight) {
      strongWeight = longWeight;
      strongSide = sideSign;
    }
  }

  // 2. Dynamic NPC-to-NPC personal-space separation & right-hand oncoming pass courtesy
  for (let i = 0; i < neighbors.length; i++) {
    const nb = neighbors[i];
    if (nb.id === selfId) continue;
    const nbR = nb.radius ?? 0.36;
    const dx = x - nb.x;
    const dz = z - nb.z;
    const ahead = (nb.x - x) * dir;
    const dist = Math.hypot(dx, dz);
    const personalR = selfR + nbR + 1.45;
    if (dist >= personalR || ahead < -0.75 || ahead > 2.8) continue;

    const isOncoming = nb.vx !== undefined && nb.vx * dir < -0.1;
    const isSameDirAhead =
      nb.vx !== undefined && nb.vx * dir > 0.1 && ahead > 0.05 && ahead < 1.8 && Math.abs(dz) < 0.65;

    if (isSameDirAhead) {
      // Smoothly yield pace slightly without ever freezing (floor 0.78)
      speedScale = Math.min(speedScale, 0.78);
    }

    const prox = 1 - dist / personalR;
    const weight = prox * prox * (3 - 2 * prox);

    // Deterministic right-hand passing convention (Eastbound +1 shifts toward +Z, Westbound -1 toward -Z)
    let sideSign: -1 | 1 = isOncoming
      ? dir === 1
        ? 1
        : -1
      : prevSide !== 0
      ? prevSide
      : dz >= 0
      ? 1
      : -1;

    const passOffset = isOncoming ? 0.68 : 0.46;
    const candidateZ = baseLaneZ + desiredZShift + sideSign * weight * passOffset;
    if (candidateZ > maxZ - 0.05) sideSign = -1;
    else if (candidateZ < minZ + 0.05) sideSign = 1;

    desiredZShift += sideSign * weight * passOffset;
    if (weight > strongWeight) {
      strongWeight = weight;
      strongSide = sideSign;
    }
  }

  const clampedTargetZ = Math.max(minZ, Math.min(maxZ, baseLaneZ + desiredZShift));
  return {
    avoidZOffset: clampedTargetZ - baseLaneZ,
    speedScale,
    // Forward-monotonic: never push NPCs backward along X so they can never get stuck!
    lateralPushX: 0,
    lateralPushZ: 0,
    chosenAvoidSide: strongWeight > 0.08 ? strongSide : 0,
  };
}

/**
 * Multi-segment catenary/spring leash solver connecting the walker's hand to the dog's collar.
 * Produces natural gravity sag when slack and pulls smoothly taut as distance approaches `leashRestLength`.
 */
export function computeCatenaryLeashPoints(
  handPos: Vec3Point,
  collarPos: Vec3Point,
  segments = 7,
  leashRestLength = 1.05,
  swayPhase = 0
): Vec3Point[] {
  const count = Math.max(2, segments);
  const dx = collarPos.x - handPos.x;
  const dy = collarPos.y - handPos.y;
  const dz = collarPos.z - handPos.z;
  const chordDist = Math.hypot(dx, dy, dz);
  const slack = Math.max(0, leashRestLength - chordDist);
  // Natural parabolic catenary sag proportional to sqrt(slack), gently swaying with gait
  const maxSag = Math.min(0.28, Math.sqrt(slack * 0.14) + 0.018);
  const lateralSway = Math.sin(swayPhase) * Math.min(0.035, maxSag * 0.25);

  const pts: Vec3Point[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const sagCurve = 4 * t * (1 - t); // 0 at endpoints, 1 at midpoint
    pts.push({
      x: handPos.x + dx * t + lateralSway * sagCurve,
      y: Math.max(0.08, handPos.y + dy * t - maxSag * sagCurve),
      z: handPos.z + dz * t,
    });
  }
  return pts;
}

export interface SculptedDogRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headPivot: THREE.Group;
  tailPivot: THREE.Group;
  legs: THREE.Group[]; // [frontLeft, frontRight, backLeft, backRight]
  leashSegments: THREE.Mesh[];
  collarLocalAnchor: THREE.Vector3;
}

const _leashUp = new THREE.Vector3(0, 1, 0);
const _leashDir = new THREE.Vector3();

/**
 * Builds a charming, sculpted articulated companion dog (rounded ribcage, haunches, contoured
 * head & snout, glossy nose, expressive eyes, breed-styled ears, leather collar + brass tag,
 * 4 hinged trotting legs with paws, wagging tapered tail, and a 6-segment physics catenary leash).
 */
export function buildSculptedDogRig(
  breedIdx: number,
  furHex: number,
  collarHex = 0xdc2626
): SculptedDogRig {
  const root = new THREE.Group();
  const furMat = new THREE.MeshStandardMaterial({ color: furHex, roughness: 0.84 });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(furHex).lerp(new THREE.Color(0xf8efe0), 0.42),
    roughness: 0.88,
  });
  const earMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(furHex).multiplyScalar(0.76),
    roughness: 0.86,
  });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.22, metalness: 0.1 });
  const collarMat = new THREE.MeshStandardMaterial({ color: collarHex, roughness: 0.55 });
  const brassTagMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.22 });
  const leashMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.65 });

  // Dog positioned beside & slightly ahead of walker (+0.32 X, +0.76 Z in walker space)
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0.32, 0.24, 0.76);
  root.add(bodyGroup);

  // Rounded capsule ribcage & chest + softer underbelly
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.22, 6, 12), furMat);
  torso.rotation.x = Math.PI / 2;
  torso.scale.set(0.95, 1.0, 1.05);
  bodyGroup.add(torso);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.092, 10, 8), bellyMat);
  chest.scale.set(0.88, 0.96, 1.04);
  chest.position.set(0, -0.008, 0.11);
  bodyGroup.add(chest);

  const rump = new THREE.Mesh(new THREE.SphereGeometry(0.086, 10, 8), furMat);
  rump.scale.set(0.9, 0.96, 1.0);
  rump.position.set(0, 0.004, -0.11);
  bodyGroup.add(rump);

  // Leather collar + shiny brass ID tag
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.013, 6, 14), collarMat);
  collar.rotation.x = Math.PI / 2 + 0.35;
  collar.position.set(0, 0.055, 0.165);
  bodyGroup.add(collar);

  const idTag = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.005, 8), brassTagMat);
  idTag.rotation.x = Math.PI / 2;
  idTag.position.set(0, 0.012, 0.228);
  bodyGroup.add(idTag);

  // Articulated Head Pivot (sniffs & glances while trotting!)
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.075, 0.185);
  bodyGroup.add(headPivot);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.064, 0.09, 8), furMat);
  neck.rotation.x = 0.35;
  neck.position.set(0, 0.01, -0.01);
  headPivot.add(neck);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), furMat);
  skull.scale.set(0.94, 0.92, 1.05);
  skull.position.set(0, 0.055, 0.03);
  headPivot.add(skull);

  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.055, 6, 10), bellyMat);
  snout.rotation.x = Math.PI / 2;
  snout.scale.set(1.05, 1.0, 0.84);
  snout.position.set(0, 0.032, 0.115);
  headPivot.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), noseMat);
  nose.scale.set(1.15, 0.85, 0.9);
  nose.position.set(0, 0.044, 0.16);
  headPivot.add(nose);

  [-0.034, 0.034].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), noseMat);
    eye.position.set(ex, 0.074, 0.098);
    headPivot.add(eye);
  });

  // Breed-varied sculpted ears (floppy retriever ears vs perky corgi/shiba ears)
  const floppyEars = breedIdx % 2 === 0;
  [-0.068, 0.068].forEach((ex) => {
    if (floppyEars) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.055, 4, 8), earMat);
      ear.scale.set(0.65, 1.0, 1.2);
      ear.position.set(ex, 0.038, 0.02);
      ear.rotation.z = ex < 0 ? 0.28 : -0.28;
      ear.rotation.x = 0.18;
      headPivot.add(ear);
    } else {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.075, 7), earMat);
      ear.position.set(ex * 0.78, 0.135, 0.01);
      ear.rotation.z = ex < 0 ? 0.22 : -0.22;
      headPivot.add(ear);
    }
  });

  // Wagging tapered tail pivot
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.045, -0.175);
  tailPivot.rotation.x = -0.62;
  bodyGroup.add(tailPivot);

  const tailMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.019, 0.13, 4, 8), earMat);
  tailMesh.position.set(0, 0.07, -0.02);
  tailPivot.add(tailMesh);

  // 4 Articulated Legs with rounded paws
  const legs: THREE.Group[] = [];
  const legOffsets: Array<[number, number]> = [
    [-0.055, 0.115], // front left
    [0.055, 0.115],  // front right
    [-0.055, -0.115], // back left
    [0.055, -0.115],  // back right
  ];
  for (const [lx, lz] of legOffsets) {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, -0.04, lz);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.085, 4, 8), furMat);
    upper.position.y = -0.055;
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.019, 0.075, 4, 8), bellyMat);
    lower.position.y = -0.13;
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), bellyMat);
    paw.scale.set(0.95, 0.65, 1.32);
    paw.position.set(0, -0.185, 0.014);
    legPivot.add(upper, lower, paw);
    bodyGroup.add(legPivot);
    legs.push(legPivot);
  }

  // 6-segment multi-segment physics catenary leash
  const segCount = 6;
  const segGeo = new THREE.CylinderGeometry(0.0065, 0.0065, 1.0, 5);
  const leashSegments: THREE.Mesh[] = [];
  for (let i = 0; i < segCount; i++) {
    const seg = new THREE.Mesh(segGeo, leashMat);
    root.add(seg);
    leashSegments.push(seg);
  }

  return {
    root,
    bodyGroup,
    headPivot,
    tailPivot,
    legs,
    leashSegments,
    collarLocalAnchor: new THREE.Vector3(0.32, 0.30, 0.93),
  };
}

/**
 * Updates the sculpted dog's trot gait, head sniffing, tail wag, and multi-segment catenary leash
 * stretched physically between the walker's right hand position and the dog's moving collar.
 */
export function updateSculptedDogAndLeash(
  dog: SculptedDogRig,
  handLocalPos: Vec3Point,
  elapsed: number,
  seed: number,
  speedNorm: number
): void {
  const trot = elapsed * (10.5 * Math.max(0.55, speedNorm)) + seed * 1.7;
  const stride = Math.sin(trot) * 0.56 * Math.min(1.2, speedNorm);
  dog.legs[0].rotation.x = stride;
  dog.legs[3].rotation.x = stride;
  dog.legs[1].rotation.x = -stride;
  dog.legs[2].rotation.x = -stride;

  const bounce = Math.abs(Math.sin(trot)) * 0.026 * Math.min(1.2, speedNorm);
  const swayZ = Math.sin(trot * 0.5) * 0.04;
  dog.bodyGroup.position.set(0.32 + Math.sin(elapsed * 1.4 + seed) * 0.025, 0.24 + bounce, 0.76 + swayZ);
  dog.bodyGroup.rotation.z = Math.sin(trot) * 0.04;
  dog.headPivot.rotation.y = Math.sin(elapsed * 1.9 + seed) * 0.24;
  dog.headPivot.rotation.x = 0.06 + Math.sin(elapsed * 3.1 + seed) * 0.08;
  dog.tailPivot.rotation.z = Math.sin(elapsed * 13.5 + seed) * 0.46;

  const collarPos: Vec3Point = {
    x: dog.bodyGroup.position.x,
    y: dog.bodyGroup.position.y + 0.06,
    z: dog.bodyGroup.position.z + 0.165,
  };

  const pts = computeCatenaryLeashPoints(
    handLocalPos,
    collarPos,
    dog.leashSegments.length,
    1.04,
    elapsed * 3.8 + seed
  );

  for (let i = 0; i < dog.leashSegments.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const seg = dog.leashSegments[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const len = Math.max(0.005, Math.hypot(dx, dy, dz));
    seg.position.set((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
    seg.scale.set(1, len, 1);
    _leashDir.set(dx / len, dy / len, dz / len);
    seg.quaternion.setFromUnitVectors(_leashUp, _leashDir);
  }
}

export interface LoungeTableBox {
  id: number;
  x: number;
  z: number;
  radius: number;
  seats: ReadonlyArray<{ x: number; z: number; facingRotY: number }>;
}

/**
 * Generates guaranteed chair-safe, table-safe exit waypoints for any indoor patron leaving
 * from a lounge chair, selfie spot, or queue position so they NEVER clip into chairs or get stuck.
 */
export function buildChairSafeExitWaypoints(params: {
  from: Vec2XZ;
  goal: Vec2XZ;
  seatExitOrigin: Vec2XZ | null;
  tables: readonly LoungeTableBox[];
  egressLaneX: number;
  doorX: number;
  corridorZ?: number;
  centerAisleZ?: number;
}): Vec2XZ[] {
  const { from, goal, seatExitOrigin, tables, doorX } = params;
  const centerAisleZ = params.centerAisleZ ?? -3.65;
  // Unobstructed west vertical lane (x = -0.82 stays >= 0.97m clear of Table 0 at x=0.15 and >= 1.37m clear of Table 2 at x=0.55)
  const safeWestLaneX = -0.82;
  const pts: Vec2XZ[] = [];

  // 1. Exiting from a seated dining chair: step outward from chair -> enter unobstructed middle aisle -> west egress lane -> door
  if (seatExitOrigin) {
    let nearestTable = tables[0];
    let minD = Infinity;
    for (let i = 0; i < tables.length; i++) {
      const tbl = tables[i];
      const d = Math.hypot(seatExitOrigin.x - tbl.x, seatExitOrigin.z - tbl.z);
      if (d < minD) {
        minD = d;
        nearestTable = tbl;
      }
    }

    const outDirX = seatExitOrigin.x < nearestTable.x ? -1 : 1;
    const clearX = seatExitOrigin.x + outDirX * 0.28;

    // Fast unobstructed direct west exit if seated on the far-west side of a back-row table
    if (clearX <= -0.35 && seatExitOrigin.z <= -4.3) {
      pts.push({ x: clearX, z: seatExitOrigin.z });
      pts.push({ x: safeWestLaneX, z: seatExitOrigin.z });
      pts.push({ x: safeWestLaneX, z: -4.95 });
    } else {
      pts.push({ x: clearX, z: seatExitOrigin.z });
      pts.push({ x: clearX, z: centerAisleZ });
      if (Math.abs(clearX - safeWestLaneX) > 0.12) {
        pts.push({ x: safeWestLaneX, z: centerAisleZ });
      }
      pts.push({ x: safeWestLaneX, z: -4.95 });
    }
  } else if (from.z > -4.85) {
    // Standing inside the cafe (pickup counter, queue, selfie spot, or lounge band)
    if (from.x > -0.35) {
      pts.push({ x: from.x, z: centerAisleZ });
      pts.push({ x: safeWestLaneX, z: centerAisleZ });
    } else if (Math.abs(from.x - safeWestLaneX) > 0.18) {
      pts.push({ x: safeWestLaneX, z: from.z });
    }
    pts.push({ x: safeWestLaneX, z: -4.95 });
  }

  pts.push({ x: doorX, z: -5.15 });
  pts.push({ x: doorX, z: -7.45 });
  pts.push({ x: goal.x, z: goal.z });
  return pts;
}

/**
 * Selects an open lounge seat that evenly distributes dine-in customers across ALL lounge tables
 * (prioritizing completely unoccupied tables first, then rotating/spreading across open chairs)
 * instead of greedily reusing seat 0 on Table 0.
 */
export function selectSpreadLoungeSeat(
  occupiedSeatIndices: ReadonlySet<number>,
  totalSeats: number,
  seatsPerTable = 2,
  rng: () => number = Math.random
): number | null {
  const openSeats: number[] = [];
  for (let i = 0; i < totalSeats; i++) {
    if (!occupiedSeatIndices.has(i)) openSeats.push(i);
  }
  if (openSeats.length === 0) return null;

  // Count how many patrons are already seated at each table
  const tableOccupancy = new Map<number, number>();
  const numTables = Math.max(1, Math.ceil(totalSeats / seatsPerTable));
  for (let t = 0; t < numTables; t++) tableOccupancy.set(t, 0);
  occupiedSeatIndices.forEach((seatIdx) => {
    const t = Math.floor(seatIdx / seatsPerTable);
    tableOccupancy.set(t, (tableOccupancy.get(t) ?? 0) + 1);
  });

  // Find minimum occupancy among tables that still have an open seat
  let minOcc = Infinity;
  for (const s of openSeats) {
    const occ = tableOccupancy.get(Math.floor(s / seatsPerTable)) ?? 0;
    if (occ < minOcc) minOcc = occ;
  }

  const preferredSeats = openSeats.filter(
    (s) => (tableOccupancy.get(Math.floor(s / seatsPerTable)) ?? 0) === minOcc
  );
  const pickIdx = Math.floor(Math.max(0, Math.min(0.999999, rng())) * preferredSeats.length);
  return preferredSeats[pickIdx] ?? openSeats[0];
}

/**
 * Returns a realistic randomized dine-in stay duration strictly between 35 and 60 seconds
 * so the cafe lounge stays lively across multiple tables.
 */
export function rollDineInStaySeconds(rng: () => number = Math.random): number {
  const u = Math.max(0, Math.min(1, rng()));
  return Math.round((35 + u * 25) * 10) / 10;
}
