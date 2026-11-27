import Phaser from "phaser";
import { candleFlicker, ghostBob } from "../effects";
import { CANVAS, COLORS, FAINT_FOG, FONT, FX_COLORS, POLISH, POLISH_COLORS, SCREEN, TEXT } from "../presentation";
import { drawFogBands, drawGradient } from "./backdrop";

export class TitleScene extends Phaser.Scene {
  private fx!: Phaser.GameObjects.Graphics;
  private t = 0;

  constructor() {
    super("Title");
  }

  create(): void {
    const cx = CANVAS.width / 2;
    drawGradient(this.add.graphics(), POLISH_COLORS.titleTop, POLISH_COLORS.titleBottom);
    this.fx = this.add.graphics();
    this.t = 0;
    this.add.text(cx, SCREEN.titleY, TEXT.title, { fontFamily: FONT.family, fontSize: FONT.title, color: COLORS.text, stroke: "#b8f2ff", strokeThickness: 2, shadow: { color: "#b8f2ff", blur: 18, fill: true } }).setOrigin(0.5);
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

  update(_time: number, delta: number): void {
    this.t += delta / 1000;
    const g = this.fx;
    g.clear();
    const gx = CANVAS.width - POLISH.titleGhostX;
    const gy = POLISH.titleGhostY + ghostBob(this.t) * 3;
    const k = POLISH.titleGhostScale;
    // Ghost silhouette behind the title.
    g.fillStyle(POLISH_COLORS.titleGlow, POLISH.titleGlowAlpha).fillCircle(gx, gy, 14 * k);
    g.fillStyle(COLORS.ghost, POLISH.titleGhostAlpha).fillCircle(gx, gy - 6 * k, 9 * k).fillRect(gx - 9 * k, gy - 6 * k, 18 * k, 14 * k);
    for (let i = 0; i < POLISH.ghostHemWaves; i++) g.fillCircle(gx - 9 * k + 2.25 * k + i * 4.5 * k, gy + 8 * k, 2.25 * k);
    drawFogBands(g, this.t, FX_COLORS.fog, FAINT_FOG);
    // Flickering candle.
    const f = candleFlicker(this.t);
    const bx = POLISH.candleX;
    const by = POLISH.candleBaseY;
    g.fillStyle(FX_COLORS.candle, POLISH.candleGlowAlpha * f).fillCircle(bx, by - POLISH.candleHeight, POLISH.candleGlowRadius);
    g.fillStyle(POLISH_COLORS.candleBody).fillRect(bx - POLISH.candleWidth / 2, by - POLISH.candleHeight, POLISH.candleWidth, POLISH.candleHeight);
    g.fillStyle(FX_COLORS.candle).fillCircle(bx, by - POLISH.candleHeight - POLISH.candleFlameRadius, POLISH.candleFlameRadius * f);
  }
}
