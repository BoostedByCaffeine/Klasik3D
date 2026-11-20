// Unified Audio Engine for Klasik 3D (Phases 2, 3, and 6)
// Manages 3 seamlessly integrated audio modes:
//   1. 'vinyl'    — Offline Cozy Lo-Fi Crate + Bring Your Own Vinyl (local audio files via Object URLs) + Analog Crackle
//   2. 'radio'    — Two-Layer Live Audio Radio (Curated PH FM & Cafe Lo-Fi/Jazz + Radio Browser API HTTPS/MP3/AAC search)
//   3. 'external' — External Hologram Mode (Android Native Bridge + Web fallback, "External First" detection & resume coexistence)

import { AudioModeId, AudioPreferences, DEFAULT_AUDIO_PREFERENCES } from '../rules';
import { soundEngine } from '../sound';

export type { AudioModeId };

export interface VinylTrackItem {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  bpm: number;
  accentHex: string;
  isCustomByo: boolean;
  objectUrl?: string;
}

export interface RadioStationItem {
  id: string;
  name: string;
  subtitle: string;
  category: 'ph_fm' | 'lofi_jazz' | 'directory';
  streamUrl: string;
  codec: string;
  countryCode: string;
  bitrate?: number;
}

export interface ExternalMediaSnapshot {
  isActive: boolean;
  title: string;
  artist: string;
  sourceApp: string;
  hasPermission: boolean;
  isNativeBridgeAvailable: boolean;
}

export interface UnifiedAudioState {
  mode: AudioModeId;
  isPlaying: boolean;
  isLoadingStream: boolean;
  streamError: string | null;
  musicVolume: number;
  ambienceVolume: number;
  vinylCrackle: boolean;
  repeatTrack: boolean;
  vinylTracks: VinylTrackItem[];
  currentVinylId: string;
  radioStations: RadioStationItem[];
  directoryStations: RadioStationItem[];
  directoryLoading: boolean;
  directoryLoaded: boolean;
  currentRadioId: string;
  externalMedia: ExternalMediaSnapshot;
  lastPlayedNonExternalMode: 'vinyl' | 'radio';
}

export interface SnapshotVinylTrack {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  bpm: number;
  labelColor: string;
  isCustom: boolean;
}

export interface SnapshotRadioStation {
  id: string;
  name: string;
  region: string;
  genre: string;
  streamUrl: string;
  codec: string;
}

export interface MusicPlayerSnapshot {
  mode: AudioModeId;
  isPlaying: boolean;
  volume: number;
  ambienceVolume: number;
  crackleEnabled: boolean;
  repeatOne: boolean;
  vinylTracks: SnapshotVinylTrack[];
  activeVinylIndex: number;
  radioStations: SnapshotRadioStation[];
  activeStationId: string;
  radioStatus: 'idle' | 'connecting' | 'playing' | 'fallback' | 'error';
  statusMessage: string | null;
  isNativeAndroid: boolean;
  hasNotificationAccess: boolean;
  externalMedia: {
    isActive: boolean;
    isPlaying: boolean;
    title: string;
    artist: string;
    sourceApp: string;
  };
}

export interface KlasikNativeAudioBridgeInterface {
  isExternalMusicActive(): boolean;
  getCurrentMediaMetadata(): string; // JSON: { title, artist, sourceApp, isPlaying }
  hasNotificationAccess(): boolean;
  openNotificationAccessSettings(): void;
  sendMediaKey?(action: 'play_pause' | 'next' | 'prev'): void;
}

declare global {
  interface Window {
    KlasikNativeAudio?: KlasikNativeAudioBridgeInterface;
  }
}

export interface RadioBrowserRawStation {
  stationuuid?: string;
  name?: string;
  url_resolved?: string;
  codec?: string;
  countrycode?: string;
  bitrate?: number;
  tags?: string;
}

// Pure testable Radio Browser API station filter (strict HTTPS + MP3/AAC only)
export function filterVerifiedRadioStations(
  rawList: RadioBrowserRawStation[]
): RadioStationItem[] {
  const seenUrls = new Set<string>();
  const verified: RadioStationItem[] = [];
  for (const s of rawList) {
    const url = (s.url_resolved || '').trim();
    const codec = (s.codec || '').trim();
    const name = (s.name || '').trim();
    if (!url || !name) continue;
    if (!url.startsWith('https://')) continue;
    if (!/mp3|aac/i.test(codec)) continue;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    verified.push({
      id: `rb-${s.stationuuid || verified.length}`,
      name: name.slice(0, 42),
      subtitle: `${(s.countrycode || 'PH').toUpperCase()} • ${codec.toUpperCase()}${
        s.bitrate ? ` ${s.bitrate}k` : ''
      }`,
      category: 'directory',
      streamUrl: url,
      codec: codec.toUpperCase(),
      countryCode: (s.countrycode || 'PH').toUpperCase(),
      bitrate: s.bitrate,
    });
  }
  return verified;
}

// Clean human-readable track title from uploaded audio filenames
export function cleanAudioFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  const cleaned = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || 'Custom Vinyl Record';
}

// Layer 1: Built-in Offline Lo-Fi Vinyl Crate (synthesized locally into lossless stereo WAV blobs — zero 404s!)
export const DEFAULT_VINYL_CRATE: VinylTrackItem[] = [
  {
    id: 'lofi-rain-miata',
    title: 'Rain on the Miata',
    artist: 'Klasik Wax Collective',
    durationSec: 16,
    bpm: 75,
    accentHex: '#f5a623',
    isCustomByo: false,
  },
  {
    id: 'lofi-midnight-espresso',
    title: 'Midnight Espresso',
    artist: 'Garage Tape Club',
    durationSec: 16,
    bpm: 78,
    accentHex: '#d97706',
    isCustomByo: false,
  },
  {
    id: 'lofi-garden-morning',
    title: 'Garden Morning',
    artist: 'Warm Crema Trio',
    durationSec: 16,
    bpm: 72,
    accentHex: '#84cc16',
    isCustomByo: false,
  },
  {
    id: 'lofi-velvet-crema',
    title: 'Velvet Crema',
    artist: 'Klasik Wax Collective',
    durationSec: 16,
    bpm: 80,
    accentHex: '#fb923c',
    isCustomByo: false,
  },
];

// Layer 1: Curated PH FM & Cafe Lo-Fi / Jazz Streams (strict HTTPS MP3/AAC streams)
export const CURATED_RADIO_STATIONS: RadioStationItem[] = [
  // Curated Philippine FM Stations
  {
    id: 'ph-easy-rock-963',
    name: '96.3 Easy Rock Manila',
    subtitle: 'PH FM • Lite & Mellow Classics',
    category: 'ph_fm',
    streamUrl: 'https://easyrock.radioca.st/stream',
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 128,
  },
  {
    id: 'ph-wish-1075',
    name: 'Wish 107.5 FM',
    subtitle: 'PH FM • OPM & Easy Listening',
    category: 'ph_fm',
    streamUrl: 'https://stream.zeno.fm/4d299444138uv',
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 128,
  },
  {
    id: 'ph-magic-899',
    name: 'Magic 89.9 Manila',
    subtitle: 'PH FM • Pop & Good Vibes',
    category: 'ph_fm',
    streamUrl: 'https://stream.zeno.fm/8g9q1w3072zuv',
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 128,
  },
  {
    id: 'ph-mellow-947',
    name: 'Mellow 94.7 Manila',
    subtitle: 'PH FM • Sounds Good Acoustic',
    category: 'ph_fm',
    streamUrl: 'https://stream.zeno.fm/y2t2a07v4zquv',
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 128,
  },
  {
    id: 'ph-monster-rx931',
    name: 'Monster RX 93.1',
    subtitle: 'PH FM • Manila Hit Radio',
    category: 'ph_fm',
    streamUrl: 'https://stream.zeno.fm/0r0xa792kwzuv',
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 128,
  },
  // Curated Cafe Lo-Fi & Jazz Streams (SomaFM reliable HTTPS)
  {
    id: 'cafe-somafm-groovesalad',
    name: 'SomaFM Groove Salad',
    subtitle: 'Cafe Ambient • Downtempo Beats',
    category: 'lofi_jazz',
    streamUrl: 'https://ice2.somafm.com/groovesalad-128-mp3',
    codec: 'MP3',
    countryCode: 'US',
    bitrate: 128,
  },
  {
    id: 'cafe-somafm-lush',
    name: 'SomaFM Lush',
    subtitle: 'Cafe Chill • Sensuous Lo-Fi Vocals',
    category: 'lofi_jazz',
    streamUrl: 'https://ice2.somafm.com/lush-128-mp3',
    codec: 'MP3',
    countryCode: 'US',
    bitrate: 128,
  },
  {
    id: 'cafe-somafm-sonicuniverse',
    name: 'SomaFM Sonic Universe',
    subtitle: 'Cafe Jazz • Nu-Jazz & Avant Groove',
    category: 'lofi_jazz',
    streamUrl: 'https://ice2.somafm.com/sonicuniverse-128-mp3',
    codec: 'MP3',
    countryCode: 'US',
    bitrate: 128,
  },
];

// Synthesizes a warm, cozy, seamlessly looping 16-second stereo Lo-Fi WAV Blob URL completely offline
function synthesizeOfflineLofiWavBlobUrl(trackId: string): string {
  const sampleRate = 22050;
  const durationSec = 16;
  const numSamples = sampleRate * durationSec;
  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  // Distinct warm jazz-lofi chord progressions per track (4 bars x 4s = 16s seamless loop)
  const chordBanks: Record<string, number[][]> = {
    'lofi-rain-miata': [
      [174.61, 220.0, 261.63, 329.63, 392.0], // Fmaj9
      [164.81, 196.0, 246.94, 293.66, 392.0], // Em7
      [146.83, 174.61, 220.0, 261.63, 329.63], // Dm9
      [130.81, 164.81, 196.0, 246.94, 293.66], // Cmaj9
    ],
    'lofi-midnight-espresso': [
      [146.83, 174.61, 220.0, 261.63, 329.63], // Dm9
      [196.0, 246.94, 293.66, 349.23, 440.0], // G13
      [130.81, 164.81, 196.0, 246.94, 329.63], // Cmaj7
      [220.0, 261.63, 329.63, 392.0, 493.88], // Am9
    ],
    'lofi-garden-morning': [
      [196.0, 246.94, 293.66, 369.99, 440.0], // Gmaj9
      [164.81, 196.0, 246.94, 293.66, 369.99], // Em9
      [130.81, 164.81, 196.0, 246.94, 293.66], // Cmaj9
      [146.83, 185.0, 220.0, 293.66, 329.63], // Dadd9
    ],
    'lofi-velvet-crema': [
      [220.0, 261.63, 329.63, 392.0, 493.88], // Am9
      [174.61, 220.0, 261.63, 329.63, 392.0], // Fmaj9
      [130.81, 164.81, 196.0, 246.94, 329.63], // Cmaj7
      [196.0, 246.94, 293.66, 329.63, 440.0], // G6/9
    ],
  };

  const chords = chordBanks[trackId] || chordBanks['lofi-rain-miata'];
  const melodyOffsets: Record<string, number[]> = {
    'lofi-rain-miata': [523.25, 659.25, 587.33, 440.0, 523.25, 493.88, 392.0, 440.0],
    'lofi-midnight-espresso': [440.0, 523.25, 493.88, 392.0, 329.63, 392.0, 440.0, 523.25],
    'lofi-garden-morning': [587.33, 659.25, 739.99, 587.33, 493.88, 587.33, 659.25, 587.33],
    'lofi-velvet-crema': [493.88, 523.25, 659.25, 587.33, 523.25, 440.0, 392.0, 440.0],
  };
  const melody = melodyOffsets[trackId] || melodyOffsets['lofi-rain-miata'];

  let offset = 44;
  let noiseSeed = 1337;
  const nextRand = () => {
    noiseSeed = (noiseSeed * 16807) % 2147483647;
    return (noiseSeed / 2147483647) * 2 - 1;
  };

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const barIdx = Math.floor(t / 4) % 4;
    const barT = t % 4;
    const chord = chords[barIdx];

    // Warm electric piano Rhodes pad envelope per 4s bar with smooth crossfade at loop seam
    const attack = Math.min(1, barT / 0.14);
    const decay = Math.exp(-barT * 0.42);
    const env = attack * (0.38 + 0.62 * decay);

    // Subtle tape wow/flutter
    const flutter = 1 + 0.0018 * Math.sin(2 * Math.PI * 0.5 * t);

    let padL = 0;
    let padR = 0;
    for (let n = 0; n < chord.length; n++) {
      const f = chord[n] * flutter;
      const tone =
        Math.sin(2 * Math.PI * f * t) * 0.72 +
        Math.sin(2 * Math.PI * f * 2 * t) * 0.16 * Math.exp(-barT * 1.6);
      const pan = n % 2 === 0 ? 0.56 : 0.44;
      padL += tone * pan;
      padR += tone * (1 - pan);
    }
    padL = (padL / chord.length) * env * 0.38;
    padR = (padR / chord.length) * env * 0.38;

    // Warm sub bass root note
    const bassFreq = chord[0] * 0.5;
    const bassEnv = Math.min(1, barT / 0.06) * Math.exp(-barT * 0.55);
    const bass = Math.sin(2 * Math.PI * bassFreq * t) * bassEnv * 0.22;

    // Delicate Rhodes melody bell every 2s
    const melIdx = Math.floor(t / 2) % melody.length;
    const melT = t % 2;
    const melFreq = melody[melIdx];
    const melEnv = Math.min(1, melT / 0.025) * Math.exp(-melT * 1.9);
    const melTone =
      (Math.sin(2 * Math.PI * melFreq * t) + 0.22 * Math.sin(2 * Math.PI * melFreq * 3 * t)) *
      melEnv *
      0.095;

    // Soft brushed lo-fi beat (kick on 0 & 2.5, soft brush snare on 1 & 3)
    const beatT = t % 2;
    let drum = 0;
    if (beatT < 0.14) {
      const kFreq = 92 * Math.exp(-beatT * 24) + 36;
      drum += Math.sin(2 * Math.PI * kFreq * beatT) * Math.exp(-beatT * 20) * 0.2;
    }
    const snareT = (t + 1) % 2;
    if (snareT < 0.08) {
      drum += nextRand() * Math.exp(-snareT * 38) * 0.055;
    }

    // Gentle stereo widening + seamless loop edge envelope
    const edgeFade =
      t < 0.04 ? t / 0.04 : t > durationSec - 0.04 ? (durationSec - t) / 0.04 : 1;

    const sampleL = Math.max(-0.92, Math.min(0.92, (padL + bass + melTone * 0.65 + drum) * edgeFade));
    const sampleR = Math.max(-0.92, Math.min(0.92, (padR + bass + melTone * 0.35 + drum) * edgeFade));

    view.setInt16(offset, Math.round(sampleL * 32767), true);
    view.setInt16(offset + 2, Math.round(sampleR * 32767), true);
    offset += 4;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

type AudioListener = (state: UnifiedAudioState) => void;

export class MusicPlayerController {
  private audioEl: HTMLAudioElement | null = null;
  private listeners = new Set<AudioListener>();
  private snapshotListeners = new Set<(snapshot: MusicPlayerSnapshot) => void>();
  private synthesizedUrlCache = new Map<string, string>();
  private radioTimeoutId: number | null = null;
  private fadeTimerId: number | null = null;
  private booted = false;

  private state: UnifiedAudioState = {
    mode: 'vinyl',
    isPlaying: false,
    isLoadingStream: false,
    streamError: null,
    musicVolume: DEFAULT_AUDIO_PREFERENCES.musicVolume,
    ambienceVolume: DEFAULT_AUDIO_PREFERENCES.ambienceVolume,
    vinylCrackle: DEFAULT_AUDIO_PREFERENCES.vinylCrackle,
    repeatTrack: false,
    vinylTracks: [...DEFAULT_VINYL_CRATE],
    currentVinylId: DEFAULT_VINYL_CRATE[0].id,
    radioStations: [...CURATED_RADIO_STATIONS],
    directoryStations: [],
    directoryLoading: false,
    directoryLoaded: false,
    currentRadioId: CURATED_RADIO_STATIONS[0].id,
    externalMedia: {
      isActive: false,
      title: 'External Audio Active',
      artist: 'Playing from your device',
      sourceApp: 'System Media',
      hasPermission: false,
      isNativeBridgeAvailable: false,
    },
    lastPlayedNonExternalMode: 'vinyl',
  };

  private ensureAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.preload = 'auto';
      this.audioEl.crossOrigin = 'anonymous';
      this.audioEl.volume = this.state.musicVolume;

      this.audioEl.addEventListener('ended', () => {
        if (this.state.mode !== 'vinyl') return;
        if (this.state.repeatTrack) {
          this.playCurrentVinyl();
        } else {
          this.nextTrack();
        }
      });

      this.audioEl.addEventListener('playing', () => {
        this.clearRadioTimeout();
        if (this.state.isLoadingStream || this.state.streamError) {
          this.setState({ isLoadingStream: false, streamError: null, isPlaying: true });
        } else if (!this.state.isPlaying) {
          this.setState({ isPlaying: true });
        }
      });

      this.audioEl.addEventListener('error', () => {
        if (this.state.mode === 'radio') {
          this.clearRadioTimeout();
          this.setState({
            isLoadingStream: false,
            isPlaying: false,
            streamError: 'No Signal — Try another station or switch to Vinyl',
          });
        }
      });
    }
    return this.audioEl;
  }

  public getState(): UnifiedAudioState {
    return this.state;
  }

  public getSnapshot(): MusicPlayerSnapshot {
    const s = this.state;
    const activeVinylIndex = Math.max(
      0,
      s.vinylTracks.findIndex((t) => t.id === s.currentVinylId)
    );
    const combinedStations = [...s.radioStations, ...s.directoryStations];
    const radioStatus: MusicPlayerSnapshot['radioStatus'] = s.streamError
      ? 'fallback'
      : s.isLoadingStream
      ? 'connecting'
      : s.mode === 'radio' && s.isPlaying
      ? 'playing'
      : 'idle';

    const statusMessage =
      s.streamError ||
      (s.isLoadingStream ? 'Tuning cafe radio stream...' : null);

    return {
      mode: s.mode,
      isPlaying: s.isPlaying,
      volume: s.musicVolume,
      ambienceVolume: s.ambienceVolume,
      crackleEnabled: s.vinylCrackle,
      repeatOne: s.repeatTrack,
      vinylTracks: s.vinylTracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        durationSec: t.durationSec,
        bpm: t.bpm,
        labelColor: t.accentHex,
        isCustom: t.isCustomByo,
      })),
      activeVinylIndex,
      radioStations: combinedStations.map((st) => ({
        id: st.id,
        name: st.name,
        region: st.countryCode === 'PH' ? 'Philippines' : st.countryCode || 'Global',
        genre: st.subtitle,
        streamUrl: st.streamUrl,
        codec: st.codec,
      })),
      activeStationId: s.currentRadioId,
      radioStatus,
      statusMessage,
      isNativeAndroid: s.externalMedia.isNativeBridgeAvailable,
      hasNotificationAccess: s.externalMedia.hasPermission,
      externalMedia: {
        isActive: s.externalMedia.isActive,
        isPlaying: s.externalMedia.isActive,
        title: s.externalMedia.title,
        artist: s.externalMedia.artist,
        sourceApp: s.externalMedia.sourceApp,
      },
    };
  }

  public subscribe(listener: (snapshot: MusicPlayerSnapshot) => void): () => void {
    this.snapshotListeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  private emit() {
    const snap = this.getSnapshot();
    for (const listener of this.snapshotListeners) {
      listener(snap);
    }
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private setState(partial: Partial<UnifiedAudioState>) {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  public getPersistedPreferences(): AudioPreferences {
    return {
      mode: this.state.lastPlayedNonExternalMode,
      lastVinylTrackId: this.state.currentVinylId,
      lastRadioStationId: this.state.currentRadioId,
      vinylCrackle: this.state.vinylCrackle,
      musicVolume: this.state.musicVolume,
      ambienceVolume: this.state.ambienceVolume,
    };
  }

  public hydratePreferences(prefs?: AudioPreferences) {
    if (!prefs) return;
    const safeMode: 'vinyl' | 'radio' = prefs.mode === 'radio' ? 'radio' : 'vinyl';
    const validVinyl = this.state.vinylTracks.some((t) => t.id === prefs.lastVinylTrackId)
      ? prefs.lastVinylTrackId
      : DEFAULT_VINYL_CRATE[0].id;
    const validRadio = this.state.radioStations.some((s) => s.id === prefs.lastRadioStationId)
      ? prefs.lastRadioStationId
      : CURATED_RADIO_STATIONS[0].id;

    soundEngine.setAmbienceVolume(prefs.ambienceVolume);
    this.setState({
      mode: this.state.mode === 'external' ? 'external' : safeMode,
      lastPlayedNonExternalMode: safeMode,
      currentVinylId: validVinyl,
      currentRadioId: validRadio,
      vinylCrackle: Boolean(prefs.vinylCrackle),
      musicVolume: Math.max(0, Math.min(1, prefs.musicVolume)),
      ambienceVolume: Math.max(0, Math.min(1, prefs.ambienceVolume)),
    });
    if (this.audioEl) {
      this.audioEl.volume = this.state.musicVolume;
    }
  }

  // Phase 6.1: Boot-time "External First" catch + visibilitychange resume coexistence
  public initOnBoot(savedPrefs?: AudioPreferences) {
    if (savedPrefs) {
      this.hydratePreferences(savedPrefs);
    }
    if (this.booted || typeof window === 'undefined') return;
    this.booted = true;

    const native = window.KlasikNativeAudio;
    const hasNative = Boolean(native);

    if (native) {
      const extActive = this.safeCheckNativeActive();
      const meta = this.readNativeMetadata();
      const hasPerm = this.safeCheckNativePermission();
      this.setState({
        externalMedia: {
          ...meta,
          isActive: extActive,
          hasPermission: hasPerm,
          isNativeBridgeAvailable: true,
        },
      });
      if (extActive) {
        this.switchToExternalSilently();
      }
    } else {
      this.setState({
        externalMedia: {
          ...this.state.externalMedia,
          isNativeBridgeAvailable: false,
        },
      });
    }

    window.addEventListener('klasik-external-media-update', this.handleNativeMediaEvent as EventListener);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private safeCheckNativeActive(): boolean {
    try {
      return Boolean(window.KlasikNativeAudio?.isExternalMusicActive());
    } catch {
      return false;
    }
  }

  private safeCheckNativePermission(): boolean {
    try {
      return Boolean(window.KlasikNativeAudio?.hasNotificationAccess());
    } catch {
      return false;
    }
  }

  private readNativeMetadata(): Pick<ExternalMediaSnapshot, 'title' | 'artist' | 'sourceApp'> {
    try {
      const raw = window.KlasikNativeAudio?.getCurrentMediaMetadata();
      if (!raw) {
        return {
          title: 'External Audio Active',
          artist: 'Playing from your device',
          sourceApp: 'System Media',
        };
      }
      const parsed = JSON.parse(raw) as {
        title?: string;
        artist?: string;
        sourceApp?: string;
      };
      return {
        title: (parsed.title || '').trim() || 'External Audio Active',
        artist: (parsed.artist || '').trim() || 'Playing from your device',
        sourceApp: (parsed.sourceApp || '').trim() || 'System Media',
      };
    } catch {
      return {
        title: 'External Audio Active',
        artist: 'Playing from your device',
        sourceApp: 'System Media',
      };
    }
  }

  private handleNativeMediaEvent = (evt: CustomEvent) => {
    const detail = (evt?.detail || {}) as {
      title?: string;
      artist?: string;
      sourceApp?: string;
      isPlaying?: boolean;
    };
    const isActive =
      typeof detail.isPlaying === 'boolean' ? detail.isPlaying : this.safeCheckNativeActive();
    const hasPerm = this.safeCheckNativePermission();
    this.setState({
      externalMedia: {
        isActive,
        title: (detail.title || '').trim() || 'External Audio Active',
        artist: (detail.artist || '').trim() || 'Playing from your device',
        sourceApp: (detail.sourceApp || '').trim() || 'System Media',
        hasPermission: hasPerm,
        isNativeBridgeAvailable: Boolean(window.KlasikNativeAudio),
      },
    });
    if (isActive && this.state.mode !== 'external') {
      this.fadeOutMusicAndEnterExternal();
    }
  };

  private handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return;
    if (!window.KlasikNativeAudio) return;
    const extActive = this.safeCheckNativeActive();
    const meta = this.readNativeMetadata();
    const hasPerm = this.safeCheckNativePermission();
    this.setState({
      externalMedia: {
        ...meta,
        isActive: extActive,
        hasPermission: hasPerm,
        isNativeBridgeAvailable: true,
      },
    });
    if (extActive && this.state.mode !== 'external') {
      this.fadeOutMusicAndEnterExternal();
    }
  };

  private switchToExternalSilently() {
    this.clearRadioTimeout();
    soundEngine.setVinylCrackleEnabled(false);
    soundEngine.setLofiSynthActive(false);
    if (this.audioEl) {
      this.audioEl.pause();
    }
    this.setState({
      mode: 'external',
      isPlaying: false,
      isLoadingStream: false,
      streamError: null,
    });
  }

  private fadeOutMusicAndEnterExternal() {
    this.clearRadioTimeout();
    soundEngine.setVinylCrackleEnabled(false);
    soundEngine.setLofiSynthActive(false);
    const el = this.audioEl;
    if (!el || el.paused) {
      this.switchToExternalSilently();
      return;
    }
    if (this.fadeTimerId !== null) {
      window.clearInterval(this.fadeTimerId);
    }
    const startVol = el.volume;
    const steps = 10;
    let step = 0;
    this.fadeTimerId = window.setInterval(() => {
      step++;
      el.volume = Math.max(0, startVol * (1 - step / steps));
      if (step >= steps) {
        if (this.fadeTimerId !== null) {
          window.clearInterval(this.fadeTimerId);
          this.fadeTimerId = null;
        }
        el.pause();
        el.volume = this.state.musicVolume;
        this.setState({
          mode: 'external',
          isPlaying: false,
          isLoadingStream: false,
          streamError: null,
        });
      }
    }, 30); // 10 x 30ms = 300ms smooth fade-out
  }

  private clearRadioTimeout() {
    if (this.radioTimeoutId !== null) {
      window.clearTimeout(this.radioTimeoutId);
      this.radioTimeoutId = null;
    }
  }

  public setMode(nextMode: AudioModeId, autoPlay = true) {
    soundEngine.init();
    this.clearRadioTimeout();

    if (nextMode === 'external') {
      this.fadeOutMusicAndEnterExternal();
      const meta = this.readNativeMetadata();
      const hasPerm = this.safeCheckNativePermission();
      const isActive = this.safeCheckNativeActive();
      this.setState({
        mode: 'external',
        externalMedia: {
          ...meta,
          isActive: isActive || true,
          hasPermission: hasPerm,
          isNativeBridgeAvailable: Boolean(window.KlasikNativeAudio),
        },
      });
      return;
    }

    this.setState({
      mode: nextMode,
      lastPlayedNonExternalMode: nextMode,
      streamError: null,
    });

    if (nextMode === 'vinyl') {
      soundEngine.playVinylNeedleDrop(true);
      soundEngine.setVinylCrackleEnabled(this.state.vinylCrackle);
      if (autoPlay) {
        this.playCurrentVinyl();
      } else {
        this.pause();
      }
    } else if (nextMode === 'radio') {
      soundEngine.setVinylCrackleEnabled(false);
      if (autoPlay) {
        this.playRadioStation(this.state.currentRadioId);
      } else {
        this.pause();
      }
    }
  }

  public getCurrentVinylTrack(): VinylTrackItem {
    return (
      this.state.vinylTracks.find((t) => t.id === this.state.currentVinylId) ||
      this.state.vinylTracks[0]
    );
  }

  public getCurrentRadioStation(): RadioStationItem {
    const all = [...this.state.radioStations, ...this.state.directoryStations];
    return all.find((s) => s.id === this.state.currentRadioId) || this.state.radioStations[0];
  }

  public getNowPlayingSummary(): { title: string; subtitle: string; isByo: boolean } {
    if (this.state.mode === 'external') {
      return {
        title: this.state.externalMedia.title,
        subtitle: `${this.state.externalMedia.artist} • ${this.state.externalMedia.sourceApp}`,
        isByo: false,
      };
    }
    if (this.state.mode === 'radio') {
      const st = this.getCurrentRadioStation();
      return {
        title: st.name,
        subtitle: this.state.streamError || st.subtitle,
        isByo: false,
      };
    }
    const tr = this.getCurrentVinylTrack();
    return {
      title: tr.title,
      subtitle: tr.isCustomByo ? 'Custom Vinyl • Local Audio' : tr.artist,
      isByo: tr.isCustomByo,
    };
  }

  public playCurrentVinyl() {
    const track = this.getCurrentVinylTrack();
    if (!track) return;
    const el = this.ensureAudioElement();
    if (!el) return;

    this.clearRadioTimeout();
    let srcUrl = track.objectUrl;
    if (!srcUrl && !track.isCustomByo) {
      srcUrl = this.synthesizedUrlCache.get(track.id);
      if (!srcUrl) {
        srcUrl = synthesizeOfflineLofiWavBlobUrl(track.id);
        this.synthesizedUrlCache.set(track.id, srcUrl);
      }
    }
    if (!srcUrl) return;

    el.loop = !track.isCustomByo || this.state.repeatTrack;
    el.volume = this.state.musicVolume;
    if (el.src !== srcUrl) {
      el.src = srcUrl;
      el.load();
    }
    soundEngine.setVinylCrackleEnabled(this.state.vinylCrackle);
    soundEngine.setLofiSynthActive(false);

    this.setState({
      mode: 'vinyl',
      lastPlayedNonExternalMode: 'vinyl',
      isPlaying: true,
      isLoadingStream: false,
      streamError: null,
    });

    el.play().catch(() => {
      this.setState({ isPlaying: false });
    });
  }

  public selectVinylTrack(trackId: string) {
    if (!this.state.vinylTracks.some((t) => t.id === trackId)) return;
    soundEngine.init();
    soundEngine.playVinylNeedleDrop(true);
    this.setState({
      currentVinylId: trackId,
      mode: 'vinyl',
      lastPlayedNonExternalMode: 'vinyl',
      streamError: null,
    });
    this.playCurrentVinyl();
  }

  // Phase 2.1: Bring Your Own Vinyl local file loader with clean Object URL tracking
  public addLocalFiles(files: FileList | File[]): number {
    const arr = Array.from(files || []);
    const accepted = arr.filter(
      (f) => f.type.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|flac|aac|webm)$/i.test(f.name)
    );
    if (accepted.length === 0) return 0;

    const customAccentPalette = ['#f59e0b', '#fb7185', '#34d399', '#38bdf8', '#c084fc'];
    const added: VinylTrackItem[] = accepted.map((file, idx) => {
      const objectUrl = URL.createObjectURL(file);
      return {
        id: `byo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        title: cleanAudioFileName(file.name),
        artist: 'Local Vinyl Import',
        durationSec: 180,
        bpm: 90,
        accentHex: customAccentPalette[(this.state.vinylTracks.length + idx) % customAccentPalette.length],
        isCustomByo: true,
        objectUrl,
      };
    });

    const nextTracks = [...this.state.vinylTracks, ...added];
    this.setState({
      vinylTracks: nextTracks,
      currentVinylId: added[0].id,
      mode: 'vinyl',
      lastPlayedNonExternalMode: 'vinyl',
      streamError: null,
    });
    this.playCurrentVinyl();
    return added.length;
  }

  public removeLocalTrack(trackId: string) {
    const target = this.state.vinylTracks.find((t) => t.id === trackId);
    if (!target || !target.isCustomByo) return;
    if (target.objectUrl) {
      URL.revokeObjectURL(target.objectUrl);
    }
    const remaining = this.state.vinylTracks.filter((t) => t.id !== trackId);
    const wasCurrent = this.state.currentVinylId === trackId;
    const nextId = wasCurrent ? remaining[0]?.id || DEFAULT_VINYL_CRATE[0].id : this.state.currentVinylId;
    this.setState({ vinylTracks: remaining, currentVinylId: nextId });
    if (wasCurrent && this.state.mode === 'vinyl' && this.state.isPlaying) {
      this.playCurrentVinyl();
    }
  }

  // Phase 3.1: Tune live radio with 350ms static burst + 5000ms connection timeout fallback
  public playRadioStation(stationId: string) {
    const all = [...this.state.radioStations, ...this.state.directoryStations];
    const station = all.find((s) => s.id === stationId) || this.state.radioStations[0];
    if (!station) return;

    const el = this.ensureAudioElement();
    if (!el) return;

    this.clearRadioTimeout();
    soundEngine.init();
    soundEngine.setVinylCrackleEnabled(false);
    soundEngine.setLofiSynthActive(false);
    soundEngine.playRadioStatic(0.35);

    this.setState({
      mode: 'radio',
      lastPlayedNonExternalMode: 'radio',
      currentRadioId: station.id,
      isLoadingStream: true,
      isPlaying: false,
      streamError: null,
    });

    el.pause();
    el.loop = false;
    el.volume = this.state.musicVolume;
    el.src = station.streamUrl;
    el.load();

    // 5000ms connection timeout fallback
    this.radioTimeoutId = window.setTimeout(() => {
      if (this.state.mode === 'radio' && this.state.isLoadingStream) {
        el.pause();
        this.setState({
          isLoadingStream: false,
          isPlaying: false,
          streamError: 'No Signal — Try another station or switch to Vinyl',
        });
      }
    }, 5000);

    el.play()
      .then(() => {
        this.clearRadioTimeout();
        this.setState({
          isLoadingStream: false,
          isPlaying: true,
          streamError: null,
        });
      })
      .catch(() => {
        // Error handler or timeout will surface the fallback cleanly
      });
  }

  // Phase 3.1 Layer 2: Fetch verified HTTPS MP3/AAC stations from Radio Browser API
  public async fetchPhilippineStations(query = ''): Promise<RadioStationItem[]> {
    if (typeof fetch === 'undefined') return [];
    this.setState({ directoryLoading: true });
    try {
      const qParam = query.trim()
        ? `&name=${encodeURIComponent(query.trim())}`
        : '&countrycode=PH';
      const url = `https://de1.api.radio-browser.info/json/stations/search?limit=30&order=clickcount&reverse=true&hidebroken=true${qParam}`;
      const controller = new AbortController();
      const abortTimer = window.setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      window.clearTimeout(abortTimer);
      if (!res.ok) throw new Error('Radio directory unavailable');
      const raw = (await res.json()) as RadioBrowserRawStation[];
      const verified = filterVerifiedRadioStations(raw);
      this.setState({
        directoryStations: verified,
        directoryLoading: false,
        directoryLoaded: true,
      });
      return verified;
    } catch {
      this.setState({ directoryLoading: false, directoryLoaded: true });
      return [];
    }
  }

  public togglePlayPause() {
    soundEngine.init();
    if (this.state.mode === 'external') {
      this.sendExternalMediaCommand('play_pause');
      return;
    }
    if (this.state.isPlaying || this.state.isLoadingStream) {
      this.pause();
    } else if (this.state.mode === 'vinyl') {
      soundEngine.playVinylNeedleDrop(true);
      this.playCurrentVinyl();
    } else if (this.state.mode === 'radio') {
      this.playRadioStation(this.state.currentRadioId);
    }
  }

  public pause() {
    this.clearRadioTimeout();
    if (this.audioEl) {
      this.audioEl.pause();
    }
    soundEngine.setVinylCrackleEnabled(false);
    soundEngine.setLofiSynthActive(false);
    this.setState({ isPlaying: false, isLoadingStream: false });
  }

  public nextTrack() {
    if (this.state.mode === 'external') {
      this.sendExternalMediaCommand('next');
      return;
    }
    if (this.state.mode === 'radio') {
      const all = [...this.state.radioStations, ...this.state.directoryStations];
      const idx = all.findIndex((s) => s.id === this.state.currentRadioId);
      const next = all[(idx + 1) % all.length];
      if (next) this.playRadioStation(next.id);
      return;
    }
    const idx = this.state.vinylTracks.findIndex((t) => t.id === this.state.currentVinylId);
    const next = this.state.vinylTracks[(idx + 1) % this.state.vinylTracks.length];
    if (next) this.selectVinylTrack(next.id);
  }

  public prevTrack() {
    if (this.state.mode === 'external') {
      this.sendExternalMediaCommand('prev');
      return;
    }
    if (this.state.mode === 'radio') {
      const all = [...this.state.radioStations, ...this.state.directoryStations];
      const idx = all.findIndex((s) => s.id === this.state.currentRadioId);
      const prev = all[(idx - 1 + all.length) % all.length];
      if (prev) this.playRadioStation(prev.id);
      return;
    }
    const idx = this.state.vinylTracks.findIndex((t) => t.id === this.state.currentVinylId);
    const prev =
      this.state.vinylTracks[(idx - 1 + this.state.vinylTracks.length) % this.state.vinylTracks.length];
    if (prev) this.selectVinylTrack(prev.id);
  }

  public setMusicVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    if (this.audioEl) {
      this.audioEl.volume = clamped;
    }
    this.setState({ musicVolume: clamped });
  }

  public setAmbienceVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    soundEngine.setAmbienceVolume(clamped);
    this.setState({ ambienceVolume: clamped });
  }

  public toggleVinylCrackle() {
    const next = !this.state.vinylCrackle;
    this.setState({ vinylCrackle: next });
    if (this.state.mode === 'vinyl' && this.state.isPlaying) {
      soundEngine.setVinylCrackleEnabled(next);
    }
  }

  public toggleRepeatTrack() {
    const next = !this.state.repeatTrack;
    this.setState({ repeatTrack: next });
    if (this.audioEl && this.state.mode === 'vinyl') {
      const tr = this.getCurrentVinylTrack();
      this.audioEl.loop = !tr.isCustomByo || next;
    }
  }

  public sendExternalMediaCommand(action: 'play_pause' | 'next' | 'prev') {
    try {
      window.KlasikNativeAudio?.sendMediaKey?.(action);
    } catch {
      // ignore if native bridge unavailable
    }
  }

  public openNotificationAccessSettings() {
    try {
      window.KlasikNativeAudio?.openNotificationAccessSettings();
    } catch {
      // ignore on web
    }
  }

  public addCustomVinylFiles(files: FileList | File[]): number {
    return this.addLocalFiles(files);
  }

  public removeCustomVinylTrack(trackId: string) {
    this.removeLocalTrack(trackId);
  }

  public playVinylTrack(indexOrId: number | string) {
    if (typeof indexOrId === 'number') {
      const track = this.state.vinylTracks[indexOrId];
      if (track) this.selectVinylTrack(track.id);
    } else {
      this.selectVinylTrack(indexOrId);
    }
  }

  public tuneRadioStation(stationId: string) {
    this.playRadioStation(stationId);
  }

  public refreshRadioBrowserStations(query = ''): Promise<RadioStationItem[]> {
    return this.fetchPhilippineStations(query);
  }

  public setCrackleEnabled(enabled: boolean) {
    if (this.state.vinylCrackle !== enabled) {
      this.toggleVinylCrackle();
    }
  }

  public setRepeatOne(enabled: boolean) {
    if (this.state.repeatTrack !== enabled) {
      this.toggleRepeatTrack();
    }
  }

  public setVolume(vol: number) {
    this.setMusicVolume(vol);
  }

  public next() {
    this.nextTrack();
  }

  public prev() {
    this.prevTrack();
  }

  public dispose() {
    this.clearRadioTimeout();
    if (this.fadeTimerId !== null) {
      window.clearInterval(this.fadeTimerId);
      this.fadeTimerId = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener(
        'klasik-external-media-update',
        this.handleNativeMediaEvent as EventListener
      );
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = '';
    }
    // Revoke all allocated Object URLs (BYO local files + synthesized offline WAVs)
    for (const t of this.state.vinylTracks) {
      if (t.objectUrl) {
        URL.revokeObjectURL(t.objectUrl);
      }
    }
    for (const url of this.synthesizedUrlCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.synthesizedUrlCache.clear();
  }
}

export const musicPlayerController = new MusicPlayerController();
