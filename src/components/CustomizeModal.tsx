import React from 'react';
import {
  Cat,
  CloudLightning,
  CloudRain,
  Coffee,
  Moon,
  Palette,
  Sparkles,
  Sprout,
  Sun,
  Sunset,
  X,
} from 'lucide-react';
import { DecorCustomization, WeatherMode } from '../game/rules';

interface CustomizeModalProps {
  decor: DecorCustomization;
  weather: WeatherMode;
  equippedCatName?: string;
  unlockedCatsCount?: number;
  onUpdateDecor: (next: DecorCustomization) => void;
  onUpdateWeather: (weather: WeatherMode) => void;
  onOpenCafeCats?: () => void;
  onClose: () => void;
}

export const CustomizeModal: React.FC<CustomizeModalProps> = ({
  decor,
  weather,
  equippedCatName = 'Champy',
  unlockedCatsCount = 1,
  onUpdateDecor,
  onUpdateWeather,
  onOpenCafeCats,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-modal-title"
    >
      <div className="w-full max-w-lg glass-modal rounded-2xl p-4 sm:p-5 space-y-3.5 max-h-[82vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between border-b border-amber-400/20 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Palette className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div>
              <h2
                id="customize-modal-title"
                className="text-base font-bold font-display text-[#FAF5EE] glass-text-crisp"
              >
                Cafe Decor, Architecture &amp; Lighting (20 Options)
              </h2>
              <p className="text-[11px] text-[#E7D7C1]">
                Customize your 3D countertop timber, ceramic mug glaze, neon sign, and greenery.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-customize"
            onClick={onClose}
            className="glass-btn-inner px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span>Close</span>
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-amber-200 flex items-center gap-1.5 glass-text-crisp">
              <Palette className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
              <span>3D Barista Countertop Timber (5 Woods)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(
                [
                  { id: 'walnut', label: 'Warm Walnut' },
                  { id: 'white-oak', label: 'White Oak' },
                  { id: 'charcoal-ash', label: 'Charcoal Ash' },
                  { id: 'cherry-mahogany', label: 'Mahogany' },
                  { id: 'bamboo-zen', label: 'Kyoto Bamboo' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateDecor({ ...decor, counterWood: opt.id })}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all ${
                    decor.counterWood === opt.id
                      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] font-bold border border-amber-300 shadow'
                      : 'glass-btn-inner'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-amber-200 flex items-center gap-1.5 glass-text-crisp">
              <Coffee className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
              <span>Porcelain Mug Glaze (6 Glazes)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {(
                [
                  { id: 'cream', label: 'Cream' },
                  { id: 'matte-black', label: 'Obsidian' },
                  { id: 'sage-green', label: 'Sage' },
                  { id: 'terracotta', label: 'Clay' },
                  { id: 'royal-gold', label: '24K Gold' },
                  { id: 'sakura-pink', label: 'Sakura' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateDecor({ ...decor, mugColor: opt.id })}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all ${
                    decor.mugColor === opt.id
                      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] font-bold border border-amber-300 shadow'
                      : 'glass-btn-inner'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-amber-200 flex items-center gap-1.5 glass-text-crisp">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
              <span>3D Hanging Sign Neon Glow (5 Colors)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(
                [
                  { id: 'amber', label: 'Edison Amber' },
                  { id: 'emerald', label: 'Emerald' },
                  { id: 'rose', label: 'Sunset Rose' },
                  { id: 'cyber-cyan', label: 'Cyber Cyan' },
                  { id: 'violet-dream', label: 'Violet' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateDecor({ ...decor, neonSignColor: opt.id })}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all ${
                    decor.neonSignColor === opt.id
                      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] font-bold border border-amber-300 shadow'
                      : 'glass-btn-inner'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-amber-200 flex items-center gap-1.5 glass-text-crisp">
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
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all ${
                      decor.plantDensity === opt.id
                        ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] font-bold border border-amber-300 shadow'
                        : 'glass-btn-inner'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-amber-200 flex items-center gap-1.5 glass-text-crisp">
                <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
                <span>Atmosphere, Shift &amp; Granular Weather (5 Modes)</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {(
                  [
                    { id: 'morning', label: 'Morning', Icon: Sun },
                    { id: 'golden', label: 'Golden', Icon: Sunset },
                    { id: 'rainy', label: 'Rainy', Icon: CloudRain },
                    { id: 'night', label: 'Night Shift', Icon: Moon },
                    { id: 'rainy-night', label: 'Rainy Night', Icon: CloudLightning },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.Icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`btn-weather-${opt.id}`}
                      onClick={() => onUpdateWeather(opt.id)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium cursor-pointer transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                        weather === opt.id
                          ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] font-bold border border-amber-300 shadow'
                          : 'glass-btn-inner'
                      }`}
                    >
                      <Icon className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {onOpenCafeCats && (
              <div className="pt-1 border-t border-amber-400/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-[#FAF5EE]">
                  <Cat className="w-4 h-4 text-amber-300 shrink-0" strokeWidth={2.2} />
                  <span>
                    Counter Cat: <strong className="text-amber-300">{equippedCatName}</strong>{' '}
                    <span className="text-[#E7D7C1]/80">({unlockedCatsCount}/9 Unlocked)</span>
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="btn-customize-open-cats"
                  onClick={onOpenCafeCats}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] text-xs font-bold cursor-pointer shadow"
                >
                  Cafe Cats Roster
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
