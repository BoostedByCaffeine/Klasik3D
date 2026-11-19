import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Compass,
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
  stripKeyboardShortcutsForApk,
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
  { id: 1, name: 'Orders', short: '1. Orders', badge: 'St. 1: Orders' },
  { id: 2, name: 'Espresso', short: '2. Espresso', badge: 'St. 2: Espresso' },
  { id: 3, name: 'Tea & Milk', short: '3. Tea & Milk', badge: 'St. 3: Tea & Milk' },
  { id: 4, name: 'Serve', short: '4. Serve', badge: 'St. 4: Serve' },
  { id: 5, name: 'Vinyl', short: '5. Vinyl', badge: 'St. 5: Vinyl' },
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

  const currentStationMeta =
    STATION_TABS.find((s) => s.id === gameState.activeStation) || STATION_TABS[1];
  const recommendedStationMeta =
    STATION_TABS.find((s) => s.id === nextStep.station) || STATION_TABS[1];

  const handlePrevStation = () => {
    const prevSt = (
      gameState.activeStation > 1 ? gameState.activeStation - 1 : 5
    ) as BaristaStationId;
    onSelectStation(prevSt);
  };

  const handleNextStation = () => {
    const nextSt = (
      gameState.activeStation < 5 ? gameState.activeStation + 1 : 1
    ) as BaristaStationId;
    onSelectStation(nextSt);
  };

  const handleToggleGraphics = () => {
    onChangeGraphics(isMaxGraphics ? 'low' : 'max');
  };

  const renderCategoryIcon = () => {
    if (!targetRecipe) return <Coffee className="w-3 h-3 text-amber-300 shrink-0" strokeWidth={2.2} />;
    if (targetRecipe.category === 'tea') {
      return <Leaf className="w-3 h-3 text-lime-300 shrink-0" strokeWidth={2.2} />;
    }
    if (targetRecipe.category === 'cold_drink') {
      return <CupSoda className="w-3 h-3 text-sky-300 shrink-0" strokeWidth={2.2} />;
    }
    if (targetRecipe.category === 'iced_coffee' || pinnedOrder?.customNeedsIce) {
      return <Snowflake className="w-3 h-3 text-sky-300 shrink-0" strokeWidth={2.2} />;
    }
    return <Flame className="w-3 h-3 text-amber-300 shrink-0" strokeWidth={2.2} />;
  };

  const displayBannerText = stripKeyboardShortcutsForApk(
    activeAnimLabel || hoveredToolLabel || '',
    isApkVersion
  );

  // PURE 3D IMMERSIVE MODE (When HUD is Hidden via Hide HUD Toggle)
  if (hudHidden) {
    return (
      <div className="fixed inset-0 z-10 pointer-events-none hud-safe-frame overflow-hidden">
        {/* Ultra-minimal floating controls in top-right corner so 98% of 3D view is open */}
        <div className="pointer-events-auto fixed top-2 right-2 flex items-center gap-1.5 glass-pill rounded-full px-2.5 py-1">
          <button
            type="button"
            onClick={handlePrevStation}
            className="glass-btn-inner p-0.5 rounded-full text-amber-200 cursor-pointer flex items-center justify-center"
            title={isApkVersion ? 'Previous Station' : 'Previous Station [A]'}
            aria-label="Previous Station"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
          <span className="text-[10px] font-mono font-bold text-[#FAF5EE] glass-text-crisp whitespace-nowrap">
            {currentStationMeta.name}
          </span>
          <button
            type="button"
            onClick={handleNextStation}
            className="glass-btn-inner p-0.5 rounded-full text-amber-200 cursor-pointer flex items-center justify-center"
            title={isApkVersion ? 'Next Station' : 'Next Station [D]'}
            aria-label="Next Station"
          >
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>

          {targetRecipe && !isRealismMode && (
            <button
              type="button"
              onClick={() => onCupAction('quick_brew_step')}
              className={`px-2 py-0.5 rounded-full font-bold text-[10px] cursor-pointer whitespace-nowrap flex items-center gap-1 shadow ${
                drinkValidation.hasWrongIngredient
                  ? 'bg-rose-500 text-[#160E09]'
                  : isDrinkReadyToServe
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-[#160E09]'
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09]'
              }`}
              title={stripKeyboardShortcutsForApk(nextStep.instruction, isApkVersion)}
            >
              {drinkValidation.hasWrongIngredient ? (
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
            </button>
          )}

          <button
            type="button"
            data-testid="btn-show-hud"
            onClick={() => setHudHidden(false)}
            className="glass-btn-inner px-2 py-0.5 rounded-full !border-amber-400/50 text-[10px] font-bold text-amber-200 cursor-pointer whitespace-nowrap flex items-center gap-1"
            title={isApkVersion ? 'Restore Full Barista HUD' : 'Restore Full Barista HUD [H]'}
          >
            <Eye className="w-3 h-3 shrink-0" strokeWidth={2.2} />
            <span>Show HUD</span>
          </button>
        </div>

        {/* Tiny progress pill at top-center only while actively executing a timed step */}
        {stepProgress !== null && displayBannerText && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 glass-pill rounded-full px-3 py-0.5 flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[#FAF5EE] glass-text-crisp whitespace-nowrap">
              {displayBannerText}
            </span>
            <div className="w-16 h-1.5 rounded-full bg-black/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-75"
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
        <div
          data-testid="hud-top-bar"
          className="pointer-events-auto min-h-9 sm:min-h-10 w-full glass-pill !rounded-none !border-x-0 !border-t-0 hud-top-safe flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0"
        >
          {/* Left Cluster: Direct Non-Shrinking Station Indicator + Flexible Mini Order Tickets */}
          <button
            type="button"
            data-testid="hud-station-indicator"
            onClick={() => setTicketsCollapsed((prev) => !prev)}
            className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/45 text-[10px] sm:text-[11px] font-bold text-amber-200 glass-text-crisp whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            title="Toggle Order Strip"
          >
            {currentStationMeta.badge}
          </button>

          {isGoldenEquipped && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-400/25 border border-amber-400 text-[9px] font-mono font-bold text-amber-200 whitespace-nowrap shrink-0 inline-flex items-center gap-1">
              <Trophy className="w-2.5 h-2.5 shrink-0" strokeWidth={2.2} />
              <span>2x</span>
            </span>
          )}

          {!ticketsCollapsed ? (
            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
              {orderingCustomers.map((cust) => {
                const recipe = getRecipeById(cust.recipeId);
                const isPinned = pinnedOrder?.id === cust.id;
                return (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => onPinOrder(cust.id)}
                    className={`relative flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] transition-colors cursor-pointer shrink-0 max-w-[130px] overflow-hidden glass-text-crisp ${
                      isPinned
                        ? 'bg-amber-500/25 border-amber-400 text-[#FAF5EE] font-semibold'
                        : 'glass-btn-inner text-[#E7D7C1]'
                    }`}
                    title={`${cust.customerName}: ${recipe.name}`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: recipe.colorHex }}
                    />
                    <span className="font-semibold truncate">{cust.customerName}</span>
                    <span className="font-mono tabular-nums text-emerald-300 font-bold shrink-0">
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
            shiftTimeRemaining={gameState.shiftTimeRemaining}
          />

          {/* Right Cluster: Consolidated Single Menu Button (Contains GFX, Realism, Music, Codex, Upgrades, Decor, Sound & Hide HUD) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="btn-top-menu"
              aria-expanded={topMenuOpen}
              aria-label="Open Cafe Menu"
              title="All Cafe Navigation: Graphics, Realism Mode, Music, Recipe Codex, Upgrades, Decor, Sound & Hide HUD"
              onClick={() => setTopMenuOpen((prev) => !prev)}
              className={`relative h-7 px-2.5 rounded-md border flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap transition-all ${
                topMenuOpen
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] border-amber-300 shadow-[0_4px_14px_-3px_rgba(245,158,11,0.55)]'
                  : 'glass-btn-inner !border-amber-400/50 text-amber-200'
              }`}
            >
              {topMenuOpen ? (
                <X className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
              ) : (
                <Menu className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
              )}
              <span>Menu</span>
              {unclaimedLoginCount > 0 && !topMenuOpen && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Consolidated Top Navigation Menu Drawer (Holds GFX Toggle, Realism Mode, Music, Codex, Upgrades, Decor, Sound, Hide HUD & Pause) */}
        {topMenuOpen && (
          <div
            data-testid="top-navigation-menu-drawer"
            className="pointer-events-auto self-end mr-2 mt-1 w-[320px] sm:w-[460px] glass-panel rounded-xl p-2.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5 z-30"
          >
            {/* 1. Graphics Toggle (LOW or MAX) */}
            <button
              type="button"
              data-testid="btn-toggle-graphics"
              onClick={() => {
                handleToggleGraphics();
              }}
              className={`px-2.5 py-2 rounded-lg border font-bold text-xs text-left cursor-pointer flex items-center gap-2 transition-all ${
                isMaxGraphics
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] border-amber-300 shadow'
                  : 'glass-btn-inner'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">GFX: {qualityLabel}</div>
                <div
                  className={`text-[10px] font-mono ${
                    isMaxGraphics ? 'text-[#160E09]/80 font-bold' : 'text-emerald-300'
                  }`}
                >
                  {Math.min(60, Math.max(30, fps))} FPS · Tap
                </div>
              </div>
            </button>

            {/* 2. Realism Mode Toggle (Hides Step-by-Step Shortcuts & Relies on 3D Tools + Codex) */}
            <button
              type="button"
              data-testid="btn-toggle-realism"
              onClick={() => {
                onToggleRealismMode();
              }}
              className={`px-2.5 py-2 rounded-lg border font-bold text-xs text-left cursor-pointer flex items-center gap-2 transition-all ${
                isRealismMode
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] border-amber-300 shadow'
                  : 'glass-btn-inner !border-amber-400/40 text-amber-200'
              }`}
            >
              <Compass className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">Realism: {isRealismMode ? 'ON' : 'OFF'}</div>
                <div
                  className={`text-[10px] truncate ${
                    isRealismMode ? 'text-[#160E09]/80 font-semibold' : 'text-[#E7D7C1]'
                  }`}
                >
                  {isRealismMode ? 'Touch 3D Tools & Codex' : 'Guided HUD & Shortcuts'}
                </div>
              </div>
            </button>

            {/* 3. Music / Spotify Vinyl Deck */}
            <button
              type="button"
              data-testid="btn-menu-spotify"
              onClick={() => {
                setTopMenuOpen(false);
                onOpenModal('spotify');
              }}
              className="glass-btn-inner px-2.5 py-2 rounded-lg text-emerald-300 !border-emerald-400/35 font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <Disc3
                className={`w-4 h-4 shrink-0 ${spotifyState.isPlaying ? 'animate-spin' : ''}`}
                strokeWidth={2.2}
              />
              <div className="min-w-0">
                <div className="truncate">Music Deck</div>
                <div className="text-[10px] text-[#E7D7C1] truncate">
                  {isApkVersion ? 'Phone Spotify' : 'Spotify Web'}
                </div>
              </div>
            </button>

            {/* 4. Recipe Codex */}
            <button
              type="button"
              data-testid="btn-menu-recipes"
              onClick={() => {
                setTopMenuOpen(false);
                onOpenModal('recipes');
              }}
              className="glass-btn-inner px-2.5 py-2 rounded-lg font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-amber-300 shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">Recipe Codex</div>
                <div className="text-[10px] text-[#E7D7C1] truncate">Coffee &amp; Tea</div>
              </div>
            </button>

            {/* 5. Upgrades & 150K Golden Machine */}
            <button
              type="button"
              data-testid="btn-menu-upgrades"
              onClick={() => {
                setTopMenuOpen(false);
                onOpenModal('upgrades');
              }}
              className="relative glass-btn-inner px-2.5 py-2 rounded-lg text-amber-200 !border-amber-400/40 font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-300 shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">Upgrades</div>
                <div className="text-[10px] text-amber-300 truncate">150K Gold &amp; Skins</div>
              </div>
              {unclaimedLoginCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-1.5 right-1.5" />
              )}
            </button>

            {/* 6. Cafe Decor & Granular Weather Lighting */}
            <button
              type="button"
              data-testid="btn-menu-decor"
              onClick={() => {
                setTopMenuOpen(false);
                onOpenModal('customize');
              }}
              className="glass-btn-inner px-2.5 py-2 rounded-lg font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <Sprout className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">Cafe Decor</div>
                <div className="text-[10px] text-[#E7D7C1] truncate">18 Styles &amp; Weather</div>
              </div>
            </button>

            {/* 7. Sound & Granular Weather Audio Mute Toggle */}
            <button
              type="button"
              data-testid="btn-toggle-mute"
              onClick={() => {
                onToggleMute();
              }}
              className="glass-btn-inner px-2.5 py-2 rounded-lg font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400 shrink-0" strokeWidth={2.2} />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2.2} />
              )}
              <div className="min-w-0">
                <div className="truncate">{isMuted ? 'Sound: Off' : 'Sound: On'}</div>
                <div className="text-[10px] text-[#E7D7C1] truncate">Granular Audio</div>
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
              className="glass-btn-inner px-2.5 py-2 rounded-lg text-amber-200 !border-amber-400/40 font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <EyeOff className="w-4 h-4 text-amber-300 shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">
                  {isApkVersion ? 'Hide HUD' : 'Hide HUD [H]'}
                </div>
                <div className="text-[10px] text-[#E7D7C1] truncate">Pure 3D View</div>
              </div>
            </button>

            {/* 9. Fullscreen Landscape Lock */}
            <button
              type="button"
              onClick={() => {
                setTopMenuOpen(false);
                onRequestFullscreenLandscape();
              }}
              className="glass-btn-inner px-2.5 py-2 rounded-lg font-semibold text-xs text-left cursor-pointer flex items-center gap-2"
            >
              <Maximize2 className="w-4 h-4 text-amber-300 shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="truncate">Fullscreen</div>
                <div className="text-[10px] text-[#E7D7C1] truncate">Landscape Lock</div>
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
                className="px-2.5 py-2 rounded-lg bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 hover:brightness-105 text-[#160E09] font-bold text-xs text-left cursor-pointer flex items-center gap-2 shadow"
              >
                <Download className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                <div className="min-w-0">
                  <div className="truncate">Install APK</div>
                  <div className="text-[10px] text-[#160E09]/80 font-semibold truncate">APK &amp; PWA</div>
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
              className={`glass-btn-inner px-2.5 py-2 rounded-lg font-semibold text-xs text-left cursor-pointer flex items-center justify-center gap-2 ${
                isApkVersion ? 'col-span-2 sm:col-span-3' : 'col-span-1 sm:col-span-2'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-300 shrink-0" strokeWidth={2.2} />
              <span>
                {isApkVersion
                  ? 'Pause Shift & Save Backup'
                  : 'Pause Shift & Save Backup [Esc / P]'}
              </span>
            </button>
          </div>
        )}

        {/* Ultra-Compact Single-Line Order Strip + Inline Timed Progress */}
        <div className="flex items-center justify-between gap-2 px-2 mt-1.5 pointer-events-none">
          {!ticketsCollapsed && pinnedOrder && targetRecipe ? (
            <div className="pointer-events-auto inline-flex items-center gap-1.5 glass-panel rounded-full px-2.5 py-0.5 max-w-[78vw] sm:max-w-xl overflow-hidden">
              {renderCategoryIcon()}
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-300 glass-text-crisp shrink-0">
                {pinnedOrder.customerName}:
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#FAF5EE] glass-text-crisp truncate">
                {targetRecipe.name}
              </span>
              {pinnedOrder.customAddons?.map((addon) => (
                <span
                  key={addon}
                  className="px-1 py-0 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] font-mono font-semibold text-amber-200 shrink-0"
                >
                  {addon}
                </span>
              ))}
              <span className="px-1 py-0 rounded bg-emerald-500/25 border border-emerald-400/35 text-[9px] font-mono font-bold text-emerald-300 shrink-0">
                +${isGoldenEquipped ? pinnedOrder.customBonusTip * 2 : pinnedOrder.customBonusTip}
              </span>
              <button
                type="button"
                onClick={() => setTicketsCollapsed(true)}
                className="ml-0.5 text-[#E7D7C1] hover:text-white cursor-pointer shrink-0 flex items-center"
                title="Minimize Order Strip"
                aria-label="Minimize Order Strip"
              >
                <X className="w-3 h-3" strokeWidth={2.2} />
              </button>
            </div>
          ) : (
            <div />
          )}

          {/* Slim Top-Right Progress / Hover Pill */}
          {displayBannerText && (
            <div className="pointer-events-none inline-flex items-center gap-2 glass-pill text-[#FAF5EE] glass-text-crisp text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full max-w-[55vw] truncate">
              <span className="truncate">{displayBannerText}</span>
              {stepDurationMs && stepProgress !== null && (
                <span className="text-[9px] font-mono text-amber-300 shrink-0">
                  {(stepDurationMs / 1000).toFixed(1)}s
                </span>
              )}
              {stepProgress !== null && (
                <div className="w-14 h-1.5 rounded-full bg-black/50 overflow-hidden shrink-0">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(5, stepProgress))}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. SINGLE-ROW EDGE-TO-EDGE BOTTOM BAR */}
      <div
        className="pointer-events-auto min-h-9 sm:min-h-10 w-full glass-panel !rounded-none !border-x-0 !border-b-0 hud-bottom-safe flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0"
      >
        {/* Left Side: Compact Switchable Station Pill <-Station-> */}
        <div
          data-testid="station-switcher-pill"
          className="inline-flex items-center gap-1 bg-black/30 border border-amber-400/35 rounded-full p-0.5 shrink-0"
          role="group"
          aria-label="Switch Barista Station"
        >
          <button
            type="button"
            data-testid="btn-station-prev"
            onClick={handlePrevStation}
            className="glass-btn-inner w-6 h-6 rounded-full hover:!bg-amber-500 hover:!text-[#160E09] text-amber-200 flex items-center justify-center cursor-pointer"
            title={isApkVersion ? 'Previous Station' : 'Previous Station [A / Left]'}
            aria-label="Previous Station"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
          </button>

          <div
            data-testid="station-pill-label"
            className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] font-bold text-[10px] sm:text-xs whitespace-nowrap flex items-center gap-1 shadow-[0_2px_10px_-2px_rgba(245,158,11,0.55)]"
          >
            <span>{currentStationMeta.name}</span>
          </div>

          <button
            type="button"
            data-testid="btn-station-next"
            onClick={handleNextStation}
            className="glass-btn-inner w-6 h-6 rounded-full hover:!bg-amber-500 hover:!text-[#160E09] text-amber-200 flex items-center justify-center cursor-pointer"
            title={isApkVersion ? 'Next Station' : 'Next Station [D / Right]'}
            aria-label="Next Station"
          >
            <ArrowRight className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
          </button>

          {/* Subtle Guided Next-Station Indicator (Hidden when Realism Mode is ON) */}
          {!isRealismMode &&
            targetRecipe &&
            nextStep.station !== gameState.activeStation && (
              <button
                type="button"
                data-testid="btn-recommended-station-guide"
                onClick={() => onSelectStation(nextStep.station)}
                className="px-2 py-0.5 rounded-full bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/55 text-[10px] font-semibold text-amber-200 cursor-pointer whitespace-nowrap flex items-center gap-1 mr-0.5 transition-colors"
                title={`Next step at ${recommendedStationMeta.badge}`}
              >
                <Zap className="w-2.5 h-2.5 text-amber-300 shrink-0" strokeWidth={2.2} />
                <span>Go: {recommendedStationMeta.name}</span>
              </button>
            )}
        </div>

        {/* Center: Guided One-Tap Next Step Shortcut OR Realism Mode Diegetic Indicator */}
        {!isRealismMode && targetRecipe && (
          <button
            type="button"
            data-testid="btn-quick-brew-step"
            onClick={(e) => {
              e.currentTarget.blur();
              onCupAction('quick_brew_step');
            }}
            className={`px-2 sm:px-2.5 py-1 rounded-md font-bold text-[10px] sm:text-xs cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 transition-all ${
              drinkValidation.hasWrongIngredient
                ? 'bg-rose-500 hover:bg-rose-400 text-[#160E09] animate-pulse shadow'
                : 'bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/65 text-amber-200 glass-text-crisp'
            }`}
            title={stripKeyboardShortcutsForApk(
              `${targetRecipe.name}: ${nextStep.instruction}`,
              isApkVersion
            )}
          >
            {drinkValidation.hasWrongIngredient ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                <span>{isApkVersion ? 'Rinse' : 'Rinse [R]'}</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
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

        {isRealismMode && (
          <div
            data-testid="realism-mode-active-strip"
            className="flex items-center gap-1.5 shrink-0"
          >
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/45 text-[10px] sm:text-xs font-semibold text-amber-200 glass-text-crisp whitespace-nowrap inline-flex items-center gap-1">
              <Compass className="w-3 h-3 text-amber-300 shrink-0" strokeWidth={2.2} />
              <span>Realism Mode: Touch 3D Equipment directly</span>
            </span>
            <button
              type="button"
              onClick={() => onOpenModal('recipes')}
              className="glass-btn-inner px-2 py-1 rounded-md !border-amber-400/40 text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3 text-amber-300 shrink-0" strokeWidth={2.2} />
              <span>Recipe Codex</span>
            </button>
          </div>
        )}

        {/* Right Side: Context-Sensitive Station Actions (Hidden in Realism Mode except Codex/Vinyl/Serve) */}
        <div className="flex items-center gap-1 shrink-0">
          {!isRealismMode && gameState.activeStation === 1 && (
            <>
              <button
                type="button"
                onClick={() => onOpenModal('recipes')}
                className="glass-btn-inner px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                <BookOpen className="w-3 h-3 text-amber-300 shrink-0" strokeWidth={2.2} />
                <span>Recipe Book</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectStation(2)}
                className="px-1.5 sm:px-2 py-1 rounded-md bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/50 text-[10px] sm:text-xs font-semibold text-amber-200 cursor-pointer whitespace-nowrap flex items-center gap-1 transition-colors"
              >
                <span>Espresso Bar</span>
                <ArrowRight className="w-3 h-3 shrink-0" strokeWidth={2.2} />
              </button>
            </>
          )}

          {!isRealismMode && gameState.activeStation === 2 && (
            <>
              <button
                type="button"
                data-testid="btn-action-grind"
                onClick={() => onCupAction('grind')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 transition-colors ${
                  cup.hasGrounds
                    ? 'bg-emerald-950/70 border-emerald-400/50 text-emerald-300'
                    : 'glass-btn-inner !border-amber-400/50 text-[#FAF5EE]'
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
                onClick={() => onCupAction('tamp')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 transition-colors ${
                  cup.isTamped
                    ? 'bg-emerald-950/70 border-emerald-400/50 text-emerald-300'
                    : cup.hasGrounds
                    ? 'glass-btn-inner !border-amber-400/50 text-[#FAF5EE]'
                    : 'bg-black/25 border-white/10 text-[#E7D7C1]/45'
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
                onClick={() => onCupAction('pull_espresso')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 transition-colors ${
                  cup.hasEspresso
                    ? 'bg-emerald-950/70 border-emerald-400/50 text-emerald-300'
                    : cup.hasGrounds && cup.isTamped
                    ? 'glass-btn-inner !border-amber-400/50 text-[#FAF5EE]'
                    : 'bg-black/25 border-white/10 text-[#E7D7C1]/45'
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
                onClick={() => onCupAction('rinse_cup')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  drinkValidation.hasWrongIngredient
                    ? 'bg-rose-600 hover:bg-rose-500 border-rose-300 text-white animate-pulse'
                    : 'glass-btn-inner text-[#E7D7C1]'
                }`}
              >
                {drinkValidation.hasWrongIngredient ? (
                  <AlertTriangle className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                ) : (
                  <RotateCcw className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                )}
                <span>{isApkVersion ? 'Rinse' : 'Rinse [R]'}</span>
              </button>
            </>
          )}

          {!isRealismMode && gameState.activeStation === 3 && (
            <>
              <button
                type="button"
                onClick={() => onCupAction('steep_tea')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  cup.hasSteepedTea
                    ? 'bg-lime-500/25 border-lime-400 text-lime-200'
                    : 'glass-btn-inner !border-lime-400/40 text-lime-200'
                }`}
              >
                <Leaf className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                <span>Tea</span>
              </button>
              <button
                type="button"
                onClick={() => onCupAction('steam_milk')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  cup.hasSteamedMilk
                    ? 'bg-emerald-950/70 border-emerald-400/50 text-emerald-300'
                    : cup.hasEspresso || cup.hasSteepedTea
                    ? 'glass-btn-inner !border-amber-400/45 text-[#FAF5EE]'
                    : 'bg-black/25 border-white/10 text-[#E7D7C1]/45'
                }`}
              >
                {cup.hasSteamedMilk && <Check className="w-3 h-3 shrink-0" strokeWidth={2.2} />}
                <span>Milk</span>
              </button>
              <button
                type="button"
                onClick={() => onCupAction('add_ice')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  cup.hasIce
                    ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                    : 'glass-btn-inner !border-sky-400/35 text-sky-100'
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
                      : 'glass-btn-inner text-[#FAF5EE]'
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
                  <AlertTriangle className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                  <span>Rinse</span>
                </button>
              )}
            </>
          )}

          {!isRealismMode && gameState.activeStation === 4 && (
            <button
              type="button"
              onClick={() => onCupAction('rinse_cup')}
              className={`px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                drinkValidation.hasWrongIngredient
                  ? 'bg-rose-600 hover:bg-rose-500 border-rose-300 text-white animate-pulse'
                  : 'glass-btn-inner text-[#E7D7C1]'
              }`}
            >
              <RotateCcw className="w-3 h-3 shrink-0" strokeWidth={2.2} />
              <span>{isApkVersion ? 'Rinse Cup' : 'Rinse Cup [R]'}</span>
            </button>
          )}

          {gameState.activeStation === 5 && (
            <>
              <button
                type="button"
                onClick={onToggleVinyl}
                className="glass-btn-inner px-1.5 sm:px-2 py-1 rounded-md !border-amber-400/40 text-[10px] sm:text-xs font-semibold text-amber-200 cursor-pointer whitespace-nowrap"
              >
                {spotifyState.isPlaying ? 'Pause Vinyl' : 'Spin Vinyl'}
              </button>
              <button
                type="button"
                onClick={() => onOpenModal('spotify')}
                className="glass-btn-inner px-1.5 sm:px-2 py-1 rounded-md !border-emerald-400/45 text-[10px] sm:text-xs font-semibold text-emerald-200 cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                <Disc3 className="w-3 h-3 text-emerald-300 shrink-0" strokeWidth={2.2} />
                <span>{isApkVersion ? 'Phone Spotify' : 'Spotify Web'}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenModal('upgrades')}
                className="glass-btn-inner px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                Shop &amp; 150K
              </button>
            </>
          )}

          {/* Strict Validated Serve Button (Hidden in Realism Mode so player taps 3D Service Bell / Pickup Coaster directly) */}
          {!isRealismMode && (
            <button
              type="button"
              onClick={() => onServeCustomer()}
              className={`px-2 sm:px-3 py-1 rounded-md font-bold text-[10px] sm:text-xs cursor-pointer whitespace-nowrap transition-all flex items-center gap-1 ${
                isDrinkReadyToServe
                  ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 hover:brightness-105 text-[#160E09] shadow-[0_4px_14px_-3px_rgba(16,185,129,0.55)]'
                  : drinkValidation.hasWrongIngredient
                  ? 'bg-rose-950/90 hover:bg-rose-900 border border-rose-400/60 text-rose-200'
                  : 'bg-black/30 hover:bg-black/45 border border-white/15 text-[#E7D7C1]/65'
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
