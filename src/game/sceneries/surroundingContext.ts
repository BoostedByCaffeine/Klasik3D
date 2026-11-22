import * as THREE from 'three';
import {
  resolveActivePatronOutfit,
  type ClimateState,
  type SceneryId,
} from '../sceneryData';
import {
  EIFFEL_DOWNHILL_START_Z,
  ROAD_ELEVATION_LAYERS,
  T_JUNCTION_BUILDING_FRONT_X,
  T_JUNCTION_FAR_SIDEWALK_WIDTH,
  T_JUNCTION_OUTER_EDGE,
  easeInOutCubic,
  getEiffelRoadPose,
  getSceneryRoadTopology,
  getSceneryStreetlightSpec,
  type DoorwayAnimationState,
  type DoorwayStyle,
} from '../outdoorLod';
import { batchStaticMeshesByMaterial } from './sceneryTypes';

export interface SurroundingContextHandle {
  update: (
    isNight: boolean,
    climateState: ClimateState,
    elapsed?: number,
    dt?: number,
    isRaining?: boolean,
    isPlayerOutside?: boolean
  ) => void;
}

export interface AnimatedDoorwayPlacement {
  x: number;
  z: number;
  /** Outward facing direction along Z: +1 faces +Z (toward cafe), -1 faces -Z (away from cafe) */
  facingZ: 1 | -1;
  width?: number;
  height?: number;
  seed?: number;
}

export interface AnimatedDoorwayHandle {
  group: THREE.Group;
  update: (
    dt: number,
    elapsed: number,
    isNight: boolean,
    isRaining: boolean,
    isPlayerOutside: boolean
  ) => void;
}

/**
 * Builds an outdoor-only animated building entrance/exit cluster (recessed interior foyer/genkan,
 * animated hinged/split-sliding/Kyoto-shoji doors with zero z-fighting, and outdoor NPC entry/exit
 * state machine). Parented inside `outdoorOnlyGroup` and completely skipped when `!isPlayerOutside`.
 */
export function createAnimatedDoorwayCluster(
  sceneryId: SceneryId,
  style: DoorwayStyle,
  placements: readonly AnimatedDoorwayPlacement[]
): AnimatedDoorwayHandle {
  const cluster = new THREE.Group();
  cluster.name = `animated_doorways_${sceneryId}`;
  cluster.userData.outdoorOnly = true;
  cluster.userData.noMerge = true;

  // Shared materials & geometries across all upgraded doorways (minimal draw calls & memory)
  const foyerDarkMat = new THREE.MeshStandardMaterial({
    color: style === 'kyoto_machiya_slide' ? 0x22160f : style === 'cyber_split_slide' ? 0x0b1222 : 0x161414,
    roughness: 0.92,
  });
  const foyerGlowMat = new THREE.MeshStandardMaterial({
    color: style === 'cyber_split_slide' ? 0x164e63 : 0xfef3c7,
    emissive: style === 'cyber_split_slide' ? 0x06b6d4 : 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: style === 'kyoto_machiya_slide' ? 0x2b1910 : style === 'cyber_split_slide' ? 0x1e293b : 0x27201c,
    roughness: style === 'cyber_split_slide' ? 0.35 : 0.72,
    metalness: style === 'cyber_split_slide' ? 0.72 : 0.15,
  });
  const woodLeafMat = new THREE.MeshStandardMaterial({
    color: style === 'kyoto_machiya_slide' ? 0x3b2416 : 0x5c341d,
    roughness: 0.68,
  });
  const glassOrWashiMat = new THREE.MeshStandardMaterial({
    color: style === 'kyoto_machiya_slide' ? 0xf6ebd4 : style === 'cyber_split_slide' ? 0x164e63 : 0xcbe7f7,
    emissive: style === 'kyoto_machiya_slide' ? 0xf59e0b : style === 'cyber_split_slide' ? 0x0891b2 : 0xfde68a,
    emissiveIntensity: style === 'kyoto_machiya_slide' ? 0.35 : 0.28,
    roughness: style === 'kyoto_machiya_slide' ? 0.78 : 0.18,
    metalness: style === 'cyber_split_slide' ? 0.35 : 0.08,
    transparent: true,
    opacity: style === 'kyoto_machiya_slide' ? 0.9 : 0.68,
  });
  const stepWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a22, roughness: 0.8 });

  // Shared NPC materials
  const skinTones = [0xf3d2b3, 0xe0ac69, 0xc68642, 0xffdbac, 0xd8a373];
  const outfitHexMap: Record<string, number[]> = {
    ancient_japanese: [0x9f1239, 0x1e3a5f, 0x3f6212, 0x6b21a8],
    filipino: [0xf5e9d4, 0xd97706, 0x0d9488],
    french: [0x1e293b, 0x7f1d1d, 0x334155],
    brazilian: [0xeab308, 0x16a34a, 0x2563eb],
    swiss: [0x991b1b, 0x1e3a5f, 0x3f6212],
    hiker: [0xea580c, 0x0284c7, 0x4d7c0f],
    default: style === 'cyber_split_slide'
      ? [0x0f172a, 0x1e1b4b, 0x3b0764, 0x111827]
      : style === 'kyoto_machiya_slide'
      ? [0x1e3a5f, 0x7c2d12, 0x365314, 0x4c1d95]
      : [0x3b82f6, 0x10b981, 0xf43f5e, 0xd97706],
  };
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.86 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x181412, roughness: 0.85 });
  const wagasaRedMat = new THREE.MeshStandardMaterial({
    color: style === 'kyoto_machiya_slide' ? 0xc8281c : style === 'cyber_split_slide' ? 0x06b6d4 : 0x334155,
    emissive: style === 'cyber_split_slide' ? 0x06b6d4 : 0x000000,
    emissiveIntensity: style === 'cyber_split_slide' ? 0.65 : 0,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  const wagasaRimMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.8 });

  interface DoorRig {
    state: DoorwayAnimationState;
    stateTimer: number;
    idleCooldown: number;
    openAmount: number;
    doorWidth: number;
    facingZ: 1 | -1;
    worldX: number;
    worldZ: number;
    hingePivot?: THREE.Group;
    leftSlide?: THREE.Group;
    rightSlide?: THREE.Group;
    shojiSlide?: THREE.Group;
    statusStripMat?: THREE.MeshBasicMaterial;
    npc: {
      root: THREE.Group;
      leftLeg: THREE.Mesh;
      rightLeg: THREE.Mesh;
      leftArm: THREE.Mesh;
      rightArm: THREE.Mesh;
      umbrella: THREE.Group;
      walkPhase: number;
      walkDirX: 1 | -1;
      progress: number;
    };
  }

  const doors: DoorRig[] = [];

  placements.forEach((p, idx) => {
    const doorW = p.width ?? (style === 'cyber_split_slide' ? 1.38 : style === 'kyoto_machiya_slide' ? 1.18 : 0.96);
    const doorH = p.height ?? 2.04;
    const foyerDepth = 1.6; // >= 1.4u recessed interior foyer/genkan
    const dg = new THREE.Group();
    dg.position.set(p.x, 0.08, p.z);
    // Rotate whole assembly so local +Z points strictly outward toward the street/sidewalk
    dg.rotation.y = p.facingZ === 1 ? 0 : Math.PI;
    dg.userData.noMerge = true;

    // 1. Recessed Interior Foyer / Genkan (extends backward into -Z inside building footprint)
    const foyerBack = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.24, doorH + 0.14, 0.12), foyerDarkMat);
    foyerBack.position.set(0, doorH * 0.5, -foyerDepth);
    const foyerSideL = new THREE.Mesh(new THREE.BoxGeometry(0.1, doorH + 0.14, foyerDepth), foyerDarkMat);
    foyerSideL.position.set(-doorW * 0.5 - 0.06, doorH * 0.5, -foyerDepth * 0.5);
    const foyerSideR = new THREE.Mesh(new THREE.BoxGeometry(0.1, doorH + 0.14, foyerDepth), foyerDarkMat);
    foyerSideR.position.set(doorW * 0.5 + 0.06, doorH * 0.5, -foyerDepth * 0.5);
    const foyerCeil = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.24, 0.1, foyerDepth), foyerDarkMat);
    foyerCeil.position.set(0, doorH + 0.06, -foyerDepth * 0.5);
    const foyerFloor = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.2, 0.06, foyerDepth), foyerDarkMat);
    foyerFloor.position.set(0, 0.02, -foyerDepth * 0.5);
    // Warm backlit foyer wall bounce (or cyber vestibule glow panel)
    const glowBounce = new THREE.Mesh(new THREE.PlaneGeometry(doorW * 0.78, doorH * 0.65), foyerGlowMat);
    glowBounce.position.set(0, doorH * 0.56, -foyerDepth + 0.08);
    dg.add(foyerBack, foyerSideL, foyerSideR, foyerCeil, foyerFloor, glowBounce);

    // Kyoto Machiya Genkan raised timber step + overhead kamoi/shikii cedar sliding tracks
    if (style === 'kyoto_machiya_slide') {
      const genkanStep = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.22, 0.65), stepWoodMat);
      genkanStep.position.set(0, 0.11, -foyerDepth + 0.42);
      const kamoi = new THREE.Mesh(new THREE.BoxGeometry(doorW * 1.95, 0.11, 0.14), frameMat);
      kamoi.position.set(doorW * 0.42, doorH + 0.06, 0.03);
      const shikii = new THREE.Mesh(new THREE.BoxGeometry(doorW * 1.95, 0.07, 0.14), frameMat);
      shikii.position.set(doorW * 0.42, 0.035, 0.03);
      dg.add(genkanStep, kamoi, shikii);
    }

    // Outer Door Frame Jambs & Lintel (+0.02 Z clearance from wall plane)
    const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.09, doorH + 0.12, 0.14), frameMat);
    jambL.position.set(-doorW * 0.5 - 0.045, doorH * 0.5, 0.02);
    const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.09, doorH + 0.12, 0.14), frameMat);
    jambR.position.set(doorW * 0.5 + 0.045, doorH * 0.5, 0.02);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.18, 0.11, 0.16), frameMat);
    lintel.position.set(0, doorH + 0.055, 0.02);
    dg.add(jambL, jambR, lintel);

    let hingePivot: THREE.Group | undefined;
    let leftSlide: THREE.Group | undefined;
    let rightSlide: THREE.Group | undefined;
    let shojiSlide: THREE.Group | undefined;
    let statusStripMat: THREE.MeshBasicMaterial | undefined;

    // 2. Style-Specific Animated Door Leaf(s) at Z-offset +0.02 clearance
    if (style === 'hinged_shop') {
      hingePivot = new THREE.Group();
      hingePivot.position.set(-doorW * 0.5, 0, 0.02);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.06), woodLeafMat);
      leaf.position.set(doorW * 0.5, doorH * 0.5, 0);
      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(doorW * 0.66, doorH * 0.46), glassOrWashiMat);
      glassPane.position.set(doorW * 0.5, doorH * 0.64, 0.035);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.08), frameMat);
      handle.position.set(doorW * 0.86, doorH * 0.48, 0.04);
      hingePivot.add(leaf, glassPane, handle);
      dg.add(hingePivot);
    } else if (style === 'cyber_split_slide') {
      statusStripMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const topStrip = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.16, 0.07, 0.06), statusStripMat);
      topStrip.position.set(0, doorH + 0.13, 0.07);
      dg.add(topStrip);

      const halfW = doorW * 0.49;
      leftSlide = new THREE.Group();
      leftSlide.position.set(0, 0, 0.02);
      const lFrame = new THREE.Mesh(new THREE.BoxGeometry(halfW, doorH, 0.055), frameMat);
      lFrame.position.set(-halfW * 0.5, doorH * 0.5, 0);
      const lGlass = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 0.78, doorH * 0.82), glassOrWashiMat);
      lGlass.position.set(-halfW * 0.5, doorH * 0.5, 0.032);
      leftSlide.add(lFrame, lGlass);

      rightSlide = new THREE.Group();
      rightSlide.position.set(0, 0, 0.02);
      const rFrame = new THREE.Mesh(new THREE.BoxGeometry(halfW, doorH, 0.055), frameMat);
      rFrame.position.set(halfW * 0.5, doorH * 0.5, 0);
      const rGlass = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 0.78, doorH * 0.82), glassOrWashiMat);
      rGlass.position.set(halfW * 0.5, doorH * 0.5, 0.032);
      rightSlide.add(rFrame, rGlass);
      dg.add(leftSlide, rightSlide);
    } else {
      // Kyoto Machiya Sliding Hikido / Shoji Lattice Door sliding into right cedar wall pocket
      shojiSlide = new THREE.Group();
      shojiSlide.position.set(0, 0, 0.025);
      const lowerCedar = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH * 0.34, 0.05), woodLeafMat);
      lowerCedar.position.set(0, doorH * 0.17, 0);
      const washiPanel = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.08, doorH * 0.62, 0.03), glassOrWashiMat);
      washiPanel.position.set(0, doorH * 0.66, 0);
      shojiSlide.add(lowerCedar, washiPanel);
      // Crisp vertical & horizontal kumiko cedar lattice bars
      for (let bx = -1; bx <= 1; bx++) {
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.032, doorH * 0.64, 0.052), frameMat);
        vBar.position.set(bx * (doorW * 0.28), doorH * 0.66, 0);
        shojiSlide.add(vBar);
      }
      for (let by = 0; by < 3; by++) {
        const hBar = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.04, 0.028, 0.052), frameMat);
        hBar.position.set(0, doorH * (0.44 + by * 0.19), 0);
        shojiSlide.add(hBar);
      }
      dg.add(shojiSlide);
    }

    // 3. Dedicated Lightweight Articulated Outdoor Doorway NPC (resolved via resolveActivePatronOutfit)
    const outfitRes = resolveActivePatronOutfit({
      activeScenery: sceneryId,
      climateState: 'summer',
      unlockedPatronOutfits: ['ancient_japanese', 'filipino', 'french', 'brazilian', 'swiss', 'hiker'],
      mode: 'auto_match',
      equippedOutfitId: null,
      enabledCustomMixIds: [],
      isSecretNpc: false,
      rng: () => ((idx * 31 + 7) % 100) / 100,
    });
    const palette = outfitHexMap[outfitRes.outfitId || 'default'] || outfitHexMap.default;
    const npcGroup = new THREE.Group();
    npcGroup.visible = false;
    npcGroup.userData.noMerge = true;

    const torsoMat = new THREE.MeshStandardMaterial({
      color: palette[(idx + (p.seed ?? 0)) % palette.length],
      roughness: 0.78,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinTones[(idx + (p.seed ?? 1)) % skinTones.length],
      roughness: 0.72,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 8, 7), skinMat);
    head.position.y = 1.5;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.155, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
    hair.position.y = 1.53;
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, style === 'kyoto_machiya_slide' ? 0.88 : 0.56, 0.22),
      torsoMat
    );
    torso.position.y = style === 'kyoto_machiya_slide' ? 0.92 : 1.06;
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.66, 0.13), pantsMat);
    leftLeg.position.set(-0.09, 0.34, 0);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.66, 0.13), pantsMat);
    rightLeg.position.set(0.09, 0.34, 0);
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.1), torsoMat);
    leftArm.position.set(-0.24, 1.06, 0);
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.1), torsoMat);
    rightArm.position.set(0.24, 1.06, 0);

    // Rain umbrella / Kyoto Wagasa oiled-paper parasol (auto-opens on threshold when isRaining === true)
    const umbrella = new THREE.Group();
    const uShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.88, 6), frameMat);
    uShaft.position.y = 0.44;
    const uCanopy = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.18, 10, 1, true), wagasaRedMat);
    uCanopy.position.y = 0.86;
    const uRim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.014, 4, 10), wagasaRimMat);
    uRim.rotation.x = Math.PI / 2;
    uRim.position.y = 0.77;
    umbrella.add(uShaft, uCanopy, uRim);
    umbrella.position.set(0.18, 1.24, 0.08);
    umbrella.visible = false;

    npcGroup.add(head, hair, torso, leftLeg, rightLeg, leftArm, rightArm, umbrella);
    dg.add(npcGroup);
    cluster.add(dg);

    doors.push({
      state: 'IdleClosed',
      stateTimer: 0,
      idleCooldown: 2.0 + idx * 2.4,
      openAmount: 0,
      doorWidth: doorW,
      facingZ: p.facingZ,
      worldX: p.x,
      worldZ: p.z,
      hingePivot,
      leftSlide,
      rightSlide,
      shojiSlide,
      statusStripMat,
      npc: {
        root: npcGroup,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        umbrella,
        walkPhase: idx * 1.1,
        walkDirX: idx % 2 === 0 ? 1 : -1,
        progress: 0,
      },
    });
  });

  const openDur = style === 'kyoto_machiya_slide' ? 0.45 : style === 'cyber_split_slide' ? 0.32 : 0.35;
  const closeDur = style === 'kyoto_machiya_slide' ? 0.5 : style === 'cyber_split_slide' ? 0.32 : 0.4;

  return {
    group: cluster,
    update: (dt, _elapsed, isNight, isRaining, isPlayerOutside) => {
      // Update warm dusk/night washi & foyer glow even on env sync tick
      foyerGlowMat.emissiveIntensity = isNight ? 1.35 : 0.35;
      glassOrWashiMat.emissiveIntensity =
        style === 'kyoto_machiya_slide'
          ? isNight ? 1.15 : 0.22
          : style === 'cyber_split_slide'
          ? isNight ? 0.9 : 0.38
          : isNight ? 0.72 : 0.14;

      // Strict Indoor FPS Protection: completely skip door & NPC animation state machines when indoors!
      if (!isPlayerOutside || dt <= 0) return;

      for (let i = 0; i < doors.length; i++) {
        const d = doors[i];
        d.stateTimer += dt;

        switch (d.state) {
          case 'IdleClosed': {
            d.openAmount = 0;
            d.npc.root.visible = false;
            d.idleCooldown -= dt;
            if (d.idleCooldown <= 0) {
              d.stateTimer = 0;
              d.npc.progress = 0;
              d.npc.walkDirX = ((i + Math.floor(_elapsed)) % 2 === 0 ? 1 : -1) as 1 | -1;
              // Alternate between NPC exiting building onto street & street NPC entering building
              const doExit = (i + Math.floor(_elapsed * 0.2)) % 2 === 0;
              if (doExit) {
                d.state = 'OpeningForExit';
                d.npc.root.visible = true;
                d.npc.root.position.set(0, 0, -0.95);
                d.npc.root.rotation.y = 0;
                d.npc.umbrella.visible = false;
              } else {
                d.state = 'OpeningForEntry';
                d.npc.root.visible = true;
                d.npc.root.position.set(d.npc.walkDirX * 2.2, 0, 1.45);
                d.npc.root.rotation.y = d.npc.walkDirX > 0 ? -Math.PI / 2 : Math.PI / 2;
                d.npc.umbrella.visible = isRaining;
              }
            }
            break;
          }
          case 'OpeningForExit': {
            d.openAmount = easeInOutCubic(d.stateTimer / openDur);
            if (d.openAmount >= 0.85 && d.stateTimer >= openDur + 0.15) {
              d.openAmount = 1;
              d.state = 'NpcExiting';
              d.stateTimer = 0;
              d.npc.progress = 0;
            }
            break;
          }
          case 'NpcExiting': {
            d.openAmount = 1;
            d.npc.progress += dt * 0.42;
            const p = Math.min(1, d.npc.progress);
            // Walk straight out through foyer (-0.95 -> +1.35) then turn onto sidewalk
            if (p < 0.48) {
              const u = p / 0.48;
              d.npc.root.position.set(0, 0, -0.95 + u * 2.3);
              d.npc.root.rotation.y = 0;
              d.npc.umbrella.visible = isRaining && u > 0.55;
            } else {
              const u = (p - 0.48) / 0.52;
              d.npc.root.position.set(d.npc.walkDirX * u * 2.8, 0, 1.35);
              d.npc.root.rotation.y = d.npc.walkDirX > 0 ? Math.PI / 2 : -Math.PI / 2;
              d.npc.umbrella.visible = isRaining;
            }
            d.npc.walkPhase += dt * 7.2;
            const s = Math.sin(d.npc.walkPhase);
            d.npc.leftLeg.rotation.x = s * 0.48;
            d.npc.rightLeg.rotation.x = -s * 0.48;
            d.npc.leftArm.rotation.x = -s * 0.36;
            d.npc.rightArm.rotation.x = d.npc.umbrella.visible ? -1.1 : s * 0.36;
            if (p >= 1) {
              d.npc.root.visible = false;
              d.state = 'ClosingAfterExit';
              d.stateTimer = 0;
            }
            break;
          }
          case 'ClosingAfterExit': {
            d.openAmount = 1 - easeInOutCubic(d.stateTimer / closeDur);
            if (d.stateTimer >= closeDur) {
              d.openAmount = 0;
              d.state = 'IdleClosed';
              d.stateTimer = 0;
              d.idleCooldown = 4.2 + (i % 3) * 1.9;
            }
            break;
          }
          case 'OpeningForEntry': {
            d.openAmount = easeInOutCubic(d.stateTimer / openDur);
            // Street NPC walks from sidewalk up to threshold while door opens
            const approach = Math.min(1, d.stateTimer / openDur);
            d.npc.root.position.set(d.npc.walkDirX * (1 - approach) * 1.8, 0, 1.45);
            d.npc.root.rotation.y = d.npc.walkDirX > 0 ? -Math.PI / 2 : Math.PI / 2;
            d.npc.umbrella.visible = isRaining;
            d.npc.walkPhase += dt * 6.8;
            const s = Math.sin(d.npc.walkPhase);
            d.npc.leftLeg.rotation.x = s * 0.44;
            d.npc.rightLeg.rotation.x = -s * 0.44;
            if (d.openAmount >= 0.85 && d.stateTimer >= openDur) {
              d.openAmount = 1;
              d.state = 'NpcEntering';
              d.stateTimer = 0;
              d.npc.progress = 0;
            }
            break;
          }
          case 'NpcEntering': {
            d.openAmount = 1;
            d.npc.progress += dt * 0.62;
            const p = Math.min(1, d.npc.progress);
            d.npc.root.position.set(0, 0, 1.45 - p * 2.45);
            d.npc.root.rotation.y = Math.PI;
            d.npc.umbrella.visible = isRaining && p < 0.42;
            d.npc.walkPhase += dt * 7.2;
            const s = Math.sin(d.npc.walkPhase);
            d.npc.leftLeg.rotation.x = s * 0.46;
            d.npc.rightLeg.rotation.x = -s * 0.46;
            d.npc.leftArm.rotation.x = -s * 0.35;
            d.npc.rightArm.rotation.x = d.npc.umbrella.visible ? -1.1 : s * 0.35;
            if (p >= 1) {
              d.npc.root.visible = false;
              d.state = 'ClosingAfterEntry';
              d.stateTimer = 0;
            }
            break;
          }
          case 'ClosingAfterEntry': {
            d.openAmount = 1 - easeInOutCubic(d.stateTimer / closeDur);
            if (d.stateTimer >= closeDur) {
              d.openAmount = 0;
              d.state = 'IdleClosed';
              d.stateTimer = 0;
              d.idleCooldown = 4.5 + (i % 3) * 1.8;
            }
            break;
          }
        }

        // Apply door kinematic transforms
        if (d.hingePivot) {
          // Hinged shop door: 0° -> 82° (1.431 rad)
          d.hingePivot.rotation.y = -d.openAmount * 1.431;
        }
        if (d.leftSlide && d.rightSlide) {
          const slideDist = d.openAmount * d.doorWidth * 0.46;
          d.leftSlide.position.x = -slideDist;
          d.rightSlide.position.x = slideDist;
          if (d.statusStripMat) {
            d.statusStripMat.color.setHex(d.openAmount > 0.12 ? 0xf59e0b : 0x06b6d4);
          }
        }
        if (d.shojiSlide) {
          // Kyoto machiya sliding hikido/shoji: 0 -> 0.82 * doorWidth into wall pocket
          d.shojiSlide.position.x = d.openAmount * d.doorWidth * 0.82;
        }
      }
    },
  };
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
  const horizonBackdropGroup = new THREE.Group();
  horizonBackdropGroup.name = `horizon_backdrop_${sceneryId}`;
  horizonBackdropGroup.userData.alwaysVisibleBackdrop = true;
  root.add(horizonBackdropGroup);

  const ctxGroup = new THREE.Group();
  ctxGroup.name = `surrounding_360_${sceneryId}`;
  ctxGroup.userData.outdoorOnly = true;
  root.add(ctxGroup);

  const warmWindowMats: THREE.MeshStandardMaterial[] = [];
  const facadeEmissiveMats: THREE.MeshStandardMaterial[] = [];
  const winterGroundMats: Array<{ mat: THREE.MeshStandardMaterial; summerHex: number; winterHex: number }> = [];
  const winterFoliageMats: Array<{ mat: THREE.MeshStandardMaterial; summerHex: number; winterHex: number }> = [];
  const neonAccentMats: THREE.MeshBasicMaterial[] = [];
  const lampBulbMats: THREE.MeshStandardMaterial[] = [];
  const lampGlowPoolMats: THREE.MeshBasicMaterial[] = [];
  const trafficSignalSets: Array<{
    redMat: THREE.MeshBasicMaterial;
    yellowMat: THREE.MeshBasicMaterial;
    greenMat: THREE.MeshBasicMaterial;
    phaseOffset: number;
  }> = [];
  const animatedDoorPlacements: AnimatedDoorwayPlacement[] = [];
  let neighborDoorHandle: AnimatedDoorwayHandle | null = null;

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
    horizonBackdropGroup.add(upperTerrace);

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
    horizonBackdropGroup.add(deepFloor);
  } else {
    // Continuous flat 360° perimeter ground skirt cleanly below asphalt (y = -0.12)
    const groundSkirt = new THREE.Mesh(new THREE.CircleGeometry(195, 48), groundSkirtMat);
    groundSkirt.rotation.x = -Math.PI / 2;
    groundSkirt.position.set(0, -0.12, -18);
    horizonBackdropGroup.add(groundSkirt);
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
  horizonBackdropGroup.add(horizonBand);

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

    // Recessed shop doorway on right side (upgraded to live animated doorway on busy_street/cyberpunk/kyoto!)
    const useAnimatedDoor =
      sceneryId === 'busy_street' ||
      sceneryId === 'cyberpunk_neon' ||
      sceneryId === 'japanese_tranquility';
    if (useAnimatedDoor) {
      animatedDoorPlacements.push({
        x: opts.xCenter + opts.width * 0.31,
        z: opts.zCenter + frontZ - 0.04,
        facingZ: -1,
        width: opts.isCyberpunk ? 1.24 : opts.isJapanese ? 1.12 : 0.96,
        height: 2.04,
        seed: Math.round(Math.abs(opts.xCenter) * 7),
      });
    } else {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.05, 0.12), darkIronMat);
      door.position.set(opts.width * 0.31, 1.02, frontZ - 0.02);
      g.add(door);
    }

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
      // Dark-slate mansard roof flush on wallTopY (bake 45° rotation into geometry BEFORE non-uniform scale so zero skew!)
      const mansardH = 1.65;
      const baseRad = Math.SQRT1_2;
      const topRad = baseRad * 0.72;
      const mansardGeo = new THREE.CylinderGeometry(topRad, baseRad, mansardH, 4);
      mansardGeo.rotateY(Math.PI / 4);
      const mansard = new THREE.Mesh(mansardGeo, corniceMat);
      mansard.scale.set(opts.width + 0.16, 1, opts.depth + 0.16);
      mansard.position.y = opts.height + mansardH * 0.5;
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

    // Segmented Sidewalk Wings & Strict T-Junction Asphalt Termination at |x| = T_JUNCTION_OUTER_EDGE (±37.7)
    const curbFilletMat = new THREE.MeshStandardMaterial({
      color: sceneryId === 'cyberpunk_neon' ? 0x1e293b : 0x6b7280,
      roughness: 0.86,
    });
    const roadTopo = getSceneryRoadTopology(sceneryId);
    const isStrictTJunctionCurbMap =
      sceneryId === 'busy_street' ||
      sceneryId === 'brazilian_favela' ||
      sceneryId === 'cyberpunk_neon' ||
      sceneryId === 'eiffel_tower';

    [-1, 1].forEach((sign) => {
      // Inner connector sidewalk from main sidewalk end (±22.0) strictly up to junction opening (±29.2)
      const innerSw = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.12, 2.2), extSidewalkMat);
      innerSw.position.set(sign * 25.6, ROAD_ELEVATION_LAYERS.sidewalkTopY - 0.06, -8.2);
      ctxGroup.add(innerSw);
      const innerFarSw = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.12, 2.2), extSidewalkMat);
      innerFarSw.position.set(sign * 25.6, ROAD_ELEVATION_LAYERS.sidewalkTopY - 0.06, -16.9);
      ctxGroup.add(innerFarSw);

      if (isStrictTJunctionCurbMap) {
        // Strict T-Junction Termination: ZERO asphalt extends past |x| = T_JUNCTION_OUTER_EDGE (±37.7)!
        // Continuous raised far-side curb (curbTopY = 0.11) + wide far-side pedestrian sidewalk (width = 4.2 >= 2.6)
        // cleanly separating the perpendicular cross-street from the end-of-road building front wall at |x| = 41.9!
        const farCurb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 36.0), curbFilletMat);
        farCurb.position.set(
          sign * (T_JUNCTION_OUTER_EDGE + 0.12),
          ROAD_ELEVATION_LAYERS.curbTopY - 0.09,
          -12.55
        );
        ctxGroup.add(farCurb);

        const farSidewalkSlab = new THREE.Mesh(
          new THREE.BoxGeometry(T_JUNCTION_FAR_SIDEWALK_WIDTH, 0.16, 36.0),
          extSidewalkMat
        );
        farSidewalkSlab.position.set(
          sign * (T_JUNCTION_OUTER_EDGE + T_JUNCTION_FAR_SIDEWALK_WIDTH * 0.5),
          ROAD_ELEVATION_LAYERS.curbTopY - 0.08,
          -12.55
        );
        ctxGroup.add(farSidewalkSlab);
      } else {
        // Japanese Tranquility quiet Kyoto stone lane continuation to Torii steps (-X) & canal bridge (+X)
        const outerSw = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.12, 2.2), extSidewalkMat);
        outerSw.position.set(sign * 43.4, ROAD_ELEVATION_LAYERS.sidewalkTopY - 0.06, -8.2);
        ctxGroup.add(outerSw);
        const outerFarSw = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.12, 2.2), extSidewalkMat);
        outerFarSw.position.set(sign * 43.4, ROAD_ELEVATION_LAYERS.sidewalkTopY - 0.06, -16.9);
        ctxGroup.add(outerFarSw);

        const kyotoLaneWing = new THREE.Mesh(new THREE.PlaneGeometry(15.7, 6.6), extAsphaltMat);
        kyotoLaneWing.rotation.x = -Math.PI / 2;
        kyotoLaneWing.position.set(sign * 29.85, ROAD_ELEVATION_LAYERS.asphaltY - 0.004, -12.55);
        ctxGroup.add(kyotoLaneWing);
      }

      // Clean 90° rounded corner curb fillets framing the inner mouths of x = ±33.8 junction
      const ix = sign * 33.8;
      const filletOffsets: Array<[number, number, number]> = [
        [ix - sign * 4.6, -8.6, sign > 0 ? 0 : Math.PI * 0.5],
        [ix - sign * 4.6, -16.5, sign > 0 ? Math.PI * 1.5 : Math.PI],
      ];
      filletOffsets.forEach(([fx, fz, startAng]) => {
        if (roadTopo === 'l_junction' && fz < -12) return;
        const fillet = new THREE.Mesh(
          new THREE.RingGeometry(0.45, 0.82, 8, 1, startAng, Math.PI * 0.5),
          curbFilletMat
        );
        fillet.rotation.x = -Math.PI / 2;
        fillet.position.set(fx, ROAD_ELEVATION_LAYERS.curbTopY - 0.015, fz);
        ctxGroup.add(fillet);
      });
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
    // Leaves a true 10u-wide perpendicular cross-street open at x = ±34 (skip i === 2)
    // so vehicles and pedestrians execute smooth 90° turns around real corner buildings!
    const blockSpecs: Array<[number, number, number, number, number]> = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        if (i === 2) continue; // Open perpendicular cross-street corridor at x ≈ ±34
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
      // Deep continuation facades lining the perpendicular cross-street behind the corner (z = +9..+22 & -28..-34)
      const crossBH = sceneryId === 'cyberpunk_neon' ? 22 : 7.8;
      blockSpecs.push([side * 27.4, 9.2, 5.8, crossBH, 7.6]);
      blockSpecs.push([side * 40.4, 9.2, 5.8, crossBH + 1.4, 7.6]);
      if (sceneryId === 'busy_street' || sceneryId === 'cyberpunk_neon') {
        blockSpecs.push([side * 27.4, -29.5, 5.8, crossBH + 1.2, 7.2]);
        blockSpecs.push([side * 40.4, -29.5, 5.8, crossBH + 2.4, 7.2]);
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
    // PHASE 2.1: STANDARDIZED T-ROADS & DOWNHILL PARIS MONTMARTRE BRANCH AT x = ±33.8
    // =========================================================================
    const crossStripeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const isDownhillParis = sceneryId === 'eiffel_tower';
    if (sceneryId === 'busy_street' || sceneryId === 'eiffel_tower' || sceneryId === 'cyberpunk_neon' || sceneryId === 'brazilian_favela') {
      [-33.8, 33.8].forEach((ix, idx) => {
        const sign = Math.sign(ix);
        // Near (+Z) cross-street leg behind flanking buildings (z = -15.9 to +14.0)
        const nearCrossLen = isDownhillParis ? 29.9 : 54.0;
        const nearCrossZ = isDownhillParis ? -0.95 : -12.55;
        const crossRoad = new THREE.Mesh(
          new THREE.PlaneGeometry(7.8, nearCrossLen),
          extAsphaltMat
        );
        crossRoad.rotation.x = -Math.PI / 2;
        crossRoad.position.set(ix, ROAD_ELEVATION_LAYERS.asphaltY - 0.001, nearCrossZ);
        ctxGroup.add(crossRoad);

        // Eiffel Tower Special Downhill T-Road Branch sloping smoothly from z = -15.9 down into Paris!
        if (isDownhillParis) {
          const slopeSegs = 14;
          const slopeLen = 28.0; // z = -15.9 down to -43.9
          const slopeGeo = new THREE.PlaneGeometry(7.8, slopeLen, 2, slopeSegs);
          slopeGeo.rotateX(-Math.PI / 2);
          const posAttr = slopeGeo.attributes.position as THREE.BufferAttribute;
          for (let vi = 0; vi < posAttr.count; vi++) {
            const localZ = posAttr.getZ(vi); // -slopeLen/2 .. +slopeLen/2
            const worldZ = EIFFEL_DOWNHILL_START_Z - slopeLen * 0.5 + localZ;
            const pose = getEiffelRoadPose(worldZ, 0, -1);
            posAttr.setY(vi, pose.y + ROAD_ELEVATION_LAYERS.asphaltY);
          }
          slopeGeo.computeVertexNormals();
          const downhillMesh = new THREE.Mesh(slopeGeo, extAsphaltMat);
          downhillMesh.position.set(ix, 0, EIFFEL_DOWNHILL_START_Z - slopeLen * 0.5);
          ctxGroup.add(downhillMesh);

          // Flanking Montmartre limestone parapets descending alongside the sloped branch
          [-4.25, 4.25].forEach((dx) => {
            const wallGeo = new THREE.BoxGeometry(0.65, 1.3, slopeLen, 1, 1, slopeSegs);
            const wPos = wallGeo.attributes.position as THREE.BufferAttribute;
            for (let vi = 0; vi < wPos.count; vi++) {
              const worldZ = EIFFEL_DOWNHILL_START_Z - slopeLen * 0.5 + wPos.getZ(vi);
              const pose = getEiffelRoadPose(worldZ, 0, -1);
              wPos.setY(vi, wPos.getY(vi) + pose.y + 0.48);
            }
            wallGeo.computeVertexNormals();
            const rampWall = new THREE.Mesh(wallGeo, extSidewalkMat);
            rampWall.position.set(ix + dx, 0, EIFFEL_DOWNHILL_START_Z - slopeLen * 0.5);
            ctxGroup.add(rampWall);
          });
        }

        // Corner sidewalk strips flanking the perpendicular cross-street (strictly outside main roadway)
        [-4.65, 4.65].forEach((dx) => {
          const crossSwNear = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 18), extSidewalkMat);
          crossSwNear.position.set(ix + dx, ROAD_ELEVATION_LAYERS.sidewalkTopY - 0.06, 1.8);
          ctxGroup.add(crossSwNear);
          if (!isDownhillParis) {
            const crossSwFar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 18), extSidewalkMat);
            crossSwFar.position.set(ix + dx, ROAD_ELEVATION_LAYERS.sidewalkTopY - 0.06, -27.0);
            ctxGroup.add(crossSwFar);
          }
        });

        // Crisp perpendicular white stop-bars (width 0.28, y = 0.015) & corner zebra crosswalk stripes on BOTH -X & +X T-junctions
        const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 6.2), crossStripeMat);
        stopLine.rotation.x = -Math.PI / 2;
        stopLine.position.set(ix - sign * 5.25, 0.015, -12.55);
        ctxGroup.add(stopLine);

        // Perpendicular cross-street stop bars on both +Z and -Z arms
        const crossStopNear = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 0.28), crossStripeMat);
        crossStopNear.rotation.x = -Math.PI / 2;
        crossStopNear.position.set(ix, 0.015, -7.2);
        ctxGroup.add(crossStopNear);
        if (!isDownhillParis) {
          const crossStopFar = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 0.28), crossStripeMat);
          crossStopFar.rotation.x = -Math.PI / 2;
          crossStopFar.position.set(ix, 0.015, -17.9);
          ctxGroup.add(crossStopFar);
        }

        for (let s = 0; s < 5; s++) {
          const zStripe = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.42), crossStripeMat);
          zStripe.rotation.x = -Math.PI / 2;
          zStripe.position.set(ix - sign * 4.2, ROAD_ELEVATION_LAYERS.crosswalkY, -10.3 - s * 1.12);
          ctxGroup.add(zStripe);

          // Perpendicular crosswalk across +Z side-street mouth
          const pStripe = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.4), crossStripeMat);
          pStripe.rotation.x = -Math.PI / 2;
          pStripe.position.set(ix - 2.4 + s * 1.2, ROAD_ELEVATION_LAYERS.crosswalkY, -8.3);
          ctxGroup.add(pStripe);

          // Corner crosswalk across -Z side-street mouth (except Eiffel downhill ramp)
          if (!isDownhillParis) {
            const fStripe = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.4), crossStripeMat);
            fStripe.rotation.x = -Math.PI / 2;
            fStripe.position.set(ix - 2.4 + s * 1.2, ROAD_ELEVATION_LAYERS.crosswalkY, -16.8);
            ctxGroup.add(fStripe);
          }
        }

        // Working 3-Lens Red/Yellow/Green Cantilever Traffic Signal Posts on Busy Street & Eiffel Avenue
        if (sceneryId === 'busy_street' || sceneryId === 'eiffel_tower') {
          const signalPoleX = ix - sign * 4.5;
          const signalPoleZ = -8.7;
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 5.6, 8), darkIronMat);
          post.position.set(signalPoleX, 2.8, signalPoleZ);
          ctxGroup.add(post);
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 4.4), darkIronMat);
          arm.position.set(signalPoleX, 5.42, signalPoleZ - 2.1);
          ctxGroup.add(arm);

          const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.02, 0.36), darkIronMat);
          headBox.position.set(signalPoleX, 5.1, signalPoleZ - 3.6);
          ctxGroup.add(headBox);

          const redMat = new THREE.MeshBasicMaterial({ color: 0x3f1212 });
          const yellowMat = new THREE.MeshBasicMaterial({ color: 0x423009 });
          const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
          trafficSignalSets.push({ redMat, yellowMat, greenMat, phaseOffset: idx * 7.5 });

          const faceOffset = -sign * 0.18;
          const lensGeo = new THREE.SphereGeometry(0.095, 8, 8);
          const redLens = new THREE.Mesh(lensGeo, redMat);
          redLens.position.set(signalPoleX + faceOffset, 5.38, signalPoleZ - 3.6);
          const yellowLens = new THREE.Mesh(lensGeo, yellowMat);
          yellowLens.position.set(signalPoleX + faceOffset, 5.1, signalPoleZ - 3.6);
          const greenLens = new THREE.Mesh(lensGeo, greenMat);
          greenLens.position.set(signalPoleX + faceOffset, 4.82, signalPoleZ - 3.6);
          ctxGroup.add(redLens, yellowLens, greenLens);
        }
      });
    }

    // =========================================================================
    // PHASE 2.2: BIOME-MATCHED -X & +X ROAD-END VISUAL TERMINATORS (ZERO VOID!)
    // =========================================================================
    if (sceneryId === 'busy_street') {
      // Cross-street corner mid-rise & distant skyline flush behind the far-side T-junction sidewalk (|x| = 41.9)
      [-1, 1].forEach((sign) => {
        const bldgW = 11;
        const centerX = sign * (T_JUNCTION_BUILDING_FRONT_X + bldgW * 0.5);
        const tBldg = new THREE.Mesh(new THREE.BoxGeometry(bldgW, 16, 26), blockMat);
        tBldg.position.set(centerX, 7.8, -12.5);
        ctxGroup.add(tBldg);
        const tRoof = new THREE.Mesh(new THREE.BoxGeometry(bldgW + 0.6, 0.5, 26.6), parapetMat);
        tRoof.position.set(centerX, 16.0, -12.5);
        ctxGroup.add(tRoof);

        const skyTower = new THREE.Mesh(new THREE.BoxGeometry(14, 28, 22), blockMat);
        skyTower.position.set(centerX + sign * 12, 13.8, -10.0);
        ctxGroup.add(skyTower);
      });
    } else if (sceneryId === 'cyberpunk_neon') {
      // Towering elevated maglev skybridges, street-level cyber podiums flush at |x| = 41.9 & arcology towers closing both ends!
      const megaSteelMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.45,
        metalness: 0.65,
      });
      const cyanNeon = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const magentaNeon = new THREE.MeshBasicMaterial({ color: 0xec4899 });
      neonAccentMats.push(cyanNeon, magentaNeon);

      [-1, 1].forEach((sign, sIdx) => {
        const endX = sign * 48;
        // Street-level cyber podium facade seated strictly behind the far-side sidewalk at |x| = 41.9
        const podiumW = 10.0;
        const podiumX = sign * (T_JUNCTION_BUILDING_FRONT_X + podiumW * 0.5);
        const cyberPodium = new THREE.Mesh(new THREE.BoxGeometry(podiumW, 11.2, 28), blockMat);
        cyberPodium.position.set(podiumX, 5.5, -12.5);
        ctxGroup.add(cyberPodium);
        const podiumTrim = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.26, 26),
          sIdx === 0 ? cyanNeon : magentaNeon
        );
        podiumTrim.position.set(sign * (T_JUNCTION_BUILDING_FRONT_X - 0.05), 3.4, -12.5);
        ctxGroup.add(podiumTrim);

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
      // Primary (-X) road end: Grand Vermilion Torii Gate, stone komainu plinths, ascending stone steps,
      // illuminated 5-tier Kyoto pagoda, dense cedar & sakura grove, and warm festival yatai stalls!
      const toriiRedMat = new THREE.MeshStandardMaterial({ color: 0xc8281c, roughness: 0.58 });
      const stoneStepMat = new THREE.MeshStandardMaterial({ color: 0x73787d, roughness: 0.92 });
      const sakuraPinkMat = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.84 });
      const cedarLeafMat = new THREE.MeshStandardMaterial({ color: 0x1e462d, roughness: 0.88 });
      const hillMat = new THREE.MeshStandardMaterial({ color: 0x264834, roughness: 0.92, flatShading: true });
      const pagodaRoofMat = new THREE.MeshStandardMaterial({ color: 0x262b33, roughness: 0.78 });
      const pagodaWallMat = new THREE.MeshStandardMaterial({ color: 0xf1e6d2, roughness: 0.84 });
      const pagodaLanternMat = new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: 0xf97316,
        emissiveIntensity: 1.4,
        roughness: 0.3,
      });
      warmWindowMats.push(pagodaLanternMat);

      // Stone cross-lane plaza at x = -34 and x = +34
      [-34.0, 34.0].forEach((ix) => {
        const crossLane = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 34), extSidewalkMat);
        crossLane.rotation.x = -Math.PI / 2;
        crossLane.position.set(ix, ROAD_ELEVATION_LAYERS.asphaltY + 0.004, -12.5);
        ctxGroup.add(crossLane);
      });

      // Grand Vermilion Torii Gate spanning across the -X Kyoto stone approach
      const toriiX = -39.5;
      [-3.3, 3.3].forEach((dz) => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.39, 8.0, 10), toriiRedMat);
        pillar.position.set(toriiX, 4.0, -12.5 + dz);
        ctxGroup.add(pillar);
        const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 0.85, 10), stoneStepMat);
        plinth.position.set(toriiX, 0.4, -12.5 + dz);
        ctxGroup.add(plinth);
        // Guardian stone komainu plinth + sculpted stone silhouette flanking Torii entrance
        const guardBase = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.85), stoneStepMat);
        guardBase.position.set(toriiX + 2.2, 0.5, -12.5 + dz * 1.15);
        ctxGroup.add(guardBase);
        const guardStatue = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 1), stoneStepMat);
        guardStatue.scale.set(0.95, 1.35, 0.85);
        guardStatue.position.set(toriiX + 2.2, 1.32, -12.5 + dz * 1.15);
        ctxGroup.add(guardStatue);
      });
      const kasagi = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.58, 9.8), toriiRedMat);
      kasagi.position.set(toriiX, 7.95, -12.5);
      ctxGroup.add(kasagi);
      const kasagiCap = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.28, 10.4), pagodaRoofMat);
      kasagiCap.position.set(toriiX, 8.32, -12.5);
      ctxGroup.add(kasagiCap);
      const nuki = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 8.2), toriiRedMat);
      nuki.position.set(toriiX, 6.5, -12.5);
      ctxGroup.add(nuki);
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.65), pagodaRoofMat);
      plaque.position.set(toriiX, 7.22, -12.5);
      ctxGroup.add(plaque);

      // Ascending stone shrine steps + glowing stone lantern posts flanking steps
      for (let st = 0; st < 8; st++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.52, 8.8), stoneStepMat);
        step.position.set(toriiX - 2.6 - st * 1.45, 0.24 + st * 0.44, -12.5);
        ctxGroup.add(step);
        if (st % 3 === 1) {
          [-4.8, 4.8].forEach((lz) => {
            const toroP = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.45, 6), stoneStepMat);
            toroP.position.set(toriiX - 2.6 - st * 1.45, 0.85 + st * 0.44, -12.5 + lz);
            ctxGroup.add(toroP);
            const toroL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.32), pagodaLanternMat);
            toroL.position.set(toriiX - 2.6 - st * 1.45, 1.65 + st * 0.44, -12.5 + lz);
            ctxGroup.add(toroL);
            const toroRoof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.28, 4), stoneStepMat);
            toroRoof.rotation.y = Math.PI / 4;
            toroRoof.position.set(toriiX - 2.6 - st * 1.45, 1.94 + st * 0.44, -12.5 + lz);
            ctxGroup.add(toroRoof);
          });
        }
      }

      // Warm Festival Yatai Food Stalls tucked neatly beside the -X Torii plaza
      const yataiWoodMat = new THREE.MeshStandardMaterial({ color: 0x4b2e1c, roughness: 0.85 });
      const yataiCurtainMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.82 });
      [
        [-35.5, -18.8, 0.1],
        [-35.5, -6.2, -0.1],
      ].forEach(([yx, yz, yrot]) => {
        const yg = new THREE.Group();
        const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 1.25), yataiWoodMat);
        counter.position.y = 0.5;
        yg.add(counter);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 1.65), pagodaRoofMat);
        roof.rotation.x = 0.14;
        roof.position.y = 2.35;
        yg.add(roof);
        const noren = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.42, 0.06), yataiCurtainMat);
        noren.position.set(0, 2.02, 0.62);
        yg.add(noren);
        [-0.85, 0.85].forEach((lx) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.3, 0.09), yataiWoodMat);
          post.position.set(lx, 1.15, 0.55);
          yg.add(post);
          const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), pagodaLanternMat);
          lantern.scale.set(0.85, 1.3, 0.85);
          lantern.position.set(lx, 1.85, 0.72);
          yg.add(lantern);
        });
        yg.position.set(yx, 0.06, yz);
        yg.rotation.y = yrot;
        ctxGroup.add(yg);
      });

      // Illuminated 5-Tier Kyoto Wooden Pagoda rising behind the Torii gate & stone steps
      const pagodaGroup = new THREE.Group();
      for (let t = 0; t < 5; t++) {
        const sz = 5.0 - t * 0.62;
        const ty = 2.6 + t * 2.45;
        const tierCore = new THREE.Mesh(new THREE.BoxGeometry(sz, 1.78, sz), pagodaWallMat);
        tierCore.position.y = ty;
        pagodaGroup.add(tierCore);
        const glowBand = new THREE.Mesh(new THREE.BoxGeometry(sz + 0.06, 0.42, sz + 0.06), pagodaLanternMat);
        glowBand.position.y = ty;
        pagodaGroup.add(glowBand);
        const tierRoof = new THREE.Mesh(new THREE.ConeGeometry(sz * 0.98, 1.05, 4), pagodaRoofMat);
        tierRoof.rotation.y = Math.PI / 4;
        tierRoof.position.y = ty + 1.16;
        pagodaGroup.add(tierRoof);
      }
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 3.6, 7), toriiRedMat);
      spire.position.y = 16.6;
      pagodaGroup.add(spire);
      pagodaGroup.position.set(-55.5, 2.8, -12.5);
      ctxGroup.add(pagodaGroup);

      // RIGHT (+X) ROAD END: Arched Kyoto Wooden Canal Bridge over shimmering stream,
      // weeping willows + sakura, stone toro lanterns, warm teahouses & lantern-lit hillside rooftops!
      const canalWaterMat = new THREE.MeshStandardMaterial({
        color: 0x1e4e68,
        emissive: 0x0c2438,
        emissiveIntensity: 0.35,
        roughness: 0.14,
        metalness: 0.42,
      });
      const canalStream = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 48), canalWaterMat);
      canalStream.rotation.x = -Math.PI / 2;
      canalStream.position.set(41.5, -0.04, -12.5);
      ctxGroup.add(canalStream);

      // Stone canal embankments lining both sides of the shimmering Kyoto stream
      [38.5, 44.5].forEach((bx) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 46), stoneStepMat);
        wall.position.set(bx, 0.05, -12.5);
        ctxGroup.add(wall);
      });

      // Arched vermilion-and-cedar Kyoto canal bridge spanning x = 38.2..44.8
      const bridgeGroup = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.32, 6.4), yataiWoodMat);
      deck.position.set(41.5, 0.62, -12.5);
      bridgeGroup.add(deck);
      // Curved bridge ramp approaches
      [-4.1, 4.1].forEach((dx) => {
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 6.4), yataiWoodMat);
        ramp.position.set(41.5 + dx, 0.34, -12.5);
        ramp.rotation.z = dx < 0 ? 0.24 : -0.24;
        bridgeGroup.add(ramp);
      });
      // Vermilion arched bridge railings with giboshi brass finials
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3, metalness: 0.75 });
      [-3.05, 3.05].forEach((rz) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.14, 0.14), toriiRedMat);
        rail.position.set(41.5, 1.55, -12.5 + rz);
        bridgeGroup.add(rail);
        for (let bp = -3.6; bp <= 3.6; bp += 1.8) {
          const bPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.15, 0.18), toriiRedMat);
          bPost.position.set(41.5 + bp, 1.15, -12.5 + rz);
          bridgeGroup.add(bPost);
          const finial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), brassMat);
          finial.position.set(41.5 + bp, 1.78, -12.5 + rz);
          bridgeGroup.add(finial);
        }
      });
      ctxGroup.add(bridgeGroup);

      // Warm lit Kyoto teahouses & stepped lantern-lit hillside rooftops beyond the canal (+X = 48..66)
      [
        { x: 49.5, y: 0.0, z: -12.5, w: 6.4, h: 6.2, d: 13.5, rot: 0.08 },
        { x: 52.0, y: 0.2, z: -23.5, w: 6.0, h: 5.8, d: 8.5, rot: -0.14 },
        { x: 52.0, y: 0.2, z: -2.0, w: 6.0, h: 5.8, d: 8.5, rot: 0.14 },
        { x: 58.0, y: 3.4, z: -12.5, w: 7.4, h: 6.6, d: 16.0, rot: -0.05 },
        { x: 63.5, y: 7.2, z: -15.5, w: 7.8, h: 7.0, d: 14.0, rot: 0.06 },
      ].forEach((th) => {
        const house = new THREE.Mesh(new THREE.BoxGeometry(th.w, th.h, th.d), blockMat);
        house.position.set(th.x, th.y + th.h / 2 - 0.1, th.z);
        house.rotation.y = th.rot;
        ctxGroup.add(house);
        const hRoof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(th.w, th.d) * 0.72, 2.3, 4), pagodaRoofMat);
        hRoof.rotation.y = Math.PI / 4 + th.rot;
        hRoof.scale.set(th.w / Math.max(th.w, th.d) * 1.1, 1, th.d / Math.max(th.w, th.d) * 1.1);
        hRoof.position.set(th.x, th.y + th.h + 0.95, th.z);
        ctxGroup.add(hRoof);
        // Warm eave lantern glowing down toward the canal
        const eaveL = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 7), pagodaLanternMat);
        eaveL.scale.set(0.85, 1.3, 0.85);
        eaveL.position.set(th.x - th.w * 0.54, th.y + 2.4, th.z);
        ctxGroup.add(eaveL);
      });

      // Lush Higashiyama forested hills closing BOTH -X and +X horizons
      [
        [-72, -12, 34, 24],
        [-64, -36, 30, 20],
        [72, -12, 34, 24],
        [66, -34, 30, 20],
      ].forEach(([hx, hz, hr, hh]) => {
        const hill = new THREE.Mesh(new THREE.ConeGeometry(hr, hh, 8), hillMat);
        hill.position.set(hx, hh * 0.42 - 2, hz);
        ctxGroup.add(hill);
      });

      // Dense blooming sakura, weeping willow & cedar grove flanking both Torii and canal bridge
      const trunkBarkMat = new THREE.MeshStandardMaterial({ color: 0x4b3121, roughness: 0.9 });
      [
        [-37, -7.8, 'sakura'],
        [-37, -17.2, 'sakura'],
        [-45, -6.2, 'cedar'],
        [-45, -18.8, 'sakura'],
        [-51, -21.0, 'cedar'],
        [-51, -4.5, 'cedar'],
        [37.2, -7.8, 'sakura'],
        [37.2, -17.4, 'willow'],
        [45.8, -7.2, 'willow'],
        [45.8, -18.2, 'sakura'],
      ].forEach(([sx, sz, kind]) => {
        const px = sx as number;
        const pz = sz as number;
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 3.6, 6), trunkBarkMat);
        tr.position.set(px, 1.8, pz);
        ctxGroup.add(tr);
        if (kind === 'cedar') {
          const c1 = new THREE.Mesh(new THREE.ConeGeometry(2.1, 4.8, 7), cedarLeafMat);
          c1.position.set(px, 5.2, pz);
          ctxGroup.add(c1);
        } else {
          const canopyMat = kind === 'willow' ? cedarLeafMat : sakuraPinkMat;
          const bl = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3, 1), canopyMat);
          bl.scale.set(1.2, kind === 'willow' ? 1.15 : 0.78, 1.1);
          bl.position.set(px, 4.1, pz);
          ctxGroup.add(bl);
        }
      });
    } else if (sceneryId === 'eiffel_tower') {
      // Grand Parisian Haussmann corner apartments flush behind the far-side sidewalk (|x| = 41.9)
      [-1, 1].forEach((sign) => {
        const blockW = 10;
        const blockH = 11.5;
        const blockD = 24;
        const centerX = sign * (T_JUNCTION_BUILDING_FRONT_X + blockW * 0.5);
        const wallBaseY = -0.15;
        const wallTopY = wallBaseY + blockH; // 11.35
        const cornerBlock = new THREE.Mesh(new THREE.BoxGeometry(blockW, blockH, blockD), blockMat);
        cornerBlock.position.set(centerX, wallBaseY + blockH * 0.5, -12.5);
        ctxGroup.add(cornerBlock);

        // Phase 4 / Structural Flush Mansard Roof: bake 45° rotation BEFORE scaling so bottom footprint matches (blockW, blockD) with zero skew & roofBaseY === wallTopY!
        const mansardH = 2.6;
        const baseRad = Math.SQRT1_2;
        const topRad = baseRad * 0.72;
        const mansardGeo = new THREE.CylinderGeometry(topRad, baseRad, mansardH, 4);
        mansardGeo.rotateY(Math.PI / 4);
        const mansard = new THREE.Mesh(mansardGeo, parapetMat);
        mansard.scale.set(blockW + 0.16, 1, blockD + 0.16);
        mansard.position.set(centerX, wallTopY + mansardH * 0.5, -12.5);
        ctxGroup.add(mansard);
      });
    } else if (sceneryId === 'brazilian_favela') {
      // Phase 5: Procedural Rio street-art graffiti CanvasTexture murals on BOTH -X and +X end-of-road walls!
      const createRioGraffitiTexture = (variant: number): THREE.CanvasTexture | null => {
        if (typeof document === 'undefined') return null;
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const gctx = canvas.getContext('2d');
        if (!gctx) return null;

        // Warm weathered red-terracotta brick base
        gctx.fillStyle = variant === 0 ? '#7c2d12' : '#1e3a5f';
        gctx.fillRect(0, 0, 512, 256);
        gctx.strokeStyle = 'rgba(0,0,0,0.22)';
        gctx.lineWidth = 2;
        for (let r = 0; r < 16; r++) {
          const y = r * 16;
          gctx.beginPath();
          gctx.moveTo(0, y);
          gctx.lineTo(512, y);
          gctx.stroke();
          const off = (r % 2) * 18;
          for (let c = -off; c < 512; c += 36) {
            gctx.beginPath();
            gctx.moveTo(c, y);
            gctx.lineTo(c, y + 16);
            gctx.stroke();
          }
        }

        // Bold geometric Rio street-art color blocks
        const blocks =
          variant === 0
            ? [
                { x: 18, y: 20, w: 150, h: 110, c: '#facc15' },
                { x: 145, y: 45, w: 170, h: 135, c: '#06b6d4' },
                { x: 295, y: 18, w: 195, h: 120, c: '#ec4899' },
                { x: 40, y: 145, w: 220, h: 90, c: '#10b981' },
                { x: 265, y: 150, w: 210, h: 85, c: '#f97316' },
              ]
            : [
                { x: 22, y: 22, w: 165, h: 120, c: '#10b981' },
                { x: 170, y: 14, w: 165, h: 130, c: '#f97316' },
                { x: 320, y: 32, w: 172, h: 115, c: '#facc15' },
                { x: 38, y: 148, w: 205, h: 86, c: '#ec4899' },
                { x: 255, y: 142, w: 220, h: 92, c: '#0ea5e9' },
              ];
        for (const b of blocks) {
          gctx.fillStyle = b.c;
          gctx.fillRect(b.x, b.y, b.w, b.h);
          gctx.strokeStyle = '#111827';
          gctx.lineWidth = 5;
          gctx.strokeRect(b.x, b.y, b.w, b.h);
        }

        // Stylized tropical palm fronds & toucan silhouette motif
        gctx.fillStyle = '#14532d';
        for (let lf = 0; lf < 5; lf++) {
          gctx.beginPath();
          gctx.ellipse(90 + lf * 16, 175 - lf * 14, 34, 10, -0.5 + lf * 0.25, 0, Math.PI * 2);
          gctx.fill();
        }
        // Toucan body & golden beak
        gctx.fillStyle = '#0f172a';
        gctx.beginPath();
        gctx.ellipse(415, 130, 28, 42, 0.2, 0, Math.PI * 2);
        gctx.fill();
        gctx.fillStyle = '#facc15';
        gctx.beginPath();
        gctx.moveTo(432, 104);
        gctx.lineTo(482, 118);
        gctx.lineTo(430, 128);
        gctx.closePath();
        gctx.fill();
        gctx.fillStyle = '#f97316';
        gctx.beginPath();
        gctx.arc(475, 117, 7, 0, Math.PI * 2);
        gctx.fill();

        // Bold stylized graffiti lettering with thick dark outline
        gctx.font = '900 54px sans-serif';
        gctx.textAlign = 'center';
        gctx.textBaseline = 'middle';
        const label = variant === 0 ? 'RIO • ARTE' : 'FAVELA • SOL';
        gctx.lineWidth = 10;
        gctx.strokeStyle = '#09090b';
        gctx.strokeText(label, 250, 122);
        gctx.fillStyle = '#ffffff';
        gctx.fillText(label, 250, 122);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.userData.ownedByScenery = true;
        return tex;
      };

      // Authentic Rio T-road corner botecos seated strictly behind the far-side sidewalk (|x| = 41.9)
      const botecoColors = [0xf59e0b, 0x06b6d4, 0xf43f5e, 0x10b981];
      const botecoWallMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
      [-1, 1].forEach((sign, eIdx) => {
        const shopW = 9.2;
        const centerX = sign * (T_JUNCTION_BUILDING_FRONT_X + shopW * 0.5);
        // Corner Boteco storefront directly across the T-road sidewalk (front wall strictly at |x| = 41.9)
        const shopMat = new THREE.MeshStandardMaterial({
          color: botecoColors[eIdx % botecoColors.length],
          roughness: 0.8,
        });
        const shop = new THREE.Mesh(new THREE.BoxGeometry(shopW, 6.2, 16.0), shopMat);
        shop.position.set(centerX, 3.0, -12.5);
        ctxGroup.add(shop);

        // Vibrant Rio street-art graffiti mural mounted flush on the road-facing wall of BOTH -X and +X ends!
        const muralTex = createRioGraffitiTexture(eIdx);
        const muralMat = new THREE.MeshStandardMaterial({
          map: muralTex ?? undefined,
          color: 0xffffff,
          roughness: 0.78,
        });
        const muralPlane = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 5.2), muralMat);
        muralPlane.position.set(sign * (T_JUNCTION_BUILDING_FRONT_X - 0.05), 3.05, -12.5);
        muralPlane.rotation.y = sign === 1 ? -Math.PI / 2 : Math.PI / 2;
        ctxGroup.add(muralPlane);

        const shop2Mat = new THREE.MeshStandardMaterial({
          color: botecoColors[(eIdx + 2) % botecoColors.length],
          roughness: 0.82,
        });
        const shop2 = new THREE.Mesh(new THREE.BoxGeometry(8.4, 4.4, 12.2), shop2Mat);
        shop2.position.set(centerX + sign * 0.4, 8.2, -13.0);
        ctxGroup.add(shop2);
        // Stone coastal retaining wall & hillside stairway rising cleanly along the cross-street flank
        const retainWall = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.8, 1.2), botecoWallMat);
        retainWall.position.set(centerX - sign * 2.5, 0.85, -20.8);
        ctxGroup.add(retainWall);
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
    // Phase 4 Title Screen Miata Clearance: foreground flanking alpine pines shifted laterally outward
    // from ±6.5 to ±10.4 (>= 3.9u outward, well clear of the parked 1990 Mazda Miata MX-5 windshield!)
    [
      [-14.2, -7.2, 1.05],
      [-10.4, -7.4, 0.94],
      [10.4, -7.4, 0.96],
      [14.2, -7.2, 1.1],
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

    // Phase 2: Standardized L-Junction Road / Trail Bends curving strictly BACKWARD (+Z) away from the vista
    // (Mayon Volcano, Hilltop City Lights, Switzerland Hilltop, Mt. Everest — ZERO road cutting toward overlook!)
    const lRoadMat = new THREE.MeshStandardMaterial({
      color:
        sceneryId === 'mt_everest'
          ? 0xdce8f4
          : sceneryId === 'mayon_volcano'
          ? 0x6f745c
          : sceneryId === 'switzerland_hilltop'
          ? 0x768078
          : 0x4b5553,
      roughness: 0.9,
    });
    if (sceneryId === 'switzerland_hilltop') {
      winterGroundMats.push({ mat: lRoadMat, summerHex: 0x768078, winterHex: 0xe3eef9 });
    }
    const lCurbMat = new THREE.MeshStandardMaterial({
      color: isSnowBiome ? 0xcbd5e1 : 0x64748b,
      roughness: 0.92,
    });

    [-1, 1].forEach((sign) => {
      const bendX = sign * 33.8;
      // Curved quarter-circle L-bend apron turning strictly from main road (-13.2) backward into +Z (-13.2 -> +12.0)
      const bendDisc = new THREE.Mesh(
        new THREE.CircleGeometry(4.6, 12, sign === 1 ? 0 : Math.PI * 0.5, Math.PI * 0.5),
        lRoadMat
      );
      bendDisc.rotation.x = -Math.PI / 2;
      bendDisc.position.set(bendX - sign * 0.8, ROAD_ELEVATION_LAYERS.natureApronTopY + 0.004, -12.4);
      ctxGroup.add(bendDisc);

      // Backward-curving L-junction side lane running strictly behind the flanking cabins (+Z only!)
      const lBackLane = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 26.0), lRoadMat);
      lBackLane.rotation.x = -Math.PI / 2;
      lBackLane.position.set(bendX, ROAD_ELEVATION_LAYERS.natureApronTopY + 0.002, 0.2);
      ctxGroup.add(lBackLane);

      // Protective outer stone/timber guardrail or snow-edged stone wall guiding the L-bend away from the cliff/vista
      const outerBendWall = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.82, 16.0), lCurbMat);
      outerBendWall.position.set(bendX + sign * 4.2, 0.41, -7.8);
      ctxGroup.add(outerBendWall);
    });

    // Natural corner rock outcrops tucked safely outside the L-junction bend
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
      bluff.position.set(endX, 5.2, -5.5);
      ctxGroup.add(bluff);
      if (isSnowBiome) {
        const bluffCap = new THREE.Mesh(new THREE.ConeGeometry(13, 9.5, 7), ridgeSnowMat);
        bluffCap.position.set(endX, 9.0, -5.5);
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

  // =========================================================================
  // PHASE 2.3: THEMATIC BILATERAL STREETLIGHTS (BOTH SIDES OF THE STREET!)
  // =========================================================================
  const lampSpec = getSceneryStreetlightSpec(sceneryId);
  const poleDarkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e242c, roughness: 0.45, metalness: 0.65 });
  const poleGalvanizedMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.42, metalness: 0.62 });
  const poleParisGreenMat = new THREE.MeshStandardMaterial({ color: 0x1b3a30, roughness: 0.48, metalness: 0.55 });
  const poleConcreteMat = new THREE.MeshStandardMaterial({ color: 0x8b8e93, roughness: 0.92, metalness: 0.04 });
  const poleTimberMat = new THREE.MeshStandardMaterial({ color: 0x4e321e, roughness: 0.88 });
  const poleCyberTitaniumMat = new THREE.MeshStandardMaterial({ color: 0x141a29, roughness: 0.32, metalness: 0.78 });
  const solarPanelMat = new THREE.MeshStandardMaterial({ color: 0x172554, roughness: 0.22, metalness: 0.55 });
  const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xf1f7ff, roughness: 0.85 });

  const primaryBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: lampSpec.primaryGlowHex,
    emissiveIntensity: sceneryId === 'cyberpunk_neon' ? 2.2 : 1.15,
    roughness: 0.18,
  });
  const secondaryBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: lampSpec.secondaryGlowHex,
    emissiveIntensity: sceneryId === 'cyberpunk_neon' ? 2.1 : 1.05,
    roughness: 0.18,
  });
  lampBulbMats.push(primaryBulbMat, secondaryBulbMat);

  const glowPoolMat = new THREE.MeshBasicMaterial({
    color: lampSpec.primaryGlowHex,
    transparent: true,
    opacity: sceneryId === 'cyberpunk_neon' ? 0.24 : 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  lampGlowPoolMats.push(glowPoolMat);
  const poolDiskGeo = new THREE.CircleGeometry(1.75, 14);
  poolDiskGeo.rotateX(-Math.PI / 2);

  const buildThemedStreetlight = (isFarCurb: boolean, idx: number): THREE.Group => {
    const g = new THREE.Group();
    // Arm points inward toward the street center (-Z for near curb, +Z for far curb)
    const armZDir = isFarCurb ? 1 : -1;
    const bulbMat = idx % 2 === 0 ? primaryBulbMat : secondaryBulbMat;

    // Elevated cliffside overlook exemption: low railing/bollard lanterns on the far edge
    // so Hilltop City Lights & Switzerland Hilltop mountain/valley vistas stay 100% unobstructed!
    if (isFarCurb && lampSpec.farSideLowOverlookBollards) {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.72, 0.28),
        sceneryId === 'switzerland_hilltop' ? poleConcreteMat : poleTimberMat
      );
      base.position.y = 0.36;
      g.add(base);
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.24, 8), bulbMat);
      lantern.position.y = 0.84;
      g.add(lantern);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.14, 4), poleDarkSteelMat);
      cap.rotation.y = Math.PI / 4;
      cap.position.y = 1.02;
      g.add(cap);
      if (sceneryId === 'switzerland_hilltop') {
        const snow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.09, 4), snowCapMat);
        snow.rotation.y = Math.PI / 4;
        snow.position.y = 1.09;
        g.add(snow);
      }
      return g;
    }

    switch (lampSpec.style) {
      case 'urban_cobra': {
        const baseFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.36, 8), poleDarkSteelMat);
        baseFlange.position.y = 0.18;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.082, 4.15, 8), poleDarkSteelMat);
        pole.position.y = 2.08;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 1.05), poleDarkSteelMat);
        arm.position.set(0, 4.12, armZDir * 0.48);
        arm.rotation.x = armZDir * -0.08;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.48), poleDarkSteelMat);
        head.position.set(0, 4.16, armZDir * 0.96);
        const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.38), bulbMat);
        diffuser.position.set(0, 4.1, armZDir * 0.96);
        g.add(baseFlange, pole, arm, head, diffuser);
        // Subtle vertical street banner bracket on alternating lamps
        if (idx % 2 === 0) {
          const bannerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 });
          const banner = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.95, 0.34), bannerMat);
          banner.position.set(0, 2.95, armZDir * 0.24);
          g.add(banner);
        }
        break;
      }
      case 'ph_solar_highway': {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.09, 4.3, 8), poleGalvanizedMat);
        pole.position.y = 2.15;
        const batteryBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.18), poleDarkSteelMat);
        batteryBox.position.set(0, 3.2, -armZDir * 0.1);
        const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.46), solarPanelMat);
        solarPanel.position.set(0, 4.44, 0);
        solarPanel.rotation.x = 0.28;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.88), poleGalvanizedMat);
        arm.position.set(0, 4.12, armZDir * 0.42);
        const ledBar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.44), bulbMat);
        ledBar.position.set(0, 4.06, armZDir * 0.84);
        g.add(pole, batteryBox, solarPanel, arm, ledBar);
        break;
      }
      case 'highland_bollard': {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.75, 0.15), poleTimberMat);
        post.position.y = 1.38;
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.48), poleDarkSteelMat);
        bracket.position.set(0, 2.62, armZDir * 0.22);
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 8), poleDarkSteelMat);
        shade.position.set(0, 2.58, armZDir * 0.44);
        const edison = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), bulbMat);
        edison.position.set(0, 2.44, armZDir * 0.44);
        g.add(post, bracket, shade, edison);
        break;
      }
      case 'kyoto_andon': {
        // Traditional dark-cedar Kyoto andon wooden lantern with warm glowing washi panels
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.38), poleConcreteMat);
        plinth.position.y = 0.12;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.95, 0.14), poleTimberMat);
        post.position.y = 1.2;
        const boxFrame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.56, 0.34), poleTimberMat);
        boxFrame.position.y = 2.25;
        const washiCore = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.36), bulbMat);
        washiCore.position.y = 2.25;
        const kawaraRoof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.26, 4), poleDarkSteelMat);
        kawaraRoof.rotation.y = Math.PI / 4;
        kawaraRoof.position.y = 2.66;
        g.add(plinth, post, boxFrame, washiCore, kawaraRoof);
        break;
      }
      case 'rio_utility_pole': {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.13, 4.8, 8), poleConcreteMat);
        pole.position.y = 2.4;
        const crossArm = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.09, 0.09), poleTimberMat);
        crossArm.position.set(0, 4.45, 0);
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.92), poleGalvanizedMat);
        neck.position.set(0, 4.02, armZDir * 0.45);
        neck.rotation.x = armZDir * -0.18;
        const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, 0.12, 8), poleGalvanizedMat);
        hood.position.set(0, 3.96, armZDir * 0.88);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 7), bulbMat);
        bulb.position.set(0, 3.86, armZDir * 0.88);
        g.add(pole, crossArm, neck, hood, bulb);
        if (idx % 3 === 0) {
          const transformer = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.58, 8), poleGalvanizedMat);
          transformer.position.set(0, 3.4, -armZDir * 0.24);
          g.add(transformer);
        }
        break;
      }
      case 'cyber_pylon': {
        // Sleek angular dark-titanium Neo-Tokyo Cyber Light Pylon with vertical cyan/magenta LED strips
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.32), poleCyberTitaniumMat);
        plinth.position.y = 0.22;
        const mast = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.35, 0.22), poleCyberTitaniumMat);
        mast.position.y = 2.35;
        const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.4, 0.05), bulbMat);
        ledStrip.position.set(0, 2.35, armZDir * 0.12);
        const topCantilever = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 1.25), poleCyberTitaniumMat);
        topCantilever.position.set(0, 4.42, armZDir * 0.56);
        topCantilever.rotation.x = armZDir * -0.14;
        const lightBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.96), bulbMat);
        lightBlade.position.set(0, 4.34, armZDir * 0.62);
        // Angled holographic district-number plate
        const holoMat = new THREE.MeshBasicMaterial({
          color: idx % 2 === 0 ? 0x22d3ee : 0xec4899,
          transparent: true,
          opacity: 0.82,
          side: THREE.DoubleSide,
        });
        neonAccentMats.push(holoMat);
        const holoTag = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.62), holoMat);
        holoTag.rotation.y = Math.PI / 2;
        holoTag.position.set(0.16, 3.25, armZDir * 0.18);
        g.add(plinth, mast, ledStrip, topCantilever, lightBlade, holoTag);
        break;
      }
      case 'paris_haussmann': {
        // Ornate Parisian Haussmann dark-green cast-iron réverbère with milk-glass globe
        const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.19, 0.95, 10), poleParisGreenMat);
        pedestal.position.y = 0.48;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.085, 3.0, 10), poleParisGreenMat);
        shaft.position.y = 2.4;
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.08, 0.18, 10), poleParisGreenMat);
        collar.position.y = 3.85;
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bulbMat);
        globe.scale.set(0.92, 1.15, 0.92);
        globe.position.y = 4.14;
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.24, 8), poleParisGreenMat);
        crown.position.y = 4.46;
        g.add(pedestal, shaft, collar, globe, crown);
        break;
      }
      case 'swiss_forged_lantern': {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 3.1, 8), poleDarkSteelMat);
        post.position.y = 1.55;
        const crook = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.56), poleDarkSteelMat);
        crook.position.set(0, 3.05, armZDir * 0.26);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 6), poleDarkSteelMat);
        cap.position.set(0, 2.86, armZDir * 0.5);
        const snowCap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.11, 6), snowCapMat);
        snowCap.position.set(0, 2.95, armZDir * 0.5);
        const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.28, 6), bulbMat);
        lantern.position.set(0, 2.64, armZDir * 0.5);
        g.add(post, crook, cap, snowCap, lantern);
        break;
      }
      case 'everest_storm_post': {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 2.65, 7), poleTimberMat);
        post.position.y = 1.32;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.44), poleTimberMat);
        arm.position.set(0, 2.52, armZDir * 0.2);
        const hood = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 6), poleDarkSteelMat);
        hood.position.set(0, 2.38, armZDir * 0.38);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 0.26, 7), bulbMat);
        glass.position.set(0, 2.2, armZDir * 0.38);
        g.add(post, arm, hood, glass);
        // Tiny colorful expedition prayer-flag tie on post
        const flagHexes = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];
        const flagMat = new THREE.MeshStandardMaterial({ color: flagHexes[idx % flagHexes.length], roughness: 0.85 });
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.26), flagMat);
        flag.position.set(0, 1.95, armZDir * 0.16);
        g.add(flag);
        break;
      }
    }
    return g;
  };

  // Bilateral placement coordinates along BOTH sides of the street (skipping x = 0 cafe doorway)
  const lampXs =
    lampSpec.spacingMode === 'balanced_cozy'
      ? [-22.5, -10.8, 10.8, 22.5]
      : [-24.5, -15.5, -6.2, 6.2, 15.5, 24.5];

  const lampCurbZNear = -8.95;
  const lampCurbZFar = -16.15;

  lampXs.forEach((lx, idx) => {
    const nearLamp = buildThemedStreetlight(false, idx);
    nearLamp.position.set(lx, 0.08, lampCurbZNear);
    ctxGroup.add(nearLamp);

    const nearPool = new THREE.Mesh(poolDiskGeo, glowPoolMat);
    nearPool.position.set(lx, ROAD_ELEVATION_LAYERS.sidewalkTopY + 0.008, lampCurbZNear - 0.55);
    ctxGroup.add(nearPool);

    if (lampSpec.bilateral) {
      const farLamp = buildThemedStreetlight(true, idx + 1);
      farLamp.position.set(lx, 0.08, lampCurbZFar);
      ctxGroup.add(farLamp);

      if (!lampSpec.farSideLowOverlookBollards) {
        const farPool = new THREE.Mesh(poolDiskGeo, glowPoolMat);
        farPool.position.set(lx, ROAD_ELEVATION_LAYERS.sidewalkTopY + 0.008, lampCurbZFar + 0.55);
        ctxGroup.add(farPool);
      }
    }
  });

  // Overhead utility wires for Brazilian Favela & fiber-optic neon cables/banners for Cyberpunk Neon
  if (sceneryId === 'brazilian_favela' || sceneryId === 'cyberpunk_neon') {
    const cableMat = new THREE.MeshBasicMaterial({
      color: sceneryId === 'cyberpunk_neon' ? 0x0ea5e9 : 0x18181b,
    });
    for (let i = 0; i < lampXs.length - 1; i++) {
      const x1 = lampXs[i];
      const x2 = lampXs[i + 1];
      const span = Math.abs(x2 - x1);
      const midX = (x1 + x2) * 0.5;
      [lampCurbZNear, lampCurbZFar].forEach((cz) => {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, span, 4), cableMat);
        wire.rotation.z = Math.PI / 2;
        wire.position.set(midX, 4.35, cz);
        ctxGroup.add(wire);
      });
    }
    if (sceneryId === 'cyberpunk_neon') {
      // Overhead fiber-optic street-spanning cables & holographic banners between bilateral pylons
      [-15.5, 15.5].forEach((bx, bIdx) => {
        const crossWire = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 7.2, 4), cableMat);
        crossWire.rotation.x = Math.PI / 2;
        crossWire.position.set(bx, 4.45, -12.55);
        ctxGroup.add(crossWire);

        const bannerMat = new THREE.MeshBasicMaterial({
          color: bIdx === 0 ? 0x22d3ee : 0xec4899,
          transparent: true,
          opacity: 0.78,
          side: THREE.DoubleSide,
        });
        neonAccentMats.push(bannerMat);
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 1.35), bannerMat);
        banner.rotation.y = Math.PI / 2;
        banner.position.set(bx, 3.7, -12.55);
        ctxGroup.add(banner);
      });
    }
  }

  // Mount animated outdoor-only doorways & NPC entry/exit state machine on flanking storefronts
  if (animatedDoorPlacements.length > 0) {
    const doorStyle: DoorwayStyle =
      sceneryId === 'cyberpunk_neon'
        ? 'cyber_split_slide'
        : sceneryId === 'japanese_tranquility'
        ? 'kyoto_machiya_slide'
        : 'hinged_shop';
    neighborDoorHandle = createAnimatedDoorwayCluster(sceneryId, doorStyle, animatedDoorPlacements);
    ctxGroup.add(neighborDoorHandle.group);
  }

  // Collapse repeated static flanking/intersection/streetlight meshes sharing identical materials into merged batches
  batchStaticMeshesByMaterial(ctxGroup);

  return {
    update: (
      isNight: boolean,
      climateState: ClimateState,
      elapsed?: number,
      dt = 0,
      isRaining = false,
      isPlayerOutside = true
    ) => {
      horizonBandMat.color.setHex(isNight ? gSpec.horizonNight : gSpec.horizonDay);
      for (const wm of warmWindowMats) {
        wm.emissiveIntensity = isNight ? 0.72 : 0.2;
      }
      for (const fm of facadeEmissiveMats) {
        fm.emissiveIntensity = sceneryId === 'cyberpunk_neon'
          ? isNight ? 1.15 : 0.68
          : isNight ? 1.05 : 0.18;
      }
      for (const lm of lampBulbMats) {
        lm.emissiveIntensity = sceneryId === 'cyberpunk_neon'
          ? isNight ? 2.8 : 1.7
          : isNight ? 2.2 : 0.45;
      }
      for (const gm of lampGlowPoolMats) {
        gm.opacity = sceneryId === 'cyberpunk_neon'
          ? isNight ? 0.34 : 0.16
          : isNight ? 0.22 : 0.0;
      }
      if (trafficSignalSets.length > 0) {
        const t = typeof elapsed === 'number' ? elapsed : performance.now() * 0.001;
        for (const sig of trafficSignalSets) {
          const cycle = (t + sig.phaseOffset) % 15;
          const isGreen = cycle < 7.5;
          const isYellow = cycle >= 7.5 && cycle < 9.5;
          const isRed = cycle >= 9.5;
          sig.greenMat.color.setHex(isGreen ? 0x22c55e : 0x0b2e19);
          sig.yellowMat.color.setHex(isYellow ? 0xfacc15 : 0x3a2e08);
          sig.redMat.color.setHex(isRed ? 0xef4444 : 0x3b0f0f);
        }
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
      if (neighborDoorHandle) {
        neighborDoorHandle.update(
          dt,
          typeof elapsed === 'number' ? elapsed : 0,
          isNight,
          isRaining,
          isPlayerOutside
        );
      }
    },
  };
}
