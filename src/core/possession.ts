import { ARRIVE_PX, GHOST, INVESTIGATOR_START, MANSION, PATROL_ROUTE, SCARE_OBJECTS } from "./balance";
import { canAfford, clampEctoplasm, regenTick, spend, tryFire, type Cooldowns } from "./ectoplasm";
import {
  agentState,
  behaviourOf,
  flashRevealsGhost,
  reachDoor,
  recoverAgent,
  scareAgent,
  updateAgent,
  type Agent,
  type Point,
} from "./investigator";
import { distance, moveToward, objectById, objectPosition, isAtDoor, type ObjectId } from "./mansion";

/** The ghost. `possessed` is set while inside an object; `heading` is the object it is flying to. */
export interface Ghost {
  readonly pos: Point;
  readonly ectoplasm: number;
  readonly cooldowns: Cooldowns;
  readonly possessed: ObjectId | null;
  readonly heading: ObjectId | null;
}

/** An investigator in the mansion: behaviour record, position and patrol progress. */
export interface Actor {
  readonly agent: Agent;
  readonly pos: Point;
  readonly waypoint: number;
}

export function createGhost(ectoplasm: number): Ghost {
  return { pos: GHOST.start, ectoplasm: clampEctoplasm(ectoplasm), cooldowns: {}, possessed: null, heading: null };
}

export function createActor(agent: Agent, waypoint = 0): Actor {
  return { agent, pos: INVESTIGATOR_START, waypoint };
}

/** Objects within glow range while drifting, nearest first. Empty while possessing. */
export function glowingObjects(ghost: Ghost): ObjectId[] {
  if (ghost.possessed) return [];
  return SCARE_OBJECTS.map((o) => o.id)
    .filter((id) => distance(ghost.pos, objectPosition(id)) <= GHOST.glowRangePx)
    .sort((a, b) => distance(ghost.pos, objectPosition(a)) - distance(ghost.pos, objectPosition(b)));
}

/** The object E would possess: nearest within possess range. */
export function possessableObject(ghost: Ghost): ObjectId | null {
  const near = glowingObjects(ghost).filter((id) => distance(ghost.pos, objectPosition(id)) <= GHOST.possessRangePx);
  return near[0] ?? null;
}

/** Free drifting (WASD / mouse follow). Ignored while possessing; cancels any heading. */
export function drift(ghost: Ghost, target: Point, dt: number): Ghost {
  if (ghost.possessed) return ghost;
  return { ...ghost, pos: moveToward(ghost.pos, target, GHOST.speedPxPerSecond, dt), heading: null };
}

/** Click an object: fly there and possess on arrival. Ignored while possessing. */
export function headFor(ghost: Ghost, id: ObjectId): Ghost {
  return ghost.possessed ? ghost : { ...ghost, heading: id };
}

/**
 * Possess an object within range. Costs GHOST.possessCost. Fails (unchanged)
 * when already possessing, out of range, or unaffordable.
 */
export function possess(ghost: Ghost, id: ObjectId): Ghost {
  if (ghost.possessed) return ghost;
  if (distance(ghost.pos, objectPosition(id)) > GHOST.possessRangePx) return ghost;
  if (!canAfford(ghost.ectoplasm, GHOST.possessCost)) return ghost;
  return {
    ...ghost,
    pos: objectPosition(id),
    ectoplasm: spend(ghost.ectoplasm, GHOST.possessCost),
    possessed: id,
    heading: null,
  };
}

/** Leave the object. Free. The ghost stays where the object is and cooldowns persist. */
export function release(ghost: Ghost): Ghost {
  return ghost.possessed ? { ...ghost, possessed: null } : ghost;
}

/** Advance the ghost: fly toward its heading and possess on arrival; regen ectoplasm while drifting. */
export function updateGhost(ghost: Ghost, dt: number): Ghost {
  let g = ghost;
  const id = g.heading;
  if (id && !g.possessed) {
    const to = objectPosition(id);
    g = { ...g, pos: moveToward(g.pos, to, GHOST.speedPxPerSecond, dt) };
    if (distance(g.pos, to) <= GHOST.possessRangePx) {
      const p = possess(g, id);
      g = p.possessed ? p : { ...g, heading: null }; // unaffordable: give up
    }
  }
  return { ...g, ectoplasm: regenTick(g.ectoplasm, dt, g.possessed !== null) };
}

export interface ScareOutcome {
  readonly ghost: Ghost;
  readonly actors: readonly Actor[];
  /** True when the scare fired (possessing, ready, affordable). The scene plays animation + sound + light. */
  readonly fired: boolean;
}

/** Trigger the possessed object's scare against every actor. Nothing changes if it cannot fire. */
export function scare(ghost: Ghost, actors: readonly Actor[], now: number): ScareOutcome {
  const unchanged = { ghost, actors, fired: false };
  if (!ghost.possessed) return unchanged;
  const object = objectById(ghost.possessed);
  const at = objectPosition(ghost.possessed);
  const r = tryFire(ghost.ectoplasm, ghost.cooldowns, object, now);
  if (!r.fired) return unchanged;
  return {
    fired: true,
    ghost: { ...ghost, ectoplasm: r.ectoplasm, cooldowns: r.cooldowns },
    actors: actors.map((a) => ({
      ...a,
      agent: scareAgent(a.agent, object, distance(a.pos, at), now, at).agent,
    })),
  };
}

/** The ghost is invisible while drifting. Only a Photographer's flash reveals it. */
export function ghostRevealed(actors: readonly Actor[], now: number): boolean {
  return actors.some((a) => flashRevealsGhost(a.agent, now));
}

/** Distance from an actor to the possessed object, or null when nothing is possessed. */
export function possessedDistance(ghost: Ghost, pos: Point): number | null {
  return ghost.possessed ? distance(pos, objectPosition(ghost.possessed)) : null;
}

/** True when no other living investigator is within sight of this one (same room). Used for recovery. */
function isAlone(actor: Actor, actors: readonly Actor[]): boolean {
  return !actors.some(
    (o) => o !== actor && agentState(o.agent) !== "gone" && distance(o.pos, actor.pos) <= GHOST.glowRangePx,
  );
}

/** Advance one investigator by dt: pauses, recovery, movement, reaching the door. */
export function updateActor(actor: Actor, actors: readonly Actor[], ghost: Ghost, now: number, dt: number): Actor {
  let agent = updateAgent(actor.agent, now, possessedDistance(ghost, actor.pos));
  agent = recoverAgent(agent, dt, isAlone(actor, actors));
  const b = behaviourOf(agent, now, MANSION.door);
  let { pos, waypoint } = actor;
  if (b.action === "patrol") {
    if (distance(pos, PATROL_ROUTE[waypoint % PATROL_ROUTE.length]!) <= ARRIVE_PX) {
      waypoint = (waypoint + 1) % PATROL_ROUTE.length;
    }
    pos = moveToward(pos, PATROL_ROUTE[waypoint % PATROL_ROUTE.length]!, b.speed, dt);
  } else if (b.target) {
    pos = moveToward(pos, b.target, b.speed, dt);
  }
  if (agentState(agent) === "fleeing" && isAtDoor(pos)) agent = reachDoor(agent);
  return { agent, pos, waypoint };
}

/** Advance the whole mansion by dt. Actors see the pre-step snapshot, so order does not matter. */
export function updateWorld(
  ghost: Ghost,
  actors: readonly Actor[],
  now: number,
  dt: number,
): { ghost: Ghost; actors: Actor[] } {
  return {
    ghost: updateGhost(ghost, dt),
    actors: actors.map((a) => updateActor(a, actors, ghost, now, dt)),
  };
}
