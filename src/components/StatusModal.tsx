import React from 'react';
import { Award, Home, Play, Save } from 'lucide-react';
import {
  DAILY_QUOTA_COMPLETION_BONUS,
  KlasikGameState,
  getTimeUntilMidnightLabel,
} from '../game/rules';
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
  const isApkVersion = appVersion === 'apk';
  const midnightLabel = getTimeUntilMidnightLabel();

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div className="w-full max-w-lg max-h-[82vh] overflow-y-auto glass-modal rounded-2xl p-4 sm:p-5 space-y-3.5 text-center">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300 glass-text-crisp">
            {isPaused ? `STORE PAUSED · DAY ${gameState.day}` : `DAILY SUMMARY · DAY ${gameState.day}`}
          </div>
          <h2
            id="status-modal-title"
            className="text-xl font-bold font-display text-[#FAF5EE] glass-text-crisp"
          >
            {isPaused
              ? 'Take a Breather Behind the Bar'
              : quotaMet
              ? 'Daily Owner Quota Crushed!'
              : 'Your 24h Garage Cafe Never Closes'}
          </h2>
          <p className="text-xs text-[#E7D7C1]">
            {quotaMet
              ? `You served ${Math.round(gameState.cupsServedToday)} / ${gameState.dailyOrderQuota} cups today and claimed the +$${DAILY_QUOTA_COMPLETION_BONUS} Quota Bonus! Quota resets at local midnight (${midnightLabel}).`
              : `Daily Quota: ${Math.round(gameState.cupsServedToday)} / ${gameState.dailyOrderQuota} Cups (+$${DAILY_QUOTA_COMPLETION_BONUS} Completion Bonus). Resets at local midnight (${midnightLabel}).`}
          </p>
        </div>

        {/* 3 Tabular-Nums Stat Tiles */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-white/[0.06] border border-amber-400/20">
            <div className="text-[10px] font-bold uppercase text-[#E7D7C1]">TODAY&apos;S REVENUE</div>
            <div className="text-base font-bold font-mono tabular-nums text-emerald-300 mt-0.5 glass-text-crisp">
              ${Math.round(gameState.dailyRevenue)}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.06] border border-amber-400/20">
            <div className="text-[10px] font-bold uppercase text-[#E7D7C1]">DAILY QUOTA</div>
            <div className="text-base font-bold font-mono tabular-nums text-[#FAF5EE] mt-0.5 glass-text-crisp">
              {Math.round(gameState.cupsServedToday)} / {gameState.dailyOrderQuota}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.06] border border-amber-400/20">
            <div className="text-[10px] font-bold uppercase text-[#E7D7C1]">VIBE RATING</div>
            <div className="text-base font-bold font-mono tabular-nums text-amber-300 mt-0.5 glass-text-crisp">
              {Math.round(gameState.satisfactionScore)}%
            </div>
          </div>
        </div>

        {quotaMet && (
          <div className="p-2 rounded-xl bg-emerald-950/65 border border-emerald-400/40 text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5">
            <Award className="w-4 h-4 shrink-0" strokeWidth={2.2} />
            <span>
              Daily Quota ({gameState.dailyOrderQuota} Cups) Completed — +$
              {DAILY_QUOTA_COMPLETION_BONUS} Bonus Awarded!
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            data-start="true"
            onClick={isPaused ? onResume : onNextDayOrRetry}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-105 text-[#160E09] font-bold text-xs sm:text-sm cursor-pointer shadow-[0_8px_22px_-6px_rgba(245,158,11,0.6)] flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" strokeWidth={2.2} />
            <span>
              {isPaused
                ? isApkVersion
                  ? 'Resume Store'
                  : 'Resume Store [Esc / P]'
                : 'Continue Operating Store'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenSaveExport}
              className="glass-btn-inner py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
              <span>Backup / Restore Save</span>
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="glass-btn-inner py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
              <span>Return to 3D Title</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
