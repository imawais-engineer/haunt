# Steering — balance

- All tuning numbers live only in `src/core/balance.ts`. Changing a
  number never requires touching game logic.
- Balance target: a first-time player scares out the Medium, nearly
  breaks a second investigator, and loses narrowly to dawn. A player
  who learns chaining wins on run 2–3 with 30–60 seconds to spare.
- If playtests miss the target, tune the table in `balance.ts` — never
  add a new system.
- A slightly easy game demos better than a frustrating one. If balance
  will not land by end of Day 5 (Nov 30), ship the v1 starting numbers
  and lock `balance.ts`.
- Balance changes are proposed by the Balance Tester agent with the
  headless simulation output attached — never from a hunch alone.
