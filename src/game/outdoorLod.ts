// Pure Inside/Outside Adaptive Performance LOD, Biome Prop Classification,
// Strict Two-Lane Opposing Traffic Spacing, and Outdoor-Only Ambient NPC Behaviors.
// Zero Three.js or DOM imports so unit tests run directly in node:test.

import type { GraphicsQuality } from './rules';
import type { SceneryId } from './sceneryData';

export type OutdoorNpcBehavior =
  | 'plain_stroll'
  | 'coffee_stroll'
  | 'dog_walker'
  | 'phone_browse'
  | 'phone_call'
  | 'jogger'
  | 'tourist_photo'
  | 'everest_hiker'
  | 'lantern_stroll'
  | 'neon_umbrella'
  | 'favela_football'
  | 'favela_tiktok_dance'
  | 'ridge_gaze';

export interface OutdoorLodBudgets {
  isPlayerOutside: boolean;
  maxTraffic: number;
  maxPedestrians: number;
  showCloudsAndBirds: boolean;
  enableRichNpcBehaviors: boolean;
}

export interface TrafficLaneVehicle {
  x: number;
  dir: 1 | -1;
  speed: number;
  visible: boolean;
}

export const TRAFFIC_MIN_LANE_SPACING = 11.5;
export const TRAFFIC_X_BOUND = 44.0;
export const PEDESTRIAN_CORNER_BOUND = 35.5;
export const T_JUNCTION_CENTER_X = 33.8;
export const T_JUNCTION_CROSS_WIDTH = 7.8;
/** Strict outer curb edge of the perpendicular cross-street where main street asphalt MUST terminate. */
export const T_JUNCTION_OUTER_EDGE = T_JUNCTION_CENTER_X + T_JUNCTION_CROSS_WIDTH * 0.5; // 37.7
/** Continuous far-side sidewalk width between T-junction outer curb and end-of-road building wall (>= 2.6). */
export const T_JUNCTION_FAR_SIDEWALK_WIDTH = 4.2;
export const T_JUNCTION_BUILDING_FRONT_X = T_JUNCTION_OUTER_EDGE + T_JUNCTION_FAR_SIDEWALK_WIDTH; // 41.9

export type DoorwayStyle = 'hinged_shop' | 'cyber_split_slide' | 'kyoto_machiya_slide';

export type DoorwayAnimationState =
  | 'IdleClosed'
  | 'OpeningForExit'
  | 'NpcExiting'
  | 'ClosingAfterExit'
  | 'OpeningForEntry'
  | 'NpcEntering'
  | 'ClosingAfterEntry';

export function easeInOutCubic(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Verifies that vehicles turning via `evaluateCornerTurnPath(u, laneZ, dir, turnStartX, turnRadius, sign)`
 * remain centered inside the perpendicular cross-street with at least `minClearance` units from the
 * far-side T-junction curb at `|x| = T_JUNCTION_OUTER_EDGE`.
 */
export function hasCornerTurnCurbClearance(
  turnStartX: number,
  turnRadius: number,
  vehicleHalfWidth = 0.9,
  minClearance = 0.6
): boolean {
  const outerVehicleEdgeX = turnStartX + Math.max(0.5, turnRadius) + vehicleHalfWidth;
  return T_JUNCTION_OUTER_EDGE - outerVehicleEdgeX >= minClearance;
}

export interface CornerTurnPose {
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Three.js Y-rotation for vehicles whose local forward is +X */
  vehicleYaw: number;
  /** Three.js Y-rotation for pedestrians whose local forward is +Z */
  pedestrianYaw: number;
  /** True when the actor has turned onto the perpendicular cross-street past the corner */
  isOnCrossStreet: boolean;
}

/**
 * Evaluates a C1-continuous road/sidewalk trajectory that runs straight along
 * `x = u` inside `|u| <= turnStartX`, curves smoothly 90° around a quarter-circle
 * of radius `turnRadius` at both `-X` and `+X` intersections, and continues along
 * the perpendicular cross-street behind corner buildings so actors never bubble-pop
 * in plain view.
 */
export function evaluateCornerTurnPath(
  u: number,
  laneZ: number,
  dir: 1 | -1,
  turnStartX: number,
  turnRadius: number,
  turnOutZSign: 1 | -1
): CornerTurnPose {
  const safeRadius = Math.max(0.5, turnRadius);
  const arcLen = (Math.PI * 0.5) * safeRadius;

  let x = u;
  let z = laneZ;
  let dxdU = 1;
  let dzdU = 0;
  let isOnCrossStreet = false;

  if (u > turnStartX) {
    const s = u - turnStartX;
    if (s <= arcLen) {
      const theta = s / safeRadius;
      x = turnStartX + Math.sin(theta) * safeRadius;
      z = laneZ + turnOutZSign * safeRadius * (1 - Math.cos(theta));
      dxdU = Math.cos(theta);
      dzdU = turnOutZSign * Math.sin(theta);
    } else {
      const extra = s - arcLen;
      x = turnStartX + safeRadius;
      z = laneZ + turnOutZSign * (safeRadius + extra);
      dxdU = 0;
      dzdU = turnOutZSign;
      isOnCrossStreet = true;
    }
  } else if (u < -turnStartX) {
    const s = -turnStartX - u;
    if (s <= arcLen) {
      const theta = s / safeRadius;
      x = -turnStartX - Math.sin(theta) * safeRadius;
      z = laneZ + turnOutZSign * safeRadius * (1 - Math.cos(theta));
      dxdU = Math.cos(theta);
      dzdU = -turnOutZSign * Math.sin(theta);
    } else {
      const extra = s - arcLen;
      x = -turnStartX - safeRadius;
      z = laneZ + turnOutZSign * (safeRadius + extra);
      dxdU = 0;
      dzdU = -turnOutZSign;
      isOnCrossStreet = true;
    }
  }

  const vx = dxdU * dir;
  const vz = dzdU * dir;
  return {
    x,
    z,
    vx,
    vz,
    vehicleYaw: Math.atan2(-vz, vx),
    pedestrianYaw: Math.atan2(vx, vz),
    isOnCrossStreet,
  };
}

export type SceneryRoadTopology = 't_road' | 'downhill_t_road' | 'l_junction';

/**
 * Standardized road junction topology across all 9 sceneries:
 * - T-Road Intersections: Busy Street, Japanese Tranquility, Brazilian Favela, Cyberpunk Neon
 * - Special Downhill T-Road: Eiffel Tower View (slopes smoothly downhill toward Paris vista)
 * - L-Junction Only (zero road cutting toward overlook): Mayon, Hilltop, Switzerland, Mt. Everest
 */
export function getSceneryRoadTopology(sceneryId: SceneryId): SceneryRoadTopology {
  switch (sceneryId) {
    case 'busy_street':
    case 'japanese_tranquility':
    case 'brazilian_favela':
    case 'cyberpunk_neon':
      return 't_road';
    case 'eiffel_tower':
      return 'downhill_t_road';
    case 'mayon_volcano':
    case 'hilltop_city_lights':
    case 'switzerland_hilltop':
    case 'mt_everest':
      return 'l_junction';
  }
}

/**
 * Returns the perpendicular turn direction (+1 = away from vista behind cafe flanks,
 * -1 = toward the far cross-street / downhill Montmartre ramp) for a given scenery & lane.
 * L-junction overlook maps ALWAYS bend strictly backward (+1) so zero traffic/walkers cut into the vista.
 */
export function getJunctionTurnOutZSign(sceneryId: SceneryId, laneZ: number): 1 | -1 {
  const topo = getSceneryRoadTopology(sceneryId);
  if (topo === 'l_junction') return 1;
  return laneZ > -12.4 ? 1 : -1;
}

export interface SlopedRoadPose {
  y: number;
  /** Forward nose pitch in radians (positive = nose up, negative = nose down along travel direction). */
  pitch: number;
  isOnDownhillBranch: boolean;
}

export const EIFFEL_DOWNHILL_START_Z = -15.9;
export const EIFFEL_DOWNHILL_EASE_LEN = 3.0;
export const EIFFEL_DOWNHILL_GRADE = 0.36; // Smooth 20° Montmartre descent matching sloped ramp mesh

/**
 * Computes exact road surface height and forward pitch for Eiffel Tower View's downhill T-road branch.
 * Main flat street (z >= -15.9) stays at y = 0, pitch = 0; far branch (z < -15.9) eases smoothly
 * downhill with C1 continuity so vehicle tires hug the asphalt with zero floating.
 */
export function getEiffelRoadPose(
  z: number,
  vx: number,
  vz: number
): SlopedRoadPose {
  if (z >= EIFFEL_DOWNHILL_START_Z) {
    return { y: 0, pitch: 0, isOnDownhillBranch: false };
  }
  const dist = EIFFEL_DOWNHILL_START_Z - z;
  let y: number;
  let dydDist: number;
  if (dist < EIFFEL_DOWNHILL_EASE_LEN) {
    // Smooth quadratic crest transition: y(0) = 0, dy/ddist(0) = 0, dy/ddist(easeLen) = -grade
    const u = dist / EIFFEL_DOWNHILL_EASE_LEN;
    y = -0.5 * EIFFEL_DOWNHILL_GRADE * EIFFEL_DOWNHILL_EASE_LEN * u * u;
    dydDist = -EIFFEL_DOWNHILL_GRADE * u;
  } else {
    const easeDrop = 0.5 * EIFFEL_DOWNHILL_GRADE * EIFFEL_DOWNHILL_EASE_LEN;
    y = -easeDrop - (dist - EIFFEL_DOWNHILL_EASE_LEN) * EIFFEL_DOWNHILL_GRADE;
    dydDist = -EIFFEL_DOWNHILL_GRADE;
  }
  // Since dist = startZ - z, dy/dz = -dydDist. Along travel unit vector (vx, vz):
  const horizSpeed = Math.hypot(vx, vz) || 1;
  const dzds = vz / horizSpeed;
  const dyds = -dydDist * dzds;
  return {
    y,
    pitch: Math.atan2(dyds, 1),
    isOnDownhillBranch: true,
  };
}

export interface AerialTurnPose extends CornerTurnPose {
  y: number;
  /** Banking roll angle in radians during the 90-degree sky-canyon turn. */
  bankRoll: number;
}

/**
 * Evaluates a smooth 90-degree banking aerial sky-canyon turn for Cyberpunk Neon hover-cars
 * so flying traffic curves behind towering corner skyscrapers instead of vanishing mid-road.
 */
export function evaluateAerialTurnPath(
  u: number,
  laneZ: number,
  baseY: number,
  dir: 1 | -1,
  turnStartX: number,
  turnRadius: number,
  turnOutZSign: 1 | -1
): AerialTurnPose {
  const base = evaluateCornerTurnPath(u, laneZ, dir, turnStartX, turnRadius, turnOutZSign);
  const safeRadius = Math.max(1.0, turnRadius);
  const arcLen = Math.PI * 0.5 * safeRadius;
  let bankRoll = 0;

  if (u > turnStartX) {
    const s = u - turnStartX;
    if (s <= arcLen) {
      const theta = s / safeRadius;
      bankRoll = Math.sin(theta * 2) * 0.28 * turnOutZSign * dir;
    }
  } else if (u < -turnStartX) {
    const s = -turnStartX - u;
    if (s <= arcLen) {
      const theta = s / safeRadius;
      bankRoll = -Math.sin(theta * 2) * 0.28 * turnOutZSign * dir;
    }
  }

  return {
    ...base,
    y: baseY,
    bankRoll,
  };
}

export type StreetlightThemeStyle =
  | 'urban_cobra'
  | 'ph_solar_highway'
  | 'highland_bollard'
  | 'kyoto_andon'
  | 'rio_utility_pole'
  | 'cyber_pylon'
  | 'paris_haussmann'
  | 'swiss_forged_lantern'
  | 'everest_storm_post';

export interface SceneryStreetlightSpec {
  style: StreetlightThemeStyle;
  bilateral: boolean;
  farSideLowOverlookBollards: boolean;
  spacingMode: 'standard' | 'balanced_cozy';
  primaryGlowHex: number;
  secondaryGlowHex: number;
}

/**
 * Returns the thematic streetlight architecture and bilateral placement policy
 * for each of the 9 outdoor sceneries. Elevated cliffside overlooks use low
 * railing/bollard lanterns on the far edge so deep vistas remain unobstructed.
 */
export function getSceneryStreetlightSpec(sceneryId: SceneryId): SceneryStreetlightSpec {
  switch (sceneryId) {
    case 'busy_street':
      return {
        style: 'urban_cobra',
        bilateral: true,
        farSideLowOverlookBollards: false,
        spacingMode: 'standard',
        primaryGlowHex: 0xfde68a,
        secondaryGlowHex: 0xfbbf24,
      };
    case 'mayon_volcano':
      return {
        style: 'ph_solar_highway',
        bilateral: true,
        farSideLowOverlookBollards: false,
        spacingMode: 'standard',
        primaryGlowHex: 0xfffbeb,
        secondaryGlowHex: 0xfde68a,
      };
    case 'hilltop_city_lights':
      return {
        style: 'highland_bollard',
        bilateral: true,
        farSideLowOverlookBollards: true,
        spacingMode: 'standard',
        primaryGlowHex: 0xfbbf24,
        secondaryGlowHex: 0xf59e0b,
      };
    case 'japanese_tranquility':
      return {
        style: 'kyoto_andon',
        bilateral: true,
        farSideLowOverlookBollards: false,
        spacingMode: 'balanced_cozy',
        primaryGlowHex: 0xffedd5,
        secondaryGlowHex: 0xf97316,
      };
    case 'brazilian_favela':
      return {
        style: 'rio_utility_pole',
        bilateral: true,
        farSideLowOverlookBollards: false,
        spacingMode: 'standard',
        primaryGlowHex: 0xfef3c7,
        secondaryGlowHex: 0xf59e0b,
      };
    case 'cyberpunk_neon':
      return {
        style: 'cyber_pylon',
        bilateral: true,
        farSideLowOverlookBollards: false,
        spacingMode: 'standard',
        primaryGlowHex: 0x22d3ee,
        secondaryGlowHex: 0xec4899,
      };
    case 'eiffel_tower':
      return {
        style: 'paris_haussmann',
        bilateral: true,
        farSideLowOverlookBollards: false,
        spacingMode: 'standard',
        primaryGlowHex: 0xfffbeb,
        secondaryGlowHex: 0xfbbf24,
      };
    case 'switzerland_hilltop':
      return {
        style: 'swiss_forged_lantern',
        bilateral: true,
        farSideLowOverlookBollards: true,
        spacingMode: 'standard',
        primaryGlowHex: 0xfef3c7,
        secondaryGlowHex: 0xf59e0b,
      };
    case 'mt_everest':
      return {
        style: 'everest_storm_post',
        bilateral: true,
        farSideLowOverlookBollards: false,
        spacingMode: 'standard',
        primaryGlowHex: 0xffedd5,
        secondaryGlowHex: 0xf97316,
      };
  }
}

/**
 * Strict vertical Y-elevation hierarchy across all 9 sceneries to guarantee zero
 * coplanar z-fighting between terrain, road asphalt, gutters, markings, and sidewalks.
 */
export const ROAD_ELEVATION_LAYERS = {
  outerTerrainY: -0.08,
  asphaltY: 0.0,
  gutterY: 0.012,
  crosswalkY: 0.024,
  natureApronTopY: 0.065,
  sidewalkTopY: 0.09,
  curbTopY: 0.11,
} as const;

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface LeashSegmentTransform {
  midpoint: Vec3Tuple;
  length: number;
  direction: Vec3Tuple; // Unit vector strictly pointing from start (NPC hand) toward end (dog collar)
}

/**
 * Computes exact midpoint, length, and unit direction from `handPos` to `collarPos`
 * so the dog leash always extends cleanly forward & downward from the walker's hand
 * straight to the dog's collar (never reversed diagonally).
 */
export function computeLeashTransform(
  handPos: Vec3Tuple,
  collarPos: Vec3Tuple
): LeashSegmentTransform {
  const dx = collarPos.x - handPos.x;
  const dy = collarPos.y - handPos.y;
  const dz = collarPos.z - handPos.z;
  const length = Math.hypot(dx, dy, dz) || 0.001;
  return {
    midpoint: {
      x: (handPos.x + collarPos.x) * 0.5,
      y: (handPos.y + collarPos.y) * 0.5,
      z: (handPos.z + collarPos.z) * 0.5,
    },
    length,
    direction: {
      x: dx / length,
      y: dy / length,
      z: dz / length,
    },
  };
}

/**
 * Returns true for sceneries that use the urban two-lane asphalt street,
 * zebra crosswalk, and city streetlamps.
 */
export function isUrbanStreetScenery(sceneryId: SceneryId): boolean {
  return (
    sceneryId === 'busy_street' ||
    sceneryId === 'cyberpunk_neon' ||
    sceneryId === 'eiffel_tower' ||
    sceneryId === 'brazilian_favela'
  );
}

/**
 * Returns true for sceneries where animated two-lane street traffic drives and turns on the T-road.
 * Busy Street, Eiffel Tower (downhill T-road), Brazilian Favela, and Cyberpunk Neon (ground + aerial traffic).
 */
export function hasStreetTrafficScenery(sceneryId: SceneryId): boolean {
  return (
    sceneryId === 'busy_street' ||
    sceneryId === 'eiffel_tower' ||
    sceneryId === 'brazilian_favela' ||
    sceneryId === 'cyberpunk_neon'
  );
}

/**
 * Returns true for alpine, volcanic, highland, or ancient quiet-lane sceneries where
 * urban round city trees, crosswalk stripes, and city streetlights must be hidden.
 */
export function isNatureOrHistoricScenery(sceneryId: SceneryId): boolean {
  return !isUrbanStreetScenery(sceneryId);
}

/**
 * Computes mobile-safe GPU/CPU budgets based on whether the player is currently outside
 * (Outdoor Overlook Mode or 3D Title Screen) vs. inside brewing coffee.
 */
export function getOutdoorLodBudgets(params: {
  isPlayerOutside: boolean;
  graphicsQuality: GraphicsQuality;
  isSoftwareGl: boolean;
  sceneryId: SceneryId;
}): OutdoorLodBudgets {
  const { isPlayerOutside, graphicsQuality, isSoftwareGl, sceneryId } = params;
  const allowTraffic = hasStreetTrafficScenery(sceneryId);
  const isLow = isSoftwareGl || graphicsQuality === 'low';
  const isMed = graphicsQuality === 'medium';

  if (!isPlayerOutside) {
    // Balanced window-visible ambient street life indoors (1-2 cars, 2-3 plain-stroll passersby)
    // while keeping heavy outdoorOnlyGroup crowds, doorway loops, sky flocks & rich NPC props culled.
    return {
      isPlayerOutside: false,
      maxTraffic: allowTraffic ? (isLow ? 1 : 2) : 0,
      maxPedestrians: isLow ? 2 : 3,
      showCloudsAndBirds: false,
      enableRichNpcBehaviors: false,
    };
  }

  return {
    isPlayerOutside: true,
    maxTraffic: allowTraffic ? (isLow ? 4 : isMed ? 5 : 6) : 0,
    maxPedestrians: isLow ? 5 : isMed ? 6 : 8,
    showCloudsAndBirds: true,
    enableRichNpcBehaviors: true,
  };
}

/**
 * Advances two-lane directional vehicles while guaranteeing zero overlapping or
 * rear-end clipping by enforcing >= TRAFFIC_MIN_LANE_SPACING per lane.
 */
export function stepTwoLaneTraffic(
  vehicles: readonly TrafficLaneVehicle[],
  dt: number,
  bound: number = TRAFFIC_X_BOUND,
  minSpacing: number = TRAFFIC_MIN_LANE_SPACING
): void {
  const span = bound * 2;
  const dirs: ReadonlyArray<1 | -1> = [1, -1];

  for (const dir of dirs) {
    const lane = vehicles.filter((v) => v.visible && v.dir === dir);
    if (lane.length === 0) continue;

    // Advance each vehicle along its strictly assigned lane direction
    for (const v of lane) {
      v.x += dir * v.speed * dt;
      if (dir === 1 && v.x > bound) v.x -= span;
      else if (dir === -1 && v.x < -bound) v.x += span;
    }

    if (lane.length < 2) continue;

    // Sort from leading-most to trailing-most along travel direction
    lane.sort((a, b) => (dir === 1 ? b.x - a.x : a.x - b.x));

    // Enforce minimum headway between every adjacent pair (including wrap-around pair)
    const maxSafeGap = Math.min(minSpacing, (span / lane.length) * 0.85);
    for (let i = 1; i < lane.length; i++) {
      const ahead = lane[i - 1];
      const behind = lane[i];
      const gap = dir === 1 ? ahead.x - behind.x : behind.x - ahead.x;
      if (gap < maxSafeGap) {
        behind.x = dir === 1 ? ahead.x - maxSafeGap : ahead.x + maxSafeGap;
        if (dir === 1 && behind.x < -bound) behind.x += span;
        else if (dir === -1 && behind.x > bound) behind.x -= span;
      }
    }
  }
}

/**
 * Returns the tailored outdoor-only ambient pedestrian behavior list for each scenery.
 * Only activated when `isPlayerOutside === true`.
 */
export function getSceneryOutdoorBehaviors(
  sceneryId: SceneryId
): readonly OutdoorNpcBehavior[] {
  switch (sceneryId) {
    case 'busy_street':
      return [
        'dog_walker',
        'phone_call',
        'coffee_stroll',
        'phone_browse',
        'jogger',
        'coffee_stroll',
        'phone_call',
        'dog_walker',
      ];
    case 'mayon_volcano':
      return [
        'tourist_photo',
        'coffee_stroll',
        'dog_walker',
        'tourist_photo',
        'phone_browse',
        'coffee_stroll',
        'phone_call',
        'tourist_photo',
      ];
    case 'hilltop_city_lights':
      return [
        'ridge_gaze',
        'coffee_stroll',
        'tourist_photo',
        'phone_browse',
        'dog_walker',
        'ridge_gaze',
        'phone_call',
        'coffee_stroll',
      ];
    case 'japanese_tranquility':
      return [
        'lantern_stroll',
        'coffee_stroll',
        'lantern_stroll',
        'dog_walker',
        'phone_browse',
        'lantern_stroll',
        'coffee_stroll',
        'tourist_photo',
      ];
    case 'brazilian_favela':
      return [
        'favela_tiktok_dance',
        'coffee_stroll',
        'favela_football',
        'phone_call',
        'favela_tiktok_dance',
        'dog_walker',
        'favela_football',
        'jogger',
      ];
    case 'cyberpunk_neon':
      return [
        'neon_umbrella',
        'phone_browse',
        'neon_umbrella',
        'phone_call',
        'coffee_stroll',
        'neon_umbrella',
        'dog_walker',
        'phone_browse',
      ];
    case 'eiffel_tower':
      return [
        'tourist_photo',
        'dog_walker',
        'coffee_stroll',
        'tourist_photo',
        'phone_call',
        'phone_browse',
        'coffee_stroll',
        'tourist_photo',
      ];
    case 'switzerland_hilltop':
      return [
        'tourist_photo',
        'coffee_stroll',
        'dog_walker',
        'tourist_photo',
        'ridge_gaze',
        'phone_browse',
        'coffee_stroll',
        'tourist_photo',
      ];
    case 'mt_everest':
      return [
        'everest_hiker',
        'everest_hiker',
        'tourist_photo',
        'everest_hiker',
        'coffee_stroll',
        'everest_hiker',
        'phone_browse',
        'everest_hiker',
      ];
    default:
      return [
        'dog_walker',
        'phone_browse',
        'coffee_stroll',
        'phone_call',
        'jogger',
        'coffee_stroll',
        'phone_browse',
        'dog_walker',
      ];
  }
}

/**
 * Deterministic sculpted Rio favela hillside terrain height `y(x, z)`.
 * Starts flush at y = 0 along the street edge (z >= -17.5), climbs steadily
 * northward into the hillside (z < -17.5), and dips subtly in the scenic
 * Guanabara Bay viewing corridor (x in [9, 23]) so Sugarloaf & Christ stay framed.
 */
export function getFavelaHillHeight(x: number, z: number): number {
  if (z >= -17.5) return 0;
  const depth = Math.min(34, -17.5 - z);
  const t = depth / 34; // 0 at curb .. 1 at upper ridge (z = -51.5)
  const baseRise = depth * 0.52 + Math.pow(t, 1.35) * 3.8;
  const ridgeWave =
    Math.sin(x * 0.085 + depth * 0.06) * 0.95 * Math.min(1, depth / 6) +
    Math.cos(x * 0.16 - depth * 0.09) * 0.45 * Math.min(1, depth / 8);
  // Gentle saddle dip in the scenic bay corridor (x ≈ 15.5) on upper tiers
  const bayDx = (x - 15.5) / 8.5;
  const baySaddle = Math.exp(-bayDx * bayDx) * Math.max(0, t - 0.18) * 5.2;
  return Math.max(0, baseRise + ridgeWave - baySaddle);
}

/**
 * Computes exact grounded main-floor elevation for a terraced favela house
 * seated at `(x, z)` with depth `d`, preventing both floating and slope burial
 * when paired with a `-4.5` concrete retaining-wall foundation plinth.
 */
export function computeFavelaHouseFloorY(x: number, z: number, depth: number): number {
  const frontH = getFavelaHillHeight(x, z + depth * 0.5);
  const backH = getFavelaHillHeight(x, z - depth * 0.5);
  return Math.max(frontH, backH - 0.85) + 0.15;
}

/**
 * Grounded step-height interpolation for outdoor favela alleyway walkers descending/ascending
 * stepped hillside staircases onto the main sidewalk (`t = 0` street edge -> `t = 1` upper terrace).
 */
export function interpolateAlleyStepY(
  t: number,
  alleyBaseX: number,
  startZ = -17.6,
  endZ = -34.2,
  stepCount = 18
): { x: number; y: number; z: number } {
  const clamped = Math.max(0, Math.min(1, t));
  const stepF = clamped * stepCount;
  const stepIdx = Math.floor(stepF);
  const stepFrac = stepF - stepIdx;
  // Smooth micro-riser curve so walker steps cleanly onto each tread without snapping harshly
  const riserEase = stepFrac < 0.35 ? (stepFrac / 0.35) * (stepFrac / 0.35) : 1;
  const effectiveStep = Math.min(stepCount, stepIdx + riserEase);
  const effectiveT = effectiveStep / Math.max(1, stepCount);
  const z = startZ + (endZ - startZ) * clamped;
  const x = alleyBaseX + Math.sin(effectiveStep * 0.38) * 1.15;
  const rawY = getFavelaHillHeight(x, startZ + (endZ - startZ) * effectiveT);
  const y = clamped <= 0.02 ? 0.08 : rawY + 0.48;
  return { x, y, z };
}

export type FavelaAlleyPhaseKind =
  | 'sidewalk'
  | 'stair_entry_turn'
  | 'stairs'
  | 'upper_curve'
  | 'concealed_behind_building';

export const FAVELA_STAIR_STEP_COUNT = 38;
export const FAVELA_UPPER_CURVE_STEP_COUNT = 8;
export const FAVELA_STAIR_START_Z = -17.6;
export const FAVELA_STAIR_END_Z = -32.6;
export const FAVELA_STAIR_TREAD_HEIGHT = 0.28;
export const FAVELA_STAIR_TREAD_DEPTH = 0.45;
export const FAVELA_STAIR_TREAD_Y_OFFSET = 0.17;
export const FAVELA_STAIR_TOP_OFFSET = FAVELA_STAIR_TREAD_Y_OFFSET + FAVELA_STAIR_TREAD_HEIGHT * 0.5; // 0.31

/** Returns the sinusoidal X centerline along the Selarón hillside alley for normalized stair progress `stairT` in [0, 1]. */
export function getFavelaStairCenterX(alleyBaseX: number, stairT: number): number {
  return alleyBaseX + Math.sin(stairT * 6.08) * 1.15;
}

export interface FavelaAlleyPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Positive when climbing uphill, negative when descending, 0 on flat sidewalk/landing. */
  slopePitch: number;
  /** Instantaneous turn rate sign for subtle banking lean. */
  lateralTurnRate: number;
  phaseKind: FavelaAlleyPhaseKind;
  /** True while concealed behind the flanking upper corner building. */
  isConcealed: boolean;
  /** Continuous physical step index along the 32-step + 8-curve staircase (1.0 = 1 step = 1 footfall). */
  stepIndex: number;
}

/**
 * Deterministic lateral bend direction at the top of each Selarón staircase so the upper landing
 * curves smoothly behind a dedicated hillside corner house (blocking line of sight from the street).
 */
export function getFavelaUpperCurveDir(alleyBaseX: number): 1 | -1 {
  return alleyBaseX < -10 || (alleyBaseX > 0 && alleyBaseX < 15) ? -1 : 1;
}

/**
 * Samples the exact top surface Y across all 32 compact Selarón mosaic stair treads so climbing
 * and descending sneakers land flush on each human-scale (~0.21m riser) step with zero foot burying.
 */
export function sampleFavelaStairSurfaceY(
  alleyBaseX: number,
  z: number,
  stepCount = FAVELA_STAIR_STEP_COUNT,
  stairStartZ = FAVELA_STAIR_START_Z,
  stairEndZ = FAVELA_STAIR_END_Z
): number {
  const halfDepth = FAVELA_STAIR_TREAD_DEPTH * 0.5;
  const bevel = 0.09; // Crisp human-scale riser climb transition right at the front lip of each compact tread
  let surfaceY = 0.08;
  let matched = false;

  for (let step = 0; step < stepCount; step++) {
    const stepT = step / stepCount;
    const tz = stairStartZ + (stairEndZ - stairStartZ) * stepT;
    const tx = getFavelaStairCenterX(alleyBaseX, stepT);
    const treadTopY = getFavelaHillHeight(tx, tz) + FAVELA_STAIR_TOP_OFFSET;

    // Check if walker's Z footprint sits on top of this tread or on its front riser lip
    const frontLipZ = tz + halfDepth;
    const backLipZ = tz - halfDepth;
    if (z <= frontLipZ + bevel && z >= backLipZ - 0.04) {
      let localY = treadTopY;
      if (z > frontLipZ) {
        // Smooth riser step-up from the previous lower tread onto this tread's front lip
        const prevStep = Math.max(0, step - 1);
        const prevT = prevStep / stepCount;
        const prevTz = stairStartZ + (stairEndZ - stairStartZ) * prevT;
        const prevTx = getFavelaStairCenterX(alleyBaseX, prevT);
        const prevTopY = step === 0 ? 0.08 : getFavelaHillHeight(prevTx, prevTz) + FAVELA_STAIR_TOP_OFFSET;
        const rampT = 1 - (z - frontLipZ) / bevel;
        const smooth = rampT * rampT * (3 - 2 * rampT);
        localY = prevTopY + (treadTopY - prevTopY) * smooth;
      }
      if (!matched || localY > surfaceY) {
        surfaceY = localY;
        matched = true;
      }
    }
  }

  if (!matched) {
    if (z > stairStartZ + halfDepth) {
      // Smooth blend from flat sidewalk (-16.55) up to bottom tread lip
      const firstTx = getFavelaStairCenterX(alleyBaseX, 0);
      const firstTopY = getFavelaHillHeight(firstTx, stairStartZ) + FAVELA_STAIR_TOP_OFFSET;
      const t = Math.max(0, Math.min(1, (-16.55 - z) / (-16.55 - (stairStartZ + halfDepth))));
      return 0.08 + (firstTopY - 0.08) * (t * t * (3 - 2 * t));
    }
    // Past top tread (-32.6): hold top step elevation cleanly into curved landing
    const topTx = getFavelaStairCenterX(alleyBaseX, 1);
    return getFavelaHillHeight(topTx, stairEndZ) + FAVELA_STAIR_TOP_OFFSET;
  }

  return surfaceY;
}

/**
 * Evaluates a continuous, realistic Favela hillside resident journey along `u` in [0, 1]:
 * - `direction = 'uphill'`: walks along street sidewalk as a passerby -> curves smoothly into
 *   the 32-step mosaic staircase -> climbs uphill with step-synced footfalls -> bends 90° laterally
 *   around the 8-step curved top landing behind a 2-story flanking hillside corner house -> vanishes out of view.
 * - `direction = 'downhill'`: emerges from behind the upper corner house -> curves onto the
 *   32-step mosaic staircase -> descends step-by-step -> turns smoothly onto the sidewalk and walks off-screen.
 */
export function evaluateFavelaAlleyLifecycle(
  u: number,
  alleyBaseX: number,
  direction: 'uphill' | 'downhill',
  sidewalkApproachSign: 1 | -1 = 1
): FavelaAlleyPose {
  const progress = Math.max(0, Math.min(1, u));
  // Parameterize along a canonical spatial arc s in [0, 1] where s=0 is far off-screen sidewalk and s=1 is behind upper house
  const s = direction === 'uphill' ? progress : 1 - progress;
  const upperTurnDir = getFavelaUpperCurveDir(alleyBaseX);

  const sampleArc = (
    arcS: number
  ): { x: number; y: number; z: number; phaseKind: FavelaAlleyPhaseKind; stepIndex: number } => {
    const cs = Math.max(0, Math.min(1, arcS));
    const sidewalkZ = -16.55;
    const stairStartZ = FAVELA_STAIR_START_Z;
    const stairEndZ = FAVELA_STAIR_END_Z;
    const turnRadius = 1.05;
    // Start/end completely past the off-screen street corners (±31.5m) so walkers NEVER pop in/out mid-view!
    const offscreenSidewalkX = sidewalkApproachSign * 31.5;

    if (cs < 0.22) {
      // Flat sidewalk passerby stroll from far off-screen toward the alley entrance
      const t = cs / 0.22;
      const turnX = alleyBaseX + sidewalkApproachSign * turnRadius;
      return {
        x: offscreenSidewalkX + (turnX - offscreenSidewalkX) * t,
        y: 0.08,
        z: sidewalkZ,
        phaseKind: 'sidewalk',
        stepIndex: 0,
      };
    }
    if (cs < 0.30) {
      // Smooth 90° quarter-circle turn from sidewalk onto the base mosaic tread
      const t = (cs - 0.22) / 0.08;
      const theta = t * (Math.PI * 0.5);
      const x = alleyBaseX + sidewalkApproachSign * Math.cos(theta) * turnRadius;
      const z = sidewalkZ - Math.sin(theta) * turnRadius;
      const entryY = sampleFavelaStairSurfaceY(alleyBaseX, z) + 0.015;
      const y = 0.08 + (entryY - 0.08) * (t * t * (3 - 2 * t));
      return { x, y, z, phaseKind: 'stair_entry_turn', stepIndex: 0 };
    }
    if (cs < 0.80) {
      // 32-step compact human-scale Selarón staircase ascent/descent (zero buried feet, 1 footfall per step!)
      const stairT = (cs - 0.30) / 0.50;
      const stepF = stairT * FAVELA_STAIR_STEP_COUNT;
      const z = stairStartZ + (stairEndZ - stairStartZ) * stairT;
      const x = getFavelaStairCenterX(alleyBaseX, stairT);
      const treadSurfaceY = sampleFavelaStairSurfaceY(alleyBaseX, z) + 0.015;
      return { x, y: treadSurfaceY, z, phaseKind: 'stairs', stepIndex: stepF };
    }

    // Upper staircase curve (cs in [0.80, 1.0]): bends 90° laterally behind the 2-story concealing corner house
    const topBaseX = getFavelaStairCenterX(alleyBaseX, 1);
    const topBaseZ = stairEndZ;
    const topBaseY =
      Math.max(
        sampleFavelaStairSurfaceY(alleyBaseX, topBaseZ),
        getFavelaHillHeight(topBaseX, topBaseZ) + FAVELA_STAIR_TOP_OFFSET
      ) + 0.015;
    const upperCurveR = 1.65;

    if (cs < 0.90) {
      const t = (cs - 0.80) / 0.10;
      const theta = t * (Math.PI * 0.5);
      const x = topBaseX + upperTurnDir * upperCurveR * (1 - Math.cos(theta));
      const z = topBaseZ - Math.sin(theta) * upperCurveR;
      const y = topBaseY + t * 0.72;
      return {
        x,
        y,
        z,
        phaseKind: 'upper_curve',
        stepIndex: FAVELA_STAIR_STEP_COUNT + t * FAVELA_UPPER_CURVE_STEP_COUNT,
      };
    }

    const t = (cs - 0.90) / 0.10;
    const x = topBaseX + upperTurnDir * (upperCurveR + t * 3.6);
    const z = topBaseZ - upperCurveR - t * 0.45;
    const y = topBaseY + 0.72 + t * 0.18;
    return {
      x,
      y,
      z,
      phaseKind: 'concealed_behind_building',
      stepIndex: FAVELA_STAIR_STEP_COUNT + FAVELA_UPPER_CURVE_STEP_COUNT,
    };
  };

  const curr = sampleArc(s);
  const delta = direction === 'uphill' ? 0.012 : -0.012;
  const ahead = sampleArc(s + delta);
  const behind = sampleArc(s - delta);

  const dx = ahead.x - curr.x;
  const dz = ahead.z - curr.z;
  const yaw = Math.atan2(dx, dz);

  // Compute macro staircase slope across ~2-3 compact steps so climbing/descending posture stays smooth
  let slopePitch = 0;
  if (curr.phaseKind === 'stairs' || curr.phaseKind === 'upper_curve') {
    const macroDelta = direction === 'uphill' ? 0.045 : -0.045;
    const macroAhead = sampleArc(s + macroDelta);
    const macroBehind = sampleArc(s - macroDelta);
    const mdx = macroAhead.x - macroBehind.x;
    const mdy = macroAhead.y - macroBehind.y;
    const mdz = macroAhead.z - macroBehind.z;
    const mHoriz = Math.hypot(mdx, mdz) || 1e-4;
    const maxPitch = curr.phaseKind === 'stairs' ? 0.55 : 0.35;
    slopePitch = Math.max(-maxPitch, Math.min(maxPitch, Math.atan2(mdy, mHoriz)));
  }

  const prevYaw = Math.atan2(curr.x - behind.x, curr.z - behind.z);
  let yawDiff = yaw - prevYaw;
  while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
  while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
  const lateralTurnRate = Math.max(-2, Math.min(2, yawDiff * 8));

  return {
    x: curr.x,
    y: curr.y,
    z: curr.z,
    yaw,
    slopePitch,
    lateralTurnRate,
    phaseKind: curr.phaseKind,
    isConcealed: curr.phaseKind === 'concealed_behind_building',
    stepIndex: curr.stepIndex,
  };
}



