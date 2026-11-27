import Phaser from "phaser";
import { gameAudio } from "./game/audio";
import { gameConfig } from "./game/config";

gameAudio.arm();

const game = new Phaser.Game(gameConfig);

// Read-only handle for scripts/playtest.mjs. Dev server only (stripped from production builds).
if (import.meta.env.DEV) {
  (window as unknown as { __haunt: Phaser.Game }).__haunt = game;
}
