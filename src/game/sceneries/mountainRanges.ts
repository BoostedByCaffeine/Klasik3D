import * as THREE from 'three';

export type GraphicsTier = 'low' | 'medium' | 'high';

export interface MountainBiomePalette {
  baseColor: number; // Foothill forest / scree / coastal foliage
  midRockColor: number; // Mid-elevation granite / volcanic rock
  steepCliffColor: number; // Exposed dark cliff where snow sheds off
  snowColor: number; // High-altitude gentle-slope snow cap (optional if snowline > 1)
  snowlineNormalized: number; // 0.0 - 1.2 (>1.0 disables snow, e.g. Mayon/Hilltop)
  steepnessRockThreshold: number; // e.g. 0.52 (normal.y < threshold forces rock)
  crispRidges?: boolean; // true -> ridge*ridge for alpine/Himalayan arêtes; false -> rolling tropical hills
  defaultSkirtFloorY?: number;
}

export interface RidgedPeakOptions {
  seed: number;
  radiusX: number;
  radiusZ: number;
  height: number;
  baseY: number;
  skirtFloorY: number; // e.g. -24 (Hilltop), -30 (Switzerland)
  ridgeStretch?: number; // 0.15 - 0.45 elongates apex into a natural crest
  palette: MountainBiomePalette;
  tier: GraphicsTier;
}

export interface MountainRangeRibbonOptions {
  seed: number;
  arcRadius: number; // Distance from scene center
  startAngle: number; // Radians
  endAngle: number; // Radians
  depth: number; // Front-to-back thickness of range
  peakCount: number; // 3 - 5 connected peaks + saddles
  minPeakHeight: number;
  maxPeakHeight: number;
  baseY: number;
  skirtFloorY: number;
  palette: MountainBiomePalette;
  tier: GraphicsTier;
  centerX?: number;
  centerZ?: number;
}

export const MAYON_FOOTHILLS: MountainBiomePalette = {
  baseColor: 0x2d5a27,
  midRockColor: 0x3f6d32,
  steepCliffColor: 0x4a5344,
  snowColor: 0xffffff,
  snowlineNormalized: 1.5,
  steepnessRockThreshold: 0.46,
  crispRidges: false,
  defaultSkirtFloorY: -10,
};

export const COASTAL_SIERRA: MountainBiomePalette = {
  baseColor: 0x263a2e,
  midRockColor: 0x3b444b,
  steepCliffColor: 0x2e323a,
  snowColor: 0xffffff,
  snowlineNormalized: 1.5,
  steepnessRockThreshold: 0.5,
  crispRidges: false,
  defaultSkirtFloorY: -24,
};

export const SWISS_ALPINE: MountainBiomePalette = {
  baseColor: 0x325238,
  midRockColor: 0x636b73,
  steepCliffColor: 0x3e444d,
  snowColor: 0xf2f7fc,
  snowlineNormalized: 0.56,
  steepnessRockThreshold: 0.55,
  crispRidges: true,
  defaultSkirtFloorY: -30,
};

export const HIMALAYAN_HORN: MountainBiomePalette = {
  baseColor: 0x59626e,
  midRockColor: 0x434b57,
  steepCliffColor: 0x252b33,
  snowColor: 0xf5faff,
  snowlineNormalized: 0.42,
  steepnessRockThreshold: 0.52,
  crispRidges: true,
  defaultSkirtFloorY: -26,
};

export function resolveMountainGraphicsTier(): GraphicsTier {
  if (typeof window === 'undefined') return 'medium';
  const body = typeof document !== 'undefined' ? document.body : null;
  if (body && (body.classList.contains('low-fx') || body.classList.contains('capacitor-apk'))) {
    return 'low';
  }
  return 'medium';
}

// Fast deterministic 2D value noise (seeded, zero allocations)
function hash2D(ix: number, iz: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  n = (n ^ (n >>> 16)) >>> 0;
  return n / 4294967295;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function valueNoise2D(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smoothstep(x - ix);
  const fz = smoothstep(z - iz);
  const v00 = hash2D(ix, iz, seed);
  const v10 = hash2D(ix + 1, iz, seed);
  const v01 = hash2D(ix, iz + 1, seed);
  const v11 = hash2D(ix + 1, iz + 1, seed);
  const a = v00 + (v10 - v00) * fx;
  const b = v01 + (v11 - v01) * fx;
  return a + (b - a) * fz;
}

export function ridgedFbm2D(
  x: number,
  z: number,
  seed: number,
  crispRidges = true
): number {
  let sum = 0;
  let amp = 0.55;
  let freq = 1.0;
  let norm = 0;
  for (let oct = 0; oct < 3; oct++) {
    const n = valueNoise2D(x * freq, z * freq, seed + oct * 97);
    let r = 1.0 - Math.abs(n * 2.0 - 1.0);
    if (crispRidges) r = r * r;
    sum += r * amp;
    norm += amp;
    freq *= 2.08;
    amp *= 0.48;
  }
  return norm > 0 ? sum / norm : 0;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function bakeMountainVertexColors(
  geo: THREE.BufferGeometry,
  baseY: number,
  maxHeight: number,
  palette: MountainBiomePalette,
  seed: number
): void {
  geo.computeVertexNormals();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const norm = geo.attributes.normal as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  const cBase = new THREE.Color(palette.baseColor);
  const cMid = new THREE.Color(palette.midRockColor);
  const cCliff = new THREE.Color(palette.steepCliffColor);
  const cSnow = new THREE.Color(palette.snowColor);
  const cTmp = new THREE.Color();

  const invMaxH = maxHeight > 0.001 ? 1 / maxHeight : 1;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const upDot = Math.max(0, norm.getY(i));
    const hNorm = clamp01((vy - baseY) * invMaxH);

    // Slight elevation jitter from deterministic noise so snowline & strata look organic
    const nWarp = (valueNoise2D(vx * 0.06, vz * 0.06, seed + 503) - 0.5) * 0.14;

    // Base -> Mid Rock blend
    const rockMix = clamp01(hNorm * 1.15 + nWarp * 0.5);
    cTmp.copy(cBase).lerp(cMid, rockMix);

    // Steep exposed faces shed foliage & snow -> steepCliffColor
    if (upDot < palette.steepnessRockThreshold) {
      const cliffT = clamp01(
        (palette.steepnessRockThreshold - upDot) / Math.max(0.08, palette.steepnessRockThreshold)
      );
      cTmp.lerp(cCliff, 0.45 + cliffT * 0.5);
    }

    // High-altitude gentle-slope snow cap
    const snowH = hNorm + nWarp;
    if (
      palette.snowlineNormalized <= 1.05 &&
      snowH > palette.snowlineNormalized &&
      upDot >= palette.steepnessRockThreshold * 0.92
    ) {
      const snowBand = clamp01((snowH - palette.snowlineNormalized) / 0.18);
      const slopeFactor = clamp01(
        (upDot - palette.steepnessRockThreshold * 0.92) / 0.2
      );
      cTmp.lerp(cSnow, snowBand * slopeFactor);
    }

    // Subtle darkening on deep vertical skirts below baseY to ground seamlessly into valley fog
    if (vy < baseY - 0.1) {
      cTmp.multiplyScalar(0.84);
    }

    colors[i * 3] = cTmp.r;
    colors[i * 3 + 1] = cTmp.g;
    colors[i * 3 + 2] = cTmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Shared single material per scenery for all procedural mountain meshes so
 * `batchStaticMeshesByMaterial()` collapses them into minimal draw calls.
 */
export function createSharedMountainMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    side: THREE.FrontSide,
  });
}

/**
 * Builds a single asymmetric sculpted ridged mountain massif / pyramidal horn
 * with an open-bottom vertical skirt dropped straight to `skirtFloorY` (zero floating edges).
 */
export function createRidgedPeakGeometry(options: RidgedPeakOptions): THREE.BufferGeometry {
  const {
    seed,
    radiusX,
    radiusZ,
    height,
    baseY,
    skirtFloorY,
    ridgeStretch = 0.28,
    palette,
    tier,
  } = options;

  const radialSegs = tier === 'low' ? 14 : tier === 'medium' ? 20 : 24;
  const ringSegs = tier === 'low' ? 4 : 6;
  const totalRings = ringSegs + 2; // ring 0 = crest ridge, rings 1..ringSegs = slopes, last ring = vertical skirt bottom
  const crisp = palette.crispRidges ?? true;

  const positions: number[] = [];
  const indices: number[] = [];

  // Deterministic summit crest orientation & slight off-center asymmetry
  const crestYaw = (hash2D(seed, 11, 7) - 0.5) * Math.PI;
  const cosYaw = Math.cos(crestYaw);
  const sinYaw = Math.sin(crestYaw);
  const asymX = (hash2D(seed, 23, 13) - 0.5) * 0.16;
  const asymZ = (hash2D(seed, 37, 19) - 0.5) * 0.16;

  // Generate rings from inner crest (r = 0.08) out to rim (r = 1.0) plus skirt drop
  for (let ring = 0; ring < totalRings; ring++) {
    const isSkirtBottom = ring === totalRings - 1;
    const ringT = isSkirtBottom ? 1.0 : Math.max(0.06, ring / ringSegs);

    for (let seg = 0; seg <= radialSegs; seg++) {
      const theta = (seg / radialSegs) * Math.PI * 2;
      const ca = Math.cos(theta);
      const sa = Math.sin(theta);

      // Elongate inner crest along crestYaw so apex is an asymmetric ridge, never a needle point
      const stretchFactor = 1.0 + (1.0 - ringT) * ridgeStretch;
      const localX = ca * radiusX * ringT * stretchFactor + asymX * radiusX * (1 - ringT);
      const localZ = sa * radiusZ * ringT + asymZ * radiusZ * (1 - ringT);

      // Rotate into world-aligned ridge direction
      const wx = localX * cosYaw - localZ * sinYaw;
      const wz = localX * sinYaw + localZ * cosYaw;

      let wy: number;
      if (isSkirtBottom) {
        wy = skirtFloorY;
      } else {
        // Multi-directional arête spurs (3-4 radiating ridges) + 3-octave ridged FBM
        const spurCount = crisp ? 3 : 2;
        const spurWave = 0.5 + 0.5 * Math.cos(theta * spurCount + seed * 1.37);
        const fbm = ridgedFbm2D(wx * 0.055 + seed * 0.31, wz * 0.055 - seed * 0.27, seed, crisp);
        const profilePow = crisp ? 1.38 : 1.12;
        const falloff = Math.pow(Math.max(0, 1.0 - ringT), profilePow);
        const crestMod = 0.86 + 0.14 * Math.cos(theta * 2 + seed);
        const elev =
          height *
          falloff *
          crestMod *
          (0.68 + 0.24 * fbm + 0.16 * spurWave * (1 - ringT * 0.4));
        wy = ring === ringSegs ? baseY : baseY + elev;
      }

      positions.push(wx, wy, wz);
    }
  }

  // Summit cap center vertex (raised slightly above inner crest ring so top is closed cleanly)
  const apexIndex = positions.length / 3;
  positions.push(
    asymX * radiusX * cosYaw - asymZ * radiusZ * sinYaw,
    baseY + height * 1.01,
    asymX * radiusX * sinYaw + asymZ * radiusZ * cosYaw
  );

  const stride = radialSegs + 1;
  // Cap inner crest ring to apex (CCW outward)
  for (let seg = 0; seg < radialSegs; seg++) {
    indices.push(apexIndex, seg + 1, seg);
  }

  // Connect concentric slope rings & outer vertical skirt (open bottom -> 0 bottom cap tris!)
  for (let ring = 0; ring < totalRings - 1; ring++) {
    const rowA = ring * stride;
    const rowB = (ring + 1) * stride;
    for (let seg = 0; seg < radialSegs; seg++) {
      const a = rowA + seg;
      const b = rowA + seg + 1;
      const c = rowB + seg;
      const d = rowB + seg + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  bakeMountainVertexColors(geo, baseY, height, palette, seed);
  return geo;
}

/**
 * Builds a continuous curved mountain range ribbon with 3-5 connected peaks + saddles,
 * ridged FBM displacement, slope/elevation vertex colors, and vertical front/back skirts
 * grounded straight down to `skirtFloorY` (open-bottom `THREE.FrontSide`, ~80% fewer draw calls).
 */
export function createMountainRangeRibbon(
  options: MountainRangeRibbonOptions
): THREE.BufferGeometry {
  const {
    seed,
    arcRadius,
    startAngle,
    endAngle,
    depth,
    peakCount,
    minPeakHeight,
    maxPeakHeight,
    baseY,
    skirtFloorY,
    palette,
    tier,
    centerX = 0,
    centerZ = 0,
  } = options;

  // Strict graphics-tier triangle budget:
  // Low: widthSegments 20..24, depthSegments 4..5 (~140-200 tris)
  // Medium/High: widthSegments 32..38, depthSegments 6..8 (~300-450 tris)
  const widthSegs = tier === 'low' ? 22 : tier === 'medium' ? 32 : 36;
  const depthSegs = tier === 'low' ? 4 : 6;
  const totalDepthRows = depthSegs + 3; // row 0 = front skirt bottom, rows 1..depthSegs+1 = surface, last = back skirt bottom
  const crisp = palette.crispRidges ?? true;

  // Deterministic peak centers, heights, and widths along u ∈ [0, 1]
  const safePeaks = Math.max(2, Math.min(7, peakCount));
  const peaks: Array<{ u: number; h: number; width: number; ridgeBias: number }> = [];
  for (let p = 0; p < safePeaks; p++) {
    const jitter = (hash2D(seed, p * 17 + 3, 29) - 0.5) * (0.42 / safePeaks);
    const u = Math.max(0.08, Math.min(0.92, (p + 0.5) / safePeaks + jitter));
    const hT = hash2D(seed, p * 31 + 7, 43);
    const h = minPeakHeight + (maxPeakHeight - minPeakHeight) * (0.2 + 0.8 * hT);
    const width = (0.14 + 0.1 * hash2D(seed, p * 13 + 5, 61)) * (4 / safePeaks);
    const ridgeBias = (hash2D(seed, p * 19 + 11, 71) - 0.5) * 0.22;
    peaks.push({ u, h, width, ridgeBias });
  }

  const positions: number[] = [];
  const indices: number[] = [];
  const halfDepth = depth * 0.5;

  for (let row = 0; row < totalDepthRows; row++) {
    const isFrontSkirt = row === 0;
    const isBackSkirt = row === totalDepthRows - 1;
    // v ∈ [0, 1] across depth: 0 = front base edge (closest to viewer), 1 = back base edge
    const v = isFrontSkirt ? 0 : isBackSkirt ? 1 : (row - 1) / depthSegs;

    for (let col = 0; col <= widthSegs; col++) {
      const u = col / widthSegs;
      const angle = startAngle + (endAngle - startAngle) * u;
      const radialDist = arcRadius + (v - 0.5) * depth;

      const wx = centerX + Math.sin(angle) * radialDist;
      const wz = centerZ - Math.cos(angle) * radialDist;

      let wy: number;
      if (isFrontSkirt || isBackSkirt) {
        wy = skirtFloorY;
      } else {
        // Taper ribbon height smoothly near start/end edges so ends blend into horizon
        const edgeFade = Math.sin(u * Math.PI);
        const edgeEnvelope = Math.pow(Math.max(0, edgeFade), 0.45);

        // Sum overlapping mountain peak domes + saddles along spine
        let spineHeight = minPeakHeight * 0.24 * edgeEnvelope;
        let spineShift = 0;
        for (let p = 0; p < peaks.length; p++) {
          const pk = peaks[p];
          const du = (u - pk.u) / Math.max(0.06, pk.width);
          const contrib = pk.h * Math.exp(-du * du * 1.45);
          if (contrib > spineHeight) {
            spineHeight = contrib;
            spineShift = pk.ridgeBias;
          } else {
            spineHeight += contrib * 0.22;
          }
        }

        // Cross-section from front (v=0) to crest (v≈0.5+spineShift) to back (v=1)
        const crestV = 0.5 + spineShift * 0.65;
        const distFromCrest =
          v <= crestV
            ? (crestV - v) / Math.max(0.12, crestV)
            : (v - crestV) / Math.max(0.12, 1.0 - crestV);
        const crossProfile = Math.pow(Math.max(0, 1.0 - distFromCrest), crisp ? 1.28 : 1.05);

        // Deterministic 3-octave ridged FBM carving natural gullies, spurs & secondary crests
        const fbm = ridgedFbm2D(wx * 0.045 + seed * 0.17, wz * 0.045 - seed * 0.23, seed, crisp);
        const isEdge = row === 1 || row === totalDepthRows - 2;
        if (isEdge) {
          wy = baseY;
        } else {
          const elev =
            spineHeight *
            edgeEnvelope *
            crossProfile *
            (0.72 + 0.42 * fbm);
          wy = baseY + Math.max(0, elev);
        }
      }

      // Slight horizontal offset for front/back skirt so vertices don't overlap identically
      const outX = wx;
      const outZ = wz;
      const offsetY = isFrontSkirt || isBackSkirt ? wy : wy;
      positions.push(outX, offsetY, outZ);
      void halfDepth;
    }
  }

  const stride = widthSegs + 1;
  // Wind triangles so normals point upward & toward the cafe viewer (front face visible on FrontSide)
  const flipWinding = endAngle < startAngle;
  for (let row = 0; row < totalDepthRows - 1; row++) {
    const rowA = row * stride;
    const rowB = (row + 1) * stride;
    for (let col = 0; col < widthSegs; col++) {
      const a = rowA + col;
      const b = rowA + col + 1;
      const c = rowB + col;
      const d = rowB + col + 1;
      if (flipWinding) {
        indices.push(a, d, b);
        indices.push(a, c, d);
      } else {
        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  bakeMountainVertexColors(geo, baseY, maxPeakHeight, palette, seed);
  return geo;
}

/**
 * Convenience mesh builder enforcing zero shadow cost and window-backdrop visibility guard.
 */
export function createMountainRibbonMesh(
  options: MountainRangeRibbonOptions,
  sharedMaterial: THREE.MeshLambertMaterial,
  name = 'mountain_ribbon'
): THREE.Mesh {
  const geo = createMountainRangeRibbon(options);
  const mesh = new THREE.Mesh(geo, sharedMaterial);
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.alwaysVisibleBackdrop = true;
  return mesh;
}

export function createRidgedPeakMesh(
  options: RidgedPeakOptions,
  sharedMaterial: THREE.MeshLambertMaterial,
  name = 'mountain_peak'
): THREE.Mesh {
  const geo = createRidgedPeakGeometry(options);
  const mesh = new THREE.Mesh(geo, sharedMaterial);
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.alwaysVisibleBackdrop = true;
  return mesh;
}
