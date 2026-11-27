import * as THREE from 'three';
import { applyPatronOutfitToRig, type PatronRigTargets } from './patronOutfits3d';
import type { ClimateState, PatronOutfitId } from './sceneryData';
import { computeArticulatedWalkGait } from './npcPhysicsAndSteering';

export type OutdoorNpcPoseMode =
  | 'walk'
  | 'idle_browse'
  | 'photo_pose'
  | 'buddy_pose'
  | 'bench_sit'
  | 'picnic_sit'
  | 'campfire_warm'
  | 'vendor_tend'
  | 'cycling';

export interface ArticulatedOutdoorNpcOptions {
  shirtHex: number;
  pantsHex: number;
  skinHex?: number;
  hairHex?: number;
  shoeHex?: number;
  hairStyle?: 'short' | 'bun' | 'bob';
  isKimono?: boolean;
  obiHex?: number;
  apronHex?: number;
  collarNeonHex?: number;
  isSecretNpc?: boolean;
  outfitId?: PatronOutfitId | null;
  climate?: ClimateState;
  seed?: number;
}

export interface ArticulatedOutdoorNpcSlots {
  headwear: THREE.Group;
  backProp: THREE.Group;
  leftHandProp: THREE.Group;
  rightHandProp: THREE.Group;
}

export interface ArticulatedOutdoorNpcRig {
  root: THREE.Group;
  pelvisPivot: THREE.Group;
  torsoGroup: THREE.Group;
  neckJoint: THREE.Group;
  headPivot: THREE.Group;
  leftShoulderPivot: THREE.Group;
  leftElbowPivot: THREE.Group;
  rightShoulderPivot: THREE.Group;
  rightElbowPivot: THREE.Group;
  leftHipPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  rightHipPivot: THREE.Group;
  rightKneePivot: THREE.Group;
  slots: ArticulatedOutdoorNpcSlots;
  patronTargets: PatronRigTargets;
}

export interface OutdoorNpcPoseState {
  mode: OutdoorNpcPoseMode;
  elapsed: number;
  phase: number;
  speed?: number;
  crankAngle?: number;
  holdingLeftProp?: boolean;
  lookUpPitch?: number;
}

// Shared smooth low-poly geometries (8-10 radial segments) to avoid boxy "Minecraft" limbs
const SHARED_PELVIS_GEO = new THREE.CapsuleGeometry(0.145, 0.1, 4, 8);
const SHARED_TORSO_GEO = new THREE.CapsuleGeometry(0.175, 0.28, 5, 10);
const SHARED_KIMONO_SKIRT_GEO = new THREE.CylinderGeometry(0.175, 0.235, 0.84, 10);
const SHARED_OBI_GEO = new THREE.CylinderGeometry(0.195, 0.195, 0.2, 10);
const SHARED_NECK_GEO = new THREE.CylinderGeometry(0.052, 0.06, 0.1, 8);
const SHARED_HEAD_GEO = new THREE.SphereGeometry(0.142, 10, 9);
const SHARED_EYE_GEO = new THREE.SphereGeometry(0.015, 6, 5);
const SHARED_HAIR_CAP_GEO = new THREE.SphereGeometry(0.15, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.58);
const SHARED_HAIR_BUN_GEO = new THREE.SphereGeometry(0.075, 8, 7);
const SHARED_SHOULDER_CAP_GEO = new THREE.SphereGeometry(0.062, 7, 6);
const SHARED_UPPER_ARM_GEO = new THREE.CapsuleGeometry(0.048, 0.17, 4, 8);
const SHARED_FOREARM_GEO = new THREE.CapsuleGeometry(0.04, 0.17, 4, 8);
const SHARED_HAND_GEO = new THREE.SphereGeometry(0.044, 7, 6);
const SHARED_THIGH_GEO = new THREE.CapsuleGeometry(0.064, 0.24, 4, 8);
const SHARED_CALF_GEO = new THREE.CapsuleGeometry(0.052, 0.25, 4, 8);
const SHARED_SHOE_GEO = new THREE.CapsuleGeometry(0.05, 0.1, 4, 7);
const SHARED_EYE_MAT = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.25 });

/**
 * Unified full-detail articulated outdoor NPC rig with strict bone-parented slots
 * (`headwear`, `backProp`, `leftHandProp`, `rightHandProp`) so accessories never detach.
 */
export function createArticulatedOutdoorNpc(
  options: ArticulatedOutdoorNpcOptions
): ArticulatedOutdoorNpcRig {
  const root = new THREE.Group();
  root.userData.outdoorOnly = true;
  root.userData.noMerge = true;
  root.userData.skipStaticBatch = true;
  if (options.isSecretNpc) root.userData.isSecretNpc = true;

  const jacketMat = new THREE.MeshStandardMaterial({ color: options.shirtHex, roughness: 0.76 });
  const denimMat = new THREE.MeshStandardMaterial({ color: options.pantsHex, roughness: 0.84 });
  const skinMat = new THREE.MeshStandardMaterial({
    color: options.skinHex ?? 0xe4b89c,
    roughness: 0.68,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: options.hairHex ?? 0x1c1917,
    roughness: 0.85,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: options.shoeHex ?? 0x1f2937,
    roughness: 0.72,
  });

  // Pelvis pivot sits at hip height (0.76) so subtle walk bob lifts the whole upper & lower body cohesively
  const pelvisPivot = new THREE.Group();
  pelvisPivot.position.set(0, 0.76, 0);
  if (options.isSecretNpc) pelvisPivot.userData.isSecretNpc = true;
  root.add(pelvisPivot);

  const pelvisMesh = new THREE.Mesh(SHARED_PELVIS_GEO, denimMat);
  pelvisMesh.rotation.z = Math.PI / 2;
  pelvisMesh.scale.set(0.75, 1.08, 0.75);
  pelvisPivot.add(pelvisMesh);

  // Tapered rounded torso group (compatible with PatronRigTargets)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.04, 0);
  if (options.isSecretNpc) torsoGroup.userData.isSecretNpc = true;
  pelvisPivot.add(torsoGroup);

  const torsoMesh = new THREE.Mesh(SHARED_TORSO_GEO, jacketMat);
  torsoMesh.position.y = 0.26;
  torsoMesh.scale.set(1.06, 1.0, 0.72);
  torsoGroup.add(torsoMesh);

  if (options.apronHex !== undefined) {
    const apronMat = new THREE.MeshStandardMaterial({ color: options.apronHex, roughness: 0.85 });
    const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.56, 10, 1, true, -1.1, 2.2), apronMat);
    apron.position.set(0, 0.06, 0.02);
    torsoGroup.add(apron);
  }

  if (options.collarNeonHex !== undefined) {
    const neonMat = new THREE.MeshBasicMaterial({ color: options.collarNeonHex });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 6, 14), neonMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.49, 0);
    torsoGroup.add(collar);
  }

  if (options.isKimono) {
    const skirt = new THREE.Mesh(SHARED_KIMONO_SKIRT_GEO, jacketMat);
    skirt.position.y = -0.26;
    pelvisPivot.add(skirt);
    const obiMat = new THREE.MeshStandardMaterial({
      color: options.obiHex ?? 0xfef08a,
      roughness: 0.68,
    });
    const obi = new THREE.Mesh(SHARED_OBI_GEO, obiMat);
    obi.position.y = 0.14;
    const obiBow = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.12, 4, 7), obiMat);
    obiBow.rotation.z = Math.PI / 2;
    obiBow.position.set(0, 0.14, -0.17);
    torsoGroup.add(obi, obiBow);
  }

  // Strict bone-parented backProp slot (tourist backpack rides rigidly with torso)
  const backProp = new THREE.Group();
  backProp.position.set(0, 0.28, -0.16);
  torsoGroup.add(backProp);

  // Neck -> HeadPivot -> Head + Eyes + Hair + Headwear Slot
  const neckJoint = new THREE.Group();
  neckJoint.position.set(0, 0.53, 0);
  torsoGroup.add(neckJoint);

  const neckMesh = new THREE.Mesh(SHARED_NECK_GEO, skinMat);
  neckMesh.position.y = 0.04;
  neckJoint.add(neckMesh);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.09, 0);
  neckJoint.add(headPivot);

  const headMesh = new THREE.Mesh(SHARED_HEAD_GEO, skinMat);
  headMesh.position.y = 0.12;
  headPivot.add(headMesh);

  [-0.048, 0.048].forEach((ex) => {
    const eye = new THREE.Mesh(SHARED_EYE_GEO, SHARED_EYE_MAT);
    eye.position.set(ex, 0.135, 0.128);
    headPivot.add(eye);
  });

  const hairCap = new THREE.Mesh(SHARED_HAIR_CAP_GEO, hairMat);
  hairCap.position.set(0, 0.132, -0.012);
  headPivot.add(hairCap);
  if (options.hairStyle === 'bun') {
    const bun = new THREE.Mesh(SHARED_HAIR_BUN_GEO, hairMat);
    bun.position.set(0, 0.23, -0.11);
    headPivot.add(bun);
  } else if (options.hairStyle === 'bob') {
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.146, 9, 6, 0, Math.PI * 2, 0.3, Math.PI * 0.6), hairMat);
    bob.position.set(0, 0.11, -0.025);
    headPivot.add(bob);
  }

  const headwear = new THREE.Group();
  headwear.position.set(0, 0.24, 0);
  headPivot.add(headwear);

  // Articulated 2-bone Arms (Shoulder -> UpperArm -> Elbow -> Forearm -> HandSlot)
  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.215, 0.45, 0);
    torsoGroup.add(shoulder);

    const cap = new THREE.Mesh(SHARED_SHOULDER_CAP_GEO, jacketMat);
    const upper = new THREE.Mesh(SHARED_UPPER_ARM_GEO, jacketMat);
    upper.position.y = -0.13;
    shoulder.add(cap, upper);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.25, 0);
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(SHARED_FOREARM_GEO, options.isKimono ? jacketMat : skinMat);
    forearm.position.y = -0.12;
    const hand = new THREE.Mesh(SHARED_HAND_GEO, skinMat);
    hand.position.y = -0.24;
    elbow.add(forearm, hand);

    const handSlot = new THREE.Group();
    handSlot.position.set(0, -0.24, 0.03);
    elbow.add(handSlot);

    return { shoulder, elbow, handSlot };
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Articulated 2-bone Legs (Hip -> Thigh -> Knee -> Calf -> Shoe)
  const makeLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.095, -0.02, 0);
    pelvisPivot.add(hip);

    const thigh = new THREE.Mesh(SHARED_THIGH_GEO, denimMat);
    thigh.position.y = -0.18;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.35, 0);
    hip.add(knee);

    const calf = new THREE.Mesh(SHARED_CALF_GEO, denimMat);
    calf.position.y = -0.18;
    const shoe = new THREE.Mesh(SHARED_SHOE_GEO, shoeMat);
    shoe.rotation.x = Math.PI / 2;
    shoe.position.set(0, -0.34, 0.045);
    knee.add(calf, shoe);

    return { hip, knee };
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  const patronTargets: PatronRigTargets = {
    root,
    isSecretNpc: options.isSecretNpc,
    pelvisGroup: pelvisPivot,
    torsoGroup,
    neckJoint,
    leftHipJoint: leftLeg.hip,
    rightHipJoint: rightLeg.hip,
    leftKneeJoint: leftLeg.knee,
    rightKneeJoint: rightLeg.knee,
    jacketMat,
    denimMat,
    shoeMat,
    skinMat,
  };

  if (options.outfitId && !options.isSecretNpc) {
    applyPatronOutfitToRig(patronTargets, options.outfitId, options.climate ?? 'summer', options.seed ?? 1);
  }

  return {
    root,
    pelvisPivot,
    torsoGroup,
    neckJoint,
    headPivot,
    leftShoulderPivot: leftArm.shoulder,
    leftElbowPivot: leftArm.elbow,
    rightShoulderPivot: rightArm.shoulder,
    rightElbowPivot: rightArm.elbow,
    leftHipPivot: leftLeg.hip,
    leftKneePivot: leftLeg.knee,
    rightHipPivot: rightLeg.hip,
    rightKneePivot: rightLeg.knee,
    slots: {
      headwear,
      backProp,
      leftHandProp: leftArm.handSlot,
      rightHandProp: rightArm.handSlot,
    },
    patronTargets,
  };
}

/**
 * Built-in articulated pose & walk cycle driver (zero allocations).
 */
export function updateArticulatedNpcPose(
  rig: ArticulatedOutdoorNpcRig,
  _dt: number,
  state: OutdoorNpcPoseState
): void {
  const { mode, elapsed, phase, holdingLeftProp } = state;
  const speed = state.speed ?? 1.0;

  if (mode === 'walk') {
    const strideFreq = 5.4 * Math.max(0.45, speed);
    const gait = computeArticulatedWalkGait({
      phase: elapsed * strideFreq + phase,
      speedNorm: Math.max(0.4, Math.min(1.35, speed)),
    });
    rig.pelvisPivot.position.y = 0.76 + gait.pelvisBobY;
    rig.pelvisPivot.rotation.z = gait.pelvisRollZ;
    rig.pelvisPivot.rotation.y = gait.pelvisYawY;
    rig.torsoGroup.rotation.x = gait.torsoPitchX;
    rig.torsoGroup.rotation.y = gait.torsoYawY;
    rig.torsoGroup.rotation.z = gait.torsoBankZ;

    rig.leftHipPivot.rotation.x = gait.leftHipX;
    rig.rightHipPivot.rotation.x = gait.rightHipX;
    rig.leftKneePivot.rotation.x = gait.leftKneeX;
    rig.rightKneePivot.rotation.x = gait.rightKneeX;

    if (holdingLeftProp) {
      rig.leftShoulderPivot.rotation.x = -1.08 + gait.secondaryBounce * 0.4;
      rig.leftShoulderPivot.rotation.z = -0.06;
      rig.leftElbowPivot.rotation.x = -0.35;
    } else {
      rig.leftShoulderPivot.rotation.x = gait.leftShoulderX;
      rig.leftShoulderPivot.rotation.z = 0;
      rig.leftElbowPivot.rotation.x = gait.leftElbowX;
    }
    rig.rightShoulderPivot.rotation.x = gait.rightShoulderX;
    rig.rightShoulderPivot.rotation.z = 0;
    rig.rightElbowPivot.rotation.x = gait.rightElbowX;
    rig.headPivot.rotation.y = Math.sin(elapsed * 0.9 + phase) * 0.16 - gait.torsoYawY * 0.5;
    rig.headPivot.rotation.x = (state.lookUpPitch ?? 0) + gait.secondaryBounce * 0.35;
    return;
  }

  if (mode === 'photo_pose') {
    rig.pelvisPivot.position.y = 0.76 + Math.sin(elapsed * 1.4 + phase) * 0.008;
    rig.torsoGroup.rotation.x = -0.04;
    rig.leftHipPivot.rotation.x = 0.06;
    rig.rightHipPivot.rotation.x = -0.06;
    rig.leftKneePivot.rotation.x = 0.04;
    rig.rightKneePivot.rotation.x = 0.04;

    const aimPitch = -1.18 + Math.sin(elapsed * 1.1 + phase) * 0.08;
    rig.rightShoulderPivot.rotation.x = aimPitch;
    rig.rightShoulderPivot.rotation.z = 0.24;
    rig.rightElbowPivot.rotation.x = -0.58;

    if (holdingLeftProp) {
      rig.leftShoulderPivot.rotation.x = -1.1;
      rig.leftShoulderPivot.rotation.z = -0.08;
      rig.leftElbowPivot.rotation.x = -0.32;
    } else {
      rig.leftShoulderPivot.rotation.x = aimPitch + 0.08;
      rig.leftShoulderPivot.rotation.z = -0.24;
      rig.leftElbowPivot.rotation.x = -0.54;
    }
    rig.headPivot.rotation.y = Math.sin(elapsed * 0.75 + phase) * 0.18;
    rig.headPivot.rotation.x = state.lookUpPitch ?? -0.14;
    return;
  }

  if (mode === 'vendor_tend') {
    rig.pelvisPivot.position.y = 0.76 + Math.sin(elapsed * 1.6 + phase) * 0.01;
    rig.torsoGroup.rotation.x = 0.04;
    rig.leftHipPivot.rotation.x = 0;
    rig.rightHipPivot.rotation.x = 0;
    rig.leftKneePivot.rotation.x = 0;
    rig.rightKneePivot.rotation.x = 0;
    rig.leftShoulderPivot.rotation.x = -0.38;
    rig.leftElbowPivot.rotation.x = -0.45;
    const waveCycle = (elapsed + phase * 1.9) % 5.2;
    if (waveCycle < 1.8) {
      rig.rightShoulderPivot.rotation.x = -1.25;
      rig.rightShoulderPivot.rotation.z = 0.24 + Math.sin(elapsed * 8.2 + phase) * 0.24;
      rig.rightElbowPivot.rotation.x = -0.52;
    } else {
      rig.rightShoulderPivot.rotation.x = -0.42 + Math.sin(elapsed * 1.7 + phase) * 0.14;
      rig.rightShoulderPivot.rotation.z = 0.06;
      rig.rightElbowPivot.rotation.x = -0.42;
    }
    rig.headPivot.rotation.y = Math.sin(elapsed * 1.05 + phase) * 0.22;
    rig.headPivot.rotation.x = 0.04;
    return;
  }

  if (mode === 'cycling') {
    const crank = state.crankAngle ?? elapsed * 5.2 + phase;
    rig.pelvisPivot.position.y = 0.84;
    rig.torsoGroup.rotation.x = 0.24;
    // Both arms reaching smoothly forward onto the cruiser handlebars
    rig.leftShoulderPivot.rotation.x = -0.82;
    rig.leftShoulderPivot.rotation.z = -0.08;
    rig.leftElbowPivot.rotation.x = -0.32;
    rig.rightShoulderPivot.rotation.x = -0.82;
    rig.rightShoulderPivot.rotation.z = 0.08;
    rig.rightElbowPivot.rotation.x = -0.32;
    // Two-bone hip + knee pedaling driven by crank angle
    const lPhase = Math.sin(crank);
    const rPhase = -lPhase;
    rig.leftHipPivot.rotation.x = -0.78 + lPhase * 0.44;
    rig.leftKneePivot.rotation.x = 0.86 - lPhase * 0.42;
    rig.rightHipPivot.rotation.x = -0.78 + rPhase * 0.44;
    rig.rightKneePivot.rotation.x = 0.86 - rPhase * 0.42;
    rig.headPivot.rotation.x = -0.14;
    rig.headPivot.rotation.y = Math.sin(elapsed * 0.65 + phase) * 0.1;
    return;
  }

  if (mode === 'buddy_pose') {
    // Stationary smiling photo pose (zero leg swing), waving right arm & hand on left hip
    rig.pelvisPivot.position.y = 0.76 + Math.sin(elapsed * 1.4 + phase) * 0.008;
    rig.torsoGroup.rotation.x = -0.02;
    rig.leftHipPivot.rotation.x = 0.03;
    rig.leftHipPivot.rotation.z = 0;
    rig.rightHipPivot.rotation.x = -0.04;
    rig.rightHipPivot.rotation.z = 0;
    rig.leftKneePivot.rotation.x = 0.02;
    rig.rightKneePivot.rotation.x = 0.03;

    if (holdingLeftProp) {
      rig.leftShoulderPivot.rotation.x = -1.08;
      rig.leftShoulderPivot.rotation.z = -0.06;
      rig.leftElbowPivot.rotation.x = -0.34;
    } else {
      rig.leftShoulderPivot.rotation.x = -0.18;
      rig.leftShoulderPivot.rotation.z = -0.34;
      rig.leftElbowPivot.rotation.x = -0.82;
    }
    rig.rightShoulderPivot.rotation.x = -1.15;
    rig.rightShoulderPivot.rotation.z = 0.42 + Math.sin(elapsed * 4.2 + phase) * 0.14;
    rig.rightElbowPivot.rotation.x = -0.68;
    rig.headPivot.rotation.y = Math.sin(elapsed * 0.8 + phase) * 0.1;
    rig.headPivot.rotation.x = state.lookUpPitch ?? -0.04;
    return;
  }

  if (mode === 'bench_sit') {
    // Seated cleanly on a park bench seat (pelvis at ~0.48, thighs forward, calves vertical)
    rig.pelvisPivot.position.y = 0.48 + Math.sin(elapsed * 1.2 + phase) * 0.006;
    rig.torsoGroup.rotation.x = -0.05;
    rig.leftHipPivot.rotation.x = -1.46;
    rig.leftHipPivot.rotation.z = 0.04;
    rig.rightHipPivot.rotation.x = -1.46;
    rig.rightHipPivot.rotation.z = -0.04;
    rig.leftKneePivot.rotation.x = 1.44;
    rig.rightKneePivot.rotation.x = 1.44;

    if (holdingLeftProp) {
      rig.leftShoulderPivot.rotation.x = -1.1;
      rig.leftShoulderPivot.rotation.z = -0.06;
      rig.leftElbowPivot.rotation.x = -0.35;
    } else {
      rig.leftShoulderPivot.rotation.x = -0.38 + Math.sin(elapsed * 0.9 + phase) * 0.05;
      rig.leftShoulderPivot.rotation.z = -0.06;
      rig.leftElbowPivot.rotation.x = -0.68;
    }
    rig.rightShoulderPivot.rotation.x = -0.38 - Math.sin(elapsed * 0.9 + phase) * 0.05;
    rig.rightShoulderPivot.rotation.z = 0.06;
    rig.rightElbowPivot.rotation.x = -0.68;
    rig.headPivot.rotation.y = Math.sin(elapsed * 0.72 + phase) * 0.28;
    rig.headPivot.rotation.x = state.lookUpPitch ?? 0.02;
    return;
  }

  if (mode === 'picnic_sit') {
    // Ground-seated blanket posture with gentle conversational / eating hand gestures
    rig.pelvisPivot.position.y = 0.22 + Math.sin(elapsed * 1.3 + phase) * 0.006;
    rig.torsoGroup.rotation.x = 0.08;
    rig.leftHipPivot.rotation.x = -1.38;
    rig.leftHipPivot.rotation.z = -0.24;
    rig.rightHipPivot.rotation.x = -1.38;
    rig.rightHipPivot.rotation.z = 0.24;
    rig.leftKneePivot.rotation.x = 1.65;
    rig.rightKneePivot.rotation.x = 1.65;

    const eatWave = Math.sin(elapsed * 1.6 + phase);
    rig.leftShoulderPivot.rotation.x = -0.45 + eatWave * 0.12;
    rig.leftShoulderPivot.rotation.z = -0.14;
    rig.leftElbowPivot.rotation.x = -0.82 - Math.max(0, eatWave) * 0.22;
    rig.rightShoulderPivot.rotation.x = -0.52 - eatWave * 0.16;
    rig.rightShoulderPivot.rotation.z = 0.14;
    rig.rightElbowPivot.rotation.x = -0.86 - Math.max(0, -eatWave) * 0.28;
    rig.headPivot.rotation.y = Math.sin(elapsed * 0.85 + phase) * 0.3;
    rig.headPivot.rotation.x = 0.06 + Math.sin(elapsed * 1.5 + phase) * 0.05;
    return;
  }

  if (mode === 'campfire_warm') {
    // Expedition camper crouched/seated by campfire warming gloved hands toward kettle flames
    rig.pelvisPivot.position.y = 0.42 + Math.sin(elapsed * 1.5 + phase) * 0.008;
    rig.torsoGroup.rotation.x = 0.18;
    rig.leftHipPivot.rotation.x = -1.24;
    rig.leftHipPivot.rotation.z = -0.12;
    rig.rightHipPivot.rotation.x = -1.24;
    rig.rightHipPivot.rotation.z = 0.12;
    rig.leftKneePivot.rotation.x = 1.48;
    rig.rightKneePivot.rotation.x = 1.48;

    const rub = Math.sin(elapsed * 3.4 + phase);
    rig.leftShoulderPivot.rotation.x = -0.88 + rub * 0.06;
    rig.leftShoulderPivot.rotation.z = 0.18;
    rig.leftElbowPivot.rotation.x = -0.48 + rub * 0.08;
    rig.rightShoulderPivot.rotation.x = -0.88 - rub * 0.06;
    rig.rightShoulderPivot.rotation.z = -0.18;
    rig.rightElbowPivot.rotation.x = -0.48 - rub * 0.08;
    rig.headPivot.rotation.y = Math.sin(elapsed * 0.65 + phase) * 0.2;
    rig.headPivot.rotation.x = 0.12 + Math.sin(elapsed * 1.1 + phase) * 0.04;
    return;
  }

  // Default: 'idle_browse' (leg swing strictly zeroed!)
  rig.pelvisPivot.position.y = 0.76 + Math.sin(elapsed * 1.5 + phase) * 0.01;
  rig.torsoGroup.rotation.x = 0.02;
  rig.leftHipPivot.rotation.x = 0;
  rig.leftHipPivot.rotation.z = 0;
  rig.rightHipPivot.rotation.x = 0;
  rig.rightHipPivot.rotation.z = 0;
  rig.leftKneePivot.rotation.x = 0;
  rig.rightKneePivot.rotation.x = 0;
  if (holdingLeftProp) {
    rig.leftShoulderPivot.rotation.x = -1.08;
    rig.leftShoulderPivot.rotation.z = -0.06;
    rig.leftElbowPivot.rotation.x = -0.34;
  } else {
    rig.leftShoulderPivot.rotation.x = Math.sin(elapsed * 1.3 + phase) * 0.08;
    rig.leftShoulderPivot.rotation.z = 0;
    rig.leftElbowPivot.rotation.x = -0.18;
  }
  rig.rightShoulderPivot.rotation.x = -Math.sin(elapsed * 1.3 + phase) * 0.08;
  rig.rightShoulderPivot.rotation.z = 0;
  rig.rightElbowPivot.rotation.x = -0.18;
  rig.headPivot.rotation.y = Math.sin(elapsed * 0.9 + phase) * 0.26;
  rig.headPivot.rotation.x = state.lookUpPitch ?? 0;
}

export interface ExpeditionWinterGearOptions {
  parkaHex: number;
  accentHex?: number;
  beanieHex?: number;
  packHex?: number;
  withTrekkingPoles?: boolean;
}

/**
 * Equips an articulated `outdoorNpcRig.ts` character with full Himalayan expedition winter gear:
 * baffled puffer parka rings, fur-trimmed hood or knit beanie, reflective dark ski goggles,
 * insulated mittens/gloves, winter trekking boots, torso-parented framed expedition backpack,
 * and optional hand-parented trekking poles. Zero detached/floating parts.
 */
export function attachExpeditionWinterGear(
  rig: ArticulatedOutdoorNpcRig,
  options: ExpeditionWinterGearOptions
): void {
  const parkaMat = new THREE.MeshStandardMaterial({ color: options.parkaHex, roughness: 0.78 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: options.accentHex ?? 0x1e293b,
    roughness: 0.75,
  });
  const furTrimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.92 });
  const beanieMat = new THREE.MeshStandardMaterial({
    color: options.beanieHex ?? options.parkaHex,
    roughness: 0.88,
  });
  const goggleFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 });
  const goggleLensMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.32,
    roughness: 0.14,
    metalness: 0.85,
  });
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.72 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.82 });
  const packMat = new THREE.MeshStandardMaterial({
    color: options.packHex ?? 0x334155,
    roughness: 0.84,
  });
  const poleMetalMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.35,
    metalness: 0.75,
  });

  // 1. Baffled puffer parka horizontal quilt ribs & warm collar on torsoGroup
  [0.14, 0.25, 0.36].forEach((by, idx) => {
    const baffle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.195 - idx * 0.005, 0.2 - idx * 0.005, 0.095, 10),
      parkaMat
    );
    baffle.scale.set(1.08, 1.0, 0.78);
    baffle.position.set(0, by, 0);
    rig.torsoGroup.add(baffle);
  });
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 12), furTrimMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.48, -0.01);
  rig.torsoGroup.add(collar);

  // 2. Knit expedition beanie + pom-pom & reflective dark ski goggles on headwear slot
  const beanie = new THREE.Mesh(
    new THREE.SphereGeometry(0.156, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.56),
    beanieMat
  );
  beanie.position.set(0, -0.09, -0.005);
  const beanieCuff = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.025, 6, 14), accentMat);
  beanieCuff.rotation.x = Math.PI / 2;
  beanieCuff.position.set(0, -0.075, 0);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.036, 7, 6), furTrimMat);
  pom.position.set(0, 0.075, -0.01);
  rig.slots.headwear.add(beanie, beanieCuff, pom);

  const goggleFrame = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.072, 0.055), goggleFrameMat);
  goggleFrame.position.set(0, -0.095, 0.13);
  const goggleLens = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.052, 0.02), goggleLensMat);
  goggleLens.position.set(0, -0.095, 0.154);
  rig.slots.headwear.add(goggleFrame, goggleLens);

  // 3. Insulated gloves mounted on left/right forearm hand joints
  const gloveGeo = new THREE.SphereGeometry(0.054, 7, 6);
  const lGlove = new THREE.Mesh(gloveGeo, gloveMat);
  lGlove.scale.set(1.0, 1.15, 1.05);
  rig.slots.leftHandProp.add(lGlove);
  const rGlove = new THREE.Mesh(gloveGeo, gloveMat);
  rGlove.scale.set(1.0, 1.15, 1.05);
  rig.slots.rightHandProp.add(rGlove);

  // 4. Heavy insulated winter trekking boots anchored to left/right knee calf bottoms
  const bootGeo = new THREE.BoxGeometry(0.125, 0.12, 0.21);
  [rig.leftKneePivot, rig.rightKneePivot].forEach((knee) => {
    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(0, -0.33, 0.035);
    knee.add(boot);
  });

  // 5. Framed Himalayan expedition backpack strictly parented to torsoGroup's backProp slot
  const packBody = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.46, 0.2), packMat);
  packBody.position.set(0, 0.04, -0.08);
  const packLid = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.09, 0.22), accentMat);
  packLid.position.set(0, 0.29, -0.08);
  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.36, 8), parkaMat);
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 0.36, -0.08);
  const packPocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.06), accentMat);
  packPocket.position.set(0, -0.04, -0.19);
  rig.slots.backProp.add(packBody, packLid, bedroll, packPocket);

  // 6. Optional bone-parented trekking poles in hand slots
  if (options.withTrekkingPoles) {
    const poleShaftGeo = new THREE.CylinderGeometry(0.011, 0.008, 1.12, 6);
    const basketGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.012, 8);
    [rig.slots.leftHandProp, rig.slots.rightHandProp].forEach((handSlot) => {
      const pole = new THREE.Group();
      const shaft = new THREE.Mesh(poleShaftGeo, poleMetalMat);
      shaft.position.y = -0.44;
      const basket = new THREE.Mesh(basketGeo, accentMat);
      basket.position.y = -0.92;
      pole.add(shaft, basket);
      pole.rotation.x = 0.14;
      handSlot.add(pole);
    });
  }
}

export interface KyotoCyclistOptions {
  frameHex: number;
  jacketHex: number;
  pantsHex?: number;
  skinHex?: number;
  hairHex?: number;
  seed?: number;
}

export interface KyotoCyclistInstance {
  group: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
  crankGroup: THREE.Group;
  rider: ArticulatedOutdoorNpcRig;
  crankAngle: number;
  wheelRadius: number;
}

const BIKE_TIRE_GEO = new THREE.TorusGeometry(0.28, 0.03, 8, 18);
const BIKE_RIM_GEO = new THREE.TorusGeometry(0.255, 0.012, 6, 16);
const BIKE_MUDGUARD_GEO = new THREE.TorusGeometry(0.305, 0.02, 6, 12, Math.PI * 0.72);
const BIKE_SPOKE_GEO = new THREE.CylinderGeometry(0.005, 0.005, 0.5, 4);
const BIKE_TIRE_MAT = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
const BIKE_CHROME_MAT = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.24, metalness: 0.82 });
const BIKE_BASKET_MAT = new THREE.MeshStandardMaterial({ color: 0xb4844e, roughness: 0.85 });
const BIKE_BRASS_MAT = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.25, metalness: 0.8 });
const BIKE_LEATHER_MAT = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.76 });

/**
 * Detailed Kyoto Mamachari commuter bicycle with tubular step-through frame,
 * 8-spoke rotating wheels, curved mudguards, rear rack, brass bell, woven rattan
 * front basket, and smooth articulated rider (local forward = +X for vehicleYaw).
 */
export function createKyotoCyclist(options: KyotoCyclistOptions): KyotoCyclistInstance {
  const group = new THREE.Group();
  group.userData.outdoorOnly = true;
  group.userData.noMerge = true;
  group.userData.skipStaticBatch = true;

  const frameMat = new THREE.MeshStandardMaterial({
    color: options.frameHex,
    roughness: 0.34,
    metalness: 0.45,
  });

  const buildSpokedWheel = (wx: number): THREE.Group => {
    const wg = new THREE.Group();
    wg.position.set(wx, 0.29, 0);
    wg.add(new THREE.Mesh(BIKE_TIRE_GEO, BIKE_TIRE_MAT));
    wg.add(new THREE.Mesh(BIKE_RIM_GEO, BIKE_CHROME_MAT));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.08, 8), BIKE_CHROME_MAT);
    hub.rotation.x = Math.PI / 2;
    wg.add(hub);
    for (let s = 0; s < 4; s++) {
      const sp = new THREE.Mesh(BIKE_SPOKE_GEO, BIKE_CHROME_MAT);
      sp.rotation.z = (s * Math.PI) / 4;
      wg.add(sp);
    }
    return wg;
  };

  const rearWheel = buildSpokedWheel(-0.5);
  const frontWheel = buildSpokedWheel(0.5);
  group.add(rearWheel, frontWheel);

  // Curved mudguards over both wheels + rear cargo rack
  [-0.5, 0.5].forEach((wx) => {
    const guard = new THREE.Mesh(BIKE_MUDGUARD_GEO, frameMat);
    guard.position.set(wx, 0.29, 0);
    guard.rotation.z = Math.PI * 0.14;
    group.add(guard);
  });
  const rearRack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 0.16), BIKE_CHROME_MAT);
  rearRack.position.set(-0.56, 0.64, 0);
  group.add(rearRack);

  // Tubular step-through steel frame (down tube, chainstays, seat tube, head tube & fork)
  const addTube = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, r = 0.018, mat = frameMat) => {
    const a = new THREE.Vector3(ax, ay, az);
    const b = new THREE.Vector3(bx, by, bz);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 7), mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    group.add(mesh);
  };
  addTube(-0.14, 0.3, 0, -0.26, 0.78, 0, 0.019); // Seat tube
  addTube(-0.14, 0.3, 0, 0.36, 0.64, 0, 0.019);  // Step-through down tube
  addTube(-0.2, 0.52, 0, 0.34, 0.72, 0, 0.015);  // Upper brace tube
  addTube(-0.5, 0.29, -0.05, -0.14, 0.3, -0.04, 0.012);
  addTube(-0.5, 0.29, 0.05, -0.14, 0.3, 0.04, 0.012);
  addTube(-0.5, 0.29, -0.05, -0.24, 0.68, -0.03, 0.012);
  addTube(-0.5, 0.29, 0.05, -0.24, 0.68, 0.03, 0.012);
  addTube(0.5, 0.29, -0.045, 0.36, 0.76, -0.02, 0.014); // Front fork L
  addTube(0.5, 0.29, 0.045, 0.36, 0.76, 0.02, 0.014);   // Front fork R
  addTube(0.36, 0.74, 0, 0.31, 0.94, 0, 0.016, BIKE_CHROME_MAT); // Stem

  // Curved cruiser handlebars with leather grips + brass bell
  const barCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.44, 7), BIKE_CHROME_MAT);
  barCenter.rotation.x = Math.PI / 2;
  barCenter.position.set(0.3, 0.94, 0);
  [-0.22, 0.22].forEach((gz) => {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 7), BIKE_LEATHER_MAT);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(0.24, 0.94, gz);
    group.add(grip);
  });
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.025, 7, 5), BIKE_BRASS_MAT);
  bell.position.set(0.28, 0.97, 0.12);
  const saddle = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.12, 4, 7), BIKE_LEATHER_MAT);
  saddle.rotation.z = Math.PI / 2;
  saddle.scale.set(1, 0.55, 1.05);
  saddle.position.set(-0.27, 0.82, 0);

  // Woven rattan front basket + wrapped parcel
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.32), BIKE_BASKET_MAT);
  basket.position.set(0.49, 0.76, 0);
  const parcel = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.14, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 })
  );
  parcel.position.set(0.49, 0.84, 0);
  group.add(barCenter, bell, saddle, basket, parcel);

  // Bottom-bracket crankset
  const crankGroup = new THREE.Group();
  crankGroup.position.set(-0.14, 0.3, 0);
  const chainring = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 10), BIKE_CHROME_MAT);
  chainring.rotation.x = Math.PI / 2;
  crankGroup.add(chainring);
  group.add(crankGroup);

  // Smooth articulated rider seated on the saddle facing +X
  const rider = createArticulatedOutdoorNpc({
    shirtHex: options.jacketHex,
    pantsHex: options.pantsHex ?? 0x1e293b,
    skinHex: options.skinHex ?? 0xf1d2be,
    hairHex: options.hairHex ?? 0x171514,
    shoeHex: 0x334155,
    hairStyle: (options.seed ?? 0) % 2 === 0 ? 'short' : 'bob',
  });
  rider.root.position.set(-0.22, 0.04, 0);
  rider.root.rotation.y = Math.PI / 2; // Rig local +Z aligned with bike local +X
  group.add(rider.root);

  return {
    group,
    frontWheel,
    rearWheel,
    crankGroup,
    rider,
    crankAngle: (options.seed ?? 0) * 1.7,
    wheelRadius: 0.28,
  };
}

export function updateKyotoCyclist(
  cyclist: KyotoCyclistInstance,
  dt: number,
  elapsed: number,
  speed: number
): void {
  const wheelDelta = (speed * dt) / cyclist.wheelRadius;
  cyclist.frontWheel.rotation.z -= wheelDelta;
  cyclist.rearWheel.rotation.z -= wheelDelta;
  cyclist.crankAngle += wheelDelta * 0.72;
  cyclist.crankGroup.rotation.z = -cyclist.crankAngle;
  updateArticulatedNpcPose(cyclist.rider, dt, {
    mode: 'cycling',
    elapsed,
    phase: 0,
    crankAngle: cyclist.crankAngle,
  });
}
