import * as THREE from 'three';
import { ClimateState, SceneryId } from '../sceneryData';
import type { WeatherMode } from '../rules';
import {
  SceneryBuilderFn,
  SceneryDioramaBuilderFn,
  SceneryEnvironmentHint,
  SceneryRuntimeInstance,
  disposeObject3D,
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
 * Phase 1 SceneryManager:
 * Swaps the 9 outdoor backdrops cleanly inside `outdoorSceneryRoot`, recursively disposing
 * all previous geometries, materials, and owned textures on every location change.
 */
export class SceneryManager {
  public readonly container: THREE.Group;
  private current: SceneryRuntimeInstance | null = null;
  private activeId: SceneryId | null = null;

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

  public loadScenery(sceneryId: SceneryId): boolean {
    if (this.activeId === sceneryId && this.current) {
      return false;
    }
    this.unloadCurrent();

    const builder = SCENERY_BUILDERS[sceneryId] || SCENERY_BUILDERS.busy_street;
    const instance = builder();
    this.container.add(instance.root);
    this.current = instance;
    this.activeId = sceneryId;
    return true;
  }

  public update(
    dt: number,
    elapsed: number,
    isNight: boolean,
    climateState: ClimateState,
    weather: WeatherMode
  ): void {
    if (this.current?.update) {
      this.current.update(dt, elapsed, isNight, climateState, weather);
    }
  }

  private unloadCurrent(): void {
    if (!this.current) return;
    this.container.remove(this.current.root);
    disposeObject3D(this.current.root);
    this.current = null;
    this.activeId = null;
  }

  public dispose(): void {
    this.unloadCurrent();
    if (this.container.parent) {
      this.container.parent.remove(this.container);
    }
  }
}
