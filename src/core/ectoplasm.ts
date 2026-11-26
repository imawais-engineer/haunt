import { ECTOPLASM, type ScareObject } from "./balance";

export type Cooldowns = Readonly<Record<string, number>>;

export interface FireResult {
  readonly fired: boolean;
  readonly ectoplasm: number;
  readonly cooldowns: Cooldowns;
}

export function clampEctoplasm(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(ECTOPLASM.max, Math.max(0, value));
}

export function canAfford(ectoplasm: number, cost: number): boolean {
  return ectoplasm >= cost;
}

export function spend(ectoplasm: number, cost: number): number {
  return canAfford(ectoplasm, cost) ? clampEctoplasm(ectoplasm - cost) : ectoplasm;
}

/** Regen only while the ghost is not possessing anything. */
export function regenTick(ectoplasm: number, dt: number, possessing: boolean): number {
  if (possessing || !(dt > 0)) return ectoplasm;
  return clampEctoplasm(ectoplasm + ECTOPLASM.regenPerSecond * dt);
}

export function isReady(cooldowns: Cooldowns, object: ScareObject, now: number): boolean {
  const readyAt = cooldowns[object.id];
  return readyAt === undefined || now >= readyAt;
}

/** Fire a scare if it is off cooldown and affordable. Otherwise nothing changes. */
export function tryFire(
  ectoplasm: number,
  cooldowns: Cooldowns,
  object: ScareObject,
  now: number,
): FireResult {
  if (!isReady(cooldowns, object, now) || !canAfford(ectoplasm, object.cost)) {
    return { fired: false, ectoplasm, cooldowns };
  }
  return {
    fired: true,
    ectoplasm: spend(ectoplasm, object.cost),
    cooldowns: { ...cooldowns, [object.id]: now + object.cooldownSeconds },
  };
}
