import React from 'react';
import { RECIPES } from '../game/rules';

interface RecipeMenuModalProps {
  currentDay: number;
  onClose: () => void;
}

export const RecipeMenuModal: React.FC<RecipeMenuModalProps> = ({ currentDay, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-modal-title"
    >
      <div className="w-full max-w-lg bg-[#1b120d] border border-[#5c3a21] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <div>
            <h2 id="recipe-modal-title" className="text-base font-bold font-display text-amber-100">
              Barista Recipe Codex
            </h2>
            <p className="text-[11px] text-stone-400">
              Match espresso, milk, ice, and syrup proportions for 100% accuracy tips.
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

        <div className="grid grid-cols-2 gap-2.5">
          {RECIPES.map((recipe) => {
            const unlocked = recipe.unlockDay <= currentDay;
            return (
              <div
                key={recipe.id}
                className={`p-3 rounded-xl border space-y-1.5 ${
                  unlocked
                    ? 'bg-[#241811] border-stone-800'
                    : 'bg-[#17100c] border-stone-900 opacity-65'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                      style={{ backgroundColor: recipe.colorHex }}
                    />
                    <h3 className="text-xs font-bold text-amber-100 truncate">{recipe.name}</h3>
                  </div>
                  <span className="text-xs font-bold font-mono tabular-nums text-emerald-400 shrink-0">
                    ${recipe.price}
                  </span>
                </div>

                <p className="text-[11px] text-stone-400 leading-snug line-clamp-2">
                  {recipe.tagline}
                </p>

                <div className="flex flex-wrap items-center gap-1 text-[10px] text-amber-200/90 font-medium">
                  <span>{recipe.needsEspresso ? 'Espresso' : 'No Shot'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{recipe.needsSteamedMilk ? 'Milk' : 'No Milk'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{recipe.needsIce ? 'Iced' : 'Hot'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">
                    {recipe.syrup === 'none' ? 'Plain' : recipe.syrup}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
