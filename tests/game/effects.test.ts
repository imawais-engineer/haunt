import { describe, expect, it } from "vitest";
import { advanceStride, candleFlicker, effectProgress, clampPoint, facingFor, flareEnvelope, keyDirection, masterGain, pianoSchedule, shouldRunAudio, shakeOffset, walkBob } from "../../src/game/effects";
import { AUDIO, FX } from "../../src/game/presentation";

describe("effects helpers", () => {
  it("effectProgress is null outside the window", () => {
    expect(effectProgress(0.5, 1)).toBeNull();
    expect(effectProgress(2 + FX.scareSeconds, 1)).toBeNull();
    expect(effectProgress(1 + FX.scareSeconds / 2, 1)).toBeCloseTo(0.5);
  });
  it("shake decays to zero and is bounded", () => {
    for (let p = 0; p < 1; p += 0.05) {
      const o = shakeOffset(p);
      expect(Math.abs(o.x)).toBeLessThanOrEqual(FX.shakeAmplitude);
      expect(Math.abs(o.y)).toBeLessThanOrEqual(FX.shakeAmplitude);
    }
    expect(shakeOffset(1)).toEqual({ x: 0, y: 0 });
  });
  it("flare rises then falls within 0..1", () => {
    expect(flareEnvelope(0)).toBe(0);
    expect(flareEnvelope(0.15)).toBe(1);
    expect(flareEnvelope(1)).toBe(0);
  });
  it("candle flicker stays in range", () => {
    for (let t = 0; t < 10; t += 0.037) {
      const f = candleFlicker(t);
      expect(f).toBeGreaterThanOrEqual(1 - FX.flickerDepth - 1e-9);
      expect(f).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
  it("footstep cadence follows distance walked", () => {
    expect(advanceStride(0, 0, 1)).toEqual({ acc: 0, steps: 0 });
    let acc = 0;
    let steps = 0;
    for (let i = 0; i < 100; i++) {
      const r = advanceStride(acc, 56, 0.1);
      acc = r.acc;
      steps += r.steps;
    }
    expect(steps).toBe(Math.floor((56 * 10) / FX.strideLengthPx));
  });
  it("bob is zero when still and never positive", () => {
    expect(walkBob(1, 0)).toBe(0);
    expect(walkBob(0.3, 60)).toBeLessThanOrEqual(0);
  });
  it("facing keeps previous when nearly still", () => {
    expect(facingFor(0, -1)).toBe(-1);
    expect(facingFor(3, -1)).toBe(1);
    expect(facingFor(-3, 1)).toBe(-1);
  });
  it("piano phrase has one start per note, increasing", () => {
    const s = pianoSchedule();
    expect(s).toHaveLength(AUDIO.pianoNotes.length);
    expect(s).toEqual([...s].sort((a, b) => a - b));
  });
});

describe("audio state helpers", () => {
  it("masterGain is 0 when muted and AUDIO.master otherwise", () => {
    expect(masterGain(true)).toBe(0);
    expect(masterGain(false)).toBe(AUDIO.master);
  });
  it("shouldRunAudio is false only when the tab is hidden", () => {
    expect(shouldRunAudio("hidden")).toBe(false);
    expect(shouldRunAudio("visible")).toBe(true);
  });

  it("keyDirection is unit length, cancels opposites", () => {
    expect(keyDirection(false, false, false, false)).toEqual({ x: 0, y: 0 });
    expect(keyDirection(true, true, false, false)).toEqual({ x: 0, y: 0 });
    expect(keyDirection(false, true, false, false)).toEqual({ x: 1, y: 0 });
    expect(keyDirection(false, false, true, false)).toEqual({ x: 0, y: -1 });
    const d = keyDirection(true, false, false, true);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
  });
  it("clampPoint keeps points inside bounds", () => {
    expect(clampPoint({ x: -5, y: 900 }, 100, 50)).toEqual({ x: 0, y: 50 });
    expect(clampPoint({ x: 10, y: 20 }, 100, 50)).toEqual({ x: 10, y: 20 });
  });
});
