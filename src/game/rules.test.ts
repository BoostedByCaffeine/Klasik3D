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
  validateDrinkForServe,
  getStepDurationMs,
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
  stripKeyboardShortcutsForApk,
  MIATA_BAY,
  LOUNGE_TABLE_LAYOUT,
  LOUNGE_SEAT_COORDS,
  isClearOfMiataBay,
  normalizeGraphicsQuality,
  STORAGE_GFX_KEY,
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

test('performCupAction enforces strict sequential step order and blocks premature serve cash exploit', () => {
  let state = createInitialGameState();
  const initialCash = state.cash;

  // 1. Attempting to serve an empty/incomplete cup MUST be blocked with $0 cash awarded!
  state = serveCurrentCupToCustomer(state);
  assert.equal(state.cash, initialCash);
  assert.equal(state.cupsServedToday, 0);
  assert.ok(state.lastActionFeedback.includes('Drink incomplete!'));

  // 2. Attempting to Tamp or Pull Espresso before Grinding MUST be locked!
  state = performCupAction(state, 'tamp');
  assert.equal(state.currentCup.isTamped, false);
  state = performCupAction(state, 'pull_espresso');
  assert.equal(state.currentCup.hasEspresso, false);

  // 3. Valid sequential steps via quick_brew_step
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

  state = performCupAction(state, 'quick_brew_step'); // serve drink -> auto-syncs to Station 4
  assert.equal(state.cupsServedToday, 1);
  assert.equal(state.activeStation, 4);
  assert.ok(state.cash > initialCash);
  assert.deepEqual(state.currentCup, createEmptyCup());
});

test('validateDrinkForServe and serveCurrentCupToCustomer penalize wrong ingredients with customer complaint, $0 tip, and -8% Vibe', () => {
  let state = createInitialGameState();
  const initialCash = state.cash;
  const initialSatisfaction = state.satisfactionScore;

  // Maya ordered a hot Garage Velvet Latte (no syrup, no ice). Add all base steps + unrequested Chocolate syrup!
  state.currentCup = {
    hasGrounds: true,
    isTamped: true,
    hasEspresso: true,
    hasSteepedTea: false,
    hasSteamedMilk: true,
    hasIce: false,
    syrup: 'chocolate',
  };

  const validation = validateDrinkForServe(
    state.currentCup,
    getRecipeById('velvet-latte'),
    state.customers[0]
  );
  assert.equal(validation.isComplete, true);
  assert.equal(validation.hasWrongIngredient, true);

  // Forcing Serve with a wrong ingredient causes customer complaint, $0 payout, and -8% satisfaction
  state = serveCurrentCupToCustomer(state);
  assert.equal(state.cash, initialCash);
  assert.equal(state.cupsServedToday, 0);
  assert.equal(state.satisfactionScore, initialSatisfaction - 8);
  assert.ok(state.lastActionFeedback.includes("Wait—I didn't ask for"));
});

test('getStepDurationMs scales barista step durations with purchased equipment upgrades', () => {
  let state = createInitialGameState();
  assert.equal(getStepDurationMs(state, 'grind'), 1800);
  assert.equal(getStepDurationMs(state, 'tamp'), 1200);
  assert.equal(getStepDurationMs(state, 'pull_espresso'), 2600);
  assert.equal(getStepDurationMs(state, 'steam_milk'), 2200);
  assert.equal(getStepDurationMs(state, 'steep_tea'), 2200);

  state.cash = 500;
  state = purchaseUpgrade(state, 'precision-burr-grinder');
  state = purchaseUpgrade(state, 'dual-pid-boiler');
  state = purchaseUpgrade(state, 'kyoto-glass-tea-siphon');

  assert.ok(getStepDurationMs(state, 'grind') < 1800);
  assert.ok(getStepDurationMs(state, 'tamp') < 1200);
  assert.ok(getStepDurationMs(state, 'pull_espresso') < 2600);
  assert.ok(getStepDurationMs(state, 'steam_milk') < 2200);
  assert.ok(getStepDurationMs(state, 'steep_tea') < 2200);
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

test('Golden Espresso Machine requires 150k gross income and doubles (2x) all drink sale income once equipped', () => {
  assert.equal(GOLDEN_MACHINE_GROSS_THRESHOLD, 150000);
  let state = createInitialGameState();
  const recipe = getRecipeById('velvet-latte');

  const normalPayout = calculateDrinkPayout(state, recipe, 100, 100, 2);
  assert.equal(normalPayout.multiplier, 1);

  // Cannot equip before reaching $150,000 gross income (even at $100,000!)
  state.lifetimeGrossIncome = 100000;
  state = unlockOrEquipEquipmentSkin(state, 'golden-espresso-machine');
  assert.notEqual(state.equippedMachineSkin, 'golden-espresso-machine');

  // Reach $150,000 gross income milestone
  state = reachGoldenMachineMilestone(state);
  assert.ok(state.lifetimeGrossIncome >= 150000);
  assert.equal(state.equippedMachineSkin, 'golden-espresso-machine');

  const goldenPayout = calculateDrinkPayout(state, recipe, 100, 100, 2);
  assert.equal(goldenPayout.multiplier, 2);
  assert.equal(goldenPayout.totalPayout, normalPayout.totalPayout * 2);
});

test('claimLoginReward blocks premature claiming and grants cash & skins once active shift time and order milestones are met', () => {
  let state = createInitialGameState();
  const initialCash = state.cash;

  // Attempt to claim Tier 2 before meeting 25m (1500s) active shift play & 45 orders served -> blocked!
  state = claimLoginReward(state, 2);
  assert.equal(state.cash, initialCash);
  assert.ok(state.lastActionFeedback.includes('Locked!'));

  // Meet verifiable playtime & orders milestone
  state.activeShiftSeconds = 1600;
  state.totalCupsServed = 50;
  state = claimLoginReward(state, 2); // Tier 2 unlocks tokyo-streetwear + $200
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

test('exportSaveJson and importSaveJson round-trip game state, realismMode, 150k Golden Machine qualification, and equipped skins accurately', () => {
  let state = createInitialGameState();
  state.day = 4;
  state.cash = 148;
  state.realismMode = true;
  state.lifetimeGrossIncome = 155000;
  state.activeShiftSeconds = 1850;
  state.equippedMachineSkin = 'golden-espresso-machine';
  state.dailyOrderQuota = 45;
  state.decor.counterWood = 'white-oak';
  const json = exportSaveJson(state);
  const restored = importSaveJson(json);
  assert.ok(restored);
  assert.equal(restored.day, 4);
  assert.equal(restored.cash, 148);
  assert.equal(restored.realismMode, true);
  assert.equal(restored.lifetimeGrossIncome, 155000);
  assert.equal(restored.activeShiftSeconds, 1850);
  assert.equal(restored.equippedMachineSkin, 'golden-espresso-machine');
  assert.equal(restored.dailyOrderQuota, 45);
  assert.equal(restored.decor.counterWood, 'white-oak');

  // Verify Golden Machine cannot be equipped via save import if gross income < $150,000
  state.lifetimeGrossIncome = 105000;
  const underQualifiedRestored = importSaveJson(exportSaveJson(state));
  assert.ok(underQualifiedRestored);
  assert.equal(underQualifiedRestored.equippedMachineSkin, 'classic-steel');
});

import { computeGranularWeatherParams } from './sound';
import {
  resolveRuntimeVersionFromHints,
  resolveShouldShowLandscapeCue,
} from '../pwa/pwaManager';
import { buildNativePhoneSpotifyLinks } from './spotifyManager';

test('computeGranularWeatherParams generates rhythmic roof raindrops for rainy mode and distant birds/wind chimes for sunny modes', () => {
  // Rainy mode: rhythmic roof raindrops across all steps
  for (let i = 0; i < 8; i++) {
    const p = computeGranularWeatherParams('rainy', i);
    assert.ok(['roof_raindrop', 'skylight_patter', 'gutter_drip'].includes(p.grainType));
    assert.ok(p.carrierFreqHz >= 300 && p.carrierFreqHz <= 1600);
    assert.ok(p.durationSec >= 0.02 && p.durationSec <= 0.12);
    assert.ok(p.pan >= -1 && p.pan <= 1);
  }

  // Sunny (morning & golden) modes: alternates distant bird chirps and pentatonic wind chimes
  const morningBird = computeGranularWeatherParams('morning', 0);
  const morningChime = computeGranularWeatherParams('morning', 1);
  assert.equal(morningBird.grainType, 'distant_bird');
  assert.equal(morningChime.grainType, 'wind_chime');
  assert.ok(morningBird.carrierFreqHz > 2000);

  const goldenChime = computeGranularWeatherParams('golden', 2);
  const goldenBird = computeGranularWeatherParams('golden', 3);
  assert.equal(goldenChime.grainType, 'wind_chime');
  assert.equal(goldenBird.grainType, 'distant_bird');
});

test('resolveRuntimeVersionFromHints distinguishes web, pwa, and apk runtime versions accurately', () => {
  assert.equal(
    resolveRuntimeVersionFromHints({
      queryPlatform: null,
      envPlatform: undefined,
      protocol: 'https:',
      userAgent: 'Mozilla/5.0 Chrome/125.0',
      isStandaloneDisplay: false,
      isCapacitorNative: false,
    }),
    'web'
  );

  assert.equal(
    resolveRuntimeVersionFromHints({
      queryPlatform: null,
      envPlatform: undefined,
      protocol: 'https:',
      userAgent: 'Mozilla/5.0 Chrome/125.0',
      isStandaloneDisplay: true,
      isCapacitorNative: false,
    }),
    'pwa'
  );

  assert.equal(
    resolveRuntimeVersionFromHints({
      queryPlatform: null,
      envPlatform: 'apk',
      protocol: 'https:',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UQ1A; wv)',
      isStandaloneDisplay: false,
      isCapacitorNative: true,
    }),
    'apk'
  );

  assert.equal(
    resolveRuntimeVersionFromHints({
      queryPlatform: 'apk',
      envPlatform: undefined,
      protocol: 'http:',
      userAgent: 'Mozilla/5.0',
      isStandaloneDisplay: false,
      isCapacitorNative: false,
    }),
    'apk'
  );
});

test('buildNativePhoneSpotifyLinks generates native spotify: URI and Android intent:// fallback for APK Spotify redirect', () => {
  const links = buildNativePhoneSpotifyLinks('spotify:playlist:37i9dQZF1DX4WYpdgoIcn6');
  assert.equal(links.spotifyDeepLink, 'spotify:playlist:37i9dQZF1DX4WYpdgoIcn6');
  assert.ok(
    links.androidIntentUrl.startsWith(
      'intent://playlist/37i9dQZF1DX4WYpdgoIcn6#Intent;scheme=spotify;package=com.spotify.music;'
    )
  );
  assert.equal(links.webFallbackUrl, 'https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6');
});

import {
  BARISTA_VIBRATION_PATTERNS,
  BaristaHapticEvent,
  getHapticPatternForTool,
  shouldTriggerApkVibration,
  triggerBaristaHaptic,
} from './haptics';

test('Android APK Vibration API gating and barista tool haptic patterns are valid', () => {
  assert.equal(shouldTriggerApkVibration('apk', true), true);
  assert.equal(shouldTriggerApkVibration('apk', false), false);
  assert.equal(shouldTriggerApkVibration('web', true), false);
  assert.equal(shouldTriggerApkVibration('pwa', true), false);

  const events: BaristaHapticEvent[] = [
    'grind',
    'tamp',
    'pull_espresso',
    'steep_tea',
    'steam_milk',
    'add_ice',
    'add_syrup',
    'whisk_matcha',
    'rinse_cup',
    'serve_success',
    'blocked_or_error',
  ];

  for (const evt of events) {
    const pattern = getHapticPatternForTool(evt);
    assert.ok(Array.isArray(pattern) && pattern.length >= 3);
    for (const ms of pattern) {
      assert.ok(ms > 0 && ms <= 100);
    }
    assert.deepEqual(pattern, BARISTA_VIBRATION_PATTERNS[evt]);
  }
});

test('triggerBaristaHaptic dispatches navigator.vibrate only in Android APK runtime', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const calls: Array<number | number[]> = [];

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      vibrate: (pattern: number | number[]) => {
        calls.push(pattern);
        return true;
      },
    },
  });

  try {
    assert.equal(triggerBaristaHaptic('grind', 'web'), false);
    assert.equal(triggerBaristaHaptic('serve_success', 'pwa'), false);
    assert.equal(calls.length, 0);

    assert.equal(triggerBaristaHaptic('grind', 'apk'), true);
    assert.equal(triggerBaristaHaptic('serve_success', 'apk'), true);
    assert.equal(triggerBaristaHaptic('blocked_or_error', 'apk'), true);
    assert.equal(calls.length, 3);
    assert.deepEqual(calls[0], BARISTA_VIBRATION_PATTERNS.grind);
    assert.deepEqual(calls[1], BARISTA_VIBRATION_PATTERNS.serve_success);
    assert.deepEqual(calls[2], BARISTA_VIBRATION_PATTERNS.blocked_or_error);
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'navigator', originalDescriptor);
    }
  }
});

test('stripKeyboardShortcutsForApk removes bracketed keyboard hints only for Android APK version', () => {
  const sample = 'Stainless Rinse Sink [Key R] — Click to Dump & Rinse Cup [R]';
  assert.equal(stripKeyboardShortcutsForApk(sample, false), sample);
  assert.equal(
    stripKeyboardShortcutsForApk(sample, true),
    'Stainless Rinse Sink — Click to Dump & Rinse Cup'
  );
});

test('Phase 3: graphicsQuality defaults to low on fresh startup and normalizes unknown values to low', () => {
  const initial = createInitialGameState();
  assert.equal(initial.graphicsQuality, 'low');
  assert.equal(STORAGE_GFX_KEY, 'klasik3d_gfx_quality_v2');
  assert.equal(normalizeGraphicsQuality(undefined), 'low');
  assert.equal(normalizeGraphicsQuality('medium'), 'low');
  assert.equal(normalizeGraphicsQuality('low'), 'low');
  assert.equal(normalizeGraphicsQuality('max'), 'max');
});

test('Phase 2: resolveShouldShowLandscapeCue gates the 1s landscape indicator to mobile/PWA/APK only', () => {
  // Desktop mouse/keyboard browser -> skip
  assert.equal(
    resolveShouldShowLandscapeCue({
      appVersion: 'web',
      isCapacitorNative: false,
      isStandaloneDisplay: false,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126.0',
      hasCoarsePointer: false,
      maxTouchPoints: 0,
    }),
    false
  );

  // Android Capacitor APK -> show
  assert.equal(
    resolveShouldShowLandscapeCue({
      appVersion: 'apk',
      isCapacitorNative: true,
      isStandaloneDisplay: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv)',
      hasCoarsePointer: true,
      maxTouchPoints: 5,
    }),
    true
  );

  // Mobile standalone PWA -> show
  assert.equal(
    resolveShouldShowLandscapeCue({
      appVersion: 'pwa',
      isCapacitorNative: false,
      isStandaloneDisplay: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Mobile) Chrome/126.0',
      hasCoarsePointer: true,
      maxTouchPoints: 5,
    }),
    true
  );

  // Explicit query override for deterministic QA
  assert.equal(
    resolveShouldShowLandscapeCue({
      queryForceCue: '1',
      appVersion: 'web',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/126.0',
      hasCoarsePointer: false,
      maxTouchPoints: 0,
    }),
    true
  );
  assert.equal(
    resolveShouldShowLandscapeCue({
      queryForceCue: '0',
      appVersion: 'apk',
      isCapacitorNative: true,
    }),
    false
  );
});

test('Phase 6: every Garage-Garden lounge table and chair is strictly clear of the 1990 Miata MX-5 showroom bay', () => {
  assert.ok(LOUNGE_TABLE_LAYOUT.length >= 4);
  assert.ok(LOUNGE_SEAT_COORDS.length >= 6);

  for (const table of LOUNGE_TABLE_LAYOUT) {
    assert.ok(
      isClearOfMiataBay(table.x, table.z, table.radius),
      `Table ${table.id} at (${table.x}, ${table.z}) overlaps MIATA_BAY`
    );
    const distToMiata = Math.hypot(table.x - MIATA_BAY.centerX, table.z - MIATA_BAY.centerZ);
    assert.ok(
      distToMiata >= 2.8,
      `Table ${table.id} is too close to MIATA_BAY (${distToMiata.toFixed(2)}m)`
    );
    assert.ok(table.x >= -0.35, `Table ${table.id} x=${table.x} crosses into Miata showroom zone`);
  }

  for (const [idx, seat] of LOUNGE_SEAT_COORDS.entries()) {
    const distToMiata = Math.hypot(seat.x - MIATA_BAY.centerX, seat.z - MIATA_BAY.centerZ);
    assert.ok(
      distToMiata >= 2.4,
      `Seat ${idx} at (${seat.x}, ${seat.z}) is too close to MIATA_BAY (${distToMiata.toFixed(2)}m)`
    );
  }
});




