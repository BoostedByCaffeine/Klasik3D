import React, { useState } from 'react';
import {
  Copy,
  Download,
  KeyRound,
  Maximize2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';
import { GraphicsQuality } from '../game/rules';
import { APP_VERSION, formatApkFileName, formatAppVersionBadge } from '../game/appVersion';
import { PwaEnvironmentStatus, pwaManager } from '../pwa/pwaManager';

interface PwaApkModalProps {
  pwaStatus: PwaEnvironmentStatus;
  graphicsQuality: GraphicsQuality;
  onChangeGraphics: (quality: GraphicsQuality) => void;
  onClose: () => void;
}

const KEYSTORE_SETUP_CMD = `keytool -genkeypair -v -keystore klasik3d-release.keystore -alias klasik3d -keyalg RSA -keysize 2048 -validity 10000 && base64 -w 0 klasik3d-release.keystore`;

const ANDROID_APK_WORKFLOW_YAML = `name: Build Klasik 3D Android APK
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
      - name: Build Versioned & Signed Offline APK (In-Place Update Ready)
        env:
          ANDROID_KEYSTORE_BASE64: \${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: \${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: \${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: \${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          npm install --save --legacy-peer-deps --no-audit --no-fund @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
          rm -rf android
          npx cap add android
          node scripts/patch-android-capacitor.mjs
          npx cap sync android
          if [ -n "\${ANDROID_KEYSTORE_BASE64:-}" ]; then
            echo "\$ANDROID_KEYSTORE_BASE64" | base64 --decode > "\$PWD/android/app/klasik3d-release.keystore"
            export ANDROID_KEYSTORE_PATH="\$PWD/android/app/klasik3d-release.keystore"
            cd android && chmod +x gradlew && ./gradlew assembleRelease --no-daemon
            cp app/build/outputs/apk/release/app-release.apk ../Klasik3D.apk
          else
            cd android && chmod +x gradlew && ./gradlew assembleDebug --no-daemon
            cp app/build/outputs/apk/debug/app-debug.apk ../Klasik3D.apk
          fi`;

const LOCAL_APK_BUILD_SCRIPT = `#!/usr/bin/env bash
# Klasik 3D: Garage Garden Cafe — Versioned In-Place Updatable Android APK Builder
# Uses app-version.json (versionName + versionCode) and optional persistent release keystore.
set -e
VERSION_NAME=$(node -e "console.log(require('./app-version.json').versionName)")
VERSION_CODE=$(node -e "console.log(require('./app-version.json').versionCode)")
echo "Building Klasik 3D v\${VERSION_NAME} (versionCode \${VERSION_CODE})..."
npm install --legacy-peer-deps --no-audit --no-fund
VITE_APP_PLATFORM=apk npx vite build --base=./

npm install --save --legacy-peer-deps --no-audit --no-fund @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
rm -rf android
npx cap add android
node scripts/patch-android-capacitor.mjs
npx cap sync android

if [ -n "\${ANDROID_KEYSTORE_PATH:-}" ]; then
  echo "Signing release APK with persistent keystore for seamless in-place updates..."
  cd android && chmod +x gradlew && ./gradlew assembleRelease --no-daemon
  cp app/build/outputs/apk/release/app-release.apk "../Klasik3D-v\${VERSION_NAME}.apk"
  cp app/build/outputs/apk/release/app-release.apk ../Klasik3D.apk
else
  echo "Tip: Set ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, and ANDROID_KEY_ALIAS to enable in-place updates without uninstalling."
  cd android && chmod +x gradlew && ./gradlew assembleDebug --no-daemon
  cp app/build/outputs/apk/debug/app-debug.apk "../Klasik3D-v\${VERSION_NAME}.apk"
  cp app/build/outputs/apk/debug/app-debug.apk ../Klasik3D.apk
fi
echo "Done! Saved ./Klasik3D-v\${VERSION_NAME}.apk and ./Klasik3D.apk"
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
    const versionedApkName = formatApkFileName();
    try {
      const resp = await fetch('./Klasik3D.apk', { method: 'HEAD' });
      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && !contentType.includes('text/html')) {
        const a = document.createElement('a');
        a.href = './Klasik3D.apk';
        a.download = versionedApkName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setInstallMsg(`Downloading ${versionedApkName} (${formatAppVersionBadge()})!`);
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
    a.download = `build-klasik3d-v${APP_VERSION.versionName}-apk.sh`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setIsCheckingApk(false);
    setInstallMsg(
      `Downloaded build script for ${formatAppVersionBadge()}! Push to GitHub to auto-build ${versionedApkName} via .github/workflows/android-apk.yml.`
    );
  };

  const handleCopyApkWorkflow = async () => {
    try {
      await navigator.clipboard.writeText(ANDROID_APK_WORKFLOW_YAML);
      setInstallMsg(
        'Copied versioned .github/workflows/android-apk.yml! It is already configured in your repository.'
      );
    } catch {
      setInstallMsg('Workflow is ready at .github/workflows/android-apk.yml in the repository.');
    }
  };

  const handleCopyKeystoreCommand = async () => {
    try {
      await navigator.clipboard.writeText(KEYSTORE_SETUP_CMD);
      setInstallMsg(
        'Copied one-time keytool command! Save the base64 output as GitHub Secret ANDROID_KEYSTORE_BASE64 (plus ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS=klasik3d, ANDROID_KEY_PASSWORD) so future APKs update without uninstalling.'
      );
    } catch {
      setInstallMsg(
        'Run keytool to create klasik3d-release.keystore once and store it in GitHub Actions secrets for in-place APK upgrades.'
      );
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
      className="absolute inset-0 hud-safe-frame z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-modal-title"
    >
      <div className="w-full max-w-xl glass-modal rounded-2xl p-3 sm:p-4 space-y-2.5 max-h-full overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between border-b border-white/12 pb-2 gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="pwa-modal-title"
                className="text-sm sm:text-base font-bold font-display text-white glass-text-crisp"
              >
                Android APK Updates &amp; 3D Settings
              </h2>
              <span
                data-testid="pwa-version-badge"
                className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] font-mono font-bold text-[#E4E4E7]"
              >
                {formatAppVersionBadge()}
              </span>
            </div>
            <p className="text-[10px] text-[#A1A1AA] truncate">
              Package: <span className="font-mono text-zinc-300">{APP_VERSION.applicationId}</span>{' '}
              · 100% Offline-Ready Build
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg glass-btn-inner text-xs font-semibold text-white cursor-pointer flex items-center gap-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span>Close</span>
          </button>
        </div>

        {/* 1. Native Android APK (.apk) Section */}
        <div className="p-2.5 rounded-xl bg-[#18181B]/85 border border-white/14 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-300 shrink-0" strokeWidth={2.2} />
              <span>Native Android APK ({formatApkFileName()})</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-400/40 text-[9px] font-mono font-bold text-emerald-300 shrink-0 inline-flex items-center gap-1">
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
              className="p-2 rounded-xl hud-platinum-pill font-bold text-xs text-left cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                <span>Download APK</span>
              </span>
              <span className="text-[9px] font-mono bg-black/15 px-1.5 py-0.5 rounded">
                v{APP_VERSION.versionName}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopyApkWorkflow}
              className="p-2 rounded-xl glass-btn-inner text-white font-semibold text-xs text-left cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-[#D4D4D8] shrink-0" strokeWidth={2.2} />
                <span>Copy APK Workflow</span>
              </span>
              <span className="text-[9px] font-mono text-[#A1A1AA]">YAML</span>
            </button>
          </div>

          {/* Seamless In-Place APK Upgrade Info */}
          <div className="p-2 rounded-lg bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-[10px] text-[#B4B4BE] leading-snug flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0 mt-0.5" strokeWidth={2.2} />
              <span>
                <strong className="text-white">Update Without Uninstalling:</strong> Bump{' '}
                <span className="font-mono text-zinc-200">app-version.json</span> (increment{' '}
                <span className="font-mono text-zinc-200">versionCode</span>) and sign with your
                persistent GitHub keystore secret to preserve all cafe saves.
              </span>
            </div>
            <button
              type="button"
              data-testid="btn-copy-keystore-cmd"
              onClick={handleCopyKeystoreCommand}
              className="px-2 py-1 rounded-lg glass-btn-inner text-[10px] font-semibold text-white inline-flex items-center gap-1 cursor-pointer shrink-0 self-start sm:self-center"
            >
              <KeyRound className="w-3 h-3 text-amber-300 shrink-0" strokeWidth={2.2} />
              <span>Keystore Cmd</span>
            </button>
          </div>
        </div>

        {/* 2. 3-Tier Graphics Settings (LOW / MED / MAX) */}
        <div className="p-2.5 rounded-xl bg-[#18181B]/80 border border-white/10 space-y-1.5">
          <div className="text-xs font-bold text-white glass-text-crisp flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D4D4D8] shrink-0" strokeWidth={2.2} />
            <span>3D Graphics Quality (LOW · MED · MAX)</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onChangeGraphics('low')}
              className={`p-2 rounded-xl text-left cursor-pointer transition-transform ${
                graphicsQuality === 'low'
                  ? 'hud-platinum-pill font-bold'
                  : 'glass-btn-inner text-[#D4D4D8]'
              }`}
            >
              <div className="text-xs font-bold">LOW (60 FPS)</div>
              <div
                className={`text-[10px] ${
                  graphicsQuality === 'low' ? 'text-[#09090B]/80' : 'text-[#A1A1AA]'
                }`}
              >
                0.8x DPR · No Shadows · Solid HUD
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChangeGraphics('medium')}
              className={`p-2 rounded-xl text-left cursor-pointer transition-transform ${
                graphicsQuality === 'medium'
                  ? 'hud-platinum-pill font-bold'
                  : 'glass-btn-inner text-[#D4D4D8]'
              }`}
            >
              <div className="text-xs font-bold">MED (Balanced)</div>
              <div
                className={`text-[10px] ${
                  graphicsQuality === 'medium' ? 'text-[#09090B]/80' : 'text-[#A1A1AA]'
                }`}
              >
                1.25x DPR · Soft Shadows · Glass
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChangeGraphics('max')}
              className={`p-2 rounded-xl text-left cursor-pointer transition-transform ${
                graphicsQuality === 'max'
                  ? 'hud-platinum-pill font-bold'
                  : 'glass-btn-inner text-[#D4D4D8]'
              }`}
            >
              <div className="text-xs font-bold">MAX (Ultra HD)</div>
              <div
                className={`text-[10px] ${
                  graphicsQuality === 'max' ? 'text-[#09090B]/80' : 'text-[#A1A1AA]'
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
            className="p-2 rounded-xl glass-btn-inner text-white font-bold text-left cursor-pointer"
          >
            <div className="text-xs flex items-center gap-1">
              <Download className="w-3.5 h-3.5 text-[#D4D4D8] shrink-0" strokeWidth={2.2} />
              <span>Install Fullscreen PWA</span>
            </div>
            <div className="text-[10px] font-normal text-[#A1A1AA]">
              {pwaStatus.isInstallable ? 'One-click install ready' : 'Add to Home Screen'}
            </div>
          </button>

          <button
            type="button"
            onClick={handleLockLandscape}
            className="p-2 rounded-xl glass-btn-inner text-white font-bold text-left cursor-pointer"
          >
            <div className="text-xs flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-[#D4D4D8] shrink-0" strokeWidth={2.2} />
              <span>Fullscreen Landscape Lock</span>
            </div>
            <div className="text-[10px] font-normal text-[#A1A1AA]">
              Hide Android system bars
            </div>
          </button>
        </div>

        {installMsg && (
          <div className="p-2.5 rounded-xl bg-white/[0.08] border border-white/22 text-xs text-[#E4E4E7]">
            {installMsg}
          </div>
        )}
      </div>
    </div>
  );
};
