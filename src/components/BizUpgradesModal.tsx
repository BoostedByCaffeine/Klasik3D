import React from 'react';
import { BizUpgradeItem } from '../game/rules';

interface BizUpgradesModalProps {
  cash: number;
  upgrades: BizUpgradeItem[];
  onPurchase: (upgradeId: string) => void;
  onClose: () => void;
}

export const BizUpgradesModal: React.FC<BizUpgradesModalProps> = ({
  cash,
  upgrades,
  onPurchase,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrades-modal-title"
    >
      <div className="w-full max-w-lg bg-[#1b120d] border border-[#5c3a21] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <div>
            <h2 id="upgrades-modal-title" className="text-base font-bold font-display text-amber-100">
              Equipment &amp; Acoustic Upgrades
            </h2>
            <p className="text-[11px] text-stone-400">
              Upgrade your commercial espresso bar and vinyl acoustics.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold font-mono tabular-nums text-emerald-400">
              ${Math.round(cash)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 rounded-lg bg-[#291c14] hover:bg-[#38261b] text-xs font-semibold text-stone-200 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {upgrades.map((upg) => {
            const canAfford = cash >= upg.cost && !upg.purchased;
            return (
              <div
                key={upg.id}
                className="flex flex-col justify-between gap-2 p-3 rounded-xl bg-[#241811] border border-stone-800"
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-amber-100 leading-tight">{upg.name}</div>
                  <div className="text-[10px] font-mono text-amber-400">{upg.effectLabel}</div>
                  <p className="text-[11px] text-stone-400 leading-snug">{upg.description}</p>
                </div>

                <button
                  type="button"
                  disabled={upg.purchased || !canAfford}
                  onClick={() => onPurchase(upg.id)}
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
      </div>
    </div>
  );
};
