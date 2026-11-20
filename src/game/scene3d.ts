import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { STUDIO_ICON_SVG_RAW, STUDIO_LOGO_SVG_RAW } from '../components/StudioLogo';
import {
  AudioModeId,
  BaristaStationId,
  CafeCatId,
  CafeCatSpec,
  CatCosmeticId,
  CatLoadout,
  ClimateState,
  CupVesselType,
  CustomerOrder,
  CustomerSkinPackId,
  DeliveryRiderVariant,
  KlasikGameState,
  LOUNGE_SEAT_COORDS,
  LOUNGE_TABLE_LAYOUT,
  MIATA_BAY,
  PastryId,
  PatronOutfitId,
  SECRET_NPC_COOLDOWN_SEC,
  SceneryId,
  SecretNpcAppearance,
  SyrupFlavor,
  WeatherMode,
  canSpawnSecretNpc,
  extractTimeOfDayFromWeather,
  getCafeCatSpec,
  getMoodTier,
  getNextRecommendedStep,
  getOrderVesselType,
  getPastryById,
  getRecipeById,
  isClearOfMiataBay,
  isNightWeather,
  isOrderReadyToServe,
  isRainyWeather,
  isStepLockActive,
  resolveSecretNpcAppearance,
} from './rules';
import { SpotifyVinylState } from './spotifyManager';
import { CounterAudioProps, HologramMetadata } from './audio/CounterAudioProps';
import {
  attachCatCosmeticsRig,
  buildCatCosmeticPreviewMesh,
  CatCosmeticRigController,
} from './catCosmetics3d';
import { SceneryManager, buildMiniSceneryDiorama } from './sceneries/SceneryManager';
import { getSharedGlowSpriteTexture } from './sceneries/sceneryTypes';
import { applyPatronOutfitToRig, buildPatronOutfitPreviewMesh } from './patronOutfits3d';
import { applySecretNpcLookToRig, createSecretNpcHeartSprite } from './secretNpc3d';
import { OutdoorOverlookController, OutdoorVantageKey } from './OutdoorOverlookController';
import { ThumbnailStudio } from './ThumbnailStudio';

// Pre-allocated scratch math objects (Zero GC in render loop)
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _tempVec = new THREE.Vector3();
const _tempVec2 = new THREE.Vector3();
const _codexCenter = new THREE.Vector3();
const _codexNormal = new THREE.Vector3();
const _codexQuat = new THREE.Quaternion();
const _lookMat = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();
const _upVec = new THREE.Vector3(0, 1, 0);
const _dummyObj = new THREE.Object3D();
const _targetColor = new THREE.Color();
const _targetCremaColor = new THREE.Color();
const _skyBgColor = new THREE.Color();

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
  onDoorOpen?: () => void;
  onPinOrderFromTicket?: (orderId: string, recipeId: string) => void;
  onAcceptCustomerOrder?: (orderId: string) => void;
  onCustomerReachedCounter?: (customerId: string) => void;
  onPetChampy?: () => void;
  onChampyGreet?: () => void;
  onCookieJarTap?: (tapCount: number) => void;
  onGrabPastry?: (pastryId: PastryId) => void;
  onReturnPastry?: () => void;
  onScooterSound?: (mode: 'arrive' | 'depart') => void;
  onCatCombStroke?: (speed: number) => void;
  onCatTreatCrunch?: () => void;
  onEnterGoOutside?: () => void;
}

interface StationCameraPreset {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

// V2 6-Station Camera Presets: 1 Pastries -> 2 Orders -> 3 Espresso -> 4 Tea & Milk -> 5 Serve -> 6 Vinyl
const STATION_CAMERAS: Record<BaristaStationId, StationCameraPreset> = {
  1: {
    // Pastries: Close-up warm walnut & curved-glass bakery showcase
    pos: new THREE.Vector3(-1.86, 1.44, 1.24),
    look: new THREE.Vector3(-1.86, 1.13, 0.2),
  },
  2: {
    // Orders: Serve-like elevated front-counter framing showing POS, hanging tickets, Cat Perch & incoming queue
    pos: new THREE.Vector3(-1.72, 1.66, 1.98),
    look: new THREE.Vector3(-1.68, 1.22, -1.42),
  },
  3: {
    // Espresso: Knock Box, Grinder, Tamper, Dual-Boiler Machine, Separated Rinser & Trash Chute
    pos: new THREE.Vector3(-0.08, 1.6, 1.92),
    look: new THREE.Vector3(-0.08, 1.18, 0.1),
  },
  4: {
    // Tea & Milk: Milk Pitcher, Assembly Coaster, Kyoto Teapot, Ice Bin, Syrup Rack & Matcha
    pos: new THREE.Vector3(1.44, 1.58, 1.84),
    look: new THREE.Vector3(1.44, 1.18, 0.14),
  },
  5: {
    // Serve: Elevated Walnut Pickup Coaster, Brass Bell, Staged Pastry Plate/Bag, Lounge & Miata
    pos: new THREE.Vector3(-1.25, 1.64, 1.84),
    look: new THREE.Vector3(-1.25, 1.18, -1.65),
  },
  6: {
    // Vinyl: Shop Management Tablet & 3D Vinyl Turntable Corner
    pos: new THREE.Vector3(2.38, 1.55, 1.58),
    look: new THREE.Vector3(2.42, 1.18, 0.14),
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

// Custom GLSL Procedural 3-Stop Atmospheric Sky Dome Shader (Morning Sun, Golden Hour Sun Disc, Rainy Slate)
const SKY_DOME_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SKY_DOME_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vWorldDir;
  uniform vec3 uTopColor;
  uniform vec3 uMidColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform float uStarIntensity;
  uniform float uTime;

  float hashStar(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y * 1.35 + 0.05, 0.0, 1.0);
    vec3 lowerGrad = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.34, h));
    vec3 skyCol = mix(lowerGrad, uTopColor, smoothstep(0.28, 0.92, h));

    // Soft atmospheric sun disc & warm horizon scatter glow
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float sunHalo = pow(sunDot, 10.0) * 0.42 * uSunIntensity;
    float sunDisc = smoothstep(0.9945, 0.9985, sunDot) * 1.15 * uSunIntensity;
    skyCol += uSunColor * (sunHalo + sunDisc);

    // Subtle procedural twinkling night stars (zero extra draw calls!)
    if (uStarIntensity > 0.01 && dir.y > 0.08) {
      vec2 starUv = vec2(atan(dir.x, -dir.z) * 18.0, dir.y * 34.0);
      vec2 cell = floor(starUv);
      vec2 f = fract(starUv) - 0.5;
      float rnd = hashStar(cell);
      if (rnd > 0.935) {
        float dist = length(f);
        float twinkle = 0.65 + 0.35 * sin(uTime * (1.8 + rnd * 3.0) + rnd * 40.0);
        float starMask = smoothstep(0.16, 0.02, dist) * smoothstep(0.08, 0.32, dir.y) * twinkle;
        skyCol += vec3(0.92, 0.96, 1.0) * starMask * uStarIntensity * 1.15;
      }
    }

    gl_FragColor = vec4(skyCol, 1.0);
  }
`;

// Custom GLSL Additive Volumetric God-Ray Sunbeam Shader (Zero Post-Processing Cost)
const GOD_RAY_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const GOD_RAY_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    // Soft radial falloff across beam width & gradual fade toward floor
    float edgeFade = smoothstep(0.0, 0.28, vUv.x) * smoothstep(1.0, 0.72, vUv.x);
    float lengthFade = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.08, vUv.y);
    // Subtle animated sunbeam shimmer (dust/steam drift)
    float shimmer = 0.86 + 0.14 * sin(vUv.x * 12.0 + uTime * 0.45 + vUv.y * 4.0);
    // Fresnel grazing fade so planes never look like hard cardboard cards
    float viewFade = pow(abs(dot(normalize(vNormal), normalize(vViewDir))), 0.65);
    float alpha = edgeFade * lengthFade * shimmer * viewFade * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// Custom GLSL GPU-Driven Outdoor-Only Rain Curtain Shader (Zero CPU Loop, Zero Frozen Droplets, Strictly z <= -6.55)
const GPU_RAIN_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aOrigin;
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aIsTail;
  uniform float uTime;
  varying float vTail;

  void main() {
    vTail = aIsTail;
    float fallHeight = 9.5;
    float yHead = fallHeight - mod(uTime * aSpeed + aPhase * fallHeight, fallHeight);
    vec3 pos = vec3(aOrigin.x, yHead, aOrigin.z);
    // Wind-slanted raindrop tail trailing slightly up and left
    if (aIsTail > 0.5) {
      pos.y += 0.38;
      pos.x -= 0.05;
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const GPU_RAIN_FRAGMENT_SHADER = /* glsl */ `
  varying float vTail;
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    float alpha = mix(uOpacity, uOpacity * 0.22, vTail);
    gl_FragColor = vec4(uColor, alpha);
  }
`;

interface StaticCollider2D {
  x: number;
  z: number;
  radius: number;
}

interface PooledPedestrian {
  actor: Omit<
    ArticulatedCustomerActor,
    | 'currentPos'
    | 'lastPos'
    | 'waypoints'
    | 'finalGoalKey'
    | 'walkPhase'
    | 'walkBlend'
    | 'seatedBlend'
    | 'facingAngle'
    | 'moveState'
    | 'stuckTimer'
    | 'stuckAnchorPos'
    | 'ghostPassTimer'
    | 'counterArrivedSignaled'
  >;
  laneZ: number;
  x: number;
  dir: 1 | -1;
  speed: number;
  walkPhase: number;
  pauseTimer: number;
  glancePhase: number;
}

interface PooledTrafficVehicle {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  laneZ: number;
  laneY: number;
  x: number;
  dir: 1 | -1;
  speed: number;
  isHighway: boolean;
}

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
  heldVesselVariants: Record<CupVesselType, THREE.Group>;
  appliedVesselType: CupVesselType;
  heldPastryGroup: THREE.Group;
  heldPastryPlateGroup: THREE.Group;
  heldPastryBagGroup: THREE.Group;
  heldPastryPlateItems: Record<PastryId, THREE.Group>;
  appliedPastryId: PastryId | null;
  umbrellaGroup: THREE.Group;
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
  appliedPatronOutfitKey?: string;
  isSecretNpc?: boolean;
  moveState: 'walking' | 'idle-queue' | 'yielding-door' | 'seated' | 'leaving_table';
  standUpTimer: number;
  seatExitOrigin: THREE.Vector3 | null;
  stuckTimer: number;
  stuckAnchorPos: THREE.Vector3;
  ghostPassTimer: number;
  counterArrivedSignaled: boolean;
  seed: number;
  appliedSkinPack: CustomerSkinPackId;
  appliedShirtColor: string;
  isDeliveryRider?: boolean;
  riderVariant?: DeliveryRiderVariant;
  scooterStowTimer?: number;
}

interface DeliveryScooterController {
  customerId: string;
  variant: DeliveryRiderVariant;
  slotIndex: 0 | 1;
  parkX: number;
  root: THREE.Group;
  wheels: THREE.Object3D[];
  topBoxLidPivot: THREE.Group;
  headlightMat: THREE.MeshStandardMaterial;
  phase: 'arriving' | 'parked' | 'stowing' | 'departing';
  x: number;
  stowTimer: number;
  arrivedSoundPlayed: boolean;
  departSoundPlayed: boolean;
}

type ChampyState =
  | 'sitting'
  | 'sleeping'
  | 'grooming'
  | 'greeting'
  | 'petted'
  | 'combed'
  | 'eating_treat'
  | 'walking_in';

interface ChampyParticle {
  sprite: THREE.Sprite;
  age: number;
  duration: number;
  active: boolean;
  startX: number;
  startZ: number;
  driftX: number;
}

interface ChampyRig {
  catId: CafeCatId;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headPivot: THREE.Group;
  leftEar: THREE.Group;
  rightEar: THREE.Group;
  leftEyelid: THREE.Mesh;
  rightEyelid: THREE.Mesh;
  leftEyeIrisMat: THREE.MeshStandardMaterial;
  rightEyeIrisMat: THREE.MeshStandardMaterial;
  baseScale: THREE.Vector3;
  coatTextures: THREE.CanvasTexture[];
  frontLeftLeg: THREE.Group;
  frontRightLeg: THREE.Group;
  backLeftLeg: THREE.Group;
  backRightLeg: THREE.Group;
  hindGroup: THREE.Group;
  tailBase: THREE.Group;
  tailMid: THREE.Group;
  tailTip: THREE.Group;
  collarMesh: THREE.Mesh;
  collarBell: THREE.Group;
  cosmeticsController: CatCosmeticRigController;
  heartParticles: ChampyParticle[];
  sleepParticles: ChampyParticle[];
  sparkleParticles: ChampyParticle[];
  heartTexture: THREE.CanvasTexture;
  zzzTexture: THREE.CanvasTexture;
  sparkleTexture: THREE.CanvasTexture;
  nameplateTexture: THREE.CanvasTexture;
  state: ChampyState;
  stateTimer: number;
  stateDuration: number;
  blinkTimer: number;
  blinkDuration: number;
  earTwitchTimer: number;
  earTwitchSide: -1 | 1;
  greetCooldown: number;
  petTimer: number;
  combStretchTimer: number;
  treatEatTimer: number;
  walkInProgress: number;
  sleepParticleTimer: number;
  swapPopTimer: number;
}

interface ActiveStepAnimation {
  type: StepAnimType;
  progress: number;
  duration: number;
  flavor?: SyrupFlavor;
  badgeText?: string;
  servedCustomerId?: string;
  vesselType?: CupVesselType;
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
  private pastryPoolLight!: THREE.PointLight;
  private seatingPoolLight!: THREE.PointLight;
  private titleHeroCupLight!: THREE.PointLight;

  // Shared procedural textures
  private studioLogoTexture!: THREE.CanvasTexture;
  private studioCupEmblemTexture!: THREE.CanvasTexture;
  private cupMedallionTexture!: THREE.CanvasTexture;
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
  private posScreenTexture!: THREE.CanvasTexture;
  private roadAsphaltTexture!: THREE.CanvasTexture;
  private windowRainTexture!: THREE.CanvasTexture;
  private ticketTextures: THREE.CanvasTexture[] = [];
  private ticketGlowMats: THREE.MeshBasicMaterial[] = [];
  private ticketHitboxes: THREE.Mesh[] = [];
  private ticketOrderSlots: Array<{ orderId: string; recipeId: string; isUrgent: boolean; isPinned: boolean } | null> = [
    null,
    null,
    null,
  ];
  private hudPinnedRecipeId: string | null = null;
  private lastTicketSignature = '';
  private lastPosOrderCount = -1;

  // Dynamic materials for customization, equipment skins & highlighting
  private counterWoodMat!: THREE.MeshStandardMaterial;
  private ceramicMugMat!: THREE.MeshStandardMaterial;
  private neonTubeMat!: THREE.MeshStandardMaterial;
  private underCounterNeonMat!: THREE.MeshStandardMaterial;
  private skylightPaneMat!: THREE.MeshStandardMaterial;
  private garageGlassMat!: THREE.MeshStandardMaterial;
  private windowRainMat!: THREE.MeshBasicMaterial;
  private roadAsphaltMat!: THREE.MeshStandardMaterial;
  private patioFloorMat!: THREE.MeshStandardMaterial;
  private pendantBulbMats: THREE.MeshStandardMaterial[] = [];
  private streetLampBulbMats: THREE.MeshStandardMaterial[] = [];
  private streetLampConeMat!: THREE.MeshBasicMaterial;
  private streetLampPoolMat!: THREE.MeshBasicMaterial;
  private streetLampGlowsGroup!: THREE.Group;
  private cityWindowWarmMat!: THREE.MeshStandardMaterial;
  private cityWindowCoolMat!: THREE.MeshStandardMaterial;
  private citySignEmissiveMat!: THREE.MeshStandardMaterial;
  private vehicleHeadlightMat!: THREE.MeshStandardMaterial;
  private vehicleTaillightMat!: THREE.MeshStandardMaterial;
  private vehicleHeadlightBeamMat!: THREE.MeshBasicMaterial;
  private vehicleHeadlightBeamsGroupList: THREE.Object3D[] = [];
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
  private posDisplayMesh!: THREE.Mesh;
  private isCodexFocused = false;
  private entranceDoorPivot!: THREE.Group;
  private doorBellGroup!: THREE.Group;
  private doorAngle = 0;
  private doorWasOpen = false;
  private doorChimeCooldown = 0;

  // Phases 1-7: Outdoor SceneryManager, Snow particles, Secret Passerby + Hearts, Go Outside Controller, Single-Context ThumbnailStudio
  private sceneryManager!: SceneryManager;
  private outdoorOverlook!: OutdoorOverlookController;
  private thumbnailStudio: ThumbnailStudio | null = null;
  private snowPoints: THREE.Points | null = null;
  private snowVelocities: Float32Array = new Float32Array(0);
  private lastPointerX = 0;
  private lastPointerY = 0;
  private activeTouchPoints = new Map<number, { x: number; y: number }>();
  private lastPinchDist = 0;
  private secretPasserby: {
    actor: PooledPedestrian['actor'];
    x: number;
    laneZ: number;
    dir: 1 | -1;
    speed: number;
    walkPhase: number;
    pauseTimer: number;
    hasPaused: boolean;
  } | null = null;
  private secretPasserbyCooldown = 0;
  private lastHandledSecretServeSeq = 0;
  private floatingSecretHearts: Array<{ sprite: THREE.Sprite; age: number; maxAge: number }> = [];
  private doorwayQueue: string[] = [];
  private activeDoorCrossId: string | null = null;
  private activeDoorCrossTimer = 0;
  private champyRig: ChampyRig | null = null;
  private catPerchGroup: THREE.Group | null = null;
  private catNameplateTexture: THREE.CanvasTexture | null = null;
  private cookieJarGroup: THREE.Group | null = null;
  private cookieJarCookies: THREE.Group[] = [];
  private cookieJarTapCount = 0;
  private cookieJarWobbleTimer = 0;
  private titleHeroCupGroup!: THREE.Group;
  private titlePlaqueGroup!: THREE.Group;

  // Atmospheric Shaders (Sky Dome, Volumetric God Rays, Outdoor-Only GPU Rain)
  private skyDomeMat!: THREE.ShaderMaterial;
  private godRaysGroup!: THREE.Group;
  private godRayMat!: THREE.ShaderMaterial;
  private goldenDustInstanced!: THREE.InstancedMesh;
  private gpuRainLines!: THREE.LineSegments;
  private gpuRainMat!: THREE.ShaderMaterial;
  private rainSplashInstanced!: THREE.InstancedMesh;

  // Pooled Outdoor Living World (Full-Quality Pedestrians & Stylized Traffic) + 2D Static Colliders
  private pedestrianPool: PooledPedestrian[] = [];
  private trafficPool: PooledTrafficVehicle[] = [];
  private staticColliders: StaticCollider2D[] = [];

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
  private activeVesselVariants!: Record<CupVesselType, THREE.Group>;
  private activeHotTakeoutLidMesh: THREE.Object3D | null = null;
  private activeIcedTakeoutLidMesh: THREE.Object3D | null = null;
  private currentActiveVesselType: CupVesselType = 'hot-mug';
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
  private serveReadyHaloMesh!: THREE.Mesh;
  private serveReadyHaloMat!: THREE.MeshBasicMaterial;
  private isServeCupClickable = false;

  // Phase 5: Pressurized Glass Rinser Water Spray & Barista Trash Chute
  private rinserSprayConeMesh!: THREE.Mesh;
  private rinserMistDrops: THREE.Mesh[] = [];
  private trashChuteGroup!: THREE.Group;
  private trashFlapPivot!: THREE.Group;

  // Phase 6: Overhauled Pastry Display Case & Staged Prepared Pastry (Mini Plate / Kraft Bag)
  private pastryCaseItemGroups: Map<PastryId, THREE.Group> = new Map();
  private pastryCaseHaloMats: Map<PastryId, THREE.MeshBasicMaterial> = new Map();
  private preparedPastryStageGroup!: THREE.Group;
  private preparedPlateGroup!: THREE.Group;
  private preparedBagGroup!: THREE.Group;
  private preparedPlatePastryMeshes!: Record<PastryId, THREE.Group>;
  private pastryReturnRingMesh!: THREE.Mesh;
  private pastryReturnRingMat!: THREE.MeshBasicMaterial;
  private pastryReturnAnim: {
    active: boolean;
    elapsed: number;
    duration: number;
  } = { active: false, elapsed: 0, duration: 0.22 };

  // Phase 1.2 & 7: Active 3D Delivery Scooters Pool (hard-capped at max 2 simultaneous scooters!)
  private deliveryScooters: DeliveryScooterController[] = [];
  private activeGreetTargetPos: THREE.Vector3 | null = null;

  // Phase 2 & 6: Unified Counter Audio Props (Vinyl Turntable / Vintage Radio / External Hologram)
  private counterAudioProps: CounterAudioProps | null = null;
  private audioMode: AudioModeId = 'vinyl';
  private audioPlaying = false;

  // Phase 5: Interactive Cat Station State & Preloaded 3D Brush / Treat Props
  private catStationOpen = false;
  private catStationMode: 'pet' | 'comb' | 'treat' | 'customize' = 'pet';
  private catStationCustomizeOpen = false;
  private catStationCamBlend = 0;
  private catPreviewYawOffset = 0;
  private catBrushGroup: THREE.Group | null = null;
  private catBrushTargetPos = new THREE.Vector3(0, 0.24, 0.14);
  private catBrushActive = false;
  private catTreatGroup: THREE.Group | null = null;
  private catTreatAnim = { active: false, elapsed: 0, duration: 0.52 };
  private catLastLoadoutKey = '';

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
  private syrupBottleGroups: Map<string, THREE.Group> = new Map();
  private syrupBottleBaseX: Map<string, number> = new Map();
  private syrupDroplets: THREE.Mesh[] = [];
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

  // Pooled Steam & Foliage Particles (InstancedMesh)
  private steamParticlesInstanced!: THREE.InstancedMesh;
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
  private pointerDownX = 0;
  private pointerDownY = 0;

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

    // 2. WebGLRenderer Initialization (Low-end Android safe default; High-DPI on MAX)
    const initialLow = this.isSoftwareGl || initialGameState.graphicsQuality === 'low';
    this.renderer = new THREE.WebGLRenderer({
      antialias: !initialLow,
      powerPreference: initialLow ? 'default' : 'high-performance',
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

    // 3. Scene & Camera Setup (far = 95 for Sky Dome & Elevated City Highway)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a120e);
    this.scene.fog = new THREE.FogExp2(0x1a120e, 0.015);

    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 240);
    this.camera.position.set(2.02, 1.32, 1.18);
    this.camera.lookAt(-0.85, 0.82, -1.35);
    this.outdoorOverlook = new OutdoorOverlookController(this.camera);

    // 4. Studio Environment Map Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Build Procedural Textures
    this.initProceduralTextures();

    // 6. Build Lighting, Sky Dome, Volumetric God Rays, Cafe Interior, Exterior Street & Swappable Sceneries, Stations 1..5
    this.initLights();
    this.initMaterials();
    this.buildSkyAndGodRays();
    this.buildCafeArchitecture();
    this.buildOutdoorNeighborhood();
    this.sceneryManager = new SceneryManager(this.scene);
    this.sceneryManager.loadScenery(this.gameState.activeScenery || 'busy_street');
    this.buildSnowParticles();
    this.buildHangingTitleSign();
    this.buildStation1RegisterAndTickets();
    this.buildStation2EspressoBar();
    this.buildStation3MilkSyrupsAndIce();
    this.buildStation4ServeTrayAndGarden();
    this.buildStation5VinylTurntableCorner();
    this.buildShopUpgradeProps();
    this.buildFloatingBadgeAndHearts();
    this.buildPooledParticles();
    this.initStaticColliders();
    this.buildOutdoorPedestrianPool();
    this.buildOutdoorTrafficPool();
    this.scene.add(this.customersRoot);

    // Sync initial state & graphics quality
    this.updateGraphicsQuality();
    this.applyWeatherLighting(this.gameState.weather);
    this.updateDecorMaterials();
    this.updateActiveCupVisuals();
    this.redrawOrderTicketTextures();
    this.redrawPosScreenTexture();
    this.syncCustomerActors();
    this.syncTrafficVisibilityForScenery();

    // Pre-warm shaders on hardware GPUs
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  public setCodexFocusMode(active: boolean) {
    this.isCodexFocused = active;
    if (active) {
      this.manualCameraYawOffset = 0;
      this.manualCameraZoomOffset = 0;
    }
  }

  public setHudPinnedRecipeId(recipeId: string | null) {
    if (this.hudPinnedRecipeId !== recipeId) {
      this.hudPinnedRecipeId = recipeId;
      this.lastTicketSignature = '';
      this.redrawOrderTicketTextures();
    }
  }

  public getActiveArrivingCount(): number {
    let count = 0;
    for (const cust of this.gameState.customers) {
      if (cust.state !== 'ordering') continue;
      const actor = this.customerActors.get(cust.id);
      if (actor && actor.currentPos.z < -4.7) {
        count++;
      }
    }
    return count;
  }

  public petChampy() {
    if (!this.champyRig) return;
    const rig = this.champyRig;
    rig.state = 'petted';
    rig.stateTimer = 0;
    rig.stateDuration = 3.2;
    rig.petTimer = 3.2;
    this.spawnChampyHearts(3);
  }

  // Phase 2 & 6: Public Counter Audio Prop Sync API (Vinyl / Vintage Radio / Floating Hologram)
  public setAudioMode(mode: AudioModeId) {
    this.audioMode = mode;
    this.counterAudioProps?.setMode(mode);
  }

  public setAudioPlaying(playing: boolean) {
    this.audioPlaying = playing;
    this.counterAudioProps?.setPlaying(playing);
  }

  public setByoVinylActive(isCustomByo: boolean, accentHex?: string) {
    this.counterAudioProps?.setByoVinylActive(isCustomByo, accentHex);
  }

  public setRadioFrequencyIndex(stationIdx: number, totalStations: number) {
    this.counterAudioProps?.setRadioFrequencyIndex(stationIdx, totalStations);
  }

  public updateHologramMetadata(meta: HologramMetadata) {
    this.counterAudioProps?.updateHologramMetadata(meta);
  }

  // Phase 5: Interactive Cat Station State & Interactions
  public setCatStationState(
    open: boolean,
    mode: 'pet' | 'comb' | 'treat' | 'customize',
    customizeOpen: boolean
  ) {
    const wasOpen = this.catStationOpen;
    this.catStationOpen = open;
    this.catStationMode = mode;
    this.catStationCustomizeOpen = open && customizeOpen;
    if (!open) {
      this.catBrushActive = false;
      this.catPreviewYawOffset = 0;
      if (this.catBrushGroup) this.catBrushGroup.visible = false;
    } else {
      this.manualCameraYawOffset = 0;
      this.manualCameraZoomOffset = 0;
      if (!wasOpen) {
        this.catPreviewYawOffset = 0;
      }
      if (this.catBrushGroup) {
        this.catBrushGroup.visible = mode === 'comb' && !customizeOpen;
      }
    }
  }

  public triggerCatTreatToss() {
    if (!this.champyRig || !this.catTreatGroup) return;
    this.catTreatAnim.active = true;
    this.catTreatAnim.elapsed = 0;
    this.catTreatGroup.visible = true;
    const rig = this.champyRig;
    rig.state = 'eating_treat';
    rig.stateTimer = 0;
    rig.stateDuration = 2.4;
    rig.treatEatTimer = 2.4;
    this.spawnChampyHearts(4);
    this.callbacks.onCatTreatCrunch?.();
  }

  public triggerTisayArrivalWalkIn() {
    if (!this.champyRig) return;
    const rig = this.champyRig;
    rig.state = 'walking_in';
    rig.stateTimer = 0;
    rig.stateDuration = 2.6;
    rig.walkInProgress = 0;
    this.spawnChampyHearts(4);
  }

  public syncCatCosmetics(loadout?: CatLoadout) {
    if (!this.champyRig) return;
    const target = loadout ?? this.gameState.catLoadouts?.[this.champyRig.catId];
    this.champyRig.cosmeticsController.applyLoadout(target);
  }

  public triggerPastryReturnAnimation() {
    if (!this.preparedPastryStageGroup || !this.preparedPastryStageGroup.visible) return;
    if (this.pastryReturnAnim.active) return;
    this.pastryReturnAnim.active = true;
    this.pastryReturnAnim.elapsed = 0;
    this.pastryReturnAnim.duration = 0.22;
  }

  private shouldUsePhysicalTransmission(): boolean {
    return !this.isSoftwareGl && this.gameState.graphicsQuality === 'max';
  }

  private updateGraphicsQuality() {
    const quality = this.isSoftwareGl ? 'low' : this.gameState.graphicsQuality;
    const isLow = quality === 'low';
    const isMed = quality === 'medium';
    const dpr = window.devicePixelRatio || 1;
    // Calibrated 3-tier DPR: Low (0.9x mobile / 1.0x desktop), Medium (1.35x), Max (2.0x)
    const targetRatio = isLow
      ? this.isMobileDevice
        ? Math.min(dpr, 0.9)
        : 1.0
      : isMed
      ? Math.min(dpr, 1.35)
      : Math.min(dpr, 2.0);

    this.renderer.setPixelRatio(targetRatio);
    const enableShadows = !isLow;
    this.renderer.shadowMap.enabled = enableShadows;
    this.renderer.shadowMap.type =
      quality === 'max' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

    if (this.sunLight) {
      this.sunLight.castShadow = enableShadows;
      const desiredShadowSize = isMed ? 1024 : 2048;
      if (enableShadows && this.sunLight.shadow.mapSize.width !== desiredShadowSize) {
        this.sunLight.shadow.mapSize.set(desiredShadowSize, desiredShadowSize);
        if (this.sunLight.shadow.map) {
          this.sunLight.shadow.map.dispose();
          this.sunLight.shadow.map = null;
        }
      }
    }

    const targetAniso = isLow
      ? 1
      : isMed
      ? Math.min(2, this.renderer.capabilities.getMaxAnisotropy())
      : Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    [
      this.microCementTexture,
      this.herringboneFloorTexture,
      this.patioCobbleTexture,
      this.roadAsphaltTexture,
      this.posScreenTexture,
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
      this.monsteraLeavesInstanced.count = isLow
        ? lush
          ? 16
          : 10
        : isMed
        ? lush
          ? 26
          : 14
        : lush
        ? 36
        : 18;
    }

    // Scale Outdoor GPU Raindrop count cleanly via drawRange (180 Low, 420 Med, 850 Max)
    if (this.gpuRainLines) {
      const maxVerts = this.gpuRainLines.geometry.attributes.position.count;
      const rainDropCount = isLow ? 180 : isMed ? 420 : Math.min(850, Math.floor(maxVerts / 2));
      this.gpuRainLines.geometry.setDrawRange(0, Math.min(maxVerts, rainDropCount * 2));
    }

    // Scale Volumetric God Ray shafts cleanly (3 Low, 4 Med, 6 Max)
    if (this.godRaysGroup) {
      const maxRays = isLow ? 3 : isMed ? 4 : 6;
      this.godRaysGroup.children.forEach((child, idx) => {
        child.visible = idx < maxRays;
      });
    }

    // Scale Fixed Outdoor Pedestrian Pool (2 Low, 4 Med, 6 Max)
    const maxPeds = isLow ? 2 : isMed ? 4 : 6;
    this.pedestrianPool.forEach((p, idx) => {
      p.actor.group.visible = idx < maxPeds;
    });

    // Scale Fixed Outdoor Street Traffic Pool (2 Low, 4 Med, 6 Max)
    const maxStreet = isLow ? 2 : isMed ? 4 : 6;
    this.trafficPool.forEach((v, idx) => {
      v.group.visible = idx < maxStreet;
    });

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

    // Dedicated crisp 1:1 circular medallion texture for Takeout cup badges (prevents horizontal squashing)
    const medallionCanvas = document.createElement('canvas');
    medallionCanvas.width = 256;
    medallionCanvas.height = 256;
    const mCtx = medallionCanvas.getContext('2d')!;
    const drawMedallionBase = () => {
      mCtx.clearRect(0, 0, 256, 256);
      const bgGrad = mCtx.createRadialGradient(128, 118, 16, 128, 128, 124);
      bgGrad.addColorStop(0, '#2a1c14');
      bgGrad.addColorStop(1, '#120b07');
      mCtx.fillStyle = bgGrad;
      mCtx.beginPath();
      mCtx.arc(128, 128, 124, 0, Math.PI * 2);
      mCtx.fill();
      mCtx.strokeStyle = '#f59e0b';
      mCtx.lineWidth = 8;
      mCtx.beginPath();
      mCtx.arc(128, 128, 116, 0, Math.PI * 2);
      mCtx.stroke();
      mCtx.strokeStyle = 'rgba(253, 230, 138, 0.45)';
      mCtx.lineWidth = 2.5;
      mCtx.beginPath();
      mCtx.arc(128, 128, 102, 0, Math.PI * 2);
      mCtx.stroke();
    };
    drawMedallionBase();
    mCtx.fillStyle = '#f59e0b';
    mCtx.font = 'bold 58px Georgia, serif';
    mCtx.textAlign = 'center';
    mCtx.textBaseline = 'middle';
    mCtx.fillText('K', 128, 132);

    this.cupMedallionTexture = new THREE.CanvasTexture(medallionCanvas);
    this.cupMedallionTexture.colorSpace = THREE.SRGBColorSpace;
    this.cupMedallionTexture.anisotropy = maxAniso;

    const iconDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(STUDIO_ICON_SVG_RAW)}`;
    const iconImg = new Image();
    iconImg.onload = () => {
      cCtx.fillStyle = '#f8f4ec';
      cCtx.fillRect(0, 0, 1024, 512);
      cCtx.drawImage(iconImg, 386, 66, 252, 380);
      this.studioCupEmblemTexture.needsUpdate = true;

      drawMedallionBase();
      mCtx.drawImage(iconImg, 54, 34, 148, 188);
      this.cupMedallionTexture.needsUpdate = true;
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

    // K. Idle 3D POS Monitor Screen Texture ("KLASIK POS · TAP FOR BARISTA CODEX")
    const posCanvas = document.createElement('canvas');
    posCanvas.width = 512;
    posCanvas.height = 340;
    this.posScreenTexture = new THREE.CanvasTexture(posCanvas);
    this.posScreenTexture.colorSpace = THREE.SRGBColorSpace;
    this.posScreenTexture.anisotropy = maxAniso;

    // L. Weathered 2-Lane Neighborhood Avenue Asphalt Texture (with dashed center line & crosswalk)
    const roadCanvas = document.createElement('canvas');
    const roadSize = this.gameState.graphicsQuality === 'low' ? 256 : 512;
    roadCanvas.width = roadSize;
    roadCanvas.height = roadSize;
    const rCtx = roadCanvas.getContext('2d')!;
    rCtx.fillStyle = '#26292e';
    rCtx.fillRect(0, 0, roadSize, roadSize);
    // Asphalt aggregate grain
    for (let i = 0; i < 650; i++) {
      const gx = (i * 53) % roadSize;
      const gy = (i * 97) % roadSize;
      rCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.09)';
      rCtx.fillRect(gx, gy, 2, 2);
    }
    // Crisp white edge lines
    rCtx.fillStyle = 'rgba(226, 232, 240, 0.55)';
    rCtx.fillRect(0, Math.round(roadSize * 0.05), roadSize, Math.max(2, Math.round(roadSize * 0.018)));
    rCtx.fillRect(0, Math.round(roadSize * 0.93), roadSize, Math.max(2, Math.round(roadSize * 0.018)));
    // Dashed amber center divider
    rCtx.fillStyle = '#f59e0b';
    const dashW = Math.round(roadSize * 0.22);
    const dashH = Math.max(3, Math.round(roadSize * 0.025));
    const midY = Math.round(roadSize * 0.5 - dashH * 0.5);
    rCtx.fillRect(Math.round(roadSize * 0.06), midY, dashW, dashH);
    rCtx.fillRect(Math.round(roadSize * 0.56), midY, dashW, dashH);
    this.roadAsphaltTexture = new THREE.CanvasTexture(roadCanvas);
    this.roadAsphaltTexture.colorSpace = THREE.SRGBColorSpace;
    this.roadAsphaltTexture.wrapS = THREE.RepeatWrapping;
    this.roadAsphaltTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.roadAsphaltTexture.repeat.set(7, 1);
    this.roadAsphaltTexture.anisotropy = maxAniso;

    // M. Scrolling Exterior Glass Rain-Streak Alpha Texture
    const wrCanvas = document.createElement('canvas');
    wrCanvas.width = 256;
    wrCanvas.height = 256;
    const wrCtx = wrCanvas.getContext('2d')!;
    wrCtx.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 42; i++) {
      const rx = ((i * 61 + 19) % 244) + 6;
      const ry = (i * 89) % 256;
      const rLen = 18 + (i % 5) * 10;
      const grad = wrCtx.createLinearGradient(rx, ry, rx, ry + rLen);
      grad.addColorStop(0, 'rgba(219, 234, 254, 0)');
      grad.addColorStop(0.75, 'rgba(219, 234, 254, 0.42)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.72)');
      wrCtx.strokeStyle = grad;
      wrCtx.lineWidth = i % 3 === 0 ? 2.4 : 1.5;
      wrCtx.beginPath();
      wrCtx.moveTo(rx, ry);
      wrCtx.lineTo(rx - 2, ry + rLen);
      wrCtx.stroke();
      // Tiny droplet bead at bottom of trail
      wrCtx.fillStyle = 'rgba(224, 242, 254, 0.65)';
      wrCtx.beginPath();
      wrCtx.arc(rx - 2, ry + rLen, 2.2, 0, Math.PI * 2);
      wrCtx.fill();
    }
    this.windowRainTexture = new THREE.CanvasTexture(wrCanvas);
    this.windowRainTexture.wrapS = THREE.RepeatWrapping;
    this.windowRainTexture.wrapT = THREE.RepeatWrapping;
    this.windowRainTexture.repeat.set(4, 2);
  }

  private redrawPosScreenTexture() {
    if (!this.posScreenTexture) return;
    const orderingCount = this.gameState.customers.filter((c) => c.state === 'ordering').length;
    if (orderingCount === this.lastPosOrderCount) return;
    this.lastPosOrderCount = orderingCount;

    const canvas = this.posScreenTexture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sleek dark emerald-slate POS LCD screen
    const grad = ctx.createLinearGradient(0, 0, 0, 340);
    grad.addColorStop(0, '#0a1916');
    grad.addColorStop(1, '#06100e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 340);

    // Subtle scanline grid
    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    for (let y = 0; y < 340; y += 6) {
      ctx.fillRect(0, y, 512, 2);
    }

    // Outer luminous bezel border
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 492, 320);

    // Top status bar
    ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
    ctx.fillRect(14, 14, 484, 52);
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(38, 40, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#faf5ee';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('KLASIK POS v3.2', 58, 48);

    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'right';
    ctx.fillText(`QUEUE: ${orderingCount}`, 480, 48);

    // Main centerpiece callout
    ctx.fillStyle = '#faf5ee';
    ctx.font = 'bold 42px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('RECIPE BOOK', 256, 152);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '600 22px sans-serif';
    ctx.fillText('16 COFFEE · TEA · COLD RECIPES', 256, 198);

    // Interactive Tap CTA pill
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(86, 234, 340, 62, 16);
    ctx.fill();
    ctx.fillStyle = '#160e09';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('TAP FOR RECIPE BOOK', 256, 273);

    this.posScreenTexture.needsUpdate = true;
  }

  private redrawHangingSignTexture(accentHex: string) {
    if (!this.hangingSignTexture) return;
    const signCanvas = this.hangingSignTexture.image as HTMLCanvasElement;
    const sCtx = signCanvas.getContext('2d');
    if (!sCtx) return;

    // Warm dark-roast double-sided exterior blade sign with Yin-Yang Leaf & Cappuccino Emblem + Entrance Arrow
    sCtx.fillStyle = '#17100c';
    sCtx.fillRect(0, 0, 512, 160);
    sCtx.strokeStyle = accentHex;
    sCtx.lineWidth = 7;
    sCtx.strokeRect(10, 10, 492, 140);

    // Left Yin-Yang Botanical & Crema Emblem
    sCtx.save();
    sCtx.translate(72, 80);
    sCtx.beginPath();
    sCtx.arc(0, 0, 42, 0, Math.PI * 2);
    sCtx.fillStyle = '#291c14';
    sCtx.fill();
    sCtx.strokeStyle = accentHex;
    sCtx.lineWidth = 4;
    sCtx.stroke();
    // Crema upper swirl & botanical green lower swirl
    sCtx.beginPath();
    sCtx.arc(0, 0, 34, -Math.PI / 2, Math.PI / 2);
    sCtx.fillStyle = '#f5e6cc';
    sCtx.fill();
    sCtx.beginPath();
    sCtx.arc(0, 0, 34, Math.PI / 2, (Math.PI * 3) / 2);
    sCtx.fillStyle = '#2d6a4f';
    sCtx.fill();
    sCtx.beginPath();
    sCtx.arc(0, -17, 17, 0, Math.PI * 2);
    sCtx.fillStyle = '#f5e6cc';
    sCtx.fill();
    sCtx.beginPath();
    sCtx.arc(0, 17, 17, 0, Math.PI * 2);
    sCtx.fillStyle = '#2d6a4f';
    sCtx.fill();
    sCtx.beginPath();
    sCtx.arc(0, -17, 5, 0, Math.PI * 2);
    sCtx.fillStyle = '#3b1d0e';
    sCtx.fill();
    sCtx.beginPath();
    sCtx.arc(0, 17, 5, 0, Math.PI * 2);
    sCtx.fillStyle = '#f5e6cc';
    sCtx.fill();
    sCtx.restore();

    // Main Branding Text
    sCtx.fillStyle = '#fef3c7';
    sCtx.font = 'bold 46px Georgia, serif';
    sCtx.textAlign = 'left';
    sCtx.fillText('KLASIK 3D', 132, 74);

    sCtx.fillStyle = '#e7d7c1';
    sCtx.font = '600 16px sans-serif';
    sCtx.fillText('GARAGE GARDEN CAFE', 134, 102);

    // Glowing Directional Entrance Arrow
    sCtx.fillStyle = accentHex;
    sCtx.font = 'bold 20px monospace';
    sCtx.fillText('ENTRANCE  →', 134, 134);

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
    // Phase 1 Order Queueing: Only ACCEPTED ordering customers hang on the 3D ticket rail!
    const ordering = this.gameState.customers.filter(
      (c) => c.state === 'ordering' && c.orderAccepted
    );
    const waitingCount = this.gameState.customers.filter(
      (c) => c.state === 'ordering' && !c.orderAccepted
    ).length;
    const isLiloActive = this.gameState.equippedCatId === 'lilo';
    const isZenMode = this.gameState.mode === 'zen';

    const sig =
      `${waitingCount}|${isLiloActive ? 1 : 0}|${isZenMode ? 1 : 0}|` +
      ordering
        .slice(0, 3)
        .map((c) => {
          const moodVal = Math.round(typeof c.mood === 'number' ? c.mood : c.patience ?? 100);
          const isPinned =
            this.gameState.pinnedOrderId === c.id && this.hudPinnedRecipeId === c.recipeId;
          return `${c.id}:${c.recipeId}:${moodVal}:${isPinned ? 1 : 0}:${c.orderType}`;
        })
        .join('|');
    if (sig === this.lastTicketSignature) return;
    this.lastTicketSignature = sig;

    for (let i = 0; i < this.ticketTextures.length; i++) {
      const tex = this.ticketTextures[i];
      const canvas = tex.image as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      const cust: CustomerOrder | undefined = ordering[i];
      const hitbox = this.ticketHitboxes[i];

      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(0, 0, 256, 320);

      if (!cust) {
        this.ticketOrderSlots[i] = null;
        if (hitbox) {
          hitbox.userData.label = `Order Ticket Slot #${i + 1} (${
            waitingCount > 0 ? 'Tap Waiting Customer to Accept' : 'Open'
          })`;
        }
        ctx.fillStyle = '#57534e';
        ctx.fillRect(0, 0, 256, 40);
        ctx.fillStyle = '#e7e5e4';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`TICKET #${i + 1}`, 128, 27);
        ctx.fillStyle = '#78716c';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(waitingCount > 0 ? 'ACCEPT ORDER' : 'OPEN SLOT', 128, 158);
        if (waitingCount > 0) {
          ctx.fillStyle = '#d97706';
          ctx.font = 'bold 15px monospace';
          ctx.fillText('TAP PATRON OR HUD', 128, 190);
        }
        tex.needsUpdate = true;
        continue;
      }

      const recipe = getRecipeById(cust.recipeId);
      const moodVal = isLiloActive || isZenMode
        ? 100
        : Math.max(0, Math.min(100, Math.round(typeof cust.mood === 'number' ? cust.mood : 100)));
      const tier = getMoodTier(moodVal);
      const isUrgent = !isLiloActive && !isZenMode && moodVal <= 30;
      const isPinned =
        this.gameState.pinnedOrderId === cust.id && this.hudPinnedRecipeId === cust.recipeId;

      this.ticketOrderSlots[i] = {
        orderId: cust.id,
        recipeId: cust.recipeId,
        isUrgent,
        isPinned,
      };

      if (hitbox) {
        hitbox.userData.label = `Pin ${cust.customerName}'s ${recipe.name} (${
          isLiloActive ? 'Lilo Calm' : `Mood ${moodVal}`
        })`;
      }

      // High-contrast top header bar
      ctx.fillStyle = isPinned ? '#047857' : isUrgent ? '#be123c' : '#78350f';
      ctx.fillRect(0, 0, 256, 44);
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 19px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        isPinned ? 'PINNED RECIPE' : isUrgent ? `LOW MOOD ${moodVal}` : `TAP TO PIN #${i + 1}`,
        128,
        29
      );

      // Bold customer first name
      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(cust.customerName.toUpperCase(), 128, 92);

      // Service & temperature pill (HOT / ICED / TAKEOUT)
      const isTakeout = cust.orderType === 'takeout';
      const isIced = Boolean(cust.customNeedsIce ?? recipe.needsIce);
      const badgeLabel = `${isIced ? 'ICED' : 'HOT'} · ${isTakeout ? 'TO-GO' : 'DINE-IN'}`;
      ctx.fillStyle = isTakeout ? '#065f46' : isIced ? '#0369a1' : '#92400e';
      ctx.beginPath();
      ctx.roundRect(30, 108, 196, 34, 10);
      ctx.fill();
      ctx.fillStyle = '#fafaf9';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(badgeLabel, 128, 131);

      // Bold Drink Name
      ctx.fillStyle = '#292524';
      ctx.font = 'bold 24px sans-serif';
      const words = recipe.name.split(' ');
      const line1 = words.slice(0, 2).join(' ');
      const line2 = words.slice(2).join(' ');
      ctx.fillText(line1, 128, 180);
      if (line2) ctx.fillText(line2, 128, 210);

      // Primary Add-on badge if present
      const firstAddon = (cust.customAddons || [])[0];
      if (firstAddon) {
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(32, 224, 192, 30, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#92400e';
        ctx.font = 'bold 17px monospace';
        ctx.fillText(firstAddon, 128, 245);
      }

      // Live Mood Meter Bar + Mood Readout at bottom
      ctx.fillStyle = '#e7e5e4';
      ctx.fillRect(20, 270, 216, 32);
      const moodRatio = Math.max(0, Math.min(1, moodVal / 100));
      ctx.fillStyle = isLiloActive || isZenMode
        ? '#38bdf8'
        : tier === 'happy'
        ? '#10b981'
        : tier === 'content'
        ? '#f59e0b'
        : '#f43f5e';
      ctx.fillRect(20, 270, Math.round(216 * moodRatio), 32);
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 270, 216, 32);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 18px monospace';
      const barLabel = isLiloActive
        ? 'LILO · MOOD OFF'
        : isZenMode
        ? 'ZEN · CALM'
        : tier === 'happy'
        ? `HAPPY ${moodVal}`
        : tier === 'content'
        ? `WAITING ${moodVal}`
        : `IMPATIENT ${moodVal}`;
      ctx.fillText(barLabel, 128, 293);

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

    // Phase 1.5: 3 Non-Shadow-Casting Warm Amber Interior PointLight Pools (Espresso Bar, Pastry Counter, Seating Nook)
    this.cafeWarmLight = new THREE.PointLight(0xffb35c, 1.9, 12, 1.45);
    this.cafeWarmLight.castShadow = false;
    this.cafeWarmLight.position.set(-0.1, 2.65, 0.25);
    this.scene.add(this.cafeWarmLight);

    this.pastryPoolLight = new THREE.PointLight(0xffb35c, 0.7, 8.5, 1.5);
    this.pastryPoolLight.castShadow = false;
    this.pastryPoolLight.position.set(-1.75, 2.35, 0.15);
    this.scene.add(this.pastryPoolLight);

    this.seatingPoolLight = new THREE.PointLight(0xffb35c, 0.65, 10.5, 1.45);
    this.seatingPoolLight.castShadow = false;
    this.seatingPoolLight.position.set(1.25, 2.55, -3.25);
    this.scene.add(this.seatingPoolLight);

    this.neonSignLight = new THREE.PointLight(0xf59e0b, 1.5, 6.5, 1.7);
    this.neonSignLight.castShadow = false;
    this.neonSignLight.position.set(-2.05, 2.55, -6.75);
    this.scene.add(this.neonSignLight);

    this.turntableLampLight = new THREE.PointLight(0xfbbf24, 1.2, 4.5, 2);
    this.turntableLampLight.castShadow = false;
    this.turntableLampLight.position.set(2.15, 1.45, 0.25);
    this.scene.add(this.turntableLampLight);
  }

  // Procedural Sky Dome Shader + Additive Volumetric God-Ray Sunbeams + Floating Golden Dust Motes
  private buildSkyAndGodRays() {
    // 1. Procedural 3-Stop Atmospheric Sky Dome Sphere (radius 64, strictly inside camera far=95)
    this.skyDomeMat = new THREE.ShaderMaterial({
      vertexShader: SKY_DOME_VERTEX_SHADER,
      fragmentShader: SKY_DOME_FRAGMENT_SHADER,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTopColor: { value: new THREE.Color('#4a90d9') },
        uMidColor: { value: new THREE.Color('#a6d4fa') },
        uHorizonColor: { value: new THREE.Color('#fff4e0') },
        uSunDir: { value: new THREE.Vector3(-0.42, 0.26, -0.87).normalize() },
        uSunColor: { value: new THREE.Color('#fff1c7') },
        uSunIntensity: { value: 0.75 },
        uStarIntensity: { value: 0.0 },
        uTime: { value: 0.0 },
      },
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(64, 24, 16), this.skyDomeMat);
    skyDome.renderOrder = -10;
    this.scene.add(skyDome);

    // 2. Diagonal Translucent Volumetric God-Ray Light-Shaft Planes streaming through Glass Garage Bays & Skylights
    this.godRaysGroup = new THREE.Group();
    this.godRayMat = new THREE.ShaderMaterial({
      vertexShader: GOD_RAY_VERTEX_SHADER,
      fragmentShader: GOD_RAY_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ffbe6b') },
        uOpacity: { value: 0.16 },
      },
    });

    const raySpecs: Array<{
      x: number;
      y: number;
      z: number;
      w: number;
      h: number;
      rx: number;
      ry: number;
      rz: number;
    }> = [
      // Left garage bay shaft streaming diagonally over the 1990 Miata hood
      { x: -3.2, y: 2.15, z: -4.15, w: 2.4, h: 5.2, rx: -0.44, ry: 0.28, rz: -0.22 },
      // Center entrance bay shaft streaming toward the espresso counter
      { x: -0.45, y: 2.2, z: -3.95, w: 2.2, h: 5.4, rx: -0.46, ry: 0.24, rz: -0.20 },
      // Right garden bay shaft grazing the walnut lounge tables
      { x: 2.45, y: 2.15, z: -4.1, w: 2.35, h: 5.2, rx: -0.44, ry: 0.2, rz: -0.22 },
      // Overhead skylight golden column over counter & Miata
      { x: -1.65, y: 2.45, z: -2.15, w: 1.85, h: 4.4, rx: -0.28, ry: 0.12, rz: -0.18 },
      // Cross-angle beam for dimensional depth from side camera views
      { x: 0.85, y: 2.3, z: -2.4, w: 1.9, h: 4.5, rx: -0.32, ry: -0.22, rz: -0.16 },
    ];
    raySpecs.forEach((r) => {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), this.godRayMat);
      plane.position.set(r.x, r.y, r.z);
      plane.rotation.set(r.rx, r.ry, r.rz);
      plane.renderOrder = 3;
      this.godRaysGroup.add(plane);
    });
    this.scene.add(this.godRaysGroup);

    // 3. Subtle Floating Golden Dust Motes drifting through the interior sunbeams
    const dustGeo = new THREE.SphereGeometry(0.014, 6, 6);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xffdf9e,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.goldenDustInstanced = new THREE.InstancedMesh(dustGeo, dustMat, 18);
    this.goldenDustInstanced.frustumCulled = false;
    this.scene.add(this.goldenDustInstanced);
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

    // 2. Outdoor Courtyard Cobblestone Terrace outside the Glass Garage Bay Doors (z = -6.2 to -7.4)
    this.patioFloorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.patioCobbleTexture,
      roughness: 0.78,
      metalness: 0.05,
    });
    const patioFloor = new THREE.Mesh(new THREE.PlaneGeometry(24, 3.0), this.patioFloorMat);
    patioFloor.rotation.x = -Math.PI / 2;
    patioFloor.position.set(0, -0.01, -7.7);
    patioFloor.receiveShadow = true;
    archGroup.add(patioFloor);

    // Outer Neighborhood Ground Plane beneath sidewalk, street & highway
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x1e2c21,
      roughness: 0.92,
    });
    const grassPlane = new THREE.Mesh(new THREE.PlaneGeometry(68, 36), grassMat);
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.position.set(0, -0.04, -22.0);
    archGroup.add(grassPlane);

    // 3. Main Fluted-Timber & Brushed-Brass Barista Counter (Extended +1.15m Left Wing for Champy's Perch; Top strictly y = 1.00)
    const counterBaseMat = new THREE.MeshStandardMaterial({
      color: 0x181310,
      roughness: 0.68,
      metalness: 0.14,
    });
    const counterBody = new THREE.Mesh(new THREE.BoxGeometry(6.75, 0.94, 1.36), counterBaseMat);
    counterBody.position.set(-0.525, 0.47, 0.44);
    counterBody.castShadow = true;
    counterBody.receiveShadow = true;
    archGroup.add(counterBody);

    // Vertical fluted timber slats across the entire extended customer-facing fascia
    for (let s = 0; s < 34; s++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.84, 0.03), this.counterWoodMat);
      slat.position.set(-3.78 + s * 0.198, 0.48, -0.25);
      archGroup.add(slat);
    }

    // Brushed-brass toe kickplate + under-counter warm LED accent strip (extended seamlessly left)
    const kickplate = new THREE.Mesh(new THREE.BoxGeometry(6.81, 0.075, 1.4), brassMat);
    kickplate.position.set(-0.525, 0.038, 0.44);
    archGroup.add(kickplate);

    const underCounterLed = new THREE.Mesh(
      new THREE.BoxGeometry(6.7, 0.022, 0.025),
      this.underCounterNeonMat
    );
    underCounterLed.position.set(-0.525, 0.91, -0.265);
    archGroup.add(underCounterLed);

    // Beveled Walnut Countertop Slab (Top surface strictly at y = 1.00, left edge x = -3.98, right edge x = +2.93)
    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(6.91, 0.06, 1.48),
      this.counterWoodMat
    );
    counterTop.position.set(-0.525, 0.97, 0.44);
    counterTop.castShadow = true;
    counterTop.receiveShadow = true;
    archGroup.add(counterTop);

    const brassTrim = new THREE.Mesh(new THREE.BoxGeometry(6.93, 0.022, 1.5), brassMat);
    brassTrim.position.set(-0.525, 0.935, 0.44);
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

    // Solid Rear Interior Wall (z = +3.7, behind barista cameras) so Go Outside "Look Back" sees a warm enclosed cafe interior instead of open sky
    const backWallUpper = new THREE.Mesh(new THREE.BoxGeometry(11.5, 3.1, 0.28), warmPlasterMat);
    backWallUpper.position.set(0, 2.7, 3.72);
    backWallUpper.receiveShadow = true;
    archGroup.add(backWallUpper);

    const backWallDado = new THREE.Mesh(new THREE.BoxGeometry(11.5, 1.18, 0.32), concreteDadoMat);
    backWallDado.position.set(0, 0.59, 3.7);
    backWallDado.receiveShadow = true;
    archGroup.add(backWallDado);

    const backDadoRail = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.05, 0.36), this.counterWoodMat);
    backDadoRail.position.set(0, 1.19, 3.68);
    archGroup.add(backDadoRail);

    for (let i = -12; i <= 12; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.65, 0.04), this.counterWoodMat);
      slat.position.set(i * 0.42, 2.58, 3.55);
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

    // 5. Sectional Black-Steel Framed Glass Garage Bay Doors + Pivoting Swinging Cafe Entrance Door (z = -6.2)
    const garageWallZ = -6.2;
    this.garageGlassMat = new THREE.MeshStandardMaterial({
      color: 0xcbe3ee,
      roughness: 0.12,
      metalness: 0.18,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Overhead rolled-steel garage header beam, exterior architectural roof overhang & warm wood soffit (visible in Go Outside Look Back!)
    const garageHeaderBeam = new THREE.Mesh(
      new THREE.BoxGeometry(11.6, 0.42, 0.34),
      charcoalSteelMat
    );
    garageHeaderBeam.position.set(0, 3.85, garageWallZ);
    archGroup.add(garageHeaderBeam);

    const extCanopyOverhang = new THREE.Mesh(
      new THREE.BoxGeometry(11.8, 0.18, 1.35),
      charcoalSteelMat
    );
    extCanopyOverhang.position.set(0, 4.02, garageWallZ - 0.56);
    archGroup.add(extCanopyOverhang);

    const extCanopySoffit = new THREE.Mesh(
      new THREE.BoxGeometry(11.4, 0.06, 1.2),
      this.counterWoodMat
    );
    extCanopySoffit.position.set(0, 3.91, garageWallZ - 0.54);
    archGroup.add(extCanopySoffit);

    // Exterior side brick/plaster pilasters framing the cafe facade cleanly from outside
    [-5.72, 5.72].forEach((px) => {
      const extPier = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 4.2, 0.65),
        warmPlasterMat
      );
      extPier.position.set(px, 2.1, garageWallZ - 0.12);
      archGroup.add(extPier);
    });
    const extRoofParapet = new THREE.Mesh(
      new THREE.BoxGeometry(11.9, 0.65, 11.4),
      warmPlasterMat
    );
    extRoofParapet.position.set(0, 4.42, -0.75);
    archGroup.add(extRoofParapet);

    // Split Concrete Knee-Wall Base around the Center-Left Entrance Doorway (doorway: x = -1.72 to -0.58)
    const leftCurb = new THREE.Mesh(new THREE.BoxGeometry(3.98, 0.24, 0.22), concreteDadoMat);
    leftCurb.position.set(-3.71, 0.12, garageWallZ);
    archGroup.add(leftCurb);

    const rightCurb = new THREE.Mesh(new THREE.BoxGeometry(6.28, 0.24, 0.22), concreteDadoMat);
    rightCurb.position.set(2.56, 0.12, garageWallZ);
    archGroup.add(rightCurb);

    // Warm Timber & Brushed-Brass Entrance Threshold Plate at Doorway (x = -1.15, width = 1.16m)
    const thresholdPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.022, 0.28),
      this.counterWoodMat
    );
    thresholdPlate.position.set(-1.15, 0.011, garageWallZ);
    archGroup.add(thresholdPlate);

    // Structural Black-Steel Pilasters (including doorway latch jamb at x = -0.58)
    [-5.45, -1.82, 1.82, 5.45].forEach((px) => {
      const steelPost = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 4.1, 0.26),
        charcoalSteelMat
      );
      steelPost.position.set(px, 2.05, garageWallZ);
      steelPost.castShadow = true;
      archGroup.add(steelPost);
    });

    // Doorway Right Jamb & Door Header Transom Beam (x = -1.72 .. -0.58, height = 2.38m)
    const doorRightJamb = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 3.7, 0.16),
      charcoalSteelMat
    );
    doorRightJamb.position.set(-0.56, 1.85, garageWallZ);
    archGroup.add(doorRightJamb);

    const doorHeaderBeam = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.1, 0.16),
      charcoalSteelMat
    );
    doorHeaderBeam.position.set(-1.15, 2.38, garageWallZ);
    archGroup.add(doorHeaderBeam);

    // Fixed Glass Transom Window above the Swinging Entrance Door (y = 2.43..3.64)
    const doorTransomGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.12, 1.18),
      this.garageGlassMat
    );
    doorTransomGlass.position.set(-1.15, 3.03, garageWallZ);
    archGroup.add(doorTransomGlass);

    // Articulated Pivoting Glass Cafe Entrance Door Leaf (hinged at left jamb x = -1.72, z = -6.2)
    this.entranceDoorPivot = new THREE.Group();
    this.entranceDoorPivot.position.set(-1.72, 0, garageWallZ);
    const doorW = 1.12;
    const doorH = 2.34;
    // Left & Right Door Stiles + Top & Bottom Rails
    const leftStile = new THREE.Mesh(new THREE.BoxGeometry(0.065, doorH, 0.06), charcoalSteelMat);
    leftStile.position.set(0.032, doorH / 2, 0);
    this.entranceDoorPivot.add(leftStile);

    const rightStile = new THREE.Mesh(new THREE.BoxGeometry(0.065, doorH, 0.06), charcoalSteelMat);
    rightStile.position.set(doorW - 0.032, doorH / 2, 0);
    this.entranceDoorPivot.add(rightStile);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.08, 0.06), charcoalSteelMat);
    topRail.position.set(doorW / 2, doorH - 0.04, 0);
    this.entranceDoorPivot.add(topRail);

    const botRail = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.18, 0.06), charcoalSteelMat);
    botRail.position.set(doorW / 2, 0.09, 0);
    this.entranceDoorPivot.add(botRail);

    const midRail = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.1, 0.045, 0.05), charcoalSteelMat);
    midRail.position.set(doorW / 2, 1.04, 0);
    this.entranceDoorPivot.add(midRail);

    const doorGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(doorW - 0.12, doorH - 0.24),
      this.garageGlassMat
    );
    doorGlass.position.set(doorW / 2, doorH / 2 + 0.04, 0);
    this.entranceDoorPivot.add(doorGlass);

    // Brushed-Brass Push/Pull Bar Handle (both exterior & interior sides)
    [-0.065, 0.065].forEach((hz) => {
      const pushBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.44, 10),
        brassMat
      );
      pushBar.position.set(doorW - 0.15, 1.12, hz);
      this.entranceDoorPivot.add(pushBar);

      [0.94, 1.3].forEach((sy) => {
        const standoff = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.01, 0.065, 8),
          brassMat
        );
        standoff.rotation.x = Math.PI / 2;
        standoff.position.set(doorW - 0.15, sy, hz * 0.5);
        this.entranceDoorPivot.add(standoff);
      });
    });

    // Small Brass & Dark-Walnut "OPEN" Plaque hanging inside door glass
    const openPlaque = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.11, 0.016),
      new THREE.MeshStandardMaterial({
        color: 0x241710,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.22,
        roughness: 0.35,
      })
    );
    openPlaque.position.set(doorW * 0.5, 1.56, 0.018);
    this.entranceDoorPivot.add(openPlaque);

    const openTrim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 0.01), brassMat);
    openTrim.position.set(doorW * 0.5, 1.56, 0.012);
    this.entranceDoorPivot.add(openTrim);

    // Phase 6: Direct 3D Front Door Tap Hitbox -> Enter "Go Outside" Scenic Overlook Mode!
    const doorTapCollider = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, doorH, 0.14),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    doorTapCollider.position.set(doorW / 2, doorH / 2, 0);
    doorTapCollider.userData = {
      toolKey: 'front-door-outside',
      label: 'Go Outside · Scenic Overlook',
      onClick: () => {
        this.callbacks.onEnterGoOutside?.();
      },
    };
    this.entranceDoorPivot.add(doorTapCollider);
    this.interactables.push(doorTapCollider);
    archGroup.add(this.entranceDoorPivot);

    // Hanging Brass Shopkeeper Bell mounted above Door Header (x = -1.15, y = 2.30)
    this.doorBellGroup = new THREE.Group();
    this.doorBellGroup.position.set(-1.15, 2.33, garageWallZ + 0.08);
    const bellStrap = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.015), charcoalSteelMat);
    bellStrap.position.y = -0.05;
    this.doorBellGroup.add(bellStrap);
    const bellDome = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.048, 0.065, 12),
      brassMat
    );
    bellDome.position.y = -0.12;
    this.doorBellGroup.add(bellDome);
    archGroup.add(this.doorBellGroup);

    // Fixed Sectional Glass Garage Bays: Left Bay (-3.65, width 3.35), Center-Right Fixed Pane (+0.62, width 2.28), Right Bay (+3.65, width 3.35)
    const fixedBays: Array<{ cx: number; w: number }> = [
      { cx: -3.65, w: 3.35 },
      { cx: 0.62, w: 2.28 },
      { cx: 3.65, w: 3.35 },
    ];
    fixedBays.forEach(({ cx, w }) => {
      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.4), this.garageGlassMat);
      glassPane.position.set(cx, 1.94, garageWallZ);
      archGroup.add(glassPane);

      [0.95, 1.85, 2.75, 3.62].forEach((my) => {
        const hBar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.055, 0.07), charcoalSteelMat);
        hBar.position.set(cx, my, garageWallZ);
        archGroup.add(hBar);
      });

      const vOffsets = w > 3.0 ? [-w / 3, w / 3] : [0];
      vOffsets.forEach((mx) => {
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 3.45, 0.065), charcoalSteelMat);
        vBar.position.set(cx + mx, 1.94, garageWallZ);
        archGroup.add(vBar);
      });
    });

    // Animated Exterior Glass Rain-Trail Layer (strictly outside glass at z = -6.26, scrolling UV in rainy weather)
    this.glassRainStreaksGroup = new THREE.Group();
    this.windowRainMat = new THREE.MeshBasicMaterial({
      map: this.windowRainTexture,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const rainGlassOverlay = new THREE.Mesh(
      new THREE.PlaneGeometry(10.8, 3.45),
      this.windowRainMat
    );
    rainGlassOverlay.position.set(0, 1.95, garageWallZ - 0.05);
    this.glassRainStreaksGroup.add(rainGlassOverlay);
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

    // 7. Sculpted Boulevard Trees Flanking the Far Sidewalk & Side Garden Margins (clear of road lanes!)
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x3f2514, roughness: 0.9 });
    const canopyShades = [0x1b5e36, 0x266d3e, 0x357a44, 0x204e2e].map(
      (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.72 })
    );
    const courtyardTrees: Array<[number, number, number]> = [
      [-6.8, -7.8, 1.08],
      [6.4, -7.6, 1.12],
      [-7.2, -17.4, 1.25],
      [-2.2, -17.5, 1.18],
      [2.8, -17.4, 1.22],
      [7.4, -17.6, 1.15],
    ];
    courtyardTrees.forEach(([tx, tz, sc], idx) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 2.2, 7), barkMat);
      trunk.position.y = 1.1;
      trunk.rotation.z = (idx % 2 === 0 ? 1 : -1) * 0.04;
      tree.add(trunk);

      [-0.25, 0.25].forEach((dir) => {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.9, 6), barkMat);
        branch.position.set(dir * 0.65, 2.1, dir * 0.2);
        branch.rotation.z = -dir * 1.4;
        tree.add(branch);
      });

      [
        [0, 2.55, 0, 1.05, 0.68, 0.95],
        [-0.58, 2.35, 0.22, 0.76, 0.56, 0.72],
        [0.56, 2.42, -0.18, 0.78, 0.54, 0.75],
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

    // 8. Architectural Interior Botanical Planters (kept strictly clear of the x=-1.15 swinging entrance doorway!)
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
      { kind: 'monstera', x: 0.95, z: -5.78, rotY: 0, w: 1.05, d: 0.4, extra: true },
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
      [-3.35, -5.85],
      [1.35, -5.85],
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

  // Phase 2: Authentic 4-Variant Drink Vessel Rig (Hot Mug, Iced Glass, Hot Takeout Cup, Iced Takeout Cold Cup)
  private createMultiVesselRig(
    scale = 1,
    withStaticLiquid = false
  ): {
    root: THREE.Group;
    variants: Record<CupVesselType, THREE.Group>;
    hotTakeoutLid: THREE.Group;
    icedTakeoutLid: THREE.Group;
  } {
    const root = new THREE.Group();

    // 1. Hot Dine-In Porcelain Mug + Saucer + Spoon
    const hotMug = this.createPorcelainCupMesh(1, withStaticLiquid, false);

    // 2. Iced Dine-In Tall Clear Glass + Straw (NO saucer, NO ceramic handle!)
    const icedGlass = new THREE.Group();
    const clearGlassMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const glassBaseMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      roughness: 0.1,
      metalness: 0.08,
      transparent: true,
      opacity: 0.56,
    });
    const glassBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.051, 0.022, 22),
      glassBaseMat
    );
    glassBase.position.y = 0.011;
    icedGlass.add(glassBase);

    const glassWall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.054, 0.175, 24, 1, true),
      clearGlassMat
    );
    glassWall.position.y = 0.106;
    icedGlass.add(glassWall);

    const glassRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.071, 0.0032, 8, 24),
      glassBaseMat
    );
    glassRim.rotation.x = Math.PI / 2;
    glassRim.position.y = 0.193;
    icedGlass.add(glassRim);

    const bambooStrawMat = new THREE.MeshStandardMaterial({
      color: 0xe7d3b0,
      roughness: 0.42,
    });
    const icedStraw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0055, 0.0055, 0.24, 10),
      bambooStrawMat
    );
    icedStraw.position.set(0.026, 0.135, 0.01);
    icedStraw.rotation.z = -0.17;
    icedGlass.add(icedStraw);

    if (withStaticLiquid) {
      const coldLiq = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.051, 0.135, 20),
        new THREE.MeshStandardMaterial({ color: 0xa46636, roughness: 0.2 })
      );
      coldLiq.position.y = 0.09;
      icedGlass.add(coldLiq);
      const miniIceMat = new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        roughness: 0.12,
        transparent: true,
        opacity: 0.78,
      });
      for (let i = 0; i < 3; i++) {
        const ic = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.024), miniIceMat);
        ic.position.set((i - 1) * 0.02, 0.155, (i % 2 === 0 ? 1 : -1) * 0.014);
        ic.rotation.set(i * 0.5, i * 0.8, 0.25);
        icedGlass.add(ic);
      }
    }

    // 3. Hot Takeout Paper Cup + Kraft Heat Sleeve + Snap-on Black Sip Lid
    const hotTakeout = new THREE.Group();
    const paperCupMat = new THREE.MeshStandardMaterial({
      color: 0xfaf6f0,
      roughness: 0.58,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const kraftSleeveMat = new THREE.MeshStandardMaterial({
      color: 0xb68150,
      roughness: 0.76,
      metalness: 0.02,
    });
    const lidBlackMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.34,
      metalness: 0.08,
    });
    const paperWall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.071, 0.051, 0.162, 24, 1, true),
      paperCupMat
    );
    paperWall.position.y = 0.084;
    hotTakeout.add(paperWall);

    const paperBottom = new THREE.Mesh(new THREE.CircleGeometry(0.051, 20), paperCupMat);
    paperBottom.rotation.x = -Math.PI / 2;
    paperBottom.position.y = 0.005;
    hotTakeout.add(paperBottom);

    const kraftSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.066, 0.059, 0.068, 24, 1, true),
      kraftSleeveMat
    );
    kraftSleeve.position.y = 0.085;
    hotTakeout.add(kraftSleeve);

    // Crisp dark espresso & gold circular medallion badge on front of kraft sleeve
    const sleeveBadge = new THREE.Mesh(
      new THREE.CircleGeometry(0.024, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.cupMedallionTexture,
        roughness: 0.36,
      })
    );
    sleeveBadge.position.set(0, 0.086, 0.066);
    hotTakeout.add(sleeveBadge);

    const paperRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.071, 0.0038, 8, 24),
      paperCupMat
    );
    paperRim.rotation.x = Math.PI / 2;
    paperRim.position.y = 0.165;
    hotTakeout.add(paperRim);

    const hotTakeoutLid = new THREE.Group();
    const lidCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.074, 0.014, 24),
      lidBlackMat
    );
    lidCollar.position.y = 0.169;
    hotTakeoutLid.add(lidCollar);
    const lidTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.066, 0.073, 0.015, 24),
      lidBlackMat
    );
    lidTop.position.y = 0.181;
    hotTakeoutLid.add(lidTop);
    const sipSpout = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.01, 0.014), lidBlackMat);
    sipSpout.position.set(0, 0.19, 0.048);
    hotTakeoutLid.add(sipSpout);
    hotTakeout.add(hotTakeoutLid);

    // 4. Iced Takeout Clear Cold Cup + Dome Lid + Emerald Straw
    const icedTakeout = new THREE.Group();
    const coldWall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.071, 0.052, 0.166, 24, 1, true),
      clearGlassMat
    );
    coldWall.position.y = 0.086;
    icedTakeout.add(coldWall);

    const coldBottom = new THREE.Mesh(new THREE.CircleGeometry(0.052, 20), glassBaseMat);
    coldBottom.rotation.x = -Math.PI / 2;
    coldBottom.position.y = 0.005;
    icedTakeout.add(coldBottom);

    const coldLabel = new THREE.Mesh(
      new THREE.CircleGeometry(0.024, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.cupMedallionTexture,
        roughness: 0.28,
      })
    );
    coldLabel.position.set(0, 0.088, 0.065);
    icedTakeout.add(coldLabel);

    const openColdRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.071, 0.0032, 8, 24),
      glassBaseMat
    );
    openColdRim.rotation.x = Math.PI / 2;
    openColdRim.position.y = 0.169;
    icedTakeout.add(openColdRim);

    const icedTakeoutLid = new THREE.Group();
    const domeRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.073, 0.0042, 8, 24),
      glassBaseMat
    );
    domeRim.rotation.x = Math.PI / 2;
    domeRim.position.y = 0.17;
    icedTakeoutLid.add(domeRim);

    const domeLid = new THREE.Mesh(
      new THREE.SphereGeometry(0.071, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.48),
      clearGlassMat
    );
    domeLid.position.y = 0.17;
    icedTakeoutLid.add(domeLid);

    const greenStrawMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      roughness: 0.35,
    });
    const coldStraw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0052, 0.0052, 0.255, 10),
      greenStrawMat
    );
    coldStraw.position.set(0.006, 0.162, 0);
    coldStraw.rotation.z = -0.06;
    icedTakeoutLid.add(coldStraw);
    icedTakeout.add(icedTakeoutLid);

    if (withStaticLiquid) {
      const coldLiq = new THREE.Mesh(
        new THREE.CylinderGeometry(0.064, 0.05, 0.132, 20),
        new THREE.MeshStandardMaterial({ color: 0xb6723a, roughness: 0.2 })
      );
      coldLiq.position.y = 0.082;
      icedTakeout.add(coldLiq);
      const miniIceMat = new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        roughness: 0.12,
        transparent: true,
        opacity: 0.8,
      });
      for (let i = 0; i < 3; i++) {
        const ic = new THREE.Mesh(new THREE.BoxGeometry(0.023, 0.023, 0.023), miniIceMat);
        ic.position.set((i - 1) * 0.019, 0.145, (i % 2 === 0 ? 1 : -1) * 0.014);
        ic.rotation.set(i * 0.6, i * 0.7, 0.2);
        icedTakeout.add(ic);
      }
    }

    icedGlass.visible = false;
    hotTakeout.visible = false;
    icedTakeout.visible = false;

    root.add(hotMug, icedGlass, hotTakeout, icedTakeout);
    root.scale.setScalar(scale);

    return {
      root,
      variants: {
        'hot-mug': hotMug,
        'iced-glass': icedGlass,
        'hot-takeout': hotTakeout,
        'iced-takeout': icedTakeout,
      },
      hotTakeoutLid,
      icedTakeoutLid,
    };
  }

  private setVesselVariantVisibility(
    variants: Record<CupVesselType, THREE.Group>,
    vesselType: CupVesselType
  ) {
    variants['hot-mug'].visible = vesselType === 'hot-mug';
    variants['iced-glass'].visible = vesselType === 'iced-glass';
    variants['hot-takeout'].visible = vesselType === 'hot-takeout';
    variants['iced-takeout'].visible = vesselType === 'iced-takeout';
  }

  // Phase 5 & 7: Single Clean Two-Lane Streetscape, Working Streetlamp Light Cones & Detailed Neighborhood Storefronts (Zero Duplicated Highway!)
  private buildOutdoorNeighborhood() {
    const extGroup = new THREE.Group();

    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.84,
      metalness: 0.04,
    });
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.88,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e22,
      roughness: 0.42,
      metalness: 0.72,
    });
    const cedarMat = new THREE.MeshStandardMaterial({
      color: 0x7c4a26,
      roughness: 0.68,
    });
    const shrubMat = new THREE.MeshStandardMaterial({
      color: 0x256b3c,
      roughness: 0.72,
    });

    // Layer 1: Raised Concrete Pedestrian Sidewalk (z = -7.2 to -9.2) & Painted Curb
    const nearSidewalk = new THREE.Mesh(new THREE.BoxGeometry(38, 0.12, 2.0), sidewalkMat);
    nearSidewalk.position.set(0, 0.02, -8.2);
    nearSidewalk.receiveShadow = true;
    extGroup.add(nearSidewalk);

    const nearCurb = new THREE.Mesh(new THREE.BoxGeometry(38, 0.14, 0.16), curbMat);
    nearCurb.position.set(0, 0.03, -9.22);
    extGroup.add(nearCurb);

    // Exterior Low Cedar Planter Borders flanking the Cafe Entrance Patio (leaving doorway x=-1.15 wide open!)
    [
      { x: -3.9, w: 2.6 },
      { x: 1.9, w: 3.4 },
    ].forEach(({ x, w }) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, 0.42), cedarMat);
      box.position.set(x, 0.21, -6.95);
      extGroup.add(box);
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(w - 0.14, 0.3, 0.32), shrubMat);
      hedge.position.set(x, 0.5, -6.95);
      extGroup.add(hedge);
    });

    // Shared Additive Streetlamp Volumetric Glow Materials (Zero Extra Real-Time PointLights!)
    this.streetLampConeMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.streetLampPoolMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.streetLampGlowsGroup = new THREE.Group();

    const coneGeo = new THREE.CylinderGeometry(0.16, 1.55, 3.38, 14, 1, true);
    const poolGeo = new THREE.CircleGeometry(1.65, 16);
    poolGeo.rotateX(-Math.PI / 2);

    // Warm Minimalist Streetlamps along the Near Sidewalk Curb (with Night Volumetric Light Cones + Sidewalk Pools)
    [-5.4, 0.55, 5.8].forEach((lx) => {
      const lampGroup = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 3.6, 8), darkSteelMat);
      pole.position.y = 1.8;
      lampGroup.add(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.65), darkSteelMat);
      arm.position.set(0, 3.55, -0.3);
      lampGroup.add(arm);

      const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 0.12, 10), darkSteelMat);
      hood.position.set(0, 3.52, -0.6);
      lampGroup.add(hood);

      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xfbbf24,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      });
      this.streetLampBulbMats.push(bulbMat);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), bulbMat);
      globe.position.set(0, 3.44, -0.6);
      lampGroup.add(globe);

      lampGroup.position.set(lx, 0.08, -8.95);
      extGroup.add(lampGroup);

      // Volumetric downward cone & sidewalk glow pool
      const lightCone = new THREE.Mesh(coneGeo, this.streetLampConeMat);
      lightCone.position.set(lx, 1.78, -9.55);
      lightCone.renderOrder = 2;
      this.streetLampGlowsGroup.add(lightCone);

      const lightPool = new THREE.Mesh(poolGeo, this.streetLampPoolMat);
      lightPool.position.set(lx, 0.095, -9.55);
      lightPool.renderOrder = 2;
      this.streetLampGlowsGroup.add(lightPool);
    });
    this.streetLampGlowsGroup.visible = false;
    extGroup.add(this.streetLampGlowsGroup);

    // Layer 2: Single Clean Two-Lane Neighborhood Avenue (z = -9.3 to -15.8) with Wet-Specular Asphalt
    this.roadAsphaltMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.roadAsphaltTexture,
      roughness: 0.85,
      metalness: 0.08,
    });
    const avenueRoad = new THREE.Mesh(new THREE.PlaneGeometry(56, 6.6), this.roadAsphaltMat);
    avenueRoad.rotation.x = -Math.PI / 2;
    avenueRoad.position.set(0, 0.0, -12.55);
    avenueRoad.receiveShadow = true;
    extGroup.add(avenueRoad);

    // Pedestrian Crosswalk Stripes near Cafe Corner (x = -4.2)
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72 });
    for (let s = 0; s < 6; s++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.42), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-4.2, 0.008, -10.0 - s * 1.0);
      extGroup.add(stripe);
    }

    // Opposite Far Sidewalk (z = -15.8 to -17.8) & Curb
    const farCurb = new THREE.Mesh(new THREE.BoxGeometry(46, 0.14, 0.16), curbMat);
    farCurb.position.set(0, 0.03, -15.82);
    extGroup.add(farCurb);

    const farSidewalk = new THREE.Mesh(new THREE.BoxGeometry(46, 0.12, 2.2), sidewalkMat);
    farSidewalk.position.set(0, 0.02, -16.9);
    extGroup.add(farSidewalk);

    // Layer 3: Swappable Outdoor Sceneries 1..9 are mounted dynamically by SceneryManager starting at z <= -16.2!
    // Retain lightweight dummy material refs so legacy weather checks never throw.
    this.cityWindowWarmMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.15,
      roughness: 0.25,
    });
    this.cityWindowCoolMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.1,
      roughness: 0.22,
    });
    this.citySignEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0xf97316,
      emissiveIntensity: 0.65,
      roughness: 0.25,
    });

    this.scene.add(extGroup);
  }

  private buildSnowParticles() {
    const count = 260;
    const positions = new Float32Array(count * 3);
    this.snowVelocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = -26 + Math.random() * 52;
      positions[i * 3 + 1] = 0.4 + Math.random() * 14;
      positions[i * 3 + 2] = -6.8 - Math.random() * 28;
      this.snowVelocities[i * 3] = (Math.random() - 0.5) * 0.65;
      this.snowVelocities[i * 3 + 1] = -(1.1 + Math.random() * 1.15);
      this.snowVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.45;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.24,
      color: 0xf8fafc,
      map: getSharedGlowSpriteTexture(),
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    this.snowPoints = new THREE.Points(geo, mat);
    this.snowPoints.visible = false;
    this.scene.add(this.snowPoints);
  }

  private syncTrafficVisibilityForScenery() {
    const sc = this.gameState.activeScenery || 'busy_street';
    const allowStreetTraffic = sc === 'busy_street' || sc === 'cyberpunk_neon';
    const isLow = this.isSoftwareGl || this.gameState.graphicsQuality === 'low';
    const isMed = this.gameState.graphicsQuality === 'medium';
    const maxStreet = allowStreetTraffic ? (isLow ? 2 : isMed ? 4 : 6) : 0;
    this.trafficPool.forEach((v, idx) => {
      v.group.visible = idx < maxStreet;
    });
  }

  // Phase 3.3: Relocated Exterior Wrought-Iron Double-Sided Hanging Blade Sign beside Entrance Door
  // (Oversized indoor counter sign completely removed so top HUD bar & interior sightline stay unobstructed!)
  private buildHangingTitleSign() {
    const bracketAnchor = new THREE.Group();
    // Anchored cleanly to the left glass mullion bay so the entire sign frames clearly through the left glass pane
    bracketAnchor.position.set(-2.52, 2.52, -6.28);

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.45,
      metalness: 0.78,
    });
    const woodFrameMat = new THREE.MeshStandardMaterial({
      color: 0x24150e,
      roughness: 0.55,
      metalness: 0.16,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.28,
      metalness: 0.85,
    });

    // Matte-black wrought-iron wall mounting plate & perpendicular projecting arm
    const wallPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.58, 0.05), ironMat);
    bracketAnchor.add(wallPlate);

    const topArm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.38), ironMat);
    topArm.position.set(0, 0.24, -0.68);
    bracketAnchor.add(topArm);

    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.72), ironMat);
    brace.position.set(0, 0.04, -0.3);
    brace.rotation.x = 0.62;
    bracketAnchor.add(brace);

    // Swinging Blade Sign Pivot (gentle wind sway along Z, framed cleanly inside left glass window)
    this.hangingSignGroup = new THREE.Group();
    this.hangingSignGroup.position.set(-0.08, 0.22, -0.78);
    this.hangingSignGroup.rotation.y = 0.18;

    // Two brass hanging rings/chains connecting arm to blade sign
    [-0.48, 0.48].forEach((x) => {
      const link = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), brassMat);
      link.position.set(x, -0.08, 0);
      this.hangingSignGroup.add(link);
    });

    const board = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.48, 0.075), woodFrameMat);
    board.position.set(0, -0.36, 0);
    this.hangingSignGroup.add(board);

    this.hangingSignFaceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.hangingSignTexture,
      emissive: 0xf59e0b,
      emissiveMap: this.hangingSignTexture,
      emissiveIntensity: 0.72,
      roughness: 0.28,
    });

    // Double-Sided Sign Faces (front facing interior/sidewalk + back facing opposite street traffic)
    const frontFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.42),
      this.hangingSignFaceMat
    );
    frontFace.position.set(0, -0.36, 0.042);
    this.hangingSignGroup.add(frontFace);

    const backFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.42),
      this.hangingSignFaceMat
    );
    backFace.position.set(0, -0.36, -0.042);
    backFace.rotation.y = Math.PI;
    this.hangingSignGroup.add(backFace);

    // Glowing Neon Trim Tubes along top & bottom of exterior blade sign
    const topTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 1.44, 10),
      this.neonTubeMat
    );
    topTube.rotation.z = Math.PI / 2;
    topTube.position.set(0, -0.14, 0);
    this.hangingSignGroup.add(topTube);

    const botTube = topTube.clone();
    botTube.position.set(0, -0.58, 0);
    this.hangingSignGroup.add(botTube);

    bracketAnchor.add(this.hangingSignGroup);
    this.scene.add(bracketAnchor);
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
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.posScreenTexture,
      toneMapped: false,
    });

    // 1. POS Register at x = -2.35, z = 0.26 (Tap to zoom into Diegetic Barista Codex!)
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

    const posScreenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.25, 0.03), darkMetalMat);
    posScreenFrame.position.set(0, 0.3, 0.02);
    posScreenFrame.rotation.x = -0.35;
    registerGroup.add(posScreenFrame);

    const posDisplay = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.21), screenMat);
    posDisplay.position.set(0, 0.3, 0.038);
    posDisplay.rotation.x = -0.35;
    this.posDisplayMesh = posDisplay;
    registerGroup.add(posDisplay);

    registerGroup.position.set(-2.35, 1.0, 0.26);
    this.registerInteractiveTool(
      'register',
      registerGroup,
      'KLASIK POS · Tap to Open Recipe Book',
      2,
      () => this.callbacks.onToolAction('open_recipes_modal')
    );
    st1Group.add(registerGroup);

    // 2. Phase 6: Overhauled Walnut & Curved-Glass Artisan Pastry Display Case at x = -1.86, y = 1.0, z = 0.22
    const pastryCaseGroup = new THREE.Group();
    const caseBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.056, 0.34),
      this.counterWoodMat
    );
    caseBase.position.y = 0.028;
    caseBase.castShadow = true;
    caseBase.receiveShadow = true;
    pastryCaseGroup.add(caseBase);

    const caseTrim = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.012, 0.35), brassMat);
    caseTrim.position.y = 0.056;
    pastryCaseGroup.add(caseTrim);

    // Warm internal bakery LED backlight strip along top brass rail (zero dynamic GPU light cost!)
    const warmBakeryGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.72,
    });
    const topLightStrip = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.008, 0.018), warmBakeryGlowMat);
    topLightStrip.position.set(0, 0.268, -0.06);
    pastryCaseGroup.add(topLightStrip);

    // Warm brass corner stanchions & curved front glass hood
    [-0.215, 0.215].forEach((sx) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 8), brassMat);
      post.position.set(sx, 0.168, -0.145);
      pastryCaseGroup.add(post);
      const sideArch = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.22, 0.31), brassMat);
      sideArch.position.set(sx, 0.168, 0);
      sideArch.visible = false;
      pastryCaseGroup.add(sideArch);
    });

    const useTrans = this.shouldUsePhysicalTransmission();
    const glassCaseMat = new THREE.MeshPhysicalMaterial({
      color: 0xfffdf5,
      roughness: 0.06,
      metalness: 0.04,
      transmission: useTrans ? 0.78 : 0,
      transparent: true,
      opacity: useTrans ? 0.85 : 0.24,
      depthWrite: false,
    });
    // Rear-open curved bakery glass canopy (cylinder quarter-arc + top & side panes)
    const curvedFrontGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.44, 16, 1, true, 0, Math.PI * 0.5),
      glassCaseMat
    );
    curvedFrontGlass.rotation.z = Math.PI / 2;
    curvedFrontGlass.rotation.y = Math.PI;
    curvedFrontGlass.position.set(0, 0.06, -0.14);
    curvedFrontGlass.renderOrder = 4;
    pastryCaseGroup.add(curvedFrontGlass);

    const glassTop = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.008, 0.17), glassCaseMat);
    glassTop.position.set(0, 0.278, -0.06);
    glassTop.renderOrder = 4;
    pastryCaseGroup.add(glassTop);

    [-0.22, 0.22].forEach((gx) => {
      const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.215, 0.31), glassCaseMat);
      sideGlass.position.set(gx, 0.168, 0);
      sideGlass.renderOrder = 4;
      pastryCaseGroup.add(sideGlass);
    });

    // Stepped Walnut & Cream-Parchment Pastry Display Deck
    const parchmentMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.88,
      metalness: 0.0,
    });
    const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.012, 0.12), brassMat);
    upperDeck.position.set(0, 0.155, -0.06);
    pastryCaseGroup.add(upperDeck);

    // 3 Sculpted Interactive Pastries: Daisy Donut (left), Miata Cake (center), Artisanal Croissant (right)
    const pastryShowcaseDefs: Array<{
      id: PastryId;
      x: number;
      y: number;
      z: number;
      label: string;
    }> = [
      {
        id: 'daisy-donut',
        x: -0.135,
        y: 0.072,
        z: 0.045,
        label: 'Daisy Donut (+$4) · Tap to Grab Pastry',
      },
      {
        id: 'miata-cake',
        x: 0.0,
        y: 0.164,
        z: -0.055,
        label: 'Miata Cake (+$5) · Tap to Grab Pastry',
      },
      {
        id: 'croissant',
        x: 0.135,
        y: 0.072,
        z: 0.045,
        label: 'Butter Croissant (+$4) · Tap to Grab Pastry',
      },
    ];

    this.pastryCaseItemGroups.clear();
    this.pastryCaseHaloMats.clear();
    const hitInvisibleMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    pastryShowcaseDefs.forEach((def) => {
      const slotGroup = new THREE.Group();
      slotGroup.position.set(def.x, def.y, def.z);

      // Parchment paper doily underneath pastry
      const trayPaper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.058, 0.005, 16),
        parchmentMat
      );
      slotGroup.add(trayPaper);

      // Pulsing golden halo ring shown when active customer ordered this pastry!
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const haloRing = new THREE.Mesh(new THREE.RingGeometry(0.052, 0.068, 22), haloMat);
      haloRing.rotation.x = -Math.PI / 2;
      haloRing.position.y = 0.006;
      slotGroup.add(haloRing);
      this.pastryCaseHaloMats.set(def.id, haloMat);

      // Sculpted 3D Pastry Mesh
      const pastryMesh = this.buildSculptedPastryMesh(def.id, 1.0);
      pastryMesh.position.y = 0.006;
      slotGroup.add(pastryMesh);

      // Generous invisible tap hitbox for reliable mobile & desktop pastry selection
      const hitCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.066, 0.066, 0.11, 10),
        hitInvisibleMat
      );
      hitCyl.position.y = 0.048;
      slotGroup.add(hitCyl);

      this.pastryCaseItemGroups.set(def.id, slotGroup);
      this.registerInteractiveTool(`pastry-${def.id}`, slotGroup, def.label, 1, () => {
        this.callbacks.onGrabPastry?.(def.id);
      });
      pastryCaseGroup.add(slotGroup);
    });

    pastryCaseGroup.position.set(-1.86, 1.0, 0.22);
    st1Group.add(pastryCaseGroup);

    // 3. Overhead Glowing & Clickable Hanging Order Tickets (x = -2.28 to -1.68, y = 1.82)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.032, 0.032), brassMat);
    rail.position.set(-1.98, 1.98, 0.18);
    st1Group.add(rail);

    this.ticketTextures = [];
    this.ticketGlowMats = [];
    this.ticketHitboxes = [];
    const ticketXs = [-2.28, -1.98, -1.68];
    const invisibleHitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    ticketXs.forEach((tx, slotIdx) => {
      const ticketGroup = new THREE.Group();
      ticketGroup.position.set(tx, 1.82, 0.19);

      const tCanvas = document.createElement('canvas');
      tCanvas.width = 256;
      tCanvas.height = 320;
      const tTex = new THREE.CanvasTexture(tCanvas);
      tTex.colorSpace = THREE.SRGBColorSpace;
      this.ticketTextures.push(tTex);

      // Additive glowing border halo behind the hanging paper (zero extra dynamic GPU lights!)
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.ticketGlowMats.push(glowMat);
      const glowFrame = new THREE.Mesh(new THREE.PlaneGeometry(0.285, 0.345), glowMat);
      glowFrame.position.z = -0.008;
      ticketGroup.add(glowFrame);

      const ticketMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tTex,
        roughness: 0.55,
      });
      const ticketMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.012), ticketMat);
      ticketGroup.add(ticketMesh);

      // Generous 1.25x tap/click hitbox for effortless mobile & desktop pinning
      const hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.285, 0.36, 0.06), invisibleHitMat);
      ticketGroup.add(hitbox);
      this.ticketHitboxes.push(hitbox);

      this.registerInteractiveTool(
        `order-ticket-${slotIdx}`,
        ticketGroup,
        `Tap to Pin Order #${slotIdx + 1}`,
        2,
        () => {
          const slotData = this.ticketOrderSlots[slotIdx];
          if (slotData) {
            this.callbacks.onPinOrderFromTicket?.(slotData.orderId, slotData.recipeId);
          }
        }
      );

      st1Group.add(ticketGroup);
    });

    // 4. Phase 3: Cafe Cat Perch Cushion & Generalized 9-Cat 3D Rig (-2.90, 1.00, 0.24)
    const champyPerch = this.buildChampyPerchAndCat(brassMat);
    st1Group.add(champyPerch);

    // 5. Phase 4: Charming 3D Glass Cookie Jar with 7 Distinct Chocolate-Chip Cookies right beside the cat
    const cookieJar = this.buildCookieJar(brassMat);
    st1Group.add(cookieJar);

    this.scene.add(st1Group);
  }

  // Sculpted reusable 3D Artisanal Pastries (Daisy Donut, Miata Cake, Butter Croissant)
  private buildSculptedPastryMesh(pastryId: PastryId, scale = 1.0): THREE.Group {
    const g = new THREE.Group();
    g.scale.setScalar(scale);

    if (pastryId === 'daisy-donut') {
      const doughMat = new THREE.MeshStandardMaterial({ color: 0xd99b52, roughness: 0.65 });
      const glazeMat = new THREE.MeshStandardMaterial({ color: 0xfffdf7, roughness: 0.22 });
      const centerMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });

      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.014, 10, 18), doughMat);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = 0.015;
      g.add(baseRing);

      // 8 glossy white daisy icing petals arranged around the top ring
      const petalGeo = new THREE.SphereGeometry(0.014, 8, 8);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const petal = new THREE.Mesh(petalGeo, glazeMat);
        petal.scale.set(1.18, 0.55, 0.85);
        petal.position.set(Math.cos(ang) * 0.033, 0.025, Math.sin(ang) * 0.033);
        petal.rotation.y = -ang;
        g.add(petal);
      }

      // Warm sunny yellow daisy center dot
      const daisyCore = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.01, 14), centerMat);
      daisyCore.position.y = 0.026;
      g.add(daisyCore);
    } else if (pastryId === 'miata-cake') {
      // Sculpted Classic Red NA Miata Frosting Mini-Cake with white cream wheels, headlights & windshield!
      const redFrostingMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.34 });
      const creamIcingMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.26 });
      const cocoaMat = new THREE.MeshStandardMaterial({ color: 0x3b1d0e, roughness: 0.55 });
      const goldGlazeMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.22 });

      const spongeBody = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.028, 0.052), redFrostingMat);
      spongeBody.position.y = 0.02;
      g.add(spongeBody);

      // Rounded nose & tail cream bumpers
      const noseFrost = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.014, 0.05, 10), redFrostingMat);
      noseFrost.rotation.x = Math.PI / 2;
      noseFrost.position.set(0.047, 0.018, 0);
      g.add(noseFrost);

      // White cream convertible cockpit & windshield icing
      const cabinCream = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.018, 0.042), creamIcingMat);
      cabinCream.position.set(-0.005, 0.038, 0);
      g.add(cabinCream);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.044), creamIcingMat);
      windshield.position.set(0.018, 0.043, 0);
      windshield.rotation.z = 0.38;
      g.add(windshield);

      // Cute twin pop-up frosting headlights
      [-0.015, 0.015].forEach((hz) => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.01, 0.012), goldGlazeMat);
        hl.position.set(0.038, 0.036, hz);
        g.add(hl);
      });

      // 4 dark-chocolate cookie wheels
      const wheelGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.008, 10);
      [
        [0.028, 0.026],
        [0.028, -0.026],
        [-0.028, 0.026],
        [-0.028, -0.026],
      ].forEach(([wx, wz]) => {
        const w = new THREE.Mesh(wheelGeo, cocoaMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(wx, 0.011, wz);
        g.add(w);
      });
    } else {
      // Flaky layered golden-brown French Butter Croissant (tapered laminated crescent)
      const crustMat = new THREE.MeshStandardMaterial({ color: 0xc26d18, roughness: 0.48 });
      const flakeMat = new THREE.MeshStandardMaterial({ color: 0xe69f3b, roughness: 0.42 });

      const segments: Array<[number, number, number, number, number]> = [
        [-0.034, 0.012, 0.014, 0.011, 0.48],
        [-0.018, 0.018, 0.004, 0.016, 0.24],
        [0.0, 0.022, -0.002, 0.021, 0.0],
        [0.018, 0.018, 0.004, 0.016, -0.24],
        [0.034, 0.012, 0.014, 0.011, -0.48],
      ];
      segments.forEach(([sx, sy, sz, rad, rotY], idx) => {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(rad, 10, 8),
          idx % 2 === 0 ? crustMat : flakeMat
        );
        puff.scale.set(1.22, 0.88, 0.92);
        puff.position.set(sx, sy, sz);
        puff.rotation.y = rotY;
        g.add(puff);
      });
    }

    return g;
  }

  private buildCookieJar(brassMat: THREE.MeshStandardMaterial): THREE.Group {
    const jarGroup = new THREE.Group();
    // Placed right beside the cat cushion & nameplate, completely clear of the POS register (-2.35, 0.26)
    jarGroup.position.set(-2.58, 1.0, 0.52);

    // Subtle dark rubber coaster base
    const basePad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.076, 0.078, 0.008, 18),
      new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.8 })
    );
    basePad.position.y = 0.004;
    jarGroup.add(basePad);

    // Exactly 7 Individual Stacked Golden-Brown Chocolate-Chip Cookies inside the jar!
    const cookieBiscuitMat = new THREE.MeshStandardMaterial({
      color: 0xc68642,
      roughness: 0.78,
      metalness: 0.02,
    });
    const chipMat = new THREE.MeshStandardMaterial({
      color: 0x3b1e0a,
      roughness: 0.52,
    });
    const cookieGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.015, 14);
    const chipGeo = new THREE.SphereGeometry(0.0052, 6, 6);

    this.cookieJarCookies = [];
    for (let i = 0; i < 7; i++) {
      const cookie = new THREE.Group();
      const body = new THREE.Mesh(cookieGeo, cookieBiscuitMat);
      cookie.add(body);

      // 5 distinct dark-chocolate chips on top & rim of each cookie
      const chipOffsets: Array<[number, number, number]> = [
        [0.016, 0.007, 0.014],
        [-0.018, 0.007, 0.012],
        [0.004, 0.007, -0.021],
        [-0.014, 0.006, -0.016],
        [0.036, 0.001, 0.008],
      ];
      chipOffsets.forEach(([cx, cy, cz]) => {
        const chip = new THREE.Mesh(chipGeo, chipMat);
        chip.position.set(cx, cy, cz);
        cookie.add(chip);
      });

      const angle = i * 0.92;
      cookie.position.set(
        Math.cos(angle) * 0.004,
        0.017 + i * 0.0165,
        Math.sin(angle) * 0.004
      );
      cookie.rotation.y = angle;
      cookie.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.035;
      jarGroup.add(cookie);
      this.cookieJarCookies.push(cookie);
    }

    // Clear glossy cylindrical glass jar wall
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const glassBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.072, 0.148, 18),
      glassMat
    );
    glassBody.position.y = 0.082;
    glassBody.renderOrder = 3;
    jarGroup.add(glassBody);

    // Subtle glass neck collar
    const rimRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.067, 0.0055, 8, 20),
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.16,
        metalness: 0.25,
        transparent: true,
        opacity: 0.65,
      })
    );
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 0.155;
    jarGroup.add(rimRing);

    // Warm walnut wooden lid + brass round knob
    const lidMat = new THREE.MeshStandardMaterial({
      color: 0x6b3e26,
      roughness: 0.45,
      metalness: 0.08,
    });
    const lidDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.068, 0.018, 18), lidMat);
    lidDisc.position.y = 0.164;
    jarGroup.add(lidDisc);

    const knobStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.016, 10), brassMat);
    knobStem.position.y = 0.178;
    jarGroup.add(knobStem);
    const knobTop = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 10), brassMat);
    knobTop.position.y = 0.193;
    jarGroup.add(knobTop);

    // Generous invisible hitbox (mysterious: NO cheat tooltip text!)
    const hitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.105, 0.26, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitMesh.position.y = 0.125;
    jarGroup.add(hitMesh);

    this.cookieJarGroup = jarGroup;
    this.registerInteractiveTool('cookie-jar', jarGroup, '', 2, () => {
      this.handleCookieJarClick();
    });

    return jarGroup;
  }

  public handleCookieJarClick() {
    this.cookieJarWobbleTimer = 0.45;
    if (this.cookieJarTapCount < 7) {
      this.cookieJarTapCount += 1;
      // Visually remove the topmost remaining cookie inside the jar (7 -> 0)
      const removeIdx = 7 - this.cookieJarTapCount;
      const cookieMesh = this.cookieJarCookies[removeIdx];
      if (cookieMesh) {
        cookieMesh.visible = false;
      }
      this.callbacks.onCookieJarTap?.(this.cookieJarTapCount);
    } else {
      // Gentle clink if already empty
      this.callbacks.onCookieJarTap?.(7);
    }
  }

  private redrawCatNameplate(catName: string) {
    if (!this.catNameplateTexture) return;
    const canvas = this.catNameplateTexture.image as HTMLCanvasElement;
    const pCtx = canvas.getContext('2d');
    if (!pCtx) return;
    pCtx.fillStyle = '#1c140e';
    pCtx.fillRect(0, 0, 256, 64);
    pCtx.strokeStyle = '#fbbf24';
    pCtx.lineWidth = 6;
    pCtx.strokeRect(4, 4, 248, 56);
    pCtx.fillStyle = '#fef3c7';
    pCtx.font = 'bold 34px Georgia, serif';
    pCtx.textAlign = 'center';
    pCtx.fillText(catName.toUpperCase(), 128, 44);
    this.catNameplateTexture.needsUpdate = true;
  }

  // Phase 3.2: Organic Curved Bézier Tabby Fur & Dedicated Amby/Gigi/Tisay Procedural Coats (zero straight blocky bands!)
  private createProceduralCatFurTexture(
    spec: CafeCatSpec,
    part: 'body' | 'head' = 'body'
  ): THREE.CanvasTexture | null {
    const texSize = !this.isSoftwareGl && this.gameState.graphicsQuality !== 'low' ? 512 : 256;
    const scale = texSize / 256;
    const canvas = document.createElement('canvas');
    canvas.width = texSize;
    canvas.height = texSize;
    const ctx = canvas.getContext('2d')!;
    const baseHexStr = '#' + spec.furHex.toString(16).padStart(6, '0');
    ctx.fillStyle = baseHexStr;
    ctx.fillRect(0, 0, texSize, texSize);

    // Subtle brushed directional fur-strand grain for velvety plush look
    ctx.save();
    for (let i = 0; i < 720; i++) {
      const fx = ((i * 73) % 256) * scale;
      const fy = ((i * 41 + Math.floor(i / 7) * 19) % 256) * scale;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.038)' : 'rgba(0,0,0,0.048)';
      ctx.fillRect(fx, fy, 1.4 * scale, 6.8 * scale);
    }
    ctx.restore();

    if (spec.coatPattern === 'tabby' || spec.coatPattern === 'tuxedo-tabby') {
      const stripeHexStr = '#' + (spec.stripeHex ?? 0x44403c).toString(16).padStart(6, '0');
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Organic curved Bézier mackerel tabby stripes (quadraticCurveTo with soft multi-pass feathering)
      for (let idx = 0; idx < 8; idx++) {
        const baseY = (24 + idx * 29) * scale;
        const curveDip = (idx % 2 === 0 ? 18 : -14) * scale;
        const passes: Array<{ width: number; alpha: number }> = [
          { width: 15 * scale, alpha: 0.16 },
          { width: 9 * scale, alpha: 0.34 },
          { width: 4.5 * scale, alpha: 0.56 },
        ];
        for (const pass of passes) {
          ctx.strokeStyle = stripeHexStr;
          ctx.globalAlpha = pass.alpha;
          ctx.lineWidth = pass.width;
          ctx.beginPath();
          ctx.moveTo(4 * scale, baseY + (idx % 3 - 1) * 4 * scale);
          ctx.quadraticCurveTo(64 * scale, baseY + curveDip, 128 * scale, baseY - curveDip * 0.45);
          ctx.quadraticCurveTo(192 * scale, baseY + curveDip, 252 * scale, baseY + (idx % 3 - 1) * 4 * scale);
          ctx.stroke();
        }
      }

      // Soft feathered dorsal tabby spine stripe
      ctx.globalAlpha = 0.65;
      const spineGrad = ctx.createLinearGradient(104 * scale, 0, 152 * scale, 0);
      spineGrad.addColorStop(0, 'rgba(0,0,0,0)');
      spineGrad.addColorStop(0.5, stripeHexStr);
      spineGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spineGrad;
      ctx.fillRect(104 * scale, 0, 48 * scale, texSize);

      // Authentic curved forehead "M" marking on head UV
      if (part === 'head') {
        ctx.globalAlpha = 0.78;
        ctx.strokeStyle = stripeHexStr;
        ctx.lineWidth = 4.2 * scale;
        ctx.beginPath();
        ctx.moveTo(44 * scale, 98 * scale);
        ctx.quadraticCurveTo(50 * scale, 70 * scale, 56 * scale, 72 * scale);
        ctx.quadraticCurveTo(60 * scale, 88 * scale, 64 * scale, 91 * scale);
        ctx.quadraticCurveTo(68 * scale, 88 * scale, 72 * scale, 72 * scale);
        ctx.quadraticCurveTo(78 * scale, 70 * scale, 84 * scale, 98 * scale);
        ctx.stroke();
      }
      ctx.restore();
    } else if (spec.coatPattern === 'calico-mikmik') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, texSize, texSize);
      for (let i = 0; i < 420; i++) {
        const fx = ((i * 59) % 256) * scale;
        const fy = ((i * 37) % 256) * scale;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(226,232,240,0.28)' : 'rgba(255,255,255,0.4)';
        ctx.fillRect(fx, fy, 1.4 * scale, 6 * scale);
      }

      const paintFeatheredPatch = (cx: number, cy: number, rx: number, ry: number) => {
        ctx.save();
        ctx.translate(cx * scale, cy * scale);
        ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, rx * 0.15 * scale, 0, 0, rx * scale);
        g.addColorStop(0, '#ea580c');
        g.addColorStop(0.68, '#f97316');
        g.addColorStop(0.88, 'rgba(249,115,22,0.48)');
        g.addColorStop(1, 'rgba(248,250,252,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rx * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      if (part === 'head') {
        paintFeatheredPatch(154, 72, 54, 46);
        paintFeatheredPatch(178, 92, 34, 28);
      } else {
        paintFeatheredPatch(86, 138, 44, 38);
        paintFeatheredPatch(176, 158, 48, 40);
        paintFeatheredPatch(168, 128, 30, 26);
      }
    } else if (spec.coatPattern === 'bicolor-patches') {
      // Phase 3.4: Gigi — Snow-white base coat with crisp feathered charcoal-black patches on head & body
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, texSize, texSize);
      const paintBlackPatch = (cx: number, cy: number, rx: number, ry: number) => {
        ctx.save();
        ctx.translate(cx * scale, cy * scale);
        ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, rx * 0.25 * scale, 0, 0, rx * scale);
        g.addColorStop(0, '#18181b');
        g.addColorStop(0.75, '#27272a');
        g.addColorStop(0.92, 'rgba(24,24,27,0.45)');
        g.addColorStop(1, 'rgba(248,250,252,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rx * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      if (part === 'head') {
        paintBlackPatch(94, 62, 52, 44);
        paintBlackPatch(168, 72, 44, 36);
      } else {
        paintBlackPatch(128, 108, 66, 52);
        paintBlackPatch(176, 168, 46, 38);
        paintBlackPatch(74, 174, 36, 30);
      }
    } else if (spec.coatPattern === 'tuxedo-ginger') {
      // Phase 3.4: Secret Cat Tisay — Sleek warm ginger coat with soft curved ginger sheen & cream undertone
      const grad = ctx.createLinearGradient(0, 0, 0, texSize);
      grad.addColorStop(0, '#dc6f28');
      grad.addColorStop(0.55, '#ea8635');
      grad.addColorStop(1, '#f3a458');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, texSize, texSize);

      ctx.save();
      ctx.strokeStyle = '#b44f14';
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const by = (34 + i * 36) * scale;
        ctx.globalAlpha = 0.26;
        ctx.lineWidth = 7 * scale;
        ctx.beginPath();
        ctx.moveTo(10 * scale, by);
        ctx.quadraticCurveTo(128 * scale, by + (i % 2 === 0 ? 14 : -14) * scale, 246 * scale, by);
        ctx.stroke();
      }
      ctx.restore();
    } else if (spec.id === 'amby') {
      // Phase 3.4: Amby — Warm caramel coat with delicate honey highlights
      const grad = ctx.createLinearGradient(0, 0, 0, texSize);
      grad.addColorStop(0, '#c67e3b');
      grad.addColorStop(0.5, '#d58c44');
      grad.addColorStop(1, '#e5a864');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, texSize, texSize);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  private buildChampyPerchAndCat(brassMat: THREE.MeshStandardMaterial): THREE.Group {
    const perchGroup = new THREE.Group();
    perchGroup.position.set(-2.90, 1.0, 0.24);
    this.catPerchGroup = perchGroup;

    // 1. Woven Oatmeal & Warm-Terracotta Cat Cushion Bed
    const oatmealMat = new THREE.MeshStandardMaterial({
      color: 0xe6d5bc,
      roughness: 0.88,
      metalness: 0.02,
    });
    const terracottaMat = new THREE.MeshStandardMaterial({
      color: 0xb45334,
      roughness: 0.82,
      metalness: 0.03,
    });
    const cushionBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.255, 0.045, 20),
      terracottaMat
    );
    cushionBase.position.y = 0.0225;
    cushionBase.receiveShadow = true;
    perchGroup.add(cushionBase);

    const cushionCenter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.195, 0.205, 0.024, 18),
      oatmealMat
    );
    cushionCenter.position.y = 0.042;
    perchGroup.add(cushionCenter);

    const cushionRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.215, 0.032, 10, 22),
      oatmealMat
    );
    cushionRim.rotation.x = Math.PI / 2;
    cushionRim.position.y = 0.05;
    perchGroup.add(cushionRim);

    // 2. Tiny Ceramic Cream Saucer beside Cushion (framed cleanly in Station 1)
    const saucerGroup = new THREE.Group();
    saucerGroup.position.set(-0.25, 0.0, 0.25);
    const saucerDish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.048, 0.018, 16),
      this.ceramicMugMat
    );
    saucerDish.position.y = 0.009;
    saucerGroup.add(saucerDish);
    const milkPool = new THREE.Mesh(
      new THREE.CircleGeometry(0.052, 16),
      new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.22 })
    );
    milkPool.rotation.x = -Math.PI / 2;
    milkPool.position.y = 0.019;
    saucerGroup.add(milkPool);
    perchGroup.add(saucerGroup);

    // 3. Dynamic Brushed-Brass Tabletop Nameplate
    const plateCanvas = document.createElement('canvas');
    plateCanvas.width = 256;
    plateCanvas.height = 64;
    const nameplateTexture = new THREE.CanvasTexture(plateCanvas);
    nameplateTexture.colorSpace = THREE.SRGBColorSpace;
    this.catNameplateTexture = nameplateTexture;

    const plateStand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.044, 0.022), brassMat);
    plateStand.position.set(0.02, 0.022, 0.30);
    plateStand.rotation.set(-0.35, 0.14, 0);
    perchGroup.add(plateStand);

    const plateFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.168, 0.036),
      new THREE.MeshStandardMaterial({ map: nameplateTexture, roughness: 0.68, metalness: 0.08 })
    );
    plateFace.position.set(0.022, 0.024, 0.312);
    plateFace.rotation.set(-0.35, 0.14, 0);
    perchGroup.add(plateFace);

    // 4. Phase 5: Preloaded 3D Wooden Grooming Brush & Fish Biscuit Treat Props (toggled via .visible only!)
    const brushGroup = new THREE.Group();
    const brushWoodMat = new THREE.MeshStandardMaterial({ color: 0x7c4a26, roughness: 0.55 });
    const bristleMat = new THREE.MeshStandardMaterial({ color: 0xf5e6c8, roughness: 0.85 });
    const brushHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.11, 10), brushWoodMat);
    brushHandle.rotation.z = Math.PI / 2;
    brushHandle.position.set(0.06, 0, 0);
    const brushHead = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.02, 0.048), brushWoodMat);
    brushHead.position.set(-0.018, 0, 0);
    const bristles = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.018, 0.042), bristleMat);
    bristles.position.set(-0.018, -0.018, 0);
    brushGroup.add(brushHandle, brushHead, bristles);
    brushGroup.position.set(0, 0.28, 0.14);
    brushGroup.rotation.set(0.25, -0.4, -0.2);
    brushGroup.visible = false;
    this.catBrushGroup = brushGroup;
    perchGroup.add(brushGroup);

    const treatGroup = new THREE.Group();
    const biscuitMat = new THREE.MeshStandardMaterial({ color: 0xd98a3c, roughness: 0.72 });
    const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), biscuitMat);
    fishBody.scale.set(1.35, 0.45, 0.85);
    const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.024, 4), biscuitMat);
    fishTail.rotation.z = Math.PI / 2;
    fishTail.position.set(-0.028, 0, 0);
    treatGroup.add(fishBody, fishTail);
    treatGroup.position.set(0, 0.11, 0.16);
    treatGroup.visible = false;
    this.catTreatGroup = treatGroup;
    perchGroup.add(treatGroup);

    // 5. Build initial equipped Cafe Cat rig (defaults to Champy or saved equippedCatId)
    const initialCatId: CafeCatId = this.gameState.equippedCatId || 'champy';
    this.buildCafeCatRig(initialCatId, perchGroup, nameplateTexture);

    return perchGroup;
  }

  private buildCafeCatRig(
    catId: CafeCatId,
    perchGroup: THREE.Group,
    nameplateTexture: THREE.CanvasTexture
  ) {
    const spec = getCafeCatSpec(catId);
    this.redrawCatNameplate(spec.name);

    const coatTextures: THREE.CanvasTexture[] = [];
    const bodyFurTex = this.createProceduralCatFurTexture(spec, 'body');
    const headFurTex = this.createProceduralCatFurTexture(spec, 'head');
    if (bodyFurTex) coatTextures.push(bodyFurTex);
    if (headFurTex) coatTextures.push(headFurTex);

    // Velvety matte plush fur (roughness 0.72, low metalness 0.03) — zero plastic or clay bumps!
    const furMat = new THREE.MeshStandardMaterial({
      color: bodyFurTex ? 0xffffff : spec.furHex,
      ...(bodyFurTex ? { map: bodyFurTex } : {}),
      roughness: 0.72,
      metalness: 0.03,
    });
    const headFurMat = new THREE.MeshStandardMaterial({
      color: headFurTex ? 0xffffff : spec.furHex,
      ...(headFurTex ? { map: headFurTex } : {}),
      roughness: 0.72,
      metalness: 0.03,
    });

    const isDarkFur = spec.furHex < 0x333333;
    const innerEarMat = new THREE.MeshStandardMaterial({
      color: isDarkFur ? 0x2d2429 : 0xf4b6c2,
      roughness: 0.78,
    });
    const noseMat = new THREE.MeshStandardMaterial({
      color: isDarkFur ? 0x4a353f : 0xf48fb1,
      roughness: 0.45,
    });

    // Pure white fur material for Katkat & Tisay tuxedo chest bibs, muzzles & paws
    const whiteFurMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.72,
      metalness: 0.03,
    });
    // Vibrant ginger fur material for Mikmik's solid ginger tail & left ear
    const gingerPatchMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.72,
      metalness: 0.03,
    });
    // Charcoal black accent fur material for Gigi's bicolor ears/tail
    const blackPatchMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.75,
      metalness: 0.04,
    });

    // Exact Anatomical Left (+X) and Right (-X) Eye Materials for Heterochromia (Chunky & Cheeto)!
    const makeEyeMat = (hex: number) => {
      const emissiveCol = new THREE.Color(hex).multiplyScalar(0.55);
      return new THREE.MeshStandardMaterial({
        color: hex,
        emissive: emissiveCol,
        emissiveIntensity: 0.28,
        roughness: 0.14,
      });
    };
    const leftEyeIrisMat = makeEyeMat(spec.leftEyeHex);
    const rightEyeIrisMat = makeEyeMat(spec.rightEyeHex);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050507 });
    const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const collarMat = new THREE.MeshStandardMaterial({
      color: spec.collarHex,
      roughness: 0.35,
      metalness: 0.14,
    });
    const bellMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.2,
      metalness: 0.85,
    });

    const catRoot = new THREE.Group();
    const baseScale = new THREE.Vector3(spec.scale[0], spec.scale[1], spec.scale[2]);
    catRoot.scale.copy(baseScale);
    catRoot.position.set(0, 0.055, 0);
    catRoot.rotation.y = 0.24;

    const bodyPivot = new THREE.Group();
    catRoot.add(bodyPivot);

    // Sculpted feline torso + rounded haunches
    const torsoMesh = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 14), furMat);
    torsoMesh.scale.set(0.88, 1.18, 1.05);
    torsoMesh.position.set(0, 0.115, -0.01);
    bodyPivot.add(torsoMesh);

    const isTuxedo =
      spec.coatPattern === 'tuxedo-tabby' || spec.coatPattern === 'tuxedo-ginger';
    const chestMat = isTuxedo ? whiteFurMat : furMat;
    const chestMesh = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), chestMat);
    chestMesh.scale.set(0.95, 1.05, 0.9);
    chestMesh.position.set(0, 0.14, 0.054);
    bodyPivot.add(chestMesh);

    const hindGroup = new THREE.Group();
    hindGroup.position.set(0, 0.065, -0.045);
    const haunchL = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 12), furMat);
    haunchL.scale.set(0.75, 1.05, 1.15);
    haunchL.position.set(-0.055, 0, 0);
    hindGroup.add(haunchL);
    const haunchR = haunchL.clone();
    haunchR.position.x = 0.055;
    hindGroup.add(haunchR);
    bodyPivot.add(hindGroup);

    // 4 Articulated Legs & Velvety Paws (enables true 4-leg phase-shifted gait: 0, 0.5π, π, 1.5π)
    const pawMat = isTuxedo ? whiteFurMat : furMat;
    const makeLimb = (xSign: number, zPos: number): THREE.Group => {
      const leg = new THREE.Group();
      leg.position.set(xSign * 0.044, 0.12, zPos);
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.017, 0.115, 10), furMat);
      limb.position.y = -0.055;
      leg.add(limb);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), pawMat);
      paw.scale.set(1.0, 0.65, 1.25);
      paw.position.set(0, -0.11, 0.012);
      leg.add(paw);
      return leg;
    };
    const frontLeftLeg = makeLimb(-1, 0.068);
    const frontRightLeg = makeLimb(1, 0.068);
    const backLeftLeg = makeLimb(-1, -0.052);
    const backRightLeg = makeLimb(1, -0.052);
    backLeftLeg.visible = false;
    backRightLeg.visible = false;
    bodyPivot.add(frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg);

    // Collar (Cheeto & Tisay = No Collar; Kicks = Thin Black Collar; Amby = Pink Collar; Gigi = Black Collar)
    const collarTubeRadius = spec.collarThin ? 0.0062 : 0.011;
    const collarMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.056, collarTubeRadius, 10, 20),
      collarMat
    );
    collarMesh.rotation.x = Math.PI / 2 + 0.22;
    collarMesh.position.set(0, 0.205, 0.048);
    collarMesh.visible = spec.hasCollar;
    bodyPivot.add(collarMesh);

    const collarBell = new THREE.Group();
    collarBell.position.set(0, 0.192, 0.102);
    const bellBall = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 10), bellMat);
    bellBall.position.y = -0.012;
    collarBell.add(bellBall);
    collarBell.visible = spec.hasCollar && spec.hasBell;
    bodyPivot.add(collarBell);

    // Articulated Head Pivot + Smooth UV-mapped Skull + Ears + Expressive Eyes + Blinking Eyelids
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.245, 0.058);
    bodyPivot.add(headPivot);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.072, 18, 16), headFurMat);
    skull.scale.set(1.08, 0.96, 1.0);
    headPivot.add(skull);

    // Soft muzzle & nose
    const muzzleMat = isTuxedo ? whiteFurMat : furMat;
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), muzzleMat);
    muzzle.scale.set(1.25, 0.78, 0.85);
    muzzle.position.set(0, -0.015, 0.062);
    headPivot.add(muzzle);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8), noseMat);
    nose.scale.set(1.2, 0.85, 0.8);
    nose.position.set(0, -0.008, 0.086);
    headPivot.add(nose);

    // Sculpted triangular cat ears
    const makeEar = (xSign: number): THREE.Group => {
      const ear = new THREE.Group();
      ear.position.set(xSign * 0.045, 0.056, 0.004);
      ear.rotation.z = -xSign * 0.26;
      const earOuterMat =
        spec.coatPattern === 'calico-mikmik' && xSign > 0
          ? gingerPatchMat
          : spec.coatPattern === 'bicolor-patches'
          ? blackPatchMat
          : furMat;
      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.058, 4), earOuterMat);
      outer.position.y = 0.024;
      outer.rotation.y = Math.PI / 4;
      ear.add(outer);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 4), innerEarMat);
      inner.position.set(0, 0.02, 0.008);
      inner.rotation.y = Math.PI / 4;
      ear.add(inner);
      return ear;
    };
    const leftEar = makeEar(-1);
    const rightEar = makeEar(1);
    headPivot.add(leftEar, rightEar);

    // Expressive Eyes with exact anatomical Left (+X) vs Right (-X) iris materials!
    const makeEye = (xSign: number, irisMat: THREE.MeshStandardMaterial): THREE.Mesh => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(xSign * 0.032, 0.012, 0.062);
      eyeGroup.rotation.y = xSign * 0.22;

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 10), irisMat);
      iris.scale.set(1.05, 0.96, 0.55);
      eyeGroup.add(iris);

      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.0055, 0.021, 0.006), pupilMat);
      slit.position.z = 0.0085;
      eyeGroup.add(slit);

      const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 8, 8), sparkleMat);
      catchlight.position.set(-0.0045, 0.005, 0.0115);
      eyeGroup.add(catchlight);

      const eyelid = new THREE.Mesh(
        new THREE.SphereGeometry(0.0185, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
        furMat
      );
      eyelid.scale.set(1.08, 1.0, 0.62);
      eyelid.rotation.x = -0.95;
      eyeGroup.add(eyelid);

      headPivot.add(eyeGroup);
      return eyelid;
    };
    const rightAnatomicalEyelid = makeEye(-1, rightEyeIrisMat);
    const leftAnatomicalEyelid = makeEye(1, leftEyeIrisMat);

    // 3-Segment Articulated Tail (tailBase -> tailMid -> tailTip)
    const tailMat =
      spec.tailHex === 0x18181b
        ? blackPatchMat
        : spec.tailHex !== undefined
        ? gingerPatchMat
        : furMat;
    const tailBase = new THREE.Group();
    tailBase.position.set(0, 0.065, -0.095);
    const tSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.11, 8), tailMat);
    tSeg1.position.set(0, 0.045, -0.03);
    tSeg1.rotation.x = -0.6;
    tailBase.add(tSeg1);

    const tailMid = new THREE.Group();
    tailMid.position.set(0, 0.088, -0.06);
    const tSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.105, 8), tailMat);
    tSeg2.position.set(0, 0.05, -0.012);
    tSeg2.rotation.x = -0.22;
    tailMid.add(tSeg2);
    tailBase.add(tailMid);

    const tailTip = new THREE.Group();
    tailTip.position.set(0, 0.098, -0.022);
    const tSeg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.08, 8), tailMat);
    tSeg3.position.set(0, 0.038, 0.008);
    tSeg3.rotation.x = 0.25;
    tailTip.add(tSeg3);
    const tTipBall = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 8, 8), tailMat);
    tTipBall.position.set(0, 0.076, 0.018);
    tailTip.add(tTipBall);
    tailMid.add(tailTip);
    bodyPivot.add(tailBase);

    // Phase 4 + Phase 0.1/0.2: 5 Standardized Cat Rig Attachment Sockets (anchor_eyes untouched!)
    const anchorEyes = new THREE.Group();
    anchorEyes.name = 'anchor_eyes';
    anchorEyes.position.set(0, 0.012, 0.072);
    headPivot.add(anchorEyes);

    // Seated directly on skull crown (skull radius 0.072 * 0.96 * 0.84 ≈ 0.058) — zero floating hat gap!
    const anchorHeadTop = new THREE.Group();
    anchorHeadTop.name = 'anchor_head_top';
    anchorHeadTop.position.set(0, 0.058, 0.002);
    headPivot.add(anchorHeadTop);

    // Lowered onto actual collar / upper-chest base right beneath chin
    const anchorNeck = new THREE.Group();
    anchorNeck.name = 'anchor_neck';
    anchorNeck.position.set(0, 0.194, 0.05);
    bodyPivot.add(anchorNeck);

    // Aligned vertically along seated cat torso spine (+0.24 tilt matches seated chest-to-haunch axis)
    const anchorTorso = new THREE.Group();
    anchorTorso.name = 'anchor_torso';
    anchorTorso.position.set(0, 0.116, -0.006);
    anchorTorso.rotation.x = 0.24;
    bodyPivot.add(anchorTorso);

    const anchorSpinePoints: THREE.Group[] = [
      new THREE.Vector3(0, 0.22, -0.015),
      new THREE.Vector3(0, 0.185, -0.058),
      new THREE.Vector3(0, 0.14, -0.086),
      new THREE.Vector3(0, 0.092, -0.102),
    ].map((pt, idx) => {
      const node = new THREE.Group();
      node.name = `anchor_spine_point_${idx}`;
      node.position.copy(pt);
      bodyPivot.add(node);
      return node;
    });

    const cosmeticsController = attachCatCosmeticsRig(
      catId,
      { anchorEyes, anchorHeadTop, anchorNeck, anchorTorso, anchorSpinePoints },
      (showBaseCollar) => {
        collarMesh.visible = spec.hasCollar && showBaseCollar;
        collarBell.visible = spec.hasCollar && spec.hasBell && showBaseCollar;
      }
    );
    cosmeticsController.applyLoadout(this.gameState.catLoadouts?.[catId]);

    // Pre-allocated Floating Heart, Sleep zZz, and Golden Comb Sheen Sparkle Sprite Pools
    const heartCanvas = document.createElement('canvas');
    heartCanvas.width = 64;
    heartCanvas.height = 64;
    const hCtx = heartCanvas.getContext('2d')!;
    hCtx.fillStyle = '#f5a623';
    hCtx.beginPath();
    hCtx.moveTo(32, 54);
    hCtx.bezierCurveTo(8, 36, 6, 16, 20, 12);
    hCtx.bezierCurveTo(28, 10, 32, 18, 32, 22);
    hCtx.bezierCurveTo(32, 18, 36, 10, 44, 12);
    hCtx.bezierCurveTo(58, 16, 56, 36, 32, 54);
    hCtx.fill();
    hCtx.fillStyle = '#fef3c7';
    hCtx.beginPath();
    hCtx.arc(23, 21, 3.8, 0, Math.PI * 2);
    hCtx.fill();
    const heartTexture = new THREE.CanvasTexture(heartCanvas);
    heartTexture.colorSpace = THREE.SRGBColorSpace;

    const zzzCanvas = document.createElement('canvas');
    zzzCanvas.width = 64;
    zzzCanvas.height = 64;
    const zCtx = zzzCanvas.getContext('2d')!;
    zCtx.fillStyle = '#e0f2fe';
    zCtx.font = 'bold 34px Georgia, serif';
    zCtx.textAlign = 'center';
    zCtx.fillText('zZ', 32, 44);
    const zzzTexture = new THREE.CanvasTexture(zzzCanvas);
    zzzTexture.colorSpace = THREE.SRGBColorSpace;

    const sparkCanvas = document.createElement('canvas');
    sparkCanvas.width = 64;
    sparkCanvas.height = 64;
    const sCtx = sparkCanvas.getContext('2d')!;
    sCtx.fillStyle = '#fde68a';
    sCtx.beginPath();
    sCtx.moveTo(32, 6);
    sCtx.quadraticCurveTo(35, 29, 58, 32);
    sCtx.quadraticCurveTo(35, 35, 32, 58);
    sCtx.quadraticCurveTo(29, 35, 6, 32);
    sCtx.quadraticCurveTo(29, 29, 32, 6);
    sCtx.fill();
    const sparkleTexture = new THREE.CanvasTexture(sparkCanvas);
    sparkleTexture.colorSpace = THREE.SRGBColorSpace;

    const heartParticles: ChampyParticle[] = [];
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: heartTexture, transparent: true, opacity: 0, depthWrite: false })
      );
      sp.scale.set(0.085, 0.085, 1);
      sp.visible = false;
      catRoot.add(sp);
      heartParticles.push({ sprite: sp, age: 0, duration: 1.25, active: false, startX: 0, startZ: 0, driftX: 0 });
    }

    const sleepParticles: ChampyParticle[] = [];
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: zzzTexture, transparent: true, opacity: 0, depthWrite: false })
      );
      sp.scale.set(0.08, 0.08, 1);
      sp.visible = false;
      catRoot.add(sp);
      sleepParticles.push({ sprite: sp, age: 0, duration: 1.9, active: false, startX: 0, startZ: 0, driftX: 0 });
    }

    const sparkleParticles: ChampyParticle[] = [];
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: sparkleTexture, transparent: true, opacity: 0, depthWrite: false })
      );
      sp.scale.set(0.068, 0.068, 1);
      sp.visible = false;
      catRoot.add(sp);
      sparkleParticles.push({ sprite: sp, age: 0, duration: 0.9, active: false, startX: 0, startZ: 0, driftX: 0 });
    }

    // Generous invisible hit-sphere for reliable mobile tapping & desktop clicking
    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 10),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hitSphere.position.set(0, 0.16, 0.02);
    catRoot.add(hitSphere);

    const petLabel = this.isMobileDevice ? `${spec.name} · Tap to Pet` : `${spec.name} · Click to Pet`;
    const prevCatGroup = this.toolGroups.get('pet-champy');
    if (prevCatGroup) {
      this.interactables = this.interactables.filter((o) => o !== prevCatGroup);
    }
    this.registerInteractiveTool('pet-champy', catRoot, petLabel, 2, () => {
      if (this.catStationOpen && this.catStationMode === 'treat') {
        this.triggerCatTreatToss();
      } else {
        this.petChampy();
        this.callbacks.onPetChampy?.();
      }
    });

    perchGroup.add(catRoot);

    this.champyRig = {
      catId,
      root: catRoot,
      bodyPivot,
      headPivot,
      leftEar,
      rightEar,
      leftEyelid: rightAnatomicalEyelid,
      rightEyelid: leftAnatomicalEyelid,
      leftEyeIrisMat,
      rightEyeIrisMat,
      baseScale,
      coatTextures,
      frontLeftLeg,
      frontRightLeg,
      backLeftLeg,
      backRightLeg,
      hindGroup,
      tailBase,
      tailMid,
      tailTip,
      collarMesh,
      collarBell,
      cosmeticsController,
      heartParticles,
      sleepParticles,
      sparkleParticles,
      heartTexture,
      zzzTexture,
      sparkleTexture,
      nameplateTexture,
      state: 'sitting',
      stateTimer: 0,
      stateDuration: 10.5,
      blinkTimer: 3.0 + Math.random() * 2.5,
      blinkDuration: 0,
      earTwitchTimer: 2.4 + Math.random() * 3.0,
      earTwitchSide: 1,
      greetCooldown: 0,
      petTimer: 0,
      combStretchTimer: 0,
      treatEatTimer: 0,
      walkInProgress: 1,
      sleepParticleTimer: 0,
      swapPopTimer: 0.4,
    };
  }

  private swapCafeCat(nextCatId: CafeCatId) {
    if (!this.catPerchGroup || !this.catNameplateTexture) return;
    if (this.champyRig && this.champyRig.catId === nextCatId) return;

    if (this.champyRig) {
      this.champyRig.cosmeticsController.dispose();
      this.catPerchGroup.remove(this.champyRig.root);
      this.champyRig.heartTexture.dispose();
      this.champyRig.zzzTexture.dispose();
      this.champyRig.sparkleTexture.dispose();
      this.champyRig.coatTextures.forEach((t) => t.dispose());
      this.champyRig.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry?.dispose();
          const m = (obj as THREE.Mesh).material;
          if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
          else m?.dispose();
        }
      });
    }

    this.buildCafeCatRig(nextCatId, this.catPerchGroup, this.catNameplateTexture);
    this.spawnChampyHearts(4);
  }

  private spawnChampyHearts(count = 3) {
    if (!this.champyRig) return;
    let spawned = 0;
    for (let i = 0; i < this.champyRig.heartParticles.length && spawned < count; i++) {
      const p = this.champyRig.heartParticles[i];
      p.active = true;
      p.age = -spawned * 0.16;
      p.duration = 1.2 + Math.random() * 0.35;
      p.startX = (Math.random() - 0.5) * 0.14;
      p.startZ = 0.04 + (Math.random() - 0.5) * 0.08;
      p.driftX = (Math.random() - 0.5) * 0.12;
      p.sprite.visible = true;
      spawned++;
    }
  }

  private spawnCatSparkles(count = 2) {
    if (!this.champyRig) return;
    let spawned = 0;
    for (let i = 0; i < this.champyRig.sparkleParticles.length && spawned < count; i++) {
      const p = this.champyRig.sparkleParticles[i];
      if (p.active) continue;
      p.active = true;
      p.age = 0;
      p.duration = 0.72 + Math.random() * 0.25;
      p.startX = (Math.random() - 0.5) * 0.18;
      p.startZ = (Math.random() - 0.5) * 0.14;
      p.driftX = (Math.random() - 0.5) * 0.09;
      p.sprite.visible = true;
      spawned++;
    }
  }

  private triggerChampyGreeting(targetPos?: THREE.Vector3) {
    if (!this.champyRig) return;
    const rig = this.champyRig;
    if (rig.greetCooldown > 0 || rig.state === 'petted' || this.catStationOpen) return;
    rig.greetCooldown = 14.0;
    rig.state = 'greeting';
    rig.stateTimer = 0;
    rig.stateDuration = 3.2;
    if (targetPos) {
      this.activeGreetTargetPos = targetPos.clone();
    }
    this.callbacks.onChampyGreet?.();
  }

  private updateChampy(dt: number) {
    const rig = this.champyRig;
    if (!rig) return;

    // Gentle wobble animation on the 7-Cookie Glass Jar when tapped
    if (this.cookieJarGroup) {
      if (this.cookieJarWobbleTimer > 0) {
        this.cookieJarWobbleTimer = Math.max(0, this.cookieJarWobbleTimer - dt);
        const w = this.cookieJarWobbleTimer / 0.45;
        this.cookieJarGroup.rotation.z = Math.sin(w * Math.PI * 5) * 0.11 * w;
        this.cookieJarGroup.position.y = 1.0 + Math.sin(w * Math.PI) * 0.022;
      } else {
        this.cookieJarGroup.rotation.z = 0;
        this.cookieJarGroup.position.y = 1.0;
      }
    }

    if (rig.swapPopTimer > 0) {
      rig.swapPopTimer = Math.max(0, rig.swapPopTimer - dt);
    }

    // Phase 5: Smooth Cat Station brush tracking & tossed fish-biscuit arc
    if (this.catBrushGroup) {
      const showBrush =
        this.catStationOpen && this.catStationMode === 'comb' && !this.catStationCustomizeOpen;
      this.catBrushGroup.visible = showBrush;
      if (showBrush) {
        this.catBrushGroup.position.x = THREE.MathUtils.damp(
          this.catBrushGroup.position.x,
          this.catBrushTargetPos.x,
          14,
          dt
        );
        this.catBrushGroup.position.y = THREE.MathUtils.damp(
          this.catBrushGroup.position.y,
          this.catBrushTargetPos.y,
          14,
          dt
        );
        this.catBrushGroup.position.z = THREE.MathUtils.damp(
          this.catBrushGroup.position.z,
          this.catBrushTargetPos.z,
          14,
          dt
        );
      }
    }

    if (this.catTreatGroup && this.catTreatAnim.active) {
      this.catTreatAnim.elapsed += dt;
      const u = Math.min(1, this.catTreatAnim.elapsed / this.catTreatAnim.duration);
      // Parabolic toss from camera side into front of cat's paws
      this.catTreatGroup.position.set(
        THREE.MathUtils.lerp(0.24, 0.02, u),
        0.09 + Math.sin(u * Math.PI) * 0.24,
        THREE.MathUtils.lerp(0.42, 0.15, u)
      );
      this.catTreatGroup.rotation.y += dt * 7.5;
      if (u >= 1) {
        this.catTreatAnim.active = false;
      }
    } else if (this.catTreatGroup && rig.state !== 'eating_treat') {
      this.catTreatGroup.visible = false;
    }

    const isNight = isNightWeather(this.gameState.weather);
    const isCozyWeather = isNight || isRainyWeather(this.gameState.weather);
    const eyeEmissive = isNight ? 0.55 : 0.26;
    rig.leftEyeIrisMat.emissiveIntensity = eyeEmissive;
    rig.rightEyeIrisMat.emissiveIntensity = eyeEmissive;

    rig.greetCooldown = Math.max(0, rig.greetCooldown - dt);
    rig.stateTimer += dt;

    if (rig.combStretchTimer > 0) {
      rig.combStretchTimer = Math.max(0, rig.combStretchTimer - dt);
    }

    // Autonomous behavior transitions every 8-16s (paused to cozy alert pose in Cat Station)
    if (rig.stateTimer >= rig.stateDuration) {
      rig.stateTimer = 0;
      if (
        rig.state === 'petted' ||
        rig.state === 'greeting' ||
        rig.state === 'combed' ||
        rig.state === 'eating_treat' ||
        rig.state === 'walking_in'
      ) {
        rig.state = this.catStationOpen ? 'sitting' : Math.random() < 0.35 ? 'grooming' : 'sitting';
        rig.stateDuration = 8.5 + Math.random() * 6.5;
        this.activeGreetTargetPos = null;
        if (this.catTreatGroup) this.catTreatGroup.visible = false;
      } else if (rig.state === 'sitting' && !this.catStationOpen) {
        const roll = Math.random();
        const sleepThreshold = isCozyWeather ? 0.58 : 0.32;
        if (roll < sleepThreshold) {
          rig.state = 'sleeping';
          rig.stateDuration = 11 + Math.random() * 6;
        } else {
          rig.state = 'grooming';
          rig.stateDuration = 6.5 + Math.random() * 3.5;
        }
      } else {
        rig.state = 'sitting';
        rig.stateDuration = 9 + Math.random() * 6;
      }
    }

    // Natural randomized eye blinks every 3–6 seconds
    rig.blinkTimer -= dt;
    if (rig.blinkTimer <= 0) {
      rig.blinkDuration = 0.14;
      rig.blinkTimer = 3.0 + Math.random() * 3.0;
    }
    if (rig.blinkDuration > 0) {
      rig.blinkDuration = Math.max(0, rig.blinkDuration - dt);
    }

    // Randomized subtle ear twitch every 2.5–6s
    rig.earTwitchTimer -= dt;
    let earTwitchAmt = 0;
    if (rig.earTwitchTimer <= 0) {
      rig.earTwitchTimer = 2.5 + Math.random() * 3.5;
      rig.earTwitchSide = Math.random() < 0.5 ? -1 : 1;
    } else if (rig.earTwitchTimer < 0.18) {
      earTwitchAmt = Math.sin((rig.earTwitchTimer / 0.18) * Math.PI) * 0.22;
    }

    const t = this.elapsed;
    // Phase 3.3: 0.35Hz subtle ribcage breathing wave
    const breathWave = Math.sin(t * Math.PI * 2 * 0.35);

    let targetBodyY = 0;
    let targetBodyPitch = 0;
    let targetBodyYaw = 0;
    let targetBodyRoll = 0;
    let targetHeadX = 0;
    let targetHeadY = 0;
    let targetHeadZ = 0;
    let targetLid = rig.blinkDuration > 0 ? 0.05 : -0.95;
    let targetFrontLeftLegX = 0;
    let targetFrontRightLegX = 0;
    let targetBackLeftLegX = 0;
    let targetBackRightLegX = 0;
    let tailLift = 0.0;
    let tailWaveAmp = 0.22;
    let tailFreq = 1.55;
    let targetScaleX = 1.0 + breathWave * 0.015;
    let targetScaleY = 1.0 + breathWave * 0.018;
    let targetScaleZ = 1.0;

    // Show 4 legs during walk-in gait, tuck hind legs into haunches when seated
    const isWalkingGait = rig.state === 'walking_in';
    rig.backLeftLeg.visible = isWalkingGait;
    rig.backRightLeg.visible = isWalkingGait;
    rig.hindGroup.visible = !isWalkingGait;

    if (isWalkingGait) {
      // Phase 3.3: Fluid 4-leg phase-shifted gait (0, 0.5π, π, 1.5π) + hip/shoulder bob & spine sway
      rig.walkInProgress = Math.min(1, rig.stateTimer / Math.max(0.5, rig.stateDuration));
      const stride = t * 6.5;
      targetFrontLeftLegX = Math.sin(stride) * 0.48;
      targetBackRightLegX = Math.sin(stride + Math.PI * 0.5) * 0.46;
      targetFrontRightLegX = Math.sin(stride + Math.PI) * 0.48;
      targetBackLeftLegX = Math.sin(stride + Math.PI * 1.5) * 0.46;
      targetBodyY = 0.015 + Math.abs(Math.sin(stride)) * 0.016;
      targetBodyRoll = Math.sin(stride) * 0.05;
      targetHeadY = Math.sin(stride * 0.5) * 0.14;
      tailLift = 0.48;
      tailWaveAmp = 0.28;
      tailFreq = 2.4;
      const walkX = THREE.MathUtils.lerp(-0.34, 0, easeInOutCubic(rig.walkInProgress));
      rig.root.position.x = walkX;
    } else {
      rig.root.position.x = THREE.MathUtils.damp(rig.root.position.x, 0, 8, dt);
    }

    if (rig.state === 'sleeping') {
      targetBodyY = -0.052;
      targetBodyPitch = 0.28;
      targetHeadX = 0.42;
      targetHeadY = 0.48;
      targetHeadZ = 0.22;
      targetLid = 0.12;
      targetFrontLeftLegX = -0.65;
      targetFrontRightLegX = -0.65;
      tailLift = -0.55;
      tailWaveAmp = 0.05;
      tailFreq = 0.55;
      targetScaleX = 1.0 + breathWave * 0.026;
      targetScaleY = 0.92 + breathWave * 0.028;
      targetScaleZ = 1.02;
      rig.sleepParticleTimer -= dt;
      if (rig.sleepParticleTimer <= 0 && this.gameState.activeStation !== 6) {
        rig.sleepParticleTimer = 1.65;
        const slot = rig.sleepParticles.find((p) => !p.active);
        if (slot) {
          slot.active = true;
          slot.age = 0;
          slot.duration = 1.9;
          slot.startX = 0.05;
          slot.startZ = 0.06;
          slot.driftX = 0.07;
          slot.sprite.visible = true;
        }
      }
    } else if (rig.state === 'grooming') {
      const lickPhase = Math.sin(t * 9.5);
      targetHeadX = 0.34 + lickPhase * 0.09;
      targetHeadY = -0.22;
      targetHeadZ = -0.14 + lickPhase * 0.06;
      targetLid = -0.35;
      targetFrontRightLegX = -1.25 + lickPhase * 0.16;
      tailWaveAmp = 0.14;
      tailFreq = 1.2;
    } else if (rig.state === 'greeting') {
      let greetYaw = -0.58;
      if (this.activeGreetTargetPos) {
        const dx = this.activeGreetTargetPos.x - -2.9;
        const dz = this.activeGreetTargetPos.z - 0.24;
        const worldAngle = Math.atan2(dx, dz) - 0.24;
        let rel = ((worldAngle + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (rel < -Math.PI) rel += Math.PI * 2;
        greetYaw = THREE.MathUtils.clamp(rel, -1.15, 0.95);
      }
      targetBodyPitch = -0.09;
      targetBodyYaw = THREE.MathUtils.clamp(greetYaw * 0.45, -0.52, 0.42);
      targetHeadX = -0.14;
      targetHeadY = THREE.MathUtils.clamp(greetYaw * 0.55, -0.72, 0.65);
      targetHeadZ = Math.sin(t * 3.0) * 0.07;
      targetLid = rig.blinkDuration > 0 ? 0.05 : -1.05;
      tailLift = 0.42;
      tailWaveAmp = 0.34;
      tailFreq = 2.8;
    } else if (rig.state === 'petted') {
      const knead = Math.sin(t * 8.2);
      targetScaleX = 1.03;
      targetScaleY = 1.04 + Math.sin(t * 5.2) * 0.022;
      targetBodyY = 0.012;
      targetBodyPitch = -0.13; // Leans warmly into barista's hand
      targetHeadX = -0.18 + Math.sin(t * 4.5) * 0.06;
      targetHeadY = Math.sin(t * 2.5) * 0.16;
      targetHeadZ = Math.sin(t * 3.2) * 0.13;
      targetLid = 0.04; // Happy curved squint
      targetFrontLeftLegX = -0.22 + Math.max(0, knead) * 0.22;
      targetFrontRightLegX = -0.22 + Math.max(0, -knead) * 0.22;
      tailLift = 0.46; // Curled happy tail
      tailWaveAmp = 0.38;
      tailFreq = 3.4;
      rig.collarBell.rotation.z = Math.sin(t * 14.0) * 0.28;
    } else if (rig.state === 'combed') {
      // Phase 5.3: Content arched back stretch while being brushed
      targetScaleX = 0.98;
      targetScaleY = 1.06;
      targetScaleZ = 1.08;
      targetBodyY = 0.014;
      targetBodyPitch = -0.16;
      targetHeadX = -0.14;
      targetHeadZ = 0.14 * Math.sin(t * 2.4);
      targetLid = 0.06;
      tailLift = 0.52;
      tailWaveAmp = 0.26;
      tailFreq = 2.2;
    } else if (rig.state === 'eating_treat') {
      // Phase 5.3: Rhythmic nibbling -> joyful happy hop!
      const u = rig.stateTimer / Math.max(0.5, rig.stateDuration);
      if (u < 0.72) {
        const nibble = Math.sin(t * 18.0);
        targetBodyPitch = 0.26;
        targetHeadX = 0.42 + nibble * 0.09;
        targetHeadY = nibble * 0.05;
        targetLid = -0.25;
        tailLift = 0.34;
        tailWaveAmp = 0.4;
        tailFreq = 4.2;
      } else {
        // Happy hop at the end of treat!
        const hopPhase = Math.sin(((u - 0.72) / 0.28) * Math.PI);
        targetBodyY = hopPhase * 0.095;
        targetBodyPitch = -0.14 * hopPhase;
        targetHeadX = -0.2;
        targetLid = 0.04;
        tailLift = 0.56;
        tailWaveAmp = 0.46;
        tailFreq = 5.0;
        if (this.catTreatGroup) this.catTreatGroup.visible = false;
      }
    } else if (!isWalkingGait) {
      // Regal sitting pose with soft head look-at tracking toward pointer/camera in Cat Station
      if (this.catStationOpen) {
        targetHeadY = THREE.MathUtils.clamp(this.pointerNdc.x * 0.42, -0.45, 0.45);
        targetHeadX = THREE.MathUtils.clamp(-this.pointerNdc.y * 0.22, -0.25, 0.22);
      } else {
        targetHeadY = Math.sin(t * 0.52) * 0.28;
        targetHeadX = Math.sin(t * 0.37) * 0.06;
      }
    }

    // Smooth Cat Station drag-to-rotate preview yaw
    const targetRootYaw = this.catStationOpen ? 0.14 + this.catPreviewYawOffset : 0.24;
    rig.root.rotation.y = THREE.MathUtils.damp(rig.root.rotation.y, targetRootYaw, 9, dt);

    // Phase 3.3: Frame-rate independent THREE.MathUtils.damp for every joint!
    rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, targetBodyY, 9, dt);
    rig.bodyPivot.rotation.x = THREE.MathUtils.damp(rig.bodyPivot.rotation.x, targetBodyPitch, 8, dt);
    rig.bodyPivot.rotation.y = THREE.MathUtils.damp(rig.bodyPivot.rotation.y, targetBodyYaw, 8, dt);
    rig.bodyPivot.rotation.z = THREE.MathUtils.damp(rig.bodyPivot.rotation.z, targetBodyRoll, 8, dt);
    rig.bodyPivot.scale.x = THREE.MathUtils.damp(rig.bodyPivot.scale.x, targetScaleX, 7, dt);
    rig.bodyPivot.scale.y = THREE.MathUtils.damp(rig.bodyPivot.scale.y, targetScaleY, 7, dt);
    rig.bodyPivot.scale.z = THREE.MathUtils.damp(rig.bodyPivot.scale.z, targetScaleZ, 7, dt);

    rig.headPivot.rotation.x = THREE.MathUtils.damp(rig.headPivot.rotation.x, targetHeadX, 9, dt);
    rig.headPivot.rotation.y = THREE.MathUtils.damp(rig.headPivot.rotation.y, targetHeadY, 9, dt);
    rig.headPivot.rotation.z = THREE.MathUtils.damp(rig.headPivot.rotation.z, targetHeadZ, 9, dt);
    rig.leftEyelid.rotation.x = THREE.MathUtils.damp(rig.leftEyelid.rotation.x, targetLid, 16, dt);
    rig.rightEyelid.rotation.x = THREE.MathUtils.damp(rig.rightEyelid.rotation.x, targetLid, 16, dt);
    rig.frontLeftLeg.rotation.x = THREE.MathUtils.damp(rig.frontLeftLeg.rotation.x, targetFrontLeftLegX, 11, dt);
    rig.frontRightLeg.rotation.x = THREE.MathUtils.damp(rig.frontRightLeg.rotation.x, targetFrontRightLegX, 11, dt);
    rig.backLeftLeg.rotation.x = THREE.MathUtils.damp(rig.backLeftLeg.rotation.x, targetBackLeftLegX, 11, dt);
    rig.backRightLeg.rotation.x = THREE.MathUtils.damp(rig.backRightLeg.rotation.x, targetBackRightLegX, 11, dt);

    // Subtle ear twitches & greeting perk
    const perk = rig.state === 'greeting' || this.catStationOpen ? 0.12 : 0;
    const leftTwitch = rig.earTwitchSide < 0 ? earTwitchAmt : 0;
    const rightTwitch = rig.earTwitchSide > 0 ? earTwitchAmt : 0;
    rig.leftEar.rotation.x = THREE.MathUtils.damp(rig.leftEar.rotation.x, perk + leftTwitch, 14, dt);
    rig.rightEar.rotation.x = THREE.MathUtils.damp(rig.rightEar.rotation.x, perk + rightTwitch, 14, dt);

    // Phase 3.3: Chained 3-segment sine-wave tail lag (tailBase -> tailMid -> tailTip)
    rig.tailBase.rotation.x = THREE.MathUtils.damp(rig.tailBase.rotation.x, tailLift, 7, dt);
    const targetTailBaseZ = Math.sin(t * tailFreq) * tailWaveAmp;
    const targetTailMidZ = Math.sin(t * tailFreq - 0.9) * (tailWaveAmp * 1.18);
    const targetTailTipZ = Math.sin(t * tailFreq - 1.8) * (tailWaveAmp * 1.32);
    rig.tailBase.rotation.z = THREE.MathUtils.damp(rig.tailBase.rotation.z, targetTailBaseZ, 8, dt);
    rig.tailMid.rotation.z = THREE.MathUtils.damp(rig.tailMid.rotation.z, targetTailMidZ, 8, dt);
    rig.tailTip.rotation.z = THREE.MathUtils.damp(rig.tailTip.rotation.z, targetTailTipZ, 8, dt);

    if (rig.state !== 'petted') {
      rig.collarBell.rotation.z = THREE.MathUtils.damp(rig.collarBell.rotation.z, 0, 7, dt);
    }

    // Skip sprite updates when zoomed into Station 6 Vinyl (off-screen optimization)
    if (this.gameState.activeStation === 6 && !this.catStationOpen) return;

    for (let i = 0; i < rig.heartParticles.length; i++) {
      const p = rig.heartParticles[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age < 0) {
        p.sprite.visible = false;
        continue;
      }
      if (p.age >= p.duration) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const u = p.age / p.duration;
      p.sprite.visible = true;
      p.sprite.position.set(p.startX + p.driftX * u, 0.34 + u * 0.28, p.startZ);
      const mat = p.sprite.material as THREE.SpriteMaterial;
      mat.opacity = u < 0.2 ? u / 0.2 : Math.max(0, 1 - (u - 0.2) / 0.8);
    }

    for (let i = 0; i < rig.sleepParticles.length; i++) {
      const p = rig.sleepParticles[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.duration) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const u = p.age / p.duration;
      p.sprite.position.set(
        p.startX + Math.sin(u * Math.PI * 2) * 0.03 + p.driftX * u,
        0.24 + u * 0.26,
        p.startZ
      );
      const mat = p.sprite.material as THREE.SpriteMaterial;
      mat.opacity = Math.sin(u * Math.PI) * 0.85;
    }

    for (let i = 0; i < rig.sparkleParticles.length; i++) {
      const p = rig.sparkleParticles[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.duration) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const u = p.age / p.duration;
      p.sprite.visible = true;
      p.sprite.position.set(p.startX + p.driftX * u, 0.22 + u * 0.2, p.startZ + 0.05);
      p.sprite.scale.setScalar(0.05 + Math.sin(u * Math.PI) * 0.04);
      const mat = p.sprite.material as THREE.SpriteMaterial;
      mat.opacity = Math.sin(u * Math.PI) * 0.95;
    }
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

    knockBoxGroup.position.set(-0.98, 1.0, 0.36);
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
      3,
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
      3,
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
      3,
      () => this.callbacks.onToolAction('pull_espresso')
    );
    st2Group.add(espressoGroup);

    // 6. Phase 4 & 5: Pressurized Flush-Mount Stainless Glass Rinser at x = 0.52, y = 1.0, z = 0.28 (clean 11cm gap from Espresso Machine!)
    const sinkGroup = new THREE.Group();
    const sinkRim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.024, 0.22), counterStainlessMat);
    sinkRim.position.y = 0.012;
    sinkGroup.add(sinkRim);

    const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.027, 0.18), matteBlackMat);
    sinkBasin.position.y = 0.014;
    sinkGroup.add(sinkBasin);

    // Star-shaped spring press actuator ring in center of rinser basin
    const starHub = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.016, 12), chromeMat);
    starHub.position.y = 0.03;
    sinkGroup.add(starHub);
    for (let si = 0; si < 5; si++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.006, 0.012), chromeMat);
      arm.position.y = 0.032;
      arm.rotation.y = (si / 5) * Math.PI;
      sinkGroup.add(arm);
    }

    const faucetBaseFlange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.018, 0.008, 12),
      chromeMat
    );
    faucetBaseFlange.position.set(0.04, 0.025, -0.078);
    sinkGroup.add(faucetBaseFlange);

    const faucetStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.0105, 0.064, 10),
      chromeMat
    );
    faucetStem.position.set(0.04, 0.055, -0.078);
    sinkGroup.add(faucetStem);

    const faucetArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.04, 0.008, 10, 20, Math.PI),
      chromeMat
    );
    faucetArch.position.set(0, 0.085, -0.078);
    sinkGroup.add(faucetArch);

    const faucetNozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.009, 0.014, 10),
      chromeMat
    );
    faucetNozzle.position.set(-0.04, 0.08, -0.078);
    sinkGroup.add(faucetNozzle);

    // Pressurized upward cyan-white water spray cone + 8 splash droplets
    this.rinserSprayConeMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.056, 0.14, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.rinserSprayConeMesh.rotation.x = Math.PI;
    this.rinserSprayConeMesh.position.y = 0.098;
    this.rinserSprayConeMesh.visible = false;
    sinkGroup.add(this.rinserSprayConeMesh);

    this.rinserMistDrops = [];
    const mistGeo = new THREE.SphereGeometry(0.007, 6, 6);
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.85,
    });
    for (let di = 0; di < 8; di++) {
      const drop = new THREE.Mesh(mistGeo, mistMat);
      drop.visible = false;
      sinkGroup.add(drop);
      this.rinserMistDrops.push(drop);
    }

    sinkGroup.position.set(0.52, 1.0, 0.28);
    this.registerInteractiveTool(
      'sink',
      sinkGroup,
      'Pressurized Glass Rinser [Key R] — Rinse Mug/Glass or Discard Cup',
      3,
      () => this.callbacks.onToolAction('rinse_cup')
    );
    this.toolGroups.set('rinse', sinkGroup);
    st2Group.add(sinkGroup);

    // 6b. Phase 5: Recessed Brushed-Stainless Barista Trash Chute at x = 0.74, y = 1.0, z = 0.28 (for Takeout Cup Disposal!)
    this.trashChuteGroup = new THREE.Group();
    const chuteCollar = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.022, 0.18),
      counterStainlessMat
    );
    chuteCollar.position.y = 0.011;
    this.trashChuteGroup.add(chuteCollar);

    const chuteDarkOpening = new THREE.Mesh(
      new THREE.BoxGeometry(0.125, 0.025, 0.145),
      new THREE.MeshBasicMaterial({ color: 0x09090b })
    );
    chuteDarkOpening.position.y = 0.012;
    this.trashChuteGroup.add(chuteDarkOpening);

    // Hinged stainless swing-flap lid (rotates down -0.85 rad when a takeout cup drops in!)
    this.trashFlapPivot = new THREE.Group();
    this.trashFlapPivot.position.set(0, 0.024, -0.068);
    const flapPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.122, 0.008, 0.138),
      counterStainlessMat
    );
    flapPlate.position.set(0, 0, 0.069);
    this.trashFlapPivot.add(flapPlate);
    this.trashChuteGroup.add(this.trashFlapPivot);

    this.trashChuteGroup.position.set(0.74, 1.0, 0.28);
    this.registerInteractiveTool(
      'trash-chute',
      this.trashChuteGroup,
      'Barista Trash Chute [Key R] — Dispose Takeout Cup & Start Fresh',
      3,
      () => this.callbacks.onToolAction('rinse_cup')
    );
    st2Group.add(this.trashChuteGroup);

    // 7. Active Barista Cup with 4 Authentic Drink Vessels + Dynamic Custom ShaderMaterial Liquid + Clickable Realism Serve Target
    const activeVesselRig = this.createMultiVesselRig(1.04, false);
    this.activeBaristaCupGroup = activeVesselRig.root;
    this.activeVesselVariants = activeVesselRig.variants;
    this.activeHotTakeoutLidMesh = activeVesselRig.hotTakeoutLid;
    this.activeHotTakeoutLidMesh.visible = false;
    this.activeIcedTakeoutLidMesh = activeVesselRig.icedTakeoutLid;
    this.activeIcedTakeoutLidMesh.visible = false;
    this.activeBaristaCupGroup.position.copy(this.cupCurrentPos);

    // Invisible cup click-to-serve hitbox (active only when drink + pastry are ready to serve!)
    const cupServeHitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.1, 0.22, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    cupServeHitbox.position.y = 0.11;
    this.activeBaristaCupGroup.add(cupServeHitbox);
    this.registerInteractiveTool(
      'serve-ready-cup',
      cupServeHitbox,
      'Order Ready! Tap Cup to Serve Customer [Space]',
      5,
      () => {
        if (this.isServeCupClickable) {
          this.callbacks.onToolAction('serve_drink');
        }
      }
    );

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

    assemblyCoasterGroup.position.set(1.18, 1.0, 0.38);
    st3Group.add(assemblyCoasterGroup);

    // 1b. Kyoto Borosilicate Glass Teapot & Botanical Infuser at x = 1.18, y = 1.0, z = 0.14
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

    this.teaPotGroup.position.set(1.18, 1.0, 0.14);
    this.registerInteractiveTool(
      'tea',
      this.teaPotGroup,
      'Kyoto Borosilicate Glass Teapot — Click to Steep Artisanal Tea & Botanicals',
      4,
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

    // 2. Stainless Milk Pitcher at x = 0.96, y = 1.0, z = 0.38
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

    this.milkPitcherGroup.position.set(0.96, 1.0, 0.38);
    this.registerInteractiveTool(
      'milk',
      this.milkPitcherGroup,
      'Stainless Frothing Pitcher — Click to Steam 65°C Microfoam & Pour Latte Art',
      4,
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

    // 3. Recessed Polycarbonate Ice Bin at x = 1.44, y = 1.0, z = 0.16
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

    iceBinGroup.position.set(1.44, 1.0, 0.16);
    this.registerInteractiveTool(
      'ice',
      iceBinGroup,
      'Recessed Polycarbonate Ice Bin & Scoop — Click to Scoop Crystal Ice Cubes',
      4,
      () => this.callbacks.onToolAction('add_ice')
    );
    st3Group.add(iceBinGroup);

    // 4. Tiered Wooden Syrup Rack at x = 1.78, y = 1.0, z = 0.18 (Vanilla, Caramel, Chocolate)
    const rackStep = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.045, 0.18),
      this.counterWoodMat
    );
    rackStep.position.set(1.78, 1.022, 0.18);
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
        x: 1.66,
      },
      {
        flavor: 'caramel',
        title: 'CARAMEL',
        sub: 'SALTED BUTTER',
        labelText: 'Salted Butter Caramel Syrup',
        color: 0xd97706,
        bgHex: '#ffedd5',
        borderHex: '#b45309',
        x: 1.78,
      },
      {
        flavor: 'chocolate',
        title: 'CACAO',
        sub: 'DARK GANACHE',
        labelText: 'Single-Origin Dark Cacao Ganache',
        color: 0x451a03,
        bgHex: '#f5f5f4',
        borderHex: '#78350f',
        x: 1.9,
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
      this.syrupBottleGroups.set(s.flavor, bottleGroup);
      this.syrupBottleBaseX.set(s.flavor, s.x);

      bottleGroup.position.set(s.x, 1.045, 0.18);
      this.registerInteractiveTool(
        `syrup-${s.flavor}`,
        bottleGroup,
        `${s.labelText} — Click to Pump into Cup on Assembly Coaster`,
        4,
        () => this.callbacks.onToolAction('add_syrup', s.flavor)
      );
      st3Group.add(bottleGroup);
    });

    // 5. Ceramic Matcha Chawan Bowl & Bamboo Whisk at x = 1.96, y = 1.0, z = 0.38
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
    matchaGroup.position.set(1.96, 1.0, 0.38);
    this.registerInteractiveTool(
      'syrup-matcha',
      matchaGroup,
      'Ceremonial Matcha Chawan & Bamboo Whisk — Click to Whisk & Pour Uji Matcha',
      4,
      () => this.callbacks.onToolAction('add_syrup', 'matcha')
    );
    st3Group.add(matchaGroup);

    const syrupLiquidMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.12,
      metalness: 0.08,
    });
    this.syrupRibbonMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0065, 0.0042, 0.19, 10),
      syrupLiquidMat
    );
    this.syrupRibbonMesh.visible = false;
    st3Group.add(this.syrupRibbonMesh);

    // 3 reusable glossy syrup droplets falling from spout tip into cup during double-pump pour
    this.syrupDroplets = [];
    const dropGeo = new THREE.SphereGeometry(0.0085, 8, 8);
    for (let i = 0; i < 3; i++) {
      const drop = new THREE.Mesh(dropGeo, syrupLiquidMat);
      drop.visible = false;
      st3Group.add(drop);
      this.syrupDroplets.push(drop);
    }

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

    // 1. Elevated Dark-Walnut & Brass Pickup Coaster at (-1.32, 1.0, 0.34) & Grounded Brass Service Bell at (-1.48, 1.0, 0.38)
    const serveTrayGroup = new THREE.Group();
    const coasterWoodMat = new THREE.MeshStandardMaterial({
      color: 0x3b2314,
      roughness: 0.48,
      metalness: 0.06,
    });
    const bellBaseMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.38,
      metalness: 0.65,
    });
    const trayBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.15, 0.03, 24),
      coasterWoodMat
    );
    trayBase.position.y = 0.015;
    serveTrayGroup.add(trayBase);

    const trayBrassRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.141, 0.0045, 8, 28),
      brassMat
    );
    trayBrassRim.rotation.x = Math.PI / 2;
    trayBrassRim.position.y = 0.031;
    serveTrayGroup.add(trayBrassRim);

    const bellFoot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.043, 0.014, 18),
      bellBaseMat
    );
    bellFoot.position.set(-0.16, 0.007, 0.04);
    serveTrayGroup.add(bellFoot);

    const bellDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.034, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
      brassMat
    );
    bellDome.position.set(-0.16, 0.014, 0.04);
    serveTrayGroup.add(bellDome);

    const bellPlunger = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.009, 10),
      brassMat
    );
    bellPlunger.position.set(-0.16, 0.051, 0.04);
    serveTrayGroup.add(bellPlunger);

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

    // Phase 4: Pulsing Golden-Emerald Ready-to-Serve Halo around Pickup Coaster (works in Realism Mode too!)
    this.serveReadyHaloMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.serveReadyHaloMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.145, 0.195, 28),
      this.serveReadyHaloMat
    );
    this.serveReadyHaloMesh.rotation.x = -Math.PI / 2;
    this.serveReadyHaloMesh.position.y = 0.036;
    this.serveReadyHaloMesh.visible = false;
    serveTrayGroup.add(this.serveReadyHaloMesh);

    serveTrayGroup.position.set(-1.32, 1.0, 0.34);
    this.registerInteractiveTool(
      'serve',
      serveTrayGroup,
      'Customer Pickup Coaster & Service Bell — Click to Ring Bell & Handoff Order [Space]',
      5,
      () => this.callbacks.onToolAction('serve_drink')
    );
    st4Group.add(serveTrayGroup);

    // Phase 0.4 & 6: Staged Prepared Pastry in unobstructed front-center spot beside Pastry Showcase & Serve Coaster!
    this.preparedPastryStageGroup = new THREE.Group();
    this.preparedPastryStageGroup.position.set(-1.58, 1.0, 0.34);
    this.preparedPastryStageGroup.visible = false;

    this.preparedPlateGroup = new THREE.Group();
    const miniPlateBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.062, 0.012, 20),
      this.ceramicMugMat
    );
    miniPlateBase.position.y = 0.006;
    this.preparedPlateGroup.add(miniPlateBase);
    const miniPlateRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.076, 0.0045, 8, 22),
      brassMat
    );
    miniPlateRim.rotation.x = Math.PI / 2;
    miniPlateRim.position.y = 0.012;
    this.preparedPlateGroup.add(miniPlateRim);

    const pDonut = this.buildSculptedPastryMesh('daisy-donut', 0.96);
    pDonut.position.y = 0.013;
    pDonut.visible = false;
    const pMiata = this.buildSculptedPastryMesh('miata-cake', 0.96);
    pMiata.position.y = 0.013;
    pMiata.visible = false;
    const pCroissant = this.buildSculptedPastryMesh('croissant', 1.0);
    pCroissant.position.y = 0.013;
    pCroissant.visible = false;
    this.preparedPlateGroup.add(pDonut, pMiata, pCroissant);
    this.preparedPlatePastryMeshes = {
      'daisy-donut': pDonut,
      'miata-cake': pMiata,
      croissant: pCroissant,
    };
    this.preparedPastryStageGroup.add(this.preparedPlateGroup);

    // Folded Kraft Paper Takeout Bakery Bag with Klasik crest stamp
    this.preparedBagGroup = this.buildKraftPastryBagMesh(1.02);
    this.preparedBagGroup.visible = false;
    this.preparedPastryStageGroup.add(this.preparedBagGroup);

    // Phase 0.4: Subtle pulsing warm amber ring highlight signaling tap-to-return-to-showcase
    this.pastryReturnRingMat = new THREE.MeshBasicMaterial({
      color: 0xf5a623,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.pastryReturnRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.086, 0.114, 28),
      this.pastryReturnRingMat
    );
    this.pastryReturnRingMesh.rotation.x = -Math.PI / 2;
    this.pastryReturnRingMesh.position.y = 0.004;
    this.preparedPastryStageGroup.add(this.pastryReturnRingMesh);

    // Phase 0.4 & 1.3: Expanded 1.45x top-priority touch hitbox for effortless mobile tapping
    const plateHit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.16, 14),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    plateHit.position.y = 0.08;
    this.preparedPastryStageGroup.add(plateHit);
    this.registerInteractiveTool(
      'prepared-pastry-plate',
      this.preparedPastryStageGroup,
      'Plated Pastry — Tap to Return to Showcase',
      5,
      () => {
        if (!this.gameState.preparedPastry || this.pastryReturnAnim.active) return;
        this.triggerPastryReturnAnimation();
      }
    );
    st4Group.add(this.preparedPastryStageGroup);

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
        // Seated cleanly inside the relocated right-center cedar planter (never blocking entrance door x=-1.15!)
        x = 0.95 + ((i % 5) - 2) * 0.22;
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

    tabletGroup.position.set(2.2, 1.0, 0.32);
    this.registerInteractiveTool(
      'upgrade-tablet',
      tabletGroup,
      'Shop Management Tablet — Click to Buy Cafe Upgrades',
      6,
      () => this.callbacks.onToolAction('open_upgrades_modal')
    );
    st5Group.add(tabletGroup);

    // 2. 3D Vinyl Turntable + Album Sleeve Stand at x = 2.54, y = 1.0, z = 0.24
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

    const centerLabelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.vinylLabelTexture,
      roughness: 0.35,
    });
    const centerLabel = new THREE.Mesh(new THREE.CircleGeometry(0.052, 24), centerLabelMat);
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

    // Phase 2.3: Mount all 3 counter audio props (Vinyl / Vintage Radio / Floating Hologram) inside AudioDeviceRoot!
    this.counterAudioProps = new CounterAudioProps(turntableGroup, centerLabelMat);
    this.counterAudioProps.root.position.set(2.54, 1.0, 0.24);
    this.counterAudioProps.setMode(this.audioMode);
    this.registerInteractiveTool(
      'audio-device',
      this.counterAudioProps.hitbox,
      'Audio Deck — Click to Open Vinyl, Radio & External Hologram',
      6,
      () => this.callbacks.onToolAction('open_spotify_modal')
    );
    st5Group.add(this.counterAudioProps.root);

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

    sleeveStandGroup.position.set(2.82, 1.0, 0.12);
    sleeveStandGroup.rotation.y = -0.45;
    this.registerInteractiveTool(
      'vinyl-sleeve',
      sleeveStandGroup,
      'Audio Crate & Now-Playing Sleeve — Click to Open Audio Modal',
      6,
      () => this.callbacks.onToolAction('open_spotify_modal')
    );
    st5Group.add(sleeveStandGroup);

    this.scene.add(st5Group);
  }

  private buildKraftPastryBagMesh(scale = 1.0): THREE.Group {
    const bagGroup = new THREE.Group();
    bagGroup.scale.setScalar(scale);
    const kraftMat = new THREE.MeshStandardMaterial({ color: 0xc89d66, roughness: 0.86 });
    const foldMat = new THREE.MeshStandardMaterial({ color: 0xa67c46, roughness: 0.88 });
    const bagBody = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.128, 0.052), kraftMat);
    bagBody.position.y = 0.064;
    bagGroup.add(bagBody);

    const topFold = new THREE.Mesh(new THREE.BoxGeometry(0.094, 0.022, 0.056), foldMat);
    topFold.position.set(0, 0.128, 0.002);
    topFold.rotation.x = 0.14;
    bagGroup.add(topFold);

    const seal = new THREE.Mesh(
      new THREE.CircleGeometry(0.018, 12),
      new THREE.MeshStandardMaterial({ color: 0x242b2e, roughness: 0.45 })
    );
    seal.position.set(0, 0.072, 0.027);
    bagGroup.add(seal);
    const sealGold = new THREE.Mesh(
      new THREE.RingGeometry(0.015, 0.018, 12),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    sealGold.position.set(0, 0.072, 0.028);
    bagGroup.add(sealGold);

    return bagGroup;
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
    this.upgradeTubePreampGroup.position.set(2.22, 1.0, 0.08);
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
    this.upgradeBonsaiTerrariumGroup.position.set(2.02, 1.0, 0.08);
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
    // Phase 0.4: Relocated neatly to far customer-facing counter edge behind grinder so canisters NEVER block the pastry plate!
    this.upgradeGeishaVaultGroup.position.set(-0.84, 1.0, -0.18);
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

    // Outdoor-Only GPU Vertex-Shader Rain Curtain (Strictly z <= -6.55 — Zero Indoor Rain!)
    const maxDrops = 650;
    const vertCount = maxDrops * 2;
    const positions = new Float32Array(vertCount * 3);
    const origins = new Float32Array(vertCount * 3);
    const speeds = new Float32Array(vertCount);
    const phases = new Float32Array(vertCount);
    const isTails = new Float32Array(vertCount);

    for (let i = 0; i < maxDrops; i++) {
      // Deterministic pseudo-random distribution across outdoor patio, street, and far curb
      const s1 = Math.sin(i * 12.9898 + 1.23) * 43758.5453;
      const r1 = s1 - Math.floor(s1);
      const s2 = Math.sin(i * 78.233 + 4.56) * 28461.1371;
      const r2 = s2 - Math.floor(s2);
      const s3 = Math.sin(i * 39.425 + 9.11) * 19384.6219;
      const r3 = s3 - Math.floor(s3);
      const s4 = Math.sin(i * 93.117 + 2.71) * 31947.4123;
      const r4 = s4 - Math.floor(s4);

      const ox = -13.8 + r1 * 27.6;
      const oz = -6.58 - r2 * 12.0; // Strictly outside glass facade (z = -6.2)
      const spd = 9.8 + r3 * 4.7;
      const ph = r4;

      const v0 = i * 2;
      const v1 = v0 + 1;
      origins[v0 * 3] = ox;
      origins[v0 * 3 + 1] = 0;
      origins[v0 * 3 + 2] = oz;
      origins[v1 * 3] = ox;
      origins[v1 * 3 + 1] = 0;
      origins[v1 * 3 + 2] = oz;
      positions[v0 * 3] = ox;
      positions[v0 * 3 + 2] = oz;
      positions[v1 * 3] = ox;
      positions[v1 * 3 + 2] = oz;

      speeds[v0] = spd;
      speeds[v1] = spd;
      phases[v0] = ph;
      phases[v1] = ph;
      isTails[v0] = 0;
      isTails[v1] = 1;
    }

    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    rainGeo.setAttribute('aOrigin', new THREE.BufferAttribute(origins, 3));
    rainGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    rainGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    rainGeo.setAttribute('aIsTail', new THREE.BufferAttribute(isTails, 1));

    this.gpuRainMat = new THREE.ShaderMaterial({
      vertexShader: GPU_RAIN_VERTEX_SHADER,
      fragmentShader: GPU_RAIN_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xbae6fd) },
        uOpacity: { value: 0.48 },
      },
      transparent: true,
      depthWrite: false,
    });
    this.gpuRainLines = new THREE.LineSegments(rainGeo, this.gpuRainMat);
    this.gpuRainLines.frustumCulled = false;
    this.gpuRainLines.visible = false;
    this.scene.add(this.gpuRainLines);

    // Outdoor Patio & Asphalt Puddle Splash Ripples (Strictly z <= -6.75)
    const splashGeo = new THREE.RingGeometry(0.032, 0.056, 12);
    splashGeo.rotateX(-Math.PI / 2);
    const splashMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    this.rainSplashInstanced = new THREE.InstancedMesh(splashGeo, splashMat, 16);
    this.rainSplashInstanced.frustumCulled = false;
    this.rainSplashInstanced.visible = false;
    this.scene.add(this.rainSplashInstanced);
  }

  private initStaticColliders() {
    this.staticColliders = [];
    // 1990 Mazda Miata MX-5 showroom plinth (3 overlapping 2D circles along its rotated hull)
    this.staticColliders.push(
      { x: MIATA_BAY.centerX, z: MIATA_BAY.centerZ, radius: 1.38 },
      { x: MIATA_BAY.centerX - 0.35, z: MIATA_BAY.centerZ + 0.95, radius: 1.02 },
      { x: MIATA_BAY.centerX + 0.35, z: MIATA_BAY.centerZ - 0.95, radius: 1.02 }
    );
    // Lounge tables
    LOUNGE_TABLE_LAYOUT.forEach((t) => {
      this.staticColliders.push({ x: t.x, z: t.z, radius: 0.7 });
    });
    // Bar counter apron along z = -0.35 so actors never clip into the wooden bar
    for (let cx = -2.2; cx <= 2.2; cx += 1.0) {
      this.staticColliders.push({ x: cx, z: -0.22, radius: 0.52 });
    }
    // Interior cedar planters flanking the glass facade (clear of entrance doorway x = -1.72..-0.58)
    this.staticColliders.push(
      { x: 0.95, z: -5.78, radius: 0.52 },
      { x: 3.65, z: -5.78, radius: 0.52 },
      { x: -3.65, z: -5.78, radius: 0.52 }
    );
  }

  private buildOutdoorPedestrianPool() {
    const pedProfiles = [
      { seed: 101, skin: '#f3d2b3', shirt: '#3b82f6', laneZ: -7.95, x: -7.5, dir: 1 as const, speed: 1.18 },
      { seed: 207, skin: '#c68642', shirt: '#10b981', laneZ: -8.55, x: 5.2, dir: -1 as const, speed: 1.32 },
      { seed: 313, skin: '#f1c27d', shirt: '#f43f5e', laneZ: -16.45, x: -3.2, dir: 1 as const, speed: 1.12 },
      { seed: 419, skin: '#8d5524', shirt: '#f59e0b', laneZ: -8.2, x: 11.0, dir: -1 as const, speed: 1.24 },
      { seed: 523, skin: '#ffdbac', shirt: '#8b5cf6', laneZ: -16.85, x: 7.4, dir: -1 as const, speed: 1.08 },
    ];

    this.pedestrianPool = [];
    pedProfiles.forEach((cfg, idx) => {
      const actor = this.createCustomerCharacter(
        cfg.seed,
        cfg.skin,
        cfg.shirt,
        'casual-garden'
      );
      actor.group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = false;
        }
      });
      actor.activitySprite.visible = false;
      actor.phoneMesh.visible = false;
      actor.heldCup.visible = idx % 2 === 0;
      const pedVessel: CupVesselType = idx % 4 === 0 ? 'hot-takeout' : 'iced-takeout';
      actor.appliedVesselType = pedVessel;
      this.setVesselVariantVisibility(actor.heldVesselVariants, pedVessel);
      actor.group.position.set(cfg.x, 0.08, cfg.laneZ);
      actor.group.rotation.y = cfg.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      this.scene.add(actor.group);

      this.pedestrianPool.push({
        actor,
        laneZ: cfg.laneZ,
        x: cfg.x,
        dir: cfg.dir,
        speed: cfg.speed,
        walkPhase: idx * 1.3,
        pauseTimer: 0,
        glancePhase: idx * 0.9,
      });
    });
  }

  private buildOutdoorTrafficPool() {
    this.vehicleHeadlightMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfef08a,
      emissiveIntensity: 0.75,
      roughness: 0.15,
    });
    this.vehicleTaillightMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 0.95,
      roughness: 0.2,
    });
    this.vehicleHeadlightBeamMat = new THREE.MeshBasicMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.vehicleHeadlightBeamsGroupList = [];

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.7, roughness: 0.25 });
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.12,
      metalness: 0.45,
    });
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.72 });

    const wheelGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.18, 12);
    wheelGeo.rotateX(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.19, 10);
    hubGeo.rotateX(Math.PI / 2);

    const createStylizedVehicle = (
      variant: 'hatchback' | 'keivan' | 'sedan' | 'coupe',
      bodyHex: number
    ): { group: THREE.Group; wheels: THREE.Object3D[] } => {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: bodyHex,
        roughness: 0.28,
        metalness: 0.32,
      });

      const dims =
        variant === 'keivan'
          ? { len: 3.15, w: 1.46, hullH: 0.62, cabLen: 2.55, cabH: 0.68, cabX: -0.05, wb: 0.95 }
          : variant === 'hatchback'
          ? { len: 3.35, w: 1.54, hullH: 0.56, cabLen: 1.75, cabH: 0.52, cabX: -0.25, wb: 1.02 }
          : variant === 'coupe'
          ? { len: 3.65, w: 1.62, hullH: 0.48, cabLen: 1.42, cabH: 0.44, cabX: -0.18, wb: 1.12 }
          : { len: 3.85, w: 1.6, hullH: 0.55, cabLen: 1.72, cabH: 0.5, cabX: -0.08, wb: 1.18 };

      // Primary lower body hull (oriented facing +X)
      const hull = new THREE.Mesh(
        new THREE.BoxGeometry(dims.len, dims.hullH, dims.w),
        bodyMat
      );
      hull.position.set(0, 0.27 + dims.hullH / 2, 0);
      group.add(hull);

      // Front & rear dark bumpers
      const fBumper = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.2, dims.w + 0.04),
        bumperMat
      );
      fBumper.position.set(dims.len / 2 + 0.03, 0.34, 0);
      group.add(fBumper);
      const rBumper = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.2, dims.w + 0.04),
        bumperMat
      );
      rBumper.position.set(-dims.len / 2 - 0.03, 0.34, 0);
      group.add(rBumper);

      // Secondary cabin greenhouse
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(dims.cabLen, dims.cabH, dims.w * 0.88),
        bodyMat
      );
      cabin.position.set(dims.cabX, 0.27 + dims.hullH + dims.cabH / 2 - 0.02, 0);
      group.add(cabin);

      // Tinted wrap-around glass band
      const glassBand = new THREE.Mesh(
        new THREE.BoxGeometry(dims.cabLen + 0.03, dims.cabH * 0.66, dims.w * 0.9),
        windowMat
      );
      glassBand.position.set(dims.cabX, 0.27 + dims.hullH + dims.cabH * 0.46, 0);
      group.add(glassBand);

      // Accent detail: Kei Van roof rack or Coupe rear spoiler
      if (variant === 'keivan') {
        const rack = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.05, dims.w * 0.72),
          bumperMat
        );
        rack.position.set(dims.cabX, 0.27 + dims.hullH + dims.cabH + 0.03, 0);
        group.add(rack);
      } else if (variant === 'coupe') {
        const spoiler = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.05, dims.w * 0.88),
          bumperMat
        );
        spoiler.position.set(-dims.len / 2 + 0.22, 0.27 + dims.hullH + 0.14, 0);
        group.add(spoiler);
      }

      // Headlights (+X) + Lightweight Additive Road-Beam Cones + Taillights (-X)
      const lightGeo = new THREE.BoxGeometry(0.06, 0.14, 0.26);
      const beamConeGeo = new THREE.ConeGeometry(0.46, 2.8, 10, 1, true);
      beamConeGeo.rotateZ(Math.PI / 2);
      const beamGroup = new THREE.Group();
      [-dims.w * 0.34, dims.w * 0.34].forEach((lz) => {
        const hl = new THREE.Mesh(lightGeo, this.vehicleHeadlightMat);
        hl.position.set(dims.len / 2 + 0.01, 0.27 + dims.hullH * 0.56, lz);
        group.add(hl);
        const tl = new THREE.Mesh(lightGeo, this.vehicleTaillightMat);
        tl.position.set(-dims.len / 2 - 0.01, 0.27 + dims.hullH * 0.56, lz);
        group.add(tl);

        const beam = new THREE.Mesh(beamConeGeo, this.vehicleHeadlightBeamMat);
        beam.position.set(dims.len / 2 + 1.42, 0.38, lz);
        beam.rotation.z = -0.07;
        beamGroup.add(beam);
      });
      beamGroup.visible = false;
      group.add(beamGroup);
      this.vehicleHeadlightBeamsGroupList.push(beamGroup);

      // Four grounded rotating wheels (bottom at y = 0)
      const wheels: THREE.Object3D[] = [];
      [
        [dims.wb, dims.w / 2 - 0.04],
        [dims.wb, -(dims.w / 2 - 0.04)],
        [-dims.wb, dims.w / 2 - 0.04],
        [-dims.wb, -(dims.w / 2 - 0.04)],
      ].forEach(([wx, wz]) => {
        const wheelPivot = new THREE.Group();
        wheelPivot.position.set(wx, 0.27, wz);
        const tire = new THREE.Mesh(wheelGeo, tireMat);
        const hub = new THREE.Mesh(hubGeo, hubMat);
        wheelPivot.add(tire, hub);
        group.add(wheelPivot);
        wheels.push(wheelPivot);
      });

      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = false;
        }
      });

      return { group, wheels };
    };

    const trafficDefs: Array<{
      variant: 'hatchback' | 'keivan' | 'sedan' | 'coupe';
      color: number;
      laneZ: number;
      laneY: number;
      x: number;
      dir: 1 | -1;
      speed: number;
      isHighway: boolean;
    }> = [
      // Single Ground-Level Two-Lane Neighborhood Avenue (6 pooled vehicles: 3 eastbound, 3 westbound)
      { variant: 'keivan', color: 0xfef3c7, laneZ: -11.05, laneY: 0.02, x: -3.2, dir: 1, speed: 4.3, isHighway: false },
      { variant: 'hatchback', color: 0x3b82f6, laneZ: -13.75, laneY: 0.02, x: 4.2, dir: -1, speed: 4.9, isHighway: false },
      { variant: 'sedan', color: 0x94a3b8, laneZ: -11.05, laneY: 0.02, x: -13.0, dir: 1, speed: 4.6, isHighway: false },
      { variant: 'coupe', color: 0xef4444, laneZ: -13.75, laneY: 0.02, x: -9.5, dir: -1, speed: 5.5, isHighway: false },
      { variant: 'hatchback', color: 0x10b981, laneZ: -11.05, laneY: 0.02, x: 11.5, dir: 1, speed: 4.5, isHighway: false },
      { variant: 'keivan', color: 0xf97316, laneZ: -13.75, laneY: 0.02, x: 15.0, dir: -1, speed: 4.2, isHighway: false },
    ];

    this.trafficPool = [];
    trafficDefs.forEach((def) => {
      const built = createStylizedVehicle(def.variant, def.color);
      built.group.position.set(def.x, def.laneY, def.laneZ);
      built.group.rotation.y = def.dir === 1 ? 0 : Math.PI;
      this.scene.add(built.group);
      this.trafficPool.push({
        group: built.group,
        wheels: built.wheels,
        laneZ: def.laneZ,
        laneY: def.laneY,
        x: def.x,
        dir: def.dir,
        speed: def.speed,
        isHighway: def.isHighway,
      });
    });
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
    if (text.includes('ORDER !')) {
      // Glowing amber exclamation mark for waiting customer ready to order!
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(28, 32, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c140e';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 28, 38);
    } else if (text.includes('LEFT') || text.includes('EXPIRED')) {
      // Frustrated crimson X icon for expired walkout
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(20, 22);
      ctx.lineTo(36, 38);
      ctx.moveTo(36, 22);
      ctx.lineTo(20, 38);
      ctx.stroke();
    } else if (text.includes('PHOTO')) {
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
    skinPackId: CustomerSkinPackId = 'casual-garden',
    deliveryRiderVariant?: DeliveryRiderVariant,
    patronOutfit?: { id: PatronOutfitId; climate: ClimateState } | null,
    secretNpcAppearance?: SecretNpcAppearance | null
  ): Omit<
    ArticulatedCustomerActor,
    'currentPos' | 'lastPos' | 'waypoints' | 'finalGoalKey' | 'walkPhase' | 'walkBlend' | 'seatedBlend' | 'facingAngle'
  > {
    const group = new THREE.Group();
    const isRider = Boolean(deliveryRiderVariant);
    const riderHex =
      deliveryRiderVariant === 'blue'
        ? 0x2563eb
        : deliveryRiderVariant === 'green'
        ? 0x16a34a
        : 0xdc2626;

    const skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(avatarColor),
      roughness: 0.5,
      metalness: 0.02,
    });
    const jacketMat = new THREE.MeshStandardMaterial({
      color: isRider ? riderHex : new THREE.Color(shirtColor),
      roughness: isRider ? 0.42 : skinPackId === 'cyber-neon-night' ? 0.32 : 0.58,
      metalness: isRider ? 0.12 : skinPackId === 'cyber-neon-night' ? 0.45 : 0.06,
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
    } else if (isRider) {
      // Phase 7 Delivery Rider Uniform: High-Visibility Reflective Chest Strips + Insulated Delivery Backpack!
      const reflectiveMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        emissive: 0xcbd5e1,
        emissiveIntensity: 0.45,
        roughness: 0.22,
        metalness: 0.65,
      });
      const chestStripeH = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.032, 0.27), reflectiveMat);
      chestStripeH.position.set(0, 0.22, 0.005);
      torsoGroup.add(chestStripeH);

      [-0.085, 0.085].forEach((sx) => {
        const chestStripeV = new THREE.Mesh(
          new THREE.BoxGeometry(0.026, 0.26, 0.27),
          reflectiveMat
        );
        chestStripeV.position.set(sx, 0.34, 0.005);
        torsoGroup.add(chestStripeV);
      });

      // Large Square Insulated Delivery Backpack on back with silver reflector trim
      const packBody = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.22), jacketMat);
      packBody.position.set(0, 0.25, -0.24);
      packBody.castShadow = true;
      torsoGroup.add(packBody);

      const packTrim = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.036, 0.23), reflectiveMat);
      packTrim.position.set(0, 0.25, -0.24);
      torsoGroup.add(packTrim);
    } else if (skinPackId === 'botanical-artists') {
      // Phase 8 Polished Studio Apron + Front Tool Pocket + 2 Colorful Paintbrushes!
      const apronMat = new THREE.MeshStandardMaterial({
        color: seed % 2 === 0 ? 0xf5f5f4 : 0xd97706,
        roughness: 0.82,
      });
      const apronBib = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.36, 0.02),
        apronMat
      );
      apronBib.position.set(0, 0.19, 0.142);
      torsoGroup.add(apronBib);

      const apronSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.162, 0.17, 0.21, 16, 1, false, -Math.PI * 0.45, Math.PI * 0.9),
        apronMat
      );
      apronSkirt.scale.set(1.12, 1, 0.8);
      apronSkirt.position.set(0, -0.05, 0.01);
      torsoGroup.add(apronSkirt);

      const apronPocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.1, 0.02),
        new THREE.MeshStandardMaterial({
          color: seed % 2 === 0 ? 0xd6d3d1 : 0xb45309,
          roughness: 0.85,
        })
      );
      apronPocket.position.set(0, 0.13, 0.156);
      torsoGroup.add(apronPocket);

      // 2 Paintbrushes tucked neatly into front apron pocket
      const brushWoodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.55 });
      [
        [-0.03, 0.16, 0x2563eb],
        [0.025, -0.14, 0xdc2626],
      ].forEach(([bx, rotZ, tipHex]) => {
        const handle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.005, 0.006, 0.11, 6),
          brushWoodMat
        );
        handle.position.set(bx as number, 0.2, 0.162);
        handle.rotation.z = rotZ as number;
        torsoGroup.add(handle);
        const tip = new THREE.Mesh(
          new THREE.ConeGeometry(0.008, 0.022, 6),
          new THREE.MeshStandardMaterial({ color: tipHex as number, roughness: 0.4 })
        );
        tip.position.set((bx as number) - Math.sin(rotZ as number) * 0.058, 0.258, 0.162);
        tip.rotation.z = rotZ as number;
        torsoGroup.add(tip);
      });
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

    // Pack-Specific, Rider & Seed-Specific Full 3D Headgear & Hairstyles (with zero hair-through-hat clipping!)
    if (isRider) {
      // Phase 7: Open-Face Color-Matched Scooter Helmet + Dark Tinted Flip-Visor (hides hairCrown cleanly!)
      hairCrown.visible = false;
      const helmetMat = new THREE.MeshStandardMaterial({
        color: riderHex,
        roughness: 0.24,
        metalness: 0.25,
      });
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.1,
        metalness: 0.55,
        transparent: true,
        opacity: 0.82,
      });
      const helmetShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.186, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.64),
        helmetMat
      );
      helmetShell.position.set(0, 0.215, -0.006);
      helmetShell.rotation.x = -0.1;
      neckJoint.add(helmetShell);

      const helmetRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.178, 0.014, 8, 22),
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 })
      );
      helmetRim.rotation.x = Math.PI / 2 - 0.1;
      helmetRim.position.set(0, 0.21, -0.004);
      neckJoint.add(helmetRim);

      const flipVisor = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.188,
          0.188,
          0.075,
          20,
          1,
          true,
          -Math.PI * 0.34,
          Math.PI * 0.68
        ),
        visorMat
      );
      flipVisor.position.set(0, 0.23, 0.008);
      neckJoint.add(flipVisor);
    } else if (skinPackId === 'miata-track-club') {
      hairCrown.visible = false;
      const capColor = new THREE.Color(shirtColor).getHex();
      addFull3DCap(capColor, 0xfefce8);
    } else if (skinPackId === 'vinyl-jazz-collectors') {
      hairCrown.visible = false;
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
      // Phase 8: Snug French Artist Beret (hides top hairCrown so zero hair clips through!)
      hairCrown.visible = false;
      const beretMat = new THREE.MeshStandardMaterial({
        color: seed % 2 === 0 ? 0x991b1b : 0x15803d,
        roughness: 0.84,
      });
      // Snug beret headband hugging head at y = 0.238
      const beretBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.162, 0.011, 8, 22),
        beretMat
      );
      beretBand.rotation.x = Math.PI / 2 - 0.12;
      beretBand.position.set(0, 0.238, -0.004);
      neckJoint.add(beretBand);

      // Soft angled wool beret crown resting naturally on the skull (rotation.z = 0.16)
      const beretDisc = new THREE.Mesh(new THREE.SphereGeometry(0.188, 18, 12), beretMat);
      beretDisc.scale.set(1.08, 0.42, 1.06);
      beretDisc.position.set(0.018, 0.285, -0.008);
      beretDisc.rotation.z = 0.16;
      neckJoint.add(beretDisc);

      // Authentic tiny centered beret stem nub
      const beretStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.009, 0.028, 6),
        beretMat
      );
      beretStem.position.set(0.004, 0.365, -0.008);
      beretStem.rotation.z = 0.16;
      neckJoint.add(beretStem);
    } else if (skinPackId === 'cyber-neon-night') {
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
      hairCrown.visible = false;
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
        hairCrown.visible = false;
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
        hairCrown.visible = false;
        addFull3DCap(0x1e3a8a, 0x172554);
      }
    }

    const sleeveMat =
      !isRider && skinPackId === 'tokyo-streetwear'
        ? new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.55 })
        : jacketMat;

    const buildArm = (sideX: number) => {
      const shoulderJoint = new THREE.Group();
      shoulderJoint.position.set(sideX, 0.44, 0);

      // Phase 8: Sculpted Rounded Shoulder Cap matching sleeve/jacket so arms join torso seamlessly!
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8), sleeveMat);
      shoulderCap.position.set(sideX < 0 ? 0.012 : -0.012, -0.008, 0);
      shoulderJoint.add(shoulderCap);

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

    // Phase 6: Procedural Rainy-Day 3D Umbrella attached to Left Hand (shown automatically outdoors in rain!)
    const umbrellaPalette = [0x1d4ed8, 0xb91c1c, 0x0f766e, 0xd97706, 0x4c1d95, 0x334155, 0xbe185d];
    const umbrellaHex = umbrellaPalette[Math.abs(seed) % umbrellaPalette.length];
    const umbrellaGroup = this.createUmbrellaMesh(umbrellaHex);
    // Oriented so when leftShoulder=-1.28, leftElbow=-0.30 (forearm forward), the shaft rises straight UP (+Y world) above the head
    umbrellaGroup.position.set(0.06, -0.22, 0.02);
    umbrellaGroup.rotation.set(Math.PI / 2, 0, -0.08);
    umbrellaGroup.visible = false;
    leftArm.elbowJoint.add(umbrellaGroup);

    // Held Authentic Multi-Vessel Drink Cup in Right Hand (Hot Mug / Iced Glass / Hot Takeout / Iced Takeout)
    const heldVesselRig = this.createMultiVesselRig(0.76, true);
    const heldCup = heldVesselRig.root;
    heldCup.position.set(0, -0.24, 0.06);
    heldCup.rotation.x = Math.PI / 2;
    heldCup.visible = false;
    rightArm.elbowJoint.add(heldCup);

    // Phase 6: Held Artisanal Pastry in Left Hand (Mini Porcelain Plate for Dine-In OR Kraft Paper Bag for Takeout/Delivery!)
    const heldPastryGroup = new THREE.Group();
    heldPastryGroup.position.set(0, -0.24, 0.075);
    heldPastryGroup.rotation.x = Math.PI / 2;
    heldPastryGroup.visible = false;

    const heldPastryPlateGroup = new THREE.Group();
    const hpPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.052, 0.011, 16),
      this.ceramicMugMat
    );
    hpPlate.position.y = 0.0055;
    heldPastryPlateGroup.add(hpPlate);
    const hpDonut = this.buildSculptedPastryMesh('daisy-donut', 0.85);
    hpDonut.position.y = 0.011;
    hpDonut.visible = false;
    const hpMiata = this.buildSculptedPastryMesh('miata-cake', 0.85);
    hpMiata.position.y = 0.011;
    hpMiata.visible = false;
    const hpCroissant = this.buildSculptedPastryMesh('croissant', 0.88);
    hpCroissant.position.y = 0.011;
    hpCroissant.visible = false;
    heldPastryPlateGroup.add(hpDonut, hpMiata, hpCroissant);
    const heldPastryPlateItems: Record<PastryId, THREE.Group> = {
      'daisy-donut': hpDonut,
      'miata-cake': hpMiata,
      croissant: hpCroissant,
    };
    heldPastryGroup.add(heldPastryPlateGroup);

    const heldPastryBagGroup = this.buildKraftPastryBagMesh(0.88);
    heldPastryBagGroup.visible = false;
    heldPastryGroup.add(heldPastryBagGroup);
    leftArm.elbowJoint.add(heldPastryGroup);

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

    // Phase 4 & 5: Apply Secret Easter Egg NPC look (immune to patron outfits!) OR modular Patron Outfit pack
    if (secretNpcAppearance) {
      applySecretNpcLookToRig(
        {
          torsoGroup,
          neckJoint,
          leftArmJoint: leftArm.elbowJoint,
          rightArmJoint: rightArm.elbowJoint,
          leftHipJoint: leftLeg.hipJoint,
          rightHipJoint: rightLeg.hipJoint,
          leftKneeJoint: leftLeg.kneeJoint,
          rightKneeJoint: rightLeg.kneeJoint,
          skinMat,
          jacketMat,
          denimMat,
          shoeMat,
          hairMat,
        },
        secretNpcAppearance
      );
    } else if (patronOutfit && !isRider) {
      applyPatronOutfitToRig(
        {
          pelvisGroup,
          torsoGroup,
          neckJoint,
          leftHipJoint: leftLeg.hipJoint,
          rightHipJoint: rightLeg.hipJoint,
          leftKneeJoint: leftLeg.kneeJoint,
          rightKneeJoint: rightLeg.kneeJoint,
          jacketMat,
          denimMat,
          shoeMat,
          skinMat,
        },
        patronOutfit.id,
        patronOutfit.climate,
        seed
      );
    }

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
      heldVesselVariants: heldVesselRig.variants,
      appliedVesselType: 'hot-mug' as CupVesselType,
      heldPastryGroup,
      heldPastryPlateGroup,
      heldPastryBagGroup,
      heldPastryPlateItems,
      appliedPastryId: null,
      umbrellaGroup,
      phoneMesh,
      activitySprite,
      activityTexture,
      lastActivityLabel: '',
      seed,
      appliedSkinPack: skinPackId,
      appliedShirtColor: shirtColor,
      appliedPatronOutfitKey: patronOutfit ? `${patronOutfit.id}:${patronOutfit.climate}` : '',
      isSecretNpc: Boolean(secretNpcAppearance),
      moveState: 'walking' as const,
      standUpTimer: 0,
      seatExitOrigin: null,
      stuckTimer: 0,
      stuckAnchorPos: new THREE.Vector3(),
      ghostPassTimer: 0,
      counterArrivedSignaled: false,
      isDeliveryRider: isRider,
      riderVariant: deliveryRiderVariant,
      scooterStowTimer: 0,
    };
  }

  private createUmbrellaMesh(canopyHex: number): THREE.Group {
    const uGroup = new THREE.Group();
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.4,
      metalness: 0.72,
    });
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.58,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: canopyHex,
      roughness: 0.52,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const handleHook = new THREE.Mesh(
      new THREE.TorusGeometry(0.034, 0.011, 6, 10, Math.PI),
      handleMat
    );
    handleHook.rotation.z = Math.PI;
    handleHook.position.set(0.034, -0.025, 0);
    uGroup.add(handleHook);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.78, 6), shaftMat);
    shaft.position.y = 0.39;
    uGroup.add(shaft);

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.46, 0.17, 8, 1, true),
      canopyMat
    );
    canopy.position.y = 0.75;
    uGroup.add(canopy);

    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, 0.06, 6), shaftMat);
    ferrule.position.y = 0.855;
    uGroup.add(ferrule);

    return uGroup;
  }

  // Phase 1.2 & 7: Procedural 3D Delivery Scooter Rig (Max 2 non-overlapping curbside bays: x = 2.45 and x = 4.25!)
  private createDeliveryScooterRig(
    customerId: string,
    variant: DeliveryRiderVariant,
    slotIndex: 0 | 1
  ): DeliveryScooterController {
    const parkX = slotIndex === 0 ? 2.45 : 4.25;
    const spawnX = 16.0 + slotIndex * 2.4;
    const bodyHex = variant === 'blue' ? 0x2563eb : variant === 'green' ? 0x16a34a : 0xdc2626;
    const root = new THREE.Group();
    // Scooter faces -X (arriving from spawnX -> parked at parkX -> departing to x=-18)
    root.position.set(spawnX, 0.08, -7.65);

    const paintMat = new THREE.MeshStandardMaterial({
      color: bodyHex,
      roughness: 0.28,
      metalness: 0.35,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.55,
      metalness: 0.2,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.18,
      metalness: 0.88,
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfef08a,
      emissiveIntensity: 1.8,
      roughness: 0.15,
    });
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const reflectMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      emissive: 0xe2e8f0,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    });

    // Ground contact shadow
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.65),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    root.add(shadow);

    // Front & Rear Spinning Scooter Wheels (along -X front, +X rear)
    const wheels: THREE.Object3D[] = [];
    const tireGeo = new THREE.TorusGeometry(0.16, 0.055, 8, 18);
    const hubGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12);
    [-0.52, 0.48].forEach((wx) => {
      const wp = new THREE.Group();
      wp.position.set(wx, 0.21, 0);
      const tire = new THREE.Mesh(tireGeo, darkMat);
      const hub = new THREE.Mesh(hubGeo, chromeMat);
      hub.rotation.x = Math.PI / 2;
      wp.add(tire, hub);
      root.add(wp);
      wheels.push(wp);
    });

    // Step-through floorboard & rear fairing
    const floorboard = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.36), darkMat);
    floorboard.position.set(-0.04, 0.24, 0);
    root.add(floorboard);

    const rearBody = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.32, 0.4), paintMat);
    rearBody.position.set(0.32, 0.44, 0);
    root.add(rearBody);

    const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.11, 0.32), darkMat);
    seatMesh.position.set(0.22, 0.65, 0);
    root.add(seatMesh);

    // Front leg shield & handlebar stem
    const frontShield = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.56, 0.38), paintMat);
    frontShield.position.set(-0.44, 0.54, 0);
    frontShield.rotation.z = -0.18;
    root.add(frontShield);

    const frontFender = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.16), paintMat);
    frontFender.position.set(-0.54, 0.38, 0);
    root.add(frontFender);

    // Handlebars, grips & twin mirrors
    const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.58, 10), chromeMat);
    handleBar.rotation.x = Math.PI / 2;
    handleBar.position.set(-0.38, 0.88, 0);
    root.add(handleBar);

    const headlight = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.068, 0.06, 14), headlightMat);
    headlight.rotation.z = Math.PI / 2;
    headlight.position.set(-0.52, 0.82, 0);
    root.add(headlight);

    const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.16), taillightMat);
    taillight.position.set(0.66, 0.52, 0);
    root.add(taillight);

    // Hinged Color-Matched Insulated Delivery Top-Box behind seat
    const topBoxBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.4), paintMat);
    topBoxBase.position.set(0.58, 0.84, 0);
    root.add(topBoxBase);

    const topBoxStripe = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.042, 0.41), reflectMat);
    topBoxStripe.position.set(0.58, 0.84, 0);
    root.add(topBoxStripe);

    const topBoxLidPivot = new THREE.Group();
    topBoxLidPivot.position.set(0.37, 1.02, 0);
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.05, 0.41), paintMat);
    lidMesh.position.set(0.21, 0.025, 0);
    topBoxLidPivot.add(lidMesh);
    root.add(topBoxLidPivot);

    this.scene.add(root);

    return {
      customerId,
      variant,
      slotIndex,
      parkX,
      root,
      wheels,
      topBoxLidPivot,
      headlightMat,
      phase: 'arriving',
      x: spawnX,
      stowTimer: 0,
      arrivedSoundPlayed: false,
      departSoundPlayed: false,
    };
  }

  private disposeDeliveryScooter(customerId: string) {
    const idx = this.deliveryScooters.findIndex((s) => s.customerId === customerId);
    if (idx === -1) return;
    const sc = this.deliveryScooters[idx];
    this.scene.remove(sc.root);
    sc.root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).geometry?.dispose();
        const m = (obj as THREE.Mesh).material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else m?.dispose();
      }
    });
    this.deliveryScooters.splice(idx, 1);
  }

  private disposeAllDeliveryScooters() {
    while (this.deliveryScooters.length > 0) {
      this.disposeDeliveryScooter(this.deliveryScooters[0].customerId);
    }
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
        this.doorwayQueue = this.doorwayQueue.filter((qId) => qId !== id);
        if (this.activeDoorCrossId === id) {
          this.activeDoorCrossId = null;
          this.activeDoorCrossTimer = 0;
        }
      }
    }

    // Phase 1.2: Manage up to 2 simultaneous 3D Delivery Scooters at non-overlapping curbside bays!
    const activeRiderOrders = this.gameState.customers.filter((c) => c.isDeliveryRider);
    const activeRiderIds = new Set(activeRiderOrders.map((c) => c.id));

    for (const sc of this.deliveryScooters) {
      if (!activeRiderIds.has(sc.customerId) && sc.phase !== 'departing') {
        sc.phase = 'departing';
      }
    }

    for (const rider of activeRiderOrders) {
      const alreadyHasScooter = this.deliveryScooters.some((s) => s.customerId === rider.id);
      if (!alreadyHasScooter && this.deliveryScooters.length < 2) {
        const slot0Busy = this.deliveryScooters.some(
          (s) => s.slotIndex === 0 && s.phase !== 'departing'
        );
        const chosenSlot: 0 | 1 = slot0Busy ? 1 : 0;
        const sc = this.createDeliveryScooterRig(
          rider.id,
          rider.riderVariant || 'green',
          chosenSlot
        );
        this.deliveryScooters.push(sc);
        this.callbacks.onScooterSound?.('arrive');
      }
    }

    let initialQueuePlacementIdx = 0;
    this.gameState.customers.forEach((cust, idx) => {
      let actor = this.customerActors.get(cust.id);

      const desiredPatronOutfit =
        !cust.isSecretNpc && !cust.isDeliveryRider && cust.patronOutfitId
          ? {
              id: cust.patronOutfitId,
              climate: this.gameState.climateState || cust.patronOutfitClimate || 'summer',
            }
          : null;
      const desiredOutfitKey = desiredPatronOutfit
        ? `${desiredPatronOutfit.id}:${desiredPatronOutfit.climate}`
        : '';

      // Rebuild existing customer actor in-place if the Customer Skin Pack, shirtColor, or Patron Outfit changed (skip for Delivery Rider / Secret NPC!)
      if (
        actor &&
        !cust.isDeliveryRider &&
        !cust.isSecretNpc &&
        (actor.appliedSkinPack !== activePackId ||
          actor.appliedShirtColor !== cust.shirtColor ||
          (actor.appliedPatronOutfitKey || '') !== desiredOutfitKey)
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
        const preservedMoveState = actor.moveState;
        const preservedStandUpTimer = actor.standUpTimer;
        const preservedSeatExitOrigin = actor.seatExitOrigin ? actor.seatExitOrigin.clone() : null;
        const preservedArrived = actor.counterArrivedSignaled;
        this.customersRoot.remove(actor.group);
        actor.activityTexture.dispose();

        const rebuilt = this.createCustomerCharacter(
          preservedSeed,
          cust.avatarColor,
          cust.shirtColor,
          activePackId,
          undefined,
          desiredPatronOutfit,
          null
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
          moveState: preservedMoveState,
          standUpTimer: preservedStandUpTimer,
          seatExitOrigin: preservedSeatExitOrigin,
          stuckTimer: 0,
          stuckAnchorPos: preservedPos.clone(),
          ghostPassTimer: 0,
          counterArrivedSignaled: preservedArrived,
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
          activePackId,
          cust.isDeliveryRider ? cust.riderVariant || 'green' : undefined,
          desiredPatronOutfit,
          cust.isSecretNpc ? cust.secretNpcAppearance || { wearsCap: false, hoodUp: false, wearsCharcoalTee: false } : null
        );
        // Delivery Rider arrives riding their assigned scooter!
        const assignedScooter = this.deliveryScooters.find((s) => s.customerId === cust.id);
        const startPos = cust.isDeliveryRider
          ? new THREE.Vector3(assignedScooter ? assignedScooter.x : 16.0, 0, -7.65)
          : cust.state === 'ordering' && cust.timerStarted
          ? new THREE.Vector3(-0.95, 0, -1.45 - initialQueuePlacementIdx++ * 1.0)
          : new THREE.Vector3(-3.1 - (idx % 3) * 0.75, 0, -7.85);
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
          facingAngle: cust.isDeliveryRider ? -Math.PI / 2 : 0,
          moveState: cust.state === 'ordering' && cust.timerStarted ? 'idle-queue' : 'walking',
          standUpTimer: 0,
          seatExitOrigin: null,
          stuckTimer: 0,
          stuckAnchorPos: startPos.clone(),
          ghostPassTimer: 0,
          counterArrivedSignaled: Boolean(cust.timerStarted),
          isDeliveryRider: Boolean(cust.isDeliveryRider),
          riderVariant: cust.riderVariant,
          scooterStowTimer: 0,
        };
        this.customerActors.set(cust.id, actor);
      }

      // Sync authentic drink vessel type (hot-mug, iced-glass, hot-takeout, iced-takeout)
      const desiredVessel = getOrderVesselType(cust);
      if (actor.appliedVesselType !== desiredVessel) {
        actor.appliedVesselType = desiredVessel;
        this.setVesselVariantVisibility(actor.heldVesselVariants, desiredVessel);
      }

      // Sync left-hand held pastry (Mini Porcelain Plate for dine-in OR Kraft Paper Bag for takeout/delivery!)
      const desiredPastry = cust.requestedPastry || null;
      if (actor.appliedPastryId !== desiredPastry) {
        actor.appliedPastryId = desiredPastry;
        (['daisy-donut', 'miata-cake', 'croissant'] as PastryId[]).forEach((pid) => {
          actor!.heldPastryPlateItems[pid].visible = pid === desiredPastry;
        });
      }
      const isTakeoutOrder = cust.orderType === 'takeout' || Boolean(cust.isDeliveryRider);
      actor.heldPastryPlateGroup.visible = Boolean(desiredPastry) && !isTakeoutOrder;
      actor.heldPastryBagGroup.visible = Boolean(desiredPastry) && isTakeoutOrder;

      if (cust.state === 'ordering') {
        actor.heldCup.visible = false;
        actor.heldPastryGroup.visible = false;
        actor.activitySprite.visible = false;
      } else {
        const isPickingUpStage1 =
          this.stepAnim?.type === 'serve_drink' &&
          this.stepAnim.servedCustomerId === cust.id &&
          this.stepAnim.progress < 0.55;
        actor.heldCup.visible = !isPickingUpStage1 && !cust.expired;
        actor.heldPastryGroup.visible =
          !isPickingUpStage1 && !cust.expired && Boolean(desiredPastry);
      }
    });
  }

  public triggerStepAnimation(
    type: StepAnimType,
    flavor?: SyrupFlavor,
    badgeText?: string,
    durationOverrideSec?: number
  ) {
    const durations: Record<StepAnimType, number> = {
      grind: 1.25,
      tamp: 1.15,
      pull_espresso: 1.5,
      steep_tea: 1.35,
      steam_milk: 1.55,
      add_ice: 1.15,
      add_syrup: 1.35,
      rinse_cup: 0.85,
      serve_drink: 1.5,
    };

    let servedCustomerId: string | undefined;
    if (type === 'serve_drink') {
      const pinnedOrdering = this.gameState.customers.find(
        (c) => c.id === this.gameState.pinnedOrderId && c.state === 'ordering'
      );
      const firstOrdering = this.gameState.customers.find((c) => c.state === 'ordering');
      const seatedList = this.gameState.customers.filter((c) => c.state === 'seated');
      const targetCustomer =
        pinnedOrdering ||
        firstOrdering ||
        seatedList[seatedList.length - 1] ||
        this.gameState.customers[0];
      servedCustomerId = targetCustomer?.id;
      this.activePickupCustomerId = servedCustomerId || null;
      this.serveReachTimer = 1.5;
    }

    this.stepAnim = {
      type,
      progress: 0,
      duration:
        typeof durationOverrideSec === 'number' && durationOverrideSec > 0.2
          ? durationOverrideSec
          : durations[type] || 1.2,
      flavor,
      badgeText,
      servedCustomerId,
      vesselType: this.currentActiveVesselType,
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
    } else if (type === 'rinse_cup') {
      const isTakeout =
        this.currentActiveVesselType === 'hot-takeout' ||
        this.currentActiveVesselType === 'iced-takeout';
      this.drawFloatingBadgeText(isTakeout ? 'CUP DISPOSED' : 'GLASS RINSED', '#38bdf8');
    }
  }

  public updateGameState(newState: KlasikGameState) {
    const prevWeather = this.gameState.weather;
    const prevQuality = this.gameState.graphicsQuality;
    const prevCatId = this.gameState.equippedCatId;
    const prevScenery = this.gameState.activeScenery || 'busy_street';
    const prevSnow = Boolean(this.gameState.isSnowing);
    const prevClimate = this.gameState.climateState || 'summer';
    this.gameState = newState;

    const nextScenery = newState.activeScenery || 'busy_street';
    const sceneryChanged = prevScenery !== nextScenery;
    if (sceneryChanged && this.sceneryManager) {
      this.sceneryManager.loadScenery(nextScenery);
      this.syncTrafficVisibilityForScenery();
    }

    if (prevQuality !== newState.graphicsQuality) {
      this.updateGraphicsQuality();
      this.syncTrafficVisibilityForScenery();
    }
    if (
      prevWeather !== newState.weather ||
      sceneryChanged ||
      prevSnow !== Boolean(newState.isSnowing) ||
      prevClimate !== (newState.climateState || 'summer')
    ) {
      this.applyWeatherLighting(newState.weather);
    }
    if (
      newState.equippedCatId &&
      (prevCatId !== newState.equippedCatId || this.champyRig?.catId !== newState.equippedCatId)
    ) {
      this.swapCafeCat(newState.equippedCatId);
      this.catLastLoadoutKey = '';
    }
    const curCatId = newState.equippedCatId || 'champy';
    const loadoutKey = `${curCatId}:${JSON.stringify(newState.catLoadouts?.[curCatId] || {})}`;
    if (loadoutKey !== this.catLastLoadoutKey) {
      this.catLastLoadoutKey = loadoutKey;
      this.syncCatCosmetics();
    }

    // Phase 5: Spawn warm floating heart particle above Secret NPC upon serve
    const nextSecretSeq = newState.lastSecretServeSeq ?? 0;
    if (nextSecretSeq > this.lastHandledSecretServeSeq) {
      this.lastHandledSecretServeSeq = nextSecretSeq;
      const secretCust = newState.customers.find((c) => c.isSecretNpc);
      if (secretCust) {
        const actor = this.customerActors.get(secretCust.id);
        if (actor) {
          this.spawnSecretHeartAt(actor.currentPos);
        }
      }
    }

    this.updateDecorMaterials();
    this.updateActiveCupVisuals();
    this.redrawOrderTicketTextures();
    this.redrawPosScreenTexture();
    this.syncCustomerActors();
  }

  private spawnSecretHeartAt(pos: THREE.Vector3) {
    for (let i = 0; i < 3; i++) {
      const sprite = createSecretNpcHeartSprite();
      sprite.position.set(
        pos.x + (i - 1) * 0.22,
        1.78 + i * 0.14,
        pos.z + (i % 2 === 0 ? 0.08 : -0.08)
      );
      this.scene.add(sprite);
      this.floatingSecretHearts.push({ sprite, age: -i * 0.18, maxAge: 2.2 });
    }
  }

  // Phase 6: Go Outside Scenic Overlook Mode public API
  public setOutdoorOverlookMode(active: boolean, vantage: OutdoorVantageKey = 'porch') {
    if (active) {
      this.outdoorOverlook.enter(vantage);
    } else {
      this.outdoorOverlook.exit();
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public setOutdoorVantage(vantage: OutdoorVantageKey) {
    this.outdoorOverlook.setVantage(vantage, false);
  }

  public isOutdoorOverlookActive(): boolean {
    return this.outdoorOverlook.active;
  }

  public isSecretPasserbyActive(): boolean {
    return this.secretPasserby !== null;
  }

  // Phase 7: Single-Context Offscreen ThumbnailStudio API (ZERO extra WebGLRenderer!)
  private ensureThumbnailStudio(): ThumbnailStudio {
    if (!this.thumbnailStudio) {
      this.thumbnailStudio = new ThumbnailStudio(this.renderer, 256);
    }
    return this.thumbnailStudio;
  }

  public getSceneryThumbnail(sceneryId: SceneryId): string {
    return this.ensureThumbnailStudio().getThumbnail(
      `scenery:${sceneryId}`,
      () => buildMiniSceneryDiorama(sceneryId),
      { cameraPos: [2.15, 1.72, 2.35], lookAt: [0, 0.15, 0], scaleFill: 1.5 }
    );
  }

  public getPatronOutfitThumbnail(outfitId: PatronOutfitId, climate: ClimateState = 'summer'): string {
    const effective = outfitId === 'hiker' ? 'winter' : climate;
    return this.ensureThumbnailStudio().getThumbnail(
      `outfit:${outfitId}:${effective}`,
      () => buildPatronOutfitPreviewMesh(outfitId, effective),
      { cameraPos: [0.45, 0.35, 2.45], lookAt: [0, 0.02, 0], scaleFill: 1.48 }
    );
  }

  public getCatCosmeticThumbnail(cosmeticId: CatCosmeticId): string {
    return this.ensureThumbnailStudio().getThumbnail(
      `cosmetic:${cosmeticId}`,
      () => buildCatCosmeticPreviewMesh(cosmeticId),
      { cameraPos: [1.55, 1.05, 1.95], lookAt: [0, 0, 0], scaleFill: 1.38 }
    );
  }

  public getCatThumbnail(catId: CafeCatId): string {
    return this.ensureThumbnailStudio().getThumbnail(
      `cat:${catId}`,
      () => {
        const spec = getCafeCatSpec(catId);
        const g = new THREE.Group();
        const furMat = new THREE.MeshStandardMaterial({ color: spec.furHex, roughness: 0.78 });
        const accMat = new THREE.MeshStandardMaterial({
          color: spec.bellyPatchHex ?? spec.stripeHex ?? spec.furHex,
          roughness: 0.76,
        });
        const leftEyeMat = new THREE.MeshStandardMaterial({
          color: spec.leftEyeHex,
          emissive: spec.leftEyeHex,
          emissiveIntensity: 0.18,
          roughness: 0.2,
        });
        const rightEyeMat = new THREE.MeshStandardMaterial({
          color: spec.rightEyeHex,
          emissive: spec.rightEyeHex,
          emissiveIntensity: 0.18,
          roughness: 0.2,
        });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 14), furMat);
        body.scale.set(0.95, 1.12, 1.05);
        body.position.set(0, 0.14, 0);
        g.add(body);
        const chest = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), accMat);
        chest.position.set(0, 0.15, 0.075);
        g.add(chest);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), furMat);
        head.position.set(0, 0.31, 0.03);
        g.add(head);
        [-0.065, 0.065].forEach((ex) => {
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.085, 6), furMat);
          ear.position.set(ex, 0.41, 0.02);
          ear.rotation.z = ex < 0 ? 0.22 : -0.22;
          g.add(ear);
        });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), leftEyeMat);
        leftEye.position.set(0.042, 0.32, 0.13);
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), rightEyeMat);
        rightEye.position.set(-0.042, 0.32, 0.13);
        g.add(leftEye, rightEye);
        const nose = new THREE.Mesh(
          new THREE.SphereGeometry(0.013, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 })
        );
        nose.position.set(0, 0.295, 0.145);
        g.add(nose);
        if (spec.hasCollar) {
          const collarMat = new THREE.MeshStandardMaterial({
            color: spec.collarHex,
            roughness: 0.55,
          });
          const collar = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.013, 8, 18), collarMat);
          collar.rotation.x = Math.PI / 2 + 0.18;
          collar.position.set(0, 0.225, 0.03);
          g.add(collar);
          const bell = new THREE.Mesh(
            new THREE.SphereGeometry(0.018, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 })
          );
          bell.position.set(0, 0.21, 0.115);
          g.add(bell);
        }
        g.rotation.y = 0.22;
        return g;
      },
      { cameraPos: [0.55, 0.45, 2.25], lookAt: [0, 0.02, 0], scaleFill: 1.44 }
    );
  }

  public getDecorThumbnail(
    category: 'counterWood' | 'mugColor' | 'neonSignColor' | 'plantDensity',
    value: string
  ): string {
    return this.ensureThumbnailStudio().getThumbnail(
      `decor:${category}:${value}`,
      () => {
        const g = new THREE.Group();
        if (category === 'counterWood') {
          const hexMap: Record<string, number> = {
            walnut: 0x4a2c18,
            'white-oak': 0xa67c52,
            'charcoal-ash': 0x2c2a29,
            'cherry-mahogany': 0x6b2114,
            'bamboo-zen': 0xc4a46b,
            'obsidian-slate': 0x27272a,
          };
          const slab = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.18, 0.65),
            new THREE.MeshStandardMaterial({ color: hexMap[value] ?? 0x4a2c18, roughness: 0.55 })
          );
          const base = new THREE.Mesh(
            new THREE.BoxGeometry(0.95, 0.42, 0.52),
            new THREE.MeshStandardMaterial({ color: 0x181310, roughness: 0.72 })
          );
          base.position.y = -0.3;
          g.add(slab, base);
        } else if (category === 'mugColor') {
          const hexMap: Record<string, number> = {
            cream: 0xf8f5f0,
            'matte-black': 0x3f3f46,
            'sage-green': 0xbbf7d0,
            terracotta: 0xd97757,
            'royal-gold': 0xfbbf24,
            'sakura-pink': 0xf9a8d4,
          };
          const mat = new THREE.MeshStandardMaterial({
            color: hexMap[value] ?? 0xf8f5f0,
            roughness: value === 'royal-gold' ? 0.2 : 0.45,
            metalness: value === 'royal-gold' ? 0.85 : 0.06,
          });
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.54, 18), mat);
          const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 16, Math.PI), mat);
          handle.position.set(0.3, 0, 0);
          handle.rotation.z = -Math.PI / 2;
          const coffee = new THREE.Mesh(
            new THREE.CircleGeometry(0.28, 16),
            new THREE.MeshStandardMaterial({ color: 0x5c341d, roughness: 0.3 })
          );
          coffee.rotation.x = -Math.PI / 2;
          coffee.position.y = 0.25;
          g.add(body, handle, coffee);
        } else if (category === 'neonSignColor') {
          const hexMap: Record<string, number> = {
            amber: 0xf59e0b,
            emerald: 0x10b981,
            rose: 0xf43f5e,
            'cyber-cyan': 0x22d3ee,
            'violet-dream': 0xa855f7,
          };
          const col = hexMap[value] ?? 0xf59e0b;
          const board = new THREE.Mesh(
            new THREE.BoxGeometry(1.05, 0.56, 0.08),
            new THREE.MeshStandardMaterial({ color: 0x181310, roughness: 0.65 })
          );
          const tubeMat = new THREE.MeshStandardMaterial({
            color: col,
            emissive: col,
            emissiveIntensity: 1.8,
            roughness: 0.2,
          });
          const tube = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.032, 10, 22), tubeMat);
          tube.position.z = 0.06;
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.04), tubeMat);
          bar.position.set(0, -0.18, 0.06);
          g.add(board, tube, bar);
        } else {
          const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.26, 0.2, 0.34, 14),
            new THREE.MeshStandardMaterial({ color: 0x9a5b3b, roughness: 0.78 })
          );
          pot.position.y = -0.16;
          g.add(pot);
          const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.65 });
          const leaves = value === 'lush-jungle' ? 7 : 3;
          for (let i = 0; i < leaves; i++) {
            const ang = (i / leaves) * Math.PI * 2;
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), leafMat);
            leaf.scale.set(1.2, 0.35, 0.8);
            leaf.position.set(Math.cos(ang) * 0.22, 0.14 + (i % 2) * 0.16, Math.sin(ang) * 0.22);
            leaf.rotation.z = Math.cos(ang) * 0.35;
            g.add(leaf);
          }
        }
        return g;
      },
      { cameraPos: [1.6, 1.15, 2.0], lookAt: [0, 0, 0], scaleFill: 1.38 }
    );
  }

  public updateSpotifyState(newSpotify: SpotifyVinylState) {
    this.spotifyState = newSpotify;
    this.redrawVinylLabelTexture();
  }

  private applyWeatherLighting(weather: WeatherMode) {
    const bgCol =
      this.scene.background instanceof THREE.Color
        ? this.scene.background
        : (_skyBgColor.setHex(0xc4dde8), (this.scene.background = _skyBgColor));
    const fog =
      this.scene.fog instanceof THREE.FogExp2
        ? this.scene.fog
        : (this.scene.fog = new THREE.FogExp2(0xd2e4ec, 0.012));

    const setStreetlampGlow = (visible: boolean, coneOp: number, poolOp: number) => {
      if (this.streetLampGlowsGroup) this.streetLampGlowsGroup.visible = visible;
      if (this.streetLampConeMat) this.streetLampConeMat.opacity = coneOp;
      if (this.streetLampPoolMat) this.streetLampPoolMat.opacity = poolOp;
    };

    const setCityWindows = (warmEmissive: number, coolEmissive: number, signEmissive: number) => {
      if (this.cityWindowWarmMat) this.cityWindowWarmMat.emissiveIntensity = warmEmissive;
      if (this.cityWindowCoolMat) this.cityWindowCoolMat.emissiveIntensity = coolEmissive;
      if (this.citySignEmissiveMat) this.citySignEmissiveMat.emissiveIntensity = signEmissive;
    };

    const setVehicleBeams = (visible: boolean, opacity: number) => {
      if (this.vehicleHeadlightBeamMat) this.vehicleHeadlightBeamMat.opacity = opacity;
      for (let i = 0; i < this.vehicleHeadlightBeamsGroupList.length; i++) {
        this.vehicleHeadlightBeamsGroupList[i].visible = visible;
      }
    };

    const timeOfDay = extractTimeOfDayFromWeather(weather);
    const isRaining = isRainyWeather(weather);

    // 1. Base Time-of-Day Sky, Sun, Fog & Architectural Lighting (5 authentic presets)
    if (timeOfDay === 'dawn') {
      // Phase 2 Dawn: Peach/Lavender twilight sky, cool-peach east sunrise light (+12, 4.4, -13), zero overhead sun glare
      bgCol.setHex(0x8e647a);
      fog.color.setHex(0xc78f85);
      fog.density = 0.014;
      this.scene.environmentIntensity = 0.68;
      this.sunLight.position.set(12.0, 4.4, -13.0);
      this.sunLight.color.setHex(0xffc9a3);
      this.sunLight.intensity = 1.95;
      this.hemiLight.color.setHex(0xdfb2c8);
      this.hemiLight.groundColor.setHex(0x3a2e4c);
      this.hemiLight.intensity = 0.86;
      if (this.cafeWarmLight) this.cafeWarmLight.intensity = 1.9;
      if (this.pastryPoolLight) this.pastryPoolLight.intensity = 1.25;
      if (this.seatingPoolLight) this.seatingPoolLight.intensity = 1.15;
      if (this.neonSignLight) this.neonSignLight.intensity = 1.45;
      if (this.underCounterNeonMat) this.underCounterNeonMat.emissiveIntensity = 1.65;

      if (this.skyDomeMat) {
        this.skyDomeMat.uniforms.uTopColor.value.setHex(0x473669);
        this.skyDomeMat.uniforms.uMidColor.value.setHex(0xc07a84);
        this.skyDomeMat.uniforms.uHorizonColor.value.setHex(0xf4a261);
        this.skyDomeMat.uniforms.uSunDir.value.set(0.62, 0.16, -0.76).normalize();
        this.skyDomeMat.uniforms.uSunColor.value.setHex(0xffd2a1);
        this.skyDomeMat.uniforms.uSunIntensity.value = 0.0;
        this.skyDomeMat.uniforms.uStarIntensity.value = 0.18;
      }
      if (this.godRaysGroup) this.godRaysGroup.visible = true;
      if (this.goldenDustInstanced) this.goldenDustInstanced.visible = true;
      if (this.godRayMat) {
        this.godRayMat.uniforms.uColor.value.setHex(0xf6b99c);
        this.godRayMat.uniforms.uOpacity.value = 0.16;
      }
      if (this.roadAsphaltMat) this.roadAsphaltMat.roughness = 0.8;
      if (this.patioFloorMat) this.patioFloorMat.roughness = 0.76;
      if (this.skylightPaneMat) {
        this.skylightPaneMat.color.setHex(0xfde2d2);
        this.skylightPaneMat.emissive.setHex(0xd88c9a);
        this.skylightPaneMat.emissiveIntensity = 0.62;
      }
      if (this.garageGlassMat) {
        this.garageGlassMat.color.setHex(0xf3d5c0);
        this.garageGlassMat.opacity = 0.19;
      }
      this.pendantBulbMats.forEach((m) => {
        m.emissive.setHex(0xfde68a);
        m.emissiveIntensity = 2.2;
      });
      this.streetLampBulbMats.forEach((m) => {
        m.emissiveIntensity = 1.95;
      });
      setStreetlampGlow(true, 0.08, 0.11);
      setCityWindows(0.65, 0.35, 1.05);
      setVehicleBeams(true, 0.08);
      if (this.vehicleHeadlightMat) this.vehicleHeadlightMat.emissiveIntensity = 1.95;
      if (this.vehicleTaillightMat) this.vehicleTaillightMat.emissiveIntensity = 1.85;
    } else if (timeOfDay === 'morning') {
      bgCol.setHex(0xbae6fd);
      fog.color.setHex(0xdbeafe);
      fog.density = 0.011;
      this.scene.environmentIntensity = 0.95;
      this.sunLight.position.set(5.5, 9.2, -7.5);
      this.sunLight.color.setHex(0xfff4d6);
      this.sunLight.intensity = 2.45;
      this.hemiLight.color.setHex(0xdbeafe);
      this.hemiLight.groundColor.setHex(0x5c4033);
      this.hemiLight.intensity = 1.08;
      if (this.cafeWarmLight) this.cafeWarmLight.intensity = 1.45;
      if (this.pastryPoolLight) this.pastryPoolLight.intensity = 0.65;
      if (this.seatingPoolLight) this.seatingPoolLight.intensity = 0.55;
      if (this.neonSignLight) this.neonSignLight.intensity = 1.1;
      if (this.underCounterNeonMat) this.underCounterNeonMat.emissiveIntensity = 1.1;

      if (this.skyDomeMat) {
        this.skyDomeMat.uniforms.uTopColor.value.setHex(0x38bdf8);
        this.skyDomeMat.uniforms.uMidColor.value.setHex(0xbae6fd);
        this.skyDomeMat.uniforms.uHorizonColor.value.setHex(0xfef3c7);
        this.skyDomeMat.uniforms.uSunDir.value.set(-0.35, 0.56, -0.75).normalize();
        this.skyDomeMat.uniforms.uSunColor.value.setHex(0xfff8dc);
        this.skyDomeMat.uniforms.uSunIntensity.value = 0.72;
        this.skyDomeMat.uniforms.uStarIntensity.value = 0.0;
      }
      if (this.godRaysGroup) this.godRaysGroup.visible = true;
      if (this.goldenDustInstanced) this.goldenDustInstanced.visible = false;
      if (this.godRayMat) {
        this.godRayMat.uniforms.uColor.value.setHex(0xfff5d6);
        this.godRayMat.uniforms.uOpacity.value = 0.09;
      }
      if (this.roadAsphaltMat) this.roadAsphaltMat.roughness = 0.86;
      if (this.patioFloorMat) this.patioFloorMat.roughness = 0.78;
      if (this.skylightPaneMat) {
        this.skylightPaneMat.color.setHex(0xfffaf0);
        this.skylightPaneMat.emissive.setHex(0xffe4b5);
        this.skylightPaneMat.emissiveIntensity = 0.78;
      }
      if (this.garageGlassMat) {
        this.garageGlassMat.color.setHex(0xdbeafe);
        this.garageGlassMat.opacity = 0.16;
      }
      this.pendantBulbMats.forEach((m) => {
        m.emissive.setHex(0xfde68a);
        m.emissiveIntensity = 1.55;
      });
      this.streetLampBulbMats.forEach((m) => {
        m.emissiveIntensity = 0.45;
      });
      setStreetlampGlow(false, 0.0, 0.0);
      setCityWindows(0.08, 0.05, 0.35);
      setVehicleBeams(false, 0.0);
      if (this.vehicleHeadlightMat) this.vehicleHeadlightMat.emissiveIntensity = 0.6;
      if (this.vehicleTaillightMat) this.vehicleTaillightMat.emissiveIntensity = 0.85;
    } else if (timeOfDay === 'noon') {
      // Phase 2 Noon: Crisp high-overhead bright sunlight (1.5, 16.5, -6.0), vivid blue sky, streetlamps off!
      bgCol.setHex(0x60a5fa);
      fog.color.setHex(0xe0f2fe);
      fog.density = 0.0085;
      this.scene.environmentIntensity = 1.12;
      this.sunLight.position.set(1.5, 16.5, -6.0);
      this.sunLight.color.setHex(0xfffdf5);
      this.sunLight.intensity = 2.95;
      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0x785a46);
      this.hemiLight.intensity = 1.24;
      if (this.cafeWarmLight) this.cafeWarmLight.intensity = 1.15;
      if (this.pastryPoolLight) this.pastryPoolLight.intensity = 0.45;
      if (this.seatingPoolLight) this.seatingPoolLight.intensity = 0.4;
      if (this.neonSignLight) this.neonSignLight.intensity = 0.85;
      if (this.underCounterNeonMat) this.underCounterNeonMat.emissiveIntensity = 0.9;

      if (this.skyDomeMat) {
        this.skyDomeMat.uniforms.uTopColor.value.setHex(0x2563eb);
        this.skyDomeMat.uniforms.uMidColor.value.setHex(0x60a5fa);
        this.skyDomeMat.uniforms.uHorizonColor.value.setHex(0xe0f2fe);
        this.skyDomeMat.uniforms.uSunDir.value.set(0.1, 0.92, -0.36).normalize();
        this.skyDomeMat.uniforms.uSunColor.value.setHex(0xffffff);
        this.skyDomeMat.uniforms.uSunIntensity.value = 0.85;
        this.skyDomeMat.uniforms.uStarIntensity.value = 0.0;
      }
      if (this.godRaysGroup) this.godRaysGroup.visible = true;
      if (this.goldenDustInstanced) this.goldenDustInstanced.visible = false;
      if (this.godRayMat) {
        this.godRayMat.uniforms.uColor.value.setHex(0xffffff);
        this.godRayMat.uniforms.uOpacity.value = 0.06;
      }
      if (this.roadAsphaltMat) this.roadAsphaltMat.roughness = 0.88;
      if (this.patioFloorMat) this.patioFloorMat.roughness = 0.8;
      if (this.skylightPaneMat) {
        this.skylightPaneMat.color.setHex(0xffffff);
        this.skylightPaneMat.emissive.setHex(0xe0f2fe);
        this.skylightPaneMat.emissiveIntensity = 0.95;
      }
      if (this.garageGlassMat) {
        this.garageGlassMat.color.setHex(0xe0f2fe);
        this.garageGlassMat.opacity = 0.14;
      }
      this.pendantBulbMats.forEach((m) => {
        m.emissive.setHex(0xfef3c7);
        m.emissiveIntensity = 1.1;
      });
      this.streetLampBulbMats.forEach((m) => {
        m.emissiveIntensity = 0.15;
      });
      setStreetlampGlow(false, 0.0, 0.0);
      setCityWindows(0.04, 0.04, 0.2);
      setVehicleBeams(false, 0.0);
      if (this.vehicleHeadlightMat) this.vehicleHeadlightMat.emissiveIntensity = 0.35;
      if (this.vehicleTaillightMat) this.vehicleTaillightMat.emissiveIntensity = 0.7;
    } else if (timeOfDay === 'golden') {
      bgCol.setHex(0xc96859);
      fog.color.setHex(0xd98a5b);
      fog.density = 0.014;
      this.scene.environmentIntensity = 0.8;
      this.sunLight.position.set(-10.5, 4.6, -13.5);
      this.sunLight.color.setHex(0xffba6b);
      this.sunLight.intensity = 2.85;
      this.hemiLight.color.setHex(0xffd2a1);
      this.hemiLight.groundColor.setHex(0x3b3556);
      this.hemiLight.intensity = 0.96;
      if (this.cafeWarmLight) this.cafeWarmLight.intensity = 1.8;
      if (this.pastryPoolLight) this.pastryPoolLight.intensity = 1.35;
      if (this.seatingPoolLight) this.seatingPoolLight.intensity = 1.25;
      if (this.neonSignLight) this.neonSignLight.intensity = 1.35;
      if (this.underCounterNeonMat) this.underCounterNeonMat.emissiveIntensity = 1.75;

      if (this.skyDomeMat) {
        this.skyDomeMat.uniforms.uTopColor.value.setHex(0x24325c);
        this.skyDomeMat.uniforms.uMidColor.value.setHex(0xc96859);
        this.skyDomeMat.uniforms.uHorizonColor.value.setHex(0xffae42);
        this.skyDomeMat.uniforms.uSunDir.value.set(-0.24, 0.16, -0.95).normalize();
        this.skyDomeMat.uniforms.uSunColor.value.setHex(0xffd782);
        this.skyDomeMat.uniforms.uSunIntensity.value = 1.45;
        this.skyDomeMat.uniforms.uStarIntensity.value = 0.0;
      }
      if (this.godRaysGroup) this.godRaysGroup.visible = true;
      if (this.goldenDustInstanced) this.goldenDustInstanced.visible = true;
      if (this.godRayMat) {
        this.godRayMat.uniforms.uColor.value.setHex(0xffb85c);
        this.godRayMat.uniforms.uOpacity.value = 0.3;
      }
      if (this.roadAsphaltMat) this.roadAsphaltMat.roughness = 0.78;
      if (this.patioFloorMat) this.patioFloorMat.roughness = 0.74;
      if (this.skylightPaneMat) {
        this.skylightPaneMat.color.setHex(0xffedd5);
        this.skylightPaneMat.emissive.setHex(0xf59e0b);
        this.skylightPaneMat.emissiveIntensity = 0.92;
      }
      if (this.garageGlassMat) {
        this.garageGlassMat.color.setHex(0xfed7aa);
        this.garageGlassMat.opacity = 0.2;
      }
      this.pendantBulbMats.forEach((m) => {
        m.emissive.setHex(0xfbbf24);
        m.emissiveIntensity = 2.35;
      });
      this.streetLampBulbMats.forEach((m) => {
        m.emissiveIntensity = 2.25;
      });
      setStreetlampGlow(true, 0.09, 0.12);
      setCityWindows(0.55, 0.32, 1.1);
      setVehicleBeams(true, 0.09);
      if (this.vehicleHeadlightMat) this.vehicleHeadlightMat.emissiveIntensity = 2.15;
      if (this.vehicleTaillightMat) this.vehicleTaillightMat.emissiveIntensity = 2.05;
    } else {
      // Phase 1.5 Nighttime Indoor Lighting Overhaul: Cozy Warm Amber Sanctuary (3 non-shadow PointLight pools, zero pitch-black faces!)
      bgCol.setHex(0x070d1d);
      fog.color.setHex(0x0b132b);
      fog.density = 0.017;
      this.scene.environmentIntensity = 0.36;
      this.sunLight.position.set(4.0, 9.5, -10.5);
      this.sunLight.color.setHex(0x8ab4f8);
      this.sunLight.intensity = 0.5;
      this.hemiLight.color.setHex(0xffd2a1);
      this.hemiLight.groundColor.setHex(0x261a14);
      this.hemiLight.intensity = 0.48;
      if (this.cafeWarmLight) this.cafeWarmLight.intensity = 2.9;
      if (this.pastryPoolLight) this.pastryPoolLight.intensity = 2.2;
      if (this.seatingPoolLight) this.seatingPoolLight.intensity = 2.1;
      if (this.neonSignLight) this.neonSignLight.intensity = 2.05;
      if (this.underCounterNeonMat) this.underCounterNeonMat.emissiveIntensity = 2.4;

      if (this.skyDomeMat) {
        this.skyDomeMat.uniforms.uTopColor.value.setHex(0x030712);
        this.skyDomeMat.uniforms.uMidColor.value.setHex(0x0b132b);
        this.skyDomeMat.uniforms.uHorizonColor.value.setHex(0x1b2845);
        this.skyDomeMat.uniforms.uSunIntensity.value = 0.0;
        this.skyDomeMat.uniforms.uStarIntensity.value = 1.0;
      }
      if (this.godRaysGroup) this.godRaysGroup.visible = false;
      if (this.goldenDustInstanced) this.goldenDustInstanced.visible = false;
      if (this.godRayMat) this.godRayMat.uniforms.uOpacity.value = 0.0;
      if (this.roadAsphaltMat) this.roadAsphaltMat.roughness = 0.62;
      if (this.patioFloorMat) this.patioFloorMat.roughness = 0.58;
      if (this.skylightPaneMat) {
        this.skylightPaneMat.color.setHex(0x1e293b);
        this.skylightPaneMat.emissive.setHex(0x1d4ed8);
        this.skylightPaneMat.emissiveIntensity = 0.22;
      }
      if (this.garageGlassMat) {
        this.garageGlassMat.color.setHex(0x1e293b);
        this.garageGlassMat.opacity = 0.22;
      }
      this.pendantBulbMats.forEach((m) => {
        m.emissive.setHex(0xfbbf24);
        m.emissiveIntensity = 3.5;
      });
      this.streetLampBulbMats.forEach((m) => {
        m.emissiveIntensity = 3.5;
      });
      setStreetlampGlow(true, 0.22, 0.26);
      setCityWindows(1.7, 1.1, 1.95);
      setVehicleBeams(true, 0.24);
      if (this.vehicleHeadlightMat) this.vehicleHeadlightMat.emissiveIntensity = 3.5;
      if (this.vehicleTaillightMat) this.vehicleTaillightMat.emissiveIntensity = 3.0;
    }

    // 2. Universal Rain Overlay (works identically across Dawn, Morning, Noon, Golden & Night!)
    if (isRaining) {
      const isDark = timeOfDay === 'night';
      const rainTint = isDark ? 0x0f172a : 0x334155;
      bgCol.lerp(_targetColor.setHex(rainTint), isDark ? 0.55 : 0.62);
      fog.color.lerp(_targetColor.setHex(isDark ? 0x0f172a : 0x475569), 0.65);
      fog.density = Math.max(fog.density, isDark ? 0.022 : 0.019);
      this.scene.environmentIntensity = Math.max(0.32, this.scene.environmentIntensity * 0.72);
      this.sunLight.intensity *= isDark ? 0.85 : 0.45;
      this.hemiLight.intensity = Math.max(0.38, this.hemiLight.intensity * 0.84);
      if (this.cafeWarmLight) this.cafeWarmLight.intensity = Math.max(this.cafeWarmLight.intensity, 2.75);
      if (this.pastryPoolLight) this.pastryPoolLight.intensity = Math.max(this.pastryPoolLight.intensity, 2.0);
      if (this.seatingPoolLight) this.seatingPoolLight.intensity = Math.max(this.seatingPoolLight.intensity, 1.95);
      if (this.neonSignLight) this.neonSignLight.intensity = Math.max(this.neonSignLight.intensity, 1.75);
      if (this.underCounterNeonMat) {
        this.underCounterNeonMat.emissiveIntensity = Math.max(
          this.underCounterNeonMat.emissiveIntensity,
          2.25
        );
      }

      if (this.skyDomeMat) {
        this.skyDomeMat.uniforms.uTopColor.value.lerp(_targetColor.setHex(isDark ? 0x040711 : 0x1e293b), 0.72);
        this.skyDomeMat.uniforms.uMidColor.value.lerp(_targetColor.setHex(isDark ? 0x0f172a : 0x475569), 0.68);
        this.skyDomeMat.uniforms.uHorizonColor.value.lerp(_targetColor.setHex(isDark ? 0x1e293b : 0x64748b), 0.64);
        this.skyDomeMat.uniforms.uSunIntensity.value = 0.0;
        this.skyDomeMat.uniforms.uStarIntensity.value = 0.0;
      }
      if (this.gpuRainLines) this.gpuRainLines.visible = !this.gameState.isSnowing;
      const isCyberNeonRain = (this.gameState.activeScenery || 'busy_street') === 'cyberpunk_neon';
      if (this.gpuRainMat) {
        this.gpuRainMat.uniforms.uColor.value.setHex(
          isCyberNeonRain ? 0x22d3ee : isDark ? 0xfef3c7 : 0xe2e8f0
        );
        this.gpuRainMat.uniforms.uOpacity.value = isCyberNeonRain ? 0.68 : isDark ? 0.56 : 0.48;
      }
      if (this.rainSplashInstanced) this.rainSplashInstanced.visible = !this.gameState.isSnowing;
      if (this.glassRainStreaksGroup) this.glassRainStreaksGroup.visible = !this.gameState.isSnowing;
      if (this.godRaysGroup) this.godRaysGroup.visible = false;
      if (this.goldenDustInstanced) this.goldenDustInstanced.visible = false;
      if (this.godRayMat) this.godRayMat.uniforms.uOpacity.value = 0.0;

      // Mirror-wet reflective street asphalt & patio cobbles
      if (this.roadAsphaltMat) this.roadAsphaltMat.roughness = isDark ? 0.16 : 0.22;
      if (this.patioFloorMat) this.patioFloorMat.roughness = isDark ? 0.18 : 0.24;
      if (this.garageGlassMat) {
        this.garageGlassMat.opacity = Math.max(this.garageGlassMat.opacity, 0.28);
      }
      this.pendantBulbMats.forEach((m) => {
        m.emissiveIntensity = Math.max(m.emissiveIntensity, isDark ? 3.45 : 2.75);
      });
      this.streetLampBulbMats.forEach((m) => {
        m.emissiveIntensity = Math.max(m.emissiveIntensity, isDark ? 3.6 : 2.65);
      });
      setStreetlampGlow(true, isDark ? 0.26 : 0.13, isDark ? 0.3 : 0.16);
      setCityWindows(isDark ? 1.85 : 0.85, isDark ? 1.15 : 0.55, isDark ? 2.15 : 1.35);
      setVehicleBeams(true, isDark ? 0.28 : 0.14);
      if (this.vehicleHeadlightMat) this.vehicleHeadlightMat.emissiveIntensity = Math.max(this.vehicleHeadlightMat.emissiveIntensity, 2.45);
      if (this.vehicleTaillightMat) this.vehicleTaillightMat.emissiveIntensity = Math.max(this.vehicleTaillightMat.emissiveIntensity, 2.25);
    } else {
      if (this.gpuRainLines) this.gpuRainLines.visible = false;
      if (this.rainSplashInstanced) this.rainSplashInstanced.visible = false;
      if (this.glassRainStreaksGroup) this.glassRainStreaksGroup.visible = false;
    }

    // 3. Phase 1 & 3: Scenery Environment Hints + Snow / Always-Winter Alpine Lighting Override
    const envHint = this.sceneryManager?.getEnvironmentHint() || {};
    const isNightNow = timeOfDay === 'night';
    if (isNightNow && envHint.fogColorNight !== undefined) {
      fog.color.lerp(_targetColor.setHex(envHint.fogColorNight), 0.55);
      bgCol.lerp(_targetColor.setHex(envHint.skyTintNight ?? envHint.fogColorNight), 0.5);
    } else if (!isNightNow && envHint.fogColorDay !== undefined) {
      fog.color.lerp(_targetColor.setHex(envHint.fogColorDay), 0.45);
      if (envHint.skyTintDay !== undefined) {
        bgCol.lerp(_targetColor.setHex(envHint.skyTintDay), 0.45);
      }
    }
    if (envHint.fogDensityScale) {
      fog.density *= envHint.fogDensityScale;
    }

    const snowActive = Boolean(this.gameState.isSnowing) || Boolean(envHint.alwaysWinter);
    if (this.snowPoints) {
      this.snowPoints.visible = snowActive;
    }
    if (snowActive) {
      // Crisp alpine winter sunlight (#dceeff) & chilled snow fog
      if (!isNightNow) {
        this.sunLight.color.setHex(envHint.sunColorOverride ?? 0xdceeff);
        fog.color.lerp(_targetColor.setHex(0xdceeff), 0.45);
      }
      if (this.roadAsphaltMat) this.roadAsphaltMat.roughness = 0.62;
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

  // Updates Coffee Grounds, Tamped Puck visibility, Authentic 3D Vessel Variant, and Cup Progression State Machine target
  private updateActiveCupVisuals() {
    const cup = this.gameState.currentCup;
    const hasAnyLiquid =
      cup.hasEspresso ||
      cup.hasSteepedTea ||
      cup.hasSteamedMilk ||
      cup.syrup !== 'none';

    // Sync active barista vessel (Hot Mug, Iced Glass, Hot Takeout, Iced Takeout) to active pinned customer order!
    const pinnedOrder =
      this.gameState.customers.find(
        (c) => c.id === this.gameState.pinnedOrderId && c.state === 'ordering'
      ) || this.gameState.customers.find((c) => c.state === 'ordering');
    let nextVessel: CupVesselType = pinnedOrder
      ? getOrderVesselType(pinnedOrder)
      : cup.hasIce
      ? 'iced-glass'
      : 'hot-mug';
    // If barista explicitly added ice to a dine-in cup, visually adapt to iced glass
    if (cup.hasIce && nextVessel === 'hot-mug') nextVessel = 'iced-glass';
    if (cup.hasIce && nextVessel === 'hot-takeout') nextVessel = 'iced-takeout';

    if (this.activeVesselVariants && this.currentActiveVesselType !== nextVessel) {
      this.currentActiveVesselType = nextVessel;
      this.setVesselVariantVisibility(this.activeVesselVariants, nextVessel);
    }

    // Snap takeout lids (black sip lid / clear dome lid + emerald straw) ONLY when moving to Pickup Counter (Station 5) / serving!
    const isServingLidReady =
      (this.gameState.activeStation === 5 || this.stepAnim?.type === 'serve_drink') &&
      hasAnyLiquid;
    if (this.activeHotTakeoutLidMesh) {
      this.activeHotTakeoutLidMesh.visible =
        this.currentActiveVesselType === 'hot-takeout' && isServingLidReady;
    }
    if (this.activeIcedTakeoutLidMesh) {
      this.activeIcedTakeoutLidMesh.visible =
        this.currentActiveVesselType === 'iced-takeout' && isServingLidReady;
    }

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

    // Phase 4 Pull-Shot Cooldown Sync: keep cup locked on espresso drip tray during active pull_espresso lock!
    const isPullShotLocked =
      (this.stepAnim?.type === 'pull_espresso' && this.stepAnim.progress < 0.86) ||
      (isStepLockActive(this.gameState.activeStepLock) &&
        this.gameState.activeStepLock?.actionType === 'pull_espresso');

    const isStageB =
      cup.hasEspresso ||
      cup.hasSteepedTea ||
      cup.hasSteamedMilk ||
      cup.hasIce ||
      cup.syrup !== 'none' ||
      this.gameState.activeStation === 4;

    if (isPullShotLocked) {
      this.cupTargetPos.set(-0.16, 1.055, 0.30);
    } else if (this.gameState.activeStation === 5 && hasAnyLiquid) {
      this.cupTargetPos.set(-1.32, 1.03, 0.34);
    } else if (isStageB) {
      this.cupTargetPos.set(1.18, 1.01, 0.38);
    } else {
      this.cupTargetPos.set(-0.16, 1.055, 0.30);
    }

    this.ghostCupMesh.visible = hasAnyLiquid && this.gameState.phase === 'playing';

    // Phase 4: Pulsing golden-emerald clickable Serve-Ready Halo around the completed cup (also works in Realism Mode!)
    const readyToServe =
      this.gameState.phase === 'playing' &&
      Boolean(
        pinnedOrder &&
          isOrderReadyToServe(
            this.gameState.currentCup,
            this.gameState.preparedPastry,
            pinnedOrder
          ).ready
      );
    this.isServeCupClickable = readyToServe;
    if (this.serveReadyHaloMesh) {
      this.serveReadyHaloMesh.visible = readyToServe;
    }

    // Phase 1.3 & 6: Stage prepared Pastry beside Serve Coaster on Mini Porcelain Plate (dine-in) or Kraft Paper Bag (takeout/delivery)!
    if (this.preparedPastryStageGroup && this.preparedPlateGroup && this.preparedBagGroup) {
      const prepared = this.gameState.preparedPastry;
      if ((prepared || this.pastryReturnAnim.active) && this.gameState.phase === 'playing') {
        const isTakeout =
          pinnedOrder?.orderType === 'takeout' || Boolean(pinnedOrder?.isDeliveryRider);
        this.preparedPastryStageGroup.visible = true;
        if (!this.pastryReturnAnim.active) {
          this.preparedPastryStageGroup.position.set(-1.58, 1.0, 0.34);
          this.preparedPastryStageGroup.scale.setScalar(1);
        }
        this.preparedPlateGroup.visible = !isTakeout;
        this.preparedBagGroup.visible = isTakeout;
        if (this.preparedPlatePastryMeshes && prepared) {
          (['daisy-donut', 'miata-cake', 'croissant'] as PastryId[]).forEach((pid) => {
            this.preparedPlatePastryMeshes[pid].visible = pid === prepared;
          });
        }
      } else {
        this.preparedPastryStageGroup.visible = false;
      }
    }
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

    let lastCombSfxTime = 0;
    let lastPetRubTime = 0;

    dom.addEventListener('pointerdown', (e: PointerEvent) => {
      this.isPointerDragging = true;
      this.pointerDownX = e.clientX;
      this.pointerDownY = e.clientY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.activeTouchPoints.size === 2) {
        const pts = Array.from(this.activeTouchPoints.values());
        this.lastPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      }
      const isPortraitRotated = window.innerHeight > window.innerWidth;
      this.dragStartCoord = isPortraitRotated ? e.clientY : e.clientX;
      updateNdc(e.clientX, e.clientY);

      if (this.catStationOpen && this.catStationMode === 'comb' && !this.catStationCustomizeOpen) {
        this.catBrushActive = true;
        this.catBrushTargetPos.set(
          THREE.MathUtils.clamp(this.pointerNdc.x * 0.22, -0.18, 0.18),
          THREE.MathUtils.clamp(0.24 + this.pointerNdc.y * 0.14, 0.14, 0.36),
          0.14
        );
      }

      if (e.pointerType !== 'mouse') {
        this.hoveredToolKey = null;
        this.callbacks.onHoverToolChange(null);
      }
    });

    dom.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.activeTouchPoints.has(e.pointerId)) {
        this.activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      // Phase 6: Pinch-to-zoom & smooth 2D touch-drag panoramic look when in Go Outside Mode
      if (this.outdoorOverlook.active) {
        if (this.activeTouchPoints.size >= 2) {
          const pts = Array.from(this.activeTouchPoints.values());
          const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          if (this.lastPinchDist > 0) {
            this.outdoorOverlook.onZoom((this.lastPinchDist - dist) * 0.08);
          }
          this.lastPinchDist = dist;
          return;
        }
        if (this.isPointerDragging) {
          const isPortraitRotated = window.innerHeight > window.innerWidth;
          const rawDx = e.clientX - this.lastPointerX;
          const rawDy = e.clientY - this.lastPointerY;
          this.lastPointerX = e.clientX;
          this.lastPointerY = e.clientY;
          const dx = isPortraitRotated ? rawDy : rawDx;
          const dy = isPortraitRotated ? -rawDx : rawDy;
          this.outdoorOverlook.onDrag(dx, dy);
        }
        return;
      }

      if (this.isPointerDragging && this.gameState.phase === 'playing') {
        const isPortraitRotated = window.innerHeight > window.innerWidth;
        const curCoord = isPortraitRotated ? e.clientY : e.clientX;
        const dx = curCoord - this.dragStartCoord;
        this.dragStartCoord = curCoord;

        if (this.catStationOpen) {
          updateNdc(e.clientX, e.clientY);
          if (this.catStationCustomizeOpen) {
            // Drag-to-rotate 3D cat preview smoothly while Wardrobe Drawer is open
            this.catPreviewYawOffset += dx * 0.012;
          } else if (this.catStationMode === 'comb') {
            this.catBrushActive = true;
            this.catBrushTargetPos.set(
              THREE.MathUtils.clamp(this.pointerNdc.x * 0.24, -0.2, 0.2),
              THREE.MathUtils.clamp(0.24 + this.pointerNdc.y * 0.16, 0.14, 0.38),
              0.14
            );
            const speed = Math.min(2.0, Math.abs(dx) * 0.06);
            if (speed > 0.12 && this.champyRig) {
              this.champyRig.state = 'combed';
              this.champyRig.stateTimer = 0;
              this.champyRig.stateDuration = 1.6;
              this.champyRig.petTimer = Math.max(this.champyRig.petTimer, 0.8);
              const nowMs = performance.now();
              if (nowMs - lastCombSfxTime > 210) {
                lastCombSfxTime = nowMs;
                this.spawnCatSparkles(2);
                this.callbacks.onCatCombStroke?.(speed);
              }
            }
          } else if (this.catStationMode === 'pet') {
            const nowMs = performance.now();
            if (Math.abs(dx) > 4 && nowMs - lastPetRubTime > 420) {
              lastPetRubTime = nowMs;
              this.petChampy();
              this.callbacks.onPetChampy?.();
            }
          }
          return;
        }

        this.manualCameraYawOffset = THREE.MathUtils.clamp(
          this.manualCameraYawOffset - dx * 0.0025,
          -0.35,
          0.35
        );
      }

      // Never trigger persistent hover tooltips on touchscreens or during Cat Station close-up
      if (e.pointerType !== 'mouse' || this.catStationOpen) {
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

      // Check waiting unaccepted customers at the counter so hovering shows "Take Order" cue
      const waitingCustomer = this.raycastWaitingCustomer();
      if (waitingCustomer) {
        this.hoveredToolKey = null;
        dom.style.cursor = 'pointer';
        this.callbacks.onHoverToolChange(`Tap to Take ${waitingCustomer.customerName}'s Order`);
        return;
      }

      this.hoveredToolKey = null;
      dom.style.cursor = 'default';
      this.callbacks.onHoverToolChange(null);
    });

    window.addEventListener('pointerup', (e: PointerEvent) => {
      this.activeTouchPoints.delete(e.pointerId);
      if (this.activeTouchPoints.size < 2) this.lastPinchDist = 0;
      if (!this.isPointerDragging) return;
      this.isPointerDragging = false;
      this.catBrushActive = false;

      if (this.outdoorOverlook.active) return;

      if (e.pointerType !== 'mouse') {
        this.hoveredToolKey = null;
        this.callbacks.onHoverToolChange(null);
      }

      if (this.gameState.phase !== 'playing') return;
      // Confirm pointer travel < 12px so camera drags never trigger accidental clicks/pets
      const travelDist = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
      if (travelDist >= 12) return;

      // Phase 5: Direct tap actions in Cat Station close-up
      if (this.catStationOpen && !this.catStationCustomizeOpen) {
        if (this.catStationMode === 'treat') {
          this.triggerCatTreatToss();
        } else if (this.catStationMode === 'pet') {
          this.petChampy();
          this.callbacks.onPetChampy?.();
        }
        return;
      }

      updateNdc(e.clientX, e.clientY);
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const hits = this.raycaster.intersectObjects(this.interactables, true);
      if (hits.length > 0) {
        // Phase 0.4: Prioritize plated pastry return hitbox ahead of neighboring counter props when visible
        const prioritizedHit =
          this.gameState.preparedPastry && !this.pastryReturnAnim.active
            ? hits.find((h) => h.object.userData?.toolKey === 'prepared-pastry-plate') || hits[0]
            : hits[0];
        const data = prioritizedHit.object.userData;
        if (data && typeof data.onClick === 'function') {
          data.onClick();
          return;
        }
      }

      // Clicking/tapping a waiting customer directly at the counter accepts their order!
      const waitingCustomer = this.raycastWaitingCustomer();
      if (waitingCustomer) {
        this.callbacks.onAcceptCustomerOrder?.(waitingCustomer.id);
      }
    });

    dom.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        if (this.outdoorOverlook.active) {
          this.outdoorOverlook.onZoom(e.deltaY * 0.03);
          return;
        }
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

  private raycastWaitingCustomer(): CustomerOrder | null {
    const waitingOrders = this.gameState.customers.filter(
      (c) => c.state === 'ordering' && !c.orderAccepted
    );
    if (waitingOrders.length === 0) return null;

    const candidateGroups: THREE.Object3D[] = [];
    const groupToOrder = new Map<THREE.Object3D, CustomerOrder>();
    for (const order of waitingOrders) {
      const actor = this.customerActors.get(order.id);
      if (actor) {
        candidateGroups.push(actor.group);
        groupToOrder.set(actor.group, order);
      }
    }
    if (candidateGroups.length === 0) return null;

    const hits = this.raycaster.intersectObjects(candidateGroups, true);
    if (hits.length === 0) return null;

    let cur: THREE.Object3D | null = hits[0].object;
    while (cur) {
      const matched = groupToOrder.get(cur);
      if (matched) return matched;
      cur = cur.parent;
    }
    return null;
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

      // Save battery & prevent background GPU/CPU churn when browser tab is hidden
      if (document.hidden) {
        this.clock.getDelta();
        this.frameId = window.setTimeout(tick, 250);
        return;
      }

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

    const isTall = this.currentActiveVesselType !== 'hot-mug';
    if (this.currentLiquidFill > 0.02) {
      this.activeCupLiquidMesh.visible = true;
      const scaleY = Math.max(0.08, this.currentLiquidFill) * (isTall ? 1.24 : 1.0);
      const radiusFactor = isTall ? 0.84 : 1.0;
      const xzScale = (0.86 + Math.min(1, this.currentLiquidFill) * 0.14) * radiusFactor;
      this.activeCupLiquidMesh.scale.set(xzScale, scaleY, xzScale);
      const centerY = (isTall ? 0.018 : 0.026) + 0.056 * scaleY;
      this.activeCupLiquidMesh.position.y = centerY;
      // Keep drizzle ring resting snugly on the live liquid surface (never floating in empty air!)
      this.activeCupDrizzleRing.position.y = centerY + 0.055 * scaleY + 0.0025;
    } else {
      this.activeCupLiquidMesh.visible = false;
      this.activeCupDrizzleRing.position.y = isTall ? 0.024 : 0.032;
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

    // Station 4 Shifted Rest Coords (clear of Rinser at 0.52 & Trash Chute at 0.74)
    this.milkPitcherGroup.position.set(0.96, 1.0, 0.38);
    this.milkPitcherGroup.rotation.set(0, 0, 0);
    this.teaPotGroup.position.set(1.18, 1.0, 0.14);
    this.teaPotGroup.rotation.set(0, 0, 0);
    this.steamWandPivot.rotation.set(0, 0, 0);
    this.iceScoopGroup.position.set(0.02, 0.065, 0.01);
    this.iceScoopGroup.rotation.set(0, 0, 0);
    this.matchaWhiskGroup.position.set(0, 0.095, 0);
    this.matchaWhiskGroup.rotation.set(0, 0, 0);

    // Reset Phase 5 Rinser Spray & Trash Chute Flap
    if (this.rinserSprayConeMesh) this.rinserSprayConeMesh.visible = false;
    for (let mi = 0; mi < this.rinserMistDrops.length; mi++) {
      this.rinserMistDrops[mi].visible = false;
    }
    if (this.trashFlapPivot) this.trashFlapPivot.rotation.x = 0;

    for (const pump of this.syrupPumpHeads.values()) {
      pump.position.y = 0.27;
    }
    for (const [flKey, bGroup] of this.syrupBottleGroups.entries()) {
      const bx = this.syrupBottleBaseX.get(flKey) ?? 1.78;
      bGroup.position.set(bx, 1.045, 0.18);
      bGroup.rotation.set(0, 0, 0);
    }
    for (let i = 0; i < this.syrupDroplets.length; i++) {
      this.syrupDroplets[i].visible = false;
    }
    const drizzleFitScale = this.currentActiveVesselType !== 'hot-mug' ? 0.78 : 0.96;
    this.activeCupDrizzleRing.scale.setScalar(drizzleFitScale);

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
    this.activeBaristaCupGroup.rotation.set(0, 0, 0);
    this.activeBaristaCupGroup.visible = true;

    this.gaugeNeedles.forEach((n) => {
      n.rotation.z = cup.hasEspresso ? -0.65 : 0.8;
    });
    this.groupHeadLedMat.emissiveIntensity = 0.4;

    if (this.activeCupIceGroup.visible) {
      const iceBaseY = this.currentActiveVesselType !== 'hot-mug' ? 0.152 : 0.132;
      this.activeCupIceGroup.children.forEach((cube, idx) => {
        cube.position.y = iceBaseY + Math.sin(this.elapsed * 3.8 + idx) * 0.004;
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
      // Phase 1 (0..0.18): Portafilter locks into grouphead (-0.16)
      if (p < 0.18) {
        const lockT = easeInOutCubic(p / 0.18);
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

      // Phase 4 Pull-Shot Cooldown Sync: Cup stays firmly on Espresso Drip Tray (-0.16, 1.055, 0.30) until p >= 0.86!
      if (p < 0.86) {
        this.activeBaristaCupGroup.position.set(-0.16, 1.055, 0.30);
      } else {
        const glide = easeInOutCubic((p - 0.86) / 0.14);
        this.activeBaristaCupGroup.position.set(
          evalQuadBezier(-0.16, 0.51, 1.18, glide),
          evalQuadBezier(1.055, 1.12, 1.01, glide),
          evalQuadBezier(0.30, 0.42, 0.38, glide)
        );
      }

      this.groupHeadLedMat.emissiveIntensity = 1.6 + Math.sin(this.elapsed * 16) * 0.4;
      const needleAngle = THREE.MathUtils.lerp(0.8, -0.75, Math.min(1, p * 1.5));
      this.gaugeNeedles.forEach((n) => {
        n.rotation.z = needleAngle + Math.sin(this.elapsed * 30) * 0.03;
      });

      if (p > 0.16 && p < 0.86) {
        this.espressoStreamsGroup.visible = true;
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(-0.16, 1.54, 0.32);
      }
    } else if (this.stepAnim.type === 'steam_milk') {
      // 3-Phase Bezier Steamed Milk & Rosetta Latte Art Pour over Station 4 Assembly Coaster (1.18, 1.01, 0.38)
      this.activeBaristaCupGroup.position.set(1.18, 1.01, 0.38);
      if (p < 0.45) {
        const sub = Math.sin((p / 0.45) * Math.PI);
        this.milkPitcherGroup.position.set(
          evalQuadBezier(0.96, 0.61, 0.26, sub),
          evalQuadBezier(1.0, 1.08, 1.12, sub),
          0.38
        );
        this.steamWandPivot.rotation.z = -0.36 * sub;
        this.pitcherMilkMesh.rotation.y += dt * 14;
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(0.26, 1.38, 0.36);
      } else if (p < 0.85) {
        const pourT = easeInOutCubic((p - 0.45) / 0.4);
        const hoverArc = Math.sin(pourT * Math.PI);
        const wiggleZ = Math.sin(this.elapsed * 28) * 0.015;
        this.milkPitcherGroup.position.set(
          evalQuadBezier(0.58, 0.88, 1.07, Math.min(1, pourT * 1.4)),
          1.24 + hoverArc * 0.03,
          0.38 + wiggleZ
        );
        this.milkPitcherGroup.rotation.z = -1.08 * Math.min(1, Math.sin(pourT * Math.PI) * 1.35);
        this.milkPitcherGroup.rotation.x = wiggleZ * 2.5;
        this.milkPourStreamMesh.visible = true;
        this.milkPourStreamMesh.position.set(1.16, 1.18, 0.38 + wiggleZ * 0.6);
      } else {
        const restT = easeInOutCubic((p - 0.85) / 0.15);
        this.milkPitcherGroup.position.set(
          evalQuadBezier(1.07, 1.01, 0.96, restT),
          evalQuadBezier(1.24, 1.12, 1.0, restT),
          0.38
        );
        this.milkPitcherGroup.rotation.z = THREE.MathUtils.lerp(-0.95, 0, restT);
        this.milkPourStreamMesh.visible = false;
      }
    } else if (this.stepAnim.type === 'add_ice') {
      // Ice Scoop dips into bin (1.44, 0.16), arcs over Station 4 Assembly Coaster (1.18, 1.01, 0.38)
      this.activeBaristaCupGroup.position.set(1.18, 1.01, 0.38);
      const arc = Math.sin(p * Math.PI);
      this.iceScoopGroup.position.set(
        evalQuadBezier(0.02, -0.13, -0.26, arc),
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
      this.activeBaristaCupGroup.position.set(1.18, 1.01, 0.38);
      const fl = this.stepAnim.flavor || 'vanilla';
      const rMat = this.syrupRibbonMesh.material as THREE.MeshStandardMaterial;

      if (fl === 'matcha') {
        rMat.color.setHex(0x65a30d);
        this.matchaWhiskGroup.position.x = Math.sin(p * Math.PI * 8) * 0.028;
        this.matchaWhiskGroup.position.z = Math.sin(p * Math.PI * 4) * 0.022;
        this.matchaWhiskGroup.rotation.z = Math.cos(p * Math.PI * 8) * 0.18;
        this.syrupRibbonMesh.visible = true;
        this.syrupRibbonMesh.position.set(1.18, 1.21, 0.38);
        this.syrupRibbonMesh.scale.set(1, 1, 1);
        this.activeCupDrizzleRing.visible = true;
        this.activeCupDrizzleRing.scale.setScalar(0.35 + p * 0.65);
        this.activeCupDrizzleRing.rotation.z = p * Math.PI * 4;
      } else {
        if (fl === 'vanilla') rMat.color.setHex(0xfde68a);
        else if (fl === 'caramel') rMat.color.setHex(0xd97706);
        else rMat.color.setHex(0x451a03);

        const bottle = this.syrupBottleGroups.get(fl);
        const baseX = this.syrupBottleBaseX.get(fl) ?? 1.78;
        const pump = this.syrupPumpHeads.get(fl);
        // Side-offset pour pose to the RIGHT of the open cup (1.18, 1.01, 0.38)
        const pourX = 1.322;
        const pourY = 1.13;
        const pourZ = 0.38;
        const drizzleBaseScale = this.currentActiveVesselType !== 'hot-mug' ? 0.78 : 0.96;

        if (p < 0.22) {
          const liftT = easeInOutCubic(p / 0.22);
          if (bottle) {
            bottle.position.set(
              evalQuadBezier(baseX, (baseX + pourX) * 0.5, pourX, liftT),
              evalQuadBezier(1.045, 1.28, pourY, liftT),
              evalQuadBezier(0.18, 0.29, pourZ, liftT)
            );
            bottle.rotation.set(0.2 * liftT, -Math.PI * 0.5 * liftT, 0);
          }
        } else if (p < 0.8) {
          const subP = (p - 0.22) / 0.58;
          if (bottle) {
            bottle.position.set(pourX, pourY, pourZ);
            bottle.rotation.set(0.2, -Math.PI * 0.5, 0);
          }
          const cyclePhase = (subP * 2) % 1;
          const press = cyclePhase < 0.88 ? Math.sin((cyclePhase / 0.88) * Math.PI) : 0;
          if (pump) {
            pump.position.y = 0.27 - press * 0.036;
          }

          const streamTopY = 1.385 - press * 0.032;
          const liquidWorldY = 1.01 + this.activeCupDrizzleRing.position.y;
          const streamMidY = (streamTopY + liquidWorldY) * 0.5;
          const streamHeight = Math.max(0.08, streamTopY - liquidWorldY);
          this.syrupRibbonMesh.visible = press > 0.14;
          this.syrupRibbonMesh.position.set(1.192, streamMidY, 0.38);
          this.syrupRibbonMesh.scale.set(
            0.78 + press * 0.32,
            streamHeight / 0.22,
            0.78 + press * 0.32
          );

          for (let di = 0; di < this.syrupDroplets.length; di++) {
            const drop = this.syrupDroplets[di];
            const dtPhase = (subP * 3.2 + di * 0.33) % 1;
            drop.visible = true;
            drop.position.set(
              1.192 + Math.sin(dtPhase * 8 + di) * 0.003,
              THREE.MathUtils.lerp(streamTopY - 0.01, liquidWorldY + 0.01, dtPhase),
              0.38 + Math.cos(dtPhase * 7 + di) * 0.003
            );
            drop.scale.setScalar(0.75 + Math.sin(dtPhase * Math.PI) * 0.45);
          }

          this.activeCupDrizzleRing.visible = true;
          this.activeCupDrizzleRing.scale.setScalar(drizzleBaseScale * (0.3 + subP * 0.7));
          this.activeCupDrizzleRing.rotation.z = subP * Math.PI * 3.5;
        } else {
          const backT = easeInOutCubic((p - 0.8) / 0.2);
          if (bottle) {
            bottle.position.set(
              evalQuadBezier(pourX, (baseX + pourX) * 0.5, baseX, backT),
              evalQuadBezier(pourY, 1.26, 1.045, backT),
              evalQuadBezier(pourZ, 0.28, 0.18, backT)
            );
            bottle.rotation.set(0.2 * (1 - backT), -Math.PI * 0.5 * (1 - backT), 0);
          }
          this.activeCupDrizzleRing.visible = true;
          this.activeCupDrizzleRing.scale.setScalar(drizzleBaseScale);
        }
      }
    } else if (this.stepAnim.type === 'steep_tea') {
      // Kyoto Borosilicate Glass Teapot lifts along a quadratic curve over Station 4 Assembly Coaster (1.18, 1.01, 0.38)
      this.activeBaristaCupGroup.position.set(1.18, 1.01, 0.38);
      const arc = Math.sin(p * Math.PI);
      this.teaPotGroup.position.set(
        1.18,
        evalQuadBezier(1.0, 1.26, 1.22, arc),
        evalQuadBezier(0.14, 0.24, 0.26, arc)
      );
      this.teaPotGroup.rotation.x = arc * 0.85;
      if (p > 0.2 && p < 0.85) {
        this.teaPourStreamMesh.visible = true;
        this.teaPourStreamMesh.position.set(1.18, 1.18, 0.36);
        this.floatingBadgeSprite.visible = true;
        this.floatingBadgeSprite.position.set(1.18, 1.44 + p * 0.05, 0.28);
      }
    } else if (this.stepAnim.type === 'rinse_cup') {
      // Phase 5 Vessel-Aware Rinse & Disposal:
      // Takeout Paper/Plastic -> Arc into Barista Trash Chute (0.74, 1.02, 0.28) with hinged flap!
      // Dine-In Mug / Iced Glass -> Invert upside down (rotation.x = PI) onto Pressurized Glass Rinser (0.52, 1.02, 0.28) with spray cone & mist!
      const vType = this.stepAnim.vesselType || this.currentActiveVesselType;
      const isTakeoutDisposal = vType === 'hot-takeout' || vType === 'iced-takeout';

      if (isTakeoutDisposal) {
        if (p < 0.45) {
          const arcT = easeInOutCubic(p / 0.45);
          this.activeBaristaCupGroup.position.set(
            evalQuadBezier(this.cupCurrentPos.x, 0.55, 0.74, arcT),
            evalQuadBezier(this.cupCurrentPos.y, 1.32, 1.1, arcT),
            evalQuadBezier(this.cupCurrentPos.z, 0.34, 0.28, arcT)
          );
          this.activeBaristaCupGroup.rotation.set(arcT * 0.65, 0, arcT * 0.35);
          if (this.trashFlapPivot && p > 0.3) {
            const openT = (p - 0.3) / 0.15;
            this.trashFlapPivot.rotation.x = -0.85 * openT;
          }
        } else if (p < 0.76) {
          const dropT = (p - 0.45) / 0.31;
          this.activeBaristaCupGroup.position.set(0.74, THREE.MathUtils.lerp(1.1, 0.82, dropT), 0.28);
          this.activeBaristaCupGroup.rotation.set(0.65 + dropT * 0.9, 0, 0.35);
          this.activeBaristaCupGroup.visible = dropT < 0.48;
          if (this.trashFlapPivot) {
            this.trashFlapPivot.rotation.x = -0.85 * (1 - Math.max(0, (dropT - 0.35) / 0.65));
          }
        } else {
          const respawnT = easeInOutCubic((p - 0.76) / 0.24);
          this.activeBaristaCupGroup.visible = true;
          this.activeBaristaCupGroup.position.set(
            this.cupTargetPos.x,
            THREE.MathUtils.lerp(1.18, this.cupTargetPos.y, respawnT),
            this.cupTargetPos.z
          );
          this.activeBaristaCupGroup.rotation.set(0, 0, 0);
        }
        this.floatingBadgeSprite.visible = p > 0.35;
        this.floatingBadgeSprite.position.set(0.74, 1.34 + p * 0.1, 0.28);
      } else {
        // Ceramic Mug / Iced Glass: Flip upside down onto star actuator at (0.52, 0.28) + pressurized jet spray!
        const rinserX = 0.52;
        const rinserZ = 0.28;
        if (p < 0.26) {
          const t1 = easeInOutCubic(p / 0.26);
          this.activeBaristaCupGroup.position.set(
            evalQuadBezier(this.cupCurrentPos.x, (this.cupCurrentPos.x + rinserX) * 0.5, rinserX, t1),
            evalQuadBezier(this.cupCurrentPos.y, 1.28, 1.18, t1),
            evalQuadBezier(this.cupCurrentPos.z, 0.34, rinserZ, t1)
          );
          this.activeBaristaCupGroup.rotation.set(Math.PI * t1, 0, 0);
        } else if (p < 0.76) {
          const sub = (p - 0.26) / 0.5;
          const pressPulse = Math.sin(sub * Math.PI);
          this.activeBaristaCupGroup.position.set(rinserX, 1.175 - pressPulse * 0.018, rinserZ);
          this.activeBaristaCupGroup.rotation.set(Math.PI, 0, Math.sin(this.elapsed * 32) * 0.025);
          if (this.rinserSprayConeMesh) {
            this.rinserSprayConeMesh.visible = true;
            this.rinserSprayConeMesh.scale.set(
              0.85 + Math.sin(this.elapsed * 45) * 0.16,
              0.8 + pressPulse * 0.38,
              0.85 + Math.cos(this.elapsed * 45) * 0.16
            );
          }
          for (let mi = 0; mi < this.rinserMistDrops.length; mi++) {
            const drop = this.rinserMistDrops[mi];
            const mPhase = (sub * 2.8 + mi * 0.19) % 1;
            const ang = mi * ((Math.PI * 2) / Math.max(1, this.rinserMistDrops.length)) + this.elapsed * 6.0;
            const r = 0.022 + mPhase * 0.055;
            drop.visible = true;
            drop.position.set(
              rinserX + Math.cos(ang) * r,
              1.035 + Math.sin(mPhase * Math.PI) * 0.105,
              rinserZ + Math.sin(ang) * r
            );
          }
        } else {
          const t3 = easeInOutCubic((p - 0.76) / 0.24);
          this.activeBaristaCupGroup.position.set(
            evalQuadBezier(rinserX, (rinserX + this.cupTargetPos.x) * 0.5, this.cupTargetPos.x, t3),
            evalQuadBezier(1.18, 1.28, this.cupTargetPos.y, t3),
            evalQuadBezier(rinserZ, 0.34, this.cupTargetPos.z, t3)
          );
          this.activeBaristaCupGroup.rotation.set(Math.PI * (1 - t3), 0, 0);
        }
        this.floatingBadgeSprite.visible = p > 0.24;
        this.floatingBadgeSprite.position.set(rinserX, 1.38 + p * 0.08, rinserZ);
      }
    } else if (this.stepAnim.type === 'serve_drink') {
      // 2-Stage Physical Pickup Choreography at Station 5 Walnut Pickup Coaster (-1.32, 1.03, 0.34)
      if (p < 0.48) {
        const s1 = easeInOutCubic(p / 0.48);
        this.activeBaristaCupGroup.position.set(
          evalQuadBezier(1.18, -0.05, -1.32, s1),
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

    // 1b. Phase 0.4 & 1.3 Clickable Serving Pastry Plate Reverse-Arc Return + Subtle Pulsing Amber Ring
    if (this.pastryReturnRingMesh && this.pastryReturnRingMat && this.preparedPastryStageGroup?.visible) {
      const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 4.2);
      this.pastryReturnRingMat.opacity = 0.35 + pulse * 0.42;
      const ringScale = 0.96 + pulse * 0.08;
      this.pastryReturnRingMesh.scale.setScalar(ringScale);
    }
    if (this.pastryReturnAnim.active && this.preparedPastryStageGroup) {
      this.pastryReturnAnim.elapsed += dt;
      const u = Math.min(1, this.pastryReturnAnim.elapsed / this.pastryReturnAnim.duration);
      const e = easeInOutCubic(u);
      this.preparedPastryStageGroup.position.set(
        THREE.MathUtils.lerp(-1.58, -1.86, e),
        THREE.MathUtils.lerp(1.0, 1.12, e) + Math.sin(u * Math.PI) * 0.18,
        THREE.MathUtils.lerp(0.34, 0.22, e)
      );
      this.preparedPastryStageGroup.scale.setScalar(1 - e * 0.45);
      if (u >= 1) {
        this.pastryReturnAnim.active = false;
        this.preparedPastryStageGroup.visible = false;
        this.preparedPastryStageGroup.position.set(-1.58, 1.0, 0.34);
        this.preparedPastryStageGroup.scale.setScalar(1);
        this.callbacks.onReturnPastry?.();
      }
    }

    // 2. Camera Mode: "TITLE_ORBIT" vs Cat Station Close-Up (0.55s cubic ease-in-out) vs POS Focus vs Station Barista Camera
    const isTitle = this.gameState.phase === 'title';
    this.titleHeroCupGroup.visible = isTitle;
    this.titlePlaqueGroup.visible = isTitle;

    // Advance smooth 0.55s transition blend for Cat Station close-up
    const catCamStep = dt / 0.55;
    this.catStationCamBlend = this.catStationOpen
      ? Math.min(1, this.catStationCamBlend + catCamStep)
      : Math.max(0, this.catStationCamBlend - catCamStep);

    if (isTitle) {
      const swayX = Math.sin(this.elapsed * 0.52) * 0.08;
      const swayY = Math.cos(this.elapsed * 0.38) * 0.015;
      _targetPos.set(1.86 + swayX, 1.28 + swayY, 0.96);
      _targetLook.set(-1.35, 0.78, -1.85);
    } else if (this.catStationOpen && this.catPerchGroup) {
      // Phase 5: Close-up framing of active cafe cat on velvet cushion (-2.90, 1.0, 0.24)
      // When Wardrobe Drawer (right 40%) is open, shift look-target right so the cat sits crisply centered in the left 60% viewport!
      if (this.catStationCustomizeOpen) {
        _targetPos.set(-2.70, 1.34, 1.06);
        _targetLook.set(-2.74, 1.18, 0.24);
      } else {
        _targetPos.set(-2.82, 1.35, 0.94);
        _targetLook.set(-2.90, 1.20, 0.24);
      }
    } else if (this.isCodexFocused && this.posDisplayMesh) {
      // Diegetic 3D POS Terminal Focus: smoothly zoom right up to the Station 1 POS screen!
      this.posDisplayMesh.getWorldPosition(_codexCenter);
      this.posDisplayMesh.getWorldQuaternion(_codexQuat);
      _codexNormal.set(0, 0, 1).applyQuaternion(_codexQuat).normalize();
      _targetPos.copy(_codexCenter).addScaledVector(_codexNormal, 0.44);
      _targetPos.y += 0.015;
      _targetLook.copy(_codexCenter);
    } else {
      const preset = STATION_CAMERAS[this.gameState.activeStation] || STATION_CAMERAS[3];
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
        } else if (t === 'rinse_cup') {
          _targetPos.set(0.62, 1.48, 1.24);
          _targetLook.set(0.62, 1.08, 0.28);
        } else if (
          t === 'steam_milk' ||
          t === 'steep_tea' ||
          t === 'add_ice' ||
          t === 'add_syrup'
        ) {
          _targetPos.set(1.24, 1.46, 1.32);
          _targetLook.set(cupPos.x, 1.1, 0.36);
        } else if (t === 'serve_drink') {
          _targetPos.set(-1.32, 1.54, 1.38);
          _targetLook.set(-1.32, 1.15, -0.42);
        }
      }

      _targetPos.z += this.manualCameraZoomOffset;
      _targetLook.x += this.manualCameraYawOffset * 2.2;
    }

    if (this.outdoorOverlook.active) {
      this.outdoorOverlook.update(dt);
    } else {
      const camDamp = this.catStationOpen
        ? 1 - Math.exp(-16.0 * dt)
        : this.isCodexFocused
        ? 1 - Math.exp(-9.0 * dt)
        : dampFactor;
      this.camera.position.lerp(_targetPos, camDamp);
      this.currentLookAt.lerp(_targetLook, camDamp);
      _lookMat.lookAt(this.camera.position, this.currentLookAt, _upVec);
      _targetQuat.setFromRotationMatrix(_lookMat);
      this.camera.quaternion.slerp(_targetQuat, camDamp);
    }

    // Update active 3D Outdoor Scenery animations (funicular, Sakura/fireflies, prayer flags, neon holograms, crater clouds)
    if (this.sceneryManager) {
      this.sceneryManager.update(
        dt,
        this.elapsed,
        isNightWeather(this.gameState.weather),
        this.gameState.climateState || 'summer',
        this.gameState.weather
      );
    }

    // Update falling snow particles when Snow / Always Winter is active
    if (this.snowPoints && this.snowPoints.visible) {
      const posAttr = this.snowPoints.geometry.attributes.position as THREE.BufferAttribute;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        let sx = posAttr.getX(i) + (this.snowVelocities[i * 3] + Math.sin(this.elapsed * 0.9 + i) * 0.25) * dt;
        let sy = posAttr.getY(i) + this.snowVelocities[i * 3 + 1] * dt;
        let sz = posAttr.getZ(i) + this.snowVelocities[i * 3 + 2] * dt;
        if (sy < 0.05) {
          sy = 13.5;
          sx = -26 + ((i * 11.7) % 52);
          sz = -6.8 - ((i * 5.3) % 26);
        }
        posAttr.setXYZ(i, sx, sy, sz);
      }
      posAttr.needsUpdate = true;
    }

    // Update floating heart sprites above Secret NPC upon serve
    for (let hi = this.floatingSecretHearts.length - 1; hi >= 0; hi--) {
      const h = this.floatingSecretHearts[hi];
      h.age += dt;
      if (h.age < 0) {
        h.sprite.visible = false;
        continue;
      }
      h.sprite.visible = true;
      h.sprite.position.y += dt * 0.55;
      const progress = h.age / h.maxAge;
      (h.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - progress);
      if (h.age >= h.maxAge) {
        this.scene.remove(h.sprite);
        h.sprite.material.dispose();
        this.floatingSecretHearts.splice(hi, 1);
      }
    }

    // 3. Exterior Hanging Blade Sign gentle wind sway & Sky Dome twinkling time uniform
    if (this.skyDomeMat) {
      this.skyDomeMat.uniforms.uTime.value = this.elapsed;
    }
    if (this.hangingSignGroup) {
      const windAmp = isRainyWeather(this.gameState.weather) ? 0.055 : 0.024;
      this.hangingSignGroup.rotation.z = Math.sin(this.elapsed * 1.45) * windAmp;
      this.hangingSignGroup.rotation.x = Math.cos(this.elapsed * 0.95) * 0.012;
    }

    // 3a. Swinging Glass Entrance Door & Shopkeeper Bell Proximity Trigger (+ Active Cat Greeting Target!)
    if (this.entranceDoorPivot) {
      let minDoorDist = 99;
      let doorActorPos: THREE.Vector3 | null = null;
      for (const actor of this.customerActors.values()) {
        const d = Math.hypot(actor.currentPos.x - -1.15, actor.currentPos.z - -6.2);
        if (d < minDoorDist) {
          minDoorDist = d;
          doorActorPos = actor.currentPos;
        }
      }
      const shouldOpen = minDoorDist < 1.65;
      const targetDoorAngle = shouldOpen ? 1.38 : 0.0;
      this.doorAngle += (targetDoorAngle - this.doorAngle) * (1 - Math.exp(-6.5 * dt));
      this.entranceDoorPivot.rotation.y = this.doorAngle;

      this.doorChimeCooldown = Math.max(0, this.doorChimeCooldown - dt);
      if (shouldOpen && !this.doorWasOpen && this.doorChimeCooldown <= 0) {
        this.callbacks.onDoorOpen?.();
        this.triggerChampyGreeting(doorActorPos || undefined);
        this.doorChimeCooldown = 1.8;
      }
      this.doorWasOpen = shouldOpen;

      if (this.doorBellGroup) {
        const swingVel = Math.abs(targetDoorAngle - this.doorAngle);
        this.doorBellGroup.rotation.z =
          Math.sin(this.elapsed * 18.0) * Math.min(0.32, swingVel * 0.34);
      }
    }

    // 3a-ii. Phase 2: Pulse Additive Hanging Order Ticket Glow Halos (Amber Active, Emerald Pinned, Crimson Urgent < 5s)
    for (let ti = 0; ti < this.ticketGlowMats.length; ti++) {
      const mat = this.ticketGlowMats[ti];
      const slot = this.ticketOrderSlots[ti];
      if (!slot) {
        mat.opacity = 0.0;
      } else if (slot.isUrgent) {
        mat.color.setHex(0xf43f5e);
        mat.opacity = 0.45 + (0.5 + 0.5 * Math.sin(this.elapsed * 9.0)) * 0.5;
      } else if (slot.isPinned) {
        mat.color.setHex(0x34d399);
        mat.opacity = 0.72;
      } else {
        mat.color.setHex(0xfbbf24);
        mat.opacity = 0.38 + (0.5 + 0.5 * Math.sin(this.elapsed * 3.2 + ti * 1.1)) * 0.4;
      }
    }

    // 3a-iii. Phase 8: Update Cafe Cat Autonomous Animation & Live Customer Tracking
    this.updateChampy(dt);

    // 3b. 1990 Mazda Miata MX-5 Pop-Up Headlight Wink & Illumination
    if (this.miataLeftPopupGroup && this.miataRightPopupGroup) {
      const isNightOrRain =
        isRainyWeather(this.gameState.weather) ||
        isNightWeather(this.gameState.weather) ||
        this.gameState.weather === 'golden' ||
        this.gameState.weather === 'dawn';
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

    // 4. Phase 2 & 6: 3D Counter Audio Props (Vinyl Turntable Platter / Vintage Radio / External Hologram)
    const isVinylSpinning =
      (this.audioMode === 'vinyl' && this.audioPlaying) || this.spotifyState.isPlaying;
    if (this.vinylPlatterGroup && this.vinylTonearmPivot) {
      if (isVinylSpinning) {
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
    this.counterAudioProps?.update(dt, this.elapsed);

    // 5. Subtle & Aesthetic Diegetic Step Halo Ring + Serve-Ready Glow + Pastry Display Halos
    const pinnedOrder =
      this.gameState.customers.find(
        (c) => c.id === this.gameState.pinnedOrderId && c.state === 'ordering'
      ) || this.gameState.customers.find((c) => c.state === 'ordering');
    const recipe = pinnedOrder ? getRecipeById(pinnedOrder.recipeId) : null;
    const nextStep = getNextRecommendedStep(
      this.gameState.currentCup,
      recipe,
      pinnedOrder,
      this.gameState.preparedPastry
    );
    const effectiveSyrup = pinnedOrder?.customSyrup || recipe?.syrup || 'vanilla';
    const recommendedToolKey = this.gameState.realismMode
      ? null
      : nextStep.toolKey === 'syrup'
      ? `syrup-${effectiveSyrup}`
      : nextStep.toolKey;

    // Pulse golden-emerald Serve-Ready Halo around clickable cup (visible even in Realism Mode!)
    if (this.serveReadyHaloMesh && this.serveReadyHaloMat) {
      if (this.isServeCupClickable) {
        const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 5.2);
        this.serveReadyHaloMesh.visible = true;
        this.serveReadyHaloMat.opacity = 0.36 + pulse * 0.42;
        this.serveReadyHaloMat.color.setHex(pulse > 0.5 ? 0x34d399 : 0xfbbf24);
        this.serveReadyHaloMesh.scale.setScalar(0.94 + pulse * 0.14);
      } else {
        this.serveReadyHaloMesh.visible = false;
      }
    }

    // Pulse Pastry Display Case shelf halos when pinned customer requests a pastry
    const neededPastry =
      this.gameState.phase === 'playing' &&
      pinnedOrder?.requestedPastry &&
      this.gameState.preparedPastry !== pinnedOrder.requestedPastry
        ? pinnedOrder.requestedPastry
        : null;
    for (const [pid, hMat] of this.pastryCaseHaloMats.entries()) {
      if (pid === neededPastry && !this.gameState.realismMode) {
        hMat.opacity = 0.35 + (0.5 + 0.5 * Math.sin(this.elapsed * 4.5)) * 0.42;
      } else {
        hMat.opacity = 0.0;
      }
    }

    const haloCoords: Record<string, [number, number]> = {
      'pastry-daisy-donut': [-2.12, 0.22],
      'pastry-miata-cake': [-1.86, 0.22],
      'pastry-croissant': [-1.6, 0.22],
      grinder: [-0.78, 0.22],
      tamper: [-0.48, 0.36],
      espresso: [-0.16, 0.30],
      rinse: [0.52, 0.28],
      sink: [0.52, 0.28],
      tea: [1.18, 0.14],
      milk: [0.96, 0.38],
      ice: [1.44, 0.16],
      'syrup-vanilla': [1.66, 0.18],
      'syrup-caramel': [1.78, 0.18],
      'syrup-chocolate': [1.9, 0.18],
      'syrup-matcha': [1.96, 0.38],
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

      if (key === 'pet-champy' && this.champyRig) {
        const hoverMult = isHovered ? 1.035 : 1.0;
        const popMult =
          this.champyRig.swapPopTimer > 0
            ? 1.0 + Math.sin((this.champyRig.swapPopTimer / 0.4) * Math.PI) * 0.14
            : 1.0;
        const s = hoverMult * popMult;
        _tempVec.copy(this.champyRig.baseScale).multiplyScalar(s);
        group.scale.lerp(_tempVec, dampFactor);
        continue;
      }

      if (key === 'cookie-jar') {
        const targetScale = isHovered ? 1.02 : 1.0;
        group.scale.lerp(_tempVec.setScalar(targetScale), dampFactor);
        continue;
      }

      const targetScale = isHovered ? 1.03 : 1.0;
      group.scale.lerp(_tempVec.setScalar(targetScale), dampFactor);

      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          if (child === this.posDisplayMesh) return;
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

    // 7. Animate Floating Musical Note Particles above Station 6 Counter Audio Device (x = 2.54)
    const isAnyAudioPlaying = this.audioPlaying || this.spotifyState.isPlaying;
    this.musicNotesInstanced.visible = isAnyAudioPlaying;
    if (isAnyAudioPlaying) {
      for (let i = 0; i < 12; i++) {
        const t = (this.elapsed * 0.45 + i * 0.25) % 1;
        _dummyObj.position.set(
          2.54 + Math.sin(t * 5 + i) * 0.16,
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

    // 8. Outdoor-Only GPU Rain Curtain, Scrolling Window Droplets, Puddle Splashes, Volumetric God Rays & Golden Dust
    if (this.gpuRainMat && this.gpuRainLines?.visible) {
      this.gpuRainMat.uniforms.uTime.value = this.elapsed;
      if (this.windowRainTexture) {
        this.windowRainTexture.offset.y = (this.windowRainTexture.offset.y + dt * 0.38) % 1;
      }
      if (this.rainSplashInstanced?.visible) {
        for (let i = 0; i < 16; i++) {
          const t = (this.elapsed * 1.65 + i * 0.23) % 1;
          const sx = -6.4 + (i % 8) * 1.82 + Math.sin(i * 3.1) * 0.35;
          const sz = -7.05 - Math.floor(i / 8) * 4.15;
          _dummyObj.position.set(sx, 0.025, sz);
          _dummyObj.rotation.set(0, 0, 0);
          _dummyObj.scale.setScalar(0.35 + t * 1.65);
          _dummyObj.updateMatrix();
          this.rainSplashInstanced.setMatrixAt(i, _dummyObj.matrix);
        }
        this.rainSplashInstanced.instanceMatrix.needsUpdate = true;
      }
    }

    if (this.godRayMat && this.godRaysGroup?.visible) {
      this.godRayMat.uniforms.uTime.value = this.elapsed;
    }
    if (this.goldenDustInstanced?.visible) {
      for (let i = 0; i < 18; i++) {
        const phase = this.elapsed * 0.22 + i * 0.71;
        const dx = -3.0 + ((i * 1.37) % 6.0) + Math.sin(phase * 1.3) * 0.22;
        const dy = 0.85 + ((i * 0.43 + this.elapsed * 0.06) % 2.3);
        const dz = -5.4 + ((i * 0.91) % 4.4) + Math.cos(phase) * 0.18;
        _dummyObj.position.set(dx, dy, dz);
        _dummyObj.rotation.set(0, 0, 0);
        const pulse = 0.65 + Math.sin(phase * 2.2) * 0.35;
        _dummyObj.scale.setScalar(pulse);
        _dummyObj.updateMatrix();
        this.goldenDustInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      this.goldenDustInstanced.instanceMatrix.needsUpdate = true;
    }

    // 8b. Advance Pooled Full-Quality Outdoor Sidewalk Pedestrians + Phase 6 Rainy-Day 3D Umbrellas (Zero Allocation)
    const isRainActive = isRainyWeather(this.gameState.weather);
    for (let i = 0; i < this.pedestrianPool.length; i++) {
      const p = this.pedestrianPool[i];
      if (!p.actor.group.visible) continue;
      p.x += p.dir * p.speed * dt;
      if (p.dir === 1 && p.x > 14.5) p.x = -14.5;
      else if (p.dir === -1 && p.x < -14.5) p.x = 14.5;

      p.actor.group.position.set(p.x, 0.08, p.laneZ);
      p.actor.group.rotation.y = p.dir === 1 ? Math.PI / 2 : -Math.PI / 2;

      p.walkPhase += p.speed * dt * 5.0;
      const s = Math.sin(p.walkPhase);
      const c = Math.cos(p.walkPhase);
      p.actor.pelvisGroup.position.y = 0.58 + Math.abs(s) * 0.032;
      p.actor.pelvisGroup.rotation.z = s * 0.03;
      p.actor.torsoGroup.rotation.y = -s * 0.07;
      p.actor.leftHipJoint.rotation.x = s * 0.48;
      p.actor.rightHipJoint.rotation.x = -s * 0.48;
      p.actor.leftKneeJoint.rotation.x = Math.max(0, -c * 0.5);
      p.actor.rightKneeJoint.rotation.x = Math.max(0, c * 0.5);

      p.actor.umbrellaGroup.visible = isRainActive;
      if (isRainActive) {
        // Hold umbrella upright above head in left hand
        p.actor.leftShoulderJoint.rotation.x = -1.28 + Math.abs(s) * 0.03;
        p.actor.leftElbowJoint.rotation.x = -0.3;
      } else {
        p.actor.leftShoulderJoint.rotation.x = -s * 0.38;
        p.actor.leftElbowJoint.rotation.x = -0.22 - Math.max(0, -s) * 0.22;
      }

      if (p.actor.heldCup.visible) {
        p.actor.rightShoulderJoint.rotation.x = -0.56 + Math.abs(s) * 0.04;
        p.actor.rightElbowJoint.rotation.x = -0.88;
      } else {
        p.actor.rightShoulderJoint.rotation.x = s * 0.38;
        p.actor.rightElbowJoint.rotation.x = -0.22 - Math.max(0, s) * 0.22;
      }
      // Subtle glance toward the warm cafe facade when walking past
      const nearCafe = Math.abs(p.x) < 3.4 && p.laneZ > -10;
      const targetGlance = nearCafe ? (p.dir === 1 ? -0.45 : 0.45) : 0;
      p.actor.neckJoint.rotation.y += (targetGlance - p.actor.neckJoint.rotation.y) * Math.min(1, dt * 4);
    }

    // 8b-ii. Phase 5: Secret Easter Egg NPC Outdoor Passerby Cameo (8% roll, singleton + 270s cooldown, 3s pause & friendly wave!)
    this.secretPasserbyCooldown = Math.max(0, this.secretPasserbyCooldown - dt);
    const secretCustomerActive = this.gameState.customers.some((c) => Boolean(c.isSecretNpc));
    if (
      !this.secretPasserby &&
      !secretCustomerActive &&
      this.secretPasserbyCooldown <= 0 &&
      this.gameState.phase === 'playing'
    ) {
      // Check once every ~12 seconds on average so the 8% chance feels organic & rare
      if (Math.random() < dt * 0.08 && canSpawnSecretNpc({
        role: 'passerby',
        isSecretNpcActive: false,
        cooldownRemainingSec: this.gameState.secretNpcCooldownRemaining ?? 0,
      })) {
        const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        const appearance = resolveSecretNpcAppearance(
          this.gameState.climateState || 'summer',
          isRainActive
        );
        const actor = this.createCustomerCharacter(
          777,
          '#C6936B',
          appearance.wearsCharcoalTee ? '#595B60' : '#1C1C20',
          'casual-garden',
          undefined,
          null,
          appearance
        );
        actor.group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) child.castShadow = false;
        });
        actor.activitySprite.visible = false;
        actor.phoneMesh.visible = false;
        actor.heldCup.visible = false;
        const startX = dir === 1 ? -14.5 : 14.5;
        actor.group.position.set(startX, 0.08, -8.35);
        this.scene.add(actor.group);
        this.secretPasserby = {
          actor,
          x: startX,
          laneZ: -8.35,
          dir,
          speed: 1.28,
          walkPhase: 0,
          pauseTimer: 0,
          hasPaused: false,
        };
        this.secretPasserbyCooldown = SECRET_NPC_COOLDOWN_SEC;
      }
    }

    if (this.secretPasserby) {
      const sp = this.secretPasserby;
      const inWaveZone = Math.abs(sp.x - -1.15) < 0.6;
      if (!sp.hasPaused && inWaveZone) {
        sp.hasPaused = true;
        sp.pauseTimer = 3.0;
      }

      if (sp.pauseTimer > 0) {
        sp.pauseTimer -= dt;
        // Face directly toward the player if standing outside in Go Outside mode, else face the cafe window!
        const targetFaceAngle = this.outdoorOverlook.active
          ? Math.atan2(
              this.camera.position.x - sp.x,
              this.camera.position.z - sp.laneZ
            )
          : 0;
        sp.actor.group.rotation.y = targetFaceAngle;
        sp.actor.leftHipJoint.rotation.x = 0;
        sp.actor.rightHipJoint.rotation.x = 0;
        sp.actor.leftKneeJoint.rotation.x = 0;
        sp.actor.rightKneeJoint.rotation.x = 0;
        // Friendly overhead wave with right arm!
        sp.actor.rightShoulderJoint.rotation.x = -2.45;
        sp.actor.rightElbowJoint.rotation.x = -0.35 + Math.sin(this.elapsed * 9.5) * 0.42;
        sp.actor.leftShoulderJoint.rotation.x = -0.15;
        sp.actor.leftElbowJoint.rotation.x = -0.25;
        sp.actor.neckJoint.rotation.y = Math.sin(this.elapsed * 2.5) * 0.12;
      } else {
        sp.x += sp.dir * sp.speed * dt;
        sp.actor.group.position.set(sp.x, 0.08, sp.laneZ);
        sp.actor.group.rotation.y = sp.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
        sp.walkPhase += sp.speed * dt * 5.0;
        const s = Math.sin(sp.walkPhase);
        const c = Math.cos(sp.walkPhase);
        sp.actor.pelvisGroup.position.y = 0.58 + Math.abs(s) * 0.032;
        sp.actor.leftHipJoint.rotation.x = s * 0.48;
        sp.actor.rightHipJoint.rotation.x = -s * 0.48;
        sp.actor.leftKneeJoint.rotation.x = Math.max(0, -c * 0.5);
        sp.actor.rightKneeJoint.rotation.x = Math.max(0, c * 0.5);
        sp.actor.leftShoulderJoint.rotation.x = -s * 0.38;
        sp.actor.rightShoulderJoint.rotation.x = s * 0.38;
        sp.actor.leftElbowJoint.rotation.x = -0.22;
        sp.actor.rightElbowJoint.rotation.x = -0.22;

        if ((sp.dir === 1 && sp.x > 15.2) || (sp.dir === -1 && sp.x < -15.2)) {
          this.scene.remove(sp.actor.group);
          sp.actor.activityTexture.dispose();
          this.secretPasserby = null;
        }
      }
    }

    // 8c. Advance Pooled Outdoor Street Traffic Vehicles (Zero Allocation)
    for (let i = 0; i < this.trafficPool.length; i++) {
      const v = this.trafficPool[i];
      if (!v.group.visible) continue;
      v.x += v.dir * v.speed * dt;
      const bound = 19.0;
      if (v.dir === 1 && v.x > bound) v.x = -bound;
      else if (v.dir === -1 && v.x < -bound) v.x = bound;
      v.group.position.x = v.x;
      const wheelSpin = (v.speed / 0.27) * dt;
      for (let w = 0; w < v.wheels.length; w++) {
        v.wheels[w].rotation.z -= wheelSpin;
      }
    }

    // 8d. Phase 1.2 & 7: Up to 2 Simultaneous 3D Delivery Scooters Arrival, Curbside Park (parkX, -7.65), Top-Box Stow & Departure
    const isNightOrRainScooter =
      isRainyWeather(this.gameState.weather) || isNightWeather(this.gameState.weather);
    const scootersToDispose: string[] = [];
    for (let si = 0; si < this.deliveryScooters.length; si++) {
      const sc = this.deliveryScooters[si];
      sc.headlightMat.emissiveIntensity = isNightOrRainScooter ? 3.2 : 1.6;

      if (sc.phase === 'arriving') {
        const speed = 5.4;
        sc.x = Math.max(sc.parkX, sc.x - speed * dt);
        sc.root.position.set(sc.x, 0.04, -7.65);
        for (let wi = 0; wi < sc.wheels.length; wi++) {
          sc.wheels[wi].rotation.z += (speed / 0.21) * dt;
        }
        if (sc.x <= sc.parkX + 0.01) {
          sc.x = sc.parkX;
          sc.phase = 'parked';
          const riderActor = this.customerActors.get(sc.customerId);
          if (riderActor) {
            riderActor.currentPos.set(sc.parkX, 0, -7.25);
            riderActor.lastPos.copy(riderActor.currentPos);
            riderActor.group.position.copy(riderActor.currentPos);
            riderActor.finalGoalKey = '';
          }
        }
      } else if (sc.phase === 'stowing') {
        sc.stowTimer += dt;
        const u = Math.min(1, sc.stowTimer / 0.6);
        sc.topBoxLidPivot.rotation.z = Math.sin(u * Math.PI) * 1.12;
        if (u >= 1) {
          sc.topBoxLidPivot.rotation.z = 0;
          sc.phase = 'departing';
          if (!sc.departSoundPlayed) {
            sc.departSoundPlayed = true;
            this.callbacks.onScooterSound?.('depart');
          }
        }
      } else if (sc.phase === 'departing') {
        const speed = 6.2;
        sc.x -= speed * dt;
        sc.root.position.set(sc.x, 0.04, -7.65);
        for (let wi = 0; wi < sc.wheels.length; wi++) {
          sc.wheels[wi].rotation.z += (speed / 0.21) * dt;
        }
        if (sc.x < -18.0) {
          scootersToDispose.push(sc.customerId);
        }
      }
    }
    for (const cid of scootersToDispose) {
      this.disposeDeliveryScooter(cid);
    }

    // 9. Animate Articulated 3D Customers (Doorway Airlock, Delivery Scooter Rider, Two-Handed Pastry Carry & Umbrellas)
    const shortestAngleDelta = (current: number, target: number): number => {
      let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (diff < -Math.PI) diff += Math.PI * 2;
      return diff;
    };

    const clampTurnToward = (current: number, target: number, alpha: number, maxStepRad: number): number => {
      const diff = shortestAngleDelta(current, target);
      const step = THREE.MathUtils.clamp(diff * alpha, -maxStepRad, maxStepRad);
      return current + step;
    };

    // Phase 1 Strict FIFO Doorway Airlock Queue (x ∈ [-1.95, -0.35], z ∈ [-7.45, -4.95]; 3.5s anti-deadlock failsafe)
    const DOOR_X = -1.15;
    const DOOR_Z = -6.2;
    const EGRESS_LANE_X = 0.28;
    const INGRESS_LANE_X = -0.95;

    const isInsideAirlock = (pos: THREE.Vector3) =>
      pos.x >= -1.95 && pos.x <= -0.35 && pos.z >= -7.45 && pos.z <= -4.95;

    if (this.activeDoorCrossId) {
      this.activeDoorCrossTimer += dt;
      const holder = this.customerActors.get(this.activeDoorCrossId);
      const holderInAirlock = holder ? isInsideAirlock(holder.currentPos) : false;
      const holderStillCrossing =
        holder &&
        (holderInAirlock ||
          (holder.waypoints.length > 0 &&
            Math.hypot(holder.currentPos.x - DOOR_X, holder.currentPos.z - DOOR_Z) < 1.8));
      if (!holderStillCrossing || this.activeDoorCrossTimer > 3.5) {
        this.doorwayQueue = this.doorwayQueue.filter((id) => id !== this.activeDoorCrossId);
        this.activeDoorCrossId = null;
        this.activeDoorCrossTimer = 0;
      }
    }

    if (!this.activeDoorCrossId && this.doorwayQueue.length > 0) {
      // Priority Rule: Exiting patrons (takeout / expired walkouts / finished dine-in) cross before arriving patrons!
      let chosenIdx = 0;
      for (let qi = 0; qi < this.doorwayQueue.length; qi++) {
        const qCust = this.gameState.customers.find((c) => c.id === this.doorwayQueue[qi]);
        if (qCust && qCust.state === 'departing') {
          chosenIdx = qi;
          break;
        }
      }
      this.activeDoorCrossId = this.doorwayQueue[chosenIdx];
      this.doorwayQueue.splice(chosenIdx, 1);
      this.activeDoorCrossTimer = 0;
    }

    const buildAisleWaypoints = (
      from: THREE.Vector3,
      goal: THREE.Vector3,
      kind: 'pickup' | 'queue' | 'seat' | 'car_selfie' | 'exit'
    ): THREE.Vector3[] => {
      const doorX = DOOR_X;
      const corridorZ = -1.78;
      const centerAisleZ = -3.65;
      const pts: THREE.Vector3[] = [];

      if (kind === 'pickup') {
        pts.push(goal.clone());
        return pts;
      }

      if (kind === 'queue') {
        // Outdoor sidewalk -> Exterior Hold (-1.65, -7.75) -> glass door -> Interior -> Ingress Queue Lane (x = -0.95)
        if (from.z < -6.1) {
          pts.push(new THREE.Vector3(-1.65, 0, -7.75));
          pts.push(new THREE.Vector3(doorX, 0, -7.35));
          pts.push(new THREE.Vector3(doorX, 0, -4.95));
          pts.push(new THREE.Vector3(INGRESS_LANE_X, 0, -4.45));
        } else if (Math.abs(from.x - INGRESS_LANE_X) > 0.35) {
          pts.push(new THREE.Vector3(INGRESS_LANE_X, 0, Math.min(from.z, goal.z)));
        }
        pts.push(goal.clone());
        return pts;
      }

      if (kind === 'car_selfie') {
        if (from.z < -6.1) {
          pts.push(new THREE.Vector3(doorX, 0, -7.35));
          pts.push(new THREE.Vector3(doorX, 0, -4.95));
        } else if (from.x < -0.25 && from.z > -3.8) {
          pts.push(new THREE.Vector3(EGRESS_LANE_X, 0, from.z));
          pts.push(new THREE.Vector3(EGRESS_LANE_X, 0, -3.25));
        }
        pts.push(goal.clone());
        return pts;
      }

      if (kind === 'seat') {
        if (from.z < -6.1) {
          pts.push(new THREE.Vector3(doorX, 0, -7.35));
          pts.push(new THREE.Vector3(doorX, 0, -4.95));
        }
        if (from.x < EGRESS_LANE_X - 0.15) {
          pts.push(new THREE.Vector3(EGRESS_LANE_X, 0, from.z));
        }
        if (goal.z < -3.8) {
          pts.push(new THREE.Vector3(EGRESS_LANE_X, 0, corridorZ));
          pts.push(new THREE.Vector3(1.45, 0, corridorZ));
          pts.push(new THREE.Vector3(1.45, 0, centerAisleZ));
          pts.push(new THREE.Vector3(goal.x, 0, centerAisleZ));
        } else {
          pts.push(new THREE.Vector3(EGRESS_LANE_X, 0, corridorZ));
          pts.push(new THREE.Vector3(goal.x, 0, corridorZ));
        }
        pts.push(goal.clone());
        return pts;
      }

      // Exit (Takeout / Delivery Rider / Expired Walkout / Finished Dine-In)
      if (from.z > -4.6) {
        if (from.x < EGRESS_LANE_X - 0.15) {
          pts.push(new THREE.Vector3(EGRESS_LANE_X, 0, from.z));
        }
        pts.push(new THREE.Vector3(EGRESS_LANE_X, 0, -4.65));
      }
      pts.push(new THREE.Vector3(-0.45, 0, -4.75));
      pts.push(new THREE.Vector3(doorX, 0, -5.05));
      pts.push(new THREE.Vector3(doorX, 0, -7.45));
      pts.push(goal.clone());
      return pts;
    };

    let orderQueueIdx = 0;
    this.gameState.customers.forEach((cust) => {
      const actor = this.customerActors.get(cust.id);
      if (!actor) return;

      // Phase 1.2 & 7: Delivery Rider seated on assigned 3D Delivery Scooter during Arrival / Departure!
      const scooter =
        this.deliveryScooters.find((s) => s.customerId === cust.id) || null;
      if (scooter && (scooter.phase === 'arriving' || scooter.phase === 'departing')) {
        actor.currentPos.set(scooter.x + 0.12, 0.24, -7.65);
        actor.group.position.copy(actor.currentPos);
        actor.group.rotation.y = -Math.PI / 2;
        actor.pelvisGroup.position.y = 0.44;
        actor.leftHipJoint.rotation.x = -1.15;
        actor.rightHipJoint.rotation.x = -1.15;
        actor.leftKneeJoint.rotation.x = 1.15;
        actor.rightKneeJoint.rotation.x = 1.15;
        actor.leftShoulderJoint.rotation.x = -0.78;
        actor.rightShoulderJoint.rotation.x = -0.78;
        actor.leftElbowJoint.rotation.x = -0.35;
        actor.rightElbowJoint.rotation.x = -0.35;
        actor.heldCup.visible = false;
        actor.heldPastryGroup.visible = false;
        actor.umbrellaGroup.visible = false;
        actor.activitySprite.visible = false;
        return;
      }
      if (scooter && scooter.phase === 'stowing') {
        actor.currentPos.set(scooter.parkX, 0, -7.25);
        actor.group.position.copy(actor.currentPos);
        actor.group.rotation.y = Math.PI;
        actor.pelvisGroup.position.y = 0.58;
        actor.leftHipJoint.rotation.x = 0;
        actor.rightHipJoint.rotation.x = 0;
        actor.leftKneeJoint.rotation.x = 0;
        actor.rightKneeJoint.rotation.x = 0;
        actor.leftShoulderJoint.rotation.x = -1.05;
        actor.rightShoulderJoint.rotation.x = -1.05;
        actor.heldCup.visible = scooter.stowTimer < 0.28;
        actor.heldPastryGroup.visible = scooter.stowTimer < 0.28 && Boolean(cust.requestedPastry);
        actor.umbrellaGroup.visible = false;
        actor.activitySprite.visible = false;
        return;
      }

      // Phase 1.1 Smooth Dine-In Customer Stand-Up & Walk-Out (LEAVING_TABLE -> 0.35s ease-out stand-up -> chair clearance -> doorway!)
      if (
        cust.state === 'departing' &&
        actor.seatedBlend > 0.15 &&
        actor.moveState !== 'leaving_table'
      ) {
        actor.moveState = 'leaving_table';
        actor.standUpTimer = 0;
        actor.seatExitOrigin = actor.currentPos.clone();
        actor.waypoints = [];
        actor.finalGoalKey = '';
      }

      if (actor.moveState === 'leaving_table') {
        actor.standUpTimer += dt;
        const u = Math.min(1, actor.standUpTimer / 0.35);
        const easedOut = 1 - Math.pow(1 - u, 3);
        const sb = Math.max(0, 1 - easedOut);
        actor.seatedBlend = sb;
        actor.walkBlend = 0;
        actor.phoneMesh.visible = false;
        actor.activitySprite.visible = false;
        actor.pelvisGroup.position.y = THREE.MathUtils.lerp(0.58, 0.44, sb);
        actor.pelvisGroup.rotation.z = 0;
        actor.torsoGroup.rotation.x = Math.sin(u * Math.PI) * 0.16;
        actor.torsoGroup.rotation.y = 0;
        actor.torsoGroup.rotation.z = 0;
        actor.leftHipJoint.rotation.x = -1.32 * sb;
        actor.rightHipJoint.rotation.x = -1.32 * sb;
        actor.leftKneeJoint.rotation.x = 1.32 * sb;
        actor.rightKneeJoint.rotation.x = 1.32 * sb;
        actor.leftShoulderJoint.rotation.x = -0.35 * sb;
        actor.rightShoulderJoint.rotation.x = actor.heldCup.visible ? -0.56 : -0.35 * sb;
        actor.rightElbowJoint.rotation.x = actor.heldCup.visible ? -0.88 : -0.45 * sb;
        actor.group.position.copy(actor.currentPos);
        if (u >= 1) {
          actor.seatedBlend = 0;
          actor.torsoGroup.rotation.x = 0;
          actor.moveState = 'walking';
          actor.finalGoalKey = '';
        }
        return;
      }

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
        _targetPos.set(-1.18, 0, -0.82);
        targetFacing = 0;
        actor.heldCup.visible = (this.stepAnim?.progress || 0) >= 0.55;
        actor.heldPastryGroup.visible =
          (this.stepAnim?.progress || 0) >= 0.55 && Boolean(cust.requestedPastry);
      } else if (cust.state === 'ordering') {
        goalKind = 'queue';
        goalKey = `queue-${orderQueueIdx}`;
        _targetPos.set(INGRESS_LANE_X, 0, -1.45 - orderQueueIdx * 1.0);
        targetFacing = 0;
        orderQueueIdx++;
      } else if (cust.state === 'seated' && cust.socialBehavior === 'car_selfie') {
        goalKind = 'car_selfie';
        goalKey = 'car_selfie';
        _targetPos.set(-1.75, 0, -3.25);
        targetFacing = -1.15;
        actor.heldCup.visible = true;
        actor.heldPastryGroup.visible = Boolean(cust.requestedPastry);
      } else if (cust.state === 'seated' && cust.seatIndex !== null) {
        goalKind = 'seat';
        const seatIdx = cust.seatIndex % LOUNGE_SEAT_COORDS.length;
        const seat = LOUNGE_SEAT_COORDS[seatIdx] || LOUNGE_SEAT_COORDS[0];
        goalKey = `seat-${seatIdx}`;
        _targetPos.set(seat.x, 0, seat.z);
        targetFacing = seat.facingRotY;
        actor.heldCup.visible = true;
        actor.heldPastryGroup.visible = Boolean(cust.requestedPastry);
      } else {
        // Departing (Delivery Rider returns to assigned parked scooter at (parkX, -7.25); others exit along sidewalk)
        goalKind = 'exit';
        if (actor.isDeliveryRider && scooter && scooter.phase === 'parked') {
          goalKey = `exit-scooter-${scooter.slotIndex}`;
          _targetPos.set(scooter.parkX, 0, -7.25);
          targetFacing = Math.PI;
          actor.heldCup.visible = !cust.expired;
          actor.heldPastryGroup.visible = !cust.expired && Boolean(cust.requestedPastry);
        } else {
          const exitDir = actor.seed % 2 === 0 ? -1 : 1;
          goalKey = `exit-${exitDir}`;
          _targetPos.set(exitDir * 9.2, 0, -8.15);
          targetFacing = exitDir === 1 ? Math.PI / 2 : -Math.PI / 2;
          actor.heldCup.visible = !cust.expired;
          actor.heldPastryGroup.visible = !cust.expired && Boolean(cust.requestedPastry);
        }
      }

      if ((cust.expired || cust.moodExpired) && cust.state === 'departing') {
        actor.activitySprite.visible = true;
        if (actor.lastActivityLabel !== 'LEFT X') {
          actor.lastActivityLabel = 'LEFT X';
          this.drawCustomerActivityBadge(actor.activityTexture, 'LEFT X');
        }
      } else if (cust.state === 'ordering' && !cust.orderAccepted) {
        actor.activitySprite.visible = true;
        const badgeLabel = cust.isDeliveryRider ? 'DELIVERY !' : 'ORDER !';
        if (actor.lastActivityLabel !== badgeLabel) {
          actor.lastActivityLabel = badgeLabel;
          this.drawCustomerActivityBadge(actor.activityTexture, badgeLabel);
        }
      } else if (cust.state === 'ordering' && cust.orderAccepted) {
        actor.activitySprite.visible = false;
      }

      // Recompute smooth aisle waypoints whenever destination key changes
      if (actor.finalGoalKey !== goalKey) {
        actor.finalGoalKey = goalKey;
        const baseWaypoints = buildAisleWaypoints(actor.currentPos, _targetPos, goalKind);
        // Phase 1.1: If exiting from a dining seat, prepend a local chair-clearance waypoint away from the table center!
        if (goalKind === 'exit' && actor.seatExitOrigin) {
          let nearestTable = LOUNGE_TABLE_LAYOUT[0];
          let minD = Infinity;
          for (const tbl of LOUNGE_TABLE_LAYOUT) {
            const d = Math.hypot(actor.seatExitOrigin.x - tbl.x, actor.seatExitOrigin.z - tbl.z);
            if (d < minD) {
              minD = d;
              nearestTable = tbl;
            }
          }
          const outX = actor.seatExitOrigin.x - nearestTable.x;
          const outZ = actor.seatExitOrigin.z - nearestTable.z;
          const len = Math.max(0.01, Math.hypot(outX, outZ));
          const clearanceWp = new THREE.Vector3(
            actor.seatExitOrigin.x + (outX / len) * 0.42,
            0,
            actor.seatExitOrigin.z + (outZ / len) * 0.42
          );
          baseWaypoints.unshift(clearanceWp);
          actor.seatExitOrigin = null;
        }
        actor.waypoints = baseWaypoints;
        if (actor.moveState === 'idle-queue' && _targetPos.distanceTo(actor.currentPos) > 0.22) {
          actor.moveState = 'walking';
        }
      }

      actor.lastPos.copy(actor.currentPos);
      let remainingDistToFinal = _targetPos.distanceTo(actor.currentPos);

      // Delivery Rider arrives back at assigned parked scooter -> trigger 0.6s Top-Box Lid Stow!
      if (
        actor.isDeliveryRider &&
        cust.state === 'departing' &&
        scooter &&
        scooter.phase === 'parked' &&
        remainingDistToFinal < 0.35
      ) {
        scooter.phase = 'stowing';
        scooter.stowTimer = 0;
        return;
      }

      // Signal fair order-timer start + Active Cat Greeting turning head toward patron!
      if (
        goalKind === 'queue' &&
        !actor.counterArrivedSignaled &&
        remainingDistToFinal < 0.35 &&
        actor.currentPos.z > -4.65
      ) {
        actor.counterArrivedSignaled = true;
        this.callbacks.onCustomerReachedCounter?.(cust.id);
        this.triggerChampyGreeting(actor.currentPos);
      }

      // Phase 1 Hysteresis: Once settled at a queue slot (< 0.08m), stay completely calm until slot moves > 0.22m!
      if (goalKind === 'queue' && !isPickingUpDrink) {
        if (actor.moveState === 'idle-queue') {
          if (remainingDistToFinal > 0.22) {
            actor.moveState = 'walking';
          }
        } else if (remainingDistToFinal < 0.08 && actor.waypoints.length <= 1) {
          actor.currentPos.copy(_targetPos);
          actor.waypoints = [];
          actor.moveState = 'idle-queue';
          remainingDistToFinal = 0;
        }
      } else if (actor.moveState === 'idle-queue') {
        actor.moveState = 'walking';
      }

      // Phase 1 Strict FIFO Doorway Airlock Check
      let isYieldingAtDoor = false;
      if (actor.moveState !== 'idle-queue' && actor.waypoints.length > 0 && !isPickingUpDrink) {
        const nextWp = actor.waypoints[0];
        const wantsAirlock =
          isInsideAirlock(actor.currentPos) ||
          isInsideAirlock(nextWp) ||
          (actor.currentPos.z < -6.2 && nextWp.z > -6.3) ||
          (actor.currentPos.z > -6.2 && nextWp.z < -6.1);

        if (wantsAirlock) {
          if (this.activeDoorCrossId === cust.id) {
            // Active holder proceeds uninterrupted!
          } else if (!this.activeDoorCrossId) {
            this.activeDoorCrossId = cust.id;
            this.activeDoorCrossTimer = 0;
          } else {
            // Queue cleanly in FIFO doorwayQueue and pause at Exterior Hold (-1.65, -7.75) or Interior Hold (-0.45, -4.75)
            if (!this.doorwayQueue.includes(cust.id)) {
              this.doorwayQueue.push(cust.id);
            }
            const atExteriorHold = actor.currentPos.z <= -7.1 && actor.currentPos.z > -8.35;
            const atInteriorHold = actor.currentPos.z >= -5.25 && actor.currentPos.z < -4.2;
            if (atExteriorHold || atInteriorHold) {
              isYieldingAtDoor = true;
              actor.moveState = 'yielding-door';
              targetFacing = actor.currentPos.z <= -6.2 ? 0 : Math.PI;
            }
          }
        }
      }

      if (!isYieldingAtDoor && actor.moveState === 'yielding-door') {
        actor.moveState = 'walking';
      }

      // Advance along active waypoint queue at natural bipedal walking speed
      const walkSpeed = isPickingUpDrink ? 2.15 : cust.expired ? 1.85 : 1.65;
      let moveDx = 0;
      let moveDz = 0;

      if (actor.moveState === 'walking' && actor.waypoints.length > 0) {
        const nextWp = actor.waypoints[0];
        const wDx = nextWp.x - actor.currentPos.x;
        const wDz = nextWp.z - actor.currentPos.z;
        const wDist = Math.hypot(wDx, wDz);

        if (wDist <= 0.14 && actor.waypoints.length > 1) {
          actor.waypoints.shift();
        } else if (wDist > 0.03) {
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

      // Phase 1 Stuck-Detector Watchdog: if walking actor moves < 0.10m over 1.0s, activate ghostPassTimer = 1.1s!
      if (actor.ghostPassTimer > 0) {
        actor.ghostPassTimer = Math.max(0, actor.ghostPassTimer - dt);
      }
      if (actor.moveState === 'walking' && remainingDistToFinal > 0.25) {
        actor.stuckTimer += dt;
        if (actor.stuckTimer >= 1.0) {
          const netMoved = actor.currentPos.distanceTo(actor.stuckAnchorPos);
          if (netMoved < 0.1) {
            actor.ghostPassTimer = 1.1;
          }
          actor.stuckAnchorPos.copy(actor.currentPos);
          actor.stuckTimer = 0;
        }
      } else {
        actor.stuckTimer = 0;
        actor.stuckAnchorPos.copy(actor.currentPos);
      }

      // Collision-Layer Filtered Avoidance:
      // Departing/seated patrons NEVER bounce against 'idle-queue' patrons; ghostPassTimer bypasses inter-actor repulsion!
      const inDoorCorridor = isInsideAirlock(actor.currentPos);
      const shouldApplyAvoidance =
        actor.moveState === 'walking' &&
        remainingDistToFinal > 0.25 &&
        !isPickingUpDrink &&
        !inDoorCorridor &&
        actor.ghostPassTimer <= 0;

      if (shouldApplyAvoidance) {
        const actorRadius = 0.28;
        for (let ci = 0; ci < this.staticColliders.length; ci++) {
          const col = this.staticColliders[ci];
          const dx = actor.currentPos.x - col.x;
          const dz = actor.currentPos.z - col.z;
          const minR = col.radius + actorRadius;
          const distSq = dx * dx + dz * dz;
          if (distSq < minR * minR && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const push = (minR - dist) * 0.42;
            actor.currentPos.x += (dx / dist) * push;
            actor.currentPos.z += (dz / dist) * push;
          }
        }
        const isDepartingOrSeated = cust.state !== 'ordering';
        for (const [otherId, otherActor] of this.customerActors.entries()) {
          if (otherId === cust.id) continue;
          if (otherActor.moveState === 'yielding-door') continue;
          // Never push departing/served patrons back into the ordering queue column!
          if (isDepartingOrSeated && otherActor.moveState === 'idle-queue') continue;
          const dx = actor.currentPos.x - otherActor.currentPos.x;
          const dz = actor.currentPos.z - otherActor.currentPos.z;
          const minSep = 0.56;
          const distSq = dx * dx + dz * dz;
          if (distSq < minSep * minSep && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const push = (minSep - dist) * 0.25;
            actor.currentPos.x += (dx / dist) * push;
            actor.currentPos.z += (dz / dist) * push;
          }
        }
      }

      actor.group.position.copy(actor.currentPos);

      // Compute true linear ground speed for zero-skate speed-synchronized stride
      const frameDisp = Math.hypot(
        actor.currentPos.x - actor.lastPos.x,
        actor.currentPos.z - actor.lastPos.z
      );
      const actualSpeed = dt > 0.0001 ? frameDisp / dt : 0;
      const isActivelyWalking =
        actor.moveState === 'walking' && actualSpeed > 0.14 && remainingDistToFinal > 0.05;

      const walkBlendTarget = isActivelyWalking ? Math.min(1, actualSpeed / 1.35) : 0;
      actor.walkBlend += (walkBlendTarget - actor.walkBlend) * (1 - Math.exp(-10 * dt));

      const isArrivedSeated =
        !isActivelyWalking &&
        cust.state === 'seated' &&
        cust.socialBehavior !== 'car_selfie' &&
        !isPickingUpDrink &&
        remainingDistToFinal <= 0.14;
      const seatedTarget = isArrivedSeated ? 1 : 0;
      actor.seatedBlend += (seatedTarget - actor.seatedBlend) * (1 - Math.exp(-7 * dt));

      // Clamped yaw turn rate + planar speed threshold (> 0.22 m/s) eliminates 180-deg facing flips!
      const maxYawStep = dt * 7.5;
      if (isActivelyWalking && actualSpeed > 0.22 && Math.hypot(moveDx, moveDz) > 0.04) {
        actor.walkPhase += actualSpeed * dt * 5.2;
        const moveHeading = Math.atan2(moveDx, moveDz);
        actor.facingAngle = clampTurnToward(
          actor.facingAngle,
          moveHeading,
          1 - Math.exp(-9 * dt),
          maxYawStep
        );
      } else {
        actor.facingAngle = clampTurnToward(
          actor.facingAngle,
          targetFacing,
          1 - Math.exp(-7 * dt),
          maxYawStep
        );
      }
      actor.group.rotation.y = actor.facingAngle;

      // Periodic Eye Blinking
      const blinkCycle = (this.elapsed + actor.seed * 0.37) % 3.6;
      const eyeScaleY = blinkCycle < 0.12 ? 0.1 : 1.0;
      actor.leftEyeMesh.scale.y = eyeScaleY;
      actor.rightEyeMesh.scale.y = eyeScaleY;

      // Phase 6 & 7: Customer Rainy-Day 3D Umbrella — open outdoors (z < -6.25), NEVER on Delivery Riders (they wear helmet + weather jacket!)
      const customerNeedsUmbrella =
        isRainActive && actor.currentPos.z < -6.25 && !actor.isDeliveryRider;
      actor.umbrellaGroup.visible = customerNeedsUmbrella;

      if (isPickingUpDrink && remainingDistToFinal <= 0.18) {
        // Stage 2 Customer Pickup Pose at counter: both articulated arms reach forward to lift the cup & pastry!
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
      } else if (actor.walkBlend > 0.14) {
        // Speed-Synchronized Fluid Bipedal Walk Cycle + Two-Handed Carry (Coffee Right Hand + Pastry Plate/Bag Left Hand!)
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

        if (customerNeedsUmbrella) {
          actor.leftShoulderJoint.rotation.x = -1.28 + Math.abs(s) * 0.03 * wb;
          actor.leftElbowJoint.rotation.x = -0.3;
        } else if (actor.heldPastryGroup.visible) {
          if (actor.heldPastryPlateGroup.visible) {
            // Level tray/plate carry pose on left forearm
            actor.leftShoulderJoint.rotation.x = -0.82 + Math.abs(s) * 0.03 * wb;
            actor.leftElbowJoint.rotation.x = -0.72;
          } else {
            // Relaxed Kraft Paper Bag carry pose on left hand
            actor.leftShoulderJoint.rotation.x = -0.42 + Math.abs(s) * 0.04 * wb;
            actor.leftElbowJoint.rotation.x = -0.48;
          }
        } else {
          actor.leftShoulderJoint.rotation.x = -s * 0.4 * wb;
          actor.leftElbowJoint.rotation.x = -0.22 - Math.max(0, -s) * 0.25 * wb;
        }
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
        // Phase 1 Calm Anti-Jitter Standing Idle Pose (Zero Leg Jitter, Zero Heading Shake!)
        const idlePhase = this.elapsed * 1.15 + actor.seed;
        const gentleBreath = Math.sin(idlePhase * 1.4);
        actor.pelvisGroup.position.y = 0.58 + gentleBreath * 0.004;
        actor.pelvisGroup.rotation.z = 0;
        actor.torsoGroup.rotation.y = 0;
        actor.torsoGroup.rotation.z = 0;
        actor.leftHipJoint.rotation.x = 0;
        actor.rightHipJoint.rotation.x = 0;
        actor.leftKneeJoint.rotation.x = 0;
        actor.rightKneeJoint.rotation.x = 0;

        if (customerNeedsUmbrella) {
          // Yielding calmly outside in the rain while holding umbrella steady
          actor.phoneMesh.visible = false;
          actor.leftShoulderJoint.rotation.x = -1.28;
          actor.leftElbowJoint.rotation.x = -0.3;
          actor.rightShoulderJoint.rotation.x = actor.heldCup.visible ? -0.56 : -0.18;
          actor.rightElbowJoint.rotation.x = actor.heldCup.visible ? -0.88 : -0.3;
          actor.neckJoint.rotation.y = Math.sin(idlePhase * 0.6) * 0.16;
          actor.neckJoint.rotation.x = 0;
        } else {
          const idleMode = (Math.floor(this.elapsed * 0.18) + actor.seed) % 3;
          if (idleMode === 0) {
            actor.phoneMesh.visible = actor.seed % 2 === 0;
            actor.leftShoulderJoint.rotation.x = -0.62;
            actor.leftElbowJoint.rotation.x = -0.9;
            actor.rightShoulderJoint.rotation.x = -0.18;
            actor.rightElbowJoint.rotation.x = -0.32;
            actor.neckJoint.rotation.x = 0.18;
            actor.neckJoint.rotation.y = -0.08;
          } else if (idleMode === 1) {
            actor.phoneMesh.visible = false;
            actor.leftShoulderJoint.rotation.x = -0.18;
            actor.leftElbowJoint.rotation.x = -0.34;
            actor.rightShoulderJoint.rotation.x = -0.18;
            actor.rightElbowJoint.rotation.x = -0.34;
            actor.neckJoint.rotation.y = Math.sin(idlePhase * 0.75) * 0.32;
            actor.neckJoint.rotation.x = -0.08 * Math.cos(idlePhase * 0.55);
          } else {
            actor.phoneMesh.visible = false;
            actor.leftShoulderJoint.rotation.x = -0.2;
            actor.leftElbowJoint.rotation.x = -0.38;
            actor.rightShoulderJoint.rotation.x = -0.54 + Math.sin(this.elapsed * 2.4) * 0.05;
            actor.rightElbowJoint.rotation.x = -0.74;
            actor.neckJoint.rotation.y = Math.sin(idlePhase * 0.8) * 0.14;
            actor.neckJoint.rotation.x = 0;
          }
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
    this.cupMedallionTexture?.dispose();
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
    this.miataLicenseTexture?.dispose();
    this.posScreenTexture?.dispose();
    this.roadAsphaltTexture?.dispose();
    this.windowRainTexture?.dispose();
    this.ticketTextures.forEach((t) => t.dispose());
    this.ticketGlowMats.forEach((m) => m.dispose());
    this.serveReadyHaloMat?.dispose();
    this.pastryCaseHaloMats.forEach((m) => m.dispose());
    this.disposeAllDeliveryScooters();
    this.counterAudioProps?.dispose();
    if (this.champyRig) {
      this.champyRig.cosmeticsController.dispose();
      this.champyRig.heartTexture.dispose();
      this.champyRig.zzzTexture.dispose();
      this.champyRig.sparkleTexture.dispose();
      this.champyRig.nameplateTexture.dispose();
      this.champyRig.coatTextures.forEach((t) => t.dispose());
    }
    this.pedestrianPool.forEach((p) => p.actor.activityTexture.dispose());
    this.streetLampConeMat?.dispose();
    this.streetLampPoolMat?.dispose();
    this.cityWindowWarmMat?.dispose();
    this.cityWindowCoolMat?.dispose();
    this.citySignEmissiveMat?.dispose();
    this.vehicleHeadlightBeamMat?.dispose();
    this.cupLiquidShaderMat?.dispose();
    this.skyDomeMat?.dispose();
    this.godRayMat?.dispose();
    this.gpuRainMat?.dispose();
    this.sceneryManager?.dispose();
    this.thumbnailStudio?.dispose();
    if (this.snowPoints) {
      this.snowPoints.geometry.dispose();
      (this.snowPoints.material as THREE.Material).dispose();
    }
    if (this.secretPasserby) {
      this.scene.remove(this.secretPasserby.actor.group);
      this.secretPasserby.actor.activityTexture.dispose();
      this.secretPasserby = null;
    }
    this.floatingSecretHearts.forEach((h) => {
      this.scene.remove(h.sprite);
      h.sprite.material.dispose();
    });
    this.floatingSecretHearts = [];
    this.renderer.dispose();
  }
}

