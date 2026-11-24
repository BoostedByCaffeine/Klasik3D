import * as THREE from 'three';
import {
  type ArticulatedOutdoorNpcRig,
  createArticulatedOutdoorNpc,
  updateArticulatedNpcPose,
} from '../outdoorNpcRig';

/**
 * Mayon Volcano Living Overlook Controller (Phase 7).
 *
 * Replaces all frozen overlook tourists and walk-in-place stall shoppers with
 * 5 coordinated living state machines strictly inside `outdoorOnlyGroup`:
 * 1. Passerby-to-Overlook Solo Photo Walkers (4 slots, zero leg swing on stop)
 * 2. Buddy Photo Pairs (2 pairs: A poses w/ Mayon behind, B steps 2.2u back & snaps)
 * 3. Active Souvenir Stall Shoppers (3 slots: walk in -> halt walk legs -> idle inspect 5-10s -> leave)
 * 4. Far-Lawn Picnic Families (2 family groups: walk to far grass -> unroll woven banig mat + basket
 *    -> long seated picnic 60-90s -> stand up & pack props cleanly -> walk out)
 * 5. Rare L-Junction Pull-Over Sightseeing Car (every 40-70s: follows exact Mayon L-junction road
 *    -> pulls onto roadside shoulder w/ brake & amber hazard lights -> full-rig driver exits,
 *    takes 2 steps & snaps Mayon 5-7s -> re-enters car -> drives cleanly out along L-junction)
 *
 * All NPCs use `src/game/outdoorNpcRig.ts` with strictly bone-parented props & rain umbrellas.
 * All meshes carry `skipStaticBatch = true` & `noMerge = true`. Skipped completely indoors.
 */

export interface MayonOverlookLifeController {
  group: THREE.Group;
  update: (dt: number, elapsed: number, isRain: boolean, isNight: boolean, isPlayerOutside: boolean) => void;
}

const STREET_WALK_Z = -16.78;
const PLAZA_ENTRY_Z = -17.6;
const GROUND_Y = 0.02;

const STALL_SHOP_SPOTS = [
  { x: -12.35, z: -19.15, faceYaw: Math.PI + 0.14 },
  { x: -7.5, z: -20.0, faceYaw: Math.PI + 0.08 },
  { x: 7.3, z: -19.8, faceYaw: Math.PI - 0.08 },
  { x: 12.2, z: -19.05, faceYaw: Math.PI - 0.14 },
];

const SOLO_PHOTO_SPOTS = [
  { x: -4.2, z: -21.8, faceYaw: Math.PI + 0.08 },
  { x: -1.1, z: -22.9, faceYaw: Math.PI + 0.02 },
  { x: 1.8, z: -22.4, faceYaw: Math.PI - 0.06 },
  { x: 4.5, z: -21.5, faceYaw: Math.PI - 0.12 },
];

const BUDDY_PAIR_SPOTS = [
  {
    poseX: -2.85,
    poseZ: -23.1,
    poseYaw: 0.08, // Faces street/photographer with Mayon framed behind
    camX: -2.65,
    camZ: -20.85, // 2.25u back from poser
    camYaw: Math.PI + 0.08,
  },
  {
    poseX: 3.55,
    poseZ: -23.2,
    poseYaw: -0.1,
    camX: 3.32,
    camZ: -20.95, // 2.26u back from poser
    camYaw: Math.PI - 0.1,
  },
];

const PICNIC_LAWN_SPOTS = [
  { cx: -10.4, cz: -27.8, exitSide: -1 as const, duration: 74 },
  { cx: 11.4, cz: -27.4, exitSide: 1 as const, duration: 82 },
];

// Shared lightweight geometries & materials
const UMB_STEM_GEO = new THREE.CylinderGeometry(0.014, 0.014, 0.88, 6);
const UMB_CANOPY_GEO = new THREE.ConeGeometry(0.56, 0.22, 10);
const UMB_STEM_MAT = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 });
const CAM_BODY_MAT = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.36, metalness: 0.42 });
const CAM_LENS_MAT = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.18, metalness: 0.72 });
const TOTE_STRAP_GEO = new THREE.TorusGeometry(0.072, 0.011, 5, 10, Math.PI);

function lerpAngle(current: number, target: number, alpha: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * Math.min(1, alpha);
}

function stepToward(
  pos: { x: number; z: number; yaw: number },
  tx: number,
  tz: number,
  speed: number,
  dt: number
): boolean {
  const dx = tx - pos.x;
  const dz = tz - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.08) {
    pos.x = tx;
    pos.z = tz;
    return true;
  }
  const step = Math.min(dist, speed * dt);
  pos.x += (dx / dist) * step;
  pos.z += (dz / dist) * step;
  pos.yaw = lerpAngle(pos.yaw, Math.atan2(dx, dz), dt * 8.5);
  return dist - step < 0.08;
}

function attachRainUmbrella(rig: ArticulatedOutdoorNpcRig, colorHex: number): THREE.Group {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(UMB_STEM_GEO, UMB_STEM_MAT);
  stem.position.y = 0.44;
  const canopy = new THREE.Mesh(
    UMB_CANOPY_GEO,
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.56, side: THREE.DoubleSide })
  );
  canopy.position.y = 0.88;
  g.add(stem, canopy);
  g.rotation.x = 1.05;
  g.visible = false;
  rig.slots.leftHandProp.add(g);
  return g;
}

function attachSunHat(rig: ArticulatedOutdoorNpcRig, hatHex: number): void {
  const mat = new THREE.MeshStandardMaterial({ color: hatHex, roughness: 0.84 });
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.03, 12), mat);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.155, 0.095, 10), mat);
  crown.position.y = 0.055;
  rig.slots.headwear.add(brim, crown);
}

function attachBackpack(rig: ArticulatedOutdoorNpcRig, packHex: number): void {
  const packMat = new THREE.MeshStandardMaterial({ color: packHex, roughness: 0.82 });
  const packBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.17, 4, 8), packMat);
  packBody.scale.set(1.12, 1.0, 0.65);
  rig.slots.backProp.add(packBody);
}

function attachCameraWithFlash(rig: ArticulatedOutdoorNpcRig): {
  cameraGroup: THREE.Group;
  flashMat: THREE.MeshBasicMaterial;
} {
  const cameraGroup = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.055), CAM_BODY_MAT);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.045, 8), CAM_LENS_MAT);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0, 0.045);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
  });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), flashMat);
  flash.position.set(0, 0.02, 0.095);
  cameraGroup.add(body, lens, flash);
  cameraGroup.position.set(-0.03, 0.02, 0.04);
  cameraGroup.visible = false;
  rig.slots.rightHandProp.add(cameraGroup);
  return { cameraGroup, flashMat };
}

function attachToteBag(rig: ArticulatedOutdoorNpcRig, colorHex: number): void {
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.78 });
  const tote = new THREE.Group();
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.21, 0.08), mat);
  bag.position.y = -0.17;
  const strap = new THREE.Mesh(TOTE_STRAP_GEO, mat);
  strap.position.y = -0.05;
  tote.add(bag, strap);
  rig.slots.rightHandProp.add(tote);
}

function createWovenBanigTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#d9be8b';
  ctx.fillRect(0, 0, 128, 128);
  // Traditional Bicol woven pandan diamond & stripe banig pattern
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, 10, 128, 8);
  ctx.fillRect(0, 110, 128, 8);
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(0, 22, 128, 5);
  ctx.fillRect(0, 101, 128, 5);
  ctx.strokeStyle = 'rgba(120, 82, 36, 0.35)';
  ctx.lineWidth = 2;
  for (let i = -128; i < 256; i += 14) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + 128, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createBanigPicnicProps(banigMat: THREE.MeshStandardMaterial): THREE.Group {
  const g = new THREE.Group();
  g.userData.noMerge = true;
  g.userData.skipStaticBatch = true;

  // Woven pandan banig mat
  const matMesh = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.028, 1.85), banigMat);
  matMesh.position.y = 0.016;
  g.add(matMesh);

  // Woven abaca picnic basket
  const basketMat = new THREE.MeshStandardMaterial({ color: 0x9a6b39, roughness: 0.88 });
  const basketBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.28, 0.34), basketMat);
  basketBody.position.set(0.38, 0.16, -0.18);
  const basketHandle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 6, 10, Math.PI), basketMat);
  basketHandle.position.set(0.38, 0.3, -0.18);
  g.add(basketBody, basketHandle);

  // Banana-leaf food tray & Bicol snacks + drink thermos
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.025, 10), leafMat);
  tray.position.set(-0.18, 0.045, 0.08);
  const foodA = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 7, 6),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 })
  );
  foodA.position.set(-0.26, 0.095, 0.06);
  const foodB = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 7, 6),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.65 })
  );
  foodB.position.set(-0.1, 0.095, 0.12);
  const jug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.28, 8),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
  );
  jug.position.set(0.06, 0.16, -0.32);
  g.add(tray, foodA, foodB, jug);

  return g;
}

interface SightseeingCarModel {
  root: THREE.Group;
  wheels: THREE.Group[];
  brakeLightMat: THREE.MeshStandardMaterial;
  hazardLightMat: THREE.MeshStandardMaterial;
  headlightMat: THREE.MeshStandardMaterial;
}

/**
 * Full-detail compact touring SUV / crossover for the Mayon L-junction sightseeing pull-over.
 * Local forward = +Z so `rotation.y = Math.atan2(dx, dz)` aligns nose cleanly along drive tangent.
 */
function createMayonSightseeingCar(): SightseeingCarModel {
  const root = new THREE.Group();
  root.name = 'mayon_sightseeing_car';
  root.userData.noMerge = true;
  root.userData.skipStaticBatch = true;

  const paintMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.28, metalness: 0.42 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.12,
    metalness: 0.52,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.3, metalness: 0.78 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.9,
    roughness: 0.15,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    emissive: 0xef4444,
    emissiveIntensity: 0.2,
    roughness: 0.2,
  });
  const hazardLightMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.0,
    roughness: 0.22,
  });

  // Lower chassis & sculpted SUV body
  const lowerTrim = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.24, 4.18), trimMat);
  lowerTrim.position.set(0, 0.42, 0);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.56, 4.08), paintMat);
  body.position.set(0, 0.78, 0);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.56, 2.25), paintMat);
  cabin.position.set(0, 1.3, -0.18);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.46, 2.3), glassMat);
  windshield.position.set(0, 1.3, -0.18);
  const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.44, 1.98), glassMat);
  sideGlass.position.set(0, 1.3, -0.18);
  const roofRackL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 1.7), trimMat);
  roofRackL.position.set(-0.62, 1.61, -0.18);
  const roofRackR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 1.7), trimMat);
  roofRackR.position.set(0.62, 1.61, -0.18);
  root.add(lowerTrim, body, cabin, windshield, sideGlass, roofRackL, roofRackR);

  // Side mirrors
  [-0.94, 0.94].forEach((mx) => {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.14), paintMat);
    mirror.position.set(mx, 1.12, 0.65);
    root.add(mirror);
  });

  // Front headlights + front amber hazard indicators
  [-0.6, 0.6].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.06), headlightMat);
    hl.position.set(lx, 0.82, 2.05);
    const frontHaz = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.06), hazardLightMat);
    frontHaz.position.set(lx * 1.24, 0.82, 2.05);
    root.add(hl, frontHaz);

    // Rear red brake lights + rear amber hazard blinkers
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), brakeLightMat);
    bl.position.set(lx, 0.86, -2.05);
    const rearHaz = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.06), hazardLightMat);
    rearHaz.position.set(lx * 1.24, 0.86, -2.05);
    root.add(bl, rearHaz);
  });

  // 4 rotating wheels
  const wheels: THREE.Group[] = [];
  const wheelCoords: Array<[number, number]> = [
    [-0.86, 1.28],
    [0.86, 1.28],
    [-0.86, -1.28],
    [0.86, -1.28],
  ];
  wheelCoords.forEach(([wx, wz]) => {
    const wg = new THREE.Group();
    wg.position.set(wx, 0.34, wz);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12), tireMat);
    tire.rotation.z = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.24, 10), rimMat);
    rim.rotation.z = Math.PI / 2;
    wg.add(tire, rim);
    root.add(wg);
    wheels.push(wg);
  });

  return { root, wheels, brakeLightMat, hazardLightMat, headlightMat };
}

export function createMayonOverlookLife(): MayonOverlookLifeController {
  const group = new THREE.Group();
  group.name = 'mayon_overlook_life';
  group.userData.outdoorOnly = true;
  group.userData.noMerge = true;
  group.userData.skipStaticBatch = true;

  const banigTex = createWovenBanigTexture();
  const banigMat = new THREE.MeshStandardMaterial({
    map: banigTex ?? undefined,
    color: 0xffffff,
    roughness: 0.9,
  });

  // ==========================================================================
  // 1. PASSERBY-TO-OVERLOOK SOLO PHOTO WALKERS (4 slots)
  // ==========================================================================
  type SoloPhase = 'walk_street_in' | 'enter_plaza' | 'snap_photo' | 'exit_plaza' | 'walk_street_out';
  interface SoloPhotoWalker {
    rig: ArticulatedOutdoorNpcRig;
    umbrella: THREE.Group;
    cameraGroup: THREE.Group;
    flashMat: THREE.MeshBasicMaterial;
    phase: SoloPhase;
    spotIdx: number;
    entrySide: -1 | 1;
    exitSide: -1 | 1;
    pos: { x: number; z: number; yaw: number };
    timer: number;
    speed: number;
    animPhase: number;
  }
  const soloWalkers: SoloPhotoWalker[] = [];
  const soloPalette = [
    { shirt: 0x2563eb, pants: 0x334155, hat: 0xfde047, pack: 0x0f766e, umb: 0x2563eb, startIn: true },
    { shirt: 0xf43f5e, pants: 0x1e293b, hat: 0xfef3c7, pack: 0x7c2d12, umb: 0xef4444, startIn: true },
    { shirt: 0x10b981, pants: 0x292524, hat: 0xffffff, pack: 0x334155, umb: 0x10b981, startIn: false },
    { shirt: 0xf59e0b, pants: 0x1e3a5f, hat: 0xfef08a, pack: 0x475569, umb: 0xf59e0b, startIn: false },
  ];

  soloPalette.forEach((sp, idx) => {
    const rig = createArticulatedOutdoorNpc({
      shirtHex: sp.shirt,
      pantsHex: sp.pants,
      skinHex: idx % 2 === 0 ? 0xe0b090 : 0xd49e7c,
      hairHex: 0x1c1917,
      shoeHex: 0xf8fafc,
      hairStyle: idx % 3 === 0 ? 'bun' : idx % 3 === 1 ? 'short' : 'bob',
      seed: 7100 + idx * 17,
    });
    attachSunHat(rig, sp.hat);
    attachBackpack(rig, sp.pack);
    const { cameraGroup, flashMat } = attachCameraWithFlash(rig);
    const umbrella = attachRainUmbrella(rig, sp.umb);
    group.add(rig.root);

    const spot = SOLO_PHOTO_SPOTS[idx % SOLO_PHOTO_SPOTS.length];
    const entrySide: -1 | 1 = idx % 2 === 0 ? -1 : 1;
    const exitSide: -1 | 1 = idx % 2 === 0 ? 1 : -1;
    const pos = sp.startIn
      ? { x: spot.x, z: spot.z, yaw: spot.faceYaw }
      : { x: entrySide * (16 + idx * 3.5), z: STREET_WALK_Z, yaw: entrySide < 0 ? Math.PI / 2 : -Math.PI / 2 };

    rig.root.position.set(pos.x, GROUND_Y, pos.z);
    rig.root.rotation.y = pos.yaw;

    soloWalkers.push({
      rig,
      umbrella,
      cameraGroup,
      flashMat,
      phase: sp.startIn ? 'snap_photo' : 'walk_street_in',
      spotIdx: idx % SOLO_PHOTO_SPOTS.length,
      entrySide,
      exitSide,
      pos,
      timer: sp.startIn ? 4.5 + idx * 1.4 : 0,
      speed: 1.25 + (idx % 3) * 0.12,
      animPhase: idx * 1.85,
    });
  });

  // ==========================================================================
  // 2. BUDDY PHOTO PAIRS (2 pairs: A poses w/ Mayon behind, B steps back & snaps)
  // ==========================================================================
  type BuddyPhase = 'walk_street_in' | 'enter_positions' | 'posing_snap' | 'regroup' | 'exit_plaza' | 'walk_street_out';
  interface BuddyPhotoPair {
    poser: ArticulatedOutdoorNpcRig;
    photographer: ArticulatedOutdoorNpcRig;
    umbA: THREE.Group;
    umbB: THREE.Group;
    cameraGroup: THREE.Group;
    flashMat: THREE.MeshBasicMaterial;
    phase: BuddyPhase;
    spotIdx: number;
    entrySide: -1 | 1;
    exitSide: -1 | 1;
    posA: { x: number; z: number; yaw: number };
    posB: { x: number; z: number; yaw: number };
    timer: number;
    snapTotal: number;
    speed: number;
    animPhase: number;
  }
  const buddyPairs: BuddyPhotoPair[] = [];
  const buddyConfigs = [
    {
      shirtA: 0xec4899,
      pantsA: 0x1e293b,
      shirtB: 0x0ea5e9,
      pantsB: 0x334155,
      hatA: 0xfef3c7,
      hatB: 0xffffff,
      startPosing: true,
    },
    {
      shirtA: 0x8b5cf6,
      pantsA: 0x334155,
      shirtB: 0x14b8a6,
      pantsB: 0x1e293b,
      hatA: 0xfde68a,
      hatB: 0xfef3c7,
      startPosing: false,
    },
  ];

  buddyConfigs.forEach((bc, idx) => {
    const poser = createArticulatedOutdoorNpc({
      shirtHex: bc.shirtA,
      pantsHex: bc.pantsA,
      skinHex: 0xe2b496,
      hairHex: 0x1c1917,
      hairStyle: 'bob',
      seed: 7200 + idx * 23,
    });
    const photographer = createArticulatedOutdoorNpc({
      shirtHex: bc.shirtB,
      pantsHex: bc.pantsB,
      skinHex: 0xd6a180,
      hairHex: 0x261d17,
      hairStyle: 'short',
      seed: 7240 + idx * 23,
    });
    attachSunHat(poser, bc.hatA);
    attachBackpack(poser, 0x7c2d12);
    attachSunHat(photographer, bc.hatB);
    attachBackpack(photographer, 0x1e293b);
    const { cameraGroup, flashMat } = attachCameraWithFlash(photographer);
    const umbA = attachRainUmbrella(poser, 0xec4899);
    const umbB = attachRainUmbrella(photographer, 0x0ea5e9);
    group.add(poser.root, photographer.root);

    const spot = BUDDY_PAIR_SPOTS[idx];
    const entrySide: -1 | 1 = idx === 0 ? -1 : 1;
    const exitSide: -1 | 1 = idx === 0 ? 1 : -1;
    const posA = bc.startPosing
      ? { x: spot.poseX, z: spot.poseZ, yaw: spot.poseYaw }
      : { x: entrySide * 22, z: STREET_WALK_Z, yaw: entrySide < 0 ? Math.PI / 2 : -Math.PI / 2 };
    const posB = bc.startPosing
      ? { x: spot.camX, z: spot.camZ, yaw: spot.camYaw }
      : { x: entrySide * 23.1, z: STREET_WALK_Z + 0.35, yaw: entrySide < 0 ? Math.PI / 2 : -Math.PI / 2 };

    poser.root.position.set(posA.x, GROUND_Y, posA.z);
    poser.root.rotation.y = posA.yaw;
    photographer.root.position.set(posB.x, GROUND_Y, posB.z);
    photographer.root.rotation.y = posB.yaw;

    buddyPairs.push({
      poser,
      photographer,
      umbA,
      umbB,
      cameraGroup,
      flashMat,
      phase: bc.startPosing ? 'posing_snap' : 'walk_street_in',
      spotIdx: idx,
      entrySide,
      exitSide,
      posA,
      posB,
      timer: bc.startPosing ? 7.5 : 0,
      snapTotal: 8.0,
      speed: 1.22,
      animPhase: idx * 2.4 + 0.5,
    });
  });

  // ==========================================================================
  // 3. ACTIVE SOUVENIR STALL SHOPPERS (3 slots: walk -> STOP walk legs -> idle 5-10s -> leave)
  // ==========================================================================
  type ShopPhase = 'walk_street_in' | 'enter_stall' | 'idle_check' | 'exit_plaza' | 'walk_street_out';
  interface StallShopper {
    rig: ArticulatedOutdoorNpcRig;
    umbrella: THREE.Group;
    phase: ShopPhase;
    stallIdx: number;
    entrySide: -1 | 1;
    exitSide: -1 | 1;
    pos: { x: number; z: number; yaw: number };
    timer: number;
    speed: number;
    animPhase: number;
  }
  const stallShoppers: StallShopper[] = [];
  const shopperSpecs = [
    { shirt: 0xef4444, pants: 0x334155, tote: 0xd97706, umb: 0xef4444, stallIdx: 0, startAtStall: true },
    { shirt: 0x06b6d4, pants: 0x1e293b, tote: 0x0d9488, umb: 0x06b6d4, stallIdx: 2, startAtStall: true },
    { shirt: 0x8b5cf6, pants: 0x475569, tote: 0xdc2626, umb: 0x8b5cf6, stallIdx: 3, startAtStall: false },
  ];

  shopperSpecs.forEach((ss, idx) => {
    const rig = createArticulatedOutdoorNpc({
      shirtHex: ss.shirt,
      pantsHex: ss.pants,
      skinHex: idx === 1 ? 0xd9a787 : 0xe4b698,
      hairHex: 0x1c1917,
      hairStyle: idx === 0 ? 'bun' : idx === 1 ? 'short' : 'bob',
      seed: 7300 + idx * 19,
    });
    attachToteBag(rig, ss.tote);
    attachSunHat(rig, 0xfef3c7);
    const umbrella = attachRainUmbrella(rig, ss.umb);
    group.add(rig.root);

    const st = STALL_SHOP_SPOTS[ss.stallIdx];
    const entrySide: -1 | 1 = idx % 2 === 0 ? -1 : 1;
    const exitSide: -1 | 1 = idx % 2 === 0 ? 1 : -1;
    const pos = ss.startAtStall
      ? { x: st.x, z: st.z, yaw: st.faceYaw }
      : { x: entrySide * 20.5, z: STREET_WALK_Z, yaw: entrySide < 0 ? Math.PI / 2 : -Math.PI / 2 };

    rig.root.position.set(pos.x, GROUND_Y, pos.z);
    rig.root.rotation.y = pos.yaw;

    stallShoppers.push({
      rig,
      umbrella,
      phase: ss.startAtStall ? 'idle_check' : 'walk_street_in',
      stallIdx: ss.stallIdx,
      entrySide,
      exitSide,
      pos,
      timer: ss.startAtStall ? 6.2 + idx * 1.8 : 0,
      speed: 1.18 + idx * 0.08,
      animPhase: idx * 2.1,
    });
  });

  // ==========================================================================
  // 4. FAR-LAWN PICNIC FAMILIES (2 groups, LONG 60-90s seated duration + clean pack-up!)
  // ==========================================================================
  type FamilyPhase = 'cooldown' | 'walk_in_street' | 'walk_to_lawn' | 'picnic_seated' | 'exit_to_plaza' | 'walk_out_street';
  interface FamilyMember {
    rig: ArticulatedOutdoorNpcRig;
    umbrella: THREE.Group;
    seatDx: number;
    seatDz: number;
    seatYaw: number;
    pos: { x: number; z: number; yaw: number };
    animPhase: number;
  }
  interface PicnicFamily {
    members: FamilyMember[];
    propsGroup: THREE.Group;
    phase: FamilyPhase;
    cx: number;
    cz: number;
    exitSide: -1 | 1;
    duration: number;
    timer: number;
    speed: number;
  }
  const picnicFamilies: PicnicFamily[] = [];
  const familyPalettes = [
    [
      { shirt: 0x0ea5e9, pants: 0x334155, scale: 1.0, dx: -0.78, dz: -0.22, yaw: 1.25 },
      { shirt: 0xf43f5e, pants: 0x1e293b, scale: 0.96, dx: 0.78, dz: -0.18, yaw: -1.3 },
      { shirt: 0xfacc15, pants: 0x1d4ed8, scale: 0.76, dx: -0.05, dz: 0.72, yaw: Math.PI },
    ],
    [
      { shirt: 0x16a34a, pants: 0x292524, scale: 1.0, dx: -0.82, dz: -0.16, yaw: 1.28 },
      { shirt: 0xf97316, pants: 0x334155, scale: 0.95, dx: 0.76, dz: -0.24, yaw: -1.25 },
      { shirt: 0xec4899, pants: 0x475569, scale: 0.78, dx: 0.08, dz: 0.7, yaw: Math.PI - 0.12 },
    ],
  ];

  PICNIC_LAWN_SPOTS.forEach((spot, fIdx) => {
    const propsGroup = createBanigPicnicProps(banigMat);
    propsGroup.position.set(spot.cx, 0.0, spot.cz);
    group.add(propsGroup);

    const startSeated = fIdx === 0; // Family 0 starts enjoying their long picnic; Family 1 walks out onto the grass!
    propsGroup.visible = startSeated;

    const members: FamilyMember[] = familyPalettes[fIdx].map((mSpec, mIdx) => {
      const rig = createArticulatedOutdoorNpc({
        shirtHex: mSpec.shirt,
        pantsHex: mSpec.pants,
        skinHex: 0xdda887,
        hairHex: 0x1c1917,
        hairStyle: mIdx === 1 ? 'bun' : 'short',
        seed: 7500 + fIdx * 40 + mIdx * 11,
      });
      rig.root.scale.setScalar(mSpec.scale);
      if (mIdx === 0) attachBackpack(rig, 0x334155);
      if (mIdx < 2) attachSunHat(rig, 0xfef3c7);
      const umbrella = attachRainUmbrella(rig, mSpec.shirt);
      group.add(rig.root);

      const pos = startSeated
        ? { x: spot.cx + mSpec.dx, z: spot.cz + mSpec.dz, yaw: mSpec.yaw }
        : {
            x: 1.5 + mIdx * 0.95,
            z: PLAZA_ENTRY_Z - 1.2 - mIdx * 0.65,
            yaw: Math.PI - 0.4,
          };

      rig.root.position.set(pos.x, GROUND_Y, pos.z);
      rig.root.rotation.y = pos.yaw;

      return {
        rig,
        umbrella,
        seatDx: mSpec.dx,
        seatDz: mSpec.dz,
        seatYaw: mSpec.yaw,
        pos,
        animPhase: fIdx * 2.5 + mIdx * 1.7,
      };
    });

    picnicFamilies.push({
      members,
      propsGroup,
      phase: startSeated ? 'picnic_seated' : 'walk_to_lawn',
      cx: spot.cx,
      cz: spot.cz,
      exitSide: spot.exitSide,
      duration: spot.duration,
      timer: startSeated ? 68 : 0, // Long 60-90s duration!
      speed: 1.06,
    });
  });

  // ==========================================================================
  // 5. RARE L-JUNCTION PULL-OVER SIGHTSEEING CAR (every 40-70s)
  // ==========================================================================
  // Exact Mayon L-junction route:
  // West back lane (x=-33.8, z=+10) -> L-curve onto main far lane (z=-14.6) ->
  // Decelerate to overlook shoulder (x=-2.2, z=-15.35) -> Driver exits, walks 2 steps ->
  // Snaps Mayon photo (5-7s) -> Driver re-enters -> Car accelerates east along z=-14.6 ->
  // East L-curve onto East back lane (x=+33.8, z=+10) -> 40-70s cooldown!
  type CarPhase =
    | 'cooldown'
    | 'approach_l_junction'
    | 'pull_over'
    | 'driver_exit_walk'
    | 'driver_snap'
    | 'driver_return'
    | 'drive_away_l_junction';

  const carModel = createMayonSightseeingCar();
  carModel.root.visible = false;
  group.add(carModel.root);

  const driverRig = createArticulatedOutdoorNpc({
    shirtHex: 0x0284c7,
    pantsHex: 0x1e293b,
    skinHex: 0xdca988,
    hairHex: 0x1c1917,
    hairStyle: 'short',
    seed: 7777,
  });
  attachSunHat(driverRig, 0xfef3c7);
  const driverCam = attachCameraWithFlash(driverRig);
  const driverUmbrella = attachRainUmbrella(driverRig, 0x0284c7);
  driverRig.root.visible = false;
  group.add(driverRig.root);

  const approachWaypoints: Array<[number, number]> = [
    [-33.8, 10.5],
    [-33.8, -8.5],
    [-32.8, -12.8],
    [-29.2, -14.5],
    [-12.0, -14.6],
  ];
  const pullOverTarget = { x: -2.2, z: -15.32 };
  const exitWaypoints: Array<[number, number]> = [
    [6.5, -14.6],
    [29.2, -14.5],
    [32.8, -12.8],
    [33.8, -8.5],
    [33.8, 10.5],
  ];

  const carState = {
    phase: 'cooldown' as CarPhase,
    timer: 14.0, // First rare pull-over arrives ~14s after arriving outside, then every 42-68s
    cycleIndex: 0,
    wpIdx: 0,
    x: -33.8,
    z: 10.5,
    yaw: Math.PI,
    speed: 0,
    wheelAngle: 0,
    driverPos: { x: -2.2, z: -16.25, yaw: Math.PI },
  };

  const resetCarStart = () => {
    carState.x = approachWaypoints[0][0];
    carState.z = approachWaypoints[0][1];
    carState.yaw = Math.PI;
    carState.speed = 6.2;
    carState.wpIdx = 1;
    carModel.root.position.set(carState.x, 0.068, carState.z);
    carModel.root.rotation.y = carState.yaw;
    carModel.root.visible = true;
    driverRig.root.visible = false;
  };

  return {
    group,
    update: (dt, elapsed, isRain, isNight, isPlayerOutside) => {
      if (!isPlayerOutside) return;
      const safeDt = Math.min(dt, 0.08);

      // ----------------------------------------------------------------------
      // 1. Update Solo Photo Walkers
      // ----------------------------------------------------------------------
      for (let i = 0; i < soloWalkers.length; i++) {
        const w = soloWalkers[i];
        const spot = SOLO_PHOTO_SPOTS[w.spotIdx];
        w.umbrella.visible = isRain;

        if (w.phase === 'walk_street_in') {
          w.cameraGroup.visible = false;
          w.flashMat.opacity = 0;
          const entryX = Math.max(-4.4, Math.min(4.4, spot.x));
          if (stepToward(w.pos, entryX, STREET_WALK_Z, w.speed, safeDt)) {
            w.phase = 'enter_plaza';
          }
          updateArticulatedNpcPose(w.rig, safeDt, {
            mode: 'walk',
            elapsed,
            phase: w.animPhase,
            speed: w.speed,
            holdingLeftProp: isRain,
          });
        } else if (w.phase === 'enter_plaza') {
          w.cameraGroup.visible = false;
          w.flashMat.opacity = 0;
          if (stepToward(w.pos, spot.x, spot.z, w.speed * 0.9, safeDt)) {
            w.phase = 'snap_photo';
            w.timer = 4.6 + ((i * 1.7 + elapsed) % 3.2); // 4-8s
          }
          updateArticulatedNpcPose(w.rig, safeDt, {
            mode: 'walk',
            elapsed,
            phase: w.animPhase,
            speed: w.speed * 0.9,
            holdingLeftProp: isRain,
          });
        } else if (w.phase === 'snap_photo') {
          // STOP leg walk cycle completely & raise camera toward Mayon!
          w.pos.yaw = lerpAngle(w.pos.yaw, spot.faceYaw, safeDt * 6.0);
          w.cameraGroup.visible = true;
          w.timer -= safeDt;
          updateArticulatedNpcPose(w.rig, safeDt, {
            mode: 'photo_pose',
            elapsed,
            phase: w.animPhase,
            holdingLeftProp: isRain,
            lookUpPitch: -0.18,
          });
          // Subtle camera flash pulse mid-pose
          if (!isRain && w.timer > 1.8 && w.timer < 2.02) {
            w.flashMat.opacity = (w.timer - 1.8) / 0.22;
          } else {
            w.flashMat.opacity = 0;
          }
          if (w.timer <= 0) {
            w.phase = 'exit_plaza';
            w.cameraGroup.visible = false;
            w.flashMat.opacity = 0;
          }
        } else if (w.phase === 'exit_plaza') {
          const exitEntryX = Math.max(-4.4, Math.min(4.4, spot.x));
          if (stepToward(w.pos, exitEntryX, STREET_WALK_Z, w.speed * 0.92, safeDt)) {
            w.phase = 'walk_street_out';
          }
          updateArticulatedNpcPose(w.rig, safeDt, {
            mode: 'walk',
            elapsed,
            phase: w.animPhase,
            speed: w.speed * 0.92,
            holdingLeftProp: isRain,
          });
        } else {
          const outX = w.exitSide * 25.0;
          if (stepToward(w.pos, outX, STREET_WALK_Z, w.speed, safeDt)) {
            // Recycle from opposite street end to next scenic spot
            w.entrySide = w.exitSide;
            w.exitSide = (w.exitSide * -1) as -1 | 1;
            w.spotIdx = (w.spotIdx + 1) % SOLO_PHOTO_SPOTS.length;
            w.pos.x = w.entrySide * 25.0;
            w.pos.z = STREET_WALK_Z;
            w.phase = 'walk_street_in';
          }
          updateArticulatedNpcPose(w.rig, safeDt, {
            mode: 'walk',
            elapsed,
            phase: w.animPhase,
            speed: w.speed,
            holdingLeftProp: isRain,
          });
        }

        w.rig.root.position.set(w.pos.x, GROUND_Y, w.pos.z);
        w.rig.root.rotation.y = w.pos.yaw;
      }

      // ----------------------------------------------------------------------
      // 2. Update Buddy Photo Pairs (Person A poses, Person B steps back 2.2u & snaps)
      // ----------------------------------------------------------------------
      for (let i = 0; i < buddyPairs.length; i++) {
        const bp = buddyPairs[i];
        const spot = BUDDY_PAIR_SPOTS[bp.spotIdx];
        bp.umbA.visible = isRain;
        bp.umbB.visible = isRain;

        if (bp.phase === 'walk_street_in') {
          bp.cameraGroup.visible = false;
          bp.flashMat.opacity = 0;
          const gateX = Math.max(-4.2, Math.min(4.2, spot.poseX));
          const aDone = stepToward(bp.posA, gateX, STREET_WALK_Z, bp.speed, safeDt);
          const bDone = stepToward(bp.posB, gateX - bp.entrySide * 0.78, STREET_WALK_Z + 0.25, bp.speed, safeDt);
          updateArticulatedNpcPose(bp.poser, safeDt, { mode: 'walk', elapsed, phase: bp.animPhase, speed: bp.speed, holdingLeftProp: isRain });
          updateArticulatedNpcPose(bp.photographer, safeDt, { mode: 'walk', elapsed, phase: bp.animPhase + 1.1, speed: bp.speed, holdingLeftProp: isRain });
          if (aDone && bDone) bp.phase = 'enter_positions';
        } else if (bp.phase === 'enter_positions') {
          const aDone = stepToward(bp.posA, spot.poseX, spot.poseZ, bp.speed * 0.92, safeDt);
          const bDone = stepToward(bp.posB, spot.camX, spot.camZ, bp.speed * 0.92, safeDt);
          updateArticulatedNpcPose(bp.poser, safeDt, {
            mode: aDone ? 'buddy_pose' : 'walk',
            elapsed,
            phase: bp.animPhase,
            speed: bp.speed * 0.92,
            holdingLeftProp: isRain,
          });
          updateArticulatedNpcPose(bp.photographer, safeDt, {
            mode: bDone ? 'photo_pose' : 'walk',
            elapsed,
            phase: bp.animPhase + 1.1,
            speed: bp.speed * 0.92,
            holdingLeftProp: isRain,
          });
          if (aDone && bDone) {
            bp.phase = 'posing_snap';
            bp.timer = bp.snapTotal;
          }
        } else if (bp.phase === 'posing_snap') {
          // Both stop walking legs cleanly: A poses with Mayon behind, B aims camera with 2 flash pulses
          bp.posA.yaw = lerpAngle(bp.posA.yaw, spot.poseYaw, safeDt * 6.5);
          bp.posB.yaw = lerpAngle(bp.posB.yaw, spot.camYaw, safeDt * 6.5);
          bp.cameraGroup.visible = true;
          bp.timer -= safeDt;

          updateArticulatedNpcPose(bp.poser, safeDt, {
            mode: 'buddy_pose',
            elapsed,
            phase: bp.animPhase,
            holdingLeftProp: isRain,
          });
          updateArticulatedNpcPose(bp.photographer, safeDt, {
            mode: 'photo_pose',
            elapsed,
            phase: bp.animPhase + 1.1,
            holdingLeftProp: isRain,
            lookUpPitch: -0.06,
          });

          // Two crisp camera flash pulses at t=5.2s and t=2.2s remaining
          if (!isRain && ((bp.timer > 5.0 && bp.timer < 5.22) || (bp.timer > 2.0 && bp.timer < 2.22))) {
            bp.flashMat.opacity = 0.92;
          } else {
            bp.flashMat.opacity = 0;
          }

          if (bp.timer <= 0) {
            bp.cameraGroup.visible = false;
            bp.flashMat.opacity = 0;
            bp.phase = 'regroup';
          }
        } else if (bp.phase === 'regroup') {
          const midX = (spot.poseX + spot.camX) * 0.5;
          const midZ = spot.camZ + 0.4;
          const aDone = stepToward(bp.posA, midX - 0.38, midZ, bp.speed * 0.9, safeDt);
          const bDone = stepToward(bp.posB, midX + 0.38, midZ, bp.speed * 0.9, safeDt);
          updateArticulatedNpcPose(bp.poser, safeDt, { mode: aDone ? 'idle_browse' : 'walk', elapsed, phase: bp.animPhase, speed: bp.speed, holdingLeftProp: isRain });
          updateArticulatedNpcPose(bp.photographer, safeDt, { mode: bDone ? 'idle_browse' : 'walk', elapsed, phase: bp.animPhase + 1.1, speed: bp.speed, holdingLeftProp: isRain });
          if (aDone && bDone) bp.phase = 'exit_plaza';
        } else if (bp.phase === 'exit_plaza') {
          const gateX = Math.max(-4.0, Math.min(4.0, spot.camX));
          const aDone = stepToward(bp.posA, gateX - 0.38, STREET_WALK_Z, bp.speed * 0.92, safeDt);
          const bDone = stepToward(bp.posB, gateX + 0.38, STREET_WALK_Z + 0.28, bp.speed * 0.92, safeDt);
          updateArticulatedNpcPose(bp.poser, safeDt, { mode: 'walk', elapsed, phase: bp.animPhase, speed: bp.speed, holdingLeftProp: isRain });
          updateArticulatedNpcPose(bp.photographer, safeDt, { mode: 'walk', elapsed, phase: bp.animPhase + 1.1, speed: bp.speed, holdingLeftProp: isRain });
          if (aDone && bDone) bp.phase = 'walk_street_out';
        } else {
          const outX = bp.exitSide * 26.0;
          const aDone = stepToward(bp.posA, outX, STREET_WALK_Z, bp.speed, safeDt);
          const bDone = stepToward(bp.posB, outX - bp.exitSide * 0.7, STREET_WALK_Z + 0.3, bp.speed, safeDt);
          updateArticulatedNpcPose(bp.poser, safeDt, { mode: 'walk', elapsed, phase: bp.animPhase, speed: bp.speed, holdingLeftProp: isRain });
          updateArticulatedNpcPose(bp.photographer, safeDt, { mode: 'walk', elapsed, phase: bp.animPhase + 1.1, speed: bp.speed, holdingLeftProp: isRain });
          if (aDone && bDone) {
            bp.entrySide = bp.exitSide;
            bp.exitSide = (bp.exitSide * -1) as -1 | 1;
            bp.phase = 'walk_street_in';
          }
        }

        bp.poser.root.position.set(bp.posA.x, GROUND_Y, bp.posA.z);
        bp.poser.root.rotation.y = bp.posA.yaw;
        bp.photographer.root.position.set(bp.posB.x, GROUND_Y, bp.posB.z);
        bp.photographer.root.rotation.y = bp.posB.yaw;
      }

      // ----------------------------------------------------------------------
      // 3. Update Active Souvenir Stall Shoppers (HALT walk legs while browsing!)
      // ----------------------------------------------------------------------
      for (let i = 0; i < stallShoppers.length; i++) {
        const sh = stallShoppers[i];
        const st = STALL_SHOP_SPOTS[sh.stallIdx];
        sh.umbrella.visible = isRain;

        if (sh.phase === 'walk_street_in') {
          const gateX = st.x < 0 ? -4.2 : 4.2;
          if (stepToward(sh.pos, gateX, STREET_WALK_Z, sh.speed, safeDt)) {
            sh.phase = 'enter_stall';
          }
          updateArticulatedNpcPose(sh.rig, safeDt, { mode: 'walk', elapsed, phase: sh.animPhase, speed: sh.speed, holdingLeftProp: isRain });
        } else if (sh.phase === 'enter_stall') {
          if (stepToward(sh.pos, st.x, st.z, sh.speed * 0.9, safeDt)) {
            sh.phase = 'idle_check';
            sh.timer = 5.5 + ((i * 2.1 + elapsed) % 4.2); // 5-10s idle inspection!
          }
          updateArticulatedNpcPose(sh.rig, safeDt, { mode: 'walk', elapsed, phase: sh.animPhase, speed: sh.speed * 0.9, holdingLeftProp: isRain });
        } else if (sh.phase === 'idle_check') {
          // ZERO leg walk swing! Natural idle handicraft inspection + head nod
          sh.pos.yaw = lerpAngle(sh.pos.yaw, st.faceYaw, safeDt * 6.5);
          sh.timer -= safeDt;
          updateArticulatedNpcPose(sh.rig, safeDt, {
            mode: 'idle_browse',
            elapsed,
            phase: sh.animPhase,
            holdingLeftProp: isRain,
            lookUpPitch: 0.14 + Math.sin(elapsed * 1.1 + sh.animPhase) * 0.06,
          });
          // Subtle right-hand handicraft gesture without moving legs
          sh.rig.rightShoulderPivot.rotation.x = -0.34 + Math.sin(elapsed * 1.5 + sh.animPhase) * 0.12;
          sh.rig.rightElbowPivot.rotation.x = -0.42;

          if (sh.timer <= 0) {
            sh.phase = 'exit_plaza';
          }
        } else if (sh.phase === 'exit_plaza') {
          const gateX = st.x < 0 ? -4.2 : 4.2;
          if (stepToward(sh.pos, gateX, STREET_WALK_Z, sh.speed * 0.92, safeDt)) {
            sh.phase = 'walk_street_out';
          }
          updateArticulatedNpcPose(sh.rig, safeDt, { mode: 'walk', elapsed, phase: sh.animPhase, speed: sh.speed * 0.92, holdingLeftProp: isRain });
        } else {
          const outX = sh.exitSide * 25.5;
          if (stepToward(sh.pos, outX, STREET_WALK_Z, sh.speed, safeDt)) {
            sh.entrySide = sh.exitSide;
            sh.exitSide = (sh.exitSide * -1) as -1 | 1;
            sh.stallIdx = (sh.stallIdx + 1) % STALL_SHOP_SPOTS.length;
            sh.pos.x = sh.entrySide * 25.5;
            sh.pos.z = STREET_WALK_Z;
            sh.phase = 'walk_street_in';
          }
          updateArticulatedNpcPose(sh.rig, safeDt, { mode: 'walk', elapsed, phase: sh.animPhase, speed: sh.speed, holdingLeftProp: isRain });
        }

        sh.rig.root.position.set(sh.pos.x, GROUND_Y, sh.pos.z);
        sh.rig.root.rotation.y = sh.pos.yaw;
      }

      // ----------------------------------------------------------------------
      // 4. Update Far-Lawn Picnic Families (60-90s seated picnic + clean pack-up!)
      // ----------------------------------------------------------------------
      for (let f = 0; f < picnicFamilies.length; f++) {
        const fam = picnicFamilies[f];
        if (fam.phase === 'cooldown') {
          fam.propsGroup.visible = false;
          for (const m of fam.members) m.rig.root.visible = false;
          fam.timer -= safeDt;
          if (fam.timer <= 0) {
            fam.phase = 'walk_in_street';
            fam.members.forEach((m, idx) => {
              m.rig.root.visible = true;
              m.pos.x = fam.exitSide * (24.0 + idx * 0.9);
              m.pos.z = STREET_WALK_Z + (idx % 2) * 0.28;
              m.pos.yaw = fam.exitSide < 0 ? Math.PI / 2 : -Math.PI / 2;
            });
          }
          continue;
        }

        if (fam.phase === 'walk_in_street') {
          fam.propsGroup.visible = false;
          let allDone = true;
          const gateX = fam.cx < 0 ? -3.4 : 3.4;
          fam.members.forEach((m, idx) => {
            m.umbrella.visible = isRain;
            const done = stepToward(m.pos, gateX + (idx - 1) * 0.65, PLAZA_ENTRY_Z, fam.speed, safeDt);
            if (!done) allDone = false;
            updateArticulatedNpcPose(m.rig, safeDt, { mode: 'walk', elapsed, phase: m.animPhase, speed: fam.speed, holdingLeftProp: isRain });
            m.rig.root.position.set(m.pos.x, GROUND_Y, m.pos.z);
            m.rig.root.rotation.y = m.pos.yaw;
          });
          if (allDone) fam.phase = 'walk_to_lawn';
        } else if (fam.phase === 'walk_to_lawn') {
          fam.propsGroup.visible = false;
          let allDone = true;
          fam.members.forEach((m) => {
            m.umbrella.visible = isRain;
            const done = stepToward(m.pos, fam.cx + m.seatDx, fam.cz + m.seatDz, fam.speed * 0.94, safeDt);
            if (!done) allDone = false;
            updateArticulatedNpcPose(m.rig, safeDt, {
              mode: done ? 'idle_browse' : 'walk',
              elapsed,
              phase: m.animPhase,
              speed: fam.speed * 0.94,
              holdingLeftProp: isRain,
            });
            m.rig.root.position.set(m.pos.x, GROUND_Y, m.pos.z);
            m.rig.root.rotation.y = m.pos.yaw;
          });
          if (allDone) {
            // Unroll woven banig mat + picnic basket & begin 60-90s seated picnic!
            fam.propsGroup.visible = true;
            fam.phase = 'picnic_seated';
            fam.timer = fam.duration; // 74s / 82s (strictly within 60-90s!)
          }
        } else if (fam.phase === 'picnic_seated') {
          fam.propsGroup.visible = true;
          fam.timer -= safeDt;
          fam.members.forEach((m) => {
            m.umbrella.visible = isRain;
            m.pos.yaw = lerpAngle(m.pos.yaw, m.seatYaw, safeDt * 6.0);
            updateArticulatedNpcPose(m.rig, safeDt, {
              mode: 'picnic_sit',
              elapsed,
              phase: m.animPhase,
              holdingLeftProp: isRain,
            });
            m.rig.root.position.set(m.pos.x, GROUND_Y, m.pos.z);
            m.rig.root.rotation.y = m.pos.yaw;
          });
          if (fam.timer <= 0) {
            // Stand up & cleanly pack/remove the banig mat & basket!
            fam.propsGroup.visible = false;
            fam.phase = 'exit_to_plaza';
          }
        } else if (fam.phase === 'exit_to_plaza') {
          fam.propsGroup.visible = false;
          let allDone = true;
          const gateX = fam.cx < 0 ? -3.4 : 3.4;
          fam.members.forEach((m, idx) => {
            m.umbrella.visible = isRain;
            const done = stepToward(m.pos, gateX + (idx - 1) * 0.65, STREET_WALK_Z, fam.speed * 0.95, safeDt);
            if (!done) allDone = false;
            updateArticulatedNpcPose(m.rig, safeDt, { mode: 'walk', elapsed, phase: m.animPhase, speed: fam.speed, holdingLeftProp: isRain });
            m.rig.root.position.set(m.pos.x, GROUND_Y, m.pos.z);
            m.rig.root.rotation.y = m.pos.yaw;
          });
          if (allDone) fam.phase = 'walk_out_street';
        } else {
          let allDone = true;
          const outX = fam.exitSide * 26.5;
          fam.members.forEach((m, idx) => {
            m.umbrella.visible = isRain;
            const done = stepToward(m.pos, outX + idx * 0.65 * fam.exitSide, STREET_WALK_Z, fam.speed, safeDt);
            if (!done) allDone = false;
            updateArticulatedNpcPose(m.rig, safeDt, { mode: 'walk', elapsed, phase: m.animPhase, speed: fam.speed, holdingLeftProp: isRain });
            m.rig.root.position.set(m.pos.x, GROUND_Y, m.pos.z);
            m.rig.root.rotation.y = m.pos.yaw;
          });
          if (allDone) {
            fam.phase = 'cooldown';
            fam.timer = 18.0 + f * 9.0;
          }
        }
      }

      // ----------------------------------------------------------------------
      // 5. Update Rare L-Junction Pull-Over Sightseeing Car (every 40-70s)
      // ----------------------------------------------------------------------
      carModel.headlightMat.emissiveIntensity = isNight ? 2.4 : 0.7;
      const hazardBlink = Math.sin(elapsed * 7.8) > 0 ? 1.85 : 0.08;

      if (carState.phase === 'cooldown') {
        carModel.root.visible = false;
        driverRig.root.visible = false;
        carState.timer -= safeDt;
        if (carState.timer <= 0) {
          resetCarStart();
          carState.phase = 'approach_l_junction';
        }
      } else if (carState.phase === 'approach_l_junction') {
        carModel.brakeLightMat.emissiveIntensity = 0.25;
        carModel.hazardLightMat.emissiveIntensity = 0.0;
        const [tx, tz] = approachWaypoints[carState.wpIdx];
        const dx = tx - carState.x;
        const dz = tz - carState.z;
        const dist = Math.hypot(dx, dz);
        const step = Math.min(dist, carState.speed * safeDt);
        if (dist > 0.01) {
          carState.x += (dx / dist) * step;
          carState.z += (dz / dist) * step;
          carState.yaw = lerpAngle(carState.yaw, Math.atan2(dx, dz), safeDt * 5.2);
          carState.wheelAngle += step / 0.34;
        }
        if (dist - step < 0.2) {
          carState.wpIdx++;
          if (carState.wpIdx >= approachWaypoints.length) {
            carState.phase = 'pull_over';
          }
        }
      } else if (carState.phase === 'pull_over') {
        // Decelerate smoothly onto roadside shoulder with brake lights + amber hazard blinkers ON
        carModel.brakeLightMat.emissiveIntensity = 2.1;
        carModel.hazardLightMat.emissiveIntensity = hazardBlink;
        const dx = pullOverTarget.x - carState.x;
        const dz = pullOverTarget.z - carState.z;
        const dist = Math.hypot(dx, dz);
        carState.speed = Math.max(1.2, Math.min(5.2, dist * 0.95));
        const step = Math.min(dist, carState.speed * safeDt);
        if (dist > 0.05) {
          carState.x += (dx / dist) * step;
          carState.z += (dz / dist) * step;
          carState.yaw = lerpAngle(carState.yaw, dist > 1.2 ? Math.atan2(dx, dz) : Math.PI / 2, safeDt * 5.5);
          carState.wheelAngle += step / 0.34;
        } else {
          carState.x = pullOverTarget.x;
          carState.z = pullOverTarget.z;
          carState.yaw = Math.PI / 2;
          carState.speed = 0;
          // Spawn full-rig driver stepping out beside the passenger/overlook side of the car!
          carState.driverPos.x = carState.x + 0.2;
          carState.driverPos.z = carState.z - 1.15;
          carState.driverPos.yaw = Math.PI;
          driverRig.root.position.set(carState.driverPos.x, GROUND_Y, carState.driverPos.z);
          driverRig.root.rotation.y = carState.driverPos.yaw;
          driverRig.root.visible = true;
          carState.phase = 'driver_exit_walk';
        }
      } else if (carState.phase === 'driver_exit_walk') {
        carModel.brakeLightMat.emissiveIntensity = 1.4;
        carModel.hazardLightMat.emissiveIntensity = hazardBlink;
        driverUmbrella.visible = isRain;
        driverCam.cameraGroup.visible = false;
        driverCam.flashMat.opacity = 0;
        const reached = stepToward(carState.driverPos, carState.x + 0.55, -18.45, 1.2, safeDt);
        updateArticulatedNpcPose(driverRig, safeDt, {
          mode: 'walk',
          elapsed,
          phase: 0.7,
          speed: 1.2,
          holdingLeftProp: isRain,
        });
        driverRig.root.position.set(carState.driverPos.x, GROUND_Y, carState.driverPos.z);
        driverRig.root.rotation.y = carState.driverPos.yaw;
        if (reached) {
          carState.phase = 'driver_snap';
          carState.timer = 6.0; // 5-7s photo stop!
        }
      } else if (carState.phase === 'driver_snap') {
        carModel.brakeLightMat.emissiveIntensity = 1.4;
        carModel.hazardLightMat.emissiveIntensity = hazardBlink;
        driverUmbrella.visible = isRain;
        driverCam.cameraGroup.visible = true;
        carState.driverPos.yaw = lerpAngle(carState.driverPos.yaw, Math.PI, safeDt * 6.5);
        carState.timer -= safeDt;
        updateArticulatedNpcPose(driverRig, safeDt, {
          mode: 'photo_pose',
          elapsed,
          phase: 0.7,
          holdingLeftProp: isRain,
          lookUpPitch: -0.2,
        });
        if (!isRain && ((carState.timer > 3.8 && carState.timer < 4.02) || (carState.timer > 1.5 && carState.timer < 1.72))) {
          driverCam.flashMat.opacity = 0.95;
        } else {
          driverCam.flashMat.opacity = 0;
        }
        driverRig.root.position.set(carState.driverPos.x, GROUND_Y, carState.driverPos.z);
        driverRig.root.rotation.y = carState.driverPos.yaw;
        if (carState.timer <= 0) {
          driverCam.cameraGroup.visible = false;
          driverCam.flashMat.opacity = 0;
          carState.phase = 'driver_return';
        }
      } else if (carState.phase === 'driver_return') {
        carModel.brakeLightMat.emissiveIntensity = 1.4;
        carModel.hazardLightMat.emissiveIntensity = hazardBlink;
        driverUmbrella.visible = isRain;
        const backAtDoor = stepToward(carState.driverPos, carState.x + 0.2, carState.z - 1.12, 1.25, safeDt);
        updateArticulatedNpcPose(driverRig, safeDt, {
          mode: 'walk',
          elapsed,
          phase: 0.7,
          speed: 1.25,
          holdingLeftProp: isRain,
        });
        driverRig.root.position.set(carState.driverPos.x, GROUND_Y, carState.driverPos.z);
        driverRig.root.rotation.y = carState.driverPos.yaw;
        if (backAtDoor) {
          driverRig.root.visible = false;
          carState.wpIdx = 0;
          carState.speed = 1.5;
          carState.phase = 'drive_away_l_junction';
        }
      } else if (carState.phase === 'drive_away_l_junction') {
        carModel.brakeLightMat.emissiveIntensity = 0.22;
        carModel.hazardLightMat.emissiveIntensity = 0.0;
        carState.speed = Math.min(6.6, carState.speed + safeDt * 3.4);
        const [tx, tz] = exitWaypoints[carState.wpIdx];
        const dx = tx - carState.x;
        const dz = tz - carState.z;
        const dist = Math.hypot(dx, dz);
        const step = Math.min(dist, carState.speed * safeDt);
        if (dist > 0.01) {
          carState.x += (dx / dist) * step;
          carState.z += (dz / dist) * step;
          carState.yaw = lerpAngle(carState.yaw, Math.atan2(dx, dz), safeDt * 5.2);
          carState.wheelAngle += step / 0.34;
        }
        if (dist - step < 0.2) {
          carState.wpIdx++;
          if (carState.wpIdx >= exitWaypoints.length) {
            carState.phase = 'cooldown';
            carState.cycleIndex++;
            // Deterministic rare interval strictly within 40-70s (46s / 58s / 66s)
            carState.timer = 46 + ((carState.cycleIndex * 11) % 23);
            carModel.root.visible = false;
          }
        }
      }

      if (carModel.root.visible) {
        carModel.root.position.set(carState.x, 0.068, carState.z);
        carModel.root.rotation.y = carState.yaw;
        for (let w = 0; w < carModel.wheels.length; w++) {
          carModel.wheels[w].rotation.x = carState.wheelAngle;
        }
      }
    },
  };
}
