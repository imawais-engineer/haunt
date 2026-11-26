import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ECTOPLASM, SCARE_OBJECTS } from "../../src/core/balance";
import { canAfford, regenTick, spend, tryFire, type Cooldowns } from "../../src/core/ectoplasm";

const obj = (id: string) => SCARE_OBJECTS.find((o) => o.id === id)!;

describe("ectoplasm", () => {
  it.each(SCARE_OBJECTS)("$id costs its table cost", (o) => {
    const r = tryFire(ECTOPLASM.start, {}, o, 0);
    expect(r.fired).toBe(true);
    expect(r.ectoplasm).toBe(ECTOPLASM.start - o.cost);
  });

  it("regens +2/s only while unpossessed", () => {
    expect(regenTick(50, 5, false)).toBe(50 + 5 * ECTOPLASM.regenPerSecond);
    expect(regenTick(50, 5, true)).toBe(50);
  });

  it("caps regen at max", () => {
    expect(regenTick(99, 100, false)).toBe(ECTOPLASM.max);
  });

  it("an unaffordable scare does not fire or charge", () => {
    const chandelier = obj("chandelier");
    expect(canAfford(chandelier.cost - 1, chandelier.cost)).toBe(false);
    const r = tryFire(chandelier.cost - 1, {}, chandelier, 0);
    expect(r.fired).toBe(false);
    expect(r.ectoplasm).toBe(chandelier.cost - 1);
  });

  it("enforces per-object cooldown", () => {
    const piano = obj("piano");
    const first = tryFire(100, {}, piano, 0);
    const early = tryFire(first.ectoplasm, first.cooldowns, piano, piano.cooldownSeconds - 1);
    expect(early.fired).toBe(false);
    expect(early.ectoplasm).toBe(first.ectoplasm);
    const later = tryFire(first.ectoplasm, first.cooldowns, piano, piano.cooldownSeconds);
    expect(later.fired).toBe(true);
  });

  it("spend refuses when unaffordable", () => {
    expect(spend(5, 10)).toBe(5);
  });
});

describe("ectoplasm properties", () => {
  const step = fc.record({
    object: fc.constantFrom(...SCARE_OBJECTS),
    dt: fc.double({ min: 0, max: 20, noNaN: true }),
    possessing: fc.boolean(),
    fire: fc.boolean(),
  });

  it("stays in [0, 100] and unaffordable scares never fire or charge", () => {
    fc.assert(
      fc.property(fc.array(step, { maxLength: 80 }), (steps) => {
        let ecto: number = ECTOPLASM.start;
        let cooldowns: Cooldowns = {};
        let now = 0;
        for (const s of steps) {
          now += s.dt;
          if (s.fire) {
            const before = ecto;
            const r = tryFire(ecto, cooldowns, s.object, now);
            if (before < s.object.cost && (r.fired || r.ectoplasm !== before)) return false;
            ecto = r.ectoplasm;
            cooldowns = r.cooldowns;
          } else {
            ecto = regenTick(ecto, s.dt, s.possessing);
          }
          if (ecto < 0 || ecto > ECTOPLASM.max) return false;
        }
        return true;
      }),
    );
  });
});
