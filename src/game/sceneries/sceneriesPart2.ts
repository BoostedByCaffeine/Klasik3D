import * as THREE from 'three';
import {
  SceneryRuntimeInstance,
  createDioramaBase,
  disableShadowsRecursive,
  getSharedGlowSpriteTexture,
} from './sceneryTypes';
import {
  addSurrounding360Context,
  createProceduralFacadeTextures,
} from './surroundingContext';

// ============================================================================
// PHASE 4: OUTDOOR SCENERIES 6–9 (HIGH-DETAIL MOBILE-OPTIMIZED OVERHAUL)
// Universal Driveway Rule: All scenery starts cleanly at z <= -16.2
// ============================================================================

function createCyberBillboardTexture(
  primaryHex: string,
  secondaryHex: string,
  title: string,
  sub: string
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = 'rgba(7, 10, 24, 0.86)';
  ctx.fillRect(0, 0, 256, 192);

  // Outer glowing neon border
  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 240, 176);

  // Horizontal scanlines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let y = 14; y < 180; y += 8) {
    ctx.fillRect(14, y, 228, 2);
  }

  // Geometric corner cyber brackets
  ctx.fillStyle = secondaryHex;
  ctx.fillRect(20, 22, 42, 6);
  ctx.fillRect(194, 164, 42, 6);

  // Bold cyber typography / kanji
  ctx.fillStyle = primaryHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText(title, 128, 86);

  ctx.fillStyle = secondaryHex;
  ctx.font = 'bold 20px monospace';
  ctx.fillText(sub, 128, 138);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { ownedByScenery: true };
  return tex;
}

function createEverestSignTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#4a301c';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#d9b99b';
  ctx.lineWidth = 4;
  ctx.strokeRect(5, 5, 246, 86);

  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('EVEREST BASE CAMP', 128, 38);
  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('ELEV. 5,364m  ▲', 128, 70);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData = { ownedByScenery: true };
  return tex;
}

function createCobbleTerraceTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#6b6761';
  ctx.fillRect(0, 0, 128, 128);
  const shades = ['#948f87', '#86817a', '#a19b92', '#7a756e'];
  for (let r = 0; r < 8; r++) {
    const ox = (r % 2) * 10;
    for (let c = 0; c < 7; c++) {
      ctx.fillStyle = shades[(r * 3 + c * 5) % shades.length];
      ctx.fillRect(c * 20 + ox - 8, r * 16 + 1, 18, 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 2);
  tex.userData = { ownedByScenery: true };
  return tex;
}

/**
 * Helper to construct a sleek multi-part futuristic Cyberpunk hover-spinner.
 */
function buildSpinnerMesh(
  bodyColor: number,
  thrusterColor: number,
  trailColor: number,
  isPolice: boolean
): {
  group: THREE.Group;
  redBar?: THREE.MeshBasicMaterial;
  blueBar?: THREE.MeshBasicMaterial;
  searchlight?: THREE.Mesh;
} {
  const g = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.25,
    metalness: 0.78,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: thrusterColor,
    emissiveIntensity: 0.35,
    roughness: 0.12,
    metalness: 0.85,
  });
  const thrustMat = new THREE.MeshBasicMaterial({ color: thrusterColor });
  const trailMat = new THREE.MeshBasicMaterial({
    color: trailColor,
    transparent: true,
    opacity: 0.72,
  });

  // Sleek aerodynamic wedge chassis (faces +X by default)
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.44, 1.15), hullMat);
  g.add(hull);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 0.92), hullMat);
  nose.position.set(1.55, -0.04, 0);
  g.add(nose);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.34, 0.84), canopyMat);
  canopy.position.set(0.2, 0.32, 0);
  g.add(canopy);

  // Side hover-thruster nacelles + glowing underside plasma glow
  [-0.68, 0.68].forEach((sz) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.26, 0.24), hullMat);
    pod.position.set(-0.2, -0.08, sz);
    g.add(pod);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.18), thrustMat);
    pad.position.set(-0.2, -0.22, sz);
    g.add(pad);
  });

  // Headlight bar & elongated glowing rear plasma light-trail
  const headBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.82),
    new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
  );
  headBar.position.set(2.04, -0.02, 0);
  g.add(headBar);

  const trail = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 0.72), trailMat);
  trail.position.set(-3.4, 0.0, 0);
  g.add(trail);

  let redBar: THREE.MeshBasicMaterial | undefined;
  let blueBar: THREE.MeshBasicMaterial | undefined;
  let searchlight: THREE.Mesh | undefined;

  if (isPolice) {
    redBar = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    blueBar = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    const barR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.42), redBar);
    barR.position.set(0.15, 0.56, -0.22);
    g.add(barR);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.42), blueBar);
    barB.position.set(0.15, 0.56, 0.22);
    g.add(barB);

    // Sweeping downward translucent volumetric searchlight cone
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coneGeo = new THREE.ConeGeometry(2.6, 8.5, 12, 1, true);
    coneGeo.translate(0, -4.25, 0);
    searchlight = new THREE.Mesh(coneGeo, coneMat);
    searchlight.position.set(1.2, -0.25, 0);
    searchlight.rotation.z = 0.24;
    g.add(searchlight);
  }

  return { group: g, redBar, blueBar, searchlight };
}

// ============================================================================
// 6. CYBERPUNK NEON (Dense Textured Megacity Canyon, Holographic Kanji Billboards,
//    Steam Vents, Multi-Altitude Flying Hover-Cars & Periodic Aerial Police Chase)
// ============================================================================
export function buildCyberpunkNeonScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_cyberpunk_neon';

  // Wet obsidian reflective megacity ground slab
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x090b15,
    roughness: 0.22,
    metalness: 0.62,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 150), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, -90);
  root.add(ground);

  // Textured Megacity Skyscrapers with glowing emissive window grids (zero bare boxes!)
  const cyberTex = createProceduralFacadeTextures('cyberpunk', '#111629', '#38bdf8');
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: cyberTex?.map,
    emissive: 0x38bdf8,
    emissiveMap: cyberTex?.emissiveMap,
    emissiveIntensity: 1.05,
    roughness: 0.42,
    metalness: 0.56,
  });
  const towerCount = 54;
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), towerMat, towerCount);
  const trimMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const roofTrims = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), trimMat, towerCount);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < towerCount; i++) {
    const row = Math.floor(i / 14);
    const col = i % 14;
    const tx = -48 + col * 7.4 + (row % 2) * 3.2;
    const tz = -21.5 - row * 13.5 - (i % 3) * 3.2;
    const tw = 4.4 + (i % 4) * 1.4;
    const td = 4.4 + ((i * 3) % 4) * 1.2;
    const th = 16 + ((i * 7) % 26) + row * 8;
    dummy.position.set(tx, th / 2, tz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(tw, th, td);
    dummy.updateMatrix();
    towers.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tx, th + 0.16, tz);
    dummy.scale.set(tw + 0.15, 0.28, td + 0.15);
    dummy.updateMatrix();
    roofTrims.setMatrixAt(i, dummy.matrix);
  }
  towers.instanceMatrix.needsUpdate = true;
  roofTrims.instanceMatrix.needsUpdate = true;
  root.add(towers, roofTrims);

  // Exposed industrial pipes, vents & glowing neon conduit strips on lower street level
  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.72,
  });
  const conduitCyanMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const conduitMagMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
  [-18, -10.5, -3.5, 4.0, 11.2, 18.5].forEach((px, idx) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 12, 7), pipeMat);
    pipe.position.set(px, 6.0, -18.6);
    root.add(pipe);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 9.5, 0.12),
      idx % 2 === 0 ? conduitCyanMat : conduitMagMat
    );
    strip.position.set(px + 0.26, 5.2, -18.45);
    root.add(strip);
  });

  // Translucent Holographic Kanji / Cyber Billboards + Additive Fake-Bloom Glow Sprites
  const holoSpecs = [
    { x: -12.5, y: 8.6, z: -19.2, w: 4.2, h: 3.1, p: '#06b6d4', s: '#f472b6', t: '電脳珈琲', sub: 'KLASIK 2099' },
    { x: -4.2, y: 12.6, z: -24.5, w: 5.2, h: 3.5, p: '#ec4899', s: '#38bdf8', t: '新視界市', sub: 'SECTOR 07' },
    { x: 4.2, y: 9.8, z: -19.6, w: 4.0, h: 3.0, p: '#f59e0b', s: '#fef08a', t: '深夜営業', sub: 'OPEN 24/7' },
    { x: 12.0, y: 11.4, z: -22.5, w: 4.8, h: 3.4, p: '#38bdf8', s: '#a855f7', t: '未来通信', sub: 'SYNC ONLINE' },
    { x: -18.5, y: 14.5, z: -29.0, w: 5.6, h: 3.8, p: '#a855f7', s: '#06b6d4', t: '軌道交通', sub: 'SKYLINE' },
    { x: 18.5, y: 14.0, z: -28.5, w: 5.2, h: 3.6, p: '#ec4899', s: '#f59e0b', t: '極光市場', sub: 'NEON PLAZA' },
    { x: 0.2, y: 20.5, z: -40.0, w: 8.2, h: 5.4, p: '#06b6d4', s: '#ec4899', t: '東京九九', sub: 'NEO-METRO' },
  ];
  const holoMats: THREE.MeshBasicMaterial[] = [];
  const glowSprites: THREE.Sprite[] = [];

  holoSpecs.forEach((h) => {
    const tex = createCyberBillboardTexture(h.p, h.s, h.t, h.sub);
    const bMat = new THREE.MeshBasicMaterial({
      map: tex ?? undefined,
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    holoMats.push(bMat);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(h.w, h.h), bMat);
    panel.position.set(h.x, h.y, h.z);
    root.add(panel);

    const spMat = new THREE.SpriteMaterial({
      map: getSharedGlowSpriteTexture(),
      color: new THREE.Color(h.p),
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spMat);
    sprite.position.set(h.x, h.y, h.z + 0.45);
    sprite.scale.set(h.w * 2.0, h.h * 1.9, 1);
    root.add(sprite);
    glowSprites.push(sprite);
  });

  // Glowing neon skyway bridge strips across the canyon
  const skyway1 = new THREE.Mesh(new THREE.BoxGeometry(72, 0.35, 0.9), conduitCyanMat);
  skyway1.position.set(0, 7.2, -28);
  root.add(skyway1);
  const skyway2 = new THREE.Mesh(new THREE.BoxGeometry(78, 0.32, 0.9), conduitMagMat);
  skyway2.position.set(0, 14.8, -36);
  root.add(skyway2);

  // Rising animated street-grate steam particles along far sidewalk
  const steamCount = 90;
  const steamPos = new Float32Array(steamCount * 3);
  const steamVentXs = [-14.0, -5.0, 5.2, 14.5];
  for (let i = 0; i < steamCount; i++) {
    const vx = steamVentXs[i % steamVentXs.length];
    steamPos[i * 3] = vx + (Math.random() - 0.5) * 1.1;
    steamPos[i * 3 + 1] = 0.15 + Math.random() * 4.4;
    steamPos[i * 3 + 2] = -17.1 + (Math.random() - 0.5) * 0.7;
  }
  const steamGeo = new THREE.BufferGeometry();
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
  const steamMat = new THREE.PointsMaterial({
    size: 1.55,
    color: 0x94a3b8,
    map: getSharedGlowSpriteTexture(),
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  root.add(new THREE.Points(steamGeo, steamMat));

  // === MULTI-ALTITUDE FLYING HOVER-CARS (SPINNERS) ACROSS 3 STACKED AERIAL LANES ===
  interface FlyingSpinner {
    group: THREE.Group;
    speed: number;
    dir: 1 | -1;
    baseY: number;
    phase: number;
  }
  const flyingSpinners: FlyingSpinner[] = [];
  const laneSpecs: Array<{
    x: number;
    y: number;
    z: number;
    dir: 1 | -1;
    speed: number;
    body: number;
    thrust: number;
    trail: number;
  }> = [
    // Low avenue aerial lane (y ~ 4.4 - 5.2) right above the street!
    { x: -24, y: 4.5, z: -13.5, dir: 1, speed: 11.5, body: 0x1e293b, thrust: 0x06b6d4, trail: 0x38bdf8 },
    { x: 18, y: 5.1, z: -16.0, dir: -1, speed: 12.8, body: 0x312e81, thrust: 0xec4899, trail: 0xf472b6 },
    { x: 4, y: 4.3, z: -11.5, dir: 1, speed: 10.2, body: 0x27272a, thrust: 0xf59e0b, trail: 0xfbbf24 },
    // Mid-canyon express lane (y ~ 10.5 - 12.2)
    { x: -34, y: 10.8, z: -22.5, dir: 1, speed: 15.2, body: 0x0f172a, thrust: 0x38bdf8, trail: 0x06b6d4 },
    { x: 26, y: 11.6, z: -25.0, dir: -1, speed: 16.4, body: 0x3f1d38, thrust: 0xf43f5e, trail: 0xec4899 },
    { x: -6, y: 12.0, z: -27.5, dir: 1, speed: 14.0, body: 0x1e293b, thrust: 0xa855f7, trail: 0xc084fc },
    // High-altitude megacity corridor (y ~ 18.2 - 20.5)
    { x: -28, y: 18.5, z: -32.0, dir: -1, speed: 18.5, body: 0x172554, thrust: 0x06b6d4, trail: 0x7dd3fc },
    { x: 14, y: 19.6, z: -35.5, dir: 1, speed: 19.5, body: 0x1e1b4b, thrust: 0xf59e0b, trail: 0xfde047 },
  ];

  laneSpecs.forEach((ls, idx) => {
    const built = buildSpinnerMesh(ls.body, ls.thrust, ls.trail, false);
    built.group.position.set(ls.x, ls.y, ls.z);
    if (ls.dir === -1) built.group.rotation.y = Math.PI;
    built.group.scale.setScalar(ls.y < 7 ? 0.72 : 0.88);
    root.add(built.group);
    flyingSpinners.push({
      group: built.group,
      speed: ls.speed,
      dir: ls.dir,
      baseY: ls.y,
      phase: idx * 1.15,
    });
  });

  // === LOW-CHANCE PERIODIC AERIAL POLICE CHASE EVENT (~10–12% encounter roll) ===
  const chaseGroup = new THREE.Group();
  chaseGroup.visible = false;
  const fugitive = buildSpinnerMesh(0x09090b, 0xf97316, 0xef4444, false);
  fugitive.group.position.set(9.5, 0.3, 0);
  fugitive.group.scale.setScalar(0.86);
  chaseGroup.add(fugitive.group);

  const police1 = buildSpinnerMesh(0x111827, 0x38bdf8, 0xef4444, true);
  police1.group.position.set(0, 0.5, -1.6);
  police1.group.scale.setScalar(0.9);
  chaseGroup.add(police1.group);

  const police2 = buildSpinnerMesh(0x111827, 0x38bdf8, 0x3b82f6, true);
  police2.group.position.set(-4.8, 1.3, 1.5);
  police2.group.scale.setScalar(0.88);
  chaseGroup.add(police2.group);
  root.add(chaseGroup);

  let chaseActive = false;
  let chaseDir: 1 | -1 = 1;
  let chaseX = -54;
  let chaseCooldown = 8.0; // First roll happens soon, then low-chance every 14s

  const ctx = addSurrounding360Context(root, 'cyberpunk_neon');
  disableShadowsRecursive(root);

  return {
    id: 'cyberpunk_neon',
    root,
    envHint: {
      fogColorDay: 0x1a1d36,
      fogColorNight: 0x070816,
      fogDensityScale: 0.98,
      skyTintDay: 0x1e1b4b,
      skyTintNight: 0x060714,
      neonRain: true,
    },
    update: (dt, elapsed, isNight, climateState, weather) => {
      ctx.update(isNight, climateState);
      towerMat.emissiveIntensity = isNight ? 1.35 : 0.72;
      groundMat.roughness = weather === 'rainy' ? 0.12 : 0.24;

      for (let i = 0; i < holoMats.length; i++) {
        const pulse = 0.8 + Math.sin(elapsed * (2.2 + i * 0.45) + i) * 0.16;
        holoMats[i].opacity = isNight ? Math.min(1, pulse + 0.12) : pulse * 0.88;
        const spMat = glowSprites[i].material as THREE.SpriteMaterial;
        spMat.opacity = (isNight ? 0.46 : 0.26) * pulse;
      }

      // Rise steam wisps smoothly
      const sAttr = steamGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < steamCount; i++) {
        let sy = sAttr.getY(i) + dt * (0.9 + (i % 3) * 0.3);
        let sx = sAttr.getX(i) + Math.sin(elapsed * 1.4 + i) * dt * 0.22;
        if (sy > 4.8) {
          sy = 0.15;
          sx = steamVentXs[i % steamVentXs.length] + (((i * 17) % 10) - 5) * 0.1;
        }
        sAttr.setXY(i, sx, sy);
      }
      sAttr.needsUpdate = true;

      // Multi-altitude flying hover-cars
      for (const sp of flyingSpinners) {
        sp.group.position.x += sp.dir * sp.speed * dt;
        sp.group.position.y = sp.baseY + Math.sin(elapsed * 2.4 + sp.phase) * 0.18;
        if (sp.dir === 1 && sp.group.position.x > 46) sp.group.position.x = -46;
        if (sp.dir === -1 && sp.group.position.x < -46) sp.group.position.x = 46;
      }

      // Low-chance periodic aerial police chase
      if (!chaseActive) {
        chaseCooldown -= dt;
        if (chaseCooldown <= 0) {
          chaseCooldown = 14.0;
          // ~12% encounter rate (deterministic-friendly roll)
          if (Math.random() < 0.12) {
            chaseActive = true;
            chaseDir = Math.random() < 0.5 ? 1 : -1;
            chaseX = chaseDir === 1 ? -58 : 58;
            chaseGroup.visible = true;
            chaseGroup.position.set(chaseX, 7.6, -15.5);
            chaseGroup.rotation.y = chaseDir === 1 ? 0 : Math.PI;
          }
        }
      } else {
        chaseX += chaseDir * 24.5 * dt;
        chaseGroup.position.x = chaseX;
        chaseGroup.position.y = 7.6 + Math.sin(elapsed * 5.2) * 0.35;
        fugitive.group.rotation.z = Math.sin(elapsed * 6.5) * 0.14;

        // Rapid alternating red/blue police lightbars + sweeping downward searchlight
        const strobe = Math.floor(elapsed * 12) % 2 === 0;
        if (police1.redBar && police1.blueBar) {
          police1.redBar.color.setHex(strobe ? 0xff1e42 : 0x2a0810);
          police1.blueBar.color.setHex(strobe ? 0x0a1c4a : 0x3b82f6);
        }
        if (police2.redBar && police2.blueBar) {
          police2.redBar.color.setHex(strobe ? 0x2a0810 : 0xff1e42);
          police2.blueBar.color.setHex(strobe ? 0x3b82f6 : 0x0a1c4a);
        }
        if (police1.searchlight) {
          police1.searchlight.rotation.z = 0.22 + Math.sin(elapsed * 4.2) * 0.25;
        }
        if (police2.searchlight) {
          police2.searchlight.rotation.z = 0.18 + Math.cos(elapsed * 3.8) * 0.22;
        }

        if ((chaseDir === 1 && chaseX > 62) || (chaseDir === -1 && chaseX < -62)) {
          chaseActive = false;
          chaseGroup.visible = false;
        }
      }
    },
  };
}

export function buildCyberpunkNeonDiorama(): THREE.Group {
  const g = createDioramaBase(0x0b0d17, 0x1e1b4b);
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x15192b, roughness: 0.4, metalness: 0.5 });
  const specs = [
    [-0.45, 0.48, -0.25, 0.34, 0.92],
    [0.02, 0.62, -0.18, 0.38, 1.2],
    [0.48, 0.42, 0.08, 0.32, 0.8],
  ];
  specs.forEach(([x, y, z, w, h]) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), darkMat);
    t.position.set(x, y, z);
    g.add(t);
  });
  const cyan = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.42, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
  );
  cyan.position.set(0.02, 0.82, 0.05);
  g.add(cyan);
  const magenta = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.32, 0.04),
    new THREE.MeshBasicMaterial({ color: 0xec4899 })
  );
  magenta.position.set(-0.45, 0.58, -0.05);
  g.add(magenta);
  return g;
}

// ============================================================================
// 7. EIFFEL TOWER VIEW (Montmartre Terrace, Sprawling Dense Haussmannian Paris
//    Metropolis, Illuminated Twinkling Eiffel Tower & Sweeping Summit Searchlight)
// ============================================================================
export function buildEiffelTowerScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_eiffel_tower';

  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f3a2e, roughness: 0.45, metalness: 0.68 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd9cbb8, roughness: 0.84 });
  const slateRoofMat = new THREE.MeshStandardMaterial({ color: 0x3b4858, roughness: 0.74 });
  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.86 });
  const boulevardTreeMat = new THREE.MeshStandardMaterial({ color: 0x3a6b35, roughness: 0.86 });
  const eiffelMat = new THREE.MeshStandardMaterial({
    color: 0x6b5344,
    roughness: 0.5,
    metalness: 0.48,
    emissive: 0xd97706,
    emissiveIntensity: 0.08,
  });
  const winWarmMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.3,
    roughness: 0.3,
  });

  // Cobblestone terrace strip behind sidewalk leading to Montmartre railing
  const cobbleTex = createCobbleTerraceTexture();
  const cobbleMat = new THREE.MeshStandardMaterial({
    color: 0xd6d0c4,
    map: cobbleTex ?? undefined,
    roughness: 0.82,
  });
  const terraceWalk = new THREE.Mesh(new THREE.PlaneGeometry(60, 2.2), cobbleMat);
  terraceWalk.rotation.x = -Math.PI / 2;
  terraceWalk.position.set(0, 0.095, -16.6);
  root.add(terraceWalk);

  // Elevated Montmartre balustrade & wrought-iron terrace railing along z = -17.5
  const stoneCoping = new THREE.Mesh(new THREE.BoxGeometry(58, 0.4, 0.46), stoneMat);
  stoneCoping.position.set(0, 0.2, -17.5);
  root.add(stoneCoping);
  const topIronRail = new THREE.Mesh(new THREE.BoxGeometry(58, 0.07, 0.08), ironMat);
  topIronRail.position.set(0, 1.14, -17.5);
  root.add(topIronRail);
  const balusterCount = 56;
  const balusters = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.74, 5),
    ironMat,
    balusterCount
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < balusterCount; i++) {
    dummy.position.set(-27.5 + i * 1.0, 0.75, -17.5);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    balusters.setMatrixAt(i, dummy.matrix);
  }
  balusters.instanceMatrix.needsUpdate = true;
  root.add(balusters);

  // Classic Parisian vintage double-globe green iron lamp posts along promenade
  [-14, -5.2, 5.2, 14].forEach((lx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 3.4, 8), ironMat);
    post.position.set(lx, 1.7, -17.5);
    root.add(post);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.06), ironMat);
    cross.position.set(lx, 3.28, -17.5);
    root.add(cross);
    [-0.26, 0.26].forEach((ox) => {
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), winWarmMat);
      globe.position.set(lx + ox, 3.45, -17.5);
      root.add(globe);
    });
  });

  // Sprawling Dense Parisian Haussmannian Metropolis across the Paris basin (y = -14.5)!
  const parisTex = createProceduralFacadeTextures('parisian', '#e6dac6', '#fbbf24');
  const haussmannMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: parisTex?.map,
    emissive: 0xfde68a,
    emissiveMap: parisTex?.emissiveMap,
    emissiveIntensity: 0.22,
    roughness: 0.8,
  });

  const cityBlocks: Array<{ x: number; y: number; z: number; w: number; h: number; d: number; rotY: number }> = [];
  for (let row = 0; row < 7; row++) {
    const zBase = -25.5 - row * 14.5;
    const cols = 15;
    for (let col = 0; col < cols; col++) {
      const xPos = -72 + col * 10.3 + (row % 2) * 3.8;
      // Keep the grand Champs-de-Mars center avenue open directly to the Eiffel Tower!
      if (Math.abs(xPos - 0.5) < 9.5 && zBase > -82) continue;
      // Also avoid overlapping the Eiffel Tower base plaza directly
      if (Math.abs(xPos - 0.5) < 13 && Math.abs(zBase + 68) < 12) continue;

      const bw = 7.4 + ((row * 5 + col * 3) % 3) * 1.4;
      const bd = 6.2 + ((row + col) % 3) * 1.1;
      // Near Montmartre steps down smoothly into the Paris basin (-14.5)
      const groundY = row === 0 ? -9.5 : row === 1 ? -12.5 : -14.5;
      const bh = 6.2 + ((row * 3 + col * 7) % 4) * 1.15;
      cityBlocks.push({
        x: xPos,
        y: groundY,
        z: zBase,
        w: bw,
        h: bh,
        d: bd,
        rotY: ((col % 3) - 1) * 0.04,
      });
    }
  }

  const parisBodies = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    haussmannMat,
    cityBlocks.length
  );
  const parisMansards = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.74, 1.0, 4),
    slateRoofMat,
    cityBlocks.length
  );
  const parisChimneys = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.45, 0.9, 0.45),
    chimneyMat,
    cityBlocks.length
  );
  cityBlocks.forEach((b, idx) => {
    dummy.position.set(b.x, b.y + b.h / 2, b.z);
    dummy.rotation.set(0, b.rotY, 0);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.updateMatrix();
    parisBodies.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(b.x, b.y + b.h + 0.95, b.z);
    dummy.rotation.set(0, b.rotY + Math.PI / 4, 0);
    dummy.scale.set(b.w * 1.04, 1.9, b.d * 1.04);
    dummy.updateMatrix();
    parisMansards.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(b.x + b.w * 0.25, b.y + b.h + 1.65, b.z);
    dummy.rotation.set(0, b.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    parisChimneys.setMatrixAt(idx, dummy.matrix);
  });
  parisBodies.instanceMatrix.needsUpdate = true;
  parisMansards.instanceMatrix.needsUpdate = true;
  parisChimneys.instanceMatrix.needsUpdate = true;
  root.add(parisBodies, parisMansards, parisChimneys);

  // Tree-lined Champs-de-Mars promenade flanking the grand approach to the Eiffel Tower
  const parisTreeCount = 24;
  const parisTrees = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1.5, 1),
    boulevardTreeMat,
    parisTreeCount
  );
  for (let i = 0; i < parisTreeCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const step = Math.floor(i / 2);
    dummy.position.set(0.5 + side * 7.8, -12.6, -28 - step * 3.2);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(1.1, 1.3, 1.1);
    dummy.updateMatrix();
    parisTrees.setMatrixAt(i, dummy.matrix);
  }
  parisTrees.instanceMatrix.needsUpdate = true;
  root.add(parisTrees);

  // Iconic Illuminated Eiffel Tower centered in the grand Parisian metropolis
  const tower = new THREE.Group();
  tower.position.set(0.5, -14.5, -68);

  // 4 sweeping flared base legs + signature lower arch ring
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.65, 14.5, 6), eiffelMat);
    leg.position.set(sx * 4.8, 6.8, sz * 4.8);
    leg.rotation.z = sx * 0.28;
    leg.rotation.x = -sz * 0.28;
    tower.add(leg);
  });
  const archRing = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.45, 6, 16, Math.PI), eiffelMat);
  archRing.position.set(0, 6.4, 4.6);
  tower.add(archRing);

  // 3 Observation Decks & Tapered Lattice Tiers
  const deck1 = new THREE.Mesh(new THREE.BoxGeometry(10.0, 1.2, 10.0), eiffelMat);
  deck1.position.y = 13.4;
  tower.add(deck1);

  const midTruss = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 4.2, 12.2, 4), eiffelMat);
  midTruss.rotation.y = Math.PI / 4;
  midTruss.position.y = 20.0;
  tower.add(midTruss);

  const deck2 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.95, 5.4), eiffelMat);
  deck2.position.y = 26.2;
  tower.add(deck2);

  const upperSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 2.05, 18.0, 4), eiffelMat);
  upperSpire.rotation.y = Math.PI / 4;
  upperSpire.position.y = 35.6;
  tower.add(upperSpire);

  const topDeck = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 1.9), eiffelMat);
  topDeck.position.y = 44.8;
  tower.add(topDeck);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.28, 4.8, 6), eiffelMat);
  antenna.position.y = 47.6;
  tower.add(antenna);

  // Sweeping Golden Night Searchlight Beacon rotating smoothly from the summit!
  const beaconPivot = new THREE.Group();
  beaconPivot.position.set(0, 45.2, 0);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beamGeo = new THREE.ConeGeometry(3.2, 34, 10, 1, true);
  beamGeo.rotateZ(-Math.PI / 2);
  beamGeo.translate(17, 0, 0);
  beaconPivot.add(new THREE.Mesh(beamGeo, beaconMat));
  const beamOpp = new THREE.Mesh(beamGeo, beaconMat);
  beamOpp.rotation.y = Math.PI;
  beaconPivot.add(beamOpp);
  tower.add(beaconPivot);

  // 64 Animated Golden Twinkle Sparkles along the Eiffel Tower (ONE THREE.Points draw call!)
  const twCount = 64;
  const twPos = new Float32Array(twCount * 3);
  for (let t = 0; t < twCount; t++) {
    const hRatio = t / (twCount - 1);
    const ty = 6.5 + hRatio * 39;
    const spread = (1 - hRatio) * 4.5 + 0.55;
    twPos[t * 3] = Math.sin(t * 2.4) * spread;
    twPos[t * 3 + 1] = ty;
    twPos[t * 3 + 2] = Math.cos(t * 1.9) * spread + 1.0;
  }
  const twGeo = new THREE.BufferGeometry();
  twGeo.setAttribute('position', new THREE.BufferAttribute(twPos, 3));
  const twinkleMat = new THREE.PointsMaterial({
    size: 1.8,
    color: 0xfde68a,
    map: getSharedGlowSpriteTexture(),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  tower.add(new THREE.Points(twGeo, twinkleMat));
  root.add(tower);

  // Snow blanket layer on terrace coping (toggled cleanly when climateState === 'winter')
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.88 });
  const snowCoping = new THREE.Mesh(new THREE.BoxGeometry(58, 0.09, 0.48), snowMat);
  snowCoping.position.set(0, 0.42, -17.5);
  snowCoping.visible = false;
  root.add(snowCoping);

  const ctx = addSurrounding360Context(root, 'eiffel_tower');
  disableShadowsRecursive(root);

  return {
    id: 'eiffel_tower',
    root,
    envHint: {
      fogColorDay: 0xe2e8f0,
      fogColorNight: 0x0e1426,
      fogDensityScale: 0.72,
    },
    update: (dt, elapsed, isNight, climateState, weather) => {
      ctx.update(isNight, climateState);
      eiffelMat.emissiveIntensity = isNight ? 0.92 : 0.07;
      winWarmMat.emissiveIntensity = isNight ? 1.9 : 0.22;
      haussmannMat.emissiveIntensity = isNight ? 1.35 : 0.1;
      snowCoping.visible = climateState === 'winter';
      slateRoofMat.color.setHex(climateState === 'winter' ? 0xdbeafe : 0x3b4858);
      boulevardTreeMat.color.setHex(climateState === 'winter' ? 0xd8e6f2 : 0x3a6b35);
      cobbleMat.roughness = weather === 'rainy' ? 0.25 : 0.82;

      beaconPivot.rotation.y += dt * 0.42;
      beaconMat.opacity = isNight ? 0.16 : 0.0;
      twinkleMat.opacity = isNight ? 0.65 + Math.sin(elapsed * 6.5) * 0.3 : 0.0;
      twinkleMat.size = isNight ? 1.7 + Math.sin(elapsed * 8.2) * 0.45 : 0.8;
    },
  };
}

export function buildEiffelTowerDiorama(): THREE.Group {
  const g = createDioramaBase(0x94a3b8);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x785946,
    metalness: 0.45,
    roughness: 0.5,
    emissive: 0xd97706,
    emissiveIntensity: 0.25,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.46, 0.52, 4), mat);
  base.rotation.y = Math.PI / 4;
  base.position.y = 0.28;
  g.add(base);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.42), mat);
  deck.position.y = 0.54;
  g.add(deck);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.17, 0.86, 4), mat);
  spire.rotation.y = Math.PI / 4;
  spire.position.y = 0.98;
  g.add(spire);
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfde68a })
  );
  star.position.y = 1.44;
  g.add(star);
  return g;
}

// ============================================================================
// 8. SWITZERLAND HILLTOP (True High-Altitude Cliffside Overlook, Deep Glacial
//    Valley & Lake Below, Grounded Upper/Lower Funicular Stations + Steel Viaduct,
//    Multi-Tier Spruces, Swiss Flag & Alpine Chalets)
// ============================================================================
export function buildSwitzerlandHilltopScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_switzerland_hilltop';

  const chaletWoodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.82 });
  const stoneRetainingMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92, flatShading: true });
  const alpineMeadowMat = new THREE.MeshStandardMaterial({ color: 0x3f7d44, roughness: 0.9, flatShading: true });
  const snowPeakMat = new THREE.MeshStandardMaterial({ color: 0xf1f7ff, roughness: 0.84, flatShading: true });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9, flatShading: true });
  const spruceMatA = new THREE.MeshStandardMaterial({ color: 0x1b4d36, roughness: 0.86 });
  const spruceMatB = new THREE.MeshStandardMaterial({ color: 0x255e43, roughness: 0.84 });
  const chaletRoofMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.78 });
  const chaletWinMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.35,
    roughness: 0.25,
  });

  // Grounded stone cliff retaining wall & sheer rocky escarpment directly beneath the chalet terrace (z = -17.5)
  const terraceRetainingWall = new THREE.Mesh(
    new THREE.BoxGeometry(68, 7.5, 1.8),
    stoneRetainingMat
  );
  terraceRetainingWall.position.set(0, -3.55, -18.2);
  root.add(terraceRetainingWall);

  // Wooden chalet terrace guardrail seated squarely atop the stone retaining coping
  const rail = new THREE.Mesh(new THREE.BoxGeometry(60, 0.12, 0.14), chaletWoodMat);
  rail.position.set(0, 1.06, -17.5);
  root.add(rail);
  const midRail = new THREE.Mesh(new THREE.BoxGeometry(60, 0.08, 0.1), chaletWoodMat);
  midRail.position.set(0, 0.62, -17.5);
  root.add(midRail);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.18, 0.14), chaletWoodMat, 30);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 30; i++) {
    dummy.position.set(-29 + i * 2.0, 0.56, -17.5);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  root.add(posts);

  // Iconic Swiss Red-Cross Flagpole + Stacked Alpine Firewood at the overlook corner
  const flagPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 4.6, 7),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.7 })
  );
  flagPole.position.set(-9.5, 2.3, -17.5);
  root.add(flagPole);
  const swissFlag = new THREE.Group();
  swissFlag.position.set(-9.5, 4.15, -17.5);
  const flagCloth = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.92, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.78 })
  );
  flagCloth.position.x = 0.55;
  swissFlag.add(flagCloth);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.06), whiteMat);
  crossV.position.x = 0.55;
  swissFlag.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.06), whiteMat);
  crossH.position.x = 0.55;
  swissFlag.add(crossH);
  root.add(swissFlag);

  // Steep Rocky Alpine Cliffside plunging from terrace (y = -0.3) straight down into the deep glacial valley (y = -28)!
  const steepCliff = new THREE.Mesh(new THREE.PlaneGeometry(180, 42), rockMat);
  steepCliff.rotation.x = -Math.PI * 0.26;
  steepCliff.position.set(0, -14.2, -31.8);
  root.add(steepCliff);

  // Deep Alpine Valley Floor far below (y = -28.0) with shimmering turquoise glacial lake!
  const valleyMeadow = new THREE.Mesh(new THREE.PlaneGeometry(250, 175), alpineMeadowMat);
  valleyMeadow.rotation.x = -Math.PI / 2;
  valleyMeadow.position.set(0, -28.0, -102);
  root.add(valleyMeadow);

  const lakeMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.18,
    metalness: 0.28,
  });
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(92, 42), lakeMat);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(-14, -27.7, -78);
  root.add(lake);

  // Winding valley alpine ribbon road far below
  const valleyRoad = new THREE.Mesh(
    new THREE.PlaneGeometry(165, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
  );
  valleyRoad.rotation.x = -Math.PI / 2;
  valleyRoad.rotation.z = 0.06;
  valleyRoad.position.set(8, -27.72, -55);
  root.add(valleyRoad);

  // Grounded cliffside rock shoulders framing left & right slopes
  const rightCliffMass = new THREE.Mesh(new THREE.ConeGeometry(28, 28, 8), rockMat);
  rightCliffMass.scale.set(1.3, 1.0, 0.9);
  rightCliffMass.position.set(22, -14, -30);
  root.add(rightCliffMass);
  const leftCliffMass = new THREE.Mesh(new THREE.ConeGeometry(28, 26, 8), rockMat);
  leftCliffMass.scale.set(1.3, 0.95, 0.9);
  leftCliffMass.position.set(-28, -14.5, -34);
  root.add(leftCliffMass);

  // Miniature Swiss Valley Village Chalets nestled far below along the glacial lake!
  const valleyChaletSpots: Array<[number, number, number]> = [
    [-26, -54, 0.22], [-18, -56, -0.14], [-8, -52, 0.32], [4, -56, -0.2],
    [16, -54, 0.18], [26, -58, -0.3], [-32, -64, 0.4], [24, -68, -0.25],
  ];
  valleyChaletSpots.forEach(([vx, vz, ry]) => {
    const cg = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.3, 3.2), chaletWoodMat);
    body.position.y = 1.15;
    cg.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.65, 4), chaletRoofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.05;
    cg.add(roof);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.75), chaletWinMat);
    win.position.set(0, 1.35, 1.63);
    cg.add(win);
    cg.position.set(vx, -28.0, vz);
    cg.rotation.y = ry;
    root.add(cg);
  });

  // Majestic snow-capped Swiss Alpine peaks towering across the 180-degree front horizon
  const peakSpecs: Array<[number, number, number, number]> = [
    [-88, -104, 38, 62],
    [-54, -122, 34, 68],
    [-18, -132, 38, 76],
    [18, -126, 36, 72],
    [54, -118, 34, 64],
    [88, -102, 38, 58],
  ];
  peakSpecs.forEach(([px, pz, r, h]) => {
    const base = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rockMat);
    base.position.set(px, h * 0.34 - 24, pz);
    root.add(base);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.56, h * 0.56, 7), snowPeakMat);
    cap.position.set(px, h * 0.62 - 24, pz);
    root.add(cap);
  });

  // Multi-tier Snow-Dusted Swiss Spruce Trees seated cleanly along the upper cliff margin
  const spruceCount = 36;
  const spTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.18, 2.6, 6),
    chaletWoodMat,
    spruceCount
  );
  const spLower = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.45, 3.0, 7),
    spruceMatA,
    spruceCount
  );
  const spUpper = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.05, 2.7, 7),
    spruceMatB,
    spruceCount
  );
  const spSnowCaps = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.76, 1.75, 7),
    snowPeakMat,
    spruceCount
  );
  for (let i = 0; i < spruceCount; i++) {
    const x = -34 + i * 1.95 + (i % 2 === 0 ? -0.35 : 0.35);
    const z = -19.8 - (i % 4) * 3.0;
    const slopeT = Math.max(0, Math.min(1, (-18.0 - z) / 26.0));
    const groundY = -0.65 - slopeT * 17.5;
    const sc = 0.85 + (i % 3) * 0.22;

    dummy.position.set(x, groundY + 1.0 * sc, z);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    spTrunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, groundY + 2.8 * sc, z);
    dummy.updateMatrix();
    spLower.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, groundY + 4.25 * sc, z);
    dummy.updateMatrix();
    spUpper.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, groundY + 4.95 * sc, z);
    dummy.updateMatrix();
    spSnowCaps.setMatrixAt(i, dummy.matrix);
  }
  spTrunks.instanceMatrix.needsUpdate = true;
  spLower.instanceMatrix.needsUpdate = true;
  spUpper.instanceMatrix.needsUpdate = true;
  spSnowCaps.instanceMatrix.needsUpdate = true;
  root.add(spTrunks, spLower, spUpper, spSnowCaps);

  // === GROUNDED CLIFFSIDE INCLINED ELEVATOR (FUNICULAR) — ZERO CLIPPING! ===
  // Upper Station sits flush with the cliffside overlook terrace (y = 0.0, z = -19.8);
  // Lower Station sits clearly on a lower cliffside terrace overlooking the valley (y = -17.2, z = -43.5).
  const upperPos = new THREE.Vector3(12.2, 0.35, -20.2);
  const lowerPos = new THREE.Vector3(-10.5, -16.8, -43.0);
  const trackVec = new THREE.Vector3().subVectors(upperPos, lowerPos);
  const trackLen = trackVec.length();
  const trackMid = new THREE.Vector3().addVectors(lowerPos, upperPos).multiplyScalar(0.5);

  const railSteelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.38,
    metalness: 0.78,
  });
  const trackBeam = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.44, trackLen + 0.6), railSteelMat);
  trackBeam.position.copy(trackMid);
  trackBeam.lookAt(upperPos);
  root.add(trackBeam);

  // Dual steel running rails atop the viaduct deck
  [-0.55, 0.55].forEach((offset) => {
    const subRail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, trackLen + 0.4), snowPeakMat);
    subRail.position.copy(trackMid).add(new THREE.Vector3(offset, 0.28, 0));
    subRail.lookAt(upperPos.clone().add(new THREE.Vector3(offset, 0.28, 0)));
    root.add(subRail);
  });

  // 8 solid stone-and-steel trestle piers extending cleanly down into the rock cliff/valley floor
  const pierCount = 8;
  const pierPos = new THREE.Vector3();
  for (let p = 0; p < pierCount; p++) {
    const frac = p / (pierCount - 1);
    pierPos.lerpVectors(lowerPos, upperPos, frac);
    const pierTopY = pierPos.y - 0.18;
    const pierBottomY = -28.5;
    const pierH = Math.max(2.0, pierTopY - pierBottomY);
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.45, pierH, 1.45), stoneRetainingMat);
    pier.position.set(pierPos.x, pierBottomY + pierH / 2, pierPos.z);
    root.add(pier);
  }

  // Distinct Upper & Lower Funicular Pavilion Stations with deep stone plinths
  const stationWallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.75 });
  const roofRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.62 });
  [
    { pos: upperPos, offset: new THREE.Vector3(1.6, -0.45, 0.9) },
    { pos: lowerPos, offset: new THREE.Vector3(-1.4, -0.5, -1.2) },
  ].forEach(({ pos, offset }) => {
    const st = new THREE.Group();
    const foundationH = Math.max(5.5, pos.y + 28.5);
    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, foundationH, 3.8),
      stoneRetainingMat
    );
    foundation.position.y = -foundationH / 2 - 0.1;
    st.add(foundation);
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.5, 3.4), stationWallMat);
    base.position.y = 1.15;
    st.add(base);
    const stationWin = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.05), chaletWinMat);
    stationWin.position.set(0, 1.25, 1.73);
    st.add(stationWin);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.35, 4), roofRedMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 3.05;
    st.add(roof);
    st.position.copy(pos).add(offset);
    root.add(st);
  });

  // Animated Red & Glass Swiss Funicular Cabin strictly clamped to [0, 1] along the viaduct!
  const cabinGroup = new THREE.Group();
  const cabinBogie = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.4, 1.4), railSteelMat);
  cabinBogie.position.y = 0.22;
  cabinGroup.add(cabinBogie);
  const cabinBody = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.65, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.24 })
  );
  cabinBody.position.y = 1.22;
  cabinGroup.add(cabinBody);
  const cabinGlassMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.35,
    roughness: 0.14,
    metalness: 0.35,
  });
  const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.78, 1.48), cabinGlassMat);
  cabinGlass.position.y = 1.42;
  cabinGroup.add(cabinGlass);
  const cabinWhiteStripe = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.18, 1.84), whiteMat);
  cabinWhiteStripe.position.y = 0.78;
  cabinGroup.add(cabinWhiteStripe);
  cabinGroup.position.copy(lowerPos);
  root.add(cabinGroup);

  const ctx = addSurrounding360Context(root, 'switzerland_hilltop');

  // Funicular state machine: smooth travel (11s) + 5.0s boarding pause at each station
  let funicularPhase: 'pause_low' | 'going_up' | 'pause_high' | 'going_down' = 'going_up';
  let funicularTimer = 0;
  const travelDuration = 11.0;
  const pauseDuration = 5.0;

  disableShadowsRecursive(root);

  return {
    id: 'switzerland_hilltop',
    root,
    envHint: {
      fogColorDay: 0xdbeafe,
      fogColorNight: 0x0d1729,
      fogDensityScale: 0.68,
    },
    update: (dt, elapsed, isNight, climateState) => {
      ctx.update(isNight, climateState);
      alpineMeadowMat.color.setHex(climateState === 'winter' ? 0xeef5fc : 0x3f7d44);
      spruceMatA.color.setHex(climateState === 'winter' ? 0x3b6e5c : 0x1b4d36);
      spruceMatB.color.setHex(climateState === 'winter' ? 0x4b7f6e : 0x255e43);
      chaletRoofMat.color.setHex(climateState === 'winter' ? 0xf1f7ff : 0x7c2d12);
      chaletWinMat.emissiveIntensity = isNight ? 1.8 : 0.25;
      cabinGlassMat.emissiveIntensity = isNight ? 1.85 : 0.28;
      lakeMat.color.setHex(isNight ? 0x0b2545 : 0x0284c7);
      swissFlag.rotation.y = Math.sin(elapsed * 2.8) * 0.22;

      funicularTimer += dt;
      let t = 0;
      if (funicularPhase === 'going_up') {
        const raw = Math.min(1, funicularTimer / travelDuration);
        t = raw * raw * (3 - 2 * raw);
        if (raw >= 1) {
          funicularPhase = 'pause_high';
          funicularTimer = 0;
        }
      } else if (funicularPhase === 'pause_high') {
        t = 1;
        if (funicularTimer >= pauseDuration) {
          funicularPhase = 'going_down';
          funicularTimer = 0;
        }
      } else if (funicularPhase === 'going_down') {
        const raw = Math.min(1, funicularTimer / travelDuration);
        t = 1 - raw * raw * (3 - 2 * raw);
        if (raw >= 1) {
          funicularPhase = 'pause_low';
          funicularTimer = 0;
        }
      } else {
        t = 0;
        if (funicularTimer >= pauseDuration) {
          funicularPhase = 'going_up';
          funicularTimer = 0;
        }
      }
      // Strictly clamped [0, 1] along track deck so cabin never clips or buries underground!
      const clampedT = Math.max(0, Math.min(1, t));
      cabinGroup.position.lerpVectors(lowerPos, upperPos, clampedT);
    },
  };
}

export function buildSwitzerlandHilltopDiorama(): THREE.Group {
  const g = createDioramaBase(0xeef5fc);
  const rock = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 1.05, 6),
    new THREE.MeshStandardMaterial({ color: 0x4b5563, flatShading: true })
  );
  rock.position.set(-0.18, 0.52, -0.22);
  g.add(rock);
  const snow = new THREE.Mesh(
    new THREE.ConeGeometry(0.36, 0.56, 6),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true })
  );
  snow.position.set(-0.18, 0.84, -0.22);
  g.add(snow);
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.05, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x334155 })
  );
  track.position.set(0.32, 0.34, 0.14);
  track.rotation.set(0.48, -0.3, 0);
  g.add(track);
  const car = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.18, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 })
  );
  car.position.set(0.35, 0.45, 0.16);
  g.add(car);
  return g;
}

// ============================================================================
// 9. MT. EVEREST & HIKER TRAIL (Cleared Wide Trail, Expedition Dome Tents,
//    Supply Crates & O2 Cylinders, Himalayan Chorten Cairn, Readable Signpost,
//    Multi-Tier Firs & Animated Summit Spindrift Snow Stream)
// ============================================================================
export function buildMtEverestScenery(): SceneryRuntimeInstance {
  const root = new THREE.Group();
  root.name = 'scenery_mt_everest';

  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf1f7ff, roughness: 0.85, flatShading: true });
  const slateMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92, flatShading: true });
  const stoneTrailMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.94 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.84 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });

  // Expansive snowfield beyond the cafe lane
  const snowField = new THREE.Mesh(new THREE.PlaneGeometry(210, 160), snowMat);
  snowField.rotation.x = -Math.PI / 2;
  snowField.position.set(0, -0.05, -94);
  root.add(snowField);

  // Winding stone hiker trail leading cleanly from base camp toward Everest
  const trailStones = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.68, 0.78, 0.12, 6),
    stoneTrailMat,
    24
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const x = Math.sin(t * Math.PI * 1.4) * 3.6;
    const z = -17.5 - i * 2.2;
    dummy.position.set(x, 0.04, z);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(1.15 + (i % 3) * 0.2, 1, 0.92);
    dummy.updateMatrix();
    trailStones.setMatrixAt(i, dummy.matrix);
  }
  trailStones.instanceMatrix.needsUpdate = true;
  root.add(trailStones);

  // Flanking snowdrifts pushed cleanly behind z <= -23.5 so the hiker trail is wide open!
  [
    [-19, -24.5, 7.5, 2.3],
    [18.5, -25.0, 8.2, 2.5],
    [-27, -36, 12, 4.4],
    [26, -37, 11.5, 4.2],
  ].forEach(([sx, sz, r, h]) => {
    const drift = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 7), snowMat);
    drift.scale.set(1.4, h / r, 0.9);
    drift.position.set(sx, 0, sz);
    root.add(drift);
  });

  // Vibrant Base-Camp Expedition Dome Tents with warm glowing interior lantern light!
  const tentYellowMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    emissive: 0xd97706,
    emissiveIntensity: 0.22,
    roughness: 0.74,
  });
  const tentOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    emissive: 0xf97316,
    emissiveIntensity: 0.22,
    roughness: 0.74,
  });
  const tentTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const tentSpecs = [
    { x: -10.8, z: -22.2, rotY: 0.35, mat: tentYellowMat, sc: 1.05 },
    { x: 10.6, z: -22.8, rotY: -0.4, mat: tentOrangeMat, sc: 1.0 },
    { x: 14.5, z: -26.5, rotY: -0.18, mat: tentYellowMat, sc: 0.92 },
  ];
  tentSpecs.forEach((ts) => {
    const tg = new THREE.Group();
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.54),
      ts.mat
    );
    dome.scale.set(1.05, 0.92, 1.25);
    tg.add(dome);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.88, 0.16), tentTrimMat);
    door.position.set(0, 0.44, 1.72);
    tg.add(door);
    tg.position.set(ts.x, 0.0, ts.z);
    tg.rotation.y = ts.rotY;
    tg.scale.setScalar(ts.sc);
    root.add(tg);
  });

  // Expedition Supply Crates & Oxygen Cylinders stacked beside the dome tents
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75 });
  const o2Mat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.35, metalness: 0.5 });
  [
    [-8.6, -21.8],
    [8.8, -22.2],
  ].forEach(([cx, cz]) => {
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.52, 0.65), crateMat);
    crate1.position.set(cx, 0.26, cz);
    root.add(crate1);
    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.42, 0.52), woodMat);
    crate2.position.set(cx + 0.08, 0.73, cz);
    crate2.rotation.y = 0.22;
    root.add(crate2);
    for (let k = 0; k < 2; k++) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.72, 7), o2Mat);
      tank.position.set(cx + 0.65 + k * 0.24, 0.36, cz + 0.1);
      root.add(tank);
    }
  });

  // Carved Stone Himalayan Chorten / Stupa Cairn anchored to the prayer flag lines
  const chorten = new THREE.Group();
  chorten.position.set(-6.4, 0, -18.4);
  const cBase = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.9, 1.55), stoneTrailMat);
  cBase.position.y = 0.45;
  chorten.add(cBase);
  const cDome = new THREE.Mesh(new THREE.SphereGeometry(0.58, 9, 7), snowMat);
  cDome.position.y = 1.25;
  chorten.add(cDome);
  const cSpire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.15, 6), lanternMat);
  cSpire.position.y = 2.25;
  chorten.add(cSpire);
  root.add(chorten);

  // Readable Wooden Base-Camp Trail Signpost (`EVEREST BASE CAMP • 5,364m`) + Warm Expedition Lanterns
  const signTex = createEverestSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex ?? undefined,
    color: 0xffffff,
    roughness: 0.78,
  });
  [
    [-6.4, -18.4],
    [6.4, -18.4],
    [-2.6, -26.5],
    [3.8, -32.0],
  ].forEach(([px, pz], idx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.75, 7), woodMat);
    post.position.set(px, 1.38, pz);
    root.add(post);
    if (idx === 1) {
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.68, 0.08), signMat);
      signBoard.position.set(px - 0.35, 2.05, pz + 0.06);
      signBoard.rotation.y = -0.18;
      root.add(signBoard);
    }
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.28, 6), lanternMat);
    lantern.position.set(px, 2.74, pz);
    root.add(lantern);
  });

  // Fluttering Colorful Tibetan Prayer Flag Lines anchored to the Chorten & Trail Poles
  const flagColors = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];
  const prayerFlags: Array<{ mesh: THREE.Mesh; baseRotX: number; phase: number }> = [];
  const lineRuns: Array<[THREE.Vector3, THREE.Vector3]> = [
    [new THREE.Vector3(-6.4, 2.6, -18.4), new THREE.Vector3(6.4, 2.6, -18.4)],
    [new THREE.Vector3(-6.4, 2.45, -18.4), new THREE.Vector3(-2.6, 2.45, -26.5)],
    [new THREE.Vector3(6.4, 2.45, -18.4), new THREE.Vector3(3.8, 2.45, -32.0)],
  ];
  const ropeMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
  const flagGeo = new THREE.PlaneGeometry(0.38, 0.48);

  lineRuns.forEach(([a, b], runIdx) => {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mid.y -= 0.42;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(16)), ropeMat));

    const count = 13;
    for (let f = 1; f < count; f++) {
      const pt = curve.getPoint(f / count);
      const fMat = new THREE.MeshStandardMaterial({
        color: flagColors[(f + runIdx) % flagColors.length],
        roughness: 0.72,
        side: THREE.DoubleSide,
      });
      const flag = new THREE.Mesh(flagGeo, fMat);
      flag.position.set(pt.x, pt.y - 0.24, pt.z);
      root.add(flag);
      prayerFlags.push({ mesh: flag, baseRotX: 0.14, phase: f * 0.7 + runIdx * 1.9 });
    }
  });

  // Massive Jagged Snow-and-Slate Mt. Everest Summit Pyramid + Flanking Himalayan Peaks
  const everestGroup = new THREE.Group();
  everestGroup.position.set(0, 0, -96);

  const mainSlate = new THREE.Mesh(new THREE.ConeGeometry(42, 56, 5), slateMat);
  mainSlate.position.set(0, 26, 0);
  mainSlate.rotation.y = 0.35;
  everestGroup.add(mainSlate);

  const mainSnow = new THREE.Mesh(new THREE.ConeGeometry(34, 50, 5), snowMat);
  mainSnow.position.set(-1.5, 29, 3.5);
  mainSnow.rotation.y = 0.35;
  everestGroup.add(mainSnow);

  // Flanking Nuptse & Lhotse ridges
  const leftPeak = new THREE.Mesh(new THREE.ConeGeometry(28, 36, 5), slateMat);
  leftPeak.position.set(-34, 17, 10);
  everestGroup.add(leftPeak);
  const leftSnow = new THREE.Mesh(new THREE.ConeGeometry(19, 25, 5), snowMat);
  leftSnow.position.set(-34, 23, 12);
  everestGroup.add(leftSnow);

  const rightPeak = new THREE.Mesh(new THREE.ConeGeometry(30, 39, 5), slateMat);
  rightPeak.position.set(36, 18, 8);
  everestGroup.add(rightPeak);
  const rightSnow = new THREE.Mesh(new THREE.ConeGeometry(20, 27, 5), snowMat);
  rightSnow.position.set(36, 24.5, 10);
  everestGroup.add(rightSnow);

  // Animated wind-blown Summit Spindrift Snow particle stream (THREE.Points!)
  const spinCount = 95;
  const spinPos = new Float32Array(spinCount * 3);
  for (let i = 0; i < spinCount; i++) {
    const t = i / spinCount;
    spinPos[i * 3] = t * 36;
    spinPos[i * 3 + 1] = 52.5 + Math.sin(t * Math.PI) * 2.4 - t * 3.8 + (Math.random() - 0.5) * 1.6;
    spinPos[i * 3 + 2] = 2 + (Math.random() - 0.5) * 3.5;
  }
  const spinGeo = new THREE.BufferGeometry();
  spinGeo.setAttribute('position', new THREE.BufferAttribute(spinPos, 3));
  const spinMat = new THREE.PointsMaterial({
    size: 4.8,
    color: 0xe0f2fe,
    map: getSharedGlowSpriteTexture(),
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  everestGroup.add(new THREE.Points(spinGeo, spinMat));
  root.add(everestGroup);

  // Multi-tier Snow-Dusted Himalayan Conifers framing the base-camp trail margins
  const firMatA = new THREE.MeshStandardMaterial({ color: 0x264f43, roughness: 0.88 });
  const firMatB = new THREE.MeshStandardMaterial({ color: 0x316354, roughness: 0.86 });
  const firSpots: Array<[number, number, number]> = [
    [-14.5, -21.5, 1.08], [-11.5, -27.5, 0.96], [-19.5, -29.5, 1.2], [-15.0, -35.0, 1.12],
    [13.8, -21.5, 1.02], [17.2, -28.0, 1.15], [11.2, -31.5, 0.98], [20.5, -33.5, 1.24],
    [-23.0, -23.5, 1.15], [23.5, -24.0, 1.12],
  ];
  const firTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.17, 2.3, 6),
    woodMat,
    firSpots.length
  );
  const firLower = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.4, 2.9, 7),
    firMatA,
    firSpots.length
  );
  const firUpper = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.05, 2.6, 7),
    firMatB,
    firSpots.length
  );
  const firSnow = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.78, 1.8, 7),
    snowMat,
    firSpots.length
  );
  firSpots.forEach(([fx, fz, sc], idx) => {
    dummy.position.set(fx, 1.0 * sc, fz);
    dummy.rotation.set(0, idx * 0.8, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    firTrunks.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(fx, 2.75 * sc, fz);
    dummy.updateMatrix();
    firLower.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(fx, 4.1 * sc, fz);
    dummy.updateMatrix();
    firUpper.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(fx, 4.8 * sc, fz);
    dummy.updateMatrix();
    firSnow.setMatrixAt(idx, dummy.matrix);
  });
  firTrunks.instanceMatrix.needsUpdate = true;
  firLower.instanceMatrix.needsUpdate = true;
  firUpper.instanceMatrix.needsUpdate = true;
  firSnow.instanceMatrix.needsUpdate = true;
  root.add(firTrunks, firLower, firUpper, firSnow);

  const ctx = addSurrounding360Context(root, 'mt_everest');
  disableShadowsRecursive(root);

  return {
    id: 'mt_everest',
    root,
    envHint: {
      fogColorDay: 0xdceeff,
      fogColorNight: 0x0b162a,
      fogDensityScale: 0.7,
      sunColorOverride: 0xdceeff,
      alwaysWinter: true,
    },
    update: (dt, elapsed, isNight, climateState) => {
      ctx.update(isNight, climateState);
      lanternMat.emissiveIntensity = isNight ? 2.2 : 1.15;
      tentYellowMat.emissiveIntensity = isNight ? 0.72 : 0.14;
      tentOrangeMat.emissiveIntensity = isNight ? 0.72 : 0.14;

      // Stream spindrift snow off Everest's summit in the high-altitude jet stream
      const attr = spinGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < spinCount; i++) {
        let sx = attr.getX(i) + dt * (6.2 + (i % 4) * 1.4);
        let sy = attr.getY(i) - dt * 0.45 + Math.sin(elapsed * 2.5 + i) * dt * 0.5;
        if (sx > 38) {
          sx = -0.5 + (i % 3) * 0.6;
          sy = 52.8 + ((i % 5) - 2) * 0.5;
        }
        attr.setXY(i, sx, sy);
      }
      attr.needsUpdate = true;

      for (const pf of prayerFlags) {
        pf.mesh.rotation.x = pf.baseRotX + Math.sin(elapsed * 5.2 + pf.phase) * 0.28;
        pf.mesh.rotation.y = Math.cos(elapsed * 3.4 + pf.phase) * 0.16;
      }
    },
  };
}

export function buildMtEverestDiorama(): THREE.Group {
  const g = createDioramaBase(0xeef6ff, 0x1e293b);
  const slate = new THREE.Mesh(
    new THREE.ConeGeometry(0.68, 1.18, 5),
    new THREE.MeshStandardMaterial({ color: 0x334155, flatShading: true })
  );
  slate.position.set(0, 0.58, -0.18);
  g.add(slate);
  const snow = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, 0.88, 5),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true })
  );
  snow.position.set(-0.04, 0.74, -0.1);
  g.add(snow);
  const colors = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];
  colors.forEach((c, idx) => {
    const fl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.16),
      new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide })
    );
    fl.position.set(-0.42 + idx * 0.21, 0.32 - Math.abs(idx - 2) * 0.03, 0.44);
    g.add(fl);
  });
  return g;
}
