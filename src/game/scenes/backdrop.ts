import Phaser from "phaser";
import { CANVAS, POLISH } from "../presentation";

/** Vertical gradient from `top` to `bottom` drawn as bands. */
export function drawGradient(g: Phaser.GameObjects.Graphics, top: number, bottom: number): void {
  const n = POLISH.gradientBands;
  const a = Phaser.Display.Color.ValueToColor(top);
  const b = Phaser.Display.Color.ValueToColor(bottom);
  for (let i = 0; i < n; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, n - 1, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).fillRect(0, (CANVAS.height * i) / n, CANVAS.width, CANVAS.height / n + 1);
  }
}

/** Horizontal fog bands near the bottom, drifting with time t. */
export function drawFogBands(g: Phaser.GameObjects.Graphics, t: number, color: number, alpha: number): void {
  for (let i = 0; i < POLISH.titleFogBands; i++) {
    const y = CANVAS.height - 20 - i * 34;
    const dx = Math.sin(t * 0.3 + i) * 40;
    g.fillStyle(color, alpha * (1 - i / POLISH.titleFogBands)).fillEllipse(CANVAS.width / 2 + dx, y, CANVAS.width * 1.1, 46);
  }
}
