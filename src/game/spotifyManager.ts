// Dual-Mode Spotify Integration & 3D Vinyl Turntable Controller
// Mode A: Zero-Config Spotify URI / Playlist Bridge + Procedural Lo-Fi Vinyl Synth
// Mode B: Full Spotify OAuth 2.0 PKCE + Web API Now-Playing & Album Art Sync

import { soundEngine } from './sound';

export interface VinylTrackPreset {
  id: string;
  title: string;
  artist: string;
  spotifyUri: string;
  embedUrl: string;
  sleeveColor: string;
  accentColor: string;
  rpm: 33 | 45;
  coverText: string;
}

export const COZY_VINYL_PRESETS: VinylTrackPreset[] = [
  {
    id: 'garage-lofi-morning',
    title: 'Garage Garden Morning Roast',
    artist: 'BoostedByCaffeine Sessions',
    spotifyUri: 'spotify:playlist:0vvXsWCC9xrXsKd4FyS8kM',
    embedUrl: 'https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator&theme=0',
    sleeveColor: '#242B2E',
    accentColor: '#f59e0b',
    rpm: 33,
    coverText: 'MORNING ROAST 33 RPM',
  },
  {
    id: 'rainy-espresso-jazz',
    title: 'Rainy Window Espresso Jazz',
    artist: 'Tokyo & Manila Roasters',
    spotifyUri: 'spotify:playlist:37i9dQZF1DXbITWG1ZJKYt',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXbITWG1ZJKYt?utm_source=generator&theme=0',
    sleeveColor: '#1e293b',
    accentColor: '#38bdf8',
    rpm: 33,
    coverText: 'RAINY JAZZ QUARTET',
  },
  {
    id: 'golden-hour-acoustic',
    title: 'Golden Hour Monstera Acoustic',
    artist: 'Klasik Vinyl Collective',
    spotifyUri: 'spotify:playlist:37i9dQZF1DX4E3UdUs7fUx',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4E3UdUs7fUx?utm_source=generator&theme=0',
    sleeveColor: '#451a03',
    accentColor: '#fbbf24',
    rpm: 45,
    coverText: 'GOLDEN HOUR 45 RPM',
  },
];

export interface SpotifyVinylState {
  isPlaying: boolean;
  rpm: 33 | 45;
  currentTrack: VinylTrackPreset;
  customUriInput: string;
  mode: 'bridge' | 'pkce';
  clientId: string;
  accessToken: string | null;
  spotifyUserDisplayName: string | null;
  liveAlbumArtUrl: string | null;
  showMiniEmbed: boolean;
}

const STORAGE_KEY = 'klasik3d_spotify_vinyl_v1';

export function parseSpotifyInputToEmbed(input: string): { uri: string; embedUrl: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match open.spotify.com/{type}/{id}
  const urlMatch = trimmed.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    const [, type, id] = urlMatch;
    return {
      uri: `spotify:${type}:${id}`,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
    };
  }

  // Match spotify:{type}:{id}
  const uriMatch = trimmed.match(/^spotify:(playlist|album|track):([a-zA-Z0-9]+)$/);
  if (uriMatch) {
    const [, type, id] = uriMatch;
    return {
      uri: trimmed,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
    };
  }

  return null;
}

class SpotifyVinylManager {
  private state: SpotifyVinylState;
  private listeners: Set<(state: SpotifyVinylState) => void> = new Set();

  constructor() {
    const saved = this.loadSaved();
    this.state = {
      isPlaying: true,
      rpm: 33,
      currentTrack: saved?.currentTrack || COZY_VINYL_PRESETS[0],
      customUriInput: saved?.customUriInput || '',
      mode: saved?.mode || 'bridge',
      clientId: saved?.clientId || (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string) || '',
      accessToken: saved?.accessToken || null,
      spotifyUserDisplayName: saved?.spotifyUserDisplayName || null,
      liveAlbumArtUrl: null,
      showMiniEmbed: false,
    };
  }

  private loadSaved(): Partial<SpotifyVinylState> | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentTrack: this.state.currentTrack,
          customUriInput: this.state.customUriInput,
          mode: this.state.mode,
          clientId: this.state.clientId,
          accessToken: this.state.accessToken,
          spotifyUserDisplayName: this.state.spotifyUserDisplayName,
        })
      );
    } catch {
      // ignore storage errors
    }
  }

  public getState(): SpotifyVinylState {
    return this.state;
  }

  public subscribe(cb: (state: SpotifyVinylState) => void): () => void {
    this.listeners.add(cb);
    cb(this.state);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.persist();
    this.listeners.forEach((cb) => cb({ ...this.state }));
  }

  public togglePlayPause(): boolean {
    this.state.isPlaying = !this.state.isPlaying;
    soundEngine.playVinylNeedleDrop(this.state.isPlaying);
    soundEngine.setLofiSynthActive(this.state.isPlaying && !this.state.showMiniEmbed);
    this.notify();
    return this.state.isPlaying;
  }

  public setPlaying(playing: boolean) {
    if (this.state.isPlaying === playing) return;
    this.state.isPlaying = playing;
    soundEngine.playVinylNeedleDrop(playing);
    soundEngine.setLofiSynthActive(playing && !this.state.showMiniEmbed);
    this.notify();
  }

  public toggleRpm(): 33 | 45 {
    this.state.rpm = this.state.rpm === 33 ? 45 : 33;
    soundEngine.playCeramicClink(this.state.rpm === 45 ? 1.2 : 0.95);
    this.notify();
    return this.state.rpm;
  }

  public nextTrack() {
    const idx = COZY_VINYL_PRESETS.findIndex((p) => p.id === this.state.currentTrack.id);
    const nextIdx = (idx + 1) % COZY_VINYL_PRESETS.length;
    this.selectPreset(COZY_VINYL_PRESETS[nextIdx].id);
  }

  public selectPreset(presetId: string) {
    const found = COZY_VINYL_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    this.state.currentTrack = found;
    this.state.rpm = found.rpm;
    this.state.isPlaying = true;
    soundEngine.playVinylNeedleDrop(true);
    soundEngine.setLofiSynthActive(!this.state.showMiniEmbed);
    this.notify();
  }

  public applyCustomSpotifyLink(input: string): boolean {
    const parsed = parseSpotifyInputToEmbed(input);
    if (!parsed) return false;

    const customPreset: VinylTrackPreset = {
      id: `custom-${Date.now()}`,
      title: 'Custom Spotify Vinyl Selection',
      artist: parsed.uri,
      spotifyUri: parsed.uri,
      embedUrl: parsed.embedUrl,
      sleeveColor: '#14532d',
      accentColor: '#22c55e',
      rpm: 33,
      coverText: 'SPOTIFY CUSTOM LP',
    };

    this.state.customUriInput = input.trim();
    this.state.currentTrack = customPreset;
    this.state.isPlaying = true;
    this.state.showMiniEmbed = true;
    soundEngine.setSpotifyDucking(true);
    soundEngine.playVinylNeedleDrop(true);
    this.notify();
    return true;
  }

  public setShowMiniEmbed(show: boolean) {
    this.state.showMiniEmbed = show;
    soundEngine.setSpotifyDucking(show);
    soundEngine.setLofiSynthActive(this.state.isPlaying && !show);
    this.notify();
  }

  public setMode(mode: 'bridge' | 'pkce') {
    this.state.mode = mode;
    this.notify();
  }

  public setClientId(clientId: string) {
    this.state.clientId = clientId.trim();
    this.notify();
  }

  // OAuth 2.0 PKCE Helper for personal Spotify account connection
  public async startPkceAuth(): Promise<string | null> {
    if (!this.state.clientId) return null;
    const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    window.localStorage.setItem('klasik3d_spotify_pkce_verifier', verifier);

    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const scope = 'user-read-currently-playing user-read-playback-state streaming';
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('client_id', this.state.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('code_challenge', base64Digest);

    return authUrl.toString();
  }

  public async fetchNowPlayingFromToken(): Promise<boolean> {
    if (!this.state.accessToken) return false;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${this.state.accessToken}` },
      });
      if (!res.ok || res.status === 204) return false;
      const data = await res.json();
      if (data && data.item) {
        const albumImg = data.item.album?.images?.[0]?.url || null;
        this.state.liveAlbumArtUrl = albumImg;
        this.state.currentTrack = {
          id: data.item.id || 'live-spotify',
          title: data.item.name || 'Spotify Live Track',
          artist: data.item.artists?.map((a: { name: string }) => a.name).join(', ') || 'Spotify Artist',
          spotifyUri: data.item.uri || 'spotify:track:live',
          embedUrl: this.state.currentTrack.embedUrl,
          sleeveColor: '#1db954',
          accentColor: '#ffffff',
          rpm: 33,
          coverText: (data.item.name || 'LIVE LP').slice(0, 18).toUpperCase(),
        };
        this.notify();
        return true;
      }
    } catch {
      // ignore network error
    }
    return false;
  }
}

export const spotifyManager = new SpotifyVinylManager();
