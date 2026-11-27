import * as THREE from 'three';
import type { InteriorThemeId, LoungeTableDef } from './rules';

export interface InteriorDecorTheme3DRig {
  root: THREE.Group;
  themeGroups: Record<InteriorThemeId, THREE.Group>;
  animatedFernGroups: THREE.Group[];
  edisonBulbMats: THREE.MeshStandardMaterial[];
  lanternMats: THREE.MeshStandardMaterial[];
  sconceMats: THREE.MeshStandardMaterial[];
  cageBulbMats: THREE.MeshStandardMaterial[];
  applyTheme: (themeId: InteriorThemeId, isNight: boolean, elapsed: number) => InteriorLightingProfile;
  dispose: () => void;
}

export interface InteriorLightingProfile {
  warmLightHex: number;
  warmLightBoost: number;
  pastryLightHex: number;
  pastryLightBoost: number;
  seatingLightHex: number;
  seatingLightBoost: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensityScale: number;
  pendantTintHex: number;
  /** When true, scene3d hides the default starter brass dome pendants so theme chandeliers/lanterns/ferns take over cleanly */
  hideDefaultPendants: boolean;
  /** Optional plaster wall tint override so side & corner walls harmonize with the theme */
  wallPlasterHex: number;
}

export const INTERIOR_THEME_LIGHTING: Record<InteriorThemeId, InteriorLightingProfile> = {
  garage_garden: {
    warmLightHex: 0xffb35c,
    warmLightBoost: 1.05,
    pastryLightHex: 0xffc67d,
    pastryLightBoost: 1.12,
    seatingLightHex: 0xffb35c,
    seatingLightBoost: 1.08,
    hemiSkyHex: 0x93c5fd,
    hemiGroundHex: 0x3e2723,
    hemiIntensityScale: 1.0,
    pendantTintHex: 0xffe4b5,
    hideDefaultPendants: false,
    wallPlasterHex: 0x2d241e,
  },
  botanical_greenhouse: {
    warmLightHex: 0xe6fcc5,
    warmLightBoost: 1.24,
    pastryLightHex: 0xfef9c3,
    pastryLightBoost: 1.24,
    seatingLightHex: 0xd9f99d,
    seatingLightBoost: 1.22,
    hemiSkyHex: 0xdcfce7,
    hemiGroundHex: 0x3f6212,
    hemiIntensityScale: 1.22,
    pendantTintHex: 0xfef9c3,
    hideDefaultPendants: true,
    wallPlasterHex: 0x344a3c,
  },
  midnight_vinyl: {
    warmLightHex: 0xf59e0b,
    warmLightBoost: 1.34,
    pastryLightHex: 0xfbbf24,
    pastryLightBoost: 1.22,
    seatingLightHex: 0xea580c,
    seatingLightBoost: 1.38,
    hemiSkyHex: 0x4338ca,
    hemiGroundHex: 0x141118,
    hemiIntensityScale: 0.72,
    pendantTintHex: 0xf59e0b,
    hideDefaultPendants: true,
    wallPlasterHex: 0x16141e,
  },
  parisian_bistro: {
    warmLightHex: 0xfff5df,
    warmLightBoost: 1.26,
    pastryLightHex: 0xffe8c2,
    pastryLightBoost: 1.28,
    seatingLightHex: 0xfde68a,
    seatingLightBoost: 1.26,
    hemiSkyHex: 0xfff7ed,
    hemiGroundHex: 0x5c3a21,
    hemiIntensityScale: 1.18,
    pendantTintHex: 0xfff7ed,
    hideDefaultPendants: true,
    wallPlasterHex: 0xe8dfd1,
  },
  kyoto_timber: {
    warmLightHex: 0xffc87a,
    warmLightBoost: 1.22,
    pastryLightHex: 0xffe0b2,
    pastryLightBoost: 1.2,
    seatingLightHex: 0xffb74d,
    seatingLightBoost: 1.28,
    hemiSkyHex: 0xfef3c7,
    hemiGroundHex: 0x4e342e,
    hemiIntensityScale: 1.06,
    pendantTintHex: 0xffedd5,
    hideDefaultPendants: true,
    wallPlasterHex: 0x463325,
  },
  industrial_loft: {
    warmLightHex: 0xfb923c,
    warmLightBoost: 1.22,
    pastryLightHex: 0xfdba74,
    pastryLightBoost: 1.18,
    seatingLightHex: 0xf97316,
    seatingLightBoost: 1.22,
    hemiSkyHex: 0x94a3b8,
    hemiGroundHex: 0x262220,
    hemiIntensityScale: 0.88,
    pendantTintHex: 0xfdba74,
    hideDefaultPendants: true,
    wallPlasterHex: 0x3b2620,
  },
};

function makeProceduralCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    draw(ctx, width, height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCheckeredTileTexture(): THREE.CanvasTexture | null {
  return makeProceduralCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      const cells = 4;
      const size = w / cells;
      for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#f6f0e4' : '#1b1f26';
          ctx.fillRect(x * size, y * size, size, size);
          ctx.strokeStyle = 'rgba(180, 160, 125, 0.35)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x * size, y * size, size, size);
        }
      }
    },
    7,
    6
  );
}

function createFlagstoneFloorTexture(): THREE.CanvasTexture | null {
  return makeProceduralCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#9ca894'; // Mossy limestone grout
      ctx.fillRect(0, 0, w, h);
      const stones = [
        [4, 4, 120, 82, '#dfd7c5'],
        [130, 4, 122, 118, '#d4cbb7'],
        [4, 92, 120, 102, '#e6dfd0'],
        [130, 128, 122, 124, '#dbd2bf'],
        [4, 200, 120, 52, '#cfc6b0'],
      ] as const;
      stones.forEach(([x, y, sw, sh, col]) => {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, sw, sh);
        ctx.strokeStyle = 'rgba(72, 92, 68, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, sw - 2, sh - 2);
      });
    },
    6,
    5
  );
}

function createSmokedWalnutFloorTexture(): THREE.CanvasTexture | null {
  return makeProceduralCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#141010';
      ctx.fillRect(0, 0, w, h);
      const planks = 8;
      const ph = h / planks;
      const tones = ['#231a16', '#1c1512', '#281d17', '#1f1714'];
      for (let i = 0; i < planks; i++) {
        ctx.fillStyle = tones[i % tones.length];
        ctx.fillRect(0, i * ph + 1, w, ph - 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.04)';
        ctx.fillRect(0, i * ph + 4, w, 2);
      }
    },
    5,
    5
  );
}

function createHinokiPlankTexture(): THREE.CanvasTexture | null {
  return makeProceduralCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#a47a4c';
      ctx.fillRect(0, 0, w, h);
      const planks = 6;
      const ph = h / planks;
      const tones = ['#d7b07b', '#cfa46d', '#dfb986', '#c99c66'];
      for (let i = 0; i < planks; i++) {
        ctx.fillStyle = tones[i % tones.length];
        ctx.fillRect(0, i * ph + 1, w, ph - 2);
        ctx.strokeStyle = 'rgba(110, 72, 34, 0.22)';
        ctx.beginPath();
        ctx.moveTo(0, i * ph + ph * 0.5);
        ctx.lineTo(w, i * ph + ph * 0.5);
        ctx.stroke();
      }
    },
    5,
    5
  );
}

function createBrickWallTexture(repeatX = 5, repeatY = 2): THREE.CanvasTexture | null {
  return makeProceduralCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#5a4942';
      ctx.fillRect(0, 0, w, h);
      const rows = 8;
      const cols = 4;
      const rh = h / rows;
      const cw = w / cols;
      const brickTones = ['#943a2a', '#a34533', '#7f3023', '#ad503d', '#873728'];
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (cw * 0.5);
        for (let c = -1; c <= cols; c++) {
          ctx.fillStyle = brickTones[(r * 7 + c + 12) % brickTones.length];
          ctx.fillRect(c * cw + offset + 2, r * rh + 2, cw - 4, rh - 4);
        }
      }
    },
    repeatX,
    repeatY
  );
}

function createMarbleTexture(repeatX = 2, repeatY = 1): THREE.CanvasTexture | null {
  return makeProceduralCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#f8f6f2';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(130, 145, 165, 0.36)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 16 + i * 30);
        ctx.bezierCurveTo(72, 4 + i * 34, 168, 42 + i * 24, w, 14 + i * 32);
        ctx.stroke();
      }
    },
    repeatX,
    repeatY
  );
}

function createVinylCoverTexture(title: string, bg: string, accent: string): THREE.CanvasTexture | null {
  return makeProceduralCanvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(64, 56, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(64, 56, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 64, 114);
  });
}

/**
 * Helper to add a full-width countertop inlay slab & front/back architectural molding rails
 * right inside the barista camera's foreground (y = 1.003 so machines/cups sit cleanly on top!).
 */
function addCounterOverhaul(
  group: THREE.Group,
  topMat: THREE.Material,
  trimMat: THREE.Material,
  fasciaMat: THREE.Material
) {
  // Full countertop surface overlay (counterTop is x=-0.525, size 6.91 x 1.48, top at y=1.00)
  const counterSurface = new THREE.Mesh(new THREE.BoxGeometry(6.92, 0.004, 1.49), topMat);
  counterSurface.position.set(-0.525, 1.002, 0.44);
  counterSurface.receiveShadow = true;
  group.add(counterSurface);

  // Barista-facing & customer-facing beveled edge trim rails (immediately visible in foreground!)
  const baristaEdge = new THREE.Mesh(new THREE.BoxGeometry(6.94, 0.048, 0.03), trimMat);
  baristaEdge.position.set(-0.525, 0.968, 1.19);
  const customerEdge = new THREE.Mesh(new THREE.BoxGeometry(6.94, 0.048, 0.03), trimMat);
  customerEdge.position.set(-0.525, 0.968, -0.31);
  // Customer-facing counter fascia cladding
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(6.78, 0.86, 0.03), fasciaMat);
  fascia.position.set(-0.525, 0.48, -0.265);
  group.add(baristaEdge, customerEdge, fascia);
}

/**
 * Helper to frame the front storefront header valance & vertical pilasters (z = -5.92)
 * without obstructing the outdoor view through the glass bays!
 */
function addStorefrontArchitecturalFrame(
  group: THREE.Group,
  frameMat: THREE.Material,
  accentMat: THREE.Material
) {
  // Upper storefront transom valance (clearly visible across the top of the barista camera!)
  const headerBeam = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.56, 0.14), frameMat);
  headerBeam.position.set(0, 3.36, -5.92);
  const headerTrim = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.06, 0.18), accentMat);
  headerTrim.position.set(0, 3.06, -5.90);
  group.add(headerBeam, headerTrim);

  // Vertical architectural pilasters aligned cleanly with the existing glass mullions
  [-5.26, -2.55, 0.25, 3.12, 5.26].forEach((px) => {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.55, 0.16), frameMat);
    pilaster.position.set(px, 1.78, -5.92);
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.2), accentMat);
    collar.position.set(px, 2.98, -5.9);
    group.add(pilaster, collar);
  });

  // Low interior windowsill wainscoting to left & right of entrance doorway (clear of x = -1.8..-0.5)
  const leftSill = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.46, 0.12), frameMat);
  leftSill.position.set(-3.65, 0.24, -5.93);
  const rightSill = new THREE.Mesh(new THREE.BoxGeometry(5.65, 0.46, 0.12), frameMat);
  rightSill.position.set(2.45, 0.24, -5.93);
  group.add(leftSill, rightSill);
}

/**
 * Builds transformative, barista-camera-visible 3D architectural geometry groups for all 6 interior
 * cafe themes (Starter Garage Garden + 5 Cash-Unlockable Full-Room Overhauls):
 *  - Raised floor overlays at y = 0.022 (strictly ABOVE loungeDeck at y = 0.016!)
 *  - Barista foreground countertop slabs, trim rails, and counter fascia
 *  - Left wall (x = -5.36), Right wall (x = +5.36), Front storefront header/pilasters (z = -5.92), AND Rear wall (z = 3.52)
 *  - Mid-frame suspended fixtures at y = 2.08..2.36 so lanterns, ferns, Edison bulbs & chandeliers fill the barista camera!
 *  - Complete lounge tabletop, cushion, and centerpiece overhauls across all 4 tables
 */
export function buildInteriorDecorThemes3D(
  loungeTables: readonly LoungeTableDef[]
): InteriorDecorTheme3DRig {
  const root = new THREE.Group();
  root.name = 'interior_architectural_decor_themes';

  const animatedFernGroups: THREE.Group[] = [];
  const edisonBulbMats: THREE.MeshStandardMaterial[] = [];
  const lanternMats: THREE.MeshStandardMaterial[] = [];
  const sconceMats: THREE.MeshStandardMaterial[] = [];
  const cageBulbMats: THREE.MeshStandardMaterial[] = [];
  const disposableTextures: THREE.Texture[] = [];

  const trackTex = (tex: THREE.CanvasTexture | null): THREE.CanvasTexture | undefined => {
    if (!tex) return undefined;
    disposableTextures.push(tex);
    return tex;
  };

  const themeGroups: Record<InteriorThemeId, THREE.Group> = {
    garage_garden: new THREE.Group(),
    botanical_greenhouse: new THREE.Group(),
    midnight_vinyl: new THREE.Group(),
    parisian_bistro: new THREE.Group(),
    kyoto_timber: new THREE.Group(),
    industrial_loft: new THREE.Group(),
  };

  (Object.keys(themeGroups) as InteriorThemeId[]).forEach((key) => {
    themeGroups[key].name = `interior_theme_${key}`;
    themeGroups[key].visible = key === 'garage_garden';
    root.add(themeGroups[key]);
  });

  // =========================================================================
  // 1. BOTANICAL GREENHOUSE & HANGING FERNS
  // =========================================================================
  {
    const g = themeGroups.botanical_greenhouse;
    const stoneTex = trackTex(createFlagstoneFloorTexture());
    const sageIronMat = new THREE.MeshStandardMaterial({ color: 0x365b45, roughness: 0.42, metalness: 0.44 });
    const sagePlasterMat = new THREE.MeshStandardMaterial({ color: 0x52735c, roughness: 0.82 });
    const creamLimestoneMat = new THREE.MeshStandardMaterial({ color: 0xe7dfd0, roughness: 0.56 });
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xc8643c, roughness: 0.78 });
    const fernMat = new THREE.MeshStandardMaterial({ color: 0x267332, roughness: 0.7, side: THREE.DoubleSide });
    const fernBrightMat = new THREE.MeshStandardMaterial({ color: 0x52b74a, roughness: 0.65, side: THREE.DoubleSide });
    const stoneFloorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: stoneTex,
      roughness: 0.72,
    });
    const rattanMat = new THREE.MeshStandardMaterial({ color: 0xcda46a, roughness: 0.74 });
    const mossCushionMat = new THREE.MeshStandardMaterial({ color: 0x4d7c3f, roughness: 0.82 });

    // Full-room sunlit limestone flagstone floor ABOVE loungeDeck (y = 0.022!)
    const stoneFloor = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 9.8), stoneFloorMat);
    stoneFloor.rotation.x = -Math.PI / 2;
    stoneFloor.position.set(0, 0.022, -1.2);
    stoneFloor.receiveShadow = true;
    g.add(stoneFloor);

    // Sunlit limestone countertop + sage-iron conservatory trim + botanical counter fascia
    addCounterOverhaul(g, creamLimestoneMat, sageIronMat, sagePlasterMat);

    // Front conservatory glasshouse frame & pilasters (clearly visible from barista camera!)
    addStorefrontArchitecturalFrame(g, sageIronMat, terracottaMat);

    // Left & Right Conservatory Greenhouse Walls with sage iron lattice arches & climbing ivy (visible in barista view!)
    [-5.36, 5.36].forEach((wx) => {
      const inwardSign = wx < 0 ? 1 : -1;
      const wallPanel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.6, 9.4), sagePlasterMat);
      wallPanel.position.set(wx, 1.82, -1.2);
      g.add(wallPanel);

      // Conservatory vertical mullions & horizontal transoms
      for (let wz = -5.4; wz <= 2.6; wz += 1.35) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.5, 0.08), sageIronMat);
        rib.position.set(wx + inwardSign * 0.04, 1.8, wz);
        g.add(rib);
      }
      [1.25, 2.35, 3.1].forEach((wy) => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 9.2), sageIronMat);
        bar.position.set(wx + inwardSign * 0.04, wy, -1.2);
        g.add(bar);
      });
      // Lush climbing ivy garlands cascading along side walls
      for (let i = 0; i < 10; i++) {
        const vz = -5.2 + i * 0.82;
        const vy = 1.5 + ((i * 3) % 5) * 0.34;
        const cluster = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.24 + (i % 2) * 0.06, 0),
          i % 2 === 0 ? fernBrightMat : fernMat
        );
        cluster.scale.set(0.45, 1.1, 1.25);
        cluster.position.set(wx + inwardSign * 0.12, vy, vz);
        g.add(cluster);
      }
    });

    // Rear wall botanical trellis (visible from outdoor Look Back)
    for (let x = -4.2; x <= 4.2; x += 0.7) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.4, 0.03), sageIronMat);
      slat.position.set(x, 2.35, 3.52);
      g.add(slat);
    }

    // Conservatory glasshouse ceiling trusses
    [-3.6, -1.4, 0.8, 3.0].forEach((bx) => {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 9.4), sageIronMat);
      rib.position.set(bx, 3.52, -1.2);
      g.add(rib);
    });

    // 8 Lush Terracotta Hanging Fern Baskets dropped to y = 2.12..2.36 (unmistakably inside barista camera FOV!)
    const fernSpots: Array<[number, number, number]> = [
      [-2.4, 2.28, -1.45],
      [-0.5, 2.32, -1.75],
      [1.45, 2.24, -1.85],
      [3.15, 2.28, -1.95],
      [-1.4, 2.22, -3.55],
      [0.45, 2.18, -3.35],
      [2.55, 2.22, -3.55],
      [1.6, 2.26, -4.85],
    ];
    fernSpots.forEach(([fx, fy, fz], idx) => {
      const hanger = new THREE.Group();
      hanger.position.set(fx, 3.55, fz);

      const ropeLen = 3.55 - fy;
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, ropeLen, 5), rattanMat);
      rope.position.y = -ropeLen * 0.5;
      hanger.add(rope);

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.13, 0.22, 12), terracottaMat);
      pot.position.y = -ropeLen;
      hanger.add(pot);

      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.22, 9, 7), fernMat);
      crown.scale.set(1.15, 0.68, 1.15);
      crown.position.y = -ropeLen + 0.11;
      hanger.add(crown);

      for (let f = 0; f < 9; f++) {
        const ang = (f / 9) * Math.PI * 2 + idx * 0.4;
        const frond = new THREE.Mesh(
          new THREE.ConeGeometry(0.068, 0.54, 5),
          f % 2 === 0 ? fernBrightMat : fernMat
        );
        frond.position.set(Math.cos(ang) * 0.2, -ropeLen - 0.06, Math.sin(ang) * 0.2);
        frond.rotation.z = Math.cos(ang) * 2.1;
        frond.rotation.x = -Math.sin(ang) * 2.1;
        hanger.add(frond);
      }

      g.add(hanger);
      animatedFernGroups.push(hanger);
    });

    // Lounge table rattan overlays, terracotta potted herbs, & moss-green cushions
    loungeTables.forEach((tbl) => {
      const top =
        tbl.shape === 'rect'
          ? new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.028, 0.82), creamLimestoneMat)
          : new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.028, 22), creamLimestoneMat);
      top.position.set(tbl.x, 0.784, tbl.z);
      const matMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.014, 16), rattanMat);
      matMesh.position.set(tbl.x, 0.802, tbl.z);
      const herbPot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.052, 0.11, 10), terracottaMat);
      herbPot.position.set(tbl.x + 0.1, 0.855, tbl.z - 0.06);
      const herbTop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), fernBrightMat);
      herbTop.position.set(tbl.x + 0.1, 0.94, tbl.z - 0.06);
      g.add(top, matMesh, herbPot, herbTop);

      tbl.seats.forEach((seat) => {
        const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.042, 14), mossCushionMat);
        cushion.position.set(seat.x, 0.46, seat.z);
        g.add(cushion);
      });
    });
  }

  // =========================================================================
  // 2. MIDNIGHT VINYL LOUNGE & EDISON BULBS
  // =========================================================================
  {
    const g = themeGroups.midnight_vinyl;
    const smokedTex = trackTex(createSmokedWalnutFloorTexture());
    const smokedOakMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: smokedTex,
      roughness: 0.42,
      metalness: 0.12,
    });
    const darkWalnutTopMat = new THREE.MeshStandardMaterial({ color: 0x241510, roughness: 0.32, metalness: 0.12 });
    const walnutSlatMat = new THREE.MeshStandardMaterial({ color: 0x452817, roughness: 0.58 });
    const acousticBackingMat = new THREE.MeshStandardMaterial({ color: 0x101118, roughness: 0.9 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xe2af48, roughness: 0.24, metalness: 0.88 });
    const velvetMat = new THREE.MeshStandardMaterial({ color: 0x3730a3, roughness: 0.8 });
    const cordMat = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.8 });

    // Smoked Dark-Walnut Floor ABOVE loungeDeck (y = 0.022!)
    const floorOverlay = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 9.8), smokedOakMat);
    floorOverlay.rotation.x = -Math.PI / 2;
    floorOverlay.position.set(0, 0.022, -1.2);
    floorOverlay.receiveShadow = true;
    g.add(floorOverlay);

    // Midnight dark-walnut countertop + brushed brass edge rails + dark acoustic fascia
    addCounterOverhaul(g, darkWalnutTopMat, brassMat, acousticBackingMat);

    // Front midnight-indigo & brass storefront framing
    addStorefrontArchitecturalFrame(g, acousticBackingMat, brassMat);

    // Left & Right Acoustic Walnut Slat Walls + Illuminated Vintage Vinyl LP Gallery (VISIBLE IN BARISTA CAMERA!)
    const sleeveSpecs = [
      { z: -4.6, title: 'BLUE NOTE', bg: '#1e3a8a', accent: '#f59e0b' },
      { z: -3.2, title: 'TOKYO JAZZ', bg: '#7c2d12', accent: '#fde68a' },
      { z: -1.8, title: 'KLASIK 90', bg: '#18181b', accent: '#f43f5e' },
      { z: -0.4, title: 'MIDNIGHT', bg: '#312e81', accent: '#38bdf8' },
    ];
    [-5.36, 5.36].forEach((wx) => {
      const inwardSign = wx < 0 ? 1 : -1;
      const backing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.6, 9.4), acousticBackingMat);
      backing.position.set(wx, 1.82, -1.2);
      g.add(backing);

      for (let sz = -5.6; sz <= 2.8; sz += 0.28) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.45, 0.11), walnutSlatMat);
        slat.position.set(wx + inwardSign * 0.04, 1.8, sz);
        g.add(slat);
      }

      // Glowing amber brass rail & framed LP sleeves right on the visible side walls!
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 6.2), brassMat);
      rail.position.set(wx + inwardSign * 0.08, 1.72, -2.5);
      g.add(rail);

      sleeveSpecs.forEach((sl) => {
        const tex = trackTex(createVinylCoverTexture(sl.title, sl.bg, sl.accent));
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.72), brassMat);
        frame.position.set(wx + inwardSign * 0.08, 2.15, sl.z);
        const cover = new THREE.Mesh(
          new THREE.PlaneGeometry(0.64, 0.64),
          new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 })
        );
        cover.position.set(wx + inwardSign * 0.105, 2.15, sl.z);
        cover.rotation.y = inwardSign > 0 ? Math.PI / 2 : -Math.PI / 2;
        g.add(frame, cover);
      });
    });

    // Mid-Frame Exposed-Filament Glowing Edison Bulb Chandelier Clusters (y = 2.08..2.38 right in barista FOV!)
    const edisonClusters: Array<[number, number, number]> = [
      [-2.1, 2.26, -1.5],
      [-0.25, 2.22, -1.8],
      [1.65, 2.18, -1.9],
      [3.1, 2.24, -2.2],
      [0.35, 2.16, -3.55],
      [2.55, 2.14, -3.55],
      [1.35, 2.24, -4.85],
    ];
    edisonClusters.forEach(([cx, cy, cz], idx) => {
      const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12), brassMat);
      canopy.position.set(cx, 3.55, cz);
      g.add(canopy);
      const offsets: Array<[number, number, number]> = [
        [0, 0, 0],
        [-0.2, 0.16, 0.1],
        [0.2, -0.1, -0.08],
      ];
      offsets.forEach(([ox, oy, oz], bi) => {
        const drop = 3.55 - (cy + oy);
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, drop, 5), cordMat);
        cord.position.set(cx + ox, cy + oy + drop * 0.5, cz + oz);
        const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.075, 8), brassMat);
        socket.position.set(cx + ox, cy + oy + 0.05, cz + oz);
        const bulbMat = new THREE.MeshStandardMaterial({
          color: 0xffd27d,
          emissive: 0xf59e0b,
          emissiveIntensity: 2.3 + ((idx + bi) % 3) * 0.25,
          roughness: 0.12,
        });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), bulbMat);
        bulb.scale.set(0.85, 1.4, 0.85);
        bulb.position.set(cx + ox, cy + oy - 0.03, cz + oz);
        g.add(cord, socket, bulb);
        edisonBulbMats.push(bulbMat);
      });
    });

    // Dark walnut tabletops with brass rims, glowing amber table candles & royal-indigo velvet cushions
    loungeTables.forEach((tbl) => {
      const top =
        tbl.shape === 'rect'
          ? new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.82), darkWalnutTopMat)
          : new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.03, 24), darkWalnutTopMat);
      top.position.set(tbl.x, 0.785, tbl.z);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.048, 0.095, 10), brassMat);
      candle.position.set(tbl.x, 0.84, tbl.z);
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 2.8,
      });
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), flameMat);
      flame.scale.set(0.85, 1.5, 0.85);
      flame.position.set(tbl.x, 0.91, tbl.z);
      edisonBulbMats.push(flameMat);
      g.add(top, candle, flame);

      tbl.seats.forEach((seat) => {
        const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.045, 14), velvetMat);
        cushion.position.set(seat.x, 0.46, seat.z);
        g.add(cushion);
      });
    });
  }

  // =========================================================================
  // 3. PARISIAN BRASS BISTRO & MARBLE
  // =========================================================================
  {
    const g = themeGroups.parisian_bistro;
    const checkTex = trackTex(createCheckeredTileTexture());
    const marbleTex = trackTex(createMarbleTexture(3, 1));

    const checkFloorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: checkTex,
      roughness: 0.28,
      metalness: 0.06,
    });
    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: marbleTex,
      roughness: 0.18,
      metalness: 0.08,
    });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xe3b95c, roughness: 0.2, metalness: 0.9 });
    const creamBoiserieMat = new THREE.MeshStandardMaterial({ color: 0xf4ece0, roughness: 0.56 });
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.06, metalness: 0.94 });
    const bordeauxMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.65 });

    // Classic Black-and-Cream Parisian Checkered Tile Floor ABOVE loungeDeck (y = 0.022!)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 9.8), checkFloorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.022, -1.2);
    floor.receiveShadow = true;
    g.add(floor);

    // Full Carrara Marble Countertop + Polished Brass Rail + Cream Boiserie Fascia
    addCounterOverhaul(g, marbleMat, brassMat, creamBoiserieMat);

    // Cream & Gilt Brass Storefront Transom & Pilasters
    addStorefrontArchitecturalFrame(g, creamBoiserieMat, brassMat);

    // Left & Right Parisian Cream Boiserie Walls with Gilt Arched Mirrors & Opal Globe Sconces (VISIBLE IN BARISTA VIEW!)
    [-5.36, 5.36].forEach((wx) => {
      const inwardSign = wx < 0 ? 1 : -1;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.6, 9.4), creamBoiserieMat);
      wall.position.set(wx, 1.82, -1.2);
      const dadoRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.075, 9.4), brassMat);
      dadoRail.position.set(wx + inwardSign * 0.04, 1.18, -1.2);
      g.add(wall, dadoRail);

      [-4.2, -2.0, 0.2].forEach((mz) => {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.55, 1.16), brassMat);
        frame.position.set(wx + inwardSign * 0.05, 2.22, mz);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.42), mirrorMat);
        glass.position.set(wx + inwardSign * 0.085, 2.22, mz);
        glass.rotation.y = inwardSign > 0 ? Math.PI / 2 : -Math.PI / 2;
        g.add(frame, glass);
      });

      // Warm Opal Globe Brass Wall Sconces
      [-3.1, -0.9].forEach((sz) => {
        const globeMat = new THREE.MeshStandardMaterial({
          color: 0xfff7ed,
          emissive: 0xfde68a,
          emissiveIntensity: 1.8,
          roughness: 0.2,
        });
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), globeMat);
        globe.position.set(wx + inwardSign * 0.2, 2.35, sz);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.03), brassMat);
        arm.position.set(wx + inwardSign * 0.1, 2.28, sz);
        g.add(arm, globe);
        sconceMats.push(globeMat);
      });
    });

    // Mid-Frame Parisian Frosted Milk-Glass & Brass Chandeliers (y = 2.15..2.32 right inside barista FOV!)
    const chandelierSpots: Array<[number, number, number]> = [
      [-1.5, 2.28, -1.7],
      [1.25, 2.22, -1.85],
      [0.35, 2.16, -3.55],
      [2.65, 2.18, -3.55],
      [1.55, 2.24, -4.85],
    ];
    chandelierSpots.forEach(([cx, cy, cz]) => {
      const drop = 3.55 - cy;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, drop, 8), brassMat);
      rod.position.set(cx, cy + drop * 0.5, cz);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.018, 8, 22), brassMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(cx, cy, cz);
      g.add(rod, ring);

      for (let gi = 0; gi < 4; gi++) {
        const ang = (gi / 4) * Math.PI * 2 + Math.PI / 4;
        const globeMat = new THREE.MeshStandardMaterial({
          color: 0xfffaf0,
          emissive: 0xfef08a,
          emissiveIntensity: 1.85,
          roughness: 0.18,
        });
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), globeMat);
        globe.position.set(cx + Math.cos(ang) * 0.28, cy + 0.06, cz + Math.sin(ang) * 0.28);
        g.add(globe);
        sconceMats.push(globeMat);
      }
    });

    // Carrara Marble Lounge Tabletops + Brushed Brass Gallery Rims + Bordeaux Bistro Cushions
    loungeTables.forEach((tbl) => {
      const top =
        tbl.shape === 'rect'
          ? new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.032, 0.84), marbleMat)
          : new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.032, 24), marbleMat);
      top.position.set(tbl.x, 0.785, tbl.z);
      const brassRim =
        tbl.shape === 'rect'
          ? new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.026, 0.88), brassMat)
          : new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.018, 8, 28), brassMat);
      if (tbl.shape !== 'rect') brassRim.rotation.x = Math.PI / 2;
      brassRim.position.set(tbl.x, 0.786, tbl.z);
      const budVase = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.038, 0.13, 10), brassMat);
      budVase.position.set(tbl.x, 0.86, tbl.z);
      g.add(top, brassRim, budVase);

      tbl.seats.forEach((seat) => {
        const bistroCushion = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.044, 14), bordeauxMat);
        bistroCushion.position.set(seat.x, 0.46, seat.z);
        g.add(bistroCushion);
      });
    });
  }

  // =========================================================================
  // 4. KYOTO TIMBER & PAPER LANTERNS
  // =========================================================================
  {
    const g = themeGroups.kyoto_timber;
    const hinokiTex = trackTex(createHinokiPlankTexture());
    const hinokiMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: hinokiTex,
      roughness: 0.62,
    });
    const darkCedarMat = new THREE.MeshStandardMaterial({ color: 0x4f301a, roughness: 0.7 });
    const tatamiMat = new THREE.MeshStandardMaterial({ color: 0xc2b97e, roughness: 0.88 });
    const tatamiBorderMat = new THREE.MeshStandardMaterial({ color: 0x1b3d2f, roughness: 0.85 });
    const ceramicDarkMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.5 });
    const bonsaiLeafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.75 });
    const shojiPaperMat = new THREE.MeshStandardMaterial({
      color: 0xfff8eb,
      emissive: 0xffd082,
      emissiveIntensity: 0.68,
      roughness: 0.82,
    });
    lanternMats.push(shojiPaperMat);

    // Warm Hinoki Timber Floor ABOVE loungeDeck (y = 0.022!) + Woven Tatami Lounge Mat (y = 0.028)
    const hinokiFloor = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 9.8), hinokiMat);
    hinokiFloor.rotation.x = -Math.PI / 2;
    hinokiFloor.position.set(0, 0.022, -1.2);
    hinokiFloor.receiveShadow = true;
    g.add(hinokiFloor);

    const tatamiEdge = new THREE.Mesh(new THREE.BoxGeometry(4.78, 0.012, 4.02), tatamiBorderMat);
    tatamiEdge.position.set(1.55, 0.028, -3.62);
    const tatamiRug = new THREE.Mesh(new THREE.BoxGeometry(4.56, 0.016, 3.82), tatamiMat);
    tatamiRug.position.set(1.55, 0.031, -3.62);
    g.add(tatamiEdge, tatamiRug);

    // Warm Hinoki Countertop + Dark Cedar Trim + Cedar Lattice Fascia
    addCounterOverhaul(g, hinokiMat, darkCedarMat, darkCedarMat);

    // Kyoto Cedar Post-and-Beam Storefront Frame
    addStorefrontArchitecturalFrame(g, darkCedarMat, hinokiMat);

    // Left & Right Backlit Shoji Cedar Lattice Walls (UNMISTAKABLE FROM BARISTA CAMERA!)
    [-5.36, 5.36].forEach((wx) => {
      const inwardSign = wx < 0 ? 1 : -1;
      const shojiPanel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.4, 9.2), shojiPaperMat);
      shojiPanel.position.set(wx, 1.82, -1.2);
      g.add(shojiPanel);

      // Crisp Kumiko cedar vertical & horizontal lattice grid
      for (let sz = -5.6; sz <= 3.0; sz += 0.95) {
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.45, 0.06), darkCedarMat);
        vBar.position.set(wx + inwardSign * 0.04, 1.82, sz);
        g.add(vBar);
      }
      for (let sy = 0.45; sy <= 3.35; sy += 0.58) {
        const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 9.2), darkCedarMat);
        hBar.position.set(wx + inwardSign * 0.04, sy, -1.2);
        g.add(hBar);
      }
    });

    // Overhead cedar beam rafters
    [-3.4, -1.1, 1.2, 3.4].forEach((rx) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 9.4), darkCedarMat);
      beam.position.set(rx, 3.48, -1.2);
      g.add(beam);
    });

    // Mid-Frame Glowing Ribbed Washi Paper Pendant Lanterns (y = 2.08..2.32 right in barista FOV!)
    const lanternSpots: Array<[number, number, number, number]> = [
      [-2.1, 2.26, -1.65, 0.26],
      [-0.25, 2.22, -1.85, 0.3],
      [1.65, 2.18, -1.95, 0.25],
      [3.15, 2.24, -2.15, 0.24],
      [0.35, 2.14, -3.55, 0.28],
      [2.55, 2.16, -3.55, 0.27],
      [1.45, 2.22, -4.85, 0.28],
    ];
    lanternSpots.forEach(([lx, ly, lz, r], idx) => {
      const drop = 3.55 - ly;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, drop, 5), darkCedarMat);
      cord.position.set(lx, ly + drop * 0.5, lz);
      const paperMat = new THREE.MeshStandardMaterial({
        color: 0xfff6e5,
        emissive: 0xffb347,
        emissiveIntensity: 1.55 + (idx % 2) * 0.2,
        roughness: 0.7,
      });
      const yScale = idx % 2 === 0 ? 0.82 : 1.16;
      const globe = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), paperMat);
      globe.scale.set(1.0, yScale, 1.0);
      globe.position.set(lx, ly, lz);
      const capTop = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.52, 0.04, 10), darkCedarMat);
      capTop.position.set(lx, ly + r * yScale * 0.94, lz);
      const capBot = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.48, r * 0.4, 0.036, 10), darkCedarMat);
      capBot.position.set(lx, ly - r * yScale * 0.94, lz);
      g.add(cord, globe, capTop, capBot);
      lanternMats.push(paperMat);
    });

    // Hinoki tabletops, ceramic bonsai trees & forest-green zabuton seat pads
    loungeTables.forEach((tbl) => {
      const top =
        tbl.shape === 'rect'
          ? new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.032, 0.84), hinokiMat)
          : new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.032, 22), hinokiMat);
      top.position.set(tbl.x, 0.785, tbl.z);
      const pot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.12), ceramicDarkMat);
      pot.position.set(tbl.x, 0.83, tbl.z);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.14, 6), darkCedarMat);
      trunk.rotation.z = 0.26;
      trunk.position.set(tbl.x - 0.01, 0.91, tbl.z);
      const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(0.095, 0), bonsaiLeafMat);
      canopy.scale.set(1.35, 0.65, 1.0);
      canopy.position.set(tbl.x - 0.03, 0.98, tbl.z);
      g.add(top, pot, trunk, canopy);

      tbl.seats.forEach((seat) => {
        const zabuton = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.045, 0.38), tatamiBorderMat);
        zabuton.position.set(seat.x, 0.46, seat.z);
        g.add(zabuton);
      });
    });
  }

  // =========================================================================
  // 5. INDUSTRIAL LOFT BRICK & EXPOSED PIPES
  // =========================================================================
  {
    const g = themeGroups.industrial_loft;
    const brickSideTex = trackTex(createBrickWallTexture(5, 2));
    const brickFrontTex = trackTex(createBrickWallTexture(6, 1));

    const brickSideMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: brickSideTex,
      roughness: 0.86,
    });
    const brickFrontMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: brickFrontTex,
      roughness: 0.86,
    });
    const castIronMat = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.4, metalness: 0.82 });
    const copperPipeMat = new THREE.MeshStandardMaterial({ color: 0xc9733f, roughness: 0.28, metalness: 0.86 });
    const loftConcreteMat = new THREE.MeshStandardMaterial({ color: 0x474c54, roughness: 0.78 });
    const reclaimedWoodMat = new THREE.MeshStandardMaterial({ color: 0x61422c, roughness: 0.72 });
    const cognacLeatherMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.62 });

    // Distressed Loft Concrete Floor ABOVE loungeDeck (y = 0.022!)
    const concreteFloor = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 9.8), loftConcreteMat);
    concreteFloor.rotation.x = -Math.PI / 2;
    concreteFloor.position.set(0, 0.022, -1.2);
    concreteFloor.receiveShadow = true;
    g.add(concreteFloor);

    // Concrete & Riveted Cast-Iron Countertop + Exposed Brick Counter Fascia
    addCounterOverhaul(g, loftConcreteMat, castIronMat, brickFrontMat);

    // Cast-Iron & Copper Storefront Framing
    addStorefrontArchitecturalFrame(g, castIronMat, copperPipeMat);

    // Left & Right Exposed Red-Brick Walls + Steel I-Beams + Exposed Copper Conduit Pipes (VISIBLE IN BARISTA VIEW!)
    [-5.36, 5.36].forEach((wx) => {
      const inwardSign = wx < 0 ? 1 : -1;
      const brickWall = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.65, 9.6), brickSideMat);
      brickWall.position.set(wx, 1.84, -1.2);
      g.add(brickWall);

      [-4.6, -2.0, 0.6].forEach((pz) => {
        const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.65, 0.2), castIronMat);
        pilaster.position.set(wx + inwardSign * 0.08, 1.84, pz);
        g.add(pilaster);
      });

      // Twin horizontal iron & gleaming copper conduit pipes running along side walls
      [2.85, 2.58].forEach((py, idx) => {
        const pipe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.048 - idx * 0.01, 0.048 - idx * 0.01, 9.2, 10),
          idx === 0 ? castIronMat : copperPipeMat
        );
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(wx + inwardSign * 0.14, py, -1.2);
        g.add(pipe);
      });
    });

    // Overhead exposed steel HVAC ducts & copper conduits across ceiling
    [-3.1, -0.3, 2.5].forEach((px, idx) => {
      const ceilingPipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 9.2, 10),
        idx === 1 ? copperPipeMat : castIronMat
      );
      ceilingPipe.rotation.x = Math.PI / 2;
      ceilingPipe.position.set(px, 3.44, -1.2);
      g.add(ceilingPipe);
    });

    // Mid-Frame Steel-Cage Factory Pendants with Warm Tungsten Glow (y = 2.12..2.32 inside barista FOV!)
    const cageSpots: Array<[number, number, number]> = [
      [-2.0, 2.26, -1.6],
      [0.0, 2.22, -1.85],
      [2.0, 2.24, -1.9],
      [0.35, 2.16, -3.55],
      [2.55, 2.16, -3.55],
      [1.45, 2.22, -4.85],
    ];
    cageSpots.forEach(([fx, fy, fz]) => {
      const drop = 3.55 - fy;
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, drop, 6), castIronMat);
      conduit.position.set(fx, fy + drop * 0.5, fz);
      const dome = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.16, 12, 1, true), castIronMat);
      dome.position.set(fx, fy + 0.06, fz);
      const copperCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.07, 10), copperPipeMat);
      copperCollar.position.set(fx, fy + 0.15, fz);
      const cageRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.01, 6, 12), castIronMat);
      cageRing.rotation.x = Math.PI / 2;
      cageRing.position.set(fx, fy - 0.06, fz);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: 0xfb923c,
        emissiveIntensity: 2.1,
        roughness: 0.18,
      });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), bulbMat);
      bulb.position.set(fx, fy - 0.02, fz);
      g.add(conduit, dome, copperCollar, cageRing, bulb);
      cageBulbMats.push(bulbMat);
    });

    // Reclaimed timber tabletops with cast-iron rims, industrial cage table lamps & cognac leather cushions
    loungeTables.forEach((tbl) => {
      const top =
        tbl.shape === 'rect'
          ? new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.032, 0.84), reclaimedWoodMat)
          : new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.032, 22), reclaimedWoodMat);
      top.position.set(tbl.x, 0.785, tbl.z);
      const ironBand =
        tbl.shape === 'rect'
          ? new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.026, 0.88), castIronMat)
          : new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.018, 8, 24), castIronMat);
      if (tbl.shape !== 'rect') ironBand.rotation.x = Math.PI / 2;
      ironBand.position.set(tbl.x, 0.786, tbl.z);
      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.05, 10), castIronMat);
      lampBase.position.set(tbl.x, 0.825, tbl.z);
      const lampBulbMat = new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: 0xf97316,
        emissiveIntensity: 2.2,
      });
      const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), lampBulbMat);
      lampBulb.position.set(tbl.x, 0.89, tbl.z);
      cageBulbMats.push(lampBulbMat);
      g.add(top, ironBand, lampBase, lampBulb);

      tbl.seats.forEach((seat) => {
        const leatherPad = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.044, 14), cognacLeatherMat);
        leatherPad.position.set(seat.x, 0.46, seat.z);
        g.add(leatherPad);
      });
    });
  }

  let activeTheme: InteriorThemeId = 'garage_garden';

  const applyTheme = (
    themeId: InteriorThemeId,
    isNight: boolean,
    elapsed: number
  ): InteriorLightingProfile => {
    if (activeTheme !== themeId) {
      activeTheme = themeId;
      (Object.keys(themeGroups) as InteriorThemeId[]).forEach((key) => {
        themeGroups[key].visible = key === themeId;
      });
    }

    // Subtle live ambient animation exclusively for the active theme
    if (themeId === 'botanical_greenhouse') {
      for (let i = 0; i < animatedFernGroups.length; i++) {
        animatedFernGroups[i].rotation.z = Math.sin(elapsed * 1.15 + i * 0.9) * 0.032;
        animatedFernGroups[i].rotation.x = Math.cos(elapsed * 0.85 + i * 1.3) * 0.02;
      }
    } else if (themeId === 'midnight_vinyl') {
      const base = isNight ? 2.65 : 1.75;
      for (let i = 0; i < edisonBulbMats.length; i++) {
        edisonBulbMats[i].emissiveIntensity = base + Math.sin(elapsed * 3.1 + i * 0.7) * 0.18;
      }
    } else if (themeId === 'kyoto_timber') {
      const base = isNight ? 1.85 : 1.15;
      for (let i = 0; i < lanternMats.length; i++) {
        lanternMats[i].emissiveIntensity = base + Math.sin(elapsed * 1.6 + i * 0.8) * 0.1;
      }
    } else if (themeId === 'parisian_bistro') {
      const base = isNight ? 2.1 : 1.3;
      for (let i = 0; i < sconceMats.length; i++) {
        sconceMats[i].emissiveIntensity = base;
      }
    } else if (themeId === 'industrial_loft') {
      const base = isNight ? 2.35 : 1.5;
      for (let i = 0; i < cageBulbMats.length; i++) {
        cageBulbMats[i].emissiveIntensity = base + Math.sin(elapsed * 4.0 + i) * 0.1;
      }
    }

    return INTERIOR_THEME_LIGHTING[themeId] ?? INTERIOR_THEME_LIGHTING.garage_garden;
  };

  const dispose = () => {
    disposableTextures.forEach((t) => t.dispose());
  };

  return {
    root,
    themeGroups,
    animatedFernGroups,
    edisonBulbMats,
    lanternMats,
    sconceMats,
    cageBulbMats,
    applyTheme,
    dispose,
  };
}
