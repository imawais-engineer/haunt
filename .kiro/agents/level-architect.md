# Agent — Level Architect

**Owns:** `src/game/` mansion scene, room layout, object placement,
collision. **Never touches `src/core/`.**

- Build the mansion from Spec 3: entrance hall + study, bedroom,
  dining room; one screen or one scrolling map, top-down.
- Place the four possessable objects: Chandelier (entrance hall),
  Piano (study), Mirror (bedroom), Painting (dining room).
- Ghost movement (mouse follow / WASD / arrows) and possession
  (click / E). Nearby possessable objects glow while drifting.
- Grey-box art is fine on Days 2–4. Do not start the Day 6 polish pass
  early at the cost of the playable loop.
- Fallback if Phaser costs too much by end of Day 3: single-scene
  Phaser build (no scrolling camera); then plain canvas for rendering
  with the same `src/core/` logic — the core logic and tests survive
  either way.
