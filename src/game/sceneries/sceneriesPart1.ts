import * as THREE from 'three';
import {
  SceneryRuntimeInstance,
  createDioramaBase,
  disableShadowsRecursive,
  getSharedGlowSpriteTexture,
} from './sceneryTypes';

// ============================================================================
// PHASE 2: OUTDOOR SCENERIES 1–5
// Universal Driveway Rule: All scenery starts at z <= -16.2 (beyond the cafe avenue)
// so customers, delivery scooters, passersby & Go Outside vantages never clip.
// ============================================================================

// 1. THE BUSY STREET (Default Urban-Suburban Storefronts + Utility Poles + Distant Traffic)
export function buildBusyStreetScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_busy_street';

  const windowWarmMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.18,
    roughness: 0.25,
  });
  const windowCoolMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.12,
    roughness: 0.22,
  });
  const windowDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.18,
    metalness: 0.42,
  });
  const signEmissiveMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xf97316,
    emissiveIntensity: 0.72,
    roughness: 0.25,
  });
  const corniceMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.78 });
  const frameTrimMat = new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.55 });
  const hvacMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.72, metalness: 0.25 });
  const doorWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c341d, roughness: 0.62 });
  const cedarMat = new THREE.MeshStandardMaterial({ color: 0x7c4a26, roughness: 0.68 });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x1c1e22,
    roughness: 0.45,
    metalness: 0.72,
  });
  const awningMats = [
    new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.78 }),
  ];
  const awningStripeMat = new THREE.MeshStandardMaterial({ color: 0xfaf6f0, roughness: 0.8 });

  const storefrontSpecs = [
    { x: -18.8, w: 4.8, h: 5.8, d: 3.5, wallColor: 0x6d4c41, floors: 3, cols: 3, awningIdx: 2, hasNeonSign: false },
    { x: -13.6, w: 4.8, h: 6.2, d: 3.6, wallColor: 0x8b4d3b, floors: 3, cols: 3, awningIdx: 0, hasNeonSign: false },
    { x: -8.3, w: 4.6, h: 5.1, d: 3.4, wallColor: 0xd6c7b2, floors: 2, cols: 3, awningIdx: 1, hasNeonSign: true },
    { x: -3.2, w: 4.4, h: 6.8, d: 3.6, wallColor: 0x4b5563, floors: 3, cols: 3, awningIdx: 2, hasNeonSign: true, hasWaterTower: true },
    { x: 1.9, w: 4.7, h: 5.5, d: 3.5, wallColor: 0xc9a882, floors: 2, cols: 3, awningIdx: 3, hasNeonSign: false },
    { x: 7.2, w: 4.8, h: 6.4, d: 3.6, wallColor: 0x566558, floors: 3, cols: 3, awningIdx: 0, hasNeonSign: true },
    { x: 12.6, w: 4.8, h: 5.2, d: 3.4, wallColor: 0x7c5c4b, floors: 2, cols: 3, awningIdx: 1, hasNeonSign: false },
    { x: 18.0, w: 4.9, h: 6.0, d: 3.6, wallColor: 0x5f554c, floors: 3, cols: 3, awningIdx: 3, hasNeonSign: true },
  ];

  const winGeo = new THREE.PlaneGeometry(0.76, 1.02);
  const frameGeo = new THREE.BoxGeometry(0.88, 1.12, 0.08);
  const sillGeo = new THREE.BoxGeometry(0.94, 0.09, 0.16);

  storefrontSpecs.forEach((b, bIdx) => {
    const bGroup = new THREE.Group();
    const frontZ = -18.0;
    const centerZ = frontZ - b.d / 2;
    const wallMat = new THREE.MeshStandardMaterial({ color: b.wallColor, roughness: 0.84 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), wallMat);
    body.position.set(0, b.h / 2, 0);
    bGroup.add(body);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(b.w + 0.08, 2.25, b.d + 0.06),
      frameTrimMat
    );
    plinth.position.set(0, 1.125, 0);
    bGroup.add(plinth);

    const shopWin = new THREE.Mesh(
      new THREE.PlaneGeometry(b.w * 0.56, 1.38),
      bIdx % 3 === 2 ? windowCoolMat : windowWarmMat
    );
    shopWin.position.set(-b.w * 0.14, 1.15, b.d / 2 + 0.045);
    bGroup.add(shopWin);

    const shopDoor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.72, 0.08), doorWoodMat);
    shopDoor.position.set(b.w * 0.3, 0.9, b.d / 2 + 0.03);
    bGroup.add(shopDoor);

    const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.78), windowWarmMat);
    doorGlass.position.set(b.w * 0.3, 1.24, b.d / 2 + 0.078);
    bGroup.add(doorGlass);

    const awningGroup = new THREE.Group();
    const awningBody = new THREE.Mesh(
      new THREE.BoxGeometry(b.w - 0.36, 0.14, 0.78),
      awningMats[b.awningIdx % awningMats.length]
    );
    awningBody.rotation.x = 0.28;
    awningGroup.add(awningBody);
    for (let st = -1; st <= 1; st++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.148, 0.79), awningStripeMat);
      stripe.position.x = st * ((b.w - 0.9) * 0.34);
      stripe.rotation.x = 0.28;
      awningGroup.add(stripe);
    }
    awningGroup.position.set(0, 2.24, b.d / 2 + 0.32);
    bGroup.add(awningGroup);

    const spacingX = (b.w - 0.9) / Math.max(1, b.cols);
    for (let fl = 0; fl < b.floors - 1; fl++) {
      const wy = 3.25 + fl * 1.48;
      if (wy > b.h - 0.75) continue;
      for (let col = 0; col < b.cols; col++) {
        const wx = -((b.cols - 1) * spacingX) / 2 + col * spacingX;
        const hash = (bIdx * 7 + fl * 5 + col * 3) % 5;
        const paneMat =
          hash === 0 || hash === 2
            ? windowWarmMat
            : hash === 4
            ? windowCoolMat
            : windowDarkMat;
        const frame = new THREE.Mesh(frameGeo, frameTrimMat);
        frame.position.set(wx, wy, b.d / 2 + 0.015);
        bGroup.add(frame);
        const pane = new THREE.Mesh(winGeo, paneMat);
        pane.position.set(wx, wy, b.d / 2 + 0.062);
        bGroup.add(pane);
        const sill = new THREE.Mesh(sillGeo, corniceMat);
        sill.position.set(wx, wy - 0.58, b.d / 2 + 0.07);
        bGroup.add(sill);
      }
    }

    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(b.w + 0.22, 0.26, b.d + 0.22),
      corniceMat
    );
    cornice.position.set(0, b.h + 0.1, 0);
    bGroup.add(cornice);

    const hvac = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.58, 0.85), hvacMat);
    hvac.position.set(-b.w * 0.24, b.h + 0.48, -0.35);
    bGroup.add(hvac);

    if (b.hasWaterTower) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.95, 10), cedarMat);
      tank.position.set(b.w * 0.22, b.h + 1.05, -0.2);
      bGroup.add(tank);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.36, 10), darkSteelMat);
      cap.position.set(b.w * 0.22, b.h + 1.7, -0.2);
      bGroup.add(cap);
    }

    if (b.hasNeonSign) {
      const signFrame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.35, 0.52), darkSteelMat);
      signFrame.position.set(b.w / 2 - 0.18, 3.65, b.d / 2 + 0.34);
      bGroup.add(signFrame);
      const signGlow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.18, 0.38), signEmissiveMat);
      signGlow.position.set(b.w / 2 - 0.18, 3.65, b.d / 2 + 0.34);
      bGroup.add(signGlow);
    }

    bGroup.position.set(b.x, 0, centerZ);
    root.add(bGroup);
  });

  // Utility poles along the far sidewalk with overhead cable lines
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.085, 5.4, 8);
  const crossArmGeo = new THREE.BoxGeometry(1.1, 0.08, 0.08);
  const poleXs = [-14.5, -4.5, 5.5, 15.5];
  poleXs.forEach((px) => {
    const p = new THREE.Mesh(poleGeo, darkSteelMat);
    p.position.set(px, 2.7, -16.45);
    root.add(p);
    const arm = new THREE.Mesh(crossArmGeo, darkSteelMat);
    arm.position.set(px, 5.1, -16.45);
    root.add(arm);
  });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1f2937 });
  for (let i = 0; i < poleXs.length - 1; i++) {
    const pts = [
      new THREE.Vector3(poleXs[i], 5.1, -16.45),
      new THREE.Vector3((poleXs[i] + poleXs[i + 1]) * 0.5, 4.78, -16.45),
      new THREE.Vector3(poleXs[i + 1], 5.1, -16.45),
    ];
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }

  // Distant low-poly horizon skyline blocks behind storefronts
  const farSkyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const farCount = 12;
  const farInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), farSkyMat, farCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < farCount; i++) {
    const w = 4.2 + (i % 3) * 1.4;
    const h = 8 + ((i * 5) % 9);
    dummy.position.set(-34 + i * 6.2, h / 2, -29 - (i % 3) * 4);
    dummy.scale.set(w, h, 3.6);
    dummy.updateMatrix();
    farInst.setMatrixAt(i, dummy.matrix);
  }
  farInst.instanceMatrix.needsUpdate = true;
  root.add(farInst);

  // Distant looping box-silhouette traffic (2 lanes along z = -11.3 & -13.9, safe & distant)
  const cars: Array<{ group: THREE.Group; speed: number; dir: 1 | -1 }> = [];
  const carColors = [0xdc2626, 0x2563eb, 0xf59e0b, 0xe2e8f0];
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  for (let c = 0; c < 4; c++) {
    const dir: 1 | -1 = c % 2 === 0 ? 1 : -1;
    const car = new THREE.Group();
    const cMat = new THREE.MeshStandardMaterial({
      color: carColors[c],
      roughness: 0.35,
      metalness: 0.35,
    });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.56, 1.05), cMat);
    chassis.position.y = 0.42;
    car.add(chassis);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.45, 0.92), cMat);
    cabin.position.set(-0.1 * dir, 0.88, 0);
    car.add(cabin);
    const frontLight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.78), headMat);
    frontLight.position.set(1.16 * dir, 0.45, 0);
    car.add(frontLight);
    const rearLight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.78), tailMat);
    rearLight.position.set(-1.16 * dir, 0.45, 0);
    car.add(rearLight);
    car.position.set(-22 + c * 14, 0, dir === 1 ? -14.2 : -11.1);
    root.add(car);
    cars.push({ group: car, speed: 5.5 + (c % 2) * 1.8, dir });
  }

  disableShadowsRecursive(root);

  return {
    id: 'busy_street',
    root,
    envHint: {},
    update: (dt, _elapsed, isNight) => {
      windowWarmMat.emissiveIntensity = isNight ? 1.55 : 0.16;
      windowCoolMat.emissiveIntensity = isNight ? 1.1 : 0.1;
      signEmissiveMat.emissiveIntensity = isNight ? 1.9 : 0.55;
      for (const c of cars) {
        c.group.position.x += c.dir * c.speed * dt;
        if (c.dir === 1 && c.group.position.x > 28) c.group.position.x = -28;
        if (c.dir === -1 && c.group.position.x < -28) c.group.position.x = 28;
      }
    },
  };
}

export function buildBusyStreetDiorama(): THREE.Group {
  const g = createDioramaBase(0x4b5563);
  const b1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.78, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x8b4d3b, roughness: 0.8 })
  );
  b1.position.set(-0.34, 0.42, -0.15);
  g.add(b1);
  const b2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.96, 0.46),
    new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.75 })
  );
  b2.position.set(0.28, 0.51, -0.1);
  g.add(b2);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.08, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.7 })
  );
  awning.position.set(-0.34, 0.34, 0.14);
  awning.rotation.x = 0.3;
  g.add(awning);
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.1,
  });
  const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.04), winMat);
  w1.position.set(0.28, 0.65, 0.15);
  g.add(w1);
  const car = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.16, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 })
  );
  car.position.set(0.05, 0.12, 0.45);
  g.add(car);
  return g;
}

// 2. MAYON VOLCANO VIEW (Cagsawa Ruins, Bicol — Perfect Cone + Belfry + Instanced Coconut Palms)
export function buildMayonVolcanoScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_mayon_volcano';

  // Lush rolling Bicol emerald plains starting cleanly past the far sidewalk
  const meadowMat = new THREE.MeshStandardMaterial({ color: 0x3b7a38, roughness: 0.92 });
  const meadow = new THREE.Mesh(new THREE.PlaneGeometry(180, 140), meadowMat);
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.set(0, -0.06, -86);
  root.add(meadow);

  // Subtle green foothills hugging the volcano base
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x2f6331, roughness: 0.9 });
  [
    { x: -38, z: -64, r: 22, h: 7 },
    { x: 36, z: -62, r: 24, h: 8 },
    { x: -16, z: -56, r: 16, h: 4.5 },
    { x: 22, z: -58, r: 18, h: 5 },
  ].forEach((h) => {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(h.r, h.h, 12), hillMat);
    hill.position.set(h.x, h.h * 0.42, h.z);
    root.add(hill);
  });

  // Iconic near-perfect symmetrical Mayon Volcano cone rising front-center horizon
  const mayonGroup = new THREE.Group();
  mayonGroup.position.set(-1.5, 0, -96);
  // Smooth hyperboloid-like symmetrical volcanic profile via LatheGeometry
  const profile = [
    new THREE.Vector2(44, 0),
    new THREE.Vector2(30, 6.5),
    new THREE.Vector2(19.5, 14.5),
    new THREE.Vector2(11.8, 23.5),
    new THREE.Vector2(6.2, 32.5),
    new THREE.Vector2(2.8, 39.2),
    new THREE.Vector2(1.9, 40.2),
    new THREE.Vector2(1.2, 39.4),
  ];
  const mayonGeo = new THREE.LatheGeometry(profile, 28);
  // Vertex-color lush lower green -> volcanic slate mid -> warm charcoal ash summit
  const posAttr = mayonGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const cBase = new THREE.Color(0x2d5e2e);
  const cMid = new THREE.Color(0x4a5d47);
  const cSummit = new THREE.Color(0x524c48);
  const tmpC = new THREE.Color();
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    if (y < 14) {
      tmpC.lerpColors(cBase, cMid, y / 14);
    } else {
      tmpC.lerpColors(cMid, cSummit, Math.min(1, (y - 14) / 26));
    }
    colors[i * 3] = tmpC.r;
    colors[i * 3 + 1] = tmpC.g;
    colors[i * 3 + 2] = tmpC.b;
  }
  mayonGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mayonMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    flatShading: true,
  });
  const mayonMesh = new THREE.Mesh(mayonGeo, mayonMat);
  mayonGroup.add(mayonMesh);

  // Soft drifting cloud ring near Mayon's crater
  const cloudRing = new THREE.Group();
  cloudRing.position.set(0, 34.5, 0);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.95,
    transparent: true,
    opacity: 0.78,
  });
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(2.8 + (i % 3) * 0.9, 9, 7), cloudMat);
    puff.scale.set(1.8, 0.52, 1.3);
    puff.position.set(Math.cos(ang) * 7.8, (i % 2) * 1.1, Math.sin(ang) * 6.5);
    cloudRing.add(puff);
  }
  mayonGroup.add(cloudRing);
  root.add(mayonGroup);

  // Weathered volcanic-stone Cagsawa Church Belfry Ruin (slightly off-center midground)
  const belfry = new THREE.Group();
  belfry.position.set(8.2, 0, -33.5);
  belfry.rotation.y = -0.22;
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7c7265, roughness: 0.95 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x4b443c, roughness: 0.96 });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x3f6b32, roughness: 0.9 });

  const tier1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.6, 3.4), stoneMat);
  tier1.position.y = 1.8;
  belfry.add(tier1);
  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.7, 2.7), stoneMat);
  tier2.position.y = 4.95;
  belfry.add(tier2);
  const tier3 = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.9, 2.05), stoneMat);
  tier3.position.y = 7.25;
  belfry.add(tier3);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), stoneMat);
  dome.position.y = 8.15;
  belfry.add(dome);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.14), darkStoneMat);
  crossV.position.y = 9.45;
  belfry.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.14), darkStoneMat);
  crossH.position.y = 9.6;
  belfry.add(crossH);

  // Arched bell openings + mossy ruin stones
  const archVoid = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.35, 2.85), darkStoneMat);
  archVoid.position.y = 5.05;
  belfry.add(archVoid);
  const ruinWall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.35, 0.55), stoneMat);
  ruinWall.position.set(-3.4, 0.68, 0.4);
  belfry.add(ruinWall);
  const mossPatch = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.25, 2.8), mossMat);
  mossPatch.position.y = 3.68;
  belfry.add(mossPatch);
  root.add(belfry);

  // Low stone park wall along far sidewalk
  const wallBorder = new THREE.Mesh(new THREE.BoxGeometry(52, 0.62, 0.42), stoneMat);
  wallBorder.position.set(0, 0.31, -17.6);
  root.add(wallBorder);

  // Instanced tropical coconut palms framing left & right (2 InstancedMeshes = 2 draw calls)
  const palmSpots = [
    [-19, -21], [-15.5, -24], [-11.5, -22], [-22, -29], [-16.8, -33], [-9.2, -31],
    [14.5, -21], [18.5, -25], [22.5, -22], [16.5, -34], [24, -30], [-26, -24],
    [27, -26], [-13, -42], [15, -44], [5.5, -43],
  ];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a593c, roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2b7a37, roughness: 0.78 });
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.14, 0.24, 5.4, 7),
    trunkMat,
    palmSpots.length
  );
  const crowns = new THREE.InstancedMesh(
    new THREE.ConeGeometry(2.1, 1.35, 7),
    frondMat,
    palmSpots.length
  );
  const dummy = new THREE.Object3D();
  palmSpots.forEach(([px, pz], idx) => {
    const hScale = 0.85 + (idx % 4) * 0.16;
    const lean = ((idx % 3) - 1) * 0.12;
    dummy.position.set(px, 2.7 * hScale, pz);
    dummy.rotation.set(lean * 0.4, idx * 0.9, lean);
    dummy.scale.set(1, hScale, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(px - lean * 2.4, 5.3 * hScale, pz);
    dummy.rotation.set(0, idx * 1.1, 0);
    dummy.scale.set(hScale, hScale * 0.9, hScale);
    dummy.updateMatrix();
    crowns.setMatrixAt(idx, dummy.matrix);
  });
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  root.add(trunks, crowns);

  disableShadowsRecursive(root);

  return {
    id: 'mayon_volcano',
    root,
    envHint: {
      fogColorDay: 0xd4e8e6,
      fogColorNight: 0x0f1a2a,
      fogDensityScale: 0.72,
    },
    update: (dt) => {
      cloudRing.rotation.y += dt * 0.08;
    },
  };
}

export function buildMayonVolcanoDiorama(): THREE.Group {
  const g = createDioramaBase(0x3b7a38);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.68, 1.12, 16),
    new THREE.MeshStandardMaterial({ color: 0x456b42, roughness: 0.88, flatShading: true })
  );
  cone.position.set(-0.14, 0.58, -0.18);
  g.add(cone);
  const ashCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.34, 16),
    new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9 })
  );
  ashCap.position.set(-0.14, 0.97, -0.18);
  g.add(ashCap);
  const cloud = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.055, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.95 })
  );
  cloud.rotation.x = Math.PI / 2;
  cloud.position.set(-0.14, 0.84, -0.18);
  g.add(cloud);
  // Mini Cagsawa belfry
  const belfry = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.48, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x8a7e6e, roughness: 0.92 })
  );
  belfry.position.set(0.45, 0.26, 0.22);
  g.add(belfry);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.04, 0.42, 6),
    new THREE.MeshStandardMaterial({ color: 0x7a593c })
  );
  trunk.position.set(-0.62, 0.22, 0.32);
  g.add(trunk);
  const frond = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.16, 6),
    new THREE.MeshStandardMaterial({ color: 0x22c55e })
  );
  frond.position.set(-0.62, 0.46, 0.32);
  g.add(frond);
  return g;
}

// 3. HILLTOP CITY LIGHTS (Tagaytay / Baguio Ridge — Pine Trees + Single THREE.Points Valley Lights + Highland Mist)
export function buildHilltopCityLightsScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_hilltop_city_lights';

  // Wooden ridge lookout railing right past the far sidewalk
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.8 });
  const darkPineMat = new THREE.MeshStandardMaterial({ color: 0x1e4d34, roughness: 0.86 });
  const ridgeStoneMat = new THREE.MeshStandardMaterial({ color: 0x3f4742, roughness: 0.92 });

  const railTop = new THREE.Mesh(new THREE.BoxGeometry(54, 0.1, 0.12), woodMat);
  railTop.position.set(0, 1.05, -17.5);
  root.add(railTop);
  const railMid = new THREE.Mesh(new THREE.BoxGeometry(54, 0.08, 0.08), woodMat);
  railMid.position.set(0, 0.58, -17.5);
  root.add(railMid);

  const postCount = 24;
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1.15, 0.12), woodMat, postCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < postCount; i++) {
    dummy.position.set(-24 + i * 2.1, 0.55, -17.5);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  root.add(posts);

  // Steep mountain drop-off + deep valley floor below
  const slope = new THREE.Mesh(new THREE.PlaneGeometry(160, 28), ridgeStoneMat);
  slope.rotation.x = -Math.PI * 0.28;
  slope.position.set(0, -8.5, -28);
  root.add(slope);

  const valleyFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 130),
    new THREE.MeshStandardMaterial({ color: 0x16222c, roughness: 0.95 })
  );
  valleyFloor.rotation.x = -Math.PI / 2;
  valleyFloor.position.set(0, -16.5, -82);
  root.add(valleyFloor);

  // Distant mountain ridge silhouettes across the valley
  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x213240, roughness: 0.95 });
  [-56, -24, 6, 36, 62].forEach((rx, idx) => {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(28 + (idx % 2) * 8, 26 + (idx % 3) * 7, 7), ridgeMat);
    peak.position.set(rx, -4.5, -112 - (idx % 2) * 14);
    root.add(peak);
  });

  // Crisp Instanced Baguio Pine Trees lining the mountain ridge (2 draw calls total)
  const pineCoords: Array<[number, number, number]> = [];
  for (let i = 0; i < 28; i++) {
    const x = -28 + i * 2.1 + Math.sin(i * 2.7) * 0.7;
    // Leave scenic center window vista slightly open in front of doorway
    if (Math.abs(x) < 4.8 && i % 3 !== 0) continue;
    const z = -19.2 - (i % 4) * 2.4;
    const y = -0.8 - (i % 4) * 1.1;
    pineCoords.push([x, y, z]);
  }
  const pineTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.18, 2.8, 6),
    woodMat,
    pineCoords.length
  );
  const pineCanopy = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.35, 4.4, 7),
    darkPineMat,
    pineCoords.length
  );
  pineCoords.forEach(([x, y, z], idx) => {
    const sc = 0.8 + (idx % 4) * 0.22;
    dummy.position.set(x, y + 1.4 * sc, z);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    pineTrunks.setMatrixAt(idx, dummy.matrix);
    dummy.position.set(x, y + 3.8 * sc, z);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    pineCanopy.setMatrixAt(idx, dummy.matrix);
  });
  pineTrunks.instanceMatrix.needsUpdate = true;
  pineCanopy.instanceMatrix.needsUpdate = true;
  root.add(pineTrunks, pineCanopy);

  // Single THREE.Points draw call for hundreds of shimmering valley city lights!
  const lightCount = 460;
  const positions = new Float32Array(lightCount * 3);
  const colors = new Float32Array(lightCount * 3);
  const palette = [
    new THREE.Color(0xfbbf24),
    new THREE.Color(0xfde68a),
    new THREE.Color(0xf97316),
    new THREE.Color(0x7dd3fc),
    new THREE.Color(0xffffff),
  ];
  for (let i = 0; i < lightCount; i++) {
    const cluster = (i % 7) - 3;
    const spreadX = cluster * 14 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 26;
    const spreadZ = -34 - Math.abs((Math.cos(i * 78.233) * 19341.23) % 1) * 74;
    positions[i * 3] = spreadX;
    positions[i * 3 + 1] = -15.9 + (i % 5) * 0.18;
    positions[i * 3 + 2] = spreadZ;
    const col = palette[i % palette.length];
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  const lightsGeo = new THREE.BufferGeometry();
  lightsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  lightsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const cityLightsMat = new THREE.PointsMaterial({
    size: 1.45,
    vertexColors: true,
    map: getSharedGlowSpriteTexture(),
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const valleyLights = new THREE.Points(lightsGeo, cityLightsMat);
  root.add(valleyLights);

  // Drifting cool highland mist sprites
  const mistSprites: THREE.Sprite[] = [];
  const mistMat = new THREE.SpriteMaterial({
    map: getSharedGlowSpriteTexture(),
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  for (let m = 0; m < 10; m++) {
    const sp = new THREE.Sprite(mistMat);
    sp.position.set(-28 + m * 6.5, -2.5 + (m % 3) * 1.9, -28 - (m % 4) * 9);
    sp.scale.set(16, 4.8, 1);
    root.add(sp);
    mistSprites.push(sp);
  }

  disableShadowsRecursive(root);

  return {
    id: 'hilltop_city_lights',
    root,
    envHint: {
      fogColorDay: 0xcbd9e6,
      fogColorNight: 0x0b1222,
      fogDensityScale: 1.05,
    },
    update: (dt, elapsed, isNight) => {
      cityLightsMat.opacity = isNight
        ? 0.88 + Math.sin(elapsed * 2.1) * 0.1
        : 0.24;
      cityLightsMat.size = isNight ? 1.65 : 0.9;
      mistMat.opacity = isNight ? 0.12 : 0.2;
      for (let i = 0; i < mistSprites.length; i++) {
        mistSprites[i].position.x += dt * (0.42 + (i % 3) * 0.14);
        if (mistSprites[i].position.x > 34) mistSprites[i].position.x = -34;
      }
    },
  };
}

export function buildHilltopCityLightsDiorama(): THREE.Group {
  const g = createDioramaBase(0x1e293b);
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x1e4d34, roughness: 0.85 });
  [-0.55, -0.25, 0.5].forEach((px, i) => {
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.56 + (i % 2) * 0.16, 6), pineMat);
    p.position.set(px, 0.34, 0.22);
    g.add(p);
  });
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  for (let i = 0; i < 14; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), dotMat);
    dot.position.set(
      -0.65 + (i % 5) * 0.32,
      0.08 + ((i * 3) % 4) * 0.04,
      -0.1 - Math.floor(i / 5) * 0.28
    );
    g.add(dot);
  }
  return g;
}

// 4. JAPANESE TRANQUILITY (Ancient Kyoto Town — Machiya, Chochin Lanterns, Pagoda, Sakura / Fireflies)
export function buildJapaneseTranquilityScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_japanese_tranquility';

  const darkCedarMat = new THREE.MeshStandardMaterial({ color: 0x3b261b, roughness: 0.84 });
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xede3d2, roughness: 0.88 });
  const roofTileMat = new THREE.MeshStandardMaterial({ color: 0x262b33, roughness: 0.72 });
  const shojiMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });

  // Historic Machiya Wooden Townhouses flanking left & right (leaving center view open to misty pagoda!)
  const machiyaXs = [-16.2, -10.4, -4.8, 5.2, 11.0, 16.8];
  machiyaXs.forEach((mx, idx) => {
    const h = 4.9 + (idx % 2) * 0.7;
    const w = 5.0;
    const d = 3.8;
    const house = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), darkCedarMat);
    body.position.y = h / 2;
    house.add(body);

    // Upper white plaster wall band
    const upper = new THREE.Mesh(new THREE.BoxGeometry(w - 0.24, 1.55, d + 0.04), plasterMat);
    upper.position.y = h - 1.05;
    house.add(upper);

    // Warm shoji sliding door panels on ground floor
    const shoji = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.85), shojiMat);
    shoji.position.set(0, 1.15, d / 2 + 0.04);
    house.add(shoji);

    // Traditional sweeping dark tiled eaves (lower & upper)
    const lowerEave = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.22, 1.1), roofTileMat);
    lowerEave.position.set(0, 2.38, d / 2 + 0.36);
    lowerEave.rotation.x = 0.26;
    house.add(lowerEave);

    const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.82, 1.55, 4), roofTileMat);
    mainRoof.rotation.y = Math.PI / 4;
    mainRoof.scale.set(1.05, 1, 0.88);
    mainRoof.position.y = h + 0.72;
    house.add(mainRoof);

    house.position.set(mx, 0, -20.2);
    root.add(house);
  });

  // Glowing Chochin Red/Amber Paper Lanterns via ONE InstancedMesh
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xef4444,
    emissiveIntensity: 1.2,
    roughness: 0.35,
  });
  const lanternGeo = new THREE.SphereGeometry(0.22, 10, 8);
  lanternGeo.scale(0.85, 1.35, 0.85);
  const lanterns = new THREE.InstancedMesh(lanternGeo, lanternMat, machiyaXs.length * 2);
  const dummy = new THREE.Object3D();
  machiyaXs.forEach((mx, idx) => {
    [-1.6, 1.6].forEach((ox, side) => {
      dummy.position.set(mx + ox, 2.08, -17.65);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      lanterns.setMatrixAt(idx * 2 + side, dummy.matrix);
    });
  });
  lanterns.instanceMatrix.needsUpdate = true;
  root.add(lanterns);

  // Cherry Blossom (Sakura) Trees framing the lane opening
  const sakuraBloomMat = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.78 });
  [
    [-1.9, -22.5],
    [2.6, -24.5],
    [-19.5, -23.5],
    [20.2, -23.5],
  ].forEach(([sx, sz]) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 3.2, 7), darkCedarMat);
    trunk.position.set(sx, 1.6, sz);
    root.add(trunk);
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.75, 1), sakuraBloomMat);
    crown.scale.set(1.25, 0.78, 1.1);
    crown.position.set(sx, 3.65, sz);
    root.add(crown);
  });

  // Distant misty 5-tier Kyoto Pagoda centered in the valley opening
  const pagoda = new THREE.Group();
  pagoda.position.set(0.2, 0, -48);
  const pagodaBodyMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.8 });
  for (let tier = 0; tier < 5; tier++) {
    const scale = 1 - tier * 0.13;
    const y = 1.6 + tier * 2.15;
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(2.6 * scale, 1.5, 2.6 * scale),
      pagodaBodyMat
    );
    core.position.y = y;
    pagoda.add(core);
    const eave = new THREE.Mesh(
      new THREE.ConeGeometry(3.2 * scale, 0.78, 4),
      roofTileMat
    );
    eave.rotation.y = Math.PI / 4;
    eave.position.y = y + 1.05;
    pagoda.add(eave);
  }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 2.6, 6), roofTileMat);
  spire.position.y = 13.0;
  pagoda.add(spire);
  root.add(pagoda);

  // Misty bamboo-green hillside behind pagoda
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x2f4b3c, roughness: 0.92 });
  const backHill = new THREE.Mesh(new THREE.ConeGeometry(42, 18, 10), hillMat);
  backHill.position.set(0, 8, -82);
  root.add(backHill);

  // Drifting Sakura Petals (day) / Warm Fireflies (night) in a single THREE.Points field
  const pCount = 140;
  const pPositions = new Float32Array(pCount * 3);
  const pSeeds = new Float32Array(pCount);
  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = -18 + Math.random() * 36;
    pPositions[i * 3 + 1] = 0.6 + Math.random() * 6.5;
    pPositions[i * 3 + 2] = -16.5 - Math.random() * 18;
    pSeeds[i] = Math.random() * Math.PI * 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const sakuraFireflyMat = new THREE.PointsMaterial({
    size: 0.34,
    color: 0xf9a8d4,
    map: getSharedGlowSpriteTexture(),
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particleField = new THREE.Points(pGeo, sakuraFireflyMat);
  root.add(particleField);

  disableShadowsRecursive(root);

  return {
    id: 'japanese_tranquility',
    root,
    envHint: {
      fogColorDay: 0xfce7f3,
      fogColorNight: 0x111525,
      fogDensityScale: 0.9,
    },
    update: (dt, elapsed, isNight) => {
      shojiMat.emissiveIntensity = isNight ? 1.45 : 0.25;
      lanternMat.emissiveIntensity = isNight ? 2.1 : 0.7;
      sakuraFireflyMat.color.setHex(isNight ? 0xfde047 : 0xf9a8d4);
      sakuraFireflyMat.size = isNight ? 0.38 : 0.28;
      sakuraFireflyMat.opacity = isNight ? 0.75 + Math.sin(elapsed * 3.5) * 0.2 : 0.85;

      const attr = pGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pCount; i++) {
        let x = attr.getX(i);
        let y = attr.getY(i);
        const seed = pSeeds[i];
        if (isNight) {
          // Gentle firefly bobbing
          x += Math.sin(elapsed * 0.9 + seed) * dt * 0.45;
          y += Math.cos(elapsed * 1.2 + seed) * dt * 0.28;
          if (y < 0.6) y = 0.8;
          if (y > 5.5) y = 5.2;
        } else {
          // Drifting sakura petals
          x += (0.85 + Math.sin(elapsed + seed) * 0.4) * dt;
          y -= 0.72 * dt;
          if (y < 0.3) {
            y = 6.8;
            x = -18 + ((i * 7.3) % 36);
          }
          if (x > 19) x = -19;
        }
        attr.setXY(i, x, y);
      }
      attr.needsUpdate = true;
    },
  };
}

export function buildJapaneseTranquilityDiorama(): THREE.Group {
  const g = createDioramaBase(0x4b5563);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.8 });
  for (let t = 0; t < 3; t++) {
    const s = 1 - t * 0.22;
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.22, 0.42 * s), bodyMat);
    c.position.set(0.15, 0.14 + t * 0.28, -0.1);
    g.add(c);
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.46 * s, 0.14, 4), roofMat);
    r.rotation.y = Math.PI / 4;
    r.position.set(0.15, 0.28 + t * 0.28, -0.1);
    g.add(r);
  }
  const sakura = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.32, 1),
    new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.75 })
  );
  sakura.position.set(-0.48, 0.42, 0.22);
  g.add(sakura);
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xef4444, emissiveIntensity: 1.5 })
  );
  lantern.position.set(0.55, 0.28, 0.35);
  g.add(lantern);
  return g;
}

// 5. BRAZILIAN FAVELA (Rio de Janeiro View — Instanced Colorful Hillside + Guanabara Bay + Sugarloaf)
export function buildBrazilianFavelaScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_brazilian_favela';

  // Terraced hillside earth base + Guanabara Bay ocean shimmer
  const hillsideMat = new THREE.MeshStandardMaterial({ color: 0x5c4738, roughness: 0.92 });
  const hillBase = new THREE.Mesh(new THREE.BoxGeometry(90, 14, 24), hillsideMat);
  hillBase.position.set(-22, 2.5, -36);
  hillBase.rotation.z = -0.14;
  root.add(hillBase);

  const bayMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.24,
    metalness: 0.25,
  });
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(180, 120), bayMat);
  bay.rotation.x = -Math.PI / 2;
  bay.position.set(12, -5.5, -86);
  root.add(bay);

  // Colorful stacked low-poly favela houses packed into ONE InstancedMesh with instanceColor!
  const houseCount = 96;
  const houseGeo = new THREE.BoxGeometry(1, 1, 1);
  const houseMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const houses = new THREE.InstancedMesh(houseGeo, houseMat, houseCount);
  const palette = [
    new THREE.Color(0xe07a5f), // Terracotta
    new THREE.Color(0xf97316), // Coral orange
    new THREE.Color(0x0d9488), // Vibrant teal
    new THREE.Color(0xeab308), // Sun mustard
    new THREE.Color(0x2563eb), // Cobalt blue
    new THREE.Color(0xec4899), // Magenta pink
    new THREE.Color(0xfef3c7), // Sun-bleached plaster
  ];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < houseCount; i++) {
    const col = i % 16;
    const tier = Math.floor(i / 16);
    const hx = -30 + col * 3.1 + (tier % 2) * 1.1;
    // Leave open right-center ocean view to Sugarloaf Mountain
    const xPos = hx > 6 ? hx + 10 : hx;
    const hz = -19.5 - tier * 3.4;
    const hy = tier * 1.9 + ((i * 3) % 3) * 0.35;
    const w = 2.4 + (i % 3) * 0.55;
    const h = 2.1 + (i % 4) * 0.45;
    const d = 2.3 + (i % 2) * 0.5;
    dummy.position.set(xPos, hy + h / 2, hz);
    dummy.rotation.set(0, ((i % 3) - 1) * 0.06, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    houses.setMatrixAt(i, dummy.matrix);
    houses.setColorAt(i, palette[i % palette.length]);
  }
  houses.instanceMatrix.needsUpdate = true;
  if (houses.instanceColor) houses.instanceColor.needsUpdate = true;
  root.add(houses);

  // Subtle overhead favela utility wires
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
  for (let w = 0; w < 3; w++) {
    const pts = [
      new THREE.Vector3(-24, 5.2 + w * 0.4, -18.5),
      new THREE.Vector3(-4, 4.4 + w * 0.35, -18.5),
      new THREE.Vector3(16, 5.4 + w * 0.4, -18.5),
    ];
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }

  // Sugarloaf Mountain rising cleanly across Guanabara Bay
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 });
  const greenMountMat = new THREE.MeshStandardMaterial({ color: 0x2f6838, roughness: 0.9 });
  const sugarloaf = new THREE.Mesh(new THREE.SphereGeometry(12, 14, 12), rockMat);
  sugarloaf.scale.set(0.9, 1.85, 0.9);
  sugarloaf.position.set(16, 4.5, -88);
  root.add(sugarloaf);
  const morro = new THREE.Mesh(new THREE.ConeGeometry(16, 15, 10), greenMountMat);
  morro.position.set(4, 1.5, -92);
  root.add(morro);

  // Distant Corcovado hilltop statue silhouette (tiny iconic cross-armed silhouette)
  const corcovado = new THREE.Mesh(new THREE.ConeGeometry(14, 24, 9), greenMountMat);
  corcovado.position.set(-20, 6.5, -98);
  root.add(corcovado);
  const statueMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.25,
    roughness: 0.5,
  });
  const statueBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 3.6, 8), statueMat);
  statueBody.position.set(-20, 20.1, -98);
  root.add(statueBody);
  const statueArms = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.36, 0.36), statueMat);
  statueArms.position.set(-20, 21.1, -98);
  root.add(statueArms);

  disableShadowsRecursive(root);

  return {
    id: 'brazilian_favela',
    root,
    envHint: {
      fogColorDay: 0xdbeafe,
      fogColorNight: 0x0f172a,
      fogDensityScale: 0.78,
    },
    update: (_dt, _elapsed, isNight) => {
      statueMat.emissiveIntensity = isNight ? 1.8 : 0.2;
      bayMat.color.setHex(isNight ? 0x0b2545 : 0x0284c7);
    },
  };
}

export function buildBrazilianFavelaDiorama(): THREE.Group {
  const g = createDioramaBase(0x0284c7);
  const colors = [0xe07a5f, 0xeab308, 0x0d9488, 0x2563eb, 0xf97316, 0xec4899];
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.28 + (i % 2) * 0.14, 0.3),
      new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.8 })
    );
    b.position.set(-0.52 + (i % 3) * 0.34, 0.18 + Math.floor(i / 3) * 0.26, 0.25 - Math.floor(i / 3) * 0.25);
    g.add(b);
  }
  const peak = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x3b7a38, roughness: 0.88 })
  );
  peak.scale.set(0.85, 1.75, 0.85);
  peak.position.set(0.54, 0.42, -0.26);
  g.add(peak);
  return g;
}
