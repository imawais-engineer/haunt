# Haunt

You are the ghost. Possess objects in a mansion and scare three investigators out before dawn.

## How to play

Possess an object, spend ectoplasm to scare the investigators near it, and chain scares so a follow-up hits harder than a single scare. Empty the house before dawn. The night lasts 300 seconds, and the game ends the moment the timer reaches zero.

You win when all three investigators have fled. You lose if dawn arrives while anyone is still inside.

## Core systems

**Sanity** is a value from 0 to 100, starting at 100. An investigator recovers +1 sanity every 5 seconds only while calm and alone. Sanity does not recover while they are rattled, panicked, or fleeing, and it never leaves the 0–100 range.

**Ectoplasm** is a value from 0 to 100, starting at 100. It regenerates at +2 per second while the ghost is not possessing an object, and it does not regenerate during a possession. A scare that costs more ectoplasm than you have does not fire.

**Investigator states** move in one direction as sanity falls:

Investigate → Rattled → Panicked → Fleeing → Gone

Rattled begins at 70, Panicked at 35, and Fleeing at 0. Fleeing ends in Gone once the investigator reaches the door.

## Balance table v1

[`src/core/balance.ts`](src/core/balance.ts) is the single source of truth for every tuning number. Game logic reads this table; costs, damage, radii, cooldowns, and thresholds are not hard-coded anywhere else.

| Object | Room | Cost | Sanity damage | Radius | Cooldown |
| --- | --- | --- | --- | --- | --- |
| Chandelier | Entrance hall | 20 | 25 | large | 8s |
| Piano | Study | 15 | 20 | medium | 6s |
| Mirror | Bedroom | 10 | 15 | small, high fright multiplier | 5s |
| Painting | Dining room | 10 | 12 | medium | 4s |

The fright multiplier applies when the target was rattled within the last 10 seconds. That window is what makes a chained scare stronger than repeating one object.

## Tech stack

- **Phaser 4** for scenes, rendering, and input
- **TypeScript** for the whole project
- **Vite** for the development server and the production build
- **Vitest** and **fast-check** for unit tests and property tests
- **GitHub Pages** for hosting

Rules live in pure TypeScript under `src/core/` and do not import Phaser. Sanity, ectoplasm, investigator state, and the dawn timer can be tested without launching the game. Scenes ask `src/core/` what happened; they do not own the rules.

## Project structure

- `.kiro/specs/` — requirements, design, and tasks for each system
- `.kiro/steering/` — architecture, balance, and presentation rules
- `.kiro/hooks/` — test on a core save, simulate when the balance table changes, and build on commit
- `.kiro/agents/` — Level Architect, Scare Director, and Balance Tester
- `src/core/` — the balance table and the pure game rules

## Development

Haunt is built spec by spec, in this order:

1. `scare-sanity-economy` — scare resolution, sanity, ectoplasm, and the dawn timer
2. `investigator-ai` — the shared state machine and the three personalities
3. `mansion-and-possession` — rooms, possessable objects, and possession

Each spec is carried through its requirements, design, and tasks before the next one starts.

## Status

Haunt is in active development.

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 Muhammad Awais.
