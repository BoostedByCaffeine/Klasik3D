# Living Cafe & World Polish: NPC Physics, Coffee Craft, and Architectural Decor

This upgrade elevates both the outdoor living world and the indoor barista experience by replacing stiff animations and flat reskins with articulated physics-driven NPCs, obstacle-aware crowds, reliable beat-synced Favela street dancing, fluid coffee-making choreography with pastry indicators, natural multi-table lounge seating, and five distinct architectural interior themes.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> All four product preferences from your clarification answers are locked into this plan:
> - **Five New Architectural Decor Themes**: Botanical Greenhouse & Hanging Ferns, Midnight Vinyl Lounge & Edison Bulbs, Parisian Brass Bistro & Marble, Kyoto Timber & Paper Lanterns, and Industrial Loft Brick & Exposed Pipes — each transforming real 3D lighting, ceiling fixtures, wall treatments, floor finishes, and furniture silhouettes rather than recoloring surfaces.
> - **Decor Unlock Economy**: Free starter styles paired with cash-unlockable premium themes and architectural options in the cafe shop.
> - **Dine-In Lounge Pacing**: 35–60 second randomized seated stays with spread-out table assignment so patrons naturally fill all lounge tables instead of reusing a single chair.
> - **GitHub-Safe Favela Boombox Audio**: Relative asset URL resolution for GitHub Pages subpath hosting, paired with an automatic beat-locked synthesized WebAudio Brazilian funk fallback whenever the MP4 cannot load or play.

---

## 1. Overview & Core Concept

- **What It Does**: Overhauls outdoor passerby/overlook life and indoor barista/customer interactions into a cohesive, physically grounded simulation. Outdoor NPCs gain true multi-joint gaits, spring-damped secondary motion, hand-anchored props (phones, trekking poles, boomboxes), sculpted dogs with physics-based catenary leashes, and steering awareness around trees, lamps, and each other. Indoors, every coffee-making step flows smoothly from grind to serve with clear pastry indicators, patrons stay longer across every table and exit around chairs cleanly, and the cafe interior unlocks five genuinely distinct architectural makeovers.
- **Target Audience**: Cafe players who enjoy both focused barista rush gameplay behind the espresso bar and relaxed scenic exploration in Go Outside / Overlook mode.
- **Key Value**: Eliminates immersion-breaking visual glitches (floating props, ghost collisions, popping alley walkers, silent GitHub dance audio, empty tables, stuck exiting patrons) while adding rewarding long-term interior customization.

---

## 2. User Experience & Visual Design

### A. Outdoor Overlook & Passerby Realism
1. **Articulated Walking & Spring Physics**:
   - Every pedestrian, overlook visitor, and alley climber drives full hip, knee, ankle, pelvis bounce, torso twist, shoulder counter-swing, and head stabilization through a spring-damped locomotion solver.
   - Secondary spring motion adds natural bounce to backpacks, hair/ponytails, scarves, and subtle banking tilt when turning around obstacles.
2. **Favela Street Dancer — GitHub Audio, Tight Beat Sync & Cradled Boombox**:
   - Resolves the boombox audio path relative to the app's base URL so it works identically on localhost and GitHub Pages subpaths, automatically falling back to a procedural WebAudio Brazilian baile/funk percussion loop locked to the exact same 169.91 BPM beat clock if the video track fails or is blocked.
   - Tightens dance keyframes onto exact musical beat subdivisions so foot strikes, knee drives, and chest pulses snap cleanly on the beat with zero drift.
   - Anchors the boombox directly to the dancer's right shoulder/hand rig while walking in, setting it down, and picking it up, with the right arm genuinely raised to grip the handle rather than swinging through thin air.
3. **Curved Favela Staircase & Passerby-to-Hillside Lifecycle**:
   - Downhill/uphill Favela NPCs start as normal sidewalk passersby, turn naturally onto the mosaic staircase, and climb with true stair-stepping knee lift and uphill forward lean (and controlled lean when descending).
   - The upper staircase now bends around a **curved landing tucked behind a hillside corner building**, concealing spawn and despawn completely out of the player's sightline so walkers never pop in or out like bubbles.
4. **Hand-Anchored Props & Upgraded NPC Asset Quality**:
   - **Smartphones**: Parented strictly to the gripping hand socket (including a dedicated palm anchor on the exact `.js` Secret NPC rig) with coordinated elbow bend and head tilt so phones never float in mid-air.
   - **Hiker Trekking Poles**: Moved from the torso into the hiker's hand pivots with wrist straps and an authentic pole-planting stride arc synchronized with each footstep.
   - **Sculpted NPC Details**: Refined helmet contours, visor trims, layered hair silhouettes, backpack straps, and subtle material specular differentiation across clothing fabrics.
5. **Sculpted Dogs & Catenary Leash Physics**:
   - Replaces blocky box dogs with charming multi-part sculpted breeds (rounded snout, floppy/perky ears, collar with brass tag, tapered torso, four hinged trotting legs, wagging tail, subtle sniff/head turns).
   - Replaces the rigid rod leash with a multi-segment catenary spring curve between the walker's real hand world position and the dog's collar that visibly dips when slack and tightens dynamically as the dog trots ahead.
6. **Spatial Obstacle & Crowd Awareness**:
   - Outdoor passersby and overlook NPCs evaluate a shared obstacle map (trees, streetlights, benches, cafe fixtures, street furniture) plus dynamic personal-space separation from other NPCs, smoothly steering into passing lanes instead of walking through objects or each other like ghosts.

### B. Coffee-Making Flow, Indoor Customers & Architectural Decor
1. **Fluid Coffee-Making Choreography & Pastry Indicators**:
   - Smooths every barista transition with eased Bezier arcs and spring settle: portafilter grind & bean chute shake -> crisp downward tamp compression with puff -> pressurized espresso extraction with golden crema flow and pressure-gauge needle response -> silky milk-pitcher lift, steam vortex, and tilted latte-art pour arc -> tea steep infusion -> crisp ice drop -> syrup pump press -> fluid counter-slide handoff into the customer's waiting hand.
   - **Pastry Indicators**: Adds unmistakable visual guidance whenever an active or pinned order includes a pastry — a gentle glowing indicator badge and pedestal highlight right over the requested pastry inside the glass display case, paired with a crisp status cue on the HUD order ticket showing whether the pastry is still needed or plated and ready.
2. **Spread-Out 35–60s Lounge Seating & Chair-Safe Exit Routing**:
   - Replaces greedy "always seat 0" assignment with spread-out table selection that distributes dine-in customers across all lounge tables and extends stays to a natural 35–60 seconds so the cafe feels genuinely lived-in.
   - Replaces diagonal exit shortcuts with explicit chair-clearance stand-up vectors: standing patrons step cleanly clear of their chair into the nearest open aisle lane before routing smoothly to the egress corridor and front door, eliminating chair collisions and stuck loops.
3. **Indoor Lighting Upgrade & 5 Unique Architectural Decor Themes**:
   - Elevates base indoor lighting with layered three-point warmth: soft daylight window spill, calibrated pendant/sconce key pools, gentle wood/ceramic specular sheen, and warm evening transitions that never wash out counter details.
   - Expands the Decor customization panel with clean unboxed metadata typography, tabular cash pricing, and six full architectural looks (Free Starter Garage Garden + 5 Cash-Unlockable Themes):
     - **Garage Garden (Starter — Free)**: Warm walnut slats, brushed aluminum pendants, concrete terrazzo floor, and potted fiddle-leaf figs.
     - **Botanical Greenhouse & Hanging Ferns**: Arched conservatory trellis beams, hanging terracotta fern baskets, sunlit glasshouse glow, stone-tile floor, and woven rattan bistro chairs.
     - **Midnight Vinyl Lounge & Edison Bulbs**: Deep walnut acoustic slat walls, warm amber exposed-filament Edison bulb clusters, velvet booth accents, dark smoked oak flooring, and framed LP sleeves.
     - **Parisian Brass Bistro & Marble**: Carrara marble tabletops with brass rims, bentwood bistro chairs, checkered black-and-cream tile floor, fluted brass wall sconces, and Parisian gilt wall mirrors.
     - **Kyoto Timber & Paper Lanterns**: Cedar shoji-inspired lattice panels, glowing washi paper pendant lanterns, warm tatami-border timber flooring, minimalist low-profile wood stools, and bonsai counter accents.
     - **Industrial Loft Brick & Exposed Pipes**: Textured warm red-brick accent wall, matte black iron conduit piping across the ceiling, steel cage factory pendants, reclaimed timber tables, and distressed concrete floor.
   - Keeps existing granular accents (counter wood, mug color, neon sign color, plant density) harmonious alongside the new architectural theme selector, lighting fixtures, and floor/wall finishes.

---

## 3. Key Product Decisions & Trade-Offs

- **Hand-Socket Parenting vs. World-Space Offsets for Props**:
  - *Chosen Approach*: Attach trekking poles, smartphones, and carried boomboxes directly to hand/wrist joints (including dedicated palm sockets on the Secret NPC rig) and animate the arm joints to match.
  - *Why*: Guarantees zero floating separation regardless of walk bounce, turn angle, or frame rate.
  - *Alternatives Considered*: Animating prop positions independently in world space, which caused visible lag and floating drift.
- **Curved Concealed Staircase Top vs. Fade-Out Disappearing**:
  - *Chosen Approach*: Curve the top of each Favela hillside alley behind a flanking corner building so walkers naturally turn out of view before recycling back to the sidewalk.
  - *Why*: Matches real urban hillside architecture and eliminates artificial transparency fading or pop-out bubbles.
- **Dual-Layer Favela Audio (Base-URL MP4 + Synthesized Beat Fallback)**:
  - *Chosen Approach*: Resolve the MP4 via the Vite base path first, and seamlessly switch to an on-beat WebAudio synthesized Brazilian funk rhythm if the media element errors or stalls.
  - *Why*: Ensures the dancer never performs in silence on GitHub Pages or strict browser deployments while keeping the authentic reference track whenever available.
- **Architectural Theme Swapping via Pre-Built Toggleable Fixture Groups**:
  - *Chosen Approach*: Build modular architectural theme groups (ceiling lighting fixtures, wall treatments, floor material swaps, table/chair geometry trims) toggled cleanly with zero scene rebuilds or frame hitches.
  - *Why*: Switching themes in the shop feels instant and crisp while preserving high frame rates on both desktop and mobile WebGL.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Klasik 3D Game State & Rules                     │
│  ┌──────────────────────┐  ┌────────────────────┐  ┌─────────────────┐  │
│  │ Spread Lounge Seating│  │ Architectural Decor│  │ Barista & Pastry│  │
│  │ (35-60s stays, all   │  │ Catalog & Unlocks  │  │ Step State +    │  │
│  │ tables balanced)     │  │ (Free + 5 Themes)  │  │ Readiness Cues  │  │
│  └──────────┬───────────┘  └─────────┬──────────┘  └────────┬────────┘  │
└─────────────┼────────────────────────┼──────────────────────┼───────────┘
              │                        │                      │
              ▼                        ▼                      ▼
┌───────────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
│   Indoor 3D Cafe Engine   │ │  HUD & Shop Views  │ │ Outdoor Living Sim │
│                           │ │                    │ │                    │
│ • Chair-Safe Exit Router  │ │ • Decor Theme Shop │ │ • Spring-Damped    │
│ • Fluid Brew & Serve IK   │ │   (Unlock/Equip)   │ │   Articulated Gait │
│ • Pastry Case Glow Cues   │ │ • Order Strip      │ │ • Obstacle & Crowd │
│ • 6 Architectural Themes  │ │   Pastry Badges    │ │   Steering Engine  │
│   (Lights/Walls/Floors/   │ │ • Live Step Prompt │ │ • Dog + Catenary   │
│   Furniture Silhouettes)  │ │                    │ │   Leash Physics    │
│ • Hand-Anchored Phones    │ │                    │ │ • Hand-Rigged Poles│
│   (incl. Secret NPC rig)  │ │                    │ │ • Favela Curved    │
│                           │ │                    │ │   Alley Lifecycle  │
│                           │ │                    │ │ • Beat-Locked Dance│
│                           │ │                    │ │   + Dual Audio     │
└───────────────────────────┘ └────────────────────┘ └────────────────────┘
```

### Data Model & State
- **Architectural Decor State**: Extends saved cafe decor with `interiorTheme` (`'garage_garden' | 'botanical_greenhouse' | 'midnight_vinyl' | 'parisian_bistro' | 'kyoto_timber' | 'industrial_loft'`) and `unlockedInteriorThemes`, persisted cleanly across save/import and unlocked by the existing cheat/progression helpers while remaining backwards-compatible with older saves.
- **Lounge Seating State**: Tracks occupied seats and table indices across the cafe so newly served dine-in customers pick unoccupied tables evenly and receive randomized 35–60 second stay timers.
- **Outdoor Agent Physics & Steering State**: Each outdoor pedestrian, overlook walker, and Favela alley climber tracks velocity, smoothed lateral steering offset, spring-damped secondary bounce, and obstacle clearance against static scenery colliders and neighbor positions.

### Interactive Component & State Mapping
- **Decor Customization Panel**: Displays starter and cash-unlockable architectural themes with preview metadata, cash cost, unlock button (deducting cash and equipping immediately), and active state indicator, syncing directly into the 3D interior theme switcher and lighting controller.
- **Pastry Display Case & Order HUD**: Active/pinned orders requesting a pastry trigger both a 3D floating highlight/ring above the matching pastry in the display case and a clear status indicator on the order badge that updates immediately once plated and clears on serve.
- **Favela Street Dancer Audio Controller**: Resolves the MP4 relative to the deployment base URL, monitors playback health, falls back seamlessly to the WebAudio 169.91 BPM Brazilian beat generator if unavailable, and drives the 20-bone dance rig and shoulder-cradled boombox strictly from the active beat clock.

### Verification Strategy
- Pure-logic unit tests (`node:test`) covering spread table assignment + 35–60s stay bounds, chair-clearance exit waypoint generation, obstacle/NPC steering separation, catenary leash physics, Favela alley passerby-to-curved-climb state transitions, beat-grid alignment, and architectural theme purchase/equip/save persistence.
- Live headless browser verification confirming zero console errors, smooth customer & outdoor NPC visuals, pastry indicators, and instant architectural interior theme switching.
