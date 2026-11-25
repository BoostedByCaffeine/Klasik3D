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
  isCatCosmeticVisibleInShop,
  normalizeCatLoadout,
} from '../game/rules';
import { StudioPreviewThumb } from './StudioPreviewThumb';

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
  getCatCosmeticThumbnail?: (cosmeticId: CatCosmeticId) => string;
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
  getCatCosmeticThumbnail,
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

  const tabItems = CAT_COSMETICS_CATALOG.filter(
    (item) =>
      item.slot === wardrobeTab &&
      isCatCosmeticVisibleInShop(item, gameState.unlockedCosmetics)
  );

  const swatchConfig: { label: string; group: 'cloth' | 'top_hat' | 'mustache' | 'skeleton' } | null =
    wardrobeTab === 'body'
      ? { label: 'Knit Colors:', group: 'cloth' }
      : wardrobeTab === 'headwear'
      ? { label: 'Top Hat:', group: 'top_hat' }
      : wardrobeTab === 'eyewear'
      ? { label: 'Mustache:', group: 'mustache' }
      : wardrobeTab === 'full_suit'
      ? { label: 'Skeleton:', group: 'skeleton' }
      : null;

  const swatchItems = swatchConfig
    ? tabItems.filter((item) => item.variantGroup === swatchConfig.group)
    : [];

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
          className="pointer-events-auto px-3 py-1.5 rounded-xl bg-[#09090B]/84 hover:bg-[#18181B]/95 border border-white/15 hover:border-white/35 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md cursor-pointer shadow-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#E4E4E7] shrink-0" strokeWidth={2.4} />
          <span>Back to Cafe</span>
        </button>

        {/* Cat Switcher Pill */}
        <div
          className="pointer-events-auto flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#09090B]/84 border border-white/15 backdrop-blur-md shadow-lg"
          data-testid="cat-station-switcher"
        >
          <button
            type="button"
            data-testid="btn-cat-prev"
            disabled={unlockedCats.length <= 1}
            onClick={() => handleCycleCat(-1)}
            className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-[#E4E4E7] hover:text-white disabled:opacity-35 cursor-pointer disabled:cursor-default transition-colors"
            aria-label="Previous Cat"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.4} />
          </button>

          <div className="px-2 text-center min-w-[110px]">
            <div className="text-xs sm:text-sm font-bold text-white leading-tight flex items-center justify-center gap-1">
              <span>{activeCatSpec.name}</span>
              {activeCatSpec.isSecret && (
                <Sparkles className="w-3 h-3 text-[#E4E4E7]" strokeWidth={2.4} />
              )}
            </div>
            <div className="text-[9px] font-mono text-[#A1A1AA]">
              {currentIdx + 1} / {unlockedCats.length} · {activeCatSpec.sizeSummary}
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-cat-next"
            disabled={unlockedCats.length <= 1}
            onClick={() => handleCycleCat(1)}
            className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-[#E4E4E7] hover:text-white disabled:opacity-35 cursor-pointer disabled:cursor-default transition-colors"
            aria-label="Next Cat"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.4} />
          </button>
        </div>

        {/* Right Status: Patience Paused + Subtle Waiting-Order Bell */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#09090B]/82 border border-white/15 text-[10px] font-mono font-semibold text-white backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            <span>Mood Paused</span>
          </span>
          {waitingOrdersCount > 0 && (
            <button
              type="button"
              data-testid="cat-station-waiting-bell"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl hud-platinum-pill text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="Customers are waiting at the counter — tap to return to cafe"
            >
              <Bell className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
              <span>{waitingOrdersCount} Waiting</span>
            </button>
          )}
        </div>
      </div>

      {/* RIGHT-SIDE 40% OBSIDIAN GLASSMORPHISM CAT WARDROBE DRAWER */}
      {customizeOpen && (
        <aside
          data-testid="cat-wardrobe-drawer"
          className="pointer-events-auto fixed top-14 right-2.5 sm:right-4 bottom-16 w-[44%] sm:w-[40%] max-w-[380px] min-w-[240px] rounded-2xl bg-[#09090B]/92 border border-white/15 backdrop-blur-xl shadow-[0_24px_60px_-10px_rgba(0,0,0,0.88)] p-2.5 sm:p-3 flex flex-col gap-2 text-white"
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 shrink-0">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                {activeCatSpec.name}&apos;s Wardrobe
              </h3>
              <p className="text-[10px] text-[#A1A1AA] flex items-center gap-1">
                <RotateCw className="w-2.5 h-2.5 text-[#E4E4E7]" strokeWidth={2.3} />
                <span>
                  Drag cat to rotate · Cash{' '}
                  <span className="text-[#34D399] font-mono font-semibold">
                    ${Math.round(gameState.cash).toLocaleString()}
                  </span>
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleCustomize(false)}
              className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-[#E4E4E7] hover:text-white cursor-pointer transition-colors"
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
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer transition-transform ${
                    active
                      ? 'hud-platinum-pill'
                      : 'bg-white/[0.05] text-[#A1A1AA] hover:text-white border border-transparent hover:border-white/15'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Quick Variant Swatches Row (Knit Vests, Top Hats, Mustaches, Secret Skeletons) */}
          {swatchConfig && swatchItems.length > 0 && (
            <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl bg-[#18181B]/80 border border-white/10 shrink-0">
              <span className="text-[10px] font-semibold text-[#A1A1AA]">
                {swatchConfig.label}
              </span>
              <div className="flex items-center gap-1.5">
                {swatchItems.map((variant) => {
                  const owned = unlockedCosmetics.has(variant.id);
                  const equipped =
                    variant.slot === 'full_suit'
                      ? activeLoadout.full_suit === variant.id
                      : activeLoadout[variant.slot] === variant.id;
                  const isLightSwatch =
                    variant.swatchHex === '#f8fafc' ||
                    variant.swatchHex === '#f4f1ea' ||
                    variant.swatchHex === '#f5f5f4' ||
                    variant.swatchHex === '#f5efe6';
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      data-testid={`swatch-${variant.id}`}
                      onClick={() =>
                        owned
                          ? onToggleEquipCosmetic(activeCatId, variant.id)
                          : onPurchaseCosmetic(variant.id)
                      }
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 flex items-center justify-center ${
                        equipped
                          ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.65)]'
                          : owned
                          ? 'border-white/60'
                          : 'border-white/25 opacity-75'
                      }`}
                      style={{ backgroundColor: variant.swatchHex || '#e65a4f' }}
                      title={
                        owned
                          ? `${variant.name} (${equipped ? 'Equipped' : 'Tap to Equip'})`
                          : `${variant.name} ($${variant.cost})`
                      }
                      aria-label={variant.name}
                    >
                      {equipped && (
                        <Check
                          className={`w-3 h-3 drop-shadow ${
                            isLightSwatch ? 'text-[#18181B]' : 'text-white'
                          }`}
                          strokeWidth={3}
                        />
                      )}
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
                      ? 'bg-[#18181B]/95 border-[#34D399]/50'
                      : 'bg-[#18181B]/75 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <StudioPreviewThumb
                        cacheKey={`cosmetic:${item.id}`}
                        renderThumbnail={
                          getCatCosmeticThumbnail
                            ? () => getCatCosmeticThumbnail(item.id)
                            : undefined
                        }
                        alt={item.name}
                        className="w-11 h-11 rounded-lg"
                        fallbackColorHex={item.swatchHex || '#18181B'}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                          <span className="truncate">{item.name}</span>
                          {item.secretRequiresCosmetic && (
                            <span className="text-[9px] font-mono uppercase tracking-wider text-[#FDE68A] shrink-0">
                              Secret
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#A1A1AA] leading-tight">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isOverriddenByDino && (
                    <div className="text-[9px] font-mono text-[#E4E4E7]">
                      Hidden while Full Costume is worn
                    </div>
                  )}

                  {!isOwned && isGrossMilestone && (
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[9px] font-mono text-[#A1A1AA]">
                        <span>
                          {item.unlockType === 'golden_espresso'
                            ? 'Golden Espresso Milestone'
                            : 'Revenue Milestone'}
                        </span>
                        <span className="text-[#E4E4E7]">
                          ${Math.round(gameState.lifetimeGrossIncome || 0).toLocaleString()} / $
                          {item.cost.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#27272A] overflow-hidden">
                        <div
                          className="h-full hud-platinum-bar"
                          style={{ width: `${grossPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {!isOwned && item.unlockType === 'meta_all_9' && (
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[9px] font-mono text-[#E4E4E7]">
                        <span>Collection Reward</span>
                        <span>
                          {ownedBaseCount} / {BASE_CAT_COSMETIC_IDS.length} Base Cosmetics
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#27272A] overflow-hidden">
                        <div
                          className="h-full hud-platinum-bar"
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
                          ? 'bg-[#34D399]/16 border border-[#34D399]/55 text-[#34D399] hover:bg-[#F87171]/16 hover:border-[#F87171]/50 hover:text-[#F87171]'
                          : 'hud-platinum-pill'
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
                          ? 'hud-platinum-pill cursor-pointer'
                          : 'bg-white/[0.04] border border-white/10 text-[#71717A] cursor-not-allowed'
                      }`}
                    >
                      <span>Buy · ${item.cost.toLocaleString()}</span>
                    </button>
                  ) : (
                    <div className="w-full py-1 px-2.5 rounded-lg bg-[#09090B]/70 border border-white/10 text-[10px] font-mono text-[#A1A1AA] flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
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

          {/* Collection Footer with Sleek Platinum Progress Bar */}
          <div className="pt-1.5 border-t border-white/10 flex flex-col gap-1 shrink-0">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#A1A1AA]">
              <span className="flex items-center gap-1">
                <Crown className="w-3 h-3 text-[#E4E4E7]" strokeWidth={2.2} />
                <span>Dino Suit Progress</span>
              </span>
              <span className="text-white font-bold">
                {ownedBaseCount}/{BASE_CAT_COSMETIC_IDS.length}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#27272A] overflow-hidden">
              <div
                className="h-full hud-platinum-bar transition-all duration-300"
                style={{ width: `${Math.round((ownedBaseCount / BASE_CAT_COSMETIC_IDS.length) * 100)}%` }}
              />
            </div>
          </div>
        </aside>
      )}

      {/* BOTTOM INTERACTION DOCK (Pet | Comb | Treat | Customize) */}
      <div
        className={`flex flex-col items-center gap-1.5 pointer-events-none transition-all ${
          customizeOpen ? 'sm:items-start sm:pl-6' : ''
        }`}
      >
        <div className="px-3 py-0.5 rounded-full bg-[#09090B]/80 border border-white/12 text-[10px] text-[#A1A1AA] backdrop-blur-md">
          {modeHint}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#09090B]/86 border border-white/15 backdrop-blur-xl shadow-xl">
          <button
            type="button"
            data-testid="cat-action-pet"
            onClick={() => {
              onToggleCustomize(false);
              onChangeMode('pet');
              onPetAction();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-transform ${
              !customizeOpen && mode === 'pet'
                ? 'hud-platinum-pill'
                : 'bg-white/[0.05] text-[#E4E4E7] hover:text-white hover:bg-white/[0.12]'
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-transform ${
              !customizeOpen && mode === 'comb'
                ? 'hud-platinum-pill'
                : 'bg-white/[0.05] text-[#E4E4E7] hover:text-white hover:bg-white/[0.12]'
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-transform ${
              !customizeOpen && mode === 'treat'
                ? 'hud-platinum-pill'
                : 'bg-white/[0.05] text-[#E4E4E7] hover:text-white hover:bg-white/[0.12]'
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-transform ${
              customizeOpen
                ? 'hud-platinum-pill'
                : 'bg-white/[0.07] border border-white/20 text-[#E4E4E7] hover:text-white hover:bg-white/[0.14]'
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
