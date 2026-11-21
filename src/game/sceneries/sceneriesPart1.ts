import * as THREE from 'three';
import {
  SceneryRuntimeInstance,
  createDioramaBase,
  disableShadowsRecursive,
  getSharedGlowSpriteTexture,
} from './sceneryTypes';
import {
  addSurrounding360Context,
  createProceduralFacadeTextures,
} from './surroundingContext';

// ============================================================================
// PHASE 3: OUTDOOR SCENERIES 1–5 (HIGH-DETAIL MOBILE-OPTIMIZED OVERHAUL)
// Universal Driveway Rule: All scenery starts at z <= -16.2 (beyond the cafe avenue)
// so customers, delivery scooters, passersby & Go Outside vantages never clip.
// ============================================================================

function createKyotoFlagstoneTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Damp slate mortar base
  ctx.fillStyle = '#3f454c';
  ctx.fillRect(0, 0, w, h);

  // Interlocking Kyoto ishidatami granite flagstones
  const stoneShades = ['#646b73', '#5a6169', '#707780', '#545b63', '#6b727a'];
  const rows = 8;
  const rowH = h / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * 28;
    let x = -offset;
    let col = 0;
    while (x < w) {
      const sw = 44 + ((r * 17 + col * 23) % 28);
      ctx.fillStyle = stoneShades[(r * 5 + col * 3) % stoneShades.length];
      ctx.fillRect(x + 2, r * rowH + 2, sw - 4, rowH - 4);
      // Subtle bevel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x + 3, r * rowH + 3, sw - 6, 3);
      // Moss flecks along occasional joints
      if ((r + col) % 4 === 0) {
        ctx.fillStyle = 'rgba(74, 108, 62, 0.45)';
        ctx.fillRect(x, r * rowH, 4, 6);
      }
      x += sw;
      col++;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 4);
  tex.userData = { ownedByScenery: true };
  return tex;
}

function createKanbanSignTexture(
  bgHex: string,
  inkHex: string,
  glyphs: string[]
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 96, 256);
  ctx.strokeStyle = inkHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 80, 240);

  ctx.fillStyle = inkHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 42px serif';
  glyphs.forEach((g, idx) => {
    ctx.fillText(g, 48, 56 + idx * 62);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { ownedByScenery: true };
  return tex;
}

function createTransitPosterTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 192);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.6, '#1e3a8a');
  grad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 192);

  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(64, 68, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(18, 118, 92, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(28, 140, 72, 8);
  ctx.fillRect(36, 156, 56, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { ownedByScenery: true };
  return tex;
}

function createStripedTarpTexture(colorA: string, colorB: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  for (let x = 0; x < 128; x += 16) {
    ctx.fillStyle = (x / 16) % 2 === 0 ? colorA : colorB;
    ctx.fillRect(x, 0, 16, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { ownedByScenery: true };
  return tex;
}

// ============================================================================
// 1. THE BUSY STREET (Detailed Storefronts, Bus Shelter, Vending, Textured Skyline)
// ============================================================================
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
  const signCyanMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.65,
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
  const glassShelterMat = new THREE.MeshStandardMaterial({
    color: 0xcbe7f7,
    roughness: 0.15,
    metalness: 0.15,
    transparent: true,
    opacity: 0.38,
  });
  const planterMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.88 });
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 0.86 });
  const awningMats = [
    new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.78 }),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.78 }),
  ];
  const awningStripeMat = new THREE.MeshStandardMaterial({ color: 0xfaf6f0, roughness: 0.8 });

  const storefrontSpecs = [
    { x: -18.8, w: 4.8, h: 5.8, d: 3.5, wallHex: '#6d4c41', floors: 3, cols: 3, awningIdx: 2, hasNeonSign: false },
    { x: -13.6, w: 4.8, h: 6.2, d: 3.6, wallHex: '#8b4d3b', floors: 3, cols: 3, awningIdx: 0, hasNeonSign: false },
    { x: -8.3, w: 4.6, h: 5.1, d: 3.4, wallHex: '#d6c7b2', floors: 2, cols: 3, awningIdx: 1, hasNeonSign: true },
    { x: -3.2, w: 4.4, h: 6.8, d: 3.6, wallHex: '#4b5563', floors: 3, cols: 3, awningIdx: 2, hasNeonSign: true, hasWaterTower: true },
    { x: 1.9, w: 4.7, h: 5.5, d: 3.5, wallHex: '#c9a882', floors: 2, cols: 3, awningIdx: 3, hasNeonSign: false },
    { x: 7.2, w: 4.8, h: 6.4, d: 3.6, wallHex: '#566558', floors: 3, cols: 3, awningIdx: 0, hasNeonSign: true },
    { x: 12.6, w: 4.8, h: 5.2, d: 3.4, wallHex: '#7c5c4b', floors: 2, cols: 3, awningIdx: 1, hasNeonSign: false },
    { x: 18.0, w: 4.9, h: 6.0, d: 3.6, wallHex: '#5f554c', floors: 3, cols: 3, awningIdx: 3, hasNeonSign: true },
  ];

  const winGeo = new THREE.PlaneGeometry(0.76, 1.02);
  const frameGeo = new THREE.BoxGeometry(0.88, 1.12, 0.08);
  const sillGeo = new THREE.BoxGeometry(0.94, 0.09, 0.16);

  storefrontSpecs.forEach((b, bIdx) => {
    const bGroup = new THREE.Group();
    const frontZ = -18.2;
    const centerZ = frontZ - b.d / 2;
    const wallMat = new THREE.MeshStandardMaterial({ color: b.wallHex, roughness: 0.84 });

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

    // Subtle window mullions over ground shopfront
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 0.06), frameTrimMat);
    mullionV.position.set(-b.w * 0.14, 1.15, b.d / 2 + 0.055);
    bGroup.add(mullionV);

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
      const signGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 1.18, 0.38),
        bIdx % 2 === 0 ? signEmissiveMat : signCyanMat
      );
      signGlow.position.set(b.w / 2 - 0.18, 3.65, b.d / 2 + 0.34);
      bGroup.add(signGlow);
    }

    bGroup.position.set(b.x, 0, centerZ);
    root.add(bGroup);
  });

  // Street furniture: Bus stop shelter with backlit transit ad & bench
  const shelter = new THREE.Group();
  shelter.position.set(-10.8, 0, -17.15);
  const shelterRoof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.15), darkSteelMat);
  shelterRoof.position.set(0, 2.38, 0);
  shelter.add(shelterRoof);
  [-1.45, 0, 1.45].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.36, 6), darkSteelMat);
    post.position.set(px, 1.18, -0.45);
    shelter.add(post);
  });
  const backGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 2.05), glassShelterMat);
  backGlass.position.set(0, 1.25, -0.44);
  shelter.add(backGlass);
  const adBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 0.98), darkSteelMat);
  adBox.position.set(-1.52, 1.22, 0);
  shelter.add(adBox);
  const posterTex = createTransitPosterTexture();
  const posterMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: posterTex ?? undefined,
    emissive: 0xffe4b5,
    emissiveMap: posterTex ?? undefined,
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });
  const posterFace = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.52), posterMat);
  posterFace.rotation.y = Math.PI / 2;
  posterFace.position.set(-1.44, 1.22, 0);
  shelter.add(posterFace);
  const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.08, 0.38), cedarMat);
  benchSeat.position.set(0.2, 0.48, -0.18);
  shelter.add(benchSeat);
  root.add(shelter);

  // Illuminated Street Vending Machines
  const vendConfigs = [
    { x: 4.55, color: 0xdc2626 },
    { x: -16.2, color: 0x2563eb },
  ];
  vendConfigs.forEach((vc) => {
    const vm = new THREE.Group();
    vm.position.set(vc.x, 0, -17.6);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.85, 0.65),
      new THREE.MeshStandardMaterial({ color: vc.color, roughness: 0.45, metalness: 0.2 })
    );
    body.position.y = 0.925;
    vm.add(body);
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.92), windowCoolMat);
    display.position.set(0, 1.22, 0.335);
    vm.add(display);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.26, 0.06), darkSteelMat);
    slot.position.set(0, 0.38, 0.33);
    vm.add(slot);
    root.add(vm);
  });

  // Sidewalk planters with clipped greenery
  [-5.8, -0.6, 9.8, 15.2].forEach((px) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.44, 0.56), planterMat);
    box.position.set(px, 0.28, -17.2);
    root.add(box);
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), shrubMat);
    bush.scale.set(1.25, 0.85, 0.9);
    bush.position.set(px, 0.64, -17.2);
    root.add(bush);
  });

  // Crosswalk Traffic Signal Poles on far curb
  const signalRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.3,
  });
  const signalGreenMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 1.3,
  });
  [-6.2, 9.2].forEach((tx, idx) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 4.1, 7), darkSteelMat);
    pole.position.set(tx, 2.05, -16.45);
    root.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.72, 0.24), darkSteelMat);
    head.position.set(tx, 3.72, -16.32);
    root.add(head);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 5),
      idx === 0 ? signalGreenMat : signalRedMat
    );
    lamp.position.set(tx, idx === 0 ? 3.52 : 3.9, -16.19);
    root.add(lamp);
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

  // Textured emissive-window distant skyline towers behind storefronts (zero plain cubes!)
  const skyTex = createProceduralFacadeTextures('urban', '#283548', '#fbbf24');
  const farSkyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: skyTex?.map,
    emissive: 0xfde68a,
    emissiveMap: skyTex?.emissiveMap,
    emissiveIntensity: 0.25,
    roughness: 0.85,
  });
  const farCount = 16;
  const farInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), farSkyMat, farCount);
  const farCaps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), corniceMat, farCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < farCount; i++) {
    const w = 4.6 + (i % 3) * 1.6;
    const h = 10 + ((i * 7) % 14);
    const x = -42 + i * 5.6;
    const z = -29 - (i % 3) * 5.2;
    dummy.position.set(x, h / 2, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(w, h, 4.2);
    dummy.updateMatrix();
    farInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, h + 0.25, z);
    dummy.scale.set(w + 0.3, 0.5, 4.5);
    dummy.updateMatrix();
    farCaps.setMatrixAt(i, dummy.matrix);
  }
  farInst.instanceMatrix.needsUpdate = true;
  farCaps.instanceMatrix.needsUpdate = true;
  root.add(farInst, farCaps);

  const ctx = addSurrounding360Context(root, 'busy_street');
  disableShadowsRecursive(root);

  return {
    id: 'busy_street',
    root,
    envHint: {},
    update: (_dt, elapsed, isNight, climateState) => {
      ctx.update(isNight, climateState);
      windowWarmMat.emissiveIntensity = isNight ? 1.55 : 0.16;
      windowCoolMat.emissiveIntensity = isNight ? 1.15 : 0.12;
      signEmissiveMat.emissiveIntensity = isNight ? 1.95 : 0.55;
      signCyanMat.emissiveIntensity = isNight ? 1.8 : 0.45;
      posterMat.emissiveIntensity = isNight ? 1.1 : 0.35;
      farSkyMat.emissiveIntensity = isNight ? 1.35 : 0.08;
      const greenPhase = Math.floor(elapsed / 8) % 2 === 0;
      signalGreenMat.emissiveIntensity = greenPhase ? 1.6 : 0.15;
      signalRedMat.emissiveIntensity = greenPhase ? 0.15 : 1.6;
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

// ============================================================================
// 2. MAYON VOLCANO VIEW (Cagsawa Ruins, Bicol Souvenir Stalls, Sightseeing Tourists, Rice Paddies)
// ============================================================================
export function buildMayonVolcanoScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_mayon_volcano';

  // Lush rolling Bicol emerald plains starting cleanly past the far sidewalk
  const meadowMat = new THREE.MeshStandardMaterial({ color: 0x3b7a38, roughness: 0.92 });
  const meadow = new THREE.Mesh(new THREE.PlaneGeometry(190, 150), meadowMat);
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.set(0, -0.06, -90);
  root.add(meadow);

  // Terraced Bicol emerald rice paddies & glistening irrigation channels in midground
  const paddyMatA = new THREE.MeshStandardMaterial({ color: 0x4d8f34, roughness: 0.88 });
  const paddyMatB = new THREE.MeshStandardMaterial({ color: 0x65a338, roughness: 0.86 });
  const waterStripMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    metalness: 0.25,
  });
  for (let row = 0; row < 4; row++) {
    const zPos = -41 - row * 6.4;
    const paddy = new THREE.Mesh(
      new THREE.BoxGeometry(72 - row * 4, 0.22, 5.4),
      row % 2 === 0 ? paddyMatA : paddyMatB
    );
    paddy.position.set(-4, 0.04 + row * 0.16, zPos);
    root.add(paddy);
    const channel = new THREE.Mesh(new THREE.PlaneGeometry(66 - row * 4, 0.55), waterStripMat);
    channel.rotation.x = -Math.PI / 2;
    channel.position.set(-4, 0.17 + row * 0.16, zPos + 2.75);
    root.add(channel);
  }

  // Subtle green foothills hugging the volcano base
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x2f6331, roughness: 0.9 });
  [
    { x: -38, z: -66, r: 22, h: 7.5 },
    { x: 36, z: -64, r: 24, h: 8.5 },
    { x: -18, z: -58, r: 16, h: 4.8 },
    { x: 24, z: -60, r: 18, h: 5.4 },
  ].forEach((h) => {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(h.r, h.h, 12), hillMat);
    hill.position.set(h.x, h.h * 0.42, h.z);
    root.add(hill);
  });

  // Iconic near-perfect symmetrical Mayon Volcano cone rising front-center horizon
  const mayonGroup = new THREE.Group();
  mayonGroup.position.set(-1.2, 0, -96);
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
  mayonGroup.add(new THREE.Mesh(mayonGeo, mayonMat));

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

  // Weathered volcanic-stone Cagsawa Church Belfry Ruin (upgraded with cornices & stone wall)
  const belfry = new THREE.Group();
  belfry.position.set(8.6, 0, -33.5);
  belfry.rotation.y = -0.22;
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7c7265, roughness: 0.95 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x4b443c, roughness: 0.96 });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x3f6b32, roughness: 0.9 });

  const tier1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.6, 3.4), stoneMat);
  tier1.position.y = 1.8;
  belfry.add(tier1);
  const cornice1 = new THREE.Mesh(new THREE.BoxGeometry(3.75, 0.24, 3.75), darkStoneMat);
  cornice1.position.y = 3.62;
  belfry.add(cornice1);
  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.7, 2.7), stoneMat);
  tier2.position.y = 4.95;
  belfry.add(tier2);
  const cornice2 = new THREE.Mesh(new THREE.BoxGeometry(2.98, 0.2, 2.98), darkStoneMat);
  cornice2.position.y = 6.32;
  belfry.add(cornice2);
  const tier3 = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.9, 2.05), stoneMat);
  tier3.position.y = 7.25;
  belfry.add(tier3);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    stoneMat
  );
  dome.position.y = 8.15;
  belfry.add(dome);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.14), darkStoneMat);
  crossV.position.y = 9.45;
  belfry.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.14), darkStoneMat);
  crossH.position.y = 9.6;
  belfry.add(crossH);

  // Crossed bell-tower arched voids
  const archVoidA = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.35, 2.85), darkStoneMat);
  archVoidA.position.y = 5.05;
  belfry.add(archVoidA);
  const archVoidB = new THREE.Mesh(new THREE.BoxGeometry(2.85, 1.35, 0.85), darkStoneMat);
  archVoidB.position.y = 5.05;
  belfry.add(archVoidB);

  const ruinWall = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.45, 0.58), stoneMat);
  ruinWall.position.set(-3.5, 0.72, 0.4);
  belfry.add(ruinWall);
  const mossPatch = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 2.8), mossMat);
  mossPatch.position.y = 3.74;
  belfry.add(mossPatch);
  root.add(belfry);

  // Low stone park plaza border & paved souvenir viewing plaza (z = -17.6..-24)
  const plazaStoneMat = new THREE.MeshStandardMaterial({ color: 0xa89f91, roughness: 0.9 });
  const plazaDeck = new THREE.Mesh(new THREE.PlaneGeometry(36, 7.6), plazaStoneMat);
  plazaDeck.rotation.x = -Math.PI / 2;
  plazaDeck.position.set(0, 0.02, -21.2);
  root.add(plazaDeck);

  const wallBorderL = new THREE.Mesh(new THREE.BoxGeometry(20, 0.58, 0.42), stoneMat);
  wallBorderL.position.set(-16, 0.29, -17.6);
  root.add(wallBorderL);
  const wallBorderR = new THREE.Mesh(new THREE.BoxGeometry(20, 0.58, 0.42), stoneMat);
  wallBorderR.position.set(16, 0.29, -17.6);
  root.add(wallBorderR);

  // Outdoor Bicol Souvenir Market Stalls along midground plaza (framing Mayon center view!)
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0xa47c48, roughness: 0.82 });
  const tableWoodMat = new THREE.MeshStandardMaterial({ color: 0x6f4728, roughness: 0.78 });
  const craftColors = [0xd97706, 0x0d9488, 0xdc2626, 0xeab308, 0xfef3c7];
  const craftMats = craftColors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
  const stallBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
  });

  const stallConfigs = [
    { x: -12.6, z: -20.5, rotY: 0.14, c1: '#b91c1c', c2: '#fef3c7' },
    { x: -7.6, z: -21.4, rotY: 0.08, c1: '#0f766e', c2: '#fef3c7' },
    { x: 7.4, z: -21.2, rotY: -0.08, c1: '#b45309', c2: '#fef3c7' },
    { x: 12.4, z: -20.4, rotY: -0.14, c1: '#1d4ed8', c2: '#fef3c7' },
  ];
  stallConfigs.forEach((sc, idx) => {
    const stall = new THREE.Group();
    stall.position.set(sc.x, 0, sc.z);
    stall.rotation.y = sc.rotY;

    // 4 bamboo corner posts
    [
      [-1.35, -0.85],
      [1.35, -0.85],
      [-1.35, 0.85],
      [1.35, 0.85],
    ].forEach(([px, pz]) => {
      const h = pz > 0 ? 2.45 : 2.15;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, h, 6), bambooMat);
      post.position.set(px, h / 2, pz);
      stall.add(post);
    });

    // Slanted colorful striped tarp roof
    const tarpTex = createStripedTarpTexture(sc.c1, sc.c2);
    const tarpMat = new THREE.MeshStandardMaterial({
      map: tarpTex ?? undefined,
      color: 0xffffff,
      roughness: 0.82,
    });
    const tarp = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.08, 2.25), tarpMat);
    tarp.position.set(0, 2.34, 0);
    tarp.rotation.x = -0.15;
    stall.add(tarp);

    // Display counter table + miniature Mayon sculptures, woven baskets & abaca bags
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.82, 0.78), tableWoodMat);
    table.position.set(0, 0.41, 0.35);
    stall.add(table);

    for (let item = 0; item < 5; item++) {
      const ix = -0.95 + item * 0.48;
      if (item % 2 === 0) {
        // Miniature souvenir Mayon cone
        const miniCone = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, 0.24, 6),
          craftMats[(idx + item) % craftMats.length]
        );
        miniCone.position.set(ix, 0.94, 0.38);
        stall.add(miniCone);
      } else {
        // Woven abaca basket / pili jar
        const basket = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.09, 0.2, 7),
          craftMats[(idx + item + 2) % craftMats.length]
        );
        basket.position.set(ix, 0.92, 0.34);
        stall.add(basket);
      }
    }

    // Hanging woven bags along front crossbar + 3 warm festoon bulbs
    for (let b = -1; b <= 1; b++) {
      const bag = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.32, 0.08),
        craftMats[(idx + b + 3) % craftMats.length]
      );
      bag.position.set(b * 0.85, 1.92, 0.84);
      stall.add(bag);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), stallBulbMat);
      bulb.position.set(b * 0.92, 2.34, 0.96);
      stall.add(bulb);
    }

    root.add(stall);
  });

  // Animated outdoor sightseeing tourists browsing stalls & snapping photos of Mayon
  interface SightseeingTourist {
    group: THREE.Group;
    baseX: number;
    baseZ: number;
    baseRotY: number;
    phase: number;
    hasCamera: boolean;
    flashMesh?: THREE.Mesh;
  }
  const tourists: SightseeingTourist[] = [];
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6b89c, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.84 });
  const cameraBodyMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 });
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
  });

  const touristSpecs = [
    { x: -11.4, z: -18.9, rotY: Math.PI - 0.12, shirt: 0xef4444, hat: 0xfef3c7, hasCamera: false },
    { x: -3.2, z: -20.2, rotY: Math.PI + 0.06, shirt: 0x3b82f6, hat: 0xfde047, hasCamera: true },
    { x: -1.8, z: -20.6, rotY: Math.PI - 0.14, shirt: 0xf59e0b, hat: 0xffffff, hasCamera: false },
    { x: 2.8, z: -21.0, rotY: Math.PI + 0.18, shirt: 0x10b981, hat: 0xd97706, hasCamera: true },
    { x: 8.6, z: -19.4, rotY: Math.PI - 0.25, shirt: 0xec4899, hat: 0xfef3c7, hasCamera: false },
  ];
  touristSpecs.forEach((ts, idx) => {
    const tg = new THREE.Group();
    const shirtMat = new THREE.MeshStandardMaterial({ color: ts.shirt, roughness: 0.78 });
    const hatMat = new THREE.MeshStandardMaterial({ color: ts.hat, roughness: 0.85 });

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.72, 0.2), pantsMat);
    legs.position.y = 0.36;
    tg.add(legs);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.56, 0.24), shirtMat);
    torso.position.y = 1.0;
    tg.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), skinMat);
    head.position.y = 1.44;
    tg.add(head);
    const sunHat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.06, 8), hatMat);
    sunHat.position.y = 1.56;
    tg.add(sunHat);

    let flashMesh: THREE.Mesh | undefined;
    if (ts.hasCamera) {
      const cam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.1), cameraBodyMat);
      cam.position.set(0, 1.32, 0.24);
      tg.add(cam);
      flashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), flashMat.clone());
      flashMesh.position.set(0, 1.34, 0.32);
      tg.add(flashMesh);
    }

    tg.position.set(ts.x, 0.02, ts.z);
    tg.rotation.y = ts.rotY;
    root.add(tg);
    tourists.push({
      group: tg,
      baseX: ts.x,
      baseZ: ts.z,
      baseRotY: ts.rotY,
      phase: idx * 1.4,
      hasCamera: ts.hasCamera,
      flashMesh,
    });
  });

  // Multi-frond Instanced tropical coconut palms framing left & right (3 draw calls total!)
  const palmSpots = [
    [-19, -21], [-15.5, -24], [-11.5, -25.5], [-22, -29], [-16.8, -33], [-9.2, -31],
    [14.5, -21], [18.5, -25], [22.5, -22], [16.5, -34], [24, -30], [-26, -24],
    [27, -26], [-13, -42], [15, -44], [5.5, -43], [-28, -35], [29, -36],
  ];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a593c, roughness: 0.9 });
  const frondMatA = new THREE.MeshStandardMaterial({ color: 0x2b7a37, roughness: 0.78 });
  const frondMatB = new THREE.MeshStandardMaterial({ color: 0x3b8c40, roughness: 0.78 });
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.13, 0.25, 5.6, 7),
    trunkMat,
    palmSpots.length
  );
  const frondsLower = new THREE.InstancedMesh(
    new THREE.ConeGeometry(2.35, 1.1, 7),
    frondMatA,
    palmSpots.length
  );
  const frondsUpper = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.7, 1.2, 6),
    frondMatB,
    palmSpots.length
  );
  const dummy = new THREE.Object3D();
  palmSpots.forEach(([px, pz], idx) => {
    const hScale = 0.85 + (idx % 4) * 0.16;
    const lean = ((idx % 3) - 1) * 0.13;
    dummy.position.set(px, 2.8 * hScale, pz);
    dummy.rotation.set(lean * 0.4, idx * 0.9, lean);
    dummy.scale.set(1, hScale, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(idx, dummy.matrix);

    const topX = px - lean * 2.5;
    const topY = 5.45 * hScale;
    dummy.position.set(topX, topY, pz);
    dummy.rotation.set(0, idx * 1.1, 0);
    dummy.scale.set(hScale, hScale * 0.88, hScale);
    dummy.updateMatrix();
    frondsLower.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(topX, topY + 0.55 * hScale, pz);
    dummy.rotation.set(0, idx * 1.1 + 0.52, 0);
    dummy.scale.set(hScale * 0.92, hScale * 0.8, hScale * 0.92);
    dummy.updateMatrix();
    frondsUpper.setMatrixAt(idx, dummy.matrix);
  });
  trunks.instanceMatrix.needsUpdate = true;
  frondsLower.instanceMatrix.needsUpdate = true;
  frondsUpper.instanceMatrix.needsUpdate = true;
  root.add(trunks, frondsLower, frondsUpper);

  const ctx = addSurrounding360Context(root, 'mayon_volcano');
  disableShadowsRecursive(root);

  return {
    id: 'mayon_volcano',
    root,
    envHint: {
      fogColorDay: 0xd4e8e6,
      fogColorNight: 0x0f1a2a,
      fogDensityScale: 0.72,
    },
    update: (dt, elapsed, isNight, climateState) => {
      ctx.update(isNight, climateState);
      cloudRing.rotation.y += dt * 0.08;
      stallBulbMat.emissiveIntensity = isNight ? 2.1 : 0.3;
      waterStripMat.color.setHex(isNight ? 0x164e63 : 0x38bdf8);

      for (let i = 0; i < tourists.length; i++) {
        const t = tourists[i];
        t.group.rotation.y = t.baseRotY + Math.sin(elapsed * 0.65 + t.phase) * 0.24;
        t.group.position.x = t.baseX + Math.sin(elapsed * 0.35 + t.phase) * 0.32;
        if (t.hasCamera && t.flashMesh) {
          const cycle = (elapsed + t.phase * 2.1) % 6.5;
          const m = t.flashMesh.material as THREE.MeshBasicMaterial;
          m.opacity = cycle < 0.16 ? (1 - cycle / 0.16) * 0.95 : 0;
        }
      }
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

// ============================================================================
// 3. HILLTOP CITY LIGHTS (Tagaytay / Baguio Ridge — Parapet, Binoculars, String Lights,
//    Deep Valley Metropolis, 2,600+ Shimmering City Lights & Moving Highway Headlights)
// ============================================================================
export function buildHilltopCityLightsScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_hilltop_city_lights';

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.8 });
  const stoneParapetMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.92 });
  const darkPineMatA = new THREE.MeshStandardMaterial({ color: 0x1b452f, roughness: 0.86 });
  const darkPineMatB = new THREE.MeshStandardMaterial({ color: 0x24593d, roughness: 0.84 });
  const ridgeStoneMat = new THREE.MeshStandardMaterial({ color: 0x2d3735, roughness: 0.94 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.78 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.65 });
  const stringBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.5,
  });

  // Stone-and-timber ridge overlook parapet right past the far sidewalk
  const stoneCurb = new THREE.Mesh(new THREE.BoxGeometry(56, 0.38, 0.36), stoneParapetMat);
  stoneCurb.position.set(0, 0.19, -17.5);
  root.add(stoneCurb);

  const railTop = new THREE.Mesh(new THREE.BoxGeometry(56, 0.1, 0.14), woodMat);
  railTop.position.set(0, 1.08, -17.5);
  root.add(railTop);
  const railMid = new THREE.Mesh(new THREE.BoxGeometry(56, 0.07, 0.08), woodMat);
  railMid.position.set(0, 0.68, -17.5);
  root.add(railMid);

  const postCount = 26;
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.15, 0.14), woodMat, postCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < postCount; i++) {
    dummy.position.set(-25 + i * 2.0, 0.58, -17.5);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  root.add(posts);

  // Coin-operated scenic binoculars mounted along the lookout parapet
  [-4.4, 4.8].forEach((bx) => {
    const bino = new THREE.Group();
    bino.position.set(bx, 0, -17.32);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.38, 8), darkSteelMat);
    pedestal.position.y = 0.69;
    bino.add(pedestal);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.38), steelMat);
    head.position.set(0, 1.44, -0.05);
    head.rotation.x = 0.18;
    bino.add(head);
    [-0.08, 0.08].forEach((ox) => {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.24, 8), steelMat);
      barrel.rotation.x = Math.PI / 2 + 0.18;
      barrel.position.set(ox, 1.42, -0.24);
      bino.add(barrel);
    });
    root.add(bino);
  });

  // Warm overhead cafe string lights draped between ridge timber poles
  const lightPoleXs = [-18, -10.8, -3.6, 3.6, 10.8, 18];
  lightPoleXs.forEach((px) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 7), woodMat);
    pole.position.set(px, 1.8, -17.5);
    root.add(pole);
  });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
  const bulbPositions: THREE.Vector3[] = [];
  for (let s = 0; s < lightPoleXs.length - 1; s++) {
    const x0 = lightPoleXs[s];
    const x1 = lightPoleXs[s + 1];
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      const x = x0 + (x1 - x0) * t;
      const sag = Math.sin(t * Math.PI) * 0.52;
      const y = 3.52 - sag;
      pts.push(new THREE.Vector3(x, y, -17.5));
      if (k > 0 && k < 8) {
        bulbPositions.push(new THREE.Vector3(x, y - 0.08, -17.5));
      }
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }
  const bulbsInst = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.075, 6, 5),
    stringBulbMat,
    bulbPositions.length
  );
  bulbPositions.forEach((bp, idx) => {
    dummy.position.copy(bp);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bulbsInst.setMatrixAt(idx, dummy.matrix);
  });
  bulbsInst.instanceMatrix.needsUpdate = true;
  root.add(bulbsInst);

  // Dramatic mountain cliff drop-off plunging down into the deep valley basin
  const cliffFace = new THREE.Mesh(new THREE.PlaneGeometry(180, 44), ridgeStoneMat);
  cliffFace.rotation.x = -Math.PI * 0.24;
  cliffFace.position.set(0, -16.2, -31.5);
  root.add(cliffFace);

  const valleyFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 160),
    new THREE.MeshStandardMaterial({ color: 0x0f1a24, roughness: 0.96 })
  );
  valleyFloor.rotation.x = -Math.PI / 2;
  valleyFloor.position.set(0, -32.0, -98);
  root.add(valleyFloor);

  // Distant Cordillera / Tagaytay volcanic ridge silhouettes across the far horizon
  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x1b2938, roughness: 0.95 });
  [-74, -40, -8, 24, 56, 86].forEach((rx, idx) => {
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(34 + (idx % 2) * 10, 34 + (idx % 3) * 9, 7),
      ridgeMat
    );
    peak.position.set(rx, -17.5, -138 - (idx % 2) * 14);
    root.add(peak);
  });

  // Layered Multi-Tier Baguio Pine Trees flanking the cliff ridge (3 draw calls total)
  const pineCoords: Array<[number, number, number]> = [];
  for (let i = 0; i < 34; i++) {
    const x = -34 + i * 2.05 + Math.sin(i * 2.7) * 0.65;
    if (Math.abs(x) < 6.4) continue; // Keep panoramic valley vista wide open!
    const tier = i % 4;
    const z = -19.0 - tier * 2.8;
    const y = -1.2 - tier * 2.1;
    pineCoords.push([x, y, z]);
  }
  const pineTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.19, 3.0, 6),
    woodMat,
    pineCoords.length
  );
  const pineLower = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.5, 3.2, 7),
    darkPineMatA,
    pineCoords.length
  );
  const pineUpper = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.12, 3.0, 7),
    darkPineMatB,
    pineCoords.length
  );
  pineCoords.forEach(([x, y, z], idx) => {
    const sc = 0.85 + (idx % 4) * 0.22;
    dummy.position.set(x, y + 1.5 * sc, z);
    dummy.rotation.set(0, idx * 0.6, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    pineTrunks.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(x, y + 3.2 * sc, z);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    pineLower.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(x, y + 4.8 * sc, z);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    pineUpper.setMatrixAt(idx, dummy.matrix);
  });
  pineTrunks.instanceMatrix.needsUpdate = true;
  pineLower.instanceMatrix.needsUpdate = true;
  pineUpper.instanceMatrix.needsUpdate = true;
  root.add(pineTrunks, pineLower, pineUpper);

  // Clustered Valley Metropolis Silhouette Districts below (1 InstancedMesh)
  const valleyTex = createProceduralFacadeTextures('urban', '#1e293b', '#fbbf24');
  const valleyBlockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: valleyTex?.map,
    emissive: 0xfde68a,
    emissiveMap: valleyTex?.emissiveMap,
    emissiveIntensity: 0.9,
    roughness: 0.85,
  });
  const blockCount = 120;
  const valleyBlocks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    valleyBlockMat,
    blockCount
  );
  for (let i = 0; i < blockCount; i++) {
    const district = (i % 6) - 2.5;
    const bx = district * 24 + Math.sin(i * 19.3) * 14;
    const bz = -48 - ((i * 13) % 72);
    const bw = 2.6 + (i % 4) * 1.1;
    const bh = 2.2 + ((i * 7) % 10) * 0.95;
    const bd = 2.6 + ((i * 3) % 4) * 0.9;
    dummy.position.set(bx, -32.0 + bh / 2, bz);
    dummy.rotation.set(0, (i % 4) * 0.22, 0);
    dummy.scale.set(bw, bh, bd);
    dummy.updateMatrix();
    valleyBlocks.setMatrixAt(i, dummy.matrix);
  }
  valleyBlocks.instanceMatrix.needsUpdate = true;
  root.add(valleyBlocks);

  // Winding glowing valley highway ribbons + animated moving headlight streaks!
  const highwayGlowMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.42,
  });
  [-56, -78, -104].forEach((hz, idx) => {
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(175, 1.35), highwayGlowMat);
    ribbon.rotation.x = -Math.PI / 2;
    ribbon.rotation.z = idx === 1 ? 0.08 : -0.05;
    ribbon.position.set(0, -31.85, hz);
    root.add(ribbon);
  });

  const carStreakCount = 36;
  const carStreakMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
  const carStreaks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.4, 0.25, 0.4),
    carStreakMat,
    carStreakCount
  );
  const streakData = Array.from({ length: carStreakCount }, (_, i) => ({
    x: -80 + ((i * 19) % 160),
    z: i % 3 === 0 ? -56 : i % 3 === 1 ? -78 : -104,
    dir: i % 2 === 0 ? 1 : -1,
    speed: 4.5 + (i % 4) * 1.6,
  }));
  root.add(carStreaks);

  // 2,600+ Shimmering Valley City Lights in ONE THREE.Points draw call!
  const lightCount = 2600;
  const positions = new Float32Array(lightCount * 3);
  const colors = new Float32Array(lightCount * 3);
  const palette = [
    new THREE.Color(0xfbbf24), // Sodium gold
    new THREE.Color(0xfde68a), // Warm incandescent
    new THREE.Color(0xf97316), // Amber streetlamp
    new THREE.Color(0x7dd3fc), // Cool LED avenue
    new THREE.Color(0xffffff), // Crisp tower beacon
    new THREE.Color(0xfda4af), // Warm coral taillight
  ];
  for (let i = 0; i < lightCount; i++) {
    const h1 = Math.abs(Math.sin(i * 12.9898 + 1.7) * 43758.5453) % 1;
    const h2 = Math.abs(Math.cos(i * 78.233 + 3.1) * 19341.23) % 1;
    const h3 = Math.abs(Math.sin(i * 45.164 + 0.9) * 28461.17) % 1;

    let lx: number;
    let lz: number;
    let ly: number;
    if (i < 600) {
      // Dense golden lights along the 3 winding valley highways
      const lane = i % 3;
      lx = (h1 - 0.5) * 185;
      lz = (lane === 0 ? -56 : lane === 1 ? -78 : -104) + (h2 - 0.5) * 3.8;
      ly = -31.5 + h3 * 0.5;
    } else {
      // Clustered metropolitan districts spreading across the entire basin
      const cluster = (i % 9) - 4;
      lx = cluster * 20 + (h1 - 0.5) * 34;
      lz = -42 - h2 * 92;
      ly = -31.4 + h3 * 5.2;
    }
    positions[i * 3] = lx;
    positions[i * 3 + 1] = ly;
    positions[i * 3 + 2] = lz;

    const col = palette[i % palette.length];
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  const lightsGeo = new THREE.BufferGeometry();
  lightsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  lightsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const cityLightsMat = new THREE.PointsMaterial({
    size: 2.1,
    vertexColors: true,
    map: getSharedGlowSpriteTexture(),
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const valleyLights = new THREE.Points(lightsGeo, cityLightsMat);
  root.add(valleyLights);

  // Drifting cool highland mist wisps below the lookout parapet
  const mistSprites: THREE.Sprite[] = [];
  const mistMat = new THREE.SpriteMaterial({
    map: getSharedGlowSpriteTexture(),
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  for (let m = 0; m < 10; m++) {
    const sp = new THREE.Sprite(mistMat);
    sp.position.set(-30 + m * 7.0, -5.5 - (m % 3) * 2.5, -26 - (m % 4) * 10);
    sp.scale.set(18, 5.2, 1);
    root.add(sp);
    mistSprites.push(sp);
  }

  const ctx = addSurrounding360Context(root, 'hilltop_city_lights');
  disableShadowsRecursive(root);

  return {
    id: 'hilltop_city_lights',
    root,
    envHint: {
      fogColorDay: 0xcbd9e6,
      fogColorNight: 0x091020,
      fogDensityScale: 0.72,
    },
    update: (dt, elapsed, isNight, climateState) => {
      ctx.update(isNight, climateState);
      cityLightsMat.opacity = isNight
        ? 0.92 + Math.sin(elapsed * 2.2) * 0.08
        : 0.34;
      cityLightsMat.size = isNight ? 2.25 : 1.15;
      stringBulbMat.emissiveIntensity = isNight ? 2.25 : 0.45;
      valleyBlockMat.emissiveIntensity = isNight ? 1.45 : 0.14;
      highwayGlowMat.opacity = isNight ? 0.46 : 0.14;
      mistMat.opacity = isNight ? 0.1 : 0.18;

      for (let i = 0; i < carStreakCount; i++) {
        const s = streakData[i];
        s.x += s.dir * s.speed * dt;
        if (s.x > 88) s.x = -88;
        if (s.x < -88) s.x = 88;
        dummy.position.set(s.x, -31.55, s.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        carStreaks.setMatrixAt(i, dummy.matrix);
      }
      carStreaks.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < mistSprites.length; i++) {
        mistSprites[i].position.x += dt * (0.44 + (i % 3) * 0.14);
        if (mistSprites[i].position.x > 36) mistSprites[i].position.x = -36;
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

// ============================================================================
// 4. JAPANESE TRANQUILITY (Gion Kyoto — Ishidatami Stone Paving, Detailed Machiya
//    with Koushi Lattice, Noren Curtains, Kanban Signs, Toro Lanterns, Pagoda & Sakura)
// ============================================================================
export function buildJapaneseTranquilityScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_japanese_tranquility';

  const darkCedarMat = new THREE.MeshStandardMaterial({ color: 0x3b261b, roughness: 0.84 });
  const warmWoodMat = new THREE.MeshStandardMaterial({ color: 0x6b442a, roughness: 0.78 });
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xede3d2, roughness: 0.88 });
  const roofTileMat = new THREE.MeshStandardMaterial({ color: 0x262b33, roughness: 0.68 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x787d82, roughness: 0.92 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.72 });
  const shojiMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.45,
    roughness: 0.38,
  });

  // Kyoto Ishidatami stone flagstone street paving overlaid cleanly over the outdoor lane
  const stoneTex = createKyotoFlagstoneTexture();
  const stoneLaneMat = new THREE.MeshStandardMaterial({
    color: 0xd8dce0,
    map: stoneTex ?? undefined,
    roughness: 0.78,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const stoneLane = new THREE.Mesh(new THREE.PlaneGeometry(76, 12.2), stoneLaneMat);
  stoneLane.rotation.x = -Math.PI / 2;
  stoneLane.position.set(0, 0.074, -12.6);
  root.add(stoneLane);

  // Granite side drainage curb strips along the Kyoto lane
  const drainMat = new THREE.MeshStandardMaterial({ color: 0x4b525a, roughness: 0.86 });
  [-17.3, -7.8].forEach((dz) => {
    const drain = new THREE.Mesh(new THREE.BoxGeometry(74, 0.06, 0.38), drainMat);
    drain.position.set(0, 0.072, dz);
    root.add(drain);
  });

  // Procedural Machiya wall texture + emissive window map (zero bare boxes!)
  const machiyaTex = createProceduralFacadeTextures('japanese', '#3b261b', '#f59e0b');
  const machiyaWallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: machiyaTex?.map,
    emissive: 0xfbbf24,
    emissiveMap: machiyaTex?.emissiveMap,
    emissiveIntensity: 0.35,
    roughness: 0.82,
  });

  const norenColors = [0x1e3a5f, 0x3f6212, 0x7f1d1d, 0x92400e, 0x312e81, 0x115e59];
  const kanbanGlyphSets = [
    ['茶', '屋', '京'],
    ['珈', '琲', '館'],
    ['甘', '味', '処'],
    ['抹', '茶', '庵'],
    ['和', '菓', '子'],
    ['花', '見', '亭'],
  ];

  // Historic Machiya Wooden Townhouses flanking left & right (open center alley toward Pagoda!)
  const machiyaXs = [-16.4, -10.8, -5.2, 5.4, 11.0, 16.6];
  machiyaXs.forEach((mx, idx) => {
    const h = 5.1 + (idx % 2) * 0.65;
    const w = 5.1;
    const d = 3.9;
    const house = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), machiyaWallMat);
    body.position.y = h / 2;
    house.add(body);

    // Upper white shikkui plaster band with dark timber corner pilasters
    const upper = new THREE.Mesh(new THREE.BoxGeometry(w - 0.16, 1.48, d + 0.04), plasterMat);
    upper.position.y = h - 1.05;
    house.add(upper);

    // Warm glowing shoji sliding door panels on ground floor
    const shoji = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.92), shojiMat);
    shoji.position.set(0, 1.12, d / 2 + 0.045);
    house.add(shoji);

    // 3D Wooden Koushi vertical latticework slats across ground facade
    for (let slat = -7; slat <= 7; slat++) {
      if (Math.abs(slat) <= 2) continue; // Center doorway opening
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.96, 0.08), darkCedarMat);
      bar.position.set(slat * 0.24, 1.12, d / 2 + 0.075);
      house.add(bar);
    }

    // Hanging split Noren doorway curtains (3 fluttering panels!)
    const norenMat = new THREE.MeshStandardMaterial({
      color: norenColors[idx % norenColors.length],
      roughness: 0.88,
    });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.42, 6), warmWoodMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 2.02, d / 2 + 0.18);
    house.add(rod);
    [-0.42, 0, 0.42].forEach((nx) => {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.62, 0.03), norenMat);
      flap.position.set(nx, 1.7, d / 2 + 0.18);
      house.add(flap);
    });

    // Vertical wooden Kanban signboard with brush calligraphy
    const kanbanTex = createKanbanSignTexture(
      idx % 2 === 0 ? '#f5ead6' : '#2c1e16',
      idx % 2 === 0 ? '#1c1410' : '#f5d08a',
      kanbanGlyphSets[idx % kanbanGlyphSets.length]
    );
    const kanbanMat = new THREE.MeshStandardMaterial({
      map: kanbanTex ?? undefined,
      color: 0xffffff,
      roughness: 0.72,
    });
    const kanban = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.28, 0.06), kanbanMat);
    kanban.position.set(w * 0.36, 1.48, d / 2 + 0.12);
    house.add(kanban);

    // Traditional sweeping dark kawara tiled lower eave with exposed timber rafters
    const lowerEave = new THREE.Mesh(new THREE.BoxGeometry(w + 0.64, 0.2, 1.2), roofTileMat);
    lowerEave.position.set(0, 2.42, d / 2 + 0.4);
    lowerEave.rotation.x = 0.26;
    house.add(lowerEave);

    for (let r = -2; r <= 2; r++) {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 1.0), darkCedarMat);
      rafter.position.set(r * 1.05, 2.28, d / 2 + 0.34);
      rafter.rotation.x = 0.26;
      house.add(rafter);
    }

    // Sweeping kawara gabled hip roof + ridge cap
    const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.84, 1.55, 4), roofTileMat);
    mainRoof.rotation.y = Math.PI / 4;
    mainRoof.scale.set(1.06, 1, 0.9);
    mainRoof.position.y = h + 0.74;
    house.add(mainRoof);

    // Wooden engawa bench or bamboo planter in front of alternating houses
    if (idx % 2 === 0) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.42, 0.44), warmWoodMat);
      bench.position.set(-1.45, 0.21, d / 2 + 0.48);
      house.add(bench);
    } else {
      const pot = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.46, 0.46), darkCedarMat);
      pot.position.set(-1.55, 0.23, d / 2 + 0.48);
      house.add(pot);
      for (let b = -1; b <= 1; b++) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 2.2, 6), bambooMat);
        stalk.position.set(-1.55 + b * 0.16, 1.32, d / 2 + 0.48);
        house.add(stalk);
      }
    }

    house.position.set(mx, 0, -20.2);
    root.add(house);
  });

  // Glowing Chochin Red & Warm-White Paper Lanterns via ONE InstancedMesh
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xef4444,
    emissiveIntensity: 1.25,
    roughness: 0.35,
  });
  const lanternGeo = new THREE.SphereGeometry(0.22, 10, 8);
  lanternGeo.scale(0.85, 1.38, 0.85);
  const lanterns = new THREE.InstancedMesh(lanternGeo, lanternMat, machiyaXs.length * 2);
  const dummy = new THREE.Object3D();
  machiyaXs.forEach((mx, idx) => {
    [-1.7, 1.7].forEach((ox, side) => {
      dummy.position.set(mx + ox, 2.04, -17.65);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      lanterns.setMatrixAt(idx * 2 + side, dummy.matrix);
    });
  });
  lanterns.instanceMatrix.needsUpdate = true;
  root.add(lanterns);

  // Carved Granite Toro Stone Lanterns flanking the temple alley opening
  const toroFlameMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
  });
  [
    [-2.5, -18.2],
    [2.7, -18.2],
    [-2.6, -24.5],
    [2.8, -24.5],
  ].forEach(([tx, tz]) => {
    const toro = new THREE.Group();
    toro.position.set(tx, 0, tz);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.62), stoneMat);
    base.position.y = 0.12;
    toro.add(base);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.95, 6), stoneMat);
    pillar.position.y = 0.72;
    toro.add(pillar);
    const firebox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.38), toroFlameMat);
    firebox.position.y = 1.38;
    toro.add(firebox);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.32, 6), stoneMat);
    cap.position.y = 1.72;
    toro.add(cap);
    root.add(toro);
  });

  // Blooming Cherry Blossom (Sakura) Trees with multi-cluster canopies arching over the lane
  const sakuraBloomMatA = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.78 });
  const sakuraBloomMatB = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.8 });
  [
    [-2.1, -21.8],
    [2.5, -23.5],
    [-19.6, -22.5],
    [20.2, -22.5],
    [-7.5, -27.5],
    [8.2, -28.0],
  ].forEach(([sx, sz], idx) => {
    const tree = new THREE.Group();
    tree.position.set(sx, 0, sz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.27, 3.4, 7), darkCedarMat);
    trunk.position.y = 1.7;
    trunk.rotation.z = sx < 0 ? -0.1 : 0.1;
    tree.add(trunk);

    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.7, 1), sakuraBloomMatA);
    c1.scale.set(1.28, 0.76, 1.1);
    c1.position.set(sx < 0 ? 0.35 : -0.35, 3.7, 0);
    tree.add(c1);
    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25, 1), sakuraBloomMatB);
    c2.scale.set(1.2, 0.75, 1.05);
    c2.position.set(sx < 0 ? -0.75 : 0.75, 3.25, 0.45 * (idx % 2 === 0 ? 1 : -1));
    tree.add(c2);
    root.add(tree);
  });

  // Ascending stone flagstone path leading into the distant Yasaka 5-tier Kyoto Pagoda
  const templePath = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 28), stoneLaneMat);
  templePath.rotation.x = -Math.PI / 2;
  templePath.position.set(0.1, 0.06, -32);
  root.add(templePath);

  // Distant misty 5-tier Kyoto Pagoda centered in the valley opening
  const pagoda = new THREE.Group();
  pagoda.position.set(0.2, 0, -47);
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
      new THREE.ConeGeometry(3.25 * scale, 0.8, 4),
      roofTileMat
    );
    eave.rotation.y = Math.PI / 4;
    eave.position.y = y + 1.05;
    pagoda.add(eave);
  }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 2.8, 6), roofTileMat);
  spire.position.y = 13.1;
  pagoda.add(spire);
  root.add(pagoda);

  // Misty Higashiyama forested mountain hills behind the pagoda
  const hillMatA = new THREE.MeshStandardMaterial({ color: 0x2f4b3c, roughness: 0.92 });
  const hillMatB = new THREE.MeshStandardMaterial({ color: 0x253d32, roughness: 0.94 });
  [
    { x: 0, z: -84, r: 44, h: 20, m: hillMatA },
    { x: -38, z: -76, r: 34, h: 17, m: hillMatB },
    { x: 40, z: -78, r: 36, h: 18, m: hillMatB },
  ].forEach((hb) => {
    const bh = new THREE.Mesh(new THREE.ConeGeometry(hb.r, hb.h, 10), hb.m);
    bh.position.set(hb.x, hb.h * 0.45, hb.z);
    root.add(bh);
  });

  // Drifting Sakura Petals (day) / Warm Fireflies (night) in a single THREE.Points field
  const pCount = 160;
  const pPositions = new Float32Array(pCount * 3);
  const pSeeds = new Float32Array(pCount);
  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = -20 + Math.random() * 40;
    pPositions[i * 3 + 1] = 0.6 + Math.random() * 6.5;
    pPositions[i * 3 + 2] = -15.5 - Math.random() * 20;
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
  root.add(new THREE.Points(pGeo, sakuraFireflyMat));

  const ctx = addSurrounding360Context(root, 'japanese_tranquility');
  disableShadowsRecursive(root);

  return {
    id: 'japanese_tranquility',
    root,
    envHint: {
      fogColorDay: 0xfce7f3,
      fogColorNight: 0x111525,
      fogDensityScale: 0.86,
    },
    update: (dt, elapsed, isNight, climateState, weather) => {
      ctx.update(isNight, climateState);
      shojiMat.emissiveIntensity = isNight ? 1.5 : 0.25;
      machiyaWallMat.emissiveIntensity = isNight ? 1.35 : 0.16;
      lanternMat.emissiveIntensity = isNight ? 2.2 : 0.72;
      toroFlameMat.emissiveIntensity = isNight ? 2.1 : 0.4;
      stoneLaneMat.roughness = weather === 'rainy' ? 0.24 : 0.78;
      sakuraFireflyMat.color.setHex(isNight ? 0xfde047 : 0xf9a8d4);
      sakuraFireflyMat.size = isNight ? 0.38 : 0.28;
      sakuraFireflyMat.opacity = isNight ? 0.76 + Math.sin(elapsed * 3.5) * 0.2 : 0.86;

      const attr = pGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pCount; i++) {
        let x = attr.getX(i);
        let y = attr.getY(i);
        const seed = pSeeds[i];
        if (isNight) {
          x += Math.sin(elapsed * 0.9 + seed) * dt * 0.45;
          y += Math.cos(elapsed * 1.2 + seed) * dt * 0.28;
          if (y < 0.6) y = 0.8;
          if (y > 5.5) y = 5.2;
        } else {
          x += (0.85 + Math.sin(elapsed + seed) * 0.4) * dt;
          y -= 0.72 * dt;
          if (y < 0.3) {
            y = 6.8;
            x = -20 + ((i * 7.3) % 40);
          }
          if (x > 21) x = -21;
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

// ============================================================================
// 5. BRAZILIAN FAVELA (Sculpted Multi-Tiered Rio Hillside, Textured Favela Homes
//    with Glowing Windows, Corrugated Roofs, Blue Water Tanks, Staircases,
//    Laundry Lines, Utility Wires, Guanabara Bay, Sugarloaf & Christ the Redeemer)
// ============================================================================
export function buildBrazilianFavelaScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_brazilian_favela';

  // Sculpted lush green & terracotta-earth terraced Rio hillside (zero flat brown box!)
  const lushHillMat = new THREE.MeshStandardMaterial({ color: 0x2f6838, roughness: 0.92 });
  const warmEarthMat = new THREE.MeshStandardMaterial({ color: 0x7c5338, roughness: 0.94 });
  const hillsideMounds = [
    { x: -34, y: 7.5, z: -36, rx: 32, ry: 16, rz: 18, mat: lushHillMat },
    { x: -10, y: 6.2, z: -38, rx: 24, ry: 14, rz: 16, mat: warmEarthMat },
    { x: -24, y: 12.5, z: -50, rx: 36, ry: 22, rz: 20, mat: lushHillMat },
    { x: 38, y: 5.5, z: -35, rx: 24, ry: 12, rz: 16, mat: lushHillMat },
    { x: 54, y: 10.0, z: -48, rx: 28, ry: 18, rz: 18, mat: lushHillMat },
  ];
  hillsideMounds.forEach((m) => {
    const mound = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), m.mat);
    mound.scale.set(m.rx, m.ry, m.rz);
    mound.position.set(m.x, m.y - m.ry * 0.45, m.z);
    root.add(mound);
  });

  // Shimmering Guanabara Bay ocean vista on right-center horizon
  const bayMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.22,
    metalness: 0.28,
  });
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(210, 140), bayMat);
  bay.rotation.x = -Math.PI / 2;
  bay.position.set(16, -6.0, -96);
  root.add(bay);

  // Authentic Textured Favela Homes (with plaster/brick + glowing evening windows!)
  const favelaTex = createProceduralFacadeTextures('favela', '#f1f5f9', '#fbbf24');
  const houseMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: favelaTex?.map,
    emissive: 0xfde68a,
    emissiveMap: favelaTex?.emissiveMap,
    emissiveIntensity: 0.22,
    roughness: 0.86,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x78716c,
    roughness: 0.72,
    metalness: 0.28,
  });
  const waterTankMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.42,
    metalness: 0.15,
  });

  const houseSpecs: Array<{
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
    rotY: number;
    colorIdx: number;
    hasTank: boolean;
  }> = [];

  for (let tier = 0; tier < 6; tier++) {
    for (let col = 0; col < 22; col++) {
      const idx = tier * 22 + col;
      const hx = -44 + col * 3.8 + (tier % 2) * 1.3;
      // Leave scenic right-center panoramic window open to Guanabara Bay & Sugarloaf!
      if (hx > 6.5 && hx < 23.5) continue;
      const hz = -19.2 - tier * 3.7 - ((idx * 3) % 3) * 0.45;
      const hy = tier * 2.15 + ((idx * 5) % 4) * 0.28;
      const w = 2.6 + (idx % 3) * 0.65;
      const h = 2.3 + (idx % 4) * 0.52;
      const d = 2.5 + (idx % 2) * 0.55;
      houseSpecs.push({
        x: hx,
        y: hy,
        z: hz,
        w,
        h,
        d,
        rotY: ((idx % 3) - 1) * 0.08,
        colorIdx: idx,
        hasTank: idx % 3 === 0,
      });
    }
  }

  const palette = [
    new THREE.Color(0xe07a5f), // Terracotta
    new THREE.Color(0xf97316), // Coral orange
    new THREE.Color(0x0d9488), // Vibrant teal
    new THREE.Color(0xeab308), // Sun mustard
    new THREE.Color(0x3b82f6), // Cobalt blue
    new THREE.Color(0xec4899), // Bougainvillea pink
    new THREE.Color(0xf5e6cc), // Sun-bleached plaster
    new THREE.Color(0xb45309), // Exposed red brick
  ];

  const houses = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), houseMat, houseSpecs.length);
  const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), roofMat, houseSpecs.length);
  const tankCount = houseSpecs.filter((hs) => hs.hasTank).length;
  const waterTanks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.42, 0.36, 0.62, 8),
    waterTankMat,
    tankCount
  );

  const dummy = new THREE.Object3D();
  let tankIdx = 0;
  houseSpecs.forEach((hs, idx) => {
    dummy.position.set(hs.x, hs.y + hs.h / 2, hs.z);
    dummy.rotation.set(0, hs.rotY, 0);
    dummy.scale.set(hs.w, hs.h, hs.d);
    dummy.updateMatrix();
    houses.setMatrixAt(idx, dummy.matrix);
    houses.setColorAt(idx, palette[hs.colorIdx % palette.length]);

    // Slanted corrugated tin/tile roof slab
    dummy.position.set(hs.x, hs.y + hs.h + 0.08, hs.z);
    dummy.rotation.set(0.12, hs.rotY, 0);
    dummy.scale.set(hs.w + 0.28, 0.14, hs.d + 0.28);
    dummy.updateMatrix();
    roofs.setMatrixAt(idx, dummy.matrix);

    if (hs.hasTank) {
      dummy.position.set(hs.x + hs.w * 0.22, hs.y + hs.h + 0.44, hs.z - hs.d * 0.14);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      waterTanks.setMatrixAt(tankIdx++, dummy.matrix);
    }
  });
  houses.instanceMatrix.needsUpdate = true;
  if (houses.instanceColor) houses.instanceColor.needsUpdate = true;
  roofs.instanceMatrix.needsUpdate = true;
  waterTanks.instanceMatrix.needsUpdate = true;
  root.add(houses, roofs, waterTanks);

  // Winding painted hillside staircases connecting favela tiers
  const stairColors = [0xeab308, 0x0d9488, 0xe07a5f];
  [-18.5, -5.2, 27.5].forEach((sx, sIdx) => {
    const sMat = new THREE.MeshStandardMaterial({
      color: stairColors[sIdx % stairColors.length],
      roughness: 0.85,
    });
    for (let step = 0; step < 16; step++) {
      const tread = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.36, 0.72), sMat);
      tread.position.set(
        sx + Math.sin(step * 0.38) * 1.15,
        0.18 + step * 0.56,
        -18.2 - step * 0.92
      );
      root.add(tread);
    }
  });

  // Leaning wooden utility poles + tangled Rio overhead power wires + colorful hanging laundry lines
  const poleWoodMat = new THREE.MeshStandardMaterial({ color: 0x4b3621, roughness: 0.9 });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
  const poleCoords = [
    [-22, -17.8],
    [-11, -18.0],
    [1.5, -17.9],
    [25, -18.1],
  ];
  poleCoords.forEach(([px, pz], idx) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 6.2, 6), poleWoodMat);
    pole.position.set(px, 3.1, pz);
    pole.rotation.z = idx % 2 === 0 ? 0.06 : -0.05;
    root.add(pole);
  });
  for (let w = 0; w < 4; w++) {
    const pts = [
      new THREE.Vector3(-22, 5.1 + w * 0.24, -17.8),
      new THREE.Vector3(-11, 4.75 + w * 0.22, -18.0),
      new THREE.Vector3(1.5, 5.05 + w * 0.2, -17.9),
      new THREE.Vector3(25, 5.2 + w * 0.24, -18.1),
    ];
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }

  // Rooftop colorful laundry clotheslines
  const laundryMats = [
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.85 }),
  ];
  const laundryFlaps: THREE.Mesh[] = [];
  [
    [-14.5, 4.4, -21.2],
    [-2.5, 4.1, -21.0],
    [29.5, 4.6, -21.4],
  ].forEach(([lx, ly, lz]) => {
    const linePts = [
      new THREE.Vector3(lx - 1.6, ly, lz),
      new THREE.Vector3(lx, ly - 0.18, lz),
      new THREE.Vector3(lx + 1.6, ly, lz),
    ];
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), wireMat));
    for (let k = 0; k < 5; k++) {
      const cloth = new THREE.Mesh(
        new THREE.PlaneGeometry(0.38, 0.52),
        laundryMats[k % laundryMats.length]
      );
      cloth.position.set(lx - 1.1 + k * 0.55, ly - 0.34, lz);
      root.add(cloth);
      laundryFlaps.push(cloth);
    }
  });

  // Tropical foliage & magenta bougainvillea clusters tucked between terraces
  const palmFoliageMat = new THREE.MeshStandardMaterial({ color: 0x257034, roughness: 0.84 });
  const bougMat = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.82 });
  [
    [-20.5, 2.2, -19.8, false],
    [-8.4, 4.6, -23.0, true],
    [4.2, 2.8, -20.5, true],
    [24.5, 3.2, -20.8, false],
    [-14.2, 7.6, -27.5, true],
    [32.5, 5.8, -24.5, false],
  ].forEach(([fx, fy, fz, isBoug]) => {
    const bush = new THREE.Mesh(
      new THREE.DodecahedronGeometry(isBoug ? 1.15 : 1.45, 0),
      isBoug ? bougMat : palmFoliageMat
    );
    bush.scale.set(1.2, 0.85, 1.1);
    bush.position.set(fx as number, fy as number, fz as number);
    root.add(bush);
  });

  // Sugarloaf Mountain (Pão de Açúcar) + Morro da Urca + cable car line across Guanabara Bay
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 });
  const greenMountMat = new THREE.MeshStandardMaterial({ color: 0x2f6838, roughness: 0.9 });
  const sugarloaf = new THREE.Mesh(new THREE.SphereGeometry(12, 14, 12), rockMat);
  sugarloaf.scale.set(0.92, 1.9, 0.92);
  sugarloaf.position.set(17, 5.0, -90);
  root.add(sugarloaf);
  const morro = new THREE.Mesh(new THREE.ConeGeometry(16, 15.5, 10), greenMountMat);
  morro.position.set(5, 1.8, -94);
  root.add(morro);
  // Subtle Sugarloaf cable car span line
  root.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(5, 9.5, -93),
        new THREE.Vector3(11, 14.2, -91.5),
        new THREE.Vector3(17, 24.0, -90),
      ]),
      wireMat
    )
  );

  // Corcovado peak with illuminated Christ the Redeemer statue
  const corcovado = new THREE.Mesh(new THREE.ConeGeometry(15, 26, 9), greenMountMat);
  corcovado.position.set(-18, 7.5, -100);
  root.add(corcovado);
  const statueMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.3,
    roughness: 0.45,
  });
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), statueMat);
  pedestal.position.set(-18, 20.6, -100);
  root.add(pedestal);
  const statueBody = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.48, 4.0, 8), statueMat);
  statueBody.position.set(-18, 23.1, -100);
  root.add(statueBody);
  const statueArms = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.4, 0.4), statueMat);
  statueArms.position.set(-18, 24.3, -100);
  root.add(statueArms);

  // Distant Guanabara Bay harbor lights shimmer at night
  const bayLightCount = 45;
  const bayLightPos = new Float32Array(bayLightCount * 3);
  for (let i = 0; i < bayLightCount; i++) {
    bayLightPos[i * 3] = -10 + ((i * 7.3) % 68);
    bayLightPos[i * 3 + 1] = -5.5;
    bayLightPos[i * 3 + 2] = -58 - ((i * 11.7) % 52);
  }
  const bayLightsGeo = new THREE.BufferGeometry();
  bayLightsGeo.setAttribute('position', new THREE.BufferAttribute(bayLightPos, 3));
  const bayLightsMat = new THREE.PointsMaterial({
    size: 1.25,
    color: 0xfde68a,
    map: getSharedGlowSpriteTexture(),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  root.add(new THREE.Points(bayLightsGeo, bayLightsMat));

  const ctx = addSurrounding360Context(root, 'brazilian_favela');
  disableShadowsRecursive(root);

  return {
    id: 'brazilian_favela',
    root,
    envHint: {
      fogColorDay: 0xdbeafe,
      fogColorNight: 0x0f172a,
      fogDensityScale: 0.76,
    },
    update: (_dt, elapsed, isNight, climateState) => {
      ctx.update(isNight, climateState);
      houseMat.emissiveIntensity = isNight ? 1.45 : 0.14;
      statueMat.emissiveIntensity = isNight ? 2.1 : 0.25;
      bayMat.color.setHex(isNight ? 0x0b2545 : 0x0284c7);
      bayLightsMat.opacity = isNight ? 0.78 + Math.sin(elapsed * 2.5) * 0.14 : 0.0;
      for (let i = 0; i < laundryFlaps.length; i++) {
        laundryFlaps[i].rotation.x = Math.sin(elapsed * 2.4 + i * 0.9) * 0.22;
      }
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
