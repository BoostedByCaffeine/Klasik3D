import React from 'react';
import {
  Cat,
  Clock,
  CloudRain,
  CloudSnow,
  CloudSun,
  Coffee,
  Lock,
  Moon,
  Mountain,
  Palette,
  Sparkles,
  Sprout,
  Sun,
  Sunrise,
  Sunset,
  X,
} from 'lucide-react';
import {
  DecorCustomization,
  RainPreference,
  SceneryId,
  TimeOfDayMode,
  WeatherMode,
  getScenerySpec,
  isAlwaysWinterScenery,
  isSnowAllowedForScenery,
} from '../game/rules';
import { StudioPreviewThumb } from './StudioPreviewThumb';

interface CustomizeModalProps {
  decor: DecorCustomization;
  weather: WeatherMode;
  timeOfDayMode: TimeOfDayMode;
  rainPreference: RainPreference;
  activeScenery: SceneryId;
  isSnowing?: boolean;
  equippedCatName?: string;
  unlockedCatsCount?: number;
  getDecorThumbnail?: (
    category: 'counterWood' | 'mugColor' | 'neonSignColor' | 'plantDensity',
    value: string
  ) => string;
  onUpdateDecor: (next: DecorCustomization) => void;
  onUpdateTimeOfDay: (mode: TimeOfDayMode) => void;
  onUpdateRainPreference: (rain: RainPreference) => void;
  onOpenCafeCats?: () => void;
  onOpenSceneries?: () => void;
  onClose: () => void;
}

export const CustomizeModal: React.FC<CustomizeModalProps> = ({
  decor,
  weather,
  timeOfDayMode,
  rainPreference,
  activeScenery,
  isSnowing = false,
  equippedCatName = 'Champy',
  unlockedCatsCount = 1,
  getDecorThumbnail,
  onUpdateDecor,
  onUpdateTimeOfDay,
  onUpdateRainPreference,
  onOpenCafeCats,
  onOpenSceneries,
  onClose,
}) => {
  const snowAllowed = isSnowAllowedForScenery(activeScenery);
  const alwaysWinter = isAlwaysWinterScenery(activeScenery);
  const scenerySpec = getScenerySpec(activeScenery);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-modal-title"
    >
      <div className="w-full max-w-2xl glass-modal rounded-2xl p-4 sm:p-5 space-y-3.5 max-h-[84vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between border-b border-white/12 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#18181B] border border-white/20 flex items-center justify-center text-[#E4E4E7] shrink-0">
              <Palette className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div>
              <h2
                id="customize-modal-title"
                className="text-base font-bold font-display text-white glass-text-crisp"
              >
                Cafe Decor, 3D Previews &amp; Weather
              </h2>
              <p className="text-[11px] text-[#A1A1AA]">
                Live single-context 3D studio renders · Active View:{' '}
                <strong className="text-white">{scenerySpec.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-customize"
            onClick={onClose}
            className="glass-btn-inner px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span>Close</span>
          </button>
        </div>

        <div className="space-y-3">
          {/* Countertop Timber with 3D Thumbnails */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#E4E4E7] flex items-center gap-1.5 glass-text-crisp">
              <Palette className="w-3.5 h-3.5 text-[#D4D4D8] shrink-0" strokeWidth={2.2} />
              <span>3D Barista Countertop Timber (5 Woods)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(
                [
                  { id: 'walnut', label: 'Warm Walnut', hex: '#4a2c18' },
                  { id: 'white-oak', label: 'White Oak', hex: '#a67c52' },
                  { id: 'charcoal-ash', label: 'Charcoal Ash', hex: '#2c2a29' },
                  { id: 'cherry-mahogany', label: 'Mahogany', hex: '#6b2114' },
                  { id: 'bamboo-zen', label: 'Kyoto Bamboo', hex: '#c4a46b' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateDecor({ ...decor, counterWood: opt.id })}
                  className={`p-1.5 rounded-xl text-[11px] font-medium cursor-pointer transition-all flex flex-col items-center gap-1 ${
                    decor.counterWood === opt.id
                      ? 'bg-white/[0.12] text-white font-bold border border-white/55 shadow-[0_0_16px_rgba(255,255,255,0.12)]'
                      : 'glass-btn-inner text-[#D4D4D8]'
                  }`}
                >
                  <StudioPreviewThumb
                    cacheKey={`decor:counterWood:${opt.id}`}
                    renderThumbnail={
                      getDecorThumbnail
                        ? () => getDecorThumbnail('counterWood', opt.id)
                        : undefined
                    }
                    alt={opt.label}
                    className="w-11 h-11 rounded-lg"
                    fallbackColorHex={opt.hex}
                  />
                  <span className="truncate max-w-full">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Porcelain Mug Glaze with 3D Thumbnails */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#E4E4E7] flex items-center gap-1.5 glass-text-crisp">
              <Coffee className="w-3.5 h-3.5 text-[#D4D4D8] shrink-0" strokeWidth={2.2} />
              <span>Porcelain Mug Glaze (6 Glazes)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {(
                [
                  { id: 'cream', label: 'Cream', hex: '#f8f5f0' },
                  { id: 'matte-black', label: 'Obsidian', hex: '#3f3f46' },
                  { id: 'sage-green', label: 'Sage', hex: '#bbf7d0' },
                  { id: 'terracotta', label: 'Clay', hex: '#d97757' },
                  { id: 'royal-gold', label: '24K Gold', hex: '#fbbf24' },
                  { id: 'sakura-pink', label: 'Sakura', hex: '#f9a8d4' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateDecor({ ...decor, mugColor: opt.id })}
                  className={`p-1.5 rounded-xl text-[11px] font-medium cursor-pointer transition-all flex flex-col items-center gap-1 ${
                    decor.mugColor === opt.id
                      ? 'bg-white/[0.12] text-white font-bold border border-white/55 shadow-[0_0_16px_rgba(255,255,255,0.12)]'
                      : 'glass-btn-inner text-[#D4D4D8]'
                  }`}
                >
                  <StudioPreviewThumb
                    cacheKey={`decor:mugColor:${opt.id}`}
                    renderThumbnail={
                      getDecorThumbnail ? () => getDecorThumbnail('mugColor', opt.id) : undefined
                    }
                    alt={opt.label}
                    className="w-10 h-10 rounded-lg"
                    fallbackColorHex={opt.hex}
                  />
                  <span className="truncate max-w-full">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hanging Neon Glow with 3D Thumbnails */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#E4E4E7] flex items-center gap-1.5 glass-text-crisp">
              <Sparkles className="w-3.5 h-3.5 text-[#D4D4D8] shrink-0" strokeWidth={2.2} />
              <span>3D Hanging Sign Neon Glow (5 Colors)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(
                [
                  { id: 'amber', label: 'Edison Amber', hex: '#f59e0b' },
                  { id: 'emerald', label: 'Emerald', hex: '#10b981' },
                  { id: 'rose', label: 'Sunset Rose', hex: '#f43f5e' },
                  { id: 'cyber-cyan', label: 'Cyber Cyan', hex: '#22d3ee' },
                  { id: 'violet-dream', label: 'Violet', hex: '#a855f7' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateDecor({ ...decor, neonSignColor: opt.id })}
                  className={`p-1.5 rounded-xl text-[11px] font-medium cursor-pointer transition-all flex flex-col items-center gap-1 ${
                    decor.neonSignColor === opt.id
                      ? 'bg-white/[0.12] text-white font-bold border border-white/55 shadow-[0_0_16px_rgba(255,255,255,0.12)]'
                      : 'glass-btn-inner text-[#D4D4D8]'
                  }`}
                >
                  <StudioPreviewThumb
                    cacheKey={`decor:neonSignColor:${opt.id}`}
                    renderThumbnail={
                      getDecorThumbnail
                        ? () => getDecorThumbnail('neonSignColor', opt.id)
                        : undefined
                    }
                    alt={opt.label}
                    className="w-11 h-11 rounded-lg"
                    fallbackColorHex={opt.hex}
                  />
                  <span className="truncate max-w-full">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#E4E4E7] flex items-center gap-1.5 glass-text-crisp">
                <Sprout className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2.2} />
                <span>Botanical Canopy Density</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'cozy', label: 'Cozy Courtyard' },
                    { id: 'lush-jungle', label: 'Lush Jungle' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateDecor({ ...decor, plantDensity: opt.id })}
                    className={`p-2 rounded-xl text-[11px] font-medium cursor-pointer transition-all flex items-center gap-2 ${
                      decor.plantDensity === opt.id
                        ? 'bg-white/[0.12] text-white font-bold border border-white/55 shadow-[0_0_16px_rgba(255,255,255,0.12)]'
                        : 'glass-btn-inner text-[#D4D4D8]'
                    }`}
                  >
                    <StudioPreviewThumb
                      cacheKey={`decor:plantDensity:${opt.id}`}
                      renderThumbnail={
                        getDecorThumbnail
                          ? () => getDecorThumbnail('plantDensity', opt.id)
                          : undefined
                      }
                      alt={opt.label}
                      className="w-10 h-10 rounded-lg"
                      fallbackColorHex="#166534"
                    />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time of Day & Scenery-Aware Weather (Clear / Rain / Snow / Always Winter) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#E4E4E7] flex items-center justify-between gap-1.5 glass-text-crisp">
                <span className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-[#D4D4D8] shrink-0" strokeWidth={2.2} />
                  <span>Time of Day &amp; Scenery Weather</span>
                </span>
                <span className="text-[10px] font-mono text-[#A1A1AA]">
                  {alwaysWinter
                    ? 'Always Winter · Snow'
                    : isSnowing
                    ? `${weather} · Snow`
                    : weather}
                </span>
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {(
                  [
                    { id: 'auto', label: 'Auto', Icon: Clock },
                    { id: 'dawn', label: 'Dawn', Icon: Sunrise },
                    { id: 'morning', label: 'Morning', Icon: Sun },
                    { id: 'noon', label: 'Noon', Icon: CloudSun },
                    { id: 'golden', label: 'Golden', Icon: Sunset },
                    { id: 'night', label: 'Night', Icon: Moon },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.Icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`btn-time-${opt.id}`}
                      onClick={() => onUpdateTimeOfDay(opt.id)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                        timeOfDayMode === opt.id
                          ? 'hud-platinum-pill font-bold'
                          : 'glass-btn-inner text-[#D4D4D8]'
                      }`}
                    >
                      <Icon className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {alwaysWinter ? (
                <div
                  data-testid="always-winter-weather-lock"
                  className="p-2.5 rounded-xl bg-sky-950/45 border border-sky-300/35 flex items-center justify-between gap-2 text-xs text-[#BAE6FD]"
                >
                  <div className="flex items-center gap-2">
                    <CloudSnow className="w-4 h-4 text-[#BAE6FD] shrink-0" strokeWidth={2.2} />
                    <div>
                      <div className="font-bold text-white">Always Winter — Perpetual Himalayan Snow</div>
                      <div className="text-[10px] text-[#BAE6FD]/85">
                        Mt. Everest Base Camp locks precipitation to Snow &amp; Winter gear.
                      </div>
                    </div>
                  </div>
                  <Lock className="w-4 h-4 text-[#BAE6FD] shrink-0" strokeWidth={2.2} />
                </div>
              ) : (
                <div
                  className={`grid gap-1.5 ${snowAllowed ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}
                >
                  {(
                    [
                      { id: 'auto' as const, label: 'Auto' },
                      { id: 'clear' as const, label: 'Clear Skies' },
                      { id: 'rain' as const, label: 'Rain Shower' },
                      ...(snowAllowed ? [{ id: 'snow' as const, label: 'Snowfall' }] : []),
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`btn-rain-${opt.id}`}
                      onClick={() => onUpdateRainPreference(opt.id)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                        rainPreference === opt.id
                          ? opt.id === 'snow'
                            ? 'bg-sky-400/22 text-[#BAE6FD] font-bold border border-sky-300/60 shadow'
                            : 'hud-platinum-pill font-bold'
                          : 'glass-btn-inner text-[#D4D4D8]'
                      }`}
                    >
                      {opt.id === 'rain' && (
                        <CloudRain className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                      )}
                      {opt.id === 'snow' && (
                        <CloudSnow className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                      )}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Quick Links to Sceneries & Cafe Cats */}
            <div className="pt-1.5 border-t border-white/12 flex flex-wrap items-center justify-between gap-2">
              {onOpenSceneries && (
                <button
                  type="button"
                  data-testid="btn-customize-open-sceneries"
                  onClick={onOpenSceneries}
                  className="px-3 py-1.5 rounded-lg glass-btn-inner text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Mountain className="w-3.5 h-3.5 text-[#D4D4D8] shrink-0" strokeWidth={2.2} />
                  <span>Outdoor Sceneries (9)</span>
                </button>
              )}

              {onOpenCafeCats && (
                <div className="flex items-center gap-2 ml-auto">
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-white">
                    <Cat className="w-4 h-4 text-[#D4D4D8] shrink-0" strokeWidth={2.2} />
                    <span>
                      <strong className="text-white">{equippedCatName}</strong>{' '}
                      <span className="text-[#A1A1AA]">({unlockedCatsCount}/9)</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-customize-open-cats"
                    onClick={onOpenCafeCats}
                    className="px-3 py-1.5 rounded-lg hud-platinum-pill text-xs font-bold cursor-pointer"
                  >
                    Cafe Cats Roster
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
