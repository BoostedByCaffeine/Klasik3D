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
 * so zero hair polygons ever clip through the Polo RL baseball cap or rain/snow hood.
 */
export function resolveSecretNpcHairVisibility(appearance: Pick<SecretNpcAppearance, 'wearsCap' | 'hoodUp'>): {
  showHairCrown: boolean;
  showUnderCapTrim: boolean;
} {
  return {
    showHairCrown: !appearance.wearsCap && !appearance.hoodUp,
    showUnderCapTrim: true,
  };
}

/**
 * Phase 3 & 5: Applies the Secret Easter Egg NPC ("Beb" / "Anton" / "Duminiki") visual signature onto a character rig:
 * - Sculpted masculine male head/jawline, warm tan skin (#C6936B), clean brow, subtle mustache, flush silver stud earrings
 * - Dual-state cap-safe jet-black short male haircut (#18181A):
 *     * `hairCrownGroup` (textured top volume & straight fringe) automatically hidden when wearing cap or hood
 *     * `hairUnderCapGroup` (tight tapered low sideburns & nape strictly below cap brim) always clean with zero clipping
 * - Black-and-white colorblock windbreaker (#F2F2F2 / #1C1C20) with thin crimson (#C83232) vertical chest zipper
 *   (or 25% dark charcoal grey tee #595B60 on non-winter Clear days)
 * - Baggy light-wash denim jeans (#B8C9DC) & black sneakers with white stripes/soles
 * - University ID lanyard + ID card, silver wristwatch (#D0D5DD)
 * - 40% chance brown-caramel Polo RL baseball cap (#A66B3C + #1B2845 pony emblem)
 * - Automatic black hood up if capless during Rain / Snow / Always Winter
 */
export function applySecretNpcLookToRig(
  rig: SecretNpcRigTargets,
  appearance: SecretNpcAppearance
): void {
  const { torsoGroup, neckJoint, leftHipJoint, rightHipJoint, leftKneeJoint, rightKneeJoint } = rig;

  // Skin, denim, shoes, hair base materials
  rig.skinMat.color.setHex(0xc6936b);
  rig.denimMat.color.setHex(0xb8c9dc);
  rig.denimMat.roughness = 0.8;
  rig.shoeMat.color.setHex(0x141416);
  if (rig.hairMat) {
    rig.hairMat.color.setHex(0x18181a);
  }

  // Baggy light-wash denim leg fullness + white sneaker soles/stripes
  const baggyMat = new THREE.MeshStandardMaterial({ color: 0xb8c9dc, roughness: 0.82 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  [leftHipJoint, rightHipJoint].forEach((hip) => {
    const baggyThigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.076, 0.28, 10),
      baggyMat
    );
    baggyThigh.position.y = -0.14;
    hip.add(baggyThigh);
  });
  [leftKneeJoint, rightKneeJoint].forEach((knee) => {
    const baggyCalf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.074, 0.072, 0.25, 10),
      baggyMat
    );
    baggyCalf.position.y = -0.125;
    knee.add(baggyCalf);

    // White sneaker midsole + side stripes
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.022, 0.178), whiteMat);
    sole.position.set(0, -0.275, 0.03);
    knee.add(sole);
    const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.018, 0.055), whiteMat);
    sideStripe.position.set(0, -0.245, 0.025);
    knee.add(sideStripe);
  });

  // Top: Black-and-white colorblock windbreaker w/ crimson zipper OR charcoal tee
  if (appearance.wearsCharcoalTee) {
    rig.jacketMat.color.setHex(0x595b60);
    rig.jacketMat.roughness = 0.78;
  } else {
    rig.jacketMat.color.setHex(0x1c1c20);
    rig.jacketMat.roughness = 0.48;
    // Upper white colorblock chest panel (#F2F2F2)
    const upperWhite = new THREE.Mesh(
      new THREE.CylinderGeometry(0.194, 0.184, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 })
    );
    upperWhite.scale.set(1.13, 1, 0.81);
    upperWhite.position.set(0, 0.36, 0);
    torsoGroup.add(upperWhite);

    // Thin crimson (#C83232) vertical chest-zipper accent
    const crimsonZip = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.44, 0.024),
      new THREE.MeshStandardMaterial({ color: 0xc83232, roughness: 0.4 })
    );
    crimsonZip.position.set(0, 0.25, 0.154);
    torsoGroup.add(crimsonZip);

    // Windbreaker stand collar
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.095, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.5 })
    );
    collar.position.set(0, 0.49, 0);
    torsoGroup.add(collar);
  }

  // University ID Lanyard + Plastic ID Card on chest
  const lanyardMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.65 });
  const lanyardL = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.24, 0.014), lanyardMat);
  lanyardL.position.set(-0.042, 0.36, 0.158);
  lanyardL.rotation.z = 0.2;
  torsoGroup.add(lanyardL);
  const lanyardR = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.24, 0.014), lanyardMat);
  lanyardR.position.set(0.042, 0.36, 0.158);
  lanyardR.rotation.z = -0.2;
  torsoGroup.add(lanyardR);
  const idCard = new THREE.Mesh(
    new THREE.BoxGeometry(0.056, 0.078, 0.01),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
  );
  idCard.position.set(0, 0.21, 0.162);
  torsoGroup.add(idCard);
  const idHeader = new THREE.Mesh(
    new THREE.BoxGeometry(0.056, 0.02, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 })
  );
  idHeader.position.set(0, 0.238, 0.163);
  torsoGroup.add(idHeader);

  // Silver Wristwatch (#D0D5DD) on left wrist
  if (rig.leftArmJoint) {
    const watch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.044, 0.028, 12),
      new THREE.MeshStandardMaterial({ color: 0xd0d5dd, metalness: 0.85, roughness: 0.2 })
    );
    watch.position.set(0, -0.34, 0);
    rig.leftArmJoint.add(watch);
  }

  // === PHASE 3: SCULPTED MALE HEAD/JAWLINE & DUAL-STATE CAP-SAFE HAIR MESH ===
  const jetHairMat = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.72 });

  // Structured masculine jawline & chin contour seated seamlessly onto the lower head
  const maleJaw = new THREE.Mesh(new THREE.BoxGeometry(0.195, 0.095, 0.18), rig.skinMat);
  maleJaw.position.set(0, 0.128, 0.024);
  neckJoint.add(maleJaw);
  const chinPad = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.052, 0.075), rig.skinMat);
  chinPad.position.set(0, 0.098, 0.112);
  neckJoint.add(chinPad);

  // Clean masculine dark eyebrows
  [-0.052, 0.052].forEach((bx) => {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.014, 0.018), jetHairMat);
    brow.position.set(bx, 0.242, 0.156);
    brow.rotation.z = bx < 0 ? 0.05 : -0.05;
    neckJoint.add(brow);
  });

  // Subtle dark mustache hugging the upper lip
  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.013, 0.016), jetHairMat);
  mustache.position.set(0, 0.154, 0.164);
  neckJoint.add(mustache);

  // Flush silver stud earrings on both ear lobes
  const studMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.9,
    roughness: 0.15,
  });
  [-0.164, 0.164].forEach((ex) => {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 6, 6), studMat);
    stud.position.set(ex, 0.158, 0.008);
    neckJoint.add(stud);
  });

  const hairVis = resolveSecretNpcHairVisibility(appearance);

  // 1) hairUnderCapGroup: tight tapered low sideburns + clean back nape strictly BELOW the cap brim (y <= 0.235)
  const hairUnderCapGroup = new THREE.Group();
  hairUnderCapGroup.name = 'secret_npc_hair_under_cap';
  [-0.148, 0.148].forEach((sx) => {
    const sideTaper = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.082, 0.115), jetHairMat);
    sideTaper.position.set(sx, 0.195, -0.025);
    hairUnderCapGroup.add(sideTaper);
  });
  const backNape = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.055), jetHairMat);
  backNape.position.set(0, 0.185, -0.142);
  hairUnderCapGroup.add(backNape);
  // Subtle tucked low front hairline strictly beneath cap brim
  const lowBangs = new THREE.Mesh(new THREE.BoxGeometry(0.195, 0.024, 0.032), jetHairMat);
  lowBangs.position.set(0, 0.246, 0.138);
  hairUnderCapGroup.add(lowBangs);
  hairUnderCapGroup.visible = hairVis.showUnderCapTrim;
  neckJoint.add(hairUnderCapGroup);

  // 2) hairCrownGroup: full modern textured short male haircut — strictly HIDDEN when wearing cap or hood!
  const hairCrownGroup = new THREE.Group();
  hairCrownGroup.name = 'secret_npc_hair_crown';
  const crownCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.174, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
    jetHairMat
  );
  crownCap.scale.set(1.01, 0.96, 1.04);
  crownCap.position.set(0, 0.222, -0.01);
  hairCrownGroup.add(crownCap);
  // Textured modern male upper crop & clean straight-across fringe stopping above brows
  const topCrop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.068, 0.24), jetHairMat);
  topCrop.position.set(0, 0.345, 0.005);
  hairCrownGroup.add(topCrop);
  const frontFringe = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.055, 0.085), jetHairMat);
  frontFringe.position.set(0, 0.285, 0.118);
  hairCrownGroup.add(frontFringe);
  hairCrownGroup.visible = hairVis.showHairCrown;
  neckJoint.add(hairCrownGroup);

  // 3) Headwear: Caramel Polo RL Baseball Cap OR Black Weather Hood (zero hair clipping!)
  if (appearance.wearsCap) {
    const capMat = new THREE.MeshStandardMaterial({ color: 0xa66b3c, roughness: 0.72 });
    const capButtonMat = new THREE.MeshStandardMaterial({ color: 0x8a5429, roughness: 0.78 });
    const capDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.182, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.54),
      capMat
    );
    capDome.scale.set(1.01, 0.95, 1.04);
    capDome.position.set(0, 0.236, -0.006);
    neckJoint.add(capDome);

    const capButton = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), capButtonMat);
    capButton.position.set(0, 0.408, -0.006);
    neckJoint.add(capButton);

    const capBrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.174, 0.178, 0.015, 16, 1, false, -0.82, 1.64),
      capMat
    );
    capBrim.position.set(0, 0.252, 0.082);
    capBrim.rotation.x = 0.1;
    neckJoint.add(capBrim);

    // Crisp Navy (#1B2845) Polo RL pony emblem centered on the front cap crown
    const ponyEmblem = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.03, 0.012),
      new THREE.MeshStandardMaterial({ color: 0x1b2845, roughness: 0.48 })
    );
    ponyEmblem.position.set(0, 0.305, 0.181);
    neckJoint.add(ponyEmblem);
  } else if (appearance.hoodUp) {
    const hoodMat = new THREE.MeshStandardMaterial({
      color: 0x1c1c20,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });
    const hoodShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.208, 14, 12, Math.PI * 0.2, Math.PI * 1.6, 0, Math.PI * 0.72),
      hoodMat
    );
    hoodShell.rotation.y = Math.PI * 0.5;
    hoodShell.position.set(0, 0.218, -0.016);
    neckJoint.add(hoodShell);
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
