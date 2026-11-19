# Klasik 3D — Game Expansion & Mechanics Upgrade Prompt

Implement the following core gameplay overhaul, Glassmorphism HUD re-optimization, Unlockable Cafe Cats expansion (9 cats with passive abilities), and Hidden 7-Cookie Jar Cheat across `src/game/rules.ts`, `src/game/scene3d.ts`, `src/game/sound.ts`, `src/App.tsx`, `src/components/HudOverlay.tsx`, `src/components/CustomizeModal.tsx`, `src/components/BizUpgradesModal.tsx`, `src/components/TitleScreen.tsx`, `src/index.css`, and `src/game/rules.test.ts`.

> **Preservation Rule:** Keep all existing systems intact—Stations 1–5, 3D Vinyl Spotify turntable, 1990 Mazda Miata MX-5 showroom, Recipe Book POS zoom + minimizable Pinned Recipe HUD, Hot/Iced/Takeout 3D vessels, Takeout walkouts, Night & Rainy Night atmospheres, umbrellas, real `.wav` cat purr/meow/rain audio in `public/assets/aistudio/`, the Crema Ring splash screen, and timed anti-exploit brew locks.

---

## PHASE 1: Replace Customer Timer with Mood Meter (100 → 0, 1–2 Min) & Barista Order Queueing

### 1.1 Order Queueing Flow (Accept Order First — Stop Simultaneous Overwhelm)
Currently, every customer forming a line starts draining their timer simultaneously. Replace this with a barista-paced **Order Queueing** workflow:

1. **Extend `CustomerOrder` in `src/game/rules.ts`:**
   ```ts
   export interface CustomerOrder {
     // ...existing fields
     orderAccepted: boolean;         // False while waiting in line; true once barista accepts the order
     mood: number;                   // 100 (Happy) down to 0 (Dissatisfied / Disappointed)
     moodDurationSec: number;        // Randomized 60..120 seconds (1 to 2 minutes) to drain 100 -> 0
     moodExpired?: boolean;          // True when mood hits 0 -> triggers dissatisfied walkout
   }
   ```
   - Remove the old `10–20s` `orderTimeLimitSec` / `orderTimeRemainingSec` countdown fields (or migrate any references cleanly to the Mood Meter system).
   - Roll `moodDurationSec` on customer spawn:
     ```ts
     export function rollMoodDurationSec(rng = Math.random): number {
       return Math.floor(rng() * 61) + 60; // Inclusive 60s (1 min) to 120s (2 min)
     }
     ```

2. **Waiting in Line (`orderAccepted === false`):**
   - Customers enter through the swinging glass door and line up at the counter (`Slot 0`, `Slot 1`, `Slot 2`, etc.) with `orderAccepted: false` and `mood: 100`.
   - **While `orderAccepted === false`, their Mood Meter does NOT deplete.** They wait calmly in line with a friendly speech/order-ready indicator (`"Tap to Take Order"` / glowing amber `!` pill above their head or on their HUD chip).
   - Unaccepted orders do **not** clutter the hanging ticket rail until accepted.

3. **Accepting an Order (`acceptCustomerOrder(state, orderId)`):**
   - The barista accepts a waiting customer's order by:
     - Clicking/tapping the **"Accept Order"** button on the customer's HUD queue pill or Station 1 prompt, **OR**
     - Clicking/tapping the waiting customer directly at the counter in 3D (`scene3d.ts`).
   - Upon accepting:
     - Set `orderAccepted = true`.
     - Select that order as the active order (if no other order is currently selected), print/hang their glowing clickable order ticket on the rail, play a crisp POS order-chime SFX, and **begin draining their Mood Meter** from `100` toward `0` over their randomized `60–120s` duration.
   - Players can accept 1 order at a time to stay calm, or accept 2–3 orders simultaneously to juggle rush combos at their own pace.

### 1.2 Mood Meter Mechanics (`100` Happy → `0` Dissatisfied / Disappointed)
1. **Per-Second Mood Drain Rate:**
   ```ts
   // Base drain per second to drop from 100 to 0 over moodDurationSec (60..120s)
   const baseDrainPerSec = 100 / order.moodDurationSec;

   // Passive Cat Modifiers:
   // - Lilo equipped: Mood Meter completely disabled (drain = 0, mood locked at 100)
   // - Mikmik equipped: Mood drains 30% faster (drain * 1.30)
   // - Zen Mode: Mood does not drop below 100 (relaxed endless mode)
   ```
2. **Mood States & Tip Scaling (on `serveOrder`):**
   - **75–100 (Happy 😊 — Emerald):** Awards full **Happy Mood Tip (`+$3`)** + praise toast.
   - **40–74 (Content 🙂 — Warm Amber):** Awards **Standard Tip (`+$1`)**.
   - **1–39 (Impatient 😟 — Coral/Orange):** Base drink payout only (`$0` mood tip).
   - **0 (Dissatisfied / Disappointed 😞 — Crimson):** Order expires -> customer walks out via the right-hand egress lane (`x = +0.28`), player earns **`$0`**, and toast shows `"[Name] left dissatisfied ($0)"`.
3. **Mood Meter UI (`src/components/HudOverlay.tsx` & `src/game/scene3d.ts`):**
   - Replace all seconds countdown timers (`14s`) on HUD queue pills, active order banners, pinned recipe cards, and 3D hanging tickets with a sleek **Mood Meter bar + Mood Icon + numeric score (`100` → `0`)** that shifts smoothly from **Emerald (Happy)** → **Amber (Waiting)** → **Pulsing Crimson (Low Mood)**.
   - When **Lilo** is equipped, display a calm sky-blue badge (`∞ Mood Disabled · Lilo`) instead of a draining bar.
   - For unaccepted customers in line, display a crisp **`Accept Order`** action badge (`✋ Take Order`) instead of a draining bar.

---

## PHASE 2: Bring Back & Re-Optimize Glassmorphism HUD (`src/index.css`, `src/components/HudOverlay.tsx`, `src/components/TitleScreen.tsx`)

Restore the signature **frosted dark-espresso Glassmorphism aesthetic** across the entire HUD, Title Screen, Pinned Recipe widget, and modals while keeping low-end Android devices smooth and buttons effortlessly readable:

1. **Tiered Performance-Aware Glassmorphism (`src/index.css`):**
   - **Medium / High / Max GFX:** Full rich frosted espresso glass (`backdrop-filter: blur(14px) saturate(140%)`, deep espresso tint `rgba(18, 12, 9, 0.68)`, crisp inner top highlight `inset 0 1px 0 rgba(255, 245, 230, 0.16)`, warm brass edge `1px solid rgba(251, 191, 36, 0.28)`).
   - **Low GFX (`[data-gfx='low']`):** **Do NOT strip glassmorphism back to flat opaque brown!** Instead, use a **lightweight re-optimized glass pass**:
     - Reduced-radius single-pass frosted blur (`backdrop-filter: blur(6px) saturate(115%)`) paired with a translucent layered smoked-glass gradient (`linear-gradient(155deg, rgba(32, 22, 16, 0.74) 0%, rgba(16, 10, 7, 0.70) 100%)`), specular glass sheen top edge (`inset 0 1px 0 rgba(255, 248, 235, 0.22)`), and `transform: translateZ(0); contain: layout style paint;` to keep GPU compositing fast on budget Android phones.
   - **Zero Double-Blur Rule:** Only outer HUD bars/containers (`.glass-panel`, `.glass-pill`, `.glass-modal`) carry `backdrop-filter`; nested buttons inside them use `.glass-btn-inner` translucent surfaces with high-contrast `#FAF5EE` text and subtle `text-shadow: 0 1px 2px rgba(0,0,0,0.75)` so icons and labels stay razor sharp over bright Morning Sun, Golden Hour, and Night scenes.
   - Re-apply `.glass-pill` and `.glass-panel` consistently across:
     - Top HUD status bar (station pill, queue/accept pills, cash, day progress bar, orders count, satisfaction, clock, Menu button).
     - Active Order / Mood Meter banner & Pinned Recipe widget (expanded & minimized pill).
     - Bottom navigation bar, gold lightning step button, station quick-actions, and `TitleScreen.tsx` hero card.

---

## PHASE 3: Content Expansion — 8 New Unlockable Cafe Cats (9 Total) + Passive Abilities

Keep **Champy** (Black coat, green eyes, bluish-green collar) as the starter cat unlocked by default. Track cumulative **`lifetimeRevenue`** (or `totalRevenueEarned`) in `GameState` (persisted in saves/localStorage, incremented on every paid drink/tip) to unlock revenue-milestone cats automatically.

### 3.1 Complete Cafe Cat Roster & Exact Specifications (`src/game/rules.ts` & `src/game/scene3d.ts`)

```ts
export type CafeCatId =
  | 'champy'
  | 'chimny'
  | 'chunky'
  | 'kicks'
  | 'cheeto'
  | 'lilo'
  | 'katkat'
  | 'luna'
  | 'mikmik';
```

| Cat ID | Name | Coat & Markings | Eyes | Collar | Body Proportions (Relative Scale) | Unlock Method | Passive Ability |
|---|---|---|---|---|---|---|---|
| `champy` | **Champy** | Sleek black (`#15171c`) | Both Green (`#22c55e`) | Bluish-green / Teal (`#0d9488`) + gold bell | Standard `(1.00, 1.00, 1.00)` | **Starter (Unlocked)** | None (Cozy cafe companion) |
| `chimny` | **Chimny** | **Brown-Gray Tabby** (warm taupe-gray `#78716c` base + darker brown-charcoal `#44403c` tabby stripes on back, head, & ringed tail) | Both Green (`#22c55e`) | **Blue** (`#2563eb`) + silver/gold bell | Standard `(1.00, 1.00, 1.00)` | **Revenue Milestone: `$1,000`** | None |
| `chunky` | **Chunky** | **Pure White** (`#f8fafc`) | **Heterochromia:** Left eye **Yellow** (`#eab308`), Right eye **Blue** (`#38bdf8`) | **Pink** (`#ec4899`) + gold bell | Slightly plush `(1.06, 0.98, 1.06)` | **Revenue Milestone: `$1,500`** | None |
| `kicks` | **Kicks** | **Pure White** (`#f8fafc`) | Both **Blue** (`#38bdf8`) | **Thin Black Collar** (`#111827`, slimmer torus radius) | **Largest cat** `(1.26, 1.24, 1.26)` | **Revenue Milestone: `$2,000`** | None |
| `cheeto` | **Cheeto** | **Warm White** (`#fef7e6` / soft ivory-cream) | **Heterochromia:** Left eye **Blue** (`#38bdf8`), Right eye **Yellow** (`#eab308`) | **No Collar** (`collarMesh.visible = false`) | Standard `(1.00, 1.00, 1.00)` | **Revenue Milestone: `$2,250`** | None |
| `katkat` | **Katkat** | **Tabby Ginger Tuxedo** (vibrant ginger `#ea580c` with darker marmalade tabby stripes `#c2410c` + crisp **pure white chest tuxedo bib** & white paws `#f8fafc`) | Both **Amber** (`#f59e0b`) | Warm brass/tan collar or optional subtle accent | Standard `(1.00, 1.00, 1.00)` | **Shop Purchase: `$150`** | None |
| `luna` | **Luna** | **Pure White** (`#f8fafc`) | Both **Blue** (`#38bdf8`) | Sleek silver-indigo collar (`#6366f1`) or minimal | **Thinner / Slender** `(0.82, 1.02, 0.88)` | **Shop Purchase: `$500`** | None |
| `mikmik` | **Mikmik** | **White coat** (`#f8fafc`) with **ginger patch on the head**, **2 distinct ginger patches on the stomach/flanks**, and a **pure ginger tail** (`#ea580c`) | Warm Amber/Hazel (`#d97706`) | Classic cream/amber collar (`#d97706`) | **Second largest** (larger than all except Kicks) `(1.15, 1.13, 1.15)` | **Shop Purchase: `$1,000`** | **High-Stakes Rush:** Customer Mood Meter depletes **30% faster** (`1.3x`), AND **all coffee/drink revenue increases by +30%** (`1.3x`)! |
| `lilo` | **Lilo** | **Pure White** (`#f8fafc`) | Both **Blue** (`#38bdf8`) | **Blue Collar** (`#2563eb`) + gold bell | **Smallest height/length, but fat/chubby** `(1.12 width, 0.78 height, 0.86 length)` | **Master Unlock:** Automatically unlocks when player owns **all 7 other unlockable cats** (Chimny, Chunky, Kicks, Cheeto, Katkat, Luna, Mikmik) | **Pure Peace:** When Lilo is equipped, the **Customer Mood Meter is completely disabled** (mood locked at 100%, zero walkouts)! |

### 3.2 Procedural 3D Cat Renderer (`src/game/scene3d.ts`)
Refactor `createChampyCatRig()` into a generalized `buildCafeCatRig(catId: CafeCatId)` that dynamically builds the currently equipped cat on the extended left counter cushion:
- **Exact Eye Heterochromia Orientation:** Be explicit about `catLeftEye` vs. `catRightEye` from the cat's own anatomical perspective (and verify visually from the front camera):
  - **Chunky:** Left eye `#eab308` (yellow), Right eye `#38bdf8` (blue).
  - **Cheeto:** Left eye `#38bdf8` (blue), Right eye `#eab308` (yellow).
- **Distinct Markings Geometry / Procedural Textures:**
  - **Chimny:** Procedural brown-gray tabby stripe `CanvasTexture` mapped cleanly onto torso, head, and tail.
  - **Katkat:** Ginger tabby coat with a sculpted/textured white tuxedo chest patch (`#f8fafc`) and white front paw mittens.
  - **Mikmik:** White coat with a ginger crown/ear head patch, **two distinct ginger belly/stomach patches**, and a **pure solid ginger tail** (`#ea580c`).
- **Dynamic Counter Nameplate & Tooltips:**
  - Automatically redraw the small brass tabletop nameplate beside the cushion to display the equipped cat's uppercase name (`CHAMPY`, `CHIMNY`, `CHUNKY`, `KICKS`, `CHEETO`, `LILO`, `KATKAT`, `LUNA`, `MIKMIK`).
  - Update hover/tap tooltips and petting toast notifications dynamically (`"Tap to Pet Lilo"`, `"🐾 Mikmik is purring!"`).
  - Retain all autonomous animations (`sitting`, `sleeping`, `grooming`, `greeting`, `petted`), floating heart particles, haptic feedback, and the real `.wav` purring/meowing audio in `sound.ts` for every single cat!

### 3.3 Unlock Flow, Revenue Triggers & Shop/Customize UI (`src/game/rules.ts`, `src/components/CustomizeModal.tsx`, `src/components/BizUpgradesModal.tsx`)
1. **Automatic Revenue Unlock Checks (`rules.ts`):**
   - Every time `lifetimeRevenue` increases, check thresholds (`1000` -> `chimny`, `1500` -> `chunky`, `2000` -> `kicks`, `2250` -> `cheeto`). Unlock newly reached cats automatically and emit a celebratory toast (`"🐾 New Cafe Cat Unlocked: Chimny ($1,000 Revenue)!"`).
   - Whenever any cat is unlocked (via revenue or shop purchase), check if `['chimny','chunky','kicks','cheeto','katkat','luna','mikmik']` are all unlocked -> if yes, immediately unlock **`lilo`** with a special celebration toast (`"👑 Secret Master Cat Unlocked: Lilo! Equip Lilo to disable Customer Mood Meters!"`).
2. **Cafe Cats Tab in Shop / Customize UI:**
   - Add a dedicated **"Cafe Cats"** tab (accessible from both the Customize/Shop modals) with two clear sections:
     - **Revenue Milestone Cats** (Chimny `$1,000`, Chunky `$1,500`, Kicks `$2,000`, Cheeto `$2,250`, plus Lilo showing progress `X / 7 Cats Unlocked`).
     - **Cat Adoption Shop** (Katkat `$150`, Luna `$500`, Mikmik `$1,000`) with instant Purchase + Equip buttons.
   - Clearly display each cat's appearance summary and highlight **Mikmik's (`+30% Coffee Revenue / +30% Mood Drain`)** and **Lilo's (`Disables Customer Mood Meter`)** passive ability badges!
   - When the player equips a cat, `scene3d.ts` immediately swaps the 3D cat rig on the counter with a gentle sparkle/puff effect and soft meow.

---

## PHASE 4: Hidden Cheat — The 7-Cookie Jar Easter Egg (`src/game/scene3d.ts`, `src/game/rules.ts`, `src/App.tsx`)

### 4.1 3D Glass Cookie Jar Beside the Cat (`src/game/scene3d.ts`)
- Place a charming **3D Glass Cookie Jar** right beside the cat's cushion bed on the extended left counter wing (e.g., `x = -2.18, y = 1.00, z = 0.24`, clearly visible next to the cat without colliding with the POS register or cat cushion).
- **Visual Construction:**
  - Cylindrical clear glass jar (`CylinderGeometry(0.068, 0.072, 0.145, 18)`) with glossy translucent glass material (`opacity: 0.34, roughness: 0.08`) and a warm wooden/brass knobbed lid.
  - **Exactly 7 Individual 3D Cookies Inside:** Stack **7 distinct golden-brown chocolate-chip cookies** (`CylinderGeometry(0.042, 0.042, 0.015, 14)` in warm baked biscuit `#c68642` with tiny dark-chocolate chip dots `#3b1e0a`) neatly inside the transparent jar so the player can clearly see all 7 pieces!
- **Interactive Tap / Click Handling (APK, PWA, Desktop & Live Web):**
  - Register the cookie jar with an easy-to-tap invisible hitbox (`userData = { interactType: 'cookie-jar' }`). Do **not** label it as a cheat—keep it mysterious (no obvious cheat tooltip, or just a subtle subtle jar jiggle on tap).
  - Track `cookieJarTapCount` (0 to 7):
    - On each tap/click (`1` through `6`): Play a subtle glass clink / cookie rattle SFX, gently wobble the jar and bounce one cookie inside (or remove/hide 1 cookie visually per tap until all 7 are tapped!).
    - **On the 7th tap/click:**
      1. Trigger **`unlockAllEverythingCheat(state)`** in `src/game/rules.ts`!
      2. Display a prominent celebratory toast / notification with the **exact required message**:
         > **`you got what you wanted, now enjoy`**
      3. Unlock **every single unlockable in the entire game**:
         - All Shop Upgrades (`upgrades` — all marked purchased/installed, activating all 3D upgrade props in the cafe)
         - All Equipment Skins — including the **Golden Espresso Machine** (`golden-espresso-machine`), all Espresso Machine skins, all Burr Grinder skins, and all Milk Pitcher skins
         - All Customer Skin Packs
         - All Decor Themes (Wall styles, Floor styles, Counter materials, Neon Sign colors)
         - All Daily Login Reward unlocks
         - **All Cafe Cats** (`champy`, `chimny`, `chunky`, `kicks`, `cheeto`, `katkat`, `luna`, `mikmik`, and `lilo`)
      4. Save immediately to `localStorage` so all unlocks persist across reloads.

---

## PHASE 5: Testing & Verification Checklist

Update `src/game/rules.test.ts` and verify via `npm run build` and `npm test`:
- [ ] **Order Queueing & Mood Meter:** Arriving customers wait in line with `orderAccepted = false` and `mood = 100` (no drain). Accepting an order starts a randomized `60–120s` mood drain from `100` to `0`; serving at high mood grants tips, while `0` mood causes a `$0` dissatisfied walkout.
- [ ] **Re-Optimized Glassmorphism HUD:** Frosted dark-espresso glassmorphism is visibly restored across the HUD, Title Screen, Pinned Recipe widget, and modals—readable and performant even on `GFX: LOW`.
- [ ] **All 9 Cafe Cats & Exact Visuals:** Champy, Chimny (brown-gray tabby, green eyes, blue collar, `$1,000` rev), Chunky (pure white, left yellow / right blue eyes, pink collar, `$1,500` rev), Kicks (pure white, largest, blue eyes, thin black collar, `$2,000` rev), Cheeto (warm white, left blue / right yellow eyes, no collar, `$2,250` rev), Katkat (tabby ginger tuxedo with white chest, amber eyes, `$150` shop), Luna (pure white, blue eyes, thinner, `$500` shop), Mikmik (white with ginger head patch, 2 stomach patches, pure ginger tail, 2nd largest, `$1,000` shop), and Lilo (pure white, smallest & fat, blue eyes, blue collar, unlocks after all other cats).
- [ ] **Cat Passive Abilities:** Equipping **Mikmik** makes customer mood drain 30% faster AND multiplies drink revenue by `+30%`. Equipping **Lilo** completely disables the customer mood meter.
- [ ] **7-Cookie Jar Hidden Cheat:** Glass jar with 7 visible cookies sits beside the cat; tapping/clicking it 7 times displays `"you got what you wanted, now enjoy"` and unlocks all shop items, skins (including Golden Espresso Machine), decor, and all cats.