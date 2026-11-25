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
  CAT_COSMETIC_CLEARANCE,
  CAT_FIT_PROFILES,
  CatCosmeticId,
  CatFitProfile,
  CatLoadout,
  CatRigDimensions,
  DEFAULT_CAT_RIG_DIMENSIONS,
  getCatFitProfile,
  getEffectiveVisibleLoadout,
  sampleCatDorsalSplinePoints,
  sampleCatTorsoOuterPoint,
} from './catCosmeticsData';
import { CafeCatId } from './rules';

export interface CatCosmeticSockets {
  anchorEyes: THREE.Group;
  anchorHeadTop: THREE.Group;
  anchorNeck: THREE.Group;
  anchorTorso: THREE.Group;
  anchorSpinePoints: THREE.Group[]; // 4 nodes along dorsal spine
  bodyRoot?: THREE.Group; // Un-tilted bodyPivot root for exact geometry-driven torso/spine alignment
  rigDimensions?: CatRigDimensions;
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

function buildPlatinumChainMesh(profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const s = profile.neckRadius;
  g.scale.set(s, s, s);
  g.position.set(0, -0.004, 0.004);

  const platMat = new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    metalness: 0.96,
    roughness: 0.14,
    emissive: 0x94a3b8,
    emissiveIntensity: 0.16,
  });
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.55,
    roughness: 0.08,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.35,
  });

  const chainLoop = new THREE.Group();
  chainLoop.rotation.x = Math.PI / 2 + 0.35;
  g.add(chainLoop);

  const ringRadius = 0.06;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, 0.0076, 8, 24), platMat);
  chainLoop.add(ring);

  const linkGeo = new THREE.BoxGeometry(0.015, 0.0095, 0.011);
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const link = new THREE.Mesh(linkGeo, platMat);
    link.position.set(Math.cos(angle) * ringRadius, Math.sin(angle) * ringRadius, 0);
    link.rotation.z = angle + Math.PI / 2;
    chainLoop.add(link);
  }

  // Faceted octagonal platinum pendant with crisp ice-diamond center inlay
  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.0065, 0.0024, 6, 10), platMat);
  bail.position.set(0, -0.021, 0.059);
  g.add(bail);

  const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 8), platMat);
  pendant.rotation.x = Math.PI / 2 - 0.18;
  pendant.position.set(0, -0.037, 0.063);
  g.add(pendant);

  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.009, 0), diamondMat);
  gem.scale.set(1, 1, 0.45);
  gem.position.set(0, -0.037, 0.067);
  g.add(gem);

  return g;
}

function buildMustacheMesh(colorHex: number, profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const hs = profile.headScale;
  g.scale.set(hs * profile.eyeWidth, hs, hs);
  // Seated directly beneath the cat's nose bridge on anchorEyes
  g.position.set(0, -0.024, profile.furOffset + 0.011);

  const hairMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.78,
    metalness: 0.04,
  });

  // Sculpted symmetrical curled handlebar mustache (left + right curves)
  [-1, 1].forEach((side) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.002, 0.002),
      new THREE.Vector3(side * 0.014, 0.003, 0.004),
      new THREE.Vector3(side * 0.032, -0.003, 0.001),
      new THREE.Vector3(side * 0.046, 0.001, -0.003),
      new THREE.Vector3(side * 0.052, 0.01, -0.005),
    ]);
    const tubeGeo = new THREE.TubeGeometry(curve, 14, 0.0075, 8, false);
    const pos = tubeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = Math.abs(pos.getX(i));
      const t = THREE.MathUtils.clamp(px / 0.052, 0, 1);
      const taper = 1.0 - t * 0.58;
      const pt = curve.getPoint(t);
      pos.setY(i, pt.y + (pos.getY(i) - pt.y) * taper);
      pos.setZ(i, pt.z + (pos.getZ(i) - pt.z) * taper);
    }
    pos.needsUpdate = true;
    tubeGeo.computeVertexNormals();
    g.add(new THREE.Mesh(tubeGeo, hairMat));
  });

  // Soft center tuft joining the two handlebar wings
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0078, 8, 8), hairMat);
  knot.scale.set(1.2, 0.85, 0.75);
  knot.position.set(0, 0.002, 0.002);
  g.add(knot);

  return g;
}

function buildMonocleMesh(profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const hs = profile.headScale;
  g.scale.set(hs * profile.eyeWidth, hs, hs);
  g.position.set(0, 0, profile.furOffset + 0.003);

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    metalness: 0.9,
    roughness: 0.2,
    emissive: 0x713f12,
    emissiveIntensity: 0.12,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.36,
    roughness: 0.08,
    metalness: 0.15,
  });

  // Single refined brass rim & lens positioned cleanly over the cat's right eye (+x in face space)
  const eyeX = 0.031;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0255, 0.0038, 10, 22), brassMat);
  rim.position.set(eyeX, 0, 0);
  g.add(rim);

  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.023, 18), lensMat);
  lens.position.set(eyeX, 0, 0.0012);
  g.add(lens);

  // Small gallery lug on outer edge of rim
  const lug = new THREE.Mesh(new THREE.SphereGeometry(0.0046, 8, 8), brassMat);
  lug.position.set(eyeX + 0.026, -0.004, 0);
  g.add(lug);

  // Delicate draped brass chain trailing neatly along cheek fur
  const chainCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(eyeX + 0.026, -0.004, 0),
    new THREE.Vector3(eyeX + 0.032, -0.028, -0.006),
    new THREE.Vector3(eyeX + 0.027, -0.056, -0.015),
    new THREE.Vector3(eyeX + 0.016, -0.082, -0.024),
  ]);
  const chainMesh = new THREE.Mesh(new THREE.TubeGeometry(chainCurve, 12, 0.0019, 6, false), brassMat);
  g.add(chainMesh);

  return g;
}

function buildTopHatMesh(colorHex: number, profile: CatFitProfile): THREE.Group {
  const g = new THREE.Group();
  const hs = profile.headScale;
  g.scale.set(hs, hs, hs);
  // Seated flush on skull crown between ears (anchorHeadTop)
  g.position.set(0, -0.003, -0.002);
  g.rotation.z = -0.06;
  g.rotation.x = -0.04;

  const isLight = colorHex === 0xf4f1ea;
  const feltMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.82,
    metalness: 0.04,
  });
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: isLight ? 0x292524 : 0x991b1b,
    roughness: 0.42,
    metalness: 0.14,
  });
  const buckleMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.88,
    roughness: 0.22,
  });

  // Slightly rolled circular brim
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.081, 0.008, 22), feltMat);
  brim.position.set(0, 0.006, 0);
  g.add(brim);

  const brimEdge = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.0045, 8, 22), feltMat);
  brimEdge.rotation.x = Math.PI / 2;
  brimEdge.position.set(0, 0.008, 0);
  g.add(brimEdge);

  // Satin ribbon band around lower crown
  const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.0525, 0.0515, 0.018, 20), ribbonMat);
  ribbon.position.set(0, 0.02, 0);
  g.add(ribbon);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.004), buckleMat);
  buckle.position.set(0, 0.02, 0.052);
  g.add(buckle);

  // Tailored gently flared tall top-hat crown
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.05, 0.082, 20), feltMat);
  crown.position.set(0, 0.052, 0);
  g.add(crown);

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
  profile: CatFitProfile,
  dims: CatRigDimensions = DEFAULT_CAT_RIG_DIMENSIONS
): THREE.Group {
  const g = new THREE.Group();
  // Phase 1.2: Chest-Only Fit — cropped upper-chest & upper-shoulders cafe bib/tank
  // spanning ONLY the upper ~42% of torso height (stopping cleanly ABOVE the front leg
  // joints & belly) with zero dark side armhole rings, eliminating all leg/belly clipping
  // across every cat size (Gigi, Lilo, Tisay, Champy, Amby, Mikmik, Chunky).
  const tex = getKnitClothTexture(hexColor, [profile.torsoScale[0], profile.torsoScale[1], profile.torsoScale[2]]);
  const clothMat = new THREE.MeshStandardMaterial({
    color: tex ? 0xffffff : hexColor,
    map: tex ?? undefined,
    roughness: 0.85,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x3a2a21, // Subtle slim neckline & hem piping flush with fabric
    roughness: 0.86,
    metalness: 0.02,
  });

  const heightSteps = 8;
  const radialSteps = 26;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const fullTorsoSpan = Math.max(0.11, dims.neckY - 0.056);
  const chestBandHeight = fullTorsoSpan * 0.42;

  const getTopY = (theta: number) => {
    const frontFactor = Math.max(0, Math.cos(theta));
    // Anchored directly below collar line (neckY - 0.015), slightly scooped at front throat
    return dims.neckY - 0.014 - frontFactor * 0.012;
  };
  const getBotY = (theta: number) => {
    const frontFactor = Math.max(0, Math.cos(theta));
    // Stops cleanly above the front shoulder/leg joint & belly (slightly lower in front like a cozy bib)
    return getTopY(theta) - chestBandHeight * (0.94 + frontFactor * 0.12);
  };

  // Generate conformal chest-only band strictly outside torsoMesh + chestMesh
  const clothClearance = Math.max(CAT_COSMETIC_CLEARANCE, 0.03);
  for (let r = 0; r <= heightSteps; r++) {
    const v = r / heightSteps;
    for (let c = 0; c <= radialSteps; c++) {
      const u = c / radialSteps;
      const theta = u * Math.PI * 2;
      const yTop = getTopY(theta);
      const yBot = getBotY(theta);
      const y = yBot + (yTop - yBot) * v;
      const pt = sampleCatTorsoOuterPoint(y, theta, dims, clothClearance);
      positions.push(pt.x, pt.y, pt.z);
      uvs.push(u * 2.0, v * 0.7);
    }
  }

  const cols = radialSteps + 1;
  for (let r = 0; r < heightSteps; r++) {
    for (let c = 0; c < radialSteps; c++) {
      const i00 = r * cols + c;
      const i10 = (r + 1) * cols + c;
      const i01 = r * cols + (c + 1);
      const i11 = (r + 1) * cols + (c + 1);
      indices.push(i00, i01, i11, i00, i11, i10);
    }
  }

  const vestGeo = new THREE.BufferGeometry();
  vestGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  vestGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  vestGeo.setIndex(indices);
  vestGeo.computeVertexNormals();

  const vestShell = new THREE.Mesh(vestGeo, clothMat);
  g.add(vestShell);

  // Flush slim collar & bottom hem rib piping (zero protruding side armhole rings)
  const neckPts: THREE.Vector3[] = [];
  const hemPts: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) {
    const theta = (i / 24) * Math.PI * 2;
    const pTop = sampleCatTorsoOuterPoint(getTopY(theta), theta, dims, clothClearance + 0.002);
    neckPts.push(new THREE.Vector3(pTop.x, pTop.y, pTop.z));
    const pBot = sampleCatTorsoOuterPoint(getBotY(theta), theta, dims, clothClearance + 0.002);
    hemPts.push(new THREE.Vector3(pBot.x, pBot.y, pBot.z));
  }
  const neckCurve = new THREE.CatmullRomCurve3(neckPts, true);
  const neckTrim = new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 26, 0.0048, 6, true), trimMat);
  g.add(neckTrim);

  const hemCurve = new THREE.CatmullRomCurve3(hemPts, true);
  const hemTrim = new THREE.Mesh(new THREE.TubeGeometry(hemCurve, 26, 0.0044, 6, true), trimMat);
  g.add(hemTrim);

  return g;
}

// Phase B: Geometry-Driven Bone-White Plush Skeleton T-Rex Skull Hood (Solid Collar-Anchored Lower Jaw, Zero Floating Teeth!)
function buildDinoHeadHood(
  _profile: CatFitProfile,
  dims: CatRigDimensions = DEFAULT_CAT_RIG_DIMENSIONS
): THREE.Group {
  const g = new THREE.Group();
  // Scale cleanly to actual headRadius * 1.18 relative to baseline 0.072 (NO double scaling against catRoot.scale!)
  const headFitScale = (dims.headRadius * 1.18) / (0.072 * 1.18);
  g.scale.setScalar(headFitScale);
  // anchor_head_top sits at (0, 0.058, 0.002) relative to headPivot center
  g.position.set(0, -0.004, -0.002);

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
  const socketDarkMat = new THREE.MeshStandardMaterial({
    color: 0x2b2826,
    roughness: 0.92,
    metalness: 0.02,
  });
  const toothWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
  });

  // 1. Rear & top plush cranium hood (open in front so the cat's entire face stays 100% visible)
  const craniumBack = new THREE.Mesh(
    new THREE.SphereGeometry(0.086, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
    bonePlushMat
  );
  craniumBack.scale.set(1.08, 0.9, 1.14);
  craniumBack.rotation.x = -0.36;
  craniumBack.position.set(0, -0.008, -0.012);
  g.add(craniumBack);

  // Sculpted upper brow ridge & projecting plush T-Rex snout perched cleanly ABOVE the cat's eyes
  const browBridge = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.044, 0.074), bonePlushMat);
  browBridge.position.set(0, 0.044, 0.028);
  g.add(browBridge);

  const snoutMain = new THREE.Mesh(new THREE.SphereGeometry(0.053, 16, 12), bonePlushMat);
  snoutMain.scale.set(1.12, 0.62, 1.38);
  snoutMain.position.set(0, 0.038, 0.074);
  g.add(snoutMain);

  // Recessed charcoal oval eye sockets, nostrils, and SOLID plush cheek hinges tying skull into the neck collar
  [-1, 1].forEach((side) => {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), socketDarkMat);
    socket.scale.set(0.55, 1.18, 1.05);
    socket.position.set(side * 0.058, 0.04, 0.036);
    socket.rotation.y = side * 0.25;
    g.add(socket);

    // Solid plush cheek-to-collar jaw hinge connecting cranium temples straight down into the neck collar ring
    const hingeCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(side * 0.076, 0.006, 0.004),
      new THREE.Vector3(side * 0.084, -0.056, 0.014),
      new THREE.Vector3(side * 0.062, -0.114, 0.008)
    );
    const hingeMesh = new THREE.Mesh(new THREE.TubeGeometry(hingeCurve, 10, 0.016, 8, false), boneShadeMat);
    g.add(hingeMesh);

    // Recessed charcoal nostril cutouts near front of snout
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 8), socketDarkMat);
    nostril.scale.set(0.7, 1.0, 1.25);
    nostril.position.set(side * 0.025, 0.044, 0.128);
    g.add(nostril);
  });

  // Upper plush teeth lining the upper jaw rim (above cat's eyes)
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
    tooth.position.set(tx, 0.012, tz);
    g.add(tooth);
  });

  // Under-chin plush gusset solidly bridging the cheek hinges forward to the lower jaw chin (no protruding neck/chest ring)
  const chinGusset = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.02, 0.068), boneShadeMat);
  chinGusset.position.set(0, -0.114, 0.044);
  chinGusset.rotation.x = -0.12;
  g.add(chinGusset);

  // Curved U-shaped lower mandible anchored directly at both ends into the neck collar hinges
  const lowerJawCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.062, -0.114, 0.008),
    new THREE.Vector3(-0.056, -0.109, 0.062),
    new THREE.Vector3(-0.028, -0.104, 0.094),
    new THREE.Vector3(0, -0.102, 0.102),
    new THREE.Vector3(0.028, -0.104, 0.094),
    new THREE.Vector3(0.056, -0.109, 0.062),
    new THREE.Vector3(0.062, -0.114, 0.008),
  ]);
  const lowerJawMesh = new THREE.Mesh(
    new THREE.TubeGeometry(lowerJawCurve, 18, 0.0145, 8, false),
    bonePlushMat
  );
  g.add(lowerJawMesh);

  // 6 lower plush teeth seated directly ON TOP of lowerJawCurve so zero teeth ever float disconnected!
  const lowerToothGeo = new THREE.ConeGeometry(0.0062, 0.015, 5);
  [0.24, 0.35, 0.45, 0.55, 0.65, 0.76].forEach((t) => {
    const pt = lowerJawCurve.getPoint(t);
    const tooth = new THREE.Mesh(lowerToothGeo, toothWhiteMat);
    tooth.position.set(pt.x, pt.y + 0.016, pt.z);
    g.add(tooth);
  });

  return g;
}

// Phase B: Geometry-Driven External Dorsal Spine, Ribcage & Tapered Skeletal Tail (ZERO Body Clipping!)
function buildDinoTorsoSuit(
  _profile: CatFitProfile,
  dims: CatRigDimensions = DEFAULT_CAT_RIG_DIMENSIONS
): THREE.Group {
  const g = new THREE.Group();

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

  // 1. Sample 6 points strictly OUTSIDE the cat's dorsal back meridian (surfacePoint + outwardNormal * clearance)
  const dorsalSamples = sampleCatDorsalSplinePoints(dims, 6, CAT_COSMETIC_CLEARANCE);
  const dorsalVecs = dorsalSamples.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  const spineCurve = new THREE.CatmullRomCurve3(dorsalVecs);

  // External plush vertebral spine strip riding cleanly ON TOP of the back fur
  const spineGeo = new THREE.TubeGeometry(spineCurve, 18, 0.018, 8, false);
  const spineMesh = new THREE.Mesh(spineGeo, bonePlushMat);
  g.add(spineMesh);

  // Rounded plush end-caps on top & bottom of vertebral ridge
  const capGeo = new THREE.SphereGeometry(0.018, 8, 8);
  const topCap = new THREE.Mesh(capGeo, bonePlushMat);
  topCap.position.copy(dorsalVecs[0]);
  const botCap = new THREE.Mesh(capGeo, bonePlushMat);
  botCap.position.copy(dorsalVecs[dorsalVecs.length - 1]);
  g.add(topCap, botCap);

  // 6 External Dorsal Bone Spikes oriented directly along each sampled point's outward dorsal normal
  const spikeScales = [0.85, 1.05, 1.12, 1.05, 0.95, 0.82];
  const upAxis = new THREE.Vector3(0, 1, 0);
  const normalVec = new THREE.Vector3();
  const spikeQuat = new THREE.Quaternion();
  dorsalSamples.forEach((pt, idx) => {
    const sc = spikeScales[idx] ?? 0.9;
    const spikeGeo = new THREE.ConeGeometry(0.0125 * sc, 0.034 * sc, 5);
    const spike = new THREE.Mesh(spikeGeo, bonePlushMat);
    normalVec.set(0, pt.ny, pt.nz).normalize();
    spikeQuat.setFromUnitVectors(upAxis, normalVec);
    spike.quaternion.copy(spikeQuat);
    spike.position.set(
      pt.x,
      pt.y + normalVec.y * (0.017 * sc + 0.008),
      pt.z + normalVec.z * (0.017 * sc + 0.008)
    );
    g.add(spike);
  });

  // 2. Phase 1.1: Strictly 3 compact upper-chest/mid-back curved rib pairs ONLY
  // Positioned cleanly ABOVE the front leg shoulder joint & well forward of the haunches
  // with clearance >= 0.03 so zero ribs ever touch or intersect the legs. No chest/belly ring!
  const ribClearance = Math.max(0.032, CAT_COSMETIC_CLEARANCE + 0.005);
  const upperRibCount = Math.min(3, dorsalSamples.length);
  const minRibY = Math.max(0.148, dims.neckY - 0.062);
  for (let idx = 0; idx < upperRibCount; idx++) {
    const dorsalPt = dorsalSamples[idx];
    const ribY = Math.max(minRibY, dorsalPt.y - 0.004);
    const ribEndTheta = idx === 0 ? 0.56 * Math.PI : idx === 1 ? 0.50 * Math.PI : 0.54 * Math.PI;

    [-1, 1].forEach((side) => {
      const p0 = new THREE.Vector3(side * 0.012, dorsalPt.y, dorsalPt.z);
      const mid1 = sampleCatTorsoOuterPoint(ribY, side * (0.80 * Math.PI), dims, ribClearance);
      const mid2 = sampleCatTorsoOuterPoint(ribY - 0.004, side * (0.65 * Math.PI), dims, ribClearance);
      const tip = sampleCatTorsoOuterPoint(ribY - 0.008, side * ribEndTheta, dims, ribClearance);

      const ribCurve = new THREE.CatmullRomCurve3([
        p0,
        new THREE.Vector3(mid1.x, mid1.y, mid1.z),
        new THREE.Vector3(mid2.x, mid2.y, mid2.z),
        new THREE.Vector3(tip.x, tip.y, tip.z),
      ]);
      const ribMesh = new THREE.Mesh(new THREE.TubeGeometry(ribCurve, 10, 0.0082, 7, false), bonePlushMat);
      g.add(ribMesh);

      const ribTip = new THREE.Mesh(new THREE.SphereGeometry(0.0086, 7, 7), bonePlushMat);
      ribTip.position.set(tip.x, tip.y, tip.z);
      g.add(ribTip);
    });
  }

  // 4. External tapered skeletal plush tail rooted strictly OUTSIDE the rump along tailBasePos
  const lastDorsal = dorsalVecs[dorsalVecs.length - 1];
  const tailRootZ = Math.min(lastDorsal.z, dims.tailBasePos[2] - 0.024);
  const tailRootY = Math.max(dims.tailBasePos[1] + 0.008, lastDorsal.y - 0.008);
  const tailCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, tailRootY, tailRootZ),
    new THREE.Vector3(0, tailRootY - 0.012, tailRootZ - 0.095),
    new THREE.Vector3(0, tailRootY + 0.022, tailRootZ - 0.175)
  );
  const tailGeo = new THREE.TubeGeometry(tailCurve, 14, 0.02, 8, false);
  const posAttr = tailGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const zVal = posAttr.getZ(i);
    const t = THREE.MathUtils.clamp((tailRootZ - zVal) / 0.175, 0, 1);
    const taper = 1 - t * 0.74;
    const centerPt = tailCurve.getPoint(t);
    posAttr.setX(i, centerPt.x + (posAttr.getX(i) - centerPt.x) * taper);
    posAttr.setY(i, centerPt.y + (posAttr.getY(i) - centerPt.y) * taper);
  }
  posAttr.needsUpdate = true;
  tailGeo.computeVertexNormals();
  const tailMesh = new THREE.Mesh(tailGeo, bonePlushMat);
  g.add(tailMesh);

  // External bone spikes riding along top of the plush tail
  const tailSpikeGeo = new THREE.ConeGeometry(0.0088, 0.022, 5);
  [0.22, 0.46, 0.68, 0.88].forEach((t) => {
    const pt = tailCurve.getPoint(t);
    const spike = new THREE.Mesh(tailSpikeGeo, bonePlushMat);
    const s = 1 - t * 0.48;
    spike.scale.setScalar(s);
    spike.position.set(pt.x, pt.y + 0.021 * s, pt.z);
    spike.rotation.x = -0.32;
    g.add(spike);
  });

  return g;
}

// Secret Cat Skeleton Costume Palette (Warm White, Gray, Black)
interface CatSkeletonPalette {
  boneHex: number;
  shadeHex: number;
  socketHex: number;
  suitHex: number;
}

const CAT_SKELETON_PALETTES: Record<
  'skeleton_warm_white' | 'skeleton_gray' | 'skeleton_black',
  CatSkeletonPalette
> = {
  skeleton_warm_white: {
    boneHex: 0xf5efe6,
    shadeHex: 0xe4dacb,
    socketHex: 0x262321,
    suitHex: 0x272320,
  },
  skeleton_gray: {
    boneHex: 0xb0b7c3,
    shadeHex: 0x8b95a5,
    socketHex: 0x181c22,
    suitHex: 0x374151,
  },
  skeleton_black: {
    boneHex: 0x232830,
    shadeHex: 0x15181e,
    socketHex: 0x090b0e,
    suitHex: 0x111318,
  },
};

function buildCatSkeletonHeadHood(
  palette: CatSkeletonPalette,
  dims: CatRigDimensions = DEFAULT_CAT_RIG_DIMENSIONS
): THREE.Group {
  const g = new THREE.Group();
  const headFitScale = (dims.headRadius * 1.16) / (0.072 * 1.16);
  g.scale.setScalar(headFitScale);
  g.position.set(0, -0.004, -0.002);

  const boneMat = new THREE.MeshStandardMaterial({
    color: palette.boneHex,
    roughness: 0.72,
    metalness: 0.06,
  });
  const shadeMat = new THREE.MeshStandardMaterial({
    color: palette.shadeHex,
    roughness: 0.82,
    metalness: 0.04,
  });
  const socketMat = new THREE.MeshStandardMaterial({
    color: palette.socketHex,
    roughness: 0.92,
  });
  // Subtle contrasting bone-edge highlight for Obsidian Black variant so ribs & skull pop
  const accentBoneMat =
    palette.boneHex === 0x232830
      ? new THREE.MeshStandardMaterial({ color: 0x525b68, roughness: 0.65, metalness: 0.1 })
      : boneMat;

  // Rounded feline skull cap leaving cat's real face 100% open and adorable
  const cranium = new THREE.Mesh(
    new THREE.SphereGeometry(0.084, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
    boneMat
  );
  cranium.scale.set(1.06, 0.92, 1.08);
  cranium.rotation.x = -0.3;
  cranium.position.set(0, -0.006, -0.01);
  g.add(cranium);

  // Cute feline skull crest & paired skeletal cat-ear frames perched cleanly on the crown
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.114, 0.028, 0.056), boneMat);
  brow.position.set(0, 0.042, 0.026);
  g.add(brow);

  [-1, 1].forEach((side) => {
    const earOuter = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.056, 4), boneMat);
    earOuter.position.set(side * 0.046, 0.068, 0.002);
    earOuter.rotation.z = -side * 0.22;
    earOuter.rotation.y = side * 0.18;
    g.add(earOuter);

    const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.038, 4), socketMat);
    earInner.position.set(side * 0.046, 0.066, 0.011);
    earInner.rotation.z = -side * 0.22;
    g.add(earInner);

    // Decorative skull eye-socket markings on upper brow
    const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), socketMat);
    eyeSocket.scale.set(1.05, 0.82, 0.55);
    eyeSocket.position.set(side * 0.028, 0.042, 0.052);
    g.add(eyeSocket);

    // Cheekbone strap anchoring skull hood neatly down to the collar
    const strapCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(side * 0.074, 0.005, 0.002),
      new THREE.Vector3(side * 0.08, -0.052, 0.01),
      new THREE.Vector3(side * 0.056, -0.108, 0.006)
    );
    g.add(new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 10, 0.013, 8, false), shadeMat));
  });

  // Small feline skull nasal cutout in center of brow + stitched bone grin crest
  const noseCut = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.015, 3), socketMat);
  noseCut.position.set(0, 0.036, 0.055);
  noseCut.rotation.z = Math.PI;
  g.add(noseCut);

  const collarArc = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.009, 8, 18, Math.PI), accentBoneMat);
  collarArc.rotation.x = Math.PI / 2 + 0.12;
  collarArc.position.set(0, -0.106, 0.01);
  g.add(collarArc);

  return g;
}

function buildCatSkeletonTorsoSuit(
  palette: CatSkeletonPalette,
  dims: CatRigDimensions = DEFAULT_CAT_RIG_DIMENSIONS
): THREE.Group {
  const g = new THREE.Group();

  const boneMat = new THREE.MeshStandardMaterial({
    color: palette.boneHex,
    roughness: 0.72,
    metalness: 0.06,
  });
  const ribAccentMat =
    palette.boneHex === 0x232830
      ? new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.62, metalness: 0.12 })
      : boneMat;

  // 1. Segmented external vertebral spine riding cleanly outside the cat's dorsal back
  const dorsalSamples = sampleCatDorsalSplinePoints(dims, 6, CAT_COSMETIC_CLEARANCE);
  const dorsalVecs = dorsalSamples.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  const spineCurve = new THREE.CatmullRomCurve3(dorsalVecs);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(spineCurve, 18, 0.014, 8, false), boneMat));

  // Rounded feline vertebrae beads along spine (distinct from spiky T-Rex)
  const upAxis = new THREE.Vector3(0, 1, 0);
  const normalVec = new THREE.Vector3();
  const qTmp = new THREE.Quaternion();
  dorsalSamples.forEach((pt, idx) => {
    const bead = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.02, 8), ribAccentMat);
    normalVec.set(0, pt.ny, pt.nz).normalize();
    qTmp.setFromUnitVectors(upAxis, normalVec);
    bead.quaternion.copy(qTmp);
    bead.position.set(
      pt.x,
      pt.y + normalVec.y * 0.011,
      pt.z + normalVec.z * 0.011
    );
    bead.scale.setScalar(idx === 2 || idx === 3 ? 1.08 : 0.92);
    g.add(bead);
  });

  // 2. 4 sleek curved feline ribcage arcs wrapping upper/mid torso strictly outside fur
  const ribClearance = Math.max(0.032, CAT_COSMETIC_CLEARANCE + 0.005);
  const minRibY = Math.max(0.145, dims.neckY - 0.066);
  for (let idx = 0; idx < 4; idx++) {
    const dorsalPt = dorsalSamples[Math.min(idx, dorsalSamples.length - 1)];
    const ribY = Math.max(minRibY, dorsalPt.y - 0.004);
    const ribEndTheta = idx === 0 ? 0.42 * Math.PI : idx === 1 ? 0.38 * Math.PI : 0.46 * Math.PI;
    [-1, 1].forEach((side) => {
      const p0 = new THREE.Vector3(side * 0.01, dorsalPt.y, dorsalPt.z);
      const mid1 = sampleCatTorsoOuterPoint(ribY, side * (0.78 * Math.PI), dims, ribClearance);
      const mid2 = sampleCatTorsoOuterPoint(ribY - 0.004, side * (0.58 * Math.PI), dims, ribClearance);
      const tip = sampleCatTorsoOuterPoint(ribY - 0.007, side * ribEndTheta, dims, ribClearance);
      const ribCurve = new THREE.CatmullRomCurve3([
        p0,
        new THREE.Vector3(mid1.x, mid1.y, mid1.z),
        new THREE.Vector3(mid2.x, mid2.y, mid2.z),
        new THREE.Vector3(tip.x, tip.y, tip.z),
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(ribCurve, 10, 0.0076, 7, false), ribAccentMat));
      const ribEnd = new THREE.Mesh(new THREE.SphereGeometry(0.008, 7, 7), ribAccentMat);
      ribEnd.position.set(tip.x, tip.y, tip.z);
      g.add(ribEnd);
    });
  }

  // 3. Curled articulated feline skeletal tail
  const lastDorsal = dorsalVecs[dorsalVecs.length - 1];
  const tailRootZ = Math.min(lastDorsal.z, dims.tailBasePos[2] - 0.022);
  const tailRootY = Math.max(dims.tailBasePos[1] + 0.008, lastDorsal.y - 0.006);
  const tailCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, tailRootY, tailRootZ),
    new THREE.Vector3(0, tailRootY + 0.018, tailRootZ - 0.09),
    new THREE.Vector3(0, tailRootY + 0.072, tailRootZ - 0.145)
  );
  g.add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 12, 0.009, 7, false), boneMat));
  [0.18, 0.38, 0.58, 0.78, 0.96].forEach((t) => {
    const pt = tailCurve.getPoint(t);
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.0125 * (1 - t * 0.38), 8, 8), ribAccentMat);
    joint.position.copy(pt);
    g.add(joint);
  });

  return g;
}

// Phase 7 ThumbnailStudio helper: build a standalone 3D preview mesh for any cat cosmetic
export function buildCatCosmeticPreviewMesh(cosmeticId: CatCosmeticId): THREE.Group {
  const profile = CAT_FIT_PROFILES.default;
  const dims = DEFAULT_CAT_RIG_DIMENSIONS;
  const wrap = new THREE.Group();
  if (cosmeticId === 'glasses') {
    wrap.add(buildRoundGlassesMesh(profile));
  } else if (cosmeticId === 'thuglife_glasses') {
    wrap.add(buildThuglifeGlassesMesh(profile));
  } else if (cosmeticId === 'mustache_black') {
    wrap.add(buildMustacheMesh(0x18181b, profile));
  } else if (cosmeticId === 'mustache_brown') {
    wrap.add(buildMustacheMesh(0x5c3a21, profile));
  } else if (cosmeticId === 'mustache_white') {
    wrap.add(buildMustacheMesh(0xf5f5f4, profile));
  } else if (cosmeticId === 'monocle') {
    wrap.add(buildMonocleMesh(profile));
  } else if (cosmeticId === 'gold_chain') {
    wrap.add(buildGoldChainMesh(profile));
  } else if (cosmeticId === 'platinum_chain') {
    wrap.add(buildPlatinumChainMesh(profile));
  } else if (cosmeticId === 'beret') {
    wrap.add(buildBeretMesh(profile));
  } else if (cosmeticId === 'top_hat_white') {
    wrap.add(buildTopHatMesh(0xf4f1ea, profile));
  } else if (cosmeticId === 'top_hat_black') {
    wrap.add(buildTopHatMesh(0x18181b, profile));
  } else if (cosmeticId === 'top_hat_gray') {
    wrap.add(buildTopHatMesh(0x71717a, profile));
  } else if (cosmeticId === 'dino_costume') {
    const hood = buildDinoHeadHood(profile, dims);
    hood.position.set(0, 0.145, 0.052);
    const body = buildDinoTorsoSuit(profile, dims);
    body.position.set(0, -0.11, 0.02);
    wrap.add(hood, body);
  } else if (
    cosmeticId === 'skeleton_warm_white' ||
    cosmeticId === 'skeleton_gray' ||
    cosmeticId === 'skeleton_black'
  ) {
    const pal = CAT_SKELETON_PALETTES[cosmeticId];
    const hood = buildCatSkeletonHeadHood(pal, dims);
    hood.position.set(0, 0.145, 0.052);
    const body = buildCatSkeletonTorsoSuit(pal, dims);
    body.position.set(0, -0.11, 0.02);
    wrap.add(hood, body);
  } else {
    const hexMap: Record<string, string> = {
      cloth_pink: '#f48fb1',
      cloth_yellow: '#f6d365',
      cloth_blue: '#60a5fa',
      cloth_white: '#f5f0e6',
      cloth_orange: '#fb923c',
    };
    const vest = buildClothVestMesh(hexMap[cosmeticId] || '#f48fb1', profile, dims);
    vest.position.set(0, -0.125, -0.01);
    wrap.add(vest);
  }
  return wrap;
}

export function attachCatCosmeticsRig(
  catId: CafeCatId,
  sockets: CatCosmeticSockets,
  onToggleBaseCollar?: (visible: boolean) => void
): CatCosmeticRigController {
  const profile = getCatFitProfile(catId) ?? CAT_FIT_PROFILES.default;
  const rigDims = sockets.rigDimensions ?? DEFAULT_CAT_RIG_DIMENSIONS;

  const cosmeticMeshes = new Map<CatCosmeticId, THREE.Object3D[]>();

  // 1. Eyewear (Glasses, Thuglife, Mustache x3, Monocle)
  const glasses = buildRoundGlassesMesh(profile);
  glasses.visible = false;
  sockets.anchorEyes.add(glasses);
  cosmeticMeshes.set('glasses', [glasses]);

  const thuglife = buildThuglifeGlassesMesh(profile);
  thuglife.visible = false;
  sockets.anchorEyes.add(thuglife);
  cosmeticMeshes.set('thuglife_glasses', [thuglife]);

  const mustacheSpecs: Array<{ id: CatCosmeticId; hex: number }> = [
    { id: 'mustache_black', hex: 0x18181b },
    { id: 'mustache_brown', hex: 0x5c3a21 },
    { id: 'mustache_white', hex: 0xf5f5f4 },
  ];
  mustacheSpecs.forEach(({ id, hex }) => {
    const m = buildMustacheMesh(hex, profile);
    m.visible = false;
    sockets.anchorEyes.add(m);
    cosmeticMeshes.set(id, [m]);
  });

  const monocle = buildMonocleMesh(profile);
  monocle.visible = false;
  sockets.anchorEyes.add(monocle);
  cosmeticMeshes.set('monocle', [monocle]);

  // 2. Neck (Gold Chain & Platinum Chain)
  const goldChain = buildGoldChainMesh(profile);
  goldChain.visible = false;
  sockets.anchorNeck.add(goldChain);
  cosmeticMeshes.set('gold_chain', [goldChain]);

  const platinumChain = buildPlatinumChainMesh(profile);
  platinumChain.visible = false;
  sockets.anchorNeck.add(platinumChain);
  cosmeticMeshes.set('platinum_chain', [platinumChain]);

  // 3. Headwear (Beret & Cat Top Hat x3)
  const beret = buildBeretMesh(profile);
  beret.visible = false;
  sockets.anchorHeadTop.add(beret);
  cosmeticMeshes.set('beret', [beret]);

  const topHatSpecs: Array<{ id: CatCosmeticId; hex: number }> = [
    { id: 'top_hat_white', hex: 0xf4f1ea },
    { id: 'top_hat_black', hex: 0x18181b },
    { id: 'top_hat_gray', hex: 0x71717a },
  ];
  topHatSpecs.forEach(({ id, hex }) => {
    const hat = buildTopHatMesh(hex, profile);
    hat.visible = false;
    sockets.anchorHeadTop.add(hat);
    cosmeticMeshes.set(id, [hat]);
  });

  // Mount container for body-aligned conformal outfits (bodyRoot = un-tilted bodyPivot when provided)
  const bodyMountParent = sockets.bodyRoot ?? sockets.anchorTorso;
  const needsFallbackOffset = !sockets.bodyRoot;

  // 4. Conformal Sleeveless Knit Pet Vests (5 colors — zero chest/belly clipping on all cat sizes)
  const clothSpecs: Array<{ id: CatCosmeticId; hex: string }> = [
    { id: 'cloth_pink', hex: '#f48fb1' },
    { id: 'cloth_yellow', hex: '#f6d365' },
    { id: 'cloth_blue', hex: '#60a5fa' },
    { id: 'cloth_white', hex: '#f5f0e6' },
    { id: 'cloth_orange', hex: '#fb923c' },
  ];
  clothSpecs.forEach(({ id, hex }) => {
    const vest = buildClothVestMesh(hex, profile, rigDims);
    if (needsFallbackOffset) {
      vest.position.set(0, -0.116, 0.006);
      vest.rotation.x = -0.24;
    }
    vest.visible = false;
    bodyMountParent.add(vest);
    cosmeticMeshes.set(id, [vest]);
  });

  // 5. Full Suit: Dinosaur Costume + 3 Secret Cat Skeleton Outfits (Warm White, Gray, Black)
  const dinoHood = buildDinoHeadHood(profile, rigDims);
  dinoHood.visible = false;
  sockets.anchorHeadTop.add(dinoHood);

  const dinoSuit = buildDinoTorsoSuit(profile, rigDims);
  if (needsFallbackOffset) {
    dinoSuit.position.set(0, -0.116, 0.006);
    dinoSuit.rotation.x = -0.24;
  }
  dinoSuit.visible = false;
  bodyMountParent.add(dinoSuit);

  cosmeticMeshes.set('dino_costume', [dinoHood, dinoSuit]);

  const skeletonIds: Array<'skeleton_warm_white' | 'skeleton_gray' | 'skeleton_black'> = [
    'skeleton_warm_white',
    'skeleton_gray',
    'skeleton_black',
  ];
  skeletonIds.forEach((id) => {
    const pal = CAT_SKELETON_PALETTES[id];
    const skelHood = buildCatSkeletonHeadHood(pal, rigDims);
    skelHood.visible = false;
    sockets.anchorHeadTop.add(skelHood);

    const skelSuit = buildCatSkeletonTorsoSuit(pal, rigDims);
    if (needsFallbackOffset) {
      skelSuit.position.set(0, -0.116, 0.006);
      skelSuit.rotation.x = -0.24;
    }
    skelSuit.visible = false;
    bodyMountParent.add(skelSuit);
    cosmeticMeshes.set(id, [skelHood, skelSuit]);
  });

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

    // Hide cat's stock collar while Gold Chain or Platinum Chain is equipped so they don't overlap
    if (onToggleBaseCollar) {
      onToggleBaseCollar(!activeIds.has('gold_chain') && !activeIds.has('platinum_chain'));
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
