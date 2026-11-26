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
