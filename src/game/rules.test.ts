import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECIPES,
  INITIAL_UPGRADES,
  INITIAL_EQUIPMENT_SKINS,
  INITIAL_CUSTOMER_SKIN_PACKS,
  INITIAL_LOGIN_REWARDS,
  GOLDEN_MACHINE_GROSS_THRESHOLD,
  createInitialGameState,
  createEmptyCup,
  getRecipeById,
  getDailyOrderQuota,
  evaluateDrinkMatch,
  calculateDrinkPayout,
  performCupAction,
  serveCurrentCupToCustomer,
  purchaseUpgrade,
  claimLoginReward,
  reachGoldenMachineMilestone,
  unlockOrEquipEquipmentSkin,
  exportSaveJson,
  importSaveJson,
  spawnCustomerOrder,
} from './rules';

test('evaluateDrinkMatch scores perfect 100% for matching coffee and artisanal tea recipes', () => {
  const recipe = getRecipeById('vanilla-oat-latte');
  const cup = {
    hasGrounds: true,
    isTamped: true,
    hasEspresso: true,
    hasSteepedTea: false,
    hasSteamedMilk: true,
    hasIce: false,
    syrup: 'vanilla' as const,
  };
  const result = evaluateDrinkMatch(cup, recipe);
  assert.equal(result.accuracy, 100);
  assert.equal(result.isPerfect, true);
  assert.equal(result.notes.length, 0);

  // Test Artisanal Tea & Cold Drink evaluation
  const teaRecipe = getRecipeById('london-fog-tea-latte');
  const teaCup = {
    hasGrounds: false,
    isTamped: false,
    hasEspresso: false,
    hasSteepedTea: true,
    hasSteamedMilk: true,
    hasIce: false,
    syrup: 'vanilla' as const,
  };
  const teaResult = evaluateDrinkMatch(teaCup, teaRecipe);
  assert.equal(teaResult.accuracy, 100);
  assert.equal(teaResult.isPerfect, true);
});

test('getDailyOrderQuota scales from 30 orders on Day 1 to 50 orders on Day 5+', () => {
  assert.equal(getDailyOrderQuota(1), 30);
  assert.equal(getDailyOrderQuota(2), 35);
  assert.equal(getDailyOrderQuota(3), 40);
  assert.equal(getDailyOrderQuota(4), 45);
  assert.equal(getDailyOrderQuota(5), 50);
  assert.equal(getDailyOrderQuota(8), 50);
});

test('performCupAction quick_brew_step advances through espresso, milk, and serving with station sync', () => {
  let state = createInitialGameState();
  assert.equal(state.currentCup.hasGrounds, false);

  state = performCupAction(state, 'quick_brew_step'); // grind
  assert.equal(state.currentCup.hasGrounds, true);
  assert.equal(state.activeStation, 2);

  state = performCupAction(state, 'quick_brew_step'); // tamp
  assert.equal(state.currentCup.isTamped, true);

  state = performCupAction(state, 'quick_brew_step'); // pull espresso -> auto-syncs to Station 3
  assert.equal(state.currentCup.hasEspresso, true);
  assert.equal(state.activeStation, 3);

  state = performCupAction(state, 'quick_brew_step'); // steam milk
  assert.equal(state.currentCup.hasSteamedMilk, true);

  const initialCash = state.cash;
  state = performCupAction(state, 'quick_brew_step'); // serve drink -> auto-syncs to Station 4
  assert.equal(state.cupsServedToday, 1);
  assert.equal(state.activeStation, 4);
  assert.ok(state.cash > initialCash);
  assert.deepEqual(state.currentCup, createEmptyCup());
});

test('performCupAction steep_tea brews Artisanal Tea & Cold Refreshers step-by-step', () => {
  let state = createInitialGameState();
  // Pin Customer 3 (Sora - ordering Earl Grey Vanilla London Fog)
  state.pinnedOrderId = 'cust-initial-3';

  state = performCupAction(state, 'quick_brew_step'); // steep_tea at Station 3
  assert.equal(state.currentCup.hasSteepedTea, true);
  assert.equal(state.activeStation, 3);

  state = performCupAction(state, 'quick_brew_step'); // add vanilla syrup
  assert.equal(state.currentCup.syrup, 'vanilla');

  state = performCupAction(state, 'quick_brew_step'); // steam milk
  assert.equal(state.currentCup.hasSteamedMilk, true);

  const cashBefore = state.cash;
  state = performCupAction(state, 'quick_brew_step'); // serve drink
  assert.ok(state.cash > cashBefore);
});

test('Golden Espresso Machine unlocks at 100k gross income and doubles (2x) all drink sale income once equipped', () => {
  let state = createInitialGameState();
  const recipe = getRecipeById('velvet-latte');

  const normalPayout = calculateDrinkPayout(state, recipe, 100, 100, 2);
  assert.equal(normalPayout.multiplier, 1);

  // Cannot equip before reaching $100,000 gross income
  state = unlockOrEquipEquipmentSkin(state, 'golden-espresso-machine');
  assert.notEqual(state.equippedMachineSkin, 'golden-espresso-machine');

  // Reach $100,000 gross income milestone
  state = reachGoldenMachineMilestone(state);
  assert.ok(state.lifetimeGrossIncome >= GOLDEN_MACHINE_GROSS_THRESHOLD);
  assert.equal(state.equippedMachineSkin, 'golden-espresso-machine');

  const goldenPayout = calculateDrinkPayout(state, recipe, 100, 100, 2);
  assert.equal(goldenPayout.multiplier, 2);
  assert.equal(goldenPayout.totalPayout, normalPayout.totalPayout * 2);
});

test('claimLoginReward grants cash, gross income progress, and unlocks special skins', () => {
  let state = createInitialGameState();
  const initialCash = state.cash;
  state = claimLoginReward(state, 2); // Day 2 unlocks tokyo-streetwear + $200
  assert.equal(state.cash, initialCash + 200);
  const pack = state.customerSkinPacks.find((p) => p.id === 'tokyo-streetwear');
  assert.equal(pack?.unlocked, true);
});

test('catalog contains 50+ unique recipes, upgrades, equipment skins, customer packs, login rewards, and decor options', () => {
  const decorCount = 5 + 6 + 5 + 2; // counterWood (5) + mugColor (6) + neonSignColor (5) + plantDensity (2) = 18
  const totalUniqueItems =
    RECIPES.length +
    INITIAL_UPGRADES.length +
    INITIAL_EQUIPMENT_SKINS.length +
    INITIAL_CUSTOMER_SKIN_PACKS.length +
    INITIAL_LOGIN_REWARDS.length +
    decorCount;
  assert.ok(totalUniqueItems >= 55, `Expected 55+ items, got ${totalUniqueItems}`);
});

test('serveCurrentCupToCustomer seats the served customer at a Garage Garden table and awards +$50 quota bonus on completion', () => {
  let state = createInitialGameState();
  state.cupsServedToday = state.dailyOrderQuota - 1;
  state.currentCup = {
    hasGrounds: true,
    isTamped: true,
    hasEspresso: true,
    hasSteepedTea: false,
    hasSteamedMilk: true,
    hasIce: false,
    syrup: 'none',
  };
  const prevCash = state.cash;
  const nextState = serveCurrentCupToCustomer(state);
  const seatedCustomers = nextState.customers.filter((c) => c.state === 'seated');
  assert.equal(seatedCustomers.length, 1);
  assert.equal(seatedCustomers[0].seatIndex, 0);
  assert.equal(nextState.quotaBonusAwarded, true);
  assert.ok(nextState.cash >= prevCash + 50);
});

test('spawnCustomerOrder generates natural dialogue, custom add-on badges, and social behavior including car_selfie', () => {
  const order = spawnCustomerOrder(2, 3);
  assert.ok(order.dialogueLine.length > 10);
  assert.ok(order.customAddons.length >= 1);
  assert.ok(order.customBonusTip >= 2);
  assert.ok(
    ['selfie', 'chatting', 'laptop', 'relaxing', 'car_selfie'].includes(order.socialBehavior)
  );
});

test('purchaseUpgrade deducts cash and marks upgrade as purchased', () => {
  let state = createInitialGameState();
  state.cash = 100;
  const nextState = purchaseUpgrade(state, 'precision-burr-grinder');
  const upg = nextState.upgrades.find((u) => u.id === 'precision-burr-grinder');
  assert.equal(upg?.purchased, true);
  assert.equal(nextState.cash, 65);
});

test('exportSaveJson and importSaveJson round-trip game state, lifetimeGrossIncome, and equipped skins accurately', () => {
  let state = createInitialGameState();
  state.day = 4;
  state.cash = 148;
  state.lifetimeGrossIncome = 105000;
  state.equippedMachineSkin = 'golden-espresso-machine';
  state.dailyOrderQuota = 45;
  state.decor.counterWood = 'white-oak';
  const json = exportSaveJson(state);
  const restored = importSaveJson(json);
  assert.ok(restored);
  assert.equal(restored.day, 4);
  assert.equal(restored.cash, 148);
  assert.equal(restored.lifetimeGrossIncome, 105000);
  assert.equal(restored.equippedMachineSkin, 'golden-espresso-machine');
  assert.equal(restored.dailyOrderQuota, 45);
  assert.equal(restored.decor.counterWood, 'white-oak');
});
