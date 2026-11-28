import React, { useEffect } from 'react';
import { X } from 'lucide-react';
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
      className="absolute inset-0 hud-safe-frame z-50 flex items-center justify-center bg-[#0d0b09]/70 backdrop-blur-[3px] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-note-title"
      onClick={onClose}
    >
      {/* Warm tactile archival cafe note card (zero glass-pill / sparkle AI-slop tropes) */}
      <div
        className="relative w-full max-w-[460px] max-h-full overflow-y-auto no-scrollbar rounded-sm bg-[#F6F1E7] text-[#241E1A] shadow-[0_24px_60px_-14px_rgba(0,0,0,0.72)] border border-[#D8CEBC] p-2 sm:p-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border border-[#DFD6C5] px-5 py-5 sm:px-7 sm:py-6 space-y-5">
          {/* Quiet Header */}
          <div className="flex items-start justify-between gap-4 border-b border-[#E4DCCA] pb-3.5">
            <div>
              <p className="text-[11px] text-[#7D6E5D] tracking-[0.04em]">
                {isFirstLaunch ? 'Before you open the shop' : 'A note from the maker'}
              </p>
              <h2
                id="dev-note-title"
                className="mt-0.5 text-xl sm:text-[22px] font-serif font-semibold tracking-tight text-[#1E1815] leading-snug"
              >
                Hey, thanks for stopping by.
              </h2>
            </div>

            <button
              type="button"
              data-testid="btn-close-dev-note"
              onClick={onClose}
              aria-label="Close developer note"
              className="w-8 h-8 -mr-1.5 -mt-1 rounded-md flex items-center justify-center text-[#786A5B] hover:text-[#1E1815] hover:bg-[#EAE1D0] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" strokeWidth={1.9} />
            </button>
          </div>

          {/* Genuine, Humanized First-Person Message */}
          <div className="space-y-3.5 text-[13.5px] sm:text-[14.5px] leading-[1.68] text-[#352C26]">
            <p>
              Thank you for playing or installing{' '}
              <span className="font-semibold text-[#1E1815]">Klasik 3D</span>. I really appreciate
              you taking the time to try it out.
            </p>

            <p>
              I actually built this game mostly for my girlfriend. She loves barista games, classic
              Miatas, cats, and pretty views from around the world, so I tried to put all of her
              favorite things together in one cozy little cafe.
            </p>

            <p>
              I hope it gives you a nice, quiet break whenever you open it. Pull a cup, hang out
              with the cats, and enjoy the scenery outside.
            </p>
          </div>

          {/* Quiet Sign-Off & Unboxed Build Caption */}
          <div className="pt-3.5 border-t border-[#E4DCCA] flex items-end justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-[13px] font-serif italic text-[#2C241E]">
                — BoostedByCaffeine
              </div>
              <div
                data-testid="dev-note-version-badge"
                className="text-[11px] text-[#857666] tabular-nums"
              >
                Klasik 3D · {formatAppVersionBadge()}
              </div>
            </div>

            <button
              type="button"
              data-testid="btn-continue-dev-note"
              onClick={onClose}
              className="px-5 py-2.5 rounded-md bg-[#231C17] hover:bg-[#362B23] active:bg-[#19130F] text-[#F6F1E7] text-xs sm:text-[13px] font-medium tracking-[0.01em] transition-colors cursor-pointer shrink-0"
            >
              {isFirstLaunch ? 'Open the cafe' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
