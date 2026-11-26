# Steering — architecture

House rules Kiro follows for the whole Haunt build:

1. **Core logic stays Phaser-free.** `src/core/` never imports Phaser.
   No game rule lives in a Scene. Scenes ask `core/` what happens;
   `core/` never asks Phaser anything.
2. **Three layers, one direction of dependency:**
   `src/core/` (pure logic) ← `src/game/` (Phaser scenes, rendering
   + input only) ← `src/ui/` (HUD).
3. **Tuning numbers live only in `balance.ts`.** Never hard-code a
   scare cost, damage, radius, cooldown, threshold or timer in game
   logic or a scene.
4. **Every scare ships with animation + sound together.** A scare that
   only moves a number is a failed scare.
5. **File conventions:** `src/core/` — `sanity.ts`, `ectoplasm.ts`,
   `investigator.ts`, `night.ts`, `balance.ts`. Tests in `tests/core/`.
6. **Cut order if time runs short:** fog, then particles, then portrait
   detail. Never cut candle flicker or scare animations — they are the
   Costume Contest category.
