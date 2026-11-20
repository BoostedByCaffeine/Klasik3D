import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Brush,
  Check,
  ChevronLeft,
  ChevronRight,
  Cookie,
  Crown,
  Glasses,
  Hand,
  Lock,
  RotateCw,
  Shirt,
  Sparkles,
  X,
} from 'lucide-react';
import {
  BASE_CAT_COSMETIC_IDS,
  CAT_COSMETICS_CATALOG,
  CatCosmeticId,
  CatCosmeticSlot,
  CafeCatId,
  KlasikGameState,
  getCafeCatSpec,
  getEffectiveVisibleLoadout,
  normalizeCatLoadout,
} from '../game/rules';

export type CatStationActionMode = 'pet' | 'comb' | 'treat' | 'customize';

interface CatStationOverlayProps {
  gameState: KlasikGameState;
  mode: CatStationActionMode;
  customizeOpen: boolean;
  waitingOrdersCount: number;
  onChangeMode: (mode: CatStationActionMode) => void;
  onToggleCustomize: (open: boolean) => void;
  onSelectCat: (catId: CafeCatId) => void;
  onPetAction: () => void;
  onTossTreat: () => void;
  onPurchaseCosmetic: (cosmeticId: CatCosmeticId) => void;
  onToggleEquipCosmetic: (catId: CafeCatId, cosmeticId: CatCosmeticId) => void;
  onClose: () => void;
}

const WARDROBE_TABS: Array<{
  id: CatCosmeticSlot;
  label: string;
}> = [
  { id: 'eyewear', label: 'Eyewear' },
  { id: 'headwear', label: 'Head' },
  { id: 'neckwear', label: 'Neck' },
  { id: 'body', label: 'Cloth' },
  { id: 'full_suit', label: 'Costume' },
];

export const CatStationOverlay: React.FC<CatStationOverlayProps> = ({
  gameState,
  mode,
  customizeOpen,
  waitingOrdersCount,
  onChangeMode,
  onToggleCustomize,
  onSelectCat,
  onPetAction,
  onTossTreat,
  onPurchaseCosmetic,
  onToggleEquipCosmetic,
  onClose,
}) => {
  const [wardrobeTab, setWardrobeTab] = useState<CatCosmeticSlot>('eyewear');

  const unlockedCats = gameState.unlockedCats || ['champy'];
  const activeCatId = gameState.equippedCatId || 'champy';
  const activeCatSpec = getCafeCatSpec(activeCatId);
  const currentIdx = Math.max(0, unlockedCats.indexOf(activeCatId));

  const unlockedCosmetics = useMemo(
    () => new Set<CatCosmeticId>(gameState.unlockedCosmetics || []),
    [gameState.unlockedCosmetics]
  );

  const ownedBaseCount = BASE_CAT_COSMETIC_IDS.filter((id) => unlockedCosmetics.has(id)).length;
  const activeLoadout = normalizeCatLoadout(gameState.catLoadouts?.[activeCatId]);
  const effectiveLoadout = getEffectiveVisibleLoadout(activeLoadout);

  const handleCycleCat = (delta: number) => {
    if (unlockedCats.length <= 1) return;
    const nextIdx = (currentIdx + delta + unlockedCats.length) % unlockedCats.length;
    onSelectCat(unlockedCats[nextIdx]);
  };

  const tabItems = CAT_COSMETICS_CATALOG.filter((item) => item.slot === wardrobeTab);

  const modeHint = customizeOpen
    ? 'Drag cat on the left to rotate 360° preview'
    : mode === 'pet'
    ? 'Tap or gently rub the cat for purrs & hearts'
    : mode === 'comb'
    ? 'Drag the wooden brush across fur for golden sparkles'
    : 'Tap the cat or Treat button to toss a fish biscuit!';

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 overflow-hidden"
      data-testid="cat-station-overlay"
    >
      {/* TOP BAR: Back to Cafe | Cat Switcher | Waiting Orders Bell (Patience Paused) */}
      <div className="flex items-center justify-between gap-2 pointer-events-none">
        <button
          type="button"
          data-testid="btn-cat-station-back"
          onClick={onClose}
          className="pointer-events-auto px-3 py-1.5 rounded-xl bg-[#090705]/85 hover:bg-[#1a130d]/95 border border-[#f5a623]/40 text-[#FAF5EE] text-xs font-bold flex items-center gap-1.5 backdrop-blur-md cursor-pointer shadow-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#f5a623] shrink-0" strokeWidth={2.4} />
          <span>Back to Cafe</span>
        </button>

        {/* Cat Switcher Pill */}
        <div
          className="pointer-events-auto flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#090705]/85 border border-[#f5a623]/40 backdrop-blur-md shadow-lg"
          data-testid="cat-station-switcher"
        >
          <button
            type="button"
            data-testid="btn-cat-prev"
            disabled={unlockedCats.length <= 1}
            onClick={() => handleCycleCat(-1)}
            className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-[#f5a623] disabled:opacity-35 cursor-pointer disabled:cursor-default"
            aria-label="Previous Cat"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.4} />
          </button>

          <div className="px-2 text-center min-w-[110px]">
            <div className="text-xs sm:text-sm font-bold text-[#FAF5EE] leading-tight flex items-center justify-center gap-1">
              <span>{activeCatSpec.name}</span>
              {activeCatSpec.isSecret && (
                <Sparkles className="w-3 h-3 text-[#f5a623]" strokeWidth={2.4} />
              )}
            </div>
            <div className="text-[9px] font-mono text-[#E7D7C1]/80">
              {currentIdx + 1} / {unlockedCats.length} · {activeCatSpec.sizeSummary}
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-cat-next"
            disabled={unlockedCats.length <= 1}
            onClick={() => handleCycleCat(1)}
            className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-[#f5a623] disabled:opacity-35 cursor-pointer disabled:cursor-default"
            aria-label="Next Cat"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.4} />
          </button>
        </div>

        {/* Right Status: Patience Paused + Subtle Waiting-Order Bell */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-xl bg-[#090705]/80 border border-emerald-400/35 text-[10px] font-mono font-semibold text-emerald-300 backdrop-blur-md">
            Mood Paused
          </span>
          {waitingOrdersCount > 0 && (
            <button
              type="button"
              data-testid="cat-station-waiting-bell"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-[#f5a623]/20 hover:bg-[#f5a623]/30 border border-[#f5a623]/70 text-[#f5a623] text-[11px] font-bold flex items-center gap-1 backdrop-blur-md cursor-pointer"
              title="Customers are waiting at the counter — tap to return to cafe"
            >
              <Bell className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
              <span>{waitingOrdersCount} Waiting</span>
            </button>
          )}
        </div>
      </div>

      {/* RIGHT-SIDE 40% GLASSMORPHISM CAT WARDROBE DRAWER */}
      {customizeOpen && (
        <aside
          data-testid="cat-wardrobe-drawer"
          className="pointer-events-auto fixed top-14 right-2.5 sm:right-4 bottom-16 w-[44%] sm:w-[40%] max-w-[380px] min-w-[240px] rounded-2xl bg-[#090705]/90 border border-[#f5a623]/40 backdrop-blur-xl shadow-[0_24px_60px_-10px_rgba(0,0,0,0.85)] p-2.5 sm:p-3 flex flex-col gap-2 text-[#FAF5EE]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#f5a623]/20 pb-1.5 shrink-0">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-[#FAF5EE] truncate">
                {activeCatSpec.name}&apos;s Wardrobe
              </h3>
              <p className="text-[10px] text-[#E7D7C1]/75 flex items-center gap-1">
                <RotateCw className="w-2.5 h-2.5 text-[#f5a623]" strokeWidth={2.3} />
                <span>Drag cat to rotate · Cash ${Math.round(gameState.cash).toLocaleString()}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleCustomize(false)}
              className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-[#f5a623]/25 text-[#E7D7C1] cursor-pointer"
              aria-label="Close Wardrobe"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.2} />
            </button>
          </div>

          {/* 5 Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
            {WARDROBE_TABS.map((tab) => {
              const active = wardrobeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`wardrobe-tab-${tab.id}`}
                  onClick={() => setWardrobeTab(tab.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all ${
                    active
                      ? 'bg-[#f5a623] text-[#090705] shadow'
                      : 'bg-white/[0.06] text-[#E7D7C1] hover:text-[#FAF5EE]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Cloth Quick Swatches Row when Cloth Tab is Active */}
          {wardrobeTab === 'body' && (
            <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl bg-white/[0.04] border border-[#f5a623]/20 shrink-0">
              <span className="text-[10px] font-semibold text-[#E7D7C1]">Knit Colors:</span>
              <div className="flex items-center gap-1.5">
                {tabItems.map((cloth) => {
                  const owned = unlockedCosmetics.has(cloth.id);
                  const equipped = activeLoadout.body === cloth.id;
                  return (
                    <button
                      key={cloth.id}
                      type="button"
                      data-testid={`swatch-${cloth.id}`}
                      onClick={() =>
                        owned
                          ? onToggleEquipCosmetic(activeCatId, cloth.id)
                          : onPurchaseCosmetic(cloth.id)
                      }
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 flex items-center justify-center ${
                        equipped
                          ? 'border-[#FAF5EE] scale-110 shadow-[0_0_10px_rgba(245,166,35,0.8)]'
                          : owned
                          ? 'border-[#f5a623]/70'
                          : 'border-white/25 opacity-70'
                      }`}
                      style={{ backgroundColor: cloth.swatchHex || '#e65a4f' }}
                      title={
                        owned
                          ? `${cloth.name} (${equipped ? 'Equipped' : 'Tap to Equip'})`
                          : `${cloth.name} ($${cloth.cost})`
                      }
                    >
                      {equipped && <Check className="w-3 h-3 text-white drop-shadow" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
            {tabItems.map((item) => {
              const isOwned = unlockedCosmetics.has(item.id);
              const isEquipped =
                item.slot === 'full_suit'
                  ? activeLoadout.full_suit === item.id
                  : activeLoadout[item.slot] === item.id;
              const isOverriddenByDino =
                Boolean(effectiveLoadout.full_suit) &&
                (item.slot === 'headwear' || item.slot === 'body') &&
                isEquipped;
              const isGrossMilestone =
                item.unlockType === 'revenue' || item.unlockType === 'golden_espresso';
              const canBuyCash =
                !isOwned && item.unlockType === 'shop' && gameState.cash >= item.cost;

              const grossPct = isGrossMilestone
                ? Math.min(
                    100,
                    Math.round(((gameState.lifetimeGrossIncome || 0) / item.cost) * 100)
                  )
                : 100;
              const dinoPct = Math.round((ownedBaseCount / BASE_CAT_COSMETIC_IDS.length) * 100);

              return (
                <div
                  key={item.id}
                  data-testid={`cosmetic-card-${item.id}`}
                  className={`p-2 rounded-xl border flex flex-col gap-1.5 ${
                    isEquipped
                      ? 'bg-[#f5a623]/18 border-[#f5a623]/80'
                      : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {item.swatchHex && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                          style={{ backgroundColor: item.swatchHex }}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#FAF5EE] truncate">{item.name}</div>
                        <div className="text-[10px] text-[#E7D7C1]/75 leading-tight">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isOverriddenByDino && (
                    <div className="text-[9px] font-mono text-amber-300">
                      Hidden while Dinosaur Costume is worn
                    </div>
                  )}

                  {!isOwned && isGrossMilestone && (
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[9px] font-mono text-[#E7D7C1]/85">
                        <span>
                          {item.unlockType === 'golden_espresso'
                            ? 'Golden Espresso Milestone'
                            : 'Revenue Milestone'}
                        </span>
                        <span>
                          ${Math.round(gameState.lifetimeGrossIncome || 0).toLocaleString()} / $
                          {item.cost.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/50 overflow-hidden">
                        <div
                          className="h-full bg-[#f5a623]"
                          style={{ width: `${grossPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {!isOwned && item.unlockType === 'meta_all_9' && (
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[9px] font-mono text-emerald-300">
                        <span>Collection Reward</span>
                        <span>
                          {ownedBaseCount} / {BASE_CAT_COSMETIC_IDS.length} Base Cosmetics
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/50 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400"
                          style={{ width: `${dinoPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isOwned ? (
                    <button
                      type="button"
                      data-testid={`btn-equip-cosmetic-${item.id}`}
                      onClick={() => onToggleEquipCosmetic(activeCatId, item.id)}
                      className={`w-full py-1 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        isEquipped
                          ? 'bg-emerald-500/25 border border-emerald-400/60 text-emerald-200 hover:bg-rose-500/20 hover:border-rose-400/50 hover:text-rose-200'
                          : 'bg-[#f5a623] text-[#090705] hover:brightness-105'
                      }`}
                    >
                      {isEquipped ? (
                        <>
                          <Check className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                          <span>Equipped · Tap to Remove</span>
                        </>
                      ) : (
                        <span>Equip on {activeCatSpec.name}</span>
                      )}
                    </button>
                  ) : item.unlockType === 'shop' ? (
                    <button
                      type="button"
                      data-testid={`btn-buy-cosmetic-${item.id}`}
                      disabled={!canBuyCash}
                      onClick={() => onPurchaseCosmetic(item.id)}
                      className={`w-full py-1 px-2.5 rounded-lg text-[11px] font-bold font-mono flex items-center justify-center gap-1 transition-all ${
                        canBuyCash
                          ? 'bg-[#f5a623] text-[#090705] hover:brightness-105 cursor-pointer shadow'
                          : 'bg-white/[0.05] border border-white/10 text-[#E7D7C1]/45 cursor-not-allowed'
                      }`}
                    >
                      <span>Buy · ${item.cost.toLocaleString()}</span>
                    </button>
                  ) : (
                    <div className="w-full py-1 px-2.5 rounded-lg bg-black/40 border border-white/10 text-[10px] font-mono text-[#E7D7C1]/65 flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3 text-[#f5a623] shrink-0" strokeWidth={2.2} />
                      <span>
                        {isGrossMilestone
                          ? `Unlock at $${item.cost.toLocaleString()} Gross`
                          : `Own All 9 Cosmetics (${ownedBaseCount}/9)`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Collection Footer */}
          <div className="pt-1.5 border-t border-[#f5a623]/20 flex items-center justify-between text-[10px] font-mono text-[#E7D7C1]/80 shrink-0">
            <span className="flex items-center gap-1">
              <Crown className="w-3 h-3 text-[#f5a623]" strokeWidth={2.2} />
              <span>Dino Suit Progress</span>
            </span>
            <span className="text-[#f5a623] font-bold">
              {ownedBaseCount}/{BASE_CAT_COSMETIC_IDS.length}
            </span>
          </div>
        </aside>
      )}

      {/* BOTTOM INTERACTION DOCK (Pet | Comb | Treat | Customize) */}
      <div
        className={`flex flex-col items-center gap-1.5 pointer-events-none transition-all ${
          customizeOpen ? 'sm:items-start sm:pl-6' : ''
        }`}
      >
        <div className="px-3 py-0.5 rounded-full bg-[#090705]/80 border border-[#f5a623]/30 text-[10px] text-[#E7D7C1] backdrop-blur-md">
          {modeHint}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#090705]/88 border border-[#f5a623]/40 backdrop-blur-xl shadow-xl">
          <button
            type="button"
            data-testid="cat-action-pet"
            onClick={() => {
              onToggleCustomize(false);
              onChangeMode('pet');
              onPetAction();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              !customizeOpen && mode === 'pet'
                ? 'bg-[#f5a623] text-[#090705] shadow'
                : 'bg-white/[0.06] text-[#FAF5EE] hover:bg-white/[0.12]'
            }`}
          >
            <Hand className="w-3.5 h-3.5 shrink-0" strokeWidth={2.3} />
            <span>Pet</span>
          </button>

          <button
            type="button"
            data-testid="cat-action-comb"
            onClick={() => {
              onToggleCustomize(false);
              onChangeMode('comb');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              !customizeOpen && mode === 'comb'
                ? 'bg-[#f5a623] text-[#090705] shadow'
                : 'bg-white/[0.06] text-[#FAF5EE] hover:bg-white/[0.12]'
            }`}
          >
            <Brush className="w-3.5 h-3.5 shrink-0" strokeWidth={2.3} />
            <span>Comb</span>
          </button>

          <button
            type="button"
            data-testid="cat-action-treat"
            onClick={() => {
              onToggleCustomize(false);
              onChangeMode('treat');
              onTossTreat();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              !customizeOpen && mode === 'treat'
                ? 'bg-[#f5a623] text-[#090705] shadow'
                : 'bg-white/[0.06] text-[#FAF5EE] hover:bg-white/[0.12]'
            }`}
          >
            <Cookie className="w-3.5 h-3.5 shrink-0" strokeWidth={2.3} />
            <span>Feed Treat</span>
          </button>

          <button
            type="button"
            data-testid="cat-action-customize"
            onClick={() => {
              const next = !customizeOpen;
              onToggleCustomize(next);
              if (next) onChangeMode('customize');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              customizeOpen
                ? 'bg-[#f5a623] text-[#090705] shadow'
                : 'bg-white/[0.08] border border-[#f5a623]/40 text-[#f5a623] hover:bg-[#f5a623]/15'
            }`}
          >
            {wardrobeTab === 'eyewear' ? (
              <Glasses className="w-3.5 h-3.5 shrink-0" strokeWidth={2.3} />
            ) : (
              <Shirt className="w-3.5 h-3.5 shrink-0" strokeWidth={2.3} />
            )}
            <span>Customize</span>
          </button>
        </div>
      </div>
    </div>
  );
};
