import React, { useState } from 'react';
import { Copy, Download, Maximize2, Smartphone, Sparkles, WifiOff, X } from 'lucide-react';
import { GraphicsQuality } from '../game/rules';
import { PwaEnvironmentStatus, pwaManager } from '../pwa/pwaManager';

interface PwaApkModalProps {
  pwaStatus: PwaEnvironmentStatus;
  graphicsQuality: GraphicsQuality;
  onChangeGraphics: (quality: GraphicsQuality) => void;
  onClose: () => void;
}

const ANDROID_APK_WORKFLOW_YAML = `name: Build Klasik 3D Offline Android APK
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: write
jobs:
  build-android-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
      - run: npm install --legacy-peer-deps --no-audit --no-fund
      - run: VITE_APP_PLATFORM=apk npx vite build --base=./
      - name: Build Capacitor Landscape Fullscreen Offline APK
        run: |
          npm install --save --legacy-peer-deps --no-audit --no-fund @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
          rm -rf android
          npx cap add android
          npx cap sync android
          cd android && chmod +x gradlew && ./gradlew assembleDebug --no-daemon
          cp app/build/outputs/apk/debug/app-debug.apk ../Klasik3D.apk
      - uses: actions/upload-artifact@v4
        with:
          name: Klasik3D-Android-APK
          path: ./Klasik3D.apk`;

const LOCAL_APK_BUILD_SCRIPT = `#!/usr/bin/env bash
# Klasik 3D: Garage Garden Cafe — One-Command 100% Offline Native Android APK Builder
set -e
echo "Building Klasik 3D offline-ready WebGL bundle (VITE_APP_PLATFORM=apk)..."
npm install --legacy-peer-deps --no-audit --no-fund
VITE_APP_PLATFORM=apk npx vite build --base=./

echo "Adding Capacitor Android wrapper (Landscape + Fullscreen Immersive + Offline Bundled)..."
npm install --save --legacy-peer-deps --no-audit --no-fund @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
rm -rf android
npx cap add android
npx cap sync android

echo "Compiling Klasik3D.apk with Gradle..."
cd android && chmod +x gradlew && ./gradlew assembleDebug --no-daemon
cp app/build/outputs/apk/debug/app-debug.apk ../Klasik3D.apk
echo "Success! 100% Offline Native Android package saved to ./Klasik3D.apk"
`;

export const PwaApkModal: React.FC<PwaApkModalProps> = ({
  pwaStatus,
  graphicsQuality,
  onChangeGraphics,
  onClose,
}) => {
  const [installMsg, setInstallMsg] = useState<string | null>(null);
  const [isCheckingApk, setIsCheckingApk] = useState(false);

  const handleDownloadDirectApk = async () => {
    setIsCheckingApk(true);
    setInstallMsg(null);
    try {
      const resp = await fetch('./Klasik3D.apk', { method: 'HEAD' });
      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && !contentType.includes('text/html')) {
        const a = document.createElement('a');
        a.href = './Klasik3D.apk';
        a.download = 'Klasik3D-GarageGardenCafe.apk';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setInstallMsg('Downloading Klasik3D-GarageGardenCafe.apk!');
        setIsCheckingApk(false);
        return;
      }
    } catch {
      // Fallback below
    }

    const blob = new Blob([LOCAL_APK_BUILD_SCRIPT], { type: 'text/x-shellscript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'build-klasik3d-apk.sh';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setIsCheckingApk(false);
    setInstallMsg(
      'Downloaded build-klasik3d-apk.sh! Push to GitHub to auto-build Klasik3D.apk via .github/workflows/android-apk.yml (with VITE_APP_PLATFORM=apk & 100% offline assets), or run bash build-klasik3d-apk.sh locally.'
    );
  };

  const handleCopyApkWorkflow = async () => {
    try {
      await navigator.clipboard.writeText(ANDROID_APK_WORKFLOW_YAML);
      setInstallMsg(
        'Copied .github/workflows/android-apk.yml! It is also pre-installed in your repository.'
      );
    } catch {
      setInstallMsg('Workflow is ready at .github/workflows/android-apk.yml in the repository.');
    }
  };

  const handleTriggerInstall = async () => {
    const res = await pwaManager.promptInstall();
    if (res === 'accepted') {
      setInstallMsg(
        'Klasik 3D installed! Launch from your home screen in Fullscreen Landscape mode.'
      );
    } else if (res === 'unavailable') {
      setInstallMsg(
        'Use your browser menu ("Install App" / "Add to Home Screen") or download the native Android APK above.'
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

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-modal-title"
    >
      <div className="w-full max-w-xl glass-modal rounded-2xl p-3 sm:p-4 space-y-2.5 max-h-[94%] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between border-b border-amber-400/20 pb-2">
          <div>
            <h2
              id="pwa-modal-title"
              className="text-sm sm:text-base font-bold font-display text-[#FAF5EE] glass-text-crisp"
            >
              Android APK Offline Package &amp; 3D Graphics Settings
            </h2>
            <p className="text-[10px] text-[#E7D7C1]/85">
              100% Offline-Compatible `.apk` Build (Phone Spotify App Redirect + Internal Vinyl
              Player)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg glass-btn-inner text-xs font-semibold text-[#FAF5EE] cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span>Close</span>
          </button>
        </div>

        {/* 1. Native Android APK (.apk) Section */}
        <div className="p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-400/35 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
              <span>Native Android APK (`Klasik3D.apk` · 100% Offline Ready)</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-mono font-bold text-emerald-200 shrink-0 inline-flex items-center gap-1">
              <WifiOff className="w-2.5 h-2.5" strokeWidth={2.2} />
              <span>OFFLINE APK</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="btn-download-apk"
              disabled={isCheckingApk}
              onClick={handleDownloadDirectApk}
              className="p-2 rounded-xl bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-[#160E09] font-bold text-xs text-left cursor-pointer shadow-[0_6px_18px_-4px_rgba(16,185,129,0.45)] flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                <span>Download Klasik3D.apk</span>
              </span>
              <span className="text-[9px] font-mono bg-black/15 px-1.5 py-0.5 rounded">
                .APK
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopyApkWorkflow}
              className="p-2 rounded-xl glass-btn-inner text-amber-200 font-semibold text-xs text-left cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                <span>Copy GitHub APK Workflow</span>
              </span>
              <span className="text-[9px] font-mono text-amber-300">YAML</span>
            </button>
          </div>
        </div>

        {/* 2. 3-Tier Graphics Settings (LOW / MED / MAX) */}
        <div className="p-2.5 rounded-xl bg-white/[0.06] border border-amber-400/20 space-y-1.5">
          <div className="text-xs font-bold text-[#FAF5EE] glass-text-crisp flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
            <span>3D Graphics Quality (LOW · MED · MAX)</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onChangeGraphics('low')}
              className={`p-2 rounded-xl text-left cursor-pointer transition-all ${
                graphicsQuality === 'low'
                  ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 text-[#160E09] border border-amber-300 font-bold shadow-[0_6px_18px_-4px_rgba(245,158,11,0.45)]'
                  : 'glass-btn-inner text-[#E7D7C1]'
              }`}
            >
              <div className="text-xs font-bold">LOW (60 FPS)</div>
              <div
                className={`text-[10px] ${
                  graphicsQuality === 'low' ? 'text-[#160E09]/85' : 'text-[#E7D7C1]/75'
                }`}
              >
                0.8x DPR · No Shadows · Solid HUD
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChangeGraphics('medium')}
              className={`p-2 rounded-xl text-left cursor-pointer transition-all ${
                graphicsQuality === 'medium'
                  ? 'bg-gradient-to-b from-sky-400 to-indigo-400 text-[#0c1220] border border-sky-300 font-bold shadow-[0_6px_18px_-4px_rgba(56,189,248,0.45)]'
                  : 'glass-btn-inner text-[#E7D7C1]'
              }`}
            >
              <div className="text-xs font-bold">MED (Balanced)</div>
              <div
                className={`text-[10px] ${
                  graphicsQuality === 'medium' ? 'text-[#0c1220]/85' : 'text-[#E7D7C1]/75'
                }`}
              >
                1.25x DPR · Soft Shadows · Glass
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChangeGraphics('max')}
              className={`p-2 rounded-xl text-left cursor-pointer transition-all ${
                graphicsQuality === 'max'
                  ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 text-[#160E09] border border-amber-300 font-bold shadow-[0_6px_18px_-4px_rgba(245,158,11,0.45)]'
                  : 'glass-btn-inner text-[#E7D7C1]'
              }`}
            >
              <div className="text-xs font-bold">MAX (Ultra HD)</div>
              <div
                className={`text-[10px] ${
                  graphicsQuality === 'max' ? 'text-[#160E09]/85' : 'text-[#E7D7C1]/75'
                }`}
              >
                2.0x DPR · Full Shadows &amp; Reflections
              </div>
            </button>
          </div>
        </div>

        {/* 3. Fullscreen WebAPK & Landscape Orientation Lock */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleTriggerInstall}
            className="p-2 rounded-xl glass-btn-inner text-[#FAF5EE] font-bold text-left cursor-pointer"
          >
            <div className="text-xs flex items-center gap-1">
              <Download className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
              <span>Install Fullscreen PWA</span>
            </div>
            <div className="text-[10px] font-normal text-[#E7D7C1]/80">
              {pwaStatus.isInstallable ? 'One-click install ready' : 'Add to Home Screen'}
            </div>
          </button>

          <button
            type="button"
            onClick={handleLockLandscape}
            className="p-2 rounded-xl glass-btn-inner text-[#FAF5EE] font-bold text-left cursor-pointer"
          >
            <div className="text-xs flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2.2} />
              <span>Fullscreen Landscape Lock</span>
            </div>
            <div className="text-[10px] font-normal text-[#E7D7C1]/80">
              Hide Android system bars
            </div>
          </button>
        </div>

        {installMsg && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/45 text-xs text-amber-200">
            {installMsg}
          </div>
        )}
      </div>
    </div>
  );
};
