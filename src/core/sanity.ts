import {
  FALLOFF,
  NIGHT,
  SANITY,
  SCARE_RADIUS_PX,
  type ScareObject,
} from "./balance";

export type InvestigatorState =
  | "investigate"
  | "rattled"
  | "panicked"
  | "fleeing"
  | "gone";

export interface Investigator {
  readonly sanity: number;
  /** Set externally when the investigator reaches the door. */
  readonly gone: boolean;
  /** Time (seconds) of the last moment this investigator was seen rattled. */
  readonly lastRattledAt: number | null;
  /** Calm-and-alone seconds accumulated toward the next recovery tick. */
  readonly calmSeconds: number;
}

export interface ScareResult {
  readonly investigator: Investigator;
  readonly sanity: number;
  readonly fired: boolean;
  readonly damage: number;
  readonly chained: boolean;
}

export function clampSanity(value: number): number {
  // Fail toward a scared investigator, matching clampEctoplasm(NaN) = 0.
  if (Number.isNaN(value)) return 0;
  return Math.min(SANITY.max, Math.max(0, value));
}

export function createInvestigator(): Investigator {
  return { sanity: SANITY.start, gone: false, lastRattledAt: null, calmSeconds: 0 };
}

export function stateOf(inv: Investigator): InvestigatorState {
  if (inv.gone) return "gone";
  if (inv.sanity <= SANITY.fleeingAt) return "fleeing";
  if (inv.sanity < SANITY.panickedAt) return "panicked";
  if (inv.sanity < SANITY.rattledAt) return "rattled";
  return "investigate";
}

export function markGone(inv: Investigator): Investigator {
  return { ...inv, gone: true };
}

/** Damage multiplier from distance: 1 at 0, edgeFactor at the radius edge, 0 outside. */
export function distanceFactor(object: ScareObject, distance: number): number {
  const radius = SCARE_RADIUS_PX[object.radius];
  const d = Math.max(0, distance);
  if (Number.isNaN(d) || d > radius) return 0;
  return 1 - (1 - FALLOFF.edgeFactor) * (d / radius);
}

function wasRecentlyRattled(inv: Investigator, now: number): boolean {
  if (inv.sanity < SANITY.rattledAt) return true;
  return inv.lastRattledAt !== null && now - inv.lastRattledAt <= NIGHT.frightWindowSeconds;
}

/**
 * Resolve one scare against one investigator. Pure: returns a new investigator.
 * Does not fire when the investigator is gone or outside the object's radius.
 */
export function applyScare(
  inv: Investigator,
  object: ScareObject,
  distance: number,
  now: number,
): ScareResult {
  const factor = inv.gone ? 0 : distanceFactor(object, distance);
  if (factor <= 0) {
    return { investigator: inv, sanity: inv.sanity, fired: false, damage: 0, chained: false };
  }
  const chained = wasRecentlyRattled(inv, now);
  const damage = object.damage * factor * (chained ? object.frightMultiplier : 1);
  const sanity = clampSanity(inv.sanity - damage);
  const lastRattledAt = sanity < SANITY.rattledAt ? now : inv.lastRattledAt;
  const investigator: Investigator = { ...inv, sanity, lastRattledAt, calmSeconds: 0 };
  return { investigator, sanity, fired: true, damage, chained };
}

/**
 * Advance recovery by dt seconds. Only a calm investigator who is alone
 * recovers; otherwise the progress toward the next tick resets.
 */
export function recoverTick(inv: Investigator, dt: number, alone: boolean): Investigator {
  const calm = alone && stateOf(inv) === "investigate";
  if (!calm) return inv.calmSeconds === 0 ? inv : { ...inv, calmSeconds: 0 };
  if (!(dt > 0)) return inv;
  const total = inv.calmSeconds + dt;
  const ticks = Math.floor(total / SANITY.recoveryTickSeconds);
  return {
    ...inv,
    sanity: clampSanity(inv.sanity + ticks * SANITY.recoveryPerTick),
    calmSeconds: total - ticks * SANITY.recoveryTickSeconds,
  };
}
