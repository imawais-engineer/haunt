// Headless scripted night using src/core only, with the Spec 3 travel and
// possession model: the ghost flies between objects, possesses, scares, and
// investigators patrol, react and flee to the door. Prints the result.
// First model of the full loop: treat results as a rough signal until the
// Day 5 balance pass checks them against the steering targets.
import { ECTOPLASM, GHOST, NIGHT, SCARE_OBJECTS } from "../src/core/balance";
import { agentState, createAgent, type InvestigatorKind } from "../src/core/investigator";
import { distance, objectById, objectPosition, type ObjectId } from "../src/core/mansion";
import { NightTimer, nightOutcome } from "../src/core/night";
import { createActor, createGhost, headFor, release, scare, updateWorld, type Actor } from "../src/core/possession";
import { stateOf } from "../src/core/sanity";

const STEP = 0.1;
const kinds: InvestigatorKind[] = ["skeptic", "medium", "photographer"];
let actors: Actor[] = kinds.map((k, i) => createActor(createAgent(k), i));
let ghost = createGhost(ECTOPLASM.start);
const timer = new NightTimer();
let now = 0;

/** Policy: go to the object nearest the weakest living investigator, scare whenever ready. */
function pickObject(): ObjectId | null {
  const live = actors.filter((a) => agentState(a.agent) !== "gone" && agentState(a.agent) !== "fleeing");
  const target = live.sort((a, b) => a.agent.core.sanity - b.agent.core.sanity)[0];
  if (!target) return null;
  return SCARE_OBJECTS.map((o) => o.id).sort(
    (a, b) => distance(target.pos, objectPosition(a)) - distance(target.pos, objectPosition(b)),
  )[0]!;
}

let scares = 0;
while (!timer.isDawn && nightOutcome(actors.map((a) => a.agent.core), timer) === "ongoing") {
  const want = pickObject();
  if (want) {
    const need = objectById(want).cost + GHOST.possessCost;
    if (ghost.possessed && ghost.ectoplasm < objectById(ghost.possessed).cost) ghost = release(ghost); // drift to regen
    else if (ghost.possessed !== want && ghost.heading !== want && ghost.ectoplasm >= need) ghost = headFor(release(ghost), want);
  }
  const r = scare(ghost, actors, now);
  ghost = r.ghost;
  actors = [...r.actors];
  if (r.fired) scares++;
  const w = updateWorld(ghost, actors, now, STEP);
  ghost = w.ghost;
  actors = w.actors;
  timer.tick(STEP);
  now += STEP;
}

const fled = actors.filter((a) => stateOf(a.agent.core) === "gone").length;
console.log(
  `outcome=${nightOutcome(actors.map((a) => a.agent.core), timer)} gone=${fled}/3 scares=${scares} timeLeft=${timer.timeLeft.toFixed(1)}s of ${NIGHT.durationSeconds}s ectoplasm=${ghost.ectoplasm.toFixed(0)}`,
);
