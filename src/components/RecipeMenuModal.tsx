import React, { useState } from 'react';
import { BookOpen, CupSoda, Flame, Layers, Leaf, Snowflake, X } from 'lucide-react';
import { DrinkCategory, RECIPES } from '../game/rules';

interface RecipeMenuModalProps {
  currentDay: number;
  onClose: () => void;
}

const CATEGORY_TABS: Array<{
  id: 'all' | DrinkCategory;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'all', label: `All (${RECIPES.length})`, Icon: Layers },
  { id: 'hot_coffee', label: 'Hot Coffee', Icon: Flame },
  { id: 'iced_coffee', label: 'Iced Coffee', Icon: Snowflake },
  { id: 'tea', label: 'Artisanal Tea', Icon: Leaf },
  { id: 'cold_drink', label: 'Cold Refreshers', Icon: CupSoda },
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
    return steps.join(' -> ');
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-modal-title"
    >
      <div className="w-full max-w-2xl glass-modal rounded-2xl p-4 sm:p-5 space-y-3 max-h-[84vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-amber-400/20 pb-2.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <BookOpen className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div>
              <h2
                id="recipe-modal-title"
                className="text-base font-bold font-display text-[#FAF5EE] glass-text-crisp"
              >
                Barista Recipe Codex (Hot Coffee, Iced Coffee, Tea &amp; Cold Drinks)
              </h2>
              <p className="text-[11px] text-[#E7D7C1]">
                Follow the step-by-step brewing or tea-steeping sequence for 100% accuracy tips.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-btn-inner px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span>Close</span>
          </button>
        </div>

        {/* Category Filter Ribbon (Offline Lucide Icons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 shrink-0">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.Icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                  selectedCategory === tab.id
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] font-bold shadow'
                    : 'glass-btn-inner'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1">
          {filteredRecipes.map((recipe) => {
            const unlocked = recipe.unlockDay <= currentDay;
            return (
              <div
                key={recipe.id}
                className={`p-3 rounded-xl border space-y-1.5 ${
                  unlocked
                    ? 'bg-white/[0.06] border-amber-400/20'
                    : 'bg-black/25 border-white/10 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/25"
                      style={{ backgroundColor: recipe.colorHex }}
                    />
                    <h3 className="text-xs font-bold text-[#FAF5EE] glass-text-crisp truncate">{recipe.name}</h3>
                  </div>
                  <span className="text-xs font-bold font-mono tabular-nums text-emerald-300 shrink-0">
                    ${recipe.price}
                  </span>
                </div>

                <p className="text-[11px] text-[#E7D7C1] leading-snug line-clamp-2">
                  {recipe.tagline}
                </p>

                <div className="text-[10px] font-mono text-amber-200 bg-black/35 px-2 py-1 rounded border border-amber-400/25">
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
