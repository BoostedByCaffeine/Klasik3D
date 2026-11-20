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
  const s = profile.neckRadius;
  g.scale.set(s, s, s);
  // Seated right on the collar/chest line, angled downward in front (+0.35 rad) so it never clips the muzzle
  g.position.set(0, -0.004, 0.004);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffc940,
    metalness: 0.9,
    roughness: 0.2,
    emissive: 0x6b4700,
    emissiveIntensity: 0.14,
  });

  const chainLoop = new THREE.Group();
  chainLoop.rotation.x = Math.PI / 2 + 0.35;
  g.add(chainLoop);

  // Snug Cuban-link gold collar loop hugging the neck base & upper chest fur
  const ringRadius = 0.059;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, 0.0072, 8, 22), goldMat);
  chainLoop.add(ring);

  const linkGeo = new THREE.BoxGeometry(0.014, 0.009, 0.01);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const link = new THREE.Mesh(linkGeo, goldMat);
    link.position.set(Math.cos(angle) * ringRadius, Math.sin(angle) * ringRadius, 0);
    link.rotation.z = angle + Math.PI / 2;
    chainLoop.add(link);
  }

  // Front circular gold medallion draped neatly onto the upper chest fur below the collar
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0022, 6, 10), goldMat);
  bail.position.set(0, -0.021, 0.058);
  g.add(bail);

  const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.0055, 16), goldMat);
  pendant.rotation.x = Math.PI / 2 - 0.18;
  pendant.position.set(0, -0.036, 0.062);
  g.add(pendant);

  return g;
}

function buildBeretMesh(profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const hs = profile.headScale;
  g.scale.set(hs, hs, hs);
  // Flush on skull crown (anchor_head_top is already at headRadius * 0.84) — zero floating air gap
  g.position.set(0.005, -0.003, -0.004);
  g.rotation.z = 0.14;
  g.rotation.x = -0.06;

  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d23, // Cozy Bordeaux espresso velvet
    roughness: 0.88,
    metalness: 0.02,
  });
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0x2b1b15,
    roughness: 0.72,
  });

  // Fitted inner headband making firm contact with the crown between the ears
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.059, 0.014, 18), bandMat);
  rim.position.set(0, 0.005, 0);
  g.add(rim);

  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.072, 18, 12), feltMat);
  crown.scale.set(1.16, 0.42, 1.12);
  crown.position.set(0.006, 0.022, -0.003);
  g.add(crown);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0055, 0.02, 6), feltMat);
  stem.position.set(0.008, 0.056, -0.004);
  stem.rotation.z = -0.22;
  g.add(stem);

  return g;
}

function buildClothVestMesh(
  hexColor: string,
  profile: CatFitProfile
): THREE.Group {
  const g = new THREE.Group();
  const [tx, ty, tz] = profile.torsoScale;
  // Snug sleeveless pet vest hugging the seated cat's vertical torso (+0.015 outward clearance, never a shield)
  const pad = 1 + Math.min(0.16, profile.furOffset * 3.2);
  g.scale.set(tx * pad, ty * pad, tz * pad);

  const tex = getKnitClothTexture(hexColor, [tx, ty, tz]);
  const clothMat = new THREE.MeshStandardMaterial({
    color: tex ? 0xffffff : hexColor,
    map: tex ?? undefined,
    roughness: 0.86,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x241a15, // Crisp contrasting dark espresso rib-knit trim around neckline, armholes & hem
    roughness: 0.88,
    metalness: 0.02,
  });

  // Contoured sleeveless pet tank-top shell aligned vertically along the seated torso spine
  const profilePoints = [
    new THREE.Vector2(0.058, 0.082),  // Snug collar neckline just under chin
    new THREE.Vector2(0.076, 0.056),  // Upper shoulders / chest
    new THREE.Vector2(0.088, 0.018),  // Mid ribcage
    new THREE.Vector2(0.092, -0.024), // Lower barrel
    new THREE.Vector2(0.085, -0.062), // Curved back hem resting neatly above haunches
  ];
  const vestShellGeo = new THREE.LatheGeometry(profilePoints, 20);
  // Subtle anatomical cross-section matching seated cat torso (slightly deeper front-to-back than wide)
  vestShellGeo.scale(0.95, 1.0, 1.07);
  const vestShell = new THREE.Mesh(vestShellGeo, clothMat);
  g.add(vestShell);

  // Rib-knit collar neckline trim right below the cat's collar
  const neckTrim = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.0075, 8, 20), trimMat);
  neckTrim.rotation.x = Math.PI / 2 + 0.14;
  neckTrim.scale.set(0.95, 1.07, 1.0);
  neckTrim.position.set(0, 0.082, 0.006);
  g.add(neckTrim);

  // Open side armhole trim rings framing both front legs so front limbs move freely without clipping
  [-1, 1].forEach((side) => {
    const armholeTrim = new THREE.Mesh(new THREE.TorusGeometry(0.029, 0.0055, 8, 16), trimMat);
    armholeTrim.position.set(side * 0.064, 0.022, 0.046);
    armholeTrim.rotation.y = side * 0.92;
    armholeTrim.rotation.x = 0.18;
    armholeTrim.scale.set(0.92, 1.18, 1.0);
    g.add(armholeTrim);
  });

  // Curved rear & lower hem rib-knit binding
  const hemTrim = new THREE.Mesh(new THREE.TorusGeometry(0.084, 0.007, 8, 22), trimMat);
  hemTrim.rotation.x = Math.PI / 2 - 0.1;
  hemTrim.scale.set(0.95, 1.07, 1.0);
  hemTrim.position.set(0, -0.062, -0.004);
  g.add(hemTrim);

  return g;
}

// Phase 0.1 C: Bone-White Plush Skeleton T-Rex Costume (Open-Jaw Skull Hood + Curved Ribcage, Dorsal Spikes & Plush Bone Tail)
function buildDinoHeadHood(profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const hs = profile.headScale;
  g.scale.set(hs, hs, hs);
  // Seated directly on anchor_head_top (headRadius * 0.84) with zero floating gap
  g.position.set(0, -0.004, -0.002);

  const bonePlushMat = new THREE.MeshStandardMaterial({
    color: 0xf2efe9, // Soft plush bone white
    roughness: 0.88,
    metalness: 0.02,
  });
  const boneShadeMat = new THREE.MeshStandardMaterial({
    color: 0xe3ddd2, // Warm plush seam/depth shading
    roughness: 0.9,
    metalness: 0.02,
  });
  const socketDarkMat = new THREE.MeshStandardMaterial({
    color: 0x2b2826, // Charcoal recessed eye sockets & nostril cutouts
    roughness: 0.92,
    metalness: 0.02,
  });
  const toothWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
  });

  // 1. Rear & top plush cranium hood (open in front so the cat's entire face stays 100% visible!)
  const craniumBack = new THREE.Mesh(
    new THREE.SphereGeometry(0.084, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
    bonePlushMat
  );
  craniumBack.scale.set(1.06, 0.88, 1.12);
  craniumBack.rotation.x = -0.36;
  craniumBack.position.set(0, -0.008, -0.012);
  g.add(craniumBack);

  // Sculpted upper brow ridge & projecting plush T-Rex snout perched cleanly ABOVE the cat's eyes
  const browBridge = new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.044, 0.072), bonePlushMat);
  browBridge.position.set(0, 0.042, 0.028);
  g.add(browBridge);

  const snoutMain = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), bonePlushMat);
  snoutMain.scale.set(1.12, 0.62, 1.38);
  snoutMain.position.set(0, 0.036, 0.074);
  g.add(snoutMain);

  // Two recessed charcoal oval eye sockets on the skull sides (matching reference plush skull!)
  [-1, 1].forEach((side) => {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), socketDarkMat);
    socket.scale.set(0.55, 1.18, 1.05);
    socket.position.set(side * 0.056, 0.038, 0.036);
    socket.rotation.y = side * 0.25;
    g.add(socket);

    // Subtle plush cheek arch framing the sides of the cat's face without blocking eyes
    const cheekStrap = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.068, 6, 10), boneShadeMat);
    cheekStrap.position.set(side * 0.074, -0.048, 0.012);
    cheekStrap.rotation.z = side * 0.18;
    cheekStrap.rotation.x = 0.22;
    g.add(cheekStrap);

    // Recessed charcoal nostril cutouts near front of snout
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 8), socketDarkMat);
    nostril.scale.set(0.7, 1.0, 1.25);
    nostril.position.set(side * 0.025, 0.042, 0.128);
    g.add(nostril);
  });

  // Cute pointed white plush teeth lining the upper jaw rim (above cat's eyes!)
  const upperToothGeo = new THREE.ConeGeometry(0.0072, 0.018, 5);
  upperToothGeo.rotateX(Math.PI);
  const upperToothArc: Array<[number, number]> = [
    [-0.048, 0.062],
    [-0.036, 0.092],
    [-0.019, 0.118],
    [0, 0.128],
    [0.019, 0.118],
    [0.036, 0.092],
    [0.048, 0.062],
  ];
  upperToothArc.forEach(([tx, tz]) => {
    const tooth = new THREE.Mesh(upperToothGeo, toothWhiteMat);
    tooth.position.set(tx, 0.011, tz);
    g.add(tooth);
  });

  // Open lower plush jaw chin-cup + soft under-chin Velcro collar strap beneath the cat's muzzle
  const lowerJaw = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.015, 8, 16, Math.PI), bonePlushMat);
  lowerJaw.rotation.x = Math.PI / 2 + 0.14;
  lowerJaw.rotation.z = Math.PI;
  lowerJaw.scale.set(1.02, 1.24, 0.9);
  lowerJaw.position.set(0, -0.104, 0.036);
  g.add(lowerJaw);

  const lowerToothGeo = new THREE.ConeGeometry(0.006, 0.014, 5);
  [-0.034, -0.016, 0.016, 0.034].forEach((tx, i) => {
    const tz = i === 1 || i === 2 ? 0.098 : 0.078;
    const tooth = new THREE.Mesh(lowerToothGeo, toothWhiteMat);
    tooth.position.set(tx, -0.091, tz);
    g.add(tooth);
  });

  // Under-chin plush Velcro collar strap
  const collarStrap = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 18), boneShadeMat);
  collarStrap.rotation.x = Math.PI / 2 + 0.2;
  collarStrap.position.set(0, -0.114, 0.008);
  g.add(collarStrap);

  return g;
}

function buildDinoTorsoSuit(profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const [tx, ty, tz] = profile.torsoScale;
  const pad = 1 + Math.min(0.14, profile.furOffset * 3.0);
  g.scale.set(tx * pad, ty * pad, tz * pad);

  const bonePlushMat = new THREE.MeshStandardMaterial({
    color: 0xf2efe9,
    roughness: 0.88,
    metalness: 0.02,
  });
  const boneShadeMat = new THREE.MeshStandardMaterial({
    color: 0xe3ddd2,
    roughness: 0.9,
    metalness: 0.02,
  });

  // 1. Contoured dorsal plush vertebral back-strip (NEVER a full sphere — chest, front legs & belly stay visible!)
  const spineStrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.155, 8, 12), bonePlushMat);
  spineStrip.position.set(0, 0.012, -0.086);
  spineStrip.rotation.x = -0.16;
  g.add(spineStrip);

  // 2. 6 pairs of curved plush bone rib segments arching snugly down the left & right sides of the torso
  const ribHeights = [0.062, 0.038, 0.014, -0.01, -0.034, -0.056];
  const ribLengths = [0.062, 0.074, 0.08, 0.078, 0.07, 0.058];
  const ribZOffsets = [-0.072, -0.078, -0.082, -0.082, -0.078, -0.072];

  ribHeights.forEach((ry, idx) => {
    const len = ribLengths[idx];
    const rz = ribZOffsets[idx];
    [-1, 1].forEach((side) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(side * 0.018, ry, rz),
        new THREE.Vector3(side * (0.088 + (idx === 2 || idx === 3 ? 0.008 : 0)), ry - 0.006, rz + 0.052),
        new THREE.Vector3(side * 0.064, ry - 0.024, rz + 0.052 + len * 0.62)
      );
      const ribGeo = new THREE.TubeGeometry(curve, 10, 0.0095, 7, false);
      const ribMesh = new THREE.Mesh(ribGeo, bonePlushMat);
      g.add(ribMesh);

      const ribTip = new THREE.Mesh(new THREE.SphereGeometry(0.0098, 7, 7), bonePlushMat);
      ribTip.position.copy(curve.getPoint(1));
      g.add(ribTip);
    });
  });

  // 3. Thin plush belly strap holding the ribcage snugly underneath (keeps fur & chest completely open)
  const bellyStrap = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.0075, 6, 18, Math.PI * 1.15), boneShadeMat);
  bellyStrap.rotation.x = Math.PI / 2;
  bellyStrap.rotation.z = Math.PI * 0.42;
  bellyStrap.position.set(0, -0.004, 0.002);
  g.add(bellyStrap);

  // 4. Tapered plush bone dinosaur tail projecting smoothly behind the seated cat with tiny bone spikes
  const tailCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, -0.058, -0.082),
    new THREE.Vector3(0, -0.068, -0.168),
    new THREE.Vector3(0, -0.044, -0.245)
  );
  const tailGeo = new THREE.TubeGeometry(tailCurve, 12, 0.022, 8, false);
  // Taper vertices along the tail length toward a cute plush point
  const posAttr = tailGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const zVal = posAttr.getZ(i);
    const t = THREE.MathUtils.clamp((-0.082 - zVal) / 0.165, 0, 1);
    const taper = 1 - t * 0.72;
    const centerPt = tailCurve.getPoint(t);
    posAttr.setX(i, centerPt.x + (posAttr.getX(i) - centerPt.x) * taper);
    posAttr.setY(i, centerPt.y + (posAttr.getY(i) - centerPt.y) * taper);
  }
  posAttr.needsUpdate = true;
  tailGeo.computeVertexNormals();
  const tailMesh = new THREE.Mesh(tailGeo, bonePlushMat);
  g.add(tailMesh);

  // Small rounded triangular bone spikes running down the plush tail
  const tailSpikeGeo = new THREE.ConeGeometry(0.009, 0.022, 5);
  [0.24, 0.48, 0.72, 0.9].forEach((t) => {
    const pt = tailCurve.getPoint(t);
    const spike = new THREE.Mesh(tailSpikeGeo, bonePlushMat);
    const s = 1 - t * 0.45;
    spike.scale.setScalar(s);
    spike.position.set(pt.x, pt.y + 0.022 * s, pt.z);
    spike.rotation.x = -0.35;
    g.add(spike);
  });

  return g;
}

function buildDinoSpineRidges(
  spinePoints: THREE.Group[],
  profile: CatFitProfile
): THREE.Mesh[] {
  const boneRidgeMat = new THREE.MeshStandardMaterial({
    color: 0xf2efe9, // Matching plush bone-white dorsal spikes
    roughness: 0.85,
  });
  const scales = [0.92, 1.05, 0.96, 0.78];
  const meshes: THREE.Mesh[] = [];

  spinePoints.forEach((node, idx) => {
    const sc = (scales[idx] ?? 0.85) * profile.bodyScale;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.014 * sc, 0.036 * sc, 5), boneRidgeMat);
    spike.position.set(0, 0.016 * sc + profile.furOffset * 0.4, -0.012);
    spike.rotation.y = Math.PI / 4;
    spike.rotation.x = -0.42;
    spike.visible = false;
    node.add(spike);
    meshes.push(spike);
  });

  return meshes;
}

// Phase 7 ThumbnailStudio helper: build a standalone 3D preview mesh for any cat cosmetic
export function buildCatCosmeticPreviewMesh(cosmeticId: CatCosmeticId): THREE.Group {
  const profile = CAT_FIT_PROFILES.default;
  const wrap = new THREE.Group();
  if (cosmeticId === 'glasses') {
    wrap.add(buildRoundGlassesMesh(profile));
  } else if (cosmeticId === 'thuglife_glasses') {
    wrap.add(buildThuglifeGlassesMesh(profile));
  } else if (cosmeticId === 'gold_chain') {
    wrap.add(buildGoldChainMesh(profile));
  } else if (cosmeticId === 'beret') {
    wrap.add(buildBeretMesh(profile));
  } else if (cosmeticId === 'dino_costume') {
    const hood = buildDinoHeadHood(profile);
    hood.position.set(0, 0.14, 0.05);
    const body = buildDinoTorsoSuit(profile);
    body.position.set(0, 0, 0);
    wrap.add(hood, body);
  } else {
    const hexMap: Record<string, string> = {
      cloth_pink: '#f48fb1',
      cloth_yellow: '#f6d365',
      cloth_blue: '#60a5fa',
      cloth_white: '#f5f0e6',
      cloth_orange: '#fb923c',
    };
    wrap.add(buildClothVestMesh(hexMap[cosmeticId] || '#f48fb1', profile));
  }
  return wrap;
}

export function attachCatCosmeticsRig(
  catId: CafeCatId,
  sockets: CatCosmeticSockets,
  onToggleBaseCollar?: (visible: boolean) => void
): CatCosmeticRigController {
  const profile = getCatFitProfile(catId) ?? CAT_FIT_PROFILES.default;

  const cosmeticMeshes = new Map<CatCosmeticId, THREE.Object3D[]>();

  // 1. Eyewear (UNMODIFIED — working cleanly!)
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

  // 4. Sleeveless Knit Pet Vests (5 colors)
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

  // 5. Full Suit: Bone-White Plush Skeleton T-Rex (open-jaw skull hood + curved ribcage/tail + 4 dorsal spikes)
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
