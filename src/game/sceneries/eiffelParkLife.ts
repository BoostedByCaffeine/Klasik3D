import * as THREE from 'three';
import {
  type ArticulatedOutdoorNpcRig,
  createArticulatedOutdoorNpc,
  updateArticulatedNpcPose,
} from '../outdoorNpcRig';

/**
 * Strict inner walkable park bounds for the Champ de Mars bottom park (Phase 4).
 * Leaves >= 1.2u clearance inside both left/right flanking Haussmann building curbs
 * (`minX = -10.4 + 1.2 = -9.2`, `maxX = 11.4 - 1.2 = 10.2`) so zero NPCs ever clip walls.
 */
export const EIFFEL_PARK_WALK_BOUNDS = {
  minX: -9.2,
  maxX: 10.2,
  minZ: -57.5,
  maxZ: -24.0,
  parkY: -14.35,
  sideAlleyLeftX: -12.6,
  sideAlleyRightX: 13.6,
  sideAlleyZs: [-32.75, -47.25] as readonly number[],
  fountainCenterX: 0.5,
  fountainCenterZ: -42.5,
  fountainClearRadius: 3.4,
} as const;

export interface EiffelBenchSpot {
  x: number;
  z: number;
  rotY: number;
}

export interface EiffelParkLifeController {
  group: THREE.Group;
  update: (dt: number, elapsed: number, isRain: boolean, isPlayerOutside: boolean) => void;
  /** Exposed for deterministic unit tests inspecting state counts & bounds. */
  getStats: () => {
    walkerCount: number;
    benchSitterCount: number;
    picnicPairCount: number;
    activePicnics: number;
  };
}

function clampParkX(x: number): number {
  return Math.max(EIFFEL_PARK_WALK_BOUNDS.minX, Math.min(EIFFEL_PARK_WALK_BOUNDS.maxX, x));
}

function createParisUmbrella(colorHex: number): THREE.Group {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.88, 6),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 })
  );
  stem.position.y = 0.44;
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(0.54, 0.21, 10),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.62, side: THREE.DoubleSide })
  );
  canopy.position.y = 0.88;
  g.add(stem, canopy);
  g.rotation.x = 0.14;
  g.visible = false;
  return g;
}

interface Waypoint {
  x: number;
  z: number;
}

interface ParkStrollerUnit {
  group: THREE.Group;
  rigs: ArticulatedOutdoorNpcRig[];
  umbrellas: THREE.Group[];
  waypoints: Waypoint[];
  wpIndex: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  phase: number;
}

type BenchPhase = 'walk_to_bench' | 'sitting' | 'walk_exit' | 'cooldown';

interface ParkBenchSitter {
  rig: ArticulatedOutdoorNpcRig;
  umbrella: THREE.Group;
  phase: BenchPhase;
  benchIdx: number;
  sitDuration: number;
  timer: number;
  exitAlleyX: number;
  exitAlleyZ: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  animPhase: number;
}

type PicnicPhase = 'walk_in' | 'picnic_sit' | 'walk_out' | 'cooldown';

interface ParkPicnicPair {
  rigA: ArticulatedOutdoorNpcRig;
  rigB: ArticulatedOutdoorNpcRig;
  umbrellaA: THREE.Group;
  umbrellaB: THREE.Group;
  propsGroup: THREE.Group;
  phase: PicnicPhase;
  timer: number;
  picnicDuration: number;
  spotX: number;
  spotZ: number;
  alleyX: number;
  alleyZ: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  animPhase: number;
}

/**
 * Builds the living Champ de Mars bottom-park activity controller (Phase 4):
 * - Alleyway walkers & strolling couples emerging from side-alley gaps between Haussmann blocks
 * - Periodic bench sitters (15-30s seated posture then stand up & walk away)
 * - 1-2 timed grass picnic pairs (45-75s eating/talking -> stand up, pack blanket/basket, exit alley)
 * - Full-rig articulated Parisian easel painter
 * All meshes live inside `outdoorOnlyGroup` with `skipStaticBatch = true`, `noMerge = true`.
 */
export function createEiffelParkLife(
  parkY: number,
  benches: EiffelBenchSpot[]
): EiffelParkLifeController {
  const group = new THREE.Group();
  group.name = 'eiffel_park_life_outdoor_only';
  group.userData.outdoorOnly = true;
  group.userData.noMerge = true;
  group.userData.skipStaticBatch = true;

  const groundY = parkY + 0.03;

  // 1. Alleyway Walkers & Strolling Couples emerging from side alley gaps around central fountain
  const strollers: ParkStrollerUnit[] = [];
  const strollerRoutes: Array<{
    isCouple: boolean;
    speed: number;
    cA: number;
    cB: number;
    umbHex: number;
    waypoints: Waypoint[];
  }> = [
    // Couple 1: emerges left alley (-32.75) -> strolls central esplanade south around fountain -> exits right alley (-47.25)
    {
      isCouple: true,
      speed: 1.08,
      cA: 0xb91c1c,
      cB: 0x1d4ed8,
      umbHex: 0x9f1239,
      waypoints: [
        { x: EIFFEL_PARK_WALK_BOUNDS.sideAlleyLeftX, z: -32.75 },
        { x: -8.4, z: -32.75 },
        { x: -1.3, z: -28.5 },
        { x: -1.3, z: -38.4 },
        { x: -3.2, z: -42.5 },
        { x: -1.3, z: -47.25 },
        { x: 9.2, z: -47.25 },
        { x: EIFFEL_PARK_WALK_BOUNDS.sideAlleyRightX, z: -47.25 },
      ],
    },
    // Couple 2: emerges right alley (-32.75) -> promenades north/east around fountain -> exits left alley (-47.25)
    {
      isCouple: true,
      speed: 1.02,
      cA: 0x0f766e,
      cB: 0xbe185d,
      umbHex: 0x1d4ed8,
      waypoints: [
        { x: EIFFEL_PARK_WALK_BOUNDS.sideAlleyRightX, z: -32.75 },
        { x: 9.2, z: -32.75 },
        { x: 2.2, z: -28.5 },
        { x: 2.2, z: -38.4 },
        { x: 4.1, z: -42.5 },
        { x: 2.2, z: -47.25 },
        { x: -8.4, z: -47.25 },
        { x: EIFFEL_PARK_WALK_BOUNDS.sideAlleyLeftX, z: -47.25 },
      ],
    },
    // Solo Walker 1: left gravel side promenade loop between alleys
    {
      isCouple: false,
      speed: 1.24,
      cA: 0x334155,
      cB: 0x334155,
      umbHex: 0x0f766e,
      waypoints: [
        { x: EIFFEL_PARK_WALK_BOUNDS.sideAlleyLeftX, z: -47.25 },
        { x: -8.5, z: -47.25 },
        { x: -8.5, z: -28.5 },
        { x: 0.5, z: -28.5 },
        { x: 9.4, z: -28.5 },
        { x: 9.4, z: -32.75 },
        { x: EIFFEL_PARK_WALK_BOUNDS.sideAlleyRightX, z: -32.75 },
      ],
    },
    // Solo Walker 2: far south gravel loop returning through opposite alley
    {
      isCouple: false,
      speed: 1.18,
      cA: 0x7c3aed,
      cB: 0x7c3aed,
      umbHex: 0xd97706,
      waypoints: [
        { x: EIFFEL_PARK_WALK_BOUNDS.sideAlleyRightX, z: -47.25 },
        { x: 9.4, z: -47.25 },
        { x: 9.4, z: -56.0 },
        { x: 0.5, z: -56.0 },
        { x: -8.5, z: -56.0 },
        { x: -8.5, z: -32.75 },
        { x: EIFFEL_PARK_WALK_BOUNDS.sideAlleyLeftX, z: -32.75 },
      ],
    },
    // Solo Walker 3: diagonal cross-promenade strollers
    {
      isCouple: false,
      speed: 1.12,
      cA: 0xb45309,
      cB: 0xb45309,
      umbHex: 0x7c3aed,
      waypoints: [
        { x: EIFFEL_PARK_WALK_BOUNDS.sideAlleyLeftX, z: -32.75 },
        { x: -8.4, z: -32.75 },
        { x: -8.4, z: -56.0 },
        { x: 9.4, z: -56.0 },
        { x: 9.4, z: -47.25 },
        { x: EIFFEL_PARK_WALK_BOUNDS.sideAlleyRightX, z: -47.25 },
      ],
    },
  ];

  strollerRoutes.forEach((sr, idx) => {
    const unitGroup = new THREE.Group();
    unitGroup.userData.outdoorOnly = true;
    unitGroup.userData.noMerge = true;
    unitGroup.userData.skipStaticBatch = true;

    const rigs: ArticulatedOutdoorNpcRig[] = [];
    const umbrellas: THREE.Group[] = [];

    const rigA = createArticulatedOutdoorNpc({
      shirtHex: sr.cA,
      pantsHex: 0x1e293b,
      skinHex: idx % 2 === 0 ? 0xe8bc9e : 0xdcb08e,
      hairHex: idx % 3 === 0 ? 0x2b1d14 : 0x452b18,
      hairStyle: sr.isCouple ? 'bob' : 'short',
      seed: 1410 + idx * 17,
    });
    const umbA = createParisUmbrella(sr.umbHex);
    rigA.slots.leftHandProp.add(umbA);
    rigs.push(rigA);
    umbrellas.push(umbA);

    if (sr.isCouple) {
      rigA.root.position.x = -0.34;
      const rigB = createArticulatedOutdoorNpc({
        shirtHex: sr.cB,
        pantsHex: 0x1f2937,
        skinHex: 0xf0cbb1,
        hairHex: 0x1c1917,
        hairStyle: 'short',
        seed: 1455 + idx * 23,
      });
      rigB.root.position.x = 0.34;
      unitGroup.add(rigA.root, rigB.root);
      rigs.push(rigB);
    } else {
      unitGroup.add(rigA.root);
    }

    const startIdx = idx % Math.max(1, sr.waypoints.length - 1);
    const startWp = sr.waypoints[startIdx];
    unitGroup.position.set(startWp.x, groundY, startWp.z);
    group.add(unitGroup);

    strollers.push({
      group: unitGroup,
      rigs,
      umbrellas,
      waypoints: sr.waypoints,
      wpIndex: (startIdx + 1) % sr.waypoints.length,
      x: startWp.x,
      z: startWp.z,
      yaw: 0,
      speed: sr.speed,
      phase: idx * 1.9,
    });
  });

  // 2. Periodic Bench Sitters (walk to unoccupied bench -> sit 15-30s -> stand up & walk away)
  const benchOccupied = new Array<boolean>(benches.length).fill(false);
  const benchSitters: ParkBenchSitter[] = [];
  const sitterConfigs = [
    { shirt: 0x9f1239, pants: 0x1e293b, umb: 0xb91c1c, initialBench: 0, startSeated: true },
    { shirt: 0x047857, pants: 0x1f2937, umb: 0x0f766e, initialBench: 3, startSeated: true },
    { shirt: 0x1e40af, pants: 0x0f172a, umb: 0x334155, initialBench: 4, startSeated: false },
  ];

  sitterConfigs.forEach((sc, idx) => {
    if (benches.length === 0) return;
    const benchIdx = sc.initialBench % benches.length;
    const b = benches[benchIdx];
    const rig = createArticulatedOutdoorNpc({
      shirtHex: sc.shirt,
      pantsHex: sc.pants,
      skinHex: idx === 1 ? 0xdcb08e : 0xe8bc9e,
      hairHex: idx === 0 ? 0x3b2416 : 0x1c1917,
      hairStyle: idx === 0 ? 'bun' : 'short',
      seed: 1510 + idx * 31,
    });
    const umb = createParisUmbrella(sc.umb);
    rig.slots.leftHandProp.add(umb);
    group.add(rig.root);

    const isLeftSide = b.x < 0.5;
    const alleyX = isLeftSide
      ? EIFFEL_PARK_WALK_BOUNDS.sideAlleyLeftX
      : EIFFEL_PARK_WALK_BOUNDS.sideAlleyRightX;
    const alleyZ = b.z > -40 ? -32.75 : -47.25;

    let startX: number = alleyX;
    let startZ: number = alleyZ;
    let startYaw: number = b.rotY;
    let initPhase: BenchPhase = 'walk_to_bench';
    let initTimer = 18 + idx * 4;

    if (sc.startSeated && !benchOccupied[benchIdx]) {
      benchOccupied[benchIdx] = true;
      startX = b.x;
      startZ = b.z;
      startYaw = b.rotY;
      initPhase = 'sitting';
      initTimer = 16 + idx * 5; // 15-30s seated duration
    }

    rig.root.position.set(startX, groundY, startZ);
    rig.root.rotation.y = startYaw;

    benchSitters.push({
      rig,
      umbrella: umb,
      phase: initPhase,
      benchIdx,
      sitDuration: 16 + idx * 6,
      timer: initTimer,
      exitAlleyX: alleyX,
      exitAlleyZ: alleyZ,
      x: startX,
      z: startZ,
      yaw: startYaw,
      speed: 1.05 + idx * 0.08,
      animPhase: idx * 2.1 + 0.5,
    });
  });

  // 3. Timed Grass Picnic Pairs (walk in -> unroll blanket/basket -> picnic 45-75s -> pack up & exit alley -> respawn)
  const picnicRedMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.88 });
  const picnicCreamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.88 });
  const basketMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.86 });
  const baguetteMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.82 });

  const picnicPairs: ParkPicnicPair[] = [];
  const picnicSpecs = [
    {
      spotX: -5.6,
      spotZ: -25.4,
      alleyX: EIFFEL_PARK_WALK_BOUNDS.sideAlleyLeftX,
      alleyZ: -32.75,
      cA: 0xdb2777,
      cB: 0x1e293b,
      duration: 54,
      startActive: true,
    },
    {
      spotX: 6.4,
      spotZ: -42.5,
      alleyX: EIFFEL_PARK_WALK_BOUNDS.sideAlleyRightX,
      alleyZ: -47.25,
      cA: 0x2563eb,
      cB: 0xd97706,
      duration: 66,
      startActive: true,
    },
  ];

  picnicSpecs.forEach((ps, idx) => {
    const propsGroup = new THREE.Group();
    propsGroup.position.set(ps.spotX, parkY, ps.spotZ);
    propsGroup.userData.outdoorOnly = true;
    propsGroup.userData.noMerge = true;
    propsGroup.userData.skipStaticBatch = true;

    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(2.15, 2.15),
      idx % 2 === 0 ? picnicRedMat : picnicCreamMat
    );
    cloth.rotation.x = -Math.PI / 2;
    cloth.position.y = 0.04;
    const inner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.3),
      idx % 2 === 0 ? picnicCreamMat : picnicRedMat
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.05;
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.34), basketMat);
    basket.position.set(0.0, 0.16, -0.34);
    const baguette = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.36, 4, 7), baguetteMat);
    baguette.rotation.z = Math.PI / 2;
    baguette.position.set(-0.08, 0.09, 0.06);
    propsGroup.add(cloth, inner, basket, baguette);
    propsGroup.visible = ps.startActive;
    group.add(propsGroup);

    const rigA = createArticulatedOutdoorNpc({
      shirtHex: ps.cA,
      pantsHex: 0x1e293b,
      skinHex: 0xe8bc9e,
      hairHex: 0x3b2416,
      hairStyle: 'bun',
      seed: 1620 + idx * 19,
    });
    const rigB = createArticulatedOutdoorNpc({
      shirtHex: ps.cB,
      pantsHex: 0x334155,
      skinHex: 0xdcb08e,
      hairHex: 0x1c1917,
      hairStyle: 'short',
      seed: 1660 + idx * 23,
    });
    const umbA = createParisUmbrella(0xb91c1c);
    const umbB = createParisUmbrella(0x1d4ed8);
    rigA.slots.leftHandProp.add(umbA);
    rigB.slots.leftHandProp.add(umbB);

    if (ps.startActive) {
      rigA.root.position.set(ps.spotX - 0.54, parkY + 0.02, ps.spotZ + 0.18);
      rigA.root.rotation.y = 1.05;
      rigB.root.position.set(ps.spotX + 0.54, parkY + 0.02, ps.spotZ + 0.18);
      rigB.root.rotation.y = -1.05;
    } else {
      rigA.root.position.set(ps.alleyX, groundY, ps.alleyZ);
      rigB.root.position.set(ps.alleyX, groundY, ps.alleyZ);
      rigA.root.visible = false;
      rigB.root.visible = false;
    }
    group.add(rigA.root, rigB.root);

    picnicPairs.push({
      rigA,
      rigB,
      umbrellaA: umbA,
      umbrellaB: umbB,
      propsGroup,
      phase: ps.startActive ? 'picnic_sit' : 'cooldown',
      timer: ps.startActive ? ps.duration - idx * 14 : 10,
      picnicDuration: ps.duration,
      spotX: ps.spotX,
      spotZ: ps.spotZ,
      alleyX: ps.alleyX,
      alleyZ: ps.alleyZ,
      x: ps.startActive ? ps.spotX : ps.alleyX,
      z: ps.startActive ? ps.spotZ : ps.alleyZ,
      yaw: 0,
      speed: 1.05,
      animPhase: idx * 2.5,
    });
  });

  // 4. Full-Rig Parisian Artist painting at a wooden easel facing the Eiffel Tower
  const artistGroup = new THREE.Group();
  artistGroup.position.set(-3.4, groundY, -27.2);
  artistGroup.rotation.y = Math.PI - 0.2;
  artistGroup.userData.outdoorOnly = true;
  artistGroup.userData.noMerge = true;
  artistGroup.userData.skipStaticBatch = true;
  const artistRig = createArticulatedOutdoorNpc({
    shirtHex: 0x1f2937,
    pantsHex: 0x0f172a,
    skinHex: 0xe8bc9e,
    hairHex: 0x2b1d14,
    seed: 1710,
  });
  const beret = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.14, 0.055, 10),
    new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 })
  );
  beret.position.set(-0.02, 0.02, -0.01);
  beret.rotation.z = 0.18;
  artistRig.slots.headwear.add(beret);
  const brush = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.28, 5),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
  );
  brush.rotation.x = Math.PI / 2;
  brush.position.set(0, 0, 0.12);
  artistRig.slots.rightHandProp.add(brush);
  const artistUmb = createParisUmbrella(0x334155);
  artistRig.slots.leftHandProp.add(artistUmb);
  artistGroup.add(artistRig.root);

  const easelWoodMat = new THREE.MeshStandardMaterial({ color: 0x6f4728, roughness: 0.82 });
  const easelStand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.55, 0.08), easelWoodMat);
  easelStand.position.set(0.05, 0.78, 0.72);
  easelStand.rotation.x = -0.18;
  const canvasBoard = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.54, 0.05), picnicCreamMat);
  canvasBoard.position.set(0.05, 1.25, 0.66);
  canvasBoard.rotation.x = -0.18;
  artistGroup.add(easelStand, canvasBoard);
  group.add(artistGroup);

  return {
    group,
    getStats: () => ({
      walkerCount: strollers.length,
      benchSitterCount: benchSitters.length,
      picnicPairCount: picnicPairs.length,
      activePicnics: picnicPairs.filter((p) => p.phase === 'picnic_sit').length,
    }),
    update: (dt, elapsed, isRain, isPlayerOutside) => {
      if (!isPlayerOutside) return;
      const safeDt = Math.min(0.1, Math.max(0, dt));

      // 1. Update alleyway walkers & strolling couples
      for (let i = 0; i < strollers.length; i++) {
        const st = strollers[i];
        const target = st.waypoints[st.wpIndex];
        const dx = target.x - st.x;
        const dz = target.z - st.z;
        const dist = Math.hypot(dx, dz);
        const step = st.speed * safeDt;
        if (dist <= step + 0.08) {
          st.x = target.x;
          st.z = target.z;
          st.wpIndex = (st.wpIndex + 1) % st.waypoints.length;
          // If wrapping from exit alley back to start alley, teleport smoothly inside hidden side alley
          if (st.wpIndex === 0) {
            st.x = st.waypoints[0].x;
            st.z = st.waypoints[0].z;
            st.wpIndex = 1;
          }
        } else {
          st.x += (dx / dist) * step;
          st.z += (dz / dist) * step;
          st.yaw = Math.atan2(dx, dz);
        }
        // Only clamp interior park waypoints; side-alley entry/exit points sit inside alley gaps
        const inAlleyGap =
          Math.abs(st.z - EIFFEL_PARK_WALK_BOUNDS.sideAlleyZs[0]) < 1.1 ||
          Math.abs(st.z - EIFFEL_PARK_WALK_BOUNDS.sideAlleyZs[1]) < 1.1;
        const finalX = inAlleyGap ? st.x : clampParkX(st.x);
        st.group.position.set(finalX, groundY, st.z);
        st.group.rotation.y = st.yaw;

        for (let u = 0; u < st.umbrellas.length; u++) {
          st.umbrellas[u].visible = isRain;
        }
        for (let r = 0; r < st.rigs.length; r++) {
          updateArticulatedNpcPose(st.rigs[r], safeDt, {
            mode: 'walk',
            elapsed,
            phase: st.phase + r * 0.45,
            speed: st.speed * 0.72,
            holdingLeftProp: isRain && r === 0,
          });
        }
      }

      // 2. Update periodic bench sitters
      for (let i = 0; i < benchSitters.length; i++) {
        const bs = benchSitters[i];
        bs.umbrella.visible = isRain;
        if (bs.phase === 'cooldown') {
          bs.timer -= safeDt;
          bs.rig.root.visible = false;
          if (bs.timer <= 0 && benches.length > 0) {
            // Pick first unoccupied bench
            let chosen = -1;
            for (let k = 0; k < benches.length; k++) {
              const cand = (bs.benchIdx + 1 + k) % benches.length;
              if (!benchOccupied[cand]) {
                chosen = cand;
                break;
              }
            }
            if (chosen >= 0) {
              benchOccupied[chosen] = true;
              bs.benchIdx = chosen;
              const b = benches[chosen];
              bs.exitAlleyX =
                b.x < 0.5
                  ? EIFFEL_PARK_WALK_BOUNDS.sideAlleyLeftX
                  : EIFFEL_PARK_WALK_BOUNDS.sideAlleyRightX;
              bs.exitAlleyZ = b.z > -40 ? -32.75 : -47.25;
              bs.x = bs.exitAlleyX;
              bs.z = bs.exitAlleyZ;
              bs.sitDuration = 16 + ((i * 5 + Math.floor(elapsed)) % 13); // 16-28s
              bs.phase = 'walk_to_bench';
              bs.rig.root.visible = true;
            } else {
              bs.timer = 4.0;
            }
          }
          continue;
        }

        const bench = benches[bs.benchIdx];
        if (bs.phase === 'walk_to_bench') {
          const approachX = bench.x + Math.sin(bench.rotY) * 0.42;
          const approachZ = bench.z + Math.cos(bench.rotY) * 0.42;
          const dx = approachX - bs.x;
          const dz = approachZ - bs.z;
          const dist = Math.hypot(dx, dz);
          const step = bs.speed * safeDt;
          if (dist <= step + 0.1) {
            bs.x = bench.x;
            bs.z = bench.z;
            bs.yaw = bench.rotY;
            bs.timer = bs.sitDuration;
            bs.phase = 'sitting';
          } else {
            bs.x += (dx / dist) * step;
            bs.z += (dz / dist) * step;
            bs.yaw = Math.atan2(dx, dz);
          }
          bs.rig.root.position.set(bs.x, groundY, bs.z);
          bs.rig.root.rotation.y = bs.yaw;
          updateArticulatedNpcPose(bs.rig, safeDt, {
            mode: 'walk',
            elapsed,
            phase: bs.animPhase,
            speed: bs.speed * 0.72,
            holdingLeftProp: isRain,
          });
        } else if (bs.phase === 'sitting') {
          bs.timer -= safeDt;
          bs.rig.root.position.set(bench.x, groundY + 0.01, bench.z);
          bs.rig.root.rotation.y = bench.rotY;
          updateArticulatedNpcPose(bs.rig, safeDt, {
            mode: 'bench_sit',
            elapsed,
            phase: bs.animPhase,
            holdingLeftProp: isRain,
          });
          if (bs.timer <= 0) {
            benchOccupied[bs.benchIdx] = false;
            bs.x = bench.x + Math.sin(bench.rotY) * 0.55;
            bs.z = bench.z + Math.cos(bench.rotY) * 0.55;
            bs.phase = 'walk_exit';
          }
        } else if (bs.phase === 'walk_exit') {
          const dx = bs.exitAlleyX - bs.x;
          const dz = bs.exitAlleyZ - bs.z;
          const dist = Math.hypot(dx, dz);
          const step = bs.speed * safeDt;
          if (dist <= step + 0.15) {
            bs.phase = 'cooldown';
            bs.timer = 6 + i * 3;
            bs.rig.root.visible = false;
          } else {
            bs.x += (dx / dist) * step;
            bs.z += (dz / dist) * step;
            bs.yaw = Math.atan2(dx, dz);
            bs.rig.root.position.set(bs.x, groundY, bs.z);
            bs.rig.root.rotation.y = bs.yaw;
            updateArticulatedNpcPose(bs.rig, safeDt, {
              mode: 'walk',
              elapsed,
              phase: bs.animPhase,
              speed: bs.speed * 0.72,
              holdingLeftProp: isRain,
            });
          }
        }
      }

      // 3. Update timed grass picnic pairs (45-75s duration -> stand up, pack blanket/basket, walk out alley)
      for (let i = 0; i < picnicPairs.length; i++) {
        const pp = picnicPairs[i];
        pp.umbrellaA.visible = isRain && pp.phase !== 'picnic_sit';
        pp.umbrellaB.visible = isRain && pp.phase !== 'picnic_sit';

        if (pp.phase === 'cooldown') {
          pp.propsGroup.visible = false;
          pp.rigA.root.visible = false;
          pp.rigB.root.visible = false;
          if (isRain) continue; // Don't start new grass picnic in the rain
          pp.timer -= safeDt;
          if (pp.timer <= 0) {
            pp.x = pp.alleyX;
            pp.z = pp.alleyZ;
            pp.picnicDuration = 48 + ((i * 13 + Math.floor(elapsed)) % 26); // 48-73s
            pp.rigA.root.visible = true;
            pp.rigB.root.visible = true;
            pp.phase = 'walk_in';
          }
          continue;
        }

        if (pp.phase === 'walk_in') {
          pp.propsGroup.visible = false;
          const dx = pp.spotX - pp.x;
          const dz = pp.spotZ - pp.z;
          const dist = Math.hypot(dx, dz);
          const step = pp.speed * safeDt;
          if (dist <= step + 0.12) {
            pp.x = pp.spotX;
            pp.z = pp.spotZ;
            pp.propsGroup.visible = true;
            pp.timer = pp.picnicDuration;
            pp.phase = 'picnic_sit';
          } else {
            pp.x += (dx / dist) * step;
            pp.z += (dz / dist) * step;
            pp.yaw = Math.atan2(dx, dz);
            const perpX = Math.cos(pp.yaw) * 0.36;
            const perpZ = -Math.sin(pp.yaw) * 0.36;
            pp.rigA.root.position.set(pp.x - perpX, groundY, pp.z - perpZ);
            pp.rigB.root.position.set(pp.x + perpX, groundY, pp.z + perpZ);
            pp.rigA.root.rotation.y = pp.yaw;
            pp.rigB.root.rotation.y = pp.yaw;
            updateArticulatedNpcPose(pp.rigA, safeDt, {
              mode: 'walk',
              elapsed,
              phase: pp.animPhase,
              speed: pp.speed * 0.7,
              holdingLeftProp: isRain,
            });
            updateArticulatedNpcPose(pp.rigB, safeDt, {
              mode: 'walk',
              elapsed,
              phase: pp.animPhase + 0.5,
              speed: pp.speed * 0.7,
              holdingLeftProp: isRain,
            });
          }
        } else if (pp.phase === 'picnic_sit') {
          pp.timer -= safeDt;
          pp.propsGroup.visible = !isRain;
          pp.rigA.root.position.set(pp.spotX - 0.54, parkY + 0.02, pp.spotZ + 0.18);
          pp.rigA.root.rotation.y = 1.05;
          pp.rigB.root.position.set(pp.spotX + 0.54, parkY + 0.02, pp.spotZ + 0.18);
          pp.rigB.root.rotation.y = -1.05;
          updateArticulatedNpcPose(pp.rigA, safeDt, {
            mode: 'picnic_sit',
            elapsed,
            phase: pp.animPhase,
          });
          updateArticulatedNpcPose(pp.rigB, safeDt, {
            mode: 'picnic_sit',
            elapsed,
            phase: pp.animPhase + 1.4,
          });
          // Pack up and leave cleanly when picnic timer expires OR if rain starts!
          if (pp.timer <= 0 || isRain) {
            pp.propsGroup.visible = false;
            pp.x = pp.spotX;
            pp.z = pp.spotZ;
            pp.phase = 'walk_out';
          }
        } else if (pp.phase === 'walk_out') {
          pp.propsGroup.visible = false;
          const dx = pp.alleyX - pp.x;
          const dz = pp.alleyZ - pp.z;
          const dist = Math.hypot(dx, dz);
          const step = pp.speed * safeDt;
          if (dist <= step + 0.15) {
            pp.phase = 'cooldown';
            pp.timer = 14 + i * 6;
            pp.rigA.root.visible = false;
            pp.rigB.root.visible = false;
          } else {
            pp.x += (dx / dist) * step;
            pp.z += (dz / dist) * step;
            pp.yaw = Math.atan2(dx, dz);
            const perpX = Math.cos(pp.yaw) * 0.36;
            const perpZ = -Math.sin(pp.yaw) * 0.36;
            pp.rigA.root.position.set(pp.x - perpX, groundY, pp.z - perpZ);
            pp.rigB.root.position.set(pp.x + perpX, groundY, pp.z + perpZ);
            pp.rigA.root.rotation.y = pp.yaw;
            pp.rigB.root.rotation.y = pp.yaw;
            updateArticulatedNpcPose(pp.rigA, safeDt, {
              mode: 'walk',
              elapsed,
              phase: pp.animPhase,
              speed: pp.speed * 0.72,
              holdingLeftProp: isRain,
            });
            updateArticulatedNpcPose(pp.rigB, safeDt, {
              mode: 'walk',
              elapsed,
              phase: pp.animPhase + 0.5,
              speed: pp.speed * 0.72,
              holdingLeftProp: isRain,
            });
          }
        }
      }

      // 4. Update full-rig Parisian easel painter
      artistUmb.visible = isRain;
      updateArticulatedNpcPose(artistRig, safeDt, {
        mode: 'idle_browse',
        elapsed,
        phase: 0.4,
        holdingLeftProp: isRain,
        lookUpPitch: -0.12 + Math.sin(elapsed * 0.8) * 0.08,
      });
      artistRig.rightShoulderPivot.rotation.x = -0.95 + Math.sin(elapsed * 3.4) * 0.14;
      artistRig.rightShoulderPivot.rotation.z = 0.12 + Math.cos(elapsed * 2.6) * 0.12;
      artistRig.rightElbowPivot.rotation.x = -0.45;
    },
  };
}
