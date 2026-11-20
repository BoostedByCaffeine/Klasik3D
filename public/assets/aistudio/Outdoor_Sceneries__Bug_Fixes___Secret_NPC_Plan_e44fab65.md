# Klasik 3D — Critical Bug Fixes, Outdoor Sceneries, Patron Outfits & Secret NPC Master Plan

**Repository:** `BoostedByCaffeine/Klasik3D`  
**Scope:** Critical Live-Build Hotfixes (Phase 0), 9 Unlockable Outdoor Locations, Weather Exclusivity (Snow & Always-Winter), 6 Unlockable Patron Outfit Packs (Weather-Reactive), UI Switcher, Mobile-First Three.js Architecture, and Secret Multi-Role Easter Egg NPC  
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
  1. **Remove CORS Tainting on Live Radio Streams:** Do **NOT** set `audioEl.crossOrigin = 'anonymous'` or route live internet radio through `AudioContext.createMediaElementSource()`. Most PH FM Icecast/Shoutcast relays and many streaming servers lack `Access-Control-Allow-Origin: *` headers—setting `crossOrigin = 'anonymous'` forces WebViews and browsers to block playback and throw a media error!
     - Use a **dedicated direct HTML5 `Audio` instance** (`this.radioAudio = new Audio()`) *without* `crossOrigin` for live Radio playback (keep Web Audio vinyl EQ/crackle exclusively on bundled `.ogg` and local BYO Vinyl tracks).
  2. **Synchronous User-Gesture Playback:** Trigger `this.radioAudio.play()` synchronously inside the station card's tap/click handler (before any `await` calls) so mobile WebView / Chrome autoplay policies never reject playback.
  3. **Reliable Multi-Mirror PH + Cafe Stream Resolution:**
     - Provide verified HTTPS direct MP3/AAC streams for curated stations (e.g., SomaFM `https://ice1.somafm.com/groovesalad-128-mp3`, `https://ice1.somafm.com/lush-128-mp3`, `https://ice1.somafm.com/sonicuniverse-128-mp3`, `https://ice1.somafm.com/dronezone-128-mp3`) with backup mirrors (`ice2` / `ice4`).
     - Dynamically query working HTTPS PH stations from Radio Browser with mirror fallback (`https://de1.api.radio-browser.info`, `https://nl1.api.radio-browser.info`, `https://at1.api.radio-browser.info`) using `?countrycode=PH&hidebroken=true&order=clickcount&reverse=true&limit=30`, strictly filtering for `url_resolved.startsWith('https://')` and MP3/AAC codecs.
     - Increase connection timeout from `5000ms` to `8500ms` for mobile data buffering, show a `"Tuning..."` indicator while connecting, and cleanly surface errors only if playback actually stalls or fails.

### 0.4 Pastry Plate Obstructed Behind the 3 Cylinder Asset (Visibility & Touch Fix)
- **Bug Observed:** On the Orders/Counter view, the **plated pastry** (e.g., Miata Cake / Daisy Donut / Croissant) spawns right behind the **3 tall dark-brown cylindrical canisters/syrup bottles** next to the order bell, hiding almost the entire pastry from the player's camera angle and making it very difficult to see or tap to return to the pastry showcase.
- **Fix:**
  1. **Clear Counter Layout Repositioning:**
     - Move the **3 brown cylindrical bottles/canisters** neatly back toward the far/customer-facing edge of the counter (or tuck them cleanly beside the espresso grinder/knockbox) so they NEVER sit between the barista camera and the pastry plate.
     - Shift the **Pastry Serving Plate** forward into an open, unobstructed front-center spot directly to the right of the **Pastry Showcase** and clearly visible alongside the Order Bell.
  2. **Generous Touch Hitbox & Visual Feedback:**
     - Attach an expanded invisible raycast collider (`CylinderGeometry`, radius `1.45x` the plate, height covering the full pastry) to the serving plate group when `platedPastry !== null`, prioritized ahead of neighboring counter props in the raycaster sort.
     - Add a subtle pulsing warm amber ring highlight around the plate whenever a pastry is plated so players have immediate visual confirmation that tapping it returns the pastry to the showcase.

---

## 1. Outdoor Sceneries: Balanced Economy Progression (9 Locations)

To maintain steady motivation across the entire game—from early shifts through the **$50,000 Golden Espresso** milestone and into the endgame—the nine sceneries blend **Shop Purchases** with **Prestige Revenue Milestones**.

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

**Universal Driveway Rule:** Every scenery preserves the exact same front road/pathway coordinate lane directly outside the garage bay. This guarantees that **walking customers**, **outdoor passersby**, and **delivery scooter riders** (including the Secret NPC) arrive and depart cleanly without clipping into railings, ruins, cliffs, or snowbanks.

### 2.1 The Busy Street (Default)
- **Visual Identity:** Everyday urban-suburban street outside the garage-garden cafe. Low-poly storefronts across the road, utility poles, warm streetlights, and distant passing traffic.
- **Mobile Three.js Optimization:** Represent distant traffic as simple low-poly box silhouettes with emissive headlights/taillights looping along a straight track (`castShadow = false`).

### 2.2 Mayon Volcano View (Cagsawa Ruins, Bicol)
- **Visual Identity:** The iconic near-perfect symmetrical cone of **Mayon Volcano** rising majestically in the front-center horizon with soft drifting wispy clouds near the crater, framed by the weathered volcanic-stone **Cagsawa Church belfry ruin** slightly off-center in the midground, lush green fields, and swaying tropical palms.
- **Driveway Framing:** Scenic heritage stone/asphalt tourist road running directly outside the cafe entrance.
- **Mobile Three.js Optimization:** Build Mayon as a clean, multi-ring tapered cone with vertex-colored lush green foothills blending into dark volcanic ash near the summit. Use `InstancedMesh` for coconut palms and low-poly tropical foliage.

### 2.3 Hilltop City Lights (Tagaytay / Baguio Experience)
- **Visual Identity:** High-altitude Philippine mountain ridge overlooking a vast valley filled with shimmering nighttime city lights, crisp pine trees along the ridge railing, and cool drifting highland mist.
- **Driveway Framing:** Scenic mountain overlook boulevard right beside the cafe's front railing.
- **Mobile Three.js Optimization:** Render hundreds of distant glowing valley city lights using a **single `THREE.Points` particle field** (1 draw call) with warm amber/white/soft-cyan point colors that intensify automatically from dusk through midnight. Batch pine trees into one `InstancedMesh`.

### 2.4 Japanese Tranquility (Ancient Japanese Town)
- **Visual Identity:** Historic Kyoto/Gion-inspired lane lined with wooden *machiya* townhouses, curved dark-tiled roofs, hanging red/amber *chochin* lanterns, and a distant misty pagoda silhouette.
- **Mobile Three.js Optimization:** Batch wooden facades, roof tiles, and lanterns into **1–2 `InstancedMesh` draw calls**. Use emissive lantern shaders instead of dynamic point lights.
- **Signature Atmosphere:** Drifting **Sakura Petals** during Clear daytime; soft warm **Fireflies** at night.

### 2.5 Brazilian Favela with Rio de Janeiro View
- **Visual Identity:** Vibrant, sun-drenched terraced hillside overlooking Rio de Janeiro. Colorful stacked low-poly favela houses (terracotta, coral, teal, mustard yellow, cobalt blue) climb and cascade along the slopes, strung with subtle utility wires, while distant Guanabara Bay, Sugarloaf Mountain, and the iconic hilltop statue silhouette rise across the bay.
- **Driveway Framing:** Lively paved hillside terrace street right outside the garage bay with a low colorful concrete parapet.
- **Mobile Three.js Optimization:** Pack all terraced hillside houses into a single `InstancedMesh` using `instanceColor` for the vibrant multi-colored facades (`castShadow = false`), keeping draw calls minimal while looking rich and bustling.

### 2.6 Cyberpunk Neon (Ghost in the Shell — New Vision City Vibe)
- **Visual Identity:** Towering dense megacity skyline rising behind the cafe. Deep indigo-black night atmosphere lit by cyan, magenta, and amber holographic billboards, vertical neon kanji/geometric signs, and a dark rain-slick road.
- **Mobile Three.js Optimization:** Skip heavy post-processing Bloom. Fake crisp neon glow using additive-blended radial gradient sprites (`THREE.AdditiveBlending`, `depthWrite: false`) behind emissive billboards.
- **Signature Atmosphere:** **Neon Rain** (slightly angled cyan/pink-tinted rain streaks).

### 2.7 Eiffel Tower View (Parisian Hillside Terrace)
- **Visual Identity:** Framed as an elevated **Montmartre hillside promenade** with wrought-iron railings across the cobblestone street. Parisian Haussmann rooftops step down below while the **Eiffel Tower** stands prominently in the center sightline.
- **Mobile Three.js Optimization:** Low-poly tapered truss tower with 12–16 twinkling golden emissive light sprites at night.
- **Weather Exclusivity:** **❄️ Snow Enabled.**

### 2.8 Switzerland Hilltop (Alpine Overlook + Inclined Elevator)
- **Visual Identity:** Crisp Swiss alpine ridge with snow-capped peaks, low-poly spruce clusters, wooden chalet railings, and an animated **inclined elevator (funicular)** smoothly riding up and down a steep hillside track in the midground.
- **Animated Inclined Elevator:** Low-poly red/glass funicular cabin smoothly `lerp`ing between lower and upper stations with a `5.0s` pause at each end.
- **Weather Exclusivity:** **❄️ Snow Enabled.**

### 2.9 Mt. Everest View & Hiker Trail (**Always Winter**)
- **Visual Identity:** Dramatic Himalayan base-camp coffee outpost perched along a snowy stone hiker trail. The massive, jagged snow-and-dark-slate summit of **Mt. Everest** dominates the horizon under a crisp high-altitude sky, flanked by fluttering colorful Tibetan prayer flag lines, wooden trail markers, snowdrifts, and warm glowing expedition lanterns.
- **Driveway Framing:** Cleared stone-and-packed-snow mountaineering trail running past the cafe entrance so hikers, customers, and winter-ready couriers arrive naturally.
- **Weather Exclusivity (**Always Winter Lock**):** Permanently locked to **Winter / Snow** climate—toggles only between **Crisp Snowy Clear** (visible snow terrain + frost breath/drifting snow flurries) and **Active Snowfall**. Rain and summer states are completely disabled here.

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

### Auto-Clamp & Climate Rules
1. **Non-Snow Clamp:** Switching from a Snow location (`eiffel_tower`, `switzerland_hilltop`, `mt_everest`) to any non-snow location automatically transitions `snow` back to `clear` (or `rain`).
2. **Always-Winter Enforcement (`mt_everest`):** Loading **Mt. Everest & Hiker Trail** immediately locks the climate to `winter` / `snow`, disables the Rain toggle, and activates snow particles + crisp alpine blue-white sunlight (`#dceeff`).
3. **Weather-Reactive Outfits Hook:** Whenever weather or scenery changes, broadcast a `climateState` (`'summer'` when Clear/Rain on non-winter maps; `'winter'` when Snow is active or on Mt. Everest) so weather-reactive patron outfits update seamlessly.

---

## 4. Unlockable Patron Outfits System (Customers)

Players can unlock six cultural and thematic **Patron Outfit Packs** in the Shop to dress incoming walk-in and dine-in customers. All outfits are constructed using lightweight, shared low-poly modular meshes and vertex/material swaps on the existing customer rig so draw calls remain mobile-safe.

### 4.1 Patron Outfit Catalog & Weather Rules

| Outfit Pack | Unlock Cost | Weather Behavior | Procedural 3D Visual Design |
| :--- | :---: | :--- | :--- |
| **1. Filipino Style Outfits** | **$400** | All-weather *(Casual)* | Relaxed **sando / tank top** or breathable **casual t-shirt** (varied tropical & neutral tones), comfortable **shorts**, and classic **slippers (*tsinelas*)** |
| **2. Brazilian Style Outfits** | **$900** | All-weather *(Warm/Vibrant)* | Bright tropical colors, casual **green/yellow/blue sporty jerseys** or breezy patterned summer tees, relaxed beach/street shorts, and flip-flops or light sneakers |
| **3. Ancient Japanese Outfits** | **$1,200** | All-weather *(Traditional)* | Layered **kimono / yukata** robe geometry with distinct wide sleeves, contrasting waist **obi sash**, optional outer *haori* jacket, and wooden **geta sandals** |
| **4. French Outfits** | **$1,600** | **Weather-Reactive** *(Summer / Winter)* | • **Summer (Clear/Rain):** Breton striped top, light tailored trousers/skirt, chic café beret or silk neck scarf.<br>• **Winter (Snow):** Long structured wool peacoat/trench, cozy knit scarf, beret, and dark winter boots. |
| **5. Swiss Outfits** | **$2,000** | **Weather-Reactive** *(Summer / Winter)* | • **Summer (Clear/Rain):** Crisp alpine casual shirt with light vest or subtle modern *trachten* / chalet accents and breathable trousers.<br>• **Winter (Snow):** Cozy Nordic-patterned knit sweater or quilted alpine puffer jacket, warm pom-pom beanie, scarf, and snow boots. |
| **6. Hiker Outfits** | **$2,500** | **Winter Variant Only** | Heavy insulated **mountaineering parka** (burnt orange, alpine red, cobalt, or pine green), thick thermal snow pants, **3D expedition backpack** mounted on torso, knit beanie / ski goggles on forehead, and heavy snow boots. |

### 4.2 Patron Outfit Assignment Modes
Inside the **`👗 Outfits`** tab, give players two intuitive toggles so they have full control:
1. **`Auto-Match Scenery` (Recommended Default):** Automatically dresses customers in the unlocked outfit matching the active location (e.g., Filipino outfits in Mayon/Hilltop, Brazilian in Rio, Ancient Japanese in Kyoto, French in Paris, Swiss in Switzerland, Hiker on Mt. Everest). If the matching pack isn't unlocked yet, customers wear default outfits.
2. **`Custom Mix` (Manual Toggle):** Players can check/uncheck any unlocked outfit packs to mix into the customer pool regardless of location.
   - *Strict Winter Rule for Hiker Outfits:* Under `Auto-Match Scenery` (and standard weather filtering), **Hiker Outfits** only spawn when `climateState === 'winter'` (i.e., always on **Mt. Everest**, or during **Snow** on **Eiffel Tower** and **Switzerland Hilltop**).

---

## 5. UI Switcher Design (Mobile Landscape)

Expand the Shop Modal with clean tabs for **`🌍 Sceneries`** and **`👗 Outfits`** so the main HUD remains clutter-free alongside the left-edge Cat Station icon.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ [ 🐱 Cats ] [ 🎩 Cosmetics ] [ 🌍 Sceneries ] [ 👗 Outfits ] [ ⚡ Shop ] [✕]│
├─────────────────────────────────────────────────────────────────────────┤
│ ACTIVE: Mt. Everest & Hiker Trail         Climate: ❄️ ALWAYS WINTER     │
│                                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │  🌋          │ │  🌃          │ │  🇧🇷          │ │  🏔️              │ │
│ │ Mayon        │ │ Hilltop City │ │ Brazilian    │ │ Mt. Everest      │ │
│ │ Volcano      │ │ Lights       │ │ Favela (Rio) │ │ & Hiker Trail    │ │
│ │ [  Equip  ]  │ │ [  $4,000 ]  │ │ [  $9,500 ]  │ │ [   Active   ]   │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘ │
│                                                      ❄️ Always Winter   │
│ ◀ ────────────────────────── [ Scroll 9 Locations ] ──────────────── ▶  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Patron Outfits Tab Layout
```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Mode: (●) Auto-Match Location   ( ) Custom Mix    Active: ❄️ Winter     │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ │ 🇵🇭 Filipino   │ │ 🇧🇷 Brazilian  │ │ ⛩️ Ancient JP │ │ 🇫🇷 French     │ │
│ │ Tank/Tee &    │ │ Vibrant Rio   │ │ Kimono &      │ │ Summer/Winter │ │
│ │ Slippers      │ │ Streetwear    │ │ Obi Sash      │ │ Auto-Switch   │ │
│ │ [ ✓ Enabled ] │ │ [   $900   ]  │ │ [  $1,200  ]  │ │ [ ✓ Enabled ] │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ │
│ ┌───────────────┐ ┌───────────────┐                                     │
│ │ 🇨🇭 Swiss      │ │ 🥾 Hiker      │  Note: Hiker Outfits appear only    │
│ │ Summer/Winter │ │ Winter Only   │  during Snow / Mt. Everest winter.  │
│ │ [  $2,000  ]  │ │ [ ✓ Enabled ] │                                     │
│ └───────────────┘ └───────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Secret Easter Egg NPC ("Beb" / "Anton" / "Duminiki")

A completely hidden, low-chance multi-role NPC modeled after the developer—capable of appearing across all 9 sceneries as an **outdoor passerby**, a **walk-in customer**, or a **delivery scooter rider**. Completely excluded from the Shop, Codex, Patron Outfit overrides, and UI counters.

### 6.1 Visual & Procedural 3D Design Spec
- **Head & Hair:** Short jet-black hair (`#18181A`) with a neat straight fringe, warm tan skin tone (`#C6936B`), subtle mustache detail painted on the face `CanvasTexture`, and tiny dark stud earrings.
- **Signature Outfit (Streetwear Windbreaker Fit):** Black-and-white colorblock windbreaker (`#F2F2F2` white upper chest and inner sleeves, `#1C1C20` black lower torso, shoulders, and outer sleeve panels, plus a thin crimson `#C83232` vertical chest-zipper accent) worn either open over a plain white tee or zipped up.
- **Bottoms & Footwear:** Loose, baggy light-wash denim jeans (`#B8C9DC`) paired with black sneakers (`#1A1A1D`) featuring crisp white side stripes and white soles (`#F5F5F5`).
- **Signature Accessories:** A black-and-white university ID lanyard hanging around the neck with a small rectangular ID card mesh on the chest, plus a metallic silver wristwatch (`#D0D5DD`) on the left wrist.
- **Casual Sunny Variant (25% chance on non-winter Clear weather):** Dark charcoal grey tee (`#595B60`) with the university lanyard and silver wristwatch instead of the windbreaker.
- **Caramel Polo RL Cap Variant (40% chance per encounter):** Warm brown-caramel baseball cap (`#A66B3C`) with a curved brim and a tiny dark-navy (`#1B2845`) embroidered pony silhouette on the front crown.
- **Weather-Smart Hood Rule:** If the caramel cap rolls `false` and the active weather is **Rain** or **Snow / Always Winter**, automatically pull the windbreaker's **black hood up** over his head (and disable the casual grey tee variant during Snow/Winter).
- **Immune to Patron Outfit Overrides:** Always wears his signature outfit regardless of active location outfit packs so he remains instantly recognizable anywhere in the world.

### 6.2 Spawn Rules, Anti-Clone Lock & Name Rotation
- **Zero Spoilers:** `isSecret: true` — hidden from every UI panel, achievement list, and silhouette preview.
- **Low Spawn Probabilities:**
  - **Outdoor Passerby:** `8%` per pedestrian spawn
  - **Walk-in Customer:** `5%` per customer roll
  - **Delivery Rider:** `6%` per rider roll
- **Singleton Lock & Cooldown:** Global `isSecretNpcActive` boolean prevents simultaneous clones; `270s` (~4.5 min) cooldown between sightings.
- **Non-Repeating Name Rotation:** Cycles cleanly through **`Beb` -> `Anton` -> `Duminiki`** via `localStorage` so his name changes on every encounter.

### 6.3 Subtle Easter Egg Perks & Behaviors
- **Zero Impatience:** Mood meter drains at `0.25x` speed (never turns red).
- **Bonus Tip & Heart Particle:** Serving his order awards a **2x tip** and emits a warm floating amber/pink heart particle above his head.
- **Outdoor Cameo Moment:** When spawning as an outdoor passerby, he occasionally pauses outside the garage bay for `3.0s`, looks toward the counter, and gives a quick wave before continuing down the street.
- **Subtle Dialogue Pool:**
  - *Customer:* `"Usual order, chef—take your time."` / `"Best coffee in town, hands down."` / `"Saving my favorite seat."`
  - *Delivery Rider:* `"Special pickup! Don't overwork yourself."` / `"Quick drop-by for the VIP barista."`

---

## 7. Mobile-Optimized Three.js Architecture

### 7.1 `SceneryManager.js` (9 Sceneries + Disposal + Always-Winter Lock)

```javascript
import * as THREE from 'three';

export const SCENERY_CONFIGS = {
  busy_street:          { id: 'busy_street', name: 'The Busy Street', cost: 0, unlockType: 'default', allowsSnow: false, alwaysWinter: false, defaultOutfit: 'filipino', fogColor: 0x1a2030, fogDensity: 0.012 },
  mayon_volcano:        { id: 'mayon_volcano', name: 'Mayon Volcano View', cost: 2000, unlockType: 'shop', allowsSnow: false, alwaysWinter: false, defaultOutfit: 'filipino', fogColor: 0x2a3338, fogDensity: 0.008 },
  hilltop_city_lights:  { id: 'hilltop_city_lights', name: 'Hilltop City Lights', cost: 4000, unlockType: 'shop', allowsSnow: false, alwaysWinter: false, defaultOutfit: 'filipino', fogColor: 0x161d2b, fogDensity: 0.016 },
  japanese_tranquility: { id: 'japanese_tranquility', name: 'Japanese Tranquility', cost: 6500, unlockType: 'shop', allowsSnow: false, alwaysWinter: false, defaultOutfit: 'ancient_japanese', fogColor: 0x241d29, fogDensity: 0.015 },
  brazilian_favela:     { id: 'brazilian_favela', name: 'Brazilian Favela (Rio)', cost: 9500, unlockType: 'shop', allowsSnow: false, alwaysWinter: false, defaultOutfit: 'brazilian', fogColor: 0x2c2836, fogDensity: 0.010 },
  cyberpunk_neon:       { id: 'cyberpunk_neon', name: 'Cyberpunk Neon', cost: 14000, unlockType: 'shop', allowsSnow: false, alwaysWinter: false, defaultOutfit: null, fogColor: 0x0a0f1f, fogDensity: 0.018 },
  eiffel_tower:         { id: 'eiffel_tower', name: 'Eiffel Tower View', cost: 22000, unlockType: 'shop', allowsSnow: true, alwaysWinter: false, defaultOutfit: 'french', fogColor: 0x1b2236, fogDensity: 0.013 },
  switzerland_hilltop:  { id: 'switzerland_hilltop', name: 'Switzerland Hilltop', revenueMilestone: 35000, unlockType: 'milestone', allowsSnow: true, alwaysWinter: false, defaultOutfit: 'swiss', fogColor: 0x243447, fogDensity: 0.011 },
  mt_everest:           { id: 'mt_everest', name: 'Mt. Everest & Hiker Trail', revenueMilestone: 65000, unlockType: 'milestone', allowsSnow: true, alwaysWinter: true, defaultOutfit: 'hiker', fogColor: 0xcfe0f2, fogDensity: 0.012 },
};

export class SceneryManager {
  constructor(scene, weatherController) {
    this.scene = scene;
    this.weather = weatherController;
    this.activeId = null;
    this.activeGroup = null;
    this.updatables = [];
  }

  getClimateState() {
    const cfg = SCENERY_CONFIGS[this.activeId];
    if (!cfg) return 'summer';
    if (cfg.alwaysWinter || this.weather?.currentWeather === 'snow') return 'winter';
    return 'summer';
  }

  async loadScenery(sceneryId, { onFadeOut, onFadeIn } = {}) {
    const config = SCENERY_CONFIGS[sceneryId];
    if (!config || this.activeId === sceneryId) return;

    if (onFadeOut) await onFadeOut();
    this._disposeActive();

    const group = new THREE.Group();
    group.name = `Scenery_${sceneryId}`;
    this.updatables = [];

    const builders = {
      busy_street: () => this._buildBusyStreet(group),
      mayon_volcano: () => this._buildMayonVolcano(group),
      hilltop_city_lights: () => this._buildHilltopCityLights(group),
      japanese_tranquility: () => this._buildJapaneseTranquility(group),
      brazilian_favela: () => this._buildBrazilianFavela(group),
      cyberpunk_neon: () => this._buildCyberpunkNeon(group),
      eiffel_tower: () => this._buildEiffelTower(group),
      switzerland_hilltop: () => this._buildSwitzerlandHilltop(group),
      mt_everest: () => this._buildMtEverest(group),
    };
    builders[sceneryId]?.();

    this.scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);

    // Enforce weather exclusivity & always-winter lock
    if (config.alwaysWinter) {
      this.weather?.setWeather('snow', { locked: true });
    } else {
      this.weather?.unlockWeather?.();
      if (!config.allowsSnow && this.weather?.currentWeather === 'snow') {
        this.weather.setWeather('clear');
      }
    }

    this.scene.add(group);
    this.activeGroup = group;
    this.activeId = sceneryId;
    localStorage.setItem('klasik_active_scenery', sceneryId);

    if (onFadeIn) await onFadeIn();
  }

  _buildHilltopCityLights(group) {
    const count = 260;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [new THREE.Color(0xffbe55), new THREE.Color(0xfff1d0), new THREE.Color(0xff8c42), new THREE.Color(0x88d4ff)];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = -4 - Math.random() * 14;
      positions[i * 3 + 2] = -24 - Math.random() * 48;
      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.65, vertexColors: true, transparent: true, opacity: 0.9 });
    group.add(new THREE.Points(geo, mat));
  }

  _buildBusyStreet(group) {}
  _buildMayonVolcano(group) { /* Symmetrical cone + Cagsawa stone belfry ruin + instanced palms */ }
  _buildJapaneseTranquility(group) { /* Instanced machiya facades + emissive lanterns */ }
  _buildBrazilianFavela(group) { /* Instanced terraced colorful houses + distant Rio bay/peaks */ }
  _buildCyberpunkNeon(group) { /* Megacity silhouettes + additive fake-bloom billboards */ }
  _buildEiffelTower(group) { /* Montmartre iron railing + low-poly Eiffel truss + night twinkle */ }
  _buildSwitzerlandHilltop(group) { /* Alpine ridge + animated ping-pong inclined elevator cabin */ }
  _buildMtEverest(group) { /* Jagged Everest peak + snowdrifts + fluttering prayer flags + hiker trail */ }

  update(dt) {
    for (let i = 0; i < this.updatables.length; i++) this.updatables[i](dt);
  }

  _disposeActive() {
    if (!this.activeGroup) return;
    this.activeGroup.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    this.scene.remove(this.activeGroup);
    this.activeGroup = null;
    this.updatables = [];
  }
}
```

### 7.2 `PatronOutfitManager.js` (Weather-Reactive Outfit Selection)

```javascript
export const PATRON_OUTFIT_PACKS = {
  filipino:         { id: 'filipino', name: 'Filipino Style', cost: 400, weatherMode: 'any' },
  brazilian:        { id: 'brazilian', name: 'Brazilian Style', cost: 900, weatherMode: 'any' },
  ancient_japanese: { id: 'ancient_japanese', name: 'Ancient Japanese', cost: 1200, weatherMode: 'any' },
  french:           { id: 'french', name: 'French Outfits', cost: 1600, weatherMode: 'dual_season' },
  swiss:            { id: 'swiss', name: 'Swiss Outfits', cost: 2000, weatherMode: 'dual_season' },
  hiker:            { id: 'hiker', name: 'Hiker Outfits', cost: 2500, weatherMode: 'winter_only' },
};

export function resolveCustomerOutfit({ sceneryConfig, climateState, unlockedOutfits, autoMatch, enabledCustomOutfits }) {
  if (autoMatch && sceneryConfig?.defaultOutfit) {
    const packId = sceneryConfig.defaultOutfit;
    const pack = PATRON_OUTFIT_PACKS[packId];
    if (unlockedOutfits.includes(packId)) {
      if (pack.weatherMode === 'winter_only' && climateState !== 'winter') {
        return { packId: 'default', variant: 'standard' };
      }
      const variant = pack.weatherMode === 'dual_season' ? climateState : (pack.weatherMode === 'winter_only' ? 'winter' : 'standard');
      return { packId, variant };
    }
    return { packId: 'default', variant: 'standard' };
  }

  const validPool = enabledCustomOutfits.filter((id) => {
    const pack = PATRON_OUTFIT_PACKS[id];
    if (!pack || !unlockedOutfits.includes(id)) return false;
    if (pack.weatherMode === 'winter_only' && climateState !== 'winter') return false;
    return true;
  });

  if (!validPool.length) return { packId: 'default', variant: 'standard' };
  const chosenId = validPool[Math.floor(Math.random() * validPool.length)];
  const chosenPack = PATRON_OUTFIT_PACKS[chosenId];
  const variant = chosenPack.weatherMode === 'dual_season' ? climateState : (chosenPack.weatherMode === 'winter_only' ? 'winter' : 'standard');
  return { packId: chosenId, variant };
}
```

### 7.3 Reference Secret NPC Config (`SecretNpcConfig.js`)

```javascript
export const SECRET_NPC_CONFIG = {
  id: 'secret_dev_npc',
  isSecret: true,
  immuneToPatronOutfits: true,
  names: ['Beb', 'Anton', 'Duminiki'],
  spawnRates: {
    outdoorPasserby: 0.08,
    customer: 0.05,
    deliveryRider: 0.06,
  },
  cooldownSeconds: 270,
  capChance: 0.40,
  casualTeeChanceOnClear: 0.25,
  appearance: {
    skinTone: '#C6936B',
    hairColor: '#18181A',
    jacketWhite: '#F2F2F2',
    jacketBlack: '#1C1C20',
    jacketZipperAccent: '#C83232',
    casualTeeColor: '#595B60',
    jeansColor: '#B8C9DC',
    sneakerBase: '#1A1A1D',
    sneakerAccent: '#F5F5F5',
    capColor: '#A66B3C',
    capLogoColor: '#1B2845',
    watchColor: '#D0D5DD',
    hasLanyard: true,
    hasStudEarrings: true,
  },
  perks: {
    patienceMultiplier: 0.25,
    tipMultiplier: 2.0,
    showHeartParticle: true,
  },
};

export function getNextSecretNpcName() {
  const lastIdx = parseInt(localStorage.getItem('klasik_secret_name_idx') ?? '-1', 10);
  const nextIdx = (lastIdx + 1) % SECRET_NPC_CONFIG.names.length;
  localStorage.setItem('klasik_secret_name_idx', String(nextIdx));
  return SECRET_NPC_CONFIG.names[nextIdx];
}
```

---

## 8. Save Data Schema (`localStorage`)

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

*Milestone Triggers:*
- At **`$35,000` Total Revenue**: Auto-unlock **Switzerland Hilltop** with toast `"🏔️ $35,000 Revenue Reached — Switzerland Hilltop Unlocked!"`
- At **`$65,000` Total Revenue**: Auto-unlock **Mt. Everest & Hiker Trail** with toast `"❄️ $65,000 Prestige Reached — Mt. Everest & Hiker Trail Unlocked!"`

---

## 9. Phased Implementation Roadmap

- [ ] **Phase 0 — Critical Live-Build Hotfixes (MANDATORY FIRST):**
  - Rebuild **Cat Cloth** as a snug sleeveless pet vest wrapped vertically around the seated torso (no giant front shield/ring); keep **Glasses / Thuglife Glasses completely untouched**.
  - Lower & angle **Gold Chain** cleanly onto the collar/chest line (away from nose/snout).
  - Rebuild **Dinosaur Costume** into the plush bone-white **Skeleton T-Rex** skull hood (open jaw framing face) + curved back ribcage, dorsal spine spikes, and plush bone tail.
  - Eliminate the floating gap on **Cat Beret / Hats** by seating `anchor_head_top` directly onto the skull crown (`headRadius * 0.84`).
  - Completely remove the obstructing legacy floating **Spotify iframe preview widget** from the DOM/UI.
  - Fix **Radio Mode** playback by using a dedicated direct HTML5 `Audio` instance *without* `crossOrigin = 'anonymous'`, synchronous tap-to-play, verified HTTPS streams, and multi-mirror Radio Browser PH resolution.
  - Reposition the **Pastry Serving Plate** forward into an unobstructed counter spot clear of the **3 dark-brown cylinder canisters**, with an expanded touch hitbox and amber rim highlight.
- [ ] **Phase 1 — `SceneryManager` & Climate Rules:** Implement `SceneryManager.js` with recursive `.dispose()`, `0.35s` fade transitions, fog/lighting presets, Snow weather clamping, and the `alwaysWinter` lock for Mt. Everest.
- [ ] **Phase 2 — Core & Tropical Sceneries:** Build **The Busy Street**, **Mayon Volcano View (Cagsawa Ruins)**, **Hilltop City Lights (`THREE.Points` valley lights + highland mist)**, and **Brazilian Favela (`InstancedMesh` terraced Rio hillside)**.
- [ ] **Phase 3 — Stylized & Winter Landmarks:** Build **Japanese Tranquility**, **Cyberpunk Neon (fake-bloom billboards + Neon Rain)**, **Eiffel Tower View**, **Switzerland Hilltop (animated inclined elevator)**, and **Mt. Everest & Hiker Trail (prayer flags + always-winter snow)**.
- [ ] **Phase 4 — Unlockable Patron Outfits:** Build modular low-poly customer outfit presets for **Filipino**, **Brazilian**, **Ancient Japanese**, **French (Summer/Winter)**, **Swiss (Summer/Winter)**, and **Hiker (Winter Only)**, wired into `PatronOutfitManager.js` and the Shop's `👗 Outfits` tab.
- [ ] **Phase 5 — Secret Easter Egg NPC:** Build the procedural 3D character mesh (windbreaker/jeans/sneakers/lanyard/watch, 40% caramel Polo RL cap, weather-smart hood, immune to patron outfit overrides), wire singleton lock + cooldown across outdoor passersby, customers, and delivery riders, and enable the `Beb` / `Anton` / `Duminiki` name rotation and heart-particle perks.