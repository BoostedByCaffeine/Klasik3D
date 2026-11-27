export interface RawViewportMetrics {
  innerWidth?: number;
  innerHeight?: number;
  clientWidth?: number;
  clientHeight?: number;
  visualViewportWidth?: number;
  visualViewportHeight?: number;
  visualViewportOffsetTop?: number;
  visualViewportOffsetLeft?: number;
}

export interface ResolvedIosViewport {
  /** Actual visible CSS pixel width of the browser viewport (respects iOS Safari chrome). */
  vw: number;
  /** Actual visible CSS pixel height of the browser viewport (respects iOS Safari chrome). */
  vh: number;
  /** Visual viewport top offset (non-zero on iOS Safari during toolbar/pinch transitions). */
  offsetTop: number;
  /** Visual viewport left offset (non-zero on iOS Safari during toolbar/pinch transitions). */
  offsetLeft: number;
  /** True when physical device orientation is portrait (rotated 90deg into landscape stage). */
  isPortraitRotated: boolean;
  /** Effective landscape canvas width (swapped with vh when portrait-rotated). */
  effectiveWidth: number;
  /** Effective landscape canvas height (swapped with vw when portrait-rotated). */
  effectiveHeight: number;
}

function positiveFinite(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function finiteOrZero(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Resolves the exact visible viewport dimensions for desktop, Android, and iOS Safari.
 * Prioritizes `window.visualViewport` over `window.innerHeight` / `clientHeight` so iOS Safari's
 * dynamic address bar and bottom toolbar never oversize the root container or clip canvas edges.
 */
export function resolveIosSafariViewport(metrics: RawViewportMetrics): ResolvedIosViewport {
  const vvW = positiveFinite(metrics.visualViewportWidth);
  const vvH = positiveFinite(metrics.visualViewportHeight);
  const inW = positiveFinite(metrics.innerWidth);
  const inH = positiveFinite(metrics.innerHeight);
  const clW = positiveFinite(metrics.clientWidth);
  const clH = positiveFinite(metrics.clientHeight);

  // Prefer visualViewport when present; otherwise fall back to clientWidth/innerWidth
  const rawW = vvW || clW || inW || 1;
  const rawH = vvH || clH || inH || 1;

  // Guard against Safari temporarily reporting an innerHeight larger than visualViewport:
  // when both exist, visualViewport is always the true visible region.
  const vw = Math.max(1, Math.round(rawW));
  const vh = Math.max(1, Math.round(rawH));

  const offsetTop = Math.max(0, Math.round(finiteOrZero(metrics.visualViewportOffsetTop)));
  const offsetLeft = Math.max(0, Math.round(finiteOrZero(metrics.visualViewportOffsetLeft)));

  const isPortraitRotated = vh > vw;
  const effectiveWidth = isPortraitRotated ? vh : vw;
  const effectiveHeight = isPortraitRotated ? vw : vh;

  return {
    vw,
    vh,
    offsetTop,
    offsetLeft,
    isPortraitRotated,
    effectiveWidth,
    effectiveHeight,
  };
}

/**
 * Reads live browser viewport metrics safely (returns sensible desktop defaults in headless/SSR).
 */
export function readWindowIosViewport(): ResolvedIosViewport {
  if (typeof window === 'undefined') {
    return {
      vw: 1280,
      vh: 720,
      offsetTop: 0,
      offsetLeft: 0,
      isPortraitRotated: false,
      effectiveWidth: 1280,
      effectiveHeight: 720,
    };
  }
  const vv = window.visualViewport;
  return resolveIosSafariViewport({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientWidth: document.documentElement?.clientWidth,
    clientHeight: document.documentElement?.clientHeight,
    visualViewportWidth: vv?.width,
    visualViewportHeight: vv?.height,
    visualViewportOffsetTop: vv?.offsetTop,
    visualViewportOffsetLeft: vv?.offsetLeft,
  });
}

/**
 * Maps a pointer/touch event coordinate into WebGL normalized device coordinates [-1, 1],
 * staying accurate on both native landscape and iOS portrait-rotated 90deg containers.
 */
export function mapPointerToViewportNdc(params: {
  clientX: number;
  clientY: number;
  viewport: ResolvedIosViewport;
  canvasRect?: { left: number; top: number; width: number; height: number } | null;
}): { x: number; y: number } {
  const { clientX, clientY, viewport, canvasRect } = params;
  if (viewport.isPortraitRotated) {
    const relX = clientX - viewport.offsetLeft;
    const relY = clientY - viewport.offsetTop;
    // Stage is rotated +90deg around top-left and shifted right by vw:
    // landscape X runs downward along physical Y, landscape Y runs right-to-left along physical X.
    const localX = relY;
    const localY = viewport.vw - relX;
    return {
      x: (localX / Math.max(1, viewport.vh)) * 2 - 1,
      y: -(localY / Math.max(1, viewport.vw)) * 2 + 1,
    };
  }

  const left = canvasRect?.left ?? viewport.offsetLeft;
  const top = canvasRect?.top ?? viewport.offsetTop;
  const width = Math.max(1, canvasRect?.width || viewport.vw);
  const height = Math.max(1, canvasRect?.height || viewport.vh);
  return {
    x: ((clientX - left) / width) * 2 - 1,
    y: -((clientY - top) / height) * 2 + 1,
  };
}

/**
 * Slightly widens vertical FOV on narrow-aspect (iPad/4:3) or ultrawide iPhone Safari landscape
 * viewports so key foreground barista tools and storefront framing never clip off-screen.
 */
export function computeAdaptiveCameraFov(baseFov: number, aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return baseFov;
  // Standard 16:9 (~1.778) keeps exact baseFov.
  // Narrower screens (< 1.55, e.g., iPad landscape 4:3) widen FOV smoothly so horizontal counter fits.
  if (aspect < 1.55) {
    const narrowFactor = Math.min(1, (1.55 - aspect) / 0.45);
    return baseFov + narrowFactor * 7.5;
  }
  // Ultrawide iPhones in landscape (> 2.0, e.g. 2.16:1 with Safari toolbar) gently widen vertical FOV by up to +3.5deg
  if (aspect > 2.0) {
    const wideFactor = Math.min(1, (aspect - 2.0) / 0.45);
    return baseFov + wideFactor * 3.5;
  }
  return baseFov;
}
