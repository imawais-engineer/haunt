import { NIGHT } from "./balance";
import { stateOf, type Investigator } from "./sanity";

export type NightOutcome = "ongoing" | "win" | "lose";

export class NightTimer {
  private remaining: number = NIGHT.durationSeconds;

  get timeLeft(): number {
    return this.remaining;
  }

  get isDawn(): boolean {
    return this.remaining <= 0;
  }

  /** Counts down only. Negative or invalid dt is ignored, so nothing extends the night. */
  tick(dt: number): number {
    if (dt > 0) this.remaining = Math.max(0, this.remaining - dt);
    return this.remaining;
  }
}

/** Win when everyone is gone. Lose when dawn arrives with anyone still inside. */
export function nightOutcome(investigators: readonly Investigator[], timer: NightTimer): NightOutcome {
  if (investigators.every((i) => stateOf(i) === "gone")) return "win";
  return timer.isDawn ? "lose" : "ongoing";
}
