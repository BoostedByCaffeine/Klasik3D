// Platform-Aware Spotify Integration & 3D Vinyl Turntable Controller
// - Live Web & PWA Versions: Connect via Spotify Web (Embed Deck + OAuth 2.0 PKCE Web Playback SDK)
// - Android APK Version: Redirects to the native Spotify app on the user's phone (spotify: / intent://)
//   so the user can play music from their phone's Spotify while the game runs its Internal Vinyl Music Player (100% Offline Ready).

import { soundEngine } from './sound';
import { pwaManager } from '../pwa/pwaManager';

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
    embedUrl:
      'https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator&theme=0',
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
    embedUrl:
      'https://open.spotify.com/embed/playlist/37i9dQZF1DXbITWG1ZJKYt?utm_source=generator&theme=0',
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
    embedUrl:
      'https://open.spotify.com/embed/playlist/37i9dQZF1DX4E3UdUs7fUx?utm_source=generator&theme=0',
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
  sdkDeviceReady?: boolean;
  internalSynthEnabled: boolean;
  phoneSpotifySynced: boolean;
}

interface SpotifyWebPlayerInstance {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  togglePlay: () => Promise<void>;
  resume: () => Promise<void>;
  pause: () => Promise<void>;
  nextTrack: () => Promise<void>;
  addListener: (event: string, cb: (payload: any) => void) => void;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyWebPlayerInstance;
    };
  }
}

const STORAGE_KEY = 'klasik3d_spotify_vinyl_v1';

export function parseSpotifyInputToEmbed(
  input: string
): { uri: string; embedUrl: string; type: string; id: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    const [, type, id] = urlMatch;
    return {
      uri: `spotify:${type}:${id}`,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
      type,
      id,
    };
  }

  const uriMatch = trimmed.match(/^spotify:(playlist|album|track):([a-zA-Z0-9]+)$/);
  if (uriMatch) {
    const [, type, id] = uriMatch;
    return {
      uri: trimmed,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
      type,
      id,
    };
  }

  return null;
}

// Builds deep link & Android intent URLs to open the native Spotify app installed on an Android phone
export function buildNativePhoneSpotifyLinks(spotifyUri: string): {
  spotifyDeepLink: string;
  androidIntentUrl: string;
  webFallbackUrl: string;
} {
  const parsed = parseSpotifyInputToEmbed(spotifyUri);
  const type = parsed?.type || 'playlist';
  const id = parsed?.id || '0vvXsWCC9xrXsKd4FyS8kM';
  const spotifyDeepLink = `spotify:${type}:${id}`;
  const webFallbackUrl = `https://open.spotify.com/${type}/${id}`;
  const androidIntentUrl = `intent://${type}/${id}#Intent;scheme=spotify;package=com.spotify.music;S.browser_fallback_url=${encodeURIComponent(
    webFallbackUrl
  )};end`;

  return {
    spotifyDeepLink,
    androidIntentUrl,
    webFallbackUrl,
  };
}

class SpotifyVinylManager {
  private state: SpotifyVinylState;
  private listeners: Set<(state: SpotifyVinylState) => void> = new Set();
  private sdkLoaded = false;
  private webPlayer: SpotifyWebPlayerInstance | null = null;
  private sdkDeviceId: string | null = null;

  constructor() {
    const saved = this.loadSaved();
    const initialTrack = saved?.currentTrack || COZY_VINYL_PRESETS[0];
    this.state = {
      isPlaying: true,
      rpm: initialTrack.rpm || 33,
      currentTrack: initialTrack,
      customUriInput: saved?.customUriInput || '',
      mode: saved?.mode || 'bridge',
      clientId: saved?.clientId || (import.meta.env?.VITE_SPOTIFY_CLIENT_ID as string) || '',
      accessToken: saved?.accessToken || null,
      spotifyUserDisplayName: saved?.spotifyUserDisplayName || null,
      liveAlbumArtUrl: null,
      showMiniEmbed: false,
      sdkDeviceReady: false,
      internalSynthEnabled: saved?.internalSynthEnabled ?? true,
      phoneSpotifySynced: saved?.phoneSpotifySynced ?? false,
    };

    soundEngine.setVinylTrackProfile(this.state.currentTrack.id, this.state.rpm);

    if (typeof window !== 'undefined') {
      const pwaStatus = pwaManager.getStatus();
      // Only initialize Spotify Web PKCE / Web SDK on Live Web & PWA when online (never in APK mode)
      if (pwaStatus.appVersion !== 'apk' && !pwaStatus.isOffline) {
        this.handlePkceRedirectCallback();
        if (this.state.accessToken) {
          this.initWebPlaybackSdk(this.state.accessToken);
        }
      }
    }
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
          internalSynthEnabled: this.state.internalSynthEnabled,
          phoneSpotifySynced: this.state.phoneSpotifySynced,
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

  // Launches the native Spotify app on the user's Android phone (for APK version)
  // and syncs the internal vinyl music player to the chosen track
  public redirectToPhoneSpotifyApp(customTitle?: string): string {
    const links = buildNativePhoneSpotifyLinks(this.state.currentTrack.spotifyUri);
    this.state.phoneSpotifySynced = true;
    this.state.isPlaying = true;
    if (customTitle && customTitle.trim()) {
      this.state.currentTrack = {
        ...this.state.currentTrack,
        title: customTitle.trim(),
        coverText: customTitle.trim().slice(0, 18).toUpperCase(),
      };
    }

    soundEngine.playVinylNeedleDrop(true);
    soundEngine.setVinylTrackProfile(this.state.currentTrack.id, this.state.rpm);
    soundEngine.setSpotifyDucking(!this.state.internalSynthEnabled);
    soundEngine.setLofiSynthActive(this.state.internalSynthEnabled);
    this.notify();

    if (typeof window !== 'undefined') {
      try {
        const a = document.createElement('a');
        a.href = links.spotifyDeepLink;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {
        // Fallback handled by UI link
      }
    }

    return links.spotifyDeepLink;
  }

  public setInternalSynthEnabled(enabled: boolean) {
    this.state.internalSynthEnabled = enabled;
    soundEngine.setSpotifyDucking(!enabled);
    if (this.state.isPlaying) {
      soundEngine.setLofiSynthActive(enabled);
    }
    this.notify();
  }

  public initWebPlaybackSdk(token: string) {
    if (typeof window === 'undefined' || !token) return;
    const pwaStatus = pwaManager.getStatus();
    if (pwaStatus.appVersion === 'apk' || pwaStatus.isOffline) return;

    this.state.accessToken = token;

    const createPlayer = () => {
      if (!window.Spotify || this.webPlayer) return;
      const player = new window.Spotify.Player({
        name: 'Klasik 3D Vinyl Turntable',
        getOAuthToken: (cb) => cb(this.state.accessToken || token),
        volume: 0.75,
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        this.sdkDeviceId = device_id;
        this.state.sdkDeviceReady = true;
        soundEngine.setSpotifyDucking(true);
        this.notify();

        fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.state.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ device_ids: [device_id], play: false }),
        }).catch(() => {});
      });

      player.addListener('player_state_changed', (sdkState: any) => {
        if (!sdkState) return;
        const current = sdkState.track_window?.current_track;
        if (current) {
          this.state.isPlaying = !sdkState.paused;
          this.state.liveAlbumArtUrl = current.album?.images?.[0]?.url || null;
          this.state.currentTrack = {
            ...this.state.currentTrack,
            title: current.name || this.state.currentTrack.title,
            artist:
              current.artists?.map((a: { name: string }) => a.name).join(', ') ||
              this.state.currentTrack.artist,
            coverText: (current.name || 'SPOTIFY LP').slice(0, 18).toUpperCase(),
          };
          this.notify();
        }
      });

      player.connect();
      this.webPlayer = player;
    };

    if (window.Spotify) {
      createPlayer();
    } else if (!this.sdkLoaded) {
      this.sdkLoaded = true;
      window.onSpotifyWebPlaybackSDKReady = () => {
        createPlayer();
      };
      const sdkScript = document.createElement('script');
      sdkScript.src = 'https://sdk.scdn.co/spotify-player.js';
      sdkScript.async = true;
      document.body.appendChild(sdkScript);
    }
  }

  private async playUriOnSdk(spotifyUri: string) {
    if (!this.state.accessToken || !this.sdkDeviceId) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    try {
      const isTrack = spotifyUri.includes(':track:');
      const payload = isTrack ? { uris: [spotifyUri] } : { context_uri: spotifyUri };
      await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(this.sdkDeviceId)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.state.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
    } catch {
      // ignore network error
    }
  }

  public togglePlayPause(): boolean {
    this.state.isPlaying = !this.state.isPlaying;
    soundEngine.playVinylNeedleDrop(this.state.isPlaying);
    soundEngine.setVinylTrackProfile(this.state.currentTrack.id, this.state.rpm);
    if (this.webPlayer && this.state.sdkDeviceReady) {
      this.webPlayer.togglePlay().catch(() => {});
    } else {
      soundEngine.setLofiSynthActive(this.state.isPlaying && this.state.internalSynthEnabled);
    }
    this.notify();
    return this.state.isPlaying;
  }

  public setPlaying(playing: boolean) {
    if (this.state.isPlaying === playing) return;
    this.state.isPlaying = playing;
    soundEngine.playVinylNeedleDrop(playing);
    soundEngine.setVinylTrackProfile(this.state.currentTrack.id, this.state.rpm);
    if (this.webPlayer && this.state.sdkDeviceReady) {
      if (playing) {
        this.webPlayer.resume().catch(() => {});
      } else {
        this.webPlayer.pause().catch(() => {});
      }
    } else {
      soundEngine.setLofiSynthActive(playing && this.state.internalSynthEnabled);
    }
    this.notify();
  }

  public toggleRpm(): 33 | 45 {
    this.state.rpm = this.state.rpm === 33 ? 45 : 33;
    soundEngine.setVinylTrackProfile(this.state.currentTrack.id, this.state.rpm);
    soundEngine.playCeramicClink(this.state.rpm === 45 ? 1.2 : 0.95);
    if (this.state.isPlaying && this.state.internalSynthEnabled) {
      soundEngine.setLofiSynthActive(false);
      soundEngine.setLofiSynthActive(true);
    }
    this.notify();
    return this.state.rpm;
  }

  public nextTrack() {
    if (this.webPlayer && this.state.sdkDeviceReady) {
      this.webPlayer.nextTrack().catch(() => {});
    }
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
    soundEngine.setVinylTrackProfile(found.id, found.rpm);
    if (this.state.sdkDeviceReady && this.state.accessToken) {
      this.playUriOnSdk(found.spotifyUri);
    } else {
      soundEngine.setLofiSynthActive(this.state.internalSynthEnabled);
    }
    this.notify();
  }

  public applyCustomSpotifyLink(input: string): boolean {
    const parsed = parseSpotifyInputToEmbed(input);
    const isApk = pwaManager.getStatus().appVersion === 'apk';

    if (!parsed && !isApk) return false;

    const resolvedUri = parsed ? parsed.uri : `spotify:track:custom`;
    const resolvedEmbed = parsed
      ? parsed.embedUrl
      : COZY_VINYL_PRESETS[0].embedUrl;

    const customPreset: VinylTrackPreset = {
      id: `custom-${Date.now()}`,
      title: parsed ? 'Custom Spotify Vinyl Selection' : input.trim() || 'Phone Spotify Track',
      artist: parsed ? parsed.uri : 'Phone Spotify App + Internal Player',
      spotifyUri: resolvedUri,
      embedUrl: resolvedEmbed,
      sleeveColor: '#14532d',
      accentColor: '#22c55e',
      rpm: 33,
      coverText: (parsed ? 'SPOTIFY CUSTOM LP' : input.trim().slice(0, 18).toUpperCase()) || 'SPOTIFY LP',
    };

    this.state.customUriInput = input.trim();
    this.state.currentTrack = customPreset;
    this.state.isPlaying = true;
    this.state.showMiniEmbed = !isApk;
    soundEngine.playVinylNeedleDrop(true);
    soundEngine.setVinylTrackProfile(customPreset.id, customPreset.rpm);
    if (!isApk && this.state.sdkDeviceReady && this.state.accessToken) {
      this.playUriOnSdk(resolvedUri);
    } else if (isApk) {
      soundEngine.setLofiSynthActive(this.state.internalSynthEnabled);
    }
    this.notify();
    return true;
  }

  public setShowMiniEmbed(show: boolean) {
    const isApk = pwaManager.getStatus().appVersion === 'apk';
    this.state.showMiniEmbed = isApk ? false : show;
    soundEngine.setSpotifyDucking(this.state.showMiniEmbed || Boolean(this.state.sdkDeviceReady));
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

  public disconnectPkce() {
    this.state.accessToken = null;
    this.state.spotifyUserDisplayName = null;
    this.state.sdkDeviceReady = false;
    this.sdkDeviceId = null;
    if (this.webPlayer) {
      this.webPlayer.disconnect();
      this.webPlayer = null;
    }
    soundEngine.setSpotifyDucking(this.state.showMiniEmbed);
    this.notify();
  }

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
    const scope =
      'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private';
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('client_id', this.state.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('code_challenge', base64Digest);

    return authUrl.toString();
  }

  private async handlePkceRedirectCallback(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    const verifier = window.localStorage.getItem('klasik3d_spotify_pkce_verifier');
    if (!verifier || !this.state.clientId) return;

    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, redirectUri);

    try {
      const body = new URLSearchParams({
        client_id: this.state.clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });

      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!res.ok) return;
      const tokenData = await res.json();
      if (tokenData && tokenData.access_token) {
        this.state.accessToken = tokenData.access_token;
        this.state.mode = 'pkce';
        this.notify();
        this.initWebPlaybackSdk(tokenData.access_token);
        this.fetchNowPlayingFromToken();
      }
    } catch {
      // ignore network error
    }
  }

  public async fetchNowPlayingFromToken(): Promise<boolean> {
    if (!this.state.accessToken) return false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
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
          artist:
            data.item.artists?.map((a: { name: string }) => a.name).join(', ') || 'Spotify Artist',
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
