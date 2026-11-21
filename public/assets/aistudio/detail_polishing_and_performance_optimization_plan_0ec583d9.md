# Klasik 3D — Detail Polishing & Mobile/PC Performance Optimization Plan

**Target Repository:** `BoostedByCaffeine/Klasik3D`  
**Primary Files:** `src/game/scene3d.ts`, `src/game/sceneries/SceneryManager.ts`, `src/game/sceneries/sceneriesPart1.ts`, `src/game/sceneries/sceneriesPart2.ts`, `src/game/sceneries/surroundingContext.ts`, `src/game/sceneries/sceneryTypes.ts`, `src/game/outdoorLod.ts`, `src/game/secretNpc3d.ts`, `src/game/OutdoorOverlookController.ts`, `src/game/sidewalkAvoidance.ts`  
**Priority 0 Goal:** Restore locked **60 FPS on PC** and smooth **30–60 FPS on mobile Android WebView APKs** (especially indoors inside the cafe) while resolving every visual, intersection, weather, and character polish issue.

---

## 1. P0 EMERGENCY: Mobile & PC Indoor Framerate Rescue Architecture

### Root Cause of Sudden Lag After Scenery Expansion
Recent scenery expansions dramatically increased outdoor mesh counts (`sceneriesPart1.ts` ~112 KB, `sceneriesPart2.ts` ~107 KB, `surroundingContext.ts` ~87 KB). Even while the player is **inside the cafe** brewing coffee at the counter, the engine currently keeps hundreds of unseen outdoor meshes, rear/flanking neighborhood buildings, deep valley city structures, park NPCs, bilateral streetlight cones, and per-frame outdoor animation loops active—blowing past mobile WebGL 2 draw-call, fill-rate, and CPU update budgets.

### Mandatory Performance Architecture (`scene3d.ts`, `SceneryManager.ts`, `outdoorLod.ts`, `surroundingContext.ts`)

#### 1.1 Strict Two-Tier Visibility Split (`windowBackdropGroup` vs. `outdoorOnlyGroup`)
Refactor every scenery builder to return two explicitly partitioned scene subtrees inside `SceneryBuildResult`:
1. **`windowBackdropGroup` (Always Visible — Ultra-Lightweight):**
   - Contains **only** the hero landmarks and immediate front-window silhouettes genuinely visible through the cafe glass from the barista POV (e.g., Mayon cone + Cagsawa silhouette, Eiffel Tower + immediate foreground buildings, Mt. Everest peaks, front street plane).
   - **Strict Indoor Budget:** **$\le 20$ draw calls** total across the entire active scenery backdrop.
2. **`outdoorOnlyGroup` (`visible = isPlayerOutside || isTitleScreen`):**
   - Contains **everything invisible from behind the espresso counter**: flanking left/right/rear neighbor blocks, road-end T-intersections & L-junctions, Champ de Mars park benches & dating couples, Mayon far souvenir stalls & tourists, Hilltop/Switzerland deep valley micro-buildings, distant snow-covered woods, bilateral streetlight volumetric cones, dynamic clouds, flying bird flocks, aerial police chase, and outdoor-only pedestrian crowds.
   - **Hard Indoor Cull:** The instant the player returns inside the cafe (`!isPlayerOutside && !isTitleScreen`), set `outdoorOnlyGroup.visible = false` AND **completely bypass** `outdoorOnlyGroup` per-frame `update(dt)` loops (zero matrix math, zero NPC steering, zero bird/cloud/park updates while brewing!).

#### 1.2 Aggressive Draw-Call Batching & Geometry Merging
- Audit `sceneriesPart1.ts`, `sceneriesPart2.ts`, and `surroundingContext.ts`:
  - Replace loops creating individual `THREE.Mesh` objects for buildings, roofs, windows, railings, canopies, trees, fences, and streetlights with **`THREE.InstancedMesh`** or static **`mergeGeometries()`** batches sharing **1 material per color/texture atlas**.
  - **Hard Draw-Call Targets (verify via `renderer.info.render.calls`):**
    - **Indoors (Barista Counter / Cat Station):** **$\le 75$ total draw calls** (cafe + cats + active customers + lightweight window backdrop).
    - **Outdoors (Go Outside / Title Screen):** **$\le 135$ total draw calls** (rich full 360° scenery + traffic + NPCs).

#### 1.3 Realtime Light Ban in Sceneries & Mobile Shader Hygiene
- **Zero `THREE.PointLight` / `THREE.SpotLight` inside outdoor sceneries:** Every extra dynamic Three.js light forces the GPU to re-evaluate lighting for every mesh in the cafe and exterior. Simulate 100% of streetlights, window glows, lanterns, floodlights, and headlights using **emissive materials** and lightweight **additive ground-pool discs** (`depthWrite: false`, hidden when indoors).
- **Disable Shadows on All Outdoor Scenery:** Enforce `obj.castShadow = false; obj.receiveShadow = false;` across the entire mounted scenery root so the shadow map pass only renders the cafe interior/characters.
- **Adaptive Mobile Pixel Ratio & Indoor Throttling:**
  - Cap `renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.75))` and add an automatic dynamic resolution fallback if rolling frame time exceeds `28ms` on mobile.
  - Eliminate per-frame `new THREE.Vector3()`, `new THREE.Matrix4()`, or `new THREE.Quaternion()` allocations inside `update(dt)` loops—reuse module-level scratch temporaries to eliminate garbage-collection stutters.
  - Ensure `SceneryManager.ts` recursively disposes every geometry, material, texture, and `InstancedMesh` buffer when switching sceneries.

---

## 2. Standardized Road Network: T-Roads, Downhill Paris Branch, L-Junctions & Gutter Fix

### 2.1 Global Intersection Gutter Fix (ALL Road Sceneries)
- **Observed Bug:** Raised concrete gutters and curbs currently run straight across road intersection mouths, visibly covering and cutting through turning lanes on Eiffel Tower View and all other intersection sceneries.
- **Mandatory Geometry Rule (`surroundingContext.ts`):**
  - **NEVER** draw a single unbroken curb/gutter bar spanning from `-roadHalfLen` to `+roadHalfLen` across a junction opening.
  - Split sidewalk curbs and drainage gutters into segmented runs that **terminate cleanly at the intersection corner radius** (`x = ±(junctionX - junctionHalfWidth - filletRadius)`), connected by smooth **90° curved corner curb fillets** (matching the clean rounded T-road geometry).
  - Enforce clean elevation layering (`roadY = 0.00`, `gutterY = 0.008` strictly along curb edges only—never across intersection asphalt, `laneDashY = 0.016`, `sidewalkY = 0.09`).

### 2.2 Per-Scenery Road Topology Specification

```text
  [ T-ROAD INTERSECTION ]                [ L-JUNCTION (NO OVERLOOK ROAD) ]
  (Busy St, Japan, Favela, Cyberpunk)    (Mayon, Hilltop, Switzerland, Everest)
  
  ========|     |========                 ========\         (Open Scenic Overlook)
          |     |                                  \        (Zero road cutting in!)
  ========'     '========                 ======\   |
       (Cafe Side)                               |  |  (Turns AWAY from vista,
                                                 |  |   behind cafe flanks)
```

| Scenery | Junction Type (Both `-X` & `+X` Ends) | Vehicle & Traffic Behavior |
| :--- | :--- | :--- |
| **1. The Busy Street** | **T-Road Intersection** | Ground cars turn smoothly around curved corner fillets onto the cross-street until fully occluded behind corner buildings. |
| **2. Japanese Tranquility** | **T-Road Intersection** *(Stone lane)* | Pedestrians & rickshaw/delivery flow turn cleanly around corner *machiya* facades onto perpendicular Kyoto side lanes. |
| **3. Brazilian Favela** | **T-Road Intersection** *(Removes nonsensical end-of-road mountains!)* | Cars & pedestrians turn cleanly onto perpendicular hillside/coastal cross-streets framed by corner *botecos* and retaining walls. |
| **4. Cyberpunk Neon** | **T-Road Intersection (Ground + Aerial)** | **Keep ALL flying hover-cars AND add sleek futuristic ground cars** driving/turning on the T-road! **Upgrade flying hover-cars** so they smoothly bank and turn 90° down perpendicular sky-canyons at the T-intersection instead of vanishing out of nowhere! |
| **5. Eiffel Tower View** | **Special Downhill T-Road** | The branch extending toward the scenic overlook direction slopes **downhill** smoothly along the Montmartre hillside into Paris. Vehicles compute exact height & pitch (`getEiffelRoadPose(x, z)`) so cars visibly **drive downhill** hugging the asphalt—**zero floating cars in mid-air!** |
| **6. Mayon Volcano View** | **L-Junction Only** *(No road toward overlook)* | Road curves cleanly away from Mayon Volcano (behind cafe/neighbor flanks) so zero road breaks the scenic vista. |
| **7. Hilltop City Lights** | **L-Junction Only** *(No road toward overlook)* | Mountain ridge road bends away from the cliff parapet behind hillside shops/pines. |
| **8. Switzerland Hilltop** | **L-Junction Only** *(No road toward overlook)* | Alpine village road bends backward behind cozy neighboring timber chalets, keeping the cliffside overlook 100% open. |
| **9. Mt. Everest & Hiker Trail** | **L-Junction Trail Bend** *(No road toward peaks)* | Cleared snowy stone trail bends naturally back behind rocky outcrops and teahouses away from the Everest peaks. |

---

## 3. Universal Weather Sync Across Scenic Overlooks & NPC Rain Reactions

### Observed Issues
1. When it is raining at the cafe, moving to **Scenic Overlook** shows dry, rain-free air because the rain particle volume is anchored strictly around the cafe coordinates.
2. Outdoor scenery NPCs (Mayon Volcano tourists, Eiffel Tower park couples/walkers, etc.) ignore rain completely instead of using umbrellas.

### Fix Specification (`src/game/scene3d.ts`, `src/game/outdoorLod.ts`, `sceneriesPart1.ts`, `sceneriesPart2.ts`)
1. **Camera-Anchored Weather Volume (Zero Extra Particles, 100% Coverage):**
   - Center the rain streaks and snowfall particle bounding box dynamically on **`camera.position.x` and `camera.position.z`** (with seamless modulo wrap-around) whenever `isPlayerOutside` is active.
   - This guarantees rain and snow fall naturally right in front of the player at **Cafe Porch**, **Scenic Overlook**, and **Look Back** across **all 9 sceneries**—without increasing particle count!
2. **Universal Outdoor & Park NPC Rain Reaction:**
   - Pass `weatherState` (`'clear' | 'rain' | 'snow'`) into every outdoor NPC rig (sidewalk pedestrians, **Mayon Volcano tourists**, **Eiffel Tower Champ de Mars park NPCs**, and scenery-specific visitors).
   - When `weatherState === 'rain'`:
     - Toggle visible a lightweight shared-geometry **umbrella** (`cone canopy + thin stem + handle`, color-varied per NPC) anchored directly into the NPC's raised hand (`armPitch = -1.15 rad`).
     - In **Eiffel Tower Park**, hide open picnic blankets during rain and have strolling couples/bystanders hold umbrellas cleanly over their heads (shifting sitting bench couples into umbrella-sharing poses).
     - Lower road/paving roughness slightly in rain for subtle wet sheen.

---

## 4. Secret Easter Egg NPC (`Anton` / `Beb` / `Duminiki`) — Male Head & Cap-Safe Hair Fix

### Observed Issues (`src/game/secretNpc3d.ts`)
- Character head/hair silhouette reads off for a male character.
- When spawning with his **brown-caramel Polo RL baseball cap** (~40% spawn chance), hair polygons poke straight out through the crown and sides of the cap.

### Fix Specification (`src/game/secretNpc3d.ts`)
1. **Refined Male Head & Facial Proportions:**
   - Sculpt a crisp, clean male head rig (`headRadius` slightly taller/structured jawline, clean subtle dark mustache hugging the upper lip, tiny silver stud earrings flush on ear sides, warm tan skin `#C6936B`).
2. **Modern Male Short Hairstyle (Capless State):**
   - Build a clean, layered jet-black (`#18181A`) short male haircut: tight tapered sides and back nape, textured upper crown volume, and a natural straight-across front fringe stopping cleanly above the eyebrows.
3. **Dual-State Cap-Safe Hair Mesh (Zero Clipping Guarantee):**
   - Split his hair into two controlled sub-groups:
     - `hairCrownGroup` (upper top/outer hair volume): **automatically hidden (`visible = false`) whenever `hasCap === true` or `hoodUp === true`!**
     - `hairUnderCapGroup` (trimmed low sideburns, clean back-of-neck nape, and subtle short front bangs tucked strictly **below** the cap brim line): stays visible when wearing the caramel Polo RL baseball cap or black rain/snow hood.
   - Seat the baseball cap dome (`radius = headRadius * 1.07`) snugly down onto the brow line so **zero hair polygons ever clip through the cap or hood** from any 360° camera angle.

---

## 5. Per-Scenery Visual Polish & Realism Fixes

### 5.1 Eiffel Tower View (Paris Montmartre & Champ de Mars)
- **Fix Downhill Branch & Floating Cars:** Connect the T-road branch sloping smoothly **downhill** toward the Eiffel Tower terrace; bind vehicle `y` elevation and forward `pitch` angle to the slope so cars drive naturally down the hill with tires touching asphalt (zero floating).
- **Fix Champ de Mars Park NPC Alignment:**
  - Audit every park bench, wall, hedge, and walkway coordinate. Place seated couples strictly on each bench's exact seat top (`y = benchSeatY`, facing outward normal—zero NPCs sitting inside or on top of walls!).
  - Constrain walking park couples and strollers strictly inside verified flat gravel/lawn bounding rectangles with `>= 0.4` unit clearance from walls, hedges, and the fountain.
  - Enable rain umbrellas and wet park sheen when `weather === 'rain'`.

### 5.2 Mayon Volcano View (Cagsawa Ruins, Bicol)
- **Fix Snapped Brown Pathway:** Replace the two mismatched flat rectangular tan planes with a **single smooth, continuous curved dirt-and-stone trail** (`Ribbon`/spline mesh with uniform `y = 0.025`, `polygonOffset` anti-z-fighting, and subtle pebble/grass edge borders) winding naturally from the overlook terrace to the Cagsawa Ruins and souvenir canopies.
- **Tourists Rain Reaction:** Give all full-rigged Mayon tourists automatic colorful umbrellas during rain (and add subtle protective side tarps/glowing warm bulbs under the souvenir canopies).
- **L-Junction Road Ends:** Bend both road ends backward away from Mayon Volcano behind flanking rural shops and tropical foliage.

### 5.3 Hilltop City Lights (Tagaytay / Baguio Ridge — Grounded Metropolis Rebuild)
- **Remove Exaggerated Floating Dot Citylights:** Delete the oversized floating `THREE.Points` dot clouds drifting up the mountain slopes and in mid-air.
- **Build a True Dense Valley Metropolis (`InstancedMesh`):**
  - Construct a continuous dark valley floor (`y = -24`) filled with **hundreds of properly grounded low-poly city buildings, mid-rise towers, and residential clusters** (rendered in 2–3 `InstancedMesh` draw calls with crisp warm/white/amber emissive window facade textures—looking like an authentic sprawling city both day and night!).
- **Fix the Valley Highway:** Ground a clean, curved multi-lane valley expressway on solid concrete viaduct piers anchored to the valley floor (`y = -21`), routed cleanly *between* building districts (never cutting through towers), with subtle low-profile moving vehicle light streaks hugging the asphalt.
- **Fix Floating Mountain Cones:** Sink every single surrounding mountain peak and ridge base deeply below the valley floor (`baseY = -34`) into a continuous horizon skirt so **zero floating cones** ever appear on the left, center, or right.
- **L-Junction Road Ends:** Curve both ends of the cafe ridge road backward behind flanking highland shops/pines (no road toward the cliff overlook).

### 5.4 Japanese Tranquility (Front Shrine Approach Details)
- **Detail Both Sides of the Road Leading to the Red Pagoda/Tower:**
  - Line the left and right edges of the straight stone approach road directly across from Klasik Cafe (between the *machiya* shops and the twin sakura trees leading to the red pagoda) with authentic Kyoto shrine-lane details:
    - Low carved stone shrine railings (*tamagaki*) and mossy stone curb edging.
    - Staggered rows of glowing stone *toro* lanterns and vertical red/white fabric shrine banners (*nobori*).
    - A framed **vermilion *Torii* gate** spanning cleanly across the mid-approach road, wooden *ema* wish-plaque stands, small incense/omikuji fortune kiosks, and lush low bamboo/Japanese maple planters tucked beside the stone path.
- **T-Road Intersections:** Ensure clean curved stone T-intersections at both `-X` and `+X` ends with zero gutter overlap.

### 5.5 Brazilian Favela (Rio de Janeiro — Grounding & T-Road Replacement)
- **Zero Floating or Buried Hillside Houses:**
  - Audit every favela home placement in `sceneriesPart1.ts`: sample exact terrain elevation `h = getFavelaHillHeight(x, z)` at the front-most downhill corner of each house footprint, seat the main floor cleanly at `h + 0.15`, and extend a concrete **retaining-wall / stilt foundation skirt downward by `-4.5` units** straight into the hillside so zero houses float in air and zero windows/doors get buried inside the slope.
- **Replace End-of-Road Mountains with Proper T-Roads:**
  - Remove the green pyramid mountains blocking the left and right ends of the street. Replace both ends with clean **T-road intersections** (rounded curbs, zero overlapping gutters) curving behind colorful corner *boteco* shops, hillside stairways, and coastal retaining walls while preserving **Christ the Redeemer (T-pose)** proudly on Corcovado peak in the Rio skyline.

### 5.6 Cyberpunk Neon (T-Road + Ground Cars + Turning Flying Cars)
- **Keep Flying Cars AND Add Sleek Ground Traffic:**
  - Maintain the multi-altitude **floating/flying hover-cars** and low-chance aerial police chase.
  - Add sleek low-poly **cyberpunk ground vehicles** (matte-black/gunmetal wedge coupes with glowing neon trim strips) driving and turning cleanly on the street-level **T-road intersections** at both ends.
- **Upgrade Flying Hover-Cars to Follow the Aerial T-Intersection:**
  - Instead of vanishing out of nowhere at `±X_BOUND`, route aerial hover-cars along a matching **aerial T-corridor**: upon reaching the left or right intersection sky-zone, hover-cars **smoothly bank (`roll ≈ ±0.28 rad`) and curve 90°** down the perpendicular megacity sky-canyons behind towering neon skyscrapers before recycling completely out of sight!

### 5.7 Switzerland Hilltop — Aesthetic & Structural Refinements
- **Cohesive Rugged Alpine Peaks:** Replace uniform sharp cones with layered multi-ridge faceted peaks (deep slate-granite lower faces, crisp snow-dusted ridges, soft misty alpine separation haze) grounded deeply below the valley floor (`baseY = -36`).
- **Elevated Lake & Village Composition:** Keep the cliffside overlook completely clear of blocking trees; frame a vivid turquoise glacial lake far below with a tiny animated white **Swiss lake ferry** trailing a subtle white wake, a stone arch valley viaduct bridge, warm-lit miniature lakeshore chalets, and the grounded **red-and-glass cliffside funicular** riding smoothly on visible steel piers between Upper and Lower stations.
- **Cozy Swiss Foreground Touches:** Add authentic yellow Swiss **Wanderweg hiking diamond signposts**, wooden ski/snowboard racks beside the neighboring chalets, stacked split firewood under the eaves, fluttering red-and-white Swiss cross flags, snow caps on the forged-iron streetlamps, and **L-junction snowy village roads** curving back away from the cliff at both ends.

### 5.8 Mt. Everest & Hiker Trail — Replace Random Triangles with Distant Snow-Covered Woods
- **Remove Random Pale Triangles:** Delete the awkward scattered pale blue-white triangular cones sitting beneath the 3 Everest mountain peaks.
- **Add Distant Snow-Covered Himalayan Woods (`InstancedMesh`):**
  - Replace them with a lush, **far-away snow-blanketed alpine conifer forest belt** (`1` single `InstancedMesh` batch of miniature scaled-down dark pine + crisp snow-tipped tree clusters arranged along rolling distant foothills spanning continuously across the base of all **3 massive mountain peaks**).
  - Apply subtle cool atmospheric blue-white distance tinting so the forest belt reads as kilometers away—making the 3 snow peaks tower dramatically above the tree line!
- **Prayer Flag Framing & L-Junctions:** Raise the closest foreground prayer-flag line slightly so the large colored flags arch cleanly overhead without covering Everest's central summit; keep **L-junction snowy trail bends** at both ends curving away from the mountain vista.

---

## 6. Phased Autonomous Execution Roadmap (Phases 1 – 5)

### Phase 1 — P0 Performance Rescue (Indoor/Outdoor Culling, Batching & Zero Lag)
- [ ] Split all 9 sceneries into `windowBackdropGroup` ($\le 20$ draw calls) and `outdoorOnlyGroup` (`visible = isPlayerOutside || isTitleScreen`), bypassing `outdoorOnlyGroup` `update(dt)` loops completely while indoors.
- [ ] Convert remaining per-mesh loops into `THREE.InstancedMesh` / merged static batches; remove all outdoor `PointLight`/`SpotLight`s; enforce `castShadow = false` & `receiveShadow = false` on all scenery meshes.
- [ ] Eliminate per-frame temporary vector/matrix allocations and cap mobile DPR cleanly (`<= 1.25`).
- [ ] Verify indoor draw calls $\le 75$ and smooth 60 FPS PC / playable mobile indoor framerate.

### Phase 2 — Standardized Road Network (T-Roads, Downhill Paris, L-Junctions & Gutter Fix)
- [ ] Split curbs/gutters cleanly at every junction opening with rounded corner fillets across all road sceneries (zero gutter lines crossing intersection asphalt).
- [ ] Implement **T-Road Intersections** on **Busy Street**, **Japanese Tranquility**, **Brazilian Favela** (removing end-of-road mountains), and **Cyberpunk Neon**.
- [ ] Implement **Special Downhill T-Road** on **Eiffel Tower View** with slope-following car elevation & pitch (zero floating cars).
- [ ] Implement **L-Junctions** (bending strictly away from the overlook) on **Mayon Volcano**, **Hilltop City Lights**, **Switzerland Hilltop**, and **Mt. Everest**.
- [ ] Add sleek ground cyber-cars on Cyberpunk's T-road AND upgrade flying hover-cars to bank and turn 90° down perpendicular sky-canyons instead of disappearing.

### Phase 3 — Weather Sync, NPC Rain Reactions & Anton Head/Hair Fix
- [ ] Re-anchor the rain/snow particle volume dynamically to `camera.position` so rain and snow render visibly at every **Scenic Overlook** vantage point.
- [ ] Add universal **umbrella rain reactions** to all outdoor & park NPCs (Mayon tourists, Eiffel Champ de Mars couples/strollers, and street pedestrians).
- [ ] Fix **Eiffel Tower Park NPC** bench/walkway alignments (zero NPCs sitting on walls or clipping hedges).
- [ ] Rebuild **Anton / Beb / Duminiki's** male head and dual-state cap-safe hair mesh in `src/game/secretNpc3d.ts` (zero hair clipping through the Polo RL cap or hood).

### Phase 4 — Scenery-Specific Overhauls (Hilltop, Favela, Mayon, Japan, Switzerland, Everest)
- [ ] **Hilltop City Lights:** Remove floating dot citylights; build grounded `InstancedMesh` valley metropolis + solid-pier curved highway + deeply grounded mountains (zero floating cones).
- [ ] **Brazilian Favela:** Ground every hillside house using exact terrain height + `-4.5` concrete retaining-wall plinths (zero floating or buried homes).
- [ ] **Mayon Volcano:** Replace snapped brown path rectangles with a single continuous curved dirt-and-stone trail.
- [ ] **Japanese Tranquility:** Detail both sides of the approach road leading to the red pagoda (stone railings, *toro* lanterns, *torii* gate, *nobori* banners, *ema* stands, planters).
- [ ] **Switzerland Hilltop:** Refine rugged multi-ridge alpine peaks, deep glacial lake + tiny animated ferry, viaduct bridge, Wanderweg signposts, ski racks, and grounded cliffside funicular.
- [ ] **Mt. Everest:** Delete random pale triangles beneath the peaks; replace with a distant snow-covered alpine forest belt (`InstancedMesh`) spanning all 3 mountains; adjust foreground prayer flag height so Everest's central peak stays cleanly framed.

### Phase 5 — Final Verification, Build & Mobile FPS Gate
- [ ] Run `npm run build`, TypeScript check, and full unit test suite (`rules.test.ts`).
- [ ] Verify zero console errors, zero memory leaks on rapid scenery swaps, zero floating cars/houses/cones, and confirmed smooth indoor + outdoor framerates.