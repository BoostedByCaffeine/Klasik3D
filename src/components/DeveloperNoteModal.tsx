import React, { useEffect } from 'react';
import { Coffee, Heart, Sparkles, X } from 'lucide-react';
import { formatAppVersionBadge } from '../game/appVersion';

interface DeveloperNoteModalProps {
  isFirstLaunch?: boolean;
  onClose: () => void;
}

export const DeveloperNoteModal: React.FC<DeveloperNoteModalProps> = ({
  isFirstLaunch = false,
  onClose,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      data-testid="developer-note-modal"
      className="absolute inset-0 hud-safe-frame z-50 flex items-center justify-center bg-black/72 backdrop-blur-md p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-note-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-full overflow-y-auto no-scrollbar rounded-2xl bg-[#09090B]/95 border border-white/18 shadow-[0_28px_70px_-14px_rgba(0,0,0,0.92)] p-4 sm:p-6 text-[#E4E4E7] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/12 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-300 shrink-0">
              <Heart className="w-4 h-4 fill-amber-300/30" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#A1A1AA]">
                {isFirstLaunch ? 'Welcome to Klasik 3D' : 'Personal Dedication'}
              </div>
              <h2
                id="dev-note-title"
                className="text-base sm:text-lg font-bold font-display text-white glass-text-crisp truncate"
              >
                A Note from the Developer
              </h2>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-close-dev-note"
            onClick={onClose}
            aria-label="Close Developer Note"
            className="w-8 h-8 rounded-lg glass-btn-inner flex items-center justify-center text-[#D4D4D8] hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Heartfelt Reorganized Developer Message */}
        <div className="space-y-3 text-xs sm:text-[13.5px] leading-relaxed text-[#D4D4D8]">
          <p className="text-white font-medium">
            Hi there—thank you so much for visiting the cafe and playing or installing{' '}
            <span className="font-semibold text-amber-200">Klasik 3D: Garage Garden Cafe</span>.
          </p>

          <p>
            This cozy little world was built primarily for my girlfriend, inspired by the things
            she loves most: crafting drinks in barista games, a classic red Miata parked right out
            front, adorable cafe cats, and peaceful sceneries from around the world.
          </p>

          <p>
            Whether you&apos;re pulling your first espresso shot, hanging out with the cats, or
            just taking in the view outside, I hope this game brings a warm, relaxing moment to
            your day. Thank you sincerely for playing and sharing in something made with love.
          </p>
        </div>

        {/* Signature + Version Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA]">
            <Coffee className="w-3.5 h-3.5 text-amber-300/90 shrink-0" strokeWidth={2.2} />
            <span>
              Made with love · <strong className="text-zinc-200">BoostedByCaffeine Studios</strong>
            </span>
          </div>
          <span
            data-testid="dev-note-version-badge"
            className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/12 text-[10px] font-mono text-[#A1A1AA]"
          >
            {formatAppVersionBadge()}
          </span>
        </div>

        {/* Primary CTA */}
        <div className="flex items-center justify-end gap-2 pt-0.5">
          <button
            type="button"
            data-testid="btn-continue-dev-note"
            onClick={onClose}
            className="w-full sm:w-auto btn-brushed-platinum px-6 py-2.5 rounded-full font-extrabold text-xs tracking-[0.16em] uppercase inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#09090B] shrink-0" strokeWidth={2.4} />
            <span>{isFirstLaunch ? 'Continue to Cafe' : 'Close Note'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
