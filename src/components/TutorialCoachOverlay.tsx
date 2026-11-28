import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { BaristaStationId } from '../game/rules';
import { TutorialStepGuide, getStationShortLabel } from '../game/onboarding';

interface TutorialCoachOverlayProps {
  step: TutorialStepGuide;
  activeStation: BaristaStationId;
  onJumpToStation: (station: BaristaStationId) => void;
  onSkip: () => void;
  onFinish: () => void;
}

/**
 * Detects Android APK WebViews, iOS phones/Safari, and compact mobile viewports
 * while strictly keeping standard desktop viewports (>= 1024px wide, > 540px tall, fine pointer)
 * on the full desktop floating coach card.
 */
function detectCompactMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const capacitorNative = Boolean(
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  );
  if (capacitorNative) return true;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isMobileUa = /Android|iPhone|iPod|iPad|Mobile/i.test(ua);
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const narrowOrShort = window.innerWidth < 1024 || window.innerHeight <= 540;
  return isMobileUa || (coarsePointer && narrowOrShort) || window.innerWidth < 768 || window.innerHeight <= 520;
}

export const TutorialCoachOverlay: React.FC<TutorialCoachOverlayProps> = ({
  step,
  activeStation,
  onJumpToStation,
  onSkip,
  onFinish,
}) => {
  const needsStationSwitch = !step.isCompleted && activeStation !== step.targetStation;
  const [isCompactMobile, setIsCompactMobile] = useState<boolean>(() =>
    detectCompactMobileViewport()
  );
  const [mobileExpanded, setMobileExpanded] = useState<boolean>(false);

  useEffect(() => {
    const syncViewport = () => setIsCompactMobile(detectCompactMobileViewport());
    syncViewport();
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
    };
  }, []);

  // Collapse the mobile popover cleanly whenever the step advances (unless tutorial completed)
  useEffect(() => {
    if (isCompactMobile && !step.isCompleted) {
      setMobileExpanded(false);
    }
  }, [isCompactMobile, step.stepId, step.isCompleted]);

  // === MOBILE (Android APK, iOS Safari/phones, mobile browsers): Compact Collapsible Top-Left Badge ===
  if (isCompactMobile) {
    return (
      <div
        data-testid="tutorial-coach-overlay"
        data-tutorial-mode="mobile-compact"
        className="pointer-events-none absolute left-2 top-[52px] z-30 flex flex-col items-start gap-1.5 max-w-[min(300px,calc(100vw-16px))]"
        style={{
          left: 'max(8px, var(--safe-left, 0px))',
          top: 'calc(max(8px, var(--safe-top, 0px)) + 44px)',
        }}
      >
        {/* Ultra-compact top-left collapsible badge leaving 3D espresso bar completely unobstructed */}
        <div
          className={`pointer-events-auto inline-flex items-center gap-1 rounded-xl backdrop-blur-md border shadow-[0_10px_28px_-8px_rgba(0,0,0,0.85)] px-1.5 py-1 transition-all ${
            step.isCompleted
              ? 'bg-[#09090B]/92 border-emerald-400/50 text-white'
              : step.isError
              ? 'bg-[#1a0b0e]/92 border-rose-400/50 text-white'
              : 'bg-[#09090B]/88 border-white/22 text-white'
          }`}
        >
          <button
            type="button"
            data-testid="btn-tutorial-mobile-toggle"
            onClick={() => setMobileExpanded((prev) => !prev)}
            aria-expanded={mobileExpanded}
            className="min-h-[32px] px-1.5 flex items-center gap-1.5 text-left cursor-pointer min-w-0"
          >
            <span
              data-testid="tutorial-step-counter"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                step.isCompleted
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'bg-white/12 text-white'
              }`}
            >
              {step.isCompleted ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-300" strokeWidth={2.4} />
              ) : null}
              <span>{step.isCompleted ? 'Done' : `${step.stepNumber}/${step.totalSteps}`}</span>
            </span>

            <span
              data-testid="tutorial-step-title"
              className="text-[11px] font-semibold text-white truncate max-w-[132px]"
            >
              {step.title}
            </span>

            {mobileExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-300 shrink-0" strokeWidth={2.2} />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-300 shrink-0" strokeWidth={2.2} />
            )}
          </button>

          {needsStationSwitch && (
            <button
              type="button"
              data-testid="btn-tutorial-jump-station"
              onClick={() => {
                onJumpToStation(step.targetStation);
                setMobileExpanded(false);
              }}
              className="min-h-[32px] px-2 rounded-lg hud-platinum-pill font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Go</span>
              <ArrowRight className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
            </button>
          )}

          {step.isCompleted ? (
            <button
              type="button"
              data-testid="btn-tutorial-finish"
              onClick={onFinish}
              className="min-h-[32px] px-2 rounded-lg hud-platinum-pill font-bold text-[10px] inline-flex items-center cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Play</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="btn-tutorial-skip"
              onClick={onSkip}
              aria-label="Skip tutorial"
              className="min-h-[32px] px-2 rounded-lg bg-white/[0.08] active:bg-white/[0.2] border border-white/15 text-[10px] font-semibold text-zinc-200 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Skip</span>
            </button>
          )}
        </div>

        {/* Expanded compact detail popover anchored strictly at top-left */}
        {mobileExpanded && (
          <div
            data-testid="tutorial-mobile-popover"
            className="pointer-events-auto w-[min(276px,calc(100vw-20px))] rounded-xl bg-[#09090B]/94 backdrop-blur-xl border border-white/20 shadow-[0_16px_38px_-10px_rgba(0,0,0,0.9)] px-3 py-2.5 text-white space-y-2"
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-300">
              <span>
                {step.isCompleted
                  ? 'First Shift Complete'
                  : `Step ${step.stepNumber} of ${step.totalSteps}`}
              </span>
              {!step.isCompleted && (
                <span className="text-emerald-300">Patience Paused</span>
              )}
            </div>

            <p className="text-[11.5px] leading-snug text-zinc-200">{step.instruction}</p>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              {needsStationSwitch ? (
                <button
                  type="button"
                  onClick={() => {
                    onJumpToStation(step.targetStation);
                    setMobileExpanded(false);
                  }}
                  className="min-h-[34px] px-2.5 rounded-lg hud-platinum-pill font-bold text-[10.5px] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Compass className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                  <span>Go to {getStationShortLabel(step.targetStation)}</span>
                </button>
              ) : (
                <span className="text-[10px] text-zinc-400">Tap badge to hide</span>
              )}

              {step.isCompleted ? (
                <button
                  type="button"
                  onClick={onFinish}
                  className="min-h-[34px] px-3 rounded-lg hud-platinum-pill font-bold text-[10.5px] cursor-pointer"
                >
                  Start Free Play
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSkip}
                  className="min-h-[34px] px-2.5 rounded-lg bg-white/[0.08] border border-white/15 text-[10.5px] font-semibold text-zinc-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  <SkipForward className="w-3 h-3" strokeWidth={2.2} />
                  <span>Skip Guide</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // === DESKTOP (Excluded from mobile compact redesign — preserved identically!) ===
  return (
    <div
      data-testid="tutorial-coach-overlay"
      data-tutorial-mode="desktop"
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
