import * as THREE from 'three';
import { disposeObject3D } from './sceneries/sceneryTypes';

export interface ThumbnailStudioOptions {
  cameraPos?: [number, number, number];
  lookAt?: [number, number, number];
  scaleFill?: number;
}

/**
 * Phase 7: Single-Context Offscreen 3D Snapshot Renderer (`ThumbnailStudio`)
 * CRITICAL MOBILE RULE: Never allocates a second WebGLRenderer or WebGL context.
 * Uses ONE shared 256×256 WebGLRenderTarget on the main renderer, renders 1 frame lazily,
 * caches the PNG dataURL in memory, and immediately disposes temporary staging geometry/materials.
 */
export class ThumbnailStudio {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly size: number;
  private readonly cache = new Map<string, string>();
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderTarget: THREE.WebGLRenderTarget;
  private readonly pixelBuffer: Uint8Array;
  private readonly tempCanvas: HTMLCanvasElement;
  private readonly tempCtx: CanvasRenderingContext2D | null;

  constructor(mainRenderer: THREE.WebGLRenderer, size = 256) {
    this.renderer = mainRenderer;
    this.size = size;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    this.camera.position.set(2.1, 1.65, 2.35);
    this.camera.lookAt(0, 0, 0);

    // Clean neutral-white + cool silver rim 3-point studio lighting for monochrome obsidian cards
    this.scene.add(new THREE.HemisphereLight(0xf8fafc, 0x18181b, 1.28));
    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.42);
    keyLight.position.set(3, 5, 4);
    this.scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xcbd5e1, 0.62);
    rimLight.position.set(-3.5, 2.5, -3);
    this.scene.add(rimLight);

    this.renderTarget = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      colorSpace: THREE.SRGBColorSpace,
    });
    this.pixelBuffer = new Uint8Array(size * size * 4);
    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = size;
    this.tempCanvas.height = size;
    this.tempCtx = this.tempCanvas.getContext('2d');
  }

  public getThumbnail(
    cacheKey: string,
    buildMeshFn: () => THREE.Object3D | null,
    options: ThumbnailStudioOptions = {}
  ): string {
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached;
    if (!this.tempCtx) return '';

    const subject = buildMeshFn();
    if (!subject) return '';

    const pivot = new THREE.Group();
    pivot.add(subject);

    // Auto-frame subject cleanly inside the studio viewport
    const box = new THREE.Box3().setFromObject(subject);
    const center = box.getCenter(new THREE.Vector3());
    const sizeVec = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z, 0.001);
    const scale = (options.scaleFill ?? 1.42) / maxDim;
    subject.scale.multiplyScalar(scale);
    subject.position.sub(center.multiplyScalar(scale));

    this.scene.add(pivot);
    if (options.cameraPos) {
      this.camera.position.set(options.cameraPos[0], options.cameraPos[1], options.cameraPos[2]);
    } else {
      this.camera.position.set(2.05, 1.55, 2.35);
    }
    if (options.lookAt) {
      this.camera.lookAt(options.lookAt[0], options.lookAt[1], options.lookAt[2]);
    } else {
      this.camera.lookAt(0, 0, 0);
    }

    // Render 1 frame to offscreen target without disturbing main canvas
    const prevTarget = this.renderer.getRenderTarget();
    const prevClearColor = new THREE.Color();
    this.renderer.getClearColor(prevClearColor);
    const prevClearAlpha = this.renderer.getClearAlpha();
    const prevShadowEnabled = this.renderer.shadowMap.enabled;

    this.renderer.shadowMap.enabled = false;
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.setClearColor(0x09090b, 0);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.readRenderTargetPixels(
      this.renderTarget,
      0,
      0,
      this.size,
      this.size,
      this.pixelBuffer
    );

    // Restore main renderer state cleanly
    this.renderer.setRenderTarget(prevTarget);
    this.renderer.setClearColor(prevClearColor, prevClearAlpha);
    this.renderer.shadowMap.enabled = prevShadowEnabled;

    // Flip Y & encode PNG dataURL
    const imgData = this.tempCtx.createImageData(this.size, this.size);
    const rowBytes = this.size * 4;
    for (let y = 0; y < this.size; y++) {
      const srcRow = (this.size - 1 - y) * rowBytes;
      const dstRow = y * rowBytes;
      imgData.data.set(this.pixelBuffer.subarray(srcRow, srcRow + rowBytes), dstRow);
    }
    this.tempCtx.putImageData(imgData, 0, 0);
    const dataUrl = this.tempCanvas.toDataURL('image/png');

    // Immediately dispose temporary staging geometry & materials
    this.scene.remove(pivot);
    disposeObject3D(pivot);

    this.cache.set(cacheKey, dataUrl);
    return dataUrl;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public dispose(): void {
    this.cache.clear();
    this.renderTarget.dispose();
  }
}
