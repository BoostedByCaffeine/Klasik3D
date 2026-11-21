# Klasik 3D — Scenery Polish, Asset Optimization & Audio Bugfix Plan

**Target Repository:** `BoostedByCaffeine/Klasik3D`

**Primary Files:** `src/game/catCosmetics3d.ts`, `src/game/sceneries/sceneriesPart1.ts`, `src/game/sceneries/sceneriesPart2.ts`, `src/game/sceneries/surroundingContext.ts`, `src/game/sceneries/SceneryManager.ts`, `src/game/sceneryData.ts`, `src/game/OutdoorOverlookController.ts`, `src/components/OutdoorOverlookOverlay.tsx`, `src/game/scene3d.ts`, `src/game/outdoorLod.ts`, `src/game/sidewalkAvoidance.ts`, `src/game/audio/MusicPlayerController.ts`, `src/components/UnifiedAudioModal.tsx`, `android-native/audio/KlasikMediaListenerService.kt`, `android-native/audio/KlasikNativeAudioBridge.kt`, `scripts/patch-android-capacitor.mjs`

## 1. Cat Cosmetics Optimization (Zero Leg Clipping)

> **Preservation Rule:** Keep **Cat Glasses**, **Thuglife Cat Glasses**, **Cat Beret**, and **Gold Chain** intact unless otherwise specified.

### 1.1 Skeleton Dinosaur Costume Cleanup (`src/game/catCosmetics3d.ts`)

* **Observed Issues:**
  * Lower rib strips clip directly into the cat's front legs and hindquarters.
  * An unnecessary white ring/band wraps around the chest/neck area.
* **Fix Specification:**
  * **Remove the chest/neck ring completely**—the costume must consist **strictly of 3 clean parts**:
    1. **Open-Jaw T-Rex Skull Hood** (cleanly framing the cat's face with zero floating jaw parts).
    2. **External Dorsal Spine + Tapered Bone Tail** (riding cleanly along the outer back curve above the fur).
    3. **Upper-Chest Ribcage Only** — **remove all lower ribs near the legs/haunches**. Keep only **3 compact curved rib pairs** positioned strictly on the **upper chest / mid-back zone** (`y` strictly above the front leg shoulder joint and well forward of the haunches), with `CLEARANCE = 0.03` outward offset so zero ribs ever touch or intersect the legs.

### 1.2 Cat Cloth Outfit Redesign — Chest-Only Fit (`src/game/catCosmetics3d.ts`)

* **Observed Issues:**
  * Full-body cloth shell and dark armhole trim rings misalign and clip into the front legs and belly across different cat sizes.
* **Fix Specification:**
  * Replace the full-body wrap with a **cropped chest & upper-shoulders cafe bib / tank** that covers **only the upper chest and upper back section** of the cat (stopping cleanly *above* the front legs and belly).
  * **Remove the protruding dark side loop rings** that currently clip into the front legs.
  * Anchor directly below the collar line (`neckY - 0.015`) and span only the upper `42%` of the torso height so every cat build (**Gigi, Lilo, Tisay, Champy, Amby, Mikmik, Chunky**) displays crisp, zero-clipping fabric in all 5 colors (**Pink, Yellow, Blue, White, Orange**).

## 2. Universal Outdoor Environment Fixes (ALL 9 Sceneries)

### 2.1 Eliminate Far Road-End & Corner Voids (ALL Sceneries)

* **Observed Issue:** Looking down the far left (`-X`) or far right (`+X`) ends of the road—and past the far corners of every scenery—exposes a stark, empty horizon void with plain untextured rectangular filler boxes.
* **Mandatory Architecture Fix (`surroundingContext.ts`, `sceneriesPart1.ts`, `sceneriesPart2.ts`):**
  1. **Road-End Visual Terminators (Both `-X` and `+X` Ends):** Never let a straight road abruptly cut off into empty sky. At both road ends (`x ≈ ±45` to `±85`), add scenery-appropriate terminators:
     * **Urban Maps:** Distant cross-street T-intersections, traffic signal gantries, corner mid-rise buildings spanning across the road axis, overhead pedestrian bridges / highway overpasses, and layered skyline silhouettes receding into atmospheric fog.
     * **Historic Kyoto (`Japanese Tranquility`):** Grand vermilion *Torii* shrine gates, curving stone steps, blooming sakura canopy, and a multi-tiered pagoda against forested hills closing both ends of the lane.
     * **Nature / Scenic Maps:** Gentle terrain embankments, curving hillside rock faces, dense conifer/palm clusters, wooden trail bends, and layered mountain ridges closing the visual corridor cleanly.
  2. **Detailed Neighboring & Far-Corner Buildings (Zero Blank Boxes):**
     * Upgrade **every** neighboring building beside Klasik Cafe AND every distant corner building using shared procedural `CanvasTexture` facades + `InstancedMesh` architectural trims:
       * Multi-story window grids (with warm emissive interior glow at dusk/night).
       * Roof parapets, pitched/corrugated roofs, AC compressor boxes, balconies, shutters, colorful striped shop awnings, vertical signs, and street-level doorways.
  3. **Tuned Atmospheric Depth (`THREE.FogExp2` + Sky Horizon Blend):** Match the fog color exactly to the sky dome's lower horizon gradient band so distant road ends and far corners dissolve naturally into atmosphere rather than cutting off sharply.

### 2.2 Remove `Scenic Overlook` on Street-Corridor Sceneries (`sceneryData.ts`, `OutdoorOverlookOverlay.tsx`, `OutdoorOverlookController.ts`)

* **Observed Issue:** Street-corridor maps with opposing structures directly across the road do not have a panoramic vista for `Scenic Overlook`, causing awkward or obstructed framing.
* **Fix Specification:**
  * Set `hasScenicOverlook: false` for all **4 street-corridor sceneries**:
    1. **The Busy Street** (`busy_street`)
    2. **Cyberpunk Neon** (`cyberpunk_neon`)
    3. **Brazilian Favela** (`brazilian_favela`)
    4. **Japanese Tranquility** (`japanese_tranquility`)
  * Keep `hasScenicOverlook: true` strictly for the **5 open-vista sceneries**:
    * **Mayon Volcano View** (`mayon_volcano`)
    * **Hilltop City Lights** (`hilltop_city_lights`)
    * **Eiffel Tower View** (`eiffel_tower`)
    * **Switzerland Hilltop** (`switzerland_hilltop`)
    * **Mt. Everest & Hiker Trail** (`mt_everest`)
  * In `OutdoorOverlookOverlay.tsx`, hide the **`Scenic Overlook`** pill button whenever `hasScenicOverlook === false` (leaving **`Cafe Porch`** and **`Look Back`** cleanly centered). If a player switches to a map with `hasScenicOverlook: false` while currently in `overlook`, automatically snap back to `porch`.

### 2.3 Fix Glitching Road Gutters (Z-Fighting)

* **Observed Issue:** Road gutters, curbs, and ground planes flicker/glitch on mobile GPUs—especially noticeable on **Hilltop City Lights** and **Mayon Volcano**.
* **Root Cause:** Coplanar geometry sharing `y ≈ 0.0`.
* **Fix Specification:** Enforce strict vertical Y-elevation separation across all 9 sceneries:
  * Outer terrain / valley base: `y = -0.08`
  * Asphalt road surface: `y = 0.00`
  * Road gutter / drainage strip: `y = 0.012` (with `polygonOffset: true, polygonOffsetFactor: -1`)
  * Crosswalk & dashed lane markings: `y = 0.024`
  * Raised concrete sidewalk / terrace: `y = 0.09` (solid extruded thickness `0.12` extending down to `-0.03` so zero gaps appear underneath).

### 2.4 Fix Reversed Diagonal Dog Leash (`src/game/scene3d.ts` / `src/game/outdoorLod.ts`)

* **Observed Issue:** On dog-walking NPCs (including the 3D Title Screen), the black leash line angles diagonally *backward/upward* instead of connecting the NPC's hand to the dog's collar.
* **Fix Specification:**
  * Compute the leash geometry dynamically from two exact local anchor points on the walker rig:
    * `start = npcHandPos` (walker's right hand holding the leash)
    * `end = dogCollarPos` (top of the dog's neck ahead of the walker)
  * Each frame (or on rig setup), position the thin leash cylinder at `midpoint = start.clone().add(end).multiplyScalar(0.5)`, set its length to `start.distanceTo(end)`, and align its orientation strictly from `start` toward `end` using `quaternion.setFromUnitVectors(UP_AXIS, end.clone().sub(start).normalize())`.
  * Verify orientation works identically whether the NPC walks `+X` or `-X` and on the Title Screen.

## 3. Massive Detail Overhaul — Per-Scenery Upgrades

> **Mobile Performance Rule:** Batch repeated windows, trees, roofs, buildings, lamps, and lights with `THREE.InstancedMesh` and `THREE.Points` (`castShadow = false` on distant geometry) so rich visual density stays smooth on Android WebView APKs.

### 3.1 Rio de Janeiro / Brazilian Favela (`hasScenicOverlook: false`)

* **Observed Issues:** Plain pastel boxes stacked against a flat brown slab/triangle hill; abrupt left/right cliff cutoffs into void.
* **Massive Detail Upgrades:**
  * **Sculpted Stepped Hillside:** Replace the flat brown slab with multi-tiered rocky/lush green terraced hillside geometry wrapping continuously across the entire `-X` to `+X` horizon (zero floating edges).
  * **Authentic Detailed Favela Architecture (`InstancedMesh` + Procedural Facade Textures):**
    * Replace bare colored boxes with detailed terracotta/painted-plaster hillside homes featuring **corrugated tin roofs**, iconic **blue rooftop water tanks (*caixas d'água*)**, recessed dark/lit windows, wooden doors, rooftop laundry lines, small concrete balconies, and painted **winding hillside staircases** connecting tiers.
  * **Street & Neighboring Context:** Detailed Brazilian corner shops/bakeries flanking Klasik Cafe, tropical palm & bougainvillea clusters, authentic tangled overhead utility wires on leaning wooden poles, vibrant street-art accent walls, and a clear distant horizon featuring **Guanabara Bay**, **Sugarloaf Mountain**, and **Corcovado peak with the Christ the Redeemer silhouette**.

### 3.2 Mayon Volcano View (Cagsawa Ruins, Bicol) (`hasScenicOverlook: true`)

* **Observed Issues:** Sparse foreground, glitching road gutter, lacks local life, tourists, and souvenir markets.
* **Massive Detail Upgrades:**
  * **Outdoor Bicol Souvenir Market Stalls:** Line the midground roadside/plaza near the ruins with charming bamboo-and-wood souvenir stalls featuring colorful striped tarps, hanging woven *abaca* bags/hats, display tables with miniature Mayon crafts, and warm hanging market string bulbs.
  * **Sightseeing Tourists:** Add outdoor-only tourist NPCs browsing the souvenir stalls, snapping photos/selfies angled toward Mayon Volcano, and strolling near the Cagsawa plaza.
  * **Enhanced Cagsawa & Landscape:** Detailed volcanic-stone **Cagsawa belfry ruins** with arched openings, mossy stone trim, surrounding low stone garden wall, lush terraced rice paddies, dense multi-frond coconut palm groves, a distant volcanic mist ring near Mayon's crater, and detailed Filipino roadside shop/cafe neighbors flanking Klasik Cafe (zero void at road ends).

### 3.3 Hilltop City Lights (Tagaytay / Baguio Experience) (`hasScenicOverlook: true`)

* **Observed Issues:** Flat gray floor, plain fence, bare cone trees, glitching gutter, and **no visible city lights**.
* **Massive Detail Upgrades:**
  * **True Elevated Ridge Drop-Off:** Drop the terrain steeply *below* the overlook railing (`y = -8` down to `-36`) so players genuinely feel perched high on a Tagaytay/Baguio mountain ridge.
  * **Sprawling Glowing Valley Metropolis (The Signature Feature):**
    * Build a vast low-poly valley city sprawling below the ridge with clustered city districts, winding highway ribbons with tiny moving car-headlight streaks, and **2,500+ shimmering city light points (`THREE.Points`, additive glow)** in warm amber, sodium-gold, white, and soft cyan—clearly visible at dusk/night and softly sparkling through highland haze by day.
  * **Highland Overlook Polish:** Stone-and-timber viewpoint parapet, coin-operated **scenic binoculars**, warm **overhead café string lights** draped along the ridge, layered multi-tier Baguio pine trees (replacing flat cones), drifting misty valley cloud wisps below the railing, and cozy highland timber/stone neighboring cafes flanking Klasik Cafe.

### 3.4 Cyberpunk Neon (New Vision City) (`hasScenicOverlook: false`)

* **Observed Issues:** Blank dark purple boxes, bright daytime cartoon sky, regular ground cars, huge empty highway void at the far corner.
* **Massive Detail Upgrades:**
  * **Zero Ground Cars -> Multi-Lane Flying Hover-Cars (Spinners):**
    * Completely **remove all wheeled ground cars** in Cyberpunk Neon.
    * Replace them with sleek futuristic **hover-cars / spinners** gliding along 3 stacked aerial traffic lanes (`y = 4.5`, `y = 11`, `y = 19`) with glowing cyan/amber thrusters, light trails, and underglow.
  * **Low-Chance Aerial Police Chase Event (`~10%` periodic encounter):**
    * Occasionally spawn a sleek dark fugitive spinner speeding rapidly down the aerial corridor closely pursued by **1–2 Cyberpunk Police Spinners** with alternating flashing **red/blue strobing lightbars** and a sweeping volumetric downward searchlight cone.
  * **Dense Megacity & Highway-End Closure:**
    * Close off both far ends of the street with towering **elevated maglev/monorail skybridges**, stacked megastructure arches, and glowing distant arcology towers—zero empty void.
    * Cover all buildings (including immediate cafe neighbors like a glowing ramen/noodle bar & cyber-tech shop) with emissive window grids, vertical holographic Japanese/cyber signage, giant animated translucent billboards, steaming street grates, and moody deep-indigo/cyber-twilight lighting with wet reflective neon puddles.

### 3.5 Eiffel Tower View (Paris Montmartre Terrace) (`hasScenicOverlook: true`)

* **Observed Issues:** Bare Eiffel Tower standing alone on an empty gray plane with zero surrounding Paris city.
* **Massive Detail Upgrades:**
  * **Massive Surrounding Parisian Metropolis:**
    * Fill the entire basin below the Montmartre terrace with a sprawling **Haussmann-style Paris cityscape** (`InstancedMesh` batches of 5–6 story cream-limestone buildings, dark-slate mansard roofs, dormer windows, chimney clusters, warm glowing apartment windows, and tree-lined boulevards stretching 360° into soft horizon mist).
  * **Upgraded Eiffel Tower Landmark:** Refine the tower with crisp open-arch base legs, 3 detailed observation decks, lattice taper, summit antenna, and **animated golden twinkle sparkles + sweeping night searchlight beacon** at night.
  * **Montmartre Terrace & Neighboring Shops:** Flank Klasik Cafe with authentic **Parisian boulangerie, patisserie, and bookshop** facades featuring striped awnings, wrought-iron Juliet balconies, flower window boxes, ornate vintage Parisian green streetlamps, and cobblestone street paving.

### 3.6 Switzerland Hilltop (Alpine Overlook & Inclined Elevator) (`hasScenicOverlook: true`)

* **Observed Issues:** Flat ground looks like a riverside rather than an elevated hilltop; the inclined elevator descends into the ground and gets buried.
* **Massive Detail Upgrades:**
  * **Unmistakable High-Altitude Cliffside Drop:**
    * Position the cafe road and timber overlook deck high on a cliffside (`y = 0`) overlooking a **deep alpine valley (`y = -18` to `-42`)** containing a shimmering turquoise glacial lake, miniature timber chalets, winding alpine roads, and distant pine meadows far below.
  * **Proper Grounded Inclined Elevator (Cliffside Funicular):**
    * Build a clear **Upper Cliffside Station** flush with the overlook terrace (`y = 0`), a visible **exposed angled steel truss viaduct/rail** hugging the rocky cliff face down to a visible **Lower Valley Station** (`y = -16`), and clamp the animated red-and-glass funicular cabin strictly between `t = 0.0` (Upper Station) and `t = 1.0` (Lower Station) with `5s` boarding pauses—**never clipping or burying into terrain**.
  * **Alpine Details:** Multi-tiered snow-dusted Swiss spruces, wooden chalets with pitched eaves, balconies, and red geranium flower boxes flanking Klasik Cafe, Swiss flagpoles, stacked firewood, stone retaining walls, and rugged 360° snow-capped alpine peaks.

### 3.7 Mt. Everest View & Hiker Trail (`hasScenicOverlook: true`)

* **Observed Issues:** Nearly there, but needs richer expedition details and **NPCs currently walk into deep snowdrifts looking buried**.
* **Fixes & Detail Upgrades:**
  * **Strict Snowbank Avoidance for NPCs (`sidewalkAvoidance.ts`, `scene3d.ts`):**
    * Constrain all Mt. Everest outdoor passerby and hiker spawn/walk lanes strictly inside the **cleared stone hiker trail & shoveled walkway Z-corridor**.
    * Register all high snowbanks/drifts as explicit exclusion zones so zero NPCs ever step into deep snow or look buried waist-deep.
  * **Base-Camp & Himalayan Polish:**
    * Add vibrant **expedition dome tents** (yellow/orange with warm inner lantern glow), stacked expedition supply crates & oxygen cylinders, a carved stone **Himalayan *chorten* / stupa cairn** anchored to the fluttering Tibetan prayer flag lines, a wooden trail signpost (`EVEREST BASE CAMP • 5,364m`), subtle wind-blown **spindrift snow** streaming off Everest's summit, and warm timber Himalayan teahouse neighbors flanking Klasik Cafe.

### 3.8 Japanese Tranquility (Ancient Kyoto Town — Massive Detail Overhaul) (`hasScenicOverlook: false`)

* **Observed Issues:** Plain flat brown boxes with blank white rectangles for windows/doors, featureless flat gray road pavement, sparse lamp posts, and a stark empty void at the end of the road.
* **Massive Detail Upgrades:**
  * **Rich Authentic *Machiya* Townhouse Architecture (`CanvasTexture` + 3D Trim):**
    * Replace every blank white window rectangle with authentic **Japanese wooden *koushi* lattice grids**, warm backlit **shoji paper sliding screens** (soft amber glow at dusk/night), wooden window sills, and vertical cedar plank siding.
    * Add **hanging split *noren* doorway curtains** (deep indigo, matcha green, burgundy with subtle Japanese crests), vertical wooden shop signboards (*kanban*), overhanging dark-slate curved *kawara* tiled eaves with exposed rafters, and glowing red/warm-white **paper *chochin* lanterns** suspended along the eaves.
  * **Kyoto Streetscape & Props:**
    * Replace the flat gray road surface with textured **Kyoto *ishidatami* stone flagstone paving** with subtle stone drainage channels along the edges.
    * Populate the lane with **blooming pink *sakura* (cherry blossom) trees** arching over the rooftops, carved stone ***toro* lanterns**, wooden bamboo planters, miniature mossy garden rocks, traditional wooden *engawa* benches, and small wooden barrels/teahouse umbrellas.
  * **Complete Road-End Void Closure (Both `-X` and `+X` Ends):**
    * Terminate the primary road end with a striking **vermilion *Torii* shrine gate**, ascending stone temple steps flanked by tall cedar/sakura trees, and a **multi-tiered Kyoto wooden pagoda** rising against layered misty **Higashiyama green mountain ridges**—eliminating 100% of the empty horizon void.
    * Close the opposite road end with a gentle curve of traditional *machiya* facades, a stone canal bridge railing, and layered temple roofs receding into warm mist.
  * **Detailed Cafe Neighbors:** Flank Klasik Cafe directly with an adjoining traditional matcha tea house and ceramic shop featuring wooden lattice screens, *noren* curtains, and glowing lanterns so the exterior looks cohesive from every angle.

### 3.9 The Busy Street (Far-Corner Polish) (`hasScenicOverlook: false`)

* Replace plain distant beige blocks with detailed corner apartments, crosswalk traffic lights, a bus stop shelter, vending machines, rooftop water towers, and distant cross-street buildings closing both road ends cleanly.

## 4. Audio Fixes: Internet Radio & Background External Music Detection

### 4.1 Why Radio Says "No Signal" (and How to Fix It)

> **Clarification for Players:** You do **NOT** need to plug in earphones as an FM antenna. Klasik 3D's radio is an **internet streaming radio** over Wi-Fi / mobile data—`"No Signal"` happens because of CORS headers, blocked/dead stream URLs, or Android WebView mixed-content restrictions, not missing hardware antennas.

#### Root Causes & Concrete Fixes (`src/game/audio/MusicPlayerController.ts`)

1. **Use a Dedicated Un-Tainted HTML5 `<audio>` Element:**
   * Never set `crossOrigin = 'anonymous'` on live radio streams and never connect `radioAudio` to `AudioContext.createMediaElementSource()` (missing CORS headers on Icecast/Shoutcast servers cause immediate silent failure).
   * Control radio volume directly via `this.radioAudio.volume` (and duck cleanly when stepping outside).
2. **Verified Tier-1 HTTPS Multi-Mirror Streams (Guaranteed Playback):**
   * Give every station an array of **HTTPS direct MP3/AAC fallback URLs** (`urls: string[]`) that automatically fail over to the next mirror on error/stall before ever showing `"No Signal"`:
     * **SomaFM Groove Salad:** `https://ice1.somafm.com/groovesalad-128-mp3`, `https://ice2.somafm.com/groovesalad-128-mp3`, `https://ice4.somafm.com/groovesalad-128-mp3`
     * **SomaFM Lush:** `https://ice1.somafm.com/lush-128-mp3`, `https://ice2.somafm.com/lush-128-mp3`
     * **SomaFM Beat Blender / Sonic Universe:** `https://ice1.somafm.com/beatblender-128-mp3`, `https://ice1.somafm.com/sonicuniverse-128-mp3`
     * **PH Stations (Magic 89.9, Mellow 94.7, Monster RX 93.1, Easy Rock, etc.):** Query Radio Browser across 3 HTTPS mirrors (`de1`, `nl1`, `at1.api.radio-browser.info`) filtering strictly for `https://`, `lastcheckok=1`, and `mp3`/`aac`, and cache working resolved URLs in `localStorage`. If a specific PH station's upstream relay is offline, clearly show `"Station Stream Offline — Trying Backup"` rather than a confusing `"No Signal"`.
3. **Synchronous Tap-to-Play & Android WebView Compatibility:**
   * Call `this.radioAudio.play()` synchronously inside the button's click/tap handler (never after an `await` network call) so mobile autoplay policies never block it.
   * Ensure `capacitor.config.json` / `scripts/patch-android-capacitor.mjs` allows `INTERNET` permission and `MIXED_CONTENT_COMPATIBILITY_MODE` on Android WebView so valid streams aren't silently killed.
   * Add a subtle UI note in the Radio tab: *"Streams over Wi-Fi / Mobile Data (no earphones required)"*.

### 4.2 External Music Player Background Detection Fix (`android-native/audio/*`, `MusicPlayerController.ts`, `UnifiedAudioModal.tsx`)

* **Why It Currently Doesn't Detect Background Music:**
  * On **Android APKs**, reading active track metadata from Spotify, YouTube Music, or Apple Music via `MediaSessionManager.getActiveSessions()` requires the user to grant **Notification Listener Access** (`Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`). If not granted, `KlasikMediaListenerService` receives zero sessions and silently reports nothing.
  * On **Web Browsers**, browser security sandboxes prevent websites from reading OS-level background apps.
* **Concrete Fixes:**
  1. **Android APK (`KlasikNativeAudioBridge.kt` & `KlasikMediaListenerService.kt`):**
     * Add `isMusicActive()` using Android's `AudioManager.isMusicActive()` as an **instant zero-permission fallback**—the moment Spotify/YT Music plays in the background, Klasik 3D detects active external audio, automatically ducks/mutes in-game music, and activates the 3D Counter Hologram visualizer even *before* metadata permission is granted.
     * Add `hasNotificationListenerPermission()` and `openNotificationListenerSettings()` bridge methods, and verify `KlasikMediaListenerService` is properly declared with `BIND_NOTIFICATION_LISTENER_SERVICE` in `AndroidManifest.xml` via `scripts/patch-android-capacitor.mjs`.
     * Poll + push `MediaController` state changes (`PLAYING` / `PAUSED` + Track Title / Artist) immediately when the app resumes (`onResume`).
  2. **Unified Audio Deck UI (`UnifiedAudioModal.tsx`):**
     * On **Android APK:** If Notification Access isn't enabled yet, show a clean 1-tap glassmorphism prompt: **`Enable Now-Playing Detection`** (opens Android Notification Access directly) while still indicating **`External Audio Detected (Active)`** via `AudioManager`.
     * On **Web Browser:** Provide a clean **`External Background Mode`** toggle that mutes Klasik's built-in music and keeps the 3D Hologram Visualizer pulsing smoothly alongside whatever the user plays in another tab or app (no broken "Not Detected" error).

## 5. Additional Polish Suggestions (Details That Bring Everything Together)

1. **Dynamic Time-of-Day Synergy Across All 9 Sceneries:**
   * Automatically intensify warm apartment window glows, **Hilltop City Lights** valley sparkle, **Eiffel Tower** night twinkle + summit beacon, **Mayon** market string bulbs, **Japanese Tranquility** shoji screens & *chochin* lanterns, and **Cyberpunk** neon reflections as the in-game shift transitions from Morning → Sunset → Night.
2. **Weather-Reactive Ground & Rooftops:**
   * During **Rain / Neon Rain**, lower road roughness slightly so streetlights, lanterns, and Cyberpunk neon cast crisp glossy reflections on the asphalt/stone paving.
   * During **Snow** (Eiffel, Switzerland, Mt. Everest), tint railings and neighboring rooftops with subtle white snow caps.
3. **Scenery-Specific Outdoor Ambience Mix:**
   * When stepping outside in **Go Outside Mode**, layer a subtle procedural ambient bed per location (crisp summit wind on Everest, distant Parisian street murmur at Eiffel, tropical breeze at Mayon, wind chimes & cicadas/crickets in Japanese Tranquility, distant futuristic hum/rain in Cyberpunk, gentle alpine wind in Switzerland).
4. **Warm Cafe Interior Light Spill:**
   * Cast a soft warm amber ground glow directly outside the Klasik Cafe glass storefront and doorway at dusk/night so looking back from **Cafe Porch** or **Look Back** makes the shop feel like a cozy beacon in every scenery.

## 6. Phased Execution & Verification Checklist

### Phase 1 — Cat Cosmetics & Universal Outdoor Bugfixes

* [ ] Skeleton Dinosaur Costume has **only** Skull Hood, External Dorsal Spine/Tail, and Upper-Chest Ribcage (no lower leg ribs, no chest ring).
* [ ] Cat Cloth covers **only** the upper chest/shoulders with zero leg/belly clipping across all cat sizes.
* [ ] Dog-walking NPC leash connects accurately from NPC hand to dog collar in all directions and on the Title Screen.
* [ ] Road gutter z-fighting eliminated across Hilltop City Lights, Mayon Volcano, and all other maps.
* [ ] Mt. Everest NPCs stay strictly on the cleared trail and never walk buried inside high snowbanks.
* [ ] `Scenic Overlook` button is hidden (`hasScenicOverlook: false`) on **The Busy Street**, **Cyberpunk Neon**, **Brazilian Favela**, and **Japanese Tranquility**, and preserved on the 5 open-vista maps.

### Phase 2 — Massive Scenery Details & Road-End Void Elimination

* [ ] Zero empty voids at the far left/right road ends across all 9 sceneries; all neighboring & far-corner buildings have architectural window/roof/awning details.
* [ ] **Japanese Tranquility:** Detailed *machiya* facades with *koushi* wood lattice, glowing shoji screens, *noren* curtains, *chochin* lanterns, stone *ishidatami* paving, blooming sakura trees, and a vermilion *Torii* gate + pagoda/hills closing the road end (zero void).
* [ ] **Rio de Janeiro:** Terraced hillside, detailed favela homes (tin roofs, water tanks, windows, stairs), Sugarloaf & Christ the Redeemer horizon.
* [ ] **Mayon Volcano:** Outdoor souvenir market stalls, sightseeing tourists, detailed Cagsawa ruins & palm groves.
* [ ] **Hilltop City Lights:** True elevated ridge drop-off overlooking 2,500+ glowing valley city lights, string lights, and layered pines.
* [ ] **Cyberpunk Neon:** Zero wheeled ground cars; multi-altitude flying hover-cars + low-chance aerial police chase with flashing lights; skybridges closing road ends.
* [ ] **Eiffel Tower:** Massive surrounding Parisian Haussmann metropolis, twinkling tower + night beacon, Parisian neighboring shops.
* [ ] **Switzerland Hilltop:** Elevated cliffside drop overlooking alpine valley/lake; grounded steel-track inclined elevator riding cleanly between Upper and Lower stations (never buried).
* [ ] **Mt. Everest:** Expedition dome tents, supply crates, stone stupa, trail signpost, summit spindrift snow.

### Phase 3 — Radio & External Background Music Fixes

* [ ] Internet Radio plays reliably via un-tainted HTML5 `<audio>` with verified HTTPS multi-mirror failover (no earphones required).
* [ ] Android External Player detects background playback via `AudioManager.isMusicActive()` fallback + 1-tap Notification Listener permission prompt for full track/artist metadata; Web External Mode cleanly ducks game music and animates the 3D Hologram.
* [ ] Production build (`npm run build`) and unit tests pass with zero errors.