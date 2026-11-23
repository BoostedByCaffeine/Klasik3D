import * as THREE from 'three';

export type MountainTexturePreset = 'alpine' | 'himalayan' | 'highland';

export interface MountainSurfaceTextureSet {
  map: THREE.CanvasTexture | null;
  bumpMap: THREE.CanvasTexture | null;
  bumpScale: number;
  dispose: () => void;
}

const BUMP_SCALE_BY_PRESET: Record<MountainTexturePreset, number> = {
  alpine: 1.6,
  himalayan: 2.2,
  highland: 0.9,
};

const mountainTextureCache = new Map<MountainTexturePreset, MountainSurfaceTextureSet>();
let hilltopLandmassTextureCache: THREE.CanvasTexture | null = null;

function hash2Periodic(ix: number, iy: number, period: number, seed: number): number {
  const px = ((ix % period) + period) % period;
  const py = ((iy % period) + period) % period;
  let n = Math.imul(px, 374761393) + Math.imul(py, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177);
  n = (n ^ (n >>> 16)) >>> 0;
  return n / 4294967295;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function periodicNoise2D(u: number, v: number, period: number, seed: number): number {
  const x = u * period;
  const y = v * period;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);
  const v00 = hash2Periodic(ix, iy, period, seed);
  const v10 = hash2Periodic(ix + 1, iy, period, seed);
  const v01 = hash2Periodic(ix, iy + 1, period, seed);
  const v11 = hash2Periodic(ix + 1, iy + 1, period, seed);
  const a = v00 + (v10 - v00) * fx;
  const b = v01 + (v11 - v01) * fx;
  return a + (b - a) * fy;
}

function periodicRidgedFbm(
  u: number,
  v: number,
  basePeriod: number,
  octaves: number,
  seed: number,
  sharpen = true
): number {
  let sum = 0;
  let norm = 0;
  let amp = 0.56;
  let period = basePeriod;
  for (let o = 0; o < octaves; o++) {
    const n = periodicNoise2D(u, v, period, seed + o * 131);
    let r = 1.0 - Math.abs(n * 2.0 - 1.0);
    if (sharpen) r = r * r;
    sum += r * amp;
    norm += amp;
    period *= 2;
    amp *= 0.5;
  }
  return norm > 0 ? sum / norm : 0.5;
}

function clampByte(v: number): number {
  return v <= 0 ? 0 : v >= 255 ? 255 : v | 0;
}

/**
 * Generates and caches seamless 512x512 procedural rock/snow albedo & bump CanvasTextures
 * designed to multiply cleanly with vertexColors on mountain massifs and horizon ribbons.
 */
export function getMountainSurfaceTextures(
  preset: MountainTexturePreset
): MountainSurfaceTextureSet {
  const bumpScale = BUMP_SCALE_BY_PRESET[preset];
  if (typeof document === 'undefined') {
    return {
      map: null,
      bumpMap: null,
      bumpScale,
      dispose: () => {},
    };
  }

  const cached = mountainTextureCache.get(preset);
  if (cached) return cached;

  const size = 512;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const albedoCtx = albedoCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext('2d');

  const seed = preset === 'himalayan' ? 911 : preset === 'alpine' ? 547 : 313;

  if (albedoCtx && bumpCtx) {
    const albedoImg = albedoCtx.createImageData(size, size);
    const bumpImg = bumpCtx.createImageData(size, size);
    const aData = albedoImg.data;
    const bData = bumpImg.data;

    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const idx = (y * size + x) * 4;

        // Vertical fractured granite fissures (higher X frequency, stretched vertically)
        const warp = (periodicNoise2D(u, v, 8, seed + 17) - 0.5) * 0.08;
        const vertFissure = periodicRidgedFbm(u + warp, v * 0.5, 12, 3, seed + 41, true);
        // Diagonal geological strata streaks (periodic u + v so tile stays 100% seamless)
        const diagCoord = (u * 1.0 + v * 1.0 + warp * 0.6) % 1;
        const strata = periodicRidgedFbm(diagCoord, v, 8, 3, seed + 83, preset !== 'highland');
        // Fine rock & wind-scoured snow micro-grain
        const microGrain = periodicNoise2D(u, v, 48, seed + 199);
        const fineSpeck = periodicNoise2D(u, v, 96, seed + 257);

        let heightVal = 0.5;
        let lum = 232;
        let coolTint = 0;

        if (preset === 'himalayan') {
          // Sharp fluted vertical ice-and-granite striations + deep jagged crevices
          const deepCrack = Math.pow(1.0 - vertFissure, 2.2);
          heightVal =
            vertFissure * 0.54 +
            strata * 0.28 +
            microGrain * 0.12 +
            fineSpeck * 0.06;
          // High-value neutral multiplier (172..255) so snow stays crisp white while crevices pop
          lum = 216 + (heightVal - 0.5) * 76 - deepCrack * 46 + (fineSpeck - 0.5) * 16;
          coolTint = (0.5 - deepCrack) * 6;
        } else if (preset === 'alpine') {
          // Crisp Alpine granite ledges, glacial striations, and snow wind-drift grain
          const crevice = Math.pow(1.0 - vertFissure, 2.0);
          heightVal =
            vertFissure * 0.44 +
            strata * 0.34 +
            microGrain * 0.14 +
            fineSpeck * 0.08;
          lum = 222 + (heightVal - 0.5) * 62 - crevice * 36 + (fineSpeck - 0.5) * 14;
          coolTint = (0.5 - crevice) * 5;
        } else {
          // Highland: matte forest-canopy clumping + softer volcanic ridge strata (zero shiny clay)
          const canopyClump = periodicNoise2D(u, v, 24, seed + 307);
          heightVal =
            canopyClump * 0.45 +
            strata * 0.25 +
            vertFissure * 0.16 +
            microGrain * 0.14;
          lum = 210 + (heightVal - 0.5) * 56 + (fineSpeck - 0.5) * 18;
          coolTint = 2;
        }

        const r = clampByte(lum - coolTint * 0.4);
        const g = clampByte(lum);
        const b = clampByte(lum + coolTint);

        aData[idx] = r;
        aData[idx + 1] = g;
        aData[idx + 2] = b;
        aData[idx + 3] = 255;

        // High-contrast bump heightfield
        const bumpContrast = preset === 'himalayan' ? 1.48 : preset === 'alpine' ? 1.32 : 1.1;
        const bByte = clampByte(128 + (heightVal - 0.5) * 255 * bumpContrast);
        bData[idx] = bByte;
        bData[idx + 1] = bByte;
        bData[idx + 2] = bByte;
        bData[idx + 3] = 255;
      }
    }

    albedoCtx.putImageData(albedoImg, 0, 0);
    bumpCtx.putImageData(bumpImg, 0, 0);
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = 4;
  bumpMap.needsUpdate = true;

  const entry: MountainSurfaceTextureSet = {
    map,
    bumpMap,
    bumpScale,
    dispose: () => {
      if (mountainTextureCache.get(preset) === entry) {
        mountainTextureCache.delete(preset);
      }
      map.dispose();
      bumpMap.dispose();
    },
  };

  mountainTextureCache.set(preset, entry);
  return entry;
}

/**
 * Cached 512x512 matte aerial urban-landmass CanvasTexture for Hilltop City Lights
 * (dark asphalt road grid, charcoal city blocks, dark highland foliage patches, subtle distant street micro-specks).
 */
export function getHilltopUrbanLandmassTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (hilltopLandmassTextureCache) return hilltopLandmassTextureCache;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Deep matte dark soil / asphalt base (zero bright sheen)
    ctx.fillStyle = '#121720';
    ctx.fillRect(0, 0, size, size);

    // Organic dark highland foliage & ridge soil patches
    for (let i = 0; i < 42; i++) {
      const px = hash2Periodic(i, 3, 64, 701) * size;
      const py = hash2Periodic(i, 11, 64, 709) * size;
      const rx = 22 + hash2Periodic(i, 19, 64, 719) * 58;
      const ry = 18 + hash2Periodic(i, 23, 64, 727) * 48;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(20, 35, 29, 0.52)' : 'rgba(24, 30, 40, 0.45)';
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, (i * 0.41) % Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Matte charcoal city blocks
    const blockStep = 32;
    for (let gx = 0; gx < size; gx += blockStep) {
      for (let gy = 0; gy < size; gy += blockStep) {
        const h = hash2Periodic(gx / blockStep, gy / blockStep, 16, 811);
        if (h < 0.22) {
          // Dark park/foliage pocket
          ctx.fillStyle = '#16241e';
        } else if (h < 0.65) {
          ctx.fillStyle = '#1a202b';
        } else {
          ctx.fillStyle = '#1f2633';
        }
        ctx.fillRect(gx + 3, gy + 3, blockStep - 6, blockStep - 6);

        // Subtle roof/courtyard sub-partition inside urban block
        if (h > 0.32) {
          ctx.fillStyle = '#141923';
          ctx.fillRect(gx + 7, gy + 7, blockStep - 16, blockStep - 16);
        }
      }
    }

    // Dark matte asphalt road grid (primary + secondary avenues)
    ctx.strokeStyle = '#0d1118';
    ctx.lineWidth = 4;
    for (let g = 0; g <= size; g += blockStep) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(size, g);
      ctx.stroke();
    }
    ctx.strokeStyle = '#262b36';
    ctx.lineWidth = 1;
    for (let g = 0; g <= size; g += blockStep * 2) {
      ctx.beginPath();
      ctx.moveTo(g + 0.5, 0);
      ctx.lineTo(g + 0.5, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g + 0.5);
      ctx.lineTo(size, g + 0.5);
      ctx.stroke();
    }

    // Subtle distant warm amber & soft sodium street micro-specks along avenues
    for (let i = 0; i < 160; i++) {
      const roadLine = Math.floor(hash2Periodic(i, 7, 128, 907) * 16) * blockStep;
      const along = hash2Periodic(i, 13, 128, 919) * size;
      const horiz = i % 2 === 0;
      const sx = horiz ? along : roadLine + (hash2Periodic(i, 29, 128, 937) - 0.5) * 4;
      const sy = horiz ? roadLine + (hash2Periodic(i, 31, 128, 941) - 0.5) * 4 : along;
      const warm = hash2Periodic(i, 37, 128, 947) > 0.25;
      ctx.fillStyle = warm ? 'rgba(255, 198, 118, 0.55)' : 'rgba(176, 214, 255, 0.36)';
      ctx.fillRect(sx, sy, 1.6, 1.6);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 7);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  hilltopLandmassTextureCache = tex;
  return tex;
}
