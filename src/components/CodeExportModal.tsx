import React, { useState } from 'react';
import { KlasikGameState, exportSaveJson, importSaveJson } from '../game/rules';

interface CodeExportModalProps {
  gameState: KlasikGameState;
  onRestoreSave: (restored: KlasikGameState) => void;
  onClose: () => void;
}

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

  const handleImportSave = () => {
    const restored = importSaveJson(saveJsonText);
    if (!restored) {
      setFeedback('Invalid Save JSON format. Please check your backup data.');
      return;
    }
    onRestoreSave(restored);
    setFeedback('Save backup restored! Your Day, Cash, Upgrades, and Decor are updated.');
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto bg-[#1b120d] border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <div>
            <h2 id="export-modal-title" className="text-base sm:text-lg font-bold font-display text-amber-100">
              GitHub Deployment &amp; JSON Save Backup
            </h2>
            <p className="text-[11px] text-stone-400">
              Cross-device save transfer &amp; GitHub Pages static bundle pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#291c14] hover:bg-[#38261b] text-xs font-semibold text-stone-200 cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Save Backup Export / Import */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="save-json-textarea" className="text-xs font-semibold text-amber-200">
              Cafe Save Data JSON
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopySave}
                className="px-2.5 py-1 rounded-lg bg-[#291c14] hover:bg-[#38261b] border border-stone-700 text-[11px] font-medium text-amber-200 cursor-pointer"
              >
                Copy JSON
              </button>
              <button
                type="button"
                onClick={handleImportSave}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-bold cursor-pointer"
              >
                Import &amp; Restore
              </button>
            </div>
          </div>
          <textarea
            id="save-json-textarea"
            rows={5}
            value={saveJsonText}
            onChange={(e) => setSaveJsonText(e.target.value)}
            className="w-full rounded-xl bg-[#120c09] border border-stone-800 p-2.5 text-[11px] font-mono text-stone-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* GitHub Pages Deployment Commands */}
        <div className="p-3 rounded-xl bg-[#140d09] border border-stone-800 space-y-1 text-[11px] font-mono text-stone-300">
          <div className="text-amber-300 font-sans font-semibold">
            GitHub Pages (`boostedbycaffeine/klasik`) Pipeline:
          </div>
          <div>git init &amp;&amp; git add . &amp;&amp; git commit -m &quot;feat: Klasik 3D&quot;</div>
          <div>git remote add origin https://github.com/boostedbycaffeine/klasik.git</div>
          <div>git push -u origin main &amp;&amp; npm run build</div>
        </div>

        {feedback && (
          <div className="p-2.5 rounded-xl bg-[#291c14] border border-amber-500/40 text-xs text-amber-200">
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
};
