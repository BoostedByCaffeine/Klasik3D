import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { STUDIO_LOGO_SVG_RAW } from '../components/StudioLogo';
import {
  BaristaStationId,
  CustomerOrder,
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
const _targetColor = new THREE.Color();
const _targetCremaColor = new THREE.Color();

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

// Re-spaced camera presets matching the non-overlapping X-zones (-2.20 to +2.35)
const STATION_CAMERAS: Record<BaristaStationId, StationCameraPreset> = {
  1: {
    pos: new THREE.Vector3(-1.82, 1.64, 1.92),
    look: new THREE.Vector3(-1.72, 1.24, -0.75),
  },
  2: {
    pos: new THREE.Vector3(-0.42, 1.6, 1.82),
    look: new THREE.Vector3(-0.42, 1.16, 0.05),
  },
  3: {
    pos: new THREE.Vector3(0.95, 1.6, 1.82),
    look: new THREE.Vector3(0.95, 1.16, 0.08),
  },
  4: {
    pos: new THREE.Vector3(-1.15, 1.66, 1.88),
    look: new THREE.Vector3(-1.05, 1.14, -1.65),
  },
  5: {
    pos: new THREE.Vector3(1.98, 1.56, 1.62),
    look: new THREE.Vector3(2.05, 1.15, 0.12),
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
  leftEyeMesh: THREE.Mesh;
  rightEyeMesh: THREE.Mesh;
  heldCup: THREE.Group;
  phoneMesh: THREE.Mesh;
  activitySprite: THREE.Sprite;
  activityTexture: THREE.CanvasTexture;
  lastActivityLabel: string;
  currentPos: THREE.Vector3;
  seed: number;
}

interface ActiveStepAnimation {
  type: StepAnimType;
  progress: number;
  duration: number;
  flavor?: SyrupFlavor;
  badgeText?: string;
  servedCustomerId?: string;
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
  private herringboneFloorTexture!: THREE.CanvasTexture;
  private patioCobbleTexture!: THREE.CanvasTexture;
  private tampedPuckTexture!: THREE.CanvasTexture;
  private vinylLabelTexture!: THREE.CanvasTexture;
  private hangingSignTexture!: THREE.CanvasTexture;
  private latteArtTexture!: THREE.CanvasTexture;
  private floatingBadgeTexture!: THREE.CanvasTexture;
  private pickupSpeechTexture!: THREE.CanvasTexture;
  private ticketTextures: THREE.CanvasTexture[] = [];

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

  // Active Barista Cup & Custom ShaderMaterial Internal Liquid
  private activeBaristaCupGroup!: THREE.Group;
  private activeCupLiquidMesh!: THREE.Mesh;
  private cupLiquidShaderMat!: THREE.ShaderMaterial;
  private currentLiquidFill = 0;
  private currentLiquidMilk = 0;
  private currentLiquidColor = new THREE.Color(0x3b1d0e);
  private currentCremaColor = new THREE.Color(0xd98a3c);
  private cupCurrentPos = new THREE.Vector3(-0.19, 1.055, 0.34);
  private cupTargetPos = new THREE.Vector3(-0.19, 1.055, 0.34);

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
    this.scene.fog = new THREE.FogExp2(0x1a120e, 0.042);

    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 60);
    this.camera.position.set(0.15, 1.42, 1.45);
    this.camera.lookAt(0.05, 1.12, 0.15);

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
    this.buildFloatingBadgeAndHearts();
    this.buildPooledParticles();
    this.scene.add(this.customersRoot);

    // Sync initial state
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

    // C. Warm Herringbone Hardwood Flooring Texture (Interior Lounge)
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 256;
    floorCanvas.height = 256;
    const fCtx = floorCanvas.getContext('2d')!;
    fCtx.fillStyle = '#3b2416';
    fCtx.fillRect(0, 0, 256, 256);
    const plankW = 32;
    const plankH = 64;
    const tones = ['#4a2e1b', '#3d2516', '#54341f', '#331e11'];
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
    this.herringboneFloorTexture.repeat.set(8, 6);

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
    this.drawPickupSpeechBubble('Looks amazing, thank you! ❤️');
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

  // Draws Dynamic Hanging 3D Order Tickets above Station 1 (Customer Name, Drink Title, Add-ons & Live Patience Bar)
  private redrawOrderTicketTextures() {
    const ordering = this.gameState.customers.filter((c) => c.state === 'ordering');
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

    this.ghostSnapMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
  }

  // Realistic Coffee Shop Interior Architecture & Sunlit Garage Garden Patio
  private buildCafeArchitecture() {
    const archGroup = new THREE.Group();

    // 1. Warm Herringbone Hardwood Interior Lounge Floor (z = -2.2 to +4.0)
    const loungeFloorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.herringboneFloorTexture,
      roughness: 0.55,
      metalness: 0.05,
    });
    const loungeFloor = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.4), loungeFloorMat);
    loungeFloor.rotation.x = -Math.PI / 2;
    loungeFloor.position.set(0, 0, 0.9);
    loungeFloor.receiveShadow = true;
    archGroup.add(loungeFloor);

    // 2. Cobblestone & Terracotta Garden Patio Terrace (z = -8.5 to -2.2)
    const patioFloorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.patioCobbleTexture,
      roughness: 0.78,
      metalness: 0.04,
    });
    const patioFloor = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.6), patioFloorMat);
    patioFloor.rotation.x = -Math.PI / 2;
    patioFloor.position.set(0, -0.008, -5.4);
    patioFloor.receiveShadow = true;
    archGroup.add(patioFloor);

    // Outer Garden Lawn & Landscaping Perimeter
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a1e,
      roughness: 0.9,
    });
    const grassPlane = new THREE.Mesh(new THREE.PlaneGeometry(28, 22), grassMat);
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.position.set(0, -0.025, -11.5);
    grassPlane.receiveShadow = true;
    archGroup.add(grassPlane);

    // 3. Main Walnut Barista Counter (Cleanly spans x = -2.55 to +2.65, y = 0..1.0)
    const counterBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1c1512,
      roughness: 0.7,
      metalness: 0.15,
    });
    const counterBody = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.94, 0.95), counterBaseMat);
    counterBody.position.set(0.05, 0.47, 0.24);
    counterBody.castShadow = true;
    counterBody.receiveShadow = true;
    archGroup.add(counterBody);

    // Beveled Walnut Countertop Slab (Top surface strictly at y = 1.00)
    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(5.68, 0.06, 1.06),
      this.counterWoodMat
    );
    counterTop.position.set(0.05, 0.97, 0.24);
    counterTop.castShadow = true;
    counterTop.receiveShadow = true;
    archGroup.add(counterTop);

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.22,
      metalness: 0.88,
    });
    const brassTrim = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.022, 1.08), brassMat);
    brassTrim.position.set(0.05, 0.935, 0.24);
    archGroup.add(brassTrim);

    // 4. Exposed Warm Brick Accent Wall on Left with Framed Vintage Posters & Bookshelves
    const brickMat = new THREE.MeshStandardMaterial({
      color: 0x432316,
      roughness: 0.85,
      metalness: 0.04,
    });
    const leftBrickWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 7.5), brickMat);
    leftBrickWall.position.set(-3.55, 1.8, -1.8);
    leftBrickWall.receiveShadow = true;
    archGroup.add(leftBrickWall);

    // Framed Vintage Coffee Posters on Brick Wall
    const posterConfigs = [
      { title: 'ROAST & VINYL', sub: 'GARAGE SESSIONS', color: '#d97706', z: -0.9 },
      { title: '9-BAR ESPRESSO', sub: 'ARTISAN EXTRACTION', color: '#059669', z: -2.1 },
      { title: 'UJI CEREMONIAL', sub: 'FIRST HARVEST MATCHA', color: '#65a30d', z: -3.3 },
    ];
    posterConfigs.forEach((p) => {
      const pTex = this.createVintagePosterTexture(p.title, p.sub, p.color);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.78, 0.58),
        this.counterWoodMat
      );
      frame.position.set(-3.35, 2.05, p.z);
      archGroup.add(frame);

      const art = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.7),
        new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.4 })
      );
      art.rotation.y = Math.PI / 2;
      art.position.set(-3.32, 2.05, p.z);
      archGroup.add(art);
    });

    // Wooden Wall Bookshelf filled with 3D Books & Ceramic Pots
    const shelfGroup = new THREE.Group();
    [1.15, 1.48].forEach((sy) => {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 1.8), this.counterWoodMat);
      plank.position.set(-3.26, sy, -1.8);
      shelfGroup.add(plank);
    });
    const bookColors = [0xd97706, 0x10b981, 0x3b82f6, 0xf43f5e, 0xa855f7, 0xeab308];
    for (let b = 0; b < 10; b++) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.22, 0.045),
        new THREE.MeshStandardMaterial({
          color: bookColors[b % bookColors.length],
          roughness: 0.6,
        })
      );
      book.position.set(-3.26, 1.28, -2.45 + b * 0.075);
      book.rotation.x = (b % 3 === 0 ? 0.08 : 0);
      shelfGroup.add(book);
    }
    archGroup.add(shelfGroup);

    // 5. Industrial Black Steel-Framed Glass Garage Archway & Windows
    const steelFrameMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.35,
      metalness: 0.8,
    });
    [-3.2, 3.3].forEach((px) => {
      const column = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.6, 0.45), brickMat);
      column.position.set(px, 1.8, -1.65);
      column.castShadow = true;
      archGroup.add(column);
    });

    const steelHeader = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.32, 0.38), steelFrameMat);
    steelHeader.position.set(0.05, 3.38, -1.65);
    archGroup.add(steelHeader);

    // Overhead Timber Ceiling Rafters & Glowing Warm Edison Fairy Lights
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.2,
    });
    const bulbGeo = new THREE.SphereGeometry(0.032, 8, 8);

    for (let r = -2; r <= 2; r++) {
      const rafterX = r * 1.35;
      const rafter = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.16, 5.8),
        this.counterWoodMat
      );
      rafter.position.set(rafterX, 3.18, -3.2);
      archGroup.add(rafter);

      // Edison fairy bulbs strung along the rafters
      for (let b = 0; b < 4; b++) {
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(rafterX, 3.06 - (b % 2) * 0.04, -1.2 - b * 1.15);
        archGroup.add(bulb);
      }
    }

    // 6. Back Garden Wooden Privacy Fence Slats & Layered 3D Garden Trees/Bushes
    const fenceSlatsGroup = new THREE.Group();
    for (let f = -9; f <= 9; f++) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 2.2, 0.06),
        this.counterWoodMat
      );
      slat.position.set(f * 0.42, 1.1, -6.2);
      fenceSlatsGroup.add(slat);
    }
    archGroup.add(fenceSlatsGroup);

    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.75,
    });
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.85,
    });
    [
      [-2.8, -5.6],
      [-0.9, -5.8],
      [1.4, -5.7],
      [3.1, -5.5],
    ].forEach(([tx, tz], idx) => {
      const treeGroup = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.5, 10), trunkMat);
      trunk.position.y = 0.75;
      treeGroup.add(trunk);

      const canopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), foliageMat);
      canopy1.position.set(0, 1.75, 0);
      treeGroup.add(canopy1);

      const canopy2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 1), foliageMat);
      canopy2.position.set(idx % 2 === 0 ? 0.35 : -0.35, 2.15, 0.15);
      treeGroup.add(canopy2);

      treeGroup.position.set(tx, 0, tz);
      archGroup.add(treeGroup);
    });

    // 7. Title-Only Studio Plaque & Hero Cup (Hidden during gameplay)
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
    this.titlePlaqueGroup.position.set(3.05, 2.05, -1.38);
    this.titlePlaqueGroup.rotation.y = -0.25;
    archGroup.add(this.titlePlaqueGroup);

    this.titleHeroCupGroup = this.createPorcelainCupMesh(1.18, true, true);
    this.titleHeroCupGroup.position.set(0.18, 1.0, 0.42);
    this.titleHeroCupGroup.rotation.y = 0.35;
    archGroup.add(this.titleHeroCupGroup);

    this.scene.add(archGroup);
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
          map: this.studioLogoTexture,
          side: THREE.DoubleSide,
        })
      : this.ceramicMugMat;

    // Open-top hollow ceramic cylinder so internal ShaderMaterial liquid & crema are 100% visible
    const cupBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.065, 0.13, 28, 1, true),
      wallMat
    );
    cupBody.position.y = 0.078;
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

    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.98, 0.52),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.hangingSignTexture,
        emissive: 0xf59e0b,
        emissiveMap: this.hangingSignTexture,
        emissiveIntensity: 0.65,
        roughness: 0.25,
      })
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

    registerGroup.position.set(-1.95, 1.0, 0.28);
    this.registerInteractiveTool(
      'register',
      registerGroup,
      'Order Register & Recipe Codex — Click to View Recipes',
      1,
      () => this.callbacks.onToolAction('open_recipes_modal')
    );
    st1Group.add(registerGroup);

    // 2. Glass Pastry Display Case at x = -1.50, z = 0.24
    const pastryCaseGroup = new THREE.Group();
    const caseBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.06, 0.32),
      this.counterWoodMat
    );
    caseBase.position.y = 0.03;
    pastryCaseGroup.add(caseBase);

    const glassCaseMat = new THREE.MeshPhysicalMaterial({
      color: 0xfffbeb,
      roughness: 0.08,
      transmission: this.isSoftwareGl ? 0 : 0.8,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.32 : 0.88,
    });
    const glassHood = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.3), glassCaseMat);
    glassHood.position.y = 0.17;
    pastryCaseGroup.add(glassHood);

    const pastryShelf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.24), brassMat);
    pastryShelf.position.y = 0.15;
    pastryCaseGroup.add(pastryShelf);

    // 3D Croissants & Matcha Tarts inside Pastry Case
    const croissantMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55 });
    [-0.07, 0.07].forEach((px) => {
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

    pastryCaseGroup.position.set(-1.5, 1.0, 0.24);
    st1Group.add(pastryCaseGroup);

    // 3. Overhead Hanging Order Tickets (x = -2.10 to -1.50, y = 1.82) with Dynamic CanvasTextures
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.032, 0.032), brassMat);
    rail.position.set(-1.8, 1.98, 0.18);
    st1Group.add(rail);

    this.ticketTextures = [];
    const ticketXs = [-2.1, -1.8, -1.5];
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

  // Station 2 (x: -1.15 to 0.35): Knock Box (-1.08, 0.34), Burr Grinder (-0.82, 0.22), Tamping Mat (-0.52, 0.36), Dual-Boiler Espresso Machine (-0.05, 0.18), Rinse Sink (0.32, 0.28)
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

    // 1. Knock Box at x = -1.08, z = 0.34
    const knockBoxGroup = new THREE.Group();
    const kbOuter = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.2), brushedSteelMat);
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

    knockBoxGroup.position.set(-1.08, 1.0, 0.34);
    st2Group.add(knockBoxGroup);

    // 2. Conical Burr Grinder at x = -0.82, z = 0.22
    this.grinderGroup = new THREE.Group();
    const grinderBaseFoot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.135, 0.04, 24),
      chromeMat
    );
    grinderBaseFoot.position.y = 0.02;
    this.grinderGroup.add(grinderBaseFoot);

    const grinderTower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.12, 0.34, 24),
      matteBlackMat
    );
    grinderTower.position.y = 0.2;
    grinderTower.castShadow = true;
    this.grinderGroup.add(grinderTower);

    const grindCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115, 0.115, 0.045, 24),
      brassMat
    );
    grindCollar.position.y = 0.39;
    this.grinderGroup.add(grindCollar);

    const forkLeft = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.11), chromeMat);
    forkLeft.position.set(-0.042, 0.13, 0.13);
    this.grinderGroup.add(forkLeft);
    const forkRight = forkLeft.clone();
    forkRight.position.x = 0.042;
    this.grinderGroup.add(forkRight);

    const chute = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.14, 16), chromeMat);
    chute.rotation.x = 0.45;
    chute.position.set(0, 0.27, 0.12);
    this.grinderGroup.add(chute);

    const hopperGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xfffbeb,
      roughness: 0.08,
      metalness: 0,
      transmission: this.isSoftwareGl ? 0 : 0.78,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.38 : 0.92,
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

    this.grinderGroup.position.set(-0.82, 1.0, 0.22);
    this.registerInteractiveTool(
      'grinder',
      this.grinderGroup,
      'Conical Burr Grinder — Click to Grind 18g Fresh Dark-Roast Beans',
      2,
      () => this.callbacks.onToolAction('grind')
    );
    st2Group.add(this.grinderGroup);

    // 3. Silicone Tamping Mat & Calibrated Tamper at x = -0.52, z = 0.36
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

    tampStationGroup.position.set(-0.52, 1.0, 0.36);
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

    this.portafilterGroup.position.set(-0.47, 1.05, 0.37);
    st2Group.add(this.portafilterGroup);

    // 5. Commercial Dual-Boiler Espresso Machine at x = -0.05, z = 0.18 with Open Front Brewing Bay
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
        brassMat
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

    const warmerRail = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.36), brassMat);
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

    espressoGroup.position.set(-0.05, 1.0, 0.18);
    this.registerInteractiveTool(
      'espresso',
      espressoGroup,
      'Commercial Dual-Boiler Espresso Machine — Click to Pull 9-Bar Double Shot',
      2,
      () => this.callbacks.onToolAction('pull_espresso')
    );
    st2Group.add(espressoGroup);

    // 6. Stainless Rinse Sink at x = 0.32, z = 0.28
    const sinkGroup = new THREE.Group();
    const sinkRim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.24), brushedSteelMat);
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

    sinkGroup.position.set(0.32, 1.0, 0.28);
    this.registerInteractiveTool(
      'sink',
      sinkGroup,
      'Stainless Rinse Sink [Key R] — Click to Dump & Rinse Cup',
      2,
      () => this.callbacks.onToolAction('rinse_cup')
    );
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
      transmission: this.isSoftwareGl ? 0 : 0.88,
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
    const brassPumpMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.22,
      metalness: 0.88,
    });

    // 1. Dedicated Drink Assembly Mat / Coaster at x = 0.62, z = 0.38 (Completely clear of Ice Bin!)
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

    assemblyCoasterGroup.position.set(0.62, 1.0, 0.38);
    st3Group.add(assemblyCoasterGroup);

    // 2. Stainless Milk Pitcher at x = 0.44, z = 0.36
    this.milkPitcherGroup = new THREE.Group();
    const pitcherBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.064, 0.076, 0.175, 24, 1, true),
      chromeMat
    );
    pitcherBody.position.y = 0.088;
    this.milkPitcherGroup.add(pitcherBody);

    const pitcherBottom = new THREE.Mesh(new THREE.CircleGeometry(0.076, 24), chromeMat);
    pitcherBottom.rotation.x = Math.PI / 2;
    pitcherBottom.position.y = 0.002;
    this.milkPitcherGroup.add(pitcherBottom);

    const spoutLip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.01, 0.035, 12),
      chromeMat
    );
    spoutLip.position.set(0.062, 0.162, 0);
    spoutLip.rotation.z = -0.45;
    this.milkPitcherGroup.add(spoutLip);

    const pHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.042, 0.008, 10, 20, Math.PI),
      chromeMat
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

    this.milkPitcherGroup.position.set(0.44, 1.0, 0.36);
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

    // 3. Recessed Polycarbonate Ice Bin at x = 0.85, z = 0.16 (Flush with counter back, zero overlap with Coaster at z = 0.38!)
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

    iceBinGroup.position.set(0.85, 1.0, 0.16);
    this.registerInteractiveTool(
      'ice',
      iceBinGroup,
      'Recessed Polycarbonate Ice Bin & Scoop — Click to Scoop Crystal Ice Cubes',
      3,
      () => this.callbacks.onToolAction('add_ice')
    );
    st3Group.add(iceBinGroup);

    // 4. Tiered Wooden Syrup Rack at x = 1.22, z = 0.18 (Vanilla, Caramel, Chocolate)
    const rackStep = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.045, 0.18),
      this.counterWoodMat
    );
    rackStep.position.set(1.22, 1.022, 0.18);
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
        x: 1.08,
      },
      {
        flavor: 'caramel',
        title: 'CARAMEL',
        sub: 'SALTED BUTTER',
        labelText: 'Salted Butter Caramel Syrup',
        color: 0xd97706,
        bgHex: '#ffedd5',
        borderHex: '#b45309',
        x: 1.22,
      },
      {
        flavor: 'chocolate',
        title: 'CACAO',
        sub: 'DARK GANACHE',
        labelText: 'Single-Origin Dark Cacao Ganache',
        color: 0x451a03,
        bgHex: '#f5f5f4',
        borderHex: '#78350f',
        x: 1.36,
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

    // 5. Ceramic Matcha Chawan Bowl & Bamboo Whisk at x = 1.48, z = 0.34
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
    matchaGroup.position.set(1.48, 1.0, 0.34);
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

    // 1. Elevated Walnut Pickup Coaster & Brass Service Bell at x = -1.35, z = 0.12 (Front Counter Edge)
    const serveTrayGroup = new THREE.Group();
    const trayBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.16, 0.03, 24),
      this.counterWoodMat
    );
    trayBase.position.y = 0.015;
    serveTrayGroup.add(trayBase);

    const bellDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.034, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      brassMat
    );
    bellDome.position.set(0.11, 0.03, 0.02);
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
    this.bellRippleRingMesh.position.set(0.11, 0.065, 0.02);
    this.bellRippleRingMesh.visible = false;
    serveTrayGroup.add(this.bellRippleRingMesh);

    this.ghostCupMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.068, 0.135, 20),
      this.ghostSnapMat
    );
    this.ghostCupMesh.position.y = 0.095;
    serveTrayGroup.add(this.ghostCupMesh);

    serveTrayGroup.position.set(-1.35, 1.0, 0.12);
    this.registerInteractiveTool(
      'serve',
      serveTrayGroup,
      'Customer Pickup Coaster & Service Bell — Click to Ring Bell & Handoff Drink [Space]',
      4,
      () => this.callbacks.onToolAction('serve_drink')
    );
    st4Group.add(serveTrayGroup);

    // 2. Realistic Cafe Furniture, Woven Area Rugs & Tabletop Props (Vases, Napkin Holders, Laptop)
    const tablePositions = [
      new THREE.Vector3(-1.95, 0, -2.95),
      new THREE.Vector3(0.15, 0, -3.55),
      new THREE.Vector3(2.15, 0, -2.85),
    ];

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.7,
    });
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.75,
    });
    const rugColors = [0x78350f, 0x065f46, 0x9a3412];

    tablePositions.forEach((pos, idx) => {
      const tGroup = new THREE.Group();

      // Woven Area Rug under Table
      const rug = new THREE.Mesh(
        new THREE.CircleGeometry(0.95, 28),
        new THREE.MeshStandardMaterial({
          color: rugColors[idx % rugColors.length],
          roughness: 0.9,
        })
      );
      rug.rotation.x = -Math.PI / 2;
      rug.position.y = 0.008;
      tGroup.add(rug);

      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.24, 0.74, 16), ironMat);
      pedestal.position.y = 0.37;
      tGroup.add(pedestal);

      // Table 1 is a rectangular communal wooden table; Tables 0 & 2 are round walnut bistro tables
      const tabletop =
        idx === 1
          ? new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.05, 0.86), this.counterWoodMat)
          : new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.05, 24), this.counterWoodMat);
      tabletop.position.y = 0.75;
      tabletop.castShadow = true;
      tabletop.receiveShadow = true;
      tGroup.add(tabletop);

      // Mid-Century Wooden Chair with Cushioned Seat
      const chairSeat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16),
        this.counterWoodMat
      );
      chairSeat.position.set(0, 0.43, 0.62);
      tGroup.add(chairSeat);

      const seatCushion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.2, 0.025, 16),
        cushionMat
      );
      seatCushion.position.set(0, 0.46, 0.62);
      tGroup.add(seatCushion);

      const chairBack = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.34, 0.04),
        this.counterWoodMat
      );
      chairBack.position.set(0, 0.68, 0.8);
      tGroup.add(chairBack);

      // Cozy Tabletop Props: Tiny Ceramic Vase with Monstera Cutting + Wooden Napkin Holder + Coaster
      const vase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.045, 0.11, 14),
        this.ceramicMugMat
      );
      vase.position.set(-0.18, 0.83, -0.12);
      tGroup.add(vase);

      const cuttingLeaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.45 })
      );
      cuttingLeaf.scale.set(1.2, 0.3, 1.6);
      cuttingLeaf.position.set(-0.18, 0.92, -0.14);
      cuttingLeaf.rotation.x = 0.4;
      tGroup.add(cuttingLeaf);

      const napkinHolder = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.075, 0.045),
        this.counterWoodMat
      );
      napkinHolder.position.set(0.18, 0.81, -0.12);
      tGroup.add(napkinHolder);

      // 3D Open Laptop with Glowing Screen on Table 1 (and Table 2) for Laptop-Work Customers
      if (idx === 1 || idx === 2) {
        const laptopBase = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.012, 0.2),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 })
        );
        laptopBase.position.set(0, 0.782, 0.18);
        tGroup.add(laptopBase);

        const laptopScreen = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.18, 0.01),
          new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            emissive: 0x38bdf8,
            emissiveIntensity: 0.55,
          })
        );
        laptopScreen.position.set(0, 0.87, 0.08);
        laptopScreen.rotation.x = -0.25;
        tGroup.add(laptopScreen);
      }

      tGroup.position.copy(pos);
      st4Group.add(tGroup);
    });

    // 3. Instanced Monstera Botanical Leaves Framing the Garage Garden
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
      const x = side * (2.8 + (i % 5) * 0.38) + Math.sin(i) * 0.4;
      const y = 0.6 + (i % 6) * 0.48;
      const z = -1.4 - (i % 7) * 0.78;
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

    tabletGroup.position.set(1.78, 1.0, 0.32);
    this.registerInteractiveTool(
      'upgrade-tablet',
      tabletGroup,
      'Shop Management Tablet — Click to Buy Cafe Upgrades',
      5,
      () => this.callbacks.onToolAction('open_upgrades_modal')
    );
    st5Group.add(tabletGroup);

    // 2. 3D Vinyl Turntable + Album Sleeve Stand at x = 2.15, z = 0.24
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

    turntableGroup.position.set(2.15, 1.0, 0.24);
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

    sleeveStandGroup.position.set(2.48, 1.0, 0.12);
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
    ctx.fillStyle = 'rgba(28, 20, 16, 0.86)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 112, 48, 24);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 33);
    tex.needsUpdate = true;
  }

  // Articulated Multi-Part 3D Human Customer Rig with Smartphone & Activity Bubble
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

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.052, 8), skinMat);
    nose.rotation.x = Math.PI / 2 - 0.2;
    nose.position.set(0, 0.185, 0.165);
    neckJoint.add(nose);

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

    const hairCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.174, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairCrown.position.y = 0.205;
    hairCrown.rotation.x = -0.18;
    neckJoint.add(hairCrown);

    const styleVariant = seed % 4;
    if (styleVariant === 0) {
      const topBun = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 14), hairMat);
      topBun.position.set(0, 0.38, -0.04);
      neckJoint.add(topBun);
    } else if (styleVariant === 1) {
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
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.06), hairMat);
      fringe.position.set(0.02, 0.285, 0.135);
      fringe.rotation.z = -0.15;
      neckJoint.add(fringe);
    }

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

    // 3D Smartphone in Left Hand (Used in SELFIE_MODE)
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

    // Overhead Social Activity Badge Sprite (📸, 💬 ☕, 💻, ❤️)
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
    };
  }

  private syncCustomerActors() {
    const activeIds = new Set(this.gameState.customers.map((c) => c.id));

    for (const [id, actor] of this.customerActors.entries()) {
      if (!activeIds.has(id)) {
        this.customersRoot.remove(actor.group);
        actor.activityTexture.dispose();
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
        const startPos = new THREE.Vector3(-1.95 + orderingSlot * 0.78, 0, -1.55);
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
        actor.phoneMesh.visible = false;
        actor.activitySprite.visible = false;
        orderingSlot++;
      } else {
        // Only reveal heldCup after Stage 1 of the pickup handoff completes
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
      grind: 1.15,
      tamp: 1.05,
      pull_espresso: 1.45,
      steam_milk: 1.45,
      add_ice: 0.95,
      add_syrup: 1.05,
      rinse_cup: 0.7,
      serve_drink: 1.65,
    };

    // Identify the customer who just got served so they walk to the Pickup Counter (-1.35, -0.65)
    let servedCustomerId: string | undefined;
    if (type === 'serve_drink') {
      const seatedList = this.gameState.customers.filter((c) => c.state === 'seated');
      const newestSeated = seatedList[seatedList.length - 1] || this.gameState.customers[0];
      servedCustomerId = newestSeated?.id;
      this.activePickupCustomerId = servedCustomerId || null;
      this.serveReachTimer = 1.65;
    }

    this.stepAnim = {
      type,
      progress: 0,
      duration: durations[type] || 1.1,
      flavor,
      badgeText,
      servedCustomerId,
    };

    if (type === 'steam_milk') {
      this.drawFloatingBadgeText('65°C MICROFOAM', '#10b981');
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
    this.gameState = newState;

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
      this.scene.background = new THREE.Color(0x231a14);
      this.scene.fog = new THREE.FogExp2(0x231a14, 0.036);
      this.sunLight.color.setHex(0xfff1d0);
      this.sunLight.intensity = 2.4;
      this.hemiLight.color.setHex(0xbae6fd);
      this.hemiLight.groundColor.setHex(0x451a03);
      this.hemiLight.intensity = 0.95;
      this.rainDropsInstanced.visible = false;
    } else if (weather === 'golden') {
      this.scene.background = new THREE.Color(0x2b150d);
      this.scene.fog = new THREE.FogExp2(0x2b150d, 0.04);
      this.sunLight.color.setHex(0xf97316);
      this.sunLight.intensity = 2.6;
      this.hemiLight.color.setHex(0xfdba74);
      this.hemiLight.groundColor.setHex(0x27120b);
      this.hemiLight.intensity = 0.85;
      this.rainDropsInstanced.visible = false;
    } else {
      this.scene.background = new THREE.Color(0x0f172a);
      this.scene.fog = new THREE.FogExp2(0x0f172a, 0.048);
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

  // Updates Coffee Grounds, Tamped Puck visibility, and Cup Progression State Machine target
  private updateActiveCupVisuals() {
    const cup = this.gameState.currentCup;
    const hasAnyLiquid = cup.hasEspresso || cup.hasSteamedMilk || cup.syrup !== 'none';

    // High-Visibility Grounds & Tamped Puck State Machine:
    // fluffyGroundsMesh visible when ground but not yet tamped
    this.fluffyGroundsMesh.visible = cup.hasGrounds && !cup.isTamped;
    // tampedPuckMesh stays visible throughout tamping, locking into group head, and pulling the shot!
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

    // Cup Progression State Machine (Stop snapping back to Espresso Machine!):
    // Stage C: Station 4 Customer Pickup Coaster (-1.35, 1.03, 0.12)
    // Stage B: Post-Shot or Milk/Ice/Syrup/Matcha -> Station 3 Drink Assembly Coaster (0.62, 1.01, 0.38)
    // Stage A: Empty / Grinding / Tamping / Pulling Shot -> Station 2 Espresso Drip Tray under Left Grouphead (-0.19, 1.055, 0.34)
    const isStageB =
      cup.hasEspresso ||
      cup.hasSteamedMilk ||
      cup.hasIce ||
      cup.syrup !== 'none' ||
      this.gameState.activeStation === 3;

    if (this.gameState.activeStation === 4 && hasAnyLiquid) {
      this.cupTargetPos.set(-1.35, 1.03, 0.12);
    } else if (isStageB) {
      this.cupTargetPos.set(0.62, 1.01, 0.38);
    } else {
      this.cupTargetPos.set(-0.19, 1.055, 0.34);
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
    else if (cup.hasEspresso) targetFill = 0.54;
    else if (cup.syrup !== 'none') targetFill = 0.28;

    // During active serve_drink Stage 1, keep the cup looking full on the Pickup Coaster!
    if (this.stepAnim?.type === 'serve_drink' && this.stepAnim.progress < 0.65) {
      targetFill = 0.96;
    } else if (this.stepAnim?.type === 'pull_espresso') {
      targetFill = Math.max(targetFill, Math.min(0.54, this.stepAnim.progress * 0.62));
    } else if (this.stepAnim?.type === 'steam_milk' && this.stepAnim.progress > 0.45) {
      const pourP = (this.stepAnim.progress - 0.45) / 0.55;
      targetFill = Math.max(targetFill, 0.54 + pourP * 0.42);
    }

    this.currentLiquidFill = THREE.MathUtils.lerp(this.currentLiquidFill, targetFill, damp);
    const targetMilk =
      cup.hasSteamedMilk ||
      (this.stepAnim?.type === 'steam_milk' && this.stepAnim.progress > 0.5) ||
      (this.stepAnim?.type === 'serve_drink' && this.stepAnim.progress < 0.65)
        ? 1.0
        : 0.0;
    this.currentLiquidMilk = THREE.MathUtils.lerp(this.currentLiquidMilk, targetMilk, damp);

    // Target base liquid color & crema color
    if (cup.syrup === 'matcha') {
      _targetColor.setHex(0x4d7c0f);
      _targetCremaColor.setHex(0x84cc16);
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
      // Anchor bottom of liquid cylinder to cup interior floor (y = 0.026) so full liquid reaches y = 0.138
      this.activeCupLiquidMesh.position.y = 0.026 + 0.056 * scaleY;
    } else {
      this.activeCupLiquidMesh.visible = false;
    }
  }

  // Updates multi-stage 3D barista step choreography across the re-spaced counter
  private updateBaristaStepChoreography(dt: number) {
    const damp = 1 - Math.exp(-16.0 * dt);

    // Reset default rest transforms
    this.grinderGroup.position.set(-0.82, 1.0, 0.22);
    this.groundStreamGroup.visible = false;
    this.tampPressureRingMesh.visible = false;
    this.espressoStreamsGroup.visible = false;
    this.milkPourStreamMesh.visible = false;
    this.syrupRibbonMesh.visible = false;
    this.floatingBadgeSprite.visible = false;
    this.pickupSpeechSprite.visible = false;
    this.bellRippleRingMesh.visible = false;

    this.tamperMeshGroup.position.set(-0.075, 0.02, -0.02);
    this.tamperMeshGroup.rotation.set(0, 0, 0);

    this.milkPitcherGroup.position.set(0.44, 1.0, 0.36);
    this.milkPitcherGroup.rotation.set(0, 0, 0);
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
      // Locked in Left Grouphead of Espresso Machine (-0.05 - 0.14 = -0.19)
      this.portafilterGroup.position.set(-0.19, 1.26, 0.34);
      this.portafilterGroup.rotation.set(0, 0, 0);
    } else {
      // Resting on Tamping Mat (-0.52 + 0.05 = -0.47, z = 0.37)
      this.portafilterGroup.position.set(-0.47, 1.05, 0.37);
      this.portafilterGroup.rotation.set(0, 0, 0);
    }

    // Smoothly lerp active cup toward its workflow stage target position (Stage A, Stage B, or Stage C)
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
      const hp = 1 - this.serveReachTimer / 1.65;
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
    const smoothP = p * p * (3 - 2 * p);

    if (this.stepAnim.type === 'grind') {
      if (p < 0.75) {
        const sub = Math.min(1, p / 0.2);
        this.portafilterGroup.position.set(
          THREE.MathUtils.lerp(-0.47, -0.82, sub),
          THREE.MathUtils.lerp(1.05, 1.15, sub),
          THREE.MathUtils.lerp(0.37, 0.35, sub)
        );
        this.grinderGroup.position.x = -0.82 + Math.sin(this.elapsed * 55) * 0.004;
        this.hopperBeansGroup.rotation.y += dt * 9.5;
        this.groundStreamGroup.visible = p > 0.15;
        this.groundStreamGroup.children.forEach((speck, i) => {
          speck.position.y = -(((p * 6 + i * 0.1) % 1) * 0.08);
        });
        this.fluffyGroundsMesh.visible = true;
        this.fluffyGroundsMesh.scale.setScalar(Math.max(0.15, (p - 0.1) / 0.65));
      } else {
        const back = (p - 0.75) / 0.25;
        this.fluffyGroundsMesh.scale.setScalar(1);
        this.portafilterGroup.position.set(
          THREE.MathUtils.lerp(-0.82, -0.47, back),
          THREE.MathUtils.lerp(1.15, 1.05, back) + Math.sin(back * Math.PI) * 0.05,
          THREE.MathUtils.lerp(0.35, 0.37, back)
        );
      }
    } else if (this.stepAnim.type === 'tamp') {
      const arc = Math.sin(p * Math.PI);
      const press = p > 0.3 && p < 0.75 ? Math.sin(((p - 0.3) / 0.45) * Math.PI) : 0;
      this.tamperMeshGroup.position.set(
        THREE.MathUtils.lerp(-0.075, 0.05, Math.min(1, arc * 1.4)),
        0.02 + arc * 0.12 - press * 0.055,
        THREE.MathUtils.lerp(-0.02, 0.01, Math.min(1, arc * 1.4))
      );
      if (p > 0.35 && p < 0.85) {
        this.tampPressureRingMesh.visible = true;
        const ringScale = 0.85 + ((p - 0.35) / 0.5) * 0.55;
        this.tampPressureRingMesh.scale.setScalar(ringScale);
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(-0.47, 1.32 + p * 0.06, 0.37);
      }
      // Keep tampedPuckMesh clearly visible at y = 0.026
      if (p > 0.4) {
        this.fluffyGroundsMesh.visible = false;
        this.tampedPuckMesh.visible = true;
      }
    } else if (this.stepAnim.type === 'pull_espresso') {
      // Keep cup on Espresso Drip Tray under Left Grouphead during extraction, then glide to Station 3 Assembly Coaster
      if (p < 0.82) {
        this.activeBaristaCupGroup.position.set(-0.19, 1.055, 0.34);
      } else {
        const glide = (p - 0.82) / 0.18;
        this.activeBaristaCupGroup.position.set(
          THREE.MathUtils.lerp(-0.19, 0.62, glide),
          THREE.MathUtils.lerp(1.055, 1.01, glide),
          THREE.MathUtils.lerp(0.34, 0.38, glide)
        );
      }
      const lockProgress = Math.min(1, p / 0.25);
      this.portafilterGroup.position.set(-0.19, 1.26, 0.34);
      this.portafilterGroup.rotation.y = THREE.MathUtils.lerp(-0.78, 0, lockProgress);
      this.tampedPuckMesh.visible = true;

      this.groupHeadLedMat.emissiveIntensity = 1.6 + Math.sin(this.elapsed * 16) * 0.4;
      const needleAngle = THREE.MathUtils.lerp(0.8, -0.75, Math.min(1, p * 1.5));
      this.gaugeNeedles.forEach((n) => {
        n.rotation.z = needleAngle + Math.sin(this.elapsed * 30) * 0.03;
      });

      if (p > 0.2 && p < 0.84) {
        this.espressoStreamsGroup.visible = true;
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(-0.19, 1.54, 0.34);
      }
    } else if (this.stepAnim.type === 'steam_milk') {
      // Cup stays on Station 3 Drink Assembly Coaster (0.62, 1.01, 0.38)
      this.activeBaristaCupGroup.position.set(0.62, 1.01, 0.38);
      if (p < 0.5) {
        const sub = Math.sin((p / 0.5) * Math.PI);
        this.milkPitcherGroup.position.set(
          THREE.MathUtils.lerp(0.44, 0.24, sub),
          THREE.MathUtils.lerp(1.0, 1.12, sub),
          0.36
        );
        this.steamWandPivot.rotation.z = -0.35 * sub;
        this.pitcherMilkMesh.rotation.y += dt * 12;
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(0.24, 1.38, 0.36);
      } else {
        const pourP = (p - 0.5) / 0.5;
        const pourArc = Math.sin(pourP * Math.PI);
        this.milkPitcherGroup.position.set(
          0.49,
          1.0 + pourArc * 0.22,
          0.38
        );
        this.milkPitcherGroup.rotation.z = -pourArc * 0.88;
        this.milkPourStreamMesh.visible = pourArc > 0.2;
        this.milkPourStreamMesh.position.set(0.59, 1.19, 0.38);
      }
    } else if (this.stepAnim.type === 'add_ice') {
      this.activeBaristaCupGroup.position.set(0.62, 1.01, 0.38);
      const arc = Math.sin(p * Math.PI);
      this.iceScoopGroup.position.set(
        THREE.MathUtils.lerp(0.02, -0.22, arc),
        0.065 + arc * 0.2,
        THREE.MathUtils.lerp(0.01, 0.22, arc)
      );
      this.iceScoopGroup.rotation.z = -arc * 0.85;
      this.activeCupIceGroup.visible = true;
      const dropH = Math.max(0, (1 - Math.min(1, p * 1.6)) * 0.14);
      this.activeCupIceGroup.children.forEach((cube, idx) => {
        cube.position.y = 0.132 + dropH + idx * 0.018 * (1 - smoothP);
      });
    } else if (this.stepAnim.type === 'add_syrup') {
      this.activeBaristaCupGroup.position.set(0.62, 1.01, 0.38);
      const fl = this.stepAnim.flavor || 'vanilla';
      const rMat = this.syrupRibbonMesh.material as THREE.MeshStandardMaterial;

      if (fl === 'matcha') {
        rMat.color.setHex(0x65a30d);
        this.matchaWhiskGroup.position.x = Math.sin(p * Math.PI * 6) * 0.026;
        this.matchaWhiskGroup.position.z = Math.cos(p * Math.PI * 3) * 0.02;
      } else {
        if (fl === 'vanilla') rMat.color.setHex(0xfde68a);
        else if (fl === 'caramel') rMat.color.setHex(0xd97706);
        else rMat.color.setHex(0x451a03);

        const pump = this.syrupPumpHeads.get(fl);
        if (pump) {
          const doublePump = Math.abs(Math.sin(p * Math.PI * 2));
          pump.position.y = 0.27 - doublePump * 0.028;
        }
      }

      this.syrupRibbonMesh.visible = true;
      this.syrupRibbonMesh.position.set(0.62, 1.2, 0.38);
      this.activeCupDrizzleRing.visible = true;
      this.activeCupDrizzleRing.rotation.z = p * Math.PI * 4;
    } else if (this.stepAnim.type === 'serve_drink') {
      // 2-Stage Physical Pickup Choreography:
      // Stage 1 (0..0.48): Barista slides cup onto Station 4 Pickup Coaster (-1.35, 1.03, 0.12) & rings brass service bell
      // Stage 2 (0.48..1.0): Customer stands at Pickup Counter (-1.35, -0.65), reaches both arms, lifts cup, and displays delighted speech bubble
      if (p < 0.48) {
        const s1 = p / 0.48;
        this.activeBaristaCupGroup.position.set(
          THREE.MathUtils.lerp(0.62, -1.35, s1),
          1.03 + Math.sin(s1 * Math.PI) * 0.06,
          THREE.MathUtils.lerp(0.38, 0.12, s1)
        );
        this.bellRippleRingMesh.visible = s1 > 0.5;
        this.bellRippleRingMesh.scale.setScalar(1 + (s1 - 0.5) * 3.5);
      } else {
        const s2 = (p - 0.48) / 0.52;
        // Cup lifts from Pickup Coaster toward Customer's hands, then attaches to Customer's right hand
        this.activeBaristaCupGroup.visible = s2 < 0.35;
        this.activeBaristaCupGroup.position.set(
          -1.35,
          1.03 + s2 * 0.14,
          THREE.MathUtils.lerp(0.12, -0.25, Math.min(1, s2 * 2.5))
        );
        this.pickupSpeechSprite.visible = true;
        this.pickupSpeechSprite.position.set(-1.35, 1.68 + s2 * 0.08, -0.55);
      }
      this.floatingBadgeSprite.visible = true;
      this.floatingBadgeSprite.position.set(-1.35, 1.38 + p * 0.22, 0.12);
    }
  }

  private updateSimulationVisuals(dt: number) {
    const dampFactor = 1 - Math.exp(-14.0 * dt);

    // 1. Update Dynamic Cup ShaderMaterial Liquid & Multi-Stage Barista Choreography
    this.updateDynamicCupShaderLiquid(dt);
    this.updateBaristaStepChoreography(dt);

    // 2. Camera Mode: "TITLE_ORBIT" vs First-Person Station Lerp
    const isTitle = this.gameState.phase === 'title';
    this.titleHeroCupGroup.visible = isTitle;
    this.titlePlaqueGroup.visible = isTitle;

    if (isTitle) {
      const swayX = Math.sin(this.elapsed * 0.55) * 0.24;
      const swayY = Math.cos(this.elapsed * 0.4) * 0.03;
      _targetPos.set(0.2 + swayX, 1.44 + swayY, 1.48);
      _targetLook.set(0.12, 1.15, -0.05);
    } else {
      const preset = STATION_CAMERAS[this.gameState.activeStation] || STATION_CAMERAS[2];
      _targetPos.copy(preset.pos);
      const animFocusZoom = this.stepAnim ? -0.14 : 0;
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

    // 5. Smart Ingredient Highlighter
    const pinnedOrder =
      this.gameState.customers.find(
        (c) => c.id === this.gameState.pinnedOrderId && c.state === 'ordering'
      ) || this.gameState.customers.find((c) => c.state === 'ordering');
    const recipe = pinnedOrder ? getRecipeById(pinnedOrder.recipeId) : null;
    const nextStep = getNextRecommendedStep(this.gameState.currentCup, recipe, pinnedOrder);
    const effectiveSyrup = pinnedOrder?.customSyrup || recipe?.syrup || 'vanilla';
    const recommendedToolKey =
      nextStep.toolKey === 'syrup' ? `syrup-${effectiveSyrup}` : nextStep.toolKey;

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
      const baseY = isTitleCupSteam ? 1.18 : 1.2;
      const baseZ = isTitleCupSteam ? 0.42 : this.activeBaristaCupGroup.position.z;

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
          2.15 + Math.sin(t * 5 + i) * 0.16,
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
        const rx = -4.5 + (i % 15) * 0.65;
        const rz = -1.6 - Math.floor(i / 15) * 1.4;
        _dummyObj.position.set(rx, 3.6 - t * 3.6, rz);
        _dummyObj.scale.setScalar(1);
        _dummyObj.updateMatrix();
        this.rainDropsInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      this.rainDropsInstanced.instanceMatrix.needsUpdate = true;
    }

    // 9. Animate Articulated 3D Customers (2-Stage Pickup Counter Handoff + Lifelike Seated Social Behaviors)
    const seatCoords = [
      new THREE.Vector3(-1.95, 0, -2.33),
      new THREE.Vector3(0.15, 0, -2.93),
      new THREE.Vector3(2.15, 0, -2.23),
    ];

    let orderQueueIdx = 0;
    this.gameState.customers.forEach((cust) => {
      const actor = this.customerActors.get(cust.id);
      if (!actor) return;

      const isPickingUpDrink =
        this.activePickupCustomerId === cust.id &&
        this.stepAnim?.type === 'serve_drink' &&
        this.stepAnim.progress < 0.82;

      if (isPickingUpDrink) {
        // Walk directly to Station 4 Pickup Counter (-1.35, -0.65) to grasp drink!
        _targetPos.set(-1.35, 0, -0.65);
        actor.heldCup.visible = (this.stepAnim?.progress || 0) >= 0.55;
      } else if (cust.state === 'ordering') {
        _targetPos.set(-1.95 + orderQueueIdx * 0.78, 0, -0.95);
        orderQueueIdx++;
      } else if (cust.state === 'seated' && cust.seatIndex !== null) {
        _targetPos.copy(seatCoords[cust.seatIndex] || seatCoords[0]);
        actor.heldCup.visible = true;
      } else {
        _targetPos.set(3.8, 0, -4.8);
      }

      const dx = _targetPos.x - actor.currentPos.x;
      const dz = _targetPos.z - actor.currentPos.z;
      const dist = Math.hypot(dx, dz);

      actor.currentPos.lerp(_targetPos, dampFactor * (isPickingUpDrink ? 0.95 : 0.65));
      actor.group.position.copy(actor.currentPos);

      // Periodic Eye Blinking
      const blinkCycle = (this.elapsed + actor.seed * 0.37) % 3.6;
      const eyeScaleY = blinkCycle < 0.12 ? 0.1 : 1.0;
      actor.leftEyeMesh.scale.y = eyeScaleY;
      actor.rightEyeMesh.scale.y = eyeScaleY;

      if (isPickingUpDrink && dist <= 0.18) {
        // Stage 2 Customer Pickup Pose at (-1.35, -0.65): Both articulated arms reach forward to lift the cup!
        actor.group.rotation.y = 0;
        actor.pelvisGroup.position.y = 0.58;
        actor.leftHipJoint.rotation.x = 0;
        actor.rightHipJoint.rotation.x = 0;
        actor.leftKneeJoint.rotation.x = 0;
        actor.rightKneeJoint.rotation.x = 0;

        actor.leftShoulderJoint.rotation.x = -0.92;
        actor.leftElbowJoint.rotation.x = -0.45;
        actor.rightShoulderJoint.rotation.x = -0.98;
        actor.rightElbowJoint.rotation.x = -0.48;
        actor.neckJoint.rotation.x = 0.12;
        actor.activitySprite.visible = false;
      } else if (dist > 0.08) {
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
        actor.phoneMesh.visible = false;
        actor.activitySprite.visible = false;

        if (actor.heldCup.visible) {
          actor.rightShoulderJoint.rotation.x = -0.55;
          actor.rightElbowJoint.rotation.x = -0.85;
        } else {
          actor.rightShoulderJoint.rotation.x = Math.sin(walkPhase) * 0.35;
          actor.rightElbowJoint.rotation.x = -0.25;
        }
      } else if (cust.state === 'seated') {
        // Lifelike Seated Cafe Activity Behaviors (SELFIE_MODE, CHATTING_MODE, LAPTOP_WORK_MODE, SIPPING & RELAXING)
        actor.group.rotation.y = Math.PI;
        actor.pelvisGroup.position.y = 0.44;
        actor.leftHipJoint.rotation.x = -1.35;
        actor.rightHipJoint.rotation.x = -1.35;
        actor.leftKneeJoint.rotation.x = 1.35;
        actor.rightKneeJoint.rotation.x = 1.35;
        actor.activitySprite.visible = true;

        const behavior = cust.socialBehavior || 'relaxing';
        const wave = Math.sin(this.elapsed * 2.2 + actor.seed);
        const sipWave = Math.max(0, Math.sin(this.elapsed * 1.5 + actor.seed));

        if (behavior === 'selfie') {
          // SELFIE_MODE: Holds coffee cup in right hand, raises 3D smartphone in left hand, tilts head, camera flash icon
          actor.phoneMesh.visible = true;
          actor.leftShoulderJoint.rotation.x = -1.25 + wave * 0.08;
          actor.leftElbowJoint.rotation.x = -0.65;
          actor.rightShoulderJoint.rotation.x = -0.65;
          actor.rightElbowJoint.rotation.x = -0.85;
          actor.neckJoint.rotation.z = 0.16 * Math.sin(this.elapsed * 1.4);
          actor.neckJoint.rotation.y = -0.22;
          const flashIcon = Math.sin(this.elapsed * 3.2) > 0.65 ? '📸 ✨' : '📸 ❤️';
          if (actor.lastActivityLabel !== flashIcon) {
            actor.lastActivityLabel = flashIcon;
            this.drawCustomerActivityBadge(actor.activityTexture, flashIcon);
          }
        } else if (behavior === 'chatting') {
          // CHATTING_MODE: Turns head toward neighbor, nods, expressive hand gestures, laughs (torso bounce)
          actor.phoneMesh.visible = false;
          actor.torsoGroup.position.y = 0.04 + Math.abs(wave) * 0.015;
          actor.neckJoint.rotation.y = Math.sin(this.elapsed * 1.8 + actor.seed) * 0.35;
          actor.neckJoint.rotation.x = Math.sin(this.elapsed * 4.2) * 0.08;
          actor.leftShoulderJoint.rotation.x = -0.55 + Math.sin(this.elapsed * 4.5) * 0.25;
          actor.leftElbowJoint.rotation.x = -0.75 + Math.cos(this.elapsed * 4.5) * 0.2;
          actor.rightShoulderJoint.rotation.x = -0.55 - sipWave * 0.4;
          actor.rightElbowJoint.rotation.x = -0.85 - sipWave * 0.45;
          const chatIcon = wave > 0 ? '💬 ☕' : '✨ 💬';
          if (actor.lastActivityLabel !== chatIcon) {
            actor.lastActivityLabel = chatIcon;
            this.drawCustomerActivityBadge(actor.activityTexture, chatIcon);
          }
        } else if (behavior === 'laptop') {
          // LAPTOP_WORK_MODE: Alternates between typing with both hands on tabletop laptop and sipping coffee
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
          const workIcon = isTyping ? '💻 ⚡' : '☕ 💻';
          if (actor.lastActivityLabel !== workIcon) {
            actor.lastActivityLabel = workIcon;
            this.drawCustomerActivityBadge(actor.activityTexture, workIcon);
          }
        } else {
          // SIPPING & RELAXING: Lifts cup to mouth, sips, looks around sunlit garden
          actor.phoneMesh.visible = false;
          actor.leftShoulderJoint.rotation.x = -0.35;
          actor.leftElbowJoint.rotation.x = -0.65;
          actor.rightShoulderJoint.rotation.x = -0.55 - sipWave * 0.48;
          actor.rightElbowJoint.rotation.x = -0.85 - sipWave * 0.55;
          actor.neckJoint.rotation.x = -sipWave * 0.22;
          actor.neckJoint.rotation.y = Math.sin(this.elapsed * 0.9 + actor.seed) * 0.25;
          const relaxIcon = sipWave > 0.4 ? '☕ ❤️' : '🌿 ✨';
          if (actor.lastActivityLabel !== relaxIcon) {
            actor.lastActivityLabel = relaxIcon;
            this.drawCustomerActivityBadge(actor.activityTexture, relaxIcon);
          }
        }
      } else {
        // Standing at Station 1 Order Counter
        actor.group.rotation.y = 0;
        actor.pelvisGroup.position.y = 0.58 + Math.sin(this.elapsed * 2.2 + actor.seed) * 0.008;
        actor.leftHipJoint.rotation.x = 0;
        actor.rightHipJoint.rotation.x = 0;
        actor.leftKneeJoint.rotation.x = 0;
        actor.rightKneeJoint.rotation.x = 0;

        actor.leftShoulderJoint.rotation.x = -0.25;
        actor.leftElbowJoint.rotation.x = -0.45;
        actor.rightShoulderJoint.rotation.x = -0.25;
        actor.rightElbowJoint.rotation.x = -0.45;
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
    this.herringboneFloorTexture?.dispose();
    this.patioCobbleTexture?.dispose();
    this.tampedPuckTexture?.dispose();
    this.vinylLabelTexture?.dispose();
    this.hangingSignTexture?.dispose();
    this.latteArtTexture?.dispose();
    this.floatingBadgeTexture?.dispose();
    this.pickupSpeechTexture?.dispose();
    this.ticketTextures.forEach((t) => t.dispose());
    this.cupLiquidShaderMat?.dispose();
    this.renderer.dispose();
  }
}
