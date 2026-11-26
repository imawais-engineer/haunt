# Day 5 balance notes

## Baseline (no tuning applied)

`npm run simulate:balance` bot result, both numbers recorded:

- 163s left: measured at `possessCost` 5 (historical).
- 190.8s left: measured at `possessCost` 0 (current baseline).

Both runs: 3 of 3 investigators gone, 15 scares (wins).

If a possess cost is ever reintroduced, the skipped ectoplasm-heading test un-skips.

All tuning numbers live only in `src/core/balance.ts`.

## Levers and placeholders

- `GHOST.possessCost` is 0. The spec defines no possess cost, only scares cost ectoplasm. Raise it if possession-hopping feels free.
- Photographer `movingDamageMultiplier` is a 50% placeholder.
- Fright multipliers (`frightMultiplier` per object) are placeholders.

## Process

The Day 5 balance brief must explicitly invoke the Balance Tester agent (`.kiro/agents/balance-tester.md`).
