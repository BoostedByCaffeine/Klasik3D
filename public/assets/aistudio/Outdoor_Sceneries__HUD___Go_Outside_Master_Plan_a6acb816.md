# Klasik 3D — Critical Bug Fixes, Outdoor Sceneries, Patron Outfits, HUD Overhaul, "Go Outside" Mode & Secret NPC Master Plan

**Repository:** `BoostedByCaffeine/Klasik3D`  
**Scope:** Critical Live-Build Hotfixes (Phase 0), 9 Unlockable Outdoor Locations, Weather Exclusivity (Snow & Always-Winter), 6 Unlockable Patron Outfit Packs (Weather-Reactive), Secret Multi-Role Easter Egg NPC, "Go Outside" Scenic Overlook Mode, and Icon-Pill Station HUD + Miniature 3D Preview Studio (`ThumbnailStudio`)  
**Design Language:** Deep Matte Espresso (`#090705`), Warm Amber Accents, Frosted Glassmorphism HUD, Mobile Landscape First (Low-End Android GPU Friendly)

---

## 0. CRITICAL BUG FIXES (Phase 0 — Execute First Before Expansions)

These five live-build issues must be resolved first and verified clean before adding new sceneries.

### 0.1 Broken Cat Outfit Assets (Cloth, Gold Chain & Skeleton Dinosaur Redesign)
> **STRICT DO-NOT-TOUCH RULE:** **Cat Glasses** and **Thuglife Cat Glasses** are already properly aligned and working cleanly. **Do NOT modify `anchor_eyes`, eyewear transforms, or eyewear meshes.**

#### A. Cat Cloth Fix (Snug Sleeveless Pet Vest / Tank-Top Style)
- **Bug Observed:** The current Cat Cloth renders as a massive flat vertical blue circle/shield with a giant white ring stuck upright in front of the cat's chest and face (wrong axis orientation and oversized radius).
- **Target Design (Pet Vest Reference):** Rebuild the Cat Cloth as a **snug, form-fitting sleeveless pet tank-top / vest** that hugs the seated cat's torso geometry cleanly:
  - Orient the vest cylinder/capsule shell vertically along the cat's actual seated torso spine axis (never facing forward like a flat shield).
  - Contour the neckline cleanly right below the collar (`neckTrim`), leave open side armhole cutouts (`armholeTrim`) for both front legs so the front limbs move freely without clipping, and curve the back hem neatly down over the upper haunches.
  - Scale the shell directly from the cat's torso dimensions plus a small `+0.015` outward offset (never an oversized sphere) so it adapts smoothly to every cat size (Gigi, Tisay, Lilo, Amby, Mikmik, Chunky).
  - Preserve all 5 color variations (**Pink, Yellow, Blue, White, Orange**) with crisp knit/fabric UV tiling and matching contrasting rib-knit collar/armhole trim.

#### B. Gold Chain Alignment Fix
- **Bug Observed:** The Gold Chain currently floats too high and clips horizontally across the cat's nose/mouth like a bar, with floating disconnected gold blocks underneath.
- **Target Design:** Reposition `anchor_neck` directly onto the cat's actual **collar line / upper chest base** (right beneath the chin where the existing collar bell sits). Angle the metallic gold Cuban-link ring slightly downward in front (`rotation.x ≈ +0.35 rad`) so the chain and pendant drape naturally against the upper chest fur and never touch the muzzle or face.

#### C. Skeleton Dinosaur Costume Redesign (Plush T-Rex Skull Hood + Back Ribcage/Spine)
- **Bug Observed:** Currently renders as a gigantic solid green sphere swallowing the cat's entire body and face (only eyes and pink nose poke out) with a floating green chunk above the head.
- **Target Design (Skeleton Dinosaur Reference):** Replace the green sphere completely with a cute **plush bone-white Skeleton T-Rex costume** (`#F2EFE9` soft plush white with dark charcoal `#2B2826` recessed eye-socket/nostril cutouts) built from two fitted, non-obstructing pieces:
  1. **T-Rex Skull Hood (`anchor_head_top`):**
     - Fits directly and snugly over the top of the cat's head (zero floating gap) with a soft under-chin Velcro strap (`collarStrap`).
     - Styled as an open-jaw plush dino skull framing the cat's face: sculpted upper skull dome with two recessed oval eye sockets and subtle snout bridge above the forehead, lined with cute small pointed white plush teeth around the upper and lower jaw rims.
     - **Open Face Guarantee:** The cat's entire face, eyes, ears (or tucked hood ears), whiskers, and pink nose remain 100% visible inside the open dino jaw—no mesh ever covers the eyes or nose.
  2. **Connected Plush Ribcage, Dorsal Spine & Dino Tail (`anchor_torso` / `anchor_spine`):**
     - **Never use a full sphere.** Build a contoured dorsal back-wrap resting over the cat's spine:
       - A central raised plush vertebral ridge topped with small rounded triangular bone spikes running seamlessly from the back of the skull hood down the spine into a **tapered plush bone tail** projecting smoothly behind the cat.
       - **5–6 pairs of curved plush rib segments** arching snugly down the left and right sides of the torso, anchored by a thin belly strap—leaving the cat's chest, front legs, belly, and paws completely visible.

### 0.2 Floating Hats / Beret Gap Fix
- **Bug Observed:** The **Cat Beret** (and head-mounted hats) floats visibly high above the tips of the cat's ears with a wide empty air gap.
- **Root Cause:** Excessive static Y-offset on `anchor_head_top` (or double-applying `headScale` to both the anchor and the hat mesh).
- **Fix:**
  - Compute `anchor_head_top` directly from the cat's actual head geometry crown: `y = headCenterY + headRadius * 0.84` (slight inward seat so the hat rim makes firm contact with the top of the skull right between the ears).
  - Tilt the Cat Beret slightly (`rotation.z ≈ 0.14 rad`) so it sits cozily against the head with **zero gap** across all cat builds (kitten Gigi up to large Mikmik/Chunky).

### 0.3 Radio Playback Fix ("No Signal") & Legacy Spotify Embed Removal
- **Bug 1 Observed (Legacy Spotify UI Obstruction):** The old floating Spotify playlist iframe preview widget (e.g., *"Uncle dags · Aljonmedina — Preview"*) is still mounted at the bottom-center of the screen on top of the **Counter Audio Deck**, blocking the active station footer and volume slider.
- **Fix 1 (Remove Legacy Spotify Overlay Completely):**
  - Permanently remove/unmount the old floating Spotify `<iframe>` widget, legacy playlist URL overlay container, and any auto-injecting Spotify embed initializer from the DOM and CSS.
  - Clear any legacy persisted Spotify iframe visibility flag in `localStorage` on boot.
  - Ensure **Mode 3 (External Hologram)** operates purely as the clean glassmorphism companion HUD and 3D Hologram screen—never spawning a floating Spotify iframe.
- **Bug 2 Observed (Radio "No Signal" on All Stations):** Clicking Magic 89.9, Mellow 94.7, Monster RX 93.1, and SomaFM Groove Salad all immediately fall back to `"No Signal — Try another station or switch to Vinyl"`.
- **Root Cause & Concrete Fix:**
  1. **Remove CORS Tainting on Live Radio Streams:** Do **NOT** set `audioEl.crossOrigin = 'anonymous'` or route live internet radio through `AudioContext.createMediaElementSource()`. Most PH FM Icecast/Shoutcast relays and streaming servers lack `Access-Control-Allow-Origin: *` headers—setting `crossOrigin = 'anonymous'` forces WebViews and browsers to block playback and throw a media error.
     - Use a **dedicated direct HTML5 `Audio` instance** (`this.radioAudio = new Audio()`) *without* `crossOrigin` for live Radio playback (keep Web Audio vinyl EQ/crackle exclusively on bundled `.ogg` and local BYO Vinyl tracks).
  2. **Synchronous User-Gesture Playback:** Trigger `this.radioAudio.play()` synchronously inside the station card's tap/click handler (before any `await` calls) so mobile WebView / Chrome autoplay policies never reject playback.
  3. **Reliable Multi-Mirror PH + Cafe Stream Resolution:**
     - Provide verified HTTPS direct MP3/AAC streams for curated stations (e.g., SomaFM `https://ice1.somafm.com/groovesalad-128-mp3`, `https://ice1.somafm.com/lush-128-mp3`, `https://ice1.somafm.com/sonicuniverse-128-mp3`, `https://ice1.somafm.com/dronezone-128-mp3`) with backup mirrors (`ice2` / `ice4`).
     - Dynamically query working HTTPS PH stations from Radio Browser with mirror fallback (`https://de1.api.radio-browser.info`, `https://nl1.api.radio-browser.info`, `https://at1.api.radio-browser.info`) using `?countrycode=PH&hidebroken=true&order=clickcount&reverse=true&limit=30`, strictly filtering for `url_resolved.startsWith('https://')` and MP3/AAC codecs.
     - Increase connection timeout from `5000ms` to `8500ms` for mobile data buffering, show a `"Tuning..."` indicator while connecting, and cleanly surface errors only if playback actually stalls or fails.

### 0.4 Pastry Plate Obstructed Behind the 3 Cylinder Asset (Visibility & Touch Fix)
- **Bug Observed:** On the Orders/Counter view, the **plated pastry** spawns right behind the **3 tall dark-brown cylindrical canisters/syrup bottles** next to the order bell, hiding almost the entire pastry from the player's camera angle and making it difficult to see or tap to return to the pastry showcase.
- **Fix:**
  1. **Clear Counter Layout Repositioning:**
     - Move the **3 brown cylindrical bottles/canisters** neatly back toward the far/customer-facing edge of the counter (or tuck them cleanly beside the espresso grinder/knockbox) so they NEVER sit between the barista camera and the pastry plate.
     - Shift the **Pastry Serving Plate** forward into an open, unobstructed front-center spot directly to the right of the **Pastry Showcase** and clearly visible alongside the Order Bell.
  2. **Generous Touch Hitbox & Visual Feedback:**
     - Attach an expanded invisible raycast collider (`CylinderGeometry`, radius `1.45x` the plate, height covering the full pastry) to the serving plate group when `platedPastry !== null`, prioritized ahead of neighboring counter props in the raycaster sort.
     - Add a subtle pulsing warm amber ring highlight around the plate whenever a pastry is plated so players have immediate visual confirmation that tapping it returns the pastry to the showcase.

---

## 1. Outdoor Sceneries: Balanced Economy Progression (9 Locations)

| # | Scenery Name | Unlock Method | Cost / Milestone | Allowed Weathers | Matching Patron Outfit |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | **The Busy Street** | Default | **Free** | Clear, Rain | Default / Filipino |
| **2** | **Mayon Volcano View** *(Cagsawa Ruins)* | Shop | **$2,000** | Clear, Rain | Filipino Style |
| **3** | **Hilltop City Lights** *(Tagaytay / Baguio)* | Shop | **$4,000** | Clear, Rain *(Highland Mist)* | Filipino Style |
| **4** | **Japanese Tranquility** *(Ancient Town)* | Shop | **$6,500** | Clear, Rain *(+ Sakura / Fireflies)* | Ancient Japanese |
| **5** | **Brazilian Favela** *(Rio de Janeiro View)* | Shop | **$9,500** | Clear, Rain | Brazilian Style |
| **6** | **Cyberpunk Neon** *(New Vision City)* | Shop | **$14,000** | Clear, **Neon Rain** | Default / Any |
| **7** | **Eiffel Tower View** *(Paris Terrace)* | Shop | **$22,000** | Clear, Rain, **❄️ Snow** | French *(Summer/Winter)* |
| **8** | **Switzerland Hilltop** *(Inclined Elevator)* | Revenue Milestone | **$35,000 Total Revenue** | Clear, Rain, **❄️ Snow** | Swiss *(Summer/Winter)* |
| **9** | **Mt. Everest & Hiker Trail** | Prestige Milestone | **$65,000 Total Revenue** | **❄️ Always Winter** *(Crisp Snow / Snowfall)* | Hiker *(Winter Only)* |

---

## 2. Detailed Location Blueprints

**Universal Driveway Rule:** Every scenery preserves the exact same front road/pathway coordinate lane directly outside the garage bay. This guarantees that **walking customers**, **outdoor passersby**, **delivery scooter riders** (including the Secret NPC), and the **"Go Outside" vantage camera** work cleanly without clipping into railings, ruins, cliffs, or snowbanks.

### 2.1 The Busy Street (Default)
- Everyday urban-suburban street outside the garage-garden cafe: low-poly storefronts across the road, utility poles, warm streetlights, and distant looping box-silhouette traffic (`castShadow = false`).

### 2.2 Mayon Volcano View (Cagsawa Ruins, Bicol)
- Iconic near-perfect symmetrical cone of **Mayon Volcano** rising in the front-center horizon with soft drifting clouds near the crater, weathered volcanic-stone **Cagsawa Church belfry ruin** slightly off-center in the midground, lush green fields, and instanced tropical coconut palms.

### 2.3 Hilltop City Lights (Tagaytay / Baguio Experience)
- High-altitude Philippine mountain ridge overlooking a vast valley filled with shimmering nighttime city lights rendered via a **single `THREE.Points` particle field** (1 draw call), crisp instanced pine trees along the ridge railing, and cool drifting highland mist.

### 2.4 Japanese Tranquility (Ancient Japanese Town)
- Historic Kyoto/Gion-inspired lane lined with wooden *machiya* townhouses, curved dark-tiled roofs, hanging red/amber emissive *chochin* lanterns (`InstancedMesh`), and a distant misty pagoda silhouette. Signature atmosphere: drifting **Sakura Petals** (day) and warm **Fireflies** (night).

### 2.5 Brazilian Favela with Rio de Janeiro View
- Vibrant sun-drenched terraced hillside overlooking Rio de Janeiro: colorful stacked low-poly favela houses packed into one `InstancedMesh` with `instanceColor` (terracotta, coral, teal, mustard, cobalt), subtle overhead wires, Guanabara Bay, Sugarloaf Mountain, and distant hilltop statue silhouette.

### 2.6 Cyberpunk Neon (Ghost in the Shell — New Vision City Vibe)
- Towering dense megacity skyline, deep indigo-black night atmosphere, cyan/magenta/amber holographic billboards with lightweight additive-blended fake-bloom glow sprites (`THREE.AdditiveBlending`, `depthWrite: false`), and angled **Neon Rain** streaks.

### 2.7 Eiffel Tower View (Parisian Hillside Terrace)
- Framed as an elevated **Montmartre hillside promenade** with wrought-iron railings across the cobblestone street, Haussmann rooftops stepping down below, and a crisp low-poly **Eiffel Tower** truss with twinkling golden night sprites. **❄️ Snow Enabled.**

### 2.8 Switzerland Hilltop (Alpine Overlook + Inclined Elevator)
- Crisp Swiss alpine ridge with snow-capped peaks, low-poly spruce clusters, wooden chalet railings, and a continuously animated red/glass **inclined elevator (funicular)** smoothly `lerp`ing between lower and upper cliffside stations with a `5.0s` pause at each end. **❄️ Snow Enabled.**

### 2.9 Mt. Everest View & Hiker Trail (**Always Winter**)
- Himalayan base-camp coffee outpost along a snowy stone hiker trail, massive jagged snow-and-slate **Mt. Everest** summit, fluttering colorful Tibetan prayer flag lines, wooden trail markers, snowdrifts, and warm expedition lanterns. **Permanently locked to Winter / Snow.**

---

## 3. Weather Exclusivity & Auto-Clamp System

```javascript
export const SCENERY_WEATHER_RULES = {
  busy_street:          { allowed: ['clear', 'rain'], alwaysWinter: false, specialParticle: null },
  mayon_volcano:        { allowed: ['clear', 'rain'], alwaysWinter: false, specialParticle: null },
  hilltop_city_lights:  { allowed: ['clear', 'rain'], alwaysWinter: false, specialParticle: 'highland_mist' },
  japanese_tranquility: { allowed: ['clear', 'rain'], alwaysWinter: false, specialParticle: 'sakura_or_fireflies' },
  brazilian_favela:     { allowed: ['clear', 'rain'], alwaysWinter: false, specialParticle: null },
  cyberpunk_neon:       { allowed: ['clear', 'rain'], alwaysWinter: false, specialParticle: 'neon_rain' },
  eiffel_tower:         { allowed: ['clear', 'rain', 'snow'], alwaysWinter: false, specialParticle: 'snow' },
  switzerland_hilltop:  { allowed: ['clear', 'rain', 'snow'], alwaysWinter: false, specialParticle: 'snow' },
  mt_everest:           { allowed: ['snow'], alwaysWinter: true, specialParticle: 'snow' },
};
```

1. **Non-Snow Clamp:** Switching from a Snow location (`eiffel_tower`, `switzerland_hilltop`, `mt_everest`) to any non-snow location automatically clamps `snow` back to `clear` (or `rain`).
2. **Always-Winter Enforcement (`mt_everest`):** Loading **Mt. Everest & Hiker Trail** locks the climate to `winter` / `snow`, disables the Rain toggle, and activates snow particles + crisp alpine sunlight (`#dceeff`).
3. **Weather-Reactive Outfits Hook:** Broadcasts `climateState` (`'summer'` vs. `'winter'`) whenever weather or scenery changes so French, Swiss, and Hiker patron outfits adapt seamlessly.

---

## 4. Unlockable Patron Outfits System (Customers)

| Outfit Pack | Unlock Cost | Weather Behavior | Procedural 3D Visual Design |
| :--- | :---: | :--- | :--- |
| **1. Filipino Style Outfits** | **$400** | All-weather *(Casual)* | Relaxed **sando / tank top** or casual t-shirt, comfortable **shorts**, and classic **slippers (*tsinelas*)** |
| **2. Brazilian Style Outfits** | **$900** | All-weather *(Warm/Vibrant)* | Bright tropical colors, green/yellow/blue sporty jerseys or breezy patterned summer tees, relaxed shorts, flip-flops/light sneakers |
| **3. Ancient Japanese Outfits** | **$1,200** | All-weather *(Traditional)* | Layered **kimono / yukata** robe geometry with wide sleeves, contrasting waist **obi sash**, optional *haori* jacket, wooden **geta sandals** |
| **4. French Outfits** | **$1,600** | **Weather-Reactive** *(Summer / Winter)* | • **Summer:** Breton striped top, light tailored trousers/skirt, chic café beret or silk scarf.<br>• **Winter (Snow):** Structured wool peacoat/trench, knit scarf, beret, dark winter boots. |
| **5. Swiss Outfits** | **$2,000** | **Weather-Reactive** *(Summer / Winter)* | • **Summer:** Crisp alpine casual shirt with light vest/chalet accents and trousers.<br>• **Winter (Snow):** Cozy Nordic-patterned knit sweater or quilted alpine puffer, pom-pom beanie, scarf, snow boots. |
| **6. Hiker Outfits** | **$2,500** | **Winter Variant Only** | Heavy insulated **mountaineering parka**, thermal snow pants, **3D expedition backpack**, knit beanie / ski goggles on forehead, heavy snow boots. |

- **Assignment Modes:** `Auto-Match Scenery` (recommended default—dresses patrons in the active location's unlocked outfit) or `Custom Mix` (manual checkboxes; Hiker Outfits still strictly respect `climateState === 'winter'`).

---

## 5. HUD Upgrade: Icon-Label Station Pills & Miniature 3D Previews (`ThumbnailStudio`)

### 5.1 Station HUD Replacement (Icon Pills with Labels Beneath)
Replace the old arrow-cycle `< Orders >` pill with a sleek, direct-access **Icon + Label Pill Bar** docked cleanly along the bottom edge so players can jump to any station in one tap without cycling arrows:

```text
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│   📋    │ │   ☕    │ │   🥐    │ │   🐱    │ │   🚪    │ │   🎵    │
│ Orders  │ │  Brew   │ │ Pastry  │ │  Cats   │ │ Outside │ │  Audio  │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

- **Styling:** Compact `#090705` frosted glassmorphism pills (`backdrop-filter: blur(10px)`), crisp minimalist SVG icon on top (`18px–20px`), clean uppercase label beneath (`9px–10px`, `letter-spacing: 0.04em`), and a warm amber active border + subtle glow (`#f5a623`) on the currently selected station.
- **Direct Access:** Includes all existing barista stations (e.g., Orders, Espresso/Brew, Milk/Cold, Pastry/Serve) plus **Cats**, **Outside**, and **Audio**—automatically scrolling horizontally on ultra-narrow screens while fitting cleanly on standard mobile landscape viewports.

### 5.2 Miniature 3D Previews (`ThumbnailStudio`) for All Shop & Customization Menus
Upgrade every selection card across **Sceneries**, **Decors**, **Patron Outfits**, **Cats**, and **Cat Cosmetics** to display an actual **miniature 3D render** of the asset instead of plain emojis or text-only boxes.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ [ 🐱 Cats ] [ 🎩 Cosmetics ] [ 🪴 Decors ] [ 🌍 Sceneries ] [ 👗 Outfits ]│
├─────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ │ ┌───────────┐ │ │ ┌───────────┐ │ │ ┌───────────┐ │ │ ┌───────────┐ │ │
│ │ │ [ 3D Mini │ │ │ │ [ 3D Mini │ │ │ │ [ 3D Mini │ │ │ │ [ 3D Mini │ │ │
│ │ │  Mayon &  │ │ │ │  Eiffel   │ │ │ │  Swiss    │ │ │ │  Everest  │ │ │
│ │ │  Cagsawa] │ │ │ │  Tower ]  │ │ │ │  Peak ]   │ │ │ │  Peak ]   │ │ │
│ │ └───────────┘ │ │ └───────────┘ │ │ └───────────┘ │ │ └───────────┘ │ │
│ │ Mayon Volcano │ │ Eiffel Tower  │ │ Switzerland   │ │ Mt. Everest   │ │
│ │  [  $2,000 ]  │ │  [ $22,000 ]  │ │  $24k / $35k  │ │ ❄️ Always Wtr │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Mobile-Safe `ThumbnailStudio` Architecture (Zero WebGL Context Crashes)
> **CRITICAL MOBILE RULE:** **NEVER** create a separate `THREE.WebGLRenderer` per shop card. Android WebViews cap active WebGL contexts at ~8–16; creating multiple canvases will cause black screens or crash the APK.

- **Single-Context Offscreen Snapshot Cache:**
  - Use **one** shared `THREE.WebGLRenderTarget` (`256×256` RGBA, `SRGBColorSpace`) rendered using the game's existing `THREE.WebGLRenderer` (or a single lazily-initialized `256×256` offscreen staging scene).
  - When a player opens any tab (**Sceneries, Decors, Outfits, Cats, Cosmetics**), `ThumbnailStudio` checks an in-memory `Map<string, string>` cache:
    - If cached, immediately bind the `dataURL` to the card's `<img>` tag (zero GPU cost).
    - If not cached, stage the actual 3D model (or miniature diorama island for Sceneries) at a flattering 3/4 isometric studio angle (`FOV: 32°`, warm key light + cool rim light), render **1 frame**, read pixels / convert to PNG `dataURL`, cache it, and immediately dispose the temporary studio clone.
  - **Miniature Scenery Dioramas:** Each of the 9 sceneries provides a lightweight `buildMiniDiorama()` helper that mounts its signature landmark on a stylized floating circular/hex base (e.g., mini Mayon cone + Cagsawa belfry, mini Eiffel truss + snow cap, mini Swiss ridge + red funicular, mini Everest peak + prayer flags, mini glowing Tokyo/Cyberpunk block).

---

## 6. "Go Outside" Feature (Scenic Overlook Mode)

Allows the barista to step out through the cafe front door and admire any of the 9 unlocked outdoor sceneries, the exterior of Klasik Cafe, the 1990 Mazda Miata MX-5, passing patrons, and rare Secret NPC cameos—designed for effortless mobile touch controls without clunky virtual joysticks.

### 6.1 Entry, Exit & Shift Safety
- **Triggers:**
  1. Tap the **`🚪 Outside`** pill on the new Station HUD bar.
  2. Tap directly on the **3D Cafe Front Door** mesh from the interior view.
- **Transition:** Smooth `0.35s` matte espresso (`#090705`) fade (or smooth doorway glide) placing the first-person camera cleanly outside the entrance.
- **Mood Paused:** Automatically pauses customer patience/mood timers while outside (displaying the green `Mood Paused` pill in the top-right, matching the Cat Station) so players can relax and take photos without losing orders.
- **Exit:** Tap `← Back Inside` in the top-left corner to return immediately behind the espresso counter.

### 6.2 Mobile-First Panoramic Controls & Preset Vantage Spots
```text
┌──────────────────────────────────────────────────────────────────────┐
│ [ ← Back Inside ]      🏔️ Switzerland Hilltop       [ Mood Paused ]  │
│                                                     [ 📷 Hide HUD ]  │
│                                                                      │
│                   ( Full-Screen 3D Outdoor View )                    │
│              Touch-drag to look around • Pinch to zoom               │
│                                                                      │
│                                                                      │
│         [ 🚪 Cafe Porch ]  [ 🌄 Scenic Overlook ]  [ ☕ Look Back ]   │
└──────────────────────────────────────────────────────────────────────┘
```

- **Touch-Drag Panoramic Look:** Smooth damped yaw (`±150°`) and pitch (`-25°` to `+45°`) camera rotation using `THREE.MathUtils.damp` so players can look up at Mt. Everest, track the Switzerland inclined elevator, or watch neon rain.
- **Pinch-to-Zoom (and Mouse Wheel):** Smoothly adjusts camera FOV between `30°` (telephoto zoom on Eiffel Tower / Mayon Volcano) and `68°` (wide scenic view).
- **3 Preset Vantage Spots (One-Tap Camera Lerp):**
  1. **`🚪 Cafe Porch`:** Standing right outside the front door looking out across the street/scenery.
  2. **`🌄 Scenic Overlook`:** Positioned forward near the promenade railing / trail edge for a completely unobstructed 180° landmark vista.
  3. **`☕ Look Back at Cafe`:** Angled from across the front walkway looking back at the warm glowing Klasik 3D garage-garden cafe facade, open doorway, and parked Miata.
- **Clean Photo Mode (`📷 Hide HUD`):** Toggles all UI pills off for clean screenshots; tapping anywhere on screen restores the HUD.

### 6.3 Outdoor Audio Mix & Exterior Architecture Requirements
- **Muffled Indoor Audio Mix:** Stepping outside gently lowers the volume and applies a soft low-pass filter (`~950 Hz`) to the indoor vinyl/radio music so it sounds authentically muffled through the cafe glass, while boosting outdoor ambience (wind, snow breeze, rain, distant city hum).
- **Exterior Facade & Back-Face Culling Fix (CRITICAL):**
  - Because the camera can now turn around and look back at the shop from outside (`Look Back at Cafe`), audit the cafe's front exterior walls, roof overhang, signage, awning, and doorway frame to ensure **zero invisible back-faces** (use exterior-facing meshes or `THREE.DoubleSide` where needed).
  - Ensure the exterior sidewalk/terrace ground plane extends seamlessly under all 3 vantage spots with zero floating seams.

---

## 7. Secret Easter Egg NPC ("Beb" / "Anton" / "Duminiki")

A completely hidden, low-chance multi-role NPC modeled after the developer—appearing across all 9 sceneries as an **outdoor passerby**, a **walk-in customer**, or a **delivery scooter rider**, and fully visible (with a friendly wave!) when the player is using **"Go Outside" Mode**.

- **Visual Spec:** Short jet-black hair (`#18181A`) with straight fringe, warm tan skin (`#C6936B`), subtle mustache, stud earrings, black-and-white colorblock windbreaker (`#F2F2F2` / `#1C1C20`) with thin crimson (`#C83232`) vertical chest-zipper accent, baggy light-wash denim jeans (`#B8C9DC`), black sneakers with white stripes/soles, university ID lanyard with ID card, and silver wristwatch (`#D0D5DD`). Optional 25% dark charcoal grey tee (`#595B60`) on non-winter Clear days.
- **Cap & Weather-Smart Hood:** ~40% chance per encounter to wear a **brown-caramel Polo RL baseball cap** (`#A66B3C` with tiny `#1B2845` pony emblem). If capless during **Rain** or **Snow/Always Winter**, automatically pull the windbreaker's **black hood** up over his head.
- **Immune to Patron Outfits:** Always keeps his signature streetwear look regardless of active location outfit packs.
- **Spawn Rules & Anti-Clone Lock:** Completely hidden from Shop/UI (`isSecret: true`). Low spawn rates (`8%` outdoor passerby, `5%` customer, `6%` delivery rider), global `isSecretNpcActive` singleton lock, and `270s` cooldown.
- **Non-Repeating Name Rotation:** Cycles sequentially through **`Beb` -> `Anton` -> `Duminiki`** saved in `localStorage`.
- **Perks:** `0.25x` patience drain (always patient), `2x` tip bonus, warm subtle dialogue pool, floating heart particle on serve, and a 3-second pause + wave toward the cafe (or toward the player if standing outside in Scenic Overlook Mode).

---

## 8. Mobile-Optimized Three.js Reference Modules

### 8.1 `ThumbnailStudio.js` (Single-Context 3D Snapshot Renderer)

```javascript
import * as THREE from 'three';

export class ThumbnailStudio {
  constructor(mainRenderer, size = 256) {
    this.renderer = mainRenderer;
    this.size = size;
    this.cache = new Map();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    this.camera.position.set(2.2, 1.8, 2.6);
    this.camera.lookAt(0, 0.2, 0);

    // Warm cozy studio lighting
    this.scene.add(new THREE.HemisphereLight(0xffe8cc, 0x261a14, 1.1));
    const keyLight = new THREE.DirectionalLight(0xffd7a3, 1.35);
    keyLight.position.set(3, 5, 4);
    this.scene.add(keyLight);

    this.renderTarget = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      colorSpace: THREE.SRGBColorSpace,
    });
    this.pixelBuffer = new Uint8Array(size * size * 4);
    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = size;
    this.tempCanvas.height = size;
    this.tempCtx = this.tempCanvas.getContext('2d');
  }

  getThumbnail(cacheKey, buildMeshFn, { cameraPos, lookAt } = {}) {
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const subject = buildMeshFn();
    if (!subject) return '';

    // Auto-frame subject cleanly inside the studio viewport
    const box = new THREE.Box3().setFromObject(subject);
    const center = box.getCenter(new THREE.Vector3());
    const sizeVec = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z, 0.001);
    const scale = 1.45 / maxDim;
    subject.scale.multiplyScalar(scale);
    subject.position.sub(center.multiplyScalar(scale));

    this.scene.add(subject);
    if (cameraPos) this.camera.position.set(...cameraPos);
    else this.camera.position.set(2.1, 1.65, 2.35);
    if (lookAt) this.camera.lookAt(...lookAt);
    else this.camera.lookAt(0, 0, 0);

    // Render 1 frame to offscreen target without disturbing main canvas
    const prevTarget = this.renderer.getRenderTarget();
    const prevClearAlpha = this.renderer.getClearAlpha();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.setClearColor(0x090705, 0);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, this.size, this.size, this.pixelBuffer);
    this.renderer.setRenderTarget(prevTarget);
    this.renderer.setClearAlpha(prevClearAlpha);

    // Flip Y & encode dataURL
    const imgData = this.tempCtx.createImageData(this.size, this.size);
    for (let y = 0; y < this.size; y++) {
      const srcRow = (this.size - 1 - y) * this.size * 4;
      const dstRow = y * this.size * 4;
      imgData.data.set(this.pixelBuffer.subarray(srcRow, srcRow + this.size * 4), dstRow);
    }
    this.tempCtx.putImageData(imgData, 0, 0);
    const dataUrl = this.tempCanvas.toDataURL('image/png');

    // Cleanly dispose temporary staging geometry/materials
    this.scene.remove(subject);
    subject.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });

    this.cache.set(cacheKey, dataUrl);
    return dataUrl;
  }
}
```

### 8.2 `OutdoorOverlookController.js` ("Go Outside" Panoramic Camera)

```javascript
import * as THREE from 'three';

export const OUTDOOR_VANTAGES = {
  porch:    { label: 'Cafe Porch',      pos: [0, 1.65, 4.2],   baseYaw: 0,           basePitch: 0.04 },
  overlook: { label: 'Scenic Overlook', pos: [0, 1.72, 7.6],   baseYaw: 0,           basePitch: 0.06 },
  lookback: { label: 'Look Back',       pos: [2.8, 1.68, 6.8], baseYaw: Math.PI * 0.88, basePitch: 0.02 },
};

export class OutdoorOverlookController {
  constructor(camera) {
    this.camera = camera;
    this.active = false;
    this.vantageKey = 'porch';
    this.targetPos = new THREE.Vector3();
    this.yawOffset = 0;
    this.pitchOffset = 0;
    this.targetYawOffset = 0;
    this.targetPitchOffset = 0;
    this.targetFov = 58;
  }

  enter(vantageKey = 'porch') {
    this.active = true;
    this.setVantage(vantageKey, true);
  }

  exit() {
    this.active = false;
    this.camera.fov = 55;
    this.camera.updateProjectionMatrix();
  }

  setVantage(key, immediate = false) {
    const v = OUTDOOR_VANTAGES[key] || OUTDOOR_VANTAGES.porch;
    this.vantageKey = key;
    this.targetPos.set(...v.pos);
    this.targetYawOffset = 0;
    this.targetPitchOffset = 0;
    if (immediate) {
      this.camera.position.copy(this.targetPos);
      this.yawOffset = 0;
      this.pitchOffset = 0;
    }
  }

  onDrag(dx, dy) {
    if (!this.active) return;
    this.targetYawOffset = THREE.MathUtils.clamp(this.targetYawOffset - dx * 0.005, -2.5, 2.5);
    this.targetPitchOffset = THREE.MathUtils.clamp(this.targetPitchOffset - dy * 0.004, -0.45, 0.78);
  }

  onZoom(delta) {
    if (!this.active) return;
    this.targetFov = THREE.MathUtils.clamp(this.targetFov + delta, 30, 68);
  }

  update(dt) {
    if (!this.active) return;
    const v = OUTDOOR_VANTAGES[this.vantageKey];
    this.camera.position.lerp(this.targetPos, Math.min(1, dt * 6));
    this.yawOffset = THREE.MathUtils.damp(this.yawOffset, this.targetYawOffset, 8, dt);
    this.pitchOffset = THREE.MathUtils.damp(this.pitchOffset, this.targetPitchOffset, 8, dt);

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = v.baseYaw + this.yawOffset;
    this.camera.rotation.x = v.basePitch + this.pitchOffset;
    this.camera.rotation.z = 0;

    if (Math.abs(this.camera.fov - this.targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, this.targetFov, 10, dt);
      this.camera.updateProjectionMatrix();
    }
  }
}
```

---

## 9. Save Data Schema (`localStorage`)

```json
{
  "activeScenery": "busy_street",
  "unlockedSceneries": ["busy_street", "mayon_volcano"],
  "unlockedPatronOutfits": ["filipino"],
  "patronOutfitAutoMatch": true,
  "enabledCustomPatronOutfits": ["filipino"],
  "totalRevenue": 12450,
  "klasik_secret_name_idx": 0
}
```

---

## 10. Phased Implementation Roadmap (Phases 0 – 7)

- [ ] **Phase 0 — Critical Live-Build Hotfixes (MANDATORY FIRST):**
  - Rebuild **Cat Cloth** as a snug sleeveless pet vest (all 5 colors); keep **Glasses / Thuglife Glasses untouched**.
  - Lower & angle **Gold Chain** onto the collar/chest line.
  - Rebuild **Dinosaur Costume** into the plush bone-white **Skeleton T-Rex** open-jaw skull hood + curved back ribcage, dorsal spine spikes, and plush bone tail.
  - Fix **Cat Beret / Hat** floating gap (`anchor_head_top` seated at `headRadius * 0.84`).
  - Completely remove the obstructing legacy floating **Spotify iframe preview widget** from the DOM/UI.
  - Fix **Radio Mode** playback (dedicated direct HTML5 `Audio` without `crossOrigin = 'anonymous'`, synchronous tap-to-play, verified HTTPS streams, multi-mirror Radio Browser PH resolution).
  - Reposition the **Pastry Serving Plate** forward out from behind the 3 brown cylinder canisters with an expanded touch hitbox and amber rim highlight.
- [ ] **Phase 1 — `SceneryManager` & Climate Rules:** Implement `SceneryManager.js` with recursive `.dispose()`, `0.35s` fade transitions, fog/lighting presets, Snow weather clamping, and `alwaysWinter` lock for Mt. Everest.
- [ ] **Phase 2 — Outdoor Sceneries 1–5:** Build **The Busy Street**, **Mayon Volcano View (Cagsawa Ruins)**, **Hilltop City Lights**, **Japanese Tranquility**, and **Brazilian Favela (Rio)**.
- [ ] **Phase 3 — Outdoor Sceneries 6–9:** Build **Cyberpunk Neon**, **Eiffel Tower View**, **Switzerland Hilltop (animated inclined elevator)**, and **Mt. Everest & Hiker Trail (always-winter)**.
- [ ] **Phase 4 — Unlockable Patron Outfits:** Build modular low-poly customer outfit packs for **Filipino**, **Brazilian**, **Ancient Japanese**, **French (Summer/Winter)**, **Swiss (Summer/Winter)**, and **Hiker (Winter Only)**.
- [ ] **Phase 5 — Secret Easter Egg NPC (`Beb` / `Anton` / `Duminiki`):** Build procedural 3D mesh, cap/hood weather rules, immune-to-patron-outfits flag, singleton lock + cooldown, name rotation, and heart-particle perks across outdoor passersby, customers, and delivery riders.
- [ ] **Phase 6 — "Go Outside" Scenic Overlook Mode:** Add doorway tap trigger + `🚪 Outside` station entry, `OutdoorOverlookController.js` (touch-drag pan, pinch-to-zoom, 3 preset vantage spots: Porch / Overlook / Look Back), `Mood Paused` safety, `📷 Hide HUD` photo mode, muffled indoor music + outdoor ambience mix, and exterior cafe facade double-sided / ground continuity polish.
- [ ] **Phase 7 — Station HUD Icon-Label Pills & `ThumbnailStudio` Miniature 3D Previews:** Replace the old arrow-cycle `< Orders >` pill with direct glassmorphism **Icon + Label Pills**, and integrate single-context `ThumbnailStudio.js` miniature 3D previews across **Sceneries (mini dioramas), Decors, Patron Outfits, Cats, and Cat Cosmetics**.