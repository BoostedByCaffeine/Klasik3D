# Klasik 3D — NPC Flow Optimization, Order Timers, Ticket Pinning & Champy the Cafe Cat Implementation Plan

This phased engineering plan resolves the remaining customer navigation/queue deadlocks seen in `Klasik3D-717438af`, adds glowing clickable hanging order papers with instant recipe pinning, renames **Barista Codex** to **Recipe Book**, introduces randomized **10–20s customer patience timers** with speed tips and walkouts, and extends the left counter wing to house **Champy**—an animated, pettable black cafe cat with real open-source cat sounds and purring audio.

---

## Issue & Feature Audit Matrix

| Phase | Feature / Bug Addressed | Root Cause / Current Gap | Primary Target Files |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Staggered Door Entry & Post-Serve Lane Separation** (`img 1 white circle`) | Multiple NPCs enter the doorway simultaneously, and served customers attempt to exit straight backward through queued patrons, causing permanent collisions and shaking glitches. | `src/game/scene3d.ts`, `src/game/rules.ts` |
| **Phase 2** | **Glowing Order Papers + Click-to-Pin Recipe** (`img 1 red circle`) | Hanging 3D order tickets blur on `GFX: LOW`, making drinks hard to read; clicking them does not pin the customer's recipe to the HUD. | `src/game/scene3d.ts`, `src/App.tsx`, `src/components/HudOverlay.tsx` |
| **Phase 3** | **Rename "Barista Codex" to "Recipe Book"** | POS 3D screen texture, modal title, tooltips, and HUD prompts still display `Barista Codex` / `BARISTA CODEX`. | `src/game/scene3d.ts`, `src/components/RecipeMenuModal.tsx`, `src/components/HudOverlay.tsx`, `src/App.tsx`, `src/game/rules.test.ts` |
| **Phase 4** | **Randomized 10–20s Order Time Limits, Speed Tips & Walkouts** | Customers currently wait indefinitely without urgency, speed-based tip incentives, or walkout consequences. | `src/game/rules.ts`, `src/components/HudOverlay.tsx`, `src/game/scene3d.ts`, `src/game/sound.ts`, `src/App.tsx` |
| **Phase 5** | **Left Counter Extension & "Champy" 3D Cafe Cat** (`img 2 red circle`) | Open floor gap left of the POS register; needs a seamless counter wing extension, cozy cat bed, and an articulated black cat (**Champy**) with green eyes, bluish-green collar, and autonomous animations. | `src/game/scene3d.ts`, `src/App.tsx`, `src/components/HudOverlay.tsx` |
| **Phase 6** | **Tap/Click-to-Pet Interaction & Open-Source Cat Audio** | Need cross-platform touch (APK/PWA) & mouse click (Desktop/Live Web) petting with real open-source CC0 meow/chirp/purr recordings plus offline-safe fallback synthesis. | `src/game/sound.ts`, `src/game/scene3d.ts`, `public/audio/champy/*`, `public/sw.js` |

---

## Phase 1: Zero-Glitch Door Entry & Post-Serve Traffic Lane Separation (`src/game/scene3d.ts`, `src/game/rules.ts`)

### 1.1 Prevent Simultaneous Doorway Entries (Strict Entry Staggering)
To eliminate two customers arriving at the swinging glass door (`x = -1.15, z = -6.15`) at the same moment:
1. **Staggered Spawner Guard (`src/game/rules.ts`):**
   - Enforce a minimum **`3.2s` spawn cooldown** (`minArrivalGapMs = 3200`) between newly spawned customers so patrons never spawn on top of each other on the exterior sidewalk.
   - Only spawn a new arriving customer if `activeArrivingCount < 1` (at most one customer is currently walking from the sidewalk through the doorway at any given instant).
2. **Strict Doorway Airlock Queue (`src/game/scene3d.ts`):**
   - Maintain a FIFO array `private doorwayQueue: string[] = [];` plus `private activeDoorCrossId: string | null = null;`.
   - Define the doorway airlock box: `x ∈ [-1.95, -0.35]`, `z ∈ [-7.45, -4.95]`.
   - Only the customer whose `id === this.activeDoorCrossId` is allowed to advance into the airlock.
   - Any other customer approaching from inside (departing/takeout/walkout) or outside (arriving) halts cleanly at a designated **Hold Point**:
     - **Exterior Hold Point:** `(-1.65, -7.75)` facing the door.
     - **Interior Hold Point:** `(-0.45, -4.75)` facing the door.
   - **Priority Rule:** Exiting customers (served takeout or walkouts) get priority on the next doorway slot so the interior never backs up.
   - Release `activeDoorCrossId` once the crossing patron exits the airlock bounds (with a `3.5s` anti-deadlock failsafe).

### 1.2 Fix Served Customers Getting Stuck in Line (`img 1 white circle`)
Look at the white-circled jam: a customer at `Slot 0` receives their coffee, turns around, and tries to walk straight back along the exact `-Z` queue line where `Slot 1` and `Slot 2` patrons are standing.

**Architectural Fix — Dedicated One-Way Ingress & Egress Lanes:**
1. **Ingress Queue Lane (Left-Center, `x = -0.95`):**
   - Waiting patrons line up strictly along `x = -0.95`:
     - `Slot 0 (Ordering / Pickup)`: `(-0.95, -1.45)`
     - `Slot 1`: `(-0.95, -2.45)`
     - `Slot 2`: `(-0.95, -3.45)`
     - `Slot 3`: `(-0.95, -4.40)`
   - Notice the **`1.00m` spacing**—well above the character collision radius (`0.34m`), guaranteeing zero shoulder overlap while waiting.
2. **Mandatory Post-Serve Sidestep into Egress Lane (`x = +0.25`):**
   - The moment a customer transitions to `'served'` (dine-in or takeout) or `'walkout'` (order expired):
     1. **Waypoint 1 (Immediate Sidestep Right):** Walk laterally to **`(x = +0.28, z = currentZ)`** — completely stepping **out** of the `x = -0.95` queue column in `< 0.7s` so `Slot 1` can step forward into `Slot 0` with zero obstruction!
     2. **Waypoint 2 (Clear Lounge / Exit Corridor):** Travel north/south strictly along the open right-center corridor (`x = +0.28`) to either:
        - Their assigned **Dine-In Table** (`x >= +0.15`), OR
        - The **Interior Door Hold Point** (`(-0.45, -4.75) -> Doorway -> Sidewalk Exit`) for **Takeout** and **Expired Walkout** customers.
3. **Collision-Layer Filtering & Anti-Stuck Failsafe:**
   - **No Blocking Against Queued Patrons:** Departing (`served` / `exiting` / `walkout`) actors **never** apply hard opposing repulsion against `'idle-queue'` actors; instead they follow their dedicated `x = +0.28` lane cleanly.
   - **Stuck-Detector Watchdog:** Track `stuckTimer` on every moving actor. If `actor.moveState === 'walking'` and net displacement over `1.0s` is `< 0.10m`, temporarily set `actor.ghostPassTimer = 1.1` (bypassing inter-actor repulsion while smoothly advancing along the current waypoint) so no customer can ever freeze or vibrate in place.

---

## Phase 2: Glowing Hanging Order Papers & Click-to-Pin Recipe (`src/game/scene3d.ts`, `src/App.tsx`, `src/components/HudOverlay.tsx`)

### 2.1 Glowing Interactive Order Papers (`img 1 red circle`)
Hanging order tickets on the counter rail become blurry at low pixel ratios (`GFX: LOW`). Upgrade each hanging ticket mesh in `src/game/scene3d.ts`:
1. **Pulsing Glow Halo & Pin Badge Frame:**
   - Add a slim emissive border frame mesh (`ticketGlowFrame`) behind each of the 3 hanging paper meshes (`MeshBasicMaterial` with `transparent: true, blending: THREE.AdditiveBlending`, zero extra GPU lights).
   - **Dynamic Glow States:**
     - **Active / Unpinned Order:** Soft pulsing warm amber-gold glow (`#fbbf24`, `opacity` oscillating `0.38–0.78`) inviting the player to click/tap.
     - **Currently Pinned Order:** Crisp steady emerald-mint glow (`#34d399`, `opacity: 0.72`) + a small bright `"PINNED"` badge drawn at the top of the ticket texture.
     - **Urgent Order (`< 5s` remaining):** Rapid pulsing crimson-coral glow (`#f43f5e`, `opacity` oscillating `0.45–0.95`) so players spot expiring orders immediately even on low graphics!
   - **Sharper Low-GFX Ticket Layout:** Simplify the 3D ticket `CanvasTexture` into bold high-contrast typography (large customer first name, bold icon for Hot/Iced/Takeout, and a chunky bottom countdown bar) so it remains legible at `256x256`.
2. **Click / Tap Raycast Auto-Pinning (`scene3d.ts` -> `App.tsx`):**
   - Give every hanging order ticket a generous invisible raycast hitbox (`1.25x` wider/taller than the visual paper for effortless mobile tapping).
   - Add `userData = { interactType: 'order-ticket', orderId: cust.id, recipeId: cust.recipeId }`.
   - When the player clicks/taps a hanging order paper:
     1. Trigger a crisp tactile paper-pin SFX + subtle haptic tap.
     2. Call `onPinOrderFromTicket(orderId, recipeId)` in `src/App.tsx`.
     3. Automatically select `orderId` as the active order **and** pin `recipeId` (linked to `orderId`) into the HUD's **Pinned Recipe** widget (`isPinnedMinimized = false`), displaying the exact steps, custom modifiers (`+Vanilla`, `+Extra Shot`, `+Iced`), service type (`Dine-In` / `Takeout`), and live countdown bar—just like pinning from the Recipe Book!
   - When that pinned customer's order is **served** or **expires**, automatically unpin (or cleanly prompt/switch to the next pinned order) so stale recipes don't clutter the HUD.

---

## Phase 3: Rename "Barista Codex" to "Recipe Book" Everywhere

Perform a complete UI, 3D texture, and test-suite rename from **Barista Codex** to **Recipe Book**:

| File | Current Text | Updated Text |
| :--- | :--- | :--- |
| `src/game/scene3d.ts` | `BARISTA CODEX`, `TAP FOR BARISTA CODEX`, `KLASIK POS · Tap to Open Barista Codex` | `RECIPE BOOK`, `TAP FOR RECIPE BOOK`, `KLASIK POS · Tap to Open Recipe Book` |
| `src/components/RecipeMenuModal.tsx` | `KLASIK POS · Barista Codex`, `Barista Recipe Codex` | `KLASIK POS · Recipe Book`, `Klasik Recipe Book` |
| `src/components/HudOverlay.tsx` | Any remaining `Barista Codex` tooltips, aria-labels, or button labels | `Recipe Book` |
| `src/App.tsx` / `src/components/TitleScreen.tsx` | Help/tip references mentioning `Barista Codex` | `Recipe Book` |
| `src/game/rules.test.ts` | Any string assertions referencing `Barista Codex` | `Recipe Book` |

---

## Phase 4: Randomized 10–20 Second Customer Order Time Limits, Speed Tips & Walkout Penalty (`src/game/rules.ts`, `src/components/HudOverlay.tsx`, `src/game/scene3d.ts`)

### 4.1 Order Timer Data Model & Fair Start Trigger (`src/game/rules.ts`)
1. Extend `CustomerOrder`:
   ```ts
   export interface CustomerOrder {
     // ...existing fields
     orderTimeLimitSec: number;   // Randomized integer in [10, 20] seconds
     orderTimeRemainingSec: number;
     timerStarted: boolean;       // Starts ticking ONLY once customer reaches the counter!
     expired?: boolean;           // True when countdown hits 0 -> triggers walkout
   }
   ```
2. **Randomized Duration Generator:**
   ```ts
   export function rollOrderTimeLimitSec(rng = Math.random): number {
     return Math.floor(rng() * 11) + 10; // Inclusive 10..20 seconds
   }
   ```
3. **Fair Timing Rules (No Unfair Walkouts):**
   - **Start on Arrival at Counter:** Set `timerStarted = false` while the customer is still walking from the sidewalk through the swinging door. The instant `scene3d.ts` signals the customer reached `Slot 0` (or their waiting counter slot), set `timerStarted = true` so the player gets the full `10–20` seconds to craft the order.
   - **Pause During Menus / Modals:** Pause countdown ticks whenever the game is paused, on the Title Screen, in `Zen Mode (Endless)` *(optional: disable walkouts or keep relaxed tips in Zen Mode while enforcing strict walkouts in Shift Mode)*, or while an informational modal (Settings, Upgrades, Customize) is open. *(Keep timers visible if Recipe Book is opened, or apply a gentle 0.35x slow-mo grace while checking the Recipe Book on Day 1.)*

### 4.2 Speed Tip Tiers & Zero-Earning Walkouts (`src/game/rules.ts` & `src/game/sound.ts`)
1. **Fast-Service Tip Calculation (on `serveOrder`):**
   - Compute `ratio = order.orderTimeRemainingSec / order.orderTimeLimitSec`:
     - **Fast Delivery (`ratio >= 0.50`):** Awards **Speed Tip `+$3`** (or `+$4` for multi-step specialty drinks) + banner `"⚡ Fast Service! +$3 Tip"` + golden chime SFX.
     - **Prompt Delivery (`0.25 <= ratio < 0.50`):** Awards **Quick Tip `+$1`** + banner `"Nice Speed! +$1 Tip"`.
     - **Just In Time (`0 < ratio < 0.25`):** Base drink price earned, **`$0` speed tip**.
2. **Expired Order Walkout (`orderTimeRemainingSec <= 0`):**
   - Trigger `handleExpiredOrder(state, order.id)`:
     - Player earns **`$0`** (no drink revenue, no tip).
     - Increment `missedOrders` / reset active perfect-service streak.
     - Mark customer status `'walkout'`.
     - Trigger a soft disappointed sigh / bell-thud SFX (`sound.playOrderExpired()`).
     - Show a concise crimson glass toast: `"⏱ [CustomerName] ran out of patience and left! ($0)"`.
     - In `src/game/scene3d.ts`, show a brief frustrated icon (`😠` / red `✕`) above the customer's head, clear their hanging order paper, and immediately route them via the **Phase 1 right-hand egress lane (`x = +0.28`)** straight out the swinging glass door onto the sidewalk!

### 4.3 Live Countdown UI Indicators (`src/components/HudOverlay.tsx` & `src/game/scene3d.ts`)
- **Top Queue Chips (`Lucas $8`):** Show a slim bottom progress bar + compact seconds readout (`14s`) turning green → amber → pulsing red (`<= 4s`).
- **Active Order Bar & Pinned Recipe Card:** Display `⏱ 12s` with a smooth shrinking countdown bar matching the urgency color.
- **3D Hanging Order Ticket:** Redraw the bottom bar width & color on the ticket canvas every `0.5s` (throttled for low-end GPU performance) and ramp up the Phase 2 ticket glow into crimson pulse under `5s`.

---

## Phase 5: Left Counter Extension & "Champy" the 3D Black Cafe Cat (`src/game/scene3d.ts`)

### 5.1 Extend Left Bar Counter Wing (`img 2 red circle`)
Inspecting `edited-image_3.jpg`, the left end of the main service counter terminates just left of the POS register (`x ≈ -1.95`), leaving a bare floor gap in front of the left-wall planter box (`x ≈ -2.0` to `-3.1`).
1. **Seamless Architectural Counter Extension (`src/game/scene3d.ts`):**
   - Extend the main bar countertop slab, fluted front counter paneling, recessed dark-slate toe-kick, and brushed-brass kickplate **leftward by `+1.15m`** (or build a matching L-shaped return wing seamlessly joined to the left edge of the POS counter, covering the red-circled floor gap up to the wall planter edge while keeping full visibility of the red 1990 Miata behind the counter!).
   - Ensure `updateDecorMaterials()` applies the active counter wood/marble material to the extended wing automatically so all decor themes stay unified.
2. **Champy's Cozy Counter Perch (`x ≈ -2.55, y = 1.00, z ≈ 0.15`):**
   - Place a plush low-profile **woven oatmeal & warm-terracotta cat cushion bed** (`CylinderGeometry(0.24, 0.26, 0.045, 20)` + raised plush rim torus) directly on the newly extended left counter section—fully visible from **Station 1 (Orders)** and partially visible from the Title Screen!
   - Add a tiny ceramic cream saucer beside the cushion and a small brass tabletop nameplate reading **`CHAMPY`**.

### 5.2 Articulated 3D Model — "Champy" (`createChampyCatRig()` in `src/game/scene3d.ts`)
Build a charming, stylized, low-poly articulated 3D feline matching Klasik 3D's clean artisan aesthetic (`< 35` lightweight meshes, zero shadow-map cost on `GFX: LOW`):

* **Coat Color (Black with Readable Sheen):**
  - Primary fur material: Rich obsidian-charcoal black (`color: 0x15171c, roughness: 0.62, metalness: 0.08`) so lighting catches Champy's silhouette cleanly during both daytime and Night Shift instead of turning into a flat black cutout.
  - Soft dark-charcoal inner ear triangles (`0x2d2429`) and tiny charcoal-pink nose (`0x3f2e36`).
* **Green Eyes (Expressive & Alive):**
  - Bright emerald-jade irises (`color: 0x22c55e, emissive: 0x15803d, emissiveIntensity: 0.25`, gently brighter `0.55` during Night Shift for subtle nocturnal cat-eye gleam!).
  - Vertical black slit pupils + crisp pure-white catchlight dots.
  - Articulated upper eyelids (`leftEyelid`, `rightEyelid`) for smooth natural blinking, closed sleeping eyes, and happy curved squints when petted.
* **Bluish-Green Collar (`#14b8a6` / Teal-Turquoise):**
  - Fitted smooth torus collar (`TorusGeometry(0.056, 0.011, 10, 20)`) around Champy's neck in vibrant **bluish-green teal** (`color: 0x0d9488, roughness: 0.35`).
  - Tiny dangling **brushed-gold collar bell** (`SphereGeometry(0.012, 10, 10)`, `color: 0xfbbf24, metalness: 0.85`) that gently jingles/swings when Champy moves or gets petted!
* **Articulated Parts (`ChampyRig`):**
  - `root`, `bodyPivot`, `headPivot`, `leftEar`, `rightEar`, `leftEyelid`, `rightEyelid`, `frontLeftLeg`, `frontRightLeg`, `hindGroup`, `tailSegments: [base, mid, tip]`, `collarBell`, and `heartParticles[]` (pre-allocated pool of 4 warm coral/amber floating heart sprites + 3 subtle `zZz` sleep sprites).

### 5.3 Champy's Autonomous Animation State Machine (`updateChampy(dt)`)
Champy cycles naturally between lively cafe behaviors every `8–16` seconds (and reacts immediately to café events):

| State | Visual Choreography | Triggers |
| :--- | :--- | :--- |
| **`sitting`** | Upright regal counter sit, slow rhythmic chest breathing, lazy S-curve wave across the 3 tail segments, periodic natural blinks (`every 3–5s`), subtle ear twitches, occasional curious head turn toward the espresso machine or barista. | Default state / post-greeting / waking up. |
| **`sleeping`** | Curled tightly down onto the cushion (`bodyPivot.position.y` lowered, torso curled, head tucked onto front paws, eyelids closed `100%`), slow deep breathing rise/fall (`0.45 Hz`), tail wrapped smoothly around flank, gentle floating `zZz` particles. | Autonomous cycle (more frequent during `Rainy Day`, `Night Shift`, and `Rainy Night`!). |
| **`grooming`** | Seated posture with `frontRightLeg` raised toward muzzle; rhythmic paw-lick bobbing (`3.2 Hz`) alternating with gentle head tilt wiping paw over right ear and cheek; relaxed half-lidded eyes. | Autonomous cycle after sitting or petting. |
| **`greeting`** | Ears perk forward, head tracks the entering or newly-arrived customer at `Slot 0`, body leans slightly forward, tail lifts tall with a friendly question-mark hook at the tip, plays soft open-source meow/chirp! | Automatically triggered when a new customer enters the door or steps up to `Slot 0` (rate-limited to once every `18s` so it never becomes repetitive). |
| **`petted`** | Triggered immediately on tap/click! If sleeping, stretches happily and purrs without jumping up; if awake, leans into the pet, arches back slightly, closes eyes into happy squints, kneads front paws softly, swings collar bell, emits 3–4 rising heart particles (`♥`), and plays the open-source purring loop! | Player **Tap** (APK/PWA) or **Click** (Desktop/Live Web) on Champy. |

---

## Phase 6: Tap/Click-to-Pet & Open-Source Real Cat Sounds (`src/game/sound.ts`, `public/audio/champy/`)

### 6.1 Cross-Platform Petting Input (APK, PWA, Live Web & Desktop)
- **Unified Pointer Event Raycasting (`src/game/scene3d.ts`):**
  - Attach a generous invisible hit-sphere (`SphereGeometry(0.28)` centered on Champy, `userData = { interactType: 'pet-champy' }`) so tapping Champy on a small mobile screen works reliably without pixel-hunting.
  - Handle via the unified `pointerdown` / `pointerup` tap handler (confirming pointer travel `< 12px` so camera drags don't accidentally pet him), working identically for:
    - **Touch Tap** on Android Capacitor APK & Installed PWA
    - **Mouse Click** on Desktop & Live Web builds
  - On Desktop hover (`pointermove`), switch cursor to `pointer` and show a cozy subtle tooltip chip: **`Champy · Click to Pet 🐾`** (or **`Tap to Pet`** on touch devices).
  - Trigger gentle device haptic purr-vibration on mobile (`haptics.purr()` — two ultra-light soft vibration pulses on Android/PWA) plus a tiny non-intrusive HUD pill (`"🐾 Champy is purring!"`).

### 6.2 Open-Source Real Cat Sound Assets (CC0 / Public Domain)
To guarantee **100% offline reliability** in Installed PWA and Capacitor Android APK builds (avoiding CORS errors, dead external links, or blocked hotlinks), bundle real **CC0 (Creative Commons Zero — Public Domain, zero attribution required, commercial-safe)** recordings inside `public/audio/champy/` and pre-cache them in `public/sw.js`:

| Target Local File | Sound Purpose | Recommended Verified Open-Source CC0 Sources |
| :--- | :--- | :--- |
| `public/audio/champy/purr.mp3` *(or `.ogg`)* | Continuous warm cat purring loop (`2–4s`) played when player taps/clicks to pet Champy. | **Wikimedia Commons (CC0 / Public Domain):** Search `"File:Cat purring.ogg"` or `"Cat purr"` under *Category:Audio files of cats* (`https://commons.wikimedia.org/wiki/Category:Audio_files_of_cats`) **OR Freesound.org (CC0 Filter):** `https://freesound.org/search/?q=cat+purr&f=license:%22Creative+Commons+0%22` |
| `public/audio/champy/meow_greet.mp3` | Soft friendly meow when Champy greets entering customers or wakes up. | **Freesound.org (CC0 Filter):** `https://freesound.org/search/?q=cat+meow+soft&f=license:%22Creative+Commons+0%22` **OR OpenGameArt.org (CC0):** `https://opengameart.org/art-search-advanced?keys=cat+meow&field_art_licenses_tid[]=4` |
| `public/audio/champy/chirp_trill.mp3` | Short affectionate cat trill/chirp (`"mrrp!"`) occasionally played on petting start or customer greeting. | **Freesound.org (CC0 Filter):** `https://freesound.org/search/?q=cat+trill+chirp&f=license:%22Creative+Commons+0%22` |

> **Asset Optimization Note:** Trim and encode each clip to lightweight mono `64–96 kbps` MP3/OGG (`< 45 KB` per clip, `< 150 KB` total) so APK size and initial PWA download remain tiny.

### 6.3 Hybrid Audio Loader with Automatic Offline/Fallback Synthesizer (`src/game/sound.ts`)
Implement `ChampyAudioController` inside `src/game/sound.ts` so real open-source recordings play seamlessly whenever present, while automatically falling back to a warm Web Audio API synthesizer if a file hasn't been placed in `public/audio/champy/` yet or fails network fetch:

```ts
// Inside src/game/sound.ts:
const CHAMPY_AUDIO_URLS = {
  purr: `${import.meta.env.BASE_URL}audio/champy/purr.mp3`,
  meowGreet: `${import.meta.env.BASE_URL}audio/champy/meow_greet.mp3`,
  chirp: `${import.meta.env.BASE_URL}audio/champy/chirp_trill.mp3`,
};

private champyBuffers: Partial<Record<keyof typeof CHAMPY_AUDIO_URLS, AudioBuffer>> = {};
private champyLoaded = false;

public async preloadChampyAudio(): Promise<void> {
  if (this.champyLoaded || !this.ctx) return;
  this.champyLoaded = true;
  await Promise.allSettled(
    (Object.entries(CHAMPY_AUDIO_URLS) as [keyof typeof CHAMPY_AUDIO_URLS, string][]).map(
      async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const arr = await res.arrayBuffer();
          if (this.ctx) {
            this.champyBuffers[key] = await this.ctx.decodeAudioData(arr);
          }
        } catch {
          // Graceful fallback to procedural Web Audio cat purr / meow synth
        }
      }
    )
  );
}

public playChampyPurr(durationSec = 2.6): void {
  if (this.muted || !this.ctx) return;
  const buf = this.champyBuffers.purr;
  if (buf) {
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    src.loop = true;
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.18);
    gain.gain.setValueAtTime(0.42, now + Math.max(0.3, durationSec - 0.35));
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    src.connect(gain).connect(this.masterGain);
    src.start(now);
    src.stop(now + durationSec + 0.05);
    return;
  }
  // Fallback: Warm 26Hz amplitude-modulated low-pass feline purr synthesizer
  this.playProceduralCatPurr(durationSec);
}

public playChampyMeow(kind: 'greet' | 'chirp' = 'greet'): void {
  if (this.muted || !this.ctx) return;
  const buf = kind === 'chirp' ? this.champyBuffers.chirp : this.champyBuffers.meowGreet;
  if (buf) {
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = 0.94 + Math.random() * 0.12; // Natural pitch variation
    gain.gain.value = 0.36;
    src.connect(gain).connect(this.masterGain);
    src.start();
    return;
  }
  // Fallback: Soft formant-filtered feline meow pitch contour
  this.playProceduralCatMeow(kind);
}
```

* **PWA Offline Support (`public/sw.js`):** Add `'./audio/champy/purr.mp3'`, `'./audio/champy/meow_greet.mp3'`, and `'./audio/champy/chirp_trill.mp3'` to the optional pre-cache list (wrapped in non-fatal catch so missing files never break service worker installation).

---

## Low-End Device Performance Guardrails

- **Throttled Ticket Canvas Redraws:** Only redraw a hanging order ticket's 2D canvas when the customer changes, pin state toggles, or integer remaining seconds tick down (`1 Hz` max—never every frame).
- **Champy Zero-GC Animation Loop:** Update Champy's joint rotations directly on pre-allocated `Object3D` references inside `animate(dt)` with zero per-frame vector/mesh allocations; skip heart/sleep particle updates when Champy is off-screen (e.g., zoomed into Station 5 Vinyl).
- **Additive Glow Without Point Lights:** Hanging order ticket glows use pure additive `MeshBasicMaterial` planes (`0` additional dynamic WebGL lights).

---

## QA Verification Checklist

- [ ] **No Simultaneous Doorway Collisions:** Customers spawn staggered (`>= 3.2s`) and cross the glass entrance door strictly one at a time via the airlock hold points—zero freezing or yaw-shaking.
- [ ] **No Post-Serve Line Jams (`img 1 white circle`):** Served customers immediately sidestep right into the `x = +0.28` egress lane, allowing waiting customers to advance cleanly into `Slot 0` without collisions.
- [ ] **Glowing Clickable Order Papers (`img 1 red circle`):** Hanging order papers emit a visible warm glow (emerald when pinned, pulsing red when `< 5s`), and clicking/tapping any paper instantly pins that customer's recipe to the minimizable HUD widget.
- [ ] **Renamed to Recipe Book:** All UI labels, tooltips, and the 3D POS screen read **Recipe Book** with zero leftover `Barista Codex` strings.
- [ ] **10–20s Order Timers, Tips & Walkouts:** Every order starts its randomized `10–20s` countdown upon reaching the counter; fast serves grant visible speed tips (`+$1` to `+$3`), while expired orders yield `$0` and cause the customer to walk out cleanly through the door.
- [ ] **Extended Counter & Champy (`img 2 red circle`):** The left counter extends seamlessly into the circled gap with a cozy cat bed hosting **Champy** (black coat, green eyes, bluish-green collar + gold bell) performing sitting, sleeping, grooming, and customer-greeting animations.
- [ ] **Petting & Open-Source Audio:** Tapping (APK/PWA) or clicking (Desktop/Live Web) Champy triggers his happy petted animation, floating hearts, haptic feedback, and plays the open-source CC0 purring sound (with automatic offline fallback).