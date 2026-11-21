import React, { useEffect, useState } from 'react';
import {
  Cat,
  Check,
  Clock,
  CloudSnow,
  Crown,
  DoorOpen,
  Flame,
  Gift,
  Infinity as InfinityIcon,
  Lock,
  Mountain,
  Shirt,
  Sparkles,
  Sun,
  Trophy,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import {
  CAFE_CATS,
  CafeCatId,
  ClimateState,
  CustomerSkinPackId,
  GOLDEN_MACHINE_GROSS_THRESHOLD,
  GrinderSkinId,
  KlasikGameState,
  LILO_REQUIRED_CAT_IDS,
  MachineSkinId,
  PATRON_OUTFIT_CATALOG,
  PatronOutfitId,
  PitcherSkinId,
  SCENERY_CATALOG,
  SceneryId,
  canClaimLoginReward,
  getCafeCatSpec,
  getCalendarDayDiff,
  getLocalDateKey,
  getTimeUntilMidnightLabel,
  getVisibleShopCats,
  isAlwaysWinterScenery,
  isSnowAllowedForScenery,
} from '../game/rules';
import { StudioPreviewThumb } from './StudioPreviewThumb';

export type UpgradesHubTab =
  | 'upgrades'
  | 'sceneries'
  | 'patron_outfits'
  | 'cafe_cats'
  | 'equipment_skins'
  | 'customer_skins'
  | 'login_rewards';

interface BizUpgradesModalProps {
  gameState: KlasikGameState;
  initialTab?: UpgradesHubTab;
  onPurchaseUpgrade: (upgradeId: string) => void;
  onUnlockOrEquipEquipmentSkin: (
    skinId: MachineSkinId | GrinderSkinId | PitcherSkinId
  ) => void;
  onUnlockOrEquipCustomerPack: (packId: CustomerSkinPackId) => void;
  onPurchaseOrEquipCafeCat: (catId: CafeCatId) => void;
  onPurchaseOrEquipScenery: (sceneryId: SceneryId) => void;
  onPurchasePatronOutfit: (outfitId: PatronOutfitId) => void;
  onSetPatronOutfitAutoMatch: (autoMatch: boolean) => void;
  onToggleCustomPatronOutfit: (outfitId: PatronOutfitId) => void;
  onOpenCatStation?: () => void;
  onOpenGoOutside?: () => void;
  getSceneryThumbnail?: (sceneryId: SceneryId) => string;
  getPatronOutfitThumbnail?: (outfitId: PatronOutfitId, climate?: ClimateState) => string;
  getCatThumbnail?: (catId: CafeCatId) => string;
  onClaimLoginReward: (day: number) => void;
  onClose: () => void;
}

export const BizUpgradesModal: React.FC<BizUpgradesModalProps> = ({
  gameState,
  initialTab = 'upgrades',
  onPurchaseUpgrade,
  onUnlockOrEquipEquipmentSkin,
  onUnlockOrEquipCustomerPack,
  onPurchaseOrEquipCafeCat,
  onPurchaseOrEquipScenery,
  onPurchasePatronOutfit,
  onSetPatronOutfitAutoMatch,
  onToggleCustomPatronOutfit,
  onOpenCatStation,
  onOpenGoOutside,
  getSceneryThumbnail,
  getPatronOutfitThumbnail,
  getCatThumbnail,
  onClaimLoginReward,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<UpgradesHubTab>(initialTab);
  const [outfitPreviewClimate, setOutfitPreviewClimate] = useState<ClimateState>(
    gameState.climateState || 'summer'
  );
  const [midnightCountdown, setMidnightCountdown] = useState<string>(() =>
    getTimeUntilMidnightLabel()
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMidnightCountdown(getTimeUntilMidnightLabel());
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const {
    cash,
    lifetimeGrossIncome = 0,
    upgrades,
    equipmentSkins,
    equippedMachineSkin,
    equippedGrinderSkin,
    equippedPitcherSkin,
    customerSkinPacks,
    activeCustomerSkinPack,
    loginRewards,
    unlockedCats = ['champy'],
    equippedCatId = 'champy',
    activeScenery = 'busy_street',
    unlockedSceneries = ['busy_street'],
    unlockedPatronOutfits = [],
    patronOutfitAutoMatch = true,
    enabledCustomPatronOutfits = [],
  } = gameState;

  const grossPct = Math.min(
    100,
    Math.round((lifetimeGrossIncome / GOLDEN_MACHINE_GROSS_THRESHOLD) * 100)
  );
  const remainingGrossForGold = Math.max(
    0,
    Math.round(GOLDEN_MACHINE_GROSS_THRESHOLD - lifetimeGrossIncome)
  );
  const goldenSkin = equipmentSkins.find((s) => s.id === 'golden-espresso-machine');
  const isGoldenUnlocked =
    Boolean(goldenSkin?.unlocked) || lifetimeGrossIncome >= GOLDEN_MACHINE_GROSS_THRESHOLD;
  const isGoldenEquipped = equippedMachineSkin === 'golden-espresso-machine';
  const activeCatSpec = getCafeCatSpec(equippedCatId);
  const visibleCats = getVisibleShopCats(unlockedCats);
  const liloOwnedPrereqs = LILO_REQUIRED_CAT_IDS.filter((id) => unlockedCats.includes(id)).length;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrades-modal-title"
    >
      <div className="w-full max-w-3xl glass-modal rounded-2xl p-3.5 sm:p-5 space-y-3 max-h-[86vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/12 pb-2.5 shrink-0 gap-2">
          <div>
            <h2
              id="upgrades-modal-title"
              className="text-sm sm:text-base font-bold font-display text-white glass-text-crisp"
            >
              Cafe Upgrades, Golden 50K Skins &amp; Login Unlockables
            </h2>
            <p className="text-[11px] text-[#A1A1AA]">
              Gross Income: ${Math.round(lifetimeGrossIncome).toLocaleString()} / $
              {GOLDEN_MACHINE_GROSS_THRESHOLD.toLocaleString()}
              {isGoldenEquipped ? ' · 2x GOLDEN SALE INCOME ACTIVE!' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold font-mono tabular-nums text-emerald-300 bg-emerald-950/60 border border-emerald-400/35 px-2.5 py-1 rounded-lg glass-text-crisp">
              ${Math.round(cash).toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg glass-btn-inner text-xs font-semibold text-white cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Offline Lucide Icons — wraps cleanly so all 7 tabs stay visible) */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1 shrink-0">
          {(
            [
              { id: 'upgrades', label: `Upgrades (${upgrades.length})`, Icon: Zap },
              {
                id: 'sceneries',
                label: `Sceneries (${unlockedSceneries.length}/${SCENERY_CATALOG.length})`,
                Icon: Mountain,
              },
              {
                id: 'patron_outfits',
                label: `Outfits (${unlockedPatronOutfits.length}/${PATRON_OUTFIT_CATALOG.length})`,
                Icon: UserCheck,
              },
              {
                id: 'cafe_cats',
                label: `Cafe Cats (${unlockedCats.length}/${visibleCats.length})`,
                Icon: Cat,
              },
              { id: 'equipment_skins', label: '50K & Skins', Icon: Crown },
              {
                id: 'customer_skins',
                label: `Palettes (${customerSkinPacks.length})`,
                Icon: Shirt,
              },
              { id: 'login_rewards', label: 'Login (7)', Icon: Gift },
            ] as const
          ).map((t) => {
            const Icon = t.Icon;
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`tab-upgrades-${t.id}`}
                onClick={() => setActiveTab(t.id)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-transform flex items-center gap-1 ${
                  activeTab === t.id
                    ? 'hud-platinum-pill font-bold'
                    : 'glass-btn-inner text-[#D4D4D8]'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: 14 Shop Upgrades */}
        {activeTab === 'upgrades' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1">
            {upgrades.map((upg) => {
              const canAfford = cash >= upg.cost && !upg.purchased;
              return (
                <div
                  key={upg.id}
                  className="flex flex-col justify-between gap-2 p-3 rounded-xl bg-[#18181B]/80 border border-white/10"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white glass-text-crisp leading-tight">
                        {upg.name}
                      </span>
                      <span className="text-[10px] font-mono text-[#E4E4E7] bg-white/[0.07] border border-white/12 px-1.5 py-0.5 rounded shrink-0">
                        {upg.effectLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-snug">{upg.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled={upg.purchased || !canAfford}
                    onClick={() => onPurchaseUpgrade(upg.id)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono tabular-nums whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
                      upg.purchased
                        ? 'bg-emerald-950/60 border border-emerald-400/40 text-emerald-300 cursor-default'
                        : canAfford
                        ? 'hud-platinum-pill cursor-pointer'
                        : 'bg-[#09090B]/60 border border-white/10 text-[#71717A] cursor-not-allowed'
                    }`}
                  >
                    {upg.purchased ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                        <span>Installed</span>
                      </>
                    ) : (
                      <span>Buy · ${upg.cost}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 1.5: 9 Outdoor Sceneries with Single-Context 3D Mini-Dioramas */}
        {activeTab === 'sceneries' && (
          <div className="space-y-2.5 overflow-y-auto pr-1" data-testid="sceneries-shop-panel">
            <div className="p-2.5 rounded-xl bg-[#18181B]/85 border border-white/12 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-white">
                <span className="font-bold text-white">9 Living 3D Outdoor Views</span>
                <span className="text-[#A1A1AA] ml-1.5">
                  · Preserves delivery driveway &amp; unlocks scenic weather + regional patron outfits.
                </span>
              </div>
              {onOpenGoOutside && (
                <button
                  type="button"
                  data-testid="btn-sceneries-go-outside"
                  onClick={() => {
                    onClose();
                    onOpenGoOutside();
                  }}
                  className="px-2.5 py-1 rounded-lg hud-platinum-pill text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <DoorOpen className="w-3 h-3 shrink-0" strokeWidth={2.3} />
                  <span>Step Outside Now</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SCENERY_CATALOG.map((scenery) => {
                const isUnlocked = unlockedSceneries.includes(scenery.id);
                const isEquipped = activeScenery === scenery.id;
                const isMilestone =
                  scenery.unlockMethod === 'revenue_milestone' ||
                  scenery.unlockMethod === 'prestige_milestone';
                const canBuyCash =
                  !isUnlocked && scenery.unlockMethod === 'shop' && cash >= scenery.cost;
                const milestoneReq = scenery.revenueMilestone || 0;
                const milestonePct =
                  milestoneReq > 0
                    ? Math.min(100, Math.round((lifetimeGrossIncome / milestoneReq) * 100))
                    : 100;
                const snowEnabled = isSnowAllowedForScenery(scenery.id);
                const alwaysWinter = isAlwaysWinterScenery(scenery.id);

                return (
                  <div
                    key={scenery.id}
                    data-testid={`scenery-card-${scenery.id}`}
                    className={`flex flex-col justify-between gap-2 p-3 rounded-xl border ${
                      isEquipped
                        ? 'bg-white/[0.09] border-white/50 shadow-[0_0_18px_rgba(255,255,255,0.1)]'
                        : isMilestone
                        ? 'bg-[#18181B]/90 border-white/22'
                        : 'bg-[#18181B]/75 border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <StudioPreviewThumb
                        cacheKey={`scenery:${scenery.id}`}
                        renderThumbnail={
                          getSceneryThumbnail
                            ? () => getSceneryThumbnail(scenery.id)
                            : undefined
                        }
                        alt={scenery.name}
                        className="w-16 h-16 rounded-xl"
                        fallbackColorHex={scenery.accentHex}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white glass-text-crisp truncate">
                            {scenery.name}
                          </span>
                          {alwaysWinter ? (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/18 border border-sky-300/45 text-[9px] font-mono font-bold text-[#BAE6FD] inline-flex items-center gap-0.5 shrink-0">
                              <CloudSnow className="w-2.5 h-2.5 shrink-0" strokeWidth={2.2} />
                              <span>Always Winter</span>
                            </span>
                          ) : snowEnabled ? (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-300/40 text-[9px] font-mono font-bold text-[#BAE6FD] inline-flex items-center gap-0.5 shrink-0">
                              <CloudSnow className="w-2.5 h-2.5 shrink-0" strokeWidth={2.2} />
                              <span>Snow</span>
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] font-mono text-[#D4D4D8] truncate">
                          {scenery.subtitle} · {scenery.badgeText}
                        </div>
                        <p className="text-[10px] text-[#A1A1AA] leading-snug line-clamp-2">
                          {scenery.description}
                        </p>
                      </div>
                    </div>

                    {!isUnlocked && isMilestone && (
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#D4D4D8]">
                          <span className="inline-flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
                            <span>Gross Milestone</span>
                          </span>
                          <span>
                            ${Math.round(lifetimeGrossIncome).toLocaleString()} / $
                            {milestoneReq.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#27272A] overflow-hidden border border-white/12">
                          <div
                            className="h-full hud-platinum-bar"
                            style={{ width: `${milestonePct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      data-testid={`btn-scenery-${scenery.id}`}
                      disabled={isEquipped || (!isUnlocked && !canBuyCash)}
                      onClick={() => onPurchaseOrEquipScenery(scenery.id)}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                        isEquipped
                          ? 'bg-emerald-950/65 border border-emerald-400/45 text-emerald-300 cursor-default'
                          : isUnlocked || canBuyCash
                          ? 'hud-platinum-pill cursor-pointer'
                          : 'bg-[#09090B]/60 border border-white/10 text-[#71717A] cursor-not-allowed'
                      }`}
                    >
                      {isEquipped ? (
                        <>
                          <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                          <span>Equipped Outside View</span>
                        </>
                      ) : isUnlocked ? (
                        <span>Equip {scenery.name}</span>
                      ) : isMilestone ? (
                        <>
                          <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                          <span>
                            Reach ${milestoneReq.toLocaleString()} Gross ({milestonePct}%)
                          </span>
                        </>
                      ) : (
                        <span>Unlock · ${scenery.cost.toLocaleString()}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 1.6: 6 Weather-Reactive Cultural Patron Outfits with Single-Context 3D Previews */}
        {activeTab === 'patron_outfits' && (
          <div className="space-y-2.5 overflow-y-auto pr-1" data-testid="patron-outfits-panel">
            <div className="p-2.5 rounded-xl bg-[#18181B]/85 border border-white/12 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="btn-outfit-mode-auto"
                  onClick={() => onSetPatronOutfitAutoMatch(true)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-transform ${
                    patronOutfitAutoMatch
                      ? 'hud-platinum-pill'
                      : 'glass-btn-inner text-[#D4D4D8]'
                  }`}
                >
                  Auto-Match Scenery
                </button>
                <button
                  type="button"
                  data-testid="btn-outfit-mode-custom"
                  onClick={() => onSetPatronOutfitAutoMatch(false)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-transform ${
                    !patronOutfitAutoMatch
                      ? 'hud-platinum-pill'
                      : 'glass-btn-inner text-[#D4D4D8]'
                  }`}
                >
                  Custom Mix
                </button>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-mono">
                <span className="text-[#A1A1AA]">Preview:</span>
                <button
                  type="button"
                  onClick={() => setOutfitPreviewClimate('summer')}
                  className={`px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer ${
                    outfitPreviewClimate === 'summer'
                      ? 'hud-platinum-pill font-bold'
                      : 'bg-[#09090B]/60 border-white/14 text-[#A1A1AA]'
                  }`}
                >
                  <Sun className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                  <span>Summer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOutfitPreviewClimate('winter')}
                  className={`px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer ${
                    outfitPreviewClimate === 'winter'
                      ? 'bg-sky-500/22 border-sky-300/60 text-[#BAE6FD] font-bold'
                      : 'bg-[#09090B]/60 border-white/14 text-[#A1A1AA]'
                  }`}
                >
                  <CloudSnow className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                  <span>Winter</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PATRON_OUTFIT_CATALOG.map((outfit) => {
                const isUnlocked = unlockedPatronOutfits.includes(outfit.id);
                const isCustomEnabled = enabledCustomPatronOutfits.includes(outfit.id);
                const canAfford = !isUnlocked && cash >= outfit.cost;
                const isWinterOnly = outfit.weatherMode === 'winter-only';
                const isWeatherReactive = outfit.weatherMode === 'weather-reactive';
                const previewClimate: ClimateState = isWinterOnly
                  ? 'winter'
                  : isWeatherReactive
                  ? outfitPreviewClimate
                  : 'summer';

                return (
                  <div
                    key={outfit.id}
                    data-testid={`patron-outfit-card-${outfit.id}`}
                    className={`flex flex-col justify-between gap-2 p-3 rounded-xl border ${
                      isUnlocked && (patronOutfitAutoMatch || isCustomEnabled)
                        ? 'bg-white/[0.08] border-white/40'
                        : 'bg-[#18181B]/75 border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <StudioPreviewThumb
                        cacheKey={`outfit:${outfit.id}:${previewClimate}`}
                        renderThumbnail={
                          getPatronOutfitThumbnail
                            ? () => getPatronOutfitThumbnail(outfit.id, previewClimate)
                            : undefined
                        }
                        alt={outfit.name}
                        className="w-16 h-16 rounded-xl"
                        fallbackColorHex={outfit.accentHex}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white glass-text-crisp truncate">
                            {outfit.name}
                          </span>
                          {isWinterOnly ? (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/18 border border-sky-300/45 text-[9px] font-mono font-bold text-[#BAE6FD] shrink-0">
                              Winter Only
                            </span>
                          ) : isWeatherReactive ? (
                            <span className="px-1.5 py-0.5 rounded bg-white/[0.09] border border-white/25 text-[9px] font-mono font-bold text-[#E4E4E7] shrink-0">
                              2-Season
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[10px] text-[#A1A1AA] leading-snug">
                          {outfit.description}
                        </p>
                      </div>
                    </div>

                    {isUnlocked ? (
                      patronOutfitAutoMatch ? (
                        <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-950/65 border border-emerald-400/45 text-emerald-300 text-xs font-bold font-mono flex items-center justify-center gap-1.5">
                          <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                          <span>Unlocked · Auto-Matches Scenery</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          data-testid={`btn-toggle-custom-outfit-${outfit.id}`}
                          onClick={() => onToggleCustomPatronOutfit(outfit.id)}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            isCustomEnabled
                              ? 'bg-emerald-950/75 border border-emerald-400/60 text-emerald-200'
                              : 'glass-btn-inner text-[#D4D4D8]'
                          }`}
                        >
                          {isCustomEnabled ? (
                            <>
                              <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
                              <span>Included in Custom Mix</span>
                            </>
                          ) : (
                            <span>Add to Custom Mix</span>
                          )}
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        data-testid={`btn-buy-outfit-${outfit.id}`}
                        disabled={!canAfford}
                        onClick={() => onPurchasePatronOutfit(outfit.id)}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                          canAfford
                            ? 'hud-platinum-pill cursor-pointer'
                            : 'bg-[#09090B]/60 border border-white/10 text-[#71717A] cursor-not-allowed'
                        }`}
                      >
                        <span>Unlock Pack · ${outfit.cost.toLocaleString()}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Golden Espresso Machine ($50k Gross Income -> 2x Sale Income) & Equipment Skins */}
        {activeTab === 'equipment_skins' && (
          <div className="space-y-3 overflow-y-auto pr-1">
            {/* Hero Golden Espresso Machine Milestone Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#18181B] via-[#27272A]/80 to-[#18181B] border border-white/30 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#E4E4E7] flex items-center gap-1">
                    <Trophy className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                    <span>PRESTIGE MILESTONE REWARD · 2X SALE INCOME MULTIPLIER</span>
                  </span>
                  <h3 className="text-sm font-bold text-white glass-text-crisp">
                    Golden Espresso Machine (24K Solid Gold Dual-Boiler)
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-white bg-[#09090B]/70 px-2.5 py-1 rounded-lg border border-white/20">
                  ${Math.round(lifetimeGrossIncome).toLocaleString()} / $
                  {GOLDEN_MACHINE_GROSS_THRESHOLD.toLocaleString()} Gross
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-[#09090B]/80 overflow-hidden border border-white/15">
                <div
                  className="h-full hud-platinum-bar transition-all"
                  style={{ width: `${grossPct}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-[#D4D4D8]">
                  Earned by reaching ${GOLDEN_MACHINE_GROSS_THRESHOLD.toLocaleString()} gross
                  income. Doubles (2x) all drink sale income &amp; table tips once equipped!
                </span>
                <div className="flex items-center gap-2">
                  {!isGoldenUnlocked ? (
                    <span
                      data-testid="golden-machine-locked-badge"
                      className="px-3 py-1.5 rounded-lg bg-[#09090B]/75 border border-white/18 text-[#A1A1AA] font-mono font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5 text-[#D4D4D8] shrink-0" strokeWidth={2.2} />
                      <span>
                        Locked · Grind ${remainingGrossForGold.toLocaleString()} More ({grossPct}%)
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid="btn-equip-golden-machine"
                      onClick={() =>
                        onUnlockOrEquipEquipmentSkin(
                          isGoldenEquipped ? 'classic-steel' : 'golden-espresso-machine'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg hud-platinum-pill font-bold text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Trophy className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                      <span>
                        {isGoldenEquipped
                          ? 'Equipped (2x Active) · Unequip'
                          : 'Equip Golden Machine (2x)'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {equipmentSkins.map((skin) => {
                const isEquipped =
                  equippedMachineSkin === skin.id ||
                  equippedGrinderSkin === skin.id ||
                  equippedPitcherSkin === skin.id;
                const needsGross =
                  !skin.unlocked &&
                  Boolean(skin.grossIncomeRequirement) &&
                  lifetimeGrossIncome < (skin.grossIncomeRequirement || 0);
                const canAfford = !needsGross && (skin.unlocked || cash >= skin.cost);

                return (
                  <div
                    key={skin.id}
                    className={`flex flex-col justify-between gap-2 p-3 rounded-xl border ${
                      isEquipped
                        ? 'bg-white/[0.09] border-white/45'
                        : 'bg-[#18181B]/75 border-white/10'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                            style={{ backgroundColor: skin.previewColorHex }}
                          />
                          <span className="text-xs font-bold text-white glass-text-crisp truncate">
                            {skin.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono uppercase text-[#A1A1AA] shrink-0">
                          {skin.slot}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A1A1AA] leading-snug">
                        {skin.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isEquipped || !canAfford}
                      onClick={() => onUnlockOrEquipEquipmentSkin(skin.id)}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                        isEquipped
                          ? 'bg-emerald-950/65 border border-emerald-400/45 text-emerald-300 cursor-default'
                          : canAfford
                          ? 'hud-platinum-pill cursor-pointer'
                          : 'bg-[#09090B]/60 border border-white/10 text-[#71717A] cursor-not-allowed'
                      }`}
                    >
                      {isEquipped ? (
                        <>
                          <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                          <span>Equipped on 3D Counter</span>
                        </>
                      ) : needsGross ? (
                        <>
                          <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                          <span>Requires $50K Gross ({grossPct}%)</span>
                        </>
                      ) : skin.unlocked ? (
                        <span>Equip Skin</span>
                      ) : (
                        <span>Unlock &amp; Equip · ${skin.cost}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Customer Outfit & Style Skin Packs */}
        {activeTab === 'customer_skins' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1">
            {customerSkinPacks.map((pack) => {
              const isEquipped = activeCustomerSkinPack === pack.id;
              const canAfford = pack.unlocked || cash >= pack.cost;
              return (
                <div
                  key={pack.id}
                  className={`flex flex-col justify-between gap-2 p-3 rounded-xl border ${
                    isEquipped
                      ? 'bg-white/[0.09] border-white/45'
                      : 'bg-[#18181B]/75 border-white/10'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-white glass-text-crisp">
                        {pack.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {pack.paletteColors.slice(0, 4).map((hex) => (
                          <span
                            key={hex}
                            className="w-2.5 h-2.5 rounded-full border border-white/25"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-snug">{pack.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled={isEquipped || !canAfford}
                    onClick={() => onUnlockOrEquipCustomerPack(pack.id)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
                      isEquipped
                        ? 'bg-emerald-950/65 border border-emerald-400/45 text-emerald-300 cursor-default'
                        : canAfford
                        ? 'hud-platinum-pill cursor-pointer'
                        : 'bg-[#09090B]/60 border border-white/10 text-[#71717A] cursor-not-allowed'
                    }`}
                  >
                    {isEquipped ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                        <span>Active Patron Style</span>
                      </>
                    ) : pack.unlocked ? (
                      <span>Activate Patron Pack</span>
                    ) : (
                      <span>Unlock Pack · ${pack.cost}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3.5: Unlockable Cafe Cats Roster (Secret cats like Tisay remain hidden until unlocked!) */}
        {activeTab === 'cafe_cats' && (() => {
          const milestoneCats = visibleCats.filter(
            (c) =>
              c.unlockType === 'revenue' ||
              c.unlockType === 'master' ||
              c.unlockType === 'golden_espresso'
          );
          const shopCats = visibleCats.filter(
            (c) => c.unlockType === 'starter' || c.unlockType === 'shop'
          );
          const liloPct = Math.min(
            100,
            Math.round((liloOwnedPrereqs / LILO_REQUIRED_CAT_IDS.length) * 100)
          );

          const renderCatCard = (cat: (typeof CAFE_CATS)[number]) => {
            const isUnlocked = unlockedCats.includes(cat.id);
            const isEquipped = equippedCatId === cat.id;
            const isShopBuyable =
              !isUnlocked && cat.unlockType === 'shop' && cash >= cat.unlockAmount;
            const revReq = cat.unlockType === 'revenue' ? cat.unlockAmount : 0;
            const revPct =
              revReq > 0 ? Math.min(100, Math.round((lifetimeGrossIncome / revReq) * 100)) : 100;
            const coatCss = `#${cat.furHex.toString(16).padStart(6, '0')}`;
            const leftEyeCss = `#${cat.leftEyeHex.toString(16).padStart(6, '0')}`;
            const rightEyeCss = `#${cat.rightEyeHex.toString(16).padStart(6, '0')}`;
            const collarCss = cat.hasCollar
              ? `#${cat.collarHex.toString(16).padStart(6, '0')}`
              : null;

            return (
              <div
                key={cat.id}
                data-testid={`cat-card-${cat.id}`}
                className={`flex flex-col justify-between gap-2 p-3 rounded-xl border ${
                  isEquipped
                    ? 'bg-white/[0.09] border-white/50 shadow-[0_0_16px_rgba(255,255,255,0.1)]'
                    : cat.id === 'lilo' || cat.id === 'mikmik'
                    ? 'bg-[#18181B]/90 border-white/24'
                    : 'bg-[#18181B]/75 border-white/10'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2.5">
                    <StudioPreviewThumb
                      cacheKey={`cat:${cat.id}`}
                      renderThumbnail={getCatThumbnail ? () => getCatThumbnail(cat.id) : undefined}
                      alt={cat.name}
                      className="w-13 h-13 rounded-xl"
                      fallbackColorHex={coatCss}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-bold text-white glass-text-crisp truncate">
                            {cat.name}
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#09090B]/70 border border-white/15 text-[#D4D4D8] shrink-0">
                            {cat.sizeSummary}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" title={cat.eyesSummary}>
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/40"
                            style={{ backgroundColor: leftEyeCss }}
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/40"
                            style={{ backgroundColor: rightEyeCss }}
                          />
                          {collarCss && (
                            <span
                              className="w-2.5 h-2.5 rounded-sm border border-white/35"
                              style={{ backgroundColor: collarCss }}
                              title={cat.collarSummary}
                            />
                          )}
                        </div>
                      </div>

                      <p className="text-[10px] text-[#A1A1AA] leading-snug">
                        {cat.coatSummary} · {cat.eyesSummary} · {cat.collarSummary}
                      </p>
                    </div>
                  </div>

                  {cat.id === 'mikmik' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/25 text-[10px] font-mono font-bold text-white">
                      <Flame className="w-3 h-3 shrink-0 text-[#E4E4E7]" strokeWidth={2.3} />
                      <span>+30% Drink Revenue · +30% Mood Drain</span>
                    </div>
                  )}

                  {cat.id === 'lilo' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-400/45 text-[10px] font-mono font-bold text-emerald-300">
                      <InfinityIcon className="w-3 h-3 shrink-0" strokeWidth={2.4} />
                      <span>Pure Peace: Disables Customer Mood Meter</span>
                    </div>
                  )}

                  {!isUnlocked && cat.unlockType === 'revenue' && (
                    <div className="space-y-0.5 pt-0.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#A1A1AA]">
                        <span>Revenue Unlock</span>
                        <span>
                          ${Math.round(lifetimeGrossIncome).toLocaleString()} / ${revReq.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#27272A] overflow-hidden border border-white/12">
                        <div
                          className="h-full hud-platinum-bar"
                          style={{ width: `${revPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {!isUnlocked && cat.unlockType === 'master' && (
                    <div className="space-y-0.5 pt-0.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#D4D4D8]">
                        <span>Master Unlock</span>
                        <span>
                          {liloOwnedPrereqs} / {LILO_REQUIRED_CAT_IDS.length} Cats Unlocked
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#27272A] overflow-hidden border border-white/12">
                        <div
                          className="h-full hud-platinum-bar"
                          style={{ width: `${liloPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  data-testid={`btn-cat-${cat.id}`}
                  disabled={isEquipped || (!isUnlocked && !isShopBuyable)}
                  onClick={() => onPurchaseOrEquipCafeCat(cat.id)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                    isEquipped
                      ? 'bg-emerald-950/65 border border-emerald-400/45 text-emerald-300 cursor-default'
                      : isUnlocked || isShopBuyable
                      ? 'hud-platinum-pill cursor-pointer'
                      : 'bg-[#09090B]/60 border border-white/10 text-[#71717A] cursor-not-allowed'
                  }`}
                >
                  {isEquipped ? (
                    <>
                      <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                      <span>Active on Counter</span>
                    </>
                  ) : isUnlocked ? (
                    <span>Equip {cat.name}</span>
                  ) : cat.unlockType === 'shop' ? (
                    <span>Adopt · ${cat.unlockAmount.toLocaleString()}</span>
                  ) : cat.unlockType === 'revenue' ? (
                    <>
                      <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                      <span>Reach ${revReq.toLocaleString()} Rev</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                      <span>
                        Unlock All {LILO_REQUIRED_CAT_IDS.length} Cats ({liloOwnedPrereqs}/7)
                      </span>
                    </>
                  )}
                </button>
              </div>
            );
          };

          return (
            <div className="space-y-3 overflow-y-auto pr-1" data-testid="cafe-cats-panel">
              <div className="p-2.5 rounded-xl bg-[#18181B]/85 border border-white/12 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
                  <div className="text-[11px] text-white">
                    <span className="font-bold">Active Counter Cat: {activeCatSpec.name}</span>
                    {activeCatSpec.passiveTitle ? (
                      <span className="text-[#D4D4D8] ml-1.5">
                        · {activeCatSpec.passiveTitle}: {activeCatSpec.passiveDescription}
                      </span>
                    ) : (
                      <span className="text-[#A1A1AA] ml-1.5">· Tap on counter cushion to pet!</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {onOpenCatStation && (
                    <button
                      type="button"
                      data-testid="btn-upgrades-open-cat-station"
                      onClick={() => {
                        onClose();
                        onOpenCatStation();
                      }}
                      className="px-2.5 py-1 rounded-lg hud-platinum-pill text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Cat className="w-3 h-3 shrink-0" strokeWidth={2.4} />
                      <span>Visit Cat Station &amp; Wardrobe</span>
                    </button>
                  )}
                  <span className="text-[10px] font-mono text-[#D4D4D8] bg-[#09090B]/70 border border-white/15 px-2 py-0.5 rounded-md">
                    Lilo Mastery: {liloOwnedPrereqs} / {LILO_REQUIRED_CAT_IDS.length}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#E4E4E7] font-bold">
                  Cat Adoption Shop &amp; Starter
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {shopCats.map(renderCatCard)}
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                  Revenue Milestone &amp; Master Unlock Cats
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {milestoneCats.map(renderCatCard)}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tab 4: Real-Calendar 24-Hour Daily Login Rewards */}
        {activeTab === 'login_rewards' && (() => {
          const canClaimToday = canClaimLoginReward(gameState);
          const curLogin = gameState.dailyLogin;
          const todayKey = getLocalDateKey();
          let nextClaimableDay = 1;
          if (curLogin?.lastClaimDateKey) {
            const diff = getCalendarDayDiff(curLogin.lastClaimDateKey, todayKey);
            if (diff === 0) {
              nextClaimableDay = curLogin.streakDay;
            } else if (diff === 1) {
              nextClaimableDay = (curLogin.streakDay % 7) + 1;
            } else {
              nextClaimableDay = 1;
            }
          } else {
            nextClaimableDay = Math.max(1, Math.min(7, curLogin?.streakDay || 1));
          }

          return (
            <div className="space-y-2.5 overflow-y-auto pr-1" data-testid="daily-login-panel">
              <div className="p-2.5 rounded-xl bg-[#18181B]/85 border border-white/12 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
                  <div className="text-[11px] text-white">
                    <span className="font-bold">
                      24h Daily Owner Login · Streak Day {curLogin?.streakDay ?? 1} / 7
                    </span>
                    <span className="text-[#A1A1AA] ml-1.5">
                      · Strictly 1 claim per real calendar day
                    </span>
                  </div>
                </div>
                <span
                  data-testid="daily-login-countdown"
                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                    canClaimToday
                      ? 'bg-emerald-950/60 border-emerald-400/50 text-emerald-300'
                      : 'bg-[#09090B]/70 border-white/16 text-[#D4D4D8]'
                  }`}
                >
                  <Clock className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                  <span>{canClaimToday ? "Today's Reward Ready!" : midnightCountdown}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {loginRewards.map((item) => {
                  const isTodayClaimable = canClaimToday && item.day === nextClaimableDay;
                  const isAlreadyClaimed = item.claimed && !(canClaimToday && nextClaimableDay === 1);
                  const isLockedFuture = !isAlreadyClaimed && !isTodayClaimable;

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col justify-between gap-2 p-3 rounded-xl border transition-all ${
                        isTodayClaimable
                          ? 'bg-white/[0.09] border-white/45 shadow-[0_0_16px_rgba(255,255,255,0.1)]'
                          : 'bg-[#18181B]/75 border-white/10'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white glass-text-crisp">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-300 shrink-0 font-bold">
                            {item.rewardLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#A1A1AA] leading-snug">
                          {item.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        data-testid={`btn-claim-login-day-${item.day}`}
                        disabled={!isTodayClaimable}
                        onClick={() => onClaimLoginReward(item.day)}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
                          isAlreadyClaimed
                            ? 'bg-emerald-950/60 border border-emerald-400/40 text-emerald-300 cursor-default'
                            : isTodayClaimable
                            ? 'hud-platinum-pill cursor-pointer'
                            : 'bg-[#09090B]/60 border border-white/10 text-[#71717A] cursor-not-allowed'
                        }`}
                      >
                        {isAlreadyClaimed ? (
                          <>
                            <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                            <span>Claimed</span>
                          </>
                        ) : isTodayClaimable ? (
                          <span>Claim Day {item.day} Reward</span>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                            <span>
                              {!canClaimToday && item.day === (nextClaimableDay % 7) + 1
                                ? midnightCountdown
                                : isLockedFuture
                                ? `Day ${item.day} · Come Back Tomorrow`
                                : 'Locked'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
