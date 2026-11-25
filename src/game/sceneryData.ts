// Pure Data & Rules for Outdoor Sceneries (9 Locations), Weather Exclusivity (Snow & Always-Winter),
// 6 Unlockable Weather-Reactive Patron Outfits, and Secret Multi-Role Easter Egg NPC ("Beb" / "Anton" / "Duminiki").
// Zero Three.js or DOM imports so unit tests run directly in node:test.

export type SceneryId =
  | 'busy_street'
  | 'mayon_volcano'
  | 'hilltop_city_lights'
  | 'japanese_tranquility'
  | 'brazilian_favela'
  | 'cyberpunk_neon'
  | 'eiffel_tower'
  | 'switzerland_hilltop'
  | 'mt_everest';

export type ClimateState = 'summer' | 'winter';
export type AllowedWeatherToken = 'clear' | 'rain' | 'snow';
export type ScenerySpecialParticle =
  | null
  | 'highland_mist'
  | 'sakura_or_fireflies'
  | 'neon_rain'
  | 'snow';

export type PatronOutfitId =
  | 'filipino'
  | 'brazilian'
  | 'ancient_japanese'
  | 'french'
  | 'swiss'
  | 'hiker';

export type PatronOutfitWeatherMode = 'all-weather' | 'weather-reactive' | 'winter-only';

export interface SceneryWeatherRule {
  allowed: readonly AllowedWeatherToken[];
  alwaysWinter: boolean;
  specialParticle: ScenerySpecialParticle;
}

export interface ScenerySpec {
  id: SceneryId;
  order: number;
  name: string;
  subtitle: string;
  description: string;
  unlockMethod: 'default' | 'shop' | 'revenue_milestone' | 'prestige_milestone';
  cost: number; // Cash cost for 'shop'; 0 for default / milestone
  revenueMilestone: number; // Lifetime gross revenue requirement for milestone unlocks (0 if shop/default)
  matchingPatronOutfit: PatronOutfitId | null;
  weatherRule: SceneryWeatherRule;
  badgeText: string;
  accentHex: string;
  hasScenicOverlook: boolean;
}

export const SWITZERLAND_REVENUE_MILESTONE = 35_000;
export const EVEREST_REVENUE_MILESTONE = 65_000;

export const SCENERY_WEATHER_RULES: Record<SceneryId, SceneryWeatherRule> = {
  busy_street: { allowed: ['clear', 'rain'], alwaysWinter: false, specialParticle: null },
  mayon_volcano: { allowed: ['clear', 'rain'], alwaysWinter: false, specialParticle: null },
  hilltop_city_lights: {
    allowed: ['clear', 'rain'],
    alwaysWinter: false,
    specialParticle: 'highland_mist',
  },
  japanese_tranquility: {
    allowed: ['clear', 'rain'],
    alwaysWinter: false,
    specialParticle: 'sakura_or_fireflies',
  },
  brazilian_favela: { allowed: ['clear', 'rain'], alwaysWinter: false, specialParticle: null },
  cyberpunk_neon: {
    allowed: ['clear', 'rain'],
    alwaysWinter: false,
    specialParticle: 'neon_rain',
  },
  eiffel_tower: {
    allowed: ['clear', 'rain', 'snow'],
    alwaysWinter: false,
    specialParticle: 'snow',
  },
  switzerland_hilltop: {
    allowed: ['clear', 'rain', 'snow'],
    alwaysWinter: false,
    specialParticle: 'snow',
  },
  mt_everest: {
    allowed: ['snow'],
    alwaysWinter: true,
    specialParticle: 'snow',
  },
};

export const SCENERY_CATALOG: readonly ScenerySpec[] = [
  {
    id: 'busy_street',
    order: 1,
    name: 'The Busy Street',
    subtitle: 'Urban Garage Lane',
    description: 'Cozy neighborhood storefronts, warm streetlights, and rolling urban traffic.',
    unlockMethod: 'default',
    cost: 0,
    revenueMilestone: 0,
    matchingPatronOutfit: 'filipino',
    weatherRule: SCENERY_WEATHER_RULES.busy_street,
    badgeText: 'Default',
    accentHex: '#f59e0b',
    hasScenicOverlook: false,
  },
  {
    id: 'mayon_volcano',
    order: 2,
    name: 'Mayon Volcano View',
    subtitle: 'Cagsawa Ruins, Bicol',
    description: 'Near-perfect volcanic cone with crater clouds, Cagsawa belfry ruin & swaying palms.',
    unlockMethod: 'shop',
    cost: 2000,
    revenueMilestone: 0,
    matchingPatronOutfit: 'filipino',
    weatherRule: SCENERY_WEATHER_RULES.mayon_volcano,
    badgeText: 'Bicol',
    accentHex: '#22c55e',
    hasScenicOverlook: true,
  },
  {
    id: 'hilltop_city_lights',
    order: 3,
    name: 'Hilltop City Lights',
    subtitle: 'Tagaytay / Baguio Ridge',
    description: 'Cool pine-lined highland ridge overlooking shimmering valley city lights & mist.',
    unlockMethod: 'shop',
    cost: 4000,
    revenueMilestone: 0,
    matchingPatronOutfit: 'filipino',
    weatherRule: SCENERY_WEATHER_RULES.hilltop_city_lights,
    badgeText: 'Highland Mist',
    accentHex: '#38bdf8',
    hasScenicOverlook: true,
  },
  {
    id: 'japanese_tranquility',
    order: 4,
    name: 'Japanese Tranquility',
    subtitle: 'Ancient Kyoto Town',
    description: 'Wooden machiya townhouses, glowing chochin lanterns, distant pagoda, Sakura & fireflies.',
    unlockMethod: 'shop',
    cost: 6500,
    revenueMilestone: 0,
    matchingPatronOutfit: 'ancient_japanese',
    weatherRule: SCENERY_WEATHER_RULES.japanese_tranquility,
    badgeText: 'Sakura & Fireflies',
    accentHex: '#f472b6',
    hasScenicOverlook: false,
  },
  {
    id: 'brazilian_favela',
    order: 5,
    name: 'Brazilian Favela',
    subtitle: 'Rio de Janeiro View',
    description: 'Sun-drenched colorful terraced hillside overlooking Guanabara Bay & Sugarloaf.',
    unlockMethod: 'shop',
    cost: 9500,
    revenueMilestone: 0,
    matchingPatronOutfit: 'brazilian',
    weatherRule: SCENERY_WEATHER_RULES.brazilian_favela,
    badgeText: 'Rio View',
    accentHex: '#facc15',
    hasScenicOverlook: false,
  },
  {
    id: 'cyberpunk_neon',
    order: 6,
    name: 'Cyberpunk Neon',
    subtitle: 'New Vision City',
    description: 'Towering megacity skyline, glowing cyan/magenta holograms & angled Neon Rain.',
    unlockMethod: 'shop',
    cost: 14000,
    revenueMilestone: 0,
    matchingPatronOutfit: null,
    weatherRule: SCENERY_WEATHER_RULES.cyberpunk_neon,
    badgeText: 'Neon Rain',
    accentHex: '#06b6d4',
    hasScenicOverlook: false,
  },
  {
    id: 'eiffel_tower',
    order: 7,
    name: 'Eiffel Tower View',
    subtitle: 'Paris Montmartre Terrace',
    description: 'Cobblestone hillside terrace, Haussmann rooftops & twinkling golden Eiffel Tower.',
    unlockMethod: 'shop',
    cost: 22000,
    revenueMilestone: 0,
    matchingPatronOutfit: 'french',
    weatherRule: SCENERY_WEATHER_RULES.eiffel_tower,
    badgeText: 'Snow Enabled',
    accentHex: '#fbbf24',
    hasScenicOverlook: true,
  },
  {
    id: 'switzerland_hilltop',
    order: 8,
    name: 'Switzerland Hilltop',
    subtitle: 'Alpine Overlook & Funicular',
    description: 'Snow-capped Swiss peaks, spruce ridges & a live red alpine inclined elevator.',
    unlockMethod: 'revenue_milestone',
    cost: 0,
    revenueMilestone: SWITZERLAND_REVENUE_MILESTONE,
    matchingPatronOutfit: 'swiss',
    weatherRule: SCENERY_WEATHER_RULES.switzerland_hilltop,
    badgeText: '$35K Milestone · Snow',
    accentHex: '#60a5fa',
    hasScenicOverlook: true,
  },
  {
    id: 'mt_everest',
    order: 9,
    name: 'Mt. Everest & Hiker Trail',
    subtitle: 'Himalayan Base Camp',
    description: 'Snowy stone hiker trail, jagged Mt. Everest peak & fluttering Tibetan prayer flags.',
    unlockMethod: 'prestige_milestone',
    cost: 0,
    revenueMilestone: EVEREST_REVENUE_MILESTONE,
    matchingPatronOutfit: 'hiker',
    weatherRule: SCENERY_WEATHER_RULES.mt_everest,
    badgeText: 'Always Winter · $65K',
    accentHex: '#bae6fd',
    hasScenicOverlook: true,
  },
] as const;

export const ALL_SCENERY_IDS: readonly SceneryId[] = SCENERY_CATALOG.map((s) => s.id);

export function isValidSceneryId(val: unknown): val is SceneryId {
  return typeof val === 'string' && ALL_SCENERY_IDS.includes(val as SceneryId);
}

export function getScenerySpec(id: SceneryId | null | undefined): ScenerySpec {
  return SCENERY_CATALOG.find((s) => s.id === id) || SCENERY_CATALOG[0];
}

export function isSnowAllowedForScenery(sceneryId: SceneryId): boolean {
  const rule = SCENERY_WEATHER_RULES[sceneryId] || SCENERY_WEATHER_RULES.busy_street;
  return rule.allowed.includes('snow');
}

export function isAlwaysWinterScenery(sceneryId: SceneryId): boolean {
  const rule = SCENERY_WEATHER_RULES[sceneryId] || SCENERY_WEATHER_RULES.busy_street;
  return rule.alwaysWinter;
}

export type ExtendedRainPreference = 'auto' | 'clear' | 'rain' | 'snow';

export function clampRainPreferenceForScenery(
  sceneryId: SceneryId,
  pref: ExtendedRainPreference
): ExtendedRainPreference {
  const rule = SCENERY_WEATHER_RULES[sceneryId] || SCENERY_WEATHER_RULES.busy_street;
  if (rule.alwaysWinter) {
    return 'snow';
  }
  if (pref === 'snow' && !rule.allowed.includes('snow')) {
    return 'clear';
  }
  return pref;
}

export function resolveClimateState(
  sceneryId: SceneryId,
  rainPreference: ExtendedRainPreference,
  isSnowing?: boolean
): ClimateState {
  const rule = SCENERY_WEATHER_RULES[sceneryId] || SCENERY_WEATHER_RULES.busy_street;
  if (rule.alwaysWinter) return 'winter';
  if (rule.allowed.includes('snow') && (rainPreference === 'snow' || Boolean(isSnowing))) {
    return 'winter';
  }
  return 'summer';
}

export function syncSceneryMilestones(
  unlockedSceneries: readonly SceneryId[],
  lifetimeGrossIncome: number
): {
  unlockedSceneries: SceneryId[];
  newlyUnlocked: ScenerySpec[];
} {
  const set = new Set<SceneryId>(['busy_street', ...unlockedSceneries.filter(isValidSceneryId)]);
  const newlyUnlocked: ScenerySpec[] = [];

  for (const spec of SCENERY_CATALOG) {
    if (
      spec.revenueMilestone > 0 &&
      lifetimeGrossIncome >= spec.revenueMilestone &&
      !set.has(spec.id)
    ) {
      set.add(spec.id);
      newlyUnlocked.push(spec);
    }
  }

  return {
    unlockedSceneries: Array.from(set),
    newlyUnlocked,
  };
}

// ============================================================================
// PHASE 4: 6 UNLOCKABLE PATRON OUTFIT PACKS (WEATHER-REACTIVE)
// ============================================================================

export interface PatronOutfitSpec {
  id: PatronOutfitId;
  name: string;
  cost: number;
  weatherMode: PatronOutfitWeatherMode;
  weatherLabel: string;
  description: string;
  accentHex: string;
  swatchColors: readonly string[];
}

export const PATRON_OUTFIT_CATALOG: readonly PatronOutfitSpec[] = [
  {
    id: 'filipino',
    name: 'Filipino Style Outfits',
    cost: 400,
    weatherMode: 'all-weather',
    weatherLabel: 'All-Weather Casual',
    description: 'Relaxed sando / casual tee, comfy shorts & classic tsinelas slippers.',
    accentHex: '#3b82f6',
    swatchColors: ['#f8fafc', '#2563eb', '#eab308', '#dc2626'],
  },
  {
    id: 'brazilian',
    name: 'Brazilian Style Outfits',
    cost: 900,
    weatherMode: 'all-weather',
    weatherLabel: 'All-Weather Vibrant',
    description: 'Vibrant green/yellow/blue jerseys & tropical tees with relaxed shorts & sandals.',
    accentHex: '#22c55e',
    swatchColors: ['#16a34a', '#facc15', '#2563eb', '#fb923c'],
  },
  {
    id: 'ancient_japanese',
    name: 'Ancient Japanese Outfits',
    cost: 1200,
    weatherMode: 'all-weather',
    weatherLabel: 'All-Weather Traditional',
    description: 'Layered kimono & yukata wide sleeves, contrasting obi sash, haori & wooden geta.',
    accentHex: '#ec4899',
    swatchColors: ['#1e3a8a', '#be185d', '#365314', '#92400e'],
  },
  {
    id: 'french',
    name: 'French Outfits',
    cost: 1600,
    weatherMode: 'weather-reactive',
    weatherLabel: 'Summer & Winter Reactive',
    description: 'Summer: Breton stripes & beret. Winter (Snow): wool peacoat, knit scarf & boots.',
    accentHex: '#f59e0b',
    swatchColors: ['#1e293b', '#f8fafc', '#b91c1c', '#92400e'],
  },
  {
    id: 'swiss',
    name: 'Swiss Outfits',
    cost: 2000,
    weatherMode: 'weather-reactive',
    weatherLabel: 'Summer & Winter Reactive',
    description: 'Summer: alpine shirt & chalet vest. Winter: Nordic knit / puffer, beanie & snow boots.',
    accentHex: '#ef4444',
    swatchColors: ['#dc2626', '#f8fafc', '#1e40af', '#047857'],
  },
  {
    id: 'hiker',
    name: 'Hiker Outfits',
    cost: 2500,
    weatherMode: 'winter-only',
    weatherLabel: 'Winter / Snow Only',
    description: 'Insulated mountaineering parka, thermal snow pants, 3D backpack, beanie & goggles.',
    accentHex: '#38bdf8',
    swatchColors: ['#ea580c', '#0284c7', '#eab308', '#dc2626'],
  },
] as const;

export const ALL_PATRON_OUTFIT_IDS: readonly PatronOutfitId[] = PATRON_OUTFIT_CATALOG.map(
  (o) => o.id
);

export function isValidPatronOutfitId(val: unknown): val is PatronOutfitId {
  return typeof val === 'string' && ALL_PATRON_OUTFIT_IDS.includes(val as PatronOutfitId);
}

export function getPatronOutfitSpec(id: PatronOutfitId | null | undefined): PatronOutfitSpec | null {
  if (!id) return null;
  return PATRON_OUTFIT_CATALOG.find((o) => o.id === id) || null;
}

export function isPatronOutfitAllowedInClimate(
  outfitId: PatronOutfitId,
  climateState: ClimateState
): boolean {
  const spec = getPatronOutfitSpec(outfitId);
  if (!spec) return false;
  if (spec.weatherMode === 'winter-only') {
    return climateState === 'winter';
  }
  return true;
}

export type PatronOutfitMode = 'manual' | 'custom_mix' | 'auto_match';

export const SCENERY_TO_OUTFIT_MAP: Record<SceneryId, PatronOutfitId | null> = {
  busy_street: 'filipino',
  mayon_volcano: 'filipino',
  hilltop_city_lights: 'filipino',
  japanese_tranquility: 'ancient_japanese',
  brazilian_favela: 'brazilian',
  cyberpunk_neon: null,
  eiffel_tower: 'french',
  switzerland_hilltop: 'swiss',
  mt_everest: 'hiker',
};

export interface PatronOutfitResolution {
  outfitId: PatronOutfitId | null;
  climateVariant: ClimateState;
  isSecretBypass?: boolean;
}

export interface ActivePatronOutfitContext {
  activeScenery: SceneryId;
  climateState: ClimateState;
  unlockedPatronOutfits: readonly PatronOutfitId[];
  mode: PatronOutfitMode;
  equippedOutfitId?: PatronOutfitId | null;
  enabledCustomMixIds?: readonly PatronOutfitId[];
  isSecretNpc?: boolean;
  rng?: () => number;
}

/**
 * Unified Patron Outfit resolver (Phase 2):
 * - Layer 1 Secret NPC Immunity: `isSecretNpc === true` ALWAYS short-circuits and returns null bypass.
 * - `'manual'` (default): equips `equippedOutfitId` (or Standard Casual `null`) regardless of active scenery.
 * - `'custom_mix'`: rolls among `enabledCustomMixIds` (unlocked & climate-valid).
 * - `'auto_match'` (opt-in, default OFF): looks up explicit `SCENERY_TO_OUTFIT_MAP[activeScenery]`.
 */
export function resolveActivePatronOutfit(
  ctx: ActivePatronOutfitContext
): PatronOutfitResolution {
  if (ctx.isSecretNpc === true) {
    return { outfitId: null, climateVariant: ctx.climateState, isSecretBypass: true };
  }

  const unlockedSet = new Set(ctx.unlockedPatronOutfits.filter(isValidPatronOutfitId));
  if (unlockedSet.size === 0) {
    return { outfitId: null, climateVariant: ctx.climateState };
  }

  if (ctx.mode === 'manual') {
    const equipped = ctx.equippedOutfitId ?? null;
    if (
      equipped &&
      isValidPatronOutfitId(equipped) &&
      unlockedSet.has(equipped) &&
      isPatronOutfitAllowedInClimate(equipped, ctx.climateState)
    ) {
      return { outfitId: equipped, climateVariant: ctx.climateState };
    }
    return { outfitId: null, climateVariant: ctx.climateState };
  }

  if (ctx.mode === 'auto_match') {
    const preferred = SCENERY_TO_OUTFIT_MAP[ctx.activeScenery] ?? null;
    if (
      preferred &&
      unlockedSet.has(preferred) &&
      isPatronOutfitAllowedInClimate(preferred, ctx.climateState)
    ) {
      return { outfitId: preferred, climateVariant: ctx.climateState };
    }
    return { outfitId: null, climateVariant: ctx.climateState };
  }

  // 'custom_mix'
  const pool = (ctx.enabledCustomMixIds || []).filter(
    (id) =>
      isValidPatronOutfitId(id) &&
      unlockedSet.has(id) &&
      isPatronOutfitAllowedInClimate(id, ctx.climateState)
  );
  if (pool.length === 0) {
    return { outfitId: null, climateVariant: ctx.climateState };
  }
  const rng = ctx.rng || Math.random;
  const pick = pool[Math.floor(rng() * pool.length) % pool.length];
  return { outfitId: pick, climateVariant: ctx.climateState };
}

/**
 * Backwards-compatible wrapper around `resolveActivePatronOutfit`.
 */
export function resolvePatronOutfitForSpawn(params: {
  activeScenery: SceneryId;
  climateState: ClimateState;
  unlockedPatronOutfits: readonly PatronOutfitId[];
  patronOutfitAutoMatch: boolean;
  patronOutfitMode?: PatronOutfitMode;
  equippedPatronOutfitId?: PatronOutfitId | null;
  enabledCustomPatronOutfits: readonly PatronOutfitId[];
  isSecretNpc?: boolean;
  rng?: () => number;
}): PatronOutfitResolution {
  const mode: PatronOutfitMode =
    params.patronOutfitMode ?? (params.patronOutfitAutoMatch ? 'auto_match' : 'custom_mix');
  return resolveActivePatronOutfit({
    activeScenery: params.activeScenery,
    climateState: params.climateState,
    unlockedPatronOutfits: params.unlockedPatronOutfits,
    mode,
    equippedOutfitId: params.equippedPatronOutfitId ?? null,
    enabledCustomMixIds: params.enabledCustomPatronOutfits,
    isSecretNpc: params.isSecretNpc,
    rng: params.rng,
  });
}

// ============================================================================
// PHASE 5: SECRET EASTER EGG NPC ("Beb" / "Anton" / "Duminiki")
// ============================================================================

export const SECRET_NPC_NAMES = ['Beb', 'Anton', 'Duminiki'] as const;
export type SecretNpcName = (typeof SECRET_NPC_NAMES)[number];
export const SECRET_NPC_STORAGE_KEY = 'klasik_secret_name_idx';
export const SECRET_NPC_COOLDOWN_SEC = 270;
export const SECRET_NPC_PATIENCE_DRAIN_MULT = 0.25;
export const SECRET_NPC_TIP_MULTIPLIER = 2;

export const SECRET_NPC_SPAWN_CHANCES = {
  passerby: 0.08,
  customer: 0.05,
  rider: 0.06,
} as const;

export const SECRET_NPC_DIALOGUES: readonly string[] = [
  "Hey! Just dropping by to check on the cafe—take your time, I'm in no rush at all!",
  'Love how cozy Klasik Cafe is looking today! Whatever you brew is gonna hit the spot.',
  'Still my favorite garage cafe spot. No hurry on the cup—just enjoying the vibe!',
  'Saw the Miata parked clean and had to swing by! Take it easy on my order.',
];

export type SecretNpcModelVariant = 'default' | 'hat' | 'helmet' | 'hike';

export interface SecretNpcAppearance {
  wearsCap: boolean;
  hoodUp: boolean;
  wearsCharcoalTee: boolean;
  modelVariant?: SecretNpcModelVariant;
}

export function normalizeSecretNpcNameIdx(idx: unknown): number {
  if (typeof idx !== 'number' || !Number.isFinite(idx)) return 0;
  const n = SECRET_NPC_NAMES.length;
  return ((Math.floor(idx) % n) + n) % n;
}

export function getSecretNpcName(idx: number): SecretNpcName {
  return SECRET_NPC_NAMES[normalizeSecretNpcNameIdx(idx)];
}

export function advanceSecretNpcNameIdx(idx: number): number {
  return (normalizeSecretNpcNameIdx(idx) + 1) % SECRET_NPC_NAMES.length;
}

/**
 * Resolves which exact imported `.js` 3D module variant the Secret NPC uses:
 * - Delivery orders -> `'helmet'` (`secretnpchelmet.js`)
 * - Mt. Everest scenery (exclusive!) -> `'hike'` (`secretnpchike.js`)
 * - All other sceneries -> randomly alternates `'hat'` (`secretnpchat.js`) & `'default'` (`secretnpc.js`)
 */
export function resolveSecretNpcModelVariant(params: {
  activeScenery?: SceneryId;
  isDeliveryRider?: boolean;
  wearsCap?: boolean;
}): SecretNpcModelVariant {
  if (params.isDeliveryRider) {
    return 'helmet';
  }
  if (params.activeScenery === 'mt_everest') {
    return 'hike';
  }
  return params.wearsCap ? 'hat' : 'default';
}

/**
 * Resolves the Secret NPC's outfit, headwear, and exact 3D model variant:
 * - Randomly alternates (~50/50) between default (`secretnpc.js`) and Polo RL cap (`secretnpchat.js`)
 *   in regular sceneries.
 * - Uses `secretnpchelmet.js` for delivery orders.
 * - Uses `secretnpchike.js` exclusively & by default in the Mt. Everest scenery.
 */
export function resolveSecretNpcAppearance(
  climateState: ClimateState,
  isRaining: boolean,
  rng: () => number = Math.random,
  activeScenery?: SceneryId,
  isDeliveryRider = false
): SecretNpcAppearance {
  const isWinterOrSnow = climateState === 'winter';
  const wearsCap = rng() < 0.5;
  const isClearNonWinter = !isWinterOrSnow && !isRaining;
  const wearsCharcoalTee = isClearNonWinter && rng() < 0.25;
  const hoodUp = false;
  const modelVariant = resolveSecretNpcModelVariant({
    activeScenery,
    isDeliveryRider,
    wearsCap,
  });
  return {
    wearsCap,
    hoodUp,
    wearsCharcoalTee,
    modelVariant,
  };
}

export function canSpawnSecretNpc(params: {
  role: 'passerby' | 'customer' | 'rider';
  isSecretNpcActive: boolean;
  cooldownRemainingSec: number;
  rng?: () => number;
}): boolean {
  if (params.isSecretNpcActive || params.cooldownRemainingSec > 0) {
    return false;
  }
  const rng = params.rng || Math.random;
  return rng() < SECRET_NPC_SPAWN_CHANCES[params.role];
}
