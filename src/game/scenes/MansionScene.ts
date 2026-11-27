import Phaser from "phaser";
import { ECTOPLASM, GHOST, MANSION, PHOTOGRAPHER, OBJECT_POSITIONS, SCARE_OBJECTS, type InvestigatorKind, type RoomId } from "../../core/balance";
import { isReady } from "../../core/ectoplasm";
import { agentState, behaviourOf, createAgent, flashRevealsGhost, type Behaviour, type Point } from "../../core/investigator";
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
import { gameAudio } from "../audio";
import { bindKeys } from "../input";
import { advanceStride, barkFor, candleFlicker, ghostBob, headingGaveUp, insufficientMessage, noticeFade, scareBlockedMessage, effectProgress, clampPoint, facingFor, flareEnvelope, keyDirection, shakeOffset, trailFade, updateTrail, walkBob, type TrailMark } from "../effects";
import { ACTOR_LOOK, COLORS, FONT, FX, FX_COLORS, KIND_LABELS, OBJECT_LABELS, POLISH, POLISH_COLORS, ROOM_LABELS, SIZES, STATE_COLORS, TEXT } from "../presentation";

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
  private keys: Record<"left" | "right" | "up" | "down" | "a" | "d" | "w" | "s", Phaser.Input.Keyboard.Key> | null = null;
  private scareFx = new Map<ObjectId, number>();
  private stride = new Map<InvestigatorKind, number>();
  private facing = new Map<InvestigatorKind, 1 | -1>();
  private lastX = new Map<InvestigatorKind, number>();
  private wasFleeing = new Set<InvestigatorKind>();
  private trails = new Map<InvestigatorKind, TrailMark[]>();
  private notice: { text: string; born: number } | null = null;
  private noticeText!: Phaser.GameObjects.Text;
  private lastState = new Map<InvestigatorKind, string>();
  private barks = new Map<InvestigatorKind, { text: string; born: number }>();
  private barkTexts = new Map<InvestigatorKind, Phaser.GameObjects.Text>();

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
    this.scareFx = new Map();
    this.stride = new Map();
    this.facing = new Map();
    this.lastX = new Map();
    this.wasFleeing = new Set();
    this.trails = new Map();
    this.notice = null;
    this.lastState = new Map();
    this.barks = new Map();
    this.barkTexts = new Map();
    gameAudio.startHum();
    this.events.once("shutdown", () => gameAudio.stopHum());

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
    for (const k of KINDS) {
      this.barkTexts.set(k, this.add.text(0, 0, "", { fontFamily: FONT.family, fontSize: POLISH.barkFontPx, color: POLISH_COLORS.bark, backgroundColor: "#14111ccc", padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(5).setVisible(false));
    }
    this.noticeText = this.add.text(0, 0, "", { fontFamily: FONT.family, fontSize: FONT.medium, color: POLISH_COLORS.notice, stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5).setDepth(6).setVisible(false);
    this.hud = new Hud(this, KINDS, { onScare: () => this.doScare(), onRelease: () => this.doRelease(), onMute: () => gameAudio.toggleMute() });

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onClick({ x: p.worldX, y: p.worldY }));
    const bound = bindKeys(this.input.keyboard, Phaser.Input.Keyboard.KeyCodes, {
      onScare: () => this.doScare(),
      onPossess: () => this.doPossess(),
      onRelease: () => this.doRelease(),
      onMute: () => gameAudio.toggleMute(),
    });
    this.keys = bound.keys as typeof this.keys;
    this.events.once("shutdown", () => {
      bound.dispose();
      this.keys = null;
    });
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
      // Clicking a different object while possessing: release, then fly to the new one.
      if (this.ghost.possessed) this.ghost = release(this.ghost);
      this.ghost = headFor(this.ghost, id);
    } else if (!this.ghost.possessed) {
      this.driftTarget = p;
    }
  }

  private showNotice(text: string): void {
    this.notice = { text, born: this.now };
    gameAudio.buzz();
  }

  private doScare(): void {
    const g = this.ghost;
    if (g.possessed) {
      const obj = SCARE_OBJECTS.find((o) => o.id === g.possessed)!;
      const msg = scareBlockedMessage(g.ectoplasm, obj.cost, isReady(g.cooldowns, obj, this.now));
      if (msg) return this.showNotice(msg);
    }
    const out = scare(this.ghost, this.actors, this.now);
    if (!out.fired) return;
    this.ghost = out.ghost;
    this.actors = [...out.actors];
    // Light (camera flash), animation (shake/rattle + ghost flare) and sound fire together.
    const id = this.ghost.possessed!;
    this.cameras.main.flash(SIZES.scareFlashMs);
    this.scareFx.set(id, this.now);
    this.cameras.main.shake(POLISH.cameraShakeMs, POLISH.cameraShakeIntensity);
    gameAudio.stinger(id);
  }

  private doPossess(): void {
    const id = possessableObject(this.ghost);
    if (id) {
      const msg = insufficientMessage(this.ghost.ectoplasm, GHOST.possessCost);
      if (msg) return this.showNotice(msg);
      this.ghost = possess(this.ghost, id);
    }
  }

  private doRelease(): void {
    this.ghost = release(this.ghost);
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    const dt = Math.min(delta / 1000, SIZES.maxFrameSeconds);
    this.now += dt;
    this.timer.tick(dt);

    const k = this.keys;
    const dir = k ? keyDirection(k.left.isDown || k.a.isDown, k.right.isDown || k.d.isDown, k.up.isDown || k.w.isDown, k.down.isDown || k.s.isDown) : { x: 0, y: 0 };
    if (!this.ghost.possessed && (dir.x !== 0 || dir.y !== 0)) {
      const reach = MANSION.width;
      this.driftTarget = null;
      this.ghost = drift(this.ghost, { x: this.ghost.pos.x + dir.x * reach, y: this.ghost.pos.y + dir.y * reach }, dt);
      this.ghost = { ...this.ghost, pos: clampPoint(this.ghost.pos, MANSION.width, MANSION.height) };
    } else if (this.driftTarget && !this.ghost.possessed && !this.ghost.heading) {
      this.ghost = drift(this.ghost, this.driftTarget, dt);
      if (distance(this.ghost.pos, this.driftTarget) === 0) this.driftTarget = null;
    }
    const prevHeading = this.ghost.heading;
    const next = updateWorld(this.ghost, this.actors, this.now, dt);
    this.ghost = next.ghost;
    this.actors = next.actors;
    if (headingGaveUp(prevHeading, this.ghost.heading, this.ghost.possessed, this.ghost.ectoplasm, GHOST.possessCost) && !this.driftTarget) {
      this.showNotice(TEXT.insufficient);
    }

    this.updateAudio(dt);
    this.updateOverlays();
    this.draw();
    this.hud.update({ agents: this.actors.map((a) => a.agent), ectoFlash: this.notice ? noticeFade(this.now, this.notice.born, POLISH.ectoFlashSeconds) : 0, ectoplasm: this.ghost.ectoplasm, timeLeft: this.timer.timeLeft, muted: gameAudio.muted });

    const outcome = nightOutcome(this.actors.map((a) => a.agent.core), this.timer);
    if (outcome !== "ongoing") {
      this.ended = true;
      gameAudio.stopHum();
      gameAudio.sting(outcome);
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

    // Objects: warm flickering light, glow when the ghost is near, shake/rattle while a scare plays.
    const glowing = new Set(glowingObjects(this.ghost));
    const flicker = candleFlicker(this.now);
    let flare = 0;
    for (const o of SCARE_OBJECTS) {
      const p = OBJECT_POSITIONS[o.id];
      const start = this.scareFx.get(o.id);
      const prog = start === undefined ? null : effectProgress(this.now, start);
      const off = prog === null ? { x: 0, y: 0 } : shakeOffset(prog);
      if (prog !== null) flare = Math.max(flare, flareEnvelope(prog));
      g.fillStyle(FX_COLORS.candle, FX.flickerLightAlpha * flicker).fillCircle(p.x, p.y, SIZES.glowRadius * FX.flickerLightScale);
      if (glowing.has(o.id)) g.lineStyle(SIZES.roomLineWidth, COLORS.objectGlow).strokeCircle(p.x, p.y, SIZES.glowRadius);
      g.fillStyle(this.ghost.possessed === o.id ? COLORS.objectPossessed : COLORS.object).fillCircle(p.x + off.x, p.y + off.y, SIZES.objectRadius);
      this.drawObjectIcon(o.id, p.x + off.x, p.y + off.y, prog, flicker);
    }

    // Ghost: bright when possessing, revealed by a flash or flaring; faint wisp while drifting so the player can steer.
    const shown = this.ghost.possessed !== null || ghostRevealed(this.actors, this.now) || flare > 0;
    const gp = this.ghost.pos;
    if (flare > 0) {
      g.lineStyle(SIZES.roomLineWidth * 2, FX_COLORS.flare, FX.flareAlpha * flare).strokeCircle(gp.x, gp.y, SIZES.ghostRadius + FX.flareRadius * (1 - flare));
      g.fillStyle(FX_COLORS.flare, FX.flareAlpha * flare * 0.5).fillCircle(gp.x, gp.y, SIZES.ghostRadius + FX.flareRadius * flare);
    }
    this.drawGhost(gp.x, gp.y + ghostBob(this.now), shown ? SIZES.ghostAlpha : SIZES.ghostWanderAlpha, this.ghost.possessed !== null);

    // Investigators, driven by behaviourOf.
    for (const a of this.actors) {
      const label = this.actorLabels.get(a.agent.kind)!;
      const b = behaviourOf(a.agent, this.now, MANSION.door);
      const trail = updateTrail(this.trails.get(a.agent.kind) ?? [], a.pos, this.now, b.action === "run-to-door");
      this.trails.set(a.agent.kind, trail);
      for (const m of trail) g.fillStyle(FX_COLORS.trail, FX.trailAlpha * trailFade(m, this.now)).fillCircle(m.x, m.y, FX.trailRadius);
      label.setVisible(b.action !== "gone");
      if (b.action === "gone") continue;
      this.drawActor(a, b);
      label.setPosition(a.pos.x, a.pos.y - SIZES.actorLabelOffsetY - KINDS.indexOf(a.agent.kind) * SIZES.actorLabelStaggerY).setText(`${KIND_LABELS[a.agent.kind]}\n${b.action}`);
    }

    this.drawFog();
    this.drawVignette();
  }

  /** Sheet ghost: rounded head, straight sides, wavy hem, two eyes. Glows while possessing. */
  private drawGhost(x: number, y: number, alpha: number, possessing: boolean): void {
    const g = this.g;
    const w = POLISH.ghostBodyWidth;
    const h = POLISH.ghostBodyHeight;
    if (possessing) g.fillStyle(POLISH_COLORS.possessGlow, POLISH.possessGlowAlpha).fillCircle(x, y, POLISH.possessGlowRadius);
    const top = y - h / 2;
    g.fillStyle(COLORS.ghost, alpha).fillCircle(x, top + w / 2, w / 2).fillRect(x - w / 2, top + w / 2, w, h - w / 2 - w / (POLISH.ghostHemWaves * 2));
    const n = POLISH.ghostHemWaves;
    const r = w / (n * 2);
    for (let i = 0; i < n; i++) g.fillCircle(x - w / 2 + r + i * r * 2, y + h / 2 - r, r);
    g.fillStyle(POLISH_COLORS.ghostEye, alpha).fillCircle(x - POLISH.ghostEyeGap / 2 - 1, top + w / 2, POLISH.ghostEyeRadius).fillCircle(x + POLISH.ghostEyeGap / 2 + 1, top + w / 2, POLISH.ghostEyeRadius);
  }

  /** Dark edges, drawn after fog. */
  private drawVignette(): void {
    const g = this.g;
    g.fillStyle(POLISH_COLORS.vignette, POLISH.vignetteAlpha / POLISH.vignetteSteps);
    for (let i = 1; i <= POLISH.vignetteSteps; i++) {
      const w = (POLISH.vignetteBand * i) / POLISH.vignetteSteps;
      g.fillRect(0, 0, w, MANSION.height);
      g.fillRect(MANSION.width - w, 0, w, MANSION.height);
      g.fillRect(w, 0, MANSION.width - 2 * w, w);
      g.fillRect(w, MANSION.height - w, MANSION.width - 2 * w, w);
    }
  }

  /** Failure notice above the ghost and investigator barks on state changes. */
  private updateOverlays(): void {
    const n = this.notice;
    const f = n ? noticeFade(this.now, n.born) : 0;
    this.noticeText.setVisible(f > 0);
    if (n && f > 0) {
      const gp = this.ghost.pos;
      this.noticeText.setText(n.text).setAlpha(f).setPosition(gp.x, gp.y - POLISH.noticeLiftPx - (1 - f) * POLISH.noticeRisepx);
    }
    for (const a of this.actors) {
      const kind = a.agent.kind;
      const st = agentState(a.agent);
      const prev = this.lastState.get(kind);
      this.lastState.set(kind, st);
      if (prev !== undefined) {
        const line = barkFor(kind, prev as typeof st, st);
        if (line) this.barks.set(kind, { text: line, born: this.now });
      }
      const bark = this.barks.get(kind);
      const bf = bark ? noticeFade(this.now, bark.born, POLISH.barkSeconds) : 0;
      const t = this.barkTexts.get(kind)!;
      t.setVisible(bf > 0 && st !== "gone");
      if (bark && bf > 0) t.setText(bark.text).setAlpha(Math.min(1, bf * 2)).setPosition(a.pos.x, a.pos.y - FX.bodyHeight - POLISH.barkLiftPx);
    }
  }

  private drawObjectIcon(id: ObjectId, x: number, y: number, prog: number | null, flicker: number): void {
    const g = this.g;
    const s = FX.objectIconSize;
    switch (id) {
      case "chandelier": {
        const swing = prog === null ? 0 : Math.sin(prog * FX.scareSeconds * FX.chandelierSwingHz * Math.PI * 2) * FX.chandelierSwingRad * (1 - prog);
        const ex = x + Math.sin(swing) * s;
        const ey = y - s + Math.cos(swing) * s;
        g.lineStyle(SIZES.roomLineWidth, FX_COLORS.pendulum).lineBetween(x, y - s, ex, ey);
        // Candles gutter during the scare, then relight.
        const flame = FX.flameRadius * (prog === null ? flicker : FX.gutterMin + (1 - FX.gutterMin) * prog);
        g.fillStyle(FX_COLORS.candle).fillCircle(ex, ey, flame);
        break;
      }
      case "piano": {
        const slam = prog !== null && prog >= FX.pianoSlamAt;
        const angle = slam ? 0 : -FX.pianoLidOpenRad * (prog === null ? 1 : 1 - prog / FX.pianoSlamAt);
        g.fillStyle(FX_COLORS.piano).fillRect(x - s, y - s / 2, s * 2, s);
        g.lineStyle(SIZES.roomLineWidth, FX_COLORS.pianoLid).lineBetween(x - s, y - s / 2, x - s + Math.cos(angle) * s * 2, y - s / 2 + Math.sin(angle) * s * 2);
        break;
      }
      case "mirror": {
        g.fillStyle(FX_COLORS.mirror).fillRect(x - s / 2, y - s, s, s * 2);
        if (prog !== null && prog >= FX.mirrorCrackAt) {
          g.lineStyle(1, FX_COLORS.crack).lineBetween(x - s / 2, y - s / 2, x + s / 2, y).lineBetween(x + s / 2, y, x - s / 4, y + s);
        }
        break;
      }
      case "painting": {
        const tilt = prog === null ? 0 : Math.min(1, prog / FX.paintingDropAt) * FX.paintingTiltRad;
        const drop = prog !== null && prog >= FX.paintingDropAt ? ((prog - FX.paintingDropAt) / (1 - FX.paintingDropAt)) * FX.paintingDropPx : 0;
        const c = Math.cos(tilt);
        const sn = Math.sin(tilt);
        const corners: [number, number][] = [
          [-s, -s * 0.75],
          [s, -s * 0.75],
          [s, s * 0.75],
          [-s, s * 0.75],
        ];
        const pts = corners.map(([px, py]) => new Phaser.Math.Vector2(x + px * c - py * sn, y + drop + px * sn + py * c));
        g.lineStyle(SIZES.roomLineWidth, FX_COLORS.frame).strokePoints(pts, true);
        break;
      }
    }
  }

  private drawActor(a: Actor, b: Behaviour): void {
    const g = this.g;
    const kind = a.agent.kind;
    const look = ACTOR_LOOK[kind];
    const dir = facingFor(a.pos.x - (this.lastX.get(kind) ?? a.pos.x), this.facing.get(kind) ?? 1);
    this.facing.set(kind, dir);
    this.lastX.set(kind, a.pos.x);

    let x = a.pos.x;
    let y = a.pos.y + walkBob(this.now, b.speed);
    if (b.action === "back-away") x -= dir * FX.leanPx;
    if (b.action === "run-to-door") x += dir * FX.leanPx;
    if (b.action === "freeze") x += Math.sin(this.now * FX.shakeHz) * FX.trembleAmplitude;

    if (b.action === "walk-to-scare" && b.target) this.drawPath(a.pos, b.target);

    const w = FX.bodyWidth;
    const h = FX.bodyHeight;
    g.fillStyle(look.coat).fillRect(x - w / 2, y - h / 2, w, h);
    g.fillStyle(look.accent).fillRect(x - w / 2, y - h / 8, w, h / 6);
    g.fillStyle(STATE_COLORS[agentState(a.agent)]).fillCircle(x, y - h / 2 - FX.headRadius / 2, FX.headRadius);

    if (b.action === "pause" && kind === "medium") {
      const pulse = 0.5 + 0.5 * Math.sin(this.now * FX.senseRingHz * Math.PI * 2);
      g.lineStyle(SIZES.roomLineWidth, FX_COLORS.sense, 0.4 + 0.5 * pulse).strokeCircle(a.pos.x, a.pos.y, FX.senseRingRadius * (0.7 + 0.3 * pulse));
      g.lineStyle(SIZES.roomLineWidth, look.accent)
        .lineBetween(x - w / 2, y - h / 4, x - w / 2 - 3, y - h / 2 - FX.armLength)
        .lineBetween(x + w / 2, y - h / 4, x + w / 2 + 3, y - h / 2 - FX.armLength);
    }
    if (kind === "photographer") {
      const raised = b.action === "pause";
      const cy = raised ? y - h / 2 : y;
      g.fillStyle(look.accent).fillRect(x + dir * (w / 2) - (dir < 0 ? FX.cameraWidth : 0), cy - FX.cameraHeight / 2, FX.cameraWidth, FX.cameraHeight);
      if (flashRevealsGhost(a.agent, this.now)) {
        const k = Math.max(0, (a.agent.flashUntil - this.now) / PHOTOGRAPHER.flashSeconds);
        g.fillStyle(FX_COLORS.flash, Math.min(1, k) * FX.flashAlpha).fillCircle(x + dir * w, cy, FX.flashBurstRadius * Math.min(1, k));
      }
    }
  }

  private drawPath(from: Point, to: Point): void {
    const d = distance(from, to);
    const n = Math.floor(d / FX.pathDotGap);
    for (let i = 1; i <= n; i++) {
      const t = (i * FX.pathDotGap) / d;
      this.g.fillStyle(FX_COLORS.path, FX.pathAlpha).fillCircle(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, FX.pathDotRadius);
    }
  }

  /** Fog at the edges of the mansion, drifting slowly. */
  private drawFog(): void {
    const g = this.g;
    const drift = 0.75 + 0.25 * Math.sin(this.now * FX.fogDriftHz * Math.PI * 2);
    g.fillStyle(FX_COLORS.fog, (FX.fogAlpha / FX.fogSteps) * drift);
    for (let i = 1; i <= FX.fogSteps; i++) {
      const w = (FX.fogBand * i) / FX.fogSteps;
      g.fillRect(0, 0, w, MANSION.height);
      g.fillRect(MANSION.width - w, 0, w, MANSION.height);
      g.fillRect(w, 0, MANSION.width - 2 * w, w);
      g.fillRect(w, MANSION.height - w, MANSION.width - 2 * w, w);
    }
  }

  /** Footsteps for walking investigators and a scream when one starts fleeing. */
  private updateAudio(dt: number): void {
    for (const a of this.actors) {
      const kind = a.agent.kind;
      const b = behaviourOf(a.agent, this.now, MANSION.door);
      if (b.action === "gone") continue;
      const r = advanceStride(this.stride.get(kind) ?? 0, b.speed, dt);
      this.stride.set(kind, r.acc);
      if (r.steps > 0) gameAudio.footstep();
      if (agentState(a.agent) === "fleeing" && !this.wasFleeing.has(kind)) {
        this.wasFleeing.add(kind);
        gameAudio.scream();
      }
    }
  }
}
