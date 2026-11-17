import React, { useState } from 'react';
import {
  Disc3,
  ExternalLink,
  Globe,
  Music,
  Pause,
  Play,
  Radio,
  SkipForward,
  Smartphone,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  COZY_VINYL_PRESETS,
  SpotifyVinylState,
  buildNativePhoneSpotifyLinks,
  spotifyManager,
} from '../game/spotifyManager';
import { AppRuntimeVersion } from '../pwa/pwaManager';

interface SpotifyVinylModalProps {
  spotifyState: SpotifyVinylState;
  appVersion: AppRuntimeVersion;
  onClose: () => void;
}

export const SpotifyVinylModal: React.FC<SpotifyVinylModalProps> = ({
  spotifyState,
  appVersion,
  onClose,
}) => {
  const [customInput, setCustomInput] = useState(spotifyState.customUriInput);
  const [clientIdInput, setClientIdInput] = useState(spotifyState.clientId);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const isApkVersion = appVersion === 'apk';
  const phoneLinks = buildNativePhoneSpotifyLinks(spotifyState.currentTrack.spotifyUri);

  const handleApplyUri = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) {
      setStatusMsg(
        isApkVersion
          ? 'Enter a Spotify track/playlist URI or song name to sync with the internal vinyl player.'
          : 'Please paste a valid Spotify Playlist, Album, or Track link/URI.'
      );
      return;
    }
    const ok = spotifyManager.applyCustomSpotifyLink(customInput);
    if (ok) {
      setStatusMsg(
        isApkVersion
          ? 'Synced track to the Internal Vinyl Music Player! Tap "Open Phone Spotify App" to play on your phone.'
          : 'Synced Spotify Web vinyl! Embedded web player activated below.'
      );
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

  const handleOpenPhoneSpotify = () => {
    const uri = spotifyManager.redirectToPhoneSpotifyApp(customInput);
    setStatusMsg(
      `Redirecting to your phone's Spotify app (${uri})... Start your song in Spotify and return to Klasik 3D!`
    );
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotify-modal-title"
    >
      <div className="w-full max-w-lg bg-[#1b120d] border border-[#5c3a21] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[84vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
              <Disc3 className={`w-4 h-4 ${spotifyState.isPlaying ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2
                id="spotify-modal-title"
                className="text-sm sm:text-base font-bold font-display text-amber-100 flex items-center gap-2"
              >
                <span>
                  {isApkVersion
                    ? 'Android APK Phone Spotify & Internal Vinyl Player'
                    : '3D Vinyl Turntable & Spotify Web Bridge'}
                </span>
              </h2>
              <p className="text-[11px] text-stone-400">
                {isApkVersion
                  ? 'Launch your phone’s native Spotify app or play the built-in offline vinyl music synth.'
                  : 'Connected via Spotify Web for Live Web and PWA builds.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-lg bg-[#291c14] hover:bg-[#38261b] text-xs font-semibold text-stone-200 cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>

        {/* Built-In Internal Vinyl Turntable Player Controls (Always Available Offline & Online) */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#241811] border border-amber-500/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-lg border border-white/20 flex items-center justify-center shrink-0"
              style={{ backgroundColor: spotifyState.currentTrack.sleeveColor }}
            >
              <Music className="w-4 h-4 text-amber-200" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase text-amber-400 flex items-center gap-1.5">
                <Radio className="w-3 h-3" />
                <span>INTERNAL PLAYER · {spotifyState.rpm} RPM</span>
              </div>
              <div className="text-xs font-bold text-amber-100 truncate">
                {spotifyState.currentTrack.title}
              </div>
              <div className="text-[10px] text-stone-400 truncate">
                {spotifyState.currentTrack.artist}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => spotifyManager.togglePlayPause()}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer flex items-center gap-1"
            >
              {spotifyState.isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Lift Needle</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Drop Needle</span>
                </>
              )}
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
              className="px-2.5 py-1.5 rounded-lg bg-[#2d1e15] border border-stone-700 text-xs font-semibold text-stone-200 cursor-pointer flex items-center gap-1"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Next LP</span>
            </button>
          </div>
        </div>

        {/* VERSION-SPECIFIC SPOTIFY INTEGRATION */}
        {isApkVersion ? (
          /* ANDROID APK VERSION: Redirects to User's Phone Spotify App + Internal Vinyl Music Player */
          <div className="space-y-3" data-testid="apk-spotify-player-section">
            <div className="p-3 rounded-xl bg-emerald-950/55 border border-emerald-500/45 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Android APK Native Phone Spotify Bridge</span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-snug">
                    Open the actual Spotify app installed on your phone, pick any song or playlist,
                    and return to Klasik 3D. Our built-in vinyl player spins in sync with your
                    music—or generates cozy offline vinyl audio when playing offline!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={phoneLinks.spotifyDeepLink}
                  data-testid="btn-open-phone-spotify"
                  onClick={handleOpenPhoneSpotify}
                  className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Spotify App on Phone</span>
                </a>

                <button
                  type="button"
                  onClick={() =>
                    spotifyManager.setInternalSynthEnabled(!spotifyState.internalSynthEnabled)
                  }
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    spotifyState.internalSynthEnabled
                      ? 'bg-[#291c14] border-amber-500/45 text-amber-200'
                      : 'bg-stone-900 border-stone-700 text-stone-300'
                  }`}
                >
                  {spotifyState.internalSynthEnabled ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Internal Vinyl Synth: ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                      <span>Muted (Using Phone Spotify)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Select Vinyl LP Preset for Internal Music Player & Phone Spotify Deep Link */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-amber-200">
                Select Vinyl Record Preset (Syncs Internal Synth &amp; Phone Spotify Link)
              </div>
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
                      <div className="text-xs font-bold text-amber-100 truncate">
                        {preset.title}
                      </div>
                      <div className="text-[10px] font-mono text-amber-400 mt-1">
                        {preset.rpm} RPM
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleApplyUri} className="flex gap-2">
              <input
                id="spotify-uri-input"
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter song title or Spotify URI to sync on 3D Vinyl..."
                className="flex-1 rounded-lg bg-[#120c09] border border-stone-700 px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                Sync Vinyl
              </button>
            </form>
          </div>
        ) : (
          /* LIVE WEB & PWA VERSIONS: Connect via Spotify Web (Embed Bridge + OAuth 2.0 PKCE Web SDK) */
          <div className="space-y-3" data-testid="web-spotify-player-section">
            <div className="flex items-center gap-1 p-1 bg-[#120c09] rounded-xl border border-stone-800">
              <button
                type="button"
                onClick={() => spotifyManager.setMode('bridge')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  spotifyState.mode === 'bridge'
                    ? 'bg-emerald-500 text-stone-950 font-bold'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Spotify Web Bridge</span>
              </button>
              <button
                type="button"
                onClick={() => spotifyManager.setMode('pkce')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  spotifyState.mode === 'pkce'
                    ? 'bg-emerald-500 text-stone-950 font-bold'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <Disc3 className="w-3.5 h-3.5" />
                <span>Spotify Web OAuth PKCE</span>
              </button>
            </div>

            {spotifyState.mode === 'bridge' ? (
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-[200px]">
                    <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5" />
                      <span>Spotify Web Full-Length Track Streaming</span>
                    </div>
                    <p className="text-[10px] text-stone-300 leading-snug">
                      Live Web and PWA versions connect via{' '}
                      <span className="font-mono text-emerald-200">open.spotify.com</span>. Sign in
                      to Spotify Web in your browser or connect OAuth PKCE for full tracks!
                    </p>
                  </div>
                  <a
                    href="https://accounts.spotify.com/en/login?continue=https%3A%2F%2Fopen.spotify.com%2F"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-[11px] whitespace-nowrap shadow flex items-center gap-1"
                  >
                    <span>Connect Spotify Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

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
                        <div className="text-xs font-bold text-amber-100 truncate">
                          {preset.title}
                        </div>
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
                    placeholder="Paste Spotify Web Playlist/Track URL or URI..."
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
                        Persistent Background Spotify Web Deck
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
                  <div className="h-[84px] rounded-xl border border-stone-800/80 bg-black/40 flex items-center justify-center text-[11px] text-stone-400">
                    Spotify Web Vinyl Deck Active below — Press Play on the deck, then Close to keep BGM spinning!
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3 rounded-xl bg-[#211610] border border-stone-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-300">
                    Spotify Web Playback SDK (Full-Length Premium Streaming)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                    {spotifyState.sdkDeviceReady
                      ? 'SDK Ready · Full Tracks Active'
                      : spotifyState.accessToken
                      ? 'Token Linked · Connecting SDK...'
                      : 'OAuth 2.0 PKCE'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 leading-snug">
                  Connect your Spotify Developer Client ID via OAuth 2.0 PKCE to register{' '}
                  <span className="font-mono text-amber-200">Klasik 3D Vinyl Turntable</span> via{' '}
                  <span className="font-mono text-emerald-300">sdk.scdn.co/spotify-player.js</span>{' '}
                  for 100% full-length track streaming on Web and PWA.
                </p>
                <input
                  id="spotify-client-id"
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="Enter Spotify Developer Client ID"
                  className="w-full rounded-lg bg-[#120c09] border border-stone-700 px-3 py-1.5 text-xs text-stone-100 font-mono"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConnectPkce}
                    className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs cursor-pointer"
                  >
                    {spotifyState.accessToken
                      ? 'Re-Authorize Spotify Web PKCE'
                      : 'Authorize with Spotify Web PKCE'}
                  </button>
                  {spotifyState.accessToken && (
                    <button
                      type="button"
                      onClick={() => {
                        spotifyManager.disconnectPkce();
                        setStatusMsg('Disconnected Spotify OAuth session.');
                      }}
                      className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs cursor-pointer"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            )}
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
