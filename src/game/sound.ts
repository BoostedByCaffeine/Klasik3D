// Offline-Ready Realistic Multi-Layered Audio Sample, Granular Synthesis Weather Engine
// & Internal Vinyl Music Synthesizer for Klasik 3D
// Pre-bakes high-definition PCM AudioBuffers (100% offline PWA & Android APK compatible)
// for Granular Weather Textures (Rhythmic Raindrops on Roof for 'rainy', Distant Birds & Wind Chimes for 'morning'/'golden'),
// Customer Sounds, Step-by-Step Barista Brewing, and Multi-Preset Internal Vinyl Music.

import { WeatherMode } from './rules';

export type GranularGrainType =
  | 'roof_raindrop'
  | 'skylight_patter'
  | 'gutter_drip'
  | 'distant_bird'
  | 'wind_chime';

export interface GranularWeatherParams {
  grainType: GranularGrainType;
  intervalMs: number;
  durationSec: number;
  carrierFreqHz: number;
  filterFreqHz: number;
  filterQ: number;
  pan: number;
  gain: number;
  pitchEndRatio: number;
}

// Pure deterministic helper for unit-testing and driving real-time granular weather synthesis
export function computeGranularWeatherParams(
  weather: WeatherMode,
  stepIndex: number
): GranularWeatherParams {
  const idx = Math.abs(Math.floor(stepIndex));
  // Golden-ratio pseudo-random sequence in [0, 1) for organic non-repeating grain placement
  const hash1 = (idx * 0.618033988749895) % 1;
  const hash2 = (idx * 0.381966011250105 + 0.23) % 1;
  const pan = Number(((hash1 * 2 - 1) * 0.78).toFixed(3));

  if (weather === 'rainy') {
    // Polyrhythmic 8-step roof raindrop pattern (rhythmic drops on corrugated polycarbonate/timber pergola roof)
    const rhythmPattern = [85, 115, 70, 145, 90, 110, 65, 160];
    const baseInterval = rhythmPattern[idx % rhythmPattern.length];
    const isGutterDrip = idx % 7 === 0;
    const isSkylight = idx % 3 === 1;

    if (isGutterDrip) {
      return {
        grainType: 'gutter_drip',
        intervalMs: baseInterval + Math.round(hash2 * 35),
        durationSec: Number((0.065 + hash1 * 0.035).toFixed(3)),
        carrierFreqHz: Math.round(620 + hash2 * 540),
        filterFreqHz: Math.round(980 + hash1 * 620),
        filterQ: 4.2,
        pan,
        gain: 0.022,
        pitchEndRatio: 1.42, // Classic rising water-drop bubble inflection
      };
    }

    if (isSkylight) {
      return {
        grainType: 'skylight_patter',
        intervalMs: baseInterval + Math.round(hash1 * 25),
        durationSec: Number((0.028 + hash2 * 0.024).toFixed(3)),
        carrierFreqHz: Math.round(880 + hash1 * 640),
        filterFreqHz: Math.round(1350 + hash2 * 700),
        filterQ: 2.6,
        pan,
        gain: 0.016,
        pitchEndRatio: 0.82,
      };
    }

    return {
      grainType: 'roof_raindrop',
      intervalMs: baseInterval + Math.round(hash2 * 20),
      durationSec: Number((0.038 + hash1 * 0.032).toFixed(3)),
      carrierFreqHz: Math.round(310 + hash2 * 290),
      filterFreqHz: Math.round(480 + hash1 * 420),
      filterQ: 3.1,
      pan,
      gain: 0.024,
      pitchEndRatio: 0.68, // Woody/metallic roof thud decay
    };
  }

  // Sunny modes ('morning' or 'golden'): Distant garden birds & pentatonic bamboo/brass wind chimes
  const pentatonicChimes = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0]; // C6, D6, E6, G6, A6, C7
  const isBirdGrain = idx % 3 === 0;

  if (isBirdGrain) {
    const baseBirdFreq = (weather === 'morning' ? 2450 : 2180) + Math.round(hash1 * 880);
    return {
      grainType: 'distant_bird',
      intervalMs: (weather === 'morning' ? 260 : 320) + Math.round(hash2 * 220),
      durationSec: Number((0.075 + hash1 * 0.045).toFixed(3)),
      carrierFreqHz: baseBirdFreq,
      filterFreqHz: Math.round(baseBirdFreq * 1.15),
      filterQ: 3.8,
      pan,
      gain: 0.014,
      pitchEndRatio: hash2 > 0.45 ? 1.24 : 0.88,
    };
  }

  const chimeFreq = pentatonicChimes[idx % pentatonicChimes.length];
  return {
    grainType: 'wind_chime',
    intervalMs: (weather === 'golden' ? 210 : 250) + Math.round(hash1 * 180),
    durationSec: Number((0.22 + hash2 * 0.16).toFixed(3)),
    carrierFreqHz: chimeFreq,
    filterFreqHz: Math.round(chimeFreq * 1.35),
    filterQ: 5.5,
    pan,
    gain: 0.013,
    pitchEndRatio: 0.995,
  };
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private isSpotifyDucking = false;
  private currentWeather: WeatherMode = 'morning';
  private activePresetId = 'garage-lofi-morning';
  private activeRpm: 33 | 45 = 33;

  // Pre-baked offline PCM sample buffers
  private buffersPrepared = false;
  private beanCrunchBuffer: AudioBuffer | null = null;
  private waterPourBuffer: AudioBuffer | null = null;
  private steamNoiseBuffer: AudioBuffer | null = null;
  private rainLoopBuffer: AudioBuffer | null = null;
  private cafeMurmurBuffer: AudioBuffer | null = null;

  // Pre-baked Hann-windowed micro-grain buffers for Granular Weather Synthesis
  private roofDropGrainBuffer: AudioBuffer | null = null;
  private chimeShimmerGrainBuffer: AudioBuffer | null = null;

  // Active environmental & granular synthesis loops
  private rainGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;
  private granularMasterGain: GainNode | null = null;
  private granularTimer: number | null = null;
  private granularStepIndex = 0;
  private granularActive = false;

  private lofiInterval: number | null = null;
  private chordIndex = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.buffersPrepared) {
      this.prepareOfflineSampleLibrary(this.ctx);
    }
    return this.ctx;
  }

  // Generates realistic multi-layered PCM AudioBuffers & Hann-windowed Granular Synthesis buffers in memory
  private prepareOfflineSampleLibrary(ctx: AudioContext) {
    this.buffersPrepared = true;
    const sr = ctx.sampleRate;

    // 1. Roasted Coffee Bean Crunch Sample Buffer (1.2s of granular impulse crackles)
    this.beanCrunchBuffer = ctx.createBuffer(1, Math.floor(sr * 1.2), sr);
    const crunchData = this.beanCrunchBuffer.getChannelData(0);
    for (let i = 0; i < crunchData.length; i++) {
      const grain = Math.random() < 0.045 ? (Math.random() * 2 - 1) * 0.95 : 0;
      const prev = i > 0 ? crunchData[i - 1] * 0.72 : 0;
      crunchData[i] = grain + prev + (Math.random() * 2 - 1) * 0.15;
    }

    // 2. Hot Water / Espresso / Tea Pouring Bubbling Buffer (1.5s)
    this.waterPourBuffer = ctx.createBuffer(1, Math.floor(sr * 1.5), sr);
    const pourData = this.waterPourBuffer.getChannelData(0);
    let bubblePhase = 0;
    let bubbleFreq = 420;
    for (let i = 0; i < pourData.length; i++) {
      if (Math.random() < 0.008) {
        bubbleFreq = 320 + Math.random() * 680;
      }
      bubbleFreq += 0.12;
      bubblePhase += (2 * Math.PI * bubbleFreq) / sr;
      const droplet = Math.sin(bubblePhase) * 0.35;
      const pinkNoise = (Math.random() * 2 - 1) * 0.25;
      pourData[i] = (droplet + pinkNoise) * Math.sin((i / pourData.length) * Math.PI);
    }

    // 3. High-Pressure Steam & Vortex Cavitation Buffer (1.5s)
    this.steamNoiseBuffer = ctx.createBuffer(1, Math.floor(sr * 1.5), sr);
    const steamData = this.steamNoiseBuffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    for (let i = 0; i < steamData.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.96 * b0 + white * 0.18;
      b1 = 0.85 * b1 + white * 0.32;
      steamData[i] = (white * 0.5 + b0 + b1) * 0.45;
    }

    // 4. Skylight Rain & Patter Loop Buffer (3.0s seamless loop)
    this.rainLoopBuffer = ctx.createBuffer(1, Math.floor(sr * 3.0), sr);
    const rainData = this.rainLoopBuffer.getChannelData(0);
    let rPrev = 0;
    for (let i = 0; i < rainData.length; i++) {
      const w = Math.random() * 2 - 1;
      const drop = Math.random() < 0.004 ? (Math.random() * 2 - 1) * 0.8 : 0;
      rPrev = 0.88 * rPrev + w * 0.12;
      rainData[i] = (rPrev + drop) * 0.5;
    }

    // 5. Cozy Cafe Ambience & Warm Murmur Loop Buffer (4.0s seamless loop)
    this.cafeMurmurBuffer = ctx.createBuffer(1, Math.floor(sr * 4.0), sr);
    const murmurData = this.cafeMurmurBuffer.getChannelData(0);
    let m0 = 0;
    let m1 = 0;
    for (let i = 0; i < murmurData.length; i++) {
      const t = i / sr;
      const mod = 0.55 + 0.45 * Math.sin(t * Math.PI * 1.5) * Math.cos(t * Math.PI * 0.7);
      const w = Math.random() * 2 - 1;
      m0 = 0.992 * m0 + w * 0.008;
      m1 = 0.96 * m1 + m0 * 0.04;
      murmurData[i] = m1 * mod * 2.2;
    }

    // 6. Hann-Windowed Roof Raindrop Micro-Grain Buffer (0.09s)
    const dropLen = Math.floor(sr * 0.09);
    this.roofDropGrainBuffer = ctx.createBuffer(1, dropLen, sr);
    const dropData = this.roofDropGrainBuffer.getChannelData(0);
    for (let i = 0; i < dropLen; i++) {
      const norm = i / dropLen;
      // Raised-cosine Hann window with fast impact transient
      const hann = 0.5 * (1 - Math.cos(2 * Math.PI * norm));
      const decay = Math.exp(-norm * 7.5);
      const modalResonance =
        Math.sin(2 * Math.PI * 380 * (i / sr)) * 0.6 +
        Math.sin(2 * Math.PI * 820 * (i / sr)) * 0.3;
      const noiseBurst = (Math.random() * 2 - 1) * 0.5;
      dropData[i] = (modalResonance + noiseBurst) * hann * decay;
    }

    // 7. Hann-Windowed Metallic/Bamboo Wind Chime Grain Buffer (0.35s)
    const chimeLen = Math.floor(sr * 0.35);
    this.chimeShimmerGrainBuffer = ctx.createBuffer(1, chimeLen, sr);
    const chimeData = this.chimeShimmerGrainBuffer.getChannelData(0);
    for (let i = 0; i < chimeLen; i++) {
      const norm = i / chimeLen;
      const hann = 0.5 * (1 - Math.cos(2 * Math.PI * norm));
      const decay = Math.exp(-norm * 4.2);
      // Inharmonic overtone ratios of a hollow brass/bamboo wind chime tube (1 : 2.76 : 5.40)
      const t = i / sr;
      const partial1 = Math.sin(2 * Math.PI * 1046.5 * t);
      const partial2 = Math.sin(2 * Math.PI * 2888.3 * t) * 0.35;
      const partial3 = Math.sin(2 * Math.PI * 5651.1 * t) * 0.15;
      chimeData[i] = (partial1 + partial2 + partial3) * hann * decay * 0.7;
    }
  }

  public init() {
    this.ensureContext();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.rainGain) {
        this.rainGain.gain.setTargetAtTime(muted ? 0 : 0.045, now, 0.1);
      }
      if (this.ambienceGain) {
        this.ambienceGain.gain.setTargetAtTime(muted ? 0 : 0.032, now, 0.1);
      }
      if (this.granularMasterGain) {
        this.granularMasterGain.gain.setTargetAtTime(muted ? 0 : 0.9, now, 0.08);
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setSpotifyDucking(active: boolean) {
    this.isSpotifyDucking = active;
  }

  public setVinylTrackProfile(presetId: string, rpm: 33 | 45) {
    this.activePresetId = presetId;
    this.activeRpm = rpm;
  }

  // 1. BURR GRINDER: Tactile motor torque + roasted coffee bean crunch sample layer
  public playGrind(durationSec = 1.15) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(94, now);
    osc.frequency.linearRampToValueAtTime(112, now + durationSec * 0.35);
    osc.frequency.linearRampToValueAtTime(89, now + durationSec);

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(47, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(360, now);
    filter.Q.setValueAtTime(2.2, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.05);
    gain.gain.setValueAtTime(0.14, now + durationSec - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + durationSec);
    subOsc.stop(now + durationSec);

    if (this.beanCrunchBuffer) {
      const crunchSrc = ctx.createBufferSource();
      crunchSrc.buffer = this.beanCrunchBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.setValueAtTime(1450, now);
      hp.Q.setValueAtTime(1.1, now);

      const crunchGain = ctx.createGain();
      crunchGain.gain.setValueAtTime(0.001, now);
      crunchGain.gain.exponentialRampToValueAtTime(0.16, now + 0.06);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      crunchSrc.connect(hp);
      hp.connect(crunchGain);
      crunchGain.connect(ctx.destination);
      crunchSrc.start(now);
      crunchSrc.stop(now + durationSec);
    }
  }

  // 2. CALIBRATED TAMP: Heavy 30-lb compression thud + metallic click
  public playTamp() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const clickOsc = ctx.createOscillator();
    const gain = ctx.createGain();
    const clickGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.15);

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1850, now + 0.04);
    clickOsc.frequency.exponentialRampToValueAtTime(920, now + 0.09);
    clickGain.gain.setValueAtTime(0.08, now + 0.04);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(ctx.destination);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
    clickOsc.start(now + 0.04);
    clickOsc.stop(now + 0.1);
  }

  // 3. ESPRESSO EXTRACTION: 9-bar vibration pump + rich liquid crema dripping into porcelain
  public playEspressoPump(durationSec = 1.4) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const mainGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, now);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(18, now);
    lfoGain.gain.setValueAtTime(12, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, now);

    mainGain.gain.setValueAtTime(0.001, now);
    mainGain.gain.exponentialRampToValueAtTime(0.11, now + 0.12);
    mainGain.gain.setValueAtTime(0.11, now + durationSec - 0.15);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(ctx.destination);

    osc.start(now);
    lfo.start(now);
    osc.stop(now + durationSec);
    lfo.stop(now + durationSec);

    if (this.waterPourBuffer) {
      const pourSrc = ctx.createBufferSource();
      pourSrc.buffer = this.waterPourBuffer;
      const pourGain = ctx.createGain();
      pourGain.gain.setValueAtTime(0.001, now + 0.15);
      pourGain.gain.exponentialRampToValueAtTime(0.12, now + 0.35);
      pourGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
      pourSrc.connect(pourGain);
      pourGain.connect(ctx.destination);
      pourSrc.start(now + 0.15);
      pourSrc.stop(now + durationSec);
    }
  }

  // 4. TEA STEEPING & BOTANICAL INFUSION
  public playTeaSteep(durationSec = 1.25) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (this.waterPourBuffer) {
      const pourSrc = ctx.createBufferSource();
      pourSrc.buffer = this.waterPourBuffer;
      pourSrc.playbackRate.setValueAtTime(1.15, now);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(780, now);
      bp.Q.setValueAtTime(1.4, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      pourSrc.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      pourSrc.start(now);
      pourSrc.stop(now + durationSec);
    }

    this.playCeramicClink(1.32);
  }

  // 5. STEAM WAND & MICROFOAM VORTEX
  public playSteamHiss(durationSec = 1.25) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.steamNoiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2100, now);
    filter.frequency.exponentialRampToValueAtTime(1350, now + durationSec);
    filter.Q.setValueAtTime(1.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.08);
    gain.gain.setValueAtTime(0.11, now + durationSec - 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + durationSec);
  }

  // 6. CRYSTAL ICE CUBES CLINKING
  public playIceClink() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const pitches = [1.15, 1.38, 1.24, 1.52];
    pitches.forEach((p, idx) => {
      window.setTimeout(() => {
        this.playCeramicClink(p);
      }, idx * 75);
    });
  }

  // 7. SYRUP PUMP / BAMBOO MATCHA WHISK
  public playSyrupOrWhisk(isMatcha = false) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (isMatcha && this.waterPourBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.waterPourBuffer;
      src.playbackRate.setValueAtTime(1.6, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.14, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.88);
    } else {
      this.playCeramicClink(1.12);
    }
  }

  // Crisp ceramic mug clink
  public playCeramicClink(pitchShift = 1.0) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(1420 * pitchShift, now);
    osc2.frequency.setValueAtTime(2180 * pitchShift, now);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.15);
  }

  // Customer Doorbell / Order Arrival Chime
  public playCustomerBell() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.11);
      gain.gain.setValueAtTime(0.001, now + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.09, now + i * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.48);
    });
  }

  // Warm brass cash register chime
  public playCashRegister() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [1046.5, 1318.5, 1567.98, 2093.0];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);

      gain.gain.setValueAtTime(0.001, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.13, now + idx * 0.065 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.4);
    });
  }

  // Vinyl needle drop / lift tactile pop
  public playVinylNeedleDrop(engaged: boolean) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(engaged ? 240 : 480, now);
    osc.frequency.exponentialRampToValueAtTime(engaged ? 95 : 640, now + 0.09);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  // Gentle wooden/ceramic error thud when a serve is blocked or step is out-of-order
  public playErrorThud() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(160, now);
    osc1.frequency.exponentialRampToValueAtTime(72, now + 0.19);
    osc2.frequency.setValueAtTime(115, now + 0.06);
    osc2.frequency.exponentialRampToValueAtTime(58, now + 0.22);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.06);
    osc1.stop(now + 0.24);
    osc2.stop(now + 0.25);
  }

  // GRANULAR SYNTHESIS WEATHER TEXTURE ENGINE + ENVIRONMENTAL AMBIENCE CONTROLLER
  // Spawns overlapping Hann-windowed micro-grains:
  // - 'rainy' mode: rhythmic rain drops on the garage pergola roof, skylight patter, and gutter drips
  // - 'morning' / 'golden' ('sunny') modes: distant garden birdsong & harmonic pentatonic wind chimes
  public setRainAmbience(enabled: boolean, weather: WeatherMode = 'morning') {
    this.currentWeather = weather;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const shouldPlayRainLoop = enabled && weather === 'rainy';

    // 1. Handle Continuous Skylight Rain Bed
    if (!shouldPlayRainLoop) {
      if (this.rainSource) {
        try {
          this.rainSource.stop();
        } catch {
          // ignore
        }
        this.rainSource = null;
      }
    } else if (!this.rainSource && this.rainLoopBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = this.rainLoopBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(980, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.isMuted ? 0 : 0.04, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      this.rainSource = source;
      this.rainGain = gain;
    }

    // 2. Handle Cozy Cafe Chatter Bed
    if (enabled && !this.ambienceSource && this.cafeMurmurBuffer) {
      const ambSrc = ctx.createBufferSource();
      ambSrc.buffer = this.cafeMurmurBuffer;
      ambSrc.loop = true;

      const ambFilter = ctx.createBiquadFilter();
      ambFilter.type = 'bandpass';
      ambFilter.frequency.setValueAtTime(420, ctx.currentTime);
      ambFilter.Q.setValueAtTime(0.9, ctx.currentTime);

      const ambGain = ctx.createGain();
      ambGain.gain.setValueAtTime(this.isMuted ? 0 : 0.028, ctx.currentTime);

      ambSrc.connect(ambFilter);
      ambFilter.connect(ambGain);
      ambGain.connect(ctx.destination);
      ambSrc.start();

      this.ambienceSource = ambSrc;
      this.ambienceGain = ambGain;
    }

    // 3. Start or stop the Real-Time Granular Synthesis Weather Layer
    if (enabled) {
      this.startGranularWeatherScheduler();
    } else {
      this.stopGranularWeatherScheduler();
    }
  }

  private startGranularWeatherScheduler() {
    if (this.granularActive) return;
    this.granularActive = true;

    const scheduleNextGrain = () => {
      if (!this.granularActive) return;
      const params = computeGranularWeatherParams(this.currentWeather, this.granularStepIndex++);
      if (!this.isMuted) {
        this.triggerWeatherGrain(params);
      }
      this.granularTimer = window.setTimeout(scheduleNextGrain, params.intervalMs);
    };

    scheduleNextGrain();
  }

  private stopGranularWeatherScheduler() {
    this.granularActive = false;
    if (this.granularTimer !== null) {
      window.clearTimeout(this.granularTimer);
      this.granularTimer = null;
    }
  }

  // Synthesizes a single Hann-windowed acoustic grain with stereo panning & resonant filtering
  private triggerWeatherGrain(params: GranularWeatherParams) {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    if (!this.granularMasterGain) {
      this.granularMasterGain = ctx.createGain();
      this.granularMasterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.9, ctx.currentTime);
      this.granularMasterGain.connect(ctx.destination);
    }

    const now = ctx.currentTime;
    const dur = params.durationSec;

    // Create stereo placement node if supported
    const panner =
      typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(params.pan, now);
    }

    const filter = ctx.createBiquadFilter();
    filter.type =
      params.grainType === 'roof_raindrop'
        ? 'bandpass'
        : params.grainType === 'wind_chime'
        ? 'highpass'
        : 'bandpass';
    filter.frequency.setValueAtTime(params.filterFreqHz, now);
    filter.Q.setValueAtTime(params.filterQ, now);

    // Hann-like grain envelope (smooth attack -> peak -> smooth release, zero clicks)
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0002, now);
    env.gain.linearRampToValueAtTime(params.gain, now + dur * 0.28);
    env.gain.exponentialRampToValueAtTime(0.0002, now + dur);

    if (panner) {
      filter.connect(env);
      env.connect(panner);
      panner.connect(this.granularMasterGain);
    } else {
      filter.connect(env);
      env.connect(this.granularMasterGain);
    }

    if (
      (params.grainType === 'roof_raindrop' || params.grainType === 'skylight_patter') &&
      this.roofDropGrainBuffer
    ) {
      // Granular buffer playback combined with pitched wooden/roof modal impulse
      const bufSrc = ctx.createBufferSource();
      bufSrc.buffer = this.roofDropGrainBuffer;
      const rate = Math.max(0.5, Math.min(2.4, params.carrierFreqHz / 440));
      bufSrc.playbackRate.setValueAtTime(rate, now);
      bufSrc.connect(filter);
      bufSrc.start(now);
      bufSrc.stop(now + dur);
    } else if (params.grainType === 'wind_chime' && this.chimeShimmerGrainBuffer) {
      // Harmonic pentatonic wind-chime grain
      const bufSrc = ctx.createBufferSource();
      bufSrc.buffer = this.chimeShimmerGrainBuffer;
      const rate = params.carrierFreqHz / 1046.5;
      bufSrc.playbackRate.setValueAtTime(rate, now);
      bufSrc.connect(filter);
      bufSrc.start(now);
      bufSrc.stop(now + dur);

      const chimeOsc = ctx.createOscillator();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(params.carrierFreqHz, now);
      chimeOsc.frequency.exponentialRampToValueAtTime(
        params.carrierFreqHz * params.pitchEndRatio,
        now + dur
      );
      chimeOsc.connect(filter);
      chimeOsc.start(now);
      chimeOsc.stop(now + dur);
    } else {
      // Distant birdsong syrinx FM grain or resonant gutter water droplet grain
      const osc = ctx.createOscillator();
      osc.type = params.grainType === 'distant_bird' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(params.carrierFreqHz, now);
      osc.frequency.exponentialRampToValueAtTime(
        params.carrierFreqHz * params.pitchEndRatio,
        now + dur * 0.72
      );
      if (params.grainType === 'distant_bird') {
        osc.frequency.exponentialRampToValueAtTime(params.carrierFreqHz * 0.96, now + dur);
      }
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + dur);
    }
  }

  // Built-in Internal Vinyl Music Synthesizer (100% Offline & Synced to Selected Spotify Track/RPM)
  public setLofiSynthActive(active: boolean) {
    if (!active) {
      if (this.lofiInterval !== null) {
        window.clearInterval(this.lofiInterval);
        this.lofiInterval = null;
      }
      return;
    }

    if (this.lofiInterval !== null) return;
    this.playNextLofiChord();
    const stepMs = this.activeRpm === 45 ? 2450 : 3100;
    this.lofiInterval = window.setInterval(() => {
      this.playNextLofiChord();
    }, stepMs);
  }

  private playNextLofiChord() {
    if (this.isMuted || this.isSpotifyDucking) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Distinct chord voicings based on the selected Spotify Vinyl Track Preset
    const morningChords = [
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [164.81, 196.0, 246.94, 293.66], // Em7
      [146.83, 174.61, 220.0, 261.63], // Dm7
      [130.81, 164.81, 196.0, 246.94], // Cmaj7
    ];
    const rainyJazzChords = [
      [146.83, 174.61, 220.0, 261.63, 329.63], // Dm9
      [196.0, 246.94, 293.66, 349.23, 440.0], // G13
      [130.81, 164.81, 196.0, 246.94, 293.66], // Cmaj9
      [220.0, 261.63, 329.63, 392.0, 493.88], // Am9
    ];
    const goldenAcousticChords = [
      [196.0, 246.94, 293.66, 369.99], // Gmaj7
      [164.81, 196.0, 246.94, 293.66], // Em7
      [130.81, 164.81, 196.0, 246.94], // Cmaj7
      [146.83, 185.0, 220.0, 293.66], // Dadd9
    ];

    const bank =
      this.activePresetId === 'rainy-espresso-jazz'
        ? rainyJazzChords
        : this.activePresetId === 'golden-hour-acoustic'
        ? goldenAcousticChords
        : morningChords;

    const pitchScale = this.activeRpm === 45 ? 1.06 : 1.0;
    const chord = bank[this.chordIndex % bank.length];
    this.chordIndex++;

    const now = ctx.currentTime;
    chord.forEach((rawFreq, i) => {
      const freq = rawFreq * pitchScale;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = this.activePresetId === 'golden-hour-acoustic' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.045);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(
        this.activePresetId === 'golden-hour-acoustic' ? 920 : 680,
        now
      );

      gain.gain.setValueAtTime(0.0001, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.024, now + i * 0.045 + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.045);
      osc.stop(now + 2.9);
    });
  }
}

export const soundEngine = new SoundEngine();
