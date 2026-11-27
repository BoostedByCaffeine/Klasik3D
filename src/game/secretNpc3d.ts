import * as THREE from 'three';
import { SecretNpcAppearance, SecretNpcModelVariant } from './sceneryData';

export interface SecretNpcRigTargets {
  torsoGroup: THREE.Group;
  neckJoint: THREE.Group;
  leftArmJoint?: THREE.Group;
  rightArmJoint?: THREE.Group;
  leftHipJoint: THREE.Group;
  rightHipJoint: THREE.Group;
  leftKneeJoint: THREE.Group;
  rightKneeJoint: THREE.Group;
  skinMat: THREE.MeshStandardMaterial;
  jacketMat: THREE.MeshStandardMaterial;
  denimMat: THREE.MeshStandardMaterial;
  shoeMat: THREE.MeshStandardMaterial;
  hairMat?: THREE.MeshStandardMaterial;
}

/**
 * Pure helper to determine whether the Secret NPC's upper hair crown should be hidden
 * so zero hair polygons ever clip through the Polo RL baseball cap (hood always rests down).
 */
export function resolveSecretNpcHairVisibility(
  appearance: Pick<SecretNpcAppearance, 'wearsCap' | 'hoodUp'>
): {
  showHairCrown: boolean;
  showUnderCapTrim: boolean;
} {
  return {
    showHairCrown: !appearance.wearsCap && !appearance.hoodUp,
    showUnderCapTrim: true,
  };
}

/**
 * Applies the refined stylized semi-realistic Secret NPC ("Anton" / "Beb" / "Duminiki") look:
 * - Natural semi-realistic facial silhouette (no forced blocky jaw cubes), warm tan complexion (#C6936B),
 *   groomed arched brows, subtle mustache, and flush brushed-silver stud earrings
 * - Dual-state cap-safe jet-black textured layered male haircut (#18181A):
 *     * `hairCrownGroup` (sculpted rounded crown + layered side-swept fringe strands) hidden cleanly under cap
 *     * `hairUnderCapGroup` (tapered temples & clean nape strictly below cap brim)
 * - Tailored black-and-white colorblock windbreaker (#F2F2F2 / #1C1C20) with neatly folded DOWN hood resting
 *   behind the collar, drawcord aglets, and thin crimson (#C83232) chest zipper + metallic pull
 *   (or 25% fitted charcoal crew tee #52555B on clear non-winter days)
 * - Relaxed-taper light-wash denim (#B8C9DC) & sculpted black low-top sneakers with white midsole & stripes
 * - Sleek university ID lanyard + metallic clip + silver wristwatch (#D0D5DD)
 * - 40% chance caramel Polo RL baseball cap (#A66B3C + #1B2845 embroidered emblem)
 */
export function applySecretNpcLookToRig(
  rig: SecretNpcRigTargets,
  appearance: SecretNpcAppearance
): void {
  const { torsoGroup, neckJoint, leftHipJoint, rightHipJoint, leftKneeJoint, rightKneeJoint } = rig;

  // Skin, denim, shoes, hair base materials
  rig.skinMat.color.setHex(0xc6936b);
  rig.skinMat.roughness = 0.52;
  rig.denimMat.color.setHex(0xb8c9dc);
  rig.denimMat.roughness = 0.78;
  rig.shoeMat.color.setHex(0x16161a);
  rig.shoeMat.roughness = 0.44;
  if (rig.hairMat) {
    rig.hairMat.color.setHex(0x18181a);
    rig.hairMat.roughness = 0.68;
  }

  // Relaxed-taper light-wash denim fullness + sculpted sneaker midsole & side accent stripes
  const relaxedDenimMat = new THREE.MeshStandardMaterial({ color: 0xb8c9dc, roughness: 0.8 });
  const whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.38 });
  const cuffShadowMat = new THREE.MeshStandardMaterial({ color: 0x9ab0c7, roughness: 0.84 });

  [leftHipJoint, rightHipJoint].forEach((hip) => {
    const thighDrape = new THREE.Mesh(
      new THREE.CylinderGeometry(0.077, 0.068, 0.275, 12),
      relaxedDenimMat
    );
    thighDrape.position.y = -0.14;
    hip.add(thighDrape);
  });

  [leftKneeJoint, rightKneeJoint].forEach((knee) => {
    const calfDrape = new THREE.Mesh(
      new THREE.CylinderGeometry(0.066, 0.058, 0.235, 12),
      relaxedDenimMat
    );
    calfDrape.position.y = -0.118;
    knee.add(calfDrape);

    // Subtle folded denim hem cuff right above sneaker collar
    const hemCuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.061, 0.061, 0.022, 12),
      cuffShadowMat
    );
    hemCuff.position.y = -0.228;
    knee.add(hemCuff);

    // Clean white sneaker midsole + crisp dual side stripes
    const midsole = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.02, 0.184), whiteTrimMat);
    midsole.position.set(0, -0.275, 0.032);
    knee.add(midsole);

    [-0.014, 0.014].forEach((sz) => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.099, 0.011, 0.016), whiteTrimMat);
      stripe.position.set(0, -0.252, 0.028 + sz);
      stripe.rotation.x = 0.35;
      knee.add(stripe);
    });
  });

  const windbreakerDarkMat = new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.46, metalness: 0.06 });
  const windbreakerWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 });
  const crimsonAccentMat = new THREE.MeshStandardMaterial({ color: 0xc83232, roughness: 0.36 });
  const silverHardwareMat = new THREE.MeshStandardMaterial({
    color: 0xd0d5dd,
    metalness: 0.88,
    roughness: 0.18,
  });

  // Top: Tailored colorblock windbreaker (ALWAYS hood down!) OR fitted charcoal crew tee
  if (appearance.wearsCharcoalTee) {
    rig.jacketMat.color.setHex(0x52555b);
    rig.jacketMat.roughness = 0.78;
    // Crisp crew-neck ribbed collar
    const crewRib = new THREE.Mesh(
      new THREE.TorusGeometry(0.076, 0.012, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0x45484e, roughness: 0.84 })
    );
    crewRib.rotation.x = Math.PI / 2 + 0.12;
    crewRib.position.set(0, 0.478, 0.012);
    torsoGroup.add(crewRib);
  } else {
    rig.jacketMat.color.setHex(0x1c1c20);
    rig.jacketMat.roughness = 0.46;

    // Sculpted upper white colorblock yoke contouring naturally across chest & shoulders
    const upperWhiteYoke = new THREE.Mesh(
      new THREE.CylinderGeometry(0.186, 0.18, 0.205, 18),
      windbreakerWhiteMat
    );
    upperWhiteYoke.scale.set(1.13, 1, 0.8);
    upperWhiteYoke.position.set(0, 0.365, 0);
    torsoGroup.add(upperWhiteYoke);

    // Subtle crisp piping seam separating white yoke & matte obsidian lower body
    const seamLine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.182, 0.182, 0.012, 18),
      windbreakerDarkMat
    );
    seamLine.scale.set(1.135, 1, 0.805);
    seamLine.position.set(0, 0.26, 0);
    torsoGroup.add(seamLine);

    // Thin crimson (#C83232) vertical chest zipper + metallic zipper pull
    const crimsonZip = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.435, 0.018),
      crimsonAccentMat
    );
    crimsonZip.position.set(0, 0.255, 0.148);
    torsoGroup.add(crimsonZip);

    const zipPull = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.024, 0.012), silverHardwareMat);
    zipPull.position.set(0, 0.445, 0.158);
    torsoGroup.add(zipPull);

    // Tailored stand collar
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.086, 0.094, 0.056, 16),
      windbreakerDarkMat
    );
    collar.position.set(0, 0.488, -0.002);
    torsoGroup.add(collar);

    // HOOD ALWAYS DOWN: Neatly folded resting hood draped cleanly behind the collar on the upper back
    const downHoodGroup = new THREE.Group();
    downHoodGroup.name = 'secret_npc_hood_down';
    const hoodRollMain = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.036, 10, 18, Math.PI * 1.15),
      windbreakerDarkMat
    );
    hoodRollMain.rotation.x = Math.PI / 2 + 0.28;
    hoodRollMain.rotation.z = Math.PI * 0.925;
    hoodRollMain.position.set(0, 0.458, -0.048);
    downHoodGroup.add(hoodRollMain);

    const hoodBackDrape = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), windbreakerDarkMat);
    hoodBackDrape.scale.set(1.25, 0.56, 0.62);
    hoodBackDrape.position.set(0, 0.415, -0.145);
    downHoodGroup.add(hoodBackDrape);

    // Subtle matte drawcords & silver aglets resting cleanly on upper chest
    [-0.034, 0.034].forEach((dx) => {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.095, 6), windbreakerDarkMat);
      cord.position.set(dx, 0.425, 0.152);
      downHoodGroup.add(cord);
      const aglet = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.014, 6), silverHardwareMat);
      aglet.position.set(dx, 0.376, 0.152);
      downHoodGroup.add(aglet);
    });
    torsoGroup.add(downHoodGroup);

    // Elasticized windbreaker hem & fitted sleeve cuffs
    const hemBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.162, 0.158, 0.032, 18),
      windbreakerDarkMat
    );
    hemBand.scale.set(1.12, 1, 0.79);
    hemBand.position.y = 0.02;
    torsoGroup.add(hemBand);
  }

  // Sleek University ID Lanyard + Clipped ID Card on chest
  const lanyardMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.62 });
  const lanyardL = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.23, 0.009), lanyardMat);
  lanyardL.position.set(-0.038, 0.365, 0.154);
  lanyardL.rotation.z = 0.19;
  torsoGroup.add(lanyardL);
  const lanyardR = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.23, 0.009), lanyardMat);
  lanyardR.position.set(0.038, 0.365, 0.154);
  lanyardR.rotation.z = -0.19;
  torsoGroup.add(lanyardR);
  const idClip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.018, 0.012), silverHardwareMat);
  idClip.position.set(0, 0.252, 0.158);
  torsoGroup.add(idClip);
  const idCard = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.074, 0.008),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32 })
  );
  idCard.position.set(0, 0.208, 0.159);
  torsoGroup.add(idCard);
  const idHeader = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.018, 0.0095),
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 })
  );
  idHeader.position.set(0, 0.235, 0.16);
  torsoGroup.add(idHeader);

  // Silver Wristwatch (#D0D5DD) with dark dial face seated cleanly on left wrist (elbowJoint local y = -0.185)
  if (rig.leftArmJoint) {
    const watchBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.039, 0.039, 0.022, 14),
      silverHardwareMat
    );
    watchBand.position.set(0, -0.185, 0);
    rig.leftArmJoint.add(watchBand);
    const watchDial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.006, 12),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.5 })
    );
    watchDial.rotation.z = Math.PI / 2;
    watchDial.position.set(-0.04, -0.185, 0.004);
    rig.leftArmJoint.add(watchDial);
  }

  // === REFINED NATURAL FACIAL FEATURES (ZERO BLOCKY FORCED JAW BOXES!) & LAYERED HAIR ===
  const jetHairMat = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.68 });

  // Clean subtly arched dark eyebrows (tapered, natural fit over orbital ridge)
  [-0.052, 0.052].forEach((bx) => {
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0052, 0.036, 4, 8), jetHairMat);
    brow.rotation.z = Math.PI / 2 + (bx < 0 ? 0.07 : -0.07);
    brow.rotation.y = bx < 0 ? -0.16 : 0.16;
    brow.position.set(bx, 0.244, 0.153);
    neckJoint.add(brow);
  });

  // Subtle groomed mustache hugging upper lip cleanly (curved capsule rather than sharp block)
  const mustache = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.046, 4, 8), jetHairMat);
  mustache.rotation.z = Math.PI / 2;
  mustache.position.set(0, 0.155, 0.158);
  neckJoint.add(mustache);

  // Flush brushed-silver stud earrings on both ear lobes
  [-0.158, 0.158].forEach((ex) => {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.0078, 8, 8), silverHardwareMat);
    stud.position.set(ex, 0.162, 0.006);
    neckJoint.add(stud);
  });

  const hairVis = resolveSecretNpcHairVisibility({ ...appearance, hoodUp: false });

  // 1) hairUnderCapGroup: sculpted tapered low sideburns + contoured nape strictly BELOW cap brim
  const hairUnderCapGroup = new THREE.Group();
  hairUnderCapGroup.name = 'secret_npc_hair_under_cap';
  [-0.144, 0.144].forEach((sx) => {
    const templeFade = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), jetHairMat);
    templeFade.scale.set(0.45, 1.35, 1.15);
    templeFade.position.set(sx, 0.205, -0.02);
    hairUnderCapGroup.add(templeFade);
  });
  const contouredNape = new THREE.Mesh(
    new THREE.SphereGeometry(0.154, 14, 10, Math.PI * 0.65, Math.PI * 0.7, Math.PI * 0.36, Math.PI * 0.34),
    jetHairMat
  );
  contouredNape.position.set(0, 0.2, -0.012);
  hairUnderCapGroup.add(contouredNape);

  const subtleTempleHairline = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.011, 0.15, 4, 10),
    jetHairMat
  );
  subtleTempleHairline.rotation.z = Math.PI / 2;
  subtleTempleHairline.position.set(0, 0.252, 0.132);
  hairUnderCapGroup.add(subtleTempleHairline);

  hairUnderCapGroup.visible = hairVis.showUnderCapTrim;
  neckJoint.add(hairUnderCapGroup);

  // 2) hairCrownGroup: sculpted multi-layered modern textured short male haircut (ZERO flat boxes!)
  const hairCrownGroup = new THREE.Group();
  hairCrownGroup.name = 'secret_npc_hair_crown';

  // Full contoured crown volume
  const crownBase = new THREE.Mesh(
    new THREE.SphereGeometry(0.171, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
    jetHairMat
  );
  crownBase.scale.set(0.99, 1.03, 1.04);
  crownBase.position.set(0, 0.218, -0.008);
  hairCrownGroup.add(crownBase);

  // Soft layered textured top & side-swept fringe locks
  const layeredLocks: Array<[number, number, number, number, number, number, number, number]> = [
    [-0.068, 0.335, 0.045, 0.052, 0.044, 0.095, 0.12, 0.24],
    [0.0, 0.348, 0.032, 0.062, 0.048, 0.105, 0.06, 0.08],
    [0.068, 0.334, 0.042, 0.052, 0.044, 0.092, 0.12, -0.22],
    [-0.055, 0.292, 0.112, 0.046, 0.028, 0.058, 0.35, 0.22],
    [0.014, 0.296, 0.122, 0.052, 0.028, 0.056, 0.38, -0.14],
    [0.072, 0.286, 0.102, 0.04, 0.025, 0.052, 0.32, -0.28],
    [0.0, 0.312, -0.085, 0.095, 0.055, 0.078, -0.22, 0],
  ];
  for (const [lx, ly, lz, sx, sy, sz, rx, rz] of layeredLocks) {
    const lock = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), jetHairMat);
    lock.scale.set(sx, sy, sz);
    lock.position.set(lx, ly, lz);
    lock.rotation.set(rx, 0, rz);
    hairCrownGroup.add(lock);
  }

  hairCrownGroup.visible = hairVis.showHairCrown;
  neckJoint.add(hairCrownGroup);

  // 3) Headwear: Refined Caramel Polo RL Baseball Cap (hood is ALWAYS down!)
  if (appearance.wearsCap) {
    const capMat = new THREE.MeshStandardMaterial({ color: 0xa66b3c, roughness: 0.72 });
    const capTrimMat = new THREE.MeshStandardMaterial({ color: 0x8a5429, roughness: 0.78 });

    const capDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.178, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.54),
      capMat
    );
    capDome.scale.set(1.0, 0.96, 1.03);
    capDome.position.set(0, 0.236, -0.006);
    neckJoint.add(capDome);

    const capBand = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.009, 8, 22), capTrimMat);
    capBand.rotation.x = Math.PI / 2 - 0.05;
    capBand.position.set(0, 0.244, -0.004);
    neckJoint.add(capBand);

    const capButton = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), capTrimMat);
    capButton.position.set(0, 0.408, -0.006);
    neckJoint.add(capButton);

    const capBrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.172, 0.176, 0.013, 18, 1, false, -0.78, 1.56),
      capMat
    );
    capBrim.scale.set(1.0, 1.0, 1.24);
    capBrim.position.set(0, 0.252, 0.078);
    capBrim.rotation.x = 0.12;
    neckJoint.add(capBrim);

    // Crisp Navy (#1B2845) embroidered Polo RL pony emblem centered on front cap crown
    const ponyEmblem = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.028, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x1b2845, roughness: 0.48 })
    );
    ponyEmblem.position.set(0, 0.304, 0.178);
    neckJoint.add(ponyEmblem);
  }
}

let cachedHeartTexture: THREE.CanvasTexture | null = null;

/**
 * Creates a crisp floating warm heart sprite rendered above the Secret NPC upon serve!
 */
export function createSecretNpcHeartSprite(): THREE.Sprite {
  if (!cachedHeartTexture) {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2 + 4);
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = 'rgba(244,63,94,0.65)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, 22);
      ctx.bezierCurveTo(-34, -2, -32, -30, -14, -30);
      ctx.bezierCurveTo(-4, -30, 0, -21, 0, -16);
      ctx.bezierCurveTo(0, -21, 4, -30, 14, -30);
      ctx.bezierCurveTo(32, -30, 34, -2, 0, 22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    cachedHeartTexture = new THREE.CanvasTexture(canvas);
    cachedHeartTexture.colorSpace = THREE.SRGBColorSpace;
  }

  const mat = new THREE.SpriteMaterial({
    map: cachedHeartTexture,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(0.42, 0.42, 1);
  return sp;
}

/**
 * Uniform cafe world scale for the 4 imported Secret NPC `.js` 3D assets
 * (~1.73m raw height -> ~1.56m cafe height, flush with customers & doorway clearance).
 */
export const SECRET_NPC_ASSET_SCALE = 0.9;

export interface SecretNpcMeshCounts {
  pelvis: number;
  torso: number;
  neck: number;
  leftUpperArm: number;
  leftForearm: number;
  rightUpperArm: number;
  rightForearm: number;
  leftThigh: number;
  leftShin: number;
  rightThigh: number;
  rightShin: number;
  total: number;
}

export interface SecretNpcAssetRig {
  variant: SecretNpcModelVariant;
  root: THREE.Group;
  pelvisPivot: THREE.Group;
  torsoPivot: THREE.Group;
  neckPivot: THREE.Group;
  leftShoulderPivot: THREE.Group;
  leftElbowPivot: THREE.Group;
  rightShoulderPivot: THREE.Group;
  rightElbowPivot: THREE.Group;
  leftHipPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  rightHipPivot: THREE.Group;
  rightKneePivot: THREE.Group;
  basePelvisY: number;
  meshCounts: SecretNpcMeshCounts;
  phoneMesh: THREE.Mesh;
}

export interface SecretNpcPoseInput {
  walkBlend: number;
  seatedBlend: number;
  walkPhase: number;
  elapsed: number;
  seed: number;
  pelvisYOffset: number;
  pelvisRollZ: number;
  torsoYawY: number;
  torsoRollZ: number;
  neckPitchX: number;
  neckYawY: number;
  neckRollZ: number;
  leftHipX: number;
  rightHipX: number;
  leftKneeX: number;
  rightKneeX: number;
  leftShoulderX: number;
  leftElbowX: number;
  rightShoulderX: number;
  rightElbowX: number;
  isWaving?: boolean;
  holdingPhone?: boolean;
}

type SecretNpcFactoryFn = (threeRef?: typeof THREE) => THREE.Group;

const secretNpcFactoryCache: Partial<Record<SecretNpcModelVariant, Promise<SecretNpcFactoryFn>>> = {};

/**
 * Lazily imports one of the 4 exact Secret NPC `.js` asset modules with Vite code-splitting
 * so the main bundle stays fast while every variant renders its authentic imported geometry.
 */
export function loadSecretNpcFactory(variant: SecretNpcModelVariant): Promise<SecretNpcFactoryFn> {
  const existing = secretNpcFactoryCache[variant];
  if (existing) return existing;

  const loader = (async (): Promise<SecretNpcFactoryFn> => {
    switch (variant) {
      case 'hat': {
        const mod = await import('../../secretnpchat.js');
        return mod.default as SecretNpcFactoryFn;
      }
      case 'helmet': {
        const mod = await import('../../secretnpchelmet.js');
        return mod.default as SecretNpcFactoryFn;
      }
      case 'hike': {
        const mod = await import('../../secretnpchike.js');
        return mod.default as SecretNpcFactoryFn;
      }
      case 'default':
      default: {
        const mod = await import('../../secretnpc.js');
        return mod.default as SecretNpcFactoryFn;
      }
    }
  })();

  secretNpcFactoryCache[variant] = loader;
  return loader;
}

const _partBox = new THREE.Box3();
const _partCenter = new THREE.Vector3();

/**
 * Automatically partitions the 88-122 sub-meshes of an imported Secret NPC `.js` asset
 * into an 11-joint articulated humanoid pivot hierarchy while preserving 100% of every
 * original triangle, material, and world-space rest transform.
 */
export function partitionSecretNpcGroupToRig(
  rawGroup: THREE.Group,
  variant: SecretNpcModelVariant
): SecretNpcAssetRig {
  rawGroup.position.set(0, 0, 0);
  rawGroup.rotation.set(0, 0, 0);
  rawGroup.scale.set(1, 1, 1);
  rawGroup.updateMatrixWorld(true);

  const fullBounds = new THREE.Box3().setFromObject(rawGroup);
  const footFloorOffset = Number.isFinite(fullBounds.min.y) ? -fullBounds.min.y : 0;

  const root = new THREE.Group();
  root.name = `secretNpcAsset_${variant}`;
  root.userData.isSecretNpc = true;
  root.userData.secretNpcVariant = variant;

  const basePelvisY = 0.86 + footFloorOffset;
  const pelvisPivot = new THREE.Group();
  pelvisPivot.position.set(0, basePelvisY, 0);
  root.add(pelvisPivot);

  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.04, 0); // raw y = 0.90
  pelvisPivot.add(torsoPivot);

  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.54, 0.01); // raw y = 1.44
  torsoPivot.add(neckPivot);

  // Match scene3d.ts side convention: left = -X, right = +X (character faces +Z)
  const leftShoulderPivot = new THREE.Group();
  leftShoulderPivot.position.set(-0.18, 0.44, 0.01); // raw (-0.18, 1.34, 0.01)
  torsoPivot.add(leftShoulderPivot);

  const leftElbowPivot = new THREE.Group();
  leftElbowPivot.position.set(-0.04, -0.25, 0); // raw (-0.22, 1.09, 0.01)
  leftShoulderPivot.add(leftElbowPivot);

  const rightShoulderPivot = new THREE.Group();
  rightShoulderPivot.position.set(0.18, 0.44, 0.01); // raw (0.18, 1.34, 0.01)
  torsoPivot.add(rightShoulderPivot);

  const rightElbowPivot = new THREE.Group();
  rightElbowPivot.position.set(0.04, -0.25, 0); // raw (0.22, 1.09, 0.01)
  rightShoulderPivot.add(rightElbowPivot);

  const leftHipPivot = new THREE.Group();
  leftHipPivot.position.set(-0.1, 0, 0); // raw (-0.10, 0.86, 0)
  pelvisPivot.add(leftHipPivot);

  const leftKneePivot = new THREE.Group();
  leftKneePivot.position.set(-0.01, -0.39, 0); // raw (-0.11, 0.47, 0)
  leftHipPivot.add(leftKneePivot);

  const rightHipPivot = new THREE.Group();
  rightHipPivot.position.set(0.1, 0, 0); // raw (0.10, 0.86, 0)
  pelvisPivot.add(rightHipPivot);

  const rightKneePivot = new THREE.Group();
  rightKneePivot.position.set(0.01, -0.39, 0); // raw (0.11, 0.47, 0)
  rightHipPivot.add(rightKneePivot);

  // Update world matrices at 1:1 scale before using pivot.attach(mesh)
  root.updateMatrixWorld(true);

  const meshes: THREE.Mesh[] = [];
  rawGroup.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      meshes.push(obj as THREE.Mesh);
    }
  });

  const meshCounts: SecretNpcMeshCounts = {
    pelvis: 0,
    torso: 0,
    neck: 0,
    leftUpperArm: 0,
    leftForearm: 0,
    rightUpperArm: 0,
    rightForearm: 0,
    leftThigh: 0,
    leftShin: 0,
    rightThigh: 0,
    rightShin: 0,
    total: 0,
  };

  for (const mesh of meshes) {
    _partBox.setFromObject(mesh);
    _partBox.getCenter(_partCenter);
    const cx = _partCenter.x;
    const cy = _partCenter.y;
    const minY = _partBox.min.y;
    const maxY = _partBox.max.y;

    // Preserve exact shadow/material feel while enabling grounded cafe shadows
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Apply subtle vertical grounding lift if raw model wasn't strictly flush at y = 0
    if (footFloorOffset !== 0) {
      mesh.updateMatrixWorld(true);
    }

    let targetPivot: THREE.Group;
    if (minY >= 1.41 || cy >= 1.44) {
      targetPivot = neckPivot;
      meshCounts.neck++;
    } else if (Math.abs(cx) >= 0.185 && maxY <= 1.4 && minY >= 0.65) {
      if (cx < 0) {
        if (cy >= 1.1) {
          targetPivot = leftShoulderPivot;
          meshCounts.leftUpperArm++;
        } else {
          targetPivot = leftElbowPivot;
          meshCounts.leftForearm++;
        }
      } else {
        if (cy >= 1.1) {
          targetPivot = rightShoulderPivot;
          meshCounts.rightUpperArm++;
        } else {
          targetPivot = rightElbowPivot;
          meshCounts.rightForearm++;
        }
      }
    } else if (maxY <= 0.92 && Math.abs(cx) >= 0.045 && Math.abs(cx) <= 0.205 && minY < 0.68) {
      if (cx < 0) {
        if (maxY >= 0.49) {
          targetPivot = leftHipPivot;
          meshCounts.leftThigh++;
        } else {
          targetPivot = leftKneePivot;
          meshCounts.leftShin++;
        }
      } else {
        if (maxY >= 0.49) {
          targetPivot = rightHipPivot;
          meshCounts.rightThigh++;
        } else {
          targetPivot = rightKneePivot;
          meshCounts.rightShin++;
        }
      }
    } else if (maxY <= 0.96 && minY >= 0.76 && Math.abs(cx) < 0.05) {
      targetPivot = pelvisPivot;
      meshCounts.pelvis++;
    } else {
      targetPivot = torsoPivot;
      meshCounts.torso++;
    }

    targetPivot.attach(mesh);
    if (footFloorOffset !== 0) {
      mesh.position.y += footFloorOffset;
    }
    meshCounts.total++;
  }

  // Dedicated palm-anchored smartphone inside leftElbowPivot so the phone NEVER floats away from the Secret NPC's hand
  const phoneBodyMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.25,
    metalness: 0.45,
  });
  const phoneScreenMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.72,
    roughness: 0.16,
  });
  const secretPhone = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.122, 0.012), phoneBodyMat);
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.106), phoneScreenMat);
  phoneScreen.position.z = 0.0068;
  secretPhone.add(phoneScreen);
  // Seated directly in the Secret NPC's left palm (raw forearm length ~0.27m below leftElbowPivot)
  secretPhone.position.set(0.012, -0.275, 0.042);
  secretPhone.rotation.set(Math.PI * 0.36, -0.14, 0.08);
  secretPhone.visible = false;
  secretPhone.name = 'secret_npc_hand_phone';
  leftElbowPivot.add(secretPhone);

  root.scale.setScalar(SECRET_NPC_ASSET_SCALE);
  return {
    variant,
    root,
    pelvisPivot,
    torsoPivot,
    neckPivot,
    leftShoulderPivot,
    leftElbowPivot,
    rightShoulderPivot,
    rightElbowPivot,
    leftHipPivot,
    leftKneePivot,
    rightHipPivot,
    rightKneePivot,
    basePelvisY,
    meshCounts,
    phoneMesh: secretPhone,
  };
}

/**
 * Loads the exact `.js` module for the requested Secret NPC variant and returns
 * a ready-to-animate 11-joint articulated rig.
 */
export async function buildSecretNpcAssetRig(
  variant: SecretNpcModelVariant
): Promise<SecretNpcAssetRig> {
  const factory = await loadSecretNpcFactory(variant);
  const rawGroup = factory(THREE);
  return partitionSecretNpcGroupToRig(rawGroup, variant);
}

/**
 * Applies lively walk stride, torso sway, organic breathing, and subtle limb flex
 * to the partitioned exact `.js` Secret NPC rig while keeping all rigid sub-mesh seams clean.
 */
export function updateSecretNpcAssetPose(
  rig: SecretNpcAssetRig,
  pose: SecretNpcPoseInput
): void {
  const wb = THREE.MathUtils.clamp(pose.walkBlend, 0, 1);
  const sb = THREE.MathUtils.clamp(pose.seatedBlend, 0, 1);
  const s = Math.sin(pose.walkPhase);
  const c = Math.cos(pose.walkPhase);
  const breath = Math.sin(pose.elapsed * 2.15 + pose.seed * 0.73);
  const sway = Math.sin(pose.elapsed * 1.1 + pose.seed * 1.3);

  // Pelvis vertical bounce (walk stride + gentle breathing + seated drop)
  const walkBounce = Math.abs(s) * 0.044 * wb;
  const seatDrop = -0.22 * sb;
  const externalLift = THREE.MathUtils.clamp(pose.pelvisYOffset * 1.1, -0.24, 0.08);
  const activeVertical = sb > 0.05 ? seatDrop : walkBounce + externalLift * 0.35;
  rig.pelvisPivot.position.y = rig.basePelvisY + activeVertical + breath * 0.006 * (1 - wb);

  // Hip roll & subtle lateral stride weight shift
  rig.pelvisPivot.rotation.z =
    THREE.MathUtils.clamp(pose.pelvisRollZ * 1.15 + s * 0.032 * wb, -0.1, 0.1) +
    sway * 0.015 * (1 - wb) * (1 - sb);
  rig.pelvisPivot.rotation.y = s * 0.055 * wb;

  // Torso counter-rotation, lively forward lean while striding, and organic chest breathing
  rig.torsoPivot.rotation.y = THREE.MathUtils.clamp(
    pose.torsoYawY * 1.15 - s * 0.085 * wb,
    -0.22,
    0.22
  );
  rig.torsoPivot.rotation.z = THREE.MathUtils.clamp(
    pose.torsoRollZ - s * 0.028 * wb + sway * 0.018 * (1 - wb),
    -0.12,
    0.12
  );
  rig.torsoPivot.rotation.x = 0.045 * wb + breath * 0.014;
  const chestScale = 1 + breath * 0.012;
  rig.torsoPivot.scale.set(chestScale, 1 + breath * 0.006, chestScale);

  // Natural head tracking + micro-nod rhythm
  rig.neckPivot.rotation.x = THREE.MathUtils.clamp(
    pose.neckPitchX + breath * 0.018 + Math.abs(s) * 0.025 * wb,
    -0.32,
    0.34
  );
  rig.neckPivot.rotation.y = THREE.MathUtils.clamp(
    pose.neckYawY + s * 0.045 * wb,
    -0.52,
    0.52
  );
  rig.neckPivot.rotation.z = THREE.MathUtils.clamp(
    pose.neckRollZ + sway * 0.022 * (1 - wb),
    -0.18,
    0.18
  );

  // Legs: lively stride & knee flex while walking, clean 72-deg flex when seated
  const seatedHip = -1.18 * sb;
  const seatedKnee = 1.16 * sb;
  const walkLeftHip = THREE.MathUtils.clamp(pose.leftHipX * 0.92 + s * 0.08 * wb, -0.62, 0.62);
  const walkRightHip = THREE.MathUtils.clamp(pose.rightHipX * 0.92 - s * 0.08 * wb, -0.62, 0.62);
  const walkLeftKnee = THREE.MathUtils.clamp(
    Math.max(pose.leftKneeX * 0.88, Math.max(0, -c) * 0.48 * wb),
    0,
    0.72
  );
  const walkRightKnee = THREE.MathUtils.clamp(
    Math.max(pose.rightKneeX * 0.88, Math.max(0, c) * 0.48 * wb),
    0,
    0.72
  );

  rig.leftHipPivot.rotation.x = THREE.MathUtils.lerp(walkLeftHip, seatedHip, sb);
  rig.rightHipPivot.rotation.x = THREE.MathUtils.lerp(walkRightHip, seatedHip, sb);
  rig.leftKneePivot.rotation.x = THREE.MathUtils.lerp(walkLeftKnee, seatedKnee, sb);
  rig.rightKneePivot.rotation.x = THREE.MathUtils.lerp(walkRightKnee, seatedKnee, sb);

  // Arms: lively stride swing, natural slight elbow flex, palm-anchored phone pose, or friendly overhead wave!
  rig.phoneMesh.visible = Boolean(pose.holdingPhone) && !pose.isWaving;
  if (pose.isWaving) {
    rig.rightShoulderPivot.rotation.x = -2.25;
    rig.rightShoulderPivot.rotation.z = 0.24 + Math.sin(pose.elapsed * 9.5) * 0.14;
    rig.rightElbowPivot.rotation.x = -0.38 + Math.sin(pose.elapsed * 9.5) * 0.34;
    rig.leftShoulderPivot.rotation.x = -0.12 + breath * 0.025;
    rig.leftShoulderPivot.rotation.z = -0.05;
    rig.leftElbowPivot.rotation.x = -0.22;
  } else {
    const idleArmFlex = -0.06 + breath * 0.02;
    if (pose.holdingPhone) {
      // Bring left forearm comfortably forward toward eye level so palm & phone align naturally
      rig.leftShoulderPivot.rotation.x = THREE.MathUtils.clamp(pose.leftShoulderX, -1.35, -0.45);
      rig.leftShoulderPivot.rotation.z = 0.12;
      rig.leftElbowPivot.rotation.x = THREE.MathUtils.clamp(pose.leftElbowX, -1.15, -0.45);
    } else {
      rig.leftShoulderPivot.rotation.x = THREE.MathUtils.clamp(
        pose.leftShoulderX * 0.86 + idleArmFlex * (1 - wb),
        -1.45,
        0.62
      );
      rig.leftShoulderPivot.rotation.z = -0.04 - Math.abs(s) * 0.025 * wb;
      rig.leftElbowPivot.rotation.x = THREE.MathUtils.clamp(
        pose.leftElbowX * 0.82 - 0.08 * wb,
        -1.15,
        0.08
      );
    }

    rig.rightShoulderPivot.rotation.x = THREE.MathUtils.clamp(
      pose.rightShoulderX * 0.86 + idleArmFlex * (1 - wb),
      -1.45,
      0.62
    );
    rig.rightShoulderPivot.rotation.z = 0.04 + Math.abs(s) * 0.025 * wb;
    rig.rightElbowPivot.rotation.x = THREE.MathUtils.clamp(
      pose.rightElbowX * 0.82 - 0.08 * wb,
      -1.15,
      0.08
    );
  }
}

