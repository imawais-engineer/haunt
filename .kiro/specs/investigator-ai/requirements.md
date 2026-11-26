# Spec 2 — Investigator state machine

## Requirements

- R1. All three investigators share ONE state machine:
  Investigate → Rattled → Panicked → Fleeing → Gone.
- R2. Transitions are driven only by sanity thresholds: Rattled at 70,
  Panicked at 35, Fleeing at 0. Fleeing always ends in Gone at the door.
- R3. Personality is expressed through three numbers only — speed,
  recovery rate, investigate tendency — not three codebases.
- R4. The Skeptic: moves fast between rooms, recovers sanity fastest,
  investigates scares (walks toward them). The hard target; punishes
  single big scares, rewards chained scares.
- R5. The Medium: moves slowly, senses possession nearby and pauses,
  recovers sanity slowest. The first to break — the early win that
  teaches the player the loop.
- R6. The Photographer: pauses often to take photos; her flash briefly
  reveals the ghost's position in the room. Scaring during a pause has
  full effect; scaring while she faces away wastes the scare.
- R7. The state machine is pure logic in `src/core/investigator.ts`
  (no Phaser imports) and is unit-testable without launching the game.

## Design

- `investigator.ts` holds the state machine, the three personality
  parameter sets, and the transition function `nextState(investigator,
  sanity, event)`.
- Movement/waypoints and rendering live in the Phaser scene; the scene
  asks `core/` what state an investigator is in and renders accordingly.
- Investigate = walk room routes; Rattled = freeze/whisper, move slower;
  Panicked = back away, head for the door; Fleeing = run screaming for
  the front door; Gone = removed from the house permanently.
- The Skeptic's "investigate" behaviour is a walk toward the last scare
  location — this is what makes chaining work: he comes to look, and
  the next scare lands at close range.

## Tasks

- [ ] 2.1 `src/core/investigator.ts` — states, thresholds (70/35/0),
  transition function, three personality parameter sets.
- [ ] 2.2 Personality behaviours: Skeptic investigates, Medium senses
  possession and pauses, Photographer pauses to photograph (flash).
- [ ] 2.3 Fleeing → Gone at the door; Gone investigators never return.
- [ ] 2.4 Unit tests: every transition at its threshold; sanity 0
  always → Fleeing → Gone; no state reachable except via its threshold.
