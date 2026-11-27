import { describe, expect, it } from "vitest";
import { bindKeys, bindRestart, type InputLike, type KeyboardLike } from "../../src/game/input";

/** Minimal fake of a Phaser emitter that counts live listeners. */
class FakeEmitter {
  listeners = new Map<string, Set<() => void>>();
  on(ev: string, fn: () => void) {
    (this.listeners.get(ev) ?? this.listeners.set(ev, new Set()).get(ev)!).add(fn);
  }
  once(ev: string, fn: () => void) {
    const wrapped = () => {
      this.off(ev, wrapped);
      fn();
    };
    (wrapped as { orig?: () => void }).orig = fn;
    this.on(ev, wrapped);
  }
  off(ev: string, fn: () => void) {
    const set = this.listeners.get(ev);
    if (!set) return;
    for (const l of [...set]) if (l === fn || (l as { orig?: () => void }).orig === fn) set.delete(l);
  }
  emit(ev: string) {
    for (const l of [...(this.listeners.get(ev) ?? [])]) l();
  }
  count() {
    return [...this.listeners.values()].reduce((n, s) => n + s.size, 0);
  }
}

class FakeKeyboard extends FakeEmitter implements KeyboardLike {
  added: Record<string, number> = {};
  removed: number[] = [];
  addKeys(keys: Record<string, number>) {
    this.added = keys;
    return Object.fromEntries(Object.keys(keys).map((k) => [k, { isDown: false }]));
  }
  removeKey(code: number) {
    this.removed.push(code);
  }
}

const CODES = { LEFT: 1, RIGHT: 2, UP: 3, DOWN: 4, A: 5, D: 6, W: 7, S: 8 };

describe("Mansion keyboard bindings", () => {
  it("fire handlers, and dispose on shutdown removes every listener and key", () => {
    const kb = new FakeKeyboard();
    const calls: string[] = [];
    const bound = bindKeys(kb, CODES, { onScare: () => calls.push("scare"), onPossess: () => calls.push("possess"), onRelease: () => calls.push("release"), onMute: () => calls.push("mute") });
    for (const ev of ["keydown-SPACE", "keydown-E", "keydown-R", "keydown-M"]) kb.emit(ev);
    expect(calls).toEqual(["scare", "possess", "release", "mute"]);
    expect(Object.keys(bound.keys!)).toHaveLength(8);

    bound.dispose();
    expect(kb.count()).toBe(0);
    expect([...kb.removed].sort()).toEqual(Object.values(CODES).sort());
    kb.emit("keydown-SPACE");
    expect(calls).toHaveLength(4);
  });

  it("restarting the scene twice does not stack listeners", () => {
    const kb = new FakeKeyboard();
    let scares = 0;
    for (let i = 0; i < 2; i++) {
      const bound = bindKeys(kb, CODES, { onScare: () => scares++, onPossess: () => {}, onRelease: () => {}, onMute: () => {} });
      bound.dispose();
    }
    const last = bindKeys(kb, CODES, { onScare: () => scares++, onPossess: () => {}, onRelease: () => {}, onMute: () => {} });
    kb.emit("keydown-SPACE");
    expect(scares).toBe(1);
    last.dispose();
  });

  it("tolerates a missing keyboard plugin", () => {
    const bound = bindKeys(null, CODES, { onScare: () => {}, onPossess: () => {}, onRelease: () => {}, onMute: () => {} });
    expect(bound.keys).toBeNull();
    expect(() => bound.dispose()).not.toThrow();
  });
});

describe("End screen restart guard", () => {
  const make = () => {
    const pointer = new FakeEmitter();
    const keyboard = new FakeEmitter();
    const input = Object.assign(pointer, { keyboard }) as unknown as InputLike & FakeEmitter;
    return { input, keyboard };
  };

  it("pressing restart twice starts the scene once", () => {
    const { input, keyboard } = make();
    let starts = 0;
    bindRestart(input, () => starts++);
    keyboard.emit("keydown-ENTER");
    keyboard.emit("keydown-ENTER");
    keyboard.emit("keydown-R");
    input.emit("pointerdown");
    expect(starts).toBe(1);
  });

  it("a click then a key starts once and leaves no listeners", () => {
    const { input, keyboard } = make();
    let starts = 0;
    const restart = bindRestart(input, () => starts++);
    input.emit("pointerdown");
    keyboard.emit("keydown-ESC");
    restart();
    expect(starts).toBe(1);
    expect(input.count()).toBe(0);
    expect(keyboard.count()).toBe(0);
  });
});
