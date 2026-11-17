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
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [ticketsCollapsed, setTicketsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'KeyH') {
        e.preventDefault();
        setDockCollapsed((prev) => !prev);
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
    : { isComplete: false, missingSteps: ['Order'], wrongIngredients: [], hasWrongIngredient: false };
  const isDrinkReadyToServe =
    Boolean(targetRecipe) && drinkValidation.isComplete && !drinkValidation.hasWrongIngredient;
  const isGoldenEquipped = gameState.equippedMachineSkin === 'golden-espresso-machine';
  const unclaimedLoginCount = (gameState.loginRewards || []).filter(
    (r) =>
      !r.claimed &&
      (gameState.activeShiftSeconds ?? 0) >= (r.requiredShiftSeconds ?? 600) &&
      (gameState.totalCupsServed ?? 0) >= (r.requiredOrdersServed ?? 15)
  ).length;

  const qualityLabel =
    gameState.graphicsQuality === 'low'
      ? 'Smooth'
      : gameState.graphicsQuality === 'high'
      ? 'Ultra'
      : 'Auto';

  const handleCycleGraphics = () => {
    const order: GraphicsQuality[] = ['low', 'auto', 'high'];
    const nextQ = order[(order.indexOf(gameState.graphicsQuality) + 1) % order.length];
    onChangeGraphics(nextQ);
  };

  const categoryBadge = (() => {
    if (!targetRecipe) return null;
    if (targetRecipe.category === 'tea')
      return { label: '🍵 TEA', cls: 'text-lime-300 border-lime-500/40 bg-lime-500/15' };
    if (targetRecipe.category === 'cold_drink')
      return { label: '🥤 COLD DRINK', cls: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/15' };
    if (targetRecipe.category === 'iced_coffee' || pinnedOrder?.customNeedsIce)
      return { label: '🧊 ICED COFFEE', cls: 'text-sky-300 border-sky-500/40 bg-sky-500/15' };
    return { label: '🔥 HOT COFFEE', cls: 'text-amber-300 border-amber-500/40 bg-amber-500/15' };
  })();

  const cupStatusText = (() => {
    if (
      !cup.hasGrounds &&
      !cup.isTamped &&
      !cup.hasEspresso &&
      !cup.hasSteepedTea &&
      !cup.hasSteamedMilk &&
      !cup.hasIce &&
      cup.syrup === 'none'
    ) {
      return 'Empty';
    }
    const parts: string[] = [];
    if (cup.hasEspresso) parts.push('Espresso');
    else if (cup.isTamped) parts.push('Tamped');
    else if (cup.hasGrounds) parts.push('Grounds');
    if (cup.hasSteepedTea) parts.push('Steeped Tea');
    if (cup.hasSteamedMilk) parts.push('Milk');
    if (cup.hasIce) parts.push('Iced');
    if (cup.syrup !== 'none') parts.push(cup.syrup);
    return parts.join(' · ') || 'Prep';
  })();

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between overflow-hidden">
      {/* 1. MOBILE-ACCESSIBLE TOP TELEMETRY RIBBON + COMPACT DIEGETIC DIALOGUE BUBBLE */}
      <div className="flex flex-col w-full pointer-events-none relative">
        <div className="pointer-events-auto h-10 sm:h-11 w-full bg-stone-950/90 border-b border-amber-500/25 px-2 sm:px-3 flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {/* Left Cluster: Compact Station Pill + Collapsible Mini Order Tickets */}
          <div className="flex items-center gap-1.5 min-w-0 shrink-0 sm:flex-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setTicketsCollapsed((prev) => !prev)}
              className="px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/35 text-[11px] font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer min-h-[28px]"
              title="Toggle Mini Order Tickets & Customer Speech Bubble"
            >
              {STATION_TABS.find((s) => s.id === gameState.activeStation)?.badge}
            </button>

            {isGoldenEquipped && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-400 text-[10px] font-mono font-bold text-amber-300 whitespace-nowrap shrink-0">
                🏆 2x GOLD
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
                      className={`relative flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition-colors cursor-pointer shrink-0 max-w-[148px] overflow-hidden min-h-[28px] ${
                        isPinned
                          ? 'bg-amber-950/90 border-amber-400 text-amber-100'
                          : 'bg-stone-900/90 border-stone-800 text-stone-300 hover:border-stone-600'
                      }`}
                      title={`${cust.customerName}: ${cust.dialogueLine}`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: recipe.colorHex }}
                      />
                      <span className="font-semibold truncate">{cust.customerName}</span>
                      {cust.customAddons?.[0] && (
                        <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-200 font-mono shrink-0">
                          {cust.customAddons[0]}
                        </span>
                      )}
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

          {/* Right Cluster: Live FPS + Smooth/Ultra Switcher + Mobile-Friendly Utility Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                handleCycleGraphics();
              }}
              title="Cycle 3D Graphics Quality (Smooth Android 60FPS / Auto / Ultra)"
              className="h-7 px-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center gap-1 text-[10px] font-mono text-emerald-300 cursor-pointer whitespace-nowrap"
            >
              <span>{Math.min(60, Math.max(30, fps))} FPS</span>
              <span className="text-stone-500">·</span>
              <span className="text-amber-200">{qualityLabel}</span>
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
              className={`min-w-[30px] h-7 px-1.5 rounded-md border flex items-center justify-center gap-1 text-xs cursor-pointer ${
                spotifyState.isPlaying
                  ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-300'
                  : 'bg-stone-900 border-stone-700/80 text-stone-300'
              }`}
            >
              <span>🎵</span>
              <span className="hidden xl:inline text-[10px] font-semibold">Vinyl</span>
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
              className="min-w-[30px] h-7 px-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center gap-1 text-xs text-amber-100 cursor-pointer"
            >
              <span>📖</span>
              <span className="hidden xl:inline text-[10px] font-semibold">Menu</span>
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
              className="relative min-w-[30px] h-7 px-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-amber-500/45 flex items-center justify-center gap-1 text-xs text-amber-300 cursor-pointer"
            >
              <span>⚡</span>
              <span className="hidden xl:inline text-[10px] font-semibold">Shop/100K</span>
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
              className="min-w-[30px] h-7 px-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center gap-1 text-xs text-emerald-300 cursor-pointer"
            >
              <span>🪴</span>
              <span className="hidden xl:inline text-[10px] font-semibold">Decor</span>
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
              className="min-w-[30px] h-7 px-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center text-xs text-amber-200 cursor-pointer"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            <button
              type="button"
              aria-label="Quick Menu Drawer"
              title="All Cafe Menus & Settings"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="min-w-[30px] h-7 px-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/45 flex items-center justify-center text-xs font-bold text-amber-200 cursor-pointer"
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
              className="min-w-[30px] h-7 px-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center text-xs text-stone-200 cursor-pointer"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Mobile Quick-Access Upper Menu Drawer */}
        {mobileMenuOpen && (
          <div className="pointer-events-auto self-end mr-2 mt-1 bg-[#1b120d]/95 border border-amber-500/40 rounded-xl p-2 shadow-2xl grid grid-cols-2 sm:grid-cols-3 gap-1.5 z-30">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenModal('upgrades');
              }}
              className="px-3 py-2 rounded-lg bg-amber-500 text-stone-950 font-bold text-xs text-left cursor-pointer"
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
                onOpenModal('export');
              }}
              className="px-3 py-2 rounded-lg bg-[#291c14] text-stone-200 border border-stone-700 font-semibold text-xs text-left cursor-pointer"
            >
              💾 Save &amp; GitHub
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

        {/* Diegetic Customer Ordering Dialogue Pill */}
        {!ticketsCollapsed && pinnedOrder && targetRecipe && (
          <div className="pointer-events-auto self-start mt-1 ml-2 max-w-lg bg-stone-950/88 border border-amber-500/35 rounded-xl px-2.5 py-1 shadow-lg flex flex-wrap items-center gap-1.5">
            {categoryBadge && (
              <span
                className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold shrink-0 ${categoryBadge.cls}`}
              >
                {categoryBadge.label}
              </span>
            )}
            <span className="text-[11px] font-bold text-amber-300 shrink-0">
              💬 {pinnedOrder.customerName}:
            </span>
            <span className="text-[11px] italic text-stone-200 truncate max-w-[210px] sm:max-w-[300px]">
              &ldquo;{pinnedOrder.dialogueLine}&rdquo;
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {pinnedOrder.customAddons?.map((addon) => (
                <span
                  key={addon}
                  className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-semibold text-amber-200"
                >
                  {addon}
                </span>
              ))}
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300">
                +${isGoldenEquipped ? pinnedOrder.customBonusTip * 2 : pinnedOrder.customBonusTip} Tip
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. UNOBSTRUCTED 80%+ 3D VIEWPORT CENTER (Subtle hover/animation micro-badge + timed step progress bar) */}
      <div className="my-auto flex flex-col items-center pointer-events-none px-4">
        {(activeAnimLabel || hoveredToolLabel) && (
          <div className="bg-stone-950/90 border border-amber-500/50 text-amber-100 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-lg flex flex-col items-center gap-1 min-w-[220px]">
            <div className="flex items-center gap-2">
              <span>{activeAnimLabel || hoveredToolLabel}</span>
              {stepDurationMs && stepProgress !== null && (
                <span className="text-[10px] font-mono text-amber-300">
                  {(stepDurationMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            {stepProgress !== null && (
              <div className="w-full h-1.5 rounded-full bg-stone-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.max(5, stepProgress))}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. BOTTOM PERIPHERAL DOCK: Floating Contextual Action Pill + Compact Single-Row Bottom Bar */}
      <div className="w-full flex flex-col items-center pointer-events-none">
        {/* Floating Contextual Action Pill */}
        <div
          className={`pointer-events-auto mb-1 flex items-center gap-1.5 max-h-[32px] bg-stone-950/90 border rounded-full px-3 py-0.5 shadow-lg ${
            drinkValidation.hasWrongIngredient
              ? 'border-rose-500/80 bg-rose-950/85'
              : 'border-amber-500/35'
          }`}
        >
          {targetRecipe ? (
            <>
              <span className="text-[11px] font-medium text-stone-200 truncate max-w-[200px] sm:max-w-[350px]">
                <strong
                  className={
                    drinkValidation.hasWrongIngredient ? 'text-rose-300' : 'text-amber-300'
                  }
                >
                  {targetRecipe.name}:
                </strong>{' '}
                {nextStep.instruction}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onCupAction('quick_brew_step');
                }}
                className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] cursor-pointer whitespace-nowrap shrink-0 ${
                  drinkValidation.hasWrongIngredient
                    ? 'bg-rose-500 hover:bg-rose-400 text-stone-950'
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                }`}
              >
                {drinkValidation.hasWrongIngredient ? 'Rinse Cup [R]' : 'Do Step [Space]'}
              </button>
            </>
          ) : (
            <span className="text-[11px] text-stone-300">{gameState.lastActionFeedback}</span>
          )}

          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="ml-0.5 px-1.5 py-0.5 rounded-full bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-amber-200 cursor-pointer whitespace-nowrap"
            title="Collapse / Expand Bottom Bar [H]"
          >
            {dockCollapsed ? '▴ [H]' : '▾ [H]'}
          </button>
        </div>

        {/* Single-Row Contextual Bottom Bar (Compact 800px Android Landscape Fit) */}
        {!dockCollapsed && (
          <div className="pointer-events-auto h-10 sm:h-11 w-full bg-stone-950/92 border-t border-amber-500/25 px-2 sm:px-3.5 flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
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
                    className={`px-1.5 sm:px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
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

            {/* Center: Compact Cup Status Readout */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-stone-300 whitespace-nowrap shrink-0">
              <span className="text-amber-400 font-semibold">Cup:</span>
              <span>{cupStatusText}</span>
            </div>

            {/* Right Side: Context-Sensitive Station Actions with Strict Sequential Locks */}
            <div className="flex items-center gap-1 shrink-0">
              {gameState.activeStation === 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenModal('recipes')}
                    className="px-1.5 sm:px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-[10px] sm:text-xs font-medium text-amber-100 cursor-pointer whitespace-nowrap"
                  >
                    Recipe Book
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectStation(2)}
                    className="px-1.5 sm:px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[10px] sm:text-xs font-semibold text-amber-200 cursor-pointer whitespace-nowrap"
                  >
                    Go to Espresso Bar ➔
                  </button>
                </>
              )}

              {gameState.activeStation === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => onCupAction('grind')}
                    className={`px-1.5 sm:px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
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
                    className={`px-1.5 sm:px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
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
                    className={`px-1.5 sm:px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
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
                    className={`px-1.5 sm:px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
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
                    className={`px-2 py-1 rounded-lg border text-[11px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      cup.hasSteepedTea
                        ? 'bg-lime-500/25 border-lime-400 text-lime-200'
                        : 'bg-stone-800 hover:bg-stone-700 border-lime-500/40 text-lime-200'
                    }`}
                  >
                    🍵 Steep Tea
                  </button>
                  <button
                    type="button"
                    onClick={() => onCupAction('steam_milk')}
                    className={`px-2 py-1 rounded-lg border text-[11px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      cup.hasSteamedMilk
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : cup.hasEspresso || cup.hasSteepedTea
                        ? 'bg-stone-800 hover:bg-stone-700 border-stone-600 text-amber-100'
                        : 'bg-stone-900/80 border-stone-800 text-stone-500'
                    }`}
                  >
                    {cup.hasSteamedMilk ? '✓ Milk' : 'Steam Milk'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCupAction('add_ice')}
                    className={`px-2 py-1 rounded-lg border text-[11px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      cup.hasIce
                        ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                        : 'bg-stone-800 border-stone-600 text-sky-100'
                    }`}
                  >
                    +Ice
                  </button>
                  {(
                    [
                      { id: 'vanilla', label: '+Vanilla' },
                      { id: 'caramel', label: '+Caramel' },
                      { id: 'chocolate', label: '+Choc' },
                      { id: 'matcha', label: '+Matcha' },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onCupAction('add_syrup', s.id)}
                      className={`px-1.5 sm:px-2 py-1 rounded-lg border text-[11px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
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
                      className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 border border-rose-300 text-[11px] sm:text-xs font-bold text-white cursor-pointer whitespace-nowrap animate-pulse"
                    >
                      ⚠️ Rinse [R]
                    </button>
                  )}
                </>
              )}

              {gameState.activeStation === 4 && (
                <button
                  type="button"
                  onClick={() => onCupAction('rinse_cup')}
                  className={`px-2 py-1 rounded-lg border text-[11px] sm:text-xs font-semibold cursor-pointer whitespace-nowrap ${
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
                    className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-amber-500/35 text-[11px] sm:text-xs font-semibold text-amber-200 cursor-pointer whitespace-nowrap"
                  >
                    {spotifyState.isPlaying ? 'Pause Vinyl [M]' : 'Spin Vinyl [M]'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenModal('spotify')}
                    className="px-2 py-1 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-[11px] sm:text-xs font-semibold text-emerald-200 cursor-pointer whitespace-nowrap"
                  >
                    Spotify Deck
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenModal('upgrades')}
                    className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[11px] sm:text-xs font-semibold text-stone-200 cursor-pointer whitespace-nowrap"
                  >
                    Shop &amp; 100K Skins
                  </button>
                </>
              )}

              {/* Strict Validated Serve Button */}
              <button
                type="button"
                onClick={() => onServeCustomer()}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold text-[11px] sm:text-xs cursor-pointer whitespace-nowrap transition-all ${
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
                  ? 'Serve Drink ➔'
                  : drinkValidation.hasWrongIngredient
                  ? '⚠️ Serve (Wrong)'
                  : '🔒 Serve Drink'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
