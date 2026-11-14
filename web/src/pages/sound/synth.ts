/**
 * Plays `score.ts` events with Web Audio: oscillators only, through a
 * low-pass per voice, a stereo pan, and a shared bus with a generated
 * reverb and a compressor. The context starts on the first `play`, which
 * must come from a user gesture.
 */

import type { NoteEvent, SoundEvent, SweepEvent } from './score';

const mtof = (m: number): number => 440 * 2 ** ((m - 69) / 12);

/** Resting cutoff of a sweep voice, Hz. */
const SWEEP_CUTOFF = 1800;
const VIBRATO_HZ = 5.5;
const REVERB_SECONDS = 2.6;

export interface Player {
  /** Context seconds now (0 before the first play). */
  now(): number;
  /** Schedule events with `t` counted from `at` (default: a moment from now); returns the start time. */
  play(events: readonly SoundEvent[], at?: number): number;
  stop(): void;
  setMix(reverb: number, volume: number): void;
}

interface Voice {
  readonly sources: OscillatorNode[];
  readonly out: GainNode;
}

function impulse(ctx: AudioContext): AudioBuffer {
  const n = Math.floor(REVERB_SECONDS * ctx.sampleRate);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-4 * i) / n);
  }
  return buf;
}

export function createPlayer(): Player {
  let ctx: AudioContext | null = null;
  let bus: GainNode;
  let wet: GainNode;
  let dry: GainNode;
  let master: GainNode;
  let mix = { reverb: 0.3, volume: 0.7 };
  const voices = new Set<Voice>();

  const applyMix = (): void => {
    if (!ctx) return;
    const t = ctx.currentTime;
    wet.gain.setTargetAtTime(mix.reverb, t, 0.05);
    dry.gain.setTargetAtTime(1 - 0.5 * mix.reverb, t, 0.05);
    master.gain.setTargetAtTime(mix.volume, t, 0.05);
  };

  const context = (): AudioContext => {
    if (ctx) return ctx;
    ctx = new AudioContext();
    bus = ctx.createGain();
    wet = ctx.createGain();
    dry = ctx.createGain();
    master = ctx.createGain();
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    bus.connect(dry).connect(master);
    bus.connect(verb).connect(wet).connect(master);
    master.connect(comp).connect(ctx.destination);
    applyMix();
    return ctx;
  };

  const finish = (v: Voice, end: number): void => {
    v.sources.forEach((s) => s.stop(end));
    v.sources[0].onended = () => {
      v.out.disconnect();
      voices.delete(v);
    };
    voices.add(v);
  };

  const panned = (c: AudioContext, gain: GainNode, pan: number): void => {
    const p = c.createStereoPanner();
    p.pan.value = pan;
    gain.connect(p).connect(bus);
  };

  const note = (c: AudioContext, e: NoteEvent, t0: number): void => {
    const t = t0 + e.t;
    const osc = c.createOscillator();
    osc.type = e.wave;
    osc.frequency.value = mtof(e.midi);
    osc.detune.value = e.detune;
    const lp = c.createBiquadFilter();
    lp.frequency.value = Math.min(12000, 6 * mtof(e.midi));
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(e.gain, t + e.attack);
    g.gain.setTargetAtTime(0, t + e.attack, e.dur / 3);
    osc.connect(lp).connect(g);
    panned(c, g, e.pan);
    osc.start(t);
    finish({ sources: [osc], out: g }, t + e.attack + e.dur + 0.3);
  };

  const sweep = (c: AudioContext, e: SweepEvent, t0: number): void => {
    const t = t0 + e.t;
    const osc = c.createOscillator();
    osc.type = e.wave;
    const f = osc.frequency;
    f.setValueAtTime(mtof(e.pitch[0]?.midi ?? 60), t);
    const tc = Math.max(0.003, e.glide / 3);
    for (const q of e.pitch) f.setTargetAtTime(mtof(q.midi), t + q.t, tc);
    osc.detune.setValueAtTime(e.detune, t);
    for (const b of e.bends) {
      osc.detune.setTargetAtTime(e.detune + 100 * b.semis, t + b.t, 0.015);
      osc.detune.setTargetAtTime(e.detune, t + b.t + 0.1, 0.05);
    }
    const lfo = c.createOscillator();
    lfo.frequency.value = VIBRATO_HZ;
    const depth = c.createGain();
    depth.gain.value = e.vibrato;
    lfo.connect(depth).connect(osc.detune);
    const lp = c.createBiquadFilter();
    lp.frequency.setValueAtTime(SWEEP_CUTOFF, t);
    for (const q of e.filter) {
      lp.frequency.setTargetAtTime(Math.min(16000, SWEEP_CUTOFF * 2 ** q.octaves), t + q.t, 0.02);
      lp.frequency.setTargetAtTime(SWEEP_CUTOFF, t + q.t + 0.08, 0.1);
    }
    const g = c.createGain();
    const attack = Math.min(0.05, e.dur / 4);
    const release = Math.min(0.25, e.dur / 3);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(e.gain, t + attack);
    g.gain.setValueAtTime(e.gain, t + e.dur - release);
    g.gain.linearRampToValueAtTime(0, t + e.dur);
    osc.connect(lp).connect(g);
    panned(c, g, e.pan);
    osc.start(t);
    lfo.start(t);
    finish({ sources: [osc, lfo], out: g }, t + e.dur + 0.05);
  };

  return {
    now: () => ctx?.currentTime ?? 0,
    play(events, at) {
      const c = context();
      if (c.state === 'suspended') void c.resume();
      const t0 = at ?? c.currentTime + 0.05;
      for (const e of events) {
        if (e.kind === 'note') note(c, e, t0);
        else sweep(c, e, t0);
      }
      return t0;
    },
    stop() {
      if (!ctx) return;
      const t = ctx.currentTime;
      for (const v of voices) {
        // Hold the level where it is, so the fade starts from it rather than a jump.
        if (v.out.gain.cancelAndHoldAtTime) v.out.gain.cancelAndHoldAtTime(t);
        else v.out.gain.cancelScheduledValues(t);
        v.out.gain.setTargetAtTime(0, t, 0.02);
        v.sources.forEach((s) => {
          try {
            s.stop(t + 0.1);
          } catch {
            // already stopped
          }
        });
      }
    },
    setMix(reverb, volume) {
      mix = { reverb, volume };
      applyMix();
    },
  };
}
