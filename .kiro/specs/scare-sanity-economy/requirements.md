# Spec 1 — Scare / sanity economy

## Requirements

- R1. Sanity is a number in [0, 100] per investigator, starting at 100.
  It never goes below 0 or above 100, for any sequence of scares,
  distances and recovery ticks.
- R2. A scare removes sanity based on the object's power, the
  investigator's distance, and a fright multiplier if the investigator
  was already rattled in the last 10 seconds.
- R3. Sanity recovers +1 per 5 seconds only while the investigator is
  calm and alone. It never recovers while rattled, panicked or fleeing.
- R4. Ectoplasm is a number in [0, 100], starting at 100. Each scare
  costs its object's cost (see `src/core/balance.ts`). A scare that
  cannot be afforded never fires and never charges.
- R5. Ectoplasm regenerates at +2 per second while the ghost is not
  possessing anything, and does not regenerate while possessing.
- R6. One night lasts exactly 300 seconds. When the timer reaches zero
  the game ends immediately; no sequence of actions extends the night.
- R7. Win: all three investigators have fled before dawn.
  Lose: dawn arrives with at least one investigator still inside.
- R8. All tuning numbers live only in `src/core/balance.ts`. No number
  from the balance table is hard-coded in game logic.

## Design

- Pure TypeScript modules in `src/core/`, with no Phaser imports:
  `sanity.ts`, `ectoplasm.ts`, `night.ts`, `balance.ts`.
- `applyScare(investigator, object, distance, now)` returns the new
  sanity and whether the scare fired; it never mutates Phaser state.
- Scare power, cost, radius and cooldown come from `balance.ts`
  (Chandelier 25/20/large/8s, Piano 20/15/medium/6s,
  Mirror 15/10/small/5s, Painting 12/10/medium/4s).
- Fright multiplier applies when the target was rattled within the
  last 10 seconds — this is what makes chaining scares stronger than
  spamming one object.
- Tests: Vitest unit tests for examples, fast-check property tests for
  R1, R4, R6 and "an extra scare never raises sanity".

## Tasks

- [ ] 1.1 Create `src/core/balance.ts` with the v1 balance table.
- [ ] 1.2 Implement `sanity.ts`: apply scare, clamp 0–100, calm-only recovery.
- [ ] 1.3 Implement `ectoplasm.ts`: spend, affordability gate, +2/s regen while unpossessed.
- [ ] 1.4 Implement `night.ts`: 300s countdown, dawn ends game immediately.
- [ ] 1.5 Write unit + property tests in `tests/core/`; all green via the save hook.
