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

- `GHOST.possessCost` is 6 (was 0). The spec defines no possess cost, only scares cost ectoplasm. Raised on Day 5 so possession-hopping is not free.
- Photographer `movingDamageMultiplier` is a 50% placeholder.
- Fright multipliers (`frightMultiplier` per object) are placeholders.

## Day 5 observations (from the Day 4 playtest)

- Ectoplasm drops from about 58 to about 9 within 10s of the first scares, then regenerates slowly.
- An idle ghost is never found, so waiting costs nothing until dawn.

## Process

The Day 5 balance brief must explicitly invoke the Balance Tester agent (`.kiro/agents/balance-tester.md`).

## Day 5 balance pass (Balance Tester role, `.kiro/agents/balance-tester.md`)

### Method and honesty note

- `npm run simulate:balance` now runs three seeded profiles through the real `src/core/` loop: `perfect` (chaining bot, zero reaction time), `spam` (scares whenever ready, never leaves an object to regen) and `human`.
- **`human` is a handicapped approximation of a first-time player, not a human playtest.** Its parameters are guesses: about 1.2s mean reaction, 25% wrong target, 10% missed click, 10% chance of a 4s idle spell, no scares with nobody in reach. A real first-time player may be better or worse. Treat its numbers as a direction, and confirm with a human.
- `narrowLoss%` = lost at dawn with at least one investigator gone and a survivor at sanity 35 or below.
- Real-time numbers come from `node scripts/playtest.mjs` (headless Chromium, one scripted bot, not a human). `docs/day4-playtest/` was restored with `git checkout` afterwards.

### Changes (only `src/core/balance.ts` numbers)

| Lever | Before | After |
| --- | --- | --- |
| Scare damage chandelier / piano / mirror / painting | 25 / 20 / 15 / 12 | 20 / 16 / 12 / 10 |
| `GHOST.possessCost` | 0 | 6 |
| Everything else (costs, regen 2/s, fright multipliers 1.0/1.0/1.5/1.0, Photographer 0.5, ghost speed 220, investigator speed and recovery) | unchanged | unchanged |

Damage is about 0.8x and hopping now costs ectoplasm. Other levers were not needed; sweeps below show why. `tests/core/possession.test.ts` heading test is now un-skipped (the `skipIf` was removed). Tests that pinned damage numbers (`acceptance.test.ts`, one in `possession.test.ts`) now derive expectations from the table.

### Before / after

| Measure | Before | After |
| --- | --- | --- |
| Perfect bot, simulation (time left, win) | 190.8s | 59.4s |
| Handicapped human, 300 seeded runs: wins | 88% (264 of 300) | 4% (11 of 300) |
| Human, investigators gone at dawn 0 / 1 / 2 / 3 | 1 / 3 / 32 / 264 | 12 / 104 / 173 / 11 |
| Human, narrow-loss share (300 seeded runs; the 100-run default of `simulate:balance` shows 93%) | 11% | 90% |
| Human, mean time of first investigator leaving | 63s | 130s |
| Human, mean time left when it does win | 96s | 53s |
| Spam bot | loses, 0 gone, 5 scares | loses, 0 gone, 4 scares |
| Playtest win run, scripted bot (real time) | win, about 206-212s left | win, 34s left (after bot fix, see below) |
| Playtest lose run, idle | lose at dawn, all sanity 100 | lose at dawn, all sanity 100 |

The playtest bot needed one fix: it only checked that it could afford a scare, not the hop. With `possessCost` 6 it hopped, could not scare, released, and looped near 10 ectoplasm, never winning (first attempt: lose, Medium and Skeptic stuck rattled). `scripts/playtest.mjs` now requires `cost + possessCost` before hopping. This is a real trap for human players too: after a hop you need the scare cost on top.

### Sweep evidence (human profile, 300 runs; perfect time left)

| Setting | Perfect time left | Human win% | Human 0/1/2/3 gone |
| --- | --- | --- | --- |
| Baseline | 190.8s | 88 | 1/3/32/264 |
| damage x0.8 only | 114.0s | 66 | 0/9/93/198 |
| damage x0.7 only | 79.0s | 37 | 1/6/181/112 |
| regen 1/s only | 112.2s | 7 | 11/69/198/22 |
| possessCost 5 only | 162.9s | 7 | 13/84/182/21 |
| damage x0.8 + possessCost 3 | 85.9s | 5 | 15/93/177/15 |
| damage x0.8 + possessCost 5 | 67.9s | 5 | 13/100/172/15 |
| damage x0.7 + possessCost 5 | 27.3s | 1 | 9/80/209/2 |
| **chosen: damage 20/16/12/10 + possessCost 6** | **59.4s** | **4** | **12/104/173/11** |
| same, possessCost 7 | 50.2s | 2 | 15/108/170/7 |

Damage alone shrinks the margin but not the human win rate quickly. A hop cost alone hits the human hard (it taxes the many hops a handicapped player makes) but leaves the perfect bot with 163s. The pair lands both targets. Regen 1/s has the same human effect but halves the ghost's tempo for everyone, so it was not chosen.

### (a) Ectoplasm 58 to 9 in 10s of first scares: too expensive, or spam?

Neither. Start pool 100 with average scare cost 13.75 is 7.3 scares. Regen 2/s sustains about 8.7 scares per minute. A bot that chains scares as fast as cooldowns allow spends the pool in about 20s, which is the 58 to 9 drop. The cost/damage ratios are close (0.67 to 0.83 ectoplasm per damage point), so no object is a bad deal. The `spam` profile (never releases) shows the real failure: it fires 4 to 5 scares, runs dry and then sits possessed with no regen (regen stops while possessing), so it never wins. The early game is a burst, then a pacing game: scare, release, regen, repeat. This is working as designed and is the correct skill gate. The perfect simulation bot sits at 54 to 56 ectoplasm at t=10s because it flies and waits rather than firing every cooldown.

### (b) Idle ghost has no pressure: does waiting cost anything?

Spec 1 (`.kiro/specs/scare-sanity-economy`) says sanity recovers +1 per 5s only while calm and alone. In code (`recoverTick` in `src/core/sanity.ts`) "calm" means state `investigate`, i.e. sanity above 70, and "alone" means no other living investigator within 180px. The personality rate multiplies it (Skeptic x2 = 0.4/s, Photographer x1 = 0.2/s, Medium x0.5 = 0.1/s). Consequences:

- A rattled investigator (70 or below) never recovers, so damage that crosses the rattle line is permanent. Only light damage heals.
- Waiting therefore already has a cost: recovery erodes small hits, and the 300s dawn clock keeps running. The idle playtest run loses with all sanity at 100.
- Idle pressure from an investigator finding the ghost is not needed. The win condition needs all three gone, so a ghost that does nothing loses. The handicapped profile, which includes idle spells, loses 96% of runs (11 wins in 300 seeded runs; `npm run simulate:balance` default 100 runs gives 4% wins).

Recommendation: no idle-pressure mechanic. Adding one would be a new system, which steering forbids.

### Decisions needed

1. Human target: chosen numbers give 90% narrow losses but 58% of human losses end with 2 gone, which is a bit more generous than "nearly break a second". The simulation cannot tell if a real player's tempo is closer. Confirm with one real playtest before locking.
2. Perfect bot wins with 59s left, at the top of the 30 to 60s band. Fine for run 2 to 3 chaining, but a real chaining player is not a perfect bot.
3. Should `balance.ts` be locked now (steering: lock by end of Day 5), or do you want a human playtest first?

## Day 5 re-run of both playtest scenarios

Run on branch `day5/balance` with `node scripts/playtest.mjs win` and `lose` (logs in `docs/day5-playtest/`; `docs/day4-playtest/` restored).

- win: PASS, exit 0, win with 34.6s left, second night started. No page errors (only 4 WebGL "GPU stall due to ReadPixels" driver warnings).
- lose: PASS, exit 0, idle run loses at dawn with all sanity 100, second night started. No page errors (same WebGL warnings only).

## Status

Balance unlocked pending human playtest.

The narrow-loss evidence is bot-only. The handicapped bot is an approximation, not a human. `src/core/balance.ts` is not locked. The lock happens after one real human playtest.
