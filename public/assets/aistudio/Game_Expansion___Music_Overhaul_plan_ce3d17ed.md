# Klasik 3D — Game Expansion & Music Overhaul Master Plan

**Repository:** `BoostedByCaffeine/Klasik3D`  
**Scope:** Core Gameplay Bug Fixes, Economy & Lighting Polish, Unified Cross-Platform Audio System (Web + Android APK), Cat Visual/Animation Overhaul, New Cats Roster, Adaptive Cosmetics System, and Interactive Cat Station  
**Design Language:** Deep Matte Espresso (`#090705`), Warm Amber Accents (`#f5a623`), Frosted Glassmorphism HUD, Mobile Landscape First (Low-End GPU Friendly)

---

## Executive Summary & Phased Overview

This master plan merges the **Game Content Expansion & Bug Fix Plan** and the **Music Player Overhaul Specification** into six sequential, shippable phases. Phases are ordered to resolve core gameplay and save-schema foundations first, establish the offline-ready audio and 3D prop architecture next, expand the cafe's feline cast and cosmetics, and finish with the interactive Cat Station and Android native media bridge.

| Phase | Focus Area | Key Deliverables | Platform Scope |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Core Stability, Economy, Lighting & Save Schema** | Dine-in customer walk-outs, 50%–80% rider rate, pastry return plate, `$50k` Golden Espresso rebalance, nighttime lighting fix, unified save schema | Web + APK |
| **Phase 2** | **Unified Audio Engine, Vinyl Mode & 3D Counter Props** | `MusicPlayerController.js`, offline `.ogg` Lo-Fi + BYO Vinyl crate, `CounterAudioProps.js` (Turntable/Radio/Hologram), Glassmorphism Audio Modal | Web + APK |
| **Phase 3** | **Live Audio Radio, Cat Overhaul & New Cats Roster** | PH FM & curated Jazz/Lo-Fi streaming (Radio Browser API), curved Bézier tabby fur, fluid damped cat animations, Amby, Gigi, and secret Tisay | Web + APK |
| **Phase 4** | **Adaptive Cat Cosmetics System** | 5 rig attachment sockets, `CAT_FIT_PROFILES` (`default`, `gigi`, `tisay`, `chunky`), 9 base cosmetics, Dinosaur Costume meta-unlock | Web + APK |
| **Phase 5** | **Interactive Cat Station & Wardrobe UI** | Left-edge Cat HUD button, smooth close-up camera, Pet / Comb / Treat interactions, live-preview right-side Customize drawer | Web + APK |
| **Phase 6** | **External Hologram Mode, Android Native Bridge & QA** | Boot/resume "External First" catch, `KlasikMediaListenerService`, `KlasikNativeAudioBridge.kt`, audio focus coexistence, cross-platform QA | Android APK + Web Fallback |

---

## Unified Save Data Schema (`localStorage`)

Establish this unified persistence structure during **Phase 1** so all subsequent audio, cat, and cosmetic phases read and write cleanly while maintaining backwards compatibility with existing player saves.

```json
{
  "audioPreferences": {
    "lastMode": "vinyl",
    "musicVolume": 0.7,
    "sfxVolume": 0.85,
    "crackleEnabled": true,
    "lastStationId": null
  },
  "goldenEspressoUnlocked": false,
  "unlockedCats": ["champy", "lilo", "amby", "gigi"],
  "secretCatsUnlocked": ["tisay"],
  "unlockedCosmetics": [
    "glasses",
    "cloth_pink"
  ],
  "catLoadouts": {
    "gigi": {
      "eyewear": "glasses",
      "headwear": null,
      "neckwear": null,
      "body": "cloth_pink",
      "full_suit": null
    },
    "tisay": {
      "eyewear": null,
      "headwear": null,
      "neckwear": "gold_chain",
      "body": null,
      "full_suit": null
    }
  }
}
```

*Note: Equipping `full_suit: "dino_costume"` visually overrides `headwear` and `body` while active and restores or clears them cleanly when unequipped. Audio mode preference (`klasik_music_mode` / `audioPreferences.lastMode`) never persists `"external"` as a cold fallback—if external audio is inactive on boot, the game falls back to `"vinyl"`.*

---

## Phase 1: Core Stability, Economy Rebalance & Nighttime Atmosphere

**Goal:** Resolve high-visibility gameplay bugs, rebalance end-game progression, fix nighttime indoor lighting without straining mobile GPUs, and prepare the unified save-migration layer.

### 1.1 Dine-In Customers Walking Out Naturally
- **Problem:** Seated dine-in customers currently despawn abruptly at their table when their dining timer finishes.
- **Target Behavior:** Customers finish their order, stand cleanly from their chair, step clear of the table geometry, and walk out the cafe doorway before despawning.
- **Implementation:**
  - Replace the direct `removeCustomer()` call at the end of `SITTING` with a new `LEAVING_TABLE` state.
  - Interpolate `position.y` smoothly from seat height to standing height (`0.35s` ease-out) while blending from seated to standing/idle pose.
  - Route the customer first to the chair's local **exit clearance waypoint** (offset away from table center to prevent mesh clipping), then hand off to the doorway exit pathfinder.
  - Despawn only once the customer crosses the exterior doorway threshold.

### 1.2 Delivery Rider Encounter Rate (50%–80%)
- **Problem:** Delivery scooter riders appear too rarely during a shift.
- **Target Behavior:** Maintain a **50% to 80%** encounter probability across eligible order cycles.
- **Implementation:**
  - Tune the customer/order spawner probability so riders roll between `0.50` (quiet hours) and `0.80` (peak rush hours), or use a `0.65` baseline with a pity cap so players never go more than 2 orders without a rider.
  - Enforce a hard cap of **max 2 active parked scooters** simultaneously outside the garage entrance to prevent overlapping meshes and protect mobile frame rates.

### 1.3 Clickable Pastry Plate (Return Accidental Pastry)
- **Problem:** Accidentally placing a pastry onto the serving plate locks the player out of returning it to the box.
- **Target Behavior:** Tapping/clicking the serving plate (or the plated pastry on it) returns the pastry neatly back into the pastry box.
- **Implementation:**
  - Register the pastry serving plate mesh and its attached pastry child under raycast interactables whenever `stationState === 'PASTRY_PLATED'` and the item is not yet committed to a customer handoff.
  - On tap: play a `220ms` reverse-arc tween returning the pastry to its box slot, clear `platedPastry = null`, reset station state, and trigger a soft ceramic/glass return SFX.

### 1.4 Golden Espresso Machine Price Rebalance & Save Migration
- **Change:** Decrease unlock threshold from **`$150,000`** to **`$50,000`**.
- **Implementation:**
  - Update `GOLDEN_ESPRESSO_COST` to `50000` across economy logic, shop cards, and milestone listeners.
  - Add a save-load migration check: existing saves with revenue/balance already at or above `$50,000` automatically unlock the Golden Espresso (and trigger its linked unlocks once Phases 3 & 4 are live: secret cat **Tisay** and **Gold Chain**).

### 1.5 Nighttime Indoor Lighting Fix
- **Problem:** Nighttime interior lighting is either crushed into dark shadows or washed out.
- **Target Behavior:** Warm, cozy, high-readability night cafe atmosphere suitable for low-end mobile GPUs.
- **Implementation:**
  - Maintain a warm ambient floor via `THREE.HemisphereLight` (`skyColor: 0xffd2a1`, `groundColor: 0x261a14`, min intensity `0.38` at midnight).
  - Cap dynamic interior lights at **2–3 warm amber `PointLight` pools** positioned over the espresso bar, pastry counter, and seating nook (`color: 0xffb35c`, soft distance decay) that ramp up smoothly during dusk-to-night interpolation.
  - Boost `emissiveIntensity` on practical light meshes (pendant bulbs, counter under-glow strips, menu board backlight) to sell cozy brightness without extra shadow casters.

### Phase 1 Checklist
- [ ] Implement `LEAVING_TABLE` stand-up animation, clearance waypoint, and doorway despawn for dine-in customers.
- [ ] Update delivery rider spawn probability to `50%–80%` with a max-2 parked scooter cap.
- [ ] Add serving plate raycast return interaction (`220ms` reverse-arc tween + SFX).
- [ ] Lower Golden Espresso unlock threshold from `$150,000` to `$50,000` with save-load migration.
- [ ] Rebalance nighttime `HemisphereLight`, 2–3 warm amber `PointLight` pools, and practical lamp emissives.
- [ ] Initialize the unified `localStorage` save schema wrapper.

---

## Phase 2: Unified Audio Engine, Vinyl Mode & 3D Counter Props

**Goal:** Replace Spotify-dependent web embeds (which fail in Android APK WebViews due to 30-second preview limits, forced redirects, and Widevine DRM HTTPS restrictions) with a unified, offline-first three-mode countertop audio foundation.

### 2.1 System Architecture: The Three Audio Modes

All three modes share one physical counter anchor (`AudioDeviceRoot`) and one Glassmorphism Modal UI.

| Mode | 3D Countertop Prop | Audio Source | Works Offline? | Spatial Audio / Vinyl EQ? |
| :--- | :--- | :--- | :---: | :---: |
| **1. Vinyl Player** *(Phase 2)* | Original 3D Turntable | Bundled cozy lo-fi `.ogg` tracks + Bring Your Own Vinyl (local MP3/OGG/WAV) | Yes | Yes |
| **2. Audio Radio** *(Phase 3)* | Vintage Cafe Radio Speaker | Live PH FM stations + curated Lo-Fi & Jazz internet streams (HTTPS) | No | Yes |
| **3. External App** *(Phase 6)* | Floating Rectangular Hologram | User's external app (Spotify, YT Music, etc.) in OS background | Depends on app | No (In-game music muted; Cafe SFX active) |

### 2.2 Mobile Landscape Glassmorphism Modal & Vinyl UI

Tapping any active countertop prop opens a single compact Glassmorphism Modal (`background: rgba(9, 7, 5, 0.84)`, `backdrop-filter: blur(12px)`, `border: 1px solid rgba(245, 166, 35, 0.28)`):

```text
┌────────────────────────────────────────────────────────────────┐
│   [ 💿 Vinyl ]      [ 📻 Radio ]      [ ✨ External ]     [✕]  │
├───────────────────────────┬────────────────────────────────────┤
│        [ Vinyl Art ]      │  [ Cafe Lo-Fi ]  [ My Crate (BYO) ]│
│     Spinning Record UI    │  ────────────────────────────────  │
│                           │  ▶ 01. Rain on the Miata    02:45  │
│   "Rain on the Miata"     │    02. Midnight Espresso    03:12  │
│    Klasik Original        │    03. Garden Morning       02:58  │
│                           │                                    │
│    ⏮     ⏯     ⏭    🔁   │  ┌────────────────────────────────┐│
│   🔊 ━━━━━━━●━━━  [Crackle]│  │  + Drop Your Own Vinyl (MP3)   ││
│                           │  └────────────────────────────────┘│
└───────────────────────────┴────────────────────────────────────┘
```

**Mode 1 (Vinyl Player) Details:**
1. **Cafe Lo-Fi Tab (Offline Default):** Bundle 3–5 compressed `.ogg` tracks (~1–2 MB each) so the cafe always has ambience offline.
2. **My Crate (BYO Vinyl) Tab:** Triggers `<input type="file" accept="audio/*" multiple />`, converts files via `URL.createObjectURL(file)`, strips extensions/underscores for display, appends to the session queue, and tints the 3D vinyl record center label to signify a personal record.
3. **Vinyl Crackle Toggle:** Mixes a quiet looping analog crackle buffer into the Web Audio chain for both built-in and custom tracks.

### 2.3 3D Countertop Prop Swapping (`CounterAudioProps.js`)

**Low-End Mobile Optimization Rules:**
- **Preload Once, Toggle Visibility:** Mount all three low-poly props inside `AudioDeviceRoot` at scene startup and switch via `.visible = true/false`. Never create/dispose geometries or materials mid-shift.
- **Shared Raycast Hitbox:** Wrap the anchor in one invisible bounding box (`userData.interactable = 'audioDevice'`) so tapping works identically across all three props.
- **Event-Driven Hologram Canvas:** Redraw the Hologram's `THREE.CanvasTexture` only when track title/artist changes—never inside `requestAnimationFrame`. Animate the 5 low-poly equalizer bars via Y-axis scaling in the render loop.

```javascript
import * as THREE from 'three';

export class CounterAudioProps {
  constructor(turntableGroup, radioGroup) {
    this.root = new THREE.Group();
    this.root.name = 'AudioDeviceRoot';

    this.props = {
      vinyl: turntableGroup,
      radio: radioGroup,
      external: this._buildHologramProp(),
    };

    Object.values(this.props).forEach((mesh) => {
      mesh.visible = false;
      this.root.add(mesh);
    });

    this.activeMode = 'vinyl';
    this.props.vinyl.visible = true;
    this.eqBars = this.props.external.userData.eqBars || [];
    this.holoTime = 0;
  }

  _buildHologramProp() {
    const group = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.04, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x161210, roughness: 0.7, metalness: 0.3 })
    );
    base.position.y = 0.02;
    group.add(base);

    this.holoCanvas = document.createElement('canvas');
    this.holoCanvas.width = 512;
    this.holoCanvas.height = 256;
    this.holoCtx = this.holoCanvas.getContext('2d');

    this.holoTexture = new THREE.CanvasTexture(this.holoCanvas);
    this.holoTexture.colorSpace = THREE.SRGBColorSpace;

    const screenMat = new THREE.MeshBasicMaterial({
      map: this.holoTexture,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.holoScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.28), screenMat);
    this.holoScreen.position.set(0, 0.24, 0);
    group.add(this.holoScreen);

    const eqBars = [];
    const barGeo = new THREE.BoxGeometry(0.022, 0.06, 0.008);
    const barMat = new THREE.MeshBasicMaterial({
      color: 0xf5a623,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < 5; i++) {
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(0.11 + i * 0.032, 0.16, 0.01);
      group.add(bar);
      eqBars.push(bar);
    }

    group.userData.eqBars = eqBars;
    this.updateHologramText('External Audio Active', 'Playing from device', 'EXTERNAL');
    return group;
  }

  setMode(mode) {
    if (!this.props[mode]) return;
    this.activeMode = mode;
    Object.entries(this.props).forEach(([key, mesh]) => {
      mesh.visible = key === mode;
    });
  }

  updateHologramText(title, artist, source = 'EXTERNAL AUDIO') {
    const ctx = this.holoCtx;
    const w = this.holoCanvas.width;
    const h = this.holoCanvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(20, 14, 9, 0.72)';
    ctx.fillRect(8, 8, w - 16, h - 16);
    ctx.strokeStyle = 'rgba(245, 166, 35, 0.85)';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#f5a623';
    ctx.font = '600 20px sans-serif';
    ctx.fillText(`✦ ${source.toUpperCase()}`, 28, 52);

    ctx.fillStyle = '#fff8ee';
    ctx.font = '700 36px sans-serif';
    ctx.fillText(this._truncate(title || 'External Audio Active', 22), 28, 124);

    ctx.fillStyle = 'rgba(255, 232, 200, 0.78)';
    ctx.font = '500 26px sans-serif';
    ctx.fillText(this._truncate(artist || 'Tap to adjust ambience', 28), 28, 174);

    this.holoTexture.needsUpdate = true;
  }

  _truncate(str, maxLen) {
    return str.length > maxLen ? `${str.slice(0, maxLen - 1)}…` : str;
  }

  update(dt, isPlaying) {
    if (this.activeMode === 'vinyl' && isPlaying) {
      const platter = this.props.vinyl.getObjectByName('VinylPlatter');
      if (platter) platter.rotation.y -= dt * 1.8;
    } else if (this.activeMode === 'external') {
      this.holoTime += dt;
      this.holoScreen.position.y = 0.24 + Math.sin(this.holoTime * 2.2) * 0.008;
      this.eqBars.forEach((bar, i) => {
        const target = isPlaying
          ? 0.35 + Math.abs(Math.sin(this.holoTime * (4.5 + i * 0.9) + i)) * 1.25
          : 0.15;
        bar.scale.y += (target - bar.scale.y) * Math.min(1, dt * 12);
      });
    }
  }
}
```

### 2.4 Unified Audio Controller (`MusicPlayerController.js`)

Provides the single state controller for Vinyl (Phase 2), Radio Browser streams (Phase 3), and Android Native Bridge hooks (Phase 6).

```javascript
export const DEFAULT_LOFI_TRACKS = [
  { id: 'lofi-1', title: 'Rain on the Miata', artist: 'Klasik Original', src: './assets/audio/rain_miata.ogg' },
  { id: 'lofi-2', title: 'Midnight Espresso', artist: 'Klasik Original', src: './assets/audio/midnight_espresso.ogg' },
  { id: 'lofi-3', title: 'Garden Morning', artist: 'Klasik Original', src: './assets/audio/garden_morning.ogg' },
];

export const CURATED_RADIO_STATIONS = [
  { id: 'somafm-groove', name: 'SomaFM Groove Salad', category: 'lofi', meta: 'Ambient / Chill', url: 'https://ice2.somafm.com/groovesalad-128-mp3' },
  { id: 'somafm-lush', name: 'SomaFM Lush', category: 'lofi', meta: 'Mellow Vocals', url: 'https://ice2.somafm.com/lush-128-mp3' },
  { id: 'somafm-jazz', name: 'SomaFM Sonic Universe', category: 'jazz', meta: 'Nu-Jazz / Cafe', url: 'https://ice2.somafm.com/sonicuniverse-128-mp3' },
];

export class MusicPlayerController {
  constructor({ propsController, onStateChange, sfxGainNode }) {
    this.props = propsController;
    this.onStateChange = onStateChange;
    this.sfxGainNode = sfxGainNode;

    this.mode = 'vinyl'; // 'vinyl' | 'radio' | 'external'
    this.isPlaying = false;
    this.volume = 0.7;
    this.crackleEnabled = true;

    this.builtInTracks = [...DEFAULT_LOFI_TRACKS];
    this.byoTracks = [];
    this.activeCrate = 'builtin';
    this.trackIndex = 0;

    this.stations = [...CURATED_RADIO_STATIONS];
    this.activeStation = null;

    this.externalMeta = {
      isPlaying: false,
      title: 'External Audio Active',
      artist: 'Playing from device',
      sourceApp: 'External App',
      hasPermission: false,
    };

    this.audioEl = new Audio();
    this.audioEl.crossOrigin = 'anonymous';
    this.audioEl.preload = 'none';
    this.audioEl.addEventListener('ended', () => {
      if (this.mode === 'vinyl') this.nextTrack();
    });

    this._bindLifecycleHooks();
  }

  async initOnBoot() {
    const externalActive = await this._detectExternalAudio();
    if (externalActive) {
      this.setMode('external', { autoTriggered: true });
      return;
    }

    const saved = localStorage.getItem('klasik_music_mode');
    const initialMode = saved && saved !== 'external' ? saved : 'vinyl';
    this.setMode(initialMode, { autoTriggered: true });
  }

  _bindLifecycleHooks() {
    const onResume = async () => {
      if (document.visibilityState === 'hidden') return;
      const externalActive = await this._detectExternalAudio();
      if (externalActive && this.mode !== 'external') {
        this.setMode('external', { autoTriggered: true });
      }
    };

    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('klasik-external-media-update', (e) => {
      const { title, artist, sourceApp, isPlaying } = e.detail || {};
      this.externalMeta = {
        ...this.externalMeta,
        title: title || 'External Audio Active',
        artist: artist || 'Playing from device',
        sourceApp: sourceApp || 'External App',
        isPlaying: Boolean(isPlaying),
        hasPermission: true,
      };
      this.props.updateHologramText(
        this.externalMeta.title,
        this.externalMeta.artist,
        this.externalMeta.sourceApp
      );
      if (isPlaying && this.mode !== 'external') {
        this.setMode('external', { autoTriggered: true });
      } else {
        this._emit();
      }
    });
  }

  async _detectExternalAudio() {
    if (window.KlasikNativeAudio?.isExternalMusicActive) {
      try {
        return Boolean(await window.KlasikNativeAudio.isExternalMusicActive());
      } catch {
        return false;
      }
    }
    return false;
  }

  setMode(newMode, { autoTriggered = false } = {}) {
    this.mode = newMode;
    this.props.setMode(newMode);

    if (newMode === 'external') {
      this.audioEl.pause();
      this.isPlaying = this.externalMeta.isPlaying || autoTriggered;
      this.props.updateHologramText(
        this.externalMeta.title,
        this.externalMeta.artist,
        this.externalMeta.sourceApp
      );
    } else {
      localStorage.setItem('klasik_music_mode', newMode);
      if (newMode === 'vinyl') {
        this._loadCurrentVinylTrack(!autoTriggered);
      } else if (newMode === 'radio' && this.activeStation) {
        this.playStation(this.activeStation);
      }
    }

    this._emit({ autoTriggered });
  }

  addLocalFiles(fileList) {
    Array.from(fileList).forEach((file) => {
      if (!file.type.startsWith('audio/')) return;
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
      this.byoTracks.push({
        id: `byo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: cleanName,
        artist: 'My Vinyl Crate',
        src: URL.createObjectURL(file),
        isCustom: true,
      });
    });

    if (this.byoTracks.length > 0) {
      this.activeCrate = 'byo';
      this.trackIndex = this.byoTracks.length - 1;
      if (this.mode !== 'vinyl') this.setMode('vinyl');
      this._loadCurrentVinylTrack(true);
    }
  }

  _getCurrentList() {
    return this.activeCrate === 'byo' && this.byoTracks.length > 0
      ? this.byoTracks
      : this.builtInTracks;
  }

  _loadCurrentVinylTrack(autoplay = false) {
    const list = this._getCurrentList();
    if (!list.length) return;
    const track = list[this.trackIndex % list.length];
    this.audioEl.src = track.src;
    this.audioEl.volume = this.volume;
    if (autoplay) {
      this.audioEl.play().then(() => {
        this.isPlaying = true;
        this._emit();
      }).catch(() => {});
    }
  }

  nextTrack() {
    const list = this._getCurrentList();
    if (!list.length) return;
    this.trackIndex = (this.trackIndex + 1) % list.length;
    this._loadCurrentVinylTrack(true);
  }

  async fetchPhilippineStations(limit = 16) {
    const endpoint =
      `https://de1.api.radio-browser.info/json/stations/search` +
      `?countrycode=PH&hidebroken=true&order=clickcount&reverse=true&limit=${limit * 2}`;
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      const verified = data
        .filter((s) =>
          s.url_resolved?.startsWith('https://') &&
          /mp3|aac/i.test(s.codec || '')
        )
        .slice(0, limit)
        .map((s) => ({
          id: s.stationuuid,
          name: s.name.trim(),
          category: 'ph',
          meta: s.tags ? s.tags.split(',').slice(0, 2).join(' • ') : 'Philippines FM',
          url: s.url_resolved,
        }));

      this.stations = [...verified, ...CURATED_RADIO_STATIONS];
      this._emit();
      return verified;
    } catch {
      return [];
    }
  }

  playStation(station) {
    this.activeStation = station;
    this.audioEl.src = station.url;
    this.audioEl.volume = this.volume;
    this.audioEl.play().then(() => {
      this.isPlaying = true;
      this._emit();
    }).catch(() => {
      this.isPlaying = false;
      this._emit({ radioError: 'No Signal — Try another station or switch to Vinyl' });
    });
  }

  sendExternalMediaCommand(action) {
    window.KlasikNativeAudio?.sendMediaAction?.(action);
  }

  openNotificationAccessSettings() {
    window.KlasikNativeAudio?.openNotificationPermission?.();
  }

  _emit(extra = {}) {
    this.onStateChange?.({
      mode: this.mode,
      isPlaying: this.isPlaying,
      volume: this.volume,
      activeCrate: this.activeCrate,
      tracks: this._getCurrentList(),
      trackIndex: this.trackIndex,
      stations: this.stations,
      activeStation: this.activeStation,
      externalMeta: this.externalMeta,
      ...extra,
    });
  }
}
```

### Phase 2 Checklist
- [ ] Bundle 3–5 compressed `.ogg` cafe lo-fi tracks and a looping analog crackle buffer.
- [ ] Build the low-poly Vintage Radio prop and Hologram Screen prop; mount all three inside `AudioDeviceRoot` with one shared raycast hitbox.
- [ ] Wire `MusicPlayerController.js` into Three.js spatial audio (`THREE.PositionalAudio`) / Web Audio chain.
- [ ] Build the landscape Glassmorphism Audio Modal with top pill switcher (`Vinyl | Radio | External`), built-in Lo-Fi tab, BYO Vinyl file picker, and crackle toggle.

---

## Phase 3: Live Audio Radio, Cat Overhaul & New Cats Roster

**Goal:** Activate live PH FM and curated music streaming for the Radio prop, upgrade all cats with organic curved fur and fluid lifelike animations, and expand the cafe's feline roster with Amby, Gigi, and secret cat Tisay.

### 3.1 Audio Radio Mode (Mode 2)

```text
┌────────────────────────────────────────────────────────────────┐
│  ● LIVE   96.3 Easy Rock Manila              🔊 ━━━━━━●━━━     │
│  [ ━━|━━|━━|━━▲━━|━━|━━|━━|━━|━━|━━ ]   Status: Connected      │
├────────────────────────────────────────────────────────────────┤
│  Filter: [ 🇵🇭 PH Stations ]  [ ☕ Lo-Fi & Cafe ]  [ 🎷 Jazz ]   │
│                                                                │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌─────────┐ │
│  │ ▶ Easy Rock 96.3     │ │   Wish 107.5         │ │ Magic   │ │
│  │   Manila • Soft Pop  │ │   OPM / Live Bus     │ │ 89.9    │ │
│  └──────────────────────┘ └──────────────────────┘ └─────────┘ │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌─────────┐ │
│  │   Monster RX 93.1    │ │   Mellow 94.7        │ │ SomaFM  │ │
│  │   Top 40 / Hits      │ │   Chill / Acoustic   │ │ Groove  │ │
│  └──────────────────────┘ └──────────────────────┘ └─────────┘ │
└────────────────────────────────────────────────────────────────┘
```

- **Two-Layer Station Reliability:**
  - **Layer 1 (Curated Presets):** Verified HTTPS MP3/AAC streams for popular PH stations (Easy Rock, Wish 107.5, Magic 89.9, Mellow 94.7, Monster RX 93.1) and cafe music streams (SomaFM Groove Salad, Lush, Sonic Universe / Jazz24).
  - **Layer 2 (Dynamic Radio Browser API):** Background fetch from `https://de1.api.radio-browser.info/json/stations/search` filtered strictly with `countrycode=PH` (or tags `lofi`, `jazz`, `bossa nova`, `opm`), `hidebroken=true`, `order=clickcount&reverse=true`, requiring `url_resolved.startsWith('https://')` and MP3/AAC codec (avoiding WebView mixed-content blocks and flaky `.m3u8` HLS streams).
- **Tuning Feel & Timeout:** Switching stations plays a `350ms` radio static/dial-click SFX while buffering, then fades in. If a stream fails to connect within `5000ms`, display `"No Signal — Try another station or switch to Vinyl"` without interrupting gameplay.

### 3.2 Tabby Cat Fur Optimization (Curved Realistic Stripes)
- Upgrade the procedural `CanvasTexture` tabby generator:
  - Replace straight `fillRect` bars with quadratic/cubic Bézier curves (`ctx.quadraticCurveTo`) radiating downward and slightly rearward from the dorsal spine.
  - Add a soft-feathered **dorsal stripe** along the spine and classic **forehead "M"** markings between the ears.
  - Layer subtle low-opacity fur-grain noise and soft-edge strokes so stripes blend organically with zero extra polygon cost.

```javascript
function drawCurvedTabbyStripes(ctx, width, height, stripeColor) {
  ctx.save();
  ctx.strokeStyle = stripeColor;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.82;

  const stripeCount = 9;
  for (let i = 0; i < stripeCount; i++) {
    const startX = width * (0.14 + (i / stripeCount) * 0.72);
    const curveBend = (i % 2 === 0 ? 1 : -1) * (width * 0.045);

    ctx.lineWidth = height * (0.022 + (i % 3) * 0.006);
    ctx.beginPath();
    ctx.moveTo(startX, height * 0.12);
    ctx.quadraticCurveTo(
      startX + curveBend,
      height * 0.48,
      startX - curveBend * 0.4,
      height * 0.86
    );
    ctx.stroke();
  }
  ctx.restore();
}
```

### 3.3 Fluid Cat Animation Overhaul
- **Damped Transitions:** Replace instant rotation/position snaps with frame-rate-independent exponential smoothing (`THREE.MathUtils.damp(current, target, lambda, dt)`).
- **4-Leg Phase-Shifted Walk Gait:** Drive front-left, back-right, front-right, and back-left limbs with offset sine phases ($0$, $0.5\pi$, $\pi$, $1.5\pi$), paired with subtle hip/shoulder vertical bobbing and spine sway.
- **Chained Tail Physics:** Split the tail into 3 hierarchical segments (`tailBase` -> `tailMid` -> `tailTip`) driven by phase-delayed sine waves for organic follow-through.
- **Micro-Idle Life:** Add ribcage breathing (`scale.y` and `scale.x` pulse at ~$0.35\text{ Hz}$), randomized ear twitches, eye blinks every 3–6 seconds, and soft head look-at tracking when the player is near.

### 3.4 New Cats Roster & Secret Unlock

| Cat Name | Coat & Markings | Eyes | Collar | Build / Size | Unlock Method | Shop Visibility |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Amby** | Pure warm **caramel** fur | **Amber** | **Pink** | Same size & build as **Lilo** (`scale: 1.0`, `width: 1.0`) | Shop — **$1,500** | Visible in Shop |
| **Gigi** | **White base** with **black patches** on head & body | **Green** | **Black** | **Kitten** (`scale: 0.68`, slightly larger head-to-body ratio) | Shop — **$500** | Visible in Shop |
| **Tisay** | **Tuxedo-patterned ginger** (ginger back, crown, ears, tail; crisp white chest bib, muzzle, and paws) | **Amber** | **None** | Same height/length as Lilo, but **slender/thin** (`width: 0.82`) | Unlocks automatically with **Golden Espresso ($50,000)** | **Secret** — completely hidden from Shop & UI until unlocked |

**Secret Unlock Behavior for Tisay:**
- **Before Unlock:** Exclude Tisay from Shop catalogs, silhouette previews, and "Unlocked X / Y" counters so she remains a genuine surprise.
- **On Golden Espresso Unlock:** Tisay enters through the front doorway (or spawns gracefully beside the counter with a warm amber chime) accompanied by a toast: *"A sleek ginger cat wandered in — Tisay has joined the cafe!"*
- **After Unlock:** Permanently selectable in the Cat Station and compatible with all cosmetics (e.g., Gold Chain sits cleanly on her collarless chest).

### Phase 3 Checklist
- [ ] Integrate Radio Browser API PH station fetching, curated SomaFM/Jazz presets, `350ms` tuning static SFX, and `5000ms` timeout fallback into the Radio tab.
- [ ] Upgrade procedural tabby `CanvasTexture` with curved Bézier stripes, forehead "M", and dorsal stripe shading.
- [ ] Refactor cat animation controller to use `THREE.MathUtils.damp`, 4-leg phase-shifted gait, 3-segment tail follow-through, breathing, blinks, and ear twitches.
- [ ] Implement **Amby** (`$1,500`), **Gigi** (`$500`), and secret **Tisay** (hidden until `$50,000` Golden Espresso unlock).

---

## Phase 4: Adaptive Cat Cosmetics System

**Goal:** Build a slot-based cosmetic wardrobe that adapts automatically to every cat's size, proportions, and width—from tiny **Gigi** and thin **Tisay** to standard **Lilo/Amby** and wide **Chunky**—with zero clipping or stretched textures.

### 4.1 Cosmetics Catalog & Unlock Matrix

| Cosmetic Item | Slot | Unlock Source | Cost / Requirement | Visual Description |
| :--- | :--- | :--- | :--- | :--- |
| **Cat Glasses** | `eyewear` | Shop | **$150** | Classic round wire-frame cafe glasses resting on the nose bridge |
| **Thuglife Cat Glasses** | `eyewear` | Shop | **$250** | Iconic pixelated black 8-bit sunglasses with white pixel glare |
| **Gold Chain** | `neckwear` | Milestone | **Golden Espresso ($50,000)** | Layered metallic gold Cuban-link chain (`metalness: 0.9`, `roughness: 0.2`) draped on the chest |
| **Cat Beret** | `headwear` | Revenue Milestone | **$10,000 total revenue** | Soft tilted artist beret resting naturally between the ears |
| **Cat Cloth — Pink** | `body` | Shop | **$50** | Cozy fitted pastel-pink knit cafe shirt/vest |
| **Cat Cloth — Yellow** | `body` | Shop | **$50** | Cozy fitted warm-yellow knit cafe shirt/vest |
| **Cat Cloth — Blue** | `body` | Shop | **$50** | Cozy fitted soft-blue knit cafe shirt/vest |
| **Cat Cloth — White** | `body` | Shop | **$50** | Cozy fitted cream-white knit cafe shirt/vest |
| **Cat Cloth — Orange** | `body` | Shop | **$50** | Cozy fitted tangerine-orange knit cafe shirt/vest |
| **Dinosaur Costume** | `full_suit` *(overrides `headwear` + `body`)* | **Meta-Unlock** | **Unlock ALL other 9 base cat cosmetics** | Plush green T-Rex head hood framing the cat's face + connected row of dorsal T-Rex spine ridges extending smoothly down the back |

**Dinosaur Costume Meta-Unlock Checker:**
Run `checkDinoCostumeUnlock()` after every shop purchase and revenue/machine milestone. When all 9 base IDs (`glasses`, `thuglife_glasses`, `gold_chain`, `beret`, `cloth_pink`, `cloth_yellow`, `cloth_blue`, `cloth_white`, `cloth_orange`) are owned, set `unlockedCosmetics.dino_costume = true` and trigger a celebratory unlock banner.

### 4.2 Adaptive Fit Architecture (Sockets + Fit Profiles)

1. **Standardized Rig Attachment Sockets:** Add five named `THREE.Object3D` anchor nodes to the shared cat rig so cosmetics follow breathing, walking, sitting, and head-tilts automatically:
   - `anchor_eyes` (child of `headGroup`, centered at nose bridge)
   - `anchor_head_top` (child of `headGroup`, crown between ears)
   - `anchor_neck` (child of `torsoGroup`, upper chest/collar ring)
   - `anchor_torso` (child of `torsoGroup`, center of ribcage)
   - `anchor_spine_points` (array of 4 spine nodes from neck to tail base for the Dinosaur Costume dorsal ridge)

2. **Per-Cat Fit Profile Configuration:**

```javascript
export const CAT_FIT_PROFILES = {
  default: {
    bodyScale: 1.0,
    headScale: 1.0,
    eyeWidth: 1.0,
    neckRadius: 1.0,
    torsoScale: [1.0, 1.0, 1.0],
    furOffset: 0.014,
  },
  amby: {
    bodyScale: 1.0,
    headScale: 1.0,
    eyeWidth: 1.0,
    neckRadius: 1.0,
    torsoScale: [1.0, 1.0, 1.0],
    furOffset: 0.014,
  },
  gigi: {
    bodyScale: 0.68,
    headScale: 0.82,
    eyeWidth: 0.80,
    neckRadius: 0.72,
    torsoScale: [0.68, 0.70, 0.68],
    furOffset: 0.011,
  },
  tisay: {
    bodyScale: 1.0,
    headScale: 0.96,
    eyeWidth: 0.94,
    neckRadius: 0.86,
    torsoScale: [0.82, 0.95, 1.0],
    furOffset: 0.013,
  },
  chunky: {
    bodyScale: 1.05,
    headScale: 1.05,
    eyeWidth: 1.08,
    neckRadius: 1.22,
    torsoScale: [1.28, 1.15, 1.04],
    furOffset: 0.022,
  },
};
```

3. **Adaptive Geometry & Texture Scaling Rules:**
   - **Eyewear:** Parented to `anchor_eyes`; horizontal scale multiplies by `eyeWidth`, overall scale by `headScale`.
   - **Neckwear (`Gold Chain`):** Parented to `anchor_neck`; torus/chain ring scales by `neckRadius + furOffset` to sit cleanly over collars or Tisay's bare chest.
   - **Cat Cloth (`body`):** Shared vest mesh scaled by `[torsoScale[0] + furOffset, torsoScale[1] + furOffset, torsoScale[2] + furOffset]`, with UV tiling scaled proportionally to `torsoScale` so knit textures never stretch on Chunky or squish on Gigi.
   - **Dinosaur Costume (`full_suit`):** T-Rex head hood parented to `anchor_head_top` (`headScale + furOffset`) with an open face cutout; plush triangular dorsal spine plates dynamically placed and sized along `anchor_spine_points` to match back length and width.

### Phase 4 Checklist
- [ ] Add all 5 standardized attachment sockets to the unified cat rig.
- [ ] Implement `CAT_FIT_PROFILES` and the adaptive cosmetic attachment/UV-tiling helper.
- [ ] Build low-poly meshes & materials for Cat Glasses, Thuglife Glasses, Gold Chain, Cat Beret, 5 Cat Cloth color variants, and the Dinosaur Costume.
- [ ] Wire shop purchases (`$150`, `$250`, `$50` x 5), milestones (`$10k` revenue Beret, `$50k` Golden Espresso Gold Chain), and `checkDinoCostumeUnlock()` meta-unlock logic.

---

## Phase 5: Interactive Cat Station & Wardrobe UI

**Goal:** Deliver a dedicated, stress-free cozy mini-station where players can bond with and customize their unlocked cats completely independently of the barista order loop.

### 5.1 Entry Point, Camera & Pacing Protection
- **HUD Trigger:** Sleek **Cat Icon Button** docked on the **left edge** of the screen (`#090705` glassmorphism with warm amber border highlight + amber notification dot when a new cat or cosmetic unlocks).
- **Smooth Camera Zoom:** Tapping smoothly interpolates (`0.55s` cubic ease-in-out) to an eye-level close-up framing the active cat, with top-center switcher arrows (`◀ Cat Name ▶`) cycling through all unlocked cats.
- **Pacing Protection:** Pause customer patience decay (or display a gentle unobtrusive order bell badge in the top-right corner) while inside Cat Station so players can relax and dress up cats without penalty.

### 5.2 Mobile Landscape UI Wireframe

```text
┌────────────────────────────────────────────────────────────────────┐
│  [ ← Back to Cafe ]       ◀  Gigi  ▶                 ✨ Mood: Happy│
│                                                                    │
│                                                                    │
│                     ( 3D Cat Close-Up Camera )                     │
│               Direct touch/drag on cat for Pet & Comb              │
│                                                                    │
│                                                                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────────┐  │
│  │  ✋ Pet   │  │  🪮 Comb  │  │  🐟 Treat │  │  🎩 Customize   │  │
│  └───────────┘  └───────────┘  └───────────┘  └─────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 5.3 Interactive Modes & Wardrobe Drawer
1. **Pet (`✋ Pet`):** Tap or rub directly over the cat's head, ears, or back -> cat leans in, happy eye squint, upright curled tail, warm purr loop SFX, floating amber heart particles.
2. **Comb (`🪮 Comb`):** Activates a 3D wooden cafe brush tracking drag strokes along the fur -> speed-synced brushing SFX, golden coat-sheen sparkles, content stretch / head-tilt animation.
3. **Feed Treats (`🐟 Treat`):** Tosses/presents a fish-shaped cafe biscuit -> cat leans forward, rhythmic nibbling + crunch SFX, mouth lick, small happy hop.
4. **Cat Customize (`🎩 Customize`):**
   - Slides open a compact Glassmorphism wardrobe drawer on the **right 40%** of the screen while framing the 3D cat on the **left 60%** (with horizontal drag-to-rotate preview).
   - **Category Tabs:** `Eyewear` | `Head` | `Neck` | `Cloth` | `Costume`.
   - Displays 5 circular color swatches under `Cloth` (**Pink, Yellow, Blue, White, Orange**) showing owned vs. `$50` locked states.
   - Displays clear milestone progress hints for locked items (e.g., `Beret — $4,200 / $10,000 Revenue`, `Dinosaur Costume — 6 / 9 Cosmetics Unlocked`).
   - Persists every cat's equipped slots immediately to `catLoadouts` in `localStorage`.

### Phase 5 Checklist
- [ ] Add left-edge glassmorphism Cat Icon button with unlock badge indicator.
- [ ] Build `0.55s` smooth camera zoom controller, `◀ Cat Switcher ▶`, and customer patience pause/bell indicator.
- [ ] Implement **Pet**, **Comb**, and **Feed Treats** touch/drag interactions, animations, SFX, and particle effects.
- [ ] Build the right-side 40% live-preview **Cat Customize** drawer (with left-side drag-to-rotate) and wire `catLoadouts` persistence.

---

## Phase 6: External Hologram Mode, Android Native Bridge & Cross-Platform QA

**Goal:** Enable seamless coexistence with Spotify, YouTube Music, and other external audio apps on Android APK via automatic boot/resume detection, live Hologram metadata display, and native transport controls, while maintaining a clean Web fallback.

### 6.1 Boot & Resume Flow (The "External First" Catch)

```text
[App Launches / Resumes from Background]
                  │
                  ▼
  Is External Audio Playing on Device?
    ├── YES ──► Auto-set Mode: EXTERNAL_HOLOGRAM
    │           • Mute in-game music engine (keep rain, espresso, bell SFX active)
    │           • Swap counter prop to 3D Hologram Screen
    │           • Render detected Track Title & Artist (or generic active state)
    │           • Show subtle HUD toast: "External music detected — Hologram Mode active"
    │
    └── NO  ──► Load Last Saved Mode (Default: VINYL)
                • If last saved mode was EXTERNAL, fall back to VINYL
                • Show 3D Turntable or Vintage Radio on counter
                • Resume playback (after first user gesture on Web)
```

**Mid-Session Transitions:**
- **External -> In-Game:** Pause external app, tap Hologram, switch to **Vinyl** or **Radio** to resume in-game music immediately.
- **In-Game -> External:** Minimize Klasik 3D, start Spotify/YT Music, return -> resume hook detects active external audio, fades out in-game music over `300ms`, and swaps the counter prop to the **Hologram Screen**.

### 6.2 Mode 3 (External App) Modal UI

```text
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│      ╔══════════════════════════════════════════════════╗      │
│      ║   ✦ EXTERNAL AUDIO CONNECTED (Spotify)           ║      │
│      ║                                                  ║      │
│      ║   Multo                                          ║      │
│      ║   Cup of Joe                         ▂ ▅ █ ▃ ▆   ║      │
│      ╚══════════════════════════════════════════════════╝      │
│                                                                │
│   Cafe Ambience SFX (Rain, Espresso, Bell)   🔊 ━━━━●━━━━━━    │
│   [ ⏮ ]  [ ⏯ ]  [ ⏭ ]             [ Switch to In-Game Music ]  │
└────────────────────────────────────────────────────────────────┘
```

- **Lightweight Metadata Only:** Renders Track Title, Artist, and Source App label (no album art fetching/texture syncing).
- **Dedicated Cafe Ambience Slider:** Lets players balance rain, grinder, purring, and bell SFX underneath their own external playlist.
- **One-Time Permission Prompt (APK Only):** If Notification Access is not granted, display `"EXTERNAL AUDIO ACTIVE"` on the hologram plus an unobtrusive **`Enable Song Title Display`** button inside the modal.

### 6.3 Android Native Bridge Architecture (Two-Tier)

- **Tier 1 (Zero Permissions):**
  - `AudioManager.isMusicActive()` detects active external playback on boot/resume.
  - **Audio Focus Coexistence:** Configure `MainActivity` / WebView audio settings so short Web Audio cafe SFX mix cleanly without requesting exclusive `AUDIOFOCUS_GAIN` (which would otherwise pause Spotify).
- **Tier 2 (One-Time Notification Access):**
  - Reads `METADATA_KEY_TITLE`, `METADATA_KEY_ARTIST`, and source package via `MediaSessionManager` and exposes transport commands (`playPause`, `next`, `previous`).

#### `AndroidManifest.xml` Registration
```xml
<service
    android:name=".audio.KlasikMediaListenerService"
    android:label="Klasik 3D Hologram Player"
    android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.service.notification.NotificationListenerService" />
    </intent-filter>
</service>
```

#### Kotlin JS Bridge (`KlasikNativeAudioBridge.kt`)
```kotlin
package com.boostedbycaffeine.klasik3d.audio

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject

class KlasikNativeAudioBridge(
    private val context: Context,
    private val webView: WebView
) {
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    @JavascriptInterface
    fun isExternalMusicActive(): Boolean {
        return audioManager.isMusicActive
    }

    @JavascriptInterface
    fun hasNotificationPermission(): Boolean {
        val flat = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        ) ?: return false
        return flat.contains(context.packageName)
    }

    @JavascriptInterface
    fun openNotificationPermission() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun sendMediaAction(action: String) {
        val controller = getActiveMediaController() ?: return
        when (action) {
            "playPause" -> {
                val state = controller.playbackState?.state
                if (state == PlaybackState.STATE_PLAYING) controller.transportControls.pause()
                else controller.transportControls.play()
            }
            "next" -> controller.transportControls.skipToNext()
            "previous" -> controller.transportControls.skipToPrevious()
        }
    }

    fun pushMetadataToWebView() {
        val controller = getActiveMediaController() ?: return
        val meta = controller.metadata ?: return
        val title = meta.getString(MediaMetadata.METADATA_KEY_TITLE) ?: "External Audio Active"
        val artist = meta.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: ""
        val isPlaying = controller.playbackState?.state == PlaybackState.STATE_PLAYING
        val sourceApp = mapPackageName(controller.packageName)

        val payload = JSONObject().apply {
            put("title", title)
            put("artist", artist)
            put("sourceApp", sourceApp)
            put("isPlaying", isPlaying)
        }

        webView.post {
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('klasik-external-media-update', { detail: $payload }));",
                null
            )
        }
    }

    private fun getActiveMediaController(): MediaController? {
        if (!hasNotificationPermission()) return null
        val manager = context.getSystemService(Context.MEDIA_SESSION_SERVICE) as MediaSessionManager
        val component = ComponentName(context, KlasikMediaListenerService::class.java)
        val sessions = manager.getActiveSessions(component)
        return sessions.firstOrNull {
            it.playbackState?.state == PlaybackState.STATE_PLAYING
        } ?: sessions.firstOrNull()
    }

    private fun mapPackageName(pkg: String): String = when {
        pkg.contains("spotify") -> "Spotify"
        pkg.contains("youtube.music") -> "YouTube Music"
        pkg.contains("apple.android.music") -> "Apple Music"
        pkg.contains("soundcloud") -> "SoundCloud"
        else -> "External App"
    }
}
```

#### Web Build Graceful Fallback
When `window.KlasikNativeAudio` is undefined (desktop or mobile browsers):
- **Vinyl Mode** and **Radio Mode** operate identically to the APK.
- **External Mode** remains manually selectable so Web players can display the 3D Hologram prop, mute in-game music, listen to Spotify Web in another tab, and balance Cafe Ambience SFX independently.

### 6.4 Final Cross-Platform Integration & QA Checklist
- [ ] Register `KlasikMediaListenerService` and attach `KlasikNativeAudioBridge` via `webView.addJavascriptInterface(bridge, "KlasikNativeAudio")`.
- [ ] Verify audio focus coexistence on physical Android devices (cafe SFX, cat purrs, and crunch audio must not pause Spotify/YT Music).
- [ ] Test boot/resume auto-Hologram catch, `300ms` music fade-out, and `Enable Song Title Display` permission flow on Android APK.
- [ ] Verify Web fallback for External Mode, BYO Vinyl file cleanup, and Radio stream `5000ms` timeout handling.
- [ ] Profile low-end mobile GPU/CPU performance with nighttime lights, all cats animated simultaneously with cosmetics equipped, Hologram EQ bars active, and 2 parked delivery scooters outside.