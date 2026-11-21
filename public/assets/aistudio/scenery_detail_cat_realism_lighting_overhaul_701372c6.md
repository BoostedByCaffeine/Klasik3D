# Klasik 3D — Scenery Realism, Cat Animation Overhaul, Thematic Streetlights & Detail Expansion Plan

**Target Repository:** `BoostedByCaffeine/Klasik3D`  
**Primary Files:** `src/game/scene3d.ts`, `src/game/sceneries/sceneriesPart1.ts`, `src/game/sceneries/sceneriesPart2.ts`, `src/game/sceneries/surroundingContext.ts`, `src/game/sceneries/SceneryManager.ts`, `src/game/sceneries/sceneryTypes.ts`, `src/game/sceneryData.ts`, `src/game/outdoorLod.ts`, `src/game/sidewalkAvoidance.ts`, `src/game/OutdoorOverlookController.ts`, `src/components/HudOverlay.tsx`  
**Performance Target:** Mobile WebGL 2 (Android WebView APK & Web) — batch dense details via `THREE.InstancedMesh`, `THREE.Points`, and shared procedural `CanvasTexture` atlases with `castShadow = false` on distant backdrop meshes and full recursive `.dispose()` on scenery swaps.

---

## 1. Customer Overhead Order Indicator — Platinum Icon Overhaul

### Observed Issue
Above queued customers' heads inside the cafe, the floating 3D/HUD order tag still renders the legacy dark-brown/orange pill reading `! ORDER !`, clashing with the new monochrome + brushed-platinum HUD.

### Fix Specification (`src/game/scene3d.ts`, `src/components/HudOverlay.tsx`)
* **Remove Text Pill & Old Amber Palette Completely:** Replace the wide `! ORDER !` brown-and-yellow sprite/pill with a sleek, minimalist **floating circular/squircle Platinum Order Icon** (zero clutter text).
* **Brushed Platinum Icon Design (`CanvasTexture` or crisp SVG sprite):**
  * **Container:** Compact obsidian glass circle (`#09090B`, `88%` opacity) ringed with a **brushed platinum metallic border** (`linear-gradient(135deg, #F8FAFC, #94A3B8, #FFFFFF, #64748B)`).
  * **Center Glyph:** Crisp **platinum coffee-cup / order-bell icon** rendered in metallic white-to-silver (`#FFFFFF → #CBD5E1`) with a subtle pulsing silver halo ring when the customer is waiting to have their order taken.
  * **Gentle Float Animation:** Smooth vertical sine bob (`±0.035` units) facing the camera (`THREE.Sprite`), transitioning smoothly to a soft muted crimson pulse *only* if customer patience drops below `20%`.

---

## 2. Realistic Cat Animations Overhaul (Sleeping, Grooming & Hand-Fed Eating)

### Observed Issues
1. **Sleeping:** The cat currently just tips slightly forward stiffly on its bed rather than curling up naturally.
2. **Grooming:** The cat licks empty air—its raised paw never actually reaches or contacts its face/muzzle.
3. **Eating / Feed Treat:** The fish biscuit / treat currently drops onto the ground/bed while the cat pecks downward absurdly instead of nibbling a treat held right at its mouth.

### Fix Specification (`src/game/scene3d.ts`, `src/components/CatStationOverlay.tsx`)

#### 2.1 Realistic Curled Sleeping Pose (`state === 'sleeping'`)
* **Natural Loaf / Curled-Up Posture:**
  * Lower the torso smoothly into the plush cushion (`torsoYOffset = -0.055`), tuck both front paws neatly inward beneath the chest (`frontPawRotationX = +1.15 rad`, folded tightly against the chest like a real cat loaf/curl).
  * Tilt and rest the head gently downward and slightly sideways (`headPitch = +0.32 rad`, `headRoll = ±0.22 rad`) so the chin rests snugly near the folded front paws.
  * Curve the tail smoothly around the side of the body/haunches (`tailBaseYaw` curled forward around the flank) instead of sticking straight up vertically while asleep.
  * Close eyelids fully into relaxed curved crescents (`eyeScaleY = 0.08`) with slow, rhythmic **breathing torso expansion** (`scaleY` & `scaleX` gentle `±2.5%` pulse at `0.35 Hz`) and subtle slow ear twitches.

#### 2.2 Accurate Paw-to-Face Grooming Animation (`state === 'grooming'`)
* **Direct Contact Inverse-Kinematics / Coordinated Joint Alignment:**
  * Seat the cat upright cleanly, tilt and rotate the head slightly downward and toward the active grooming paw (`headPitch = +0.26 rad`, `headYaw = +0.28 rad` toward right paw).
  * Raise the active front limb (`rightFrontLeg` / `rightPaw`) high and inward (`shoulderPitch = -1.35 rad`, `shoulderRoll = -0.35 rad`) so the **paw pad physically touches the cat's muzzle/cheek coordinate** (verified dynamically against each cat's `headPos` and `pawLength` so it works identically on tiny Gigi, Lilo, Champy, and Chunky).
  * **2-Phase Realistic Groom Cycle:**
    1. *Lick Phase (0.0s–0.9s):* Rapid small rhythmic tongue/muzzle-to-paw bobbing while the paw stays held directly against the mouth.
    2. *Face-Wash Phase (0.9s–1.8s):* Smooth circular wiping arc brushing the paw cleanly across the cheek and side of the ear (`ear` dips gently in reaction to the paw swipe!), then repeats 2–3 cycles before smoothly lowering the paw.

#### 2.3 Hand-Fed Eating Animation (Treat Held Directly at Mouth) (`state === 'eating'`)
* **Remove Ground-Drop Treat Behavior:** Never toss or leave the fish biscuit lying on the floor/counter bed.
* **Player-Held Mouth-Level Treat Rig:**
  * When `Feed Treat` is triggered, animate the 3D fish biscuit / treat gliding smoothly in from the camera/player side directly to a **mouth-level hover anchor** (`mouthWorldPos + forward * 0.06`, held gently by a subtle minimalist fingertip/treat-holder pose or clean floating hand-fed offset right in front of the cat's nose/mouth).
  * **Realistic Nibbling Choreography:**
    * Cat perks ears forward, leans head eagerly forward toward the held treat (`headPitch = -0.08 rad`, subtle happy eye squint), and performs rhythmic chewing/nibbling nods (`4 Hz` subtle jaw/head motion) as the treat visibly shrinks in **3 bite stages** (`scale 1.0 → 0.68 → 0.35 → consumed`) accompanied by tiny crumb particles and floating platinum/warm heart particles.
    * Optionally lift one front paw slightly in excitement while nibbling, then finish with a happy lick-lips head tilt and purr SFX.

---

## 3. Global Realism Upgrade: End-of-Road Intersections & Natural Traffic/NPC Flow (ALL 9 Sceneries)

### Observed Issue
In **The Busy Street** and across other sceneries, cars and walking NPCs suddenly pop out of existence ("disappear like a bubble") near the visible end of the road, and road ends feel abruptly cut off rather than leading into a realistic continuation of the world.

### Fix Specification (`src/game/scene3d.ts`, `src/game/sceneries/surroundingContext.ts`, `src/game/outdoorLod.ts`)

#### 3.1 Real Cross-Street Intersections & Occluded Corners (Both `-X` and `+X` Road Ends)
* **Build True T-Intersections / 4-Way Intersections at Both Ends (`x ≈ ±34` to `±48`):**
  * Extend the main road cleanly into full **perpendicular cross-streets** running back into depth (`-Z` and `+Z`) at both the left (`-X`) and right (`+X`) ends of the block.
  * Detail every intersection with crosswalk zebra stripes, stop lines, corner curb radii, pedestrian walk signals, street name signs, corner bollards, and **corner buildings / retaining cliffs** framing the turning corridor.
  * **Beyond the Intersection (Deep Vista Continuation):** Never leave empty ground behind the intersection—place opposing cross-street facades, continuing road decks, distant trees/lamps, and layered city/landscape silhouettes *behind* the cross-street so looking down either end of the road reveals genuine depth.

#### 3.2 Zero "Bubble Popping" — Corner Turning & Off-Screen Despawning
* **Vehicles (Cars, Scooters, Hover-Cars):**
  * Extend vehicle paths past the intersection (`±42` units) and execute a **smooth 90° curved corner turn** around the intersection corner building (`turnRadius ≈ 5.5` units, rotating smoothly along the tangent onto the perpendicular cross-street) until the vehicle is **100% occluded behind a corner building, hillside, or distance fog** before recycling/despawning.
  * Spawn incoming vehicles *from around the perpendicular cross-street corner* (turning onto the main street) or deep behind fog-occluded tunnels/overpasses so players NEVER see a car blink into or out of thin air.
* **Walking NPCs (Pedestrians & Dog Walkers):**
  * Extend sidewalk waypoints around the corner curb at both `-X` and `+X` intersections so pedestrians **walk around the corner of the flanking buildings** onto the side street (or duck into a side-street alley/stairway/trail bend) and only recycle once fully hidden behind geometry.

---

## 4. Thematic Streetlights System — Bilateral Placement Across Every Scenery

### Observed Issue
Several sceneries (e.g., **Cyberpunk Neon**, **Brazilian Favela**, **Busy Street**) reuse generic legacy black lamp posts and place streetlights *only* on the cafe/shop side while leaving the opposite side of the street dark and empty.

### Architecture Specification (`src/game/sceneries/surroundingContext.ts`, `sceneriesPart1.ts`, `sceneriesPart2.ts`)
1. **Remove Generic Global Streetlights:** Strip all hardcoded default streetlights out of `scene3d.ts` so **100% of outdoor lighting fixtures are spawned per-scenery** by a dedicated `buildThemedStreetlight(theme)` factory.
2. **Bilateral Placement Rule (Shop Side + Across the Street):**
   * Place themed streetlights along **BOTH sides of the street** (near sidewalk in front of Klasik Cafe AND across the street / far curb or railing) in staggered rhythm so the whole street feels balanced and illuminated at dusk/night.
   * **Exemption Rule:** If a scenery already has dense thematic lighting (e.g., **Japanese Tranquility** with dense wooden lamps + stone *toro* + overhead *chochin* lanterns, or **Hilltop City Lights** with ridge string lights + bollards), keep placement well-spaced and atmospheric—never overcrowded.

| Scenery | Unique Thematic Streetlight Fixture | Bilateral Placement |
| :--- | :--- | :--- |
| **1. The Busy Street** | Sleek modern dark-steel urban cobra-head lamp posts with warm-white LED heads + small mounted street-banner brackets | **Both sides** (Shop sidewalk + Far storefront sidewalk + Intersection traffic lights) |
| **2. Mayon Volcano View** | Rural Philippine concrete/galvanized-pole solar highway lamps + warm hanging festoon bulbs over market canopies | **Both sides** (Shop roadside + Far ruins/market roadside edge) |
| **3. Hilltop City Lights** | Rustic highland timber-and-iron stone-base lanterns + warm overhead café fairy string lights along the ridge rail | **Exempt from tall poles across view** — low warm timber bollard lanterns + railing lights across the overlook so the valley city lights stay 100% unobstructed |
| **4. Japanese Tranquility** | Traditional dark-cedar wooden *andon* street lamps + carved stone *toro* garden lanterns + glowing red/cream *chochin* eave lanterns | **Both sides** (balanced spacing; exempt from adding extra clutter near dense lantern rows) |
| **5. Brazilian Favela** | Weathered concrete Rio utility poles with angled gooseneck sodium streetlamps, bundled black overhead power wires, and transformer boxes | **Both sides** (Shop curb + Favela hillside road edge + stairs lamps) |
| **6. Cyberpunk Neon** | Sleek angular dark-titanium **Neo-Tokyo cyber pylons** with vertical glowing cyan/magenta LED strips, floating holo-number plates, and sharp futuristic light hoods | **Both sides** (Shop sidewalk + Far cyber-arcade sidewalk + Overhead cross-street neon gantries) |
| **7. Eiffel Tower View** | Ornate cast-iron **Parisian Haussmann dark-green double/single globe *réverbères*** with fluted columns and warm golden frosted glass globes | **Both sides** (Shop boulangerie sidewalk + Montmartre balustrade terrace + Champ de Mars park lamps below) |
| **8. Switzerland Hilltop** | Classic Swiss alpine forged-iron hanging lantern posts mounted on timber/stone pedestals with snow caps on top | **Both sides** (Shop chalet side + Low warm railing lanterns along the overlook cliff without blocking peaks) |
| **9. Mt. Everest & Hiker Trail** | Rugged expedition timber posts with hanging **brass/amber storm lanterns** & solar trail beacons strapped to wooden poles | **Both sides** (Shop teahouse side + Across the cleared stone hiker trail & base camp perimeter) |

---

## 5. Fixing the "Flat Gray Ocean" Glitch (Hilltop City Lights & Switzerland Hilltop)

### Root Cause Diagnosed (Visible in Screenshots)
In both **Hilltop City Lights** (`edited-image.png`) and **Switzerland Hilltop** (`edited-image_2.png`), a wide global ground plane (`y ≈ -0.08`) extends straight out across the front of the overlook, **completely slicing over and hiding the deep valley below**! From `Scenic Overlook`, the player stares across a flat gray slab stretching to tiny mountain cones—making it look like a flat gray ocean instead of looking *down* into a glowing city valley or deep alpine gorge.

### Mandatory Geometry Fix (`src/game/sceneries/surroundingContext.ts`, `sceneriesPart1.ts`, `sceneriesPart2.ts`)
1. **Cut Out / Recess the Forward Ground Plane on Elevated Cliffside Maps (`hilltop_city_lights`, `switzerland_hilltop`, `eiffel_tower`):**
   * On elevated ridge/terrace maps, **NEVER** place a flat `y = -0.08` ground plane extending forward into the vista (`-Z` or `+Z` overlook direction beyond the terrace railing)!
   * Instead, terminate the road/terrace slab cleanly right under the **overlook parapet/railing**, build a **vertical/sloped rocky cliff face** dropping sharply downward (`y = 0` down to `y = -28`), and place the actual valley terrain/city/lake far below at `y = -22` to `-34`.
2. **Optimize `Scenic Overlook` Camera Pitch for Elevated Views:**
   * On **Hilltop City Lights** and **Switzerland Hilltop**, step the `Scenic Overlook` vantage right up to the unobstructed viewing deck rail (clear of pine trees!) with a natural slight downward default pitch (`basePitch ≈ -0.14 rad`) so the player immediately looks *out and down* over the dramatic cliff drop into the sprawling glowing city lights or alpine lake valley.

---

## 6. Massive Detail Overhauls — Every Single Scenery

> **Core Directive:** Make every single scenery feel genuinely alive, layered, and memorable—packed with foreground props, midground architecture/happenings, animated ambient life, and rich distant vistas.

### 6.1 The Busy Street (Urban Neighborhood & Corner Intersections)
* **True 4-Way Intersections at Both Road Ends (`-X` and `+X`):** Crosswalks, working **red/yellow/green traffic signals**, corner curb ramps, street name signs, and continuing cross-street buildings behind the intersection so vehicles and NPCs turn smoothly around corners and never pop out of existence.
* **Richer Street-Level Details:** Japanese/urban vending machines with softly glowing displays, bus stop bench with illuminated transit map poster, mailbox, fire hydrant, newspaper box, bike rack with parked low-poly bicycles, potted cafe greenery, glowing corner convenience store (`24H MART`), bakery, and vinyl record shop across the street with striped awnings and AC condenser units.
* **Bilateral Streetlights:** Modern dark-steel cobra-head streetlamps on both sidewalks casting warm nighttime pools.

### 6.2 Mayon Volcano View (Cagsawa Ruins & Bicol Countryside)
* **Upgrade Downgraded Limbless Tourists (CRITICAL FIX):**
  * Delete the blocky armless/legless dummy tourist meshes immediately.
  * Replace them with **full-rigged Klasik NPC characters** (proper articulated arms, hands, separate legs, shoes, hair/sun-hats, cameras/smartphones, backpacks, and Filipino/tourist outfits) posing for photos, browsing souvenir stalls, and chatting in pairs.
* **True Monumental Scale for Mayon Volcano:**
  * **Remove ALL trees positioned close to/in front of the Mayon Volcano cone base** so nothing shrinks the volcano's perceived scale.
  * Push Mayon Volcano farther back and scale it substantially wider and taller with subtle volcanic ridges, lava-gully striations, lush green lower foothills fading through atmospheric blue-green haze into dark volcanic rock near the crater, and slow drifting cloud wisps crowning the peak.
* **Rich Valley Details Beneath the Volcano:**
  * Populate the expansive plains and foothills *beneath* Mayon with **clusters of colorful miniature market canopies/tents**, distant rural Bicol village houses (corrugated roofs, *bahay kubo* nipa huts, water tower), winding dirt trails, terraced green rice paddies, wooden carabao/farm fences, and distant roadside **souvenir market rows** (woven *abaca* displays, hanging local crafts, colorful *banderitas* fiesta bunting strung between bamboo poles, and parked colorful low-poly **Philippine tricycle / ATV tour buggies** near Cagsawa!).
* **Road-End Realism:** Gently curving provincial highway flanked by bamboo groves, roadside sari-sari stores, and wooden kilometer markers leading behind hillside curves at both `-X` and `+X` ends.

### 6.3 Hilltop City Lights (Tagaytay / Baguio Ridge — Fixed & Ultra-Detailed)
* **Eliminate the Ocean Glitch:** Cut away the flat foreground ground plane beyond the stone/timber cliff parapet so the ridge drops steeply into a true dark mountain basin (`y = -24` to `-36`).
* **Unmistakable Sprawling City Lights Valley (Signature Feature):**
  * Populate the valley floor and distant rolling foothills with **layered low-poly city blocks with glowing warm/cool windows (`InstancedMesh`)**, winding elevated **highway light ribbons** with tiny moving white headlight & red taillight dots gliding through the valley, and **3,500+ crisp shimmering multi-tone city lights (`THREE.Points`, additive glow)** in sodium gold, warm amber, cool white, and tiny neon accents—blazing brilliantly at dusk/night and twinkling through misty Tagaytay ridge haze during the day.
  * Add distant illuminated hillside resorts/houses dotted along the flanking slopes of the ridge (just like Baguio's iconic hillside house lights!).
* **Rich Overlook Ridge Details:**
  * Stone-and-wood viewpoint terrace with warm **overhead café string lights** draped across wooden posts, brass **coin-operated scenic binoculars**, wooden viewpoint benches, a cozy neighboring **bulalo / highland coffee stall** with warm glowing signage, multi-tiered Baguio pine trees positioned carefully to *frame* (never block!) the overlook view, drifting cool valley cloud wisps floating *below* the railing, and curving misty mountain roads with roadside guardrails closing both `-X` and `+X` ends.

### 6.4 Japanese Tranquility (Ancient Kyoto — Detailed Intersections & Beyond)
* **Upgrade Both Road-End Intersections & Beyond:**
  * **Left Intersection (Temple Approach):** Transform the bare gray plaza into a bustling traditional Kyoto crossroads—grand **vermilion *Torii* gate** right at the intersection entry, stone *komainu* guardian plinths, carved stone steps climbing up toward an illuminated **5-tier wooden pagoda** with glowing golden interior tiers, flanking cedar & weeping *sakura* trees, roadside **festival *yatai* food/matcha stalls** with hanging paper lanterns, and continuing *machiya* shopfronts visible *past* the intersection.
  * **Right Intersection (Canal Bridge & Old Town):** Build an arched wooden/stone **Kyoto canal bridge** over a gently shimmering shallow stream lined with willow/sakura trees, stone *toro* lanterns, warm lit teahouses across the bridge, and winding lantern-lit alley rooftops receding up into misty dark-green Higashiyama hills—zero empty green slopes.
* **Street-Level Life & Detail:** Hanging wooden *ema* / wind-chime racks, bamboo *shishi-odoshi* water feature beside a neighbor shop, parked vintage Japanese bicycle, glowing red *chochin* rows, drifting sakura petals (day) and glowing golden fireflies (night), plus thematic wooden *andon* lamps on both sides of the stone *ishidatami* lane.

### 6.5 Brazilian Favela with Rio de Janeiro View (+ Christ the Redeemer!)
* **Christ the Redeemer (Jesus Statue in Iconic T-Pose) on Corcovado Hill (MANDATORY):**
  * Sculpt a recognizable, dignified low-poly **Christ the Redeemer (*Cristo Redentor*)** statue standing proudly atop the highest verdant granite peak (**Corcovado**) overlooking the favela and Guanabara Bay:
    * Stepped stone observation pedestal at the summit.
    * Iconic **outstretched arms in classic T-pose**, draped robe silhouette, and slightly inclined head rendered in warm soapstone white (`#EAE6DF`).
    * Soft warm upward **nighttime monument floodlights** illuminating the statue dramatically against the night sky so it stands out as a breathtaking centerpiece from both `Cafe Porch` and `Look Back`.
* **Fill Every Bare Green Hill Gap & Road End:**
  * Eliminate the empty green hillside holes between favela clusters by layering dense, grounded terraced brick/plaster homes, painted retaining walls, narrow winding concrete stairways (*escadarias*) with colorful painted mosaic steps, laundry lines strung between rooftops, satellite dishes, blue rooftop water tanks, and tropical palms/bananas filling every terrace seamlessly.
  * **Realistic Road-End Intersections (`-X` and `+X`):** Curve the road around colorful corner *boteco* bars, murals, stacked hillside stairs, and a distant Rio coastal overpass overlooking **Guanabara Bay** and **Sugarloaf Mountain** (with a tiny animated Sugarloaf cable car gliding between peaks in the distance!).
* **Bilateral Rio Streetlights:** Concrete utility poles with gooseneck lamps and sagging overhead power wires on *both* sides of the street.

### 6.6 Eiffel Tower View (+ Champ de Mars Green Park & Romantic Couples!)
* **Champ de Mars Green Park Beneath the Eiffel Tower (MANDATORY):**
  * Replace the empty gray concrete slab directly under and leading up to the Eiffel Tower with a lush, detailed **Champ de Mars Parisian park**:
    * Symmetrical manicured **vibrant green lawns**, crisp light-gravel promenades, low ornamental iron lawn edgings, manicured topiary hedges, colorful flowerbeds, a central stone **Parisian water fountain**, and rows of dark-green wooden park benches flanked by warm vintage globe park lamps.
    * **Living Park NPCs (Dating Couples & Strollers):** Populate the Champ de Mars walkways and lawns with miniature outdoor-only NPCs—**romantic couples walking hand-in-hand**, **dating pairs sitting together on park benches** or relaxing on **checkered picnic blankets** with tiny wine/coffee cups, solo artists sketching at a wooden easel, and strollers admiring the tower.
* **Surrounding Paris & Road Ends:**
  * Surround the park with dense Haussmannian apartment blocks, warm glowing corner bistros with tiny sidewalk café tables/chairs, Parisian green Morris advertising columns (*colonne Morris*), a distant glowing **Seine river curve** with tiny passing *Bateaux Mouches* riverboat lights, and classic Haussmann boulevard intersections closing both `-X` and `+X` road ends cleanly.
* **Bilateral Streetlights:** Ornate Parisian dark-green *réverbère* globe lamps lining both the café sidewalk and the Montmartre overlook balustrade.

### 6.7 Cyberpunk Neon (Neo-Tokyo / New Vision City — Full Thematic Overhaul)
* **Replace Old Streetlights with Bilateral Cyber Streetlights (CRITICAL):**
  * Remove every legacy round black streetlight immediately.
  * Install sleek angular **dark-titanium Cyber Light Pylons** with glowing vertical cyan/magenta neon tubes and holographic district number plates on **BOTH sides of the street** (shop side AND directly across the street), linked overhead by glowing fiber-optic cables and neon street banners.
* **Rich Cyberpunk Street Happenings:**
  * **Across-the-Street Cyber Life:** Build an open-front **glowing Hologram Noodle / Ramen Bar** with counter stools and steam rising, a buzzing **Cyberware / Arcade storefront** with animated neon kanji signs, glowing futuristic vending kiosks, steaming subway vent grates, holographic floating koi/advertising drones drifting slowly along the sidewalk, and cyber-coated NPCs pausing at street kiosks or chatting under translucent glowing umbrellas.
  * **Multi-Altitude Flying Traffic & Low-Chance Police Chase:** Keep zero wheeled cars; refine the 3 aerial traffic lanes of sleek **hover-cars / spinners** with glowing engine trails and periodic **flashing red/blue aerial police chases** weaving through the megacity canyon.
* **Road-End Realism:** Close both `-X` and `+X` ends with massive multi-level **elevated cyber-highway intersections**, illuminated neon tunnel portals where hover-traffic curves out of sight, and towering distant arcology spires with blinking red aviation warning beacons.

### 6.8 Switzerland Hilltop (Fixed Elevated Cliffside & Alpine Wonderland)
* **Eliminate the Ocean Glitch (Same Architectural Fix as Hilltop City Lights):**
  * Remove the flat gray ground slab extending past the overlook railing so the terrain plunges cleanly down a dramatic rocky-and-snowy **alpine cliff face (`y = 0 → -30`)**.
* **Deep Glacial Valley & Village Below:**
  * Build a breathtaking alpine valley far below the overlook: a **shimmering turquoise glacial lake** (with a tiny drifting wooden ferry/boat), a cluster of **warmly lit miniature Swiss timber chalets** and a tiny church spire nestled in the snowy valley floor, winding mountain roads, and cascading white **cliffside waterfalls / frozen ice falls**.
* **Grounded Inclined Elevator + Alpine Details:**
  * Ensure the **red-and-glass funicular cabin** rides cleanly on its visible steel cliffside truss from the Upper Station down to the Lower Valley Station (never clipping or disappearing into terrain), flanked by a tiny animated **overhead alpine ski gondola / cable car** gliding smoothly across a distant peak ridge!
  * Keep pine trees neatly framing the left/right edges (never parked right in front of the `Scenic Overlook` camera lens!).
  * Add Swiss chalets with glowing window boxes, red-and-white Swiss flags fluttering, stacked firewood, cozy alpine ski racks leaning against neighboring walls, snow-capped forged-iron Swiss streetlamps on both sides of the village road, and curving alpine tunnel portals / snowy switchbacks closing both road ends cleanly.

### 6.9 Mt. Everest View & Hiker Trail (Richer Expedition Base Camp)
* **Keep What Works, Elevate Every Detail:**
  * Keep the snowbank-avoidance pedestrian lanes intact and enrich the Himalayan base camp with vivid expedition storytelling:
    * **Living Base Camp Happenings:** Climbers checking maps around a glowing camp table, a warming expedition **camp brazier / stove** with tiny rising orange ember sparks, stacked colorful gear duffels, ice axes & climbing ladders leaning against supply crates, and a friendly low-poly **Himalayan Yak** standing peacefully beside a timber hitching post near the teahouse!
    * **Midground & Summit Depth:** Add dramatic jagged **Khumbu Icefall glacial seracs / ice ridges** shimmering pale cyan beneath Everest, tiny glowing **climber headlamp dots** winding slowly up a distant high-altitude snow ridge at night, an animated wispy **snow spindrift plume** blowing steadily off Everest's summit, wooden Sherpa trail bridges/mileposts (`BASE CAMP 5,364m`), and rugged timber expedition storm lanterns lining **both** sides of the cleared stone trail.
  * **Road-End Realism:** Curve the snowy stone expedition trail naturally behind towering snow-laden rocky outcrops and timber prayer-flag archways at both `-X` and `+X` ends so hikers walk out of sight naturally around the bend.

---

## 7. Phased Autonomous Implementation Roadmap (Phases 1 – 5)

### Phase 1 — Platinum Order Icons & Realistic Cat Animations
- [ ] Replace customer overhead `! ORDER !` amber pill with a sleek floating **Platinum Order Icon** (obsidian circle + brushed platinum ring + silver cup/bell glyph).
- [ ] Overhaul **Cat Sleeping** (tucked loaf paws, head resting near paws, curled tail, slow breathing pulse, closed crescent eyes).
- [ ] Overhaul **Cat Grooming** (paw physically contacts muzzle/cheek across all cat sizes + 2-phase lick & face-wash ear-dip cycle).
- [ ] Overhaul **Cat Eating** (treat held directly at mouth level like player hand-feeding; 3-stage nibble shrink + crumb/heart particles; zero ground-drop).

### Phase 2 — Road-End Intersections, Turning Flow & Bilateral Thematic Streetlights
- [ ] Build true cross-street **intersections / trail bends** at both `-X` and `+X` road ends across all 9 sceneries with continuing vista depth behind them.
- [ ] Upgrade vehicle and NPC pathing so cars and pedestrians turn smoothly around intersection corners and only despawn once fully occluded (zero bubble-popping).
- [ ] Implement the `buildThemedStreetlight(sceneryId)` factory with unique fixtures per scenery and **bilateral placement** (both shop side AND across the street, honoring exemptions for dense-lit/cliffside maps).

### Phase 3 — Fix Flat-Ocean Glitch (Hilltop City Lights & Switzerland) + Eiffel Park
- [ ] Cut away forward ground planes past the overlook railing on **Hilltop City Lights** and **Switzerland Hilltop**, replacing them with steep cliff drops and angled `Scenic Overlook` vantage sightlines clear of obstructing trees.
- [ ] Build the blazing 3,500+ point **Hilltop City Lights** valley metropolis, moving valley highway headlights, hillside resort lights, binoculars, and cafe string lights.
- [ ] Build **Switzerland Hilltop's** deep turquoise glacial lake valley, miniature lit alpine village, grounded cliffside funicular, distant alpine cable car, and snow-capped Swiss lanterns.
- [ ] Build **Eiffel Tower's Champ de Mars** lush green park right beneath the tower with symmetrical walkways, fountain, benches, picnic blankets, and **dating/walking NPC couples**.

### Phase 4 — Massive Detail Overhauls: Busy Street, Mayon, Japan, Rio & Cyberpunk
- [ ] **The Busy Street:** Detailed 4-way corner intersections, working traffic signals, convenience store/vinyl shop, bus stop, vending machines, bike rack, bilateral urban lamps.
- [ ] **Mayon Volcano:** Replace limbless tourists with full-rigged Klasik NPCs; **remove all trees near Mayon's base** so the volcano looks massive & distant; add far rural houses, miniature market canopies, fiesta *banderitas*, souvenir stalls, and parked tricycles/ATVs.
- [ ] **Japanese Tranquility:** Detail both road-end intersections and beyond—vermilion *Torii* gate, stone steps, illuminated 5-tier pagoda, festival *yatai* stalls, arched canal bridge, willow/sakura trees, and lantern-lit hills.
- [ ] **Brazilian Favela (Rio):** Add iconic **Christ the Redeemer (Jesus statue in T-pose)** on top of Corcovado hill with night floodlights, fill bare hill gaps with dense tiered homes/mosaic stairs/laundry lines, add Guanabara Bay + Sugarloaf cable car, bilateral concrete Rio utility poles, and curved road-end corners.
- [ ] **Cyberpunk Neon:** Replace all old streetlights with bilateral glowing **Cyber Light Pylons**, add street-level happenings (hologram noodle bar, arcade, steam vents, holo drones, umbrella NPCs), keep flying hover-cars + low-chance aerial police chases, and close road ends with glowing elevated highway tunnels.

### Phase 5 — Mt. Everest Polish, Performance Audit & Build Verification
- [ ] **Mt. Everest:** Add expedition happenings (camp brazier with embers, Sherpa/climber gear tables, peaceful low-poly **Yak**, Khumbu icefall seracs, distant night ridge headlamp climbers, summit snow plume, bilateral storm-lantern posts, and curved rocky trail ends).
- [ ] Audit draw calls (`InstancedMesh` / `Points`), verify zero memory leaks via recursive `.dispose()` across all 9 scenery swaps, confirm `npm run build` and unit tests (`rules.test.ts`) pass with zero TypeScript or runtime errors.