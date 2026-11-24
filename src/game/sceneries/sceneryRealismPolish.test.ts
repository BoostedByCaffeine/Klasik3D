import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Minimal Node-only document.createElement('canvas') shim for CanvasTexture builders in unit tests
if (typeof (globalThis as Record<string, unknown>).document === 'undefined') {
  const fakeCtx = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
          return () => ({ addColorStop: () => {} });
        }
        if (prop === 'getImageData') {
          return (_x: number, _y: number, w: number, h: number) => ({
            data: new Uint8ClampedArray(w * h * 4),
          });
        }
        if (prop === 'createImageData') {
          return (w: number, h: number) => ({
            data: new Uint8ClampedArray(w * h * 4),
          });
        }
        return () => {};
      },
    }
  );
  (globalThis as Record<string, unknown>).document = {
    createElement: () => ({
      width: 128,
      height: 128,
      getContext: () => fakeCtx,
    }),
  };
}

import {
  COASTAL_SIERRA,
  HIMALAYAN_HORN,
  SWISS_ALPINE,
  createMountainRangeRibbon,
  createRidgedPeakGeometry,
  createSharedMountainMaterial,
} from './mountainRanges';
import { CYBER_OPEN_ALLEY_XS, createRecessedCyberAlley } from './cyberpunkAssets';
import { EIFFEL_PARK_WALK_BOUNDS, createEiffelParkLife } from './eiffelParkLife';
import { createMayonOverlookLife } from './mayonOverlookLife';
import { buildHilltopCityLightsScenery, buildMayonVolcanoScenery } from './sceneriesPart1';
import {
  buildCyberpunkNeonScenery,
  buildEiffelTowerScenery,
  buildMtEverestScenery,
  buildSwitzerlandHilltopScenery,
} from './sceneriesPart2';
import { attachExpeditionWinterGear, createArticulatedOutdoorNpc } from '../outdoorNpcRig';

test('Phase 1: Mountain geometries generate world-scaled UVs and matte MeshStandardMaterial', () => {
  const peakGeo = createRidgedPeakGeometry({
    seed: 101,
    radiusX: 30,
    radiusZ: 24,
    height: 45,
    baseY: 0,
    skirtFloorY: -20,
    palette: SWISS_ALPINE,
    tier: 'medium',
  });
  const uvAttr = peakGeo.attributes.uv as THREE.BufferAttribute | undefined;
  assert.ok(uvAttr, 'RidgedPeakGeometry must define UV attribute');
  assert.equal(uvAttr.count, peakGeo.attributes.position.count);

  const ribbonGeo = createMountainRangeRibbon({
    seed: 202,
    arcRadius: 100,
    startAngle: -1.1,
    endAngle: 1.1,
    depth: 32,
    peakCount: 5,
    minPeakHeight: 20,
    maxPeakHeight: 45,
    baseY: 0,
    skirtFloorY: -20,
    palette: HIMALAYAN_HORN,
    tier: 'medium',
  });
  const ribbonUv = ribbonGeo.attributes.uv as THREE.BufferAttribute | undefined;
  assert.ok(ribbonUv, 'MountainRangeRibbon must define UV attribute');
  assert.equal(ribbonUv.count, ribbonGeo.attributes.position.count);

  const mat = createSharedMountainMaterial('alpine', 'medium');
  assert.equal(mat.vertexColors, true);
  assert.equal(mat.flatShading, true);
  assert.ok(mat.roughness >= 0.94, 'Mountain material must stay matte (>=0.94 roughness)');
  assert.equal(mat.metalness, 0);
  assert.ok(mat.envMapIntensity <= 0.15, 'Mountain envMapIntensity must stay low');

  const lowMat = createSharedMountainMaterial('himalayan', 'low');
  assert.equal(lowMat.bumpMap, null, 'Low APK tier must disable bumpMap');
});

test('Phase 2: Hilltop City Lights matte urban landmass & highland ridge palette have zero flooded sea overlap', () => {
  assert.equal(COASTAL_SIERRA.baseColor, 0x1a2b24);
  assert.equal(COASTAL_SIERRA.midRockColor, 0x25323f);
  assert.equal(COASTAL_SIERRA.steepCliffColor, 0x1b222c);
  assert.equal(COASTAL_SIERRA.lowBounceColor, 0x3a2d22);

  const hilltop = buildHilltopCityLightsScenery();
  let foundMatteLandmass = false;
  let foundCoastalSeaBeyondCity = false;
  hilltop.root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
      if (obj.geometry instanceof THREE.PlaneGeometry) {
        const params = obj.geometry.parameters;
        if (params.width >= 350 && obj.position.z > -100 && obj.position.y < -15) {
          assert.ok(obj.material.roughness >= 0.95, 'Valley urban landmass must be matte (>=0.95)');
          assert.equal(obj.material.metalness, 0);
          assert.ok(obj.material.envMapIntensity <= 0.08);
          foundMatteLandmass = true;
        }
        if (obj.position.z < -150 && obj.position.y < -15) {
          const nearEdgeZ = obj.position.z + params.height * 0.5;
          assert.ok(nearEdgeZ <= -122, `Coastal sea near edge (${nearEdgeZ}) must stay past city shoreline`);
          foundCoastalSeaBeyondCity = true;
        }
      }
    }
  });
  assert.ok(foundMatteLandmass, 'Expected matte urban landmass plane under Hilltop buildings');
  assert.ok(foundCoastalSeaBeyondCity, 'Expected coastal sea plane strictly beyond city shoreline');
});

test('Phase 3: Cyberpunk Neon carves recessed open alleys at verified centerlines', () => {
  assert.ok(CYBER_OPEN_ALLEY_XS.includes(-3.8), 'Open recessed alley #1 (-3.8) must be registered');
  assert.ok(CYBER_OPEN_ALLEY_XS.includes(3.2), 'Open recessed alley #2 (+3.2) must be registered');
  const alley = createRecessedCyberAlley({
    x: -3.8,
    accentHex: 0x22d3ee,
    secondaryHex: 0xe879f9,
  });
  assert.ok(alley.children.length >= 6, 'Recessed alley must include walls, curb strips, backplane & conduits');

  const cyber = buildCyberpunkNeonScenery();
  assert.ok(cyber.outdoorOnlyGroup, 'Cyberpunk scenery must expose outdoorOnlyGroup');
  cyber.update?.(0.016, 1.0, true, 'summer', 'night', false);
  cyber.update?.(0.016, 2.0, true, 'summer', 'night', true);
});

test('Phase 4: Eiffel Tower park life enforces inner bounds, indoor skip, and full-rig batch immunity', () => {
  assert.ok(EIFFEL_PARK_WALK_BOUNDS.minX > -12.0 && EIFFEL_PARK_WALK_BOUNDS.maxX < 13.0);
  const parkLife = createEiffelParkLife(EIFFEL_PARK_WALK_BOUNDS.parkY, [
    { x: -3.2, z: -36.8, rotY: Math.PI / 2 },
    { x: 4.2, z: -43.0, rotY: -Math.PI / 2 },
  ]);
  assert.equal(parkLife.group.userData.skipStaticBatch, true);
  assert.equal(parkLife.group.userData.noMerge, true);
  assert.equal(parkLife.group.userData.outdoorOnly, true);

  const eiffel = buildEiffelTowerScenery();
  assert.ok(eiffel.outdoorOnlyGroup, 'Eiffel scenery must expose outdoorOnlyGroup');
  eiffel.update?.(0.05, 5.0, false, 'summer', 'morning', false);
  eiffel.update?.(0.05, 5.05, false, 'summer', 'morning', true);
});

test('Phase 5: Switzerland Hilltop includes two distant Alpine cable-car lodges and track-aligned cogwheel railcar', () => {
  const swiss = buildSwitzerlandHilltopScenery();
  const westLodge = swiss.windowBackdropGroup?.getObjectByName('swiss_cable_station_west');
  const eastLodge = swiss.windowBackdropGroup?.getObjectByName('swiss_cable_station_east');
  const railcar = swiss.root.getObjectByName('swiss_cogwheel_railcar');

  assert.ok(westLodge, 'West Alpine cable-car station lodge must exist inside windowBackdropGroup');
  assert.ok(eastLodge, 'East Alpine cable-car station lodge must exist inside windowBackdropGroup');
  assert.ok(railcar, 'Detailed Swiss cogwheel railcar must exist');
  assert.equal(railcar.userData.skipStaticBatch, true);
  assert.equal(railcar.userData.noMerge, true);

  const identityQ = new THREE.Quaternion();
  assert.ok(
    railcar.quaternion.angleTo(identityQ) > 0.25,
    'Cogwheel railcar must be pitch/yaw aligned to the inclined track'
  );
  swiss.update?.(0.1, 3.0, false, 'winter', 'morning', true);
});

test('Phase 6: Mt. Everest builds Kala Patthar Everest-Nuptse massif and full-rig expedition campers', () => {
  const everest = buildMtEverestScenery();
  const backdrop = everest.windowBackdropGroup;
  assert.ok(backdrop, 'Everest must expose windowBackdropGroup');
  assert.ok(backdrop.getObjectByName('everest_summit_pyramid'), 'Missing Everest summit pyramid');
  assert.ok(backdrop.getObjectByName('everest_west_shoulder'), 'Missing West Shoulder snow ridge');
  assert.ok(backdrop.getObjectByName('everest_nuptse_dominant_wall'), 'Missing dominant Nuptse wall');
  assert.ok(backdrop.getObjectByName('everest_nuptse_dark_rock_spur'), 'Missing Nuptse dark rock spur');
  assert.ok(backdrop.getObjectByName('everest_khumbu_icefall_center'), 'Missing Khumbu Icefall apron');

  const testRig = createArticulatedOutdoorNpc({ shirtHex: 0xdc2626, pantsHex: 0x1e293b });
  attachExpeditionWinterGear(testRig, { parkaHex: 0xdc2626, withTrekkingPoles: true });
  assert.ok(testRig.slots.headwear.children.length >= 3, 'Expedition headwear must be bone-parented');
  assert.ok(testRig.slots.backProp.children.length >= 3, 'Expedition backpack must be bone-parented');
  assert.ok(testRig.slots.leftHandProp.children.length >= 2, 'Glove + trekking pole must be bone-parented');

  everest.update?.(0.05, 4.0, false, 'winter', 'morning', false);
  everest.update?.(0.05, 4.05, false, 'winter', 'morning', true);
});

test('Phase 7: Mayon Volcano living overlook runs all 5 state machines cleanly and skips indoors', () => {
  const overlookLife = createMayonOverlookLife();
  assert.equal(overlookLife.group.userData.outdoorOnly, true);
  assert.equal(overlookLife.group.userData.skipStaticBatch, true);
  assert.equal(overlookLife.group.userData.noMerge, true);

  const car = overlookLife.group.getObjectByName('mayon_sightseeing_car');
  assert.ok(car, 'Mayon L-junction sightseeing car must exist inside overlook life group');
  assert.equal(car.visible, false, 'Sightseeing car starts in cooldown before approaching L-junction');

  // Advance 20s indoors -> car must stay hidden & skipped!
  for (let i = 0; i < 40; i++) {
    overlookLife.update(0.5, i * 0.5, false, false, false);
  }
  assert.equal(car.visible, false, 'Indoor update must skip Mayon overlook state machines completely');

  // Advance 20s outdoors -> rare L-junction car spawns and drives onto the overlook approach!
  for (let i = 0; i < 400; i++) {
    overlookLife.update(0.05, i * 0.05, false, false, true);
  }
  assert.equal(car.visible, true, 'L-junction sightseeing car must become visible after initial cooldown outdoors');

  const mayon = buildMayonVolcanoScenery();
  assert.ok(mayon.outdoorOnlyGroup, 'Mayon scenery must expose outdoorOnlyGroup');
  mayon.update?.(0.05, 2.0, false, 'summer', 'morning', true);
  mayon.update?.(0.05, 2.05, false, 'summer', 'rainy', true);
});
