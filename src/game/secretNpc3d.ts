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
 * Phase 5: Applies the Secret Easter Egg NPC ("Beb" / "Anton" / "Duminiki") visual signature onto a character rig:
 * - Short jet-black hair (#18181A) with straight fringe
 * - Warm tan skin (#C6936B), subtle mustache, stud earrings
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

  // Jet-black short hair (#18181A) with straight fringe + subtle mustache + silver stud earrings
  const jetHairMat = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.65 });
  const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.068, 0.09), jetHairMat);
  fringe.position.set(0, 0.285, 0.115);
  neckJoint.add(fringe);

  const hairCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.172, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    jetHairMat
  );
  hairCrown.position.set(0, 0.215, -0.008);
  neckJoint.add(hairCrown);

  // Subtle mustache right above smile
  const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.012, 0.014), jetHairMat);
  mustache.position.set(0, 0.165, 0.162);
  neckJoint.add(mustache);

  // Stud earrings on both ears
  const studMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.9,
    roughness: 0.15,
  });
  [-0.165, 0.165].forEach((ex) => {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), studMat);
    stud.position.set(ex, 0.165, 0.01);
    neckJoint.add(stud);
  });

  // Cap & Weather-Smart Hood rules
  if (appearance.wearsCap) {
    // Brown-caramel Polo RL Baseball Cap (#A66B3C) + tiny Navy (#1B2845) pony emblem
    const capMat = new THREE.MeshStandardMaterial({ color: 0xa66b3c, roughness: 0.72 });
    const capDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.176, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      capMat
    );
    capDome.position.set(0, 0.235, 0);
    neckJoint.add(capDome);
    const capBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.016, 14, 1, false, -0.8, 1.6), capMat);
    capBrim.position.set(0, 0.252, 0.078);
    capBrim.rotation.x = 0.12;
    neckJoint.add(capBrim);
    const ponyEmblem = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.028, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x1b2845, roughness: 0.5 })
    );
    ponyEmblem.position.set(0, 0.3, 0.17);
    neckJoint.add(ponyEmblem);
  } else if (appearance.hoodUp) {
    // Automatic black windbreaker hood pulled up cleanly around the head (leaving face open)
    const hoodMat = new THREE.MeshStandardMaterial({
      color: 0x1c1c20,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });
    const hoodShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.205, 14, 12, Math.PI * 0.22, Math.PI * 1.56, 0, Math.PI * 0.72),
      hoodMat
    );
    hoodShell.rotation.y = Math.PI * 0.5;
    hoodShell.position.set(0, 0.215, -0.015);
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
