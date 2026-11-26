import { NIGHT } from "../core/balance";

/** 0 at dusk, 1 at dawn. Drives the sky strip. */
export function dawnProgress(timeLeft: number): number {
  return Math.min(1, Math.max(0, 1 - timeLeft / NIGHT.durationSeconds));
}

/** m:ss for the dawn countdown. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const sec = s % 60;
  return `${Math.floor(s / 60)}:${sec < 10 ? "0" : ""}${sec}`;
}
