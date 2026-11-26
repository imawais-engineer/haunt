// Haunt — balance table v1
// Single source of truth for ALL tuning numbers. Game logic and scenes
// read this file; nothing else hard-codes a number from this table.

export type Radius = "small" | "medium" | "large";

export interface ScareObject {
  id: "chandelier" | "piano" | "mirror" | "painting";
  room: "entrance" | "study" | "bedroom" | "dining";
  /** Ectoplasm cost to trigger the scare. */
  cost: number;
  /** Sanity damage at point-blank range, before distance falloff. */
  damage: number;
  radius: Radius;
  /** Seconds before the object can scare again. */
  cooldownSeconds: number;
  /** Extra sanity damage when the target was rattled in the last 10s. */
  frightMultiplier: number;
}

export const SCARE_OBJECTS: ScareObject[] = [
  { id: "chandelier", room: "entrance", cost: 20, damage: 25, radius: "large",  cooldownSeconds: 8, frightMultiplier: 1.0 },
  { id: "piano",      room: "study",    cost: 15, damage: 20, radius: "medium", cooldownSeconds: 6, frightMultiplier: 1.0 },
  { id: "mirror",     room: "bedroom",  cost: 10, damage: 15, radius: "small",  cooldownSeconds: 5, frightMultiplier: 1.5 },
  { id: "painting",   room: "dining",   cost: 10, damage: 12, radius: "medium", cooldownSeconds: 4, frightMultiplier: 1.0 },
];

export const SANITY = {
  max: 100,
  start: 100,
  /** Recovery per tick, calm and alone only. */
  recoveryPerTick: 1,
  recoveryTickSeconds: 5,
  rattledAt: 70,
  panickedAt: 35,
  fleeingAt: 0,
} as const;

export const ECTOPLASM = {
  max: 100,
  start: 100,
  /** Regen per second while the ghost is not possessing anything. */
  regenPerSecond: 2,
} as const;

export const NIGHT = {
  /** One night, in seconds. Dawn ends the game immediately at 0. */
  durationSeconds: 300,
  /** Window in which a second scare counts as "chained". */
  frightWindowSeconds: 10,
} as const;

/** Scare reach in pixels per radius label. Beyond this a scare does nothing. */
export const SCARE_RADIUS_PX = {
  small: 150,
  medium: 250,
  large: 400,
} as const;

/**
 * Distance falloff: damage scales linearly from 1.0 at distance 0 down to
 * `edgeFactor` at the radius edge. Outside the radius there is no effect.
 */
export const FALLOFF = {
  edgeFactor: 0.4,
} as const;

/**
 * Investigator personalities (Spec 2). Three numbers each: speed, recovery
 * and investigate tendency. One shared state machine, three parameter sets.
 */
export type InvestigatorKind = "skeptic" | "medium" | "photographer";

export interface Personality {
  /** Walking speed in px/s while investigating. */
  speed: number;
  /** Multiplier on SANITY.recoveryPerTick. */
  recoveryRate: number;
  /** 0..1. At or above `INVESTIGATE.walkTowardAt` the investigator walks toward the last scare. */
  investigateTendency: number;
}

export const PERSONALITIES: Record<InvestigatorKind, Personality> = {
  skeptic:      { speed: 120, recoveryRate: 2,   investigateTendency: 0.9 },
  medium:       { speed: 60,  recoveryRate: 0.5, investigateTendency: 0.2 },
  photographer: { speed: 90,  recoveryRate: 1,   investigateTendency: 0.5 },
};

/** Behaviour by state. Speed factors multiply the personality speed. */
export const BEHAVIOUR = {
  rattledSpeedFactor: 0.5,
  panickedSpeedFactor: 0.75,
  fleeingSpeedFactor: 1.5,
} as const;

export const INVESTIGATE = {
  /** Tendency needed to walk toward the last scare. */
  walkTowardAt: 0.7,
  /** How long a scare location stays interesting, seconds. */
  scareMemorySeconds: 20,
} as const;

export const MEDIUM = {
  /** Distance in px at which the Medium senses a possessed object. */
  senseRadiusPx: 200,
  pauseSeconds: 2,
  /** Seconds before she can pause for the same sensing again. */
  senseCooldownSeconds: 6,
} as const;

export const PHOTOGRAPHER = {
  /** She pauses to photograph this often, seconds. */
  photoIntervalSeconds: 6,
  pauseSeconds: 2,
  /** Flash reveals the ghost's position this long, from the start of the pause. */
  flashSeconds: 1.5,
  /** A scare that lands while she is not paused (facing away) is wasted. */
  wastedWhenFacingAway: true,
} as const;
