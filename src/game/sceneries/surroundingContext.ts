import * as THREE from 'three';
import type { ClimateState, SceneryId } from '../sceneryData';
import { ROAD_ELEVATION_LAYERS } from '../outdoorLod';

export interface SurroundingContextHandle {
  update: (isNight: boolean, climateState: ClimateState) => void;
}

type FacadeStyle =
  | 'urban'
  | 'cyberpunk'
  | 'japanese'
  | 'parisian'
  | 'favela'
  | 'alpine_lodge';

interface ProceduralFacadeTextures {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
}

/**
 * Generates paired procedural CanvasTexture albedo + emissive window maps for
 * architectural facades so zero neighboring or distant buildings ever appear as
 * bare untextured boxes, while keeping GPU draw calls minimal on mobile WebGL 2.
 */
export function createProceduralFacadeTextures(
  style: FacadeStyle,
  baseHex: string,
  accentHex: string
): ProceduralFacadeTextures | null {
  if (typeof document === 'undefined') return null;

  const w = 256;
  const h = 256;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = w;
  albedoCanvas.height = h;
  const ctx = albedoCanvas.getContext('2d');

  const emCanvas = document.createElement('canvas');
  emCanvas.width = w;
  emCanvas.height = h;
  const ectx = emCanvas.getContext('2d');

  if (!ctx || !ectx) return null;

  // Base wall coat
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural surface texture (brick courses, timber slats, limestone ashlar, cyber panels)
  if (style === 'japanese') {
    // Vertical cedar machiya plank siding + plaster upper frieze
    ctx.fillStyle = '#3b261b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ede3d2';
    ctx.fillRect(0, 0, w, 46);
    ctx.strokeStyle = 'rgba(20, 12, 8, 0.45)';
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, 46);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    // Horizontal dark timber beams
    ctx.fillStyle = '#241710';
    ctx.fillRect(0, 44, w, 8);
    ctx.fillRect(0, 146, w, 8);
  } else if (style === 'cyberpunk') {
    ctx.fillStyle = '#111629';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x < w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  } else if (style === 'parisian') {
    // Haussmann cream limestone horizontal coursing + stone belt courses
    ctx.strokeStyle = 'rgba(110, 95, 76, 0.22)';
    ctx.lineWidth = 1.5;
    for (let y = 0; y < h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 250, 240, 0.45)';
    ctx.fillRect(0, 82, w, 6);
    ctx.fillRect(0, 168, w, 6);
  } else if (style === 'favela') {
    // Textured plaster & exposed brick patches
    ctx.fillStyle = 'rgba(120, 53, 15, 0.16)';
    for (let i = 0; i < 18; i++) {
      ctx.fillRect((i * 47) % w, (i * 31) % h, 26, 14);
    }
    ctx.strokeStyle = 'rgba(40, 25, 18, 0.16)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else {
    // Urban brick/stucco + floor stringcourses
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(0, 84, w, 5);
    ctx.fillRect(0, 170, w, 5);
  }

  // Emissive map starts pitch black (unlit wall)
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, w, h);

  // Draw detailed multi-story windows (with mullions / koushi lattice / shutters / cyber glow)
  const cols = style === 'japanese' ? 3 : 4;
  const rows = 3;
  const padX = 14;
  const colW = (w - padX * 2) / cols;
  const rowH = (h - 24) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = r * 17 + c * 31 + style.length * 7;
      const wx = padX + c * colW + 8;
      const wy = 16 + r * rowH + 10;
      const ww = colW - 16;
      const wh = rowH - 22;
      const isLit = style === 'cyberpunk' ? seed % 3 !== 0 : seed % 4 !== 1;

      if (style === 'japanese') {
        // Warm backlit Shoji paper sliding screen + wooden koushi lattice grid
        ctx.fillStyle = '#f5e6c8';
        ctx.fillRect(wx, wy, ww, wh);
        ectx.fillStyle = isLit ? '#f59e0b' : '#4a2c0c';
        ectx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);

        // Dark cedar frame & crisp koushi lattice bars
        ctx.strokeStyle = '#24160e';
        ctx.lineWidth = 3;
        ctx.strokeRect(wx, wy, ww, wh);
        ctx.lineWidth = 1.6;
        for (let lx = wx + 8; lx < wx + ww; lx += 8) {
          ctx.beginPath();
          ctx.moveTo(lx, wy);
          ctx.lineTo(lx, wy + wh);
          ctx.stroke();
          ectx.fillStyle = '#000000';
          ectx.fillRect(lx - 1, wy, 2, wh);
        }
        for (let ly = wy + 12; ly < wy + wh; ly += 12) {
          ctx.beginPath();
          ctx.moveTo(wx, ly);
          ctx.lineTo(wx + ww, ly);
          ctx.stroke();
          ectx.fillStyle = '#000000';
          ectx.fillRect(wx, ly - 1, ww, 2);
        }
      } else if (style === 'cyberpunk') {
        const neonColor = seed % 2 === 0 ? '#22d3ee' : seed % 3 === 0 ? '#f472b6' : '#fbbf24';
        ctx.fillStyle = isLit ? neonColor : '#1e293b';
        ctx.fillRect(wx, wy, ww, wh * 0.72);
        if (isLit) {
          ectx.fillStyle = neonColor;
          ectx.fillRect(wx + 1, wy + 1, ww - 2, wh * 0.72 - 2);
        }
        ctx.strokeStyle = '#090d1a';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(wx, wy, ww, wh * 0.72);
      } else if (style === 'parisian') {
        // Tall French windows with dark wrought-iron Juliet balcony rail
        ctx.fillStyle = '#232934';
        ctx.fillRect(wx, wy - 2, ww, wh + 6);
        ctx.fillStyle = isLit ? '#fde68a' : '#475569';
        ctx.fillRect(wx + 3, wy + 1, ww - 6, wh);
        if (isLit) {
          ectx.fillStyle = '#fbbf24';
          ectx.fillRect(wx + 3, wy + 1, ww - 6, wh);
        }
        // French mullions
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wx + ww / 2, wy);
        ctx.lineTo(wx + ww / 2, wy + wh);
        ctx.moveTo(wx, wy + wh * 0.45);
        ctx.lineTo(wx + ww, wy + wh * 0.45);
        ctx.stroke();
        // Wrought-iron balcony bar across lower 30%
        ctx.fillStyle = '#18181b';
        ctx.fillRect(wx - 3, wy + wh * 0.7, ww + 6, 3);
        for (let bx = wx - 1; bx <= wx + ww + 1; bx += 5) {
          ctx.fillRect(bx, wy + wh * 0.7, 1.5, wh * 0.34);
        }
      } else {
        // Urban / Favela / Alpine windows with trim sill + frame + glass panes
        ctx.fillStyle = '#1f242b';
        ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
        ctx.fillStyle = isLit ? '#fef3c7' : '#334155';
        ctx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        if (isLit) {
          ectx.fillStyle = seed % 5 === 0 ? '#93c5fd' : '#f59e0b';
          ectx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        }
        // Center mullion
        ctx.fillStyle = '#1f242b';
        ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
        ctx.fillRect(wx, wy + wh / 2 - 1, ww, 2);
        // Stone/timber sill below window
        ctx.fillStyle = accentHex;
        ctx.fillRect(wx - 4, wy + wh + 1, ww + 8, 5);
      }
    }
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const emissiveMap = new THREE.CanvasTexture(emCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;

  return { map, emissiveMap };
}

/**
 * Mounts a continuous 360-degree surrounding ground skirt, distant horizon wrap,
 * high-detail neighboring storefronts (zero bare boxes), and biome-matched
 * -X / +X road-end visual terminators across all 9 sceneries.
 */
export function addSurrounding360Context(
  root: THREE.Group,
  sceneryId: SceneryId
): SurroundingContextHandle {
  const ctxGroup = new THREE.Group();
  ctxGroup.name = `surrounding_360_${sceneryId}`;
  root.add(ctxGroup);

  const warmWindowMats: THREE.MeshStandardMaterial[] = [];
  const facadeEmissiveMats: THREE.MeshStandardMaterial[] = [];
  const winterGroundMats: Array<{ mat: THREE.MeshStandardMaterial; summerHex: number; winterHex: number }> = [];
  const winterFoliageMats: Array<{ mat: THREE.MeshStandardMaterial; summerHex: number; winterHex: number }> = [];
  const neonAccentMats: THREE.MeshBasicMaterial[] = [];

  // 1. Continuous 360-Degree Biome Ground Skirt
  // IMPORTANT: On elevated cliffside/overlook maps (hilltop_city_lights, switzerland_hilltop, eiffel_tower),
  // keep the y = -0.11 terrace ground strictly BEHIND the overlook drop-off (z >= -17.8) and place
  // a deep basin floor at y = -36..-42 so nothing ever covers the deep valley lights, Paris basin, or alpine lake!
  const isDeepDropOverlook =
    sceneryId === 'hilltop_city_lights' ||
    sceneryId === 'switzerland_hilltop' ||
    sceneryId === 'eiffel_tower';

  const groundColors: Record<SceneryId, { summer: number; winter: number; horizonDay: number; horizonNight: number }> = {
    busy_street: { summer: 0x353b44, winter: 0x353b44, horizonDay: 0x9fb4c7, horizonNight: 0x0e1526 },
    mayon_volcano: { summer: 0x356d33, winter: 0x356d33, horizonDay: 0xb7dcd6, horizonNight: 0x0f1a2a },
    hilltop_city_lights: { summer: 0x22382a, winter: 0x22382a, horizonDay: 0x9fb8cf, horizonNight: 0x080f1f },
    japanese_tranquility: { summer: 0x45494e, winter: 0x45494e, horizonDay: 0xebd7e3, horizonNight: 0x111626 },
    brazilian_favela: { summer: 0x4b5c37, winter: 0x4b5c37, horizonDay: 0xbdd7f0, horizonNight: 0x0e172a },
    cyberpunk_neon: { summer: 0x090c18, winter: 0x090c18, horizonDay: 0x131733, horizonNight: 0x050714 },
    eiffel_tower: { summer: 0x5d646d, winter: 0xdbe7f3, horizonDay: 0xcbd8e6, horizonNight: 0x0d1324 },
    switzerland_hilltop: { summer: 0x386e3d, winter: 0xeaf2fb, horizonDay: 0xc5ddf5, horizonNight: 0x0c1628 },
    mt_everest: { summer: 0xeef6ff, winter: 0xeef6ff, horizonDay: 0xcfe4fa, horizonNight: 0x0b162a },
  };

  const gSpec = groundColors[sceneryId];
  const groundSkirtMat = new THREE.MeshStandardMaterial({
    color: gSpec.summer,
    roughness: 0.92,
    metalness: 0.04,
  });
  if (gSpec.summer !== gSpec.winter) {
    winterGroundMats.push({
      mat: groundSkirtMat,
      summerHex: gSpec.summer,
      winterHex: gSpec.winter,
    });
  }

  if (isDeepDropOverlook) {
    // Upper terrace skirt strictly behind the overlook railing (z = -17.6 to +165)
    const upperTerrace = new THREE.Mesh(new THREE.PlaneGeometry(360, 182), groundSkirtMat);
    upperTerrace.rotation.x = -Math.PI / 2;
    upperTerrace.position.set(0, -0.12, 73.4);
    ctxGroup.add(upperTerrace);

    // Deep lower valley/basin floor spanning 360° far below the cliffside
    const deepFloorY = sceneryId === 'eiffel_tower' ? -14.5 : -38.0;
    const deepFloorMat = new THREE.MeshStandardMaterial({
      color:
        sceneryId === 'hilltop_city_lights'
          ? 0x101824
          : sceneryId === 'switzerland_hilltop'
          ? 0x2a5434
          : 0x4a5058,
      roughness: 0.94,
    });
    if (sceneryId === 'switzerland_hilltop') {
      winterGroundMats.push({ mat: deepFloorMat, summerHex: 0x2a5434, winterHex: 0xdce8f4 });
    }
    const deepFloor = new THREE.Mesh(new THREE.CircleGeometry(210, 48), deepFloorMat);
    deepFloor.rotation.x = -Math.PI / 2;
    deepFloor.position.set(0, deepFloorY, -24);
    ctxGroup.add(deepFloor);
  } else {
    // Continuous flat 360° perimeter ground skirt cleanly below asphalt (y = -0.12)
    const groundSkirt = new THREE.Mesh(new THREE.CircleGeometry(195, 48), groundSkirtMat);
    groundSkirt.rotation.x = -Math.PI / 2;
    groundSkirt.position.set(0, -0.12, -18);
    ctxGroup.add(groundSkirt);
  }

  // Horizon atmospheric blend cylinder matching lower sky dome band
  const horizonBandMat = new THREE.MeshBasicMaterial({
    color: gSpec.horizonDay,
    side: THREE.BackSide,
    transparent: true,
    opacity: sceneryId === 'cyberpunk_neon' ? 0.52 : 0.44,
    depthWrite: false,
  });
  const horizonBand = new THREE.Mesh(
    new THREE.CylinderGeometry(182, 182, 34, 36, 1, true),
    horizonBandMat
  );
  horizonBand.position.set(0, 13.0, -18);
  ctxGroup.add(horizonBand);

  const dummy = new THREE.Object3D();

  // Shared procedural facade textures per biome for zero untextured boxes
  const facadeStyle: FacadeStyle =
    sceneryId === 'cyberpunk_neon'
      ? 'cyberpunk'
      : sceneryId === 'japanese_tranquility'
      ? 'japanese'
      : sceneryId === 'eiffel_tower'
      ? 'parisian'
      : sceneryId === 'brazilian_favela'
      ? 'favela'
      : sceneryId === 'busy_street'
      ? 'urban'
      : 'alpine_lodge';

  const baseFacadeHex =
    sceneryId === 'cyberpunk_neon'
      ? '#161b2e'
      : sceneryId === 'japanese_tranquility'
      ? '#442b1e'
      : sceneryId === 'eiffel_tower'
      ? '#dcd0be'
      : sceneryId === 'brazilian_favela'
      ? '#e2c4a8'
      : '#c2b6a6';
  const accentFacadeHex =
    sceneryId === 'cyberpunk_neon'
      ? '#06b6d4'
      : sceneryId === 'eiffel_tower'
      ? '#475569'
      : '#57534e';

  const sharedFacadeTex = createProceduralFacadeTextures(facadeStyle, baseFacadeHex, accentFacadeHex);

  const acUnitMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6, metalness: 0.3 });
  const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.45, metalness: 0.65 });
  const waterTankMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.42, metalness: 0.12 });

  // Helper: High-detail immediate neighboring storefront flush beside Klasik Cafe (-X or +X)
  const addCornerNeighborStorefront = (opts: {
    xCenter: number;
    width: number;
    height: number;
    depth: number;
    zCenter: number;
    wallHex: number;
    plinthHex: number;
    awningHex: number;
    corniceHex: number;
    windowEmissiveHex: number;
    isJapanese?: boolean;
    isParisian?: boolean;
    isCyberpunk?: boolean;
    isFavela?: boolean;
    neonHex?: number;
    norenHex?: number;
  }) => {
    const g = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({
      color: opts.wallHex,
      map: sharedFacadeTex?.map ?? undefined,
      emissive: opts.isCyberpunk ? (opts.neonHex ?? 0x06b6d4) : 0xf59e0b,
      emissiveMap: sharedFacadeTex?.emissiveMap ?? undefined,
      emissiveIntensity: opts.isCyberpunk ? 0.65 : 0.22,
      roughness: 0.82,
    });
    facadeEmissiveMats.push(wallMat);

    const plinthMat = new THREE.MeshStandardMaterial({ color: opts.plinthHex, roughness: 0.72 });
    const corniceMat = new THREE.MeshStandardMaterial({ color: opts.corniceHex, roughness: 0.72 });
    const awningMat = new THREE.MeshStandardMaterial({ color: opts.awningHex, roughness: 0.74 });
    const awningStripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.78 });
    const winMat = new THREE.MeshStandardMaterial({
      color: opts.isCyberpunk ? 0x0f2b3c : 0x3b2c1a,
      emissive: opts.windowEmissiveHex,
      emissiveIntensity: 0.24,
      roughness: 0.18,
      metalness: 0.15,
    });
    warmWindowMats.push(winMat);

    // Solid building volume embedded to y = -0.18
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(opts.width, opts.height + 0.18, opts.depth),
      wallMat
    );
    body.position.set(0, (opts.height - 0.18) / 2, 0);
    g.add(body);

    // Ground floor storefront plinth & recessed entry framing
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(opts.width + 0.08, 2.42, opts.depth + 0.08),
      plinthMat
    );
    plinth.position.set(0, 1.18, 0);
    g.add(plinth);

    const frontZ = -opts.depth / 2;

    // Ground-floor storefront display window + door + mullion frame
    const shopWin = new THREE.Mesh(
      new THREE.PlaneGeometry(opts.width * 0.56, 1.48),
      winMat
    );
    shopWin.rotation.y = Math.PI;
    shopWin.position.set(-opts.width * 0.12, 1.2, frontZ - 0.055);
    g.add(shopWin);

    // Recessed shop doorway on right side
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.05, 0.12), darkIronMat);
    door.position.set(opts.width * 0.31, 1.02, frontZ - 0.02);
    g.add(door);

    // Mullion frame over shop window (koushi wood grid for Kyoto, iron bars otherwise)
    if (opts.isJapanese) {
      const cedarBarMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.8 });
      const barCount = 7;
      for (let b = 0; b < barCount; b++) {
        const bx = -opts.width * 0.12 - opts.width * 0.26 + (b / (barCount - 1)) * (opts.width * 0.52);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.52, 0.06), cedarBarMat);
        bar.position.set(bx, 1.2, frontZ - 0.075);
        g.add(bar);
      }
      // Split hanging Noren doorway curtain
      const norenMat = new THREE.MeshStandardMaterial({
        color: opts.norenHex ?? 0x1e3a5f,
        roughness: 0.85,
        side: THREE.DoubleSide,
      });
      for (let n = 0; n < 3; n++) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.56, 0.03), norenMat);
        panel.position.set(opts.width * 0.31 - 0.34 + n * 0.34, 1.98, frontZ - 0.14);
        g.add(panel);
      }
      // Warm hanging Chochin paper lantern under eave
      const chochinMat = new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: 0xf97316,
        emissiveIntensity: 1.35,
        roughness: 0.35,
      });
      warmWindowMats.push(chochinMat);
      [-opts.width * 0.36, opts.width * 0.36].forEach((lx) => {
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 9, 8), chochinMat);
        lantern.scale.set(0.82, 1.35, 0.82);
        lantern.position.set(lx, 2.02, frontZ - 0.45);
        g.add(lantern);
      });
    } else {
      // Architectural iron mullion frame & transom divider over shop display window
      const shopWinW = opts.width * 0.56;
      const shopWinCx = -opts.width * 0.12;
      const transom = new THREE.Mesh(
        new THREE.BoxGeometry(shopWinW + 0.08, 0.06, 0.06),
        darkIronMat
      );
      transom.position.set(shopWinCx, 1.56, frontZ - 0.072);
      g.add(transom);
      const sill = new THREE.Mesh(
        new THREE.BoxGeometry(shopWinW + 0.1, 0.08, 0.09),
        darkIronMat
      );
      sill.position.set(shopWinCx, 0.46, frontZ - 0.072);
      g.add(sill);
      for (const frac of [-0.5, -0.16, 0.16, 0.5]) {
        const mullion = new THREE.Mesh(
          new THREE.BoxGeometry(0.055, 1.52, 0.06),
          darkIronMat
        );
        mullion.position.set(shopWinCx + frac * shopWinW, 1.2, frontZ - 0.072);
        g.add(mullion);
      }

      // Striped shop awning with side brackets
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(opts.width - 0.24, 0.18, 0.94),
        awningMat
      );
      awning.rotation.x = -0.26;
      awning.position.set(0, 2.38, frontZ - 0.4);
      g.add(awning);

      // Decorative white stripes along awning
      const stripeCount = Math.max(3, Math.floor(opts.width));
      for (let st = 0; st < stripeCount; st += 2) {
        const sx = -opts.width * 0.42 + (st / stripeCount) * (opts.width * 0.84);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.19, 0.95), awningStripeMat);
        stripe.rotation.x = -0.26;
        stripe.position.set(sx, 2.385, frontZ - 0.4);
        g.add(stripe);
      }
    }

    // Upper-floor architectural windows, sills, Juliet balconies, and AC compressor units
    const cols = opts.width >= 5.2 ? 3 : 2;
    const floors = opts.height >= 6.4 ? 2 : 1;
    const spanX = opts.width * 0.62;
    for (let fl = 0; fl < floors; fl++) {
      const wy = 3.6 + fl * 1.72;
      if (wy > opts.height - 0.7) continue;
      for (let c = 0; c < cols; c++) {
        const wx = -spanX / 2 + (c / (cols - 1)) * spanX;
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.08), winMat);
        pane.rotation.y = Math.PI;
        pane.position.set(wx, wy, frontZ - 0.05);
        g.add(pane);

        const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.1, 0.16), corniceMat);
        frameTop.position.set(wx, wy + 0.56, frontZ - 0.06);
        g.add(frameTop);

        const sill = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.12, 0.2), corniceMat);
        sill.position.set(wx, wy - 0.58, frontZ - 0.08);
        g.add(sill);

        if (opts.isParisian) {
          // Wrought-iron Juliet balcony rail & red geranium flower box
          const rail = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.34, 0.06), darkIronMat);
          rail.position.set(wx, wy - 0.36, frontZ - 0.16);
          g.add(rail);
        }
      }
    }

    // Wall-mounted AC unit or vertical shop signboard
    if (!opts.isParisian && !opts.isJapanese) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.42, 0.34), acUnitMat);
      ac.position.set(opts.width * 0.38, 3.1, frontZ - 0.18);
      g.add(ac);
    }
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1.45, 0.56),
      opts.isCyberpunk && opts.neonHex
        ? new THREE.MeshBasicMaterial({ color: opts.neonHex })
        : awningMat
    );
    signBoard.position.set(-opts.width * 0.46, 3.5, frontZ - 0.38);
    g.add(signBoard);

    // Biome-accurate Roof Treatment
    if (opts.isJapanese) {
      // Curved dark kawara tiled eave over ground floor + pitched tiled roof
      const midEave = new THREE.Mesh(
        new THREE.BoxGeometry(opts.width + 0.35, 0.18, 1.05),
        corniceMat
      );
      midEave.rotation.x = -0.28;
      midEave.position.set(0, 2.52, frontZ - 0.42);
      g.add(midEave);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(opts.width, opts.depth) * 0.74, 1.75, 4),
        corniceMat
      );
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(
        (opts.width / Math.max(opts.width, opts.depth)) * 1.08,
        1,
        (opts.depth / Math.max(opts.width, opts.depth)) * 1.08
      );
      roof.position.y = opts.height + 0.82;
      g.add(roof);
    } else if (opts.isParisian) {
      // Dark-slate mansard roof + terracotta chimney pots
      const mansard = new THREE.Mesh(
        new THREE.CylinderGeometry(opts.width * 0.44, opts.width * 0.62, 1.65, 4),
        corniceMat
      );
      mansard.rotation.y = Math.PI / 4;
      mansard.scale.set(1.16, 1, opts.depth / opts.width);
      mansard.position.y = opts.height + 0.8;
      g.add(mansard);
      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.95, 0.55),
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.88 })
      );
      chimney.position.set(opts.width * 0.24, opts.height + 1.55, 0);
      g.add(chimney);
    } else {
      const cornice = new THREE.Mesh(
        new THREE.BoxGeometry(opts.width + 0.26, 0.32, opts.depth + 0.26),
        corniceMat
      );
      cornice.position.y = opts.height + 0.14;
      g.add(cornice);

      if (opts.isFavela) {
        // Iconic blue rooftop water tank (caixa d'agua) + corrugated tin roof overhang
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.4, 0.72, 10), waterTankMat);
        tank.position.set(-opts.width * 0.2, opts.height + 0.65, -opts.depth * 0.18);
        g.add(tank);
      } else {
        // Rooftop HVAC penthouse box
        const hvac = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 1.2), acUnitMat);
        hvac.position.set(opts.width * 0.18, opts.height + 0.62, 0.4);
        g.add(hvac);
      }
    }

    if (opts.isCyberpunk && opts.neonHex) {
      const neonMat = new THREE.MeshBasicMaterial({ color: opts.neonHex });
      neonAccentMats.push(neonMat);
      const vStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, opts.height * 0.76, 0.16),
        neonMat
      );
      vStrip.position.set(opts.width * 0.44, opts.height * 0.54, frontZ - 0.12);
      g.add(vStrip);
      const hSign = new THREE.Mesh(
        new THREE.BoxGeometry(opts.width * 0.58, 0.48, 0.14),
        neonMat
      );
      hSign.position.set(0, 2.86, frontZ - 0.18);
      g.add(hSign);
    }

    g.position.set(opts.xCenter, 0, opts.zCenter);
    ctxGroup.add(g);
  };

  // =========================================================================
  // 2. BIOME-SPECIFIC IMMEDIATE FLANKING STRUCTURES + 360° PERIMETER WRAP
  // =========================================================================

  const isUrbanArchitecture =
    sceneryId === 'busy_street' ||
    sceneryId === 'cyberpunk_neon' ||
    sceneryId === 'japanese_tranquility' ||
    sceneryId === 'eiffel_tower' ||
    sceneryId === 'brazilian_favela';

  if (isUrbanArchitecture) {
    // Extended Left & Right Sidewalks + Road Continuation beyond main avenue
    const extSidewalkMat = new THREE.MeshStandardMaterial({
      color:
        sceneryId === 'cyberpunk_neon'
          ? 0x181e2e
          : sceneryId === 'japanese_tranquility'
          ? 0x5c6066
          : 0x8d95a0,
      roughness: 0.86,
    });
    const extAsphaltMat = new THREE.MeshStandardMaterial({
      color: sceneryId === 'cyberpunk_neon' ? 0x0d1120 : 0x262a31,
      roughness: 0.82,
    });
    if (sceneryId === 'eiffel_tower') {
      winterGroundMats.push({ mat: extSidewalkMat, summerHex: 0x8d95a0, winterHex: 0xdce8f4 });
    }

    // Extended sidewalk wings starting past main sidewalk (x = ±22 to ±64) with zero overlap
    [-43, 43].forEach((sx) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(42, 0.12, 2.2), extSidewalkMat);
      sw.position.set(sx, ROAD_ELEVATION_LAYERS.sidewalkTopY - 0.06, -8.2);
      ctxGroup.add(sw);
      const farSw = new THREE.Mesh(new THREE.BoxGeometry(42, 0.12, 2.2), extSidewalkMat);
      farSw.position.set(sx, ROAD_ELEVATION_LAYERS.sidewalkTopY - 0.06, -16.9);
      ctxGroup.add(farSw);
      const roadWing = new THREE.Mesh(new THREE.PlaneGeometry(42, 6.6), extAsphaltMat);
      roadWing.rotation.x = -Math.PI / 2;
      roadWing.position.set(sx, ROAD_ELEVATION_LAYERS.asphaltY - 0.004, -12.55);
      ctxGroup.add(roadWing);
    });

    // Immediate Flush Flanking Buildings directly touching Klasik Cafe's left (-5.8) and right (+5.8) sides
    if (sceneryId === 'busy_street') {
      addCornerNeighborStorefront({
        xCenter: -8.75,
        width: 5.8,
        height: 6.4,
        depth: 10.2,
        zCenter: -1.1,
        wallHex: 0x8a5846,
        plinthHex: 0x22262b,
        awningHex: 0x14532d,
        corniceHex: 0x57534e,
        windowEmissiveHex: 0xf59e0b,
      });
      addCornerNeighborStorefront({
        xCenter: -14.7,
        width: 5.9,
        height: 7.4,
        depth: 9.8,
        zCenter: -1.3,
        wallHex: 0xc8b59b,
        plinthHex: 0x27272a,
        awningHex: 0x7f1d1d,
        corniceHex: 0x6b7280,
        windowEmissiveHex: 0xfbbf24,
      });
      addCornerNeighborStorefront({
        xCenter: 8.75,
        width: 5.8,
        height: 6.0,
        depth: 10.2,
        zCenter: -1.1,
        wallHex: 0x556458,
        plinthHex: 0x22262b,
        awningHex: 0x92400e,
        corniceHex: 0x64748b,
        windowEmissiveHex: 0xf59e0b,
      });
      addCornerNeighborStorefront({
        xCenter: 14.7,
        width: 5.9,
        height: 7.1,
        depth: 9.8,
        zCenter: -1.3,
        wallHex: 0x526071,
        plinthHex: 0x1f2937,
        awningHex: 0x1e3a8a,
        corniceHex: 0x6b7280,
        windowEmissiveHex: 0x38bdf8,
      });
    } else if (sceneryId === 'cyberpunk_neon') {
      addCornerNeighborStorefront({
        xCenter: -8.8,
        width: 5.9,
        height: 11.8,
        depth: 10.4,
        zCenter: -1.0,
        wallHex: 0x171c2e,
        plinthHex: 0x0f1220,
        awningHex: 0x0e7490,
        corniceHex: 0x262e47,
        windowEmissiveHex: 0x06b6d4,
        isCyberpunk: true,
        neonHex: 0x06b6d4,
      });
      addCornerNeighborStorefront({
        xCenter: -15.0,
        width: 6.2,
        height: 15.2,
        depth: 10.0,
        zCenter: -1.2,
        wallHex: 0x121628,
        plinthHex: 0x0b0e1a,
        awningHex: 0x9d174d,
        corniceHex: 0x1e253d,
        windowEmissiveHex: 0xec4899,
        isCyberpunk: true,
        neonHex: 0xec4899,
      });
      addCornerNeighborStorefront({
        xCenter: 8.8,
        width: 5.9,
        height: 12.6,
        depth: 10.4,
        zCenter: -1.0,
        wallHex: 0x161b2d,
        plinthHex: 0x0f1220,
        awningHex: 0x7e22ce,
        corniceHex: 0x262e47,
        windowEmissiveHex: 0xa855f7,
        isCyberpunk: true,
        neonHex: 0x38bdf8,
      });
      addCornerNeighborStorefront({
        xCenter: 15.0,
        width: 6.2,
        height: 14.8,
        depth: 10.0,
        zCenter: -1.2,
        wallHex: 0x121628,
        plinthHex: 0x0b0e1a,
        awningHex: 0x0e7490,
        corniceHex: 0x1e253d,
        windowEmissiveHex: 0xf59e0b,
        isCyberpunk: true,
        neonHex: 0xf59e0b,
      });
    } else if (sceneryId === 'japanese_tranquility') {
      addCornerNeighborStorefront({
        xCenter: -8.65,
        width: 5.6,
        height: 5.5,
        depth: 10.0,
        zCenter: -1.1,
        wallHex: 0xd8c7b0,
        plinthHex: 0x3b261b,
        awningHex: 0x262b33,
        corniceHex: 0x242a34,
        windowEmissiveHex: 0xf59e0b,
        isJapanese: true,
        norenHex: 0x1e3a5f,
      });
      addCornerNeighborStorefront({
        xCenter: -14.4,
        width: 5.7,
        height: 6.1,
        depth: 9.6,
        zCenter: -1.3,
        wallHex: 0xcfbb9f,
        plinthHex: 0x442b1e,
        awningHex: 0x1f242c,
        corniceHex: 0x1f242c,
        windowEmissiveHex: 0xf59e0b,
        isJapanese: true,
        norenHex: 0x2f5a38,
      });
      addCornerNeighborStorefront({
        xCenter: 8.65,
        width: 5.6,
        height: 5.6,
        depth: 10.0,
        zCenter: -1.1,
        wallHex: 0xd8c7b0,
        plinthHex: 0x3b261b,
        awningHex: 0x262b33,
        corniceHex: 0x242a34,
        windowEmissiveHex: 0xf59e0b,
        isJapanese: true,
        norenHex: 0x7c2d12,
      });
      addCornerNeighborStorefront({
        xCenter: 14.4,
        width: 5.7,
        height: 5.9,
        depth: 9.6,
        zCenter: -1.3,
        wallHex: 0xcfbb9f,
        plinthHex: 0x3b261b,
        awningHex: 0x1f242c,
        corniceHex: 0x1f242c,
        windowEmissiveHex: 0xf59e0b,
        isJapanese: true,
        norenHex: 0x1e3a5f,
      });
    } else if (sceneryId === 'eiffel_tower') {
      addCornerNeighborStorefront({
        xCenter: -8.75,
        width: 5.8,
        height: 6.8,
        depth: 10.2,
        zCenter: -1.1,
        wallHex: 0xe2d4bf,
        plinthHex: 0x2a2d34,
        awningHex: 0x7f1d1d,
        corniceHex: 0x3b4858,
        windowEmissiveHex: 0xf59e0b,
        isParisian: true,
      });
      addCornerNeighborStorefront({
        xCenter: -14.8,
        width: 6.0,
        height: 7.4,
        depth: 9.8,
        zCenter: -1.3,
        wallHex: 0xd8c8b0,
        plinthHex: 0x28323e,
        awningHex: 0x1e3a8a,
        corniceHex: 0x3b4858,
        windowEmissiveHex: 0xfbbf24,
        isParisian: true,
      });
      addCornerNeighborStorefront({
        xCenter: 8.75,
        width: 5.8,
        height: 6.6,
        depth: 10.2,
        zCenter: -1.1,
        wallHex: 0xe2d4bf,
        plinthHex: 0x2a2d34,
        awningHex: 0x14532d,
        corniceHex: 0x3b4858,
        windowEmissiveHex: 0xf59e0b,
        isParisian: true,
      });
      addCornerNeighborStorefront({
        xCenter: 14.8,
        width: 6.0,
        height: 7.2,
        depth: 9.8,
        zCenter: -1.3,
        wallHex: 0xd8c8b0,
        plinthHex: 0x28323e,
        awningHex: 0x7f1d1d,
        corniceHex: 0x3b4858,
        windowEmissiveHex: 0xfbbf24,
        isParisian: true,
      });
    } else {
      // Brazilian Favela colorful corner bakeries & terraced homes
      addCornerNeighborStorefront({
        xCenter: -8.6,
        width: 5.5,
        height: 5.6,
        depth: 9.8,
        zCenter: -1.1,
        wallHex: 0xe07a5f,
        plinthHex: 0x9a3412,
        awningHex: 0x0d9488,
        corniceHex: 0x57534e,
        windowEmissiveHex: 0xfbbf24,
        isFavela: true,
      });
      addCornerNeighborStorefront({
        xCenter: -14.3,
        width: 5.6,
        height: 6.8,
        depth: 9.4,
        zCenter: -1.3,
        wallHex: 0x14b8a6,
        plinthHex: 0x115e59,
        awningHex: 0xeab308,
        corniceHex: 0x57534e,
        windowEmissiveHex: 0xf59e0b,
        isFavela: true,
      });
      addCornerNeighborStorefront({
        xCenter: 8.6,
        width: 5.5,
        height: 5.8,
        depth: 9.8,
        zCenter: -1.1,
        wallHex: 0xeab308,
        plinthHex: 0x854d0e,
        awningHex: 0x2563eb,
        corniceHex: 0x57534e,
        windowEmissiveHex: 0xfbbf24,
        isFavela: true,
      });
      addCornerNeighborStorefront({
        xCenter: 14.3,
        width: 5.6,
        height: 6.5,
        depth: 9.4,
        zCenter: -1.3,
        wallHex: 0x3b82f6,
        plinthHex: 0x1e3a8a,
        awningHex: 0xf97316,
        corniceHex: 0x57534e,
        windowEmissiveHex: 0xf59e0b,
        isFavela: true,
      });
    }

    // Instanced Textured 360° Perimeter Neighborhood Blocks + Rooftop Parapets (Zero Blank Boxes!)
    const blockSpecs: Array<[number, number, number, number, number]> = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const bx = side * (20.8 + i * 6.4);
        const bh =
          sceneryId === 'cyberpunk_neon'
            ? 16 + ((i * 5) % 18)
            : 6.2 + ((i * 3) % 4) * 1.3;
        blockSpecs.push([bx, -1.6, 5.9, bh, 9.2]);
        if (sceneryId === 'busy_street' || sceneryId === 'cyberpunk_neon' || sceneryId === 'japanese_tranquility') {
          blockSpecs.push([bx, -21.0, 5.9, bh * 1.05, 6.4]);
        }
      }
    }
    // Rear city blocks behind the cafe (+Z = +11 to +38)
    for (let row = 0; row < 2; row++) {
      for (let col = -6; col <= 6; col++) {
        const bx = col * 7.2 + (row % 2) * 3.1;
        const bz = 11.8 + row * 12.2;
        const bh =
          sceneryId === 'cyberpunk_neon'
            ? 18 + ((Math.abs(col) * 4 + row * 7) % 20)
            : 6.8 + ((Math.abs(col) * 3 + row * 2) % 5) * 1.5;
        blockSpecs.push([bx, bz, 6.4, bh, 7.6]);
      }
    }

    const blockMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: sharedFacadeTex?.map ?? undefined,
      emissive: sceneryId === 'cyberpunk_neon' ? 0x38bdf8 : 0xf59e0b,
      emissiveMap: sharedFacadeTex?.emissiveMap ?? undefined,
      emissiveIntensity: sceneryId === 'cyberpunk_neon' ? 0.72 : 0.25,
      roughness: 0.84,
    });
    facadeEmissiveMats.push(blockMat);

    const blocksInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      blockMat,
      blockSpecs.length
    );
    const parapetMat = new THREE.MeshStandardMaterial({
      color: sceneryId === 'eiffel_tower' ? 0x3b4858 : sceneryId === 'cyberpunk_neon' ? 0x1f2937 : 0x4b5563,
      roughness: 0.78,
    });
    const parapetsInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.05, 0.36, 1.05),
      parapetMat,
      blockSpecs.length
    );

    const paletteMap: Record<string, number[]> = {
      busy_street: [0xc9a993, 0xa8b3c2, 0xd8c3a5, 0x9bb0a2, 0xb89c88, 0xb3a99f],
      cyberpunk_neon: [0x9aa9d4, 0x8d97c7, 0x7c86ba, 0xa28cc7],
      japanese_tranquility: [0xd9ccb8, 0xc9b8a0, 0xbfa990, 0xd4c3ac],
      eiffel_tower: [0xefe5d5, 0xe6d9c5, 0xddd0ba, 0xeae2d4],
      brazilian_favela: [0xf4a261, 0xf6bd60, 0x2ec4b6, 0xe76f51, 0x60a5fa, 0xf472b6],
    };
    const pal = (paletteMap[sceneryId] || paletteMap.busy_street).map((h) => new THREE.Color(h));

    blockSpecs.forEach(([bx, bz, bw, bh, bd], idx) => {
      dummy.position.set(bx, bh / 2 - 0.12, bz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(bw, bh, bd);
      dummy.updateMatrix();
      blocksInst.setMatrixAt(idx, dummy.matrix);
      blocksInst.setColorAt(idx, pal[idx % pal.length]);

      dummy.position.set(bx, bh + 0.04, bz);
      dummy.scale.set(bw, 1, bd);
      dummy.updateMatrix();
      parapetsInst.setMatrixAt(idx, dummy.matrix);
    });
    blocksInst.instanceMatrix.needsUpdate = true;
    if (blocksInst.instanceColor) blocksInst.instanceColor.needsUpdate = true;
    parapetsInst.instanceMatrix.needsUpdate = true;
    ctxGroup.add(blocksInst, parapetsInst);

    // =========================================================================
    // PHASE 2.1: BIOME-MATCHED -X & +X ROAD-END VISUAL TERMINATORS (ZERO VOID!)
    // =========================================================================
    if (sceneryId === 'busy_street') {
      // Cross-street T-intersection buildings spanning across z = -12.5 + traffic signal gantries + distant skyline
      [-54, 54].forEach((endX) => {
        const sign = Math.sign(endX);
        // Cross-street corner mid-rise spanning right across the road corridor
        const tBldg = new THREE.Mesh(new THREE.BoxGeometry(11, 16, 26), blockMat);
        tBldg.position.set(endX + sign * 6, 7.8, -12.5);
        ctxGroup.add(tBldg);
        const tRoof = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.5, 26.6), parapetMat);
        tRoof.position.set(endX + sign * 6, 16.0, -12.5);
        ctxGroup.add(tRoof);

        // Second tall skyline backdrop tower behind T-intersection
        const skyTower = new THREE.Mesh(new THREE.BoxGeometry(14, 28, 22), blockMat);
        skyTower.position.set(endX + sign * 18, 13.8, -10.0);
        ctxGroup.add(skyTower);

        // Overhead street gantry / traffic light arch framing the intersection
        [-8.8, -16.2].forEach((pz) => {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6.2, 8), darkIronMat);
          pole.position.set(endX - sign * 5, 3.1, pz);
          ctxGroup.add(pole);
        });
        const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 8.2), darkIronMat);
        crossBeam.position.set(endX - sign * 5, 5.9, -12.5);
        ctxGroup.add(crossBeam);

        // Glowing green/amber traffic signals hanging from gantry
        const signalBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.36), darkIronMat);
        signalBox.position.set(endX - sign * 5, 5.35, -12.5);
        ctxGroup.add(signalBox);
        const greenLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0x22c55e })
        );
        greenLight.position.set(endX - sign * 5.2, 5.15, -12.5);
        ctxGroup.add(greenLight);
      });
    } else if (sceneryId === 'cyberpunk_neon') {
      // Towering elevated maglev skybridges, stacked megastructure arches & glowing arcology towers closing both ends!
      const megaSteelMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.45,
        metalness: 0.65,
      });
      const cyanNeon = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const magentaNeon = new THREE.MeshBasicMaterial({ color: 0xec4899 });
      neonAccentMats.push(cyanNeon, magentaNeon);

      [-48, 48].forEach((endX, sIdx) => {
        const sign = Math.sign(endX);
        // Elevated dual-deck highway / maglev skybridge spanning across the avenue
        const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.2, 34), megaSteelMat);
        bridgeDeck.position.set(endX, 11.2, -12.5);
        ctxGroup.add(bridgeDeck);
        const bridgeRail = new THREE.Mesh(
          new THREE.BoxGeometry(5.7, 0.25, 34),
          sIdx === 0 ? cyanNeon : magentaNeon
        );
        bridgeRail.position.set(endX, 12.45, -12.5);
        ctxGroup.add(bridgeRail);

        // Upper second skybridge
        const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 36), megaSteelMat);
        upperDeck.position.set(endX + sign * 8, 22.5, -12.5);
        ctxGroup.add(upperDeck);
        const upperGlow = new THREE.Mesh(
          new THREE.BoxGeometry(4.4, 0.24, 36),
          sIdx === 0 ? magentaNeon : cyanNeon
        );
        upperGlow.position.set(endX + sign * 8, 21.6, -12.5);
        ctxGroup.add(upperGlow);

        // Massive arcology megastructure wall closing off the far road horizon
        const arcology = new THREE.Mesh(new THREE.BoxGeometry(16, 48, 36), blockMat);
        arcology.position.set(endX + sign * 18, 23.8, -12.5);
        ctxGroup.add(arcology);

        const holoPanel = new THREE.Mesh(
          new THREE.PlaneGeometry(14, 9),
          new THREE.MeshBasicMaterial({
            color: sIdx === 0 ? 0x06b6d4 : 0xec4899,
            transparent: true,
            opacity: 0.72,
            side: THREE.DoubleSide,
          })
        );
        holoPanel.rotation.y = Math.PI / 2;
        holoPanel.position.set(endX + sign * 9.5, 16.5, -12.5);
        ctxGroup.add(holoPanel);
      });
    } else if (sceneryId === 'japanese_tranquility') {
      // Primary (-X) road end: Grand Vermilion Torii Gate, stone steps, sakura trees, multi-tiered pagoda & misty Higashiyama hill!
      const toriiRedMat = new THREE.MeshStandardMaterial({ color: 0xc8281c, roughness: 0.62 });
      const stoneStepMat = new THREE.MeshStandardMaterial({ color: 0x73787d, roughness: 0.92 });
      const sakuraPinkMat = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.85 });
      const hillMat = new THREE.MeshStandardMaterial({ color: 0x284b36, roughness: 0.92, flatShading: true });
      const pagodaRoofMat = new THREE.MeshStandardMaterial({ color: 0x262b33, roughness: 0.78 });
      const pagodaWallMat = new THREE.MeshStandardMaterial({ color: 0xf1e6d2, roughness: 0.84 });

      // Grand Vermilion Torii Gate spanning across the -X Kyoto stone lane
      const toriiX = -42;
      [-3.1, 3.1].forEach((dz) => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 7.6, 10), toriiRedMat);
        pillar.position.set(toriiX, 3.8, -12.5 + dz);
        ctxGroup.add(pillar);
        const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.75, 10), stoneStepMat);
        plinth.position.set(toriiX, 0.35, -12.5 + dz);
        ctxGroup.add(plinth);
      });
      const kasagi = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 9.2), toriiRedMat);
      kasagi.position.set(toriiX, 7.55, -12.5);
      ctxGroup.add(kasagi);
      const kasagiCap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.25, 9.6), pagodaRoofMat);
      kasagiCap.position.set(toriiX, 7.9, -12.5);
      ctxGroup.add(kasagiCap);
      const nuki = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 7.8), toriiRedMat);
      nuki.position.set(toriiX, 6.2, -12.5);
      ctxGroup.add(nuki);

      // Ascending stone shrine steps beyond Torii gate
      for (let st = 0; st < 7; st++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 8.6), stoneStepMat);
        step.position.set(toriiX - 3.5 - st * 1.5, 0.25 + st * 0.45, -12.5);
        ctxGroup.add(step);
      }

      // Multi-tiered Kyoto wooden pagoda rising behind the Torii gate
      const pagodaGroup = new THREE.Group();
      for (let t = 0; t < 4; t++) {
        const sz = 4.6 - t * 0.65;
        const ty = 2.8 + t * 2.55;
        const tierCore = new THREE.Mesh(new THREE.BoxGeometry(sz, 1.85, sz), pagodaWallMat);
        tierCore.position.y = ty;
        pagodaGroup.add(tierCore);
        const tierRoof = new THREE.Mesh(new THREE.ConeGeometry(sz * 0.96, 1.05, 4), pagodaRoofMat);
        tierRoof.rotation.y = Math.PI / 4;
        tierRoof.position.y = ty + 1.18;
        pagodaGroup.add(tierRoof);
      }
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 3.2, 7), toriiRedMat);
      spire.position.y = 14.5;
      pagodaGroup.add(spire);
      pagodaGroup.position.set(-57, 2.2, -12.5);
      ctxGroup.add(pagodaGroup);

      // Lush Higashiyama forested hills + blooming sakura trees closing BOTH -X and +X lane ends
      [
        [-72, -12, 34, 24],
        [-64, -36, 30, 20],
        [68, -12, 32, 22],
        [62, -34, 28, 19],
      ].forEach(([hx, hz, hr, hh]) => {
        const hill = new THREE.Mesh(new THREE.ConeGeometry(hr, hh, 8), hillMat);
        hill.position.set(hx, hh * 0.42 - 2, hz);
        ctxGroup.add(hill);
      });

      // Blooming sakura trees flanking Torii & opposite (+X) stone canal curve
      [
        [-38, -7.8],
        [-38, -17.2],
        [-47, -6.5],
        [-47, -18.5],
        [44, -8.4],
        [44, -16.8],
      ].forEach(([sx, sz]) => {
        const tr = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.28, 3.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x4b3121, roughness: 0.9 })
        );
        tr.position.set(sx, 1.7, sz);
        ctxGroup.add(tr);
        const bl = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 1), sakuraPinkMat);
        bl.scale.set(1.2, 0.78, 1.1);
        bl.position.set(sx, 4.1, sz);
        ctxGroup.add(bl);
      });

      // Opposite (+X) lane bend: curving machiya facade + canal bridge railing closing off +X
      const curveHouse = new THREE.Mesh(new THREE.BoxGeometry(9, 7.2, 18), blockMat);
      curveHouse.position.set(51, 3.5, -12.5);
      curveHouse.rotation.y = 0.22;
      ctxGroup.add(curveHouse);
      const curveRoof = new THREE.Mesh(new THREE.ConeGeometry(12, 2.8, 4), pagodaRoofMat);
      curveRoof.rotation.y = Math.PI / 4 + 0.22;
      curveRoof.scale.set(0.65, 1, 1.18);
      curveRoof.position.set(51, 8.4, -12.5);
      ctxGroup.add(curveRoof);
    } else if (sceneryId === 'eiffel_tower') {
      // Grand Parisian Haussmann corner apartments & mansard blocks closing both -X and +X street ends
      [-52, 52].forEach((endX) => {
        const sign = Math.sign(endX);
        const cornerBlock = new THREE.Mesh(new THREE.BoxGeometry(10, 11.5, 24), blockMat);
        cornerBlock.position.set(endX + sign * 5, 5.6, -12.5);
        ctxGroup.add(cornerBlock);
        const mansard = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 11.5, 2.8, 4), parapetMat);
        mansard.rotation.y = Math.PI / 4;
        mansard.scale.set(0.75, 1, 1.45);
        mansard.position.set(endX + sign * 5, 12.6, -12.5);
        ctxGroup.add(mansard);
      });
    } else if (sceneryId === 'brazilian_favela') {
      // Curving terraced favela hillside slopes + stacked colorful houses closing both -X and +X corners
      const rioHillMat = new THREE.MeshStandardMaterial({ color: 0x3a6432, roughness: 0.92, flatShading: true });
      [-50, 50].forEach((endX) => {
        const sign = Math.sign(endX);
        const slope = new THREE.Mesh(new THREE.ConeGeometry(28, 22, 8), rioHillMat);
        slope.position.set(endX + sign * 12, 8.5, -12.5);
        ctxGroup.add(slope);
        for (let step = 0; step < 3; step++) {
          const house = new THREE.Mesh(new THREE.BoxGeometry(7.2, 5.2 + step * 1.4, 9.5), blockMat);
          house.position.set(endX + sign * (step * 4.5), 2.4 + step * 2.8, -12.5 + (step - 1) * 4.5);
          ctxGroup.add(house);
        }
      });
    }
  } else {
    // =========================================================================
    // NATURE / ALPINE / SCENIC 360° FLANKING STRUCTURES, CABINS & ROAD-END CLOSURE
    // (Switzerland Hilltop, Mt. Everest, Mayon Volcano, Hilltop City Lights)
    // =========================================================================
    const isSnowBiome = sceneryId === 'mt_everest' || sceneryId === 'switzerland_hilltop';
    const isTropical = sceneryId === 'mayon_volcano';

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6b4528,
      map: sharedFacadeTex?.map ?? undefined,
      emissive: 0xf59e0b,
      emissiveMap: sharedFacadeTex?.emissiveMap ?? undefined,
      emissiveIntensity: 0.24,
      roughness: 0.84,
    });
    facadeEmissiveMats.push(woodMat);

    const stoneWallMat = new THREE.MeshStandardMaterial({
      color: isSnowBiome ? 0x64748b : 0x70675c,
      roughness: 0.92,
    });
    const cabinRoofMat = new THREE.MeshStandardMaterial({
      color: sceneryId === 'mt_everest' ? 0xf1f7ff : isTropical ? 0x7a5634 : 0x334155,
      roughness: 0.8,
    });
    if (sceneryId === 'switzerland_hilltop') {
      winterGroundMats.push({ mat: cabinRoofMat, summerHex: 0x5c3424, winterHex: 0xf1f7ff });
    }
    const cabinWinMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
      roughness: 0.25,
    });
    warmWindowMats.push(cabinWinMat);

    // Grounded Stone Retaining Walls / Terrace Parapets flanking cafe's left & right corners
    [-11.8, 11.8].forEach((wx) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.72, 0.55), stoneWallMat);
      wall.position.set(wx, 0.3, -6.4);
      ctxGroup.add(wall);
    });

    // Immediate Flanking Grounded Timber Chalets / Highland Cafes / Himalayan Teahouses
    const flankCabins: Array<{ x: number; z: number; w: number; h: number; d: number; rotY: number }> = [
      { x: -9.6, z: -1.1, w: 6.4, h: 4.5, d: 8.6, rotY: 0 },
      { x: -16.8, z: -2.0, w: 5.8, h: 4.2, d: 7.4, rotY: 0.14 },
      { x: 9.6, z: -1.1, w: 6.4, h: 4.5, d: 8.6, rotY: 0 },
      { x: 16.8, z: -2.0, w: 5.8, h: 4.1, d: 7.4, rotY: -0.14 },
      { x: -7.5, z: 10.6, w: 7.2, h: 4.8, d: 6.8, rotY: 0.1 },
      { x: 7.8, z: 11.2, w: 7.4, h: 4.6, d: 6.8, rotY: -0.1 },
    ];
    const geraniumMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.8 });
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });

    flankCabins.forEach((c) => {
      const cg = new THREE.Group();
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(c.w + 0.24, 1.35, c.d + 0.24), stoneWallMat);
      plinth.position.y = 0.54;
      cg.add(plinth);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h - 0.9, c.d), woodMat);
      upper.position.y = 1.18 + (c.h - 0.9) / 2;
      cg.add(upper);
      // Timber veranda balcony + overhang
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(c.w * 0.85, 0.14, 0.85), stoneWallMat);
      balcony.position.set(0, 2.0, -c.d / 2 - 0.38);
      cg.add(balcony);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(c.w * 0.85, 0.42, 0.08), woodMat);
      rail.position.set(0, 2.28, -c.d / 2 - 0.76);
      cg.add(rail);
      if (sceneryId === 'switzerland_hilltop') {
        const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(c.w * 0.65, 0.2, 0.22), geraniumMat);
        flowerBox.position.set(0, 2.52, -c.d / 2 - 0.78);
        cg.add(flowerBox);
      }
      // Pitched alpine/tropical roof + stone chimney
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(c.w, c.d) * 0.8, 2.35, 4),
        cabinRoofMat
      );
      roof.rotation.y = Math.PI / 4;
      roof.scale.set((c.w / Math.max(c.w, c.d)) * 1.14, 1, (c.d / Math.max(c.w, c.d)) * 1.14);
      roof.position.y = c.h + 1.08;
      cg.add(roof);
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.35, 0.55), chimneyMat);
      chimney.position.set(c.w * 0.24, c.h + 1.75, 0.4);
      cg.add(chimney);

      [-c.w * 0.24, c.w * 0.24].forEach((wx) => {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), cabinWinMat);
        win.rotation.y = Math.PI;
        win.position.set(wx, 2.65, -c.d / 2 - 0.05);
        cg.add(win);
      });
      cg.position.set(c.x, -0.08, c.z);
      cg.rotation.y = c.rotY;
      ctxGroup.add(cg);
    });

    // Instanced Multi-Tier Biome Trees Wrapping Left, Right, Rear, and Closing Both Road Ends (-X / +X)
    const treeCoords: Array<[number, number, number]> = [];
    for (let i = 0; i < 46; i++) {
      const ang = (i / 46) * Math.PI * 2;
      if (Math.sin(ang) < -0.45 && Math.abs(Math.cos(ang)) < 0.7) continue;
      const radius = 19 + (i % 4) * 7.5;
      const tx = Math.cos(ang) * radius;
      const tz = Math.sin(ang) * radius + 1.5;
      if (Math.abs(tx) < 13 && tz > -9 && tz < 7) continue;
      treeCoords.push([tx, tz, 0.85 + (i % 4) * 0.22]);
    }
    // Dense tree groves explicitly closing the -X and +X road ends (x = ±36..±54, z = -16..-8)
    [
      [-13.4, -7.2, 1.05],
      [-6.5, -7.5, 0.92],
      [6.5, -7.5, 0.95],
      [13.4, -7.2, 1.1],
      [-22.0, -9.5, 1.18],
      [22.0, -9.5, 1.16],
      [-36.0, -11.5, 1.35],
      [-40.5, -13.5, 1.45],
      [-45.0, -10.5, 1.4],
      [-48.0, -14.0, 1.5],
      [36.0, -11.5, 1.35],
      [40.5, -13.5, 1.45],
      [45.0, -10.5, 1.4],
      [48.0, -14.0, 1.5],
    ].forEach((pt) => treeCoords.push(pt as [number, number, number]));

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d26, roughness: 0.9 });
    const foliageHex =
      sceneryId === 'mt_everest'
        ? 0x2d594b
        : sceneryId === 'mayon_volcano'
        ? 0x2b7a37
        : 0x1b4d36;
    const foliageMat = new THREE.MeshStandardMaterial({ color: foliageHex, roughness: 0.86 });
    if (sceneryId === 'switzerland_hilltop') {
      winterFoliageMats.push({ mat: foliageMat, summerHex: 0x1b4d36, winterHex: 0x3b6e5c });
    }

    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.14, 0.24, isTropical ? 5.2 : 2.6, 6),
      trunkMat,
      treeCoords.length
    );
    const crownsLow = new THREE.InstancedMesh(
      isTropical
        ? new THREE.ConeGeometry(2.2, 1.45, 7)
        : new THREE.ConeGeometry(1.75, 3.2, 7),
      foliageMat,
      treeCoords.length
    );
    const crownsTop = new THREE.InstancedMesh(
      isTropical
        ? new THREE.ConeGeometry(1.5, 1.15, 7)
        : new THREE.ConeGeometry(1.25, 3.0, 7),
      foliageMat,
      treeCoords.length
    );

    const snowTipMat = new THREE.MeshStandardMaterial({ color: 0xf1f7ff, roughness: 0.85 });
    const snowTips = isSnowBiome
      ? new THREE.InstancedMesh(new THREE.ConeGeometry(0.95, 2.2, 7), snowTipMat, treeCoords.length)
      : null;

    treeCoords.forEach(([tx, tz, sc], idx) => {
      dummy.position.set(tx, (isTropical ? 2.5 : 1.2) * sc, tz);
      dummy.rotation.set(0, idx * 0.7, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      trunks.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tx, (isTropical ? 4.9 : 3.0) * sc, tz);
      dummy.rotation.set(0, idx * 1.1, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      crownsLow.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tx, (isTropical ? 5.6 : 4.5) * sc, tz);
      dummy.rotation.set(0, idx * 1.4, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      crownsTop.setMatrixAt(idx, dummy.matrix);

      if (snowTips) {
        dummy.position.set(tx, 5.2 * sc, tz);
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        snowTips.setMatrixAt(idx, dummy.matrix);
      }
    });
    trunks.instanceMatrix.needsUpdate = true;
    crownsLow.instanceMatrix.needsUpdate = true;
    crownsTop.instanceMatrix.needsUpdate = true;
    ctxGroup.add(trunks, crownsLow, crownsTop);
    if (snowTips) {
      snowTips.instanceMatrix.needsUpdate = true;
      ctxGroup.add(snowTips);
    }

    // Road-End Terrain Embankments / Rocky Outcrops closing BOTH -X and +X ends cleanly
    const ridgeRockMat = new THREE.MeshStandardMaterial({
      color: isSnowBiome ? 0x475569 : isTropical ? 0x2f6331 : 0x233834,
      roughness: 0.92,
      flatShading: true,
    });
    const ridgeSnowMat = new THREE.MeshStandardMaterial({
      color: 0xf1f7ff,
      roughness: 0.85,
      flatShading: true,
    });

    [-58, 58].forEach((endX) => {
      const bluff = new THREE.Mesh(new THREE.ConeGeometry(22, 16, 7), ridgeRockMat);
      bluff.position.set(endX, 6.2, -13.5);
      ctxGroup.add(bluff);
      if (isSnowBiome) {
        const bluffCap = new THREE.Mesh(new THREE.ConeGeometry(13, 9.5, 7), ridgeSnowMat);
        bluffCap.position.set(endX, 10.0, -13.5);
        ctxGroup.add(bluffCap);
      }
    });

    // 360° Distant Mountain / Ridge Ring wrapping Left, Right, and Rear
    const ringPeakCount = 16;
    for (let p = 0; p < ringPeakCount; p++) {
      const ang = (p / ringPeakCount) * Math.PI * 2;
      if (Math.sin(ang) < -0.55) continue;
      const dist = 96 + (p % 3) * 14;
      const px = Math.cos(ang) * dist;
      const pz = Math.sin(ang) * dist - 14;
      const radius = 26 + (p % 3) * 7;
      const height = isSnowBiome ? 38 + (p % 4) * 9 : 18 + (p % 4) * 5;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7), ridgeRockMat);
      peak.position.set(px, height * 0.42 - 2, pz);
      ctxGroup.add(peak);
      if (isSnowBiome) {
        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(radius * 0.56, height * 0.52, 7),
          ridgeSnowMat
        );
        cap.position.set(px, height * 0.66 - 2, pz);
        ctxGroup.add(cap);
      }
    }
  }

  return {
    update: (isNight: boolean, climateState: ClimateState) => {
      horizonBandMat.color.setHex(isNight ? gSpec.horizonNight : gSpec.horizonDay);
      for (const wm of warmWindowMats) {
        wm.emissiveIntensity = isNight ? 0.72 : 0.2;
      }
      for (const fm of facadeEmissiveMats) {
        fm.emissiveIntensity = sceneryId === 'cyberpunk_neon'
          ? isNight ? 1.15 : 0.68
          : isNight ? 1.05 : 0.18;
      }
      for (const item of winterGroundMats) {
        item.mat.color.setHex(climateState === 'winter' ? item.winterHex : item.summerHex);
      }
      for (const item of winterFoliageMats) {
        item.mat.color.setHex(climateState === 'winter' ? item.winterHex : item.summerHex);
      }
      for (const nm of neonAccentMats) {
        nm.opacity = isNight ? 1.0 : 0.84;
      }
    },
  };
}
