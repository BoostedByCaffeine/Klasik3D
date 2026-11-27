// Pure Onboarding State & Interactive First-Drink Barista Tutorial Resolver.
// Zero DOM or Three.js dependencies so all tutorial logic can be unit-tested in node:test.

import {
  BaristaStationId,
  KlasikGameState,
  getEffectiveRecipeForOrder,
  getNextRecommendedStep,
  getPastryById,
  getRecipeById,
} from './rules';

export const DEV_NOTE_SEEN_STORAGE_KEY = 'klasik3d_dev_note_seen_v1';
export const TUTORIAL_STATUS_STORAGE_KEY = 'klasik3d_tutorial_status_v1';

export type TutorialStatus = 'pending' | 'active' | 'completed' | 'skipped';

export interface TutorialStepGuide {
  stepNumber: number;
  totalSteps: number;
  stepId:
    | 'wait_customer'
    | 'accept_order'
    | 'grinder'
    | 'tamper'
    | 'espresso'
    | 'finish_drink'
    | 'pastry'
    | 'serve'
    | 'rinse'
    | 'completed';
  title: string;
  instruction: string;
  actionHint: string;
  targetStation: BaristaStationId;
  isError?: boolean;
  isCompleted?: boolean;
}

export function readDeveloperNoteSeen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(DEV_NOTE_SEEN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markDeveloperNoteSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEV_NOTE_SEEN_STORAGE_KEY, '1');
  } catch {
    // ignore storage quota errors
  }
}

export function readTutorialStatus(): TutorialStatus {
  if (typeof window === 'undefined') return 'completed';
  try {
    const val = window.localStorage.getItem(TUTORIAL_STATUS_STORAGE_KEY);
    if (val === 'pending' || val === 'active' || val === 'completed' || val === 'skipped') {
      return val;
    }
    return 'pending';
  } catch {
    return 'pending';
  }
}

export function writeTutorialStatus(status: TutorialStatus): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TUTORIAL_STATUS_STORAGE_KEY, status);
  } catch {
    // ignore storage quota errors
  }
}

const STATION_NAMES: Record<BaristaStationId, string> = {
  1: 'Pastry Case',
  2: 'Orders',
  3: 'Espresso Bar',
  4: 'Milk & Tea',
  5: 'Serve Counter',
  6: 'Audio Deck',
};

export function getStationShortLabel(station: BaristaStationId): string {
  return STATION_NAMES[station] || 'Counter';
}

/**
 * Dynamically derives the current interactive first-drink tutorial step from live gameplay state.
 * Adapts automatically to any recipe (coffee, milk, iced, syrup, tea, or pastry add-on).
 */
export function resolveFirstDrinkTutorialStep(
  state: KlasikGameState,
  baselineCupsServed: number
): TutorialStepGuide {
  const totalSteps = 6;

  // Player finished serving their first drink during this tutorial run!
  if (state.totalCupsServed > baselineCupsServed) {
    return {
      stepNumber: totalSteps,
      totalSteps,
      stepId: 'completed',
      title: 'First Cup Served!',
      instruction:
        'Great job! Explore Menu -> Decor & Weather, pet your cafe cat, or step Outside anytime.',
      actionHint: 'Done',
      targetStation: 5,
      isCompleted: true,
    };
  }

  const orderingCustomers = state.customers.filter((c) => c.state === 'ordering');
  if (orderingCustomers.length === 0) {
    return {
      stepNumber: 1,
      totalSteps,
      stepId: 'wait_customer',
      title: 'Welcome to Your Bar!',
      instruction: 'Your first guest is walking up to the counter now. Get ready to take their order.',
      actionHint: 'Guest arriving...',
      targetStation: 2,
    };
  }

  const acceptedCustomers = orderingCustomers.filter((c) => c.orderAccepted);
  if (acceptedCustomers.length === 0) {
    const firstWaiting = orderingCustomers[0];
    return {
      stepNumber: 1,
      totalSteps,
      stepId: 'accept_order',
      title: 'Accept Your First Order',
      instruction: `${firstWaiting.customerName} is waiting at the counter. Tap "Take Order" or "Accept Order" to begin.`,
      actionHint: 'Tap Take Order',
      targetStation: 2,
    };
  }

  const targetOrder =
    acceptedCustomers.find((c) => c.id === state.pinnedOrderId) || acceptedCustomers[0];
  const baseRecipe = getRecipeById(targetOrder.recipeId);
  const effectiveRecipe = getEffectiveRecipeForOrder(targetOrder, baseRecipe);
  const next = getNextRecommendedStep(state.currentCup, baseRecipe, targetOrder, state.preparedPastry);

  if (next.toolKey === 'rinse' || next.isError) {
    return {
      stepNumber: 2,
      totalSteps,
      stepId: 'rinse',
      title: 'Rinse & Reset Cup',
      instruction: 'A wrong ingredient slipped in—tap Rinse [R] on the Brew bar for a fresh cup.',
      actionHint: 'Tap Rinse [R]',
      targetStation: 3,
      isError: true,
    };
  }

  if (next.toolKey === 'grinder') {
    return {
      stepNumber: 2,
      totalSteps,
      stepId: 'grinder',
      title: `Grind Beans for ${effectiveRecipe.name}`,
      instruction: 'Switch to Brew and tap Grind [G] to dose fresh espresso grounds.',
      actionHint: 'Tap Grind [G]',
      targetStation: 3,
    };
  }

  if (next.toolKey === 'tamper') {
    return {
      stepNumber: 3,
      totalSteps,
      stepId: 'tamper',
      title: 'Tamp the Coffee Puck',
      instruction: 'Tap Tamp [T] on the Brew bar to pack the grounds evenly before pulling.',
      actionHint: 'Tap Tamp [T]',
      targetStation: 3,
    };
  }

  if (next.toolKey === 'espresso') {
    return {
      stepNumber: 4,
      totalSteps,
      stepId: 'espresso',
      title: 'Pull the Espresso Shot',
      instruction: 'Tap Shot [E] to extract a rich double espresso into the mug.',
      actionHint: 'Tap Shot [E]',
      targetStation: 3,
    };
  }

  if (
    next.toolKey === 'tea' ||
    next.toolKey === 'syrup' ||
    next.toolKey === 'ice' ||
    next.toolKey === 'milk'
  ) {
    const finishActionMap = {
      tea: {
        title: `Steep Tea for ${effectiveRecipe.name}`,
        instruction: 'Open the Milk & Tea station and tap Steep Tea to brew the tea base.',
        actionHint: 'Tap Steep Tea',
      },
      syrup: {
        title: `Add ${effectiveRecipe.syrup.toUpperCase()} Flavor`,
        instruction: `Open Milk & Tea and pump ${effectiveRecipe.syrup} flavor into the cup.`,
        actionHint: `Add ${effectiveRecipe.syrup}`,
      },
      ice: {
        title: 'Scoop Crystal Ice',
        instruction: 'Open Milk & Tea and tap Add Ice to chill this iced beverage.',
        actionHint: 'Tap Add Ice',
      },
      milk: {
        title: 'Steam & Pour Milk',
        instruction: 'Open Milk & Tea and tap Steam Milk to pour velvety latte art.',
        actionHint: 'Tap Steam Milk',
      },
    } as const;
    const copy = finishActionMap[next.toolKey];
    return {
      stepNumber: 5,
      totalSteps,
      stepId: 'finish_drink',
      title: copy.title,
      instruction: copy.instruction,
      actionHint: copy.actionHint,
      targetStation: 4,
    };
  }

  if (next.toolKey === 'pastry') {
    const pastry = targetOrder.requestedPastry ? getPastryById(targetOrder.requestedPastry) : null;
    return {
      stepNumber: 5,
      totalSteps,
      stepId: 'pastry',
      title: `Grab ${pastry?.name || 'Pastry'}`,
      instruction: `${targetOrder.customerName} also asked for a ${pastry?.name || 'pastry'}. Grab it from the Pastry Case.`,
      actionHint: `Grab ${pastry?.name || 'Pastry'}`,
      targetStation: 1,
    };
  }

  return {
    stepNumber: 6,
    totalSteps,
    stepId: 'serve',
    title: `Serve ${targetOrder.customerName}`,
    instruction: `Your ${effectiveRecipe.name} is ready! Open Serve and tap Serve [Enter] to hand it over.`,
    actionHint: 'Tap Serve',
    targetStation: 5,
  };
}
