/**
 * Voices for the shape-sound page. Each voice plays a rendered clip and,
 * optionally, a pen clip, once or looping, through its
 * own level into a shared bus: a reverb send (the Sound page's impulse,
 * `sound/synth.ts`), then a limiter. A new clip for a playing voice starts
 * where the old one was in its lap and crossfades in, so loops never stop.
 */

import { impulse } from '../sound/synth';
import type { Clip } from './render';

const FADE = 0.03;

export interface VoicePlayback {
  /** Seconds into the clip, or null when not playing. */
  readonly t: number | null;
  /** Seconds into the pen's own clip (it may loop at another length), or null. */
  readonly penT: number | null;
  readonly loop: boolean;
}

export interface Mixer {
  now(): number;
  /** Give a voice its clips; a playing voice moves to them without a gap. */
  setClips(id: number, main: Clip, pen: Clip | null, reverb: number): void;
  /** Start a voice from the top of its clip. */
  start(id: number, loop: boolean): void;
  stop(id: number): void;
  stopAll(): void;
  remove(id: number): void;
  setLevel(id: number, level: number): void;
  setPenLevel(id: number, level: number): void;
  playback(id: number): VoicePlayback;
}

interface Take {
  readonly sources: AudioBufferSourceNode[];
  readonly gain: GainNode;
  readonly pen: GainNode | null;
}

interface Voice {
  main: AudioBuffer | null;
  pen: AudioBuffer | null;
  readonly level: GainNode;
  readonly send: GainNode;
  penLevel: number;
  take: Take | null;
  /** Context time of clip t = 0 for the take playing. */
  origin: number;
  loop: boolean;
}

function toBuffer(ctx: AudioContext, c: Clip): AudioBuffer {
  const b = ctx.createBuffer(2, c.left.length, c.sr);
  b.copyToChannel(c.left, 0);
  b.copyToChannel(c.right, 1);
  return b;
}

export function createMixer(): Mixer {
  let ctx: AudioContext | null = null;
  let bus: GainNode;
  let verbIn: GainNode;
  const voices = new Map<number, Voice>();

  const context = (): AudioContext => {
    if (ctx) return ctx;
    ctx = new AudioContext();
    bus = ctx.createGain();
    bus.gain.value = 0.8;
    verbIn = ctx.createGain();
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx);
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.15;
    verbIn.connect(verb).connect(bus);
    bus.connect(limiter).connect(ctx.destination);
    return ctx;
  };

  const voice = (id: number): Voice => {
    let v = voices.get(id);
    if (!v) {
      const c = context();
      const level = c.createGain();
      const send = c.createGain();
      level.connect(bus);
      level.connect(send).connect(verbIn);
      v = { main: null, pen: null, level, send, penLevel: 0, take: null, origin: 0, loop: false };
      voices.set(id, v);
    }
    return v;
  };

  const end = (take: Take, at: number): void => {
    take.gain.gain.cancelScheduledValues(at);
    take.gain.gain.setValueAtTime(take.gain.gain.value, at);
    take.gain.gain.linearRampToValueAtTime(0, at + FADE);
    for (const s of take.sources) {
      try {
        s.stop(at + FADE + 0.01);
      } catch {
        // already stopped
      }
    }
    take.sources[0].onended = () => take.gain.disconnect();
  };

  /** Play the voice's buffers from clip time `offset`, fading in over `fade` seconds. */
  const begin = (v: Voice, offset: number, loop: boolean, fade: number): void => {
    const c = context();
    if (c.state === 'suspended') void c.resume();
    if (!v.main) return;
    const at = c.currentTime + 0.02;
    const gain = c.createGain();
    gain.gain.setValueAtTime(fade > 0 ? 0 : 1, at);
    if (fade > 0) gain.gain.linearRampToValueAtTime(1, at + fade);
    gain.connect(v.level);
    const sources: AudioBufferSourceNode[] = [];
    const src = c.createBufferSource();
    src.buffer = v.main;
    src.loop = loop;
    src.connect(gain);
    sources.push(src);
    let pen: GainNode | null = null;
    if (v.pen) {
      const p = c.createBufferSource();
      p.buffer = v.pen;
      p.loop = loop;
      pen = c.createGain();
      pen.gain.value = v.penLevel;
      p.connect(pen).connect(gain);
      sources.push(p);
    }
    // A constant pen clip is a whole number of its own laps, not the main clip's length.
    for (const s of sources) s.start(at, offset % s.buffer!.duration);
    v.take = { sources, gain, pen };
    v.origin = at - offset;
    v.loop = loop;
  };

  const position = (v: Voice): number | null => {
    if (!v.take || !ctx || !v.main) return null;
    const t = ctx.currentTime - v.origin;
    if (t < 0) return 0;
    if (v.loop) return t % v.main.duration;
    return t <= v.main.duration ? t : null;
  };

  return {
    now: () => ctx?.currentTime ?? 0,
    setClips(id, main, pen, reverb) {
      const c = context();
      const v = voice(id);
      v.send.gain.setTargetAtTime(reverb, c.currentTime, 0.02);
      const t = position(v);
      v.main = toBuffer(c, main);
      v.pen = pen ? toBuffer(c, pen) : null;
      if (t === null) return;
      const old = v.take!;
      end(old, c.currentTime + 0.02);
      begin(v, Math.min(t, v.main.duration - 0.001), v.loop, FADE);
    },
    start(id, loop) {
      const v = voices.get(id);
      if (!v) return;
      if (v.take) end(v.take, context().currentTime);
      begin(v, 0, loop, 0.005);
    },
    stop(id) {
      const v = voices.get(id);
      if (v?.take && ctx) end(v.take, ctx.currentTime);
      if (v) v.take = null;
    },
    stopAll() {
      for (const id of voices.keys()) this.stop(id);
    },
    remove(id) {
      const v = voices.get(id);
      if (!v) return;
      this.stop(id);
      setTimeout(() => {
        v.level.disconnect();
        v.send.disconnect();
      }, 200);
      voices.delete(id);
    },
    setLevel(id, level) {
      const v = voice(id);
      v.level.gain.setTargetAtTime(level, context().currentTime, 0.02);
    },
    setPenLevel(id, level) {
      const v = voice(id);
      v.penLevel = level;
      if (v.take?.pen) v.take.pen.gain.setTargetAtTime(level, context().currentTime, 0.02);
    },
    playback(id) {
      const v = voices.get(id);
      if (!v) return { t: null, penT: null, loop: false };
      const t = position(v);
      if (t === null && v.take) v.take = null;
      const penT = t !== null && v.pen && ctx ? (ctx.currentTime - v.origin) % v.pen.duration : null;
      return { t, penT, loop: v.loop };
    },
  };
}
