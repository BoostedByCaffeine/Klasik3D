import { useCallback, useEffect, useRef, useState } from 'react';
import { BizUpgradesModal } from './components/BizUpgradesModal';
import { CodeExportModal } from './components/CodeExportModal';
import { CustomizeModal } from './components/CustomizeModal';
import { HudOverlay } from './components/HudOverlay';
import { LoadingScreen } from './components/LoadingScreen';
import { PwaApkModal } from './components/PwaApkModal';
import { RecipeMenuModal } from './components/RecipeMenuModal';
import { SpotifyVinylModal } from './components/SpotifyVinylModal';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import {
  BaristaStationId,
  DecorCustomization,
  GameMode,
  GraphicsQuality,
  KlasikGameState,
  RECIPES,
  SyrupFlavor,
  WeatherMode,
  advanceSimulationTick,
  createInitialGameState,
  getEffectiveRecipeForOrder,
  getNextRecommendedStep,
  getRecipeById,
  loadGameFromStorage,
  performCupAction,
  purchaseUpgrade,
  saveGameToStorage,
  serveCurrentCupToCustomer,
  startNextDayShift,
} from './game/rules';
import { KlasikCafeScene3D, StepAnimType } from './game/scene3d';
import { soundEngine } from './game/sound';
import { spotifyManager, SpotifyVinylState } from './game/spotifyManager';
import { pwaManager, PwaEnvironmentStatus } from './pwa/pwaManager';

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

  const [isLoading, setIsLoading] = useState<boolean>(!isAutostart);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [isPortraitRotated, setIsPortraitRotated] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );
  const [gameState, setGameState] = useState<KlasikGameState>(() => {
    const saved = loadGameFromStorage();
    const initial = saved || createInitialGameState();
    if (isAutostart) {
      return { ...initial, phase: 'playing' };
    }
    return { ...initial, phase: 'title' };
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
  const [fps, setFps] = useState<number>(60);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<KlasikCafeScene3D | null>(null);
  const animTimerRef = useRef<number | null>(null);
  const gameStateRef = useRef<KlasikGameState>(gameState);
  gameStateRef.current = gameState;

  // Enforce strict Landscape Viewport detection across all devices
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortraitRotated(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Mirror phase to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState.phase;
    saveGameToStorage(gameState);
  }, [gameState]);

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

  const flashAnimBanner = useCallback((label: string, durationMs = 1100) => {
    setActiveAnimLabel(label);
    if (animTimerRef.current) {
      window.clearTimeout(animTimerRef.current);
    }
    animTimerRef.current = window.setTimeout(() => {
      setActiveAnimLabel(null);
    }, durationMs);
  }, []);

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
      soundEngine.playCashRegister();

      const prev = gameStateRef.current;
      const next = serveCurrentCupToCustomer(prev, customerId);
      const earned = Math.max(0, Math.round(next.cash - prev.cash));
      setGameState(next);

      // Update scene state immediately so the served customer walks to the Pickup Counter
      sceneRef.current?.updateGameState(next);
      sceneRef.current?.triggerStepAnimation(
        'serve_drink',
        undefined,
        earned > 0 ? `+$${earned} SERVED!` : 'SERVED!'
      );
      flashAnimBanner(next.lastActionFeedback, 1550);
    },
    [flashAnimBanner]
  );

  const handleCupAction = useCallback(
    (
      action:
        | 'grind'
        | 'tamp'
        | 'pull_espresso'
        | 'steam_milk'
        | 'add_ice'
        | 'add_syrup'
        | 'rinse_cup'
        | 'quick_brew_step',
      syrupFlavor?: SyrupFlavor
    ) => {
      soundEngine.init();

      const curState = gameStateRef.current;
      let resolvedStep: StepAnimType = 'grind';
      let resolvedFlavor: SyrupFlavor | undefined = syrupFlavor;

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
        if (step.toolKey === 'serve') {
          handleServeCustomer();
          return;
        }
        if (step.toolKey === 'grinder') resolvedStep = 'grind';
        else if (step.toolKey === 'tamper') resolvedStep = 'tamp';
        else if (step.toolKey === 'espresso') resolvedStep = 'pull_espresso';
        else if (step.toolKey === 'milk') resolvedStep = 'steam_milk';
        else if (step.toolKey === 'ice') resolvedStep = 'add_ice';
        else if (step.toolKey === 'syrup') {
          resolvedStep = 'add_syrup';
          resolvedFlavor = effectiveRecipe.syrup;
        }
      } else {
        resolvedStep = action;
      }

      if (resolvedStep === 'grind') {
        soundEngine.playGrind(0.95);
        flashAnimBanner('Grinding 18g Fresh Dark-Roast Beans...', 1150);
      } else if (resolvedStep === 'tamp') {
        soundEngine.playTamp();
        flashAnimBanner('Tamping Coffee Puck at 30 lbs...', 1050);
      } else if (resolvedStep === 'pull_espresso') {
        soundEngine.playEspressoPump(1.25);
        flashAnimBanner('Extracting 9-Bar Double Espresso Shot...', 1400);
      } else if (resolvedStep === 'steam_milk') {
        soundEngine.playSteamHiss(1.1);
        flashAnimBanner('Steaming 65°C Microfoam & Pouring Rosetta Latte Art...', 1400);
      } else if (resolvedStep === 'add_ice') {
        soundEngine.playCeramicClink(1.18);
        flashAnimBanner('Scooping Crystal Ice Cubes into Cup...', 950);
      } else if (resolvedStep === 'add_syrup') {
        soundEngine.playCeramicClink(1.12);
        flashAnimBanner(
          resolvedFlavor === 'matcha'
            ? 'Whisking Ceremonial Uji Matcha in Chawan...'
            : `Pumping ${resolvedFlavor || 'Artisan'} Syrup Infusion...`,
          1050
        );
      } else {
        soundEngine.playCeramicClink(1.0);
        flashAnimBanner('Rinsed Cup & Knocked Spent Puck into Knock Box', 750);
      }

      const nextState = performCupAction(curState, action, syrupFlavor);
      sceneRef.current?.updateGameState(nextState);
      sceneRef.current?.triggerStepAnimation(resolvedStep, resolvedFlavor);
      setGameState(nextState);
    },
    [flashAnimBanner, handleServeCustomer]
  );

  const handleStartShift = useCallback((mode: GameMode) => {
    soundEngine.init();
    soundEngine.playCashRegister();
    soundEngine.setLofiSynthActive(spotifyManager.getState().isPlaying);
    sceneRef.current?.resetCameraOffsets();
    document.body.dataset.state = 'playing';

    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (mode: string) => Promise<void>;
      };
      orientation?.lock?.('landscape')?.catch(() => {});
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

  // Mount Three.js WebGLRenderer once in isolated container (wrapped in safe try/catch)
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    let scene: KlasikCafeScene3D | null = null;
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
        }
      );
      sceneRef.current = scene;
      setWebglError(null);
    } catch (err) {
      setWebglError(
        err instanceof Error
          ? err.message
          : 'WebGL 3D context could not be initialized on this device.'
      );
    }

    return () => {
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [handleCupAction, handleSelectStation, handleServeCustomer]);

  // Sync gameState changes to Three.js scene
  useEffect(() => {
    sceneRef.current?.updateGameState(gameState);
    soundEngine.setRainAmbience(
      gameState.weather === 'rainy' && gameState.phase === 'playing'
    );
  }, [gameState]);

  // 4 Hz Gameplay Simulation Timer
  useEffect(() => {
    if (gameState.phase !== 'playing') return;
    const interval = window.setInterval(() => {
      setGameState((prev) => advanceSimulationTick(prev, 0.25));
    }, 250);
    return () => window.clearInterval(interval);
  }, [gameState.phase]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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
        e.preventDefault();
        handleCupAction('quick_brew_step');
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        handleCupAction('grind');
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        handleCupAction('tamp');
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        handleCupAction('pull_espresso');
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        handleCupAction('steam_milk');
      } else if (e.code === 'KeyI') {
        e.preventDefault();
        handleCupAction('add_ice');
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        handleCupAction('rinse_cup');
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        spotifyManager.togglePlayPause();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal, handleCupAction, handleSelectStation, handleStartShift]);

  const handleChangeWeather = (weather: WeatherMode) => {
    soundEngine.playCeramicClink(1.05);
    setGameState((prev) => ({ ...prev, weather }));
  };

  const handleUpdateDecor = (decor: DecorCustomization) => {
    soundEngine.playCeramicClink(1.1);
    setGameState((prev) => ({ ...prev, decor }));
  };

  const handleChangeGraphics = (graphicsQuality: GraphicsQuality) => {
    setGameState((prev) => ({ ...prev, graphicsQuality }));
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
      className={`bg-[#140e0b] select-none ${
        isPortraitRotated ? 'klasik-root-portrait-rotated' : 'klasik-root-landscape'
      }`}
    >
      {/* Isolated Full-Bleed WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="klasik-3d-canvas-container"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* Safe On-Screen Recovery Fallback if WebGL or Service Worker Encounters an Error */}
      {webglError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 p-4">
          <div className="max-w-md w-full bg-[#1b120d] border border-amber-500/40 rounded-2xl p-5 text-center space-y-3 shadow-2xl">
            <h2 className="text-lg font-bold font-display text-amber-100">
              3D Graphics Recovery Mode
            </h2>
            <p className="text-xs text-stone-300">{webglError}</p>
            <button
              type="button"
              onClick={handleClearSwCacheAndReload}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer"
            >
              Reset Cache &amp; Reload Cafe
            </button>
          </div>
        </div>
      )}

      {/* Cozy Studio Preloader Splash */}
      {isLoading && <LoadingScreen onFinished={() => setIsLoading(false)} />}

      {/* Living 3D Title Card Overlay */}
      {!isLoading && gameState.phase === 'title' && (
        <TitleScreen
          day={gameState.day}
          cash={gameState.cash}
          weather={gameState.weather}
          pwaStatus={pwaStatus}
          spotifyTrackTitle={spotifyState.currentTrack.title}
          onStartShift={handleStartShift}
          onChangeWeather={handleChangeWeather}
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
          isMuted={isMuted}
          hoveredToolLabel={hoveredToolLabel}
          fps={fps}
          activeAnimLabel={activeAnimLabel}
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
          onRequestFullscreenLandscape={handleRequestFullscreenLandscape}
          onOpenModal={(modal) => setActiveModal(modal)}
        />
      )}

      {/* Outcome-Matched Pause / Victory / Shift Over Modal */}
      {(gameState.phase === 'paused' || gameState.phase === 'gameover') && !activeModal && (
        <StatusModal
          gameState={gameState}
          onResume={() => setGameState((prev) => ({ ...prev, phase: 'playing' }))}
          onNextDayOrRetry={() => setGameState((prev) => startNextDayShift(prev))}
          onReturnToTitle={() => setGameState((prev) => ({ ...prev, phase: 'title' }))}
          onOpenSaveExport={() => setActiveModal('export')}
        />
      )}

      {/* Cafe Management & Spotify Vinyl Modals */}
      {activeModal === 'recipes' && (
        <RecipeMenuModal
          currentDay={gameState.day}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'upgrades' && (
        <BizUpgradesModal
          cash={gameState.cash}
          upgrades={gameState.upgrades}
          onPurchase={(upgradeId) => {
            soundEngine.playCashRegister();
            setGameState((prev) => purchaseUpgrade(prev, upgradeId));
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
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'pwa' && (
        <PwaApkModal
          pwaStatus={pwaStatus}
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
    </main>
  );
}
