# Day 7: deploy to GitHub Pages

Live URL (after the steps below): <https://imawais-engineer.github.io/haunt/>

Balance numbers are unchanged (`src/core/balance.ts` is untouched).

## What changed

- `vite.config.ts`: `base` is `/haunt/` for `vite build` and `vite preview`, and `/` for the dev server and tests. `BASE_PATH` overrides it. The built `dist/index.html` references `/haunt/assets/...`.
- `.github/workflows/deploy.yml`: on push to `main` and manual dispatch, runs `npm ci`, `npm test`, `npm run build`, uploads `dist` and deploys with `actions/deploy-pages`. Permissions are `contents: read`, `pages: write`, `id-token: write`. No repository secrets are used.
- `scripts/playtest-prod.mjs` (`npm run playtest:prod -- win|lose [url]`): black-box playtest for production builds. Output goes to `docs/day7-playtest/`.
- README: live URL and deploy note.

## Pages is not enabled yet

`gh api repos/imawais-engineer/haunt/pages` returned 404 (Pages not enabled) and `gh api repos/imawais-engineer/haunt/pages -X POST -f build_type=workflow` returned 403. The sandbox token cannot change repository settings, so this is a manual step.

## Post-merge steps

1. In the repo: Settings > Pages > Build and deployment > Source: **GitHub Actions**.
2. Merge the PR into `main`. The `Deploy to GitHub Pages` workflow runs on the push. If you enabled Pages after merging, run it from Actions > Deploy to GitHub Pages > Run workflow.
3. Confirm the workflow is green, then open <https://imawais-engineer.github.io/haunt/>.
4. Run the black-box playtest against the live site:
   `npm run playtest:prod -- lose https://imawais-engineer.github.io/haunt/` and the same with `win`. Each takes about 5.5 minutes.

The live URL could not be verified from this branch because it only exists after the merge and the first workflow run.

## Playtest of the production build (local preview, `/haunt/` base)

Run against `npm run build && npm run preview` (http://localhost:4173/haunt/) with `node scripts/playtest-prod.mjs lose` and `win`, both at the same time.

| Mode | Page/console errors | Failed requests / 4xx | Title | Night started | End screen seen | Outcome (from screenshot) | Restart |
|------|------|------|------|------|------|------|------|
| lose (idle) | 0 | 0 | yes | yes | at 298 s wall | "Dawn broke. They stayed." (loss at dawn) | yes, new night HUD back |
| win (blind script) | 0 | 0 | yes | yes | at 297 s wall | "Dawn broke. They stayed." (loss at dawn) | yes, new night HUD back |

The blind win strategy rattled the Skeptic and the Medium (yellow sanity bars mid-night in `win-2-mid-night.png`) but nobody fled. That matches the dev-server playtests: winning needs targeted play, which this script cannot do without game state. Whether a human can win is what the human playtest below decides. Only SwiftShader "GPU stall due to ReadPixels" warnings appeared; the script records them as warnings, not errors.

Two harness issues came up and were fixed during the run:

- `vite preview` used base `/` while the build used `/haunt/`, so the JS bundle returned 404. `vite.config.ts` now also uses `/haunt/` for preview.
- An early version kept clicking after dawn and restarted the game from the End screen. Another version mistook scare effects for the End screen. The script now watches the HUD button strip, which exists only during a night, and stops input when it disappears.

The script has no access to game state in production builds (`window.__haunt` exists only in dev). It checks that the page loads without console errors, page errors, failed requests or 4xx responses, that the title renders, that clicking changes the screen, that a full 300 s night passes and an end screen appears (screenshot differs from the night start), and that the restart input changes the screen again. It cannot confirm who won. The win mode uses a blind cycle of object clicks, Space and R, so it is not expected to win reliably. Screenshots and logs are in `docs/day7-playtest/`.

## Human playtest checklist (locks the balance)

Play one full night on the live URL, with sound on, in a normal desktop browser.

- [ ] Page loads at the live URL with no blank screen. Title shows and a click starts the night.
- [ ] Audio starts after the first click or key press. M mutes.
- [ ] Click an object to possess it, click again to scare. Hop cost is visible next to the ectoplasm bar. "Not enough ectoplasm" appears when you cannot afford a move.
- [ ] Investigators change state (rattled, panicked, fleeing) and show barks.
- [ ] Night lasts about 5 minutes and ends at dawn with the End screen.
- [ ] Restart works (Enter or click, depending on the outcome).
- [ ] Balance feel: was the night winnable but not trivial? Note whether you won, how many investigators fled, and the sanity of the survivors at dawn.
- [ ] Anything that felt unfair, boring or confusing. A small balance tweak, if justified, must land before Day 8 (demo recording).
