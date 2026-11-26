import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { NIGHT } from "../../src/core/balance";
import { NightTimer, nightOutcome } from "../../src/core/night";
import { createInvestigator, markGone } from "../../src/core/sanity";

const three = (gone: number) =>
  [0, 1, 2].map((i) => (i < gone ? markGone(createInvestigator()) : createInvestigator()));

describe("night timer", () => {
  it("starts at the table duration", () => {
    const t = new NightTimer();
    expect(t.timeLeft).toBe(NIGHT.durationSeconds);
    expect(t.isDawn).toBe(false);
  });

  it("reaches dawn at exactly the duration and clamps at 0", () => {
    const t = new NightTimer();
    t.tick(NIGHT.durationSeconds - 1);
    expect(t.isDawn).toBe(false);
    t.tick(1);
    expect(t.isDawn).toBe(true);
    t.tick(50);
    expect(t.timeLeft).toBe(0);
  });

  it("win when all gone, lose at dawn with anyone inside", () => {
    const t = new NightTimer();
    expect(nightOutcome(three(2), t)).toBe("ongoing");
    expect(nightOutcome(three(3), t)).toBe("win");
    t.tick(NIGHT.durationSeconds);
    expect(nightOutcome(three(2), t)).toBe("lose");
    expect(nightOutcome(three(3), t)).toBe("win");
  });

  it("dawn always arrives at the duration and no action extends it", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ min: -50, max: 50, noNaN: true }), { maxLength: 200 }), (dts) => {
        const t = new NightTimer();
        let prev = t.timeLeft;
        let elapsed = 0;
        for (const dt of dts) {
          t.tick(dt);
          if (t.timeLeft > prev) return false;
          prev = t.timeLeft;
          if (dt > 0) elapsed += dt;
        }
        return t.isDawn === elapsed >= NIGHT.durationSeconds || Math.abs(elapsed - NIGHT.durationSeconds) < 1e-6;
      }),
    );
  });
});
