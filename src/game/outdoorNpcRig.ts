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
  detailNodes: THREE.Object3D[];
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

// Shared smooth sculpted geometries (customer-grade silhouette with reused buffers for low memory)
const SHARED_PELVIS_GEO = new THREE.CapsuleGeometry(0.145, 0.1, 5, 10);
const SHARED_TORSO_GEO = new THREE.CapsuleGeometry(0.175, 0.28, 6, 12);
const SHARED_INNER_TEE_GEO = new THREE.CylinderGeometry(0.088, 0.082, 0.36, 10, 1, true, -0.58, 1.16);
const SHARED_COLLAR_RING_GEO = new THREE.TorusGeometry(0.095, 0.017, 6, 14);
const SHARED_LAPEL_GEO = new THREE.BoxGeometry(0.042, 0.24, 0.022);
const SHARED_BELT_GEO = new THREE.CylinderGeometry(0.156, 0.158, 0.044, 12);
const SHARED_BUCKLE_GEO = new THREE.BoxGeometry(0.052, 0.042, 0.024);
const SHARED_KIMONO_SKIRT_GEO = new THREE.CylinderGeometry(0.175, 0.235, 0.84, 12);
const SHARED_OBI_GEO = new THREE.CylinderGeometry(0.195, 0.195, 0.2, 12);
const SHARED_NECK_GEO = new THREE.CylinderGeometry(0.052, 0.06, 0.1, 10);
const SHARED_HEAD_GEO = new THREE.SphereGeometry(0.144, 14, 12);
const SHARED_SCLERA_GEO = new THREE.SphereGeometry(0.021, 8, 7);
const SHARED_EYE_GEO = new THREE.SphereGeometry(0.014, 8, 6);
const SHARED_EYE_SPEC_GEO = new THREE.SphereGeometry(0.0048, 5, 4);
const SHARED_BROW_GEO = new THREE.BoxGeometry(0.04, 0.009, 0.012);
const SHARED_NOSE_GEO = new THREE.SphereGeometry(0.014, 7, 6);
const SHARED_SMILE_GEO = new THREE.TorusGeometry(0.024, 0.005, 6, 10, Math.PI * 0.72);
const SHARED_EAR_GEO = new THREE.SphereGeometry(0.024, 7, 6);
const SHARED_CHEEK_GEO = new THREE.CircleGeometry(0.022, 10);
const SHARED_HAIR_CAP_GEO = new THREE.SphereGeometry(0.152, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
const SHARED_HAIR_BANGS_GEO = new THREE.CapsuleGeometry(0.032, 0.11, 4, 8);
const SHARED_HAIR_SIDE_GEO = new THREE.CapsuleGeometry(0.026, 0.085, 4, 7);
const SHARED_HAIR_QUIFF_GEO = new THREE.SphereGeometry(0.072, 9, 7);
const SHARED_HAIR_BUN_GEO = new THREE.SphereGeometry(0.076, 10, 8);
const SHARED_HAIR_BAND_GEO = new THREE.TorusGeometry(0.056, 0.01, 6, 12);
const SHARED_HAIR_BOB_GEO = new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0.28, Math.PI * 0.62);
const SHARED_SHOULDER_CAP_GEO = new THREE.SphereGeometry(0.064, 9, 8);
const SHARED_UPPER_ARM_GEO = new THREE.CapsuleGeometry(0.049, 0.17, 5, 10);
const SHARED_SLEEVE_CUFF_GEO = new THREE.TorusGeometry(0.044, 0.009, 6, 12);
const SHARED_FOREARM_GEO = new THREE.CapsuleGeometry(0.04, 0.17, 5, 10);
const SHARED_HAND_GEO = new THREE.SphereGeometry(0.042, 8, 7);
const SHARED_THUMB_GEO = new THREE.CapsuleGeometry(0.012, 0.024, 4, 6);
const SHARED_THIGH_GEO = new THREE.CapsuleGeometry(0.065, 0.24, 5, 10);
const SHARED_CALF_GEO = new THREE.CapsuleGeometry(0.053, 0.25, 5, 10);
const SHARED_HEM_CUFF_GEO = new THREE.TorusGeometry(0.054, 0.009, 6, 12);
const SHARED_SHOE_GEO = new THREE.CapsuleGeometry(0.05, 0.105, 5, 9);
const SHARED_SHOE_SOLE_GEO = new THREE.BoxGeometry(0.098, 0.022, 0.19);
const SHARED_SHOE_STRIPE_GEO = new THREE.BoxGeometry(0.104, 0.018, 0.046);
const SHARED_GLASSES_LENS_GEO = new THREE.BoxGeometry(0.046, 0.026, 0.01);
const SHARED_GLASSES_BRIDGE_GEO = new THREE.BoxGeometry(0.028, 0.008, 0.008);
const SHARED_CROSSBODY_STRAP_GEO = new THREE.TorusGeometry(0.225, 0.014, 6, 18);
const SHARED_CROSSBODY_POUCH_GEO = new THREE.BoxGeometry(0.11, 0.13, 0.055);

const SHARED_SCLERA_MAT = new THREE.MeshStandardMaterial({ color: 0xfefefe, roughness: 0.3 });
const SHARED_EYE_MAT = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2 });
const SHARED_EYE_SPEC_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff });
const SHARED_SMILE_MAT = new THREE.MeshStandardMaterial({ color: 0x9f4b43, roughness: 0.65 });
const SHARED_CHEEK_MAT = new THREE.MeshBasicMaterial({
  color: 0xfb7185,
  transparent: true,
  opacity: 0.24,
  depthWrite: false,
});
const SHARED_INNER_TEE_MAT = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.78 });
const SHARED_BELT_MAT = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.62 });
const SHARED_BUCKLE_MAT = new THREE.MeshStandardMaterial({
  color: 0xd6d3d1,
  roughness: 0.3,
  metalness: 0.78,
});
const SHARED_MIDSOLE_MAT = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.65 });
const SHARED_SUNGLASSES_MAT = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  roughness: 0.14,
  metalness: 0.75,
});
const SHARED_POUCH_MAT = new THREE.MeshStandardMaterial({ color: 0x573b26, roughness: 0.72 });

const _lodWorldPos = new THREE.Vector3();

/**
 * Distance-based micro-detail LOD culler for overlook NPCs.
 * On Low graphics quality, hides fine facial/garment/sneaker accent meshes beyond `lodDistance`
 * while preserving the complete articulated character silhouette. Zero per-frame allocations.
 */
export function updateOutdoorNpcDetailLod(
  scopeRoot: THREE.Object3D,
  cameraPosition: THREE.Vector3,
  isLowQuality: boolean,
  lodDistance = 16
): void {
  const maxDistSq = lodDistance * lodDistance;
  scopeRoot.traverse((obj) => {
    const detailNodes = obj.userData?.outdoorNpcDetailNodes as THREE.Object3D[] | undefined;
    if (!detailNodes || detailNodes.length === 0) return;
    let showDetail = true;
    if (isLowQuality) {
      obj.getWorldPosition(_lodWorldPos);
      showDetail = _lodWorldPos.distanceToSquared(cameraPosition) <= maxDistSq;
    }
    for (let i = 0; i < detailNodes.length; i++) {
      if (detailNodes[i].visible !== showDetail) {
        detailNodes[i].visible = showDetail;
      }
    }
  });
}

/**
 * Unified full-detail articulated outdoor NPC rig with customer-grade facial, hair, garment,
 * and sneaker sculpting plus strict bone-parented slots (`headwear`, `backProp`, `leftHandProp`,
 * `rightHandProp`) so accessories never detach.
 */
export function createArticulatedOutdoorNpc(
  options: ArticulatedOutdoorNpcOptions
): ArticulatedOutdoorNpcRig {
  const seed = Math.abs(Math.floor(options.seed ?? 1));
  const detailNodes: THREE.Object3D[] = [];
  const registerDetail = <T extends THREE.Object3D>(node: T): T => {
    detailNodes.push(node);
    return node;
  };

  const root = new THREE.Group();
  root.userData.outdoorOnly = true;
  root.userData.noMerge = true;
  root.userData.skipStaticBatch = true;
  root.userData.outdoorNpcDetailNodes = detailNodes;
  if (options.isSecretNpc) root.userData.isSecretNpc = true;

  const jacketMat = new THREE.MeshStandardMaterial({ color: options.shirtHex, roughness: 0.72 });
  const denimMat = new THREE.MeshStandardMaterial({ color: options.pantsHex, roughness: 0.82 });
  const skinMat = new THREE.MeshStandardMaterial({
    color: options.skinHex ?? 0xe4b89c,
    roughness: 0.62,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: options.hairHex ?? 0x1c1917,
    roughness: 0.8,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: options.shoeHex ?? 0x1f2937,
    roughness: 0.66,
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

  // Customer-grade layered garment accents (inner tee, folded collar, lapels, waist belt & buckle)
  if (!options.isKimono) {
    const collarRing = registerDetail(new THREE.Mesh(SHARED_COLLAR_RING_GEO, jacketMat));
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.set(0, 0.495, 0.005);
    torsoGroup.add(collarRing);

    if (options.apronHex === undefined) {
      const innerTee = registerDetail(new THREE.Mesh(SHARED_INNER_TEE_GEO, SHARED_INNER_TEE_MAT));
      innerTee.position.set(0, 0.285, 0.056);
      innerTee.scale.set(1.0, 1.0, 0.88);
      torsoGroup.add(innerTee);

      [-1, 1].forEach((side) => {
        const lapel = registerDetail(new THREE.Mesh(SHARED_LAPEL_GEO, jacketMat));
        lapel.position.set(side * 0.068, 0.34, 0.122);
        lapel.rotation.z = side * -0.14;
        lapel.rotation.y = side * 0.24;
        torsoGroup.add(lapel);
      });

      const belt = registerDetail(new THREE.Mesh(SHARED_BELT_GEO, SHARED_BELT_MAT));
      belt.position.set(0, 0.035, 0);
      belt.scale.set(1.04, 1.0, 0.78);
      const buckle = registerDetail(new THREE.Mesh(SHARED_BUCKLE_GEO, SHARED_BUCKLE_MAT));
      buckle.position.set(0, 0.036, 0.125);
      torsoGroup.add(belt, buckle);

      // Optional crossbody camera/travel bag strap for natural tourist variety
      if (seed % 4 === 1 && !options.isSecretNpc) {
        const strap = registerDetail(new THREE.Mesh(SHARED_CROSSBODY_STRAP_GEO, SHARED_POUCH_MAT));
        strap.position.set(0.01, 0.25, 0);
        strap.scale.set(0.84, 1.15, 0.62);
        strap.rotation.z = 0.56;
        const pouch = registerDetail(new THREE.Mesh(SHARED_CROSSBODY_POUCH_GEO, SHARED_POUCH_MAT));
        pouch.position.set(-0.165, 0.08, -0.02);
        pouch.rotation.y = 0.2;
        torsoGroup.add(strap, pouch);
      }
    }
  }

  if (options.apronHex !== undefined) {
    const apronMat = new THREE.MeshStandardMaterial({ color: options.apronHex, roughness: 0.85 });
    const apron = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.19, 0.56, 12, 1, true, -1.1, 2.2),
      apronMat
    );
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
    const obiBow = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.12, 4, 8), obiMat);
    obiBow.rotation.z = Math.PI / 2;
    obiBow.position.set(0, 0.14, -0.17);
    torsoGroup.add(obi, obiBow);
  }

  // Strict bone-parented backProp slot (tourist backpack rides rigidly with torso)
  const backProp = new THREE.Group();
  backProp.position.set(0, 0.28, -0.16);
  torsoGroup.add(backProp);

  // Neck -> HeadPivot -> Sculpted Head + Expressive Face + Layered Hair + Headwear Slot
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
  headMesh.scale.set(0.96, 1.04, 0.98);
  headPivot.add(headMesh);

  // Sculpted ears
  [-0.132, 0.132].forEach((earX) => {
    const ear = registerDetail(new THREE.Mesh(SHARED_EAR_GEO, skinMat));
    ear.scale.set(0.55, 1.15, 0.85);
    ear.position.set(earX, 0.118, -0.004);
    headPivot.add(ear);
  });

  // Expressive eyes (sclera + dark iris + specular highlight) + arched brows + soft cheek blush
  [-1, 1].forEach((side) => {
    const ex = side * 0.048;
    const sclera = registerDetail(new THREE.Mesh(SHARED_SCLERA_GEO, SHARED_SCLERA_MAT));
    sclera.scale.set(1.05, 0.92, 0.52);
    sclera.position.set(ex, 0.132, 0.126);
    headPivot.add(sclera);

    const eye = new THREE.Mesh(SHARED_EYE_GEO, SHARED_EYE_MAT);
    eye.scale.set(1.0, 1.05, 0.6);
    eye.position.set(ex, 0.132, 0.134);
    headPivot.add(eye);

    const spec = registerDetail(new THREE.Mesh(SHARED_EYE_SPEC_GEO, SHARED_EYE_SPEC_MAT));
    spec.position.set(ex + 0.005, 0.138, 0.141);
    headPivot.add(spec);

    const brow = registerDetail(new THREE.Mesh(SHARED_BROW_GEO, hairMat));
    brow.position.set(ex, 0.162, 0.127);
    brow.rotation.z = side * -0.1;
    headPivot.add(brow);

    const cheek = registerDetail(new THREE.Mesh(SHARED_CHEEK_GEO, SHARED_CHEEK_MAT));
    cheek.position.set(side * 0.072, 0.104, 0.122);
    cheek.rotation.y = side * 0.42;
    headPivot.add(cheek);
  });

  // Sculpted nose & warm smile
  const nose = registerDetail(new THREE.Mesh(SHARED_NOSE_GEO, skinMat));
  nose.scale.set(0.75, 1.12, 1.05);
  nose.position.set(0, 0.112, 0.138);
  const smile = registerDetail(new THREE.Mesh(SHARED_SMILE_GEO, SHARED_SMILE_MAT));
  smile.position.set(0, 0.084, 0.129);
  smile.rotation.z = Math.PI * 1.14;
  headPivot.add(nose, smile);

  // Optional slim tourist sunglasses on select regular passersby
  if (!options.isKimono && options.apronHex === undefined && !options.isSecretNpc && seed % 5 === 0) {
    const bridge = registerDetail(new THREE.Mesh(SHARED_GLASSES_BRIDGE_GEO, SHARED_SUNGLASSES_MAT));
    bridge.position.set(0, 0.136, 0.148);
    headPivot.add(bridge);
    [-0.048, 0.048].forEach((gx) => {
      const lens = registerDetail(new THREE.Mesh(SHARED_GLASSES_LENS_GEO, SHARED_SUNGLASSES_MAT));
      lens.position.set(gx, 0.134, 0.147);
      headPivot.add(lens);
    });
  }

  // Layered hair silhouette (crown cap + forehead fringe/bangs + temple tapers + hairstyle variation)
  const hairCap = new THREE.Mesh(SHARED_HAIR_CAP_GEO, hairMat);
  hairCap.position.set(0, 0.132, -0.01);
  headPivot.add(hairCap);

  const bangs = registerDetail(new THREE.Mesh(SHARED_HAIR_BANGS_GEO, hairMat));
  bangs.rotation.z = Math.PI / 2 + (seed % 2 === 0 ? 0.12 : -0.12);
  bangs.scale.set(0.82, 1.0, 0.65);
  bangs.position.set(seed % 2 === 0 ? 0.012 : -0.012, 0.205, 0.105);
  headPivot.add(bangs);

  [-0.125, 0.125].forEach((sx) => {
    const taper = registerDetail(new THREE.Mesh(SHARED_HAIR_SIDE_GEO, hairMat));
    taper.position.set(sx, 0.145, -0.015);
    headPivot.add(taper);
  });

  if (options.hairStyle === 'bun') {
    const bun = new THREE.Mesh(SHARED_HAIR_BUN_GEO, hairMat);
    bun.position.set(0, 0.232, -0.112);
    const band = registerDetail(new THREE.Mesh(SHARED_HAIR_BAND_GEO, SHARED_MIDSOLE_MAT));
    band.rotation.x = Math.PI * 0.35;
    band.position.set(0, 0.214, -0.088);
    headPivot.add(bun, band);
  } else if (options.hairStyle === 'bob') {
    const bob = new THREE.Mesh(SHARED_HAIR_BOB_GEO, hairMat);
    bob.position.set(0, 0.11, -0.025);
    headPivot.add(bob);
  } else {
    const quiff = registerDetail(new THREE.Mesh(SHARED_HAIR_QUIFF_GEO, hairMat));
    quiff.scale.set(1.35, 0.68, 1.15);
    quiff.position.set(seed % 2 === 0 ? 0.02 : -0.02, 0.246, 0.032);
    headPivot.add(quiff);
  }

  const headwear = new THREE.Group();
  headwear.position.set(0, 0.24, 0);
  headPivot.add(headwear);

  // Articulated 2-bone Arms (Shoulder -> UpperArm -> Elbow -> Rolled Cuff + Forearm -> Sculpted Palm + HandSlot)
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

    const cuff = registerDetail(new THREE.Mesh(SHARED_SLEEVE_CUFF_GEO, jacketMat));
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.006;
    elbow.add(cuff);

    const forearm = new THREE.Mesh(SHARED_FOREARM_GEO, options.isKimono ? jacketMat : skinMat);
    forearm.position.y = -0.12;
    const hand = new THREE.Mesh(SHARED_HAND_GEO, skinMat);
    hand.scale.set(0.84, 1.15, 0.72);
    hand.position.y = -0.24;
    const thumb = registerDetail(new THREE.Mesh(SHARED_THUMB_GEO, skinMat));
    thumb.position.set(-side * 0.028, -0.23, 0.02);
    thumb.rotation.z = side * 0.45;
    elbow.add(forearm, hand, thumb);

    const handSlot = new THREE.Group();
    handSlot.position.set(0, -0.24, 0.02);
    elbow.add(handSlot);

    return { shoulder, elbow, handSlot };
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Articulated 2-bone Legs (Hip -> Thigh -> Knee -> Calf + Pant Cuff -> Detailed Sneaker with Midsole & Stripe)
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
    const hemCuff = registerDetail(new THREE.Mesh(SHARED_HEM_CUFF_GEO, denimMat));
    hemCuff.rotation.x = Math.PI / 2;
    hemCuff.position.y = -0.295;

    const shoe = new THREE.Mesh(SHARED_SHOE_GEO, shoeMat);
    shoe.rotation.x = Math.PI / 2;
    shoe.position.set(0, -0.335, 0.045);

    const midsole = registerDetail(new THREE.Mesh(SHARED_SHOE_SOLE_GEO, SHARED_MIDSOLE_MAT));
    midsole.position.set(0, -0.376, 0.044);

    const stripe = registerDetail(new THREE.Mesh(SHARED_SHOE_STRIPE_GEO, SHARED_MIDSOLE_MAT));
    stripe.position.set(0, -0.34, 0.042);

    knee.add(calf, hemCuff, shoe, midsole, stripe);

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
    detailNodes,
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
