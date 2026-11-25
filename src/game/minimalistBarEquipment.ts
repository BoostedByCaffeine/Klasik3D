import * as THREE from 'three';

let cachedPressureGaugeTex: THREE.CanvasTexture | null = null;
let cachedPidScreenTex: THREE.CanvasTexture | null = null;

/**
 * Generates a crisp Minimalist Modern Matte analog 16-bar espresso pressure gauge dial texture
 * with an emerald 8–10 bar extraction sweet-spot arc and fine graduation ticks.
 */
export function getAnalogPressureGaugeTexture(maxAnisotropy = 4): THREE.CanvasTexture | null {
  if (cachedPressureGaugeTex) return cachedPressureGaugeTex;
  if (typeof document === 'undefined') return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.45;

  // Clean architectural matte dial face
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fill();

  // Subtle recessed inner bezel ring
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
  ctx.stroke();

  // Sweet-spot extraction arc (8..10 bar highlighted in refined forest emerald)
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 20, Math.PI * 1.38, Math.PI * 1.66);
  ctx.stroke();

  // Over-pressure zone (12..16 bar subtle terracotta accent)
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 20, Math.PI * 1.76, Math.PI * 2.15);
  ctx.stroke();

  // Graduation tick marks around 240-degree sweep
  const startAng = Math.PI * 0.82;
  const sweep = Math.PI * 1.36;
  for (let i = 0; i <= 16; i++) {
    const ang = startAng + (i / 16) * sweep;
    const isMajor = i % 4 === 0;
    const r0 = r - (isMajor ? 28 : 19);
    const r1 = r - 9;
    ctx.strokeStyle = isMajor ? '#0f172a' : '#64748b';
    ctx.lineWidth = isMajor ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
    ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
    ctx.stroke();
  }

  // Minimalist "BAR" typography
  ctx.fillStyle = '#334155';
  ctx.font = '700 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BAR', cx, cy + 44);

  // Center pivot cap
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(cx, cy, 11, 0, Math.PI * 2);
  ctx.fill();

  cachedPressureGaugeTex = new THREE.CanvasTexture(canvas);
  cachedPressureGaugeTex.colorSpace = THREE.SRGBColorSpace;
  cachedPressureGaugeTex.anisotropy = Math.max(1, maxAnisotropy);
  return cachedPressureGaugeTex;
}

/**
 * Generates a crisp recessed OLED PID controller readout ("93.0°C · 27.4s") for the minimalist espresso bar.
 */
export function getMinimalistPidScreenTexture(maxAnisotropy = 4): THREE.CanvasTexture | null {
  if (cachedPidScreenTex) return cachedPidScreenTex;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 96);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 88);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PID', 18, 28);
  ctx.textAlign = 'right';
  ctx.fillText('9.0 BAR', 238, 28);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 34px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('93.0°', 18, 72);
  ctx.fillStyle = '#f59e0b';
  ctx.textAlign = 'right';
  ctx.fillText('27.4s', 238, 72);

  cachedPidScreenTex = new THREE.CanvasTexture(canvas);
  cachedPidScreenTex.colorSpace = THREE.SRGBColorSpace;
  cachedPidScreenTex.anisotropy = Math.max(1, maxAnisotropy);
  return cachedPidScreenTex;
}

export interface SculptedMilkPitcherBuild {
  group: THREE.Group;
  milkMesh: THREE.Mesh;
  spoutTip: THREE.Object3D;
  padGroup: THREE.Group;
}

/**
 * Builds a precision Minimalist Modern Matte / Satin-Aluminum barista frothing pitcher using
 * closed-wall LatheGeometry (thick rolled rim, tapered jug silhouette, concave base fillet),
 * pinched pouring spout with live spoutTip anchor, ergonomic curved strap handle, recessed inner
 * cavity with glossy microfoam meniscus, and a sleek flush thermal indicator strip.
 */
export function buildSculptedMilkPitcherGroup(
  pitcherBodyMat: THREE.MeshStandardMaterial
): SculptedMilkPitcherBuild {
  const group = new THREE.Group();
  group.name = 'sculpted_milk_pitcher';

  // Closed-wall tapered barista pitcher profile (outer wall -> rolled rim -> inner wall cavity)
  const lathePoints: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.002),
    new THREE.Vector2(0.068, 0.002),
    new THREE.Vector2(0.074, 0.009),
    new THREE.Vector2(0.075, 0.032),
    new THREE.Vector2(0.070, 0.088),
    new THREE.Vector2(0.062, 0.146),
    new THREE.Vector2(0.060, 0.168),
    new THREE.Vector2(0.0645, 0.175), // Rolled upper lip flare
    new THREE.Vector2(0.0615, 0.179),
    new THREE.Vector2(0.0565, 0.175), // Thickened inner rim
    new THREE.Vector2(0.0565, 0.132), // Inner wall descent down to milk meniscus
    new THREE.Vector2(0.0, 0.132),
  ];
  const bodyGeo = new THREE.LatheGeometry(lathePoints, 28);
  bodyGeo.computeVertexNormals();
  const bodyMesh = new THREE.Mesh(bodyGeo, pitcherBodyMat);
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Subtle dark slate recessed base trim ring so pitcher sits with crisp grounding
  const slateTrimMat = new THREE.MeshStandardMaterial({
    color: 0x262b33,
    roughness: 0.58,
    metalness: 0.28,
  });
  const baseFootRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.071, 0.0042, 8, 24),
    slateTrimMat
  );
  baseFootRing.rotation.x = Math.PI / 2;
  baseFootRing.position.y = 0.005;
  group.add(baseFootRing);

  // Sculpted pinched pouring spout fused seamlessly into the +X upper pitcher wall & rolled lip
  const spoutGroup = new THREE.Group();
  spoutGroup.position.set(0.048, 0.163, 0);

  // Tapered V-pinched pouring beak extending smoothly from the outer wall without any gap
  const spoutBeak = new THREE.Mesh(
    new THREE.ConeGeometry(0.022, 0.046, 14),
    pitcherBodyMat
  );
  spoutBeak.scale.set(0.76, 1.0, 0.72);
  spoutBeak.rotation.z = -Math.PI * 0.44;
  spoutBeak.position.set(0.014, 0.008, 0);
  spoutGroup.add(spoutBeak);

  // Subtle recessed inner pour channel shadow inside the beak tip so the spout reads crisp & hollow
  const spoutChannel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0045, 0.011, 0.032, 10),
    slateTrimMat
  );
  spoutChannel.scale.set(0.75, 1.0, 0.55);
  spoutChannel.rotation.z = -Math.PI * 0.42;
  spoutChannel.position.set(0.012, 0.014, 0);
  spoutGroup.add(spoutChannel);

  // Exact world-tracked spout tip anchor node for the live pouring milk stream!
  const spoutTip = new THREE.Object3D();
  spoutTip.name = 'milk_pitcher_spout_tip';
  spoutTip.position.set(0.034, 0.012, 0);
  spoutGroup.add(spoutTip);
  group.add(spoutGroup);

  // Ergonomic contoured barista strap handle along -X using CatmullRomCurve3 + TubeGeometry
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.059, 0.156, 0),
    new THREE.Vector3(-0.098, 0.152, 0),
    new THREE.Vector3(-0.112, 0.105, 0),
    new THREE.Vector3(-0.098, 0.056, 0),
    new THREE.Vector3(-0.071, 0.042, 0),
  ]);
  const handleGeo = new THREE.TubeGeometry(handleCurve, 20, 0.0082, 10, false);
  const handleMesh = new THREE.Mesh(handleGeo, pitcherBodyMat);
  handleMesh.scale.set(1.0, 1.0, 1.35); // Slightly flattened ergonomic ribbon strap
  group.add(handleMesh);

  // Brushed handle weld mounts
  [-0.06, -0.071].forEach((hx, idx) => {
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 0.024), pitcherBodyMat);
    mount.position.set(hx, idx === 0 ? 0.155 : 0.043, 0);
    group.add(mount);
  });

  // Glossy silky microfoam milk meniscus recessed cleanly inside the pitcher
  const milkMat = new THREE.MeshStandardMaterial({
    color: 0xfffdf5,
    roughness: 0.18,
    metalness: 0.02,
  });
  const milkMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.0555, 0.055, 0.018, 24), milkMat);
  milkMesh.position.y = 0.136;
  group.add(milkMesh);

  // Subtle concentric microfoam vortex sheen ring on top of milk
  const swirlRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.032, 0.0026, 6, 20),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.24 })
  );
  swirlRing.rotation.x = Math.PI / 2;
  swirlRing.position.y = 0.01;
  milkMesh.add(swirlRing);

  // Sleek minimalist matte-slate thermometer badge + thin emerald 65°C readout strip on front face
  const thermHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0715, 0.073, 0.02, 24, 1, true, -0.45, 0.9),
    slateTrimMat
  );
  thermHousing.position.y = 0.066;
  group.add(thermHousing);

  const thermLedStrip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0725, 0.0735, 0.0055, 20, 1, true, -0.32, 0.64),
    new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.65,
      roughness: 0.25,
    })
  );
  thermLedStrip.position.y = 0.066;
  group.add(thermLedStrip);

  // Generous invisible click proxy for effortless Realism Mode clicks
  const clickProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.088, 0.088, 0.19, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  clickProxy.position.y = 0.095;
  group.add(clickProxy);

  // Stationary minimalist matte-slate silicone coaster pad beneath pitcher
  const padGroup = new THREE.Group();
  const padDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.086, 0.09, 0.008, 24),
    slateTrimMat
  );
  padDisc.position.y = 0.004;
  padGroup.add(padDisc);

  return { group, milkMesh, spoutTip, padGroup };
}

export interface FrontRightTeapotBuild {
  coasterGroup: THREE.Group;
  teaPotGroup: THREE.Group;
  spoutTip: THREE.Object3D;
}

/**
 * Builds the relocated Kyoto Borosilicate Glass Teapot resting on a clear minimalist oiled-walnut
 * coaster to the front-right beside the cup (1.44, 1.0, 0.42), with a left-facing spout (-X) so
 * tilting cleanly pours amber-green tea infusion directly into the active cup at (1.18, 1.01, 0.38).
 */
export function buildFrontRightTeapotGroup(
  counterWoodMat: THREE.MeshStandardMaterial,
  usePhysicalTransmission: boolean
): FrontRightTeapotBuild {
  const satinAluminumMat = new THREE.MeshStandardMaterial({
    color: 0xcfd6df,
    roughness: 0.28,
    metalness: 0.78,
  });
  const matteSlateMat = new THREE.MeshStandardMaterial({
    color: 0x262b33,
    roughness: 0.58,
    metalness: 0.3,
  });

  // 1. Stationary Minimalist Walnut Wooden Coaster (remains anchored on counter when teapot lifts!)
  const coasterGroup = new THREE.Group();
  coasterGroup.name = 'teapot_wooden_coaster';
  const coasterBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.092, 0.096, 0.014, 24),
    counterWoodMat
  );
  coasterBody.position.y = 0.007;
  coasterGroup.add(coasterBody);

  const coasterRecessRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.078, 0.0032, 8, 24),
    satinAluminumMat
  );
  coasterRecessRing.rotation.x = Math.PI / 2;
  coasterRecessRing.position.y = 0.0145;
  coasterGroup.add(coasterRecessRing);

  // 2. Sculpted Minimalist Borosilicate Glass Teapot (spout points -X toward the active cup!)
  const teaPotGroup = new THREE.Group();
  teaPotGroup.name = 'kyoto_borosilicate_teapot';

  const baseRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.064, 0.068, 0.016, 24),
    matteSlateMat
  );
  baseRing.position.y = 0.022;
  teaPotGroup.add(baseRing);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xf0fdf4,
    roughness: 0.08,
    metalness: 0.02,
    transmission: usePhysicalTransmission ? 0.8 : 0,
    transparent: true,
    opacity: usePhysicalTransmission ? 0.9 : 0.42,
    clearcoat: 0.85,
    depthWrite: false,
  });

  // Sculpted LatheGeometry borosilicate carafe belly
  const carafeProfile = [
    new THREE.Vector2(0.0, 0.028),
    new THREE.Vector2(0.062, 0.028),
    new THREE.Vector2(0.076, 0.056),
    new THREE.Vector2(0.077, 0.092),
    new THREE.Vector2(0.066, 0.126),
    new THREE.Vector2(0.050, 0.145),
    new THREE.Vector2(0.054, 0.152),
  ];
  const bellyGeo = new THREE.LatheGeometry(carafeProfile, 24);
  bellyGeo.computeVertexNormals();
  const bellyMesh = new THREE.Mesh(bellyGeo, glassMat);
  bellyMesh.renderOrder = 3;
  teaPotGroup.add(bellyMesh);

  // Warm amber-jade steeped tea liquid inside carafe
  const teaLiquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.064, 0.058, 0.066, 20),
    new THREE.MeshStandardMaterial({
      color: 0x65a30d,
      emissive: 0x3f6212,
      emissiveIntensity: 0.25,
      roughness: 0.18,
      transparent: true,
      opacity: 0.86,
    })
  );
  teaLiquid.position.y = 0.068;
  teaPotGroup.add(teaLiquid);

  // Perforated satin-steel botanical leaf infuser basket suspended inside
  const infuserBasket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.026, 0.076, 16),
    satinAluminumMat
  );
  infuserBasket.position.y = 0.098;
  teaPotGroup.add(infuserBasket);

  const leafCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.85 })
  );
  leafCore.scale.set(1.0, 0.72, 1.0);
  leafCore.position.y = 0.078;
  teaPotGroup.add(leafCore);

  // Flush satin-aluminum lid + matte collar + turned walnut knob
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.052, 0.015, 22),
    satinAluminumMat
  );
  lid.position.y = 0.154;
  teaPotGroup.add(lid);

  const knobStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.01, 0.012, 10),
    matteSlateMat
  );
  knobStem.position.y = 0.165;
  teaPotGroup.add(knobStem);

  const lidKnob = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 10), counterWoodMat);
  lidKnob.scale.set(1.15, 0.85, 1.15);
  lidKnob.position.y = 0.178;
  teaPotGroup.add(lidKnob);

  // Curved glass spout facing LEFT (-X) directly toward the active cup!
  const spoutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.068, 0.088, 0),
    new THREE.Vector3(-0.092, 0.106, 0),
    new THREE.Vector3(-0.106, 0.132, 0),
  ]);
  const spoutMesh = new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 12, 0.011, 10, false), glassMat);
  spoutMesh.renderOrder = 3;
  teaPotGroup.add(spoutMesh);

  const spoutTip = new THREE.Object3D();
  spoutTip.name = 'teapot_spout_tip';
  spoutTip.position.set(-0.11, 0.135, 0);
  teaPotGroup.add(spoutTip);

  // Sculpted ergonomic walnut handle on RIGHT (+X)
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.062, 0.132, 0),
    new THREE.Vector3(0.102, 0.128, 0),
    new THREE.Vector3(0.11, 0.086, 0),
    new THREE.Vector3(0.092, 0.052, 0),
    new THREE.Vector3(0.068, 0.048, 0),
  ]);
  const handleMesh = new THREE.Mesh(
    new THREE.TubeGeometry(handleCurve, 16, 0.008, 10, false),
    counterWoodMat
  );
  teaPotGroup.add(handleMesh);

  // Generous non-overlapping invisible tap proxy for Realism Mode clickability
  const clickProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.095, 0.185, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  clickProxy.position.y = 0.095;
  teaPotGroup.add(clickProxy);

  return { coasterGroup, teaPotGroup, spoutTip };
}

/**
 * Builds 6 refined, skull-conformed stylized hairstyles for indoor customers so every
 * silhouette frames the face cleanly without floating lumps, weird spheres, or temple gaps.
 * Matches headMesh (Sphere 0.162 scaled 0.93 x 1.09 x 0.96 at y = 0.194).
 */
export function buildStylizedCustomerHairstyle(
  styleVariant: number,
  hairMat: THREE.MeshStandardMaterial
): THREE.Group {
  const hairGroup = new THREE.Group();
  hairGroup.name = `customer_hair_style_${styleVariant}`;

  // Tightly conformed base skull cap hugging the cranium strictly ABOVE the eyebrows (y >= 0.275 in front)
  const baseCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.167, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.44),
    hairMat
  );
  baseCap.scale.set(0.955, 1.08, 0.99);
  baseCap.position.set(0, 0.212, -0.01);
  baseCap.rotation.x = -0.24;
  hairGroup.add(baseCap);

  // Seamless back-of-head & nape coverage hugging the lower occiput (-Z hemisphere: phi = PI .. 2*PI in SphereGeometry)
  const napeBack = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.164,
      18,
      12,
      Math.PI * 1.06,
      Math.PI * 0.88,
      Math.PI * 0.28,
      Math.PI * 0.48
    ),
    hairMat
  );
  napeBack.scale.set(0.95, 1.07, 0.99);
  napeBack.position.set(0, 0.198, -0.008);
  hairGroup.add(napeBack);

  // Subtle tapered sideburns tucking cleanly in front of the ears
  [-1, 1].forEach((side) => {
    const temple = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.052, 5, 8), hairMat);
    temple.scale.set(0.55, 1.0, 1.15);
    temple.position.set(side * 0.146, 0.218, 0.012);
    temple.rotation.z = side * 0.08;
    hairGroup.add(temple);
  });

  const variant = ((styleVariant % 6) + 6) % 6;

  if (variant === 0) {
    // 0: Neat high bun with sleek swept hairline & fabric scrunchie
    const bunCore = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), hairMat);
    bunCore.scale.set(1.06, 0.88, 1.02);
    bunCore.position.set(0, 0.378, -0.058);
    hairGroup.add(bunCore);

    const scrunchie = new THREE.Mesh(
      new THREE.TorusGeometry(0.048, 0.012, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.58 })
    );
    scrunchie.rotation.x = Math.PI / 2 - 0.32;
    scrunchie.position.set(0, 0.35, -0.048);
    hairGroup.add(scrunchie);

    // Smooth face-framing side-swept bang hugging the upper forehead hairline
    const frontSweep = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), hairMat);
    frontSweep.scale.set(0.114, 0.032, 0.052);
    frontSweep.position.set(0.018, 0.314, 0.108);
    frontSweep.rotation.set(0.22, 0.12, -0.2);
    hairGroup.add(frontSweep);
  } else if (variant === 1) {
    // 1: Modern side-parted textured short crop (clean layered quiff wave)
    const crownVolume = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), hairMat);
    crownVolume.scale.set(0.142, 0.062, 0.145);
    crownVolume.position.set(0.014, 0.344, 0.004);
    crownVolume.rotation.z = -0.1;
    hairGroup.add(crownVolume);

    const quiffWave = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.104, 6, 10), hairMat);
    quiffWave.scale.set(1.0, 0.8, 1.04);
    quiffWave.rotation.set(0.16, 0.18, Math.PI / 2 - 0.22);
    quiffWave.position.set(0.012, 0.332, 0.094);
    hairGroup.add(quiffWave);

    const sideSweep = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), hairMat);
    sideSweep.scale.set(0.07, 0.032, 0.074);
    sideSweep.position.set(-0.088, 0.312, 0.042);
    sideSweep.rotation.z = 0.32;
    hairGroup.add(sideSweep);
  } else if (variant === 2) {
    // 2: Sleek chin-length contoured bob hugging cheeks cleanly with high soft bangs
    const bobWrap = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.155,
        0.163,
        0.205,
        22,
        1,
        false,
        Math.PI * 0.28,
        Math.PI * 1.44
      ),
      hairMat
    );
    bobWrap.scale.set(0.97, 1.0, 1.02);
    bobWrap.position.set(0, 0.156, -0.014);
    hairGroup.add(bobWrap);

    // Smooth curved lower bob hem curling subtly inward along the jaw
    const bobHem = new THREE.Mesh(
      new THREE.TorusGeometry(0.152, 0.022, 10, 22, Math.PI * 1.42),
      hairMat
    );
    bobHem.rotation.x = Math.PI / 2;
    bobHem.rotation.z = Math.PI * 0.79;
    bobHem.scale.set(0.98, 1.02, 1);
    bobHem.position.set(0, 0.062, -0.012);
    hairGroup.add(bobHem);

    // Soft straight-across curved bangs clearing eyebrows cleanly (bottom at y = 0.284)
    const bangs = new THREE.Mesh(
      new THREE.CylinderGeometry(0.152, 0.154, 0.046, 18, 1, false, -Math.PI * 0.3, Math.PI * 0.6),
      hairMat
    );
    bangs.scale.set(0.95, 1, 1.0);
    bangs.position.set(0, 0.308, 0.004);
    hairGroup.add(bangs);
  } else if (variant === 3) {
    // 3: Soft cohesive textured curls / rounded sculpted afro crown (no floating balls!)
    const curlCore = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), hairMat);
    curlCore.scale.set(1.02, 0.86, 1.0);
    curlCore.position.set(0, 0.288, -0.028);
    hairGroup.add(curlCore);

    // Tightly nestled perimeter texture ridges blended into the crown core
    const curlRidges: Array<[number, number, number, number]> = [
      [0, 0.372, -0.01, 0.068],
      [-0.088, 0.34, 0.005, 0.064],
      [0.088, 0.34, 0.005, 0.064],
      [-0.128, 0.262, -0.028, 0.06],
      [0.128, 0.262, -0.028, 0.06],
      [-0.068, 0.312, -0.102, 0.066],
      [0.068, 0.312, -0.102, 0.066],
      [0, 0.242, -0.132, 0.064],
      [0, 0.322, 0.095, 0.054],
    ];
    for (const [cx, cy, cz, cr] of curlRidges) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(cr, 12, 10), hairMat);
      puff.scale.set(1.06, 0.86, 1.02);
      puff.position.set(cx, cy, cz);
      hairGroup.add(puff);
    }
  } else if (variant === 4) {
    // 4: Sleek low ponytail with warm hair tie & parted forehead framing
    const ponyTie = new THREE.Mesh(
      new THREE.TorusGeometry(0.032, 0.0085, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.42 })
    );
    ponyTie.position.set(0, 0.168, -0.162);
    ponyTie.rotation.x = 0.45;
    hairGroup.add(ponyTie);

    const ponyTail = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.165, 8, 12), hairMat);
    ponyTail.scale.set(1.05, 1.0, 0.88);
    ponyTail.position.set(0, 0.072, -0.198);
    ponyTail.rotation.x = -0.24;
    hairGroup.add(ponyTail);

    [-1, 1].forEach((side) => {
      const curtain = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), hairMat);
      curtain.scale.set(0.074, 0.034, 0.056);
      curtain.position.set(side * 0.066, 0.3, 0.106);
      curtain.rotation.set(0.18, side * -0.22, side * -0.34);
      hairGroup.add(curtain);
    });
  } else {
    // 5: Modern middle-part curtain flow (clean café regular layered silhouette)
    [-1, 1].forEach((side) => {
      const crownWave = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), hairMat);
      crownWave.scale.set(0.082, 0.052, 0.125);
      crownWave.position.set(side * 0.062, 0.338, 0.008);
      crownWave.rotation.z = side * -0.22;
      hairGroup.add(crownWave);

      // Smooth curved curtain fringe hugging the upper temples cleanly
      const fringe = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.074, 6, 10), hairMat);
      fringe.scale.set(0.85, 1.0, 0.72);
      fringe.position.set(side * 0.094, 0.278, 0.096);
      fringe.rotation.set(0.22, side * -0.35, side * -0.46);
      hairGroup.add(fringe);

      // Sleek layered back-side hair tapering smoothly behind the ear
      const sideLayer = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.095, 6, 10), hairMat);
      sideLayer.scale.set(0.7, 1.0, 1.15);
      sideLayer.position.set(side * 0.146, 0.175, -0.025);
      sideLayer.rotation.z = side * -0.08;
      hairGroup.add(sideLayer);
    });
  }

  return hairGroup;
}
