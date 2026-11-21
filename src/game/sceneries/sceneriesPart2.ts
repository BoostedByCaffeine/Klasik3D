import * as THREE from 'three';
import {
  SceneryRuntimeInstance,
  createDioramaBase,
  disableShadowsRecursive,
  getSharedGlowSpriteTexture,
} from './sceneryTypes';
import { evaluateAerialTurnPath } from '../outdoorLod';
import {
  addSurrounding360Context,
  createProceduralFacadeTextures,
} from './surroundingContext';

// ============================================================================
// PHASE 4: OUTDOOR SCENERIES 6–9 (HIGH-DETAIL MOBILE-OPTIMIZED OVERHAUL)
// Universal Driveway Rule: All scenery starts cleanly at z <= -16.2
// ============================================================================

function createCyberBillboardTexture(
  primaryHex: string,
  secondaryHex: string,
  title: string,
  sub: string
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = 'rgba(7, 10, 24, 0.86)';
  ctx.fillRect(0, 0, 256, 192);

  // Outer glowing neon border
  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 240, 176);

  // Horizontal scanlines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let y = 14; y < 180; y += 8) {
    ctx.fillRect(14, y, 228, 2);
  }

  // Geometric corner cyber brackets
  ctx.fillStyle = secondaryHex;
  ctx.fillRect(20, 22, 42, 6);
  ctx.fillRect(194, 164, 42, 6);

  // Bold cyber typography / kanji
  ctx.fillStyle = primaryHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText(title, 128, 86);

  ctx.fillStyle = secondaryHex;
  ctx.font = 'bold 20px monospace';
  ctx.fillText(sub, 128, 138);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { ownedByScenery: true };
  return tex;
}

function createEverestSignTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#4a301c';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#d9b99b';
  ctx.lineWidth = 4;
  ctx.strokeRect(5, 5, 246, 86);

  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('EVEREST BASE CAMP', 128, 38);
  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('ELEV. 5,364m  ▲', 128, 70);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { ownedByScenery: true };
  return tex;
}

function createCobbleTerraceTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#6b6761';
  ctx.fillRect(0, 0, 128, 128);
  const shades = ['#948f87', '#86817a', '#a19b92', '#7a756e'];
  for (let r = 0; r < 8; r++) {
    const ox = (r % 2) * 10;
    for (let c = 0; c < 7; c++) {
      ctx.fillStyle = shades[(r * 3 + c * 5) % shades.length];
      ctx.fillRect(c * 20 + ox - 8, r * 16 + 1, 18, 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 2);
  tex.userData = { ownedByScenery: true };
  return tex;
}

/**
 * Helper to construct a sleek multi-part futuristic Cyberpunk hover-spinner.
 */
function buildSpinnerMesh(
  bodyColor: number,
  thrusterColor: number,
  trailColor: number,
  isPolice: boolean
): {
  group: THREE.Group;
  redBar?: THREE.MeshBasicMaterial;
  blueBar?: THREE.MeshBasicMaterial;
  searchlight?: THREE.Mesh;
} {
  const g = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.25,
    metalness: 0.78,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: thrusterColor,
    emissiveIntensity: 0.35,
    roughness: 0.12,
    metalness: 0.85,
  });
  const thrustMat = new THREE.MeshBasicMaterial({ color: thrusterColor });
  const trailMat = new THREE.MeshBasicMaterial({
    color: trailColor,
    transparent: true,
    opacity: 0.72,
  });

  // Sleek aerodynamic wedge chassis (faces +X by default)
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.44, 1.15), hullMat);
  g.add(hull);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 0.92), hullMat);
  nose.position.set(1.55, -0.04, 0);
  g.add(nose);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.34, 0.84), canopyMat);
  canopy.position.set(0.2, 0.32, 0);
  g.add(canopy);

  // Side hover-thruster nacelles + glowing underside plasma glow
  [-0.68, 0.68].forEach((sz) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.26, 0.24), hullMat);
    pod.position.set(-0.2, -0.08, sz);
    g.add(pod);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.18), thrustMat);
    pad.position.set(-0.2, -0.22, sz);
    g.add(pad);
  });

  // Headlight bar & elongated glowing rear plasma light-trail
  const headBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.82),
    new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
  );
  headBar.position.set(2.04, -0.02, 0);
  g.add(headBar);

  const trail = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 0.72), trailMat);
  trail.position.set(-3.4, 0.0, 0);
  g.add(trail);

  let redBar: THREE.MeshBasicMaterial | undefined;
  let blueBar: THREE.MeshBasicMaterial | undefined;
  let searchlight: THREE.Mesh | undefined;

  if (isPolice) {
    redBar = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    blueBar = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    const barR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.42), redBar);
    barR.position.set(0.15, 0.56, -0.22);
    g.add(barR);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.42), blueBar);
    barB.position.set(0.15, 0.56, 0.22);
    g.add(barB);

    // Sweeping downward translucent volumetric searchlight cone
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coneGeo = new THREE.ConeGeometry(2.6, 8.5, 12, 1, true);
    coneGeo.translate(0, -4.25, 0);
    searchlight = new THREE.Mesh(coneGeo, coneMat);
    searchlight.position.set(1.2, -0.25, 0);
    searchlight.rotation.z = 0.24;
    g.add(searchlight);
  }

  return { group: g, redBar, blueBar, searchlight };
}

// ============================================================================
// 6. CYBERPUNK NEON (Dense Textured Megacity Canyon, Holographic Kanji Billboards,
//    Steam Vents, Multi-Altitude Flying Hover-Cars & Periodic Aerial Police Chase)
// ============================================================================
export function buildCyberpunkNeonScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_cyberpunk_neon';

  // Wet obsidian reflective megacity ground slab
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x090b15,
    roughness: 0.22,
    metalness: 0.62,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 150), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, -90);
  root.add(ground);

  // Textured Megacity Skyscrapers with glowing emissive window grids (zero bare boxes!)
  const cyberTex = createProceduralFacadeTextures('cyberpunk', '#111629', '#38bdf8');
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: cyberTex?.map,
    emissive: 0x38bdf8,
    emissiveMap: cyberTex?.emissiveMap,
    emissiveIntensity: 1.05,
    roughness: 0.42,
    metalness: 0.56,
  });
  const towerCount = 54;
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), towerMat, towerCount);
  const trimMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const roofTrims = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), trimMat, towerCount);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < towerCount; i++) {
    const row = Math.floor(i / 14);
    const col = i % 14;
    const tx = -48 + col * 7.4 + (row % 2) * 3.2;
    const tz = -21.5 - row * 13.5 - (i % 3) * 3.2;
    const tw = 4.4 + (i % 4) * 1.4;
    const td = 4.4 + ((i * 3) % 4) * 1.2;
    const th = 16 + ((i * 7) % 26) + row * 8;
    dummy.position.set(tx, th / 2, tz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(tw, th, td);
    dummy.updateMatrix();
    towers.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tx, th + 0.16, tz);
    dummy.scale.set(tw + 0.15, 0.28, td + 0.15);
    dummy.updateMatrix();
    roofTrims.setMatrixAt(i, dummy.matrix);
  }
  towers.instanceMatrix.needsUpdate = true;
  roofTrims.instanceMatrix.needsUpdate = true;
  root.add(towers, roofTrims);

  // Exposed industrial pipes, vents & glowing neon conduit strips on lower street level
  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.72,
  });
  const conduitCyanMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const conduitMagMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
  [-18, -10.5, -3.5, 4.0, 11.2, 18.5].forEach((px, idx) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 12, 7), pipeMat);
    pipe.position.set(px, 6.0, -18.6);
    root.add(pipe);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 9.5, 0.12),
      idx % 2 === 0 ? conduitCyanMat : conduitMagMat
    );
    strip.position.set(px + 0.26, 5.2, -18.45);
    root.add(strip);
  });

  // Translucent Holographic Kanji / Cyber Billboards + Additive Fake-Bloom Glow Sprites
  const holoSpecs = [
    { x: -12.5, y: 8.6, z: -19.2, w: 4.2, h: 3.1, p: '#06b6d4', s: '#f472b6', t: '電脳珈琲', sub: 'KLASIK 2099' },
    { x: -4.2, y: 12.6, z: -24.5, w: 5.2, h: 3.5, p: '#ec4899', s: '#38bdf8', t: '新視界市', sub: 'SECTOR 07' },
    { x: 4.2, y: 9.8, z: -19.6, w: 4.0, h: 3.0, p: '#f59e0b', s: '#fef08a', t: '深夜営業', sub: 'OPEN 24/7' },
    { x: 12.0, y: 11.4, z: -22.5, w: 4.8, h: 3.4, p: '#38bdf8', s: '#a855f7', t: '未来通信', sub: 'SYNC ONLINE' },
    { x: -18.5, y: 14.5, z: -29.0, w: 5.6, h: 3.8, p: '#a855f7', s: '#06b6d4', t: '軌道交通', sub: 'SKYLINE' },
    { x: 18.5, y: 14.0, z: -28.5, w: 5.2, h: 3.6, p: '#ec4899', s: '#f59e0b', t: '極光市場', sub: 'NEON PLAZA' },
    { x: 0.2, y: 20.5, z: -40.0, w: 8.2, h: 5.4, p: '#06b6d4', s: '#ec4899', t: '東京九九', sub: 'NEO-METRO' },
  ];
  const holoMats: THREE.MeshBasicMaterial[] = [];
  const glowSprites: THREE.Sprite[] = [];

  holoSpecs.forEach((h) => {
    const tex = createCyberBillboardTexture(h.p, h.s, h.t, h.sub);
    const bMat = new THREE.MeshBasicMaterial({
      map: tex ?? undefined,
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    holoMats.push(bMat);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(h.w, h.h), bMat);
    panel.position.set(h.x, h.y, h.z);
    root.add(panel);

    const spMat = new THREE.SpriteMaterial({
      map: getSharedGlowSpriteTexture(),
      color: new THREE.Color(h.p),
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spMat);
    sprite.position.set(h.x, h.y, h.z + 0.45);
    sprite.scale.set(h.w * 2.0, h.h * 1.9, 1);
    root.add(sprite);
    glowSprites.push(sprite);
  });

  // Glowing neon skyway bridge strips across the canyon
  const skyway1 = new THREE.Mesh(new THREE.BoxGeometry(72, 0.35, 0.9), conduitCyanMat);
  skyway1.position.set(0, 7.2, -28);
  root.add(skyway1);
  const skyway2 = new THREE.Mesh(new THREE.BoxGeometry(78, 0.32, 0.9), conduitMagMat);
  skyway2.position.set(0, 14.8, -36);
  root.add(skyway2);

  // === STREET-LEVEL CYBERPUNK HAPPENINGS (Hologram Noodle Bar, Cyberware/Arcade Storefront, Vending Kiosks, Neon Rain Puddles, Floating Holo Koi & Ad Drones) ===
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.38, metalness: 0.78 });
  const neonAmberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const neonPurpleMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });

  // 1. Open-front Glowing Hologram Noodle / Ramen Bar (x = -6.8, z = -18.25)
  const ramenBar = new THREE.Group();
  ramenBar.position.set(-6.8, 0, -18.25);
  const rbFrame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.2, 2.2), darkMetalMat);
  rbFrame.position.set(0, 1.6, -0.45);
  ramenBar.add(rbFrame);
  const rbInteriorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.1, 2.3),
    new THREE.MeshBasicMaterial({ color: 0xffedd5 })
  );
  rbInteriorGlow.position.set(0, 1.45, 0.56);
  ramenBar.add(rbInteriorGlow);
  // Glowing neon-trimmed serving counter + 4 round bar stools
  const rbCounter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.96, 0.72), darkMetalMat);
  rbCounter.position.set(0, 0.48, 0.85);
  const rbEdgeStrip = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.08, 0.08), conduitCyanMat);
  rbEdgeStrip.position.set(0, 0.94, 1.22);
  ramenBar.add(rbCounter, rbEdgeStrip);
  [-1.35, -0.45, 0.45, 1.35].forEach((sx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.58, 6), darkMetalMat);
    leg.position.set(sx, 0.29, 1.48);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.07, 10), conduitMagMat);
    seat.position.set(sx, 0.6, 1.48);
    ramenBar.add(leg, seat);
  });
  // Hanging cyberpunk red-neon noren curtains + glowing hologram ramen sign
  const ramenSignTex = createCyberBillboardTexture('#f97316', '#06b6d4', '拉麺屋', 'HOLO RAMEN 24H');
  const ramenSignMat = new THREE.MeshBasicMaterial({
    map: ramenSignTex ?? undefined,
    color: 0xffffff,
    transparent: true,
    opacity: 0.94,
  });
  const ramenSign = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.05), ramenSignMat);
  ramenSign.position.set(0, 2.95, 1.08);
  ramenBar.add(ramenSign);
  // Floating holo ramen bowl hologram above the awning
  const holoBowlGroup = new THREE.Group();
  holoBowlGroup.position.set(0, 3.85, 1.15);
  const holoBowlMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.72,
    wireframe: true,
  });
  const bowlMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 10, 6, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    holoBowlMat
  );
  const chop1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 5), neonAmberMat);
  chop1.position.set(0.12, 0.25, 0);
  chop1.rotation.z = -0.35;
  const chop2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 5), neonAmberMat);
  chop2.position.set(0.24, 0.25, 0);
  chop2.rotation.z = -0.22;
  holoBowlGroup.add(bowlMesh, chop1, chop2);
  ramenBar.add(holoBowlGroup);
  root.add(ramenBar);

  // 2. Cyberware / Neon Arcade Storefront (x = 7.4, z = -18.35)
  const arcadeShop = new THREE.Group();
  arcadeShop.position.set(7.4, 0, -18.35);
  const arcBody = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.4, 2.2), darkMetalMat);
  arcBody.position.set(0, 1.7, -0.35);
  const arcWin = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 2.1),
    new THREE.MeshBasicMaterial({ color: 0x1e1b4b })
  );
  arcWin.position.set(0, 1.25, 0.77);
  // Glowing arcade cabinet screens visible inside the shopfront window
  [-1.2, -0.4, 0.4, 1.2].forEach((ax, idx) => {
    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.72),
      idx % 2 === 0 ? conduitCyanMat : conduitMagMat
    );
    scr.position.set(ax, 1.32, 0.79);
    arcadeShop.add(scr);
  });
  const arcSignTex = createCyberBillboardTexture('#ec4899', '#38bdf8', '電脳遊戯', 'CYBER ARCADE');
  const arcSignMat = new THREE.MeshBasicMaterial({
    map: arcSignTex ?? undefined,
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
  });
  const arcSign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.1), arcSignMat);
  arcSign.position.set(0, 3.05, 0.92);
  arcadeShop.add(arcBody, arcWin, arcSign);
  root.add(arcadeShop);

  // 3. Futuristic Glowing Vending Kiosks flanking the cyber sidewalk
  [
    { x: -14.8, z: -17.65, mat: conduitCyanMat },
    { x: 15.2, z: -17.65, mat: conduitMagMat },
    { x: 0.6, z: -17.75, mat: neonAmberMat },
  ].forEach((vk) => {
    const kiosk = new THREE.Group();
    kiosk.position.set(vk.x, 0, vk.z);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.15, 0.72), darkMetalMat);
    ch.position.y = 1.075;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.22), vk.mat);
    scr.position.set(0, 1.32, 0.37);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.08), vk.mat);
    bar.position.set(0, 2.12, 0.36);
    kiosk.add(ch, scr, bar);
    root.add(kiosk);
  });

  // 4. Glossy Reflective Neon Rain Puddles shimmering on the wet cyber avenue
  const puddleCyanMat = new THREE.MeshStandardMaterial({
    color: 0x0e7490,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.65,
    roughness: 0.06,
    metalness: 0.85,
    transparent: true,
    opacity: 0.52,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const puddleMagMat = new THREE.MeshStandardMaterial({
    color: 0x831843,
    emissive: 0xec4899,
    emissiveIntensity: 0.62,
    roughness: 0.06,
    metalness: 0.85,
    transparent: true,
    opacity: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  [
    { x: -11.5, z: -15.4, rx: 2.3, rz: 0.9, mat: puddleCyanMat },
    { x: -3.2, z: -11.8, rx: 2.8, rz: 1.05, mat: puddleMagMat },
    { x: 5.8, z: -15.1, rx: 2.4, rz: 0.85, mat: puddleCyanMat },
    { x: 13.5, z: -12.4, rx: 2.2, rz: 0.95, mat: puddleMagMat },
  ].forEach((pd) => {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 14), pd.mat);
    puddle.rotation.x = -Math.PI / 2;
    puddle.scale.set(pd.rx, pd.rz, 1);
    puddle.position.set(pd.x, 0.042, pd.z);
    root.add(puddle);
  });

  // 5. Floating Animated Holographic Koi Fish & Neon Ad Drones drifting over the avenue!
  interface HoloFloater {
    group: THREE.Group;
    tail?: THREE.Mesh;
    baseX: number;
    baseY: number;
    baseZ: number;
    radiusX: number;
    speed: number;
    phase: number;
  }
  const holoFloaters: HoloFloater[] = [];
  const holoKoiMats = [
    new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.72 }),
    new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.72 }),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.72 }),
  ];
  [
    { x: -6.5, y: 5.8, z: -15.2, rx: 7.5, speed: 0.36, mat: holoKoiMats[0] },
    { x: 7.2, y: 6.4, z: -16.8, rx: 8.2, speed: -0.32, mat: holoKoiMats[1] },
    { x: 0.0, y: 4.9, z: -14.0, rx: 6.4, speed: 0.42, mat: holoKoiMats[2] },
  ].forEach((hk, idx) => {
    const koi = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.45, 7), hk.mat);
    body.rotation.z = -Math.PI / 2;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.65, 4), hk.mat);
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.88;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.85), hk.mat);
    fin.position.set(0.1, 0, 0);
    koi.add(body, tail, fin);
    root.add(koi);
    holoFloaters.push({
      group: koi,
      tail,
      baseX: hk.x,
      baseY: hk.y,
      baseZ: hk.z,
      radiusX: hk.rx,
      speed: hk.speed,
      phase: idx * 2.1,
    });
  });

  // Neon Ad Drones hovering & bobbing gently near storefronts
  [
    { x: -13.0, y: 3.4, z: -16.8, rx: 2.2, speed: 0.55 },
    { x: 12.6, y: 3.7, z: -16.6, rx: 2.4, speed: -0.48 },
  ].forEach((dr, idx) => {
    const drone = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), darkMetalMat);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.04, 6, 14),
      idx === 0 ? conduitCyanMat : neonPurpleMat
    );
    ring.rotation.x = Math.PI / 2;
    const holoScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.42),
      idx === 0 ? conduitMagMat : conduitCyanMat
    );
    holoScreen.position.y = -0.48;
    drone.add(core, ring, holoScreen);
    root.add(drone);
    holoFloaters.push({
      group: drone,
      baseX: dr.x,
      baseY: dr.y,
      baseZ: dr.z,
      radiusX: dr.rx,
      speed: dr.speed,
      phase: idx * 1.7 + 0.8,
    });
  });

  // Rising animated street-grate & ramen-bar steam particles along far sidewalk
  const steamCount = 96;
  const steamPos = new Float32Array(steamCount * 3);
  const steamVentXs = [-14.0, -6.8, -5.0, 5.2, 14.5];
  for (let i = 0; i < steamCount; i++) {
    const vx = steamVentXs[i % steamVentXs.length];
    steamPos[i * 3] = vx + (Math.random() - 0.5) * 1.1;
    steamPos[i * 3 + 1] = 0.15 + Math.random() * 4.4;
    steamPos[i * 3 + 2] = -17.1 + (Math.random() - 0.5) * 0.7;
  }
  const steamGeo = new THREE.BufferGeometry();
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
  const steamMat = new THREE.PointsMaterial({
    size: 1.55,
    color: 0x94a3b8,
    map: getSharedGlowSpriteTexture(),
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  root.add(new THREE.Points(steamGeo, steamMat));

  // === MULTI-ALTITUDE FLYING HOVER-CARS (SPINNERS) ACROSS 3 STACKED AERIAL LANES ===
  interface FlyingSpinner {
    group: THREE.Group;
    speed: number;
    dir: 1 | -1;
    baseY: number;
    phase: number;
  }
  const flyingSpinners: FlyingSpinner[] = [];
  const laneSpecs: Array<{
    x: number;
    y: number;
    z: number;
    dir: 1 | -1;
    speed: number;
    body: number;
    thrust: number;
    trail: number;
  }> = [
    // Low avenue aerial lane (y ~ 4.4 - 5.2) right above the street!
    { x: -24, y: 4.5, z: -13.5, dir: 1, speed: 11.5, body: 0x1e293b, thrust: 0x06b6d4, trail: 0x38bdf8 },
    { x: 18, y: 5.1, z: -16.0, dir: -1, speed: 12.8, body: 0x312e81, thrust: 0xec4899, trail: 0xf472b6 },
    { x: 4, y: 4.3, z: -11.5, dir: 1, speed: 10.2, body: 0x27272a, thrust: 0xf59e0b, trail: 0xfbbf24 },
    // Mid-canyon express lane (y ~ 10.5 - 12.2)
    { x: -34, y: 10.8, z: -22.5, dir: 1, speed: 15.2, body: 0x0f172a, thrust: 0x38bdf8, trail: 0x06b6d4 },
    { x: 26, y: 11.6, z: -25.0, dir: -1, speed: 16.4, body: 0x3f1d38, thrust: 0xf43f5e, trail: 0xec4899 },
    { x: -6, y: 12.0, z: -27.5, dir: 1, speed: 14.0, body: 0x1e293b, thrust: 0xa855f7, trail: 0xc084fc },
    // High-altitude megacity corridor (y ~ 18.2 - 20.5)
    { x: -28, y: 18.5, z: -32.0, dir: -1, speed: 18.5, body: 0x172554, thrust: 0x06b6d4, trail: 0x7dd3fc },
    { x: 14, y: 19.6, z: -35.5, dir: 1, speed: 19.5, body: 0x1e1b4b, thrust: 0xf59e0b, trail: 0xfde047 },
  ];

  laneSpecs.forEach((ls, idx) => {
    const built = buildSpinnerMesh(ls.body, ls.thrust, ls.trail, false);
    built.group.position.set(ls.x, ls.y, ls.z);
    if (ls.dir === -1) built.group.rotation.y = Math.PI;
    built.group.scale.setScalar(ls.y < 7 ? 0.72 : 0.88);
    root.add(built.group);
    flyingSpinners.push({
      group: built.group,
      speed: ls.speed,
      dir: ls.dir,
      baseY: ls.y,
      phase: idx * 1.15,
    });
  });

  // === LOW-CHANCE PERIODIC AERIAL POLICE CHASE EVENT (~10–12% encounter roll) ===
  const chaseGroup = new THREE.Group();
  chaseGroup.visible = false;
  const fugitive = buildSpinnerMesh(0x09090b, 0xf97316, 0xef4444, false);
  fugitive.group.position.set(9.5, 0.3, 0);
  fugitive.group.scale.setScalar(0.86);
  chaseGroup.add(fugitive.group);

  const police1 = buildSpinnerMesh(0x111827, 0x38bdf8, 0xef4444, true);
  police1.group.position.set(0, 0.5, -1.6);
  police1.group.scale.setScalar(0.9);
  chaseGroup.add(police1.group);

  const police2 = buildSpinnerMesh(0x111827, 0x38bdf8, 0x3b82f6, true);
  police2.group.position.set(-4.8, 1.3, 1.5);
  police2.group.scale.setScalar(0.88);
  chaseGroup.add(police2.group);
  root.add(chaseGroup);

  let chaseActive = false;
  let chaseDir: 1 | -1 = 1;
  let chaseX = -54;
  let chaseCooldown = 8.0; // First roll happens soon, then low-chance every 14s

  const ctx = addSurrounding360Context(root, 'cyberpunk_neon');
  disableShadowsRecursive(root);

  return {
    id: 'cyberpunk_neon',
    root,
    envHint: {
      fogColorDay: 0x1a1d36,
      fogColorNight: 0x070816,
      fogDensityScale: 0.98,
      skyTintDay: 0x1e1b4b,
      skyTintNight: 0x060714,
      neonRain: true,
    },
    update: (dt, elapsed, isNight, climateState, weather) => {
      ctx.update(isNight, climateState, elapsed);
      towerMat.emissiveIntensity = isNight ? 1.35 : 0.72;
      groundMat.roughness = weather.startsWith('rainy') ? 0.12 : 0.24;
      puddleCyanMat.emissiveIntensity = isNight ? 0.92 : 0.45;
      puddleMagMat.emissiveIntensity = isNight ? 0.88 : 0.42;
      holoBowlGroup.rotation.y = elapsed * 0.9;
      holoBowlGroup.position.y = 3.85 + Math.sin(elapsed * 2.2) * 0.1;

      for (let i = 0; i < holoFloaters.length; i++) {
        const hf = holoFloaters[i];
        const ang = elapsed * hf.speed + hf.phase;
        const nextX = hf.baseX + Math.sin(ang) * hf.radiusX;
        const dx = Math.cos(ang) * hf.speed;
        hf.group.position.set(
          nextX,
          hf.baseY + Math.sin(elapsed * 1.8 + hf.phase) * 0.35,
          hf.baseZ + Math.cos(ang * 0.7) * 0.8
        );
        if (hf.tail) {
          hf.group.rotation.y = dx >= 0 ? 0 : Math.PI;
          hf.tail.rotation.y = Math.sin(elapsed * 6.5 + hf.phase) * 0.38;
        } else {
          hf.group.rotation.y = elapsed * 0.7 + hf.phase;
        }
      }

      for (let i = 0; i < holoMats.length; i++) {
        const pulse = 0.8 + Math.sin(elapsed * (2.2 + i * 0.45) + i) * 0.16;
        holoMats[i].opacity = isNight ? Math.min(1, pulse + 0.12) : pulse * 0.88;
        const spMat = glowSprites[i].material as THREE.SpriteMaterial;
        spMat.opacity = (isNight ? 0.46 : 0.26) * pulse;
      }

      // Rise steam wisps smoothly
      const sAttr = steamGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < steamCount; i++) {
        let sy = sAttr.getY(i) + dt * (0.9 + (i % 3) * 0.3);
        let sx = sAttr.getX(i) + Math.sin(elapsed * 1.4 + i) * dt * 0.22;
        if (sy > 4.8) {
          sy = 0.15;
          sx = steamVentXs[i % steamVentXs.length] + (((i * 17) % 10) - 5) * 0.1;
        }
        sAttr.setXY(i, sx, sy);
      }
      sAttr.needsUpdate = true;

      // Multi-altitude flying hover-cars smoothly banking & turning 90° down perpendicular sky-canyons at the T-intersection!
      for (let si = 0; si < flyingSpinners.length; si++) {
        const sp = flyingSpinners[si];
        if (sp.group.userData.u === undefined) {
          sp.group.userData.u = sp.group.position.x;
          sp.group.userData.laneZ = sp.group.position.z;
        }
        let u = (sp.group.userData.u as number) + sp.dir * sp.speed * dt;
        const bound = 52;
        if (sp.dir === 1 && u > bound) u = -bound;
        if (sp.dir === -1 && u < -bound) u = bound;
        sp.group.userData.u = u;

        const laneZ = sp.group.userData.laneZ as number;
        const turnSign: 1 | -1 = si % 2 === 0 ? -1 : 1;
        const bobY = sp.baseY + Math.sin(elapsed * 2.4 + sp.phase) * 0.18;
        const pose = evaluateAerialTurnPath(u, laneZ, bobY, sp.dir, 29.0, 5.2, turnSign);
        sp.group.position.set(pose.x, pose.y, pose.z);
        sp.group.rotation.order = 'YXZ';
        sp.group.rotation.y = pose.vehicleYaw;
        sp.group.rotation.x = pose.bankRoll;
      }

      // Low-chance periodic aerial police chase
      if (!chaseActive) {
        chaseCooldown -= dt;
        if (chaseCooldown <= 0) {
          chaseCooldown = 14.0;
          // ~12% encounter rate (deterministic-friendly roll)
          if (Math.random() < 0.12) {
            chaseActive = true;
            chaseDir = Math.random() < 0.5 ? 1 : -1;
            chaseX = chaseDir === 1 ? -58 : 58;
            chaseGroup.visible = true;
            chaseGroup.position.set(chaseX, 7.6, -15.5);
            chaseGroup.rotation.y = chaseDir === 1 ? 0 : Math.PI;
          }
        }
      } else {
        chaseX += chaseDir * 24.5 * dt;
        chaseGroup.position.x = chaseX;
        chaseGroup.position.y = 7.6 + Math.sin(elapsed * 5.2) * 0.35;
        fugitive.group.rotation.z = Math.sin(elapsed * 6.5) * 0.14;

        // Rapid alternating red/blue police lightbars + sweeping downward searchlight
        const strobe = Math.floor(elapsed * 12) % 2 === 0;
        if (police1.redBar && police1.blueBar) {
          police1.redBar.color.setHex(strobe ? 0xff1e42 : 0x2a0810);
          police1.blueBar.color.setHex(strobe ? 0x0a1c4a : 0x3b82f6);
        }
        if (police2.redBar && police2.blueBar) {
          police2.redBar.color.setHex(strobe ? 0x2a0810 : 0xff1e42);
          police2.blueBar.color.setHex(strobe ? 0x3b82f6 : 0x0a1c4a);
        }
        if (police1.searchlight) {
          police1.searchlight.rotation.z = 0.22 + Math.sin(elapsed * 4.2) * 0.25;
        }
        if (police2.searchlight) {
          police2.searchlight.rotation.z = 0.18 + Math.cos(elapsed * 3.8) * 0.22;
        }

        if ((chaseDir === 1 && chaseX > 62) || (chaseDir === -1 && chaseX < -62)) {
          chaseActive = false;
          chaseGroup.visible = false;
        }
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

// ============================================================================
// 7. EIFFEL TOWER VIEW (Montmartre Terrace, Sprawling Dense Haussmannian Paris
//    Metropolis, Illuminated Twinkling Eiffel Tower & Sweeping Summit Searchlight)
// ============================================================================
export function buildEiffelTowerScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_eiffel_tower';

  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f3a2e, roughness: 0.45, metalness: 0.68 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd9cbb8, roughness: 0.84 });
  const slateRoofMat = new THREE.MeshStandardMaterial({ color: 0x3b4858, roughness: 0.74 });
  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.86 });
  const boulevardTreeMat = new THREE.MeshStandardMaterial({ color: 0x3a6b35, roughness: 0.86 });
  const eiffelMat = new THREE.MeshStandardMaterial({
    color: 0x6b5344,
    roughness: 0.5,
    metalness: 0.48,
    emissive: 0xd97706,
    emissiveIntensity: 0.08,
  });
  const winWarmMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.3,
    roughness: 0.3,
  });

  // Cobblestone terrace strip behind sidewalk leading to Montmartre railing
  const cobbleTex = createCobbleTerraceTexture();
  const cobbleMat = new THREE.MeshStandardMaterial({
    color: 0xd6d0c4,
    map: cobbleTex ?? undefined,
    roughness: 0.82,
  });
  const terraceWalk = new THREE.Mesh(new THREE.PlaneGeometry(60, 2.2), cobbleMat);
  terraceWalk.rotation.x = -Math.PI / 2;
  terraceWalk.position.set(0, 0.095, -16.6);
  root.add(terraceWalk);

  // Elevated Montmartre balustrade & wrought-iron terrace railing along z = -17.5
  const stoneCoping = new THREE.Mesh(new THREE.BoxGeometry(58, 0.4, 0.46), stoneMat);
  stoneCoping.position.set(0, 0.2, -17.5);
  root.add(stoneCoping);
  const topIronRail = new THREE.Mesh(new THREE.BoxGeometry(58, 0.07, 0.08), ironMat);
  topIronRail.position.set(0, 1.14, -17.5);
  root.add(topIronRail);
  const balusterCount = 56;
  const balusters = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.74, 5),
    ironMat,
    balusterCount
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < balusterCount; i++) {
    dummy.position.set(-27.5 + i * 1.0, 0.75, -17.5);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    balusters.setMatrixAt(i, dummy.matrix);
  }
  balusters.instanceMatrix.needsUpdate = true;
  root.add(balusters);

  // Classic Parisian vintage double-globe green iron lamp posts framing terrace margins (wide-open center view!)
  [-18.5, -10.5, 10.5, 18.5].forEach((lx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 3.4, 8), ironMat);
    post.position.set(lx, 1.7, -17.5);
    root.add(post);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.06), ironMat);
    cross.position.set(lx, 3.28, -17.5);
    root.add(cross);
    [-0.26, 0.26].forEach((ox) => {
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), winWarmMat);
      globe.position.set(lx + ox, 3.45, -17.5);
      root.add(globe);
    });
  });

  // Sprawling Dense Parisian Haussmannian Metropolis across the Paris basin (y = -14.5)!
  const parisTex = createProceduralFacadeTextures('parisian', '#e6dac6', '#fbbf24');
  const haussmannMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: parisTex?.map,
    emissive: 0xfde68a,
    emissiveMap: parisTex?.emissiveMap,
    emissiveIntensity: 0.22,
    roughness: 0.8,
  });

  const cityBlocks: Array<{ x: number; y: number; z: number; w: number; h: number; d: number; rotY: number }> = [];
  for (let row = 0; row < 7; row++) {
    const zBase = -25.5 - row * 14.5;
    const cols = 15;
    for (let col = 0; col < cols; col++) {
      const xPos = -72 + col * 10.3 + (row % 2) * 3.8;
      // Keep the grand Champs-de-Mars center avenue open directly to the Eiffel Tower!
      if (Math.abs(xPos - 0.5) < 9.5 && zBase > -82) continue;
      // Also avoid overlapping the Eiffel Tower base plaza directly
      if (Math.abs(xPos - 0.5) < 13 && Math.abs(zBase + 68) < 12) continue;

      const bw = 7.4 + ((row * 5 + col * 3) % 3) * 1.4;
      const bd = 6.2 + ((row + col) % 3) * 1.1;
      // Near Montmartre steps down smoothly into the Paris basin (-14.5)
      const groundY = row === 0 ? -9.5 : row === 1 ? -12.5 : -14.5;
      const bh = 6.2 + ((row * 3 + col * 7) % 4) * 1.15;
      cityBlocks.push({
        x: xPos,
        y: groundY,
        z: zBase,
        w: bw,
        h: bh,
        d: bd,
        rotY: ((col % 3) - 1) * 0.04,
      });
    }
  }

  const parisBodies = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    haussmannMat,
    cityBlocks.length
  );
  const parisMansards = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.74, 1.0, 4),
    slateRoofMat,
    cityBlocks.length
  );
  const parisChimneys = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.45, 0.9, 0.45),
    chimneyMat,
    cityBlocks.length
  );
  cityBlocks.forEach((b, idx) => {
    dummy.position.set(b.x, b.y + b.h / 2, b.z);
    dummy.rotation.set(0, b.rotY, 0);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.updateMatrix();
    parisBodies.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(b.x, b.y + b.h + 0.95, b.z);
    dummy.rotation.set(0, b.rotY + Math.PI / 4, 0);
    dummy.scale.set(b.w * 1.04, 1.9, b.d * 1.04);
    dummy.updateMatrix();
    parisMansards.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(b.x + b.w * 0.25, b.y + b.h + 1.65, b.z);
    dummy.rotation.set(0, b.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    parisChimneys.setMatrixAt(idx, dummy.matrix);
  });
  parisBodies.instanceMatrix.needsUpdate = true;
  parisMansards.instanceMatrix.needsUpdate = true;
  parisChimneys.instanceMatrix.needsUpdate = true;
  root.add(parisBodies, parisMansards, parisChimneys);

  // === LUSH GREEN CHAMP DE MARS PARK DIRECTLY BENEATH THE EIFFEL TOWER ===
  const parkY = -14.35;
  const parkLawnMat = new THREE.MeshStandardMaterial({ color: 0x3b8640, roughness: 0.9 });
  const parkGravelMat = new THREE.MeshStandardMaterial({ color: 0xd6cab8, roughness: 0.92 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x225c2c, roughness: 0.88 });
  const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x6f4728, roughness: 0.82 });
  const fountainWaterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
    roughness: 0.16,
    metalness: 0.35,
  });

  // Expansive central manicured emerald green park lawns & crisscrossing gravel promenades
  const champLawn = new THREE.Mesh(new THREE.PlaneGeometry(24.0, 50.0), parkLawnMat);
  champLawn.rotation.x = -Math.PI / 2;
  champLawn.position.set(0.5, parkY, -44.0);
  root.add(champLawn);

  // Main central gravel esplanade + 2 lateral walkways + cross paths
  const mainEsplanade = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 48.0), parkGravelMat);
  mainEsplanade.rotation.x = -Math.PI / 2;
  mainEsplanade.position.set(0.5, parkY + 0.03, -44.0);
  root.add(mainEsplanade);

  [-8.6, 9.6].forEach((px) => {
    const sidePath = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 46.0), parkGravelMat);
    sidePath.rotation.x = -Math.PI / 2;
    sidePath.position.set(px, parkY + 0.03, -44.0);
    root.add(sidePath);
  });
  [-28.5, -42.5, -56.0].forEach((cz) => {
    const crossPath = new THREE.Mesh(new THREE.PlaneGeometry(22.0, 2.6), parkGravelMat);
    crossPath.rotation.x = -Math.PI / 2;
    crossPath.position.set(0.5, parkY + 0.04, cz);
    root.add(crossPath);
  });

  // Trimmed Parisian topiary hedges & manicured emerald parterres cleanly spaced away from bench walkways
  const flowerColors = [0xe11d48, 0xf59e0b, 0xec4899, 0x8b5cf6];
  const flowerMats = flowerColors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
  const parterreLawnMat = new THREE.MeshStandardMaterial({ color: 0x2f7d44, roughness: 0.9 });
  [-35.5, -49.2].forEach((hz, hIdx) => {
    [-5.35, 6.35].forEach((hx, sideIdx) => {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.56, 9.8), hedgeMat);
      hedge.position.set(hx, parkY + 0.28, hz);
      root.add(hedge);
      const innerLawn = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 9.0), parterreLawnMat);
      innerLawn.position.set(hx, parkY + 0.6, hz);
      root.add(innerLawn);
      const flowerStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 0.16, 6.4),
        flowerMats[(hIdx * 2 + sideIdx) % flowerMats.length]
      );
      flowerStrip.position.set(hx, parkY + 0.7, hz);
      root.add(flowerStrip);
    });
  });

  // Central Parisian Stone Fountain with animated shimmering water plume at z = -42.5
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0.5, parkY, -42.5);
  const fBasin = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 0.65, 16), stoneMat);
  fBasin.position.y = 0.32;
  const fPool = new THREE.Mesh(new THREE.CircleGeometry(2.35, 16), fountainWaterMat);
  fPool.rotation.x = -Math.PI / 2;
  fPool.position.y = 0.62;
  const fPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 1.55, 10), stoneMat);
  fPedestal.position.y = 1.05;
  const fBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 0.48, 0.38, 12), stoneMat);
  fBowl.position.y = 1.85;
  const fJetMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.72,
  });
  const fJet = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.9, 10, 1, true), fJetMat);
  fJet.position.y = 2.85;
  fountainGroup.add(fBasin, fPool, fPedestal, fBowl, fJet);
  root.add(fountainGroup);

  // Wooden Parisian Park Benches cleanly seated on the flat gravel walkway edge (>= 0.65m clear of hedges!)
  const benchSpots: Array<[number, number, number]> = [
    [-2.65, -31.5, Math.PI / 2],
    [3.65, -31.5, -Math.PI / 2],
    [-2.65, -47.0, Math.PI / 2],
    [3.65, -47.0, -Math.PI / 2],
    [-2.65, -53.0, Math.PI / 2],
    [3.65, -53.0, -Math.PI / 2],
  ];
  benchSpots.forEach(([bx, bz, brot]) => {
    const bg = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.09, 0.48), benchWoodMat);
    seat.position.y = 0.46;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.45, 0.07), benchWoodMat);
    back.position.set(0, 0.74, -0.2);
    [-0.72, 0.72].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.44), ironMat);
      leg.position.set(lx, 0.23, 0);
      bg.add(leg);
    });
    bg.add(seat, back);
    bg.position.set(bx, parkY + 0.03, bz);
    bg.rotation.y = brot;
    root.add(bg);
  });

  // Checkered picnic blankets on open lawns (hidden automatically during rain!)
  const picnicRainHideGroup = new THREE.Group();
  picnicRainHideGroup.userData.dynamicVisibility = true;
  root.add(picnicRainHideGroup);

  const picnicRedMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.88 });
  const picnicCreamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.88 });
  const picnicSpots: Array<[number, number]> = [
    [-5.8, -25.4],
    [6.6, -25.8],
    [-5.8, -42.5],
    [6.6, -42.5],
  ];
  picnicSpots.forEach(([px, pz], idx) => {
    const pg = new THREE.Group();
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 2.2),
      idx % 2 === 0 ? picnicRedMat : picnicCreamMat
    );
    cloth.rotation.x = -Math.PI / 2;
    cloth.position.y = 0.04;
    const inner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.3),
      idx % 2 === 0 ? picnicCreamMat : picnicRedMat
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.05;
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 0.34), benchWoodMat);
    basket.position.set(0.48, 0.18, -0.32);
    pg.add(cloth, inner, basket);
    pg.position.set(px, parkY, pz);
    pg.rotation.y = idx * 0.4;
    picnicRainHideGroup.add(pg);
  });

  // Classic Dark-Green Parisian Morris Columns flanking the entrance to Champ de Mars
  [-10.4, 11.2].forEach((mx) => {
    const colG = new THREE.Group();
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 3.2, 10), ironMat);
    cyl.position.y = 1.6;
    const poster = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 1.9, 10), winWarmMat);
    poster.position.y = 1.65;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), ironMat);
    dome.position.y = 3.15;
    colG.add(cyl, poster, dome);
    colG.position.set(mx, parkY, -25.5);
    root.add(colG);
  });

  // Shared Umbrella Geometry for Universal Park Rain Reaction (Zero extra draw bloat!)
  const sharedUmbCanopyGeo = new THREE.ConeGeometry(0.62, 0.24, 10);
  const sharedUmbStemGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.95, 5);
  const umbStemMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 });
  const umbPalette = [0xb91c1c, 0x1d4ed8, 0x0f766e, 0x7c3aed, 0xd97706, 0x334155];
  const parkUmbrellas: Array<{ umb: THREE.Group; arm: THREE.Mesh; baseArmX: number }> = [];

  // Helper: Articulated Full-Rigged Park NPC (Head, Hair, Torso, 2 Arms, 2 Legs + Rain Umbrella)
  const parkSkinMat = new THREE.MeshStandardMaterial({ color: 0xe8bc9e, roughness: 0.72 });
  const parkHairMat = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.85 });
  const parkPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const createParkPerson = (
    coatHex: number,
    seated: boolean,
    holdingHandSide: -1 | 0 | 1,
    umbrellaIdx?: number
  ) => {
    const g = new THREE.Group();
    const coatMat = new THREE.MeshStandardMaterial({ color: coatHex, roughness: 0.78 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.68, 0.16), parkPantsMat);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.68, 0.16), parkPantsMat);
    if (seated) {
      legL.rotation.x = -Math.PI / 2.15;
      legR.rotation.x = -Math.PI / 2.15;
      legL.position.set(-0.1, 0.47, 0.24);
      legR.position.set(0.1, 0.47, 0.24);
    } else {
      legL.position.set(-0.1, 0.34, 0);
      legR.position.set(0.1, 0.34, 0);
    }
    const torsoY = seated ? 0.82 : 0.96;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.58, 0.22), coatMat);
    torso.position.y = torsoY;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), coatMat);
    armL.position.set(-0.25, torsoY - 0.02, 0);
    if (holdingHandSide === -1) armL.rotation.z = -0.35;
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), coatMat);
    armR.position.set(0.25, torsoY - 0.02, 0);
    if (holdingHandSide === 1) armR.rotation.z = 0.35;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 7), parkSkinMat);
    head.position.y = torsoY + 0.44;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.58), parkHairMat);
    hair.position.y = torsoY + 0.47;
    g.add(legL, legR, torso, armL, armR, head, hair);

    if (typeof umbrellaIdx === 'number') {
      const umb = new THREE.Group();
      const umbMat = new THREE.MeshStandardMaterial({
        color: umbPalette[umbrellaIdx % umbPalette.length],
        roughness: 0.6,
        side: THREE.DoubleSide,
      });
      const stem = new THREE.Mesh(sharedUmbStemGeo, umbStemMat);
      stem.position.y = 0.48;
      const canopy = new THREE.Mesh(sharedUmbCanopyGeo, umbMat);
      canopy.position.y = 0.95;
      umb.add(stem, canopy);
      umb.position.set(holdingHandSide === -1 ? 0.22 : -0.22, torsoY + 0.06, 0.18);
      umb.visible = false;
      g.add(umb);
      parkUmbrellas.push({
        umb,
        arm: holdingHandSide === -1 ? armR : armL,
        baseArmX: 0,
      });
    }
    return { group: g, legL, legR, armL, armR, head };
  };

  // Animated Dating Couples Strolling Hand-in-Hand strictly inside flat gravel walkways (ZERO fountain/wall clipping!)
  interface StrollingCouple {
    group: THREE.Group;
    pA: ReturnType<typeof createParkPerson>;
    pB: ReturnType<typeof createParkPerson>;
    baseX: number;
    zMin: number;
    zMax: number;
    z: number;
    dir: 1 | -1;
    speed: number;
    phase: number;
  }
  const strollingCouples: StrollingCouple[] = [];
  const coupleSpecs = [
    { x: -0.6, z: -30.0, zMin: -38.2, zMax: -24.2, dir: -1 as const, speed: 1.05, cA: 0xb91c1c, cB: 0x1d4ed8 },
    { x: 1.5, z: -50.5, zMin: -55.2, zMax: -46.8, dir: 1 as const, speed: 1.0, cA: 0x0f766e, cB: 0xbe185d },
    { x: -8.6, z: -36.0, zMin: -54.5, zMax: -28.0, dir: -1 as const, speed: 1.2, cA: 0x7c3aed, cB: 0xd97706 },
    { x: 9.6, z: -44.0, zMin: -54.5, zMax: -28.0, dir: 1 as const, speed: 1.1, cA: 0x334155, cB: 0xe11d48 },
  ];
  coupleSpecs.forEach((cs, idx) => {
    const cg = new THREE.Group();
    const pA = createParkPerson(cs.cA, false, 1, idx);
    pA.group.position.x = -0.32;
    const pB = createParkPerson(cs.cB, false, -1);
    pB.group.position.x = 0.32;
    cg.add(pA.group, pB.group);
    cg.position.set(cs.x, parkY + 0.03, cs.z);
    cg.rotation.y = cs.dir === 1 ? 0 : Math.PI;
    cg.userData.outdoorOnly = true;
    root.add(cg);
    strollingCouples.push({
      group: cg,
      pA,
      pB,
      baseX: cs.x,
      zMin: cs.zMin,
      zMax: cs.zMax,
      z: cs.z,
      dir: cs.dir,
      speed: cs.speed,
      phase: idx * 1.6,
    });
  });

  // Dating Couples Snapped Cleanly onto Park Bench Seats (y = parkY + 0.03, facing outward esplanade normal, sharing umbrella in rain!)
  const seatedHeads: THREE.Mesh[] = [];
  [
    { x: -2.65, z: -31.5, rot: Math.PI / 2, cA: 0x9f1239, cB: 0x1e40af },
    { x: 3.65, z: -47.0, rot: -Math.PI / 2, cA: 0x047857, cB: 0xb45309 },
  ].forEach((sb, idx) => {
    const pair = new THREE.Group();
    const a = createParkPerson(sb.cA, true, 1, idx + 4);
    a.group.position.set(-0.32, 0.03, 0.04);
    const b = createParkPerson(sb.cB, true, -1);
    b.group.position.set(0.32, 0.03, 0.04);
    pair.add(a.group, b.group);
    pair.position.set(sb.x, parkY + 0.03, sb.z);
    pair.rotation.y = sb.rot;
    pair.userData.outdoorOnly = true;
    root.add(pair);
    seatedHeads.push(a.head, b.head);
  });

  picnicSpots.slice(0, 2).forEach(([px, pz], idx) => {
    const pA = createParkPerson(idx === 0 ? 0xdb2777 : 0x2563eb, true, 0);
    pA.group.position.set(px - 0.55, parkY - 0.25, pz + 0.2);
    pA.group.rotation.y = 0.8;
    const pB = createParkPerson(idx === 0 ? 0x1e293b : 0xd97706, true, 0);
    pB.group.position.set(px + 0.55, parkY - 0.25, pz + 0.2);
    pB.group.rotation.y = -0.8;
    picnicRainHideGroup.add(pA.group, pB.group);
    seatedHeads.push(pA.head, pB.head);
  });

  // Parisian Artist painting at a wooden easel facing the Eiffel Tower (equips umbrella in rain!)
  const artistGroup = new THREE.Group();
  artistGroup.position.set(-3.4, parkY + 0.03, -27.2);
  artistGroup.rotation.y = Math.PI - 0.2;
  artistGroup.userData.outdoorOnly = true;
  const artist = createParkPerson(0x1f2937, false, 0, 5);
  artist.armR.rotation.x = -1.05;
  artistGroup.add(artist.group);
  const easelStand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.55, 0.08), benchWoodMat);
  easelStand.position.set(0.05, 0.78, 0.72);
  easelStand.rotation.x = -0.18;
  const canvasBoard = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.54, 0.05), picnicCreamMat);
  canvasBoard.position.set(0.05, 1.25, 0.66);
  canvasBoard.rotation.x = -0.18;
  artistGroup.add(easelStand, canvasBoard);
  root.add(artistGroup);

  // Shimmering Seine River Curve behind the Eiffel Tower with gliding Bateaux Mouches riverboat lights!
  const seineMat = new THREE.MeshStandardMaterial({
    color: 0x1d4e68,
    emissive: 0x0c2438,
    emissiveIntensity: 0.25,
    roughness: 0.16,
    metalness: 0.42,
  });
  const seineRiver = new THREE.Mesh(new THREE.PlaneGeometry(180, 12.5), seineMat);
  seineRiver.rotation.x = -Math.PI / 2;
  seineRiver.rotation.z = 0.06;
  seineRiver.position.set(0, parkY - 0.08, -84.0);
  root.add(seineRiver);

  const riverBoats: Array<{ group: THREE.Group; x: number; dir: 1 | -1; speed: number }> = [];
  const boatHullMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 });
  const boatGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  [
    { x: -34, z: -82.5, dir: 1 as const, speed: 2.6 },
    { x: 28, z: -86.0, dir: -1 as const, speed: 2.2 },
  ].forEach((rb) => {
    const bg = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.55, 1.35), boatHullMat);
    hull.position.y = 0.28;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.52, 1.05), boatGlowMat);
    cabin.position.y = 0.72;
    bg.add(hull, cabin);
    bg.position.set(rb.x, parkY - 0.05, rb.z);
    root.add(bg);
    riverBoats.push({ group: bg, x: rb.x, dir: rb.dir, speed: rb.speed });
  });

  // Tree-lined Champs-de-Mars manicured avenue trees flanking the green park
  const parisTreeCount = 28;
  const parisTrees = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1.45, 1),
    boulevardTreeMat,
    parisTreeCount
  );
  const parisTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.14, 0.2, 2.1, 6),
    benchWoodMat,
    parisTreeCount
  );
  for (let i = 0; i < parisTreeCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const step = Math.floor(i / 2);
    const tx = 0.5 + side * 10.6;
    const tz = -24.5 - step * 3.1;
    dummy.position.set(tx, parkY + 1.0, tz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    parisTrunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tx, parkY + 2.8, tz);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(1.12, 1.25, 1.12);
    dummy.updateMatrix();
    parisTrees.setMatrixAt(i, dummy.matrix);
  }
  parisTrunks.instanceMatrix.needsUpdate = true;
  parisTrees.instanceMatrix.needsUpdate = true;
  root.add(parisTrunks, parisTrees);

  // Iconic Illuminated Eiffel Tower centered in the grand Parisian metropolis
  const tower = new THREE.Group();
  tower.position.set(0.5, -14.5, -68);

  // 4 sweeping flared base legs + signature lower arch ring
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.65, 14.5, 6), eiffelMat);
    leg.position.set(sx * 4.8, 6.8, sz * 4.8);
    leg.rotation.z = sx * 0.28;
    leg.rotation.x = -sz * 0.28;
    tower.add(leg);
  });
  const archRing = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.45, 6, 16, Math.PI), eiffelMat);
  archRing.position.set(0, 6.4, 4.6);
  tower.add(archRing);

  // 3 Observation Decks & Tapered Lattice Tiers
  const deck1 = new THREE.Mesh(new THREE.BoxGeometry(10.0, 1.2, 10.0), eiffelMat);
  deck1.position.y = 13.4;
  tower.add(deck1);

  const midTruss = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 4.2, 12.2, 4), eiffelMat);
  midTruss.rotation.y = Math.PI / 4;
  midTruss.position.y = 20.0;
  tower.add(midTruss);

  const deck2 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.95, 5.4), eiffelMat);
  deck2.position.y = 26.2;
  tower.add(deck2);

  const upperSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 2.05, 18.0, 4), eiffelMat);
  upperSpire.rotation.y = Math.PI / 4;
  upperSpire.position.y = 35.6;
  tower.add(upperSpire);

  const topDeck = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 1.9), eiffelMat);
  topDeck.position.y = 44.8;
  tower.add(topDeck);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.28, 4.8, 6), eiffelMat);
  antenna.position.y = 47.6;
  tower.add(antenna);

  // Sweeping Golden Night Searchlight Beacon rotating smoothly from the summit!
  const beaconPivot = new THREE.Group();
  beaconPivot.position.set(0, 45.2, 0);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beamGeo = new THREE.ConeGeometry(3.2, 34, 10, 1, true);
  beamGeo.rotateZ(-Math.PI / 2);
  beamGeo.translate(17, 0, 0);
  beaconPivot.add(new THREE.Mesh(beamGeo, beaconMat));
  const beamOpp = new THREE.Mesh(beamGeo, beaconMat);
  beamOpp.rotation.y = Math.PI;
  beaconPivot.add(beamOpp);
  tower.add(beaconPivot);

  // 64 Animated Golden Twinkle Sparkles along the Eiffel Tower (ONE THREE.Points draw call!)
  const twCount = 64;
  const twPos = new Float32Array(twCount * 3);
  for (let t = 0; t < twCount; t++) {
    const hRatio = t / (twCount - 1);
    const ty = 6.5 + hRatio * 39;
    const spread = (1 - hRatio) * 4.5 + 0.55;
    twPos[t * 3] = Math.sin(t * 2.4) * spread;
    twPos[t * 3 + 1] = ty;
    twPos[t * 3 + 2] = Math.cos(t * 1.9) * spread + 1.0;
  }
  const twGeo = new THREE.BufferGeometry();
  twGeo.setAttribute('position', new THREE.BufferAttribute(twPos, 3));
  const twinkleMat = new THREE.PointsMaterial({
    size: 1.8,
    color: 0xfde68a,
    map: getSharedGlowSpriteTexture(),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  tower.add(new THREE.Points(twGeo, twinkleMat));
  root.add(tower);

  // Snow blanket layer on terrace coping (toggled cleanly when climateState === 'winter')
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.88 });
  const snowCoping = new THREE.Mesh(new THREE.BoxGeometry(58, 0.09, 0.48), snowMat);
  snowCoping.position.set(0, 0.42, -17.5);
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
      fogDensityScale: 0.72,
    },
    update: (dt, elapsed, isNight, climateState, weather) => {
      ctx.update(isNight, climateState, elapsed);
      eiffelMat.emissiveIntensity = isNight ? 0.92 : 0.07;
      winWarmMat.emissiveIntensity = isNight ? 1.9 : 0.22;
      haussmannMat.emissiveIntensity = isNight ? 1.35 : 0.1;
      snowCoping.visible = climateState === 'winter';
      slateRoofMat.color.setHex(climateState === 'winter' ? 0xdbeafe : 0x3b4858);
      boulevardTreeMat.color.setHex(climateState === 'winter' ? 0xd8e6f2 : 0x3a6b35);
      parkLawnMat.color.setHex(climateState === 'winter' ? 0xdce8f4 : 0x3b8640);
      seineMat.color.setHex(isNight ? 0x0b2545 : 0x1d4e68);
      const isRain = weather.startsWith('rainy');
      cobbleMat.roughness = isRain ? 0.25 : 0.82;
      parkGravelMat.roughness = isRain ? 0.36 : 0.92;
      picnicRainHideGroup.visible = !isRain;

      // Animate central Parisian fountain shimmer
      fJet.scale.y = 0.88 + Math.sin(elapsed * 5.4) * 0.14;
      fJet.rotation.y += dt * 1.4;

      // Animate Champ de Mars dating couples strolling hand-in-hand
      for (const sc of strollingCouples) {
        sc.z += sc.dir * sc.speed * dt;
        if (sc.dir === -1 && sc.z < sc.zMin) {
          sc.dir = 1;
          sc.group.rotation.y = 0;
        } else if (sc.dir === 1 && sc.z > sc.zMax) {
          sc.dir = -1;
          sc.group.rotation.y = Math.PI;
        }
        sc.group.position.z = sc.z;
        const swing = Math.sin(elapsed * 4.8 + sc.phase) * 0.42;
        sc.pA.legL.rotation.x = swing;
        sc.pA.legR.rotation.x = -swing;
        sc.pA.armL.rotation.x = isRain ? -1.15 : -swing * 0.7;
        sc.pB.legL.rotation.x = -swing;
        sc.pB.legR.rotation.x = swing;
        sc.pB.armR.rotation.x = swing * 0.7;
      }
      for (let i = 0; i < seatedHeads.length; i++) {
        seatedHeads[i].rotation.y = Math.sin(elapsed * 1.1 + i * 1.9) * 0.22;
      }
      artist.armR.rotation.z = Math.sin(elapsed * 3.8) * 0.16;

      // Universal park rain umbrellas for strolling couples, bench couples & artist
      for (let i = 0; i < parkUmbrellas.length; i++) {
        const pu = parkUmbrellas[i];
        pu.umb.visible = isRain;
        if (isRain) {
          pu.arm.rotation.x = -1.15;
        } else if (pu.arm !== artist.armL) {
          pu.arm.rotation.x = pu.baseArmX;
        } else {
          pu.arm.rotation.x = 0;
        }
      }

      // Glide Bateaux Mouches riverboats along the Seine
      for (const rb of riverBoats) {
        rb.x += rb.dir * rb.speed * dt;
        if (rb.dir === 1 && rb.x > 64) rb.x = -64;
        if (rb.dir === -1 && rb.x < -64) rb.x = 64;
        rb.group.position.x = rb.x;
      }

      beaconPivot.rotation.y += dt * 0.42;
      beaconMat.opacity = isNight ? 0.16 : 0.0;
      twinkleMat.opacity = isNight ? 0.65 + Math.sin(elapsed * 6.5) * 0.3 : 0.0;
      twinkleMat.size = isNight ? 1.7 + Math.sin(elapsed * 8.2) * 0.45 : 0.8;
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

// ============================================================================
// 8. SWITZERLAND HILLTOP (True High-Altitude Cliffside Overlook, Deep Glacial
//    Valley & Lake Below, Grounded Upper/Lower Funicular Stations + Steel Viaduct,
//    Multi-Tier Spruces, Swiss Flag & Alpine Chalets)
// ============================================================================
export function buildSwitzerlandHilltopScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_switzerland_hilltop';

  const chaletWoodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.82 });
  const stoneRetainingMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92, flatShading: true });
  const alpineMeadowMat = new THREE.MeshStandardMaterial({ color: 0x3f7d44, roughness: 0.9, flatShading: true });
  const snowPeakMat = new THREE.MeshStandardMaterial({ color: 0xf1f7ff, roughness: 0.84, flatShading: true });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9, flatShading: true });
  const spruceMatA = new THREE.MeshStandardMaterial({ color: 0x1b4d36, roughness: 0.86 });
  const spruceMatB = new THREE.MeshStandardMaterial({ color: 0x255e43, roughness: 0.84 });
  const chaletRoofMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.78 });
  const chaletWinMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.35,
    roughness: 0.25,
  });

  // Grounded stone cliff retaining wall & sheer rocky escarpment directly beneath the chalet terrace (z = -17.5)
  const terraceRetainingWall = new THREE.Mesh(
    new THREE.BoxGeometry(68, 7.5, 1.8),
    stoneRetainingMat
  );
  terraceRetainingWall.position.set(0, -3.55, -18.2);
  root.add(terraceRetainingWall);

  // Wooden chalet terrace guardrail seated squarely atop the stone retaining coping
  const rail = new THREE.Mesh(new THREE.BoxGeometry(60, 0.12, 0.14), chaletWoodMat);
  rail.position.set(0, 1.06, -17.5);
  root.add(rail);
  const midRail = new THREE.Mesh(new THREE.BoxGeometry(60, 0.08, 0.1), chaletWoodMat);
  midRail.position.set(0, 0.62, -17.5);
  root.add(midRail);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.18, 0.14), chaletWoodMat, 30);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 30; i++) {
    dummy.position.set(-29 + i * 2.0, 0.56, -17.5);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  root.add(posts);

  // Iconic Swiss Red-Cross Flagpole + Stacked Alpine Firewood at the overlook corner
  const flagPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 4.6, 7),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.7 })
  );
  flagPole.position.set(-9.5, 2.3, -17.5);
  root.add(flagPole);
  const swissFlag = new THREE.Group();
  swissFlag.position.set(-9.5, 4.15, -17.5);
  const flagCloth = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.92, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.78 })
  );
  flagCloth.position.x = 0.55;
  swissFlag.add(flagCloth);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.06), whiteMat);
  crossV.position.x = 0.55;
  swissFlag.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.06), whiteMat);
  crossH.position.x = 0.55;
  swissFlag.add(crossH);
  root.add(swissFlag);

  // Stacked split alpine firewood bundle beside the terrace corner
  for (let row = 0; row < 3; row++) {
    for (let log = 0; log < 4 - row; log++) {
      const fLog = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.72, 6), chaletWoodMat);
      fLog.rotation.x = Math.PI / 2;
      fLog.position.set(-10.8 + log * 0.17 + row * 0.08, 0.1 + row * 0.15, -17.0);
      root.add(fLog);
    }
  }

  // Authentic Yellow Swiss Wanderweg Hiking Diamond Signpost at right overlook corner
  const wanderMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 });
  const redTipMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.58 });
  const wanderPost = new THREE.Group();
  wanderPost.position.set(8.6, 0, -17.18);
  const wPole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.55, 6), chaletWoodMat);
  wPole.position.y = 1.28;
  wanderPost.add(wPole);
  [
    { y: 2.32, ry: 0.25, dir: 1 },
    { y: 2.02, ry: -0.35, dir: -1 },
  ].forEach((b) => {
    const bg = new THREE.Group();
    bg.position.y = b.y;
    bg.rotation.y = b.ry;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.2, 0.035), wanderMat);
    blade.position.x = b.dir * 0.42;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.205, 0.04), redTipMat);
    tip.position.x = b.dir * 0.82;
    bg.add(blade, tip);
    wanderPost.add(bg);
  });
  const diamond = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.045), wanderMat);
  diamond.position.set(0, 1.72, 0.05);
  diamond.rotation.z = Math.PI / 4;
  wanderPost.add(diamond);
  root.add(wanderPost);

  // Wooden Alpine Ski & Snowboard Racks beside overlook corners
  const skiMats = [
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.32, metalness: 0.25 }),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.32, metalness: 0.25 }),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.34, metalness: 0.22 }),
    new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.34, metalness: 0.22 }),
  ];
  [-12.6, 10.6].forEach((rx, rIdx) => {
    const rack = new THREE.Group();
    rack.position.set(rx, 0, -17.02);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.34), chaletWoodMat);
    frame.position.y = 0.05;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.07, 0.08), chaletWoodMat);
    bar.position.set(0, 0.92, -0.1);
    [-0.68, 0.68].forEach((px) => {
      const sidePost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), chaletWoodMat);
      sidePost.position.set(px, 0.5, -0.1);
      rack.add(sidePost);
    });
    for (let s = 0; s < 4; s++) {
      const ski = new THREE.Mesh(
        new THREE.BoxGeometry(s === 3 ? 0.24 : 0.1, s === 3 ? 1.48 : 1.65, 0.03),
        skiMats[(s + rIdx) % skiMats.length]
      );
      ski.position.set(-0.46 + s * 0.31, 0.82, 0.02);
      ski.rotation.x = -0.14;
      rack.add(ski);
    }
    rack.add(frame, bar);
    root.add(rack);
  });

  // Sculpted Steep Snow-Dusted Rocky Alpine Cliff plunging cleanly DOWN from z = -17.6 (y = -0.35)
  // to the deep glacial valley floor (y = -28.0 at z = -50.6) — upward-facing normals, zero flat gray wall!
  const swissCliffGeo = new THREE.PlaneGeometry(196, 33, 24, 6);
  swissCliffGeo.rotateX(-Math.PI / 2);
  const swPos = swissCliffGeo.attributes.position as THREE.BufferAttribute;
  const swCols = new Float32Array(swPos.count * 3);
  const swRockCol = new THREE.Color(0x525d6b);
  const swSnowCol = new THREE.Color(0xe6f0fa);
  const swMeadowCol = new THREE.Color(0x3a6a42);
  const swTmp = new THREE.Color();
  for (let i = 0; i < swPos.count; i++) {
    const vx = swPos.getX(i);
    const vz = swPos.getZ(i); // +16.5 (near rim) .. -16.5 (valley floor)
    const t = Math.max(0, Math.min(1, (16.5 - vz) / 33));
    const crag =
      Math.sin(vx * 0.16 + t * 4.2) * 1.45 * Math.sin(t * Math.PI) +
      Math.cos(vx * 0.32 - t * 2.6) * 0.75 * Math.sin(t * Math.PI);
    const vy = -0.35 - Math.pow(t, 1.08) * 27.7 + crag;
    swPos.setY(i, vy);
    if (t < 0.25) {
      swTmp.lerpColors(swSnowCol, swRockCol, t / 0.25);
    } else if (t < 0.78) {
      swTmp.lerpColors(swRockCol, swSnowCol, crag > 0.35 ? 0.65 : 0.12);
    } else {
      swTmp.lerpColors(swRockCol, swMeadowCol, (t - 0.78) / 0.22);
    }
    swCols[i * 3] = swTmp.r;
    swCols[i * 3 + 1] = swTmp.g;
    swCols[i * 3 + 2] = swTmp.b;
  }
  swissCliffGeo.translate(0, 0, -34.1);
  swissCliffGeo.setAttribute('color', new THREE.BufferAttribute(swCols, 3));
  swissCliffGeo.computeVertexNormals();
  const steepCliff = new THREE.Mesh(
    swissCliffGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true })
  );
  root.add(steepCliff);

  // Cascading Cliffside Glacial Waterfalls / Ice Falls plunging down the escarpment!
  const waterfallMat = new THREE.MeshBasicMaterial({
    color: 0xbaf2ff,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });
  const waterfallFoamMat = new THREE.SpriteMaterial({
    map: getSharedGlowSpriteTexture(),
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const waterfallFoams: THREE.Sprite[] = [];
  [-18.5, 22.0].forEach((wx) => {
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 29.0), waterfallMat);
    ribbon.position.set(wx, -13.5, -31.5);
    ribbon.rotation.x = -0.64;
    root.add(ribbon);
    const mist = new THREE.Sprite(waterfallFoamMat);
    mist.position.set(wx, -26.2, -45.5);
    mist.scale.set(7.5, 4.5, 1);
    root.add(mist);
    waterfallFoams.push(mist);
  });

  // Deep Alpine Valley Floor far below (y = -28.0) with shimmering turquoise glacial lake!
  const valleyMeadow = new THREE.Mesh(new THREE.PlaneGeometry(260, 180), alpineMeadowMat);
  valleyMeadow.rotation.x = -Math.PI / 2;
  valleyMeadow.position.set(0, -28.0, -104);
  root.add(valleyMeadow);

  const lakeMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0e7490,
    emissiveIntensity: 0.18,
    roughness: 0.14,
    metalness: 0.36,
  });
  const lake = new THREE.Mesh(new THREE.CircleGeometry(46, 28), lakeMat);
  lake.rotation.x = -Math.PI / 2;
  lake.scale.set(1.35, 0.62, 1);
  lake.position.set(-8, -27.68, -78);
  root.add(lake);

  // Tiny Animated Wooden Swiss Glacial Lake Ferry Boat + White Wake drifting smoothly across the turquoise lake!
  const lakeBoat = new THREE.Group();
  const ferryHull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.65, 1.35), chaletWoodMat);
  ferryHull.position.y = 0.3;
  const ferryCabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 1.05), whiteMat);
  ferryCabin.position.set(-0.2, 0.85, 0);
  const ferryWin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 1.1), chaletWinMat);
  ferryWin.position.set(-0.2, 0.92, 0);
  const wakeMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.65 });
  const ferryWake = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.85), wakeMat);
  ferryWake.rotation.x = -Math.PI / 2;
  ferryWake.position.set(-4.2, 0.08, 0);
  lakeBoat.add(ferryHull, ferryCabin, ferryWin, ferryWake);
  lakeBoat.position.set(-24, -27.64, -74);
  root.add(lakeBoat);

  // Winding valley alpine ribbon road far below
  const valleyRoad = new THREE.Mesh(
    new THREE.PlaneGeometry(165, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
  );
  valleyRoad.rotation.x = -Math.PI / 2;
  valleyRoad.rotation.z = 0.06;
  valleyRoad.position.set(8, -27.72, -55);
  root.add(valleyRoad);

  // Grounded cliffside rock shoulders framing left & right slopes (outside center vista)
  const rightCliffMass = new THREE.Mesh(new THREE.ConeGeometry(26, 26, 8), rockMat);
  rightCliffMass.scale.set(1.2, 1.0, 0.9);
  rightCliffMass.position.set(32, -14.5, -32);
  root.add(rightCliffMass);
  const leftCliffMass = new THREE.Mesh(new THREE.ConeGeometry(26, 25, 8), rockMat);
  leftCliffMass.scale.set(1.2, 0.95, 0.9);
  leftCliffMass.position.set(-34, -15.0, -34);
  root.add(leftCliffMass);

  // Miniature Swiss Valley Village Chalets + Tiny Alpine Church Spire nestled along the glacial lake!
  const valleyChaletSpots: Array<[number, number, number]> = [
    [-26, -54, 0.22], [-18, -56, -0.14], [-8, -52, 0.32], [4, -56, -0.2],
    [16, -54, 0.18], [26, -58, -0.3], [-32, -64, 0.4], [24, -68, -0.25],
    [12, -62, 0.12], [-2, -60, -0.18],
  ];
  valleyChaletSpots.forEach(([vx, vz, ry]) => {
    const cg = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.3, 3.2), chaletWoodMat);
    body.position.y = 1.15;
    cg.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.65, 4), chaletRoofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.05;
    cg.add(roof);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.75), chaletWinMat);
    win.position.set(0, 1.35, 1.63);
    cg.add(win);
    cg.position.set(vx, -28.0, vz);
    cg.rotation.y = ry;
    root.add(cg);
  });

  // Iconic White Swiss Village Church with tall pointed steeple by the lakeshore
  const church = new THREE.Group();
  church.position.set(11.5, -28.0, -68.0);
  const nave = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 6.2), whiteMat);
  nave.position.y = 1.6;
  const naveRoof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 2.2, 4), chaletRoofMat);
  naveRoof.rotation.y = Math.PI / 4;
  naveRoof.position.y = 4.1;
  const steeple = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6.8, 1.5), whiteMat);
  steeple.position.set(0, 3.4, 2.4);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.25, 4.4, 4), rockMat);
  spire.rotation.y = Math.PI / 4;
  spire.position.set(0, 8.9, 2.4);
  church.add(nave, naveRoof, steeple, spire);
  root.add(church);

  // Classic Swiss Stone Arch Valley Viaduct Bridge spanning the glacial valley floor (Landwasser style!)
  const viaductGroup = new THREE.Group();
  viaductGroup.position.set(6, -28.0, -58.5);
  viaductGroup.rotation.y = 0.07;
  const vDeck = new THREE.Mesh(new THREE.BoxGeometry(66, 1.15, 2.8), stoneRetainingMat);
  vDeck.position.y = 8.4;
  viaductGroup.add(vDeck);
  const vParapetF = new THREE.Mesh(new THREE.BoxGeometry(66, 0.52, 0.24), stoneRetainingMat);
  vParapetF.position.set(0, 9.2, 1.28);
  const vParapetB = new THREE.Mesh(new THREE.BoxGeometry(66, 0.52, 0.24), stoneRetainingMat);
  vParapetB.position.set(0, 9.2, -1.28);
  viaductGroup.add(vParapetF, vParapetB);
  for (let p = 0; p < 8; p++) {
    const px = -28 + p * 8.0;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2.1, 8.6, 2.5), stoneRetainingMat);
    pier.position.set(px, 4.1, 0);
    viaductGroup.add(pier);
    if (p < 7) {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(2.95, 0.65, 6, 10, Math.PI),
        stoneRetainingMat
      );
      arch.position.set(px + 4.0, 5.1, 0);
      viaductGroup.add(arch);
    }
  }
  root.add(viaductGroup);

  // Layered Multi-Ridge Rugged Swiss Alpine Massifs deeply grounded below valley floor (baseY = -36, ZERO uniform floating cones!)
  const alpineSkirt = new THREE.Mesh(
    new THREE.BoxGeometry(310, 14, 52),
    new THREE.MeshStandardMaterial({ color: 0x3b4859, roughness: 0.94, flatShading: true })
  );
  alpineSkirt.position.set(0, -33.0, -124);
  alpineSkirt.userData.alwaysVisibleBackdrop = true;
  root.add(alpineSkirt);

  const alpineMassifMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    flatShading: true,
  });
  const graniteBaseColor = new THREE.Color(0x3f4a5a);
  const slateMidColor = new THREE.Color(0x5b6b7f);
  const snowSummitColor = new THREE.Color(0xf1f7ff);
  const tmpAlpineColor = new THREE.Color();

  // Build organic single-mesh vertex-colored faceted alpine massif (zero sharp cone-on-cone cutoff seams!)
  const createAlpinePeakMesh = (
    radius: number,
    height: number,
    radialSegs: number,
    heightSegs: number,
    seed: number,
    snowStartRatio: number
  ): THREE.Mesh => {
    const geo = new THREE.ConeGeometry(radius, height, radialSegs, heightSegs);
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const normH = (vy + height * 0.5) / height; // 0 at base, 1 at apex
      const angle = Math.atan2(vz, vx);
      // Organic angular crag displacement (preserve apex & base cleanly)
      const cragFactor = Math.sin(normH * Math.PI);
      const radialWarp =
        1 +
        cragFactor *
          (0.14 * Math.sin(angle * 3 + seed * 1.7) + 0.08 * Math.cos(angle * 5 - seed * 2.3));
      posAttr.setXYZ(i, vx * radialWarp, vy, vz * radialWarp);

      // Irregular jagged natural snowline blending dark granite -> mid slate -> gleaming snow
      const snowLine =
        snowStartRatio +
        0.09 * Math.sin(angle * 3 + seed) +
        0.05 * Math.cos(angle * 4 - seed * 1.4);
      if (normH < snowLine - 0.14) {
        const t = Math.max(0, normH / Math.max(0.1, snowLine - 0.14));
        tmpAlpineColor.lerpColors(graniteBaseColor, slateMidColor, t);
      } else if (normH < snowLine + 0.08) {
        const t = (normH - (snowLine - 0.14)) / 0.22;
        tmpAlpineColor.lerpColors(slateMidColor, snowSummitColor, Math.max(0, Math.min(1, t)));
      } else {
        tmpAlpineColor.copy(snowSummitColor);
      }
      colors[i * 3] = tmpAlpineColor.r;
      colors[i * 3 + 1] = tmpAlpineColor.g;
      colors[i * 3 + 2] = tmpAlpineColor.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, alpineMassifMat);
  };

  const peakSpecs: Array<{
    x: number;
    z: number;
    r: number;
    h: number;
    shoulderDx: number;
    shoulderScale: number;
    snowStart: number;
  }> = [
    { x: -94, z: -112, r: 44, h: 72, shoulderDx: 18, shoulderScale: 0.68, snowStart: 0.44 },
    { x: -56, z: -124, r: 42, h: 82, shoulderDx: -16, shoulderScale: 0.72, snowStart: 0.42 },
    { x: -18, z: -134, r: 46, h: 92, shoulderDx: 19, shoulderScale: 0.74, snowStart: 0.4 },
    { x: 20, z: -128, r: 44, h: 88, shoulderDx: -17, shoulderScale: 0.7, snowStart: 0.43 },
    { x: 58, z: -120, r: 42, h: 78, shoulderDx: 16, shoulderScale: 0.68, snowStart: 0.45 },
    { x: 96, z: -110, r: 44, h: 70, shoulderDx: -18, shoulderScale: 0.66, snowStart: 0.46 },
  ];
  peakSpecs.forEach((pk, idx) => {
    const massif = new THREE.Group();
    const mainPeak = createAlpinePeakMesh(pk.r, pk.h, 7, 6, idx * 1.9 + 0.4, pk.snowStart);
    mainPeak.scale.set(1.18, 1.0, 0.82);
    mainPeak.rotation.y = idx * 0.55;
    mainPeak.position.set(pk.x, -36.0 + pk.h * 0.5, pk.z);
    massif.add(mainPeak);

    const shH = pk.h * pk.shoulderScale;
    const shoulder = createAlpinePeakMesh(
      pk.r * 0.72,
      shH,
      6,
      5,
      idx * 2.7 + 1.3,
      pk.snowStart + 0.08
    );
    shoulder.scale.set(1.22, 1.0, 0.78);
    shoulder.rotation.y = idx * 0.9 + 0.6;
    shoulder.position.set(pk.x + pk.shoulderDx, -36.0 + shH * 0.5, pk.z + 10);
    massif.add(shoulder);

    massif.userData.alwaysVisibleBackdrop = true;
    root.add(massif);
  });

  // Distant Animated High-Altitude Alpine Ski Gondola anchored cleanly to twin mountain pylons!
  const gondolaStart = new THREE.Vector3(-42, 8.5, -96);
  const gondolaEnd = new THREE.Vector3(24, 15.5, -102);
  const gondolaPylonMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.45 });
  [gondolaStart, gondolaEnd].forEach((pt) => {
    const pylonH = pt.y + 30;
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.72, pylonH, 6), gondolaPylonMat);
    pylon.position.set(pt.x, pt.y - pylonH * 0.5, pt.z);
    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 0.45), gondolaPylonMat);
    crossArm.position.copy(pt);
    root.add(pylon, crossArm);
  });
  const gondolaCable = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([gondolaStart, gondolaEnd]),
    new THREE.LineBasicMaterial({ color: 0x334155 })
  );
  root.add(gondolaCable);
  const gondolaCar = new THREE.Group();
  const gHanger = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 5), rockMat);
  gHanger.position.y = -0.7;
  const gCabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.6, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 })
  );
  gCabin.position.y = -2.0;
  gondolaCar.add(gHanger, gCabin);
  gondolaCar.position.copy(gondolaStart);
  root.add(gondolaCar);

  // Multi-tier Snow-Dusted Swiss Spruce Trees strictly framing left & right cliff edges (|x| > 9.0!)
  const spruceCoords: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 42; i++) {
    const x = -38 + i * 1.85 + (i % 2 === 0 ? -0.3 : 0.3);
    if (Math.abs(x) < 9.2) continue; // Keep glacial lake & valley center vista 100% open!
    const z = -19.8 - (i % 4) * 3.1;
    const slopeT = Math.max(0, Math.min(1, (-17.6 - z) / 33.0));
    const groundY = -0.5 - Math.pow(slopeT, 1.08) * 27.5;
    const sc = 0.85 + (i % 3) * 0.22;
    spruceCoords.push([x, groundY, z, sc]);
  }
  const spTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.18, 2.6, 6),
    chaletWoodMat,
    spruceCoords.length
  );
  const spLower = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.45, 3.0, 7),
    spruceMatA,
    spruceCoords.length
  );
  const spUpper = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.05, 2.7, 7),
    spruceMatB,
    spruceCoords.length
  );
  const spSnowCaps = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.76, 1.75, 7),
    snowPeakMat,
    spruceCoords.length
  );
  spruceCoords.forEach(([x, groundY, z, sc], i) => {
    dummy.position.set(x, groundY + 1.0 * sc, z);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    spTrunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, groundY + 2.8 * sc, z);
    dummy.updateMatrix();
    spLower.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, groundY + 4.25 * sc, z);
    dummy.updateMatrix();
    spUpper.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, groundY + 4.95 * sc, z);
    dummy.updateMatrix();
    spSnowCaps.setMatrixAt(i, dummy.matrix);
  });
  spTrunks.instanceMatrix.needsUpdate = true;
  spLower.instanceMatrix.needsUpdate = true;
  spUpper.instanceMatrix.needsUpdate = true;
  spSnowCaps.instanceMatrix.needsUpdate = true;
  root.add(spTrunks, spLower, spUpper, spSnowCaps);

  // === GROUNDED CLIFFSIDE INCLINED ELEVATOR (FUNICULAR) — ZERO CLIPPING! ===
  // Upper Station sits flush with the cliffside overlook terrace (y = 0.0, z = -19.8);
  // Lower Station sits clearly on a lower cliffside terrace overlooking the valley (y = -17.2, z = -43.5).
  const upperPos = new THREE.Vector3(12.2, 0.35, -20.2);
  const lowerPos = new THREE.Vector3(-10.5, -16.8, -43.0);
  const trackVec = new THREE.Vector3().subVectors(upperPos, lowerPos);
  const trackLen = trackVec.length();
  const trackMid = new THREE.Vector3().addVectors(lowerPos, upperPos).multiplyScalar(0.5);

  const railSteelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.38,
    metalness: 0.78,
  });
  const trackBeam = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.44, trackLen + 0.6), railSteelMat);
  trackBeam.position.copy(trackMid);
  trackBeam.lookAt(upperPos);
  root.add(trackBeam);

  // Dual steel running rails atop the viaduct deck
  [-0.55, 0.55].forEach((offset) => {
    const subRail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, trackLen + 0.4), snowPeakMat);
    subRail.position.copy(trackMid).add(new THREE.Vector3(offset, 0.28, 0));
    subRail.lookAt(upperPos.clone().add(new THREE.Vector3(offset, 0.28, 0)));
    root.add(subRail);
  });

  // 8 solid stone-and-steel trestle piers extending cleanly down into the rock cliff/valley floor
  const pierCount = 8;
  const pierPos = new THREE.Vector3();
  for (let p = 0; p < pierCount; p++) {
    const frac = p / (pierCount - 1);
    pierPos.lerpVectors(lowerPos, upperPos, frac);
    const pierTopY = pierPos.y - 0.18;
    const pierBottomY = -28.5;
    const pierH = Math.max(2.0, pierTopY - pierBottomY);
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.45, pierH, 1.45), stoneRetainingMat);
    pier.position.set(pierPos.x, pierBottomY + pierH / 2, pierPos.z);
    root.add(pier);
  }

  // Distinct Upper & Lower Funicular Pavilion Stations with deep stone plinths
  const stationWallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.75 });
  const roofRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.62 });
  [
    { pos: upperPos, offset: new THREE.Vector3(1.6, -0.45, 0.9) },
    { pos: lowerPos, offset: new THREE.Vector3(-1.4, -0.5, -1.2) },
  ].forEach(({ pos, offset }) => {
    const st = new THREE.Group();
    const foundationH = Math.max(5.5, pos.y + 28.5);
    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, foundationH, 3.8),
      stoneRetainingMat
    );
    foundation.position.y = -foundationH / 2 - 0.1;
    st.add(foundation);
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.5, 3.4), stationWallMat);
    base.position.y = 1.15;
    st.add(base);
    const stationWin = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.05), chaletWinMat);
    stationWin.position.set(0, 1.25, 1.73);
    st.add(stationWin);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.35, 4), roofRedMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.05;
    st.add(roof);
    st.position.copy(pos).add(offset);
    root.add(st);
  });

  // Animated Red & Glass Swiss Funicular Cabin strictly clamped to [0, 1] along the viaduct!
  const cabinGroup = new THREE.Group();
  const cabinBogie = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.4, 1.4), railSteelMat);
  cabinBogie.position.y = 0.22;
  cabinGroup.add(cabinBogie);
  const cabinBody = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.65, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.24 })
  );
  cabinBody.position.y = 1.22;
  cabinGroup.add(cabinBody);
  const cabinGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.35,
    roughness: 0.14,
    metalness: 0.35,
  });
  const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.78, 1.48), cabinGlassMat);
  cabinGlass.position.y = 1.42;
  cabinGroup.add(cabinGlass);
  const cabinWhiteStripe = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.18, 1.84), whiteMat);
  cabinWhiteStripe.position.y = 0.78;
  cabinGroup.add(cabinWhiteStripe);
  cabinGroup.position.copy(lowerPos);
  root.add(cabinGroup);

  const ctx = addSurrounding360Context(root, 'switzerland_hilltop');

  // Funicular state machine: smooth travel (11s) + 5.0s boarding pause at each station
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
      fogDensityScale: 0.68,
    },
    update: (dt, elapsed, isNight, climateState) => {
      ctx.update(isNight, climateState, elapsed);
      alpineMeadowMat.color.setHex(climateState === 'winter' ? 0xeef5fc : 0x3f7d44);
      spruceMatA.color.setHex(climateState === 'winter' ? 0x3b6e5c : 0x1b4d36);
      spruceMatB.color.setHex(climateState === 'winter' ? 0x4b7f6e : 0x255e43);
      chaletRoofMat.color.setHex(climateState === 'winter' ? 0xf1f7ff : 0x7c2d12);
      chaletWinMat.emissiveIntensity = isNight ? 1.85 : 0.25;
      cabinGlassMat.emissiveIntensity = isNight ? 1.85 : 0.28;
      lakeMat.color.setHex(isNight ? 0x0b3454 : 0x06b6d4);
      swissFlag.rotation.y = Math.sin(elapsed * 2.8) * 0.22;

      // Animate wooden Swiss ferry drifting peacefully across the glacial lake
      const boatCycle = (Math.sin(elapsed * 0.14) + 1) * 0.5;
      const boatDir = Math.cos(elapsed * 0.14) >= 0 ? 1 : -1;
      lakeBoat.position.x = -34 + boatCycle * 46;
      lakeBoat.position.z = -75 + Math.sin(elapsed * 0.28) * 3.5;
      lakeBoat.rotation.y = boatDir === 1 ? 0 : Math.PI;

      // Animate high-altitude alpine ski gondola gliding between mountain peaks
      const gondolaT = (Math.sin(elapsed * 0.22) + 1) * 0.5;
      gondolaCar.position.lerpVectors(gondolaStart, gondolaEnd, gondolaT);

      // Gentle waterfall mist pulse
      waterfallFoamMat.opacity = 0.36 + Math.sin(elapsed * 3.2) * 0.1;
      for (let i = 0; i < waterfallFoams.length; i++) {
        waterfallFoams[i].scale.set(
          7.2 + Math.sin(elapsed * 2.1 + i) * 0.8,
          4.4 + Math.cos(elapsed * 2.4 + i) * 0.5,
          1
        );
      }

      funicularTimer += dt;
      let t = 0;
      if (funicularPhase === 'going_up') {
        const raw = Math.min(1, funicularTimer / travelDuration);
        t = raw * raw * (3 - 2 * raw);
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
      // Strictly clamped [0, 1] along track deck so cabin never clips or buries underground!
      const clampedT = Math.max(0, Math.min(1, t));
      cabinGroup.position.lerpVectors(lowerPos, upperPos, clampedT);
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

// ============================================================================
// 9. MT. EVEREST & HIKER TRAIL (Cleared Wide Trail, Expedition Dome Tents,
//    Supply Crates & O2 Cylinders, Himalayan Chorten Cairn, Readable Signpost,
//    Multi-Tier Firs & Animated Summit Spindrift Snow Stream)
// ============================================================================
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

  // Expansive snowfield beyond the cafe lane
  const snowField = new THREE.Mesh(new THREE.PlaneGeometry(210, 160), snowMat);
  snowField.rotation.x = -Math.PI / 2;
  snowField.position.set(0, -0.05, -94);
  root.add(snowField);

  // Winding stone hiker trail leading cleanly from base camp toward Everest
  const trailStones = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.68, 0.78, 0.12, 6),
    stoneTrailMat,
    24
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const x = Math.sin(t * Math.PI * 1.4) * 3.6;
    const z = -17.5 - i * 2.2;
    dummy.position.set(x, 0.04, z);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(1.15 + (i % 3) * 0.2, 1, 0.92);
    dummy.updateMatrix();
    trailStones.setMatrixAt(i, dummy.matrix);
  }
  trailStones.instanceMatrix.needsUpdate = true;
  root.add(trailStones);

  // Flanking snowdrifts pushed cleanly behind z <= -23.5 so the hiker trail is wide open!
  [
    [-19, -24.5, 7.5, 2.3],
    [18.5, -25.0, 8.2, 2.5],
    [-27, -36, 12, 4.4],
    [26, -37, 11.5, 4.2],
  ].forEach(([sx, sz, r, h]) => {
    const drift = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 7), snowMat);
    drift.scale.set(1.4, h / r, 0.9);
    drift.position.set(sx, 0, sz);
    root.add(drift);
  });

  // Vibrant Base-Camp Expedition Dome Tents with warm glowing interior lantern light!
  const tentYellowMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    emissive: 0xd97706,
    emissiveIntensity: 0.22,
    roughness: 0.74,
  });
  const tentOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    emissive: 0xf97316,
    emissiveIntensity: 0.22,
    roughness: 0.74,
  });
  const tentTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const tentSpecs = [
    { x: -10.8, z: -22.2, rotY: 0.35, mat: tentYellowMat, sc: 1.05 },
    { x: 10.6, z: -22.8, rotY: -0.4, mat: tentOrangeMat, sc: 1.0 },
    { x: 14.5, z: -26.5, rotY: -0.18, mat: tentYellowMat, sc: 0.92 },
  ];
  tentSpecs.forEach((ts) => {
    const tg = new THREE.Group();
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.54),
      ts.mat
    );
    dome.scale.set(1.05, 0.92, 1.25);
    tg.add(dome);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.88, 0.16), tentTrimMat);
    door.position.set(0, 0.44, 1.72);
    tg.add(door);
    tg.position.set(ts.x, 0.0, ts.z);
    tg.rotation.y = ts.rotY;
    tg.scale.setScalar(ts.sc);
    root.add(tg);
  });

  // Expedition Supply Crates & Oxygen Cylinders stacked beside the dome tents
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75 });
  const o2Mat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.35, metalness: 0.5 });
  [
    [-8.6, -21.8],
    [8.8, -22.2],
  ].forEach(([cx, cz]) => {
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.52, 0.65), crateMat);
    crate1.position.set(cx, 0.26, cz);
    root.add(crate1);
    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.42, 0.52), woodMat);
    crate2.position.set(cx + 0.08, 0.73, cz);
    crate2.rotation.y = 0.22;
    root.add(crate2);
    for (let k = 0; k < 2; k++) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.72, 7), o2Mat);
      tank.position.set(cx + 0.65 + k * 0.24, 0.36, cz + 0.1);
      root.add(tank);
    }
  });

  // Carved Stone Himalayan Chorten / Stupa Cairn anchored to the prayer flag lines
  const chorten = new THREE.Group();
  chorten.position.set(-6.4, 0, -18.4);
  const cBase = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.9, 1.55), stoneTrailMat);
  cBase.position.y = 0.45;
  chorten.add(cBase);
  const cDome = new THREE.Mesh(new THREE.SphereGeometry(0.58, 9, 7), snowMat);
  cDome.position.y = 1.25;
  chorten.add(cDome);
  const cSpire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.15, 6), lanternMat);
  cSpire.position.y = 2.25;
  chorten.add(cSpire);
  root.add(chorten);

  // Readable Wooden Base-Camp Trail Signpost (`EVEREST BASE CAMP • 5,364m`) + Warm Expedition Lanterns
  const signTex = createEverestSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex ?? undefined,
    color: 0xffffff,
    roughness: 0.78,
  });
  [
    [-6.4, -18.4, 3.85],
    [6.4, -18.4, 3.85],
    [-2.6, -26.5, 2.75],
    [3.8, -32.0, 2.75],
  ].forEach(([px, pz, postH], idx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, postH, 7), woodMat);
    post.position.set(px, postH * 0.5, pz);
    root.add(post);
    if (idx === 1) {
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.68, 0.08), signMat);
      signBoard.position.set(px - 0.35, 2.05, pz + 0.06);
      signBoard.rotation.y = -0.18;
      root.add(signBoard);
    }
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.28, 6), lanternMat);
    lantern.position.set(px, postH, pz);
    root.add(lantern);
  });

  // Fluttering Colorful Tibetan Prayer Flag Lines anchored overhead so Everest's central summit stays cleanly framed!
  const flagColors = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];
  const prayerFlags: Array<{ mesh: THREE.Mesh; baseRotX: number; phase: number }> = [];
  const lineRuns: Array<[THREE.Vector3, THREE.Vector3]> = [
    [new THREE.Vector3(-6.4, 3.68, -18.4), new THREE.Vector3(6.4, 3.68, -18.4)],
    [new THREE.Vector3(-6.4, 3.2, -18.4), new THREE.Vector3(-2.6, 2.52, -26.5)],
    [new THREE.Vector3(6.4, 3.2, -18.4), new THREE.Vector3(3.8, 2.52, -32.0)],
  ];
  const ropeMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
  const flagGeo = new THREE.PlaneGeometry(0.36, 0.44);

  lineRuns.forEach(([a, b], runIdx) => {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mid.y -= runIdx === 0 ? 0.28 : 0.38;
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
      flag.position.set(pt.x, pt.y - 0.22, pt.z);
      root.add(flag);
      prayerFlags.push({ mesh: flag, baseRotX: 0.14, phase: f * 0.7 + runIdx * 1.9 });
    }
  });

  // Massive Jagged Snow-and-Slate Mt. Everest Summit Pyramid + Flanking Himalayan Peaks
  const everestGroup = new THREE.Group();
  everestGroup.position.set(0, 0, -96);

  const mainSlate = new THREE.Mesh(new THREE.ConeGeometry(42, 56, 5), slateMat);
  mainSlate.position.set(0, 26, 0);
  mainSlate.rotation.y = 0.35;
  everestGroup.add(mainSlate);

  const mainSnow = new THREE.Mesh(new THREE.ConeGeometry(34, 50, 5), snowMat);
  mainSnow.position.set(-1.5, 29, 3.5);
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

  // Animated wind-blown Summit Spindrift Snow particle stream (THREE.Points!)
  const spinCount = 95;
  const spinPos = new Float32Array(spinCount * 3);
  for (let i = 0; i < spinCount; i++) {
    const t = i / spinCount;
    spinPos[i * 3] = t * 36;
    spinPos[i * 3 + 1] = 52.5 + Math.sin(t * Math.PI) * 2.4 - t * 3.8 + (Math.random() - 0.5) * 1.6;
    spinPos[i * 3 + 2] = 2 + (Math.random() - 0.5) * 3.5;
  }
  const spinGeo = new THREE.BufferGeometry();
  spinGeo.setAttribute('position', new THREE.BufferAttribute(spinPos, 3));
  const spinMat = new THREE.PointsMaterial({
    size: 4.8,
    color: 0xe0f2fe,
    map: getSharedGlowSpriteTexture(),
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  everestGroup.add(new THREE.Points(spinGeo, spinMat));
  root.add(everestGroup);

  // Multi-tier Snow-Dusted Himalayan Conifers framing the base-camp trail margins
  const firMatA = new THREE.MeshStandardMaterial({ color: 0x264f43, roughness: 0.88 });
  const firMatB = new THREE.MeshStandardMaterial({ color: 0x316354, roughness: 0.86 });
  const firSpots: Array<[number, number, number]> = [
    [-14.5, -21.5, 1.08], [-11.5, -27.5, 0.96], [-19.5, -29.5, 1.2], [-15.0, -35.0, 1.12],
    [13.8, -21.5, 1.02], [17.2, -28.0, 1.15], [11.2, -31.5, 0.98], [20.5, -33.5, 1.24],
    [-23.0, -23.5, 1.15], [23.5, -24.0, 1.12],
  ];
  const firTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.17, 2.3, 6),
    woodMat,
    firSpots.length
  );
  const firLower = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.4, 2.9, 7),
    firMatA,
    firSpots.length
  );
  const firUpper = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.05, 2.6, 7),
    firMatB,
    firSpots.length
  );
  const firSnow = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.78, 1.8, 7),
    snowMat,
    firSpots.length
  );
  firSpots.forEach(([fx, fz, sc], idx) => {
    dummy.position.set(fx, 1.0 * sc, fz);
    dummy.rotation.set(0, idx * 0.8, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    firTrunks.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(fx, 2.75 * sc, fz);
    dummy.updateMatrix();
    firLower.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(fx, 4.1 * sc, fz);
    dummy.updateMatrix();
    firUpper.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(fx, 4.8 * sc, fz);
    dummy.updateMatrix();
    firSnow.setMatrixAt(idx, dummy.matrix);
  });
  firTrunks.instanceMatrix.needsUpdate = true;
  firLower.instanceMatrix.needsUpdate = true;
  firUpper.instanceMatrix.needsUpdate = true;
  firSnow.instanceMatrix.needsUpdate = true;
  root.add(firTrunks, firLower, firUpper, firSnow);

  // === BASE-CAMP HAPPENINGS: Articulated Climbers at Expedition Map Table, Glowing Camp Brazier + Embers, Ice Axes/Ladders, Himalayan Yak, Khumbu Icefall Seracs & Night Ridge Headlamps ===

  // 1. Wooden Expedition Map Table + 2 Articulated Full-Rigged Mountaineers planning summit route
  const mapTableGroup = new THREE.Group();
  mapTableGroup.position.set(-4.8, 0, -21.2);
  const tblTop = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 0.92), woodMat);
  tblTop.position.y = 0.84;
  mapTableGroup.add(tblTop);
  [
    [-0.65, -0.35],
    [0.65, -0.35],
    [-0.65, 0.35],
    [0.65, 0.35],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.84, 0.08), woodMat);
    leg.position.set(lx, 0.42, lz);
    mapTableGroup.add(leg);
  });
  const mapSheet = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 0.68),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 })
  );
  mapSheet.rotation.x = -Math.PI / 2;
  mapSheet.position.set(0, 0.89, 0);
  mapTableGroup.add(mapSheet);
  const tableLantern = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 6), lanternMat);
  tableLantern.position.set(0.56, 0.99, -0.22);
  mapTableGroup.add(tableLantern);
  root.add(mapTableGroup);

  interface BaseCampClimber {
    group: THREE.Group;
    headGroup: THREE.Group;
    rightArm: THREE.Group;
    phase: number;
  }
  const climbers: BaseCampClimber[] = [];
  const climberSkinMat = new THREE.MeshStandardMaterial({ color: 0xdcb092, roughness: 0.72 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
  const goggleMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.18, metalness: 0.7 });
  [
    { x: -5.45, z: -20.55, ry: 0.65, parka: 0xdc2626, pants: 0x1e293b, helmet: 0xfacc15 },
    { x: -4.15, z: -20.6, ry: -0.7, parka: 0x2563eb, pants: 0x334155, helmet: 0xf97316 },
  ].forEach((cl, idx) => {
    const cg = new THREE.Group();
    const parkaMat = new THREE.MeshStandardMaterial({ color: cl.parka, roughness: 0.72 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: cl.pants, roughness: 0.82 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: cl.helmet, roughness: 0.42 });

    // Separate insulated legs + crampon boots
    [-0.11, 0.11].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.068, 0.72, 7), pantsMat);
      leg.position.set(lx, 0.4, 0);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.24), bootMat);
      boot.position.set(lx, 0.055, 0.04);
      cg.add(leg, boot);
    });
    // Insulated down puffer parka torso + climbing pack
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.3), parkaMat);
    torso.position.y = 1.04;
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 0.18), crateMat);
    pack.position.set(0, 1.08, -0.22);
    cg.add(torso, pack);

    // Separate articulated arms leaning toward the map table
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.28, 1.24, 0);
    const lUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.06, 0.48, 7), parkaMat);
    lUpper.position.y = -0.22;
    const lGlove = new THREE.Mesh(new THREE.SphereGeometry(0.062, 6, 5), bootMat);
    lGlove.position.y = -0.48;
    leftArm.add(lUpper, lGlove);
    leftArm.rotation.x = -0.58;
    cg.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.28, 1.24, 0);
    const rUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.06, 0.48, 7), parkaMat);
    rUpper.position.y = -0.22;
    const rGlove = new THREE.Mesh(new THREE.SphereGeometry(0.062, 6, 5), bootMat);
    rGlove.position.y = -0.48;
    rightArm.add(rUpper, rGlove);
    rightArm.rotation.x = -0.82;
    cg.add(rightArm);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.38, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 9, 8), climberSkinMat);
    head.position.y = 0.12;
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.168, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.58),
      helmetMat
    );
    helmet.position.y = 0.14;
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.08), goggleMat);
    goggles.position.set(0, 0.15, 0.13);
    headGroup.add(head, helmet, goggles);
    cg.add(headGroup);

    cg.position.set(cl.x, 0, cl.z);
    cg.rotation.y = cl.ry;
    root.add(cg);
    climbers.push({ group: cg, headGroup, rightArm, phase: idx * 2.3 });
  });

  // 2. Glowing Expedition Camp Brazier / Firepit with Flickering Coals + Animated Rising Orange Ember Sparks
  const fireGroup = new THREE.Group();
  fireGroup.position.set(5.4, 0, -21.0);
  for (let s = 0; s < 10; s++) {
    const a = (s / 10) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), slateMat);
    rock.position.set(Math.cos(a) * 0.68, 0.14, Math.sin(a) * 0.68);
    fireGroup.add(rock);
  }
  const emberCoreMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 2.2,
    roughness: 0.4,
  });
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.88,
  });
  const coalBed = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.18, 9), emberCoreMat);
  coalBed.position.y = 0.1;
  const flameCone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.72, 6), flameMat);
  flameCone.position.y = 0.48;
  fireGroup.add(coalBed, flameCone);
  // 2 timber camp log seats beside the brazier
  [
    { x: -1.35, z: 0.45, ry: 0.45 },
    { x: 1.35, z: 0.35, ry: -0.55 },
  ].forEach((lg) => {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.35, 7), woodMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = lg.ry;
    log.position.set(lg.x, 0.19, lg.z);
    fireGroup.add(log);
  });
  root.add(fireGroup);

  const emberCount = 42;
  const emberPos = new Float32Array(emberCount * 3);
  for (let i = 0; i < emberCount; i++) {
    emberPos[i * 3] = 5.4 + (Math.random() - 0.5) * 0.7;
    emberPos[i * 3 + 1] = 0.35 + Math.random() * 2.8;
    emberPos[i * 3 + 2] = -21.0 + (Math.random() - 0.5) * 0.7;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberMat = new THREE.PointsMaterial({
    size: 0.26,
    color: 0xfb923c,
    map: getSharedGlowSpriteTexture(),
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  root.add(new THREE.Points(emberGeo, emberMat));

  // 3. Expedition Aluminum Crevasse Climbing Ladder, Crossed Ice Axes & Stacked Gear Duffels
  const aluMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.32, metalness: 0.8 });
  const duffelMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.8 });
  const ladder = new THREE.Group();
  ladder.position.set(8.2, 0.08, -20.8);
  ladder.rotation.y = -0.35;
  [-0.22, 0.22].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 2.8), aluMat);
    rail.position.x = rx;
    ladder.add(rail);
  });
  for (let r = -5; r <= 5; r++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 5), aluMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.z = r * 0.25;
    ladder.add(rung);
  }
  root.add(ladder);

  // Stacked bright expedition duffels + crossed ice axes planted in snow
  const duffel1 = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.36, 0.42), duffelMat);
  duffel1.position.set(-8.2, 0.18, -20.4);
  duffel1.rotation.y = 0.25;
  const duffel2 = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.32, 0.38), tentYellowMat);
  duffel2.position.set(-8.1, 0.5, -20.45);
  duffel2.rotation.y = -0.18;
  root.add(duffel1, duffel2);
  [-1, 1].forEach((side) => {
    const axe = new THREE.Group();
    axe.position.set(-7.35, 0.48, -20.3);
    axe.rotation.z = side * 0.28;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.92, 5), aluMat);
    const pick = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.03), slateMat);
    pick.position.y = 0.44;
    axe.add(shaft, pick);
    root.add(axe);
  });

  // 4. Friendly Low-Poly Himalayan Yak standing beside a timber hitching post!
  const yakGroup = new THREE.Group();
  yakGroup.position.set(-12.6, 0, -19.8);
  yakGroup.rotation.y = 0.52;
  const yakFurMat = new THREE.MeshStandardMaterial({ color: 0x2b211b, roughness: 0.94 });
  const yakHornMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.6 });
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.85 });
  const saddleTrimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.82 });

  // Yak legs
  [
    [-0.26, -0.48],
    [0.26, -0.48],
    [-0.26, 0.45],
    [0.26, 0.45],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.68, 6), yakFurMat);
    leg.position.set(lx, 0.34, lz);
    yakGroup.add(leg);
  });
  // Shaggy torso + shoulder hump + colorful Tibetan woven pack blanket + twin panniers
  const yakBody = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.68, 1.48), yakFurMat);
  yakBody.position.set(0, 0.92, 0);
  const yakHump = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), yakFurMat);
  yakHump.position.set(0, 1.28, 0.32);
  const yakBlanket = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.42, 0.78), blanketMat);
  yakBlanket.position.set(0, 1.02, -0.04);
  const yakTrim = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.8), saddleTrimMat);
  yakTrim.position.set(0, 0.84, -0.04);
  [-0.5, 0.5].forEach((px) => {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.58), crateMat);
    pack.position.set(px, 0.98, -0.05);
    yakGroup.add(pack);
  });
  const yakHeadGroup = new THREE.Group();
  yakHeadGroup.position.set(0, 1.08, 0.78);
  const yakHead = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.46), yakFurMat);
  yakHead.position.set(0, -0.05, 0.14);
  [-1, 1].forEach((side) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.42, 6), yakHornMat);
    horn.position.set(side * 0.26, 0.18, 0.14);
    horn.rotation.z = -side * 0.65;
    horn.rotation.x = 0.25;
    yakHeadGroup.add(horn);
  });
  yakHeadGroup.add(yakHead);
  yakGroup.add(yakBody, yakHump, yakBlanket, yakTrim, yakHeadGroup);
  root.add(yakGroup);

  // Hitching post beside the Yak
  const hitchPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.15, 6), woodMat);
  hitchPost.position.set(-11.4, 0.57, -18.8);
  root.add(hitchPost);

  // 5. Distant Snow-Covered Himalayan Alpine Conifer Forest Belt spanning continuously across the base of all 3 peaks!
  // Replaces the awkward scattered pale triangles with a lush far-away pine tree line tinted in cool atmospheric blue-white haze.
  const distantFoothillGeo = new THREE.PlaneGeometry(188, 26, 24, 5);
  distantFoothillGeo.rotateX(-Math.PI / 2);
  const dfPos = distantFoothillGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < dfPos.count; i++) {
    const vx = dfPos.getX(i);
    const vz = dfPos.getZ(i); // +13 (closer) .. -13 (mountain foot)
    const t = Math.max(0, Math.min(1, (13 - vz) / 26));
    const hillY = t * 4.2 + Math.sin(vx * 0.08 + t * 2.4) * 1.15 * Math.sin(t * Math.PI);
    dfPos.setY(i, hillY);
  }
  distantFoothillGeo.translate(0, -0.05, -66.0);
  distantFoothillGeo.computeVertexNormals();
  const distantFoothillMesh = new THREE.Mesh(
    distantFoothillGeo,
    new THREE.MeshStandardMaterial({ color: 0xcbdff0, roughness: 0.9, flatShading: true })
  );
  distantFoothillMesh.userData.alwaysVisibleBackdrop = true;
  root.add(distantFoothillMesh);

  const farWoodsCount = 240;
  const farPineMat = new THREE.MeshStandardMaterial({
    color: 0x3b5968, // Cool atmospheric blue-tinted distant evergreen pine
    roughness: 0.9,
    flatShading: true,
  });
  const farSnowCapMat = new THREE.MeshStandardMaterial({
    color: 0xdcebf7, // Soft cool distance-tinted snow blankets on distant pine crowns
    roughness: 0.88,
    flatShading: true,
  });
  const farPineInst = new THREE.InstancedMesh(new THREE.ConeGeometry(1.1, 3.6, 5), farPineMat, farWoodsCount);
  const farSnowInst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.84, 2.25, 5), farSnowCapMat, farWoodsCount);
  for (let i = 0; i < farWoodsCount; i++) {
    const h1 = Math.abs(Math.sin(i * 12.9898 + 2.3) * 43758.5453) % 1;
    const h2 = Math.abs(Math.cos(i * 78.233 + 1.1) * 19341.23) % 1;
    const h3 = Math.abs(Math.sin(i * 45.164 + 4.7) * 28461.17) % 1;
    // Span continuously from x = -86 to +86 across left Nuptse, central Everest, and right Lhotse bases
    const tx = -86 + (i / (farWoodsCount - 1)) * 172 + (h1 - 0.5) * 4.5;
    const tz = -54.5 - h2 * 22.0;
    const depthFrac = Math.max(0, Math.min(1, (-53.0 - tz) / 26.0));
    const groundY = depthFrac * 4.2 + Math.sin(tx * 0.08 + depthFrac * 2.4) * 1.15 * Math.sin(depthFrac * Math.PI);
    // Keep miniature distant scale (0.58..1.05) so the 3 peaks tower dramatically above the tree line
    const sc = (0.58 + h3 * 0.44) * (1.0 - depthFrac * 0.22);

    dummy.position.set(tx, groundY + 1.55 * sc, tz);
    dummy.rotation.set(0, h1 * Math.PI * 2, 0);
    dummy.scale.set(sc * 1.12, sc, sc * 1.12);
    dummy.updateMatrix();
    farPineInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tx, groundY + 2.35 * sc, tz);
    dummy.scale.set(sc * 1.06, sc, sc * 1.06);
    dummy.updateMatrix();
    farSnowInst.setMatrixAt(i, dummy.matrix);
  }
  farPineInst.instanceMatrix.needsUpdate = true;
  farSnowInst.instanceMatrix.needsUpdate = true;
  farPineInst.userData.alwaysVisibleBackdrop = true;
  farSnowInst.userData.alwaysVisibleBackdrop = true;
  root.add(farPineInst, farSnowInst);

  // 6. Distant Twinkling Night Ridge Climber Headlamp Dots ascending Everest's Southeast Ridge!
  const headlampCount = 14;
  const headlampPos = new Float32Array(headlampCount * 3);
  for (let i = 0; i < headlampCount; i++) {
    const t = i / (headlampCount - 1);
    headlampPos[i * 3] = 24 - t * 23 + Math.sin(t * 9) * 0.9;
    headlampPos[i * 3 + 1] = 16 + t * 34;
    headlampPos[i * 3 + 2] = -76 - t * 14;
  }
  const headlampGeo = new THREE.BufferGeometry();
  headlampGeo.setAttribute('position', new THREE.BufferAttribute(headlampPos, 3));
  const headlampMat = new THREE.PointsMaterial({
    size: 1.15,
    color: 0xfef9c3,
    map: getSharedGlowSpriteTexture(),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  root.add(new THREE.Points(headlampGeo, headlampMat));

  const ctx = addSurrounding360Context(root, 'mt_everest');
  disableShadowsRecursive(root);

  return {
    id: 'mt_everest',
    root,
    envHint: {
      fogColorDay: 0xdceeff,
      fogColorNight: 0x0b162a,
      fogDensityScale: 0.7,
      sunColorOverride: 0xdceeff,
      alwaysWinter: true,
    },
    update: (dt, elapsed, isNight, climateState) => {
      ctx.update(isNight, climateState, elapsed);
      lanternMat.emissiveIntensity = isNight ? 2.2 : 1.15;
      tentYellowMat.emissiveIntensity = isNight ? 0.72 : 0.14;
      tentOrangeMat.emissiveIntensity = isNight ? 0.72 : 0.14;

      // Flickering expedition camp brazier & rising orange ember sparks
      const flicker = 1 + Math.sin(elapsed * 11.5) * 0.16 + Math.cos(elapsed * 7.2) * 0.1;
      emberCoreMat.emissiveIntensity = (isNight ? 2.8 : 1.85) * flicker;
      flameCone.scale.set(0.95 + Math.sin(elapsed * 9) * 0.1, flicker, 0.95 + Math.cos(elapsed * 8) * 0.1);
      const eAttr = emberGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < emberCount; i++) {
        let ey = eAttr.getY(i) + dt * (0.95 + (i % 4) * 0.25);
        let ex = eAttr.getX(i) + Math.sin(elapsed * 2.8 + i) * dt * 0.22;
        if (ey > 3.2) {
          ey = 0.35;
          ex = 5.4 + (((i * 13) % 10) - 5) * 0.08;
        }
        eAttr.setXY(i, ex, ey);
      }
      eAttr.needsUpdate = true;

      // Animated climbers pointing over map & Yak gentle grazing head nod
      for (const cl of climbers) {
        cl.headGroup.rotation.y = Math.sin(elapsed * 0.9 + cl.phase) * 0.24;
        cl.headGroup.rotation.x = 0.22 + Math.sin(elapsed * 1.4 + cl.phase) * 0.06;
        cl.rightArm.rotation.x = -0.82 + Math.sin(elapsed * 1.8 + cl.phase) * 0.14;
      }
      yakHeadGroup.rotation.x = Math.sin(elapsed * 0.85) * 0.16;
      yakHeadGroup.rotation.y = Math.cos(elapsed * 0.5) * 0.12;

      // Distant summit-push climber headlamps twinkle gently on the ridge at night
      headlampMat.opacity = isNight ? 0.75 + Math.sin(elapsed * 2.2) * 0.18 : 0.0;

      // Stream spindrift snow off Everest's summit in the high-altitude jet stream
      const attr = spinGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < spinCount; i++) {
        let sx = attr.getX(i) + dt * (6.2 + (i % 4) * 1.4);
        let sy = attr.getY(i) - dt * 0.45 + Math.sin(elapsed * 2.5 + i) * dt * 0.5;
        if (sx > 38) {
          sx = -0.5 + (i % 3) * 0.6;
          sy = 52.8 + ((i % 5) - 2) * 0.5;
        }
        attr.setXY(i, sx, sy);
      }
      attr.needsUpdate = true;

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
