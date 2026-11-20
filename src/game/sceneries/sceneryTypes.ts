import * as THREE from 'three';
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
  envHint: SceneryEnvironmentHint;
  update?: (
    dt: number,
    elapsed: number,
    isNight: boolean,
    climateState: ClimateState,
    weather: WeatherMode
  ) => void;
}

export type SceneryBuilderFn = () => SceneryRuntimeInstance;
export type SceneryDioramaBuilderFn = () => THREE.Group;

/**
 * Recursively disposes geometries, materials, and owned textures under a Three.js Object3D
 * so switching between the 9 outdoor sceneries never leaks GPU memory on mobile WebViews.
 */
export function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh | THREE.Points | THREE.Line | THREE.Sprite;
    if ('geometry' in mesh && mesh.geometry) {
      mesh.geometry.dispose();
    }
    if ('material' in mesh && mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        const m = mat as THREE.MeshStandardMaterial & { map?: THREE.Texture | null };
        if (m.map && m.map.userData?.ownedByScenery) {
          m.map.dispose();
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
 * Helper to disable shadow casting across an entire distant scenery subtree for mobile GPU headroom.
 */
export function disableShadowsRecursive(group: THREE.Object3D): void {
  group.traverse((obj) => {
    obj.castShadow = false;
  });
}
