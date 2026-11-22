// Complete Game Rules, 16 Hot/Iced Coffee, Artisanal Tea & Cold Refresher Recipes,
// Step-by-Step Brewing & Tea Steeping, 60+ Unique Unlockables (Upgrades, Equipment Skins,
// Customer Skin Packs, Login Rewards, Decor), "Golden Espresso Machine" (100k Gross Income -> 2x Sale Income),
// Daily 30-50 Order Quotas, Table Seating & Miata Showroom State Machine, and Save/Export/Import System.

import {
  ALL_CAT_COSMETIC_IDS,
  BASE_CAT_COSMETIC_IDS,
  BERET_REVENUE_MILESTONE,
  CAT_COSMETICS_CATALOG,
  CAT_FIT_PROFILES,
  CatCosmeticId,
  CatCosmeticSlot,
  CatCosmeticSpec,
  CatFitProfile,
  CatLoadout,
  GOLDEN_ESPRESSO_COST,
  applyCosmeticToLoadout,
  checkDinoCostumeUnlock,
  createEmptyCatLoadout,
  getCatCosmeticSpec,
  getCatFitProfile,
  getEffectiveVisibleLoadout,
  isValidCatCosmeticId,
  normalizeCatLoadout,
  syncCatCosmeticMilestones,
} from './catCosmeticsData';

export {
  ALL_CAT_COSMETIC_IDS,
  BASE_CAT_COSMETIC_IDS,
  BERET_REVENUE_MILESTONE,
  CAT_COSMETICS_CATALOG,
  CAT_FIT_PROFILES,
  GOLDEN_ESPRESSO_COST,
  applyCosmeticToLoadout,
  checkDinoCostumeUnlock,
  createEmptyCatLoadout,
  getCatCosmeticSpec,
  getCatFitProfile,
  getEffectiveVisibleLoadout,
  isValidCatCosmeticId,
  normalizeCatLoadout,
  syncCatCosmeticMilestones,
};
export type { CatCosmeticId, CatCosmeticSlot, CatCosmeticSpec, CatFitProfile, CatLoadout };

import {
  ALL_PATRON_OUTFIT_IDS,
  ALL_SCENERY_IDS,
  ClimateState,
  EVEREST_REVENUE_MILESTONE,
  PATRON_OUTFIT_CATALOG,
  PatronOutfitId,
  PatronOutfitSpec,
  PatronOutfitWeatherMode,
  SCENERY_CATALOG,
  SCENERY_WEATHER_RULES,
  SECRET_NPC_COOLDOWN_SEC,
  ActivePatronOutfitContext,
  PatronOutfitMode,
  SCENERY_TO_OUTFIT_MAP,
  SECRET_NPC_DIALOGUES,
  SECRET_NPC_NAMES,
  SECRET_NPC_PATIENCE_DRAIN_MULT,
  SECRET_NPC_SPAWN_CHANCES,
  SECRET_NPC_STORAGE_KEY,
  SECRET_NPC_TIP_MULTIPLIER,
  SWITZERLAND_REVENUE_MILESTONE,
  SceneryId,
  ScenerySpec,
  SceneryWeatherRule,
  SecretNpcAppearance,
  SecretNpcName,
  advanceSecretNpcNameIdx,
  canSpawnSecretNpc,
  clampRainPreferenceForScenery,
  getPatronOutfitSpec,
  getScenerySpec,
  getSecretNpcName,
  isAlwaysWinterScenery,
  isPatronOutfitAllowedInClimate,
  isSnowAllowedForScenery,
  isValidPatronOutfitId,
  isValidSceneryId,
  normalizeSecretNpcNameIdx,
  resolveActivePatronOutfit,
  resolveClimateState,
  resolvePatronOutfitForSpawn,
  resolveSecretNpcAppearance,
  syncSceneryMilestones,
} from './sceneryData';

export {
  ALL_PATRON_OUTFIT_IDS,
  ALL_SCENERY_IDS,
  EVEREST_REVENUE_MILESTONE,
  PATRON_OUTFIT_CATALOG,
  SCENERY_CATALOG,
  SCENERY_TO_OUTFIT_MAP,
  SCENERY_WEATHER_RULES,
  SECRET_NPC_COOLDOWN_SEC,
  SECRET_NPC_DIALOGUES,
  SECRET_NPC_NAMES,
  SECRET_NPC_PATIENCE_DRAIN_MULT,
  SECRET_NPC_SPAWN_CHANCES,
  SECRET_NPC_STORAGE_KEY,
  SECRET_NPC_TIP_MULTIPLIER,
  SWITZERLAND_REVENUE_MILESTONE,
  advanceSecretNpcNameIdx,
  canSpawnSecretNpc,
  clampRainPreferenceForScenery,
  getPatronOutfitSpec,
  getScenerySpec,
  getSecretNpcName,
  isAlwaysWinterScenery,
  isPatronOutfitAllowedInClimate,
  isSnowAllowedForScenery,
  isValidPatronOutfitId,
  isValidSceneryId,
  normalizeSecretNpcNameIdx,
  resolveActivePatronOutfit,
  resolveClimateState,
  resolvePatronOutfitForSpawn,
  resolveSecretNpcAppearance,
  syncSceneryMilestones,
};
export type {
  ActivePatronOutfitContext,
  ClimateState,
  PatronOutfitId,
  PatronOutfitMode,
  PatronOutfitSpec,
  PatronOutfitWeatherMode,
  SceneryId,
  ScenerySpec,
  SceneryWeatherRule,
  SecretNpcAppearance,
  SecretNpcName,
};

export type AudioModeId = 'vinyl' | 'radio' | 'external';

export interface AudioPreferences {
  mode: AudioModeId;
  lastVinylTrackId: string | null;
  lastRadioStationId: string | null;
  musicVolume: number;
  ambienceVolume: number;
  vinylCrackle: boolean;
  // Backward-compatible optional aliases for older saves
  lastMode?: AudioModeId;
  sfxVolume?: number;
  crackleEnabled?: boolean;
  lastStationId?: string | null;
}

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  mode: 'vinyl',
  lastVinylTrackId: null,
  lastRadioStationId: null,
  musicVolume: 0.7,
  ambienceVolume: 0.85,
  vinylCrackle: true,
};

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';
export type GameMode = 'career' | 'zen';
export type TimeOfDayMode = 'auto' | 'dawn' | 'morning' | 'noon' | 'golden' | 'night';
export type ResolvedTimeOfDay = 'dawn' | 'morning' | 'noon' | 'golden' | 'night';
export type RainPreference = 'auto' | 'clear' | 'rain' | 'snow';
export type WeatherMode =
  | 'dawn'
  | 'rainy-dawn'
  | 'morning'
  | 'noon'
  | 'rainy-noon'
  | 'golden'
  | 'rainy-golden'
  | 'rainy'
  | 'night'
  | 'rainy-night';
export type BaristaStationId = 1 | 2 | 3 | 4 | 5 | 6;
export type GraphicsQuality = 'low' | 'medium' | 'max';
export type OrderType = 'dine-in' | 'takeout';
export type CupVesselType = 'hot-mug' | 'iced-glass' | 'hot-takeout' | 'iced-takeout';
export type PastryId = 'daisy-donut' | 'miata-cake' | 'croissant';
export type DeliveryRiderVariant = 'blue' | 'green' | 'red';

export interface PastrySpec {
  id: PastryId;
  name: string;
  shortName: string;
  price: number;
  description: string;
  accentHex: string;
}

export const PASTRY_CATALOG: readonly PastrySpec[] = [
  {
    id: 'daisy-donut',
    name: 'Daisy Donut',
    shortName: 'Daisy Donut',
    price: 4,
    description: 'White Bavarian-glazed brioche donut with sunny yellow cream center.',
    accentHex: '#facc15',
  },
  {
    id: 'miata-cake',
    name: 'Miata Cake',
    shortName: 'Miata Cake',
    price: 5,
    description: 'Crimson red velvet strawberry slice with layered cream frosting & berry crown.',
    accentHex: '#dc2626',
  },
  {
    id: 'croissant',
    name: 'Croissant',
    shortName: 'Croissant',
    price: 4,
    description: 'Flaky hand-laminated golden French butter croissant baked warm.',
    accentHex: '#d97706',
  },
] as const;

export const ALL_PASTRY_IDS: readonly PastryId[] = PASTRY_CATALOG.map((p) => p.id);

export function getPastryById(id: PastryId | null | undefined): PastrySpec | null {
  if (!id) return null;
  return PASTRY_CATALOG.find((p) => p.id === id) || null;
}

export function isValidPastryId(val: unknown): val is PastryId {
  return val === 'daisy-donut' || val === 'miata-cake' || val === 'croissant';
}

export interface DailyQuotaState {
  dateKey: string; // Local calendar date 'YYYY-MM-DD'
  cupsServedToday: number; // Resets automatically at local midnight
  dailyCupQuota: number; // Default: 35 cups per 24-hour day
  quotaBonusClaimed: boolean; // True once $120 daily owner bonus is awarded today
}

export interface DailyLoginState {
  lastClaimDateKey: string | null; // 'YYYY-MM-DD' of last claimed reward
  lastClaimTimestamp: number | null; // Epoch ms of last claim
  streakDay: number; // 1..7 repeating weekly streak
  claimedToday: boolean; // True if lastClaimDateKey === getLocalDateKey()
}

export function getLocalDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCalendarDayDiff(fromDateKey: string, toDateKey: string): number {
  const [fy, fm, fd] = fromDateKey.split('-').map(Number);
  const [ty, tm, td] = toDateKey.split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 0;
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

export function formatLocalClock(now: Date = new Date()): string {
  const hours24 = now.getHours();
  const mins = String(now.getMinutes()).padStart(2, '0');
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${mins} ${suffix}`;
}

export function getTimeUntilMidnightLabel(now: Date = new Date()): string {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const diffMs = Math.max(0, nextMidnight.getTime() - now.getTime());
  const totalMins = Math.ceil(diffMs / 60_000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `Next reward in ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}

export function resolveDeviceTimeOfDay(date: Date = new Date()): ResolvedTimeOfDay {
  const totalMins = date.getHours() * 60 + date.getMinutes();
  if (totalMins >= 300 && totalMins <= 389) return 'dawn'; // 05:00 - 06:29
  if (totalMins >= 390 && totalMins <= 659) return 'morning'; // 06:30 - 10:59
  if (totalMins >= 660 && totalMins <= 929) return 'noon'; // 11:00 - 15:29
  if (totalMins >= 930 && totalMins <= 1109) return 'golden'; // 15:30 - 18:29
  return 'night'; // 18:30 - 04:59
}

export function resolveTimeOfDay(
  mode: TimeOfDayMode,
  date: Date = new Date()
): ResolvedTimeOfDay {
  if (mode === 'auto') return resolveDeviceTimeOfDay(date);
  return mode;
}

export function resolveCompositeWeather(
  time: ResolvedTimeOfDay,
  isRaining: boolean
): WeatherMode {
  if (!isRaining) return time;
  if (time === 'morning') return 'rainy';
  if (time === 'dawn') return 'rainy-dawn';
  if (time === 'noon') return 'rainy-noon';
  if (time === 'golden') return 'rainy-golden';
  return 'rainy-night';
}

export function extractTimeOfDayFromWeather(weather: WeatherMode): ResolvedTimeOfDay {
  if (weather === 'dawn' || weather === 'rainy-dawn') return 'dawn';
  if (weather === 'noon' || weather === 'rainy-noon') return 'noon';
  if (weather === 'golden' || weather === 'rainy-golden') return 'golden';
  if (weather === 'night' || weather === 'rainy-night') return 'night';
  return 'morning';
}

export function rollAutoRain(rng: () => number = Math.random): boolean {
  return rng() < 0.28;
}

export function isRainyWeather(weather: WeatherMode): boolean {
  return (
    weather === 'rainy' ||
    weather === 'rainy-dawn' ||
    weather === 'rainy-noon' ||
    weather === 'rainy-golden' ||
    weather === 'rainy-night'
  );
}

export function isNightWeather(weather: WeatherMode): boolean {
  return weather === 'night' || weather === 'rainy-night';
}

export function normalizeWeatherMode(val: unknown): WeatherMode {
  if (
    val === 'dawn' ||
    val === 'rainy-dawn' ||
    val === 'morning' ||
    val === 'noon' ||
    val === 'rainy-noon' ||
    val === 'golden' ||
    val === 'rainy-golden' ||
    val === 'rainy' ||
    val === 'night' ||
    val === 'rainy-night'
  ) {
    return val;
  }
  return 'morning';
}

export function normalizeTimeOfDayMode(val: unknown): TimeOfDayMode {
  if (
    val === 'auto' ||
    val === 'dawn' ||
    val === 'morning' ||
    val === 'noon' ||
    val === 'golden' ||
    val === 'night'
  ) {
    return val;
  }
  return 'auto';
}

export function normalizeRainPreference(val: unknown): RainPreference {
  if (val === 'auto' || val === 'clear' || val === 'rain' || val === 'snow') {
    return val;
  }
  return 'auto';
}

export const STORAGE_GFX_KEY = 'klasik3d_gfx_quality_v2';

export function normalizeGraphicsQuality(val: unknown): GraphicsQuality {
  if (val === 'max') return 'max';
  if (val === 'medium') return 'medium';
  return 'low';
}

export function cycleGraphicsQuality(current: GraphicsQuality): GraphicsQuality {
  if (current === 'low') return 'medium';
  if (current === 'medium') return 'max';
  return 'low';
}

export function loadSavedGraphicsQuality(): GraphicsQuality {
  if (typeof window === 'undefined') return 'low';
  try {
    const saved = window.localStorage.getItem(STORAGE_GFX_KEY);
    return normalizeGraphicsQuality(saved);
  } catch {
    return 'low';
  }
}

export function saveGraphicsQuality(quality: GraphicsQuality): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_GFX_KEY, quality);
  } catch {
    // ignore storage errors
  }
}

export const MIATA_BAY = {
  centerX: -3.55,
  centerZ: -3.65,
  rotationY: 0.42,
  plinthWidth: 2.35,
  plinthLength: 4.1,
  exclusionRadiusX: 2.35,
  exclusionRadiusZ: 1.75,
} as const;

export interface LoungeTableDef {
  id: number;
  x: number;
  z: number;
  shape: 'round' | 'rect';
  radius: number;
  hasLaptop: boolean;
  seats: ReadonlyArray<{ x: number; z: number; facingRotY: number }>;
}

/**
 * 4 Garage-Garden Lounge Tables strictly positioned in the center-right open zone (x >= -0.35),
 * guaranteeing >= 1.35m clearance from MIATA_BAY and >= 1.25m clear walkway behind the counter.
 */
export const LOUNGE_TABLE_LAYOUT: readonly LoungeTableDef[] = [
  {
    id: 0,
    x: 0.15,
    z: -2.75,
    shape: 'round',
    radius: 0.56,
    hasLaptop: false,
    seats: [
      { x: 0.15 - 0.66, z: -2.75, facingRotY: Math.PI / 2 },
      { x: 0.15 + 0.66, z: -2.75, facingRotY: -Math.PI / 2 },
    ],
  },
  {
    id: 1,
    x: 2.45,
    z: -2.55,
    shape: 'rect',
    radius: 0.62,
    hasLaptop: true,
    seats: [
      { x: 2.45 - 0.68, z: -2.55, facingRotY: Math.PI / 2 },
      { x: 2.45 + 0.68, z: -2.55, facingRotY: -Math.PI / 2 },
    ],
  },
  {
    id: 2,
    x: 0.55,
    z: -4.65,
    shape: 'rect',
    radius: 0.62,
    hasLaptop: true,
    seats: [
      { x: 0.55 - 0.68, z: -4.65, facingRotY: Math.PI / 2 },
      { x: 0.55 + 0.68, z: -4.65, facingRotY: -Math.PI / 2 },
    ],
  },
  {
    id: 3,
    x: 2.75,
    z: -4.55,
    shape: 'round',
    radius: 0.56,
    hasLaptop: true,
    seats: [
      { x: 2.75 - 0.66, z: -4.55, facingRotY: Math.PI / 2 },
      { x: 2.75 + 0.66, z: -4.55, facingRotY: -Math.PI / 2 },
    ],
  },
] as const;

export const LOUNGE_SEAT_COORDS: ReadonlyArray<{ x: number; z: number; facingRotY: number }> =
  LOUNGE_TABLE_LAYOUT.flatMap((t) => t.seats);

export function isClearOfMiataBay(x: number, z: number, tableRadius = 0.6): boolean {
  const dx = Math.abs(x - MIATA_BAY.centerX);
  const dz = Math.abs(z - MIATA_BAY.centerZ);
  // Elliptical exclusion envelope + table radius
  const rx = MIATA_BAY.exclusionRadiusX + tableRadius;
  const rz = MIATA_BAY.exclusionRadiusZ + tableRadius;
  const normalizedDist = Math.hypot(dx / rx, dz / rz);
  return normalizedDist >= 1.0 && x >= -0.35;
}
export type SyrupFlavor = 'none' | 'vanilla' | 'caramel' | 'chocolate' | 'matcha';
export type DrinkCategory = 'hot_coffee' | 'iced_coffee' | 'tea' | 'cold_drink';
export type CustomerSocialBehavior =
  | 'selfie'
  | 'chatting'
  | 'laptop'
  | 'relaxing'
  | 'car_selfie';

export type MachineSkinId =
  | 'classic-steel'
  | 'matte-obsidian'
  | 'vintage-copper'
  | 'golden-espresso-machine';

export type GrinderSkinId = 'matte-black' | 'cyber-chrome' | 'heritage-brass';
export type PitcherSkinId = 'stainless-steel' | 'rose-gold' | 'titanium-pearl';
export type CustomerSkinPackId =
  | 'casual-garden'
  | 'tokyo-streetwear'
  | 'miata-track-club'
  | 'vinyl-jazz-collectors'
  | 'botanical-artists'
  | 'cyber-neon-night';

export type CafeCatId =
  | 'champy'
  | 'chimny'
  | 'chunky'
  | 'kicks'
  | 'cheeto'
  | 'lilo'
  | 'katkat'
  | 'luna'
  | 'mikmik'
  | 'amby'
  | 'gigi'
  | 'tisay';

export interface CafeCatSpec {
  id: CafeCatId;
  name: string;
  coatSummary: string;
  eyesSummary: string;
  collarSummary: string;
  sizeSummary: string;
  furHex: number;
  stripeHex?: number;
  bellyPatchHex?: number;
  tailHex?: number;
  coatPattern:
    | 'solid'
    | 'tabby'
    | 'tuxedo-tabby'
    | 'calico-mikmik'
    | 'bicolor-patches'
    | 'tuxedo-ginger';
  leftEyeHex: number; // Cat's anatomical left eye (+X in head local space)
  rightEyeHex: number; // Cat's anatomical right eye (-X in head local space)
  hasCollar: boolean;
  collarHex: number;
  collarThin?: boolean;
  hasBell: boolean;
  scale: readonly [number, number, number]; // [width X, height Y, length Z]
  unlockType: 'starter' | 'revenue' | 'shop' | 'master' | 'golden_espresso';
  unlockAmount: number; // Revenue milestone ($) or Shop cost ($)
  isSecret?: boolean; // Completely hidden from Shop & UI counters until unlocked
  passiveTitle: string | null;
  passiveDescription: string;
  moodDrainMultiplier: number; // 1.0 default, 1.3 for Mikmik, 0 for Lilo
  revenueMultiplier: number; // 1.0 default, 1.3 for Mikmik
  disablesMoodMeter?: boolean;
}

export const LILO_REQUIRED_CAT_IDS: readonly CafeCatId[] = [
  'chimny',
  'chunky',
  'kicks',
  'cheeto',
  'katkat',
  'luna',
  'mikmik',
] as const;

export const CAFE_CATS: readonly CafeCatSpec[] = [
  {
    id: 'champy',
    name: 'Champy',
    coatSummary: 'Sleek Obsidian Black',
    eyesSummary: 'Emerald Green Eyes',
    collarSummary: 'Teal Collar + Gold Bell',
    sizeSummary: 'Standard',
    furHex: 0x15171c,
    coatPattern: 'solid',
    leftEyeHex: 0x22c55e,
    rightEyeHex: 0x22c55e,
    hasCollar: true,
    collarHex: 0x0d9488,
    hasBell: true,
    scale: [1.0, 1.0, 1.0],
    unlockType: 'starter',
    unlockAmount: 0,
    passiveTitle: null,
    passiveDescription: 'Cozy starter cafe companion.',
    moodDrainMultiplier: 1.0,
    revenueMultiplier: 1.0,
  },
  {
    id: 'chimny',
    name: 'Chimny',
    coatSummary: 'Brown-Gray Tabby Stripes',
    eyesSummary: 'Emerald Green Eyes',
    collarSummary: 'Royal Blue Collar + Bell',
    sizeSummary: 'Standard',
    furHex: 0x78716c,
    stripeHex: 0x44403c,
    coatPattern: 'tabby',
    leftEyeHex: 0x22c55e,
    rightEyeHex: 0x22c55e,
    hasCollar: true,
    collarHex: 0x2563eb,
    hasBell: true,
    scale: [1.0, 1.0, 1.0],
    unlockType: 'revenue',
    unlockAmount: 1000,
    passiveTitle: null,
    passiveDescription: 'Unlocks automatically at $1,000 lifetime cafe revenue.',
    moodDrainMultiplier: 1.0,
    revenueMultiplier: 1.0,
  },
  {
    id: 'chunky',
    name: 'Chunky',
    coatSummary: 'Pure White Coat',
    eyesSummary: 'Heterochromia: Left Yellow, Right Blue',
    collarSummary: 'Pink Collar + Gold Bell',
    sizeSummary: 'Plush',
    furHex: 0xf8fafc,
    coatPattern: 'solid',
    leftEyeHex: 0xeab308,
    rightEyeHex: 0x38bdf8,
    hasCollar: true,
    collarHex: 0xec4899,
    hasBell: true,
    scale: [1.06, 0.98, 1.06],
    unlockType: 'revenue',
    unlockAmount: 1500,
    passiveTitle: null,
    passiveDescription: 'Unlocks automatically at $1,500 lifetime cafe revenue.',
    moodDrainMultiplier: 1.0,
    revenueMultiplier: 1.0,
  },
  {
    id: 'kicks',
    name: 'Kicks',
    coatSummary: 'Pure White Coat',
    eyesSummary: 'Sky Blue Eyes',
    collarSummary: 'Thin Black Collar',
    sizeSummary: 'Largest Cat',
    furHex: 0xf8fafc,
    coatPattern: 'solid',
    leftEyeHex: 0x38bdf8,
    rightEyeHex: 0x38bdf8,
    hasCollar: true,
    collarHex: 0x111827,
    collarThin: true,
    hasBell: false,
    scale: [1.26, 1.24, 1.26],
    unlockType: 'revenue',
    unlockAmount: 2000,
    passiveTitle: null,
    passiveDescription: 'Unlocks automatically at $2,000 lifetime cafe revenue.',
    moodDrainMultiplier: 1.0,
    revenueMultiplier: 1.0,
  },
  {
    id: 'cheeto',
    name: 'Cheeto',
    coatSummary: 'Warm Ivory-White Coat',
    eyesSummary: 'Heterochromia: Left Blue, Right Yellow',
    collarSummary: 'No Collar',
    sizeSummary: 'Standard',
    furHex: 0xfef7e6,
    coatPattern: 'solid',
    leftEyeHex: 0x38bdf8,
    rightEyeHex: 0xeab308,
    hasCollar: false,
    collarHex: 0x000000,
    hasBell: false,
    scale: [1.0, 1.0, 1.0],
    unlockType: 'revenue',
    unlockAmount: 2250,
    passiveTitle: null,
    passiveDescription: 'Unlocks automatically at $2,250 lifetime cafe revenue.',
    moodDrainMultiplier: 1.0,
    revenueMultiplier: 1.0,
  },
  {
    id: 'katkat',
    name: 'Katkat',
    coatSummary: 'Ginger Tabby Tuxedo + White Chest & Paws',
    eyesSummary: 'Warm Amber Eyes',
    collarSummary: 'Warm Brass Collar',
    sizeSummary: 'Standard',
    furHex: 0xea580c,
    stripeHex: 0xc2410c,
    bellyPatchHex: 0xf8fafc,
    coatPattern: 'tuxedo-tabby',
    leftEyeHex: 0xf59e0b,
    rightEyeHex: 0xf59e0b,
    hasCollar: true,
    collarHex: 0xb45309,
    hasBell: true,
    scale: [1.0, 1.0, 1.0],
    unlockType: 'shop',
    unlockAmount: 150,
    passiveTitle: null,
    passiveDescription: 'Playful marmalade tuxedo cat available in the Cat Adoption Shop.',
    moodDrainMultiplier: 1.0,
    revenueMultiplier: 1.0,
  },
  {
    id: 'luna',
    name: 'Luna',
    coatSummary: 'Pure White Coat',
    eyesSummary: 'Sky Blue Eyes',
    collarSummary: 'Silver-Indigo Collar',
    sizeSummary: 'Slender',
    furHex: 0xf8fafc,
    coatPattern: 'solid',
    leftEyeHex: 0x38bdf8,
    rightEyeHex: 0x38bdf8,
    hasCollar: true,
    collarHex: 0x6366f1,
    hasBell: true,
    scale: [0.82, 1.02, 0.88],
    unlockType: 'shop',
    unlockAmount: 500,
    passiveTitle: null,
    passiveDescription: 'Graceful slender white cat available in the Cat Adoption Shop.',
    moodDrainMultiplier: 1.0,
    revenueMultiplier: 1.0,
  },
  {
    id: 'mikmik',
    name: 'Mikmik',
    coatSummary: 'White + Ginger Head Patch, 2 Stomach Patches & Ginger Tail',
    eyesSummary: 'Warm Amber-Hazel Eyes',
    collarSummary: 'Cream-Amber Collar',
    sizeSummary: '2nd Largest',
    furHex: 0xf8fafc,
    bellyPatchHex: 0xea580c,
    tailHex: 0xea580c,
    coatPattern: 'calico-mikmik',
    leftEyeHex: 0xd97706,
    rightEyeHex: 0xd97706,
    hasCollar: true,
    collarHex: 0xd97706,
    hasBell: true,
    scale: [1.15, 1.13, 1.15],
    unlockType: 'shop',
    unlockAmount: 1000,
    passiveTitle: 'High-Stakes Rush: +30% Coffee Revenue / +30% Mood Drain',
    passiveDescription:
      'Customer Mood drains 30% faster (1.3x), AND all coffee & drink sales earn +30% revenue (1.3x)!',
    moodDrainMultiplier: 1.3,
    revenueMultiplier: 1.3,
  },
  {
    id: 'lilo',
    name: 'Lilo',
    coatSummary: 'Pure White Coat',
    eyesSummary: 'Sky Blue Eyes',
    collarSummary: 'Blue Collar + Gold Bell',
    sizeSummary: 'Smallest & Chubby',
    furHex: 0xf8fafc,
    coatPattern: 'solid',
    leftEyeHex: 0x38bdf8,
    rightEyeHex: 0x38bdf8,
    hasCollar: true,
    collarHex: 0x2563eb,
    hasBell: true,
    scale: [1.12, 0.78, 0.86],
    unlockType: 'master',
    unlockAmount: 7,
    passiveTitle: 'Pure Peace: Disables Customer Mood Meter',
    passiveDescription:
      'Unlocks automatically once all 7 other unlockable cats are owned. Locks Customer Mood at 100% with zero walkouts!',
    moodDrainMultiplier: 0.0,
    revenueMultiplier: 1.0,
    disablesMoodMeter: true,
  },
  {
    id: 'gigi',
    name: 'Gigi',
    coatSummary: 'White Base + Black Patches on Head & Body',
    eyesSummary: 'Emerald Green Eyes',
    collarSummary: 'Sleek Black Collar',
    sizeSummary: 'Playful Kitten',
    furHex: 0xf8fafc,
    stripeHex: 0x18181b,
    bellyPatchHex: 0x18181b,
    tailHex: 0x18181b,
    coatPattern: 'bicolor-patches',
    leftEyeHex: 0x22c55e,
    rightEyeHex: 0x22c55e,
    hasCollar: true,
    collarHex: 0x111827,
    hasBell: false,
    scale: [0.68, 0.7, 0.68],
    unlockType: 'shop',
    unlockAmount: 500,
    passiveTitle: null,
    passiveDescription: 'Curious little tuxedo-spotted kitten available in the Cat Adoption Shop.',
    moodDrainMultiplier: 1.0,
    revenueMultiplier: 1.0,
  },
  {
    id: 'amby',
    name: 'Amby',
    coatSummary: 'Pure Warm Caramel Fur',
    eyesSummary: 'Warm Amber Eyes',
    collarSummary: 'Pastel Pink Collar + Bell',
    sizeSummary: 'Standard',
    furHex: 0xc68642,
    coatPattern: 'solid',
    leftEyeHex: 0xf59e0b,
    rightEyeHex: 0xf59e0b,
    hasCollar: true,
    collarHex: 0xec4899,
    hasBell: true,
    scale: [1.0, 1.0, 1.0],
    unlockType: 'shop',
    unlockAmount: 1500,
    passiveTitle: null,
    passiveDescription: 'Sweet warm-caramel cafe regular available in the Cat Adoption Shop.',
    moodDrainMultiplier: 1.0,
    revenueMultiplier: 1.0,
  },
  {
    id: 'tisay',
    name: 'Tisay',
    coatSummary: 'Tuxedo-Patterned Ginger + Crisp White Bib, Muzzle & Paws',
    eyesSummary: 'Warm Amber Eyes',
    collarSummary: 'No Collar (Natural)',
    sizeSummary: 'Slender & Sleek',
    furHex: 0xea580c,
    bellyPatchHex: 0xf8fafc,
    tailHex: 0xea580c,
    coatPattern: 'tuxedo-ginger',
    leftEyeHex: 0xf59e0b,
    rightEyeHex: 0xf59e0b,
    hasCollar: false,
    collarHex: 0x000000,
    hasBell: false,
    scale: [0.82, 0.95, 1.0],
    unlockType: 'golden_espresso',
    unlockAmount: GOLDEN_ESPRESSO_COST,
    isSecret: true,
    passiveTitle: null,
    passiveDescription: 'A sleek tuxedo ginger cat who wandered in with the Golden Espresso Machine!',
    moodDrainMultiplier: 1.0,
    revenueMultiplier: 1.0,
  },
] as const;

export const ALL_CAFE_CAT_IDS: readonly CafeCatId[] = CAFE_CATS.map((c) => c.id);
export const SECRET_CAFE_CAT_IDS: readonly CafeCatId[] = CAFE_CATS.filter((c) =>
  Boolean(c.isSecret)
).map((c) => c.id);

export function getCafeCatSpec(catId: CafeCatId | undefined | null): CafeCatSpec {
  return CAFE_CATS.find((c) => c.id === catId) || CAFE_CATS[0];
}

export function isValidCafeCatId(val: unknown): val is CafeCatId {
  return typeof val === 'string' && ALL_CAFE_CAT_IDS.includes(val as CafeCatId);
}

// Secret cats (like Tisay) are completely excluded from Shop catalogs & "X / Y" counters until unlocked!
export function getVisibleShopCats(unlockedCats: readonly CafeCatId[]): CafeCatSpec[] {
  const unlockedSet = new Set(unlockedCats);
  return CAFE_CATS.filter((spec) => !spec.isSecret || unlockedSet.has(spec.id));
}

export const SHIFT_SECONDS = 300;
export const MAX_QUEUE = 3;
export const MAX_GARDEN_SEATS = 6;
export const DAILY_REALTIME_CUP_QUOTA = 35;
export const DAILY_QUOTA_COMPLETION_BONUS = 120;
export const DELIVERY_PARTNER_BONUS = 3;
export const DELIVERY_RIDER_MIN_REGULAR_COOLDOWN = 0; // Phase 1.2: 50%–80% delivery rider encounter rate + pity cap
export const MAX_ACTIVE_DELIVERY_RIDERS = 2; // Hard cap of max 2 simultaneously parked delivery scooters
export const GOLDEN_MACHINE_GROSS_THRESHOLD = GOLDEN_ESPRESSO_COST; // Rebalanced from $150,000 -> $50,000
export const MIN_ARRIVAL_GAP_SEC = 3.2;

// Phase 1.2: 50%–80% Delivery Rider encounter probability (0.50 quiet, 0.80 peak rush, 0.65 balanced, 1.0 pity after 2 regulars)
export function computeDeliveryRiderProbability(
  weather: WeatherMode,
  regularCustomersSinceLastRider: number
): number {
  if (regularCustomersSinceLastRider >= 2) {
    return 1.0; // Pity cap: never go more than 2 orders without a Delivery Rider!
  }
  const timeSlot = extractTimeOfDayFromWeather(weather);
  if (timeSlot === 'morning' || timeSlot === 'noon') {
    return 0.8; // Peak rush hours
  }
  if (timeSlot === 'dawn' || timeSlot === 'night') {
    return 0.5; // Quiet hours
  }
  return 0.65; // Golden hour baseline
}

export function rollMoodDurationSec(rng: () => number = Math.random): number {
  return Math.floor(rng() * 61) + 60; // Inclusive 60s (1 min) to 120s (2 min)
}

export function rollOrderTimeLimitSec(rng: () => number = Math.random): number {
  return rollMoodDurationSec(rng);
}

export type CustomerMoodTier = 'happy' | 'content' | 'impatient' | 'dissatisfied';

export function getMoodTier(mood: number): CustomerMoodTier {
  if (mood >= 75) return 'happy';
  if (mood >= 40) return 'content';
  if (mood >= 1) return 'impatient';
  return 'dissatisfied';
}

export function computeMoodTipBonus(
  mood: number
): {
  tip: number;
  tier: CustomerMoodTier;
  label: string | null;
} {
  const clamped = Math.max(0, Math.min(100, mood));
  if (clamped >= 75) {
    return { tip: 3, tier: 'happy', label: 'Happy Mood! +$3 Tip' };
  }
  if (clamped >= 40) {
    return { tip: 1, tier: 'content', label: 'Content Mood! +$1 Tip' };
  }
  if (clamped >= 1) {
    return { tip: 0, tier: 'impatient', label: null };
  }
  return { tip: 0, tier: 'dissatisfied', label: null };
}

export function computeSpeedTipBonus(
  remainingSec: number,
  limitSec: number,
  isSpecialty = false
): {
  tip: number;
  tier: 'fast' | 'prompt' | 'ontime';
  label: string | null;
} {
  const safeLimit = Math.max(1, limitSec);
  const ratio = Math.max(0, Math.min(1, remainingSec / safeLimit));
  if (ratio >= 0.75) {
    const tip = isSpecialty ? 4 : 3;
    return { tip, tier: 'fast', label: `Happy Mood! +$${tip} Tip` };
  }
  if (ratio >= 0.4) {
    return { tip: 1, tier: 'prompt', label: 'Content Mood! +$1 Tip' };
  }
  return { tip: 0, tier: 'ontime', label: null };
}

export function stripKeyboardShortcutsForApk(text: string, isApk: boolean): string {
  if (!isApk || !text) return text;
  return text
    .replace(/\s*\[(?:Key\s+)?[A-Za-z0-9 /]+\]/g, '')
    .replace(/\bPress\s+R\b/gi, 'Tap Rinse')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function getDailyOrderQuota(_day: number = 1): number {
  return DAILY_REALTIME_CUP_QUOTA;
}

export function getDailyRevenueGoal(day: number): number {
  const quota = getDailyOrderQuota(day);
  return quota * 8 + (Math.max(1, day) - 1) * 20;
}

export interface DrinkRecipe {
  id: string;
  name: string;
  category: DrinkCategory;
  tagline: string;
  price: number;
  ingredientCost: number;
  needsEspresso: boolean;
  needsTeaSteep?: boolean;
  needsSteamedMilk: boolean;
  needsIce: boolean;
  syrup: SyrupFlavor;
  unlockDay: number;
  colorHex: string;
}

export const RECIPES: DrinkRecipe[] = [
  // HOT COFFEES
  {
    id: 'klasik-espresso',
    name: 'Klasik Double Espresso',
    category: 'hot_coffee',
    tagline: 'Rich 9-bar dark roast with tiger-stripe golden crema.',
    price: 5,
    ingredientCost: 1,
    needsEspresso: true,
    needsTeaSteep: false,
    needsSteamedMilk: false,
    needsIce: false,
    syrup: 'none',
    unlockDay: 1,
    colorHex: '#3b1d0e',
  },
  {
    id: 'velvet-latte',
    name: 'Garage Velvet Latte',
    category: 'hot_coffee',
    tagline: 'Double espresso topped with silky 65°C microfoam milk.',
    price: 6,
    ingredientCost: 2,
    needsEspresso: true,
    needsTeaSteep: false,
    needsSteamedMilk: true,
    needsIce: false,
    syrup: 'none',
    unlockDay: 1,
    colorHex: '#c68b59',
  },
  {
    id: 'vanilla-oat-latte',
    name: 'Madagascar Vanilla Latte',
    category: 'hot_coffee',
    tagline: 'Aromatic vanilla bean syrup swirled with steamed milk & espresso.',
    price: 7,
    ingredientCost: 2,
    needsEspresso: true,
    needsTeaSteep: false,
    needsSteamedMilk: true,
    needsIce: false,
    syrup: 'vanilla',
    unlockDay: 1,
    colorHex: '#d9a773',
  },
  {
    id: 'dark-mocha',
    name: 'Artisan Dark Cacao Mocha',
    category: 'hot_coffee',
    tagline: 'Single-origin dark chocolate ganache steamed with espresso.',
    price: 8,
    ingredientCost: 3,
    needsEspresso: true,
    needsTeaSteep: false,
    needsSteamedMilk: true,
    needsIce: false,
    syrup: 'chocolate',
    unlockDay: 1,
    colorHex: '#5c3317',
  },
  {
    id: 'caramel-cortado',
    name: 'Salted Caramel Cortado',
    category: 'hot_coffee',
    tagline: 'Equal parts 9-bar espresso and warm microfoam kissed with butter caramel.',
    price: 8,
    ingredientCost: 2,
    needsEspresso: true,
    needsTeaSteep: false,
    needsSteamedMilk: true,
    needsIce: false,
    syrup: 'caramel',
    unlockDay: 2,
    colorHex: '#a15c2f',
  },

  // ICED COFFEES
  {
    id: 'iced-caramel-macchiato',
    name: 'Iced Caramel Garden Macchiato',
    category: 'iced_coffee',
    tagline: 'Crystal ice cubes, buttery caramel drizzle, milk & bold espresso.',
    price: 8,
    ingredientCost: 2,
    needsEspresso: true,
    needsTeaSteep: false,
    needsSteamedMilk: true,
    needsIce: true,
    syrup: 'caramel',
    unlockDay: 1,
    colorHex: '#b4692c',
  },
  {
    id: 'iced-americano',
    name: 'Iced Garage Americano',
    category: 'iced_coffee',
    tagline: 'Crisp double espresso poured over crystal-clear artisan ice.',
    price: 6,
    ingredientCost: 1,
    needsEspresso: true,
    needsTeaSteep: false,
    needsSteamedMilk: false,
    needsIce: true,
    syrup: 'none',
    unlockDay: 1,
    colorHex: '#4a2511',
  },
  {
    id: 'iced-vanilla-cold-foam',
    name: 'Iced Vanilla Sweet Cream Latte',
    category: 'iced_coffee',
    tagline: 'Chilled espresso over ice with Madagascar vanilla & velvety cold foam.',
    price: 9,
    ingredientCost: 3,
    needsEspresso: true,
    needsTeaSteep: false,
    needsSteamedMilk: true,
    needsIce: true,
    syrup: 'vanilla',
    unlockDay: 2,
    colorHex: '#e2b887',
  },
  {
    id: 'iced-mocha-shaken',
    name: 'Iced Dark Cacao Shaken Espresso',
    category: 'iced_coffee',
    tagline: 'Double espresso shaken with ice, dark chocolate ganache & frothy milk.',
    price: 9,
    ingredientCost: 3,
    needsEspresso: true,
    needsTeaSteep: false,
    needsSteamedMilk: true,
    needsIce: true,
    syrup: 'chocolate',
    unlockDay: 2,
    colorHex: '#6b3e26',
  },
  {
    id: 'dirty-matcha-iced',
    name: 'Iced Dirty Uji Matcha Fusion',
    category: 'iced_coffee',
    tagline: 'Layered ceremonial matcha, crystal ice, creamy milk & a bold espresso shot.',
    price: 10,
    ingredientCost: 3,
    needsEspresso: true,
    needsTeaSteep: false,
    needsSteamedMilk: true,
    needsIce: true,
    syrup: 'matcha',
    unlockDay: 3,
    colorHex: '#556b2f',
  },

  // ARTISANAL TEAS (HOT & ICED)
  {
    id: 'hot-kyoto-sencha',
    name: 'Hot Kyoto Emerald Sencha Tea',
    category: 'tea',
    tagline: 'First-flush steamed green tea leaves infused at 80°C in our glass teapot.',
    price: 6,
    ingredientCost: 1,
    needsEspresso: false,
    needsTeaSteep: true,
    needsSteamedMilk: false,
    needsIce: false,
    syrup: 'none',
    unlockDay: 1,
    colorHex: '#84cc16',
  },
  {
    id: 'uji-matcha-latte',
    name: 'Iced Uji Ceremonial Matcha',
    category: 'tea',
    tagline: 'Whisked first-harvest green tea over crystal ice & creamy milk.',
    price: 9,
    ingredientCost: 3,
    needsEspresso: false,
    needsTeaSteep: true,
    needsSteamedMilk: true,
    needsIce: true,
    syrup: 'matcha',
    unlockDay: 1,
    colorHex: '#4d7c0f',
  },
  {
    id: 'london-fog-tea-latte',
    name: 'Earl Grey Vanilla London Fog',
    category: 'tea',
    tagline: 'Fragrant steeped bergamot tea leaves, Madagascar vanilla & steamed microfoam.',
    price: 8,
    ingredientCost: 2,
    needsEspresso: false,
    needsTeaSteep: true,
    needsSteamedMilk: true,
    needsIce: false,
    syrup: 'vanilla',
    unlockDay: 1,
    colorHex: '#d6bcfa',
  },
  {
    id: 'hot-hojicha-latte',
    name: 'Roasted Hojicha Caramel Tea Latte',
    category: 'tea',
    tagline: 'Charcoal-roasted Japanese green tea steeped with caramel & silky milk.',
    price: 9,
    ingredientCost: 2,
    needsEspresso: false,
    needsTeaSteep: true,
    needsSteamedMilk: true,
    needsIce: false,
    syrup: 'caramel',
    unlockDay: 2,
    colorHex: '#92400e',
  },

  // COLD DRINKS & BOTANICAL REFRESHERS
  {
    id: 'iced-hibiscus-berry-tea',
    name: 'Iced Hibiscus Botanical Cooler',
    category: 'cold_drink',
    tagline: 'Ruby-red steeped hibiscus blossoms poured over crystal ice cubes.',
    price: 7,
    ingredientCost: 2,
    needsEspresso: false,
    needsTeaSteep: true,
    needsSteamedMilk: false,
    needsIce: true,
    syrup: 'none',
    unlockDay: 1,
    colorHex: '#e11d48',
  },
  {
    id: 'yuzu-vanilla-refresher',
    name: 'Iced Yuzu Vanilla Cold Refresher',
    category: 'cold_drink',
    tagline: 'Chilled botanical tea infusion over ice with aromatic Madagascar vanilla.',
    price: 8,
    ingredientCost: 2,
    needsEspresso: false,
    needsTeaSteep: true,
    needsSteamedMilk: false,
    needsIce: true,
    syrup: 'vanilla',
    unlockDay: 2,
    colorHex: '#facc15',
  },
];

export interface DrinkTempBias {
  hotWeight: number; // 0.0 - 1.0
  icedWeight: number; // 0.0 - 1.0
}

export function getSceneryDrinkTempBias(sceneryId: string): DrinkTempBias {
  if (sceneryId === 'switzerland_hilltop' || sceneryId === 'mt_everest') {
    return { hotWeight: 0.95, icedWeight: 0.05 };
  }
  return { hotWeight: 0.5, icedWeight: 0.5 };
}

export interface OrderPrepGuardState {
  acceptedOrders: Array<{ id: string; acceptedAt: number; pendingItemCount: number }>;
  activePrepCount: number; // total unserved in-progress cups + pastry plates on counter
}

export function canStartOrderPrep(state: OrderPrepGuardState): {
  allowed: boolean;
  reason?: 'no_accepted_order' | 'slot_cap_reached';
} {
  if (state.acceptedOrders.length === 0) {
    return { allowed: false, reason: 'no_accepted_order' };
  }
  const acceptedPendingItemCount = state.acceptedOrders.reduce(
    (sum, o) => sum + o.pendingItemCount,
    0
  );
  if (state.activePrepCount >= acceptedPendingItemCount) {
    return { allowed: false, reason: 'slot_cap_reached' };
  }
  return { allowed: true };
}

export function canServePreparedItem(itemCreatedAt: number, orderAcceptedAt: number): boolean {
  return itemCreatedAt >= orderAcceptedAt;
}

export interface CupBuildState {
  hasGrounds: boolean;
  isTamped: boolean;
  hasEspresso: boolean;
  hasSteepedTea?: boolean;
  hasSteamedMilk: boolean;
  hasIce: boolean;
  syrup: SyrupFlavor;
  createdAt?: number | null;
}

export interface CustomerOrder {
  id: string;
  customerName: string;
  avatarColor: string;
  shirtColor: string;
  recipeId: string;
  orderType: OrderType;
  orderAccepted: boolean; // False while waiting calmly in line; true once barista accepts the order
  acceptedAt?: number | null; // Timestamp when barista accepted this order (anti-exploit check)
  mood: number; // 100 (Happy) down to 0 (Dissatisfied / Disappointed)
  moodDurationSec: number; // Randomized 60..120 seconds (1 to 2 minutes) to drain 100 -> 0
  moodExpired?: boolean; // True when mood hits 0 -> triggers dissatisfied walkout ($0)
  patience: number; // Mirror of mood (0..100) for compatibility
  maxPatience: number;
  orderTimeLimitSec: number; // Mirror of moodDurationSec (60..120s)
  orderTimeRemainingSec: number; // Derived remaining seconds from mood & moodDurationSec
  timerStarted: boolean; // True once customer reached counter (arrived)
  expired?: boolean; // Mirror of moodExpired
  state: 'ordering' | 'seated' | 'departing';
  seatIndex: number | null; // 0..5 for the 6 cafe & garden tables (always null for takeout)
  leavingTable?: boolean; // Phase 1.1: true when dine-in customer stands up & walks out doorway
  seatedTimer: number;
  dialogueLine: string;
  customAddons: string[];
  customBonusTip: number;
  customNeedsIce?: boolean;
  customSyrup?: SyrupFlavor;
  requestedPastry?: PastryId | null; // Optional single pastry paired with coffee (always set for Delivery Riders)
  isDeliveryRider?: boolean;
  riderVariant?: DeliveryRiderVariant;
  isSecretNpc?: boolean;
  secretNpcAppearance?: SecretNpcAppearance;
  patronOutfitId?: PatronOutfitId | null;
  patronOutfitClimate?: ClimateState;
  socialBehavior: CustomerSocialBehavior;
}

export interface BizUpgradeItem {
  id: string;
  name: string;
  category: 'equipment' | 'acoustics' | 'botanicals' | 'hospitality';
  description: string;
  cost: number;
  effectLabel: string;
  tipBonus: number;
  patienceBoostPct?: number;
  purchased: boolean;
}

export interface EquipmentSkinItem {
  id: MachineSkinId | GrinderSkinId | PitcherSkinId;
  slot: 'machine' | 'grinder' | 'pitcher';
  name: string;
  description: string;
  cost: number;
  grossIncomeRequirement?: number;
  saleMultiplier?: number;
  previewColorHex: string;
  unlocked: boolean;
}

export interface CustomerSkinPackItem {
  id: CustomerSkinPackId;
  name: string;
  description: string;
  cost: number;
  paletteColors: string[];
  unlocked: boolean;
}

export interface LoginRewardItem {
  day: number;
  id: string;
  title: string;
  description: string;
  rewardLabel: string;
  cashBonus: number;
  grossIncomeBonus?: number;
  unlockSkinId?: string;
  requiredShiftSeconds: number;
  requiredOrdersServed: number;
  claimed: boolean;
}

export interface DecorCustomization {
  counterWood: 'walnut' | 'white-oak' | 'charcoal-ash' | 'cherry-mahogany' | 'bamboo-zen';
  mugColor: 'cream' | 'matte-black' | 'sage-green' | 'terracotta' | 'royal-gold' | 'sakura-pink';
  neonSignColor: 'amber' | 'emerald' | 'rose' | 'cyber-cyan' | 'violet-dream';
  plantDensity: 'cozy' | 'lush-jungle';
}

export type BaristaStepActionType =
  | 'grind'
  | 'tamp'
  | 'pull_espresso'
  | 'steep_tea'
  | 'steam_milk'
  | 'add_ice'
  | 'add_syrup'
  | 'serve_drink'
  | 'rinse_cup';

export interface ActiveStepAction {
  actionType: BaristaStepActionType;
  startedAtMs: number;
  durationMs: number;
  targetStation: BaristaStationId;
  label: string;
}

export function isStepLockActive(
  lock: ActiveStepAction | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!lock) return false;
  return nowMs < lock.startedAtMs + lock.durationMs;
}

export function createActiveStepLock(
  state: KlasikGameState,
  actionType: BaristaStepActionType,
  targetStation: BaristaStationId,
  label: string,
  nowMs: number = Date.now()
): ActiveStepAction {
  return {
    actionType,
    startedAtMs: nowMs,
    durationMs: getStepDurationMs(state, actionType),
    targetStation,
    label,
  };
}

export interface KlasikGameState {
  phase: GamePhase;
  mode: GameMode;
  weather: WeatherMode;
  timeOfDayMode: TimeOfDayMode;
  rainPreference: RainPreference;
  isRaining: boolean;
  isSnowing: boolean;
  climateState: ClimateState;
  activeStation: BaristaStationId;
  graphicsQuality: GraphicsQuality;
  realismMode: boolean;
  day: number;
  cash: number;
  lifetimeGrossIncome: number;
  dailyRevenue: number;
  dailyGoal: number;
  dailyOrderQuota: number;
  quotaBonusAwarded: boolean;
  dailyQuota: DailyQuotaState;
  dailyLogin: DailyLoginState;
  cupsServedToday: number;
  totalCupsServed: number;
  satisfactionScore: number; // 0..100
  shiftTimeRemaining: number; // legacy field retained for compatibility (no forced 5-min timeout)
  activeShiftSeconds: number; // verifiable active shop playtime in seconds
  waveCustomersRemaining: number; // remaining customers in current 2-3 customer wave
  nextCustomerSpawnTimer: number; // seconds until next 1-by-1 customer walks in or wave cooldown ends
  regularCustomersSinceLastRider: number; // cooldown tracker for rare Delivery Rider NPCs
  pinnedOrderId: string | null;
  currentCup: CupBuildState;
  preparedPastry: PastryId | null; // 100% decoupled from currentCup brew steps!
  preparedPastryCreatedAt?: number | null;
  activeStepLock?: ActiveStepAction | null;
  customers: CustomerOrder[];
  upgrades: BizUpgradeItem[];
  equipmentSkins: EquipmentSkinItem[];
  equippedMachineSkin: MachineSkinId;
  equippedGrinderSkin: GrinderSkinId;
  equippedPitcherSkin: PitcherSkinId;
  customerSkinPacks: CustomerSkinPackItem[];
  activeCustomerSkinPack: CustomerSkinPackId;
  loginRewards: LoginRewardItem[];
  loginStreakDays: number;
  decor: DecorCustomization;
  unlockedCats: CafeCatId[];
  secretCatsUnlocked: CafeCatId[];
  equippedCatId: CafeCatId;
  unlockedCosmetics: CatCosmeticId[];
  catLoadouts: Partial<Record<CafeCatId, CatLoadout>>;
  goldenEspressoUnlocked: boolean;
  audioPreferences: AudioPreferences;
  activeScenery: SceneryId;
  unlockedSceneries: SceneryId[];
  unlockedPatronOutfits: PatronOutfitId[];
  patronOutfitMode: PatronOutfitMode;
  equippedPatronOutfitId: PatronOutfitId | null;
  patronOutfitAutoMatch: boolean;
  enabledCustomPatronOutfits: PatronOutfitId[];
  secretNpcNameIdx: number;
  secretNpcCooldownRemaining: number;
  lastSecretServeSeq?: number;
  hasUnseenCatUnlock?: boolean;
  tisayJustArrivedSeq?: number;
  cookieJarCheatUnlocked?: boolean;
  lastCatUnlockToast?: string | null;
  lastCatUnlockSeq?: number;
  missedOrders?: number;
  lastExpiredCustomerName?: string | null;
  lastExpiredEventSeq?: number;
  lastActionFeedback: string;
}

export const INITIAL_UPGRADES: BizUpgradeItem[] = [
  {
    id: 'precision-burr-grinder',
    name: 'Titanium Conical Burr Grinder',
    category: 'equipment',
    description: 'Increases extraction quality and adds +$2 artisan aroma tip per cup.',
    cost: 35,
    effectLabel: '+$2 Tip / Cup',
    tipBonus: 2,
    purchased: false,
  },
  {
    id: 'dual-pid-boiler',
    name: 'PID Dual-Boiler Pressure Profiling',
    category: 'equipment',
    description: 'Stabilizes brew temperature so waiting customers lose patience 35% slower.',
    cost: 55,
    effectLabel: '+35% Customer Patience',
    tipBonus: 1,
    patienceBoostPct: 35,
    purchased: false,
  },
  {
    id: 'audiophile-tube-preamp',
    name: 'Warm Vacuum Tube Turntable Preamp',
    category: 'acoustics',
    description: 'Upgrades the 3D Vinyl Corner acoustics, boosting Garden Table tips by +$3.',
    cost: 75,
    effectLabel: '+$3 Vinyl Vibe Bonus',
    tipBonus: 3,
    purchased: false,
  },
  {
    id: 'monstera-greenhouse-canopy',
    name: '1990 Miata Showroom & Botanical Pergola',
    category: 'botanicals',
    description: 'Spotlights the 1990 Mazda Miata MX-5 & garden oasis, unlocking +$4 prestige tips.',
    cost: 110,
    effectLabel: '+$4 Miata & Garden Prestige',
    tipBonus: 4,
    purchased: false,
  },
  {
    id: 'kyoto-glass-tea-siphon',
    name: 'Kyoto Borosilicate Tea Siphon & Infuser',
    category: 'equipment',
    description: 'Elevates hot & iced artisanal tea extraction, adding +$3 botanical tip per order.',
    cost: 95,
    effectLabel: '+$3 Tea Craft Tip',
    tipBonus: 3,
    purchased: false,
  },
  {
    id: 'hoshizaki-crystal-ice-forge',
    name: 'Artisan Crystal Sphere Ice Maker',
    category: 'equipment',
    description: 'Produces slow-melting diamond-clear ice cubes for Iced Coffee & Cold Drinks (+$3 tip).',
    cost: 130,
    effectLabel: '+$3 Cold Craft Tip',
    tipBonus: 3,
    purchased: false,
  },
  {
    id: 'klipschorn-corner-speakers',
    name: 'Vintage Walnut Horn Acoustic Speakers',
    category: 'acoustics',
    description: 'Fills the 18m x 16m garage garden with warm analog vinyl stage presence (+$4 tip).',
    cost: 165,
    effectLabel: '+$4 Audiophile Tip',
    tipBonus: 4,
    purchased: false,
  },
  {
    id: 'ethiopian-geisha-bean-vault',
    name: 'Single-Origin Geisha Reserve Vault',
    category: 'hospitality',
    description: 'Rare high-altitude roast that delights specialty coffee connoisseurs (+$5 tip).',
    cost: 220,
    effectLabel: '+$5 Reserve Tip',
    tipBonus: 5,
    purchased: false,
  },
  {
    id: 'japanese-bonsai-terrarium',
    name: 'Zen Moss & Century Bonsai Display',
    category: 'botanicals',
    description: 'Calms queue impatience by an extra 20% and adds +$4 tranquil garden tip.',
    cost: 260,
    effectLabel: '+$4 Tip & Calm Queue',
    tipBonus: 4,
    patienceBoostPct: 20,
    purchased: false,
  },
  {
    id: 'artisan-croissant-proofing-oven',
    name: 'French Butter Pastry Warming Showcase',
    category: 'hospitality',
    description: 'Pairs warm flaky croissants with every drink handoff (+$5 pairing bonus).',
    cost: 340,
    effectLabel: '+$5 Pairing Bonus',
    tipBonus: 5,
    purchased: false,
  },
  {
    id: 'rooftop-rainwater-mist-cooling',
    name: 'Skylight Botanical Mist & Ionizer',
    category: 'botanicals',
    description: 'Keeps the indoor-outdoor courtyard crisp and fragrant (+$6 atmosphere tip).',
    cost: 450,
    effectLabel: '+$6 Courtyard Tip',
    tipBonus: 6,
    purchased: false,
  },
  {
    id: 'miata-pop-up-concours-stage',
    name: '1990 NA Miata Concours Turntable Lighting',
    category: 'hospitality',
    description: 'Showroom floor uplighting for the Classic Red roadster (+$8 car-meet tip).',
    cost: 620,
    effectLabel: '+$8 Roadster Prestige',
    tipBonus: 8,
    purchased: false,
  },
  {
    id: 'custom-rotary-pressure-vane',
    name: 'Whisper-Quiet Rotary Vane Pump',
    category: 'equipment',
    description: 'Velvety 9-bar extraction profile that boosts every drink payout by +$8.',
    cost: 850,
    effectLabel: '+$8 Master Barista Tip',
    tipBonus: 8,
    purchased: false,
  },
  {
    id: 'tokyo-roastery-guild-charter',
    name: 'Specialty Coffee & Tea Guild Medallion',
    category: 'hospitality',
    description: 'World-renowned garage cafe certification (+$12 VIP patron tip per cup).',
    cost: 1200,
    effectLabel: '+$12 Guild VIP Tip',
    tipBonus: 12,
    purchased: false,
  },
];

export const INITIAL_EQUIPMENT_SKINS: EquipmentSkinItem[] = [
  {
    id: 'classic-steel',
    slot: 'machine',
    name: 'Classic Brushed Stainless Steel',
    description: 'Factory Italian commercial dual-boiler chassis with warm walnut side panels.',
    cost: 0,
    previewColorHex: '#e5e7eb',
    unlocked: true,
  },
  {
    id: 'matte-obsidian',
    slot: 'machine',
    name: 'Stealth Matte Obsidian Pro',
    description: 'Competition-grade anodized carbon-black espresso chassis with amber LED accents.',
    cost: 180,
    previewColorHex: '#27272a',
    unlocked: false,
  },
  {
    id: 'vintage-copper',
    slot: 'machine',
    name: '1960s Milan Hammered Copper & Brass',
    description: 'Artisanal warm copper boiler cladding that radiates classic European cafe heritage.',
    cost: 320,
    previewColorHex: '#d97706',
    unlocked: false,
  },
  {
    id: 'golden-espresso-machine',
    slot: 'machine',
    name: 'Golden Espresso Machine (2x Sale Income)',
    description:
      'Legendary 24K solid gold dual-boiler masterpiece! Earned at $50,000 Gross Income. DOUBLES (2x) all drink sale income and unlocks exclusive feline rewards!',
    cost: 0,
    grossIncomeRequirement: GOLDEN_MACHINE_GROSS_THRESHOLD,
    saleMultiplier: 2,
    previewColorHex: '#fbbf24',
    unlocked: false,
  },
  {
    id: 'matte-black',
    slot: 'grinder',
    name: 'Matte Black Conical Burr Grinder',
    description: 'Standard precision low-retention espresso grinder.',
    cost: 0,
    previewColorHex: '#18181b',
    unlocked: true,
  },
  {
    id: 'cyber-chrome',
    slot: 'grinder',
    name: 'Mirror Cyber-Chrome Grinder',
    description: 'High-polish mirror-chrome burr tower (Unlockable via Shop or Day 5 Login).',
    cost: 150,
    previewColorHex: '#f8fafc',
    unlocked: false,
  },
  {
    id: 'heritage-brass',
    slot: 'grinder',
    name: 'Royal Gold & Brass Burr Grinder',
    description: 'Gleaming 24K brass-plated grinder housing that matches the Golden Espresso Machine.',
    cost: 280,
    previewColorHex: '#f59e0b',
    unlocked: false,
  },
  {
    id: 'stainless-steel',
    slot: 'pitcher',
    name: 'Competition Stainless Frothing Pitcher',
    description: ' razor-sharp spout for Rosetta and Heart microfoam latte art.',
    cost: 0,
    previewColorHex: '#e2e8f0',
    unlocked: true,
  },
  {
    id: 'rose-gold',
    slot: 'pitcher',
    name: 'Kyoto Rose-Gold Copper Pitcher',
    description: 'Electroplated rose-gold latte art jug (Unlockable via Shop or Day 6 Login).',
    cost: 140,
    previewColorHex: '#fda4af',
    unlocked: false,
  },
  {
    id: 'titanium-pearl',
    slot: 'pitcher',
    name: 'Iridescent Titanium Pearl Pitcher',
    description: 'Competition-coated pearl white pitcher for ultra-silky vortex microfoam.',
    cost: 240,
    previewColorHex: '#fef08a',
    unlocked: false,
  },
];

export const INITIAL_CUSTOMER_SKIN_PACKS: CustomerSkinPackItem[] = [
  {
    id: 'casual-garden',
    name: 'Garage Garden Neighborhood Regulars',
    description: 'Warm earth-tone jackets, denim, tote bags, and cozy knit beanies.',
    cost: 0,
    paletteColors: ['#d97706', '#059669', '#2563eb', '#9333ea', '#e11d48', '#0d9488'],
    unlocked: true,
  },
  {
    id: 'tokyo-streetwear',
    name: 'Harajuku & Shibuya Streetwear Pack',
    description: 'Oversized sage cargos, crimson varsity jackets, and neon-accented streetwear.',
    cost: 120,
    paletteColors: ['#ef4444', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#14b8a6'],
    unlocked: false,
  },
  {
    id: 'miata-track-club',
    name: '1990 Roadster Track Club & Pit Crew',
    description: 'Classic Red racing windbreakers, British Racing Green jackets, and sunburst yellow.',
    cost: 190,
    paletteColors: ['#dc2626', '#065f46', '#eab308', '#1d4ed8', '#ea580c', '#334155'],
    unlocked: false,
  },
  {
    id: 'vinyl-jazz-collectors',
    name: 'Midnight Vinyl & Jazz Collectors',
    description: 'Velvet burgundy blazers, espresso trench coats, and golden-era turtleneck sweaters.',
    cost: 240,
    paletteColors: ['#881337', '#78350f', '#312e81', '#365314', '#b45309', '#4c1d95'],
    unlocked: false,
  },
  {
    id: 'botanical-artists',
    name: 'Greenhouse Botanical Painters',
    description: 'Matcha linen smocks, terracotta studio aprons, and lavender organic cotton.',
    cost: 280,
    paletteColors: ['#4d7c0f', '#c2410c', '#7e22ce', '#0f766e', '#a16207', '#be185d'],
    unlocked: false,
  },
  {
    id: 'cyber-neon-night',
    name: 'Neo-Tokyo Rainy NightRunners',
    description: 'Electric cyan, magenta, and high-vis gold techwear for rainy night shifts.',
    cost: 350,
    paletteColors: ['#06b6d4', '#d946ef', '#facc15', '#3b82f6', '#f43f5e', '#10b981'],
    unlocked: false,
  },
];

export const INITIAL_LOGIN_REWARDS: LoginRewardItem[] = [
  {
    day: 1,
    id: 'login-day-1',
    title: 'Tier 1: Barista Starter Pack',
    description: 'Requires 10m active shift play & 15 orders served. Grants Ethiopian Bean Reserve bonus!',
    rewardLabel: '+$120 Cash & +$2,000 Gross Progress',
    cashBonus: 120,
    grossIncomeBonus: 2000,
    requiredShiftSeconds: 600,
    requiredOrdersServed: 15,
    claimed: false,
  },
  {
    day: 2,
    id: 'login-day-2',
    title: 'Tier 2: Midnight Roast & Streetwear Pack',
    description: 'Requires 25m active shift play & 45 orders served. Unlocks Shibuya Streetwear Pack + $200.',
    rewardLabel: 'Tokyo Streetwear Pack + $200',
    cashBonus: 200,
    grossIncomeBonus: 5000,
    unlockSkinId: 'tokyo-streetwear',
    requiredShiftSeconds: 1500,
    requiredOrdersServed: 45,
    claimed: false,
  },
  {
    day: 3,
    id: 'login-day-3',
    title: 'Tier 3: Golden Miata Keychain & Espresso Chrome',
    description: 'Requires 45m active shift play & 90 orders served. Unlocks Cyber-Chrome Grinder + $350.',
    rewardLabel: 'Cyber-Chrome Grinder + $350',
    cashBonus: 350,
    grossIncomeBonus: 10000,
    unlockSkinId: 'cyber-chrome',
    requiredShiftSeconds: 2700,
    requiredOrdersServed: 90,
    claimed: false,
  },
  {
    day: 4,
    id: 'login-day-4',
    title: 'Tier 4: Stealth Matte Obsidian Machine Skin',
    description: 'Requires 60m active shift play & 120 orders served. Unlocks Matte Obsidian Pro machine skin!',
    rewardLabel: 'Obsidian Machine Skin + $400',
    cashBonus: 400,
    grossIncomeBonus: 15000,
    unlockSkinId: 'matte-obsidian',
    requiredShiftSeconds: 3600,
    requiredOrdersServed: 120,
    claimed: false,
  },
  {
    day: 5,
    id: 'login-day-5',
    title: 'Tier 5: Kyoto Tea Master Reserve',
    description: 'Requires 75m active shift play & 150 orders served. Celebrates your Artisanal Tea bar!',
    rewardLabel: '+$500 Cash & +$20,000 Gross Progress',
    cashBonus: 500,
    grossIncomeBonus: 20000,
    requiredShiftSeconds: 4500,
    requiredOrdersServed: 150,
    claimed: false,
  },
  {
    day: 6,
    id: 'login-day-6',
    title: 'Tier 6: Kyoto Rose-Gold Frothing Pitcher',
    description: 'Requires 90m active shift play & 180 orders served. Unlocks Rose-Gold Pitcher Skin + $750.',
    rewardLabel: 'Rose-Gold Pitcher + $750',
    cashBonus: 750,
    grossIncomeBonus: 20000,
    unlockSkinId: 'rose-gold',
    requiredShiftSeconds: 5400,
    requiredOrdersServed: 180,
    claimed: false,
  },
  {
    day: 7,
    id: 'login-day-7',
    title: 'Tier 7: Grand Roaster Heritage Brass Reserve',
    description:
      'Requires 120m active shift play & 220 orders served. Unlocks Royal Gold & Brass Burr Grinder + $1,500!',
    rewardLabel: 'Heritage Brass Grinder + $1,500',
    cashBonus: 1500,
    grossIncomeBonus: 30000,
    unlockSkinId: 'heritage-brass',
    requiredShiftSeconds: 7200,
    requiredOrdersServed: 220,
    claimed: false,
  },
];

const CUSTOMER_NAMES = [
  'Maya',
  'Liam',
  'Sora',
  'Mateo',
  'Chloe',
  'Kenji',
  'Amara',
  'Noah',
  'Elena',
  'Tala',
  'Devon',
  'Hana',
  'Yuki',
  'Lucas',
  'Nadia',
  'Kaito',
];

const AVATAR_COLORS = ['#f5d0b5', '#e2a983', '#c6865c', '#8d5524', '#f1c27d', '#d2996c'];
const SOCIAL_BEHAVIORS: CustomerSocialBehavior[] = [
  'car_selfie',
  'selfie',
  'chatting',
  'laptop',
  'relaxing',
];

export function createEmptyCup(): CupBuildState {
  return {
    hasGrounds: false,
    isTamped: false,
    hasEspresso: false,
    hasSteepedTea: false,
    hasSteamedMilk: false,
    hasIce: false,
    syrup: 'none',
  };
}

export function createInitialGameState(): KlasikGameState {
  const firstCustomer: CustomerOrder = {
    id: 'cust-initial-1',
    customerName: 'Maya',
    avatarColor: '#f5d0b5',
    shirtColor: '#d97706',
    recipeId: 'velvet-latte',
    orderType: 'dine-in',
    orderAccepted: false,
    mood: 100,
    moodDurationSec: 90,
    moodExpired: false,
    patience: 100,
    maxPatience: 100,
    orderTimeLimitSec: 90,
    orderTimeRemainingSec: 90,
    timerStarted: true,
    state: 'ordering',
    seatIndex: null,
    seatedTimer: 0,
    dialogueLine:
      'Morning! Could I get a hot Garage Velvet Latte with extra silky 65°C microfoam?',
    customAddons: ['+Extra Shot', '+Velvet Foam'],
    customBonusTip: 2,
    requestedPastry: null,
    socialBehavior: 'car_selfie',
  };

  const secondCustomer: CustomerOrder = {
    id: 'cust-initial-2',
    customerName: 'Kenji',
    avatarColor: '#e2a983',
    shirtColor: '#059669',
    recipeId: 'iced-caramel-macchiato',
    orderType: 'takeout',
    orderAccepted: false,
    mood: 100,
    moodDurationSec: 84,
    moodExpired: false,
    patience: 100,
    maxPatience: 100,
    orderTimeLimitSec: 84,
    orderTimeRemainingSec: 84,
    timerStarted: true,
    state: 'ordering',
    seatIndex: null,
    seatedTimer: 0,
    dialogueLine:
      'That 1990 Miata MX-5 is clean! Make it a Takeout Iced Caramel Garden Macchiato—iced, with Caramel drizzle!',
    customAddons: ['+Iced', '+Caramel'],
    customBonusTip: 3,
    customNeedsIce: true,
    customSyrup: 'caramel',
    requestedPastry: null,
    socialBehavior: 'laptop',
  };

  const thirdCustomer: CustomerOrder = {
    id: 'cust-initial-3',
    customerName: 'Sora',
    avatarColor: '#f1c27d',
    shirtColor: '#2563eb',
    recipeId: 'london-fog-tea-latte',
    orderType: 'dine-in',
    orderAccepted: false,
    mood: 100,
    moodDurationSec: 108,
    moodExpired: false,
    patience: 100,
    maxPatience: 100,
    orderTimeLimitSec: 108,
    orderTimeRemainingSec: 108,
    timerStarted: true,
    state: 'ordering',
    seatIndex: null,
    seatedTimer: 0,
    dialogueLine:
      'Love the vinyl spinning today! Can I order an Earl Grey Vanilla London Fog steeped fresh?',
    customAddons: ['+Steeped Tea', '+Vanilla'],
    customBonusTip: 3,
    customSyrup: 'vanilla',
    requestedPastry: null,
    socialBehavior: 'selfie',
  };

  const day = 1;
  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const resolvedTime = resolveDeviceTimeOfDay(now);
  const initialRain = false;
  const initialWeather = resolveCompositeWeather(resolvedTime, initialRain);

  return {
    phase: 'title',
    mode: 'career',
    weather: initialWeather,
    timeOfDayMode: 'auto',
    rainPreference: 'auto',
    isRaining: initialRain,
    isSnowing: false,
    climateState: 'summer',
    activeStation: 2,
    graphicsQuality: 'low',
    realismMode: false,
    day,
    cash: 45,
    lifetimeGrossIncome: 0,
    dailyRevenue: 0,
    dailyGoal: getDailyRevenueGoal(day),
    dailyOrderQuota: DAILY_REALTIME_CUP_QUOTA,
    quotaBonusAwarded: false,
    dailyQuota: {
      dateKey: todayKey,
      cupsServedToday: 0,
      dailyCupQuota: DAILY_REALTIME_CUP_QUOTA,
      quotaBonusClaimed: false,
    },
    dailyLogin: {
      lastClaimDateKey: null,
      lastClaimTimestamp: null,
      streakDay: 1,
      claimedToday: false,
    },
    cupsServedToday: 0,
    totalCupsServed: 0,
    satisfactionScore: 100,
    shiftTimeRemaining: SHIFT_SECONDS,
    activeShiftSeconds: 0,
    waveCustomersRemaining: 2,
    nextCustomerSpawnTimer: 5,
    regularCustomersSinceLastRider: 3,
    pinnedOrderId: firstCustomer.id,
    currentCup: createEmptyCup(),
    preparedPastry: null,
    preparedPastryCreatedAt: null,
    activeStepLock: null,
    customers: [firstCustomer, secondCustomer, thirdCustomer],
    upgrades: INITIAL_UPGRADES.map((u) => ({ ...u })),
    equipmentSkins: INITIAL_EQUIPMENT_SKINS.map((s) => ({ ...s })),
    equippedMachineSkin: 'classic-steel',
    equippedGrinderSkin: 'matte-black',
    equippedPitcherSkin: 'stainless-steel',
    customerSkinPacks: INITIAL_CUSTOMER_SKIN_PACKS.map((p) => ({ ...p })),
    activeCustomerSkinPack: 'casual-garden',
    loginRewards: INITIAL_LOGIN_REWARDS.map((r) => ({ ...r })),
    loginStreakDays: 1,
    decor: {
      counterWood: 'walnut',
      mugColor: 'cream',
      neonSignColor: 'amber',
      plantDensity: 'lush-jungle',
    },
    unlockedCats: ['champy'],
    secretCatsUnlocked: [],
    equippedCatId: 'champy',
    unlockedCosmetics: [],
    catLoadouts: {},
    goldenEspressoUnlocked: false,
    audioPreferences: { ...DEFAULT_AUDIO_PREFERENCES },
    activeScenery: 'busy_street',
    unlockedSceneries: ['busy_street'],
    unlockedPatronOutfits: [],
    patronOutfitMode: 'manual',
    equippedPatronOutfitId: null,
    patronOutfitAutoMatch: false,
    enabledCustomPatronOutfits: [],
    secretNpcNameIdx: 0,
    secretNpcCooldownRemaining: 0,
    lastSecretServeSeq: 0,
    hasUnseenCatUnlock: false,
    tisayJustArrivedSeq: 0,
    cookieJarCheatUnlocked: false,
    lastCatUnlockToast: null,
    lastCatUnlockSeq: 0,
    missedOrders: 0,
    lastExpiredCustomerName: null,
    lastExpiredEventSeq: 0,
    lastActionFeedback:
      'Welcome to Klasik 3D! Tap "Take Order" or click a waiting customer to accept their order at your own pace.',
  };
}

export function getRecipeById(recipeId: string): DrinkRecipe {
  return RECIPES.find((r) => r.id === recipeId) || RECIPES[0];
}

// Merges a customer's custom add-on requests with the base recipe
export function getEffectiveRecipeForOrder(
  order?: CustomerOrder | null,
  fallbackRecipe?: DrinkRecipe | null
): DrinkRecipe {
  const base = order
    ? getRecipeById(order.recipeId)
    : fallbackRecipe || RECIPES[1];
  if (!order) return base;
  return {
    ...base,
    needsIce: order.customNeedsIce !== undefined ? order.customNeedsIce : base.needsIce,
    syrup: order.customSyrup !== undefined ? order.customSyrup : base.syrup,
  };
}

export function isColdOrIcedOrder(
  order?: CustomerOrder | null,
  fallbackRecipe?: DrinkRecipe | null
): boolean {
  const effective = getEffectiveRecipeForOrder(order, fallbackRecipe);
  return (
    effective.needsIce ||
    effective.category === 'iced_coffee' ||
    effective.category === 'cold_drink'
  );
}

export function getOrderVesselType(
  order?: CustomerOrder | null,
  fallbackRecipe?: DrinkRecipe | null
): CupVesselType {
  const isCold = isColdOrIcedOrder(order, fallbackRecipe);
  const isTakeout = order?.orderType === 'takeout';
  if (isTakeout) {
    return isCold ? 'iced-takeout' : 'hot-takeout';
  }
  return isCold ? 'iced-glass' : 'hot-mug';
}

// Strict Recipe & Wrong-Ingredient Validator to prevent Premature Serving & Cash Exploits
export function validateDrinkForServe(
  cup: CupBuildState,
  recipe: DrinkRecipe,
  order?: CustomerOrder | null
): {
  isComplete: boolean;
  missingSteps: string[];
  wrongIngredients: string[];
  hasWrongIngredient: boolean;
} {
  const effective = getEffectiveRecipeForOrder(order, recipe);
  const missingSteps: string[] = [];
  const wrongIngredients: string[] = [];

  if (effective.needsEspresso) {
    if (!cup.hasGrounds) missingSteps.push('Grind Beans');
    if (!cup.isTamped) missingSteps.push('Tamp Puck');
    if (!cup.hasEspresso) missingSteps.push('Espresso Shot');
  } else if (cup.hasEspresso) {
    wrongIngredients.push('Espresso in Tea Drink');
  }

  const needsTea = Boolean(effective.needsTeaSteep);
  const hasTea =
    Boolean(cup.hasSteepedTea) ||
    (effective.id === 'uji-matcha-latte' && cup.syrup === 'matcha');
  if (needsTea && !hasTea) {
    missingSteps.push('Steeped Tea');
  } else if (!needsTea && cup.hasSteepedTea && effective.syrup !== 'matcha') {
    wrongIngredients.push('Tea in Coffee Drink');
  }

  if (effective.needsSteamedMilk && !cup.hasSteamedMilk) {
    missingSteps.push('Steamed Milk');
  } else if (!effective.needsSteamedMilk && cup.hasSteamedMilk) {
    wrongIngredients.push('Unrequested Steamed Milk');
  }

  if (effective.needsIce && !cup.hasIce) {
    missingSteps.push('Ice Cubes');
  } else if (!effective.needsIce && cup.hasIce) {
    wrongIngredients.push('Unrequested Ice');
  }

  if (effective.syrup !== 'none' && cup.syrup === 'none') {
    const label =
      effective.syrup.charAt(0).toUpperCase() + effective.syrup.slice(1);
    missingSteps.push(`+${label}`);
  } else if (cup.syrup !== 'none' && cup.syrup !== effective.syrup) {
    const wrongLabel =
      cup.syrup.charAt(0).toUpperCase() + cup.syrup.slice(1);
    wrongIngredients.push(`Wrong Syrup (+${wrongLabel})`);
  }

  return {
    isComplete: missingSteps.length === 0,
    missingSteps,
    wrongIngredients,
    hasWrongIngredient: wrongIngredients.length > 0,
  };
}

// Calculates timed execution duration (ms) for each barista step, scaled by purchased equipment upgrades
export function getStepDurationMs(
  state: KlasikGameState,
  action:
    | 'grind'
    | 'tamp'
    | 'pull_espresso'
    | 'steep_tea'
    | 'steam_milk'
    | 'add_ice'
    | 'add_syrup'
    | 'serve_drink'
    | 'rinse_cup'
): number {
  const hasUpgrade = (id: string) =>
    state.upgrades.some((u) => u.id === id && u.purchased);

  if (action === 'grind') {
    const mult = hasUpgrade('precision-burr-grinder') ? 0.82 : 1.0; // -18% Grind duration
    return Math.round(1800 * mult);
  }
  if (action === 'tamp') {
    const mult =
      hasUpgrade('precision-burr-grinder') || hasUpgrade('dual-pid-boiler') ? 0.8 : 1.0; // -20% Tamp duration
    return Math.round(1200 * mult);
  }
  if (action === 'pull_espresso') {
    let mult = 1.0;
    if (hasUpgrade('dual-pid-boiler')) mult *= 0.82; // -18% Shot duration
    if (hasUpgrade('custom-rotary-pressure-vane')) mult *= 0.82; // -18% Shot duration
    return Math.round(2600 * mult);
  }
  if (action === 'steam_milk') {
    const mult =
      hasUpgrade('dual-pid-boiler') || hasUpgrade('custom-rotary-pressure-vane') ? 0.8 : 1.0; // -20% Steam duration
    return Math.round(2200 * mult);
  }
  if (action === 'steep_tea') {
    const mult = hasUpgrade('kyoto-glass-tea-siphon') ? 0.8 : 1.0; // -20% Steep duration
    return Math.round(2200 * mult);
  }
  if (action === 'add_ice') {
    const mult = hasUpgrade('hoshizaki-crystal-ice-forge') ? 0.82 : 1.0;
    return Math.round(1100 * mult);
  }
  if (action === 'add_syrup') {
    const mult = hasUpgrade('kyoto-glass-tea-siphon') ? 0.85 : 1.0;
    return Math.round(1100 * mult);
  }
  if (action === 'serve_drink') {
    return 1500;
  }
  return 450;
}

export function isCupInProgress(cup: CupBuildState): boolean {
  return Boolean(
    cup.hasGrounds ||
      cup.isTamped ||
      cup.hasEspresso ||
      cup.hasSteepedTea ||
      cup.hasSteamedMilk ||
      cup.hasIce ||
      cup.syrup !== 'none'
  );
}

export function buildOrderPrepGuardState(state: KlasikGameState): OrderPrepGuardState {
  const acceptedOrders = state.customers
    .filter((c) => c.state === 'ordering' && c.orderAccepted)
    .map((c) => ({
      id: c.id,
      acceptedAt: c.acceptedAt ?? 0,
      pendingItemCount: 1 + (c.requestedPastry ? 1 : 0),
    }));
  const activePrepCount =
    (isCupInProgress(state.currentCup) ? 1 : 0) + (state.preparedPastry ? 1 : 0);
  return {
    acceptedOrders,
    activePrepCount,
  };
}

export function preparePastry(
  state: KlasikGameState,
  pastryId: PastryId,
  nowMs: number = Date.now()
): KlasikGameState {
  const spec = getPastryById(pastryId);
  if (!spec) return state;

  // Phase 2 Anti-Exploit Gate: Require at least 1 accepted order and enforce pending-item slot cap
  const guardState = buildOrderPrepGuardState(state);
  if (guardState.acceptedOrders.length === 0) {
    return {
      ...state,
      lastActionFeedback: "Accept a customer's order first",
    };
  }
  if (!state.preparedPastry) {
    const prepCheck = canStartOrderPrep(guardState);
    if (!prepCheck.allowed) {
      return {
        ...state,
        lastActionFeedback:
          prepCheck.reason === 'no_accepted_order'
            ? "Accept a customer's order first"
            : 'Finish or serve your accepted order before plating another pastry!',
      };
    }
  }

  const activeOrder =
    state.customers.find(
      (c) => c.id === state.pinnedOrderId && c.state === 'ordering' && c.orderAccepted
    ) || state.customers.find((c) => c.state === 'ordering' && c.orderAccepted);
  const isTakeout = activeOrder?.orderType === 'takeout' || Boolean(activeOrder?.isDeliveryRider);
  const containerLabel = isTakeout ? 'Kraft Paper Bag' : 'Mini Porcelain Plate';
  return {
    ...state,
    preparedPastry: pastryId,
    preparedPastryCreatedAt: nowMs,
    lastActionFeedback: `Placed ${spec.name} into ${containerLabel} beside the Serving Coaster! (Coffee steps stay untouched.)`,
  };
}

export function clearPreparedPastry(state: KlasikGameState): KlasikGameState {
  return {
    ...state,
    preparedPastry: null,
    preparedPastryCreatedAt: null,
  };
}

export function returnPreparedPastry(state: KlasikGameState): KlasikGameState {
  if (!state.preparedPastry) return state;
  const spec = getPastryById(state.preparedPastry);
  return {
    ...state,
    preparedPastry: null,
    preparedPastryCreatedAt: null,
    lastActionFeedback: spec
      ? `Returned ${spec.name} back to the pastry display case.`
      : 'Returned pastry back to the display case.',
  };
}

export function isOrderReadyToServe(
  cup: CupBuildState,
  preparedPastry: PastryId | null | undefined,
  order: CustomerOrder | null | undefined
): {
  ready: boolean;
  drinkReady: boolean;
  pastryReady: boolean;
  hasWrongIngredient: boolean;
  missingSteps: string[];
  missingPastry: PastrySpec | null;
} {
  if (!order) {
    return {
      ready: false,
      drinkReady: false,
      pastryReady: true,
      hasWrongIngredient: false,
      missingSteps: ['Accept an order'],
      missingPastry: null,
    };
  }
  const recipe = getRecipeById(order.recipeId);
  const validation = validateDrinkForServe(cup, recipe, order);
  const drinkReady = validation.isComplete && !validation.hasWrongIngredient;
  const reqPastry = order.requestedPastry ? getPastryById(order.requestedPastry) : null;
  const pastryReady = !reqPastry || preparedPastry === reqPastry.id;
  return {
    ready: drinkReady && pastryReady,
    drinkReady,
    pastryReady,
    hasWrongIngredient: validation.hasWrongIngredient,
    missingSteps: validation.missingSteps,
    missingPastry: pastryReady ? null : reqPastry,
  };
}

// Determines the next recommended action & station for the smart diegetic halo highlighter
export function getNextRecommendedStep(
  cup: CupBuildState,
  targetRecipe: DrinkRecipe | null,
  targetOrder?: CustomerOrder | null,
  preparedPastry?: PastryId | null
): {
  station: BaristaStationId;
  toolKey: 'pastry' | 'grinder' | 'tamper' | 'espresso' | 'tea' | 'milk' | 'ice' | 'syrup' | 'serve' | 'rinse';
  instruction: string;
  isError?: boolean;
} {
  const recipe = getEffectiveRecipeForOrder(targetOrder, targetRecipe);
  const validation = validateDrinkForServe(cup, recipe, targetOrder);

  if (validation.hasWrongIngredient) {
    return {
      station: 3,
      toolKey: 'rinse',
      instruction: `Wrong addition (${validation.wrongIngredients[0]})! Rinse/Discard cup [R] at Station 3 to restart`,
      isError: true,
    };
  }

  if (recipe.needsEspresso) {
    if (!cup.hasGrounds) {
      return {
        station: 3,
        toolKey: 'grinder',
        instruction: 'Grind fresh dark-roast beans into portafilter (Station 3)',
      };
    }
    if (!cup.isTamped) {
      return {
        station: 3,
        toolKey: 'tamper',
        instruction: 'Tamp coffee grounds evenly on the tamping mat (Station 3)',
      };
    }
    if (!cup.hasEspresso) {
      return {
        station: 3,
        toolKey: 'espresso',
        instruction: 'Pull 9-bar double espresso shot into cup (Station 3)',
      };
    }
  }

  if (recipe.needsTeaSteep && !cup.hasSteepedTea) {
    return {
      station: 4,
      toolKey: 'tea',
      instruction: 'Steep artisanal tea leaves & botanicals in the Glass Teapot (Station 4)',
    };
  }

  if (recipe.syrup !== 'none' && cup.syrup !== recipe.syrup) {
    return {
      station: 4,
      toolKey: 'syrup',
      instruction: `Pump ${recipe.syrup.toUpperCase()} flavor into the cup on Assembly Coaster (Station 4)`,
    };
  }

  if (recipe.needsIce && !cup.hasIce) {
    return {
      station: 4,
      toolKey: 'ice',
      instruction: 'Scoop crystal ice cubes into the cup on Assembly Coaster (Station 4)',
    };
  }

  if (recipe.needsSteamedMilk && !cup.hasSteamedMilk) {
    return {
      station: 4,
      toolKey: 'milk',
      instruction: 'Steam silky microfoam milk & pour Rosetta latte art (Station 4)',
    };
  }

  if (
    preparedPastry !== undefined &&
    targetOrder?.requestedPastry &&
    preparedPastry !== targetOrder.requestedPastry
  ) {
    const pastry = getPastryById(targetOrder.requestedPastry);
    return {
      station: 1,
      toolKey: 'pastry',
      instruction: `Grab ${pastry?.name || 'Pastry'} from the Glass Pastry Case (Station 1)`,
    };
  }

  return {
    station: 5,
    toolKey: 'serve',
    instruction: `Ring bell & serve finished ${recipe.name} at Pickup Counter (Station 5)`,
  };
}

// Evaluates how accurately the brewed cup matches the customer's ordered recipe + custom add-ons (0..100%)
export function evaluateDrinkMatch(
  cup: CupBuildState,
  recipe: DrinkRecipe,
  order?: CustomerOrder | null
): {
  accuracy: number;
  isPerfect: boolean;
  notes: string[];
} {
  const effective = getEffectiveRecipeForOrder(order, recipe);
  let score = 0;
  const totalChecks = 5;
  const notes: string[] = [];

  if (cup.hasEspresso === effective.needsEspresso) {
    score++;
  } else {
    notes.push(
      effective.needsEspresso ? 'Missing espresso shot' : 'Unexpected espresso shot'
    );
  }

  const needsTea = Boolean(effective.needsTeaSteep);
  const hasTea = Boolean(cup.hasSteepedTea);
  // Allow matcha syrup whisking to also satisfy tea base if customer brewed Uji Matcha directly
  if (hasTea === needsTea || (effective.id === 'uji-matcha-latte' && cup.syrup === 'matcha')) {
    score++;
  } else {
    notes.push(needsTea ? 'Missing steeped tea infusion' : 'Unexpected tea infusion');
  }

  if (cup.hasSteamedMilk === effective.needsSteamedMilk) {
    score++;
  } else {
    notes.push(
      effective.needsSteamedMilk ? 'Missing steamed milk' : 'Unwanted milk added'
    );
  }

  if (cup.hasIce === effective.needsIce) {
    score++;
  } else {
    notes.push(effective.needsIce ? 'Should be iced' : 'Should be served hot');
  }

  if (cup.syrup === effective.syrup) {
    score++;
  } else {
    notes.push(
      effective.syrup === 'none'
        ? `Unwanted ${cup.syrup} syrup`
        : `Needed ${effective.syrup} syrup`
    );
  }

  const accuracy = Math.round((score / totalChecks) * 100);
  return {
    accuracy,
    isPerfect: score === totalChecks,
    notes,
  };
}

export function calculateDrinkPayout(
  state: KlasikGameState,
  recipe: DrinkRecipe,
  accuracy: number,
  customerMood: number,
  customBonusTip = 0,
  pastryId: PastryId | null = null,
  isDeliveryRider = false,
  isSecretNpc = false
): {
  totalPayout: number;
  basePrice: number;
  pastryPrice: number;
  deliveryBonus: number;
  tip: number;
  speedTip: number;
  speedTipLabel: string | null;
  customTip: number;
  multiplier: number;
  catRevenueMultiplier: number;
} {
  const basePrice = Math.max(1, Math.round(recipe.price * (accuracy / 100)));
  const pastrySpec = getPastryById(pastryId);
  const pastryPrice = pastrySpec ? pastrySpec.price : 0;
  const deliveryBonus = isDeliveryRider ? DELIVERY_PARTNER_BONUS : 0;

  let upgradeBonus = 0;
  for (const upg of state.upgrades) {
    if (!upg.purchased) continue;
    upgradeBonus += upg.tipBonus || 2;
  }

  let moodTip = 0;
  let moodTipLabel: string | null = null;
  if (accuracy === 100) {
    const moodRes = computeMoodTipBonus(customerMood);
    moodTip = moodRes.tip;
    moodTipLabel = moodRes.label;
  }

  const earnedCustomTip = accuracy === 100 ? customBonusTip : 0;
  const rawTip = accuracy >= 75 ? moodTip + upgradeBonus + earnedCustomTip + deliveryBonus : 0;
  const tip = isSecretNpc ? rawTip * SECRET_NPC_TIP_MULTIPLIER : rawTip;

  // Golden Espresso Machine Skin doubles (2x) all drink sale income once equipped!
  const machineMultiplier = state.equippedMachineSkin === 'golden-espresso-machine' ? 2 : 1;
  // Mikmik Passive: +30% revenue multiplier (1.3x) on all coffee & drink sales!
  const equippedCat = getCafeCatSpec(state.equippedCatId);
  const catRevenueMultiplier = equippedCat.revenueMultiplier || 1.0;
  const totalMultiplier = machineMultiplier * catRevenueMultiplier;

  const rawTotal = basePrice + pastryPrice + tip;
  const totalPayout = Math.round(rawTotal * totalMultiplier);
  return {
    totalPayout,
    basePrice: Math.round(basePrice * totalMultiplier),
    pastryPrice: Math.round(pastryPrice * totalMultiplier),
    deliveryBonus: Math.round(deliveryBonus * totalMultiplier),
    tip: Math.round(tip * totalMultiplier),
    speedTip: Math.round(moodTip * totalMultiplier),
    speedTipLabel: moodTipLabel,
    customTip: Math.round(earnedCustomTip * totalMultiplier),
    multiplier: machineMultiplier,
    catRevenueMultiplier,
  };
}

export function performCupAction(
  state: KlasikGameState,
  action:
    | 'grind'
    | 'tamp'
    | 'pull_espresso'
    | 'steep_tea'
    | 'steam_milk'
    | 'add_ice'
    | 'add_syrup'
    | 'rinse_cup'
    | 'quick_brew_step',
  syrupFlavor?: SyrupFlavor,
  nowMs: number = Date.now()
): KlasikGameState {
  // Authoritative single-flight anti-exploit lock: reject rapid-tap spam while current physical machine step is running
  if (isStepLockActive(state.activeStepLock, nowMs)) {
    return state;
  }

  const cup = { ...state.currentCup };
  let feedback = state.lastActionFeedback;
  let activeStation = state.activeStation;

  if (action === 'rinse_cup') {
    const activeOrder =
      state.customers.find((c) => c.id === state.pinnedOrderId && c.state === 'ordering') ||
      state.customers.find((c) => c.state === 'ordering');
    const vessel = getOrderVesselType(activeOrder);
    const isTakeout = vessel === 'hot-takeout' || vessel === 'iced-takeout';
    return {
      ...state,
      activeStation: 3,
      currentCup: createEmptyCup(),
      lastActionFeedback: isTakeout
        ? 'Tossed disposable takeout cup into the Barista Trash Chute & grabbed a fresh cup.'
        : 'Inverted cup on the pressurized Rinser & sprayed sparkling clean.',
    };
  }

  // Phase 2 Anti-Exploit Gate: Block starting/crafting any cup before an order is accepted
  const guardState = buildOrderPrepGuardState(state);
  const cupAlreadyStarted = isCupInProgress(state.currentCup);
  if (guardState.acceptedOrders.length === 0) {
    return {
      ...state,
      lastActionFeedback: "Accept a customer's order first",
    };
  }
  if (!cupAlreadyStarted && action !== 'quick_brew_step') {
    const prepCheck = canStartOrderPrep(guardState);
    if (!prepCheck.allowed) {
      return {
        ...state,
        lastActionFeedback:
          prepCheck.reason === 'no_accepted_order'
            ? "Accept a customer's order first"
            : 'Finish or serve your active order before starting another cup!',
      };
    }
  }

  if (action === 'quick_brew_step') {
    const pinnedOrder =
      state.customers.find(
        (c) => c.id === state.pinnedOrderId && c.state === 'ordering' && c.orderAccepted
      ) || state.customers.find((c) => c.state === 'ordering' && c.orderAccepted);
    if (!pinnedOrder) {
      return {
        ...state,
        lastActionFeedback: "Accept a customer's order first",
      };
    }
    const targetRecipe = getRecipeById(pinnedOrder.recipeId);
    const effectiveRecipe = getEffectiveRecipeForOrder(pinnedOrder, targetRecipe);
    const step = getNextRecommendedStep(cup, targetRecipe, pinnedOrder, state.preparedPastry);
    activeStation = step.station;

    if (step.toolKey === 'rinse') {
      return {
        ...state,
        activeStation: 3,
        currentCup: createEmptyCup(),
        lastActionFeedback: 'Cleared cup at Rinser / Trash Chute [R] after wrong ingredient.',
      };
    } else if (step.toolKey === 'pastry' && pinnedOrder.requestedPastry) {
      return {
        ...preparePastry(state, pinnedOrder.requestedPastry, nowMs),
        activeStation: 1,
      };
    } else if (step.toolKey === 'serve') {
      return serveCurrentCupToCustomer({ ...state, activeStation: 5 }, pinnedOrder.id, nowMs);
    }

    if (!cupAlreadyStarted) {
      const prepCheck = canStartOrderPrep(guardState);
      if (!prepCheck.allowed) {
        return {
          ...state,
          lastActionFeedback:
            prepCheck.reason === 'no_accepted_order'
              ? "Accept a customer's order first"
              : 'Finish or serve your active order before starting another cup!',
        };
      }
      cup.createdAt = nowMs;
    }

    if (step.toolKey === 'grinder') {
      cup.hasGrounds = true;
      feedback = 'Ground 18g of fresh Arabica beans into the portafilter.';
    } else if (step.toolKey === 'tamper') {
      cup.isTamped = true;
      feedback = 'Tamped coffee puck evenly at 30 lbs of pressure.';
    } else if (step.toolKey === 'espresso') {
      cup.hasEspresso = true;
      const postShotStep = getNextRecommendedStep(cup, targetRecipe, pinnedOrder, state.preparedPastry);
      activeStation = postShotStep.station;
      feedback =
        'Extracted 9-bar double espresso with golden crema! Cup gliding to Station 4 Assembly Coaster.';
    } else if (step.toolKey === 'tea') {
      cup.hasSteepedTea = true;
      activeStation = 4;
      feedback =
        'Steeped fragrant organic tea leaves & botanicals in the Kyoto Glass Teapot on Station 4!';
    } else if (step.toolKey === 'syrup') {
      cup.syrup = effectiveRecipe.syrup;
      feedback = `Added aromatic ${effectiveRecipe.syrup} infusion on the Station 4 Assembly Coaster.`;
    } else if (step.toolKey === 'ice') {
      cup.hasIce = true;
      feedback = 'Scooped crystal-clear ice cubes into the cup on Station 4.';
    } else if (step.toolKey === 'milk') {
      cup.hasSteamedMilk = true;
      feedback = 'Steamed 65°C velvety microfoam & poured Rosetta latte art!';
    }

    return {
      ...state,
      activeStation,
      currentCup: cup,
      lastActionFeedback: feedback,
    };
  }

  if (action === 'grind') {
    if (!cupAlreadyStarted) cup.createdAt = nowMs;
    cup.hasGrounds = true;
    cup.isTamped = false;
    activeStation = 3;
    feedback = 'Ground 18g of fresh dark-roast beans into portafilter.';
  } else if (action === 'tamp') {
    // Enforce strict sequential order: cannot tamp without grinding first!
    if (!cup.hasGrounds) {
      return {
        ...state,
        lastActionFeedback: 'Locked! Grind fresh coffee beans at the Burr Grinder [G] before tamping.',
      };
    }
    cup.isTamped = true;
    activeStation = 3;
    feedback = 'Tamped grounds level & polished espresso puck surface at 30 lbs.';
  } else if (action === 'pull_espresso') {
    // Enforce strict sequential order: cannot pull shot without grinding & tamping first!
    if (!cup.hasGrounds || !cup.isTamped) {
      return {
        ...state,
        lastActionFeedback: !cup.hasGrounds
          ? 'Locked! Grind fresh beans [G] and tamp the puck [T] before pulling an espresso shot.'
          : 'Locked! Tamp the coffee grounds [T] on the tamping mat before pulling a shot.',
      };
    }
    cup.hasEspresso = true;
    activeStation = 4;
    feedback = 'Pulled 9-bar double espresso shot! Cup gliding to Station 4 Assembly Coaster.';
  } else if (action === 'steep_tea') {
    if (!cupAlreadyStarted) cup.createdAt = nowMs;
    cup.hasSteepedTea = true;
    activeStation = 4;
    feedback = 'Steeped artisanal tea leaves & botanical infusion at 80°C on Station 4.';
  } else if (action === 'steam_milk') {
    if (!cup.hasEspresso && !cup.hasSteepedTea) {
      return {
        ...state,
        lastActionFeedback: 'Locked! Pull an espresso shot [E] or steep tea [B] before steaming milk.',
      };
    }
    cup.hasSteamedMilk = true;
    activeStation = 4;
    feedback = 'Steamed silky 65°C microfoam milk & poured Rosetta latte art.';
  } else if (action === 'add_ice') {
    if (!cupAlreadyStarted) cup.createdAt = nowMs;
    cup.hasIce = !cup.hasIce;
    activeStation = 4;
    feedback = cup.hasIce ? 'Scooped crystal ice cubes into cup.' : 'Removed ice from cup.';
  } else if (action === 'add_syrup' && syrupFlavor) {
    if (!cupAlreadyStarted) cup.createdAt = nowMs;
    cup.syrup = syrupFlavor;
    if (syrupFlavor === 'matcha') {
      cup.hasSteepedTea = true;
    }
    activeStation = 4;
    feedback =
      syrupFlavor === 'none'
        ? 'Cleared syrup selection.'
        : `Pumped rich ${syrupFlavor} flavor into the cup.`;
  }

  // Check if the action introduced an unrequested ingredient for the active order
  const activeOrder =
    state.customers.find(
      (c) => c.id === state.pinnedOrderId && c.state === 'ordering' && c.orderAccepted
    ) || state.customers.find((c) => c.state === 'ordering' && c.orderAccepted);
  if (activeOrder) {
    const check = validateDrinkForServe(cup, getRecipeById(activeOrder.recipeId), activeOrder);
    if (check.hasWrongIngredient) {
      feedback = `Wrong addition (${check.wrongIngredients[0]})! Press [R] at the Rinser / Trash Chute to restart cup.`;
    }
  }

  return {
    ...state,
    activeStation,
    activeStepLock: null,
    currentCup: cup,
    lastActionFeedback: feedback,
  };
}

function syncGrossIncomeUnlocks(
  equipmentSkins: EquipmentSkinItem[],
  lifetimeGross: number
): EquipmentSkinItem[] {
  return equipmentSkins.map((s) => {
    if (s.id === 'golden-espresso-machine') {
      return { ...s, unlocked: Boolean(s.unlocked) || lifetimeGross >= GOLDEN_MACHINE_GROSS_THRESHOLD };
    }
    return s;
  });
}

export function syncCatUnlocks(
  currentUnlocked: CafeCatId[] | undefined,
  lifetimeRevenue: number,
  goldenEspressoUnlocked = false
): {
  unlockedCats: CafeCatId[];
  secretCatsUnlocked: CafeCatId[];
  newlyUnlocked: CafeCatId[];
  justUnlockedTisay: boolean;
  unlockToast: string | null;
} {
  const unlockedSet = new Set<CafeCatId>(
    Array.isArray(currentUnlocked) && currentUnlocked.length > 0
      ? currentUnlocked.filter(isValidCafeCatId)
      : ['champy']
  );
  unlockedSet.add('champy');

  const newlyUnlocked: CafeCatId[] = [];
  for (const spec of CAFE_CATS) {
    if (spec.unlockType === 'revenue' && lifetimeRevenue >= spec.unlockAmount) {
      if (!unlockedSet.has(spec.id)) {
        unlockedSet.add(spec.id);
        newlyUnlocked.push(spec.id);
      }
    }
    if (
      spec.unlockType === 'golden_espresso' &&
      (goldenEspressoUnlocked || lifetimeRevenue >= GOLDEN_MACHINE_GROSS_THRESHOLD)
    ) {
      if (!unlockedSet.has(spec.id)) {
        unlockedSet.add(spec.id);
        newlyUnlocked.push(spec.id);
      }
    }
  }

  // Master Unlock: Lilo automatically unlocks once all 7 original unlockable cats are owned!
  const ownsAllSeven = LILO_REQUIRED_CAT_IDS.every((id) => unlockedSet.has(id));
  if (ownsAllSeven && !unlockedSet.has('lilo')) {
    unlockedSet.add('lilo');
    newlyUnlocked.push('lilo');
  }

  const justUnlockedTisay = newlyUnlocked.includes('tisay');

  let unlockToast: string | null = null;
  if (justUnlockedTisay) {
    unlockToast = 'A sleek ginger cat wandered in — Tisay has joined the cafe!';
  } else if (newlyUnlocked.includes('lilo')) {
    unlockToast =
      '👑 Secret Master Cat Unlocked: Lilo! Equip Lilo to disable Customer Mood Meters!';
  } else if (newlyUnlocked.length > 0) {
    const first = getCafeCatSpec(newlyUnlocked[0]);
    unlockToast =
      first.unlockType === 'revenue'
        ? `🐾 New Cafe Cat Unlocked: ${first.name} ($${first.unlockAmount.toLocaleString()} Revenue)!`
        : `🐾 New Cafe Cat Unlocked: ${first.name}!`;
  }

  const ordered = ALL_CAFE_CAT_IDS.filter((id) => unlockedSet.has(id));
  const secretCatsUnlocked = SECRET_CAFE_CAT_IDS.filter((id) => unlockedSet.has(id));
  return { unlockedCats: ordered, secretCatsUnlocked, newlyUnlocked, justUnlockedTisay, unlockToast };
}

export function acceptCustomerOrder(
  state: KlasikGameState,
  orderId: string,
  nowMs: number = Date.now()
): KlasikGameState {
  const target = state.customers.find(
    (c) => c.id === orderId && c.state === 'ordering'
  );
  if (!target) return state;

  if (target.orderAccepted) {
    return {
      ...state,
      pinnedOrderId: target.id,
    };
  }

  const duration = Math.max(60, Math.min(120, target.moodDurationSec || rollMoodDurationSec()));
  const updatedCustomers = state.customers.map((c) => {
    if (c.id !== orderId) return c;
    return {
      ...c,
      orderAccepted: true,
      acceptedAt: nowMs,
      timerStarted: true,
      mood: 100,
      moodDurationSec: duration,
      moodExpired: false,
      patience: 100,
      orderTimeLimitSec: duration,
      orderTimeRemainingSec: duration,
    };
  });

  // Select this order automatically if no currently accepted order is pinned
  const currentPinned = state.customers.find(
    (c) => c.id === state.pinnedOrderId && c.state === 'ordering' && c.orderAccepted
  );
  const nextPinnedId = currentPinned ? currentPinned.id : target.id;
  const recipe = getRecipeById(target.recipeId);

  return {
    ...state,
    customers: updatedCustomers,
    pinnedOrderId: nextPinnedId,
    lastActionFeedback: `Accepted ${target.customerName}'s ${recipe.name} (${target.orderType === 'takeout' ? 'Takeout' : 'Dine-In'})! Ticket hung on rail.`,
  };
}

export function purchaseOrEquipCafeCat(
  state: KlasikGameState,
  catId: CafeCatId
): KlasikGameState {
  const spec = getCafeCatSpec(catId);
  const currentUnlocked = state.unlockedCats || ['champy'];
  const alreadyUnlocked = currentUnlocked.includes(catId);

  if (alreadyUnlocked) {
    return {
      ...state,
      equippedCatId: catId,
      lastActionFeedback: spec.passiveTitle
        ? `Equipped ${spec.name} on the counter! (${spec.passiveTitle})`
        : `Equipped ${spec.name} on the counter cushion!`,
    };
  }

  if (spec.unlockType === 'revenue') {
    return {
      ...state,
      lastActionFeedback: `Reach $${spec.unlockAmount.toLocaleString()} lifetime cafe revenue to unlock ${spec.name}!`,
    };
  }

  if (spec.unlockType === 'master') {
    const ownedCount = LILO_REQUIRED_CAT_IDS.filter((id) =>
      currentUnlocked.includes(id)
    ).length;
    return {
      ...state,
      lastActionFeedback: `Unlock all 7 other Cafe Cats (${ownedCount}/7 owned) to unlock Master Cat Lilo!`,
    };
  }

  if (spec.unlockType === 'golden_espresso') {
    return {
      ...state,
      lastActionFeedback: `Unlock the Golden Espresso Machine ($${GOLDEN_MACHINE_GROSS_THRESHOLD.toLocaleString()}) to meet ${spec.name}!`,
    };
  }

  // Shop purchase
  if (state.cash < spec.unlockAmount) {
    return {
      ...state,
      lastActionFeedback: `Need $${spec.unlockAmount.toLocaleString()} cash to adopt ${spec.name}!`,
    };
  }

  const withPurchased = [...currentUnlocked, catId];
  const synced = syncCatUnlocks(
    withPurchased,
    state.lifetimeGrossIncome || 0,
    Boolean(state.goldenEspressoUnlocked)
  );
  const nextSeq =
    synced.newlyUnlocked.includes('lilo')
      ? (state.lastCatUnlockSeq ?? 0) + 1
      : state.lastCatUnlockSeq ?? 0;

  return {
    ...state,
    cash: state.cash - spec.unlockAmount,
    unlockedCats: synced.unlockedCats,
    secretCatsUnlocked: synced.secretCatsUnlocked,
    equippedCatId: catId,
    hasUnseenCatUnlock: true,
    lastCatUnlockToast: synced.newlyUnlocked.includes('lilo')
      ? synced.unlockToast
      : state.lastCatUnlockToast,
    lastCatUnlockSeq: nextSeq,
    lastActionFeedback: synced.newlyUnlocked.includes('lilo')
      ? `Adopted & equipped ${spec.name}! ${synced.unlockToast}`
      : `Adopted & equipped ${spec.name} for $${spec.unlockAmount.toLocaleString()}!`,
  };
}

export function purchaseCatCosmetic(
  state: KlasikGameState,
  cosmeticId: CatCosmeticId
): KlasikGameState {
  const spec = getCatCosmeticSpec(cosmeticId);
  const owned = state.unlockedCosmetics || [];
  if (owned.includes(cosmeticId)) {
    return state;
  }

  if (spec.unlockType !== 'shop') {
    return {
      ...state,
      lastActionFeedback:
        spec.unlockType === 'revenue'
          ? `Reach $${spec.cost.toLocaleString()} total revenue to unlock ${spec.name}!`
          : spec.unlockType === 'golden_espresso'
          ? `Unlock the Golden Espresso Machine ($${GOLDEN_MACHINE_GROSS_THRESHOLD.toLocaleString()}) to earn ${spec.name}!`
          : `Unlock all 9 base cat cosmetics to earn the Dinosaur Costume!`,
    };
  }

  if (state.cash < spec.cost) {
    return {
      ...state,
      lastActionFeedback: `Need $${spec.cost.toLocaleString()} cash to buy ${spec.name}!`,
    };
  }

  const nextOwnedRaw: CatCosmeticId[] = [...owned, cosmeticId];
  const dinoResult = checkDinoCostumeUnlock(nextOwnedRaw);
  const nextSeq = dinoResult.justUnlockedDino
    ? (state.lastCatUnlockSeq ?? 0) + 1
    : state.lastCatUnlockSeq ?? 0;

  return {
    ...state,
    cash: state.cash - spec.cost,
    unlockedCosmetics: dinoResult.unlockedCosmetics,
    hasUnseenCatUnlock: dinoResult.justUnlockedDino ? true : state.hasUnseenCatUnlock,
    lastCatUnlockToast: dinoResult.justUnlockedDino
      ? '🦖 Master Wardrobe Complete! Dinosaur Costume unlocked for all Cafe Cats!'
      : state.lastCatUnlockToast,
    lastCatUnlockSeq: nextSeq,
    lastActionFeedback: dinoResult.justUnlockedDino
      ? `Purchased ${spec.name}! 🦖 All 9 base cosmetics owned — Dinosaur Costume unlocked!`
      : `Purchased ${spec.name} for $${spec.cost}!`,
  };
}

export function equipCatCosmetic(
  state: KlasikGameState,
  catId: CafeCatId,
  cosmeticId: CatCosmeticId | null,
  slot: CatCosmeticSlot
): KlasikGameState {
  const owned = state.unlockedCosmetics || [];
  if (cosmeticId !== null && !owned.includes(cosmeticId)) {
    return state;
  }

  const currentLoadouts = state.catLoadouts || {};
  const nextLoadout = applyCosmeticToLoadout(currentLoadouts[catId], cosmeticId, slot);
  const catSpec = getCafeCatSpec(catId);
  const itemLabel = cosmeticId ? getCatCosmeticSpec(cosmeticId).name : slot;
  const isNowEquipped = cosmeticId !== null && nextLoadout[getCatCosmeticSpec(cosmeticId).slot] === cosmeticId;

  return {
    ...state,
    catLoadouts: {
      ...currentLoadouts,
      [catId]: nextLoadout,
    },
    lastActionFeedback:
      cosmeticId === null
        ? `Removed ${slot} from ${catSpec.name}.`
        : isNowEquipped
        ? `Equipped ${itemLabel} on ${catSpec.name}!`
        : `Unequipped ${itemLabel} from ${catSpec.name}.`,
  };
}

export function unlockAllEverythingCheat(state: KlasikGameState): KlasikGameState {
  return {
    ...state,
    upgrades: state.upgrades.map((u) => ({ ...u, purchased: true })),
    equipmentSkins: state.equipmentSkins.map((s) => ({ ...s, unlocked: true })),
    customerSkinPacks: state.customerSkinPacks.map((p) => ({ ...p, unlocked: true })),
    loginRewards: state.loginRewards.map((r) => ({ ...r, claimed: true })),
    unlockedCats: [...ALL_CAFE_CAT_IDS],
    secretCatsUnlocked: [...SECRET_CAFE_CAT_IDS],
    unlockedCosmetics: [...ALL_CAT_COSMETIC_IDS],
    unlockedSceneries: [...ALL_SCENERY_IDS],
    unlockedPatronOutfits: [...ALL_PATRON_OUTFIT_IDS],
    goldenEspressoUnlocked: true,
    hasUnseenCatUnlock: true,
    cookieJarCheatUnlocked: true,
    lastActionFeedback: 'you got what you wanted, now enjoy',
  };
}

export function serveCurrentCupToCustomer(
  state: KlasikGameState,
  targetCustomerId?: string,
  nowMs: number = Date.now()
): KlasikGameState {
  if (isStepLockActive(state.activeStepLock, nowMs)) {
    return state;
  }

  const orderingCustomers = state.customers.filter((c) => c.state === 'ordering');
  if (orderingCustomers.length === 0) {
    return {
      ...state,
      lastActionFeedback: 'No customer waiting at the counter right now!',
    };
  }

  const targetCustomer =
    (targetCustomerId && orderingCustomers.find((c) => c.id === targetCustomerId)) ||
    (state.pinnedOrderId && orderingCustomers.find((c) => c.id === state.pinnedOrderId)) ||
    orderingCustomers.find((c) => c.orderAccepted) ||
    orderingCustomers[0];

  // Phase 2 Anti-Exploit Gate: Cannot serve an unaccepted order or pre-acceptance crafted items
  if (!targetCustomer.orderAccepted) {
    return {
      ...state,
      lastActionFeedback: "Accept a customer's order first",
    };
  }
  if (
    typeof targetCustomer.acceptedAt === 'number' &&
    typeof state.currentCup.createdAt === 'number' &&
    !canServePreparedItem(state.currentCup.createdAt, targetCustomer.acceptedAt)
  ) {
    return {
      ...state,
      lastActionFeedback:
        'Cannot serve a cup started before accepting this order — rinse & brew fresh!',
    };
  }

  const recipe = getRecipeById(targetCustomer.recipeId);
  const validation = validateDrinkForServe(state.currentCup, recipe, targetCustomer);

  // 1. STRICT ANTI-EXPLOIT GUARD: Block premature serving when required steps are missing!
  if (!validation.isComplete) {
    return {
      ...state,
      lastActionFeedback: `Drink incomplete! Missing: ${validation.missingSteps.join(' & ')}`,
    };
  }

  // 2. WRONG INGREDIENT COMPLAINT SYSTEM: If all base steps are done but wrong ingredients were added,
  // customer complains, refuses to tip ($0), deducts -8% Cafe Vibe/Satisfaction, and leaves upset!
  if (validation.hasWrongIngredient) {
    const updatedAfterComplaint = state.customers.map((c) =>
      c.id === targetCustomer.id
        ? { ...c, state: 'departing' as CustomerOrder['state'], seatedTimer: 4 }
        : c
    );
    const nextOrderingAfterComplaint = updatedAfterComplaint.find((c) => c.state === 'ordering');
    const penalizedSatisfaction = Math.max(0, state.satisfactionScore - 8);
    return {
      ...state,
      activeStation: 5,
      satisfactionScore: penalizedSatisfaction,
      currentCup: createEmptyCup(),
      customers: updatedAfterComplaint,
      pinnedOrderId: nextOrderingAfterComplaint ? nextOrderingAfterComplaint.id : null,
      lastActionFeedback: `${targetCustomer.customerName}: "Wait—I didn't ask for ${validation.wrongIngredients[0]} in this! Not cool..." (-8% Vibe · $0 Tip)`,
    };
  }

  // 3. PASTRY PAIRING CHECK (Decoupled from coffee — NEVER resets coffee cup if pastry isn't grabbed yet!)
  const reqPastry = targetCustomer.requestedPastry
    ? getPastryById(targetCustomer.requestedPastry)
    : null;
  if (reqPastry && state.preparedPastry !== reqPastry.id) {
    return {
      ...state,
      lastActionFeedback: `Order also needs ${reqPastry.name}! Grab it at Station 1: Pastries (your finished coffee stays ready).`,
    };
  }
  if (
    reqPastry &&
    typeof targetCustomer.acceptedAt === 'number' &&
    typeof state.preparedPastryCreatedAt === 'number' &&
    !canServePreparedItem(state.preparedPastryCreatedAt, targetCustomer.acceptedAt)
  ) {
    return {
      ...state,
      lastActionFeedback:
        'Cannot serve a pastry plated before accepting this order — grab a fresh pastry!',
    };
  }

  const evaluation = evaluateDrinkMatch(state.currentCup, recipe, targetCustomer);
  const customerMood =
    state.equippedCatId === 'lilo' || state.mode === 'zen'
      ? 100
      : typeof targetCustomer.mood === 'number'
      ? targetCustomer.mood
      : targetCustomer.patience;
  const payout = calculateDrinkPayout(
    state,
    recipe,
    evaluation.accuracy,
    customerMood,
    targetCustomer.customBonusTip,
    reqPastry ? reqPastry.id : null,
    Boolean(targetCustomer.isDeliveryRider),
    Boolean(targetCustomer.isSecretNpc)
  );

  // Takeout & Delivery Rider patrons leave straight through the front entrance without occupying any indoor seat!
  const isTakeoutOrder =
    targetCustomer.orderType === 'takeout' || Boolean(targetCustomer.isDeliveryRider);
  let assignedSeat: number | null = null;
  if (!isTakeoutOrder) {
    const occupiedSeats = new Set(
      state.customers
        .filter((c) => c.state === 'seated' && c.seatIndex !== null)
        .map((c) => c.seatIndex)
    );
    for (let i = 0; i < MAX_GARDEN_SEATS; i++) {
      if (!occupiedSeats.has(i)) {
        assignedSeat = i;
        break;
      }
    }
  }

  const updatedCustomers = state.customers.map((c) => {
    if (c.id !== targetCustomer.id) return c;
    return {
      ...c,
      state: (assignedSeat !== null ? 'seated' : 'departing') as CustomerOrder['state'],
      seatIndex: assignedSeat,
      seatedTimer: assignedSeat !== null ? 24 : targetCustomer.isDeliveryRider ? 16 : isTakeoutOrder ? 9.5 : 5.5,
    };
  });

  const remainingOrdering = updatedCustomers.filter((c) => c.state === 'ordering');
  let nextWaveRemaining = state.waveCustomersRemaining ?? 0;
  let nextSpawnTimer = state.nextCustomerSpawnTimer ?? 5;

  // When a mini-wave of 2-3 customers is completely served, activate a 15-second Wave Breathing Cooldown!
  if (remainingOrdering.length === 0 && nextWaveRemaining <= 0) {
    nextWaveRemaining = 3;
    nextSpawnTimer = 15;
  }

  const nextOrdering =
    updatedCustomers.find((c) => c.state === 'ordering' && c.orderAccepted) ||
    updatedCustomers.find((c) => c.state === 'ordering');

  const todayKey = getLocalDateKey(new Date(nowMs));
  const curQuota = state.dailyQuota || {
    dateKey: todayKey,
    cupsServedToday: state.cupsServedToday,
    dailyCupQuota: state.dailyOrderQuota || DAILY_REALTIME_CUP_QUOTA,
    quotaBonusClaimed: state.quotaBonusAwarded,
  };
  const isSameDay = curQuota.dateKey === todayKey;
  const baseCupsToday = isSameDay ? state.cupsServedToday : 0;
  const alreadyClaimedQuota = isSameDay ? state.quotaBonusAwarded || curQuota.quotaBonusClaimed : false;
  const quotaTarget = curQuota.dailyCupQuota || state.dailyOrderQuota || DAILY_REALTIME_CUP_QUOTA;
  const newCupsToday = baseCupsToday + 1;
  const newTotalCups = state.totalCupsServed + 1;

  // Check if real-time 24h Daily Cup Quota (35 cups/day) was just completed!
  const justCompletedQuota = !alreadyClaimedQuota && newCupsToday >= quotaTarget;
  const quotaBonus = justCompletedQuota ? DAILY_QUOTA_COMPLETION_BONUS : 0;

  const grossEarned = payout.totalPayout + quotaBonus;
  const newCash = state.cash + grossEarned;
  const newDailyRevenue = (isSameDay ? state.dailyRevenue : 0) + grossEarned;
  const newLifetimeGross = (state.lifetimeGrossIncome || 0) + grossEarned;
  const isGoldenUnlocked =
    Boolean(state.goldenEspressoUnlocked) || newLifetimeGross >= GOLDEN_MACHINE_GROSS_THRESHOLD;
  const updatedSkins = syncGrossIncomeUnlocks(state.equipmentSkins, newLifetimeGross);
  const catSync = syncCatUnlocks(state.unlockedCats, newLifetimeGross, isGoldenUnlocked);
  const cosmeticSync = syncCatCosmeticMilestones(
    state.unlockedCosmetics,
    newLifetimeGross,
    isGoldenUnlocked
  );
  const justUnlockedGolden =
    !state.goldenEspressoUnlocked &&
    (state.lifetimeGrossIncome || 0) < GOLDEN_MACHINE_GROSS_THRESHOLD &&
    newLifetimeGross >= GOLDEN_MACHINE_GROSS_THRESHOLD;

  const newSatisfaction = Math.min(
    100,
    Math.max(0, Math.round(state.satisfactionScore * 0.85 + evaluation.accuracy * 0.15))
  );

  const goldenBadge = payout.multiplier === 2 ? ' [2x GOLDEN MACHINE!]' : '';
  const mikmikBadge = payout.catRevenueMultiplier > 1 ? ' [+30% MIKMIK!]' : '';
  const pastryBadge = reqPastry ? ` + ${reqPastry.name}` : '';
  const deliveryBadge = targetCustomer.isDeliveryRider
    ? ` [🛵 Delivery +$${DELIVERY_PARTNER_BONUS}]`
    : '';
  const unlockSuffix = justUnlockedGolden
    ? ' · $50K GROSS REACHED! GOLDEN ESPRESSO MACHINE UNLOCKED!'
    : '';
  const quotaSuffix = justCompletedQuota
    ? ` · DAILY QUOTA (${quotaTarget}/${quotaTarget} CUPS) COMPLETE! +$${DAILY_QUOTA_COMPLETION_BONUS} BONUS!`
    : '';

  const scenerySync = syncSceneryMilestones(state.unlockedSceneries || ['busy_street'], newLifetimeGross);
  const sceneryUnlockSuffix =
    scenerySync.newlyUnlocked.length > 0
      ? ` · NEW SCENERY UNLOCKED: ${scenerySync.newlyUnlocked.map((s) => s.name).join(', ')}!`
      : '';
  const secretTipBadge = targetCustomer.isSecretNpc ? ' [2x Friendly Tip]' : '';

  const takeoutLabel = targetCustomer.isDeliveryRider
    ? ' (Delivery)'
    : isTakeoutOrder
    ? ' (Takeout)'
    : '';
  const speedBadge =
    payout.speedTipLabel && payout.speedTip > 0 ? ` · ${payout.speedTipLabel}` : '';
  const feedbackMsg = evaluation.isPerfect
    ? `Ding! ${targetCustomer.customerName} picked up Perfect ${recipe.name}${pastryBadge}${takeoutLabel}! +$${payout.totalPayout}${goldenBadge}${mikmikBadge}${deliveryBadge}${secretTipBadge}${speedBadge} (incl. $${payout.tip} tip)${quotaSuffix}${unlockSuffix}${sceneryUnlockSuffix}`
    : `Served ${recipe.name}${pastryBadge}${takeoutLabel} (${evaluation.accuracy}% match) to ${targetCustomer.customerName} for +$${payout.totalPayout}${goldenBadge}${mikmikBadge}${deliveryBadge}${secretTipBadge}.${quotaSuffix}${unlockSuffix}${sceneryUnlockSuffix}`;

  const anyCatOrCosmeticUnlock =
    catSync.newlyUnlocked.length > 0 || cosmeticSync.newlyUnlocked.length > 0;
  const combinedUnlockToast =
    catSync.unlockToast || cosmeticSync.toastMessage || state.lastCatUnlockToast;

  return {
    ...state,
    activeStation: 5,
    cash: newCash,
    lifetimeGrossIncome: newLifetimeGross,
    goldenEspressoUnlocked: isGoldenUnlocked,
    dailyRevenue: newDailyRevenue,
    quotaBonusAwarded: alreadyClaimedQuota || justCompletedQuota,
    dailyQuota: {
      dateKey: todayKey,
      cupsServedToday: newCupsToday,
      dailyCupQuota: quotaTarget,
      quotaBonusClaimed: alreadyClaimedQuota || justCompletedQuota,
    },
    cupsServedToday: newCupsToday,
    totalCupsServed: newTotalCups,
    satisfactionScore: newSatisfaction,
    waveCustomersRemaining: nextWaveRemaining,
    nextCustomerSpawnTimer: nextSpawnTimer,
    currentCup: createEmptyCup(),
    // Only consume preparedPastry if this order requested it!
    preparedPastry: reqPastry ? null : state.preparedPastry,
    preparedPastryCreatedAt: reqPastry ? null : state.preparedPastryCreatedAt,
    customers: updatedCustomers,
    equipmentSkins: updatedSkins,
    unlockedSceneries: scenerySync.unlockedSceneries,
    unlockedCats: catSync.unlockedCats,
    secretCatsUnlocked: catSync.secretCatsUnlocked,
    unlockedCosmetics: cosmeticSync.unlockedCosmetics,
    hasUnseenCatUnlock: anyCatOrCosmeticUnlock ? true : state.hasUnseenCatUnlock,
    tisayJustArrivedSeq: catSync.justUnlockedTisay
      ? (state.tisayJustArrivedSeq ?? 0) + 1
      : state.tisayJustArrivedSeq ?? 0,
    lastSecretServeSeq: targetCustomer.isSecretNpc
      ? (state.lastSecretServeSeq ?? 0) + 1
      : state.lastSecretServeSeq ?? 0,
    lastCatUnlockToast: combinedUnlockToast,
    lastCatUnlockSeq: anyCatOrCosmeticUnlock
      ? (state.lastCatUnlockSeq ?? 0) + 1
      : state.lastCatUnlockSeq ?? 0,
    pinnedOrderId: nextOrdering ? nextOrdering.id : null,
    lastActionFeedback: feedbackMsg,
  };
}

export function spawnCustomerOrder(
  day: number,
  seedOffset = 0,
  customPalette?: string[],
  rng: () => number = Math.random,
  activeScenery: SceneryId = 'busy_street'
): CustomerOrder {
  const unlockedRecipes = RECIPES.filter((r) => r.unlockDay <= Math.max(1, day));
  const tempBias = getSceneryDrinkTempBias(activeScenery);
  const wantHot = rng() < tempBias.hotWeight;
  const hotRecipes = unlockedRecipes.filter(
    (r) => !r.needsIce && r.category !== 'iced_coffee' && r.category !== 'cold_drink'
  );
  const icedRecipes = unlockedRecipes.filter(
    (r) => r.needsIce || r.category === 'iced_coffee' || r.category === 'cold_drink'
  );
  const pool = wantHot
    ? hotRecipes.length > 0
      ? hotRecipes
      : unlockedRecipes
    : icedRecipes.length > 0
    ? icedRecipes
    : unlockedRecipes;
  const idx = (day * 7 + seedOffset * 3 + Math.floor(rng() * 100)) % pool.length;
  const recipe = pool[idx] || RECIPES[0];
  const nameIdx =
    (day * 3 + seedOffset * 5 + Math.floor(rng() * 100)) % CUSTOMER_NAMES.length;
  const customerName = CUSTOMER_NAMES[nameIdx];

  let customNeedsIce: boolean | undefined = undefined;
  let customSyrup: SyrupFlavor | undefined = undefined;
  const customAddons: string[] = [];
  let customBonusTip = 2;

  const modRoll = (day + seedOffset + nameIdx) % 4;
  if (!wantHot && modRoll === 0 && !recipe.needsIce && recipe.id !== 'klasik-espresso') {
    customNeedsIce = true;
    customAddons.push('+Iced');
    customBonusTip = 3;
  } else if (modRoll === 1 && recipe.syrup === 'none' && recipe.category !== 'tea') {
    customSyrup = 'vanilla';
    customAddons.push('+Vanilla');
    customBonusTip = 3;
  } else if (modRoll === 2 && recipe.syrup === 'none' && recipe.category !== 'cold_drink') {
    customSyrup = 'caramel';
    customAddons.push('+Caramel');
    customBonusTip = 3;
  }

  if (recipe.needsTeaSteep) {
    customAddons.push('+Steeped Tea');
  }
  if (recipe.needsIce && !customAddons.includes('+Iced')) {
    customAddons.push('+Iced');
  }
  if (recipe.syrup !== 'none') {
    const sLabel =
      recipe.syrup === 'matcha'
        ? '+Matcha Whisk'
        : `+${recipe.syrup.charAt(0).toUpperCase() + recipe.syrup.slice(1)}`;
    if (!customAddons.includes(sLabel)) customAddons.push(sLabel);
  }
  if (customAddons.length === 0) {
    customAddons.push('+Extra Crema');
    customBonusTip = 2;
  }

  // Phase 6: ~40% chance for regular patrons to attach 1 random signature pastry
  const requestedPastry: PastryId | null =
    rng() < 0.4
      ? ALL_PASTRY_IDS[Math.floor(rng() * ALL_PASTRY_IDS.length) % ALL_PASTRY_IDS.length]
      : null;
  const pastrySpec = getPastryById(requestedPastry);

  const addonPhrase =
    customNeedsIce && customSyrup
      ? `iced, with an extra pump of ${customSyrup}`
      : customNeedsIce
      ? 'served over crystal ice'
      : customSyrup
      ? `with a splash of ${customSyrup} syrup`
      : recipe.category === 'tea'
      ? 'freshly steeped in the glass teapot'
      : recipe.category === 'cold_drink'
      ? 'extra refreshing over ice'
      : recipe.needsIce
      ? 'extra cold with fresh ice'
      : 'with silky 65°C microfoam';

  const orderType: OrderType = rng() < 0.38 ? 'takeout' : 'dine-in';
  const toGoSuffix = orderType === 'takeout' ? ' to go' : '';
  const pastryPhrase = pastrySpec ? ` plus a fresh ${pastrySpec.name}` : '';
  const greetings = [
    `Hey! Could I get a ${recipe.name}${toGoSuffix}—${addonPhrase}${pastryPhrase}?`,
    `That 1990 Miata MX-5 in the garage bay is iconic! Hit me with a ${recipe.name}${toGoSuffix}, ${addonPhrase}${pastryPhrase}!`,
    `Love the vinyl spinning today! Can I order a ${recipe.name}${toGoSuffix}, ${addonPhrase}${pastryPhrase}?`,
    `Hi there! One ${recipe.name}${toGoSuffix} please—${addonPhrase}${pastryPhrase}.`,
  ];
  const dialogueLine = greetings[(nameIdx + seedOffset) % greetings.length];
  const socialBehavior = SOCIAL_BEHAVIORS[(nameIdx + seedOffset) % SOCIAL_BEHAVIORS.length];
  const palette =
    customPalette && customPalette.length > 0
      ? customPalette
      : INITIAL_CUSTOMER_SKIN_PACKS[0].paletteColors;

  const moodDurationSec = rollMoodDurationSec(rng);

  return {
    id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    customerName,
    avatarColor: AVATAR_COLORS[nameIdx % AVATAR_COLORS.length],
    shirtColor: palette[(nameIdx + seedOffset) % palette.length],
    recipeId: recipe.id,
    orderType,
    orderAccepted: false,
    acceptedAt: null,
    mood: 100,
    moodDurationSec,
    moodExpired: false,
    patience: 100,
    maxPatience: 100,
    orderTimeLimitSec: moodDurationSec,
    orderTimeRemainingSec: moodDurationSec,
    timerStarted: false,
    state: 'ordering',
    seatIndex: null,
    seatedTimer: 0,
    dialogueLine,
    customAddons,
    customBonusTip,
    customNeedsIce,
    customSyrup,
    requestedPastry,
    isDeliveryRider: false,
    socialBehavior,
  };
}

const RIDER_VARIANT_CONFIG: Record<
  DeliveryRiderVariant,
  { label: string; names: readonly string[]; jacketHex: string }
> = {
  blue: { label: 'Blue Delivery', names: ['Marco', 'Ren', 'Leo'], jacketHex: '#2563eb' },
  green: { label: 'Green Delivery', names: ['Kai', 'Juno', 'Milo'], jacketHex: '#16a34a' },
  red: { label: 'Red Delivery', names: ['Rina', 'Dante', 'Saki'], jacketHex: '#dc2626' },
};

export function spawnDeliveryRiderOrder(
  day: number,
  seedOffset = 0,
  forcedVariant?: DeliveryRiderVariant,
  rng: () => number = Math.random,
  activeScenery: SceneryId = 'busy_street'
): CustomerOrder {
  const variants: readonly DeliveryRiderVariant[] = ['blue', 'green', 'red'];
  const variant =
    forcedVariant || variants[Math.floor(rng() * variants.length) % variants.length];
  const cfg = RIDER_VARIANT_CONFIG[variant];
  const baseOrder = spawnCustomerOrder(day, seedOffset, [cfg.jacketHex], rng, activeScenery);
  const pastryId: PastryId =
    baseOrder.requestedPastry ||
    ALL_PASTRY_IDS[Math.floor(rng() * ALL_PASTRY_IDS.length) % ALL_PASTRY_IDS.length];
  const pastrySpec = getPastryById(pastryId)!;
  const recipe = getRecipeById(baseOrder.recipeId);
  const riderName = cfg.names[Math.abs(seedOffset + day) % cfg.names.length];

  return {
    ...baseOrder,
    id: `rider-${variant}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    customerName: riderName,
    shirtColor: cfg.jacketHex,
    orderType: 'takeout',
    requestedPastry: pastryId,
    isDeliveryRider: true,
    riderVariant: variant,
    dialogueLine: `Delivery parked outside! ${cfg.label} pickup for ${recipe.name} (Takeout) + ${pastrySpec.name} in a Kraft Bag!`,
    socialBehavior: 'relaxing',
  };
}

export function markCustomerAtCounter(
  state: KlasikGameState,
  customerId: string
): KlasikGameState {
  let changed = false;
  const customers = state.customers.map((c) => {
    if (c.id === customerId && c.state === 'ordering' && !c.timerStarted) {
      changed = true;
      return { ...c, timerStarted: true };
    }
    return c;
  });
  return changed ? { ...state, customers } : state;
}

export function purchaseUpgrade(state: KlasikGameState, upgradeId: string): KlasikGameState {
  const target = state.upgrades.find((u) => u.id === upgradeId);
  if (!target || target.purchased || state.cash < target.cost) {
    return state;
  }

  const updatedUpgrades = state.upgrades.map((u) =>
    u.id === upgradeId ? { ...u, purchased: true } : u
  );

  return {
    ...state,
    cash: state.cash - target.cost,
    upgrades: updatedUpgrades,
    lastActionFeedback: `Installed ${target.name}! (${target.effectLabel})`,
  };
}

export function unlockOrEquipEquipmentSkin(
  state: KlasikGameState,
  skinId: MachineSkinId | GrinderSkinId | PitcherSkinId
): KlasikGameState {
  const skin = state.equipmentSkins.find((s) => s.id === skinId);
  if (!skin) return state;

  let nextCash = state.cash;
  let nextSkins = state.equipmentSkins;

  if (!skin.unlocked) {
    if (
      skin.grossIncomeRequirement &&
      state.lifetimeGrossIncome < skin.grossIncomeRequirement
    ) {
      return {
        ...state,
        lastActionFeedback: `Accumulate $${skin.grossIncomeRequirement.toLocaleString()} gross income to unlock ${skin.name}!`,
      };
    }
    if (state.cash < skin.cost) {
      return state;
    }
    nextCash -= skin.cost;
    nextSkins = state.equipmentSkins.map((s) =>
      s.id === skinId ? { ...s, unlocked: true } : s
    );
  }

  const nextMachine =
    skin.slot === 'machine' ? (skin.id as MachineSkinId) : state.equippedMachineSkin;
  const nextGrinder =
    skin.slot === 'grinder' ? (skin.id as GrinderSkinId) : state.equippedGrinderSkin;
  const nextPitcher =
    skin.slot === 'pitcher' ? (skin.id as PitcherSkinId) : state.equippedPitcherSkin;

  return {
    ...state,
    cash: nextCash,
    equipmentSkins: nextSkins,
    equippedMachineSkin: nextMachine,
    equippedGrinderSkin: nextGrinder,
    equippedPitcherSkin: nextPitcher,
    lastActionFeedback:
      skin.id === 'golden-espresso-machine'
        ? 'Equipped 24K GOLDEN ESPRESSO MACHINE! All drink sale income is now DOUBLED (2x)!'
        : `Equipped ${skin.name} on your 3D counter!`,
  };
}

export function unlockOrEquipCustomerSkinPack(
  state: KlasikGameState,
  packId: CustomerSkinPackId
): KlasikGameState {
  const pack = state.customerSkinPacks.find((p) => p.id === packId);
  if (!pack) return state;

  let nextCash = state.cash;
  let nextPacks = state.customerSkinPacks;

  if (!pack.unlocked) {
    if (state.cash < pack.cost) return state;
    nextCash -= pack.cost;
    nextPacks = state.customerSkinPacks.map((p) =>
      p.id === packId ? { ...p, unlocked: true } : p
    );
  }

  // Recolor active customers to immediately showcase the selected outfit pack
  const updatedCustomers = state.customers.map((c, idx) => ({
    ...c,
    shirtColor: pack.paletteColors[idx % pack.paletteColors.length],
  }));

  return {
    ...state,
    cash: nextCash,
    customerSkinPacks: nextPacks,
    activeCustomerSkinPack: packId,
    customers: updatedCustomers,
    lastActionFeedback: `Equipped ${pack.name} outfits for cafe patrons!`,
  };
}

export function syncDailyQuotaForDate(
  state: KlasikGameState,
  now: Date = new Date()
): KlasikGameState {
  const todayKey = getLocalDateKey(now);
  const curQuota = state.dailyQuota || {
    dateKey: todayKey,
    cupsServedToday: state.cupsServedToday,
    dailyCupQuota: DAILY_REALTIME_CUP_QUOTA,
    quotaBonusClaimed: state.quotaBonusAwarded,
  };
  const curLogin = state.dailyLogin || {
    lastClaimDateKey: null,
    lastClaimTimestamp: null,
    streakDay: Math.max(1, Math.min(7, state.loginStreakDays || 1)),
    claimedToday: false,
  };
  const nextClaimedToday = curLogin.lastClaimDateKey === todayKey;
  const quotaChanged = curQuota.dateKey !== todayKey;
  const loginFlagChanged = curLogin.claimedToday !== nextClaimedToday;

  if (!quotaChanged && !loginFlagChanged) {
    return state;
  }

  return {
    ...state,
    ...(quotaChanged
      ? {
          day: state.day + 1,
          dailyRevenue: 0,
          cupsServedToday: 0,
          quotaBonusAwarded: false,
          dailyOrderQuota: DAILY_REALTIME_CUP_QUOTA,
          dailyQuota: {
            dateKey: todayKey,
            cupsServedToday: 0,
            dailyCupQuota: DAILY_REALTIME_CUP_QUOTA,
            quotaBonusClaimed: false,
          },
          lastActionFeedback: `Midnight rolled over! Fresh 24h Owner Quota ready (0 / ${DAILY_REALTIME_CUP_QUOTA} Cups).`,
        }
      : {}),
    dailyLogin: {
      ...curLogin,
      claimedToday: nextClaimedToday,
    },
  };
}

export function applyWeatherPreferences(
  state: KlasikGameState,
  timeOfDayMode: TimeOfDayMode,
  rainPreference: RainPreference,
  now: Date = new Date(),
  rolledRain?: boolean
): KlasikGameState {
  const activeScenery: SceneryId = state.activeScenery || 'busy_street';
  const clampedPref = clampRainPreferenceForScenery(activeScenery, rainPreference);
  const resolvedTime = resolveTimeOfDay(timeOfDayMode, now);
  const alwaysWinter = isAlwaysWinterScenery(activeScenery);
  const isSnowing = alwaysWinter || (clampedPref === 'snow' && isSnowAllowedForScenery(activeScenery));
  const isRaining =
    isSnowing
      ? false
      : clampedPref === 'rain'
      ? true
      : clampedPref === 'clear'
      ? false
      : rolledRain !== undefined
      ? rolledRain
      : state.isRaining;
  const weather = resolveCompositeWeather(resolvedTime, isRaining);
  const climateState = resolveClimateState(activeScenery, clampedPref, isSnowing);
  return {
    ...state,
    timeOfDayMode,
    rainPreference: clampedPref,
    isRaining,
    isSnowing,
    climateState,
    weather,
  };
}

export function purchaseOrEquipScenery(
  state: KlasikGameState,
  sceneryId: SceneryId,
  now: Date = new Date()
): KlasikGameState {
  const spec = getScenerySpec(sceneryId);
  const unlockedList = state.unlockedSceneries || ['busy_street'];
  const alreadyUnlocked = unlockedList.includes(sceneryId);
  let nextCash = state.cash;
  let nextUnlocked = unlockedList;

  if (!alreadyUnlocked) {
    if (spec.revenueMilestone > 0) {
      if ((state.lifetimeGrossIncome || 0) < spec.revenueMilestone) {
        return {
          ...state,
          lastActionFeedback: `Reach $${spec.revenueMilestone.toLocaleString()} total revenue to unlock ${spec.name}!`,
        };
      }
      nextUnlocked = [...unlockedList, sceneryId];
    } else {
      if (state.cash < spec.cost) {
        return {
          ...state,
          lastActionFeedback: `Need $${spec.cost.toLocaleString()} to unlock ${spec.name}.`,
        };
      }
      nextCash -= spec.cost;
      nextUnlocked = [...unlockedList, sceneryId];
    }
  }

  // Enforce Weather Exclusivity & Auto-Clamp rules on scenery switch
  const nextRainPref = clampRainPreferenceForScenery(sceneryId, state.rainPreference);
  const withScenery: KlasikGameState = {
    ...state,
    cash: nextCash,
    activeScenery: sceneryId,
    unlockedSceneries: nextUnlocked,
  };
  const weatherAdjusted = applyWeatherPreferences(
    withScenery,
    withScenery.timeOfDayMode,
    nextRainPref,
    now,
    withScenery.isRaining
  );

  return {
    ...weatherAdjusted,
    lastActionFeedback: !alreadyUnlocked
      ? `Unlocked & moved cafe to ${spec.name}!`
      : `Relocated cafe view to ${spec.name}.`,
  };
}

export function purchasePatronOutfit(
  state: KlasikGameState,
  outfitId: PatronOutfitId
): KlasikGameState {
  const spec = getPatronOutfitSpec(outfitId);
  if (!spec) return state;
  const unlocked = state.unlockedPatronOutfits || [];
  if (unlocked.includes(outfitId)) {
    return state;
  }
  if (state.cash < spec.cost) {
    return {
      ...state,
      lastActionFeedback: `Need $${spec.cost.toLocaleString()} to unlock ${spec.name}.`,
    };
  }
  const nextUnlocked = [...unlocked, outfitId];
  const nextEnabled = state.enabledCustomPatronOutfits?.includes(outfitId)
    ? state.enabledCustomPatronOutfits
    : [...(state.enabledCustomPatronOutfits || []), outfitId];
  return {
    ...state,
    cash: state.cash - spec.cost,
    unlockedPatronOutfits: nextUnlocked,
    enabledCustomPatronOutfits: nextEnabled,
    lastActionFeedback: `Unlocked ${spec.name} for cafe patrons!`,
  };
}

export function setPatronOutfitMode(
  state: KlasikGameState,
  mode: PatronOutfitMode
): KlasikGameState {
  return {
    ...state,
    patronOutfitMode: mode,
    patronOutfitAutoMatch: mode === 'auto_match',
    lastActionFeedback:
      mode === 'auto_match'
        ? 'Patron outfits set to Auto-Match Scenery.'
        : mode === 'custom_mix'
        ? 'Patron outfits set to Custom Mix.'
        : 'Patron outfits set to Manual Single Equip.',
  };
}

export function equipManualPatronOutfit(
  state: KlasikGameState,
  outfitId: PatronOutfitId | null
): KlasikGameState {
  if (outfitId !== null) {
    const unlocked = state.unlockedPatronOutfits || [];
    if (!unlocked.includes(outfitId)) return state;
  }
  const spec = outfitId ? getPatronOutfitSpec(outfitId) : null;
  return {
    ...state,
    patronOutfitMode: 'manual',
    patronOutfitAutoMatch: false,
    equippedPatronOutfitId: outfitId,
    lastActionFeedback: spec
      ? `Equipped ${spec.name} for all patrons (indoor & outdoor).`
      : 'Equipped Standard Casual outfits for patrons.',
  };
}

export function setPatronOutfitAutoMatch(
  state: KlasikGameState,
  autoMatch: boolean
): KlasikGameState {
  return setPatronOutfitMode(state, autoMatch ? 'auto_match' : 'custom_mix');
}

export function toggleCustomPatronOutfit(
  state: KlasikGameState,
  outfitId: PatronOutfitId
): KlasikGameState {
  const unlocked = state.unlockedPatronOutfits || [];
  if (!unlocked.includes(outfitId)) return state;
  const current = state.enabledCustomPatronOutfits || [];
  const exists = current.includes(outfitId);
  const next = exists ? current.filter((id) => id !== outfitId) : [...current, outfitId];
  return {
    ...state,
    patronOutfitMode: 'custom_mix',
    patronOutfitAutoMatch: false,
    enabledCustomPatronOutfits: next,
  };
}

export function canClaimLoginReward(
  state: KlasikGameState,
  now: Date = new Date()
): boolean {
  const todayKey = getLocalDateKey(now);
  const lastKey = state.dailyLogin?.lastClaimDateKey ?? null;
  return lastKey !== todayKey;
}

export function claimLoginReward(
  state: KlasikGameState,
  rewardDay?: number,
  now: Date = new Date()
): KlasikGameState {
  const todayKey = getLocalDateKey(now);
  const curLogin = state.dailyLogin || {
    lastClaimDateKey: null,
    lastClaimTimestamp: null,
    streakDay: 1,
    claimedToday: false,
  };

  // Strict 24-hour real-calendar enforcement: max 1 claim per local calendar day!
  if (!canClaimLoginReward(state, now)) {
    return {
      ...state,
      dailyLogin: { ...curLogin, claimedToday: true },
      lastActionFeedback: `Already claimed today's reward! ${getTimeUntilMidnightLabel(now)}`,
    };
  }

  // Compute next real-calendar streak day (1..7 repeating weekly cycle)
  let nextStreakDay = 1;
  if (curLogin.lastClaimDateKey) {
    const diffDays = getCalendarDayDiff(curLogin.lastClaimDateKey, todayKey);
    if (diffDays === 1) {
      nextStreakDay = (curLogin.streakDay % 7) + 1;
    } else if (diffDays > 1) {
      nextStreakDay = 1;
    } else {
      nextStreakDay = curLogin.streakDay;
    }
  } else {
    nextStreakDay = rewardDay ? Math.max(1, Math.min(7, rewardDay)) : curLogin.streakDay || 1;
  }

  const targetDay = rewardDay ?? nextStreakDay;
  const reward =
    state.loginRewards.find((r) => r.day === targetDay) ||
    state.loginRewards.find((r) => r.day === nextStreakDay) ||
    state.loginRewards[0];
  if (!reward) return state;

  // Reset weekly reward claim flags cleanly when looping back to Day 1 after completing Day 7
  const resetWeekly = nextStreakDay === 1 && curLogin.streakDay === 7;
  const updatedRewards = state.loginRewards.map((r) =>
    r.day === reward.day ? { ...r, claimed: true } : resetWeekly ? { ...r, claimed: false } : r
  );

  const newCash = state.cash + reward.cashBonus;
  const newGross = (state.lifetimeGrossIncome || 0) + (reward.grossIncomeBonus || 0);

  let updatedSkins = syncGrossIncomeUnlocks(state.equipmentSkins, newGross);
  let updatedPacks = state.customerSkinPacks;
  let equippedMachine = state.equippedMachineSkin;
  let equippedGrinder = state.equippedGrinderSkin;
  let equippedPitcher = state.equippedPitcherSkin;
  let activePackId = state.activeCustomerSkinPack;
  let updatedCustomers = state.customers;

  if (reward.unlockSkinId) {
    updatedSkins = updatedSkins.map((s) =>
      s.id === reward.unlockSkinId ? { ...s, unlocked: true } : s
    );
    updatedPacks = updatedPacks.map((p) =>
      p.id === reward.unlockSkinId ? { ...p, unlocked: true } : p
    );

    const matchedEquipSkin = updatedSkins.find((s) => s.id === reward.unlockSkinId);
    if (matchedEquipSkin) {
      if (matchedEquipSkin.slot === 'machine') {
        equippedMachine = matchedEquipSkin.id as MachineSkinId;
      } else if (matchedEquipSkin.slot === 'grinder') {
        equippedGrinder = matchedEquipSkin.id as GrinderSkinId;
      } else if (matchedEquipSkin.slot === 'pitcher') {
        equippedPitcher = matchedEquipSkin.id as PitcherSkinId;
      }
    }

    const matchedCustPack = updatedPacks.find((p) => p.id === reward.unlockSkinId);
    if (matchedCustPack) {
      activePackId = matchedCustPack.id;
      updatedCustomers = state.customers.map((c, idx) => ({
        ...c,
        shirtColor: matchedCustPack.paletteColors[idx % matchedCustPack.paletteColors.length],
      }));
    }
  }

  const isGoldenUnlocked =
    Boolean(state.goldenEspressoUnlocked) || newGross >= GOLDEN_MACHINE_GROSS_THRESHOLD;
  const catSync = syncCatUnlocks(state.unlockedCats, newGross, isGoldenUnlocked);
  const cosmeticSync = syncCatCosmeticMilestones(
    state.unlockedCosmetics,
    newGross,
    isGoldenUnlocked
  );
  const anyUnlock = catSync.newlyUnlocked.length > 0 || cosmeticSync.newlyUnlocked.length > 0;

  return {
    ...state,
    cash: newCash,
    lifetimeGrossIncome: newGross,
    goldenEspressoUnlocked: isGoldenUnlocked,
    loginRewards: updatedRewards,
    loginStreakDays: nextStreakDay,
    dailyLogin: {
      lastClaimDateKey: todayKey,
      lastClaimTimestamp: now.getTime(),
      streakDay: nextStreakDay,
      claimedToday: true,
    },
    equipmentSkins: updatedSkins,
    customerSkinPacks: updatedPacks,
    equippedMachineSkin: equippedMachine,
    equippedGrinderSkin: equippedGrinder,
    equippedPitcherSkin: equippedPitcher,
    activeCustomerSkinPack: activePackId,
    customers: updatedCustomers,
    unlockedCats: catSync.unlockedCats,
    secretCatsUnlocked: catSync.secretCatsUnlocked,
    unlockedCosmetics: cosmeticSync.unlockedCosmetics,
    hasUnseenCatUnlock: anyUnlock ? true : state.hasUnseenCatUnlock,
    tisayJustArrivedSeq: catSync.justUnlockedTisay
      ? (state.tisayJustArrivedSeq ?? 0) + 1
      : state.tisayJustArrivedSeq ?? 0,
    lastCatUnlockToast: catSync.unlockToast || cosmeticSync.toastMessage || state.lastCatUnlockToast,
    lastCatUnlockSeq: anyUnlock ? (state.lastCatUnlockSeq ?? 0) + 1 : state.lastCatUnlockSeq ?? 0,
    lastActionFeedback: `Claimed Day ${nextStreakDay} Daily Reward: ${reward.title}! (${reward.rewardLabel})`,
  };
}

export function reachGoldenMachineMilestone(state: KlasikGameState): KlasikGameState {
  const newGross = Math.max(state.lifetimeGrossIncome, GOLDEN_MACHINE_GROSS_THRESHOLD);
  const updatedSkins = state.equipmentSkins.map((s) =>
    s.id === 'golden-espresso-machine' ? { ...s, unlocked: true } : s
  );
  const catSync = syncCatUnlocks(state.unlockedCats, newGross, true);
  const cosmeticSync = syncCatCosmeticMilestones(state.unlockedCosmetics, newGross, true);
  const anyUnlock = catSync.newlyUnlocked.length > 0 || cosmeticSync.newlyUnlocked.length > 0;

  return {
    ...state,
    lifetimeGrossIncome: newGross,
    goldenEspressoUnlocked: true,
    equipmentSkins: updatedSkins,
    equippedMachineSkin: 'golden-espresso-machine',
    unlockedCats: catSync.unlockedCats,
    secretCatsUnlocked: catSync.secretCatsUnlocked,
    unlockedCosmetics: cosmeticSync.unlockedCosmetics,
    hasUnseenCatUnlock: anyUnlock ? true : state.hasUnseenCatUnlock,
    tisayJustArrivedSeq: catSync.justUnlockedTisay
      ? (state.tisayJustArrivedSeq ?? 0) + 1
      : state.tisayJustArrivedSeq ?? 0,
    lastCatUnlockToast: catSync.unlockToast || cosmeticSync.toastMessage || state.lastCatUnlockToast,
    lastCatUnlockSeq: anyUnlock ? (state.lastCatUnlockSeq ?? 0) + 1 : state.lastCatUnlockSeq ?? 0,
    lastActionFeedback:
      '$50,000 Gross Income Milestone Reached! 24K Golden Espresso Machine Equipped (2x Sale Income)!',
  };
}

export interface SimulationTickOptions {
  modalOpen?: boolean;
  isRecipeBookOpen?: boolean;
  catStationOpen?: boolean;
  outdoorOverlookOpen?: boolean;
  isSecretPasserbyActive?: boolean;
  activeArrivingCount?: number;
  rng?: () => number;
}

export function advanceSimulationTick(
  state: KlasikGameState,
  dtSeconds: number,
  options: SimulationTickOptions = {}
): KlasikGameState {
  if (state.phase !== 'playing') return state;
  // Pause countdowns completely while informational modals (Settings/Upgrades/Customize/Audio/etc.) are open
  if (
    options.modalOpen &&
    !options.isRecipeBookOpen &&
    !options.catStationOpen &&
    !options.outdoorOverlookOpen
  ) {
    return state;
  }

  const rng = options.rng || Math.random;
  const dt = Math.min(Math.max(0, dtSeconds), 0.3);
  const hasPidBoiler = state.upgrades.some((u) => u.id === 'dual-pid-boiler' && u.purchased);
  const hasBonsai = state.upgrades.some((u) => u.id === 'japanese-bonsai-terrarium' && u.purchased);
  const upgradeGrace = hasPidBoiler && hasBonsai ? 0.85 : hasPidBoiler ? 0.92 : 1.0;
  // Gentle 0.35x slow-mo grace while checking Recipe Book; paused completely in Zen Mode, Cat Station, Go Outside Mode, or with Lilo equipped
  const modalTimeScale = options.isRecipeBookOpen ? 0.35 : 1.0;
  const equippedCat = getCafeCatSpec(state.equippedCatId);
  const isLiloActive = Boolean(equippedCat.disablesMoodMeter);
  const catMoodDrainMult = equippedCat.moodDrainMultiplier ?? 1.0;
  const moodTickScale =
    state.mode === 'zen' ||
    isLiloActive ||
    options.catStationOpen ||
    options.outdoorOverlookOpen
      ? 0
      : upgradeGrace * modalTimeScale * catMoodDrainMult;

  let bonusTableTip = 0;
  let tipMessage: string | null = null;
  let nextSatisfaction = state.satisfactionScore;
  let nextMissedOrders = state.missedOrders ?? 0;
  let nextExpiredSeq = state.lastExpiredEventSeq ?? 0;
  let nextExpiredName: string | null = state.lastExpiredCustomerName ?? null;

  const nextCustomers: CustomerOrder[] = [];
  for (const cust of state.customers) {
    if (cust.state === 'ordering') {
      const durationSec = Math.max(60, Math.min(120, cust.moodDurationSec || cust.orderTimeLimitSec || 90));
      const curMood =
        typeof cust.mood === 'number'
          ? Math.max(0, Math.min(100, cust.mood))
          : Math.max(0, Math.min(100, cust.patience ?? 100));

      // Phase 1 Order Queueing: Unaccepted orders wait calmly at 100% mood with ZERO decay!
      // Also lock mood at 100% when Lilo is equipped or in Zen Mode.
      if (!cust.orderAccepted || isLiloActive || state.mode === 'zen') {
        const keptMood = !cust.orderAccepted || isLiloActive ? 100 : curMood;
        const keptRemaining = (keptMood / 100) * durationSec;
        nextCustomers.push({
          ...cust,
          mood: keptMood,
          moodDurationSec: durationSec,
          patience: keptMood,
          orderTimeLimitSec: durationSec,
          orderTimeRemainingSec: keptRemaining,
        });
        continue;
      }

      const secretPatienceMult = cust.isSecretNpc ? SECRET_NPC_PATIENCE_DRAIN_MULT : 1.0;
      const baseDrainPerSec = 100 / durationSec;
      const nextMood = Math.max(
        0,
        curMood - dt * baseDrainPerSec * moodTickScale * secretPatienceMult
      );
      const nextRemaining = (nextMood / 100) * durationSec;

      if (nextMood <= 0) {
        nextSatisfaction = Math.max(0, nextSatisfaction - 8);
        nextMissedOrders += 1;
        nextExpiredSeq += 1;
        nextExpiredName = cust.customerName;
        tipMessage = `${cust.customerName} left dissatisfied ($0)`;
        nextCustomers.push({
          ...cust,
          mood: 0,
          moodDurationSec: durationSec,
          moodExpired: true,
          patience: 0,
          orderTimeLimitSec: durationSec,
          orderTimeRemainingSec: 0,
          expired: true,
          state: 'departing',
          seatedTimer: cust.isDeliveryRider ? 16 : 7.5,
        });
      } else {
        nextCustomers.push({
          ...cust,
          mood: nextMood,
          moodDurationSec: durationSec,
          patience: nextMood,
          orderTimeLimitSec: durationSec,
          orderTimeRemainingSec: nextRemaining,
        });
      }
    } else if (cust.state === 'seated') {
      const remaining = cust.seatedTimer - dt;
      if (remaining <= 0) {
        const multiplier = state.equippedMachineSkin === 'golden-espresso-machine' ? 2 : 1;
        const tipAmt = 3 * multiplier;
        bonusTableTip += tipAmt;
        tipMessage =
          cust.socialBehavior === 'car_selfie'
            ? `${cust.customerName} snapped a selfie with the 1990 Miata MX-5 and left a +$${tipAmt} tip!`
            : `${cust.customerName} loved the Garage Garden vibe and left a +$${tipAmt} table tip!`;
        // Phase 1.1: Dine-in customer stands up cleanly (LEAVING_TABLE) & walks out the doorway before despawning!
        nextCustomers.push({
          ...cust,
          state: 'departing',
          leavingTable: true,
          seatedTimer: 16,
        });
      } else {
        nextCustomers.push({
          ...cust,
          seatedTimer: remaining,
        });
      }
    } else if (cust.state === 'departing') {
      const remaining = cust.seatedTimer - dt;
      if (remaining > 0) {
        nextCustomers.push({
          ...cust,
          seatedTimer: remaining,
        });
      }
    }
  }

  const activePack =
    state.customerSkinPacks.find((p) => p.id === state.activeCustomerSkinPack) ||
    INITIAL_CUSTOMER_SKIN_PACKS[0];

  // Phase 1.2: 50%–80% Delivery Rider Encounter Rate + Pity Cap + Max-2 Active Parked Scooters Cap
  const orderingCount = nextCustomers.filter((c) => c.state === 'ordering').length;
  const arrivingUnstartedCount = nextCustomers.filter(
    (c) => c.state === 'ordering' && !c.timerStarted
  ).length;
  const activeArrivingCount =
    options.activeArrivingCount !== undefined ? options.activeArrivingCount : arrivingUnstartedCount;
  let activeDeliveryRiderCount = nextCustomers.filter((c) => Boolean(c.isDeliveryRider)).length;
  let regularSinceRider = state.regularCustomersSinceLastRider ?? 0;
  let waveRemaining = state.waveCustomersRemaining ?? 2;
  let spawnTimer = (state.nextCustomerSpawnTimer ?? 5) - dt;
  let nextSecretNameIdx = normalizeSecretNpcNameIdx(state.secretNpcNameIdx ?? 0);
  let nextSecretCooldown = Math.max(0, (state.secretNpcCooldownRemaining ?? 0) - dt);
  let isSecretActiveNow =
    Boolean(options.isSecretPasserbyActive) ||
    nextCustomers.some((c) => Boolean(c.isSecretNpc));
  const climateState: ClimateState =
    state.climateState ||
    resolveClimateState(state.activeScenery || 'busy_street', state.rainPreference, state.isSnowing);

  const attachPatronOutfit = (order: CustomerOrder): CustomerOrder => {
    if (order.isSecretNpc || order.isDeliveryRider) return order;
    const mode: PatronOutfitMode =
      state.patronOutfitMode ?? (state.patronOutfitAutoMatch ? 'auto_match' : 'manual');
    const resolved = resolveActivePatronOutfit({
      activeScenery: state.activeScenery || 'busy_street',
      climateState,
      unlockedPatronOutfits: state.unlockedPatronOutfits || [],
      mode,
      equippedOutfitId: state.equippedPatronOutfitId ?? null,
      enabledCustomMixIds: state.enabledCustomPatronOutfits || [],
      isSecretNpc: Boolean(order.isSecretNpc),
      rng,
    });
    return {
      ...order,
      patronOutfitId: resolved.outfitId,
      patronOutfitClimate: resolved.climateVariant,
    };
  };

  const makeSecretVariant = (baseOrder: CustomerOrder): CustomerOrder => {
    const secretName = getSecretNpcName(nextSecretNameIdx);
    nextSecretNameIdx = advanceSecretNpcNameIdx(nextSecretNameIdx);
    nextSecretCooldown = SECRET_NPC_COOLDOWN_SEC;
    isSecretActiveNow = true;
    const appearance = resolveSecretNpcAppearance(climateState, Boolean(state.isRaining), rng);
    const warmDialogue =
      SECRET_NPC_DIALOGUES[Math.floor(rng() * SECRET_NPC_DIALOGUES.length) % SECRET_NPC_DIALOGUES.length];
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SECRET_NPC_STORAGE_KEY, String(nextSecretNameIdx));
      } catch {
        // ignore storage errors
      }
    }
    return {
      ...baseOrder,
      customerName: secretName,
      avatarColor: '#C6936B',
      shirtColor: appearance.wearsCharcoalTee ? '#595B60' : '#1C1C20',
      isSecretNpc: true,
      secretNpcAppearance: appearance,
      patronOutfitId: null,
      dialogueLine: warmDialogue,
    };
  };

  const activeSceneryId: SceneryId = state.activeScenery || 'busy_street';
  const spawnNextPatron = (seedOffset: number): CustomerOrder => {
    const riderProb = computeDeliveryRiderProbability(state.weather, regularSinceRider);
    const canSpawnRider =
      activeDeliveryRiderCount < MAX_ACTIVE_DELIVERY_RIDERS && rng() < riderProb;
    if (canSpawnRider) {
      regularSinceRider = 0;
      activeDeliveryRiderCount += 1;
      const riderOrder = spawnDeliveryRiderOrder(
        state.day,
        seedOffset,
        undefined,
        rng,
        activeSceneryId
      );
      if (
        canSpawnSecretNpc({
          role: 'rider',
          isSecretNpcActive: isSecretActiveNow,
          cooldownRemainingSec: nextSecretCooldown,
          rng,
        })
      ) {
        return makeSecretVariant(riderOrder);
      }
      return riderOrder;
    }
    regularSinceRider += 1;
    const custOrder = spawnCustomerOrder(
      state.day,
      seedOffset,
      activePack.paletteColors,
      rng,
      activeSceneryId
    );
    if (
      canSpawnSecretNpc({
        role: 'customer',
        isSecretNpcActive: isSecretActiveNow,
        cooldownRemainingSec: nextSecretCooldown,
        rng,
      })
    ) {
      return makeSecretVariant(custOrder);
    }
    return attachPatronOutfit(custOrder);
  };

  if (
    orderingCount < MAX_QUEUE &&
    waveRemaining > 0 &&
    spawnTimer <= 0 &&
    activeArrivingCount < 1
  ) {
    const newlyArrived = spawnNextPatron(
      nextCustomers.length + Math.floor(state.activeShiftSeconds || 0)
    );
    nextCustomers.push(newlyArrived);
    waveRemaining -= 1;
    spawnTimer = Math.max(MIN_ARRIVAL_GAP_SEC, waveRemaining > 0 ? 5.0 : 12.0);
    if (!tipMessage) {
      tipMessage = newlyArrived.isDeliveryRider
        ? `🛵 ${newlyArrived.customerName} (${newlyArrived.riderVariant?.toUpperCase()} Delivery) parked a scooter outside!`
        : `${newlyArrived.customerName} walked in through the Garage Garden door!`;
    }
  } else if (
    orderingCount === 0 &&
    waveRemaining <= 0 &&
    spawnTimer <= 0 &&
    activeArrivingCount < 1
  ) {
    const firstOfNewWave = spawnNextPatron(nextCustomers.length + 1);
    nextCustomers.push(firstOfNewWave);
    waveRemaining = 2;
    spawnTimer = Math.max(MIN_ARRIVAL_GAP_SEC, 5.0);
    if (!tipMessage) {
      tipMessage = firstOfNewWave.isDeliveryRider
        ? `🛵 ${firstOfNewWave.customerName} (${firstOfNewWave.riderVariant?.toUpperCase()} Delivery) pulled up outside!`
        : `New wave arriving: ${firstOfNewWave.customerName} walked in!`;
    }
  }

  // Phase 1 V2: Continuous real-time 24-hour owner loop — NEVER forcibly end the game after 5 minutes!
  const nextShiftTime = state.shiftTimeRemaining;
  const nextPhase: GamePhase = state.phase;

  const pinnedExists = nextCustomers.some(
    (c) => c.id === state.pinnedOrderId && c.state === 'ordering'
  );
  const fallbackOrder =
    nextCustomers.find((c) => c.state === 'ordering' && c.orderAccepted) ||
    nextCustomers.find((c) => c.state === 'ordering');

  const newLifetimeGross = (state.lifetimeGrossIncome || 0) + bonusTableTip;
  const updatedSkins =
    bonusTableTip > 0
      ? syncGrossIncomeUnlocks(state.equipmentSkins, newLifetimeGross)
      : state.equipmentSkins;
  const catSync =
    bonusTableTip > 0
      ? syncCatUnlocks(state.unlockedCats, newLifetimeGross)
      : { unlockedCats: state.unlockedCats || ['champy'], newlyUnlocked: [], unlockToast: null };

  const scenerySync =
    bonusTableTip > 0
      ? syncSceneryMilestones(state.unlockedSceneries || ['busy_street'], newLifetimeGross)
      : { unlockedSceneries: state.unlockedSceneries || ['busy_street'], newlyUnlocked: [] };

  return {
    ...state,
    phase: nextPhase,
    cash: state.cash + bonusTableTip,
    lifetimeGrossIncome: newLifetimeGross,
    dailyRevenue: state.dailyRevenue + bonusTableTip,
    satisfactionScore: nextSatisfaction,
    missedOrders: nextMissedOrders,
    lastExpiredCustomerName: nextExpiredName,
    lastExpiredEventSeq: nextExpiredSeq,
    equipmentSkins: updatedSkins,
    unlockedSceneries: scenerySync.unlockedSceneries,
    unlockedCats: catSync.unlockedCats,
    lastCatUnlockToast: catSync.unlockToast || state.lastCatUnlockToast,
    lastCatUnlockSeq:
      catSync.newlyUnlocked.length > 0
        ? (state.lastCatUnlockSeq ?? 0) + 1
        : state.lastCatUnlockSeq ?? 0,
    shiftTimeRemaining: nextShiftTime,
    activeShiftSeconds: (state.activeShiftSeconds ?? 0) + dt,
    waveCustomersRemaining: waveRemaining,
    nextCustomerSpawnTimer: Math.max(0, spawnTimer),
    regularCustomersSinceLastRider: regularSinceRider,
    secretNpcNameIdx: nextSecretNameIdx,
    secretNpcCooldownRemaining: nextSecretCooldown,
    customers: nextCustomers,
    pinnedOrderId: pinnedExists ? state.pinnedOrderId : fallbackOrder ? fallbackOrder.id : null,
    lastActionFeedback: tipMessage || state.lastActionFeedback,
  };
}

export function startNextDayShift(state: KlasikGameState): KlasikGameState {
  const todayKey = getLocalDateKey(new Date());
  const nextDay = state.day + 1;
  const nextQuota = DAILY_REALTIME_CUP_QUOTA;
  const nextGoal = getDailyRevenueGoal(nextDay);
  const activePack =
    state.customerSkinPacks.find((p) => p.id === state.activeCustomerSkinPack) ||
    INITIAL_CUSTOMER_SKIN_PACKS[0];

  const c1 = spawnCustomerOrder(
    nextDay,
    1,
    activePack.paletteColors,
    Math.random,
    state.activeScenery || 'busy_street'
  );

  return {
    ...state,
    phase: 'playing',
    activeStation: 2,
    day: nextDay,
    dailyRevenue: 0,
    dailyGoal: nextGoal,
    dailyOrderQuota: nextQuota,
    quotaBonusAwarded: false,
    dailyQuota: {
      dateKey: todayKey,
      cupsServedToday: 0,
      dailyCupQuota: nextQuota,
      quotaBonusClaimed: false,
    },
    cupsServedToday: 0,
    shiftTimeRemaining: SHIFT_SECONDS,
    waveCustomersRemaining: 2,
    nextCustomerSpawnTimer: 5,
    currentCup: createEmptyCup(),
    preparedPastry: null,
    customers: [c1],
    pinnedOrderId: c1.id,
    lastActionFeedback: `Entered Store! Daily Quota: ${nextQuota} Cups Today`,
  };
}

const SAVE_STORAGE_KEY = 'klasik3d_garage_garden_save_v1';

export function saveGameToStorage(state: KlasikGameState): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = exportSaveJson(state);
    window.localStorage.setItem(SAVE_STORAGE_KEY, payload);
  } catch {
    // ignore storage errors
  }
}

export function loadGameFromStorage(): KlasikGameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    return importSaveJson(raw);
  } catch {
    return null;
  }
}

export function exportSaveJson(state: KlasikGameState): string {
  return JSON.stringify(
    {
      version: '2.2.0',
      studio: 'BoostedByCaffeine Studios',
      timestamp: new Date().toISOString(),
      data: {
        day: state.day,
        cash: state.cash,
        lifetimeGrossIncome: state.lifetimeGrossIncome,
        dailyGoal: state.dailyGoal,
        dailyOrderQuota: state.dailyOrderQuota,
        dailyQuota: state.dailyQuota,
        dailyLogin: state.dailyLogin,
        cupsServedToday: state.cupsServedToday,
        quotaBonusAwarded: state.quotaBonusAwarded,
        totalCupsServed: state.totalCupsServed,
        activeShiftSeconds: state.activeShiftSeconds ?? 0,
        satisfactionScore: state.satisfactionScore,
        weather: state.weather,
        timeOfDayMode: state.timeOfDayMode,
        rainPreference: state.rainPreference,
        isRaining: state.isRaining,
        isSnowing: Boolean(state.isSnowing),
        climateState: state.climateState || 'summer',
        activeScenery: state.activeScenery || 'busy_street',
        unlockedSceneries: state.unlockedSceneries || ['busy_street'],
        unlockedPatronOutfits: state.unlockedPatronOutfits || [],
        patronOutfitMode: state.patronOutfitMode || 'manual',
        equippedPatronOutfitId: state.equippedPatronOutfitId ?? null,
        patronOutfitAutoMatch: state.patronOutfitAutoMatch ?? false,
        enabledCustomPatronOutfits: state.enabledCustomPatronOutfits || [],
        klasik_secret_name_idx: normalizeSecretNpcNameIdx(state.secretNpcNameIdx ?? 0),
        graphicsQuality: state.graphicsQuality,
        realismMode: Boolean(state.realismMode),
        regularCustomersSinceLastRider: state.regularCustomersSinceLastRider ?? 3,
        upgrades: state.upgrades,
        equipmentSkins: state.equipmentSkins,
        equippedMachineSkin: state.equippedMachineSkin,
        equippedGrinderSkin: state.equippedGrinderSkin,
        equippedPitcherSkin: state.equippedPitcherSkin,
        customerSkinPacks: state.customerSkinPacks,
        activeCustomerSkinPack: state.activeCustomerSkinPack,
        loginRewards: state.loginRewards,
        loginStreakDays: state.loginStreakDays,
        decor: state.decor,
        unlockedCats: state.unlockedCats || ['champy'],
        secretCatsUnlocked: state.secretCatsUnlocked || [],
        equippedCatId: state.equippedCatId || 'champy',
        unlockedCosmetics: state.unlockedCosmetics || [],
        catLoadouts: state.catLoadouts || {},
        goldenEspressoUnlocked: Boolean(state.goldenEspressoUnlocked),
        audioPreferences: {
          ...(state.audioPreferences || DEFAULT_AUDIO_PREFERENCES),
          // Never persist 'external' as cold fallback
          lastMode:
            state.audioPreferences?.lastMode === 'radio' ? 'radio' : 'vinyl',
        },
        cookieJarCheatUnlocked: Boolean(state.cookieJarCheatUnlocked),
      },
    },
    null,
    2
  );
}

export function importSaveJson(jsonStr: string): KlasikGameState | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    const d = parsed.data;
    if (typeof d.day !== 'number' || typeof d.cash !== 'number') return null;

    const base = createInitialGameState();
    const restoredDay = Math.max(1, Math.floor(d.day));
    const restoredGross =
      typeof d.lifetimeGrossIncome === 'number'
        ? Math.max(0, Math.floor(d.lifetimeGrossIncome))
        : Math.max(0, Math.floor(d.cash));

    // Merge saved upgrades & skins with full catalog so new items always appear
    const mergedUpgrades = base.upgrades.map((u) => {
      const savedU = Array.isArray(d.upgrades)
        ? d.upgrades.find((su: BizUpgradeItem) => su.id === u.id)
        : null;
      return savedU ? { ...u, purchased: Boolean(savedU.purchased) } : u;
    });

    const mergedSkins = syncGrossIncomeUnlocks(
      base.equipmentSkins.map((s) => {
        const savedS = Array.isArray(d.equipmentSkins)
          ? d.equipmentSkins.find((ss: EquipmentSkinItem) => ss.id === s.id)
          : null;
        return savedS ? { ...s, unlocked: Boolean(savedS.unlocked) } : s;
      }),
      restoredGross
    );

    const mergedPacks = base.customerSkinPacks.map((p) => {
      const savedP = Array.isArray(d.customerSkinPacks)
        ? d.customerSkinPacks.find((sp: CustomerSkinPackItem) => sp.id === p.id)
        : null;
      return savedP ? { ...p, unlocked: Boolean(savedP.unlocked) } : p;
    });

    const mergedLogin = base.loginRewards.map((r) => {
      const savedR = Array.isArray(d.loginRewards)
        ? d.loginRewards.find((sr: LoginRewardItem) => sr.id === r.id)
        : null;
      return savedR ? { ...r, claimed: Boolean(savedR.claimed) } : r;
    });

    const restoredPackId: CustomerSkinPackId =
      d.activeCustomerSkinPack || base.activeCustomerSkinPack;
    const activePackObj =
      mergedPacks.find((p) => p.id === restoredPackId) || mergedPacks[0];
    const syncedCustomers = base.customers.map((c, idx) => ({
      ...c,
      shirtColor: activePackObj.paletteColors[idx % activePackObj.paletteColors.length],
    }));

    // Phase 1.4 Save Migration: automatically unlock Golden Espresso (+ Tisay + Gold Chain) if revenue/balance >= $50,000
    const restoredCashVal = Math.max(0, Math.floor(d.cash));
    const goldenSkinUnlocked = Boolean(
      d.goldenEspressoUnlocked ||
        restoredGross >= GOLDEN_MACHINE_GROSS_THRESHOLD ||
        restoredCashVal >= GOLDEN_MACHINE_GROSS_THRESHOLD ||
        mergedSkins.find((s) => s.id === 'golden-espresso-machine')?.unlocked
    );
    const migratedSkins = goldenSkinUnlocked
      ? mergedSkins.map((s) =>
          s.id === 'golden-espresso-machine' ? { ...s, unlocked: true } : s
        )
      : mergedSkins;

    const savedCatsRaw: CafeCatId[] = [
      ...(Array.isArray(d.unlockedCats) ? d.unlockedCats.filter(isValidCafeCatId) : ['champy']),
      ...(Array.isArray(d.secretCatsUnlocked) ? d.secretCatsUnlocked.filter(isValidCafeCatId) : []),
    ];
    const catSync = syncCatUnlocks(savedCatsRaw, restoredGross, goldenSkinUnlocked);
    const syncedCats = catSync.unlockedCats;
    const restoredEquippedCat: CafeCatId =
      isValidCafeCatId(d.equippedCatId) && syncedCats.includes(d.equippedCatId)
        ? d.equippedCatId
        : 'champy';

    const savedCosmeticsRaw: CatCosmeticId[] = Array.isArray(d.unlockedCosmetics)
      ? d.unlockedCosmetics.filter(isValidCatCosmeticId)
      : [];
    const cosmeticSync = syncCatCosmeticMilestones(
      savedCosmeticsRaw,
      restoredGross,
      goldenSkinUnlocked
    );

    const restoredLoadouts: Partial<Record<CafeCatId, CatLoadout>> = {};
    if (d.catLoadouts && typeof d.catLoadouts === 'object') {
      for (const [k, v] of Object.entries(d.catLoadouts)) {
        if (isValidCafeCatId(k)) {
          restoredLoadouts[k] = normalizeCatLoadout(v as Partial<CatLoadout>);
        }
      }
    }

    const rawAudioPref = d.audioPreferences && typeof d.audioPreferences === 'object' ? d.audioPreferences : null;
    const rawMode = rawAudioPref?.mode ?? rawAudioPref?.lastMode;
    const rawAmbience =
      typeof rawAudioPref?.ambienceVolume === 'number'
        ? rawAudioPref.ambienceVolume
        : typeof rawAudioPref?.sfxVolume === 'number'
        ? rawAudioPref.sfxVolume
        : DEFAULT_AUDIO_PREFERENCES.ambienceVolume;
    const rawCrackle =
      typeof rawAudioPref?.vinylCrackle === 'boolean'
        ? rawAudioPref.vinylCrackle
        : typeof rawAudioPref?.crackleEnabled === 'boolean'
        ? rawAudioPref.crackleEnabled
        : DEFAULT_AUDIO_PREFERENCES.vinylCrackle;
    const rawRadioId =
      typeof rawAudioPref?.lastRadioStationId === 'string'
        ? rawAudioPref.lastRadioStationId
        : typeof rawAudioPref?.lastStationId === 'string'
        ? rawAudioPref.lastStationId
        : null;
    const restoredAudioPref: AudioPreferences = {
      // Never restore 'external' as cold fallback
      mode: rawMode === 'radio' ? 'radio' : 'vinyl',
      lastVinylTrackId:
        typeof rawAudioPref?.lastVinylTrackId === 'string' ? rawAudioPref.lastVinylTrackId : null,
      lastRadioStationId: rawRadioId,
      musicVolume:
        typeof rawAudioPref?.musicVolume === 'number'
          ? Math.max(0, Math.min(1, rawAudioPref.musicVolume))
          : DEFAULT_AUDIO_PREFERENCES.musicVolume,
      ambienceVolume: Math.max(0, Math.min(1, rawAmbience)),
      vinylCrackle: rawCrackle,
    };

    // Real-time 24h daily quota & login sync against local calendar date
    const now = new Date();
    const todayKey = getLocalDateKey(now);
    const savedQuotaDateKey =
      d.dailyQuota && typeof d.dailyQuota.dateKey === 'string'
        ? d.dailyQuota.dateKey
        : todayKey;
    const isSameQuotaDay = savedQuotaDateKey === todayKey;
    const restoredCupsToday = isSameQuotaDay
      ? typeof d.dailyQuota?.cupsServedToday === 'number'
        ? Math.max(0, Math.floor(d.dailyQuota.cupsServedToday))
        : typeof d.cupsServedToday === 'number'
        ? Math.max(0, Math.floor(d.cupsServedToday))
        : 0
      : 0;
    const restoredQuotaClaimed = isSameQuotaDay
      ? Boolean(d.dailyQuota?.quotaBonusClaimed ?? d.quotaBonusAwarded)
      : false;

    const restoredLoginState: DailyLoginState = {
      lastClaimDateKey:
        d.dailyLogin && typeof d.dailyLogin.lastClaimDateKey === 'string'
          ? d.dailyLogin.lastClaimDateKey
          : null,
      lastClaimTimestamp:
        d.dailyLogin && typeof d.dailyLogin.lastClaimTimestamp === 'number'
          ? d.dailyLogin.lastClaimTimestamp
          : null,
      streakDay:
        d.dailyLogin && typeof d.dailyLogin.streakDay === 'number'
          ? Math.max(1, Math.min(7, Math.floor(d.dailyLogin.streakDay)))
          : typeof d.loginStreakDays === 'number'
          ? Math.max(1, Math.min(7, Math.floor(d.loginStreakDays)))
          : 1,
      claimedToday:
        Boolean(d.dailyLogin && d.dailyLogin.lastClaimDateKey === todayKey),
    };

    const restoredTimeMode: TimeOfDayMode =
      d.timeOfDayMode !== undefined
        ? normalizeTimeOfDayMode(d.timeOfDayMode)
        : d.weather
        ? extractTimeOfDayFromWeather(normalizeWeatherMode(d.weather))
        : 'auto';

    const savedSceneriesRaw: SceneryId[] = Array.isArray(d.unlockedSceneries)
      ? d.unlockedSceneries.filter(isValidSceneryId)
      : ['busy_street'];
    const scenerySync = syncSceneryMilestones(savedSceneriesRaw, restoredGross);
    const restoredActiveScenery: SceneryId =
      isValidSceneryId(d.activeScenery) && scenerySync.unlockedSceneries.includes(d.activeScenery)
        ? d.activeScenery
        : 'busy_street';

    const rawRainPref: RainPreference =
      d.rainPreference !== undefined
        ? normalizeRainPreference(d.rainPreference)
        : d.weather
        ? isRainyWeather(normalizeWeatherMode(d.weather))
          ? 'rain'
          : 'clear'
        : 'auto';
    const restoredRainPref = clampRainPreferenceForScenery(restoredActiveScenery, rawRainPref);
    const resolvedTime = resolveTimeOfDay(restoredTimeMode, now);
    const restoredIsSnowing =
      isAlwaysWinterScenery(restoredActiveScenery) ||
      (restoredRainPref === 'snow' && isSnowAllowedForScenery(restoredActiveScenery));
    const restoredIsRaining = restoredIsSnowing
      ? false
      : restoredRainPref === 'rain'
      ? true
      : restoredRainPref === 'clear'
      ? false
      : typeof d.isRaining === 'boolean'
      ? d.isRaining
      : isRainyWeather(normalizeWeatherMode(d.weather));
    const restoredWeather = resolveCompositeWeather(resolvedTime, restoredIsRaining);
    const restoredClimate = resolveClimateState(
      restoredActiveScenery,
      restoredRainPref,
      restoredIsSnowing
    );

    const restoredPatronOutfits: PatronOutfitId[] = Array.isArray(d.unlockedPatronOutfits)
      ? Array.from(new Set(d.unlockedPatronOutfits.filter(isValidPatronOutfitId)))
      : [];
    const restoredEnabledCustomOutfits: PatronOutfitId[] = Array.isArray(
      d.enabledCustomPatronOutfits
    )
      ? d.enabledCustomPatronOutfits.filter(
          (id: unknown): id is PatronOutfitId =>
            isValidPatronOutfitId(id) && restoredPatronOutfits.includes(id)
        )
      : [...restoredPatronOutfits];

    let storedSecretIdx =
      typeof d.klasik_secret_name_idx === 'number'
        ? d.klasik_secret_name_idx
        : typeof d.secretNpcNameIdx === 'number'
        ? d.secretNpcNameIdx
        : 0;
    if (typeof window !== 'undefined' && d.klasik_secret_name_idx === undefined) {
      try {
        const lsVal = window.localStorage.getItem(SECRET_NPC_STORAGE_KEY);
        if (lsVal !== null) storedSecretIdx = Number(lsVal);
      } catch {
        // ignore
      }
    }

    return {
      ...base,
      day: restoredDay,
      cash: Math.max(0, Math.floor(d.cash)),
      lifetimeGrossIncome: restoredGross,
      dailyGoal: typeof d.dailyGoal === 'number' ? d.dailyGoal : getDailyRevenueGoal(restoredDay),
      dailyOrderQuota:
        typeof d.dailyOrderQuota === 'number'
          ? d.dailyOrderQuota
          : DAILY_REALTIME_CUP_QUOTA,
      dailyQuota: {
        dateKey: todayKey,
        cupsServedToday: restoredCupsToday,
        dailyCupQuota:
          typeof d.dailyQuota?.dailyCupQuota === 'number'
            ? d.dailyQuota.dailyCupQuota
            : DAILY_REALTIME_CUP_QUOTA,
        quotaBonusClaimed: restoredQuotaClaimed,
      },
      cupsServedToday: restoredCupsToday,
      quotaBonusAwarded: restoredQuotaClaimed,
      dailyLogin: restoredLoginState,
      totalCupsServed: typeof d.totalCupsServed === 'number' ? d.totalCupsServed : 0,
      activeShiftSeconds: typeof d.activeShiftSeconds === 'number' ? d.activeShiftSeconds : 0,
      satisfactionScore: typeof d.satisfactionScore === 'number' ? d.satisfactionScore : 100,
      weather: restoredWeather,
      timeOfDayMode: restoredTimeMode,
      rainPreference: restoredRainPref,
      isRaining: restoredIsRaining,
      isSnowing: restoredIsSnowing,
      climateState: restoredClimate,
      activeScenery: restoredActiveScenery,
      unlockedSceneries: scenerySync.unlockedSceneries,
      unlockedPatronOutfits: restoredPatronOutfits,
      patronOutfitMode:
        d.patronOutfitMode === 'manual' ||
        d.patronOutfitMode === 'custom_mix' ||
        d.patronOutfitMode === 'auto_match'
          ? d.patronOutfitMode
          : typeof d.patronOutfitAutoMatch === 'boolean'
          ? d.patronOutfitAutoMatch
            ? 'auto_match'
            : 'custom_mix'
          : 'manual',
      equippedPatronOutfitId:
        isValidPatronOutfitId(d.equippedPatronOutfitId) &&
        restoredPatronOutfits.includes(d.equippedPatronOutfitId)
          ? d.equippedPatronOutfitId
          : null,
      patronOutfitAutoMatch:
        d.patronOutfitMode !== undefined
          ? d.patronOutfitMode === 'auto_match'
          : typeof d.patronOutfitAutoMatch === 'boolean'
          ? d.patronOutfitAutoMatch
          : false,
      enabledCustomPatronOutfits: restoredEnabledCustomOutfits,
      secretNpcNameIdx: normalizeSecretNpcNameIdx(storedSecretIdx),
      secretNpcCooldownRemaining: 0,
      graphicsQuality: normalizeGraphicsQuality(d.graphicsQuality),
      realismMode: Boolean(d.realismMode),
      regularCustomersSinceLastRider:
        typeof d.regularCustomersSinceLastRider === 'number'
          ? Math.max(0, Math.floor(d.regularCustomersSinceLastRider))
          : 3,
      upgrades: mergedUpgrades,
      equipmentSkins: migratedSkins,
      goldenEspressoUnlocked: goldenSkinUnlocked,
      equippedMachineSkin:
        d.equippedMachineSkin === 'golden-espresso-machine' && !goldenSkinUnlocked
          ? 'classic-steel'
          : d.equippedMachineSkin || base.equippedMachineSkin,
      equippedGrinderSkin: d.equippedGrinderSkin || base.equippedGrinderSkin,
      equippedPitcherSkin: d.equippedPitcherSkin || base.equippedPitcherSkin,
      customerSkinPacks: mergedPacks,
      activeCustomerSkinPack: restoredPackId,
      customers: syncedCustomers,
      loginRewards: mergedLogin,
      loginStreakDays: restoredLoginState.streakDay,
      decor: d.decor ? { ...base.decor, ...d.decor } : base.decor,
      unlockedCats: syncedCats,
      secretCatsUnlocked: catSync.secretCatsUnlocked,
      equippedCatId: restoredEquippedCat,
      unlockedCosmetics: cosmeticSync.unlockedCosmetics,
      catLoadouts: restoredLoadouts,
      audioPreferences: restoredAudioPref,
      cookieJarCheatUnlocked: Boolean(d.cookieJarCheatUnlocked),
      lastActionFeedback: 'Restored cafe save backup successfully!',
    };
  } catch {
    return null;
  }
}
