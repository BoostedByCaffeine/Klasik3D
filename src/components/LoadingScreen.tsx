import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface LoadingScreenProps {
  /** Resolves true once the 3D scene / WebGL assets finish initial boot */
  isReady?: boolean;
  /** Fires at 1350ms once the entrance animation finishes so WebGL boot can begin without blocking 60 FPS entrance */
  onEntranceComplete?: () => void;
  /** Called right as the opaque backdrop starts fading out so the 3D scene can reveal smoothly */
  onStartFade?: () => void;
  /** Called once the splash screen has fully faded out and unmounted */
  onComplete: () => void;
}

const ENTRANCE_SETTLE_MS = 1350;
const MIN_SPLASH_MS = 2350;
const FAILSAFE_TIMEOUT_MS = 6000;
const HALO_DIM_MS = 180;
const FADE_OUT_FAILSAFE_MS = 650;

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isReady = true,
  onEntranceComplete,
  onStartFade,
  onComplete,
}) => {
  const uid = useId().replace(/:/g, '');
  const [minTimerElapsed, setMinTimerElapsed] = useState(false);
  const [failsafeElapsed, setFailsafeElapsed] = useState(false);
  const [exitStage, setExitStage] = useState<'idle' | 'dim' | 'fade'>('idle');
  const [unmounted, setUnmounted] = useState(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onStartFadeRef = useRef(onStartFade);
  const onEntranceCompleteRef = useRef(onEntranceComplete);
  onCompleteRef.current = onComplete;
  onStartFadeRef.current = onStartFade;
  onEntranceCompleteRef.current = onEntranceComplete;

  const finishAndUnmount = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setUnmounted(true);
    onCompleteRef.current();
  }, []);

  // 1. Entrance settle trigger (1350ms) + guaranteed minimum display timer + fail-safe anti-soft-lock timer
  useEffect(() => {
    const entranceTimer = window.setTimeout(() => {
      onEntranceCompleteRef.current?.();
    }, ENTRANCE_SETTLE_MS);

    const minTimer = window.setTimeout(() => {
      setMinTimerElapsed(true);
    }, MIN_SPLASH_MS);

    const failsafeTimer = window.setTimeout(() => {
      setFailsafeElapsed(true);
    }, FAILSAFE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(entranceTimer);
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

  // 3. Staggered Exit Stage A -> Step B (dim halo/thruster for 180ms, then crossfade backdrop)
  useEffect(() => {
    if (exitStage !== 'dim') return;

    const fadeTimer = window.setTimeout(() => {
      onStartFadeRef.current?.();
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

  const splashNode = (
    <div
      data-testid="crema-ring-splash"
      className={backdropClass}
      onTransitionEnd={handleBackdropTransitionEnd}
      role="status"
      aria-live="polite"
      aria-label="BoostedByCaffeine Studios"
    >
      <div className="crema-splash-lockup">
        {/* Brushed Platinum Rocket-Coffee Emblem + Subtle Graphite Spotlight */}
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
              {/* Brushed Platinum Metallic Ring & Cup Gradient */}
              <linearGradient
                id={`plat_ring_grad_${uid}`}
                x1="18"
                y1="14"
                x2="184"
                y2="186"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#F8FAFC" />
                <stop offset="32%" stopColor="#94A3B8" />
                <stop offset="66%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#64748B" />
              </linearGradient>

              <linearGradient
                id={`plat_body_grad_${uid}`}
                x1="44"
                y1="62"
                x2="156"
                y2="142"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#F8FAFC" />
                <stop offset="28%" stopColor="#FFFFFF" />
                <stop offset="56%" stopColor="#CBD5E1" />
                <stop offset="82%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#64748B" />
              </linearGradient>

              <linearGradient
                id={`plat_fin_grad_${uid}`}
                x1="32"
                y1="104"
                x2="168"
                y2="142"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#CBD5E1" />
                <stop offset="50%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#64748B" />
              </linearGradient>

              <linearGradient
                id={`plat_flame_grad_${uid}`}
                x1="100"
                y1="142"
                x2="100"
                y2="188"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="46%" stopColor="#CBD5E1" />
                <stop offset="100%" stopColor="#64748B" stopOpacity="0.35" />
              </linearGradient>

              <radialGradient id={`plat_flame_glow_${uid}`} cx="50%" cy="45%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.42" />
                <stop offset="55%" stopColor="#94A3B8" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#09090B" stopOpacity="0" />
              </radialGradient>

              <linearGradient
                id={`plat_steam_grad_${uid}`}
                x1="100"
                y1="56"
                x2="100"
                y2="16"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#71717A" />
                <stop offset="55%" stopColor="#CBD5E1" />
                <stop offset="100%" stopColor="#FFFFFF" />
              </linearGradient>

              {/* Diagonal Brushed-Metal Micro-Lines (-25deg) */}
              <pattern
                id={`plat_brushed_${uid}`}
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(-25)"
              >
                <line x1="0" y1="0" x2="0" y2="6" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.24" />
                <line x1="3" y1="0" x2="3" y2="6" stroke="#09090B" strokeWidth="0.6" opacity="0.18" />
              </pattern>

              {/* Animated Specular Sheen Sweep */}
              <linearGradient
                id={`plat_sheen_grad_${uid}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.52" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>

              <clipPath id={`plat_cup_clip_${uid}`}>
                <path d="M52 70 H148 L135 122 C132 130 124 134 114 134 H86 C76 134 68 130 65 122 L52 70 Z" />
              </clipPath>
            </defs>

            {/* 1. Outer Brushed Platinum Ring (Draws 360° clockwise from 12 o'clock) */}
            <circle
              className="crema-ring"
              cx="100"
              cy="100"
              r="86"
              stroke={`url(#plat_ring_grad_${uid})`}
              strokeWidth="3.8"
              strokeLinecap="round"
              fill="none"
            />
            <circle
              cx="100"
              cy="100"
              r="79.5"
              stroke="#52525B"
              strokeWidth="0.9"
              strokeOpacity="0.55"
              fill="none"
              className="rocket-cup"
            />

            {/* 2. Brushed Platinum Rocket-Coffee Cup Silhouette with Fins + Nozzle */}
            <g className="rocket-cup">
              {/* Swept Delta Fins */}
              <path d="M56 104 L32 128 L36 142 L66 128 Z" fill={`url(#plat_body_grad_${uid})`} />
              <path d="M54 112 L38 129 L41 136 L62 125 Z" fill={`url(#plat_fin_grad_${uid})`} />
              <path d="M144 104 L168 128 L164 142 L134 128 Z" fill={`url(#plat_body_grad_${uid})`} />
              <path d="M146 112 L162 129 L159 136 L138 125 Z" fill={`url(#plat_fin_grad_${uid})`} />

              {/* Rocket Thruster Nozzle */}
              <path
                d="M82 132 H118 L124 145 H76 L82 132 Z"
                fill="#18181B"
                stroke="#CBD5E1"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* Barista Cup Handle */}
              <path
                d="M136 80 H149 C160 80 166 88 164 99 C162 109 153 115 141 115 H131"
                stroke={`url(#plat_body_grad_${uid})`}
                strokeWidth="9.2"
                strokeLinecap="round"
                fill="none"
              />

              {/* Tapered Metallic Platinum Rocket-Cup Body */}
              <path
                d="M52 70 H148 L135 122 C132 130 124 134 114 134 H86 C76 134 68 130 65 122 L52 70 Z"
                fill={`url(#plat_body_grad_${uid})`}
              />
              {/* Brushed Metal Micro-Line Texture Overlay */}
              <path
                d="M52 70 H148 L135 122 C132 130 124 134 114 134 H86 C76 134 68 130 65 122 L52 70 Z"
                fill={`url(#plat_brushed_${uid})`}
              />

              {/* Animated Specular Sheen Pass across the Rocket-Coffee Body */}
              <g clipPath={`url(#plat_cup_clip_${uid})`}>
                <rect
                  className="platinum-sheen-sweep"
                  x="-40"
                  y="58"
                  width="46"
                  height="90"
                  transform="skewX(-24)"
                  fill={`url(#plat_sheen_grad_${uid})`}
                />
              </g>

              {/* Matte-Black Aerospace Band & Brushed Platinum Porthole */}
              <path d="M57 94 H143 L140 106 H60 L57 94 Z" fill="#09090B" />
              <circle
                cx="100"
                cy="100"
                r="8.2"
                fill={`url(#plat_ring_grad_${uid})`}
                stroke="#F8FAFC"
                strokeWidth="2.1"
              />
              <circle cx="100" cy="100" r="3.4" fill="#09090B" />

              {/* Cup Rim & Dark Espresso Surface with Silver Specular Ring */}
              <ellipse
                cx="100"
                cy="70"
                rx="48"
                ry="11"
                fill={`url(#plat_body_grad_${uid})`}
                stroke="#09090B"
                strokeWidth="2.8"
              />
              <ellipse cx="100" cy="70" rx="41" ry="7.4" fill="#09090B" />
              <ellipse
                cx="100"
                cy="70"
                rx="32"
                ry="4.5"
                fill="#18181B"
                stroke="#A1A1AA"
                strokeWidth="1.2"
                strokeOpacity="0.6"
              />
            </g>

            {/* 3. Silver-White Plasma Thruster Flame + Subtle Radial Glow */}
            <g className="thruster-flame">
              <circle cx="100" cy="162" r="26" fill={`url(#plat_flame_glow_${uid})`} />
              <path
                d="M81 145 Q100 190 119 145 Q109 162 100 183 Q91 162 81 145 Z"
                fill={`url(#plat_flame_grad_${uid})`}
              />
              <path d="M89 145 Q100 172 111 145 Z" fill="#FFFFFF" />
            </g>

            {/* 4. Three Staggered Rising Silver-Platinum Steam Waves */}
            <path
              className="steam-wave-1"
              pathLength={1}
              d="M79 56 C72 46 86 36 79 24"
              stroke={`url(#plat_steam_grad_${uid})`}
              strokeWidth="4.4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              className="steam-wave-2"
              pathLength={1}
              d="M100 53 C91 41 109 29 100 16"
              stroke={`url(#plat_steam_grad_${uid})`}
              strokeWidth="5.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              className="steam-wave-3"
              pathLength={1}
              d="M121 56 C114 46 128 36 121 24"
              stroke={`url(#plat_steam_grad_${uid})`}
              strokeWidth="4.4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        {/* Modern Wide-Tracked Plus Jakarta Sans Studio Wordmark */}
        <div className="crema-wordmark-stack">
          <h1 className="crema-wordmark-boosted">BOOSTEDBYCAFFEINE</h1>
          <p className="crema-wordmark-sub">STUDIOS</p>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(splashNode, document.body);
  }
  return splashNode;
};
