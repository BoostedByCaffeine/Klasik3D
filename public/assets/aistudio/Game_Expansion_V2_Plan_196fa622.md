# Klasik 3D — Game Expansion V2: Real-Time Owner Loop, Pastries, Delivery Riders, Polished Cats & Medium GFX

This phased engineering specification addresses all reported bugs, asset optimizations, real-time 24-hour mechanics, and major gameplay expansions for **`Klasik3D`** across `src/game/rules.ts`, `src/game/scene3d.ts`, `src/game/sound.ts`, `src/App.tsx`, `src/components/TitleScreen.tsx`, `src/components/HudOverlay.tsx`, `src/components/CustomizeModal.tsx`, `src/components/BizUpgradesModal.tsx`, `src/components/DailyGoalProgressBar.tsx`, `src/index.css`, and `src/game/rules.test.ts`.

> **Preservation Rule:** Preserve all existing core systems—Stations (Espresso, Tea & Milk, Serve, Vinyl), 3D Vinyl Spotify turntable, 1990 Mazda Miata MX-5 showroom rig, Recipe Book POS terminal + minimizable Pinned Recipe HUD, Mood Meter (100 → 0, 1–2 min) + Barista Order Acceptance Queueing, all 9 unlockable Cafe Cats (Champy, Chimny, Chunky, Kicks, Cheeto, Katkat, Luna, Mikmik, Lilo + passives), Hidden 7-Cookie Jar cheat, real `.wav` audio files in `public/assets/aistudio/`, and the Crema Ring splash screen.

---

## Master Issue & Expansion Matrix

| Phase | Feature / Bug Addressed | Core Engineering Solution | Target Files |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Real-Time 24-Hour Owner Loop & Login Rewards** | Rename `Start Shift` → `Enter Store`; replace 5-min shift timeout with a real-time 24-hour daily quota (`35 cups/day`, resets at local midnight) and strict 24-hour real-calendar Daily Login Rewards. | `src/game/rules.ts`, `src/components/TitleScreen.tsx`, `src/components/HudOverlay.tsx`, `src/components/DailyGoalProgressBar.tsx`, `src/components/StatusModal.tsx`, `src/App.tsx` |
| **Phase 2** | **Device-Clock Time Realism (`Dawn`, `Morning`, `Noon`, `Golden`, `Night`) & Random Rain** | Auto-sync lighting to local device clock; add **Dawn** (reversed golden-rose light, no visible sun disc) & **Noon** (bright overhead daylight); decouple random/toggleable **Rain** across every time period. | `src/game/rules.ts`, `src/game/scene3d.ts`, `src/components/TitleScreen.tsx`, `src/components/CustomizeModal.tsx`, `src/App.tsx` |
| **Phase 3** | **Medium Graphics Tier (`LOW` / `MED` / `MAX`)** | Add calibrated `medium` tier between `low` and `max` for mid-tier phones (1.35x pixel ratio, balanced pools, 512px textures, crisp 10px glass blur) while keeping `low` as first-boot default. | `src/App.tsx`, `src/game/scene3d.ts`, `src/components/TitleScreen.tsx`, `src/components/HudOverlay.tsx`, `src/index.css` |
| **Phase 4** | **Barista Fixes: Realism Serve, Pull-Shot Cooldown Sync & Counter Spacing** | Add Serve button + glowing 3D cup click-to-serve in Realism Mode; prevent cup advancing after Pull-Shot animation until cooldown finishes; unstick Rinser from Espresso Machine with clean bar spacing. | `src/game/scene3d.ts`, `src/components/HudOverlay.tsx`, `src/App.tsx`, `src/game/rules.ts` |
| **Phase 5** | **Rinsing & Trash Disposal Animations** | Flip reusable Hot Mugs & Iced Glasses **upside down** on the rinser with a pressurized water jet; arc disposable Takeout Cups into a new stainless **Barista Trash Chute** instead of rinsing them. | `src/game/scene3d.ts`, `src/game/sound.ts`, `src/game/rules.ts` |
| **Phase 6** | **Pastries Expansion & New Pastry Station** | Overhaul Pastry Display Case; add **Pastry Station** before Orders (`Pastries → Orders → Espresso → Tea & Milk → Serve → Vinyl`), reusing the old Orders camera for Pastries and sharing Serve-like framing for Orders; add **Daisy Donut**, **Miata Cake**, and **Croissant** (decoupled from coffee step algorithm) with dine-in mini plate, takeout kraft paper bag, and two-handed customer carry animation. | `src/game/rules.ts`, `src/game/scene3d.ts`, `src/components/HudOverlay.tsx`, `src/App.tsx`, `src/game/sound.ts` |
| **Phase 7** | **Delivery Rider NPC (Blue, Green, Red) + Parked Scooter** | Rare takeout-only NPC (1 at a time) always ordering Coffee + Pastry; arrives on a matching color-coded **3D Delivery Scooter**, parks cleanly outside clear of the door, collects order, loads delivery box, and rides away. | `src/game/rules.ts`, `src/game/scene3d.ts`, `src/components/HudOverlay.tsx` |
| **Phase 8** | **Cat Asset Polish (No Clay Patches) & Patron Outfit Optimization** | Replace lumpy clay-like cat patches with smooth procedural fur `CanvasTexture`s + refined feline geometry & fluid head/body turning to greet customers; fix weird Botanical Painter beret/hat and optimize all patron outfits. | `src/game/scene3d.ts` |

---

## PHASE 1: Real-Time 24-Hour Owner Loop & Strict 24-Hour Daily Login Rewards

### 1.1 Replace "Start Shift" with "Enter Store" & 24-Hour Real-Time Quota (`src/game/rules.ts`, `src/components/TitleScreen.tsx`)
1. **Title Screen CTA Update (`src/components/TitleScreen.tsx`):**
   - Replace the primary button text **`Start Shift (Day X)`** with **`Enter Store`** (e.g. `▶ Enter Store` with subtitle/badge showing today's real-time quota progress `X / 35 Cups Today`).
   - Keep `Zen Mode (Endless)` available for pure sandbox play.
2. **Real-Time 24-Hour Daily Quota (`src/game/rules.ts`):**
   - Remove the stressful 5-minute shift countdown timer that forcibly ends the round and makes 35 cups unrealistic.
   - Track daily owner progress keyed to the device's local calendar date (`getLocalDateKey(now)` → `'YYYY-MM-DD'`):
     ```ts
     export interface DailyQuotaState {
       dateKey: string;            // Local calendar date 'YYYY-MM-DD'
       cupsServedToday: number;    // Resets to 0 automatically when dateKey changes (every 24h at midnight)
       dailyCupQuota: number;      // Default: 35 cups per 24-hour day
       quotaBonusClaimed: boolean; // True once 35/35 daily owner bonus ($120) is awarded today
     }
     ```
   - On boot, save load, and on a lightweight 30-second real-time clock check in `App.tsx`, compare `getLocalDateKey(new Date()) !== state.dailyQuota.dateKey`. When midnight passes (new 24-hour day), reset `cupsServedToday = 0`, `quotaBonusClaimed = false`, and update `dateKey`.
   - Reaching `35 / 35` cups celebrates the owner with a `$120 Daily Quota Bonus` toast and golden badge, while letting the player keep running their shop continuously without interrupting gameplay.
   - Replace the old `4:55` countdown timer in the top HUD bar (`HudOverlay.tsx`) with the **live real-time device clock** (`10:24 PM`) and **`X / 35 Daily Cups`** progress bar.

### 1.2 Strict Real-Time 24-Hour Daily Login Rewards (`src/game/rules.ts`, `src/components/StatusModal.tsx`)
- Decouple Daily Login Rewards completely from in-game shift counters.
- Persist real-world login tracking in `GameState` & `localStorage`:
  ```ts
  export interface DailyLoginState {
    lastClaimDateKey: string | null;   // 'YYYY-MM-DD' of last claimed reward
    lastClaimTimestamp: number | null; // Epoch ms of last claim
    streakDay: number;                 // 1..7 repeating weekly streak
    claimedToday: boolean;             // True if lastClaimDateKey === getLocalDateKey()
  }
  ```
- **Strict Enforcement Rules:**
  - `canClaimLoginReward(state, now)` returns `true` **only** when `lastClaimDateKey !== getLocalDateKey(now)` (and at least a new local calendar day / 24h cycle has rolled over).
  - If the user claims on consecutive calendar days (`diffDays === 1`), advance `streakDay = (streakDay % 7) + 1`. If they skip a day (`diffDays > 1`), gracefully reset or hold streak day 1.
  - Once claimed today, lock the button and display a real-time countdown until local midnight (`"Next reward in 06h 14m"`).

---

## PHASE 2: Real-Time Device Clock Sync, Dawn & Noon Modes & Random Rain Variants

### 2.1 Expanded Time-of-Day & Independent Rain Model (`src/game/rules.ts`)
Separate **Time of Day** from **Rain Weather** so every time of day can be clear or rainy, and default to syncing with the player's device clock:
```ts
export type TimeOfDayMode = 'auto' | 'dawn' | 'morning' | 'noon' | 'golden' | 'night';
export type ResolvedTimeOfDay = 'dawn' | 'morning' | 'noon' | 'golden' | 'night';
export type RainPreference = 'auto' | 'clear' | 'rain';
```

- **Device Clock Mapping (`resolveDeviceTimeOfDay(date = new Date())`):**
  - **Dawn:** `05:00 – 06:29`
  - **Morning:** `06:30 – 10:59`
  - **Noon:** `11:00 – 15:29`
  - **Golden Hour:** `15:30 – 18:29`
  - **Night:** `18:30 – 04:59`
- **Random Rain Variant (`RainPreference === 'auto'`):**
  - On store entry and every ~8 real minutes of play (when set to `Auto`), roll a **~28% chance of rain** for whichever Time of Day is active (producing **Rainy Dawn**, **Rainy Morning**, **Rainy Noon**, **Rainy Golden Hour**, or **Rainy Night**).
  - Players always retain full manual control in `TitleScreen.tsx` and `CustomizeModal.tsx` to pick `Auto (Device Time)` or manually lock any Time (`Dawn`, `Morning`, `Noon`, `Golden Hour`, `Night`) + Weather (`Auto Rain`, `Clear`, `Rain`).

### 2.2 Distinct 3D Lighting & Sky Shaders (`src/game/scene3d.ts`)
1. **Dawn (`dawn`):**
   - Warm peach-amber & muted lavender-indigo sky gradient (`zenith: #1f2a4c`, `mid: #9a5b6a`, `horizon: #f3a668`).
   - **No visible sun disc** (`sunDiscOpacity = 0.0`).
   - **Reversed directional light angle** compared to Golden Hour (`sunPos.set(+12, 4.4, -13)` shining gently from the opposite/east direction), casting soft reverse golden-pink volumetric shafts and subtle morning dew coolness in interior shadows. Streetlamps stay softly dimmed/flickering off.
2. **Morning (`morning`):**
   - Crisp pastel blue-to-cream sky (`#4a90d9` → `#a8d5f7` → `#fff6e5`), refreshing angled morning sun, bright natural cafe interior.
3. **Noon (`noon`):**
   - High-elevation overhead bright sunlight (`sunPos.set(1.5, 16.5, -6.0)`, crisp pure warm-white `#fffdf5`, intensity `2.35`), clear vibrant sky zenith (`#2563eb` → `#60a5fa` → `#e0f2fe`), bright sunlit outdoor street, crisp overhead skylight brightness inside the garage cafe, streetlamps completely off.
4. **Golden Hour (`golden`):**
   - Low-angle western sun (`sunPos.set(-12, 4.6, -14)`), **visible glowing honey-gold sun disc** low on the horizon, warm diagonal additive volumetric god rays streaming across the espresso bar and Miata hood.
5. **Night (`night`):**
   - Deep midnight starry sky, glowing lit city building windows, working streetlamps with additive warm light cones, bright passing car headlights, and cozy interior pendant lights.
6. **Universal Rain Layer (Works with ALL 5 Times):**
   - Whenever `isRaining === true`, activate outdoor-only GPU falling rain (`z < -6.35`), wet reflective asphalt, scrolling glass raindrop streaks, ambient rain audio, and **auto-deploy umbrellas** on all outdoor pedestrians and entering/exiting customers (with rain tint adapted to Dawn/Noon/Golden/Night lighting!).

---

## PHASE 3: Calibrated `Medium` Graphics Preset (`LOW` / `MED` / `MAX`)

Add a true middle tier so mid-range mobile devices get crisp lighting, shadows, and glassmorphism without dropping frames:

| Setting | `GFX: LOW` *(First-Boot Default)* | `GFX: MED` *(New Mid-Tier)* | `GFX: MAX` *(Flagship / Desktop)* |
| :--- | :--- | :--- | :--- |
| **Pixel Ratio** | `Math.min(dpr, 0.9)` | `Math.min(dpr, 1.35)` | `Math.min(dpr, 2.0)` |
| **Antialiasing** | `false` | `true` | `true` |
| **Shadow Maps** | Disabled (contact discs) | Soft `1024×1024` PCF (`Basic/PCF`) | High-Res `2048×2048` `PCFSoftShadowMap` |
| **Procedural Texture Size** | `256px` | `512px` | `1024px` |
| **HUD Glassmorphism** | Lightweight `blur(6px)` | Smooth `blur(11px)` | Rich `blur(16px) saturate(145%)` |
| **Outdoor NPC / Car Pool** | `2` NPCs / `2` cars | `4` NPCs / `4` cars | `6` NPCs / `6` cars |
| **GPU Rain / God-Ray Quads** | `180` drops / `3` shafts | `420` drops / `4` shafts | `850` drops / `6` shafts |

- Update the GFX cycle button on `TitleScreen.tsx` and Menu from `LOW ↔ MAX` to **`LOW → MED → MAX`**, and set `[data-gfx="low" | "medium" | "max"]` on `document.documentElement`. First-time installs still default strictly to `'low'`.

---

## PHASE 4: Realism Mode Serve Fix, Pull-Shot Cooldown Sync & Bar Spacing

### 4.1 Realism Mode Serve Button & Glowing Ready Cup (`src/components/HudOverlay.tsx`, `src/game/scene3d.ts`, `src/App.tsx`)
- **Why it broke:** Realism Mode hides the bottom shortcut toolbar, leaving players with no button to hand off the completed cup at Station Serve.
- **Fix:**
  1. **Realism Mode Serve Button:** Whenever the player is at the **Serve** station (or an accepted order's drink/pastry is complete and ready to deliver), render a sleek, compact floating glass **`Serve Order`** button even when `realismMode === true`!
  2. **Glowing Ready Cup & Plate/Bag in 3D (`scene3d.ts`):** When a crafted cup (and/or pastry plate/bag) sits on the Serving Coaster and satisfies the active order, enable a pulsing golden-emerald **emissive rim halo + subtle upward glow ring** around the serving coaster/cup and register the serving cup as a clickable/tappable 3D interactable (`interactType: 'serve-ready-cup'`) so players in Realism Mode can **tap the glowing cup directly** OR tap the Serve button!

### 4.2 Fix Pull-Shot Premature Cup Advance (`src/game/scene3d.ts` & `src/App.tsx`)
- **Root Cause:** The 3D espresso pour animation finishes slightly earlier (e.g. `1.4s`) than the authoritative `activeStepLock` cooldown (`2.2s`), triggering the cup to slide/advance to the next station while the cooldown progress bar is still running.
- **Fix:**
  - Never let a visual animation completion timer move the cup to the next station!
  - During `pull-shot`, keep the cup locked solidly on the espresso drip tray (`cupStationOverride = 'espresso'`) for the **entire duration** of `activeStepLock`. If the liquid stream finishes `200ms` before the cooldown ends, show a realistic final golden crema drip & settling steam while seated on the drip tray.
  - Advance/glide the cup to the next station **only after** `activeStepLock` reaches `100%` and commits the `shotPulled = true` state transition.

### 4.3 Clean Countertop Asset Re-Organization (Fix Rinser Sticking into Espresso Machine) (`src/game/scene3d.ts`)
Re-layout the bar countertop X-coordinates cleanly from left to right with guaranteed `>= 0.14m` breathing clearance between every machine so **nothing overlaps or clips**:
1. **Left Cat Wing (`x = -2.85` to `-1.90`):** Cat cushion + **Champy/Equipped Cat** (`x = -2.58`), Brass Nameplate (`x = -2.58, z = 0.44`), 7-Cookie Jar (`x = -2.14, z = 0.22`).
2. **POS Register (`x = -1.58`):** Recipe Book POS Terminal angled gently toward barista.
3. **Overhauled Pastry Display Case (`x = -0.92`):** Clear glass bakery box showcasing Daisy Donut, Miata Cake, and Croissant (dedicated **Pastry Station** focal point!).
4. **Serve / Pickup Pad (`x = -0.25`):** Warm brass/walnut serving coaster + mini pastry plate / kraft bag staging zone + service bell (`x = -0.48`).
5. **Knock Box (`x = +0.24`) & Burr Grinder (`x = +0.58`) & Tamp Mat (`x = +0.92`):** Cleanly separated prep cluster.
6. **Commercial Espresso Machine (`x = +1.48`, width `~0.68m` → spans `+1.14` to `+1.82`):** Centerpiece dual-group machine.
7. **Countertop Pitcher/Cup Rinser (`x = +2.06`) & Recessed Stainless Trash Chute (`x = +2.32`):** Shifted `+0.24m` clear of the Espresso Machine's right flank so the rinser never touches or sticks into the espresso body!
8. **Tea, Ice & 3 Syrup Bottles (`x = +2.68` to `+3.32`):** Teapot, ice bucket, milk pitcher, and Vanilla/Caramel/Mocha pumps with unobstructed clearance.
9. **Vinyl Turntable (`x = +3.78`):** Clean audiophile corner on the right end of the bar.

---

## PHASE 5: Realistic Upside-Down Rinsing & Takeout Cup Trash Disposal (`src/game/scene3d.ts`, `src/game/sound.ts`)

Upgrade `triggerRinseCup()` into a vessel-aware physical animation (`~700ms`):

1. **Reusable Vessels (`hot-mug` & `iced-glass`):**
   - Glide the mug or iced glass over the **Countertop Rinser** (`x = +2.06, z = 0.22`).
   - **Invert Upside Down:** Smoothly rotate `vessel.rotation.x = Math.PI` (rim facing straight down onto the star rinser actuator) and press downward by `-0.018m`.
   - **Pressurized Water Spray Jet:** Fire a vertical translucent cyan-white water spray cone + 8 splash mist particles shooting upward inside the inverted cup, paired with a crisp pressurized rinser hiss SFX (`sound.playGlassRinserSpray()`).
   - Lift, flip smoothly upright (`rotation.x → 0`), and return sparkling clean to the brew tray.

2. **Disposable Takeout Vessels (`hot-takeout` & `iced-takeout`):**
   - **Trash Disposal Animation (Never Rinse Disposable Cups):**
     - Build a recessed brushed-stainless **Barista Trash Chute** with a hinged swing flap right beside the rinser (`x = +2.32, z = 0.28`, subtle trash icon decal on the rim).
     - When discarding/rinsing a takeout cup, animate the paper/plastic takeout cup lifting in a clean parabolic arc into the trash chute, push the stainless flap open (`rotation.x = -0.85`), play a soft paper-cup trash drop SFX (`sound.playTrashDrop()`), hide the discarded cup, close the flap, and spawn a fresh clean takeout cup on the prep coaster!

---

## PHASE 6: Pastries Product Expansion & New Pastry Station

### 6.1 Station Order & Space-Saving Camera Reuse (`src/game/rules.ts`, `src/game/scene3d.ts`)
Update the station sequence so **Pastries** sits first without bloating counter geometry:
- **New Station Order:** `1. Pastries` → `2. Orders` → `3. Espresso` → `4. Tea & Milk` → `5. Serve` → `6. Vinyl`
- **Smart Camera Angle Mapping:**
  - **`Pastries` Station:** Inherits and refines the **old Orders camera angle**, zooming smoothly onto the overhauled **3D Glass Pastry Display Case** (`x = -0.92`) so all 3 pastries are crisp, large, and effortless to tap on mobile.
  - **`Orders` Station:** Adopts a clean front-counter framing **similar to the `Serve` station** (framing the POS screen, hanging glowing order tickets, service counter, and customer queue cleanly together).

### 6.2 Overhauled 3D Pastry Display Case & 3 Signature Pastries (`src/game/scene3d.ts`, `src/game/rules.ts`)
```ts
export type PastryId = 'daisy-donut' | 'miata-cake' | 'croissant';
```
Build an artisanal **Walnut & Beveled Curved-Glass Bakery Display Case** (`x = -0.92, y = 1.00, z = 0.14`) with warm golden interior bakery LED lighting, brass shelf brackets, and 3 distinct sculpted low-poly pastries on individual parchment trays:

1. **Daisy Donut (`daisy-donut`, `+$4`):**
   - Plump white Bavarian-glazed round donut (`TorusGeometry` / flattened brioche dome in creamy icing white `#fffdf7` with subtle petal-scallop ring) topped with a **sunny golden-yellow Bavarian cream center (`#facc15`)** resembling a blooming daisy.
2. **Miata Cake (`miata-cake`, `+$5`):**
   - Iconic triangular **crimson-red velvet / strawberry cake slice** (`ExtrudeGeometry` wedge in rich Miata Classic Red `#dc2626`) showing layered white cream frosting lines along the cut side, glossy berry top glaze, and a neat white cream dollop + tiny berry crown.
3. **Croissant (`croissant`, `+$4`):**
   - Classic curved flaky golden-butter **croissant** (5 overlapping tapered golden-brown crescent segments in `#d97706` / `#b45309` with warm baked highlights).

### 6.3 Randomized Pastry Orders & Decoupled Parallel Preparation (`src/game/rules.ts`, `src/game/scene3d.ts`, `src/components/HudOverlay.tsx`)
1. **Randomized Order Attachment:**
   - Regular customers randomly have a **~40% chance** to add **1 pastry** (`daisy-donut`, `miata-cake`, or `croissant`) alongside their coffee (`requestedPastry: PastryId | null`). Customers never order more than 1 pastry.
   - **Delivery Riders** *always* order both **1 Coffee/Drink + 1 Pastry**.
2. **Completely Decoupled from Coffee-Making Steps (CRITICAL RULE):**
   - Store `preparedPastry: PastryId | null` on `GameState` **completely independently** of `activeCup` (`ground`, `tamped`, `shotPulled`, `steamed`, `syrup`, `iced`, etc.).
   - Grabbing a pastry **never** resets, blocks, or invalidates an in-progress coffee cup, and brewing/tamping/pulling coffee **never** clears `preparedPastry`.
   - The player can freely:
     - Grab the pastry **first**, then make the coffee; OR
     - Make the coffee **first**, then grab the pastry; OR
     - Grab the pastry **mid-brew** while waiting between espresso steps — with **zero** forced cup rinsing!
   - When the customer's order includes a pastry, `Serve` unlocks once **both** the coffee matches AND `preparedPastry === order.requestedPastry` (with clear separate badges on the HUD: `☕ Coffee: Ready ✓` and `🥐 Pastry: Miata Cake`).
3. **Glowing Pastry Tap / Shortcut & Plating / Bagging Animation:**
   - When the active accepted order requests a pastry (and it hasn't been plated yet), the matching pastry inside the glass case **glows with a pulsing golden outline/halo** (and the bottom quick button at the Pastry Station highlights `🥐 Plate Daisy Donut` / `🛍️ Bag Miata Cake`).
   - Tapping/clicking the glowing pastry inside the case (or pressing the shortcut button) plays a crisp pastry-tong chime and smoothly animates the pastry out of the case onto:
     - **Dine-In Order:** A clean **Mini Porcelain Pastry Plate** (`x = -0.10, y = 1.00, z = 0.28`) beside the serving cup coaster, displaying the actual 3D Daisy Donut, Miata Cake, or Croissant on the plate!
     - **Takeout / Delivery Order:** A folded **Kraft Paper Pastry Bag** (stamped with the Klasik Yin-Yang icon) resting upright beside the takeout cup!
4. **Two-Handed Customer Carry Animation (`scene3d.ts`):**
   - When a customer is served **both** coffee and a pastry:
     - **Right hand** carries the Hot Mug / Iced Glass / Takeout Cup in steady carry pose (`rightArm.rotation.x = -0.92`).
     - **Left hand** carries the **Mini Pastry Plate** (for dine-in, held level with `leftArm.rotation.x = -0.88`) OR the **Kraft Paper Pastry Bag** (for takeout/delivery, held naturally at their side/front with gentle stride swing!).
   - When a dine-in customer sits down at their bistro table, place **both** their coffee cup and their mini pastry plate neatly on top of the tabletop in front of them!

---

## PHASE 7: New NPC — Delivery Rider (Blue, Green, Red) & Exterior Parked Scooter

### 7.1 Spawning Frequency & Rules (`src/game/rules.ts`)
- Add `isDeliveryRider?: boolean` and `riderVariant?: 'blue' | 'green' | 'red'` to `CustomerOrder`.
- **Controlled Rare Encounter:**
  - Maximum **`1` Delivery Rider** active at any time (never two riders simultaneously).
  - Uncommon encounter rate: **~15% chance** when spawning a new patron, with a strict **minimum cooldown of `3` regular customers** between Delivery Riders so each arrival feels special.
- **Order Rules:**
  - Always **`serviceType: 'takeout'`**.
  - Always orders **1 Drink + 1 Random Pastry** (`requestedPastry !== null`).
  - Grants a **Delivery Partner Bonus (`+$3`)** on top of drink + pastry + mood tip!
  - Displayed with a distinctive color-coded badge on HUD chips & hanging ticket (`🛵 Blue Delivery` / `🛵 Green Delivery` / `🛵 Red Delivery`).

### 7.2 3D Delivery Rider Appearance & Color Variants (`src/game/scene3d.ts`)
Build on top of the full articulated `createCustomerCharacter()` rig:
- **3 Distinct Variants:**
  - **`blue`:** Cobalt jacket (`#2563eb`) with silver reflective chest strips, matching blue open-face scooter helmet with glossy dark tinted flip-visor, large structured **blue insulated square delivery backpack** (`BoxGeometry(0.28, 0.34, 0.20)` mounted on back with reflector trim).
  - **`green`:** Emerald jacket (`#16a34a`), matching green visor helmet, green insulated delivery backpack.
  - **`red`:** Crimson jacket (`#dc2626`), matching red visor helmet, red insulated delivery backpack.

### 7.3 3D Delivery Scooter Arrival, Non-Blocking Curbside Parking & Drive-Away Choreography (`src/game/scene3d.ts`)
1. **Stylized Low-Poly 3D Delivery Scooter (`createDeliveryScooterMesh(variant)`):**
   - Sleek front leg-shield fairing & rounded headlight (glows warm bright at Night/Dawn/Rain!), handlebars with twin mirrors, floorboard, cushioned dark seat, front/rear spinning tires, glowing red taillight, and a rear color-matched **Insulated Delivery Top Box** with a hinged lid!
2. **Dedicated Non-Blocking Curbside Parking Spot:**
   - **Parking Bay Position:** `x = +2.45, z = -7.65` (curbside right of the glass conservatory facade — over **`3.6m` clear of the swinging entrance door at `x = -1.15`** so the scooter **never** blocks the door or sidewalk pedestrians!).
3. **Full Cinematic Lifecycle:**
   - **Stage 1 (`scooter-arriving`):** Rider sits astride the scooter driving in from `x = +16.0` along the near street curb, smoothly decelerates into the parking bay `(2.45, -7.65)`, turns slightly toward the curb, and lowers the kickstand (`scooterEngineSound` fades down cleanly).
   - **Stage 2 (`dismount-and-enter`):** Scooter remains parked outside with hazard/tail glow idling; rider steps off the scooter onto the sidewalk, walks smoothly to the entrance doorway airlock (raising an umbrella if raining? Riders wear helmets & waterproof jackets, keeping their helmet dry without awkward umbrella clipping!), enters through the swinging glass door, and queues normally for their takeout Coffee + Pastry.
   - **Stage 3 (`pickup-and-return`):** Once served (or if mood hits 0), rider carries the takeout cup + kraft paper pastry bag back out through the door to their parked scooter at `(2.45, -7.65)`.
   - **Stage 4 (`load-and-depart`):** Rider pauses `0.6s` at the rear delivery box (top box lid briefly opens & closes to stow the order!), mounts the scooter, revs smoothly, turns onto the street lane, and drives smoothly away to `x = -18.0`, then cleanly recycles the scooter mesh.

---

## PHASE 8: Cat Asset Polish (No Clay Patches) & Customer Patron Outfit Optimization (`src/game/scene3d.ts`)

### 8.1 Overhaul 3D Cat Assets & Fluid Greeting Animations
- **Eliminate "Clay" Look on Patched Cats (`mikmik`, `chimny`, `katkat`, etc.):**
  - **Root Cause:** Overlapping solid-color spheres/ellipsoids stuck onto the cat's head and stomach protrude from the mesh like lumpy clay balls.
  - **Fix — Seamless UV-Mapped Procedural Fur `CanvasTexture`s:**
    - Build a unified, smoothly proportioned cat body mesh (smooth tapered chest, contoured shoulders, sculpted oval feline head with soft muzzle & whiskers, pointed ears with smooth pink-charcoal inner recesses, tucked paw tips, and a smooth 4-segment tapering tail).
    - Render every cat's coat markings directly onto a soft **procedural fur `CanvasTexture`** (`256×256` on Low, `512×512` on Med/Max) with subtle brushed fur-strand micro-noise so every coat looks plush and organic with **zero lumpy clay bumps**:
      - **Chimny:** Soft feathered brown-gray mackerel tabby stripes + forehead "M" marking + ringed tail.
      - **Katkat:** Warm ginger marmalade tabby stripes blending cleanly into a crisp white tuxedo chest bib and white paw mittens.
      - **Mikmik:** Smooth pure-white coat with an organic feathered ginger head patch, **two smooth feathered ginger flank/stomach patches**, and a **pure solid ginger tail**.
      - Keep **Chunky** (pure white, left eye yellow / right eye blue, pink collar), **Cheeto** (warm white, left eye blue / right eye yellow, no collar), **Kicks** (pure white, largest, blue eyes, thin black collar), **Luna** (pure white, slender, blue eyes), **Lilo** (pure white, smallest height & chubby, blue eyes, blue collar), and **Champy** (sleek black, green eyes, teal collar) with matching velvety fur sheen (`roughness: 0.72`).
- **Fluid Animations + Active Customer Greeting:**
  - Use smooth damped spring interpolation (`lerpFactor = 1 - Math.exp(-8 * dt)`) between `sitting`, `sleeping`, `grooming`, `greeting`, and `petted` so joints never snap abruptly.
  - **Active Customer Greeting:** Whenever a new customer (or Delivery Rider) enters through the door or steps up to the counter, smoothly rotate the cat's `headPivot.rotation.y` and `bodyPivot.rotation.y` **toward the customer's live 3D position** (`Math.atan2(dx, dz)` clamped cleanly to natural feline neck/torso range), perk both ears forward, raise the 4-segment tail into a friendly curved greeting hook, and play a soft meow/chirp from the real `.wav` audio bank!

### 8.2 Optimize Customer Patron Outfits (Fix Botanical Painter Hat & Silhouette Polish)
- **Fix Botanical Painter (`botanical-artists`) Beret & Apron:**
  - Replace the awkward floating/misshapen painter hat with a properly contoured **French Artist Beret**:
    - Fitted dark-trim inner headband (`TorusGeometry(0.162, 0.011, 8, 22)`) resting snugly at the hairline (`y = 0.238`) with zero gap.
    - Soft sculpted slightly-tilted wool beret crown (`SphereGeometry(0.188, 18, 12)` scaled `(1.08, 0.42, 1.06)`, tilted gently `rotation.z = 0.16`, `position.set(0.018, 0.285, -0.008)`) in rich artist crimson, olive, or navy wool + a tiny centered wool stem (`CylinderGeometry(0.006, 0.009, 0.028, 6)`) on top.
  - Refine the linen artist smock + snugly fitted wrap-around canvas apron (`radius = torsoRadius + 0.008` so there's zero Z-fighting) with a neat front brush pocket holding 2 tiny colored paintbrush handles.
- **General Patron Outfit Audit (`tokyo-streetwear`, `miata-track-club`, `vinyl-jazz-collectors`, `cyber-neon-night`, `casual-garden`):**
  - Verify every hat crown (Baseball Cap, Knit Beanie, Bucket Hat, Jazz Fedora, Beret, Delivery Helmet) sits flush over the scalp with top hair puff flattened/hidden when wearing a hat so hair never pokes through crowns.
  - Smooth shoulder-to-sleeve joints (add rounded shoulder caps matching sleeve colors) so arms never detach awkwardly during fluid walking or two-handed coffee + pastry carrying.

---

## Verification & Testing Checklist

Update `src/game/rules.test.ts` and verify via `npm run build` and `npm test`:
- [ ] **Real-Time 24h Owner Loop:** Title button reads **`Enter Store`**; 5-min shift timer removed; `35 cups / day` quota persists and resets at local midnight (`YYYY-MM-DD`); Daily Login Rewards strictly enforce once-per-24h real calendar claims.
- [ ] **Time Realism & Rain:** Default lighting matches local device clock; **Dawn** (reversed warm light, no sun disc) and **Noon** (bright overhead sunlight) work cleanly; random rain toggleable and functional across all 5 times of day.
- [ ] **Medium Graphics Preset:** `GFX: LOW → MED → MAX` cycles cleanly; fresh boot defaults to `LOW`; `MED` balances crisp 512px textures, smooth glassmorphism, and mid-tier frame pacing.
- [ ] **Realism Serve & Pull-Shot Sync:** Serve button + glowing clickable 3D cup work seamlessly in Realism Mode; cup waits on the espresso drip tray until the full Pull-Shot cooldown completes before advancing.
- [ ] **Counter Spacing & Rinsing/Trash:** Rinser sits cleanly separated from the Espresso Machine; Hot Mugs & Iced Glasses flip **upside down** with pressurized water spray when rinsed; Takeout Cups arc into the new **Trash Chute**.
- [ ] **Pastries & Pastry Station:** Station order begins with **Pastries** (zoomed into overhauled glass box showing **Daisy Donut**, **Miata Cake**, and **Croissant**); Orders shares Serve-like angle; pastry prep is 100% decoupled from coffee steps (zero forced rinses); dine-in uses mini plate, takeout uses kraft paper bag; customers carry both in two hands.
- [ ] **Delivery Rider & Scooter:** Rare Blue/Green/Red riders arrive on matching scooters, park outside clear of the door, order takeout Coffee + Pastry, load their delivery box, and drive away.
- [ ] **Polished Cats & Outfits:** Patched cats (Mikmik, Chimny, Katkat) use seamless fur textures with zero clay bumps and smoothly turn toward customers to greet them; Botanical Painter beret and all patron outfits fit cleanly with zero clipping.