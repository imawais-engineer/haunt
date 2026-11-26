import Phaser from "phaser";
import { gameAudio } from "./game/audio";
import { gameConfig } from "./game/config";

gameAudio.arm();

const game = new Phaser.Game(gameConfig);

// Read-only handle for scripts/playtest.mjs. Only exposed with ?debug in the URL.
if (new URLSearchParams(window.location.search).has("debug")) {
  (window as unknown as { __haunt: Phaser.Game }).__haunt = game;
}
