import { STUDIO_LOGO_SVG_RAW } from '../components/StudioLogo';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PwaEnvironmentStatus {
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isInstallable: boolean;
  isLandscape: boolean;
  swRegistered: boolean;
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

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./sw.js')
        .then(() => {
          this.swRegistered = true;
          this.notify();
        })
        .catch(() => {
          this.swRegistered = false;
        });
    }
  }

  public getStatus(): PwaEnvironmentStatus {
    if (typeof window === 'undefined') {
      return {
        isStandalone: false,
        isIOS: false,
        isAndroid: false,
        isInstallable: false,
        isLandscape: true,
        swRegistered: false,
      };
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isLandscape = window.innerWidth >= window.innerHeight;

    return {
      isStandalone,
      isIOS,
      isAndroid,
      isInstallable: Boolean(this.deferredPrompt),
      isLandscape,
      swRegistered: this.swRegistered,
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

      // Warm espresso background
      ctx.fillStyle = '#1c1410';
      ctx.fillRect(0, 0, size, size);

      // Subtle inner brass ring
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
