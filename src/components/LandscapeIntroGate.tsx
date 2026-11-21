import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface LandscapeIntroGateProps {
  /** Called cleanly at 1000ms to hand off seamlessly onto the #090705 studio splash */
  onComplete: () => void;
}

const CONTENT_FADE_START_MS = 800;
const TOTAL_DURATION_MS = 1000;

export const LandscapeIntroGate: React.FC<LandscapeIntroGateProps> = ({ onComplete }) => {
  const [fadingContent, setFadingContent] = useState(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const tryLockLandscape = () => {
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (mode: string) => Promise<void>;
      };
      orientation?.lock?.('landscape')?.catch(() => {});
    } catch {
      // Non-fullscreen or unsupported browser — silently ignore
    }
  };

  useEffect(() => {
    tryLockLandscape();

    const fadeTimer = window.setTimeout(() => {
      setFadingContent(true);
    }, CONTENT_FADE_START_MS);

    const completeTimer = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      onCompleteRef.current();
    }, TOTAL_DURATION_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(completeTimer);
    };
  }, []);

  const content = (
    <div
      data-testid="landscape-intro-gate"
      className={`landscape-intro-gate${fadingContent ? ' is-fading' : ''}`}
      onClick={tryLockLandscape}
      role="status"
      aria-live="polite"
      aria-label="Turn your phone into landscape. Klasik 3D is designed for landscape play."
    >
      <div className="landscape-intro-inner">
        <div className="landscape-phone-stage" aria-hidden="true">
          {/* Subtle curved directional rotation arrow */}
          <svg
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="landscape-arrow-ring"
          >
            <path
              d="M 28 42 A 38 38 0 0 1 78 24"
              stroke="#CBD5E1"
              strokeOpacity="0.65"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
            <path
              d="M 22 36 L 28 44 L 36 39"
              stroke="#E4E4E7"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Animated minimalist brushed-platinum phone outline rotating 0deg -> -90deg */}
          <svg
            viewBox="0 0 64 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="landscape-phone-icon"
          >
            <rect
              x="8"
              y="6"
              width="48"
              height="84"
              rx="10"
              stroke="#E4E4E7"
              strokeWidth="3.2"
              fill="#18181B"
            />
            <line
              x1="24"
              y1="14"
              x2="40"
              y2="14"
              stroke="#A1A1AA"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <rect
              x="14"
              y="21"
              width="36"
              height="54"
              rx="3"
              stroke="#E4E4E7"
              strokeOpacity="0.32"
              strokeWidth="1.5"
            />
            <circle cx="32" cy="82" r="2.8" fill="#E4E4E7" />
          </svg>
        </div>

        <p className="landscape-intro-headline">Turn your phone into landscape</p>
        <p className="landscape-intro-sub">Klasik 3D is designed for landscape play</p>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }
  return content;
};
