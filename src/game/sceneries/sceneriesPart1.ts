import * as THREE from 'three';
import {
  SceneryRuntimeInstance,
  createDioramaBase,
  disableShadowsRecursive,
  getSharedGlowSpriteTexture,
} from './sceneryTypes';
import {
  addSurrounding360Context,
  createAnimatedDoorwayCluster,
  createProceduralFacadeTextures,
} from './surroundingContext';
import {
  FAVELA_STAIR_END_Z,
  FAVELA_STAIR_START_Z,
  FAVELA_STAIR_STEP_COUNT,
  FAVELA_STAIR_TREAD_DEPTH,
  FAVELA_STAIR_TREAD_HEIGHT,
  FAVELA_STAIR_TREAD_Y_OFFSET,
  FAVELA_UPPER_CURVE_STEP_COUNT,
  computeFavelaHouseFloorY,
  evaluateCornerTurnPath,
  evaluateFavelaAlleyLifecycle,
  getFavelaHillHeight,
  getFavelaStairCenterX,
  getFavelaUpperCurveDir,
} from '../outdoorLod';
import { computeArticulatedWalkGait } from '../npcPhysicsAndSteering';
import {
  COASTAL_SIERRA,
  MAYON_FOOTHILLS,
  createMountainRibbonMesh,
  createRidgedPeakMesh,
  createSharedMountainMaterial,
  resolveMountainGraphicsTier,
} from './mountainRanges';
import {
  getCagsawaRuinStoneTexture,
  getHilltopUrbanLandmassTexture,
} from './mountainTextures';
import { createMayonOverlookLife } from './mayonOverlookLife';
import { createBrazilianStreetDancerRig } from '../brazilianLRLRLRLRDance';
import {
  type ArticulatedOutdoorNpcRig,
  type KyotoCyclistInstance,
  createArticulatedOutdoorNpc,
  createKyotoCyclist,
  updateArticulatedNpcPose,
  updateKyotoCyclist,
} from '../outdoorNpcRig';

function createMayonAsphaltTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Sun-baked tropical Bicol asphalt base
  ctx.fillStyle = '#383d45';
  ctx.fillRect(0, 0, w, h);

  // Subtle darker tire-wear wheel tracks
  ctx.fillStyle = 'rgba(24, 27, 32, 0.24)';
  ctx.fillRect(0, 44, w, 26);
  ctx.fillRect(0, 92, w, 24);
  ctx.fillRect(0, 144, w, 24);
  ctx.fillRect(0, 188, w, 26);

  // Fine mineral aggregate stone speckles (deterministic hash)
  for (let i = 0; i < 620; i++) {
    const px = ((i * 73 + 19) % w);
    const py = ((i * 131 + 47) % h);
    const bright = (i % 3) === 0;
    ctx.fillStyle = bright ? 'rgba(215, 218, 224, 0.14)' : 'rgba(18, 20, 24, 0.18)';
    ctx.fillRect(px, py, 2, 2);
  }

  // Concrete/asphalt expansion seams
  ctx.strokeStyle = 'rgba(22, 25, 30, 0.32)';
  ctx.lineWidth = 2;
  for (let sx = 64; sx < w; sx += 128) {
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
  }

  // Faded tropical shoulder edge lines + dashed center divider
  ctx.fillStyle = 'rgba(241, 245, 249, 0.34)';
  ctx.fillRect(0, 10, w, 4);
  ctx.fillRect(0, h - 14, w, 4);
  ctx.fillStyle = 'rgba(250, 204, 21, 0.42)';
  for (let dx = 12; dx < w; dx += 48) {
    ctx.fillRect(dx, h / 2 - 2, 24, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { ownedByScenery: true };
  return tex;
}

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

    const animatedDoorIndices = new Set([1, 2, 4, 5]);
    if (!animatedDoorIndices.has(bIdx)) {
      const shopDoor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.72, 0.08), doorWoodMat);
      shopDoor.position.set(b.w * 0.3, 0.9, b.d / 2 + 0.03);
      bGroup.add(shopDoor);

      const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.78), windowWarmMat);
      doorGlass.position.set(b.w * 0.3, 1.24, b.d / 2 + 0.078);
      bGroup.add(doorGlass);
    }

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

  // Curbside Street Furniture: Cast-Iron Fire Hydrant, Postal Mailbox & Metal Bike Rack with Bicycles
  const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42, metalness: 0.35 });
  const hydrant = new THREE.Group();
  hydrant.position.set(-14.6, 0, -16.62);
  const hBody = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.64, 8), hydrantMat);
  hBody.position.y = 0.32;
  const hCap = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 6), hydrantMat);
  hCap.position.y = 0.64;
  const hNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 6), hydrantMat);
  hNozzle.rotation.z = Math.PI / 2;
  hNozzle.position.y = 0.48;
  hydrant.add(hBody, hCap, hNozzle);
  root.add(hydrant);

  const mailboxMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.48, metalness: 0.35 });
  const mailbox = new THREE.Group();
  mailbox.position.set(1.85, 0, -16.82);
  const mbLegs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.38), darkSteelMat);
  mbLegs.position.y = 0.17;
  const mbBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.72, 0.44), mailboxMat);
  mbBox.position.y = 0.68;
  const mbTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.48, 10, 1, false, 0, Math.PI), mailboxMat);
  mbTop.rotation.z = Math.PI / 2;
  mbTop.position.y = 1.04;
  const mbSlot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.08), darkSteelMat);
  mbSlot.position.set(0, 0.96, 0.21);
  mailbox.add(mbLegs, mbBox, mbTop, mbSlot);
  root.add(mailbox);

  // Metal Bike Rack with 2 parked commuter bicycles on far sidewalk
  const rackGroup = new THREE.Group();
  rackGroup.position.set(12.2, 0, -16.85);
  const rackRail = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 0.46), darkSteelMat);
  rackRail.position.y = 0.04;
  rackGroup.add(rackRail);
  [-0.72, 0, 0.72].forEach((hx) => {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.024, 6, 12, Math.PI), darkSteelMat);
    hoop.position.set(hx, 0.32, 0);
    rackGroup.add(hoop);
  });
  const bikeColors = [0x0f766e, 0xd97706];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
  [-0.42, 0.45].forEach((bx, bIdx) => {
    const bike = new THREE.Group();
    bike.position.set(bx, 0, 0.06);
    bike.rotation.y = bIdx === 0 ? 0.16 : -0.18;
    const frameMat = new THREE.MeshStandardMaterial({ color: bikeColors[bIdx], roughness: 0.38, metalness: 0.45 });
    [-0.38, 0.38].forEach((wz) => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.032, 6, 12), tireMat);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.25, wz);
      bike.add(wheel);
    });
    const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 6), frameMat);
    topTube.rotation.x = Math.PI / 2;
    topTube.position.set(0, 0.56, 0);
    const seatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), frameMat);
    seatPost.position.set(0, 0.48, -0.22);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 6), frameMat);
    stem.position.set(0, 0.54, 0.28);
    const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.4, 6), darkSteelMat);
    handleBar.rotation.z = Math.PI / 2;
    handleBar.position.set(0, 0.76, 0.28);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.19), tireMat);
    saddle.position.set(0, 0.71, -0.24);
    bike.add(topTube, seatPost, stem, handleBar, saddle);
    rackGroup.add(bike);
  });
  root.add(rackGroup);

  // Backlit Neighborhood Storefront Marquee Fascia Signs (24H MART / BAKERY / VINYL)
  const marqueeSpecs = [
    { x: -13.6, label: '24H MART', bg: '#065f46', fg: '#ecfdf5', glow: 0x34d399 },
    { x: -3.2, label: 'BAKERY', bg: '#7c2d12', fg: '#fef3c7', glow: 0xfbbf24 },
    { x: 7.2, label: 'VINYL', bg: '#1e3a8a', fg: '#e0f2fe', glow: 0x38bdf8 },
  ];
  const marqueeMats: THREE.MeshStandardMaterial[] = [];
  marqueeSpecs.forEach((ms) => {
    let tex: THREE.CanvasTexture | null = null;
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 64;
      const g = c.getContext('2d');
      if (g) {
        g.fillStyle = ms.bg;
        g.fillRect(0, 0, 256, 64);
        g.strokeStyle = ms.fg;
        g.lineWidth = 4;
        g.strokeRect(5, 5, 246, 54);
        g.fillStyle = ms.fg;
        g.font = '800 32px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(ms.label, 128, 34);
        tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
      }
    }
    const mMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex ?? undefined,
      emissive: ms.glow,
      emissiveMap: tex ?? undefined,
      emissiveIntensity: 0.45,
      roughness: 0.3,
    });
    marqueeMats.push(mMat);
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.56, 0.14), mMat);
    board.position.set(ms.x, 2.58, -18.08);
    root.add(board);
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

  // Phase 3: Animated across-the-street hinged storefront entrances + outdoor NPCs (skipped indoors)
  const acrossDoorPlacements = [1, 2, 4, 5].map((idx) => {
    const b = storefrontSpecs[idx];
    return {
      x: b.x + b.w * 0.3,
      z: -18.2,
      facingZ: 1 as const,
      width: 0.96,
      height: 1.92,
      seed: idx * 7 + 3,
    };
  });
  const acrossDoors = createAnimatedDoorwayCluster(
    'busy_street',
    'hinged_shop',
    acrossDoorPlacements
  );
  root.add(acrossDoors.group);

  const ctx = addSurrounding360Context(root, 'busy_street');
  disableShadowsRecursive(root);

  return {
    id: 'busy_street',
    root,
    doorways: [...acrossDoors.anchors, ...ctx.doorways],
    envHint: {},
    update: (dt, elapsed, isNight, climateState, weather, isPlayerOutside) => {
      const outside = isPlayerOutside ?? true;
      const isRaining = weather.startsWith('rainy');
      ctx.update(isNight, climateState, elapsed, dt, isRaining, outside);
      acrossDoors.update(dt, elapsed, isNight, isRaining, outside);
      windowWarmMat.emissiveIntensity = isNight ? 1.55 : 0.16;
      windowCoolMat.emissiveIntensity = isNight ? 1.15 : 0.12;
      signEmissiveMat.emissiveIntensity = isNight ? 1.95 : 0.55;
      signCyanMat.emissiveIntensity = isNight ? 1.8 : 0.45;
      posterMat.emissiveIntensity = isNight ? 1.1 : 0.35;
      farSkyMat.emissiveIntensity = isNight ? 1.35 : 0.08;
      for (let i = 0; i < marqueeMats.length; i++) {
        marqueeMats[i].emissiveIntensity = isNight ? 1.45 : 0.38;
      }
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

  // Phase 5: Procedural weathered asphalt/concrete foreground road overlay (aggregate grain, tire wear, lane lines)
  const mayonRoadTex = createMayonAsphaltTexture();
  if (mayonRoadTex) {
    const mayonRoadMat = new THREE.MeshStandardMaterial({
      map: mayonRoadTex,
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mayonRoadOverlay = new THREE.Mesh(new THREE.PlaneGeometry(75.4, 12.2), mayonRoadMat);
    mayonRoadOverlay.rotation.x = -Math.PI / 2;
    mayonRoadOverlay.position.set(0, 0.068, -12.6);
    root.add(mayonRoadOverlay);
  }

  // Phase 5 & 7: Outdoor-only animated detail group (culled + skipped indoors for locked cafe FPS)
  const outdoorOnlyGroup = new THREE.Group();
  outdoorOnlyGroup.name = 'mayon_outdoor_only';
  outdoorOnlyGroup.userData.outdoorOnly = true;
  outdoorOnlyGroup.userData.noMerge = true;
  outdoorOnlyGroup.userData.skipStaticBatch = true;
  root.add(outdoorOnlyGroup);

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

  // Phase 4: Window-visible backdrop group containing Mayon Volcano & rolling tropical MAYON_FOOTHILLS ribbons
  const windowBackdropGroup = new THREE.Group();
  windowBackdropGroup.name = 'mayon_window_backdrop';
  windowBackdropGroup.userData.alwaysVisibleBackdrop = true;
  root.add(windowBackdropGroup);

  // Replace sharp flanking cones with rolling tropical MAYON_FOOTHILLS ridge ribbons (Mayon Volcano cone stays untouched!)
  const mayonTier = resolveMountainGraphicsTier();
  const mayonFoothillMat = createSharedMountainMaterial('highland', mayonTier);
  const leftFoothills = createMountainRibbonMesh(
    {
      seed: 101,
      arcRadius: 82,
      startAngle: -1.16,
      endAngle: -0.34,
      depth: 26,
      peakCount: 4,
      minPeakHeight: 4.8,
      maxPeakHeight: 11.2,
      baseY: -0.25,
      skirtFloorY: -10,
      palette: MAYON_FOOTHILLS,
      tier: mayonTier,
    },
    mayonFoothillMat,
    'mayon_foothills_left'
  );
  const rightFoothills = createMountainRibbonMesh(
    {
      seed: 207,
      arcRadius: 84,
      startAngle: 0.34,
      endAngle: 1.16,
      depth: 28,
      peakCount: 4,
      minPeakHeight: 5.0,
      maxPeakHeight: 11.8,
      baseY: -0.25,
      skirtFloorY: -10,
      palette: MAYON_FOOTHILLS,
      tier: mayonTier,
    },
    mayonFoothillMat,
    'mayon_foothills_right'
  );
  windowBackdropGroup.add(leftFoothills, rightFoothills);

  // Grand, monumental near-perfect symmetrical Mayon Volcano rising cleanly over the Bicol plains
  const mayonGroup = new THREE.Group();
  mayonGroup.position.set(-0.6, 0, -104);
  const profile = [
    new THREE.Vector2(54, 0),
    new THREE.Vector2(38, 7.8),
    new THREE.Vector2(24.5, 17.6),
    new THREE.Vector2(14.5, 28.5),
    new THREE.Vector2(7.6, 39.2),
    new THREE.Vector2(3.3, 47.4),
    new THREE.Vector2(2.2, 48.6),
    new THREE.Vector2(1.4, 47.6),
  ];
  const mayonGeo = new THREE.LatheGeometry(profile, 32);
  const posAttr = mayonGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const cBase = new THREE.Color(0x2d6130);
  const cMid = new THREE.Color(0x4a6048);
  const cSummit = new THREE.Color(0x5a514c);
  const tmpC = new THREE.Color();
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const ang = Math.atan2(vz, vx);
    // Subtle natural volcanic gully ridges running down the symmetrical cone
    const ridgeFactor = vy > 2 && vy < 46 ? 1 + Math.sin(ang * 14 + vy * 0.05) * 0.022 : 1;
    posAttr.setXYZ(i, vx * ridgeFactor, vy, vz * ridgeFactor);
    if (vy < 17) {
      tmpC.lerpColors(cBase, cMid, vy / 17);
    } else {
      tmpC.lerpColors(cMid, cSummit, Math.min(1, (vy - 17) / 31));
    }
    colors[i * 3] = tmpC.r;
    colors[i * 3 + 1] = tmpC.g;
    colors[i * 3 + 2] = tmpC.b;
  }
  mayonGeo.computeVertexNormals();
  mayonGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mayonMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    flatShading: true,
  });
  mayonGroup.add(new THREE.Mesh(mayonGeo, mayonMat));

  // Soft drifting cloud ring & gentle summit steam plume near Mayon's crater
  const cloudRing = new THREE.Group();
  cloudRing.position.set(0, 41.2, 0);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.95,
    transparent: true,
    opacity: 0.78,
  });
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(3.2 + (i % 3) * 0.95, 9, 7), cloudMat);
    puff.scale.set(1.85, 0.5, 1.35);
    puff.position.set(Math.cos(ang) * 9.2, (i % 2) * 1.2, Math.sin(ang) * 7.4);
    cloudRing.add(puff);
  }
  mayonGroup.add(cloudRing);
  mayonGroup.userData.alwaysVisibleBackdrop = true;
  windowBackdropGroup.add(mayonGroup);

  // Weathered volcanic-stone Cagsawa Church Belfry Ruin (textured ashlar stonework, basalt quoins, bell lintels & moss)
  const belfry = new THREE.Group();
  belfry.name = 'mayon_cagsawa_belfry_ruins';
  belfry.position.set(8.6, 0, -33.5);
  belfry.rotation.y = -0.22;
  const cagsawaTex = getCagsawaRuinStoneTexture();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: cagsawaTex.map ? 0xe6dfd3 : 0x7c7265,
    map: cagsawaTex.map,
    bumpMap: cagsawaTex.bumpMap,
    bumpScale: cagsawaTex.bumpScale,
    roughness: 0.96,
    metalness: 0.0,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x4b443c,
    bumpMap: cagsawaTex.bumpMap,
    bumpScale: 0.45,
    roughness: 0.96,
  });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x3b682e, roughness: 0.92 });
  const bellBronzeMat = new THREE.MeshStandardMaterial({ color: 0x5c4b2c, roughness: 0.58, metalness: 0.55 });

  // Grounded stone plinth & tiered weathered masonry tower
  const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(3.86, 0.55, 3.86), darkStoneMat);
  basePlinth.position.y = 0.27;
  belfry.add(basePlinth);
  const tier1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.6, 3.4), stoneMat);
  tier1.position.y = 1.8;
  belfry.add(tier1);
  const cornice1 = new THREE.Mesh(new THREE.BoxGeometry(3.82, 0.26, 3.82), darkStoneMat);
  cornice1.position.y = 3.62;
  belfry.add(cornice1);
  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.7, 2.7), stoneMat);
  tier2.position.y = 4.95;
  belfry.add(tier2);
  const cornice2 = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.22, 3.04), darkStoneMat);
  cornice2.position.y = 6.32;
  belfry.add(cornice2);
  const tier3 = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.9, 2.05), stoneMat);
  tier3.position.y = 7.25;
  belfry.add(tier3);
  const cornice3 = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.16, 2.26), darkStoneMat);
  cornice3.position.y = 8.18;
  belfry.add(cornice3);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    stoneMat
  );
  dome.position.y = 8.2;
  belfry.add(dome);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.14), darkStoneMat);
  crossV.position.y = 9.48;
  belfry.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.14), darkStoneMat);
  crossH.position.y = 9.63;
  belfry.add(crossH);

  // Corner basalt pilasters / quoins giving crisp architectural relief along tower edges
  [
    [-1.66, -1.66],
    [1.66, -1.66],
    [-1.66, 1.66],
    [1.66, 1.66],
  ].forEach(([qx, qz]) => {
    const quoin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.35, 0.24), darkStoneMat);
    quoin.position.set(qx, 1.92, qz);
    belfry.add(quoin);
  });

  // Crossed bell-tower arched voids with carved stone lintels & hanging weathered bronze bell
  const archVoidA = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.38, 2.86), darkStoneMat);
  archVoidA.position.y = 5.05;
  belfry.add(archVoidA);
  const archVoidB = new THREE.Mesh(new THREE.BoxGeometry(2.86, 1.38, 0.88), darkStoneMat);
  archVoidB.position.y = 5.05;
  belfry.add(archVoidB);
  const lintelFront = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.18, 2.94), stoneMat);
  lintelFront.position.y = 5.82;
  belfry.add(lintelFront);
  const bellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.44, 8), bellBronzeMat);
  bellBody.position.set(0, 5.18, 0);
  belfry.add(bellBody);

  // Crumbling stepped adobe facade wall + creeping moss strips + fallen volcanic stone rubble
  const ruinWall = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.45, 0.62), stoneMat);
  ruinWall.position.set(-3.5, 0.72, 0.4);
  belfry.add(ruinWall);
  const ruinWallStep = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.68, 0.58), stoneMat);
  ruinWallStep.position.set(-2.2, 1.68, 0.4);
  belfry.add(ruinWallStep);
  const mossPatch = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.22, 2.85), mossMat);
  mossPatch.position.y = 3.74;
  belfry.add(mossPatch);
  const wallMoss = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.16, 0.68), mossMat);
  wallMoss.position.set(-3.45, 1.48, 0.4);
  belfry.add(wallMoss);
  [
    [-5.8, 0.24, 0.65, 0.62, 0.48, 0.52],
    [-4.9, 0.18, 1.28, 0.46, 0.34, 0.42],
    [2.3, 0.22, 1.55, 0.54, 0.42, 0.48],
    [1.7, 0.16, 2.1, 0.38, 0.3, 0.36],
  ].forEach(([rx, ry, rz, rw, rh, rd], rIdx) => {
    const rubble = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), rIdx % 2 === 0 ? stoneMat : darkStoneMat);
    rubble.position.set(rx, ry, rz);
    rubble.rotation.y = rIdx * 0.65;
    belfry.add(rubble);
  });
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

  // Phase A: Articulated Bicol market stall vendors stationed behind EVERY souvenir stall (strict bone-parented salakot)
  interface BicolVendor {
    rig: ArticulatedOutdoorNpcRig;
    phase: number;
    baseRotY: number;
  }
  const vendors: BicolVendor[] = [];
  const salakotMat = new THREE.MeshStandardMaterial({ color: 0xc29252, roughness: 0.88 });
  const salakotGeo = new THREE.ConeGeometry(0.31, 0.18, 10);
  const vendorShirtHexes = [0x0ea5e9, 0xf97316, 0x16a34a, 0xe11d48];

  stallConfigs.forEach((sc, idx) => {
    const rig = createArticulatedOutdoorNpc({
      shirtHex: vendorShirtHexes[idx % vendorShirtHexes.length],
      pantsHex: 0x334155,
      skinHex: 0xd69f7e,
      hairHex: 0x1c1917,
      shoeHex: 0x451a03,
      apronHex: 0xfef3c7,
      hairStyle: idx % 2 === 0 ? 'short' : 'bun',
    });
    // Bone-parented traditional Bicol woven salakot hat
    const salakot = new THREE.Mesh(salakotGeo, salakotMat);
    salakot.position.y = 0.05;
    rig.slots.headwear.add(salakot);

    const backOffset = -0.44;
    const wx = sc.x + Math.sin(sc.rotY) * backOffset;
    const wz = sc.z + Math.cos(sc.rotY) * backOffset;
    rig.root.position.set(wx, 0.02, wz);
    rig.root.rotation.y = sc.rotY;
    outdoorOnlyGroup.add(rig.root);

    vendors.push({
      rig,
      phase: idx * 1.7 + 0.4,
      baseRotY: sc.rotY,
    });
  });

  // Phase 7: Living Overlook Crowds, Long-Duration (60-90s) Picnic Families & Rare L-Junction Pull-Over Car
  // Replaces all frozen tourists & walk-in-place stall customers while preserving the 4 animated Bicol market vendors above.
  const mayonOverlookLife = createMayonOverlookLife();
  outdoorOnlyGroup.add(mayonOverlookLife.group);

  // Single smooth continuous curved dirt-and-stone trail winding organically from viewing terrace past Cagsawa Ruins
  const trailMat = new THREE.MeshStandardMaterial({
    color: 0xb99b72,
    roughness: 0.94,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const trailCurbMat = new THREE.MeshStandardMaterial({
    color: 0x7c7465,
    roughness: 0.96,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const trailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.4, 0.028, -21.2),
    new THREE.Vector3(-2.1, 0.028, -26.8),
    new THREE.Vector3(0.4, 0.028, -32.6),
    new THREE.Vector3(1.5, 0.028, -38.8),
    new THREE.Vector3(-1.1, 0.028, -45.5),
    new THREE.Vector3(-2.6, 0.028, -52.5),
  ]);
  const buildTrailRibbon = (halfWidthStart: number, halfWidthEnd: number, yVal: number, segs: number) => {
    const pos: number[] = [];
    const norm: number[] = [];
    const indices: number[] = [];
    const p = new THREE.Vector3();
    const tang = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      trailCurve.getPoint(t, p);
      trailCurve.getTangent(t, tang);
      const rx = -tang.z;
      const rz = tang.x;
      const len = Math.hypot(rx, rz) || 1;
      const hw = halfWidthStart + (halfWidthEnd - halfWidthStart) * t;
      pos.push(p.x - (rx / len) * hw, yVal, p.z - (rz / len) * hw);
      pos.push(p.x + (rx / len) * hw, yVal, p.z + (rz / len) * hw);
      norm.push(0, 1, 0, 0, 1, 0);
      if (i < segs) {
        const b = i * 2;
        indices.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    g.setIndex(indices);
    return g;
  };
  const trailBorderRibbon = new THREE.Mesh(buildTrailRibbon(2.02, 1.32, 0.022, 28), trailCurbMat);
  const trailCenterRibbon = new THREE.Mesh(buildTrailRibbon(1.68, 1.04, 0.032, 28), trailMat);
  root.add(trailBorderRibbon, trailCenterRibbon);

  // Embedded river-stone stepping pavers following the curved trail (1 InstancedMesh)
  const paverCount = 26;
  const pavers = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.46, 0.04, 7), trailCurbMat, paverCount);
  const paverDummy = new THREE.Object3D();
  const paverPt = new THREE.Vector3();
  const paverTan = new THREE.Vector3();
  for (let i = 0; i < paverCount; i++) {
    const t = (i + 0.5) / paverCount;
    trailCurve.getPoint(t, paverPt);
    trailCurve.getTangent(t, paverTan);
    const sideOffset = (i % 2 === 0 ? -1 : 1) * 0.34;
    paverDummy.position.set(
      paverPt.x - paverTan.z * sideOffset,
      0.036,
      paverPt.z + paverTan.x * sideOffset
    );
    paverDummy.rotation.set(0, i * 1.1, 0);
    paverDummy.scale.set(0.92 + (i % 3) * 0.14, 1, 0.72 + (i % 2) * 0.18);
    paverDummy.updateMatrix();
    pavers.setMatrixAt(i, paverDummy.matrix);
  }
  pavers.instanceMatrix.needsUpdate = true;
  root.add(pavers);

  // Colorful Fiesta Banderitas (festive pennant strings across viewing plaza bamboo poles)
  const banderitaColors = [0xef4444, 0xfacc15, 0x3b82f6, 0x22c55e, 0xf97316, 0xec4899];
  const banderitaMats = banderitaColors.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, side: THREE.DoubleSide })
  );
  const wireMat = new THREE.LineBasicMaterial({ color: 0x4b5563 });
  const banderitaSpans: Array<[number, number, number, number]> = [
    [-14.2, -19.2, -6.2, -20.8],
    [6.0, -20.8, 14.0, -19.2],
  ];
  banderitaSpans.forEach(([x1, z1, x2, z2], sIdx) => {
    [
      [x1, z1],
      [x2, z2],
    ].forEach(([px, pz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.068, 3.6, 6), bambooMat);
      pole.position.set(px, 1.8, pz);
      root.add(pole);
    });
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const sag = Math.sin(t * Math.PI) * 0.42;
      pts.push(new THREE.Vector3(x1 + (x2 - x1) * t, 3.45 - sag, z1 + (z2 - z1) * t));
    }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    for (let k = 1; k < 10; k++) {
      const p = pts[k];
      const flag = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.34, 3),
        banderitaMats[(sIdx * 3 + k) % banderitaMats.length]
      );
      flag.rotation.x = Math.PI;
      flag.position.set(p.x, p.y - 0.18, p.z);
      root.add(flag);
    }
  });

  // Distant rural Bahay Kubo (stilt nipa-thatch provincial houses) & far market canopies across the Bicol plains
  const nipaMat = new THREE.MeshStandardMaterial({ color: 0x9a7b4f, roughness: 0.92 });
  const kuboWallMat = new THREE.MeshStandardMaterial({ color: 0xc29b61, roughness: 0.88 });
  const kuboWinMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.25,
  });
  const kuboLocations = [
    { x: -16.5, z: -36.5, s: 1.05, ry: 0.35 },
    { x: -10.8, z: -48.5, s: 0.9, ry: -0.22 },
    { x: 14.8, z: -45.5, s: 0.95, ry: -0.45 },
    { x: 20.5, z: -39.0, s: 1.0, ry: -0.3 },
    { x: -21.5, z: -53.0, s: 0.85, ry: 0.18 },
    { x: 24.0, z: -54.5, s: 0.88, ry: -0.25 },
  ];
  kuboLocations.forEach((kl) => {
    const kubo = new THREE.Group();
    kubo.position.set(kl.x, 0, kl.z);
    kubo.rotation.y = kl.ry;
    kubo.scale.setScalar(kl.s);
    // 4 bamboo stilts
    [
      [-0.95, -0.75],
      [0.95, -0.75],
      [-0.95, 0.75],
      [0.95, 0.75],
    ].forEach(([sx, sz]) => {
      const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.05, 5), bambooMat);
      stilt.position.set(sx, 0.52, sz);
      kubo.add(stilt);
    });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.45, 1.85), kuboWallMat);
    cabin.position.y = 1.65;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.52), kuboWinMat);
    win.position.set(0, 1.72, 0.94);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.15, 1.55, 4), nipaMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.12;
    kubo.add(cabin, win, roof);
    root.add(kubo);
  });

  // Distant miniature colorful souvenir canopies along the midground trail
  [
    { x: -5.4, z: -31.8, col: 0xdc2626 },
    { x: -8.6, z: -33.2, col: 0x0284c7 },
    { x: 4.4, z: -36.5, col: 0xeab308 },
    { x: 12.8, z: -34.2, col: 0x0d9488 },
  ].forEach((mc) => {
    const tent = new THREE.Group();
    tent.position.set(mc.x, 0, mc.z);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.45, 0.72, 4),
      new THREE.MeshStandardMaterial({ color: mc.col, roughness: 0.78 })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 1.72;
    tent.add(roof);
    const tbl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.65, 0.6), tableWoodMat);
    tbl.position.y = 0.33;
    tent.add(tbl);
    [
      [-0.82, -0.82],
      [0.82, -0.82],
      [-0.82, 0.82],
      [0.82, 0.82],
    ].forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.4, 5), bambooMat);
      p.position.set(px, 0.7, pz);
      tent.add(p);
    });
    root.add(tent);
  });

  // Parked Philippine Tricycle (motorcycle + colorful roofed sidecar) & 2 Mayon Trail ATV Buggies!
  const wheelBlackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.25, metalness: 0.75 });
  const tricycle = new THREE.Group();
  tricycle.position.set(-15.4, 0, -18.8);
  tricycle.rotation.y = 0.52;
  const triPaintMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.36, metalness: 0.25 });
  const triTrimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42 });
  // Motorcycle frame + 2 wheels
  [-0.52, 0.52].forEach((wz) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10), wheelBlackMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(-0.42, 0.28, wz);
    tricycle.add(w);
  });
  const motoBody = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 1.15), triPaintMat);
  motoBody.position.set(-0.42, 0.56, 0);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.58, 6), chromeMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-0.42, 0.96, 0.42);
  // Roofed passenger sidecar
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.65, 1.28), triPaintMat);
  cabBody.position.set(0.32, 0.55, -0.04);
  const cabStripe = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.14, 1.3), triTrimMat);
  cabStripe.position.set(0.32, 0.62, -0.04);
  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, 1.46), triTrimMat);
  cabRoof.position.set(0.24, 1.48, -0.04);
  const sideWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 10), wheelBlackMat);
  sideWheel.rotation.z = Math.PI / 2;
  sideWheel.position.set(0.84, 0.26, -0.18);
  [
    [-0.12, -0.62],
    [0.74, -0.62],
    [-0.12, 0.54],
    [0.74, 0.54],
  ].forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.64, 5), chromeMat);
    pillar.position.set(px, 1.16, pz);
    tricycle.add(pillar);
  });
  tricycle.add(motoBody, handle, cabBody, cabStripe, cabRoof, sideWheel);
  root.add(tricycle);

  // 2 Rugged Mayon Trail ATV Buggies parked near the right viewing edge
  [
    { x: 14.8, z: -22.2, ry: -0.62, col: 0xdc2626 },
    { x: 16.4, z: -23.6, ry: -0.84, col: 0xf97316 },
  ].forEach((atvSpec) => {
    const atv = new THREE.Group();
    atv.position.set(atvSpec.x, 0, atvSpec.z);
    atv.rotation.y = atvSpec.ry;
    const atvMat = new THREE.MeshStandardMaterial({ color: atvSpec.col, roughness: 0.42, metalness: 0.2 });
    [
      [-0.48, -0.52],
      [0.48, -0.52],
      [-0.48, 0.52],
      [0.48, 0.52],
    ].forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.22, 9), wheelBlackMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, 0.26, wz);
      atv.add(tire);
    });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.36, 1.32), atvMat);
    chassis.position.set(0, 0.52, 0);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.56), wheelBlackMat);
    seat.position.set(0, 0.74, -0.14);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.64, 6), chromeMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.92, 0.38);
    atv.add(chassis, seat, bar);
    root.add(atv);
  });

  // Multi-frond Instanced tropical coconut palms STRICTLY on outer left/right flanks (ZERO trees in front of Mayon's base!)
  const palmSpots = [
    [-21.5, -21.5], [-18.2, -25.0], [-25.5, -27.5], [-19.4, -31.5], [-28.5, -33.0],
    [18.2, -21.5], [21.5, -25.2], [25.0, -23.0], [19.8, -32.2], [27.5, -29.5], [30.5, -34.0],
    [-27.5, -23.0],
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
    windowBackdropGroup,
    outdoorOnlyGroup,
    envHint: {
      fogColorDay: 0xd4e8e6,
      fogColorNight: 0x0f1a2a,
      fogDensityScale: 0.72,
    },
    update: (dt, elapsed, isNight, climateState, weather, isPlayerOutside) => {
      const outside = isPlayerOutside ?? true;
      const isRain = weather.startsWith('rainy');
      ctx.update(isNight, climateState, elapsed, dt, isRain, outside);
      cloudRing.rotation.y += dt * 0.08;
      stallBulbMat.emissiveIntensity = isNight ? 2.1 : 0.3;
      kuboWinMat.emissiveIntensity = isNight ? 1.75 : 0.14;
      waterStripMat.color.setHex(isNight ? 0x164e63 : 0x38bdf8);

      if (!outside) return;

      // Animated Bicol market stall vendors gesturing warmly toward visitors
      for (let i = 0; i < vendors.length; i++) {
        const v = vendors[i];
        v.rig.root.rotation.y = v.baseRotY + Math.sin(elapsed * 0.8 + v.phase) * 0.16;
        updateArticulatedNpcPose(v.rig, dt, {
          mode: 'vendor_tend',
          elapsed,
          phase: v.phase,
        });
      }

      // Phase 7: Living Overlook Crowds, Stall Shoppers, Long-Duration Picnic Families & L-Junction Sightseeing Car
      mayonOverlookLife.update(dt, elapsed, isRain, isNight, outside);
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

  // Sculpted Descending Tagaytay / Baguio Mountain Cliff Escarpment
  // Starts flush underneath the z = -17.5 stone parapet (y = -0.35) and plunges smoothly
  // down to the grounded valley floor (y = -24.0 at z = -48.6) with upward-facing normals.
  const valleyY = -24.0;
  const cliffGeo = new THREE.PlaneGeometry(196, 31, 24, 6);
  cliffGeo.rotateX(-Math.PI / 2);
  const cliffPosAttr = cliffGeo.attributes.position as THREE.BufferAttribute;
  const cliffColors = new Float32Array(cliffPosAttr.count * 3);
  const cliffTopCol = new THREE.Color(0x284331);
  const cliffMidCol = new THREE.Color(0x1e2c2b);
  const cliffBotCol = new THREE.Color(0x101924);
  const tmpCliffC = new THREE.Color();
  for (let i = 0; i < cliffPosAttr.count; i++) {
    const vx = cliffPosAttr.getX(i);
    const vz = cliffPosAttr.getZ(i); // +15.5 (near rim) .. -15.5 (valley bottom)
    const t = Math.max(0, Math.min(1, (15.5 - vz) / 31));
    const ridgeNoise =
      Math.sin(vx * 0.12 + t * 3.8) * 1.1 * Math.sin(t * Math.PI) +
      Math.cos(vx * 0.27 - t * 2.2) * 0.55 * Math.sin(t * Math.PI);
    const vy = -0.38 - Math.pow(t, 1.1) * 23.68 + ridgeNoise;
    cliffPosAttr.setY(i, vy);
    if (t < 0.45) {
      tmpCliffC.lerpColors(cliffTopCol, cliffMidCol, t / 0.45);
    } else {
      tmpCliffC.lerpColors(cliffMidCol, cliffBotCol, (t - 0.45) / 0.55);
    }
    cliffColors[i * 3] = tmpCliffC.r;
    cliffColors[i * 3 + 1] = tmpCliffC.g;
    cliffColors[i * 3 + 2] = tmpCliffC.b;
  }
  cliffGeo.translate(0, 0, -33.1); // Near edge at z = -17.6, far edge at z = -48.6
  cliffGeo.setAttribute('color', new THREE.BufferAttribute(cliffColors, 3));
  cliffGeo.computeVertexNormals();
  const sculptedCliffMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    flatShading: true,
  });
  const cliffFace = new THREE.Mesh(cliffGeo, sculptedCliffMat);
  root.add(cliffFace);

  // Phase 4: Window-visible backdrop group for Coastal Sierra ribbons & Shimmering Coastal Sea/Bay
  const windowBackdropGroup = new THREE.Group();
  windowBackdropGroup.name = 'hilltop_window_backdrop';
  windowBackdropGroup.userData.alwaysVisibleBackdrop = true;
  root.add(windowBackdropGroup);

  // Continuous matte aerial urban-landmass floor beneath the metropolis & viaduct piers (z: +4 .. -124)
  // Zero mirror sheen so buildings & highway piers sit firmly on solid urban ground, NEVER flooded!
  const urbanLandmassTex = getHilltopUrbanLandmassTexture();
  const valleyFloorMat = new THREE.MeshStandardMaterial({
    color: urbanLandmassTex ? 0xffffff : 0x121720,
    map: urbanLandmassTex,
    roughness: 0.97,
    metalness: 0.0,
    envMapIntensity: 0.04,
  });
  const valleyFloor = new THREE.Mesh(new THREE.PlaneGeometry(380, 128), valleyFloorMat);
  valleyFloor.name = 'hilltop_urban_landmass';
  valleyFloor.rotation.x = -Math.PI / 2;
  valleyFloor.position.set(0, valleyY, -60); // Near z = +4, outer shoreline perimeter z = -124
  valleyFloor.userData.alwaysVisibleBackdrop = true;
  windowBackdropGroup.add(valleyFloor);

  // Subtle matte coastal seawall / shoreline embankment cleanly separating city landmass from bay at z = -124
  const shorelineBank = new THREE.Mesh(
    new THREE.BoxGeometry(380, 0.9, 2.6),
    new THREE.MeshStandardMaterial({
      color: 0x1d252e,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.05,
    })
  );
  shorelineBank.name = 'hilltop_shoreline_embankment';
  shorelineBank.position.set(0, valleyY - 0.15, -124);
  shorelineBank.userData.alwaysVisibleBackdrop = true;
  windowBackdropGroup.add(shorelineBank);

  // Expansive Shimmering Coastal Sea / Bay strictly BEYOND the city shoreline perimeter (z <= -124)!
  const coastalSeaMat = new THREE.MeshStandardMaterial({
    color: 0x164e63,
    emissive: 0x0c2d48,
    emissiveIntensity: 0.24,
    roughness: 0.18,
    metalness: 0.52,
    envMapIntensity: 0.65,
  });
  const coastalSea = new THREE.Mesh(new THREE.PlaneGeometry(480, 260), coastalSeaMat);
  coastalSea.name = 'hilltop_coastal_sea';
  coastalSea.rotation.x = -Math.PI / 2;
  coastalSea.position.set(0, valleyY - 0.06, -254); // Starts cleanly at z = -124..(-384), never under buildings!
  coastalSea.userData.alwaysVisibleBackdrop = true;
  windowBackdropGroup.add(coastalSea);

  // Subtle horizon shimmer band + warm coastal city-light reflection glints over the bay
  const bayShimmerMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.22,
  });
  const bayGlints: THREE.Mesh[] = [];
  for (let g = 0; g < 10; g++) {
    const gw = 16 + (g % 4) * 9;
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(gw, 1.8 + (g % 3) * 0.9), bayShimmerMat);
    glint.rotation.x = -Math.PI / 2;
    glint.position.set(-76 + g * 17.5, valleyY + 0.06, -138 - (g % 4) * 14);
    glint.userData.alwaysVisibleBackdrop = true;
    glint.userData.noMerge = true;
    windowBackdropGroup.add(glint);
    bayGlints.push(glint);
  }

  // Sculpted COASTAL_SIERRA Mountain Range Ribbons & L/R Corner Headlands with matte 'highland' grain texture
  const hilltopTier = resolveMountainGraphicsTier();
  const sierraMat = createSharedMountainMaterial('highland', hilltopTier);
  const leftCoastalSierra = createMountainRibbonMesh(
    {
      seed: 311,
      arcRadius: 146,
      startAngle: -1.46,
      endAngle: -0.14,
      depth: 44,
      peakCount: 5,
      minPeakHeight: 26,
      maxPeakHeight: 54,
      baseY: valleyY - 1.5,
      skirtFloorY: -36,
      palette: COASTAL_SIERRA,
      tier: hilltopTier,
    },
    sierraMat,
    'hilltop_coastal_sierra_left'
  );
  const rightCoastalSierra = createMountainRibbonMesh(
    {
      seed: 419,
      arcRadius: 152,
      startAngle: 0.12,
      endAngle: 1.46,
      depth: 46,
      peakCount: 5,
      minPeakHeight: 24,
      maxPeakHeight: 50,
      baseY: valleyY - 1.5,
      skirtFloorY: -36,
      palette: COASTAL_SIERRA,
      tier: hilltopTier,
    },
    sierraMat,
    'hilltop_coastal_sierra_right'
  );
  const leftHeadland = createRidgedPeakMesh(
    {
      seed: 523,
      radiusX: 42,
      radiusZ: 32,
      height: 36,
      baseY: valleyY - 1.5,
      skirtFloorY: -36,
      ridgeStretch: 0.34,
      palette: COASTAL_SIERRA,
      tier: hilltopTier,
    },
    sierraMat,
    'hilltop_left_headland'
  );
  leftHeadland.position.set(-96, 0, -112);
  const rightHeadland = createRidgedPeakMesh(
    {
      seed: 557,
      radiusX: 42,
      radiusZ: 32,
      height: 35,
      baseY: valleyY - 1.5,
      skirtFloorY: -36,
      ridgeStretch: 0.34,
      palette: COASTAL_SIERRA,
      tier: hilltopTier,
    },
    sierraMat,
    'hilltop_right_headland'
  );
  rightHeadland.position.set(98, 0, -110);
  windowBackdropGroup.add(leftCoastalSierra, rightCoastalSierra, leftHeadland, rightHeadland);

  // Framed Baguio Pine Trees strictly on left & right cliff edges (|x| > 9.5 so center valley view is 100% clear!)
  const pineCoords: Array<[number, number, number]> = [];
  for (let i = 0; i < 36; i++) {
    const x = -38 + i * 2.15 + Math.sin(i * 2.7) * 0.55;
    if (Math.abs(x) < 9.5) continue;
    const tier = i % 4;
    const z = -19.2 - tier * 2.8;
    const tSlope = Math.max(0, Math.min(1, (-17.6 - z) / 31));
    const y = -0.5 - Math.pow(tSlope, 1.1) * 23.6;
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

  // Cozy Glowing Hillside Resort Cabins anchored cleanly into cliff slopes with concrete retaining plinths
  const resortWinMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.65,
    roughness: 0.25,
  });
  [
    [-22, -28.0],
    [-16, -33.0],
    [17, -28.6],
    [25, -34.2],
    [-30, -36.5],
    [32, -37.2],
  ].forEach(([cx, cz]) => {
    const tSlope = Math.max(0, Math.min(1, (-17.6 - cz) / 31));
    const cy = -0.38 - Math.pow(tSlope, 1.1) * 23.68;
    const cg = new THREE.Group();
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.3, 4.2, 2.7), stoneParapetMat);
    plinth.position.y = -2.1;
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 2.6), woodMat);
    body.position.y = 1.0;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.3, 4), ridgeStoneMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 2.6;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.72), resortWinMat);
    win.position.set(0, 1.15, 1.33);
    cg.add(plinth, body, roof, win);
    cg.position.set(cx, cy, cz);
    cg.userData.outdoorOnly = true;
    root.add(cg);
  });

  // === CLEAN CURVED VALLEY VIADUCT EXPRESSWAY (routed strictly between city districts!) ===
  const getViaductZ = (x: number) => -66.5 + Math.sin(x * 0.036) * 6.5;
  const getViaductDzDx = (x: number) => Math.cos(x * 0.036) * 6.5 * 0.036;
  const viaductY = valleyY + 3.4; // Elevated 3.4m above valley floor, supported on solid concrete piers

  const viaductDeckMat = new THREE.MeshStandardMaterial({ color: 0x2a313c, roughness: 0.76 });
  const viaductBarrierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.84 });
  const viaductStripeMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.65,
    roughness: 0.5,
  });

  const buildViaductStrip = (halfWidth: number, yOff: number, segs: number, xSpan = 210) => {
    const pos: number[] = [];
    const norm: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = -xSpan * 0.5 + t * xSpan;
      const z = getViaductZ(x);
      const dzdx = getViaductDzDx(x);
      const len = Math.hypot(1, dzdx);
      const nx = -dzdx / len;
      const nz = 1 / len;
      pos.push(x - nx * halfWidth, viaductY + yOff, z - nz * halfWidth);
      pos.push(x + nx * halfWidth, viaductY + yOff, z + nz * halfWidth);
      norm.push(0, 1, 0, 0, 1, 0);
      if (i < segs) {
        const b = i * 2;
        indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    g.setIndex(indices);
    return g;
  };
  const viaductDeck = new THREE.Mesh(buildViaductStrip(2.85, 0.0, 44), viaductDeckMat);
  const viaductCenterLine = new THREE.Mesh(buildViaductStrip(0.16, 0.06, 44), viaductStripeMat);
  viaductDeck.userData.outdoorOnly = true;
  viaductCenterLine.userData.outdoorOnly = true;
  root.add(viaductDeck, viaductCenterLine);

  // Solid Concrete Viaduct Piers & Guardrail Parapets anchored cleanly down to valleyY - 1.5
  const pierCount = 21;
  const pierColumns = new THREE.InstancedMesh(new THREE.BoxGeometry(1.15, 5.2, 3.8), viaductBarrierMat, pierCount);
  const barrierCapL = new THREE.InstancedMesh(new THREE.BoxGeometry(10.2, 0.72, 0.34), viaductBarrierMat, pierCount);
  const barrierCapR = new THREE.InstancedMesh(new THREE.BoxGeometry(10.2, 0.72, 0.34), viaductBarrierMat, pierCount);
  const streetPoleInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 2.8, 5), darkSteelMat, pierCount);
  const highwayLampMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.5,
  });
  const streetBulbInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.24, 6, 5), highwayLampMat, pierCount);
  for (let i = 0; i < pierCount; i++) {
    const px = -100 + i * 10;
    const pz = getViaductZ(px);
    const angle = -Math.atan(getViaductDzDx(px));
    dummy.position.set(px, viaductY - 2.6, pz);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    pierColumns.setMatrixAt(i, dummy.matrix);

    const perpX = Math.sin(angle);
    const perpZ = Math.cos(angle);
    dummy.position.set(px - perpX * 2.85, viaductY + 0.18, pz - perpZ * 2.85);
    dummy.updateMatrix();
    barrierCapL.setMatrixAt(i, dummy.matrix);

    dummy.position.set(px + perpX * 2.85, viaductY + 0.18, pz + perpZ * 2.85);
    dummy.updateMatrix();
    barrierCapR.setMatrixAt(i, dummy.matrix);

    dummy.position.set(px, viaductY + 1.4, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    streetPoleInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(px, viaductY + 2.85, pz);
    dummy.updateMatrix();
    streetBulbInst.setMatrixAt(i, dummy.matrix);
  }
  pierColumns.instanceMatrix.needsUpdate = true;
  barrierCapL.instanceMatrix.needsUpdate = true;
  barrierCapR.instanceMatrix.needsUpdate = true;
  streetPoleInst.instanceMatrix.needsUpdate = true;
  streetBulbInst.instanceMatrix.needsUpdate = true;
  pierColumns.userData.outdoorOnly = true;
  barrierCapL.userData.outdoorOnly = true;
  barrierCapR.userData.outdoorOnly = true;
  streetPoleInst.userData.outdoorOnly = true;
  streetBulbInst.userData.outdoorOnly = true;
  root.add(pierColumns, barrierCapL, barrierCapR, streetPoleInst, streetBulbInst);

  // Subtle Low-Profile Moving Headlights & Taillights hugging the curved viaduct highway deck
  const carStreakCount = 36;
  const carHeadMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
  const carTailMat = new THREE.MeshBasicMaterial({ color: 0xf87171 });
  const carHeadStreaks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.95, 0.18, 0.28),
    carHeadMat,
    carStreakCount / 2
  );
  const carTailStreaks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.95, 0.18, 0.28),
    carTailMat,
    carStreakCount / 2
  );
  carHeadStreaks.userData.outdoorOnly = true;
  carTailStreaks.userData.outdoorOnly = true;
  const streakData = Array.from({ length: carStreakCount }, (_, i) => ({
    x: -98 + ((i * 17.3) % 196),
    laneOffset: i % 2 === 0 ? -1.15 : 1.15,
    dir: (i % 2 === 0 ? 1 : -1) as 1 | -1,
    speed: 5.5 + (i % 4) * 1.9,
  }));
  root.add(carHeadStreaks, carTailStreaks);

  // === DENSE GROUNDED LOW-POLY VALLEY METROPOLIS (3 InstancedMesh batches, ZERO floating dots!) ===
  const valleyLowTex = createProceduralFacadeTextures('urban', '#1e293b', '#f59e0b');
  const valleyLowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: valleyLowTex?.map,
    emissive: 0xfde68a,
    emissiveMap: valleyLowTex?.emissiveMap,
    emissiveIntensity: 0.92,
    roughness: 0.86,
  });
  const valleyTowerTex = createProceduralFacadeTextures('urban', '#172133', '#fbbf24');
  const valleyTowerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: valleyTowerTex?.map,
    emissive: 0xfef3c7,
    emissiveMap: valleyTowerTex?.emissiveMap,
    emissiveIntensity: 1.15,
    roughness: 0.72,
    metalness: 0.22,
  });
  const beaconRedMat = new THREE.MeshBasicMaterial({ color: 0xf87171 });

  interface ValleyBlockSpec {
    x: number;
    z: number;
    w: number;
    h: number;
    d: number;
    rot: number;
  }
  const lowSpecs: ValleyBlockSpec[] = [];
  const midSpecs: ValleyBlockSpec[] = [];
  const tallSpecs: ValleyBlockSpec[] = [];

  // Deterministic pseudo-random helper
  const hRand = (seed: number) => Math.abs(Math.sin(seed * 12.9898 + 4.1414) * 43758.5453) % 1;

  // Populate dense residential & commercial low-rise blocks cleanly around (never on) the viaduct highway
  for (let i = 0; i < 240; i++) {
    const r1 = hRand(i * 3.1 + 1);
    const r2 = hRand(i * 7.3 + 2);
    const r3 = hRand(i * 11.7 + 3);
    const bx = (r1 - 0.5) * 195;
    const bz = -50.5 - r2 * 64.0;
    // Keep highway corridor 100% clear of buildings
    if (Math.abs(bz - getViaductZ(bx)) < 6.8) continue;
    const bw = 2.8 + r3 * 2.6;
    const bd = 2.6 + ((i * 5) % 4) * 0.75;
    const bh = 2.6 + hRand(i * 17.1) * 4.2;
    lowSpecs.push({ x: bx, z: bz, w: bw, h: bh, d: bd, rot: ((i % 5) - 2) * 0.08 });
  }

  // Mid-rise districts grouped into 5 natural urban neighborhoods
  const districtCenters = [
    [-58, -86],
    [-22, -82],
    [14, -84],
    [50, -88],
    [-4, -104],
  ];
  for (let i = 0; i < 110; i++) {
    const [dcx, dcz] = districtCenters[i % districtCenters.length];
    const r1 = hRand(i * 5.7 + 41) - 0.5;
    const r2 = hRand(i * 9.1 + 73) - 0.5;
    const bx = dcx + r1 * 30;
    const bz = dcz + r2 * 24;
    if (bz > -51 || bz < -118 || Math.abs(bz - getViaductZ(bx)) < 7.5) continue;
    const bw = 3.2 + hRand(i * 2.9) * 2.5;
    const bd = 3.0 + hRand(i * 4.3) * 2.2;
    const bh = 7.2 + hRand(i * 13.7) * 7.5;
    midSpecs.push({ x: bx, z: bz, w: bw, h: bh, d: bd, rot: ((i % 3) - 1) * 0.06 });
  }

  // Landmark Downtown Skyscraper Clusters (grounded cleanly on valleyY, visible silhouette through cafe windows!)
  const skylineCenters = [
    [-38, -94],
    [-8, -92],
    [22, -96],
    [56, -98],
  ];
  for (let i = 0; i < 42; i++) {
    const [scx, scz] = skylineCenters[i % skylineCenters.length];
    const r1 = hRand(i * 6.3 + 97) - 0.5;
    const r2 = hRand(i * 8.9 + 113) - 0.5;
    const bx = scx + r1 * 22;
    const bz = scz + r2 * 18;
    if (Math.abs(bz - getViaductZ(bx)) < 8.5) continue;
    const bw = 3.6 + hRand(i * 3.7) * 2.8;
    const bd = 3.6 + hRand(i * 5.1) * 2.6;
    const bh = 15.5 + hRand(i * 19.3) * 14.5;
    tallSpecs.push({ x: bx, z: bz, w: bw, h: bh, d: bd, rot: 0 });
  }

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const valleyLowMesh = new THREE.InstancedMesh(unitBox, valleyLowMat, lowSpecs.length);
  lowSpecs.forEach((b, idx) => {
    const totalH = b.h + 1.2; // 1.2m sunken plinth below valleyY so ZERO floating!
    dummy.position.set(b.x, valleyY - 1.2 + totalH * 0.5, b.z);
    dummy.rotation.set(0, b.rot, 0);
    dummy.scale.set(b.w, totalH, b.d);
    dummy.updateMatrix();
    valleyLowMesh.setMatrixAt(idx, dummy.matrix);
  });
  valleyLowMesh.instanceMatrix.needsUpdate = true;
  valleyLowMesh.userData.outdoorOnly = true;

  const valleyMidMesh = new THREE.InstancedMesh(unitBox, valleyTowerMat, midSpecs.length);
  midSpecs.forEach((b, idx) => {
    const totalH = b.h + 1.2;
    dummy.position.set(b.x, valleyY - 1.2 + totalH * 0.5, b.z);
    dummy.rotation.set(0, b.rot, 0);
    dummy.scale.set(b.w, totalH, b.d);
    dummy.updateMatrix();
    valleyMidMesh.setMatrixAt(idx, dummy.matrix);
  });
  valleyMidMesh.instanceMatrix.needsUpdate = true;
  valleyMidMesh.userData.outdoorOnly = true;

  const valleyTallMesh = new THREE.InstancedMesh(unitBox, valleyTowerMat, tallSpecs.length);
  const towerBeacons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 6, 5), beaconRedMat, tallSpecs.length);
  tallSpecs.forEach((b, idx) => {
    const totalH = b.h + 1.4;
    dummy.position.set(b.x, valleyY - 1.4 + totalH * 0.5, b.z);
    dummy.rotation.set(0, b.rot, 0);
    dummy.scale.set(b.w, totalH, b.d);
    dummy.updateMatrix();
    valleyTallMesh.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(b.x, valleyY + b.h + 0.35, b.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    towerBeacons.setMatrixAt(idx, dummy.matrix);
  });
  valleyTallMesh.instanceMatrix.needsUpdate = true;
  towerBeacons.instanceMatrix.needsUpdate = true;
  valleyTallMesh.userData.alwaysVisibleBackdrop = true;
  towerBeacons.userData.alwaysVisibleBackdrop = true;
  root.add(valleyLowMesh, valleyMidMesh, valleyTallMesh, towerBeacons);

  // Subtle street-grid glow bands strictly flush on the valley floor between neighborhoods
  const avenueGlowMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.24,
  });
  [-54, -84, -102].forEach((az) => {
    const ave = new THREE.Mesh(new THREE.PlaneGeometry(188, 0.95), avenueGlowMat);
    ave.rotation.x = -Math.PI / 2;
    ave.position.set(0, valleyY + 0.08, az);
    ave.userData.outdoorOnly = true;
    root.add(ave);
  });

  // Drifting cool highland mist wisps below the lookout parapet
  const mistSprites: THREE.Sprite[] = [];
  const mistMat = new THREE.SpriteMaterial({
    map: getSharedGlowSpriteTexture(),
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });
  for (let m = 0; m < 8; m++) {
    const sp = new THREE.Sprite(mistMat);
    sp.position.set(-28 + m * 8.2, -6.5 - (m % 3) * 2.5, -26 - (m % 4) * 10);
    sp.scale.set(17, 4.8, 1);
    sp.userData.outdoorOnly = true;
    root.add(sp);
    mistSprites.push(sp);
  }

  const ctx = addSurrounding360Context(root, 'hilltop_city_lights');
  disableShadowsRecursive(root);

  return {
    id: 'hilltop_city_lights',
    root,
    windowBackdropGroup,
    envHint: {
      fogColorDay: 0xcbd9e6,
      fogColorNight: 0x091020,
      fogDensityScale: 0.65,
    },
    update: (dt, elapsed, isNight, climateState, weather) => {
      ctx.update(isNight, climateState, elapsed);
      const isGolden = weather === 'golden' || weather === 'rainy-golden' || weather === 'dawn' || weather === 'rainy-dawn';
      // Shimmering Coastal Sea / Bay atmospheric tint (Sunset gold/orange vs moonlit navy at night)
      if (isNight) {
        coastalSeaMat.color.setHex(0x0b1f3a);
        coastalSeaMat.emissive.setHex(0x08162c);
        coastalSeaMat.emissiveIntensity = 0.36;
        bayShimmerMat.color.setHex(0xfbbf24);
        bayShimmerMat.opacity = 0.28 + Math.sin(elapsed * 2.1) * 0.06;
      } else if (isGolden) {
        coastalSeaMat.color.setHex(0x8c5638);
        coastalSeaMat.emissive.setHex(0xc2410c);
        coastalSeaMat.emissiveIntensity = 0.34;
        bayShimmerMat.color.setHex(0xfde68a);
        bayShimmerMat.opacity = 0.36 + Math.sin(elapsed * 2.4) * 0.07;
      } else {
        coastalSeaMat.color.setHex(0x1d5e7a);
        coastalSeaMat.emissive.setHex(0x0c354c);
        coastalSeaMat.emissiveIntensity = 0.2;
        bayShimmerMat.color.setHex(0xe0f2fe);
        bayShimmerMat.opacity = 0.22 + Math.sin(elapsed * 1.9) * 0.05;
      }
      for (let g = 0; g < bayGlints.length; g++) {
        bayGlints[g].scale.x = 0.85 + Math.sin(elapsed * 1.7 + g * 1.3) * 0.24;
      }
      stringBulbMat.emissiveIntensity = isNight ? 2.25 : 0.45;
      resortWinMat.emissiveIntensity = isNight ? 2.1 : 0.45;
      valleyLowMat.emissiveIntensity = isNight ? 1.55 : 0.18;
      valleyTowerMat.emissiveIntensity = isNight ? 1.85 : 0.24;
      highwayLampMat.emissiveIntensity = isNight ? 2.1 : 0.35;
      viaductStripeMat.emissiveIntensity = isNight ? 0.95 : 0.2;
      avenueGlowMat.opacity = isNight ? 0.32 : 0.08;
      mistMat.opacity = isNight ? 0.08 : 0.12;
      beaconRedMat.color.setHex(Math.sin(elapsed * 2.8) > 0 ? 0xf87171 : 0x7f1d1d);

      let hIdx = 0;
      let tIdx = 0;
      for (let i = 0; i < carStreakCount; i++) {
        const s = streakData[i];
        s.x += s.dir * s.speed * dt;
        if (s.x > 100) s.x = -100;
        if (s.x < -100) s.x = 100;
        const vz = getViaductZ(s.x);
        const angle = -Math.atan(getViaductDzDx(s.x));
        const perpX = Math.sin(angle);
        const perpZ = Math.cos(angle);
        dummy.position.set(s.x + perpX * s.laneOffset, viaductY + 0.18, vz + perpZ * s.laneOffset);
        dummy.rotation.set(0, angle, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        if (s.dir === 1) {
          carHeadStreaks.setMatrixAt(hIdx++, dummy.matrix);
        } else {
          carTailStreaks.setMatrixAt(tIdx++, dummy.matrix);
        }
      }
      carHeadStreaks.instanceMatrix.needsUpdate = true;
      carTailStreaks.instanceMatrix.needsUpdate = true;

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

  // Granite side drainage curb strips clipped cleanly to main span (x ∈ [-29.2, +29.2], zero T-junction overlap!)
  const drainMat = new THREE.MeshStandardMaterial({ color: 0x4b525a, roughness: 0.86 });
  [-17.3, -7.8].forEach((dz) => {
    const drain = new THREE.Mesh(new THREE.BoxGeometry(58.4, 0.06, 0.38), drainMat);
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

    // Warm glowing shoji panels on ground floor (leave center doorway clear on animated machiya)
    const isAnimatedMachiya = idx >= 1 && idx <= 4;
    if (isAnimatedMachiya) {
      [-1.24, 1.24].forEach((sx) => {
        const sideShoji = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.92), shojiMat);
        sideShoji.position.set(sx, 1.12, d / 2 + 0.045);
        house.add(sideShoji);
      });
    } else {
      const shoji = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.92), shojiMat);
      shoji.position.set(0, 1.12, d / 2 + 0.045);
      house.add(shoji);
    }

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

  // === DETAILED KYOTO SHRINE APPROACH LANE LEADING TO THE RED PAGODA ===
  const vermilionMat = new THREE.MeshStandardMaterial({ color: 0xc8231d, roughness: 0.56 });
  const basaltMat = new THREE.MeshStandardMaterial({ color: 0x292d33, roughness: 0.88 });
  const mossyStoneMat = new THREE.MeshStandardMaterial({ color: 0x5c6a5c, roughness: 0.94 });
  const mapleCrimsonMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.82 });
  const noboriRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.78, side: THREE.DoubleSide });
  const noboriCreamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.8, side: THREE.DoubleSide });

  // Staggered Carved Granite Toro Stone Lanterns lining BOTH flanks all the way to the Pagoda (InstancedMesh)
  const toroFlameMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
  });
  const toroCoords: Array<[number, number]> = [
    [-2.55, -18.2], [2.75, -18.2],
    [-2.65, -22.8], [2.85, -22.8],
    [-2.65, -26.8], [2.85, -26.8],
    [-2.65, -31.8], [2.85, -31.8],
    [-2.65, -36.8], [2.85, -36.8],
    [-2.65, -41.5], [2.85, -41.5],
  ];
  const toroBaseInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.24, 0.62), stoneMat, toroCoords.length);
  const toroPillarInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.18, 0.95, 6), stoneMat, toroCoords.length);
  const toroFireInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.38, 0.36, 0.38), toroFlameMat, toroCoords.length);
  const toroCapInst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.55, 0.32, 6), stoneMat, toroCoords.length);
  toroCoords.forEach(([tx, tz], idx) => {
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.position.set(tx, 0.12, tz);
    dummy.updateMatrix();
    toroBaseInst.setMatrixAt(idx, dummy.matrix);
    dummy.position.set(tx, 0.72, tz);
    dummy.updateMatrix();
    toroPillarInst.setMatrixAt(idx, dummy.matrix);
    dummy.position.set(tx, 1.38, tz);
    dummy.updateMatrix();
    toroFireInst.setMatrixAt(idx, dummy.matrix);
    dummy.position.set(tx, 1.72, tz);
    dummy.updateMatrix();
    toroCapInst.setMatrixAt(idx, dummy.matrix);
  });
  toroBaseInst.instanceMatrix.needsUpdate = true;
  toroPillarInst.instanceMatrix.needsUpdate = true;
  toroFireInst.instanceMatrix.needsUpdate = true;
  toroCapInst.instanceMatrix.needsUpdate = true;
  root.add(toroBaseInst, toroPillarInst, toroFireInst, toroCapInst);

  // Mossy stone curb borders + low carved granite Tamagaki shrine railings flanking BOTH sides of the approach
  [-2.35, 2.55].forEach((cx) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 27.6), mossyStoneMat);
    curb.position.set(cx, 0.11, -31.6);
    root.add(curb);
  });
  const tamagakiPostSpots: Array<[number, number]> = [];
  const tamagakiSpanZs = [-20.4, -24.8, -34.2, -39.2];
  [-2.82, 3.02].forEach((rx) => {
    tamagakiSpanZs.forEach((sz) => {
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 3.4), stoneMat);
      topRail.position.set(rx, 0.92, sz);
      const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 3.4), stoneMat);
      midRail.position.set(rx, 0.56, sz);
      root.add(topRail, midRail);
      tamagakiPostSpots.push([rx, sz - 1.6], [rx, sz], [rx, sz + 1.6]);
    });
  });
  const tamagakiPosts = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.2, 1.08, 0.2),
    stoneMat,
    tamagakiPostSpots.length
  );
  tamagakiPostSpots.forEach(([px, pz], idx) => {
    dummy.position.set(px, 0.54, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    tamagakiPosts.setMatrixAt(idx, dummy.matrix);
  });
  tamagakiPosts.instanceMatrix.needsUpdate = true;
  root.add(tamagakiPosts);

  // Framed Vermilion Torii Gate spanning cleanly across the mid-approach road (z = -29.2)
  const torii = new THREE.Group();
  torii.position.set(0.1, 0, -29.2);
  [-2.45, 2.45].forEach((px) => {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.58, 10), basaltMat);
    plinth.position.set(px, 0.29, 0);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 4.95, 10), vermilionMat);
    col.position.set(px, 2.75, 0);
    torii.add(plinth, col);
  });
  const nukiBeam = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.3, 0.28), vermilionMat);
  nukiBeam.position.set(0, 4.18, 0);
  const kasagiBase = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.34, 0.42), vermilionMat);
  kasagiBase.position.set(0, 5.05, 0);
  const kasagiCap = new THREE.Mesh(new THREE.BoxGeometry(7.25, 0.16, 0.52), basaltMat);
  kasagiCap.position.set(0, 5.26, 0);
  [-3.35, 3.35].forEach((tx) => {
    const upturn = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.2, 0.48), basaltMat);
    upturn.position.set(tx, 5.36, 0);
    upturn.rotation.z = tx < 0 ? -0.26 : 0.26;
    torii.add(upturn);
  });
  const centerStrut = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.82, 0.24), vermilionMat);
  centerStrut.position.set(0, 4.62, 0);
  const toriiPlaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.84, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0xf59e0b, emissiveIntensity: 0.22, roughness: 0.5 })
  );
  toriiPlaque.position.set(0, 4.64, 0.16);
  torii.add(nukiBeam, kasagiBase, kasagiCap, centerStrut, toriiPlaque);
  torii.userData.alwaysVisibleBackdrop = true;
  root.add(torii);

  // Vertical Red & Cream Shrine Banners (Nobori) fluttering along both sides of the approach
  const noboriBanners: THREE.Mesh[] = [];
  [
    [-3.35, -21.2, 0], [3.55, -21.2, 1],
    [-3.35, -26.0, 1], [3.55, -26.0, 0],
    [-3.35, -32.8, 0], [3.55, -32.8, 1],
    [-3.35, -38.0, 1], [3.55, -38.0, 0],
  ].forEach(([nx, nz, colorIdx]) => {
    const bg = new THREE.Group();
    bg.position.set(nx, 0, nz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 3.1, 6), bambooMat);
    pole.position.y = 1.55;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 5), bambooMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(nx < 0 ? 0.28 : -0.28, 2.98, 0);
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.54, 1.82),
      colorIdx === 0 ? noboriRedMat : noboriCreamMat
    );
    cloth.position.set(nx < 0 ? 0.28 : -0.28, 2.02, 0);
    bg.add(pole, arm, cloth);
    root.add(bg);
    noboriBanners.push(cloth);
  });

  // Compact Incense & Omikuji Fortune Kiosk + Second Ema Wish Stand tucked cleanly beside the approach
  const kiosk = new THREE.Group();
  kiosk.position.set(4.65, 0, -25.4);
  kiosk.rotation.y = -Math.PI / 2;
  const kBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.96, 1.35), darkCedarMat);
  kBase.position.y = 0.48;
  const kCounter = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.12, 1.55), warmWoodMat);
  kCounter.position.y = 0.98;
  const kBack = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.15, 0.16), plasterMat);
  kBack.position.set(0, 1.62, -0.58);
  const kWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.85), shojiMat);
  kWindow.position.set(0, 1.65, -0.48);
  [-1.15, 1.15].forEach((px) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.45, 0.11), darkCedarMat);
    p.position.set(px, 1.25, 0.58);
    kiosk.add(p);
  });
  const kRoof = new THREE.Mesh(new THREE.ConeGeometry(2.25, 0.92, 4), roofTileMat);
  kRoof.rotation.y = Math.PI / 4;
  kRoof.scale.set(1.22, 1, 0.85);
  kRoof.position.set(0, 2.95, 0);
  // Bronze incense cauldron (Jokoro) right beside the kiosk
  const cauldron = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.52, 8), basaltMat);
  cauldron.position.set(-1.68, 0.56, 0.35);
  const cauldronLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.36, 8), basaltMat);
  cauldronLeg.position.set(-1.68, 0.18, 0.35);
  kiosk.add(kBase, kCounter, kBack, kWindow, kRoof, cauldron, cauldronLeg);
  root.add(kiosk);

  // Low Bamboo & Crimson Japanese Maple (Momiji) Stone Planters flanking the approach
  [
    [-4.1, -23.5, true], [4.3, -30.5, false],
    [-4.1, -34.2, false], [4.3, -36.5, true],
    [-4.1, -40.2, true], [4.3, -41.0, false],
  ].forEach(([px, pz, isMaple]) => {
    const pg = new THREE.Group();
    pg.position.set(px as number, 0, pz as number);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.44, 1.15), mossyStoneMat);
    box.position.y = 0.22;
    pg.add(box);
    if (isMaple) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.35, 6), darkCedarMat);
      trunk.position.y = 1.05;
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), mapleCrimsonMat);
      crown.scale.set(1.25, 0.72, 1.15);
      crown.position.y = 1.85;
      pg.add(trunk, crown);
    } else {
      for (let b = -1; b <= 1; b++) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 2.45, 6), bambooMat);
        stalk.position.set(b * 0.22, 1.45, (b % 2) * 0.14);
        stalk.rotation.z = b * 0.06;
        pg.add(stalk);
      }
    }
    root.add(pg);
  });

  // Blooming Cherry Blossom (Sakura) Trees with multi-cluster canopies arching cleanly outside the approach lane
  const sakuraBloomMatA = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.78 });
  const sakuraBloomMatB = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.8 });
  [
    [-5.1, -24.2],
    [5.2, -25.0],
    [-19.6, -22.5],
    [20.2, -22.5],
    [-7.6, -30.5],
    [8.1, -31.0],
    [-6.2, -38.5],
    [6.6, -39.0],
  ].forEach(([sx, sz], idx) => {
    const tree = new THREE.Group();
    tree.position.set(sx, 0, sz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.27, 3.4, 7), darkCedarMat);
    trunk.position.y = 1.7;
    trunk.rotation.z = sx < 0 ? -0.1 : 0.1;
    tree.add(trunk);

    const canopyScale = idx < 2 ? 0.86 : 1.0;
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.7 * canopyScale, 1), sakuraBloomMatA);
    c1.scale.set(1.24, 0.76, 1.08);
    c1.position.set(sx < 0 ? 0.32 : -0.32, 3.7, 0);
    tree.add(c1);
    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25 * canopyScale, 1), sakuraBloomMatB);
    c2.scale.set(1.16, 0.75, 1.04);
    c2.position.set(sx < 0 ? -0.68 : 0.68, 3.25, 0.45 * (idx % 2 === 0 ? 1 : -1));
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

  // Misty sculpted Higashiyama forested hills behind the pagoda (zero party-hat cones!)
  const kyotoBackdropMat = createSharedMountainMaterial();
  const kyotoBackdropTier = resolveMountainGraphicsTier();
  const higashiyamaRange = createMountainRibbonMesh(
    {
      seed: 461,
      centerX: 0,
      centerZ: -12,
      arcRadius: 82,
      startAngle: -1.05,
      endAngle: 1.05,
      depth: 32,
      peakCount: 4,
      minPeakHeight: 15,
      maxPeakHeight: 24,
      baseY: -1.5,
      skirtFloorY: -12,
      palette: MAYON_FOOTHILLS,
      tier: kyotoBackdropTier,
    },
    kyotoBackdropMat,
    'kyoto_higashiyama_range'
  );
  root.add(higashiyamaRange);

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

  // Cozy Kyoto Street-Level Props: Ema Prayer-Plaque & Furin Wind-Chime Rack, Bamboo Shishi-Odoshi Water Fountain & Vintage Mamachari Bicycle
  const emaRack = new THREE.Group();
  emaRack.position.set(-3.35, 0, -17.95);
  emaRack.rotation.y = 0.22;
  [-0.78, 0.78].forEach((px) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.05, 0.09), darkCedarMat);
    p.position.set(px, 1.02, 0);
    emaRack.add(p);
  });
  const emaRoof = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.12, 0.56), roofTileMat);
  emaRoof.position.set(0, 2.08, 0);
  emaRoof.rotation.x = 0.12;
  emaRack.add(emaRoof);
  const emaPlaqueMat = new THREE.MeshStandardMaterial({ color: 0xf2d5a0, roughness: 0.78 });
  const chimeRibbonMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.75 });
  const chimeStrips: THREE.Mesh[] = [];
  for (let row = 0; row < 2; row++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.04, 0.04), warmWoodMat);
    bar.position.set(0, 1.48 - row * 0.38, 0);
    emaRack.add(bar);
    for (let col = -3; col <= 3; col++) {
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.025), emaPlaqueMat);
      plaque.position.set(col * 0.2, 1.34 - row * 0.38, 0.02);
      plaque.rotation.z = ((col + row) % 3 - 1) * 0.08;
      emaRack.add(plaque);
    }
  }
  [-0.5, 0, 0.5].forEach((cx) => {
    const bell = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.15, transparent: true, opacity: 0.8 })
    );
    bell.position.set(cx, 1.88, 0.18);
    emaRack.add(bell);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.01), chimeRibbonMat);
    strip.position.set(cx, 1.72, 0.18);
    emaRack.add(strip);
    chimeStrips.push(strip);
  });
  root.add(emaRack);

  // Bamboo Shishi-Odoshi Water Fountain over a mossy granite basin (animated gentle rocking!)
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(3.45, 0, -18.02);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.38, 0.42, 9), stoneMat);
  basin.position.y = 0.21;
  const basinWater = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 10),
    new THREE.MeshStandardMaterial({ color: 0x155e75, roughness: 0.18, metalness: 0.35 })
  );
  basinWater.rotation.x = -Math.PI / 2;
  basinWater.position.y = 0.43;
  const spoutPost = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.92, 6), bambooMat);
  spoutPost.position.set(0.32, 0.46, -0.18);
  const spoutArm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.48, 6), bambooMat);
  spoutArm.rotation.z = Math.PI * 0.42;
  spoutArm.position.set(0.14, 0.84, -0.14);
  const shishiPivot = new THREE.Group();
  shishiPivot.position.set(-0.08, 0.54, 0);
  const rockerTube = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.68, 6), bambooMat);
  rockerTube.rotation.z = Math.PI / 2;
  shishiPivot.add(rockerTube);
  fountainGroup.add(basin, basinWater, spoutPost, spoutArm, shishiPivot);
  root.add(fountainGroup);

  // Vintage Japanese Commuter Bicycle (Mamachari) with wicker basket parked outside a Machiya
  const mamachari = new THREE.Group();
  mamachari.position.set(-8.6, 0.07, -17.92);
  mamachari.rotation.y = 0.14;
  const bikeTireMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.88 });
  const bikeFrameMat = new THREE.MeshStandardMaterial({ color: 0x2f5e4e, roughness: 0.38, metalness: 0.35 });
  const basketMat = new THREE.MeshStandardMaterial({ color: 0xb4844e, roughness: 0.85 });
  [-0.44, 0.44].forEach((wx) => {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 6, 12), bikeTireMat);
    wheel.position.set(wx, 0.27, 0);
    mamachari.add(wheel);
  });
  const frameBar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 6), bikeFrameMat);
  frameBar.rotation.z = Math.PI / 2 + 0.16;
  frameBar.position.set(0, 0.48, 0);
  const seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 6), bikeFrameMat);
  seatTube.position.set(-0.24, 0.54, 0);
  const handlePost = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.54, 6), bikeFrameMat);
  handlePost.position.set(0.32, 0.58, 0);
  const handleGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 6), darkCedarMat);
  handleGrip.rotation.x = Math.PI / 2;
  handleGrip.position.set(0.32, 0.84, 0);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.32), basketMat);
  basket.position.set(0.46, 0.72, 0);
  mamachari.add(frameBar, seatTube, handlePost, handleGrip, basket);
  root.add(mamachari);

  // Phase 5: Outdoor-only living Kyoto detail group (mamachari cyclists + strolling kimono girls)
  const japanOutdoorGroup = new THREE.Group();
  japanOutdoorGroup.name = 'japan_outdoor_only';
  japanOutdoorGroup.userData.outdoorOnly = true;
  japanOutdoorGroup.userData.noMerge = true;
  root.add(japanOutdoorGroup);

  // Phase A: 3 Smooth Detailed Kyoto Mamachari Cycling NPCs (tubular frame, 8-spoke wheels, articulated pedaling rider)
  interface KyotoCyclistTrack {
    cyclist: KyotoCyclistInstance;
    u: number;
    laneZ: number;
    dir: 1 | -1;
    speed: number;
    turnSign: 1 | -1;
  }
  const kyotoCyclists: KyotoCyclistTrack[] = [];
  const cyclistSpecs: Array<{ u: number; laneZ: number; dir: 1 | -1; speed: number; turnSign: 1 | -1; frameHex: number; jacketHex: number }> = [
    { u: -18, laneZ: -10.6, dir: 1, speed: 3.4, turnSign: -1, frameHex: 0x2f5e4e, jacketHex: 0x3b82f6 },
    { u: 14, laneZ: -14.1, dir: -1, speed: 3.1, turnSign: 1, frameHex: 0x991b1b, jacketHex: 0xf59e0b },
    { u: -34, laneZ: -11.4, dir: 1, speed: 3.6, turnSign: -1, frameHex: 0x334155, jacketHex: 0x10b981 },
  ];
  cyclistSpecs.forEach((cs, idx) => {
    const cyclist = createKyotoCyclist({
      frameHex: cs.frameHex,
      jacketHex: cs.jacketHex,
      seed: idx + 1,
    });
    japanOutdoorGroup.add(cyclist.group);
    kyotoCyclists.push({
      cyclist,
      u: cs.u,
      laneZ: cs.laneZ,
      dir: cs.dir,
      speed: cs.speed,
      turnSign: cs.turnSign,
    });
  });

  // Phase A: Articulated Strolling Cluster of 3 Kimono Girls (bone-parented kanzashi pins + rain wagasa umbrellas)
  interface KimonoGirl {
    rig: ArticulatedOutdoorNpcRig;
    wagasaGroup: THREE.Group;
    offsetX: number;
    offsetZ: number;
    phase: number;
  }
  const kimonoGirls: KimonoGirl[] = [];
  const kimonoClusterGroup = new THREE.Group();
  kimonoClusterGroup.userData.outdoorOnly = true;
  kimonoClusterGroup.userData.noMerge = true;
  kimonoClusterGroup.userData.skipStaticBatch = true;
  japanOutdoorGroup.add(kimonoClusterGroup);

  const wagasaShaftGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.92, 6);
  const wagasaCanopyGeo = new THREE.ConeGeometry(0.58, 0.18, 12);
  const wagasaShaftMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.72 });
  const kanzashiMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.32, metalness: 0.65 });
  const kimonoSpecs = [
    { ox: -0.78, oz: -0.18, main: 0xf472b6, obi: 0xfef08a, wagasa: 0xdc2626 },
    { ox: 0.0, oz: 0.12, main: 0x38bdf8, obi: 0xf43f5e, wagasa: 0x7c3aed },
    { ox: 0.76, oz: -0.1, main: 0xc084fc, obi: 0xfb923c, wagasa: 0xec4899 },
  ];
  kimonoSpecs.forEach((ks, idx) => {
    const rig = createArticulatedOutdoorNpc({
      shirtHex: ks.main,
      pantsHex: ks.main,
      skinHex: 0xf1d2be,
      hairHex: 0x171514,
      shoeHex: 0x92400e,
      hairStyle: 'bun',
      isKimono: true,
      obiHex: ks.obi,
    });

    // Gold kanzashi hair pin parented strictly to headwear slot
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 5), kanzashiMat);
    pin.rotation.z = 0.7;
    pin.position.set(0.04, 0.0, -0.09);
    rig.slots.headwear.add(pin);

    // Traditional Kyoto oiled-paper wagasa umbrella parented strictly to leftHandProp slot
    const wagasaGroup = new THREE.Group();
    const wShaft = new THREE.Mesh(wagasaShaftGeo, wagasaShaftMat);
    wShaft.position.y = 0.46;
    const wCanopy = new THREE.Mesh(
      wagasaCanopyGeo,
      new THREE.MeshStandardMaterial({ color: ks.wagasa, roughness: 0.62, side: THREE.DoubleSide })
    );
    wCanopy.position.y = 0.92;
    wagasaGroup.add(wShaft, wCanopy);
    wagasaGroup.rotation.x = 1.05;
    wagasaGroup.visible = false;
    rig.slots.leftHandProp.add(wagasaGroup);

    rig.root.position.set(ks.ox, 0.08, ks.oz);
    kimonoClusterGroup.add(rig.root);

    kimonoGirls.push({
      rig,
      wagasaGroup,
      offsetX: ks.ox,
      offsetZ: ks.oz,
      phase: idx * 1.4,
    });
  });

  // Phase 3: Animated Kyoto machiya sliding hikido/shoji doors + recessed genkan + outdoor NPCs
  const machiyaDoorPlacements = [1, 2, 3, 4].map((idx) => ({
    x: machiyaXs[idx],
    z: -18.25,
    facingZ: 1 as const,
    width: 1.22,
    height: 1.96,
    seed: idx * 11 + 5,
  }));
  const acrossMachiyaDoors = createAnimatedDoorwayCluster(
    'japanese_tranquility',
    'kyoto_machiya_slide',
    machiyaDoorPlacements
  );
  root.add(acrossMachiyaDoors.group);

  const ctx = addSurrounding360Context(root, 'japanese_tranquility');
  disableShadowsRecursive(root);

  return {
    id: 'japanese_tranquility',
    root,
    outdoorOnlyGroup: japanOutdoorGroup,
    doorways: [...acrossMachiyaDoors.anchors, ...ctx.doorways],
    envHint: {
      fogColorDay: 0xfce7f3,
      fogColorNight: 0x111525,
      fogDensityScale: 0.86,
    },
    update: (dt, elapsed, isNight, climateState, weather, isPlayerOutside) => {
      const outside = isPlayerOutside ?? true;
      const isRaining = weather.startsWith('rainy');
      ctx.update(isNight, climateState, elapsed, dt, isRaining, outside);
      acrossMachiyaDoors.update(dt, elapsed, isNight, isRaining, outside);
      shojiMat.emissiveIntensity = isNight ? 1.5 : 0.25;
      machiyaWallMat.emissiveIntensity = isNight ? 1.35 : 0.16;
      lanternMat.emissiveIntensity = isNight ? 2.2 : 0.72;
      toroFlameMat.emissiveIntensity = isNight ? 2.1 : 0.4;
      stoneLaneMat.roughness = weather.startsWith('rainy') ? 0.24 : 0.78;
      sakuraFireflyMat.color.setHex(isNight ? 0xfde047 : 0xf9a8d4);
      sakuraFireflyMat.size = isNight ? 0.38 : 0.28;
      sakuraFireflyMat.opacity = isNight ? 0.76 + Math.sin(elapsed * 3.5) * 0.2 : 0.86;

      // Gentle breeze swaying wind chimes, Nobori shrine banners & periodic Shishi-Odoshi bamboo tip
      for (let i = 0; i < chimeStrips.length; i++) {
        chimeStrips[i].rotation.z = Math.sin(elapsed * 2.2 + i * 1.1) * 0.18;
      }
      for (let i = 0; i < noboriBanners.length; i++) {
        noboriBanners[i].rotation.y = Math.sin(elapsed * 1.85 + i * 0.9) * 0.18;
      }
      const tipCycle = elapsed % 5.5;
      shishiPivot.rotation.z =
        tipCycle > 4.6 ? -0.45 * Math.sin(((tipCycle - 4.6) / 0.9) * Math.PI) : 0.22;

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

      if (!outside) return;

      // Animate 3 smooth Kyoto mamachari cyclists gliding through both T-junction turns
      for (let i = 0; i < kyotoCyclists.length; i++) {
        const cyc = kyotoCyclists[i];
        cyc.u += cyc.dir * cyc.speed * dt;
        const bound = 48;
        if (cyc.dir === 1 && cyc.u > bound) cyc.u = -bound;
        if (cyc.dir === -1 && cyc.u < -bound) cyc.u = bound;
        const pose = evaluateCornerTurnPath(cyc.u, cyc.laneZ, cyc.dir, 29.0, 4.6, cyc.turnSign);
        cyc.cyclist.group.position.set(pose.x, 0.06, pose.z);
        cyc.cyclist.group.rotation.y = pose.vehicleYaw;
        updateKyotoCyclist(cyc.cyclist, dt, elapsed, cyc.speed);
      }

      // Animate articulated strolling cluster of 3 kimono girls along far stone Kyoto sidewalk
      const clusterPeriod = 46;
      const clusterPhase = (elapsed * 0.85) % (clusterPeriod * 2);
      const goingRight = clusterPhase < clusterPeriod;
      const frac = goingRight ? clusterPhase / clusterPeriod : (clusterPeriod * 2 - clusterPhase) / clusterPeriod;
      const cx = -21 + frac * 42;
      kimonoClusterGroup.position.set(cx, 0, -16.85);
      kimonoClusterGroup.rotation.y = goingRight ? Math.PI / 2 : -Math.PI / 2;

      for (let i = 0; i < kimonoGirls.length; i++) {
        const kg = kimonoGirls[i];
        kg.rig.root.position.set(kg.offsetX, 0.08, kg.offsetZ);
        kg.wagasaGroup.visible = isRaining;
        updateArticulatedNpcPose(kg.rig, dt, {
          mode: 'walk',
          elapsed,
          phase: kg.phase,
          speed: 0.72,
          holdingLeftProp: isRaining,
        });
      }
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

  // Continuous Sculpted Multi-Tiered Rio Hillside Terrain Mesh matching getFavelaHillHeight(x, z)
  // Guarantees 100% deterministic house grounding (zero floating homes, zero buried windows/doors!)
  const favelaTerrainGeo = new THREE.PlaneGeometry(118, 36, 36, 14);
  favelaTerrainGeo.rotateX(-Math.PI / 2);
  const fPos = favelaTerrainGeo.attributes.position as THREE.BufferAttribute;
  const fCols = new Float32Array(fPos.count * 3);
  const lushCol = new THREE.Color(0x2f6838);
  const earthCol = new THREE.Color(0x7c5338);
  const rockSlopeCol = new THREE.Color(0x57534e);
  const tmpFc = new THREE.Color();
  for (let i = 0; i < fPos.count; i++) {
    const vx = fPos.getX(i);
    const localZ = fPos.getZ(i); // +18 (curb side) .. -18 (far ridge)
    const worldZ = localZ - 35.5; // -17.5 .. -53.5
    const vy = getFavelaHillHeight(vx, worldZ);
    fPos.setY(i, vy);
    const blend = Math.max(0, Math.min(1, vy / 16));
    if (blend < 0.32) {
      tmpFc.lerpColors(rockSlopeCol, earthCol, blend / 0.32);
    } else {
      tmpFc.lerpColors(earthCol, lushCol, (blend - 0.32) / 0.68);
    }
    fCols[i * 3] = tmpFc.r;
    fCols[i * 3 + 1] = tmpFc.g;
    fCols[i * 3 + 2] = tmpFc.b;
  }
  favelaTerrainGeo.translate(0, 0, -35.5);
  favelaTerrainGeo.setAttribute('color', new THREE.BufferAttribute(fCols, 3));
  favelaTerrainGeo.computeVertexNormals();
  const hillsideTerrain = new THREE.Mesh(
    favelaTerrainGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, flatShading: true })
  );
  hillsideTerrain.userData.alwaysVisibleBackdrop = true;
  root.add(hillsideTerrain);

  // Shimmering Guanabara Bay ocean vista on right-center horizon
  const bayMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.22,
    metalness: 0.28,
  });
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(210, 140), bayMat);
  bay.rotation.x = -Math.PI / 2;
  bay.position.set(16, -6.0, -96);
  bay.userData.alwaysVisibleBackdrop = true;
  root.add(bay);

  // Authentic Textured Favela Homes (with plaster/brick + glowing evening windows + -4.5 concrete retaining plinths!)
  const favelaTex = createProceduralFacadeTextures('favela', '#f1f5f9', '#fbbf24');
  const houseMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: favelaTex?.map,
    emissive: 0xfde68a,
    emissiveMap: favelaTex?.emissiveMap,
    emissiveIntensity: 0.22,
    roughness: 0.86,
  });
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x6b7075,
    roughness: 0.94,
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

  const FAVELA_ALLEY_STAIR_XS = [-18.5, -5.2, 6.2, 26.8] as const;
  const isHouseBlockingAlleyCorridor = (hx: number, hz: number, w: number, d: number): boolean => {
    const halfW = w * 0.5;
    const halfD = d * 0.5;
    // Check front, center, and back Z planes of the house against each winding Selarón staircase corridor
    const sampleZs = [hz - halfD, hz, hz + halfD];
    for (let s = 0; s < FAVELA_ALLEY_STAIR_XS.length; s++) {
      const sx = FAVELA_ALLEY_STAIR_XS[s];
      for (let zi = 0; zi < sampleZs.length; zi++) {
        const sz = sampleZs[zi];
        if (sz > -16.2 || sz < -36.0) continue;
        const stepApprox = Math.max(0, Math.min(18, (-17.6 - sz) / 0.922));
        const stairCenterX = sx + Math.sin(stepApprox * 0.38) * 1.15;
        // Clear 1.45u half-corridor around the 1.5u-wide staircase so downhill walkers NEVER touch a wall!
        if (Math.abs(hx - stairCenterX) < halfW + 1.45) {
          return true;
        }
      }
    }
    return false;
  };

  for (let tier = 0; tier < 7; tier++) {
    for (let col = 0; col < 25; col++) {
      const idx = tier * 25 + col;
      const hx = -45 + col * 3.65 + (tier % 2) * 1.15;
      // Fill lower slopes densely across the entire ridge; keep ONLY an upper scenic window
      // (tier >= 2 and hx between 8.5 and 22.5) open to Guanabara Bay, Sugarloaf & Christ!
      if (tier >= 2 && hx > 8.5 && hx < 22.5) continue;
      const hz = -19.2 - tier * 3.65 - ((idx * 3) % 3) * 0.35;
      const w = 2.75 + (idx % 3) * 0.62;
      const h = 2.45 + (idx % 4) * 0.54;
      const d = 2.55 + (idx % 2) * 0.52;
      // Carve clean open downhill alleyway corridors around every Selarón mosaic staircase!
      if (isHouseBlockingAlleyCorridor(hx, hz, w, d)) continue;
      // Exact terrain elevation snap at downhill corner + anti-burial floor elevation
      const hy = computeFavelaHouseFloorY(hx, hz, d);
      houseSpecs.push({
        x: hx,
        y: hy,
        z: hz,
        w,
        h,
        d,
        rotY: ((idx % 3) - 1) * 0.06,
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

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const houses = new THREE.InstancedMesh(unitBox, houseMat, houseSpecs.length);
  const plinths = new THREE.InstancedMesh(unitBox, plinthMat, houseSpecs.length);
  const roofs = new THREE.InstancedMesh(unitBox, roofMat, houseSpecs.length);
  const tankCount = houseSpecs.filter((hs) => hs.hasTank).length;
  const waterTanks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.42, 0.36, 0.62, 8),
    waterTankMat,
    tankCount
  );

  const dummy = new THREE.Object3D();
  let tankIdx = 0;
  const plinthDepth = 4.5;
  houseSpecs.forEach((hs, idx) => {
    // Concrete retaining-wall / stilt foundation skirt reaching -4.5 units straight into the hillside
    dummy.position.set(hs.x, hs.y - plinthDepth * 0.5 + 0.04, hs.z);
    dummy.rotation.set(0, hs.rotY, 0);
    dummy.scale.set(hs.w * 0.98, plinthDepth, hs.d * 0.98);
    dummy.updateMatrix();
    plinths.setMatrixAt(idx, dummy.matrix);

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
  plinths.instanceMatrix.needsUpdate = true;
  houses.instanceMatrix.needsUpdate = true;
  if (houses.instanceColor) houses.instanceColor.needsUpdate = true;
  roofs.instanceMatrix.needsUpdate = true;
  waterTanks.instanceMatrix.needsUpdate = true;
  houses.userData.alwaysVisibleBackdrop = true;
  plinths.userData.alwaysVisibleBackdrop = true;
  root.add(plinths, houses, roofs, waterTanks);

  // Vibrant Selarón-style colorful mosaic staircases (Escadarias) centered in open carved downhill alleys
  const mosaicMats = [
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 }),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.65 }),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.65 }),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 }),
  ];
  const alleyCurbMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.88 });
  const upperConcealPalette = [0xe07a5f, 0x0d9488, 0xeab308, 0xec4899];
  const mainTreadGeo = new THREE.BoxGeometry(
    1.66,
    FAVELA_STAIR_TREAD_HEIGHT,
    FAVELA_STAIR_TREAD_DEPTH
  );
  const sideCurbGeo = new THREE.BoxGeometry(0.18, 0.56, FAVELA_STAIR_TREAD_DEPTH + 0.04);
  const curvedTreadGeo = new THREE.BoxGeometry(1.62, FAVELA_STAIR_TREAD_HEIGHT, 0.5);

  FAVELA_ALLEY_STAIR_XS.forEach((sx, sIdx) => {
    const upperTurnDir = getFavelaUpperCurveDir(sx);
    // Main 32-step compact human-scale winding Selarón mosaic ascent (~0.21m riser height) up to z = -32.6
    for (let step = 0; step < FAVELA_STAIR_STEP_COUNT; step++) {
      const stepT = step / FAVELA_STAIR_STEP_COUNT;
      const tz = FAVELA_STAIR_START_Z + (FAVELA_STAIR_END_Z - FAVELA_STAIR_START_Z) * stepT;
      const tx = getFavelaStairCenterX(sx, stepT);
      const ty = getFavelaHillHeight(tx, tz) + FAVELA_STAIR_TREAD_Y_OFFSET;
      const tread = new THREE.Mesh(
        mainTreadGeo,
        mosaicMats[(sIdx + step) % mosaicMats.length]
      );
      tread.position.set(tx, ty, tz);
      root.add(tread);

      // Low plastered side curbs framing the stepped alleyway cleanly
      [-0.92, 0.92].forEach((sideOffset) => {
        const curb = new THREE.Mesh(sideCurbGeo, alleyCurbMat);
        curb.position.set(tx + sideOffset, ty + 0.12, tz);
        root.add(curb);
      });
    }

    // Upper 90-degree curved 8-step compact mosaic landing bending laterally behind the 2-story flanking corner house
    const topBaseX = getFavelaStairCenterX(sx, 1);
    const topBaseZ = FAVELA_STAIR_END_Z;
    const topBaseY = getFavelaHillHeight(topBaseX, topBaseZ) + FAVELA_STAIR_TREAD_Y_OFFSET;
    const upperCurveR = 1.65;
    for (let cStep = 0; cStep < FAVELA_UPPER_CURVE_STEP_COUNT; cStep++) {
      const ct = (cStep + 0.5) / FAVELA_UPPER_CURVE_STEP_COUNT;
      const theta = ct * (Math.PI * 0.5);
      const cx = topBaseX + upperTurnDir * upperCurveR * (1 - Math.cos(theta));
      const cz = topBaseZ - Math.sin(theta) * upperCurveR;
      const cy = topBaseY + ct * 0.72;
      const curvedTread = new THREE.Mesh(
        curvedTreadGeo,
        mosaicMats[(sIdx + FAVELA_STAIR_STEP_COUNT + cStep) % mosaicMats.length]
      );
      curvedTread.position.set(cx, cy, cz);
      curvedTread.rotation.y = upperTurnDir * theta;
      root.add(curvedTread);
    }

    // Concealing 2-Story Hillside Corner House positioned directly in front of the lateral exit path.
    // Anchored above topBaseY and widened to 5.4m so climbing/descending residents vanish 100% head-to-toe behind real architecture!
    const houseX = topBaseX + upperTurnDir * 3.35;
    const houseZ = topBaseZ - 0.15;
    const houseFloorY = Math.max(
      computeFavelaHouseFloorY(houseX, houseZ, 3.4) - 0.15,
      topBaseY - 0.35
    );
    const cornerHouseGroup = new THREE.Group();
    const cornerHouseMat = new THREE.MeshStandardMaterial({
      color: upperConcealPalette[sIdx % upperConcealPalette.length],
      map: favelaTex?.map,
      emissive: 0xfde68a,
      emissiveMap: favelaTex?.emissiveMap,
      emissiveIntensity: 0.22,
      roughness: 0.85,
    });
    const cornerPlinth = new THREE.Mesh(new THREE.BoxGeometry(5.3, 6.2, 3.3), plinthMat);
    cornerPlinth.position.set(houseX, houseFloorY - 3.05, houseZ);
    const cornerBody = new THREE.Mesh(new THREE.BoxGeometry(5.4, 5.4, 3.4), cornerHouseMat);
    cornerBody.position.set(houseX, houseFloorY + 2.7, houseZ);
    const cornerRoof = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.2, 3.7), roofMat);
    cornerRoof.position.set(houseX, houseFloorY + 5.46, houseZ);
    cornerRoof.rotation.x = 0.08;
    const cornerTank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.38, 0.65, 8),
      waterTankMat
    );
    cornerTank.position.set(houseX + 0.95, houseFloorY + 5.82, houseZ - 0.35);
    // Low side parapet wall flanking the curved upper turn
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.25, 0.24), alleyCurbMat);
    parapet.position.set(topBaseX + upperTurnDir * 1.25, topBaseY + 1.22, topBaseZ - upperCurveR - 0.95);
    cornerHouseGroup.add(cornerPlinth, cornerBody, cornerRoof, cornerTank, parapet);
    cornerHouseGroup.userData.alwaysVisibleBackdrop = true;
    root.add(cornerHouseGroup);
  });

  // Colorful street-level favela retaining wall murals
  [
    { x: -12.5, z: -17.65, cols: [0x0ea5e9, 0xfacc15, 0x16a34a] },
    { x: 14.5, z: -17.65, cols: [0xec4899, 0xf97316, 0x0d9488] },
  ].forEach((mural) => {
    mural.cols.forEach((c, idx) => {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.35, 0.14),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.78 })
      );
      panel.position.set(mural.x + (idx - 1) * 1.42, 0.68, mural.z);
      root.add(panel);
    });
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

  // Rooftop colorful laundry clotheslines anchored relative to actual hillside height
  const laundryMats = [
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.85 }),
  ];
  const laundryFlaps: THREE.Mesh[] = [];
  [
    [-14.5, -21.2],
    [-2.5, -21.0],
    [11.5, -20.2],
    [29.5, -21.4],
  ].forEach(([lx, lz]) => {
    const ly = getFavelaHillHeight(lx, lz) + 3.4;
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

  // Tropical foliage, palms & magenta bougainvillea clusters seated cleanly onto hillside elevation
  const palmFoliageMat = new THREE.MeshStandardMaterial({ color: 0x257034, roughness: 0.84 });
  const bougMat = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.82 });
  [
    [-20.5, -19.8, false],
    [-8.4, -23.0, true],
    [4.2, -20.5, true],
    [9.8, -20.6, false],
    [19.2, -21.2, true],
    [24.5, -20.8, false],
    [-14.2, -27.5, true],
    [32.5, -24.5, false],
  ].forEach(([fx, fz, isBoug]) => {
    const bush = new THREE.Mesh(
      new THREE.DodecahedronGeometry(isBoug ? 1.15 : 1.45, 0),
      isBoug ? bougMat : palmFoliageMat
    );
    bush.scale.set(1.2, 0.85, 1.1);
    const fy = getFavelaHillHeight(fx as number, fz as number) + 0.7;
    bush.position.set(fx as number, fy, fz as number);
    root.add(bush);
  });

  // Sugarloaf Mountain (Pão de Açúcar) + sculpted Morro da Urca + ANIMATED Bondinho Cable Car across Guanabara Bay
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 });
  const rioMountMat = createSharedMountainMaterial();
  const rioTier = resolveMountainGraphicsTier();
  const sugarloaf = new THREE.Mesh(new THREE.SphereGeometry(12.2, 14, 12), rockMat);
  sugarloaf.scale.set(0.95, 2.05, 0.95);
  sugarloaf.position.set(22.0, 14.2, -86);
  root.add(sugarloaf);
  const morro = createRidgedPeakMesh(
    {
      seed: 487,
      radiusX: 16.5,
      radiusZ: 14.5,
      height: 23.2,
      baseY: -1.0,
      skirtFloorY: -10,
      ridgeStretch: 0.25,
      palette: MAYON_FOOTHILLS,
      tier: rioTier,
    },
    rioMountMat,
    'rio_morro_da_urca'
  );
  morro.position.set(8.5, 0, -89);
  root.add(morro);

  const cableStart = new THREE.Vector3(8.5, 22.0, -88.2);
  const cableEnd = new THREE.Vector3(22.0, 36.2, -85.8);
  const cableMid = cableStart.clone().lerp(cableEnd, 0.5).add(new THREE.Vector3(0, -1.8, 0));
  root.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([cableStart, cableMid, cableEnd]),
      wireMat
    )
  );
  // Animated Bondinho Glass Cable Car gliding between Morro da Urca and Sugarloaf
  const cableCarGroup = new THREE.Group();
  const cableCarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.2 });
  const cableCarWinMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.6,
    roughness: 0.15,
  });
  const cableHanger = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), rockMat);
  cableHanger.position.y = -0.55;
  const cableCabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.15, 1.15), cableCarMat);
  cableCabin.position.y = -1.45;
  const cableGlass = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.62, 1.2), cableCarWinMat);
  cableGlass.position.y = -1.42;
  cableCarGroup.add(cableHanger, cableCabin, cableGlass);
  root.add(cableCarGroup);

  // Sculpted Corcovado Peak with Unmistakable Art Deco CHRIST THE REDEEMER (Cristo Redentor) in Iconic Outstretched T-Pose
  const corcovado = createRidgedPeakMesh(
    {
      seed: 509,
      radiusX: 18.5,
      radiusZ: 16.5,
      height: 35.0,
      baseY: -1.8,
      skirtFloorY: -10,
      ridgeStretch: 0.22,
      palette: MAYON_FOOTHILLS,
      tier: rioTier,
    },
    rioMountMat,
    'rio_corcovado_peak'
  );
  corcovado.position.set(-12.5, 0, -84);
  root.add(corcovado);

  const cristoGroup = new THREE.Group();
  cristoGroup.position.set(-12.5, 33.2, -84);
  cristoGroup.scale.setScalar(1.28);
  cristoGroup.rotation.y = 0.18; // Facing gently toward the cafe & Guanabara Bay
  const soapstoneMat = new THREE.MeshStandardMaterial({
    color: 0xeae6df,
    emissive: 0xfff3d6,
    emissiveIntensity: 0.32,
    roughness: 0.55,
  });
  const pedestalBaseMat = new THREE.MeshStandardMaterial({
    color: 0xd6d0c4,
    emissive: 0xfde68a,
    emissiveIntensity: 0.18,
    roughness: 0.68,
  });

  // Stepped Art Deco Pedestal
  const pedStep1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 3.6), pedestalBaseMat);
  pedStep1.position.y = 0.55;
  const pedStep2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.9, 2.6), pedestalBaseMat);
  pedStep2.position.y = 2.0;
  const pedCap = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.28, 2.9), soapstoneMat);
  pedCap.position.y = 3.05;
  cristoGroup.add(pedStep1, pedStep2, pedCap);

  // Flowing Robe Torso Column + Sculpted Vertical Drapery Folds
  const robeLower = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.98, 4.4, 10), soapstoneMat);
  robeLower.position.y = 5.35;
  const robeChest = new THREE.Mesh(new THREE.CylinderGeometry(0.94, 0.72, 2.4, 10), soapstoneMat);
  robeChest.scale.set(1.22, 1, 0.78);
  robeChest.position.y = 8.45;
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.82, 0.95), soapstoneMat);
  shoulders.position.y = 9.48;
  // Center vertical robe fold ridge
  const robeFold = new THREE.Mesh(new THREE.BoxGeometry(0.32, 6.2, 0.92), soapstoneMat);
  robeFold.position.set(0, 6.4, 0.25);
  cristoGroup.add(robeLower, robeChest, shoulders, robeFold);

  // Iconic Wide Outstretched T-Pose Arms with Draped Sleeves & Open Hands (spanning ~9.6 units wide!)
  [-1, 1].forEach((side) => {
    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.88, 0.74), soapstoneMat);
    upperArm.position.set(side * 2.15, 9.48, 0);
    const sleeveDrape = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 0.62), soapstoneMat);
    sleeveDrape.position.set(side * 2.0, 9.0, 0);
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.66, 0.62), soapstoneMat);
    forearm.position.set(side * 4.05, 9.52, 0);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.44, 0.34), soapstoneMat);
    hand.position.set(side * 5.2, 9.52, 0.04);
    cristoGroup.add(upperArm, sleeveDrape, forearm, hand);
  });

  // Sculpted Neck & Head tilted slightly downward in blessing
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.48, 8), soapstoneMat);
  neck.position.y = 10.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.66, 10, 8), soapstoneMat);
  head.scale.set(0.88, 1.14, 0.95);
  head.position.set(0, 10.72, 0.12);
  head.rotation.x = 0.2;
  cristoGroup.add(neck, head);

  // Nighttime Upward Warm Monument Floodlight Halo Cones illuminating Christ the Redeemer
  const floodConeMat = new THREE.MeshBasicMaterial({
    color: 0xfef3c7,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  [-1.9, 1.9].forEach((fx) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.8, 11.5, 10, 1, true), floodConeMat);
    cone.position.set(fx * 0.6, 6.2, 1.2);
    cone.rotation.z = fx * 0.12;
    cone.rotation.x = -0.14;
    cristoGroup.add(cone);
  });
  root.add(cristoGroup);

  // Distant Guanabara Bay harbor lights shimmer at night
  const bayLightCount = 55;
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

  // Phase 5: Outdoor-only grounded stepped hillside alleyway walkers (descending & ascending Selarón stairs)
  const favelaOutdoorGroup = new THREE.Group();
  favelaOutdoorGroup.name = 'favela_outdoor_only';
  favelaOutdoorGroup.userData.outdoorOnly = true;
  favelaOutdoorGroup.userData.noMerge = true;
  root.add(favelaOutdoorGroup);

  interface FavelaAlleyWalker {
    group: THREE.Group;
    pelvisPivot: THREE.Group;
    torsoGroup: THREE.Group;
    headPivot: THREE.Group;
    leftHip: THREE.Group;
    leftKnee: THREE.Group;
    leftAnkle: THREE.Group;
    rightHip: THREE.Group;
    rightKnee: THREE.Group;
    rightAnkle: THREE.Group;
    leftShoulder: THREE.Group;
    leftElbow: THREE.Group;
    rightShoulder: THREE.Group;
    rightElbow: THREE.Group;
    alleyBaseX: number;
    u: number;
    direction: 'uphill' | 'downhill';
    approachSign: 1 | -1;
    speed: number;
    phase: number;
  }
  const favelaAlleyWalkers: FavelaAlleyWalker[] = [];
  const favShoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const alleyWalkerSpecs: Array<{
    alleyX: number;
    startU: number;
    direction: 'uphill' | 'downhill';
    approachSign: 1 | -1;
    speed: number;
    shirt: number;
    shorts: number;
    skin: number;
    hair: number;
    hairStyle: 'short' | 'bun' | 'curly';
  }> = [
    { alleyX: -18.5, startU: 0.14, direction: 'uphill', approachSign: 1, speed: 0.044, shirt: 0xfacc15, shorts: 0x1d4ed8, skin: 0xc6865c, hair: 0x171412, hairStyle: 'curly' },
    { alleyX: -5.2, startU: 0.05, direction: 'uphill', approachSign: -1, speed: 0.041, shirt: 0x16a34a, shorts: 0x1e293b, skin: 0xa46944, hair: 0x12100e, hairStyle: 'short' },
    { alleyX: 6.2, startU: 0.46, direction: 'downhill', approachSign: 1, speed: 0.046, shirt: 0xec4899, shorts: 0x0f172a, skin: 0xd9a07c, hair: 0x241712, hairStyle: 'bun' },
    { alleyX: -5.2, startU: 0.62, direction: 'downhill', approachSign: 1, speed: 0.039, shirt: 0x38bdf8, shorts: 0x334155, skin: 0xb87a52, hair: 0x1a1512, hairStyle: 'short' },
    { alleyX: 6.2, startU: 0.18, direction: 'uphill', approachSign: -1, speed: 0.042, shirt: 0xf97316, shorts: 0x1e293b, skin: 0x8d5534, hair: 0x0f0e0d, hairStyle: 'curly' },
  ];
  alleyWalkerSpecs.forEach((ws, idx) => {
    const wg = new THREE.Group();
    const sMat = new THREE.MeshStandardMaterial({ color: ws.shirt, roughness: 0.72 });
    const pMat = new THREE.MeshStandardMaterial({ color: ws.shorts, roughness: 0.82 });
    const skMat = new THREE.MeshStandardMaterial({ color: ws.skin, roughness: 0.68 });
    const hMat = new THREE.MeshStandardMaterial({ color: ws.hair, roughness: 0.84 });

    // Pelvis root raised to exact 0.805m hip-to-sole height so shoes sit flush on every mosaic tread
    const pelvisPivot = new THREE.Group();
    pelvisPivot.position.set(0, 0.805, 0);
    wg.add(pelvisPivot);

    const pelvisMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.09, 4, 8), pMat);
    pelvisMesh.rotation.z = Math.PI / 2;
    pelvisMesh.scale.set(0.76, 1.08, 0.76);
    pelvisPivot.add(pelvisMesh);

    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.04, 0);
    pelvisPivot.add(torsoGroup);

    const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.168, 0.27, 5, 10), sMat);
    torsoMesh.position.y = 0.25;
    torsoMesh.scale.set(1.06, 1.0, 0.74);
    torsoGroup.add(torsoMesh);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.09, 8), skMat);
    neck.position.y = 0.52;
    torsoGroup.add(neck);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.58, 0);
    torsoGroup.add(headPivot);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.138, 10, 8), skMat);
    head.scale.set(0.95, 1.06, 0.96);
    head.position.y = 0.11;
    headPivot.add(head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.146, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hMat
    );
    hair.position.set(0, 0.125, -0.012);
    headPivot.add(hair);
    if (ws.hairStyle === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.072, 8, 7), hMat);
      bun.position.set(0, 0.21, -0.105);
      headPivot.add(bun);
    } else if (ws.hairStyle === 'curly') {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.155, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.48), hMat);
      crown.position.set(0, 0.155, -0.01);
      headPivot.add(crown);
    }

    const buildArticulatedLeg = (sx: number) => {
      const hip = new THREE.Group();
      hip.position.set(sx, -0.02, 0);
      pelvisPivot.add(hip);
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.064, 0.22, 4, 8), pMat);
      thigh.position.y = -0.17;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.set(0, -0.35, 0);
      hip.add(knee);
      const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.25, 4, 8), skMat);
      calf.position.y = -0.18;
      knee.add(calf);

      const ankle = new THREE.Group();
      ankle.position.set(0, -0.36, 0);
      knee.add(ankle);
      const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.09, 4, 7), favShoeMat);
      shoe.rotation.x = Math.PI / 2;
      shoe.position.set(0, -0.02, 0.045);
      ankle.add(shoe);

      return { hip, knee, ankle };
    };

    const leftLeg = buildArticulatedLeg(-0.095);
    const rightLeg = buildArticulatedLeg(0.095);

    const buildArticulatedArm = (sx: number) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(sx, 0.44, 0);
      torsoGroup.add(shoulder);
      const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.14, 4, 8), sMat);
      sleeve.position.y = -0.11;
      shoulder.add(sleeve);

      const elbow = new THREE.Group();
      elbow.position.set(0, -0.23, 0);
      shoulder.add(elbow);
      const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.16, 4, 8), skMat);
      fore.position.y = -0.11;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 7, 6), skMat);
      hand.position.y = -0.23;
      elbow.add(fore, hand);
      return { shoulder, elbow };
    };

    const leftArm = buildArticulatedArm(-0.21);
    const rightArm = buildArticulatedArm(0.21);

    wg.userData.outdoorOnly = true;
    wg.userData.noMerge = true;
    favelaOutdoorGroup.add(wg);

    favelaAlleyWalkers.push({
      group: wg,
      pelvisPivot,
      torsoGroup,
      headPivot,
      leftHip: leftLeg.hip,
      leftKnee: leftLeg.knee,
      leftAnkle: leftLeg.ankle,
      rightHip: rightLeg.hip,
      rightKnee: rightLeg.knee,
      rightAnkle: rightLeg.ankle,
      leftShoulder: leftArm.shoulder,
      leftElbow: leftArm.elbow,
      rightShoulder: rightArm.shoulder,
      rightElbow: rightArm.elbow,
      alleyBaseX: ws.alleyX,
      u: ws.startU,
      direction: ws.direction,
      approachSign: ws.approachSign,
      speed: ws.speed,
      phase: idx * 1.9,
    });
  });

  // Dedicated Brazilian Favela Street Dancer (20-bone Mixamo rig running exact L-R-L-RLR-L-R-L-R 70 BPM clip)
  // Root rotation stays 0 so walk-in/walk-out stays strictly aligned along the sidewalk (dance facing handled internally!)
  const streetDancer = createBrazilianStreetDancerRig();
  streetDancer.root.position.set(-1.6, 0.08, -16.85);
  streetDancer.root.rotation.y = 0;
  favelaOutdoorGroup.add(streetDancer.root);

  const ctx = addSurrounding360Context(root, 'brazilian_favela');
  disableShadowsRecursive(root);

  return {
    id: 'brazilian_favela',
    root,
    outdoorOnlyGroup: favelaOutdoorGroup,
    envHint: {
      fogColorDay: 0xdbeafe,
      fogColorNight: 0x0f172a,
      fogDensityScale: 0.76,
    },
    update: (dt, elapsed, isNight, climateState, weather, isPlayerOutside) => {
      const outside = isPlayerOutside ?? true;
      const isRaining = weather.startsWith('rainy');
      ctx.update(isNight, climateState, elapsed, dt, isRaining, outside);
      houseMat.emissiveIntensity = isNight ? 1.45 : 0.14;
      soapstoneMat.emissiveIntensity = isNight ? 1.85 : 0.24;
      pedestalBaseMat.emissiveIntensity = isNight ? 1.05 : 0.12;
      floodConeMat.opacity = isNight ? 0.16 + Math.sin(elapsed * 1.4) * 0.025 : 0.0;
      cableCarWinMat.emissiveIntensity = isNight ? 1.8 : 0.35;
      bayMat.color.setHex(isNight ? 0x0b2545 : 0x0284c7);
      bayLightsMat.opacity = isNight ? 0.78 + Math.sin(elapsed * 2.5) * 0.14 : 0.0;

      // Smooth Sugarloaf Bondinho cable car travel along parabolic sag curve
      const carT = 0.5 - 0.44 * Math.cos(elapsed * 0.22);
      const cx = cableStart.x + (cableEnd.x - cableStart.x) * carT;
      const cz = cableStart.z + (cableEnd.z - cableStart.z) * carT;
      const cy =
        cableStart.y + (cableEnd.y - cableStart.y) * carT - Math.sin(carT * Math.PI) * 1.8;
      cableCarGroup.position.set(cx, cy, cz);

      for (let i = 0; i < laundryFlaps.length; i++) {
        laundryFlaps[i].rotation.x = Math.sin(elapsed * 2.4 + i * 0.9) * 0.22;
      }

      if (!outside) {
        streetDancer.update(dt, elapsed, isNight, false);
        return;
      }

      // Advance dedicated 20-bone Mixamo Brazilian L-R-L-RLR special boombox NPC exclusively while outdoors
      streetDancer.update(dt, elapsed, isNight, true);

      // Realistic Passerby -> Mosaic Stair Climb -> Curved Concealed Upper Building Lifecycle (ping-pong, zero popping!)
      for (let i = 0; i < favelaAlleyWalkers.length; i++) {
        const w = favelaAlleyWalkers[i];
        // Sample current phase so sidewalk (long off-screen span) and stairs move at natural ~1.15 m/s ground speed
        const prePose = evaluateFavelaAlleyLifecycle(w.u, w.alleyBaseX, w.direction, w.approachSign);
        const phaseSpeedScale =
          prePose.phaseKind === 'sidewalk'
            ? 0.42
            : prePose.phaseKind === 'stairs'
            ? 0.84
            : 0.72;
        w.u += w.speed * phaseSpeedScale * dt;
        if (w.u >= 1.0) {
          w.u = w.u - 1.0;
          // Ping-pong direction while 100% hidden behind the upper corner house or past ±31m off-screen!
          if (w.direction === 'uphill') {
            w.direction = 'downhill';
            w.approachSign = (w.approachSign * -1) as 1 | -1;
          } else {
            w.direction = 'uphill';
          }
        }
        const pose = evaluateFavelaAlleyLifecycle(w.u, w.alleyBaseX, w.direction, w.approachSign);
        w.group.position.set(pose.x, pose.y, pose.z);
        w.group.rotation.y = pose.yaw;
        // Never vanish in view: only cull when fully tucked behind the upper corner house or past far street edge
        w.group.visible = !pose.isConcealed && Math.abs(pose.x) <= 30.5;

        // Step-synced stair kinematics: 1 physical mosaic step = PI rad (1 exact alternating footfall per step!)
        const onStairs = pose.phaseKind === 'stairs' || pose.phaseKind === 'upper_curve';
        const gaitPhase = onStairs
          ? pose.stepIndex * Math.PI + (w.direction === 'downhill' ? Math.PI * 0.15 : 0)
          : elapsed * 5.6 + w.phase;
        const gait = computeArticulatedWalkGait({
          phase: gaitPhase,
          speedNorm: onStairs ? (w.direction === 'uphill' ? 0.94 : 0.9) : 0.96,
          slopePitch: pose.slopePitch,
          lateralTurnRate: pose.lateralTurnRate,
        });

        // Ground sneakers flush on compact 0.21m treads with subtle clearance while stepping over riser lips
        const stairClearanceY = onStairs ? (w.direction === 'uphill' ? 0.018 : 0.012) : 0;
        w.pelvisPivot.position.y = 0.805 + stairClearanceY + gait.pelvisBobY;
        w.pelvisPivot.rotation.z = gait.pelvisRollZ;
        w.pelvisPivot.rotation.y = gait.pelvisYawY;
        w.torsoGroup.rotation.x = gait.torsoPitchX;
        w.torsoGroup.rotation.y = gait.torsoYawY;
        w.torsoGroup.rotation.z = gait.torsoBankZ;
        w.headPivot.rotation.y = Math.sin(elapsed * 0.8 + w.phase) * 0.14 - gait.torsoYawY * 0.45;
        w.headPivot.rotation.x = -pose.slopePitch * 0.24 + gait.secondaryBounce * 0.22;

        w.leftHip.rotation.x = gait.leftHipX;
        w.rightHip.rotation.x = gait.rightHipX;
        w.leftKnee.rotation.x = gait.leftKneeX;
        w.rightKnee.rotation.x = gait.rightKneeX;
        w.leftAnkle.rotation.x = gait.leftAnkleX;
        w.rightAnkle.rotation.x = gait.rightAnkleX;

        w.leftShoulder.rotation.x = gait.leftShoulderX;
        w.rightShoulder.rotation.x = gait.rightShoulderX;
        w.leftElbow.rotation.x = gait.leftElbowX;
        w.rightElbow.rotation.x = gait.rightElbowX;
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
