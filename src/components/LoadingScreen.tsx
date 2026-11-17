import React, { useEffect, useState } from 'react';
import { StudioLogo } from './StudioLogo';

interface LoadingScreenProps {
  onFinished: () => void;
}

const LOADING_STEPS = [
  'Grinding Procedural 3D Meshes & Walnut Grain...',
  'Heating Dual Boilers to 93°C & Compiling PBR Shaders...',
  'Syncing 33.3 RPM Vinyl Turntable & Studio Emblem...',
  'Opening Garage Garden Pergola...',
];

const BARISTA_TIPS = [
  'Tip: Click any hanging order ticket or press Space to execute the next recommended barista step.',
  'Tip: Press M anytime to drop or lift the 3D vinyl turntable needle.',
  'Tip: Customers who receive 100% accurate drinks sit in the Garage Garden and leave bonus tips!',
  'Tip: Press 1–5 or A/D to glide smoothly between the five barista stations.',
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinished }) => {
  const [progress, setProgress] = useState(18);
  const [tipIndex, setTipIndex] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const tipTimer = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % BARISTA_TIPS.length);
    }, 1800);

    const progTimer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(progTimer);
          setFadingOut(true);
          window.setTimeout(onFinished, 320);
          return 100;
        }
        return Math.min(100, prev + 28);
      });
    }, 180);

    return () => {
      window.clearInterval(tipTimer);
      window.clearInterval(progTimer);
    };
  }, [onFinished]);

  const stepIndex = Math.min(
    LOADING_STEPS.length - 1,
    Math.floor((progress / 100) * LOADING_STEPS.length)
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#140e0b] px-6 py-10 text-[#f5ebe1] transition-opacity duration-300 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-label="Loading Klasik 3D Garage Garden Cafe"
    >
      <div className="text-xs tracking-widest text-amber-300/80 font-mono">
        BOOSTED BY CAFFEINE STUDIOS · WEBGL 3D ENGINE
      </div>

      <div className="flex flex-col items-center max-w-md w-full text-center gap-6">
        <div className="p-5 rounded-2xl bg-[#1e1510] border border-amber-500/25 shadow-2xl">
          <StudioLogo className="w-64 sm:w-72 h-auto" withSteam={true} />
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
          onClick={onFinished}
          className="text-xs text-stone-400 hover:text-amber-300 underline transition-colors cursor-pointer"
        >
          Skip Preloader
        </button>
      </div>

      <div className="max-w-lg text-center text-xs text-stone-400">
        {BARISTA_TIPS[tipIndex]}
      </div>
    </div>
  );
};
