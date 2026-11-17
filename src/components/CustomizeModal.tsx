import React from 'react';
import { DecorCustomization, WeatherMode } from '../game/rules';

interface CustomizeModalProps {
  decor: DecorCustomization;
  weather: WeatherMode;
  onUpdateDecor: (next: DecorCustomization) => void;
  onUpdateWeather: (weather: WeatherMode) => void;
  onClose: () => void;
}

export const CustomizeModal: React.FC<CustomizeModalProps> = ({
  decor,
  weather,
  onUpdateDecor,
  onUpdateWeather,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-modal-title"
    >
      <div className="w-full max-w-lg bg-[#1b120d] border border-[#5c3a21] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[82vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <div>
            <h2 id="customize-modal-title" className="text-base font-bold font-display text-amber-100">
              Cafe Decor, Architecture &amp; Lighting (18 Options)
            </h2>
            <p className="text-[11px] text-stone-400">
              Customize your 3D countertop timber, ceramic mug glaze, neon sign, and greenery.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-[#291c14] hover:bg-[#38261b] text-xs font-semibold text-stone-200 cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-amber-200 block">
              3D Barista Countertop Timber (5 Woods)
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
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                    decor.counterWood === opt.id
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                      : 'bg-[#241811] text-stone-300 border-stone-800 hover:border-stone-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-amber-200 block">
              Porcelain Mug Glaze (6 Glazes)
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
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                    decor.mugColor === opt.id
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                      : 'bg-[#241811] text-stone-300 border-stone-800 hover:border-stone-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-amber-200 block">
              3D Hanging Sign Neon Glow (5 Colors)
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
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                    decor.neonSignColor === opt.id
                      ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                      : 'bg-[#241811] text-stone-300 border-stone-800 hover:border-stone-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-amber-200 block">
                Botanical Canopy Density
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
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                      decor.plantDensity === opt.id
                        ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                        : 'bg-[#241811] text-stone-300 border-stone-800 hover:border-stone-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-amber-200 block">
                Atmosphere &amp; Rain Simulation
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'morning', label: 'Morning' },
                    { id: 'golden', label: 'Golden' },
                    { id: 'rainy', label: 'Rainy' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateWeather(opt.id)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                      weather === opt.id
                        ? 'bg-amber-500 text-stone-950 font-bold border-amber-400'
                        : 'bg-[#241811] text-stone-300 border-stone-800 hover:border-stone-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
