import React from 'react';
import { Banknote, Clock, Coffee, Sparkles } from 'lucide-react';
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
    <div className="flex items-center gap-2 sm:gap-2.5 text-xs font-mono tabular-nums whitespace-nowrap shrink-0 glass-text-crisp">
      {/* Cash Readout */}
      <div className="flex items-center gap-1 font-bold text-emerald-300" data-testid="hud-cash">
        <Banknote className="w-3.5 h-3.5 text-emerald-300 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        <span>${Math.round(cash)}</span>
      </div>

      <span className="text-amber-200/30" aria-hidden="true">
        |
      </span>

      {/* Compact Inline Goal Bar */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-sans font-semibold text-[#E7D7C1] hidden md:inline">
          D{day}
        </span>
        <div className="w-12 sm:w-16 h-2 rounded-full bg-black/50 border border-amber-400/25 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 transition-all duration-200"
            style={{ width: `${goalPct}%` }}
          />
        </div>
        <span className="text-[11px] text-amber-300 font-semibold">
          ${Math.round(dailyRevenue)}/${Math.round(dailyGoal)}
        </span>
      </div>

      <span className="text-amber-200/30" aria-hidden="true">
        |
      </span>

      {/* Daily Order Quota (30-50 Orders) */}
      <div
        className={`flex items-center gap-1 font-semibold ${
          quotaMet ? 'text-emerald-300' : 'text-[#FAF5EE]'
        }`}
        title={`Daily Order Quota: ${cupsServedToday} / ${dailyOrderQuota} Orders (+$50 Bonus)`}
        data-testid="hud-cups-served"
      >
        <Coffee className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        <span>
          {Math.round(cupsServedToday)} / {dailyOrderQuota} Orders
        </span>
      </div>

      <span className="text-amber-200/30 hidden sm:inline" aria-hidden="true">
        |
      </span>

      {/* Vibe / Satisfaction */}
      <div
        className="hidden sm:flex items-center gap-1 text-amber-300 font-semibold"
        title="Cafe Satisfaction Vibe"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        <span>{Math.round(satisfactionScore)}%</span>
      </div>

      <span className="text-amber-200/30" aria-hidden="true">
        |
      </span>

      {/* Shift Timer */}
      <div className="flex items-center gap-1 text-[#FAF5EE] font-bold" title="Shift Timer">
        <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        <span>{formattedTime}</span>
      </div>
    </div>
  );
};
