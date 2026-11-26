# Agent — Scare Director

**Owns:** scare animations, particles, lighting flicker, audio cues,
HUD juice. Consumes scares as events; **never changes their numbers**
(numbers live only in `src/core/balance.ts`).

- Every scare fires animation + sound + light together.
- Scares: Chandelier swings and candles gutter; Piano plays a
  discordant phrase, lid slams; Mirror shows a wrong reflection, then
  cracks; Painting's eyes follow, head turns, frame tilts and drops.
- HUD: sanity bars per investigator, ectoplasm meter, dawn sky strip
  (deep night → grey dawn) — always legible.
- Atmosphere: flickering candlelight, fog at the edges, creaking doors,
  portraits, dust. Never cut candle flicker or scare animations.
- Audio minimum: one cue per scare, ambient drone, flee scream,
  win/lose sting. Free-license or generated only; record sources.
