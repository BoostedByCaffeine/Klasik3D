import * as THREE from 'three';
import { SecretNpcAppearance } from './sceneryData';

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
