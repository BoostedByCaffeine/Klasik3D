import * as THREE from 'three';
import type { SceneryId } from './sceneryData';

export type OutdoorVantageKey = 'porch' | 'overlook' | 'lookback';

export interface OutdoorVantageSpec {
  key: OutdoorVantageKey;
  label: string;
  pos: [number, number, number];
  baseYaw: number;
  basePitch: number;
}

/**
 * Calibrated directly to Klasik Cafe's actual world coordinates:
 * - Front glass entrance door is at x = -1.15, z = -6.2 facing -Z
 * - Near sidewalk: z = -7.2..-9.2; Road: z = -9.3..-15.8; Far promenade: z = -15.8..-17.5
 * - Outdoor scenery spans z = -17.5..-140 (down -Z, which is baseYaw = 0 in Three.js!)
 * - Look Back stands across the front walkway facing +Z (baseYaw ≈ Math.PI) toward the cafe facade & Miata!
 */
export const OUTDOOR_VANTAGES: Record<OutdoorVantageKey, OutdoorVantageSpec> = {
  porch: {
    key: 'porch',
    label: 'Cafe Porch',
    pos: [-1.15, 1.82, -7.35],
    baseYaw: 0,
    basePitch: 0.04,
  },
  overlook: {
    key: 'overlook',
    label: 'Scenic Overlook',
    pos: [-1.45, 1.88, -16.85],
    baseYaw: 0,
    basePitch: 0.04,
  },
  lookback: {
    key: 'lookback',
    label: 'Look Back',
    pos: [-2.35, 2.08, -16.85],
    baseYaw: Math.PI + 0.16,
    basePitch: -0.04,
  },
};

export const OUTDOOR_VANTAGE_LIST: readonly OutdoorVantageSpec[] = [
  OUTDOOR_VANTAGES.porch,
  OUTDOOR_VANTAGES.overlook,
  OUTDOOR_VANTAGES.lookback,
];

/**
 * Returns the scenery-adjusted vantage spec so elevated cliffside vistas
 * (Hilltop City Lights, Switzerland Hilltop, Eiffel Tower terrace) stand cleanly
 * at the unobstructed viewing rail pitched gently downward into the valley/park below.
 */
export function resolveOutdoorVantageForScenery(
  key: OutdoorVantageKey,
  sceneryId: SceneryId
): OutdoorVantageSpec {
  const base = OUTDOOR_VANTAGES[key] || OUTDOOR_VANTAGES.porch;
  if (key !== 'overlook') return base;

  if (sceneryId === 'hilltop_city_lights') {
    return {
      ...base,
      pos: [-0.6, 2.55, -17.68],
      baseYaw: 0,
      basePitch: -0.32,
    };
  }
  if (sceneryId === 'switzerland_hilltop') {
    return {
      ...base,
      pos: [-0.6, 2.55, -17.68],
      baseYaw: 0,
      basePitch: -0.3,
    };
  }
  if (sceneryId === 'eiffel_tower') {
    return {
      ...base,
      pos: [-0.4, 2.28, -17.68],
      baseYaw: 0,
      basePitch: -0.1,
    };
  }
  return base;
}

/**
 * Mobile-First Panoramic Camera Controller for "Go Outside" Scenic Overlook Mode.
 * Uses smooth THREE.MathUtils.damp yaw/pitch panoramic look, pinch-to-zoom / wheel FOV (30°–68°),
 * and scenery-calibrated one-tap preset vantage spot lerps.
 */
export class OutdoorOverlookController {
  private readonly camera: THREE.PerspectiveCamera;
  public active = false;
  public vantageKey: OutdoorVantageKey = 'porch';
  private activeScenery: SceneryId = 'busy_street';
  private readonly targetPos = new THREE.Vector3();
  private yawOffset = 0;
  private pitchOffset = 0;
  private targetYawOffset = 0;
  private targetPitchOffset = 0;
  private targetFov = 58;
  private savedFov = 50;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public setSceneryId(sceneryId: SceneryId): void {
    if (this.activeScenery === sceneryId) return;
    this.activeScenery = sceneryId;
    if (this.active) {
      const v = resolveOutdoorVantageForScenery(this.vantageKey, this.activeScenery);
      this.targetPos.set(v.pos[0], v.pos[1], v.pos[2]);
    }
  }

  public enter(vantageKey: OutdoorVantageKey = 'porch'): void {
    if (!this.active) {
      this.savedFov = this.camera.fov || 50;
    }
    this.active = true;
    this.targetFov = 58;
    this.setVantage(vantageKey, true);
    this.camera.fov = this.targetFov;
    this.camera.updateProjectionMatrix();
  }

  public exit(): void {
    this.active = false;
    this.camera.fov = this.savedFov;
    this.camera.updateProjectionMatrix();
  }

  public setVantage(key: OutdoorVantageKey, immediate = false): void {
    const v = resolveOutdoorVantageForScenery(key, this.activeScenery);
    this.vantageKey = v.key;
    this.targetPos.set(v.pos[0], v.pos[1], v.pos[2]);
    this.targetYawOffset = 0;
    this.targetPitchOffset = 0;
    if (immediate) {
      this.camera.position.copy(this.targetPos);
      this.yawOffset = 0;
      this.pitchOffset = 0;
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = v.baseYaw;
      this.camera.rotation.x = v.basePitch;
      this.camera.rotation.z = 0;
    }
  }

  public onDrag(dx: number, dy: number): void {
    if (!this.active) return;
    // ±150° panoramic yaw (~2.61 rad), -35° (-0.61 rad) to +45° (+0.78 rad) pitch
    this.targetYawOffset = THREE.MathUtils.clamp(this.targetYawOffset - dx * 0.0052, -2.6, 2.6);
    this.targetPitchOffset = THREE.MathUtils.clamp(this.targetPitchOffset - dy * 0.0042, -0.61, 0.78);
  }

  public onZoom(deltaFov: number): void {
    if (!this.active) return;
    this.targetFov = THREE.MathUtils.clamp(this.targetFov + deltaFov, 30, 68);
  }

  public update(dt: number): void {
    if (!this.active) return;
    const v = resolveOutdoorVantageForScenery(this.vantageKey, this.activeScenery);
    this.camera.position.lerp(this.targetPos, Math.min(1, dt * 8.5));
    this.yawOffset = THREE.MathUtils.damp(this.yawOffset, this.targetYawOffset, 8, dt);
    this.pitchOffset = THREE.MathUtils.damp(this.pitchOffset, this.targetPitchOffset, 8, dt);

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = v.baseYaw + this.yawOffset;
    this.camera.rotation.x = v.basePitch + this.pitchOffset;
    this.camera.rotation.z = 0;

    if (Math.abs(this.camera.fov - this.targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, this.targetFov, 10, dt);
      this.camera.updateProjectionMatrix();
    }
  }
}
