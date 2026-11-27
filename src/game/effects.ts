// Pure, Phaser-free helpers for scare animation, footsteps and atmosphere.
import { canAfford } from "../core/ectoplasm";
import type { InvestigatorKind } from "../core/balance";
import type { InvestigatorState } from "../core/sanity";
import { AUDIO, BARKS, FX, POLISH, TEXT } from "./presentation";

export interface TrailMark {
  x: number;
  y: number;
  born: number;
}

/** Master output gain: silent when muted, AUDIO.master otherwise. */
export function masterGain(muted: boolean): number {
  return muted ? 0 : AUDIO.master;
}

/** Whether the AudioContext should be running: only while the tab is visible. */
export function shouldRunAudio(visibility: string): boolean {
  return visibility !== "hidden";
}

/** 0..1 progress of an effect that started at `start`, or null when finished or not started. */
export function effectProgress(now: number, start: number, duration: number = FX.scareSeconds): number | null {
  const p = (now - start) / duration;
  return p >= 0 && p < 1 ? p : null;
}

/** Decaying shake offset for progress p in 0..1. Zero at the end. */
export function shakeOffset(p: number): { x: number; y: number } {
  const decay = 1 - Math.min(1, Math.max(0, p));
  const phase = p * FX.scareSeconds * FX.shakeHz * Math.PI * 2;
  return { x: Math.sin(phase) * FX.shakeAmplitude * decay, y: Math.cos(phase * 1.3) * FX.shakeAmplitude * decay * 0.5 };
}

/** Ghost flare strength: quick rise, slow fall, 0..1. */
export function flareEnvelope(p: number): number {
  const c = Math.min(1, Math.max(0, p));
  return c < 0.15 ? c / 0.15 : 1 - (c - 0.15) / 0.85;
}

/** Candle flicker multiplier in (1 - depth)..1, deterministic in t. */
export function candleFlicker(t: number): number {
  const a = Math.sin(t * FX.flickerHz * Math.PI * 2);
  const b = Math.sin(t * FX.flickerHz * 2.7 * Math.PI * 2 + 1.3);
  const n = (a + b) / 4 + 0.5; // 0..1
  return 1 - FX.flickerDepth * (1 - n);
}

/** Advance a stride accumulator by speed*dt. Returns the new remainder and footsteps taken. */
export function advanceStride(acc: number, speed: number, dt: number, stride: number = FX.strideLengthPx): { acc: number; steps: number } {
  if (!(speed > 0) || !(dt > 0)) return { acc, steps: 0 };
  const total = acc + speed * dt;
  const steps = Math.floor(total / stride);
  return { acc: total - steps * stride, steps };
}

/** Vertical walk bob in px; zero when standing still. */
export function walkBob(t: number, speed: number): number {
  if (!(speed > 0)) return 0;
  return Math.abs(Math.sin(t * speed * FX.bobHzPerSpeed * Math.PI)) * -FX.bobPx;
}

/** -1 or 1 from horizontal movement, keeping `previous` when nearly still. */
export function facingFor(dx: number, previous: 1 | -1): 1 | -1 {
  if (Math.abs(dx) < FX.facingMinDx) return previous;
  return dx > 0 ? 1 : -1;
}

/** Start times (seconds from the stinger start) of the discordant piano phrase. */
export function pianoSchedule(): number[] {
  return AUDIO.pianoNotes.map((_, i) => i * AUDIO.pianoNoteSeconds);
}

/** Unit direction from held movement keys. Opposite keys cancel; diagonals are normalised. */
export function keyDirection(left: boolean, right: boolean, up: boolean, down: boolean): { x: number; y: number } {
  const x = (right ? 1 : 0) - (left ? 1 : 0);
  const y = (down ? 1 : 0) - (up ? 1 : 0);
  const len = Math.hypot(x, y);
  return len === 0 ? { x: 0, y: 0 } : { x: x / len, y: y / len };
}

/** Clamp a point into the rectangle 0..width, 0..height. */
export function clampPoint(p: { x: number; y: number }, width: number, height: number): { x: number; y: number } {
  return { x: Math.min(width, Math.max(0, p.x)), y: Math.min(height, Math.max(0, p.y)) };
}

/** Drops expired marks and, when `fleeing`, adds one at `pos` once it is trailSpacingPx from the newest mark. */
export function updateTrail(trail: readonly TrailMark[], pos: { x: number; y: number }, now: number, fleeing: boolean): TrailMark[] {
  const live = trail.filter((m) => now - m.born < FX.trailSeconds);
  const last = live[live.length - 1];
  if (fleeing && (!last || Math.hypot(pos.x - last.x, pos.y - last.y) >= FX.trailSpacingPx)) live.push({ x: pos.x, y: pos.y, born: now });
  return live;
}

/** 1 when a mark is new, 0 when it expires. */
export function trailFade(mark: TrailMark, now: number): number {
  return Math.max(0, 1 - (now - mark.born) / FX.trailSeconds);
}

/** Notice text when a possess attempt cannot be paid for, otherwise null. */
export function insufficientMessage(ectoplasm: number, cost: number): string | null {
  return canAfford(ectoplasm, cost) ? null : TEXT.insufficient;
}

/** Why a scare cannot fire: not enough ectoplasm wins over cooldown; null when it can. */
export function scareBlockedMessage(ectoplasm: number, cost: number, cooldownReady: boolean): string | null {
  if (!canAfford(ectoplasm, cost)) return TEXT.insufficient;
  return cooldownReady ? null : TEXT.recharging;
}

/** True when a click-heading flight ended without possessing and the cause was lack of ectoplasm. */
export function headingGaveUp(prevHeading: string | null, heading: string | null, possessed: string | null, ectoplasm: number, cost: number): boolean {
  return prevHeading !== null && heading === null && possessed === null && !canAfford(ectoplasm, cost);
}

/** 1 when a notice starts, 0 after POLISH.noticeSeconds. */
export function noticeFade(now: number, born: number, seconds: number = POLISH.noticeSeconds): number {
  return Math.min(1, Math.max(0, 1 - (now - born) / seconds));
}

/** Bark line when an investigator's state changes to a worse, speaking state; null otherwise. */
export function barkFor(kind: InvestigatorKind, prev: InvestigatorState, next: InvestigatorState): string | null {
  if (prev === next) return null;
  if (next === "rattled" || next === "panicked" || next === "fleeing") return BARKS[kind][next];
  return null;
}

/** Ghost costume bob in px, smooth, around zero. */
export function ghostBob(t: number): number {
  return Math.sin(t * POLISH.ghostBobHz * Math.PI * 2) * POLISH.ghostBobPx;
}

/** Possess cost HUD label, e.g. "Ectoplasm 42 (possess 6)". Cost always comes from the caller. */
export function ectoplasmLabel(ectoplasm: number, possessCost: number): string {
  return `Ectoplasm ${Math.floor(ectoplasm)} (possess ${possessCost})`;
}

/** Ectoplasm bar flash strength: only the "not enough ectoplasm" notice flashes it, never the cooldown notice. */
export function ectoFlashFor(notice: { text: string; born: number } | null, now: number, seconds: number): number {
  return notice && notice.text === TEXT.insufficient ? noticeFade(now, notice.born, seconds) : 0;
}

/** X position of the possess-cost tick on an ectoplasm bar starting at barX. */
export function tickPosition(barX: number, barWidth: number, possessCost: number, ectoplasmMax: number): number {
  return barX + barWidth * (possessCost / ectoplasmMax);
}
