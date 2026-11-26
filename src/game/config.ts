import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { EndScene } from "./scenes/EndScene";
import { MansionScene } from "./scenes/MansionScene";
import { TitleScene } from "./scenes/TitleScene";
import { CANVAS, COLORS } from "./presentation";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: CANVAS.width,
  height: CANVAS.height,
  backgroundColor: COLORS.background,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, MansionScene, EndScene],
};
