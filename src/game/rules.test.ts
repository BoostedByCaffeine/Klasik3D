import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGameState,
  createEmptyCup,
  getRecipeById,
  evaluateDrinkMatch,
  performCupAction,
  serveCurrentCupToCustomer,
  purchaseUpgrade,
  exportSaveJson,
  importSaveJson,
  spawnCustomerOrder,
} from './rules';

test('evaluateDrinkMatch scores perfect 100% for matching recipe ingredients', () => {
  const recipe = getRecipeById('vanilla-oat-latte');
  const cup = {
    hasGrounds: true,
    isTamped: true,
    hasEspresso: true,
    hasSteamedMilk: true,
    hasIce: false,
    syrup: 'vanilla' as const,
  };
  const result = evaluateDrinkMatch(cup, recipe);
  assert.equal(result.accuracy, 100);
  assert.equal(result.isPerfect, true);
  assert.equal(result.notes.length, 0);
});

test('performCupAction quick_brew_step advances through espresso, milk, and serving', () => {
  let state = createInitialGameState();
  assert.equal(state.currentCup.hasGrounds, false);

  state = performCupAction(state, 'quick_brew_step'); // grind
  assert.equal(state.currentCup.hasGrounds, true);

  state = performCupAction(state, 'quick_brew_step'); // tamp
  assert.equal(state.currentCup.isTamped, true);

  state = performCupAction(state, 'quick_brew_step'); // pull espresso
  assert.equal(state.currentCup.hasEspresso, true);

  state = performCupAction(state, 'quick_brew_step'); // steam milk
  assert.equal(state.currentCup.hasSteamedMilk, true);

  const initialCash = state.cash;
  state = performCupAction(state, 'quick_brew_step'); // serve drink
  assert.equal(state.cupsServedToday, 1);
  assert.ok(state.cash > initialCash);
  assert.deepEqual(state.currentCup, createEmptyCup());
});

test('serveCurrentCupToCustomer seats the served customer at a Garage Garden table', () => {
  let state = createInitialGameState();
  state.currentCup = {
    hasGrounds: true,
    isTamped: true,
    hasEspresso: true,
    hasSteamedMilk: true,
    hasIce: false,
    syrup: 'none',
  };
  const nextState = serveCurrentCupToCustomer(state);
  const seatedCustomers = nextState.customers.filter((c) => c.state === 'seated');
  assert.equal(seatedCustomers.length, 1);
  assert.equal(seatedCustomers[0].seatIndex, 0);
});

test('spawnCustomerOrder generates natural dialogue, custom add-on badges, and social behavior', () => {
  const order = spawnCustomerOrder(2, 3);
  assert.ok(order.dialogueLine.length > 10);
  assert.ok(order.customAddons.length >= 1);
  assert.ok(order.customBonusTip >= 2);
  assert.ok(['selfie', 'chatting', 'laptop', 'relaxing'].includes(order.socialBehavior));
});

test('purchaseUpgrade deducts cash and marks upgrade as purchased', () => {
  let state = createInitialGameState();
  state.cash = 100;
  const nextState = purchaseUpgrade(state, 'precision-burr-grinder');
  const upg = nextState.upgrades.find((u) => u.id === 'precision-burr-grinder');
  assert.equal(upg?.purchased, true);
  assert.equal(nextState.cash, 75);
});

test('exportSaveJson and importSaveJson round-trip game state accurately', () => {
  let state = createInitialGameState();
  state.day = 4;
  state.cash = 148;
  state.decor.counterWood = 'white-oak';
  const json = exportSaveJson(state);
  const restored = importSaveJson(json);
  assert.ok(restored);
  assert.equal(restored.day, 4);
  assert.equal(restored.cash, 148);
  assert.equal(restored.decor.counterWood, 'white-oak');
});
