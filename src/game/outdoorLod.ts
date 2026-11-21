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
 * Returns true for sceneries where animated two-lane street traffic drives along the avenue.
 * Cyberpunk Neon uses elevated multi-altitude flying hover-cars (spinners) instead of wheeled cars.
 */
export function hasStreetTrafficScenery(sceneryId: SceneryId): boolean {
  return sceneryId === 'busy_street' || sceneryId === 'eiffel_tower';
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
    return {
      isPlayerOutside: false,
      maxTraffic: allowTraffic ? (isLow ? 1 : 2) : 0,
      maxPedestrians: isLow ? 1 : 2,
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
        'favela_football',
        'coffee_stroll',
        'phone_call',
        'favela_football',
        'dog_walker',
        'phone_browse',
        'coffee_stroll',
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
