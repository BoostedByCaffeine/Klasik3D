import * as THREE from 'three';
import { PEDESTRIAN_CORNER_BOUND, ROAD_ELEVATION_LAYERS, type DoorwayStyle } from './outdoorLod';

/**
 * World-space doorway anchor registered by street-corridor sceneries
 * (`busy_street`, `cyberpunk_neon`, `japanese_tranquility`).
 * Real full-detail outdoor sidewalk pedestrians seamlessly walk into & out of these anchors.
 */
export interface AnimatedDoorwayAnchor {
  id: string;
  style: DoorwayStyle;
  /** World-space sidewalk spot immediately outside the doorway. */
  sidewalkEntryPos: { x: number; z: number };
  /** World-space doorway threshold plane. */
  thresholdPos: { x: number; z: number };
  /** World-space recessed interior foyer spot (depth >= 1.55u behind door leaf). */
  foyerHiddenPos: { x: number; z: number };
  /** Outward facing Z direction: +1 opens toward +Z (far sidewalk), -1 opens toward -Z (near sidewalk). */
  facingZ: 1 | -1;
  /** True for Kyoto machiya sliding shoji doors. */
  isJapaneseMachiya: boolean;
  /** Command the door motor to open (true) or close (false). */
  setDoorOpenTarget: (open: boolean) => void;
  /** Current normalized door opening ratio [0..1]. */
  getDoorOpenRatio: () => number;
}

export type DoorwayHandoffPhase =
  | 'SidewalkWalk'
  | 'TurnToDoor'
  | 'WaitDoorOpenIn'
  | 'StepIntoFoyer'
  | 'HiddenInFoyer'
  | 'RecycledOffscreen'
  | 'SpawnedInsideFoyer'
  | 'WaitDoorOpenOut'
  | 'StepOntoSidewalk'
  | 'TurnOntoSidewalk';

/** Structural adapter matching `PooledPedestrian` in `scene3d.ts` without circular imports. */
export interface DoorwayPedestrianAdapter {
  actor: {
    group: THREE.Group;
    pelvisGroup: THREE.Group;
    torsoGroup: THREE.Group;
    leftHipJoint: THREE.Group;
    rightHipJoint: THREE.Group;
    leftKneeJoint: THREE.Group;
    rightKneeJoint: THREE.Group;
    leftShoulderJoint: THREE.Group;
    rightShoulderJoint: THREE.Group;
    leftElbowJoint: THREE.Group;
    rightElbowJoint: THREE.Group;
    neckJoint: THREE.Group;
    umbrellaGroup: THREE.Group;
  };
  laneZ: number;
  currentZ: number;
  x: number;
  dir: 1 | -1;
  speed: number;
  walkPhase: number;
  behavior: string;
  dogRig?: { root: THREE.Group } | null;
}

export const DOORWAY_OPEN_PASS_THRESHOLD = 0.85;
export const DOORWAY_CLOSED_RECYCLE_THRESHOLD = 0.05;
export const DOORWAY_CAPTURE_DX = 0.75;
export const DOORWAY_CAPTURE_DZ = 1.65;
export const DOORWAY_OFFSCREEN_MIN_X = 25.5;

/** Pure guard: checks whether a sidewalk pedestrian is hidden off-screen and eligible to exit a shop door. */
export function isPedestrianOffscreenForDoorwayExit(
  x: number,
  isClaimed: boolean,
  hasDog: boolean
): boolean {
  return !isClaimed && !hasDog && Math.abs(x) >= DOORWAY_OFFSCREEN_MIN_X;
}

/** Pure state-machine transition helper for pedestrian ENTRY (Sidewalk -> Foyer -> Closed Recycle). */
export function evaluateDoorwayEntryStep(
  phase: DoorwayHandoffPhase,
  doorOpenRatio: number,
  walkProgress: number
): {
  nextPhase: DoorwayHandoffPhase;
  wantDoorOpen: boolean;
  shouldRecycleOffscreen: boolean;
} {
  if (phase === 'TurnToDoor') {
    if (walkProgress >= 1) {
      return {
        nextPhase: doorOpenRatio >= DOORWAY_OPEN_PASS_THRESHOLD ? 'StepIntoFoyer' : 'WaitDoorOpenIn',
        wantDoorOpen: true,
        shouldRecycleOffscreen: false,
      };
    }
    return { nextPhase: 'TurnToDoor', wantDoorOpen: true, shouldRecycleOffscreen: false };
  }
  if (phase === 'WaitDoorOpenIn') {
    if (doorOpenRatio >= DOORWAY_OPEN_PASS_THRESHOLD) {
      return { nextPhase: 'StepIntoFoyer', wantDoorOpen: true, shouldRecycleOffscreen: false };
    }
    return { nextPhase: 'WaitDoorOpenIn', wantDoorOpen: true, shouldRecycleOffscreen: false };
  }
  if (phase === 'StepIntoFoyer') {
    if (walkProgress >= 1) {
      return { nextPhase: 'HiddenInFoyer', wantDoorOpen: false, shouldRecycleOffscreen: false };
    }
    return { nextPhase: 'StepIntoFoyer', wantDoorOpen: true, shouldRecycleOffscreen: false };
  }
  if (phase === 'HiddenInFoyer') {
    if (doorOpenRatio <= DOORWAY_CLOSED_RECYCLE_THRESHOLD) {
      return { nextPhase: 'RecycledOffscreen', wantDoorOpen: false, shouldRecycleOffscreen: true };
    }
    return { nextPhase: 'HiddenInFoyer', wantDoorOpen: false, shouldRecycleOffscreen: false };
  }
  return { nextPhase: 'SidewalkWalk', wantDoorOpen: false, shouldRecycleOffscreen: false };
}

/** Pure state-machine transition helper for pedestrian EXIT (Inside Foyer -> Threshold -> SidewalkWalk). */
export function evaluateDoorwayExitStep(
  phase: DoorwayHandoffPhase,
  doorOpenRatio: number,
  walkProgress: number
): {
  nextPhase: DoorwayHandoffPhase;
  wantDoorOpen: boolean;
  releaseToSidewalk: boolean;
} {
  if (phase === 'SpawnedInsideFoyer') {
    return { nextPhase: 'WaitDoorOpenOut', wantDoorOpen: true, releaseToSidewalk: false };
  }
  if (phase === 'WaitDoorOpenOut') {
    if (doorOpenRatio >= DOORWAY_OPEN_PASS_THRESHOLD) {
      return { nextPhase: 'StepOntoSidewalk', wantDoorOpen: true, releaseToSidewalk: false };
    }
    return { nextPhase: 'WaitDoorOpenOut', wantDoorOpen: true, releaseToSidewalk: false };
  }
  if (phase === 'StepOntoSidewalk') {
    if (walkProgress >= 1) {
      return { nextPhase: 'TurnOntoSidewalk', wantDoorOpen: false, releaseToSidewalk: false };
    }
    return { nextPhase: 'StepOntoSidewalk', wantDoorOpen: true, releaseToSidewalk: false };
  }
  if (phase === 'TurnOntoSidewalk') {
    if (walkProgress >= 1) {
      return { nextPhase: 'SidewalkWalk', wantDoorOpen: false, releaseToSidewalk: true };
    }
    return { nextPhase: 'TurnOntoSidewalk', wantDoorOpen: false, releaseToSidewalk: false };
  }
  return { nextPhase: 'SidewalkWalk', wantDoorOpen: false, releaseToSidewalk: true };
}

interface ActiveClaim {
  pedIndex: number;
  anchor: AnimatedDoorwayAnchor;
  phase: DoorwayHandoffPhase;
  progress: number;
  startX: number;
  startZ: number;
  startYaw: number;
  targetDir: 1 | -1;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

/**
 * Coordinates real full-detail outdoor sidewalk pedestrians entering and exiting
 * street-corridor storefront doorways with zero stub mini-NPCs and zero open-street pop-in.
 */
export class DoorwayTrafficController {
  private readonly claimedByPed = new Map<number, ActiveClaim>();
  private readonly claimedByDoorId = new Map<string, ActiveClaim>();
  private readonly pedCooldowns = new Map<number, number>();
  private readonly doorCooldowns = new Map<string, number>();
  private exitSpawnTimer = 2.6;
  private rngCursor = 17;

  private nextRand(): number {
    this.rngCursor = (this.rngCursor * 1664525 + 1013904223) >>> 0;
    return (this.rngCursor & 0xffff) / 0x10000;
  }

  public isPedestrianClaimed(pedIndex: number): boolean {
    return this.claimedByPed.has(pedIndex);
  }

  public reset(pedestrians?: readonly DoorwayPedestrianAdapter[]): void {
    this.claimedByDoorId.forEach((claim) => {
      claim.anchor.setDoorOpenTarget(false);
      const ped = pedestrians?.[claim.pedIndex];
      if (ped) {
        ped.actor.group.visible = true;
      }
    });
    this.claimedByPed.clear();
    this.claimedByDoorId.clear();
    this.pedCooldowns.clear();
    this.doorCooldowns.clear();
    this.exitSpawnTimer = 2.4;
  }

  private releaseClaim(claim: ActiveClaim, pedCooldownSec = 10.0, doorCooldownSec = 4.2): void {
    this.claimedByPed.delete(claim.pedIndex);
    this.claimedByDoorId.delete(claim.anchor.id);
    this.pedCooldowns.set(claim.pedIndex, pedCooldownSec);
    this.doorCooldowns.set(claim.anchor.id, doorCooldownSec);
    claim.anchor.setDoorOpenTarget(false);
  }

  private animatePedWalkCycle(
    ped: DoorwayPedestrianAdapter,
    dt: number,
    isMoving: boolean,
    isRaining: boolean,
    umbrellaAllowed: boolean
  ): void {
    const a = ped.actor;
    const holdingNeon = ped.behavior === 'neon_umbrella';
    a.umbrellaGroup.visible = isRaining && umbrellaAllowed && !holdingNeon;
    if (isMoving) {
      ped.walkPhase += Math.max(0.9, ped.speed) * dt * 5.2;
      const s = Math.sin(ped.walkPhase);
      const c = Math.cos(ped.walkPhase);
      a.pelvisGroup.position.y = 0.58 + Math.abs(s) * 0.03;
      a.pelvisGroup.rotation.z = s * 0.025;
      a.torsoGroup.rotation.y = -s * 0.06;
      a.leftHipJoint.rotation.x = s * 0.44;
      a.rightHipJoint.rotation.x = -s * 0.44;
      a.leftKneeJoint.rotation.x = Math.max(0, -c * 0.48);
      a.rightKneeJoint.rotation.x = Math.max(0, c * 0.48);
      if (a.umbrellaGroup.visible || (holdingNeon && umbrellaAllowed)) {
        a.leftShoulderJoint.rotation.x = -1.26 + Math.abs(s) * 0.03;
        a.leftElbowJoint.rotation.x = -0.3;
      } else {
        a.leftShoulderJoint.rotation.x = -s * 0.34;
        a.leftElbowJoint.rotation.x = -0.2;
      }
      a.rightShoulderJoint.rotation.x = s * 0.34;
      a.rightElbowJoint.rotation.x = -0.2;
      a.neckJoint.rotation.x = 0;
      a.neckJoint.rotation.y = 0;
    } else {
      // Polite pause waiting for door leaf to clear
      a.pelvisGroup.position.y = 0.58;
      a.pelvisGroup.rotation.z = 0;
      a.torsoGroup.rotation.y = 0;
      a.leftHipJoint.rotation.x = 0;
      a.rightHipJoint.rotation.x = 0;
      a.leftKneeJoint.rotation.x = 0;
      a.rightKneeJoint.rotation.x = 0;
      a.leftShoulderJoint.rotation.x = a.umbrellaGroup.visible ? -1.26 : 0;
      a.leftElbowJoint.rotation.x = a.umbrellaGroup.visible ? -0.3 : -0.15;
      a.rightShoulderJoint.rotation.x = 0;
      a.rightElbowJoint.rotation.x = -0.15;
    }
  }

  public update(
    dt: number,
    anchors: readonly AnimatedDoorwayAnchor[],
    pedestrians: readonly DoorwayPedestrianAdapter[],
    isRaining: boolean,
    isPlayerOutside: boolean
  ): void {
    if (!isPlayerOutside || dt <= 0 || anchors.length === 0 || pedestrians.length === 0) return;

    // 1. Tick cooldowns
    this.pedCooldowns.forEach((v, k) => {
      if (v <= dt) this.pedCooldowns.delete(k);
      else this.pedCooldowns.set(k, v - dt);
    });
    this.doorCooldowns.forEach((v, k) => {
      if (v <= dt) this.doorCooldowns.delete(k);
      else this.doorCooldowns.set(k, v - dt);
    });

    const footY = ROAD_ELEVATION_LAYERS.sidewalkTopY;

    // 2. Capture real passing sidewalk pedestrians entering an idle storefront doorway (~25% roll)
    for (let i = 0; i < pedestrians.length; i++) {
      if (this.claimedByPed.has(i) || this.pedCooldowns.has(i)) continue;
      const ped = pedestrians[i];
      if (!ped.actor.group.visible) continue;
      if (ped.dogRig && ped.dogRig.root.visible) continue;
      if (Math.abs(ped.x) > 24.5) continue;

      for (let d = 0; d < anchors.length; d++) {
        const anchor = anchors[d];
        if (this.claimedByDoorId.has(anchor.id) || this.doorCooldowns.has(anchor.id)) continue;
        if (anchor.getDoorOpenRatio() > DOORWAY_CLOSED_RECYCLE_THRESHOLD) continue;

        const dx = Math.abs(ped.x - anchor.sidewalkEntryPos.x);
        const dz = Math.abs(ped.currentZ - anchor.sidewalkEntryPos.z);
        if (dx < DOORWAY_CAPTURE_DX && dz < DOORWAY_CAPTURE_DZ) {
          // Per-pass cooldown so we only roll once as this pedestrian passes this door
          this.pedCooldowns.set(i, 2.2);
          if (this.nextRand() < 0.28) {
            const claim: ActiveClaim = {
              pedIndex: i,
              anchor,
              phase: 'TurnToDoor',
              progress: 0,
              startX: ped.x,
              startZ: ped.currentZ,
              startYaw: ped.actor.group.rotation.y,
              targetDir: ped.dir,
            };
            this.claimedByPed.set(i, claim);
            this.claimedByDoorId.set(anchor.id, claim);
            anchor.setDoorOpenTarget(true);
            break;
          }
        }
      }
    }

    // 3. Periodic EXIT spawn: take an OFF-SCREEN full-detail pedestrian, place inside dark foyer, walk out!
    this.exitSpawnTimer -= dt;
    if (this.exitSpawnTimer <= 0) {
      this.exitSpawnTimer = 3.8 + this.nextRand() * 2.8;
      // Find an idle closed doorway
      const idleDoors = anchors.filter(
        (a) =>
          !this.claimedByDoorId.has(a.id) &&
          !this.doorCooldowns.has(a.id) &&
          a.getDoorOpenRatio() <= DOORWAY_CLOSED_RECYCLE_THRESHOLD
      );
      if (idleDoors.length > 0) {
        // Find an off-screen unclaimed pedestrian
        let chosenPedIdx = -1;
        for (let i = 0; i < pedestrians.length; i++) {
          const ped = pedestrians[i];
          const hasDog = Boolean(ped.dogRig && ped.dogRig.root.visible);
          if (
            !this.pedCooldowns.has(i) &&
            isPedestrianOffscreenForDoorwayExit(ped.x, this.claimedByPed.has(i), hasDog)
          ) {
            chosenPedIdx = i;
            break;
          }
        }
        if (chosenPedIdx >= 0) {
          const anchor = idleDoors[Math.floor(this.nextRand() * idleDoors.length)];
          const ped = pedestrians[chosenPedIdx];
          const outYaw = anchor.facingZ === 1 ? 0 : Math.PI;
          const exitDir: 1 | -1 = this.nextRand() < 0.5 ? 1 : -1;
          ped.x = anchor.foyerHiddenPos.x;
          ped.currentZ = anchor.foyerHiddenPos.z;
          ped.actor.group.visible = true;
          ped.actor.group.position.set(anchor.foyerHiddenPos.x, footY, anchor.foyerHiddenPos.z);
          ped.actor.group.rotation.y = outYaw;
          ped.actor.umbrellaGroup.visible = false;

          const claim: ActiveClaim = {
            pedIndex: chosenPedIdx,
            anchor,
            phase: 'SpawnedInsideFoyer',
            progress: 0,
            startX: anchor.foyerHiddenPos.x,
            startZ: anchor.foyerHiddenPos.z,
            startYaw: outYaw,
            targetDir: exitDir,
          };
          this.claimedByPed.set(chosenPedIdx, claim);
          this.claimedByDoorId.set(anchor.id, claim);
          anchor.setDoorOpenTarget(true);
        }
      }
    }

    // 4. Advance all active doorway claims
    const activeClaims = Array.from(this.claimedByPed.values());
    for (let c = 0; c < activeClaims.length; c++) {
      const claim = activeClaims[c];
      const ped = pedestrians[claim.pedIndex];
      if (!ped) {
        this.releaseClaim(claim, 2, 2);
        continue;
      }
      const { anchor } = claim;
      const ratio = anchor.getDoorOpenRatio();
      const faceInYaw = anchor.facingZ === 1 ? Math.PI : 0;
      const faceOutYaw = anchor.facingZ === 1 ? 0 : Math.PI;

      if (
        claim.phase === 'TurnToDoor' ||
        claim.phase === 'WaitDoorOpenIn' ||
        claim.phase === 'StepIntoFoyer' ||
        claim.phase === 'HiddenInFoyer'
      ) {
        if (claim.phase === 'TurnToDoor') {
          claim.progress = Math.min(1, claim.progress + dt * 2.4);
          const u = claim.progress;
          const px = claim.startX + (anchor.sidewalkEntryPos.x - claim.startX) * u;
          const pz = claim.startZ + (anchor.sidewalkEntryPos.z - claim.startZ) * u;
          ped.x = px;
          ped.currentZ = pz;
          ped.actor.group.position.set(px, footY, pz);
          ped.actor.group.rotation.y = lerpAngle(claim.startYaw, faceInYaw, u);
          this.animatePedWalkCycle(ped, dt, true, isRaining, true);
        } else if (claim.phase === 'WaitDoorOpenIn') {
          ped.actor.group.position.set(anchor.sidewalkEntryPos.x, footY, anchor.sidewalkEntryPos.z);
          ped.actor.group.rotation.y = faceInYaw;
          this.animatePedWalkCycle(ped, dt, false, isRaining, true);
        } else if (claim.phase === 'StepIntoFoyer') {
          claim.progress = Math.min(1, claim.progress + dt * 0.82);
          const u = claim.progress;
          const px = anchor.sidewalkEntryPos.x + (anchor.foyerHiddenPos.x - anchor.sidewalkEntryPos.x) * u;
          const pz = anchor.sidewalkEntryPos.z + (anchor.foyerHiddenPos.z - anchor.sidewalkEntryPos.z) * u;
          ped.x = px;
          ped.currentZ = pz;
          ped.actor.group.position.set(px, footY, pz);
          ped.actor.group.rotation.y = faceInYaw;
          // Collapse umbrella right before crossing door threshold
          this.animatePedWalkCycle(ped, dt, true, isRaining, u < 0.35);
        } else if (claim.phase === 'HiddenInFoyer') {
          ped.actor.group.position.set(anchor.foyerHiddenPos.x, footY, anchor.foyerHiddenPos.z);
          ped.actor.umbrellaGroup.visible = false;
          this.animatePedWalkCycle(ped, dt, false, isRaining, false);
        }

        const step = evaluateDoorwayEntryStep(claim.phase, ratio, claim.progress);
        anchor.setDoorOpenTarget(step.wantDoorOpen);
        if (step.nextPhase !== claim.phase) {
          claim.phase = step.nextPhase;
          claim.progress = 0;
        }
        if (step.shouldRecycleOffscreen) {
          // Door is completely closed (ratio <= 0.05): relocate pedestrian silently to far off-screen edge!
          const spawnSign: 1 | -1 = this.nextRand() < 0.5 ? -1 : 1;
          ped.dir = (spawnSign === -1 ? 1 : -1) as 1 | -1;
          ped.x = spawnSign * (PEDESTRIAN_CORNER_BOUND - 0.5);
          ped.currentZ = ped.laneZ;
          ped.actor.group.visible = true;
          ped.actor.group.position.set(ped.x, footY, ped.currentZ);
          this.releaseClaim(claim, 11.0, 4.5);
        }
      } else {
        // EXIT flow
        if (claim.phase === 'SpawnedInsideFoyer' || claim.phase === 'WaitDoorOpenOut') {
          ped.actor.group.visible = true;
          ped.actor.group.position.set(anchor.foyerHiddenPos.x, footY, anchor.foyerHiddenPos.z);
          ped.actor.group.rotation.y = faceOutYaw;
          this.animatePedWalkCycle(ped, dt, false, isRaining, false);
        } else if (claim.phase === 'StepOntoSidewalk') {
          claim.progress = Math.min(1, claim.progress + dt * 0.78);
          const u = claim.progress;
          const px = anchor.foyerHiddenPos.x + (anchor.sidewalkEntryPos.x - anchor.foyerHiddenPos.x) * u;
          const pz = anchor.foyerHiddenPos.z + (anchor.sidewalkEntryPos.z - anchor.foyerHiddenPos.z) * u;
          ped.x = px;
          ped.currentZ = pz;
          ped.actor.group.position.set(px, footY, pz);
          ped.actor.group.rotation.y = faceOutYaw;
          // Open umbrella (or Kyoto wagasa) once stepping clear of the doorway threshold
          this.animatePedWalkCycle(ped, dt, true, isRaining, u > 0.55);
        } else if (claim.phase === 'TurnOntoSidewalk') {
          claim.progress = Math.min(1, claim.progress + dt * 2.4);
          const u = claim.progress;
          const walkYaw = claim.targetDir === 1 ? Math.PI / 2 : -Math.PI / 2;
          const stepOutX = anchor.sidewalkEntryPos.x + claim.targetDir * 0.55 * u;
          const targetLaneZ = anchor.facingZ === 1 ? -16.85 : -8.25;
          const stepZ = anchor.sidewalkEntryPos.z + (targetLaneZ - anchor.sidewalkEntryPos.z) * u;
          ped.x = stepOutX;
          ped.currentZ = stepZ;
          ped.actor.group.position.set(stepOutX, footY, stepZ);
          ped.actor.group.rotation.y = lerpAngle(faceOutYaw, walkYaw, u);
          this.animatePedWalkCycle(ped, dt, true, isRaining, true);
        }

        const step = evaluateDoorwayExitStep(claim.phase, ratio, claim.progress);
        anchor.setDoorOpenTarget(step.wantDoorOpen);
        if (step.nextPhase !== claim.phase) {
          claim.phase = step.nextPhase;
          claim.progress = 0;
        }
        if (step.releaseToSidewalk) {
          // Hand off seamlessly to normal sidewalk walking loop along the matching sidewalk!
          ped.dir = claim.targetDir;
          ped.laneZ = anchor.facingZ === 1 ? -16.85 : -8.25;
          ped.currentZ = ped.laneZ;
          this.releaseClaim(claim, 12.0, 4.5);
        }
      }
    }
  }
}
