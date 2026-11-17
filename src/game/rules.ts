// Complete Game Rules, Recipes, Customer Queue & Table Seating State Machine,
// Business Upgrades, Decor Customization, and Save/Export/Import System for Klasik 3D.

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';
export type GameMode = 'career' | 'zen';
export type WeatherMode = 'morning' | 'golden' | 'rainy';
export type BaristaStationId = 1 | 2 | 3 | 4 | 5;
export type GraphicsQuality = 'low' | 'high' | 'auto';
export type SyrupFlavor = 'none' | 'vanilla' | 'caramel' | 'chocolate' | 'matcha';

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
    price: 4,
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
  seatIndex: number | null; // 0, 1, 2 for the 3 garden tables
  seatedTimer: number;
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
  cupsServedToday: number;
  totalCupsServed: number;
  satisfactionScore: number; // 0..100
  shiftTimeRemaining: number; // seconds (e.g. 150s per shift)
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
    cost: 25,
    effectLabel: '+$2 Tip / Cup',
    purchased: false,
  },
  {
    id: 'dual-pid-boiler',
    name: 'PID Dual-Boiler Pressure Profiling',
    description: 'Stabilizes brew temperature so waiting customers lose patience 30% slower.',
    cost: 40,
    effectLabel: '+30% Customer Patience',
    purchased: false,
  },
  {
    id: 'audiophile-tube-preamp',
    name: 'Warm Vacuum Tube Turntable Preamp',
    description: 'Upgrades the 3D Vinyl Corner acoustics, boosting Garden Table tips by +$3.',
    cost: 55,
    effectLabel: '+$3 Vinyl Vibe Bonus',
    purchased: false,
  },
  {
    id: 'monstera-greenhouse-canopy',
    name: 'Rare Variegated Monstera Pergola',
    description: 'Transforms the Garage Garden into a botanical oasis, unlocking +$4 prestige tips.',
    cost: 80,
    effectLabel: '+$4 Botanical Prestige',
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
];

const SHIRT_COLORS = ['#d97706', '#059669', '#2563eb', '#9333ea', '#e11d48', '#0d9488'];
const AVATAR_COLORS = ['#f5d0b5', '#e2a983', '#c6865c', '#8d5524', '#f1c27d'];

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
  };

  const secondCustomer: CustomerOrder = {
    id: 'cust-initial-2',
    customerName: 'Kenji',
    avatarColor: '#e2a983',
    shirtColor: '#059669',
    recipeId: 'vanilla-oat-latte',
    patience: 100,
    maxPatience: 100,
    state: 'ordering',
    seatIndex: null,
    seatedTimer: 0,
  };

  return {
    phase: 'title',
    mode: 'career',
    weather: 'morning',
    activeStation: 2,
    graphicsQuality: 'auto',
    day: 1,
    cash: 32,
    dailyRevenue: 0,
    dailyGoal: 36,
    cupsServedToday: 0,
    totalCupsServed: 0,
    satisfactionScore: 100,
    shiftTimeRemaining: 150,
    pinnedOrderId: firstCustomer.id,
    currentCup: createEmptyCup(),
    customers: [firstCustomer, secondCustomer],
    upgrades: INITIAL_UPGRADES.map((u) => ({ ...u })),
    decor: {
      counterWood: 'walnut',
      mugColor: 'cream',
      neonSignColor: 'amber',
      plantDensity: 'lush-jungle',
    },
    lastActionFeedback: 'Welcome to Klasik 3D! Dose & tamp beans at Station 2 to begin.',
  };
}

export function getRecipeById(recipeId: string): DrinkRecipe {
  return RECIPES.find((r) => r.id === recipeId) || RECIPES[0];
}

// Determines the next recommended action & station for the smart ingredient highlighter
export function getNextRecommendedStep(
  cup: CupBuildState,
  targetRecipe: DrinkRecipe | null
): {
  station: BaristaStationId;
  toolKey: 'grinder' | 'tamper' | 'espresso' | 'milk' | 'ice' | 'syrup' | 'serve';
  instruction: string;
} {
  const recipe = targetRecipe || RECIPES[1];

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
      instruction: `Pump ${recipe.syrup.toUpperCase()} flavor into the cup (Station 3)`,
    };
  }

  if (recipe.needsIce && !cup.hasIce) {
    return {
      station: 3,
      toolKey: 'ice',
      instruction: 'Scoop crystal ice cubes into the cup (Station 3)',
    };
  }

  if (recipe.needsSteamedMilk && !cup.hasSteamedMilk) {
    return {
      station: 3,
      toolKey: 'milk',
      instruction: 'Steam silky microfoam milk & pour latte art (Station 3)',
    };
  }

  return {
    station: 4,
    toolKey: 'serve',
    instruction: `Serve finished ${recipe.name} on the walnut tray (Station 4)`,
  };
}

// Evaluates how accurately the brewed cup matches the customer's ordered recipe (0..100%)
export function evaluateDrinkMatch(cup: CupBuildState, recipe: DrinkRecipe): {
  accuracy: number;
  isPerfect: boolean;
  notes: string[];
} {
  let score = 0;
  let totalChecks = 4;
  const notes: string[] = [];

  if (cup.hasEspresso === recipe.needsEspresso) {
    score++;
  } else {
    notes.push(recipe.needsEspresso ? 'Missing espresso shot' : 'Unexpected espresso shot');
  }

  if (cup.hasSteamedMilk === recipe.needsSteamedMilk) {
    score++;
  } else {
    notes.push(recipe.needsSteamedMilk ? 'Missing steamed milk' : 'Unwanted milk added');
  }

  if (cup.hasIce === recipe.needsIce) {
    score++;
  } else {
    notes.push(recipe.needsIce ? 'Should be iced' : 'Should be served hot');
  }

  if (cup.syrup === recipe.syrup) {
    score++;
  } else {
    notes.push(
      recipe.syrup === 'none'
        ? `Unwanted ${cup.syrup} syrup`
        : `Needed ${recipe.syrup} syrup`
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
  customerPatience: number
): { totalPayout: number; basePrice: number; tip: number } {
  const basePrice = Math.max(1, Math.round(recipe.price * (accuracy / 100)));
  let upgradeBonus = 0;
  for (const upg of state.upgrades) {
    if (!upg.purchased) continue;
    if (upg.id === 'precision-burr-grinder') upgradeBonus += 2;
    if (upg.id === 'audiophile-tube-preamp') upgradeBonus += 3;
    if (upg.id === 'monstera-greenhouse-canopy') upgradeBonus += 4;
  }

  const speedTip = accuracy === 100 ? Math.max(1, Math.round((customerPatience / 100) * 4)) : 0;
  const tip = accuracy >= 75 ? speedTip + upgradeBonus : 0;
  return {
    totalPayout: basePrice + tip,
    basePrice,
    tip,
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
      currentCup: createEmptyCup(),
      lastActionFeedback: 'Rinsed ceramic cup & portafilter in the stainless sink.',
    };
  }

  if (action === 'quick_brew_step') {
    const pinnedOrder =
      state.customers.find((c) => c.id === state.pinnedOrderId && c.state === 'ordering') ||
      state.customers.find((c) => c.state === 'ordering');
    const targetRecipe = pinnedOrder ? getRecipeById(pinnedOrder.recipeId) : RECIPES[1];
    const step = getNextRecommendedStep(cup, targetRecipe);
    activeStation = step.station;

    if (step.toolKey === 'grinder') {
      cup.hasGrounds = true;
      feedback = 'Ground 18g of fresh Arabica beans into the portafilter.';
    } else if (step.toolKey === 'tamper') {
      cup.isTamped = true;
      feedback = 'Tamped coffee puck evenly at 30 lbs of pressure.';
    } else if (step.toolKey === 'espresso') {
      cup.hasEspresso = true;
      feedback = 'Extracted rich 9-bar double espresso with golden crema!';
    } else if (step.toolKey === 'syrup') {
      cup.syrup = targetRecipe.syrup;
      feedback = `Added aromatic ${targetRecipe.syrup} infusion to the cup.`;
    } else if (step.toolKey === 'ice') {
      cup.hasIce = true;
      feedback = 'Scooped crystal-clear ice cubes into the glass.';
    } else if (step.toolKey === 'milk') {
      cup.hasSteamedMilk = true;
      feedback = 'Steamed 65°C velvety microfoam & poured rosette latte art!';
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
    feedback = 'Tamped grounds level & polished puck surface.';
  } else if (action === 'pull_espresso') {
    cup.hasGrounds = true;
    cup.isTamped = true;
    cup.hasEspresso = true;
    activeStation = 2;
    feedback = 'Pulled 9-bar double espresso shot into ceramic mug!';
  } else if (action === 'steam_milk') {
    cup.hasSteamedMilk = true;
    activeStation = 3;
    feedback = 'Steamed silky 65°C microfoam milk & poured latte art.';
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
  const evaluation = evaluateDrinkMatch(state.currentCup, recipe);
  const payout = calculateDrinkPayout(
    state,
    recipe,
    evaluation.accuracy,
    targetCustomer.patience
  );

  // Find available garden table seat (0, 1, 2)
  const occupiedSeats = new Set(
    state.customers.filter((c) => c.state === 'seated' && c.seatIndex !== null).map((c) => c.seatIndex)
  );
  let assignedSeat: number | null = null;
  for (let i = 0; i < 3; i++) {
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

  // Spawn a replacement customer if fewer than 3 ordering
  const remainingOrdering = updatedCustomers.filter((c) => c.state === 'ordering');
  if (remainingOrdering.length < 2) {
    updatedCustomers.push(spawnCustomerOrder(state.day, updatedCustomers.length));
  }

  const nextOrdering = updatedCustomers.find((c) => c.state === 'ordering');
  const newCash = state.cash + payout.totalPayout;
  const newDailyRevenue = state.dailyRevenue + payout.totalPayout;
  const newCupsToday = state.cupsServedToday + 1;
  const newTotalCups = state.totalCupsServed + 1;
  const newSatisfaction = Math.min(
    100,
    Math.max(0, Math.round(state.satisfactionScore * 0.85 + evaluation.accuracy * 0.15))
  );

  const feedbackMsg = evaluation.isPerfect
    ? `Served Perfect ${recipe.name} to ${targetCustomer.customerName}! Earned +$${payout.totalPayout} ($${payout.tip} tip)`
    : `Served ${recipe.name} (${evaluation.accuracy}% match) to ${targetCustomer.customerName} for +$${payout.totalPayout}.`;

  return {
    ...state,
    cash: newCash,
    dailyRevenue: newDailyRevenue,
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
  const nameIdx = (day * 3 + seedOffset * 5 + Math.floor(Math.random() * 100)) % CUSTOMER_NAMES.length;

  return {
    id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    customerName: CUSTOMER_NAMES[nameIdx],
    avatarColor: AVATAR_COLORS[nameIdx % AVATAR_COLORS.length],
    shirtColor: SHIRT_COLORS[(nameIdx + seedOffset) % SHIRT_COLORS.length],
    recipeId: recipe.id,
    patience: 100,
    maxPatience: 100,
    state: 'ordering',
    seatIndex: null,
    seatedTimer: 0,
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
  const patienceDecayRate = state.mode === 'zen' ? 0 : hasPidBoiler ? 0.85 : 1.25;

  let bonusTableTip = 0;
  let tipMessage: string | null = null;

  const nextCustomers: CustomerOrder[] = [];
  for (const cust of state.customers) {
    if (cust.state === 'ordering') {
      const nextPatience = Math.max(10, cust.patience - patienceDecayRate * dt);
      nextCustomers.push({
        ...cust,
        patience: nextPatience,
      });
    } else if (cust.state === 'seated') {
      const remaining = cust.seatedTimer - dt;
      if (remaining <= 0) {
        bonusTableTip += 2;
        tipMessage = `${cust.customerName} loved the Garage Garden vibe and left a +$2 table tip!`;
      } else {
        nextCustomers.push({
          ...cust,
          seatedTimer: remaining,
        });
      }
    }
  }

  // Keep at least 2 ordering customers in queue
  const orderingCount = nextCustomers.filter((c) => c.state === 'ordering').length;
  if (orderingCount < 2) {
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
  const nextDay = state.day + 1;
  const nextGoal = Math.round(state.dailyGoal * 1.25 + 10);
  const c1 = spawnCustomerOrder(nextDay, 1);
  const c2 = spawnCustomerOrder(nextDay, 2);

  return {
    ...state,
    phase: 'playing',
    day: nextDay,
    dailyRevenue: 0,
    dailyGoal: nextGoal,
    cupsServedToday: 0,
    shiftTimeRemaining: 150,
    currentCup: createEmptyCup(),
    customers: [c1, c2],
    pinnedOrderId: c1.id,
    lastActionFeedback: `Day ${nextDay} Shift started! Daily Goal: $${nextGoal}`,
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
      version: '1.2.0',
      studio: 'BoostedByCaffeine Studios',
      timestamp: new Date().toISOString(),
      data: {
        day: state.day,
        cash: state.cash,
        dailyGoal: state.dailyGoal,
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
    return {
      ...base,
      day: Math.max(1, Math.floor(d.day)),
      cash: Math.max(0, Math.floor(d.cash)),
      dailyGoal: typeof d.dailyGoal === 'number' ? d.dailyGoal : base.dailyGoal,
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
