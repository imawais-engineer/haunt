import { describe, expect, it } from "vitest";
import { ECTOPLASM, SANITY, SCARE_OBJECTS } from "../../src/core/balance";
import { regenTick, tryFire, type Cooldowns } from "../../src/core/ectoplasm";
import { applyScare, createInvestigator } from "../../src/core/sanity";

const piano = SCARE_OBJECTS.find((o) => o.id === "piano")!;

const chandelier = SCARE_OBJECTS.find((o) => o.id === "chandelier")!;
const mirror = SCARE_OBJECTS.find((o) => o.id === "mirror")!;

describe("scripted night: possess piano, scare Medium repeatedly", () => {
  it("drops sanity as the table says and chains once the target is rattled", () => {
    let ecto: number = ECTOPLASM.start;
    let cooldowns: Cooldowns = {};
    let inv = createInvestigator();

    // Possessing the piano: no regen.
    ecto = regenTick(ecto, 3, true);
    expect(ecto).toBe(100);

    const fire = (now: number) => {
      const f = tryFire(ecto, cooldowns, piano, now);
      expect(f.fired).toBe(true);
      ecto = f.ectoplasm;
      cooldowns = f.cooldowns;
      const r = applyScare(inv, piano, 0, now);
      inv = r.investigator;
      return r;
    };

    // 100 -> 80: first scare is never chained.
    expect(fire(0).chained).toBe(false);
    expect(inv.sanity).toBe(80);
    // 80 -> 60: target was not rattled (80 >= 70), so still unchained.
    expect(fire(6).chained).toBe(false);
    expect(inv.sanity).toBe(60);
    // 60 -> 40: target is rattled (60 < 70), chained; piano multiplier is 1.0.
    const third = fire(12);
    expect(third.chained).toBe(true);
    expect(third.damage).toBe(20);
    expect(inv.sanity).toBe(40);
    expect(ecto).toBe(55);
  });

  it("chains a Mirror scare after the target is rattled, with the multiplier applied", () => {
    let inv = createInvestigator();
    inv = applyScare(inv, chandelier, 0, 0).investigator;
    expect(inv.sanity).toBe(75);
    inv = applyScare(inv, piano, 0, 1).investigator;
    expect(inv.sanity).toBe(55);

    const r = applyScare(inv, mirror, 0, 2);
    expect(r.chained).toBe(true);
    expect(r.damage).toBe(22.5);
    expect(r.sanity).toBe(32.5);
    expect(r.sanity).toBeGreaterThanOrEqual(0);
    expect(r.sanity).toBeLessThanOrEqual(SANITY.max);
  });

  it("does not chain a Mirror scare against a calm target", () => {
    const r = applyScare(createInvestigator(), mirror, 0, 0);
    expect(r.chained).toBe(false);
    expect(r.sanity).toBe(85);
  });
});
