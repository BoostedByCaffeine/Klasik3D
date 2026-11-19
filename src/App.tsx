import { useCallback, useEffect, useRef, useState } from 'react';
import { Disc3 } from 'lucide-react';
import { BizUpgradesModal } from './components/BizUpgradesModal';
import { CodeExportModal } from './components/CodeExportModal';
import { CustomizeModal } from './components/CustomizeModal';
import { HudOverlay } from './components/HudOverlay';
import { LandscapeIntroGate } from './components/LandscapeIntroGate';
import { LoadingScreen } from './components/LoadingScreen';
import { PwaApkModal } from './components/PwaApkModal';
import { RecipeMenuModal } from './components/RecipeMenuModal';
import { SpotifyVinylModal } from './components/SpotifyVinylModal';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import {
  ActiveStepAction,
  BaristaStationId,
  BaristaStepActionType,
  DecorCustomization,
  GameMode,
  GraphicsQuality,
  KlasikGameState,
  RECIPES,
  SyrupFlavor,
  WeatherMode,
  advanceSimulationTick,
  claimLoginReward,
  createActiveStepLock,
  createInitialGameState,
  getEffectiveRecipeForOrder,
  getNextRecommendedStep,
  getRecipeById,
  getStepDurationMs,
  isStepLockActive,
  loadGameFromStorage,
  loadSavedGraphicsQuality,
  performCupAction,
  purchaseUpgrade,
  saveGameToStorage,
  saveGraphicsQuality,
  serveCurrentCupToCustomer,
  startNextDayShift,
  unlockOrEquipCustomerSkinPack,
  unlockOrEquipEquipmentSkin,
} from './game/rules';
import { KlasikCafeScene3D, StepAnimType } from './game/scene3d';
import { triggerBaristaHaptic } from './game/haptics';
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
    const saved = loadGameFromStorage();
    const initial = saved || createInitialGameState();
    // Fresh launch defaults to 'low'; explicit user toggles persist via STORAGE_GFX_KEY
    const savedGfx = loadSavedGraphicsQuality();
    const withGfx = { ...initial, graphicsQuality: savedGfx, activeStepLock: null };
    if (isAutostart) {
      return { ...withGfx, phase: 'playing' };
    }
    return { ...withGfx, phase: 'title' };
  });

  const [spotifyState, setSpotifyState] = useState<SpotifyVinylState>(() =>
    spotifyManager.getState()
  );
  const [pwaStatus, setPwaStatus] = useState<PwaEnvironmentStatus>(() =>
    pwaManager.getStatus()
  );
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hoveredToolLabel, setHoveredToolLabel] = useState<string | null>(null);
  const [activeAnimLabel, setActiveAnimLabel] = useState<string | null>(null);
  const [stepProgress, setStepProgress] = useState<number | null>(null);
  const [stepDurationMs, setStepDurationMs] = useState<number | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [hudPinnedRecipeId, setHudPinnedRecipeId] = useState<string | null>(null);
  const [isPinnedRecipeMinimized, setIsPinnedRecipeMinimized] = useState<boolean>(false);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<KlasikCafeScene3D | null>(null);
  const animTimerRef = useRef<number | null>(null);
  const stepCommitTimerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const stepLockUntilRef = useRef<number>(0);
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

  // Mirror phase, appVersion & graphics quality (for GFX: LOW backdrop-filter bypass)
  useEffect(() => {
    document.body.dataset.state = gameState.phase;
    document.body.dataset.version = pwaStatus.appVersion;
    document.documentElement.dataset.gfx = gameState.graphicsQuality;
    saveGameToStorage(gameState);
  }, [gameState, pwaStatus.appVersion]);

  // Sync Diegetic 3D POS Camera Focus when Barista Codex opens or closes
  useEffect(() => {
    sceneRef.current?.setCodexFocusMode(activeModal === 'recipes');
  }, [activeModal]);

  // Clean up any pending timed step timers on unmount
  useEffect(() => {
    return () => {
      if (animTimerRef.current) window.clearTimeout(animTimerRef.current);
      if (stepCommitTimerRef.current) window.clearTimeout(stepCommitTimerRef.current);
      if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Subscribe to Spotify & PWA managers
  useEffect(() => {
    const unsubSpotify = spotifyManager.subscribe((nextSpotify) => {
      setSpotifyState(nextSpotify);
      sceneRef.current?.updateSpotifyState(nextSpotify);
    });
    const unsubPwa = pwaManager.subscribe((nextPwa) => {
      setPwaStatus(nextPwa);
    });
    return () => {
      unsubSpotify();
      unsubPwa();
    };
  }, []);

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
        }, 40);
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
        4,
        'Serving Drink...',
        now
      );

      stepLockUntilRef.current = now + serveDuration;
      soundEngine.playCeramicClink(1.12);
      triggerBaristaHaptic('serve_success', appVersion);

      const lockedState: KlasikGameState = {
        ...prev,
        activeStation: 4,
        activeStepLock: lock,
      };
      setGameState(lockedState);
      sceneRef.current?.updateGameState(lockedState);
      sceneRef.current?.triggerStepAnimation(
        'serve_drink',
        undefined,
        earned > 0 ? `+$${earned} SERVED!` : 'SERVED!'
      );
      flashAnimBanner('Plating & Serving Completed Drink...', serveDuration, true);

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
            (c) => c.id === curState.pinnedOrderId && c.state === 'ordering'
          ) || curState.customers.find((c) => c.state === 'ordering');
        const targetRecipe = pinnedOrder
          ? getRecipeById(pinnedOrder.recipeId)
          : RECIPES[1];
        const effectiveRecipe = getEffectiveRecipeForOrder(pinnedOrder, targetRecipe);
        const step = getNextRecommendedStep(
          curState.currentCup,
          targetRecipe,
          pinnedOrder
        );
        targetStation = step.station;
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
          targetStation = 2;
        } else {
          targetStation = 3;
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

      const shortLabels: Record<BaristaStepActionType, string> = {
        grind: 'Grinding...',
        tamp: 'Tamping...',
        pull_espresso: 'Pulling Shot...',
        steep_tea: 'Steeping Tea...',
        steam_milk: 'Steaming Milk...',
        add_ice: 'Adding Ice...',
        add_syrup: resolvedFlavor === 'matcha' ? 'Whisking...' : 'Pumping Syrup...',
        rinse_cup: 'Rinsing...',
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
        rinse_cup: 'Rinsing Cup & Knocking Spent Puck into Knock Box...',
        serve_drink: 'Serving Completed Drink...',
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
        soundEngine.playCeramicClink(1.0);
        triggerBaristaHaptic('rinse_cup', appVersion);
      }

      const lockedState: KlasikGameState = {
        ...curState,
        activeStation: targetStation,
        activeStepLock: lock,
      };
      setGameState(lockedState);
      sceneRef.current?.updateGameState(lockedState);
      sceneRef.current?.triggerStepAnimation(resolvedStep, resolvedFlavor);
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
    [flashAnimBanner, handleServeCustomer]
  );

  const handleStartShift = useCallback((mode: GameMode) => {
    soundEngine.init();
    soundEngine.playCustomerBell();
    const spState = spotifyManager.getState();
    soundEngine.setLofiSynthActive(spState.isPlaying && spState.internalSynthEnabled);
    soundEngine.setRainAmbience(true, gameStateRef.current.weather);
    sceneRef.current?.resetCameraOffsets();
    document.body.dataset.state = 'playing';

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

    setGameState((prev) => ({
      ...prev,
      phase: 'playing',
      mode,
      activeStation: 2,
      shiftTimeRemaining: 300,
    }));
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
              spotifyManager.togglePlayPause();
            } else if (action === 'next_vinyl') {
              spotifyManager.nextTrack();
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
  }, [shouldMountScene, clearStepTimers, handleCupAction, handleSelectStation, handleServeCustomer]);

  // Sync gameState changes to Three.js scene & Granular Synthesis Weather Audio Engine
  useEffect(() => {
    sceneRef.current?.updateGameState(gameState);
    soundEngine.setRainAmbience(gameState.phase === 'playing', gameState.weather);
  }, [gameState]);

  // 4 Hz Gameplay Simulation Timer
  useEffect(() => {
    if (gameState.phase !== 'playing') return;
    const interval = window.setInterval(() => {
      setGameState((prev) => advanceSimulationTick(prev, 0.25));
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

      if (phase !== 'playing') return;

      if (e.code === 'Digit1') handleSelectStation(1);
      else if (e.code === 'Digit2') handleSelectStation(2);
      else if (e.code === 'Digit3') handleSelectStation(3);
      else if (e.code === 'Digit4') handleSelectStation(4);
      else if (e.code === 'Digit5') handleSelectStation(5);
      else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        const cur = gameStateRef.current.activeStation;
        const prevSt = (cur > 1 ? cur - 1 : 5) as BaristaStationId;
        handleSelectStation(prevSt);
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        const cur = gameStateRef.current.activeStation;
        const nextSt = (cur < 5 ? cur + 1 : 1) as BaristaStationId;
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
        spotifyManager.togglePlayPause();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal, handleCupAction, handleSelectStation, handleStartShift, pwaStatus.appVersion]);

  const handleChangeWeather = (weather: WeatherMode) => {
    soundEngine.init();
    soundEngine.playCeramicClink(1.05);
    soundEngine.setRainAmbience(true, weather);
    setGameState((prev) => ({ ...prev, weather }));
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
        ? 'Realism Mode Enabled: Step shortcuts hidden. Rely on Recipe Codex & touch 3D equipment directly!'
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

  const shouldRenderWebSpotifyEmbed =
    pwaStatus.appVersion !== 'apk' && !pwaStatus.isOffline;

  return (
    <main
      data-landscape-enforced={isPortraitRotated ? 'rotated-90' : 'native-landscape'}
      data-weather={gameState.weather}
      className={`bg-[#090705] select-none ${
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
            <h2 className="text-lg font-bold font-display text-[#FAF5EE] glass-text-crisp">
              3D Graphics Recovery Mode
            </h2>
            <p className="text-xs text-[#E7D7C1]">{webglError}</p>
            <button
              type="button"
              onClick={handleClearSwCacheAndReload}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-105 text-[#160E09] font-bold text-xs cursor-pointer shadow-lg"
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

      {/* Living 3D Title Card Overlay */}
      {!isLoading && gameState.phase === 'title' && (
        <TitleScreen
          day={gameState.day}
          cash={gameState.cash}
          weather={gameState.weather}
          graphicsQuality={gameState.graphicsQuality}
          pwaStatus={pwaStatus}
          spotifyTrackTitle={spotifyState.currentTrack.title}
          onStartShift={handleStartShift}
          onChangeWeather={handleChangeWeather}
          onChangeGraphics={handleChangeGraphics}
          onOpenSpotifyModal={() => setActiveModal('spotify')}
          onOpenPwaModal={() => setActiveModal('pwa')}
          onOpenCodeExportModal={() => setActiveModal('export')}
        />
      )}

      {/* Active Barista POV HUD Overlay */}
      {!isLoading && gameState.phase !== 'title' && (
        <HudOverlay
          gameState={gameState}
          spotifyState={spotifyState}
          appVersion={pwaStatus.appVersion}
          isMuted={isMuted}
          hoveredToolLabel={hoveredToolLabel}
          fps={fps}
          activeAnimLabel={activeAnimLabel}
          stepProgress={stepProgress}
          stepDurationMs={stepDurationMs}
          hudPinnedRecipeId={hudPinnedRecipeId}
          isPinnedRecipeMinimized={isPinnedRecipeMinimized}
          onToggleMinimizePinnedRecipe={() =>
            setIsPinnedRecipeMinimized((prev) => !prev)
          }
          onUnpinHudRecipe={() => {
            setHudPinnedRecipeId(null);
            setIsPinnedRecipeMinimized(false);
          }}
          onSelectStation={handleSelectStation}
          onPinOrder={(orderId) =>
            setGameState((prev) => ({ ...prev, pinnedOrderId: orderId }))
          }
          onCupAction={handleCupAction}
          onServeCustomer={handleServeCustomer}
          onToggleMute={handleToggleMute}
          onTogglePause={() =>
            setGameState((prev) => ({
              ...prev,
              phase: prev.phase === 'playing' ? 'paused' : 'playing',
            }))
          }
          onToggleVinyl={() => spotifyManager.togglePlayPause()}
          onChangeGraphics={handleChangeGraphics}
          onToggleRealismMode={handleToggleRealismMode}
          onRequestFullscreenLandscape={handleRequestFullscreenLandscape}
          onOpenModal={(modal) => setActiveModal(modal)}
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
              soundEngine.playCeramicClink(1.18);
              if (hudPinnedRecipeId === recipeId) {
                setHudPinnedRecipeId(null);
                setIsPinnedRecipeMinimized(false);
              } else {
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
          onUpdateDecor={handleUpdateDecor}
          onUpdateWeather={handleChangeWeather}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'spotify' && (
        <SpotifyVinylModal
          spotifyState={spotifyState}
          appVersion={pwaStatus.appVersion}
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

      {/* PERSISTENT SPOTIFY WEB EMBED PLAYER (Mounted ONLY for Live Web & PWA when online; APK uses Phone Spotify App + Internal Player) */}
      {shouldRenderWebSpotifyEmbed && (
        <div
          data-testid="persistent-spotify-embed-dock"
          className={
            activeModal === 'spotify' && spotifyState.mode === 'bridge'
              ? 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md rounded-xl overflow-hidden glass-modal border-emerald-400/50'
              : spotifyState.showMiniEmbed && gameState.phase !== 'title'
              ? 'fixed bottom-12 right-2.5 z-30 w-64 sm:w-72 rounded-xl overflow-hidden glass-panel border-emerald-400/40'
              : 'fixed -bottom-96 left-0 w-72 h-20 opacity-0 pointer-events-none overflow-hidden'
          }
        >
          {spotifyState.showMiniEmbed && activeModal !== 'spotify' && (
            <div className="flex items-center justify-between px-2.5 py-1 bg-black/45 border-b border-amber-500/20 text-[10px] text-emerald-300 font-semibold glass-text-crisp">
              <span className="truncate flex items-center gap-1">
                <Disc3 className="w-3 h-3 shrink-0" />
                <span>{spotifyState.currentTrack.title}</span>
              </span>
              <button
                type="button"
                onClick={() => spotifyManager.setShowMiniEmbed(false)}
                className="text-stone-400 hover:text-white cursor-pointer ml-2"
                title="Hide Mini Window (Audio Keeps Playing!)"
              >
                Minimize
              </button>
            </div>
          )}
          <iframe
            title="Spotify Vinyl Player"
            src={spotifyState.currentTrack.embedUrl}
            width="100%"
            height="80"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        </div>
      )}
    </main>
  );
}
