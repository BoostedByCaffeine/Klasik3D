import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { STUDIO_LOGO_SVG_RAW } from '../components/StudioLogo';
import {
  BaristaStationId,
  KlasikGameState,
  SyrupFlavor,
  WeatherMode,
  getNextRecommendedStep,
  getRecipeById,
} from './rules';
import { SpotifyVinylState } from './spotifyManager';

// Pre-allocated scratch math objects (Zero GC in render loop)
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _tempVec = new THREE.Vector3();
const _lookMat = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();
const _upVec = new THREE.Vector3(0, 1, 0);
const _dummyObj = new THREE.Object3D();

export type StepAnimType =
  | 'grind'
  | 'tamp'
  | 'pull_espresso'
  | 'steam_milk'
  | 'add_ice'
  | 'add_syrup'
  | 'rinse_cup'
  | 'serve_drink';

export interface SceneInteractionCallbacks {
  onSelectStation: (station: BaristaStationId) => void;
  onToolAction: (
    action:
      | 'grind'
      | 'tamp'
      | 'pull_espresso'
      | 'steam_milk'
      | 'add_ice'
      | 'add_syrup'
      | 'rinse_cup'
      | 'serve_drink'
      | 'toggle_vinyl'
      | 'next_vinyl'
      | 'open_spotify_modal'
      | 'open_upgrades_modal'
      | 'open_recipes_modal',
    syrupFlavor?: 'vanilla' | 'caramel' | 'chocolate' | 'matcha'
  ) => void;
  onHoverToolChange: (label: string | null) => void;
  onFpsUpdate?: (fps: number) => void;
}

interface StationCameraPreset {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

const STATION_CAMERAS: Record<BaristaStationId, StationCameraPreset> = {
  1: {
    pos: new THREE.Vector3(-3.05, 1.65, 2.05),
    look: new THREE.Vector3(-2.55, 1.26, -0.85),
  },
  2: {
    pos: new THREE.Vector3(-0.98, 1.61, 1.92),
    look: new THREE.Vector3(-0.98, 1.18, -0.08),
  },
  3: {
    pos: new THREE.Vector3(1.02, 1.61, 1.92),
    look: new THREE.Vector3(1.02, 1.18, -0.08),
  },
  4: {
    pos: new THREE.Vector3(2.15, 1.66, 1.92),
    look: new THREE.Vector3(1.85, 1.16, -1.75),
  },
  5: {
    pos: new THREE.Vector3(3.35, 1.56, 1.55),
    look: new THREE.Vector3(3.4, 1.16, -0.02),
  },
};

interface ArticulatedCustomerActor {
  group: THREE.Group;
  pelvisGroup: THREE.Group;
  torsoGroup: THREE.Group;
  neckJoint: THREE.Group;
  leftShoulderJoint: THREE.Group;
  leftElbowJoint: THREE.Group;
  rightShoulderJoint: THREE.Group;
  rightElbowJoint: THREE.Group;
  leftHipJoint: THREE.Group;
  leftKneeJoint: THREE.Group;
  rightHipJoint: THREE.Group;
  rightKneeJoint: THREE.Group;
  leftEyeMesh: THREE.Mesh;
  rightEyeMesh: THREE.Mesh;
  heldCup: THREE.Group;
  currentPos: THREE.Vector3;
  seed: number;
}

interface ActiveStepAnimation {
  type: StepAnimType;
  progress: number;
  duration: number;
  flavor?: SyrupFlavor;
  badgeText?: string;
}

export class KlasikCafeScene3D {
  private container: HTMLElement;
  private callbacks: SceneInteractionCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private currentLookAt = new THREE.Vector3(0, 1.18, 0);

  private frameId = 0;
  private isDisposed = false;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private fpsFrames = 0;
  private fpsTimer = 0;

  // Lighting references
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private neonSignLight!: THREE.PointLight;
  private turntableLampLight!: THREE.PointLight;
  private cafeWarmLight!: THREE.PointLight;

  // Shared procedural textures
  private studioLogoTexture!: THREE.CanvasTexture;
  private woodBumpTexture!: THREE.CanvasTexture;
  private vinylLabelTexture!: THREE.CanvasTexture;
  private hangingSignTexture!: THREE.CanvasTexture;
  private latteArtTexture!: THREE.CanvasTexture;
  private floatingBadgeTexture!: THREE.CanvasTexture;

  // Dynamic materials for customization & highlighting
  private counterWoodMat!: THREE.MeshStandardMaterial;
  private ceramicMugMat!: THREE.MeshStandardMaterial;
  private neonTubeMat!: THREE.MeshStandardMaterial;
  private ghostSnapMat!: THREE.MeshStandardMaterial;

  // Interactive & animated 3D groups
  private interactables: THREE.Object3D[] = [];
  private toolGroups: Map<string, THREE.Object3D> = new Map();
  private hangingSignGroup!: THREE.Group;
  private titleHeroCupGroup!: THREE.Group;
  private titlePlaqueGroup!: THREE.Group;

  // Active Barista Cup & Internal Layers
  private activeBaristaCupGroup!: THREE.Group;
  private activeCupLiquidMesh!: THREE.Mesh;
  private activeCupFoamMesh!: THREE.Mesh;
  private activeCupDrizzleRing!: THREE.Mesh;
  private activeCupIceGroup!: THREE.Group;
  private ghostCupMesh!: THREE.Mesh;

  // Animated Barista Equipment Rig Parts
  private grinderGroup!: THREE.Group;
  private hopperBeansGroup!: THREE.Group;
  private groundStreamGroup!: THREE.Group;
  private portafilterGroup!: THREE.Group;
  private pfGroundsMoundMesh!: THREE.Mesh;
  private pfTampedPuckMesh!: THREE.Mesh;
  private tamperMeshGroup!: THREE.Group;
  private tampPressureRingMesh!: THREE.Mesh;
  private gaugeNeedles: THREE.Mesh[] = [];
  private groupHeadLedMat!: THREE.MeshStandardMaterial;
  private espressoStreamsGroup!: THREE.Group;
  private steamWandPivot!: THREE.Group;
  private milkPitcherGroup!: THREE.Group;
  private pitcherMilkMesh!: THREE.Mesh;
  private milkPourStreamMesh!: THREE.Mesh;
  private iceScoopGroup!: THREE.Group;
  private syrupPumpHeads: Map<string, THREE.Group> = new Map();
  private syrupRibbonMesh!: THREE.Mesh;
  private matchaWhiskGroup!: THREE.Group;
  private floatingBadgeSprite!: THREE.Sprite;
  private heartParticlesGroup!: THREE.Group;

  // Vinyl Turntable parts
  private vinylPlatterGroup!: THREE.Group;
  private vinylTonearmPivot!: THREE.Group;
  private vinylSleeveMesh!: THREE.Mesh;
  private musicNotesInstanced!: THREE.InstancedMesh;

  // Pooled Steam & Rain Particles (InstancedMesh)
  private steamParticlesInstanced!: THREE.InstancedMesh;
  private rainDropsInstanced!: THREE.InstancedMesh;
  private monsteraLeavesInstanced!: THREE.InstancedMesh;

  // 3D Articulated Customer Actors Pool
  private customerActors: Map<string, ArticulatedCustomerActor> = new Map();
  private customersRoot = new THREE.Group();

  // Current synced states
  private gameState: KlasikGameState;
  private spotifyState: SpotifyVinylState;
  private stepAnim: ActiveStepAnimation | null = null;
  private serveReachTimer = 0;

  private hoveredToolKey: string | null = null;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private lastRaycastTime = 0;
  private manualCameraYawOffset = 0;
  private manualCameraZoomOffset = 0;
  private isPointerDragging = false;
  private dragStartCoord = 0;

  constructor(
    container: HTMLElement,
    initialGameState: KlasikGameState,
    initialSpotifyState: SpotifyVinylState,
    callbacks: SceneInteractionCallbacks
  ) {
    this.container = container;
    this.gameState = initialGameState;
    this.spotifyState = initialSpotifyState;
    this.callbacks = callbacks;

    // 1. Software-WebGL Guard detection
    this.isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. WebGLRenderer Initialization
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const { width, height } = this.getEffectiveLandscapeDimensions();
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a120e);
    this.scene.fog = new THREE.FogExp2(0x1a120e, 0.045);

    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 60);
    this.camera.position.set(0.35, 1.42, 1.35);
    this.camera.lookAt(0.15, 1.12, 0.15);

    // 4. Studio Environment Map Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Build Procedural Textures
    this.initProceduralTextures();

    // 6. Build Lighting, Architecture, Barista Stations, 3D Vinyl Turntable & Garden
    this.initLights();
    this.initMaterials();
    this.buildCafeArchitecture();
    this.buildHangingTitleSign();
    this.buildStation1RegisterAndTickets();
    this.buildStation2EspressoBar();
    this.buildStation3MilkSyrupsAndIce();
    this.buildStation4ServeTrayAndGarden();
    this.buildStation5VinylTurntableCorner();
    this.buildFloatingBadgeAndHearts();
    this.buildPooledParticles();
    this.scene.add(this.customersRoot);

    // Sync initial state
    this.applyWeatherLighting(this.gameState.weather);
    this.updateDecorMaterials();
    this.updateActiveCupVisuals();
    this.syncCustomerActors();

    // Pre-warm shaders on hardware GPUs
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  private getEffectiveLandscapeDimensions(): {
    width: number;
    height: number;
    isPortraitRotated: boolean;
  } {
    const isPortraitRotated = window.innerHeight > window.innerWidth;
    if (isPortraitRotated) {
      return {
        width: Math.max(1, window.innerHeight),
        height: Math.max(1, window.innerWidth),
        isPortraitRotated: true,
      };
    }
    const rect = this.container.getBoundingClientRect();
    return {
      width: Math.max(1, rect.width || window.innerWidth),
      height: Math.max(1, rect.height || window.innerHeight),
      isPortraitRotated: false,
    };
  }

  private initProceduralTextures() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // A. Studio Logo CanvasTexture (Used ONLY on Title Screen Hero Diorama, NEVER on gameplay cups)
    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = 512;
    logoCanvas.height = 256;
    const lCtx = logoCanvas.getContext('2d')!;
    lCtx.fillStyle = '#f8f4ec';
    lCtx.fillRect(0, 0, 512, 256);
    lCtx.fillStyle = '#242B2E';
    lCtx.beginPath();
    lCtx.roundRect(24, 38, 464, 180, 22);
    lCtx.fill();
    lCtx.fillStyle = '#ffffff';
    lCtx.font = 'bold 44px sans-serif';
    lCtx.fillText('KLASIK 3D', 140, 142);

    this.studioLogoTexture = new THREE.CanvasTexture(logoCanvas);
    this.studioLogoTexture.colorSpace = THREE.SRGBColorSpace;
    this.studioLogoTexture.anisotropy = maxAniso;

    const svgBlob = new Blob([STUDIO_LOGO_SVG_RAW], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const svgImg = new Image();
    svgImg.onload = () => {
      lCtx.fillStyle = '#f8f4ec';
      lCtx.fillRect(0, 0, 512, 256);
      lCtx.drawImage(svgImg, 24, 56, 464, 144);
      this.studioLogoTexture.needsUpdate = true;
      URL.revokeObjectURL(svgUrl);
    };
    svgImg.onerror = () => {
      URL.revokeObjectURL(svgUrl);
    };
    svgImg.src = svgUrl;

    // B. Procedural Walnut Wood Grain Bump Texture
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = 256;
    woodCanvas.height = 256;
    const wCtx = woodCanvas.getContext('2d')!;
    wCtx.fillStyle = '#808080';
    wCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 180; i++) {
      const y = (i / 180) * 256;
      wCtx.strokeStyle = i % 2 === 0 ? '#686868' : '#969696';
      wCtx.lineWidth = 1.5;
      wCtx.beginPath();
      wCtx.moveTo(0, y);
      wCtx.bezierCurveTo(85, y + Math.sin(i) * 6, 170, y - Math.cos(i) * 6, 256, y);
      wCtx.stroke();
    }
    this.woodBumpTexture = new THREE.CanvasTexture(woodCanvas);
    this.woodBumpTexture.wrapS = THREE.RepeatWrapping;
    this.woodBumpTexture.wrapT = THREE.RepeatWrapping;
    this.woodBumpTexture.repeat.set(4, 2);

    // C. Procedural Rosetta / Heart Latte Art Texture
    const latteCanvas = document.createElement('canvas');
    latteCanvas.width = 256;
    latteCanvas.height = 256;
    const laCtx = latteCanvas.getContext('2d')!;
    const radGrad = laCtx.createRadialGradient(128, 128, 18, 128, 128, 124);
    radGrad.addColorStop(0, '#d99b66');
    radGrad.addColorStop(0.75, '#b06d3b');
    radGrad.addColorStop(1, '#7c3f18');
    laCtx.fillStyle = radGrad;
    laCtx.fillRect(0, 0, 256, 256);

    // Crisp white microfoam Rosetta leaves + heart tip
    laCtx.fillStyle = '#fffbeb';
    for (let i = 0; i < 6; i++) {
      const y = 175 - i * 18;
      const spread = 46 - i * 5;
      laCtx.beginPath();
      laCtx.ellipse(128 - spread * 0.55, y, spread * 0.55, 9, -0.35, 0, Math.PI * 2);
      laCtx.ellipse(128 + spread * 0.55, y, spread * 0.55, 9, 0.35, 0, Math.PI * 2);
      laCtx.fill();
    }
    // Top tulip heart
    laCtx.beginPath();
    laCtx.arc(116, 62, 16, 0, Math.PI * 2);
    laCtx.arc(140, 62, 16, 0, Math.PI * 2);
    laCtx.moveTo(101, 68);
    laCtx.lineTo(128, 98);
    laCtx.lineTo(155, 68);
    laCtx.fill();

    this.latteArtTexture = new THREE.CanvasTexture(latteCanvas);
    this.latteArtTexture.colorSpace = THREE.SRGBColorSpace;
    this.latteArtTexture.anisotropy = maxAniso;

    // D. Vinyl Record Center Label & Sleeve Texture
    const vinylCanvas = document.createElement('canvas');
    vinylCanvas.width = 256;
    vinylCanvas.height = 256;
    this.vinylLabelTexture = new THREE.CanvasTexture(vinylCanvas);
    this.vinylLabelTexture.colorSpace = THREE.SRGBColorSpace;
    this.vinylLabelTexture.anisotropy = maxAniso;
    this.redrawVinylLabelTexture();

    // E. Hanging 3D Wooden & Neon Sign Texture ("KLASIK 3D")
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 160;
    const sCtx = signCanvas.getContext('2d')!;
    sCtx.fillStyle = '#1d130d';
    sCtx.fillRect(0, 0, 512, 160);
    sCtx.strokeStyle = '#f59e0b';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(10, 10, 492, 140);
    sCtx.fillStyle = '#fef3c7';
    sCtx.font = 'bold 54px Georgia, serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('KLASIK 3D', 256, 82);
    sCtx.fillStyle = '#f59e0b';
    sCtx.font = '600 20px sans-serif';
    sCtx.fillText('GARAGE GARDEN CAFE · EST. 2026', 256, 122);

    this.hangingSignTexture = new THREE.CanvasTexture(signCanvas);
    this.hangingSignTexture.colorSpace = THREE.SRGBColorSpace;
    this.hangingSignTexture.anisotropy = maxAniso;

    // F. Floating 3D Telemetry / Reward Badge Texture
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 256;
    badgeCanvas.height = 96;
    this.floatingBadgeTexture = new THREE.CanvasTexture(badgeCanvas);
    this.floatingBadgeTexture.colorSpace = THREE.SRGBColorSpace;
  }

  private drawFloatingBadgeText(text: string, accentColor = '#10b981') {
    const canvas = this.floatingBadgeTexture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 256, 96);
    ctx.fillStyle = 'rgba(20, 14, 11, 0.92)';
    ctx.beginPath();
    ctx.roundRect(8, 12, 240, 72, 36);
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 48);
    this.floatingBadgeTexture.needsUpdate = true;
  }

  private createSyrupLabelTexture(title: string, sub: string, bgHex: string, borderHex: string) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 112);
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 128, 62);
    ctx.fillStyle = '#57534e';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(sub, 128, 92);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private redrawVinylLabelTexture() {
    const canvas = this.vinylLabelTexture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const track = this.spotifyState.currentTrack;
    ctx.fillStyle = track.sleeveColor || '#242B2E';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = track.accentColor || '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, 232, 232);

    ctx.fillStyle = track.accentColor || '#f59e0b';
    ctx.beginPath();
    ctx.arc(128, 105, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(128, 105, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(track.coverText || 'KLASIK SESSIONS', 128, 182);

    ctx.fillStyle = '#d1d5db';
    ctx.font = '13px monospace';
    ctx.fillText(`GARAGE VINYL · ${this.spotifyState.rpm} RPM`, 128, 212);

    this.vinylLabelTexture.needsUpdate = true;
  }

  private initLights() {
    this.sunLight = new THREE.DirectionalLight(0xffe4b5, 2.2);
    this.sunLight.position.set(4.5, 7.5, -5.5);
    this.sunLight.castShadow = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      this.sunLight.shadow.mapSize.set(1024, 1024);
      const d = 6.5;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.camera.near = 0.5;
      this.sunLight.shadow.camera.far = 20;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x3e2723, 0.85);
    this.hemiLight.position.set(0, 8, 0);
    this.scene.add(this.hemiLight);

    this.cafeWarmLight = new THREE.PointLight(0xffb74d, 1.85, 12, 1.6);
    this.cafeWarmLight.position.set(-0.5, 2.75, 0.4);
    this.scene.add(this.cafeWarmLight);

    this.neonSignLight = new THREE.PointLight(0xf59e0b, 1.4, 7, 1.8);
    this.neonSignLight.position.set(0, 2.35, -0.1);
    this.scene.add(this.neonSignLight);

    this.turntableLampLight = new THREE.PointLight(0xfbbf24, 1.2, 4.5, 2);
    this.turntableLampLight.position.set(3.45, 1.45, 0.25);
    this.scene.add(this.turntableLampLight);
  }

  private initMaterials() {
    this.counterWoodMat = new THREE.MeshStandardMaterial({
      color: 0x4a2c18,
      roughness: 0.42,
      metalness: 0.08,
      bumpMap: this.woodBumpTexture,
      bumpScale: 0.015,
    });

    // Clean, unbranded glazed porcelain material for gameplay cups (Branding Isolation Rule)
    this.ceramicMugMat = new THREE.MeshStandardMaterial({
      color: 0xf8f5f0,
      roughness: 0.14,
      metalness: 0.05,
    });

    this.neonTubeMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    this.ghostSnapMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
  }

  private buildCafeArchitecture() {
    const archGroup = new THREE.Group();

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x261c16,
      roughness: 0.78,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    archGroup.add(floorMesh);

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a1e,
      roughness: 0.9,
      metalness: 0.0,
    });
    const grassPlane = new THREE.Mesh(new THREE.PlaneGeometry(28, 22), grassMat);
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.position.set(0, -0.02, -9.5);
    grassPlane.receiveShadow = true;
    archGroup.add(grassPlane);

    // Outdoor Stone Pathway Slabs leading to Garden Tables
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x44403c,
      roughness: 0.85,
    });
    for (let i = 0; i < 6; i++) {
      const slab = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.025, 8), stoneMat);
      slab.position.set(-1.5 + i * 0.75, 0.005, -1.8 - (i % 2) * 0.55);
      archGroup.add(slab);
    }

    // Main Walnut Barista Counter
    const counterBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1c1512,
      roughness: 0.7,
      metalness: 0.15,
    });
    const counterBody = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.96, 1.38), counterBaseMat);
    counterBody.position.set(0.2, 0.48, 0.15);
    counterBody.castShadow = true;
    counterBody.receiveShadow = true;
    archGroup.add(counterBody);

    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(9.05, 0.08, 1.54),
      this.counterWoodMat
    );
    counterTop.position.set(0.2, 1.0, 0.15);
    counterTop.castShadow = true;
    counterTop.receiveShadow = true;
    archGroup.add(counterTop);

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.22,
      metalness: 0.88,
    });
    const brassTrim = new THREE.Mesh(new THREE.BoxGeometry(9.06, 0.025, 1.56), brassMat);
    brassTrim.position.set(0.2, 0.955, 0.15);
    archGroup.add(brassTrim);

    // Garage Garden Open Archway Pillars & Pergola Beams
    const brickMat = new THREE.MeshStandardMaterial({
      color: 0x3b2318,
      roughness: 0.85,
      metalness: 0.05,
    });
    [-4.35, 4.75].forEach((x) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.6, 0.65), brickMat);
      pillar.position.set(x, 1.8, -0.8);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      archGroup.add(pillar);
    });

    const headerBeam = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.45, 0.7), brickMat);
    headerBeam.position.set(0.2, 3.4, -0.8);
    archGroup.add(headerBeam);

    // Pergola rafters across the garden
    for (let i = -3; i <= 3; i++) {
      const rafter = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.18, 4.8),
        this.counterWoodMat
      );
      rafter.position.set(i * 1.25, 3.15, -2.9);
      archGroup.add(rafter);
    }

    // Title-Only Studio Plaque (Hidden during gameplay to enforce Branding Isolation Rule)
    this.titlePlaqueGroup = new THREE.Group();
    const plaqueFrame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.58, 0.06), brassMat);
    this.titlePlaqueGroup.add(plaqueFrame);
    const plaqueFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.06, 0.5),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.studioLogoTexture,
        emissive: 0xffffff,
        emissiveMap: this.studioLogoTexture,
        emissiveIntensity: 0.35,
        roughness: 0.25,
      })
    );
    plaqueFace.position.z = 0.035;
    this.titlePlaqueGroup.add(plaqueFace);
    this.titlePlaqueGroup.position.set(4.35, 2.05, -0.44);
    this.titlePlaqueGroup.rotation.y = -0.25;
    archGroup.add(this.titlePlaqueGroup);

    // Title Diorama Hero Steaming Latte Cup
    this.titleHeroCupGroup = this.createPorcelainCupMesh(1.18, true, true);
    this.titleHeroCupGroup.position.set(0.18, 1.04, 0.42);
    this.titleHeroCupGroup.rotation.y = 0.35;
    archGroup.add(this.titleHeroCupGroup);

    this.scene.add(archGroup);
  }

  // Creates a realistic Lathe/Tapered porcelain cup with saucer & spoon (No StudioLogo in gameplay)
  private createPorcelainCupMesh(
    scale = 1,
    withLatteArt = false,
    useTitleBranding = false
  ): THREE.Group {
    const group = new THREE.Group();

    const saucerMat = new THREE.MeshStandardMaterial({
      color: 0xebe4da,
      roughness: 0.18,
      metalness: 0.05,
    });
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.085, 0.02, 24), saucerMat);
    saucer.position.y = 0.01;
    group.add(saucer);

    const spoonMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.9,
    });
    const spoon = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.004, 0.014), spoonMat);
    spoon.position.set(0.02, 0.022, 0.068);
    spoon.rotation.y = 0.25;
    group.add(spoon);

    const mugInteriorMat = new THREE.MeshStandardMaterial({
      color: withLatteArt ? 0x4a2511 : 0xf5ebe1,
      roughness: 0.25,
      metalness: 0.04,
    });

    const wallMat = useTitleBranding
      ? new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.18,
          metalness: 0.05,
          map: this.studioLogoTexture,
        })
      : this.ceramicMugMat;

    const cupBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.086, 0.068, 0.135, 24, 1, false),
      [wallMat, mugInteriorMat, saucerMat]
    );
    cupBody.position.y = 0.082;
    cupBody.castShadow = true;
    group.add(cupBody);

    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.04, 0.011, 12, 24, Math.PI),
      this.ceramicMugMat
    );
    handle.rotation.z = -Math.PI / 2;
    handle.position.set(0.078, 0.085, 0);
    group.add(handle);

    if (withLatteArt) {
      const liquidDisk = new THREE.Mesh(
        new THREE.CircleGeometry(0.081, 24),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: this.latteArtTexture,
          roughness: 0.28,
        })
      );
      liquidDisk.rotation.x = -Math.PI / 2;
      liquidDisk.position.y = 0.151;
      group.add(liquidDisk);
    }

    group.scale.setScalar(scale);
    return group;
  }

  private buildHangingTitleSign() {
    this.hangingSignGroup = new THREE.Group();

    const woodFrameMat = new THREE.MeshStandardMaterial({
      color: 0x2d1a10,
      roughness: 0.55,
      metalness: 0.15,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.85,
    });

    const board = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.68, 0.1), woodFrameMat);
    board.castShadow = true;
    this.hangingSignGroup.add(board);

    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(2.18, 0.58),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.hangingSignTexture,
        emissive: 0xf59e0b,
        emissiveMap: this.hangingSignTexture,
        emissiveIntensity: 0.65,
        roughness: 0.25,
      })
    );
    signFace.position.z = 0.055;
    this.hangingSignGroup.add(signFace);

    const topTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 2.22, 12),
      this.neonTubeMat
    );
    topTube.rotation.z = Math.PI / 2;
    topTube.position.set(0, 0.31, 0.06);
    this.hangingSignGroup.add(topTube);

    const botTube = topTube.clone();
    botTube.position.set(0, -0.31, 0.06);
    this.hangingSignGroup.add(botTube);

    [-0.85, 0.85].forEach((x) => {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8), brassMat);
      chain.position.set(x, 0.75, 0);
      this.hangingSignGroup.add(chain);
    });

    this.hangingSignGroup.position.set(0.25, 1.72, -0.48);
    this.scene.add(this.hangingSignGroup);
  }

  private registerInteractiveTool(
    key: string,
    group: THREE.Object3D,
    label: string,
    station: BaristaStationId,
    onClick: () => void
  ) {
    group.userData = {
      toolKey: key,
      label,
      station,
      onClick,
    };
    group.traverse((child) => {
      child.userData = {
        toolKey: key,
        label,
        station,
        onClick,
      };
    });
    this.toolGroups.set(key, group);
    this.interactables.push(group);
  }

  // Station 1: Order & Register View
  private buildStation1RegisterAndTickets() {
    const st1Group = new THREE.Group();

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.35,
      metalness: 0.75,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.85,
    });
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      emissive: 0x10b981,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    });

    const registerGroup = new THREE.Group();
    const drawerBase = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.46), darkMetalMat);
    drawerBase.position.y = 0.07;
    registerGroup.add(drawerBase);

    const brassTrim = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.02, 0.48), brassMat);
    brassTrim.position.y = 0.145;
    registerGroup.add(brassTrim);

    const standNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.22, 16), brassMat);
    standNeck.position.set(0, 0.24, -0.05);
    registerGroup.add(standNeck);

    const posScreenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.32, 0.04), darkMetalMat);
    posScreenFrame.position.set(0, 0.38, 0.02);
    posScreenFrame.rotation.x = -0.35;
    registerGroup.add(posScreenFrame);

    const posDisplay = new THREE.Mesh(new THREE.PlaneGeometry(0.41, 0.27), screenMat);
    posDisplay.position.set(0, 0.38, 0.042);
    posDisplay.rotation.x = -0.35;
    registerGroup.add(posDisplay);

    registerGroup.position.set(-2.95, 1.04, 0.15);
    this.registerInteractiveTool(
      'register',
      registerGroup,
      'Order Register & Recipe Codex — Click to View Recipes',
      1,
      () => this.callbacks.onToolAction('open_recipes_modal')
    );
    st1Group.add(registerGroup);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.04), brassMat);
    rail.position.set(-2.8, 1.98, 0.05);
    st1Group.add(rail);

    const paperMat = new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      roughness: 0.75,
    });
    for (let i = 0; i < 3; i++) {
      const ticket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.01), paperMat);
      ticket.position.set(-3.25 + i * 0.42, 1.81, 0.06);
      st1Group.add(ticket);
    }

    this.scene.add(st1Group);
  }

  // Station 2: High-Detail Commercial Espresso Machine, Conical Burr Grinder, Knock Box & Tamper
  private buildStation2EspressoBar() {
    const st2Group = new THREE.Group();

    const brushedSteelMat = new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      roughness: 0.2,
      metalness: 0.88,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.1,
      metalness: 0.96,
    });
    const matteBlackMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.5,
      metalness: 0.35,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.22,
      metalness: 0.88,
    });
    const beanMat = new THREE.MeshStandardMaterial({
      color: 0x3b1d0e,
      roughness: 0.55,
      metalness: 0.05,
    });

    // 1. Commercial Conical Burr Grinder with Transparent Polycarbonate Hopper & 3D Roasted Beans
    this.grinderGroup = new THREE.Group();

    const grinderBaseFoot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.2, 0.05, 24),
      chromeMat
    );
    grinderBaseFoot.position.y = 0.025;
    this.grinderGroup.add(grinderBaseFoot);

    const grinderTower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.145, 0.165, 0.38, 24),
      matteBlackMat
    );
    grinderTower.position.y = 0.23;
    grinderTower.castShadow = true;
    this.grinderGroup.add(grinderTower);

    // Micrometric Grind Adjustment Brass Collar with Knurling
    const grindCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.162, 0.162, 0.055, 24),
      brassMat
    );
    grindCollar.position.y = 0.44;
    this.grinderGroup.add(grindCollar);

    // Portafilter Holding Fork below Dosing Chute
    const forkLeft = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.015, 0.14), chromeMat);
    forkLeft.position.set(-0.055, 0.15, 0.18);
    this.grinderGroup.add(forkLeft);
    const forkRight = forkLeft.clone();
    forkRight.position.x = 0.055;
    this.grinderGroup.add(forkRight);

    // Angled Metallic Dosing Chute
    const chute = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.035, 0.18, 16), chromeMat);
    chute.rotation.x = 0.45;
    chute.position.set(0, 0.31, 0.16);
    this.grinderGroup.add(chute);

    // Transparent Polycarbonate Bean Hopper
    const hopperGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xfffbeb,
      roughness: 0.08,
      metalness: 0,
      transmission: this.isSoftwareGl ? 0 : 0.78,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.38 : 0.92,
    });
    const hopper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.125, 0.28, 24),
      hopperGlassMat
    );
    hopper.position.y = 0.6;
    this.grinderGroup.add(hopper);

    // Visible Roasted Coffee Beans inside Hopper (Swirls during animateGrind)
    this.hopperBeansGroup = new THREE.Group();
    this.hopperBeansGroup.position.y = 0.56;
    const beanCore = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.11, 0.16, 20), beanMat);
    this.hopperBeansGroup.add(beanCore);

    const singleBeanGeo = new THREE.SphereGeometry(0.022, 8, 8);
    singleBeanGeo.scale(1.35, 0.85, 1.0);
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const r = 0.04 + (i % 4) * 0.032;
      const bean = new THREE.Mesh(singleBeanGeo, beanMat);
      bean.position.set(Math.cos(angle) * r, 0.085 + (i % 3) * 0.012, Math.sin(angle) * r);
      bean.rotation.set(i * 0.5, angle, 0.3);
      this.hopperBeansGroup.add(bean);
    }
    this.grinderGroup.add(this.hopperBeansGroup);

    const hopperLid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.215, 0.028, 24),
      matteBlackMat
    );
    hopperLid.position.y = 0.75;
    this.grinderGroup.add(hopperLid);

    // Falling Ground Coffee Particles Stream (Visible during animateGrind)
    this.groundStreamGroup = new THREE.Group();
    this.groundStreamGroup.position.set(0, 0.21, 0.21);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e1508, roughness: 0.9 });
    for (let i = 0; i < 10; i++) {
      const speck = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), groundMat);
      speck.position.set(
        Math.sin(i * 2.1) * 0.015,
        -(i / 10) * 0.09,
        Math.cos(i * 2.1) * 0.015
      );
      this.groundStreamGroup.add(speck);
    }
    this.groundStreamGroup.visible = false;
    this.grinderGroup.add(this.groundStreamGroup);

    this.grinderGroup.position.set(-1.68, 1.04, -0.05);
    this.registerInteractiveTool(
      'grinder',
      this.grinderGroup,
      'Conical Burr Grinder — Click to Grind 18g Fresh Dark-Roast Beans',
      2,
      () => this.callbacks.onToolAction('grind')
    );
    st2Group.add(this.grinderGroup);

    // 2. Stainless Knock Box with Rubberized Bar & Spent Espresso Pucks
    const knockBoxGroup = new THREE.Group();
    const kbOuter = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.24), brushedSteelMat);
    kbOuter.position.y = 0.07;
    knockBoxGroup.add(kbOuter);

    const kbInterior = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.03, 0.21), matteBlackMat);
    kbInterior.position.y = 0.132;
    knockBoxGroup.add(kbInterior);

    const knockBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.21, 12),
      matteBlackMat
    );
    knockBar.rotation.z = Math.PI / 2;
    knockBar.position.set(0, 0.138, 0.02);
    knockBoxGroup.add(knockBar);

    const spentPuck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.025, 16), beanMat);
    spentPuck.position.set(-0.03, 0.14, -0.04);
    spentPuck.rotation.z = 0.2;
    knockBoxGroup.add(spentPuck);

    knockBoxGroup.position.set(-1.98, 1.04, 0.22);
    this.registerInteractiveTool(
      'sink',
      knockBoxGroup,
      'Knock Box & Rinse Station [Key R] — Click to Dump & Rinse Cup',
      2,
      () => this.callbacks.onToolAction('rinse_cup')
    );
    st2Group.add(knockBoxGroup);

    // 3. Corner Silicone Tamping Mat, Calibrated Tamper & Lathe-Turned Portafilter
    const tampStationGroup = new THREE.Group();
    const siliconeMat = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.024, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88 })
    );
    siliconeMat.position.y = 0.012;
    tampStationGroup.add(siliconeMat);

    // Calibrated Stainless + Walnut Tamper (Animated during animateTamp)
    this.tamperMeshGroup = new THREE.Group();
    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.025, 24), chromeMat);
    tBase.position.y = 0.0125;
    this.tamperMeshGroup.add(tBase);

    const tNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.042, 0.035, 20), chromeMat);
    tNeck.position.y = 0.042;
    this.tamperMeshGroup.add(tNeck);

    const tGrip = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 20, 16),
      this.counterWoodMat
    );
    tGrip.scale.set(1, 1.35, 1);
    tGrip.position.y = 0.095;
    this.tamperMeshGroup.add(tGrip);

    this.tamperMeshGroup.position.set(-0.11, 0.024, -0.02);
    tampStationGroup.add(this.tamperMeshGroup);

    // Green 30-lb Pressure Ring around Portafilter Basket (Expands during animateTamp)
    this.tampPressureRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.068, 0.088, 24),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      })
    );
    this.tampPressureRingMesh.rotation.x = -Math.PI / 2;
    this.tampPressureRingMesh.position.set(0.08, 0.09, 0.02);
    this.tampPressureRingMesh.visible = false;
    tampStationGroup.add(this.tampPressureRingMesh);

    tampStationGroup.position.set(-1.22, 1.04, 0.22);
    this.registerInteractiveTool(
      'tamper',
      tampStationGroup,
      'Calibrated Tamper & Portafilter — Click to Tamp Grounds at 30 lbs',
      2,
      () => this.callbacks.onToolAction('tamp')
    );
    st2Group.add(tampStationGroup);

    // Articulated Portafilter with Twin Spouts, Fluffy Grounds Mound & Flat Tamped Puck
    this.portafilterGroup = new THREE.Group();
    const pfBasket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.066, 0.056, 0.052, 24),
      chromeMat
    );
    this.portafilterGroup.add(pfBasket);

    // Twin Curved Spouts under Basket
    [-0.022, 0.022].forEach((sx) => {
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, 0.032, 12), chromeMat);
      spout.position.set(sx, -0.035, 0);
      spout.rotation.z = sx < 0 ? 0.25 : -0.25;
      this.portafilterGroup.add(spout);
    });

    // Ergonomic Lathe-style Angled Walnut Handle
    const pfCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 12), chromeMat);
    pfCollar.rotation.x = Math.PI / 2;
    pfCollar.position.set(0, 0.005, 0.085);
    this.portafilterGroup.add(pfCollar);

    const pfWoodHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.021, 0.029, 0.19, 16),
      this.counterWoodMat
    );
    pfWoodHandle.rotation.x = Math.PI / 2;
    pfWoodHandle.position.set(0, 0.005, 0.19);
    this.portafilterGroup.add(pfWoodHandle);

    // Fluffy Coffee Grounds Mound inside Basket
    this.pfGroundsMoundMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x43200d, roughness: 0.92 })
    );
    this.pfGroundsMoundMesh.position.y = 0.018;
    this.pfGroundsMoundMesh.visible = false;
    this.portafilterGroup.add(this.pfGroundsMoundMesh);

    // Flat Polished Dark-Roast Tamped Puck inside Basket
    this.pfTampedPuckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.059, 0.059, 0.012, 20),
      new THREE.MeshStandardMaterial({ color: 0x291307, roughness: 0.45 })
    );
    this.pfTampedPuckMesh.position.y = 0.022;
    this.pfTampedPuckMesh.visible = false;
    this.portafilterGroup.add(this.pfTampedPuckMesh);

    this.portafilterGroup.position.set(-1.14, 1.095, 0.24);
    st2Group.add(this.portafilterGroup);

    // 4. Commercial Dual-Boiler Espresso Machine (La Marzocco Linea / Victoria Arduino Style)
    const espressoGroup = new THREE.Group();

    // Brushed Stainless Lower & Main Chassis
    const mainChassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.54, 0.56),
      brushedSteelMat
    );
    mainChassis.position.y = 0.29;
    mainChassis.castShadow = true;
    espressoGroup.add(mainChassis);

    // Curved Top Hood
    const topHood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.27, 1.0, 20, 1, false, 0, Math.PI),
      brushedSteelMat
    );
    topHood.rotation.z = Math.PI / 2;
    topHood.scale.set(0.28, 1, 1);
    topHood.position.set(0, 0.55, -0.01);
    espressoGroup.add(topHood);

    // Sculpted Walnut Side Cheeks
    [-0.515, 0.515].forEach((sx) => {
      const cheek = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.48, 0.5),
        this.counterWoodMat
      );
      cheek.position.set(sx, 0.29, -0.01);
      espressoGroup.add(cheek);
    });

    // Slotted Stainless Drip Tray & Red Water-Level Float Indicator
    const dripTrayBox = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.055, 0.3), matteBlackMat);
    dripTrayBox.position.set(0, 0.028, 0.26);
    espressoGroup.add(dripTrayBox);

    const dripGrate = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.012, 0.26), chromeMat);
    dripGrate.position.set(0, 0.058, 0.26);
    espressoGroup.add(dripGrate);

    for (let s = -4; s <= 4; s++) {
      const slotLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.014, 0.18),
        matteBlackMat
      );
      slotLine.position.set(s * 0.095, 0.059, 0.26);
      espressoGroup.add(slotLine);
    }

    const redFloat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
    );
    redFloat.position.set(0.41, 0.064, 0.34);
    espressoGroup.add(redFloat);

    // Twin Polished Chrome Group Head Shrouds, Dispersion Screens & Dual Pressure Gauges
    this.groupHeadLedMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.4,
    });
    this.gaugeNeedles = [];

    [-0.22, 0.22].forEach((gx) => {
      const shroud = new THREE.Mesh(
        new THREE.CylinderGeometry(0.092, 0.082, 0.11, 24),
        chromeMat
      );
      shroud.position.set(gx, 0.35, 0.28);
      espressoGroup.add(shroud);

      const bayonetRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.072, 0.072, 0.03, 24),
        matteBlackMat
      );
      bayonetRing.position.set(gx, 0.29, 0.28);
      espressoGroup.add(bayonetRing);

      const ledRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.084, 0.006, 8, 24),
        this.groupHeadLedMat
      );
      ledRing.rotation.x = Math.PI / 2;
      ledRing.position.set(gx, 0.39, 0.28);
      espressoGroup.add(ledRing);

      // Circular Pressure Gauge with White Dial & Animated Red Needle
      const gaugeBezel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.058, 0.026, 24),
        brassMat
      );
      gaugeBezel.rotation.x = Math.PI / 2;
      gaugeBezel.position.set(gx, 0.47, 0.285);
      espressoGroup.add(gaugeBezel);

      const gaugeFace = new THREE.Mesh(
        new THREE.CircleGeometry(0.048, 20),
        new THREE.MeshBasicMaterial({ color: 0xfefce8 })
      );
      gaugeFace.position.set(gx, 0.47, 0.3);
      espressoGroup.add(gaugeFace);

      const needle = new THREE.Mesh(
        new THREE.BoxGeometry(0.006, 0.038, 0.004),
        new THREE.MeshBasicMaterial({ color: 0xdc2626 })
      );
      needle.position.set(gx, 0.47, 0.303);
      needle.rotation.z = 0.8; // 0 bar resting angle
      espressoGroup.add(needle);
      this.gaugeNeedles.push(needle);
    });

    // Center Digital PID Shot-Timer LED Display
    const pidScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.055),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.75,
      })
    );
    pidScreen.position.set(0, 0.47, 0.285);
    espressoGroup.add(pidScreen);

    // Upper Cup-Warmer Rail Stacked with Inverted Porcelain Espresso Cups
    const warmerRail = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.035, 0.46), brassMat);
    warmerRail.position.set(0, 0.59, -0.01);
    espressoGroup.add(warmerRail);

    [-0.32, -0.11, 0.11, 0.32].forEach((cx) => {
      const stackedCup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.058, 0.085, 16),
        this.ceramicMugMat
      );
      stackedCup.position.set(cx, 0.645, -0.04);
      espressoGroup.add(stackedCup);
    });

    // Articulated Ball-Joint Stainless Steam Wand & Rotary Steam Knob (Right Side)
    this.steamWandPivot = new THREE.Group();
    this.steamWandPivot.position.set(0.42, 0.38, 0.28);

    const ballJoint = new THREE.Mesh(new THREE.SphereGeometry(0.024, 14, 14), chromeMat);
    this.steamWandPivot.add(ballJoint);

    const wandTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.007, 0.25, 12),
      chromeMat
    );
    wandTube.position.set(0.03, -0.11, 0.03);
    wandTube.rotation.z = 0.22;
    this.steamWandPivot.add(wandTube);

    const rubberSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.065, 12),
      matteBlackMat
    );
    rubberSleeve.position.set(0.018, -0.06, 0.018);
    rubberSleeve.rotation.z = 0.22;
    this.steamWandPivot.add(rubberSleeve);

    espressoGroup.add(this.steamWandPivot);

    // Twin Glossy Espresso Streams ("Mouse Tails", visible during animateExtract)
    this.espressoStreamsGroup = new THREE.Group();
    this.espressoStreamsGroup.position.set(-0.22, 0.18, 0.28);
    const streamMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      emissive: 0x451a03,
      emissiveIntensity: 0.4,
      roughness: 0.1,
    });
    [-0.018, 0.018].forEach((sx) => {
      const tail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.003, 0.16, 10),
        streamMat
      );
      tail.position.set(sx, 0, 0);
      this.espressoStreamsGroup.add(tail);
    });
    this.espressoStreamsGroup.visible = false;
    espressoGroup.add(this.espressoStreamsGroup);

    espressoGroup.position.set(-0.55, 1.04, -0.08);
    this.registerInteractiveTool(
      'espresso',
      espressoGroup,
      'Commercial Dual-Boiler Espresso Machine — Click to Pull 9-Bar Double Shot',
      2,
      () => this.callbacks.onToolAction('pull_espresso')
    );
    st2Group.add(espressoGroup);

    // 5. Active Barista Cup on Espresso Drip Tray (Clean Glazed Porcelain, Zero StudioLogo)
    this.activeBaristaCupGroup = this.createPorcelainCupMesh(1.06, false, false);
    this.activeBaristaCupGroup.position.set(-0.77, 1.098, 0.2);

    // Dynamic Liquid Cylinder inside Active Cup
    this.activeCupLiquidMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.064, 0.11, 24),
      new THREE.MeshStandardMaterial({ color: 0x3b1d0e, roughness: 0.22 })
    );
    this.activeCupLiquidMesh.position.y = 0.082;
    this.activeCupLiquidMesh.visible = false;
    this.activeBaristaCupGroup.add(this.activeCupLiquidMesh);

    // Dynamic Steamed Milk Rosetta Latte Art Layer
    this.activeCupFoamMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.08, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.latteArtTexture,
        roughness: 0.3,
      })
    );
    this.activeCupFoamMesh.rotation.x = -Math.PI / 2;
    this.activeCupFoamMesh.position.y = 0.146;
    this.activeCupFoamMesh.visible = false;
    this.activeBaristaCupGroup.add(this.activeCupFoamMesh);

    // Syrup Surface Drizzle Swirl Ring
    this.activeCupDrizzleRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.048, 0.005, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2 })
    );
    this.activeCupDrizzleRing.rotation.x = Math.PI / 2;
    this.activeCupDrizzleRing.position.y = 0.148;
    this.activeCupDrizzleRing.visible = false;
    this.activeBaristaCupGroup.add(this.activeCupDrizzleRing);

    // Dynamic Translucent Ice Cubes Group inside Active Cup
    this.activeCupIceGroup = new THREE.Group();
    const iceMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.08,
      transmission: this.isSoftwareGl ? 0 : 0.88,
      transparent: true,
      opacity: 0.8,
    });
    for (let i = 0; i < 4; i++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.034, 0.034), iceMat);
      const angle = (i / 4) * Math.PI * 2;
      cube.position.set(Math.cos(angle) * 0.026, 0.138, Math.sin(angle) * 0.026);
      cube.rotation.set(i * 0.4, i * 0.7, 0.2);
      this.activeCupIceGroup.add(cube);
    }
    this.activeCupIceGroup.visible = false;
    this.activeBaristaCupGroup.add(this.activeCupIceGroup);
    st2Group.add(this.activeBaristaCupGroup);

    this.scene.add(st2Group);
  }

  // Station 3: Milk Steaming Pitcher, Tiered Syrup Rack, Matcha Chawan & Whisk, Ice Bin
  private buildStation3MilkSyrupsAndIce() {
    const st3Group = new THREE.Group();

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.92,
    });
    const brassPumpMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.22,
      metalness: 0.88,
    });

    // 1. Lathe-Sculpted Stainless Frothing Pitcher with Interior Milk Surface
    this.milkPitcherGroup = new THREE.Group();
    const pitcherBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.094, 0.21, 24, 1, true),
      chromeMat
    );
    pitcherBody.position.y = 0.105;
    this.milkPitcherGroup.add(pitcherBody);

    const pitcherBottom = new THREE.Mesh(new THREE.CircleGeometry(0.094, 24), chromeMat);
    pitcherBottom.rotation.x = Math.PI / 2;
    pitcherBottom.position.y = 0.002;
    this.milkPitcherGroup.add(pitcherBottom);

    // Pinched Pouring Spout Lip
    const spoutLip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.012, 0.04, 12),
      chromeMat
    );
    spoutLip.position.set(-0.075, 0.195, 0);
    spoutLip.rotation.z = 0.45;
    this.milkPitcherGroup.add(spoutLip);

    // Strap Handle
    const pHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.052, 0.01, 10, 20, Math.PI),
      chromeMat
    );
    pHandle.rotation.z = -Math.PI / 2;
    pHandle.position.set(0.084, 0.11, 0);
    this.milkPitcherGroup.add(pHandle);

    // Dynamic Interior Swirling Milk Surface
    this.pitcherMilkMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.074, 0.084, 0.14, 20),
      new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.25 })
    );
    this.pitcherMilkMesh.position.y = 0.08;
    this.milkPitcherGroup.add(this.pitcherMilkMesh);

    const tempBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.087, 0.09, 0.036, 24),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.45,
      })
    );
    tempBand.position.y = 0.075;
    this.milkPitcherGroup.add(tempBand);

    this.milkPitcherGroup.position.set(0.28, 1.04, 0.18);
    this.registerInteractiveTool(
      'milk',
      this.milkPitcherGroup,
      'Stainless Frothing Pitcher — Click to Steam 65°C Microfoam & Pour Latte Art',
      3,
      () => this.callbacks.onToolAction('steam_milk')
    );
    st3Group.add(this.milkPitcherGroup);

    // Steamed Milk Pour Stream (Visible during animateSteamAndPour)
    this.milkPourStreamMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.007, 0.24, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xfef3c7,
        emissiveIntensity: 0.35,
      })
    );
    this.milkPourStreamMesh.visible = false;
    st3Group.add(this.milkPourStreamMesh);

    // 2. Polycarbonate Ice Bin with Metal Ice Scoop & Translucent Cubes
    const iceBinGroup = new THREE.Group();
    const binBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.18, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.28, metalness: 0.72 })
    );
    binBox.position.y = 0.09;
    iceBinGroup.add(binBox);

    const iceSurface = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.04, 0.34),
      new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        roughness: 0.12,
        metalness: 0.1,
      })
    );
    iceSurface.position.y = 0.175;
    iceBinGroup.add(iceSurface);

    // Beveled Ice Cubes inside Bin
    for (let i = 0; i < 10; i++) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.035, 0.045),
        new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.1 })
      );
      c.position.set(-0.12 + (i % 4) * 0.08, 0.195, -0.08 + Math.floor(i / 4) * 0.08);
      c.rotation.set(0.2, i * 0.6, 0.1);
      iceBinGroup.add(c);
    }

    // Articulated Metal Ice Scoop (Animated during animateAddons('add_ice'))
    this.iceScoopGroup = new THREE.Group();
    const scoopBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.028, 0.09, 14, 1, false, 0, Math.PI),
      chromeMat
    );
    scoopBowl.rotation.z = Math.PI / 2;
    this.iceScoopGroup.add(scoopBowl);

    const scoopHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.014, 0.09, 12),
      this.counterWoodMat
    );
    scoopHandle.rotation.z = Math.PI / 2;
    scoopHandle.position.set(0.08, 0.01, 0);
    this.iceScoopGroup.add(scoopHandle);

    this.iceScoopGroup.position.set(0.04, 0.22, 0.02);
    iceBinGroup.add(this.iceScoopGroup);

    iceBinGroup.position.set(0.75, 1.04, 0.14);
    this.registerInteractiveTool(
      'ice',
      iceBinGroup,
      'Polycarbonate Ice Bin & Metal Scoop — Click to Scoop Crystal Ice Cubes',
      3,
      () => this.callbacks.onToolAction('add_ice')
    );
    st3Group.add(iceBinGroup);

    // 3. Wooden Tiered Syrup Rack with Printed Labels & Gold Dispenser Pumps
    const rackStep = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.06, 0.26),
      this.counterWoodMat
    );
    rackStep.position.set(1.48, 1.07, -0.08);
    st3Group.add(rackStep);

    const syrups: Array<{
      flavor: 'vanilla' | 'caramel' | 'chocolate';
      title: string;
      sub: string;
      labelText: string;
      color: number;
      bgHex: string;
      borderHex: string;
      x: number;
    }> = [
      {
        flavor: 'vanilla',
        title: 'VANILLA',
        sub: 'MADAGASCAR BEAN',
        labelText: 'Madagascar Vanilla Bean Syrup',
        color: 0xfde68a,
        bgHex: '#fef9c3',
        borderHex: '#d97706',
        x: 1.14,
      },
      {
        flavor: 'caramel',
        title: 'CARAMEL',
        sub: 'SALTED BUTTER',
        labelText: 'Salted Butter Caramel Syrup',
        color: 0xd97706,
        bgHex: '#ffedd5',
        borderHex: '#b45309',
        x: 1.38,
      },
      {
        flavor: 'chocolate',
        title: 'CACAO',
        sub: 'DARK GANACHE',
        labelText: 'Single-Origin Dark Cacao Ganache',
        color: 0x451a03,
        bgHex: '#f5f5f4',
        borderHex: '#78350f',
        x: 1.62,
      },
    ];

    syrups.forEach((s) => {
      const bottleGroup = new THREE.Group();
      const labelTex = this.createSyrupLabelTexture(s.title, s.sub, s.bgHex, s.borderHex);

      const glassMat = new THREE.MeshStandardMaterial({
        color: s.color,
        roughness: 0.16,
        metalness: 0.08,
      });
      const labelMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: labelTex,
        roughness: 0.35,
      });

      const bottleBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.065, 0.25, 20),
        glassMat
      );
      bottleBody.position.y = 0.125;
      bottleGroup.add(bottleBody);

      // Printed Wrap-Around Label Band
      const labelBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.064, 0.065, 0.11, 20, 1, true),
        labelMat
      );
      labelBand.position.y = 0.125;
      bottleGroup.add(labelBand);

      const bottleShoulder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.062, 0.055, 20),
        glassMat
      );
      bottleShoulder.position.y = 0.275;
      bottleGroup.add(bottleShoulder);

      // Articulated Gold Dispenser Pump Head (Depresses during animateAddons)
      const pumpHeadGroup = new THREE.Group();
      pumpHeadGroup.position.y = 0.32;
      const pumpCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.028, 0.045, 16),
        brassPumpMat
      );
      pumpHeadGroup.add(pumpCollar);

      const pumpSpout = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.095), brassPumpMat);
      pumpSpout.position.set(0, 0.028, 0.038);
      pumpSpout.rotation.x = 0.18;
      pumpHeadGroup.add(pumpSpout);

      bottleGroup.add(pumpHeadGroup);
      this.syrupPumpHeads.set(s.flavor, pumpHeadGroup);

      bottleGroup.position.set(s.x, 1.1, -0.08);
      this.registerInteractiveTool(
        `syrup-${s.flavor}`,
        bottleGroup,
        `${s.labelText} — Click to Pump into Cup`,
        3,
        () => this.callbacks.onToolAction('add_syrup', s.flavor)
      );
      st3Group.add(bottleGroup);
    });

    // 4. Ceramic Matcha Bowl (Chawan) & Multi-Pronged Bamboo Whisk (Chasen)
    const matchaGroup = new THREE.Group();
    const chawanMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.45,
      metalness: 0.1,
    });
    const chawanBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.065, 0.095, 24),
      chawanMat
    );
    chawanBowl.position.y = 0.048;
    matchaGroup.add(chawanBowl);

    const matchaFoamDisk = new THREE.Mesh(
      new THREE.CircleGeometry(0.088, 24),
      new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.32 })
    );
    matchaFoamDisk.rotation.x = -Math.PI / 2;
    matchaFoamDisk.position.y = 0.097;
    matchaGroup.add(matchaFoamDisk);

    // Multi-pronged Bamboo Whisk (Chasen, animated in W-pattern during animateAddons)
    this.matchaWhiskGroup = new THREE.Group();
    this.matchaWhiskGroup.position.set(0, 0.11, 0);
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0xd6b370, roughness: 0.55 });
    const whiskHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.016, 0.065, 14),
      bambooMat
    );
    whiskHandle.position.y = 0.05;
    this.matchaWhiskGroup.add(whiskHandle);

    const whiskTines = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.016, 0.06, 16, 1, true),
      bambooMat
    );
    whiskTines.position.y = 0.005;
    this.matchaWhiskGroup.add(whiskTines);

    matchaGroup.add(this.matchaWhiskGroup);
    matchaGroup.position.set(1.86, 1.04, 0.12);
    this.registerInteractiveTool(
      'syrup-matcha',
      matchaGroup,
      'Ceremonial Matcha Chawan & Bamboo Whisk — Click to Whisk & Pour Uji Matcha',
      3,
      () => this.callbacks.onToolAction('add_syrup', 'matcha')
    );
    st3Group.add(matchaGroup);

    // Syrup / Matcha Pouring Ribbon Stream (Visible during animateAddons('add_syrup'))
    this.syrupRibbonMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.005, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.15 })
    );
    this.syrupRibbonMesh.visible = false;
    st3Group.add(this.syrupRibbonMesh);

    this.scene.add(st3Group);
  }

  // Station 4: Serve Tray & Garage Garden Dining Tables with Chairs
  private buildStation4ServeTrayAndGarden() {
    const st4Group = new THREE.Group();

    const serveTrayGroup = new THREE.Group();
    const trayBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.035, 0.42),
      this.counterWoodMat
    );
    trayBase.position.y = 0.018;
    serveTrayGroup.add(trayBase);

    // Brass Service Bell next to Coaster
    const bellDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.18, metalness: 0.9 })
    );
    bellDome.position.set(0.19, 0.036, -0.08);
    serveTrayGroup.add(bellDome);

    this.ghostCupMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.075, 0.15, 20),
      this.ghostSnapMat
    );
    this.ghostCupMesh.position.y = 0.11;
    serveTrayGroup.add(this.ghostCupMesh);

    serveTrayGroup.position.set(2.35, 1.04, 0.12);
    this.registerInteractiveTool(
      'serve',
      serveTrayGroup,
      'Walnut Serve Coaster & Bell — Click to Serve Drink to Customer [Space]',
      4,
      () => this.callbacks.onToolAction('serve_drink')
    );
    st4Group.add(serveTrayGroup);

    // Three Garage Garden Bistro Tables & Chairs
    const tablePositions = [
      new THREE.Vector3(-2.2, 0, -3.55),
      new THREE.Vector3(0.4, 0, -4.15),
      new THREE.Vector3(2.8, 0, -3.45),
    ];

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.7,
    });

    tablePositions.forEach((pos) => {
      const tGroup = new THREE.Group();
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.24, 0.74, 16), ironMat);
      pedestal.position.y = 0.37;
      tGroup.add(pedestal);

      const tabletop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.05, 24),
        this.counterWoodMat
      );
      tabletop.position.y = 0.75;
      tabletop.castShadow = true;
      tabletop.receiveShadow = true;
      tGroup.add(tabletop);

      // Garden Bistro Chair behind table where customer sits
      const chairSeat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16),
        this.counterWoodMat
      );
      chairSeat.position.set(0, 0.44, 0.62);
      tGroup.add(chairSeat);

      const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.04), ironMat);
      chairBack.position.set(0, 0.68, 0.8);
      tGroup.add(chairBack);

      const shadowDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.62, 20),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        })
      );
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = 0.015;
      tGroup.add(shadowDisc);

      tGroup.position.copy(pos);
      st4Group.add(tGroup);
    });

    // Instanced Monstera Botanical Leaves Framing the Garage Garden
    const leafGeo = new THREE.CylinderGeometry(0.28, 0.18, 0.02, 7);
    leafGeo.scale(1, 1, 1.6);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.45,
      metalness: 0.05,
    });
    const leafCount = 36;
    this.monsteraLeavesInstanced = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
    const tintColor = new THREE.Color();

    for (let i = 0; i < leafCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (3.2 + (i % 5) * 0.45) + Math.sin(i) * 0.6;
      const y = 0.6 + (i % 6) * 0.48;
      const z = -1.2 - (i % 7) * 0.85;
      _dummyObj.position.set(x, y, z);
      _dummyObj.rotation.set(0.3 + (i % 3) * 0.15, i * 0.6, side * 0.25);
      const s = 0.85 + (i % 4) * 0.12;
      _dummyObj.scale.setScalar(s);
      _dummyObj.updateMatrix();
      this.monsteraLeavesInstanced.setMatrixAt(i, _dummyObj.matrix);

      tintColor.setHSL(0.35 + (i % 5) * 0.015, 0.65, 0.24 + (i % 4) * 0.05);
      this.monsteraLeavesInstanced.setColorAt(i, tintColor);
    }
    this.monsteraLeavesInstanced.instanceMatrix.needsUpdate = true;
    if (this.monsteraLeavesInstanced.instanceColor) {
      this.monsteraLeavesInstanced.instanceColor.needsUpdate = true;
    }
    this.monsteraLeavesInstanced.computeBoundingSphere();
    st4Group.add(this.monsteraLeavesInstanced);

    this.scene.add(st4Group);
  }

  // Station 5: Interactive 3D Vinyl Turntable & Shop Upgrade Tablet
  private buildStation5VinylTurntableCorner() {
    const st5Group = new THREE.Group();

    const brushedAluminumMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.22,
      metalness: 0.9,
    });
    const vinylGrooveMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.18,
      metalness: 0.45,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.88,
    });

    const turntableGroup = new THREE.Group();
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.085, 0.54),
      this.counterWoodMat
    );
    plinth.position.y = 0.0425;
    plinth.castShadow = true;
    turntableGroup.add(plinth);

    [
      [-0.28, -0.21],
      [0.28, -0.21],
      [-0.28, 0.21],
      [0.28, 0.21],
    ].forEach(([fx, fz]) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.02, 16), brassMat);
      foot.position.set(fx, 0.01, fz);
      turntableGroup.add(foot);
    });

    this.vinylPlatterGroup = new THREE.Group();
    this.vinylPlatterGroup.position.set(-0.06, 0.095, 0);

    const platterMetal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.022, 32),
      brushedAluminumMat
    );
    this.vinylPlatterGroup.add(platterMetal);

    const vinylDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.205, 0.205, 0.008, 32),
      vinylGrooveMat
    );
    vinylDisc.position.y = 0.015;
    this.vinylPlatterGroup.add(vinylDisc);

    const centerLabel = new THREE.Mesh(
      new THREE.CircleGeometry(0.075, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.vinylLabelTexture,
        roughness: 0.35,
      })
    );
    centerLabel.rotation.x = -Math.PI / 2;
    centerLabel.position.y = 0.02;
    this.vinylPlatterGroup.add(centerLabel);

    const spindle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.045, 12),
      brushedAluminumMat
    );
    spindle.position.y = 0.025;
    this.vinylPlatterGroup.add(spindle);

    turntableGroup.add(this.vinylPlatterGroup);

    this.vinylTonearmPivot = new THREE.Group();
    this.vinylTonearmPivot.position.set(0.22, 0.12, -0.15);

    const armBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 0.04, 16),
      brushedAluminumMat
    );
    this.vinylTonearmPivot.add(armBase);

    const sCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.02, -0.05),
      new THREE.Vector3(0, 0.02, 0.05),
      new THREE.Vector3(-0.04, 0.02, 0.16),
      new THREE.Vector3(-0.09, 0.015, 0.26),
    ]);
    const tonearmTube = new THREE.Mesh(
      new THREE.TubeGeometry(sCurve, 20, 0.008, 8, false),
      brushedAluminumMat
    );
    this.vinylTonearmPivot.add(tonearmTube);

    const cartridge = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.02, 0.052), brassMat);
    cartridge.position.set(-0.095, 0.012, 0.27);
    this.vinylTonearmPivot.add(cartridge);

    turntableGroup.add(this.vinylTonearmPivot);

    const rpmButton = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16), brassMat);
    rpmButton.position.set(-0.26, 0.09, 0.19);
    turntableGroup.add(rpmButton);

    const needleLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 0.055, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.5,
      })
    );
    needleLamp.position.set(0.18, 0.11, 0.18);
    turntableGroup.add(needleLamp);

    turntableGroup.position.set(3.25, 1.04, 0.08);
    this.registerInteractiveTool(
      'vinyl-turntable',
      turntableGroup,
      '3D Vinyl Turntable [Key M] — Click to Drop/Lift Needle (Play/Pause)',
      5,
      () => this.callbacks.onToolAction('toggle_vinyl')
    );
    st5Group.add(turntableGroup);

    const sleeveStandGroup = new THREE.Group();
    this.vinylSleeveMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, 0.022),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.vinylLabelTexture,
        roughness: 0.55,
      })
    );
    this.vinylSleeveMesh.position.y = 0.22;
    this.vinylSleeveMesh.rotation.x = -0.18;
    sleeveStandGroup.add(this.vinylSleeveMesh);

    sleeveStandGroup.position.set(3.88, 1.04, -0.08);
    sleeveStandGroup.rotation.y = -0.45;
    this.registerInteractiveTool(
      'vinyl-sleeve',
      sleeveStandGroup,
      'Now-Playing Vinyl Sleeve — Click to Configure Spotify & Tracks',
      5,
      () => this.callbacks.onToolAction('open_spotify_modal')
    );
    st5Group.add(sleeveStandGroup);

    const tabletGroup = new THREE.Group();
    const tabletBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.22, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 })
    );
    tabletBody.position.y = 0.12;
    tabletBody.rotation.x = -0.45;
    tabletGroup.add(tabletBody);

    const tabletScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.18),
      new THREE.MeshStandardMaterial({
        color: 0x78350f,
        emissive: 0xd97706,
        emissiveIntensity: 0.5,
      })
    );
    tabletScreen.position.set(0, 0.122, 0.012);
    tabletScreen.rotation.x = -0.45;
    tabletGroup.add(tabletScreen);

    tabletGroup.position.set(2.75, 1.04, 0.22);
    this.registerInteractiveTool(
      'upgrade-tablet',
      tabletGroup,
      'Shop Management Tablet — Click to Buy Cafe Upgrades',
      5,
      () => this.callbacks.onToolAction('open_upgrades_modal')
    );
    st5Group.add(tabletGroup);

    this.scene.add(st5Group);
  }

  private buildFloatingBadgeAndHearts() {
    const spriteMat = new THREE.SpriteMaterial({
      map: this.floatingBadgeTexture,
      transparent: true,
      depthTest: false,
    });
    this.floatingBadgeSprite = new THREE.Sprite(spriteMat);
    this.floatingBadgeSprite.scale.set(0.46, 0.17, 1);
    this.floatingBadgeSprite.visible = false;
    this.scene.add(this.floatingBadgeSprite);

    this.heartParticlesGroup = new THREE.Group();
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.65,
    });
    for (let i = 0; i < 4; i++) {
      const h = new THREE.Mesh(new THREE.OctahedronGeometry(0.036, 1), heartMat);
      h.position.set((i - 1.5) * 0.09, i * 0.06, 0);
      this.heartParticlesGroup.add(h);
    }
    this.heartParticlesGroup.visible = false;
    this.scene.add(this.heartParticlesGroup);
  }

  private buildPooledParticles() {
    const steamGeo = new THREE.SphereGeometry(0.032, 8, 8);
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    this.steamParticlesInstanced = new THREE.InstancedMesh(steamGeo, steamMat, 24);
    this.steamParticlesInstanced.frustumCulled = false;
    this.scene.add(this.steamParticlesInstanced);

    const noteGeo = new THREE.TorusGeometry(0.024, 0.007, 8, 16);
    const noteMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
    });
    this.musicNotesInstanced = new THREE.InstancedMesh(noteGeo, noteMat, 12);
    this.musicNotesInstanced.frustumCulled = false;
    this.scene.add(this.musicNotesInstanced);

    const rainGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.35, 6);
    const rainMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.rainDropsInstanced = new THREE.InstancedMesh(rainGeo, rainMat, 60);
    this.rainDropsInstanced.frustumCulled = false;
    this.scene.add(this.rainDropsInstanced);
  }

  // Articulated Multi-Part 3D Human Customer Rig (Zero "Cone + Sphere" Placeholders!)
  private createCustomerCharacter(
    seed: number,
    avatarColor: string,
    shirtColor: string
  ): Omit<ArticulatedCustomerActor, 'currentPos'> {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(avatarColor),
      roughness: 0.52,
      metalness: 0.02,
    });
    const jacketMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(shirtColor),
      roughness: 0.62,
      metalness: 0.05,
    });
    const innerShirtMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f4,
      roughness: 0.7,
    });
    const denimMat = new THREE.MeshStandardMaterial({
      color: seed % 2 === 0 ? 0x1e293b : 0x334155,
      roughness: 0.78,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.45,
    });
    const hairColors = [0x1c1917, 0x451a03, 0x78350f, 0x27272a];
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColors[seed % hairColors.length],
      roughness: 0.72,
    });

    // Ground Contact Shadow Disc
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 18),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    group.add(shadow);

    // Pelvis Root Joint (Height = 0.58m standing, lowers to 0.44m when seated)
    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.y = 0.58;
    group.add(pelvisGroup);

    const pelvisMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.145, 0.12, 16),
      denimMat
    );
    pelvisGroup.add(pelvisMesh);

    // Articulated Legs (Left & Right Hip + Knee + Footwear)
    const buildLeg = (sideX: number) => {
      const hipJoint = new THREE.Group();
      hipJoint.position.set(sideX, -0.02, 0);

      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.056, 0.28, 12),
        denimMat
      );
      thigh.position.y = -0.14;
      thigh.castShadow = true;
      hipJoint.add(thigh);

      const kneeJoint = new THREE.Group();
      kneeJoint.position.set(0, -0.28, 0);
      hipJoint.add(kneeJoint);

      const calf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.054, 0.045, 0.26, 12),
        denimMat
      );
      calf.position.y = -0.13;
      calf.castShadow = true;
      kneeJoint.add(calf);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.065, 0.17), shoeMat);
      shoe.position.set(0, -0.25, 0.03);
      kneeJoint.add(shoe);

      pelvisGroup.add(hipJoint);
      return { hipJoint, kneeJoint };
    };

    const leftLeg = buildLeg(-0.085);
    const rightLeg = buildLeg(0.085);

    // Tailored Torso with Jacket Collar & Inner Shirt Detail
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 0.04;
    pelvisGroup.add(torsoGroup);

    const torsoMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.185, 0.155, 0.48, 18),
      jacketMat
    );
    torsoMesh.scale.set(1.12, 1, 0.78);
    torsoMesh.position.y = 0.24;
    torsoMesh.castShadow = true;
    torsoGroup.add(torsoMesh);

    const vNeckPatch = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.22, 0.155),
      innerShirtMat
    );
    vNeckPatch.position.set(0, 0.34, 0.08);
    torsoGroup.add(vNeckPatch);

    // Collar / Lapel Strips
    [-0.065, 0.065].forEach((lx) => {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.025), jacketMat);
      lapel.position.set(lx, 0.36, 0.15);
      lapel.rotation.z = lx < 0 ? -0.2 : 0.2;
      torsoGroup.add(lapel);
    });

    // Articulated Neck & Sculpted Facial Head Group
    const neckJoint = new THREE.Group();
    neckJoint.position.set(0, 0.5, 0);
    torsoGroup.add(neckJoint);

    const neckCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.062, 0.08, 12),
      skinMat
    );
    neckCyl.position.y = 0.03;
    neckJoint.add(neckCyl);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.165, 20, 18), skinMat);
    headMesh.scale.set(0.95, 1.06, 0.96);
    headMesh.position.y = 0.19;
    headMesh.castShadow = true;
    neckJoint.add(headMesh);

    // Left & Right Ears
    [-0.155, 0.155].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), skinMat);
      ear.scale.set(0.55, 1.1, 0.8);
      ear.position.set(ex, 0.185, 0);
      neckJoint.add(ear);
    });

    // Sculpted Nose Bridge
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.052, 8), skinMat);
    nose.rotation.x = Math.PI / 2 - 0.2;
    nose.position.set(0, 0.185, 0.165);
    neckJoint.add(nose);

    // Blinking Eyes with Pupils & Expressive Eyebrows
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2 });
    const leftEyeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 10), eyeMat);
    leftEyeMesh.position.set(-0.056, 0.21, 0.148);
    neckJoint.add(leftEyeMesh);

    const rightEyeMesh = leftEyeMesh.clone();
    rightEyeMesh.position.x = 0.056;
    neckJoint.add(rightEyeMesh);

    [-0.056, 0.056].forEach((bx) => {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.01, 0.012), hairMat);
      brow.position.set(bx, 0.242, 0.148);
      brow.rotation.z = bx < 0 ? 0.08 : -0.08;
      neckJoint.add(brow);
    });

    // Varied Procedural 3D Hairstyles & Accessories based on seed % 4
    const hairCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.174, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairCrown.position.y = 0.205;
    hairCrown.rotation.x = -0.18;
    neckJoint.add(hairCrown);

    const styleVariant = seed % 4;
    if (styleVariant === 0) {
      // Textured Top Bun + Swept Fringe
      const topBun = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 14), hairMat);
      topBun.position.set(0, 0.38, -0.04);
      neckJoint.add(topBun);
    } else if (styleVariant === 1) {
      // Cozy Ribbed Knit Beanie Hat
      const beanieMat = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.85,
      });
      const beanieDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        beanieMat
      );
      beanieDome.position.y = 0.22;
      neckJoint.add(beanieDome);
      const beanieCuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.165, 0.025, 10, 20),
        beanieMat
      );
      beanieCuff.rotation.x = Math.PI / 2 - 0.1;
      beanieCuff.position.y = 0.255;
      neckJoint.add(beanieCuff);
    } else if (styleVariant === 2) {
      // Layered Bob Side Locks + Brass Wireframe Glasses
      [-0.145, 0.145].forEach((sx) => {
        const lock = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.025, 0.18, 10),
          hairMat
        );
        lock.position.set(sx, 0.16, 0.02);
        neckJoint.add(lock);
      });
      const glassesMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.85,
        roughness: 0.2,
      });
      [-0.056, 0.056].forEach((gx) => {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.004, 8, 16), glassesMat);
        rim.position.set(gx, 0.21, 0.158);
        neckJoint.add(rim);
      });
    } else {
      // Swept Fringe + Studio Headphones Resting Around Collar
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.06), hairMat);
      fringe.position.set(0.02, 0.285, 0.135);
      fringe.rotation.z = -0.15;
      neckJoint.add(fringe);
    }

    // Articulated Arms (Shoulder + Upper Arm + Elbow + Forearm + Hand)
    const buildArm = (sideX: number) => {
      const shoulderJoint = new THREE.Group();
      shoulderJoint.position.set(sideX, 0.44, 0);

      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.044, 0.23, 12),
        jacketMat
      );
      upperArm.position.y = -0.115;
      upperArm.castShadow = true;
      shoulderJoint.add(upperArm);

      const elbowJoint = new THREE.Group();
      elbowJoint.position.set(0, -0.23, 0);
      shoulderJoint.add(elbowJoint);

      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.036, 0.21, 12),
        skinMat
      );
      forearm.position.y = -0.105;
      elbowJoint.add(forearm);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), skinMat);
      hand.position.y = -0.22;
      elbowJoint.add(hand);

      torsoGroup.add(shoulderJoint);
      return { shoulderJoint, elbowJoint };
    };

    const leftArm = buildArm(-0.235);
    const rightArm = buildArm(0.235);

    // Held Porcelain Cup attached to Right Hand (Zero StudioLogo)
    const heldCup = this.createPorcelainCupMesh(0.75, true, false);
    heldCup.position.set(0, -0.24, 0.06);
    heldCup.rotation.x = Math.PI / 2;
    heldCup.visible = false;
    rightArm.elbowJoint.add(heldCup);

    return {
      group,
      pelvisGroup,
      torsoGroup,
      neckJoint,
      leftShoulderJoint: leftArm.shoulderJoint,
      leftElbowJoint: leftArm.elbowJoint,
      rightShoulderJoint: rightArm.shoulderJoint,
      rightElbowJoint: rightArm.elbowJoint,
      leftHipJoint: leftLeg.hipJoint,
      leftKneeJoint: leftLeg.kneeJoint,
      rightHipJoint: rightLeg.hipJoint,
      rightKneeJoint: rightLeg.kneeJoint,
      leftEyeMesh,
      rightEyeMesh,
      heldCup,
      seed,
    };
  }

  private syncCustomerActors() {
    const activeIds = new Set(this.gameState.customers.map((c) => c.id));

    for (const [id, actor] of this.customerActors.entries()) {
      if (!activeIds.has(id)) {
        this.customersRoot.remove(actor.group);
        this.customerActors.delete(id);
      }
    }

    let orderingSlot = 0;
    this.gameState.customers.forEach((cust, idx) => {
      let actor = this.customerActors.get(cust.id);
      if (!actor) {
        const seed =
          cust.customerName.charCodeAt(0) + cust.customerName.length * 7 + idx * 13;
        const built = this.createCustomerCharacter(seed, cust.avatarColor, cust.shirtColor);
        const startPos = new THREE.Vector3(-2.6 + orderingSlot * 0.9, 0, -2.4);
        built.group.position.copy(startPos);
        this.customersRoot.add(built.group);
        actor = {
          ...built,
          currentPos: startPos.clone(),
        };
        this.customerActors.set(cust.id, actor);
      }

      if (cust.state === 'ordering') {
        actor.heldCup.visible = false;
        orderingSlot++;
      } else {
        actor.heldCup.visible = true;
      }
    });
  }

  // Triggered by App.tsx whenever the player performs a barista step or serves a drink
  public triggerStepAnimation(
    type: StepAnimType,
    flavor?: SyrupFlavor,
    badgeText?: string
  ) {
    const durations: Record<StepAnimType, number> = {
      grind: 1.15,
      tamp: 1.05,
      pull_espresso: 1.45,
      steam_milk: 1.45,
      add_ice: 0.95,
      add_syrup: 1.05,
      rinse_cup: 0.7,
      serve_drink: 1.35,
    };

    this.stepAnim = {
      type,
      progress: 0,
      duration: durations[type] || 1.1,
      flavor,
      badgeText,
    };

    if (type === 'steam_milk') {
      this.drawFloatingBadgeText('65°C MICROFOAM', '#10b981');
    } else if (type === 'tamp') {
      this.drawFloatingBadgeText('30 LBS TAMP', '#10b981');
    } else if (type === 'pull_espresso') {
      this.drawFloatingBadgeText('9.0 BAR · 27.4s', '#f59e0b');
    } else if (type === 'serve_drink') {
      this.drawFloatingBadgeText(badgeText || '+$8 SERVED!', '#10b981');
      this.serveReachTimer = 1.35;
    }
  }

  public updateGameState(newState: KlasikGameState) {
    const prevWeather = this.gameState.weather;
    this.gameState = newState;

    if (prevWeather !== newState.weather) {
      this.applyWeatherLighting(newState.weather);
    }
    this.updateDecorMaterials();
    this.updateActiveCupVisuals();
    this.syncCustomerActors();
  }

  public updateSpotifyState(newSpotify: SpotifyVinylState) {
    this.spotifyState = newSpotify;
    this.redrawVinylLabelTexture();
  }

  private applyWeatherLighting(weather: WeatherMode) {
    if (weather === 'morning') {
      this.scene.background = new THREE.Color(0x231a14);
      this.scene.fog = new THREE.FogExp2(0x231a14, 0.038);
      this.sunLight.color.setHex(0xfff1d0);
      this.sunLight.intensity = 2.4;
      this.hemiLight.color.setHex(0xbae6fd);
      this.hemiLight.groundColor.setHex(0x451a03);
      this.hemiLight.intensity = 0.95;
      this.rainDropsInstanced.visible = false;
    } else if (weather === 'golden') {
      this.scene.background = new THREE.Color(0x2b150d);
      this.scene.fog = new THREE.FogExp2(0x2b150d, 0.042);
      this.sunLight.color.setHex(0xf97316);
      this.sunLight.intensity = 2.6;
      this.hemiLight.color.setHex(0xfdba74);
      this.hemiLight.groundColor.setHex(0x27120b);
      this.hemiLight.intensity = 0.85;
      this.rainDropsInstanced.visible = false;
    } else {
      this.scene.background = new THREE.Color(0x0f172a);
      this.scene.fog = new THREE.FogExp2(0x0f172a, 0.052);
      this.sunLight.color.setHex(0x60a5fa);
      this.sunLight.intensity = 0.75;
      this.hemiLight.color.setHex(0x38bdf8);
      this.hemiLight.groundColor.setHex(0x1e1b4b);
      this.hemiLight.intensity = 0.6;
      this.rainDropsInstanced.visible = true;
    }
  }

  private updateDecorMaterials() {
    const { counterWood, mugColor, neonSignColor, plantDensity } = this.gameState.decor;

    if (counterWood === 'walnut') {
      this.counterWoodMat.color.setHex(0x4a2c18);
    } else if (counterWood === 'white-oak') {
      this.counterWoodMat.color.setHex(0xa67c52);
    } else {
      this.counterWoodMat.color.setHex(0x27272a);
    }

    if (mugColor === 'cream') {
      this.ceramicMugMat.color.setHex(0xf8f5f0);
    } else if (mugColor === 'matte-black') {
      this.ceramicMugMat.color.setHex(0x3f3f46);
    } else if (mugColor === 'sage-green') {
      this.ceramicMugMat.color.setHex(0xbbf7d0);
    } else {
      this.ceramicMugMat.color.setHex(0xfdba74);
    }

    if (neonSignColor === 'amber') {
      this.neonTubeMat.emissive.setHex(0xf59e0b);
      this.neonSignLight.color.setHex(0xf59e0b);
    } else if (neonSignColor === 'emerald') {
      this.neonTubeMat.emissive.setHex(0x10b981);
      this.neonSignLight.color.setHex(0x10b981);
    } else {
      this.neonTubeMat.emissive.setHex(0xf43f5e);
      this.neonSignLight.color.setHex(0xf43f5e);
    }

    this.monsteraLeavesInstanced.count = plantDensity === 'lush-jungle' ? 36 : 18;
  }

  private updateActiveCupVisuals() {
    const cup = this.gameState.currentCup;
    const hasAnyLiquid = cup.hasEspresso || cup.hasSteamedMilk || cup.syrup !== 'none';
    this.activeCupLiquidMesh.visible = hasAnyLiquid;

    // Update portafilter grounds vs tamped puck
    this.pfGroundsMoundMesh.visible = cup.hasGrounds && !cup.isTamped;
    this.pfTampedPuckMesh.visible = cup.isTamped;

    const liqMat = this.activeCupLiquidMesh.material as THREE.MeshStandardMaterial;
    if (cup.syrup === 'matcha') {
      liqMat.color.setHex(0x65a30d);
    } else if (cup.hasSteamedMilk) {
      liqMat.color.setHex(0xc68b59);
    } else {
      liqMat.color.setHex(0x3b1d0e);
    }

    this.activeCupFoamMesh.visible = cup.hasSteamedMilk;
    this.activeCupIceGroup.visible = cup.hasIce;

    this.activeCupDrizzleRing.visible = cup.syrup !== 'none';
    if (cup.syrup !== 'none') {
      const dMat = this.activeCupDrizzleRing.material as THREE.MeshStandardMaterial;
      if (cup.syrup === 'vanilla') dMat.color.setHex(0xfde68a);
      else if (cup.syrup === 'caramel') dMat.color.setHex(0xd97706);
      else if (cup.syrup === 'chocolate') dMat.color.setHex(0x451a03);
      else if (cup.syrup === 'matcha') dMat.color.setHex(0x65a30d);
    }

    this.ghostCupMesh.visible = hasAnyLiquid && this.gameState.phase === 'playing';
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    // Portrait-Rotated Coordinate Transformation for Raycaster
    const updateNdc = (clientX: number, clientY: number) => {
      const isPortraitRotated = window.innerHeight > window.innerWidth;
      if (isPortraitRotated) {
        const localX = clientY;
        const localY = window.innerWidth - clientX;
        this.pointerNdc.x = (localX / Math.max(1, window.innerHeight)) * 2 - 1;
        this.pointerNdc.y = -(localY / Math.max(1, window.innerWidth)) * 2 + 1;
      } else {
        const rect = dom.getBoundingClientRect();
        this.pointerNdc.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        this.pointerNdc.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      }
    };

    dom.addEventListener('pointerdown', (e: PointerEvent) => {
      this.isPointerDragging = true;
      const isPortraitRotated = window.innerHeight > window.innerWidth;
      this.dragStartCoord = isPortraitRotated ? e.clientY : e.clientX;
      updateNdc(e.clientX, e.clientY);
    });

    dom.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.isPointerDragging && this.gameState.phase === 'playing') {
        const isPortraitRotated = window.innerHeight > window.innerWidth;
        const curCoord = isPortraitRotated ? e.clientY : e.clientX;
        const dx = curCoord - this.dragStartCoord;
        this.dragStartCoord = curCoord;
        this.manualCameraYawOffset = THREE.MathUtils.clamp(
          this.manualCameraYawOffset - dx * 0.0025,
          -0.35,
          0.35
        );
      }

      const now = performance.now();
      if (now - this.lastRaycastTime < 45) return;
      this.lastRaycastTime = now;

      updateNdc(e.clientX, e.clientY);
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const hits = this.raycaster.intersectObjects(this.interactables, true);
      if (hits.length > 0) {
        const data = hits[0].object.userData;
        if (data && data.toolKey) {
          this.hoveredToolKey = data.toolKey;
          dom.style.cursor = 'pointer';
          this.callbacks.onHoverToolChange(data.label || null);
          return;
        }
      }
      this.hoveredToolKey = null;
      dom.style.cursor = 'default';
      this.callbacks.onHoverToolChange(null);
    });

    window.addEventListener('pointerup', (e: PointerEvent) => {
      if (!this.isPointerDragging) return;
      this.isPointerDragging = false;

      if (this.gameState.phase !== 'playing') return;
      updateNdc(e.clientX, e.clientY);
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const hits = this.raycaster.intersectObjects(this.interactables, true);
      if (hits.length > 0) {
        const data = hits[0].object.userData;
        if (data && typeof data.onClick === 'function') {
          data.onClick();
        }
      }
    });

    dom.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        this.manualCameraZoomOffset = THREE.MathUtils.clamp(
          this.manualCameraZoomOffset + e.deltaY * 0.0008,
          -0.35,
          0.45
        );
      },
      { passive: true }
    );

    window.addEventListener('resize', this.handleResize);
  }

  public resetCameraOffsets() {
    this.manualCameraYawOffset = 0;
    this.manualCameraZoomOffset = 0;
  }

  private handleResize = () => {
    if (this.isDisposed) return;
    const { width, height } = this.getEffectiveLandscapeDimensions();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.render(this.scene, this.camera);
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private startLoop() {
    const tick = () => {
      if (this.isDisposed) return;
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      this.elapsed += dt;

      this.fpsFrames++;
      this.fpsTimer += rawDt;
      if (this.fpsTimer >= 1.0) {
        const currentFps = Math.round(this.fpsFrames / this.fpsTimer);
        this.callbacks.onFpsUpdate?.(currentFps);
        this.fpsFrames = 0;
        this.fpsTimer = 0;
      }

      this.updateSimulationVisuals(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = window.requestAnimationFrame(tick);
      }
    };

    this.frameId = window.requestAnimationFrame(tick);
  }

  // Updates multi-stage 3D barista step choreography (Grind, Tamp, Extract, Steam & Pour, Addons, Serve)
  private updateBaristaStepChoreography(dt: number) {
    // Reset default rest transforms before applying active step animation
    this.grinderGroup.position.set(-1.68, 1.04, -0.05);
    this.groundStreamGroup.visible = false;
    this.tampPressureRingMesh.visible = false;
    this.espressoStreamsGroup.visible = false;
    this.milkPourStreamMesh.visible = false;
    this.syrupRibbonMesh.visible = false;
    this.floatingBadgeSprite.visible = false;

    this.tamperMeshGroup.position.set(-0.11, 0.024, -0.02);
    this.tamperMeshGroup.rotation.set(0, 0, 0);

    this.milkPitcherGroup.position.set(0.28, 1.04, 0.18);
    this.milkPitcherGroup.rotation.set(0, 0, 0);
    this.steamWandPivot.rotation.set(0, 0, 0);
    this.iceScoopGroup.position.set(0.04, 0.22, 0.02);
    this.iceScoopGroup.rotation.set(0, 0, 0);
    this.matchaWhiskGroup.position.set(0, 0.11, 0);
    this.matchaWhiskGroup.rotation.set(0, 0, 0);

    for (const pump of this.syrupPumpHeads.values()) {
      pump.position.y = 0.32;
    }

    // Default Portafilter & Active Cup resting positions based on station/cup state
    const cup = this.gameState.currentCup;
    if (cup.hasEspresso) {
      // Locked in Left Grouphead
      this.portafilterGroup.position.set(-0.77, 1.33, 0.2);
      this.portafilterGroup.rotation.set(0, 0, 0);
    } else {
      // Resting on Tamping Mat
      this.portafilterGroup.position.set(-1.14, 1.095, 0.24);
      this.portafilterGroup.rotation.set(0, 0, 0);
    }

    // Move Active Barista Cup between Station 2 Drip Tray and Station 3 Milk/Syrup Counter
    const defaultCupX = this.gameState.activeStation === 3 ? 0.62 : -0.77;
    const defaultCupY = this.gameState.activeStation === 3 ? 1.042 : 1.098;
    const defaultCupZ = this.gameState.activeStation === 3 ? 0.24 : 0.2;
    this.activeBaristaCupGroup.position.set(defaultCupX, defaultCupY, defaultCupZ);
    this.activeBaristaCupGroup.scale.setScalar(1.06);
    this.activeCupLiquidMesh.scale.set(1, 1, 1);

    // Default gauge needles (0 bar unless pulling espresso)
    this.gaugeNeedles.forEach((n) => {
      n.rotation.z = cup.hasEspresso ? -0.65 : 0.8;
    });
    this.groupHeadLedMat.emissiveIntensity = 0.4;

    // Gentle bobbing of ice cubes inside cup
    if (this.activeCupIceGroup.visible) {
      this.activeCupIceGroup.children.forEach((cube, idx) => {
        cube.position.y = 0.138 + Math.sin(this.elapsed * 3.8 + idx) * 0.004;
      });
    }

    // Heart particles timer when customer receives drink
    if (this.serveReachTimer > 0) {
      this.serveReachTimer = Math.max(0, this.serveReachTimer - dt);
      this.heartParticlesGroup.visible = true;
      const hp = 1 - this.serveReachTimer / 1.35;
      this.heartParticlesGroup.position.set(-2.35, 1.85 + hp * 0.45, -1.15);
      this.heartParticlesGroup.rotation.y = this.elapsed * 2.5;
    } else {
      this.heartParticlesGroup.visible = false;
    }

    if (!this.stepAnim) return;

    this.stepAnim.progress += dt / this.stepAnim.duration;
    if (this.stepAnim.progress >= 1) {
      this.stepAnim = null;
      return;
    }

    const p = this.stepAnim.progress;
    const smoothP = p * p * (3 - 2 * p);

    if (this.stepAnim.type === 'grind') {
      // 1. Portafilter locks into grinder fork -> burrs vibrate -> beans swirl -> grounds stream falls -> glides to tamp mat
      if (p < 0.75) {
        const sub = Math.min(1, p / 0.2);
        this.portafilterGroup.position.set(
          THREE.MathUtils.lerp(-1.14, -1.68, sub),
          THREE.MathUtils.lerp(1.095, 1.21, sub),
          THREE.MathUtils.lerp(0.24, 0.16, sub)
        );
        this.grinderGroup.position.x = -1.68 + Math.sin(this.elapsed * 55) * 0.005;
        this.hopperBeansGroup.rotation.y += dt * 9.5;
        this.groundStreamGroup.visible = p > 0.15;
        this.groundStreamGroup.children.forEach((speck, i) => {
          speck.position.y = -(((p * 6 + i * 0.1) % 1) * 0.095);
        });
        this.pfGroundsMoundMesh.visible = true;
        this.pfGroundsMoundMesh.scale.setScalar(Math.max(0.1, (p - 0.1) / 0.65));
      } else {
        const back = (p - 0.75) / 0.25;
        this.pfGroundsMoundMesh.scale.setScalar(1);
        this.portafilterGroup.position.set(
          THREE.MathUtils.lerp(-1.68, -1.14, back),
          THREE.MathUtils.lerp(1.21, 1.095, back) + Math.sin(back * Math.PI) * 0.06,
          THREE.MathUtils.lerp(0.16, 0.24, back)
        );
      }
    } else if (this.stepAnim.type === 'tamp') {
      // 2. Tamper arcs over portafilter basket -> presses down with spring recoil -> emerald pressure ring expands
      const arc = Math.sin(p * Math.PI);
      const press = p > 0.3 && p < 0.75 ? Math.sin(((p - 0.3) / 0.45) * Math.PI) : 0;
      this.tamperMeshGroup.position.set(
        THREE.MathUtils.lerp(-0.11, 0.08, Math.min(1, arc * 1.4)),
        0.024 + arc * 0.14 - press * 0.065,
        THREE.MathUtils.lerp(-0.02, 0.02, Math.min(1, arc * 1.4))
      );
      if (p > 0.35 && p < 0.85) {
        this.tampPressureRingMesh.visible = true;
        const ringScale = 0.8 + ((p - 0.35) / 0.5) * 0.65;
        this.tampPressureRingMesh.scale.setScalar(ringScale);
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(-1.14, 1.38 + p * 0.08, 0.24);
      }
    } else if (this.stepAnim.type === 'pull_espresso') {
      // 3. Portafilter locks into grouphead 45 deg -> gauge sweeps to 9 bar -> twin mouse-tail streams pour -> liquid rises
      this.activeBaristaCupGroup.position.set(-0.77, 1.098, 0.2);
      const lockProgress = Math.min(1, p / 0.25);
      this.portafilterGroup.position.set(-0.77, 1.33, 0.2);
      this.portafilterGroup.rotation.y = THREE.MathUtils.lerp(-0.78, 0, lockProgress);

      this.groupHeadLedMat.emissiveIntensity = 1.6 + Math.sin(this.elapsed * 16) * 0.4;
      const needleAngle = THREE.MathUtils.lerp(0.8, -0.75, Math.min(1, p * 1.5));
      this.gaugeNeedles.forEach((n) => {
        n.rotation.z = needleAngle + Math.sin(this.elapsed * 30) * 0.03;
      });

      if (p > 0.2) {
        this.espressoStreamsGroup.visible = true;
        const fillLevel = Math.min(1, (p - 0.2) / 0.78);
        this.activeCupLiquidMesh.visible = true;
        this.activeCupLiquidMesh.scale.set(1, Math.max(0.08, fillLevel), 1);
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(-0.55, 1.58, 0.24);
      }
    } else if (this.stepAnim.type === 'steam_milk') {
      // 4. Phase 1: Pitcher slides under steam wand + wand pivots in; Phase 2: Pitcher lifts, tilts & pours Rosetta latte art
      if (p < 0.5) {
        const sub = Math.sin((p / 0.5) * Math.PI);
        this.milkPitcherGroup.position.set(
          THREE.MathUtils.lerp(0.28, -0.11, sub),
          THREE.MathUtils.lerp(1.04, 1.15, sub),
          0.2
        );
        this.steamWandPivot.rotation.z = -0.35 * sub;
        this.pitcherMilkMesh.rotation.y += dt * 12;
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(-0.08, 1.44, 0.22);
      } else {
        const pourP = (p - 0.5) / 0.5;
        const pourArc = Math.sin(pourP * Math.PI);
        this.activeBaristaCupGroup.position.set(0.62, 1.042, 0.24);
        this.milkPitcherGroup.position.set(
          0.46,
          1.04 + pourArc * 0.24,
          0.24
        );
        this.milkPitcherGroup.rotation.z = -pourArc * 0.92;
        this.milkPourStreamMesh.visible = pourArc > 0.2;
        this.milkPourStreamMesh.position.set(0.58, 1.22, 0.24);
        this.activeCupFoamMesh.visible = true;
        this.activeCupFoamMesh.scale.setScalar(Math.max(0.1, pourP));
      }
    } else if (this.stepAnim.type === 'add_ice') {
      // 5A. Ice scoop lifts, arcs over cup, tilts, and drops ice cubes from above
      this.activeBaristaCupGroup.position.set(0.62, 1.042, 0.24);
      const arc = Math.sin(p * Math.PI);
      this.iceScoopGroup.position.set(
        THREE.MathUtils.lerp(0.04, -0.14, arc),
        0.22 + arc * 0.18,
        THREE.MathUtils.lerp(0.02, 0.1, arc)
      );
      this.iceScoopGroup.rotation.z = -arc * 0.85;
      this.activeCupIceGroup.visible = true;
      const dropH = Math.max(0, (1 - Math.min(1, p * 1.6)) * 0.16);
      this.activeCupIceGroup.children.forEach((cube, idx) => {
        cube.position.y = 0.138 + dropH + idx * 0.02 * (1 - smoothP);
      });
    } else if (this.stepAnim.type === 'add_syrup') {
      // 5B. Syrup pump depresses twice OR Matcha bamboo whisk whisks in W-pattern before pouring ribbon
      this.activeBaristaCupGroup.position.set(0.62, 1.042, 0.24);
      const fl = this.stepAnim.flavor || 'vanilla';
      const rMat = this.syrupRibbonMesh.material as THREE.MeshStandardMaterial;

      if (fl === 'matcha') {
        rMat.color.setHex(0x65a30d);
        this.matchaWhiskGroup.position.x = Math.sin(p * Math.PI * 6) * 0.032;
        this.matchaWhiskGroup.position.z = Math.cos(p * Math.PI * 3) * 0.024;
      } else {
        if (fl === 'vanilla') rMat.color.setHex(0xfde68a);
        else if (fl === 'caramel') rMat.color.setHex(0xd97706);
        else rMat.color.setHex(0x451a03);

        const pump = this.syrupPumpHeads.get(fl);
        if (pump) {
          const doublePump = Math.abs(Math.sin(p * Math.PI * 2));
          pump.position.y = 0.32 - doublePump * 0.032;
        }
      }

      this.syrupRibbonMesh.visible = true;
      this.syrupRibbonMesh.position.set(0.62, 1.24, 0.24);
      this.activeCupDrizzleRing.visible = true;
      this.activeCupDrizzleRing.rotation.z = p * Math.PI * 4;
    } else if (this.stepAnim.type === 'serve_drink') {
      // 6. Finished cup glides onto wooden Serve Coaster -> floating +$Cash reward badge pops up
      this.activeBaristaCupGroup.position.set(
        THREE.MathUtils.lerp(defaultCupX, 2.35, smoothP),
        1.075 + Math.sin(p * Math.PI) * 0.08,
        THREE.MathUtils.lerp(defaultCupZ, 0.12, smoothP)
      );
      this.floatingBadgeSprite.visible = true;
      this.floatingBadgeSprite.position.set(2.35, 1.36 + p * 0.22, 0.12);
    }
  }

  private updateSimulationVisuals(dt: number) {
    const dampFactor = 1 - Math.exp(-14.0 * dt);

    // 1. Update Step-by-Step Barista 3D Choreography
    this.updateBaristaStepChoreography(dt);

    // 2. Camera Mode: "TITLE_ORBIT" vs First-Person Station Lerp (with micro-focus during step animations)
    const isTitle = this.gameState.phase === 'title';
    this.titleHeroCupGroup.visible = isTitle;
    this.titlePlaqueGroup.visible = isTitle;

    if (isTitle) {
      const swayX = Math.sin(this.elapsed * 0.55) * 0.24;
      const swayY = Math.cos(this.elapsed * 0.4) * 0.03;
      _targetPos.set(0.35 + swayX, 1.44 + swayY, 1.45);
      _targetLook.set(0.25, 1.15, -0.05);
    } else {
      const preset = STATION_CAMERAS[this.gameState.activeStation] || STATION_CAMERAS[2];
      _targetPos.copy(preset.pos);
      const animFocusZoom = this.stepAnim ? -0.16 : 0;
      _targetPos.z += this.manualCameraZoomOffset + animFocusZoom;
      _targetLook.copy(preset.look);
      _targetLook.x += this.manualCameraYawOffset * 2.2;
    }

    this.camera.position.lerp(_targetPos, dampFactor);
    this.currentLookAt.lerp(_targetLook, dampFactor);
    _lookMat.lookAt(this.camera.position, this.currentLookAt, _upVec);
    _targetQuat.setFromRotationMatrix(_lookMat);
    this.camera.quaternion.slerp(_targetQuat, dampFactor);

    // 3. Hanging Wooden & Neon Sign gentle breeze sway
    if (this.hangingSignGroup) {
      this.hangingSignGroup.rotation.x = Math.sin(this.elapsed * 1.3) * 0.025;
      this.hangingSignGroup.rotation.z = Math.cos(this.elapsed * 0.9) * 0.012;
    }

    // 4. 3D Vinyl Turntable Platter Spin & Tonearm Kinematics
    if (this.vinylPlatterGroup && this.vinylTonearmPivot) {
      if (this.spotifyState.isPlaying) {
        const angularSpeed = this.spotifyState.rpm === 45 ? 4.71 : 3.49;
        this.vinylPlatterGroup.rotation.y -= angularSpeed * dt;
        this.vinylTonearmPivot.rotation.y = THREE.MathUtils.lerp(
          this.vinylTonearmPivot.rotation.y,
          0.32,
          dampFactor
        );
        this.vinylTonearmPivot.rotation.x = THREE.MathUtils.lerp(
          this.vinylTonearmPivot.rotation.x,
          0.04,
          dampFactor
        );
      } else {
        this.vinylTonearmPivot.rotation.y = THREE.MathUtils.lerp(
          this.vinylTonearmPivot.rotation.y,
          0.0,
          dampFactor
        );
        this.vinylTonearmPivot.rotation.x = THREE.MathUtils.lerp(
          this.vinylTonearmPivot.rotation.x,
          -0.08,
          dampFactor
        );
      }
    }

    // 5. Smart Ingredient Highlighter (pulses amber emissive on recommended tool)
    const pinnedOrder =
      this.gameState.customers.find(
        (c) => c.id === this.gameState.pinnedOrderId && c.state === 'ordering'
      ) || this.gameState.customers.find((c) => c.state === 'ordering');
    const recipe = pinnedOrder ? getRecipeById(pinnedOrder.recipeId) : null;
    const nextStep = getNextRecommendedStep(this.gameState.currentCup, recipe);
    const recommendedToolKey =
      nextStep.toolKey === 'syrup' && recipe ? `syrup-${recipe.syrup}` : nextStep.toolKey;

    const pulseAmount = (Math.sin(this.elapsed * 4.5) * 0.5 + 0.5) * 0.35;
    for (const [key, group] of this.toolGroups.entries()) {
      const isRecommended = this.gameState.phase === 'playing' && key === recommendedToolKey;
      const isHovered = key === this.hoveredToolKey;
      const targetScale = isHovered ? 1.04 : 1.0;
      group.scale.lerp(_tempVec.setScalar(targetScale), dampFactor);

      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (
            mat &&
            mat.emissive &&
            mat !== this.neonTubeMat &&
            mat !== this.ghostSnapMat &&
            mat !== this.groupHeadLedMat
          ) {
            if (isHovered) {
              mat.emissive.setHex(0xf59e0b);
              mat.emissiveIntensity = 0.45;
            } else if (isRecommended) {
              mat.emissive.setHex(0xf59e0b);
              mat.emissiveIntensity = pulseAmount;
            } else if (mat.emissive.getHex() === 0xf59e0b) {
              mat.emissiveIntensity = 0;
            }
          }
        }
      });
    }

    // 6. Animate Pooled Steam Particles
    for (let i = 0; i < 24; i++) {
      const t = (this.elapsed * 0.65 + i * 0.17) % 1;
      const isTitleCupSteam = i < 12;
      const baseX = isTitleCupSteam ? 0.18 : this.activeBaristaCupGroup.position.x;
      const baseY = isTitleCupSteam ? 1.22 : 1.26;
      const baseZ = isTitleCupSteam ? 0.42 : this.activeBaristaCupGroup.position.z;

      _dummyObj.position.set(
        baseX + Math.sin(t * 6 + i) * 0.035,
        baseY + t * 0.38,
        baseZ + Math.cos(t * 5 + i) * 0.035
      );
      const s = Math.sin(t * Math.PI) * 0.9;
      _dummyObj.scale.setScalar(Math.max(0.01, s));
      _dummyObj.updateMatrix();
      this.steamParticlesInstanced.setMatrixAt(i, _dummyObj.matrix);
    }
    this.steamParticlesInstanced.instanceMatrix.needsUpdate = true;

    // 7. Animate Floating Musical Note Particles above Vinyl Turntable
    this.musicNotesInstanced.visible = this.spotifyState.isPlaying;
    if (this.spotifyState.isPlaying) {
      for (let i = 0; i < 12; i++) {
        const t = (this.elapsed * 0.45 + i * 0.25) % 1;
        _dummyObj.position.set(
          3.25 + Math.sin(t * 5 + i) * 0.18,
          1.22 + t * 0.55,
          0.08 + Math.cos(t * 4 + i) * 0.14
        );
        _dummyObj.rotation.set(0.3, this.elapsed * 1.5 + i, 0.2);
        const s = Math.sin(t * Math.PI);
        _dummyObj.scale.setScalar(Math.max(0.01, s));
        _dummyObj.updateMatrix();
        this.musicNotesInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      this.musicNotesInstanced.instanceMatrix.needsUpdate = true;
    }

    // 8. Animate Rain Drops when weather === 'rainy'
    if (this.rainDropsInstanced.visible) {
      for (let i = 0; i < 60; i++) {
        const t = (this.elapsed * 2.4 + i * 0.19) % 1;
        const rx = -4.5 + (i % 15) * 0.65;
        const rz = -1.6 - Math.floor(i / 15) * 1.4;
        _dummyObj.position.set(rx, 3.6 - t * 3.6, rz);
        _dummyObj.scale.setScalar(1);
        _dummyObj.updateMatrix();
        this.rainDropsInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      this.rainDropsInstanced.instanceMatrix.needsUpdate = true;
    }

    // 9. Animate Articulated 3D Customers (Walk Cycle, Counter Ordering, Sitting & Sipping at Garden Chairs)
    const seatCoords = [
      new THREE.Vector3(-2.2, 0, -2.93),
      new THREE.Vector3(0.4, 0, -3.53),
      new THREE.Vector3(2.8, 0, -2.83),
    ];

    let orderQueueIdx = 0;
    this.gameState.customers.forEach((cust) => {
      const actor = this.customerActors.get(cust.id);
      if (!actor) return;

      if (cust.state === 'ordering') {
        _targetPos.set(-2.35 + orderQueueIdx * 0.95, 0, -1.22);
        orderQueueIdx++;
      } else if (cust.state === 'seated' && cust.seatIndex !== null) {
        _targetPos.copy(seatCoords[cust.seatIndex] || seatCoords[0]);
      } else {
        _targetPos.set(4.5, 0, -5.0);
      }

      const dx = _targetPos.x - actor.currentPos.x;
      const dz = _targetPos.z - actor.currentPos.z;
      const dist = Math.hypot(dx, dz);

      actor.currentPos.lerp(_targetPos, dampFactor * 0.65);
      actor.group.position.copy(actor.currentPos);

      // Periodic Eye Blinking
      const blinkCycle = (this.elapsed + actor.seed * 0.37) % 3.6;
      const eyeScaleY = blinkCycle < 0.12 ? 0.1 : 1.0;
      actor.leftEyeMesh.scale.y = eyeScaleY;
      actor.rightEyeMesh.scale.y = eyeScaleY;

      if (dist > 0.08) {
        // Walking Gait Cycle with Articulated Hips, Knees & Arms
        const walkPhase = this.elapsed * 8.0 + actor.seed;
        actor.pelvisGroup.position.y = 0.58 + Math.abs(Math.sin(walkPhase)) * 0.035;
        actor.group.rotation.y = Math.atan2(dx, dz);

        actor.leftHipJoint.rotation.x = Math.sin(walkPhase) * 0.45;
        actor.rightHipJoint.rotation.x = -Math.sin(walkPhase) * 0.45;
        actor.leftKneeJoint.rotation.x = Math.max(0, -Math.cos(walkPhase) * 0.45);
        actor.rightKneeJoint.rotation.x = Math.max(0, Math.cos(walkPhase) * 0.45);

        actor.leftShoulderJoint.rotation.x = -Math.sin(walkPhase) * 0.35;
        actor.leftElbowJoint.rotation.x = -0.25;

        if (actor.heldCup.visible) {
          // Carry cup steady in front
          actor.rightShoulderJoint.rotation.x = -0.55;
          actor.rightElbowJoint.rotation.x = -0.85;
        } else {
          actor.rightShoulderJoint.rotation.x = Math.sin(walkPhase) * 0.35;
          actor.rightElbowJoint.rotation.x = -0.25;
        }
      } else if (cust.state === 'seated') {
        // Seated at Garage Garden Bistro Chair (Knees bent 90 deg, facing table, sipping coffee)
        actor.group.rotation.y = Math.PI;
        actor.pelvisGroup.position.y = 0.44;
        actor.leftHipJoint.rotation.x = -1.35;
        actor.rightHipJoint.rotation.x = -1.35;
        actor.leftKneeJoint.rotation.x = 1.35;
        actor.rightKneeJoint.rotation.x = 1.35;

        actor.leftShoulderJoint.rotation.x = -0.35;
        actor.leftElbowJoint.rotation.x = -0.65;

        const sipWave = Math.max(0, Math.sin(this.elapsed * 1.6 + actor.seed));
        actor.rightShoulderJoint.rotation.x = -0.55 - sipWave * 0.48;
        actor.rightElbowJoint.rotation.x = -0.85 - sipWave * 0.55;
        actor.neckJoint.rotation.x = -sipWave * 0.22;
      } else {
        // Standing at Barista Counter Waiting to Order / Receive Drink
        actor.group.rotation.y = 0;
        actor.pelvisGroup.position.y = 0.58 + Math.sin(this.elapsed * 2.2 + actor.seed) * 0.008;
        actor.leftHipJoint.rotation.x = 0;
        actor.rightHipJoint.rotation.x = 0;
        actor.leftKneeJoint.rotation.x = 0;
        actor.rightKneeJoint.rotation.x = 0;

        actor.leftShoulderJoint.rotation.x = -0.25;
        actor.leftElbowJoint.rotation.x = -0.45;

        const isReaching = this.serveReachTimer > 0 && orderQueueIdx === 1;
        actor.rightShoulderJoint.rotation.x = isReaching ? -0.95 : -0.25;
        actor.rightElbowJoint.rotation.x = isReaching ? -0.35 : -0.45;
        actor.neckJoint.rotation.y = Math.sin(this.elapsed * 1.1 + actor.seed) * 0.14;
        actor.neckJoint.rotation.x = 0;
      }
    });
  }

  public dispose() {
    this.isDisposed = true;
    window.cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.studioLogoTexture?.dispose();
    this.woodBumpTexture?.dispose();
    this.vinylLabelTexture?.dispose();
    this.hangingSignTexture?.dispose();
    this.latteArtTexture?.dispose();
    this.floatingBadgeTexture?.dispose();
    this.renderer.dispose();
  }
}
