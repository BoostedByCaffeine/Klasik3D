# Klasik 3D — Realism & Low-End Performance Optimization Plan

This phased engineering specification addresses six high-impact realism, anti-exploit, atmosphere, and mobile performance upgrades across `src/App.tsx`, `src/game/rules.ts`, `src/game/scene3d.ts`, `src/components/HudOverlay.tsx`, `src/components/RecipeMenuModal.tsx`, `src/components/LoadingScreen.tsx`, and `src/index.css`.

---

## Executive Summary & Architecture Map

| Phase | Feature / Issue Addressed | Root Cause / Current Gap | Primary Target Files |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Diegetic POS-Screen Barista Codex** | `RecipeMenuModal` floats as a cramped modal overlay (`image_7d1a4c.jpg`) disconnected from the 3D cafe counter. | `src/game/scene3d.ts`, `src/components/RecipeMenuModal.tsx`, `src/App.tsx`, `src/components/HudOverlay.tsx` |
| **Phase 2** | **Step-Shortcut Anti-Exploit Lock** | Bottom gold lightning button (`⚡ Grind`, `⚡ Tea`, etc.) and `Space` key can be rapidly tapped to bypass brew/steep step durations. | `src/game/rules.ts`, `src/components/HudOverlay.tsx`, `src/App.tsx` |
| **Phase 3** | **Cafe Entrance Door, Collision-Free Pathing & Exterior Hanging Sign** | Customers spawn inside with no door, walk through obstacles, and the huge indoor `KLASIK 3D` sign clips into the top HUD bar (`image_7d1a69.jpg`). | `src/game/scene3d.ts` |
| **Phase 4** | **Outdoor Street, Highway, Full-Quality Pedestrians & Traffic** | Exterior behind the glass wall is empty static greenery with no living neighborhood ambiance. | `src/game/scene3d.ts` |
| **Phase 5** | **Realistic Weather (Outdoor-Only Rain) & Golden Hour God-Ray Shaders** | Rain falls inside the shop with frozen outdoor droplets (`image_7d1a87.jpg`); Golden Hour only applies a flat orange tint (`image_7d1aa6.jpg`). | `src/game/scene3d.ts` |
| **Phase 6** | **Low-End Android Optimization & 60 FPS Splash Screen** | Synchronous Three.js boot and shader compilation block the main thread during the Crema Ring studio logo animation, causing severe frame drops/freezes. | `src/App.tsx`, `src/components/LoadingScreen.tsx`, `src/game/scene3d.ts`, `src/index.css` |

---

## Phase 1: Diegetic POS-Screen Barista Codex (Camera Zoom + Embedded Terminal UI)

Replace the floating small recipe modal with a **diegetic in-world POS terminal experience** anchored to the counter register screen on the left side of Station 1/4 (`image_7d1a69.jpg`).

### 1.1 Dedicated 3D Camera Focus Target (`src/game/scene3d.ts`)
1. Expose `setCodexFocusMode(active: boolean)` on `CafeScene3D` (and an optional `onCodexCameraSettled` callback).
2. Add a `'codex'` camera preset targeting the counter POS monitor screen directly:
   * **POS Monitor World Center:** Compute dynamically from `this.posScreenMesh.getWorldPosition(targetVec)` and its surface normal so the camera aligns dead-center to the angled bezel.
   * **Camera Position:** Offset `~0.42m` along the POS screen's forward normal so the matte-dark POS monitor bezel fills **~82% of the landscape viewport**, framing the screen naturally with the wooden counter, pastry display edge, and blurred 3D cafe background still visible around the edges.
   * **Smooth Cinematic Pan/Zoom:** Interpolate `camera.position` and `cameraLookAt` with cubic easing (`lerpFactor = 1 - Math.exp(-9 * dt)`) over `~320ms`.
   * **Interactive Raycast Trigger:** Allow players to open the Barista Codex either by **tapping directly on the 3D POS screen** on the counter or clicking the Codex/Recipes icon in the HUD/Menu.
   * **Idle Screen Preview Texture:** When closed, render a sharp `CanvasTexture` on the 3D POS screen showing `"KLASIK POS · TAP FOR BARISTA CODEX"` with a tiny live order counter instead of a blank flat green rectangle.

### 1.2 Diegetic POS Terminal UI (`src/components/RecipeMenuModal.tsx`)
When `showRecipeMenu === true` and the camera zooms into the POS monitor:
* **Framing:** Render the Codex inside a sleek **terminal bezel frame** positioned directly over the zoomed 3D POS screen (`max-w-[78vw] max-h-[76dvh]`, rounded inner display glass, subtle CRT/LCD scanline warmth, amber-emerald terminal accents, and no heavy full-screen dark backdrop that hides the 3D world).
* **High-Readability Layout (Fixing Small Text):**
  * **Left Rail (Category Tabs — Touch Friendly):** Large vertical pill buttons (`All (16)`, `Hot Coffee`, `Iced Coffee`, `Artisanal Tea`, `Cold Refreshers`) with `min-h-[42px]` and `text-sm sm:text-base`.
  * **Right Main Pane (Large Recipe Cards):** Clean 1-column on small phones / 2-column on wide screens with:
    * Bold drink title (`16px–18px`) + clear price badge (`$5`–`$8`).
    * **Visual Step Pipeline Chips:** Replace cramped raw monospace strings (`1. Grind -> 2. Tamp -> 3. Pull Shot`) with scannable color-coded step badges (`[1. Grind] → [2. Tamp] → [3. Pull] → [4. Steam] → [5. Serve]`) + station tag (`St. 2`, `St. 3`, etc.) and live highlight if the recipe matches the **currently selected customer's active order**.
  * **Exit Action:** Prominent `"← Return to Counter"` button (plus `Esc` key and clicking outside the bezel) smoothly zooms the 3D camera back to the player's previous station.

---

## Phase 2: Eliminate Rapid-Tap Step-Shortcut Exploit (`⚡ Gold Button` & `Space`)

### 2.1 Root Cause Audit
In `src/components/HudOverlay.tsx` and `src/App.tsx`, tapping the bottom gold quick-action button (`⚡ Grind`, `⚡ Tamp`, `⚡ Shot`, `⚡ Tea`, etc.) or hammering `Space` immediately invokes the next game-state transition without waiting for the timed step duration (grinding beans, pulling a 9-bar espresso shot, steaming milk microfoam, or steeping tea) to finish.

### 2.2 Authoritative Timed-Action State Machine (`src/game/rules.ts`)
Introduce a single authoritative `activeStepLock` object inside `GameState` (or synchronized engine timer in `rules.ts`):

```ts
export interface ActiveStepAction {
  actionType: BaristaActionType; // 'grind' | 'tamp' | 'pull-shot' | 'steam-milk' | 'steep-tea' | 'add-ice' | 'add-syrup' | 'serve'
  startedAtMs: number;
  durationMs: number;
  targetStation: StationId;
  label: string;
}

export const STEP_DURATIONS_MS: Record<BaristaActionType, number> = {
  grind: 1400,
  tamp: 650,
  'pull-shot': 2200,
  'steam-milk': 1900,
  'steep-tea': 1800,
  'add-ice': 550,
  'add-syrup': 500,
  'add-pastry': 450,
  rinse: 700,
  serve: 450,
};
```

1. **Single-Flight Enforcement in `rules.ts`:**
   * Add a guard at the top of **every** step execution function (`performBrewStep`, `executeRecommendedAction`, etc.):
     ```ts
     if (state.activeStepLock && nowMs < state.activeStepLock.startedAtMs + state.activeStepLock.durationMs) {
       return state; // Reject spam tap while current physical machine step is running
     }
     ```
   * **Upgrade Scaling Compatibility:** Purchased speed upgrades (e.g., Commercial Dual-Boiler, Precision Burr Grinder) cleanly reduce `durationMs` via a capped multiplier (`Math.max(0.55, speedMultiplier)`), preserving progression without ever allowing `0ms` instant spam.
   * **Two-Phase Commit (Start -> Complete):**
     * **On Press:** Lock the action (`activeStepLock = { ... }`), trigger the 3D machine animation (grinder whirring, espresso stream pouring, steam wand frothing, teapot steeping) and matching WebAudio sound effect.
     * **On Timer Completion:** Automatically commit the step result to the cup/order state, unlock `activeStepLock = null`, play a subtle completion chime/haptic tick, and advance the recommended next-step prompt.
2. **Synchronized UI Feedback (`src/components/HudOverlay.tsx` & `src/App.tsx`):**
   * **Gold Lightning Button (`⚡`):** While `activeStepLock` is active:
     * Set `disabled={true}` and `aria-busy="true"`.
     * Render a smooth **real-time amber progress fill bar** sliding across the inside of the gold button (`0% -> 100%` over `durationMs`) with live label (`Brewing Shot...`, `Grinding Beans...`, `Steeping Tea...`).
     * Ignore `Space` / `Enter` keydown events (`if (e.repeat || gameState.activeStepLock) return;`) and ignore taps on the individual station step buttons (`1. Grind`, `2. Tamp`, `3. Shot`, `Serve`) until the active physical action completes.

---

## Phase 3: Cafe Entrance Door, Collision-Free Customer Entry & Exterior Hanging Signage

### 3.1 Articulated Cafe Entrance Door (`src/game/scene3d.ts`)
1. **Structural Doorway Cutout:** Convert the center-left glass garage bay panel (at `x = -1.15, z = -6.15`, aligned cleanly with the open walkway between the Miata showroom plinth and the bistro seating grid) into a real **black-steel framed glass cafe entrance door**:
   * **Door Frame:** Heavy matte-black steel jambs, overhead transom window, and warm timber threshold plate.
   * **Pivoting Door Leaf (`this.entranceDoorPivot`):** Hinged on the left jamb (`x = -1.72, z = -6.15`), built with full-height clear glass, horizontal brushed-brass push/pull bar handle, small brass `"OPEN"` plaque, and a hanging brass shopkeeper bell above the header.
2. **Proximity Auto-Swing & Door Chime:**
   * In `updateCustomerAnimations(dt)`, measure minimum distance from any entering/exiting customer to the doorway `(x = -1.15, z = -6.15)`.
   * When a customer is within `1.55m` of the door, smoothly pivot `entranceDoorPivot.rotation.y` open (`0 -> +1.35 rad`) with damped spring easing and trigger a soft brass shop-bell chime (`sound.playDoorChime()`) once on open; smoothly close (`-> 0 rad`) with a hydraulic closer feel once clear.

### 3.2 Obstacle-Aware Pathfinding & Queue Spacing (`src/game/scene3d.ts`)
Eliminate customers clipping through the Miata, bistro tables, chairs, or each other:
1. **Full Lifecycle Navigation Graph:**
   * **Spawn Outside on Sidewalk:** Customers spawn on the exterior sidewalk (`x = -6.5` or `+6.5`, `z = -7.6`) and walk to the exterior doorway approach (`x = -1.15, z = -7.15`).
   * **Enter Through Door:** Walk straight through the open door (`x = -1.15, z = -5.4`) into the central interior aisle.
   * **Approach Service Counter:** Follow obstacle-free aisle waypoints (`z = -5.4 -> z = -3.8 -> z = -2.1 -> queueSlot[i]`) strictly keeping `x ∈ [-1.35, -0.35]` until reaching the counter queue.
   * **Queue Separation:** Assign distinct physical queue slots spaced `0.78m` apart along the counter approach (`Slot 0` at counter, `Slot 1` stepped back diagonally, `Slot 2` stepped back further) so queued patrons never overlap shoulders.
2. **Lightweight 2D Circle Obstacle Avoidance (Zero Pathfinding Overhead):**
   * Precompute a static array of 2D circular/AABB colliders at scene init (`MIATA_BAY`, each bistro table + chair footprint, counter front apron, planter boxes).
   * During movement, apply a cheap 2D repulsion/sliding tangent vector against static colliders and nearby `customerActors` (`minSeparation = 0.62m`) so customers naturally steer around furniture and one another at negligible CPU cost (`O(N)` with `N <= 8`).

### 3.3 Relocate Oversized Indoor Counter Sign -> Exterior Hanging Blade Signage (`src/game/scene3d.ts`)
1. **Remove Indoor Counter Sign:** Completely remove `this.hangingSignGroup` from above the espresso counter (freeing up the top HUD visibility shown blocked in `image_7d1a69.jpg` and opening up the sightline through the glass garage wall).
2. **Mount Exterior Hanging Blade Sign Pointing to the Shop:**
   * Attach a stylish **perpendicular wrought-iron / matte-black steel bracket** to the exterior facade pillar right beside the cafe entrance (`x = -2.05, y = 2.65, z = -6.55`, projecting outward toward the sidewalk along `-Z` / angled slightly at `~25°` so it is clearly legible both from inside looking out and to passing street traffic).
   * Hang a **double-sided framed neon-rimmed wooden/steel blade sign** displaying:
     * The Yin-Yang Leaf & Cappuccino emblem + **`KLASIK 3D`**
     * Subtitle **`GARAGE GARDEN CAFE`**
     * A glowing amber **directional arrow (`↓ ENTRANCE` / `→`)** pointing cleanly toward the glass cafe door.
   * Keep full `decor.neonSignColor` customization support (`amber`, `emerald`, `rose`, `cyber-cyan`, `violet-dream`) wired to this exterior hanging sign's neon border, point light, and texture redraw, plus a subtle gentle wind sway animation (`rotation.z = Math.sin(t * 1.4) * 0.025`, amplified slightly during `Rainy Roof`).

---

## Phase 4: Outdoor Neighborhood Realism (Sidewalk, Busy Street, Highway, Full-Quality NPCs & Passing Cars)

Build a living, cohesive exterior streetscape visible beyond the glass garage bay doors (`z = -6.5` to `z = -28.0`) engineered with **strict fixed-pool zero-GC rendering**.

### 4.1 Exterior Layered Street & Highway Architecture (`src/game/scene3d.ts`)
* **Layer 1 — Cafe Patio & Sidewalk (`z = -6.5` to `-9.2`):** Paved stone garden patio, low cedar planter borders, warm minimalist streetlamp posts, and a raised concrete pedestrian sidewalk with painted curb edge.
* **Layer 2 — Two-Lane Neighborhood Avenue (`z = -9.2` to `-15.8`):** Dark weathered asphalt road (`CanvasTexture` with dashed center line, crosswalk stripes near the cafe corner, and wet specular response during `Rainy Roof`), opposite sidewalk, and low-poly neighborhood shopfront/tree silhouettes framing the horizon.
* **Layer 3 — Distant Elevated City Highway / Overpass (`z = -21.5`, `y = 2.6`):** Sleek concrete viaduct pillars, steel guardrails, warm highway sodium/LED light poles, and distant fast-moving silhouette traffic beams that sell deep urban atmosphere without heavy geometry.

### 4.2 Full-Quality Pooled Sidewalk Pedestrians (Same Rig as Customers)
* **Visual Parity Requirement:** Do **NOT** create simplified stick/box NPCs. Instantiate passersby using the exact same `createCustomerCharacter()` factory (sculpted heads, expressive eyes, complete 3D hats/hairstyles, active Customer Skin Pack outfits, and articulated bipedal walk cycle).
* **Strict Fixed Object Pool (Zero Runtime Allocations):**
  * Pre-allocate a small fixed pool at boot:
    * **`GFX: LOW`:** `2` sidewalk NPCs
    * **`GFX: MEDIUM`:** `3` sidewalk NPCs
    * **`GFX: HIGH / MAX`:** `5` sidewalk NPCs
  * Each NPC walks steadily along either the near sidewalk (`z = -8.2`, heading `+X` or `-X`) or far sidewalk (`z = -16.4`) using the exact same ground-speed-synced bipedal walk cycle (`walkPhase`, leg stride, arm swing, vertical bounce).
  * Upon reaching `x = ±14.5`, recycle the NPC seamlessly to the opposite end with a randomized speed (`0.95–1.35 m/s`), lane offset, and occasional pause/glance toward the cafe window—**never** calling `new THREE.Mesh()` or `dispose()` during gameplay.

### 4.3 Highly Optimized Passing Street & Highway Vehicles
* **Shared Geometry & Instanced/Pooled Vehicle Fleet:**
  * Build 4 stylized low-poly vehicle templates matching Klasik 3D's clean artisan aesthetic (matching the Miata's art direction): **Compact Hatchback**, **Japanese Kei Delivery Van**, **Retro Sedan**, and **Sport Coupe**.
  * Merge each car chassis into minimal draw calls (1 body mesh using vertex colors or 4 shared matte/glossy car paints + 1 dark glass/trim mesh + 1 shared emissive headlight/taillight mesh + 4 instanced wheels).
  * **Strict Fixed Pool:**
    * **`GFX: LOW`:** `2` active street cars (1 per lane) + `2` distant highway cars
    * **`GFX: MEDIUM`:** `4` active street cars + `3` highway cars
    * **`GFX: HIGH / MAX`:** `6` active street cars + `4` highway cars
  * **Zero Shadows & Zero Allocations:** Traffic vehicles never cast shadow maps (`castShadow = false`), travel smoothly along `x ∈ [-24, +24]` with staggered respawn intervals so traffic feels natural and never bunches up, and automatically brighten their warm headlight beams and red taillights during **Golden Hour** and **Rainy Roof**.

---

## Phase 5: Realistic Weather (Outdoor-Only Rain) & Golden Hour Volumetric God-Ray Shaders

### 5.1 Fix Indoor Rain Leak & Frozen Outdoor Droplets (`image_7d1a87.jpg`)
1. **Strict Exterior Spatial Clipping:**
   * Audit every rain emitter and particle spawn bound in `src/game/scene3d.ts`. Currently rain particles spawn across `z ∈ [-10, +4]`, causing streaks to fall directly inside the coffee shop in front of the espresso machine and customers!
   * Constrain **100%** of 3D falling rain particles strictly to the exterior volume:
     * `z ∈ [-18.5, -6.55]` (guaranteed outside the `z = -6.15` glass garage wall and exterior awning drip-line)
     * `x ∈ [-14.0, +14.0]`
     * `y ∈ [0.0, 9.5]`
2. **Eliminate Frozen Raindrops:**
   * Inspect why raindrops freeze outdoors in `image_7d1a87.jpg` (caused by either `rainSystem.visible = true` while its update block is skipped under `graphicsQuality === 'low'`, or static decorative raindrop meshes placed near the window that never animate, or missing `geometry.attributes.position.needsUpdate = true`).
   * **Fix:**
     * Use a single ultra-fast GPU `THREE.InstancedMesh` or `THREE.LineSegments` rain curtain updated via a lightweight **vertex shader** (`uTime` uniform driving downward fall `mod(pos.y - uTime * speed, height)` and slight wind slant directly on the GPU!).
     * GPU-driven rain uses **zero CPU per-particle loops**, guarantees **zero frozen droplets** at every graphics tier, and scales drop count cleanly (`180` drops on `LOW`, `420` on `MED`, `850` on `HIGH/MAX`).
3. **Exterior Glass Rain Streaks & Wet Asphalt:**
   * On the exterior side of the glass garage doors, apply a subtle animated rain-trail alpha layer (scrolling procedural `CanvasTexture` UV offset `v += dt * 0.35`) when `weather === 'rain'`, and lower outdoor road/sidewalk roughness (`0.85 -> 0.22`) so streetlamps and passing car taillights reflect realistically on the wet pavement.

### 5.2 Cinematic Golden Hour Lighting & Volumetric God-Ray Shaders (`image_7d1aa6.jpg`)
Replace the flat orange background tint with a multi-layered, mobile-friendly Golden Hour atmosphere:
1. **Custom Procedural Sky Dome Shader (`ShaderMaterial`):**
   * Render a lightweight sky sphere behind the streetscape with a smooth 3-stop atmospheric scattering gradient:
     * **Morning Sun:** Crisp azure zenith (`#4a90d9`) -> soft powder blue (`#a6d4fa`) -> warm pale horizon (`#fff4e0`).
     * **Golden Hour:** Deep twilight cobalt-indigo zenith (`#24325c`) -> dusty rose-coral mid-sky (`#c96859`) -> molten honey-gold sun horizon (`#ffae42`) with a soft glowing sun disc positioned low behind the exterior trees (`azimuth ~ -28°`, `elevation ~ 13°`).
     * **Rainy Roof:** Moody overcast slate-blue (`#1e293b` -> `#475569` -> `#64748b`).
2. **Warm-Key / Cool-Fill Three-Point Lighting:**
   * **Directional Sun Key:** Position low and angled diagonally through the glass garage doors (`position.set(-11, 4.8, -14)`), casting rich warm golden light (`#ffba6b`, intensity `2.1`) across the espresso bar, porcelain cups, and 1990 Miata hood.
   * **Cool Shadow Hemisphere Fill:** Pair the warm sun with a cool violet-blue ambient bounce (`HemisphereLight(0xffd2a1, 0x3b3556, 0.72)`) so shadowed interior corners stay rich and dimensional instead of muddy flat orange.
   * **Interior Practicals Auto-Warmth:** Smoothly ramp up the brass pendant lamp emissive bulbs and warm interior fill lights as the cafe enters Golden Hour and Rainy Roof.
3. **Lightweight Volumetric God Rays (Additive Custom `ShaderMaterial`):**
   * Place **4–6 diagonal translucent light-shaft planes** streaming inward from the glass garage bay windows and overhead skylights along the exact directional sun vector during `Golden Hour` (and softer crisp shafts during `Morning Sun`, hidden during `Rainy Roof`).
   * **Custom Fragment Shader (Zero Post-Processing Cost):**
     ```glsl
     varying vec2 vUv;
     varying vec3 vNormal;
     varying vec3 vViewDir;
     uniform float uTime;
     uniform vec3 uColor;
     uniform float uOpacity;

     void main() {
       // Soft radial falloff across beam width & gradual fade toward floor
       float edgeFade = smoothstep(0.0, 0.28, vUv.x) * smoothstep(1.0, 0.72, vUv.x);
       float lengthFade = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.08, vUv.y);
       // Subtle animated sunbeam shimmer (dust/steam drift)
       float shimmer = 0.86 + 0.14 * sin(vUv.x * 12.0 + uTime * 0.45 + vUv.y * 4.0);
       // Fresnel grazing fade so planes never look like hard cardboard cards
       float viewFade = pow(abs(dot(normalize(vNormal), normalize(vViewDir))), 0.65);
       float alpha = edgeFade * lengthFade * shimmer * viewFade * uOpacity;
       gl_FragColor = vec4(uColor, alpha);
     }
     ```
   * Render with `transparent: true`, `depthWrite: false`, `blending: THREE.AdditiveBlending`, `side: THREE.DoubleSide`. Even on `GFX: LOW`, 3 simple shader quads cost `< 0.15ms` on mobile GPUs while delivering dramatic, realistic Golden Hour sunbeams!

---

## Phase 6: Deep Low-End Android Optimization & Silky 60 FPS Splash Screen

### 6.1 Root Cause of Studio Logo Frame Drops on Low-End Android
Currently, `src/App.tsx` mounts `<LoadingScreen />` and immediately runs `new CafeScene3D(...)` inside `useEffect` on frame 1. Building thousands of procedural geometries, drawing multiple `1024x1024` 2D CanvasTextures, uploading WebGL buffers, and synchronously compiling GLSL shaders locks the main UI thread for `800ms–2500ms`—causing the **Crema Ring** SVG stroke draw and rocket-cup bloom animation to freeze completely until it's already over.

### 6.2 Decoupled Zero-Contention Boot Pipeline (`src/App.tsx` & `src/components/LoadingScreen.tsx`)
Separate the splash animation from heavy WebGL construction so the studio logo **always runs at locked 60 FPS**:

| Boot Timeline | Main Thread Activity | Visual State |
| :--- | :--- | :--- |
| **`0ms – 1000ms`** *(Mobile/PWA/APK only)* | Pure lightweight DOM/CSS only. **Do NOT create `CafeScene3D` yet.** | `"Turn your phone into landscape"` indicator on `#090705`. |
| **`0ms – 1350ms`** *(Splash Entrance)* | Pure GPU-composited Crema Ring CSS/SVG entrance (`Ring Draw -> Rocket Cup Settle -> Steam Waves -> BOOSTED BY CAFFEINE Reveal`). **WebGL construction deferred!** | Butter-smooth 60 FPS studio logo entrance with zero main-thread stalls. |
| **`1350ms+`** *(Splash Idle Hold)* | Trigger **chunked progressive `CafeScene3D` boot** across multiple `requestAnimationFrame` slices (1. Renderer & Core Shell -> 2. Equipment & Counter -> 3. Customer & Outdoor Pools -> 4. First Render / Shader Warmup). | Subtle lightweight opacity breathing pulse on splash halo while 3D scene builds in background slices. |
| **Scene Ready + `>= 2350ms`** | Smooth `650ms` dim-and-fade splash exit -> reveal ready 3D Title Screen. | Zero stutter transition straight into gameplay. |

* **Splash GPU Compositing Polish (`src/index.css`):**
  * Promote only `.crema-ring`, `.rocket-cup`, `.thruster-flame`, and `.crema-wordmark-boosted` using `will-change: transform, opacity`.
  * **Remove `filter: drop-shadow(...)` animations** on `.thruster-flame` during keyframes on mobile/low-end devices (animating CSS `filter: drop-shadow` forces per-frame software rasterization repaints on budget Android GPUs!). Replace with a pre-blurred soft radial SVG `<circle>` glow layer animated strictly via GPU `opacity` and `transform: scale(...)`.

### 6.3 Low-End Android WebGL & UI Rendering Budget (`src/game/scene3d.ts` & `src/index.css`)
1. **Hardware Tier Auto-Guard (Default `LOW` First Boot):**
   * On `GFX: LOW`:
     * `pixelRatio = Math.min(window.devicePixelRatio || 1, 0.9)` (huge fragment-shader win on 1080p/1440p budget phones with tiny Mali/Adreno GPUs).
     * `antialias: false`, `powerPreference: 'default'`, `shadowMap.enabled = false`.
     * Reduce procedural `CanvasTexture` dimensions on `LOW` (`256x256` / `512x256` instead of `1024x1024`) to slash texture upload time and VRAM by ~75%.
     * Cap outdoor NPC pool to `2` pedestrians + `2` street cars + `2` distant highway cars, and cap rain GPU lines to `180`.
     * Skip `renderer.render()` when `document.hidden === true` or while a full-screen modal completely obscures the viewport.
2. **Draw-Call Reduction & Zero Per-Frame GC (`src/game/scene3d.ts`):**
   * **Merge Static Architecture:** Use `BufferGeometryUtils.mergeGeometries` (by shared material) for static walls, steel window mullions, floor tiles, rafters, exterior fence/curbs, and decorative planters to reduce draw calls from `250+` down to **`< 65`**.
   * **Reuse Scratch Math Objects:** Pre-allocate module/class-level scratch vectors (`this._tmpVecA`, `this._tmpVecB`, `this._tmpQuat`) and eliminate **all** `new THREE.Vector3()` / `new THREE.Color()` calls inside `animate()`, `updateCustomerAnimations()`, and `updateTraffic()` so V8/Android garbage collection never causes micro-stutters.
   * **Geometry/Material Instancing:** Use `THREE.InstancedMesh` for repeating interior slat beams, ceiling lights, exterior streetlamps, foliage fronds, and GPU rain streaks.
3. **Lightweight Glassmorphism Fallback for `GFX: LOW` (`src/index.css` & `src/App.tsx`):**
   * Real-time CSS `backdrop-filter: blur(18px)` over a full-screen 60fps WebGL canvas is one of the single heaviest GPU bottlenecks on budget Android Chrome/WebView devices (forces full-screen framebuffer copy + dual-pass Kawase blur every frame).
   * Add a root class `data-gfx="low"` on `document.documentElement` when `graphicsQuality === 'low'`:
     ```css
     /* On GFX: LOW, keep the exact warm smoked-glass aesthetic via layered gradients & specular rims
        without triggering expensive per-frame WebGL backdrop-filter readbacks */
     [data-gfx='low'] .glass-panel,
     [data-gfx='low'] .glass-pill,
     [data-gfx='low'] .glass-hud-btn {
       backdrop-filter: none !important;
       -webkit-backdrop-filter: none !important;
       background: linear-gradient(
         160deg,
         rgba(26, 17, 12, 0.90) 0%,
         rgba(15, 10, 7, 0.88) 100%
       );
     }
     ```
   * Keep full `backdrop-filter: blur(18px)` enabled automatically on `MEDIUM`, `HIGH`, and `MAX`!

---

## Phased Execution Order & Verification Checklist

1. **Step 1 — Boot & Performance Foundation (Phase 6):** Defer `CafeScene3D` boot until after the 1.35s Crema Ring entrance finishes, remove animated CSS `drop-shadow` filters on the splash, add `[data-gfx='low']` backdrop-blur bypass, and eliminate per-frame allocations.
2. **Step 2 — Gameplay Integrity & Diegetic Codex (Phases 1 & 2):** Enforce `activeStepLock` timers on `rules.ts` + gold lightning shortcut button progress fill; wire the 3D POS camera zoom and embedded terminal Barista Codex UI.
3. **Step 3 — Interior Flow & Exterior Signage (Phase 3):** Cut the swinging glass entrance door, route customer entry/queue/table pathfinding with 2D obstacle avoidance, remove the oversized indoor counter sign, and mount the exterior hanging blade sign pointing to the cafe.
4. **Step 4 — Living Streetscape & Realistic Weather/Lighting (Phases 4 & 5):** Build the outdoor sidewalk, 2-lane avenue, elevated highway, pooled full-quality pedestrians, and pooled traffic; lock GPU-driven rain strictly outdoors with window streaks; deploy the Golden Hour sky shader + additive volumetric god-ray light shafts.

### QA Acceptance Criteria
- [ ] **Diegetic Barista Codex:** Clicking the counter POS screen (or Codex menu button) smoothly zooms the 3D camera onto the POS monitor and displays a crisp, large, easy-to-read terminal UI embedded within the monitor framing; closing smoothly pans back to the active station.
- [ ] **No Shortcut Spam Exploit:** Rapidly tapping the gold `⚡` shortcut button or mashing `Space` cannot skip or stack steps; the button locks with a smooth real-time progress bar matching each step's physical duration in `rules.ts`.
- [ ] **Realistic Entry & Clean HUD Sightline:** Customers enter from the outdoor sidewalk through an animated swinging glass door with a chime, weave cleanly around the Miata, tables, chairs, and other patrons, and the oversized indoor counter sign is gone—relocated cleanly outside as a hanging directional blade sign.
- [ ] **Living Outdoor World:** Sidewalk pedestrians (full customer-quality models with fluid walking animations) and pooled stylized vehicles cruise past the street and elevated highway with zero frame spikes.
- [ ] **Realistic Rain & Golden Hour:** Rain falls **strictly outdoors** with smooth GPU motion (zero indoor rain, zero frozen droplets) plus animated glass-door droplets; Golden Hour renders a horizon-to-twilight sky gradient, warm-key/cool-shadow contrast, and soft volumetric god rays streaming through the windows.
- [ ] **Smooth Low-End Android Performance:** On low-end Android devices (`GFX: LOW`), the Crema Ring studio logo plays smoothly at 60 FPS with zero freezes, and live gameplay maintains stable frame pacing with reduced draw calls and zero GC stutters.