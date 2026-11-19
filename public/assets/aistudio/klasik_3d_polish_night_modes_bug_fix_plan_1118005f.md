# Klasik 3D — Game Polish, Bug Fixes & Realism Expansion Plan

This phased implementation plan resolves every visual glitch, customer AI bug, and realism gap identified in the latest build (`Klasik3D-d8bdd0bb`), while adding **Takeout Customers**, **Authentic Cup Types**, **Working Syrup Animations**, **Detailed City Buildings**, **Umbrellas in Rain**, **Night & Rainy Night Shifts**, and a **Game-Themed Barista Codex with Minimizable Recipe Pinning**.

---

## Bug & Feature Audit Matrix

| # | Reported Issue / Feature | Root Cause / Current Behavior | Target Files |
|---|---|---|---|
| 1 | **Duplicated Outdoor Highway** | An elevated concrete overpass (`y = 2.6`) sits directly above the ground-level 2-lane street, making it look like a floating duplicate highway (`image_88cae7.jpg`). | `src/game/scene3d.ts` |
| 2 | **Rainy Realism (Umbrellas)** | Outdoor pedestrians and arriving patrons walk through rain completely bare-headed without umbrellas. | `src/game/scene3d.ts` |
| 3 | **Barista Codex UI + Pin Recipe** | Current POS Codex (`image_88cb20.jpg`) uses a dark generic emerald-tech aesthetic instead of a cozy Garage-Garden Cafe POS theme, and lacks a minimizable pinned recipe tracker. | `src/components/RecipeMenuModal.tsx`, `src/components/HudOverlay.tsx`, `src/App.tsx`, `src/index.css` |
| 4 | **Broken Syrup Animations** | All 3 syrups (Vanilla, Caramel, Mocha) teleport flavoring straight into the cup with no pump depression, nozzle dispense, or falling syrup stream. | `src/game/scene3d.ts`, `src/game/rules.ts`, `src/game/sound.ts` |
| 5 | **Cup Realism (Hot vs. Iced)** | Iced drink orders (e.g., *Iced Garage Americano* in `image_88ce86.jpg`) still render inside a ceramic hot coffee mug with saucer and handle. | `src/game/scene3d.ts`, `src/game/rules.ts` |
| 6 | **Takeout Customers & Cups** | Every customer is dine-in and occupies a table/chair; there are no takeout orders, paper/iced takeout cups, or walk-out flows. | `src/game/rules.ts`, `src/game/scene3d.ts`, `src/components/HudOverlay.tsx` |
| 7 | **Plain Outdoor Buildings** | Exterior buildings across the street are flat untextured geometric boxes with no windows, awnings, roofs, or storefront details. | `src/game/scene3d.ts` |
| 8 | **Night Shift & Rainy Night** | Only 3 lighting modes exist (`Morning Sun`, `Golden Hour`, `Rainy Roof`); missing nocturnal ambient lighting, lit city building windows, working streetlamps, and `Rainy Night` with umbrellas. | `src/game/rules.ts`, `src/game/scene3d.ts`, `src/components/TitleScreen.tsx`, `src/components/HudOverlay.tsx`, `src/game/sound.ts` |
| 9 | **Doorway Freeze & Shake Glitch** | Two customers entering/exiting the doorway simultaneously trigger opposing waypoint pull vs. actor-separation repulsion, locking them in place and flipping their yaw rapidly every frame. | `src/game/scene3d.ts` |
| 10 | **Idle Queue Customers Glitching** | Customers standing in line jitter and micro-step continuously because repulsion pushes them just past the `isWalking` speed threshold, fighting their queue slot lerp. | `src/game/scene3d.ts` |

---

## Phase 1: Fix Doorway Freeze/Shake Deadlocks & Idle Queue Glitching (`src/game/scene3d.ts`)

### 1.1 Root Cause Fix for Doorway Deadlocks (Bug #9)
When two patrons reach the narrow entrance doorway (`x ≈ -1.15, z ≈ -6.15`) together, circle-repulsion pushes them sideways/backward while waypoint steering pulls them back into the exact same point, causing a freeze + rapid 180° heading shake.

* **Single-File Doorway Token / Passing Corridor:**
  * Track a lightweight doorway reservation (`private doorOccupantId: string | null = null;`).
  * Define a **Doorway Corridor Zone** (`|x - DOOR_X| < 0.85 && z > -7.25 && z < -5.15`).
  * When a customer approaches the exterior or interior threshold (`distToDoor < 1.35m`), they check `doorOccupantId`:
    * If `null` or already theirs: claim `doorOccupantId = cust.id` and walk smoothly straight through the doorway with **inter-actor repulsion disabled** inside the corridor.
    * If occupied by another customer: pause cleanly at a polite waiting spot (`0.95m` outside or inside the door, offset slightly to the right) in a calm idle stance (`isYieldingAtDoor = true`) until `doorOccupantId` clears!
  * Add a safety timeout (`maxHoldSec = 3.2s`) so `doorOccupantId` can never deadlock even if a customer despawns mid-doorway.
* **Angular Velocity Clamp on Heading (`rotation.y`):**
  * Only update target walking heading when `planarSpeed > 0.22` (prevents 180° yaw flips from tiny numerical drift), and cap turn rate smoothly (`maxTurn = dt * 7.5`).

### 1.2 Root Cause Fix for Glitching Idle Customers in Line (Bug #10)
* **Movement State Machine with Hysteresis (`'walking' | 'idle-queue' | 'seated'`):**
  * Replace raw frame-by-frame `planarSpeed > 0.09` toggling with explicit state hysteresis:
    * Enter `'idle-queue'` when `distToQueueSlot < 0.07m`: **snap** `actor.currentPos` cleanly to the exact queue slot vector, zero out velocity, disable actor-to-actor repulsion forces against other stationary queued patrons, and slerp `actor.group.rotation.y` smoothly to face the barista counter (`0` rad).
    * Only switch back to `'walking'` if the assigned queue slot advances forward by `> 0.22m` (e.g., when the customer ahead is served).
* **Dedicated Well-Spaced Queue Slots:**
  * Space counter queue slots by at least **`0.88m`** along a clean diagonal line (`Slot 0: (-0.55, -1.35)`, `Slot 1: (-0.72, -2.23)`, `Slot 2: (-0.88, -3.12)`, `Slot 3: (-1.02, -4.00)`) so idle patrons never physically overlap or trigger separation pushback.
* **Calm Idle Animation:**
  * When `state === 'idle-queue'`, set `leftLeg.rotation.x = 0`, `rightLeg.rotation.x = 0`, and apply only a gentle breathing chest scale/head look (`Math.sin(t * 1.8 + seed) * 0.06` gentle head glance toward the espresso machine or menu) with zero foot sliding or shaking.

---

## Phase 2: Authentic Cup Realism (Hot vs. Iced vs. Takeout) & Takeout Customers (`src/game/rules.ts`, `src/game/scene3d.ts`, `src/components/HudOverlay.tsx`)

### 2.1 Order Model Extension (`src/game/rules.ts`)
* Extend `CustomerOrder` with:
  ```ts
  export type ServiceType = 'dine-in' | 'takeout';
  export type CupVesselType = 'hot-mug' | 'iced-glass' | 'hot-takeout' | 'iced-takeout';
  ```
* When spawning a new customer order:
  * Assign `serviceType: Math.random() < 0.38 ? 'takeout' : 'dine-in'` (ensure at least 1 dine-in and 1 takeout appear regularly so the cafe always feels balanced and lively).
  * Add a helper `getOrderVesselType(order: CustomerOrder): CupVesselType`:
    * `isColdOrIcedDrink(order.recipeId)` + `dine-in` → `'iced-glass'`
    * `isColdOrIcedDrink(order.recipeId)` + `takeout` → `'iced-takeout'`
    * Hot drink + `dine-in` → `'hot-mug'`
    * Hot drink + `takeout` → `'hot-takeout'`
* Display a clear, crisp service badge on the HUD order chip, order ticket, and hanging counter ticket (`🏠 Dine-In` in warm amber vs. `🛍️ Takeout` in emerald-mint) so the player instantly recognizes takeout orders.

### 2.2 Four Distinct 3D Drink Vessels (`src/game/scene3d.ts`)
Replace the single ceramic mug rig on the brew stations and customer hands with a unified `createDrinkVesselMesh(vesselType: CupVesselType)` factory:

1. **`hot-mug` (Dine-In Hot Coffee / Hot Tea):**
   * Porcelain ceramic mug with curved barista handle, matching porcelain saucer, dark roasted espresso/tea liquid surface, and steamed microfoam/latte art rosette when steamed.
2. **`iced-glass` (Dine-In Iced Coffee / Cold Refreshers):**
   * Tall tapered **clear crystal glass** (`MeshPhysicalMaterial` or lightweight glossy `MeshStandardMaterial` with `transparent: true, opacity: 0.34, roughness: 0.08`, no saucer, no mug handle).
   * Visible layered beverage fill inside (dark espresso crema swirl over iced milk/amber tea/matcha), **5–7 floating translucent 3D ice cube meshes** (`BoxGeometry(0.022, 0.022, 0.022)` rotated randomly near the liquid top), and a sleek stainless/glass drinking straw angled out of the rim.
3. **`hot-takeout` (Takeout Hot Coffee / Hot Tea):**
   * Tall tapered cream-white paper coffee cup (`CylinderGeometry(0.044, 0.031, 0.125, 18)`).
   * Corrugated kraft-walnut cardboard heat sleeve wrapped around the mid-section stamped with the circular **Klasik Yin-Yang** icon texture.
   * Matte-black (or cream) raised snap-on sipper lid with molded drinking spout.
4. **`iced-takeout` (Takeout Iced Coffee / Cold Refreshers):**
   * Clear tapered cold takeout cup showing the layered iced drink + floating 3D ice cubes inside, Klasik Yin-Yang emblem printed on the front wall, clear domed or flat cold-sip lid, and a crisp green/kraft barista straw poking through the lid center.

* **Live Cup Sync on Espresso Machine & Prep Counter:**
  * Whenever the active order changes or the player starts crafting a drink, automatically switch the active 3D cup mesh on the espresso drip tray / assembly counter to match `getOrderVesselType(activeOrder)` (defaulting to `'hot-mug'` when no order is selected).
  * When serving, spawn the **exact matching vessel** into the customer's carrying hand!

### 2.3 Takeout Customer Flow (No Chair Usage)
* When a customer with `serviceType === 'takeout'` receives their drink:
  * **Do NOT assign a table or chair (`seatIndex = null`).**
  * Attach their `hot-takeout` or `iced-takeout` cup to their right hand in the steady cup-carry pose.
  * Trigger a brief happy nod/smile reaction (`0.45s`), then immediately set their navigation target to the **cafe entrance door** (`DOOR_INTERIOR -> DOOR_EXTERIOR -> SIDEWALK_EXIT`).
  * They open the swinging glass entrance door, step outside (raising their umbrella if it's raining!), stroll naturally down the exterior sidewalk with their takeout cup, and cleanly despawn off-screen—leaving dine-in chairs completely free for seated patrons!

---

## Phase 3: Fix & Animate All 3 Syrup Pumps & Liquid Pouring (`src/game/scene3d.ts`, `src/game/rules.ts`, `src/game/sound.ts`)

### 3.1 Root Cause of Teleporting Syrups (Bug #4)
Currently, clicking Vanilla, Caramel, or Mocha syrup updates the drink state immediately without animating the bottle pumps, positioning the cup under the nozzle, or rendering a visible syrup stream.

### 3.2 Complete 3D Syrup Pump & Pour Sequence (`~650ms`)
Store dedicated references for each of the 3 syrup bottles at Station 3 (`vanilla`, `caramel`, `mocha`):
```ts
interface SyrupBottleRig {
  id: 'vanilla' | 'caramel' | 'mocha';
  root: THREE.Group;
  pumpHead: THREE.Group;       // Top gold pump + angled spout nozzle
  nozzleTipLocal: THREE.Vector3;
  streamMesh: THREE.Mesh;      // Tapered glossy liquid cylinder from nozzle down to cup
  droplets: THREE.Mesh[];      // 3 tiny syrup splash droplets
  syrupColor: number;          // Vanilla: 0xfef3c7, Caramel: 0xd97706, Mocha: 0x3b1a0c
  basePumpY: number;
  animTimer: number;           // 0 = idle, 0..1 = active double-pump animation
}
```

* **Synchronized Animation Choreography (Driven inside `animate(dt)`):**
  1. **Cup Glide (`0.00 – 0.20`):** Smoothly slide the active drink vessel directly beneath the selected syrup bottle's spout tip (`targetX = bottle.root.position.x`, `targetZ = bottle.root.position.z + 0.14`).
  2. **Double Pump Depression (`0.20 – 0.80`):**
     * Pump 1 (`0.20 – 0.48`) and Pump 2 (`0.50 – 0.78`): Physically depress `pumpHead.position.y = basePumpY - Math.sin(subT * Math.PI) * 0.032`.
     * While depressed, scale `streamMesh.visible = true`, stretch `streamMesh.scale.y` smoothly from the nozzle tip into the cup's liquid surface, and animate the 3 viscous droplets falling down the stream path with a small ripple ring on the drink surface.
     * Color each stream accurately: **Madagascar Vanilla** (warm translucent golden-cream `#fef08a`), **Salted Caramel** (glossy amber `#d97706`), **Dark Mocha** (rich chocolate `#3b1a0c`).
  3. **Settle & Color Blend (`0.80 – 1.00`):** Retract `streamMesh`, smoothly blend the drink's interior liquid tint/swirl layer, and slide the cup smoothly back to the counter prep pad.
* **Audio Sync (`src/game/sound.ts`):** Trigger a soft two-pulse mechanical pump click + glossy liquid squirt SFX timed to Pump 1 and Pump 2.
* **Step-Lock Integration:** Ensure `add-syrup` respects the `activeStepLock` duration (`~650ms`) so players watch the pump animate smoothly rather than teleporting.

---

## Phase 4: Game-Themed Barista Codex UI & Minimizable "Pin Recipe" Feature (`src/components/RecipeMenuModal.tsx`, `src/components/HudOverlay.tsx`, `src/App.tsx`, `src/index.css`)

### 4.1 Restyle POS Barista Codex to Match Klasik 3D's Artisanal Cafe Theme (Bug #3)
Transform `RecipeMenuModal.tsx` from the dark emerald-green CRT tech screen (`image_88cb20.jpg`) into a warm, tactile **Garage-Garden Espresso Bar POS Tablet**:
* **Bezel & Surface Palette:**
  * Outer POS tablet frame: matte gunmetal/walnut trim (`#241913`) with subtle brushed-brass inner rim (`border-amber-500/45`) and the **Klasik Yin-Yang Leaf & Cappuccino Logo** in the top-left header beside **`KLASIK BARISTA CODEX`**.
  * Interior screen background: warm deep dark-roast espresso (`#160F0B` to `#1E140E`) with subtle espresso-bean / paper-grain warmth—matching the Title Screen and HUD glassmorphism seamlessly.
  * Category tabs: tactile wooden/brass espresso-bar tabs (`All Drinks`, `Hot Coffee`, `Iced Coffee`, `Artisanal Tea`, `Cold Drinks`) with active warm-amber crema pill highlight.
* **Rich In-Game Recipe Cards:**
  * Show a clean **vessel icon badge** (`Hot Mug` / `Iced Glass`) alongside the drink name, price tag (`$5`–`$8`), and a pulsing **`ACTIVE ORDER`** badge when matching the currently selected customer.
  * Keep the large, scannable step chips (`1. Grind [St.2] → 2. Tamp [St.2] → 3. Shot [St.2] → 4. +Ice [St.3] → 5. Serve [St.4]`) color-coded by station.
  * Add a dedicated **`📌 Pin Recipe`** / **`📌 Pinned`** button directly on the top-right of every recipe card!

### 4.2 Minimizable "Pin Recipe" Live HUD Widget (`src/App.tsx` & `src/components/HudOverlay.tsx`)
* **State Management (`src/App.tsx`):**
  * `const [pinnedRecipeId, setPinnedRecipeId] = useState<string | null>(null);`
  * `const [isPinnedMinimized, setIsPinnedMinimized] = useState<boolean>(false);`
  * Clicking **"Pin Recipe"** inside the Codex pins that recipe (and optionally auto-closes or shows a crisp `"Pinned to HUD"` confirmation toast).
* **Expanded Pinned Widget (Compact & Unobtrusive):**
  * Docked cleanly on the upper-right below the top HUD bar (or bottom-left above the station switcher, away from the center 3D equipment), styled with Klasik 3D's high-legibility dark-espresso `.glass-panel`.
  * Shows:
    * Header: `📌` icon + Drink Name + **Minimize (`—`)** button + **Unpin (`×`)** button.
    * Live Interactive Step Checklist: Automatically highlights the **current next step** in glowing amber and marks already-completed steps on the player's active cup with a crisp emerald checkmark (`✓`)!
* **Minimized Pill State (Zero Obstruction):**
  * Tapping Minimize collapses the entire card into a tiny sleek `.glass-pill` chip (`📌 Iced Garage Americano · 2/5 ▾`) taking `< 36px` vertical height.
  * Tapping the minimized chip smoothly re-expands the full checklist anytime.

---

## Phase 5: Outdoor World Fixes — Single Clean Street, Detailed City Buildings & Rain Umbrellas (`src/game/scene3d.ts`)

### 5.1 Remove Duplicated Elevated Highway (Bug #1)
* Completely **remove** the elevated concrete viaduct/highway bridge (`y = 2.6, z = -21.5`), its overpass pillars, guardrails, and separate upper highway car pool that visually read as a duplicated highway floating above the street (`image_88cae7.jpg`).
* Keep **one grounded, realistic 2-lane neighborhood avenue** (`z = -9.2` to `-15.8`) with crisp raised curbs, pedestrian crosswalk stripes, dashed yellow/white lane dividers, sidewalks on both sides, and smooth bi-directional passing traffic on the single road plane.

### 5.2 Architectural Exterior Building Details (Bug #7)
Upgrade the plain flat exterior boxes across the street (`z = -17.8` to `-26.0`) into a cohesive, stylized **Tokyo / European Neighborhood Cafe Streetfront**:
* **4–6 Varied Low-Rise Neighborhood Buildings (2–4 Stories):**
  * **Ground-Floor Storefronts:** Recessed display shop windows, striped fabric awnings (forest green/cream, burgundy/cream, navy/cream), wooden door frames, and tiny glowing neighborhood signage boards (Bakery, Vinyl Shop, Florist, Bookshop).
  * **Upper-Story Architectural Facades:**
    * Recessed **window grids with frames & sills** generated via a high-contrast dual-texture or instanced window-pane system (`this.cityWindowLitMat` + `this.cityWindowDarkMat` + `this.cityWindowWarmMat`) so **building windows reflect soft sky by day and light up warmly across the city skyline at night!**
    * Decorative cornice roof ledges, subtle brick/plaster facade color variation (warm terracotta, muted sage plaster, cream stucco, dark slate), small iron Juliette balcony rails, and low-poly rooftop details (water tower, HVAC vents, warm rooftop string lights).
  * **Performance Discipline:** Merge static building shells/trims by material and share 2–3 emissive window materials (`emissiveIntensity` animated smoothly by time-of-day) so the entire detailed streetfront adds **`< 12` draw calls** total!

### 5.3 Rainy Realism — 3D Umbrellas for Outdoor Pedestrians & Arriving/Leaving Customers (Bug #2)
* **Procedural 3D Umbrella Rig (`createUmbrellaMesh(colorHex)`):**
  * Curved 8-segment polygonal canopy (`ConeGeometry(0.46, 0.16, 8, 1, true)` or flattened hemisphere cap with pointed tip ferrule), slim metallic shaft (`CylinderGeometry(0.008, 0.008, 0.72, 6)`), and a wooden J-hook handle.
  * Varied neighborhood umbrella palette: translucent frosted vinyl (`#e2e8f0`, opacity `0.62`), classic forest green (`#166534`), warm mustard (`#d97706`), deep burgundy (`#9f1239`), and midnight navy (`#1e3a8a`).
* **Smart Auto-Deploy Logic:**
  * Attach `umbrellaGroup` to the character's left hand/forearm pivot inside `createCustomerCharacter()`.
  * Define `const isRaining = weather === 'rain' || weather === 'rainy-night';`.
  * **Outdoor Walking NPCs:** Whenever `isRaining` is `true`, set `npc.umbrellaGroup.visible = true` and raise their left arm cleanly (`leftArm.rotation.x = -1.35`) so the canopy hovers naturally over their head while walking!
  * **Entering & Exiting Cafe Customers (Including Takeout Customers):**
    * While outdoors (`actor.currentPos.z < -6.35`) during `rain` or `rainy-night`, automatically open their umbrella (`umbrellaGroup.visible = true`, arm raised).
    * As soon as they cross the swinging glass entrance door threshold (`z >= -6.35`), smoothly fold/hide the umbrella so nobody holds an open umbrella inside the cafe!

---

## Phase 6: Night Shift & Rainy Night Atmospheres (`src/game/rules.ts`, `src/game/scene3d.ts`, `src/components/TitleScreen.tsx`, `src/components/HudOverlay.tsx`, `src/game/sound.ts`)

### 6.1 Expand Weather & Time Modes to 5 Distinct Shifts (Bug #8)
Update `WeatherType` in `src/game/rules.ts`:
```ts
export type WeatherType = 'sunny' | 'golden' | 'rain' | 'night' | 'rainy-night';
```
Update the selector controls in `TitleScreen.tsx` and the in-game Menu/Customize controls to expose all 5 shifts cleanly:
1. ☀️ **Morning Sun** (`sunny`)
2. 🌅 **Golden Hour** (`golden`)
3. 🌧️ **Rainy Day** (`rain`)
4. 🌙 **Night Shift** (`night`)
5. ⛈️ **Rainy Night** (`rainy-night`)

### 6.2 Night Shift (`night`) Lighting, City Lights & Working Streetlamps (`src/game/scene3d.ts`)
1. **Midnight Sky Dome & Subtle Stars:**
   * Update the procedural sky dome shader uniforms for `night` (`zenith: #040712`, `mid: #0b132b`, `horizon: #1b2845`) with subtle procedural twinkling star pinpoints high in the clear night sky.
2. **Working Sidewalk Streetlamps (Zero Performance Tax):**
   * Upgrade every exterior streetlamp post along the sidewalk with:
     * **Glowing Lamp Bulb:** High-emissive warm amber glass globe (`#fde68a`, `emissiveIntensity = 2.4` at night, `0.05` during Morning Sun).
     * **Volumetric Light Cone (Additive Shader Mesh):** Soft downward translucent warm-gold cone (`ConeGeometry(1.45, 3.6, 14, 1, true)` using a lightweight vertical-fade additive `ShaderMaterial`, `depthWrite: false`) casting a realistic nocturnal pool of light onto the sidewalk and passing pedestrians without spawning expensive real-time `PointLight` shadows!
     * **Soft Ground Light Pool Disc:** Subtle additive warm glow decal on the sidewalk directly beneath each lamp.
3. **Glowing City Building Windows & Storefront Signs:**
   * At `night` and `rainy-night`, smoothly ramp up `cityWindowWarmMat.emissiveIntensity` (`0.0 -> 1.45`), `cityWindowSoftBlueMat.emissiveIntensity` (`0.0 -> 0.95`), and exterior storefront mini-signs so the entire city street outside glows with warm urban life.
4. **Cozy Warm Interior Cafe Glow:**
   * Dim the exterior directional sun to a subtle cool moonlight rim (`#64748b`, intensity `0.35`, hemisphere `#1e293b` / `#0f172a`).
   * Brighten the cafe's **5 interior brass pendant lamps**, warm bar counter fill light, glowing espresso machine pressure gauges, POS screen backlight, Miata showroom plinth LEDs, and exterior hanging `KLASIK 3D` neon blade sign—making the cafe feel like a warm glowing sanctuary at night.
5. **Passing Car Headlights & Taillights:**
   * Increase vehicle headlight/taillight emissive intensity and enable lightweight additive **headlight road-beam cones** projecting ahead of passing night cars!

### 6.3 Rainy Night Shift (`rainy-night`)
Combines the nocturnal city ambiance with rainy-day atmosphere:
* **Dark Overcast Storm Sky:** Deep slate-indigo cloud canopy (`#050811` -> `#0f172a` -> `#1e293b`, stars hidden behind rain clouds).
* **Glistening Night Rain:** GPU-driven outdoor-only rain streaks (`z < -6.35`) tinted slightly brighter silver-amber (`#cbd5e1` / `#fde68a`) so falling rain catches the glow of working streetlamps and neon cafe signage!
* **Wet Reflective Night Street:** Lower street asphalt roughness to `0.15` + enable subtle stretched neon/streetlamp reflection bands along the wet pavement, plus scrolling raindrop trails on the glass conservatory doors.
* **Umbrellas Active:** Every outdoor pedestrian and approaching/departing customer automatically opens their 3D umbrella (`isRaining === true`).
* **Cozy Nocturnal Rain Audio (`src/game/sound.ts`):** Play the gentle rain-on-glass ambient loop paired with warm lo-fi night cafe acoustics.

---

## Phase 7: Low-End Device Guardrails & Verification Checklist

### Performance Guardrails
* **Zero Extra Real-Time Point Lights for Streetlamps:** Use additive cone shaders + emissive globes for all streetlamps and building windows; keep total active WebGL dynamic lights constant across all 5 weather modes so `GFX: LOW` Android frame rates remain locked.
* **Zero Per-Frame Allocations:** Pre-allocate syrup droplet trajectories, doorway yield checks, and umbrella toggle states at setup time (no `new THREE.Vector3()` inside `animate()`).
* **Shared Vessel Geometries:** Cache cup/glass/lid/straw/ice-cube geometries once in `CafeScene3D` and reuse them across all stations and customer hands.

### QA Acceptance Checklist
* [ ] **Single Clean Street:** Duplicated elevated highway/overpass is completely gone; passing cars travel cleanly on the single grounded 2-lane avenue.
* [ ] **Rain Umbrellas:** During both `Rainy Day` and `Rainy Night`, outdoor walking NPCs carry colorful 3D umbrellas above their heads; entering customers fold their umbrellas cleanly upon crossing through the doorway.
* [ ] **Barista Codex + Pin Recipe:** Opening the POS Codex displays a cohesive warm Garage-Garden Cafe barista UI; clicking **Pin Recipe** docks a live step-tracker on the HUD that can be **minimized** into a tiny non-obstructive pill and re-expanded at will.
* [ ] **Syrup Pump Animations:** Selecting Vanilla, Caramel, or Mocha visibly glides the cup, depresses the bottle pump twice, pours a colored syrup stream with falling droplets into the cup, and tints the drink.
* [ ] **Authentic Hot/Iced/Takeout Cups:** Iced orders use clear iced glasses with visible ice cubes and straws; hot dine-in orders use ceramic mugs with saucers; takeout orders use branded takeout paper/iced cups with lids.
* [ ] **Takeout Customers Leave After Serving:** Takeout patrons take their branded takeout cup and walk straight out the swinging glass entrance door onto the sidewalk without occupying any cafe chairs.
* [ ] **Detailed Exterior Buildings:** Buildings across the street feature framed windows, ground-floor awnings, roof cornices, and neighborhood shopfront details.
* [ ] **Night Shift & Rainy Night:** Selecting `Night Shift` or `Rainy Night` activates midnight skies, glowing lit city building windows, working streetlamps with light cones, bright car headlights, cozy warm interior cafe lights, and outdoor rain/umbrellas on `Rainy Night`.
* [ ] **Zero Doorway & Queue Glitches:** Multiple customers arriving or leaving through the doorway queue politely one-by-one without freezing or shake-glitching; idle patrons waiting in line stand calmly in spaced slots with zero leg/heading jitter.