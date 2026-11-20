import * as THREE from 'three';
import type { ClimateState, SceneryId } from '../sceneryData';

export interface SurroundingContextHandle {
  update: (isNight: boolean, climateState: ClimateState) => void;
}

/**
 * Mounts a continuous 360-degree surrounding ground skirt, distant horizon wrap,
 * and scenery-matched flanking structures flush against Klasik Cafe's left (-X),
 * right (+X), and rear (+Z) exterior walls.
 *
 * Guarantees:
 * - Zero right-hand corner void behind the parked Miata on the 3D Title Screen.
 * - Zero "soap opera set" black void when rotating 360° in Outdoor Overlook Mode.
 * - Mobile APK GPU safety: repeated flank buildings/trees use InstancedMesh and castShadow = false.
 * - Clean disposal: every mesh/material/geometry belongs to `root` and is auto-disposed on scenery swap.
 */
export function addSurrounding360Context(
  root: THREE.Group,
  sceneryId: SceneryId
): SurroundingContextHandle {
  const ctxGroup = new THREE.Group();
  ctxGroup.name = `surrounding_360_${sceneryId}`;
  root.add(ctxGroup);

  const warmWindowMats: THREE.MeshStandardMaterial[] = [];
  const winterGroundMats: Array<{ mat: THREE.MeshStandardMaterial; summerHex: number; winterHex: number }> = [];
  const winterFoliageMats: Array<{ mat: THREE.MeshStandardMaterial; summerHex: number; winterHex: number }> = [];
  const neonAccentMats: THREE.MeshBasicMaterial[] = [];

  // 1. Continuous 360-Degree Biome Ground Skirt (radius = 185, centered slightly forward so it wraps front/sides/back)
  const groundColors: Record<SceneryId, { summer: number; winter: number; horizonDay: number; horizonNight: number }> = {
    busy_street: { summer: 0x383e46, winter: 0x383e46, horizonDay: 0x9fb4c7, horizonNight: 0x101828 },
    mayon_volcano: { summer: 0x366f34, winter: 0x366f34, horizonDay: 0xb7dcd6, horizonNight: 0x0f1a2a },
    hilltop_city_lights: { summer: 0x243b2c, winter: 0x243b2c, horizonDay: 0xb5cade, horizonNight: 0x0b1222 },
    japanese_tranquility: { summer: 0x45494e, winter: 0x45494e, horizonDay: 0xebd7e3, horizonNight: 0x121728 },
    brazilian_favela: { summer: 0x564638, winter: 0x564638, horizonDay: 0xc2d9f2, horizonNight: 0x0f172a },
    cyberpunk_neon: { summer: 0x0b0e19, winter: 0x0b0e19, horizonDay: 0x1a1e38, horizonNight: 0x070816 },
    eiffel_tower: { summer: 0x676b73, winter: 0xdbe7f3, horizonDay: 0xcfdbe8, horizonNight: 0x0e1426 },
    switzerland_hilltop: { summer: 0x3b7240, winter: 0xeaf2fb, horizonDay: 0xc7dff5, horizonNight: 0x0d1729 },
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

  // Note: y = -0.11 sits cleanly below the cafe micro-cement floor (y = 0) and patio/sidewalks
  // while filling 100% of the 360-degree horizon floor outside the building!
  const groundSkirt = new THREE.Mesh(new THREE.CircleGeometry(185, 48), groundSkirtMat);
  groundSkirt.rotation.x = -Math.PI / 2;
  groundSkirt.position.set(0, -0.11, -18);
  ctxGroup.add(groundSkirt);

  // Subtle 360-degree distant horizon mist skirt to prevent any hard sky-to-ground seam
  const horizonBandMat = new THREE.MeshBasicMaterial({
    color: gSpec.horizonDay,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const horizonBand = new THREE.Mesh(
    new THREE.CylinderGeometry(175, 175, 28, 36, 1, true),
    horizonBandMat
  );
  horizonBand.position.set(0, 11.5, -18);
  ctxGroup.add(horizonBand);

  const dummy = new THREE.Object3D();

  // Helper: Add a detailed immediate neighboring corner building flush beside the cafe (-X or +X)
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
    neonHex?: number;
  }) => {
    const g = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: opts.wallHex, roughness: 0.84 });
    const plinthMat = new THREE.MeshStandardMaterial({ color: opts.plinthHex, roughness: 0.72 });
    const corniceMat = new THREE.MeshStandardMaterial({ color: opts.corniceHex, roughness: 0.72 });
    const awningMat = new THREE.MeshStandardMaterial({ color: opts.awningHex, roughness: 0.76 });
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: opts.windowEmissiveHex,
      emissiveIntensity: 0.24,
      roughness: 0.22,
    });
    warmWindowMats.push(winMat);

    // Main solid building volume (embedded down to y = -0.15 for zero floating seam)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(opts.width, opts.height + 0.15, opts.depth),
      wallMat
    );
    body.position.set(0, (opts.height - 0.15) / 2, 0);
    g.add(body);

    // Ground floor storefront plinth
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(opts.width + 0.08, 2.35, opts.depth + 0.08),
      plinthMat
    );
    plinth.position.set(0, 1.15, 0);
    g.add(plinth);

    // Front face sits at local z = -opts.depth / 2 (facing -Z toward the avenue & Title Screen camera!)
    const frontZ = -opts.depth / 2;

    // Ground-floor glowing storefront display window
    const shopWin = new THREE.Mesh(
      new THREE.PlaneGeometry(opts.width * 0.62, 1.48),
      winMat
    );
    shopWin.rotation.y = Math.PI;
    shopWin.position.set(0, 1.18, frontZ - 0.055);
    g.add(shopWin);

    // Awning or traditional Japanese eave facing -Z
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(opts.width - 0.3, 0.18, 0.88),
      awningMat
    );
    awning.rotation.x = -0.26;
    awning.position.set(0, 2.32, frontZ - 0.36);
    g.add(awning);

    // Upper-floor windows facing -Z
    const cols = opts.width >= 5.2 ? 3 : 2;
    const floors = opts.height >= 6.4 ? 2 : 1;
    const spanX = opts.width * 0.62;
    for (let fl = 0; fl < floors; fl++) {
      const wy = 3.55 + fl * 1.65;
      if (wy > opts.height - 0.7) continue;
      for (let c = 0; c < cols; c++) {
        const wx = -spanX / 2 + (c / (cols - 1)) * spanX;
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.05), winMat);
        pane.rotation.y = Math.PI;
        pane.position.set(wx, wy, frontZ - 0.045);
        g.add(pane);

        const sill = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.1, 0.16), corniceMat);
        sill.position.set(wx, wy - 0.58, frontZ - 0.06);
        g.add(sill);
      }
    }

    // Roof treatment by architectural style
    if (opts.isJapanese) {
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(opts.width, opts.depth) * 0.72, 1.65, 4),
        corniceMat
      );
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(opts.width / Math.max(opts.width, opts.depth), 1, opts.depth / Math.max(opts.width, opts.depth));
      roof.position.y = opts.height + 0.78;
      g.add(roof);
    } else if (opts.isParisian) {
      const mansard = new THREE.Mesh(
        new THREE.CylinderGeometry(opts.width * 0.44, opts.width * 0.62, 1.5, 4),
        corniceMat
      );
      mansard.rotation.y = Math.PI / 4;
      mansard.scale.set(1.15, 1, opts.depth / opts.width);
      mansard.position.y = opts.height + 0.72;
      g.add(mansard);
    } else {
      const cornice = new THREE.Mesh(
        new THREE.BoxGeometry(opts.width + 0.24, 0.28, opts.depth + 0.24),
        corniceMat
      );
      cornice.position.y = opts.height + 0.12;
      g.add(cornice);
    }

    if (opts.isCyberpunk && opts.neonHex) {
      const neonMat = new THREE.MeshBasicMaterial({ color: opts.neonHex });
      neonAccentMats.push(neonMat);
      const vStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, opts.height * 0.72, 0.16),
        neonMat
      );
      vStrip.position.set(opts.width * 0.42, opts.height * 0.55, frontZ - 0.12);
      g.add(vStrip);
      const hSign = new THREE.Mesh(
        new THREE.BoxGeometry(opts.width * 0.52, 0.46, 0.14),
        neonMat
      );
      hSign.position.set(0, 2.82, frontZ - 0.18);
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
    // Extended Left & Right Sidewalks + Road Continuation so street runs seamlessly past camera frustum
    const extSidewalkMat = new THREE.MeshStandardMaterial({
      color:
        sceneryId === 'cyberpunk_neon'
          ? 0x1b2131
          : sceneryId === 'japanese_tranquility'
          ? 0x62666b
          : 0x8d95a0,
      roughness: 0.86,
    });
    const extAsphaltMat = new THREE.MeshStandardMaterial({
      color: sceneryId === 'cyberpunk_neon' ? 0x0f1322 : 0x262a31,
      roughness: 0.82,
    });
    if (sceneryId === 'eiffel_tower') {
      winterGroundMats.push({ mat: extSidewalkMat, summerHex: 0x8d95a0, winterHex: 0xdce8f4 });
    }

    // Left & Right extended sidewalk wings beyond x = ±19
    [-38, 38].forEach((sx) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(38, 0.12, 2.2), extSidewalkMat);
      sw.position.set(sx, 0.02, -8.2);
      ctxGroup.add(sw);
      const farSw = new THREE.Mesh(new THREE.BoxGeometry(38, 0.12, 2.2), extSidewalkMat);
      farSw.position.set(sx, 0.02, -16.9);
      ctxGroup.add(farSw);
      const roadWing = new THREE.Mesh(new THREE.PlaneGeometry(42, 6.6), extAsphaltMat);
      roadWing.rotation.x = -Math.PI / 2;
      roadWing.position.set(sx, -0.005, -12.55);
      ctxGroup.add(roadWing);
    });

    // Immediate Flush Flanking Buildings directly touching Klasik Cafe's left (-5.8) and right (+5.8) sides!
    // Left building (x = -5.85 to -11.65) sits directly behind the parked Miata in the 3D Title Screen right-hand corner!
    if (sceneryId === 'busy_street') {
      addCornerNeighborStorefront({
        xCenter: -8.75,
        width: 5.8,
        height: 6.4,
        depth: 10.2,
        zCenter: -1.1,
        wallHex: 0x7c4e3e,
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
        wallHex: 0x4b5563,
        plinthHex: 0x1f2937,
        awningHex: 0x1e3a8a,
        corniceHex: 0x6b7280,
        windowEmissiveHex: 0x38bdf8,
      });
    } else if (sceneryId === 'cyberpunk_neon') {
      addCornerNeighborStorefront({
        xCenter: -8.8,
        width: 5.9,
        height: 11.5,
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
        height: 15.0,
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
        height: 12.2,
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
        height: 14.4,
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
        wallHex: 0xede3d2,
        plinthHex: 0x3b261b,
        awningHex: 0x262b33,
        corniceHex: 0x262b33,
        windowEmissiveHex: 0xf59e0b,
        isJapanese: true,
      });
      addCornerNeighborStorefront({
        xCenter: -14.4,
        width: 5.7,
        height: 6.1,
        depth: 9.6,
        zCenter: -1.3,
        wallHex: 0xe6dac5,
        plinthHex: 0x442b1e,
        awningHex: 0x1f242c,
        corniceHex: 0x1f242c,
        windowEmissiveHex: 0xf59e0b,
        isJapanese: true,
      });
      addCornerNeighborStorefront({
        xCenter: 8.65,
        width: 5.6,
        height: 5.6,
        depth: 10.0,
        zCenter: -1.1,
        wallHex: 0xede3d2,
        plinthHex: 0x3b261b,
        awningHex: 0x262b33,
        corniceHex: 0x262b33,
        windowEmissiveHex: 0xf59e0b,
        isJapanese: true,
      });
      addCornerNeighborStorefront({
        xCenter: 14.4,
        width: 5.7,
        height: 5.9,
        depth: 9.6,
        zCenter: -1.3,
        wallHex: 0xe6dac5,
        plinthHex: 0x3b261b,
        awningHex: 0x1f242c,
        corniceHex: 0x1f242c,
        windowEmissiveHex: 0xf59e0b,
        isJapanese: true,
      });
    } else if (sceneryId === 'eiffel_tower') {
      addCornerNeighborStorefront({
        xCenter: -8.75,
        width: 5.8,
        height: 6.8,
        depth: 10.2,
        zCenter: -1.1,
        wallHex: 0xdccdb8,
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
        wallHex: 0xd4c3ab,
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
        wallHex: 0xdccdb8,
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
        wallHex: 0xd4c3ab,
        plinthHex: 0x28323e,
        awningHex: 0x7f1d1d,
        corniceHex: 0x3b4858,
        windowEmissiveHex: 0xfbbf24,
        isParisian: true,
      });
    } else {
      // Brazilian Favela colorful stepped flanking houses
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
      });
      addCornerNeighborStorefront({
        xCenter: -14.3,
        width: 5.6,
        height: 6.8,
        depth: 9.4,
        zCenter: -1.3,
        wallHex: 0x0d9488,
        plinthHex: 0x115e59,
        awningHex: 0xeab308,
        corniceHex: 0x57534e,
        windowEmissiveHex: 0xf59e0b,
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
      });
      addCornerNeighborStorefront({
        xCenter: 14.3,
        width: 5.6,
        height: 6.5,
        depth: 9.4,
        zCenter: -1.3,
        wallHex: 0x2563eb,
        plinthHex: 0x1e3a8a,
        awningHex: 0xf97316,
        corniceHex: 0x57534e,
        windowEmissiveHex: 0xf59e0b,
      });
    }

    // Instanced 360° Perimeter Neighborhood Blocks (Left far, Right far, and Rear behind cafe)
    const blockSpecs: Array<[number, number, number, number, number]> = [];
    // Far left & far right street rows
    for (let side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const bx = side * (20.8 + i * 6.4);
        const bh =
          sceneryId === 'cyberpunk_neon'
            ? 14 + ((i * 5) % 16)
            : 5.6 + ((i * 3) % 4) * 1.1;
        blockSpecs.push([bx, -1.6, 5.8, bh, 9.2]);
        // Opposite side continuation on busy_street / japanese / cyberpunk
        if (sceneryId === 'busy_street' || sceneryId === 'cyberpunk_neon') {
          blockSpecs.push([bx, -20.5, 5.8, bh * 1.05, 6.2]);
        }
      }
    }
    // Rear city blocks behind the cafe (+Z = +10.5 to +36) so Look Back / 360° turn has zero void
    for (let row = 0; row < 2; row++) {
      for (let col = -5; col <= 5; col++) {
        const bx = col * 7.2 + (row % 2) * 3.1;
        const bz = 11.8 + row * 12.0;
        const bh =
          sceneryId === 'cyberpunk_neon'
            ? 16 + ((Math.abs(col) * 4 + row * 7) % 18)
            : 6.5 + ((Math.abs(col) * 3 + row * 2) % 5) * 1.4;
        blockSpecs.push([bx, bz, 6.4, bh, 7.6]);
      }
    }

    const blockMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    const blocksInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      blockMat,
      blockSpecs.length
    );
    const paletteMap: Record<string, number[]> = {
      busy_street: [0x6d4c41, 0x4b5563, 0x8b5e4b, 0x566558, 0x7c5c4b, 0x5f554c],
      cyberpunk_neon: [0x14182b, 0x1b213b, 0x101424, 0x1f1938],
      japanese_tranquility: [0x3b261b, 0x4c3425, 0x574336, 0x352b26],
      eiffel_tower: [0xd9cbb8, 0xc9b9a3, 0xb8a894, 0xcfd6de],
      brazilian_favela: [0xe07a5f, 0xf97316, 0x0d9488, 0xeab308, 0x2563eb, 0xec4899],
    };
    const pal = (paletteMap[sceneryId] || paletteMap.busy_street).map((h) => new THREE.Color(h));

    blockSpecs.forEach(([bx, bz, bw, bh, bd], idx) => {
      dummy.position.set(bx, bh / 2 - 0.1, bz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(bw, bh, bd);
      dummy.updateMatrix();
      blocksInst.setMatrixAt(idx, dummy.matrix);
      blocksInst.setColorAt(idx, pal[idx % pal.length]);
    });
    blocksInst.instanceMatrix.needsUpdate = true;
    if (blocksInst.instanceColor) blocksInst.instanceColor.needsUpdate = true;
    ctxGroup.add(blocksInst);
  } else {
    // =========================================================================
    // NATURE / ALPINE / SCENIC 360° FLANKING STRUCTURES & TERRAIN WRAP
    // (Switzerland Hilltop, Mt. Everest, Mayon Volcano, Hilltop City Lights)
    // =========================================================================
    const isSnowBiome = sceneryId === 'mt_everest' || sceneryId === 'switzerland_hilltop';
    const isTropical = sceneryId === 'mayon_volcano';

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x623e22, roughness: 0.84 });
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

    // Grounded Stone Retaining Walls / Low Terrace Parapets flanking cafe's left & right corners
    [-11.8, 11.8].forEach((wx) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.72, 0.55), stoneWallMat);
      wall.position.set(wx, 0.3, -6.4);
      ctxGroup.add(wall);
    });

    // Immediate Flanking Grounded Timber Chalets / Lodges / Pavilions directly beside Klasik Cafe
    // Left flank (x = -9.4, z = -1.2) fills the 3D Title Screen right-hand corner behind the Miata!
    const flankCabins: Array<{ x: number; z: number; w: number; h: number; d: number; rotY: number }> = [
      { x: -9.6, z: -1.1, w: 6.4, h: 4.4, d: 8.6, rotY: 0 },
      { x: -16.8, z: -2.0, w: 5.8, h: 4.1, d: 7.4, rotY: 0.14 },
      { x: 9.6, z: -1.1, w: 6.4, h: 4.5, d: 8.6, rotY: 0 },
      { x: 16.8, z: -2.0, w: 5.8, h: 4.0, d: 7.4, rotY: -0.14 },
      { x: -7.5, z: 10.6, w: 7.2, h: 4.8, d: 6.8, rotY: 0.1 },
      { x: 7.8, z: 11.2, w: 7.4, h: 4.6, d: 6.8, rotY: -0.1 },
    ];
    flankCabins.forEach((c) => {
      const cg = new THREE.Group();
      // Stone basement plinth rooted into terrain
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(c.w + 0.2, 1.3, c.d + 0.2),
        stoneWallMat
      );
      plinth.position.y = 0.52;
      cg.add(plinth);
      // Warm timber lodge walls
      const upper = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h - 0.9, c.d), woodMat);
      upper.position.y = 1.15 + (c.h - 0.9) / 2;
      cg.add(upper);
      // Pitched alpine/tropical roof
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(c.w, c.d) * 0.78, 2.25, 4),
        cabinRoofMat
      );
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(c.w / Math.max(c.w, c.d) * 1.12, 1, c.d / Math.max(c.w, c.d) * 1.12);
      roof.position.y = c.h + 1.05;
      cg.add(roof);
      // Warm glowing lodge windows facing -Z
      [-c.w * 0.24, c.w * 0.24].forEach((wx) => {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), cabinWinMat);
        win.rotation.y = Math.PI;
        win.position.set(wx, 2.55, -c.d / 2 - 0.04);
        cg.add(win);
      });
      cg.position.set(c.x, -0.08, c.z);
      cg.rotation.y = c.rotY;
      ctxGroup.add(cg);
    });

    // Instanced Biome-Accurate Trees Wrapping Left, Right, and Rear (0 urban round trees!)
    const treeCoords: Array<[number, number, number]> = [];
    for (let i = 0; i < 42; i++) {
      const ang = (i / 42) * Math.PI * 2;
      // Keep the front panoramic view (-Z) completely clear; populate sides & rear densely
      if (Math.sin(ang) < -0.45 && Math.abs(Math.cos(ang)) < 0.7) continue;
      const radius = 19 + (i % 4) * 7.5;
      const tx = Math.cos(ang) * radius;
      const tz = Math.sin(ang) * radius + 1.5;
      if (Math.abs(tx) < 13 && tz > -9 && tz < 7) continue;
      treeCoords.push([tx, tz, 0.85 + (i % 4) * 0.22]);
    }
    // Add close framing conifers/palms just outside the flanking chalets
    [
      [-13.4, -7.2, 1.05],
      [-6.5, -7.5, 0.92],
      [6.5, -7.5, 0.95],
      [13.4, -7.2, 1.1],
      [-21.0, -9.5, 1.18],
      [21.0, -9.5, 1.16],
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
    const crowns = new THREE.InstancedMesh(
      isTropical
        ? new THREE.ConeGeometry(2.1, 1.45, 7)
        : new THREE.ConeGeometry(1.55, 4.8, 7),
      foliageMat,
      treeCoords.length
    );

    // Optional snow-cap tips on conifers for Everest & Switzerland
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

      dummy.position.set(tx, (isTropical ? 5.1 : 3.7) * sc, tz);
      dummy.rotation.set(0, idx * 1.1, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      crowns.setMatrixAt(idx, dummy.matrix);

      if (snowTips) {
        dummy.position.set(tx, 5.0 * sc, tz);
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        snowTips.setMatrixAt(idx, dummy.matrix);
      }
    });
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    ctxGroup.add(trunks, crowns);
    if (snowTips) {
      snowTips.instanceMatrix.needsUpdate = true;
      ctxGroup.add(snowTips);
    }

    // 360° Distant Mountain / Ridge Ring wrapping Left, Right, and Rear so zero empty sky drop-off exists!
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
    const ringPeakCount = 16;
    for (let p = 0; p < ringPeakCount; p++) {
      const ang = (p / ringPeakCount) * Math.PI * 2;
      // Leave the main -Z hero landmark vista unobstructed (handled by the scenery's own hero peaks)
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
        wm.emissiveIntensity = isNight ? 1.55 : 0.22;
      }
      for (const item of winterGroundMats) {
        item.mat.color.setHex(climateState === 'winter' ? item.winterHex : item.summerHex);
      }
      for (const item of winterFoliageMats) {
        item.mat.color.setHex(climateState === 'winter' ? item.winterHex : item.summerHex);
      }
      for (const nm of neonAccentMats) {
        nm.opacity = isNight ? 1.0 : 0.82;
      }
    },
  };
}
