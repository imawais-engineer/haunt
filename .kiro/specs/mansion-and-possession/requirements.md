# Spec 3 — Mansion and possession

## Requirements

- R1. One mansion: entrance hall + 3 rooms (study, bedroom, dining
  room), top-down, single screen or single scrolling map.
- R2. Ghost movement: mouse follow, or WASD / arrow keys. The ghost is
  invisible to investigators while drifting.
- R3. Possession: click an object, or press E near it, to possess;
  click / Space triggers its scare; leaving the object frees the ghost.
  Nearby possessable objects glow while drifting.
- R4. Four possessable objects, each with one animated, sounded scare:
  Chandelier (entrance hall), Piano (study), Mirror (bedroom),
  Painting (dining room).
- R5. Every scare fires animation + sound + light together. A scare
  that only moves a number is a failed scare.
- R6. HUD always visible and legible: sanity bars (per investigator),
  ectoplasm meter, dawn sky strip / clock (deep night → grey dawn).
- R7. Title screen with instructions in under 30 words; win screen,
  lose screen, instant restart (Esc / R on end screens).
- R8. Haunted presentation: flickering candlelight, fog at the edges,
  creaking doors, portraits, dust, night-to-dawn sky.
- R9. Sound minimum: one cue per scare, ambient drone, flee scream,
  win/lose sting — free-license or generated assets only, every asset's
  source recorded in the repo.

## Design

- Phaser 4 scenes: Boot, Title, Mansion, End. Scenes render and take
  input only; every rule lives in `src/core/` and scenes ask it.
- `src/core/` never imports Phaser. `game/` never hard-codes a tuning
  number — it reads `balance.ts`.
- Grey-box art is acceptable on Day 3–4; the Costume Contest polish
  pass is Day 6 (Dec 1) and must not be started early at the cost of
  the playable loop.
- Out of scope (cut on purpose): more rooms/floors, more investigators,
  multiplayer, progression/unlocks, story campaign, procedural rooms,
  leaderboards, achievements.

## Tasks

- [ ] 3.1 Phaser + Vite skeleton renders an empty mansion (Day 2).
- [ ] 3.2 Rooms, object placement, collision; ghost movement + possession.
- [ ] 3.3 Scare trigger (click / Space), cooldowns from `balance.ts`.
- [ ] 3.4 HUD: sanity bars, ectoplasm meter, dawn sky strip.
- [ ] 3.5 Title / win / lose screens + instant restart.
- [ ] 3.6 Candle flicker, fog, audio cues (one per scare + drone + scream + stings).
- [ ] 3.7 Acceptance (Day 4): full run works end-to-end — possess,
  scare, flee, dawn, win/lose/restart. Ugly is acceptable; incomplete
  is not. First full playtest recorded.
