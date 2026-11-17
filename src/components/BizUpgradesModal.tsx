import React, { useState } from 'react';
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
  onUnlockGoldenMilestoneNow: () => void;
  onClose: () => void;
}

type HubTab = 'upgrades' | 'equipment_skins' | 'customer_skins' | 'login_rewards';

export const BizUpgradesModal: React.FC<BizUpgradesModalProps> = ({
  gameState,
  onPurchaseUpgrade,
  onUnlockOrEquipEquipmentSkin,
  onUnlockOrEquipCustomerPack,
  onClaimLoginReward,
  onUnlockGoldenMilestoneNow,
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
  const isGoldenEquipped = equippedMachineSkin === 'golden-espresso-machine';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrades-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#1b120d] border border-[#5c3a21] rounded-2xl p-3.5 sm:p-5 shadow-2xl space-y-3 max-h-[86vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5 shrink-0 gap-2">
          <div>
            <h2
              id="upgrades-modal-title"
              className="text-sm sm:text-base font-bold font-display text-amber-100"
            >
              Cafe Upgrades, Golden 100K Skins &amp; Login Unlockables
            </h2>
            <p className="text-[11px] text-stone-400">
              60+ Unlockables · Gross Income: ${Math.round(lifetimeGrossIncome).toLocaleString()} / $100,000
              {isGoldenEquipped ? ' · 🏆 2x GOLDEN SALE INCOME ACTIVE!' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold font-mono tabular-nums text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
              ${Math.round(cash).toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-[#291c14] hover:bg-[#38261b] text-xs font-semibold text-stone-200 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 shrink-0">
          {(
            [
              { id: 'upgrades', label: `⚡ Upgrades (${upgrades.length})` },
              { id: 'equipment_skins', label: '👑 Golden 100K & Equipment Skins' },
              { id: 'customer_skins', label: `🧥 Customer Skins (${customerSkinPacks.length})` },
              { id: 'login_rewards', label: '🎁 Daily Login Rewards (7)' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === t.id
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'bg-[#241811] text-stone-300 border border-stone-800 hover:border-stone-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: 14 Shop Upgrades */}
        {activeTab === 'upgrades' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1">
            {upgrades.map((upg) => {
              const canAfford = cash >= upg.cost && !upg.purchased;
              return (
                <div
                  key={upg.id}
                  className="flex flex-col justify-between gap-2 p-3 rounded-xl bg-[#241811] border border-stone-800"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-amber-100 leading-tight">
                        {upg.name}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 shrink-0">
                        {upg.effectLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug">{upg.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled={upg.purchased || !canAfford}
                    onClick={() => onPurchaseUpgrade(upg.id)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono tabular-nums whitespace-nowrap transition-colors ${
                      upg.purchased
                        ? 'bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 cursor-default'
                        : canAfford
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer shadow'
                        : 'bg-stone-900 border border-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    {upg.purchased ? 'Installed' : `Buy · $${upg.cost}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Golden Espresso Machine ($100k Gross Income -> 2x Sale Income) & Equipment Skins */}
        {activeTab === 'equipment_skins' && (
          <div className="space-y-3 overflow-y-auto pr-1">
            {/* Hero Golden Espresso Machine Milestone Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/90 via-[#2b1d0e] to-amber-950/90 border-2 border-amber-400/70 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 block">
                    🏆 GRAND MILESTONE SKIN · 2X SALE INCOME MULTIPLIER
                  </span>
                  <h3 className="text-sm font-bold text-amber-100">
                    Golden Espresso Machine (24K Solid Gold Dual-Boiler)
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300 bg-stone-950/70 px-2.5 py-1 rounded-lg border border-amber-400/40">
                  ${Math.round(lifetimeGrossIncome).toLocaleString()} / $100,000 Gross
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-stone-950 overflow-hidden border border-amber-500/30">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all"
                  style={{ width: `${grossPct}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-amber-100/90">
                  Doubles (2x) all drink sale income &amp; table tips once equipped!
                </span>
                <div className="flex items-center gap-2">
                  {lifetimeGrossIncome < GOLDEN_MACHINE_GROSS_THRESHOLD && (
                    <button
                      type="button"
                      onClick={onUnlockGoldenMilestoneNow}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs cursor-pointer shadow"
                    >
                      Unlock &amp; Equip 100K Golden Machine Now
                    </button>
                  )}
                  {lifetimeGrossIncome >= GOLDEN_MACHINE_GROSS_THRESHOLD && (
                    <button
                      type="button"
                      onClick={() =>
                        onUnlockOrEquipEquipmentSkin(
                          isGoldenEquipped ? 'classic-steel' : 'golden-espresso-machine'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs cursor-pointer shadow"
                    >
                      {isGoldenEquipped ? 'Equipped (2x Active) · Unequip' : 'Equip Golden Machine (2x)'}
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
                  skin.grossIncomeRequirement &&
                  lifetimeGrossIncome < skin.grossIncomeRequirement &&
                  !skin.unlocked;
                const canAfford = skin.unlocked || (!needsGross && cash >= skin.cost);

                return (
                  <div
                    key={skin.id}
                    className={`flex flex-col justify-between gap-2 p-3 rounded-xl border ${
                      isEquipped
                        ? 'bg-[#2c1f14] border-amber-400'
                        : 'bg-[#241811] border-stone-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                            style={{ backgroundColor: skin.previewColorHex }}
                          />
                          <span className="text-xs font-bold text-amber-100 truncate">
                            {skin.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono uppercase text-amber-400 shrink-0">
                          {skin.slot}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-snug">{skin.description}</p>
                    </div>

                    <button
                      type="button"
                      disabled={isEquipped || !canAfford}
                      onClick={() => onUnlockOrEquipEquipmentSkin(skin.id)}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-colors ${
                        isEquipped
                          ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 cursor-default'
                          : canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                          : 'bg-stone-900 border border-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {isEquipped
                        ? 'Equipped on 3D Counter'
                        : skin.unlocked
                        ? 'Equip Skin'
                        : needsGross
                        ? `Requires $100K Gross (${grossPct}%)`
                        : `Unlock & Equip · $${skin.cost}`}
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
                      ? 'bg-[#2c1f14] border-amber-400'
                      : 'bg-[#241811] border-stone-800'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-amber-100">{pack.name}</span>
                      <div className="flex items-center gap-1">
                        {pack.paletteColors.slice(0, 4).map((hex) => (
                          <span
                            key={hex}
                            className="w-2.5 h-2.5 rounded-full border border-white/20"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug">{pack.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled={isEquipped || !canAfford}
                    onClick={() => onUnlockOrEquipCustomerPack(pack.id)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-colors ${
                      isEquipped
                        ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 cursor-default'
                        : canAfford
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                        : 'bg-stone-900 border border-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    {isEquipped
                      ? 'Active Patron Style'
                      : pack.unlocked
                      ? 'Activate Patron Pack'
                      : `Unlock Pack · $${pack.cost}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 4: 7-Day Login Unlockables */}
        {activeTab === 'login_rewards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1">
            {loginRewards.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-2 p-3 rounded-xl bg-[#241811] border border-stone-800"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-amber-100">{item.title}</span>
                    <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                      {item.rewardLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-snug">{item.description}</p>
                </div>

                <button
                  type="button"
                  disabled={item.claimed}
                  onClick={() => onClaimLoginReward(item.day)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-colors ${
                    item.claimed
                      ? 'bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 cursor-default'
                      : 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer shadow'
                  }`}
                >
                  {item.claimed ? 'Claimed ✓' : `Claim Day ${item.day} Unlockable`}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
