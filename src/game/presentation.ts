// Presentation constants (Day 2 grey-box). The ONLY place besides balance.ts
// where layout, colour, font and HUD sizes may be written as numbers.
// Gameplay tuning (damage, speed, radii, timers) stays in core/balance.ts.

import { MANSION } from "../core/balance";

export const HUD_HEIGHT = 100;
export const CANVAS = { width: MANSION.width, height: MANSION.height + HUD_HEIGHT } as const;

export const COLORS = {
  background: 0x0b0a12,
  floor: 0x2a2433,
  roomLine: 0x6b5b7b,
  roomLabel: "#9d8fb0",
  object: 0x8a6d3b,
  objectPossessed: 0xc9a227,
  objectGlow: 0xb8f2ff,
  door: 0x5a3a22,
  exit: 0x7be07b,
  ghost: 0xe8f7ff,
  text: "#e8e2f0",
  hudPanel: 0x14111c,
  barBack: 0x2e2a38,
  ectoplasm: 0x5fd3e6,
  skyNight: 0x0d1033,
  skyDawn: 0xf4a259,
  sun: 0xfff1b0,
  button: 0x3a3150,
  buttonText: "#ffffff",
  win: "#7be07b",
  lose: "#e06b6b",
} as const;

/** Tint per investigator state (sanity.ts InvestigatorState). */
export const STATE_COLORS = {
  investigate: 0xdddddd,
  rattled: 0xf2d95c,
  panicked: 0xf29b4b,
  fleeing: 0xe05555,
  gone: 0x000000,
} as const;

export const KIND_LABELS = { skeptic: "Skeptic", medium: "Medium", photographer: "Photographer" } as const;
export const ROOM_LABELS = {
  entrance: "Entrance Hall",
  study: "Study",
  bedroom: "Bedroom",
  dining: "Dining room",
} as const;
export const OBJECT_LABELS = { chandelier: "Chandelier", piano: "Piano", mirror: "Mirror", painting: "Painting" } as const;

export const FONT = { family: "Georgia, serif", small: "12px", medium: "16px", large: "28px", title: "56px" } as const;

export const SIZES = {
  objectRadius: 16,
  objectHitRadius: 32,
  glowRadius: 28,
  ghostRadius: 12,
  ghostWanderAlpha: 0.25,
  ghostAlpha: 0.9,
  actorRadius: 12,
  doorRadius: 14,
  exitRadius: 22,
  roomLineWidth: 2,
  labelOffsetY: 26,
  actorLabelOffsetY: 34,
  maxFrameSeconds: 0.1,
  scareFlashMs: 120,
  fadeMs: 250,
} as const;

export const HUD = {
  pad: 12,
  skyHeight: 18,
  barWidth: 150,
  barHeight: 12,
  barGap: 20,
  sunRadius: 8,
  rowSky: 8,
  rowBars: 38,
  rowLabels: 56,
  buttonWidth: 100,
  buttonHeight: 32,
  buttonGap: 12,
} as const;

export const SCREEN = {
  titleY: 200,
  subtitleY: 300,
  hintY: 460,
  wrapWidth: 700,
} as const;

export const TEXT = {
  title: "HAUNT",
  instructions:
    "Click an object to possess it. Click again to scare. Drive every investigator out before dawn. E possesses, Space scares, R releases.",
  startHint: "Click or press Enter to begin",
  restartHint: "Click or press Enter to haunt again",
  win: "They fled. The house is yours.",
  lose: "Dawn broke. They stayed.",
} as const;
