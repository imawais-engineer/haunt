import { describe, expect, it } from "vitest";
import { ECTOPLASM, GHOST } from "../../src/core/balance";
import { barkFor, ectoFlashFor, ectoplasmLabel, tickPosition, ghostBob, headingGaveUp, insufficientMessage, noticeFade, scareBlockedMessage } from "../../src/game/effects";
import { BARKS, POLISH, TEXT } from "../../src/game/presentation";

describe("insufficient ectoplasm feedback", () => {
  it("returns the message only when ectoplasm is below the cost", () => {
    expect(insufficientMessage(GHOST.possessCost - 1, GHOST.possessCost)).toBe(TEXT.insufficient);
    expect(insufficientMessage(GHOST.possessCost, GHOST.possessCost)).toBeNull();
    expect(insufficientMessage(100, GHOST.possessCost)).toBeNull();
  });
  it("scare block prefers ectoplasm over cooldown", () => {
    expect(scareBlockedMessage(5, 10, true)).toBe(TEXT.insufficient);
    expect(scareBlockedMessage(5, 10, false)).toBe(TEXT.insufficient);
    expect(scareBlockedMessage(10, 10, false)).toBe(TEXT.recharging);
    expect(scareBlockedMessage(10, 10, true)).toBeNull();
  });
  it("detects a heading that gave up for lack of ectoplasm", () => {
    expect(headingGaveUp("piano", null, null, 2, 6)).toBe(true);
    expect(headingGaveUp("piano", null, null, 6, 6)).toBe(false);
    expect(headingGaveUp("piano", null, "piano", 2, 6)).toBe(false);
    expect(headingGaveUp("piano", "piano", null, 2, 6)).toBe(false);
    expect(headingGaveUp(null, null, null, 2, 6)).toBe(false);
  });
  it("notice fades from 1 to 0", () => {
    expect(noticeFade(5, 5)).toBe(1);
    expect(noticeFade(5 + POLISH.noticeSeconds / 2, 5)).toBeCloseTo(0.5);
    expect(noticeFade(5 + POLISH.noticeSeconds + 1, 5)).toBe(0);
  });
});

describe("hud label", () => {
  it("shows the cost it is given", () => {
    expect(ectoplasmLabel(42.9, GHOST.possessCost)).toBe(`Ectoplasm 42 (possess ${GHOST.possessCost})`);
    expect(ectoplasmLabel(1, 9)).toBe("Ectoplasm 1 (possess 9)");
  });
});

describe("barks", () => {
  it("speaks on a change to a worse state", () => {
    expect(barkFor("skeptic", "investigate", "rattled")).toBe(BARKS.skeptic.rattled);
    expect(barkFor("medium", "rattled", "panicked")).toBe(BARKS.medium.panicked);
    expect(barkFor("photographer", "panicked", "fleeing")).toBe(BARKS.photographer.fleeing);
  });
  it("is silent for no change, recovery or gone", () => {
    expect(barkFor("skeptic", "rattled", "rattled")).toBeNull();
    expect(barkFor("skeptic", "rattled", "investigate")).toBeNull();
    expect(barkFor("skeptic", "fleeing", "gone")).toBeNull();
  });
});

describe("ghost costume", () => {
  it("bob stays within amplitude", () => {
    for (let t = 0; t < 5; t += 0.1) expect(Math.abs(ghostBob(t))).toBeLessThanOrEqual(POLISH.ghostBobPx);
  });
});

describe("ecto flash and tick", () => {
  it("flashes only for the insufficient notice", () => {
    expect(ectoFlashFor({ text: TEXT.insufficient, born: 1 }, 1, 1)).toBe(1);
    expect(ectoFlashFor({ text: TEXT.recharging, born: 1 }, 1, 1)).toBe(0);
    expect(ectoFlashFor(null, 1, 1)).toBe(0);
  });
  it("places the tick proportionally to the possess cost", () => {
    expect(tickPosition(10, 100, GHOST.possessCost, ECTOPLASM.max)).toBeCloseTo(10 + 100 * (GHOST.possessCost / ECTOPLASM.max));
    expect(tickPosition(0, 100, 0, 100)).toBe(0);
    expect(tickPosition(0, 100, 100, 100)).toBe(100);
  });
});
