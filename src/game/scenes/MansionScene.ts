import Phaser from "phaser";
import { ECTOPLASM, MANSION, OBJECT_POSITIONS, SCARE_OBJECTS, type InvestigatorKind, type RoomId } from "../../core/balance";
import { agentState, behaviourOf, createAgent, type Point } from "../../core/investigator";
import { distance, type ObjectId } from "../../core/mansion";
import { NightTimer, nightOutcome } from "../../core/night";
import {
  createActor,
  createGhost,
  ghostRevealed,
  glowingObjects,
  headFor,
  possess,
  possessableObject,
  release,
  scare,
  drift,
  updateWorld,
  type Actor,
  type Ghost,
} from "../../core/possession";
import { Hud } from "../../ui/hud";
import { COLORS, FONT, KIND_LABELS, OBJECT_LABELS, ROOM_LABELS, SIZES, STATE_COLORS } from "../presentation";

const KINDS: readonly InvestigatorKind[] = ["skeptic", "medium", "photographer"];
const ROOM_IDS = Object.keys(MANSION.rooms) as RoomId[];

/** Renders the Spec 3 model and forwards input. All rules live in src/core. */
export class MansionScene extends Phaser.Scene {
  private ghost!: Ghost;
  private actors!: Actor[];
  private timer!: NightTimer;
  private now = 0;
  private driftTarget: Point | null = null;
  private g!: Phaser.GameObjects.Graphics;
  private hud!: Hud;
  private actorLabels = new Map<InvestigatorKind, Phaser.GameObjects.Text>();
  private ended = false;

  constructor() {
    super("Mansion");
  }

  create(): void {
    this.ghost = createGhost(ECTOPLASM.start);
    this.actors = KINDS.map((k) => createActor(createAgent(k, 0)));
    this.timer = new NightTimer();
    this.now = 0;
    this.driftTarget = null;
    this.ended = false;
    this.actorLabels = new Map();

    this.g = this.add.graphics();
    const labelStyle = { fontFamily: FONT.family, fontSize: FONT.small, color: COLORS.roomLabel };
    for (const id of ROOM_IDS) {
      const r = MANSION.rooms[id];
      this.add.text(r.x + SIZES.roomLineWidth * 2, r.y + SIZES.roomLineWidth * 2, ROOM_LABELS[id], labelStyle);
    }
    for (const o of SCARE_OBJECTS) {
      const p = OBJECT_POSITIONS[o.id];
      this.add.text(p.x, p.y + SIZES.labelOffsetY, OBJECT_LABELS[o.id], labelStyle).setOrigin(0.5, 0);
    }
    for (const k of KINDS) {
      this.actorLabels.set(k, this.add.text(0, 0, "", { fontFamily: FONT.family, fontSize: FONT.small, color: COLORS.text }).setOrigin(0.5));
    }
    this.hud = new Hud(this, KINDS, { onScare: () => this.doScare(), onRelease: () => this.doRelease() });

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onClick({ x: p.worldX, y: p.worldY }));
    const kb = this.input.keyboard;
    kb?.on("keydown-SPACE", () => this.doScare());
    kb?.on("keydown-E", () => this.doPossess());
    kb?.on("keydown-R", () => this.doRelease());
  }

  private objectAt(p: Point): ObjectId | null {
    let best: ObjectId | null = null;
    let bestD: number = SIZES.objectHitRadius;
    for (const o of SCARE_OBJECTS) {
      const d = distance(p, OBJECT_POSITIONS[o.id]);
      if (d <= bestD) {
        best = o.id;
        bestD = d;
      }
    }
    return best;
  }

  private onClick(p: Point): void {
    if (p.y >= MANSION.height) return;
    const id = this.objectAt(p);
    if (id && this.ghost.possessed === id) return this.doScare();
    if (id) {
      this.driftTarget = null;
      this.ghost = headFor(this.ghost, id);
    } else if (!this.ghost.possessed) {
      this.driftTarget = p;
    }
  }

  private doScare(): void {
    const out = scare(this.ghost, this.actors, this.now);
    if (!out.fired) return;
    this.ghost = out.ghost;
    this.actors = [...out.actors];
    this.cameras.main.flash(SIZES.scareFlashMs);
  }

  private doPossess(): void {
    const id = possessableObject(this.ghost);
    if (id) this.ghost = possess(this.ghost, id);
  }

  private doRelease(): void {
    this.ghost = release(this.ghost);
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    const dt = Math.min(delta / 1000, SIZES.maxFrameSeconds);
    this.now += dt;
    this.timer.tick(dt);

    if (this.driftTarget && !this.ghost.possessed && !this.ghost.heading) {
      this.ghost = drift(this.ghost, this.driftTarget, dt);
      if (distance(this.ghost.pos, this.driftTarget) === 0) this.driftTarget = null;
    }
    const next = updateWorld(this.ghost, this.actors, this.now, dt);
    this.ghost = next.ghost;
    this.actors = next.actors;

    this.draw();
    this.hud.update({ agents: this.actors.map((a) => a.agent), ectoplasm: this.ghost.ectoplasm, timeLeft: this.timer.timeLeft });

    const outcome = nightOutcome(this.actors.map((a) => a.agent.core), this.timer);
    if (outcome !== "ongoing") {
      this.ended = true;
      this.scene.start("End", { outcome });
    }
  }

  private draw(): void {
    const g = this.g;
    g.clear();
    g.fillStyle(COLORS.floor).fillRect(0, 0, MANSION.width, MANSION.height);
    g.lineStyle(SIZES.roomLineWidth, COLORS.roomLine);
    for (const id of ROOM_IDS) {
      const r = MANSION.rooms[id];
      g.strokeRect(r.x, r.y, r.width, r.height);
    }
    // Front door and exit marker.
    g.fillStyle(COLORS.door).fillCircle(MANSION.door.x, MANSION.door.y, SIZES.doorRadius);
    g.lineStyle(SIZES.roomLineWidth, COLORS.exit).strokeCircle(MANSION.door.x, MANSION.door.y, SIZES.exitRadius);

    // Objects, glowing when the drifting ghost is near.
    const glowing = new Set(glowingObjects(this.ghost));
    for (const o of SCARE_OBJECTS) {
      const p = OBJECT_POSITIONS[o.id];
      if (glowing.has(o.id)) g.lineStyle(SIZES.roomLineWidth, COLORS.objectGlow).strokeCircle(p.x, p.y, SIZES.glowRadius);
      g.fillStyle(this.ghost.possessed === o.id ? COLORS.objectPossessed : COLORS.object).fillCircle(p.x, p.y, SIZES.objectRadius);
    }

    // Ghost: bright when possessing or revealed by a flash, faint wisp while drifting so the player can steer.
    const shown = this.ghost.possessed !== null || ghostRevealed(this.actors, this.now);
    g.fillStyle(COLORS.ghost, shown ? SIZES.ghostAlpha : SIZES.ghostWanderAlpha).fillCircle(
      this.ghost.pos.x,
      this.ghost.pos.y,
      SIZES.ghostRadius,
    );

    // Investigators, driven by behaviourOf.
    for (const a of this.actors) {
      const label = this.actorLabels.get(a.agent.kind)!;
      const state = agentState(a.agent);
      const b = behaviourOf(a.agent, this.now, MANSION.door);
      label.setVisible(b.action !== "gone");
      if (b.action === "gone") continue;
      g.fillStyle(STATE_COLORS[state]).fillCircle(a.pos.x, a.pos.y, SIZES.actorRadius);
      label.setPosition(a.pos.x, a.pos.y - SIZES.actorLabelOffsetY).setText(`${KIND_LABELS[a.agent.kind]}\n${b.action}`);
    }
  }
}
