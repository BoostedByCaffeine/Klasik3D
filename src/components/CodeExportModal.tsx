import React, { useState } from 'react';
import { Copy, Save, Upload, X } from 'lucide-react';
import { KlasikGameState, exportSaveJson, importSaveJson } from '../game/rules';

interface CodeExportModalProps {
  gameState: KlasikGameState;
  onRestoreSave: (restored: KlasikGameState) => void;
  onClose: () => void;
}

const GITHUB_WORKFLOW_YAML = `name: Deploy Klasik 3D to GitHub Pages & Bundle APK
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm install --legacy-peer-deps --no-audit --no-fund
      - run: npx vite build --base=./
      - run: cp ./dist/index.html ./dist/404.html && touch ./dist/.nojekyll
      - name: Set up JDK 21 & Build Klasik3D.apk into ./dist/Klasik3D.apk
        continue-on-error: true
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
      - name: Compile Android APK
        continue-on-error: true
        run: |
          npm install --save --legacy-peer-deps --no-audit --no-fund @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
          rm -rf android
          npx cap add android
          npx cap sync android
          cd android && chmod +x gradlew && ./gradlew assembleDebug --no-daemon
          cp app/build/outputs/apk/debug/app-debug.apk ../dist/Klasik3D.apk
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4`;

export const CodeExportModal: React.FC<CodeExportModalProps> = ({
  gameState,
  onRestoreSave,
  onClose,
}) => {
  const [saveJsonText, setSaveJsonText] = useState(() => exportSaveJson(gameState));
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCopySave = async () => {
    try {
      await navigator.clipboard.writeText(saveJsonText);
      setFeedback('Copied JSON save backup to clipboard!');
    } catch {
      setFeedback('Select and copy the JSON text below manually.');
    }
  };

  const handleCopyWorkflow = async () => {
    try {
      await navigator.clipboard.writeText(GITHUB_WORKFLOW_YAML);
      setFeedback('Copied .github/workflows/deploy.yml (lockfile-agnostic) to clipboard!');
    } catch {
      setFeedback('Workflow is pre-configured in .github/workflows/deploy.yml.');
    }
  };

  const handleImportSave = () => {
    const restored = importSaveJson(saveJsonText);
    if (!restored) {
      setFeedback('Invalid Save JSON format. Please check your backup data.');
      return;
    }
    onRestoreSave(restored);
    setFeedback('Save backup restored! Your Day, Cash, Quota, Upgrades, and Decor are updated.');
  };

  return (
    <div
      className="absolute inset-0 hud-safe-frame z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="w-full max-w-lg max-h-full overflow-y-auto glass-modal rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between border-b border-white/12 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#18181B] border border-white/20 flex items-center justify-center text-[#E4E4E7] shrink-0">
              <Save className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div>
              <h2
                id="export-modal-title"
                className="text-base sm:text-lg font-bold font-display text-white glass-text-crisp"
              >
                GitHub Deployment &amp; JSON Save Backup
              </h2>
              <p className="text-[11px] text-[#A1A1AA]">
                Cross-device save transfer &amp; lockfile-safe GitHub Pages Actions pipeline.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg glass-btn-inner text-xs font-semibold text-white cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span>Close</span>
          </button>
        </div>

        {/* Save Backup Export / Import */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="save-json-textarea" className="text-xs font-semibold text-[#E4E4E7]">
              Cafe Save Data JSON
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopySave}
                className="px-2.5 py-1 rounded-lg glass-btn-inner text-[11px] font-medium text-[#E4E4E7] cursor-pointer flex items-center gap-1"
              >
                <Copy className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                <span>Copy JSON</span>
              </button>
              <button
                type="button"
                onClick={handleImportSave}
                className="px-2.5 py-1 rounded-lg hud-platinum-pill text-[11px] font-bold cursor-pointer flex items-center gap-1"
              >
                <Upload className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                <span>Import &amp; Restore</span>
              </button>
            </div>
          </div>
          <textarea
            id="save-json-textarea"
            rows={4}
            value={saveJsonText}
            onChange={(e) => setSaveJsonText(e.target.value)}
            className="w-full rounded-xl bg-[#09090B]/80 border border-white/15 p-2.5 text-[11px] font-mono text-white focus:outline-none focus:border-white/45"
          />
        </div>

        {/* GitHub Pages Deployment Guide */}
        <div className="p-3 rounded-xl bg-[#18181B]/80 border border-white/10 space-y-1.5 text-[11px] font-mono text-[#D4D4D8]">
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold font-sans">
              GitHub Actions Auto-Deploy (.github/workflows/deploy.yml)
            </span>
            <button
              type="button"
              onClick={handleCopyWorkflow}
              className="px-2 py-0.5 rounded glass-btn-inner text-[10px] font-sans font-semibold text-[#E4E4E7] cursor-pointer flex items-center gap-1"
            >
              <Copy className="w-2.5 h-2.5 shrink-0" strokeWidth={2.2} />
              <span>Copy Workflow YAML</span>
            </button>
          </div>
          <p className="text-[11px] font-sans text-[#A1A1AA] leading-relaxed">
            Pre-configured in <code className="text-[#E4E4E7]">.github/workflows/deploy.yml</code>{' '}
            and <code className="text-[#E4E4E7]">.github/workflows/android-apk.yml</code>. In GitHub
            Settings &rarr; Pages, set Source to <strong className="text-white">GitHub Actions</strong>.
          </p>
        </div>

        {feedback && (
          <div className="p-2.5 rounded-xl bg-white/[0.08] border border-white/22 text-xs text-[#E4E4E7] font-medium text-center">
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
};
