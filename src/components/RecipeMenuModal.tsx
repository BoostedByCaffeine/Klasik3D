import React, { useState } from 'react';
import { DrinkCategory, RECIPES } from '../game/rules';

interface RecipeMenuModalProps {
  currentDay: number;
  onClose: () => void;
}

const CATEGORY_TABS: Array<{ id: 'all' | DrinkCategory; label: string }> = [
  { id: 'all', label: `All (${RECIPES.length})` },
  { id: 'hot_coffee', label: '🔥 Hot Coffee' },
  { id: 'iced_coffee', label: '🧊 Iced Coffee' },
  { id: 'tea', label: '🍵 Artisanal Tea' },
  { id: 'cold_drink', label: '🥤 Cold Refreshers' },
];

export const RecipeMenuModal: React.FC<RecipeMenuModalProps> = ({ currentDay, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | DrinkCategory>('all');

  const filteredRecipes =
    selectedCategory === 'all'
      ? RECIPES
      : RECIPES.filter((r) => r.category === selectedCategory);

  const getStepSequenceText = (recipe: (typeof RECIPES)[number]) => {
    const steps: string[] = [];
    if (recipe.needsEspresso) {
      steps.push('1. Grind', '2. Tamp', '3. Pull Shot');
    }
    if (recipe.needsTeaSteep) {
      steps.push(`${steps.length + 1}. Steep Tea`);
    }
    if (recipe.syrup !== 'none') {
      steps.push(
        `${steps.length + 1}. +${recipe.syrup.charAt(0).toUpperCase() + recipe.syrup.slice(1)}`
      );
    }
    if (recipe.needsIce) {
      steps.push(`${steps.length + 1}. +Ice`);
    }
    if (recipe.needsSteamedMilk) {
      steps.push(`${steps.length + 1}. Steam Milk`);
    }
    steps.push(`${steps.length + 1}. Serve`);
    return steps.join(' ➔ ');
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#1b120d] border border-[#5c3a21] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3 max-h-[84vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5 shrink-0">
          <div>
            <h2 id="recipe-modal-title" className="text-base font-bold font-display text-amber-100">
              Barista Recipe Codex (Hot Coffee, Iced Coffee, Tea &amp; Cold Drinks)
            </h2>
            <p className="text-[11px] text-stone-400">
              Follow the step-by-step brewing or tea-steeping sequence for 100% accuracy tips.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#291c14] hover:bg-[#38261b] text-xs font-semibold text-stone-200 cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Category Filter Ribbon */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 shrink-0">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                selectedCategory === tab.id
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'bg-[#241811] text-stone-300 border border-stone-800 hover:border-stone-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1">
          {filteredRecipes.map((recipe) => {
            const unlocked = recipe.unlockDay <= currentDay;
            return (
              <div
                key={recipe.id}
                className={`p-3 rounded-xl border space-y-1.5 ${
                  unlocked
                    ? 'bg-[#241811] border-stone-800'
                    : 'bg-[#17100c] border-stone-900 opacity-75'
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

                <div className="text-[10px] font-mono text-amber-300/95 bg-stone-950/60 px-2 py-1 rounded border border-amber-500/20">
                  {getStepSequenceText(recipe)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
