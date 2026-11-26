import { describe, expect, it } from "vitest";
import { NIGHT } from "../../src/core/balance";
import { dawnProgress, formatClock } from "../../src/game/dawn";

describe("dawn helpers", () => {
  it("progress runs from 0 to 1 and clamps", () => {
    expect(dawnProgress(NIGHT.durationSeconds)).toBe(0);
    expect(dawnProgress(0)).toBe(1);
    expect(dawnProgress(-5)).toBe(1);
    expect(dawnProgress(NIGHT.durationSeconds * 2)).toBe(0);
  });
  it("formats the clock", () => {
    expect(formatClock(300)).toBe("5:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(-1)).toBe("0:00");
  });
});
