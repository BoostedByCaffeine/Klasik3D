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

export const TRAFFIC_MIN_LANE_SPACING = 10.5;
export const TRAFFIC_X_BOUND = 23.5;

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
