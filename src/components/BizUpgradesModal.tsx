import React, { useState } from 'react';
import {
  Check,
  Clock,
  Coffee,
  Crown,
  Gift,
  Lock,
  Shirt,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  CustomerSkinPackId,
  GOLDEN_MACHINE_GROSS_THRESHOLD,
  GrinderSkinId,
  KlasikGameState,
  MachineSkinId,
  PitcherSkinId,
} from '../game/rules';

interface BizUpgradesModalProps {
  gameState: KlasikGameState;
  onPurchaseUpgrade: (upgradeId: string) => void;
  onUnlockOrEquipEquipmentSkin: (
    skinId: MachineSkinId | GrinderSkinId | PitcherSkinId
  ) => void;
  onUnlockOrEquipCustomerPack: (packId: CustomerSkinPackId) => void;
  onClaimLoginReward: (day: number) => void;
  onClose: () => void;
}

type HubTab = 'upgrades' | 'equipment_skins' | 'customer_skins' | 'login_rewards';

export const BizUpgradesModal: React.FC<BizUpgradesModalProps> = ({
  gameState,
  onPurchaseUpgrade,
  onUnlockOrEquipEquipmentSkin,
  onUnlockOrEquipCustomerPack,
  onClaimLoginReward,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<HubTab>('upgrades');

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
  } = gameState;

  const grossPct = Math.min(
    100,
    Math.round((lifetimeGrossIncome / GOLDEN_MACHINE_GROSS_THRESHOLD) * 100)
  );
  const remainingGrossForGold = Math.max(
    0,
    Math.round(GOLDEN_MACHINE_GROSS_THRESHOLD - lifetimeGrossIncome)
  );
  const isGoldenEquipped = equippedMachineSkin === 'golden-espresso-machine';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrades-modal-title"
    >
      <div className="w-full max-w-2xl glass-modal rounded-2xl p-3.5 sm:p-5 space-y-3 max-h-[86vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-400/20 pb-2.5 shrink-0 gap-2">
          <div>
            <h2
              id="upgrades-modal-title"
              className="text-sm sm:text-base font-bold font-display text-[#FAF5EE] glass-text-crisp"
            >
              Cafe Upgrades, Golden 150K Skins &amp; Login Unlockables
            </h2>
            <p className="text-[11px] text-[#E7D7C1]/85">
              60+ Unlockables · Gross Income: ${Math.round(lifetimeGrossIncome).toLocaleString()} /
              $150,000
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
              className="px-3 py-1.5 rounded-lg glass-btn-inner text-xs font-semibold text-[#FAF5EE] cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Offline Lucide Icons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 shrink-0">
          {(
            [
              { id: 'upgrades', label: `Upgrades (${upgrades.length})`, Icon: Zap },
              { id: 'equipment_skins', label: 'Golden 150K & Skins', Icon: Crown },
              {
                id: 'customer_skins',
                label: `Customer Skins (${customerSkinPacks.length})`,
                Icon: Shirt,
              },
              { id: 'login_rewards', label: 'Login Rewards (7)', Icon: Gift },
            ] as const
          ).map((t) => {
            const Icon = t.Icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                  activeTab === t.id
                    ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 text-[#160E09] font-bold shadow-[0_6px_18px_-4px_rgba(245,158,11,0.5)]'
                    : 'glass-btn-inner text-[#E7D7C1]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
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
                  className="flex flex-col justify-between gap-2 p-3 rounded-xl bg-white/[0.06] border border-amber-400/20"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[#FAF5EE] glass-text-crisp leading-tight">
                        {upg.name}
                      </span>
                      <span className="text-[10px] font-mono text-amber-300 shrink-0">
                        {upg.effectLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#E7D7C1]/85 leading-snug">{upg.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled={upg.purchased || !canAfford}
                    onClick={() => onPurchaseUpgrade(upg.id)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono tabular-nums whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
                      upg.purchased
                        ? 'bg-emerald-950/60 border border-emerald-400/40 text-emerald-300 cursor-default'
                        : canAfford
                        ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-500 text-[#160E09] cursor-pointer shadow-[0_6px_18px_-4px_rgba(245,158,11,0.5)]'
                        : 'bg-black/30 border border-amber-400/15 text-[#E7D7C1]/45 cursor-not-allowed'
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

        {/* Tab 2: Golden Espresso Machine ($150k Gross Income -> 2x Sale Income) & Equipment Skins */}
        {activeTab === 'equipment_skins' && (
          <div className="space-y-3 overflow-y-auto pr-1">
            {/* Hero Golden Espresso Machine Milestone Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/75 via-amber-900/35 to-amber-950/75 border-2 border-amber-400/70 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1">
                    <Trophy className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                    <span>TRUE GRINDER PRESTIGE REWARD · 2X SALE INCOME MULTIPLIER</span>
                  </span>
                  <h3 className="text-sm font-bold text-[#FAF5EE] glass-text-crisp">
                    Golden Espresso Machine (24K Solid Gold Dual-Boiler)
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300 bg-black/45 px-2.5 py-1 rounded-lg border border-amber-400/40">
                  ${Math.round(lifetimeGrossIncome).toLocaleString()} / $150,000 Gross
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-black/45 overflow-hidden border border-amber-400/30">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all"
                  style={{ width: `${grossPct}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-[#E7D7C1]/95">
                  Earned exclusively by grinding to $150,000 gross income. Doubles (2x) all drink
                  sale income &amp; table tips once equipped!
                </span>
                <div className="flex items-center gap-2">
                  {lifetimeGrossIncome < GOLDEN_MACHINE_GROSS_THRESHOLD ? (
                    <span
                      data-testid="golden-machine-locked-badge"
                      className="px-3 py-1.5 rounded-lg bg-black/45 border border-amber-400/35 text-[#E7D7C1]/75 font-mono font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
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
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-500 text-[#160E09] font-bold text-xs cursor-pointer shadow-[0_6px_18px_-4px_rgba(245,158,11,0.5)] flex items-center gap-1.5"
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
                  Boolean(skin.grossIncomeRequirement) &&
                  lifetimeGrossIncome < (skin.grossIncomeRequirement || 0);
                const canAfford = !needsGross && (skin.unlocked || cash >= skin.cost);

                return (
                  <div
                    key={skin.id}
                    className={`flex flex-col justify-between gap-2 p-3 rounded-xl border ${
                      isEquipped
                        ? 'bg-amber-500/15 border-amber-400/75'
                        : 'bg-white/[0.06] border-amber-400/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                            style={{ backgroundColor: skin.previewColorHex }}
                          />
                          <span className="text-xs font-bold text-[#FAF5EE] glass-text-crisp truncate">
                            {skin.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono uppercase text-amber-300 shrink-0">
                          {skin.slot}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#E7D7C1]/85 leading-snug">
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
                          ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-500 text-[#160E09] cursor-pointer shadow-[0_6px_18px_-4px_rgba(245,158,11,0.45)]'
                          : 'bg-black/30 border border-amber-400/15 text-[#E7D7C1]/45 cursor-not-allowed'
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
                          <span>Requires $150K Gross ({grossPct}%)</span>
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
                      ? 'bg-amber-500/15 border-amber-400/75'
                      : 'bg-white/[0.06] border-amber-400/20'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-[#FAF5EE] glass-text-crisp">
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
                    <p className="text-[11px] text-[#E7D7C1]/85 leading-snug">{pack.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled={isEquipped || !canAfford}
                    onClick={() => onUnlockOrEquipCustomerPack(pack.id)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
                      isEquipped
                        ? 'bg-emerald-950/65 border border-emerald-400/45 text-emerald-300 cursor-default'
                        : canAfford
                        ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-500 text-[#160E09] cursor-pointer shadow-[0_6px_18px_-4px_rgba(245,158,11,0.45)]'
                        : 'bg-black/30 border border-amber-400/15 text-[#E7D7C1]/45 cursor-not-allowed'
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

        {/* Tab 4: Playtime & Milestone-Gated Loyalty / Login Unlockables */}
        {activeTab === 'login_rewards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1">
            {loginRewards.map((item) => {
              const activeSecs = gameState.activeShiftSeconds ?? 0;
              const reqSecs = item.requiredShiftSeconds ?? 600;
              const reqOrders = item.requiredOrdersServed ?? 15;
              const servedOrders = gameState.totalCupsServed ?? 0;

              const timePct = Math.min(100, Math.round((activeSecs / reqSecs) * 100));
              const ordersPct = Math.min(100, Math.round((servedOrders / reqOrders) * 100));
              const overallPct = Math.round((timePct + ordersPct) / 2);
              const isUnlockedToClaim = activeSecs >= reqSecs && servedOrders >= reqOrders;

              const fmtTime = (secs: number) => {
                const m = Math.floor(secs / 60);
                const s = Math.floor(secs % 60);
                return `${m}:${s < 10 ? '0' : ''}${s}`;
              };

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-2 p-3 rounded-xl bg-white/[0.06] border border-amber-400/20"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[#FAF5EE] glass-text-crisp">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300 shrink-0">
                        {item.rewardLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#E7D7C1]/85 leading-snug">{item.description}</p>

                    {/* Verifiable Playtime & Orders Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#E7D7C1]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-300 shrink-0" strokeWidth={2.2} />
                          <span>
                            {fmtTime(activeSecs)} / {fmtTime(reqSecs)} Shift Time
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Coffee className="w-3 h-3 text-amber-300 shrink-0" strokeWidth={2.2} />
                          <span>
                            {servedOrders} / {reqOrders} Orders
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/45 overflow-hidden border border-amber-400/25">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all"
                          style={{ width: `${item.claimed ? 100 : overallPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={item.claimed || !isUnlockedToClaim}
                    onClick={() => onClaimLoginReward(item.day)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
                      item.claimed
                        ? 'bg-emerald-950/60 border border-emerald-400/40 text-emerald-300 cursor-default'
                        : isUnlockedToClaim
                        ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-500 text-[#160E09] cursor-pointer shadow-[0_6px_18px_-4px_rgba(245,158,11,0.5)]'
                        : 'bg-black/30 border border-amber-400/15 text-[#E7D7C1]/45 cursor-not-allowed'
                    }`}
                  >
                    {item.claimed ? (
                      <>
                        <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                        <span>Claimed</span>
                      </>
                    ) : isUnlockedToClaim ? (
                      <span>Claim Tier {item.day} Unlockable</span>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                        <span>Locked ({overallPct}% Complete)</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
