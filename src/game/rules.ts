// Complete Game Rules, Recipes, Customer Ordering Dialogue, Dynamic Add-On Modifiers,
// Daily 30-50 Order Quotas, Table Seating & Miata Showroom State Machine, Business Upgrades,
// Decor Customization, and Save/Export/Import System for Klasik 3D.

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';
export type GameMode = 'career' | 'zen';
export type WeatherMode = 'morning' | 'golden' | 'rainy';
export type BaristaStationId = 1 | 2 | 3 | 4 | 5;
export type GraphicsQuality = 'low' | 'high' | 'auto';
export type SyrupFlavor = 'none' | 'vanilla' | 'caramel' | 'chocolate' | 'matcha';
export type CustomerSocialBehavior =
  | 'selfie'
  | 'chatting'
  | 'laptop'
  | 'relaxing'
  | 'car_selfie';

export const SHIFT_SECONDS = 300;
export const MAX_QUEUE = 4;
export const MAX_GARDEN_SEATS = 6;
export const DAILY_QUOTA_COMPLETION_BONUS = 50;

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
  tagline: string;
  price: number;
  ingredientCost: number;
  needsEspresso: boolean;
  needsSteamedMilk: boolean;
  needsIce: boolean;
  syrup: SyrupFlavor;
  unlockDay: number;
  colorHex: string;
}

export const RECIPES: DrinkRecipe[] = [
  {
    id: 'klasik-espresso',
    name: 'Klasik Double Espresso',
    tagline: 'Rich 9-bar dark roast with tiger-stripe golden crema.',
    price: 5,
    ingredientCost: 1,
    needsEspresso: true,
    needsSteamedMilk: false,
    needsIce: false,
    syrup: 'none',
    unlockDay: 1,
    colorHex: '#3b1d0e',
  },
  {
    id: 'velvet-latte',
    name: 'Garage Velvet Latte',
    tagline: 'Double espresso topped with silky 65°C microfoam milk.',
    price: 6,
    ingredientCost: 2,
    needsEspresso: true,
    needsSteamedMilk: true,
    needsIce: false,
    syrup: 'none',
    unlockDay: 1,
    colorHex: '#c68b59',
  },
  {
    id: 'vanilla-oat-latte',
    name: 'Madagascar Vanilla Latte',
    tagline: 'Aromatic vanilla bean syrup swirled with steamed milk & espresso.',
    price: 7,
    ingredientCost: 2,
    needsEspresso: true,
    needsSteamedMilk: true,
    needsIce: false,
    syrup: 'vanilla',
    unlockDay: 1,
    colorHex: '#d9a773',
  },
  {
    id: 'iced-caramel-macchiato',
    name: 'Iced Caramel Garden Macchiato',
    tagline: 'Crystal ice cubes, buttery caramel drizzle, milk & bold espresso.',
    price: 8,
    ingredientCost: 2,
    needsEspresso: true,
    needsSteamedMilk: true,
    needsIce: true,
    syrup: 'caramel',
    unlockDay: 1,
    colorHex: '#b4692c',
  },
  {
    id: 'dark-mocha',
    name: 'Artisan Dark Cacao Mocha',
    tagline: 'Single-origin dark chocolate ganache steamed with espresso.',
    price: 8,
    ingredientCost: 3,
    needsEspresso: true,
    needsSteamedMilk: true,
    needsIce: false,
    syrup: 'chocolate',
    unlockDay: 2,
    colorHex: '#5c3317',
  },
  {
    id: 'uji-matcha-latte',
    name: 'Iced Uji Ceremonial Matcha',
    tagline: 'Whisked first-harvest green tea over ice & creamy milk.',
    price: 9,
    ingredientCost: 3,
    needsEspresso: false,
    needsSteamedMilk: true,
    needsIce: true,
    syrup: 'matcha',
    unlockDay: 2,
    colorHex: '#4d7c0f',
  },
];

export interface CupBuildState {
  hasGrounds: boolean;
  isTamped: boolean;
  hasEspresso: boolean;
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
  patience: number; // 0..100
  maxPatience: number;
  state: 'ordering' | 'seated' | 'departing';
  seatIndex: number | null; // 0..5 for the 6 cafe & garden tables
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
  description: string;
  cost: number;
  effectLabel: string;
  purchased: boolean;
}

export interface DecorCustomization {
  counterWood: 'walnut' | 'white-oak' | 'charcoal-ash';
  mugColor: 'cream' | 'matte-black' | 'sage-green' | 'terracotta';
  neonSignColor: 'amber' | 'emerald' | 'rose';
  plantDensity: 'cozy' | 'lush-jungle';
}

export interface KlasikGameState {
  phase: GamePhase;
  mode: GameMode;
  weather: WeatherMode;
  activeStation: BaristaStationId;
  graphicsQuality: GraphicsQuality;
  day: number;
  cash: number;
  dailyRevenue: number;
  dailyGoal: number;
  dailyOrderQuota: number;
  quotaBonusAwarded: boolean;
  cupsServedToday: number;
  totalCupsServed: number;
  satisfactionScore: number; // 0..100
  shiftTimeRemaining: number; // seconds (300s per shift)
  pinnedOrderId: string | null;
  currentCup: CupBuildState;
  customers: CustomerOrder[];
  upgrades: BizUpgradeItem[];
  decor: DecorCustomization;
  lastActionFeedback: string;
}

export const INITIAL_UPGRADES: BizUpgradeItem[] = [
  {
    id: 'precision-burr-grinder',
    name: 'Titanium Conical Burr Grinder',
    description: 'Increases extraction quality and adds +$2 artisan aroma tip per cup.',
    cost: 35,
    effectLabel: '+$2 Tip / Cup',
    purchased: false,
  },
  {
    id: 'dual-pid-boiler',
    name: 'PID Dual-Boiler Pressure Profiling',
    description: 'Stabilizes brew temperature so waiting customers lose patience 35% slower.',
    cost: 55,
    effectLabel: '+35% Customer Patience',
    purchased: false,
  },
  {
    id: 'audiophile-tube-preamp',
    name: 'Warm Vacuum Tube Turntable Preamp',
    description: 'Upgrades the 3D Vinyl Corner acoustics, boosting Garden Table tips by +$3.',
    cost: 75,
    effectLabel: '+$3 Vinyl Vibe Bonus',
    purchased: false,
  },
  {
    id: 'monstera-greenhouse-canopy',
    name: '1990 Miata Showroom & Botanical Pergola',
    description: 'Spotlights the 1990 Mazda Miata MX-5 & garden oasis, unlocking +$4 prestige tips.',
    cost: 110,
    effectLabel: '+$4 Miata & Garden Prestige',
    purchased: false,
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
];

const SHIRT_COLORS = [
  '#d97706',
  '#059669',
  '#2563eb',
  '#9333ea',
  '#e11d48',
  '#0d9488',
  '#b45309',
  '#4f46e5',
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
    patience: 100,
    maxPatience: 100,
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
    patience: 100,
    maxPatience: 100,
    state: 'ordering',
    seatIndex: null,
    seatedTimer: 0,
    dialogueLine:
      'That 1990 Miata MX-5 is clean! Hit me with an Iced Caramel Garden Macchiato—iced, with Caramel drizzle!',
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
    recipeId: 'vanilla-oat-latte',
    patience: 100,
    maxPatience: 100,
    state: 'ordering',
    seatIndex: null,
    seatedTimer: 0,
    dialogueLine:
      'Love the vinyl spinning today! Can I order a Madagascar Vanilla Latte with Madagascar bean syrup?',
    customAddons: ['+Vanilla', '+Velvet Foam'],
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
    graphicsQuality: 'auto',
    day,
    cash: 32,
    dailyRevenue: 0,
    dailyGoal: getDailyRevenueGoal(day),
    dailyOrderQuota: getDailyOrderQuota(day),
    quotaBonusAwarded: false,
    cupsServedToday: 0,
    totalCupsServed: 0,
    satisfactionScore: 100,
    shiftTimeRemaining: SHIFT_SECONDS,
    pinnedOrderId: firstCustomer.id,
    currentCup: createEmptyCup(),
    customers: [firstCustomer, secondCustomer, thirdCustomer],
    upgrades: INITIAL_UPGRADES.map((u) => ({ ...u })),
    decor: {
      counterWood: 'walnut',
      mugColor: 'cream',
      neonSignColor: 'amber',
      plantDensity: 'lush-jungle',
    },
    lastActionFeedback:
      'Welcome to Klasik 3D! Dose & tamp beans at Station 2 to begin your 30-order shift.',
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

// Determines the next recommended action & station for the smart diegetic halo highlighter
export function getNextRecommendedStep(
  cup: CupBuildState,
  targetRecipe: DrinkRecipe | null,
  targetOrder?: CustomerOrder | null
): {
  station: BaristaStationId;
  toolKey: 'grinder' | 'tamper' | 'espresso' | 'milk' | 'ice' | 'syrup' | 'serve';
  instruction: string;
} {
  const recipe = getEffectiveRecipeForOrder(targetOrder, targetRecipe);

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
  const totalChecks = 4;
  const notes: string[] = [];

  if (cup.hasEspresso === effective.needsEspresso) {
    score++;
  } else {
    notes.push(
      effective.needsEspresso ? 'Missing espresso shot' : 'Unexpected espresso shot'
    );
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
  customBonusTip = 0
): { totalPayout: number; basePrice: number; tip: number; customTip: number } {
  const basePrice = Math.max(1, Math.round(recipe.price * (accuracy / 100)));
  let upgradeBonus = 0;
  for (const upg of state.upgrades) {
    if (!upg.purchased) continue;
    if (upg.id === 'precision-burr-grinder') upgradeBonus += 2;
    if (upg.id === 'audiophile-tube-preamp') upgradeBonus += 3;
    if (upg.id === 'monstera-greenhouse-canopy') upgradeBonus += 4;
  }

  const speedTip =
    accuracy === 100 ? Math.max(1, Math.round((customerPatience / 100) * 4)) : 0;
  const earnedCustomTip = accuracy === 100 ? customBonusTip : 0;
  const tip = accuracy >= 75 ? speedTip + upgradeBonus + earnedCustomTip : 0;
  return {
    totalPayout: basePrice + tip,
    basePrice,
    tip,
    customTip: earnedCustomTip,
  };
}

export function performCupAction(
  state: KlasikGameState,
  action:
    | 'grind'
    | 'tamp'
    | 'pull_espresso'
    | 'steam_milk'
    | 'add_ice'
    | 'add_syrup'
    | 'rinse_cup'
    | 'quick_brew_step',
  syrupFlavor?: SyrupFlavor
): KlasikGameState {
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

    if (step.toolKey === 'grinder') {
      cup.hasGrounds = true;
      feedback = 'Ground 18g of fresh Arabica beans into the portafilter.';
    } else if (step.toolKey === 'tamper') {
      cup.isTamped = true;
      feedback = 'Tamped coffee puck evenly at 30 lbs of pressure.';
    } else if (step.toolKey === 'espresso') {
      cup.hasEspresso = true;
      // Automatically transition to Station 3 (or next recommended station) as the cup glides to the Assembly Coaster
      const postShotStep = getNextRecommendedStep(cup, targetRecipe, pinnedOrder);
      activeStation = postShotStep.station;
      feedback =
        'Extracted 9-bar double espresso with golden crema! Cup gliding to Station 3 Assembly Coaster.';
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
    if (!cup.hasGrounds) {
      cup.hasGrounds = true;
    }
    cup.isTamped = true;
    activeStation = 2;
    feedback = 'Tamped grounds level & polished espresso puck surface.';
  } else if (action === 'pull_espresso') {
    cup.hasGrounds = true;
    cup.isTamped = true;
    cup.hasEspresso = true;
    // Automatically transition camera to Station 3 Assembly Coaster as shot finishes!
    activeStation = 3;
    feedback = 'Pulled 9-bar double espresso shot! Cup gliding to Station 3 Assembly Coaster.';
  } else if (action === 'steam_milk') {
    cup.hasSteamedMilk = true;
    activeStation = 3;
    feedback = 'Steamed silky 65°C microfoam milk & poured Rosetta latte art.';
  } else if (action === 'add_ice') {
    cup.hasIce = !cup.hasIce;
    activeStation = 3;
    feedback = cup.hasIce ? 'Scooped crystal ice cubes into cup.' : 'Removed ice from cup.';
  } else if (action === 'add_syrup' && syrupFlavor) {
    cup.syrup = syrupFlavor;
    activeStation = 3;
    feedback =
      syrupFlavor === 'none'
        ? 'Cleared syrup selection.'
        : `Pumped rich ${syrupFlavor} flavor into the cup.`;
  }

  return {
    ...state,
    activeStation,
    currentCup: cup,
    lastActionFeedback: feedback,
  };
}

export function serveCurrentCupToCustomer(
  state: KlasikGameState,
  targetCustomerId?: string
): KlasikGameState {
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
  const evaluation = evaluateDrinkMatch(state.currentCup, recipe, targetCustomer);
  const payout = calculateDrinkPayout(
    state,
    recipe,
    evaluation.accuracy,
    targetCustomer.patience,
    targetCustomer.customBonusTip
  );

  // Find available garden / showroom table seat (0..5)
  const occupiedSeats = new Set(
    state.customers
      .filter((c) => c.state === 'seated' && c.seatIndex !== null)
      .map((c) => c.seatIndex)
  );
  let assignedSeat: number | null = null;
  for (let i = 0; i < MAX_GARDEN_SEATS; i++) {
    if (!occupiedSeats.has(i)) {
      assignedSeat = i;
      break;
    }
  }

  const updatedCustomers = state.customers.map((c) => {
    if (c.id !== targetCustomer.id) return c;
    return {
      ...c,
      state: (assignedSeat !== null ? 'seated' : 'departing') as CustomerOrder['state'],
      seatIndex: assignedSeat,
      seatedTimer: assignedSeat !== null ? 24 : 4,
    };
  });

  const remainingOrdering = updatedCustomers.filter((c) => c.state === 'ordering');
  if (remainingOrdering.length < 3) {
    updatedCustomers.push(spawnCustomerOrder(state.day, updatedCustomers.length));
  }

  const nextOrdering = updatedCustomers.find((c) => c.state === 'ordering');
  const newCupsToday = state.cupsServedToday + 1;
  const newTotalCups = state.totalCupsServed + 1;

  // Check if Daily Order Quota (30-50 orders) was just completed!
  const justCompletedQuota =
    !state.quotaBonusAwarded && newCupsToday >= state.dailyOrderQuota;
  const quotaBonus = justCompletedQuota ? DAILY_QUOTA_COMPLETION_BONUS : 0;

  const newCash = state.cash + payout.totalPayout + quotaBonus;
  const newDailyRevenue = state.dailyRevenue + payout.totalPayout + quotaBonus;
  const newSatisfaction = Math.min(
    100,
    Math.max(0, Math.round(state.satisfactionScore * 0.85 + evaluation.accuracy * 0.15))
  );

  const quotaSuffix = justCompletedQuota
    ? ` · 🎉 DAILY QUOTA (${state.dailyOrderQuota} ORDERS) COMPLETE! +$${DAILY_QUOTA_COMPLETION_BONUS} BONUS!`
    : '';

  const feedbackMsg = evaluation.isPerfect
    ? `Ding! ${targetCustomer.customerName} picked up Perfect ${recipe.name}! +$${payout.totalPayout} (incl. $${payout.tip} tip ❤️)${quotaSuffix}`
    : `Served ${recipe.name} (${evaluation.accuracy}% match) to ${targetCustomer.customerName} for +$${payout.totalPayout}.${quotaSuffix}`;

  return {
    ...state,
    activeStation: 4, // Smoothly transition camera to Station 4 Pickup Coaster for the 2-stage handoff
    cash: newCash,
    dailyRevenue: newDailyRevenue,
    quotaBonusAwarded: state.quotaBonusAwarded || justCompletedQuota,
    cupsServedToday: newCupsToday,
    totalCupsServed: newTotalCups,
    satisfactionScore: newSatisfaction,
    currentCup: createEmptyCup(),
    customers: updatedCustomers,
    pinnedOrderId: nextOrdering ? nextOrdering.id : null,
    lastActionFeedback: feedbackMsg,
  };
}

export function spawnCustomerOrder(day: number, seedOffset = 0): CustomerOrder {
  const unlockedRecipes = RECIPES.filter((r) => r.unlockDay <= Math.max(1, day));
  const idx = (day * 7 + seedOffset * 3 + Math.floor(Math.random() * 100)) % unlockedRecipes.length;
  const recipe = unlockedRecipes[idx] || RECIPES[0];
  const nameIdx =
    (day * 3 + seedOffset * 5 + Math.floor(Math.random() * 100)) % CUSTOMER_NAMES.length;
  const customerName = CUSTOMER_NAMES[nameIdx];

  // Dynamic Custom Add-On Modifiers & Natural Barista-Customer Ordering Dialogue
  let customNeedsIce: boolean | undefined = undefined;
  let customSyrup: SyrupFlavor | undefined = undefined;
  const customAddons: string[] = [];
  let customBonusTip = 2;

  const modRoll = (day + seedOffset + nameIdx) % 4;
  if (modRoll === 0 && !recipe.needsIce && recipe.id !== 'klasik-espresso') {
    customNeedsIce = true;
    customAddons.push('+Iced');
    customBonusTip = 3;
  } else if (modRoll === 1 && recipe.syrup === 'none') {
    customSyrup = 'vanilla';
    customAddons.push('+Vanilla');
    customBonusTip = 3;
  } else if (modRoll === 2 && recipe.syrup === 'none') {
    customSyrup = 'caramel';
    customAddons.push('+Caramel');
    customBonusTip = 3;
  }

  if (recipe.needsIce && !customAddons.includes('+Iced')) {
    customAddons.push('+Iced');
  }
  if (recipe.syrup !== 'none') {
    const sLabel =
      recipe.syrup === 'matcha'
        ? '+Matcha Foam'
        : `+${recipe.syrup.charAt(0).toUpperCase() + recipe.syrup.slice(1)}`;
    if (!customAddons.includes(sLabel)) customAddons.push(sLabel);
  }
  if (customAddons.length === 0) {
    customAddons.push('+Extra Shot');
    customBonusTip = 2;
  }

  const addonPhrase =
    customNeedsIce && customSyrup
      ? `iced, with an extra pump of ${customSyrup}`
      : customNeedsIce
      ? 'served over crystal ice'
      : customSyrup
      ? `with a splash of ${customSyrup} syrup`
      : recipe.needsIce
      ? 'extra cold with fresh ice'
      : 'with silky 65°C microfoam';

  const greetings = [
    `Morning! Could I get a ${recipe.name}—${addonPhrase}?`,
    `That 1990 Miata MX-5 in the garage bay is iconic! Hit me with a ${recipe.name}, ${addonPhrase}!`,
    `Love the vinyl spinning today! Can I order a ${recipe.name}, ${addonPhrase}?`,
    `Hi there! One ${recipe.name} please—${addonPhrase}.`,
  ];
  const dialogueLine = greetings[(nameIdx + seedOffset) % greetings.length];
  const socialBehavior = SOCIAL_BEHAVIORS[(nameIdx + seedOffset) % SOCIAL_BEHAVIORS.length];

  return {
    id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    customerName,
    avatarColor: AVATAR_COLORS[nameIdx % AVATAR_COLORS.length],
    shirtColor: SHIRT_COLORS[(nameIdx + seedOffset) % SHIRT_COLORS.length],
    recipeId: recipe.id,
    patience: 100,
    maxPatience: 100,
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

export function advanceSimulationTick(state: KlasikGameState, dtSeconds: number): KlasikGameState {
  if (state.phase !== 'playing') return state;
  const dt = Math.min(dtSeconds, 0.1);

  const hasPidBoiler = state.upgrades.some((u) => u.id === 'dual-pid-boiler' && u.purchased);
  const patienceDecayRate = state.mode === 'zen' ? 0 : hasPidBoiler ? 0.55 : 0.85;

  let bonusTableTip = 0;
  let tipMessage: string | null = null;

  const nextCustomers: CustomerOrder[] = [];
  for (const cust of state.customers) {
    if (cust.state === 'ordering') {
      const nextPatience = Math.max(12, cust.patience - patienceDecayRate * dt);
      nextCustomers.push({
        ...cust,
        patience: nextPatience,
      });
    } else if (cust.state === 'seated') {
      const remaining = cust.seatedTimer - dt;
      if (remaining <= 0) {
        bonusTableTip += 3;
        tipMessage =
          cust.socialBehavior === 'car_selfie'
            ? `${cust.customerName} snapped a selfie with the 1990 Miata MX-5 and left a +$3 tip!`
            : `${cust.customerName} loved the Garage Garden vibe and left a +$3 table tip!`;
      } else {
        nextCustomers.push({
          ...cust,
          seatedTimer: remaining,
        });
      }
    }
  }

  const orderingCount = nextCustomers.filter((c) => c.state === 'ordering').length;
  if (orderingCount < MAX_QUEUE) {
    nextCustomers.push(spawnCustomerOrder(state.day, nextCustomers.length + 1));
  }

  let nextShiftTime = state.shiftTimeRemaining;
  let nextPhase: GamePhase = state.phase;

  if (state.mode === 'career') {
    nextShiftTime = Math.max(0, state.shiftTimeRemaining - dt);
    if (nextShiftTime <= 0) {
      nextPhase = 'gameover';
    }
  }

  const pinnedExists = nextCustomers.some(
    (c) => c.id === state.pinnedOrderId && c.state === 'ordering'
  );
  const fallbackOrder = nextCustomers.find((c) => c.state === 'ordering');

  return {
    ...state,
    phase: nextPhase,
    cash: state.cash + bonusTableTip,
    dailyRevenue: state.dailyRevenue + bonusTableTip,
    shiftTimeRemaining: nextShiftTime,
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
  const c1 = spawnCustomerOrder(nextDay, 1);
  const c2 = spawnCustomerOrder(nextDay, 2);
  const c3 = spawnCustomerOrder(nextDay, 3);

  return {
    ...state,
    phase: 'playing',
    activeStation: 2,
    day: nextDay,
    dailyRevenue: 0,
    dailyGoal: nextGoal,
    dailyOrderQuota: nextQuota,
    quotaBonusAwarded: false,
    cupsServedToday: 0,
    shiftTimeRemaining: SHIFT_SECONDS,
    currentCup: createEmptyCup(),
    customers: [c1, c2, c3],
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
      version: '1.5.0',
      studio: 'BoostedByCaffeine Studios',
      timestamp: new Date().toISOString(),
      data: {
        day: state.day,
        cash: state.cash,
        dailyGoal: state.dailyGoal,
        dailyOrderQuota: state.dailyOrderQuota,
        totalCupsServed: state.totalCupsServed,
        satisfactionScore: state.satisfactionScore,
        weather: state.weather,
        graphicsQuality: state.graphicsQuality,
        upgrades: state.upgrades,
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
    return {
      ...base,
      day: restoredDay,
      cash: Math.max(0, Math.floor(d.cash)),
      dailyGoal: typeof d.dailyGoal === 'number' ? d.dailyGoal : getDailyRevenueGoal(restoredDay),
      dailyOrderQuota:
        typeof d.dailyOrderQuota === 'number'
          ? d.dailyOrderQuota
          : getDailyOrderQuota(restoredDay),
      totalCupsServed: typeof d.totalCupsServed === 'number' ? d.totalCupsServed : 0,
      satisfactionScore: typeof d.satisfactionScore === 'number' ? d.satisfactionScore : 100,
      weather: d.weather || base.weather,
      graphicsQuality: d.graphicsQuality || base.graphicsQuality,
      upgrades: Array.isArray(d.upgrades) ? d.upgrades : base.upgrades,
      decor: d.decor ? { ...base.decor, ...d.decor } : base.decor,
      lastActionFeedback: 'Restored cafe save backup successfully!',
    };
  } catch {
    return null;
  }
}
