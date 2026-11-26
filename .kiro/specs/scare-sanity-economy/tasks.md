# Spec 1 — tasks: scare / sanity economy

Work in order. Do not start the next spec until these tests are green.

- [ ] 1.1 `src/core/balance.ts` — v1 table (objects, costs, damage,
  radius, cooldowns, sanity/ectoplasm/dawn constants).
- [ ] 1.2 `src/core/sanity.ts` — apply scare with distance falloff and
  fright multiplier; clamp 0–100; calm-and-alone recovery +1/5s.
- [ ] 1.3 `src/core/ectoplasm.ts` — affordability gate (unaffordable
  scare never fires/charges), spend on fire, +2/s regen unpossessed.
- [ ] 1.4 `src/core/night.ts` — 300s timer, `isDawn` at 0, game ends
  immediately; win = all fled, lose = anyone inside at dawn.
- [ ] 1.5 `tests/core/` — Vitest unit tests + fast-check property tests
  for the four invariants in `design.md`. Run via the save hook.
- [ ] 1.6 Acceptance: `npm test` green; a scripted sequence (possess
  piano → scare Medium twice, chained) drops sanity as the table says
  and never breaks an invariant.
