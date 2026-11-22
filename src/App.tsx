import { useCallback, useEffect, useRef, useState } from 'react';
import { BizUpgradesModal, UpgradesHubTab } from './components/BizUpgradesModal';
import { CatStationActionMode, CatStationOverlay } from './components/CatStationOverlay';
import { CodeExportModal } from './components/CodeExportModal';
import { CustomizeModal } from './components/CustomizeModal';
import { HudOverlay } from './components/HudOverlay';
import { LandscapeIntroGate } from './components/LandscapeIntroGate';
import { LoadingScreen } from './components/LoadingScreen';
import { OutdoorOverlookOverlay } from './components/OutdoorOverlookOverlay';
import { PwaApkModal } from './components/PwaApkModal';
import { RecipeMenuModal } from './components/RecipeMenuModal';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import { UnifiedAudioModal } from './components/UnifiedAudioModal';
import { OutdoorVantageKey } from './game/OutdoorOverlookController';
import {
  ActiveStepAction,
  BaristaStationId,
  BaristaStepActionType,
  CafeCatId,
  CatCosmeticId,
  DecorCustomization,
  GameMode,
  GraphicsQuality,
  KlasikGameState,
  PastryId,
  PatronOutfitId,
  PatronOutfitMode,
  RECIPES,
  RainPreference,
  SceneryId,
  SyrupFlavor,
  TimeOfDayMode,
  acceptCustomerOrder,
  advanceSimulationTick,
  applyWeatherPreferences,
  claimLoginReward,
  createActiveStepLock,
  createInitialGameState,
  equipCatCosmetic,
  equipManualPatronOutfit,
  formatLocalClock,
  getCafeCatSpec,
  getCatCosmeticSpec,
  getEffectiveRecipeForOrder,
  getNextRecommendedStep,
  getOrderVesselType,
  getPastryById,
  getRecipeById,
  getScenerySpec,
  getStepDurationMs,
  isStepLockActive,
  loadGameFromStorage,
  loadSavedGraphicsQuality,
  markCustomerAtCounter,
  performCupAction,
  preparePastry,
  purchaseCatCosmetic,
  purchaseOrEquipCafeCat,
  purchaseOrEquipScenery,
  purchasePatronOutfit,
  purchaseUpgrade,
  returnPreparedPastry,
  rollAutoRain,
  saveGameToStorage,
  saveGraphicsQuality,
  serveCurrentCupToCustomer,
  setPatronOutfitAutoMatch,
  setPatronOutfitMode,
  startNextDayShift,
  syncDailyQuotaForDate,
  toggleCustomPatronOutfit,
  unlockAllEverythingCheat,
  unlockOrEquipCustomerSkinPack,
  unlockOrEquipEquipmentSkin,
} from './game/rules';
import {
  musicPlayerController,
  MusicPlayerSnapshot,
} from './game/audio/MusicPlayerController';
import { KlasikCafeScene3D, StepAnimType } from './game/scene3d';
import { triggerBaristaHaptic, triggerChampyPurrHaptic } from './game/haptics';
import { soundEngine } from './game/sound';
import { spotifyManager, SpotifyVinylState } from './game/spotifyManager';
import { pwaManager, PwaEnvironmentStatus, shouldShowLandscapeCue } from './pwa/pwaManager';

type ActiveModal =
  | null
  | 'recipes'
  | 'upgrades'
  | 'customize'
  | 'spotify'
  | 'pwa'
  | 'export';

export default function App() {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [bootStage, setBootStage] = useState<'landscape-cue' | 'studio-splash' | 'ready'>(() => {
    if (isAutostart) return 'ready';
    return shouldShowLandscapeCue() ? 'landscape-cue' : 'studio-splash';
  });
  const [splashEntranceDone, setSplashEntranceDone] = useState<boolean>(isAutostart);
  const [splashFadingOut, setSplashFadingOut] = useState<boolean>(isAutostart);
  const isLoading = bootStage !== 'ready';
  const [isSceneReady, setIsSceneReady] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [isPortraitRotated, setIsPortraitRotated] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );
  const [gameState, setGameState] = useState<KlasikGameState>(() => {
    const now = new Date();
    const saved = loadGameFromStorage();
    const base = saved || createInitialGameState();
    const syncedQuota = syncDailyQuotaForDate(base, now);
    const syncedWeather = applyWeatherPreferences(
      syncedQuota,
      syncedQuota.timeOfDayMode || 'auto',
      syncedQuota.rainPreference || 'auto',
      now
    );
    // Fresh launch defaults to 'low'; explicit user selections persist via STORAGE_GFX_KEY
    const savedGfx = loadSavedGraphicsQuality();
    const withGfx: KlasikGameState = {
      ...syncedWeather,
      graphicsQuality: savedGfx,
      activeStepLock: null,
    };
    if (isAutostart) {
      return { ...withGfx, phase: 'playing', activeStation: 3 };
    }
    return { ...withGfx, phase: 'title' };
  });
  const [liveClockLabel, setLiveClockLabel] = useState<string>(() => formatLocalClock());

  const [spotifyState, setSpotifyState] = useState<SpotifyVinylState>(() =>
    spotifyManager.getState()
  );
  const [audioSnapshot, setAudioSnapshot] = useState<MusicPlayerSnapshot>(() =>
    musicPlayerController.getSnapshot()
  );
  const [pwaStatus, setPwaStatus] = useState<PwaEnvironmentStatus>(() =>
    pwaManager.getStatus()
  );
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [upgradesInitialTab, setUpgradesInitialTab] = useState<UpgradesHubTab>('upgrades');
  const [catStationOpen, setCatStationOpen] = useState<boolean>(false);
  const [catStationMode, setCatStationMode] = useState<CatStationActionMode>('pet');
  const [catStationCustomizeOpen, setCatStationCustomizeOpen] = useState<boolean>(false);
  const [outdoorOverlookOpen, setOutdoorOverlookOpen] = useState<boolean>(false);
  const [outdoorVantage, setOutdoorVantage] = useState<OutdoorVantageKey>('porch');
  const [sceneryFadeVisible, setSceneryFadeVisible] = useState<boolean>(false);
  const [isEnteringCafe, setIsEnteringCafe] = useState<boolean>(false);
  const [hasUnseenCatUnlock, setHasUnseenCatUnlock] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hoveredToolLabel, setHoveredToolLabel] = useState<string | null>(null);
  const [activeAnimLabel, setActiveAnimLabel] = useState<string | null>(null);
  const [stepProgress, setStepProgress] = useState<number | null>(null);
  const [stepDurationMs, setStepDurationMs] = useState<number | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [hudPinnedRecipeId, setHudPinnedRecipeId] = useState<string | null>(null);
  const [hudPinnedOrderId, setHudPinnedOrderId] = useState<string | null>(null);
  const [isPinnedRecipeMinimized, setIsPinnedRecipeMinimized] = useState<boolean>(false);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<KlasikCafeScene3D | null>(null);
  const animTimerRef = useRef<number | null>(null);
  const stepCommitTimerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const enterGlideFallbackRef = useRef<number | null>(null);
  const stepLockUntilRef = useRef<number>(0);
  const isEnteringCafeRef = useRef<boolean>(isEnteringCafe);
  isEnteringCafeRef.current = isEnteringCafe;
  const activeModalRef = useRef<ActiveModal>(activeModal);
  activeModalRef.current = activeModal;
  const catStationOpenRef = useRef<boolean>(catStationOpen);
  catStationOpenRef.current = catStationOpen;
  const outdoorOverlookOpenRef = useRef<boolean>(outdoorOverlookOpen);
  outdoorOverlookOpenRef.current = outdoorOverlookOpen;
  const lastExpiredSeqRef = useRef<number>(gameState.lastExpiredEventSeq ?? 0);
  const lastCatUnlockSeqRef = useRef<number>(gameState.lastCatUnlockSeq ?? 0);
  const prevCatCountRef = useRef<number>(gameState.unlockedCats?.length ?? 1);
  const prevCosmeticCountRef = useRef<number>(gameState.unlockedCosmetics?.length ?? 0);
  const prevHadTisayRef = useRef<boolean>(Boolean(gameState.unlockedCats?.includes('tisay')));
  const champyPetCountRef = useRef<number>(0);
  const gameStateRef = useRef<KlasikGameState>(gameState);
  gameStateRef.current = gameState;

  // Enforce strict Landscape Viewport detection & sync CSS full-bleed dimensions across all devices
  useEffect(() => {
    const checkOrientation = () => {
      const vw = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
      const vh = Math.max(
        window.innerHeight || 0,
        document.documentElement.clientHeight || 0,
        window.visualViewport?.height || 0
      );
      document.documentElement.style.setProperty('--app-vw', `${vw}px`);
      document.documentElement.style.setProperty('--app-vh', `${vh}px`);
      setIsPortraitRotated(vh > vw);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    window.visualViewport?.addEventListener('resize', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.visualViewport?.removeEventListener('resize', checkOrientation);
    };
  }, []);

  // Mirror phase, appVersion & graphics quality (for low-fx & capacitor-apk backdrop-filter bypass)
  useEffect(() => {
    document.body.dataset.state = gameState.phase;
    document.body.dataset.version = pwaStatus.appVersion;
    document.documentElement.dataset.gfx = gameState.graphicsQuality;
    const isLowFx = gameState.graphicsQuality === 'low';
    const isCapacitorApk =
      pwaStatus.appVersion === 'apk' ||
      window.location.protocol === 'capacitor:' ||
      Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) ||
      Boolean(window.KlasikNativeAudio);
    document.body.classList.toggle('low-fx', isLowFx);
    document.body.classList.toggle('capacitor-apk', isCapacitorApk && gameState.graphicsQuality !== 'max');
    saveGameToStorage(gameState);
  }, [gameState, pwaStatus.appVersion]);

  // Sync Diegetic 3D POS Camera Focus when Recipe Book opens or closes
  useEffect(() => {
    sceneRef.current?.setCodexFocusMode(activeModal === 'recipes');
  }, [activeModal]);

  // Sync HUD pinned recipe back to 3D hanging tickets (emerald pinned glow)
  useEffect(() => {
    sceneRef.current?.setHudPinnedRecipeId(hudPinnedRecipeId);
  }, [hudPinnedRecipeId, isSceneReady]);

  // Auto-unpin linked ticket recipe when that customer order is served or expires
  useEffect(() => {
    if (!hudPinnedOrderId) return;
    const stillOrdering = gameState.customers.some(
      (c) => c.id === hudPinnedOrderId && c.state === 'ordering'
    );
    if (!stillOrdering) {
      setHudPinnedOrderId(null);
      setHudPinnedRecipeId(null);
      setIsPinnedRecipeMinimized(false);
    }
  }, [gameState.customers, hudPinnedOrderId]);

  // Clean up any pending timed step & transition timers on unmount
  useEffect(() => {
    return () => {
      if (animTimerRef.current) window.clearTimeout(animTimerRef.current);
      if (stepCommitTimerRef.current) window.clearTimeout(stepCommitTimerRef.current);
      if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      if (enterGlideFallbackRef.current) window.clearTimeout(enterGlideFallbackRef.current);
      musicPlayerController.setOutdoorMuffle(false);
      soundEngine.setOutdoorAmbienceBoost(false);
    };
  }, []);

  // Real-time 24h device clock sync (30s interval): updates clock readout, local-midnight quota reset, and Auto time-of-day sky
  useEffect(() => {
    const syncClockAndWorld = () => {
      const now = new Date();
      setLiveClockLabel(formatLocalClock(now));
      setGameState((prev) => {
        const afterQuota = syncDailyQuotaForDate(prev, now);
        if (afterQuota.timeOfDayMode === 'auto') {
          const afterWeather = applyWeatherPreferences(
            afterQuota,
            afterQuota.timeOfDayMode,
            afterQuota.rainPreference,
            now
          );
          if (afterWeather.weather !== prev.weather || afterQuota !== prev) {
            return afterWeather;
          }
        }
        return afterQuota;
      });
    };
    syncClockAndWorld();
    const clockInterval = window.setInterval(syncClockAndWorld, 30_000);
    // Periodic Auto-Rain roll every 8 minutes when Rain Preference is Auto
    const rainInterval = window.setInterval(() => {
      const now = new Date();
      setGameState((prev) => {
        if (prev.rainPreference !== 'auto') return prev;
        return applyWeatherPreferences(prev, prev.timeOfDayMode, prev.rainPreference, now, rollAutoRain());
      });
    }, 8 * 60_000);
    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(rainInterval);
    };
  }, []);

  // Subscribe to Unified MusicPlayerController, Spotify & PWA managers
  useEffect(() => {
    musicPlayerController.initOnBoot(gameStateRef.current.audioPreferences);

    const syncSceneAudio = (snap: MusicPlayerSnapshot) => {
      const scene = sceneRef.current;
      if (!scene) return;
      scene.setAudioMode(snap.mode);
      scene.setAudioPlaying(snap.isPlaying);
      const curTrack = snap.vinylTracks[snap.activeVinylIndex];
      scene.setByoVinylActive(Boolean(curTrack?.isCustom), curTrack?.labelColor);
      const stationIdx = snap.radioStations.findIndex((s) => s.id === snap.activeStationId);
      scene.setRadioFrequencyIndex(Math.max(0, stationIdx), snap.radioStations.length);
      scene.updateHologramMetadata({
        title: snap.externalMedia.title,
        artist: snap.externalMedia.artist,
        sourceApp: snap.externalMedia.sourceApp,
        isPlaying:
          snap.mode === 'external'
            ? snap.externalMedia.isPlaying || snap.isPlaying
            : snap.isPlaying,
      });
    };

    const unsubAudio = musicPlayerController.subscribe((snap) => {
      setAudioSnapshot(snap);
      syncSceneAudio(snap);
      const persisted = musicPlayerController.getPersistedPreferences();
      setGameState((prev) => {
        const cur = prev.audioPreferences;
        if (
          cur &&
          cur.mode === persisted.mode &&
          cur.lastVinylTrackId === persisted.lastVinylTrackId &&
          cur.lastRadioStationId === persisted.lastRadioStationId &&
          cur.musicVolume === persisted.musicVolume &&
          cur.ambienceVolume === persisted.ambienceVolume &&
          cur.vinylCrackle === persisted.vinylCrackle
        ) {
          return prev;
        }
        return { ...prev, audioPreferences: persisted };
      });
    });

    // Phase 0.3: Clear any legacy floating Spotify iframe visibility flag in localStorage on boot
    spotifyManager.setShowMiniEmbed(false);
    const unsubSpotify = spotifyManager.subscribe((nextSpotify) => {
      setSpotifyState(nextSpotify);
      sceneRef.current?.updateSpotifyState(nextSpotify);
    });
    const unsubPwa = pwaManager.subscribe((nextPwa) => {
      setPwaStatus(nextPwa);
    });

    return () => {
      unsubAudio();
      unsubSpotify();
      unsubPwa();
    };
  }, []);

  // Re-sync 3D Counter Audio Prop whenever the scene becomes ready
  useEffect(() => {
    if (!isSceneReady || !sceneRef.current) return;
    const snap = musicPlayerController.getSnapshot();
    sceneRef.current.setAudioMode(snap.mode);
    sceneRef.current.setAudioPlaying(snap.isPlaying);
    const curTrack = snap.vinylTracks[snap.activeVinylIndex];
    sceneRef.current.setByoVinylActive(Boolean(curTrack?.isCustom), curTrack?.labelColor);
    const stationIdx = snap.radioStations.findIndex((s) => s.id === snap.activeStationId);
    sceneRef.current.setRadioFrequencyIndex(Math.max(0, stationIdx), snap.radioStations.length);
    sceneRef.current.updateHologramMetadata({
      title: snap.externalMedia.title,
      artist: snap.externalMedia.artist,
      sourceApp: snap.externalMedia.sourceApp,
      isPlaying:
        snap.mode === 'external'
          ? snap.externalMedia.isPlaying || snap.isPlaying
          : snap.isPlaying,
    });
  }, [isSceneReady]);

  // Sync Phase 5 Cat Station camera & interactive tool mode to 3D scene
  useEffect(() => {
    sceneRef.current?.setCatStationState(
      catStationOpen,
      catStationMode,
      catStationCustomizeOpen
    );
  }, [catStationOpen, catStationMode, catStationCustomizeOpen, isSceneReady]);

  const clearStepTimers = useCallback(() => {
    if (animTimerRef.current) {
      window.clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    if (stepCommitTimerRef.current) {
      window.clearTimeout(stepCommitTimerRef.current);
      stepCommitTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const flashAnimBanner = useCallback(
    (label: string, durationMs = 1100, trackProgress = false) => {
      setActiveAnimLabel(label);
      if (animTimerRef.current) {
        window.clearTimeout(animTimerRef.current);
        animTimerRef.current = null;
      }
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      if (trackProgress) {
        setStepDurationMs(durationMs);
        setStepProgress(4);
        const start = performance.now();
        progressIntervalRef.current = window.setInterval(() => {
          const elapsed = performance.now() - start;
          const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
          setStepProgress(pct);
          if (pct >= 100 && progressIntervalRef.current) {
            window.clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }, 200);
      } else {
        setStepProgress(null);
        setStepDurationMs(null);
      }

      animTimerRef.current = window.setTimeout(() => {
        if (progressIntervalRef.current) {
          window.clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        animTimerRef.current = null;
        setActiveAnimLabel(null);
        setStepProgress(null);
        setStepDurationMs(null);
      }, durationMs);
    },
    []
  );

  // Handlers stored in refs/callbacks so Three.js scene never re-initializes
  const handleSelectStation = useCallback((station: BaristaStationId) => {
    soundEngine.playCeramicClink(0.9 + station * 0.05);
    sceneRef.current?.resetCameraOffsets();
    setGameState((prev) => ({
      ...prev,
      activeStation: station,
    }));
  }, []);

  const handleAcceptOrder = useCallback(
    (orderId: string) => {
      soundEngine.init();
      const target = gameStateRef.current.customers.find(
        (c) => c.id === orderId && c.state === 'ordering'
      );
      if (!target) return;
      if (!target.orderAccepted) {
        soundEngine.playOrderAcceptedChime();
        triggerBaristaHaptic('pin_ticket', pwaManager.getStatus().appVersion);
        const rec = getRecipeById(target.recipeId);
        setGameState((prev) => {
          const next = acceptCustomerOrder(prev, orderId);
          sceneRef.current?.updateGameState(next);
          return next;
        });
        flashAnimBanner(`Order accepted: ${target.customerName}'s ${rec.name}`, 1500, false);
      } else {
        setGameState((prev) => ({ ...prev, pinnedOrderId: orderId }));
      }
    },
    [flashAnimBanner]
  );

  const handleCookieJarTap = useCallback(
    (tapCount: number) => {
      soundEngine.init();
      soundEngine.playCookieJarClink(tapCount);
      triggerBaristaHaptic('pin_ticket', pwaManager.getStatus().appVersion);
      if (tapCount >= 7) {
        setGameState((prev) => {
          const unlocked = unlockAllEverythingCheat(prev);
          saveGameToStorage(unlocked);
          sceneRef.current?.updateGameState(unlocked);
          return unlocked;
        });
        flashAnimBanner('you got what you wanted, now enjoy', 4800, false);
      }
    },
    [flashAnimBanner]
  );

  const handlePurchaseOrEquipCafeCat = useCallback(
    (catId: CafeCatId) => {
      soundEngine.init();
      soundEngine.preloadChampyAudio();
      const prev = gameStateRef.current;
      const next = purchaseOrEquipCafeCat(prev, catId);
      if (next === prev) {
        soundEngine.playErrorThud();
        return;
      }
      if (next.cash < prev.cash) {
        soundEngine.playCashRegister();
      }
      soundEngine.playChampyMeow('chirp');
      setGameState(next);
      sceneRef.current?.updateGameState(next);
      flashAnimBanner(next.lastActionFeedback, 1900, false);
    },
    [flashAnimBanner]
  );

  const runEspressoFade = useCallback((midAction: () => void) => {
    if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    setSceneryFadeVisible(true);
    fadeTimerRef.current = window.setTimeout(() => {
      try {
        midAction();
      } finally {
        fadeTimerRef.current = window.setTimeout(() => {
          setSceneryFadeVisible(false);
          fadeTimerRef.current = null;
        }, 160);
      }
    }, 160);
  }, []);

  const handleEnterGoOutside = useCallback(() => {
    if (outdoorOverlookOpenRef.current) return;
    soundEngine.init();
    soundEngine.playDoorChime();
    setActiveModal(null);
    setCatStationCustomizeOpen(false);
    setCatStationOpen(false);
    runEspressoFade(() => {
      setOutdoorVantage('porch');
      setOutdoorOverlookOpen(true);
      sceneRef.current?.setOutdoorOverlookMode(true, 'porch');
      musicPlayerController.setOutdoorMuffle(true);
      soundEngine.setOutdoorAmbienceBoost(true);
    });
  }, [runEspressoFade]);

  const handleExitGoOutside = useCallback(() => {
    if (!outdoorOverlookOpenRef.current) return;
    soundEngine.init();
    soundEngine.playDoorChime();
    runEspressoFade(() => {
      setOutdoorOverlookOpen(false);
      sceneRef.current?.setOutdoorOverlookMode(false);
      musicPlayerController.setOutdoorMuffle(false);
      soundEngine.setOutdoorAmbienceBoost(false);
    });
  }, [runEspressoFade]);

  const handleSelectOutdoorVantage = useCallback((vantage: OutdoorVantageKey) => {
    const spec = getScenerySpec(gameStateRef.current.activeScenery);
    const resolvedVantage: OutdoorVantageKey =
      vantage === 'overlook' && !spec.hasScenicOverlook ? 'porch' : vantage;
    soundEngine.playCeramicClink(1.06);
    setOutdoorVantage(resolvedVantage);
    sceneRef.current?.setOutdoorVantage(resolvedVantage);
  }, []);

  const handlePurchaseOrEquipScenery = useCallback(
    (sceneryId: SceneryId) => {
      soundEngine.init();
      const prev = gameStateRef.current;
      const next = purchaseOrEquipScenery(prev, sceneryId);
      if (next === prev) {
        soundEngine.playErrorThud();
        return;
      }
      if (next.cash < prev.cash) {
        soundEngine.playCashRegister();
      } else {
        soundEngine.playCeramicClink(1.14);
      }
      const nextSpec = getScenerySpec(next.activeScenery);
      runEspressoFade(() => {
        setGameState(next);
        if (!nextSpec.hasScenicOverlook) {
          setOutdoorVantage((curr) => (curr === 'overlook' ? 'porch' : curr));
          if (outdoorOverlookOpenRef.current) {
            sceneRef.current?.setOutdoorVantage('porch');
          }
        }
        sceneRef.current?.updateGameState(next);
        soundEngine.setRainAmbience(next.phase === 'playing', next.weather);
      });
      flashAnimBanner(next.lastActionFeedback, 2300, false);
    },
    [flashAnimBanner, runEspressoFade]
  );

  const handlePurchasePatronOutfit = useCallback(
    (outfitId: PatronOutfitId) => {
      soundEngine.init();
      const prev = gameStateRef.current;
      const next = purchasePatronOutfit(prev, outfitId);
      if (next === prev) {
        soundEngine.playErrorThud();
        return;
      }
      soundEngine.playCashRegister();
      setGameState(next);
      sceneRef.current?.updateGameState(next);
      flashAnimBanner(next.lastActionFeedback, 2100, false);
    },
    [flashAnimBanner]
  );

  const handleSetPatronOutfitMode = useCallback(
    (mode: PatronOutfitMode) => {
      soundEngine.playCeramicClink(1.04);
      setGameState((prev) => {
        const next = setPatronOutfitMode(prev, mode);
        sceneRef.current?.updateGameState(next);
        return next;
      });
    },
    []
  );

  const handleEquipManualPatronOutfit = useCallback(
    (outfitId: PatronOutfitId | null) => {
      soundEngine.playCeramicClink(1.08);
      setGameState((prev) => {
        const next = equipManualPatronOutfit(prev, outfitId);
        sceneRef.current?.updateGameState(next);
        return next;
      });
    },
    []
  );

  const handleSetPatronOutfitAutoMatch = useCallback((autoMatch: boolean) => {
    soundEngine.playCeramicClink(1.04);
    setGameState((prev) => {
      const next = setPatronOutfitAutoMatch(prev, autoMatch);
      sceneRef.current?.updateGameState(next);
      return next;
    });
  }, []);

  const handleToggleCustomPatronOutfit = useCallback((outfitId: PatronOutfitId) => {
    soundEngine.playCeramicClink(1.08);
    setGameState((prev) => {
      const next = toggleCustomPatronOutfit(prev, outfitId);
      sceneRef.current?.updateGameState(next);
      return next;
    });
  }, []);

  const handleOpenCatStation = useCallback(() => {
    soundEngine.init();
    soundEngine.preloadChampyAudio();
    soundEngine.playCeramicClink(1.12);
    setActiveModal(null);
    if (outdoorOverlookOpenRef.current) {
      setOutdoorOverlookOpen(false);
      sceneRef.current?.setOutdoorOverlookMode(false);
      musicPlayerController.setOutdoorMuffle(false);
      soundEngine.setOutdoorAmbienceBoost(false);
    }
    setHasUnseenCatUnlock(false);
    setCatStationMode('pet');
    setCatStationCustomizeOpen(false);
    setCatStationOpen(true);
  }, []);

  const handleCloseCatStation = useCallback(() => {
    soundEngine.playCeramicClink(0.96);
    setCatStationCustomizeOpen(false);
    setCatStationOpen(false);
  }, []);

  const handlePurchaseCosmetic = useCallback(
    (cosmeticId: CatCosmeticId) => {
      soundEngine.init();
      const prev = gameStateRef.current;
      const next = purchaseCatCosmetic(prev, cosmeticId);
      if (next === prev) {
        soundEngine.playErrorThud();
        return;
      }
      soundEngine.playCashRegister();
      setGameState(next);
      sceneRef.current?.updateGameState(next);
      flashAnimBanner(next.lastActionFeedback, 2100, false);
    },
    [flashAnimBanner]
  );

  const handleToggleEquipCosmetic = useCallback(
    (catId: CafeCatId, cosmeticId: CatCosmeticId) => {
      soundEngine.init();
      soundEngine.playCeramicClink(1.16);
      setGameState((prev) => {
        const slot = getCatCosmeticSpec(cosmeticId).slot;
        const next = equipCatCosmetic(prev, catId, cosmeticId, slot);
        sceneRef.current?.updateGameState(next);
        return next;
      });
    },
    []
  );

  const handleReturnPreparedPastry = useCallback(() => {
    soundEngine.init();
    soundEngine.playPastryReturn();
    triggerBaristaHaptic('pin_ticket', pwaManager.getStatus().appVersion);
    setGameState((prev) => {
      const next = returnPreparedPastry(prev);
      sceneRef.current?.updateGameState(next);
      return next;
    });
    flashAnimBanner('Returned pastry back to display case.', 1200, false);
  }, [flashAnimBanner]);

  // Decoupled Pastry Grab (Station 1 Showcase) — NEVER resets or touches currentCup!
  const handleGrabPastry = useCallback(
    (pastryId: PastryId) => {
      soundEngine.init();
      const spec = getPastryById(pastryId);
      if (!spec) return;
      const now = Date.now();
      const prev = gameStateRef.current;
      const next = preparePastry(prev, pastryId, now);
      const appVersion = pwaManager.getStatus().appVersion;
      if (next.preparedPastry !== pastryId) {
        soundEngine.playErrorThud();
        triggerBaristaHaptic('blocked_or_error', appVersion);
        setGameState(next);
        flashAnimBanner(next.lastActionFeedback, 1600, false);
        return;
      }
      soundEngine.playPastryTong();
      triggerBaristaHaptic('pin_ticket', appVersion);
      setGameState(next);
      sceneRef.current?.updateGameState(next);
      const activeOrder =
        prev.customers.find(
          (c) => c.id === prev.pinnedOrderId && c.state === 'ordering' && c.orderAccepted
        ) || prev.customers.find((c) => c.state === 'ordering' && c.orderAccepted);
      const isTakeout =
        activeOrder?.orderType === 'takeout' || Boolean(activeOrder?.isDeliveryRider);
      flashAnimBanner(
        `Staged ${spec.name} in ${isTakeout ? 'Kraft Paper Bag' : 'Mini Porcelain Plate'} (+$${spec.price})`,
        1500,
        false
      );
    },
    [flashAnimBanner]
  );

  const handleServeCustomer = useCallback(
    (customerId?: string) => {
      soundEngine.init();
      const now = Date.now();
      const prev = gameStateRef.current;

      // Authoritative anti-exploit lock: block spam tapping while any step is running
      if (stepLockUntilRef.current > now || isStepLockActive(prev.activeStepLock, now)) {
        return;
      }

      const appVersion = pwaManager.getStatus().appVersion;
      const previewNext = serveCurrentCupToCustomer(
        { ...prev, activeStepLock: null },
        customerId,
        now
      );

      // 1. Check if Serve was BLOCKED due to incomplete drink
      const wasBlocked =
        previewNext.cupsServedToday === prev.cupsServedToday &&
        previewNext.cash === prev.cash &&
        previewNext.satisfactionScore === prev.satisfactionScore;

      if (wasBlocked) {
        soundEngine.playErrorThud();
        triggerBaristaHaptic('blocked_or_error', appVersion);
        setGameState(previewNext);
        flashAnimBanner(previewNext.lastActionFeedback, 1600, false);
        return;
      }

      // 2. Check if Serve resulted in a Customer Complaint due to wrong ingredient
      const wasComplaint =
        previewNext.satisfactionScore < prev.satisfactionScore &&
        previewNext.cash === prev.cash;
      if (wasComplaint) {
        soundEngine.playErrorThud();
        triggerBaristaHaptic('blocked_or_error', appVersion);
        setGameState(previewNext);
        sceneRef.current?.updateGameState(previewNext);
        flashAnimBanner(previewNext.lastActionFeedback, 2200, false);
        return;
      }

      // 3. Valid Completed Drink — Two-Phase Timed Serve Lock (locks immediately, commits cleanly at completion)
      const serveDuration = getStepDurationMs(prev, 'serve_drink');
      const earned = Math.max(0, Math.round(previewNext.cash - prev.cash));
      const lock: ActiveStepAction = createActiveStepLock(
        prev,
        'serve_drink',
        5,
        'Serving Order...',
        now
      );

      stepLockUntilRef.current = now + serveDuration;
      soundEngine.playCeramicClink(1.12);
      triggerBaristaHaptic('serve_success', appVersion);

      const lockedState: KlasikGameState = {
        ...prev,
        activeStation: 5,
        activeStepLock: lock,
      };
      setGameState(lockedState);
      sceneRef.current?.updateGameState(lockedState);
      sceneRef.current?.triggerStepAnimation(
        'serve_drink',
        undefined,
        earned > 0 ? `+$${earned} SERVED!` : 'SERVED!',
        serveDuration / 1000
      );
      flashAnimBanner('Plating & Serving Completed Order...', serveDuration, true);

      if (stepCommitTimerRef.current) {
        window.clearTimeout(stepCommitTimerRef.current);
      }
      stepCommitTimerRef.current = window.setTimeout(() => {
        stepCommitTimerRef.current = null;
        stepLockUntilRef.current = 0;
        if (progressIntervalRef.current) {
          window.clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setStepProgress(null);
        setStepDurationMs(null);
        soundEngine.playCashRegister();
        setGameState((latest) => {
          const committed = serveCurrentCupToCustomer(
            { ...latest, activeStepLock: null },
            customerId
          );
          const finalState: KlasikGameState = { ...committed, activeStepLock: null };
          sceneRef.current?.updateGameState(finalState);
          if (
            finalState.lastActionFeedback.includes('Happy Tip') ||
            finalState.lastActionFeedback.includes('Fast Service!')
          ) {
            soundEngine.playSpeedTipChime();
            flashAnimBanner(finalState.lastActionFeedback, 1900, false);
          }
          return finalState;
        });
      }, serveDuration);
    },
    [flashAnimBanner]
  );

  const handleCupAction = useCallback(
    (
      action:
        | 'grind'
        | 'tamp'
        | 'pull_espresso'
        | 'steep_tea'
        | 'steam_milk'
        | 'add_ice'
        | 'add_syrup'
        | 'rinse_cup'
        | 'quick_brew_step',
      syrupFlavor?: SyrupFlavor
    ) => {
      soundEngine.init();

      const now = Date.now();
      const curState = gameStateRef.current;

      // Authoritative single-flight anti-exploit lock: block spam clicks / Space mashing during active physical machine step
      if (stepLockUntilRef.current > now || isStepLockActive(curState.activeStepLock, now)) {
        return;
      }

      let resolvedStep: StepAnimType = 'grind';
      let resolvedFlavor: SyrupFlavor | undefined = syrupFlavor;
      let targetStation: BaristaStationId = curState.activeStation;

      if (action === 'quick_brew_step') {
        const pinnedOrder =
          curState.customers.find(
            (c) => c.id === curState.pinnedOrderId && c.state === 'ordering' && c.orderAccepted
          ) || curState.customers.find((c) => c.state === 'ordering' && c.orderAccepted);
        if (!pinnedOrder) {
          soundEngine.playErrorThud();
          triggerBaristaHaptic('blocked_or_error', pwaManager.getStatus().appVersion);
          flashAnimBanner("Accept a customer's order first", 1600, false);
          return;
        }
        const targetRecipe = getRecipeById(pinnedOrder.recipeId);
        const effectiveRecipe = getEffectiveRecipeForOrder(pinnedOrder, targetRecipe);
        const step = getNextRecommendedStep(
          curState.currentCup,
          targetRecipe,
          pinnedOrder,
          curState.preparedPastry
        );
        targetStation = step.station;
        if (step.toolKey === 'pastry' && pinnedOrder.requestedPastry) {
          handleSelectStation(1);
          handleGrabPastry(pinnedOrder.requestedPastry);
          return;
        }
        if (step.toolKey === 'serve') {
          handleServeCustomer();
          return;
        }
        if (step.toolKey === 'rinse') {
          resolvedStep = 'rinse_cup';
        } else if (step.toolKey === 'grinder') resolvedStep = 'grind';
        else if (step.toolKey === 'tamper') resolvedStep = 'tamp';
        else if (step.toolKey === 'espresso') resolvedStep = 'pull_espresso';
        else if (step.toolKey === 'tea') resolvedStep = 'steep_tea';
        else if (step.toolKey === 'milk') resolvedStep = 'steam_milk';
        else if (step.toolKey === 'ice') resolvedStep = 'add_ice';
        else if (step.toolKey === 'syrup') {
          resolvedStep = 'add_syrup';
          resolvedFlavor = effectiveRecipe.syrup;
        }
      } else {
        resolvedStep = action;
        if (action === 'grind' || action === 'tamp' || action === 'pull_espresso' || action === 'rinse_cup') {
          targetStation = 3;
        } else {
          targetStation = 4;
        }
      }

      // Pre-validate step transition without mutating cup yet
      const previewNext = performCupAction(
        { ...curState, activeStepLock: null },
        action,
        syrupFlavor,
        now
      );
      const appVersion = pwaManager.getStatus().appVersion;

      const cupUnchanged =
        JSON.stringify(previewNext.currentCup) === JSON.stringify(curState.currentCup) &&
        resolvedStep !== 'rinse_cup';

      if (cupUnchanged) {
        soundEngine.playErrorThud();
        triggerBaristaHaptic('blocked_or_error', appVersion);
        setGameState(previewNext);
        flashAnimBanner(`Locked: ${previewNext.lastActionFeedback}`, 1400, false);
        return;
      }

      const stepDur = getStepDurationMs(curState, resolvedStep as BaristaStepActionType);

      // Determine vessel type for vessel-aware rinse vs trash chute disposal feedback & audio
      const activeRinseOrder =
        curState.customers.find(
          (c) => c.id === curState.pinnedOrderId && c.state === 'ordering'
        ) || curState.customers.find((c) => c.state === 'ordering');
      const activeVessel = getOrderVesselType(
        activeRinseOrder,
        activeRinseOrder ? getRecipeById(activeRinseOrder.recipeId) : null
      );
      const isTakeoutVessel =
        activeVessel === 'hot-takeout' || activeVessel === 'iced-takeout';

      const shortLabels: Record<BaristaStepActionType, string> = {
        grind: 'Grinding...',
        tamp: 'Tamping...',
        pull_espresso: 'Pulling Shot...',
        steep_tea: 'Steeping Tea...',
        steam_milk: 'Steaming Milk...',
        add_ice: 'Adding Ice...',
        add_syrup: resolvedFlavor === 'matcha' ? 'Whisking...' : 'Pumping Syrup...',
        rinse_cup: isTakeoutVessel ? 'Discarding...' : 'Rinsing...',
        serve_drink: 'Serving...',
      };
      const bannerLabels: Record<BaristaStepActionType, string> = {
        grind: 'Grinding 18g Fresh Dark-Roast Beans...',
        tamp: 'Tamping Coffee Puck at 30 lbs...',
        pull_espresso: 'Extracting 9-Bar Double Espresso Shot...',
        steep_tea: 'Steeping Artisanal Tea & Botanicals at 80°C...',
        steam_milk: 'Steaming 65°C Microfoam & Pouring Rosetta Latte Art...',
        add_ice: 'Scooping Crystal Ice Cubes into Cup...',
        add_syrup:
          resolvedFlavor === 'matcha'
            ? 'Whisking Ceremonial Uji Matcha in Chawan...'
            : `Pumping ${resolvedFlavor || 'Artisan'} Syrup Infusion...`,
        rinse_cup: isTakeoutVessel
          ? 'Discarding Takeout Cup into Barista Trash Chute...'
          : 'Pressurized Glass Rinser Spraying Cup Clean...',
        serve_drink: 'Serving Completed Order...',
      };

      // Phase 1 (Start): Lock immediately, trigger 3D machine animation, sound & live progress bar
      const lock: ActiveStepAction = createActiveStepLock(
        curState,
        resolvedStep as BaristaStepActionType,
        targetStation,
        shortLabels[resolvedStep as BaristaStepActionType],
        now
      );
      stepLockUntilRef.current = now + stepDur;

      if (resolvedStep === 'grind') {
        soundEngine.playGrind(stepDur / 1000);
        triggerBaristaHaptic('grind', appVersion);
      } else if (resolvedStep === 'tamp') {
        soundEngine.playTamp();
        triggerBaristaHaptic('tamp', appVersion);
      } else if (resolvedStep === 'pull_espresso') {
        soundEngine.playEspressoPump(stepDur / 1000);
        triggerBaristaHaptic('pull_espresso', appVersion);
      } else if (resolvedStep === 'steep_tea') {
        soundEngine.playTeaSteep(stepDur / 1000);
        triggerBaristaHaptic('steep_tea', appVersion);
      } else if (resolvedStep === 'steam_milk') {
        soundEngine.playSteamHiss(stepDur / 1000);
        triggerBaristaHaptic('steam_milk', appVersion);
      } else if (resolvedStep === 'add_ice') {
        soundEngine.playIceClink();
        triggerBaristaHaptic('add_ice', appVersion);
      } else if (resolvedStep === 'add_syrup') {
        soundEngine.playSyrupOrWhisk(resolvedFlavor === 'matcha');
        triggerBaristaHaptic(
          resolvedFlavor === 'matcha' ? 'whisk_matcha' : 'add_syrup',
          appVersion
        );
      } else {
        if (isTakeoutVessel) {
          soundEngine.playTrashDrop();
        } else {
          soundEngine.playGlassRinserSpray();
        }
        triggerBaristaHaptic('rinse_cup', appVersion);
      }

      const lockedState: KlasikGameState = {
        ...curState,
        activeStation: targetStation,
        activeStepLock: lock,
      };
      setGameState(lockedState);
      sceneRef.current?.updateGameState(lockedState);
      sceneRef.current?.triggerStepAnimation(
        resolvedStep,
        resolvedFlavor,
        undefined,
        stepDur / 1000
      );
      flashAnimBanner(
        bannerLabels[resolvedStep as BaristaStepActionType],
        stepDur,
        true
      );

      // Phase 2 (Complete): Commit cup state & unlock strictly after stepDur elapses
      if (stepCommitTimerRef.current) {
        window.clearTimeout(stepCommitTimerRef.current);
      }
      stepCommitTimerRef.current = window.setTimeout(() => {
        stepCommitTimerRef.current = null;
        stepLockUntilRef.current = 0;
        if (progressIntervalRef.current) {
          window.clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setStepProgress(null);
        setStepDurationMs(null);
        soundEngine.playCeramicClink(1.18);
        setGameState((latest) => {
          const committed = performCupAction(
            { ...latest, activeStepLock: null },
            action,
            syrupFlavor
          );
          const finalState: KlasikGameState = { ...committed, activeStepLock: null };
          sceneRef.current?.updateGameState(finalState);
          return finalState;
        });
      }, stepDur);
    },
    [flashAnimBanner, handleGrabPastry, handleSelectStation, handleServeCustomer]
  );

  const handleStartShift = useCallback((mode: GameMode) => {
    if (isEnteringCafeRef.current) return;
    soundEngine.init();
    soundEngine.preloadChampyAudio();
    soundEngine.playDoorChime();
    const spState = spotifyManager.getState();
    soundEngine.setLofiSynthActive(spState.isPlaying && spState.internalSynthEnabled);
    setActiveModal(null);

    try {
      const status = pwaManager.getStatus();
      if (status.isAndroid || status.appVersion === 'apk' || status.appVersion === 'pwa') {
        pwaManager.lockLandscape().catch(() => {});
      } else {
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (mode: string) => Promise<void>;
        };
        orientation?.lock?.('landscape')?.catch(() => {});
      }
    } catch {
      // Fallback handled automatically by .klasik-root-portrait-rotated
    }

    let finished = false;
    const finishEnterCafe = () => {
      if (finished) return;
      finished = true;
      if (enterGlideFallbackRef.current) {
        window.clearTimeout(enterGlideFallbackRef.current);
        enterGlideFallbackRef.current = null;
      }
      sceneRef.current?.finishEnterCafeGlideNow();
      sceneRef.current?.resetCameraOffsets();
      document.body.dataset.state = 'playing';
      const now = new Date();
      setLiveClockLabel(formatLocalClock(now));
      setIsEnteringCafe(false);
      isEnteringCafeRef.current = false;
      setGameState((prev) => {
        const synced = syncDailyQuotaForDate(prev, now);
        const rolledRain = synced.rainPreference === 'auto' ? rollAutoRain() : undefined;
        const withWeather = applyWeatherPreferences(
          synced,
          synced.timeOfDayMode,
          synced.rainPreference,
          now,
          rolledRain
        );
        soundEngine.setRainAmbience(true, withWeather.weather);
        return {
          ...withWeather,
          phase: 'playing',
          mode,
          activeStation: 3,
        };
      });
    };

    // Start 0.25s title fade-out + ~1.1s curved camera glide from exterior storefront through the doorway into barista POV
    if (gameStateRef.current.phase === 'title' && sceneRef.current) {
      isEnteringCafeRef.current = true;
      setIsEnteringCafe(true);
      sceneRef.current.startEnterCafeGlide(finishEnterCafe);
      enterGlideFallbackRef.current = window.setTimeout(finishEnterCafe, 2400);
    } else {
      finishEnterCafe();
    }
  }, []);

  const handleRequestFullscreenLandscape = useCallback(() => {
    pwaManager.lockLandscape();
  }, []);

  // Defer heavy WebGL scene creation until AFTER the 1s landscape gate AND 1.35s Crema Ring entrance finish!
  const shouldMountScene =
    isAutostart || (bootStage !== 'landscape-cue' && splashEntranceDone);

  // Mount Three.js WebGLRenderer once in isolated container (zero contention with splash entrance)
  useEffect(() => {
    if (!shouldMountScene) return;
    const container = canvasMountRef.current;
    if (!container) return;

    let scene: KlasikCafeScene3D | null = null;
    let readyRaf: number | null = null;
    try {
      scene = new KlasikCafeScene3D(
        container,
        gameStateRef.current,
        spotifyManager.getState(),
        {
          onSelectStation: (st) => handleSelectStation(st),
          onToolAction: (action, syrupFlavor) => {
            if (action === 'serve_drink') {
              handleServeCustomer();
            } else if (action === 'toggle_vinyl') {
              musicPlayerController.togglePlayPause();
            } else if (action === 'next_vinyl') {
              musicPlayerController.next();
            } else if (action === 'open_spotify_modal') {
              setActiveModal('spotify');
            } else if (action === 'open_upgrades_modal') {
              setActiveModal('upgrades');
            } else if (action === 'open_recipes_modal') {
              setActiveModal('recipes');
            } else {
              handleCupAction(action, syrupFlavor);
            }
          },
          onHoverToolChange: (label) => setHoveredToolLabel(label),
          onFpsUpdate: (measuredFps) => setFps(measuredFps),
          onDoorOpen: () => soundEngine.playDoorChime(),
          onPinOrderFromTicket: (orderId, recipeId) => {
            soundEngine.init();
            soundEngine.playPaperPin();
            triggerBaristaHaptic('pin_ticket', pwaManager.getStatus().appVersion);
            const matched = gameStateRef.current.customers.find((c) => c.id === orderId);
            const rec = getRecipeById(recipeId);
            setGameState((prev) => ({ ...prev, pinnedOrderId: orderId }));
            setHudPinnedOrderId(orderId);
            setHudPinnedRecipeId(recipeId);
            setIsPinnedRecipeMinimized(false);
            flashAnimBanner(
              matched
                ? `Pinned ${matched.customerName}'s ${rec.name}!`
                : `Pinned ${rec.name} to HUD!`,
              1400,
              false
            );
          },
          onCustomerReachedCounter: (customerId) => {
            setGameState((prev) => markCustomerAtCounter(prev, customerId));
          },
          onAcceptCustomerOrder: (orderId) => {
            handleAcceptOrder(orderId);
          },
          onCookieJarTap: (tapCount) => {
            handleCookieJarTap(tapCount);
          },
          onPetChampy: () => {
            soundEngine.init();
            soundEngine.preloadChampyAudio();
            champyPetCountRef.current += 1;
            soundEngine.playChampyPurr(2.6);
            if (champyPetCountRef.current % 3 === 1) {
              soundEngine.playChampyMeow('chirp');
            }
            triggerChampyPurrHaptic(pwaManager.getStatus().appVersion);
            const activeCat = getCafeCatSpec(gameStateRef.current.equippedCatId);
            flashAnimBanner(`${activeCat.name} is purring!`, 2100, false);
          },
          onChampyGreet: () => {
            if (gameStateRef.current.phase !== 'playing') return;
            soundEngine.playChampyMeow('greet');
          },
          onCatCombStroke: (speed) => {
            soundEngine.init();
            soundEngine.playCatBrushStroke(speed);
          },
          onCatTreatCrunch: () => {
            soundEngine.init();
            soundEngine.playCatTreatCrunch();
            soundEngine.playChampyPurr(1.6);
            const activeCat = getCafeCatSpec(gameStateRef.current.equippedCatId);
            flashAnimBanner(`${activeCat.name} loved the fish biscuit!`, 1800, false);
          },
          onGrabPastry: (pastryId) => {
            handleGrabPastry(pastryId);
          },
          onReturnPastry: () => {
            handleReturnPreparedPastry();
          },
          onScooterSound: (mode) => {
            if (gameStateRef.current.phase !== 'playing') return;
            soundEngine.playScooterPurr(mode);
          },
          onEnterGoOutside: () => {
            if (gameStateRef.current.phase !== 'playing') return;
            handleEnterGoOutside();
          },
        }
      );
      sceneRef.current = scene;
      setWebglError(null);
      readyRaf = window.requestAnimationFrame(() => setIsSceneReady(true));
    } catch (err) {
      setWebglError(
        err instanceof Error
          ? err.message
          : 'WebGL 3D context could not be initialized on this device.'
      );
      setIsSceneReady(true);
    }

    return () => {
      if (readyRaf !== null) {
        window.cancelAnimationFrame(readyRaf);
      }
      clearStepTimers();
      stepLockUntilRef.current = 0;
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [
    shouldMountScene,
    clearStepTimers,
    flashAnimBanner,
    handleAcceptOrder,
    handleCookieJarTap,
    handleCupAction,
    handleEnterGoOutside,
    handleGrabPastry,
    handleReturnPreparedPastry,
    handleSelectStation,
    handleServeCustomer,
  ]);

  // Sync gameState changes to Three.js scene & Granular Synthesis Weather Audio Engine
  useEffect(() => {
    sceneRef.current?.updateGameState(gameState);
    soundEngine.setRainAmbience(gameState.phase === 'playing', gameState.weather);
  }, [gameState]);

  // Play order-expired sound + crimson toast whenever an ordering customer leaves dissatisfied ($0)
  useEffect(() => {
    const seq = gameState.lastExpiredEventSeq ?? 0;
    if (seq > lastExpiredSeqRef.current) {
      lastExpiredSeqRef.current = seq;
      soundEngine.playOrderExpired();
      triggerBaristaHaptic('blocked_or_error', pwaManager.getStatus().appVersion);
      const expiredName = gameState.lastExpiredCustomerName || 'Customer';
      flashAnimBanner(`${expiredName} left dissatisfied ($0)`, 2600, false);
    }
  }, [gameState.lastExpiredEventSeq, gameState.lastExpiredCustomerName, flashAnimBanner]);

  // Celebratory toast + Secret Tisay Walk-In + Static Amber Cat Badge Dot whenever cats or cosmetics unlock!
  useEffect(() => {
    const seq = gameState.lastCatUnlockSeq ?? 0;
    const catCount = gameState.unlockedCats?.length ?? 1;
    const cosCount = gameState.unlockedCosmetics?.length ?? 0;
    const hasTisay = Boolean(gameState.unlockedCats?.includes('tisay'));

    if (hasTisay && !prevHadTisayRef.current) {
      prevHadTisayRef.current = true;
      setHasUnseenCatUnlock(true);
      soundEngine.playSecretCatChime();
      sceneRef.current?.triggerTisayArrivalWalkIn();
      flashAnimBanner('A sleek ginger cat wandered in — Tisay has joined the cafe!', 4600, false);
    } else if (catCount > prevCatCountRef.current || cosCount > prevCosmeticCountRef.current) {
      setHasUnseenCatUnlock(true);
    }
    prevCatCountRef.current = catCount;
    prevCosmeticCountRef.current = cosCount;

    if (seq > lastCatUnlockSeqRef.current) {
      lastCatUnlockSeqRef.current = seq;
      if (gameState.lastCatUnlockToast && !gameState.lastCatUnlockToast.includes('Tisay')) {
        soundEngine.playSpeedTipChime();
        flashAnimBanner(gameState.lastCatUnlockToast, 3400, false);
      }
    }
  }, [
    gameState.lastCatUnlockSeq,
    gameState.lastCatUnlockToast,
    gameState.unlockedCats,
    gameState.unlockedCosmetics,
    flashAnimBanner,
  ]);

  // 4 Hz Gameplay Simulation Timer (respects modal pause, Cat Station & Go Outside patience pause, 0.35x Recipe Book grace, and staggered door arrivals)
  useEffect(() => {
    if (gameState.phase !== 'playing') return;
    const interval = window.setInterval(() => {
      const modal = activeModalRef.current;
      const activeArrivingCount = sceneRef.current?.getActiveArrivingCount() ?? 0;
      const isSecretPasserbyActive = sceneRef.current?.isSecretPasserbyActive() ?? false;
      setGameState((prev) =>
        advanceSimulationTick(prev, 0.25, {
          modalOpen: modal !== null,
          isRecipeBookOpen: modal === 'recipes',
          catStationOpen: catStationOpenRef.current,
          outdoorOverlookOpen: outdoorOverlookOpenRef.current,
          isSecretPasserbyActive,
          activeArrivingCount,
        })
      );
    }, 250);
    return () => window.clearInterval(interval);
  }, [gameState.phase]);

  // Global Keyboard Shortcuts (Disabled in Android APK Version; Active on Live Web & PWA)
  useEffect(() => {
    if (pwaStatus.appVersion === 'apk') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (pwaManager.getStatus().appVersion === 'apk') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const phase = gameStateRef.current.phase;

      if (phase === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartShift('career');
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (outdoorOverlookOpenRef.current) {
          handleExitGoOutside();
          return;
        }
        if (catStationOpenRef.current) {
          setCatStationCustomizeOpen(false);
          setCatStationOpen(false);
          return;
        }
        if (activeModal) {
          setActiveModal(null);
          return;
        }
        setGameState((prev) => ({
          ...prev,
          phase: prev.phase === 'playing' ? 'paused' : 'playing',
        }));
        return;
      }

      if (phase !== 'playing' || catStationOpenRef.current || outdoorOverlookOpenRef.current) {
        return;
      }

      if (e.code === 'Digit1') handleSelectStation(1);
      else if (e.code === 'Digit2') handleSelectStation(2);
      else if (e.code === 'Digit3') handleSelectStation(3);
      else if (e.code === 'Digit4') handleSelectStation(4);
      else if (e.code === 'Digit5') handleSelectStation(5);
      else if (e.code === 'Digit6') handleSelectStation(6);
      else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        const cur = gameStateRef.current.activeStation;
        const prevSt = (cur > 1 ? cur - 1 : 6) as BaristaStationId;
        handleSelectStation(prevSt);
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        const cur = gameStateRef.current.activeStation;
        const nextSt = (cur < 6 ? cur + 1 : 1) as BaristaStationId;
        handleSelectStation(nextSt);
      } else if (e.code === 'Space') {
        if (gameStateRef.current.realismMode || activeModal) return;
        e.preventDefault();
        if (
          e.repeat ||
          stepLockUntilRef.current > Date.now() ||
          isStepLockActive(gameStateRef.current.activeStepLock)
        ) {
          return;
        }
        handleCupAction('quick_brew_step');
      } else if (e.code === 'KeyG') {
        if (e.repeat || activeModal) return;
        e.preventDefault();
        handleCupAction('grind');
      } else if (e.code === 'KeyT') {
        if (e.repeat || activeModal) return;
        e.preventDefault();
        handleCupAction('tamp');
      } else if (e.code === 'KeyE') {
        if (e.repeat || activeModal) return;
        e.preventDefault();
        handleCupAction('pull_espresso');
      } else if (e.code === 'KeyB') {
        if (e.repeat || activeModal) return;
        e.preventDefault();
        handleCupAction('steep_tea');
      } else if (e.code === 'KeyS') {
        if (e.repeat || activeModal) return;
        e.preventDefault();
        handleCupAction('steam_milk');
      } else if (e.code === 'KeyI') {
        if (e.repeat || activeModal) return;
        e.preventDefault();
        handleCupAction('add_ice');
      } else if (e.code === 'KeyR') {
        if (e.repeat || activeModal) return;
        e.preventDefault();
        handleCupAction('rinse_cup');
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        musicPlayerController.togglePlayPause();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeModal,
    handleCupAction,
    handleExitGoOutside,
    handleSelectStation,
    handleStartShift,
    pwaStatus.appVersion,
  ]);

  const handleChangeTimeOfDay = (timeOfDayMode: TimeOfDayMode) => {
    soundEngine.init();
    soundEngine.playCeramicClink(1.05);
    const now = new Date();
    setGameState((prev) => {
      const next = applyWeatherPreferences(prev, timeOfDayMode, prev.rainPreference, now);
      soundEngine.setRainAmbience(next.phase === 'playing', next.weather);
      return next;
    });
  };

  const handleChangeRainPreference = (rainPreference: RainPreference) => {
    soundEngine.init();
    soundEngine.playCeramicClink(1.08);
    const now = new Date();
    const rolledRain = rainPreference === 'auto' ? rollAutoRain() : undefined;
    setGameState((prev) => {
      const next = applyWeatherPreferences(
        prev,
        prev.timeOfDayMode,
        rainPreference,
        now,
        rolledRain
      );
      soundEngine.setRainAmbience(next.phase === 'playing', next.weather);
      return next;
    });
  };

  const handleUpdateDecor = (decor: DecorCustomization) => {
    soundEngine.playCeramicClink(1.1);
    setGameState((prev) => ({ ...prev, decor }));
  };

  const handleChangeGraphics = (graphicsQuality: GraphicsQuality) => {
    saveGraphicsQuality(graphicsQuality);
    setGameState((prev) => ({ ...prev, graphicsQuality }));
  };

  const handleToggleRealismMode = () => {
    soundEngine.playCeramicClink(1.08);
    setGameState((prev) => ({
      ...prev,
      realismMode: !prev.realismMode,
      lastActionFeedback: !prev.realismMode
        ? 'Realism Mode Enabled: Step shortcuts hidden. Rely on Recipe Book & touch 3D equipment directly!'
        : 'Realism Mode Disabled: Guided step-by-step HUD shortcuts restored.',
    }));
  };

  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleClearSwCacheAndReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  return (
    <main
      data-landscape-enforced={isPortraitRotated ? 'rotated-90' : 'native-landscape'}
      data-weather={gameState.weather}
      className={`bg-[#09090B] select-none ${
        isPortraitRotated ? 'klasik-root-portrait-rotated' : 'klasik-root-landscape'
      }`}
    >
      {/* Isolated Full-Bleed WebGL Canvas Container (hidden until splash exit fade begins) */}
      <div
        ref={canvasMountRef}
        data-testid="klasik-3d-canvas-container"
        className={`game-canvas-container z-0 transition-opacity duration-300 ${
          !isLoading || splashFadingOut ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      />

      {/* Safe On-Screen Recovery Fallback if WebGL or Service Worker Encounters an Error */}
      {webglError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="max-w-md w-full glass-modal rounded-2xl p-5 text-center space-y-3">
            <h2 className="text-lg font-bold font-display text-white glass-text-crisp">
              3D Graphics Recovery Mode
            </h2>
            <p className="text-xs text-[#A1A1AA]">{webglError}</p>
            <button
              type="button"
              onClick={handleClearSwCacheAndReload}
              className="px-4 py-2 rounded-xl hud-platinum-pill font-bold text-xs cursor-pointer"
            >
              Reset Cache &amp; Reload Cafe
            </button>
          </div>
        </div>
      )}

      {/* Stage 1 (Mobile / PWA / APK Only): 1-Second "Turn your phone into landscape" Indicator */}
      {bootStage === 'landscape-cue' && (
        <LandscapeIntroGate onComplete={() => setBootStage('studio-splash')} />
      )}

      {/* Stage 2: Minimalist Cinematic "Crema Ring" Studio Splash (Portaled outside rotated <main>) */}
      {bootStage === 'studio-splash' && (
        <LoadingScreen
          isReady={isSceneReady}
          onEntranceComplete={() => setSplashEntranceDone(true)}
          onStartFade={() => setSplashFadingOut(true)}
          onComplete={() => {
            setSplashFadingOut(true);
            setBootStage('ready');
          }}
        />
      )}

      {/* Living 3D Storefront & Parked Miata Title Overlay (Concept A Left-Aligned Monochrome + Platinum) */}
      {!isLoading && gameState.phase === 'title' && (
        <TitleScreen
          day={gameState.day}
          cash={gameState.cash}
          cupsServedToday={gameState.cupsServedToday}
          dailyOrderQuota={gameState.dailyOrderQuota}
          liveClockLabel={liveClockLabel}
          weather={gameState.weather}
          timeOfDayMode={gameState.timeOfDayMode}
          rainPreference={gameState.rainPreference}
          activeScenery={gameState.activeScenery}
          graphicsQuality={gameState.graphicsQuality}
          pwaStatus={pwaStatus}
          isMuted={isMuted}
          isEnteringCafe={isEnteringCafe}
          spotifyTrackTitle={
            audioSnapshot.mode === 'vinyl'
              ? audioSnapshot.vinylTracks[audioSnapshot.activeVinylIndex]?.title || 'Cafe Vinyl'
              : audioSnapshot.mode === 'radio'
              ? audioSnapshot.radioStations.find((s) => s.id === audioSnapshot.activeStationId)
                  ?.name || 'Live Radio'
              : audioSnapshot.externalMedia.title
          }
          onStartShift={handleStartShift}
          onChangeTimeOfDay={handleChangeTimeOfDay}
          onChangeRainPreference={handleChangeRainPreference}
          onChangeGraphics={handleChangeGraphics}
          onOpenSpotifyModal={() => setActiveModal('spotify')}
          onOpenViewsModal={() => {
            setUpgradesInitialTab('sceneries');
            setActiveModal('upgrades');
          }}
          onOpenCatsModal={() => {
            setUpgradesInitialTab('cafe_cats');
            setActiveModal('upgrades');
          }}
          onOpenPwaModal={() => setActiveModal('pwa')}
          onOpenCodeExportModal={() => setActiveModal('export')}
        />
      )}

      {/* Active Barista POV HUD Overlay (Hidden cleanly while inside Cat Station or Go Outside Mode) */}
      {!isLoading && gameState.phase !== 'title' && !catStationOpen && !outdoorOverlookOpen && (
        <HudOverlay
          gameState={gameState}
          spotifyState={spotifyState}
          audioSnapshot={audioSnapshot}
          hasUnseenCatUnlock={hasUnseenCatUnlock}
          appVersion={pwaStatus.appVersion}
          liveClockLabel={liveClockLabel}
          isMuted={isMuted}
          hoveredToolLabel={hoveredToolLabel}
          fps={fps}
          activeAnimLabel={activeAnimLabel}
          stepProgress={stepProgress}
          stepDurationMs={stepDurationMs}
          hudPinnedRecipeId={hudPinnedRecipeId}
          hudPinnedOrderId={hudPinnedOrderId}
          isPinnedRecipeMinimized={isPinnedRecipeMinimized}
          onToggleMinimizePinnedRecipe={() =>
            setIsPinnedRecipeMinimized((prev) => !prev)
          }
          onUnpinHudRecipe={() => {
            setHudPinnedOrderId(null);
            setHudPinnedRecipeId(null);
            setIsPinnedRecipeMinimized(false);
          }}
          onSelectStation={handleSelectStation}
          onPinOrder={(orderId) =>
            setGameState((prev) => ({ ...prev, pinnedOrderId: orderId }))
          }
          onAcceptOrder={handleAcceptOrder}
          onGrabPastry={handleGrabPastry}
          onCupAction={handleCupAction}
          onServeCustomer={handleServeCustomer}
          onToggleMute={handleToggleMute}
          onTogglePause={() =>
            setGameState((prev) => ({
              ...prev,
              phase: prev.phase === 'playing' ? 'paused' : 'playing',
            }))
          }
          onToggleVinyl={() => musicPlayerController.togglePlayPause()}
          onOpenCatStation={handleOpenCatStation}
          onOpenGoOutside={handleEnterGoOutside}
          onChangeGraphics={handleChangeGraphics}
          onToggleRealismMode={handleToggleRealismMode}
          onRequestFullscreenLandscape={handleRequestFullscreenLandscape}
          onOpenModal={(modal) => {
            if (modal === 'upgrades') setUpgradesInitialTab('upgrades');
            setActiveModal(modal);
          }}
        />
      )}

      {/* Phase 6: Go Outside Scenic Overlook Mode Overlay */}
      {!isLoading && gameState.phase === 'playing' && outdoorOverlookOpen && (
        <OutdoorOverlookOverlay
          activeScenery={gameState.activeScenery}
          activeVantage={outdoorVantage}
          isSnowing={gameState.isSnowing}
          climateState={gameState.climateState}
          waitingOrdersCount={
            gameState.customers.filter((c) => c.state === 'ordering').length
          }
          onSelectVantage={handleSelectOutdoorVantage}
          onBackInside={handleExitGoOutside}
        />
      )}

      {/* Phase 5: Interactive Cat Station & Wardrobe Close-Up Overlay */}
      {!isLoading && gameState.phase === 'playing' && catStationOpen && (
        <CatStationOverlay
          gameState={gameState}
          mode={catStationMode}
          customizeOpen={catStationCustomizeOpen}
          waitingOrdersCount={
            gameState.customers.filter((c) => c.state === 'ordering').length
          }
          onChangeMode={setCatStationMode}
          onToggleCustomize={setCatStationCustomizeOpen}
          onSelectCat={handlePurchaseOrEquipCafeCat}
          onPetAction={() => {
            sceneRef.current?.petChampy();
            soundEngine.init();
            soundEngine.preloadChampyAudio();
            soundEngine.playChampyPurr(2.4);
            soundEngine.playChampyMeow('chirp');
            triggerChampyPurrHaptic(pwaManager.getStatus().appVersion);
          }}
          onTossTreat={() => {
            sceneRef.current?.triggerCatTreatToss();
          }}
          onPurchaseCosmetic={handlePurchaseCosmetic}
          onToggleEquipCosmetic={handleToggleEquipCosmetic}
          getCatCosmeticThumbnail={(id) =>
            sceneRef.current?.getCatCosmeticThumbnail(id) ?? ''
          }
          onClose={handleCloseCatStation}
        />
      )}

      {/* Outcome-Matched Pause / Victory / Shift Over Modal */}
      {(gameState.phase === 'paused' || gameState.phase === 'gameover') && !activeModal && (
        <StatusModal
          gameState={gameState}
          appVersion={pwaStatus.appVersion}
          onResume={() => setGameState((prev) => ({ ...prev, phase: 'playing' }))}
          onNextDayOrRetry={() => setGameState((prev) => startNextDayShift(prev))}
          onReturnToTitle={() => setGameState((prev) => ({ ...prev, phase: 'title' }))}
          onOpenSaveExport={() => setActiveModal('export')}
        />
      )}

      {/* Cafe Management & Spotify Vinyl Modals */}
      {activeModal === 'recipes' && (() => {
        const pinnedCust =
          gameState.customers.find(
            (c) => c.id === gameState.pinnedOrderId && c.state === 'ordering'
          ) || gameState.customers.find((c) => c.state === 'ordering');
        return (
          <RecipeMenuModal
            currentDay={gameState.day}
            pinnedRecipeId={pinnedCust?.recipeId ?? null}
            pinnedCustomerName={pinnedCust?.customerName ?? null}
            hudPinnedRecipeId={hudPinnedRecipeId}
            onTogglePinRecipe={(recipeId) => {
              soundEngine.playPaperPin();
              if (hudPinnedRecipeId === recipeId) {
                setHudPinnedOrderId(null);
                setHudPinnedRecipeId(null);
                setIsPinnedRecipeMinimized(false);
              } else {
                setHudPinnedOrderId(
                  pinnedCust && pinnedCust.recipeId === recipeId ? pinnedCust.id : null
                );
                setHudPinnedRecipeId(recipeId);
                setIsPinnedRecipeMinimized(false);
                const rec = getRecipeById(recipeId);
                flashAnimBanner(`Pinned ${rec.name} to HUD!`, 1200, false);
              }
            }}
            onClose={() => setActiveModal(null)}
          />
        );
      })()}

      {activeModal === 'upgrades' && (
        <BizUpgradesModal
          gameState={gameState}
          initialTab={upgradesInitialTab}
          onPurchaseUpgrade={(upgradeId) => {
            soundEngine.playCashRegister();
            setGameState((prev) => purchaseUpgrade(prev, upgradeId));
          }}
          onUnlockOrEquipEquipmentSkin={(skinId) => {
            soundEngine.playCashRegister();
            setGameState((prev) => unlockOrEquipEquipmentSkin(prev, skinId));
          }}
          onUnlockOrEquipCustomerPack={(packId) => {
            soundEngine.playCashRegister();
            setGameState((prev) => unlockOrEquipCustomerSkinPack(prev, packId));
          }}
          onPurchaseOrEquipCafeCat={handlePurchaseOrEquipCafeCat}
          onPurchaseOrEquipScenery={handlePurchaseOrEquipScenery}
          onPurchasePatronOutfit={handlePurchasePatronOutfit}
          onSetPatronOutfitMode={handleSetPatronOutfitMode}
          onEquipManualPatronOutfit={handleEquipManualPatronOutfit}
          onSetPatronOutfitAutoMatch={handleSetPatronOutfitAutoMatch}
          onToggleCustomPatronOutfit={handleToggleCustomPatronOutfit}
          onOpenCatStation={handleOpenCatStation}
          onOpenGoOutside={handleEnterGoOutside}
          getSceneryThumbnail={(id) => sceneRef.current?.getSceneryThumbnail(id) ?? ''}
          getPatronOutfitThumbnail={(id, climate) =>
            sceneRef.current?.getPatronOutfitThumbnail(id, climate) ?? ''
          }
          getCatThumbnail={(id) => sceneRef.current?.getCatThumbnail(id) ?? ''}
          onClaimLoginReward={(rewardDay) => {
            soundEngine.playCashRegister();
            setGameState((prev) => claimLoginReward(prev, rewardDay));
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'customize' && (
        <CustomizeModal
          decor={gameState.decor}
          weather={gameState.weather}
          timeOfDayMode={gameState.timeOfDayMode}
          rainPreference={gameState.rainPreference}
          activeScenery={gameState.activeScenery}
          isSnowing={gameState.isSnowing}
          equippedCatName={getCafeCatSpec(gameState.equippedCatId).name}
          unlockedCatsCount={gameState.unlockedCats.length}
          getDecorThumbnail={(cat, val) =>
            sceneRef.current?.getDecorThumbnail(cat, val) ?? ''
          }
          onUpdateDecor={handleUpdateDecor}
          onUpdateTimeOfDay={handleChangeTimeOfDay}
          onUpdateRainPreference={handleChangeRainPreference}
          onOpenCafeCats={() => {
            setUpgradesInitialTab('cafe_cats');
            setActiveModal('upgrades');
          }}
          onOpenSceneries={() => {
            setUpgradesInitialTab('sceneries');
            setActiveModal('upgrades');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'spotify' && (
        <UnifiedAudioModal
          snapshot={audioSnapshot}
          isApkVersion={pwaStatus.appVersion === 'apk'}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'pwa' && pwaStatus.appVersion !== 'apk' && (
        <PwaApkModal
          pwaStatus={pwaStatus}
          graphicsQuality={gameState.graphicsQuality}
          onChangeGraphics={handleChangeGraphics}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'export' && (
        <CodeExportModal
          gameState={gameState}
          onRestoreSave={(restored) => setGameState(restored)}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Smooth 0.35s Matte Obsidian Fade Curtain for Scenery Swaps & Go Outside Transitions */}
      <div
        aria-hidden="true"
        data-fade-visible={sceneryFadeVisible ? '1' : '0'}
        className={`pointer-events-none fixed inset-0 z-50 bg-[#09090B] transition-opacity duration-200 ${
          sceneryFadeVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </main>
  );
}
