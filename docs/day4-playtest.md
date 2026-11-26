# Day 4 playtest

## Environment

- Chromium 159.0.8154.6, headless, driven by Playwright (`scripts/playtest.mjs`).
- WebGL through SwiftShader (`--use-gl=swiftshader --enable-unsafe-swiftshader`). Phaser ran with the shipped config (`Phaser.AUTO`), no changes.
- Viewport 1280x800. Vite dev server, page opened with `?debug`, which exposes a read-only `window.__haunt` (the Phaser game) so the script can read time left and sanity.
- Run: `node scripts/playtest.mjs win` and `node scripts/playtest.mjs lose` (each starts its own Vite server). Screenshots and JSON logs go to `docs/day4-playtest/`.

## Method

All game input was real mouse and keyboard events (Playwright `mouse.click`, `keyboard.press/down`). State was only read, never written.

- **win run**: click the title to start, hold `D` and click empty floor (WASD and mouse drift both moved the ghost), then a bot loop every 200 ms: if the possessed object is ready, affordable and has an investigator in radius, press Space. Otherwise click the best ready object (most investigators in radius), or press R to release and regenerate ectoplasm. After the end screen, Enter restarts.
- **lose run**: click to start, then do nothing for the whole night. After the end screen, click restarts.

Both runs were real time, not accelerated.

## Results

| Run | Outcome | Time left | Wall time |
| --- | --- | --- | --- |
| win (bot as ghost) | Win, "They fled. The house is yours." | about 212 s (night ended 88 s in) | 90 s |
| lose (idle) | Lose at dawn, full 300 s night played in real time | 0 s | 302 s |

Win run, first time each investigator reached each state (seconds left):

| Investigator | Rattled | Panicked | Gone |
| --- | --- | --- | --- |
| Skeptic | 289.3 | 253.0 | 222.1 |
| Medium | 289.3 | 278.6 | 232.5 |
| Photographer | 289.3 | 262.4 | last to go, about 212 |

Both runs then restarted correctly: second night began at about 297.5 s left, sanity 100 for all three, ectoplasm 100, no leftover state.

Screenshots (`docs/day4-playtest/`): `*-1-title.png`, `lose-2-mid-night.png`, `*-4-end.png`, `*-5-restart.png`. The win run ended before the 150 s mid-night mark and no poll ever saw a "fleeing" investigator (see below), so `win-2-mid-night.png` and `win-3-flee.png` do not exist.

## Console

No page errors and no console errors. Only Chromium `GL Driver Message ... GPU stall due to ReadPixels` performance warnings from SwiftShader, which come from taking screenshots in a software GL context.

## Per-investigator behaviour

- Skeptic walks toward scares ("walk-to-scare"), takes the first damage and is the first to be rattled, then panics and walks to the door.
- Medium dropped fastest early (71 to 37 sanity in the first 10 s) and left first.
- Photographer lasted longest in the win run (sanity 3 when the other two had gone), consistent with her moving-damage multiplier.
- Panicked investigators already walk to the door ("back-away" target is the door), so "fleeing" (sanity 0) happens at or near the door and the run-to-door animation is almost never visible.

## Found and fixed

1. **White page margins** around the canvas (body background default). Fixed in `index.html` (dark background, no margin).
2. **Overlapping investigator labels** when the three walk as a group from the start point. Labels are now staggered vertically per investigator (`SIZES.actorLabelStaggerY` in `src/game/presentation.ts`).

## Deferred (Day 5, no tuning done)

Balance observations only. `src/core/balance.ts` is unchanged.

- A simple bot wins in about 88 s of a 300 s night (possessCost is 0). The existing simulation baselines in `docs/day5-balance-notes.md` are 163 s (possessCost 5) and 190.8 s (possessCost 0), so the bot plays more efficiently than the simulated policy. Nights are likely too short for a competent player.
- Ectoplasm fell from about 58 to 9 within 10 s of the first scares and then regenerated slowly (2/s). The bot spent most of the night waiting on ectoplasm in the win run after the opening burst.
- An idle player loses cleanly, but nothing is lost by waiting: investigators never find the ghost. No pressure on the player.
- Fleeing is rarely visible because panic already sends investigators to the door (design question for Day 5 or the Scare Director).

## Task status

3.3 and 3.4 are ticked: drifting (WASD and mouse), possession, Space scares, ectoplasm spend and cooldowns were all exercised and visible in sanity changes. 3.8 is ticked: the playtest ran and is recorded here. 3.2 stays unticked: room layout and object placement render, but there is no collision, which the task names.
