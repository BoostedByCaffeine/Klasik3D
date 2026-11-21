import React, { useState } from 'react';
import {
  ArrowLeft,
  Camera,
  CloudSnow,
  Compass,
  Eye,
  EyeOff,
  Home,
  Mountain,
  Store,
} from 'lucide-react';
import {
  ClimateState,
  SceneryId,
  getScenerySpec,
  isAlwaysWinterScenery,
} from '../game/rules';
import {
  OUTDOOR_VANTAGE_LIST,
  OutdoorVantageKey,
} from '../game/OutdoorOverlookController';

interface OutdoorOverlookOverlayProps {
  activeScenery: SceneryId;
  activeVantage: OutdoorVantageKey;
  isSnowing: boolean;
  climateState: ClimateState;
  waitingOrdersCount: number;
  onSelectVantage: (vantage: OutdoorVantageKey) => void;
  onBackInside: () => void;
}

export const OutdoorOverlookOverlay: React.FC<OutdoorOverlookOverlayProps> = ({
  activeScenery,
  activeVantage,
  isSnowing,
  climateState,
  waitingOrdersCount,
  onSelectVantage,
  onBackInside,
}) => {
  const [photoModeHidden, setPhotoModeHidden] = useState(false);
  const scenerySpec = getScenerySpec(activeScenery);
  const alwaysWinter = isAlwaysWinterScenery(activeScenery);

  const renderVantageIcon = (key: OutdoorVantageKey) => {
    if (key === 'porch') return <Home className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />;
    if (key === 'overlook') return <Mountain className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />;
    return <Store className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />;
  };

  if (photoModeHidden) {
    return (
      <div
        className="fixed inset-0 z-30 pointer-events-none flex items-start justify-end p-3"
        data-testid="outdoor-photo-mode-overlay"
      >
        <button
          type="button"
          data-testid="btn-outdoor-show-hud"
          onClick={() => setPhotoModeHidden(false)}
          className="pointer-events-auto px-3 py-1.5 rounded-full bg-[#09090B]/80 hover:bg-[#18181B]/92 border border-white/20 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 cursor-pointer shadow-lg transition-all"
          aria-label="Restore Outdoor HUD"
        >
          <Eye className="w-3.5 h-3.5 text-[#E4E4E7] shrink-0" strokeWidth={2.3} />
          <span>Show HUD</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 overflow-hidden"
      data-testid="outdoor-overlook-overlay"
    >
      {/* TOP BAR: Back Inside | Scenery Title & Subtitle | Mood Paused + Hide HUD */}
      <div className="flex items-start justify-between gap-2 pointer-events-none">
        <button
          type="button"
          data-testid="btn-outdoor-back-inside"
          onClick={onBackInside}
          className="pointer-events-auto px-3 py-1.5 rounded-xl bg-[#09090B]/84 hover:bg-[#18181B]/95 border border-white/15 hover:border-white/35 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md cursor-pointer shadow-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#E4E4E7] shrink-0" strokeWidth={2.4} />
          <span>Back Inside</span>
        </button>

        {/* Active Scenery Pill */}
        <div
          data-testid="outdoor-scenery-badge"
          className="pointer-events-auto px-3.5 py-1.5 rounded-2xl bg-[#09090B]/82 border border-white/15 backdrop-blur-md shadow-lg text-center max-w-[48vw] sm:max-w-md"
        >
          <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-white glass-text-crisp truncate">
            <Compass className="w-3.5 h-3.5 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
            <span className="truncate">{scenerySpec.name}</span>
            {(alwaysWinter || isSnowing) && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-sky-300/15 border border-[#BAE6FD]/35 text-[9px] font-mono text-[#BAE6FD] shrink-0">
                <CloudSnow className="w-2.5 h-2.5 shrink-0" strokeWidth={2.2} />
                <span>{alwaysWinter ? 'Always Winter' : 'Snow'}</span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-[#A1A1AA] truncate">
            {scenerySpec.subtitle} · {scenerySpec.badgeText}
            {!alwaysWinter && climateState === 'winter' ? ' · Winter' : ''}
          </div>
        </div>

        {/* Right Controls: Mood Paused Badge + Photo Mode Hide HUD */}
        <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
          <span
            data-testid="outdoor-mood-paused-badge"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#09090B]/82 border border-white/15 text-[10px] sm:text-[11px] font-mono font-semibold text-white backdrop-blur-md shadow"
            title={
              waitingOrdersCount > 0
                ? `${waitingOrdersCount} customer(s) waiting safely inside — mood timers paused`
                : 'Customer mood timers safely paused while outside'
            }
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] shrink-0" />
            <span>Mood Paused</span>
          </span>

          <button
            type="button"
            data-testid="btn-outdoor-hide-hud"
            onClick={() => setPhotoModeHidden(true)}
            className="px-2.5 py-1.5 rounded-xl bg-[#09090B]/84 hover:bg-[#18181B]/95 border border-white/15 hover:border-white/35 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md cursor-pointer shadow-lg transition-colors"
            title="Hide HUD for clean panoramic photo view"
          >
            <Camera className="w-3.5 h-3.5 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
            <span className="hidden sm:inline">Hide HUD</span>
            <EyeOff className="w-3 h-3 sm:hidden text-[#E4E4E7]" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* BOTTOM BAR: One-Tap Vantage Pills + Subtle Look/Zoom Hint */}
      <div className="flex flex-col items-center gap-1.5 pointer-events-none">
        <div className="px-3 py-0.5 rounded-full bg-[#09090B]/78 border border-white/12 text-[10px] text-[#A1A1AA] backdrop-blur-md">
          Drag to look · Pinch / scroll to zoom
        </div>

        <div
          className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#09090B]/86 border border-white/15 backdrop-blur-xl shadow-2xl"
          role="group"
          aria-label="Outdoor Scenic Vantage Spots"
        >
          {OUTDOOR_VANTAGE_LIST.filter(
            (vantage) => scenerySpec.hasScenicOverlook || vantage.key !== 'overlook'
          ).map((vantage) => {
            const active = activeVantage === vantage.key;
            return (
              <button
                key={vantage.key}
                type="button"
                data-testid={`btn-vantage-${vantage.key}`}
                onClick={() => onSelectVantage(vantage.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-transform whitespace-nowrap ${
                  active
                    ? 'hud-platinum-pill'
                    : 'bg-white/[0.05] hover:bg-white/[0.12] text-[#E4E4E7] hover:text-white border border-transparent hover:border-white/25'
                }`}
              >
                {renderVantageIcon(vantage.key)}
                <span>{vantage.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
