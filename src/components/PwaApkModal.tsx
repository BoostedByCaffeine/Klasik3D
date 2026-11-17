import React, { useState } from 'react';
import { PwaEnvironmentStatus, pwaManager } from '../pwa/pwaManager';

interface PwaApkModalProps {
  pwaStatus: PwaEnvironmentStatus;
  onClose: () => void;
}

export const PwaApkModal: React.FC<PwaApkModalProps> = ({ pwaStatus, onClose }) => {
  const [installMsg, setInstallMsg] = useState<string | null>(null);
  const [generatedIconUrl, setGeneratedIconUrl] = useState<string | null>(null);

  const handleTriggerInstall = async () => {
    const res = await pwaManager.promptInstall();
    if (res === 'accepted') {
      setInstallMsg('Klasik 3D installed! Launch from your home screen in full Landscape mode.');
    } else if (res === 'unavailable') {
      setInstallMsg(
        'Use your browser menu ("Install App" or "Add to Home Screen") or generate an Android APK below.'
      );
    }
  };

  const handleLockLandscape = async () => {
    const locked = await pwaManager.lockLandscape();
    setInstallMsg(
      locked
        ? 'Fullscreen Landscape Orientation locked!'
        : 'Entered fullscreen mode (automatic 90° CSS landscape wrapper active on portrait screens).'
    );
  };

  const handleGeneratePngIcons = async () => {
    const dataUrl = await pwaManager.generatePngIconDataUrl(512, false);
    setGeneratedIconUrl(dataUrl);
    setInstallMsg('Generated 512x512 PNG icon for APK / iOS packaging!');
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-modal-title"
    >
      <div className="w-full max-w-lg bg-[#1b120d] border border-[#5c3a21] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <div>
            <h2 id="pwa-modal-title" className="text-base font-bold font-display text-amber-100">
              Landscape PWA &amp; Android APK Packaging
            </h2>
            <p className="text-[11px] text-stone-400">
              Offline Service Worker (`public/sw.js`) &amp; Landscape Lock active.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-[#291c14] hover:bg-[#38261b] text-xs font-semibold text-stone-200 cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleTriggerInstall}
            className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-left cursor-pointer space-y-0.5 shadow"
          >
            <div className="text-xs">Install Standalone PWA</div>
            <div className="text-[11px] font-normal text-stone-900">
              {pwaStatus.isInstallable
                ? 'One-click install ready'
                : 'Install via browser / Home Screen'}
            </div>
          </button>

          <button
            type="button"
            onClick={handleLockLandscape}
            className="p-3 rounded-xl bg-[#241811] hover:bg-[#312118] border border-amber-500/35 text-amber-100 font-bold text-left cursor-pointer space-y-0.5"
          >
            <div className="text-xs">Fullscreen Landscape Lock</div>
            <div className="text-[11px] font-normal text-stone-400">
              Lock horizontal barista view
            </div>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-[#211610] border border-stone-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-amber-200">
                PNG App Icon Generator (512x512)
              </div>
              <div className="text-[11px] text-stone-400">
                Download raster PNG icons for iOS and Android APK builders.
              </div>
            </div>
            <button
              type="button"
              onClick={handleGeneratePngIcons}
              className="px-2.5 py-1 rounded-lg bg-[#2d1e15] hover:bg-[#3b281c] border border-amber-500/30 text-xs font-semibold text-amber-200 cursor-pointer shrink-0"
            >
              Render 512px PNG
            </button>
          </div>

          {generatedIconUrl && (
            <div className="flex items-center gap-3 pt-1">
              <img
                src={generatedIconUrl}
                alt="Generated Klasik 3D 512x512 App Icon"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-lg border border-amber-500/40"
              />
              <a
                href={generatedIconUrl}
                download="pwa-512x512.png"
                className="px-2.5 py-1 rounded-lg bg-emerald-500 text-stone-950 font-bold text-xs"
              >
                Download pwa-512x512.png
              </a>
            </div>
          )}
        </div>

        {installMsg && (
          <div className="p-2.5 rounded-xl bg-[#291c14] border border-amber-500/40 text-xs text-amber-200">
            {installMsg}
          </div>
        )}
      </div>
    </div>
  );
};
