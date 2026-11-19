import React from 'react';
import {
  Clock,
  CloudRain,
  CloudSun,
  Disc3,
  Download,
  Globe,
  Moon,
  PackageCheck,
  Play,
  Save,
  Smartphone,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { KlasikGameLogo } from './KlasikGameLogo';
import { StudioLogo } from './StudioLogo';
import {
  GameMode,
  GraphicsQuality,
  RainPreference,
  TimeOfDayMode,
  WeatherMode,
  cycleGraphicsQuality,
} from '../game/rules';
import { PwaEnvironmentStatus } from '../pwa/pwaManager';

interface TitleScreenProps {
  day: number;
  cash: number;
  cupsServedToday: number;
  dailyOrderQuota: number;
  liveClockLabel: string;
  weather: WeatherMode;
  timeOfDayMode: TimeOfDayMode;
  rainPreference: RainPreference;
  graphicsQuality: GraphicsQuality;
  pwaStatus: PwaEnvironmentStatus;
  spotifyTrackTitle: string;
  onStartShift: (mode: GameMode) => void;
  onChangeTimeOfDay: (mode: TimeOfDayMode) => void;
  onChangeRainPreference: (rain: RainPreference) => void;
  onChangeGraphics: (quality: GraphicsQuality) => void;
  onOpenSpotifyModal: () => void;
  onOpenPwaModal: () => void;
  onOpenCodeExportModal: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  day,
  cash,
  cupsServedToday,
  dailyOrderQuota,
  liveClockLabel,
  weather,
  timeOfDayMode,
  rainPreference,
  graphicsQuality,
  pwaStatus,
  spotifyTrackTitle,
  onStartShift,
  onChangeTimeOfDay,
  onChangeRainPreference,
  onChangeGraphics,
  onOpenSpotifyModal,
  onOpenPwaModal,
  onOpenCodeExportModal,
}) => {
  const gfxLabel =
    graphicsQuality === 'max' ? 'MAX' : graphicsQuality === 'medium' ? 'MED' : 'LOW';
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
    <div className="fixed inset-0 z-20 pointer-events-none hud-safe-frame flex flex-col justify-between overflow-hidden">
      <div className="flex flex-col justify-between w-full h-full px-3 py-1.5 sm:p-5">
      {/* Top Bar: Rocket-Coffee Studio Corner Badge & Version-Specific Utility Actions */}
      <div className="flex items-center justify-between gap-2 pointer-events-auto shrink-0">
        <div
          data-testid="title-version-badge"
          className="glass-pill flex items-center gap-2 rounded-xl px-2.5 py-1"
        >
          <StudioLogo
            variant="icon"
            igniting={isLaunchingShift}
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0"
          />
          <span className="text-[#E7D7C1]/50" aria-hidden="true">
            ·
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-[#FAF5EE] glass-text-crisp whitespace-nowrap">
            {isApkVersion ? (
              <>
                <PackageCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2.2} />
                <span>Android APK Offline Edition</span>
              </>
            ) : isPwaVersion ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
                <span>PWA Standalone Edition</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
                <span>Live Web Build v2.2</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            data-testid="title-gfx-toggle"
            onClick={() => onChangeGraphics(cycleGraphicsQuality(graphicsQuality))}
            className={`glass-hud-btn px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-mono font-bold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              graphicsQuality === 'max'
                ? '!border-amber-400/80 text-amber-200'
                : graphicsQuality === 'medium'
                ? '!border-sky-400/70 text-sky-200'
                : 'text-[#E7D7C1]'
            }`}
            title="Cycle 3D Graphics Quality (LOW → MED → MAX)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
            <span>GFX: {gfxLabel}</span>
          </button>

          {/* Install APK / PWA Button is REMOVED for APK versions; shown ONLY for Web and PWA versions */}
          {!isApkVersion && (
            <button
              type="button"
              data-testid="btn-open-apk-modal"
              onClick={onOpenPwaModal}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 hover:brightness-105 text-[#160E09] text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-[0_6px_18px_-4px_rgba(16,185,129,0.5)] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
              <span>Install APK / PWA</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCodeExportModal}
            className="glass-hud-btn px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
            <span>Save &amp; GitHub</span>
          </button>
        </div>
      </div>

      {/* Left-Third High-Legibility Espresso Glassmorphism Title Card (Leaves right 65% of 3D Diorama unobstructed) */}
      <div className="my-auto max-w-[355px] sm:max-w-md w-full max-h-[calc(100%-76px)] overflow-y-auto no-scrollbar pointer-events-auto glass-panel rounded-2xl px-3.5 py-2.5 sm:p-4 space-y-2 sm:space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center flex-wrap gap-1.5 text-[10px] sm:text-[11px] text-[#E7D7C1] font-medium glass-text-crisp">
            <span>BoostedByCaffeine</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-amber-300 inline-flex items-center gap-1">
              <Clock className="w-3 h-3 shrink-0" strokeWidth={2.2} />
              <span>{liveClockLabel}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-300">${Math.round(cash)} Reserve</span>
          </div>

          {/* KLASIK 3D Framed Header Box with Yin-Yang Botanical Leaf & Cappuccino Rosetta Game Emblem */}
          <div
            data-testid="title-header-emblem-box"
            className="w-full rounded-xl bg-amber-950/35 border border-amber-400/35 px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-2.5 sm:gap-3.5 shadow-[inset_0_1px_0_rgba(255,245,230,0.12)]"
          >
            <KlasikGameLogo className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" />
            <div className="min-w-0 flex flex-col justify-center leading-none">
              <div className="font-display font-bold text-xl sm:text-[28px] text-[#FAF5EE] glass-text-crisp tracking-wide truncate">
                KLASIK 3D
              </div>
              <div className="text-[9px] sm:text-[11px] font-semibold text-amber-300 tracking-[0.18em] uppercase truncate mt-0.5 glass-text-crisp">
                GARAGE GARDEN CAFE EDITION
              </div>
            </div>
          </div>

          <p className="hidden sm:block text-[11px] sm:text-xs text-[#E7D7C1] leading-snug line-clamp-2 glass-text-crisp">
            Open your 24h garage garden cafe. Pull espresso, plate artisan pastries, greet delivery
            riders, and spin vinyl at your own pace.
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
            className="w-full py-2 sm:py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-105 active:brightness-95 text-[#160E09] font-bold text-xs sm:text-sm shadow-[0_8px_24px_-6px_rgba(245,158,11,0.6)] transition-all active:scale-[0.99] cursor-pointer flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 fill-current shrink-0" strokeWidth={2.2} />
              <span>Enter Store</span>
            </span>
            <span className="text-[10px] font-mono bg-[#160E09]/15 px-2 py-0.5 rounded font-bold whitespace-nowrap">
              {Math.round(cupsServedToday)} / {dailyOrderQuota} Cups · Day {day}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              data-testid="btn-play-zen"
              onClick={(e) => {
                e.currentTarget.blur();
                handleTriggerShift('zen');
              }}
              className="glass-btn-inner py-1.5 px-2.5 rounded-xl font-semibold text-[11px] sm:text-xs cursor-pointer whitespace-nowrap"
            >
              Zen Mode (Chill)
            </button>

            <button
              type="button"
              onClick={onOpenSpotifyModal}
              className="glass-btn-inner py-1.5 px-2.5 rounded-xl !border-emerald-400/35 text-emerald-200 font-semibold text-[11px] sm:text-xs cursor-pointer truncate flex items-center justify-center gap-1.5"
              title={`Now Spinning: ${spotifyTrackTitle}`}
            >
              <Disc3 className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2.2} />
              <span className="truncate">
                {isApkVersion ? 'Phone Spotify & Vinyl' : 'Spotify Web Vinyl'}
              </span>
            </button>
          </div>
        </div>

        {/* Live 3D Device-Clock Time of Day + Independent Rain Controls */}
        <div className="pt-2 border-t border-amber-400/15 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-[#E7D7C1] glass-text-crisp">
            <span className="shrink-0 font-medium">Time of Day &amp; Rain</span>
            <span className="text-amber-300 font-mono uppercase tracking-wider text-[10px] shrink-0">
              {weather.replace('-', ' · ')}
            </span>
          </div>

          <div
            className="grid grid-cols-3 gap-1 p-1 bg-black/30 rounded-xl border border-amber-400/20"
            role="group"
            aria-label="Time of Day Selector"
          >
            {(
              [
                { id: 'auto', label: 'Auto', Icon: Clock },
                { id: 'dawn', label: 'Dawn', Icon: Sunrise },
                { id: 'morning', label: 'Morning', Icon: Sun },
                { id: 'noon', label: 'Noon', Icon: CloudSun },
                { id: 'golden', label: 'Golden', Icon: Sunset },
                { id: 'night', label: 'Night', Icon: Moon },
              ] as const
            ).map((item) => {
              const Icon = item.Icon;
              const isActive = timeOfDayMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`title-time-${item.id}`}
                  onClick={() => onChangeTimeOfDay(item.id)}
                  className={`py-1 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] font-bold shadow-[0_4px_12px_-3px_rgba(245,158,11,0.55)]'
                      : 'glass-btn-inner border-transparent bg-transparent hover:bg-amber-400/15 text-[#E7D7C1]'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div
            className="grid grid-cols-3 gap-1 p-1 bg-black/30 rounded-xl border border-amber-400/20"
            role="group"
            aria-label="Rain Weather Selector"
          >
            {(
              [
                { id: 'auto', label: 'Rain: Auto' },
                { id: 'clear', label: 'Clear Sky' },
                { id: 'rain', label: 'Rainy' },
              ] as const
            ).map((item) => {
              const isActive = rainPreference === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`title-rain-${item.id}`}
                  onClick={() => onChangeRainPreference(item.id)}
                  className={`py-1 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 ${
                    isActive
                      ? item.id === 'rain'
                        ? 'bg-gradient-to-r from-sky-400 to-indigo-400 text-[#0c1220] font-bold shadow'
                        : 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] font-bold shadow'
                      : 'glass-btn-inner border-transparent bg-transparent hover:bg-amber-400/15 text-[#E7D7C1]'
                  }`}
                >
                  {item.id === 'rain' && <CloudRain className="w-3 h-3 shrink-0" strokeWidth={2.2} />}
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
        className="glass-pill flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-[#FAF5EE] glass-text-crisp px-3 py-1 rounded-xl pointer-events-auto shrink-0"
      >
        <span className="truncate">
          {isApkVersion
            ? 'Use <- Station -> Pill to Switch Stations · Touch 3D Pastries & Equipment to Brew & Serve'
            : '1–6 or A/D Switch Stations · Space Next Step · R Rinse/Discard · M Vinyl · H Hide HUD'}
        </span>
        <span className="font-mono text-amber-300 hidden sm:inline shrink-0">
          {isApkVersion ? '100% Offline APK Ready' : '24h Real-Time Barista Sim'}
        </span>
      </div>
      </div>
    </div>
  );
};
