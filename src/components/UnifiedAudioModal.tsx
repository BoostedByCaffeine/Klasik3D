import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Disc3,
  ExternalLink,
  Music,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Repeat,
  Search,
  SkipBack,
  SkipForward,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  Waves,
  X,
} from 'lucide-react';
import {
  AudioModeId,
  MusicPlayerSnapshot,
  musicPlayerController,
} from '../game/audio/MusicPlayerController';

interface UnifiedAudioModalProps {
  snapshot: MusicPlayerSnapshot;
  isApkVersion: boolean;
  onClose: () => void;
}

export const UnifiedAudioModal: React.FC<UnifiedAudioModalProps> = ({
  snapshot,
  isApkVersion,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [radioQuery, setRadioQuery] = useState('');
  const [isSearchingRadio, setIsSearchingRadio] = useState(false);

  const handleModeSwitch = (mode: AudioModeId) => {
    musicPlayerController.setMode(mode);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      musicPlayerController.addCustomVinylFiles(files);
    }
    e.target.value = '';
  };

  const handleRadioSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchingRadio(true);
    try {
      await musicPlayerController.refreshRadioBrowserStations(radioQuery);
    } finally {
      setIsSearchingRadio(false);
    }
  };

  const activeTrack = snapshot.vinylTracks[snapshot.activeVinylIndex] || snapshot.vinylTracks[0];
  const activeStation =
    snapshot.radioStations.find((s) => s.id === snapshot.activeStationId) ||
    snapshot.radioStations[0];

  const nowPlayingTitle =
    snapshot.mode === 'vinyl'
      ? activeTrack?.title || 'Cafe Vinyl'
      : snapshot.mode === 'radio'
      ? activeStation?.name || 'Live Cafe Radio'
      : snapshot.externalMedia.title || 'External Audio Hologram';

  const nowPlayingSubtitle =
    snapshot.mode === 'vinyl'
      ? activeTrack?.isCustom
        ? 'Your Vinyl (Local Audio)'
        : `${activeTrack?.artist || 'Klasik Wax'} · ${activeTrack?.bpm || 78} BPM`
      : snapshot.mode === 'radio'
      ? `${activeStation?.region || 'Live'} · ${activeStation?.genre || 'Stream'}`
      : `${snapshot.externalMedia.artist} · ${snapshot.externalMedia.sourceApp}`;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-sm p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unified-audio-title"
      data-testid="unified-audio-modal"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#09090B]/94 border border-white/15 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl p-3 sm:p-4 flex flex-col gap-2.5 max-h-[88vh] text-white">
        {/* Header + Mode Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#18181B] border border-white/15 flex items-center justify-center shrink-0">
              {snapshot.mode === 'vinyl' ? (
                <Disc3
                  className={`w-4 h-4 text-[#E4E4E7] ${snapshot.isPlaying ? 'animate-spin' : ''}`}
                  strokeWidth={2.2}
                />
              ) : snapshot.mode === 'radio' ? (
                <Radio className="w-4 h-4 text-[#E4E4E7]" strokeWidth={2.2} />
              ) : (
                <Waves className="w-4 h-4 text-[#E4E4E7]" strokeWidth={2.2} />
              )}
            </div>
            <div className="min-w-0">
              <h2
                id="unified-audio-title"
                className="text-xs sm:text-sm font-bold tracking-wide text-white truncate"
              >
                Counter Audio Deck
              </h2>
              <p className="text-[10px] text-[#A1A1AA] truncate">
                Changes the 3D Counter Prop live: Turntable · Vintage Radio · Hologram
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 3-Way Segmented Mode Selector */}
            <div
              className="flex items-center p-0.5 rounded-lg bg-[#18181B] border border-white/12"
              role="tablist"
              aria-label="Audio Mode"
            >
              {(
                [
                  { id: 'vinyl', label: 'Vinyl', Icon: Disc3 },
                  { id: 'radio', label: 'Radio', Icon: Radio },
                  { id: 'external', label: 'External', Icon: Waves },
                ] as const
              ).map((tab) => {
                const Icon = tab.Icon;
                const active = snapshot.mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-testid={`audio-mode-${tab.id}`}
                    onClick={() => handleModeSwitch(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors duration-75 ${
                      active
                        ? 'hud-platinum-pill'
                        : 'bg-transparent text-[#A1A1AA] hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="btn-close-audio-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-[#E4E4E7] hover:text-white cursor-pointer transition-colors"
              aria-label="Close Audio Deck"
            >
              <X className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Status Banner (Radio Fallback / Tuning / Connection Info) */}
        {snapshot.statusMessage && (
          <div
            data-testid="audio-status-banner"
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex flex-wrap items-center justify-between gap-2 shrink-0 ${
              snapshot.radioStatus === 'fallback' || snapshot.radioStatus === 'error'
                ? 'bg-[#18181B] border-[#F87171]/45 text-[#E4E4E7]'
                : 'bg-[#18181B]/80 border-white/12 text-[#A1A1AA]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <AlertCircle
                className={`w-3.5 h-3.5 shrink-0 ${
                  snapshot.radioStatus === 'fallback' || snapshot.radioStatus === 'error'
                    ? 'text-[#F87171]'
                    : 'text-[#E4E4E7]'
                }`}
                strokeWidth={2.2}
              />
              <span className="truncate">{snapshot.statusMessage}</span>
            </div>
            {snapshot.mode === 'radio' &&
              (snapshot.radioStatus === 'fallback' || snapshot.radioStatus === 'error') && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    data-testid="btn-retry-radio"
                    onClick={() => musicPlayerController.retryCurrentRadioStation()}
                    className="px-2 py-0.5 rounded-md bg-white/[0.08] hover:bg-white/[0.16] border border-white/20 text-white font-bold text-[10px] cursor-pointer"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    data-testid="btn-fallback-cafe-chill"
                    onClick={() => musicPlayerController.fallbackToCafeChillRadio()}
                    className="px-2 py-0.5 rounded-md hud-platinum-pill font-bold text-[10px] cursor-pointer"
                  >
                    Cafe Chill Backup
                  </button>
                </div>
              )}
          </div>
        )}

        {/* MAIN CONTENT AREA (Scrollable, Landscape-Compact) */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
          {/* MODE 1: VINYL CRATE & BRING YOUR OWN VINYL */}
          {snapshot.mode === 'vinyl' && (
            <div className="space-y-2.5" data-testid="audio-panel-vinyl">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-[#18181B]/75 border border-white/10">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
                    multiple
                    className="hidden"
                    onChange={handleFileImport}
                  />
                  <button
                    type="button"
                    data-testid="btn-add-byo-vinyl"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg hud-platinum-pill font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
                    <span>Add Local Vinyl (.mp3 / .wav)</span>
                  </button>
                  <button
                    type="button"
                    data-testid="btn-toggle-crackle"
                    onClick={() =>
                      musicPlayerController.setCrackleEnabled(!snapshot.crackleEnabled)
                    }
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      snapshot.crackleEnabled
                        ? 'bg-white/[0.12] border-white/35 text-white'
                        : 'bg-white/[0.04] border-white/12 text-[#A1A1AA]'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                    <span>Vinyl Crackle: {snapshot.crackleEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="btn-toggle-repeat"
                  onClick={() => musicPlayerController.setRepeatOne(!snapshot.repeatOne)}
                  className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    snapshot.repeatOne
                      ? 'bg-[#34D399]/16 border-[#34D399]/45 text-[#34D399]'
                      : 'bg-white/[0.04] border-white/12 text-[#A1A1AA]'
                  }`}
                >
                  <Repeat className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                  <span>{snapshot.repeatOne ? 'Loop Track' : 'Loop Crate'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {snapshot.vinylTracks.map((track, idx) => {
                  const isCurrent = idx === snapshot.activeVinylIndex;
                  return (
                    <div
                      key={track.id}
                      data-testid={`vinyl-track-${track.id}`}
                      className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-[#27272A]/85 border-white/40'
                          : 'bg-[#18181B]/75 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => musicPlayerController.playVinylTrack(idx)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-white/25"
                          style={{ backgroundColor: track.labelColor || '#CBD5E1' }}
                        >
                          <Disc3
                            className={`w-3.5 h-3.5 text-[#09090B] ${
                              isCurrent && snapshot.isPlaying ? 'animate-spin' : ''
                            }`}
                            strokeWidth={2.4}
                          />
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {track.title}
                          </div>
                          <div className="text-[10px] text-[#A1A1AA] truncate">
                            {track.isCustom ? 'Custom Vinyl' : `${track.artist} · ${track.bpm} BPM`}
                          </div>
                        </div>
                      </button>

                      {track.isCustom && (
                        <button
                          type="button"
                          onClick={() => musicPlayerController.removeCustomVinylTrack(track.id)}
                          className="p-1.5 rounded-lg bg-[#F87171]/15 hover:bg-[#F87171]/25 border border-[#F87171]/35 text-[#F87171] cursor-pointer shrink-0"
                          title="Remove Custom Track"
                          aria-label={`Remove ${track.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE 2: LIVE AUDIO RADIO (PH FM + SOMAFM + RADIO BROWSER API) */}
          {snapshot.mode === 'radio' && (
            <div className="space-y-2.5" data-testid="audio-panel-radio">
              <form onSubmit={handleRadioSearch} className="flex items-center gap-1.5">
                <div className="relative flex-1 min-w-0">
                  <Search
                    className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={2.2}
                  />
                  <input
                    type="text"
                    value={radioQuery}
                    onChange={(e) => setRadioQuery(e.target.value)}
                    placeholder="Search live stations (e.g. Manila, jazz, lo-fi, acoustic)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#18181B] border border-white/15 text-xs text-white placeholder:text-[#71717A] focus:outline-none focus:border-white/45"
                  />
                </div>
                <button
                  type="submit"
                  data-testid="btn-refresh-radio-directory"
                  disabled={isSearchingRadio}
                  className="px-2.5 py-1.5 rounded-lg hud-platinum-pill font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isSearchingRadio ? 'animate-spin' : ''}`}
                    strokeWidth={2.4}
                  />
                  <span>{isSearchingRadio ? 'Scanning...' : 'Live Scan'}</span>
                </button>
              </form>

              <p className="text-[10px] text-[#A1A1AA] px-0.5">
                Streams over Wi-Fi / Mobile Data (no earphones required) · Automatic HTTPS backup failover
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {snapshot.radioStations.map((station) => {
                  const isCurrent = station.id === snapshot.activeStationId;
                  return (
                    <button
                      key={station.id}
                      type="button"
                      data-testid={`radio-station-${station.id}`}
                      onClick={() => musicPlayerController.tuneRadioStation(station.id)}
                      className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-[#27272A]/85 border-white/40'
                          : 'bg-[#18181B]/75 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                            station.layer === 'curated'
                              ? 'bg-white/[0.10] text-white border border-white/25'
                              : 'bg-[#BAE6FD]/15 text-[#BAE6FD] border border-[#BAE6FD]/35'
                          }`}
                        >
                          {station.freqLabel || 'WEB'}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {station.name}
                          </div>
                          <div className="text-[10px] text-[#A1A1AA] truncate">
                            {station.region} · {station.genre}
                          </div>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#34D399]/18 text-[#34D399] border border-[#34D399]/40 shrink-0">
                          {snapshot.radioStatus === 'connecting'
                            ? 'TUNING'
                            : snapshot.isPlaying
                            ? 'LIVE'
                            : 'READY'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE 3: EXTERNAL HOLOGRAM MODE */}
          {snapshot.mode === 'external' && (
            <div className="space-y-2.5" data-testid="audio-panel-external">
              <div className="p-3 rounded-xl bg-gradient-to-br from-[#27272A]/70 via-[#18181B] to-[#09090B] border border-white/18 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/20 flex items-center justify-center shrink-0">
                    <Music className="w-5 h-5 text-[#E4E4E7]" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#A1A1AA]">
                      3D Counter Hologram Active
                    </div>
                    <div className="text-sm font-bold text-white truncate">
                      {snapshot.externalMedia.title}
                    </div>
                    <div className="text-[11px] text-[#A1A1AA] truncate">
                      {snapshot.externalMedia.artist} · {snapshot.externalMedia.sourceApp}
                    </div>
                  </div>
                </div>

                {snapshot.isNativeAndroid ? (
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {snapshot.externalMedia.isActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#34D399]/16 border border-[#34D399]/45 text-[#34D399] text-[10px] font-bold">
                        <Check className="w-3 h-3 shrink-0" strokeWidth={2.4} />
                        <span>External Audio Detected (Active)</span>
                      </span>
                    )}
                    {snapshot.hasNotificationAccess ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#34D399]/16 border border-[#34D399]/45 text-[#34D399] text-[11px] font-bold">
                        <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
                        <span>Now-Playing Linked</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        data-testid="btn-enable-song-display"
                        onClick={() => musicPlayerController.openNotificationAccessSettings()}
                        className="px-3 py-1.5 rounded-lg hud-platinum-pill font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
                        <span>Enable Now-Playing Detection</span>
                      </button>
                    )}
                    <button
                      type="button"
                      data-testid="btn-refresh-external-audio"
                      onClick={() => musicPlayerController.refreshExternalAudioStatus(true)}
                      className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-[#E4E4E7] cursor-pointer"
                      title="Refresh External Audio Status"
                      aria-label="Refresh External Audio Status"
                    >
                      <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.2} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#34D399]/16 border border-[#34D399]/45 text-[#34D399] text-[10px] font-bold">
                      <Check className="w-3 h-3 shrink-0" strokeWidth={2.4} />
                      <span>
                        {isApkVersion
                          ? 'External Background Mode Ready'
                          : 'External Background Mode Active'}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Cafe Ambience SFX Balance Slider */}
              <div className="p-2.5 rounded-xl bg-[#18181B]/75 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#E4E4E7]" strokeWidth={2.2} />
                    <span>Cafe Ambience &amp; Barista SFX Balance</span>
                  </span>
                  <span className="font-mono text-white font-bold tabular-nums">
                    {Math.round(snapshot.ambienceVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(snapshot.ambienceVolume * 100)}
                  onChange={(e) =>
                    musicPlayerController.setAmbienceVolume(Number(e.target.value) / 100)
                  }
                  aria-label="Cafe Ambience SFX Volume"
                  className="w-full hud-platinum-slider cursor-pointer"
                />
                <p className="text-[10px] text-[#A1A1AA]">
                  Internal music stays silent in External Mode so your Spotify, YouTube Music, or
                  Apple Music plays uninterrupted alongside warm espresso steam, rain &amp; cafe cats.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* PERSISTENT BOTTOM TRANSPORT & VOLUME BAR */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">{nowPlayingTitle}</div>
            <div className="text-[10px] text-[#A1A1AA] truncate">{nowPlayingSubtitle}</div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="btn-audio-prev"
              onClick={() => musicPlayerController.prev()}
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-[#E4E4E7] hover:text-white cursor-pointer"
              aria-label="Previous"
            >
              <SkipBack className="w-3.5 h-3.5" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              data-testid="btn-audio-play-pause"
              onClick={() => musicPlayerController.togglePlayPause()}
              className="px-3 py-1.5 rounded-lg hud-platinum-pill font-bold text-xs flex items-center gap-1 cursor-pointer"
              aria-label={snapshot.isPlaying ? 'Pause' : 'Play'}
            >
              {snapshot.isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" strokeWidth={2.2} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" strokeWidth={2.2} />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="btn-audio-next"
              onClick={() => musicPlayerController.next()}
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-[#E4E4E7] hover:text-white cursor-pointer"
              aria-label="Next"
            >
              <SkipForward className="w-3.5 h-3.5" strokeWidth={2.2} />
            </button>
          </div>

          {snapshot.mode !== 'external' && (
            <div className="flex items-center gap-1.5 shrink-0 w-28 sm:w-32">
              <Volume2 className="w-3.5 h-3.5 text-[#E4E4E7] shrink-0" strokeWidth={2.2} />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(snapshot.volume * 100)}
                onChange={(e) => musicPlayerController.setVolume(Number(e.target.value) / 100)}
                aria-label="Music Volume"
                className="w-full hud-platinum-slider cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
