// Complete Game Rules, 16 Hot/Iced Coffee, Artisanal Tea & Cold Refresher Recipes,
// Step-by-Step Brewing & Tea Steeping, 60+ Unique Unlockables (Upgrades, Equipment Skins,
// Customer Skin Packs, Login Rewards, Decor), "Golden Espresso Machine" (100k Gross Income -> 2x Sale Income),
// Daily 30-50 Order Quotas, Table Seating & Miata Showroom State Machine, and Save/Export/Import System.

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';
export type GameMode = 'career' | 'zen';
export type WeatherMode = 'morning' | 'golden' | 'rainy' | 'night' | 'rainy-night';
export type BaristaStationId = 1 | 2 | 3 | 4 | 5;
export type GraphicsQuality = 'low' | 'max';
export type OrderType = 'dine-in' | 'takeout';
export type CupVesselType = 'hot-mug' | 'iced-glass' | 'hot-takeout' | 'iced-takeout';

export function isRainyWeather(weather: WeatherMode): boolean {
  return weather === 'rainy' || weather === 'rainy-night';
}

export function isNightWeather(weather: WeatherMode): boolean {
  return weather === 'night' || weather === 'rainy-night';
}

export function normalizeWeatherMode(val: unknown): WeatherMode {
  if (
    val === 'morning' ||
    val === 'golden' ||
    val === 'rainy' ||
    val === 'night' ||
    val === 'rainy-night'
  ) {
    return val;
  }
  return 'morning';
}

export const STORAGE_GFX_KEY = 'klasik3d_gfx_quality_v2';

export function normalizeGraphicsQuality(val: unknown): GraphicsQuality {
  return val === 'max' ? 'max' : 'low';
}

export function loadSavedGraphicsQuality(): GraphicsQuality {
  if (typeof window === 'undefined') return 'low';
  try {
    const saved = window.localStorage.getItem(STORAGE_GFX_KEY);
    return saved === 'max' ? 'max' : 'low';
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

export const SHIFT_SECONDS = 300;
export const MAX_QUEUE = 3;
export const MAX_GARDEN_SEATS = 6;
export const DAILY_QUOTA_COMPLETION_BONUS = 50;
export const GOLDEN_MACHINE_GROSS_THRESHOLD = 150000;
export const MIN_ARRIVAL_GAP_SEC = 3.2;

export function rollOrderTimeLimitSec(rng: () => number = Math.random): number {
  return Math.floor(rng() * 11) + 10; // Inclusive 10..20 seconds
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
  if (ratio >= 0.5) {
    const tip = isSpecialty ? 4 : 3;
    return { tip, tier: 'fast', label: `Fast Service! +$${tip} Tip` };
  }
  if (ratio >= 0.25) {
    return { tip: 1, tier: 'prompt', label: 'Nice Speed! +$1 Tip' };
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

export function getDailyOrderQuota(day: number): number {
  return Math.min(50, 30 + (Math.max(1, day) - 1) * 5);
}

export function getDailyRevenueGoal(day: number): number {
  const quota = getDailyOrderQuota(day);
  return quota * 7 + (Math.max(1, day) - 1) * 20;
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

export interface CupBuildState {
  hasGrounds: boolean;
  isTamped: boolean;
  hasEspresso: boolean;
  hasSteepedTea?: boolean;
  hasSteamedMilk: boolean;
  hasIce: boolean;
  syrup: SyrupFlavor;
}

export interface CustomerOrder {
  id: string;
  customerName: string;
  avatarColor: string;
  shirtColor: string;
  recipeId: string;
  orderType: OrderType;
  patience: number; // 0..100 (synced with orderTimeRemainingSec / orderTimeLimitSec)
  maxPatience: number;
  orderTimeLimitSec: number; // Randomized integer in [10, 20] seconds
  orderTimeRemainingSec: number;
  timerStarted: boolean; // Starts ticking ONLY once customer reaches the counter!
  expired?: boolean; // True when countdown hits 0 -> triggers walkout
  state: 'ordering' | 'seated' | 'departing';
  seatIndex: number | null; // 0..5 for the 6 cafe & garden tables (always null for takeout)
  seatedTimer: number;
  dialogueLine: string;
  customAddons: string[];
  customBonusTip: number;
  customNeedsIce?: boolean;
  customSyrup?: SyrupFlavor;
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
  cupsServedToday: number;
  totalCupsServed: number;
  satisfactionScore: number; // 0..100
  shiftTimeRemaining: number; // seconds (300s per shift)
  activeShiftSeconds: number; // verifiable active shift playtime in seconds
  waveCustomersRemaining: number; // remaining customers in current 2-3 customer wave
  nextCustomerSpawnTimer: number; // seconds until next 1-by-1 customer walks in or wave cooldown ends
  pinnedOrderId: string | null;
  currentCup: CupBuildState;
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
      'Legendary 24K solid gold dual-boiler masterpiece! Earned exclusively by grinding to $150,000 Gross Income. DOUBLES (2x) all drink sale income once equipped!',
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
    patience: 100,
    maxPatience: 100,
    orderTimeLimitSec: 18,
    orderTimeRemainingSec: 18,
    timerStarted: true,
    state: 'ordering',
    seatIndex: null,
    seatedTimer: 0,
    dialogueLine:
      'Morning! Could I get a hot Garage Velvet Latte with extra silky 65°C microfoam?',
    customAddons: ['+Extra Shot', '+Velvet Foam'],
    customBonusTip: 2,
    socialBehavior: 'car_selfie',
  };

  const secondCustomer: CustomerOrder = {
    id: 'cust-initial-2',
    customerName: 'Kenji',
    avatarColor: '#e2a983',
    shirtColor: '#059669',
    recipeId: 'iced-caramel-macchiato',
    orderType: 'takeout',
    patience: 100,
    maxPatience: 100,
    orderTimeLimitSec: 16,
    orderTimeRemainingSec: 16,
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
    socialBehavior: 'laptop',
  };

  const thirdCustomer: CustomerOrder = {
    id: 'cust-initial-3',
    customerName: 'Sora',
    avatarColor: '#f1c27d',
    shirtColor: '#2563eb',
    recipeId: 'london-fog-tea-latte',
    orderType: 'dine-in',
    patience: 100,
    maxPatience: 100,
    orderTimeLimitSec: 20,
    orderTimeRemainingSec: 20,
    timerStarted: true,
    state: 'ordering',
    seatIndex: null,
    seatedTimer: 0,
    dialogueLine:
      'Love the vinyl spinning today! Can I order an Earl Grey Vanilla London Fog steeped fresh?',
    customAddons: ['+Steeped Tea', '+Vanilla'],
    customBonusTip: 3,
    customSyrup: 'vanilla',
    socialBehavior: 'selfie',
  };

  const day = 1;
  return {
    phase: 'title',
    mode: 'career',
    weather: 'morning',
    activeStation: 2,
    graphicsQuality: 'low',
    realismMode: false,
    day,
    cash: 45,
    lifetimeGrossIncome: 0,
    dailyRevenue: 0,
    dailyGoal: getDailyRevenueGoal(day),
    dailyOrderQuota: getDailyOrderQuota(day),
    quotaBonusAwarded: false,
    cupsServedToday: 0,
    totalCupsServed: 0,
    satisfactionScore: 100,
    shiftTimeRemaining: SHIFT_SECONDS,
    activeShiftSeconds: 0,
    waveCustomersRemaining: 2,
    nextCustomerSpawnTimer: 5,
    pinnedOrderId: firstCustomer.id,
    currentCup: createEmptyCup(),
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
    missedOrders: 0,
    lastExpiredCustomerName: null,
    lastExpiredEventSeq: 0,
    lastActionFeedback:
      'Welcome to Klasik 3D! Dose & tamp beans at Station 2 or brew Tea & Cold Drinks at Station 3.',
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

// Determines the next recommended action & station for the smart diegetic halo highlighter
export function getNextRecommendedStep(
  cup: CupBuildState,
  targetRecipe: DrinkRecipe | null,
  targetOrder?: CustomerOrder | null
): {
  station: BaristaStationId;
  toolKey: 'grinder' | 'tamper' | 'espresso' | 'tea' | 'milk' | 'ice' | 'syrup' | 'serve' | 'rinse';
  instruction: string;
  isError?: boolean;
} {
  const recipe = getEffectiveRecipeForOrder(targetOrder, targetRecipe);
  const validation = validateDrinkForServe(cup, recipe, targetOrder);

  if (validation.hasWrongIngredient) {
    return {
      station: 2,
      toolKey: 'rinse',
      instruction: `Wrong addition (${validation.wrongIngredients[0]})! Rinse cup [R] at Sink to restart`,
      isError: true,
    };
  }

  if (recipe.needsEspresso) {
    if (!cup.hasGrounds) {
      return {
        station: 2,
        toolKey: 'grinder',
        instruction: 'Grind fresh dark-roast beans into portafilter (Station 2)',
      };
    }
    if (!cup.isTamped) {
      return {
        station: 2,
        toolKey: 'tamper',
        instruction: 'Tamp coffee grounds evenly on the tamping mat (Station 2)',
      };
    }
    if (!cup.hasEspresso) {
      return {
        station: 2,
        toolKey: 'espresso',
        instruction: 'Pull 9-bar double espresso shot into ceramic mug (Station 2)',
      };
    }
  }

  if (recipe.needsTeaSteep && !cup.hasSteepedTea) {
    return {
      station: 3,
      toolKey: 'tea',
      instruction: 'Steep artisanal tea leaves & botanicals in the Glass Teapot (Station 3)',
    };
  }

  if (recipe.syrup !== 'none' && cup.syrup !== recipe.syrup) {
    return {
      station: 3,
      toolKey: 'syrup',
      instruction: `Pump ${recipe.syrup.toUpperCase()} flavor into the cup on Assembly Coaster (Station 3)`,
    };
  }

  if (recipe.needsIce && !cup.hasIce) {
    return {
      station: 3,
      toolKey: 'ice',
      instruction: 'Scoop crystal ice cubes into the cup on Assembly Coaster (Station 3)',
    };
  }

  if (recipe.needsSteamedMilk && !cup.hasSteamedMilk) {
    return {
      station: 3,
      toolKey: 'milk',
      instruction: 'Steam silky microfoam milk & pour Rosetta latte art (Station 3)',
    };
  }

  return {
    station: 4,
    toolKey: 'serve',
    instruction: `Ring bell & serve finished ${recipe.name} at Pickup Counter (Station 4)`,
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
  customerPatience: number,
  customBonusTip = 0,
  orderTimeRemainingSec?: number,
  orderTimeLimitSec?: number
): {
  totalPayout: number;
  basePrice: number;
  tip: number;
  speedTip: number;
  speedTipLabel: string | null;
  customTip: number;
  multiplier: number;
} {
  const basePrice = Math.max(1, Math.round(recipe.price * (accuracy / 100)));
  let upgradeBonus = 0;
  for (const upg of state.upgrades) {
    if (!upg.purchased) continue;
    upgradeBonus += upg.tipBonus || 2;
  }

  let speedTip = 0;
  let speedTipLabel: string | null = null;
  if (accuracy === 100) {
    if (orderTimeRemainingSec !== undefined && orderTimeLimitSec !== undefined) {
      const isSpecialty =
        recipe.syrup !== 'none' || Boolean(recipe.needsTeaSteep) || (recipe.needsIce && recipe.needsSteamedMilk);
      const speedRes = computeSpeedTipBonus(orderTimeRemainingSec, orderTimeLimitSec, isSpecialty);
      speedTip = speedRes.tip;
      speedTipLabel = speedRes.label;
    } else {
      speedTip = Math.max(1, Math.round((customerPatience / 100) * 4));
    }
  }

  const earnedCustomTip = accuracy === 100 ? customBonusTip : 0;
  const tip = accuracy >= 75 ? speedTip + upgradeBonus + earnedCustomTip : 0;

  // Golden Espresso Machine Skin doubles (2x) all drink sale income once equipped!
  const multiplier = state.equippedMachineSkin === 'golden-espresso-machine' ? 2 : 1;
  const rawTotal = basePrice + tip;
  return {
    totalPayout: rawTotal * multiplier,
    basePrice: basePrice * multiplier,
    tip: tip * multiplier,
    speedTip: speedTip * multiplier,
    speedTipLabel,
    customTip: earnedCustomTip * multiplier,
    multiplier,
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
    return {
      ...state,
      activeStation: 2,
      currentCup: createEmptyCup(),
      lastActionFeedback: 'Rinsed ceramic cup & knocked spent puck into the Knock Box.',
    };
  }

  if (action === 'quick_brew_step') {
    const pinnedOrder =
      state.customers.find((c) => c.id === state.pinnedOrderId && c.state === 'ordering') ||
      state.customers.find((c) => c.state === 'ordering');
    const targetRecipe = pinnedOrder ? getRecipeById(pinnedOrder.recipeId) : RECIPES[1];
    const effectiveRecipe = getEffectiveRecipeForOrder(pinnedOrder, targetRecipe);
    const step = getNextRecommendedStep(cup, targetRecipe, pinnedOrder);
    activeStation = step.station;

    if (step.toolKey === 'rinse') {
      return {
        ...state,
        activeStation: 2,
        currentCup: createEmptyCup(),
        lastActionFeedback: 'Rinsed cup at Stainless Sink [R] after wrong ingredient.',
      };
    } else if (step.toolKey === 'grinder') {
      cup.hasGrounds = true;
      feedback = 'Ground 18g of fresh Arabica beans into the portafilter.';
    } else if (step.toolKey === 'tamper') {
      cup.isTamped = true;
      feedback = 'Tamped coffee puck evenly at 30 lbs of pressure.';
    } else if (step.toolKey === 'espresso') {
      cup.hasEspresso = true;
      const postShotStep = getNextRecommendedStep(cup, targetRecipe, pinnedOrder);
      activeStation = postShotStep.station;
      feedback =
        'Extracted 9-bar double espresso with golden crema! Cup gliding to Station 3 Assembly Coaster.';
    } else if (step.toolKey === 'tea') {
      cup.hasSteepedTea = true;
      activeStation = 3;
      feedback =
        'Steeped fragrant organic tea leaves & botanicals in the Kyoto Glass Teapot on Station 3!';
    } else if (step.toolKey === 'syrup') {
      cup.syrup = effectiveRecipe.syrup;
      feedback = `Added aromatic ${effectiveRecipe.syrup} infusion on the Station 3 Assembly Coaster.`;
    } else if (step.toolKey === 'ice') {
      cup.hasIce = true;
      feedback = 'Scooped crystal-clear ice cubes into the cup on Station 3.';
    } else if (step.toolKey === 'milk') {
      cup.hasSteamedMilk = true;
      feedback = 'Steamed 65°C velvety microfoam & poured Rosetta latte art!';
    } else if (step.toolKey === 'serve') {
      return serveCurrentCupToCustomer({ ...state, activeStation: 4 });
    }

    return {
      ...state,
      activeStation,
      currentCup: cup,
      lastActionFeedback: feedback,
    };
  }

  if (action === 'grind') {
    cup.hasGrounds = true;
    cup.isTamped = false;
    activeStation = 2;
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
    activeStation = 2;
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
    activeStation = 3;
    feedback = 'Pulled 9-bar double espresso shot! Cup gliding to Station 3 Assembly Coaster.';
  } else if (action === 'steep_tea') {
    cup.hasSteepedTea = true;
    activeStation = 3;
    feedback = 'Steeped artisanal tea leaves & botanical infusion at 80°C on Station 3.';
  } else if (action === 'steam_milk') {
    if (!cup.hasEspresso && !cup.hasSteepedTea) {
      return {
        ...state,
        lastActionFeedback: 'Locked! Pull an espresso shot [E] or steep tea [B] before steaming milk.',
      };
    }
    cup.hasSteamedMilk = true;
    activeStation = 3;
    feedback = 'Steamed silky 65°C microfoam milk & poured Rosetta latte art.';
  } else if (action === 'add_ice') {
    cup.hasIce = !cup.hasIce;
    activeStation = 3;
    feedback = cup.hasIce ? 'Scooped crystal ice cubes into cup.' : 'Removed ice from cup.';
  } else if (action === 'add_syrup' && syrupFlavor) {
    cup.syrup = syrupFlavor;
    if (syrupFlavor === 'matcha') {
      cup.hasSteepedTea = true;
    }
    activeStation = 3;
    feedback =
      syrupFlavor === 'none'
        ? 'Cleared syrup selection.'
        : `Pumped rich ${syrupFlavor} flavor into the cup.`;
  }

  // Check if the action introduced an unrequested ingredient for the active order
  const activeOrder =
    state.customers.find((c) => c.id === state.pinnedOrderId && c.state === 'ordering') ||
    state.customers.find((c) => c.state === 'ordering');
  if (activeOrder) {
    const check = validateDrinkForServe(cup, getRecipeById(activeOrder.recipeId), activeOrder);
    if (check.hasWrongIngredient) {
      feedback = `Wrong addition (${check.wrongIngredients[0]})! Press [R] at the Rinse Sink to restart cup.`;
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
      return { ...s, unlocked: lifetimeGross >= GOLDEN_MACHINE_GROSS_THRESHOLD };
    }
    return s;
  });
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
    orderingCustomers[0];

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
      activeStation: 4,
      satisfactionScore: penalizedSatisfaction,
      currentCup: createEmptyCup(),
      customers: updatedAfterComplaint,
      pinnedOrderId: nextOrderingAfterComplaint ? nextOrderingAfterComplaint.id : null,
      lastActionFeedback: `${targetCustomer.customerName}: "Wait—I didn't ask for ${validation.wrongIngredients[0]} in this! Not cool..." (-8% Vibe · $0 Tip)`,
    };
  }

  const evaluation = evaluateDrinkMatch(state.currentCup, recipe, targetCustomer);
  const payout = calculateDrinkPayout(
    state,
    recipe,
    evaluation.accuracy,
    targetCustomer.patience,
    targetCustomer.customBonusTip,
    targetCustomer.orderTimeRemainingSec,
    targetCustomer.orderTimeLimitSec
  );

  // Takeout patrons leave straight through the front entrance without occupying any indoor seat!
  const isTakeoutOrder = targetCustomer.orderType === 'takeout';
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
      seatedTimer: assignedSeat !== null ? 24 : isTakeoutOrder ? 9.5 : 5.5,
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

  const nextOrdering = updatedCustomers.find((c) => c.state === 'ordering');
  const newCupsToday = state.cupsServedToday + 1;
  const newTotalCups = state.totalCupsServed + 1;

  // Check if Daily Order Quota (30-50 orders) was just completed!
  const justCompletedQuota =
    !state.quotaBonusAwarded && newCupsToday >= state.dailyOrderQuota;
  const quotaBonus = justCompletedQuota ? DAILY_QUOTA_COMPLETION_BONUS : 0;

  const grossEarned = payout.totalPayout + quotaBonus;
  const newCash = state.cash + grossEarned;
  const newDailyRevenue = state.dailyRevenue + grossEarned;
  const newLifetimeGross = (state.lifetimeGrossIncome || 0) + grossEarned;
  const updatedSkins = syncGrossIncomeUnlocks(state.equipmentSkins, newLifetimeGross);
  const justUnlockedGolden =
    (state.lifetimeGrossIncome || 0) < GOLDEN_MACHINE_GROSS_THRESHOLD &&
    newLifetimeGross >= GOLDEN_MACHINE_GROSS_THRESHOLD;

  const newSatisfaction = Math.min(
    100,
    Math.max(0, Math.round(state.satisfactionScore * 0.85 + evaluation.accuracy * 0.15))
  );

  const goldenBadge = payout.multiplier === 2 ? ' [2x GOLDEN MACHINE!]' : '';
  const unlockSuffix = justUnlockedGolden
    ? ' · $150K GROSS REACHED! GOLDEN ESPRESSO MACHINE UNLOCKED!'
    : '';
  const quotaSuffix = justCompletedQuota
    ? ` · DAILY QUOTA (${state.dailyOrderQuota} ORDERS) COMPLETE! +$${DAILY_QUOTA_COMPLETION_BONUS} BONUS!`
    : '';

  const takeoutLabel = isTakeoutOrder ? ' (Takeout)' : '';
  const speedBadge =
    payout.speedTipLabel && payout.speedTip > 0 ? ` · ${payout.speedTipLabel}` : '';
  const feedbackMsg = evaluation.isPerfect
    ? `Ding! ${targetCustomer.customerName} picked up Perfect ${recipe.name}${takeoutLabel}! +$${payout.totalPayout}${goldenBadge}${speedBadge} (incl. $${payout.tip} tip)${quotaSuffix}${unlockSuffix}`
    : `Served ${recipe.name}${takeoutLabel} (${evaluation.accuracy}% match) to ${targetCustomer.customerName} for +$${payout.totalPayout}${goldenBadge}.${quotaSuffix}${unlockSuffix}`;

  return {
    ...state,
    activeStation: 4,
    cash: newCash,
    lifetimeGrossIncome: newLifetimeGross,
    dailyRevenue: newDailyRevenue,
    quotaBonusAwarded: state.quotaBonusAwarded || justCompletedQuota,
    cupsServedToday: newCupsToday,
    totalCupsServed: newTotalCups,
    satisfactionScore: newSatisfaction,
    waveCustomersRemaining: nextWaveRemaining,
    nextCustomerSpawnTimer: nextSpawnTimer,
    currentCup: createEmptyCup(),
    customers: updatedCustomers,
    equipmentSkins: updatedSkins,
    pinnedOrderId: nextOrdering ? nextOrdering.id : null,
    lastActionFeedback: feedbackMsg,
  };
}

export function spawnCustomerOrder(
  day: number,
  seedOffset = 0,
  customPalette?: string[]
): CustomerOrder {
  const unlockedRecipes = RECIPES.filter((r) => r.unlockDay <= Math.max(1, day));
  const idx = (day * 7 + seedOffset * 3 + Math.floor(Math.random() * 100)) % unlockedRecipes.length;
  const recipe = unlockedRecipes[idx] || RECIPES[0];
  const nameIdx =
    (day * 3 + seedOffset * 5 + Math.floor(Math.random() * 100)) % CUSTOMER_NAMES.length;
  const customerName = CUSTOMER_NAMES[nameIdx];

  let customNeedsIce: boolean | undefined = undefined;
  let customSyrup: SyrupFlavor | undefined = undefined;
  const customAddons: string[] = [];
  let customBonusTip = 2;

  const modRoll = (day + seedOffset + nameIdx) % 4;
  if (modRoll === 0 && !recipe.needsIce && recipe.id !== 'klasik-espresso') {
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

  const orderType: OrderType = Math.random() < 0.38 ? 'takeout' : 'dine-in';
  const toGoSuffix = orderType === 'takeout' ? ' to go' : '';
  const greetings = [
    `Morning! Could I get a ${recipe.name}${toGoSuffix}—${addonPhrase}?`,
    `That 1990 Miata MX-5 in the garage bay is iconic! Hit me with a ${recipe.name}${toGoSuffix}, ${addonPhrase}!`,
    `Love the vinyl spinning today! Can I order a ${recipe.name}${toGoSuffix}, ${addonPhrase}?`,
    `Hi there! One ${recipe.name}${toGoSuffix} please—${addonPhrase}.`,
  ];
  const dialogueLine = greetings[(nameIdx + seedOffset) % greetings.length];
  const socialBehavior = SOCIAL_BEHAVIORS[(nameIdx + seedOffset) % SOCIAL_BEHAVIORS.length];
  const palette =
    customPalette && customPalette.length > 0
      ? customPalette
      : INITIAL_CUSTOMER_SKIN_PACKS[0].paletteColors;

  const orderTimeLimitSec = rollOrderTimeLimitSec();

  return {
    id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    customerName,
    avatarColor: AVATAR_COLORS[nameIdx % AVATAR_COLORS.length],
    shirtColor: palette[(nameIdx + seedOffset) % palette.length],
    recipeId: recipe.id,
    orderType,
    patience: 100,
    maxPatience: 100,
    orderTimeLimitSec,
    orderTimeRemainingSec: orderTimeLimitSec,
    timerStarted: false,
    state: 'ordering',
    seatIndex: null,
    seatedTimer: 0,
    dialogueLine,
    customAddons,
    customBonusTip,
    customNeedsIce,
    customSyrup,
    socialBehavior,
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

export function claimLoginReward(state: KlasikGameState, rewardDay: number): KlasikGameState {
  const reward = state.loginRewards.find((r) => r.day === rewardDay);
  if (!reward || reward.claimed) return state;

  // Gate loyalty/login rewards behind verifiable active shift playtime & completed orders!
  const activeSecs = state.activeShiftSeconds ?? 0;
  const reqSecs = reward.requiredShiftSeconds ?? 600;
  const reqOrders = reward.requiredOrdersServed ?? 15;
  if (activeSecs < reqSecs || state.totalCupsServed < reqOrders) {
    const minsLeft = Math.max(0, Math.ceil((reqSecs - activeSecs) / 60));
    const ordersLeft = Math.max(0, reqOrders - state.totalCupsServed);
    return {
      ...state,
      lastActionFeedback: `Locked! Need ${minsLeft}m more active shift play & ${ordersLeft} more served orders to claim ${reward.title}.`,
    };
  }

  const updatedRewards = state.loginRewards.map((r) =>
    r.day === rewardDay ? { ...r, claimed: true } : r
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

  return {
    ...state,
    cash: newCash,
    lifetimeGrossIncome: newGross,
    loginRewards: updatedRewards,
    loginStreakDays: Math.max(state.loginStreakDays, rewardDay + 1),
    equipmentSkins: updatedSkins,
    customerSkinPacks: updatedPacks,
    equippedMachineSkin: equippedMachine,
    equippedGrinderSkin: equippedGrinder,
    equippedPitcherSkin: equippedPitcher,
    activeCustomerSkinPack: activePackId,
    customers: updatedCustomers,
    lastActionFeedback: `Claimed ${reward.title}! (${reward.rewardLabel})`,
  };
}

export function reachGoldenMachineMilestone(state: KlasikGameState): KlasikGameState {
  const newGross = Math.max(state.lifetimeGrossIncome, GOLDEN_MACHINE_GROSS_THRESHOLD);
  const updatedSkins = state.equipmentSkins.map((s) =>
    s.id === 'golden-espresso-machine' ? { ...s, unlocked: true } : s
  );
  return {
    ...state,
    lifetimeGrossIncome: newGross,
    equipmentSkins: updatedSkins,
    equippedMachineSkin: 'golden-espresso-machine',
    lastActionFeedback:
      '$150,000 Gross Income Milestone Reached! 24K Golden Espresso Machine Equipped (2x Sale Income)!',
  };
}

export interface SimulationTickOptions {
  modalOpen?: boolean;
  isRecipeBookOpen?: boolean;
  activeArrivingCount?: number;
}

export function advanceSimulationTick(
  state: KlasikGameState,
  dtSeconds: number,
  options: SimulationTickOptions = {}
): KlasikGameState {
  if (state.phase !== 'playing') return state;
  // Pause countdowns completely while informational modals (Settings/Upgrades/Customize/Spotify/etc.) are open
  if (options.modalOpen && !options.isRecipeBookOpen) {
    return state;
  }

  const dt = Math.min(Math.max(0, dtSeconds), 0.3);
  const hasPidBoiler = state.upgrades.some((u) => u.id === 'dual-pid-boiler' && u.purchased);
  const hasBonsai = state.upgrades.some((u) => u.id === 'japanese-bonsai-terrarium' && u.purchased);
  // Subtle upgrade grace on order timers while keeping authentic 10-20s pace
  const upgradeGrace = hasPidBoiler && hasBonsai ? 0.8 : hasPidBoiler ? 0.88 : 1.0;
  // Gentle 0.35x slow-mo grace while checking Recipe Book; paused completely in Zen Mode
  const modalTimeScale = options.isRecipeBookOpen ? 0.35 : 1.0;
  const orderTickRate = state.mode === 'zen' ? 0 : upgradeGrace * modalTimeScale;

  let bonusTableTip = 0;
  let tipMessage: string | null = null;
  let nextSatisfaction = state.satisfactionScore;
  let nextMissedOrders = state.missedOrders ?? 0;
  let nextExpiredSeq = state.lastExpiredEventSeq ?? 0;
  let nextExpiredName: string | null = state.lastExpiredCustomerName ?? null;

  const nextCustomers: CustomerOrder[] = [];
  for (const cust of state.customers) {
    if (cust.state === 'ordering') {
      const limitSec = Math.max(10, Math.min(20, cust.orderTimeLimitSec || 15));
      const curRemaining =
        typeof cust.orderTimeRemainingSec === 'number'
          ? cust.orderTimeRemainingSec
          : (cust.patience / 100) * limitSec;

      if (!cust.timerStarted || orderTickRate <= 0) {
        nextCustomers.push({
          ...cust,
          orderTimeLimitSec: limitSec,
          orderTimeRemainingSec: curRemaining,
          patience: Math.max(0, Math.min(100, (curRemaining / limitSec) * 100)),
        });
        continue;
      }

      const nextRemaining = Math.max(0, curRemaining - dt * orderTickRate);
      const nextPatience = Math.max(0, Math.min(100, (nextRemaining / limitSec) * 100));

      if (nextRemaining <= 0 && state.mode !== 'zen') {
        nextSatisfaction = Math.max(0, nextSatisfaction - 8);
        nextMissedOrders += 1;
        nextExpiredSeq += 1;
        nextExpiredName = cust.customerName;
        tipMessage = `${cust.customerName} ran out of patience and left! ($0)`;
        nextCustomers.push({
          ...cust,
          patience: 0,
          orderTimeLimitSec: limitSec,
          orderTimeRemainingSec: 0,
          expired: true,
          state: 'departing',
          seatedTimer: 7.5,
        });
      } else {
        nextCustomers.push({
          ...cust,
          patience: nextPatience,
          orderTimeLimitSec: limitSec,
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

  // Phase 1 Staggered Spawner Guard: minimum 3.2s gap AND never spawn while another arriving customer is crossing doorway
  const orderingCount = nextCustomers.filter((c) => c.state === 'ordering').length;
  const arrivingUnstartedCount = nextCustomers.filter(
    (c) => c.state === 'ordering' && !c.timerStarted
  ).length;
  const activeArrivingCount =
    options.activeArrivingCount !== undefined ? options.activeArrivingCount : arrivingUnstartedCount;
  let waveRemaining = state.waveCustomersRemaining ?? 2;
  let spawnTimer = (state.nextCustomerSpawnTimer ?? 5) - dt;

  if (
    orderingCount < MAX_QUEUE &&
    waveRemaining > 0 &&
    spawnTimer <= 0 &&
    activeArrivingCount < 1
  ) {
    const newlyArrived = spawnCustomerOrder(
      state.day,
      nextCustomers.length + Math.floor(state.activeShiftSeconds || 0),
      activePack.paletteColors
    );
    nextCustomers.push(newlyArrived);
    waveRemaining -= 1;
    // Enforce >= 3.2s staggered spawn spacing (5.0s between patrons; 12s wave breathing cooldown)
    spawnTimer = Math.max(MIN_ARRIVAL_GAP_SEC, waveRemaining > 0 ? 5.0 : 12.0);
    if (!tipMessage) {
      tipMessage = `${newlyArrived.customerName} walked in through the Garage Garden door!`;
    }
  } else if (
    orderingCount === 0 &&
    waveRemaining <= 0 &&
    spawnTimer <= 0 &&
    activeArrivingCount < 1
  ) {
    // Wave breathing cooldown completed -> start a fresh 2-3 customer wave!
    const firstOfNewWave = spawnCustomerOrder(
      state.day,
      nextCustomers.length + 1,
      activePack.paletteColors
    );
    nextCustomers.push(firstOfNewWave);
    waveRemaining = 2;
    spawnTimer = Math.max(MIN_ARRIVAL_GAP_SEC, 5.0);
    if (!tipMessage) {
      tipMessage = `New wave arriving: ${firstOfNewWave.customerName} walked in!`;
    }
  }

  let nextShiftTime = state.shiftTimeRemaining;
  let nextPhase: GamePhase = state.phase;

  if (state.mode === 'career') {
    nextShiftTime = Math.max(0, state.shiftTimeRemaining - dt * modalTimeScale);
    if (nextShiftTime <= 0) {
      nextPhase = 'gameover';
    }
  }

  const pinnedExists = nextCustomers.some(
    (c) => c.id === state.pinnedOrderId && c.state === 'ordering'
  );
  const fallbackOrder = nextCustomers.find((c) => c.state === 'ordering');

  const newLifetimeGross = (state.lifetimeGrossIncome || 0) + bonusTableTip;
  const updatedSkins =
    bonusTableTip > 0
      ? syncGrossIncomeUnlocks(state.equipmentSkins, newLifetimeGross)
      : state.equipmentSkins;

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
    shiftTimeRemaining: nextShiftTime,
    activeShiftSeconds: (state.activeShiftSeconds ?? 0) + dt,
    waveCustomersRemaining: waveRemaining,
    nextCustomerSpawnTimer: Math.max(0, spawnTimer),
    customers: nextCustomers,
    pinnedOrderId: pinnedExists ? state.pinnedOrderId : fallbackOrder ? fallbackOrder.id : null,
    lastActionFeedback: tipMessage || state.lastActionFeedback,
  };
}

export function startNextDayShift(state: KlasikGameState): KlasikGameState {
  const isSuccess =
    state.dailyRevenue >= state.dailyGoal || state.cupsServedToday >= state.dailyOrderQuota;
  const nextDay = isSuccess ? state.day + 1 : state.day;
  const nextQuota = getDailyOrderQuota(nextDay);
  const nextGoal = getDailyRevenueGoal(nextDay);
  const activePack =
    state.customerSkinPacks.find((p) => p.id === state.activeCustomerSkinPack) ||
    INITIAL_CUSTOMER_SKIN_PACKS[0];

  const c1 = spawnCustomerOrder(nextDay, 1, activePack.paletteColors);

  return {
    ...state,
    phase: 'playing',
    activeStation: 2,
    day: nextDay,
    loginStreakDays: Math.min(7, Math.max(state.loginStreakDays, nextDay)),
    dailyRevenue: 0,
    dailyGoal: nextGoal,
    dailyOrderQuota: nextQuota,
    quotaBonusAwarded: false,
    cupsServedToday: 0,
    shiftTimeRemaining: SHIFT_SECONDS,
    waveCustomersRemaining: 2,
    nextCustomerSpawnTimer: 5,
    currentCup: createEmptyCup(),
    customers: [c1],
    pinnedOrderId: c1.id,
    lastActionFeedback: `Day ${nextDay} Shift started! Quota: ${nextQuota} Orders · Target: $${nextGoal}`,
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
      version: '2.1.0',
      studio: 'BoostedByCaffeine Studios',
      timestamp: new Date().toISOString(),
      data: {
        day: state.day,
        cash: state.cash,
        lifetimeGrossIncome: state.lifetimeGrossIncome,
        dailyGoal: state.dailyGoal,
        dailyOrderQuota: state.dailyOrderQuota,
        totalCupsServed: state.totalCupsServed,
        activeShiftSeconds: state.activeShiftSeconds ?? 0,
        satisfactionScore: state.satisfactionScore,
        weather: state.weather,
        graphicsQuality: state.graphicsQuality,
        realismMode: Boolean(state.realismMode),
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

    return {
      ...base,
      day: restoredDay,
      cash: Math.max(0, Math.floor(d.cash)),
      lifetimeGrossIncome: restoredGross,
      dailyGoal: typeof d.dailyGoal === 'number' ? d.dailyGoal : getDailyRevenueGoal(restoredDay),
      dailyOrderQuota:
        typeof d.dailyOrderQuota === 'number'
          ? d.dailyOrderQuota
          : getDailyOrderQuota(restoredDay),
      totalCupsServed: typeof d.totalCupsServed === 'number' ? d.totalCupsServed : 0,
      activeShiftSeconds: typeof d.activeShiftSeconds === 'number' ? d.activeShiftSeconds : 0,
      satisfactionScore: typeof d.satisfactionScore === 'number' ? d.satisfactionScore : 100,
      weather: normalizeWeatherMode(d.weather),
      graphicsQuality: normalizeGraphicsQuality(d.graphicsQuality),
      realismMode: Boolean(d.realismMode),
      upgrades: mergedUpgrades,
      equipmentSkins: mergedSkins,
      equippedMachineSkin:
        d.equippedMachineSkin === 'golden-espresso-machine' &&
        restoredGross < GOLDEN_MACHINE_GROSS_THRESHOLD
          ? 'classic-steel'
          : d.equippedMachineSkin || base.equippedMachineSkin,
      equippedGrinderSkin: d.equippedGrinderSkin || base.equippedGrinderSkin,
      equippedPitcherSkin: d.equippedPitcherSkin || base.equippedPitcherSkin,
      customerSkinPacks: mergedPacks,
      activeCustomerSkinPack: restoredPackId,
      customers: syncedCustomers,
      loginRewards: mergedLogin,
      loginStreakDays: typeof d.loginStreakDays === 'number' ? d.loginStreakDays : restoredDay,
      decor: d.decor ? { ...base.decor, ...d.decor } : base.decor,
      lastActionFeedback: 'Restored cafe save backup successfully!',
    };
  } catch {
    return null;
  }
}
