import { GHOST, MANSION, OBJECT_POSITIONS, SCARE_OBJECTS, type RoomId, type ScareObject } from "./balance";
import type { Point } from "./investigator";

export type ObjectId = ScareObject["id"];

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function objectById(id: ObjectId): ScareObject {
  return SCARE_OBJECTS.find((o) => o.id === id)!;
}

export function objectPosition(id: ObjectId): Point {
  return OBJECT_POSITIONS[id];
}

/** Which room contains the point, or null outside every room. First match wins on shared edges. */
export function roomAt(p: Point): RoomId | null {
  for (const id of Object.keys(MANSION.rooms) as RoomId[]) {
    const r = MANSION.rooms[id];
    if (p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height) return id;
  }
  return null;
}

/** The scare object located in a room. */
export function objectInRoom(room: RoomId): ScareObject {
  return SCARE_OBJECTS.find((o) => o.room === room)!;
}

/** Move `from` toward `to` by at most `speed * dt` px. Never overshoots. Invalid input does not move. */
export function moveToward(from: Point, to: Point, speed: number, dt: number): Point {
  if (!(speed > 0) || !(dt > 0)) return from;
  const d = distance(from, to);
  const step = speed * dt;
  if (d <= step) return { x: to.x, y: to.y };
  return { x: from.x + ((to.x - from.x) * step) / d, y: from.y + ((to.y - from.y) * step) / d };
}

/** Seconds the ghost needs to drift between two points. */
export function travelSeconds(a: Point, b: Point): number {
  return distance(a, b) / GHOST.speedPxPerSecond;
}

export function isAtDoor(p: Point): boolean {
  return distance(p, MANSION.door) <= MANSION.doorReachPx;
}
