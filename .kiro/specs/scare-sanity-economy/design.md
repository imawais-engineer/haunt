# Spec 1 — design: scare / sanity economy

## Modules (`src/core/`, no Phaser imports)

| Module | Owns |
|---|---|
| `balance.ts` | Every tuning number (see below). The only file that changes when tuning. |
| `sanity.ts` | `applyScare`, `recoverTick`, clamping to [0, 100]. |
| `ectoplasm.ts` | `canAfford`, `spend`, `regenTick` (+2/s, unpossessed only). |
| `night.ts` | `NightTimer`: 300s, `timeLeft`, `isDawn`, ends game at 0. |

Thresholds are inclusive: sanity ≤ 70 is Rattled, ≤ 35 is Panicked, 0 is Fleeing.

## Balance table v1

| Object | Cost | Damage | Radius | Cooldown |
|---|---|---|---|---|
| Chandelier | 20 | 25 | large | 8s |
| Piano | 15 | 20 | medium | 6s |
| Mirror | 10 | 15 | small | 5s |
| Painting | 10 | 12 | medium | 4s |

Sanity starts 100, recovery +1 per 5s (calm and alone only).
Ectoplasm starts 100, max 100, regen +2/s (not possessing only).
Fright multiplier: scaring an investigator rattled within the last
10 seconds deals extra sanity damage (chaining beats spamming).

## Invariants (property-tested with fast-check)

1. Sanity always in [0, 100] for any scare/distance/recovery sequence.
2. Ectoplasm always in [0, 100]; an unaffordable scare never fires or charges.
3. Sanity is monotonic under scares alone: an extra scare never raises sanity.
4. Dawn always ends the game at 300s; no action extends the night.

## Balance target

A first-time player scares out the Medium, nearly breaks a second
investigator, and loses narrowly to dawn. A player who learns chaining
wins on run 2–3 with 30–60 seconds to spare. If playtests miss this,
tune this table — never add a new system.

## Implementation notes (review follow-up)

- Chaining rule: a scare is chained when the target is below the rattled
  threshold (70) or was rattled within the last 10 seconds. It is keyed to
  the target, not to which object scared last. Requirement R2 says
  the same, so this is intentional for v1.
- `frightMultiplier` is 1.0 for chandelier, piano and painting and 1.5 for
  mirror. These values are placeholders: requirement R2 gives no multiplier
  values, so no new values are invented here. They are tuning knobs in `balance.ts` to be set from
  playtests, not by this spec.
- `clampSanity(NaN)` returns 0, matching `clampEctoplasm(NaN)`.
- `npm run simulate:balance` has no possession or travel model and is not a
  balance signal yet.
