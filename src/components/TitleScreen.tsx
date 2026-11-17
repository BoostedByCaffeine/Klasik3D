import React from 'react';
import { StudioLogo } from './StudioLogo';
import { GameMode, GraphicsQuality, WeatherMode } from '../game/rules';
import { PwaEnvironmentStatus } from '../pwa/pwaManager';

interface TitleScreenProps {
  day: number;
  cash: number;
  weather: WeatherMode;
  graphicsQuality: GraphicsQuality;
  pwaStatus: PwaEnvironmentStatus;
  spotifyTrackTitle: string;
  onStartShift: (mode: GameMode) => void;
  onChangeWeather: (weather: WeatherMode) => void;
  onChangeGraphics: (quality: GraphicsQuality) => void;
  onOpenSpotifyModal: () => void;
  onOpenPwaModal: () => void;
  onOpenCodeExportModal: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  day,
  cash,
  weather,
  graphicsQuality,
  pwaStatus,
  spotifyTrackTitle,
  onStartShift,
  onChangeWeather,
  onChangeGraphics,
  onOpenSpotifyModal,
  onOpenPwaModal,
  onOpenCodeExportModal,
}) => {
  const isMaxGraphics = graphicsQuality !== 'low';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between px-3 py-1.5 sm:p-5 overflow-hidden">
      {/* Top Bar: Studio Logo (Exclusive to Intro/Title) & Quick Utility Actions */}
      <div className="flex items-center justify-between gap-2 pointer-events-auto shrink-0">
        <div className="flex items-center gap-2 bg-[#1c130e]/95 border border-amber-500/30 rounded-xl px-2.5 py-1 shadow-lg">
          <StudioLogo className="w-20 sm:w-28 h-auto" />
          <span className="text-stone-500" aria-hidden="true">
            ·
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-amber-200/90 whitespace-nowrap">
            {pwaStatus.isStandalone ? 'Standalone APK / PWA' : 'Live Web Build v2.1'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onChangeGraphics(isMaxGraphics ? 'low' : 'max')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border text-[11px] sm:text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap ${
              isMaxGraphics
                ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400 text-amber-200'
                : 'bg-[#261a13]/95 hover:bg-[#322219] border-stone-700 text-stone-300'
            }`}
            title="Toggle 3D Graphics Quality (LOW or MAX)"
          >
            GFX: {isMaxGraphics ? 'MAX' : 'LOW'}
          </button>

          <button
            type="button"
            data-testid="btn-open-apk-modal"
            onClick={onOpenPwaModal}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shadow-md"
          >
            📲 Download APK / PWA
          </button>

          <button
            type="button"
            onClick={onOpenCodeExportModal}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-[#261a13]/95 hover:bg-[#322219] border border-stone-700 text-[11px] sm:text-xs font-medium text-stone-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            Save &amp; GitHub
          </button>
        </div>
      </div>

      {/* Left-Third Diegetic Wooden-Framed Title Card (Leaves right 65% of 3D Diorama unobstructed) */}
      <div className="my-auto max-w-[340px] sm:max-w-md w-full max-h-[calc(100%-76px)] overflow-y-auto no-scrollbar pointer-events-auto bg-[#1b120d]/95 border-2 border-[#5c3a21] rounded-2xl px-3 py-2 sm:p-4 shadow-2xl space-y-1.5 sm:space-y-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-amber-300/90 font-medium">
            <span>BoostedByCaffeine Studios</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Day {day}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">${Math.round(cash)} Reserve</span>
          </div>

          {/* Custom Inline SVG Title Emblem Lockup */}
          <svg
            viewBox="0 0 420 84"
            className="w-full h-auto max-h-11 sm:max-h-16"
            role="img"
            aria-label="KLASIK 3D: Garage Garden Cafe"
          >
            <rect
              x="2"
              y="2"
              width="416"
              height="80"
              rx="12"
              fill="#271912"
              stroke="#d97706"
              strokeWidth="2.5"
            />
            <circle cx="46" cy="42" r="24" fill="#1c130e" stroke="#fbbf24" strokeWidth="2" />
            <path
              d="M34 39 H56 C56 50 50 57 45 57 C40 57 34 50 34 39 Z"
              fill="#fef3c7"
            />
            <path
              d="M56 41 H60 C63 41 63 48 60 48 H56"
              stroke="#fef3c7"
              strokeWidth="2.5"
              fill="none"
            />
            <path
              d="M41 32 Q39 25 44 21 M49 32 Q47 25 52 21"
              stroke="#f59e0b"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            <text
              x="86"
              y="46"
              fill="#fef3c7"
              fontFamily="Fraunces, Georgia, serif"
              fontWeight="700"
              fontSize="36"
              letterSpacing="1"
            >
              KLASIK 3D
            </text>
            <text
              x="88"
              y="68"
              fill="#f59e0b"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="600"
              fontSize="12.5"
              letterSpacing="2.4"
            >
              GARAGE GARDEN CAFE EDITION
            </text>
          </svg>

          <p className="hidden sm:block text-[11px] sm:text-xs text-stone-300 leading-tight line-clamp-2">
            Step behind the commercial walnut espresso bar. Grind fresh dark-roast beans, steam
            velvety microfoam, spin Spotify vinyl records, and serve the neighborhood.
          </p>
        </div>

        {/* Primary & Secondary Game Mode CTAs */}
        <div className="space-y-1.5">
          <button
            type="button"
            data-start="true"
            data-testid="btn-play-career"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartShift('career');
            }}
            className="w-full py-2 sm:py-2.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold text-xs sm:text-sm shadow-lg transition-transform active:scale-[0.99] cursor-pointer flex items-center justify-between"
          >
            <span>Start Shift (Day {day})</span>
            <span className="text-[10px] font-mono bg-stone-950/15 px-1.5 py-0.5 rounded">
              Enter / Space
            </span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              data-testid="btn-play-zen"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartShift('zen');
              }}
              className="py-1.5 px-2.5 rounded-xl bg-[#291c14] hover:bg-[#36251b] border border-amber-500/30 text-amber-100 font-semibold text-[11px] sm:text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              Zen Mode (Endless)
            </button>

            <button
              type="button"
              onClick={onOpenSpotifyModal}
              className="py-1.5 px-2.5 rounded-xl bg-[#291c14] hover:bg-[#36251b] border border-emerald-500/35 text-emerald-200 font-semibold text-[11px] sm:text-xs transition-colors cursor-pointer truncate"
              title={`Now Spinning: ${spotifyTrackTitle}`}
            >
              Spotify Vinyl Deck
            </button>
          </div>
        </div>

        {/* Live 3D Weather & Ambience Preview Selector */}
        <div className="pt-1.5 border-t border-stone-800 space-y-1">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-stone-400">
            <span>Live 3D Cafe Lighting</span>
            <span className="text-amber-300/90 font-mono truncate max-w-[150px]">
              {spotifyTrackTitle}
            </span>
          </div>
          <div
            className="grid grid-cols-3 gap-1 p-0.5 bg-[#120c09] rounded-xl border border-stone-800"
            role="group"
            aria-label="Weather and Ambience Preview"
          >
            {(
              [
                { id: 'morning', label: 'Morning Sun' },
                { id: 'golden', label: 'Golden Hour' },
                { id: 'rainy', label: 'Rainy Night' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeWeather(item.id)}
                className={`py-1 px-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  weather === item.id
                    ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Safe Margin: Single Flat Control-Hint Line */}
      <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-stone-300 bg-[#0c0a09]/90 px-3 py-1 rounded-xl border border-stone-800/80 pointer-events-auto shrink-0">
        <span className="truncate">
          1–5 or A/D Switch Stations · Space Brew Next Step · R Rinse · M Vinyl · H Hide HUD
        </span>
        <span className="font-mono text-amber-300/90 hidden sm:inline shrink-0">
          Landscape 3D Barista Sim
        </span>
      </div>
    </div>
  );
};
