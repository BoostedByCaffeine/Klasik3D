import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

interface LoadingScreenProps {
  /** Resolves true once the 3D scene / WebGL assets finish initial boot */
  isReady?: boolean;
  /** Called once the splash screen has fully faded out and unmounted */
  onComplete: () => void;
}

const MIN_SPLASH_MS = 2350;
const FAILSAFE_TIMEOUT_MS = 6000;
const HALO_DIM_MS = 180;
const FADE_OUT_FAILSAFE_MS = 650;

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isReady = true,
  onComplete,
}) => {
  const uid = useId().replace(/:/g, '');
  const [minTimerElapsed, setMinTimerElapsed] = useState(false);
  const [failsafeElapsed, setFailsafeElapsed] = useState(false);
  const [exitStage, setExitStage] = useState<'idle' | 'dim' | 'fade'>('idle');
  const [unmounted, setUnmounted] = useState(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finishAndUnmount = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setUnmounted(true);
    onCompleteRef.current();
  }, []);

  // 1. Guaranteed minimum display timer + fail-safe anti-soft-lock timer
  useEffect(() => {
    const minTimer = window.setTimeout(() => {
      setMinTimerElapsed(true);
    }, MIN_SPLASH_MS);

    const failsafeTimer = window.setTimeout(() => {
      setFailsafeElapsed(true);
    }, FAILSAFE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(failsafeTimer);
    };
  }, []);

  // 2. Dual-Gate Exit Trigger (requires BOTH minTimer + isReady, or fail-safe)
  useEffect(() => {
    if (exitStage !== 'idle') return;
    const readyToExit = (minTimerElapsed && isReady) || failsafeElapsed;
    if (!readyToExit) return;

    setExitStage('dim');
  }, [minTimerElapsed, isReady, failsafeElapsed, exitStage]);

  // 3. Staggered Exit Stage A -> Step B (dim halo/thruster for 180ms, then fade backdrop)
  useEffect(() => {
    if (exitStage !== 'dim') return;

    const fadeTimer = window.setTimeout(() => {
      setExitStage('fade');
    }, HALO_DIM_MS);

    return () => {
      window.clearTimeout(fadeTimer);
    };
  }, [exitStage]);

  // 4. Fail-safe unmount timer in case transitionend is skipped (e.g., reduced motion / hidden tab)
  useEffect(() => {
    if (exitStage !== 'fade') return;

    const cleanupFallback = window.setTimeout(() => {
      finishAndUnmount();
    }, FADE_OUT_FAILSAFE_MS);

    return () => {
      window.clearTimeout(cleanupFallback);
    };
  }, [exitStage, finishAndUnmount]);

  const handleBackdropTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.propertyName === 'opacity' && exitStage === 'fade') {
      finishAndUnmount();
    }
  };

  if (unmounted) return null;

  const backdropClass = [
    'crema-splash-backdrop',
    exitStage === 'dim' ? 'is-exiting-dim' : '',
    exitStage === 'fade' ? 'is-exiting-dim is-exiting-fade' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      data-testid="crema-ring-splash"
      className={backdropClass}
      onTransitionEnd={handleBackdropTransitionEnd}
      role="status"
      aria-live="polite"
      aria-label="Boosted By Caffeine"
    >
      <div className="crema-splash-lockup">
        {/* Circular Rocket-Coffee Emblem + Restrained Ambient Glow */}
        <div className="crema-emblem-wrap">
          <div className="crema-ambient-halo" aria-hidden="true" />
          <svg
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`crema_ring_grad_${uid}`} x1="20" y1="18" x2="180" y2="182" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="50%" stopColor="#E59A3C" />
                <stop offset="100%" stopColor="#B4691E" />
              </linearGradient>

              <linearGradient id={`crema_flame_grad_${uid}`} x1="100" y1="142" x2="100" y2="188" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="48%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#EA580C" />
              </linearGradient>

              <linearGradient id={`crema_steam_grad_${uid}`} x1="100" y1="56" x2="100" y2="16" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#C8924A" />
                <stop offset="100%" stopColor="#FEF3C7" />
              </linearGradient>
            </defs>

            {/* 1. Outer Amber Crema Ring (Draws 360° clockwise from 12 o'clock) */}
            <circle
              className="crema-ring"
              cx="100"
              cy="100"
              r="86"
              stroke={`url(#crema_ring_grad_${uid})`}
              strokeWidth="4.2"
              strokeLinecap="round"
              fill="none"
            />

            {/* 2. White Rocket-Cup Silhouette with Fins + Nozzle */}
            <g className="rocket-cup">
              {/* Swept Delta Fins */}
              <path d="M56 104 L32 128 L36 142 L66 128 Z" fill="#F5F0E8" />
              <path d="M54 112 L38 129 L41 136 L62 125 Z" fill="#E59A3C" />
              <path d="M144 104 L168 128 L164 142 L134 128 Z" fill="#F5F0E8" />
              <path d="M146 112 L162 129 L159 136 L138 125 Z" fill="#E59A3C" />

              {/* Rocket Thruster Nozzle */}
              <path
                d="M82 132 H118 L124 145 H76 L82 132 Z"
                fill="#242B2E"
                stroke="#F5F0E8"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* Barista Cup Handle */}
              <path
                d="M136 80 H149 C160 80 166 88 164 99 C162 109 153 115 141 115 H131"
                stroke="#F5F0E8"
                strokeWidth="9.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Tapered Porcelain Rocket-Cup Body */}
              <path
                d="M52 70 H148 L135 122 C132 130 124 134 114 134 H86 C76 134 68 130 65 122 L52 70 Z"
                fill="#F5F0E8"
              />

              {/* Charcoal Aerospace Band & Brass Porthole */}
              <path d="M57 94 H143 L140 106 H60 L57 94 Z" fill="#1A1613" />
              <circle cx="100" cy="100" r="8.2" fill="#E59A3C" stroke="#F5F0E8" strokeWidth="2.4" />

              {/* Cup Rim & Warm Espresso Crema */}
              <ellipse cx="100" cy="70" rx="48" ry="11" fill="#F5F0E8" stroke="#1A1613" strokeWidth="3" />
              <ellipse cx="100" cy="70" rx="41" ry="7.5" fill="#451A03" />
              <ellipse cx="100" cy="70" rx="32" ry="4.8" fill="#D97706" />
            </g>

            {/* 3. Warm Amber Thruster Flame */}
            <g className="thruster-flame">
              <path
                d="M81 145 Q100 190 119 145 Q109 162 100 183 Q91 162 81 145 Z"
                fill={`url(#crema_flame_grad_${uid})`}
              />
              <path d="M89 145 Q100 172 111 145 Z" fill="#FEF9C3" />
            </g>

            {/* 4. Three Staggered Rising Amber Steam Waves (drawn bottom-to-top) */}
            <path
              className="steam-wave-1"
              pathLength={1}
              d="M79 56 C72 46 86 36 79 24"
              stroke={`url(#crema_steam_grad_${uid})`}
              strokeWidth="4.8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              className="steam-wave-2"
              pathLength={1}
              d="M100 53 C91 41 109 29 100 16"
              stroke={`url(#crema_steam_grad_${uid})`}
              strokeWidth="5.6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              className="steam-wave-3"
              pathLength={1}
              d="M121 56 C114 46 128 36 121 24"
              stroke={`url(#crema_steam_grad_${uid})`}
              strokeWidth="4.8"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        {/* Remastered Clean Wordmark (Zero Cards, Zero Pills) */}
        <div className="crema-wordmark-stack">
          <h1 className="crema-wordmark-boosted">BOOSTED</h1>
          <p className="crema-wordmark-sub">BY CAFFEINE</p>
        </div>
      </div>
    </div>
  );
};
