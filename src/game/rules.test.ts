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
  isStepLockActive,
  createActiveStepLock,
  getOrderVesselType,
  isColdOrIcedOrder,
  isRainyWeather,
  isNightWeather,
  normalizeWeatherMode,
  MIN_ARRIVAL_GAP_SEC,
  rollOrderTimeLimitSec,
  rollMoodDurationSec,
  computeSpeedTipBonus,
  computeMoodTipBonus,
  getMoodTier,
  acceptCustomerOrder,
  markCustomerAtCounter,
  advanceSimulationTick,
  CAFE_CATS,
  LILO_REQUIRED_CAT_IDS,
  ALL_CAFE_CAT_IDS,
  getCafeCatSpec,
  purchaseOrEquipCafeCat,
  syncCatUnlocks,
  unlockAllEverythingCheat,
  DAILY_REALTIME_CUP_QUOTA,
  DAILY_QUOTA_COMPLETION_BONUS,
  DELIVERY_PARTNER_BONUS,
  DELIVERY_RIDER_MIN_REGULAR_COOLDOWN,
  MAX_ACTIVE_DELIVERY_RIDERS,
  computeDeliveryRiderProbability,
  PASTRY_CATALOG,
  cycleGraphicsQuality,
  resolveDeviceTimeOfDay,
  resolveCompositeWeather,
  applyWeatherPreferences,
  syncDailyQuotaForDate,
  canClaimLoginReward,
  getLocalDateKey,
  getTimeUntilMidnightLabel,
  formatLocalClock,
  preparePastry,
  returnPreparedPastry,
  isOrderReadyToServe,
  spawnDeliveryRiderOrder,
  getVisibleShopCats,
  SECRET_CAFE_CAT_IDS,
  purchaseCatCosmetic,
  equipCatCosmetic,
  SCENERY_CATALOG,
  PATRON_OUTFIT_CATALOG,
  SECRET_NPC_NAMES,
  SECRET_NPC_COOLDOWN_SEC,
  SECRET_NPC_PATIENCE_DRAIN_MULT,
  SECRET_NPC_TIP_MULTIPLIER,
  isSnowAllowedForScenery,
  isAlwaysWinterScenery,
  clampRainPreferenceForScenery,
  resolveClimateState,
  syncSceneryMilestones,
  purchaseOrEquipScenery,
  purchasePatronOutfit,
  setPatronOutfitAutoMatch,
  toggleCustomPatronOutfit,
  resolvePatronOutfitForSpawn,
  resolveSecretNpcAppearance,
  canSpawnSecretNpc,
  advanceSecretNpcNameIdx,
  ALL_SCENERY_IDS,
  ALL_PATRON_OUTFIT_IDS,
  getScenerySpec,
} from './rules';
import {
  CAT_COSMETICS_CATALOG,
  BASE_CAT_COSMETIC_IDS,
  CAT_FIT_PROFILES,
  CAT_COSMETIC_CLEARANCE,
  DEFAULT_CAT_RIG_DIMENSIONS,
  sampleCatTorsoOuterPoint,
  sampleCatDorsalSplinePoints,
  getCatFitProfile,
  checkDinoCostumeUnlock,
  getEffectiveVisibleLoadout,
  BERET_REVENUE_MILESTONE,
} from './catCosmeticsData';
import {
  CURATED_RADIO_STATIONS,
  filterVerifiedRadioStations,
  resolveStationMirrorUrls,
  cleanAudioFileName,
} from './audio/MusicPlayerController';
import {
  DEFAULT_SIDEWALK_BOUNDS,
  EVEREST_FAR_TRAIL_BOUNDS,
  getSidewalkObstacles,
  computeAvoidedSidewalkZ,
} from './sidewalkAvoidance';
import {
  PEDESTRIAN_CORNER_BOUND,
  ROAD_ELEVATION_LAYERS,
  TRAFFIC_MIN_LANE_SPACING,
  TRAFFIC_X_BOUND,
  computeLeashTransform,
  computeFavelaHouseFloorY,
  evaluateAerialTurnPath,
  evaluateCornerTurnPath,
  getEiffelRoadPose,
  getFavelaHillHeight,
  getJunctionTurnOutZSign,
  getOutdoorLodBudgets,
  getSceneryOutdoorBehaviors,
  getSceneryRoadTopology,
  getSceneryStreetlightSpec,
  hasStreetTrafficScenery,
  isUrbanStreetScenery,
  stepTwoLaneTraffic,
} from './outdoorLod';
import { resolveSecretNpcHairVisibility } from './secretNpc3d';
import { resolveOutdoorVantageForScenery } from './OutdoorOverlookController';

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

test('getDailyOrderQuota returns the unified 35-cup daily real-time owner quota', () => {
  assert.equal(DAILY_REALTIME_CUP_QUOTA, 35);
  assert.equal(DAILY_QUOTA_COMPLETION_BONUS, 120);
  assert.equal(getDailyOrderQuota(1), 35);
  assert.equal(getDailyOrderQuota(2), 35);
  assert.equal(getDailyOrderQuota(5), 35);
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

  // 3. Valid sequential steps via quick_brew_step (6-station layout: 3=Espresso, 4=Tea&Milk, 5=Serve)
  state = performCupAction(state, 'quick_brew_step'); // grind
  assert.equal(state.currentCup.hasGrounds, true);
  assert.equal(state.activeStation, 3);

  state = performCupAction(state, 'quick_brew_step'); // tamp
  assert.equal(state.currentCup.isTamped, true);

  state = performCupAction(state, 'quick_brew_step'); // pull espresso -> stays at Station 3 until milk step
  assert.equal(state.currentCup.hasEspresso, true);

  state = performCupAction(state, 'quick_brew_step'); // steam milk at Station 4
  assert.equal(state.currentCup.hasSteamedMilk, true);
  assert.equal(state.activeStation, 4);

  state = performCupAction(state, 'quick_brew_step'); // serve drink -> auto-syncs to Station 5
  assert.equal(state.cupsServedToday, 1);
  assert.equal(state.activeStation, 5);
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

  state = performCupAction(state, 'quick_brew_step'); // steep_tea at Station 4
  assert.equal(state.currentCup.hasSteepedTea, true);
  assert.equal(state.activeStation, 4);

  state = performCupAction(state, 'quick_brew_step'); // add vanilla syrup
  assert.equal(state.currentCup.syrup, 'vanilla');

  state = performCupAction(state, 'quick_brew_step'); // steam milk
  assert.equal(state.currentCup.hasSteamedMilk, true);

  const cashBefore = state.cash;
  state = performCupAction(state, 'quick_brew_step'); // serve drink
  assert.ok(state.cash > cashBefore);
});

test('Golden Espresso Machine requires 50k gross income (rebalanced from 150k) and doubles (2x) all drink sale income once equipped', () => {
  assert.equal(GOLDEN_MACHINE_GROSS_THRESHOLD, 50000);
  let state = createInitialGameState();
  const recipe = getRecipeById('velvet-latte');

  const normalPayout = calculateDrinkPayout(state, recipe, 100, 100, 2);
  assert.equal(normalPayout.multiplier, 1);

  // Cannot equip before reaching $50,000 gross income
  state.lifetimeGrossIncome = 42000;
  state = unlockOrEquipEquipmentSkin(state, 'golden-espresso-machine');
  assert.notEqual(state.equippedMachineSkin, 'golden-espresso-machine');

  // Reach $50,000 gross income milestone -> unlocks Golden Espresso, Gold Chain, and secret cat Tisay!
  state = reachGoldenMachineMilestone(state);
  assert.ok(state.lifetimeGrossIncome >= 50000);
  assert.equal(state.equippedMachineSkin, 'golden-espresso-machine');
  assert.equal(state.goldenEspressoUnlocked, true);
  assert.ok(state.unlockedCats.includes('tisay'));
  assert.ok(state.secretCatsUnlocked.includes('tisay'));
  assert.ok(state.unlockedCosmetics.includes('gold_chain'));

  const goldenPayout = calculateDrinkPayout(state, recipe, 100, 100, 2);
  assert.equal(goldenPayout.multiplier, 2);
  assert.equal(goldenPayout.totalPayout, normalPayout.totalPayout * 2);
});

test('claimLoginReward enforces strict once-per-24h real-calendar claiming and advances streak on consecutive local days', () => {
  let state = createInitialGameState();
  const initialCash = state.cash;
  const day1 = new Date(2026, 4, 10, 10, 0, 0);
  const sameDayLater = new Date(2026, 4, 10, 22, 30, 0);
  const day2 = new Date(2026, 4, 11, 8, 15, 0);

  assert.equal(canClaimLoginReward(state, day1), true);
  state = claimLoginReward(state, 1, day1);
  assert.ok(state.cash > initialCash);
  assert.equal(state.dailyLogin.lastClaimDateKey, getLocalDateKey(day1));
  assert.equal(state.dailyLogin.claimedToday, true);
  assert.equal(canClaimLoginReward(state, sameDayLater), false);

  // Attempting a second claim on the same real calendar day MUST be blocked!
  const cashAfterDay1 = state.cash;
  const blockedSameDay = claimLoginReward(state, 2, sameDayLater);
  assert.equal(blockedSameDay.cash, cashAfterDay1);
  assert.ok(blockedSameDay.lastActionFeedback.includes('Already claimed'));

  // Next local calendar day allows Day 2 claim (unlocks tokyo-streetwear + $200)
  assert.equal(canClaimLoginReward(state, day2), true);
  const day2State = claimLoginReward(state, 2, day2);
  assert.equal(day2State.cash, cashAfterDay1 + 200);
  const pack = day2State.customerSkinPacks.find((p) => p.id === 'tokyo-streetwear');
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

test('serveCurrentCupToCustomer seats the served customer at a Garage Garden table and awards +$120 daily quota bonus on 35th cup', () => {
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
  assert.ok(nextState.cash >= prevCash + DAILY_QUOTA_COMPLETION_BONUS);
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

test('exportSaveJson and importSaveJson round-trip game state, realismMode, 50k Golden Machine qualification, and equipped skins accurately', () => {
  let state = createInitialGameState();
  state.day = 4;
  state.cash = 148;
  state.realismMode = true;
  state.lifetimeGrossIncome = 55000;
  state.goldenEspressoUnlocked = true;
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
  assert.equal(restored.lifetimeGrossIncome, 55000);
  assert.equal(restored.goldenEspressoUnlocked, true);
  assert.equal(restored.activeShiftSeconds, 1850);
  assert.equal(restored.equippedMachineSkin, 'golden-espresso-machine');
  assert.equal(restored.dailyOrderQuota, 45);
  assert.equal(restored.decor.counterWood, 'white-oak');

  // Verify Golden Machine cannot be equipped via save import if gross income < $50,000 and not unlocked
  state.lifetimeGrossIncome = 35000;
  state.goldenEspressoUnlocked = false;
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
  triggerChampyPurrHaptic,
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

test('Phase 3: graphicsQuality defaults to low on fresh startup and supports calibrated 3-tier LOW -> MEDIUM -> MAX cycle', () => {
  const initial = createInitialGameState();
  assert.equal(initial.graphicsQuality, 'low');
  assert.equal(STORAGE_GFX_KEY, 'klasik3d_gfx_quality_v2');
  assert.equal(normalizeGraphicsQuality(undefined), 'low');
  assert.equal(normalizeGraphicsQuality('medium'), 'medium');
  assert.equal(normalizeGraphicsQuality('low'), 'low');
  assert.equal(normalizeGraphicsQuality('max'), 'max');
  assert.equal(normalizeGraphicsQuality('unknown'), 'low');
  assert.equal(cycleGraphicsQuality('low'), 'medium');
  assert.equal(cycleGraphicsQuality('medium'), 'max');
  assert.equal(cycleGraphicsQuality('max'), 'low');
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

test('Phase 2 Anti-Exploit: authoritative single-flight step lock blocks rapid-tap shortcuts & serves until duration expires', () => {
  let state = createInitialGameState();
  const t0 = 10_000;

  // Create an active lock for 'grind' (1800ms on starter equipment)
  const grindMs = getStepDurationMs(state, 'grind');
  assert.equal(grindMs, 1800);
  const lock = createActiveStepLock(state, 'grind', 2, 'Grinding...', t0);
  assert.equal(isStepLockActive(lock, t0), true);
  assert.equal(isStepLockActive(lock, t0 + 500), true);
  assert.equal(isStepLockActive(lock, t0 + grindMs - 1), true);
  assert.equal(isStepLockActive(lock, t0 + grindMs), false);

  // Attach active lock to state -> rapid-tap quick_brew_step, tamp, pull_espresso, and serve MUST be rejected!
  state = { ...state, activeStepLock: lock };
  const spamQuick = performCupAction(state, 'quick_brew_step', undefined, t0 + 200);
  assert.equal(spamQuick.currentCup.hasGrounds, false);
  assert.equal(spamQuick.currentCup.isTamped, false);

  const spamGrind = performCupAction(state, 'grind', undefined, t0 + 350);
  assert.equal(spamGrind.currentCup.hasGrounds, false);

  // Even if cup were full, serving while locked MUST be rejected!
  const readyLocked = {
    ...state,
    currentCup: {
      hasGrounds: true,
      isTamped: true,
      hasEspresso: true,
      hasSteepedTea: false,
      hasSteamedMilk: true,
      hasIce: false,
      syrup: 'none' as const,
    },
  };
  const spamServe = serveCurrentCupToCustomer(readyLocked, undefined, t0 + 400);
  assert.equal(spamServe.cupsServedToday, 0);
  assert.equal(spamServe.cash, state.cash);

  // Once lock expires (nowMs >= endsAtMs), performCupAction succeeds normally!
  const unlocked = performCupAction(state, 'grind', undefined, t0 + grindMs);
  assert.equal(unlocked.currentCup.hasGrounds, true);
  assert.equal(unlocked.activeStepLock, null);
});

test('Phase 2 Anti-Exploit: fully upgraded equipment durations always remain strictly positive (>= 380ms)', () => {
  let state = createInitialGameState();
  state.cash = 10000;
  for (const upg of INITIAL_UPGRADES) {
    state = purchaseUpgrade(state, upg.id);
  }
  const actions: Array<'grind' | 'tamp' | 'pull_espresso' | 'steep_tea' | 'steam_milk' | 'add_ice' | 'add_syrup' | 'rinse_cup' | 'serve_drink'> = [
    'grind',
    'tamp',
    'pull_espresso',
    'steep_tea',
    'steam_milk',
    'add_ice',
    'add_syrup',
    'rinse_cup',
    'serve_drink',
  ];
  for (const act of actions) {
    const dur = getStepDurationMs(state, act);
    assert.ok(dur >= 380, `Action ${act} duration ${dur}ms fell below minimum realistic floor`);
  }
});

test('Phase 2: getOrderVesselType selects all 4 authentic vessels (hot-mug, iced-glass, hot-takeout, iced-takeout)', () => {
  const initial = createInitialGameState();
  // Maya: Hot Velvet Latte (dine-in) -> hot-mug
  assert.equal(getOrderVesselType(initial.customers[0]), 'hot-mug');
  assert.equal(isColdOrIcedOrder(initial.customers[0]), false);

  // Kenji: Iced Caramel Macchiato (takeout) -> iced-takeout
  assert.equal(getOrderVesselType(initial.customers[1]), 'iced-takeout');
  assert.equal(isColdOrIcedOrder(initial.customers[1]), true);

  // Iced Dine-In -> iced-glass
  assert.equal(
    getOrderVesselType({
      ...initial.customers[0],
      recipeId: 'iced-caramel-macchiato',
      orderType: 'dine-in',
      customNeedsIce: true,
    }),
    'iced-glass'
  );

  // Hot Takeout -> hot-takeout
  assert.equal(
    getOrderVesselType({
      ...initial.customers[0],
      recipeId: 'velvet-latte',
      orderType: 'takeout',
      customNeedsIce: false,
    }),
    'hot-takeout'
  );
});

test('Phase 2: serving a Takeout order routes the customer straight to departing without occupying an indoor lounge chair', () => {
  let state = createInitialGameState();
  // Pin Kenji (takeout Iced Caramel Macchiato)
  state.pinnedOrderId = 'cust-initial-2';
  state.currentCup = {
    hasGrounds: true,
    isTamped: true,
    hasEspresso: true,
    hasSteepedTea: false,
    hasSteamedMilk: true,
    hasIce: true,
    syrup: 'caramel',
  };

  const next = serveCurrentCupToCustomer(state);
  const kenji = next.customers.find((c) => c.id === 'cust-initial-2');
  assert.ok(kenji);
  assert.equal(kenji.orderType, 'takeout');
  assert.equal(kenji.state, 'departing');
  assert.equal(kenji.seatIndex, null);
  assert.ok(next.lastActionFeedback.includes('(Takeout)'));
});

test('Phase 7: Night Shift & Rainy Night weather modes round-trip through save import, helpers, and granular audio params', () => {
  assert.equal(isRainyWeather('rainy'), true);
  assert.equal(isRainyWeather('rainy-night'), true);
  assert.equal(isRainyWeather('night'), false);
  assert.equal(isRainyWeather('morning'), false);

  assert.equal(isNightWeather('night'), true);
  assert.equal(isNightWeather('rainy-night'), true);
  assert.equal(isNightWeather('golden'), false);
  assert.equal(isNightWeather('rainy'), false);

  assert.equal(normalizeWeatherMode('night'), 'night');
  assert.equal(normalizeWeatherMode('rainy-night'), 'rainy-night');
  assert.equal(normalizeWeatherMode('unknown-mode'), 'morning');

  // Granular weather audio for night & rainy-night
  const nightGrain = computeGranularWeatherParams('night', 0);
  assert.equal(nightGrain.grainType, 'wind_chime');
  const rainyNightGrain = computeGranularWeatherParams('rainy-night', 1);
  assert.ok(['roof_raindrop', 'skylight_patter', 'gutter_drip'].includes(rainyNightGrain.grainType));

  // Save/Import round-trip for rainy-night & night
  let state = createInitialGameState();
  state = applyWeatherPreferences(state, 'night', 'rain');
  const restored = importSaveJson(exportSaveJson(state));
  assert.ok(restored);
  assert.equal(restored.weather, 'rainy-night');

  state = applyWeatherPreferences(state, 'night', 'clear');
  const restoredNight = importSaveJson(exportSaveJson(state));
  assert.ok(restoredNight);
  assert.equal(restoredNight.weather, 'night');
});

test('Phase 1: rollMoodDurationSec produces integers in 60..120s and computeMoodTipBonus awards tiered mood tips', () => {
  for (let i = 0; i < 40; i++) {
    const dur = rollMoodDurationSec(() => i / 40);
    assert.ok(Number.isInteger(dur), `Expected integer mood duration, got ${dur}`);
    assert.ok(dur >= 60 && dur <= 120, `Expected 60..120s, got ${dur}`);
    assert.equal(rollOrderTimeLimitSec(() => i / 40), dur);
  }
  assert.equal(rollMoodDurationSec(() => 0), 60);
  assert.equal(rollMoodDurationSec(() => 0.999), 120);

  // Mood 75..100 -> Happy (+$3), 40..74 -> Neutral (+$1), 1..39 -> Impatient ($0)
  assert.equal(getMoodTier(95), 'happy');
  assert.equal(getMoodTier(75), 'happy');
  assert.equal(computeMoodTipBonus(95).tip, 3);
  assert.equal(computeSpeedTipBonus(90, 90, false).tip, 3);

  // Mood 40..74 -> Content (+$1)
  assert.equal(getMoodTier(74), 'content');
  assert.equal(getMoodTier(40), 'content');
  assert.equal(computeMoodTipBonus(55).tip, 1);

  // Mood 1..39 -> Impatient ($0)
  assert.equal(getMoodTier(39), 'impatient');
  assert.equal(getMoodTier(1), 'impatient');
  assert.equal(computeMoodTipBonus(20).tip, 0);
});

test('Phase 1: Barista Order Queueing keeps unaccepted patrons at Mood 100 and drains accepted patrons over 60..120s to dissatisfied $0 walkout', () => {
  let state = createInitialGameState();
  state.phase = 'playing';
  state.mode = 'career';

  // Initial customers start waiting in line with orderAccepted=false and mood=100 (NO drain!)
  assert.equal(state.customers[0].orderAccepted, false);
  assert.equal(state.customers[0].mood, 100);
  const afterWait = advanceSimulationTick(state, 0.25);
  assert.equal(afterWait.customers[0].mood, 100);
  assert.equal(afterWait.customers[1].mood, 100);

  // Reaching counter alone does NOT start draining mood before Barista accepts the order
  const arrived = markCustomerAtCounter(afterWait, afterWait.customers[0].id);
  const afterArrivedWait = advanceSimulationTick(arrived, 0.25);
  assert.equal(afterArrivedWait.customers[0].mood, 100);
  assert.equal(afterArrivedWait.customers[0].orderAccepted, false);

  // Barista accepts Customer 0's order -> orderAccepted=true, mood begins draining over moodDurationSec (100s => 1 pt/s)
  let accepted = acceptCustomerOrder(afterArrivedWait, afterArrivedWait.customers[0].id);
  accepted = {
    ...accepted,
    customers: accepted.customers.map((c, idx) =>
      idx === 0 ? { ...c, moodDurationSec: 100, orderTimeLimitSec: 100, orderTimeRemainingSec: 100, mood: 100, patience: 100 } : c
    ),
  };
  assert.equal(accepted.customers[0].orderAccepted, true);
  assert.equal(accepted.customers[1].orderAccepted, false);

  // 1. Non-recipe modal pauses mood drain completely
  const modalPaused = advanceSimulationTick(accepted, 0.25, { modalOpen: true, isRecipeBookOpen: false });
  assert.equal(modalPaused.customers[0].mood, 100);

  // 2. Recipe Book modal grants 0.35x grace slowdown
  const recipeBookGrace = advanceSimulationTick(accepted, 0.25, { modalOpen: true, isRecipeBookOpen: true });
  assert.ok(Math.abs(recipeBookGrace.customers[0].mood - (100 - 0.25 * 0.35)) < 1e-6);

  // 3. Zen mode pauses mood drain completely
  const zenState = advanceSimulationTick({ ...accepted, mode: 'zen' }, 0.25);
  assert.equal(zenState.customers[0].mood, 100);

  // 4. Normal tick drains accepted customer 0 while keeping unaccepted customer 1 frozen at 100
  const ticked = advanceSimulationTick(accepted, 0.25);
  assert.ok(Math.abs(ticked.customers[0].mood - 99.75) < 1e-6);
  assert.equal(ticked.customers[1].mood, 100);

  // 5. Running accepted customer 0 down to Mood 0 triggers dissatisfied $0 walkout & -8% satisfaction
  const cashBefore = accepted.cash;
  const vibeBefore = accepted.satisfactionScore;
  let expiring = {
    ...accepted,
    customers: accepted.customers.map((c, idx) =>
      idx === 0 ? { ...c, mood: 0.2, patience: 0.2, orderTimeRemainingSec: 0.2 } : c
    ),
  };
  expiring = advanceSimulationTick(expiring, 0.25);
  const walkedOut = expiring.customers.find((c) => c.id === 'cust-initial-1');
  assert.ok(walkedOut);
  assert.equal(walkedOut.state, 'departing');
  assert.equal(walkedOut.moodExpired, true);
  assert.equal(walkedOut.expired, true);
  assert.equal(expiring.cash, cashBefore);
  assert.equal(expiring.satisfactionScore, vibeBefore - 8);
  assert.equal(expiring.missedOrders, 1);
  assert.equal(expiring.lastExpiredEventSeq, 1);
  assert.ok(expiring.lastActionFeedback.includes('left dissatisfied ($0)'));
});

test('Phase 1: staggered spawn guard enforces MIN_ARRIVAL_GAP_SEC >= 3.2s and blocks spawns while an actor is already arriving', () => {
  assert.ok(MIN_ARRIVAL_GAP_SEC >= 3.2);
  let state = createInitialGameState();
  state.phase = 'playing';
  state.customers = [];
  state.nextCustomerSpawnTimer = 0.05;

  // Blocked when activeArrivingCount >= 1
  const blocked = advanceSimulationTick(state, 0.25, { activeArrivingCount: 1 });
  assert.equal(blocked.customers.length, 0);

  // Allowed when doorway/entry is clear (activeArrivingCount === 0)
  const spawned = advanceSimulationTick(state, 0.25, { activeArrivingCount: 0 });
  assert.equal(spawned.customers.length, 1);
  assert.equal(spawned.customers[0].timerStarted, false);
  assert.ok(spawned.nextCustomerSpawnTimer >= MIN_ARRIVAL_GAP_SEC);
});

test('Phase 6: Champy petting & hanging ticket pin haptics work with valid vibration patterns across APK and PWA', () => {
  const petPat = BARISTA_VIBRATION_PATTERNS.pet_champy;
  const pinPat = BARISTA_VIBRATION_PATTERNS.pin_ticket;
  assert.ok(Array.isArray(petPat) && petPat.length >= 3);
  assert.ok(Array.isArray(pinPat) && pinPat.length >= 3);

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
    assert.equal(triggerChampyPurrHaptic('web'), false);
    assert.equal(triggerChampyPurrHaptic('pwa'), true);
    assert.equal(triggerChampyPurrHaptic('apk'), true);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], BARISTA_VIBRATION_PATTERNS.pet_champy);
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'navigator', originalDescriptor);
    }
  }
});

test('Phase 3: All 12 Cafe Cats (9 original + Amby, Gigi, secret Tisay) have exact specs and unlock via revenue, shop adoption, and 7/7 Lilo mastery', () => {
  assert.equal(CAFE_CATS.length, 12);
  assert.equal(LILO_REQUIRED_CAT_IDS.length, 7);
  assert.deepEqual(SECRET_CAFE_CAT_IDS, ['tisay']);

  // Exact heterochromia checks (Chunky = Left Yellow / Right Blue; Cheeto = Left Blue / Right Yellow)
  const chunky = getCafeCatSpec('chunky');
  assert.equal(chunky.leftEyeHex, 0xeab308);
  assert.equal(chunky.rightEyeHex, 0x38bdf8);
  assert.equal(chunky.hasCollar, true);

  const cheeto = getCafeCatSpec('cheeto');
  assert.equal(cheeto.leftEyeHex, 0x38bdf8);
  assert.equal(cheeto.rightEyeHex, 0xeab308);
  assert.equal(cheeto.hasCollar, false);

  // Exact relative scale hierarchy: Kicks (largest) > Mikmik (2nd largest) > Champy (standard); Luna slender; Lilo shortest & chubby
  const kicks = getCafeCatSpec('kicks');
  const mikmik = getCafeCatSpec('mikmik');
  const champy = getCafeCatSpec('champy');
  const luna = getCafeCatSpec('luna');
  const lilo = getCafeCatSpec('lilo');

  assert.equal(kicks.collarThin, true);
  assert.equal(kicks.hasBell, false);
  assert.ok(kicks.scale[1] > mikmik.scale[1]);
  assert.ok(mikmik.scale[1] > champy.scale[1]);
  assert.ok(luna.scale[0] < champy.scale[0]);
  assert.ok(lilo.scale[1] < champy.scale[1]);
  assert.ok(lilo.scale[0] > champy.scale[0]);

  // Automatic Revenue Milestone unlocks ($1000 Chimny, $1500 Chunky, $2000 Kicks, $2250 Cheeto)
  let state = createInitialGameState();
  assert.deepEqual(state.unlockedCats, ['champy']);
  assert.equal(state.equippedCatId, 'champy');

  const sync1500 = syncCatUnlocks(state.unlockedCats, 1500);
  assert.ok(sync1500.unlockedCats.includes('chimny'));
  assert.ok(sync1500.unlockedCats.includes('chunky'));
  assert.ok(!sync1500.unlockedCats.includes('kicks'));

  const sync2250 = syncCatUnlocks(sync1500.unlockedCats, 2250);
  assert.ok(sync2250.unlockedCats.includes('kicks'));
  assert.ok(sync2250.unlockedCats.includes('cheeto'));
  assert.ok(!sync2250.unlockedCats.includes('lilo')); // Still missing shop cats!

  // Shop adoption purchases (Katkat $150, Luna $500, Mikmik $1000) automatically trigger Lilo mastery unlock!
  state = { ...state, cash: 2000, lifetimeGrossIncome: 2250, unlockedCats: sync2250.unlockedCats };
  state = purchaseOrEquipCafeCat(state, 'katkat');
  assert.equal(state.cash, 1850);
  assert.equal(state.equippedCatId, 'katkat');
  assert.ok(!state.unlockedCats.includes('lilo'));

  state = purchaseOrEquipCafeCat(state, 'luna');
  assert.equal(state.cash, 1350);
  assert.equal(state.equippedCatId, 'luna');
  assert.ok(!state.unlockedCats.includes('lilo'));

  state = purchaseOrEquipCafeCat(state, 'mikmik');
  assert.equal(state.cash, 350);
  assert.equal(state.equippedCatId, 'mikmik');
  assert.ok(state.unlockedCats.includes('lilo'), 'Lilo MUST auto-unlock once all 7 prerequisite cats are owned!');
});

test('Phase 3 Passives: Mikmik multiplies drink revenue & mood drain by 1.3x; Lilo disables Customer Mood Meter completely', () => {
  const baseState = createInitialGameState();
  const recipe = getRecipeById('velvet-latte');

  // 1. Mikmik +30% drink revenue multiplier
  const champyPayout = calculateDrinkPayout(baseState, recipe, 100, 100, 2);
  const mikmikState: typeof baseState = {
    ...baseState,
    phase: 'playing',
    unlockedCats: ['champy', 'mikmik'],
    equippedCatId: 'mikmik',
  };
  const mikmikPayout = calculateDrinkPayout(mikmikState, recipe, 100, 100, 2);
  assert.equal(mikmikPayout.catRevenueMultiplier, 1.3);
  assert.equal(mikmikPayout.totalPayout, Math.round(champyPayout.totalPayout * 1.3));

  // 2. Mikmik +30% faster mood drain (40 ticks * 0.25s = 10s elapsed)
  const prepOrderState = (catId: 'champy' | 'mikmik' | 'lilo') => {
    let s = createInitialGameState();
    s.phase = 'playing';
    s.mode = 'career';
    s.unlockedCats = ['champy', 'mikmik', 'lilo'];
    s.equippedCatId = catId;
    s = acceptCustomerOrder(s, 'cust-initial-1');
    s.customers = s.customers.map((c) =>
      c.id === 'cust-initial-1'
        ? { ...c, mood: 100, patience: 100, moodDurationSec: 100, orderTimeLimitSec: 100, orderTimeRemainingSec: 100 }
        : c
    );
    return s;
  };

  let champyAfter = prepOrderState('champy');
  let mikmikAfter = prepOrderState('mikmik');
  for (let i = 0; i < 40; i++) {
    champyAfter = advanceSimulationTick(champyAfter, 0.25);
    mikmikAfter = advanceSimulationTick(mikmikAfter, 0.25);
  }
  assert.ok(Math.abs(champyAfter.customers[0].mood - 90) < 1e-6);
  assert.ok(Math.abs(mikmikAfter.customers[0].mood - 87) < 1e-6);

  // 3. Lilo locks mood at 100 even after long simulation ticks (zero walkouts!)
  let liloState = prepOrderState('lilo');
  liloState.customers = liloState.customers.map((c) =>
    c.id === 'cust-initial-1' ? { ...c, mood: 45, patience: 45 } : c
  );
  let liloAfter = liloState;
  for (let i = 0; i < 40; i++) {
    liloAfter = advanceSimulationTick(liloAfter, 0.25);
  }
  assert.equal(liloAfter.customers[0].mood, 100);
  assert.equal(liloAfter.customers[0].state, 'ordering');
  assert.equal(liloAfter.missedOrders, 0);
});

test('Phase 4 & 5: 7-Cookie Jar cheat unlocks ALL upgrades, skins (incl. Golden Machine), customer packs, login rewards, all 9 cats, exact message, and persists via save JSON', () => {
  const initial = createInitialGameState();
  const unlocked = unlockAllEverythingCheat(initial);

  assert.equal(unlocked.cookieJarCheatUnlocked, true);
  assert.equal(unlocked.lastActionFeedback, 'you got what you wanted, now enjoy');
  assert.ok(unlocked.upgrades.every((u) => u.purchased));
  assert.ok(unlocked.equipmentSkins.every((s) => s.unlocked));
  assert.ok(unlocked.customerSkinPacks.every((p) => p.unlocked));
  assert.ok(unlocked.loginRewards.every((r) => r.claimed));
  for (const catId of ALL_CAFE_CAT_IDS) {
    assert.ok(unlocked.unlockedCats.includes(catId), `Expected cat ${catId} to be unlocked by cheat`);
  }

  // Equip Golden Espresso Machine + Lilo after cheat and verify save/import preserves both!
  let equipped = unlockOrEquipEquipmentSkin(unlocked, 'golden-espresso-machine');
  equipped = purchaseOrEquipCafeCat(equipped, 'lilo');
  assert.equal(equipped.equippedMachineSkin, 'golden-espresso-machine');
  assert.equal(equipped.equippedCatId, 'lilo');

  const restored = importSaveJson(exportSaveJson(equipped));
  assert.ok(restored);
  assert.equal(restored.cookieJarCheatUnlocked, true);
  assert.equal(restored.equippedMachineSkin, 'golden-espresso-machine');
  assert.equal(restored.equippedCatId, 'lilo');
  assert.equal(restored.unlockedCats.length, ALL_CAFE_CAT_IDS.length);
  assert.equal(restored.unlockedCosmetics.length, CAT_COSMETICS_CATALOG.length);
});

test('V2 Phase 1: 24h Owner Loop never triggers forced 5-min gameover and resets daily 35-cup quota at local midnight', () => {
  let state = createInitialGameState();
  state.phase = 'playing';
  state.mode = 'career';
  state.shiftTimeRemaining = 0.1;
  state.cupsServedToday = 19;
  state.quotaBonusAwarded = false;

  // Advancing past 0s shiftTimeRemaining MUST keep store open (no forced gameover!)
  const afterTick = advanceSimulationTick(state, 0.5);
  assert.equal(afterTick.phase, 'playing');

  // Local midnight rollover resets daily quota cleanly
  const today = new Date(2026, 4, 15, 23, 55, 0);
  const tomorrow = new Date(2026, 4, 16, 0, 5, 0);
  const syncedToday = syncDailyQuotaForDate(
    {
      ...afterTick,
      dailyQuota: {
        dateKey: getLocalDateKey(today),
        cupsServedToday: 35,
        dailyCupQuota: 35,
        quotaBonusClaimed: true,
      },
      cupsServedToday: 35,
      quotaBonusAwarded: true,
    },
    tomorrow
  );
  assert.equal(syncedToday.cupsServedToday, 0);
  assert.equal(syncedToday.quotaBonusAwarded, false);
  assert.equal(syncedToday.dailyQuota.dateKey, getLocalDateKey(tomorrow));
  assert.ok(formatLocalClock(tomorrow).length >= 6);
  assert.ok(getTimeUntilMidnightLabel(today).includes('Next'));
});

test('V2 Phase 2: Device-clock Time Realism maps all 5 time bands and combines cleanly with independent Rain into 10 atmospheres', () => {
  assert.equal(resolveDeviceTimeOfDay(new Date(2026, 4, 10, 5, 30)), 'dawn');
  assert.equal(resolveDeviceTimeOfDay(new Date(2026, 4, 10, 9, 0)), 'morning');
  assert.equal(resolveDeviceTimeOfDay(new Date(2026, 4, 10, 13, 15)), 'noon');
  assert.equal(resolveDeviceTimeOfDay(new Date(2026, 4, 10, 17, 45)), 'golden');
  assert.equal(resolveDeviceTimeOfDay(new Date(2026, 4, 10, 22, 0)), 'night');
  assert.equal(resolveDeviceTimeOfDay(new Date(2026, 4, 10, 2, 0)), 'night');

  assert.equal(resolveCompositeWeather('dawn', false), 'dawn');
  assert.equal(resolveCompositeWeather('dawn', true), 'rainy-dawn');
  assert.equal(resolveCompositeWeather('noon', false), 'noon');
  assert.equal(resolveCompositeWeather('noon', true), 'rainy-noon');
  assert.equal(resolveCompositeWeather('golden', true), 'rainy-golden');
  assert.equal(isRainyWeather('rainy-dawn'), true);
  assert.equal(isRainyWeather('rainy-noon'), true);
  assert.equal(isRainyWeather('rainy-golden'), true);

  let state = createInitialGameState();
  state = applyWeatherPreferences(state, 'dawn', 'rain', new Date(2026, 4, 10, 12, 0));
  assert.equal(state.weather, 'rainy-dawn');
  assert.equal(state.isRaining, true);
  state = applyWeatherPreferences(state, 'auto', 'clear', new Date(2026, 4, 10, 13, 0));
  assert.equal(state.weather, 'noon');
  assert.equal(state.isRaining, false);
});

test('V2 Phase 6: Pastries catalog has 3 pastries and preparePastry is 100% decoupled from active coffee cup steps', () => {
  assert.equal(PASTRY_CATALOG.length, 3);
  let state = createInitialGameState();
  // Start brewing coffee (Grind + Tamp)
  state = performCupAction(state, 'grind');
  state = performCupAction(state, 'tamp');
  assert.equal(state.currentCup.hasGrounds, true);
  assert.equal(state.currentCup.isTamped, true);

  // Grab Miata Cake mid-brew -> MUST NOT reset or alter currentCup!
  state = preparePastry(state, 'miata-cake');
  assert.equal(state.preparedPastry, 'miata-cake');
  assert.equal(state.currentCup.hasGrounds, true);
  assert.equal(state.currentCup.isTamped, true);
  assert.equal(state.currentCup.hasEspresso, false);

  // Order requesting Daisy Donut is not ready until Daisy Donut is staged
  const orderWithPastry = { ...state.customers[0], requestedPastry: 'daisy-donut' as const };
  const completeCup = {
    hasGrounds: true,
    isTamped: true,
    hasEspresso: true,
    hasSteepedTea: false,
    hasSteamedMilk: true,
    hasIce: false,
    syrup: 'none' as const,
  };
  assert.equal(isOrderReadyToServe(completeCup, 'miata-cake', orderWithPastry).ready, false);
  assert.equal(isOrderReadyToServe(completeCup, 'daisy-donut', orderWithPastry).ready, true);
});

test('V2 Phase 7: Delivery Rider spawns as takeout + pastry + variant uniform and pays +$3 Delivery Partner Bonus', () => {
  assert.equal(DELIVERY_PARTNER_BONUS, 3);
  assert.equal(DELIVERY_RIDER_MIN_REGULAR_COOLDOWN, 0);
  assert.equal(MAX_ACTIVE_DELIVERY_RIDERS, 2);

  const rider = spawnDeliveryRiderOrder(1, 0, undefined, () => 0.4);
  assert.equal(rider.isDeliveryRider, true);
  assert.equal(rider.orderType, 'takeout');
  assert.ok(rider.requestedPastry !== null);
  assert.ok(['blue', 'green', 'red'].includes(rider.riderVariant!));

  let state = createInitialGameState();
  const riderAccepted = { ...rider, orderAccepted: true, arrivedAtCounter: true };
  state.customers = [riderAccepted];
  state.pinnedOrderId = riderAccepted.id;
  const rec = getRecipeById(riderAccepted.recipeId);
  state.currentCup = {
    hasGrounds: rec.needsEspresso,
    isTamped: rec.needsEspresso,
    hasEspresso: rec.needsEspresso,
    hasSteepedTea: rec.needsTeaSteep,
    hasSteamedMilk: rec.needsSteamedMilk,
    hasIce: rec.needsIce,
    syrup: rec.syrup,
  };
  state = preparePastry(state, riderAccepted.requestedPastry!);
  const cashBefore = state.cash;
  const served = serveCurrentCupToCustomer(state);
  const servedRider = served.customers.find((c) => c.id === riderAccepted.id);
  assert.equal(servedRider?.state, 'departing');
  assert.equal(served.preparedPastry, null);
  assert.ok(served.cash >= cashBefore + rec.price + 4 + DELIVERY_PARTNER_BONUS);
});

test('Expansion Phase 1: Dine-in seated customer transitions smoothly to departing with leavingTable=true and preserves chair index for stand-up clearance', () => {
  let state = createInitialGameState();
  state.phase = 'playing';
  state.customers = [
    {
      ...state.customers[0],
      state: 'seated',
      seatIndex: 2,
      seatedTimer: 0.1,
    },
  ];
  const ticked = advanceSimulationTick(state, 0.25);
  assert.equal(ticked.customers.length, 1);
  assert.equal(ticked.customers[0].state, 'departing');
  assert.equal(ticked.customers[0].leavingTable, true);
  assert.equal(ticked.customers[0].seatIndex, 2);
  assert.equal(ticked.customers[0].seatedTimer, 16);
});

test('Expansion Phase 1: Delivery Rider spawn probability is 50%–80% with pity cap and strict max-2 active riders cap', () => {
  assert.equal(computeDeliveryRiderProbability('dawn', 0), 0.5);
  assert.equal(computeDeliveryRiderProbability('night', 0), 0.5);
  assert.equal(computeDeliveryRiderProbability('golden', 0), 0.65);
  assert.equal(computeDeliveryRiderProbability('morning', 0), 0.8);
  assert.equal(computeDeliveryRiderProbability('noon', 0), 0.8);
  // Pity cap guarantees rider after 2 regular orders
  assert.equal(computeDeliveryRiderProbability('night', 2), 1.0);

  // When 2 delivery riders are already active, advanceSimulationTick MUST NOT spawn a 3rd delivery rider!
  let state = createInitialGameState();
  state.phase = 'playing';
  const r1 = spawnDeliveryRiderOrder(1, 0, undefined, () => 0.2);
  const r2 = spawnDeliveryRiderOrder(1, 1, undefined, () => 0.7);
  state.customers = [r1, r2];
  state.regularCustomersSinceLastRider = 5; // Would normally trigger 100% pity
  state.nextCustomerSpawnTimer = 0.05;
  const next = advanceSimulationTick(state, 0.25, { activeArrivingCount: 0 });
  const activeRiders = next.customers.filter((c) => c.isDeliveryRider);
  assert.equal(activeRiders.length, 2, 'Active delivery riders MUST never exceed MAX_ACTIVE_DELIVERY_RIDERS (2)');
});

test('Expansion Phase 1: returnPreparedPastry clears plated pastry back to display case with zero cash penalty and untouched coffee cup', () => {
  let state = createInitialGameState();
  state = performCupAction(state, 'grind');
  state = preparePastry(state, 'miata-cake');
  const cashBefore = state.cash;
  assert.equal(state.preparedPastry, 'miata-cake');

  const returned = returnPreparedPastry(state);
  assert.equal(returned.preparedPastry, null);
  assert.equal(returned.cash, cashBefore);
  assert.equal(returned.currentCup.hasGrounds, true);
  assert.ok(returned.lastActionFeedback.includes('back to the pastry display case'));
});

test('Expansion Phase 1: Legacy save migration auto-unlocks $50k Golden Espresso + Tisay + Gold Chain and never cold-boots into external audio mode', () => {
  const legacyPayload = JSON.stringify({
    version: 'klasik3d-save-v1',
    data: {
      day: 8,
      cash: 900,
      lifetimeGrossIncome: 62000,
      audioPreferences: {
        mode: 'external',
        musicVolume: 0.42,
        ambienceVolume: 0.75,
        vinylCrackle: false,
      },
    },
  });
  const migrated = importSaveJson(legacyPayload);
  assert.ok(migrated);
  assert.equal(migrated.goldenEspressoUnlocked, true);
  assert.ok(migrated.unlockedCats.includes('tisay'));
  assert.ok(migrated.unlockedCosmetics.includes('gold_chain'));
  assert.ok(migrated.unlockedCosmetics.includes('beret'));
  // External mode is transient — saved audioPreferences.mode falls back cleanly to 'vinyl'
  assert.equal(migrated.audioPreferences.mode, 'vinyl');
  assert.equal(migrated.audioPreferences.musicVolume, 0.42);
  assert.equal(migrated.audioPreferences.ambienceVolume, 0.75);
  assert.equal(migrated.audioPreferences.vinylCrackle, false);
});

test('Expansion Phase 2 & 3: Radio Browser station filter enforces strict HTTPS + MP3/AAC and cleans BYO filenames', () => {
  const verified = filterVerifiedRadioStations([
    { stationuuid: '1', name: 'Easy Rock 96.3', url_resolved: 'https://stream.example.ph/easy.mp3', codec: 'MP3', countrycode: 'PH', bitrate: 128 },
    { stationuuid: '2', name: 'Insecure HTTP', url_resolved: 'http://insecure.example.ph/radio.mp3', codec: 'MP3', countrycode: 'PH' },
    { stationuuid: '3', name: 'Flaky HLS', url_resolved: 'https://hls.example.ph/live.m3u8', codec: 'HLS', countrycode: 'PH' },
    { stationuuid: '4', name: 'Wish 107.5', url_resolved: 'https://stream.example.ph/wish.aac', codec: 'AAC+', countrycode: 'PH', bitrate: 96 },
    { stationuuid: '5', name: 'Duplicate URL', url_resolved: 'https://stream.example.ph/easy.mp3', codec: 'MP3', countrycode: 'PH' },
  ]);
  assert.equal(verified.length, 2);
  assert.equal(verified[0].name, 'Easy Rock 96.3');
  assert.equal(verified[1].name, 'Wish 107.5');
  assert.equal(cleanAudioFileName('01_rainy-cafe_lofi_v2.ogg'), '01 rainy cafe lofi v2');
});

test('Expansion Phase 3: New cats Amby ($1,500), Gigi ($500 kitten), and Secret Tisay (hidden until $50k Golden Espresso) work cleanly', () => {
  let state = createInitialGameState();
  // Before $50k Golden Espresso, Tisay MUST be completely hidden from getVisibleShopCats!
  const beforeVisible = getVisibleShopCats(state.unlockedCats);
  assert.equal(beforeVisible.some((c) => c.id === 'tisay'), false);
  assert.equal(beforeVisible.some((c) => c.id === 'amby'), true);
  assert.equal(beforeVisible.some((c) => c.id === 'gigi'), true);
  assert.equal(beforeVisible.length, 11);

  const gigiSpec = getCafeCatSpec('gigi');
  assert.equal(gigiSpec.unlockAmount, 500);
  assert.equal(gigiSpec.scale[0], 0.68);
  const ambySpec = getCafeCatSpec('amby');
  assert.equal(ambySpec.unlockAmount, 1500);
  const tisaySpec = getCafeCatSpec('tisay');
  assert.equal(tisaySpec.isSecret, true);
  assert.equal(tisaySpec.hasCollar, false);

  // Adopt Gigi ($500) and Amby ($1,500)
  state.cash = 2500;
  state = purchaseOrEquipCafeCat(state, 'gigi');
  assert.equal(state.cash, 2000);
  assert.ok(state.unlockedCats.includes('gigi'));
  state = purchaseOrEquipCafeCat(state, 'amby');
  assert.equal(state.cash, 500);
  assert.ok(state.unlockedCats.includes('amby'));

  // Reaching $50k Golden Espresso reveals and auto-unlocks secret cat Tisay
  state = reachGoldenMachineMilestone(state);
  const afterVisible = getVisibleShopCats(state.unlockedCats);
  assert.equal(afterVisible.some((c) => c.id === 'tisay'), true);
  assert.equal(afterVisible.length, 12);
});

test('Expansion Phase 4: Adaptive Cat Cosmetics, CAT_FIT_PROFILES, Dinosaur Costume 9/9 Meta-Unlock, and full_suit override work cleanly', () => {
  assert.equal(BASE_CAT_COSMETIC_IDS.length, 9);
  assert.equal(CAT_COSMETICS_CATALOG.length, 10);
  assert.equal(BERET_REVENUE_MILESTONE, 10000);

  // Fit profiles exist for key builds: tiny Gigi, thin Tisay, wide Chunky, standard Amby
  assert.equal(CAT_FIT_PROFILES.gigi.bodyScale, 0.68);
  assert.equal(CAT_FIT_PROFILES.tisay.torsoScale[0], 0.82);
  assert.equal(CAT_FIT_PROFILES.chunky.torsoScale[0], 1.28);
  assert.equal(getCatFitProfile('amby').bodyScale, 1.0);

  // Purchase all 7 shop cosmetics + reach $50k (unlocks Beret $10k + Gold Chain $50k) -> auto-unlocks Dinosaur Costume!
  let state = createInitialGameState();
  state.cash = 2000;
  const shopCosmetics = [
    'glasses',
    'thuglife_glasses',
    'cloth_pink',
    'cloth_yellow',
    'cloth_blue',
    'cloth_white',
    'cloth_orange',
  ] as const;
  for (const id of shopCosmetics) {
    state = purchaseCatCosmetic(state, id);
    assert.ok(state.unlockedCosmetics.includes(id));
  }
  assert.equal(state.unlockedCosmetics.includes('dino_costume'), false);

  // Reach $50k -> unlocks Beret + Gold Chain -> triggers 9/9 Dinosaur Costume meta-unlock!
  state = reachGoldenMachineMilestone(state);
  assert.ok(state.unlockedCosmetics.includes('beret'));
  assert.ok(state.unlockedCosmetics.includes('gold_chain'));
  assert.ok(state.unlockedCosmetics.includes('dino_costume'));
  assert.equal(checkDinoCostumeUnlock(BASE_CAT_COSMETIC_IDS).justUnlockedDino, true);

  // Equip headwear + body + eyewear, then equip dino_costume -> full_suit visually overrides headwear + body while preserving eyewear!
  state = equipCatCosmetic(state, 'champy', 'glasses', 'eyewear');
  state = equipCatCosmetic(state, 'champy', 'beret', 'headwear');
  state = equipCatCosmetic(state, 'champy', 'cloth_pink', 'body');
  state = equipCatCosmetic(state, 'champy', 'dino_costume', 'full_suit');
  const effective = getEffectiveVisibleLoadout(state.catLoadouts.champy);
  assert.equal(effective.full_suit, 'dino_costume');
  assert.equal(effective.eyewear, 'glasses');
  assert.equal(effective.headwear, null);
  assert.equal(effective.body, null);

  // Persist catLoadouts through save JSON
  const restored = importSaveJson(exportSaveJson(state));
  assert.ok(restored);
  assert.equal(restored.catLoadouts.champy?.full_suit, 'dino_costume');
  assert.equal(restored.catLoadouts.champy?.eyewear, 'glasses');
});

test('Expansion Phase 5: Cat Station pauses customer patience/mood decay cleanly without penalizing the barista', () => {
  let state = createInitialGameState();
  state.phase = 'playing';
  state.mode = 'career';
  state = acceptCustomerOrder(state, 'cust-initial-1');
  const beforeMood = state.customers[0].mood;

  const pausedTick = advanceSimulationTick(state, 1.0, { catStationOpen: true });
  assert.equal(pausedTick.customers[0].mood, beforeMood);
  assert.equal(pausedTick.missedOrders, 0);
});

test('Outdoor Sceneries Phase 1: All 9 sceneries have exact economy, $35K/$65K gross milestones, Snow exclusivity, and Mt. Everest Always Winter lock', () => {
  assert.equal(SCENERY_CATALOG.length, 9);
  const byId = Object.fromEntries(SCENERY_CATALOG.map((s) => [s.id, s]));
  assert.equal(byId.busy_street.cost, 0);
  assert.equal(byId.mayon_volcano.cost, 2000);
  assert.equal(byId.hilltop_city_lights.cost, 4000);
  assert.equal(byId.japanese_tranquility.cost, 6500);
  assert.equal(byId.brazilian_favela.cost, 9500);
  assert.equal(byId.cyberpunk_neon.cost, 14000);
  assert.equal(byId.eiffel_tower.cost, 22000);
  assert.equal(byId.switzerland_hilltop.revenueMilestone, 35000);
  assert.equal(byId.mt_everest.revenueMilestone, 65000);

  // Snow exclusivity: ONLY eiffel_tower, switzerland_hilltop, mt_everest allow snow
  assert.equal(isSnowAllowedForScenery('busy_street'), false);
  assert.equal(isSnowAllowedForScenery('mayon_volcano'), false);
  assert.equal(isSnowAllowedForScenery('japanese_tranquility'), false);
  assert.equal(isSnowAllowedForScenery('brazilian_favela'), false);
  assert.equal(isSnowAllowedForScenery('cyberpunk_neon'), false);
  assert.equal(isSnowAllowedForScenery('eiffel_tower'), true);
  assert.equal(isSnowAllowedForScenery('switzerland_hilltop'), true);
  assert.equal(isSnowAllowedForScenery('mt_everest'), true);

  // Always Winter lock ONLY on mt_everest
  assert.equal(isAlwaysWinterScenery('eiffel_tower'), false);
  assert.equal(isAlwaysWinterScenery('switzerland_hilltop'), false);
  assert.equal(isAlwaysWinterScenery('mt_everest'), true);

  // Clamping rainPreference on non-snow vs always-winter sceneries
  assert.equal(clampRainPreferenceForScenery('busy_street', 'snow'), 'clear');
  assert.equal(clampRainPreferenceForScenery('eiffel_tower', 'snow'), 'snow');
  assert.equal(clampRainPreferenceForScenery('mt_everest', 'clear'), 'snow');
  assert.equal(clampRainPreferenceForScenery('mt_everest', 'rain'), 'snow');

  // Revenue milestones auto-unlock Switzerland ($35K) and Mt. Everest ($65K)
  const at35k = syncSceneryMilestones(['busy_street'], 35000);
  assert.ok(at35k.unlockedSceneries.includes('switzerland_hilltop'));
  assert.ok(!at35k.unlockedSceneries.includes('mt_everest'));

  const at65k = syncSceneryMilestones(at35k.unlockedSceneries, 65000);
  assert.ok(at65k.unlockedSceneries.includes('mt_everest'));

  // Buying a cash scenery deducts cash, equips it, and clamps snow when switching away
  let state = createInitialGameState();
  state = {
    ...state,
    cash: 30000,
    lifetimeGrossIncome: 66000,
    unlockedSceneries: ['busy_street', 'eiffel_tower', 'mt_everest'],
  };
  state = purchaseOrEquipScenery(state, 'mt_everest');
  assert.equal(state.activeScenery, 'mt_everest');
  assert.equal(state.isSnowing, true);
  assert.equal(state.climateState, 'winter');

  // Switching from Mt. Everest (snow) to Mayon Volcano ($2000) clamps snow back off & restores summer
  state = purchaseOrEquipScenery(state, 'mayon_volcano');
  assert.equal(state.activeScenery, 'mayon_volcano');
  assert.equal(state.cash, 28000);
  assert.equal(state.isSnowing, false);
  assert.equal(state.climateState, 'summer');
  assert.equal(resolveClimateState('eiffel_tower', 'snow', true), 'winter');
  assert.equal(resolveClimateState('eiffel_tower', 'clear', false), 'summer');
});

test('Outdoor Sceneries Phase 4: All 6 Patron Outfits support Auto-Match Scenery vs Custom Mix, Weather-Reactive Summer/Winter, and Winter-Only Hiker', () => {
  assert.equal(PATRON_OUTFIT_CATALOG.length, 6);

  let state = createInitialGameState();
  state = { ...state, cash: 10000 };
  for (const outfit of PATRON_OUTFIT_CATALOG) {
    state = purchasePatronOutfit(state, outfit.id);
    assert.ok(state.unlockedPatronOutfits.includes(outfit.id));
  }

  // Auto-Match Scenery mode picks regional outfit matching the active scenery
  const jpMatch = resolvePatronOutfitForSpawn({
    activeScenery: 'japanese_tranquility',
    climateState: 'summer',
    unlockedPatronOutfits: state.unlockedPatronOutfits,
    patronOutfitAutoMatch: true,
    enabledCustomPatronOutfits: [],
    rng: () => 0.1,
  });
  assert.equal(jpMatch.outfitId, 'ancient_japanese');

  const parisWinter = resolvePatronOutfitForSpawn({
    activeScenery: 'eiffel_tower',
    climateState: 'winter',
    unlockedPatronOutfits: state.unlockedPatronOutfits,
    patronOutfitAutoMatch: true,
    enabledCustomPatronOutfits: [],
    rng: () => 0.1,
  });
  assert.equal(parisWinter.outfitId, 'french');
  assert.equal(parisWinter.climateVariant, 'winter');

  // Mt. Everest auto-matches Winter-Only Hiker pack
  const everestMatch = resolvePatronOutfitForSpawn({
    activeScenery: 'mt_everest',
    climateState: 'winter',
    unlockedPatronOutfits: state.unlockedPatronOutfits,
    patronOutfitAutoMatch: true,
    enabledCustomPatronOutfits: [],
    rng: () => 0.1,
  });
  assert.equal(everestMatch.outfitId, 'hiker');
  assert.equal(everestMatch.climateVariant, 'winter');

  // Custom Mix mode excludes Hiker during summer weather, includes it in winter
  state = setPatronOutfitAutoMatch(state, false);
  assert.equal(state.patronOutfitAutoMatch, false);
  // Newly bought outfits are enabled by default; toggling removes then re-adds
  assert.ok(state.enabledCustomPatronOutfits.includes('hiker'));
  state = toggleCustomPatronOutfit(state, 'hiker');
  assert.equal(state.enabledCustomPatronOutfits.includes('hiker'), false);
  state = toggleCustomPatronOutfit(state, 'hiker');
  assert.equal(state.enabledCustomPatronOutfits.includes('hiker'), true);

  const hikerInSummer = resolvePatronOutfitForSpawn({
    activeScenery: 'busy_street',
    climateState: 'summer',
    unlockedPatronOutfits: state.unlockedPatronOutfits,
    patronOutfitAutoMatch: false,
    enabledCustomPatronOutfits: ['hiker'],
    rng: () => 0.1,
  });
  assert.equal(hikerInSummer.outfitId, null, 'Hiker pack must NOT spawn in non-winter climate');

  const hikerInWinter = resolvePatronOutfitForSpawn({
    activeScenery: 'eiffel_tower',
    climateState: 'winter',
    unlockedPatronOutfits: state.unlockedPatronOutfits,
    patronOutfitAutoMatch: false,
    enabledCustomPatronOutfits: ['hiker'],
    rng: () => 0.1,
  });
  assert.equal(hikerInWinter.outfitId, 'hiker');
});

test('Outdoor Sceneries Phase 5: Secret Easter Egg NPC rotates Beb -> Anton -> Duminiki, enforces singleton + 270s cooldown, cap/hood weather logic, 0.25x patience drain, and 2x tip bonus', () => {
  assert.deepEqual([...SECRET_NPC_NAMES], ['Beb', 'Anton', 'Duminiki']);
  assert.equal(SECRET_NPC_COOLDOWN_SEC, 270);
  assert.equal(SECRET_NPC_PATIENCE_DRAIN_MULT, 0.25);
  assert.equal(SECRET_NPC_TIP_MULTIPLIER, 2);

  // Strict sequential name rotation
  assert.equal(advanceSecretNpcNameIdx(0), 1);
  assert.equal(advanceSecretNpcNameIdx(1), 2);
  assert.equal(advanceSecretNpcNameIdx(2), 0);

  // Cap (40%) + Auto hood-up ONLY when capless in Rain/Snow/Winter
  const withCapInRain = resolveSecretNpcAppearance('summer', true, () => 0.1);
  assert.equal(withCapInRain.wearsCap, true);
  assert.equal(withCapInRain.hoodUp, false);

  const caplessInRain = resolveSecretNpcAppearance('summer', true, () => 0.65);
  assert.equal(caplessInRain.wearsCap, false);
  assert.equal(caplessInRain.hoodUp, true);

  // Singleton & Cooldown enforcement
  assert.equal(
    canSpawnSecretNpc({ role: 'customer', isSecretNpcActive: true, cooldownRemainingSec: 0, rng: () => 0.01 }),
    false
  );
  assert.equal(
    canSpawnSecretNpc({ role: 'passerby', isSecretNpcActive: false, cooldownRemainingSec: 12, rng: () => 0.01 }),
    false
  );
  assert.equal(
    canSpawnSecretNpc({ role: 'customer', isSecretNpcActive: false, cooldownRemainingSec: 0, rng: () => 0.01 }),
    true
  );

  // 0.25x patience drain & 2x tip bonus
  let state = createInitialGameState();
  state.phase = 'playing';
  state.mode = 'career';
  state = acceptCustomerOrder(state, 'cust-initial-1');
  state.customers = state.customers.map((c, i) =>
    i === 0
      ? {
          ...c,
          customerName: 'Beb',
          isSecretNpc: true,
          mood: 100,
          patience: 100,
          moodDurationSec: 100,
          orderTimeLimitSec: 100,
          orderTimeRemainingSec: 100,
        }
      : c
  );
  let after1Sec = state;
  for (let i = 0; i < 4; i++) {
    after1Sec = advanceSimulationTick(after1Sec, 0.25);
  }
  assert.ok(
    Math.abs(after1Sec.customers[0].mood - (100 - 1.0 * 0.25)) < 1e-6,
    `Expected Secret NPC mood to drain at 0.25x rate, got ${after1Sec.customers[0].mood}`
  );

  const recipe = getRecipeById('velvet-latte');
  const regularPay = calculateDrinkPayout(state, recipe, 100, 100, 2, null, false, false);
  const secretPay = calculateDrinkPayout(state, recipe, 100, 100, 2, null, false, true);
  assert.equal(secretPay.tip, regularPay.tip * 2);
});

test('Outdoor Sceneries Phase 6 & 7: Go Outside Overlook pauses customer mood decay and Save/Load preserves scenery, patron outfits, and Secret NPC rotation', () => {
  let state = createInitialGameState();
  state.phase = 'playing';
  state.mode = 'career';
  state = acceptCustomerOrder(state, 'cust-initial-1');
  const moodBefore = state.customers[0].mood;

  const pausedOutside = advanceSimulationTick(state, 1.5, { outdoorOverlookOpen: true });
  assert.equal(pausedOutside.customers[0].mood, moodBefore);
  assert.equal(pausedOutside.missedOrders, 0);

  // Full Save/Load migration round-trip
  let rich: typeof state = {
    ...state,
    cash: 25000,
    lifetimeGrossIncome: 40000,
    secretNpcNameIdx: 2,
  };
  rich = purchaseOrEquipScenery(rich, 'mayon_volcano');
  rich = purchasePatronOutfit(rich, 'filipino');
  rich = setPatronOutfitAutoMatch(rich, false);

  const restored = importSaveJson(exportSaveJson(rich));
  assert.ok(restored);
  assert.equal(restored.activeScenery, 'mayon_volcano');
  assert.ok(restored.unlockedSceneries.includes('mayon_volcano'));
  assert.ok(restored.unlockedSceneries.includes('switzerland_hilltop'));
  assert.ok(restored.unlockedPatronOutfits.includes('filipino'));
  assert.equal(restored.patronOutfitAutoMatch, false);
  assert.ok(restored.enabledCustomPatronOutfits.includes('filipino'));
  assert.equal(restored.secretNpcNameIdx, 2);
});

test('Bugfix Phase A: Cookie Jar cheat unlocks ALL 9 sceneries & ALL 6 patron outfits dynamically, and sidewalk avoidance detours around parked Miata', () => {
  const initial = createInitialGameState();
  const unlocked = unlockAllEverythingCheat(initial);
  assert.equal(unlocked.unlockedSceneries.length, ALL_SCENERY_IDS.length);
  for (const scId of ALL_SCENERY_IDS) {
    assert.ok(unlocked.unlockedSceneries.includes(scId), `Expected scenery ${scId} unlocked`);
  }
  assert.equal(unlocked.unlockedPatronOutfits.length, ALL_PATRON_OUTFIT_IDS.length);
  for (const outfitId of ALL_PATRON_OUTFIT_IDS) {
    assert.ok(unlocked.unlockedPatronOutfits.includes(outfitId), `Expected outfit ${outfitId} unlocked`);
  }

  // Sidewalk obstacle avoidance steers smoothly outside the parked Miata's padded AABB
  const obstacles = getSidewalkObstacles(true, true);
  const miata = obstacles.find((o) => o.id === 'parked-miata');
  assert.ok(miata, 'Expected parked-miata obstacle when Miata is parked outside');
  const laneThroughMiata = -8.55;
  const avoidedZ = computeAvoidedSidewalkZ(-3.55, laneThroughMiata, obstacles);
  assert.ok(
    avoidedZ >= miata.maxZ - 0.02 || avoidedZ <= miata.minZ + 0.02,
    `Expected avoidedZ (${avoidedZ}) to clear Miata Z band [${miata.minZ}, ${miata.maxZ}]`
  );
  // Far from Miata, sidewalk lane stays undisturbed
  const clearZ = computeAvoidedSidewalkZ(10.0, -8.55, obstacles);
  assert.equal(clearZ, -8.55);
});

test('Bugfix Phase B: Conformal Cat Cloth & Skeleton T-Rex spline sampling stay strictly outside cat torso/chest ellipsoids', () => {
  assert.ok(CAT_COSMETIC_CLEARANCE >= 0.028);
  const dims = DEFAULT_CAT_RIG_DIMENSIONS;
  // Every sampled torso shell point must sit strictly outside both torso and chest ellipsoids
  for (const y of [0.22, 0.28, 0.34, 0.40]) {
    for (let i = 0; i < 16; i++) {
      const theta = (i / 16) * Math.PI * 2;
      const pt = sampleCatTorsoOuterPoint(y, theta, dims, CAT_COSMETIC_CLEARANCE);
      const tx = pt.x / dims.torsoRadiusX;
      const ty = (pt.y - dims.torsoCenterY) / dims.torsoRadiusY;
      const tz = (pt.z - dims.torsoCenterZ) / dims.torsoRadiusZ;
      const torsoNorm = Math.sqrt(tx * tx + ty * ty + tz * tz);
      assert.ok(torsoNorm > 1.05, `Sampled point (${pt.x}, ${pt.y}, ${pt.z}) must clear torso ellipsoid (norm=${torsoNorm})`);

      const cx = pt.x / dims.chestRadiusX;
      const cy = (pt.y - dims.chestCenterY) / dims.chestRadiusY;
      const cz = (pt.z - dims.chestCenterZ) / dims.chestRadiusZ;
      const chestNorm = Math.sqrt(cx * cx + cy * cy + cz * cz);
      assert.ok(chestNorm > 1.05, `Sampled point must clear chest ellipsoid (norm=${chestNorm})`);
    }
  }

  // External dorsal spine spline rides strictly behind/outside the back surface (z < torso back)
  const dorsalPts = sampleCatDorsalSplinePoints(dims, 6, CAT_COSMETIC_CLEARANCE + 0.015);
  assert.equal(dorsalPts.length, 6);
  for (const dp of dorsalPts) {
    assert.ok(dp.z < dims.torsoCenterZ - dims.torsoRadiusZ * 0.5, `Dorsal spline point must sit externally behind back (z=${dp.z})`);
  }
});

test('Bugfix Phase C & Polish Phase 1: Scenic Overlook hidden on 4 street-corridor maps, leash points hand-to-collar, road Y-layers prevent z-fighting, Everest trail avoids snowbanks, and two-lane traffic stays spaced', () => {
  // 1. Scenic Overlook flag: disabled on 4 enclosed street-corridor maps, enabled on 5 open-vista maps
  const enclosedMaps = new Set([
    'busy_street',
    'cyberpunk_neon',
    'brazilian_favela',
    'japanese_tranquility',
  ]);
  for (const scId of ALL_SCENERY_IDS) {
    assert.equal(
      getScenerySpec(scId).hasScenicOverlook,
      !enclosedMaps.has(scId),
      `Unexpected hasScenicOverlook for ${scId}`
    );
  }

  // 2. Dog leash orientation: strictly extends forward (+Z) and downward (-Y) from walker hand to dog collar
  const leashTf = computeLeashTransform(
    { x: 0.21, y: 0.78, z: 0.21 },
    { x: 0.26, y: 0.29, z: 0.85 }
  );
  assert.ok(leashTf.direction.z > 0.65, `Leash must point forward (+Z), got ${leashTf.direction.z}`);
  assert.ok(leashTf.direction.y < -0.45, `Leash must angle downward (-Y), got ${leashTf.direction.y}`);
  assert.ok(leashTf.length > 0.7 && leashTf.length < 0.95);

  // 3. Road/Gutter/Sidewalk vertical Y-separation >= 0.012 prevents coplanar z-fighting
  assert.ok(ROAD_ELEVATION_LAYERS.asphaltY - ROAD_ELEVATION_LAYERS.outerTerrainY >= 0.05);
  assert.ok(ROAD_ELEVATION_LAYERS.gutterY - ROAD_ELEVATION_LAYERS.asphaltY >= 0.012);
  assert.ok(ROAD_ELEVATION_LAYERS.crosswalkY - ROAD_ELEVATION_LAYERS.gutterY >= 0.012);
  assert.ok(ROAD_ELEVATION_LAYERS.sidewalkTopY - ROAD_ELEVATION_LAYERS.crosswalkY >= 0.05);
  assert.ok(ROAD_ELEVATION_LAYERS.curbTopY - ROAD_ELEVATION_LAYERS.sidewalkTopY >= 0.015);

  // 4. Mt. Everest snowbank avoidance keeps every hiker strictly on the cleared stone trail (never buried at z <= -14.6)
  const everestObstacles = getSidewalkObstacles(false, false, 'mt_everest');
  assert.ok(everestObstacles.some((o) => o.id === 'everest-snowbank-west'));
  for (const testX of [-15, -10, 0, 10, 15]) {
    const safeTrailZ = computeAvoidedSidewalkZ(
      testX,
      -16.5,
      everestObstacles,
      DEFAULT_SIDEWALK_BOUNDS,
      'mt_everest'
    );
    assert.ok(
      safeTrailZ >= EVEREST_FAR_TRAIL_BOUNDS.outerZ && safeTrailZ <= EVEREST_FAR_TRAIL_BOUNDS.innerZ,
      `Everest hiker at x=${testX} drifted off cleared trail: z=${safeTrailZ}`
    );
    assert.ok(safeTrailZ > -14.5, `Everest hiker must clear snowbank wall (z=${safeTrailZ})`);
  }

  // 5. Biome prop hygiene (Switzerland & Everest are non-urban & have zero street traffic)
  assert.equal(isUrbanStreetScenery('busy_street'), true);
  assert.equal(isUrbanStreetScenery('cyberpunk_neon'), true);
  assert.equal(isUrbanStreetScenery('switzerland_hilltop'), false);
  assert.equal(isUrbanStreetScenery('mt_everest'), false);
  assert.equal(hasStreetTrafficScenery('switzerland_hilltop'), false);
  assert.equal(hasStreetTrafficScenery('mt_everest'), false);
  assert.equal(hasStreetTrafficScenery('busy_street'), true);

  // 6. Inside vs. Outside Adaptive Performance LOD budgets
  const inside = getOutdoorLodBudgets({
    isPlayerOutside: false,
    graphicsQuality: 'max',
    isSoftwareGl: false,
    sceneryId: 'busy_street',
  });
  const outside = getOutdoorLodBudgets({
    isPlayerOutside: true,
    graphicsQuality: 'max',
    isSoftwareGl: false,
    sceneryId: 'busy_street',
  });
  assert.equal(inside.showCloudsAndBirds, false);
  assert.equal(inside.enableRichNpcBehaviors, false);
  assert.ok(inside.maxTraffic <= 2 && inside.maxPedestrians <= 2);
  assert.equal(outside.showCloudsAndBirds, true);
  assert.equal(outside.enableRichNpcBehaviors, true);
  assert.equal(outside.maxTraffic, 6);
  assert.equal(outside.maxPedestrians, 8);
  assert.ok(getSceneryOutdoorBehaviors('busy_street').includes('dog_walker'));
  assert.ok(getSceneryOutdoorBehaviors('mt_everest').includes('everest_hiker'));
  assert.ok(getSceneryOutdoorBehaviors('japanese_tranquility').includes('lantern_stroll'));

  // 7. Two-lane traffic spacing prevents overlapping even when vehicles start close together
  const vehicles = [
    { x: 0.0, dir: 1 as const, speed: 4.5, visible: true },
    { x: -2.0, dir: 1 as const, speed: 6.0, visible: true },
    { x: 5.0, dir: -1 as const, speed: 5.0, visible: true },
    { x: 6.5, dir: -1 as const, speed: 5.5, visible: true },
  ];
  for (let step = 0; step < 30; step++) {
    stepTwoLaneTraffic(vehicles, 0.1, TRAFFIC_X_BOUND, TRAFFIC_MIN_LANE_SPACING);
  }
  const eastGap = Math.abs(vehicles[0].x - vehicles[1].x);
  const westGap = Math.abs(vehicles[2].x - vehicles[3].x);
  const wrapEastGap = Math.min(eastGap, TRAFFIC_X_BOUND * 2 - eastGap);
  const wrapWestGap = Math.min(westGap, TRAFFIC_X_BOUND * 2 - westGap);
  assert.ok(wrapEastGap >= TRAFFIC_MIN_LANE_SPACING - 0.1, `Eastbound gap too tight: ${wrapEastGap}`);
  assert.ok(wrapWestGap >= TRAFFIC_MIN_LANE_SPACING - 0.1, `Westbound gap too tight: ${wrapWestGap}`);
});

test('Polish Phases 4 & 5: Cyberpunk Neon runs sleek ground cyber-cars alongside aerial hover-cars with indoor hard-cull, and every curated radio station provides verified multi-mirror HTTPS failover', () => {
  // 1. Cyberpunk Neon runs sleek ground cyber-cars on its T-road outside, and hard-culls to 0 indoors
  assert.equal(hasStreetTrafficScenery('cyberpunk_neon'), true);
  const cyberOutside = getOutdoorLodBudgets({
    isPlayerOutside: true,
    graphicsQuality: 'max',
    isSoftwareGl: false,
    sceneryId: 'cyberpunk_neon',
  });
  const cyberInside = getOutdoorLodBudgets({
    isPlayerOutside: false,
    graphicsQuality: 'max',
    isSoftwareGl: false,
    sceneryId: 'cyberpunk_neon',
  });
  assert.ok(cyberOutside.maxTraffic > 0);
  assert.equal(cyberInside.maxTraffic, 0);
  assert.equal(cyberInside.maxPedestrians, 0);
  // Busy Street, Eiffel Tower, and Brazilian Favela all support ground street traffic
  assert.equal(hasStreetTrafficScenery('busy_street'), true);
  assert.equal(hasStreetTrafficScenery('eiffel_tower'), true);
  assert.equal(hasStreetTrafficScenery('brazilian_favela'), true);

  // 2. Every curated radio station has >= 2 verified HTTPS mirrors for automatic backup failover
  assert.ok(CURATED_RADIO_STATIONS.length >= 8);
  for (const st of CURATED_RADIO_STATIONS) {
    const mirrors = resolveStationMirrorUrls(st);
    assert.ok(
      mirrors.length >= 2,
      `Curated station ${st.id} must have >= 2 HTTPS mirrors, got ${mirrors.length}`
    );
    for (const url of mirrors) {
      assert.ok(url.startsWith('https://'), `Station mirror must be HTTPS: ${url}`);
    }
  }

  // 3. resolveStationMirrorUrls deduplicates and strips insecure HTTP URLs
  const filtered = resolveStationMirrorUrls({
    streamUrl: 'http://insecure.example/stream',
    backupUrls: [
      'https://ice1.somafm.com/groovesalad-128-mp3',
      'https://ice1.somafm.com/groovesalad-128-mp3',
      'https://ice2.somafm.com/groovesalad-128-mp3',
    ],
  });
  assert.deepEqual(filtered, [
    'https://ice1.somafm.com/groovesalad-128-mp3',
    'https://ice2.somafm.com/groovesalad-128-mp3',
  ]);
});

test('Scenery Detail Overhaul Phases 2–5: smooth 90-degree corner turns, 9 unique bilateral streetlight themes, and unobstructed elevated overlook pitch', () => {
  // 1. C1-continuous 90-degree intersection corner turning behind corner buildings (no mid-road popping)
  assert.ok(TRAFFIC_X_BOUND >= 44.0);
  assert.ok(PEDESTRIAN_CORNER_BOUND >= 35.0);

  const straightPose = evaluateCornerTurnPath(10, -11.2, 1, 31.0, 2.8, -1);
  assert.equal(straightPose.x, 10);
  assert.equal(straightPose.z, -11.2);
  assert.equal(straightPose.isOnCrossStreet, false);
  assert.ok(Math.abs(straightPose.vehicleYaw) < 1e-6);

  const midTurnPose = evaluateCornerTurnPath(31.0 + Math.PI * 0.7, -11.2, 1, 31.0, 2.8, -1);
  assert.ok(midTurnPose.x > 31.0 && midTurnPose.z < -11.2);
  assert.equal(midTurnPose.isOnCrossStreet, false);

  const crossStreetPose = evaluateCornerTurnPath(40.0, -11.2, 1, 31.0, 2.8, -1);
  assert.equal(crossStreetPose.isOnCrossStreet, true);
  assert.ok(Math.abs(crossStreetPose.x - 33.8) < 1e-6);
  assert.ok(crossStreetPose.z < -14.0);
  assert.ok(Math.abs(crossStreetPose.vx) < 1e-6 && crossStreetPose.vz === -1);
  assert.ok(Math.abs(crossStreetPose.vehicleYaw - Math.PI / 2) < 1e-6);

  // Opposite (-X) corner turns cleanly as well
  const westCrossPose = evaluateCornerTurnPath(-40.0, -14.1, -1, 31.0, 2.8, -1);
  assert.equal(westCrossPose.isOnCrossStreet, true);
  assert.ok(Math.abs(westCrossPose.x - -33.8) < 1e-6);
  assert.ok(westCrossPose.z < -16.9);

  // 2. All 9 sceneries define distinct bilateral streetlight themes with cliffside low-bollard exemptions
  const styles = new Set<string>();
  for (const item of SCENERY_CATALOG) {
    const spec = getSceneryStreetlightSpec(item.id);
    assert.equal(spec.bilateral, true, `${item.id} must have bilateral streetlights`);
    styles.add(spec.style);
  }
  assert.equal(styles.size, SCENERY_CATALOG.length, 'Every scenery must have a unique streetlight style');
  assert.equal(getSceneryStreetlightSpec('hilltop_city_lights').farSideLowOverlookBollards, true);
  assert.equal(getSceneryStreetlightSpec('switzerland_hilltop').farSideLowOverlookBollards, true);
  assert.equal(getSceneryStreetlightSpec('busy_street').farSideLowOverlookBollards, false);
  assert.equal(getSceneryStreetlightSpec('japanese_tranquility').spacingMode, 'balanced_cozy');

  // 3. Elevated cliffside overlooks step to the unobstructed viewing rail pitched gently downward into the valley
  const hilltopOverlook = resolveOutdoorVantageForScenery('overlook', 'hilltop_city_lights');
  const swissOverlook = resolveOutdoorVantageForScenery('overlook', 'switzerland_hilltop');
  const eiffelOverlook = resolveOutdoorVantageForScenery('overlook', 'eiffel_tower');
  const busyOverlook = resolveOutdoorVantageForScenery('overlook', 'busy_street');
  assert.ok(hilltopOverlook.basePitch < -0.15, 'Hilltop overlook must pitch downward into valley');
  assert.ok(swissOverlook.basePitch < -0.12, 'Switzerland overlook must pitch downward into glacial valley');
  assert.ok(eiffelOverlook.basePitch < 0, 'Eiffel overlook must pitch gently toward Champ de Mars park');
  assert.ok(hilltopOverlook.pos[2] <= -17.15 && swissOverlook.pos[2] <= -17.15);
  assert.ok(busyOverlook.basePitch > 0);
  // Porch and Look Back presets remain unchanged across sceneries
  assert.deepEqual(
    resolveOutdoorVantageForScenery('porch', 'hilltop_city_lights'),
    resolveOutdoorVantageForScenery('porch', 'busy_street')
  );
  assert.deepEqual(
    resolveOutdoorVantageForScenery('lookback', 'switzerland_hilltop'),
    resolveOutdoorVantageForScenery('lookback', 'busy_street')
  );
});

test('Detail Polishing & Performance Optimization Plan (Phases 1–5): indoor hard-cull, T/L road network, Eiffel downhill slope, Cyberpunk aerial 90-degree banking turns, Anton cap-safe hair, and Favela grounding', () => {
  // 1. Phase 1: Every scenery hard-culls traffic, pedestrians, sky/birds & rich NPC props while indoors
  for (const item of SCENERY_CATALOG) {
    const indoor = getOutdoorLodBudgets({
      isPlayerOutside: false,
      graphicsQuality: 'max',
      isSoftwareGl: false,
      sceneryId: item.id,
    });
    assert.equal(indoor.maxTraffic, 0, `${item.id} must cull indoor traffic to 0`);
    assert.equal(indoor.maxPedestrians, 0, `${item.id} must cull indoor pedestrians to 0`);
    assert.equal(indoor.showCloudsAndBirds, false);
    assert.equal(indoor.enableRichNpcBehaviors, false);
  }

  // 2. Phase 2: Standardized road topologies (T-roads, Eiffel downhill T-road, backward +Z L-junctions)
  assert.equal(getSceneryRoadTopology('busy_street'), 't_road');
  assert.equal(getSceneryRoadTopology('japanese_tranquility'), 't_road');
  assert.equal(getSceneryRoadTopology('brazilian_favela'), 't_road');
  assert.equal(getSceneryRoadTopology('cyberpunk_neon'), 't_road');
  assert.equal(getSceneryRoadTopology('eiffel_tower'), 'downhill_t_road');
  assert.equal(getSceneryRoadTopology('mayon_volcano'), 'l_junction');
  assert.equal(getSceneryRoadTopology('hilltop_city_lights'), 'l_junction');
  assert.equal(getSceneryRoadTopology('switzerland_hilltop'), 'l_junction');
  assert.equal(getSceneryRoadTopology('mt_everest'), 'l_junction');

  // L-junctions strictly bend backward (+1 -> +Z away from vista); T-roads turn forward (-1 -> -Z on far lane)
  assert.equal(getJunctionTurnOutZSign('mayon_volcano', -13.75), 1);
  assert.equal(getJunctionTurnOutZSign('hilltop_city_lights', -13.75), 1);
  assert.equal(getJunctionTurnOutZSign('switzerland_hilltop', -13.75), 1);
  assert.equal(getJunctionTurnOutZSign('mt_everest', -13.75), 1);
  assert.equal(getJunctionTurnOutZSign('busy_street', -13.75), -1);
  assert.equal(getJunctionTurnOutZSign('eiffel_tower', -13.75), -1);
  assert.equal(getJunctionTurnOutZSign('eiffel_tower', -11.05), 1);

  // 3. Phase 2: Eiffel Tower Montmartre downhill slope is flat on main street & smoothly descends northward
  const flatMain = getEiffelRoadPose(-12.0, 1, 0);
  assert.equal(flatMain.y, 0);
  assert.equal(flatMain.pitch, 0);
  assert.equal(flatMain.isOnDownhillBranch, false);

  const descending = getEiffelRoadPose(-24.0, 0, -1);
  assert.ok(descending.y < -1.5, `Expected negative elevation on Montmartre ramp, got ${descending.y}`);
  assert.ok(descending.pitch < -0.1, `Expected nose-down pitch descending ramp, got ${descending.pitch}`);
  assert.equal(descending.isOnDownhillBranch, true);

  const ascending = getEiffelRoadPose(-24.0, 0, 1);
  assert.ok(ascending.y < -1.5);
  assert.ok(ascending.pitch > 0.1, `Expected nose-up pitch climbing ramp, got ${ascending.pitch}`);

  // 4. Phase 2: Cyberpunk aerial hover-cars bank during 90-degree turn and turn into perpendicular sky-canyon
  const aerialMid = evaluateAerialTurnPath(0, -32, 16, 1, 30, 5.0, -1);
  assert.equal(aerialMid.bankRoll, 0);
  assert.equal(aerialMid.z, -32);
  const aerialBanking = evaluateAerialTurnPath(33.5, -32, 16, 1, 30, 5.0, -1);
  assert.ok(Math.abs(aerialBanking.bankRoll) > 0.15, `Expected aerial banking roll during turn, got ${aerialBanking.bankRoll}`);
  const aerialCanyon = evaluateAerialTurnPath(48.0, -32, 16, 1, 30, 5.0, -1);
  assert.ok(aerialCanyon.z < -38, `Expected hover-car to continue down perpendicular -Z canyon, got z=${aerialCanyon.z}`);

  // 5. Phase 3: Anton / Beb / Duminiki cap-safe dual-state hair hides crown hair under cap or hood
  assert.deepEqual(resolveSecretNpcHairVisibility({ wearsCap: true, hoodUp: false }), {
    showHairCrown: false,
    showUnderCapTrim: true,
  });
  assert.deepEqual(resolveSecretNpcHairVisibility({ wearsCap: false, hoodUp: true }), {
    showHairCrown: false,
    showUnderCapTrim: true,
  });
  assert.deepEqual(resolveSecretNpcHairVisibility({ wearsCap: false, hoodUp: false }), {
    showHairCrown: true,
    showUnderCapTrim: true,
  });

  // 6. Phase 5: Brazilian Favela terrain elevation & house grounding (zero floating or buried homes)
  assert.equal(getFavelaHillHeight(0, -15.0), 0);
  const midHill = getFavelaHillHeight(-15, -28);
  const highHill = getFavelaHillHeight(-15, -42);
  assert.ok(midHill > 3 && highHill > midHill, `Expected rising favela terrain: mid=${midHill}, high=${highHill}`);
  const houseFloor = computeFavelaHouseFloorY(-15, -30, 2.8);
  const frontGround = getFavelaHillHeight(-15, -30 + 1.4);
  const backGround = getFavelaHillHeight(-15, -30 - 1.4);
  assert.ok(houseFloor >= frontGround + 0.14, 'House main floor must sit cleanly above downhill slope');
  assert.ok(houseFloor - 4.5 <= frontGround, 'Retaining plinth (-4.5) must anchor deeply below downhill terrain');
  assert.ok(houseFloor >= backGround - 0.72, 'House main floor must avoid burying windows inside uphill slope');
});




