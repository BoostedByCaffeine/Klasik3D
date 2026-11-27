import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Bike,
  BookOpen,
  Cat,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Compass,
  Croissant,
  CupSoda,
  Disc3,
  DoorOpen,
  Download,
  Eye,
  EyeOff,
  Flame,
  Frown,
  Hand,
  Infinity as InfinityIcon,
  Leaf,
  Lock,
  Maximize2,
  Meh,
  Menu,
  Milk,
  Minus,
  Pin,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  SlidersHorizontal,
  Smile,
  Snowflake,
  Sparkles,
  Sprout,
  Store,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  BaristaStationId,
  DELIVERY_PARTNER_BONUS,
  GraphicsQuality,
  KlasikGameState,
  PASTRY_CATALOG,
  PastryId,
  SyrupFlavor,
  canClaimLoginReward,
  cycleGraphicsQuality,
  getCafeCatSpec,
  getMoodTier,
  getNextRecommendedStep,
  getOrderVesselType,
  getPastryById,
  getRecipeById,
  isOrderReadyToServe,
  stripKeyboardShortcutsForApk,
  validateDrinkForServe,
} from '../game/rules';
import { SpotifyVinylState } from '../game/spotifyManager';
import { MusicPlayerSnapshot } from '../game/audio/MusicPlayerController';
import { AppRuntimeVersion } from '../pwa/pwaManager';
import { DailyGoalProgressBar } from './DailyGoalProgressBar';
import { buildStepPipeline, isStepChipCompleted } from './RecipeMenuModal';

interface HudOverlayProps {
  gameState: KlasikGameState;
  spotifyState: SpotifyVinylState;
  audioSnapshot: MusicPlayerSnapshot;
  hasUnseenCatUnlock?: boolean;
  appVersion: AppRuntimeVersion;
  liveClockLabel: string;
  isMuted: boolean;
  hoveredToolLabel: string | null;
  fps: number;
  activeAnimLabel: string | null;
  stepProgress: number | null;
  stepDurationMs: number | null;
  hudPinnedRecipeId?: string | null;
  hudPinnedOrderId?: string | null;
  isPinnedRecipeMinimized?: boolean;
  onToggleMinimizePinnedRecipe?: () => void;
  onUnpinHudRecipe?: () => void;
  onSelectStation: (station: BaristaStationId) => void;
  onPinOrder: (orderId: string) => void;
  onAcceptOrder: (orderId: string) => void;
  onGrabPastry: (pastryId: PastryId) => void;
  onCupAction: (
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
    syrup?: SyrupFlavor
  ) => void;
  onServeCustomer: (customerId?: string) => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onToggleVinyl: () => void;
  onOpenCatStation: () => void;
  onOpenGoOutside: () => void;
  onChangeGraphics: (quality: GraphicsQuality) => void;
  onToggleRealismMode: () => void;
  onRequestFullscreenLandscape: () => void;
  onOpenModal: (
    modal: 'recipes' | 'upgrades' | 'customize' | 'spotify' | 'pwa' | 'export'
  ) => void;
}

const STATION_TABS: Array<{
  id: BaristaStationId;
  name: string;
  short: string;
  badge: string;
}> = [
  { id: 1, name: 'Pastries', short: '1. Pastries', badge: 'St. 1: Pastries' },
  { id: 2, name: 'Orders', short: '2. Orders', badge: 'St. 2: Orders' },
  { id: 3, name: 'Espresso', short: '3. Espresso', badge: 'St. 3: Espresso' },
  { id: 4, name: 'Tea & Milk', short: '4. Tea & Milk', badge: 'St. 4: Tea & Milk' },
  { id: 5, name: 'Serve', short: '5. Serve', badge: 'St. 5: Serve' },
  { id: 6, name: 'Vinyl', short: '6. Vinyl', badge: 'St. 6: Vinyl' },
];

export const HudOverlay: React.FC<HudOverlayProps> = ({
  gameState,
  spotifyState,
  audioSnapshot,
  hasUnseenCatUnlock = false,
  appVersion,
  liveClockLabel,
  isMuted,
  hoveredToolLabel,
  fps,
  activeAnimLabel,
  stepProgress,
  stepDurationMs,
  hudPinnedRecipeId,
  hudPinnedOrderId = null,
  isPinnedRecipeMinimized = false,
  onToggleMinimizePinnedRecipe,
  onUnpinHudRecipe,
  onSelectStation,
  onPinOrder,
  onAcceptOrder,
  onGrabPastry,
  onCupAction,
  onServeCustomer,
  onToggleMute,
  onTogglePause,
  onToggleVinyl,
  onOpenCatStation,
  onOpenGoOutside,
  onChangeGraphics,
  onToggleRealismMode,
  onRequestFullscreenLandscape,
  onOpenModal,
}) => {
  const [hudHidden, setHudHidden] = useState(false);
  const [ticketsCollapsed, setTicketsCollapsed] = useState(false);
  const [topMenuOpen, setTopMenuOpen] = useState(false);

  const isApkVersion = appVersion === 'apk';
  const isRealismMode = Boolean(gameState.realismMode);

  useEffect(() => {
    if (isApkVersion) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'KeyH') {
        e.preventDefault();
        setHudHidden((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isApkVersion]);

  const orderingCustomers = gameState.customers.filter((c) => c.state === 'ordering');
  const pinnedOrder =
    orderingCustomers.find((c) => c.id === gameState.pinnedOrderId) ||
    orderingCustomers[0] ||
    null;
  const targetRecipe = pinnedOrder ? getRecipeById(pinnedOrder.recipeId) : null;
  const nextStep = getNextRecommendedStep(
    gameState.currentCup,
    targetRecipe,
    pinnedOrder,
    gameState.preparedPastry
  );

  const cup = gameState.currentCup;
  const drinkValidation = targetRecipe
    ? validateDrinkForServe(cup, targetRecipe, pinnedOrder)
    : {
        isComplete: false,
        missingSteps: ['Order'],
        wrongIngredients: [],
        hasWrongIngredient: false,
      };
  const orderReadiness = isOrderReadyToServe(cup, gameState.preparedPastry, pinnedOrder);
  const isDrinkReadyToServe = Boolean(targetRecipe) && orderReadiness.ready;
  const activeVessel = getOrderVesselType(pinnedOrder, targetRecipe);
  const isTakeoutVessel =
    activeVessel === 'hot-takeout' || activeVessel === 'iced-takeout';
  const requestedPastrySpec = pinnedOrder?.requestedPastry
    ? getPastryById(pinnedOrder.requestedPastry)
    : null;
  const preparedPastrySpec = gameState.preparedPastry
    ? getPastryById(gameState.preparedPastry)
    : null;
  const isPastrySatisfied =
    !requestedPastrySpec || gameState.preparedPastry === requestedPastrySpec.id;

  const isGoldenEquipped = gameState.equippedMachineSkin === 'golden-espresso-machine';
  const equippedCat = getCafeCatSpec(gameState.equippedCatId);
  const isLiloActive = gameState.equippedCatId === 'lilo';
  const isMikmikActive = gameState.equippedCatId === 'mikmik';
  const firstWaitingOrder = orderingCustomers.find((c) => !c.orderAccepted) || null;
  const unclaimedLoginCount = canClaimLoginReward(gameState) ? 1 : 0;

  const qualityLabel =
    gameState.graphicsQuality === 'max'
      ? 'MAX'
      : gameState.graphicsQuality === 'medium'
      ? 'MED'
      : 'LOW';
  const isStepLocked = Boolean(gameState.activeStepLock) || stepProgress !== null;
  const activeLockLabel = gameState.activeStepLock?.label || 'Brewing...';
  const lockFillPct = Math.min(100, Math.max(4, stepProgress ?? 8));

  const currentStationMeta =
    STATION_TABS.find((s) => s.id === gameState.activeStation) || STATION_TABS[2];

  const handlePrevStation = () => {
    const prevSt = (
      gameState.activeStation > 1 ? gameState.activeStation - 1 : 6
    ) as BaristaStationId;
    onSelectStation(prevSt);
  };

  const handleNextStation = () => {
    const nextSt = (
      gameState.activeStation < 6 ? gameState.activeStation + 1 : 1
    ) as BaristaStationId;
    onSelectStation(nextSt);
  };

  const handleToggleGraphics = () => {
    onChangeGraphics(cycleGraphicsQuality(gameState.graphicsQuality));
  };

  const renderCategoryIcon = () => {
    if (!targetRecipe) return <Coffee className="w-3 h-3 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />;
    if (targetRecipe.category === 'tea') {
      return <Leaf className="w-3 h-3 text-[#34D399] shrink-0" strokeWidth={2.2} />;
    }
    if (targetRecipe.category === 'cold_drink') {
      return <CupSoda className="w-3 h-3 text-[#BAE6FD] shrink-0" strokeWidth={2.2} />;
    }
    if (targetRecipe.category === 'iced_coffee' || pinnedOrder?.customNeedsIce) {
      return <Snowflake className="w-3 h-3 text-[#BAE6FD] shrink-0" strokeWidth={2.2} />;
    }
    return <Flame className="w-3 h-3 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />;
  };

  const displayBannerText = stripKeyboardShortcutsForApk(
    activeAnimLabel || hoveredToolLabel || '',
    isApkVersion
  );

  // PURE 3D IMMERSIVE MODE (When HUD is Hidden via Hide HUD Toggle)
  if (hudHidden) {
    return (
      <div className="absolute inset-0 z-10 pointer-events-none hud-safe-frame overflow-hidden">
        {/* Ultra-minimal floating controls in top-right corner so 98% of 3D view is open */}
        <div className="pointer-events-auto absolute top-2 right-2 flex items-center gap-1.5 glass-pill rounded-full px-2.5 py-1">
          <button
            type="button"
            onClick={handlePrevStation}
            className="glass-btn-inner p-0.5 rounded-full text-[#E4E4E7] cursor-pointer flex items-center justify-center"
            title={isApkVersion ? 'Previous Station' : 'Previous Station [A]'}
            aria-label="Previous Station"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
          <span className="text-[10px] font-mono font-bold text-white glass-text-crisp whitespace-nowrap">
            {currentStationMeta.name}
          </span>
          <button
            type="button"
            onClick={handleNextStation}
            className="glass-btn-inner p-0.5 rounded-full text-[#E4E4E7] cursor-pointer flex items-center justify-center"
            title={isApkVersion ? 'Next Station' : 'Next Station [D]'}
            aria-label="Next Station"
          >
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>

          {targetRecipe && !isRealismMode && (
            <button
              type="button"
              disabled={isStepLocked}
              aria-busy={isStepLocked}
              onClick={() => onCupAction('quick_brew_step')}
              className={`relative overflow-hidden px-2 py-0.5 rounded-full font-bold text-[10px] whitespace-nowrap flex items-center gap-1 shadow ${
                isStepLocked
                  ? 'bg-[#18181B] border border-white/25 text-white cursor-not-allowed'
                  : drinkValidation.hasWrongIngredient
                  ? 'bg-[#F87171] text-[#09090B] cursor-pointer'
                  : isDrinkReadyToServe
                  ? 'bg-[#34D399] text-[#09090B] cursor-pointer'
                  : 'hud-platinum-pill cursor-pointer'
              }`}
              title={stripKeyboardShortcutsForApk(nextStep.instruction, isApkVersion)}
            >
              {isStepLocked && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 hud-platinum-bar opacity-40 transition-all duration-75"
                  style={{ width: `${lockFillPct}%` }}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1">
                {isStepLocked ? (
                  <>
                    <Zap className="w-3 h-3 shrink-0 text-[#E4E4E7]" strokeWidth={2.2} />
                    <span>{activeLockLabel}</span>
                  </>
                ) : drinkValidation.hasWrongIngredient ? (
                  <>
                    <AlertTriangle className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                    <span>Rinse</span>
                  </>
                ) : isDrinkReadyToServe ? (
                  <>
                    <Check className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                    <span>Serve</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                    <span>Brew Step</span>
                  </>
                )}
              </span>
            </button>
          )}

          <button
            type="button"
            data-testid="btn-show-hud"
            onClick={() => setHudHidden(false)}
            className="glass-btn-inner px-2 py-0.5 rounded-full !border-white/25 text-[10px] font-bold text-white cursor-pointer whitespace-nowrap flex items-center gap-1"
            title={isApkVersion ? 'Restore Full Barista HUD' : 'Restore Full Barista HUD [H]'}
          >
            <Eye className="w-3 h-3 shrink-0" strokeWidth={2.2} />
            <span>Show HUD</span>
          </button>
        </div>

        {/* Tiny progress pill at top-center only while actively executing a timed step */}
        {stepProgress !== null && displayBannerText && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 glass-pill rounded-full px-3 py-0.5 flex items-center gap-2">
            <span className="text-[10px] font-semibold text-white glass-text-crisp whitespace-nowrap">
              {displayBannerText}
            </span>
            <div className="w-16 h-1.5 rounded-full bg-[#27272A] overflow-hidden">
              <div
                className="h-full hud-platinum-bar transition-all duration-75"
                style={{ width: `${Math.min(100, Math.max(5, stepProgress))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between overflow-hidden">
      {/* 1. ULTRA-SLIM TOP TELEMETRY RIBBON (All Top Navigation Consolidated Inside Menu Button) */}
      <div className="flex flex-col w-full pointer-events-none relative">
        <div
          data-testid="hud-top-bar"
          className="pointer-events-auto min-h-9 sm:min-h-10 w-full glass-pill !rounded-none !border-x-0 !border-t-0 hud-top-safe flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0"
        >
          {/* Left Cluster: Direct Non-Shrinking Station Indicator + Flexible Mini Order Tickets */}
          <button
            type="button"
            data-testid="hud-station-indicator"
            onClick={() => setTicketsCollapsed((prev) => !prev)}
            className="px-2 py-0.5 rounded-md bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 text-[10px] sm:text-[11px] font-bold text-white glass-text-crisp whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            title="Toggle Order Strip"
          >
            {currentStationMeta.badge}
          </button>

          {isGoldenEquipped && (
            <span className="px-1.5 py-0.5 rounded-md hud-platinum-pill text-[9px] font-mono font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1">
              <Trophy className="w-2.5 h-2.5 shrink-0" strokeWidth={2.2} />
              <span>2x</span>
            </span>
          )}

          {isLiloActive && (
            <span
              data-testid="hud-lilo-passive-badge"
              className="px-1.5 py-0.5 rounded-md bg-[#BAE6FD]/15 border border-[#BAE6FD]/40 text-[9px] font-mono font-bold text-[#BAE6FD] whitespace-nowrap shrink-0 inline-flex items-center gap-1"
              title="Lilo Passive: Customer Mood Meter Disabled"
            >
              <InfinityIcon className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
              <span>Lilo</span>
            </span>
          )}

          {isMikmikActive && (
            <span
              data-testid="hud-mikmik-passive-badge"
              className="px-1.5 py-0.5 rounded-md bg-white/[0.10] border border-white/30 text-[9px] font-mono font-bold text-white whitespace-nowrap shrink-0 inline-flex items-center gap-1"
              title="Mikmik Passive: +30% Drink Revenue & +30% Mood Drain"
            >
              <Cat className="w-2.5 h-2.5 shrink-0" strokeWidth={2.3} />
              <span>+30%</span>
            </span>
          )}

          {!ticketsCollapsed ? (
            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
              {orderingCustomers.map((cust) => {
                const recipe = getRecipeById(cust.recipeId);
                const isPinned = pinnedOrder?.id === cust.id;
                const isTakeout = cust.orderType === 'takeout';
                const isRider = Boolean(cust.isDeliveryRider);
                const custPastry = cust.requestedPastry ? getPastryById(cust.requestedPastry) : null;
                const isZenMode = gameState.mode === 'zen';
                const isAccepted = Boolean(cust.orderAccepted);
                const moodVal = isLiloActive
                  ? 100
                  : Math.max(0, Math.min(100, Math.round(cust.mood ?? cust.patience ?? 100)));
                const moodTier = getMoodTier(moodVal);
                const isImpatient = isAccepted && !isZenMode && !isLiloActive && moodTier === 'impatient';
                const isNeutral = isAccepted && !isZenMode && !isLiloActive && moodTier === 'content';
                const baseTotal =
                  recipe.price + (custPastry?.price ?? 0) + (isRider ? DELIVERY_PARTNER_BONUS : 0);
                const displayPrice = Math.round(
                  baseTotal * (isGoldenEquipped ? 2 : 1) * (isMikmikActive ? 1.3 : 1)
                );

                return (
                  <button
                    key={cust.id}
                    type="button"
                    data-testid={
                      isAccepted ? `hud-order-chip-${cust.id}` : `hud-accept-order-${cust.id}`
                    }
                    onClick={() => (isAccepted ? onPinOrder(cust.id) : onAcceptOrder(cust.id))}
                    className={`relative flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] transition-colors cursor-pointer shrink-0 max-w-[235px] overflow-hidden glass-text-crisp ${
                      !isAccepted
                        ? 'bg-white/[0.14] hover:bg-white/[0.22] border-white/45 text-white font-bold'
                        : isImpatient
                        ? 'bg-[#F87171]/25 border-[#F87171] text-white font-bold'
                        : isPinned
                        ? 'bg-white/[0.12] border-[#E4E4E7] text-white font-semibold'
                        : 'glass-btn-inner text-[#A1A1AA]'
                    }`}
                    title={
                      !isAccepted
                        ? `${cust.customerName} is ready to order — tap to accept`
                        : `${cust.customerName} (${
                            isRider ? 'Delivery Rider' : isTakeout ? 'Takeout' : 'Dine-In'
                          }): ${recipe.name}${custPastry ? ` + ${custPastry.name}` : ''}${
                            isLiloActive
                              ? ' · Mood Disabled (Lilo)'
                              : isZenMode
                              ? ' · Zen Mode'
                              : ` · Mood ${moodVal}/100`
                          }`
                    }
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isAccepted ? recipe.colorHex : '#E4E4E7' }}
                    />
                    <span className="font-semibold truncate">{cust.customerName}</span>
                    {isRider ? (
                      <Bike
                        className={`w-3 h-3 shrink-0 ${
                          cust.riderVariant === 'blue'
                            ? 'text-[#BAE6FD]'
                            : cust.riderVariant === 'red'
                            ? 'text-[#F87171]'
                            : 'text-[#34D399]'
                        }`}
                        strokeWidth={2.4}
                        aria-label="Delivery Rider"
                      />
                    ) : isTakeout ? (
                      <ShoppingBag
                        className="w-2.5 h-2.5 text-[#34D399] shrink-0"
                        strokeWidth={2.4}
                        aria-label="Takeout"
                      />
                    ) : (
                      <Store
                        className="w-2.5 h-2.5 text-[#A1A1AA] shrink-0"
                        strokeWidth={2.2}
                        aria-label="Dine-In"
                      />
                    )}
                    {isAccepted && custPastry && (
                      <Croissant
                        className="w-2.5 h-2.5 text-[#E4E4E7] shrink-0"
                        strokeWidth={2.4}
                        aria-label={custPastry.name}
                      />
                    )}
                    {isAccepted ? (
                      <span className="font-mono tabular-nums text-[#34D399] font-bold shrink-0">
                        ${displayPrice}
                      </span>
                    ) : (
                      <span className="text-[9px] text-[#D4D4D8] shrink-0">Ready to order</span>
                    )}

                    {!isAccepted ? (
                      <span className="inline-flex items-center gap-0.5 font-mono text-[9px] font-bold shrink-0 px-1 rounded hud-platinum-pill">
                        <Hand className="w-2.5 h-2.5 shrink-0" strokeWidth={2.5} />
                        <span>Take Order</span>
                      </span>
                    ) : (
                      <span
                        data-testid={`hud-order-mood-${cust.id}`}
                        className={`inline-flex items-center gap-0.5 font-mono tabular-nums text-[9px] font-bold shrink-0 px-1 rounded ${
                          isLiloActive || isZenMode
                            ? 'bg-[#BAE6FD]/18 text-[#BAE6FD]'
                            : isImpatient
                            ? 'bg-[#F87171]/35 text-white animate-pulse'
                            : isNeutral
                            ? 'bg-white/15 text-[#E4E4E7]'
                            : 'bg-[#34D399]/20 text-[#34D399]'
                        }`}
                      >
                        {isLiloActive ? (
                          <>
                            <InfinityIcon className="w-2.5 h-2.5 shrink-0" strokeWidth={2.5} />
                            <span>Lilo</span>
                          </>
                        ) : isZenMode ? (
                          <>
                            <InfinityIcon className="w-2.5 h-2.5 shrink-0" strokeWidth={2.5} />
                            <span>Zen</span>
                          </>
                        ) : isImpatient ? (
                          <>
                            <Frown className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                            <span>{moodVal}</span>
                          </>
                        ) : isNeutral ? (
                          <>
                            <Meh className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                            <span>{moodVal}</span>
                          </>
                        ) : (
                          <>
                            <Smile className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                            <span>{moodVal}</span>
                          </>
                        )}
                      </span>
                    )}

                    <span
                      className={`absolute bottom-0 left-0 h-[2px] transition-all ${
                        !isAccepted
                          ? 'bg-white'
                          : isLiloActive || isZenMode
                          ? 'bg-[#BAE6FD]'
                          : isImpatient
                          ? 'bg-[#F87171]'
                          : isNeutral
                          ? 'bg-[#A1A1AA]'
                          : 'bg-[#34D399]'
                      }`}
                      style={{ width: `${!isAccepted || isLiloActive || isZenMode ? 100 : moodVal}%` }}
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Center Cluster: Inline Telemetry Stats */}
          <DailyGoalProgressBar
            day={gameState.day}
            mode={gameState.mode}
            cash={gameState.cash}
            dailyRevenue={gameState.dailyRevenue}
            dailyGoal={gameState.dailyGoal}
            dailyOrderQuota={gameState.dailyOrderQuota}
            cupsServedToday={gameState.cupsServedToday}
            satisfactionScore={gameState.satisfactionScore}
            liveClockLabel={liveClockLabel}
          />

          {/* Right Cluster: Consolidated Single Menu Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="btn-top-menu"
              aria-expanded={topMenuOpen}
              aria-label="Open Cafe Menu"
              title="All Cafe Navigation: Graphics, Realism Mode, Music, Recipe Book, Upgrades, Decor, Sound & Hide HUD"
              onClick={() => setTopMenuOpen((prev) => !prev)}
              className={`relative h-7 px-2.5 rounded-md border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap transition-transform ${
                topMenuOpen
                  ? 'hud-platinum-pill'
                  : 'glass-btn-inner !border-white/25 text-white'
              }`}
            >
              {topMenuOpen ? (
                <X className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
              ) : (
                <Menu className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
              )}
              <span>Menu</span>
              {unclaimedLoginCount > 0 && !topMenuOpen && (
                <span className="w-2 h-2 rounded-full bg-white animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Consolidated Top Navigation Menu Drawer */}
        {topMenuOpen && (
          <div
            data-testid="top-navigation-menu-drawer"
            className="pointer-events-auto self-end mr-2 mt-1 w-[320px] sm:w-[460px] glass-panel rounded-xl p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5 z-30"
          >
            {/* 1. 3-Tier Graphics Cycle (LOW -> MED -> MAX) */}
            <button
              type="button"
              data-testid="btn-toggle-graphics"
              onClick={() => {
                handleToggleGraphics();
              }}
              className={`px-2.5 py-2 rounded-lg border font-bold text-xs text-left cursor-pointer flex items-center gap-2 transition-transform ${
                gameState.graphicsQuality === 'max'
                  ? 'hud-platinum-pill'
                  : gameState.graphicsQuality === 'medium'
                  ? 'bg-white/[0.14] border-white/35 text-white shadow'
                  : 'glass-btn-inner'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">GFX: {qualityLabel}</div>
                <div
                  className={`text-[10px] font-mono ${
                    gameState.graphicsQuality === 'max'
                      ? 'text-[#09090B]/80 font-bold'
                      : 'text-[#34D399]'
                  }`}
                >
                  {Math.min(60, Math.max(30, fps))} FPS · Cycle
                </div>
              </div>
            </button>

            {/* 2. Realism Mode Toggle */}
            <button
              type="button"
              data-testid="btn-toggle-realism"
              onClick={() => {
                onToggleRealismMode();
              }}
              className={`px-2.5 py-2 rounded-lg border font-bold text-xs text-left cursor-pointer flex items-center gap-2 transition-transform ${
                isRealismMode
                  ? 'hud-platinum-pill'
                  : 'glass-btn-inner text-white'
              }`}
            >
              <Compass className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">Realism: {isRealismMode ? 'ON' : 'OFF'}</div>
                <div
                  className={`text-[10px] truncate ${
                    isRealismMode ? 'text-[#09090B]/75 font-semibold' : 'text-[#A1A1AA]'
                  }`}
                >
                  {isRealismMode ? 'Touch 3D Tools & Recipe Book' : 'Guided HUD & Shortcuts'}
                </div>
              </div>
            </button>

            {/* 3. Unified Counter Audio Deck */}
            <button
              type="button"
              data-testid="btn-menu-spotify"
              onClick={() => {
                setTopMenuOpen(false);
                onOpenModal('spotify');
              }}
              className="glass-btn-inner px-2.5 py-2 rounded-lg text-white font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <Disc3
                className={`w-4 h-4 text-[#E4E4E7] shrink-0 ${
                  audioSnapshot.isPlaying || spotifyState.isPlaying ? 'animate-spin' : ''
                }`}
                strokeWidth={2.2}
              />
              <div className="min-w-0">
                <div className="truncate">Audio Deck</div>
                <div className="text-[10px] text-[#A1A1AA] truncate capitalize">
                  {audioSnapshot.mode} · {audioSnapshot.isPlaying ? 'Playing' : 'Ready'}
                </div>
              </div>
            </button>

            {/* 4. Recipe Book */}
            <button
              type="button"
              data-testid="btn-menu-recipes"
              onClick={() => {
                setTopMenuOpen(false);
                onOpenModal('recipes');
              }}
              className="glass-btn-inner px-2.5 py-2 rounded-lg text-white font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">Recipe Book</div>
                <div className="text-[10px] text-[#A1A1AA] truncate">Coffee &amp; Tea</div>
              </div>
            </button>

            {/* 5. Upgrades & 50K Golden Machine */}
            <button
              type="button"
              data-testid="btn-menu-upgrades"
              onClick={() => {
                setTopMenuOpen(false);
                onOpenModal('upgrades');
              }}
              className="relative glass-btn-inner px-2.5 py-2 rounded-lg text-white font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">Upgrades &amp; Cats</div>
                <div className="text-[10px] text-[#A1A1AA] truncate">
                  {equippedCat.name} · 50K &amp; Skins
                </div>
              </div>
              {unclaimedLoginCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-white absolute top-1.5 right-1.5" />
              )}
            </button>

            {/* 6. Cafe Decor, Outdoor Sceneries & Weather */}
            <button
              type="button"
              data-testid="btn-menu-decor"
              onClick={() => {
                setTopMenuOpen(false);
                onOpenModal('customize');
              }}
              className="glass-btn-inner px-2.5 py-2 rounded-lg text-white font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <Sprout className="w-4 h-4 text-[#34D399] shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">Decor &amp; Weather</div>
                <div className="text-[10px] text-[#A1A1AA] truncate">3D Previews &amp; Snow</div>
              </div>
            </button>

            {/* 7. Sound & Granular Weather Audio Mute Toggle */}
            <button
              type="button"
              data-testid="btn-toggle-mute"
              onClick={() => {
                onToggleMute();
              }}
              className="glass-btn-inner px-2.5 py-2 rounded-lg text-white font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-[#F87171] shrink-0" strokeWidth={2.2} />
              ) : (
                <Volume2 className="w-4 h-4 text-[#34D399] shrink-0" strokeWidth={2.2} />
              )}
              <div className="min-w-0">
                <div className="truncate">{isMuted ? 'Sound: Off' : 'Sound: On'}</div>
                <div className="text-[10px] text-[#A1A1AA] truncate">Granular Audio</div>
              </div>
            </button>

            {/* 8. Hide HUD Toggle */}
            <button
              type="button"
              data-testid="btn-toggle-hud"
              onClick={() => {
                setTopMenuOpen(false);
                setHudHidden(true);
              }}
              className="glass-btn-inner px-2.5 py-2 rounded-lg text-white font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <EyeOff className="w-4 h-4 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">
                  {isApkVersion ? 'Hide HUD' : 'Hide HUD [H]'}
                </div>
                <div className="text-[10px] text-[#A1A1AA] truncate">Pure 3D View</div>
              </div>
            </button>

            {/* 9. Fullscreen Landscape Lock */}
            <button
              type="button"
              onClick={() => {
                setTopMenuOpen(false);
                onRequestFullscreenLandscape();
              }}
              className="glass-btn-inner px-2.5 py-2 rounded-lg text-white font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <Maximize2 className="w-4 h-4 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">Fullscreen</div>
                <div className="text-[10px] text-[#A1A1AA] truncate">Landscape Lock</div>
              </div>
            </button>

            {/* 10. Install APK / PWA (Web & PWA only) + Pause / Shift Menu */}
            {!isApkVersion ? (
              <button
                type="button"
                onClick={() => {
                  setTopMenuOpen(false);
                  onOpenModal('pwa');
                }}
                className="px-2.5 py-2 rounded-lg hud-platinum-pill font-bold text-xs text-left cursor-pointer flex items-center gap-2"
              >
                <Download className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                <div className="min-w-0">
                  <div className="truncate">Install APK</div>
                  <div className="text-[10px] text-[#09090B]/75 font-semibold truncate">APK &amp; PWA</div>
                </div>
              </button>
            ) : null}

            <button
              type="button"
              data-testid="btn-menu-pause"
              onClick={() => {
                setTopMenuOpen(false);
                onTogglePause();
              }}
              className={`glass-btn-inner px-2.5 py-2 rounded-lg text-white font-semibold text-xs text-left cursor-pointer flex items-center justify-center gap-2 ${
                isApkVersion ? 'col-span-2 sm:col-span-3' : 'col-span-1 sm:col-span-2'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
              <span>
                {isApkVersion
                  ? 'Pause Shift & Save Backup'
                  : 'Pause Shift & Save Backup [Esc / P]'}
              </span>
            </button>
          </div>
        )}

        {/* Ultra-Compact Single-Line Order Strip + Inline Timed Progress */}
        <div className="flex items-start justify-between gap-2 px-2 mt-1.5 pointer-events-none">
          {!ticketsCollapsed && pinnedOrder && targetRecipe ? (
            <div className="pointer-events-auto inline-flex items-center gap-1.5 glass-panel rounded-full px-2.5 py-0.5 max-w-[82%] sm:max-w-2xl overflow-hidden">
              {renderCategoryIcon()}
              <span
                data-testid="order-type-badge"
                className={`inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full border text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                  pinnedOrder.isDeliveryRider
                    ? pinnedOrder.riderVariant === 'blue'
                      ? 'bg-[#BAE6FD]/18 border-[#BAE6FD]/45 text-[#BAE6FD]'
                      : pinnedOrder.riderVariant === 'red'
                      ? 'bg-[#F87171]/18 border-[#F87171]/45 text-[#F87171]'
                      : 'bg-[#34D399]/18 border-[#34D399]/45 text-[#34D399]'
                    : pinnedOrder.orderType === 'takeout'
                    ? 'bg-[#34D399]/18 border-[#34D399]/45 text-[#34D399]'
                    : 'bg-white/[0.08] border-white/20 text-[#E4E4E7]'
                }`}
              >
                {pinnedOrder.isDeliveryRider ? (
                  <>
                    <Bike className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                    <span>Delivery +${DELIVERY_PARTNER_BONUS}</span>
                  </>
                ) : pinnedOrder.orderType === 'takeout' ? (
                  <>
                    <ShoppingBag className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                    <span>Takeout</span>
                  </>
                ) : (
                  <>
                    <Store className="w-2.5 h-2.5 shrink-0" strokeWidth={2.2} />
                    <span>Dine-In</span>
                  </>
                )}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#E4E4E7] glass-text-crisp shrink-0">
                {pinnedOrder.customerName}:
              </span>
              {!pinnedOrder.orderAccepted ? (
                <span
                  data-testid="order-ready-to-order-label"
                  className="text-[10px] sm:text-[11px] font-semibold text-[#D4D4D8] glass-text-crisp truncate"
                >
                  Ready to order
                </span>
              ) : (
                <>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-white glass-text-crisp truncate">
                    {targetRecipe.name}
                  </span>
                  {requestedPastrySpec && (
                    <button
                      type="button"
                      data-testid="order-pastry-badge"
                      onClick={() => onSelectStation(1)}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 cursor-pointer transition-colors ${
                        isPastrySatisfied
                          ? 'bg-[#34D399]/22 border-[#34D399]/60 text-[#34D399]'
                          : 'bg-amber-400/22 hover:bg-amber-400/32 border-amber-300/70 text-amber-100 animate-pulse'
                      }`}
                      title={
                        isPastrySatisfied
                          ? `${requestedPastrySpec.name} plated and ready to serve!`
                          : `Pastry needed — Tap to jump to Station 1 display case & grab ${requestedPastrySpec.name} (+$${requestedPastrySpec.price})`
                      }
                    >
                      {isPastrySatisfied ? (
                        <Check className="w-2.5 h-2.5 shrink-0" strokeWidth={2.8} />
                      ) : (
                        <Croissant className="w-2.5 h-2.5 shrink-0 text-amber-300" strokeWidth={2.4} />
                      )}
                      <span>
                        {isPastrySatisfied
                          ? `${requestedPastrySpec.name} Plated`
                          : `Add ${requestedPastrySpec.name} (+$${requestedPastrySpec.price})`}
                      </span>
                    </button>
                  )}
                  {pinnedOrder.customAddons?.map((addon) => (
                    <span
                      key={addon}
                      className="px-1 py-0 rounded bg-white/[0.08] border border-white/20 text-[9px] font-mono font-semibold text-[#E4E4E7] shrink-0"
                    >
                      {addon}
                    </span>
                  ))}
                  <span className="px-1 py-0 rounded bg-[#34D399]/18 border border-[#34D399]/40 text-[9px] font-mono font-bold text-[#34D399] shrink-0">
                    +${isGoldenEquipped ? pinnedOrder.customBonusTip * 2 : pinnedOrder.customBonusTip}
                  </span>
                </>
              )}
              {(() => {
                const isZenMode = gameState.mode === 'zen';
                if (!pinnedOrder.orderAccepted) {
                  return (
                    <button
                      type="button"
                      data-testid="btn-accept-pinned-order"
                      onClick={() => onAcceptOrder(pinnedOrder.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full hud-platinum-pill text-[9px] font-bold uppercase tracking-wide shrink-0 cursor-pointer"
                    >
                      <Hand className="w-2.5 h-2.5 shrink-0" strokeWidth={2.5} />
                      <span>Accept Order</span>
                    </button>
                  );
                }

                const moodVal = isLiloActive
                  ? 100
                  : Math.max(0, Math.min(100, Math.round(pinnedOrder.mood ?? pinnedOrder.patience ?? 100)));
                const moodTier = getMoodTier(moodVal);
                const isImpatient = !isZenMode && !isLiloActive && moodTier === 'impatient';
                const isNeutral = !isZenMode && !isLiloActive && moodTier === 'content';
                return (
                  <span
                    data-testid="active-order-mood"
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full border text-[9px] font-mono font-bold tabular-nums shrink-0 ${
                      isLiloActive || isZenMode
                        ? 'bg-[#BAE6FD]/18 border-[#BAE6FD]/40 text-[#BAE6FD]'
                        : isImpatient
                        ? 'bg-[#F87171]/30 border-[#F87171] text-white animate-pulse'
                        : isNeutral
                        ? 'bg-white/10 border-white/25 text-[#E4E4E7]'
                        : 'bg-[#34D399]/18 border-[#34D399]/40 text-[#34D399]'
                    }`}
                  >
                    {isLiloActive ? (
                      <>
                        <InfinityIcon className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                        <span>Mood Disabled · Lilo</span>
                      </>
                    ) : isZenMode ? (
                      <>
                        <InfinityIcon className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                        <span>Zen</span>
                      </>
                    ) : (
                      <>
                        {isImpatient ? (
                          <Frown className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                        ) : isNeutral ? (
                          <Meh className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                        ) : (
                          <Smile className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                        )}
                        <span>Mood {moodVal}</span>
                      </>
                    )}
                  </span>
                );
              })()}
              <button
                type="button"
                onClick={() => setTicketsCollapsed(true)}
                className="ml-0.5 text-[#A1A1AA] hover:text-white cursor-pointer shrink-0 flex items-center"
                title="Minimize Order Strip"
                aria-label="Minimize Order Strip"
              >
                <X className="w-3 h-3" strokeWidth={2.2} />
              </button>
            </div>
          ) : (
            <div />
          )}

          {/* Right Stack: Slim Progress Pill + Minimizable Pinned Recipe Card */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {displayBannerText && (() => {
              const isCheatToast = displayBannerText.includes(
                'you got what you wanted, now enjoy'
              );
              const isExpiredAlert =
                displayBannerText.includes('left dissatisfied') ||
                displayBannerText.includes('ran out of patience') ||
                displayBannerText.includes('($0)');
              const isCatToast =
                /(Champy|Chimny|Chunky|Kicks|Cheeto|Katkat|Luna|Mikmik|Lilo|purring|Cafe Cat|adopted)/i.test(
                  displayBannerText
                );
              const isHappyTipToast =
                displayBannerText.includes('Happy Tip') ||
                displayBannerText.includes('Fast Service!');
              return (
                <div
                  data-testid="hud-feedback-banner"
                  className={`pointer-events-none inline-flex items-center gap-2 glass-pill glass-text-crisp text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full max-w-[60%] truncate ${
                    isCheatToast
                      ? '!bg-[#18181B]/95 !border-white/55 text-white font-bold shadow-[0_0_22px_rgba(255,255,255,0.22)]'
                      : isExpiredAlert
                      ? '!bg-[#18181B]/95 !border-[#F87171]/70 text-[#F87171]'
                      : isCatToast
                      ? '!border-white/30 text-white'
                      : isHappyTipToast
                      ? '!border-[#34D399]/60 text-[#34D399]'
                      : 'text-white'
                  }`}
                >
                  <span className="truncate">{displayBannerText}</span>
                  {stepDurationMs && stepProgress !== null && (
                    <span className="text-[9px] font-mono text-[#E4E4E7] shrink-0">
                      {(stepDurationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {stepProgress !== null && (
                    <div className="w-14 h-1.5 rounded-full bg-[#27272A] overflow-hidden shrink-0">
                      <div
                        className="h-full hud-platinum-bar transition-all duration-75"
                        style={{ width: `${Math.min(100, Math.max(5, stepProgress))}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Floating Minimizable Pinned Recipe Tracker */}
            {hudPinnedRecipeId && (() => {
              const pinnedBookRecipe = getRecipeById(hudPinnedRecipeId);
              const linkedOrder =
                (hudPinnedOrderId
                  ? orderingCustomers.find((c) => c.id === hudPinnedOrderId)
                  : null) ||
                orderingCustomers.find(
                  (c) => c.id === gameState.pinnedOrderId && c.recipeId === hudPinnedRecipeId
                ) ||
                orderingCustomers.find((c) => c.recipeId === hudPinnedRecipeId) ||
                null;
              const isZenMode = gameState.mode === 'zen';
              const moodVal = isLiloActive
                ? 100
                : Math.max(0, Math.min(100, Math.round(linkedOrder?.mood ?? linkedOrder?.patience ?? 100)));
              const moodTier = getMoodTier(moodVal);
              const isUrgent = Boolean(
                linkedOrder && linkedOrder.orderAccepted && !isZenMode && !isLiloActive && moodTier === 'impatient'
              );
              const isWarning = Boolean(
                linkedOrder && linkedOrder.orderAccepted && !isZenMode && !isLiloActive && moodTier === 'content'
              );

              const steps = buildStepPipeline(pinnedBookRecipe);
              const completedCount = steps.filter((s) =>
                isStepChipCompleted(s, gameState.currentCup, pinnedBookRecipe)
              ).length;
              const nextIncompleteIdx = steps.findIndex(
                (s) => !isStepChipCompleted(s, gameState.currentCup, pinnedBookRecipe)
              );

              if (isPinnedRecipeMinimized) {
                return (
                  <div
                    data-testid="pinned-recipe-pill"
                    className={`pointer-events-auto glass-pill rounded-full px-2.5 py-1 flex items-center gap-1.5 border shadow-lg ${
                      isUrgent ? 'border-[#F87171]/80' : 'border-white/25'
                    }`}
                  >
                    <button
                      type="button"
                      data-testid="btn-toggle-pinned-recipe"
                      onClick={() => onToggleMinimizePinnedRecipe?.()}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white hover:text-[#E4E4E7] cursor-pointer"
                      title="Expand Pinned Recipe Steps"
                    >
                      <Pin className="w-3 h-3 text-[#E4E4E7] shrink-0" strokeWidth={2.4} />
                      <span className="max-w-[140px] truncate">{pinnedBookRecipe.name}</span>
                      {linkedOrder && linkedOrder.orderAccepted && (
                        <span
                          className={`text-[10px] font-mono tabular-nums font-bold ${
                            isLiloActive || isZenMode
                              ? 'text-[#BAE6FD]'
                              : isUrgent
                              ? 'text-[#F87171] animate-pulse'
                              : isWarning
                              ? 'text-[#E4E4E7]'
                              : 'text-[#34D399]'
                          }`}
                        >
                          {isLiloActive ? '∞ Lilo' : isZenMode ? '∞ Zen' : `M:${moodVal}`}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-[#E4E4E7] font-bold">
                        {completedCount}/{steps.length - 1}
                      </span>
                      <ChevronDown className="w-3 h-3 text-[#A1A1AA] shrink-0" strokeWidth={2.4} />
                    </button>
                    <button
                      type="button"
                      data-testid="btn-unpin-recipe"
                      onClick={() => onUnpinHudRecipe?.()}
                      className="text-[#A1A1AA] hover:text-white cursor-pointer pl-0.5"
                      title="Unpin Recipe"
                      aria-label="Unpin Recipe"
                    >
                      <X className="w-3 h-3" strokeWidth={2.3} />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  data-testid="pinned-recipe-card"
                  className={`pointer-events-auto glass-panel rounded-xl px-3 py-2 w-[245px] sm:w-[278px] border space-y-1.5 ${
                    isUrgent ? 'border-[#F87171]/75' : 'border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Pin className="w-3.5 h-3.5 text-[#E4E4E7] shrink-0" strokeWidth={2.3} />
                      <span className="text-xs font-bold text-white truncate glass-text-crisp">
                        {pinnedBookRecipe.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {linkedOrder && (
                        <span
                          data-testid="pinned-recipe-mood"
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold tabular-nums ${
                            !linkedOrder.orderAccepted
                              ? 'bg-white/15 text-white'
                              : isLiloActive || isZenMode
                              ? 'bg-[#BAE6FD]/18 text-[#BAE6FD]'
                              : isUrgent
                              ? 'bg-[#F87171]/35 text-white animate-pulse'
                              : isWarning
                              ? 'bg-white/12 text-[#E4E4E7]'
                              : 'bg-[#34D399]/18 text-[#34D399]'
                          }`}
                        >
                          {!linkedOrder.orderAccepted ? (
                            <span>Waiting</span>
                          ) : isLiloActive ? (
                            <>
                              <InfinityIcon className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                              <span>Lilo</span>
                            </>
                          ) : isZenMode ? (
                            <>
                              <InfinityIcon className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                              <span>Zen</span>
                            </>
                          ) : (
                            <>
                              {isUrgent ? (
                                <Frown className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                              ) : isWarning ? (
                                <Meh className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                              ) : (
                                <Smile className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                              )}
                              <span>{moodVal}</span>
                            </>
                          )}
                        </span>
                      )}
                      <button
                        type="button"
                        data-testid="btn-toggle-pinned-recipe"
                        onClick={() => onToggleMinimizePinnedRecipe?.()}
                        className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-[#E4E4E7] flex items-center justify-center cursor-pointer"
                        title="Minimize Pinned Recipe"
                        aria-label="Minimize Pinned Recipe"
                      >
                        <Minus className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        data-testid="btn-unpin-recipe"
                        onClick={() => onUnpinHudRecipe?.()}
                        className="w-5 h-5 rounded-md bg-white/10 hover:bg-[#F87171]/30 text-[#A1A1AA] hover:text-white flex items-center justify-center cursor-pointer"
                        title="Unpin Recipe"
                        aria-label="Unpin Recipe"
                      >
                        <X className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                  {linkedOrder && (
                    <div className="flex items-center flex-wrap gap-1 text-[10px] text-[#A1A1AA]">
                      <span className="font-bold text-white">{linkedOrder.customerName}</span>
                      <span
                        className={`px-1 py-0 rounded border text-[9px] font-bold uppercase ${
                          linkedOrder.orderType === 'takeout'
                            ? 'bg-[#34D399]/18 border-[#34D399]/40 text-[#34D399]'
                            : 'bg-white/[0.08] border-white/20 text-[#E4E4E7]'
                        }`}
                      >
                        {linkedOrder.orderType === 'takeout' ? 'Takeout' : 'Dine-In'}
                      </span>
                      {linkedOrder.customAddons?.map((addon) => (
                        <span
                          key={`pin-addon-${addon}`}
                          className="px-1 py-0 rounded bg-white/[0.08] border border-white/20 text-[9px] font-mono text-[#E4E4E7]"
                        >
                          {addon}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1">
                    {steps.map((chip, idx) => {
                      const done = isStepChipCompleted(chip, gameState.currentCup, pinnedBookRecipe);
                      const isCurrent = idx === nextIncompleteIdx;
                      return (
                        <span
                          key={`hud-pin-${chip.stepNum}`}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${
                            done
                              ? 'bg-[#34D399]/18 border-[#34D399]/45 text-[#34D399] line-through opacity-85'
                              : isCurrent
                              ? 'hud-platinum-pill font-bold'
                              : 'bg-[#18181B]/75 border-white/12 text-[#A1A1AA]'
                          }`}
                        >
                          {done ? (
                            <Check className="w-2.5 h-2.5 text-[#34D399] shrink-0" strokeWidth={2.8} />
                          ) : (
                            <span className="font-mono opacity-80">{chip.stepNum}.</span>
                          )}
                          <span>{chip.label}</span>
                          <span className="text-[9px] font-mono opacity-70">{chip.stationTag}</span>
                        </span>
                      );
                    })}
                  </div>
                  {linkedOrder && linkedOrder.orderAccepted && !isZenMode && !isLiloActive && (
                    <div className="w-full h-1 rounded-full bg-[#27272A] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          isUrgent
                            ? 'bg-[#F87171]'
                            : isWarning
                            ? 'bg-[#A1A1AA]'
                            : 'bg-[#34D399]'
                        }`}
                        style={{ width: `${moodVal}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 2. SINGLE-ROW EDGE-TO-EDGE BOTTOM BAR */}
      <div
        className="pointer-events-auto min-h-9 sm:min-h-10 w-full glass-panel !rounded-none !border-x-0 !border-b-0 hud-bottom-safe flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0"
      >
        {/* Left Side: Direct-Access Icon + Label Station Pill Bar (Brushed Platinum Active Pill) */}
        <div
          data-testid="station-switcher-pill"
          className="inline-flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0"
          role="group"
          aria-label="Barista Stations & Cafe Views"
        >
          {(
            [
              { id: 1 as BaristaStationId, label: 'Pastry', Icon: Croissant, testId: 'pill-station-1' },
              { id: 2 as BaristaStationId, label: 'Orders', Icon: ReceiptText, testId: 'pill-station-2' },
              { id: 3 as BaristaStationId, label: 'Brew', Icon: Coffee, testId: 'pill-station-3' },
              { id: 4 as BaristaStationId, label: 'Milk', Icon: Milk, testId: 'pill-station-4' },
              { id: 5 as BaristaStationId, label: 'Serve', Icon: Bell, testId: 'pill-station-5' },
            ] as const
          ).map((st) => {
            const Icon = st.Icon;
            const isActive = gameState.activeStation === st.id;
            const isRecommended =
              !isRealismMode &&
              Boolean(targetRecipe) &&
              nextStep.station === st.id &&
              !isActive;
            return (
              <button
                key={st.id}
                type="button"
                data-testid={st.testId}
                onClick={() => onSelectStation(st.id)}
                className={`relative min-w-[44px] sm:min-w-[48px] px-1.5 py-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform shrink-0 ${
                  isActive
                    ? 'hud-platinum-pill'
                    : isRecommended
                    ? 'bg-white/[0.12] hover:bg-white/[0.18] border-white/45 text-white'
                    : 'bg-[#09090B]/78 hover:bg-[#18181B]/92 border-white/14 text-[#A1A1AA] hover:text-white'
                }`}
                title={`${st.label} (Station ${st.id})`}
                aria-label={`${st.label} Station`}
                aria-pressed={isActive}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                <span className="text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider leading-none">
                  {st.label}
                </span>
                {isRecommended && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-white absolute top-0.5 right-0.5"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}

          {/* Direct Cat Station Pill */}
          <button
            type="button"
            data-testid="btn-open-cat-station"
            onClick={onOpenCatStation}
            className="relative min-w-[44px] sm:min-w-[48px] px-1.5 py-1 rounded-xl border bg-[#09090B]/78 hover:bg-[#18181B]/92 border-white/14 hover:border-white/35 text-[#A1A1AA] hover:text-white flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all shrink-0"
            title={`Visit ${equippedCat.name} · Pet, Comb, Feed Treats & Customize Wardrobe`}
            aria-label={`Open Cat Station (${equippedCat.name})`}
          >
            <Cat className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
            <span className="text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider leading-none">
              Cats
            </span>
            {hasUnseenCatUnlock && (
              <span
                data-testid="cat-unlock-badge-dot"
                className="w-2 h-2 rounded-full bg-white border border-[#09090B] absolute -top-0.5 -right-0.5"
                aria-label="New cat or cosmetic unlocked"
              />
            )}
          </button>

          {/* Direct Go Outside Scenic Overlook Pill */}
          <button
            type="button"
            data-testid="btn-open-go-outside"
            onClick={onOpenGoOutside}
            className="relative min-w-[44px] sm:min-w-[50px] px-1.5 py-1 rounded-xl border bg-[#09090B]/78 hover:bg-[#18181B]/92 border-white/14 hover:border-white/35 text-[#A1A1AA] hover:text-white flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all shrink-0"
            title="Step Outside to Scenic Overlook (Mood Paused)"
            aria-label="Go Outside Scenic Overlook"
          >
            <DoorOpen className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
            <span className="text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider leading-none">
              Outside
            </span>
          </button>

          {/* Direct Audio Deck (Station 6) Pill */}
          <button
            type="button"
            data-testid="pill-station-6"
            onClick={() => onSelectStation(6)}
            className={`relative min-w-[44px] sm:min-w-[48px] px-1.5 py-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-transform shrink-0 ${
              gameState.activeStation === 6
                ? 'hud-platinum-pill'
                : 'bg-[#09090B]/78 hover:bg-[#18181B]/92 border-white/14 text-[#A1A1AA] hover:text-white'
            }`}
            title="Audio Deck (Station 6)"
            aria-label="Audio Station"
            aria-pressed={gameState.activeStation === 6}
          >
            <Disc3
              className={`w-3.5 h-3.5 shrink-0 ${
                audioSnapshot.isPlaying ? 'animate-spin' : ''
              }`}
              strokeWidth={2.2}
            />
            <span className="text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider leading-none">
              Audio
            </span>
          </button>
        </div>

        {/* Center: Guided One-Tap Next Step Shortcut OR Realism Mode Diegetic Indicator */}
        {!isRealismMode && targetRecipe && (
          <button
            type="button"
            data-testid="btn-quick-brew-step"
            disabled={isStepLocked}
            aria-busy={isStepLocked}
            onClick={(e) => {
              e.currentTarget.blur();
              if (isStepLocked) return;
              onCupAction('quick_brew_step');
            }}
            className={`relative overflow-hidden px-2.5 sm:px-3 py-1 rounded-md font-bold text-[10px] sm:text-xs whitespace-nowrap shrink-0 flex items-center gap-1 transition-transform ${
              isStepLocked
                ? 'bg-[#18181B] border border-white/30 text-white cursor-not-allowed shadow-inner'
                : drinkValidation.hasWrongIngredient
                ? 'bg-[#F87171] hover:brightness-105 text-[#09090B] animate-pulse shadow cursor-pointer'
                : 'hud-platinum-pill cursor-pointer'
            }`}
            title={stripKeyboardShortcutsForApk(
              `${targetRecipe.name}: ${nextStep.instruction}`,
              isApkVersion
            )}
          >
            {isStepLocked && (
              <span
                data-testid="quick-brew-progress-fill"
                aria-hidden="true"
                className="absolute inset-y-0 left-0 hud-platinum-bar opacity-40 transition-all duration-75"
                style={{ width: `${lockFillPct}%` }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1">
              {isStepLocked ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-[#E4E4E7] shrink-0 animate-pulse" strokeWidth={2.2} />
                  <span>{activeLockLabel}</span>
                </>
              ) : drinkValidation.hasWrongIngredient ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                  <span>{isApkVersion ? 'Rinse' : 'Rinse [R]'}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                  <span>
                    {nextStep.toolKey === 'pastry'
                      ? '+Pastry'
                      : nextStep.toolKey === 'grinder'
                      ? 'Grind'
                      : nextStep.toolKey === 'tamper'
                      ? 'Tamp'
                      : nextStep.toolKey === 'espresso'
                      ? 'Shot'
                      : nextStep.toolKey === 'tea'
                      ? 'Tea'
                      : nextStep.toolKey === 'milk'
                      ? 'Milk'
                      : nextStep.toolKey === 'ice'
                      ? '+Ice'
                      : nextStep.toolKey === 'syrup'
                      ? '+Syrup'
                      : 'Serve'}
                  </span>
                </>
              )}
            </span>
          </button>
        )}

        {isRealismMode && (
          <div
            data-testid="realism-mode-active-strip"
            className="flex items-center gap-1.5 shrink-0"
          >
            <span className="px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/20 text-[10px] sm:text-xs font-semibold text-white glass-text-crisp whitespace-nowrap inline-flex items-center gap-1">
              <Compass className="w-3 h-3 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
              <span>Realism Mode: Touch 3D Equipment</span>
            </span>
            {preparedPastrySpec && (
              <span className="px-1.5 py-0.5 rounded-md bg-[#34D399]/18 border border-[#34D399]/45 text-[10px] font-semibold text-[#34D399] whitespace-nowrap inline-flex items-center gap-1">
                <Croissant className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                <span>{preparedPastrySpec.name}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => onOpenModal('recipes')}
              className="glass-btn-inner px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
              <span>Recipe Book</span>
            </button>
          </div>
        )}

        {/* Right Side: Context-Sensitive 6-Station Actions + Realism Mode Serve Order Button */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Station 1: Pastries Showcase Quick-Grab Bar */}
          {!isRealismMode && gameState.activeStation === 1 && (
            <>
              {PASTRY_CATALOG.map((pastry) => {
                const isSelected = gameState.preparedPastry === pastry.id;
                const isRequested = pinnedOrder?.requestedPastry === pastry.id;
                return (
                  <button
                    key={pastry.id}
                    type="button"
                    data-testid={`btn-pastry-${pastry.id}`}
                    onClick={() => onGrabPastry(pastry.id)}
                    className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold whitespace-nowrap flex items-center gap-1 cursor-pointer transition-transform ${
                      isSelected
                        ? 'bg-[#34D399]/18 border-[#34D399]/55 text-[#34D399] shadow'
                        : isRequested
                        ? 'hud-platinum-pill font-bold'
                        : 'glass-btn-inner text-[#E4E4E7]'
                    }`}
                    title={`Grab ${pastry.name} (+$${pastry.price}) — never resets coffee steps!`}
                  >
                    {isSelected ? (
                      <Check className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                    ) : (
                      <Croissant className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                    )}
                    <span>
                      {pastry.name} +${pastry.price}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {/* Station 2: Orders & POS Counter */}
          {!isRealismMode && gameState.activeStation === 2 && (
            <>
              {firstWaitingOrder && (
                <button
                  type="button"
                  data-testid="btn-station1-accept-order"
                  onClick={() => onAcceptOrder(firstWaitingOrder.id)}
                  className="px-2 py-1 rounded-md hud-platinum-pill text-[10px] sm:text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1"
                >
                  <Hand className="w-3 h-3 shrink-0" strokeWidth={2.4} />
                  <span>Take {firstWaitingOrder.customerName}&apos;s Order</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenModal('recipes')}
                className="glass-btn-inner px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                <BookOpen className="w-3 h-3 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
                <span>Recipe Book</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectStation(3)}
                className="glass-btn-inner px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold text-white cursor-pointer whitespace-nowrap flex items-center gap-1 transition-colors"
              >
                <span>Espresso Bar</span>
                <ArrowRight className="w-3 h-3 shrink-0" strokeWidth={2.2} />
              </button>
            </>
          )}

          {/* Station 3: Espresso Bar & Pressurized Rinser / Trash Chute */}
          {!isRealismMode && gameState.activeStation === 3 && (
            <>
              <button
                type="button"
                data-testid="btn-action-grind"
                disabled={isStepLocked}
                aria-busy={isStepLocked}
                onClick={() => onCupAction('grind')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
                  isStepLocked
                    ? 'opacity-50 cursor-not-allowed bg-[#18181B]/60 border-white/10 text-[#71717A]'
                    : cup.hasGrounds
                    ? 'bg-[#34D399]/18 border-[#34D399]/50 text-[#34D399] cursor-pointer'
                    : 'glass-btn-inner !border-white/25 text-white cursor-pointer'
                }`}
              >
                {cup.hasGrounds && <Check className="w-3 h-3 shrink-0" strokeWidth={2.2} />}
                <span>
                  {cup.hasGrounds
                    ? 'Ground'
                    : isApkVersion
                    ? '1. Grind'
                    : '1. Grind [G]'}
                </span>
              </button>
              <button
                type="button"
                data-testid="btn-action-tamp"
                disabled={isStepLocked}
                aria-busy={isStepLocked}
                onClick={() => onCupAction('tamp')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
                  isStepLocked
                    ? 'opacity-50 cursor-not-allowed bg-[#18181B]/60 border-white/10 text-[#71717A]'
                    : cup.isTamped
                    ? 'bg-[#34D399]/18 border-[#34D399]/50 text-[#34D399] cursor-pointer'
                    : cup.hasGrounds
                    ? 'glass-btn-inner !border-white/25 text-white cursor-pointer'
                    : 'bg-[#18181B]/50 border-white/10 text-[#71717A] cursor-pointer'
                }`}
                title={!cup.hasGrounds ? 'Grind beans first before tamping!' : 'Tamp coffee puck'}
              >
                {cup.isTamped && <Check className="w-3 h-3 shrink-0" strokeWidth={2.2} />}
                <span>
                  {cup.isTamped
                    ? 'Tamped'
                    : isApkVersion
                    ? '2. Tamp'
                    : '2. Tamp [T]'}
                </span>
              </button>
              <button
                type="button"
                data-testid="btn-action-shot"
                disabled={isStepLocked}
                aria-busy={isStepLocked}
                onClick={() => onCupAction('pull_espresso')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${
                  isStepLocked
                    ? 'opacity-50 cursor-not-allowed bg-[#18181B]/60 border-white/10 text-[#71717A]'
                    : cup.hasEspresso
                    ? 'bg-[#34D399]/18 border-[#34D399]/50 text-[#34D399] cursor-pointer'
                    : cup.hasGrounds && cup.isTamped
                    ? 'glass-btn-inner !border-white/25 text-white cursor-pointer'
                    : 'bg-[#18181B]/50 border-white/10 text-[#71717A] cursor-pointer'
                }`}
                title={
                  !cup.hasGrounds || !cup.isTamped
                    ? 'Grind and tamp the puck before pulling a shot!'
                    : 'Pull 9-bar double espresso shot'
                }
              >
                {cup.hasEspresso && <Check className="w-3 h-3 shrink-0" strokeWidth={2.2} />}
                <span>
                  {cup.hasEspresso
                    ? 'Shot'
                    : isApkVersion
                    ? '3. Shot'
                    : '3. Shot [E]'}
                </span>
              </button>
              <button
                type="button"
                data-testid="btn-action-rinse"
                disabled={isStepLocked}
                aria-busy={isStepLocked}
                onClick={() => onCupAction('rinse_cup')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${
                  isStepLocked
                    ? 'opacity-50 cursor-not-allowed bg-[#18181B]/60 border-white/10 text-[#71717A]'
                    : drinkValidation.hasWrongIngredient
                    ? 'bg-[#F87171] hover:brightness-105 border-white/50 text-[#09090B] animate-pulse cursor-pointer'
                    : 'glass-btn-inner text-[#A1A1AA] cursor-pointer'
                }`}
                title={
                  isTakeoutVessel
                    ? 'Discard takeout cup into Barista Trash Chute'
                    : 'Rinse cup on Pressurized Glass Rinser'
                }
              >
                {drinkValidation.hasWrongIngredient ? (
                  <AlertTriangle className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                ) : isTakeoutVessel ? (
                  <Trash2 className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                ) : (
                  <RotateCcw className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                )}
                <span>
                  {isTakeoutVessel
                    ? isApkVersion
                      ? 'Discard'
                      : 'Discard [R]'
                    : isApkVersion
                    ? 'Rinse'
                    : 'Rinse [R]'}
                </span>
              </button>
            </>
          )}

          {/* Station 4: Tea, Milk, Ice & Artisan Syrups */}
          {!isRealismMode && gameState.activeStation === 4 && (
            <>
              <button
                type="button"
                disabled={isStepLocked}
                aria-busy={isStepLocked}
                onClick={() => onCupAction('steep_tea')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${
                  isStepLocked
                    ? 'opacity-50 cursor-not-allowed bg-[#18181B]/60 border-white/10 text-[#71717A]'
                    : cup.hasSteepedTea
                    ? 'bg-[#34D399]/18 border-[#34D399]/50 text-[#34D399] cursor-pointer'
                    : 'glass-btn-inner text-white cursor-pointer'
                }`}
              >
                <Leaf className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                <span>Tea</span>
              </button>
              <button
                type="button"
                disabled={isStepLocked}
                aria-busy={isStepLocked}
                onClick={() => onCupAction('steam_milk')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${
                  isStepLocked
                    ? 'opacity-50 cursor-not-allowed bg-[#18181B]/60 border-white/10 text-[#71717A]'
                    : cup.hasSteamedMilk
                    ? 'bg-[#34D399]/18 border-[#34D399]/50 text-[#34D399] cursor-pointer'
                    : cup.hasEspresso || cup.hasSteepedTea
                    ? 'glass-btn-inner !border-white/25 text-white cursor-pointer'
                    : 'bg-[#18181B]/50 border-white/10 text-[#71717A] cursor-pointer'
                }`}
              >
                {cup.hasSteamedMilk && <Check className="w-3 h-3 shrink-0" strokeWidth={2.2} />}
                <span>Milk</span>
              </button>
              <button
                type="button"
                disabled={isStepLocked}
                aria-busy={isStepLocked}
                onClick={() => onCupAction('add_ice')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                  isStepLocked
                    ? 'opacity-50 cursor-not-allowed bg-[#18181B]/60 border-white/10 text-[#71717A]'
                    : cup.hasIce
                    ? 'bg-[#BAE6FD]/20 border-[#BAE6FD]/55 text-[#BAE6FD] cursor-pointer'
                    : 'glass-btn-inner text-[#BAE6FD] cursor-pointer'
                }`}
              >
                +Ice
              </button>
              {(
                [
                  { id: 'vanilla', label: '+Van' },
                  { id: 'caramel', label: '+Car' },
                  { id: 'chocolate', label: '+Choc' },
                  { id: 'matcha', label: '+Matcha' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={isStepLocked}
                  aria-busy={isStepLocked}
                  onClick={() => onCupAction('add_syrup', s.id)}
                  className={`px-1.5 py-1 rounded-md border text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                    isStepLocked
                      ? 'opacity-50 cursor-not-allowed bg-[#18181B]/60 border-white/10 text-[#71717A]'
                      : cup.syrup === s.id
                      ? 'hud-platinum-pill font-bold cursor-pointer'
                      : 'glass-btn-inner text-[#E4E4E7] cursor-pointer'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              {drinkValidation.hasWrongIngredient && (
                <button
                  type="button"
                  disabled={isStepLocked}
                  aria-busy={isStepLocked}
                  onClick={() => onCupAction('rinse_cup')}
                  className="px-1.5 py-1 rounded-md bg-[#F87171] hover:brightness-105 border border-white/50 text-[10px] sm:text-xs font-bold text-[#09090B] cursor-pointer whitespace-nowrap animate-pulse flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                  <span>{isTakeoutVessel ? 'Discard' : 'Rinse'}</span>
                </button>
              )}
            </>
          )}

          {/* Station 5: Serve Coaster & Pastry Staging */}
          {!isRealismMode && gameState.activeStation === 5 && (
            <button
              type="button"
              disabled={isStepLocked}
              aria-busy={isStepLocked}
              onClick={() => onCupAction('rinse_cup')}
              className={`px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold whitespace-nowrap flex items-center gap-1 ${
                isStepLocked
                  ? 'opacity-50 cursor-not-allowed bg-[#18181B]/60 border-white/10 text-[#71717A]'
                  : drinkValidation.hasWrongIngredient
                  ? 'bg-[#F87171] hover:brightness-105 border-white/50 text-[#09090B] animate-pulse cursor-pointer'
                  : 'glass-btn-inner text-[#A1A1AA] cursor-pointer'
              }`}
            >
              {isTakeoutVessel ? (
                <Trash2 className="w-3 h-3 shrink-0" strokeWidth={2.2} />
              ) : (
                <RotateCcw className="w-3 h-3 shrink-0" strokeWidth={2.2} />
              )}
              <span>
                {isTakeoutVessel
                  ? isApkVersion
                    ? 'Discard Cup'
                    : 'Discard Cup [R]'
                  : isApkVersion
                  ? 'Rinse Cup'
                  : 'Rinse Cup [R]'}
              </span>
            </button>
          )}

          {/* Station 6: Unified Counter Audio & Upgrades */}
          {gameState.activeStation === 6 && (
            <>
              <button
                type="button"
                onClick={onToggleVinyl}
                className="glass-btn-inner px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
              >
                {audioSnapshot.isPlaying ? 'Pause Audio' : 'Play Audio'}
              </button>
              <button
                type="button"
                onClick={() => onOpenModal('spotify')}
                className="glass-btn-inner px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold text-white cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                <Disc3 className="w-3 h-3 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
                <span className="capitalize">Deck · {audioSnapshot.mode}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenModal('upgrades')}
                className="glass-btn-inner px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Shop &amp; 50K
              </button>
            </>
          )}

          {/* Phase 4 Realism Mode Serve Order Button */}
          {isRealismMode && (gameState.activeStation === 5 || isDrinkReadyToServe) && (
            <button
              type="button"
              data-testid="btn-realism-serve"
              disabled={isStepLocked}
              aria-busy={isStepLocked}
              onClick={() => onServeCustomer()}
              className={`px-2.5 sm:px-3.5 py-1 rounded-md font-bold text-[10px] sm:text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isStepLocked
                  ? 'opacity-50 cursor-not-allowed bg-[#18181B]/60 border border-white/10 text-[#71717A]'
                  : isDrinkReadyToServe
                  ? 'hud-platinum-pill animate-pulse cursor-pointer'
                  : 'glass-btn-inner text-[#E4E4E7] cursor-pointer'
              }`}
              title={
                isDrinkReadyToServe
                  ? 'Serve Completed Order (or tap the glowing 3D cup / bell!)'
                  : orderReadiness.missingPastry
                  ? `Grab ${orderReadiness.missingPastry.name} at Station 1 first!`
                  : `Incomplete order — missing: ${drinkValidation.missingSteps.join(', ')}`
              }
            >
              {isDrinkReadyToServe ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 shrink-0" strokeWidth={2.3} />
                  <span>Serve Order</span>
                  <ArrowRight className="w-3 h-3 shrink-0" strokeWidth={2.4} />
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                  <span>Serve Order</span>
                </>
              )}
            </button>
          )}

          {/* Guided Mode Strict Validated Serve Button */}
          {!isRealismMode && (
            <button
              type="button"
              data-testid="btn-action-serve"
              disabled={isStepLocked}
              aria-busy={isStepLocked}
              onClick={() => onServeCustomer()}
              className={`px-2 sm:px-3 py-1 rounded-md font-bold text-[10px] sm:text-xs whitespace-nowrap transition-all flex items-center gap-1 ${
                isStepLocked
                  ? 'opacity-50 cursor-not-allowed bg-[#18181B]/60 border border-white/10 text-[#71717A]'
                  : isDrinkReadyToServe
                  ? 'hud-platinum-pill cursor-pointer'
                  : drinkValidation.hasWrongIngredient
                  ? 'bg-[#F87171]/20 hover:bg-[#F87171]/30 border border-[#F87171]/60 text-[#F87171] cursor-pointer'
                  : 'bg-[#18181B]/60 hover:bg-[#27272A]/80 border border-white/12 text-[#71717A] cursor-pointer'
              }`}
              title={
                isDrinkReadyToServe
                  ? 'Ring Bell & Serve Completed Order!'
                  : drinkValidation.hasWrongIngredient
                  ? `Wrong ingredient (${drinkValidation.wrongIngredients[0]})! Serving will upset customer.`
                  : orderReadiness.missingPastry
                  ? `Grab ${orderReadiness.missingPastry.name} from Station 1 Pastries!`
                  : `Order incomplete! Missing: ${drinkValidation.missingSteps.join(', ')}`
              }
            >
              {isDrinkReadyToServe ? (
                <>
                  <span>Serve</span>
                  <ArrowRight className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                </>
              ) : drinkValidation.hasWrongIngredient ? (
                <>
                  <AlertTriangle className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                  <span>Serve (Wrong)</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                  <span>Serve</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
