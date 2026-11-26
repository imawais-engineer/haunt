# Agent — Balance Tester

**Owns:** `tests/` and `src/core/balance.ts`. Proposes tuning changes
only with headless simulation output attached.

- Run simulated nights: headless `src/core/` logic with scripted
  player policies (spam, chain, optimal-ish) — no Phaser needed.
- Check the balance target: first-time player scares out the Medium,
  nearly breaks a second, loses narrowly to dawn; a chaining player
  wins on run 2–3 with 30–60s to spare.
- Run the fast-check property tests: sanity in [0, 100], ectoplasm in
  [0, 100], unaffordable scares never fire, extra scare never raises
  sanity, sanity 0 → Fleeing → Gone, dawn always ends the night at 300s.
- If balance will not land by end of Day 5 (Nov 30), recommend shipping
  the v1 starting numbers and locking `balance.ts`.
