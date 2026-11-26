# Day 5 balance notes

## Baseline (no tuning applied)

`npm run simulate:balance` bot result: wins with about 163s left (the 190.8s seen after the possessCost change to 0 is not the baseline), 3 of 3 investigators gone, 15 scares.

All tuning numbers live only in `src/core/balance.ts`.

## Levers and placeholders

- `GHOST.possessCost` is 0. The spec defines no possess cost, only scares cost ectoplasm. Raise it if possession-hopping feels free.
- Photographer `movingDamageMultiplier` is a 50% placeholder.
- Fright multipliers (`frightMultiplier` per object) are placeholders.

## Process

The Day 5 balance brief must explicitly invoke the Balance Tester agent (`.kiro/agents/balance-tester.md`).
