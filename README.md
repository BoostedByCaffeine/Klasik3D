# Klasik 3D: Garage Garden Cafe

> **Version:** `v2.5.0` (Build `250`) · **Studio:** BoostedByCaffeine Studios  
> A stylized low-poly first-person 3D barista simulator, cozy cafe management game, and interactive audio hangout built with React, TypeScript, and Three.js—playable on desktop browsers, iOS Safari, installable PWAs, and signed Android APKs.

---

## Table of Contents

1. [Background & Story](#background--story)
2. [Core Gameplay Mechanics](#core-gameplay-mechanics)
   - [Game Modes & Realism Mode](#game-modes--realism-mode)
   - [Barista Stations & Brewing Loop](#barista-stations--brewing-loop)
   - [Drinks & Pastries Menu](#drinks--pastries-menu)
   - [First-Time Onboarding & Interactive Tutorial](#first-time-onboarding--interactive-tutorial)
   - [Customers, Mood System, Delivery Riders & Secret NPC](#customers-mood-system-delivery-riders--secret-npc)
   - [Cafe Cats & Adaptive 3D Cosmetics](#cafe-cats--adaptive-3d-cosmetics)
   - [1990 Mazda Miata MX-5 & Garage Garden Lounge](#1990-mazda-miata-mx-5--garage-garden-lounge)
   - [Progression, Upgrades & Customization](#progression-upgrades--customization)
   - [9 Sceneries, Dynamic Climate & Outdoor Overlooks](#9-sceneries-dynamic-climate--outdoor-overlooks)
   - [Unified Audio & Procedural Sound Engine](#unified-audio--procedural-sound-engine)
3. [Technologies & Architecture](#technologies--architecture)
   - [Core Web & 3D Stack](#core-web--3d-stack)
   - [Mobile, iOS Safari & PWA Engineering](#mobile-ios-safari--pwa-engineering)
   - [Android APK Build, Versioning & Keystore Signing](#android-apk-build-versioning--keystore-signing)
   - [Testing & Verification](#testing--verification)
4. [Project Structure](#project-structure)
5. [Local Development & Build Commands](#local-development--build-commands)

---

## Background & Story

### Personal Dedication
**Klasik 3D: Garage Garden Cafe** began as a heartfelt gift built primarily for the developer's girlfriend—inspired directly by the things she loves most:
- **Barista games** and the tactile rhythm of grinding espresso, steaming velvety milk, and serving drinks
- **A classic red 1990 Mazda Miata MX-5** parked right in front of the cafe (and showcased inside once unlocked)
- **Cafe cats** lounging, wandering, and wearing tiny custom outfits around the counter
- **Peaceful sceneries** from around the world—from cozy urban lanes and Philippine volcanic/highland views to Kyoto alleys, Rio hillsides, Parisian lanes, Swiss Alps, and Himalayan trails

First-time players are greeted on the Title Screen with a personal **Developer Note** sharing this story, which remains readable at any time from **Title Settings → Developer Note** or **HUD Menu → Developer Note**.

### Design Philosophy & Evolution
What started as a cozy garage coffee bar evolved through several major expansions into a deep, deterministic 3D simulation:
1. **Tactile First-Person Barista Craft:** Smooth C1-continuous camera transitions across six counter stations, 3D milk-pitcher steaming/latte-art pouring choreography, glass teapot steeping, crystal ice scooping, and optional **Realism Mode** direct 3D object raycasting.
2. **Living Indoor-Outdoor World:** Customers arrive from the street, wait at the counter, dine inside or grab takeout, interact with laptops/phones/the parked Miata, while sidewalk pedestrians steer naturally around streetlamps, planters, snowbanks, and the Miata itself.
3. **World Travel & Climate Continuity:** Nine distinct 3D environments (with real-world landmarks framed as *Inspired by* tributes) paired with live time-of-day lighting, rain/snow exclusivity rules, and weather-reactive patron wardrobes.
4. **Offline-First & Multi-Platform:** Pre-baked Web Audio soundscapes, offline vinyl synth tracks, PWA caching, full-bleed iOS Safari viewport handling, and a reproducible Capacitor Android APK pipeline with single-source versioning for in-place updates.

---

## Core Gameplay Mechanics

### Game Modes & Realism Mode
- **Career Mode:** Full cafe management with live customer mood timers (60–120s per guest), tips, daily cup quotas (`35 cups/day` for a `+$120` bonus), revenue milestones, and walkout penalties if mood hits `0`.
- **Zen Mode:** Relaxed, stress-free brewing where players can craft drinks, enjoy the music, pet cats, and take in the scenery at their own pace.
- **Realism Mode Toggle:** Switches from HUD-assisted buttons to direct 3D interaction—clicking directly on the 3D espresso portafilter, tamper, grinder, steaming pitcher, borosilicate teapot, ice bin, syrup bottles, pastry case, vinyl deck, and serving counter.
- **Graphics Quality Presets (`low` / `medium` / `max`):** Adjusts pixel ratio, shadow map fidelity, and post/particle density while persisting to `localStorage`.

### Barista Stations & Brewing Loop
The counter is organized into **6 camera-tracked stations**:
1. **Station 1 — Pastry Case:** Pick up paired pastries (`Daisy Donut`, `Miata Cake`, `Croissant`) onto a serving plate (decoupled from drink state so grabbing a pastry never ruins an in-progress cup).
2. **Station 2 — Orders:** Greet customers, inspect drink + custom add-on requests, accept orders (`orderAccepted`), and pin the active ticket.
3. **Station 3 — Espresso Bar:** Grind beans (`[G]`), tamp the coffee puck (`[T]`), pull a 9-bar double espresso shot (`[E]`), or rinse/reset (`[R]`) if a wrong ingredient enters the cup.
4. **Station 4 — Milk & Tea:** Steep loose-leaf tea in the glass teapot, pump flavored syrups (`vanilla`, `caramel`, `chocolate`, `matcha`), scoop crystal ice from the recessed counter bin, and steam/pour microfoam milk.
5. **Station 5 — Serve Counter:** Hand over the completed drink (and paired pastry) to the pinned customer (`[Enter]`), earning base price, ingredient margin, speed/mood tips, upgrade bonuses, and multipliers.
6. **Station 6 — Audio Deck:** Control the interactive 3D vinyl turntable, live internet radio, or external media bridge directly on the counter.

**Anti-Exploit & Step-Lock Integrity:** Orders must be accepted before prepping (`canStartOrderPrep`), active prep slots are capped to accepted pending orders, items created before order acceptance cannot be served retroactively, and each physical action locks briefly (`ActiveStepAction`) while the 3D choreography plays out.

### Drinks & Pastries Menu
**16 Craft Recipes across 4 Categories:**
- **Hot Coffees (5):** *Klasik Double Espresso*, *Garage Velvet Latte*, *Madagascar Vanilla Latte*, *Artisan Dark Cacao Mocha*, *Salted Caramel Cortado*
- **Iced Coffees (5):** *Iced Caramel Garden Macchiato*, *Iced Garage Americano*, *Iced Vanilla Sweet Cream Latte*, *Iced Dark Cacao Shaken Espresso*, *Iced Dirty Uji Matcha Fusion*
- **Artisanal Teas (4):** *Hot Kyoto Emerald Sencha Tea*, *Iced Uji Ceremonial Matcha*, *Earl Grey Vanilla London Fog*, *Roasted Hojicha Caramel Tea Latte*
- **Cold Drinks & Botanical Refreshers (2):** *Iced Hibiscus Botanical Cooler*, *Iced Yuzu Vanilla Cold Refresher*

**3 Artisan Pastries:**
- **Daisy Donut ($4):** White Bavarian-glazed brioche donut with yellow cream center
- **Miata Cake ($5):** Crimson red velvet strawberry slice with layered cream frosting
- **Croissant ($4):** Flaky golden French butter croissant

**Dynamic Order Variations:** Customers may request custom add-ons (icing, extra syrup swaps, or a pastry pairing), and cold high-altitude sceneries (`Switzerland Hilltop`, `Mt. Everest`) bias customer preferences toward **95% hot drinks**.

### First-Time Onboarding & Interactive Tutorial
- **Interactive First-Drink Guide (6 Steps):** Automatically activates on a new player's first shift (and can be replayed anytime from **HUD Menu → Tutorial Guide**).
- **Live-State Aware:** Uses `resolveFirstDrinkTutorialStep()` to inspect the active order and cup progress—dynamically guiding the player through *Accept Order → Grind → Tamp → Pull Shot → Milk/Tea/Ice/Syrup/Pastry → Serve* (or *Rinse* on mistake).
- **Patience Paused & Skippable:** Customer mood drain is paused while the tutorial overlay is active so players can learn comfortably, and a **Skip** button is always available.

### Customers, Mood System, Delivery Riders & Secret NPC
- **Mood & Facial Expressions:** Waiting customers start at `100%` mood and drain over a randomized `60–120s` window. Serving above `75%` awards a `+$3` (`+$4` specialty) happy mood tip; `40–74%` awards `+$1`. Procedural 3D faces react live across `delighted` (`^ ^` happy eyes), `happy`, `neutral`, `worried`, and `angry`.
- **Dine-In vs. Takeout & Lounge Behaviors:** Dine-in guests walk to available seats across 4 lounge tables (kept clear of the Miata bay) and engage in randomized social behaviors (`selfie`, `chatting`, `laptop`, `relaxing`, `car_selfie`).
- **Delivery Riders:** Scooter riders (`blue`, `green`, `red` variants, max 2 parked simultaneously) spawn at `50–80%` probability depending on time of day (with a pity guarantee after 2 regular customers), always order a drink + pastry combo, and grant a `+$3` Delivery Partner bonus.
- **Secret Easter Egg NPC:** A special visitor rotating among three names (`Beb`, `Anton`, `Duminiki`) has a rare chance to appear as a passerby (`8%`), customer (`5%`), or rider (`6%`) on a `270s` cooldown—with `75%` slower patience drain (`0.25x`), `2x` tips, and 4 custom 3D variants (`default`, `hat` cap, `helmet` delivery, and `hike` on Mt. Everest).

### Cafe Cats & Adaptive 3D Cosmetics
- **12 Unique Cafe Cats:**
  - **Starter:** *Champy* (obsidian black, emerald eyes)
  - **Revenue Unlocks:** *Chimny* ($1,000), *Chunky* ($1,500, heterochromia), *Kicks* ($2,000, largest cat), *Cheeto* ($2,250, heterochromia)
  - **Adoption Shop:** *Katkat* ($150), *Luna* ($500), *Gigi* ($500, playful kitten), *Mikmik* ($1,000 — **High-Stakes Rush:** `+30%` drink revenue & `+30%` mood drain), *Amby* ($1,500)
  - **Master Unlock:** *Lilo* (unlocks after owning the 7 core unlockable cats — **Pure Peace:** disables mood drain completely at `100%`)
  - **Secret Cat:** *Tisay* (slender tuxedo ginger; hidden from shop counters until unlocking the Golden Espresso Machine at `$50,000` gross income)
- **25 Adaptive Cat Cosmetics across 5 Slots (`eyewear`, `headwear`, `neckwear`, `body`, `full_suit`):**
  - Includes glasses, sunglasses, pixelated *Thuglife* glasses, 3 handlebar mustaches, Distinguished Monocle (`$50K`), Gold & Platinum Chains, 3 silk neckties (including *Saul Yellow*), French Beret (`$10K`), 3 top hats, 5 knit shirts, the meta-unlocked **Skeleton T-Rex Costume** (unlocks upon owning all 9 base cosmetics), and 3 secret **Cat Skeleton** suits.
  - **Conformal Ellipsoid Fitting (`catCosmeticsData.ts`):** Ray-ellipsoid and dorsal meridian surface sampling (`CAT_COSMETIC_CLEARANCE = 0.028`) ensures shirts, chains, and skeletal ribs conform cleanly around every cat's unique `CatFitProfile` (from tiny *Gigi* to chubby *Lilo* and huge *Kicks*) without clipping into fur.

### 1990 Mazda Miata MX-5 & Garage Garden Lounge
- A detailed low-poly **Classic Red 1990 Mazda Miata MX-5** sits prominently outside on the storefront curb on the Title Screen and early game—and showcases inside the garage bay (`MIATA_BAY`) as your cafe grows, complete with showroom turntable lighting upgrades.
- **Sidewalk & Obstacle Steering (`sidewalkAvoidance.ts`):** Title Screen and outdoor pedestrians dynamically detect AABB envelopes around cedar planters, urban streetlamp poles, Mt. Everest deep snowbanks, and the parked Miata—routing smoothly around the curbside without walking through the car.

### Progression, Upgrades & Customization
- **Golden Espresso Machine:** Automatically unlocked at `$50,000` lifetime gross income, **doubling (`2x`) all drink sale revenue** and unlocking *Tisay*, *Gold Chain*, and *Platinum Chain*.
- **Business Upgrades (10):** Equipment, acoustics, botanicals, and hospitality upgrades (from Titanium Conical Burr Grinder to Specialty Coffee & Tea Guild Medallion) adding `+$1` to `+$12` tips and queue patience boosts.
- **Equipment Skins (10):** Espresso machine chassis (`Classic Steel`, `Matte Obsidian`, `Vintage Copper`, `Golden Espresso`), grinders (`Matte Black`, `Cyber Chrome`, `Heritage Brass`), and frothing pitchers (`Stainless Steel`, `Rose Gold`, `Titanium Pearl`).
- **6 Architectural Interior Themes:** *Garage Garden* (starter), *Botanical Greenhouse* ($180), *Midnight Vinyl Lounge* ($240), *Industrial Loft Brick* ($260), *Parisian Brass Bistro* ($290), and *Kyoto Timber & Lanterns* ($320)—complete with theme-specific lighting, wall plaster palettes, hanging ferns, Edison bulbs, shoji screens, and marble/brass fixtures, plus customizable counter woods, mug glazes, neon sign colors, and plant density.
- **6 Customer Skin Packs & 6 Weather-Reactive Patron Outfit Packs:** Including *Filipino*, *Brazilian*, *Ancient Japanese*, *French* (summer Breton/beret ↔ winter peacoat/scarf), *Swiss* (summer vest ↔ winter puffer/beanie), and *Hiker* (winter/snow-only mountaineering parka).
- **Daily Quotas, Daily Login Streaks & Export/Import Saves:** 7-tier playtime/order login rewards, local calendar-based daily cup quotas, and JSON save export/import.

### 9 Sceneries, Dynamic Climate & Outdoor Overlooks
| # | Scenery | Framing / Inspiration | Unlock | Climate & Special Effects |
|---|---------|-----------------------|--------|---------------------------|
| 1 | **The Busy Street** | Urban Garage Lane | Default | Clear / Rain |
| 2 | **Mayon Volcano View** | Inspired by Mayon & Cagsawa, Bicol | $2,000 | Clear / Rain · Scenic Overlook |
| 3 | **Hilltop City Lights** | Inspired by Tagaytay & Baguio Ridges | $4,000 | Clear / Rain · Highland Mist · Overlook |
| 4 | **Japanese Tranquility** | Inspired by Historic Kyoto | $6,500 | Clear / Rain · Sakura Petals & Fireflies |
| 5 | **Brazilian Favela** | Inspired by Rio de Janeiro | $9,500 | Clear / Rain · Compact ~32-step hillside stairs with step-synced NPC climb |
| 6 | **Cyberpunk Neon** | New Vision City | $14,000 | Clear / Rain · Angled Neon Rain |
| 7 | **Eiffel Tower View** | Inspired by Paris & Montmartre | $22,000 | Clear / Rain / **Snow** · Overlook |
| 8 | **Switzerland Hilltop** | Inspired by the Swiss Alps | $35,000 Revenue | Clear / Rain / **Snow** · Live Alpine Funicular · Overlook |
| 9 | **Mt. Everest & Hiker Trail** | Inspired by the Himalayas & Everest | $65,000 Revenue | **Always Winter (Snow)** · Prayer Flags · Cleared Trail · Overlook |

- **Real-Time & Manual Time-of-Day:** Supports `auto` (syncs to device local clock across `dawn`, `morning`, `noon`, `golden`, `night`) or manual lock, plus `auto` / `clear` / `rain` / `snow` weather overrides clamped safely per scenery.
- **Step Outside Overlook Mode:** Leave the counter to stand on the **Cafe Porch**, walk to the **Scenic Overlook** (calibrated per-biome—such as cliffside valley rails), or **Look Back** toward the cafe facade and parked Miata.

### Unified Audio & Procedural Sound Engine
- **3-Mode Audio Deck (`MusicPlayerController.ts`):**
  1. **`vinyl` (Offline Ready):** Built-in cozy lo-fi presets (*Garage Garden Morning Roast*, *Rainy Window Espresso Jazz*, *Golden Hour Monstera Acoustic*), Bring-Your-Own-Vinyl local audio file loading via `URL.createObjectURL`, 33/45 RPM turntable spin physics, and optional analog vinyl crackle.
  2. **`radio` (Live Two-Layer Streams):** Curated PH FM & Cafe Lo-Fi/Jazz streams paired with searchable Radio Browser API directory stations (`ALL` / `PH` / `US`).
  3. **`external` (Spotify & Native Media Bridge):** Web/PWA Spotify Embed Deck + OAuth 2.0 PKCE Web Playback SDK integration, browser tab audio meter capture, and Android native `spotify:` / `intent://` deep-linking.
- **Offline Granular Weather & Barista Synth (`sound.ts`):** Pre-bakes PCM `AudioBuffer` assets at runtime with zero external audio files required, driving polyrhythmic granular roof/skylight raindrops (`rainy*`), nocturnal pentatonic wind chimes (`night`), daytime birds, and step-by-step espresso/steam/ice/pour SFX.

---

## Technologies & Architecture

### Core Web & 3D Stack
- **UI & State:** `React 19`, `TypeScript 7`, `Tailwind CSS v4` (`@tailwindcss/vite`), `Lucide React`, `Motion` (`motion/react`)
- **3D Graphics:** `Three.js 0.187` procedural low-poly geometry, custom procedural canvas textures, dynamic hemisphere/directional/point lighting rigs, instanced weather particles, skeletal/rigged procedural NPCs, cats, vehicles, and `ThumbnailStudio` offscreen preview rendering
- **Build & Tooling:** `Vite 8` (`base: './'` for portable web, subpath, and Capacitor `file://` asset loading), `tsx`, `esbuild`, `Sharp` (icon generation), optional Express runtime dependency

### Mobile, iOS Safari & PWA Engineering
- **PWA (`public/manifest.json`, `public/sw.js`):** Fullscreen/standalone manifest (`landscape`), version-synced cache (`klasik-3d-v2.5.0`), offline shell caching, and install modal (`PwaApkModal.tsx`).
- **iOS Safari Full-Bleed Viewport Engine (`src/game/iosViewport.ts`):**
  - Prioritizes `window.visualViewport` (`width`, `height`, `offsetTop`, `offsetLeft`) over `window.innerHeight` so dynamic iOS Safari address/bottom toolbars never clip or oversize the 3D canvas.
  - Automatically rotates portrait views 90° into a landscape stage (`isPortraitRotated`) while accurately remapping touch/pointer coordinates into WebGL NDC space (`mapPointerToViewportNdc`).
  - Applies safe-area HUD insets (`hud-safe-frame`) for iPhone notch/Dynamic Island/Home Indicator and dynamically adapts camera vertical FOV (`computeAdaptiveCameraFov`) for both 4:3 iPads and ultrawide iPhones.
- **Haptics (`src/game/haptics.ts`):** Tactile feedback patterns via the Web Vibration API on supported mobile browsers and Android WebViews.

### Android APK Build, Versioning & Keystore Signing
- **Single-Source App Versioning (`/app-version.json` & `/src/game/appVersion.ts`):**
  - Canonical fields: `versionName` (`"2.5.0"`), `versionCode` (`250`), `applicationId` (`"com.boostedbycaffeine.klasik3d"`), `releaseChannel`, and `swCacheName`.
  - Synchronized across in-game UI badges, PWA service worker, `package.json`, `twa-manifest.json`, Capacitor configuration, and Android Gradle builds.
- **Automated Capacitor Patcher (`scripts/patch-android-capacitor.mjs`):**
  - Runs after `npx cap add android` to configure `android/app/build.gradle` with the exact `applicationId`, `versionCode`, `versionName`, and `signingConfigs.release` reading `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`.
- **GitHub Actions CI/CD (`.github/workflows/android-apk.yml`):**
  - Builds the offline Vite bundle (`VITE_APP_PLATFORM=apk`), generates Android app icons (`scripts/generate-icons.mjs`), validates Android XML manifests, decodes `secrets.ANDROID_KEYSTORE_BASE64` when configured to produce a persistently signed `assembleRelease` APK (falling back to `assembleDebug` with a warning if secrets aren't configured yet), and uploads both `Klasik3D.apk` and `Klasik3D-v<version>.apk`.
  - Because `applicationId` and the release signing certificate remain identical across releases while `versionCode` increments, Android updates the installed APK **in place without uninstalling or losing local save data**.

### Testing & Verification
- **Deterministic Node Unit Tests (`tsx --test`):** Pure-logic modules (`rules.ts`, `sceneryData.ts`, `catCosmeticsData.ts`, `onboarding.ts`, `baristaChoreography.ts`, `sidewalkAvoidance.ts`, `iosViewport.ts`, `appVersion.ts`, `npcPhysicsAndSteering.ts`, `doorwayTraffic.ts`, and biome modules) have zero DOM/Three.js coupling and are verified by **106+ automated unit tests** across:
  - `src/game/rules.test.ts`
  - `src/game/baristaChoreography.test.ts`
  - `src/game/worldAndCafePolish.test.ts`
  - `src/game/sceneries/*.test.ts`
- **Browser & Visual Verification:** Headless Chromium / Playwright checks validate live WebGL rendering, HUD layouts, tutorial flow, Developer Note modal, and zero-console-error execution.

---

## Project Structure

```text
├── app-version.json                 # Single source of truth for versionName, versionCode & applicationId
├── capacitor.config.json            # Capacitor Android app configuration
├── twa-manifest.json                # Trusted Web Activity manifest metadata
├── metadata.json                    # App title, description & capabilities metadata
├── .github/workflows/
│   └── android-apk.yml              # Automated versioned & signed Android APK build workflow
├── scripts/
│   ├── generate-icons.mjs           # Generates web, PWA, Apple touch & Android mipmap icons
│   └── patch-android-capacitor.mjs  # Injects app-version.json & release signing into Android Gradle
├── public/
│   ├── manifest.json                # PWA web app manifest (fullscreen landscape)
│   └── sw.js                        # Offline service worker synced to app version
└── src/
    ├── App.tsx                      # Root orchestration, station switching, onboarding & viewport sync
    ├── components/                  # HUD, Title Screen, Developer Note, Tutorial Coach, Modals & Overlays
    ├── pwa/                         # PWA installation & platform detection manager
    └── game/
        ├── rules.ts                 # Core state machine, 16 recipes, upgrades, skins, cats & quotas
        ├── appVersion.ts            # Shared version helpers & in-place APK upgrade validation
        ├── onboarding.ts            # First-launch Dev Note persistence & dynamic 6-step tutorial resolver
        ├── scene3d.ts               # Main Three.js cafe world, lighting, NPCs, Miata & stations
        ├── baristaChoreography.ts   # C1-continuous camera, milk pouring & tea steeping kinematics
        ├── sceneryData.ts           # 9 sceneries, climate rules, patron outfits & Secret NPC specs
        ├── sceneries/               # Modular 3D biome builders & per-scenery tests
        ├── catCosmeticsData.ts      # 25 cosmetics & ray-ellipsoid fur-clearance math
        ├── catCosmetics3d.ts        # Procedural 3D cat accessory & skeleton suit meshes
        ├── interiorDecorThemes3d.ts # 6 full architectural interior 3D theme builders
        ├── iosViewport.ts           # iOS Safari visualViewport, portrait rotation & adaptive FOV math
        ├── sidewalkAvoidance.ts     # Exterior AABB obstacle avoidance (Miata, lamps, planters, snow)
        ├── OutdoorOverlookController.ts # Porch / Overlook / Look Back outdoor camera system
        ├── sound.ts                 # Pre-baked PCM & granular Web Audio synthesizer
        ├── spotifyManager.ts        # 3D Vinyl deck & Spotify Web/PKCE/Native bridge
        └── audio/                   # Unified 3-mode MusicPlayerController & counter props
```

---

## Local Development & Build Commands

### Prerequisites
- **Node.js 20+** (Node 22 used in CI)
- **npm**

### Commands
```bash
# Install dependencies
npm install

# Start development server on http://localhost:3000
npm run dev

# Type-check with TypeScript
npm run lint

# Build production bundle into dist/
npm run build

# Run full unit test suite (106+ tests)
npx tsx --test src/game/rules.test.ts src/game/baristaChoreography.test.ts src/game/worldAndCafePolish.test.ts src/game/sceneries/*.test.ts

# Validate Android Capacitor patch script syntax
node --check scripts/patch-android-capacitor.mjs
```

### Releasing an In-Place Android APK Update
1. Generate a persistent `.keystore` once (a ready-to-copy `keytool` command is available directly inside the in-game **Install APK** modal) and store `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` in your GitHub repository Secrets.
2. Increment `versionName`, `versionCode`, and `swCacheName` in `app-version.json` (and mirror `version` / `appVersionName` / `appVersionCode` in `package.json`, `twa-manifest.json`, and `public/sw.js`).
3. Push to `main` (or trigger **Build Klasik 3D Android APK** manually in GitHub Actions) to build a signed `Klasik3D-v<version>.apk` that upgrades cleanly over previous installations without uninstalling.

---

Made with love by **BoostedByCaffeine Studios**.
