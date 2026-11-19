# Klasik 3D — Mobile Fullscreen, UX, Animation & Modern Garage-Garden Interior Implementation Plan

This phased engineering plan resolves mobile display/fullscreen defects, icon branding, first-boot performance, customer navigation/collision bugs, and 3D interior architecture across the `klasik3d` web, PWA, and Capacitor Android APK builds.

---

## Architecture & Issue Audit Summary

| Area | Observed Defect / Goal | Target Files |
| :--- | :--- | :--- |
| **App Icons & Favicons** | Live web, PWA, and APK still use the legacy red coffee cup icon instead of the Yin-Yang Leaf & Cappuccino Rosetta game logo. | `public/favicon.svg`, `public/*.png`, `public/favicon.ico`, `public/manifest.json`, `twa-manifest.json`, `index.html`, `.github/workflows/android-apk.yml` |
| **Landscape Orientation Cue** | Mobile players need a 1-second `"Turn your phone into landscape"` indicator before the Boosted By Caffeine splash animation starts. | `src/components/LandscapeIntroGate.tsx` (new), `src/App.tsx`, `src/index.css` |
| **First-Time Graphics Default** | First boot defaults to higher graphics presets, causing WebGL shader stall/lag on low-end mobile devices. | `src/App.tsx`, `src/game/rules.ts`, `src/game/scene3d.ts` |
| **Broken Android Loading Screen (`img1`)** | Splash overlay only covers half the viewport and clips the logo off-screen when mobile viewport/rotation shifts, exposing the rotated 3D scene underneath. | `src/components/LoadingScreen.tsx`, `src/App.tsx`, `src/index.css` |
| **Android White Gaps & System Bars (`img2`)** | Left notch/cutout safe area and bottom gesture navigation bar show white gaps; status bar and Android nav bar remain open, blocking true fullscreen. | `index.html`, `src/index.css`, `public/manifest.json`, `capacitor.config.json`, `.github/workflows/android-apk.yml` |
| **Table / Car Collisions (`img2`)** | Customer bistro tables overlap the 1990 Mazda Miata MX-5 showroom fender and windshield footprint. | `src/game/scene3d.ts` |
| **Floating Customers** | After being served, patrons glide across the floor with static legs instead of walking naturally to their tables. | `src/game/scene3d.ts` |
| **Interior Architecture & Decor** | Open vertical fence slats + sphere trees make the scene feel like an outdoor backyard instead of a cozy converted garage-garden cafe interior. | `src/game/scene3d.ts`, `src/components/CustomizeModal.tsx` |

---

## Phase 1: Unified Yin-Yang Leaf & Cappuccino Logo for Web Favicon, PWA & Android APK

### 1.1 Source-of-Truth Vector Icon (`public/favicon.svg`)
Replace `public/favicon.svg` with the standalone **Yin-Yang Botanical Leaf & Cappuccino Rosetta** emblem (warm brass bezel, botanical emerald left half with real leaf veins + coffee bean seed, dark-roast espresso right half with creamy latte-art rosetta fronds + botanical bud seed, connected by a smooth S-curve morphing stem) centered on a `#090705` matte espresso rounded backdrop so it stays sharp at 16px, 32px, 192px, and 512px.

### 1.2 Automated Multi-Platform Icon Generation (`scripts/generate-icons.mjs`)
Generate all required raster assets from `public/favicon.svg` (using `sharp` or `resvg` + `png-to-ico` in Node, or during CI):
* **Live Web:**
  * `public/favicon.svg`
  * `public/favicon-16x16.png` & `public/favicon-32x32.png`
  * `public/favicon.ico` (multi-size 16/32/48)
  * `public/apple-touch-icon.png` (`180x180`, solid `#090705` espresso background, emblem scaled to 86% inside safe zone)
* **PWA (`public/manifest.json` & `twa-manifest.json`):**
  * `public/pwa-192x192.png` (`192x192`)
  * `public/pwa-512x512.png` (`512x512`)
  * `public/pwa-maskable-512x512.png` (`512x512`, full-bleed `#090705` matte espresso background with the Yin-Yang emblem centered at **72% diameter** so Android adaptive squircle/circle masks never clip the brass rim)
* **Android APK Launcher Icons (`.github/workflows/android-apk.yml`):**
  * After `npx cap add android` / `npx cap sync android`, generate and overwrite all Android adaptive & legacy mipmap icons inside `android/app/src/main/res/`:
    * `mipmap-mdpi` (`48x48`), `mipmap-hdpi` (`72x72`), `mipmap-xhdpi` (`96x96`), `mipmap-xxhdpi` (`144x144`), `mipmap-xxxhdpi` (`192x192`) for `ic_launcher.png` and `ic_launcher_round.png`.
    * `ic_launcher_foreground.png` (`432x432` with emblem in central 66% adaptive safe zone) + `values/ic_launcher_background.xml` set to `#090705`.
  * Verify `index.html` references `favicon.svg`, `favicon-32x32.png`, `favicon-16x16.png`, `favicon.ico`, and `apple-touch-icon.png` with cache-busting query `?v=yinyang1`, and bump the Service Worker cache version in `public/sw.js` so installed PWAs refresh their cached icon.

---

## Phase 2: 1-Second "Turn Your Phone Into Landscape" Pre-Splash Indicator

### 2.1 Platform Detection (`src/pwa/pwaManager.ts`)
Add a helper `shouldShowLandscapeCue(): boolean` that returns `true` for:
* Capacitor Android APK (`Boolean((window as any).Capacitor?.isNativePlatform?.())`)
* Installed PWA on mobile (`window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches` + coarse pointer/touch)
* Android / Mobile Live Web (`/(Android|iPhone|iPad|iPod|Mobile)/i.test(navigator.userAgent)` or `window.matchMedia('(pointer: coarse)').matches`)
* Returns `false` on desktop mouse/keyboard browsers so desktop launches go straight into the Crema Ring splash.

### 2.2 `src/components/LandscapeIntroGate.tsx` (New Component)
Mount **before** `<LoadingScreen />` in `src/App.tsx`:
* **Visuals:** Full-viewport `#090705` matte espresso canvas (`position: fixed; inset: 0; z-index: 100000;`) with zero scrollbars and zero white gaps.
* **Animated Icon & Copy:**
  * Minimalist warm-brass (`#E59A3C`) phone outline SVG animating smoothly from portrait `0deg` to landscape `-90deg` with a curved directional arrow.
  * Crisp `#F5F0E8` headline: **`Turn your phone into landscape`**
  * Subtle `#C8924A` subtext: **`Klasik 3D is designed for landscape play`**
* **Timing Choreography (1.0s):**
  * Holds for **`1000ms`** (`0ms–800ms` visible + rotating phone animation, `800ms–1000ms` smooth opacity fade-out of the icon/text while keeping the `#090705` backdrop seamless).
  * Immediately hands off to `<LoadingScreen />` on the exact same `#090705` canvas so there is **zero flash** between the landscape cue and the Crema Ring studio logo draw.
  * On first tap (if user taps early) or mount in fullscreen/APK, opportunistically attempt `screen.orientation?.lock?.('landscape').catch(() => {})`.

```tsx
// Boot sequence in src/App.tsx:
// 'landscape-cue' (1000ms on Android Web / PWA / APK) -> 'studio-splash' (Crema Ring) -> 'ready'
const [bootStage, setBootStage] = useState<'landscape-cue' | 'studio-splash' | 'ready'>(() =>
  shouldShowLandscapeCue() ? 'landscape-cue' : 'studio-splash'
);
```

---

## Phase 3: Always Default Graphics to `low` on First-Time Startup

### 3.1 Guaranteed Low Preset on First Boot (`src/App.tsx`, `src/game/scene3d.ts`, `src/game/rules.ts`)
* Update the initial `graphicsQuality` state initializer in `src/App.tsx` (and default constant in `src/game/scene3d.ts` / `rules.ts`):
  ```ts
  const STORAGE_GFX_KEY = 'klasik3d_gfx_quality_v2';

  const getInitialGraphicsQuality = (): GraphicsQuality => {
    try {
      const saved = window.localStorage.getItem(STORAGE_GFX_KEY);
      if (saved === 'low' || saved === 'medium' || saved === 'high' || saved === 'max') {
        return saved;
      }
    } catch {
      // Ignore storage access errors
    }
    // Always default to 'low' on first launch to prevent shader/VRAM lag on low-end devices
    return 'low';
  };
  ```
* Persist explicit player changes whenever the user toggles `GFX: LOW / MED / HIGH / MAX` in the Title Screen or Pause Menu.
* Verify `low` preset in `src/game/scene3d.ts` applies lightweight settings **before** the very first `renderer.render()` call:
  * `renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0))`
  * `renderer.shadowMap.enabled = false` (use lightweight contact shadow discs under tables, chairs, customers, and Miata so the cafe still looks grounded at zero shadow-pass cost)
  * `antialias: false` or lightweight post-setup, capped particle counts, and deferred high-res texture anisotropy (`anisotropy = 1` on low).

---

## Phase 4: Fix Broken Loading Screen on Live Web Android & PWA (`img1`)

### 4.1 Root Cause Diagnosis (`image_7b3ac4.jpg`)
In `image_7b3ac4.jpg`, the loading overlay covers only the top half of the screen, clips the Boosted By Caffeine wordmark off the left edge, and exposes the rotated 3D Title Screen mug underneath. This happens when:
1. CSS forced-rotation wrappers (`transform: rotate(90deg); width: 100vh; height: 100vw`) or fixed viewport units (`100vw` / `100dvh`) conflict with Android Chrome's dynamic viewport resizing during orientation changes.
2. `<LoadingScreen />` is mounted inside a transformed/scaled app wrapper instead of covering the entire root viewport natively.

### 4.2 Structural Fix (`src/components/LoadingScreen.tsx`, `src/index.css`, `src/App.tsx`)
1. **Remove Any CSS Forced-Rotation Transforms on the Root/Splash Container:** Never CSS-rotate the splash screen container. Keep `<LandscapeIntroGate />` and `<LoadingScreen />` mounted directly at the top level (or via `createPortal(..., document.body)`) with:
   ```css
   .crema-splash-backdrop {
     position: fixed;
     top: 0;
     right: 0;
     bottom: 0;
     left: 0;
     width: 100%;
     height: 100%;
     min-width: 100vw;
     min-height: 100dvh;
     margin: 0;
     padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
     box-sizing: border-box;
     overflow: hidden;
     z-index: 99999;
     background-color: #090705;
     background-image: radial-gradient(circle at center, #140F0A 0%, #090705 72%);
     display: flex;
     align-items: center;
     justify-content: center;
   }
   ```
2. **Fluid Orientation-Agnostic Lockup Sizing:**
   * Ensure `.crema-splash-lockup` uses `max-width: min(92vw, 720px); max-height: 90dvh;` and automatically switches to `flex-direction: column; text-align: center;` whenever `window.innerHeight > window.innerWidth` (`@media (orientation: portrait)`), guaranteeing the Rocket-Coffee emblem and `BOOSTED / BY CAFFEINE` wordmark **never clip off-screen** whether the user holds the phone vertically or horizontally during boot.
3. **Prevent 3D Scene Bleed-Through:**
   * Keep the 3D scene canvas container visually hidden (`visibility: hidden` or behind `z-index: 99999` opaque `#090705` splash) until the splash reaches its exit fade stage, and re-run `scene.handleResize()` on both `resize` and `orientationchange` (with a `120ms` debounce for Android Chrome's delayed viewport settle).

---

## Phase 5: True Fullscreen Immersive Mode & Zero White Gaps on Android (`img2`)

### 5.1 Root Cause Diagnosis (`image_7b3d8e.jpg` & `image_7b3dc7.jpg`)
* **Left White Gap:** Android camera punch-hole / display cutout inset is unstyled when `viewport-fit=cover` and `windowLayoutInDisplayCutoutMode="shortEdges"` are missing, exposing the default white Android window background.
* **Bottom White Gap & Open Navigation/Status Bars:** Capacitor's default Android theme leaves the system status bar and gesture navigation bar visible instead of enabling Sticky Immersive Edge-to-Edge mode.

### 5.2 Web & PWA Layer (`index.html`, `src/index.css`, `public/manifest.json`)
1. **`index.html`:**
   ```html
   <meta
     name="viewport"
     content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
   />
   <meta name="theme-color" content="#090705" />
   <meta name="mobile-web-app-capable" content="yes" />
   <meta name="apple-mobile-web-app-capable" content="yes" />
   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
   ```
2. **`src/index.css`:**
   ```css
   html,
   body,
   #root {
     width: 100%;
     height: 100%;
     margin: 0;
     padding: 0;
     overflow: hidden;
     background-color: #090705 !important;
     overscroll-behavior: none;
     touch-action: manipulation;
   }

   /* Full-bleed WebGL Canvas extends edge-to-edge under cutouts and system bars */
   .game-canvas-container {
     position: fixed;
     inset: 0;
     width: 100%;
     height: 100%;
     background-color: #090705;
   }

   /* Safe-area padding applies ONLY to interactive HUD bars so buttons never sit under camera cutouts */
   .hud-safe-frame {
     padding-top: max(0.5rem, env(safe-area-inset-top));
     padding-right: max(0.75rem, env(safe-area-inset-right));
     padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
     padding-left: max(0.75rem, env(safe-area-inset-left));
   }
   ```
3. **`public/manifest.json` & `twa-manifest.json`:**
   * Set `"display": "fullscreen"`, `"display_override": ["fullscreen", "standalone"]`, `"orientation": "landscape"`, `"background_color": "#090705"`, `"theme_color": "#090705"`.
4. **Live Web Chrome Fullscreen Helper (`src/pwa/pwaManager.ts`):**
   * On Android Live Web (non-native), request `document.documentElement.requestFullscreen({ navigationUI: 'hide' })` on the first explicit user gesture (such as tapping **Start Shift** or a dedicated Fullscreen button in the top bar) and attempt `screen.orientation.lock('landscape')`.

### 5.3 Capacitor & Android APK Native Immersive Layer (`capacitor.config.json` & `.github/workflows/android-apk.yml`)
1. **`capacitor.config.json`:**
   ```json
   {
     "appId": "com.boostedbycaffeine.klasik3d",
     "appName": "Klasik 3D",
     "webDir": "dist",
     "backgroundColor": "#090705",
     "android": {
       "backgroundColor": "#090705",
       "allowMixedContent": true,
       "useLegacyBridge": false
     }
   }
   ```
2. **Patch `AndroidManifest.xml`, `styles.xml`, and `MainActivity.java` in `.github/workflows/android-apk.yml` (before `./gradlew assembleDebug`):**
   * **`AndroidManifest.xml` (`<activity>`):** Force `android:screenOrientation="sensorLandscape"` and `android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"`.
   * **`res/values/styles.xml` (`AppTheme.NoActionBarLaunch` & `AppTheme.NoActionBar`):**
     ```xml
     <item name="android:windowBackground">#090705</item>
     <item name="android:windowFullscreen">true</item>
     <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
     <item name="android:statusBarColor">@android:color/transparent</item>
     <item name="android:navigationBarColor">@android:color/transparent</item>
     <item name="android:enforceNavigationBarContrast">false</item>
     ```
   * **`MainActivity.java` Sticky Immersive Fullscreen:**
     ```java
     @Override
     public void onCreate(Bundle savedInstanceState) {
         super.onCreate(savedInstanceState);
         enableImmersiveFullscreen();
     }

     @Override
     public void onWindowFocusChanged(boolean hasFocus) {
         super.onWindowFocusChanged(hasFocus);
         if (hasFocus) {
             enableImmersiveFullscreen();
         }
     }

     private void enableImmersiveFullscreen() {
         Window window = getWindow();
         WindowCompat.setDecorFitsSystemWindows(window, false);
         window.getDecorView().setBackgroundColor(android.graphics.Color.parseColor("#090705"));
         if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
             WindowManager.LayoutParams lp = window.getAttributes();
             lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
             window.setAttributes(lp);
         }
         WindowInsetsControllerCompat controller =
             WindowCompat.getInsetsController(window, window.getDecorView());
         if (controller != null) {
             controller.setSystemBarsBehavior(
                 WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
             );
             controller.hide(WindowInsetsCompat.Type.systemBars());
         }
     }
     ```
   * Also set the WebView background color to `#090705` (`bridge.getWebView().setBackgroundColor(Color.parseColor("#090705"))`) so zero white pixels can ever appear during cold boot or rotation.

---

## Phase 6: Eliminate Table Collisions with the 1990 Mazda Miata MX-5 (`src/game/scene3d.ts`)

### 6.1 Define the Miata Showroom Exclusion Zone
In `src/game/scene3d.ts`, define explicit showroom footprint constants for the 1990 Mazda Miata MX-5 bay (left showroom display zone):
```ts
const MIATA_BAY = {
  centerX: -3.55,
  centerZ: -3.65,
  rotationY: 0.42, // Angled cleanly toward the espresso bar & skylight
  exclusionRadiusX: 2.35, // Half-length + stanchion/walkway clearance
  exclusionRadiusZ: 1.75, // Half-width + door/walkway clearance
};
```
* Place the Miata onto a sleek **low-profile recessed concrete & walnut showroom plinth** (`4.2m × 2.2m × 0.06m`) bordered with slim matte-black corner wheel stops or warm recessed LED strip trim so the car bay feels intentionally curated inside the garage cafe.

### 6.2 Relocate Bistro Tables & Seating Coordinates with Guaranteed Clearance
Replace the old colliding table placements with a balanced **4-to-5 table interior lounge grid** positioned strictly in the open center-right floor zone (`x >= -0.35`), maintaining at least **`1.35m` clearance** from the Miata showroom plinth and **`1.25m` main customer walkway** in front of the service counter (`z = -1.6` to `-2.4`):

| Table ID | World Position `(x, z)` | Seat A Offset | Seat B Offset | Clearance to Miata Plinth |
| :--- | :--- | :--- | :--- | :--- |
| **Table 1 (Center-Front)** | `(0.15, -2.75)` | `(-0.62, 0)` | `(+0.62, 0)` | `> 1.45m` clear |
| **Table 2 (Right-Front)** | `(2.45, -2.55)` | `(-0.62, 0)` | `(+0.62, 0)` | `> 3.80m` clear |
| **Table 3 (Center-Back)** | `(0.55, -4.65)` | `(-0.62, 0)` | `(+0.62, 0)` | `> 1.85m` clear |
| **Table 4 (Right-Back)** | `(2.75, -4.55)` | `(-0.62, 0)` | `(+0.62, 0)` | `> 4.10m` clear |

* Add a startup validation check in `buildSeatingArea()` that asserts every table and chair lies outside `MIATA_BAY` bounds and clear of the counter apron.

---

## Phase 7: Fluid Customer Walking & Seated Transitions (`src/game/scene3d.ts`)

### 7.1 Waypoint Pathfinding (No Clipping Through Counter or Car)
Instead of linearly interpolating straight from the pickup counter to a table (which cuts across other tables or the Miata), add a lightweight **2-step aisle waypoint queue** on each `ArticulatedCustomerActor`:
* `waypoints: THREE.Vector3[]`
* When transitioning from `ordering/served` -> `seated`:
  1. Step back to the clear lounge aisle (`z = -1.95`, same `x`).
  2. Walk along the open aisle to the table's approach point (`tableX`, `z = -1.95` or aisle corridor).
  3. Step cleanly into the assigned seat position and face the table center.
* When transitioning from `seated` -> `exiting`:
  1. Stand up smoothly (`seatedBlend: 1 -> 0`), step into the aisle, and walk toward the glass garage entrance door.

### 7.2 Articulated Bipedal Walk Cycle & Cup-Carrying Pose
Extend `ArticulatedCustomerActor` with `walkPhase: number`, `walkBlend: number`, `seatedBlend: number`, `lastPos: THREE.Vector3`, and joint references (`leftLeg`, `rightLeg`, `leftArm`, `rightArm`, `bodyGroup`, `torso`, `headJoint`, `heldCupMesh`).

In `updateCustomerAnimations(dt)` inside the main animation loop:
```ts
const dx = actor.currentPos.x - actor.lastPos.x;
const dz = actor.currentPos.z - actor.lastPos.z;
const planarSpeed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
const isWalking = planarSpeed > 0.09;

// Smooth blend weights so transitions never pop
const targetWalkBlend = isWalking ? Math.min(1, planarSpeed / 1.15) : 0;
actor.walkBlend += (targetWalkBlend - actor.walkBlend) * Math.min(1, dt * 10);

const targetSeatedBlend = cust.status === 'seated' && !isWalking ? 1 : 0;
actor.seatedBlend += (targetSeatedBlend - actor.seatedBlend) * Math.min(1, dt * 8);

if (actor.walkBlend > 0.01) {
  // Advance stride phase proportionally to actual ground speed (zero foot sliding)
  actor.walkPhase += Math.max(planarSpeed, 0.8) * dt * 5.8;

  // Smoothly turn customer body toward walking direction
  const targetHeading = Math.atan2(dx, dz);
  const angleDiff = Math.atan2(
    Math.sin(targetHeading - actor.group.rotation.y),
    Math.cos(targetHeading - actor.group.rotation.y)
  );
  actor.group.rotation.y += angleDiff * Math.min(1, dt * 10);
}

const stride = Math.sin(actor.walkPhase);
const bounce = Math.abs(Math.sin(actor.walkPhase));
const wb = actor.walkBlend;
const sb = actor.seatedBlend;

// 1. Leg stride (walking) blended with 90° bend (seated)
actor.leftLeg.rotation.x = stride * 0.62 * wb - 1.42 * sb;
actor.rightLeg.rotation.x = -stride * 0.62 * wb - 1.42 * sb;

// 2. Arm swing (free arm swings naturally; right arm stabilizes served cup!)
const holdingDrink = cust.status === 'served' || cust.status === 'seated';
actor.leftArm.rotation.x = -stride * 0.46 * wb - 0.35 * sb;
actor.rightArm.rotation.x = holdingDrink
  ? -0.92 + Math.sin(actor.walkPhase * 2) * 0.04 * wb // Steady barista cup carry
  : stride * 0.46 * wb - 0.35 * sb;

// 3. Natural double-frequency vertical stride bob, hip sway & subtle shoulder twist
actor.bodyGroup.position.y = bounce * 0.048 * wb - 0.24 * sb;
actor.bodyGroup.rotation.z = Math.cos(actor.walkPhase) * 0.035 * wb;
actor.torso.rotation.y = stride * 0.09 * wb;
actor.headJoint.rotation.y = -stride * 0.05 * wb;

actor.lastPos.copy(actor.currentPos);
```

---

## Phase 8: Modernize Interior & Polish Assets into a True Garage-Garden Cafe (`src/game/scene3d.ts`)

Transform the environment from an open "wooden backyard fence + green spheres" look into a warm, sunlit **converted Tokyo/artisan industrial garage-garden cafe interior** while preserving fast Low-GFX frame rates.

### 8.1 Architectural Enclosure (Eliminate the Backyard Look)
1. **Industrial Glass-Panel Garage Bay Doors (Back Wall, `z = -6.2`):**
   * Replace the open wooden picket slats with **tall sectional black-steel framed glass garage doors** (3 wide bays with slim horizontal steel mullions, semi-transparent tinted conservatory glass `opacity: 0.26`, and a rolled overhead steel track beam along the header).
   * Keep the lush exterior garden courtyard visible **outside** the glass (`z < -7.0`) so players unmistakably feel *inside* a sunlit indoor cafe looking out into a garden.
2. **Exposed Steel Roof Trusses, Timber Rafters & Skylight Atrium (`y = 4.3`):**
   * Span matte charcoal steel I-beams (`#1f2428`) and warm cedar/walnut ceiling slats across the interior ceiling, with recessed frosted glass skylight bays casting soft angled light cones over the Miata and seating area.
   * Suspend **5 warm brushed-brass industrial dome pendant lamps** over the espresso counter and bistro tables with soft glowing filament bulbs (`emissive: #fde68a`).
3. **Polished Interior Flooring & Zoned Textures:**
   * Replace flat ground planes with a procedural **polished architectural micro-cement garage floor** (`CanvasTexture` with subtle trowel mottling and concrete expansion grid lines).
   * Add a **warm slatted walnut lounge mat / rug border** under the 4-table seating area and a **framed showroom concrete plinth** under the Miata.
4. **Side Walls & Craft Shelving (`x = ±5.6`):**
   * Build solid interior walls with lower wainscoting/concrete dado rail, vertical architectural wood slat accents, framed espresso/automotive gallery posters, floating shelves holding stacked vinyl records, roasted bean bags, and ceramic dripper carafes.

### 8.2 Botanical Indoor Garden Polish (Replace Primitive Ball Trees)
* **Interior Planter Beds:** Build sleek concrete-and-walnut floor planter troughs along the glass garage wall corners and beside the archway.
* **Sculpted Multi-Plane Foliage:** Replace plain primitive spheres with layered low-poly **Monstera, Fiddle-Leaf Fig, and Potted Olive/Ficus clusters** built from curved leaf frond planes/ellipses (instanced or merged for low draw calls) + **hanging trailing pothos vines** draping gently from the overhead steel rafters and above the hanging neon sign.
* **Exterior Courtyard Trees:** Move larger canopy trees outside the glass garage bay (`z = -8.2` to `-11.5`) with varied emerald/olive foliage tones for atmospheric depth.

### 8.3 Bar & Furniture Asset Polish
* **Bistro Tables & Chairs:** Slim beveled walnut round tabletops with matte-black pedestal bases, brass foot rings, and curved mid-century cafe chairs with stitched warm-tan leather cushions.
* **Service Counter Upgrade:** Add a brushed-brass recessed kickplate, vertical fluted timber front paneling, clean chamfered countertop overhang, and refined glass-box bevels on the pastry showcase and syrup bottles (with smaller matte pumps and crisp artisan labels).

### 8.4 Full Compatibility with All Customizable Decor Variants (`updateDecorMaterials()` in `src/game/scene3d.ts`)
Ensure every item in `CustomizeModal.tsx` dynamically themes the new interior architecture without leaving orphaned colors:

| Customization Category | New Interior Elements Driven Automatically |
| :--- | :--- |
| **Counter Material / Wood Theme** | Bar countertop slab, fluted bar fascia panels, lounge table tops, and wood slat wall accents. |
| **Wall Style / Interior Finish** | Left/right architectural interior walls, concrete/brick pilasters, and wainscoting dado panels (while keeping the steel glass garage doors crisp). |
| **Floor Style** | Main interior garage floor `CanvasTexture` (polished concrete, warm oak herringbone, speckled terrazzo, or dark slate). |
| **Neon Sign Color (`neonSignColor`)** | Hanging `KLASIK 3D` sign neon tubes, sign face border & subtitle redraw, point light tint, AND a subtle under-counter LED accent strip. |
| **Time / Weather Lighting (`Morning Sun`, `Golden Hour`, `Rainy Roof`)** | Skylight atrium sky tint, glass garage door reflections/raindrop streaks during `Rainy Roof`, pendant lamp emissive warmth (brighter during Golden Hour & Rainy Roof), and directional sunbeam angle. |
| **Installed Shop Upgrades (`upgrades`)** | Cleanly mounted onto the new interior architecture (Walnut Horn Speakers flush against the new steel archway pilasters, Gold Guild Medallion on the brick column, Miata Concours Uplights integrated into the showroom plinth). |

---

## Verification & QA Checklist

- [ ] **Icons:** Live web browser tab, iOS/Android home-screen PWA icon, and built Android APK launcher icon all show the **Yin-Yang Botanical Leaf & Cappuccino Rosetta** emblem with clean maskable padding.
- [ ] **1s Landscape Cue:** Opening on Android Live Web, installed PWA, or APK displays the 1-second `"Turn your phone into landscape"` animated indicator before seamlessly transitioning into the Crema Ring splash on `#090705`.
- [ ] **Default Low GFX:** Fresh browser/APK install (cleared `localStorage`) always starts with `GFX: LOW` active from frame 1; switching to `MED`/`HIGH`/`MAX` persists across reloads.
- [ ] **Android Loading Screen (`img1` fixed):** Splash screen covers 100% of the screen in both portrait and landscape with zero clipping and zero 3D Title Screen bleed-through.
- [ ] **Android True Fullscreen (`img2` fixed):** Zero white gap along the left camera cutout or bottom gesture bar; Android notification bar and navigation bar stay hidden in Sticky Immersive mode.
- [ ] **Car-Table Clearance:** All 4 cafe tables and chairs sit cleanly in the lounge zone with visible walkway clearance around the 1990 Mazda Miata MX-5 plinth.
- [ ] **Fluid Customer Walking:** Served customers turn smoothly toward their aisle waypoint, walk with synchronized leg stride, vertical bounce, arm swing, and steady cup carry, then transition smoothly into a seated posture.
- [ ] **Modern Garage-Garden Interior:** Scene unmistakably reads as a cozy indoor converted garage-garden cafe with steel-framed glass garage bay doors, rafters, pendant lamps, sculpted indoor plants, and full support for all customizable decor variants.