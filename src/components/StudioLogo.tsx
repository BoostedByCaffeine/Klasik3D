import React, { useId } from 'react';

export const STUDIO_ICON_SVG_RAW = `<svg width="512" height="512" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="raw_badge_bg" x1="100" y1="10" x2="100" y2="190" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2C3539" />
      <stop offset="100%" stop-color="#1B2124" />
    </linearGradient>
    <linearGradient id="raw_flame_outer" x1="100" y1="142" x2="100" y2="186" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="45%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>
    <linearGradient id="raw_steam" x1="100" y1="22" x2="100" y2="68" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#FEF3C7" />
    </linearGradient>
  </defs>
  <!-- Circular Charcoal Badge with Warm Brass Rim -->
  <circle cx="100" cy="100" r="88" fill="url(#raw_badge_bg)" stroke="#F59E0B" stroke-width="5" />
  <circle cx="100" cy="100" r="78" stroke="#F59E0B" stroke-width="1.8" stroke-opacity="0.45" stroke-dasharray="14 8 4 8" />
  <!-- Swept Rocket Delta Fins -->
  <path d="M56 106 L32 130 L36 144 L66 130 Z" fill="#FFFFFF" />
  <path d="M54 114 L37 131 L40 138 L62 127 Z" fill="#F59E0B" />
  <path d="M144 106 L168 130 L164 144 L134 130 Z" fill="#FFFFFF" />
  <path d="M146 114 L163 131 L160 138 L138 127 Z" fill="#F59E0B" />
  <!-- Rocket Nozzle Bell -->
  <path d="M82 134 H118 L124 147 H76 L82 134 Z" fill="#475569" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round" />
  <!-- Afterburner Flame Plume -->
  <path d="M82 147 Q100 192 118 147 Q109 162 100 184 Q91 162 82 147 Z" fill="url(#raw_flame_outer)" />
  <path d="M89 147 Q100 174 111 147 Z" fill="#FEF9C3" />
  <!-- Cup Handle -->
  <path d="M138 82 H150 C161 82 167 90 165 101 C163 111 154 117 142 117 H132" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" fill="none" />
  <!-- Tapered Rocket-Cup Porcelain Body -->
  <path d="M52 72 H148 L136 124 C133 132 125 136 115 136 H85 C75 136 67 132 64 124 L52 72 Z" fill="#FFFFFF" />
  <!-- Aerospace Band & Porthole on Cup -->
  <path d="M57 96 H143 L140 108 H60 L57 96 Z" fill="#242B2E" />
  <circle cx="100" cy="102" r="9" fill="#F59E0B" stroke="#FFFFFF" stroke-width="2.5" />
  <!-- Espresso Rim & Golden Crema -->
  <ellipse cx="100" cy="72" rx="48" ry="11" fill="#FFFFFF" stroke="#242B2E" stroke-width="3" />
  <ellipse cx="100" cy="72" rx="41" ry="7.5" fill="#78350F" />
  <ellipse cx="100" cy="72" rx="33" ry="5" fill="#D97706" />
  <!-- Rising Steam Plumes -->
  <path d="M80 58 C73 48 87 38 80 26" stroke="url(#raw_steam)" stroke-width="5.5" stroke-linecap="round" fill="none" />
  <path d="M100 55 C92 43 108 31 100 18" stroke="url(#raw_steam)" stroke-width="6.5" stroke-linecap="round" fill="none" />
  <path d="M120 58 C113 48 127 38 120 26" stroke="url(#raw_steam)" stroke-width="5.5" stroke-linecap="round" fill="none" />
</svg>`;

export const STUDIO_LOGO_SVG_RAW = `<svg width="680" height="200" viewBox="0 0 680 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="192" y="16" width="472" height="168" rx="24" fill="#242B2E" stroke="#F59E0B" stroke-width="3" stroke-opacity="0.65" />
  <rect x="210" y="128" width="436" height="40" rx="12" fill="#FFFFFF" />
  <text x="214" y="42" fill="#FBBF24" font-family="JetBrains Mono, monospace" font-weight="700" font-size="13" letter-spacing="3.5">ROASTERY LAB · WEBGL 3D ENGINE</text>
  <text x="210" y="110" fill="#FFFFFF" font-family="Plus Jakarta Sans, Arial Black, sans-serif" font-weight="900" font-size="74" letter-spacing="3">BOOSTED</text>
  <text x="228" y="155" fill="#242B2E" font-family="Plus Jakarta Sans, Arial, sans-serif" font-weight="800" font-size="24" letter-spacing="9.5">BY CAFFEINE</text>
  <g transform="translate(0, 0)">
    <circle cx="100" cy="100" r="86" fill="#242B2E" stroke="#F59E0B" stroke-width="4.5" />
    <circle cx="100" cy="100" r="76" stroke="#F59E0B" stroke-width="1.5" stroke-opacity="0.45" stroke-dasharray="14 8 4 8" />
    <path d="M56 106 L32 130 L36 144 L66 130 Z" fill="#FFFFFF" />
    <path d="M54 114 L37 131 L40 138 L62 127 Z" fill="#F59E0B" />
    <path d="M144 106 L168 130 L164 144 L134 130 Z" fill="#FFFFFF" />
    <path d="M146 114 L163 131 L160 138 L138 127 Z" fill="#F59E0B" />
    <path d="M82 134 H118 L124 147 H76 L82 134 Z" fill="#475569" stroke="#FFFFFF" stroke-width="2" />
    <path d="M82 147 Q100 190 118 147 Q109 162 100 182 Q91 162 82 147 Z" fill="#F59E0B" />
    <path d="M89 147 Q100 172 111 147 Z" fill="#FEF08A" />
    <path d="M138 82 H150 C161 82 167 90 165 101 C163 111 154 117 142 117 H132" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" fill="none" />
    <path d="M52 72 H148 L136 124 C133 132 125 136 115 136 H85 C75 136 67 132 64 124 L52 72 Z" fill="#FFFFFF" />
    <path d="M57 96 H143 L140 108 H60 L57 96 Z" fill="#242B2E" />
    <circle cx="100" cy="102" r="9" fill="#F59E0B" stroke="#FFFFFF" stroke-width="2.5" />
    <ellipse cx="100" cy="72" rx="48" ry="11" fill="#FFFFFF" stroke="#242B2E" stroke-width="3" />
    <ellipse cx="100" cy="72" rx="41" ry="7.5" fill="#78350F" />
    <ellipse cx="100" cy="72" rx="33" ry="5" fill="#D97706" />
    <path d="M80 58 C73 48 87 38 80 26" stroke="#FDE68A" stroke-width="5.5" stroke-linecap="round" fill="none" />
    <path d="M100 55 C92 43 108 31 100 18" stroke="#F59E0B" stroke-width="6.5" stroke-linecap="round" fill="none" />
    <path d="M120 58 C113 48 127 38 120 26" stroke="#FDE68A" stroke-width="5.5" stroke-linecap="round" fill="none" />
  </g>
</svg>`;

interface StudioLogoProps {
  className?: string;
  variant?: 'full' | 'icon';
  withSteam?: boolean;
  progress?: number;
  igniting?: boolean;
  ariaLabel?: string;
}

export const StudioLogo: React.FC<StudioLogoProps> = ({
  className = 'w-44 h-auto',
  variant = 'full',
  progress,
  igniting = false,
  ariaLabel = 'BoostedByCaffeine Studios Logo',
}) => {
  const uid = useId().replace(/:/g, '');
  const isIconOnly = variant === 'icon';
  const pct = typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : 100;

  return (
    <div className="relative inline-flex items-center justify-center select-none">
      <svg
        viewBox={isIconOnly ? '6 6 188 188' : '0 0 680 200'}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} overflow-visible`}
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={`badge_bg_${uid}`} x1="100" y1="10" x2="100" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2C3539" />
            <stop offset="100%" stopColor="#1B2124" />
          </linearGradient>

          <linearGradient id={`flame_outer_${uid}`} x1="100" y1="140" x2="100" y2="192" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>

          <linearGradient id={`steam_grad_${uid}`} x1="100" y1="16" x2="100" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FEF3C7" />
          </linearGradient>

          {/* Animated Metallic Shimmer across BOOSTED Wordmark (No ugly grey clip box!) */}
          <linearGradient id={`wordmark_sheen_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="42%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#FDE68A" />
            <stop offset="58%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFFFFF" />
            <animate attributeName="x1" values="-100%;100%" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="x2" values="0%;200%" dur="2.6s" repeatCount="indefinite" />
          </linearGradient>

          <filter id={`glow_${uid}`} x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation={igniting ? '5.5' : '2.8'} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id={`emblem_clip_${uid}`}>
            <circle cx="100" cy="100" r="85" />
          </clipPath>
        </defs>

        {/* ================= RIGHT LOCKUP CHASSIS (WHEN variant="full") ================= */}
        {!isIconOnly && (
          <g>
            {/* Dark Charcoal Studio Chassis Card */}
            <rect
              x="176"
              y="16"
              width="490"
              height="168"
              rx="24"
              fill="#242B2E"
              stroke="#F59E0B"
              strokeWidth="2.8"
              strokeOpacity="0.65"
            />
            {/* Inner Subtle Tech Grid Accent Line */}
            <line x1="206" y1="50" x2="642" y2="50" stroke="#F59E0B" strokeOpacity="0.22" strokeWidth="1.5" />

            {/* Top Telemetry Header + Live Pulsing LED */}
            <circle cx="214" cy="34" r="4.5" fill="#F59E0B" filter={`url(#glow_${uid})`}>
              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.1s" repeatCount="indefinite" />
            </circle>
            <text
              x="226"
              y="38"
              fill="#FDE68A"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
              fontSize="12"
              letterSpacing="3.2"
            >
              ROASTERY LAB · {Math.round(pct)}% BOILER PRESSURE
            </text>

            {/* Animated Telemetry Equalizer Bars on Top-Right */}
            {[0, 1, 2, 3, 4].map((barIdx) => (
              <rect
                key={barIdx}
                x={608 + barIdx * 7}
                y="26"
                width="4"
                height="14"
                rx="2"
                fill="#F59E0B"
              >
                <animate
                  attributeName="height"
                  values="5;15;7;14;5"
                  dur={`${0.7 + barIdx * 0.15}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="y"
                  values="35;25;33;26;35"
                  dur={`${0.7 + barIdx * 0.15}s`}
                  repeatCount="indefinite"
                />
              </rect>
            ))}

            {/* Main "BOOSTED" Wordmark — Always 100% Crisp with Live Golden Sheen */}
            <text
              x="204"
              y="112"
              fill={`url(#wordmark_sheen_${uid})`}
              fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
              fontWeight="900"
              fontSize="74"
              letterSpacing="3.5"
            >
              BOOSTED
            </text>

            {/* Bottom Contrasting White/Crema "BY CAFFEINE" Sub-Banner Pill */}
            <rect x="204" y="128" width="440" height="40" rx="12" fill="#FFFFFF" />
            {/* Amber Progress Fill Underbar inside Pill */}
            <rect
              x="204"
              y="163"
              width={Math.max(24, (440 * pct) / 100)}
              height="5"
              rx="2.5"
              fill="#F59E0B"
            />
            <text
              x="424"
              y="155"
              textAnchor="middle"
              fill="#242B2E"
              fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
              fontWeight="800"
              fontSize="23"
              letterSpacing="9.5"
            >
              BY CAFFEINE
            </text>
          </g>
        )}

        {/* ================= ANIMATED ROCKET-COFFEE EMBLEM ================= */}
        <g>
          {/* Outer Ambient Thruster Halo */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#F59E0B"
            strokeWidth={igniting ? '4' : '1.5'}
            strokeOpacity={igniting ? '0.85' : '0.28'}
          >
            <animate attributeName="r" values="88;92;88" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.2;0.55;0.2" dur="2.2s" repeatCount="indefinite" />
          </circle>

          {/* Main Circular Charcoal Badge (#242B2E) with Warm Brass Bezel */}
          <circle
            cx="100"
            cy="100"
            r="86"
            fill={`url(#badge_bg_${uid})`}
            stroke="#F59E0B"
            strokeWidth={igniting ? '5' : '3.5'}
          />

          {/* Continuously Rotating Dashed Orbital Telemetry Ring */}
          <g>
            <circle
              cx="100"
              cy="100"
              r="76"
              stroke="#F59E0B"
              strokeWidth="1.8"
              strokeOpacity="0.5"
              strokeDasharray="16 10 4 10"
            />
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 100 100"
              to="360 100 100"
              dur={igniting ? '2.5s' : '14s'}
              repeatCount="indefinite"
            />
          </g>

          {/* Clipped Interior Containing the Floating Rocket-Cup Assembly */}
          <g clipPath={`url(#emblem_clip_${uid})`}>
            <g className={igniting ? 'bbc-cup-launch' : 'bbc-cup-assembly'}>
              {/* Native SVG Zero-G Vertical Hover + Gimbal Tilt */}
              <animateTransform
                attributeName="transform"
                type="translate"
                values={igniting ? '0 -14; 0 -10; 0 -14' : '0 3; 0 -7; 0 3'}
                dur={igniting ? '0.35s' : '2.4s'}
                repeatCount="indefinite"
              />

              {/* 1. Multi-Stage Pulsing Rocket Thruster Plume & Exhaust Sparks */}
              <g filter={`url(#glow_${uid})`}>
                {/* Outer Orange-Amber Afterburner Cone */}
                <path
                  d="M80 144 Q100 194 120 144 Q110 162 100 186 Q90 162 80 144 Z"
                  fill={`url(#flame_outer_${uid})`}
                >
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    additive="sum"
                    values="1 0.92; 1 1.18; 1 0.92"
                    dur="0.32s"
                    repeatCount="indefinite"
                  />
                </path>

                {/* Inner White-Hot Plasma Core */}
                <path d="M88 144 Q100 175 112 144 Z" fill="#FEF9C3">
                  <animate
                    attributeName="d"
                    values="M88 144 Q100 170 112 144 Z; M86 144 Q100 184 114 144 Z; M88 144 Q100 170 112 144 Z"
                    dur="0.26s"
                    repeatCount="indefinite"
                  />
                </path>

                {/* Shooting Exhaust Plasma Sparks */}
                <circle cx="100" cy="160" r="3.2" fill="#FEF08A">
                  <animate attributeName="cy" values="150;184" dur="0.55s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0" dur="0.55s" repeatCount="indefinite" />
                  <animate attributeName="r" values="3.5;1.2" dur="0.55s" repeatCount="indefinite" />
                </circle>
                <circle cx="92" cy="156" r="2.4" fill="#F59E0B">
                  <animate attributeName="cy" values="148;178" dur="0.65s" begin="0.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.95;0" dur="0.65s" begin="0.2s" repeatCount="indefinite" />
                </circle>
                <circle cx="108" cy="156" r="2.4" fill="#F59E0B">
                  <animate attributeName="cy" values="148;178" dur="0.6s" begin="0.38s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.95;0" dur="0.6s" begin="0.38s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* 2. Swept Aerodynamic Rocket Delta Fins */}
              <path d="M56 104 L30 129 L35 143 L66 128 Z" fill="#FFFFFF" />
              <path d="M54 112 L36 130 L39 137 L62 125 Z" fill="#F59E0B" />
              <path d="M144 104 L170 129 L165 143 L134 128 Z" fill="#FFFFFF" />
              <path d="M146 112 L164 130 L161 137 L138 125 Z" fill="#F59E0B" />

              {/* 3. Metallic Thruster Nozzle Bell */}
              <path
                d="M82 132 H118 L124 145 H76 L82 132 Z"
                fill="#334155"
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <line x1="80" y1="139" x2="120" y2="139" stroke="#F59E0B" strokeWidth="2" />

              {/* 4. Porcelain Barista Cup Handle */}
              <path
                d="M136 80 H149 C160 80 166 88 164 99 C162 109 153 115 141 115 H131"
                stroke="#FFFFFF"
                strokeWidth="9.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* 5. Tapered Porcelain Rocket-Cup Fuselage Body */}
              <path
                d="M52 70 H148 L135 122 C132 130 124 134 114 134 H86 C76 134 68 130 65 122 L52 70 Z"
                fill="#FFFFFF"
              />
              {/* Subtle Left Porcelain Highlight & Right Shadow */}
              <path d="M60 78 L69 120 C71 125 75 128 80 128" stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" />

              {/* Dark Charcoal Fuselage Stripe & Glowing Center Porthole */}
              <path d="M57 94 H143 L140 106 H60 L57 94 Z" fill="#242B2E" />
              <circle cx="100" cy="100" r="8.5" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2.5">
                <animate attributeName="r" values="8;9.5;8" dur="1.6s" repeatCount="indefinite" />
              </circle>

              {/* 6. Cup Rim & Swirling Golden Espresso Crema */}
              <ellipse cx="100" cy="70" rx="48" ry="11" fill="#FFFFFF" stroke="#242B2E" strokeWidth="3" />
              <ellipse cx="100" cy="70" rx="41" ry="7.5" fill="#451A03" />
              <ellipse cx="100" cy="70" rx="32" ry="5" fill="#D97706">
                <animate attributeName="rx" values="30;34;30" dur="2.0s" repeatCount="indefinite" />
              </ellipse>

              {/* 7. Three Animated Rising S-Curve Steam Plumes */}
              <g filter={`url(#glow_${uid})`}>
                <path
                  d="M79 56 C72 46 86 36 79 24"
                  stroke={`url(#steam_grad_${uid})`}
                  strokeWidth="5"
                  strokeLinecap="round"
                  fill="none"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0 4; -2 -6; 0 4"
                    dur="2.1s"
                    repeatCount="indefinite"
                  />
                  <animate attributeName="opacity" values="0.45;1;0.45" dur="2.1s" repeatCount="indefinite" />
                </path>

                <path
                  d="M100 53 C91 41 109 29 100 15"
                  stroke={`url(#steam_grad_${uid})`}
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0 5; 2 -7; 0 5"
                    dur="1.8s"
                    begin="0.4s"
                    repeatCount="indefinite"
                  />
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" begin="0.4s" repeatCount="indefinite" />
                </path>

                <path
                  d="M121 56 C114 46 128 36 121 24"
                  stroke={`url(#steam_grad_${uid})`}
                  strokeWidth="5"
                  strokeLinecap="round"
                  fill="none"
                >
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0 4; 2 -6; 0 4"
                    dur="2.3s"
                    begin="0.8s"
                    repeatCount="indefinite"
                  />
                  <animate attributeName="opacity" values="0.45;0.95;0.45" dur="2.3s" begin="0.8s" repeatCount="indefinite" />
                </path>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};
