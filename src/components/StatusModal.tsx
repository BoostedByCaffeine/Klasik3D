import React from 'react';
import { KlasikGameState } from '../game/rules';

interface StatusModalProps {
  gameState: KlasikGameState;
  onResume: () => void;
  onNextDayOrRetry: () => void;
  onReturnToTitle: () => void;
  onOpenSaveExport: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  gameState,
  onResume,
  onNextDayOrRetry,
  onReturnToTitle,
  onOpenSaveExport,
}) => {
  const isPaused = gameState.phase === 'paused';
  const goalMet = gameState.dailyRevenue >= gameState.dailyGoal;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto bg-[#1b120d] border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 text-center">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
            {isPaused
              ? `DAY ${gameState.day} SHIFT PAUSED`
              : goalMet
              ? `DAY ${gameState.day} SHIFT COMPLETE!`
              : `DAY ${gameState.day} SHIFT ENDED`}
          </div>
          <h2 id="status-modal-title" className="text-xl font-bold font-display text-amber-100">
            {isPaused
              ? 'Take a Breather Behind the Bar'
              : goalMet
              ? 'Neighborhood Favorite Roaster!'
              : 'Keep Practicing Your Extraction'}
          </h2>
          <p className="text-xs text-stone-400">
            {isPaused
              ? 'Your espresso boilers and vinyl record player are holding steady.'
              : goalMet
              ? 'You exceeded the daily revenue target and kept the Garage Garden thriving.'
              : `You reached $${Math.round(gameState.dailyRevenue)} of the $${Math.round(
                  gameState.dailyGoal
                )} target.`}
          </p>
        </div>

        {/* 3 Tabular-Nums Stat Tiles */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-[#241811] border border-stone-800">
            <div className="text-[10px] font-bold uppercase text-stone-400">SHIFT REVENUE</div>
            <div className="text-base font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
              ${Math.round(gameState.dailyRevenue)}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#241811] border border-stone-800">
            <div className="text-[10px] font-bold uppercase text-stone-400">CUPS SERVED</div>
            <div className="text-base font-bold font-mono tabular-nums text-amber-200 mt-0.5">
              {Math.round(gameState.cupsServedToday)}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#241811] border border-stone-800">
            <div className="text-[10px] font-bold uppercase text-stone-400">VIBE RATING</div>
            <div className="text-base font-bold font-mono tabular-nums text-amber-400 mt-0.5">
              {Math.round(gameState.satisfactionScore)}%
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {isPaused ? (
            <button
              type="button"
              onClick={onResume}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm cursor-pointer shadow"
            >
              Resume Shift [Esc / P]
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onNextDayOrRetry}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm cursor-pointer shadow"
            >
              {goalMet ? `Start Day ${gameState.day + 1} Shift` : `Retry Day ${gameState.day} Shift`}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenSaveExport}
              className="py-2 px-3 rounded-xl bg-[#291c14] hover:bg-[#38261b] border border-stone-700 text-xs font-semibold text-stone-200 cursor-pointer"
            >
              Backup / Restore Save
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="py-2 px-3 rounded-xl bg-[#291c14] hover:bg-[#38261b] border border-stone-700 text-xs font-semibold text-stone-300 cursor-pointer"
            >
              Return to 3D Title
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
