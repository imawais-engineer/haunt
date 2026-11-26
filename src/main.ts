import Phaser from "phaser";
import { gameAudio } from "./game/audio";
import { gameConfig } from "./game/config";

gameAudio.arm();

new Phaser.Game(gameConfig);
