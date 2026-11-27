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
      className="absolute inset-0 hud-safe-frame z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotify-modal-title"
    >
      <div className="w-full max-w-lg glass-modal rounded-2xl p-4 sm:p-5 space-y-3.5 max-h-full overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between border-b border-white/12 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
              <Disc3
                className={`w-4 h-4 ${spotifyState.isPlaying ? 'animate-spin' : ''}`}
                strokeWidth={2.2}
              />
            </div>
            <div>
              <h2
                id="spotify-modal-title"
                className="text-sm sm:text-base font-bold font-display text-white glass-text-crisp flex items-center gap-2"
              >
                <span>
                  {isApkVersion
                    ? 'Android APK Phone Spotify & Internal Vinyl Player'
                    : '3D Vinyl Turntable & Spotify Web Bridge'}
                </span>
              </h2>
              <p className="text-[11px] text-[#A1A1AA]">
                {isApkVersion
                  ? 'Launch your phone’s native Spotify app or play the built-in offline vinyl music synth.'
                  : 'Connected via Spotify Web for Live Web and PWA builds.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-lg glass-btn-inner text-xs font-semibold text-white cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span>Close</span>
          </button>
        </div>

        {/* Built-In Internal Vinyl Turntable Player Controls (Always Available Offline & Online) */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#18181B]/85 border border-white/12">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-lg border border-white/25 flex items-center justify-center shrink-0"
              style={{ backgroundColor: spotifyState.currentTrack.sleeveColor }}
            >
              <Music className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase text-[#D4D4D8] flex items-center gap-1.5">
                <Radio className="w-3 h-3" strokeWidth={2.2} />
                <span>INTERNAL PLAYER · {spotifyState.rpm} RPM</span>
              </div>
              <div className="text-xs font-bold text-white glass-text-crisp truncate">
                {spotifyState.currentTrack.title}
              </div>
              <div className="text-[10px] text-[#A1A1AA] truncate">
                {spotifyState.currentTrack.artist}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => spotifyManager.togglePlayPause()}
              className="px-2.5 py-1.5 rounded-lg hud-platinum-pill font-bold text-xs cursor-pointer flex items-center gap-1"
            >
              {spotifyState.isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" strokeWidth={2.2} />
                  <span>Lift Needle</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" strokeWidth={2.2} />
                  <span>Drop Needle</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => spotifyManager.toggleRpm()}
              className="px-2.5 py-1.5 rounded-lg glass-btn-inner text-xs font-mono text-[#E4E4E7] cursor-pointer"
            >
              {spotifyState.rpm} RPM
            </button>
            <button
              type="button"
              onClick={() => spotifyManager.nextTrack()}
              className="px-2.5 py-1.5 rounded-lg glass-btn-inner text-xs font-semibold text-white cursor-pointer flex items-center gap-1"
            >
              <SkipForward className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>Next LP</span>
            </button>
          </div>
        </div>

        {/* VERSION-SPECIFIC SPOTIFY INTEGRATION */}
        {isApkVersion ? (
          /* ANDROID APK VERSION: Redirects to User's Phone Spotify App + Internal Vinyl Music Player */
          <div className="space-y-3" data-testid="apk-spotify-player-section">
            <div className="p-3 rounded-xl bg-[#18181B]/85 border border-emerald-400/35 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" strokeWidth={2.2} />
                    <span>Android APK Native Phone Spotify Bridge</span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] leading-snug">
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
                  className="py-2 px-3 rounded-xl hud-platinum-pill font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.2} />
                  <span>Open Spotify App on Phone</span>
                </a>

                <button
                  type="button"
                  onClick={() =>
                    spotifyManager.setInternalSynthEnabled(!spotifyState.internalSynthEnabled)
                  }
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    spotifyState.internalSynthEnabled
                      ? 'bg-white/[0.1] border border-white/35 text-white'
                      : 'glass-btn-inner text-[#A1A1AA]'
                  }`}
                >
                  {spotifyState.internalSynthEnabled ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-[#E4E4E7]" strokeWidth={2.2} />
                      <span>Internal Vinyl Synth: ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-[#71717A]" strokeWidth={2.2} />
                      <span>Muted (Using Phone Spotify)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Select Vinyl LP Preset for Internal Music Player & Phone Spotify Deep Link */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#E4E4E7]">
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
                      className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-white/[0.12] border border-white/50'
                          : 'glass-btn-inner'
                      }`}
                    >
                      <div className="text-xs font-bold text-white glass-text-crisp truncate">
                        {preset.title}
                      </div>
                      <div className="text-[10px] font-mono text-[#A1A1AA] mt-1">
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
                className="flex-1 rounded-lg bg-[#09090B]/80 border border-white/15 px-3 py-1.5 text-xs text-white placeholder:text-[#71717A] focus:outline-none focus:border-white/45"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg hud-platinum-pill font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                Sync Vinyl
              </button>
            </form>
          </div>
        ) : (
          /* LIVE WEB & PWA VERSIONS: Connect via Spotify Web (Embed Bridge + OAuth 2.0 PKCE Web SDK) */
          <div className="space-y-3" data-testid="web-spotify-player-section">
            <div className="flex items-center gap-1 p-1 bg-[#18181B]/90 rounded-xl border border-white/12">
              <button
                type="button"
                onClick={() => spotifyManager.setMode('bridge')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  spotifyState.mode === 'bridge'
                    ? 'hud-platinum-pill font-bold'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span>Spotify Web Bridge</span>
              </button>
              <button
                type="button"
                onClick={() => spotifyManager.setMode('pkce')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  spotifyState.mode === 'pkce'
                    ? 'hud-platinum-pill font-bold'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <Disc3 className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span>Spotify Web OAuth PKCE</span>
              </button>
            </div>

            {spotifyState.mode === 'bridge' ? (
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-[#18181B]/85 border border-emerald-400/35 flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-[200px]">
                    <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5" strokeWidth={2.2} />
                      <span>Spotify Web Full-Length Track Streaming</span>
                    </div>
                    <p className="text-[10px] text-[#A1A1AA] leading-snug">
                      Live Web and PWA versions connect via{' '}
                      <span className="font-mono text-emerald-300">open.spotify.com</span>. Sign in
                      to Spotify Web in your browser or connect OAuth PKCE for full tracks!
                    </p>
                  </div>
                  <a
                    href="https://accounts.spotify.com/en/login?continue=https%3A%2F%2Fopen.spotify.com%2F"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg hud-platinum-pill font-bold text-[11px] whitespace-nowrap flex items-center gap-1"
                  >
                    <span>Connect Spotify Web</span>
                    <ExternalLink className="w-3 h-3" strokeWidth={2.2} />
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
                        className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-white/[0.12] border border-white/50'
                            : 'glass-btn-inner'
                        }`}
                      >
                        <div className="text-xs font-bold text-white glass-text-crisp truncate">
                          {preset.title}
                        </div>
                        <div className="text-[10px] font-mono text-[#A1A1AA] mt-1">
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
                    className="flex-1 rounded-lg bg-[#09090B]/80 border border-white/15 px-3 py-1.5 text-xs text-white placeholder:text-[#71717A] focus:outline-none focus:border-white/45"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg hud-platinum-pill font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    Load LP
                  </button>
                </form>

                <div className="space-y-2 pt-1 border-t border-white/12">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-300 block">
                        Persistent Background Spotify Web Deck
                      </span>
                      <span className="text-[10px] text-[#A1A1AA] block">
                        Stays playing continuously in the background even after you close this modal!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => spotifyManager.setShowMiniEmbed(!spotifyState.showMiniEmbed)}
                      className="px-2.5 py-1 rounded-lg glass-btn-inner border-emerald-400/40 text-xs font-semibold text-emerald-300 cursor-pointer shrink-0"
                    >
                      {spotifyState.showMiniEmbed ? 'Minimize Floating Player' : 'Show Floating Player'}
                    </button>
                  </div>
                  <div className="h-[84px] rounded-xl border border-white/12 bg-[#09090B]/70 flex items-center justify-center text-[11px] text-[#A1A1AA] px-3 text-center">
                    Spotify Web Vinyl Deck Active below — Press Play on the deck, then Close to keep BGM spinning!
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3 rounded-xl bg-[#18181B]/80 border border-white/12">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-300">
                    Spotify Web Playback SDK (Full-Length Premium Streaming)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-400/40 text-emerald-300">
                    {spotifyState.sdkDeviceReady
                      ? 'SDK Ready · Full Tracks Active'
                      : spotifyState.accessToken
                      ? 'Token Linked · Connecting SDK...'
                      : 'OAuth 2.0 PKCE'}
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1AA] leading-snug">
                  Connect your Spotify Developer Client ID via OAuth 2.0 PKCE to register{' '}
                  <span className="font-mono text-white">Klasik 3D Vinyl Turntable</span> via{' '}
                  <span className="font-mono text-emerald-300">sdk.scdn.co/spotify-player.js</span>{' '}
                  for 100% full-length track streaming on Web and PWA.
                </p>
                <input
                  id="spotify-client-id"
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="Enter Spotify Developer Client ID"
                  className="w-full rounded-lg bg-[#09090B]/80 border border-white/15 px-3 py-1.5 text-xs text-white placeholder:text-[#71717A] font-mono"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConnectPkce}
                    className="flex-1 py-2 rounded-lg hud-platinum-pill font-bold text-xs cursor-pointer"
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
                      className="px-3 py-2 rounded-lg glass-btn-inner text-white font-semibold text-xs cursor-pointer"
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
          <div className="p-2.5 rounded-xl bg-white/[0.08] border border-white/22 text-xs text-[#E4E4E7]">
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
};
