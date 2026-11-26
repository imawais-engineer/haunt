# Spec 2 — tasks: investigator state machine

- [ ] 2.1 `src/core/investigator.ts` — states, 70/35/0 thresholds,
  `nextState` transition function, three personality parameter sets.
- [ ] 2.2 Skeptic investigate behaviour (walks toward last scare).
- [ ] 2.3 Medium possession-sense pause; Photographer photo pause + flash.
- [ ] 2.4 Fleeing → Gone at the front door; Gone is permanent.
- [ ] 2.5 Unit tests in `tests/core/`: each threshold transition, sanity 0
  always → Fleeing → Gone, recovery only returns Rattled → Investigate
  when calm and alone.
- [ ] 2.6 Acceptance: a scripted Medium (slowest recovery) breaks first
  under chained scares; the Skeptic survives a single Chandelier scare.
