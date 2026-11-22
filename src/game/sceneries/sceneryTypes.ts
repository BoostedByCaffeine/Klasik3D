import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ClimateState, SceneryId } from '../sceneryData';
import type { WeatherMode } from '../rules';

export interface SceneryEnvironmentHint {
  fogColorDay?: number;
  fogColorNight?: number;
  fogDensityScale?: number;
  sunColorOverride?: number;
  skyTintDay?: number;
  skyTintNight?: number;
  neonRain?: boolean;
  alwaysWinter?: boolean;
}

export interface SceneryRuntimeInstance {
  id: SceneryId;
  root: THREE.Group;
  /** Lightweight hero landmarks visible through the cafe front glass (strict <= 20 draw calls). */
  windowBackdropGroup?: THREE.Group;
  /** Rich 360-degree exterior details (flanks, intersections, park NPCs, deep valleys) culled when indoors. */
  outdoorOnlyGroup?: THREE.Group;
  envHint: SceneryEnvironmentHint;
  update?: (
    dt: number,
    elapsed: number,
    isNight: boolean,
    climateState: ClimateState,
    weather: WeatherMode,
    isPlayerOutside?: boolean
  ) => void;
}

export type SceneryBuilderFn = () => SceneryRuntimeInstance;
export type SceneryDioramaBuilderFn = () => THREE.Group;

/**
 * Recursively disposes geometries, materials, and owned textures under a Three.js Object3D
 * so switching between the 9 outdoor sceneries never leaks GPU memory on mobile WebViews.
 */
export function disposeObject3D(obj: THREE.Object3D): void {
  const disposedGeos = new Set<THREE.BufferGeometry>();
  const disposedMats = new Set<THREE.Material>();

  obj.traverse((child) => {
    const inst = child as THREE.InstancedMesh;
    if (inst.isInstancedMesh && typeof inst.dispose === 'function') {
      inst.dispose();
    }
    const mesh = child as THREE.Mesh | THREE.Points | THREE.Line | THREE.Sprite;
    if ('geometry' in mesh && mesh.geometry && !disposedGeos.has(mesh.geometry)) {
      disposedGeos.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    if ('material' in mesh && mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!mat || disposedMats.has(mat)) continue;
        disposedMats.add(mat);
        const m = mat as THREE.MeshStandardMaterial & {
          map?: THREE.Texture | null;
          emissiveMap?: THREE.Texture | null;
        };
        if (m.map && m.map.userData?.ownedByScenery) {
          m.map.dispose();
        }
        if (m.emissiveMap && m.emissiveMap.userData?.ownedByScenery) {
          m.emissiveMap.dispose();
        }
        mat.dispose();
      }
    }
  });
}

let sharedGlowTexture: THREE.CanvasTexture | null = null;

/**
 * Lightweight radial glow sprite texture for fake bloom (Eiffel twinkles, Cyberpunk holograms,
 * Sakura/Fireflies, Highland mist) — zero post-processing passes!
 */
export function getSharedGlowSpriteTexture(): THREE.CanvasTexture {
  if (sharedGlowTexture) return sharedGlowTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.32, 'rgba(255,255,255,0.65)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.16)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  sharedGlowTexture = new THREE.CanvasTexture(canvas);
  sharedGlowTexture.colorSpace = THREE.SRGBColorSpace;
  return sharedGlowTexture;
}

/**
 * Shared floating circular/hex diorama pedestal for ThumbnailStudio miniature 3D previews.
 */
export function createDioramaBase(topColor: number, rimColor = 0x2a2018): THREE.Group {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.78, metalness: 0.12 });
  const topMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.82 });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.0, 0.22, 6), baseMat);
  rim.position.y = -0.11;
  group.add(rim);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.06, 6), topMat);
  top.position.y = 0.02;
  group.add(top);
  return group;
}

/**
 * Disables both shadow casting and shadow receiving across an entire outdoor scenery subtree
 * so the shadow pass only renders the cafe interior/characters and mobile GPUs skip outdoor shadow lookups.
 */
export function disableShadowsRecursive(group: THREE.Object3D): void {
  group.traverse((obj) => {
    obj.castShadow = false;
    obj.receiveShadow = false;
  });
}

/**
 * Removes any accidental real-time PointLight or SpotLight inside an outdoor scenery subtree
 * to guarantee zero extra fragment-shader light evaluations across the cafe and exterior.
 */
export function stripRealtimeOutdoorLights(group: THREE.Object3D): void {
  const lightsToRemove: THREE.Object3D[] = [];
  group.traverse((obj) => {
    if (
      (obj as THREE.PointLight).isPointLight ||
      (obj as THREE.SpotLight).isSpotLight
    ) {
      lightsToRemove.push(obj);
    }
  });
  for (const l of lightsToRemove) {
    l.parent?.remove(l);
  }
}

/**
 * Collapses static non-animated THREE.Mesh children sharing the exact same Material reference
 * inside a container into merged BufferGeometries (1 draw call per unique material).
 * Preserves InstancedMesh, Points, Line, Sprite, and any mesh/ancestor marked `userData.noMerge = true`.
 */
export function batchStaticMeshesByMaterial(container: THREE.Group): void {
  container.updateMatrixWorld(true);
  const invContainer = new THREE.Matrix4().copy(container.matrixWorld).invert();
  const relMatrix = new THREE.Matrix4();

  type ZoneTag = 'backdrop' | 'outdoor' | 'default';
  interface BucketEntry {
    mat: THREE.Material;
    zone: ZoneTag;
    sig: string;
    meshes: THREE.Mesh[];
  }
  const buckets = new Map<string, BucketEntry>();
  const matIds = new Map<THREE.Material, number>();
  let nextMatId = 1;

  const collect = (obj: THREE.Object3D, blocked: boolean, zone: ZoneTag) => {
    const nextZone: ZoneTag = obj.userData?.alwaysVisibleBackdrop
      ? 'backdrop'
      : obj.userData?.outdoorOnly
      ? 'outdoor'
      : zone;
    const isBlocked =
      blocked ||
      Boolean(obj.userData?.noMerge) ||
      Boolean(obj.userData?.dynamicVisibility);

    if (!isBlocked) {
      const mesh = obj as THREE.Mesh;
      const isPlainStaticMesh =
        mesh.isMesh &&
        !(mesh as THREE.InstancedMesh).isInstancedMesh &&
        !(mesh as THREE.SkinnedMesh).isSkinnedMesh &&
        mesh.geometry &&
        !Array.isArray(mesh.material) &&
        Boolean(mesh.material);

      if (isPlainStaticMesh && mesh.geometry.attributes.position) {
        const mat = mesh.material as THREE.Material;
        let matId = matIds.get(mat);
        if (!matId) {
          matId = nextMatId++;
          matIds.set(mat, matId);
        }
        const attrs = mesh.geometry.attributes;
        const sig = `${attrs.color ? 'C' : '_'}_${attrs.uv ? 'U' : '_'}`;
        const key = `${matId}|${nextZone}|${sig}`;
        let entry = buckets.get(key);
        if (!entry) {
          entry = { mat, zone: nextZone, sig, meshes: [] };
          buckets.set(key, entry);
        }
        entry.meshes.push(mesh);
      }
    }
    for (let i = 0; i < obj.children.length; i++) {
      collect(obj.children[i], isBlocked, nextZone);
    }
  };

  collect(container, false, 'default');

  buckets.forEach((entry) => {
    const groupMeshes = entry.meshes;
    if (groupMeshes.length < 3) return; // Keep tiny 1–2 mesh materials untouched
    const prepared: THREE.BufferGeometry[] = [];
    for (const m of groupMeshes) {
      const cloned = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      if (!cloned.attributes.normal) {
        cloned.computeVertexNormals();
      }
      for (const key of Object.keys(cloned.attributes)) {
        if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') {
          cloned.deleteAttribute(key);
        }
      }
      relMatrix.multiplyMatrices(invContainer, m.matrixWorld);
      cloned.applyMatrix4(relMatrix);
      prepared.push(cloned);
    }

    const merged = mergeGeometries(prepared, false);
    for (const g of prepared) g.dispose();
    if (!merged) return;

    merged.computeBoundingSphere();
    const mergedMesh = new THREE.Mesh(merged, entry.mat);
    mergedMesh.name = `batched_static_${entry.zone}`;
    mergedMesh.castShadow = false;
    mergedMesh.receiveShadow = false;
    if (entry.zone === 'backdrop') {
      mergedMesh.userData.alwaysVisibleBackdrop = true;
    } else if (entry.zone === 'outdoor') {
      mergedMesh.userData.outdoorOnly = true;
    }
    container.add(mergedMesh);

    for (const m of groupMeshes) {
      m.parent?.remove(m);
      m.geometry.dispose();
    }
  });
}

/**
 * Automatically partitions direct children of a scenery root that sit far off to the
 * flanks (`|x| > 24`, behind the cafe `z > -16.5`, or deep below the cliff edge `y < -12`)
 * or carry `userData.outdoorOnly === true` into an explicit `outdoorOnlyGroup` while keeping
 * ultra-lightweight front-window landmarks always visible inside `windowBackdropGroup`.
 */
export function applyIndoorBackdropCullFilter(
  root: THREE.Group,
  isPlayerOutside: boolean
): void {
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (child.userData?.alwaysVisibleBackdrop) {
      child.visible = true;
      continue;
    }
    if (child.userData?.outdoorOnly) {
      child.visible = isPlayerOutside;
      continue;
    }
    // Preserve objects whose visibility is driven dynamically by rain/snow/night (marked dynamicVisibility)
    if (child.userData?.dynamicVisibility) {
      if (!isPlayerOutside) child.visible = false;
      continue;
    }
    // Cache spatial classification once so toggling inside/outside is O(N) zero-allocation
    if (child.userData._indoorCulled === undefined) {
      box.setFromObject(child);
      if (box.isEmpty()) {
        child.userData._indoorCulled = false;
      } else {
        box.getCenter(center);
        box.getSize(size);
        const isSmallProp = size.x < 9.5 && size.y < 7.5 && size.z < 9.5;
        const isBehindOrFarSide =
          center.z > -15.5 ||
          Math.abs(center.x) > 26 ||
          box.max.y < -1.5; // Deep valley / underground basin invisible from flat barista window POV
        const isMidForegroundSmallProp = isSmallProp && center.z > -38 && Math.abs(center.x) > 10.5;
        child.userData._indoorCulled = isBehindOrFarSide || isMidForegroundSmallProp;
      }
    }
    if (child.userData._indoorCulled) {
      child.visible = isPlayerOutside;
    }
  }
}
