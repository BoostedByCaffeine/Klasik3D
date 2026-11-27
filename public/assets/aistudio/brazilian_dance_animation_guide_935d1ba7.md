# Brazilian Dance Animation Guide

Use this specification as a direct animation prompt or keyframe blueprint. All timings are parameterized to **88 BPM** ($1\text{ beat} \approx 0.68\text{s}$, $0.5\text{ beat} \approx 0.34\text{s}$) so the choreography scales cleanly if you change the tempo later.

---

## 1. Loop Timeline & Step Sequence (8-Beat Seamless Loop)

Total cycle duration at **88 BPM**: **5.45s** (two mirrored 4-beat phrases). Direction is from the **character's perspective** (`R` = character's right, `L` = character's left).

| Step | Time (`t`) | Duration | Beat | Target Pose | Type | Amplitude |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `0.00s` | `0.68s` | 1.0 | **Pose R** | Slow | 100% |
| **2** | `0.68s` | `0.68s` | 1.0 | **Pose L** | Slow | 100% |
| **3** | `1.36s` | `0.68s` | 1.0 | **Pose R** | Slow | 100% |
| **4** | `2.04s` | `0.34s` | 0.5 | **Pose L** | Fast Burst 1 | 70% |
| **5** | `2.38s` | `0.34s` | 0.5 | **Pose R** | Fast Burst 2 | 70% |
| **6** | `2.72s` | `0.68s` | 1.0 | **Pose L** *(Phrase 2 start)* | Slow (Landing) | 100% |
| **7** | `3.40s` | `0.68s` | 1.0 | **Pose R** | Slow | 100% |
| **8** | `4.08s` | `0.68s` | 1.0 | **Pose L** | Slow | 100% |
| **9** | `4.76s` | `0.34s` | 0.5 | **Pose R** | Fast Burst 1 | 70% |
| **10** | `5.10s` | `0.34s` | 0.5 | **Pose L** | Fast Burst 2 | 70% |
| *Loop* | `5.44s` | — | — | *Wraps seamlessly to Step 1 (**Pose R**)* | — | — |

---

## 2. Target Pose Definitions

Animate by interpolating between two mirrored base poses (**Pose R** and **Pose L**), scaling rotations/offsets down to **~70%** on fast burst steps so the double-time transition stays tight and snappy.

### Pose R (Weight on Right Leg)
* **Legs & Feet:** Plant the right foot flat with a soft knee bend ($\sim 15^\circ$). Pop the left knee slightly inward and forward, lifting the left heel/foot off the ground ($\sim 10\text{–}15\text{ cm}$) as a quick step-kick.
* **Hips / Pelvis:** Shift pelvis laterally to the right (`+X` or character-right) and dip vertically on step impact. Tilt pelvis slightly upward on the lifted left side.
* **Torso & Shoulders:** Twist upper torso **$\sim 15^\circ\text{–}20^\circ$ toward the right** (`Y-rotation`), with a slight relaxed lean back/left for groove.
* **Arms (Signature Shape):** Keep both elbows bent at $\sim 90^\circ$ with loose fists.
  * **Left arm (lead/cross):** Swing diagonally across the chest so the left hand finishes near the **right shoulder/collarbone**.
  * **Right arm (flare):** Pull the right elbow outward to the **right side** at rib-to-chest height, forearm angled slightly up and out.
* **Head:** Keep facing forward toward the camera (counter-rotate slightly against torso yaw) with a subtle downward nod on each beat impact.

### Pose L (Exact Mirror of Pose R)
* **Legs & Feet:** Plant left foot with soft knee bend; pop right knee inward and lift right foot/heel slightly.
* **Hips / Pelvis:** Shift laterally to the left with vertical dip.
* **Torso & Shoulders:** Twist **$\sim 15^\circ\text{–}20^\circ$ toward the left**.
* **Arms:** Right arm crosses chest up to the **left shoulder/collarbone**; left arm flares outward to the **left side**.
* **Head:** Counter-rotated toward camera with subtle beat nod.

---

## 3. Pacing Curve, Snap & Bounce Rules

Do **not** use linear or plain sine interpolation between steps—that makes the dance look floaty. Use a fast snap into the pose followed by a settling bounce during the hold:

* **Snap-to-Hold Split:**
  * **Slow steps (`0.68s`):** Complete **85–90%** of the transition from the previous pose in the first **`0.18s`** ($u = 0.0 \rightarrow 0.26$), then hold the remaining **`0.50s`** with subtle settle/bounce.
  * **Fast steps (`0.34s`):** Complete the snap in the first **`0.14s`** ($u = 0.0 \rightarrow 0.41$), holding the peak pose for **`0.20s`** before snapping directly into the next step.
* **Vertical Groove Bounce (Pelvis Y):**
  * Trigger a downward knee/hip dip right at step arrival ($u \approx 0.20$), rebounding gently upward during the hold ($u = 0.30 \rightarrow 0.85$), then dipping slightly into the next crossover.
  * Keep bounce depth full (`1.0x`) on slow steps and reduced (`0.5x`) on fast steps so the double-time footwork stays grounded.

---

## 4. Ready-to-Use Timing & Interpolation Logic

Drop this loop structure directly into a procedural animation controller or hand it to a coding assistant alongside your character rig:

```javascript
const BPM = 88;
const BEAT = 60 / BPM; // ~0.6818s

// dir: +1 = Pose R, -1 = Pose L
const DANCE_STEPS = [
  // Phrase 1
  { dir: +1, beats: 1.0, fast: false },
  { dir: -1, beats: 1.0, fast: false },
  { dir: +1, beats: 1.0, fast: false },
  { dir: -1, beats: 0.5, fast: true  }, // Quick burst: L
  { dir: +1, beats: 0.5, fast: true  }, // Quick burst: R
  // Phrase 2 (Mirrored)
  { dir: -1, beats: 1.0, fast: false }, // Landing: L
  { dir: +1, beats: 1.0, fast: false },
  { dir: -1, beats: 1.0, fast: false },
  { dir: +1, beats: 0.5, fast: true  }, // Quick burst: R
  { dir: -1, beats: 0.5, fast: true  }, // Quick burst: L
];

// Given elapsed time `t` (seconds):
// 1. Find active step index `i` and normalized step progress `u` in [0, 1).
// 2. Previous step direction = DANCE_STEPS[(i - 1 + N) % N].dir.
// 3. Snap easing (fast ease-out, hits peak early and holds):
const snapRatio = step.fast ? 0.42 : 0.27;
const snapT = Math.min(1, u / snapRatio);
const eased = 1 - Math.pow(1 - snapT, 3); // Cubic ease-out

// 4. Current lateral pose value in [-1, +1], scaled down on fast bursts:
const prevAmp = prevStep.fast ? 0.70 : 1.0;
const currAmp = step.fast ? 0.70 : 1.0;
const poseBlend = (prevStep.dir * prevAmp) * (1 - eased)
                + (step.dir * currAmp) * eased;

// 5. Vertical hip bounce (dips on impact, settles during hold):
const bounceAmp = step.fast ? 0.5 : 1.0;
const hipBounce = -Math.sin(Math.min(1, u / 0.55) * Math.PI) * bounceAmp;

// 6. Drive rig transforms from `poseBlend` (arm cross/flare, torso yaw,
//    hip X shift, lifted knee) and `hipBounce` (pelvis Y, knee flex, head nod).
```