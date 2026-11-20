# Klasik 3D — Bugfix, 360° Sceneries, Title Screen Context & Cosmetics Overhaul Plan

**Target Repository:** `BoostedByCaffeine/Klasik3D`  
**Primary Files:** `src/game/scene3d.ts`, `src/game/sceneries/SceneryManager.ts`, `src/game/sceneries/sceneriesPart1.ts`, `src/game/sceneries/sceneriesPart2.ts`, `src/game/sceneryData.ts`, `src/game/sceneries/sceneryTypes.ts`, `src/game/OutdoorOverlookController.ts`, `src/components/OutdoorOverlookOverlay.tsx`, `src/game/catCosmetics3d.ts`, `src/game/catCosmeticsData.ts`, `src/game/rules.ts`, `src/App.tsx`

---

## 1. Countertop Alignment: Pastry Plate Collision Fix

### Observed Issue
In the barista Orders/Counter view, the plated pastry dish overlaps/collides with the right edge of the glass pastry showcase box and the adjacent gold service bell / serving coaster (cup stand), making alignment look cramped and touch targeting unreliable.

### Fix Specification (`src/game/scene3d.ts`)
- **Recalculate Countertop X/Z Layout:**
  - Shift the **Pastry Serving Plate** slightly forward toward the barista edge (`+Z`) and center it cleanly in an open gap between the glass pastry showcase box and the service bell / drink serving coaster (cup stand).
  - Enforce a minimum bounding-box clearance of **`>= 0.08` world units** between:
    1. Glass Pastry Showcase Box
    2. Pastry Serving Plate
    3. Order Service Bell & Cup Stand / Serving Coaster
- **Touch Target Priority:** Align the expanded invisible raycast collider (`CylinderGeometry`) directly to the repositioned plate coordinates so tapping a plated pastry reliably returns it to the showcase without accidentally ringing the bell or hitting the cup stand.

---

## 2. 3D Title Screen Corner Void & 360° Surrounding Sceneries Fix

### Observed Issues
1. **Title Screen Corner Void:** On the 3D Title Screen (storefront + parked Miata view), looking past the right corner of the Klasik Cafe building exposes an empty dark void because there are no neighboring buildings or flanking structures attached beside the shop.
2. **Floating Storefront ("Soap Opera Set" Effect):** Looking left, right, or back toward the cafe in **Outdoor Overlook Mode** reveals the coffee shop floating in an empty black void across all sceneries.
3. **Absurd / Floating Sceneries (Switzerland, Mt. Everest, etc.):** Landmarks and terrain slabs cut off abruptly at the left/right edges, appear disconnected in the void, and suffer from mismatched urban street props (round green city trees, asphalt crosswalks) bleeding into alpine maps.

### Architecture Fix (`src/game/scene3d.ts`, `src/game/sceneries/SceneryManager.ts`, `sceneriesPart1.ts`, `sceneriesPart2.ts`)

#### A. Immediate Flanking Neighboring Buildings & Sidewalk Continuity (Title Screen Corner Fix)
- **Eliminate the Corner Void Beside the Shop:**
  - Directly flank both the **left (`-X`)** and **right (`+X`)** exterior walls of the Klasik Cafe with grounded, scenery-matched neighboring structures extending continuously down the street past the camera frustum and into the distance fog:
    - **Urban / Default / Title Screen Maps (`Busy Street`, `Cyberpunk Neon`, `Japanese Tranquility`, `Eiffel Tower`, `Brazilian Favela`):** Build adjacent low-poly storefronts, brick/concrete corner apartments, warm glowing upper-floor windows, striped awnings, side alley planters, and extended sidewalk curbs flush against the cafe's left and right walls so the Title Screen right-hand corner behind the Miata and tree is filled with cohesive neighborhood architecture—zero black void.
    - **Nature / Alpine / Scenic Maps (`Switzerland Hilltop`, `Mt. Everest`, `Mayon Volcano`, `Hilltop City Lights`):** Flank the cafe's left and right sides with grounded wooden chalets, stone retaining walls, terraced snow banks / highland ridges, fences, and biome-accurate trees so the shop sits naturally embedded in the landscape.
- **Solid Cafe Exterior Shell:** Ensure the Klasik Cafe's exterior side walls, rear wall, roof parapet, and foundation base are fully meshed (`THREE.DoubleSide` or outward-facing geometry) so looking back from outside never reveals hollow or floating corners.

#### B. True 360° Surrounding Environment Across All 9 Sceneries
- **Continuous 360° Ground Skirt:** Every scenery must mount a wide circular/square ground plane (`radius >= 160` units) colored/textured for its biome (snowfields for Everest/Switzerland, Parisian cobblestone/rooftop valley for Eiffel, volcanic terrain/grass for Mayon, city blocks/asphalt for Busy Street & Cyberpunk).
- **360° Horizon & Distance Fog Blending:** Pair a full **360° Sky Dome + Horizon Band** with tuned `THREE.FogExp2` so the distant ground perimeter dissolves seamlessly into the sky in all directions (`0°–360°`)—never a hard black drop-off.
- **Biome Prop Hygiene:** Move default urban round green trees, streetlights, and zebra crosswalk markings out of the global static scene and exclusively into urban scenery builders so **Switzerland Hilltop** and **Mt. Everest** render strictly snow-dusted conifers, alpine trails, and mountain timber posts.
- **Switzerland Hilltop Visual Grounding:** Rebuild the Switzerland view as a cohesive layered alpine overlook—continuous snowy foreground terrace and wooden guardrail, sloping pine hillside with grounded chalets, a visible steel track anchoring the animated **inclined elevator (funicular)** directly into the mountainside (never floating), and layered snow-capped peaks wrapping around the horizon.

---

## 3. Remove Broken "Scenic Overlook" on Wall-Blocked Maps

### Observed Issue
Tapping **Scenic Overlook** on **The Busy Street** moves the camera directly into a flat building wall and awning across the street.

### Fix Specification (`src/game/sceneryData.ts`, `src/game/OutdoorOverlookController.ts`, `src/components/OutdoorOverlookOverlay.tsx`)
- Add a per-scenery flag in `src/game/sceneryData.ts`:
  ```ts
  hasScenicOverlook: boolean;
  ```
- Set `hasScenicOverlook: false` for **The Busy Street** (and any dense urban corridor where stepping forward zooms into a building wall).
- In `OutdoorOverlookOverlay.tsx`, conditionally hide the **`Scenic Overlook`** pill button whenever `activeScenery.hasScenicOverlook === false`, leaving **`Cafe Porch`** and **`Look Back`** cleanly centered.
- On all maps where `hasScenicOverlook: true` (Mayon, Hilltop City Lights, Japanese Tranquility, Brazilian Favela, Cyberpunk Neon, Eiffel Tower, Switzerland Hilltop, Mt. Everest), verify the overlook vantage point has an unobstructed panoramic sightline with zero wall or tree clipping.

---

## 4. Two-Lane Traffic & Inside/Outside Dynamic Performance LOD

### Observed Issues
- In **The Busy Street**, vehicles drive back and forth on the same lane, overlapping and clipping into one another.
- High-detail outdoor animation wastes GPU budget when the player is inside brewing coffee, while stepping outside needs richer environmental life to feel immersive.

### Fix Specification (`src/game/scene3d.ts`, `src/game/sceneries/*`)

#### A. Proper Two-Lane Directional Traffic
- Split street traffic into two strictly separated lanes with distinct `Z` offsets:
  - **Near Lane (Eastbound, `+X`):** Vehicles oriented facing `+X`, wrapping cleanly from `-X_BOUND` to `+X_BOUND`.
  - **Far Lane (Westbound, `-X`):** Vehicles oriented facing `-X`, wrapping cleanly from `+X_BOUND` to `-X_BOUND`.
- Enforce minimum spacing per lane (`>= 10` units) so vehicles never overlap, with white headlights on the front and red taillights on the rear.

#### B. Inside vs. Outside Adaptive LOD Controller
Drive outdoor scene density with an `isPlayerOutside: boolean` LOD state (active in **Outdoor Overlook Mode** and on the **3D Title Screen**, minimized when inside the cafe):

| System | Player **INSIDE** (Minimal GPU Cost) | Player **OUTSIDE** (Rich Living World) |
| :--- | :--- | :--- |
| **Traffic / Cars** | Minimal distant silhouettes, low count (2–3 max) | Full-detail low-poly vehicles (sedans, hatchbacks, vans, wheels, headlights/taillights) across both lanes |
| **Sky & Atmosphere** | Static sky dome + basic weather | **Dynamic drifting 3D cloud clusters** + occasional **flying bird flocks** (soaring / V-formation glides) |
| **Ambient Pedestrians** | Minimal passerby count (1–2 visible through glass) | Richer outdoor crowd (5–8 NPCs) with procedural ambient behaviors |

#### C. Outdoor-Only Ambient NPC Behaviors
Spawn and animate these behaviors **only when `isPlayerOutside === true`** (and cleanly pause/despawn them upon returning inside):
- **Universal Outdoor Behaviors:**
  - **Dog Walker:** NPC strolling with a small animated low-poly dog trotting ahead on a thin leash.
  - **Cellphone Browser:** NPC walking slightly slower with head tilted down holding a softly glowing phone rectangle in front of their chest.
  - **Phone Call:** NPC walking with one arm raised holding a phone to their ear.
  - **Coffee Stroller:** NPC walking while holding a takeaway Klasik cup.
- **Scenery-Specific Unique Outdoor Behaviors:**
  - **Busy Street:** Commuters on phone calls, dog walkers, occasional jogger.
  - **Mayon Volcano / Eiffel Tower / Switzerland:** Tourists pausing near the scenic railing to lift a phone/camera for a photo.
  - **Mt. Everest:** Bundled hikers walking the stone trail with backpacks and trekking poles.
  - **Japanese Tranquility:** Slow evening strollers carrying warm glowing paper lanterns.
  - **Cyberpunk Neon:** Rain-coated pedestrians walking beneath translucent neon-lit umbrellas.
  - **Brazilian Favela:** Locals chatting near the hillside steps or carrying a football.
  - **Hilltop City Lights:** Visitors pausing near the ridge rail enjoying the valley lights.

---

## 5. Cat Cosmetics Rebuild: Skeleton Dinosaur & Cat Cloth

### Observed Issues
- **Skeleton T-Rex Costume:** Does not adapt to individual cat sizes; the white dorsal spine/tail cuts directly *through* the cat's back/body mesh, ribs clip inward, and lower teeth float disconnected in front of the neck.
- **Cat Cloth:** Clips inside the chest and belly on smaller/chubbier cats (e.g., Lilo), leaving only curved side flaps poking out the left and right sides.
- **Keep Working Items Untouched:** Preserve **Cat Glasses** and **Thuglife Cat Glasses** with zero changes.

### Fix Specification (`src/game/catCosmetics3d.ts`, `src/game/catCosmeticsData.ts`)

#### A. Geometry-Driven Cat Fit Profiling
Read each cat's actual procedural body dimensions (`torsoRadiusX`, `torsoRadiusY`, `torsoRadiusZ`, `torsoCenterY`, `torsoPitch`, `headRadius`, `neckY`, `tailBasePos`) directly from the cat rig instead of relying on uniform hardcoded scales, applying a guaranteed outward clearance:
```ts
const CLEARANCE = 0.028; // Ensures fabric/bones always sit strictly outside the fur mesh
```

#### B. Cat Cloth Rebuild (All 5 Colors — All Cat Sizes)
- Build the sleeveless pet vest as a **conformal open-ended curved torso shell** derived from each cat's exact torso ellipsoid (`rx = torsoRadiusX + CLEARANCE`, `ry = torsoRadiusY + CLEARANCE`, `rz = torsoRadiusZ + CLEARANCE`), matched to the seated torso pitch angle.
- Include a clean open collar neckline just below `neckY`, rounded side armhole cutouts for the front legs, and full continuous front chest + curved back coverage so fur never pokes through on **Gigi** (kitten), **Lilo** (small & chubby), **Tisay** (slender), **Champy** (standard), **Mikmik**, or **Chunky** (large).

#### C. Skeleton T-Rex Costume Rebuild (Zero Body Clipping)
- **Skull Hood (`anchor_head_top`):** Scale dynamically to `headRadius * 1.18`. Anchor the lower jaw solidly onto the chin strap / neck collar ring so the lower teeth never float disconnected in mid-air.
- **External Dorsal Spine & Ribcage:**
  - Sample 5–6 points along the **outer dorsal back surface** of the cat's torso (`surfacePoint + outwardNormal * (CLEARANCE + 0.015)`). Place the plush vertebral ridge and dorsal bone spikes strictly along this *external* path so the spine sits cleanly *on top of* the back rather than inside the body.
  - Wrap the curved side ribcage strips around `rx + CLEARANCE`, anchored directly to the external dorsal spine.
- **Tapered Skeletal Tail:** Anchor the bone tail root to `tailBasePos` offset slightly outward from the rump and curve it smoothly behind the cat so it never pierces the lower torso.

---

## 6. Cookie Jar Cheat Update (Unlock All Unlockables)

### Observed Issue
The hidden **Cookie Jar** unlock-all cheat is outdated and does not unlock all newer progression items (including the **9 outdoor sceneries**, **6 patron outfit packs**, and newer cats/cosmetics).

### Fix Specification (`src/game/rules.ts`, `src/App.tsx`)
Update the Cookie Jar cheat handler to dynamically unlock **every** item directly from the master registry arrays so it stays future-proof:
- All **Cats** (including `amby`, `gigi`, and secret `tisay`)
- All **Cat Cosmetics** (Glasses, Thuglife Glasses, Gold Chain, Cat Beret, all 5 Cat Cloth colors, Skeleton T-Rex Costume)
- All **9 Outdoor Sceneries** (`busy_street` through `mt_everest`)
- All **6 Patron Outfit Packs** (`filipino`, `brazilian`, `ancient_japanese`, `french`, `swiss`, `hiker`)
- All **Cafe Upgrades & Decors** (including Golden Espresso Machine)
- Save immediately to `localStorage` and refresh all Shop, Wardrobe, and Scenery UI panels.

---

## 7. Miata Parking, NPC Collision Avoidance, Reversed Headlights & Storefront Signage

### Observed Issues
1. **NPCs Clipping Through Miata:** Walking exterior NPCs pass straight through the parked 1990 Mazda Miata MX-5.
2. **Reversed Headlight Beams:** The Miata's volumetric headlight cones point backward over the hood/windshield instead of forward onto the pavement.
3. **Legacy Yin-Yang Signage Emblem:** The 3D entrance sign mounted above the cafe storefront glass still displays the old red/white **yin-yang** icon instead of the latest monochrome + brushed-platinum **Kissaten / Automotive Pill Crest**.

### Fix Specification (`src/game/scene3d.ts`)
1. **Miata Parking Adjustment:**
   - Shift the parked Miata cleanly into a dedicated curb/driveway bay slightly offset from the main pedestrian sidewalk lane so the entrance walkway stays open.
2. **Lightweight NPC Obstacle Avoidance:**
   - Register the Miata's padded 2D bounding box (`{ minX, maxX, minZ, maxZ }` with `+0.55` unit margin) alongside planters and streetlights in a `SIDEWALK_OBSTACLES` list.
   - Update exterior pedestrian pathing so approaching NPCs smoothly steer laterally around the Miata without colliding with the car, storefront glass, or street furniture.
3. **Fix Reversed Miata Headlights:**
   - Position the apex (narrow tip) of both volumetric headlight cones (`headlightConeL`, `headlightConeR`) directly at the pop-up headlight lenses and flip/orient their rotation so the wide beam projects **forward** ahead of the front bumper, pitched slightly downward (`-8°`) onto the street.
4. **Replace Storefront Signage Yin-Yang with Latest Game Logo Emblem:**
   - Update the `CanvasTexture` generator for the 3D exterior entrance sign (`KLASIK 3D GARAGE GARDEN CAFE`) in `src/game/scene3d.ts`.
   - Replace the legacy yin-yang circle with the new **monochrome + brushed-platinum Kissaten / Automotive Pill Crest** (matte-black `#09090B` pill frame, platinum double border, 3-spoke steering wheel / vinyl ring, white roasted coffee bean hub) alongside crisp white/silver `KLASIK` typography and a brushed-platinum `3D` pill badge matching `/public/klasik-logo.svg`.

---

## 8. Phased Execution & Verification Checklist

### Phase A — Countertop, Miata, Title Screen Corner Context, Signage & Cookie Jar
- [ ] Pastry plate cleanly separated from glass pastry box, service bell, and cup stand; easily tappable.
- [ ] Neighboring buildings / scenery-matched flanking structures sit flush beside the cafe's left and right corners—**zero corner void** visible on the 3D Title Screen.
- [ ] Miata parked clear of the main walkway; exterior NPCs smoothly detour around it without clipping.
- [ ] Miata headlight cones project forward onto the pavement.
- [ ] 3D storefront entrance sign displays the new monochrome + platinum Automotive/Kissaten Crest (zero yin-yang).
- [ ] Cookie Jar unlocks all 9 sceneries, 6 patron outfits, all cats, all cosmetics, and all cafe upgrades.

### Phase B — Cat Cosmetics Universal Fit
- [ ] Cat Cloth (all 5 colors) wraps smoothly around Gigi, Lilo, Tisay, Champy, Mikmik, and Chunky with zero chest/belly clipping.
- [ ] Skeleton T-Rex dorsal spine rides externally on the back, ribs wrap outside the torso, tail clears the rump, and lower jaw connects cleanly to the neck collar.
- [ ] Cat Glasses and Thuglife Glasses remain untouched.

### Phase C — 360° Surrounding Sceneries, Wall-Check & Inside/Outside LOD
- [ ] Zero void visible when looking left, right, or back at the cafe across all 9 sceneries.
- [ ] Switzerland Hilltop & Mt. Everest feature grounded alpine terrain, snow-dusted conifers, and zero floating props or urban street trees.
- [ ] `Scenic Overlook` button hidden on Busy Street (no building-wall zoom).
- [ ] Busy Street traffic flows cleanly in two opposing lanes without collisions.
- [ ] Inside/Outside LOD active: dynamic clouds, flying birds, detailed cars, dog walkers, cellphone users, phone-call strollers, and scenery-specific NPC behaviors activate only when outside and minimize when inside.
- [ ] Production build (`npm run build`) compiles cleanly with zero errors.