import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ECTOPLASM, GHOST, MANSION, OBJECT_POSITIONS, SANITY, SCARE_OBJECTS } from "../../src/core/balance";
import { createAgent, agentState } from "../../src/core/investigator";
import { travelSeconds, objectById } from "../../src/core/mansion";
import {
  createActor,
  type Actor,
  createGhost,
  drift,
  ghostRevealed,
  glowingObjects,
  headFor,
  possess,
  possessableObject,
  release,
  scare,
  updateActor,
  updateGhost,
  updateWorld,
  type Ghost,
} from "../../src/core/possession";

const at = (g: Ghost, id: keyof typeof OBJECT_POSITIONS): Ghost => ({ ...g, pos: OBJECT_POSITIONS[id] });
const possessing = (id: keyof typeof OBJECT_POSITIONS, ecto: number = ECTOPLASM.start) =>
  possess(at(createGhost(ecto), id), id);

describe("possess / release", () => {
  it("possesses in range, pays the cost, and snaps to the object", () => {
    const g = possessing("piano");
    expect(g.possessed).toBe("piano");
    expect(g.ectoplasm).toBe(ECTOPLASM.start - GHOST.possessCost);
    expect(g.pos).toEqual(OBJECT_POSITIONS.piano);
  });

  it("fails out of range, when broke, or when already possessing", () => {
    const far = createGhost(100);
    expect(possess(far, "mirror")).toBe(far);
    const broke = at(createGhost(GHOST.possessCost - 1), "mirror");
    expect(possess(broke, "mirror").possessed).toBeNull();
    const g = possessing("piano");
    expect(possess(g, "piano")).toBe(g);
  });

  it("release is free, keeps cooldowns, and does nothing when drifting", () => {
    const fired = scare(possessing("mirror"), [], 0).ghost;
    const out = release(fired);
    expect(out.possessed).toBeNull();
    expect(out.ectoplasm).toBe(fired.ectoplasm);
    expect(out.cooldowns).toEqual(fired.cooldowns);
    const d = createGhost(50);
    expect(release(d)).toBe(d);
  });

  it("glows nearby objects only while drifting; E picks the nearest in range", () => {
    const g = at(createGhost(100), "chandelier");
    expect(glowingObjects(g)).toContain("chandelier");
    expect(possessableObject(g)).toBe("chandelier");
    expect(glowingObjects(possessing("chandelier"))).toEqual([]);
    expect(possessableObject({ ...createGhost(100), pos: { x: 0, y: 600 } })).toBeNull();
  });
});

describe("travel", () => {
  it("clicking an object flies there and possesses on arrival, taking about distance/speed seconds", () => {
    let g = headFor(createGhost(100), "painting");
    const eta = travelSeconds(g.pos, OBJECT_POSITIONS.painting);
    let t = 0;
    while (!g.possessed && t < 60) {
      g = updateGhost(g, 0.1);
      t += 0.1;
    }
    expect(g.possessed).toBe("painting");
    expect(t).toBeLessThanOrEqual(eta + 0.2);
    expect(t).toBeGreaterThan(eta - GHOST.possessRangePx / GHOST.speedPxPerSecond - 0.2);
  });

  it("gives up the heading when ectoplasm is too low", () => {
    let g = headFor(createGhost(0), "painting");
    for (let i = 0; i < 200; i++) g = { ...updateGhost(g, 0.1), ectoplasm: 0 };
    expect(g.possessed).toBeNull();
    expect(g.heading).toBeNull();
  });

  it("drifting cancels a heading; possessed ghosts do not drift", () => {
    expect(drift(headFor(createGhost(100), "piano"), { x: 0, y: 0 }, 0.1).heading).toBeNull();
    const g = possessing("piano");
    expect(drift(g, { x: 0, y: 0 }, 1)).toBe(g);
  });

  it("regens ectoplasm only while drifting", () => {
    expect(updateGhost(createGhost(50), 1).ectoplasm).toBe(50 + ECTOPLASM.regenPerSecond);
    const g = possessing("piano", 50);
    expect(updateGhost(g, 1).ectoplasm).toBe(g.ectoplasm);
  });
});

describe("scare through the economy and investigator rules", () => {
  const actorAt = (kind: Parameters<typeof createAgent>[0], id: keyof typeof OBJECT_POSITIONS, dx = 0): Actor => ({
    ...createActor(createAgent(kind)),
    pos: { x: OBJECT_POSITIONS[id].x + dx, y: OBJECT_POSITIONS[id].y },
  });

  it("spends the object's cost, starts its cooldown and damages in-range investigators", () => {
    const g = possessing("chandelier");
    const out = scare(g, [actorAt("skeptic", "chandelier")], 1);
    const o = objectById("chandelier");
    expect(out.fired).toBe(true);
    expect(out.ghost.ectoplasm).toBe(g.ectoplasm - o.cost);
    expect(out.ghost.cooldowns["chandelier"]).toBe(1 + o.cooldownSeconds);
    expect(out.actors[0]!.agent.core.sanity).toBe(SANITY.start - o.damage);
    expect(out.actors[0]!.agent.lastScare).toMatchObject(OBJECT_POSITIONS.chandelier);
  });

  it("does nothing when drifting, on cooldown, or unaffordable", () => {
    const actors = [actorAt("skeptic", "piano")];
    const drifting = at(createGhost(100), "piano");
    expect(scare(drifting, actors, 0).fired).toBe(false);
    const g = possessing("piano");
    const first = scare(g, actors, 0);
    const again = scare(first.ghost, first.actors, 1);
    expect(again.fired).toBe(false);
    expect(again.actors).toBe(first.actors);
    const poor = { ...g, ectoplasm: 0 };
    expect(scare(poor, actors, 0).fired).toBe(false);
  });

  it("falls off with distance and misses outside the radius", () => {
    const g = possessing("mirror");
    const near = scare(g, [actorAt("skeptic", "mirror", 10)], 0).actors[0]!.agent.core.sanity;
    const edge = scare(g, [actorAt("skeptic", "mirror", 140)], 0).actors[0]!.agent.core.sanity;
    const out = scare(g, [actorAt("skeptic", "mirror", 400)], 0).actors[0]!.agent.core.sanity;
    expect(near).toBeLessThan(edge);
    expect(out).toBe(SANITY.start);
  });

  it("chains: a second scare within the window on a rattled target hits harder (Mirror 1.5x)", () => {
    const g = possessing("mirror", 100);
    const start = { ...actorAt("skeptic", "mirror") };
    const rattled = { ...start, agent: { ...start.agent, core: { ...start.agent.core, sanity: 60, lastRattledAt: 0 } } };
    const out = scare(g, [rattled], 1).actors[0]!.agent.core.sanity;
    expect(out).toBe(60 - 15 * 1.5);
  });

  it("the Photographer takes half damage while moving", () => {
    const g = possessing("piano");
    const sk = scare(g, [actorAt("skeptic", "piano")], 0).actors[0]!.agent.core.sanity;
    const ph = scare(g, [actorAt("photographer", "piano")], 0).actors[0]!.agent.core.sanity;
    expect(SANITY.start - ph).toBeCloseTo((SANITY.start - sk) / 2);
  });

  it("property: ectoplasm and sanity stay in [0,100] under random possess/scare/release", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.constantFrom(...SCARE_OBJECTS.map((o) => o.id)), fc.double({ min: 0, max: 8, noNaN: true })), { maxLength: 40 }), (steps) => {
        let g = createGhost(100);
        let actors = [actorAt("skeptic", "piano"), actorAt("medium", "mirror")];
        let now = 0;
        for (const [id, dt] of steps) {
          now += dt;
          g = possess(at(release(g), id), id);
          const r = scare(g, actors, now);
          g = r.ghost;
          actors = [...r.actors];
          g = updateGhost(g, dt);
          expect(g.ectoplasm).toBeGreaterThanOrEqual(0);
          expect(g.ectoplasm).toBeLessThanOrEqual(100);
          for (const a of actors) {
            expect(a.agent.core.sanity).toBeGreaterThanOrEqual(0);
            expect(a.agent.core.sanity).toBeLessThanOrEqual(100);
          }
        }
      }),
    );
  });
});

describe("visibility and investigators in the world", () => {
  it("ghost is invisible unless a Photographer flash is active", () => {
    const base = createActor(createAgent("photographer"));
    expect(ghostRevealed([base], 0)).toBe(false);
    const flashing = { ...base, agent: { ...base.agent, flashUntil: 5 } };
    expect(ghostRevealed([flashing], 1)).toBe(true);
    expect(ghostRevealed([flashing], 5)).toBe(false);
  });

  it("a fleeing investigator runs to the door and becomes gone; Gone is permanent", () => {
    const a = createActor(createAgent("skeptic"));
    let actor = { ...a, agent: { ...a.agent, core: { ...a.agent.core, sanity: 0 } } };
    const g = createGhost(100);
    for (let t = 0; t < 60 && agentState(actor.agent) !== "gone"; t += 0.1) actor = updateActor(actor, [actor], g, t, 0.1);
    expect(agentState(actor.agent)).toBe("gone");
    expect(actor.pos.x).toBeGreaterThan(MANSION.door.x - MANSION.doorReachPx - 1);
    expect(agentState(updateActor(actor, [actor], g, 99, 1).agent)).toBe("gone");
  });

  it("an investigating Medium pauses when the ghost possesses an object near her", () => {
    const m = { ...createActor(createAgent("medium")), pos: { x: OBJECT_POSITIONS.chandelier.x + 50, y: OBJECT_POSITIONS.chandelier.y } };
    const w = updateWorld(possessing("chandelier"), [m], 1, 0.1);
    expect(w.actors[0]!.agent.pausedUntil).toBeGreaterThan(1);
  });

  it("patrolling investigators move along the route", () => {
    const a = createActor(createAgent("skeptic"));
    const w = updateWorld(createGhost(100), [a], 0, 1);
    expect(w.actors[0]!.pos).not.toEqual(a.pos);
  });
});
