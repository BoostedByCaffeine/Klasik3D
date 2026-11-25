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
  backupUrls?: string[];
  codec: string;
  countryCode: string;
  bitrate?: number;
}

export type RadioCountryFilter = 'ALL' | 'PH' | 'US';

export interface ExternalMediaSnapshot {
  isActive: boolean;
  title: string;
  artist: string;
  sourceApp: string;
  hasPermission: boolean;
  isNativeBridgeAvailable: boolean;
  isBrowserCaptureActive: boolean;
  isBrowserCaptureMuted: boolean;
  signalLevel: number; // 0..1 live audio meter from browser tab capture
  captureError: string | null;
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
  radioCountryFilter: RadioCountryFilter;
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
  countryCode: 'PH' | 'US';
  genre: string;
  streamUrl: string;
  codec: string;
  layer: 'curated' | 'directory';
  freqLabel?: string;
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
  radioCountryFilter: RadioCountryFilter;
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
    isBrowserCaptureActive: boolean;
    isBrowserCaptureMuted: boolean;
    signalLevel: number;
    captureError: string | null;
  };
}

export interface KlasikNativeAudioBridgeInterface {
  isExternalMusicActive(): boolean;
  getCurrentMediaMetadata(): string; // JSON: { title, artist, sourceApp, isPlaying }
  hasNotificationAccess(): boolean;
  hasNotificationListenerPermission?(): boolean;
  openNotificationAccessSettings(): void;
  openNotificationListenerSettings?(): void;
  refreshExternalMediaState?(): void;
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

export const RADIO_DIRECTORY_CACHE_KEY = 'klasik3d_radio_directory_cache_v2';

/** Strictly permitted radio countries (Philippines & United States ONLY — excludes India, Pakistan, and all others). */
export const ALLOWED_RADIO_COUNTRIES: ReadonlySet<string> = new Set(['PH', 'US']);

export function isAllowedRadioCountry(countryCode: string | undefined | null): countryCode is 'PH' | 'US' {
  if (!countryCode) return false;
  return ALLOWED_RADIO_COUNTRIES.has(countryCode.trim().toUpperCase());
}

/**
 * Parses a browser tab/window capture label (e.g. "Artist - Song - YouTube" or "Track · Artist | Spotify")
 * into clean Now-Playing metadata for the Audio Deck & 3D Counter Hologram.
 */
export function parseCapturedTabTitle(rawLabel: string): {
  title: string;
  artist: string;
  sourceApp: string;
} {
  const cleaned = (rawLabel || '')
    .replace(/^\(\d+\)\s*/, '')
    .replace(/^tab:\d+:\d+\s*/i, '')
    .trim();

  if (!cleaned || /^window:|^screen:|^monitor:/i.test(cleaned)) {
    return {
      title: 'Background Tab Audio',
      artist: 'Live Browser Capture',
      sourceApp: 'Browser Tab',
    };
  }

  let sourceApp = 'Browser Tab';
  let core = cleaned;
  const appMatchers: Array<[RegExp, string]> = [
    [/\s*[-–|•·]\s*YouTube Music$/i, 'YouTube Music'],
    [/\s*[-–|•·]\s*YouTube$/i, 'YouTube'],
    [/\s*[-–|•·]\s*Spotify.*$/i, 'Spotify Web'],
    [/\s*[-–|•·]\s*Apple Music$/i, 'Apple Music'],
    [/\s*[-–|•·]\s*SoundCloud$/i, 'SoundCloud'],
    [/\s*[-–|•·]\s*Twitch$/i, 'Twitch'],
  ];
  for (const [re, label] of appMatchers) {
    if (re.test(core)) {
      sourceApp = label;
      core = core.replace(re, '').trim();
      break;
    }
  }

  const bulletMatch = core.split(/\s+[•·]\s+/);
  if (bulletMatch.length >= 2) {
    return {
      title: bulletMatch[0].trim().slice(0, 64) || core.slice(0, 64),
      artist: bulletMatch.slice(1).join(' · ').trim().slice(0, 64) || sourceApp,
      sourceApp,
    };
  }

  const dashMatch = core.split(/\s+[-–—]\s+/);
  if (dashMatch.length >= 2) {
    return {
      artist: dashMatch[0].trim().slice(0, 64) || sourceApp,
      title: dashMatch.slice(1).join(' - ').trim().slice(0, 64) || core.slice(0, 64),
      sourceApp,
    };
  }

  return {
    title: core.slice(0, 64) || 'Background Tab Audio',
    artist: 'Live Browser Capture',
    sourceApp,
  };
}

// Pure testable Radio Browser API station filter (strict PH/US countries + HTTPS + MP3/AAC only)
export function filterVerifiedRadioStations(
  rawList: RadioBrowserRawStation[]
): RadioStationItem[] {
  const seenUrls = new Set<string>();
  const verified: RadioStationItem[] = [];
  for (const s of rawList) {
    const url = (s.url_resolved || '').trim();
    const codec = (s.codec || '').trim();
    const name = (s.name || '').trim();
    const cc = (s.countrycode || '').trim().toUpperCase();
    if (!url || !name) continue;
    if (!isAllowedRadioCountry(cc)) continue;
    if (!url.startsWith('https://')) continue;
    if (!/mp3|aac/i.test(codec)) continue;
    // Skip known broken radioca.st or 403 brigadanews web wrappers
    if (/radioca\.st|brigadanews\.ph\/?$/i.test(url)) continue;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    verified.push({
      id: `rb-${s.stationuuid || verified.length}`,
      name: name.slice(0, 42),
      subtitle: `${cc === 'PH' ? 'Philippines' : 'United States'} • ${codec.toUpperCase()}${
        s.bitrate ? ` ${s.bitrate}k` : ''
      }`,
      category: 'directory',
      streamUrl: url,
      codec: codec.toUpperCase(),
      countryCode: cc,
      bitrate: s.bitrate,
    });
  }
  return verified;
}

/**
 * Builds the ordered, deduplicated HTTPS mirror list for a radio station so live
 * playback automatically fails over across backup relays before reporting offline.
 */
export function resolveStationMirrorUrls(station: Pick<RadioStationItem, 'streamUrl' | 'backupUrls'>): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const candidates = [station.streamUrl, ...(station.backupUrls || [])];
  for (const raw of candidates) {
    const cleaned = (raw || '').trim();
    if (!cleaned || !cleaned.startsWith('https://') || seen.has(cleaned)) continue;
    seen.add(cleaned);
    urls.push(cleaned);
  }
  return urls;
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

// Layer 1: Live-Verified Philippines (PH) & United States (US) Radio Streams ONLY
// Every primary & backup URL was live-tested for HTTP 200 audio/mpeg or audio/aac over HTTPS.
export const CURATED_RADIO_STATIONS: RadioStationItem[] = [
  // Curated Philippine FM & AM Stations (PH)
  {
    id: 'ph-love-radio-907',
    name: '90.7 Love Radio Manila',
    subtitle: 'PH FM • OPM, Pop & Kailangan Pa Bang I-Memorize Yan',
    category: 'ph_fm',
    streamUrl: 'https://azura.loveradio.com.ph/listen/love_radio_manila/radio.mp3',
    backupUrls: [
      'https://radio.1017yourlovefm.com/listen/sanibpwersa/radio.mp3',
      'https://azura.easyrock.com.ph/listen/easy_rock_manila/radio.mp3',
    ],
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 128,
  },
  {
    id: 'ph-yes-1011',
    name: '101.1 Yes! FM Manila',
    subtitle: 'PH FM • 101 Hit Music & Good Vibes',
    category: 'ph_fm',
    streamUrl: 'https://azura.yesfm.com.ph/listen/yes_fm_manila/radio.mp3',
    backupUrls: [
      'https://icecast.theanchor.app/bbbc',
      'https://azura.loveradio.com.ph/listen/love_radio_manila/radio.mp3',
    ],
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 128,
  },
  {
    id: 'ph-1015-fm',
    name: '101.5 / 101.7 Your Love FM',
    subtitle: 'PH FM • 101 OPM & Classic Favorites',
    category: 'ph_fm',
    streamUrl: 'https://radio.1017yourlovefm.com/listen/sanibpwersa/radio.mp3',
    backupUrls: [
      'https://listen.radioking.com/radio/453221/stream/508076',
      'https://azura.yesfm.com.ph/listen/yes_fm_manila/radio.mp3',
    ],
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 128,
  },
  {
    id: 'ph-bombo-radyo',
    name: 'Bombo Radyo Philippines',
    subtitle: 'PH News & Music • Basta Radyo, Bombo!',
    category: 'ph_fm',
    streamUrl: 'https://stream.zenolive.com/n6wgdtu78heuv',
    backupUrls: [
      'https://stream.zenolive.com/gzvmgtp78heuv',
      'https://stream.zeno.fm/s10z665mz9duv',
      'https://stream.zenolive.com/g2ak4fu78heuv',
    ],
    codec: 'AAC',
    countryCode: 'PH',
    bitrate: 128,
  },
  {
    id: 'ph-easy-rock-963',
    name: '96.3 Easy Rock Manila',
    subtitle: 'PH FM • Lite & Mellow Classics',
    category: 'ph_fm',
    streamUrl: 'https://azura.easyrock.com.ph/listen/easy_rock_manila/radio.mp3',
    backupUrls: [
      'https://stream.zeno.fm/kc3cct89sxquv',
      'https://azura.loveradio.com.ph/listen/love_radio_manila/radio.mp3',
    ],
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 128,
  },
  {
    id: 'ph-star-fm-1027',
    name: '102.7 Star FM Manila',
    subtitle: 'PH FM • It\'s All For You Hits',
    category: 'ph_fm',
    streamUrl: 'https://stream.zeno.fm/kg6tx8w4t9duv',
    backupUrls: [
      'https://stream.zeno.fm/60cb36c29heuv',
      'https://stream.zeno.fm/kw40qqc29heuv',
    ],
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 96,
  },
  {
    id: 'ph-lite-fm-1067',
    name: '106.7 Lite FM Mega Manila',
    subtitle: 'PH FM • Relaxing Cafe Easy Listening',
    category: 'ph_fm',
    streamUrl: 'https://stream.zeno.fm/kc3cct89sxquv',
    backupUrls: [
      'https://azura.easyrock.com.ph/listen/easy_rock_manila/radio.mp3',
      'https://cast3.my-control-panel.com/proxy/ronald/stream',
    ],
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 128,
  },
  {
    id: 'ph-energy-fm',
    name: '106.7 Energy FM PH',
    subtitle: 'PH FM • Wag Mong Sabihing Radyo, Sabihin Mo Energy!',
    category: 'ph_fm',
    streamUrl: 'https://s1.free-shoutcast.com/stream/18178',
    backupUrls: [
      'https://dj.amfm.link:8010/dyhc64',
      'https://azura.yesfm.com.ph/listen/yes_fm_manila/radio.mp3',
    ],
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 64,
  },
  {
    id: 'ph-90s-pinoy',
    name: '90s Pinoy Alternative',
    subtitle: 'PH OPM • Classic Pinoy Rock & Acoustic',
    category: 'ph_fm',
    streamUrl: 'https://cast3.my-control-panel.com/proxy/ronald/stream',
    backupUrls: [
      'https://azura.easyrock.com.ph/listen/easy_rock_manila/radio.mp3',
    ],
    codec: 'MP3',
    countryCode: 'PH',
    bitrate: 192,
  },
  // Curated United States Cafe, Lo-Fi & Jazz Streams (US)
  {
    id: 'us-litt-lofi-jazz',
    name: 'LITT Live Lo-Fi & Jazz',
    subtitle: 'US Cafe • Chill & Instrumental Jazz Beats',
    category: 'lofi_jazz',
    streamUrl: 'https://das-sa39.cdnstream1.com/5582_128',
    backupUrls: [
      'https://stream.emergent.fm/stream',
      'https://das-edge16-live365-dal02.cdnstream.com/a24494',
    ],
    codec: 'MP3',
    countryCode: 'US',
    bitrate: 128,
  },
  {
    id: 'us-coffee-loves-tea',
    name: 'CoffeeLovesTea Radio',
    subtitle: 'US Cafe • Warm Coffeehouse Acoustic & Chill',
    category: 'lofi_jazz',
    streamUrl: 'https://a7.asurahosting.com/listen/coffeelovestea/radio.mp3',
    backupUrls: [
      'https://das-edge16-live365-dal02.cdnstream.com/a24494',
      'https://das-sa39.cdnstream1.com/5582_128',
    ],
    codec: 'MP3',
    countryCode: 'US',
    bitrate: 192,
  },
  {
    id: 'us-smooth-jazz',
    name: 'SmoothJazz.com Global',
    subtitle: 'US Jazz • Contemporary Cafe Smooth Jazz',
    category: 'lofi_jazz',
    streamUrl: 'https://smoothjazz.cdnstream1.com/2585_128.mp3',
    backupUrls: [
      'https://icecast.walmradio.com:8443/classic',
    ],
    codec: 'MP3',
    countryCode: 'US',
    bitrate: 128,
  },
  {
    id: 'us-classic-vinyl',
    name: 'Classic Vinyl HD',
    subtitle: 'US Hi-Fi • Warm Analog Standards & Crooners',
    category: 'lofi_jazz',
    streamUrl: 'https://icecast.walmradio.com:8443/classic',
    backupUrls: [
      'https://www.hodlharmony.com/radio/electric-midnight.mp3',
    ],
    codec: 'MP3',
    countryCode: 'US',
    bitrate: 320,
  },
  {
    id: 'us-pax-lofi',
    name: 'PAX Lo-Fi Cafe Beats',
    subtitle: 'US Lo-Fi • Study & Late-Night Espresso Beats',
    category: 'lofi_jazz',
    streamUrl: 'https://das-edge16-live365-dal02.cdnstream.com/a24494',
    backupUrls: [
      'https://stream.emergent.fm/stream',
      'https://a7.asurahosting.com/listen/coffeelovestea/radio.mp3',
    ],
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
  private nativePollTimerId: number | null = null;
  private lastNativePollMs = 0;
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
    radioCountryFilter: 'ALL',
    currentRadioId: CURATED_RADIO_STATIONS[0].id,
    externalMedia: {
      isActive: false,
      title: 'External Audio Ready',
      artist: 'Connect tab audio or play on device',
      sourceApp: 'System Media',
      hasPermission: false,
      isNativeBridgeAvailable: false,
      isBrowserCaptureActive: false,
      isBrowserCaptureMuted: false,
      signalLevel: 0,
      captureError: null,
    },
    lastPlayedNonExternalMode: 'vinyl',
  };

  // Browser Tab Audio Capture state (Web External Audio Detector)
  private captureStream: MediaStream | null = null;
  private captureAudioCtx: AudioContext | null = null;
  private captureAnalyser: AnalyserNode | null = null;
  private captureMeterTimerId: number | null = null;
  private captureFreqBuf: Uint8Array<ArrayBuffer> | null = null;

  // Dedicated Vinyl Audio element (local/offline WAV/BYO files)
  private ensureAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.preload = 'auto';
      this.audioEl.volume = this.getEffectiveMusicVolume();

      this.audioEl.addEventListener('ended', () => {
        if (this.state.mode !== 'vinyl') return;
        if (this.state.repeatTrack) {
          this.playCurrentVinyl();
        } else {
          this.nextTrack();
        }
      });

      this.audioEl.addEventListener('playing', () => {
        if (this.state.mode !== 'vinyl') return;
        if (!this.state.isPlaying) {
          this.setState({ isPlaying: true, streamError: null });
        }
      });
    }
    return this.audioEl;
  }

  // Phase 0.3: Dedicated Direct HTML5 Audio for Live Radio — NEVER sets crossOrigin = 'anonymous'!
  private radioAudioEl: HTMLAudioElement | null = null;
  private radioMirrorQueue: string[] = [];
  private radioPlaySeq = 0;
  private outdoorMuffled = false;

  private getEffectiveMusicVolume(): number {
    return this.outdoorMuffled ? this.state.musicVolume * 0.34 : this.state.musicVolume;
  }

  private ensureRadioAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (!this.radioAudioEl) {
      const radioEl = new Audio();
      // CRITICAL: Never set crossOrigin on live Icecast/Shoutcast internet radio streams!
      radioEl.preload = 'none';
      radioEl.volume = this.getEffectiveMusicVolume();

      radioEl.addEventListener('playing', () => {
        if (this.state.mode !== 'radio') return;
        this.clearRadioTimeout();
        this.setState({ isLoadingStream: false, streamError: null, isPlaying: true });
      });

      radioEl.addEventListener('error', () => {
        if (this.state.mode !== 'radio') return;
        // Automatically fail over across verified HTTPS backup mirror URLs before reporting offline
        const nextBackup = this.radioMirrorQueue.shift();
        if (nextBackup) {
          this.setState({
            isLoadingStream: true,
            streamError: 'Station Stream Offline — Trying Backup...',
          });
          radioEl.src = nextBackup;
          radioEl.load();
          radioEl.play().catch(() => {
            // handled by subsequent error or timeout
          });
          return;
        }
        this.clearRadioTimeout();
        this.setState({
          isLoadingStream: false,
          isPlaying: false,
          streamError: 'Station Stream Offline — Tap Retry or try Cafe Chill',
        });
      });

      this.radioAudioEl = radioEl;
    }
    return this.radioAudioEl;
  }

  public setOutdoorMuffle(muffled: boolean) {
    if (this.outdoorMuffled === muffled) return;
    this.outdoorMuffled = muffled;
    const effVol = this.getEffectiveMusicVolume();
    if (this.audioEl) this.audioEl.volume = effVol;
    if (this.radioAudioEl) this.radioAudioEl.volume = effVol;
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
    const combinedStations = [...s.radioStations, ...s.directoryStations].filter((st) => {
      if (!isAllowedRadioCountry(st.countryCode)) return false;
      if (s.radioCountryFilter === 'ALL') return true;
      return st.countryCode === s.radioCountryFilter;
    });
    const radioStatus: MusicPlayerSnapshot['radioStatus'] = s.streamError
      ? 'fallback'
      : s.isLoadingStream
      ? 'connecting'
      : s.mode === 'radio' && s.isPlaying
      ? 'playing'
      : 'idle';

    const statusMessage =
      s.streamError ||
      (s.isLoadingStream ? 'Tuning...' : null);

    const effectiveIsPlaying =
      s.mode === 'external'
        ? s.externalMedia.isActive && !s.externalMedia.isBrowserCaptureMuted
        : s.isPlaying;

    return {
      mode: s.mode,
      isPlaying: effectiveIsPlaying,
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
        region: st.countryCode === 'PH' ? 'Philippines' : 'United States',
        countryCode: st.countryCode === 'PH' ? 'PH' : 'US',
        genre: st.subtitle,
        streamUrl: st.streamUrl,
        codec: st.codec,
        layer: st.category === 'directory' ? 'directory' : 'curated',
        freqLabel: st.bitrate ? `${st.bitrate}k ${st.codec}` : st.codec,
      })),
      radioCountryFilter: s.radioCountryFilter,
      activeStationId: s.currentRadioId,
      radioStatus,
      statusMessage,
      isNativeAndroid: s.externalMedia.isNativeBridgeAvailable,
      hasNotificationAccess: s.externalMedia.hasPermission,
      externalMedia: {
        isActive: s.externalMedia.isActive,
        isPlaying: s.externalMedia.isActive && !s.externalMedia.isBrowserCaptureMuted,
        title: s.externalMedia.title,
        artist: s.externalMedia.artist,
        sourceApp: s.externalMedia.sourceApp,
        isBrowserCaptureActive: s.externalMedia.isBrowserCaptureActive,
        isBrowserCaptureMuted: s.externalMedia.isBrowserCaptureMuted,
        signalLevel: s.externalMedia.signalLevel,
        captureError: s.externalMedia.captureError,
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
    const validVinyl: string =
      prefs.lastVinylTrackId && this.state.vinylTracks.some((t) => t.id === prefs.lastVinylTrackId)
        ? prefs.lastVinylTrackId
        : DEFAULT_VINYL_CRATE[0].id;
    const validRadio: string =
      prefs.lastRadioStationId &&
      this.state.radioStations.some((s) => s.id === prefs.lastRadioStationId)
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

    // Hydrate cached Radio Browser HTTPS stations from localStorage so directory stays instant offline
    this.hydrateCachedRadioDirectory();

    const native = window.KlasikNativeAudio;

    if (native) {
      const extActive = this.safeCheckNativeActive();
      const meta = this.readNativeMetadata();
      const hasPerm = this.safeCheckNativePermission();
      this.setState({
        externalMedia: {
          ...this.state.externalMedia,
          ...meta,
          isActive: extActive,
          hasPermission: hasPerm,
          isNativeBridgeAvailable: true,
        },
      });
      if (extActive) {
        this.switchToExternalSilently();
      }
      // Throttled >= 2500ms fallback poll ONLY while in 'external' audio mode & app visible
      // (zero bridge calls when Audio Mode !== 'external' or inside rAF)
      if (this.nativePollTimerId === null) {
        this.nativePollTimerId = window.setInterval(() => {
          if (document.visibilityState !== 'visible') return;
          if (this.state.mode !== 'external') return;
          this.refreshExternalAudioStatus(false);
        }, 3000);
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

  private hydrateCachedRadioDirectory() {
    try {
      const raw = window.localStorage.getItem(RADIO_DIRECTORY_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as RadioStationItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const safe = parsed.filter(
          (s) =>
            s &&
            typeof s.streamUrl === 'string' &&
            s.streamUrl.startsWith('https://') &&
            isAllowedRadioCountry(s.countryCode)
        );
        if (safe.length > 0) {
          this.setState({ directoryStations: safe, directoryLoaded: true });
        }
      }
    } catch {
      // ignore storage errors
    }
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
      const native = window.KlasikNativeAudio;
      if (!native) return false;
      if (typeof native.hasNotificationListenerPermission === 'function') {
        return Boolean(native.hasNotificationListenerPermission());
      }
      return Boolean(native.hasNotificationAccess());
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
        ...this.state.externalMedia,
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
    if (this.state.mode !== 'external') return;
    this.refreshExternalAudioStatus(true);
  };

  public refreshExternalAudioStatus(triggerNativePush = true, force = false) {
    if (typeof window === 'undefined' || !window.KlasikNativeAudio) return;
    const now = Date.now();
    if (!force && now - this.lastNativePollMs < 2500) return;
    this.lastNativePollMs = now;
    if (triggerNativePush) {
      try {
        window.KlasikNativeAudio.refreshExternalMediaState?.();
      } catch {
        // ignore
      }
    }
    const extActive = this.safeCheckNativeActive();
    const meta = this.readNativeMetadata();
    const hasPerm = this.safeCheckNativePermission();
    this.setState({
      externalMedia: {
        ...this.state.externalMedia,
        ...meta,
        isActive: extActive,
        hasPermission: hasPerm,
        isNativeBridgeAvailable: true,
      },
    });
    if (extActive && this.state.mode !== 'external') {
      this.fadeOutMusicAndEnterExternal();
    }
  }

  private switchToExternalSilently() {
    this.clearRadioTimeout();
    this.radioPlaySeq++;
    soundEngine.setVinylCrackleEnabled(false);
    soundEngine.setLofiSynthActive(false);
    if (this.audioEl) {
      this.audioEl.pause();
    }
    if (this.radioAudioEl) {
      this.radioAudioEl.pause();
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
    this.radioPlaySeq++;
    soundEngine.setVinylCrackleEnabled(false);
    soundEngine.setLofiSynthActive(false);
    if (this.radioAudioEl) {
      this.radioAudioEl.pause();
    }
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
          ...this.state.externalMedia,
          ...meta,
          isActive: isActive || this.state.externalMedia.isBrowserCaptureActive || true,
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
    if (this.radioAudioEl) {
      this.radioAudioEl.pause();
      this.radioAudioEl.removeAttribute('src');
    }
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
    el.volume = this.getEffectiveMusicVolume();
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

  // Phase 0.3 & 3.1: Direct non-CORS HTML5 Audio + synchronous user-gesture play + 8500ms timeout + mirror fallback
  public playRadioStation(stationId: string) {
    const all = [...this.state.radioStations, ...this.state.directoryStations];
    const station = all.find((s) => s.id === stationId) || this.state.radioStations[0];
    if (!station) return;

    const radioEl = this.ensureRadioAudioElement();
    if (!radioEl) return;

    // Pause vinyl element cleanly so only live radio plays
    if (this.audioEl) {
      this.audioEl.pause();
    }

    this.clearRadioTimeout();
    const playSeq = ++this.radioPlaySeq;
    const mirrorUrls = resolveStationMirrorUrls(station);
    const primaryUrl = mirrorUrls[0] || station.streamUrl;
    this.radioMirrorQueue = mirrorUrls.slice(1);

    soundEngine.init();
    soundEngine.setVinylCrackleEnabled(false);
    soundEngine.setLofiSynthActive(false);
    soundEngine.playRadioStatic(0.32);

    this.setState({
      mode: 'radio',
      lastPlayedNonExternalMode: 'radio',
      currentRadioId: station.id,
      isLoadingStream: true,
      isPlaying: false,
      streamError: null,
    });

    // Synchronous user-gesture playback BEFORE any awaits so mobile WebViews / Chrome never reject autoplay!
    radioEl.pause();
    radioEl.loop = false;
    radioEl.volume = this.getEffectiveMusicVolume();
    radioEl.src = primaryUrl;
    const playPromise = radioEl.play();

    // 9000ms connection timeout for mobile data buffering — fails over to backup mirror if available!
    const armTimeout = () => {
      this.clearRadioTimeout();
      this.radioTimeoutId = window.setTimeout(() => {
        if (this.radioPlaySeq !== playSeq) return;
        if (this.state.mode === 'radio' && this.state.isLoadingStream) {
          const nextMirror = this.radioMirrorQueue.shift();
          if (nextMirror) {
            this.setState({
              isLoadingStream: true,
              streamError: 'Station Stream Offline — Trying Backup...',
            });
            radioEl.pause();
            radioEl.src = nextMirror;
            radioEl.load();
            radioEl.play().catch(() => {});
            armTimeout();
            return;
          }
          radioEl.pause();
          this.setState({
            isLoadingStream: false,
            isPlaying: false,
            streamError: 'Station Stream Offline — Tap Retry or try Cafe Chill',
          });
        }
      }, 9000);
    };
    armTimeout();

    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          if (this.radioPlaySeq !== playSeq) return;
          this.clearRadioTimeout();
          this.setState({
            isLoadingStream: false,
            isPlaying: true,
            streamError: null,
          });
        })
        .catch(() => {
          // Error event handler tries backupUrls or timeout surfaces fallback cleanly
        });
    }
  }

  public retryCurrentRadioStation() {
    this.playRadioStation(this.state.currentRadioId);
  }

  public fallbackToCafeChillRadio() {
    this.playRadioStation('us-litt-lofi-jazz');
  }

  public setRadioCountryFilter(filter: RadioCountryFilter) {
    this.setState({ radioCountryFilter: filter });
  }

  // Phase 5 Layer 2: Multi-mirror Radio Browser API strictly restricted to PH & US HTTPS MP3/AAC streams
  public async fetchPhilippineStations(
    query = '',
    countryFilter: RadioCountryFilter = this.state.radioCountryFilter
  ): Promise<RadioStationItem[]> {
    if (typeof fetch === 'undefined') return [];
    this.setState({ directoryLoading: true });
    const mirrors = [
      'https://de1.api.radio-browser.info',
      'https://nl1.api.radio-browser.info',
      'https://at1.api.radio-browser.info',
    ];
    const trimmed = query.trim();
    const nameParam = trimmed ? `&name=${encodeURIComponent(trimmed)}` : '';
    const countryCodes: Array<'PH' | 'US'> =
      countryFilter === 'PH' ? ['PH'] : countryFilter === 'US' ? ['US'] : ['PH', 'US'];

    for (const host of mirrors) {
      try {
        const perCountryLimit = countryCodes.length > 1 ? 18 : 28;
        const responses = await Promise.all(
          countryCodes.map(async (cc) => {
            const url = `${host}/json/stations/search?limit=${perCountryLimit}&order=clickcount&reverse=true&hidebroken=true&lastcheckok=1&countrycode=${cc}${nameParam}`;
            const controller = new AbortController();
            const abortTimer = window.setTimeout(() => controller.abort(), 6000);
            try {
              const res = await fetch(url, { signal: controller.signal });
              if (!res.ok) return [] as RadioBrowserRawStation[];
              const json = (await res.json()) as RadioBrowserRawStation[];
              return Array.isArray(json) ? json : [];
            } finally {
              window.clearTimeout(abortTimer);
            }
          })
        );
        const mergedRaw = responses.flat();
        const verified = filterVerifiedRadioStations(mergedRaw);
        if (verified.length > 0 || host === mirrors[mirrors.length - 1]) {
          if (verified.length > 0) {
            try {
              window.localStorage.setItem(
                RADIO_DIRECTORY_CACHE_KEY,
                JSON.stringify(verified.slice(0, 28))
              );
            } catch {
              // ignore quota errors
            }
          }
          this.setState({
            directoryStations: verified,
            directoryLoading: false,
            directoryLoaded: true,
          });
          return verified;
        }
      } catch {
        // Try next mirror
      }
    }

    this.setState({ directoryLoading: false, directoryLoaded: true });
    return [];
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
    this.radioPlaySeq++;
    if (this.audioEl) {
      this.audioEl.pause();
    }
    if (this.radioAudioEl) {
      this.radioAudioEl.pause();
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
    this.state = { ...this.state, musicVolume: clamped };
    const effVol = this.getEffectiveMusicVolume();
    if (this.audioEl) {
      this.audioEl.volume = effVol;
    }
    if (this.radioAudioEl) {
      this.radioAudioEl.volume = effVol;
    }
    this.emit();
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

  /**
   * Starts Browser Tab / System Audio Capture on Web so players can detect background music
   * playing in another tab (YouTube Music, Spotify Web, SoundCloud, etc.), display its title
   * on the Audio Deck & 3D Hologram, watch real-time audio levels, and mute/pause cleanly.
   */
  public async startBrowserAudioCapture(): Promise<boolean> {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getDisplayMedia !== 'function'
    ) {
      this.setState({
        externalMedia: {
          ...this.state.externalMedia,
          captureError:
            'Tab audio capture is not supported in this browser — enter your track title manually below.',
        },
      });
      return false;
    }

    this.stopBrowserAudioCapture(false);

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      const rawLabel = (audioTrack?.label || videoTrack?.label || '').trim();
      // Immediately release video track so no screen capture stays open after reading tab label
      stream.getVideoTracks().forEach((vt) => vt.stop());

      if (!audioTrack) {
        this.setState({
          externalMedia: {
            ...this.state.externalMedia,
            isBrowserCaptureActive: false,
            captureError:
              'No audio track shared — check "Share tab audio" in the browser picker.',
          },
        });
        return false;
      }

      const parsed = parseCapturedTabTitle(rawLabel);
      this.captureStream = stream;

      const AudioCtxCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxCtor) {
        const ctx = new AudioCtxCtor();
        const src = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;
        src.connect(analyser);
        // Intentionally do NOT connect to ctx.destination so the captured tab never double-plays/echoes
        this.captureAudioCtx = ctx;
        this.captureAnalyser = analyser;
        this.captureFreqBuf = new Uint8Array(analyser.frequencyBinCount);

        this.captureMeterTimerId = window.setInterval(() => {
          if (!this.captureAnalyser || !this.captureFreqBuf) return;
          if (this.state.externalMedia.isBrowserCaptureMuted) {
            if (this.state.externalMedia.signalLevel !== 0) {
              this.setState({
                externalMedia: { ...this.state.externalMedia, signalLevel: 0 },
              });
            }
            return;
          }
          this.captureAnalyser.getByteTimeDomainData(this.captureFreqBuf);
          let sumSq = 0;
          for (let i = 0; i < this.captureFreqBuf.length; i++) {
            const norm = (this.captureFreqBuf[i] - 128) / 128;
            sumSq += norm * norm;
          }
          const rms = Math.sqrt(sumSq / this.captureFreqBuf.length);
          const level = Math.min(1, Number((rms * 3.8).toFixed(2)));
          const detected = level > 0.03;
          if (
            Math.abs(level - this.state.externalMedia.signalLevel) >= 0.04 ||
            detected !== this.state.externalMedia.isActive
          ) {
            this.setState({
              externalMedia: {
                ...this.state.externalMedia,
                signalLevel: level,
                isActive: detected || this.state.externalMedia.isBrowserCaptureActive,
              },
            });
          }
        }, 220);
      }

      audioTrack.addEventListener('ended', () => {
        this.stopBrowserAudioCapture(true);
      });

      this.switchToExternalSilently();
      this.setState({
        mode: 'external',
        externalMedia: {
          ...this.state.externalMedia,
          isActive: true,
          title: parsed.title,
          artist: parsed.artist,
          sourceApp: parsed.sourceApp,
          isBrowserCaptureActive: true,
          isBrowserCaptureMuted: false,
          signalLevel: 0.25,
          captureError: null,
        },
      });
      this.syncBrowserMediaSession(parsed.title, parsed.artist, 'playing');
      return true;
    } catch {
      this.setState({
        externalMedia: {
          ...this.state.externalMedia,
          isBrowserCaptureActive: false,
          captureError:
            'Audio capture canceled. Pick a music tab with "Share tab audio" enabled, or enter your song below.',
        },
      });
      return false;
    }
  }

  public stopBrowserAudioCapture(notify = true) {
    if (this.captureMeterTimerId !== null) {
      window.clearInterval(this.captureMeterTimerId);
      this.captureMeterTimerId = null;
    }
    if (this.captureStream) {
      this.captureStream.getTracks().forEach((t) => t.stop());
      this.captureStream = null;
    }
    if (this.captureAudioCtx) {
      this.captureAudioCtx.close().catch(() => {});
      this.captureAudioCtx = null;
    }
    this.captureAnalyser = null;
    this.captureFreqBuf = null;
    if (notify) {
      this.setState({
        externalMedia: {
          ...this.state.externalMedia,
          isBrowserCaptureActive: false,
          isBrowserCaptureMuted: false,
          signalLevel: 0,
        },
      });
    }
  }

  /** Allows players on web/desktop to set or update the Now-Playing song shown on the Audio Deck & 3D Hologram. */
  public setExternalManualTrack(title: string, artist?: string, sourceApp?: string) {
    const cleanTitle = title.trim().slice(0, 64);
    if (!cleanTitle) return;
    const cleanArtist = (artist || '').trim().slice(0, 64) || 'Now Playing';
    const cleanSource = (sourceApp || '').trim().slice(0, 32) || this.state.externalMedia.sourceApp || 'External Music';
    this.setState({
      externalMedia: {
        ...this.state.externalMedia,
        isActive: true,
        isBrowserCaptureMuted: false,
        title: cleanTitle,
        artist: cleanArtist,
        sourceApp: cleanSource,
        captureError: null,
      },
    });
    this.syncBrowserMediaSession(cleanTitle, cleanArtist, 'playing');
  }

  private syncBrowserMediaSession(
    title: string,
    artist: string,
    playbackState: 'playing' | 'paused'
  ) {
    try {
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        if (typeof MediaMetadata !== 'undefined') {
          navigator.mediaSession.metadata = new MediaMetadata({
            title,
            artist,
            album: 'Klasik Cafe External Audio',
          });
        }
        navigator.mediaSession.playbackState = playbackState;
      }
    } catch {
      // ignore on unsupported browsers
    }
  }

  public sendExternalMediaCommand(action: 'play_pause' | 'next' | 'prev') {
    const native = typeof window !== 'undefined' ? window.KlasikNativeAudio : undefined;
    if (native && typeof native.sendMediaKey === 'function') {
      try {
        native.sendMediaKey(action);
      } catch {
        // ignore if native bridge throws
      }
      if (action === 'play_pause') {
        const nextActive = !this.state.externalMedia.isActive;
        this.setState({
          externalMedia: { ...this.state.externalMedia, isActive: nextActive },
        });
      }
      window.setTimeout(() => this.refreshExternalAudioStatus(true, true), 320);
      return;
    }

    // Web / Browser fallback: toggle live capture mute/pause state & Media Session playbackState
    if (action === 'play_pause') {
      const currentlyPlaying =
        this.state.externalMedia.isActive && !this.state.externalMedia.isBrowserCaptureMuted;
      const nextMuted = currentlyPlaying;
      if (this.captureStream) {
        this.captureStream.getAudioTracks().forEach((tr) => {
          tr.enabled = !nextMuted;
        });
      }
      this.setState({
        externalMedia: {
          ...this.state.externalMedia,
          isActive: !nextMuted,
          isBrowserCaptureMuted: nextMuted,
          signalLevel: nextMuted ? 0 : this.state.externalMedia.signalLevel,
        },
      });
      this.syncBrowserMediaSession(
        this.state.externalMedia.title,
        this.state.externalMedia.artist,
        nextMuted ? 'paused' : 'playing'
      );
    }
  }

  public openNotificationAccessSettings() {
    try {
      const native = window.KlasikNativeAudio;
      if (native?.openNotificationListenerSettings) {
        native.openNotificationListenerSettings();
      } else {
        native?.openNotificationAccessSettings();
      }
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
    return this.fetchPhilippineStations(query, this.state.radioCountryFilter);
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
    this.stopBrowserAudioCapture(false);
    this.clearRadioTimeout();
    if (this.fadeTimerId !== null) {
      window.clearInterval(this.fadeTimerId);
      this.fadeTimerId = null;
    }
    if (this.nativePollTimerId !== null) {
      window.clearInterval(this.nativePollTimerId);
      this.nativePollTimerId = null;
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
    if (this.radioAudioEl) {
      this.radioAudioEl.pause();
      this.radioAudioEl.removeAttribute('src');
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
