import React, { useState } from 'react';
import {
  Cat,
  Clock,
  CloudRain,
  CloudSnow,
  CloudSun,
  Download,
  Globe,
  Heart,
  Lock,
  Moon,
  Play,
  Save,
  Settings,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { formatAppVersionBadge } from '../game/appVersion';
import {
  GameMode,
  GraphicsQuality,
  RainPreference,
  SceneryId,
  TimeOfDayMode,
  WeatherMode,
  cycleGraphicsQuality,
  isAlwaysWinterScenery,
  isSnowAllowedForScenery,
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
  activeScenery?: SceneryId;
  graphicsQuality: GraphicsQuality;
  pwaStatus: PwaEnvironmentStatus;
  spotifyTrackTitle: string;
  isMuted?: boolean;
  isEnteringCafe?: boolean;
  onStartShift: (mode: GameMode) => void;
  onChangeTimeOfDay: (mode: TimeOfDayMode) => void;
  onChangeRainPreference: (rain: RainPreference) => void;
  onChangeGraphics: (quality: GraphicsQuality) => void;
  onOpenSpotifyModal: () => void;
  onOpenViewsModal: () => void;
  onOpenCatsModal: () => void;
  onOpenPwaModal: () => void;
  onOpenCodeExportModal: () => void;
  onOpenDeveloperNote: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  weather,
  timeOfDayMode,
  rainPreference,
  activeScenery = 'busy_street',
  graphicsQuality,
  pwaStatus,
  spotifyTrackTitle,
  isMuted = false,
  isEnteringCafe = false,
  onStartShift,
  onChangeTimeOfDay,
  onChangeRainPreference,
  onChangeGraphics,
  onOpenSpotifyModal,
  onOpenViewsModal,
  onOpenCatsModal,
  onOpenPwaModal,
  onOpenCodeExportModal,
  onOpenDeveloperNote,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const snowAllowed = isSnowAllowedForScenery(activeScenery);
  const alwaysWinter = isAlwaysWinterScenery(activeScenery);
  const gfxLabel =
    graphicsQuality === 'max' ? 'MAX' : graphicsQuality === 'medium' ? 'MED' : 'LOW';
  const isApkVersion = pwaStatus.appVersion === 'apk';

  const handleTriggerOpenCafe = (mode: GameMode) => {
    if (isEnteringCafe) return;
    setSettingsOpen(false);
    onStartShift(mode);
  };

  return (
    <div
      id="title-overlay"
      data-testid="title-overlay"
      className={`absolute inset-0 z-20 pointer-events-none title-scrim-overlay hud-safe-frame overflow-hidden transition-opacity duration-[250ms] ease-out ${
        isEnteringCafe ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col justify-between w-full h-full px-5 py-4 sm:px-9 sm:py-7">
        {/* Top Bar: Subtle Studio Tag (Left) + Monochrome Frosted-Glass Audio & Settings Icons (Right) */}
        <div
          className={`flex items-center justify-between gap-3 shrink-0 ${
            isEnteringCafe ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          <span
            data-testid="title-studio-tag"
            className="text-[10px] sm:text-[11px] font-semibold tracking-[0.28em] uppercase text-[#A1A1AA] select-none"
          >
            BOOSTEDBYCAFFEINE STUDIOS
          </span>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              data-testid="btn-title-audio-deck"
              onClick={() => {
                setSettingsOpen(false);
                onOpenSpotifyModal();
              }}
              className="title-mono-glass w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center cursor-pointer"
              aria-label="Open Cafe Audio Deck"
              title={`Audio · ${spotifyTrackTitle}`}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-[#A1A1AA]" strokeWidth={2} />
              ) : (
                <Volume2 className="w-4 h-4 text-[#E4E4E7]" strokeWidth={2} />
              )}
            </button>

            <button
              type="button"
              data-testid="btn-title-settings"
              onClick={() => setSettingsOpen((prev) => !prev)}
              aria-expanded={settingsOpen}
              aria-label="Open Cafe Settings"
              title="Atmosphere, Graphics & Save Settings"
              className={`title-mono-glass w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center cursor-pointer ${
                settingsOpen ? '!bg-zinc-800/90 !border-white/40 !text-white' : ''
              }`}
            >
              {settingsOpen ? (
                <X className="w-4 h-4 text-white" strokeWidth={2.2} />
              ) : (
                <Settings className="w-4 h-4 text-[#E4E4E7]" strokeWidth={2} />
              )}
            </button>

            {/* Sleek Monochrome Settings Popover (Preserves all Atmosphere, GFX, Zen & Save options cleanly) */}
            {settingsOpen && !isEnteringCafe && (
              <div
                data-testid="title-settings-popover"
                className="absolute right-0 top-12 w-[275px] sm:w-[300px] rounded-2xl bg-[#09090B]/92 backdrop-blur-xl border border-white/15 shadow-[0_24px_56px_-12px_rgba(0,0,0,0.88)] p-3.5 space-y-3 text-[#E4E4E7] z-30"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#A1A1AA]">
                    Cafe Settings
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300">
                    {weather.replace('-', ' · ')}
                  </span>
                </div>

                {/* Time of Day */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium tracking-wider uppercase text-[#71717A]">
                    Time of Day
                  </div>
                  <div
                    className="grid grid-cols-3 gap-1"
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
                      const active = timeOfDayMode === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-testid={`title-time-${item.id}`}
                          onClick={() => onChangeTimeOfDay(item.id)}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                            active
                              ? 'bg-white text-[#09090B] font-bold'
                              : 'bg-white/[0.05] hover:bg-white/[0.12] text-[#A1A1AA] hover:text-white border border-white/10'
                          }`}
                        >
                          <Icon className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Weather / Precipitation */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium tracking-wider uppercase text-[#71717A]">
                    Weather
                  </div>
                  {alwaysWinter ? (
                    <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/15 flex items-center justify-between text-[10px] font-semibold text-zinc-200">
                      <span className="inline-flex items-center gap-1.5">
                        <CloudSnow className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                        <span>Mt. Everest · Always Winter</span>
                      </span>
                      <Lock className="w-3 h-3 text-[#A1A1AA] shrink-0" strokeWidth={2.2} />
                    </div>
                  ) : (
                    <div
                      className={`grid gap-1 ${snowAllowed ? 'grid-cols-4' : 'grid-cols-3'}`}
                      role="group"
                      aria-label="Precipitation Weather Selector"
                    >
                      {(
                        [
                          { id: 'auto' as const, label: 'Auto' },
                          { id: 'clear' as const, label: 'Clear' },
                          { id: 'rain' as const, label: 'Rain' },
                          ...(snowAllowed ? [{ id: 'snow' as const, label: 'Snow' }] : []),
                        ]
                      ).map((item) => {
                        const active = rainPreference === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            data-testid={`title-rain-${item.id}`}
                            onClick={() => onChangeRainPreference(item.id)}
                            className={`py-1.5 px-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                              active
                                ? 'bg-white text-[#09090B] font-bold'
                                : 'bg-white/[0.05] hover:bg-white/[0.12] text-[#A1A1AA] hover:text-white border border-white/10'
                            }`}
                          >
                            {item.id === 'rain' && (
                              <CloudRain className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                            )}
                            {item.id === 'snow' && (
                              <CloudSnow className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                            )}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Graphics, Zen Mode, Save & Install */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
                  <button
                    type="button"
                    data-testid="title-gfx-toggle"
                    onClick={() => onChangeGraphics(cycleGraphicsQuality(graphicsQuality))}
                    className="py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/12 text-[11px] font-mono font-semibold text-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                    <span>GFX: {gfxLabel}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="btn-play-zen"
                    onClick={() => handleTriggerOpenCafe('zen')}
                    className="py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/12 text-[11px] font-semibold text-zinc-200 cursor-pointer"
                  >
                    Zen Mode
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      onOpenCodeExportModal();
                    }}
                    className="py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/12 text-[11px] font-medium text-zinc-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3 h-3 shrink-0" strokeWidth={2} />
                    <span>Save Data</span>
                  </button>

                  {!isApkVersion && (
                    <button
                      type="button"
                      data-testid="btn-open-apk-modal"
                      onClick={() => {
                        setSettingsOpen(false);
                        onOpenPwaModal();
                      }}
                      className="py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/12 text-[11px] font-medium text-zinc-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3 h-3 shrink-0" strokeWidth={2} />
                      <span>Install App</span>
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid="btn-title-dev-note"
                    onClick={() => {
                      setSettingsOpen(false);
                      onOpenDeveloperNote();
                    }}
                    className={`py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/12 text-[11px] font-medium text-amber-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                      isApkVersion ? 'col-span-1' : 'col-span-2'
                    }`}
                  >
                    <Heart className="w-3 h-3 text-amber-300 shrink-0" strokeWidth={2.2} />
                    <span>Developer Note</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-[#71717A]">
                  <span>Klasik 3D</span>
                  <span data-testid="title-version-badge">{formatAppVersionBadge()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Left-Aligned Concept A Stack (Zero Modal Box — Leaves Right 65% Unobstructed for Storefront & Miata) */}
        <div
          className={`my-auto flex flex-col items-start max-w-[340px] sm:max-w-[430px] w-full ${
            isEnteringCafe ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          {/* 1. Horizontal Monochrome + Brushed-Platinum Klasik 3D Game Logo */}
          <img
            src="./klasik-logo.svg"
            alt="Klasik 3D — Garage Garden Cafe"
            data-testid="title-klasik-logo"
            className="w-[270px] sm:w-[360px] md:w-[400px] h-auto select-none pointer-events-none -ml-2"
            draggable={false}
          />

          {/* 2. Single Minimalist Slogan Directly Underneath (No Long Description) */}
          <p
            data-testid="title-slogan"
            className="mt-2 sm:mt-2.5 ml-1 text-xs sm:text-[14px] font-medium tracking-[0.09em] text-[#A1A1AA]"
          >
            Timeless pours. Quiet corners.
          </p>

          {/* 3. Primary CTA: Brushed Platinum Metallic Pill Button */}
          <div className="mt-6 sm:mt-7 ml-1 flex flex-col items-start gap-3">
            <button
              type="button"
              data-start="true"
              data-testid="btn-enter-garage"
              disabled={isEnteringCafe}
              onClick={(e) => {
                e.currentTarget.blur();
                handleTriggerOpenCafe('career');
              }}
              className="btn-brushed-platinum px-7 sm:px-8 py-3 sm:py-3.5 rounded-full font-extrabold text-xs sm:text-[13px] tracking-[0.2em] uppercase inline-flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-[#09090B] text-[#09090B] shrink-0" strokeWidth={2.5} />
              <span>OPEN THE CAFE</span>
            </button>

            {/* 4. Compact Monochrome Frosted-Glass Secondary Pill Row */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                data-testid="btn-title-views"
                onClick={() => {
                  setSettingsOpen(false);
                  onOpenViewsModal();
                }}
                className="title-mono-glass px-4 py-2 rounded-full text-xs font-medium tracking-[0.06em] inline-flex items-center gap-2 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#E4E4E7] shrink-0" strokeWidth={2} />
                <span>Views</span>
              </button>

              <button
                type="button"
                data-testid="btn-title-cats"
                onClick={() => {
                  setSettingsOpen(false);
                  onOpenCatsModal();
                }}
                className="title-mono-glass px-4 py-2 rounded-full text-xs font-medium tracking-[0.06em] inline-flex items-center gap-2 cursor-pointer"
              >
                <Cat className="w-3.5 h-3.5 text-[#E4E4E7] shrink-0" strokeWidth={2} />
                <span>Cats</span>
              </button>
            </div>
          </div>
        </div>

        {/* Clean Bottom Breathing Space (Zero Clutter) */}
        <div className="h-2 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
};
