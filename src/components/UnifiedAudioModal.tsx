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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unified-audio-title"
      data-testid="unified-audio-modal"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#090705]/92 border border-[#f5a623]/35 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] backdrop-blur-xl p-3 sm:p-4 flex flex-col gap-2.5 max-h-[88vh] text-[#FAF5EE]">
        {/* Header + Mode Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f5a623]/20 pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#f5a623]/20 border border-[#f5a623]/50 flex items-center justify-center shrink-0">
              {snapshot.mode === 'vinyl' ? (
                <Disc3
                  className={`w-4 h-4 text-[#f5a623] ${snapshot.isPlaying ? 'animate-spin' : ''}`}
                  strokeWidth={2.2}
                />
              ) : snapshot.mode === 'radio' ? (
                <Radio className="w-4 h-4 text-[#f5a623]" strokeWidth={2.2} />
              ) : (
                <Waves className="w-4 h-4 text-[#f5a623]" strokeWidth={2.2} />
              )}
            </div>
            <div className="min-w-0">
              <h2
                id="unified-audio-title"
                className="text-xs sm:text-sm font-bold tracking-wide text-[#FAF5EE] truncate"
              >
                Counter Audio Deck
              </h2>
              <p className="text-[10px] text-[#E7D7C1]/80 truncate">
                Changes the 3D Counter Prop live: Turntable · Vintage Radio · Hologram
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 3-Way Segmented Mode Selector */}
            <div
              className="flex items-center p-0.5 rounded-lg bg-white/[0.06] border border-[#f5a623]/25"
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
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                      active
                        ? 'bg-[#f5a623] text-[#090705] shadow-[0_4px_12px_-3px_rgba(245,166,35,0.6)]'
                        : 'text-[#E7D7C1] hover:text-[#FAF5EE]'
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
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-[#f5a623]/25 text-[#E7D7C1] cursor-pointer"
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
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-2 shrink-0 ${
              snapshot.radioStatus === 'fallback' || snapshot.radioStatus === 'error'
                ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                : 'bg-white/[0.05] border-[#f5a623]/25 text-[#E7D7C1]'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-[#f5a623] shrink-0" strokeWidth={2.2} />
            <span className="truncate">{snapshot.statusMessage}</span>
          </div>
        )}

        {/* MAIN CONTENT AREA (Scrollable, Landscape-Compact) */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
          {/* MODE 1: VINYL CRATE & BRING YOUR OWN VINYL */}
          {snapshot.mode === 'vinyl' && (
            <div className="space-y-2.5" data-testid="audio-panel-vinyl">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.04] border border-[#f5a623]/20">
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
                    className="px-2.5 py-1.5 rounded-lg bg-[#f5a623] hover:brightness-105 text-[#090705] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow"
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
                        ? 'bg-[#f5a623]/20 border-[#f5a623]/70 text-[#f5a623]'
                        : 'bg-white/[0.04] border-white/15 text-[#E7D7C1]/80'
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
                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                      : 'bg-white/[0.04] border-white/15 text-[#E7D7C1]/80'
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
                          ? 'bg-[#f5a623]/18 border-[#f5a623]/75'
                          : 'bg-white/[0.04] border-white/10 hover:border-[#f5a623]/35'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => musicPlayerController.playVinylTrack(idx)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-white/25"
                          style={{ backgroundColor: track.labelColor || '#f5a623' }}
                        >
                          <Disc3
                            className={`w-3.5 h-3.5 text-[#090705] ${
                              isCurrent && snapshot.isPlaying ? 'animate-spin' : ''
                            }`}
                            strokeWidth={2.4}
                          />
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#FAF5EE] truncate">
                            {track.title}
                          </div>
                          <div className="text-[10px] text-[#E7D7C1]/75 truncate">
                            {track.isCustom ? 'Custom Vinyl' : `${track.artist} · ${track.bpm} BPM`}
                          </div>
                        </div>
                      </button>

                      {track.isCustom && (
                        <button
                          type="button"
                          onClick={() => musicPlayerController.removeCustomVinylTrack(track.id)}
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-400/35 text-rose-300 cursor-pointer shrink-0"
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
                    className="w-3.5 h-3.5 text-[#E7D7C1]/60 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={2.2}
                  />
                  <input
                    type="text"
                    value={radioQuery}
                    onChange={(e) => setRadioQuery(e.target.value)}
                    placeholder="Search live stations (e.g. Manila, jazz, lo-fi, acoustic)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.06] border border-[#f5a623]/25 text-xs text-[#FAF5EE] placeholder:text-[#E7D7C1]/45 focus:outline-none focus:border-[#f5a623]"
                  />
                </div>
                <button
                  type="submit"
                  data-testid="btn-refresh-radio-directory"
                  disabled={isSearchingRadio}
                  className="px-2.5 py-1.5 rounded-lg bg-[#f5a623] hover:brightness-105 text-[#090705] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isSearchingRadio ? 'animate-spin' : ''}`}
                    strokeWidth={2.4}
                  />
                  <span>{isSearchingRadio ? 'Scanning...' : 'Live Scan'}</span>
                </button>
              </form>

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
                          ? 'bg-[#f5a623]/18 border-[#f5a623]/75'
                          : 'bg-white/[0.04] border-white/10 hover:border-[#f5a623]/35'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                            station.layer === 'curated'
                              ? 'bg-[#f5a623]/20 text-[#f5a623] border border-[#f5a623]/40'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                          }`}
                        >
                          {station.freqLabel || 'WEB'}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#FAF5EE] truncate">
                            {station.name}
                          </div>
                          <div className="text-[10px] text-[#E7D7C1]/75 truncate">
                            {station.region} · {station.genre}
                          </div>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shrink-0">
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

          {/* MODE 3: EXTERNAL HOLOGRAM MODE (SPOTIFY / YOUTUBE MUSIC / APPLE MUSIC + CAFE AMBIENCE) */}
          {snapshot.mode === 'external' && (
            <div className="space-y-2.5" data-testid="audio-panel-external">
              <div className="p-3 rounded-xl bg-gradient-to-br from-[#f5a623]/15 via-[#18110c] to-[#090705] border border-[#f5a623]/45 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#f5a623]/20 border border-[#f5a623]/60 flex items-center justify-center shrink-0">
                    <Music className="w-5 h-5 text-[#f5a623]" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#f5a623]">
                      3D Counter Hologram Active
                    </div>
                    <div className="text-sm font-bold text-[#FAF5EE] truncate">
                      {snapshot.externalMedia.title}
                    </div>
                    <div className="text-[11px] text-[#E7D7C1]/85 truncate">
                      {snapshot.externalMedia.artist} · {snapshot.externalMedia.sourceApp}
                    </div>
                  </div>
                </div>

                {snapshot.isNativeAndroid ? (
                  snapshot.hasNotificationAccess ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-bold shrink-0">
                      <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
                      <span>Song Display Linked</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid="btn-enable-song-display"
                      onClick={() => musicPlayerController.openNotificationAccessSettings()}
                      className="px-3 py-1.5 rounded-lg bg-[#f5a623] hover:brightness-105 text-[#090705] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shrink-0 shadow"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
                      <span>Enable Song Title Display</span>
                    </button>
                  )
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-[#f5a623]/25 text-[10px] text-[#E7D7C1]/90 shrink-0">
                    {isApkVersion
                      ? 'Bridge Standby'
                      : 'Web Mode · Play Spotify/YouTube in another tab'}
                  </span>
                )}
              </div>

              {/* Cafe Ambience SFX Balance Slider (Coexists cleanly with External Music!) */}
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-[#f5a623]/20 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#FAF5EE] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#f5a623]" strokeWidth={2.2} />
                    <span>Cafe Ambience &amp; Barista SFX Balance</span>
                  </span>
                  <span className="font-mono text-[#f5a623] font-bold tabular-nums">
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
                  className="w-full accent-[#f5a623] cursor-pointer"
                />
                <p className="text-[10px] text-[#E7D7C1]/75">
                  Internal music stays silent in External Mode so your Spotify, YouTube Music, or
                  Apple Music plays uninterrupted alongside warm espresso steam, rain &amp; cafe cats.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* PERSISTENT BOTTOM TRANSPORT & VOLUME BAR */}
        <div className="pt-2 border-t border-[#f5a623]/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#FAF5EE] truncate">{nowPlayingTitle}</div>
            <div className="text-[10px] text-[#E7D7C1]/75 truncate">{nowPlayingSubtitle}</div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="btn-audio-prev"
              onClick={() => musicPlayerController.prev()}
              className="p-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] border border-[#f5a623]/25 text-[#FAF5EE] cursor-pointer"
              aria-label="Previous"
            >
              <SkipBack className="w-3.5 h-3.5" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              data-testid="btn-audio-play-pause"
              onClick={() => musicPlayerController.togglePlayPause()}
              className="px-3 py-1.5 rounded-lg bg-[#f5a623] hover:brightness-105 text-[#090705] font-bold text-xs flex items-center gap-1 cursor-pointer shadow"
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
              className="p-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] border border-[#f5a623]/25 text-[#FAF5EE] cursor-pointer"
              aria-label="Next"
            >
              <SkipForward className="w-3.5 h-3.5" strokeWidth={2.2} />
            </button>
          </div>

          {snapshot.mode !== 'external' && (
            <div className="flex items-center gap-1.5 shrink-0 w-28 sm:w-32">
              <Volume2 className="w-3.5 h-3.5 text-[#f5a623] shrink-0" strokeWidth={2.2} />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(snapshot.volume * 100)}
                onChange={(e) => musicPlayerController.setVolume(Number(e.target.value) / 100)}
                aria-label="Music Volume"
                className="w-full accent-[#f5a623] cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
