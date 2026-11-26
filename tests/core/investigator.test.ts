import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  INVESTIGATE,
  MEDIUM,
  PERSONALITIES,
  PHOTOGRAPHER,
  SANITY,
  SCARE_OBJECTS,
  type InvestigatorKind,
} from "../../src/core/balance";
import {
  agentState,
  behaviourOf,
  createAgent,
  flashRevealsGhost,
  isPaused,
  nextState,
  reachDoor,
  recoverAgent,
  scareAgent,
  updateAgent,
  type Agent,
} from "../../src/core/investigator";
import type { InvestigatorState } from "../../src/core/sanity";

const chandelier = SCARE_OBJECTS.find((o) => o.id === "chandelier")!;
const piano = SCARE_OBJECTS.find((o) => o.id === "piano")!;
const kinds: InvestigatorKind[] = ["skeptic", "medium", "photographer"];

function withSanity(agent: Agent, sanity: number): Agent {
  return { ...agent, core: { ...agent.core, sanity } };
}

describe("state boundaries (shared machine, all three investigators)", () => {
  it.each(kinds)("%s: 71 investigate, 70 rattled, 36 rattled, 35 panicked, 0 fleeing", (kind) => {
    const a = createAgent(kind);
    expect(agentState(withSanity(a, 71))).toBe("investigate");
    expect(agentState(withSanity(a, 70))).toBe("rattled");
    expect(agentState(withSanity(a, 36))).toBe("rattled");
    expect(agentState(withSanity(a, 35))).toBe("panicked");
    expect(agentState(withSanity(a, 1))).toBe("panicked");
    expect(agentState(withSanity(a, 0))).toBe("fleeing");
  });

  it("nextState uses the same thresholds", () => {
    expect(nextState("investigate", 71, "tick")).toBe("investigate");
    expect(nextState("investigate", 70, "tick")).toBe("rattled");
    expect(nextState("rattled", 36, "tick")).toBe("rattled");
    expect(nextState("rattled", 35, "tick")).toBe("panicked");
    expect(nextState("panicked", 0, "tick")).toBe("fleeing");
    expect(nextState("investigate", 0, "tick")).toBe("fleeing");
  });

  it("Rattled returns to Investigate only when sanity rises above 70", () => {
    expect(nextState("rattled", 70, "tick")).toBe("rattled");
    expect(nextState("rattled", 71, "tick")).toBe("investigate");
  });

  it("reaching a threshold uses the scare path end to end", () => {
    let a = createAgent("medium");
    a = withSanity(a, 75);
    a = scareAgent(a, piano, 0, 0).agent; // 75 -> 55
    expect(agentState(a)).toBe("rattled");
    a = withSanity(a, 50);
    a = scareAgent(a, piano, 0, 1).agent; // 50 -> 30
    expect(agentState(a)).toBe("panicked");
  });
});

describe("Fleeing -> Gone at the door", () => {
  it("sanity 0 is always Fleeing, then Gone only at the door", () => {
    let a = createAgent("skeptic");
    for (let i = 0; i < 10; i++) a = scareAgent(a, chandelier, 0, i * 20).agent;
    expect(a.core.sanity).toBe(0);
    expect(agentState(a)).toBe("fleeing");
    expect(nextState("fleeing", 0, "tick")).toBe("fleeing");
    expect(agentState(a)).toBe("fleeing");
    a = reachDoor(a);
    expect(agentState(a)).toBe("gone");
  });

  it("the door does nothing to an agent that is not fleeing", () => {
    for (const s of [100, 70, 35]) {
      const a = withSanity(createAgent("medium"), s);
      expect(agentState(reachDoor(a))).toBe(agentState(a));
    }
  });

  it("Gone is permanent: scares, recovery and updates change nothing", () => {
    const gone = reachDoor(withSanity(createAgent("photographer"), 0));
    expect(agentState(gone)).toBe("gone");
    expect(scareAgent(gone, chandelier, 0, 99).fired).toBe(false);
    expect(recoverAgent(gone, 1000, true)).toBe(gone);
    expect(updateAgent(gone, 1000)).toBe(gone);
    expect(nextState("gone", 100, "tick")).toBe("gone");
    expect(behaviourOf(gone, 0).action).toBe("gone");
  });

  it("only the threshold or the door reaches a state (property)", () => {
    const states = fc.constantFrom<InvestigatorState>("investigate", "rattled", "panicked", "fleeing", "gone");
    fc.assert(
      fc.property(states, fc.double({ min: 0, max: 100, noNaN: true }), fc.constantFrom("tick", "reachedDoor" as const), (cur, sanity, ev) => {
        const next = nextState(cur, sanity, ev);
        if (next === "gone") return cur === "gone" || (cur === "fleeing" && ev === "reachedDoor");
        if (cur === "gone" || cur === "fleeing") return next === cur;
        const expected = sanity <= 0 ? "fleeing" : sanity <= SANITY.panickedAt ? "panicked" : sanity <= SANITY.rattledAt ? "rattled" : "investigate";
        return next === expected;
      }),
    );
  });
});

describe("recovery by personality", () => {
  it("recovers at the personality rate, calm and alone", () => {
    const secs = SANITY.recoveryTickSeconds * 4;
    const result = (k: InvestigatorKind) => recoverAgent(withSanity(createAgent(k), 80), secs, true).core.sanity;
    expect(result("skeptic")).toBe(80 + 4 * PERSONALITIES.skeptic.recoveryRate);
    expect(result("medium")).toBe(80 + 4 * PERSONALITIES.medium.recoveryRate);
    expect(result("skeptic")).toBeGreaterThan(result("photographer"));
    expect(result("photographer")).toBeGreaterThan(result("medium"));
  });

  it("does not recover when not alone", () => {
    expect(recoverAgent(withSanity(createAgent("skeptic"), 80), 100, false).core.sanity).toBe(80);
  });

  it("a rattled investigator does not recover (Spec 1 R3)", () => {
    expect(recoverAgent(withSanity(createAgent("skeptic"), 70), 100, true).core.sanity).toBe(70);
  });
});

describe("personalities", () => {
  it("speed and investigate tendency order matches the design table", () => {
    const p = PERSONALITIES;
    expect(p.skeptic.speed).toBeGreaterThan(p.photographer.speed);
    expect(p.photographer.speed).toBeGreaterThan(p.medium.speed);
    expect(p.skeptic.investigateTendency).toBeGreaterThan(p.photographer.investigateTendency);
    expect(p.photographer.investigateTendency).toBeGreaterThan(p.medium.investigateTendency);
  });

  it("Skeptic walks toward the last scare; Medium and Photographer do not", () => {
    const at = { x: 10, y: 20 };
    const skeptic = scareAgent(createAgent("skeptic"), piano, 0, 0, at).agent;
    // 100 - 20 = 80: still investigating, so he walks to the scare.
    expect(agentState(skeptic)).toBe("investigate");
    const b = behaviourOf(skeptic, 1);
    expect(b.action).toBe("walk-to-scare");
    expect(b.target).toEqual(at);
    expect(behaviourOf(skeptic, INVESTIGATE.scareMemorySeconds + 1).action).toBe("patrol");
    for (const k of ["medium", "photographer"] as const) {
      const a = scareAgent(updateAgent(createAgent(k), PHOTOGRAPHER.photoIntervalSeconds), piano, 0, PHOTOGRAPHER.photoIntervalSeconds, at).agent;
      expect(a.lastScare).not.toBeNull();
      expect(behaviourOf(a, PHOTOGRAPHER.photoIntervalSeconds + PHOTOGRAPHER.pauseSeconds).action).toBe("patrol");
    }
  });

  it("Medium pauses when it senses a possessed object nearby, then waits out the cooldown", () => {
    let m = createAgent("medium");
    m = updateAgent(m, 1, MEDIUM.senseRadiusPx + 1);
    expect(isPaused(m, 1)).toBe(false);
    m = updateAgent(m, 1, MEDIUM.senseRadiusPx);
    expect(isPaused(m, 1)).toBe(true);
    expect(behaviourOf(m, 1)).toEqual({ action: "pause", speed: 0, target: null });
    expect(isPaused(m, 1 + MEDIUM.pauseSeconds)).toBe(false);
    const again = updateAgent(m, 1 + MEDIUM.pauseSeconds, 0);
    expect(isPaused(again, 1 + MEDIUM.pauseSeconds)).toBe(false); // on cooldown
    const later = updateAgent(m, 1 + MEDIUM.pauseSeconds + MEDIUM.senseCooldownSeconds, 0);
    expect(later.pausedUntil).toBeGreaterThan(m.pausedUntil);
  });

  it("other investigators do not sense possession", () => {
    for (const k of ["skeptic", "photographer"] as const) {
      expect(isPaused(updateAgent(createAgent(k), 1, 0), 1)).toBe(false);
    }
  });

  it("Photographer photographs on schedule; flash reveals the ghost only briefly", () => {
    const t = PHOTOGRAPHER.photoIntervalSeconds;
    let p = createAgent("photographer");
    p = updateAgent(p, t - 1);
    expect(isPaused(p, t - 1)).toBe(false);
    p = updateAgent(p, t);
    expect(isPaused(p, t)).toBe(true);
    expect(flashRevealsGhost(p, t)).toBe(true);
    expect(flashRevealsGhost(p, t + PHOTOGRAPHER.flashSeconds)).toBe(false);
    expect(flashRevealsGhost(createAgent("medium"), 0)).toBe(false);
  });

  it("scaring a paused Photographer has full effect; while moving she takes partial damage", () => {
    const t = PHOTOGRAPHER.photoIntervalSeconds;
    const away = scareAgent(createAgent("photographer"), piano, 0, 1);
    expect(away.fired).toBe(true);
    expect(away.agent.core.sanity).toBeCloseTo(100 - piano.damage * PHOTOGRAPHER.movingDamageMultiplier);
    const paused = updateAgent(createAgent("photographer"), t);
    const hit = scareAgent(paused, piano, 0, t);
    expect(hit.fired).toBe(true);
    expect(hit.agent.core.sanity).toBe(100 - piano.damage);
  });

  it("rattled, panicked and fleeing agents use their own behaviour and speed", () => {
    const door = { x: 0, y: 0 };
    const a = createAgent("skeptic");
    expect(behaviourOf(withSanity(a, 60), 0).action).toBe("freeze");
    expect(behaviourOf(withSanity(a, 60), 0).speed).toBeLessThan(PERSONALITIES.skeptic.speed);
    expect(behaviourOf(withSanity(a, 30), 0, door).action).toBe("back-away");
    const f = behaviourOf(withSanity(a, 0), 0, door);
    expect(f.action).toBe("run-to-door");
    expect(f.speed).toBeGreaterThan(PERSONALITIES.skeptic.speed);
    expect(f.target).toEqual(door);
  });
});

describe("acceptance", () => {
  it("the Medium breaks first under the same scripted chained scares", () => {
    const run = (kind: InvestigatorKind) => {
      let a = createAgent(kind);
      a = scareAgent(a, chandelier, 0, 0).agent; // 75
      a = recoverAgent(a, 50, true); // calm gap: 75 is still above the rattled threshold
      let scares = 0;
      let now = 10;
      while (agentState(a) !== "fleeing" && scares < 50) {
        a = scareAgent(a, piano, 0, now).agent;
        scares++;
        now += 6;
      }
      return scares;
    };
    expect(run("medium")).toBeLessThan(run("skeptic"));
  });

  it("the Skeptic survives a single Chandelier scare and keeps investigating", () => {
    const r = scareAgent(createAgent("skeptic"), chandelier, 0, 0, { x: 5, y: 5 });
    expect(r.agent.core.sanity).toBe(100 - chandelier.damage);
    expect(agentState(r.agent)).toBe("investigate");
    expect(behaviourOf(r.agent, 1).action).toBe("walk-to-scare");
  });
});
