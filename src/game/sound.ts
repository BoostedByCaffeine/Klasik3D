// Pure Web Audio API Procedural Sound Generator for Klasik 3D
// Generates espresso pump hum, burr grinder noise, steam wand hiss, ceramic clinks,
// cash register chime, rain loop, vinyl crackle, and cozy lo-fi synth chords.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private isSpotifyDucking = false;
  private rainGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private lofiInterval: number | null = null;
  private chordIndex = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public init() {
    this.ensureContext();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setTargetAtTime(muted ? 0 : 0.045, this.ctx.currentTime, 0.1);
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

  // Burr Grinder tactile rumble + high frequency bean crunch
  public playGrind(durationSec = 1.1) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(92, now);
    osc.frequency.linearRampToValueAtTime(108, now + durationSec * 0.4);
    osc.frequency.linearRampToValueAtTime(88, now + durationSec);

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(46, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(340, now);
    filter.Q.setValueAtTime(2.5, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.06);
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
  }

  // Heavy portafilter knock / tamp thud
  public playTamp() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  // Dual-boiler 9-bar vibration pump hum
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
  }

  // Microfoam steam wand hiss
  public playSteamHiss(durationSec = 1.2) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const bufferSize = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1850, ctx.currentTime);
    filter.Q.setValueAtTime(1.4, ctx.currentTime);

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.08);
    gain.gain.setValueAtTime(0.09, now + durationSec - 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + durationSec);
  }

  // Crisp ceramic mug clink / syrup pump click
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

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.15);
  }

  // Warm brass cash register two-tone chime
  public playCashRegister() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [1046.5, 1318.5, 1567.98]; // C6, E6, G6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.075);

      gain.gain.setValueAtTime(0.001, now + idx * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.075 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.075 + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.075);
      osc.stop(now + idx * 0.075 + 0.4);
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

  // Ambient rain loop toggle
  public setRainAmbience(enabled: boolean) {
    if (!enabled) {
      if (this.rainSource) {
        try {
          this.rainSource.stop();
        } catch {
          // ignore
        }
        this.rainSource = null;
      }
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.rainSource) return;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(920, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.isMuted ? 0 : 0.04, ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    this.rainSource = source;
    this.rainGain = gain;
  }

  // Fallback procedural cozy lo-fi electric piano chord progression when vinyl is spinning
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
    this.lofiInterval = window.setInterval(() => {
      this.playNextLofiChord();
    }, 3200);
  }

  private playNextLofiChord() {
    if (this.isMuted || this.isSpotifyDucking) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Warm jazz 7th chords: Fmaj7 -> Em7 -> Dm7 -> Cmaj7
    const chords = [
      [174.61, 220.0, 261.63, 329.63],
      [164.81, 196.0, 246.94, 293.66],
      [146.83, 174.61, 220.0, 261.63],
      [130.81, 164.81, 196.0, 246.94],
    ];
    const chord = chords[this.chordIndex % chords.length];
    this.chordIndex++;

    const now = ctx.currentTime;
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now);

      gain.gain.setValueAtTime(0.0001, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.025, now + i * 0.04 + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.04);
      osc.stop(now + 3.0);
    });
  }
}

export const soundEngine = new SoundEngine();
