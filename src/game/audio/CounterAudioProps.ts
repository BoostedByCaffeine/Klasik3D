// Phase 2 & 6: 3D Counter Audio Props Manager (Vinyl Turntable / Vintage Radio Speaker / Floating Hologram)
// Preloads all 3 lightweight low-poly props once inside AudioDeviceRoot and toggles `.visible`
// with a single shared raycast hitbox (userData.interactable = 'audioDevice').
// Hologram uses an event-driven 512x256 CanvasTexture updated ONLY when metadata changes (never in rAF).

import * as THREE from 'three';
import { AudioModeId } from '../rules';

export interface HologramMetadata {
  title: string;
  artist: string;
  sourceApp: string;
  isPlaying: boolean;
}

export class CounterAudioProps {
  public readonly root: THREE.Group;
  public readonly hitbox: THREE.Mesh;

  private readonly vinylGroup: THREE.Group;
  private readonly radioGroup: THREE.Group;
  private readonly hologramGroup: THREE.Group;

  // Vinyl dynamic references (optional hooks into existing turntable meshes)
  private vinylLabelMaterial: THREE.MeshStandardMaterial | null = null;
  private defaultVinylLabelColor = new THREE.Color(0xe59a3c);

  // Radio dynamic references
  private radioNeedle: THREE.Mesh | null = null;
  private radioGlowMat: THREE.MeshStandardMaterial | null = null;
  private radioNeedleTargetX = 0;

  // Hologram dynamic references
  private hologramPanelGroup: THREE.Group | null = null;
  private hologramCanvas: HTMLCanvasElement | null = null;
  private hologramCtx: CanvasRenderingContext2D | null = null;
  private hologramTexture: THREE.CanvasTexture | null = null;
  private hologramEqBars: THREE.Mesh[] = [];
  private lastHoloKey = '';

  private activeMode: AudioModeId = 'vinyl';
  private isPlaying = false;

  constructor(existingVinylGroup?: THREE.Group, vinylLabelMat?: THREE.MeshStandardMaterial | null) {
    this.root = new THREE.Group();
    this.root.name = 'AudioDeviceRoot';

    // 1. Vinyl Turntable group (wraps existing turntable or builds fallback)
    this.vinylGroup = existingVinylGroup ?? new THREE.Group();
    this.vinylGroup.name = 'AudioProp_Vinyl';
    if (vinylLabelMat) {
      this.vinylLabelMaterial = vinylLabelMat;
      this.defaultVinylLabelColor.copy(vinylLabelMat.color);
    }
    this.root.add(this.vinylGroup);

    // 2. Vintage Cafe Radio Speaker
    this.radioGroup = this.buildVintageRadioProp();
    this.radioGroup.visible = false;
    this.root.add(this.radioGroup);

    // 3. Floating Rectangular Hologram (External Audio Mode)
    this.hologramGroup = this.buildHologramProp();
    this.hologramGroup.visible = false;
    this.root.add(this.hologramGroup);

    // 4. Shared invisible raycast hitbox covering counter prop footprint
    const hitGeo = new THREE.BoxGeometry(0.62, 0.42, 0.48);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.hitbox = new THREE.Mesh(hitGeo, hitMat);
    this.hitbox.position.set(0, 0.21, 0);
    this.hitbox.userData.interactable = 'audioDevice';
    this.hitbox.userData.toolAction = 'open_spotify_modal';
    this.hitbox.userData.hoverLabel = 'Audio Deck (Vinyl / Radio / External)';
    this.root.add(this.hitbox);

    this.updateHologramMetadata({
      title: 'External Audio Active',
      artist: 'Playing from your device',
      sourceApp: 'System Media',
      isPlaying: true,
    });
  }

  private buildVintageRadioProp(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'AudioProp_Radio';

    const walnutMat = new THREE.MeshStandardMaterial({
      color: 0x4b2e1e,
      roughness: 0.62,
      metalness: 0.08,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd99b43,
      roughness: 0.3,
      metalness: 0.78,
    });
    const grilleMat = new THREE.MeshStandardMaterial({
      color: 0x261a14,
      roughness: 0.85,
      metalness: 0.1,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.2,
      metalness: 0.88,
    });
    const dialBackMat = new THREE.MeshStandardMaterial({
      color: 0x3b2412,
      emissive: 0xf5a623,
      emissiveIntensity: 0.55,
      roughness: 0.4,
    });
    this.radioGlowMat = dialBackMat;

    // Main rounded-look walnut cabinet
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.25, 0.22), walnutMat);
    cabinet.position.set(0, 0.145, 0);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    group.add(cabinet);

    // 4 subtle brass feet
    const footGeo = new THREE.CylinderGeometry(0.016, 0.014, 0.022, 8);
    [
      [-0.19, 0.011, -0.08],
      [0.19, 0.011, -0.08],
      [-0.19, 0.011, 0.08],
      [0.19, 0.011, 0.08],
    ].forEach(([fx, fy, fz]) => {
      const foot = new THREE.Mesh(footGeo, brassMat);
      foot.position.set(fx, fy, fz);
      group.add(foot);
    });

    // Front brass bezel frame
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.21, 0.016), brassMat);
    bezel.position.set(0, 0.145, 0.112);
    group.add(bezel);

    // Left-side woven speaker grille + horizontal brass louver bars
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.165, 0.02), grilleMat);
    grille.position.set(-0.07, 0.145, 0.116);
    group.add(grille);

    const barGeo = new THREE.BoxGeometry(0.23, 0.008, 0.008);
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(barGeo, brassMat);
      bar.position.set(-0.07, 0.095 + i * 0.034, 0.127);
      group.add(bar);
    }

    // Right-side illuminated FM frequency dial strip
    const dialWindow = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.055, 0.018), dialBackMat);
    dialWindow.position.set(0.128, 0.185, 0.117);
    group.add(dialWindow);

    // Glowing amber/crimson tuning needle
    const needleMat = new THREE.MeshStandardMaterial({
      color: 0xff5a36,
      emissive: 0xff6b35,
      emissiveIntensity: 0.9,
    });
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.048, 0.008), needleMat);
    needle.position.set(0.128, 0.185, 0.128);
    this.radioNeedle = needle;
    group.add(needle);

    // Two tactile rotary tuning & volume knobs
    const knobGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.022, 12);
    knobGeo.rotateX(Math.PI / 2);
    const knob1 = new THREE.Mesh(knobGeo, brassMat);
    knob1.position.set(0.092, 0.105, 0.126);
    const knob2 = new THREE.Mesh(knobGeo, brassMat);
    knob2.position.set(0.162, 0.105, 0.126);
    group.add(knob1, knob2);

    // Sleek telescopic chrome FM antenna angled gracefully back-right
    const antennaBase = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.02, 8), chromeMat);
    antennaBase.position.set(0.18, 0.278, -0.06);
    group.add(antennaBase);

    const antennaRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0055, 0.34, 6), chromeMat);
    antennaRod.position.set(0.22, 0.43, -0.09);
    antennaRod.rotation.z = -0.22;
    antennaRod.rotation.x = -0.18;
    group.add(antennaRod);

    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), brassMat);
    antennaTip.position.set(0.258, 0.59, -0.12);
    group.add(antennaTip);

    return group;
  }

  private buildHologramProp(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'AudioProp_Hologram';

    // 1. Sleek matte obsidian emitter puck resting cleanly on counter
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x16110e,
      roughness: 0.35,
      metalness: 0.65,
    });
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      emissive: 0xf5a623,
      emissiveIntensity: 0.95,
      roughness: 0.2,
    });

    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.036, 20), baseMat);
    puck.position.set(0, 0.018, 0);
    group.add(puck);

    const emitterRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 8, 24), ringMat);
    emitterRing.rotation.x = Math.PI / 2;
    emitterRing.position.set(0, 0.038, 0);
    group.add(emitterRing);

    // Soft upward light cone beam
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xf5a623,
      transparent: true,
      opacity: 0.11,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beamCone = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.09, 0.16, 16, 1, true), coneMat);
    beamCone.position.set(0, 0.115, 0);
    group.add(beamCone);

    // 2. Floating Rectangular Hologram Display Panel
    const panelGroup = new THREE.Group();
    panelGroup.position.set(0, 0.255, 0);
    this.hologramPanelGroup = panelGroup;

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      this.hologramCanvas = canvas;
      this.hologramCtx = canvas.getContext('2d');
      this.hologramTexture = new THREE.CanvasTexture(canvas);
      this.hologramTexture.colorSpace = THREE.SRGBColorSpace;
      this.hologramTexture.minFilter = THREE.LinearFilter;
      this.hologramTexture.magFilter = THREE.LinearFilter;
    }

    const screenMat = new THREE.MeshBasicMaterial({
      map: this.hologramTexture ?? undefined,
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.26), screenMat);
    panelGroup.add(screenPlane);

    // Slim glowing amber holographic border bars (top & bottom)
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xf5a623,
      transparent: true,
      opacity: 0.78,
    });
    const topEdge = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.008, 0.006), borderMat);
    topEdge.position.set(0, 0.132, 0.002);
    const botEdge = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.008, 0.006), borderMat);
    botEdge.position.set(0, -0.132, 0.002);
    panelGroup.add(topEdge, botEdge);

    // 3. 5 Lightweight Animated Amber EQ Bars along the bottom-right of the hologram
    const eqMat = new THREE.MeshBasicMaterial({
      color: 0xffc66d,
      transparent: true,
      opacity: 0.9,
    });
    const barGeo = new THREE.BoxGeometry(0.018, 0.068, 0.008);
    barGeo.translate(0, 0.034, 0); // Anchor scale at bottom so .scale.y grows cleanly upward
    this.hologramEqBars = [];
    for (let i = 0; i < 5; i++) {
      const bar = new THREE.Mesh(barGeo, eqMat);
      bar.position.set(0.11 + i * 0.028, -0.095, 0.008);
      bar.scale.y = 0.25;
      panelGroup.add(bar);
      this.hologramEqBars.push(bar);
    }

    group.add(panelGroup);
    return group;
  }

  public setMode(mode: AudioModeId) {
    this.activeMode = mode;
    this.vinylGroup.visible = mode === 'vinyl';
    this.radioGroup.visible = mode === 'radio';
    this.hologramGroup.visible = mode === 'external';
    this.hitbox.userData.hoverLabel =
      mode === 'radio'
        ? 'Vintage Cafe Radio (Click to Tune)'
        : mode === 'external'
        ? 'External Audio Hologram (Click for Controls)'
        : 'Vinyl Turntable (Click to Open Audio Deck)';
  }

  public setPlaying(playing: boolean) {
    this.isPlaying = playing;
    if (this.radioGlowMat) {
      this.radioGlowMat.emissiveIntensity = playing ? 0.78 : 0.24;
    }
  }

  public setRadioFrequencyIndex(stationIndex: number, totalStations: number) {
    const ratio = totalStations > 1 ? (stationIndex % totalStations) / (totalStations - 1) : 0.5;
    this.radioNeedleTargetX = 0.075 + ratio * 0.106;
  }

  public setByoVinylActive(isCustomByo: boolean, accentHex?: string) {
    if (!this.vinylLabelMaterial) return;
    if (isCustomByo && accentHex) {
      this.vinylLabelMaterial.color.set(accentHex);
      this.vinylLabelMaterial.emissive.set(accentHex);
      this.vinylLabelMaterial.emissiveIntensity = 0.22;
    } else {
      this.vinylLabelMaterial.color.copy(this.defaultVinylLabelColor);
      this.vinylLabelMaterial.emissive.setHex(0x000000);
      this.vinylLabelMaterial.emissiveIntensity = 0;
    }
  }

  // Event-driven 512x256 CanvasTexture redraw — called ONLY when track/artist/source changes!
  public updateHologramMetadata(meta: HologramMetadata) {
    const key = `${meta.title}|${meta.artist}|${meta.sourceApp}|${meta.isPlaying ? 1 : 0}`;
    if (key === this.lastHoloKey) return;
    this.lastHoloKey = key;

    if (!this.hologramCtx || !this.hologramCanvas || !this.hologramTexture) return;
    const ctx = this.hologramCtx;
    const w = this.hologramCanvas.width;
    const h = this.hologramCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Frosted espresso glass backdrop
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'rgba(18, 12, 8, 0.86)');
    grad.addColorStop(1, 'rgba(32, 20, 11, 0.82)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(10, 10, w - 20, h - 20, 22);
    ctx.fill();

    // Crisp warm amber holographic border
    ctx.strokeStyle = 'rgba(245, 166, 35, 0.85)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Subtle scanline sheen
    ctx.fillStyle = 'rgba(245, 166, 35, 0.045)';
    for (let y = 18; y < h - 18; y += 8) {
      ctx.fillRect(16, y, w - 32, 2);
    }

    // Source App badge (top-left)
    const srcText = (meta.sourceApp || 'EXTERNAL AUDIO').toUpperCase().slice(0, 22);
    ctx.fillStyle = 'rgba(245, 166, 35, 0.22)';
    ctx.beginPath();
    ctx.roundRect(30, 28, Math.min(260, 28 + srcText.length * 11), 34, 10);
    ctx.fill();
    ctx.fillStyle = '#f5a623';
    ctx.font = '700 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(srcText, 44, 51);

    // Live indicator tag (top-right)
    ctx.fillStyle = meta.isPlaying ? '#34d399' : '#a8a29e';
    ctx.font = '700 17px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(meta.isPlaying ? '● LIVE SYNC' : '○ STANDBY', w - 32, 51);
    ctx.textAlign = 'left';

    // Track Title (truncated cleanly)
    const title = meta.title.length > 26 ? `${meta.title.slice(0, 25)}…` : meta.title;
    ctx.fillStyle = '#faf5ee';
    ctx.font = '800 32px system-ui, -apple-system, sans-serif';
    ctx.fillText(title, 32, 126);

    // Artist Subtitle
    const artist = meta.artist.length > 34 ? `${meta.artist.slice(0, 33)}…` : meta.artist;
    ctx.fillStyle = '#e7d7c1';
    ctx.font = '500 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(artist, 32, 166);

    // Footer hint
    ctx.fillStyle = 'rgba(245, 166, 35, 0.72)';
    ctx.font = '600 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('TAP TO OPEN AUDIO DECK', 32, 218);

    this.hologramTexture.needsUpdate = true;
  }

  // Lightweight per-frame animation — NEVER redraws CanvasTexture!
  public update(dt: number, elapsed: number) {
    if (this.activeMode === 'radio' && this.radioNeedle) {
      this.radioNeedle.position.x = THREE.MathUtils.damp(
        this.radioNeedle.position.x,
        this.radioNeedleTargetX,
        8,
        dt
      );
    }

    if (this.activeMode === 'external' && this.hologramPanelGroup) {
      // Gentle levitation bob
      this.hologramPanelGroup.position.y = 0.255 + Math.sin(elapsed * 2.1) * 0.012;
      this.hologramPanelGroup.rotation.y = Math.sin(elapsed * 0.9) * 0.04;

      // Animate 5 lightweight amber EQ bars via Y-scale only
      for (let i = 0; i < this.hologramEqBars.length; i++) {
        const bar = this.hologramEqBars[i];
        const targetY = this.isPlaying
          ? 0.28 + 0.72 * Math.abs(Math.sin(elapsed * (4.2 + i * 0.85) + i * 1.15))
          : 0.16;
        bar.scale.y = THREE.MathUtils.damp(bar.scale.y, targetY, 12, dt);
      }
    }
  }

  public dispose() {
    this.hologramTexture?.dispose();
  }
}
