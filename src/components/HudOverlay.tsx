import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  CupSoda,
  Disc3,
  Download,
  Eye,
  EyeOff,
  Flame,
  Leaf,
  Lock,
  Maximize2,
  Menu,
  RotateCcw,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Sprout,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  BaristaStationId,
  GraphicsQuality,
  KlasikGameState,
  SyrupFlavor,
  getNextRecommendedStep,
  getRecipeById,
  validateDrinkForServe,
} from '../game/rules';
import { SpotifyVinylState } from '../game/spotifyManager';
import { AppRuntimeVersion } from '../pwa/pwaManager';
import { DailyGoalProgressBar } from './DailyGoalProgressBar';

interface HudOverlayProps {
  gameState: KlasikGameState;
  spotifyState: SpotifyVinylState;
  appVersion: AppRuntimeVersion;
  isMuted: boolean;
  hoveredToolLabel: string | null;
  fps: number;
  activeAnimLabel: string | null;
  stepProgress: number | null;
  stepDurationMs: number | null;
  onSelectStation: (station: BaristaStationId) => void;
  onPinOrder: (orderId: string) => void;
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
  onChangeGraphics: (quality: GraphicsQuality) => void;
  onRequestFullscreenLandscape: () => void;
  onOpenModal: (
    modal: 'recipes' | 'upgrades' | 'customize' | 'spotify' | 'pwa' | 'export'
  ) => void;
}

const STATION_TABS: Array<{ id: BaristaStationId; short: string; badge: string }> = [
  { id: 1, short: '1. Orders', badge: 'St. 1: Orders' },
  { id: 2, short: '2. Espresso', badge: 'St. 2: Espresso' },
  { id: 3, short: '3. Tea & Milk', badge: 'St. 3: Tea & Milk' },
  { id: 4, short: '4. Serve', badge: 'St. 4: Serve' },
  { id: 5, short: '5. Vinyl', badge: 'St. 5: Vinyl' },
];

export const HudOverlay: React.FC<HudOverlayProps> = ({
  gameState,
  spotifyState,
  appVersion,
  isMuted,
  hoveredToolLabel,
  fps,
  activeAnimLabel,
  stepProgress,
  stepDurationMs,
  onSelectStation,
  onPinOrder,
  onCupAction,
  onServeCustomer,
  onToggleMute,
  onTogglePause,
  onToggleVinyl,
  onChangeGraphics,
  onRequestFullscreenLandscape,
  onOpenModal,
}) => {
  const [hudHidden, setHudHidden] = useState(false);
  const [ticketsCollapsed, setTicketsCollapsed] = useState(false);
  const [topMenuOpen, setTopMenuOpen] = useState(false);

  useEffect(() => {
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
  }, []);

  const orderingCustomers = gameState.customers.filter((c) => c.state === 'ordering');
  const pinnedOrder =
    orderingCustomers.find((c) => c.id === gameState.pinnedOrderId) ||
    orderingCustomers[0] ||
    null;
  const targetRecipe = pinnedOrder ? getRecipeById(pinnedOrder.recipeId) : null;
  const nextStep = getNextRecommendedStep(gameState.currentCup, targetRecipe, pinnedOrder);

  const cup = gameState.currentCup;
  const drinkValidation = targetRecipe
    ? validateDrinkForServe(cup, targetRecipe, pinnedOrder)
    : {
        isComplete: false,
        missingSteps: ['Order'],
        wrongIngredients: [],
        hasWrongIngredient: false,
      };
  const isDrinkReadyToServe =
    Boolean(targetRecipe) && drinkValidation.isComplete && !drinkValidation.hasWrongIngredient;
  const isGoldenEquipped = gameState.equippedMachineSkin === 'golden-espresso-machine';
  const unclaimedLoginCount = (gameState.loginRewards || []).filter(
    (r) =>
      !r.claimed &&
      (gameState.activeShiftSeconds ?? 0) >= (r.requiredShiftSeconds ?? 600) &&
      (gameState.totalCupsServed ?? 0) >= (r.requiredOrdersServed ?? 15)
  ).length;

  const isMaxGraphics = gameState.graphicsQuality !== 'low';
  const qualityLabel = isMaxGraphics ? 'MAX' : 'LOW';
  const isApkVersion = appVersion === 'apk';

  const handleToggleGraphics = () => {
    onChangeGraphics(isMaxGraphics ? 'low' : 'max');
  };

  const renderCategoryIcon = () => {
    if (!targetRecipe) return <Coffee className="w-3 h-3 text-amber-300 shrink-0" />;
    if (targetRecipe.category === 'tea') {
      return <Leaf className="w-3 h-3 text-lime-400 shrink-0" />;
    }
    if (targetRecipe.category === 'cold_drink') {
      return <CupSoda className="w-3 h-3 text-sky-400 shrink-0" />;
    }
    if (targetRecipe.category === 'iced_coffee' || pinnedOrder?.customNeedsIce) {
      return <Snowflake className="w-3 h-3 text-sky-300 shrink-0" />;
    }
    return <Flame className="w-3 h-3 text-amber-400 shrink-0" />;
  };

  // PURE 3D IMMERSIVE MODE (When HUD is Hidden via [H] or Hide HUD Toggle)
  if (hudHidden) {
    return (
      <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
        {/* Ultra-minimal floating controls in top-right corner so 98% of 3D view is open */}
        <div className="pointer-events-auto fixed top-2 right-2 flex items-center gap-1.5 bg-stone-950/85 border border-amber-500/40 rounded-full px-2.5 py-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              const prevSt = (
                gameState.activeStation > 1 ? gameState.activeStation - 1 : 5
              ) as BaristaStationId;
              onSelectStation(prevSt);
            }}
            className="p-0.5 rounded-full bg-stone-800 hover:bg-stone-700 text-amber-200 cursor-pointer flex items-center justify-center"
            title="Previous Station [A]"
            aria-label="Previous Station"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono font-bold text-amber-100 whitespace-nowrap">
            St.{gameState.activeStation}
          </span>
          <button
            type="button"
            onClick={() => {
              const nextSt = (
                gameState.activeStation < 5 ? gameState.activeStation + 1 : 1
              ) as BaristaStationId;
              onSelectStation(nextSt);
            }}
            className="p-0.5 rounded-full bg-stone-800 hover:bg-stone-700 text-amber-200 cursor-pointer flex items-center justify-center"
            title="Next Station [D]"
            aria-label="Next Station"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {targetRecipe && (
            <button
              type="button"
              onClick={() => onCupAction('quick_brew_step')}
              className={`px-2 py-0.5 rounded-full font-bold text-[10px] cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                drinkValidation.hasWrongIngredient
                  ? 'bg-rose-500 text-stone-950'
                  : isDrinkReadyToServe
                  ? 'bg-emerald-500 text-stone-950'
                  : 'bg-amber-500 text-stone-950'
              }`}
              title={nextStep.instruction}
            >
              {drinkValidation.hasWrongIngredient ? (
                <>
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Rinse</span>
                </>
              ) : isDrinkReadyToServe ? (
                <>
                  <Check className="w-3 h-3 shrink-0" />
                  <span>Serve</span>
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 shrink-0" />
                  <span>Brew Step</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            data-testid="btn-show-hud"
            onClick={() => setHudHidden(false)}
            className="px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-[10px] font-bold text-amber-200 cursor-pointer whitespace-nowrap flex items-center gap-1"
            title="Restore Full Barista HUD [H]"
          >
            <Eye className="w-3 h-3 shrink-0" />
            <span>Show HUD</span>
          </button>
        </div>

        {/* Tiny progress pill at top-center only while actively executing a timed step */}
        {stepProgress !== null && activeAnimLabel && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 bg-stone-950/85 border border-amber-500/40 rounded-full px-3 py-0.5 flex items-center gap-2 shadow-lg">
            <span className="text-[10px] font-semibold text-amber-100 whitespace-nowrap">
              {activeAnimLabel}
            </span>
            <div className="w-16 h-1.5 rounded-full bg-stone-800 overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-75"
                style={{ width: `${Math.min(100, Math.max(5, stepProgress))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between overflow-hidden">
      {/* 1. ULTRA-SLIM TOP TELEMETRY RIBBON (All Top Navigation Consolidated Inside Menu Button) */}
      <div className="flex flex-col w-full pointer-events-none relative">
        <div className="pointer-events-auto h-9 sm:h-10 w-full bg-stone-950/92 border-b border-amber-500/25 px-2 sm:px-3 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          {/* Left Cluster: Compact Station Pill + Mini Order Tickets */}
          <div className="flex items-center gap-1 min-w-0 shrink-0 sm:flex-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setTicketsCollapsed((prev) => !prev)}
              className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/35 text-[10px] sm:text-[11px] font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
              title="Toggle Order Strip"
            >
              {STATION_TABS.find((s) => s.id === gameState.activeStation)?.badge}
            </button>

            {isGoldenEquipped && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-400 text-[9px] font-mono font-bold text-amber-300 whitespace-nowrap shrink-0 inline-flex items-center gap-1">
                <Trophy className="w-2.5 h-2.5 shrink-0" />
                <span>2x</span>
              </span>
            )}

            {!ticketsCollapsed && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {orderingCustomers.map((cust) => {
                  const recipe = getRecipeById(cust.recipeId);
                  const isPinned = pinnedOrder?.id === cust.id;
                  return (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => onPinOrder(cust.id)}
                      className={`relative flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] transition-colors cursor-pointer shrink-0 max-w-[130px] overflow-hidden ${
                        isPinned
                          ? 'bg-amber-950/90 border-amber-400 text-amber-100'
                          : 'bg-stone-900/90 border-stone-800 text-stone-300 hover:border-stone-600'
                      }`}
                      title={`${cust.customerName}: ${recipe.name}`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: recipe.colorHex }}
                      />
                      <span className="font-semibold truncate">{cust.customerName}</span>
                      <span className="font-mono tabular-nums text-emerald-400 font-bold shrink-0">
                        ${isGoldenEquipped ? recipe.price * 2 : recipe.price}
                      </span>
                      <span
                        className={`absolute bottom-0 left-0 h-[2px] transition-all ${
                          cust.patience > 50
                            ? 'bg-emerald-400'
                            : cust.patience > 25
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.round(cust.patience)}%` }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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
            shiftTimeRemaining={gameState.shiftTimeRemaining}
          />

          {/* Right Cluster: Consolidated Single Menu Button (Contains GFX, Music, Codex, Upgrades, Decor, Sound & Hide HUD) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="btn-top-menu"
              aria-expanded={topMenuOpen}
              aria-label="Open Cafe Menu"
              title="All Cafe Navigation: Graphics, Music, Recipe Codex, Upgrades, Decor, Sound & Hide HUD"
              onClick={() => setTopMenuOpen((prev) => !prev)}
              className={`relative h-7 px-2.5 rounded-md border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                topMenuOpen
                  ? 'bg-amber-500 text-stone-950 border-amber-300 shadow'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-200'
              }`}
            >
              {topMenuOpen ? (
                <X className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Menu className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Menu</span>
              {unclaimedLoginCount > 0 && !topMenuOpen && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Consolidated Top Navigation Menu Drawer (Holds GFX Toggle, Music, Codex, Upgrades, Decor, Sound, Hide HUD & Pause) */}
        {topMenuOpen && (
          <div
            data-testid="top-navigation-menu-drawer"
            className="pointer-events-auto self-end mr-2 mt-1 w-[320px] sm:w-[440px] bg-[#1b120d]/98 border border-amber-500/45 rounded-xl p-2.5 shadow-2xl grid grid-cols-2 sm:grid-cols-3 gap-1.5 z-30"
          >
            {/* 1. Graphics Toggle (LOW or MAX) */}
            <button
              type="button"
              data-testid="btn-toggle-graphics"
              onClick={() => {
                handleToggleGraphics();
              }}
              className={`px-2.5 py-2 rounded-lg border font-bold text-xs text-left cursor-pointer flex items-center gap-2 transition-colors ${
                isMaxGraphics
                  ? 'bg-amber-500 text-stone-950 border-amber-300'
                  : 'bg-[#291c14] text-stone-200 border-stone-700 hover:border-amber-500/40'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <div className="truncate">GFX: {qualityLabel}</div>
                <div
                  className={`text-[10px] font-mono ${
                    isMaxGraphics ? 'text-stone-900' : 'text-emerald-400'
                  }`}
                >
                  {Math.min(60, Math.max(30, fps))} FPS · Tap
                </div>
              </div>
            </button>

            {/* 2. Music / Spotify Vinyl Deck */}
            <button
              type="button"
              data-testid="btn-menu-spotify"
              onClick={() => {
                setTopMenuOpen(false);
                onOpenModal('spotify');
              }}
              className="px-2.5 py-2 rounded-lg bg-[#291c14] hover:bg-[#342419] text-emerald-300 border border-emerald-500/40 font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <Disc3
                className={`w-4 h-4 shrink-0 ${spotifyState.isPlaying ? 'animate-spin' : ''}`}
              />
              <div className="min-w-0">
                <div className="truncate">Music Deck</div>
                <div className="text-[10px] text-stone-400 truncate">
                  {isApkVersion ? 'Phone Spotify' : 'Spotify Web'}
                </div>
              </div>
            </button>

            {/* 3. Recipe Codex */}
            <button
              type="button"
              data-testid="btn-menu-recipes"
              onClick={() => {
                setTopMenuOpen(false);
                onOpenModal('recipes');
              }}
              className="px-2.5 py-2 rounded-lg bg-[#291c14] hover:bg-[#342419] text-amber-100 border border-stone-700 font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-amber-300 shrink-0" />
              <div className="min-w-0">
                <div className="truncate">Recipe Codex</div>
                <div className="text-[10px] text-stone-400 truncate">Coffee &amp; Tea</div>
              </div>
            </button>

            {/* 4. Upgrades & 100K Golden Machine */}
            <button
              type="button"
              data-testid="btn-menu-upgrades"
              onClick={() => {
                setTopMenuOpen(false);
                onOpenModal('upgrades');
              }}
              className="relative px-2.5 py-2 rounded-lg bg-[#291c14] hover:bg-[#342419] text-amber-200 border border-amber-500/40 font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <div className="truncate">Upgrades</div>
                <div className="text-[10px] text-amber-400/90 truncate">100K Gold &amp; Skins</div>
              </div>
              {unclaimedLoginCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-1.5 right-1.5" />
              )}
            </button>

            {/* 5. Cafe Decor & Granular Weather Lighting */}
            <button
              type="button"
              data-testid="btn-menu-decor"
              onClick={() => {
                setTopMenuOpen(false);
                onOpenModal('customize');
              }}
              className="px-2.5 py-2 rounded-lg bg-[#291c14] hover:bg-[#342419] text-amber-100 border border-stone-700 font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <Sprout className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="truncate">Cafe Decor</div>
                <div className="text-[10px] text-stone-400 truncate">18 Styles &amp; Weather</div>
              </div>
            </button>

            {/* 6. Sound & Granular Weather Audio Mute Toggle */}
            <button
              type="button"
              data-testid="btn-toggle-mute"
              onClick={() => {
                onToggleMute();
              }}
              className="px-2.5 py-2 rounded-lg bg-[#291c14] hover:bg-[#342419] text-amber-200 border border-stone-700 font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="truncate">{isMuted ? 'Sound: Off' : 'Sound: On'}</div>
                <div className="text-[10px] text-stone-400 truncate">Granular Audio</div>
              </div>
            </button>

            {/* 7. Hide HUD Toggle */}
            <button
              type="button"
              data-testid="btn-toggle-hud"
              onClick={() => {
                setTopMenuOpen(false);
                setHudHidden(true);
              }}
              className="px-2.5 py-2 rounded-lg bg-[#291c14] hover:bg-[#342419] text-amber-200 border border-amber-500/40 font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <EyeOff className="w-4 h-4 text-amber-300 shrink-0" />
              <div className="min-w-0">
                <div className="truncate">Hide HUD [H]</div>
                <div className="text-[10px] text-stone-400 truncate">Pure 3D View</div>
              </div>
            </button>

            {/* 8. Fullscreen Landscape Lock */}
            <button
              type="button"
              onClick={() => {
                setTopMenuOpen(false);
                onRequestFullscreenLandscape();
              }}
              className="px-2.5 py-2 rounded-lg bg-[#291c14] hover:bg-[#342419] text-stone-200 border border-stone-700 font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <Maximize2 className="w-4 h-4 text-amber-300 shrink-0" />
              <div className="min-w-0">
                <div className="truncate">Fullscreen</div>
                <div className="text-[10px] text-stone-400 truncate">Landscape Lock</div>
              </div>
            </button>

            {/* 9. Pause / Shift Menu (or Install APK / PWA when on Web/PWA) */}
            {!isApkVersion ? (
              <button
                type="button"
                onClick={() => {
                  setTopMenuOpen(false);
                  onOpenModal('pwa');
                }}
                className="px-2.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs text-left cursor-pointer flex items-center gap-2"
              >
                <Download className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className="truncate">Install APK</div>
                  <div className="text-[10px] text-stone-900 truncate">APK &amp; PWA</div>
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
              className={`px-2.5 py-2 rounded-lg bg-[#291c14] hover:bg-[#342419] text-stone-200 border border-stone-700 font-semibold text-xs text-left cursor-pointer flex items-center gap-2 ${
                !isApkVersion ? 'col-span-2 sm:col-span-3 justify-center' : ''
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Pause Shift &amp; Save Backup [Esc / P]</span>
            </button>
          </div>
        )}

        {/* Ultra-Compact Single-Line Order Strip + Inline Timed Progress */}
        <div className="flex items-center justify-between gap-2 px-2 mt-1 pointer-events-none">
          {!ticketsCollapsed && pinnedOrder && targetRecipe ? (
            <div className="pointer-events-auto inline-flex items-center gap-1.5 bg-stone-950/85 border border-amber-500/35 rounded-full px-2.5 py-0.5 shadow-md max-w-[78vw] sm:max-w-xl overflow-hidden">
              {renderCategoryIcon()}
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-300 shrink-0">
                {pinnedOrder.customerName}:
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-stone-100 truncate">
                {targetRecipe.name}
              </span>
              {pinnedOrder.customAddons?.map((addon) => (
                <span
                  key={addon}
                  className="px-1 py-0 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono font-semibold text-amber-200 shrink-0"
                >
                  {addon}
                </span>
              ))}
              <span className="px-1 py-0 rounded bg-emerald-500/20 text-[9px] font-mono font-bold text-emerald-300 shrink-0">
                +${isGoldenEquipped ? pinnedOrder.customBonusTip * 2 : pinnedOrder.customBonusTip}
              </span>
              <button
                type="button"
                onClick={() => setTicketsCollapsed(true)}
                className="ml-0.5 text-stone-400 hover:text-white cursor-pointer shrink-0 flex items-center"
                title="Minimize Order Strip"
                aria-label="Minimize Order Strip"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div />
          )}

          {/* Slim Top-Right Progress / Desktop Hover Pill */}
          {(activeAnimLabel || hoveredToolLabel) && (
            <div className="pointer-events-none inline-flex items-center gap-2 bg-stone-950/88 border border-amber-500/45 text-amber-100 text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-md max-w-[55vw] truncate">
              <span className="truncate">{activeAnimLabel || hoveredToolLabel}</span>
              {stepDurationMs && stepProgress !== null && (
                <span className="text-[9px] font-mono text-amber-300 shrink-0">
                  {(stepDurationMs / 1000).toFixed(1)}s
                </span>
              )}
              {stepProgress !== null && (
                <div className="w-14 h-1.5 rounded-full bg-stone-800 overflow-hidden shrink-0">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(5, stepProgress))}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. SINGLE-ROW EDGE-TO-EDGE BOTTOM BAR */}
      <div className="pointer-events-auto h-9 sm:h-10 w-full bg-stone-950/95 border-t border-amber-500/25 px-2 sm:px-3 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar shrink-0">
        {/* Left Side: Station Switcher Tabs */}
        <div
          className="flex items-center gap-1 shrink-0"
          role="tablist"
          aria-label="Barista Stations"
        >
          {STATION_TABS.map((st) => {
            const isActive = gameState.activeStation === st.id;
            const isRecommended = nextStep.station === st.id;
            return (
              <button
                key={st.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectStation(st.id)}
                className={`px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : isRecommended
                    ? 'bg-stone-900 text-amber-300 border border-amber-500/45'
                    : 'bg-stone-900/70 text-stone-300 hover:text-white'
                }`}
              >
                {st.short}
              </button>
            );
          })}
        </div>

        {/* Center-Left: Integrated One-Tap Next Step Button (Real offline Lucide icons) */}
        {targetRecipe && (
          <button
            type="button"
            data-testid="btn-quick-brew-step"
            onClick={(e) => {
              e.currentTarget.blur();
              onCupAction('quick_brew_step');
            }}
            className={`px-2 sm:px-2.5 py-1 rounded-md font-bold text-[10px] sm:text-xs cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
              drinkValidation.hasWrongIngredient
                ? 'bg-rose-500 hover:bg-rose-400 text-stone-950 animate-pulse'
                : 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200'
            }`}
            title={`${targetRecipe.name}: ${nextStep.instruction}`}
          >
            {drinkValidation.hasWrongIngredient ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Rinse [R]</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {nextStep.toolKey === 'grinder'
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
          </button>
        )}

        {/* Right Side: Context-Sensitive Station Actions + Strict Validated Serve Button */}
        <div className="flex items-center gap-1 shrink-0">
          {gameState.activeStation === 1 && (
            <>
              <button
                type="button"
                onClick={() => onOpenModal('recipes')}
                className="px-1.5 sm:px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 border border-stone-600 text-[10px] sm:text-xs font-medium text-amber-100 cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                <BookOpen className="w-3 h-3 shrink-0" />
                <span>Recipe Book</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectStation(2)}
                className="px-1.5 sm:px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] sm:text-xs font-semibold text-amber-200 cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                <span>Espresso Bar</span>
                <ArrowRight className="w-3 h-3 shrink-0" />
              </button>
            </>
          )}

          {gameState.activeStation === 2 && (
            <>
              <button
                type="button"
                onClick={() => onCupAction('grind')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  cup.hasGrounds
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-stone-800 hover:bg-stone-700 border-amber-500/50 text-amber-100'
                }`}
              >
                {cup.hasGrounds && <Check className="w-3 h-3 shrink-0" />}
                <span>{cup.hasGrounds ? 'Ground' : '1. Grind [G]'}</span>
              </button>
              <button
                type="button"
                onClick={() => onCupAction('tamp')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  cup.isTamped
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : cup.hasGrounds
                    ? 'bg-stone-800 hover:bg-stone-700 border-amber-500/50 text-amber-100'
                    : 'bg-stone-900/80 border-stone-800 text-stone-500'
                }`}
                title={!cup.hasGrounds ? 'Grind beans first before tamping!' : 'Tamp coffee puck'}
              >
                {cup.isTamped && <Check className="w-3 h-3 shrink-0" />}
                <span>{cup.isTamped ? 'Tamped' : '2. Tamp [T]'}</span>
              </button>
              <button
                type="button"
                onClick={() => onCupAction('pull_espresso')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  cup.hasEspresso
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : cup.hasGrounds && cup.isTamped
                    ? 'bg-stone-800 hover:bg-stone-700 border-amber-500/50 text-amber-100'
                    : 'bg-stone-900/80 border-stone-800 text-stone-500'
                }`}
                title={
                  !cup.hasGrounds || !cup.isTamped
                    ? 'Grind and tamp the puck before pulling a shot!'
                    : 'Pull 9-bar double espresso shot'
                }
              >
                {cup.hasEspresso && <Check className="w-3 h-3 shrink-0" />}
                <span>{cup.hasEspresso ? 'Shot' : '3. Shot [E]'}</span>
              </button>
              <button
                type="button"
                onClick={() => onCupAction('rinse_cup')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  drinkValidation.hasWrongIngredient
                    ? 'bg-rose-600 hover:bg-rose-500 border-rose-300 text-white animate-pulse'
                    : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-300'
                }`}
              >
                {drinkValidation.hasWrongIngredient ? (
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                ) : (
                  <RotateCcw className="w-3 h-3 shrink-0" />
                )}
                <span>Rinse [R]</span>
              </button>
            </>
          )}

          {gameState.activeStation === 3 && (
            <>
              <button
                type="button"
                onClick={() => onCupAction('steep_tea')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  cup.hasSteepedTea
                    ? 'bg-lime-500/25 border-lime-400 text-lime-200'
                    : 'bg-stone-800 hover:bg-stone-700 border-lime-500/40 text-lime-200'
                }`}
              >
                <Leaf className="w-3 h-3 shrink-0" />
                <span>Tea</span>
              </button>
              <button
                type="button"
                onClick={() => onCupAction('steam_milk')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  cup.hasSteamedMilk
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : cup.hasEspresso || cup.hasSteepedTea
                    ? 'bg-stone-800 hover:bg-stone-700 border-stone-600 text-amber-100'
                    : 'bg-stone-900/80 border-stone-800 text-stone-500'
                }`}
              >
                {cup.hasSteamedMilk && <Check className="w-3 h-3 shrink-0" />}
                <span>Milk</span>
              </button>
              <button
                type="button"
                onClick={() => onCupAction('add_ice')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  cup.hasIce
                    ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                    : 'bg-stone-800 border-stone-600 text-sky-100'
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
                  onClick={() => onCupAction('add_syrup', s.id)}
                  className={`px-1.5 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
                    cup.syrup === s.id
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                      : 'bg-stone-800 border-stone-700 text-stone-200 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              {drinkValidation.hasWrongIngredient && (
                <button
                  type="button"
                  onClick={() => onCupAction('rinse_cup')}
                  className="px-1.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 border border-rose-300 text-[10px] sm:text-xs font-bold text-white cursor-pointer whitespace-nowrap animate-pulse flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Rinse</span>
                </button>
              )}
            </>
          )}

          {gameState.activeStation === 4 && (
            <button
              type="button"
              onClick={() => onCupAction('rinse_cup')}
              className={`px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                drinkValidation.hasWrongIngredient
                  ? 'bg-rose-600 hover:bg-rose-500 border-rose-300 text-white animate-pulse'
                  : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
              }`}
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              <span>Rinse Cup [R]</span>
            </button>
          )}

          {gameState.activeStation === 5 && (
            <>
              <button
                type="button"
                onClick={onToggleVinyl}
                className="px-1.5 sm:px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 border border-amber-500/35 text-[10px] sm:text-xs font-semibold text-amber-200 cursor-pointer whitespace-nowrap"
              >
                {spotifyState.isPlaying ? 'Pause Vinyl' : 'Spin Vinyl'}
              </button>
              <button
                type="button"
                onClick={() => onOpenModal('spotify')}
                className="px-1.5 sm:px-2 py-1 rounded-md bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-[10px] sm:text-xs font-semibold text-emerald-200 cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                <Disc3 className="w-3 h-3 shrink-0" />
                <span>{isApkVersion ? 'Phone Spotify' : 'Spotify Web'}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenModal('upgrades')}
                className="px-1.5 sm:px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10px] sm:text-xs font-semibold text-stone-200 cursor-pointer whitespace-nowrap"
              >
                Shop &amp; 100K
              </button>
            </>
          )}

          {/* Strict Validated Serve Button (Real Lucide Icons) */}
          <button
            type="button"
            onClick={() => onServeCustomer()}
            className={`px-2 sm:px-3 py-1 rounded-md font-bold text-[10px] sm:text-xs cursor-pointer whitespace-nowrap transition-all flex items-center gap-1 ${
              isDrinkReadyToServe
                ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-md'
                : drinkValidation.hasWrongIngredient
                ? 'bg-rose-950/90 hover:bg-rose-900 border border-rose-500/60 text-rose-200'
                : 'bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-stone-400'
            }`}
            title={
              isDrinkReadyToServe
                ? 'Ring Bell & Serve Completed Drink!'
                : drinkValidation.hasWrongIngredient
                ? `Wrong ingredient (${drinkValidation.wrongIngredients[0]})! Serving will upset customer.`
                : `Drink incomplete! Missing: ${drinkValidation.missingSteps.join(', ')}`
            }
          >
            {isDrinkReadyToServe ? (
              <>
                <span>Serve</span>
                <ArrowRight className="w-3 h-3 shrink-0" />
              </>
            ) : drinkValidation.hasWrongIngredient ? (
              <>
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Serve (Wrong)</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 shrink-0" />
                <span>Serve</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
