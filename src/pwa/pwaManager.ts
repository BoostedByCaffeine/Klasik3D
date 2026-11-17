import { STUDIO_LOGO_SVG_RAW } from '../components/StudioLogo';

export type AppRuntimeVersion = 'web' | 'pwa' | 'apk';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PwaEnvironmentStatus {
  appVersion: AppRuntimeVersion;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isInstallable: boolean;
  isLandscape: boolean;
  swRegistered: boolean;
  isOffline: boolean;
}

const PLATFORM_OVERRIDE_KEY = 'klasik3d_platform_override';

export function resolveRuntimeVersionFromHints(hints: {
  queryPlatform?: string | null;
  storedOverride?: string | null;
  envPlatform?: string | null;
  isCapacitorNative?: boolean;
  protocol?: string;
  userAgent?: string;
  isStandaloneDisplay?: boolean;
}): AppRuntimeVersion {
  const qp = (hints.queryPlatform || '').toLowerCase();
  if (qp === 'apk' || qp === 'pwa' || qp === 'web') {
    return qp;
  }

  const stored = (hints.storedOverride || '').toLowerCase();
  if (stored === 'apk' || stored === 'pwa' || stored === 'web') {
    return stored;
  }

  const envPlat = (hints.envPlatform || '').toLowerCase();
  if (envPlat === 'apk') {
    return 'apk';
  }

  const proto = (hints.protocol || '').toLowerCase();
  const ua = (hints.userAgent || '').toLowerCase();
  if (
    hints.isCapacitorNative ||
    proto === 'capacitor:' ||
    proto === 'file:' ||
    /; wv\)|klasik3d-apk/.test(ua)
  ) {
    return 'apk';
  }

  if (hints.isStandaloneDisplay) {
    return 'pwa';
  }

  return 'web';
}

class PwaManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private listeners: Set<(status: PwaEnvironmentStatus) => void> = new Set();
  private swRegistered = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Persist ?platform=apk|pwa|web if explicitly passed in URL query string
    try {
      const params = new URLSearchParams(window.location.search);
      const qPlat = params.get('platform')?.toLowerCase();
      if (qPlat === 'apk' || qPlat === 'pwa' || qPlat === 'web') {
        window.localStorage.setItem(PLATFORM_OVERRIDE_KEY, qPlat);
      }
    } catch {
      // ignore storage errors
    }

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.notify();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.notify();
    });

    window.addEventListener('resize', () => {
      this.notify();
    });

    window.addEventListener('online', () => {
      this.notify();
    });

    window.addEventListener('offline', () => {
      this.notify();
    });

    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => {
            this.swRegistered = true;
            reg.update().catch(() => {});
            this.notify();
          })
          .catch(() => {
            this.swRegistered = false;
          });
      }
    } catch {
      this.swRegistered = false;
    }
  }

  public setPlatformOverride(version: AppRuntimeVersion | null) {
    if (typeof window === 'undefined') return;
    try {
      if (!version) {
        window.localStorage.removeItem(PLATFORM_OVERRIDE_KEY);
      } else {
        window.localStorage.setItem(PLATFORM_OVERRIDE_KEY, version);
      }
    } catch {
      // ignore
    }
    this.notify();
  }

  public getStatus(): PwaEnvironmentStatus {
    if (typeof window === 'undefined') {
      return {
        appVersion: 'web',
        isStandalone: false,
        isIOS: false,
        isAndroid: false,
        isInstallable: false,
        isLandscape: true,
        swRegistered: false,
        isOffline: false,
      };
    }

    const isStandaloneDisplay =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isLandscape = window.innerWidth >= window.innerHeight;
    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

    const cap = (
      window as unknown as {
        Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
      }
    ).Capacitor;
    const isCapacitorNative = Boolean(
      cap?.isNativePlatform?.() || cap?.getPlatform?.() === 'android'
    );

    let queryPlatform: string | null = null;
    let storedOverride: string | null = null;
    try {
      queryPlatform = new URLSearchParams(window.location.search).get('platform');
      storedOverride = window.localStorage.getItem(PLATFORM_OVERRIDE_KEY);
    } catch {
      // ignore
    }

    const appVersion = resolveRuntimeVersionFromHints({
      queryPlatform,
      storedOverride,
      envPlatform: (import.meta.env.VITE_APP_PLATFORM as string) || null,
      isCapacitorNative,
      protocol: window.location.protocol,
      userAgent: ua,
      isStandaloneDisplay,
    });

    return {
      appVersion,
      isStandalone: isStandaloneDisplay || appVersion === 'apk' || appVersion === 'pwa',
      isIOS,
      isAndroid: isAndroid || appVersion === 'apk',
      isInstallable: Boolean(this.deferredPrompt),
      isLandscape,
      swRegistered: this.swRegistered,
      isOffline,
    };
  }

  public subscribe(listener: (status: PwaEnvironmentStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((cb) => cb(status));
  }

  public async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) {
      return 'unavailable';
    }
    await this.deferredPrompt.prompt();
    const choice = await this.deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      this.deferredPrompt = null;
      this.notify();
    }
    return choice.outcome;
  }

  public async lockLandscape(): Promise<boolean> {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      const orientation = screen.orientation as unknown as {
        lock?: (mode: string) => Promise<void>;
      };
      if (orientation && typeof orientation.lock === 'function') {
        await orientation.lock('landscape');
        return true;
      }
    } catch {
      // Orientation lock not supported in desktop browser or non-fullscreen iframe
    }
    return false;
  }

  public async generatePngIconDataUrl(size: number, maskable = false): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      ctx.fillStyle = '#1c1410';
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = Math.max(4, size * 0.02);
      const inset = maskable ? size * 0.14 : size * 0.06;
      ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);

      const img = new Image();
      const svgBlob = new Blob([STUDIO_LOGO_SVG_RAW], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const pad = maskable ? size * 0.18 : size * 0.1;
        const targetW = size - pad * 2;
        const targetH = targetW * (188 / 644);
        const y = (size - targetH) / 2;
        ctx.drawImage(img, pad, y, targetW, targetH);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = url;
    });
  }
}

export const pwaManager = new PwaManager();
