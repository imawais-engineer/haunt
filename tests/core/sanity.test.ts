import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { NIGHT, SANITY, SCARE_OBJECTS, SCARE_RADIUS_PX } from "../../src/core/balance";
import { clampEctoplasm } from "../../src/core/ectoplasm";
import {
  clampSanity,
  applyScare,
  createInvestigator,
  markGone,
  recoverTick,
  stateOf,
  type Investigator,
} from "../../src/core/sanity";

const obj = (id: string) => SCARE_OBJECTS.find((o) => o.id === id)!;
const withSanity = (sanity: number, extra: Partial<Investigator> = {}): Investigator => ({
  ...createInvestigator(),
  sanity,
  ...extra,
});

describe("scare damage from the balance table", () => {
  it.each(SCARE_OBJECTS)("$id deals its table damage at point blank", (o) => {
    const r = applyScare(createInvestigator(), o, 0, 0);
    expect(r.fired).toBe(true);
    expect(r.sanity).toBe(SANITY.start - o.damage);
  });

  it("does nothing outside the radius", () => {
    const o = obj("mirror");
    const r = applyScare(createInvestigator(), o, SCARE_RADIUS_PX[o.radius] + 1, 0);
    expect(r.fired).toBe(false);
    expect(r.sanity).toBe(SANITY.start);
  });

  it("deals less damage at a distance", () => {
    const o = obj("piano");
    const near = applyScare(createInvestigator(), o, 0, 0).damage;
    const far = applyScare(createInvestigator(), o, SCARE_RADIUS_PX[o.radius], 0).damage;
    expect(far).toBeLessThan(near);
    expect(far).toBeGreaterThan(0);
  });

  it("never fires on a gone investigator", () => {
    expect(applyScare(markGone(createInvestigator()), obj("piano"), 0, 0).fired).toBe(false);
  });
});

describe("fright multiplier", () => {
  const mirror = obj("mirror");

  it("applies Mirror 1.5x to a rattled target", () => {
    const r = applyScare(withSanity(60), mirror, 0, 5);
    expect(r.chained).toBe(true);
    expect(r.damage).toBeCloseTo(mirror.damage * mirror.frightMultiplier);
  });

  it("applies within the window after being rattled", () => {
    const inv = withSanity(SANITY.start, { lastRattledAt: 0 });
    expect(applyScare(inv, mirror, 0, NIGHT.frightWindowSeconds).chained).toBe(true);
  });

  it("does not apply after the window", () => {
    const inv = withSanity(SANITY.start, { lastRattledAt: 0 });
    const r = applyScare(inv, mirror, 0, NIGHT.frightWindowSeconds + 1);
    expect(r.chained).toBe(false);
    expect(r.damage).toBe(mirror.damage);
  });

  it("does not apply to a calm target", () => {
    expect(applyScare(createInvestigator(), mirror, 0, 0).chained).toBe(false);
  });
});

describe("state thresholds", () => {
  it("maps sanity to states at 70 / 35 / 0", () => {
    expect(stateOf(withSanity(100))).toBe("investigate");
    expect(stateOf(withSanity(SANITY.rattledAt))).toBe("investigate");
    expect(stateOf(withSanity(SANITY.rattledAt - 1))).toBe("rattled");
    expect(stateOf(withSanity(SANITY.panickedAt))).toBe("rattled");
    expect(stateOf(withSanity(SANITY.panickedAt - 1))).toBe("panicked");
    expect(stateOf(withSanity(SANITY.fleeingAt))).toBe("fleeing");
  });

  it("is gone only when set externally", () => {
    expect(stateOf(markGone(withSanity(0)))).toBe("gone");
  });
});

describe("recovery", () => {
  it("recovers +1 per 5s when calm and alone", () => {
    const r = recoverTick(withSanity(90), SANITY.recoveryTickSeconds * 2, true);
    expect(r.sanity).toBe(90 + 2 * SANITY.recoveryPerTick);
  });

  it("accumulates partial ticks", () => {
    let inv = withSanity(90);
    for (let i = 0; i < 5; i++) inv = recoverTick(inv, 1, true);
    expect(inv.sanity).toBe(91);
  });

  it("does not recover when not alone", () => {
    expect(recoverTick(withSanity(90), 50, false).sanity).toBe(90);
  });

  it.each([60, 30, 0])("does not recover at sanity %d", (s) => {
    expect(recoverTick(withSanity(s), 50, true).sanity).toBe(s);
  });

  it("caps at max", () => {
    expect(recoverTick(withSanity(99), 500, true).sanity).toBe(SANITY.max);
  });
});

const scareArb = fc.record({
  object: fc.constantFrom(...SCARE_OBJECTS),
  distance: fc.double({ min: -100, max: 1000, noNaN: true }),
  dt: fc.double({ min: 0, max: 30, noNaN: true }),
  alone: fc.boolean(),
  recover: fc.boolean(),
});

describe("properties", () => {
  it("sanity always stays in [0, 100]", () => {
    fc.assert(
      fc.property(fc.array(scareArb, { maxLength: 60 }), (steps) => {
        let inv = createInvestigator();
        let now = 0;
        for (const s of steps) {
          now += s.dt;
          inv = s.recover
            ? recoverTick(inv, s.dt, s.alone)
            : applyScare(inv, s.object, s.distance, now).investigator;
          if (inv.sanity < 0 || inv.sanity > SANITY.max) return false;
        }
        return true;
      }),
    );
  });

  it("an extra scare never raises sanity", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.constantFrom(...SCARE_OBJECTS),
        fc.double({ min: -100, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 300, noNaN: true }),
        (sanity, object, distance, now) =>
          applyScare(withSanity(sanity), object, distance, now).sanity <= sanity,
      ),
    );
  });

  it("recovery never lowers sanity", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.boolean(),
        (sanity, dt, alone) => recoverTick(withSanity(sanity), dt, alone).sanity >= sanity,
      ),
    );
  });
});

describe("NaN handling", () => {
  it("clampSanity fails toward a scared investigator, like clampEctoplasm", () => {
    expect(clampSanity(Number.NaN)).toBe(0);
    expect(clampEctoplasm(Number.NaN)).toBe(0);
  });
});
