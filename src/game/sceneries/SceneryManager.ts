import * as THREE from 'three';
import { ClimateState, SceneryId } from '../sceneryData';
import type { WeatherMode } from '../rules';
import type { AnimatedDoorwayAnchor } from '../doorwayTraffic';
import {
  SceneryBuilderFn,
  SceneryDioramaBuilderFn,
  SceneryEnvironmentHint,
  SceneryRuntimeInstance,
  applyIndoorBackdropCullFilter,
  batchStaticMeshesByMaterial,
  disableShadowsRecursive,
  disposeObject3D,
  stripRealtimeOutdoorLights,
} from './sceneryTypes';
import {
  buildBrazilianFavelaDiorama,
  buildBrazilianFavelaScenery,
  buildBusyStreetDiorama,
  buildBusyStreetScenery,
  buildHilltopCityLightsDiorama,
  buildHilltopCityLightsScenery,
  buildJapaneseTranquilityDiorama,
  buildJapaneseTranquilityScenery,
  buildMayonVolcanoDiorama,
  buildMayonVolcanoScenery,
} from './sceneriesPart1';
import {
  buildCyberpunkNeonDiorama,
  buildCyberpunkNeonScenery,
  buildEiffelTowerDiorama,
  buildEiffelTowerScenery,
  buildMtEverestDiorama,
  buildMtEverestScenery,
  buildSwitzerlandHilltopDiorama,
  buildSwitzerlandHilltopScenery,
} from './sceneriesPart2';

const SCENERY_BUILDERS: Record<SceneryId, SceneryBuilderFn> = {
  busy_street: buildBusyStreetScenery,
  mayon_volcano: buildMayonVolcanoScenery,
  hilltop_city_lights: buildHilltopCityLightsScenery,
  japanese_tranquility: buildJapaneseTranquilityScenery,
  brazilian_favela: buildBrazilianFavelaScenery,
  cyberpunk_neon: buildCyberpunkNeonScenery,
  eiffel_tower: buildEiffelTowerScenery,
  switzerland_hilltop: buildSwitzerlandHilltopScenery,
  mt_everest: buildMtEverestScenery,
};

const DIORAMA_BUILDERS: Record<SceneryId, SceneryDioramaBuilderFn> = {
  busy_street: buildBusyStreetDiorama,
  mayon_volcano: buildMayonVolcanoDiorama,
  hilltop_city_lights: buildHilltopCityLightsDiorama,
  japanese_tranquility: buildJapaneseTranquilityDiorama,
  brazilian_favela: buildBrazilianFavelaDiorama,
  cyberpunk_neon: buildCyberpunkNeonDiorama,
  eiffel_tower: buildEiffelTowerDiorama,
  switzerland_hilltop: buildSwitzerlandHilltopDiorama,
  mt_everest: buildMtEverestDiorama,
};

export function buildMiniSceneryDiorama(sceneryId: SceneryId): THREE.Group {
  const builder = DIORAMA_BUILDERS[sceneryId] || DIORAMA_BUILDERS.busy_street;
  return builder();
}

/**
 * Performance-hardened SceneryManager:
 * - Swaps the 9 outdoor backdrops inside `outdoorSceneryRoot`, disposing all GPU resources cleanly.
 * - Enforces zero outdoor shadow casting/receiving and zero realtime PointLight/SpotLights.
 * - Strictly culls `outdoorOnlyGroup` & unseen flanking/valley subtrees when the player is indoors,
 *   and bypasses per-frame outdoor animation loops while brewing coffee inside the cafe.
 */
export class SceneryManager {
  public readonly container: THREE.Group;
  private current: SceneryRuntimeInstance | null = null;
  private activeId: SceneryId | null = null;
  private isPlayerOutside = false;
  private lastIndoorEnvSignature = '';

  constructor(parentScene: THREE.Scene) {
    this.container = new THREE.Group();
    this.container.name = 'outdoor_scenery_root';
    parentScene.add(this.container);
  }

  public getActiveSceneryId(): SceneryId {
    return this.activeId || 'busy_street';
  }

  public getEnvironmentHint(): SceneryEnvironmentHint {
    return this.current?.envHint || {};
  }

  public getActiveDoorways(): readonly AnimatedDoorwayAnchor[] {
    return this.current?.doorways ?? [];
  }

  public setPlayerOutside(isOutside: boolean): void {
    this.isPlayerOutside = isOutside;
    this.applyVisibilitySplit();
  }

  private applyVisibilitySplit(): void {
    if (!this.current) return;
    if (this.current.outdoorOnlyGroup) {
      this.current.outdoorOnlyGroup.visible = this.isPlayerOutside;
    }
    if (this.current.windowBackdropGroup) {
      this.current.windowBackdropGroup.visible = true;
    }
    applyIndoorBackdropCullFilter(this.current.root, this.isPlayerOutside);
  }

  public loadScenery(sceneryId: SceneryId): boolean {
    if (this.activeId === sceneryId && this.current) {
      return false;
    }
    this.unloadCurrent();

    const builder = SCENERY_BUILDERS[sceneryId] || SCENERY_BUILDERS.busy_street;
    const instance = builder();
    if (instance.windowBackdropGroup) {
      instance.windowBackdropGroup.userData.alwaysVisibleBackdrop = true;
    }
    if (instance.outdoorOnlyGroup) {
      instance.outdoorOnlyGroup.userData.outdoorOnly = true;
    }
    stripRealtimeOutdoorLights(instance.root);
    disableShadowsRecursive(instance.root);
    batchStaticMeshesByMaterial(instance.root);
    this.container.add(instance.root);
    this.current = instance;
    this.activeId = sceneryId;
    this.lastIndoorEnvSignature = '';
    this.applyVisibilitySplit();
    return true;
  }

  public update(
    dt: number,
    elapsed: number,
    isNight: boolean,
    climateState: ClimateState,
    weather: WeatherMode,
    isPlayerOutside?: boolean
  ): void {
    if (typeof isPlayerOutside === 'boolean' && isPlayerOutside !== this.isPlayerOutside) {
      this.setPlayerOutside(isPlayerOutside);
    }
    if (!this.current?.update) return;

    // Hard Indoor Cull: when inside the cafe, bypass per-frame outdoor animation loops completely.
    // Only invoke a single sync tick when night/climate/weather state changes so window-visible silhouettes stay tinted.
    if (!this.isPlayerOutside) {
      const envSig = `${isNight ? 1 : 0}|${climateState}|${weather}`;
      if (envSig === this.lastIndoorEnvSignature) return;
      this.lastIndoorEnvSignature = envSig;
      this.current.update(0, elapsed, isNight, climateState, weather, false);
      return;
    }

    this.lastIndoorEnvSignature = '';
    this.current.update(dt, elapsed, isNight, climateState, weather, true);
  }

  private unloadCurrent(): void {
    if (!this.current) return;
    this.container.remove(this.current.root);
    disposeObject3D(this.current.root);
    this.current = null;
    this.activeId = null;
    this.lastIndoorEnvSignature = '';
  }

  public dispose(): void {
    this.unloadCurrent();
    if (this.container.parent) {
      this.container.parent.remove(this.container);
    }
  }
}
