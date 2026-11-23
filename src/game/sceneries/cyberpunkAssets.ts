import * as THREE from 'three';

export interface CyberHoverCarOptions {
  bodyColor?: number;
  accentColor?: number;
  tailLightColor?: number;
  thrusterColor?: number;
  isPolice?: boolean;
}

export interface CyberHoverCarHandle {
  group: THREE.Group;
  redBar?: THREE.MeshBasicMaterial;
  blueBar?: THREE.MeshBasicMaterial;
}

/**
 * Builds a watertight, batch-immune aerial Cyberpunk hover-car ("spinner") facing +X.
 * Strictly tagged `skipStaticBatch = true` and `noMerge = true` so `batchStaticMeshesByMaterial()`
 * NEVER rips apart its fuselage, canopy, pontoons, or thrusters.
 * Features zero downward light cones and zero oversized floating light-trail blocks.
 */
export function createCyberHoverCar(options: CyberHoverCarOptions = {}): CyberHoverCarHandle {
  const {
    bodyColor = 0x161a24,
    accentColor = 0x22d3ee,
    tailLightColor = 0xff2255,
    thrusterColor = 0x00f0ff,
    isPolice = false,
  } = options;

  const group = new THREE.Group();
  group.name = isPolice ? 'cyber_police_hovercar' : 'cyber_hovercar';
  group.userData.skipStaticBatch = true;
  group.userData.noMerge = true;

  const hullMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.32,
    metalness: 0.65,
    side: THREE.FrontSide,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x0e1118,
    roughness: 0.45,
    metalness: 0.52,
    side: THREE.FrontSide,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x0b1320,
    roughness: 0.14,
    metalness: 0.8,
    side: THREE.FrontSide,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe6f7ff,
    emissiveIntensity: 1.65,
    roughness: 0.2,
    side: THREE.FrontSide,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: tailLightColor,
    emissive: tailLightColor,
    emissiveIntensity: 1.85,
    roughness: 0.2,
    side: THREE.FrontSide,
  });
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: thrusterColor,
    emissive: thrusterColor,
    emissiveIntensity: 1.5,
    roughness: 0.25,
    side: THREE.FrontSide,
  });
  const pinStripeMat = new THREE.MeshBasicMaterial({ color: accentColor });

  // 1. Main watertight wedge fuselage (centered along X, facing +X)
  const mainChassis = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.38, 1.12), hullMat);
  mainChassis.position.set(0, 0.02, 0);
  group.add(mainChassis);

  // Sloped front nose hood & aerodynamic chin splitter
  const frontHood = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.24, 0.98), hullMat);
  frontHood.position.set(1.52, -0.04, 0);
  frontHood.rotation.z = -0.14;
  group.add(frontHood);

  const chinSplitter = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 1.06), trimMat);
  chinSplitter.position.set(1.88, -0.14, 0);
  group.add(chinSplitter);

  // Rear diffuser skirt & engine deck
  const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.28, 1.02), hullMat);
  rearDeck.position.set(-1.38, 0.04, 0);
  group.add(rearDeck);

  const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.96), trimMat);
  rearDiffuser.position.set(-1.72, -0.1, 0);
  group.add(rearDiffuser);

  // 2. Flush dark-tinted cockpit canopy with sleek windshield rake
  const canopyCore = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.28, 0.84), canopyMat);
  canopyCore.position.set(0.14, 0.3, 0);
  group.add(canopyCore);

  const windshieldSlope = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.2, 0.82), canopyMat);
  windshieldSlope.position.set(0.86, 0.22, 0);
  windshieldSlope.rotation.z = -0.42;
  group.add(windshieldSlope);

  const fastbackSlope = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.2, 0.8), canopyMat);
  fastbackSlope.position.set(-0.68, 0.24, 0);
  fastbackSlope.rotation.z = 0.28;
  group.add(fastbackSlope);

  // 3. Twin side pontoon / intake pods with subtle pinstripe trim
  [-0.68, 0.68].forEach((sz) => {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.28, 0.26), hullMat);
    pod.position.set(-0.08, -0.05, sz);
    group.add(pod);

    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.2), trimMat);
    intake.position.set(0.88, -0.05, sz);
    group.add(intake);

    const sideAccent = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.035, 0.03), pinStripeMat);
    sideAccent.position.set(-0.08, -0.03, sz + Math.sign(sz) * 0.135);
    group.add(sideAccent);
  });

  // 4. Elevated twin-pylon rear spoiler fin
  [-0.44, 0.44].forEach((sz) => {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.06), trimMat);
    pylon.position.set(-1.54, 0.28, sz);
    pylon.rotation.z = 0.22;
    group.add(pylon);
  });
  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.055, 1.32), hullMat);
  spoilerWing.position.set(-1.62, 0.41, 0);
  spoilerWing.rotation.z = 0.12;
  group.add(spoilerWing);

  // 5. Crisp white dual headlights & full-width rear taillight bar
  [-0.36, 0.36].forEach((sz) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.085, 0.22), headlightMat);
    lamp.position.set(1.98, -0.04, sz);
    group.add(lamp);
  });
  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 1.12), taillightMat);
  tailBar.position.set(-1.79, 0.06, 0);
  group.add(tailBar);

  // 6. 4 compact recessed under-thruster rings (radius 0.22 <= 0.35, y = -0.18, zero downward cones)
  const thrusterRingGeo = new THREE.TorusGeometry(0.2, 0.035, 6, 14);
  const thrusterHousingGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.06, 12);
  [
    [0.82, -0.58],
    [0.82, 0.58],
    [-0.95, -0.58],
    [-0.95, 0.58],
  ].forEach(([tx, tz]) => {
    const housing = new THREE.Mesh(thrusterHousingGeo, trimMat);
    housing.position.set(tx, -0.17, tz);
    group.add(housing);
    const ring = new THREE.Mesh(thrusterRingGeo, thrusterMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(tx, -0.2, tz);
    group.add(ring);
  });

  // 7. Optional sleek low-profile roof police lightbar (no downward searchlight cone!)
  let redBar: THREE.MeshBasicMaterial | undefined;
  let blueBar: THREE.MeshBasicMaterial | undefined;
  if (isPolice) {
    redBar = new THREE.MeshBasicMaterial({ color: 0xff1e42 });
    blueBar = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    const barMount = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.68), trimMat);
    barMount.position.set(0.14, 0.46, 0);
    const barR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.3), redBar);
    barR.position.set(0.14, 0.51, -0.17);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.3), blueBar);
    barB.position.set(0.14, 0.51, 0.17);
    group.add(barMount, barR, barB);
  }

  return { group, redBar, blueBar };
}

/**
 * Builds a clean, dark rain-damp charcoal highway surface & crisp painted road markings
 * for Cyberpunk Neon — eliminating emissive cyan/magenta road glow while keeping the street sleek.
 */
export function createCleanCyberHighwayOverlay(): THREE.Group {
  const highway = new THREE.Group();
  highway.name = 'cyber_clean_charcoal_highway';

  // Matte-damp dark charcoal asphalt (emissive 0x000000, zero neon bleed)
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x151821,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.7,
    metalness: 0.08,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(74.4, 6.4), asphaltMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.position.set(0, 0.008, -12.5);
  highway.add(roadMesh);

  // Subtle double amber center lines (#B45309)
  const centerLineMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    emissive: 0x000000,
    roughness: 0.78,
    metalness: 0.02,
  });
  [-0.1, 0.1].forEach((dz) => {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(72.0, 0.07), centerLineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.015, -12.5 + dz);
    highway.add(line);
  });

  // Crisp muted off-white dashed lane dividers (#6B7280)
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    emissive: 0x000000,
    roughness: 0.82,
    metalness: 0.02,
  });
  const dashGeo = new THREE.PlaneGeometry(2.1, 0.08);
  [-14.1, -10.9].forEach((lz) => {
    for (let x = -33; x <= 33; x += 5.5) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.015, lz);
      highway.add(dash);
    }
  });

  return highway;
}
