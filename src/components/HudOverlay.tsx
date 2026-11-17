import React, { useEffect, useState } from 'react';
import {
  BaristaStationId,
  GraphicsQuality,
  KlasikGameState,
  SyrupFlavor,
  evaluateDrinkMatch,
  getNextRecommendedStep,
  getRecipeById,
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
  onSelectStation: (station: BaristaStationId) => void;
  onPinOrder: (orderId: string) => void;
  onCupAction: (
    action:
      | 'grind'
      | 'tamp'
      | 'pull_espresso'
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
  { id: 3, short: '3. Milk & Syrup', badge: 'St. 3: Milk & Syrup' },
  { id: 4, short: '4. Serve', badge: 'St. 4: Serve' },
  { id: 5, short: '5. Vinyl', badge: 'St. 5: Vinyl' },
];

export const HudOverlay: React.FC<HudOverlayProps> = ({
  gameState,
  spotifyState,
  isMuted,
  hoveredToolLabel,
  activeAnimLabel,
  onSelectStation,
  onPinOrder,
  onCupAction,
  onServeCustomer,
  onToggleMute,
  onTogglePause,
  onToggleVinyl,
  onRequestFullscreenLandscape,
  onOpenModal,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [ticketsCollapsed, setTicketsCollapsed] = useState(false);

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
  const isDrinkReadyToServe =
    targetRecipe && evaluateDrinkMatch(cup, targetRecipe, pinnedOrder).accuracy >= 75;

  const cupStatusText = (() => {
    if (
      !cup.hasGrounds &&
      !cup.isTamped &&
      !cup.hasEspresso &&
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
    if (cup.hasSteamedMilk) parts.push('Milk');
    if (cup.hasIce) parts.push('Iced');
    if (cup.syrup !== 'none') parts.push(cup.syrup);
    return parts.join(' · ') || 'Prep';
  })();

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between overflow-hidden">
      {/* 1. SINGLE ULTRA-THIN TOP TELEMETRY RIBBON + COMPACT DIEGETIC DIALOGUE BUBBLE */}
      <div className="flex flex-col w-full pointer-events-none">
        <div className="pointer-events-auto h-9 sm:h-11 w-full bg-stone-950/85 border-b border-amber-500/20 px-2.5 sm:px-3.5 flex items-center justify-between gap-2 shrink-0">
          {/* Left Cluster: Compact Station Pill + Collapsible Mini Order Tickets */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <button
              type="button"
              onClick={() => setTicketsCollapsed((prev) => !prev)}
              className="px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/35 text-[11px] font-bold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
              title="Toggle Mini Order Tickets & Customer Speech Bubble"
            >
              {STATION_TABS.find((s) => s.id === gameState.activeStation)?.badge}
            </button>

            {!ticketsCollapsed && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {orderingCustomers.map((cust) => {
                  const recipe = getRecipeById(cust.recipeId);
                  const isPinned = pinnedOrder?.id === cust.id;
                  return (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => onPinOrder(cust.id)}
                      className={`relative flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition-colors cursor-pointer shrink-0 max-w-[165px] overflow-hidden ${
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
                        ${recipe.price}
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

          {/* Center Cluster: Inline Telemetry Stats in One Single Row */}
          <DailyGoalProgressBar
            day={gameState.day}
            mode={gameState.mode}
            cash={gameState.cash}
            dailyRevenue={gameState.dailyRevenue}
            dailyGoal={gameState.dailyGoal}
            cupsServedToday={gameState.cupsServedToday}
            satisfactionScore={gameState.satisfactionScore}
            shiftTimeRemaining={gameState.shiftTimeRemaining}
          />

          {/* Right Cluster: Compact 28x28 Icon-Only Utility Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Fullscreen Landscape"
              title="Tap for Fullscreen Landscape"
              onClick={(e) => {
                e.currentTarget.blur();
                onRequestFullscreenLandscape();
              }}
              className="w-7 h-7 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center text-xs text-amber-200 cursor-pointer"
            >
              ⛶
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
              className="w-7 h-7 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center text-xs text-amber-200 cursor-pointer"
            >
              {isMuted ? '🔇' : '🔊'}
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
              className={`w-7 h-7 rounded-md border flex items-center justify-center text-xs cursor-pointer ${
                spotifyState.isPlaying
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-stone-900 border-stone-700/80 text-stone-300'
              }`}
            >
              🎵
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Recipes"
              title="Recipe Codex"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenModal('recipes');
              }}
              className="w-7 h-7 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center text-xs text-amber-100 cursor-pointer"
            >
              📖
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Upgrades"
              title="Equipment Upgrades"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenModal('upgrades');
              }}
              className="w-7 h-7 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center text-xs text-amber-300 cursor-pointer"
            >
              ⚡
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
              className="w-7 h-7 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center text-xs text-emerald-300 cursor-pointer"
            >
              🪴
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
              className="w-7 h-7 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700/80 flex items-center justify-center text-xs text-stone-200 cursor-pointer"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Diegetic Customer Ordering Dialogue Pill (Compact top-left speech bubble with Custom Add-on Badges) */}
        {!ticketsCollapsed && pinnedOrder && targetRecipe && (
          <div className="pointer-events-auto self-start mt-1.5 ml-2.5 max-w-md bg-stone-950/88 border border-amber-500/35 rounded-xl px-3 py-1.5 shadow-lg flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-amber-300 shrink-0">
              💬 {pinnedOrder.customerName}:
            </span>
            <span className="text-[11px] italic text-stone-200 truncate max-w-[260px] sm:max-w-[330px]">
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
                +${pinnedOrder.customBonusTip} Tip
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. UNOBSTRUCTED 80%+ 3D VIEWPORT CENTER (Only subtle hover/animation micro-badge) */}
      <div className="my-auto flex flex-col items-center pointer-events-none px-4">
        {(activeAnimLabel || hoveredToolLabel) && (
          <div className="bg-stone-950/85 border border-amber-500/40 text-amber-100 text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
            {activeAnimLabel || hoveredToolLabel}
          </div>
        )}
      </div>

      {/* 3. BOTTOM PERIPHERAL DOCK: Floating Contextual Action Pill + Single-Row Bottom Bar */}
      <div className="w-full flex flex-col items-center pointer-events-none">
        {/* Floating Contextual Action Pill (max-height: 34px, docked neatly above bottom bar) */}
        <div className="pointer-events-auto mb-1.5 flex items-center gap-1.5 max-h-[34px] bg-stone-950/90 border border-amber-500/35 rounded-full px-3 py-1 shadow-lg">
          {targetRecipe ? (
            <>
              <span className="text-[11px] font-medium text-stone-300 truncate max-w-[220px] sm:max-w-[360px]">
                <strong className="text-amber-300">{targetRecipe.name}:</strong>{' '}
                {nextStep.instruction}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onCupAction('quick_brew_step');
                }}
                className="px-2.5 py-0.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] cursor-pointer whitespace-nowrap shrink-0"
              >
                Do Step [Space]
              </button>
            </>
          ) : (
            <span className="text-[11px] text-stone-300">{gameState.lastActionFeedback}</span>
          )}

          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="ml-1 px-2 py-0.5 rounded-full bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-amber-200 cursor-pointer whitespace-nowrap"
            title="Collapse / Expand Bottom Bar [H]"
          >
            {dockCollapsed ? '▴ [H]' : '▾ [H]'}
          </button>
        </div>

        {/* Single-Row Contextual Bottom Bar (height: 44px max — never 3 stacked rows) */}
        {!dockCollapsed && (
          <div className="pointer-events-auto h-11 w-full bg-stone-950/90 border-t border-amber-500/25 px-2.5 sm:px-4 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
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
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-stone-300 whitespace-nowrap shrink-0">
              <span className="text-amber-400 font-semibold">Cup:</span>
              <span>{cupStatusText}</span>
            </div>

            {/* Right Side: Context-Sensitive Station Actions Only */}
            <div className="flex items-center gap-1.5 shrink-0">
              {gameState.activeStation === 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenModal('recipes')}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-xs font-medium text-amber-100 cursor-pointer whitespace-nowrap"
                  >
                    Recipe Book
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectStation(2)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs font-semibold text-amber-200 cursor-pointer whitespace-nowrap"
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
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-xs font-semibold text-amber-100 cursor-pointer whitespace-nowrap"
                  >
                    Grind Beans
                  </button>
                  <button
                    type="button"
                    onClick={() => onCupAction('tamp')}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-xs font-semibold text-amber-100 cursor-pointer whitespace-nowrap"
                  >
                    Tamp Puck
                  </button>
                  <button
                    type="button"
                    onClick={() => onCupAction('pull_espresso')}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-xs font-semibold text-amber-100 cursor-pointer whitespace-nowrap"
                  >
                    Pull Shot
                  </button>
                  <button
                    type="button"
                    onClick={() => onCupAction('rinse_cup')}
                    className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs text-stone-300 cursor-pointer whitespace-nowrap"
                  >
                    Rinse [R]
                  </button>
                </>
              )}

              {gameState.activeStation === 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => onCupAction('steam_milk')}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-xs font-semibold text-amber-100 cursor-pointer whitespace-nowrap"
                  >
                    Steam Milk
                  </button>
                  <button
                    type="button"
                    onClick={() => onCupAction('add_ice')}
                    className={`px-2 py-1 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
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
                      className={`px-2 py-1 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                        cup.syrup === s.id
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                          : 'bg-stone-800 border-stone-700 text-stone-200 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </>
              )}

              {gameState.activeStation === 4 && (
                <button
                  type="button"
                  onClick={() => onCupAction('rinse_cup')}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs text-stone-300 cursor-pointer whitespace-nowrap"
                >
                  Rinse Cup [R]
                </button>
              )}

              {gameState.activeStation === 5 && (
                <>
                  <button
                    type="button"
                    onClick={onToggleVinyl}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-amber-500/35 text-xs font-semibold text-amber-200 cursor-pointer whitespace-nowrap"
                  >
                    {spotifyState.isPlaying ? 'Pause Vinyl [M]' : 'Spin Vinyl [M]'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenModal('spotify')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/40 text-xs font-semibold text-emerald-200 cursor-pointer whitespace-nowrap"
                  >
                    Spotify Deck
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenModal('upgrades')}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-semibold text-stone-200 cursor-pointer whitespace-nowrap"
                  >
                    Shop Upgrades
                  </button>
                </>
              )}

              {/* Universal Quick Serve Button */}
              <button
                type="button"
                onClick={() => onServeCustomer()}
                className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer whitespace-nowrap transition-all ${
                  isDrinkReadyToServe || gameState.activeStation === 4
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-md'
                    : 'bg-emerald-950/70 hover:bg-emerald-800/80 border border-emerald-500/40 text-emerald-200'
                }`}
              >
                Serve Drink ➔
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
