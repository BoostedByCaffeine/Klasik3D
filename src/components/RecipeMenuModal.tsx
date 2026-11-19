import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Coffee,
  CupSoda,
  Flame,
  Leaf,
  Lock,
  Monitor,
  Snowflake,
  Sparkles,
} from 'lucide-react';
import { DrinkCategory, DrinkRecipe, RECIPES } from '../game/rules';

interface RecipeMenuModalProps {
  currentDay: number;
  pinnedRecipeId?: string | null;
  pinnedCustomerName?: string | null;
  onClose: () => void;
}

type FilterCategory = 'all' | DrinkCategory;

interface StepChip {
  stepNum: number;
  label: string;
  stationTag: string;
  toneClass: string;
}

function buildStepPipeline(recipe: DrinkRecipe): StepChip[] {
  const chips: StepChip[] = [];
  let stepNum = 1;

  if (recipe.needsEspresso) {
    chips.push({
      stepNum: stepNum++,
      label: 'Grind',
      stationTag: 'St.2',
      toneClass: 'bg-amber-500/20 border-amber-400/45 text-amber-100',
    });
    chips.push({
      stepNum: stepNum++,
      label: 'Tamp',
      stationTag: 'St.2',
      toneClass: 'bg-amber-500/20 border-amber-400/45 text-amber-100',
    });
    chips.push({
      stepNum: stepNum++,
      label: 'Pull Shot',
      stationTag: 'St.2',
      toneClass: 'bg-orange-500/25 border-orange-400/55 text-orange-100',
    });
  }

  if (recipe.needsTeaSteep) {
    chips.push({
      stepNum: stepNum++,
      label: 'Steep Tea',
      stationTag: 'St.3',
      toneClass: 'bg-lime-500/20 border-lime-400/50 text-lime-100',
    });
  }

  if (recipe.syrup !== 'none') {
    const flavorName = recipe.syrup.charAt(0).toUpperCase() + recipe.syrup.slice(1);
    chips.push({
      stepNum: stepNum++,
      label: `+${flavorName}`,
      stationTag: 'St.3',
      toneClass: 'bg-fuchsia-500/20 border-fuchsia-400/45 text-fuchsia-100',
    });
  }

  if (recipe.needsIce) {
    chips.push({
      stepNum: stepNum++,
      label: '+Ice',
      stationTag: 'St.3',
      toneClass: 'bg-sky-500/20 border-sky-400/50 text-sky-100',
    });
  }

  if (recipe.needsSteamedMilk) {
    chips.push({
      stepNum: stepNum++,
      label: 'Steam Milk',
      stationTag: 'St.3',
      toneClass: 'bg-stone-200/15 border-stone-300/45 text-stone-100',
    });
  }

  chips.push({
    stepNum: stepNum++,
    label: 'Serve',
    stationTag: 'St.4',
    toneClass: 'bg-emerald-500/25 border-emerald-400/55 text-emerald-100',
  });

  return chips;
}

export const RecipeMenuModal: React.FC<RecipeMenuModalProps> = ({
  currentDay,
  pinnedRecipeId,
  pinnedCustomerName,
  onClose,
}) => {
  const [filter, setFilter] = useState<FilterCategory>('all');

  const counts = useMemo(
    () => ({
      all: RECIPES.length,
      hot_coffee: RECIPES.filter((r) => r.category === 'hot_coffee').length,
      iced_coffee: RECIPES.filter((r) => r.category === 'iced_coffee').length,
      tea: RECIPES.filter((r) => r.category === 'tea').length,
      cold_drink: RECIPES.filter((r) => r.category === 'cold_drink').length,
    }),
    []
  );

  const tabs: Array<{ id: FilterCategory; label: string; count: number; icon: React.ReactNode }> = [
    {
      id: 'all',
      label: 'All Drinks',
      count: counts.all,
      icon: <Coffee className="w-4 h-4 shrink-0" strokeWidth={2.2} />,
    },
    {
      id: 'hot_coffee',
      label: 'Hot Coffee',
      count: counts.hot_coffee,
      icon: <Flame className="w-4 h-4 text-amber-300 shrink-0" strokeWidth={2.2} />,
    },
    {
      id: 'iced_coffee',
      label: 'Iced Coffee',
      count: counts.iced_coffee,
      icon: <Snowflake className="w-4 h-4 text-sky-300 shrink-0" strokeWidth={2.2} />,
    },
    {
      id: 'tea',
      label: 'Artisanal Tea',
      count: counts.tea,
      icon: <Leaf className="w-4 h-4 text-lime-300 shrink-0" strokeWidth={2.2} />,
    },
    {
      id: 'cold_drink',
      label: 'Cold Drinks',
      count: counts.cold_drink,
      icon: <CupSoda className="w-4 h-4 text-rose-300 shrink-0" strokeWidth={2.2} />,
    },
  ];

  const filteredRecipes = useMemo(() => {
    const list = filter === 'all' ? RECIPES : RECIPES.filter((r) => r.category === filter);
    // Keep pinned active order at top so the barista spots it immediately
    if (!pinnedRecipeId) return list;
    return [...list].sort((a, b) => {
      if (a.id === pinnedRecipeId) return -1;
      if (b.id === pinnedRecipeId) return 1;
      return 0;
    });
  }, [filter, pinnedRecipeId]);

  const pinnedRecipe = pinnedRecipeId
    ? RECIPES.find((r) => r.id === pinnedRecipeId) || null
    : null;

  return (
    <div
      data-testid="pos-codex-overlay"
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/20"
    >
      {/* Diegetic 3D POS Monitor Bezel Frame (keeps cafe counter & bokeh visible at viewport edges) */}
      <div
        data-testid="pos-codex-terminal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[86vw] sm:max-w-[80vw] max-h-[80dvh] h-[76dvh] pos-terminal-bezel rounded-2xl overflow-hidden flex flex-col"
      >
        {/* Top POS Terminal Header Bar */}
        <div className="px-3 sm:px-5 py-2.5 border-b border-emerald-400/25 bg-[#0a1311]/95 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Monitor className="w-4 h-4 text-emerald-300" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-display font-bold text-[#FAF5EE] tracking-tight truncate">
                  KLASIK POS · Barista Codex
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/35 text-[11px] font-mono font-bold text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  LIVE
                </span>
              </div>
              <p className="text-xs text-[#C8DFD4] truncate">
                {pinnedRecipe && pinnedCustomerName
                  ? `Active Order (${pinnedCustomerName}): ${pinnedRecipe.name}`
                  : '16 Specialty Hot & Iced Coffees, Artisanal Teas & Cold Refreshers'}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-close-codex"
            onClick={onClose}
            className="px-3 sm:px-4 py-2 min-h-[40px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-105 text-[#160E09] text-xs sm:text-sm font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-md shrink-0"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            <span>Return to Counter</span>
          </button>
        </div>

        {/* Main POS Display Area: Left Touch-Friendly Category Rail + Right Large Recipe Cards */}
        <div className="flex-1 min-h-0 flex pos-terminal-screen overflow-hidden">
          {/* Left Vertical Rail */}
          <nav
            aria-label="Drink Categories"
            className="w-40 sm:w-52 shrink-0 border-r border-emerald-400/20 bg-[#08100e]/85 p-2 sm:p-3 flex flex-col gap-1.5 overflow-y-auto"
          >
            <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-emerald-300/75">
              Categories
            </div>
            {tabs.map((tab) => {
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`codex-tab-${tab.id}`}
                  onClick={() => setFilter(tab.id)}
                  className={`w-full min-h-[42px] px-2.5 sm:px-3 py-2 rounded-xl border text-left text-xs sm:text-sm font-semibold cursor-pointer transition-all flex items-center justify-between gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-[#160E09] border-amber-300 shadow-[0_4px_14px_-4px_rgba(245,158,11,0.55)] font-bold'
                      : 'bg-white/[0.04] hover:bg-emerald-500/10 border-emerald-400/20 text-[#E7F2EC]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    {tab.icon}
                    <span className="truncate">{tab.label}</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold shrink-0 ${
                      isActive ? 'bg-black/20 text-[#160E09]' : 'bg-black/40 text-emerald-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right Recipe Card Grid */}
          <div className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredRecipes.map((recipe) => {
                const locked = recipe.unlockDay > currentDay;
                const isPinnedActive = recipe.id === pinnedRecipeId;
                const steps = buildStepPipeline(recipe);

                return (
                  <article
                    key={recipe.id}
                    data-testid={`codex-recipe-${recipe.id}`}
                    className={`rounded-xl p-3.5 sm:p-4 border transition-all flex flex-col gap-2.5 ${
                      isPinnedActive
                        ? 'bg-amber-500/15 border-amber-400/80 shadow-[0_0_24px_-6px_rgba(245,158,11,0.45)]'
                        : locked
                        ? 'bg-black/40 border-white/10 opacity-70'
                        : 'bg-[#101c19]/85 border-emerald-400/25 hover:border-amber-400/45'
                    }`}
                  >
                    {/* Card Header: Color Dot + Bold 16-18px Title + Price Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-4 h-4 rounded-full border-2 border-white/40 shrink-0 shadow-sm"
                          style={{ backgroundColor: recipe.colorHex }}
                        />
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-display font-bold text-[#FAF5EE] leading-snug">
                            {recipe.name}
                          </h3>
                          {isPinnedActive && (
                            <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-amber-400 text-[#160E09] text-[10px] font-mono font-extrabold uppercase tracking-wider">
                              <Sparkles className="w-3 h-3" strokeWidth={2.4} />
                              Active Order{pinnedCustomerName ? ` · ${pinnedCustomerName}` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 font-mono font-extrabold text-sm sm:text-base tabular-nums">
                          ${recipe.price}
                        </span>
                        {locked && (
                          <span className="text-[10px] font-mono text-amber-300 inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" strokeWidth={2.2} />
                            Day {recipe.unlockDay}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-[#CDE0D7]/90 leading-relaxed">
                      {recipe.tagline}
                    </p>

                    {/* Scannable Color-Coded Visual Step Pipeline Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10">
                      {steps.map((chip, idx) => (
                        <React.Fragment key={`${recipe.id}-step-${chip.stepNum}`}>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold ${chip.toneClass}`}
                          >
                            <span className="font-mono font-bold opacity-80">
                              {chip.stepNum}.
                            </span>
                            <span>{chip.label}</span>
                            <span className="text-[10px] font-mono opacity-75 bg-black/30 px-1 rounded">
                              {chip.stationTag}
                            </span>
                          </span>
                          {idx < steps.length - 1 && (
                            <ChevronRight className="w-3.5 h-3.5 text-emerald-300/60 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
