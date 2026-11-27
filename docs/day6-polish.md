# Day 6: hop-cost cue and polish

## What changed
- HUD: ectoplasm label reads `Ectoplasm N (possess C)` with C taken from `GHOST.possessCost`, plus a white tick on the bar at that cost. Investigator labels now use two lines (name, state) with a small face portrait tinted by state, so the wider ectoplasm label fits.
- Feedback: pressing E in range, a click-flight that gives up, or a scare attempt without enough ectoplasm shows "Not enough ectoplasm" above the ghost (fades in 1.2s), flashes the ectoplasm bar red and plays a short low buzz. A scare on cooldown shows "Still recharging".
- Costume: sheet-ghost with eyes, wavy hem, bob and a glow while possessing; vignette; camera shake on scare; investigator barks on worsening state; title screen with gradient, fog, ghost silhouette, flickering candle and glowing title; end screens with dawn gradient (win) or dark fog (lose).
- Pure helpers in `src/game/effects.ts` (tested in `tests/game/polish.test.ts`); all constants in `src/game/presentation.ts`.

## Assets
All procedural (Phaser graphics, WebAudio). No external assets.

## Balance
Unchanged. `git diff main -- src/core` is empty.

## Verification
`npm test` (116 pass), `npm run build`, headless `playtest.mjs win` and `lose` finished with no page errors (only WebGL GPU-stall warnings). Screenshots in `docs/day6-polish/`.
