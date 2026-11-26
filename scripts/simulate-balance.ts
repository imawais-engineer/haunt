// Headless scripted night using src/core only. Prints the result.
// NOT a balance signal: the bot has no possession, travel time or distance
// (every scare lands at distance 0 and `possessing` is approximated by "scared
// this tick"). Do not tune balance.ts against this output until it models those.
import { ECTOPLASM, NIGHT, SCARE_OBJECTS } from "../src/core/balance";
import { regenTick, tryFire, type Cooldowns } from "../src/core/ectoplasm";
import { NightTimer, nightOutcome } from "../src/core/night";
import { applyScare, createInvestigator, markGone, recoverTick, stateOf } from "../src/core/sanity";

const STEP = 1;
let investigators = [createInvestigator(), createInvestigator(), createInvestigator()];
let ecto: number = ECTOPLASM.start;
let cooldowns: Cooldowns = {};
const timer = new NightTimer();
let now = 0;
let fled = 0;

// Naive script: scare the weakest remaining investigator with whatever is affordable and ready.
while (!timer.isDawn && nightOutcome(investigators, timer) === "ongoing") {
  const idx = investigators.findIndex((i) => stateOf(i) !== "gone");
  const target = investigators[idx]!;
  let scared = false;
  for (const object of SCARE_OBJECTS) {
    const r = tryFire(ecto, cooldowns, object, now);
    if (!r.fired) continue;
    ecto = r.ectoplasm;
    cooldowns = r.cooldowns;
    investigators[idx] = applyScare(target, object, 0, now).investigator;
    scared = true;
    break;
  }
  if (stateOf(investigators[idx]!) === "fleeing") {
    investigators[idx] = markGone(investigators[idx]!);
    fled++;
  }
  ecto = regenTick(ecto, STEP, scared);
  investigators = investigators.map((i) => recoverTick(i, STEP, false));
  timer.tick(STEP);
  now += STEP;
}

console.log(
  `[not a balance signal: no possession/travel model] outcome=${nightOutcome(investigators, timer)} fled=${fled}/3 timeLeft=${timer.timeLeft}s of ${NIGHT.durationSeconds}s ectoplasm=${ecto.toFixed(0)}`,
);
