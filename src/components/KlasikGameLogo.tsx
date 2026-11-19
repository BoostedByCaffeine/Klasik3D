import React, { useId } from 'react';

interface KlasikGameLogoProps {
  className?: string;
  ariaLabel?: string;
}

export const KlasikGameLogo: React.FC<KlasikGameLogoProps> = ({
  className = 'w-12 h-12 sm:w-14 sm:h-14 shrink-0',
  ariaLabel = 'Klasik 3D Garage Garden Cafe Emblem',
}) => {
  const uid = useId().replace(/:/g, '');

  return (
    <div
      data-testid="klasik-game-logo"
      className={`relative inline-flex items-center justify-center select-none ${className}`}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          {/* Outer Brushed Brass Rim */}
          <linearGradient id={`brass_rim_${uid}`} x1="12" y1="12" x2="108" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>

          {/* Botanical Garden Leaf Half Gradient */}
          <linearGradient id={`garden_half_${uid}`} x1="16" y1="20" x2="82" y2="96" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="52%" stopColor="#15803D" />
            <stop offset="100%" stopColor="#0E3B22" />
          </linearGradient>

          {/* Espresso Crema Half Gradient */}
          <linearGradient id={`coffee_half_${uid}`} x1="96" y1="24" x2="34" y2="106" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7C3F19" />
            <stop offset="55%" stopColor="#451A03" />
            <stop offset="100%" stopColor="#1E0E06" />
          </linearGradient>

          {/* Smooth Leaf-to-Latte-Foam S-Curve Transition Stem */}
          <linearGradient id={`stem_morph_${uid}`} x1="60" y1="10" x2="60" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#BBF7D0" />
            <stop offset="38%" stopColor="#86EFAC" />
            <stop offset="52%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#FFFBEB" />
          </linearGradient>

          {/* Steamed Microfoam Crema Gradient */}
          <linearGradient id={`foam_grad_${uid}`} x1="56" y1="54" x2="96" y2="96" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFDF7" />
            <stop offset="70%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>

          <clipPath id={`medallion_clip_${uid}`}>
            <circle cx="60" cy="60" r="50" />
          </clipPath>
        </defs>

        {/* Subtle Atmospheric Back Glow */}
        <circle cx="60" cy="60" r="54" fill="rgba(217, 119, 6, 0.14)" />

        {/* Clipped Yin-Yang Interior */}
        <g clipPath={`url(#medallion_clip_${uid})`}>
          {/* LEFT / UPPER HALF: Real Botanical Garden Leaf Territory */}
          <path
            d="M 60 10 A 50 50 0 0 0 60 110 A 25 25 0 0 1 60 60 A 25 25 0 0 0 60 10 Z"
            fill={`url(#garden_half_${uid})`}
          />

          {/* RIGHT / LOWER HALF: Espresso & Cappuccino Rosetta Territory */}
          <path
            d="M 60 10 A 50 50 0 0 1 60 110 A 25 25 0 0 1 60 60 A 25 25 0 0 0 60 10 Z"
            fill={`url(#coffee_half_${uid})`}
          />

          {/* ===== REAL BOTANICAL LEAF DETAILS (Left Crescent & Upper Lobe) ===== */}
          <g className="klasik-leaf-group">
            {/* Organic Sculpted Leaf Blade Silhouette inside Left Crescent */}
            <path
              d="M 55 18 C 30 22, 17 44, 21 69 C 24 84, 34 94, 43 99 C 35 83, 35 66, 46 53 C 54 43, 62 32, 55 18 Z"
              fill="#4ADE80"
              fillOpacity="0.24"
            />
            {/* Botanical Leaf Midrib curving along left half */}
            <path
              d="M 41 96 C 28 76, 28 46, 54 22"
              stroke="#DCFCE7"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeOpacity="0.9"
            />
            {/* Crisp Real Leaf Lateral Veins */}
            <path d="M 33 77 C 25 71, 21 65, 19 58" stroke="#BBF7D0" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.85" />
            <path d="M 32 63 C 25 56, 22 48, 23 41" stroke="#BBF7D0" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.85" />
            <path d="M 37 47 C 32 39, 32 31, 35 25" stroke="#BBF7D0" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.8" />
            <path d="M 35 67 C 41 64, 47 61, 51 56" stroke="#BBF7D0" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.75" />
            <path d="M 39 51 C 46 47, 52 44, 57 38" stroke="#BBF7D0" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.75" />
            <path d="M 45 36 C 52 33, 59 31, 65 29" stroke="#BBF7D0" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.7" />
          </g>

          {/* ===== CAPPUCCINO ROSETTA LATTE ART LEAF (Right Crescent & Lower Lobe) ===== */}
          <g className="klasik-rosetta-group">
            {/* Flowing Steamed Milk Rosetta Petals Fanning Out from the S-Curve */}
            {/* Top Rosetta Heart/Crown Petal */}
            <path
              d="M 88 30 C 97 34, 98 46, 87 49 C 81 51, 77 46, 81 41 C 83 38, 86 35, 88 30 Z"
              fill={`url(#foam_grad_${uid})`}
              fillOpacity="0.96"
            />
            {/* Upper-Right Rosetta Frond Pair */}
            <path
              d="M 84 48 C 98 47, 105 56, 98 63 C 92 68, 83 63, 77 56 C 74 53, 79 49, 84 48 Z"
              fill={`url(#foam_grad_${uid})`}
              fillOpacity="0.94"
            />
            {/* Mid-Right Swirled Rosetta Frond */}
            <path
              d="M 76 59 C 92 61, 102 71, 93 79 C 86 85, 76 78, 70 70 C 67 66, 71 60, 76 59 Z"
              fill={`url(#foam_grad_${uid})`}
              fillOpacity="0.92"
            />
            {/* Lower-Right Rosetta Frond */}
            <path
              d="M 67 71 C 83 75, 91 86, 82 93 C 75 98, 66 91, 61 83 C 58 78, 62 72, 67 71 Z"
              fill={`url(#foam_grad_${uid})`}
              fillOpacity="0.9"
            />
            {/* Base Wrapping Crema Swirl into Lower Lobe */}
            <path
              d="M 55 83 C 68 89, 75 99, 64 103 C 54 106, 46 98, 49 90 C 50 86, 52 84, 55 83 Z"
              fill={`url(#foam_grad_${uid})`}
              fillOpacity="0.88"
            />
            {/* Delicate Poured-Milk Center Pull Vein across the Rosetta */}
            <path
              d="M 87 38 C 82 55, 72 74, 56 96"
              stroke="#5C2D16"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeOpacity="0.72"
            />
          </g>

          {/* ===== SMOOTHLY TRANSITIONED S-CURVE DIVIDER (Leaf Stem -> Milk Pour) ===== */}
          <path
            d="M 60 10 A 25 25 0 0 1 60 60 A 25 25 0 0 0 60 110"
            stroke={`url(#stem_morph_${uid})`}
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
          />

          {/* Yin-Yang Accent Seeds (Tiny Coffee Bean in Garden Lobe + Tiny Leaf Bud in Coffee Lobe) */}
          {/* Warm Coffee Bean Seed in Upper Lobe */}
          <g transform="translate(62, 34) rotate(-25)">
            <ellipse cx="0" cy="0" rx="5.2" ry="3.7" fill="#451A03" stroke="#FEF3C7" strokeWidth="1.1" />
            <path d="M -3.8 0 C -1 -1.2, 1 1.2, 3.8 0" stroke="#FDE68A" strokeWidth="0.9" strokeLinecap="round" />
          </g>

          {/* Botanical Dew-Leaf Seed in Lower Lobe */}
          <g transform="translate(56, 86) rotate(22)">
            <path
              d="M 0 -5 C 4 -2.5, 4.5 2.5, 0 5 C -4.5 2.5, -4 -2.5, 0 -5 Z"
              fill="#22C55E"
              stroke="#DCFCE7"
              strokeWidth="1"
            />
            <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#DCFCE7" strokeWidth="0.8" strokeLinecap="round" />
          </g>
        </g>

        {/* Inner Specular Glass Ring & Outer Brass Bezel */}
        <circle cx="60" cy="60" r="50.5" stroke={`url(#brass_rim_${uid})`} strokeWidth="3.2" />
        <circle cx="60" cy="60" r="47.5" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="0.9" />
      </svg>
    </div>
  );
};
