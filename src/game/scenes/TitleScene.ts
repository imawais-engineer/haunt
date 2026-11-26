import Phaser from "phaser";
import { CANVAS, COLORS, FONT, SCREEN, TEXT } from "../presentation";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create(): void {
    const cx = CANVAS.width / 2;
    this.add.text(cx, SCREEN.titleY, TEXT.title, { fontFamily: FONT.family, fontSize: FONT.title, color: COLORS.text }).setOrigin(0.5);
    this.add
      .text(cx, SCREEN.subtitleY, TEXT.instructions, {
        fontFamily: FONT.family,
        fontSize: FONT.medium,
        color: COLORS.text,
        align: "center",
        wordWrap: { width: SCREEN.wrapWidth },
      })
      .setOrigin(0.5);
    this.add.text(cx, SCREEN.hintY, TEXT.startHint, { fontFamily: FONT.family, fontSize: FONT.medium, color: COLORS.roomLabel }).setOrigin(0.5);
    const start = () => this.scene.start("Mansion");
    this.input.once("pointerdown", start);
    this.input.keyboard?.once("keydown-ENTER", start);
  }
}
