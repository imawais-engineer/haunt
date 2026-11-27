// Headless scripted nights using src/core only, with the Spec 3 travel and
// possession model: the ghost flies between objects, possesses, scares, and
// investigators patrol, react and flee to the door.
//
// Profiles (all seeded, so output is reproducible):
//   perfect  - chaining bot with zero reaction time. A diagnostic ceiling, not the target.
//   spam     - scares whenever ready and never leaves an object to regen.
//   human    - HANDICAPPED FIRST-TIME-HUMAN APPROXIMATION: reaction delay, wrong
//              targets, misclicks, wasted scares with nobody in reach, idle
//              spells. The parameters are guesses. It is NOT a human playtest
//              and cannot replace one.
//
//   npm run simulate:balance            # perfect single run plus table of all profiles
//   npm run simulate:balance -- 200     # same, with 200 seeded runs per handicapped profile
import { ECTOPLASM, GHOST, NIGHT, SCARE_OBJECTS } from "../src/core/balance";
import { agentState, createAgent, type InvestigatorKind } from "../src/core/investigator";
import { distance, objectById, objectPosition, type ObjectId } from "../src/core/mansion";
import { NightTimer, nightOutcome } from "../src/core/night";
import { createActor, createGhost, headFor, release, scare, updateWorld, type Actor } from "../src/core/possession";
import { stateOf } from "../src/core/sanity";

const STEP = 0.1;
const kinds: InvestigatorKind[] = ["skeptic", "medium", "photographer"];
const OBJECT_IDS = SCARE_OBJECTS.map((o) => o.id);

interface Profile {
  name: string;
  /** Mean seconds between decisions. 0 = decide every step. */
  reaction: number;
  /** Chance a decision targets a random object instead of the best one. */
  wrongTarget: number;
  /** Chance a decision is lost entirely (missed click). */
  misclick: number;
  /** Chance a decision starts an idle spell. */
  idle: number;
  idleSeconds: number;
  /** Scare even with nobody inside the object's radius. */
  scareBlindly: boolean;
  /** Leave the object to regen when it cannot afford its own scare. */
  releaseWhenBroke: boolean;
}

const PERFECT: Profile = { name: "perfect", reaction: 0, wrongTarget: 0, misclick: 0, idle: 0, idleSeconds: 0, scareBlindly: true, releaseWhenBroke: true };
const SPAM: Profile = { ...PERFECT, name: "spam", releaseWhenBroke: false };
const HUMAN: Profile = { name: "human", reaction: 1.2, wrongTarget: 0.25, misclick: 0.1, idle: 0.1, idleSeconds: 4, scareBlindly: false, releaseWhenBroke: true };

/** mulberry32: small seeded PRNG so runs are reproducible. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface NightResult {
  outcome: string;
  gone: number;
  scares: number;
  timeLeft: number;
  ectoplasm: number;
  /** Ectoplasm at t=10s, for the early-game question. */
  ectoplasmAt10: number;
  /** Time of the first investigator leaving, or null. */
  firstGoneAt: number | null;
  /** Lowest sanity among living investigators at the end. */
  minLiveSanity: number;
}

export function runNight(p: Profile, seed: number): NightResult {
  const rand = rng(seed);
  let actors: Actor[] = kinds.map((k, i) => createActor(createAgent(k), i));
  let ghost = createGhost(ECTOPLASM.start);
  const timer = new NightTimer();
  let now = 0;
  let nextAct = 0;
  let scares = 0;
  let ectoplasmAt10 = NaN;
  let firstGoneAt: number | null = null;

  const live = () => actors.filter((a) => agentState(a.agent) !== "gone" && agentState(a.agent) !== "fleeing");
  const weakest = () => live().sort((a, b) => a.agent.core.sanity - b.agent.core.sanity)[0];
  const nearestTo = (pos: { x: number; y: number }): ObjectId =>
    [...OBJECT_IDS].sort((a, b) => distance(pos, objectPosition(a)) - distance(pos, objectPosition(b)))[0]!;

  while (!timer.isDawn && nightOutcome(actors.map((a) => a.agent.core), timer) === "ongoing") {
    if (now >= nextAct) {
      nextAct = now + (p.reaction === 0 ? 0 : p.reaction * (0.5 + rand()));
      if (rand() < p.idle) {
        nextAct = now + p.idleSeconds;
      } else if (rand() >= p.misclick) {
        const t = weakest();
        if (t) {
          const want: ObjectId = rand() < p.wrongTarget ? OBJECT_IDS[Math.floor(rand() * OBJECT_IDS.length)]! : nearestTo(t.pos);
          const need = objectById(want).cost + GHOST.possessCost;
          if (p.releaseWhenBroke && ghost.possessed && ghost.ectoplasm < objectById(ghost.possessed).cost) ghost = release(ghost);
          else if (ghost.possessed !== want && ghost.heading !== want && ghost.ectoplasm >= need && (p.releaseWhenBroke || !ghost.possessed)) {
            ghost = headFor(release(ghost), want);
          }
        }
      }
    }
    const inReach =
      p.scareBlindly ||
      (ghost.possessed !== null &&
        actors.some((a) => agentState(a.agent) !== "gone" && distance(a.pos, objectPosition(ghost.possessed!)) <= 400));
    if (inReach && now >= nextAct - (p.reaction === 0 ? 0 : p.reaction * 0.5)) {
      const r = scare(ghost, actors, now);
      ghost = r.ghost;
      actors = [...r.actors];
      if (r.fired) scares++;
    }
    const w = updateWorld(ghost, actors, now, STEP);
    ghost = w.ghost;
    actors = w.actors;
    timer.tick(STEP);
    now += STEP;
    if (Number.isNaN(ectoplasmAt10) && now >= 10) ectoplasmAt10 = ghost.ectoplasm;
    if (firstGoneAt === null && actors.some((a) => stateOf(a.agent.core) === "gone")) firstGoneAt = now;
  }
  const liveSan = actors.filter((a) => stateOf(a.agent.core) !== "gone").map((a) => a.agent.core.sanity);
  return {
    outcome: nightOutcome(actors.map((a) => a.agent.core), timer),
    gone: actors.filter((a) => stateOf(a.agent.core) === "gone").length,
    scares,
    timeLeft: timer.timeLeft,
    ectoplasm: ghost.ectoplasm,
    ectoplasmAt10: Number.isNaN(ectoplasmAt10) ? ghost.ectoplasm : ectoplasmAt10,
    firstGoneAt,
    minLiveSanity: liveSan.length ? Math.min(...liveSan) : 0,
  };
}

function report(p: Profile, runs: number): void {
  const rs = Array.from({ length: runs }, (_, i) => runNight(p, 1000 + i));
  const wins = rs.filter((r) => r.outcome === "win").length;
  const avg = (f: (r: NightResult) => number) => rs.reduce((s, r) => s + f(r), 0) / rs.length;
  const goneDist = [0, 1, 2, 3].map((n) => rs.filter((r) => r.gone === n).length).join("/");
  const losses = rs.filter((r) => r.outcome !== "win");
  const narrow = losses.filter((r) => r.gone >= 1 && r.minLiveSanity <= 35).length;
  console.log(
    `${p.name.padEnd(8)} runs=${String(runs).padStart(3)} win%=${((100 * wins) / runs).toFixed(0).padStart(3)} ` +
      `gone(0/1/2/3)=${goneDist} narrowLoss%=${((100 * narrow) / runs).toFixed(0).padStart(3)} ` +
      `scares=${avg((r) => r.scares).toFixed(1)} ecto@10s=${avg((r) => r.ectoplasmAt10).toFixed(0)} ` +
      `firstGone@=${avg((r) => r.firstGoneAt ?? NIGHT.durationSeconds).toFixed(0)}s ` +
      `timeLeft(win)=${wins ? (rs.filter((r) => r.outcome === "win").reduce((s, r) => s + r.timeLeft, 0) / wins).toFixed(1) : "n/a"}s`,
  );
}

const perfect = runNight(PERFECT, 1);
console.log(
  `outcome=${perfect.outcome} gone=${perfect.gone}/3 scares=${perfect.scares} timeLeft=${perfect.timeLeft.toFixed(1)}s of ${NIGHT.durationSeconds}s ectoplasm=${perfect.ectoplasm.toFixed(0)}`,
);
const argRuns = Number((globalThis as { process?: { argv: string[] } }).process?.argv[2]);
const runs = argRuns > 0 ? argRuns : 100;
console.log("Profiles (human is a handicapped approximation, NOT a human playtest):");
report(PERFECT, 1);
report(SPAM, 1);
report(HUMAN, runs);
