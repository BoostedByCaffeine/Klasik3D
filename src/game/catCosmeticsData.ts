// Pure Adaptive Cat Cosmetics Data, Fit Profiles & Meta-Unlock Logic
// Zero DOM / Three.js dependencies so Node unit tests verify every rule deterministically.

export type CatCosmeticSlot = 'eyewear' | 'headwear' | 'neckwear' | 'body' | 'full_suit';

export type CatCosmeticId =
  | 'glasses'
  | 'thuglife_glasses'
  | 'mustache_black'
  | 'mustache_brown'
  | 'mustache_white'
  | 'monocle'
  | 'gold_chain'
  | 'platinum_chain'
  | 'beret'
  | 'top_hat_white'
  | 'top_hat_black'
  | 'top_hat_gray'
  | 'cloth_pink'
  | 'cloth_yellow'
  | 'cloth_blue'
  | 'cloth_white'
  | 'cloth_orange'
  | 'dino_costume'
  | 'skeleton_warm_white'
  | 'skeleton_gray'
  | 'skeleton_black';

export interface CatCosmeticSpec {
  id: CatCosmeticId;
  name: string;
  slot: CatCosmeticSlot;
  unlockType: 'shop' | 'revenue' | 'golden_espresso' | 'meta_all_9';
  cost: number; // Shop price ($) or revenue milestone ($) or 9 for meta
  swatchHex?: string;
  meshColorHex: number;
  description: string;
  variantGroup?: 'cloth' | 'top_hat' | 'mustache' | 'skeleton';
  /** If set, item stays completely invisible in the shop until this cosmetic ID is unlocked. */
  secretRequiresCosmetic?: CatCosmeticId;
}

export interface CatLoadout {
  eyewear: CatCosmeticId | null;
  headwear: CatCosmeticId | null;
  neckwear: CatCosmeticId | null;
  body: CatCosmeticId | null;
  full_suit: CatCosmeticId | null;
}

export interface CatFitProfile {
  bodyScale: number;
  headScale: number;
  eyeWidth: number;
  neckRadius: number;
  torsoScale: readonly [number, number, number];
  furOffset: number;
}

/** Guaranteed positive outward clearance so cloth and plush bones never clip into fur meshes. */
export const CAT_COSMETIC_CLEARANCE = 0.028;

/** Measured procedural anatomy dimensions in cat bodyPivot local space plus root scale. */
export interface CatRigDimensions {
  torsoRadiusX: number;
  torsoRadiusY: number;
  torsoRadiusZ: number;
  torsoCenterY: number;
  torsoCenterZ: number;
  torsoPitch: number;
  chestRadiusX: number;
  chestRadiusY: number;
  chestRadiusZ: number;
  chestCenterY: number;
  chestCenterZ: number;
  headRadius: number;
  neckY: number;
  tailBasePos: readonly [number, number, number];
  rootScale: readonly [number, number, number];
}

export const DEFAULT_CAT_RIG_DIMENSIONS: CatRigDimensions = {
  torsoRadiusX: 0.095 * 0.88, // 0.0836
  torsoRadiusY: 0.095 * 1.18, // 0.1121
  torsoRadiusZ: 0.095 * 1.05, // 0.09975
  torsoCenterY: 0.115,
  torsoCenterZ: -0.01,
  torsoPitch: 0.24,
  chestRadiusX: 0.068 * 0.95, // 0.0646
  chestRadiusY: 0.068 * 1.05, // 0.0714
  chestRadiusZ: 0.068 * 0.9,  // 0.0612
  chestCenterY: 0.14,
  chestCenterZ: 0.054,
  headRadius: 0.072,
  neckY: 0.205,
  tailBasePos: [0, 0.065, -0.095],
  rootScale: [1, 1, 1],
};

/**
 * Ray-ellipsoid horizontal intersection from spine axis (0, y, axisZ) along unit direction (sin(theta), cos(theta)).
 * Returns positive ray distance from (0, y, axisZ) to the outer surface of the ellipsoid, or 0 if y is outside.
 */
function intersectEllipsoidHorizontalRay(
  y: number,
  dirX: number,
  dirZ: number,
  axisZ: number,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number
): number {
  const dy = (y - cy) / ry;
  const yTerm = dy * dy;
  if (yTerm >= 0.995) return 0;

  const ox = -cx;
  const oz = axisZ - cz;
  const a = (dirX * dirX) / (rx * rx) + (dirZ * dirZ) / (rz * rz);
  const b = 2 * ((ox * dirX) / (rx * rx) + (oz * dirZ) / (rz * rz));
  const c = (ox * ox) / (rx * rx) + (oz * oz) / (rz * rz) + yTerm - 1;
  const disc = b * b - 4 * a * c;
  if (disc < 0 || a <= 1e-8) return 0;
  const t = (-b + Math.sqrt(disc)) / (2 * a);
  return t > 0 ? t : 0;
}

/**
 * Samples a conformal point strictly outside the combined cat torso + chest ellipsoids at height `y`
 * and azimuth `theta` (theta = 0 is front chest +Z, theta = PI is dorsal back -Z).
 */
export function sampleCatTorsoOuterPoint(
  y: number,
  theta: number,
  dims: CatRigDimensions = DEFAULT_CAT_RIG_DIMENSIONS,
  clearance: number = CAT_COSMETIC_CLEARANCE
): { x: number; y: number; z: number; nx: number; nz: number } {
  const axisZ = 0.014;
  const dirX = Math.sin(theta);
  const dirZ = Math.cos(theta);

  const rTorso = intersectEllipsoidHorizontalRay(
    y,
    dirX,
    dirZ,
    axisZ,
    0,
    dims.torsoCenterY,
    dims.torsoCenterZ,
    dims.torsoRadiusX,
    dims.torsoRadiusY,
    dims.torsoRadiusZ
  );
  const rChest = intersectEllipsoidHorizontalRay(
    y,
    dirX,
    dirZ,
    axisZ,
    0,
    dims.chestCenterY,
    dims.chestCenterZ,
    dims.chestRadiusX,
    dims.chestRadiusY,
    dims.chestRadiusZ
  );

  // Smooth max (log-sum-exp style) prevents harsh creases where chest & torso spheres meet while staying >= max(rTorso, rChest)
  const rMax = Math.max(rTorso, rChest, 0.042);
  const smoothBoost = rTorso > 0 && rChest > 0 ? 0.004 * Math.exp(-Math.abs(rTorso - rChest) / 0.018) : 0;

  // Scale local clearance gently to compensate for small/chubby root scales while keeping >= 0.016 local clearance
  const avgScale = Math.max(
    0.65,
    (dims.rootScale[0] + dims.rootScale[1] + dims.rootScale[2]) / 3
  );
  const localClearance = Math.max(0.014, Math.min(0.024, (clearance * 0.62) / Math.sqrt(avgScale)));

  const rFinal = rMax + smoothBoost + localClearance;
  return {
    x: dirX * rFinal,
    y,
    z: axisZ + dirZ * rFinal,
    nx: dirX,
    nz: dirZ,
  };
}

/**
 * Samples `count` points along the OUTER dorsal back meridian of the cat's torso ellipsoid
 * (`surfacePoint + outwardNormal * clearance`) from nape down to rump/tail-base so the
 * Skeleton T-Rex vertebral spine & spikes always sit strictly OUTSIDE the cat's back fur.
 */
export function sampleCatDorsalSplinePoints(
  dims: CatRigDimensions = DEFAULT_CAT_RIG_DIMENSIONS,
  count: number = 6,
  clearance: number = CAT_COSMETIC_CLEARANCE
): Array<{ x: number; y: number; z: number; ny: number; nz: number }> {
  const avgScale = Math.max(
    0.65,
    (dims.rootScale[0] + dims.rootScale[1] + dims.rootScale[2]) / 3
  );
  const outwardOffset = Math.max(0.018, Math.min(0.032, (clearance * 0.78) / Math.sqrt(avgScale)));

  // Dorsal polar angle alpha from upper shoulder/nape (+1.05 rad) down to lower rump (-0.52 rad)
  const startAlpha = 1.02;
  const endAlpha = -0.52;
  const points: Array<{ x: number; y: number; z: number; ny: number; nz: number }> = [];

  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    const alpha = startAlpha + (endAlpha - startAlpha) * t;
    const surfY = dims.torsoCenterY + dims.torsoRadiusY * Math.sin(alpha);
    const surfZ = dims.torsoCenterZ - dims.torsoRadiusZ * Math.cos(alpha);

    // Exact outward unit normal of ellipsoid on the x=0 dorsal meridian
    const rawNy = Math.sin(alpha) / dims.torsoRadiusY;
    const rawNz = -Math.cos(alpha) / dims.torsoRadiusZ;
    const nLen = Math.hypot(rawNy, rawNz) || 1;
    const ny = rawNy / nLen;
    const nz = rawNz / nLen;

    points.push({
      x: 0,
      y: surfY + ny * outwardOffset,
      z: surfZ + nz * outwardOffset,
      ny,
      nz,
    });
  }

  return points;
}

export const BERET_REVENUE_MILESTONE = 10000;
export const GOLDEN_ESPRESSO_COST = 50000;
export const MONOCLE_REVENUE_MILESTONE = 50000;

export const BASE_CAT_COSMETIC_IDS: readonly CatCosmeticId[] = [
  'glasses',
  'thuglife_glasses',
  'gold_chain',
  'beret',
  'cloth_pink',
  'cloth_yellow',
  'cloth_blue',
  'cloth_white',
  'cloth_orange',
] as const;

export const CAT_COSMETICS_CATALOG: readonly CatCosmeticSpec[] = [
  {
    id: 'glasses',
    name: 'Cat Glasses',
    slot: 'eyewear',
    unlockType: 'shop',
    cost: 150,
    meshColorHex: 0xd4a359,
    description: 'Classic round wire-frame cafe glasses resting on the nose bridge.',
  },
  {
    id: 'thuglife_glasses',
    name: 'Thuglife Cat Glasses',
    slot: 'eyewear',
    unlockType: 'shop',
    cost: 250,
    meshColorHex: 0x09090b,
    description: 'Iconic pixelated black 8-bit sunglasses with crisp white pixel glare.',
  },
  {
    id: 'mustache_black',
    name: 'Cat Mustache — Black',
    slot: 'eyewear',
    unlockType: 'shop',
    cost: 50,
    swatchHex: '#18181b',
    meshColorHex: 0x18181b,
    variantGroup: 'mustache',
    description: 'Dapper curled jet-black handlebar mustache resting neatly beneath the nose.',
  },
  {
    id: 'mustache_brown',
    name: 'Cat Mustache — Brown',
    slot: 'eyewear',
    unlockType: 'shop',
    cost: 50,
    swatchHex: '#5c3a21',
    meshColorHex: 0x5c3a21,
    variantGroup: 'mustache',
    description: 'Warm espresso-brown curled handlebar mustache for distinguished cafe cats.',
  },
  {
    id: 'mustache_white',
    name: 'Cat Mustache — White',
    slot: 'eyewear',
    unlockType: 'shop',
    cost: 50,
    swatchHex: '#f5f5f4',
    meshColorHex: 0xf5f5f4,
    variantGroup: 'mustache',
    description: 'Crisp snow-white curled handlebar mustache with vintage cafe flair.',
  },
  {
    id: 'monocle',
    name: 'Distinguished Monocle',
    slot: 'eyewear',
    unlockType: 'revenue',
    cost: MONOCLE_REVENUE_MILESTONE,
    swatchHex: '#eab308',
    meshColorHex: 0xeab308,
    description:
      'Polished brass single-eye monocle with draped fine chain ($50,000 total revenue).',
  },
  {
    id: 'gold_chain',
    name: 'Gold Chain',
    slot: 'neckwear',
    unlockType: 'golden_espresso',
    cost: GOLDEN_ESPRESSO_COST,
    swatchHex: '#fbbf24',
    meshColorHex: 0xfbbf24,
    description:
      'Layered metallic 24K gold Cuban-link chain unlocked alongside the Golden Espresso Machine ($50,000).',
  },
  {
    id: 'platinum_chain',
    name: 'Platinum Chain',
    slot: 'neckwear',
    unlockType: 'golden_espresso',
    cost: GOLDEN_ESPRESSO_COST,
    swatchHex: '#e5e7eb',
    meshColorHex: 0xe5e7eb,
    description:
      'Mirror-polished heavy platinum Cuban-link chain & faceted pendant unlocked with the Golden Espresso Machine ($50,000).',
  },
  {
    id: 'beret',
    name: 'Cat Beret',
    slot: 'headwear',
    unlockType: 'revenue',
    cost: BERET_REVENUE_MILESTONE,
    meshColorHex: 0x9f1239,
    description:
      'Soft tilted French artist beret resting naturally between the ears ($10,000 total revenue).',
  },
  {
    id: 'top_hat_white',
    name: 'Cat Top Hat — White',
    slot: 'headwear',
    unlockType: 'shop',
    cost: 250,
    swatchHex: '#f4f1ea',
    meshColorHex: 0xf4f1ea,
    variantGroup: 'top_hat',
    description: 'Ivory-white tailored felt top hat with dark espresso satin ribbon band.',
  },
  {
    id: 'top_hat_black',
    name: 'Cat Top Hat — Black',
    slot: 'headwear',
    unlockType: 'shop',
    cost: 250,
    swatchHex: '#18181b',
    meshColorHex: 0x18181b,
    variantGroup: 'top_hat',
    description: 'Classic obsidian-black felt top hat with warm satin ribbon trim.',
  },
  {
    id: 'top_hat_gray',
    name: 'Cat Top Hat — Gray',
    slot: 'headwear',
    unlockType: 'shop',
    cost: 250,
    swatchHex: '#71717a',
    meshColorHex: 0x71717a,
    variantGroup: 'top_hat',
    description: 'Heather-gray felt top hat styled for formal cafe appearances.',
  },
  {
    id: 'cloth_pink',
    name: 'Cat Cloth — Pink',
    slot: 'body',
    unlockType: 'shop',
    cost: 50,
    swatchHex: '#f472b6',
    meshColorHex: 0xf472b6,
    variantGroup: 'cloth',
    description: 'Cozy fitted pastel-pink knit cafe shirt/vest.',
  },
  {
    id: 'cloth_yellow',
    name: 'Cat Cloth — Yellow',
    slot: 'body',
    unlockType: 'shop',
    cost: 50,
    swatchHex: '#facc15',
    meshColorHex: 0xfacc15,
    variantGroup: 'cloth',
    description: 'Cozy fitted warm-yellow knit cafe shirt/vest.',
  },
  {
    id: 'cloth_blue',
    name: 'Cat Cloth — Blue',
    slot: 'body',
    unlockType: 'shop',
    cost: 50,
    swatchHex: '#60a5fa',
    meshColorHex: 0x60a5fa,
    variantGroup: 'cloth',
    description: 'Cozy fitted soft-blue knit cafe shirt/vest.',
  },
  {
    id: 'cloth_white',
    name: 'Cat Cloth — White',
    slot: 'body',
    unlockType: 'shop',
    cost: 50,
    swatchHex: '#f8fafc',
    meshColorHex: 0xf8fafc,
    variantGroup: 'cloth',
    description: 'Cozy fitted cream-white knit cafe shirt/vest.',
  },
  {
    id: 'cloth_orange',
    name: 'Cat Cloth — Orange',
    slot: 'body',
    unlockType: 'shop',
    cost: 50,
    swatchHex: '#fb923c',
    meshColorHex: 0xfb923c,
    variantGroup: 'cloth',
    description: 'Cozy fitted tangerine-orange knit cafe shirt/vest.',
  },
  {
    id: 'dino_costume',
    name: 'Skeleton T-Rex Costume',
    slot: 'full_suit',
    unlockType: 'meta_all_9',
    cost: 9,
    swatchHex: '#f2efe9',
    meshColorHex: 0xf2efe9,
    description:
      'Plush bone-white Skeleton T-Rex open-jaw skull hood + curved back ribcage, dorsal bone spikes & tail. Auto-unlocks once all 9 base cosmetics are owned!',
  },
  {
    id: 'skeleton_warm_white',
    name: 'Cat Skeleton — Warm White',
    slot: 'full_suit',
    unlockType: 'shop',
    cost: 350,
    swatchHex: '#f5efe6',
    meshColorHex: 0xf5efe6,
    variantGroup: 'skeleton',
    secretRequiresCosmetic: 'dino_costume',
    description:
      'Secret bone-craft feline skeleton costume in warm ivory bone plush with sculpted cat-ear skull hood & ribcage.',
  },
  {
    id: 'skeleton_gray',
    name: 'Cat Skeleton — Gray',
    slot: 'full_suit',
    unlockType: 'shop',
    cost: 350,
    swatchHex: '#9ca3af',
    meshColorHex: 0x9ca3af,
    variantGroup: 'skeleton',
    secretRequiresCosmetic: 'dino_costume',
    description:
      'Secret feline skeleton costume in weathered ash-gray stone bone with sculpted skull hood, ribcage & tail.',
  },
  {
    id: 'skeleton_black',
    name: 'Cat Skeleton — Black',
    slot: 'full_suit',
    unlockType: 'shop',
    cost: 350,
    swatchHex: '#1f242b',
    meshColorHex: 0x1f242b,
    variantGroup: 'skeleton',
    secretRequiresCosmetic: 'dino_costume',
    description:
      'Secret obsidian-black feline skeleton costume with high-contrast charcoal bones, skull hood & spine.',
  },
] as const;

export const ALL_CAT_COSMETIC_IDS: readonly CatCosmeticId[] = CAT_COSMETICS_CATALOG.map(
  (c) => c.id
);

export const CAT_FIT_PROFILES: Record<string, CatFitProfile> = {
  default: {
    bodyScale: 1.0,
    headScale: 1.0,
    eyeWidth: 1.0,
    neckRadius: 1.0,
    torsoScale: [1.0, 1.0, 1.0],
    furOffset: 0.014,
  },
  champy: {
    bodyScale: 1.0,
    headScale: 1.0,
    eyeWidth: 1.0,
    neckRadius: 1.0,
    torsoScale: [1.0, 1.0, 1.0],
    furOffset: 0.014,
  },
  amby: {
    bodyScale: 1.0,
    headScale: 1.0,
    eyeWidth: 1.0,
    neckRadius: 1.0,
    torsoScale: [1.0, 1.0, 1.0],
    furOffset: 0.014,
  },
  gigi: {
    bodyScale: 0.68,
    headScale: 0.82,
    eyeWidth: 0.8,
    neckRadius: 0.72,
    torsoScale: [0.68, 0.7, 0.68],
    furOffset: 0.011,
  },
  tisay: {
    bodyScale: 1.0,
    headScale: 0.96,
    eyeWidth: 0.94,
    neckRadius: 0.86,
    torsoScale: [0.82, 0.95, 1.0],
    furOffset: 0.013,
  },
  chunky: {
    bodyScale: 1.05,
    headScale: 1.05,
    eyeWidth: 1.08,
    neckRadius: 1.22,
    torsoScale: [1.28, 1.15, 1.04],
    furOffset: 0.022,
  },
  kicks: {
    bodyScale: 1.24,
    headScale: 1.18,
    eyeWidth: 1.16,
    neckRadius: 1.22,
    torsoScale: [1.24, 1.2, 1.24],
    furOffset: 0.018,
  },
  luna: {
    bodyScale: 0.92,
    headScale: 0.94,
    eyeWidth: 0.92,
    neckRadius: 0.84,
    torsoScale: [0.82, 1.0, 0.88],
    furOffset: 0.013,
  },
  mikmik: {
    bodyScale: 1.14,
    headScale: 1.12,
    eyeWidth: 1.1,
    neckRadius: 1.15,
    torsoScale: [1.15, 1.12, 1.14],
    furOffset: 0.017,
  },
  lilo: {
    bodyScale: 0.92,
    headScale: 0.98,
    eyeWidth: 1.0,
    neckRadius: 1.06,
    torsoScale: [1.1, 0.82, 0.88],
    furOffset: 0.016,
  },
};

export function getCatFitProfile(catId: string | undefined | null): CatFitProfile {
  if (catId && CAT_FIT_PROFILES[catId]) {
    return CAT_FIT_PROFILES[catId];
  }
  return CAT_FIT_PROFILES.default;
}

export function isValidCatCosmeticId(val: unknown): val is CatCosmeticId {
  return typeof val === 'string' && ALL_CAT_COSMETIC_IDS.includes(val as CatCosmeticId);
}

export function getCatCosmeticSpec(id: CatCosmeticId): CatCosmeticSpec {
  return CAT_COSMETICS_CATALOG.find((c) => c.id === id) || CAT_COSMETICS_CATALOG[0];
}

/**
 * Pure secret-shop visibility gate: items with `secretRequiresCosmetic` stay completely
 * invisible in the Cosmetics Shop until the prerequisite cosmetic (e.g. `dino_costume`) is unlocked.
 */
export function isCatCosmeticVisibleInShop(
  spec: CatCosmeticSpec,
  unlockedCosmetics: readonly CatCosmeticId[] | undefined
): boolean {
  if (!spec.secretRequiresCosmetic) return true;
  return Array.isArray(unlockedCosmetics) && unlockedCosmetics.includes(spec.secretRequiresCosmetic);
}

export function createEmptyCatLoadout(): CatLoadout {
  return {
    eyewear: null,
    headwear: null,
    neckwear: null,
    body: null,
    full_suit: null,
  };
}

export function normalizeCatLoadout(raw: Partial<CatLoadout> | undefined | null): CatLoadout {
  const base = createEmptyCatLoadout();
  if (!raw || typeof raw !== 'object') return base;
  return {
    eyewear: isValidCatCosmeticId(raw.eyewear) ? raw.eyewear : null,
    headwear: isValidCatCosmeticId(raw.headwear) ? raw.headwear : null,
    neckwear: isValidCatCosmeticId(raw.neckwear) ? raw.neckwear : null,
    body: isValidCatCosmeticId(raw.body) ? raw.body : null,
    full_suit: isValidCatCosmeticId(raw.full_suit) ? raw.full_suit : null,
  };
}

// Meta-unlock checker: once ALL 9 base cat cosmetics are owned, Dinosaur Costume unlocks automatically!
export function checkDinoCostumeUnlock(unlockedCosmetics: readonly CatCosmeticId[]): {
  unlockedCosmetics: CatCosmeticId[];
  justUnlockedDino: boolean;
} {
  const set = new Set<CatCosmeticId>(unlockedCosmetics.filter(isValidCatCosmeticId));
  const alreadyHasDino = set.has('dino_costume');
  const ownsAllNine = BASE_CAT_COSMETIC_IDS.every((id) => set.has(id));
  if (ownsAllNine && !alreadyHasDino) {
    set.add('dino_costume');
    return {
      unlockedCosmetics: ALL_CAT_COSMETIC_IDS.filter((id) => set.has(id)),
      justUnlockedDino: true,
    };
  }
  return {
    unlockedCosmetics: ALL_CAT_COSMETIC_IDS.filter((id) => set.has(id)),
    justUnlockedDino: false,
  };
}

export function syncCatCosmeticMilestones(
  currentUnlocked: readonly CatCosmeticId[] | undefined,
  lifetimeRevenue: number,
  goldenEspressoUnlocked: boolean
): {
  unlockedCosmetics: CatCosmeticId[];
  newlyUnlocked: CatCosmeticId[];
  toastMessage: string | null;
} {
  const set = new Set<CatCosmeticId>(
    Array.isArray(currentUnlocked) ? currentUnlocked.filter(isValidCatCosmeticId) : []
  );
  const newlyUnlocked: CatCosmeticId[] = [];

  if (lifetimeRevenue >= BERET_REVENUE_MILESTONE && !set.has('beret')) {
    set.add('beret');
    newlyUnlocked.push('beret');
  }

  if (lifetimeRevenue >= MONOCLE_REVENUE_MILESTONE && !set.has('monocle')) {
    set.add('monocle');
    newlyUnlocked.push('monocle');
  }

  if (goldenEspressoUnlocked || lifetimeRevenue >= GOLDEN_ESPRESSO_COST) {
    if (!set.has('gold_chain')) {
      set.add('gold_chain');
      newlyUnlocked.push('gold_chain');
    }
    if (!set.has('platinum_chain')) {
      set.add('platinum_chain');
      newlyUnlocked.push('platinum_chain');
    }
  }

  const dinoCheck = checkDinoCostumeUnlock(Array.from(set));
  if (dinoCheck.justUnlockedDino) {
    newlyUnlocked.push('dino_costume');
  }

  let toastMessage: string | null = null;
  if (dinoCheck.justUnlockedDino) {
    toastMessage =
      '🦖 Master Wardrobe Complete! Dinosaur Costume unlocked — and Secret Cat Skeleton outfits revealed in the shop!';
  } else if (
    newlyUnlocked.includes('platinum_chain') &&
    newlyUnlocked.includes('gold_chain')
  ) {
    toastMessage =
      '✨ Gold Chain, Platinum Chain & Distinguished Monocle unlocked at $50,000!';
  } else if (newlyUnlocked.includes('platinum_chain')) {
    toastMessage =
      '✨ Platinum Chain Cat Cosmetic unlocked with the Golden Espresso Machine!';
  } else if (newlyUnlocked.includes('monocle')) {
    toastMessage =
      '🧐 $50,000 Revenue Milestone! Distinguished Monocle unlocked in Eyewear!';
  } else if (newlyUnlocked.includes('gold_chain')) {
    toastMessage = '✨ Gold Chain Cat Cosmetic unlocked with the Golden Espresso Machine!';
  } else if (newlyUnlocked.includes('beret')) {
    toastMessage = '🎨 $10,000 Revenue Milestone! Cat Beret unlocked in Cat Station!';
  }

  return {
    unlockedCosmetics: dinoCheck.unlockedCosmetics,
    newlyUnlocked,
    toastMessage,
  };
}

// Equipping full_suit ('dino_costume') visually overrides headwear + body while preserving stored slots;
// equipping headwear or body while full_suit is active clears full_suit so the newly picked item is visible!
export function applyCosmeticToLoadout(
  current: CatLoadout | undefined,
  cosmeticId: CatCosmeticId | null,
  slot: CatCosmeticSlot
): CatLoadout {
  const next = normalizeCatLoadout(current);
  if (cosmeticId === null) {
    next[slot] = null;
    return next;
  }

  const spec = getCatCosmeticSpec(cosmeticId);
  if (spec.slot === 'full_suit') {
    // Toggle off if already wearing this full_suit
    next.full_suit = next.full_suit === cosmeticId ? null : cosmeticId;
    return next;
  }

  // Toggle off if clicking already equipped item
  const alreadyEquipped = next[spec.slot] === cosmeticId;
  next[spec.slot] = alreadyEquipped ? null : cosmeticId;

  // If player picks a headwear or body item while full_suit is on, exit full_suit so it shows
  if (!alreadyEquipped && (spec.slot === 'headwear' || spec.slot === 'body')) {
    next.full_suit = null;
  }

  return next;
}

// Resolves effective visible cosmetics on the 3D rig (full_suit overrides headwear & body visually)
export function getEffectiveVisibleLoadout(loadout: CatLoadout | undefined): CatLoadout {
  const norm = normalizeCatLoadout(loadout);
  if (norm.full_suit) {
    return {
      ...norm,
      headwear: null,
      body: null,
    };
  }
  return norm;
}
