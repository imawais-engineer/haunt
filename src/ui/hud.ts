import Phaser from "phaser";
import { ECTOPLASM, type InvestigatorKind } from "../core/balance";
import { agentState, type Agent } from "../core/investigator";
import { dawnProgress, formatClock } from "../game/dawn";
import { CANVAS, COLORS, FONT, HUD, HUD_HEIGHT, KIND_LABELS, STATE_COLORS } from "../game/presentation";
import { MANSION, SANITY } from "../core/balance";

export interface HudView {
  readonly agents: readonly Agent[];
  readonly ectoplasm: number;
  readonly timeLeft: number;
}

export interface HudHandlers {
  readonly onScare: () => void;
  readonly onRelease: () => void;
}

const TOP = MANSION.height;

/** Always-visible HUD strip under the mansion: dawn sky, sanity bars, ectoplasm, buttons. */
export class Hud {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly clock: Phaser.GameObjects.Text;
  private readonly labels = new Map<InvestigatorKind, Phaser.GameObjects.Text>();
  private readonly ectoLabel: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene, kinds: readonly InvestigatorKind[], handlers: HudHandlers) {
    this.g = scene.add.graphics();
    const style = { fontFamily: FONT.family, fontSize: FONT.small, color: COLORS.text };
    this.clock = scene.add.text(CANVAS.width - HUD.pad, TOP + HUD.rowSky, "", style).setOrigin(1, 0);
    kinds.forEach((kind, i) => {
      const x = HUD.pad + i * (HUD.barWidth + HUD.barGap);
      this.labels.set(kind, scene.add.text(x, TOP + HUD.rowLabels, KIND_LABELS[kind], style));
    });
    const ectoX = HUD.pad + kinds.length * (HUD.barWidth + HUD.barGap);
    this.ectoLabel = scene.add.text(ectoX, TOP + HUD.rowLabels, "Ectoplasm", style);
    const bx = CANVAS.width - HUD.pad - HUD.buttonWidth * 2 - HUD.buttonGap;
    const by = TOP + HUD.rowBars;
    this.button(bx, by, "Scare (Space)", handlers.onScare);
    this.button(bx + HUD.buttonWidth + HUD.buttonGap, by, "Release (R)", handlers.onRelease);
  }

  private button(x: number, y: number, label: string, onClick: () => void): void {
    const box = this.scene.add
      .rectangle(x, y, HUD.buttonWidth, HUD.buttonHeight, COLORS.button)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    this.scene.add
      .text(x + HUD.buttonWidth / 2, y + HUD.buttonHeight / 2, label, {
        fontFamily: FONT.family,
        fontSize: FONT.small,
        color: COLORS.buttonText,
      })
      .setOrigin(0.5);
    box.on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      onClick();
    });
  }

  update(view: HudView): void {
    const g = this.g;
    g.clear();
    g.fillStyle(COLORS.hudPanel).fillRect(0, TOP, CANVAS.width, HUD_HEIGHT);

    // Dawn sky strip: night blends to dawn, sun marker travels left to right.
    const p = dawnProgress(view.timeLeft);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(COLORS.skyNight),
      Phaser.Display.Color.ValueToColor(COLORS.skyDawn),
      1,
      p,
    );
    const skyW = CANVAS.width - HUD.pad * 2;
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b)).fillRect(HUD.pad, TOP + HUD.rowSky, skyW, HUD.skyHeight);
    g.fillStyle(COLORS.sun).fillCircle(HUD.pad + skyW * p, TOP + HUD.rowSky + HUD.skyHeight / 2, HUD.sunRadius);
    this.clock.setText(`Dawn ${formatClock(view.timeLeft)}`);

    view.agents.forEach((agent, i) => {
      const x = HUD.pad + i * (HUD.barWidth + HUD.barGap);
      const state = agentState(agent);
      this.bar(x, agent.core.sanity / SANITY.max, STATE_COLORS[state === "gone" ? "fleeing" : state]);
      this.labels.get(agent.kind)?.setText(`${KIND_LABELS[agent.kind]}: ${state === "gone" ? "fled" : state}`);
    });
    const ectoX = HUD.pad + view.agents.length * (HUD.barWidth + HUD.barGap);
    this.bar(ectoX, view.ectoplasm / ECTOPLASM.max, COLORS.ectoplasm);
    this.ectoLabel.setText(`Ectoplasm ${Math.floor(view.ectoplasm)}`);
  }

  private bar(x: number, fraction: number, color: number): void {
    const y = TOP + HUD.rowBars;
    this.g.fillStyle(COLORS.barBack).fillRect(x, y, HUD.barWidth, HUD.barHeight);
    this.g.fillStyle(color).fillRect(x, y, HUD.barWidth * Math.min(1, Math.max(0, fraction)), HUD.barHeight);
  }
}
