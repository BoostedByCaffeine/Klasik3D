import React, { useState } from 'react';
import {
  COZY_VINYL_PRESETS,
  SpotifyVinylState,
  spotifyManager,
} from '../game/spotifyManager';

interface SpotifyVinylModalProps {
  spotifyState: SpotifyVinylState;
  onClose: () => void;
}

export const SpotifyVinylModal: React.FC<SpotifyVinylModalProps> = ({
  spotifyState,
  onClose,
}) => {
  const [customInput, setCustomInput] = useState(spotifyState.customUriInput);
  const [clientIdInput, setClientIdInput] = useState(spotifyState.clientId);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleApplyUri = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) {
      setStatusMsg('Please paste a valid Spotify Playlist, Album, or Track link/URI.');
      return;
    }
    const ok = spotifyManager.applyCustomSpotifyLink(customInput);
    if (ok) {
      setStatusMsg('Synced Spotify vinyl! Embedded player activated below.');
    } else {
      setStatusMsg(
        'Format not recognized. Use https://open.spotify.com/playlist/... or spotify:playlist:...'
      );
    }
  };

  const handleConnectPkce = async () => {
    if (!clientIdInput.trim()) {
      setStatusMsg('Enter your Spotify Developer Client ID first.');
      return;
    }
    spotifyManager.setClientId(clientIdInput);
    const url = await spotifyManager.startPkceAuth();
    if (url) {
      window.location.href = url;
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotify-modal-title"
    >
      <div className="w-full max-w-lg bg-[#1b120d] border border-[#5c3a21] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <div>
            <h2 id="spotify-modal-title" className="text-base font-bold font-display text-amber-100">
              3D Vinyl Turntable &amp; Spotify Bridge
            </h2>
            <p className="text-[11px] text-stone-400">
              Spin curated records or link your Spotify playlists &amp; account.
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

        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#241811] border border-amber-500/30">
          <div>
            <div className="text-[10px] font-mono uppercase text-amber-400">
              NOW SPINNING ({spotifyState.rpm} RPM)
            </div>
            <div className="text-xs font-bold text-amber-100">
              {spotifyState.currentTrack.title}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => spotifyManager.togglePlayPause()}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer"
            >
              {spotifyState.isPlaying ? 'Lift Needle' : 'Drop Needle'}
            </button>
            <button
              type="button"
              onClick={() => spotifyManager.toggleRpm()}
              className="px-2.5 py-1.5 rounded-lg bg-[#2d1e15] border border-stone-700 text-xs font-mono text-amber-200 cursor-pointer"
            >
              {spotifyState.rpm} RPM
            </button>
            <button
              type="button"
              onClick={() => spotifyManager.nextTrack()}
              className="px-2.5 py-1.5 rounded-lg bg-[#2d1e15] border border-stone-700 text-xs font-semibold text-stone-200 cursor-pointer"
            >
              Next LP
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#120c09] rounded-xl border border-stone-800">
          <button
            type="button"
            onClick={() => spotifyManager.setMode('bridge')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              spotifyState.mode === 'bridge'
                ? 'bg-emerald-500 text-stone-950'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            Mode A: URI Bridge
          </button>
          <button
            type="button"
            onClick={() => spotifyManager.setMode('pkce')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              spotifyState.mode === 'pkce'
                ? 'bg-emerald-500 text-stone-950'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            Mode B: OAuth PKCE
          </button>
        </div>

        {spotifyState.mode === 'bridge' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {COZY_VINYL_PRESETS.map((preset) => {
                const active = spotifyState.currentTrack.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => spotifyManager.selectPreset(preset.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-[#2c1d13] border-amber-400'
                        : 'bg-[#211610] border-stone-800 hover:border-stone-600'
                    }`}
                  >
                    <div className="text-xs font-bold text-amber-100 truncate">{preset.title}</div>
                    <div className="text-[10px] font-mono text-amber-400 mt-1">
                      {preset.rpm} RPM
                    </div>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleApplyUri} className="flex gap-2">
              <input
                id="spotify-uri-input"
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Paste Spotify Playlist/Track URL or URI..."
                className="flex-1 rounded-lg bg-[#120c09] border border-stone-700 px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                Load LP
              </button>
            </form>

            <div className="space-y-2 pt-1 border-t border-stone-800">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-300 block">
                    Persistent Background Spotify Deck
                  </span>
                  <span className="text-[10px] text-stone-400 block">
                    Stays playing continuously in the background even after you close this modal!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => spotifyManager.setShowMiniEmbed(!spotifyState.showMiniEmbed)}
                  className="px-2.5 py-1 rounded-lg bg-[#291c14] border border-emerald-500/40 text-xs font-semibold text-emerald-300 cursor-pointer shrink-0"
                >
                  {spotifyState.showMiniEmbed ? 'Minimize Floating Player' : 'Show Floating Player'}
                </button>
              </div>
              {/* Space reserved for the persistent Spotify iframe docked below when modal is open */}
              <div className="h-[84px] rounded-xl border border-stone-800/80 bg-black/40 flex items-center justify-center text-[11px] text-stone-400">
                Spotify Vinyl Deck Active below — Press Play on the deck, then Close to keep BGM spinning!
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-3 rounded-xl bg-[#211610] border border-stone-800">
            <input
              id="spotify-client-id"
              type="text"
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              placeholder="Enter Spotify Developer Client ID"
              className="w-full rounded-lg bg-[#120c09] border border-stone-700 px-3 py-1.5 text-xs text-stone-100 font-mono"
            />
            <button
              type="button"
              onClick={handleConnectPkce}
              className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs cursor-pointer"
            >
              Authorize with Spotify PKCE
            </button>
          </div>
        )}

        {statusMsg && (
          <div className="p-2.5 rounded-xl bg-[#291c14] border border-amber-500/40 text-xs text-amber-200">
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
};
