import React from 'react';
import { GameMode } from '../game/rules';

interface DailyGoalProgressBarProps {
  day: number;
  mode: GameMode;
  cash: number;
  dailyRevenue: number;
  dailyGoal: number;
  dailyOrderQuota: number;
  cupsServedToday: number;
  satisfactionScore: number;
  shiftTimeRemaining: number;
}

export const DailyGoalProgressBar: React.FC<DailyGoalProgressBarProps> = ({
  day,
  mode,
  cash,
  dailyRevenue,
  dailyGoal,
  dailyOrderQuota,
  cupsServedToday,
  satisfactionScore,
  shiftTimeRemaining,
}) => {
  const goalPct = Math.min(100, Math.round((dailyRevenue / Math.max(1, dailyGoal)) * 100));
  const quotaMet = cupsServedToday >= dailyOrderQuota;
  const mins = Math.floor(shiftTimeRemaining / 60);
  const secs = Math.floor(shiftTimeRemaining % 60);
  const formattedTime =
    mode === 'zen' ? 'ZEN' : `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 text-xs font-mono tabular-nums whitespace-nowrap shrink-0">
      {/* Cash Readout */}
      <div className="flex items-center gap-1 font-bold text-emerald-400" data-testid="hud-cash">
        <span aria-hidden="true">💵</span>
        <span>${Math.round(cash)}</span>
      </div>

      <span className="text-stone-700" aria-hidden="true">
        |
      </span>

      {/* Compact Inline Goal Bar */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-sans font-semibold text-stone-300 hidden md:inline">
          D{day}
        </span>
        <div className="w-12 sm:w-16 h-2 rounded-full bg-stone-900 border border-stone-700 overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-200"
            style={{ width: `${goalPct}%` }}
          />
        </div>
        <span className="text-[11px] text-amber-300">
          ${Math.round(dailyRevenue)}/${Math.round(dailyGoal)}
        </span>
      </div>

      <span className="text-stone-700" aria-hidden="true">
        |
      </span>

      {/* Daily Order Quota (30-50 Orders) */}
      <div
        className={`flex items-center gap-1 font-semibold ${
          quotaMet ? 'text-emerald-300' : 'text-stone-200'
        }`}
        title={`Daily Order Quota: ${cupsServedToday} / ${dailyOrderQuota} Orders (+$50 Bonus)`}
        data-testid="hud-cups-served"
      >
        <span aria-hidden="true">☕</span>
        <span>
          {Math.round(cupsServedToday)} / {dailyOrderQuota} Orders
        </span>
      </div>

      <span className="text-stone-700 hidden sm:inline" aria-hidden="true">
        |
      </span>

      {/* Vibe / Satisfaction */}
      <div
        className="hidden sm:flex items-center gap-1 text-amber-300 font-semibold"
        title="Cafe Satisfaction Vibe"
      >
        <span aria-hidden="true">✨</span>
        <span>{Math.round(satisfactionScore)}%</span>
      </div>

      <span className="text-stone-700" aria-hidden="true">
        |
      </span>

      {/* Shift Timer */}
      <div className="flex items-center gap-1 text-amber-100 font-bold" title="Shift Timer">
        <span aria-hidden="true">⏱</span>
        <span>{formattedTime}</span>
      </div>
    </div>
  );
};
