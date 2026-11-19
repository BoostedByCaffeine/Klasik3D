import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { STUDIO_ICON_SVG_RAW, STUDIO_LOGO_SVG_RAW } from '../components/StudioLogo';
import {
  BaristaStationId,
  CustomerOrder,
  CustomerSkinPackId,
  KlasikGameState,
  LOUNGE_SEAT_COORDS,
  LOUNGE_TABLE_LAYOUT,
  MIATA_BAY,
  SyrupFlavor,
  WeatherMode,
  getNextRecommendedStep,
  getRecipeById,
  isClearOfMiataBay,
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
const _targetColor = new THREE.Color();
const _targetCremaColor = new THREE.Color();

export type StepAnimType =
  | 'grind'
  | 'tamp'
  | 'pull_espresso'
  | 'steep_tea'
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
      | 'steep_tea'
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

// Re-spaced camera presets matching the non-overlapping X-zones (-2.35 to +2.52)
const STATION_CAMERAS: Record<BaristaStationId, StationCameraPreset> = {
  1: {
    pos: new THREE.Vector3(-1.92, 1.62, 1.88),
    look: new THREE.Vector3(-1.85, 1.24, -0.75),
  },
  2: {
    pos: new THREE.Vector3(-0.36, 1.58, 1.76),
    look: new THREE.Vector3(-0.36, 1.2, 0.05),
  },
  3: {
    pos: new THREE.Vector3(1.04, 1.58, 1.76),
    look: new THREE.Vector3(1.04, 1.2, 0.08),
  },
  4: {
    pos: new THREE.Vector3(-1.25, 1.64, 1.84),
    look: new THREE.Vector3(-1.25, 1.18, -1.65),
  },
  5: {
    pos: new THREE.Vector3(2.04, 1.55, 1.58),
    look: new THREE.Vector3(2.1, 1.18, 0.12),
  },
};

// Custom GLSL Shaders for the 3D Cup Dynamic Internal Liquid & Procedural Crema
const CUP_LIQUID_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vHeightNorm;
  uniform float uTime;
  uniform float uFillLevel;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    // CylinderGeometry has height 0.11 centered at 0 (-0.055 .. +0.055)
    vHeightNorm = clamp((position.y + 0.055) / 0.11, 0.0, 1.0);

    vec3 pos = position;
    // Gentle meniscus ripple on top liquid surface
    if (normal.y > 0.5 && uFillLevel > 0.05) {
      float wave = sin(pos.x * 45.0 + uTime * 3.2) * cos(pos.z * 45.0 - uTime * 2.6) * 0.0018;
      pos.y += wave;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const CUP_LIQUID_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vHeightNorm;

  uniform vec3 uBaseColor;
  uniform vec3 uCremaColor;
  uniform float uFillLevel;
  uniform float uHasMilk;
  uniform float uTime;

  void main() {
    // Top cap: Procedural Tiger-Stripe Crema + Rosetta/Heart Latte Art
    if (vNormal.y > 0.5) {
      vec2 centered = (vUv - vec2(0.5)) * 2.0;
      float r = length(centered);
      float angle = atan(centered.y, centered.x);

      // 1. Procedural Tiger-Stripe Golden Crema pattern
      float swirl = sin(r * 24.0 - angle * 3.0 + uTime * 0.6) * 0.5 + 0.5;
      float mottling = cos(centered.x * 18.0 + sin(centered.y * 16.0)) * 0.5 + 0.5;
      vec3 darkRoastRim = uBaseColor * 0.55;
      vec3 tigerCrema = mix(uCremaColor * 0.78, uCremaColor * 1.12, swirl * 0.65 + mottling * 0.35);
      // Darker crema meniscus ring near ceramic wall
      tigerCrema = mix(tigerCrema, darkRoastRim, smoothstep(0.72, 0.98, r) * 0.55);

      // 2. Procedural Rosetta / Heart Microfoam Latte Art when steamed milk is poured
      float heartX = centered.x * 1.35;
      float heartY = centered.y * 1.35 - sqrt(abs(heartX)) * 0.45 + 0.12;
      float heartDist = length(vec2(heartX, heartY));
      float rosettaLeaves = sin(centered.y * 22.0 + cos(centered.x * 10.0) * 2.2) * 0.5 + 0.5;
      float foamMask = smoothstep(0.62, 0.18, heartDist) * (0.65 + 0.35 * rosettaLeaves);
      float centerStem = smoothstep(0.08, 0.01, abs(centered.x)) * smoothstep(0.65, -0.45, centered.y);
      float totalFoam = clamp(foamMask + centerStem * 0.5, 0.0, 1.0);

      vec3 milkArtColor = mix(tigerCrema, vec3(1.0, 0.985, 0.94), totalFoam * 0.92);
      vec3 finalTop = mix(tigerCrema, milkArtColor, clamp(uHasMilk, 0.0, 1.0));
      gl_FragColor = vec4(finalTop, 1.0);
      return;
    }

    // Cylindrical side wall: smooth vertical gradient from rich espresso base to top crema layer
    vec3 deepBottom = uBaseColor * 0.62;
    vec3 bodyCol = mix(deepBottom, uBaseColor, smoothstep(0.0, 0.72, vHeightNorm));
    float cremaBand = smoothstep(0.76, 0.95, vHeightNorm);
    vec3 topLayerCol = mix(uCremaColor, vec3(1.0, 0.98, 0.93), uHasMilk * 0.65);
    vec3 sideColor = mix(bodyCol, topLayerCol, cremaBand);

    gl_FragColor = vec4(sideColor, 1.0);
  }
`;

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
  leftEyeMesh: THREE.Object3D;
  rightEyeMesh: THREE.Object3D;
  heldCup: THREE.Group;
  phoneMesh: THREE.Mesh;
  activitySprite: THREE.Sprite;
  activityTexture: THREE.CanvasTexture;
  lastActivityLabel: string;
  currentPos: THREE.Vector3;
  lastPos: THREE.Vector3;
  waypoints: THREE.Vector3[];
  finalGoalKey: string;
  walkPhase: number;
  walkBlend: number;
  seatedBlend: number;
  facingAngle: number;
  seed: number;
  appliedSkinPack: CustomerSkinPackId;
  appliedShirtColor: string;
}

interface ActiveStepAnimation {
  type: StepAnimType;
  progress: number;
  duration: number;
  flavor?: SyrupFlavor;
  badgeText?: string;
  servedCustomerId?: string;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function evalQuadBezier(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}


export class KlasikCafeScene3D {
  private container: HTMLElement;
  private callbacks: SceneInteractionCallbacks;
  private isSoftwareGl: boolean;
  private isMobileDevice: boolean;
  private resizeObserver: ResizeObserver | null = null;
  private resizeDebounceTimer: number | null = null;
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
  private titleHeroCupLight!: THREE.PointLight;

  // Shared procedural textures
  private studioLogoTexture!: THREE.CanvasTexture;
  private studioCupEmblemTexture!: THREE.CanvasTexture;
  private woodBumpTexture!: THREE.CanvasTexture;
  private microCementTexture!: THREE.CanvasTexture;
  private herringboneFloorTexture!: THREE.CanvasTexture;
  private patioCobbleTexture!: THREE.CanvasTexture;
  private tampedPuckTexture!: THREE.CanvasTexture;
  private vinylLabelTexture!: THREE.CanvasTexture;
  private hangingSignTexture!: THREE.CanvasTexture;
  private latteArtTexture!: THREE.CanvasTexture;
  private floatingBadgeTexture!: THREE.CanvasTexture;
  private pickupSpeechTexture!: THREE.CanvasTexture;
  private stepHaloTexture!: THREE.CanvasTexture;
  private miataLicenseTexture!: THREE.CanvasTexture;
  private ticketTextures: THREE.CanvasTexture[] = [];
  private lastTicketSignature = '';

  // Dynamic materials for customization, equipment skins & highlighting
  private counterWoodMat!: THREE.MeshStandardMaterial;
  private ceramicMugMat!: THREE.MeshStandardMaterial;
  private neonTubeMat!: THREE.MeshStandardMaterial;
  private underCounterNeonMat!: THREE.MeshStandardMaterial;
  private skylightPaneMat!: THREE.MeshStandardMaterial;
  private garageGlassMat!: THREE.MeshStandardMaterial;
  private pendantBulbMats: THREE.MeshStandardMaterial[] = [];
  private glassRainStreaksGroup!: THREE.Group;
  private botanicalPlanterExtras: THREE.Object3D[] = [];
  private hangingSignFaceMat!: THREE.MeshStandardMaterial;
  private lastNeonSignColor = '';
  private ghostSnapMat!: THREE.MeshStandardMaterial;
  private espressoChassisMat!: THREE.MeshStandardMaterial;
  private grinderBodyMat!: THREE.MeshStandardMaterial;
  private pitcherBodyMat!: THREE.MeshStandardMaterial;

  // Interactive & animated 3D groups
  private interactables: THREE.Object3D[] = [];
  private toolGroups: Map<string, THREE.Object3D> = new Map();
  private hangingSignGroup!: THREE.Group;
  private titleHeroCupGroup!: THREE.Group;
  private titlePlaqueGroup!: THREE.Group;

  // 3D Shop Upgrade Showroom & Counter Props
  private upgradeTubePreampGroup!: THREE.Group;
  private upgradeKlipschSpeakersGroup!: THREE.Group;
  private upgradeBonsaiTerrariumGroup!: THREE.Group;
  private upgradeGeishaVaultGroup!: THREE.Group;
  private upgradeMiataStageGroup!: THREE.Group;
  private upgradeGuildCharterGroup!: THREE.Group;

  // Subtle Diegetic Step Halo Ring
  private stepHaloGroup!: THREE.Group;
  private stepHaloGlowMat!: THREE.MeshBasicMaterial;
  private stepHaloRingMat!: THREE.MeshBasicMaterial;

  // 1990 Mazda Miata MX-5 (NA Generation) Showroom Rig
  private miataGroup!: THREE.Group;
  private miataLeftPopupGroup!: THREE.Group;
  private miataRightPopupGroup!: THREE.Group;
  private miataHeadlightBeamsGroup!: THREE.Group;

  // Active Barista Cup & Custom ShaderMaterial Internal Liquid
  private activeBaristaCupGroup!: THREE.Group;
  private activeCupLiquidMesh!: THREE.Mesh;
  private cupLiquidShaderMat!: THREE.ShaderMaterial;
  private currentLiquidFill = 0;
  private currentLiquidMilk = 0;
  private currentLiquidColor = new THREE.Color(0x3b1d0e);
  private currentCremaColor = new THREE.Color(0xd98a3c);
  private cupCurrentPos = new THREE.Vector3(-0.16, 1.055, 0.30);
  private cupTargetPos = new THREE.Vector3(-0.16, 1.055, 0.30);

  private activeCupDrizzleRing!: THREE.Mesh;
  private activeCupIceGroup!: THREE.Group;
  private ghostCupMesh!: THREE.Mesh;
  private bellRippleRingMesh!: THREE.Mesh;

  // Animated Barista Equipment Rig Parts
  private grinderGroup!: THREE.Group;
  private hopperBeansGroup!: THREE.Group;
  private groundStreamGroup!: THREE.Group;
  private portafilterGroup!: THREE.Group;
  private fluffyGroundsMesh!: THREE.Mesh;
  private tampedPuckMesh!: THREE.Mesh;
  private tamperMeshGroup!: THREE.Group;
  private tampPressureRingMesh!: THREE.Mesh;
  private gaugeNeedles: THREE.Mesh[] = [];
  private groupHeadLedMat!: THREE.MeshStandardMaterial;
  private espressoStreamsGroup!: THREE.Group;
  private steamWandPivot!: THREE.Group;
  private milkPitcherGroup!: THREE.Group;
  private pitcherMilkMesh!: THREE.Mesh;
  private milkPourStreamMesh!: THREE.Mesh;
  private teaPotGroup!: THREE.Group;
  private teaPourStreamMesh!: THREE.Mesh;
  private iceScoopGroup!: THREE.Group;
  private syrupPumpHeads: Map<string, THREE.Group> = new Map();
  private syrupRibbonMesh!: THREE.Mesh;
  private matchaWhiskGroup!: THREE.Group;
  private floatingBadgeSprite!: THREE.Sprite;
  private pickupSpeechSprite!: THREE.Sprite;
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
  private activePickupCustomerId: string | null = null;

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

    // 1. Software-WebGL & Mobile GPU detection (for locked 60 FPS on Android)
    this.isMobileDevice =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
      window.innerWidth <= 960;

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

    // 2. WebGLRenderer Initialization (Full MSAA & High-DPI support for High-End Android & Desktop)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    const { width, height } = this.getEffectiveLandscapeDimensions();
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.inset = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a120e);
    this.scene.fog = new THREE.FogExp2(0x1a120e, 0.042);

    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 60);
    this.camera.position.set(2.02, 1.32, 1.18);
    this.camera.lookAt(-0.85, 0.82, -1.35);

    // 4. Studio Environment Map Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Build Procedural Textures
    this.initProceduralTextures();

    // 6. Build Lighting, Cozy Cafe Interior & Garden Architecture, Barista Stations 1..5
    this.initLights();
    this.initMaterials();
    this.buildCafeArchitecture();
    this.buildHangingTitleSign();
    this.buildStation1RegisterAndTickets();
    this.buildStation2EspressoBar();
    this.buildStation3MilkSyrupsAndIce();
    this.buildStation4ServeTrayAndGarden();
    this.buildStation5VinylTurntableCorner();
    this.buildShopUpgradeProps();
    this.buildFloatingBadgeAndHearts();
    this.buildPooledParticles();
    this.scene.add(this.customersRoot);

    // Sync initial state & graphics quality
    this.updateGraphicsQuality();
    this.applyWeatherLighting(this.gameState.weather);
    this.updateDecorMaterials();
    this.updateActiveCupVisuals();
    this.redrawOrderTicketTextures();
    this.syncCustomerActors();

    // Pre-warm shaders on hardware GPUs
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  private shouldUsePhysicalTransmission(): boolean {
    return !this.isSoftwareGl && this.gameState.graphicsQuality === 'max';
  }

  private updateGraphicsQuality() {
    const isLow = this.isSoftwareGl || this.gameState.graphicsQuality === 'low';
    const dpr = window.devicePixelRatio || 1;
    const targetRatio = isLow ? 1.0 : Math.min(dpr, 2.0);

    this.renderer.setPixelRatio(targetRatio);
    const enableShadows = !isLow;
    this.renderer.shadowMap.enabled = enableShadows;
    this.renderer.shadowMap.type = enableShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

    if (this.sunLight) {
      this.sunLight.castShadow = enableShadows;
    }

    const targetAniso = isLow ? 1 : Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    [
      this.microCementTexture,
      this.herringboneFloorTexture,
      this.patioCobbleTexture,
      this.studioLogoTexture,
      this.studioCupEmblemTexture,
      this.hangingSignTexture,
    ].forEach((tex) => {
      if (tex && tex.anisotropy !== targetAniso) {
        tex.anisotropy = targetAniso;
        tex.needsUpdate = true;
      }
    });

    if (this.monsteraLeavesInstanced) {
      const lush = this.gameState.decor.plantDensity === 'lush-jungle';
      this.monsteraLeavesInstanced.count = isLow ? (lush ? 16 : 10) : lush ? 36 : 18;
    }

    const { width, height } = this.getEffectiveLandscapeDimensions();
    this.renderer.setSize(width, height, false);
  }

  private getEffectiveLandscapeDimensions(): {
    width: number;
    height: number;
    isPortraitRotated: boolean;
  } {
    const isPortraitRotated = window.innerHeight > window.innerWidth;
    if (isPortraitRotated) {
      return {
        width: Math.max(1, window.innerHeight, document.documentElement.clientHeight || 0),
        height: Math.max(1, window.innerWidth, document.documentElement.clientWidth || 0),
        isPortraitRotated: true,
      };
    }
    const rect = this.container.getBoundingClientRect();
    return {
      width: Math.max(
        1,
        rect.width || 0,
        window.innerWidth || 0,
        document.documentElement.clientWidth || 0
      ),
      height: Math.max(
        1,
        rect.height || 0,
        window.innerHeight || 0,
        document.documentElement.clientHeight || 0,
        window.visualViewport?.height || 0
      ),
      isPortraitRotated: false,
    };
  }

  private initProceduralTextures() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // A. Studio Logo CanvasTexture (Exclusively for Title Diorama)
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

    // A2. Dedicated Circular Rocket-Coffee Emblem Texture for 3D Foreground Hero Mug
    const cupEmblemCanvas = document.createElement('canvas');
    cupEmblemCanvas.width = 1024;
    cupEmblemCanvas.height = 512;
    const cCtx = cupEmblemCanvas.getContext('2d')!;
    cCtx.fillStyle = '#f8f4ec';
    cCtx.fillRect(0, 0, 1024, 512);

    // Draw full high-detail Rocket-Coffee Emblem at u = 0.5 (x = 512, y = 256)
    // Aspect-compensated (scaleX = 0.66) for cylinder circumference-to-height ratio
    cCtx.save();
    cCtx.translate(512, 256);
    cCtx.scale(0.66, 1.0);

    // 1. Circular Charcoal Badge (#242B2E) with Warm Brass Bezel
    const badgeGrad = cCtx.createLinearGradient(0, -175, 0, 175);
    badgeGrad.addColorStop(0, '#2C3539');
    badgeGrad.addColorStop(1, '#1B2124');
    cCtx.fillStyle = badgeGrad;
    cCtx.strokeStyle = '#F59E0B';
    cCtx.lineWidth = 10;
    cCtx.beginPath();
    cCtx.arc(0, 0, 172, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.stroke();

    // Dashed Orbital Telemetry Ring
    cCtx.save();
    cCtx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    cCtx.lineWidth = 3.5;
    cCtx.setLineDash([24, 14, 8, 14]);
    cCtx.beginPath();
    cCtx.arc(0, 0, 150, 0, Math.PI * 2);
    cCtx.stroke();
    cCtx.restore();

    // 2. Swept Rocket Delta Fins (Left & Right) + Amber Stripes
    cCtx.fillStyle = '#FFFFFF';
    cCtx.beginPath();
    cCtx.moveTo(-86, 10);
    cCtx.lineTo(-136, 58);
    cCtx.lineTo(-126, 86);
    cCtx.lineTo(-66, 58);
    cCtx.closePath();
    cCtx.fill();
    cCtx.fillStyle = '#F59E0B';
    cCtx.beginPath();
    cCtx.moveTo(-88, 26);
    cCtx.lineTo(-122, 60);
    cCtx.lineTo(-116, 74);
    cCtx.lineTo(-74, 52);
    cCtx.closePath();
    cCtx.fill();

    cCtx.fillStyle = '#FFFFFF';
    cCtx.beginPath();
    cCtx.moveTo(86, 10);
    cCtx.lineTo(136, 58);
    cCtx.lineTo(126, 86);
    cCtx.lineTo(66, 58);
    cCtx.closePath();
    cCtx.fill();
    cCtx.fillStyle = '#F59E0B';
    cCtx.beginPath();
    cCtx.moveTo(88, 26);
    cCtx.lineTo(122, 60);
    cCtx.lineTo(116, 74);
    cCtx.lineTo(74, 52);
    cCtx.closePath();
    cCtx.fill();

    // 3. Metallic Thruster Nozzle Bell
    cCtx.fillStyle = '#334155';
    cCtx.strokeStyle = '#FFFFFF';
    cCtx.lineWidth = 4;
    cCtx.beginPath();
    cCtx.moveTo(-36, 66);
    cCtx.lineTo(36, 66);
    cCtx.lineTo(48, 92);
    cCtx.lineTo(-48, 92);
    cCtx.closePath();
    cCtx.fill();
    cCtx.stroke();

    // 4. Multi-Stage Afterburner Flame Plume
    const flameGrad = cCtx.createLinearGradient(0, 92, 0, 168);
    flameGrad.addColorStop(0, '#FEF08A');
    flameGrad.addColorStop(0.5, '#F59E0B');
    flameGrad.addColorStop(1, '#EA580C');
    cCtx.fillStyle = flameGrad;
    cCtx.beginPath();
    cCtx.moveTo(-38, 92);
    cCtx.quadraticCurveTo(0, 174, 38, 92);
    cCtx.closePath();
    cCtx.fill();

    cCtx.fillStyle = '#FEF9C3';
    cCtx.beginPath();
    cCtx.moveTo(-22, 92);
    cCtx.quadraticCurveTo(0, 142, 22, 92);
    cCtx.closePath();
    cCtx.fill();

    // 5. Porcelain Cup Handle (Right Side)
    cCtx.strokeStyle = '#FFFFFF';
    cCtx.lineWidth = 18;
    cCtx.lineCap = 'round';
    cCtx.beginPath();
    cCtx.moveTo(72, -36);
    cCtx.bezierCurveTo(128, -36, 132, 32, 64, 32);
    cCtx.stroke();

    // 6. Tapered Porcelain Rocket-Cup Body
    cCtx.fillStyle = '#FFFFFF';
    cCtx.beginPath();
    cCtx.moveTo(-94, -56);
    cCtx.lineTo(94, -56);
    cCtx.lineTo(70, 52);
    cCtx.quadraticCurveTo(64, 68, 42, 68);
    cCtx.lineTo(-42, 68);
    cCtx.quadraticCurveTo(-64, 68, -70, 52);
    cCtx.closePath();
    cCtx.fill();

    // 7. Dark Charcoal Aerospace Band & Glowing Amber Porthole
    cCtx.fillStyle = '#242B2E';
    cCtx.beginPath();
    cCtx.moveTo(-84, -10);
    cCtx.lineTo(84, -10);
    cCtx.lineTo(78, 16);
    cCtx.lineTo(-78, 16);
    cCtx.closePath();
    cCtx.fill();

    cCtx.fillStyle = '#F59E0B';
    cCtx.strokeStyle = '#FFFFFF';
    cCtx.lineWidth = 5;
    cCtx.beginPath();
    cCtx.arc(0, 3, 18, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.stroke();

    // 8. Espresso Rim & Golden Crema
    cCtx.fillStyle = '#FFFFFF';
    cCtx.strokeStyle = '#242B2E';
    cCtx.lineWidth = 6;
    cCtx.beginPath();
    cCtx.ellipse(0, -56, 94, 22, 0, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.stroke();

    cCtx.fillStyle = '#78350F';
    cCtx.beginPath();
    cCtx.ellipse(0, -56, 80, 14, 0, 0, Math.PI * 2);
    cCtx.fill();

    cCtx.fillStyle = '#D97706';
    cCtx.beginPath();
    cCtx.ellipse(0, -56, 62, 9, 0, 0, Math.PI * 2);
    cCtx.fill();

    // 9. Three Rising Steam Plumes
    cCtx.strokeStyle = '#FDE68A';
    cCtx.lineWidth = 10;
    cCtx.lineCap = 'round';
    [-40, 0, 40].forEach((sx, idx) => {
      cCtx.strokeStyle = idx === 1 ? '#F59E0B' : '#FDE68A';
      cCtx.beginPath();
      cCtx.moveTo(sx, -84);
      cCtx.bezierCurveTo(sx - 16, -104, sx + 16, -124, sx, -146 - (idx === 1 ? 10 : 0));
      cCtx.stroke();
    });
    cCtx.restore();

    this.studioCupEmblemTexture = new THREE.CanvasTexture(cupEmblemCanvas);
    this.studioCupEmblemTexture.colorSpace = THREE.SRGBColorSpace;
    this.studioCupEmblemTexture.anisotropy = maxAniso;

    const iconDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(STUDIO_ICON_SVG_RAW)}`;
    const iconImg = new Image();
    iconImg.onload = () => {
      cCtx.fillStyle = '#f8f4ec';
      cCtx.fillRect(0, 0, 1024, 512);
      cCtx.drawImage(iconImg, 386, 66, 252, 380);
      this.studioCupEmblemTexture.needsUpdate = true;
    };
    iconImg.src = iconDataUrl;

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

    // C0. Polished Architectural Micro-Cement Garage Floor Texture
    const cementCanvas = document.createElement('canvas');
    cementCanvas.width = 256;
    cementCanvas.height = 256;
    const cmCtx = cementCanvas.getContext('2d')!;
    cmCtx.fillStyle = '#3b3733';
    cmCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 420; i++) {
      const cx = (i * 53) % 256;
      const cy = (i * 97) % 256;
      const r = 6 + (i % 18);
      cmCtx.fillStyle =
        i % 3 === 0
          ? 'rgba(255,248,238,0.032)'
          : i % 3 === 1
          ? 'rgba(20,16,13,0.048)'
          : 'rgba(138,124,108,0.035)';
      cmCtx.beginPath();
      cmCtx.arc(cx, cy, r, 0, Math.PI * 2);
      cmCtx.fill();
    }
    // Subtle architectural expansion joint lines
    cmCtx.strokeStyle = 'rgba(22, 18, 15, 0.35)';
    cmCtx.lineWidth = 2;
    cmCtx.strokeRect(1, 1, 254, 254);
    cmCtx.strokeStyle = 'rgba(255, 245, 230, 0.06)';
    cmCtx.lineWidth = 1;
    cmCtx.beginPath();
    cmCtx.moveTo(0, 128);
    cmCtx.lineTo(256, 128);
    cmCtx.moveTo(128, 0);
    cmCtx.lineTo(128, 256);
    cmCtx.stroke();

    this.microCementTexture = new THREE.CanvasTexture(cementCanvas);
    this.microCementTexture.colorSpace = THREE.SRGBColorSpace;
    this.microCementTexture.wrapS = THREE.RepeatWrapping;
    this.microCementTexture.wrapT = THREE.RepeatWrapping;
    this.microCementTexture.repeat.set(7, 5);

    // C. Warm Herringbone Hardwood Flooring Texture (Walnut Lounge Deck Inset)
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 256;
    floorCanvas.height = 256;
    const fCtx = floorCanvas.getContext('2d')!;
    fCtx.fillStyle = '#3b2416';
    fCtx.fillRect(0, 0, 256, 256);
    const plankW = 32;
    const plankH = 64;
    const tones = ['#523320', '#442a1a', '#5d3a24', '#392214'];
    for (let y = 0; y < 256; y += plankW) {
      for (let x = 0; x < 256; x += plankH) {
        fCtx.fillStyle = tones[((x + y) / 32) % tones.length];
        fCtx.fillRect(x + 1, y + 1, plankH - 2, plankW - 2);
      }
    }
    this.herringboneFloorTexture = new THREE.CanvasTexture(floorCanvas);
    this.herringboneFloorTexture.colorSpace = THREE.SRGBColorSpace;
    this.herringboneFloorTexture.wrapS = THREE.RepeatWrapping;
    this.herringboneFloorTexture.wrapT = THREE.RepeatWrapping;
    this.herringboneFloorTexture.repeat.set(4, 3);

    // D. Sunlit Garden Patio Cobblestone / Terrace Tile Texture
    const patioCanvas = document.createElement('canvas');
    patioCanvas.width = 256;
    patioCanvas.height = 256;
    const pCtx = patioCanvas.getContext('2d')!;
    pCtx.fillStyle = '#292524';
    pCtx.fillRect(0, 0, 256, 256);
    const tileColors = ['#44403c', '#57534e', '#3f3a36', '#4f463d'];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        pCtx.fillStyle = tileColors[(r * 3 + c) % tileColors.length];
        pCtx.beginPath();
        pCtx.roundRect(c * 64 + 3, r * 64 + 3, 58, 58, 8);
        pCtx.fill();
      }
    }
    this.patioCobbleTexture = new THREE.CanvasTexture(patioCanvas);
    this.patioCobbleTexture.colorSpace = THREE.SRGBColorSpace;
    this.patioCobbleTexture.wrapS = THREE.RepeatWrapping;
    this.patioCobbleTexture.wrapT = THREE.RepeatWrapping;
    this.patioCobbleTexture.repeat.set(10, 8);

    // E. High-Visibility Tamped Espresso Puck Texture (Concentric calibration rings)
    const puckCanvas = document.createElement('canvas');
    puckCanvas.width = 128;
    puckCanvas.height = 128;
    const pkCtx = puckCanvas.getContext('2d')!;
    pkCtx.fillStyle = '#381a0b';
    pkCtx.fillRect(0, 0, 128, 128);
    pkCtx.strokeStyle = '#522812';
    pkCtx.lineWidth = 3;
    [18, 34, 48, 58].forEach((radius) => {
      pkCtx.beginPath();
      pkCtx.arc(64, 64, radius, 0, Math.PI * 2);
      pkCtx.stroke();
    });
    this.tampedPuckTexture = new THREE.CanvasTexture(puckCanvas);
    this.tampedPuckTexture.colorSpace = THREE.SRGBColorSpace;

    // F. Procedural Rosetta / Heart Latte Art Texture (for Customer Held Cups & Title Cup)
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

    laCtx.fillStyle = '#fffbeb';
    for (let i = 0; i < 6; i++) {
      const y = 175 - i * 18;
      const spread = 46 - i * 5;
      laCtx.beginPath();
      laCtx.ellipse(128 - spread * 0.55, y, spread * 0.55, 9, -0.35, 0, Math.PI * 2);
      laCtx.ellipse(128 + spread * 0.55, y, spread * 0.55, 9, 0.35, 0, Math.PI * 2);
      laCtx.fill();
    }
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

    // G. Vinyl Record Center Label & Sleeve Texture
    const vinylCanvas = document.createElement('canvas');
    vinylCanvas.width = 256;
    vinylCanvas.height = 256;
    this.vinylLabelTexture = new THREE.CanvasTexture(vinylCanvas);
    this.vinylLabelTexture.colorSpace = THREE.SRGBColorSpace;
    this.vinylLabelTexture.anisotropy = maxAniso;
    this.redrawVinylLabelTexture();

    // H. Hanging 3D Wooden & Neon Sign Texture ("KLASIK 3D")
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 160;
    this.hangingSignTexture = new THREE.CanvasTexture(signCanvas);
    this.hangingSignTexture.colorSpace = THREE.SRGBColorSpace;
    this.hangingSignTexture.anisotropy = maxAniso;
    this.redrawHangingSignTexture('#f59e0b');

    // I. Floating 3D Telemetry / Reward Badge Texture
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 256;
    badgeCanvas.height = 96;
    this.floatingBadgeTexture = new THREE.CanvasTexture(badgeCanvas);
    this.floatingBadgeTexture.colorSpace = THREE.SRGBColorSpace;

    // J. Customer Pickup Delighted Reaction Speech Bubble Texture
    const speechCanvas = document.createElement('canvas');
    speechCanvas.width = 384;
    speechCanvas.height = 112;
    this.pickupSpeechTexture = new THREE.CanvasTexture(speechCanvas);
    this.pickupSpeechTexture.colorSpace = THREE.SRGBColorSpace;
    this.drawPickupSpeechBubble('Looks amazing, thank you!');
  }

  private redrawHangingSignTexture(accentHex: string) {
    if (!this.hangingSignTexture) return;
    const signCanvas = this.hangingSignTexture.image as HTMLCanvasElement;
    const sCtx = signCanvas.getContext('2d');
    if (!sCtx) return;
    sCtx.fillStyle = '#1d130d';
    sCtx.fillRect(0, 0, 512, 160);
    sCtx.strokeStyle = accentHex;
    sCtx.lineWidth = 6;
    sCtx.strokeRect(10, 10, 492, 140);
    sCtx.fillStyle = '#fef3c7';
    sCtx.font = 'bold 54px Georgia, serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('KLASIK 3D', 256, 82);
    sCtx.fillStyle = accentHex;
    sCtx.font = '600 20px sans-serif';
    sCtx.fillText('GARAGE GARDEN CAFE · EST. 2026', 256, 122);
    this.hangingSignTexture.needsUpdate = true;
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
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 48);
    this.floatingBadgeTexture.needsUpdate = true;
  }

  private drawPickupSpeechBubble(text: string) {
    const canvas = this.pickupSpeechTexture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 384, 112);
    ctx.fillStyle = 'rgba(254, 243, 199, 0.96)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 364, 84, 24);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 21px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 52);
    this.pickupSpeechTexture.needsUpdate = true;
  }

  // Draws Dynamic Hanging 3D Order Tickets above Station 1 (Dirty-checked so textures only upload when changed!)
  private redrawOrderTicketTextures() {
    const ordering = this.gameState.customers.filter((c) => c.state === 'ordering');
    const sig = ordering
      .slice(0, 3)
      .map(
        (c) =>
          `${c.id}:${c.recipeId}:${Math.round(c.patience / 5)}:${(c.customAddons || []).join(',')}`
      )
      .join('|');
    if (sig === this.lastTicketSignature) return;
    this.lastTicketSignature = sig;

    for (let i = 0; i < this.ticketTextures.length; i++) {
      const tex = this.ticketTextures[i];
      const canvas = tex.image as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      const cust: CustomerOrder | undefined = ordering[i];
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(0, 0, 256, 320);

      // Top brass ticket clip bar
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, 0, 256, 36);
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`ORDER #${i + 1}`, 128, 24);

      if (!cust) {
        ctx.fillStyle = '#a8a29e';
        ctx.font = 'italic 20px sans-serif';
        ctx.fillText('OPEN SLOT', 128, 160);
        tex.needsUpdate = true;
        continue;
      }

      const recipe = getRecipeById(cust.recipeId);
      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(cust.customerName.toUpperCase(), 128, 80);

      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 96);
      ctx.lineTo(236, 96);
      ctx.stroke();

      // Drink Name (wrapped in 2 lines)
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 21px Georgia, serif';
      const words = recipe.name.split(' ');
      const line1 = words.slice(0, 2).join(' ');
      const line2 = words.slice(2).join(' ');
      ctx.fillText(line1, 128, 132);
      if (line2) ctx.fillText(line2, 128, 158);

      // Custom Add-On Modifiers Badges
      const addons = cust.customAddons || [];
      addons.slice(0, 2).forEach((addon, aIdx) => {
        const y = 182 + aIdx * 36;
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(32, y, 192, 28, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#92400e';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(addon, 128, y + 19);
      });

      // Live Color-Coded Patience Bar at Bottom of Ticket
      ctx.fillStyle = '#e7e5e4';
      ctx.fillRect(24, 276, 208, 20);
      const patRatio = Math.max(0, Math.min(1, cust.patience / 100));
      ctx.fillStyle =
        cust.patience > 50 ? '#10b981' : cust.patience > 25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(24, 276, Math.round(208 * patRatio), 20);
      ctx.strokeStyle = '#44403c';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 276, 208, 20);

      tex.needsUpdate = true;
    }
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

  private createVintagePosterTexture(title: string, subtitle: string, accentHex: string) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 340;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f5ebe1';
    ctx.fillRect(0, 0, 256, 340);
    ctx.strokeStyle = '#291c14';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, 236, 320);

    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.arc(128, 138, 64, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 128, 248);
    ctx.fillStyle = '#57534e';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(subtitle, 128, 280);
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

    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x3e2723, 0.88);
    this.hemiLight.position.set(0, 8, 0);
    this.scene.add(this.hemiLight);

    this.cafeWarmLight = new THREE.PointLight(0xffb74d, 1.9, 14, 1.5);
    this.cafeWarmLight.position.set(-0.2, 2.75, 0.3);
    this.scene.add(this.cafeWarmLight);

    this.neonSignLight = new THREE.PointLight(0xf59e0b, 1.4, 7, 1.8);
    this.neonSignLight.position.set(0, 2.35, -0.1);
    this.scene.add(this.neonSignLight);

    this.turntableLampLight = new THREE.PointLight(0xfbbf24, 1.2, 4.5, 2);
    this.turntableLampLight.position.set(2.15, 1.45, 0.25);
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

    this.ceramicMugMat = new THREE.MeshStandardMaterial({
      color: 0xf8f5f0,
      roughness: 0.14,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    this.neonTubeMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    this.underCounterNeonMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.35,
      roughness: 0.25,
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

  // Helper: Sculpted multi-plane low-poly Monstera / Fiddle-Leaf / Olive foliage planter
  private createArchitecturalPlanter(
    kind: 'monstera' | 'fiddle' | 'olive',
    width = 0.95,
    depth = 0.42
  ): THREE.Group {
    const planter = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x3f3b37,
      roughness: 0.78,
      metalness: 0.06,
    });
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x1e140e,
      roughness: 0.95,
    });
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x2d4a26,
      roughness: 0.7,
    });
    const leafDark = new THREE.MeshStandardMaterial({
      color: kind === 'olive' ? 0x4d6b45 : 0x165b33,
      roughness: 0.48,
      side: THREE.DoubleSide,
    });
    const leafBright = new THREE.MeshStandardMaterial({
      color: kind === 'olive' ? 0x6b8e5a : 0x228b49,
      roughness: 0.42,
      side: THREE.DoubleSide,
    });

    // Sleek concrete-and-walnut trough
    const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.42, depth), concreteMat);
    base.position.y = 0.21;
    base.castShadow = true;
    base.receiveShadow = true;
    planter.add(base);

    const walnutCollar = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.04, 0.055, depth + 0.04),
      this.counterWoodMat
    );
    walnutCollar.position.y = 0.43;
    planter.add(walnutCollar);

    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.08, 0.04, depth - 0.08),
      soilMat
    );
    soil.position.y = 0.43;
    planter.add(soil);

    // Contact shadow disc under planter (keeps grounded in LOW gfx)
    const planterShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(width + 0.22, depth + 0.22),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      })
    );
    planterShadow.rotation.x = -Math.PI / 2;
    planterShadow.position.y = 0.008;
    planter.add(planterShadow);

    if (kind === 'monstera') {
      // Sculpted arching stems with angled split leaf blades
      const bladeGeo = new THREE.CircleGeometry(0.18, 6);
      bladeGeo.scale(0.85, 1.32, 1);
      const count = 8;
      for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) - 0.5 : 0;
        const sx = t * (width * 0.68);
        const h = 0.48 + (i % 3) * 0.16;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, h, 6), stemMat);
        stem.position.set(sx, 0.44 + h * 0.46, ((i % 2) - 0.5) * 0.1);
        stem.rotation.z = -t * 0.45 + (i % 2 === 0 ? 0.12 : -0.12);
        stem.rotation.x = (i % 2 === 0 ? 0.22 : -0.18);
        planter.add(stem);

        const blade = new THREE.Mesh(bladeGeo, i % 2 === 0 ? leafDark : leafBright);
        blade.position.set(
          sx + Math.sin(-stem.rotation.z) * h * 0.48,
          0.44 + h * 0.92,
          stem.position.z + Math.sin(stem.rotation.x) * 0.18
        );
        blade.rotation.set(-0.55 + (i % 3) * 0.22, t * 1.1 + i * 0.4, stem.rotation.z * 0.7);
        planter.add(blade);
      }
    } else if (kind === 'fiddle') {
      // Tall branched Fiddle-Leaf Fig
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.036, 1.25, 8), new THREE.MeshStandardMaterial({ color: 0x4b321e, roughness: 0.85 }));
      trunk.position.set(0, 1.04, 0);
      planter.add(trunk);

      const leafGeo = new THREE.CircleGeometry(0.21, 7);
      leafGeo.scale(0.75, 1.35, 1);
      for (let i = 0; i < 9; i++) {
        const angle = i * 1.18;
        const ly = 0.82 + i * 0.12;
        const leaf = new THREE.Mesh(leafGeo, i % 2 === 0 ? leafDark : leafBright);
        leaf.position.set(Math.cos(angle) * 0.2, ly, Math.sin(angle) * 0.2);
        leaf.rotation.set(-0.65 + (i % 3) * 0.15, -angle, 0.25);
        planter.add(leaf);
      }
    } else {
      // Sculpted potted Olive / Ficus tree with multi-branch foliage fans
      const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c4633, roughness: 0.88 });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.042, 1.1, 8), barkMat);
      trunk.position.set(0, 0.98, 0);
      trunk.rotation.z = 0.08;
      planter.add(trunk);

      const clusterGeo = new THREE.OctahedronGeometry(0.24, 1);
      clusterGeo.scale(1.25, 0.72, 1.1);
      [
        [-0.22, 1.48, 0.08, 0.92],
        [0.24, 1.56, -0.06, 0.88],
        [0.02, 1.76, 0.04, 1.05],
        [-0.12, 1.66, -0.18, 0.78],
        [0.16, 1.42, 0.16, 0.72],
      ].forEach(([cx, cy, cz, cs], idx) => {
        const c = new THREE.Mesh(clusterGeo, idx % 2 === 0 ? leafDark : leafBright);
        c.position.set(cx, cy, cz);
        c.scale.setScalar(cs);
        c.rotation.set(idx * 0.4, idx * 0.9, idx * 0.3);
        planter.add(c);
      });
    }

    return planter;
  }

  // Expansive Modern Architectural Garage-Garden Cafe & 1990 Mazda Miata MX-5 Showroom
  private buildCafeArchitecture() {
    const archGroup = new THREE.Group();
    this.pendantBulbMats = [];
    this.botanicalPlanterExtras = [];

    const charcoalSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1f2428,
      roughness: 0.38,
      metalness: 0.78,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.22,
      metalness: 0.88,
    });
    const warmPlasterMat = new THREE.MeshStandardMaterial({
      color: 0x2d241e,
      roughness: 0.82,
      metalness: 0.04,
    });
    const concreteDadoMat = new THREE.MeshStandardMaterial({
      color: 0x35322f,
      roughness: 0.76,
      metalness: 0.08,
    });

    // 1. Polished Architectural Micro-Cement Interior Garage Floor (16m x 11m, z = -6.2 to +4.8)
    const microCementFloorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.microCementTexture,
      roughness: 0.44,
      metalness: 0.08,
    });
    const interiorFloor = new THREE.Mesh(new THREE.PlaneGeometry(16, 11.2), microCementFloorMat);
    interiorFloor.rotation.x = -Math.PI / 2;
    interiorFloor.position.set(0, 0, -0.8);
    interiorFloor.receiveShadow = true;
    archGroup.add(interiorFloor);

    // Warm Herringbone Walnut Lounge Deck inset beneath the 4 relocated bistro tables (x: -0.75 to +3.95, z: -5.6 to -1.7)
    const loungeDeckMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.herringboneFloorTexture,
      roughness: 0.5,
      metalness: 0.06,
    });
    const loungeDeck = new THREE.Mesh(new THREE.BoxGeometry(4.75, 0.016, 3.85), loungeDeckMat);
    loungeDeck.position.set(1.55, 0.008, -3.65);
    loungeDeck.receiveShadow = true;
    archGroup.add(loungeDeck);

    // Subtle brass border strip framing the walnut lounge deck
    const deckFrame = new THREE.Mesh(new THREE.BoxGeometry(4.83, 0.012, 3.93), brassMat);
    deckFrame.position.set(1.55, 0.004, -3.65);
    archGroup.add(deckFrame);

    // 2. Outdoor Courtyard Cobblestone Terrace outside the Glass Garage Bay Doors (z = -6.2 to -13.5)
    const patioFloorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.patioCobbleTexture,
      roughness: 0.78,
      metalness: 0.04,
    });
    const patioFloor = new THREE.Mesh(new THREE.PlaneGeometry(20, 7.6), patioFloorMat);
    patioFloor.rotation.x = -Math.PI / 2;
    patioFloor.position.set(0, -0.01, -10.0);
    patioFloor.receiveShadow = true;
    archGroup.add(patioFloor);

    // Outer Botanical Garden Lawn Perimeter beyond courtyard
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x1b331d,
      roughness: 0.92,
    });
    const grassPlane = new THREE.Mesh(new THREE.PlaneGeometry(38, 22), grassMat);
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.position.set(0, -0.028, -16.0);
    archGroup.add(grassPlane);

    // 3. Main Fluted-Timber & Brushed-Brass Barista Counter (Top surface strictly y = 1.00)
    const counterBaseMat = new THREE.MeshStandardMaterial({
      color: 0x181310,
      roughness: 0.68,
      metalness: 0.14,
    });
    const counterBody = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.94, 1.36), counterBaseMat);
    counterBody.position.set(0.05, 0.47, 0.44);
    counterBody.castShadow = true;
    counterBody.receiveShadow = true;
    archGroup.add(counterBody);

    // Vertical fluted timber slats across the customer-facing rear fascia of the bar counter
    for (let s = 0; s < 28; s++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.84, 0.03), this.counterWoodMat);
      slat.position.set(-2.62 + s * 0.198, 0.48, -0.25);
      archGroup.add(slat);
    }

    // Brushed-brass toe kickplate + under-counter warm LED accent strip
    const kickplate = new THREE.Mesh(new THREE.BoxGeometry(5.66, 0.075, 1.4), brassMat);
    kickplate.position.set(0.05, 0.038, 0.44);
    archGroup.add(kickplate);

    const underCounterLed = new THREE.Mesh(
      new THREE.BoxGeometry(5.55, 0.022, 0.025),
      this.underCounterNeonMat
    );
    underCounterLed.position.set(0.05, 0.91, -0.265);
    archGroup.add(underCounterLed);

    // Beveled Walnut Countertop Slab (Top surface strictly at y = 1.00)
    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(5.76, 0.06, 1.48),
      this.counterWoodMat
    );
    counterTop.position.set(0.05, 0.97, 0.44);
    counterTop.castShadow = true;
    counterTop.receiveShadow = true;
    archGroup.add(counterTop);

    const brassTrim = new THREE.Mesh(new THREE.BoxGeometry(5.78, 0.022, 1.5), brassMat);
    brassTrim.position.set(0.05, 0.935, 0.44);
    archGroup.add(brassTrim);

    // 4. Solid Architectural Left & Right Showroom Walls (x = -5.6 and x = +5.6)
    const leftWallUpper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.1, 10.6), warmPlasterMat);
    leftWallUpper.position.set(-5.6, 2.7, -1.6);
    leftWallUpper.receiveShadow = true;
    archGroup.add(leftWallUpper);

    const leftWallDado = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.18, 10.6), concreteDadoMat);
    leftWallDado.position.set(-5.58, 0.59, -1.6);
    leftWallDado.receiveShadow = true;
    archGroup.add(leftWallDado);

    const leftDadoRail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.045, 10.6), this.counterWoodMat);
    leftDadoRail.position.set(-5.56, 1.19, -1.6);
    archGroup.add(leftDadoRail);

    // Vertical acoustic walnut wood slats framing the left gallery section
    for (let i = 0; i < 10; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.75, 0.09), this.counterWoodMat);
      slat.position.set(-5.41, 2.6, -5.6 + i * 0.2);
      archGroup.add(slat);
    }

    // Solid Right Architectural Wall (x = +5.6) with acoustic slats & concrete dado
    const rightWallUpper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.1, 10.6), warmPlasterMat);
    rightWallUpper.position.set(5.6, 2.7, -1.6);
    rightWallUpper.receiveShadow = true;
    archGroup.add(rightWallUpper);

    const rightWallDado = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.18, 10.6), concreteDadoMat);
    rightWallDado.position.set(5.58, 0.59, -1.6);
    rightWallDado.receiveShadow = true;
    archGroup.add(rightWallDado);

    for (let i = 0; i < 14; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.7, 0.09), this.counterWoodMat);
      slat.position.set(5.41, 2.58, -5.4 + i * 0.28);
      archGroup.add(slat);
    }

    // Framed Vintage Coffee & Roadster Posters on Left Showroom Wall
    const posterConfigs = [
      { title: 'ROAST & VINYL', sub: 'GARAGE SESSIONS', color: '#d97706', z: -1.15 },
      { title: '1990 MIATA MX-5', sub: 'CLASSIC RED NA ROADSTER', color: '#dc2626', z: -2.55 },
      { title: 'UJI CEREMONIAL', sub: 'FIRST HARVEST MATCHA', color: '#65a30d', z: -3.95 },
    ];
    posterConfigs.forEach((p) => {
      const pTex = this.createVintagePosterTexture(p.title, p.sub, p.color);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.9, 0.68),
        charcoalSteelMat
      );
      frame.position.set(-5.39, 2.38, p.z);
      archGroup.add(frame);

      const art = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.82),
        new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.4 })
      );
      art.rotation.y = Math.PI / 2;
      art.position.set(-5.35, 2.38, p.z);
      archGroup.add(art);
    });

    // Floating Walnut Wall Shelves with Stacked Vinyl Records, Roasted Bean Bags & Ceramic Carafes
    const shelfGroup = new THREE.Group();
    [1.32, 1.72].forEach((sy) => {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.038, 2.5), this.counterWoodMat);
      plank.position.set(-5.28, sy, -2.55);
      shelfGroup.add(plank);
    });
    const vinylColors = [0xd97706, 0x10b981, 0x3b82f6, 0xf43f5e, 0xa855f7, 0xeab308];
    for (let b = 0; b < 10; b++) {
      const sleeve = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.26, 0.032),
        new THREE.MeshStandardMaterial({
          color: vinylColors[b % vinylColors.length],
          roughness: 0.55,
        })
      );
      sleeve.position.set(-5.26, 1.47, -3.55 + b * 0.068);
      sleeve.rotation.x = b === 9 ? 0.14 : 0;
      shelfGroup.add(sleeve);
    }
    // Roasted bean bags & ceramic carafes on upper shelf
    [
      { z: -2.4, color: 0x78350f, w: 0.14, h: 0.22 },
      { z: -2.18, color: 0x065f46, w: 0.14, h: 0.21 },
      { z: -1.96, color: 0x1f2937, w: 0.14, h: 0.23 },
    ].forEach((bag) => {
      const bagMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, bag.h, bag.w),
        new THREE.MeshStandardMaterial({ color: bag.color, roughness: 0.72 })
      );
      bagMesh.position.set(-5.26, 1.85, bag.z);
      shelfGroup.add(bagMesh);
    });
    [-1.65, -1.45].forEach((cz, idx) => {
      const carafe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.062, 0.18 + idx * 0.03, 14),
        this.ceramicMugMat
      );
      carafe.position.set(-5.26, 1.84, cz);
      shelfGroup.add(carafe);
    });
    archGroup.add(shelfGroup);

    // 5. Sectional Black-Steel Framed Glass Garage Bay Doors (z = -6.2) replacing old picket fence!
    const garageWallZ = -6.2;
    this.garageGlassMat = new THREE.MeshStandardMaterial({
      color: 0xcbe3ee,
      roughness: 0.12,
      metalness: 0.18,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });

    // Overhead rolled-steel garage header beam & structural pilasters
    const garageHeaderBeam = new THREE.Mesh(
      new THREE.BoxGeometry(11.6, 0.42, 0.34),
      charcoalSteelMat
    );
    garageHeaderBeam.position.set(0, 3.85, garageWallZ);
    archGroup.add(garageHeaderBeam);

    // Concrete knee-wall base beneath outer bays
    const baseCurb = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.24, 0.22), concreteDadoMat);
    baseCurb.position.set(0, 0.12, garageWallZ);
    archGroup.add(baseCurb);

    // 3 Wide Sectional Glass Garage Bay Doors (Left Showroom Bay, Center Entry Bay, Right Garden Bay)
    const bayCenters = [-3.65, 0.0, 3.65];
    const bayWidth = 3.35;
    [-5.45, -1.82, 1.82, 5.45].forEach((px) => {
      const steelPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 4.1, 0.26),
        charcoalSteelMat
      );
      steelPost.position.set(px, 2.05, garageWallZ);
      steelPost.castShadow = true;
      archGroup.add(steelPost);
    });

    bayCenters.forEach((bx) => {
      // Translucent conservatory glass pane per bay
      const glassPane = new THREE.Mesh(
        new THREE.PlaneGeometry(bayWidth, 3.4),
        this.garageGlassMat
      );
      glassPane.position.set(bx, 1.94, garageWallZ);
      archGroup.add(glassPane);

      // Horizontal sectional garage door rails (slim steel mullions)
      [0.95, 1.85, 2.75, 3.62].forEach((my) => {
        const hBar = new THREE.Mesh(
          new THREE.BoxGeometry(bayWidth, 0.055, 0.07),
          charcoalSteelMat
        );
        hBar.position.set(bx, my, garageWallZ);
        archGroup.add(hBar);
      });

      // Vertical inner stile mullions (3 panes across each garage bay)
      [-bayWidth / 3, bayWidth / 3].forEach((mx) => {
        const vBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.045, 3.45, 0.065),
          charcoalSteelMat
        );
        vBar.position.set(bx + mx, 1.94, garageWallZ);
        archGroup.add(vBar);
      });
    });

    // Subtle rain streaks on the glass garage doors (visible only in rainy weather)
    this.glassRainStreaksGroup = new THREE.Group();
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    });
    for (let s = 0; s < 30; s++) {
      const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.016, 0.48 + (s % 4) * 0.16), streakMat);
      streak.position.set(-5.0 + s * 0.34, 1.0 + (s % 5) * 0.48, garageWallZ + 0.045);
      streak.rotation.z = -0.08;
      this.glassRainStreaksGroup.add(streak);
    }
    this.glassRainStreaksGroup.visible = false;
    archGroup.add(this.glassRainStreaksGroup);

    // 6. Exposed Matte-Charcoal Steel Roof Trusses, Cedar Rafters, Recessed Skylights & 5 Brass Pendant Lamps
    [-1.4, -3.7, -5.9].forEach((tz) => {
      const lowerChord = new THREE.Mesh(
        new THREE.BoxGeometry(11.4, 0.12, 0.14),
        charcoalSteelMat
      );
      lowerChord.position.set(0, 3.82, tz);
      archGroup.add(lowerChord);

      const upperChord = new THREE.Mesh(
        new THREE.BoxGeometry(11.4, 0.1, 0.12),
        charcoalSteelMat
      );
      upperChord.position.set(0, 4.35, tz);
      archGroup.add(upperChord);

      // Diagonal truss web struts
      for (let d = -4; d <= 4; d++) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.64, 0.05), charcoalSteelMat);
        strut.position.set(d * 1.15, 4.08, tz);
        strut.rotation.z = d % 2 === 0 ? 0.48 : -0.48;
        archGroup.add(strut);
      }
    });

    // Warm Cedar / Walnut longitudinal ceiling rafters + Recessed Skylight Bays
    for (let r = -4; r <= 4; r++) {
      const rafterX = r * 1.3;
      const rafter = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.14, 8.2),
        this.counterWoodMat
      );
      rafter.position.set(rafterX, 4.18, -2.5);
      archGroup.add(rafter);
    }

    this.skylightPaneMat = new THREE.MeshStandardMaterial({
      color: 0xfff8e7,
      emissive: 0xffe4b5,
      emissiveIntensity: 0.72,
      roughness: 0.3,
    });
    [-3.1, 0.2, 3.1].forEach((sx) => {
      const skylight = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 4.4), this.skylightPaneMat);
      skylight.rotation.x = Math.PI / 2;
      skylight.position.set(sx, 4.32, -3.5);
      archGroup.add(skylight);
    });

    // 5 Suspended Brushed-Brass Industrial Dome Pendant Lamps (over Miata bay, counter & lounge)
    const pendantCoords: Array<[number, number, number]> = [
      [-3.45, 2.52, -3.55],
      [-1.05, 2.56, 0.38],
      [1.15, 2.56, 0.38],
      [0.35, 2.48, -3.6],
      [2.65, 2.48, -3.55],
    ];
    pendantCoords.forEach(([px, py, pz]) => {
      const pGroup = new THREE.Group();
      const cordH = 4.15 - py;
      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, cordH, 6),
        charcoalSteelMat
      );
      cord.position.y = cordH / 2 + 0.14;
      pGroup.add(cord);

      const shade = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
        brassMat
      );
      shade.position.y = 0.02;
      pGroup.add(shade);

      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.06, 0.08, 12),
        charcoalSteelMat
      );
      collar.position.y = 0.22;
      pGroup.add(collar);

      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xfde68a,
        emissiveIntensity: 2.0,
        roughness: 0.2,
      });
      this.pendantBulbMats.push(bulbMat);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), bulbMat);
      bulb.position.y = 0.02;
      pGroup.add(bulb);

      pGroup.position.set(px, py, pz);
      archGroup.add(pGroup);
    });

    // Volumetric Skylight Sunbeams softly illuminating the Miata Showroom & Walnut Lounge
    const sunbeamMat = new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.042,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    [
      [MIATA_BAY.centerX, MIATA_BAY.centerZ],
      [1.35, -3.45],
    ].forEach(([bx, bz]) => {
      const beam = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.8, 16, 1, true), sunbeamMat);
      beam.position.set(bx, 2.0, bz);
      beam.rotation.z = -0.1;
      archGroup.add(beam);
    });

    // 7. Sculpted Courtyard Canopy Trees Strictly OUTSIDE the Glass Garage Bay Doors (z = -8.4 to -11.2)
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x3f2514, roughness: 0.9 });
    const canopyShades = [0x1b5e36, 0x266d3e, 0x357a44, 0x204e2e].map(
      (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.72 })
    );
    const courtyardTrees: Array<[number, number, number]> = [
      [-5.2, -8.8, 1.15],
      [-2.1, -9.6, 1.05],
      [1.2, -9.2, 1.2],
      [4.4, -8.7, 1.1],
      [-0.4, -11.2, 1.25],
      [3.1, -11.0, 1.15],
    ];
    courtyardTrees.forEach(([tx, tz, sc], idx) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 2.1, 8), barkMat);
      trunk.position.y = 1.05;
      trunk.rotation.z = (idx % 2 === 0 ? 1 : -1) * 0.04;
      tree.add(trunk);

      // Sculpted forked branches
      [-0.25, 0.25].forEach((dir) => {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.95, 6), barkMat);
        branch.position.set(dir * 0.7, 2.05, dir * 0.2);
        branch.rotation.z = -dir * 1.4;
        tree.add(branch);
      });

      // Layered multi-cluster sculpted canopies (zero primitive single sphere!)
      [
        [0, 2.45, 0, 1.05, 0.68, 0.95],
        [-0.58, 2.25, 0.22, 0.76, 0.56, 0.72],
        [0.56, 2.32, -0.18, 0.78, 0.54, 0.75],
        [0.12, 2.86, 0.15, 0.68, 0.52, 0.68],
      ].forEach(([cx, cy, cz, sx, sy, sz], cIdx) => {
        const puff = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.85, 1),
          canopyShades[(idx + cIdx) % canopyShades.length]
        );
        puff.scale.set(sx, sy, sz);
        puff.position.set(cx, cy, cz);
        puff.rotation.set(cIdx * 0.5, idx * 0.8, cIdx * 0.3);
        tree.add(puff);
      });

      tree.position.set(tx, 0, tz);
      tree.scale.setScalar(sc);
      archGroup.add(tree);
    });

    // 8. Architectural Interior Botanical Planters & Trailing Hanging Rafter Vines
    const planterSpecs: Array<{
      kind: 'monstera' | 'fiddle' | 'olive';
      x: number;
      z: number;
      rotY: number;
      w: number;
      d: number;
      extra?: boolean;
    }> = [
      { kind: 'monstera', x: -4.92, z: -1.35, rotY: Math.PI / 2, w: 1.05, d: 0.42 },
      { kind: 'fiddle', x: -4.88, z: -5.62, rotY: 0.35, w: 0.58, d: 0.58 },
      { kind: 'monstera', x: -1.15, z: -5.78, rotY: 0, w: 1.1, d: 0.4, extra: true },
      { kind: 'olive', x: 4.78, z: -2.25, rotY: -Math.PI / 2, w: 0.62, d: 0.62 },
      { kind: 'monstera', x: 4.72, z: -5.35, rotY: -0.4, w: 1.05, d: 0.42, extra: true },
    ];
    planterSpecs.forEach((p) => {
      const obj = this.createArchitecturalPlanter(p.kind, p.w, p.d);
      obj.position.set(p.x, 0, p.z);
      obj.rotation.y = p.rotY;
      if (p.extra) {
        this.botanicalPlanterExtras.push(obj);
      }
      archGroup.add(obj);
    });

    // Hanging trailing pothos vines draped from ceiling rafters
    const vineLeafGeo = new THREE.CircleGeometry(0.065, 5);
    const vineMat = new THREE.MeshStandardMaterial({
      color: 0x228b49,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    const vineLocations: Array<[number, number]> = [
      [-4.2, -1.5],
      [-1.3, -5.85],
      [1.3, -5.85],
      [4.2, -2.6],
      [3.9, -5.6],
    ];
    vineLocations.forEach(([vx, vz], vIdx) => {
      const vineGroup = new THREE.Group();
      const hangerPot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.08, 0.16, 10),
        new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.72 })
      );
      hangerPot.position.y = 3.72;
      vineGroup.add(hangerPot);

      for (let l = 0; l < 8; l++) {
        const leaf = new THREE.Mesh(vineLeafGeo, vineMat);
        leaf.position.set(
          Math.sin(l * 1.1 + vIdx) * 0.09,
          3.62 - l * 0.11,
          Math.cos(l * 1.1 + vIdx) * 0.09
        );
        leaf.rotation.set(0.5, l * 0.8, 0.25);
        vineGroup.add(leaf);
      }
      vineGroup.position.set(vx, 0, vz);
      if (vIdx >= 3) {
        this.botanicalPlanterExtras.push(vineGroup);
      }
      archGroup.add(vineGroup);
    });

    // 9. 1990 Mazda Miata MX-5 (NA Generation) Dedicated Showroom Plinth Bay (Phase 6)
    this.buildMazdaMiata1990(archGroup);

    // 10. Title-Only Studio Plaque & Relocated Hero Cup Showcase at (1.68, 1.01, 0.44)
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
    this.titlePlaqueGroup.position.set(3.25, 2.05, -1.38);
    this.titlePlaqueGroup.rotation.y = -0.25;
    archGroup.add(this.titlePlaqueGroup);

    // Dedicated Uncluttered Showcase Spot on Front-Right Counter Corner (x = 1.68, y = 1.01, z = 0.44)
    this.titleHeroCupGroup = this.createPorcelainCupMesh(1.16, true, true);
    this.titleHeroCupGroup.position.set(1.68, 1.01, 0.44);
    this.titleHeroCupGroup.rotation.y = -0.32;

    // Small Potted Monstera Leaf next to Title Hero Cup Showcase
    const miniPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.028, 0.065, 14),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 })
    );
    miniPot.position.set(-0.14, 0.032, -0.1);
    this.titleHeroCupGroup.add(miniPot);

    const miniLeaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 })
    );
    miniLeaf.scale.set(1.3, 0.25, 1.6);
    miniLeaf.position.set(-0.14, 0.095, -0.1);
    miniLeaf.rotation.set(0.35, 0.2, -0.2);
    this.titleHeroCupGroup.add(miniLeaf);

    this.titleHeroCupLight = new THREE.PointLight(0xffedd5, 1.4, 2.2);
    this.titleHeroCupLight.position.set(0, 0.42, 0.15);
    this.titleHeroCupGroup.add(this.titleHeroCupLight);

    archGroup.add(this.titleHeroCupGroup);

    // 11. Subtle Diegetic Step Halo Ring on Counter Surface
    this.buildStepHaloHighlight();

    this.scene.add(archGroup);
  }

  // Creates the Subtle Warm Halo Ring (RingGeometry + soft radial glow CanvasTexture) for next-step guidance
  private buildStepHaloHighlight() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 122);
      grad.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
      grad.addColorStop(0.55, 'rgba(217, 119, 6, 0.32)');
      grad.addColorStop(0.85, 'rgba(245, 158, 11, 0.12)');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
    this.stepHaloTexture = new THREE.CanvasTexture(canvas);
    this.stepHaloTexture.colorSpace = THREE.SRGBColorSpace;

    this.stepHaloGroup = new THREE.Group();
    this.stepHaloGlowMat = new THREE.MeshBasicMaterial({
      map: this.stepHaloTexture,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), this.stepHaloGlowMat);
    glowPlane.rotation.x = -Math.PI / 2;
    this.stepHaloGroup.add(glowPlane);

    this.stepHaloRingMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const thinRing = new THREE.Mesh(
      new THREE.RingGeometry(0.115, 0.132, 32),
      this.stepHaloRingMat
    );
    thinRing.rotation.x = -Math.PI / 2;
    thinRing.position.y = 0.001;
    this.stepHaloGroup.add(thinRing);

    this.stepHaloGroup.position.set(-0.82, 1.004, 0.22);
    this.scene.add(this.stepHaloGroup);
  }

  // Detailed Procedural 1990 Mazda Miata MX-5 (NA Generation) parked on its Dedicated Showroom Plinth Bay
  private buildMazdaMiata1990(parentGroup: THREE.Group) {
    this.miataGroup = new THREE.Group();
    // Strictly positioned in the dedicated MIATA_BAY left showroom zone (zero table overlap!)
    this.miataGroup.position.set(MIATA_BAY.centerX, 0.0, MIATA_BAY.centerZ);
    this.miataGroup.rotation.y = MIATA_BAY.rotationY;

    // 1. Sleek Recessed Concrete & Walnut Showroom Plinth (2.4m x 4.15m x 0.06m) + Wheel Stops + Soft Contact Shadow
    const plinthSlab = new THREE.Mesh(
      new THREE.BoxGeometry(2.42, 0.055, 4.15),
      new THREE.MeshStandardMaterial({
        color: 0x262321,
        roughness: 0.32,
        metalness: 0.16,
      })
    );
    plinthSlab.position.y = 0.0275;
    plinthSlab.receiveShadow = true;
    this.miataGroup.add(plinthSlab);

    // Warm walnut perimeter framing trim around the plinth
    const walnutPlinthTrim = new THREE.Mesh(
      new THREE.BoxGeometry(2.52, 0.042, 4.25),
      this.counterWoodMat
    );
    walnutPlinthTrim.position.y = 0.021;
    this.miataGroup.add(walnutPlinthTrim);

    // Subtle warm recessed brass/LED edge highlight
    const plinthRim = new THREE.Mesh(
      new THREE.BoxGeometry(2.56, 0.012, 4.29),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.65,
        roughness: 0.25,
      })
    );
    plinthRim.position.y = 0.008;
    this.miataGroup.add(plinthRim);

    // Matte-black wheel stops in front & rear of tires
    const wheelStopMat = new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.65 });
    [-1.45, 1.45].forEach((wz) => {
      const stop = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.05, 0.12), wheelStopMat);
      stop.position.set(0, 0.075, wz);
      this.miataGroup.add(stop);
    });

    // Soft contact shadow directly underneath the Miata chassis (keeps grounded even in LOW quality!)
    const carShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.95, 3.65),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      })
    );
    carShadow.rotation.x = -Math.PI / 2;
    carShadow.position.y = 0.062;
    this.miataGroup.add(carShadow);

    // Classic Red (#c8102e) Clearcoat Automotive Paint & Trim Materials
    const classicRedMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8102e,
      roughness: 0.15,
      metalness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const matteBlackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.55,
      metalness: 0.25,
    });
    const tanLeatherMat = new THREE.MeshStandardMaterial({
      color: 0xb47b48,
      roughness: 0.58,
      metalness: 0.05,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.12,
      metalness: 0.95,
    });
    const alloyWheelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.22,
      metalness: 0.88,
    });
    const tireRubberMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.05,
    });

    // 2. Low-Slung Roadster Lower Chassis & Rocker Panels
    const lowerTub = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.28, 3.18),
       matteBlackTrimMat
    );
    lowerTub.position.y = 0.28;
    lowerTub.castShadow = true;
    this.miataGroup.add(lowerTub);

    // Curvy Classic Red Main Body Sides (Left & Right Fenders + Doors)
    [-0.64, 0.64].forEach((sx) => {
      const sideFender = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.36, 3.12),
        classicRedMat
      );
      sideFender.position.set(sx, 0.45, 0);
      sideFender.castShadow = true;
      this.miataGroup.add(sideFender);

      // Chrome NA Miata Door Handle
      const doorHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.028, 0.12),
        chromeMat
      );
      doorHandle.position.set(sx > 0 ? sx + 0.145 : sx - 0.145, 0.54, -0.18);
      this.miataGroup.add(doorHandle);

      // Aerodynamic Classic Red Side Mirror
      const mirrorStalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.018, 0.09, 10),
        classicRedMat
      );
      mirrorStalk.rotation.z = sx > 0 ? -0.6 : 0.6;
      mirrorStalk.position.set(sx > 0 ? sx + 0.14 : sx - 0.14, 0.68, 0.34);
      this.miataGroup.add(mirrorStalk);

      const mirrorHousing = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 14, 12),
        classicRedMat
      );
      mirrorHousing.scale.set(1.2, 0.75, 0.85);
      mirrorHousing.position.set(sx > 0 ? sx + 0.18 : sx - 0.18, 0.72, 0.34);
      this.miataGroup.add(mirrorHousing);
    });

    // Sculpted Front Hood & Nose Cone (z = +0.42 to +1.64)
    const frontHood = new THREE.Mesh(
      new THREE.BoxGeometry(1.46, 0.16, 1.15),
      classicRedMat
    );
    frontHood.position.set(0, 0.56, 0.96);
    frontHood.rotation.x = 0.08;
    frontHood.castShadow = true;
    this.miataGroup.add(frontHood);

    // Iconic Rounded Front Bumper with Oval "Smiling" Air Intake & Front Turn Signals
    const frontBumper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.74, 0.34, 24, 1, false, -Math.PI / 2, Math.PI),
      classicRedMat
    );
    frontBumper.scale.set(1.0, 1.0, 0.36);
    frontBumper.position.set(0, 0.38, 1.48);
    this.miataGroup.add(frontBumper);

    // Iconic Miata Oval "Smile" Mouth Air Intake
    const smileIntake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.36, 0.11, 20),
      matteBlackTrimMat
    );
    smileIntake.rotation.x = Math.PI / 2;
    smileIntake.scale.set(1.35, 1.0, 0.38);
    smileIntake.position.set(0, 0.31, 1.69);
    this.miataGroup.add(smileIntake);

    // Front Combination Turn-Signal / Parking Lamps
    const signalMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    });
    [-0.46, 0.46].forEach((lx) => {
      const turnLamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 0.06), signalMat);
      turnLamp.position.set(lx, 0.44, 1.66);
      this.miataGroup.add(turnLamp);
    });

    // Rear Trunk Deck & Integrated Rear Bumper (z = -0.82 to -1.64)
    const rearDeck = new THREE.Mesh(
      new THREE.BoxGeometry(1.46, 0.22, 0.84),
      classicRedMat
    );
    rearDeck.position.set(0, 0.55, -1.18);
    rearDeck.rotation.x = -0.05;
    rearDeck.castShadow = true;
    this.miataGroup.add(rearDeck);

    // Folded Black Convertible Soft-Top Boot Cover behind Cockpit
    const foldedTopBoot = new THREE.Mesh(
      new THREE.BoxGeometry(1.32, 0.11, 0.36),
      matteBlackTrimMat
    );
    foldedTopBoot.position.set(0, 0.66, -0.68);
    this.miataGroup.add(foldedTopBoot);

    // Iconic NA Miata Oval Red/Amber Taillights
    const tailLightMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.9,
      roughness: 0.18,
    });
    [-0.5, 0.5].forEach((tx) => {
      const tailLight = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), tailLightMat);
      tailLight.scale.set(1.4, 0.72, 0.5);
      tailLight.position.set(tx, 0.52, -1.61);
      this.miataGroup.add(tailLight);
    });

    // Custom Rear License Plate reading "KLASIK 90"
    const lpCanvas = document.createElement('canvas');
    lpCanvas.width = 256;
    lpCanvas.height = 128;
    const lpCtx = lpCanvas.getContext('2d');
    if (lpCtx) {
      lpCtx.fillStyle = '#fef3c7';
      lpCtx.fillRect(0, 0, 256, 128);
      lpCtx.strokeStyle = '#1e293b';
      lpCtx.lineWidth = 8;
      lpCtx.strokeRect(6, 6, 244, 116);
      lpCtx.fillStyle = '#dc2626';
      lpCtx.font = 'bold 20px sans-serif';
      lpCtx.textAlign = 'center';
      lpCtx.fillText('GARAGE GARDEN', 128, 34);
      lpCtx.fillStyle = '#0f172a';
      lpCtx.font = 'bold 42px monospace';
      lpCtx.fillText('KLASIK 90', 128, 88);
    }
    this.miataLicenseTexture = new THREE.CanvasTexture(lpCanvas);
    this.miataLicenseTexture.colorSpace = THREE.SRGBColorSpace;
    const licensePlate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.18),
      new THREE.MeshStandardMaterial({ map: this.miataLicenseTexture, roughness: 0.3 })
    );
    licensePlate.rotation.y = Math.PI;
    licensePlate.position.set(0, 0.42, -1.62);
    this.miataGroup.add(licensePlate);

    // 3. Signature Articulated Pop-Up Headlights on Front Hood
    const buildPopupHeadlight = (sideX: number) => {
      const popupPivot = new THREE.Group();
      popupPivot.position.set(sideX, 0.58, 1.34);

      const lidHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.16, 0.28),
        classicRedMat
      );
      lidHousing.position.set(0, 0.06, 0.04);
      popupPivot.add(lidHousing);

      const bezel = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.14, 0.04),
        matteBlackTrimMat
      );
      bezel.position.set(0, 0.055, 0.175);
      popupPivot.add(bezel);

      const roundHalogenLens = new THREE.Mesh(
        new THREE.CircleGeometry(0.068, 20),
        new THREE.MeshStandardMaterial({
          color: 0xfffbeb,
          emissive: 0xfef08a,
          emissiveIntensity: 1.8,
          roughness: 0.1,
        })
      );
      roundHalogenLens.position.set(0, 0.055, 0.198);
      popupPivot.add(roundHalogenLens);

      this.miataGroup.add(popupPivot);
      return popupPivot;
    };

    this.miataLeftPopupGroup = buildPopupHeadlight(-0.46);
    this.miataRightPopupGroup = buildPopupHeadlight(0.46);

    // Warm Halogen Light Beams Extending from Pop-Up Headlights
    this.miataHeadlightBeamsGroup = new THREE.Group();
    const beamConeMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    [-0.46, 0.46].forEach((bx) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.65, 16, 1, true), beamConeMat);
      cone.rotation.x = Math.PI / 2 + 0.14;
      cone.position.set(bx, 0.52, 2.28);
      this.miataHeadlightBeamsGroup.add(cone);
    });
    this.miataGroup.add(this.miataHeadlightBeamsGroup);

    // 4. Open Convertible Cockpit: Bucket Seats, Nardi Steering Wheel, Shifter, Roll Bar & Windshield
    const cockpitFloor = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.05, 1.05),
      matteBlackTrimMat
    );
    cockpitFloor.position.set(0, 0.32, -0.08);
    this.miataGroup.add(cockpitFloor);

    // Two Sculpted Tan Bucket Seats with Headrests
    [-0.32, 0.32].forEach((seatX) => {
      const seatGroup = new THREE.Group();
      const seatCushion = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.1, 0.44),
        tanLeatherMat
      );
      seatCushion.position.set(0, 0.38, -0.14);
      seatGroup.add(seatCushion);

      const seatBack = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.46, 0.1),
        tanLeatherMat
      );
      seatBack.position.set(0, 0.62, -0.34);
      seatBack.rotation.x = -0.22;
      seatGroup.add(seatBack);

      const headrest = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.095, 0.26, 14),
        tanLeatherMat
      );
      headrest.rotation.z = Math.PI / 2;
      headrest.position.set(0, 0.89, -0.4);
      seatGroup.add(headrest);

      seatGroup.position.x = seatX;
      this.miataGroup.add(seatGroup);
    });

    // Dashboard, Gauge Cluster Hood, Center Console & Short-Throw Shifter
    const dashBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 0.24, 0.34),
      matteBlackTrimMat
    );
    dashBoard.position.set(0, 0.58, 0.32);
    this.miataGroup.add(dashBoard);

    const gaugeHood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.15, 0.22, 16, 1, false, 0, Math.PI),
      matteBlackTrimMat
    );
    gaugeHood.rotation.x = Math.PI / 2;
    gaugeHood.position.set(-0.32, 0.68, 0.26);
    this.miataGroup.add(gaugeHood);

    // 3-Spoke Nardi Wood-Rim Steering Wheel
    const steeringWheelGroup = new THREE.Group();
    steeringWheelGroup.position.set(-0.32, 0.66, 0.12);
    steeringWheelGroup.rotation.x = -0.38;
    const wheelRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.125, 0.016, 10, 24),
      this.counterWoodMat
    );
    steeringWheelGroup.add(wheelRim);
    [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((ang) => {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.12, 0.008), chromeMat);
      spoke.rotation.z = ang;
      spoke.position.set(-Math.sin(ang) * 0.06, Math.cos(ang) * 0.06, 0);
      steeringWheelGroup.add(spoke);
    });
    this.miataGroup.add(steeringWheelGroup);

    // Center Console & Short-Throw Gear Shifter
    const centerConsole = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 0.82),
      matteBlackTrimMat
    );
    centerConsole.position.set(0, 0.42, -0.02);
    this.miataGroup.add(centerConsole);

    const shiftBoot = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.08, 12),
      matteBlackTrimMat
    );
    shiftBoot.position.set(0, 0.53, 0.08);
    this.miataGroup.add(shiftBoot);

    const shiftKnob = new THREE.Mesh(
      new THREE.SphereGeometry(0.026, 12, 12),
      this.counterWoodMat
    );
    shiftKnob.position.set(0, 0.59, 0.08);
    this.miataGroup.add(shiftKnob);

    // Chrome Twin-Hoop Cabin Roll Bar behind Seats
    const rollBarMain = new THREE.Mesh(
      new THREE.TorusGeometry(0.54, 0.028, 12, 28, Math.PI),
      chromeMat
    );
    rollBarMain.position.set(0, 0.58, -0.48);
    this.miataGroup.add(rollBarMain);

    // Raked Glass Windshield with Chrome/Black A-Pillars
    const useTrans = this.shouldUsePhysicalTransmission();
    const windshieldGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.26, 0.48),
      new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        roughness: 0.08,
        transmission: useTrans ? 0.82 : 0,
        transparent: true,
        opacity: useTrans ? 0.88 : 0.36,
        side: THREE.DoubleSide,
      })
    );
    windshieldGlass.position.set(0, 0.84, 0.36);
    windshieldGlass.rotation.x = -0.58;
    this.miataGroup.add(windshieldGlass);

    [-0.64, 0.64].forEach((px) => {
      const aPillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.026, 0.52, 10),
        matteBlackTrimMat
      );
      aPillar.position.set(px, 0.84, 0.36);
      aPillar.rotation.x = -0.58;
      this.miataGroup.add(aPillar);
    });

    // 5. Four 7-Spoke Silver "Daisy" Alloy Wheels with Black Rubber Tires & Brake Discs
    const wheelCoords: Array<[number, number]> = [
      [-0.76, 0.98],
      [0.76, 0.98],
      [-0.76, -0.98],
      [0.76, -0.98],
    ];
    wheelCoords.forEach(([wx, wz]) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wx, 0.28, wz);

      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.19, 24),
        tireRubberMat
      );
      tire.rotation.z = Math.PI / 2;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.196, 20),
        alloyWheelMat
      );
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      // 7-Spoke "Daisy" Alloy Pattern
      for (let sp = 0; sp < 7; sp++) {
        const ang = (sp / 7) * Math.PI * 2;
        const daisySpoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.032, 0.16),
          chromeMat
        );
        daisySpoke.rotation.x = ang;
        wheelGroup.add(daisySpoke);
      }

      this.miataGroup.add(wheelGroup);
    });

    parentGroup.add(this.miataGroup);
  }

  private createPorcelainCupMesh(
    scale = 1,
    withStaticLatteArt = false,
    useTitleBranding = false
  ): THREE.Group {
    const group = new THREE.Group();

    const saucerMat = new THREE.MeshStandardMaterial({
      color: 0xebe4da,
      roughness: 0.18,
      metalness: 0.05,
    });
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.082, 0.018, 24), saucerMat);
    saucer.position.y = 0.009;
    group.add(saucer);

    const spoonMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.9,
    });
    const spoon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.013), spoonMat);
    spoon.position.set(0.02, 0.02, 0.062);
    spoon.rotation.y = 0.25;
    group.add(spoon);

    const mugInteriorMat = new THREE.MeshStandardMaterial({
      color: withStaticLatteArt ? 0x4a2511 : 0xf5ebe1,
      roughness: 0.25,
      metalness: 0.04,
    });

    const wallMat = useTitleBranding
      ? new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.18,
          metalness: 0.05,
          map: this.studioCupEmblemTexture,
          side: THREE.DoubleSide,
        })
      : this.ceramicMugMat;

    // Open-top hollow ceramic cylinder so internal ShaderMaterial liquid & crema are 100% visible
    const cupBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.065, 0.13, 32, 1, true),
      wallMat
    );
    cupBody.position.y = 0.078;
    if (useTitleBranding) {
      // Rotate cylinder so UV u = 0.5 (x = 512) faces directly toward the Title Camera (1.86, 1.28, 0.96),
      // just left of the +X handle, hiding the UV seam on the back of the mug!
      cupBody.rotation.y = -Math.PI + 0.42;
    }
    cupBody.castShadow = true;
    group.add(cupBody);

    const interiorBottom = new THREE.Mesh(
      new THREE.CircleGeometry(0.063, 24),
      mugInteriorMat
    );
    interiorBottom.rotation.x = -Math.PI / 2;
    interiorBottom.position.y = 0.018;
    group.add(interiorBottom);

    const lipRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.079, 0.005, 10, 28),
      this.ceramicMugMat
    );
    lipRim.rotation.x = Math.PI / 2;
    lipRim.position.y = 0.143;
    group.add(lipRim);

    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.038, 0.01, 12, 24, Math.PI),
      this.ceramicMugMat
    );
    handle.rotation.z = -Math.PI / 2;
    handle.position.set(0.074, 0.082, 0);
    group.add(handle);

    if (withStaticLatteArt) {
      const liquidDisk = new THREE.Mesh(
        new THREE.CircleGeometry(0.077, 24),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: this.latteArtTexture,
          roughness: 0.28,
        })
      );
      liquidDisk.rotation.x = -Math.PI / 2;
      liquidDisk.position.y = 0.138;
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

    const board = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 0.09), woodFrameMat);
    board.castShadow = true;
    this.hangingSignGroup.add(board);

    this.hangingSignFaceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.hangingSignTexture,
      emissive: 0xf59e0b,
      emissiveMap: this.hangingSignTexture,
      emissiveIntensity: 0.65,
      roughness: 0.25,
    });
    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.98, 0.52),
      this.hangingSignFaceMat
    );
    signFace.position.z = 0.05;
    this.hangingSignGroup.add(signFace);

    const topTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 2.02, 12),
      this.neonTubeMat
    );
    topTube.rotation.z = Math.PI / 2;
    topTube.position.set(0, 0.28, 0.055);
    this.hangingSignGroup.add(topTube);

    const botTube = topTube.clone();
    botTube.position.set(0, -0.28, 0.055);
    this.hangingSignGroup.add(botTube);

    [-0.78, 0.78].forEach((x) => {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8), brassMat);
      chain.position.set(x, 0.75, 0);
      this.hangingSignGroup.add(chain);
    });

    this.hangingSignGroup.position.set(0.15, 2.15, -0.45);
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

  // Station 1 (x: -2.20 to -1.45): POS Register (-1.95, 0.28), Pastry Display Case (-1.50, 0.24), Dynamic Hanging Order Tickets (-2.10 to -1.50, y = 1.82)
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

    // 1. POS Register at x = -1.95, z = 0.28
    const registerGroup = new THREE.Group();
    const drawerBase = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.11, 0.34), darkMetalMat);
    drawerBase.position.y = 0.055;
    registerGroup.add(drawerBase);

    const brassTrim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.018, 0.36), brassMat);
    brassTrim.position.y = 0.115;
    registerGroup.add(brassTrim);

    const standNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.18, 16), brassMat);
    standNeck.position.set(0, 0.19, -0.04);
    registerGroup.add(standNeck);

    const posScreenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.03), darkMetalMat);
    posScreenFrame.position.set(0, 0.3, 0.02);
    posScreenFrame.rotation.x = -0.35;
    registerGroup.add(posScreenFrame);

    const posDisplay = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), screenMat);
    posDisplay.position.set(0, 0.3, 0.038);
    posDisplay.rotation.x = -0.35;
    registerGroup.add(posDisplay);

    registerGroup.position.set(-2.35, 1.0, 0.26);
    this.registerInteractiveTool(
      'register',
      registerGroup,
      'Order Register & Recipe Codex — Click to View Recipes',
      1,
      () => this.callbacks.onToolAction('open_recipes_modal')
    );
    st1Group.add(registerGroup);

    // 2. Artisan Glass Pastry Display Case at x = -1.86, y = 1.0, z = 0.22 (width 0.34m, spans -2.03..-1.69, zero collision with Pickup Bell at -1.48!)
    const pastryCaseGroup = new THREE.Group();
    const caseBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.06, 0.3),
      this.counterWoodMat
    );
    caseBase.position.y = 0.03;
    pastryCaseGroup.add(caseBase);

    const useTrans = this.shouldUsePhysicalTransmission();
    const glassCaseMat = new THREE.MeshPhysicalMaterial({
      color: 0xfffbeb,
      roughness: 0.08,
      transmission: useTrans ? 0.8 : 0,
      transparent: true,
      opacity: useTrans ? 0.88 : 0.34,
    });
    const glassHood = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.28), glassCaseMat);
    glassHood.position.y = 0.17;
    pastryCaseGroup.add(glassHood);

    const pastryShelf = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.01, 0.22), brassMat);
    pastryShelf.position.y = 0.15;
    pastryCaseGroup.add(pastryShelf);

    // 3D Croissants & Matcha Tarts inside Pastry Case
    const croissantMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55 });
    [-0.065, 0.065].forEach((px) => {
      const croissant = new THREE.Mesh(
        new THREE.TorusGeometry(0.035, 0.016, 10, 16, Math.PI * 1.3),
        croissantMat
      );
      croissant.rotation.x = Math.PI / 2;
      croissant.position.set(px, 0.075, 0.02);
      pastryCaseGroup.add(croissant);

      const matchaTart = new THREE.Mesh(
        new THREE.CylinderGeometry(0.034, 0.028, 0.028, 14),
        new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.45 })
      );
      matchaTart.position.set(px, 0.168, -0.02);
      pastryCaseGroup.add(matchaTart);
    });

    pastryCaseGroup.position.set(-1.86, 1.0, 0.22);
    st1Group.add(pastryCaseGroup);

    // 3. Overhead Hanging Order Tickets (x = -2.28 to -1.68, y = 1.82) with Dynamic CanvasTextures
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.032, 0.032), brassMat);
    rail.position.set(-1.98, 1.98, 0.18);
    st1Group.add(rail);

    this.ticketTextures = [];
    const ticketXs = [-2.28, -1.98, -1.68];
    ticketXs.forEach((tx) => {
      const tCanvas = document.createElement('canvas');
      tCanvas.width = 256;
      tCanvas.height = 320;
      const tTex = new THREE.CanvasTexture(tCanvas);
      tTex.colorSpace = THREE.SRGBColorSpace;
      this.ticketTextures.push(tTex);

      const ticketMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tTex,
        roughness: 0.6,
      });
      const ticketMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.012), ticketMat);
      ticketMesh.position.set(tx, 1.82, 0.19);
      st1Group.add(ticketMesh);
    });

    this.scene.add(st1Group);
  }

  // Station 2 (x: -1.06 to 0.35): Knock Box (-1.04, 0.34), Burr Grinder (-0.80, 0.22), Tamping Mat (-0.50, 0.36), Dual-Boiler Espresso Machine (-0.05, 0.18), Rinse Sink (0.32, 0.28)
  private buildStation2EspressoBar() {
    const st2Group = new THREE.Group();

    const brushedSteelMat = new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      roughness: 0.2,
      metalness: 0.88,
    });
    this.espressoChassisMat = brushedSteelMat;
    // Dedicated stainless material for Knock Box and Rinse Sink so Espresso Machine Skins only skin the Espresso Machine!
    const counterStainlessMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.22,
      metalness: 0.86,
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
    this.grinderBodyMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.45,
      metalness: 0.45,
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

    // 1. Knock Box at x = -1.08, z = 0.34
    const knockBoxGroup = new THREE.Group();
    const kbOuter = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.2), counterStainlessMat);
    kbOuter.position.y = 0.06;
    knockBoxGroup.add(kbOuter);

    const kbInterior = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.025, 0.17), matteBlackMat);
    kbInterior.position.y = 0.112;
    knockBoxGroup.add(kbInterior);

    const knockBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.17, 12),
      matteBlackMat
    );
    knockBar.rotation.z = Math.PI / 2;
    knockBar.position.set(0, 0.118, 0.01);
    knockBoxGroup.add(knockBar);

    const spentPuck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 16), beanMat);
    spentPuck.position.set(-0.02, 0.12, -0.03);
    spentPuck.rotation.z = 0.2;
    knockBoxGroup.add(spentPuck);

    knockBoxGroup.position.set(-1.04, 1.0, 0.34);
    st2Group.add(knockBoxGroup);

    // 2. Conical Burr Grinder at x = -0.82, z = 0.22
    this.grinderGroup = new THREE.Group();
    const grinderBaseFoot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.135, 0.04, 24),
      this.grinderBodyMat
    );
    grinderBaseFoot.position.y = 0.02;
    this.grinderGroup.add(grinderBaseFoot);

    const grinderTower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.12, 0.34, 24),
      this.grinderBodyMat
    );
    grinderTower.position.y = 0.2;
    grinderTower.castShadow = true;
    this.grinderGroup.add(grinderTower);

    const grindCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115, 0.115, 0.045, 24),
      this.grinderBodyMat
    );
    grindCollar.position.y = 0.39;
    this.grinderGroup.add(grindCollar);

    const forkLeft = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.11), chromeMat);
    forkLeft.position.set(-0.042, 0.13, 0.13);
    this.grinderGroup.add(forkLeft);
    const forkRight = forkLeft.clone();
    forkRight.position.x = 0.042;
    this.grinderGroup.add(forkRight);

    const chute = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.026, 0.14, 16),
      this.grinderBodyMat
    );
    chute.rotation.x = 0.45;
    chute.position.set(0, 0.27, 0.12);
    this.grinderGroup.add(chute);

    const useTrans = this.shouldUsePhysicalTransmission();
    const hopperGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xfffbeb,
      roughness: 0.08,
      metalness: 0,
      transmission: useTrans ? 0.78 : 0,
      transparent: true,
      opacity: useTrans ? 0.92 : 0.38,
    });
    const hopper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.095, 0.24, 24),
      hopperGlassMat
    );
    hopper.position.y = 0.52;
    this.grinderGroup.add(hopper);

    this.hopperBeansGroup = new THREE.Group();
    this.hopperBeansGroup.position.y = 0.49;
    const beanCore = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.085, 0.14, 20), beanMat);
    this.hopperBeansGroup.add(beanCore);

    const singleBeanGeo = new THREE.SphereGeometry(0.018, 8, 8);
    singleBeanGeo.scale(1.35, 0.85, 1.0);
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const r = 0.03 + (i % 4) * 0.024;
      const bean = new THREE.Mesh(singleBeanGeo, beanMat);
      bean.position.set(Math.cos(angle) * r, 0.075 + (i % 3) * 0.01, Math.sin(angle) * r);
      bean.rotation.set(i * 0.5, angle, 0.3);
      this.hopperBeansGroup.add(bean);
    }
    this.grinderGroup.add(this.hopperBeansGroup);

    const hopperLid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.162, 0.158, 0.024, 24),
      matteBlackMat
    );
    hopperLid.position.y = 0.65;
    this.grinderGroup.add(hopperLid);

    this.groundStreamGroup = new THREE.Group();
    this.groundStreamGroup.position.set(0, 0.19, 0.15);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e1508, roughness: 0.9 });
    for (let i = 0; i < 10; i++) {
      const speck = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), groundMat);
      speck.position.set(
        Math.sin(i * 2.1) * 0.012,
        -(i / 10) * 0.08,
        Math.cos(i * 2.1) * 0.012
      );
      this.groundStreamGroup.add(speck);
    }
    this.groundStreamGroup.visible = false;
    this.grinderGroup.add(this.groundStreamGroup);

    this.grinderGroup.position.set(-0.78, 1.0, 0.22);
    this.registerInteractiveTool(
      'grinder',
      this.grinderGroup,
      'Conical Burr Grinder — Click to Grind 18g Fresh Dark-Roast Beans',
      2,
      () => this.callbacks.onToolAction('grind')
    );
    st2Group.add(this.grinderGroup);

    // 3. Silicone Tamping Mat & Calibrated Tamper at x = -0.48, y = 1.0, z = 0.36
    const tampStationGroup = new THREE.Group();
    const siliconeMat = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.02, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88 })
    );
    siliconeMat.position.y = 0.01;
    tampStationGroup.add(siliconeMat);

    this.tamperMeshGroup = new THREE.Group();
    const tBase = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.022, 24), chromeMat);
    tBase.position.y = 0.011;
    this.tamperMeshGroup.add(tBase);

    const tNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.036, 0.03, 20), chromeMat);
    tNeck.position.y = 0.036;
    this.tamperMeshGroup.add(tNeck);

    const tGrip = new THREE.Mesh(new THREE.SphereGeometry(0.036, 20, 16), this.counterWoodMat);
    tGrip.scale.set(1, 1.35, 1);
    tGrip.position.y = 0.082;
    this.tamperMeshGroup.add(tGrip);

    this.tamperMeshGroup.position.set(-0.075, 0.02, -0.02);
    tampStationGroup.add(this.tamperMeshGroup);

    this.tampPressureRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.056, 0.074, 24),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      })
    );
    this.tampPressureRingMesh.rotation.x = -Math.PI / 2;
    this.tampPressureRingMesh.position.set(0.05, 0.082, 0.01);
    this.tampPressureRingMesh.visible = false;
    tampStationGroup.add(this.tampPressureRingMesh);

    tampStationGroup.position.set(-0.48, 1.0, 0.36);
    this.registerInteractiveTool(
      'tamper',
      tampStationGroup,
      'Calibrated Tamper & Portafilter — Click to Tamp Grounds at 30 lbs',
      2,
      () => this.callbacks.onToolAction('tamp')
    );
    st2Group.add(tampStationGroup);

    // 4. Articulated Portafilter with Distinct fluffyGroundsMesh (y = 0.028) & tampedPuckMesh (y = 0.026 > basketInner y = 0.022)
    this.portafilterGroup = new THREE.Group();
    const pfBasket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.05, 0.044, 24),
      chromeMat
    );
    this.portafilterGroup.add(pfBasket);

    // Inner Basket Rim Top Surface strictly at y = 0.022
    const basketInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.048, 0.004, 24),
      matteBlackMat
    );
    basketInner.position.y = 0.02;
    this.portafilterGroup.add(basketInner);

    [-0.018, 0.018].forEach((sx) => {
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.028, 12), chromeMat);
      spout.position.set(sx, -0.03, 0);
      spout.rotation.z = sx < 0 ? 0.25 : -0.25;
      this.portafilterGroup.add(spout);
    });

    const pfCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 12), chromeMat);
    pfCollar.rotation.x = Math.PI / 2;
    pfCollar.position.set(0, 0.004, 0.075);
    this.portafilterGroup.add(pfCollar);

    const pfWoodHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.025, 0.16, 16),
      this.counterWoodMat
    );
    pfWoodHandle.rotation.x = Math.PI / 2;
    pfWoodHandle.position.set(0, 0.004, 0.165);
    this.portafilterGroup.add(pfWoodHandle);

    // 1. fluffyGroundsMesh: Textured mound of fresh coffee grounds at y = 0.028
    this.fluffyGroundsMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x4a220d, roughness: 0.92 })
    );
    this.fluffyGroundsMesh.position.y = 0.028;
    this.fluffyGroundsMesh.visible = false;
    this.portafilterGroup.add(this.fluffyGroundsMesh);

    // 2. tampedPuckMesh: Bevelled dark-roast espresso puck cylinder at y = 0.026 (strictly above basketInner y = 0.022!)
    this.tampedPuckMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.051, 0.051, 0.012, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.tampedPuckTexture,
        roughness: 0.42,
      })
    );
    this.tampedPuckMesh.position.y = 0.026;
    this.tampedPuckMesh.visible = false;
    this.portafilterGroup.add(this.tampedPuckMesh);

    this.portafilterGroup.position.set(-0.43, 1.05, 0.37);
    st2Group.add(this.portafilterGroup);

    // 5. Commercial Dual-Boiler Espresso Machine at x = -0.02, y = 1.0, z = 0.16 (drip tray grate at z = 0.30)
    const espressoGroup = new THREE.Group();
    // Rear Boiler Cabinet (leaves z = +0.02..+0.26 open above the drip tray for cups!)
    const mainChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.48, 0.24),
      brushedSteelMat
    );
    mainChassis.position.set(0, 0.26, -0.09);
    mainChassis.castShadow = true;
    espressoGroup.add(mainChassis);

    // Upper Grouphead Overhang Header
    const upperHeader = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.16, 0.22),
      brushedSteelMat
    );
    upperHeader.position.set(0, 0.42, 0.11);
    upperHeader.castShadow = true;
    espressoGroup.add(upperHeader);

    const topHood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.66, 20, 1, false, 0, Math.PI),
      brushedSteelMat
    );
    topHood.rotation.z = Math.PI / 2;
    topHood.scale.set(0.25, 1, 1);
    topHood.position.set(0, 0.5, -0.01);
    espressoGroup.add(topHood);

    [-0.345, 0.345].forEach((sx) => {
      const cheek = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.44, 0.4),
        this.counterWoodMat
      );
      cheek.position.set(sx, 0.26, -0.01);
      espressoGroup.add(cheek);
    });

    // Slotted Stainless Drip Tray & Red Water-Level Float in Open Front Brewing Bay
    const dripTrayBox = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.048, 0.24), matteBlackMat);
    dripTrayBox.position.set(0, 0.024, 0.14);
    espressoGroup.add(dripTrayBox);

    const dripGrate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.01, 0.21), chromeMat);
    dripGrate.position.set(0, 0.05, 0.14);
    espressoGroup.add(dripGrate);

    const redFloat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.018, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
    );
    redFloat.position.set(0.26, 0.056, 0.21);
    espressoGroup.add(redFloat);

    this.groupHeadLedMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.4,
    });
    this.gaugeNeedles = [];

    [-0.14, 0.14].forEach((gx) => {
      const shroud = new THREE.Mesh(
        new THREE.CylinderGeometry(0.072, 0.064, 0.095, 24),
        chromeMat
      );
      shroud.position.set(gx, 0.32, 0.16);
      espressoGroup.add(shroud);

      const bayonetRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.058, 0.025, 24),
        matteBlackMat
      );
      bayonetRing.position.set(gx, 0.265, 0.16);
      espressoGroup.add(bayonetRing);

      const ledRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.066, 0.005, 8, 24),
        this.groupHeadLedMat
      );
      ledRing.rotation.x = Math.PI / 2;
      ledRing.position.set(gx, 0.355, 0.16);
      espressoGroup.add(ledRing);

      const gaugeBezel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.044, 0.044, 0.022, 24),
        this.espressoChassisMat
      );
      gaugeBezel.rotation.x = Math.PI / 2;
      gaugeBezel.position.set(gx, 0.425, 0.215);
      espressoGroup.add(gaugeBezel);

      const gaugeFace = new THREE.Mesh(
        new THREE.CircleGeometry(0.036, 20),
        new THREE.MeshBasicMaterial({ color: 0xfefce8 })
      );
      gaugeFace.position.set(gx, 0.425, 0.228);
      espressoGroup.add(gaugeFace);

      const needle = new THREE.Mesh(
        new THREE.BoxGeometry(0.005, 0.028, 0.004),
        new THREE.MeshBasicMaterial({ color: 0xdc2626 })
      );
      needle.position.set(gx, 0.425, 0.231);
      needle.rotation.z = 0.8;
      espressoGroup.add(needle);
      this.gaugeNeedles.push(needle);
    });

    const pidScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.11, 0.042),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.75,
      })
    );
    pidScreen.position.set(0, 0.425, 0.222);
    espressoGroup.add(pidScreen);

    const warmerRail = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.36), this.espressoChassisMat);
    warmerRail.position.set(0, 0.52, -0.01);
    espressoGroup.add(warmerRail);

    [-0.2, -0.07, 0.07, 0.2].forEach((cx) => {
      const stackedCup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.048, 0.072, 16),
        this.ceramicMugMat
      );
      stackedCup.position.set(cx, 0.568, -0.03);
      espressoGroup.add(stackedCup);
    });

    this.steamWandPivot = new THREE.Group();
    this.steamWandPivot.position.set(0.28, 0.34, 0.18);

    const ballJoint = new THREE.Mesh(new THREE.SphereGeometry(0.02, 14, 14), chromeMat);
    this.steamWandPivot.add(ballJoint);

    const wandTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.006, 0.22, 12),
      chromeMat
    );
    wandTube.position.set(0.025, -0.1, 0.025);
    wandTube.rotation.z = 0.22;
    this.steamWandPivot.add(wandTube);

    espressoGroup.add(this.steamWandPivot);

    this.espressoStreamsGroup = new THREE.Group();
    this.espressoStreamsGroup.position.set(-0.14, 0.16, 0.16);
    const streamMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      emissive: 0x451a03,
      emissiveIntensity: 0.4,
      roughness: 0.1,
    });
    [-0.015, 0.015].forEach((sx) => {
      const tail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0045, 0.003, 0.14, 10),
        streamMat
      );
      tail.position.set(sx, 0, 0);
      this.espressoStreamsGroup.add(tail);
    });
    this.espressoStreamsGroup.visible = false;
    espressoGroup.add(this.espressoStreamsGroup);

    espressoGroup.position.set(-0.02, 1.0, 0.16);
    this.registerInteractiveTool(
      'espresso',
      espressoGroup,
      'Commercial Dual-Boiler Espresso Machine — Click to Pull 9-Bar Double Shot',
      2,
      () => this.callbacks.onToolAction('pull_espresso')
    );
    st2Group.add(espressoGroup);

    // 6. Stainless Rinse Sink at x = 0.36, y = 1.0, z = 0.26
    const sinkGroup = new THREE.Group();
    const sinkRim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.24), counterStainlessMat);
    sinkRim.position.y = 0.012;
    sinkGroup.add(sinkRim);

    const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.028, 0.2), matteBlackMat);
    sinkBasin.position.y = 0.014;
    sinkGroup.add(sinkBasin);

    const faucetArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.009, 10, 20, Math.PI),
      chromeMat
    );
    faucetArch.position.set(0, 0.09, -0.07);
    sinkGroup.add(faucetArch);

    sinkGroup.position.set(0.36, 1.0, 0.26);
    this.registerInteractiveTool(
      'sink',
      sinkGroup,
      'Stainless Rinse Sink [Key R] — Click to Dump & Rinse Cup',
      2,
      () => this.callbacks.onToolAction('rinse_cup')
    );
    this.toolGroups.set('rinse', sinkGroup);
    st2Group.add(sinkGroup);

    // 7. Active Barista Cup with Dynamic Custom ShaderMaterial Liquid + Procedural Crema
    this.activeBaristaCupGroup = this.createPorcelainCupMesh(1.04, false, false);
    this.activeBaristaCupGroup.position.copy(this.cupCurrentPos);

    this.cupLiquidShaderMat = new THREE.ShaderMaterial({
      vertexShader: CUP_LIQUID_VERTEX_SHADER,
      fragmentShader: CUP_LIQUID_FRAGMENT_SHADER,
      uniforms: {
        uFillLevel: { value: 0.0 },
        uBaseColor: { value: new THREE.Color(0x3b1d0e) },
        uCremaColor: { value: new THREE.Color(0xd98a3c) },
        uHasMilk: { value: 0.0 },
        uTime: { value: 0.0 },
      },
    });

    this.activeCupLiquidMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.062, 0.11, 28, 8, false),
      this.cupLiquidShaderMat
    );
    this.activeCupLiquidMesh.position.y = 0.078;
    this.activeCupLiquidMesh.visible = false;
    this.activeBaristaCupGroup.add(this.activeCupLiquidMesh);

    this.activeCupDrizzleRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.044, 0.0045, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2 })
    );
    this.activeCupDrizzleRing.rotation.x = Math.PI / 2;
    this.activeCupDrizzleRing.position.y = 0.14;
    this.activeCupDrizzleRing.visible = false;
    this.activeBaristaCupGroup.add(this.activeCupDrizzleRing);

    this.activeCupIceGroup = new THREE.Group();
    const iceMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.08,
      transmission: useTrans ? 0.88 : 0,
      transparent: true,
      opacity: 0.8,
    });
    for (let i = 0; i < 4; i++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), iceMat);
      const angle = (i / 4) * Math.PI * 2;
      cube.position.set(Math.cos(angle) * 0.024, 0.132, Math.sin(angle) * 0.024);
      cube.rotation.set(i * 0.4, i * 0.7, 0.2);
      this.activeCupIceGroup.add(cube);
    }
    this.activeCupIceGroup.visible = false;
    this.activeBaristaCupGroup.add(this.activeCupIceGroup);
    st2Group.add(this.activeBaristaCupGroup);

    this.scene.add(st2Group);
  }

  // Station 3 (x: 0.44 to 1.55): Milk Pitcher (0.44, 0.36), Dedicated Drink Assembly Coaster (0.62, 0.38), Recessed Ice Bin (0.85, 0.16), Tiered Syrup Rack (1.22, 0.18), Matcha Chawan & Whisk (1.48, 0.34)
  private buildStation3MilkSyrupsAndIce() {
    const st3Group = new THREE.Group();

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.92,
    });
    this.pitcherBodyMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.92,
    });
    const brassPumpMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.22,
      metalness: 0.88,
    });

    // 1. Dedicated Drink Assembly Mat / Coaster at x = 0.78, y = 1.0, z = 0.38
    const assemblyCoasterGroup = new THREE.Group();
    const coasterDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.115, 0.016, 24),
      this.counterWoodMat
    );
    coasterDisc.position.y = 0.008;
    assemblyCoasterGroup.add(coasterDisc);

    const coasterBrassInlay = new THREE.Mesh(
      new THREE.TorusGeometry(0.095, 0.004, 8, 24),
      brassPumpMat
    );
    coasterBrassInlay.rotation.x = Math.PI / 2;
    coasterBrassInlay.position.y = 0.017;
    assemblyCoasterGroup.add(coasterBrassInlay);

    assemblyCoasterGroup.position.set(0.78, 1.0, 0.38);
    st3Group.add(assemblyCoasterGroup);

    // 1b. Kyoto Borosilicate Glass Teapot & Botanical Infuser at x = 0.78, y = 1.0, z = 0.14
    this.teaPotGroup = new THREE.Group();
    const teapotWarmerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.082, 0.025, 20),
      brassPumpMat
    );
    teapotWarmerBase.position.y = 0.0125;
    this.teaPotGroup.add(teapotWarmerBase);

    const useTrans = this.shouldUsePhysicalTransmission();
    const teapotGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xecfccb,
      roughness: 0.1,
      transmission: useTrans ? 0.78 : 0,
      transparent: true,
      opacity: useTrans ? 0.88 : 0.45,
    });
    const teapotBelly = new THREE.Mesh(
      new THREE.SphereGeometry(0.078, 20, 16),
      teapotGlassMat
    );
    teapotBelly.scale.set(1, 0.82, 1);
    teapotBelly.position.y = 0.082;
    this.teaPotGroup.add(teapotBelly);

    // Inner Stainless & Botanical Leaf Infuser Core
    const infuserCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.028, 0.085, 16),
      new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.55 })
    );
    infuserCore.position.y = 0.082;
    this.teaPotGroup.add(infuserCore);

    const teapotLid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.048, 0.018, 18),
      brassPumpMat
    );
    teapotLid.position.y = 0.145;
    this.teaPotGroup.add(teapotLid);

    const lidKnob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 12), this.counterWoodMat);
    lidKnob.position.y = 0.162;
    this.teaPotGroup.add(lidKnob);

    const teapotSpout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.02, 0.075, 12),
      teapotGlassMat
    );
    teapotSpout.position.set(0, 0.095, 0.072);
    teapotSpout.rotation.x = 0.65;
    this.teaPotGroup.add(teapotSpout);

    const teapotHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.042, 0.008, 10, 20, Math.PI),
      this.counterWoodMat
    );
    teapotHandle.rotation.y = Math.PI / 2;
    teapotHandle.position.set(0, 0.088, -0.072);
    this.teaPotGroup.add(teapotHandle);

    this.teaPotGroup.position.set(0.78, 1.0, 0.14);
    this.registerInteractiveTool(
      'tea',
      this.teaPotGroup,
      'Kyoto Borosilicate Glass Teapot — Click to Steep Artisanal Tea & Botanicals',
      3,
      () => this.callbacks.onToolAction('steep_tea')
    );
    st3Group.add(this.teaPotGroup);

    this.teaPourStreamMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.005, 0.21, 12),
      new THREE.MeshStandardMaterial({
        color: 0x84cc16,
        emissive: 0x4d7c0f,
        emissiveIntensity: 0.35,
      })
    );
    this.teaPourStreamMesh.visible = false;
    st3Group.add(this.teaPourStreamMesh);

    // 2. Stainless Milk Pitcher at x = 0.56, y = 1.0, z = 0.36
    this.milkPitcherGroup = new THREE.Group();
    const pitcherBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.064, 0.076, 0.175, 24, 1, true),
      this.pitcherBodyMat
    );
    pitcherBody.position.y = 0.088;
    this.milkPitcherGroup.add(pitcherBody);

    const pitcherBottom = new THREE.Mesh(new THREE.CircleGeometry(0.076, 24), this.pitcherBodyMat);
    pitcherBottom.rotation.x = Math.PI / 2;
    pitcherBottom.position.y = 0.002;
    this.milkPitcherGroup.add(pitcherBottom);

    const spoutLip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.01, 0.035, 12),
      this.pitcherBodyMat
    );
    spoutLip.position.set(0.062, 0.162, 0);
    spoutLip.rotation.z = -0.45;
    this.milkPitcherGroup.add(spoutLip);

    const pHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.042, 0.008, 10, 20, Math.PI),
      this.pitcherBodyMat
    );
    pHandle.rotation.z = Math.PI / 2;
    pHandle.position.set(-0.068, 0.092, 0);
    this.milkPitcherGroup.add(pHandle);

    this.pitcherMilkMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.068, 0.12, 20),
      new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.25 })
    );
    this.pitcherMilkMesh.position.y = 0.068;
    this.milkPitcherGroup.add(this.pitcherMilkMesh);

    const tempBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.071, 0.073, 0.028, 24),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.45,
      })
    );
    tempBand.position.y = 0.062;
    this.milkPitcherGroup.add(tempBand);

    this.milkPitcherGroup.position.set(0.56, 1.0, 0.36);
    this.registerInteractiveTool(
      'milk',
      this.milkPitcherGroup,
      'Stainless Frothing Pitcher — Click to Steam 65°C Microfoam & Pour Latte Art',
      3,
      () => this.callbacks.onToolAction('steam_milk')
    );
    st3Group.add(this.milkPitcherGroup);

    this.milkPourStreamMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.006, 0.22, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xfef3c7,
        emissiveIntensity: 0.35,
      })
    );
    this.milkPourStreamMesh.visible = false;
    st3Group.add(this.milkPourStreamMesh);

    // 3. Recessed Polycarbonate Ice Bin at x = 0.98, y = 1.0, z = 0.16
    const iceBinGroup = new THREE.Group();
    const binRim = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.035, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.28, metalness: 0.72 })
    );
    binRim.position.y = 0.018;
    iceBinGroup.add(binRim);

    const iceSurface = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.025, 0.18),
      new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        roughness: 0.12,
        metalness: 0.1,
      })
    );
    iceSurface.position.y = 0.032;
    iceBinGroup.add(iceSurface);

    for (let i = 0; i < 8; i++) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.026, 0.032),
        new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.1 })
      );
      c.position.set(-0.075 + (i % 4) * 0.05, 0.048, -0.04 + Math.floor(i / 4) * 0.07);
      c.rotation.set(0.2, i * 0.6, 0.1);
      iceBinGroup.add(c);
    }

    this.iceScoopGroup = new THREE.Group();
    const scoopBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.022, 0.07, 14, 1, false, 0, Math.PI),
      chromeMat
    );
    scoopBowl.rotation.z = Math.PI / 2;
    this.iceScoopGroup.add(scoopBowl);

    const scoopHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.012, 0.07, 12),
      this.counterWoodMat
    );
    scoopHandle.rotation.z = Math.PI / 2;
    scoopHandle.position.set(0.06, 0.01, 0);
    this.iceScoopGroup.add(scoopHandle);

    this.iceScoopGroup.position.set(0.02, 0.065, 0.01);
    iceBinGroup.add(this.iceScoopGroup);

    iceBinGroup.position.set(0.98, 1.0, 0.16);
    this.registerInteractiveTool(
      'ice',
      iceBinGroup,
      'Recessed Polycarbonate Ice Bin & Scoop — Click to Scoop Crystal Ice Cubes',
      3,
      () => this.callbacks.onToolAction('add_ice')
    );
    st3Group.add(iceBinGroup);

    // 4. Tiered Wooden Syrup Rack at x = 1.32, y = 1.0, z = 0.18 (Vanilla, Caramel, Chocolate)
    const rackStep = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.045, 0.18),
      this.counterWoodMat
    );
    rackStep.position.set(1.32, 1.022, 0.18);
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
        x: 1.20,
      },
      {
        flavor: 'caramel',
        title: 'CARAMEL',
        sub: 'SALTED BUTTER',
        labelText: 'Salted Butter Caramel Syrup',
        color: 0xd97706,
        bgHex: '#ffedd5',
        borderHex: '#b45309',
        x: 1.32,
      },
      {
        flavor: 'chocolate',
        title: 'CACAO',
        sub: 'DARK GANACHE',
        labelText: 'Single-Origin Dark Cacao Ganache',
        color: 0x451a03,
        bgHex: '#f5f5f4',
        borderHex: '#78350f',
        x: 1.44,
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
        new THREE.CylinderGeometry(0.046, 0.048, 0.21, 20),
        glassMat
      );
      bottleBody.position.y = 0.105;
      bottleGroup.add(bottleBody);

      const labelBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.047, 0.048, 0.095, 20, 1, true),
        labelMat
      );
      labelBand.position.y = 0.105;
      bottleGroup.add(labelBand);

      const bottleShoulder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.046, 0.045, 20),
        glassMat
      );
      bottleShoulder.position.y = 0.23;
      bottleGroup.add(bottleShoulder);

      const pumpHeadGroup = new THREE.Group();
      pumpHeadGroup.position.y = 0.27;
      const pumpCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.019, 0.022, 0.038, 16),
        brassPumpMat
      );
      pumpHeadGroup.add(pumpCollar);

      const pumpSpout = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.075), brassPumpMat);
      pumpSpout.position.set(0, 0.022, 0.03);
      pumpSpout.rotation.x = 0.18;
      pumpHeadGroup.add(pumpSpout);

      bottleGroup.add(pumpHeadGroup);
      this.syrupPumpHeads.set(s.flavor, pumpHeadGroup);

      bottleGroup.position.set(s.x, 1.045, 0.18);
      this.registerInteractiveTool(
        `syrup-${s.flavor}`,
        bottleGroup,
        `${s.labelText} — Click to Pump into Cup on Assembly Coaster`,
        3,
        () => this.callbacks.onToolAction('add_syrup', s.flavor)
      );
      st3Group.add(bottleGroup);
    });

    // 5. Ceramic Matcha Chawan Bowl & Bamboo Whisk at x = 1.56, y = 1.0, z = 0.36
    const matchaGroup = new THREE.Group();
    const chawanMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.45,
      metalness: 0.1,
    });
    const chawanBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.055, 0.082, 24),
      chawanMat
    );
    chawanBowl.position.y = 0.041;
    matchaGroup.add(chawanBowl);

    const matchaFoamDisk = new THREE.Mesh(
      new THREE.CircleGeometry(0.074, 24),
      new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.32 })
    );
    matchaFoamDisk.rotation.x = -Math.PI / 2;
    matchaFoamDisk.position.y = 0.083;
    matchaGroup.add(matchaFoamDisk);

    this.matchaWhiskGroup = new THREE.Group();
    this.matchaWhiskGroup.position.set(0, 0.095, 0);
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0xd6b370, roughness: 0.55 });
    const whiskHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.014, 0.055, 14),
      bambooMat
    );
    whiskHandle.position.y = 0.042;
    this.matchaWhiskGroup.add(whiskHandle);

    const whiskTines = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.014, 0.05, 16, 1, true),
      bambooMat
    );
    whiskTines.position.y = 0.004;
    this.matchaWhiskGroup.add(whiskTines);

    matchaGroup.add(this.matchaWhiskGroup);
    matchaGroup.position.set(1.56, 1.0, 0.36);
    this.registerInteractiveTool(
      'syrup-matcha',
      matchaGroup,
      'Ceremonial Matcha Chawan & Bamboo Whisk — Click to Whisk & Pour Uji Matcha',
      3,
      () => this.callbacks.onToolAction('add_syrup', 'matcha')
    );
    st3Group.add(matchaGroup);

    this.syrupRibbonMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.004, 0.2, 10),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.15 })
    );
    this.syrupRibbonMesh.visible = false;
    st3Group.add(this.syrupRibbonMesh);

    this.scene.add(st3Group);
  }

  // Station 4 (Customer Pickup Handoff Counter at x = -1.35, z = 0.12) & Cozy Cafe / Garden Tables
  private buildStation4ServeTrayAndGarden() {
    const st4Group = new THREE.Group();

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.18,
      metalness: 0.9,
    });

    // 1. Elevated Walnut Pickup Coaster at (-1.32, 1.0, 0.34) & Brass Service Bell at (-1.48, 1.0, 0.38)
    const serveTrayGroup = new THREE.Group();
    const trayBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.15, 0.03, 24),
      this.counterWoodMat
    );
    trayBase.position.y = 0.015;
    serveTrayGroup.add(trayBase);

    const bellDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.034, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      brassMat
    );
    bellDome.position.set(-0.16, 0.03, 0.04);
    serveTrayGroup.add(bellDome);

    // Expanding Golden Bell Ring Ripple Mesh
    this.bellRippleRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.04, 0.058, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      })
    );
    this.bellRippleRingMesh.rotation.x = -Math.PI / 2;
    this.bellRippleRingMesh.position.set(-0.16, 0.065, 0.04);
    this.bellRippleRingMesh.visible = false;
    serveTrayGroup.add(this.bellRippleRingMesh);

    this.ghostCupMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.068, 0.135, 20),
      this.ghostSnapMat
    );
    this.ghostCupMesh.position.y = 0.095;
    serveTrayGroup.add(this.ghostCupMesh);

    serveTrayGroup.position.set(-1.32, 1.0, 0.34);
    this.registerInteractiveTool(
      'serve',
      serveTrayGroup,
      'Customer Pickup Coaster & Service Bell — Click to Ring Bell & Handoff Drink [Space]',
      4,
      () => this.callbacks.onToolAction('serve_drink')
    );
    st4Group.add(serveTrayGroup);

    // 2. 4 Modern Architectural Bistro Tables Strictly Relocated to Center-Right Lounge Zone (Zero Miata Collision!)
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x1a1d20,
      roughness: 0.42,
      metalness: 0.78,
    });
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x7c3f1c,
      roughness: 0.56,
      metalness: 0.06,
    });
    const tableShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });

    LOUNGE_TABLE_LAYOUT.forEach((tableDef) => {
      // Runtime Phase 6 clearance assertion against MIATA_BAY
      if (!isClearOfMiataBay(tableDef.x, tableDef.z, tableDef.radius)) {
        console.warn(`[Klasik3D] Table ${tableDef.id} encroaches MIATA_BAY — skipping placement.`);
        return;
      }

      const tGroup = new THREE.Group();

      // Grounding Contact Shadow Disc (keeps tables grounded in LOW graphics quality!)
      const shadowDisc = new THREE.Mesh(
        new THREE.CircleGeometry(tableDef.shape === 'rect' ? 0.88 : 0.78, 22),
        tableShadowMat
      );
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = 0.018;
      tGroup.add(shadowDisc);

      // Matte-black pedestal base + slim central column + brushed-brass foot ring
      const baseFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.035, 18), ironMat);
      baseFoot.position.y = 0.034;
      tGroup.add(baseFoot);

      const brassFootRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.255, 0.011, 8, 24),
        brassMat
      );
      brassFootRing.rotation.x = Math.PI / 2;
      brassFootRing.position.y = 0.05;
      tGroup.add(brassFootRing);

      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.052, 0.72, 14), ironMat);
      pedestal.position.y = 0.39;
      tGroup.add(pedestal);

      // Beveled walnut bistro tabletop + slim brass inlay bevel
      const tabletop =
        tableDef.shape === 'rect'
          ? new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.048, 0.78), this.counterWoodMat)
          : new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.50, 0.048, 24), this.counterWoodMat);
      tabletop.position.y = 0.76;
      tabletop.castShadow = true;
      tabletop.receiveShadow = true;
      tGroup.add(tabletop);

      const tableBevel =
        tableDef.shape === 'rect'
          ? new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.012, 0.8), brassMat)
          : new THREE.Mesh(new THREE.CylinderGeometry(0.528, 0.528, 0.012, 24), brassMat);
      tableBevel.position.y = 0.736;
      tGroup.add(tableBevel);

      // Pair of Curved Mid-Century Leather Chairs (Seat A on Left, Seat B on Right facing table)
      tableDef.seats.forEach((seat) => {
        const chair = new THREE.Group();
        const localX = seat.x - tableDef.x;
        const localZ = seat.z - tableDef.z;
        const isLeftChair = localX < 0;

        // Contact shadow disc under chair
        const cShadow = new THREE.Mesh(new THREE.CircleGeometry(0.26, 14), tableShadowMat);
        cShadow.rotation.x = -Math.PI / 2;
        cShadow.position.y = 0.018;
        chair.add(cShadow);

        // 4 Tapered Mid-Century Legs with Brass Ferrules
        [
          [-0.14, -0.14],
          [0.14, -0.14],
          [-0.14, 0.14],
          [0.14, 0.14],
        ].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.01, 0.42, 6), ironMat);
          leg.position.set(lx, 0.21, lz);
          leg.rotation.z = lx * 0.4;
          leg.rotation.x = -lz * 0.4;
          chair.add(leg);
        });

        // Curved Walnut Seat Shell + Warm Saddle-Leather Cushion
        const seatShell = new THREE.Mesh(
          new THREE.CylinderGeometry(0.21, 0.2, 0.036, 16),
          this.counterWoodMat
        );
        seatShell.position.y = 0.43;
        chair.add(seatShell);

        const seatCushion = new THREE.Mesh(
          new THREE.CylinderGeometry(0.185, 0.195, 0.028, 16),
          leatherMat
        );
        seatCushion.position.y = 0.46;
        chair.add(seatCushion);

        // Curved Mid-Century Backrest Arc (faces inward toward table)
        const backOffset = isLeftChair ? -0.18 : 0.18;
        const backSupport = new THREE.Mesh(
          new THREE.BoxGeometry(0.036, 0.3, 0.34),
          this.counterWoodMat
        );
        backSupport.position.set(backOffset, 0.65, 0);
        chair.add(backSupport);

        const backPad = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.22, 0.28), leatherMat);
        backPad.position.set(backOffset + (isLeftChair ? 0.022 : -0.022), 0.66, 0);
        chair.add(backPad);

        chair.position.set(localX, 0, localZ);
        tGroup.add(chair);
      });

      // Tabletop Props: Stoneware Bud Vase + Sculpted Botanical Cutting + Walnut Napkin Caddy
      const vase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.042, 0.11, 14),
        this.ceramicMugMat
      );
      vase.position.set(-0.08, 0.84, -0.12);
      tGroup.add(vase);

      const cuttingLeaf = new THREE.Mesh(
        new THREE.CircleGeometry(0.068, 6),
        new THREE.MeshStandardMaterial({
          color: 0x1f7a41,
          roughness: 0.45,
          side: THREE.DoubleSide,
        })
      );
      cuttingLeaf.scale.set(0.85, 1.35, 1);
      cuttingLeaf.position.set(-0.08, 0.93, -0.12);
      cuttingLeaf.rotation.set(-0.45, 0.35, 0.2);
      tGroup.add(cuttingLeaf);

      const napkinHolder = new THREE.Mesh(
        new THREE.BoxGeometry(0.085, 0.072, 0.042),
        this.counterWoodMat
      );
      napkinHolder.position.set(0.12, 0.82, -0.12);
      tGroup.add(napkinHolder);

      // Sleek Aluminum Laptop on designated work-friendly lounge tables
      if (tableDef.hasLaptop) {
        const laptopBase = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.012, 0.18),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 })
        );
        laptopBase.position.set(0.14, 0.79, 0.12);
        laptopBase.rotation.y = -0.35;
        tGroup.add(laptopBase);

        const laptopScreen = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.16, 0.009),
          new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            emissive: 0x38bdf8,
            emissiveIntensity: 0.48,
          })
        );
        laptopScreen.position.set(0.08, 0.87, 0.05);
        laptopScreen.rotation.y = -0.35;
        laptopScreen.rotation.x = -0.22;
        tGroup.add(laptopScreen);
      }

      tGroup.position.set(tableDef.x, 0, tableDef.z);
      st4Group.add(tGroup);
    });

    // 3. Instanced Sculpted Monstera Botanical Wall Accents along Architectural Perimeter (Zero Floating Mid-Air Balls!)
    const leafGeo = new THREE.CircleGeometry(0.22, 6);
    leafGeo.scale(0.85, 1.4, 1);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x1c723c,
      roughness: 0.48,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    const leafCount = 36;
    this.monsteraLeavesInstanced = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
    const tintColor = new THREE.Color();

    for (let i = 0; i < leafCount; i++) {
      // Cluster naturally near the left/right planter troughs and back conservatory glass wall
      const cluster = i % 4;
      let x = 0;
      let y = 0.72 + (i % 5) * 0.24;
      let z = -5.6;
      if (cluster === 0) {
        x = -4.92 + ((i % 3) - 1) * 0.22;
        z = -1.35 + ((i % 4) - 1.5) * 0.24;
      } else if (cluster === 1) {
        x = -4.85 + ((i % 3) - 1) * 0.24;
        z = -5.55 + ((i % 3) - 1) * 0.2;
      } else if (cluster === 2) {
        x = 4.78 + ((i % 3) - 1) * 0.24;
        z = -2.35 - (i % 5) * 0.58;
      } else {
        x = -1.15 + ((i % 5) - 2) * 0.24;
        z = -5.78 + ((i % 2) - 0.5) * 0.16;
      }
      _dummyObj.position.set(x, y, z);
      _dummyObj.rotation.set(-0.45 + (i % 3) * 0.2, i * 0.75, ((i % 2) - 0.5) * 0.4);
      const s = 0.72 + (i % 4) * 0.12;
      _dummyObj.scale.setScalar(s);
      _dummyObj.updateMatrix();
      this.monsteraLeavesInstanced.setMatrixAt(i, _dummyObj.matrix);

      tintColor.setHSL(0.37 + (i % 5) * 0.015, 0.58, 0.24 + (i % 4) * 0.045);
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

  // Station 5 (x: 1.75 to 2.35): Shop Upgrade Tablet (1.78, 0.32) & 3D Vinyl Turntable + Album Sleeve Stand (2.15, 0.24)
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

    // 1. Shop Upgrade Tablet at x = 1.78, z = 0.32
    const tabletGroup = new THREE.Group();
    const tabletBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.17, 0.018),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 })
    );
    tabletBody.position.y = 0.095;
    tabletBody.rotation.x = -0.45;
    tabletGroup.add(tabletBody);

    const tabletScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.21, 0.14),
      new THREE.MeshStandardMaterial({
        color: 0x78350f,
        emissive: 0xd97706,
        emissiveIntensity: 0.5,
      })
    );
    tabletScreen.position.set(0, 0.097, 0.011);
    tabletScreen.rotation.x = -0.45;
    tabletGroup.add(tabletScreen);

    tabletGroup.position.set(1.84, 1.0, 0.32);
    this.registerInteractiveTool(
      'upgrade-tablet',
      tabletGroup,
      'Shop Management Tablet — Click to Buy Cafe Upgrades',
      5,
      () => this.callbacks.onToolAction('open_upgrades_modal')
    );
    st5Group.add(tabletGroup);

    // 2. 3D Vinyl Turntable + Album Sleeve Stand at x = 2.22, y = 1.0, z = 0.24
    const turntableGroup = new THREE.Group();
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.065, 0.38),
      this.counterWoodMat
    );
    plinth.position.y = 0.0325;
    plinth.castShadow = true;
    turntableGroup.add(plinth);

    [
      [-0.19, -0.15],
      [0.19, -0.15],
      [-0.19, 0.15],
      [0.19, 0.15],
    ].forEach(([fx, fz]) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.016, 16), brassMat);
      foot.position.set(fx, 0.008, fz);
      turntableGroup.add(foot);
    });

    this.vinylPlatterGroup = new THREE.Group();
    this.vinylPlatterGroup.position.set(-0.04, 0.072, 0);

    const platterMetal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.155, 0.018, 32),
      brushedAluminumMat
    );
    this.vinylPlatterGroup.add(platterMetal);

    const vinylDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.148, 0.148, 0.006, 32),
      vinylGrooveMat
    );
    vinylDisc.position.y = 0.012;
    this.vinylPlatterGroup.add(vinylDisc);

    const centerLabel = new THREE.Mesh(
      new THREE.CircleGeometry(0.052, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.vinylLabelTexture,
        roughness: 0.35,
      })
    );
    centerLabel.rotation.x = -Math.PI / 2;
    centerLabel.position.y = 0.016;
    this.vinylPlatterGroup.add(centerLabel);

    const spindle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.035, 12),
      brushedAluminumMat
    );
    spindle.position.y = 0.02;
    this.vinylPlatterGroup.add(spindle);

    turntableGroup.add(this.vinylPlatterGroup);

    this.vinylTonearmPivot = new THREE.Group();
    this.vinylTonearmPivot.position.set(0.15, 0.09, -0.11);

    const armBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.036, 0.03, 16),
      brushedAluminumMat
    );
    this.vinylTonearmPivot.add(armBase);

    const sCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.015, -0.03),
      new THREE.Vector3(0, 0.015, 0.04),
      new THREE.Vector3(-0.03, 0.015, 0.12),
      new THREE.Vector3(-0.065, 0.012, 0.19),
    ]);
    const tonearmTube = new THREE.Mesh(
      new THREE.TubeGeometry(sCurve, 20, 0.006, 8, false),
      brushedAluminumMat
    );
    this.vinylTonearmPivot.add(tonearmTube);

    const cartridge = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.015, 0.038), brassMat);
    cartridge.position.set(-0.068, 0.01, 0.2);
    this.vinylTonearmPivot.add(cartridge);

    turntableGroup.add(this.vinylTonearmPivot);

    turntableGroup.position.set(2.22, 1.0, 0.24);
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
      new THREE.BoxGeometry(0.28, 0.28, 0.018),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.vinylLabelTexture,
        roughness: 0.55,
      })
    );
    this.vinylSleeveMesh.position.y = 0.15;
    this.vinylSleeveMesh.rotation.x = -0.18;
    sleeveStandGroup.add(this.vinylSleeveMesh);

    sleeveStandGroup.position.set(2.52, 1.0, 0.12);
    sleeveStandGroup.rotation.y = -0.45;
    this.registerInteractiveTool(
      'vinyl-sleeve',
      sleeveStandGroup,
      'Now-Playing Vinyl Sleeve — Click to Configure Spotify & Tracks',
      5,
      () => this.callbacks.onToolAction('open_spotify_modal')
    );
    st5Group.add(sleeveStandGroup);

    this.scene.add(st5Group);
  }

  // Visible 3D Counter & Showroom Props for Installed Shop Upgrades
  private buildShopUpgradeProps() {
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.22,
      metalness: 0.88,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.78,
    });
    const glowingTubeMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf97316,
      emissiveIntensity: 1.8,
      roughness: 0.15,
    });

    // 1. Audiophile Vacuum Tube Preamp (`audiophile-tube-preamp`) at Station 5 (x = 1.94, y = 1.0, z = 0.10)
    this.upgradeTubePreampGroup = new THREE.Group();
    const preampChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.055, 0.16),
      darkSteelMat
    );
    preampChassis.position.y = 0.028;
    this.upgradeTubePreampGroup.add(preampChassis);
    const preampFaceplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.245, 0.048, 0.012),
      brassMat
    );
    preampFaceplate.position.set(0, 0.028, 0.082);
    this.upgradeTubePreampGroup.add(preampFaceplate);
    [-0.075, -0.025, 0.025, 0.075].forEach((tx) => {
      const tubeSocket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.016, 0.014, 12),
        brassMat
      );
      tubeSocket.position.set(tx, 0.062, -0.01);
      this.upgradeTubePreampGroup.add(tubeSocket);
      const vacuumTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.011, 0.045, 12),
        glowingTubeMat
      );
      vacuumTube.position.set(tx, 0.09, -0.01);
      this.upgradeTubePreampGroup.add(vacuumTube);
    });
    this.upgradeTubePreampGroup.position.set(1.94, 1.0, 0.1);
    this.upgradeTubePreampGroup.visible = false;
    this.scene.add(this.upgradeTubePreampGroup);

    // 2. Klipschorn Corner Horn Speakers (`klipschorn-corner-speakers`) flanking the Garage Archway
    this.upgradeKlipschSpeakersGroup = new THREE.Group();
    [-2.75, 2.75].forEach((sx) => {
      const spk = new THREE.Group();
      const cabinet = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 1.15, 0.46),
        this.counterWoodMat
      );
      cabinet.position.y = 0.575;
      cabinet.castShadow = true;
      spk.add(cabinet);
      const acousticHorn = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.28, 0.06),
        brassMat
      );
      acousticHorn.position.set(0, 0.92, 0.22);
      spk.add(acousticHorn);
      const grille = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.56, 0.03),
        darkSteelMat
      );
      grille.position.set(0, 0.42, 0.225);
      spk.add(grille);
      spk.position.set(sx, 0, -1.55);
      spk.rotation.y = sx < 0 ? 0.35 : -0.35;
      this.upgradeKlipschSpeakersGroup.add(spk);
    });
    this.upgradeKlipschSpeakersGroup.visible = false;
    this.scene.add(this.upgradeKlipschSpeakersGroup);

    // 3. Japanese Bonsai Counter Terrarium (`japanese-bonsai-terrarium`) at Counter Corner (x = 1.62, y = 1.0, z = 0.22)
    this.upgradeBonsaiTerrariumGroup = new THREE.Group();
    const bonsaiPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.085, 0.055, 18),
      new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.25, metalness: 0.15 })
    );
    bonsaiPot.position.y = 0.028;
    this.upgradeBonsaiTerrariumGroup.add(bonsaiPot);
    const bonsaiTrunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.028, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 })
    );
    bonsaiTrunk.position.set(0, 0.11, 0);
    bonsaiTrunk.rotation.z = 0.22;
    this.upgradeBonsaiTerrariumGroup.add(bonsaiTrunk);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
    [
      [-0.04, 0.19, 0, 0.065],
      [0.035, 0.22, 0.01, 0.072],
      [-0.01, 0.25, -0.01, 0.058],
    ].forEach(([fx, fy, fz, fr]) => {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(fr, 12, 10), foliageMat);
      pad.scale.set(1.35, 0.55, 1.15);
      pad.position.set(fx, fy, fz);
      this.upgradeBonsaiTerrariumGroup.add(pad);
    });
    this.upgradeBonsaiTerrariumGroup.position.set(1.62, 1.0, 0.22);
    this.upgradeBonsaiTerrariumGroup.visible = false;
    this.scene.add(this.upgradeBonsaiTerrariumGroup);

    // 4. Ethiopian Geisha Single-Origin Bean Vault (`ethiopian-geisha-bean-vault`) near Grinder (x = -1.16, y = 1.0, z = 0.14)
    this.upgradeGeishaVaultGroup = new THREE.Group();
    const vaultStand = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.024, 0.11),
      this.counterWoodMat
    );
    vaultStand.position.y = 0.012;
    this.upgradeGeishaVaultGroup.add(vaultStand);
    [-0.08, 0, 0.08].forEach((cx) => {
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, 0.14, 16),
        new THREE.MeshStandardMaterial({
          color: 0x451a03,
          roughness: 0.2,
          metalness: 0.3,
        })
      );
      jar.position.set(cx, 0.09, 0);
      this.upgradeGeishaVaultGroup.add(jar);
      const goldCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.022, 16),
        brassMat
      );
      goldCap.position.set(cx, 0.168, 0);
      this.upgradeGeishaVaultGroup.add(goldCap);
    });
    this.upgradeGeishaVaultGroup.position.set(-1.16, 1.0, 0.14);
    this.upgradeGeishaVaultGroup.visible = false;
    this.scene.add(this.upgradeGeishaVaultGroup);

    // 5. 1990 Miata MX-5 Pop-Up Concours Stage (`miata-pop-up-concours-stage`)
    this.upgradeMiataStageGroup = new THREE.Group();
    const concoursRing = new THREE.Mesh(
      new THREE.RingGeometry(1.95, 2.08, 36),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.9,
        side: THREE.DoubleSide,
      })
    );
    concoursRing.rotation.x = -Math.PI / 2;
    concoursRing.position.set(MIATA_BAY.centerX, 0.064, MIATA_BAY.centerZ);
    this.upgradeMiataStageGroup.add(concoursRing);
    this.upgradeMiataStageGroup.visible = false;
    this.scene.add(this.upgradeMiataStageGroup);

    // 6. Tokyo Specialty Roastery Guild Charter (`tokyo-roastery-guild-charter`)
    this.upgradeGuildCharterGroup = new THREE.Group();
    const crestPlaque = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.03, 24),
      brassMat
    );
    crestPlaque.rotation.x = Math.PI / 2;
    this.upgradeGuildCharterGroup.add(crestPlaque);
    const crestCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.036, 24),
      darkSteelMat
    );
    crestCore.rotation.x = Math.PI / 2;
    this.upgradeGuildCharterGroup.add(crestCore);
    this.upgradeGuildCharterGroup.position.set(0.15, 2.68, -0.45);
    this.upgradeGuildCharterGroup.visible = false;
    this.scene.add(this.upgradeGuildCharterGroup);
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

    const speechMat = new THREE.SpriteMaterial({
      map: this.pickupSpeechTexture,
      transparent: true,
      depthTest: false,
    });
    this.pickupSpeechSprite = new THREE.Sprite(speechMat);
    this.pickupSpeechSprite.scale.set(0.76, 0.22, 1);
    this.pickupSpeechSprite.visible = false;
    this.scene.add(this.pickupSpeechSprite);

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
    const steamGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    this.steamParticlesInstanced = new THREE.InstancedMesh(steamGeo, steamMat, 24);
    this.steamParticlesInstanced.frustumCulled = false;
    this.scene.add(this.steamParticlesInstanced);

    const noteGeo = new THREE.TorusGeometry(0.022, 0.006, 8, 16);
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

  private drawCustomerActivityBadge(tex: THREE.CanvasTexture, text: string) {
    const canvas = tex.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = 'rgba(28, 20, 16, 0.92)';
    ctx.beginPath();
    ctx.roundRect(6, 8, 116, 48, 24);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw crisp offline vector icon on left side of badge
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.fillStyle = '#fbbf24';
    ctx.lineWidth = 2.2;
    if (text.includes('PHOTO')) {
      // Vector Camera Icon
      ctx.strokeRect(18, 23, 20, 15);
      ctx.beginPath();
      ctx.arc(28, 30.5, 4.2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (text.includes('WORK')) {
      // Vector Laptop Icon
      ctx.strokeRect(19, 22, 18, 12);
      ctx.fillRect(16, 35, 24, 2.5);
    } else if (text.includes('CHAT')) {
      // Vector Speech Bubble Icon
      ctx.beginPath();
      ctx.roundRect(18, 22, 20, 14, 5);
      ctx.stroke();
    } else {
      // Vector Coffee Cup Icon
      ctx.strokeRect(19, 24, 15, 13);
      ctx.beginPath();
      ctx.arc(34, 30, 3.5, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 76, 33);
    tex.needsUpdate = true;
  }

  // Articulated Multi-Part 3D Human Customer Rig with Expressive Layered Eyes, Full 3D Hats & Reactive Skin Pack Silhouettes
  private createCustomerCharacter(
    seed: number,
    avatarColor: string,
    shirtColor: string,
    skinPackId: CustomerSkinPackId = 'casual-garden'
  ): Omit<
    ArticulatedCustomerActor,
    'currentPos' | 'lastPos' | 'waypoints' | 'finalGoalKey' | 'walkPhase' | 'walkBlend' | 'seatedBlend' | 'facingAngle'
  > {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(avatarColor),
      roughness: 0.5,
      metalness: 0.02,
    });
    const jacketMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(shirtColor),
      roughness: skinPackId === 'cyber-neon-night' ? 0.32 : 0.58,
      metalness: skinPackId === 'cyber-neon-night' ? 0.45 : 0.06,
    });
    const innerShirtMat = new THREE.MeshStandardMaterial({
      color:
        skinPackId === 'vinyl-jazz-collectors' || skinPackId === 'cyber-neon-night'
          ? 0x18181b
          : 0xfafaf9,
      roughness: 0.68,
    });
    const pantsColor =
      skinPackId === 'tokyo-streetwear'
        ? 0x3f3f46
        : skinPackId === 'miata-track-club'
        ? 0x111827
        : skinPackId === 'botanical-artists'
        ? 0x44403c
        : skinPackId === 'cyber-neon-night'
        ? 0x09090b
        : seed % 2 === 0
        ? 0x1e293b
        : 0x334155;
    const denimMat = new THREE.MeshStandardMaterial({
      color: pantsColor,
      roughness: 0.76,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: skinPackId === 'tokyo-streetwear' ? 0xf8fafc : 0x18181b,
      roughness: 0.42,
    });
    const hairColors = [0x1c1917, 0x451a03, 0x78350f, 0x27272a, 0x92400e];
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColors[seed % hairColors.length],
      roughness: 0.68,
    });

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

    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.y = 0.58;
    group.add(pelvisGroup);

    const pelvisMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.145, 0.12, 16),
      denimMat
    );
    pelvisGroup.add(pelvisMesh);

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

      // Tokyo Streetwear Cargo Side Thigh Pockets
      if (skinPackId === 'tokyo-streetwear') {
        const cargoPocket = new THREE.Mesh(
          new THREE.BoxGeometry(0.026, 0.095, 0.075),
          denimMat
        );
        cargoPocket.position.set(sideX < 0 ? -0.058 : 0.058, -0.14, 0.01);
        hipJoint.add(cargoPocket);
      }

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

    [-0.065, 0.065].forEach((lx) => {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.025), jacketMat);
      lapel.position.set(lx, 0.36, 0.15);
      lapel.rotation.z = lx < 0 ? -0.2 : 0.2;
      torsoGroup.add(lapel);
    });

    // ================= SKIN-PACK SPECIFIC 3D OUTFIT SILHOUETTES =================
    if (skinPackId === 'tokyo-streetwear') {
      // Ribbed Varsity Bomber Waistband & Collar
      const ribWaist = new THREE.Mesh(
        new THREE.CylinderGeometry(0.162, 0.16, 0.055, 18),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 })
      );
      ribWaist.scale.set(1.12, 1, 0.8);
      ribWaist.position.y = 0.03;
      torsoGroup.add(ribWaist);

      // Crossbody Street Messenger Bag
      const bagMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 });
      const streetStrap = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.48, 0.3), bagMat);
      streetStrap.rotation.z = 0.55;
      streetStrap.position.set(0, 0.24, 0.01);
      torsoGroup.add(streetStrap);
    } else if (skinPackId === 'miata-track-club') {
      // Twin Vertical Motorsport Racing Stripes down the front chest
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.35 });
      [-0.085, -0.055].forEach((sx) => {
        const racingStripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.018, 0.45, 0.025),
          stripeMat
        );
        racingStripe.position.set(sx, 0.24, 0.145);
        torsoGroup.add(racingStripe);
      });
      // Gold Miata Chest Emblem Patch on right chest
      const chestBadge = new THREE.Mesh(
        new THREE.CircleGeometry(0.026, 12),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 })
      );
      chestBadge.position.set(0.08, 0.34, 0.152);
      torsoGroup.add(chestBadge);
    } else if (skinPackId === 'vinyl-jazz-collectors') {
      // Tailored Long Coat Lower Skirt Extension + Ribbed Turtleneck Collar
      const coatSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.165, 0.185, 0.18, 18),
        jacketMat
      );
      coatSkirt.scale.set(1.12, 1, 0.8);
      coatSkirt.position.y = -0.06;
      torsoGroup.add(coatSkirt);

      const turtleneck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.072, 0.065, 14),
        innerShirtMat
      );
      turtleneck.position.set(0, 0.49, 0.01);
      torsoGroup.add(turtleneck);
    } else if (skinPackId === 'botanical-artists') {
      // Wrap-Around Canvas Studio Apron + Front Tool Pocket
      const apronMat = new THREE.MeshStandardMaterial({
        color: seed % 2 === 0 ? 0xf5f5f4 : 0xd97706,
        roughness: 0.82,
      });
      const apronBib = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.38, 0.025),
        apronMat
      );
      apronBib.position.set(0, 0.19, 0.148);
      torsoGroup.add(apronBib);

      const apronSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.165, 0.175, 0.22, 16, 1, false, -Math.PI * 0.45, Math.PI * 0.9),
        apronMat
      );
      apronSkirt.scale.set(1.12, 1, 0.82);
      apronSkirt.position.set(0, -0.05, 0.01);
      torsoGroup.add(apronSkirt);

      const apronPocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.11, 0.022),
        new THREE.MeshStandardMaterial({
          color: seed % 2 === 0 ? 0xd6d3d1 : 0xb45309,
          roughness: 0.85,
        })
      );
      apronPocket.position.set(0, 0.13, 0.162);
      torsoGroup.add(apronPocket);
    } else if (skinPackId === 'cyber-neon-night') {
      // Glowing Emissive Neon Techwear Collar & Chest Conduits
      const neonMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(shirtColor),
        emissive: new THREE.Color(shirtColor),
        emissiveIntensity: 1.4,
        roughness: 0.2,
      });
      const cyberCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.095, 0.018, 10, 20, Math.PI * 1.35),
        neonMat
      );
      cyberCollar.rotation.x = Math.PI / 2 - 0.2;
      cyberCollar.rotation.z = -Math.PI * 0.675;
      cyberCollar.position.set(0, 0.48, 0.01);
      torsoGroup.add(cyberCollar);

      [-0.085, 0.085].forEach((cx) => {
        const conduit = new THREE.Mesh(
          new THREE.BoxGeometry(0.014, 0.38, 0.024),
          neonMat
        );
        conduit.position.set(cx, 0.24, 0.148);
        torsoGroup.add(conduit);
      });
    } else {
      // Casual Garden Default: Canvas Tote Bag or Neck Headphones
      if (seed % 2 === 0) {
        const toteMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.85 });
        const toteBag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.22), toteMat);
        toteBag.position.set(0.22, 0.05, -0.02);
        torsoGroup.add(toteBag);
        const toteStrap = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.014, 8, 20), toteMat);
        toteStrap.rotation.y = Math.PI / 2;
        toteStrap.position.set(0.18, 0.28, 0);
        torsoGroup.add(toteStrap);
      } else if (seed % 3 === 0) {
        const hpMat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          metalness: 0.7,
          roughness: 0.3,
        });
        const neckBand = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 10, 20), hpMat);
        neckBand.rotation.x = Math.PI / 2 + 0.18;
        neckBand.position.set(0, 0.47, 0.01);
        torsoGroup.add(neckBand);
      }
    }

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

    [-0.155, 0.155].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), skinMat);
      ear.scale.set(0.55, 1.1, 0.8);
      ear.position.set(ex, 0.185, 0);
      neckJoint.add(ear);
    });

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.048, 10), skinMat);
    nose.rotation.x = Math.PI / 2 - 0.18;
    nose.position.set(0, 0.184, 0.166);
    neckJoint.add(nose);

    // Sculpted Warm Smile Mouth & Subtle Rosy Cheek Blush
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.45 });
    const smileArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.022, 0.0036, 8, 14, Math.PI),
      mouthMat
    );
    smileArc.rotation.z = Math.PI;
    smileArc.rotation.x = -0.1;
    smileArc.position.set(0, 0.152, 0.155);
    neckJoint.add(smileArc);

    const blushMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.28,
      roughness: 0.6,
    });
    [-0.088, 0.088].forEach((cx) => {
      const cheekBlush = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), blushMat);
      cheekBlush.scale.set(1.2, 0.75, 0.35);
      cheekBlush.position.set(cx, 0.176, 0.14);
       cheekBlush.rotation.y = cx < 0 ? -0.35 : 0.35;
      neckJoint.add(cheekBlush);
    });

    // Multi-Part Layered Expressive 3D Eyes (Sclera + Colored Iris + Dark Pupil + White Catchlight + Upper Lash Arch)
    const scleraMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.18 });
    const irisColors = [0x451a03, 0x1e3a8a, 0x065f46, 0x78350f, 0x334155];
    const irisMat = new THREE.MeshStandardMaterial({
      color: irisColors[seed % irisColors.length],
      roughness: 0.2,
    });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const buildExpressiveEye = (sideX: number): THREE.Group => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(sideX, 0.206, 0.155);
      eyeGroup.rotation.y = sideX < 0 ? -0.14 : 0.14;

      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 10), scleraMat);
      sclera.scale.set(1.12, 0.96, 0.55);
      eyeGroup.add(sclera);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 10, 10), irisMat);
      iris.scale.set(1, 1, 0.45);
      iris.position.z = 0.0085;
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), pupilMat);
      pupil.scale.set(1, 1, 0.4);
      pupil.position.z = 0.012;
      eyeGroup.add(pupil);

      const catchlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.0028, 6, 6),
        catchlightMat
      );
      catchlight.position.set(-0.0035, 0.0038, 0.0145);
      eyeGroup.add(catchlight);

      const upperLash = new THREE.Mesh(
        new THREE.TorusGeometry(0.02, 0.0032, 8, 14, Math.PI),
        hairMat
      );
      upperLash.position.set(0, 0.003, 0.006);
      eyeGroup.add(upperLash);

      neckJoint.add(eyeGroup);
      return eyeGroup;
    };

    const leftEyeMesh = buildExpressiveEye(-0.054);
    const rightEyeMesh = buildExpressiveEye(0.054);

    // Expressive Eyebrows positioned cleanly above the eyes at z = 0.156
    [-0.054, 0.054].forEach((bx) => {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.009, 0.014), hairMat);
      brow.position.set(bx, 0.244, 0.154);
      brow.rotation.z = bx < 0 ? 0.08 : -0.08;
      brow.rotation.y = bx < 0 ? -0.14 : 0.14;
      neckJoint.add(brow);
    });

    // Base Hair Crown tilted back (-0.34 rad) so it NEVER clips through eyebrows or eyes!
    const hairCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.172, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
      hairMat
    );
    hairCrown.position.y = 0.215;
    hairCrown.rotation.x = -0.34;
    neckJoint.add(hairCrown);

    // Helper for Full 3D Baseball / Pit-Crew Cap (Crown Dome + Band + Top Button + Curved Visor)
    const addFull3DCap = (crownHex: number, visorHex: number) => {
      const crownMat = new THREE.MeshStandardMaterial({ color: crownHex, roughness: 0.62 });
      const visorMat = new THREE.MeshStandardMaterial({ color: visorHex, roughness: 0.55 });
      const capDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.178, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        crownMat
      );
      capDome.position.y = 0.222;
      capDome.rotation.x = -0.08;
      neckJoint.add(capDome);

      const capBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.168, 0.012, 8, 24),
        visorMat
      );
      capBand.rotation.x = Math.PI / 2 - 0.08;
      capBand.position.y = 0.232;
      neckJoint.add(capBand);

      const topButton = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), visorMat);
      topButton.position.set(0, 0.398, -0.01);
      neckJoint.add(topButton);

      const curvedVisor = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.165,
          0.165,
          0.014,
          18,
          1,
          false,
          -Math.PI * 0.34,
          Math.PI * 0.68
        ),
        visorMat
      );
      curvedVisor.scale.set(1.0, 1.0, 1.32);
      curvedVisor.rotation.x = 0.14;
      curvedVisor.position.set(0, 0.242, 0.065);
      neckJoint.add(curvedVisor);
    };

    // Pack-Specific & Seed-Specific Full 3D Headgear & Hairstyles
    if (skinPackId === 'miata-track-club') {
      // Every Miata Pit-Crew member wears a Full 3D Racing Cap (Red/Navy/British Green + Gold/White Visor)
      const capColor = new THREE.Color(shirtColor).getHex();
      addFull3DCap(capColor, 0xfefce8);
    } else if (skinPackId === 'vinyl-jazz-collectors') {
      // Full 3D Classic Jazz Fedora Hat + Gold-Rimmed Jazz Glasses
      const fedoraMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.65 });
      const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
      const fedoraBrim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.245, 0.245, 0.012, 24),
        fedoraMat
      );
      fedoraBrim.position.set(0, 0.255, 0.01);
      fedoraBrim.rotation.x = -0.06;
      neckJoint.add(fedoraBrim);

      const fedoraCrown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.135, 0.162, 0.125, 20),
        fedoraMat
      );
      fedoraCrown.position.set(0, 0.32, 0);
      fedoraCrown.rotation.x = -0.06;
      neckJoint.add(fedoraCrown);

      const fedoraRibbon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.158, 0.163, 0.025, 20),
        ribbonMat
      );
      fedoraRibbon.position.set(0, 0.272, 0.004);
      fedoraRibbon.rotation.x = -0.06;
      neckJoint.add(fedoraRibbon);

      const jazzGlassesMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        metalness: 0.9,
        roughness: 0.15,
      });
      [-0.054, 0.054].forEach((gx) => {
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(0.032, 0.004, 8, 16),
          jazzGlassesMat
        );
        rim.position.set(gx, 0.206, 0.164);
        neckJoint.add(rim);
      });
    } else if (skinPackId === 'botanical-artists') {
      // Full 3D French Painter Beret + Side Locks
      const beretMat = new THREE.MeshStandardMaterial({
        color: seed % 2 === 0 ? 0x991b1b : 0x15803d,
        roughness: 0.78,
      });
      const beretBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.164, 0.164, 0.028, 20),
        beretMat
      );
      beretBand.position.set(0, 0.25, 0);
      neckJoint.add(beretBand);

      const beretDisc = new THREE.Mesh(new THREE.SphereGeometry(0.195, 18, 12), beretMat);
      beretDisc.scale.set(1.08, 0.36, 1.05);
      beretDisc.position.set(0.028, 0.295, -0.01);
      beretDisc.rotation.z = -0.18;
      neckJoint.add(beretDisc);

      const beretStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.032, 8),
        beretMat
      );
      beretStem.position.set(0.035, 0.36, -0.01);
      beretStem.rotation.z = -0.18;
      neckJoint.add(beretStem);
    } else if (skinPackId === 'cyber-neon-night') {
      // Glowing Translucent Cyber LED Visor across the eyes + Spiky/Bun Tech Hair
      const visorGlowMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(shirtColor),
        emissive: new THREE.Color(shirtColor),
        emissiveIntensity: 1.6,
        transparent: true,
        opacity: 0.85,
        roughness: 0.1,
      });
      const cyberVisor = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.172,
          0.172,
          0.048,
          20,
          1,
          true,
          -Math.PI * 0.32,
          Math.PI * 0.64
        ),
        visorGlowMat
      );
      cyberVisor.position.set(0, 0.208, 0.012);
      neckJoint.add(cyberVisor);

      const topBun = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 14), hairMat);
      topBun.position.set(0, 0.38, -0.05);
      neckJoint.add(topBun);
    } else if (skinPackId === 'tokyo-streetwear' && seed % 2 === 0) {
      // Full 3D Harajuku Streetwear Bucket Hat
      const bucketMat = new THREE.MeshStandardMaterial({
        color: 0xf5f5f4,
        roughness: 0.72,
      });
      const bucketCrown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.148, 0.168, 0.11, 20),
        bucketMat
      );
      bucketCrown.position.set(0, 0.31, 0);
      neckJoint.add(bucketCrown);

      const bucketBrim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.168, 0.225, 0.042, 22, 1, true),
        bucketMat
      );
      bucketBrim.position.set(0, 0.248, 0);
      neckJoint.add(bucketBrim);
    } else {
      // 6 Diverse Hairstyle & Full 3D Hat Variants
      const styleVariant = seed % 6;
      if (styleVariant === 0) {
        const topBun = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 14), hairMat);
        topBun.position.set(0, 0.38, -0.05);
        neckJoint.add(topBun);
      } else if (styleVariant === 1) {
        // Full 3D Knit Beanie with Ribbed Dome, Thick Folded Cuff & Fluffy Top Pom-Pom
        const beanieMat = new THREE.MeshStandardMaterial({
          color: 0xd97706,
          roughness: 0.85,
        });
        const beanieDome = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
          beanieMat
        );
        beanieDome.position.y = 0.225;
        neckJoint.add(beanieDome);
        const beanieCuff = new THREE.Mesh(
          new THREE.TorusGeometry(0.166, 0.026, 10, 22),
          beanieMat
        );
        beanieCuff.rotation.x = Math.PI / 2 - 0.08;
        beanieCuff.position.y = 0.252;
        neckJoint.add(beanieCuff);
        const pomPom = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), beanieMat);
        pomPom.position.set(0, 0.41, -0.01);
        neckJoint.add(pomPom);
      } else if (styleVariant === 2) {
        [-0.145, 0.145].forEach((sx) => {
          const lock = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.025, 0.18, 10),
            hairMat
          );
          lock.position.set(sx, 0.16, 0.01);
          neckJoint.add(lock);
        });
        const glassesMat = new THREE.MeshStandardMaterial({
          color: 0xd97706,
          metalness: 0.85,
          roughness: 0.2,
        });
        [-0.054, 0.054].forEach((gx) => {
          const rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.032, 0.004, 8, 16),
            glassesMat
          );
          rim.position.set(gx, 0.206, 0.164);
          neckJoint.add(rim);
        });
      } else if (styleVariant === 3) {
        // Curly Volumetric Afro (kept behind z = -0.01 so forehead & eyes are 100% unobstructed)
        [
          [0, 0.34, -0.02],
          [-0.115, 0.29, -0.01],
          [0.115, 0.29, -0.01],
          [0, 0.27, -0.12],
        ].forEach(([ax, ay, az]) => {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.092, 12, 12), hairMat);
          puff.position.set(ax, ay, az);
          neckJoint.add(puff);
        });
      } else if (styleVariant === 4) {
        const pony = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.22, 12), hairMat);
        pony.position.set(0, 0.2, -0.2);
        pony.rotation.x = -0.65;
        neckJoint.add(pony);
      } else {
        // Full 3D Baseball Cap (Crown Dome + Band + Top Button + Curved Visor)
        addFull3DCap(0x1e3a8a, 0x172554);
      }
    }

    const sleeveMat =
      skinPackId === 'tokyo-streetwear'
        ? new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.55 })
        : jacketMat;

    const buildArm = (sideX: number) => {
      const shoulderJoint = new THREE.Group();
      shoulderJoint.position.set(sideX, 0.44, 0);

      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.044, 0.23, 12),
        sleeveMat
      );
      upperArm.position.y = -0.115;
      upperArm.castShadow = true;
      shoulderJoint.add(upperArm);

      if (skinPackId === 'cyber-neon-night') {
        const sleeveTrim = new THREE.Mesh(
          new THREE.TorusGeometry(0.046, 0.007, 8, 16),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(shirtColor),
            emissive: new THREE.Color(shirtColor),
            emissiveIntensity: 1.4,
            roughness: 0.2,
          })
        );
        sleeveTrim.rotation.x = Math.PI / 2;
        sleeveTrim.position.y = -0.222;
        shoulderJoint.add(sleeveTrim);
      }

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

    // 3D Wristwatch on Left Forearm (for checking time while waiting in queue)
    const watchBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.022, 12),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 })
    );
    watchBand.position.y = -0.18;
    leftArm.elbowJoint.add(watchBand);

    // 3D Smartphone in Left Hand (Used in SELFIE_MODE, CAR_SELFIE & Queue Waiting)
    const phoneMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.11, 0.01),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.75,
        roughness: 0.2,
      })
    );
    phoneMesh.position.set(0, -0.25, 0.04);
    phoneMesh.rotation.x = Math.PI / 3;
    phoneMesh.visible = false;
    leftArm.elbowJoint.add(phoneMesh);

    // Held Porcelain Cup in Right Hand
    const heldCup = this.createPorcelainCupMesh(0.75, true, false);
    heldCup.position.set(0, -0.24, 0.06);
    heldCup.rotation.x = Math.PI / 2;
    heldCup.visible = false;
    rightArm.elbowJoint.add(heldCup);

    // Overhead Social Activity Badge Sprite (Offline Vector Canvas Icon)
    const actCanvas = document.createElement('canvas');
    actCanvas.width = 128;
    actCanvas.height = 64;
    const activityTexture = new THREE.CanvasTexture(actCanvas);
    activityTexture.colorSpace = THREE.SRGBColorSpace;
    const activitySprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: activityTexture, transparent: true })
    );
    activitySprite.scale.set(0.32, 0.16, 1);
    activitySprite.position.set(0, 1.72, 0);
    activitySprite.visible = false;
    group.add(activitySprite);

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
      phoneMesh,
      activitySprite,
      activityTexture,
      lastActivityLabel: '',
      seed,
      appliedSkinPack: skinPackId,
      appliedShirtColor: shirtColor,
    };
  }

  private syncCustomerActors() {
    const activeIds = new Set(this.gameState.customers.map((c) => c.id));
    const activePackId: CustomerSkinPackId =
      this.gameState.activeCustomerSkinPack || 'casual-garden';

    for (const [id, actor] of this.customerActors.entries()) {
      if (!activeIds.has(id)) {
        this.customersRoot.remove(actor.group);
        actor.activityTexture.dispose();
        this.customerActors.delete(id);
      }
    }

    this.gameState.customers.forEach((cust, idx) => {
      let actor = this.customerActors.get(cust.id);

      // Rebuild existing customer actor in-place if the Customer Skin Pack or shirtColor changed!
      if (
        actor &&
        (actor.appliedSkinPack !== activePackId || actor.appliedShirtColor !== cust.shirtColor)
      ) {
        const preservedPos = actor.currentPos.clone();
        const preservedRotY = actor.group.rotation.y;
        const preservedSeed = actor.seed;
        const preservedWaypoints = actor.waypoints.map((w) => w.clone());
        const preservedGoalKey = actor.finalGoalKey;
        const preservedWalkPhase = actor.walkPhase;
        const preservedWalkBlend = actor.walkBlend;
        const preservedSeatedBlend = actor.seatedBlend;
        const preservedFacing = actor.facingAngle;
        this.customersRoot.remove(actor.group);
        actor.activityTexture.dispose();

        const rebuilt = this.createCustomerCharacter(
          preservedSeed,
          cust.avatarColor,
          cust.shirtColor,
          activePackId
        );
        rebuilt.group.position.copy(preservedPos);
        rebuilt.group.rotation.y = preservedRotY;
        this.customersRoot.add(rebuilt.group);
        actor = {
          ...rebuilt,
          currentPos: preservedPos,
          lastPos: preservedPos.clone(),
          waypoints: preservedWaypoints,
          finalGoalKey: preservedGoalKey,
          walkPhase: preservedWalkPhase,
          walkBlend: preservedWalkBlend,
          seatedBlend: preservedSeatedBlend,
          facingAngle: preservedFacing,
        };
        this.customerActors.set(cust.id, actor);
      }

      if (!actor) {
        const seed =
          cust.customerName.charCodeAt(0) + cust.customerName.length * 7 + idx * 13;
        const built = this.createCustomerCharacter(
          seed,
          cust.avatarColor,
          cust.shirtColor,
          activePackId
        );
        // Spawn arriving customers at the center-right glass garage entrance (clear of Miata & tables!)
        const startPos = new THREE.Vector3(1.35, 0, -5.8);
        built.group.position.copy(startPos);
        this.customersRoot.add(built.group);
        actor = {
          ...built,
          currentPos: startPos.clone(),
          lastPos: startPos.clone(),
          waypoints: [],
          finalGoalKey: '',
          walkPhase: seed * 0.7,
          walkBlend: 0,
          seatedBlend: 0,
          facingAngle: 0,
        };
        this.customerActors.set(cust.id, actor);
      }

      if (cust.state === 'ordering') {
        actor.heldCup.visible = false;
        actor.activitySprite.visible = false;
      } else {
        const isPickingUpStage1 =
          this.stepAnim?.type === 'serve_drink' &&
          this.stepAnim.servedCustomerId === cust.id &&
          this.stepAnim.progress < 0.55;
        actor.heldCup.visible = !isPickingUpStage1;
      }
    });
  }

  public triggerStepAnimation(
    type: StepAnimType,
    flavor?: SyrupFlavor,
    badgeText?: string
  ) {
    const durations: Record<StepAnimType, number> = {
      grind: 1.25,
      tamp: 1.15,
      pull_espresso: 1.5,
      steep_tea: 1.35,
      steam_milk: 1.55,
      add_ice: 1.15,
      add_syrup: 1.2,
      rinse_cup: 0.75,
      serve_drink: 1.5,
    };

    let servedCustomerId: string | undefined;
    if (type === 'serve_drink') {
      const seatedList = this.gameState.customers.filter((c) => c.state === 'seated');
      const newestSeated = seatedList[seatedList.length - 1] || this.gameState.customers[0];
      servedCustomerId = newestSeated?.id;
      this.activePickupCustomerId = servedCustomerId || null;
      this.serveReachTimer = 1.5;
    }

    this.stepAnim = {
      type,
      progress: 0,
      duration: durations[type] || 1.2,
      flavor,
      badgeText,
      servedCustomerId,
    };

    if (type === 'steam_milk') {
      this.drawFloatingBadgeText('65°C MICROFOAM', '#10b981');
    } else if (type === 'steep_tea') {
      this.drawFloatingBadgeText('80°C TEA INFUSION', '#84cc16');
    } else if (type === 'tamp') {
      this.drawFloatingBadgeText('30 LBS TAMP', '#10b981');
    } else if (type === 'pull_espresso') {
      this.drawFloatingBadgeText('9.0 BAR · 27.4s', '#f59e0b');
    } else if (type === 'serve_drink') {
      this.drawFloatingBadgeText(badgeText || '+$8 SERVED!', '#10b981');
    }
  }

  public updateGameState(newState: KlasikGameState) {
    const prevWeather = this.gameState.weather;
    const prevQuality = this.gameState.graphicsQuality;
    this.gameState = newState;

    if (prevQuality !== newState.graphicsQuality) {
      this.updateGraphicsQuality();
    }
    if (prevWeather !== newState.weather) {
      this.applyWeatherLighting(newState.weather);
    }
    this.updateDecorMaterials();
    this.updateActiveCupVisuals();
    this.redrawOrderTicketTextures();
    this.syncCustomerActors();
  }

  public updateSpotifyState(newSpotify: SpotifyVinylState) {
    this.spotifyState = newSpotify;
    this.redrawVinylLabelTexture();
  }

  private applyWeatherLighting(weather: WeatherMode) {
    if (weather === 'morning') {
      this.scene.background = new THREE.Color(0xc4dde8);
      this.scene.fog = new THREE.FogExp2(0xd2e4ec, 0.014);
      this.sunLight.color.setHex(0xfff4d6);
      this.sunLight.intensity = 2.45;
      this.hemiLight.color.setHex(0xdbeafe);
      this.hemiLight.groundColor.setHex(0x5c4033);
      this.hemiLight.intensity = 1.05;
      this.rainDropsInstanced.visible = false;
      if (this.glassRainStreaksGroup) this.glassRainStreaksGroup.visible = false;
      if (this.skylightPaneMat) {
        this.skylightPaneMat.color.setHex(0xfffaf0);
        this.skylightPaneMat.emissive.setHex(0xffe4b5);
        this.skylightPaneMat.emissiveIntensity = 0.78;
      }
      if (this.garageGlassMat) {
        this.garageGlassMat.color.setHex(0xdbeafe);
        this.garageGlassMat.opacity = 0.18;
      }
      this.pendantBulbMats.forEach((m) => {
        m.emissive.setHex(0xfde68a);
        m.emissiveIntensity = 1.65;
      });
    } else if (weather === 'golden') {
      this.scene.background = new THREE.Color(0xc47341);
      this.scene.fog = new THREE.FogExp2(0xa85d32, 0.018);
      this.sunLight.color.setHex(0xfb923c);
      this.sunLight.intensity = 2.6;
      this.hemiLight.color.setHex(0xfed7aa);
      this.hemiLight.groundColor.setHex(0x3a1c10);
      this.hemiLight.intensity = 0.92;
      this.rainDropsInstanced.visible = false;
      if (this.glassRainStreaksGroup) this.glassRainStreaksGroup.visible = false;
      if (this.skylightPaneMat) {
        this.skylightPaneMat.color.setHex(0xffedd5);
        this.skylightPaneMat.emissive.setHex(0xf59e0b);
        this.skylightPaneMat.emissiveIntensity = 0.88;
      }
      if (this.garageGlassMat) {
        this.garageGlassMat.color.setHex(0xfed7aa);
        this.garageGlassMat.opacity = 0.22;
      }
      this.pendantBulbMats.forEach((m) => {
        m.emissive.setHex(0xfbbf24);
        m.emissiveIntensity = 2.25;
      });
    } else {
      this.scene.background = new THREE.Color(0x1e293b);
      this.scene.fog = new THREE.FogExp2(0x1e293b, 0.026);
      this.sunLight.color.setHex(0x7dd3fc);
      this.sunLight.intensity = 0.95;
      this.hemiLight.color.setHex(0x60a5fa);
      this.hemiLight.groundColor.setHex(0x1e1b4b);
      this.hemiLight.intensity = 0.68;
      this.rainDropsInstanced.visible = true;
      if (this.glassRainStreaksGroup) this.glassRainStreaksGroup.visible = true;
      if (this.skylightPaneMat) {
        this.skylightPaneMat.color.setHex(0x94a3b8);
        this.skylightPaneMat.emissive.setHex(0x38bdf8);
        this.skylightPaneMat.emissiveIntensity = 0.45;
      }
      if (this.garageGlassMat) {
        this.garageGlassMat.color.setHex(0x93c5fd);
        this.garageGlassMat.opacity = 0.30;
      }
      this.pendantBulbMats.forEach((m) => {
        m.emissive.setHex(0xfde68a);
        m.emissiveIntensity = 2.65;
      });
    }
  }

  private updateDecorMaterials() {
    const { counterWood, mugColor, neonSignColor, plantDensity } = this.gameState.decor;

    if (counterWood === 'walnut') {
      this.counterWoodMat.color.setHex(0x4a2c18);
    } else if (counterWood === 'white-oak') {
      this.counterWoodMat.color.setHex(0xa67c52);
    } else if (counterWood === 'cherry-mahogany') {
      this.counterWoodMat.color.setHex(0x6b2114);
    } else if (counterWood === 'bamboo-zen') {
      this.counterWoodMat.color.setHex(0xc4a46b);
    } else {
      this.counterWoodMat.color.setHex(0x27272a);
    }

    if (mugColor === 'cream') {
      this.ceramicMugMat.color.setHex(0xf8f5f0);
      this.ceramicMugMat.metalness = 0.05;
    } else if (mugColor === 'matte-black') {
      this.ceramicMugMat.color.setHex(0x3f3f46);
      this.ceramicMugMat.metalness = 0.1;
    } else if (mugColor === 'sage-green') {
      this.ceramicMugMat.color.setHex(0xbbf7d0);
      this.ceramicMugMat.metalness = 0.05;
    } else if (mugColor === 'royal-gold') {
      this.ceramicMugMat.color.setHex(0xfbbf24);
      this.ceramicMugMat.metalness = 0.75;
    } else if (mugColor === 'sakura-pink') {
      this.ceramicMugMat.color.setHex(0xfbcfe8);
      this.ceramicMugMat.metalness = 0.05;
    } else {
      this.ceramicMugMat.color.setHex(0xfdba74);
      this.ceramicMugMat.metalness = 0.05;
    }

    let neonHex = 0xf59e0b;
    let neonCss = '#f59e0b';
    if (neonSignColor === 'amber') {
      neonHex = 0xf59e0b;
      neonCss = '#f59e0b';
    } else if (neonSignColor === 'emerald') {
      neonHex = 0x10b981;
      neonCss = '#10b981';
    } else if (neonSignColor === 'cyber-cyan') {
      neonHex = 0x06b6d4;
      neonCss = '#06b6d4';
    } else if (neonSignColor === 'violet-dream') {
      neonHex = 0xa855f7;
      neonCss = '#a855f7';
    } else {
      neonHex = 0xf43f5e;
      neonCss = '#f43f5e';
    }
    this.neonTubeMat.color.setHex(neonHex);
    this.neonTubeMat.emissive.setHex(neonHex);
    if (this.underCounterNeonMat) {
      this.underCounterNeonMat.color.setHex(neonHex);
      this.underCounterNeonMat.emissive.setHex(neonHex);
    }
    this.neonSignLight.color.setHex(neonHex);
    if (this.hangingSignFaceMat) {
      this.hangingSignFaceMat.emissive.setHex(neonHex);
    }
    if (this.lastNeonSignColor !== neonSignColor) {
      this.lastNeonSignColor = neonSignColor;
      this.redrawHangingSignTexture(neonCss);
    }

    // Apply Equipped Espresso Machine Skin (isolated exclusively to Espresso Machine)
    if (this.espressoChassisMat) {
      const mSkin = this.gameState.equippedMachineSkin || 'classic-steel';
      if (mSkin === 'golden-espresso-machine') {
        this.espressoChassisMat.color.setHex(0xfbbf24);
        this.espressoChassisMat.metalness = 0.96;
        this.espressoChassisMat.roughness = 0.14;
      } else if (mSkin === 'matte-obsidian') {
        this.espressoChassisMat.color.setHex(0x1f2937);
        this.espressoChassisMat.metalness = 0.65;
        this.espressoChassisMat.roughness = 0.35;
      } else if (mSkin === 'vintage-copper') {
        this.espressoChassisMat.color.setHex(0xd97706);
        this.espressoChassisMat.metalness = 0.92;
        this.espressoChassisMat.roughness = 0.18;
      } else {
        this.espressoChassisMat.color.setHex(0xe5e7eb);
        this.espressoChassisMat.metalness = 0.88;
        this.espressoChassisMat.roughness = 0.2;
      }
    }

    if (this.grinderBodyMat) {
      const gSkin = this.gameState.equippedGrinderSkin || 'matte-black';
      if (gSkin === 'cyber-chrome') {
        this.grinderBodyMat.color.setHex(0xf8fafc);
        this.grinderBodyMat.metalness = 0.95;
        this.grinderBodyMat.roughness = 0.12;
      } else if (gSkin === 'heritage-brass') {
        this.grinderBodyMat.color.setHex(0xfbbf24);
        this.grinderBodyMat.metalness = 0.92;
        this.grinderBodyMat.roughness = 0.18;
      } else {
        this.grinderBodyMat.color.setHex(0x18181b);
        this.grinderBodyMat.metalness = 0.45;
        this.grinderBodyMat.roughness = 0.45;
      }
    }

    if (this.pitcherBodyMat) {
      const pSkin = this.gameState.equippedPitcherSkin || 'stainless-steel';
      if (pSkin === 'rose-gold') {
        this.pitcherBodyMat.color.setHex(0xf472b6);
        this.pitcherBodyMat.metalness = 0.92;
        this.pitcherBodyMat.roughness = 0.15;
      } else if (pSkin === 'titanium-pearl') {
        this.pitcherBodyMat.color.setHex(0x38bdf8);
        this.pitcherBodyMat.metalness = 0.94;
        this.pitcherBodyMat.roughness = 0.12;
      } else {
        this.pitcherBodyMat.color.setHex(0xe2e8f0);
        this.pitcherBodyMat.metalness = 0.92;
        this.pitcherBodyMat.roughness = 0.15;
      }
    }

    // Sync 3D Shop Upgrade Props Visibility
    const hasUpgrade = (id: string) =>
      this.gameState.upgrades.some((u) => u.id === id && u.purchased);
    if (this.upgradeTubePreampGroup) {
      this.upgradeTubePreampGroup.visible = hasUpgrade('audiophile-tube-preamp');
    }
    if (this.upgradeKlipschSpeakersGroup) {
      this.upgradeKlipschSpeakersGroup.visible = hasUpgrade('klipschorn-corner-speakers');
    }
    if (this.upgradeBonsaiTerrariumGroup) {
      this.upgradeBonsaiTerrariumGroup.visible = hasUpgrade('japanese-bonsai-terrarium');
    }
    if (this.upgradeGeishaVaultGroup) {
      this.upgradeGeishaVaultGroup.visible = hasUpgrade('ethiopian-geisha-bean-vault');
    }
    if (this.upgradeMiataStageGroup) {
      this.upgradeMiataStageGroup.visible = hasUpgrade('miata-pop-up-concours-stage');
    }
    if (this.upgradeGuildCharterGroup) {
      this.upgradeGuildCharterGroup.visible = hasUpgrade('tokyo-roastery-guild-charter');
    }

    const isLush = plantDensity === 'lush-jungle';
    const isLow = this.isSoftwareGl || this.gameState.graphicsQuality === 'low';
    this.monsteraLeavesInstanced.count = isLow ? (isLush ? 16 : 10) : isLush ? 36 : 18;
    this.botanicalPlanterExtras.forEach((obj) => {
      obj.visible = isLush;
    });
  }

  // Updates Coffee Grounds, Tamped Puck visibility, and Cup Progression State Machine target
  private updateActiveCupVisuals() {
    const cup = this.gameState.currentCup;
    const hasAnyLiquid =
      cup.hasEspresso ||
      cup.hasSteepedTea ||
      cup.hasSteamedMilk ||
      cup.syrup !== 'none';

    this.fluffyGroundsMesh.visible = cup.hasGrounds && !cup.isTamped;
    this.tampedPuckMesh.visible = cup.isTamped || cup.hasEspresso;

    this.activeCupIceGroup.visible = cup.hasIce;

    this.activeCupDrizzleRing.visible = cup.syrup !== 'none';
    if (cup.syrup !== 'none') {
      const dMat = this.activeCupDrizzleRing.material as THREE.MeshStandardMaterial;
      if (cup.syrup === 'vanilla') dMat.color.setHex(0xfde68a);
      else if (cup.syrup === 'caramel') dMat.color.setHex(0xd97706);
      else if (cup.syrup === 'chocolate') dMat.color.setHex(0x451a03);
      else if (cup.syrup === 'matcha') dMat.color.setHex(0x65a30d);
    }

    const isStageB =
      cup.hasEspresso ||
      cup.hasSteepedTea ||
      cup.hasSteamedMilk ||
      cup.hasIce ||
      cup.syrup !== 'none' ||
      this.gameState.activeStation === 3;

    if (this.gameState.activeStation === 4 && hasAnyLiquid) {
      this.cupTargetPos.set(-1.32, 1.03, 0.34);
    } else if (isStageB) {
      this.cupTargetPos.set(0.78, 1.01, 0.38);
    } else {
      this.cupTargetPos.set(-0.16, 1.055, 0.30);
    }

    this.ghostCupMesh.visible = hasAnyLiquid && this.gameState.phase === 'playing';
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

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
      if (e.pointerType !== 'mouse') {
        this.hoveredToolKey = null;
        this.callbacks.onHoverToolChange(null);
      }
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

      // Never trigger persistent hover tooltips on touchscreens
      if (e.pointerType !== 'mouse') {
        return;
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

      if (e.pointerType !== 'mouse') {
        this.hoveredToolKey = null;
        this.callbacks.onHoverToolChange(null);
      }

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

    window.addEventListener('resize', this.scheduleDebouncedResize);
    window.addEventListener('orientationchange', this.scheduleDebouncedResize);
    window.visualViewport?.addEventListener('resize', this.scheduleDebouncedResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleDebouncedResize());
      this.resizeObserver.observe(this.container);
    }
  }

  public resetCameraOffsets() {
    this.manualCameraYawOffset = 0;
    this.manualCameraZoomOffset = 0;
  }

  private scheduleDebouncedResize = () => {
    if (this.isDisposed) return;
    if (this.resizeDebounceTimer !== null) {
      window.clearTimeout(this.resizeDebounceTimer);
    }
    this.resizeDebounceTimer = window.setTimeout(() => {
      this.resizeDebounceTimer = null;
      this.handleResize();
    }, 120);
  };

  private handleResize = () => {
    if (this.isDisposed) return;
    const { width, height } = this.getEffectiveLandscapeDimensions();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
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
      const dt = Math.min(rawDt, 0.12);
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

  // Smoothly lerps Custom ShaderMaterial Liquid height, base color, crema color & milk ratio
  private updateDynamicCupShaderLiquid(dt: number) {
    const cup = this.gameState.currentCup;
    const damp = 1 - Math.exp(-12.0 * dt);

    let targetFill = 0.0;
    if (cup.hasSteamedMilk) targetFill = 0.96;
    else if (cup.hasEspresso || cup.hasSteepedTea) targetFill = 0.62;
    else if (cup.syrup !== 'none') targetFill = 0.28;

    // During active serve_drink Stage 1, keep the cup looking full on the Pickup Coaster!
    if (this.stepAnim?.type === 'serve_drink' && this.stepAnim.progress < 0.65) {
      targetFill = 0.96;
    } else if (this.stepAnim?.type === 'pull_espresso' || this.stepAnim?.type === 'steep_tea') {
      targetFill = Math.max(targetFill, Math.min(0.62, this.stepAnim.progress * 0.68));
    } else if (this.stepAnim?.type === 'steam_milk' && this.stepAnim.progress > 0.45) {
      const pourP = (this.stepAnim.progress - 0.45) / 0.55;
      targetFill = Math.max(targetFill, 0.54 + pourP * 0.42);
    }

    this.currentLiquidFill = THREE.MathUtils.lerp(this.currentLiquidFill, targetFill, damp);
    const targetMilk =
      cup.hasSteamedMilk ||
      (this.stepAnim?.type === 'steam_milk' && this.stepAnim.progress > 0.48) ||
      (this.stepAnim?.type === 'serve_drink' && this.stepAnim.progress < 0.65)
        ? 1.0
        : 0.0;
    this.currentLiquidMilk = THREE.MathUtils.lerp(this.currentLiquidMilk, targetMilk, damp);

    if (cup.syrup === 'matcha') {
      _targetColor.setHex(0x4d7c0f);
      _targetCremaColor.setHex(0x84cc16);
    } else if (cup.hasSteepedTea && !cup.hasEspresso) {
      _targetColor.setHex(cup.hasSteamedMilk ? 0xd6bcfa : 0x84cc16);
      _targetCremaColor.setHex(0xd9f99d);
    } else if (cup.syrup === 'chocolate') {
      _targetColor.setHex(0x5c3317);
      _targetCremaColor.setHex(0xd99b66);
    } else if (cup.syrup === 'caramel') {
      _targetColor.setHex(0xb4692c);
      _targetCremaColor.setHex(0xfbbf24);
    } else if (cup.syrup === 'vanilla') {
      _targetColor.setHex(0xd9a773);
      _targetCremaColor.setHex(0xfffbeb);
    } else if (cup.hasSteamedMilk) {
      _targetColor.setHex(0xc68b59);
      _targetCremaColor.setHex(0xfef3c7);
    } else {
      _targetColor.setHex(0x3b1d0e);
      _targetCremaColor.setHex(0xd98a3c);
    }

    this.currentLiquidColor.lerp(_targetColor, damp);
    this.currentLiquidCremaHelper(damp);
  }

  private currentLiquidCremaHelper(damp: number) {
    this.currentCremaColor.lerp(_targetCremaColor, damp);

    this.cupLiquidShaderMat.uniforms.uFillLevel.value = this.currentLiquidFill;
    this.cupLiquidShaderMat.uniforms.uBaseColor.value.copy(this.currentLiquidColor);
    this.cupLiquidShaderMat.uniforms.uCremaColor.value.copy(this.currentCremaColor);
    this.cupLiquidShaderMat.uniforms.uHasMilk.value = this.currentLiquidMilk;
    this.cupLiquidShaderMat.uniforms.uTime.value = this.elapsed;

    if (this.currentLiquidFill > 0.02) {
      this.activeCupLiquidMesh.visible = true;
      const scaleY = Math.max(0.08, this.currentLiquidFill);
      this.activeCupLiquidMesh.scale.set(0.86 + scaleY * 0.14, scaleY, 0.86 + scaleY * 0.14);
      this.activeCupLiquidMesh.position.y = 0.026 + 0.056 * scaleY;
    } else {
      this.activeCupLiquidMesh.visible = false;
    }
  }

  // Fluid Multi-Phase Bezier Step Choreography across the Barista Counter
  private updateBaristaStepChoreography(dt: number) {
    const damp = 1 - Math.exp(-16.0 * dt);

    // Reset default rest transforms
    this.grinderGroup.position.set(-0.78, 1.0, 0.22);
    this.groundStreamGroup.visible = false;
    this.tampPressureRingMesh.visible = false;
    this.espressoStreamsGroup.visible = false;
    this.milkPourStreamMesh.visible = false;
    this.teaPourStreamMesh.visible = false;
    this.syrupRibbonMesh.visible = false;
    this.floatingBadgeSprite.visible = false;
    this.pickupSpeechSprite.visible = false;
    this.bellRippleRingMesh.visible = false;

    this.tamperMeshGroup.position.set(-0.075, 0.02, -0.02);
    this.tamperMeshGroup.rotation.set(0, 0, 0);

    this.milkPitcherGroup.position.set(0.56, 1.0, 0.36);
    this.milkPitcherGroup.rotation.set(0, 0, 0);
    this.teaPotGroup.position.set(0.78, 1.0, 0.14);
    this.teaPotGroup.rotation.set(0, 0, 0);
    this.steamWandPivot.rotation.set(0, 0, 0);
    this.iceScoopGroup.position.set(0.02, 0.065, 0.01);
    this.iceScoopGroup.rotation.set(0, 0, 0);
    this.matchaWhiskGroup.position.set(0, 0.095, 0);
    this.matchaWhiskGroup.rotation.set(0, 0, 0);

    for (const pump of this.syrupPumpHeads.values()) {
      pump.position.y = 0.27;
    }

    const cup = this.gameState.currentCup;
    if (cup.hasEspresso) {
      this.portafilterGroup.position.set(-0.16, 1.26, 0.32);
      this.portafilterGroup.rotation.set(0, 0, 0);
    } else {
      this.portafilterGroup.position.set(-0.43, 1.05, 0.37);
      this.portafilterGroup.rotation.set(0, 0, 0);
    }

    this.cupCurrentPos.lerp(this.cupTargetPos, damp);
    this.activeBaristaCupGroup.position.copy(this.cupCurrentPos);
    this.activeBaristaCupGroup.visible = true;

    this.gaugeNeedles.forEach((n) => {
      n.rotation.z = cup.hasEspresso ? -0.65 : 0.8;
    });
    this.groupHeadLedMat.emissiveIntensity = 0.4;

    if (this.activeCupIceGroup.visible) {
      this.activeCupIceGroup.children.forEach((cube, idx) => {
        cube.position.y = 0.132 + Math.sin(this.elapsed * 3.8 + idx) * 0.004;
      });
    }

    if (this.serveReachTimer > 0) {
      this.serveReachTimer = Math.max(0, this.serveReachTimer - dt);
      this.heartParticlesGroup.visible = true;
      const hp = 1 - this.serveReachTimer / 1.5;
      this.heartParticlesGroup.position.set(-1.35, 1.75 + hp * 0.42, -0.55);
      this.heartParticlesGroup.rotation.y = this.elapsed * 2.5;
    } else {
      this.heartParticlesGroup.visible = false;
      this.activePickupCustomerId = null;
    }

    if (!this.stepAnim) return;

    this.stepAnim.progress += dt / this.stepAnim.duration;
    if (this.stepAnim.progress >= 1) {
      this.stepAnim = null;
      return;
    }

    const p = this.stepAnim.progress;
    const smoothP = easeInOutCubic(p);

    if (this.stepAnim.type === 'grind') {
      if (p < 0.72) {
        const sub = easeInOutCubic(Math.min(1, p / 0.22));
        this.portafilterGroup.position.set(
          evalQuadBezier(-0.43, -0.62, -0.78, sub),
          evalQuadBezier(1.05, 1.19, 1.15, sub),
          evalQuadBezier(0.37, 0.36, 0.35, sub)
        );
        this.grinderGroup.position.x = -0.78 + Math.sin(this.elapsed * 55) * 0.004;
        this.hopperBeansGroup.rotation.y += dt * 9.5;
        this.groundStreamGroup.visible = p > 0.15;
        this.groundStreamGroup.children.forEach((speck, i) => {
          speck.position.y = -(((p * 6 + i * 0.1) % 1) * 0.08);
        });
        this.fluffyGroundsMesh.visible = true;
        this.fluffyGroundsMesh.scale.setScalar(Math.max(0.15, (p - 0.1) / 0.62));
      } else {
        const back = easeInOutCubic((p - 0.72) / 0.28);
        this.fluffyGroundsMesh.scale.setScalar(1);
        this.portafilterGroup.position.set(
          evalQuadBezier(-0.78, -0.6, -0.43, back),
          evalQuadBezier(1.15, 1.22, 1.05, back),
          evalQuadBezier(0.35, 0.38, 0.37, back)
        );
      }
    } else if (this.stepAnim.type === 'tamp') {
      const arc = Math.sin(p * Math.PI);
      const press = p > 0.28 && p < 0.76 ? Math.sin(((p - 0.28) / 0.48) * Math.PI) : 0;
      this.tamperMeshGroup.position.set(
        evalQuadBezier(-0.075, 0.02, 0.05, Math.min(1, arc * 1.35)),
        0.02 + arc * 0.13 - press * 0.058,
        evalQuadBezier(-0.02, 0.01, 0.01, Math.min(1, arc * 1.35))
      );
      if (p > 0.32 && p < 0.86) {
        this.tampPressureRingMesh.visible = true;
        const ringScale = 0.85 + ((p - 0.32) / 0.54) * 0.55;
        this.tampPressureRingMesh.scale.setScalar(ringScale);
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(-0.43, 1.32 + p * 0.06, 0.37);
      }
      if (p > 0.38) {
        this.fluffyGroundsMesh.visible = false;
        this.tampedPuckMesh.visible = true;
      }
    } else if (this.stepAnim.type === 'pull_espresso') {
      // Phase 1 (0..0.24): Portafilter lifts along a quadratic curve from tamping mat (-0.43) into grouphead (-0.16) and twists 45 deg
      if (p < 0.24) {
        const lockT = easeInOutCubic(p / 0.24);
        this.portafilterGroup.position.set(
          evalQuadBezier(-0.43, -0.28, -0.16, lockT),
          evalQuadBezier(1.05, 1.28, 1.26, lockT),
          evalQuadBezier(0.37, 0.36, 0.32, lockT)
        );
        this.portafilterGroup.rotation.y = THREE.MathUtils.lerp(-0.78, 0, lockT);
      } else {
        this.portafilterGroup.position.set(-0.16, 1.26, 0.32);
        this.portafilterGroup.rotation.y = 0;
      }
      this.tampedPuckMesh.visible = true;

      // Phase 2 (0.24..0.78): Dual espresso stream pours into cup on drip tray (-0.16, 1.055, 0.30)
      // Phase 3 (0.78..1.0): Cup glides smoothly along a quadratic curve onto Station 3 Assembly Coaster (0.78, 1.01, 0.38)
      if (p < 0.78) {
        this.activeBaristaCupGroup.position.set(-0.16, 1.055, 0.30);
      } else {
        const glide = easeInOutCubic((p - 0.78) / 0.22);
        this.activeBaristaCupGroup.position.set(
          evalQuadBezier(-0.16, 0.31, 0.78, glide),
          evalQuadBezier(1.055, 1.11, 1.01, glide),
          evalQuadBezier(0.30, 0.42, 0.38, glide)
        );
      }

      this.groupHeadLedMat.emissiveIntensity = 1.6 + Math.sin(this.elapsed * 16) * 0.4;
      const needleAngle = THREE.MathUtils.lerp(0.8, -0.75, Math.min(1, p * 1.5));
      this.gaugeNeedles.forEach((n) => {
        n.rotation.z = needleAngle + Math.sin(this.elapsed * 30) * 0.03;
      });

      if (p > 0.22 && p < 0.8) {
        this.espressoStreamsGroup.visible = true;
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(-0.16, 1.54, 0.32);
      }
    } else if (this.stepAnim.type === 'steam_milk') {
      // 3-Phase Bezier Steamed Milk & Rosetta Latte Art Pour (1.55s)
      this.activeBaristaCupGroup.position.set(0.78, 1.01, 0.38);
      if (p < 0.45) {
        // Phase 1 (0.0 - 0.45): Pitcher slides smoothly under steam wand (x = 0.26, y = 1.12), wand pivots down, microfoam swirls
        const sub = Math.sin((p / 0.45) * Math.PI);
        this.milkPitcherGroup.position.set(
          evalQuadBezier(0.56, 0.41, 0.26, sub),
          evalQuadBezier(1.0, 1.08, 1.12, sub),
          0.36
        );
        this.steamWandPivot.rotation.z = -0.36 * sub;
        this.pitcherMilkMesh.rotation.y += dt * 14;
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(0.26, 1.38, 0.36);
      } else if (p < 0.85) {
        // Phase 2 (0.45 - 0.85): Pitcher lifts along a quadratic curve over the cup (0.67, 1.24, 0.38), tilts to 62 deg (1.08 rad)
        const pourT = easeInOutCubic((p - 0.45) / 0.4);
        const hoverArc = Math.sin(pourT * Math.PI);
        const wiggleZ = Math.sin(this.elapsed * 28) * 0.015;
        this.milkPitcherGroup.position.set(
          evalQuadBezier(0.32, 0.56, 0.67, Math.min(1, pourT * 1.4)),
          1.24 + hoverArc * 0.03,
          0.38 + wiggleZ
        );
        this.milkPitcherGroup.rotation.z = -1.08 * Math.min(1, Math.sin(pourT * Math.PI) * 1.35);
        this.milkPitcherGroup.rotation.x = wiggleZ * 2.5;
        this.milkPourStreamMesh.visible = true;
        this.milkPourStreamMesh.position.set(0.76, 1.18, 0.38 + wiggleZ * 0.6);
      } else {
        // Phase 3 (0.85 - 1.0): Stream tapers off and pitcher arcs gracefully back to rest (0.56, 1.0, 0.36)
        const restT = easeInOutCubic((p - 0.85) / 0.15);
        this.milkPitcherGroup.position.set(
          evalQuadBezier(0.67, 0.61, 0.56, restT),
          evalQuadBezier(1.24, 1.12, 1.0, restT),
          THREE.MathUtils.lerp(0.38, 0.36, restT)
        );
        this.milkPitcherGroup.rotation.z = THREE.MathUtils.lerp(-0.95, 0, restT);
        this.milkPourStreamMesh.visible = false;
      }
    } else if (this.stepAnim.type === 'add_ice') {
      // Ice Scoop dips into bin, lifts along a quadratic arc over the cup, and tips translucent ice cubes in
      this.activeBaristaCupGroup.position.set(0.78, 1.01, 0.38);
      const arc = Math.sin(p * Math.PI);
      this.iceScoopGroup.position.set(
        evalQuadBezier(0.02, -0.1, -0.2, arc),
        evalQuadBezier(0.065, 0.28, 0.24, arc),
        evalQuadBezier(0.01, 0.14, 0.22, arc)
      );
      this.iceScoopGroup.rotation.z = -arc * 0.95;
      this.activeCupIceGroup.visible = true;
      const dropH = Math.max(0, (1 - Math.min(1, p * 1.6)) * 0.14);
      this.activeCupIceGroup.children.forEach((cube, idx) => {
        cube.position.y = 0.132 + dropH + idx * 0.018 * (1 - smoothP);
      });
    } else if (this.stepAnim.type === 'add_syrup') {
      this.activeBaristaCupGroup.position.set(0.78, 1.01, 0.38);
      const fl = this.stepAnim.flavor || 'vanilla';
      const rMat = this.syrupRibbonMesh.material as THREE.MeshStandardMaterial;

      if (fl === 'matcha') {
        rMat.color.setHex(0x65a30d);
        this.matchaWhiskGroup.position.x = Math.sin(p * Math.PI * 8) * 0.028;
        this.matchaWhiskGroup.position.z = Math.sin(p * Math.PI * 4) * 0.022;
        this.matchaWhiskGroup.rotation.z = Math.cos(p * Math.PI * 8) * 0.18;
      } else {
        if (fl === 'vanilla') rMat.color.setHex(0xfde68a);
        else if (fl === 'caramel') rMat.color.setHex(0xd97706);
        else rMat.color.setHex(0x451a03);

        const pump = this.syrupPumpHeads.get(fl);
        if (pump) {
          const doublePump = Math.abs(Math.sin(p * Math.PI * 2));
          pump.position.y = 0.27 - doublePump * 0.032;
        }
      }

      this.syrupRibbonMesh.visible = true;
      this.syrupRibbonMesh.position.set(0.78, 1.2, 0.38);
      this.activeCupDrizzleRing.visible = true;
      this.activeCupDrizzleRing.rotation.z = p * Math.PI * 4;
    } else if (this.stepAnim.type === 'steep_tea') {
      // Kyoto Borosilicate Glass Teapot lifts along a quadratic curve over the cup on Assembly Coaster (0.78, 1.01, 0.38)
      this.activeBaristaCupGroup.position.set(0.78, 1.01, 0.38);
      const arc = Math.sin(p * Math.PI);
      this.teaPotGroup.position.set(
        0.78,
        evalQuadBezier(1.0, 1.26, 1.22, arc),
        evalQuadBezier(0.14, 0.24, 0.26, arc)
      );
      this.teaPotGroup.rotation.x = arc * 0.85;
      if (p > 0.2 && p < 0.85) {
        this.teaPourStreamMesh.visible = true;
        this.teaPourStreamMesh.position.set(0.78, 1.18, 0.36);
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(0.78, 1.44 + p * 0.05, 0.28);
      }
    } else if (this.stepAnim.type === 'serve_drink') {
      // 2-Stage Physical Pickup Choreography at Station 4 Walnut Pickup Coaster (-1.32, 1.03, 0.34)
      if (p < 0.48) {
        const s1 = easeInOutCubic(p / 0.48);
        this.activeBaristaCupGroup.position.set(
          evalQuadBezier(0.78, -0.25, -1.32, s1),
          evalQuadBezier(1.01, 1.14, 1.03, s1),
          evalQuadBezier(0.38, 0.36, 0.34, s1)
        );
        this.bellRippleRingMesh.visible = s1 > 0.5;
        this.bellRippleRingMesh.scale.setScalar(1 + (s1 - 0.5) * 3.5);
      } else {
        const s2 = easeInOutCubic((p - 0.48) / 0.52);
        this.activeBaristaCupGroup.visible = s2 < 0.38;
        this.activeBaristaCupGroup.position.set(
          -1.32,
          1.03 + s2 * 0.14,
          THREE.MathUtils.lerp(0.34, -0.25, Math.min(1, s2 * 2.5))
        );
        this.pickupSpeechSprite.visible = true;
        this.pickupSpeechSprite.position.set(-1.32, 1.68 + s2 * 0.08, -0.55);
      }
      this.floatingBadgeSprite.visible = true;
      this.floatingBadgeSprite.position.set(-1.32, 1.38 + p * 0.22, 0.34);
    }
  }

  private updateSimulationVisuals(dt: number) {
    const dampFactor = 1 - Math.exp(-14.0 * dt);

    // 1. Update Dynamic Cup ShaderMaterial Liquid & Multi-Phase Bezier Choreography
    this.updateDynamicCupShaderLiquid(dt);
    this.updateBaristaStepChoreography(dt);

    // 2. Camera Mode: "TITLE_ORBIT" (framing Hero Cup at 1.68, 1.01, 0.44 & 1990 Mazda Miata MX-5 at -3.4, 0, -3.6)
    // vs Smart Cup-Follow Camera during gameplay & step animations!
    const isTitle = this.gameState.phase === 'title';
    this.titleHeroCupGroup.visible = isTitle;
    this.titlePlaqueGroup.visible = isTitle;

    if (isTitle) {
      const swayX = Math.sin(this.elapsed * 0.52) * 0.08;
      const swayY = Math.cos(this.elapsed * 0.38) * 0.015;
      _targetPos.set(1.86 + swayX, 1.28 + swayY, 0.96);
      _targetLook.set(-1.35, 0.78, -1.85);
    } else {
      const preset = STATION_CAMERAS[this.gameState.activeStation] || STATION_CAMERAS[2];
      _targetPos.copy(preset.pos);
      _targetLook.copy(preset.look);

      // Smart Cup-Follow Camera Tracking during active step animations & serving handoff
      if (this.stepAnim) {
        const t = this.stepAnim.type;
        const cupPos = this.activeBaristaCupGroup.position;
        if (t === 'grind') {
          _targetPos.set(-0.52, 1.48, 1.28);
          _targetLook.set(-0.74, 1.1, 0.28);
        } else if (t === 'tamp') {
          _targetPos.set(-0.38, 1.46, 1.26);
          _targetLook.set(-0.43, 1.06, 0.36);
        } else if (t === 'pull_espresso') {
          const trackX = THREE.MathUtils.lerp(-0.16, cupPos.x, 0.75);
          _targetPos.set(trackX, 1.46, 1.28);
          _targetLook.set(cupPos.x, 1.08, 0.32);
        } else if (
          t === 'steam_milk' ||
          t === 'steep_tea' ||
          t === 'add_ice' ||
          t === 'add_syrup'
        ) {
          _targetPos.set(0.82, 1.46, 1.3);
          _targetLook.set(cupPos.x, 1.1, 0.36);
        } else if (t === 'serve_drink') {
          _targetPos.set(-1.32, 1.54, 1.38);
          _targetLook.set(-1.32, 1.15, -0.42);
        }
      }

      _targetPos.z += this.manualCameraZoomOffset;
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

    // 3b. 1990 Mazda Miata MX-5 Pop-Up Headlight Wink & Illumination
    if (this.miataLeftPopupGroup && this.miataRightPopupGroup) {
      const isNightOrRain =
        this.gameState.weather === 'rainy' || this.gameState.weather === 'golden';
      const winkCycle = this.elapsed % 9.0;
      const isWinking = winkCycle > 7.8 && winkCycle < 8.4;
      const baseAngle = isNightOrRain ? 0.0 : -0.08;
      const leftTarget = isWinking ? -0.52 : baseAngle;
      const rightTarget = baseAngle;
      this.miataLeftPopupGroup.rotation.x = THREE.MathUtils.lerp(
        this.miataLeftPopupGroup.rotation.x,
        leftTarget,
        dampFactor
      );
      this.miataRightPopupGroup.rotation.x = THREE.MathUtils.lerp(
        this.miataRightPopupGroup.rotation.x,
        rightTarget,
        dampFactor
      );
      if (this.miataHeadlightBeamsGroup) {
        this.miataHeadlightBeamsGroup.visible = true;
      }
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

    // 5. Subtle & Aesthetic Diegetic Step Halo Ring + Gentle Warm Rim Sheen (or Crimson Rinse Warning)
    const pinnedOrder =
      this.gameState.customers.find(
        (c) => c.id === this.gameState.pinnedOrderId && c.state === 'ordering'
      ) || this.gameState.customers.find((c) => c.state === 'ordering');
    const recipe = pinnedOrder ? getRecipeById(pinnedOrder.recipeId) : null;
    const nextStep = getNextRecommendedStep(this.gameState.currentCup, recipe, pinnedOrder);
    const effectiveSyrup = pinnedOrder?.customSyrup || recipe?.syrup || 'vanilla';
    const recommendedToolKey = this.gameState.realismMode
      ? null
      : nextStep.toolKey === 'syrup'
      ? `syrup-${effectiveSyrup}`
      : nextStep.toolKey;

    const haloCoords: Record<string, [number, number]> = {
      grinder: [-0.78, 0.22],
      tamper: [-0.48, 0.36],
      espresso: [-0.16, 0.30],
      rinse: [0.36, 0.26],
      sink: [0.36, 0.26],
      tea: [0.78, 0.14],
      milk: [0.56, 0.36],
      ice: [0.98, 0.16],
      'syrup-vanilla': [1.20, 0.18],
      'syrup-caramel': [1.32, 0.18],
      'syrup-chocolate': [1.44, 0.18],
      'syrup-matcha': [1.56, 0.36],
      serve: [-1.32, 0.34],
    };

    if (
      this.stepHaloGroup &&
      this.stepHaloGlowMat &&
      this.stepHaloRingMat &&
      this.gameState.phase === 'playing' &&
      recommendedToolKey &&
      haloCoords[recommendedToolKey]
    ) {
      const [hx, hz] = haloCoords[recommendedToolKey];
      this.stepHaloGroup.visible = true;
      this.stepHaloGroup.position.set(hx, 1.004, hz);
      const isRinseError = Boolean(nextStep.isError);
      this.stepHaloRingMat.color.setHex(isRinseError ? 0xf43f5e : 0xfbbf24);
      const breathe = 0.22 + (Math.sin(this.elapsed * (isRinseError ? 7.0 : 3.5)) * 0.5 + 0.5) * 0.32;
      this.stepHaloGlowMat.opacity = breathe;
      this.stepHaloRingMat.opacity = breathe + 0.12;
      const haloScale = 0.96 + Math.sin(this.elapsed * (isRinseError ? 7.0 : 3.5)) * 0.06;
      this.stepHaloGroup.scale.setScalar(haloScale);
    } else if (this.stepHaloGroup) {
      this.stepHaloGroup.visible = false;
    }

    const subtleRimIntensity = 0.12 + Math.sin(this.elapsed * 3.5) * 0.08;
    for (const [key, group] of this.toolGroups.entries()) {
      const isRecommended = this.gameState.phase === 'playing' && key === recommendedToolKey;
      const isHovered = key === this.hoveredToolKey;
      const targetScale = isHovered ? 1.03 : 1.0;
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
              mat.emissive.setHex(0xd97706);
              mat.emissiveIntensity = 0.26;
            } else if (isRecommended) {
              mat.emissive.setHex(nextStep.isError ? 0xf43f5e : 0xd97706);
              mat.emissiveIntensity = nextStep.isError ? 0.38 : subtleRimIntensity;
            } else if (
              mat.emissive.getHex() === 0xd97706 ||
              mat.emissive.getHex() === 0xf59e0b ||
              mat.emissive.getHex() === 0xf43f5e
            ) {
              mat.emissiveIntensity = 0;
            }
          }
        }
      });
    }

    // 6. Animate Pooled Steam Particles (Title Hero Cup at 1.68, 1.01, 0.44 & Active Barista Cup)
    for (let i = 0; i < 24; i++) {
      const t = (this.elapsed * 0.65 + i * 0.17) % 1;
      const isTitleCupSteam = i < 12;
      const baseX = isTitleCupSteam ? 1.68 : this.activeBaristaCupGroup.position.x;
      const baseY = isTitleCupSteam ? 1.18 : 1.2;
      const baseZ = isTitleCupSteam ? 0.44 : this.activeBaristaCupGroup.position.z;

      _dummyObj.position.set(
        baseX + Math.sin(t * 6 + i) * 0.032,
        baseY + t * 0.35,
        baseZ + Math.cos(t * 5 + i) * 0.032
      );
      const s = Math.sin(t * Math.PI) * 0.85;
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
          2.22 + Math.sin(t * 5 + i) * 0.16,
          1.18 + t * 0.5,
          0.24 + Math.cos(t * 4 + i) * 0.14
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
        const rx = -5.5 + (i % 15) * 0.78;
        const rz = -1.6 - Math.floor(i / 15) * 1.6;
        _dummyObj.position.set(rx, 3.6 - t * 3.6, rz);
        _dummyObj.scale.setScalar(1);
        _dummyObj.updateMatrix();
        this.rainDropsInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      this.rainDropsInstanced.instanceMatrix.needsUpdate = true;
    }

    // 9. Animate Articulated 3D Customers (2-Step Aisle Waypoints, Speed-Synchronized Walk Cycle & Smooth Seated Blend)
    const shortestAngleLerp = (current: number, target: number, alpha: number): number => {
      let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (diff < -Math.PI) diff += Math.PI * 2;
      return current + diff * alpha;
    };

    const buildAisleWaypoints = (
      from: THREE.Vector3,
      goal: THREE.Vector3,
      kind: 'pickup' | 'queue' | 'seat' | 'car_selfie' | 'exit'
    ): THREE.Vector3[] => {
      const corridorZ = -1.78; // Open clear walkway between bar counter & front lounge tables
      const centerAisleZ = -3.65; // Open aisle between front & back lounge table rows
      const pts: THREE.Vector3[] = [];

      if (kind === 'pickup') {
        pts.push(goal.clone());
        return pts;
      }

      if (kind === 'queue') {
        // From entrance or lounge -> corridor -> queue slot (never cuts through Miata or tables)
        if (from.z < -2.6 && from.x > -0.8) {
          pts.push(new THREE.Vector3(Math.max(1.35, from.x), 0, corridorZ));
        }
        if (Math.abs(from.x - goal.x) > 0.65 || from.z < -2.4) {
          pts.push(new THREE.Vector3(-1.35, 0, corridorZ));
        }
        pts.push(goal.clone());
        return pts;
      }

      if (kind === 'car_selfie') {
        // Walk along clear front aisle, then approach Miata bay respectfully outside plinth
        if (from.z > -1.4) {
          pts.push(new THREE.Vector3(-1.35, 0, corridorZ));
        }
        pts.push(goal.clone());
        return pts;
      }

      if (kind === 'seat') {
        // Counter -> clear front corridor -> align with aisle -> step neatly into seat
        if (from.z > -1.4 || from.x < -0.8) {
          pts.push(new THREE.Vector3(-1.1, 0, corridorZ));
        }
        if (goal.z < -3.8) {
          // Back row tables (2 & 3): route cleanly through central aisle x = 1.45
          pts.push(new THREE.Vector3(1.45, 0, corridorZ));
          pts.push(new THREE.Vector3(1.45, 0, centerAisleZ));
          pts.push(new THREE.Vector3(goal.x, 0, centerAisleZ));
        } else {
          // Front row tables (0 & 1)
          pts.push(new THREE.Vector3(goal.x, 0, corridorZ));
        }
        pts.push(goal.clone());
        return pts;
      }

      // Exit cleanly to glass bay doorway (1.35, 0, -5.8)
      if (from.z > -3.5) {
        pts.push(new THREE.Vector3(from.x, 0, corridorZ));
        pts.push(new THREE.Vector3(1.45, 0, corridorZ));
      } else {
        pts.push(new THREE.Vector3(1.45, 0, centerAisleZ));
      }
      pts.push(goal.clone());
      return pts;
    };

    let orderQueueIdx = 0;
    this.gameState.customers.forEach((cust) => {
      const actor = this.customerActors.get(cust.id);
      if (!actor) return;

      const isPickingUpDrink =
        this.activePickupCustomerId === cust.id &&
        this.stepAnim?.type === 'serve_drink' &&
        this.stepAnim.progress < 0.82;

      let goalKind: 'pickup' | 'queue' | 'seat' | 'car_selfie' | 'exit' = 'exit';
      let goalKey = 'exit';
      let targetFacing = 0;

      if (isPickingUpDrink) {
        goalKind = 'pickup';
        goalKey = 'pickup';
        _targetPos.set(-1.32, 0, -0.72);
        targetFacing = 0;
        actor.heldCup.visible = (this.stepAnim?.progress || 0) >= 0.55;
      } else if (cust.state === 'ordering') {
        goalKind = 'queue';
        goalKey = `queue-${orderQueueIdx}`;
        // Clear left-center register queue (x = -1.65, strictly clear of Miata showroom bay!)
        _targetPos.set(-1.65, 0, -0.82 - orderQueueIdx * 0.62);
        targetFacing = 0;
        orderQueueIdx++;
      } else if (cust.state === 'seated' && cust.socialBehavior === 'car_selfie') {
        goalKind = 'car_selfie';
        goalKey = 'car_selfie';
        // Stand respectfully beside the Miata showroom plinth (outside plinth footprint)
        _targetPos.set(-1.82, 0, -3.25);
        targetFacing = -1.15;
        actor.heldCup.visible = true;
      } else if (cust.state === 'seated' && cust.seatIndex !== null) {
        goalKind = 'seat';
        const seatIdx = cust.seatIndex % LOUNGE_SEAT_COORDS.length;
        const seat = LOUNGE_SEAT_COORDS[seatIdx] || LOUNGE_SEAT_COORDS[0];
        goalKey = `seat-${seatIdx}`;
        _targetPos.set(seat.x, 0, seat.z);
        targetFacing = seat.facingRotY;
        actor.heldCup.visible = true;
      } else {
        goalKind = 'exit';
        goalKey = 'exit';
        _targetPos.set(1.35, 0, -5.8);
        targetFacing = Math.PI;
      }

      // Recompute smooth 2-step aisle waypoints whenever destination key changes
      if (actor.finalGoalKey !== goalKey) {
        actor.finalGoalKey = goalKey;
        actor.waypoints = buildAisleWaypoints(actor.currentPos, _targetPos, goalKind);
      }

      // Advance along active waypoint queue at natural bipedal walking speed
      actor.lastPos.copy(actor.currentPos);
      const walkSpeed = isPickingUpDrink ? 2.15 : 1.55;
      let moveDx = 0;
      let moveDz = 0;
      let remainingDistToFinal = _targetPos.distanceTo(actor.currentPos);

      if (actor.waypoints.length > 0) {
        const nextWp = actor.waypoints[0];
        const wDx = nextWp.x - actor.currentPos.x;
        const wDz = nextWp.z - actor.currentPos.z;
        const wDist = Math.hypot(wDx, wDz);

        if (wDist <= 0.08 && actor.waypoints.length > 1) {
          actor.waypoints.shift();
        } else if (wDist > 0.025) {
          const step = Math.min(wDist, walkSpeed * dt);
          actor.currentPos.x += (wDx / wDist) * step;
          actor.currentPos.z += (wDz / wDist) * step;
          moveDx = wDx;
          moveDz = wDz;
        } else {
          actor.currentPos.x = nextWp.x;
          actor.currentPos.z = nextWp.z;
          actor.waypoints.shift();
        }
        remainingDistToFinal = _targetPos.distanceTo(actor.currentPos);
      }

      actor.group.position.copy(actor.currentPos);

      // Compute true linear ground speed for zero-skate speed-synchronized stride
      const frameDisp = Math.hypot(
        actor.currentPos.x - actor.lastPos.x,
        actor.currentPos.z - actor.lastPos.z
      );
      const actualSpeed = dt > 0.0001 ? frameDisp / dt : 0;
      const isActivelyWalking = actualSpeed > 0.08 && remainingDistToFinal > 0.04;

      const walkBlendTarget = isActivelyWalking ? Math.min(1, actualSpeed / 1.35) : 0;
      actor.walkBlend += (walkBlendTarget - actor.walkBlend) * (1 - Math.exp(-10 * dt));

      const isArrivedSeated =
        !isActivelyWalking &&
        cust.state === 'seated' &&
        cust.socialBehavior !== 'car_selfie' &&
        !isPickingUpDrink &&
        remainingDistToFinal <= 0.12;
      const seatedTarget = isArrivedSeated ? 1 : 0;
      actor.seatedBlend += (seatedTarget - actor.seatedBlend) * (1 - Math.exp(-7 * dt));

      if (isActivelyWalking) {
        actor.walkPhase += actualSpeed * dt * 5.2;
        const moveHeading = Math.atan2(moveDx, moveDz);
        actor.facingAngle = shortestAngleLerp(
          actor.facingAngle,
          moveHeading,
          1 - Math.exp(-10 * dt)
        );
      } else {
        actor.facingAngle = shortestAngleLerp(
          actor.facingAngle,
          targetFacing,
          1 - Math.exp(-7 * dt)
        );
      }
      actor.group.rotation.y = actor.facingAngle;

      // Periodic Eye Blinking
      const blinkCycle = (this.elapsed + actor.seed * 0.37) % 3.6;
      const eyeScaleY = blinkCycle < 0.12 ? 0.1 : 1.0;
      actor.leftEyeMesh.scale.y = eyeScaleY;
      actor.rightEyeMesh.scale.y = eyeScaleY;

      if (isPickingUpDrink && remainingDistToFinal <= 0.18) {
        // Stage 2 Customer Pickup Pose at counter: both articulated arms reach forward to lift the cup!
        actor.pelvisGroup.position.y = 0.58;
        actor.pelvisGroup.rotation.z = 0;
        actor.torsoGroup.rotation.y = 0;
        actor.torsoGroup.rotation.z = 0;
        actor.leftHipJoint.rotation.x = 0;
        actor.rightHipJoint.rotation.x = 0;
        actor.leftKneeJoint.rotation.x = 0;
        actor.rightKneeJoint.rotation.x = 0;

        actor.leftShoulderJoint.rotation.x = -0.92;
        actor.leftElbowJoint.rotation.x = -0.45;
        actor.rightShoulderJoint.rotation.x = -0.98;
        actor.rightElbowJoint.rotation.x = -0.48;
        actor.neckJoint.rotation.x = 0.12;
        actor.neckJoint.rotation.y = 0;
        actor.activitySprite.visible = false;
      } else if (actor.walkBlend > 0.12) {
        // Speed-Synchronized Fluid Bipedal Walk Cycle (zero ice-skating, natural arm swing & cup carry!)
        const wb = actor.walkBlend;
        const s = Math.sin(actor.walkPhase);
        const c = Math.cos(actor.walkPhase);
        const bob = Math.abs(s) * 0.036 * wb;

        actor.pelvisGroup.position.y = THREE.MathUtils.lerp(0.58 + bob, 0.44, actor.seatedBlend);
        actor.pelvisGroup.rotation.z = s * 0.035 * wb;
        actor.torsoGroup.rotation.y = -s * 0.075 * wb;
        actor.torsoGroup.rotation.z = -s * 0.025 * wb;
        actor.neckJoint.rotation.y = s * 0.04 * wb;
        actor.neckJoint.rotation.x = 0.04 * wb;

        actor.leftHipJoint.rotation.x = THREE.MathUtils.lerp(s * 0.5 * wb, -1.32, actor.seatedBlend);
        actor.rightHipJoint.rotation.x = THREE.MathUtils.lerp(-s * 0.5 * wb, -1.32, actor.seatedBlend);
        actor.leftKneeJoint.rotation.x = THREE.MathUtils.lerp(
          Math.max(0, -c * 0.52 * wb),
          1.32,
          actor.seatedBlend
        );
        actor.rightKneeJoint.rotation.x = THREE.MathUtils.lerp(
          Math.max(0, c * 0.52 * wb),
          1.32,
          actor.seatedBlend
        );

        actor.leftShoulderJoint.rotation.x = -s * 0.4 * wb;
        actor.leftElbowJoint.rotation.x = -0.22 - Math.max(0, -s) * 0.25 * wb;
        actor.phoneMesh.visible = false;
        actor.activitySprite.visible = false;

        if (actor.heldCup.visible) {
          // Steady cup-carrying pose on right arm while walking
          actor.rightShoulderJoint.rotation.x = -0.56 + Math.abs(s) * 0.04 * wb;
          actor.rightElbowJoint.rotation.x = -0.88;
        } else {
          actor.rightShoulderJoint.rotation.x = s * 0.4 * wb;
          actor.rightElbowJoint.rotation.x = -0.22 - Math.max(0, s) * 0.25 * wb;
        }
      } else if (cust.state === 'seated' && cust.socialBehavior === 'car_selfie') {
        // Standing beside the 1990 Mazda Miata MX-5 showroom plinth taking a Car Selfie!
        actor.pelvisGroup.position.y = 0.58;
        actor.pelvisGroup.rotation.z = 0.04;
        actor.torsoGroup.rotation.y = 0;
        actor.leftHipJoint.rotation.x = 0;
        actor.rightHipJoint.rotation.x = 0;
        actor.leftKneeJoint.rotation.x = 0;
        actor.rightKneeJoint.rotation.x = 0.12;
        actor.phoneMesh.visible = true;
        actor.activitySprite.visible = true;
        const wave = Math.sin(this.elapsed * 2.4 + actor.seed);
        actor.leftShoulderJoint.rotation.x = -1.32 + wave * 0.08;
        actor.leftElbowJoint.rotation.x = -0.55;
        actor.rightShoulderJoint.rotation.x = -0.65;
        actor.rightElbowJoint.rotation.x = -0.85;
        actor.neckJoint.rotation.y = 0.25 * Math.sin(this.elapsed * 1.5);
        const carIcon = Math.sin(this.elapsed * 3.0) > 0.5 ? 'PHOTO MX5' : 'GARAGE LP';
        if (actor.lastActivityLabel !== carIcon) {
          actor.lastActivityLabel = carIcon;
          this.drawCustomerActivityBadge(actor.activityTexture, carIcon);
        }
      } else if (cust.state === 'seated') {
        // Smooth Seated Cafe Activity Behaviors (blended smoothly via actor.seatedBlend!)
        const sb = actor.seatedBlend;
        actor.pelvisGroup.position.y = THREE.MathUtils.lerp(0.58, 0.44, sb);
        actor.pelvisGroup.rotation.z = 0;
        actor.torsoGroup.rotation.y = 0;
        actor.torsoGroup.rotation.z = 0;
        actor.leftHipJoint.rotation.x = -1.32 * sb;
        actor.rightHipJoint.rotation.x = -1.32 * sb;
        actor.leftKneeJoint.rotation.x = 1.32 * sb;
        actor.rightKneeJoint.rotation.x = 1.32 * sb;
        actor.activitySprite.visible = sb > 0.55;

        const behavior = cust.socialBehavior || 'relaxing';
        const wave = Math.sin(this.elapsed * 2.2 + actor.seed);
        const sipWave = Math.max(0, Math.sin(this.elapsed * 1.5 + actor.seed));

        if (behavior === 'selfie') {
          actor.phoneMesh.visible = true;
          actor.leftShoulderJoint.rotation.x = -1.25 + wave * 0.08;
          actor.leftElbowJoint.rotation.x = -0.65;
          actor.rightShoulderJoint.rotation.x = -0.65;
          actor.rightElbowJoint.rotation.x = -0.85;
          actor.neckJoint.rotation.z = 0.16 * Math.sin(this.elapsed * 1.4);
          actor.neckJoint.rotation.y = -0.22;
          const flashIcon = Math.sin(this.elapsed * 3.2) > 0.65 ? 'PHOTO SNAP' : 'PHOTO CAFE';
          if (actor.lastActivityLabel !== flashIcon) {
            actor.lastActivityLabel = flashIcon;
            this.drawCustomerActivityBadge(actor.activityTexture, flashIcon);
          }
        } else if (behavior === 'chatting') {
          actor.phoneMesh.visible = false;
          actor.torsoGroup.position.y = 0.04 + Math.abs(wave) * 0.015;
          actor.neckJoint.rotation.y = Math.sin(this.elapsed * 1.8 + actor.seed) * 0.35;
          actor.neckJoint.rotation.x = Math.sin(this.elapsed * 4.2) * 0.08;
          actor.leftShoulderJoint.rotation.x = -0.55 + Math.sin(this.elapsed * 4.5) * 0.25;
          actor.leftElbowJoint.rotation.x = -0.75 + Math.cos(this.elapsed * 4.5) * 0.2;
          actor.rightShoulderJoint.rotation.x = -0.55 - sipWave * 0.4;
          actor.rightElbowJoint.rotation.x = -0.85 - sipWave * 0.45;
          const chatIcon = wave > 0 ? 'CHAT CAFE' : 'CHAT VIBE';
          if (actor.lastActivityLabel !== chatIcon) {
            actor.lastActivityLabel = chatIcon;
            this.drawCustomerActivityBadge(actor.activityTexture, chatIcon);
          }
        } else if (behavior === 'laptop') {
          actor.phoneMesh.visible = false;
          const isTyping = sipWave < 0.35;
          if (isTyping) {
            actor.leftShoulderJoint.rotation.x = -0.68 + Math.sin(this.elapsed * 14) * 0.06;
            actor.leftElbowJoint.rotation.x = -0.82;
            actor.rightShoulderJoint.rotation.x = -0.68 + Math.cos(this.elapsed * 14) * 0.06;
            actor.rightElbowJoint.rotation.x = -0.82;
            actor.neckJoint.rotation.x = 0.18;
          } else {
            actor.leftShoulderJoint.rotation.x = -0.55;
            actor.leftElbowJoint.rotation.x = -0.75;
            actor.rightShoulderJoint.rotation.x = -0.55 - sipWave * 0.48;
            actor.rightElbowJoint.rotation.x = -0.85 - sipWave * 0.52;
            actor.neckJoint.rotation.x = -sipWave * 0.2;
          }
          const workIcon = isTyping ? 'WORK CODE' : 'WORK BREW';
          if (actor.lastActivityLabel !== workIcon) {
            actor.lastActivityLabel = workIcon;
            this.drawCustomerActivityBadge(actor.activityTexture, workIcon);
          }
        } else {
          actor.phoneMesh.visible = false;
          actor.leftShoulderJoint.rotation.x = -0.35;
          actor.leftElbowJoint.rotation.x = -0.65;
          actor.rightShoulderJoint.rotation.x = -0.55 - sipWave * 0.48;
          actor.rightElbowJoint.rotation.x = -0.85 - sipWave * 0.55;
          actor.neckJoint.rotation.x = -sipWave * 0.22;
          actor.neckJoint.rotation.y = Math.sin(this.elapsed * 0.9 + actor.seed) * 0.25;
          const relaxIcon = sipWave > 0.4 ? 'WARM SIP' : 'GARDEN ZEN';
          if (actor.lastActivityLabel !== relaxIcon) {
            actor.lastActivityLabel = relaxIcon;
            this.drawCustomerActivityBadge(actor.activityTexture, relaxIcon);
          }
        }
      } else {
        // Expressive Waiting Idle Animations at Station 1 Order Queue
        const idlePhase = this.elapsed * 1.4 + actor.seed;
        const weightShift = Math.sin(idlePhase * 0.8);
        actor.pelvisGroup.position.y = 0.58 + Math.sin(idlePhase * 1.6) * 0.008;
        actor.pelvisGroup.rotation.z = weightShift * 0.045;
        actor.torsoGroup.rotation.y = 0;
        actor.torsoGroup.rotation.z = -weightShift * 0.035;
        actor.leftHipJoint.rotation.x = 0;
        actor.rightHipJoint.rotation.x = 0;
        actor.leftKneeJoint.rotation.x = weightShift > 0 ? 0.12 * weightShift : 0;
        actor.rightKneeJoint.rotation.x = weightShift < 0 ? -0.12 * weightShift : 0;

        const idleMode = (Math.floor(this.elapsed * 0.25) + actor.seed) % 3;
        if (idleMode === 0) {
          actor.phoneMesh.visible = actor.seed % 2 === 0;
          actor.leftShoulderJoint.rotation.x = -0.65;
          actor.leftElbowJoint.rotation.x = -0.95;
          actor.rightShoulderJoint.rotation.x = -0.22;
          actor.rightElbowJoint.rotation.x = -0.35;
          actor.neckJoint.rotation.x = 0.22;
          actor.neckJoint.rotation.y = -0.12;
        } else if (idleMode === 1) {
          actor.phoneMesh.visible = false;
          actor.leftShoulderJoint.rotation.x = -0.22;
          actor.leftElbowJoint.rotation.x = -0.4;
          actor.rightShoulderJoint.rotation.x = -0.22;
          actor.rightElbowJoint.rotation.x = -0.4;
          actor.neckJoint.rotation.y = Math.sin(idlePhase * 0.9) * 0.42;
          actor.neckJoint.rotation.x = -0.12 * Math.cos(idlePhase * 0.7);
        } else {
          actor.phoneMesh.visible = false;
          actor.leftShoulderJoint.rotation.x = -0.25;
          actor.leftElbowJoint.rotation.x = -0.45;
          actor.rightShoulderJoint.rotation.x = -0.58 + Math.sin(this.elapsed * 4.5) * 0.12;
          actor.rightElbowJoint.rotation.x = -0.78 + Math.cos(this.elapsed * 4.5) * 0.15;
          actor.neckJoint.rotation.y = Math.sin(idlePhase) * 0.16;
          actor.neckJoint.rotation.x = 0;
        }
      }
    });
  }

  public dispose() {
    this.isDisposed = true;
    window.cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    if (this.resizeDebounceTimer !== null) {
      window.clearTimeout(this.resizeDebounceTimer);
      this.resizeDebounceTimer = null;
    }
    window.removeEventListener('resize', this.scheduleDebouncedResize);
    window.removeEventListener('orientationchange', this.scheduleDebouncedResize);
    window.visualViewport?.removeEventListener('resize', this.scheduleDebouncedResize);
    this.resizeObserver?.disconnect();
    this.studioLogoTexture?.dispose();
    this.studioCupEmblemTexture?.dispose();
    this.woodBumpTexture?.dispose();
    this.microCementTexture?.dispose();
    this.herringboneFloorTexture?.dispose();
    this.patioCobbleTexture?.dispose();
    this.tampedPuckTexture?.dispose();
    this.vinylLabelTexture?.dispose();
    this.hangingSignTexture?.dispose();
    this.latteArtTexture?.dispose();
    this.floatingBadgeTexture?.dispose();
    this.pickupSpeechTexture?.dispose();
    this.stepHaloTexture?.dispose();
    this.ticketTextures.forEach((t) => t.dispose());
    this.cupLiquidShaderMat?.dispose();
    this.renderer.dispose();
  }
}

