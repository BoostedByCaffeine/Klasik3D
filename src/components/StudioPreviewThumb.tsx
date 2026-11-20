import React, { useEffect, useRef, useState } from 'react';

interface StudioPreviewThumbProps {
  cacheKey: string;
  renderThumbnail?: () => string;
  alt: string;
  className?: string;
  fallbackColorHex?: string;
}

/**
 * Phase 7: Lazily requests a single-context 3D PNG snapshot from ThumbnailStudio
 * after mount (outside React render) and renders a crisp cached <img>.
 */
export const StudioPreviewThumb: React.FC<StudioPreviewThumbProps> = ({
  cacheKey,
  renderThumbnail,
  alt,
  className = 'w-14 h-14 rounded-xl',
  fallbackColorHex = '#2a1d14',
}) => {
  const [src, setSrc] = useState<string>('');
  const renderRef = useRef(renderThumbnail);
  renderRef.current = renderThumbnail;

  useEffect(() => {
    if (!renderRef.current) return;
    let cancelled = false;
    const rafId = window.requestAnimationFrame(() => {
      if (cancelled || !renderRef.current) return;
      try {
        const url = renderRef.current();
        if (!cancelled && url) {
          setSrc(url);
        }
      } catch {
        // Fallback color block remains visible if WebGL is unavailable
      }
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [cacheKey]);

  return (
    <div
      className={`relative overflow-hidden shrink-0 bg-[#090705]/90 border border-[#f5a623]/30 shadow-inner flex items-center justify-center ${className}`}
      style={!src ? { backgroundColor: fallbackColorHex } : undefined}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain select-none pointer-events-none"
          draggable={false}
        />
      ) : (
        <span
          className="w-4 h-4 rounded-full opacity-55 border border-white/25"
          style={{ backgroundColor: fallbackColorHex }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
