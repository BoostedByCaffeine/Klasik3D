import React from 'react';
import { Award, Home, Play, RotateCcw, Save } from 'lucide-react';
import { DAILY_QUOTA_COMPLETION_BONUS, KlasikGameState } from '../game/rules';
import { AppRuntimeVersion } from '../pwa/pwaManager';

interface StatusModalProps {
  gameState: KlasikGameState;
  appVersion?: AppRuntimeVersion;
  onResume: () => void;
  onNextDayOrRetry: () => void;
  onReturnToTitle: () => void;
  onOpenSaveExport: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  gameState,
  appVersion = 'web',
  onResume,
  onNextDayOrRetry,
  onReturnToTitle,
  onOpenSaveExport,
}) => {
  const isPaused = gameState.phase === 'paused';
  const quotaMet = gameState.cupsServedToday >= gameState.dailyOrderQuota;
  const goalMet = gameState.dailyRevenue >= gameState.dailyGoal || quotaMet;
  const isApkVersion = appVersion === 'apk';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div className="w-full max-w-lg max-h-[82vh] overflow-y-auto bg-[#1b120d] border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 text-center">
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
              ? `Daily Quota: ${gameState.cupsServedToday} / ${gameState.dailyOrderQuota} Orders (+$${DAILY_QUOTA_COMPLETION_BONUS} Quota Completion Bonus).`
              : quotaMet
              ? `You crushed the ${gameState.dailyOrderQuota}-Order Daily Quota and earned the +$${DAILY_QUOTA_COMPLETION_BONUS} Completion Bonus!`
              : `You served ${gameState.cupsServedToday} / ${gameState.dailyOrderQuota} orders and reached $${Math.round(
                  gameState.dailyRevenue
                )} of the $${Math.round(gameState.dailyGoal)} target.`}
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
            <div className="text-[10px] font-bold uppercase text-stone-400">DAILY QUOTA</div>
            <div className="text-base font-bold font-mono tabular-nums text-amber-200 mt-0.5">
              {Math.round(gameState.cupsServedToday)} / {gameState.dailyOrderQuota}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#241811] border border-stone-800">
            <div className="text-[10px] font-bold uppercase text-stone-400">VIBE RATING</div>
            <div className="text-base font-bold font-mono tabular-nums text-amber-400 mt-0.5">
              {Math.round(gameState.satisfactionScore)}%
            </div>
          </div>
        </div>

        {quotaMet && (
          <div className="p-2 rounded-xl bg-emerald-950/75 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5">
            <Award className="w-4 h-4 shrink-0" />
            <span>
              Daily Order Quota ({gameState.dailyOrderQuota} Orders) Completed — +$
              {DAILY_QUOTA_COMPLETION_BONUS} Bonus Awarded!
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {isPaused ? (
            <button
              type="button"
              onClick={onResume}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm cursor-pointer shadow flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>{isApkVersion ? 'Resume Shift' : 'Resume Shift [Esc / P]'}</span>
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onNextDayOrRetry}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm cursor-pointer shadow flex items-center justify-center gap-1.5"
            >
              {goalMet ? (
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {goalMet
                  ? `Start Day ${gameState.day + 1} Shift`
                  : `Retry Day ${gameState.day} Shift`}
              </span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenSaveExport}
              className="py-2 px-3 rounded-xl bg-[#291c14] hover:bg-[#38261b] border border-stone-700 text-xs font-semibold text-stone-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Backup / Restore Save</span>
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="py-2 px-3 rounded-xl bg-[#291c14] hover:bg-[#38261b] border border-stone-700 text-xs font-semibold text-stone-300 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Return to 3D Title</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
