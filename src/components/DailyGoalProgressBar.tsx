import React from 'react';
import { Award, Banknote, Clock, Coffee, Sparkles } from 'lucide-react';
import { DAILY_QUOTA_COMPLETION_BONUS, GameMode } from '../game/rules';

interface DailyGoalProgressBarProps {
  day: number;
  mode: GameMode;
  cash: number;
  dailyRevenue: number;
  dailyGoal: number;
  dailyOrderQuota: number;
  cupsServedToday: number;
  satisfactionScore: number;
  liveClockLabel: string;
}

export const DailyGoalProgressBar: React.FC<DailyGoalProgressBarProps> = ({
  day,
  mode,
  cash,
  dailyOrderQuota,
  cupsServedToday,
  satisfactionScore,
  liveClockLabel,
}) => {
  const quotaPct = Math.min(100, Math.round((cupsServedToday / Math.max(1, dailyOrderQuota)) * 100));
  const quotaMet = cupsServedToday >= dailyOrderQuota;

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 text-xs font-mono tabular-nums whitespace-nowrap shrink-0 glass-text-crisp">
      {/* Cash Readout */}
      <div className="flex items-center gap-1 font-bold text-white" data-testid="hud-cash">
        <Banknote className="w-3.5 h-3.5 text-[#34D399] shrink-0" strokeWidth={2.2} aria-hidden="true" />
        <span>
          <span className="text-[#34D399]">$</span>
          {Math.round(cash)}
        </span>
      </div>

      <span className="text-white/15" aria-hidden="true">
        |
      </span>

      {/* Daily 35-Cup Quota Progress Bar (+$120 Bonus) */}
      <div
        className={`flex items-center gap-1.5 font-semibold ${
          quotaMet ? 'text-[#34D399]' : 'text-white'
        }`}
        title={`Daily Owner Quota: ${Math.round(cupsServedToday)} / ${dailyOrderQuota} Cups (+$${DAILY_QUOTA_COMPLETION_BONUS} Bonus, resets at local midnight)`}
        data-testid="hud-cups-served"
      >
        <span className="text-[11px] font-sans font-semibold text-[#A1A1AA] hidden md:inline">
          D{day}
        </span>
        <Coffee className="w-3.5 h-3.5 text-[#E4E4E7] shrink-0" strokeWidth={2.2} aria-hidden="true" />
        <div className="w-12 sm:w-16 h-2 rounded-full bg-[#27272A] border border-white/15 overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              quotaMet
                ? 'bg-gradient-to-r from-[#34D399] to-teal-300'
                : 'hud-platinum-bar'
            }`}
            style={{ width: `${quotaPct}%` }}
          />
        </div>
        <span className="text-[11px]">
          {Math.round(cupsServedToday)}/{dailyOrderQuota}
        </span>
        {quotaMet && (
          <span className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0 rounded bg-[#34D399]/18 border border-[#34D399]/45 text-[9px] text-[#34D399] font-bold">
            <Award className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
            <span>+${DAILY_QUOTA_COMPLETION_BONUS}</span>
          </span>
        )}
      </div>

      <span className="text-white/15 hidden sm:inline" aria-hidden="true">
        |
      </span>

      {/* Vibe / Satisfaction */}
      <div
        className="hidden sm:flex items-center gap-1 text-[#E4E4E7] font-semibold"
        title="Cafe Satisfaction Vibe"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" strokeWidth={2.2} aria-hidden="true" />
        <span>{Math.round(satisfactionScore)}%</span>
      </div>

      <span className="text-white/15" aria-hidden="true">
        |
      </span>

      {/* Live 24h Local Device Clock */}
      <div
        className="flex items-center gap-1 text-white font-bold"
        title={mode === 'zen' ? 'Zen Mode · Live Local Clock' : '24h Store Live Local Clock'}
        data-testid="hud-live-clock"
      >
        <Clock className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" strokeWidth={2.2} aria-hidden="true" />
        <span>{mode === 'zen' ? `ZEN · ${liveClockLabel}` : liveClockLabel}</span>
      </div>
    </div>
  );
};
