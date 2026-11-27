import React from 'react';
import { ArrowRight, CheckCircle2, Compass, SkipForward, Sparkles } from 'lucide-react';
import { BaristaStationId } from '../game/rules';
import { TutorialStepGuide, getStationShortLabel } from '../game/onboarding';

interface TutorialCoachOverlayProps {
  step: TutorialStepGuide;
  activeStation: BaristaStationId;
  onJumpToStation: (station: BaristaStationId) => void;
  onSkip: () => void;
  onFinish: () => void;
}

export const TutorialCoachOverlay: React.FC<TutorialCoachOverlayProps> = ({
  step,
  activeStation,
  onJumpToStation,
  onSkip,
  onFinish,
}) => {
  const needsStationSwitch = !step.isCompleted && activeStation !== step.targetStation;

  return (
    <div
      data-testid="tutorial-coach-overlay"
      className="pointer-events-none absolute inset-x-0 top-[76px] sm:top-[84px] z-30 flex justify-center px-2.5 sm:px-4"
    >
      <div
        className={`pointer-events-auto w-full max-w-lg rounded-2xl backdrop-blur-xl border shadow-[0_18px_44px_-12px_rgba(0,0,0,0.88)] px-3 py-2 sm:px-3.5 sm:py-2.5 transition-all ${
          step.isCompleted
            ? 'bg-[#09090B]/94 border-emerald-400/45 text-white'
            : step.isError
            ? 'bg-[#180c0e]/94 border-rose-400/45 text-white'
            : 'bg-[#09090B]/90 border-white/20 text-white'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Left: Step Badge + Progress Dots + Title/Instruction */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                data-testid="tutorial-step-counter"
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider ${
                  step.isCompleted
                    ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                    : 'bg-white/[0.09] border border-white/15 text-[#E4E4E7]'
                }`}
              >
                {step.isCompleted ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-300 shrink-0" strokeWidth={2.4} />
                ) : (
                  <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" strokeWidth={2.4} />
                )}
                <span>
                  {step.isCompleted
                    ? 'Tutorial Complete'
                    : `First Shift Guide · ${step.stepNumber}/${step.totalSteps}`}
                </span>
              </span>

              {!step.isCompleted && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/12 border border-emerald-400/25 text-[9px] font-mono text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Patience Paused</span>
                </span>
              )}

              {/* Compact progress dots */}
              <div className="hidden sm:flex items-center gap-1 ml-0.5" aria-hidden="true">
                {Array.from({ length: step.totalSteps }).map((_, idx) => {
                  const dotNum = idx + 1;
                  const done = step.isCompleted || dotNum < step.stepNumber;
                  const current = !step.isCompleted && dotNum === step.stepNumber;
                  return (
                    <span
                      key={dotNum}
                      className={`h-1.5 rounded-full transition-all ${
                        done
                          ? 'w-2 bg-emerald-400'
                          : current
                          ? 'w-4 bg-white'
                          : 'w-1.5 bg-white/20'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-0.5 min-w-0">
              <div
                data-testid="tutorial-step-title"
                className="text-xs sm:text-[13px] font-bold text-white glass-text-crisp leading-tight"
              >
                {step.title}
              </div>
              <p className="text-[10.5px] sm:text-[11px] text-[#B4B4BE] leading-snug">
                {step.instruction}
              </p>
            </div>
          </div>

          {/* Right: Action Shortcut + Skip / Finish Button */}
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {needsStationSwitch && (
              <button
                type="button"
                data-testid="btn-tutorial-jump-station"
                onClick={() => onJumpToStation(step.targetStation)}
                className="px-2 py-1 rounded-lg hud-platinum-pill font-bold text-[10px] sm:text-[11px] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Compass className="w-3 h-3 shrink-0" strokeWidth={2.3} />
                <span>Go to {getStationShortLabel(step.targetStation)}</span>
                <ArrowRight className="w-3 h-3 shrink-0" strokeWidth={2.3} />
              </button>
            )}

            {step.isCompleted ? (
              <button
                type="button"
                data-testid="btn-tutorial-finish"
                onClick={onFinish}
                className="px-2.5 py-1 rounded-lg hud-platinum-pill font-bold text-[10px] sm:text-[11px] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Start Free Play</span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="btn-tutorial-skip"
                onClick={onSkip}
                className="px-2 py-1 rounded-lg bg-white/[0.07] hover:bg-white/[0.16] border border-white/15 text-[10px] sm:text-[11px] font-semibold text-[#D4D4D8] hover:text-white inline-flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors"
                title="Skip the first-time tutorial"
              >
                <SkipForward className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                <span>Skip</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
