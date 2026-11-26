import { describe, expect, it } from "vitest";
import { ECTOPLASM, NIGHT, SANITY, SCARE_OBJECTS } from "../../src/core/balance";
import { regenTick, tryFire, type Cooldowns } from "../../src/core/ectoplasm";
import { applyScare, createInvestigator } from "../../src/core/sanity";

const piano = SCARE_OBJECTS.find((o) => o.id === "piano")!;

describe("scripted night: possess piano, scare Medium twice, chained", () => {
  it("drops sanity as the table says and keeps invariants", () => {
    let ecto: number = ECTOPLASM.start;
    let cooldowns: Cooldowns = {};
    let inv = createInvestigator();
    let now = 0;

    // Possessing the piano: no regen.
    ecto = regenTick(ecto, 3, true);
    expect(ecto).toBe(ECTOPLASM.start);

    const first = tryFire(ecto, cooldowns, piano, now);
    expect(first.fired).toBe(true);
    ecto = first.ectoplasm;
    cooldowns = first.cooldowns;
    inv = applyScare(inv, piano, 0, now).investigator;
    expect(inv.sanity).toBe(SANITY.start - piano.damage);

    now += piano.cooldownSeconds;
    expect(now).toBeLessThanOrEqual(NIGHT.frightWindowSeconds);
    const second = tryFire(ecto, cooldowns, piano, now);
    expect(second.fired).toBe(true);
    ecto = second.ectoplasm;
    const r = applyScare(inv, piano, 0, now);
    inv = r.investigator;

    const expected = SANITY.start - piano.damage - piano.damage * (r.chained ? piano.frightMultiplier : 1);
    expect(inv.sanity).toBeCloseTo(expected);
    expect(ecto).toBe(ECTOPLASM.start - 2 * piano.cost);
    expect(inv.sanity).toBeGreaterThanOrEqual(0);
    expect(inv.sanity).toBeLessThanOrEqual(SANITY.max);
    expect(ecto).toBeGreaterThanOrEqual(0);
  });
});
