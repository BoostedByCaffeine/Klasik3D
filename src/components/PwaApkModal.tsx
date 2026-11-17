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
      - uses: android-actions/setup-android@v3
      - run: npm install --legacy-peer-deps --no-audit --no-fund
      - run: VITE_APP_PLATFORM=apk npx vite build --base=./
      - name: Build Capacitor Landscape Fullscreen Offline APK
        run: |
          npm install --no-save --legacy-peer-deps @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
          npx cap add android
          sed -i 's/android:name=".MainActivity"/android:name=".MainActivity" android:screenOrientation="sensorLandscape"/' android/app/src/main/AndroidManifest.xml
          npx cap sync android
          cd android && chmod +x gradlew && ./gradlew assembleDebug
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
npm install --no-save --legacy-peer-deps @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
if [ ! -d "android" ]; then
  npx cap add android
fi
sed -i 's/android:name=".MainActivity"/android:name=".MainActivity" android:screenOrientation="sensorLandscape"/' android/app/src/main/AndroidManifest.xml
npx cap sync android

echo "Compiling Klasik3D.apk with Gradle..."
cd android && chmod +x gradlew && ./gradlew assembleDebug
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

  const isMaxGraphics = graphicsQuality !== 'low';

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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-modal-title"
    >
      <div className="w-full max-w-xl bg-[#1b120d] border border-amber-500/40 rounded-2xl p-3 sm:p-4 shadow-2xl space-y-2 max-h-[94%] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
          <div>
            <h2
              id="pwa-modal-title"
              className="text-sm sm:text-base font-bold font-display text-amber-100"
            >
              Android APK Offline Package &amp; 3D Graphics Settings
            </h2>
            <p className="text-[10px] text-stone-400">
              100% Offline-Compatible `.apk` Build (Phone Spotify App Redirect + Internal Vinyl
              Player)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-[#291c14] hover:bg-[#38261b] text-xs font-semibold text-stone-200 cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>

        {/* 1. Native Android APK (.apk) Section */}
        <div className="p-2.5 rounded-xl bg-[#140d09] border border-emerald-500/40 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>Native Android APK (`Klasik3D.apk` · 100% Offline Ready)</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-mono font-bold text-emerald-300 shrink-0 inline-flex items-center gap-1">
              <WifiOff className="w-2.5 h-2.5" />
              <span>OFFLINE APK</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="btn-download-apk"
              disabled={isCheckingApk}
              onClick={handleDownloadDirectApk}
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs text-left cursor-pointer shadow flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Download Klasik3D.apk</span>
              </span>
              <span className="text-[9px] font-mono bg-stone-950/15 px-1.5 py-0.5 rounded">
                .APK
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopyApkWorkflow}
              className="p-2 rounded-xl bg-[#241811] hover:bg-[#312118] border border-amber-500/35 text-amber-200 font-semibold text-xs text-left cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Copy GitHub APK Workflow</span>
              </span>
              <span className="text-[9px] font-mono text-amber-300">YAML</span>
            </button>
          </div>
        </div>

        {/* 2. 2-State Graphics Settings (LOW vs MAX Only) */}
        <div className="p-2.5 rounded-xl bg-[#211610] border border-stone-800 space-y-1.5">
          <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>3D Graphics Quality (LOW or MAX Only)</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeGraphics('low')}
              className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                !isMaxGraphics
                  ? 'bg-amber-500 text-stone-950 border-amber-300 font-bold shadow'
                  : 'bg-[#140d09] text-stone-300 border-stone-800 hover:border-stone-600'
              }`}
            >
              <div className="text-xs font-bold">LOW (Battery / 60 FPS)</div>
              <div
                className={`text-[10px] ${
                  !isMaxGraphics ? 'text-stone-900' : 'text-stone-400'
                }`}
              >
                0.85x DPR · No Shadows · Fast
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChangeGraphics('max')}
              className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                isMaxGraphics
                  ? 'bg-amber-500 text-stone-950 border-amber-300 font-bold shadow'
                  : 'bg-[#140d09] text-stone-300 border-stone-800 hover:border-stone-600'
              }`}
            >
              <div className="text-xs font-bold">MAX (High-End Android HD)</div>
              <div
                className={`text-[10px] ${
                  isMaxGraphics ? 'text-stone-900' : 'text-stone-400'
                }`}
              >
                2.0x Retina DPR · Soft Shadows · PBR
              </div>
            </button>
          </div>
        </div>

        {/* 3. Fullscreen WebAPK & Landscape Orientation Lock */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleTriggerInstall}
            className="p-2 rounded-xl bg-[#241811] hover:bg-[#312118] border border-amber-500/35 text-amber-100 font-bold text-left cursor-pointer"
          >
            <div className="text-xs flex items-center gap-1">
              <Download className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Install Fullscreen PWA</span>
            </div>
            <div className="text-[10px] font-normal text-stone-400">
              {pwaStatus.isInstallable ? 'One-click install ready' : 'Add to Home Screen'}
            </div>
          </button>

          <button
            type="button"
            onClick={handleLockLandscape}
            className="p-2 rounded-xl bg-[#241811] hover:bg-[#312118] border border-amber-500/35 text-amber-100 font-bold text-left cursor-pointer"
          >
            <div className="text-xs flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Fullscreen Landscape Lock</span>
            </div>
            <div className="text-[10px] font-normal text-stone-400">
              Hide Android system bars
            </div>
          </button>
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
