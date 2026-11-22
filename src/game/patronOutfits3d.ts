import * as THREE from 'three';
import { ClimateState, PatronOutfitId } from './sceneryData';

export interface PatronRigTargets {
  root?: THREE.Object3D;
  isSecretNpc?: boolean;
  pelvisGroup: THREE.Group;
  torsoGroup: THREE.Group;
  neckJoint: THREE.Group;
  leftHipJoint: THREE.Group;
  rightHipJoint: THREE.Group;
  leftKneeJoint: THREE.Group;
  rightKneeJoint: THREE.Group;
  jacketMat: THREE.MeshStandardMaterial;
  denimMat: THREE.MeshStandardMaterial;
  shoeMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
}

/**
 * Phase 4 + Phase 2 Hardening: Applies one of the 6 unlockable procedural 3D Patron Outfit packs
 * onto a customer/passerby rig. Layer 2 Secret NPC immunity guarantees Beb/Anton/Duminiki
 * can never have their caramel Polo cap or signature attire overwritten.
 */
export function applyPatronOutfitToRig(
  rig: PatronRigTargets,
  outfitId: PatronOutfitId,
  climate: ClimateState,
  seed: number
): void {
  if (
    rig.isSecretNpc === true ||
    rig.root?.userData?.isSecretNpc === true ||
    rig.torsoGroup?.userData?.isSecretNpc === true ||
    rig.pelvisGroup?.userData?.isSecretNpc === true
  ) {
    return;
  }
  const { torsoGroup, neckJoint, leftHipJoint, rightHipJoint, leftKneeJoint, rightKneeJoint } = rig;

  if (outfitId === 'filipino') {
    // Filipino Style (All-weather): Relaxed sando/tank or casual tee, comfortable shorts, classic tsinelas slippers
    const topPalette = [0xf8fafc, 0x2563eb, 0xeab308, 0xdc2626, 0x10b981];
    const shortPalette = [0x334155, 0x78350f, 0x1e3a8a, 0x3f3f46];
    rig.jacketMat.color.setHex(topPalette[seed % topPalette.length]);
    rig.jacketMat.roughness = 0.78;
    rig.denimMat.color.setHex(shortPalette[seed % shortPalette.length]);
    rig.shoeMat.color.setHex(seed % 2 === 0 ? 0x2563eb : 0xf97316); // Classic vibrant tsinelas

    // Sando neckline trim + sleeveless shoulder bands
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.75 });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 16), trimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.46, 0.01);
    torsoGroup.add(collar);

    // Shorts cuff + exposed lower skin calves + classic tsinelas Y-straps
    [leftKneeJoint, rightKneeJoint].forEach((knee) => {
      const bareCalf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.047, 0.25, 10),
        rig.skinMat
      );
      bareCalf.position.y = -0.125;
      knee.add(bareCalf);

      const strapMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.008, 6, 10, Math.PI), strapMat);
      strap.rotation.x = Math.PI / 2 - 0.3;
      strap.position.set(0, -0.22, 0.04);
      knee.add(strap);
    });
    return;
  }

  if (outfitId === 'brazilian') {
    // Brazilian Style (All-weather): Vibrant green/yellow/blue sporty jerseys or tropical tees, shorts, sandals
    const jerseyHex = seed % 3 === 0 ? 0xfacc15 : seed % 3 === 1 ? 0x16a34a : 0x2563eb;
    const stripeHex = jerseyHex === 0xfacc15 ? 0x16a34a : 0xfacc15;
    rig.jacketMat.color.setHex(jerseyHex);
    rig.jacketMat.roughness = 0.55;
    rig.denimMat.color.setHex(seed % 2 === 0 ? 0x1e3a8a : 0xf8fafc);
    rig.shoeMat.color.setHex(0xf8fafc);

    const stripeMat = new THREE.MeshStandardMaterial({ color: stripeHex, roughness: 0.5 });
    // Sporty chest chevron band + collar V-trim
    const chestBand = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.075, 0.295), stripeMat);
    chestBand.position.set(0, 0.28, 0.0);
    torsoGroup.add(chestBand);
    const crest = new THREE.Mesh(
      new THREE.CircleGeometry(0.03, 10),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 })
    );
    crest.position.set(0.075, 0.36, 0.155);
    torsoGroup.add(crest);

    // Breezy summer shorts (exposed lower calf)
    [leftKneeJoint, rightKneeJoint].forEach((knee) => {
      const bareCalf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.047, 0.24, 10),
        rig.skinMat
      );
      bareCalf.position.y = -0.12;
      knee.add(bareCalf);
    });
    return;
  }

  if (outfitId === 'ancient_japanese') {
    // Ancient Japanese (All-weather): Layered kimono/yukata wide sleeves, contrasting obi sash, haori, wooden geta
    const kimonoColors = [0x1e3a8a, 0x9d174d, 0x365314, 0x4c1d95];
    const obiColors = [0xd97706, 0xdc2626, 0xfef3c7, 0x0f766e];
    const kimonoHex = kimonoColors[seed % kimonoColors.length];
    const obiHex = obiColors[seed % obiColors.length];
    rig.jacketMat.color.setHex(kimonoHex);
    rig.jacketMat.roughness = 0.72;
    rig.denimMat.color.setHex(kimonoHex);
    rig.shoeMat.color.setHex(0x854d0e); // Wooden geta sandals

    const kimonoMat = new THREE.MeshStandardMaterial({ color: kimonoHex, roughness: 0.72 });
    const obiMat = new THREE.MeshStandardMaterial({ color: obiHex, roughness: 0.58 });
    const whiteUnderMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.75 });

    // Crossed kimono eri (collar)
    const eriL = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.24, 0.03), whiteUnderMat);
    eriL.position.set(-0.045, 0.38, 0.148);
    eriL.rotation.z = -0.35;
    torsoGroup.add(eriL);
    const eriR = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.24, 0.03), whiteUnderMat);
    eriR.position.set(0.045, 0.38, 0.148);
    eriR.rotation.z = 0.35;
    torsoGroup.add(eriR);

    // Wide contrasting Obi waist sash + rear musubi bow knot
    const obi = new THREE.Mesh(new THREE.CylinderGeometry(0.188, 0.185, 0.15, 16), obiMat);
    obi.scale.set(1.14, 1, 0.84);
    obi.position.set(0, 0.11, 0);
    torsoGroup.add(obi);
    const obiKnot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.08), obiMat);
    obiKnot.position.set(0, 0.12, -0.17);
    torsoGroup.add(obiKnot);

    // Lower flowing kimono skirt wrap
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.21, 0.42, 16), kimonoMat);
    skirt.scale.set(1.08, 1, 0.82);
    skirt.position.set(0, -0.16, 0);
    torsoGroup.add(skirt);

    // Wide kimono hanging sleeves on left & right shoulders
    [-0.25, 0.25].forEach((sx) => {
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.18), kimonoMat);
      sleeve.position.set(sx, 0.28, 0);
      torsoGroup.add(sleeve);
    });

    // Raised wooden Geta sandal blocks under feet
    const getaMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.78 });
    [leftKneeJoint, rightKneeJoint].forEach((knee) => {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.032, 0.16), getaMat);
      block.position.set(0, -0.285, 0.03);
      knee.add(block);
    });
    return;
  }

  if (outfitId === 'french') {
    // French Outfits (Weather-Reactive: Summer vs Winter)
    const isWinter = climate === 'winter';
    const beretMat = new THREE.MeshStandardMaterial({
      color: seed % 2 === 0 ? 0x991b1b : 0x1e293b,
      roughness: 0.75,
    });
    // Chic Paris Beret seated snugly on head
    const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.06, 14), beretMat);
    beret.scale.set(1.06, 1, 1.02);
    beret.position.set(0.02, 0.355, -0.01);
    beret.rotation.z = -0.16;
    neckJoint.add(beret);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.04, 6), beretMat);
    stem.position.set(0.03, 0.395, -0.01);
    neckJoint.add(stem);

    if (!isWinter) {
      // SUMMER: Breton striped top, light tailored trousers, silk neck scarf
      rig.jacketMat.color.setHex(0xf8fafc);
      rig.denimMat.color.setHex(seed % 2 === 0 ? 0xd6cbb8 : 0x1e293b);
      rig.shoeMat.color.setHex(0x78350f);

      const stripeMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.65 });
      for (let i = 0; i < 4; i++) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.182, 0.026, 16), stripeMat);
        ring.scale.set(1.13, 1, 0.8);
        ring.position.y = 0.09 + i * 0.095;
        torsoGroup.add(ring);
      }
      const silkScarf = new THREE.Mesh(
        new THREE.TorusGeometry(0.075, 0.02, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 })
      );
      silkScarf.rotation.x = Math.PI / 2 + 0.18;
      silkScarf.position.set(0, 0.48, 0.01);
      torsoGroup.add(silkScarf);
    } else {
      // WINTER (Snow): Structured wool peacoat/trench, knit scarf, dark winter boots
      const coatHex = seed % 2 === 0 ? 0x92400e : 0x1e293b;
      rig.jacketMat.color.setHex(coatHex);
      rig.denimMat.color.setHex(0x18181b);
      rig.shoeMat.color.setHex(0x09090b);

      const coatMat = new THREE.MeshStandardMaterial({ color: coatHex, roughness: 0.82 });
      const coatSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.28, 16), coatMat);
      coatSkirt.scale.set(1.14, 1, 0.84);
      coatSkirt.position.y = -0.1;
      torsoGroup.add(coatSkirt);

      const scarfMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.88 });
      const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.032, 8, 16), scarfMat);
      scarfRing.rotation.x = Math.PI / 2 + 0.14;
      scarfRing.position.set(0, 0.48, 0.01);
      torsoGroup.add(scarfRing);
      const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.22, 0.025), scarfMat);
      scarfTail.position.set(0.045, 0.34, 0.155);
      torsoGroup.add(scarfTail);
    }
    return;
  }

  if (outfitId === 'swiss') {
    // Swiss Outfits (Weather-Reactive: Summer vs Winter)
    const isWinter = climate === 'winter';
    if (!isWinter) {
      // SUMMER: Crisp alpine casual shirt + chalet vest & trousers
      rig.jacketMat.color.setHex(0xf8fafc);
      rig.denimMat.color.setHex(0x3f3f46);
      rig.shoeMat.color.setHex(0x5c3c24);

      const vestMat = new THREE.MeshStandardMaterial({
        color: seed % 2 === 0 ? 0x14532d : 0x7f1d1d,
        roughness: 0.76,
      });
      const vestL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.42, 0.3), vestMat);
      vestL.position.set(-0.095, 0.23, 0.0);
      torsoGroup.add(vestL);
      const vestR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.42, 0.3), vestMat);
      vestR.position.set(0.095, 0.23, 0.0);
      torsoGroup.add(vestR);
    } else {
      // WINTER (Snow): Cozy Nordic-patterned knit sweater / alpine puffer, pom-pom beanie, scarf, snow boots
      const pufferHex = seed % 2 === 0 ? 0xdc2626 : 0x1e40af;
      rig.jacketMat.color.setHex(pufferHex);
      rig.denimMat.color.setHex(0x1e293b);
      rig.shoeMat.color.setHex(0x451a03);

      const nordicBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.196, 0.194, 0.08, 16),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 })
      );
      nordicBand.scale.set(1.13, 1, 0.82);
      nordicBand.position.y = 0.33;
      torsoGroup.add(nordicBand);

      // Cozy Pom-Pom Beanie
      const beanieMat = new THREE.MeshStandardMaterial({
        color: seed % 2 === 0 ? 0xf8fafc : 0xdc2626,
        roughness: 0.9,
      });
      const beanie = new THREE.Mesh(
        new THREE.SphereGeometry(0.172, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
        beanieMat
      );
      beanie.position.set(0, 0.22, 0);
      neckJoint.add(beanie);
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), beanieMat);
      pom.position.set(0, 0.41, -0.01);
      neckJoint.add(pom);

      // Knit Winter Scarf
      const scarf = new THREE.Mesh(
        new THREE.TorusGeometry(0.09, 0.032, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.88 })
      );
      scarf.rotation.x = Math.PI / 2 + 0.12;
      scarf.position.set(0, 0.48, 0.01);
      torsoGroup.add(scarf);
    }
    return;
  }

  if (outfitId === 'hiker') {
    // Hiker Outfits (Winter Variant Only): Insulated mountaineering parka, thermal snow pants, 3D backpack, beanie + ski goggles, snow boots
    const parkaPalette = [0xea580c, 0x0284c7, 0xeab308, 0xdc2626];
    const parkaHex = parkaPalette[seed % parkaPalette.length];
    rig.jacketMat.color.setHex(parkaHex);
    rig.jacketMat.roughness = 0.62;
    rig.denimMat.color.setHex(0x1e293b);
    rig.shoeMat.color.setHex(0x27272a);

    // Quilted Parka Baffles + Fur-Trimmed Hood Collar
    const parkaMat = new THREE.MeshStandardMaterial({ color: parkaHex, roughness: 0.62 });
    const baffle = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.195, 0.36, 14), parkaMat);
    baffle.scale.set(1.16, 1, 0.88);
    baffle.position.y = 0.22;
    torsoGroup.add(baffle);

    const furCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.036, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.92 })
    );
    furCollar.rotation.x = Math.PI / 2 + 0.15;
    furCollar.position.set(0, 0.48, 0.0);
    torsoGroup.add(furCollar);

    // 3D Expedition Mountaineering Backpack + Sleeping Roll
    const packMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72 });
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.42, 0.18), packMat);
    pack.position.set(0, 0.26, -0.22);
    torsoGroup.add(pack);
    const roll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.31, 10),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7 })
    );
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.5, -0.21);
    torsoGroup.add(roll);

    // Knit Beanie + Reflective Ski Goggles resting on forehead
    const beanieMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const beanie = new THREE.Mesh(
      new THREE.SphereGeometry(0.172, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      beanieMat
    );
    beanie.position.set(0, 0.22, 0);
    neckJoint.add(beanie);
    const goggleLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.062, 0.045),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        roughness: 0.15,
        metalness: 0.7,
      })
    );
    goggleLens.position.set(0, 0.285, 0.155);
    neckJoint.add(goggleLens);

    // Heavy snow boot cuffs
    [leftHipJoint, rightHipJoint].forEach(() => {
      // Thermal snow pants already styled via denimMat
    });
  }
}

/**
 * Builds a clean standalone miniature figure showcasing a Patron Outfit for Phase 7 ThumbnailStudio.
 */
export function buildPatronOutfitPreviewMesh(
  outfitId: PatronOutfitId,
  climate: ClimateState = 'summer'
): THREE.Group {
  const root = new THREE.Group();
  const effectiveClimate: ClimateState = outfitId === 'hiker' ? 'winter' : climate;

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6b895, roughness: 0.55 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 });
  const denimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45 });

  // Pedestal disc
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.36, 0.06, 16),
    new THREE.MeshStandardMaterial({ color: 0x261d17, roughness: 0.8 })
  );
  base.position.y = -0.03;
  root.add(base);

  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.y = 0.58;
  root.add(pelvisGroup);
  pelvisGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.145, 0.12, 12), denimMat));

  const makeLeg = (sx: number) => {
    const hipJoint = new THREE.Group();
    hipJoint.position.set(sx, -0.02, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.055, 0.28, 10), denimMat);
    thigh.position.y = -0.14;
    hipJoint.add(thigh);
    const kneeJoint = new THREE.Group();
    kneeJoint.position.set(0, -0.28, 0);
    hipJoint.add(kneeJoint);
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.26, 10), denimMat);
    calf.position.y = -0.13;
    kneeJoint.add(calf);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.065, 0.17), shoeMat);
    shoe.position.set(0, -0.25, 0.03);
    kneeJoint.add(shoe);
    pelvisGroup.add(hipJoint);
    return { hipJoint, kneeJoint };
  };
  const leftLeg = makeLeg(-0.085);
  const rightLeg = makeLeg(0.085);

  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.04;
  pelvisGroup.add(torsoGroup);
  const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.155, 0.48, 14), jacketMat);
  torsoMesh.scale.set(1.12, 1, 0.78);
  torsoMesh.position.y = 0.24;
  torsoGroup.add(torsoMesh);

  // Simple arms
  [-0.24, 0.24].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.42, 8), jacketMat);
    arm.position.set(ax, 0.25, 0);
    arm.rotation.z = ax < 0 ? 0.14 : -0.14;
    torsoGroup.add(arm);
  });

  const neckJoint = new THREE.Group();
  neckJoint.position.set(0, 0.5, 0);
  torsoGroup.add(neckJoint);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 14), skinMat);
  head.scale.set(0.95, 1.06, 0.96);
  head.position.y = 0.19;
  neckJoint.add(head);

  // Apply the actual procedural 3D outfit!
  applyPatronOutfitToRig(
    {
      pelvisGroup,
      torsoGroup,
      neckJoint,
      leftHipJoint: leftLeg.hipJoint,
      rightHipJoint: rightLeg.hipJoint,
      leftKneeJoint: leftLeg.kneeJoint,
      rightKneeJoint: rightLeg.kneeJoint,
      jacketMat,
      denimMat,
      shoeMat,
      skinMat,
    },
    outfitId,
    effectiveClimate,
    0
  );

  root.rotation.y = 0.35;
  return root;
}
