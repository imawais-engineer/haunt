// Procedural WebAudio. No audio files: everything is synthesized at runtime.
// The AudioContext is created only after the first pointer or key input.
import type { ObjectId } from "../core/mansion";
import { AUDIO } from "./presentation";
import { masterGain, pianoSchedule, shouldRunAudio } from "./effects";

type Ctor = typeof AudioContext;

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hum: { stop: () => void } | null = null;
  private humWanted = false;
  private armed = false;
  private visibilityBound = false;
  private _muted = false;

  get muted(): boolean {
    return this._muted;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    if (this.master) this.master.gain.value = masterGain(muted);
  }

  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  /** Suspend while the tab is hidden, resume when visible again. */
  private syncVisibility = (): void => {
    const ctx = this.ctx;
    if (!ctx) return;
    if (shouldRunAudio(document.visibilityState)) void ctx.resume();
    else void ctx.suspend();
  };

  /** Listen for the first user input, then create/resume the context. Safe to call repeatedly. */
  arm(): void {
    if (this.armed || typeof window === "undefined") return;
    this.armed = true;
    if (!this.visibilityBound) {
      this.visibilityBound = true;
      document.addEventListener("visibilitychange", this.syncVisibility);
    }
    const unlock = () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      this.unlock();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === "running";
  }

  private unlock(): void {
    try {
      const C: Ctor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
      if (!C) return;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = masterGain(this._muted);
      this.master.connect(this.ctx.destination);
      this.syncVisibility();
      if (this.humWanted) this.startHum();
    } catch {
      this.ctx = null; // mute-safe: audio is optional
    }
  }

  startHum(): void {
    this.humWanted = true;
    const ctx = this.ctx;
    if (!ctx || !this.master || this.hum) return;
    const gain = ctx.createGain();
    gain.gain.value = AUDIO.humGain;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = AUDIO.humLfoHz;
    lfoGain.gain.value = AUDIO.humLfoDepth;
    lfo.connect(lfoGain).connect(gain.gain);
    const oscs = [0, AUDIO.humDetune].map((d) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = AUDIO.humFreq + d;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = AUDIO.humFreq * 3;
      o.connect(lp).connect(gain);
      o.start();
      return o;
    });
    gain.connect(this.master);
    lfo.start();
    this.hum = {
      stop: () => {
        for (const o of [...oscs, lfo]) o.stop();
        gain.disconnect();
      },
    };
  }

  stopHum(): void {
    this.humWanted = false;
    this.hum?.stop();
    this.hum = null;
  }

  private tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = "sine", endFreq = freq): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + start;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(start: number, dur: number, gain: number, filterFreq: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    const t = ctx.currentTime + start;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  /** One stinger per scare object. */
  stinger(id: ObjectId): void {
    if (!this.ready) return;
    const g = AUDIO.stingerGain;
    const d = AUDIO.stingerSeconds;
    switch (id) {
      case "chandelier":
        this.tone(AUDIO.chandelierFreq, 0, d, g, "triangle", AUDIO.chandelierFreq * 0.6);
        this.noise(0, AUDIO.noiseSeconds, g * 0.5, 4000);
        break;
      case "piano": {
        const times = pianoSchedule();
        AUDIO.pianoNotes.forEach((f, i) => this.tone(f, times[i] ?? 0, AUDIO.pianoNoteSeconds * 3, g, "square"));
        this.noise((times[times.length - 1] ?? 0) + AUDIO.pianoNoteSeconds, AUDIO.pianoNoteSeconds, g, 300); // lid slam
        break;
      }
      case "mirror":
        this.tone(AUDIO.mirrorFreq, 0, d * 0.6, g * 0.6, "sine", AUDIO.mirrorFreq * 0.5);
        this.noise(AUDIO.noiseSeconds * 0.4, AUDIO.noiseSeconds * 0.5, g * 0.6, 6000);
        break;
      case "painting":
        this.tone(AUDIO.paintingFreq, 0, d, g, "sawtooth", AUDIO.paintingFreq * 0.5);
        this.noise(d * 0.5, AUDIO.noiseSeconds * 0.5, g * 0.6, 500);
        break;
    }
  }

  footstep(): void {
    if (!this.ready) return;
    this.tone(AUDIO.footstepFreq, 0, AUDIO.footstepSeconds, AUDIO.footstepGain, "sine", AUDIO.footstepFreq * 0.5);
  }

  scream(): void {
    if (!this.ready) return;
    this.tone(AUDIO.screamFrom, 0, AUDIO.screamSeconds, AUDIO.screamGain, "sawtooth", AUDIO.screamTo);
  }

  sting(outcome: "win" | "lose"): void {
    if (!this.ready) return;
    const notes = outcome === "win" ? AUDIO.winNotes : AUDIO.loseNotes;
    notes.forEach((f, i) => this.tone(f, i * AUDIO.stingNoteSeconds, AUDIO.stingNoteSeconds * 2, AUDIO.stingGain, "triangle"));
  }
}

export const gameAudio = new GameAudio();
