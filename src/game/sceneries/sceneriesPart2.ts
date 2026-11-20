import * as THREE from 'three';
import {
  SceneryRuntimeInstance,
  createDioramaBase,
  disableShadowsRecursive,
  getSharedGlowSpriteTexture,
} from './sceneryTypes';
import { addSurrounding360Context } from './surroundingContext';

// ============================================================================
// PHASE 3: OUTDOOR SCENERIES 6–9
// Universal Driveway Rule: All scenery starts cleanly at z <= -16.2
// ============================================================================

// 6. CYBERPUNK NEON (New Vision City — Dense Megacity + Additive Hologram Sprites + Neon Rain)
export function buildCyberpunkNeonScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_cyberpunk_neon';

  // Dark obsidian megacity ground slab
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0b0d17,
    roughness: 0.35,
    metalness: 0.55,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 140), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, -86);
  root.add(ground);

  // Dense megacity towers in ONE InstancedMesh (zero draw-call explosion!)
  const towerCount = 46;
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x15192b,
    roughness: 0.48,
    metalness: 0.52,
  });
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), towerMat, towerCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < towerCount; i++) {
    const row = Math.floor(i / 12);
    const col = i % 12;
    const tx = -42 + col * 7.6 + (row % 2) * 3.4;
    const tz = -22 - row * 14 - (i % 3) * 3.5;
    const tw = 4.2 + (i % 4) * 1.4;
    const td = 4.2 + ((i * 3) % 4) * 1.2;
    const th = 14 + ((i * 7) % 24) + row * 7;
    dummy.position.set(tx, th / 2, tz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(tw, th, td);
    dummy.updateMatrix();
    towers.setMatrixAt(i, dummy.matrix);
  }
  towers.instanceMatrix.needsUpdate = true;
  root.add(towers);

  // Cyan / Magenta / Amber Holographic Billboards + Additive Fake-Bloom Glow Sprites
  const holoColors = [0x06b6d4, 0xec4899, 0xf59e0b, 0x38bdf8, 0xa855f7];
  const holoMats: THREE.MeshBasicMaterial[] = [];
  const glowSprites: THREE.Sprite[] = [];
  const holoSpecs = [
    { x: -12, y: 8.5, z: -20.2, w: 3.4, h: 5.4, c: 0 },
    { x: -4.2, y: 12.2, z: -26.5, w: 4.8, h: 3.1, c: 1 },
    { x: 3.6, y: 9.8, z: -21.0, w: 3.1, h: 6.2, c: 2 },
    { x: 11.4, y: 11.0, z: -24.0, w: 4.5, h: 3.6, c: 3 },
    { x: -18.5, y: 14.0, z: -31.0, w: 5.2, h: 4.4, c: 4 },
    { x: 18.2, y: 13.5, z: -30.5, w: 4.6, h: 4.2, c: 1 },
    { x: 0.2, y: 19.5, z: -42.0, w: 7.4, h: 5.2, c: 0 },
  ];

  holoSpecs.forEach((h) => {
    const col = holoColors[h.c % holoColors.length];
    const bMat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.88,
    });
    holoMats.push(bMat);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(h.w, h.h), bMat);
    panel.position.set(h.x, h.y, h.z);
    root.add(panel);

    // Lightweight additive fake-bloom glow sprite (NO heavy UnrealBloomPass!)
    const spMat = new THREE.SpriteMaterial({
      map: getSharedGlowSpriteTexture(),
      color: col,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spMat);
    sprite.position.set(h.x, h.y, h.z + 0.4);
    sprite.scale.set(h.w * 2.1, h.h * 1.9, 1);
    root.add(sprite);
    glowSprites.push(sprite);
  });

  // Glowing horizontal neon skyway strips across the midground
  const stripMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const skyway = new THREE.Mesh(new THREE.BoxGeometry(64, 0.28, 0.6), stripMat);
  skyway.position.set(0, 6.2, -28);
  root.add(skyway);

  // Subtle distant flying spinner-car light streaks
  const spinners: Array<{ mesh: THREE.Mesh; speed: number; dir: 1 | -1 }> = [];
  for (let s = 0; s < 5; s++) {
    const dir: 1 | -1 = s % 2 === 0 ? 1 : -1;
    const sp = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.16, 0.22),
      new THREE.MeshBasicMaterial({ color: s % 2 === 0 ? 0x38bdf8 : 0xf43f5e })
    );
    sp.position.set(-28 + s * 13, 8.5 + (s % 3) * 3.8, -26 - s * 4.5);
    root.add(sp);
    spinners.push({ mesh: sp, speed: 9 + s * 2.2, dir });
  }

  const ctx = addSurrounding360Context(root, 'cyberpunk_neon');

  disableShadowsRecursive(root);

  return {
    id: 'cyberpunk_neon',
    root,
    envHint: {
      fogColorDay: 0x1a1d36,
      fogColorNight: 0x070816,
      fogDensityScale: 1.08,
      skyTintDay: 0x1e1b4b,
      skyTintNight: 0x060714,
      neonRain: true,
    },
    update: (dt, elapsed, isNight, climateState) => {
      ctx.update(isNight, climateState);
      for (let i = 0; i < holoMats.length; i++) {
        const pulse = 0.78 + Math.sin(elapsed * (2.2 + i * 0.45) + i) * 0.18;
        holoMats[i].opacity = isNight ? Math.min(1, pulse + 0.12) : pulse * 0.85;
        const spMat = glowSprites[i].material as THREE.SpriteMaterial;
        spMat.opacity = (isNight ? 0.52 : 0.28) * pulse;
      }
      for (const sp of spinners) {
        sp.mesh.position.x += sp.dir * sp.speed * dt;
        if (sp.dir === 1 && sp.mesh.position.x > 38) sp.mesh.position.x = -38;
        if (sp.dir === -1 && sp.mesh.position.x < -38) sp.mesh.position.x = 38;
      }
    },
  };
}

export function buildCyberpunkNeonDiorama(): THREE.Group {
  const g = createDioramaBase(0x0b0d17, 0x1e1b4b);
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x15192b, roughness: 0.4, metalness: 0.5 });
  const specs = [
    [-0.45, 0.48, -0.25, 0.34, 0.92],
    [0.02, 0.62, -0.18, 0.38, 1.2],
    [0.48, 0.42, 0.08, 0.32, 0.8],
  ];
  specs.forEach(([x, y, z, w, h]) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), darkMat);
    t.position.set(x, y, z);
    g.add(t);
  });
  const cyan = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.42, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
  );
  cyan.position.set(0.02, 0.82, 0.05);
  g.add(cyan);
  const magenta = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.32, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xec4899 })
  );
  magenta.position.set(-0.45, 0.58, -0.05);
  g.add(magenta);
  return g;
}

// 7. EIFFEL TOWER VIEW (Paris Montmartre Terrace — Wrought-Iron Railings + Haussmann Roofs + Eiffel Truss + Snow Enabled)
export function buildEiffelTowerScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_eiffel_tower';

  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.45, metalness: 0.72 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd9cbb8, roughness: 0.84 });
  const slateRoofMat = new THREE.MeshStandardMaterial({ color: 0x3b4858, roughness: 0.74 });
  const eiffelMat = new THREE.MeshStandardMaterial({
    color: 0x6b5344,
    roughness: 0.52,
    metalness: 0.48,
    emissive: 0xd97706,
    emissiveIntensity: 0.06,
  });
  const winWarmMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.25,
    roughness: 0.3,
  });

  // Elevated Montmartre balustrade & wrought-iron terrace railing along z = -17.5
  const stoneCoping = new THREE.Mesh(new THREE.BoxGeometry(56, 0.38, 0.45), stoneMat);
  stoneCoping.position.set(0, 0.19, -17.5);
  root.add(stoneCoping);
  const topIronRail = new THREE.Mesh(new THREE.BoxGeometry(56, 0.07, 0.08), ironMat);
  topIronRail.position.set(0, 1.12, -17.5);
  root.add(topIronRail);
  const balusterCount = 54;
  const balusters = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.74, 5),
    ironMat,
    balusterCount
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < balusterCount; i++) {
    dummy.position.set(-26.5 + i * 1.0, 0.74, -17.5);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    balusters.setMatrixAt(i, dummy.matrix);
  }
  balusters.instanceMatrix.needsUpdate = true;
  root.add(balusters);

  // Classic Parisian vintage double-globe lamp posts along the promenade
  [-12, -4.5, 4.5, 12].forEach((lx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3.3, 8), ironMat);
    post.position.set(lx, 1.65, -17.5);
    root.add(post);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.18, 9, 7), winWarmMat);
    globe.position.set(lx, 3.38, -17.5);
    root.add(globe);
  });

  // Stepped Haussmann Paris rooftops descending below the Montmartre hillside
  const roofBlocks: Array<[number, number, number, number, number]> = [
    [-22, -4.2, -26, 9, 7],
    [-12, -4.8, -28, 8.5, 6.5],
    [11.5, -4.6, -27, 9, 6.8],
    [22, -4.0, -26, 9, 7.2],
    [-20, -7.2, -42, 11, 7],
    [-7, -8.0, -44, 10, 6.5],
    [8.5, -7.8, -43, 10, 6.5],
    [21, -7.0, -41, 11, 7],
  ];
  roofBlocks.forEach(([bx, by, bz, bw, bh]) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 6.2), stoneMat);
    body.position.set(bx, by, bz);
    root.add(body);
    const mansard = new THREE.Mesh(new THREE.ConeGeometry(bw * 0.72, 1.7, 4), slateRoofMat);
    mansard.rotation.y = Math.PI / 4;
    mansard.scale.set(1.05, 1, 0.75);
    mansard.position.set(bx, by + bh / 2 + 0.82, bz);
    root.add(mansard);
  });

  // Crisp Low-Poly Eiffel Tower Lattice Truss centered in the Paris vista
  const tower = new THREE.Group();
  tower.position.set(0.5, -9.5, -66);

  // 4 sweeping flared base legs
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.35, 12.5, 6), eiffelMat);
    leg.position.set(sx * 4.2, 5.8, sz * 4.2);
    leg.rotation.z = sx * 0.28;
    leg.rotation.x = -sz * 0.28;
    tower.add(leg);
  });

  // First & second observation decks
  const deck1 = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.05, 8.6), eiffelMat);
  deck1.position.y = 11.4;
  tower.add(deck1);

  const midTruss = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 3.6, 10.5, 4), eiffelMat);
  midTruss.rotation.y = Math.PI / 4;
  midTruss.position.y = 17.0;
  tower.add(midTruss);

  const deck2 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.85, 4.6), eiffelMat);
  deck2.position.y = 22.3;
  tower.add(deck2);

  const upperSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.75, 15.5, 4), eiffelMat);
  upperSpire.rotation.y = Math.PI / 4;
  upperSpire.position.y = 30.4;
  tower.add(upperSpire);

  const topDeck = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.75, 1.65), eiffelMat);
  topDeck.position.y = 38.2;
  tower.add(topDeck);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.24, 4.2, 6), eiffelMat);
  antenna.position.y = 40.6;
  tower.add(antenna);

  // Twinkling Golden Night Sprites along the Eiffel Tower
  const twinkleSprites: Array<{ sprite: THREE.Sprite; phase: number }> = [];
  for (let t = 0; t < 18; t++) {
    const hRatio = t / 17;
    const ty = 6 + hRatio * 33;
    const spread = (1 - hRatio) * 3.8 + 0.5;
    const spMat = new THREE.SpriteMaterial({
      map: getSharedGlowSpriteTexture(),
      color: 0xfde68a,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sp = new THREE.Sprite(spMat);
    sp.position.set(Math.sin(t * 2.4) * spread, ty, Math.cos(t * 1.9) * spread + 1.2);
    sp.scale.set(1.5, 1.5, 1);
    tower.add(sp);
    twinkleSprites.push({ sprite: sp, phase: t * 1.37 });
  }
  root.add(tower);

  // Snow blanket layer on terrace coping & rooftops (toggled cleanly when climateState === 'winter')
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.88 });
  const snowCoping = new THREE.Mesh(new THREE.BoxGeometry(56, 0.08, 0.48), snowMat);
  snowCoping.position.set(0, 0.4, -17.5);
  snowCoping.visible = false;
  root.add(snowCoping);

  const ctx = addSurrounding360Context(root, 'eiffel_tower');

  disableShadowsRecursive(root);

  return {
    id: 'eiffel_tower',
    root,
    envHint: {
      fogColorDay: 0xe2e8f0,
      fogColorNight: 0x0e1426,
      fogDensityScale: 0.78,
    },
    update: (_dt, elapsed, isNight, climateState) => {
      ctx.update(isNight, climateState);
      eiffelMat.emissiveIntensity = isNight ? 0.85 : 0.06;
      winWarmMat.emissiveIntensity = isNight ? 1.85 : 0.2;
      snowCoping.visible = climateState === 'winter';
      slateRoofMat.color.setHex(climateState === 'winter' ? 0xdbeafe : 0x3b4858);

      for (const tw of twinkleSprites) {
        const mat = tw.sprite.material as THREE.SpriteMaterial;
        if (isNight) {
          const spark = Math.max(0, Math.sin(elapsed * 4.5 + tw.phase));
          mat.opacity = 0.25 + Math.pow(spark, 3) * 0.75;
        } else {
          mat.opacity = 0;
        }
      }
    },
  };
}

export function buildEiffelTowerDiorama(): THREE.Group {
  const g = createDioramaBase(0x94a3b8);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x785946,
    metalness: 0.45,
    roughness: 0.5,
    emissive: 0xd97706,
    emissiveIntensity: 0.25,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.46, 0.52, 4), mat);
  base.rotation.y = Math.PI / 4;
  base.position.y = 0.28;
  g.add(base);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.42), mat);
  deck.position.y = 0.54;
  g.add(deck);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.17, 0.86, 4), mat);
  spire.rotation.y = Math.PI / 4;
  spire.position.y = 0.98;
  g.add(spire);
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfde68a })
  );
  star.position.y = 1.44;
  g.add(star);
  return g;
}

// 8. SWITZERLAND HILLTOP (Grounded Layered Alpine Overlook + Chalets + Anchored Steel Funicular + 5s Pauses)
export function buildSwitzerlandHilltopScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_switzerland_hilltop';

  const chaletWoodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.82 });
  const stoneRetainingMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92, flatShading: true });
  const alpineMeadowMat = new THREE.MeshStandardMaterial({ color: 0x3f7d44, roughness: 0.9, flatShading: true });
  const snowPeakMat = new THREE.MeshStandardMaterial({ color: 0xf1f7ff, roughness: 0.84, flatShading: true });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9, flatShading: true });
  const spruceMat = new THREE.MeshStandardMaterial({ color: 0x1b4d36, roughness: 0.86 });
  const chaletRoofMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.78 });
  const chaletWinMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.35,
    roughness: 0.25,
  });

  // Grounded stone cliff retaining wall directly supporting the chalet terrace railing (z = -17.5)
  const terraceRetainingWall = new THREE.Mesh(
    new THREE.BoxGeometry(64, 4.4, 1.4),
    stoneRetainingMat
  );
  terraceRetainingWall.position.set(0, -2.05, -17.95);
  root.add(terraceRetainingWall);

  // Wooden chalet terrace guardrail seated squarely atop the stone retaining coping
  const rail = new THREE.Mesh(new THREE.BoxGeometry(58, 0.12, 0.14), chaletWoodMat);
  rail.position.set(0, 1.06, -17.5);
  root.add(rail);
  const midRail = new THREE.Mesh(new THREE.BoxGeometry(58, 0.08, 0.1), chaletWoodMat);
  midRail.position.set(0, 0.62, -17.5);
  root.add(midRail);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.18, 0.14), chaletWoodMat, 29);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 29; i++) {
    dummy.position.set(-28 + i * 2.0, 0.56, -17.5);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  root.add(posts);

  // Continuous Sloping Alpine Hillside descending cleanly from z = -18 (y = -0.3) down to valley floor (z = -50, y = -13.8)
  const hillSlope = new THREE.Mesh(new THREE.PlaneGeometry(160, 38), alpineMeadowMat);
  hillSlope.rotation.x = -Math.PI * 0.36;
  hillSlope.position.set(0, -7.2, -33.5);
  root.add(hillSlope);

  // Alpine valley meadow & turquoise glacial lake far below
  const meadow = new THREE.Mesh(new THREE.PlaneGeometry(210, 150), alpineMeadowMat);
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.set(0, -14.0, -82);
  root.add(meadow);

  const lake = new THREE.Mesh(
    new THREE.PlaneGeometry(66, 30),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.22, metalness: 0.25 })
  );
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(-14, -13.75, -62);
  root.add(lake);

  // Grounded Mountain Shoulder Ridge directly supporting the right-side inclined funicular climb
  const funicularMountainMass = new THREE.Mesh(new THREE.ConeGeometry(28, 22, 8), rockMat);
  funicularMountainMass.scale.set(1.35, 1.0, 0.92);
  funicularMountainMass.position.set(14.5, -4.6, -34.5);
  root.add(funicularMountainMass);

  const funicularSnowShoulder = new THREE.Mesh(new THREE.ConeGeometry(18, 13, 8), snowPeakMat);
  funicularSnowShoulder.scale.set(1.25, 0.9, 0.88);
  funicularSnowShoulder.position.set(16.0, 1.2, -35.5);
  root.add(funicularSnowShoulder);

  // Left-side grounded alpine knoll so left horizon never cuts off
  const leftKnoll = new THREE.Mesh(new THREE.ConeGeometry(26, 16, 8), alpineMeadowMat);
  leftKnoll.scale.set(1.3, 0.85, 0.9);
  leftKnoll.position.set(-28, -5.5, -36);
  root.add(leftKnoll);

  // Grounded Swiss Hillside Chalets embedded with deep stone basements into the alpine slope
  const slopeChalets: Array<{ x: number; y: number; z: number; rotY: number; sc: number }> = [
    { x: -17.5, y: -3.2, z: -26.5, rotY: 0.24, sc: 1.05 },
    { x: -24.5, y: -6.4, z: -34.0, rotY: 0.42, sc: 1.1 },
    { x: 21.5, y: -2.4, z: -25.5, rotY: -0.35, sc: 1.0 },
  ];
  slopeChalets.forEach((ch) => {
    const cg = new THREE.Group();
    const stoneBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 5.2, 3.8), stoneRetainingMat);
    stoneBase.position.y = -1.6;
    cg.add(stoneBase);
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.3, 3.6), chaletWoodMat);
    body.position.y = 1.95;
    cg.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.85, 4), chaletRoofMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.12, 1, 0.96);
    roof.position.y = 4.0;
    cg.add(roof);
    [-1.0, 1.0].forEach((wx) => {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.85), chaletWinMat);
      win.position.set(wx, 2.05, 1.83);
      cg.add(win);
    });
    cg.position.set(ch.x, ch.y, ch.z);
    cg.rotation.y = ch.rotY;
    cg.scale.setScalar(ch.sc);
    root.add(cg);
  });

  // Majestic snow-capped Swiss Alpine peaks wrapping the front & diagonal horizon
  const peakSpecs: Array<[number, number, number, number]> = [
    [-74, -84, 32, 46],
    [-46, -98, 28, 44],
    [-16, -104, 30, 50],
    [16, -98, 28, 46],
    [48, -94, 28, 42],
    [76, -82, 32, 44],
  ];
  peakSpecs.forEach(([px, pz, r, h]) => {
    const base = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rockMat);
    base.position.set(px, h * 0.32 - 8, pz);
    root.add(base);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.56, h * 0.54, 7), snowPeakMat);
    cap.position.set(px, h * 0.59 - 8, pz);
    root.add(cap);
  });

  // Grounded Instanced Snow-Dusted Alpine Spruce Trees seated strictly on the hillside surface!
  const spruceCount = 34;
  const spTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.18, 2.5, 6),
    chaletWoodMat,
    spruceCount
  );
  const spCrowns = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.35, 4.4, 7),
    spruceMat,
    spruceCount
  );
  const spSnowCaps = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.82, 2.0, 7),
    snowPeakMat,
    spruceCount
  );
  for (let i = 0; i < spruceCount; i++) {
    const x = -30 + i * 1.85 + (i % 2 === 0 ? -0.35 : 0.35);
    const z = -19.8 - (i % 5) * 3.1;
    // Exact elevation along the sloping hillside (embedded -0.55m into earth so trunks never float)
    const slopeT = Math.max(0, Math.min(1, (-18.0 - z) / 30.0));
    const groundY = -0.35 - slopeT * 12.6;
    const sc = 0.8 + (i % 3) * 0.22;

    dummy.position.set(x, groundY + 0.95 * sc, z);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    spTrunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, groundY + 3.25 * sc, z);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    spCrowns.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, groundY + 4.45 * sc, z);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    spSnowCaps.setMatrixAt(i, dummy.matrix);
  }
  spTrunks.instanceMatrix.needsUpdate = true;
  spCrowns.instanceMatrix.needsUpdate = true;
  spSnowCaps.instanceMatrix.needsUpdate = true;
  root.add(spTrunks, spCrowns, spSnowCaps);

  // === CONTINUOUSLY ANIMATED SWISS RED/GLASS INCLINED ELEVATOR (FUNICULAR) ===
  // Track anchored firmly into the mountain shoulder via solid stone/steel support piers!
  const lowerPos = new THREE.Vector3(-12, -10.5, -42);
  const upperPos = new THREE.Vector3(11.5, 4.8, -32);
  const trackVec = new THREE.Vector3().subVectors(upperPos, lowerPos);
  const trackLen = trackVec.length();
  const trackMid = new THREE.Vector3().addVectors(lowerPos, upperPos).multiplyScalar(0.5);

  const railSteelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.4,
    metalness: 0.78,
  });
  const trackBeam = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.42, trackLen + 0.8), railSteelMat);
  trackBeam.position.copy(trackMid);
  trackBeam.lookAt(upperPos);
  root.add(trackBeam);

  // 7 vertical stone-and-steel trestle piers extending from underside of trackBeam straight down to y = -16.5
  const pierCount = 7;
  const pierPos = new THREE.Vector3();
  for (let p = 0; p < pierCount; p++) {
    const frac = p / (pierCount - 1);
    pierPos.lerpVectors(lowerPos, upperPos, frac);
    const pierTopY = pierPos.y - 0.15;
    const pierBottomY = -16.5;
    const pierH = Math.max(1.5, pierTopY - pierBottomY);
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.35, pierH, 1.35), stoneRetainingMat);
    pier.position.set(pierPos.x, pierBottomY + pierH / 2, pierPos.z);
    root.add(pier);
  }

  // Lower & Upper Cliffside Funicular Stations with deep stone foundation plinths into terrain
  const stationMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.78 });
  const roofRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.65 });
  [lowerPos, upperPos].forEach((pos) => {
    const st = new THREE.Group();
    const foundationH = Math.max(4.5, pos.y + 16.5);
    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, foundationH, 3.6),
      stoneRetainingMat
    );
    foundation.position.y = -foundationH / 2 - 0.1;
    st.add(foundation);
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.9, 2.4, 3.2), stationMat);
    base.position.y = 0.85;
    st.add(base);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.25, 4), roofRedMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 2.65;
    st.add(roof);
    st.position.copy(pos).add(new THREE.Vector3(0, -0.45, -1.2));
    root.add(st);
  });

  // Red & Glass Funicular Cabin
  const cabinGroup = new THREE.Group();
  const cabinBody = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 1.55, 1.75),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.32, metalness: 0.25 })
  );
  cabinBody.position.y = 1.05;
  cabinGroup.add(cabinBody);
  const cabinGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.35,
    roughness: 0.15,
    metalness: 0.35,
  });
  const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.72, 1.42), cabinGlassMat);
  cabinGlass.position.y = 1.24;
  cabinGroup.add(cabinGlass);
  const cabinWhiteStripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.34, 0.18, 1.78),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
  );
  cabinWhiteStripe.position.y = 0.62;
  cabinGroup.add(cabinWhiteStripe);
  cabinGroup.position.copy(lowerPos);
  root.add(cabinGroup);

  const ctx = addSurrounding360Context(root, 'switzerland_hilltop');

  // Funicular state machine: smooth travel (11s) + 5.0s pause at each station
  let funicularPhase: 'pause_low' | 'going_up' | 'pause_high' | 'going_down' = 'going_up';
  let funicularTimer = 0;
  const travelDuration = 11.0;
  const pauseDuration = 5.0;

  disableShadowsRecursive(root);

  return {
    id: 'switzerland_hilltop',
    root,
    envHint: {
      fogColorDay: 0xdbeafe,
      fogColorNight: 0x0d1729,
      fogDensityScale: 0.72,
    },
    update: (dt, _elapsed, isNight, climateState) => {
      ctx.update(isNight, climateState);
      alpineMeadowMat.color.setHex(climateState === 'winter' ? 0xeef5fc : 0x3f7d44);
      spruceMat.color.setHex(climateState === 'winter' ? 0x3b6e5c : 0x1b4d36);
      chaletRoofMat.color.setHex(climateState === 'winter' ? 0xf1f7ff : 0x7c2d12);
      chaletWinMat.emissiveIntensity = isNight ? 1.7 : 0.25;
      cabinGlassMat.emissiveIntensity = isNight ? 1.8 : 0.28;

      funicularTimer += dt;
      let t = 0;
      if (funicularPhase === 'going_up') {
        const raw = Math.min(1, funicularTimer / travelDuration);
        t = raw * raw * (3 - 2 * raw); // smoothstep ease
        if (raw >= 1) {
          funicularPhase = 'pause_high';
          funicularTimer = 0;
        }
      } else if (funicularPhase === 'pause_high') {
        t = 1;
        if (funicularTimer >= pauseDuration) {
          funicularPhase = 'going_down';
          funicularTimer = 0;
        }
      } else if (funicularPhase === 'going_down') {
        const raw = Math.min(1, funicularTimer / travelDuration);
        t = 1 - raw * raw * (3 - 2 * raw);
        if (raw >= 1) {
          funicularPhase = 'pause_low';
          funicularTimer = 0;
        }
      } else {
        t = 0;
        if (funicularTimer >= pauseDuration) {
          funicularPhase = 'going_up';
          funicularTimer = 0;
        }
      }
      cabinGroup.position.lerpVectors(lowerPos, upperPos, t);
    },
  };
}

export function buildSwitzerlandHilltopDiorama(): THREE.Group {
  const g = createDioramaBase(0xeef5fc);
  const rock = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 1.05, 6),
    new THREE.MeshStandardMaterial({ color: 0x4b5563, flatShading: true })
  );
  rock.position.set(-0.18, 0.52, -0.22);
  g.add(rock);
  const snow = new THREE.Mesh(
    new THREE.ConeGeometry(0.36, 0.56, 6),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true })
  );
  snow.position.set(-0.18, 0.84, -0.22);
  g.add(snow);
  // Mini red inclined funicular + track
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.05, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x334155 })
  );
  track.position.set(0.32, 0.34, 0.14);
  track.rotation.set(0.48, -0.3, 0);
  g.add(track);
  const car = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.18, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 })
  );
  car.position.set(0.35, 0.45, 0.16);
  g.add(car);
  return g;
}

// 9. MT. EVEREST & HIKER TRAIL (ALWAYS WINTER — Jagged Everest Peak + Stone Trail + Fluttering Tibetan Prayer Flags)
export function buildMtEverestScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_mt_everest';

  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf1f7ff, roughness: 0.85, flatShading: true });
  const slateMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92, flatShading: true });
  const stoneTrailMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.94 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.84 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });

  // Expansive snowfield & snowdrifts beyond the cafe lane
  const snowField = new THREE.Mesh(new THREE.PlaneGeometry(200, 150), snowMat);
  snowField.rotation.x = -Math.PI / 2;
  snowField.position.set(0, -0.05, -90);
  root.add(snowField);

  // Winding stone hiker trail leading from base camp toward Everest
  const trailStones = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.65, 0.75, 0.12, 6),
    stoneTrailMat,
    22
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const x = Math.sin(t * Math.PI * 1.4) * 3.8;
    const z = -17.5 - i * 2.2;
    dummy.position.set(x, 0.04, z);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(1.1 + (i % 3) * 0.2, 1, 0.9);
    dummy.updateMatrix();
    trailStones.setMatrixAt(i, dummy.matrix);
  }
  trailStones.instanceMatrix.needsUpdate = true;
  root.add(trailStones);

  // Sculpted snowdrifts flanking left & right
  [
    [-16, -21, 7, 2.2],
    [15, -22, 8, 2.5],
    [-26, -34, 12, 4.2],
    [25, -35, 11, 4.0],
  ].forEach(([sx, sz, r, h]) => {
    const drift = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 7), snowMat);
    drift.scale.set(1.4, h / r, 0.9);
    drift.position.set(sx, 0, sz);
    root.add(drift);
  });

  // Wooden Base-Camp Trail Signposts + Warm Expedition Lanterns
  [
    [-6.2, -18.2],
    [6.4, -18.2],
    [-2.6, -26.5],
    [3.8, -32.0],
  ].forEach(([px, pz], idx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 7), woodMat);
    post.position.set(px, 1.3, pz);
    root.add(post);
    if (idx < 2) {
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 0.08), woodMat);
      signBoard.position.set(px + (idx === 0 ? 0.35 : -0.35), 2.15, pz);
      signBoard.rotation.y = idx === 0 ? 0.2 : -0.2;
      root.add(signBoard);
    }
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.28, 6), lanternMat);
    lantern.position.set(px, 2.58, pz);
    root.add(lantern);
  });

  // Fluttering Colorful Tibetan Prayer Flag Lines strung between trail poles
  const flagColors = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];
  const prayerFlags: Array<{ mesh: THREE.Mesh; baseRotX: number; phase: number }> = [];
  const lineRuns: Array<[THREE.Vector3, THREE.Vector3]> = [
    [new THREE.Vector3(-6.2, 2.45, -18.2), new THREE.Vector3(6.4, 2.45, -18.2)],
    [new THREE.Vector3(-6.2, 2.35, -18.2), new THREE.Vector3(-2.6, 2.35, -26.5)],
    [new THREE.Vector3(6.4, 2.35, -18.2), new THREE.Vector3(3.8, 2.35, -32.0)],
  ];
  const ropeMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
  const flagGeo = new THREE.PlaneGeometry(0.38, 0.48);

  lineRuns.forEach(([a, b], runIdx) => {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mid.y -= 0.42;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(16)), ropeMat));

    const count = 13;
    for (let f = 1; f < count; f++) {
      const pt = curve.getPoint(f / count);
      const fMat = new THREE.MeshStandardMaterial({
        color: flagColors[(f + runIdx) % flagColors.length],
        roughness: 0.72,
        side: THREE.DoubleSide,
      });
      const flag = new THREE.Mesh(flagGeo, fMat);
      flag.position.set(pt.x, pt.y - 0.24, pt.z);
      root.add(flag);
      prayerFlags.push({ mesh: flag, baseRotX: 0.14, phase: f * 0.7 + runIdx * 1.9 });
    }
  });

  // Massive Jagged Snow-and-Slate Mt. Everest Summit Pyramid + Flanking Himalayan Peaks
  const everestGroup = new THREE.Group();
  everestGroup.position.set(0, 0, -96);

  const mainSlate = new THREE.Mesh(new THREE.ConeGeometry(42, 54, 5), slateMat);
  mainSlate.position.set(0, 25, 0);
  mainSlate.rotation.y = 0.35;
  everestGroup.add(mainSlate);

  const mainSnow = new THREE.Mesh(new THREE.ConeGeometry(34, 48, 5), snowMat);
  mainSnow.position.set(-1.5, 28, 3.5);
  mainSnow.rotation.y = 0.35;
  everestGroup.add(mainSnow);

  // Flanking Nuptse & Lhotse ridges
  const leftPeak = new THREE.Mesh(new THREE.ConeGeometry(28, 36, 5), slateMat);
  leftPeak.position.set(-34, 17, 10);
  everestGroup.add(leftPeak);
  const leftSnow = new THREE.Mesh(new THREE.ConeGeometry(19, 25, 5), snowMat);
  leftSnow.position.set(-34, 23, 12);
  everestGroup.add(leftSnow);

  const rightPeak = new THREE.Mesh(new THREE.ConeGeometry(30, 39, 5), slateMat);
  rightPeak.position.set(36, 18, 8);
  everestGroup.add(rightPeak);
  const rightSnow = new THREE.Mesh(new THREE.ConeGeometry(20, 27, 5), snowMat);
  rightSnow.position.set(36, 24.5, 10);
  everestGroup.add(rightSnow);

  // Summit wind snow plume sprite
  const plumeMat = new THREE.SpriteMaterial({
    map: getSharedGlowSpriteTexture(),
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const plume = new THREE.Sprite(plumeMat);
  plume.position.set(8, 51, 2);
  plume.scale.set(24, 6.5, 1);
  everestGroup.add(plume);
  root.add(everestGroup);

  // Snow-dusted Himalayan conifers flanking the base-camp trail margins (zero urban trees)
  const firMat = new THREE.MeshStandardMaterial({ color: 0x2a5649, roughness: 0.88 });
  const firSpots: Array<[number, number, number]> = [
    [-12.5, -20.5, 1.05], [-9.2, -24.5, 0.92], [-18.5, -28.0, 1.2], [-14.0, -34.0, 1.1],
    [11.8, -21.0, 1.0], [15.6, -26.5, 1.15], [9.8, -30.5, 0.95], [19.5, -32.0, 1.22],
    [-22.0, -22.5, 1.15], [22.5, -23.0, 1.12],
  ];
  const firTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.17, 2.2, 6),
    woodMat,
    firSpots.length
  );
  const firCrowns = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.3, 4.1, 7),
    firMat,
    firSpots.length
  );
  const firSnow = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.84, 2.1, 7),
    snowMat,
    firSpots.length
  );
  firSpots.forEach(([fx, fz, sc], idx) => {
    dummy.position.set(fx, 1.0 * sc, fz);
    dummy.rotation.set(0, idx * 0.8, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    firTrunks.setMatrixAt(idx, dummy.matrix);
    dummy.position.set(fx, 3.1 * sc, fz);
    dummy.updateMatrix();
    firCrowns.setMatrixAt(idx, dummy.matrix);
    dummy.position.set(fx, 4.25 * sc, fz);
    dummy.updateMatrix();
    firSnow.setMatrixAt(idx, dummy.matrix);
  });
  firTrunks.instanceMatrix.needsUpdate = true;
  firCrowns.instanceMatrix.needsUpdate = true;
  firSnow.instanceMatrix.needsUpdate = true;
  root.add(firTrunks, firCrowns, firSnow);

  const ctx = addSurrounding360Context(root, 'mt_everest');

  disableShadowsRecursive(root);

  return {
    id: 'mt_everest',
    root,
    envHint: {
      fogColorDay: 0xdceeff,
      fogColorNight: 0x0b162a,
      fogDensityScale: 0.72,
      sunColorOverride: 0xdceeff,
      alwaysWinter: true,
    },
    update: (_dt, elapsed, isNight, climateState) => {
      ctx.update(isNight, climateState);
      lanternMat.emissiveIntensity = isNight ? 2.2 : 1.15;
      plume.position.x = 8 + Math.sin(elapsed * 0.7) * 2.2;
      for (const pf of prayerFlags) {
        pf.mesh.rotation.x = pf.baseRotX + Math.sin(elapsed * 5.2 + pf.phase) * 0.28;
        pf.mesh.rotation.y = Math.cos(elapsed * 3.4 + pf.phase) * 0.16;
      }
    },
  };
}

export function buildMtEverestDiorama(): THREE.Group {
  const g = createDioramaBase(0xeef6ff, 0x1e293b);
  const slate = new THREE.Mesh(
    new THREE.ConeGeometry(0.68, 1.18, 5),
    new THREE.MeshStandardMaterial({ color: 0x334155, flatShading: true })
  );
  slate.position.set(0, 0.58, -0.18);
  g.add(slate);
  const snow = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, 0.88, 5),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true })
  );
  snow.position.set(-0.04, 0.74, -0.1);
  g.add(snow);
  // Colorful prayer flag string in front
  const colors = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];
  colors.forEach((c, idx) => {
    const fl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.16),
      new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide })
    );
    fl.position.set(-0.42 + idx * 0.21, 0.32 - Math.abs(idx - 2) * 0.03, 0.44);
    g.add(fl);
  });
  return g;
}
