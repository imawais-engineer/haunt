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
  /** Extra lift per investigator so labels of a clustered group do not overlap. */
  actorLabelStaggerY: 30,
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
  muteButtonWidth: 90,
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
    "Click an object to possess it. Click again to scare. Drive every investigator out before dawn. WASD or arrows drift. E possesses, Space scares, R releases.",
  startHint: "Click or press Enter to begin",
  restartHint: "Click, Enter, R or Esc to haunt again",
  win: "They fled. The house is yours.",
  lose: "Dawn broke. They stayed.",
} as const;

/** Day 3 scare animation, atmosphere and investigator drawing. Seconds unless noted. */
export const FX = {
  scareSeconds: 0.9,
  shakeAmplitude: 4,
  shakeHz: 28,
  flareRadius: 70,
  flareAlpha: 0.7,
  chandelierSwingRad: 0.7,
  chandelierSwingHz: 3,
  pianoSlamAt: 0.55,
  mirrorCrackAt: 0.4,
  paintingTiltRad: 0.5,
  paintingDropAt: 0.6,
  paintingDropPx: 26,
  objectIconSize: 12,
  flickerHz: 7,
  flickerDepth: 0.35,
  fogAlpha: 0.22,
  fogBand: 70,
  fogSteps: 5,
  fogDriftHz: 0.15,
  bodyWidth: 14,
  bodyHeight: 20,
  headRadius: 6,
  bobPx: 2,
  bobHzPerSpeed: 0.06,
  leanPx: 4,
  trembleAmplitude: 1.5,
  senseRingRadius: 30,
  senseRingHz: 1.5,
  armLength: 12,
  cameraWidth: 10,
  cameraHeight: 7,
  flashBurstRadius: 44,
  strideLengthPx: 28,
  pathDotGap: 12,
  pathDotRadius: 1.5,
  facingMinDx: 0.05,
  flickerLightAlpha: 0.12,
  flickerLightScale: 1.8,
  flameRadius: 3,
  gutterMin: 0.25,
  pianoLidOpenRad: 0.7,
  flashAlpha: 0.6,
  pathAlpha: 0.5,
} as const;

export const ACTOR_LOOK = {
  skeptic: { coat: 0x3d4a5c, accent: 0xb9c4d6 },
  medium: { coat: 0x5b3a78, accent: 0xd7b8f0 },
  photographer: { coat: 0x5a4a32, accent: 0xf0e2b0 },
} as const;

/** Procedural WebAudio settings. Gains 0..1, frequencies Hz, times seconds. */
export const AUDIO = {
  master: 0.5,
  humFreq: 55,
  humGain: 0.07,
  humDetune: 1.5,
  humLfoHz: 0.2,
  humLfoDepth: 0.02,
  footstepGain: 0.12,
  footstepFreq: 140,
  footstepSeconds: 0.07,
  screamGain: 0.18,
  screamFrom: 700,
  screamTo: 1500,
  screamSeconds: 0.7,
  stingGain: 0.25,
  winNotes: [392, 523.25, 659.25],
  loseNotes: [196, 174.6, 146.8],
  stingNoteSeconds: 0.35,
  stingerGain: 0.3,
  stingerSeconds: 0.9,
  chandelierFreq: 300,
  pianoNotes: [233.1, 246.9, 349.2, 370],
  pianoNoteSeconds: 0.12,
  mirrorFreq: 2400,
  paintingFreq: 90,
  noiseSeconds: 0.5,
} as const;

export const FX_COLORS = {
  candle: 0xffb347,
  flare: 0xbff3ff,
  fog: 0x9a8fb5,
  pendulum: 0xc9a227,
  piano: 0x1c1822,
  pianoLid: 0xe8e2f0,
  mirror: 0x8fb8c9,
  crack: 0xffffff,
  frame: 0x8a5a2b,
  flash: 0xffffff,
  path: 0xf2d95c,
  sense: 0xd7b8f0,
} as const;
