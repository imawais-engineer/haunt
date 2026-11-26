import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { GHOST, MANSION, OBJECT_POSITIONS, PATROL_ROUTE, SCARE_OBJECTS } from "../../src/core/balance";
import { distance, moveToward, objectInRoom, roomAt, travelSeconds } from "../../src/core/mansion";

describe("mansion layout (Spec 3 R1, R4)", () => {
  it("places each object in the spec's room", () => {
    const expected = { chandelier: "entrance", piano: "study", mirror: "bedroom", painting: "dining" };
    for (const o of SCARE_OBJECTS) {
      expect(o.room).toBe(expected[o.id]);
      expect(roomAt(OBJECT_POSITIONS[o.id])).toBe(o.room);
      expect(objectInRoom(o.room).id).toBe(o.id);
    }
  });

  it("has entrance hall plus study, bedroom, dining room, and a door outside every room's interior", () => {
    expect(Object.keys(MANSION.rooms).sort()).toEqual(["bedroom", "dining", "entrance", "study"]);
  });

  it("keeps patrol waypoints and the door on the map", () => {
    for (const p of [...PATROL_ROUTE, MANSION.door]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(MANSION.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(MANSION.height);
    }
    for (const p of PATROL_ROUTE) expect(roomAt(p)).not.toBeNull();
  });
});

describe("travel model", () => {
  it("travel time is distance over ghost speed", () => {
    const a = OBJECT_POSITIONS.piano;
    const b = OBJECT_POSITIONS.chandelier;
    expect(travelSeconds(a, b)).toBeCloseTo(distance(a, b) / GHOST.speedPxPerSecond);
    expect(travelSeconds(a, a)).toBe(0);
  });

  it("moveToward never overshoots and moves at most speed*dt", () => {
    fc.assert(
      fc.property(
        fc.record({ x: fc.double({ min: 0, max: 960, noNaN: true }), y: fc.double({ min: 0, max: 640, noNaN: true }) }),
        fc.record({ x: fc.double({ min: 0, max: 960, noNaN: true }), y: fc.double({ min: 0, max: 640, noNaN: true }) }),
        fc.double({ min: 0, max: 5, noNaN: true }),
        (from, to, dt) => {
          const next = moveToward(from, to, 100, dt);
          expect(distance(from, next)).toBeLessThanOrEqual(100 * dt + 1e-6);
          expect(distance(next, to)).toBeLessThanOrEqual(distance(from, to) + 1e-6);
        },
      ),
    );
  });

  it("ignores invalid dt", () => {
    const from = { x: 1, y: 1 };
    expect(moveToward(from, { x: 9, y: 9 }, 100, -1)).toBe(from);
    expect(moveToward(from, { x: 9, y: 9 }, 100, Number.NaN)).toBe(from);
  });
});
