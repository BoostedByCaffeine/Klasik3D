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

let cagsawaStoneTextureCache: MountainSurfaceTextureSet | null = null;

/**
 * Cached non-repeating 1024x512 matte aerial valley floor CanvasTexture for Hilltop City Lights:
 * vast dark natural highland open ground across the valley & flanks with organically feathered
 * urbanization patches concentrated beneath the downtown building clusters and viaduct corridor
 * (zero repeating tile grid!).
 */
export function getHilltopUrbanLandmassTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (hilltopLandmassTextureCache) return hilltopLandmassTextureCache;

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // 1. Vast dark natural highland open-ground base (deep matte earth / nocturnal scrubland)
    const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
    baseGrad.addColorStop(0, '#0f1817'); // Near shoreline/far valley mist
    baseGrad.addColorStop(0.55, '#121c18'); // Central natural basin
    baseGrad.addColorStop(1, '#162119'); // Foreground ridge foothill skirt
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Organic large-scale dark highland terrain patches (hillsides, wooded ravines, open meadow clearings)
    for (let i = 0; i < 95; i++) {
      const px = hash2Periodic(i, 3, 128, 701) * width;
      const py = hash2Periodic(i, 11, 128, 709) * height;
      const rx = 38 + hash2Periodic(i, 19, 128, 719) * 115;
      const ry = 22 + hash2Periodic(i, 23, 128, 727) * 68;
      const tone = i % 3;
      const grad = ctx.createRadialGradient(px, py, rx * 0.08, px, py, rx);
      if (tone === 0) {
        grad.addColorStop(0, 'rgba(22, 39, 28, 0.56)');
        grad.addColorStop(1, 'rgba(22, 39, 28, 0)');
      } else if (tone === 1) {
        grad.addColorStop(0, 'rgba(27, 34, 29, 0.48)');
        grad.addColorStop(1, 'rgba(27, 34, 29, 0)');
      } else {
        grad.addColorStop(0, 'rgba(13, 21, 22, 0.52)');
        grad.addColorStop(1, 'rgba(13, 21, 22, 0)');
      }
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((i * 0.53) % Math.PI);
      ctx.scale(1, ry / rx);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Localized Urbanization Patches concentrated organically under the actual downtown & midtown clusters
    // Plane spans x in [-190, +190], z in [-124 (top v=0) .. +4 (bottom v=1)]
    // Downtown towers cluster around x in [-68..+68], z in [-108..-42] => u in [0.32..0.68], v in [0.12..0.64]
    const urbanDistricts: Array<{ cx: number; cy: number; rx: number; ry: number; density: number }> = [
      { cx: 0.50 * width, cy: 0.34 * height, rx: 145, ry: 76, density: 1.0 }, // Central downtown core
      { cx: 0.37 * width, cy: 0.42 * height, rx: 112, ry: 62, density: 0.85 }, // West commercial district
      { cx: 0.63 * width, cy: 0.40 * height, rx: 118, ry: 64, density: 0.88 }, // East skyline cluster
      { cx: 0.45 * width, cy: 0.56 * height, rx: 95, ry: 44, density: 0.72 }, // Near viaduct neighborhood
      { cx: 0.57 * width, cy: 0.58 * height, rx: 88, ry: 42, density: 0.68 }, // East viaduct sub-patch
      { cx: 0.28 * width, cy: 0.48 * height, rx: 72, ry: 38, density: 0.50 }, // Outer west foothill hamlet
      { cx: 0.72 * width, cy: 0.49 * height, rx: 76, ry: 38, density: 0.52 }, // Outer east foothill hamlet
    ];

    urbanDistricts.forEach((d, dIdx) => {
      // Soft feathered matte asphalt/concrete urban ground footprint
      const padGrad = ctx.createRadialGradient(d.cx, d.cy, d.rx * 0.14, d.cx, d.cy, d.rx);
      padGrad.addColorStop(0, `rgba(27, 32, 42, ${0.86 * d.density})`);
      padGrad.addColorStop(0.58, `rgba(22, 27, 35, ${0.62 * d.density})`);
      padGrad.addColorStop(1, 'rgba(18, 24, 28, 0)');
      ctx.save();
      ctx.translate(d.cx, d.cy);
      ctx.scale(1, d.ry / d.rx);
      ctx.fillStyle = padGrad;
      ctx.beginPath();
      ctx.arc(0, 0, d.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Organic micro-blocks & dark rooftop pads strictly inside each urban patch (no uniform full-valley tiling!)
      const parcelCount = Math.round(28 * d.density);
      for (let p = 0; p < parcelCount; p++) {
        const ang = hash2Periodic(dIdx * 31 + p, 5, 128, 811) * Math.PI * 2;
        const rad = Math.sqrt(hash2Periodic(dIdx * 31 + p, 13, 128, 823)) * 0.82;
        const bx = d.cx + Math.cos(ang) * d.rx * rad;
        const by = d.cy + Math.sin(ang) * d.ry * rad;
        const bw = 5 + hash2Periodic(p, dIdx + 17, 64, 839) * 12;
        const bh = 4 + hash2Periodic(p, dIdx + 29, 64, 853) * 9;
        ctx.fillStyle = p % 3 === 0 ? 'rgba(34, 41, 54, 0.72)' : 'rgba(24, 30, 40, 0.78)';
        ctx.fillRect(bx - bw * 0.5, by - bh * 0.5, bw, bh);
      }

      // Subtle warm sodium-vapor micro-light clusters nested inside each urbanized pocket
      const lightCount = Math.round(42 * d.density);
      for (let l = 0; l < lightCount; l++) {
        const ang = hash2Periodic(dIdx * 47 + l, 9, 128, 907) * Math.PI * 2;
        const rad = Math.sqrt(hash2Periodic(dIdx * 47 + l, 21, 128, 919)) * 0.86;
        const lx = d.cx + Math.cos(ang) * d.rx * rad;
        const ly = d.cy + Math.sin(ang) * d.ry * rad;
        const warm = hash2Periodic(l, dIdx + 37, 128, 947) > 0.22;
        ctx.fillStyle = warm ? 'rgba(255, 200, 120, 0.62)' : 'rgba(182, 218, 255, 0.34)';
        ctx.fillRect(lx, ly, 1.8, 1.8);
      }
    });

    // 4. Organic curving arterial road ribbons linking the urban patches (instead of a rigid tiled grid)
    ctx.lineCap = 'round';
    const drawArterial = (
      pts: Array<[number, number]>,
      roadWidth: number,
      glowAlpha: number
    ) => {
      ctx.strokeStyle = 'rgba(13, 16, 22, 0.85)';
      ctx.lineWidth = roadWidth;
      ctx.beginPath();
      pts.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();

      ctx.strokeStyle = `rgba(245, 190, 102, ${glowAlpha})`;
      ctx.lineWidth = Math.max(1.0, roadWidth * 0.22);
      ctx.beginPath();
      pts.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    };

    drawArterial(
      [
        [0.18 * width, 0.56 * height],
        [0.34 * width, 0.48 * height],
        [0.50 * width, 0.44 * height],
        [0.66 * width, 0.46 * height],
        [0.82 * width, 0.54 * height],
      ],
      6.5,
      0.24
    );
    drawArterial(
      [
        [0.26 * width, 0.63 * height],
        [0.44 * width, 0.58 * height],
        [0.58 * width, 0.57 * height],
        [0.74 * width, 0.62 * height],
      ],
      4.5,
      0.19
    );
    drawArterial(
      [
        [0.41 * width, 0.22 * height],
        [0.43 * width, 0.40 * height],
        [0.46 * width, 0.60 * height],
      ],
      4.0,
      0.16
    );
    drawArterial(
      [
        [0.58 * width, 0.21 * height],
        [0.56 * width, 0.41 * height],
        [0.54 * width, 0.60 * height],
      ],
      4.0,
      0.16
    );
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  hilltopLandmassTextureCache = tex;
  return tex;
}

/**
 * Cached 512x512 procedural weathered volcanic-adobe stone & moss texture set
 * for the historic Cagsawa Church Belfry Ruins in Mayon Volcano View.
 */
export function getCagsawaRuinStoneTexture(): MountainSurfaceTextureSet {
  const bumpScale = 0.85;
  if (typeof document === 'undefined') {
    return { map: null, bumpMap: null, bumpScale, dispose: () => {} };
  }
  if (cagsawaStoneTextureCache) return cagsawaStoneTextureCache;

  const size = 512;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  if (aCtx && bCtx) {
    // Warm weathered volcanic-tuff mortar base
    aCtx.fillStyle = '#524b42';
    aCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#383838';
    bCtx.fillRect(0, 0, size, size);

    // Irregular hand-hewn adobe / volcanic stone courses
    const rows = 14;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const offset = (r % 2) * 28 + hash2Periodic(r, 3, 32, 601) * 14;
      const cols = 7;
      const colW = size / cols;
      for (let c = -1; c <= cols; c++) {
        const h = hash2Periodic(c + 2, r, 32, 617);
        const h2 = hash2Periodic(c + 5, r + 7, 32, 631);
        const x = c * colW + offset;
        const w = colW - 4.5;
        const bh = rowH - 4.2;

        // Individual volcanic stone hue variation (warm grey-ochre, weathered tan, dark basalt stone)
        const baseL = 104 + Math.floor(h * 38);
        const rCol = clampByte(baseL + 10);
        const gCol = clampByte(baseL + 2);
        const bCol = clampByte(baseL - 10);
        aCtx.fillStyle = `rgb(${rCol},${gCol},${bCol})`;
        aCtx.fillRect(x + 2, y + 2, w, bh);

        // Chipped bevel & weathered inner pitting
        aCtx.fillStyle = `rgba(38, 33, 28, ${0.14 + h2 * 0.22})`;
        aCtx.fillRect(x + 2, y + 2 + bh * 0.65, w, bh * 0.35);

        // Raised stone block height in bump map
        const bVal = clampByte(150 + h * 75);
        bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
        bCtx.fillRect(x + 2.5, y + 2.5, w - 1, bh - 1);
      }
    }

    // Tropical rain-water vertical weathering streaks
    for (let s = 0; s < 44; s++) {
      const sx = hash2Periodic(s, 11, 64, 653) * size;
      const sy = hash2Periodic(s, 19, 64, 661) * size * 0.65;
      const sh = 65 + hash2Periodic(s, 29, 64, 673) * 185;
      const sw = 2.5 + hash2Periodic(s, 31, 64, 683) * 7.5;
      const streakGrad = aCtx.createLinearGradient(sx, sy, sx, sy + sh);
      streakGrad.addColorStop(0, 'rgba(34, 31, 26, 0.36)');
      streakGrad.addColorStop(1, 'rgba(34, 31, 26, 0)');
      aCtx.fillStyle = streakGrad;
      aCtx.fillRect(sx, sy, sw, sh);
    }

    // Creeping tropical moss & lichen blotches along joints and lower stone courses
    for (let m = 0; m < 38; m++) {
      const mx = hash2Periodic(m, 7, 64, 701) * size;
      const my = (0.35 + hash2Periodic(m, 13, 64, 709) * 0.65) * size;
      const mr = 8 + hash2Periodic(m, 23, 64, 719) * 24;
      const mossGrad = aCtx.createRadialGradient(mx, my, mr * 0.1, mx, my, mr);
      mossGrad.addColorStop(0, 'rgba(63, 104, 48, 0.56)');
      mossGrad.addColorStop(0.6, 'rgba(54, 86, 42, 0.28)');
      mossGrad.addColorStop(1, 'rgba(54, 86, 42, 0)');
      aCtx.fillStyle = mossGrad;
      aCtx.beginPath();
      aCtx.arc(mx, my, mr, 0, Math.PI * 2);
      aCtx.fill();
    }
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1.5, 1.5);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(1.5, 1.5);
  bumpMap.anisotropy = 4;
  bumpMap.needsUpdate = true;

  const entry: MountainSurfaceTextureSet = {
    map,
    bumpMap,
    bumpScale,
    dispose: () => {
      if (cagsawaStoneTextureCache === entry) cagsawaStoneTextureCache = null;
      map.dispose();
      bumpMap.dispose();
    },
  };
  cagsawaStoneTextureCache = entry;
  return entry;
}
