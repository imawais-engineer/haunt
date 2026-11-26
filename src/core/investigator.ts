import {
  BEHAVIOUR,
  INVESTIGATE,
  MEDIUM,
  PERSONALITIES,
  PHOTOGRAPHER,
  type InvestigatorKind,
  type ScareObject,
} from "./balance";
import {
  applyScare,
  createInvestigator,
  markGone,
  recoverTick,
  stateForSanity,
  stateOf,
  type Investigator,
  type InvestigatorState,
  type ScareResult,
} from "./sanity";

export type { InvestigatorKind } from "./balance";

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** One investigator: shared sanity record plus personality and behaviour timers. */
export interface Agent {
  readonly kind: InvestigatorKind;
  readonly core: Investigator;
  readonly lastScare: (Point & { readonly at: number }) | null;
  /** The agent is paused (sensing or photographing) until this time. */
  readonly pausedUntil: number;
  readonly nextPhotoAt: number;
  readonly flashUntil: number;
  readonly senseReadyAt: number;
}

export type StateEvent = "tick" | "reachedDoor";

export type Action =
  | "patrol"
  | "walk-to-scare"
  | "pause"
  | "freeze"
  | "back-away"
  | "run-to-door"
  | "gone";

export interface Behaviour {
  readonly action: Action;
  /** px/s. 0 while paused or gone. */
  readonly speed: number;
  /** Where to walk, when the action has a destination. */
  readonly target: Point | null;
}

export function createAgent(kind: InvestigatorKind, now = 0): Agent {
  return {
    kind,
    core: createInvestigator(),
    lastScare: null,
    pausedUntil: 0,
    nextPhotoAt: now + PHOTOGRAPHER.photoIntervalSeconds,
    flashUntil: 0,
    senseReadyAt: 0,
  };
}

export function agentState(agent: Agent): InvestigatorState {
  return stateOf(agent.core);
}

/**
 * The one shared transition function. Thresholds decide every state except
 * Gone, which is reached only from Fleeing by arriving at the door.
 * Gone is permanent; Fleeing never reverts.
 */
export function nextState(
  current: InvestigatorState,
  sanity: number,
  event: StateEvent,
): InvestigatorState {
  if (current === "gone") return "gone";
  if (current === "fleeing") return event === "reachedDoor" ? "gone" : "fleeing";
  return stateForSanity(sanity);
}

/** Apply a state-machine event to an agent. Only the door event changes `gone`. */
export function step(agent: Agent, event: StateEvent): Agent {
  const before = agentState(agent);
  const after = nextState(before, agent.core.sanity, event);
  return after === "gone" && before !== "gone"
    ? { ...agent, core: markGone(agent.core) }
    : agent;
}

export function reachDoor(agent: Agent): Agent {
  return step(agent, "reachedDoor");
}

export function isPaused(agent: Agent, now: number): boolean {
  return agentState(agent) === "investigate" && now < agent.pausedUntil;
}

/** The Photographer's flash reveals the ghost while it lasts. */
export function flashRevealsGhost(agent: Agent, now: number): boolean {
  return agent.kind === "photographer" && agentState(agent) === "investigate" && now < agent.flashUntil;
}

/**
 * Resolve a scare. `at` is where the scare happened (remembered so the Skeptic
 * walks toward it). A Photographer takes partial damage while moving
 * and full damage while paused (see PHOTOGRAPHER in balance.ts).
 */
export function scareAgent(
  agent: Agent,
  object: ScareObject,
  distance: number,
  now: number,
  at: Point | null = null,
): ScareResult & { readonly agent: Agent } {
  if (agentState(agent) === "gone") {
    return { investigator: agent.core, sanity: agent.core.sanity, fired: false, damage: 0, chained: false, agent };
  }
  const multiplier =
    agent.kind !== "photographer"
      ? 1
      : isPaused(agent, now)
        ? PHOTOGRAPHER.pausedDamageMultiplier
        : PHOTOGRAPHER.movingDamageMultiplier;
  const result = applyScare(agent.core, { ...object, damage: object.damage * multiplier }, distance, now);
  const lastScare = result.fired && at ? { ...at, at: now } : agent.lastScare;
  return { ...result, agent: { ...agent, core: result.investigator, lastScare } };
}

/** Calm-and-alone recovery at the personality's rate. Gone agents never change. */
export function recoverAgent(agent: Agent, dt: number, alone: boolean): Agent {
  if (agentState(agent) === "gone") return agent;
  return { ...agent, core: recoverTick(agent.core, dt, alone, PERSONALITIES[agent.kind].recoveryRate) };
}

/**
 * Advance personality pauses. `possessedDistance` is the distance in px to
 * the nearest possessed object, or null when none is possessed.
 * Only an investigating (not rattled or worse) agent pauses.
 */
export function updateAgent(agent: Agent, now: number, possessedDistance: number | null = null): Agent {
  if (agentState(agent) !== "investigate" || isPaused(agent, now)) return agent;
  if (agent.kind === "medium") {
    const senses =
      possessedDistance !== null && possessedDistance <= MEDIUM.senseRadiusPx && now >= agent.senseReadyAt;
    return senses
      ? { ...agent, pausedUntil: now + MEDIUM.pauseSeconds, senseReadyAt: now + MEDIUM.pauseSeconds + MEDIUM.senseCooldownSeconds }
      : agent;
  }
  if (agent.kind === "photographer" && now >= agent.nextPhotoAt) {
    return {
      ...agent,
      pausedUntil: now + PHOTOGRAPHER.pauseSeconds,
      flashUntil: now + PHOTOGRAPHER.flashSeconds,
      nextPhotoAt: now + PHOTOGRAPHER.photoIntervalSeconds,
    };
  }
  return agent;
}

/** What the scene should make this agent do. The scene renders it and never decides it. */
export function behaviourOf(agent: Agent, now: number, door: Point | null = null): Behaviour {
  const state = agentState(agent);
  const p = PERSONALITIES[agent.kind];
  switch (state) {
    case "gone":
      return { action: "gone", speed: 0, target: null };
    case "fleeing":
      return { action: "run-to-door", speed: p.speed * BEHAVIOUR.fleeingSpeedFactor, target: door };
    case "panicked":
      return { action: "back-away", speed: p.speed * BEHAVIOUR.panickedSpeedFactor, target: door };
    case "rattled":
      return { action: "freeze", speed: 0, target: null };
    case "investigate": {
      if (isPaused(agent, now)) return { action: "pause", speed: 0, target: null };
      const s = agent.lastScare;
      if (
        s &&
        p.investigateTendency >= INVESTIGATE.walkTowardAt &&
        now - s.at <= INVESTIGATE.scareMemorySeconds
      ) {
        return { action: "walk-to-scare", speed: p.speed, target: { x: s.x, y: s.y } };
      }
      return { action: "patrol", speed: p.speed, target: null };
    }
  }
}
