// Phaser-free input wiring for the scenes, so listener cleanup and the restart guard are testable with fakes.

interface Emitter {
  on(event: string, fn: () => void): unknown;
  once(event: string, fn: () => void): unknown;
  off(event: string, fn: () => void): unknown;
}

export interface KeyboardLike extends Emitter {
  addKeys(keys: Record<string, number>): object;
  removeKey(code: number): unknown;
}

export interface InputLike extends Emitter {
  keyboard: Emitter | null;
}

const MOVE_KEYS = ["LEFT", "RIGHT", "UP", "DOWN", "A", "D", "W", "S"] as const;

export interface KeyHandlers {
  onScare(): void;
  onPossess(): void;
  onRelease(): void;
  onMute(): void;
}

/** Binds the Mansion keyboard shortcuts and movement keys. `dispose` removes exactly what was added. */
export function bindKeys(kb: KeyboardLike | null | undefined, codes: Record<string, number>, h: KeyHandlers) {
  const bindings: [string, () => void][] = [
    ["keydown-SPACE", h.onScare],
    ["keydown-E", h.onPossess],
    ["keydown-R", h.onRelease],
    ["keydown-M", h.onMute],
  ];
  for (const [ev, fn] of bindings) kb?.on(ev, fn);
  const keys = kb ? kb.addKeys(Object.fromEntries(MOVE_KEYS.map((k) => [k.toLowerCase(), codes[k]!]))) : null;
  return {
    keys,
    dispose() {
      for (const [ev, fn] of bindings) kb?.off(ev, fn);
      for (const k of MOVE_KEYS) kb?.removeKey(codes[k]!);
    },
  };
}

/** Runs `start` at most once for click, Enter, R or Esc, and removes the remaining listeners when it does. */
export function bindRestart(input: InputLike, start: () => void): () => void {
  let started = false;
  const keyEvents = ["ENTER", "R", "ESC"].map((k) => `keydown-${k}`);
  const restart = () => {
    if (started) return;
    started = true;
    input.off("pointerdown", restart);
    for (const ev of keyEvents) input.keyboard?.off(ev, restart);
    start();
  };
  input.once("pointerdown", restart);
  for (const ev of keyEvents) input.keyboard?.once(ev, restart);
  return restart;
}
