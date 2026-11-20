export interface SidewalkObstacle {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface SidewalkBounds {
  /** Outer curb-side Z limit (more negative Z, e.g. -9.02) */
  outerZ: number;
  /** Inner storefront-side Z limit (less negative Z, e.g. -7.42) */
  innerZ: number;
}

export const DEFAULT_SIDEWALK_BOUNDS: SidewalkBounds = {
  outerZ: -9.02,
  innerZ: -7.42,
};

/**
 * Returns padded 2D sidewalk AABB obstacles for the Klasik Cafe exterior apron.
 * Includes the parked 1990 Mazda Miata MX-5 (when outside), flanking cedar planters,
 * and curb streetlamp posts with generous pedestrian clearance margins.
 */
export function getSidewalkObstacles(isMiataParkedOutside: boolean, isUrbanBiome = true): SidewalkObstacle[] {
  const obstacles: SidewalkObstacle[] = [
    // Exterior flanking cedar planters (z = -6.95, halfDepth = 0.21, +0.32 padding)
    { id: 'planter-right', minX: -5.45, maxX: -2.35, minZ: -7.32, maxZ: -6.58 },
    { id: 'planter-left', minX: -0.05, maxX: 3.85, minZ: -7.32, maxZ: -6.58 },
  ];

  if (isUrbanBiome) {
    // Urban curb streetlamp poles at x = -5.4, +0.55, +5.8, z = -8.95
    obstacles.push(
      { id: 'lamp-west', minX: -5.85, maxX: -4.95, minZ: -9.35, maxZ: -8.55 },
      { id: 'lamp-mid', minX: 0.1, maxX: 1.0, minZ: -9.35, maxZ: -8.55 },
      { id: 'lamp-east', minX: 5.35, maxX: 6.25, minZ: -9.35, maxZ: -8.55 }
    );
  }

  if (isMiataParkedOutside) {
    // Parked 1990 Mazda Miata MX-5 at (-3.55, 0.08, -8.68), rotY = 1.36 (+0.55m clearance margin)
    obstacles.push({
      id: 'parked-miata',
      minX: -5.55,
      maxX: -1.55,
      minZ: -9.65,
      maxZ: -7.78,
    });
  }

  return obstacles;
}

/**
 * Computes a smooth, collision-free Z coordinate for an exterior pedestrian walking
 * along X at `baseLaneZ`. Pedestrians smoothly steer laterally around any obstacle
 * (such as the parked Miata or curb streetlamps) using a C1 smoothstep approach ramp,
 * without ever penetrating the obstacle box, storefront glass, or street traffic.
 */
export function computeAvoidedSidewalkZ(
  x: number,
  baseLaneZ: number,
  obstacles: readonly SidewalkObstacle[],
  bounds: SidewalkBounds = DEFAULT_SIDEWALK_BOUNDS
): number {
  // Pedestrians on the far sidewalk (z < -12) are unaffected by near-sidewalk cafe obstacles
  if (baseLaneZ < -12.0) {
    return baseLaneZ;
  }

  const rampDist = 1.45;
  let targetZ = baseLaneZ;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (x < obs.minX - rampDist || x > obs.maxX + rampDist) continue;
    if (targetZ < obs.minZ || targetZ > obs.maxZ) continue;

    // Smooth approach/departure weight in [0, 1]
    let weight = 1;
    if (x < obs.minX) {
      const t = Math.max(0, Math.min(1, (x - (obs.minX - rampDist)) / rampDist));
      weight = t * t * (3 - 2 * t);
    } else if (x > obs.maxX) {
      const t = Math.max(0, Math.min(1, (obs.maxX + rampDist - x) / rampDist));
      weight = t * t * (3 - 2 * t);
    }

    // Choose whichever clear side (inner storefront side vs outer curb side) fits within sidewalk bounds
    const innerCandidate = obs.maxZ + 0.14;
    const outerCandidate = obs.minZ - 0.14;
    const innerFits = innerCandidate <= bounds.innerZ;
    const outerFits = outerCandidate >= bounds.outerZ;

    let safeZ: number;
    if (innerFits && outerFits) {
      safeZ =
        Math.abs(innerCandidate - targetZ) <= Math.abs(outerCandidate - targetZ)
          ? innerCandidate
          : outerCandidate;
    } else if (innerFits) {
      safeZ = innerCandidate;
    } else if (outerFits) {
      safeZ = outerCandidate;
    } else {
      // Fallback: pick whichever side stays closest to valid sidewalk corridor (prefer inner walkway)
      safeZ = Math.min(bounds.innerZ, Math.max(bounds.outerZ, innerCandidate));
    }

    targetZ = targetZ + (safeZ - targetZ) * weight;
  }

  return Math.max(bounds.outerZ, Math.min(bounds.innerZ, targetZ));
}
