// Phase 4: Adaptive 3D Cat Cosmetics Builder
// Attaches all 10 low-poly cosmetics to standardized cat rig sockets:
//   - anchor_eyes
//   - anchor_head_top
//   - anchor_neck
//   - anchor_torso
//   - anchor_spine_points (4 dorsal ridge nodes along neck -> mid-back -> lower-back -> tail-base)
// Preloads meshes once per cat rig and toggles `.visible` (zero mid-shift allocations/disposals).

import * as THREE from 'three';
import {
  CAT_FIT_PROFILES,
  CatCosmeticId,
  CatFitProfile,
  CatLoadout,
  getCatFitProfile,
  getEffectiveVisibleLoadout,
} from './catCosmeticsData';
import { CafeCatId } from './rules';

export interface CatCosmeticSockets {
  anchorEyes: THREE.Group;
  anchorHeadTop: THREE.Group;
  anchorNeck: THREE.Group;
  anchorTorso: THREE.Group;
  anchorSpinePoints: THREE.Group[]; // 4 nodes along dorsal spine
}

export interface CatCosmeticRigController {
  applyLoadout: (loadout: CatLoadout | undefined) => void;
  setBaseCollarVisible?: (visible: boolean) => void;
  dispose: () => void;
}

const KNIT_TEXTURE_CACHE = new Map<string, THREE.CanvasTexture>();

function getKnitClothTexture(hexColor: string, torsoScale: [number, number, number]): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const repeatX = Number((2.2 * torsoScale[0]).toFixed(2));
  const repeatY = Number((2.2 * torsoScale[2]).toFixed(2));
  const cacheKey = `${hexColor}|${repeatX}|${repeatY}`;
  const cached = KNIT_TEXTURE_CACHE.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, 128, 128);

  // Warm woven knit rib pattern
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 128; y += 16) {
    for (let x = 0; x < 128; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 4);
      ctx.lineTo(x + 8, y + 12);
      ctx.lineTo(x + 14, y + 4);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(30, 18, 12, 0.14)';
  ctx.lineWidth = 1.5;
  for (let y = 8; y < 128; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  KNIT_TEXTURE_CACHE.set(cacheKey, tex);
  return tex;
}

function buildRoundGlassesMesh(profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const hs = profile.headScale;
  g.scale.set(hs * profile.eyeWidth, hs, hs);
  g.position.set(0, 0, profile.furOffset);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x3a2417,
    roughness: 0.35,
    metalness: 0.45,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.34,
    roughness: 0.1,
    metalness: 0.15,
  });

  const rimGeo = new THREE.TorusGeometry(0.025, 0.0042, 8, 18);
  const lensGeo = new THREE.CircleGeometry(0.022, 16);

  [-0.032, 0.032].forEach((x) => {
    const rim = new THREE.Mesh(rimGeo, frameMat);
    rim.position.set(x, 0, 0);
    g.add(rim);

    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(x, 0, 0.001);
    g.add(lens);
  });

  // Nose bridge
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.005, 0.005), frameMat);
  bridge.position.set(0, 0.004, 0);
  g.add(bridge);

  // Subtle temples
  const armGeo = new THREE.BoxGeometry(0.004, 0.005, 0.068);
  [-0.056, 0.056].forEach((x) => {
    const arm = new THREE.Mesh(armGeo, frameMat);
    arm.position.set(x, 0.003, -0.032);
    g.add(arm);
  });

  return g;
}

function buildThuglifeGlassesMesh(profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const hs = profile.headScale;
  g.scale.set(hs * profile.eyeWidth, hs, hs);
  g.position.set(0, 0.002, profile.furOffset + 0.004);

  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x0b0b0c,
    roughness: 0.25,
    metalness: 0.2,
  });
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Top horizontal pixel bar
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.012, 0.01), blackMat);
  topBar.position.set(0, 0.012, 0);
  g.add(topBar);

  // Stepped 8-bit pixel lenses (left & right)
  [-0.035, 0.035].forEach((cx) => {
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.012, 0.01), blackMat);
    mid.position.set(cx, 0, 0);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.01, 0.01), blackMat);
    bot.position.set(cx, -0.01, 0);
    g.add(mid, bot);

    // Classic diagonal white pixel glint squares
    const px1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.004), whiteMat);
    px1.position.set(cx - 0.011, 0.006, 0.005);
    const px2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.004), whiteMat);
    px2.position.set(cx - 0.002, -0.002, 0.005);
    g.add(px1, px2);
  });

  // Side arms
  const armGeo = new THREE.BoxGeometry(0.007, 0.01, 0.072);
  [-0.06, 0.06].forEach((x) => {
    const arm = new THREE.Mesh(armGeo, blackMat);
    arm.position.set(x, 0.01, -0.034);
    g.add(arm);
  });

  return g;
}

function buildGoldChainMesh(profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const s = profile.neckRadius + profile.furOffset;
  g.scale.set(s, s, s);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffc940,
    metalness: 0.9,
    roughness: 0.2,
    emissive: 0x6b4700,
    emissiveIntensity: 0.14,
  });

  // Chunky Cuban-link gold collar torus with individual link beads
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.011, 8, 20), goldMat);
  ring.rotation.x = Math.PI * 0.44;
  g.add(ring);

  const linkGeo = new THREE.BoxGeometry(0.018, 0.012, 0.014);
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const link = new THREE.Mesh(linkGeo, goldMat);
    link.position.set(Math.cos(angle) * 0.079, -Math.sin(angle) * 0.012, Math.sin(angle) * 0.079);
    link.rotation.y = -angle;
    g.add(link);
  }

  // Front circular espresso-bean gold medallion
  const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.007, 14), goldMat);
  pendant.rotation.x = Math.PI / 2;
  pendant.position.set(0, -0.032, 0.082);
  g.add(pendant);

  return g;
}

function buildBeretMesh(profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const hs = profile.headScale;
  g.scale.set(hs, hs, hs);
  g.position.set(0.012, 0.012 + profile.furOffset, -0.006);
  g.rotation.z = -0.22; // Jaunty Parisian barista tilt
  g.rotation.x = -0.08;

  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d23, // Cozy Bordeaux espresso velvet
    roughness: 0.88,
    metalness: 0.02,
  });
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0x2b1b15,
    roughness: 0.72,
  });

  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.082, 16, 12), feltMat);
  crown.scale.set(1.18, 0.42, 1.14);
  crown.position.set(0, 0.026, 0);
  g.add(crown);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.072, 0.018, 16), bandMat);
  rim.position.set(0, 0.006, 0);
  g.add(rim);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.024, 6), feltMat);
  stem.position.set(0, 0.066, 0);
  stem.rotation.z = 0.25;
  g.add(stem);

  return g;
}

function buildClothVestMesh(
  hexColor: string,
  profile: CatFitProfile
): THREE.Group {
  const g = new THREE.Group();
  const [tx, ty, tz] = profile.torsoScale;
  const f = 1 + profile.furOffset * 3.5;
  g.scale.set(tx * f, ty * f, tz * f);

  const tex = getKnitClothTexture(hexColor, [tx, ty, tz]);
  const clothMat = new THREE.MeshStandardMaterial({
    color: tex ? 0xffffff : hexColor,
    map: tex ?? undefined,
    roughness: 0.86,
    metalness: 0.02,
  });

  // Cozy sweater vest wrapping cat barrel smoothly with rolled collar & rear hem
  const vest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.104, 0.112, 0.26, 16, 1, false),
    clothMat
  );
  vest.rotation.x = Math.PI / 2;
  vest.scale.set(0.96, 1, 0.94);
  g.add(vest);

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xfaf5ee,
    roughness: 0.9,
  });
  const frontTrim = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.012, 8, 16), trimMat);
  frontTrim.position.set(0, 0, 0.125);
  const backTrim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.011, 8, 16), trimMat);
  backTrim.position.set(0, 0, -0.125);
  g.add(frontTrim, backTrim);

  return g;
}

function buildDinoHeadHood(profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const hs = profile.headScale + profile.furOffset * 2.0;
  g.scale.set(hs, hs, hs);
  g.position.set(0, -0.012, -0.008);

  const dinoGreen = new THREE.MeshStandardMaterial({
    color: 0x3d9957,
    roughness: 0.78,
  });
  const ridgeYellow = new THREE.MeshStandardMaterial({
    color: 0xf4c44e,
    roughness: 0.65,
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfaf5ee, roughness: 0.5 });
  const eyeDark = new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: 0.2 });

  // Plush dino cowl framing the top and back of the cat's head (keeps cat face visible!)
  const cowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.118, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    dinoGreen
  );
  cowl.rotation.x = -0.32;
  cowl.position.set(0, 0.01, -0.008);
  g.add(cowl);

  // Cute chunky T-Rex upper snout perched above cat's brow
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.054, 0.095), dinoGreen);
  snout.position.set(0, 0.072, 0.075);
  snout.rotation.x = 0.08;
  g.add(snout);

  // Tiny plush white teeth under upper snout brow
  const toothGeo = new THREE.ConeGeometry(0.009, 0.018, 4);
  toothGeo.rotateX(Math.PI);
  [-0.038, -0.014, 0.014, 0.038].forEach((tx) => {
    const tooth = new THREE.Mesh(toothGeo, whiteMat);
    tooth.position.set(tx, 0.041, 0.112);
    g.add(tooth);
  });

  // Googly cute plush dino eyes on top of the hood
  [-0.044, 0.044].forEach((ex) => {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 10), whiteMat);
    sclera.position.set(ex, 0.104, 0.042);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), eyeDark);
    pupil.position.set(ex, 0.106, 0.058);
    g.add(sclera, pupil);
  });

  // Head crest ridge
  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.052, 4), ridgeYellow);
  crest.position.set(0, 0.125, -0.025);
  crest.rotation.x = -0.25;
  g.add(crest);

  return g;
}

function buildDinoTorsoSuit(profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const [tx, ty, tz] = profile.torsoScale;
  const f = 1 + profile.furOffset * 3.8;
  g.scale.set(tx * f, ty * f, tz * f);

  const dinoGreen = new THREE.MeshStandardMaterial({
    color: 0x3d9957,
    roughness: 0.78,
  });
  const bellyCream = new THREE.MeshStandardMaterial({
    color: 0xe6f0c6,
    roughness: 0.85,
  });

  const bodySuit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.108, 0.116, 0.28, 16),
    dinoGreen
  );
  bodySuit.rotation.x = Math.PI / 2;
  bodySuit.scale.set(0.98, 1, 0.96);
  g.add(bodySuit);

  const bellyStrip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.24), bellyCream);
  bellyStrip.position.set(0, -0.095, 0);
  g.add(bellyStrip);

  return g;
}

function buildDinoSpineRidges(
  spinePoints: THREE.Group[],
  profile: CatFitProfile
): THREE.Mesh[] {
  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0xf4c44e,
    roughness: 0.62,
  });
  const scales = [1.0, 1.15, 1.0, 0.82];
  const meshes: THREE.Mesh[] = [];

  spinePoints.forEach((node, idx) => {
    const sc = (scales[idx] ?? 0.9) * profile.bodyScale;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.024 * sc, 0.062 * sc, 4), ridgeMat);
    spike.position.set(0, 0.028 * sc + profile.furOffset, 0);
    spike.rotation.y = Math.PI / 4;
    spike.rotation.x = -0.18;
    spike.visible = false;
    node.add(spike);
    meshes.push(spike);
  });

  return meshes;
}

export function attachCatCosmeticsRig(
  catId: CafeCatId,
  sockets: CatCosmeticSockets,
  onToggleBaseCollar?: (visible: boolean) => void
): CatCosmeticRigController {
  const profile = getCatFitProfile(catId) ?? CAT_FIT_PROFILES.default;

  const cosmeticMeshes = new Map<CatCosmeticId, THREE.Object3D[]>();

  // 1. Eyewear
  const glasses = buildRoundGlassesMesh(profile);
  glasses.visible = false;
  sockets.anchorEyes.add(glasses);
  cosmeticMeshes.set('glasses', [glasses]);

  const thuglife = buildThuglifeGlassesMesh(profile);
  thuglife.visible = false;
  sockets.anchorEyes.add(thuglife);
  cosmeticMeshes.set('thuglife_glasses', [thuglife]);

  // 2. Neck
  const goldChain = buildGoldChainMesh(profile);
  goldChain.visible = false;
  sockets.anchorNeck.add(goldChain);
  cosmeticMeshes.set('gold_chain', [goldChain]);

  // 3. Headwear
  const beret = buildBeretMesh(profile);
  beret.visible = false;
  sockets.anchorHeadTop.add(beret);
  cosmeticMeshes.set('beret', [beret]);

  // 4. Cloth Vests (5 colors)
  const clothSpecs: Array<{ id: CatCosmeticId; hex: string }> = [
    { id: 'cloth_pink', hex: '#f48fb1' },
    { id: 'cloth_yellow', hex: '#f6d365' },
    { id: 'cloth_blue', hex: '#60a5fa' },
    { id: 'cloth_white', hex: '#f5f0e6' },
    { id: 'cloth_orange', hex: '#fb923c' },
  ];
  clothSpecs.forEach(({ id, hex }) => {
    const vest = buildClothVestMesh(hex, profile);
    vest.visible = false;
    sockets.anchorTorso.add(vest);
    cosmeticMeshes.set(id, [vest]);
  });

  // 5. Full Suit: Dinosaur Costume (head hood + green torso suit + 4 dorsal spine ridges)
  const dinoHood = buildDinoHeadHood(profile);
  dinoHood.visible = false;
  sockets.anchorHeadTop.add(dinoHood);

  const dinoSuit = buildDinoTorsoSuit(profile);
  dinoSuit.visible = false;
  sockets.anchorTorso.add(dinoSuit);

  const dinoSpikes = buildDinoSpineRidges(sockets.anchorSpinePoints, profile);
  cosmeticMeshes.set('dino_costume', [dinoHood, dinoSuit, ...dinoSpikes]);

  const applyLoadout = (loadout: CatLoadout | undefined) => {
    const visibleSlots = getEffectiveVisibleLoadout(loadout);
    const activeIds = new Set<CatCosmeticId>();
    if (visibleSlots.eyewear) activeIds.add(visibleSlots.eyewear);
    if (visibleSlots.headwear) activeIds.add(visibleSlots.headwear);
    if (visibleSlots.neckwear) activeIds.add(visibleSlots.neckwear);
    if (visibleSlots.body) activeIds.add(visibleSlots.body);
    if (visibleSlots.full_suit) activeIds.add(visibleSlots.full_suit);

    cosmeticMeshes.forEach((objs, id) => {
      const show = activeIds.has(id);
      for (const o of objs) {
        o.visible = show;
      }
    });

    // Hide cat's stock collar while Gold Chain is equipped so they don't overlap
    if (onToggleBaseCollar) {
      onToggleBaseCollar(!activeIds.has('gold_chain'));
    }
  };

  return {
    applyLoadout,
    setBaseCollarVisible: onToggleBaseCollar,
    dispose: () => {
      cosmeticMeshes.clear();
    },
  };
}
