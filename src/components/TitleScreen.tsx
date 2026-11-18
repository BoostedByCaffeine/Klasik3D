import React from 'react';
import {
  CloudRain,
  Disc3,
  Download,
  Globe,
  PackageCheck,
  Play,
  Save,
  Smartphone,
  Sparkles,
  Sun,
  Sunset,
} from 'lucide-react';
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
  const isApkVersion = pwaStatus.appVersion === 'apk';
  const isPwaVersion = pwaStatus.appVersion === 'pwa';

  const [isLaunchingShift, setIsLaunchingShift] = React.useState(false);

  const handleTriggerShift = (mode: GameMode) => {
    if (isLaunchingShift) return;
    setIsLaunchingShift(true);
    window.setTimeout(() => {
      onStartShift(mode);
    }, 340);
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between px-3 py-1.5 sm:p-5 overflow-hidden">
      {/* Top Bar: Rocket-Coffee Emblem Badge & Version-Specific Utility Actions */}
      <div className="flex items-center justify-between gap-2 pointer-events-auto shrink-0">
        <div
          data-testid="title-version-badge"
          className="flex items-center gap-2 bg-[#1c130e]/95 border border-amber-500/30 rounded-xl px-2.5 py-1 shadow-lg"
        >
          <StudioLogo
            variant="icon"
            igniting={isLaunchingShift}
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0"
          />
          <span className="text-stone-500" aria-hidden="true">
            ·
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-amber-200/90 whitespace-nowrap">
            {isApkVersion ? (
              <>
                <PackageCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Android APK Offline Edition</span>
              </>
            ) : isPwaVersion ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>PWA Standalone Edition</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Live Web Build v2.2</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onChangeGraphics(isMaxGraphics ? 'low' : 'max')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border text-[11px] sm:text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              isMaxGraphics
                ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400 text-amber-200'
                : 'bg-[#261a13]/95 hover:bg-[#322219] border-stone-700 text-stone-300'
            }`}
            title="Toggle 3D Graphics Quality (LOW or MAX)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>GFX: {isMaxGraphics ? 'MAX' : 'LOW'}</span>
          </button>

          {/* Install APK / PWA Button is REMOVED for APK versions; shown ONLY for Web and PWA versions */}
          {!isApkVersion && (
            <button
              type="button"
              data-testid="btn-open-apk-modal"
              onClick={onOpenPwaModal}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shadow-md flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Install APK / PWA</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCodeExportModal}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-[#261a13]/95 hover:bg-[#322219] border border-stone-700 text-[11px] sm:text-xs font-medium text-stone-200 transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Save &amp; GitHub</span>
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

          {/* KLASIK 3D Framed Header Box with Live Animated Rocket-Coffee Emblem */}
          <div
            data-testid="title-header-emblem-box"
            role="img"
            aria-label="KLASIK 3D: Garage Garden Cafe"
            className="w-full rounded-xl bg-[#271912] border-2 border-[#d97706] px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-2.5 sm:gap-3.5 shadow-inner"
          >
            <StudioLogo
              variant="icon"
              igniting={isLaunchingShift}
              className="w-11 h-11 sm:w-14 sm:h-14 shrink-0"
            />
            <div className="min-w-0 flex flex-col justify-center leading-none">
              <div className="font-display font-bold text-xl sm:text-[28px] text-[#fef3c7] tracking-wide truncate">
                KLASIK 3D
              </div>
              <div className="text-[9px] sm:text-[11px] font-semibold text-[#f59e0b] tracking-[0.18em] uppercase truncate mt-0.5">
                GARAGE GARDEN CAFE EDITION
              </div>
            </div>
          </div>

          <p className="hidden sm:block text-[11px] sm:text-xs text-stone-300 leading-tight line-clamp-2">
            Step behind the commercial walnut espresso bar. Grind fresh dark-roast beans, steam
            velvety microfoam, spin vinyl records, and serve the neighborhood.
          </p>
        </div>

        {/* Primary & Secondary Game Mode CTAs */}
        <div className="space-y-1.5">
          <button
            type="button"
            data-start="true"
            data-testid="btn-enter-garage"
            onClick={(e) => {
              e.currentTarget.blur();
              handleTriggerShift('career');
            }}
            className="w-full py-2 sm:py-2.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold text-xs sm:text-sm shadow-lg transition-transform active:scale-[0.99] cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Start Shift (Day {day})</span>
            </span>
            {!isApkVersion && (
              <span className="text-[10px] font-mono bg-stone-950/15 px-1.5 py-0.5 rounded">
                Enter / Space
              </span>
            )}
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              data-testid="btn-play-zen"
              onClick={(e) => {
                e.currentTarget.blur();
                handleTriggerShift('zen');
              }}
              className="py-1.5 px-2.5 rounded-xl bg-[#291c14] hover:bg-[#36251b] border border-amber-500/30 text-amber-100 font-semibold text-[11px] sm:text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              Zen Mode (Endless)
            </button>

            <button
              type="button"
              onClick={onOpenSpotifyModal}
              className="py-1.5 px-2.5 rounded-xl bg-[#291c14] hover:bg-[#36251b] border border-emerald-500/35 text-emerald-200 font-semibold text-[11px] sm:text-xs transition-colors cursor-pointer truncate flex items-center justify-center gap-1.5"
              title={`Now Spinning: ${spotifyTrackTitle}`}
            >
              <Disc3 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                {isApkVersion ? 'Phone Spotify & Vinyl' : 'Spotify Web Vinyl'}
              </span>
            </button>
          </div>
        </div>

        {/* Live 3D Weather & Granular Ambience Preview Selector */}
        <div className="pt-1.5 border-t border-stone-800 space-y-1">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-stone-400">
            <span>3D Lighting &amp; Granular Weather Audio</span>
            <span className="text-amber-300/90 font-mono truncate max-w-[150px]">
              {spotifyTrackTitle}
            </span>
          </div>
          <div
            className="grid grid-cols-3 gap-1 p-0.5 bg-[#120c09] rounded-xl border border-stone-800"
            role="group"
            aria-label="Weather and Granular Ambience Preview"
          >
            {(
              [
                { id: 'morning', label: 'Morning Sun', Icon: Sun },
                { id: 'golden', label: 'Golden Hour', Icon: Sunset },
                { id: 'rainy', label: 'Rainy Roof', Icon: CloudRain },
              ] as const
            ).map((item) => {
              const Icon = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeWeather(item.id)}
                  className={`py-1 px-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 ${
                    weather === item.id
                      ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Safe Margin: Single Flat Control-Hint Line */}
      <div
        data-testid="title-control-hint-bar"
        className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-stone-300 bg-[#0c0a09]/90 px-3 py-1 rounded-xl border border-stone-800/80 pointer-events-auto shrink-0"
      >
        <span className="truncate">
          {isApkVersion
            ? 'Use <- (Station) -> Pill to Switch Stations · Touch 3D Equipment or Bottom Bar to Brew & Serve'
            : '1–5 or A/D Switch Stations · Space Brew Next Step · R Rinse · M Vinyl · H Hide HUD'}
        </span>
        <span className="font-mono text-amber-300/90 hidden sm:inline shrink-0">
          {isApkVersion ? '100% Offline APK Ready' : 'Landscape 3D Barista Sim'}
        </span>
      </div>
    </div>
  );
};
