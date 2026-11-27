# Day 5 balance notes

## Baseline (no tuning applied)

Current bot baseline: **212s left** (win), from the Day 4 real-time playtest (`docs/day4-playtest.md`, `possessCost` 0).

Older measurements, not targets to return to:

- 163s left: `npm run simulate:balance` at `possessCost` 5 (historical).
- 190.8s left: `npm run simulate:balance` at `possessCost` 0 (older simulation).

Day 5 target: a narrow loss for a first-time human player.

If a possess cost is ever reintroduced, the skipped ectoplasm-heading test un-skips.

All tuning numbers live only in `src/core/balance.ts`.

## Levers and placeholders

- `GHOST.possessCost` is 0. The spec defines no possess cost, only scares cost ectoplasm. Raise it if possession-hopping feels free.
- Photographer `movingDamageMultiplier` is a 50% placeholder.
- Fright multipliers (`frightMultiplier` per object) are placeholders.

## Day 5 observations (from the Day 4 playtest)

- Ectoplasm drops from about 58 to about 9 within 10s of the first scares, then regenerates slowly.
- An idle ghost is never found, so waiting costs nothing until dawn.

## Process

The Day 5 balance brief must explicitly invoke the Balance Tester agent (`.kiro/agents/balance-tester.md`).
