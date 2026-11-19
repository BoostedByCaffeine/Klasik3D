# Klasik 3D — Master Visual & UI Upgrade Prompt

Implement the following three coordinated upgrades across `src/components/KlasikGameLogo.tsx` (new), `src/components/TitleScreen.tsx`, `src/components/HudOverlay.tsx`, `src/components/DailyGoalProgressBar.tsx`, modal overlays, `src/components/LoadingScreen.tsx`, `src/App.tsx`, and `src/index.css`.

> **Scope Protection Rule:** Do **NOT** alter the Title Screen top-left studio corner badge (`StudioLogo variant="icon"`) or any in-game 3D decals (such as the 3D porcelain foreground mug or wall plaque in `src/game/scene3d.ts`).

---

## PART 1: Replace the Duplicate Rocket-Coffee Emblem on the `KLASIK 3D` Card with a New Yin-Yang Leaf & Cappuccino Game Logo

### Concept & Placement
- On `src/components/TitleScreen.tsx`, the circular Rocket-Coffee emblem currently appears **twice**—once in the top-left `Live Web Build v2.2` pill and again inside the `KLASIK 3D · GARAGE GARDEN CAFE EDITION` card header.
- **Keep** `<StudioLogo variant="icon" />` in the top-left studio corner badge.
- **Replace** the duplicate emblem inside the `KLASIK 3D` card header with a brand-new bespoke game logo component: **`src/components/KlasikGameLogo.tsx`**.

### Visual Design ("Yin-Yang Botanical Leaf & Cappuccino Rosetta")
- **Circular Medallion:** Warm brushed-brass outer ring (`#D97706` -> `#FDE68A` -> `#B45309`).
- **Continuous S-Curve Yin-Yang Split:**
  - **Garden Half (Left Crescent + Upper Lobe):** Deep botanical emerald gradient (`#0F3D22` -> `#15803D` -> `#22C55E`). Features a sculpted **real garden leaf** curving organically from the shared S-spine with delicate sage-cream leaf veins (`#BBF7D0`) and a subtle roasted coffee bean/crema dot nestled in the upper lobe for yin-yang balance.
  - **Cappuccino Half (Right Crescent + Lower Lobe):** Rich dark-roast espresso crema gradient (`#241108` -> `#5C2D16` -> `#92400E`). Smoothly transitioning out of the **exact same continuous S-curve central stem**, velvety **cappuccino latte-art rosetta petals** (`#FFFBEB` / `#FEF3C7`) fan out into a poured milk-foam leaf with a gentle heart tip and a tiny emerald botanical bud nestled in the lower lobe.
  - **Seamless Transition:** A single continuous S-curve gradient stroke runs down the center dividing line—morphing smoothly from crisp botanical leaf green at the top/left into creamy steamed microfoam at the bottom/right.

### Reference Implementation: `src/components/KlasikGameLogo.tsx`

```tsx
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
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
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
```

### Usage in `src/components/TitleScreen.tsx`
- Import `KlasikGameLogo` from `'./KlasikGameLogo'`.
- Replace `<StudioLogo variant="icon" ... />` inside the `KLASIK 3D` card header with `<KlasikGameLogo className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" />`.
- **Keep** `<StudioLogo variant="icon" igniting={isLaunchingShift} className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />` exclusively in the top-left `Live Web Build v2.2` pill.

---

## PART 2: High-Legibility Espresso Glassmorphism Across Title Screen & All HUDs

Upgrade the Title Screen (`src/components/TitleScreen.tsx`), gameplay HUD (`src/components/HudOverlay.tsx`, `src/components/DailyGoalProgressBar.tsx`), and all in-game modal panels (`BizUpgradesModal.tsx`, `CustomizeModal.tsx`, `RecipeMenuModal.tsx`, `SpotifyVinylModal.tsx`, `StatusModal.tsx`, `PwaApkModal.tsx`, `CodeExportModal.tsx`) to use **warm dark-roast glassmorphism** engineered specifically for **effortless readability** over bright 3D scenes (Morning Sun, Golden Hour, and Rainy Roof).

### Design System Rules (Readability First)
1. **Calibrated Dark Espresso Scrim (`0.68–0.80` Alpha):** Never use milky/white translucent glass or ultra-thin `<40%` opacity panels that wash out buttons and icons over the sunlit 3D cafe. Use deep roasted espresso translucency (`rgba(17, 11, 8, 0.72)`) paired with `backdrop-filter: blur(18px) saturate(145%)`.
2. **Specular Top-Edge Lighting:** Add an inner top hairline highlight (`inset 0 1px 0 rgba(255, 244, 224, 0.14)`) and warm brass border (`1px solid rgba(245, 158, 11, 0.24)`) so every panel reads as crafted dark smoked glass.
3. **Never Double-Blur:** Do not apply `backdrop-filter` to buttons that already sit inside a blurred `.glass-panel`; instead use crisp translucent surface fills (`.glass-btn-inner`) inside panels to keep 60fps performance smooth on Android/mobile WebGL.
4. **High-Contrast Typography & Iconography:**
   - Primary text & icons: `#FAF5EE` with subtle shadow (`text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65)`).
   - Secondary metadata labels: `#E7D7C1` (minimum WCAG AA contrast against the dark glass scrim).
   - Active / Primary CTAs (`Start Shift`, active station/brew action, active weather pill): Solid luminous amber-gold gradient (`from-amber-400 via-amber-500 to-orange-500`) with bold dark-espresso text (`#160E09`) and an outer warm glow so players immediately spot actionable controls.
5. **Accessibility Fallback:** Include `@media (prefers-reduced-transparency: reduce)` so surfaces fall back to rich opaque `#160F0B`.

### Reusable Glassmorphism Utilities (`src/index.css`)

```css
/* ===== KLASIK 3D HIGH-LEGIBILITY ESPRESSO GLASSMORPHISM ===== */
.glass-panel {
  background: linear-gradient(
    160deg,
    rgba(28, 18, 13, 0.76) 0%,
    rgba(16, 11, 8, 0.72) 100%
  );
  backdrop-filter: blur(18px) saturate(145%);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  border: 1px solid rgba(251, 191, 36, 0.24);
  box-shadow:
    0 18px 42px -12px rgba(0, 0, 0, 0.68),
    inset 0 1px 0 rgba(255, 245, 230, 0.15),
    inset 0 -1px 0 rgba(0, 0, 0, 0.35);
}

.glass-pill {
  background: rgba(18, 12, 9, 0.68);
  backdrop-filter: blur(14px) saturate(135%);
  -webkit-backdrop-filter: blur(14px) saturate(135%);
  border: 1px solid rgba(251, 191, 36, 0.22);
  box-shadow:
    0 8px 22px -6px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 245, 230, 0.14);
}

.glass-modal {
  background: linear-gradient(
    165deg,
    rgba(26, 17, 12, 0.86) 0%,
    rgba(14, 9, 7, 0.84) 100%
  );
  backdrop-filter: blur(22px) saturate(150%);
  -webkit-backdrop-filter: blur(22px) saturate(150%);
  border: 1px solid rgba(251, 191, 36, 0.28);
  box-shadow:
    0 24px 60px -12px rgba(0, 0, 0, 0.78),
    inset 0 1px 0 rgba(255, 245, 230, 0.16);
}

/* Interactive button INSIDE a glass-panel (no nested backdrop-filter for crispness & GPU speed) */
.glass-btn-inner {
  background: rgba(255, 248, 235, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: #FAF5EE;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65);
  transition: background-color 150ms ease, border-color 150ms ease, transform 120ms ease;
}

.glass-btn-inner:hover {
  background: rgba(251, 191, 36, 0.16);
  border-color: rgba(251, 191, 36, 0.45);
}

.glass-btn-inner:active {
  transform: scale(0.98);
}

/* Standalone floating HUD glass button (e.g. Top Bar / Station Switcher / Action Bar) */
.glass-hud-btn {
  background: rgba(20, 13, 10, 0.72);
  backdrop-filter: blur(12px) saturate(135%);
  -webkit-backdrop-filter: blur(12px) saturate(135%);
  border: 1px solid rgba(251, 191, 36, 0.26);
  color: #FAF5EE;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  box-shadow:
    0 6px 18px -4px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 245, 230, 0.14);
  transition: background-color 150ms ease, border-color 150ms ease, transform 120ms ease;
}

.glass-hud-btn:hover {
  background: rgba(36, 24, 17, 0.84);
  border-color: rgba(251, 191, 36, 0.5);
}

.glass-text-crisp {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.72);
}

@media (prefers-reduced-transparency: reduce) {
  .glass-panel,
  .glass-pill,
  .glass-modal,
  .glass-hud-btn {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background: rgba(20, 14, 11, 0.96);
  }
}
```

### Component Application Checklist
- **`TitleScreen.tsx`:**
  - Main hero card container -> `glass-panel rounded-2xl` (replaces solid dark opaque card).
  - Top-left version badge (`Live Web Build v2.2`), top-right utility buttons (`GFX`, `Install APK / PWA`, `Save & GitHub`), and bottom control hint strip -> `glass-pill` / `glass-hud-btn`.
  - `KLASIK 3D` framed header box inside the card -> `bg-amber-950/35 border border-amber-400/35 rounded-xl shadow-[inset_0_1px_0_rgba(255,245,230,0.12)]` housing `<KlasikGameLogo />`.
  - Secondary buttons (`Zen Mode (Endless)`, `Spotify Web Vinyl`, unselected weather tabs) -> `glass-btn-inner`.
  - Primary CTA (`Start Shift`) and active weather tab -> keep solid amber-gold gradient with `#160E09` bold text for instant visual hierarchy.
- **`HudOverlay.tsx` & `DailyGoalProgressBar.tsx`:**
  - Apply `glass-pill` to top status bars (cash reserve, day/time, rating, shift progress, audio/vinyl controls), floating station selector bar, and order queue cards.
  - Apply `glass-panel` to active customer order ticket panels, brew guide / step prompt dock, and mobile touch controls.
  - Ensure all HUD SVG icons (`lucide-react`) have `strokeWidth={2.2}` and crisp `text-[#FAF5EE]` or `text-amber-300` contrast, and active station/step buttons highlight cleanly with amber borders + `bg-amber-500/25` or solid amber fill.
- **All Modals (`BizUpgradesModal`, `CustomizeModal`, `RecipeMenuModal`, `SpotifyVinylModal`, `StatusModal`, `PwaApkModal`, `CodeExportModal`):**
  - Backdrop overlay: `bg-black/55 backdrop-blur-sm`.
  - Modal dialog surface: `glass-modal rounded-2xl`.
  - Inner cards/tabs: `glass-btn-inner`.

---

## PART 3: Minimalist Cinematic "Crema Ring" Studio Splash Screen Refactor

Refactor `src/components/LoadingScreen.tsx` (and its styles in `src/index.css` + readiness hook in `src/App.tsx`) into a minimalist, cinematic studio splash screen for **Boosted By Caffeine** using the **"Crema Ring"** SVG/CSS entrance choreography.

### 1. Scope & UI Cleanup
Keep the circular rocket-coffee emblem and **completely remove all** of the following legacy elements from `LoadingScreen.tsx`:
- The outer rounded card/panel border surrounding the logo.
- The top header strip (`BOOSTED BY CAFFEINE STUDIOS · WEBGL 3D ENGINE`).
- The micro-telemetry strip (`ROASTERY LAB · 12% BOILER PRESSURE` and equalizer level bars).
- The shader status text (`Brewing Shaders & Warming Boilers...` and `Grinding Procedural 3D Meshes & Walnut Grain...`).
- The `9.0 BAR EXTRACTION` loading bar, `12%` percentage readout, tip footer, and `Skip Preloader` button.
- The solid white pill background behind `BY CAFFEINE`.

*(Do NOT alter the Title Screen corner badge or any in-game 3D decals—scope this refactor strictly to the splash/loading overlay.)*

### 2. Visual Direction & Layout
- **Background:** Full-viewport (`width: 100vw; height: 100dvh;`) deep matte espresso dark canvas (`#090705`) with a barely perceptible warm radial vignette (`radial-gradient(circle at center, #140F0A 0%, #090705 72%)`) and zero container borders.
- **Emblem Preservation:** Retain the circular rocket-coffee SVG emblem—outer amber ring, white rocket-cup silhouette with swept fins, warm amber thruster flame, and three rising amber steam waves—structured cleanly into animatable groups/paths:
  - `.crema-ring`
  - `.rocket-cup`
  - `.thruster-flame`
  - `.steam-wave-1`, `.steam-wave-2`, `.steam-wave-3`
- **Remastered Wordmark:** Position cleanly beside the emblem on landscape/desktop viewports (gracefully scaling down or stacking centered on narrow portrait screens via `clamp()` and flex-wrap/media queries) with **zero boxes or pills** behind the text:
  - `BOOSTED`: Crisp warm cream (`#F5F0E8`), bold clean geometric sans-serif (`Plus Jakarta Sans`), uppercase.
  - `BY CAFFEINE`: Muted warm brass (`#C8924A`), uppercase, light/medium weight (`500`), wide tracking (`0.38em`), aligned cleanly beneath `BOOSTED`.
- **Ambient Glow:** Restrained, low-opacity warm amber radial halo (`rgba(229, 154, 60, 0.12)`) directly behind the emblem—subtle atmospheric warmth, never heavy neon bloom.

### 3. Animation Choreography ("The Crema Ring")
Implement the full sequence using pure GPU-accelerated CSS transforms/opacity and SVG `stroke-dasharray` / `stroke-dashoffset` (no external animation libraries):

1. **Ring Draw (`0.0s – 0.7s`):**
   - Start with `.crema-ring` hidden (`stroke-dashoffset` equal to circumference, rotated `-90deg` so drawing starts at 12 o'clock).
   - Animate a single smooth 360° clockwise stroke draw in warm amber/brass using `cubic-bezier(0.22, 1, 0.36, 1)`.
2. **Emblem Settle & Steam Ignition (`0.5s – 1.1s`):**
   - Fade in `.rocket-cup` (`opacity: 0 -> 1`) paired with a subtle upward drift (`translateY(6px) -> translateY(0)`).
   - Trigger a single soft bloom on `.thruster-flame` (`opacity: 0 -> 1`, `scale(0.75) -> scale(1.06) -> scale(1)` with a gentle amber glow peak).
   - Draw `.steam-wave-1`, `.steam-wave-2`, `.steam-wave-3` upward smoothly using staggered `stroke-dashoffset` animations (`0ms`, `90ms`, `180ms` stagger; set `pathLength="1"` on each steam path).
3. **Wordmark Reveal (`0.8s – 1.3s`):**
   - Fade in `BOOSTED` (`opacity: 0 -> 1`) with subtle letter-spacing contraction (`0.24em -> 0.14em`) and minimal `translateY(3px) -> 0` settle.
   - 150ms later (`0.95s`), fade in `BY CAFFEINE` cleanly in muted brass (`opacity: 0 -> 1`).
4. **Seamless Async Idle Hold (`1.3s+` while assets finish loading):**
   - Transition seamlessly into an ultra-subtle idle loop: a slow breathing pulse on `.thruster-flame` glow and `.crema-ambient-halo` (`2.6s ease-in-out infinite`) plus a gentle vertical opacity/drift shimmer on the three steam waves. **Never** show a spinner or progress bar.
5. **Staggered Exit Fade-Out (`~0.65s` total):**
   - **Step A (`0ms – 180ms`, class `.is-exiting-dim`):** Dim the ambient amber halo and thruster glow cleanly.
   - **Step B (`180ms – 680ms`, class `.is-exiting-fade`):** Smoothly fade out the emblem, wordmark, and dark splash backdrop (`opacity: 1 -> 0` over `500ms ease-in-out`), disable `pointer-events`, and unmount/remove the overlay cleanly once `transitionend` fires (with a failsafe timeout so it never lingers).

### 4. Loading Lifecycle & Safety Requirements
- **Decouple Exit from Progress Bars:** Remove all DOM bindings to progress percentages. In `src/App.tsx`, track `isSceneReady` (set `true` as soon as the Three.js `CafeScene3D` instance mounts/initializes its first frame) and pass `isReady={isSceneReady}` into `<LoadingScreen />`.
- **Dual-Gate Exit Trigger:** Trigger the staggered exit sequence **only when BOTH resolve**:
  1. A guaranteed minimum display timer (`2350ms`, within `2200ms–2500ms`) so the full entrance never cuts short on fast hardware.
  2. The game's actual `isReady` scene/assets readiness signal.
- **Fail-Safe Timeout:** Include a safe `6000ms` fallback timer so an optional stalled asset can never soft-lock the splash screen.
- **Accessibility & Responsiveness:** Add `@media (prefers-reduced-motion: reduce)` to replace stroke/drift motion with a clean opacity fade-in and fade-out, and use `clamp()` for balanced proportions on both mobile landscape and desktop screens.

---

### Reference CSS for "The Crema Ring" (`src/index.css`)

```css
/* ===== MINIMALIST CINEMATIC "CREMA RING" SPLASH SCREEN ===== */
.crema-splash-backdrop {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #090705;
  background-image: radial-gradient(circle at center, #140F0A 0%, #090705 72%);
  opacity: 1;
  transition: opacity 500ms ease-in-out;
  will-change: opacity;
}

.crema-splash-backdrop.is-exiting-fade {
  opacity: 0;
  pointer-events: none;
}

.crema-splash-lockup {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: clamp(1.25rem, 3.2vw, 2.5rem);
  padding: 1.5rem;
}

@media (max-width: 560px) and (orientation: portrait) {
  .crema-splash-lockup {
    flex-direction: column;
    text-align: center;
    gap: 1.25rem;
  }
}

.crema-emblem-wrap {
  position: relative;
  width: clamp(5.5rem, 13vw, 8.75rem);
  height: clamp(5.5rem, 13vw, 8.75rem);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Restrained Atmospheric Amber Halo */
.crema-ambient-halo {
  position: absolute;
  inset: -38%;
  border-radius: 9999px;
  background: radial-gradient(
    circle at center,
    rgba(229, 154, 60, 0.12) 0%,
    rgba(229, 154, 60, 0.04) 45%,
    rgba(9, 7, 5, 0) 72%
  );
  opacity: 0;
  pointer-events: none;
  animation:
    cremaHaloIn 600ms ease-out 500ms forwards,
    cremaHaloBreathe 2.6s ease-in-out 1300ms infinite;
  transition: opacity 180ms ease-out;
}

.crema-splash-backdrop.is-exiting-dim .crema-ambient-halo,
.crema-splash-backdrop.is-exiting-fade .crema-ambient-halo {
  animation: none;
  opacity: 0 !important;
}

/* 1. Ring Draw (0.0s - 0.7s, clockwise from 12 o'clock) */
.crema-ring {
  transform: rotate(-90deg);
  transform-origin: 100px 100px;
  stroke-dasharray: 541;
  stroke-dashoffset: 541;
  animation: cremaRingDraw 700ms cubic-bezier(0.22, 1, 0.36, 1) 0ms forwards;
}

/* 2. Emblem Settle (0.5s - 1.1s) */
.rocket-cup {
  opacity: 0;
  transform: translateY(6px);
  animation: cremaCupSettle 600ms cubic-bezier(0.22, 1, 0.36, 1) 500ms forwards;
}

/* Soft Thruster Bloom (0.55s - 1.1s) + Seamless Idle Breathe (1.3s+) */
.thruster-flame {
  opacity: 0;
  transform-box: fill-box;
  transform-origin: 50% 0%;
  animation:
    cremaThrusterBloom 550ms cubic-bezier(0.22, 1, 0.36, 1) 550ms forwards,
    cremaThrusterIdle 2.6s ease-in-out 1300ms infinite;
  transition: opacity 180ms ease-out, filter 180ms ease-out;
}

.crema-splash-backdrop.is-exiting-dim .thruster-flame,
.crema-splash-backdrop.is-exiting-fade .thruster-flame {
  animation: none;
  opacity: 0.18 !important;
  filter: none !important;
}

/* Staggered Upward Steam Wave Draw (0ms, 90ms, 180ms stagger from 0.6s) + Idle Shimmer */
.steam-wave-1,
.steam-wave-2,
.steam-wave-3 {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0;
}

.steam-wave-1 {
  animation:
    cremaSteamDraw 460ms cubic-bezier(0.22, 1, 0.36, 1) 600ms forwards,
    cremaSteamIdle 2.6s ease-in-out 1300ms infinite;
}

.steam-wave-2 {
  animation:
    cremaSteamDraw 460ms cubic-bezier(0.22, 1, 0.36, 1) 690ms forwards,
    cremaSteamIdle 2.6s ease-in-out 1450ms infinite;
}

.steam-wave-3 {
  animation:
    cremaSteamDraw 460ms cubic-bezier(0.22, 1, 0.36, 1) 780ms forwards,
    cremaSteamIdle 2.6s ease-in-out 1600ms infinite;
}

/* 3. Remastered Wordmark Reveal (0.8s - 1.3s, Zero Boxes or Pills) */
.crema-wordmark-stack {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(0.25rem, 0.7vw, 0.5rem);
}

.crema-wordmark-boosted {
  margin: 0;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  font-weight: 800;
  font-size: clamp(1.85rem, 4.6vw, 3.5rem);
  line-height: 1;
  text-transform: uppercase;
  color: #F5F0E8;
  opacity: 0;
  letter-spacing: 0.24em;
  transform: translateY(3px);
  animation: cremaBoostedReveal 500ms cubic-bezier(0.22, 1, 0.36, 1) 800ms forwards;
}

.crema-wordmark-sub {
  margin: 0;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  font-weight: 500;
  font-size: clamp(0.68rem, 1.35vw, 0.96rem);
  line-height: 1.2;
  text-transform: uppercase;
  color: #C8924A;
  letter-spacing: 0.38em;
  opacity: 0;
  animation: cremaSubReveal 420ms ease-out 950ms forwards;
}

/* ===== KEYFRAMES ===== */
@keyframes cremaRingDraw {
  from {
    stroke-dashoffset: 541;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes cremaCupSettle {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cremaThrusterBloom {
  0% {
    opacity: 0;
    transform: scale(0.75);
    filter: drop-shadow(0 0 0px rgba(229, 154, 60, 0));
  }
  65% {
    opacity: 1;
    transform: scale(1.06);
    filter: drop-shadow(0 0 9px rgba(229, 154, 60, 0.55));
  }
  100% {
    opacity: 0.94;
    transform: scale(1);
    filter: drop-shadow(0 0 5px rgba(229, 154, 60, 0.3));
  }
}

@keyframes cremaThrusterIdle {
  0%, 100% {
    opacity: 0.88;
    transform: scale(1);
    filter: drop-shadow(0 0 4px rgba(229, 154, 60, 0.26));
  }
  50% {
    opacity: 1;
    transform: scale(1.04);
    filter: drop-shadow(0 0 8px rgba(229, 154, 60, 0.48));
  }
}

@keyframes cremaHaloIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes cremaHaloBreathe {
  0%, 100% {
    opacity: 0.78;
    transform: scale(0.98);
  }
  50% {
    opacity: 1;
    transform: scale(1.04);
  }
}

@keyframes cremaSteamDraw {
  0% {
    stroke-dashoffset: 1;
    opacity: 0;
  }
  20% {
    opacity: 0.9;
  }
  100% {
    stroke-dashoffset: 0;
    opacity: 0.92;
  }
}

@keyframes cremaSteamIdle {
  0%, 100% {
    opacity: 0.68;
    transform: translateY(0px);
  }
  50% {
    opacity: 1;
    transform: translateY(-2.5px);
  }
}

@keyframes cremaBoostedReveal {
  from {
    opacity: 0;
    letter-spacing: 0.24em;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    letter-spacing: 0.14em;
    transform: translateY(0);
  }
}

@keyframes cremaSubReveal {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Reduced Motion Accessibility Fallback */
@media (prefers-reduced-motion: reduce) {
  .crema-ring {
    stroke-dashoffset: 0;
    opacity: 0;
    animation: cremaSubReveal 450ms ease-out forwards;
  }
  .rocket-cup,
  .thruster-flame,
  .steam-wave-1,
  .steam-wave-2,
  .steam-wave-3,
  .crema-ambient-halo {
    stroke-dashoffset: 0;
    transform: none;
    animation: cremaSubReveal 450ms ease-out 100ms forwards;
  }
  .crema-wordmark-boosted {
    letter-spacing: 0.14em;
    transform: none;
    animation: cremaSubReveal 450ms ease-out 150ms forwards;
  }
  .crema-wordmark-sub {
    animation: cremaSubReveal 450ms ease-out 250ms forwards;
  }
}
```

---

### Reference Implementation: `src/components/LoadingScreen.tsx`

```tsx
import React, { useEffect, useId, useRef, useState } from 'react';

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

  const finishAndUnmount = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setUnmounted(true);
    onComplete();
  };

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

  // 2. Staggered Exit Trigger (requires BOTH minTimer + isReady, or fail-safe)
  useEffect(() => {
    if (exitStage !== 'idle') return;
    const readyToExit = (minTimerElapsed && isReady) || failsafeElapsed;
    if (!readyToExit) return;

    setExitStage('dim');

    const fadeTimer = window.setTimeout(() => {
      setExitStage('fade');
    }, HALO_DIM_MS);

    const cleanupFallback = window.setTimeout(() => {
      finishAndUnmount();
    }, HALO_DIM_MS + FADE_OUT_FAILSAFE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(cleanupFallback);
    };
  }, [minTimerElapsed, isReady, failsafeElapsed, exitStage]);

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
```

### Wiring WebGL Scene Readiness in `src/App.tsx`
- Add `const [isSceneReady, setIsSceneReady] = useState(false);` inside `App.tsx`.
- Inside the `useEffect` that instantiates `new CafeScene3D(...)`, call `requestAnimationFrame(() => setIsSceneReady(true))` immediately after the scene instance initializes and renders its initial frame.
- Render `<LoadingScreen isReady={isSceneReady} onComplete={() => setShowLoading(false)} />`.

---

## Verification Checklist
- [ ] **No Duplicate Emblem:** Top-left Title Screen pill shows the Rocket-Coffee Studio emblem; `KLASIK 3D` card header shows the new Yin-Yang Botanical Leaf & Cappuccino Rosetta game emblem.
- [ ] **3D Decals Untouched:** Foreground 3D porcelain mug and wall plaque remain untouched.
- [ ] **Readable Glassmorphism:** Title Screen card, top/bottom HUD pills, order tickets, station bar, and all modals use frosted dark espresso glass with crisp contrast under Morning Sun, Golden Hour, and Rainy Roof lighting.
- [ ] **Minimalist Crema Ring Splash:** Full-viewport `#090705` matte canvas, zero progress bars/telemetry/pills/borders, clockwise 12-o'clock ring draw, rocket cup settle, thruster bloom, staggered steam waves, letter-spacing contraction reveal on `BOOSTED`, muted brass `BY CAFFEINE`, seamless idle hold if still loading, and staggered dim-then-fade clean unmount on `transitionend`.