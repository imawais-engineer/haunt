import Phaser from "phaser";
import type { NightOutcome } from "../../core/night";
import { CANVAS, COLORS, FONT, SCREEN, TEXT } from "../presentation";

export class EndScene extends Phaser.Scene {
  private outcome: NightOutcome = "lose";

  constructor() {
    super("End");
  }

  init(data: { outcome?: NightOutcome }): void {
    this.outcome = data.outcome ?? "lose";
  }

  create(): void {
    const won = this.outcome === "win";
    const cx = CANVAS.width / 2;
    this.add
      .text(cx, SCREEN.titleY, won ? TEXT.win : TEXT.lose, {
        fontFamily: FONT.family,
        fontSize: FONT.large,
        color: won ? COLORS.win : COLORS.lose,
      })
      .setOrigin(0.5);
    this.add.text(cx, SCREEN.hintY, TEXT.restartHint, { fontFamily: FONT.family, fontSize: FONT.medium, color: COLORS.roomLabel }).setOrigin(0.5);
    let started = false;
    const restart = () => {
      if (started) return;
      started = true;
      this.scene.start("Mansion");
    };
    this.input.once("pointerdown", restart);
    for (const key of ["ENTER", "R", "ESC"]) this.input.keyboard?.once(`keydown-${key}`, restart);
  }
}
