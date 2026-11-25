# Favela Boombox Dancer, Recessed Ice Compartment, Guided Beacon, Audio/Radio Overhaul & Cat Cosmetics Expansion

This update elevates the cafe's liveliness, station ergonomics, audio reliability, and cat wardrobe depth across nine targeted upgrades: a special visiting Favela boombox dancer synced to the reference video beat, an unobstructed recessed ice compartment below the rinsing sink, an unmistakable floating inverted-triangle next-step indicator, a reliable External Audio Detector with strictly verified Philippines and US radio channels, and five new cat cosmetic lines including secret skeleton outfits.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The four design decisions below were confirmed during clarification and will govern the implementation. Review the full plan and click **Proceed** to begin building, or share any adjustments you would like before code changes start.

- **Confirmed Decision 1 — Favela Dancer Boombox Audio**: Plays the reference dance track outdoors whenever the special NPC places his boombox on the sidewalk and dances, with gentle distance attenuation so it feels grounded outside the storefront window.
- **Confirmed Decision 2 — Next-Step Indicator in Realism Mode**: Both the floating inverted triangle (`▼`) beacon and the boosted golden asset glow remain active in Guided Mode and turn completely off when Realism Mode is enabled.
- **Confirmed Decision 3 — External Audio Detector Architecture**: Combines the enhanced Android native media bridge with a new Browser Tab Audio Capture mode (capturing active tab/window title and live beat reactivity with quick Mute/Pause and inline track controls) so web players can view titles and control playback cleanly.
- **Confirmed Decision 4 — Secret Cat Skeleton Outfits Unlock**: All three Cat Skeleton color variants (Warm White, Gray, Black) stay completely invisible in the Cosmetics Shop until the first Dinosaur costume is unlocked, then appear in the Costume tab as purchasable items at **$350 each**.
- **Recommended Default — Multi-Color Cosmetic Pricing**: Each color variant of the Cat Top Hat (White, Black, Gray at **$250**) and Cat Mustache (Black, Brown, White at **$50**) appears cleanly with color-swatch selectors in its slot tab, matching the existing knit sweater swatch workflow while preserving the original 9-item collection threshold for unlocking the Dinosaur costume.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Special Favela Boombox Dancer NPC**: Replaces the permanently looping street dancer with an episodic special guest who strolls into the street view carrying a retro boombox, sets it down on the sidewalk, plays the reference Brazilian funk beat while performing microscopically beat-synced `L R L RLR L R L R` choreography (hands tucked tight near the upper chest, high crisp knee drives), then picks up the boombox and walks out of frame before returning on a natural cooldown.
  2. **Recessed Counter Ice Compartment**: Moves the obstructed ice source from behind the teapot into a built-in stainless-steel recessed well with an animated hinged lid set directly into the counter below the rinsing sink (`[rinsing sink] [milk] [cup] [steep tea]` / `[ice compartment]`).
  3. **Overhauled Next-Step Indicator**: Upgrades Guided Mode with a crisp bobbing 3D golden inverted triangle (`▼`) floating above the target station asset paired with a richer, unmistakable pulsing golden glow on the asset itself.
  4. **External Audio Detector & Verified PH/US Radio**: Fixes browser/native external music visibility and pause/mute controls, strips every non-US/non-Philippines station across both curated lists and live directory scans, diagnoses and replaces dead Philippine stream URLs, and adds requested PH staples (Love Radio 90.7 FM, Yes! 101.1 / 101.5 / 101.7, Bombo Radyo, Easy Rock 96.3, plus verified US cafe stations).
  5. **Expanded Cat Cosmetics**: Adds five distinctive cosmetic lines — Secret Cat Skeleton Outfits (Warm White, Gray, Black), Cat Top Hat ($250; White, Black, Gray), Platinum Chain (auto-unlocked with Golden Espresso Machine), Cat Mustache ($50 in Eyewear; Black, Brown, White), and Monocle (Eyewear; auto-unlocked at $50,000 total revenue).
- **Target Audience / Persona**: Players running busy espresso/tea shifts in Guided or Realism Mode who customize their cafe cats, listen to local Philippine/US radio or their own background music, and enjoy lively street ambiance outside the window.
- **Key Value**: Removes frustrating Station 4 ice misclicks, makes guided brewing instantly readable at a glance, guarantees working PH/US radio and usable external audio controls, turns the outdoor dancer into a delightful recurring event, and deepens late-game cat collection rewards.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Favela Boombox Dancer Lifecycle (Ambient Street Event)**:
   - Every ~45–75 seconds outdoors, the special Favela NPC enters along the sidewalk holding the boombox at shoulder/hip carry height.
   - Reaching the storefront window mark, he bends briefly to set the boombox onto the pavement; the boombox LEDs pulse and the synced beat audio begins playing outdoors (ducking smoothly if the player mutes game audio or opens the radio/music deck loudly).
   - He performs 2–3 full beat-locked phrases of the exact `L R L RLR L R L R` sequence with hands held tight near the chest and knees lifting sharply on every hit, then stops the boombox, bends to pick it back up, and walks away down the street.
2. **Station 4 Recessed Ice Workflow**:
   - At Station 4, the player sees an unobstructed two-row layout:
     ```
     [ Rinsing Sink ]  [ Milk ]  [ Cup ]  [ Steep Tea ]
     [ Ice Compartment (Recessed Lid) ]
     ```
   - Clicking or tapping the recessed compartment flips its hinged lid smoothly open, reveals frosted ice cubes glowing inside the stainless well, triggers the ice scoop animation into the active cup, and closes the lid softly afterward.
3. **Guided Mode Beacon & Glow**:
   - Whenever a drink step is active in Guided Mode, a sharp 3D golden inverted triangle (`▼`) hovers and gently bobs above the exact next-step tool (grinder, tamper, portafilter, espresso brew, milk pitcher, recessed ice well, teapot, cup, or serve bell) while the asset emits a bright warm-gold rim pulse. Switching on Realism Mode hides both immediately.
4. **Audio Deck — External Detector & PH/US Radio**:
   - **External Mode**: On Android APK, automatically links native media session metadata (title, artist, play/pause/skip). On desktop/mobile web browsers, offers a prominent **"Capture Tab / Music Audio"** button that attaches to the user's playing browser tab (e.g., YouTube Music or Spotify Web), reads the tab's live track title onto the 3D Counter Hologram, drives real-time audio reactivity, and gives working **Mute / Pause Capture**, **Quick Title Edit**, and **Ambience SFX Balance** controls.
   - **Live Radio Mode**: Displays a clean **Philippines (PH)** and **United States (US)** filter toggle alongside live search. Every curated PH station (Love Radio 90.7 FM, Yes! 101.1 FM, 101.5 / 101.7 PH FM, Bombo Radyo, Easy Rock 96.3 FM, etc.) and US station uses live-verified HTTPS streams, and directory scans strictly discard any country outside `PH` and `US`.
5. **Cat Wardrobe — New & Secret Cosmetics**:
   - Opening the Cat Station wardrobe drawer reveals the new items in their respective slots:
     - **Eyewear**: Round Glasses, Thug Life Shades, **Cat Mustache** ($50 with Black / Brown / White swatches), and **Monocle** (auto-unlock progress bar toward $50,000 gross revenue).
     - **Head**: Espresso Beret and **Cat Top Hat** ($250 with White / Black / Gray swatches).
     - **Neck**: Gold Chain and **Platinum Chain** (unlocks automatically with Golden Espresso Machine).
     - **Costume**: Dinosaur Costume initially appears alone; the moment the Dinosaur Costume is unlocked, the three **Secret Cat Skeleton Outfits** (Warm White, Gray, Black — $350 each) materialize in the Costume tab with a subtle "Secret Unlocked" indicator.

### Visual Identity & Theme

- **Aesthetic Direction**: Warm Minimalist Modern Matte cafe craftsmanship (`#1C1917` obsidian HUD surfaces, `#F5EFE6` cream/warm-stone typography, brushed stainless steel and matte slate counter hardware) paired with crisp 3D spatial legibility and zero decorative clutter.
- **Color Palette & Mood**:
  - **Guided Beacon & Glow**: Rich warm amber-gold (`#F59E0B` core / `#FDE68A` emissive highlight) calibrated to read sharply against dark espresso steel, cream porcelain, and matte walnut countertops.
  - **Recessed Ice Well**: Brushed stainless steel rim (`#D4D4D8`), cool frosted ice interior (`#BAE6FD` subtle interior tint), and matte charcoal hinged lid (`#27272A`) with a brushed metal bar pull matching the adjacent rinsing sink.
  - **Cat Cosmetics Materials**:
    - *Cat Skeleton Outfits*: Matte plush bone tones — Warm White (`#F3ECE1`), Ash Gray (`#9CA3AF`), and Obsidian Black (`#1F242B`) with high-contrast rib/skull bone relief so every variant reads crisply on light and dark cats alike.
    - *Cat Top Hat*: Structured felt crown & rolled brim in Ivory White (`#F4F1EA`), Classic Black (`#18181B`), and Heather Gray (`#71717A`) with satin ribbon band.
    - *Platinum Chain*: High-metalness cool platinum-silver (`#E5E7EB`, cool specular sheen) Cuban links + faceted pendant, visually distinct from the warm Gold Chain.
    - *Cat Mustache*: Sculpted handlebar mustache seated cleanly below the cat's nose bridge in Jet Black (`#18181B`), Espresso Brown (`#5C3A21`), and Distinguished White (`#F5F5F4`).
    - *Monocle*: Polished gold/brass single rim with subtle translucent glass lens and delicate draped chain over the right eye.
- **Typography & Hierarchy**: Clean high-contrast geometric sans for UI controls and tabular monospace for frequencies (`90.7 FM`, `101.1 FM`), prices (`$50`, `$250`, `$350`), and revenue milestones (`$50,000`). No extra pill clutter inside modals; compact segmented region filters (`All · PH · US`) and color swatch dots mirror existing wardrobe controls.
- **Interactive Feedback & Motion**:
  - Smooth spring-damped lid hinge opening (`0° → 98°`) when scooping ice from the recessed compartment.
  - Inverted triangle indicator bobs along Y with gentle continuous axial rotation and scale-in/out transitions as the player progresses step by step.
  - Radio stations show real connection states (`TUNING` / `LIVE` / auto-failover recovery toast) without silently falling back to an unrelated foreign channel.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Microscopic Beat Lock via Audio-Clock Driving**
  - *Chosen Approach*: Extract/play the exact rhythm loop segment from the attached reference video's audio track on the outdoor boombox and drive the Favela NPC's keyframe `AnimationMixer` phase directly from `audio.currentTime` (with a beat-exact fallback timer when muted). Re-author the procedural keyframe tracks for `L R L RLR L R L R` so both hands stay tight near the upper chest/collarbone and knees lift high on each alternating and triple-step beat.
  - *Why*: Independent `delta`-accumulated animations drift out of sync with audio within seconds due to frame-rate jitter. Locking animation time to the boombox audio clock guarantees frame-accurate, zero-drift beat alignment.
  - *Alternatives Considered*: Fixed BPM synthetic beat generator — rejected because the user explicitly asked to match the reference video's sound and pacing microscopically.

- **Decision 2 — Recessed Counter Ice Well Geometry & Hitbox**
  - *Chosen Approach*: Place the recessed stainless-steel ice compartment flush into the counter slab directly in front of the rinsing sink (row 2 below `[rinsing sink]`, well clear of `[milk]`, `[cup]`, and `[steep tea]`), with a dedicated generous raycast target covering both the hinged lid and open ice cavity.
  - *Why*: Eliminates the line-of-sight occlusion caused by the relocated teapot while keeping the counter looking authentic to a real specialty coffee bar's drop-in ice well.
  - *Alternatives Considered*: Moving the freestanding ice bucket to the far left edge — rejected because the user specifically requested an in-table recessed compartment with a lid seated below the rinsing sink.

- **Decision 3 — Radio Stream Reliability & Strict PH/US Country Gate**
  - *Chosen Approach*: Replace all dead `radioca.st` and 404 Zeno endpoints with live-tested HTTPS mounts (including official AzuraCast streams for **Love Radio 90.7 FM**, **Yes! 101.1 FM**, **Easy Rock 96.3 FM**, plus verified **101.5 / 101.7**, **Bombo Radyo**, and **US** streams). Remove the forced `crossOrigin = 'anonymous'` requirement on fallback audio playback when a live radio server omits CORS headers (since missing CORS headers was a major hidden cause of working PH stations failing to play in browsers!). Enforce a strict `PH` + `US` country-code allowlist in curated stations, cached directory hydration, and live Radio Browser API queries.
  - *Why*: Solves both root causes discovered during diagnostics: dead legacy URLs + CORS-blocked live Shoutcast/Zeno streams, and unfiltered search queries leaking Indian/Pakistani stations.
  - *Alternatives Considered*: Proxying all radio streams through a custom server relay — avoided for heavy bandwidth overhead; fixing direct HTTPS mounts + CORS-safe playback fallback resolves playback natively and reliably.

- **Decision 4 — Hybrid External Audio Detector (Native Bridge + Browser Tab Capture)**
  - *Chosen Approach*: Keep and harden the Android native `NotificationListener` + `AudioManager` media-key bridge, and add a Web `getDisplayMedia` tab-audio capture path (immediately releasing the video track after reading the tab title so zero screen recording persists) paired with a Web Audio `AnalyserNode` for real-time beat detection, working Pause/Mute toggle, and Media Session API sync.
  - *Why*: Web browsers sandbox OS-level apps like native Spotify for privacy; tab-audio capture is the only standards-compliant browser method that genuinely detects playing background music, extracts the active tab title (e.g., YouTube Music / Spotify Web), and lets the user mute/pause directly from the Audio Deck.
  - *Alternatives Considered*: Pure manual text input with no real audio detection — rejected because it cannot detect active background playback or drive live audio controls.

- **Decision 5 — Secret Cat Skeleton Visibility & Unlock Preservation**
  - *Chosen Approach*: Keep `BASE_CAT_COSMETIC_IDS` strictly unchanged so existing players' Dinosaur Costume progress (`9/9`) is never broken or reset. Mark the three Cat Skeleton variants (`Warm White`, `Gray`, `Black`) with a secret visibility gate (`requiresUnlocked: 'dino_costume'`) so they are omitted completely from the shop UI until `dino_costume` is unlocked, after which they appear in the Costume tab for `$350` each.
  - *Why*: Preserves existing progression fairness while delivering a genuine secret-shop surprise immediately after unlocking the Dinosaur Costume.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### System & Component Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         KLASIK CAFE RUNTIME ARCHITECTURE                     │
└──────────────────────────────────────────────────────────────────────────────┘
          │                          │                           │
          ▼                          ▼                           ▼
┌───────────────────┐   ┌─────────────────────────┐   ┌────────────────────────┐
│ 3D Cafe World     │   │ Unified Audio System    │   │ Cat Cosmetics Engine   │
│                   │   │                         │   │                        │
│ • Favela Dancer   │   │ • PH/US Radio Engine    │   │ • Catalog & Rules      │
│   State Machine:  │   │   - Verified HTTPS URLs │   │   - Secret Skeleton    │
│   Cooldown ->     │   │   - CORS-safe Fallback  │   │     Gate (Dino Owned)  │
│   WalkIn (Carry)  │   │   - Strict PH/US Filter │   │   - Top Hat ($250 x3)  │
│   -> PlaceBox     │   │                         │   │   - Mustache ($50 x3)  │
│   -> Dance Synced │   │ • External Detector     │   │   - Monocle ($50k Rev) │
│      to MP4 Beat  │   │   - Android Native API  │   │   - Platinum Chain     │
│   -> PickUpBox    │   │   - Browser Tab Capture │   │     (Golden Espresso)  │
│   -> WalkOut      │   │     (Title + Analyser   │   │                        │
│                   │   │      + Mute/Pause)      │   │ • Adaptive 3D Rig      │
│ • Station 4 Well  │   │                         │   │   - Preloaded Meshes   │
│   - Recessed Ice  │   │ • 3D Counter Hologram   │   │     for All 7 Cats     │
│     + Hinged Lid  │   │   + Audio Deck Modal    │   │   - Thumbnail Studio   │
│                   │   └─────────────────────────┘   └────────────────────────┘
│ • Guided Beacon   │
│   - Floating ▼    │
│   - Boosted Glow  │
│   - Realism Gate  │
└───────────────────┘
```

### Data Model & State

- **Favela Dancer Lifecycle State**: Tracks `phase` (`cooldown | walk_in | place_boombox | dancing | pickup_boombox | walk_out`), `phaseTimer`, boombox world attachment (`hand` vs. `ground`), and the outdoor boombox `HTMLAudioElement` bound to the reference dance audio loop so `AnimationMixer` time stays locked to audio playback time.
- **Station 4 Recessed Ice State**: Tracks `iceLidOpenTarget` (`0` closed → `1` open) with damped interpolation, updated automatically when the player triggers `add_ice`, hovers/clicks the ice well, or completes the scoop animation.
- **Guided Beacon State**: Resolves the active recommended station tool (only when `realismMode === false`), computes its live world bounding box top center, positions the floating inverted 3D pyramid/chevron above it, and amplifies the target mesh's warm-gold emissive pulse and floor/counter halo.
- **Radio & External Audio Snapshot**:
  - `radioCountryFilter`: `'ALL' | 'PH' | 'US'` (strictly bounded to `PH` and `US` stations everywhere).
  - `externalCaptureActive`, `externalCaptureMuted`, `externalAudioLevel`, and live `externalMedia` (`title`, `artist`, `sourceApp`, `isPlaying`, `isActive`) synchronized across Android native events, Web Tab Capture tracks, Media Session API, and quick manual overrides.
- **Cat Cosmetics Catalog & Unlock Rules**:
  - Adds 11 new cosmetic IDs across the 5 requested items (`skeleton_warm_white`, `skeleton_gray`, `skeleton_black`, `top_hat_white`, `top_hat_black`, `top_hat_gray`, `platinum_chain`, `mustache_black`, `mustache_brown`, `mustache_white`, `monocle`).
  - Extends cosmetic metadata with optional `secretRequiresCosmetic?: CatCosmeticId` so secret items stay excluded from shop rendering until the prerequisite (`dino_costume`) is present in `unlockedCosmetics`, and extends automatic milestone evaluation to unlock `platinum_chain` alongside Golden Espresso Machine ownership and `monocle` at `$50,000` lifetime gross revenue.

### Interactive Component & State Mapping

- **Favela Street Window & Boombox**: Automatic lifecycle updates every frame; respects global SFX/mute settings and automatically pauses boombox playback if the user toggles mute or leaves the active cafe scene.
- **Recessed Ice Compartment**: Clicking or tapping the lid/well dispatches `add_ice`, opens the hinged lid smoothly, runs the ice-cube drop effect into the active cup, and closes the lid once complete.
- **Realism Mode Toggle**: Immediately shows/hides both the floating inverted triangle beacon and the enhanced golden tool glow on the next frame with zero scene rebuild.
- **Audio Deck Modal (Radio & External Tabs)**:
  - Clicking `PH` / `US` / `All` filters curated + scanned stations immediately without ever allowing non-US/PH stations into state.
  - Clicking a radio station attempts primary verified HTTPS playback, retries cleanly without restrictive CORS headers if blocked by a Shoutcast/Zeno server, and only fails over to verified same-region backup streams.
  - Clicking **Capture Tab Audio** in External Mode prompts browser tab audio selection, reads the playing tab's title onto the deck and 3D hologram, enables working **Pause/Mute** and **Stop Capture** buttons, and animates real-time audio reactivity.
- **Cat Wardrobe Drawer**:
  - Dynamically filters `CAT_COSMETICS_CATALOG` by slot and secret unlock visibility so Cat Skeleton variants remain invisible until `dino_costume` is unlocked, then immediately appear for `$350` purchase and live 360° preview.
  - Color-swatch rows in Head (Top Hat), Eyewear (Mustache), Cloth (Knit Vests), and Costume (Secret Skeletons once revealed) let players buy and equip color variants cleanly while hiding overlapping stock collar meshes when either Gold Chain or Platinum Chain is equipped.
