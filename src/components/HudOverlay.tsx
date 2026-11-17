import React, { useEffect, useState } from 'react';
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
import { DailyGoalProgressBar } from './DailyGoalProgressBar';

interface HudOverlayProps {
  gameState: KlasikGameState;
  spotifyState: SpotifyVinylState;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleToggleGraphics = () => {
    onChangeGraphics(isMaxGraphics ? 'low' : 'max');
  };

  const categoryIcon = (() => {
    if (!targetRecipe) return '☕';
    if (targetRecipe.category === 'tea') return '🍵';
    if (targetRecipe.category === 'cold_drink') return '🥤';
    if (targetRecipe.category === 'iced_coffee' || pinnedOrder?.customNeedsIce) return '🧊';
    return '🔥';
  })();

  // PURE 3D IMMERSIVE MODE (When HUD is Hidden via [H] or Hide HUD Toggle)
  if (hudHidden) {
    return (
      <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
        {/* Ultra-minimal floating controls in top-right corner so 98% of 3D view is open */}
        <div className="pointer-events-auto fixed top-2 right-2 flex items-center gap-1.5 bg-stone-950/80 backdrop-blur-sm border border-amber-500/40 rounded-full px-2.5 py-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              const prevSt = (
                gameState.activeStation > 1 ? gameState.activeStation - 1 : 5
              ) as BaristaStationId;
              onSelectStation(prevSt);
            }}
            className="px-1.5 py-0.5 rounded-full bg-stone-800 hover:bg-stone-700 text-[11px] font-bold text-amber-200 cursor-pointer"
            title="Previous Station [A]"
          >
            ‹
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
            className="px-1.5 py-0.5 rounded-full bg-stone-800 hover:bg-stone-700 text-[11px] font-bold text-amber-200 cursor-pointer"
            title="Next Station [D]"
          >
            ›
          </button>

          {targetRecipe && (
            <button
              type="button"
              onClick={() => onCupAction('quick_brew_step')}
              className={`px-2 py-0.5 rounded-full font-bold text-[10px] cursor-pointer whitespace-nowrap ${
                drinkValidation.hasWrongIngredient
                  ? 'bg-rose-500 text-stone-950'
                  : isDrinkReadyToServe
                  ? 'bg-emerald-500 text-stone-950'
                  : 'bg-amber-500 text-stone-950'
              }`}
              title={nextStep.instruction}
            >
              {drinkValidation.hasWrongIngredient
                ? '⚠️ Rinse'
                : isDrinkReadyToServe
                ? '✓ Serve'
                : '⚡ Brew Step'}
            </button>
          )}

          <button
            type="button"
            data-testid="btn-show-hud"
            onClick={() => setHudHidden(false)}
            className="px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-[10px] font-bold text-amber-200 cursor-pointer whitespace-nowrap"
            title="Restore Full Barista HUD [H]"
          >
            👁️ Show HUD
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
      {/* 1. ULTRA-SLIM TOP TELEMETRY RIBBON + SINGLE-LINE ORDER CHIP */}
      <div className="flex flex-col w-full pointer-events-none relative">
        <div className="pointer-events-auto h-9 sm:h-10 w-full bg-stone-950/92 border-b border-amber-500/25 px-2 sm:px-3 flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar shrink-0">
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
              <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-400 text-[9px] font-mono font-bold text-amber-300 whitespace-nowrap shrink-0">
                🏆 2x
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

          {/* Right Cluster: 2-State Graphics Toggle (LOW / MAX) + Hide HUD Toggle + Utility Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              data-testid="btn-toggle-graphics"
              onClick={(e) => {
                e.currentTarget.blur();
                handleToggleGraphics();
              }}
              title="Switch 3D Graphics Quality (LOW for Battery/Budget · MAX for High-End Android & Desktop)"
              className={`h-6 sm:h-7 px-2 rounded-md border flex items-center gap-1 text-[10px] font-mono font-bold cursor-pointer whitespace-nowrap transition-colors ${
                isMaxGraphics
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/70 text-amber-200'
                  : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-300'
              }`}
            >
              <span className="text-emerald-400">{Math.min(60, Math.max(30, fps))} FPS</span>
              <span className="text-stone-500">·</span>
              <span>GFX: {qualityLabel}</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="btn-toggle-hud"
              onClick={(e) => {
                e.currentTarget.blur();
                setHudHidden(true);
              }}
              title="Hide HUD for Fullscreen Unobstructed 3D Gameplay [H]"
              className="h-6 sm:h-7 px-2 rounded-md bg-stone-900 hover:bg-stone-800 border border-amber-500/40 flex items-center gap-1 text-[10px] font-semibold text-amber-200 cursor-pointer whitespace-nowrap"
            >
              <span>👁️</span>
              <span className="hidden md:inline">Hide HUD</span>
              <span className="md:hidden">HUD</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Spotify Vinyl Modal"
              title="Spotify Vinyl Player"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenModal('spotify');
              }}
              className={`min-w-[28px] h-6 sm:h-7 px-1.5 rounded-md border flex items-center justify-center gap-1 text-xs cursor-pointer ${
                spotifyState.isPlaying
                  ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-300'
                  : 'bg-stone-900 border-stone-700/80 text-stone-300'
              }`}
            >
              <span>🎵</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Recipes"
              title="Recipe Codex (Hot/Iced Coffee, Tea & Cold Drinks)"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenModal('recipes');
              }}
              className="min-w-[28px] h-6 sm:h-7 px-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center gap-1 text-xs text-amber-100 cursor-pointer"
            >
              <span>📖</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Upgrades"
              title="Upgrades, 100K Golden Machine & Loyalty Unlockables"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenModal('upgrades');
              }}
              className="relative min-w-[28px] h-6 sm:h-7 px-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-amber-500/45 flex items-center justify-center gap-1 text-xs text-amber-300 cursor-pointer"
            >
              <span>⚡</span>
              {unclaimedLoginCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Decor"
              title="Cafe Decor & Lighting"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenModal('customize');
              }}
              className="min-w-[28px] h-6 sm:h-7 px-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center gap-1 text-xs text-emerald-300 cursor-pointer"
            >
              <span>🪴</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={isMuted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="min-w-[28px] h-6 sm:h-7 px-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center text-xs text-amber-200 cursor-pointer"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            <button
              type="button"
              aria-label="Quick Menu Drawer"
              title="All Cafe Menus, Android APK & Settings"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="min-w-[28px] h-6 sm:h-7 px-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/45 flex items-center justify-center text-xs font-bold text-amber-200 cursor-pointer"
            >
              ☰
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause Shift [P]"
              title="Pause / Settings [Esc / P]"
              onClick={(e) => {
                e.currentTarget.blur();
                onTogglePause();
              }}
              className="min-w-[28px] h-6 sm:h-7 px-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center text-xs text-stone-200 cursor-pointer"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Mobile Quick-Access Upper Menu Drawer */}
        {mobileMenuOpen && (
          <div className="pointer-events-auto self-end mr-2 mt-1 bg-[#1b120d]/95 border border-amber-500/40 rounded-xl p-2 shadow-2xl grid grid-cols-2 sm:grid-cols-4 gap-1.5 z-30">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleToggleGraphics();
              }}
              className="px-3 py-2 rounded-lg bg-amber-500 text-stone-950 font-bold text-xs text-left cursor-pointer"
            >
              ✨ Graphics: {qualityLabel} (Tap to Switch)
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setHudHidden(true);
              }}
              className="px-3 py-2 rounded-lg bg-[#291c14] text-amber-200 border border-amber-500/40 font-bold text-xs text-left cursor-pointer"
            >
              👁️ Hide HUD Mode [H]
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenModal('pwa');
              }}
              className="px-3 py-2 rounded-lg bg-emerald-500 text-stone-950 font-bold text-xs text-left cursor-pointer"
            >
              📲 Download Android APK
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenModal('upgrades');
              }}
              className="px-3 py-2 rounded-lg bg-[#291c14] text-amber-100 border border-stone-700 font-semibold text-xs text-left cursor-pointer"
            >
              ⚡ Upgrades &amp; 100K Gold
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenModal('recipes');
              }}
              className="px-3 py-2 rounded-lg bg-[#291c14] text-amber-100 border border-stone-700 font-semibold text-xs text-left cursor-pointer"
            >
              📖 Recipes (Coffee/Tea)
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenModal('spotify');
              }}
              className="px-3 py-2 rounded-lg bg-[#291c14] text-emerald-300 border border-emerald-500/40 font-semibold text-xs text-left cursor-pointer"
            >
              🎵 Spotify Vinyl Deck
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenModal('customize');
              }}
              className="px-3 py-2 rounded-lg bg-[#291c14] text-amber-200 border border-stone-700 font-semibold text-xs text-left cursor-pointer"
            >
              🪴 Cafe Decor (18)
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onRequestFullscreenLandscape();
              }}
              className="px-3 py-2 rounded-lg bg-[#291c14] text-amber-200 border border-stone-700 font-semibold text-xs text-left cursor-pointer"
            >
              ⛶ Fullscreen Lock
            </button>
          </div>
        )}

        {/* Ultra-Compact Single-Line Order Strip + Inline Timed Progress (Never covers the middle of the 3D screen!) */}
        <div className="flex items-center justify-between gap-2 px-2 mt-1 pointer-events-none">
          {!ticketsCollapsed && pinnedOrder && targetRecipe ? (
            <div className="pointer-events-auto inline-flex items-center gap-1.5 bg-stone-950/85 border border-amber-500/35 rounded-full px-2.5 py-0.5 shadow-md max-w-[78vw] sm:max-w-xl overflow-hidden">
              <span className="text-[10px] shrink-0">{categoryIcon}</span>
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
                className="ml-0.5 text-[10px] text-stone-400 hover:text-white cursor-pointer shrink-0"
                title="Minimize Order Strip"
              >
                ✕
              </button>
            </div>
          ) : (
            <div />
          )}

          {/* Slim Top-Right Progress / Desktop Hover Pill (Never in the center of the 3D counter!) */}
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

      {/* 2. SINGLE-ROW EDGE-TO-EDGE BOTTOM BAR (No stacked floating rows above it!) */}
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

        {/* Center-Left: Integrated One-Tap Next Step Button (Replaces stacked floating pill!) */}
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
            <span>
              {drinkValidation.hasWrongIngredient
                ? '⚠️ Rinse [R]'
                : nextStep.toolKey === 'grinder'
                ? '⚡ Grind'
                : nextStep.toolKey === 'tamper'
                ? '⚡ Tamp'
                : nextStep.toolKey === 'espresso'
                ? '⚡ Shot'
                : nextStep.toolKey === 'tea'
                ? '⚡ Tea'
                : nextStep.toolKey === 'milk'
                ? '⚡ Milk'
                : nextStep.toolKey === 'ice'
                ? '⚡ +Ice'
                : nextStep.toolKey === 'syrup'
                ? '⚡ +Syrup'
                : '⚡ Serve'}
            </span>
          </button>
        )}

        {/* Right Side: Context-Sensitive Station Actions + Strict Validated Serve Button */}
        <div className="flex items-center gap-1 shrink-0">
          {gameState.activeStation === 1 && (
            <>
              <button
                type="button"
                onClick={() => onOpenModal('recipes')}
                className="px-1.5 sm:px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 border border-stone-600 text-[10px] sm:text-xs font-medium text-amber-100 cursor-pointer whitespace-nowrap"
              >
                Recipe Book
              </button>
              <button
                type="button"
                onClick={() => onSelectStation(2)}
                className="px-1.5 sm:px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] sm:text-xs font-semibold text-amber-200 cursor-pointer whitespace-nowrap"
              >
                Espresso Bar ➔
              </button>
            </>
          )}

          {gameState.activeStation === 2 && (
            <>
              <button
                type="button"
                onClick={() => onCupAction('grind')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  cup.hasGrounds
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-stone-800 hover:bg-stone-700 border-amber-500/50 text-amber-100'
                }`}
              >
                {cup.hasGrounds ? '✓ Ground' : '1. Grind [G]'}
              </button>
              <button
                type="button"
                onClick={() => onCupAction('tamp')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  cup.isTamped
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : cup.hasGrounds
                    ? 'bg-stone-800 hover:bg-stone-700 border-amber-500/50 text-amber-100'
                    : 'bg-stone-900/80 border-stone-800 text-stone-500'
                }`}
                title={!cup.hasGrounds ? 'Grind beans first before tamping!' : 'Tamp coffee puck'}
              >
                {cup.isTamped ? '✓ Tamped' : '2. Tamp [T]'}
              </button>
              <button
                type="button"
                onClick={() => onCupAction('pull_espresso')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
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
                {cup.hasEspresso ? '✓ Shot' : '3. Shot [E]'}
              </button>
              <button
                type="button"
                onClick={() => onCupAction('rinse_cup')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  drinkValidation.hasWrongIngredient
                    ? 'bg-rose-600 hover:bg-rose-500 border-rose-300 text-white animate-pulse'
                    : 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-300'
                }`}
              >
                {drinkValidation.hasWrongIngredient ? '⚠️ Rinse [R]' : 'Rinse [R]'}
              </button>
            </>
          )}

          {gameState.activeStation === 3 && (
            <>
              <button
                type="button"
                onClick={() => onCupAction('steep_tea')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  cup.hasSteepedTea
                    ? 'bg-lime-500/25 border-lime-400 text-lime-200'
                    : 'bg-stone-800 hover:bg-stone-700 border-lime-500/40 text-lime-200'
                }`}
              >
                🍵 Tea
              </button>
              <button
                type="button"
                onClick={() => onCupAction('steam_milk')}
                className={`px-1.5 sm:px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  cup.hasSteamedMilk
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : cup.hasEspresso || cup.hasSteepedTea
                    ? 'bg-stone-800 hover:bg-stone-700 border-stone-600 text-amber-100'
                    : 'bg-stone-900/80 border-stone-800 text-stone-500'
                }`}
              >
                {cup.hasSteamedMilk ? '✓ Milk' : 'Milk'}
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
                  className="px-1.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 border border-rose-300 text-[10px] sm:text-xs font-bold text-white cursor-pointer whitespace-nowrap animate-pulse"
                >
                  ⚠️ Rinse
                </button>
              )}
            </>
          )}

          {gameState.activeStation === 4 && (
            <button
              type="button"
              onClick={() => onCupAction('rinse_cup')}
              className={`px-2 py-1 rounded-md border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
                drinkValidation.hasWrongIngredient
                  ? 'bg-rose-600 hover:bg-rose-500 border-rose-300 text-white animate-pulse'
                  : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
              }`}
            >
              Rinse Cup [R]
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
                className="px-1.5 sm:px-2 py-1 rounded-md bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-[10px] sm:text-xs font-semibold text-emerald-200 cursor-pointer whitespace-nowrap"
              >
                Spotify Deck
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

          {/* Strict Validated Serve Button */}
          <button
            type="button"
            onClick={() => onServeCustomer()}
            className={`px-2 sm:px-3 py-1 rounded-md font-bold text-[10px] sm:text-xs cursor-pointer whitespace-nowrap transition-all ${
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
            {isDrinkReadyToServe
              ? 'Serve ➔'
              : drinkValidation.hasWrongIngredient
              ? '⚠️ Serve (Wrong)'
              : '🔒 Serve'}
          </button>
        </div>
      </div>
    </div>
  );
};
