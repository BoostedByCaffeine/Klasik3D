import React, { useEffect, useState } from 'react';
import { Coffee, FastForward } from 'lucide-react';
import { AppRuntimeVersion } from '../pwa/pwaManager';
import { StudioLogo } from './StudioLogo';

interface LoadingScreenProps {
  appVersion?: AppRuntimeVersion;
  onFinished: () => void;
}

const LOADING_STEPS = [
  'Grinding Procedural 3D Meshes & Walnut Grain...',
  'Heating Dual Boilers to 93°C & Compiling PBR Shaders...',
  'Syncing 33.3 RPM Vinyl Turntable & Studio Emblem...',
  'Opening Garage Garden Pergola...',
];

const WEB_BARISTA_TIPS = [
  'Tip: Click any hanging order ticket or press Space to execute the next recommended barista step.',
  'Tip: Press M anytime to drop or lift the 3D vinyl turntable needle.',
  'Tip: Customers who receive 100% accurate drinks sit in the Garage Garden and leave bonus tips!',
  'Tip: Press 1–5 or A/D to glide smoothly between the five barista stations.',
];

const APK_BARISTA_TIPS = [
  'Tip: Tap any hanging order ticket or touch the 3D espresso bar equipment to brew step by step.',
  'Tip: Tap the 3D vinyl turntable needle at Station 5 to spin records and sync Phone Spotify.',
  'Tip: Customers who receive 100% accurate drinks sit in the Garage Garden and leave bonus tips!',
  'Tip: Enable Realism Mode in the top Menu to rely purely on the Recipe Codex and 3D tools.',
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  appVersion = 'web',
  onFinished,
}) => {
  const [progress, setProgress] = useState(12);
  const [tipIndex, setTipIndex] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  const tips = appVersion === 'apk' ? APK_BARISTA_TIPS : WEB_BARISTA_TIPS;

  useEffect(() => {
    const tipTimer = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 1800);

    const progTimer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(progTimer);
          setFadingOut(true);
          window.setTimeout(onFinished, 350);
          return 100;
        }
        return Math.min(100, prev + 4.5);
      });
    }, 115);

    return () => {
      window.clearInterval(tipTimer);
      window.clearInterval(progTimer);
    };
  }, [onFinished, tips.length]);

  const stepIndex = Math.min(
    LOADING_STEPS.length - 1,
    Math.floor((progress / 100) * LOADING_STEPS.length)
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#140e0b] px-6 py-10 text-[#f5ebe1] transition-opacity duration-300 overflow-hidden ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-label="Loading Klasik 3D Garage Garden Cafe"
    >
      {/* Ambient radial espresso-gold spotlight behind centerpiece */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.14)_0%,rgba(20,14,11,0)_68%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 text-xs tracking-widest text-amber-300/80 font-mono flex items-center gap-1.5">
        <Coffee className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>BOOSTED BY CAFFEINE STUDIOS · WEBGL 3D ENGINE</span>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center gap-6">
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#231812] to-[#140e0b] border border-amber-500/40 shadow-[0_0_50px_-12px_rgba(245,158,11,0.35)]">
          <StudioLogo
            variant="full"
            progress={progress}
            className="w-72 sm:w-96 h-auto"
          />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-amber-100 tracking-tight">
            Brewing Shaders &amp; Warming Boilers...
          </h1>
          <p className="text-sm text-amber-200/80 font-medium">{LOADING_STEPS[stepIndex]}</p>
        </div>

        {/* Espresso Shot Glass Progress Bar */}
        <div className="w-full space-y-2">
          <div className="relative h-5 w-full overflow-hidden rounded-lg bg-[#241913] border border-amber-500/30 p-0.5">
            <div
              className="h-full rounded-md bg-gradient-to-r from-[#5c2c16] via-[#b45309] to-[#f59e0b] transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-mono tabular-nums text-amber-300/90">
            <span>9.0 BAR EXTRACTION</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        <button
          type="button"
          data-testid="btn-skip-loading"
          onClick={onFinished}
          className="text-xs text-stone-400 hover:text-amber-300 underline transition-colors cursor-pointer inline-flex items-center gap-1"
        >
          <FastForward className="w-3.5 h-3.5 shrink-0" />
          <span>Skip Preloader</span>
        </button>
      </div>

      <div className="max-w-lg text-center text-xs text-stone-400">{tips[tipIndex]}</div>
    </div>
  );
};
