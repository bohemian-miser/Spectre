/**
 * Plays `score.ts` events with Web Audio: oscillators only, through a
 * low-pass per voice, a stereo pan, and a shared bus with a generated
 * reverb and a compressor. The context starts on the first `play`, which
 * must come from a user gesture.
 */

import type { HitEvent, NoteEvent, SoundEvent, SweepControl, SweepEvent } from './score';

const mtof = (m: number): number => 440 * 2 ** ((m - 69) / 12);

/** Resting cutoff of a sweep voice, Hz. */
const SWEEP_CUTOFF = 1800;
const VIBRATO_HZ = 5.5;
export const REVERB_SECONDS = 2.6;
/** A bell's second partial, as a ratio to its note, and its level. */
const BELL_PARTIAL = 2.76;
const BELL_LEVEL = 0.3;

export interface Player {
  /** Context seconds now (0 before the first play). */
  now(): number;
  /** Schedule events with `t` counted from `at` (default: a moment from now); returns the start time. */
  play(events: readonly SoundEvent[], at?: number): number;
  stop(): void;
  setMix(reverb: number, volume: number): void;
}

interface Voice {
  readonly sources: AudioScheduledSourceNode[];
  readonly out: GainNode;
}

/** A decaying noise tail for a convolver reverb, `REVERB_SECONDS` long; pass `rand` for the same tail every time. */
export function impulse(ctx: BaseAudioContext, rand: () => number = Math.random): AudioBuffer {
  const n = Math.floor(REVERB_SECONDS * ctx.sampleRate);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (rand() * 2 - 1) * Math.exp((-4 * i) / n);
  }
  return buf;
}

export function createPlayer(): Player {
  let ctx: AudioContext | null = null;
  let bus: GainNode;
  let verbIn: GainNode;
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
    verbIn = ctx.createGain();
    wet = ctx.createGain();
    dry = ctx.createGain();
    master = ctx.createGain();
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    bus.connect(dry).connect(master);
    verbIn.connect(verb).connect(wet).connect(master);
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

  /** Route a voice to the bus through a panner, and to the reverb through its own send (1 + `send`). */
  const panned = (c: AudioContext, gain: GainNode, pan: number, send = 0): { pan: StereoPannerNode; send: GainNode } => {
    const p = c.createStereoPanner();
    p.pan.value = pan;
    const s = c.createGain();
    s.gain.value = Math.max(0, 1 + send);
    gain.connect(p).connect(bus);
    p.connect(s).connect(verbIn);
    return { pan: p, send: s };
  };

  const note = (c: AudioContext, e: NoteEvent, t0: number): void => {
    const t = t0 + e.t;
    const osc = c.createOscillator();
    osc.type = e.wave;
    osc.frequency.value = mtof(e.midi);
    osc.detune.value = e.detune;
    const lp = c.createBiquadFilter();
    lp.frequency.value = e.cutoff ?? Math.min(12000, 6 * mtof(e.midi));
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(e.gain, t + e.attack);
    g.gain.setTargetAtTime(0, t + e.attack, e.dur / 3);
    osc.connect(lp).connect(g);
    const sources: AudioScheduledSourceNode[] = [osc];
    if (e.instrument === 'bell') {
      const partial = c.createOscillator();
      partial.frequency.value = BELL_PARTIAL * mtof(e.midi);
      const pg = c.createGain();
      pg.gain.value = BELL_LEVEL;
      partial.connect(pg).connect(g);
      partial.start(t);
      sources.push(partial);
    }
    panned(c, g, e.pan, e.send);
    osc.start(t);
    finish({ sources, out: g }, t + e.attack + e.dur + 0.3);
  };

  const sweep = (c: AudioContext, e: SweepEvent, t0: number): void => {
    const t = t0 + e.t;
    const osc = c.createOscillator();
    osc.type = e.wave;
    const controls = e.controls ?? [];
    const rest: SweepControl = { t: 0, pan: e.pan, octaves: 0, detune: e.detune, send: 0, glide: e.glide };
    /** The settings in force at `at` seconds into the event. */
    const at = (time: number): SweepControl => {
      let c = rest;
      for (const k of controls) if (k.t <= time) c = k;
      return c;
    };
    const f = osc.frequency;
    f.setValueAtTime(mtof(e.pitch[0]?.midi ?? 60), t);
    for (const q of e.pitch) f.setTargetAtTime(mtof(q.midi), t + q.t, Math.max(0.003, at(q.t).glide / 3));
    osc.detune.setValueAtTime(e.detune, t);
    for (const k of controls) osc.detune.setTargetAtTime(k.detune, t + k.t, 0.02);
    for (const b of e.bends) {
      const base = at(b.t).detune;
      osc.detune.setTargetAtTime(base + 100 * b.semis, t + b.t, 0.015);
      osc.detune.setTargetAtTime(base, t + b.t + 0.1, 0.05);
    }
    const lfo = c.createOscillator();
    lfo.frequency.value = VIBRATO_HZ;
    const depth = c.createGain();
    depth.gain.value = e.vibrato;
    lfo.connect(depth).connect(osc.detune);
    const lp = c.createBiquadFilter();
    const cutoff = (octaves: number): number => Math.max(40, Math.min(16000, SWEEP_CUTOFF * 2 ** octaves));
    lp.frequency.setValueAtTime(SWEEP_CUTOFF, t);
    for (const k of controls) lp.frequency.setTargetAtTime(cutoff(k.octaves), t + k.t, 0.02);
    for (const q of e.filter) {
      const base = at(q.t).octaves;
      lp.frequency.setTargetAtTime(cutoff(base + q.octaves), t + q.t, 0.02);
      lp.frequency.setTargetAtTime(cutoff(base), t + q.t + 0.08, 0.1);
    }
    const g = c.createGain();
    const attack = Math.min(0.05, e.dur / 4);
    const release = Math.min(0.25, e.dur / 3);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(e.gain, t + attack);
    g.gain.setValueAtTime(e.gain, t + e.dur - release);
    g.gain.linearRampToValueAtTime(0, t + e.dur);
    osc.connect(lp).connect(g);
    const route = panned(c, g, e.pan);
    for (const k of controls) {
      route.pan.pan.setTargetAtTime(k.pan, t + k.t, 0.02);
      route.send.gain.setTargetAtTime(Math.max(0, 1 + k.send), t + k.t, 0.02);
    }
    osc.start(t);
    lfo.start(t);
    finish({ sources: [osc, lfo], out: g }, t + e.dur + 0.05);
  };

  let noiseBuf: AudioBuffer | null = null;
  /** A drum: a tone that rings (dropping in pitch for a tom) and a noise burst, filtered by `cutoff`. */
  const hit = (c: AudioContext, e: HitEvent, t0: number): void => {
    const t = t0 + e.t;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, Math.floor(0.5 * c.sampleRate), c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const g = c.createGain();
    g.gain.value = e.gain;
    const lp = c.createBiquadFilter();
    lp.frequency.value = e.cutoff;
    lp.connect(g);
    const ring = Math.max(0.02, e.ring);
    const noiseLen = e.drum === 'hat' ? 0.04 : e.drum === 'snare' ? 0.12 : 0.03;
    const noiseLevel = e.drum === 'hat' ? 0.7 : e.drum === 'snare' ? 0.5 : 0.15;
    const sources: AudioScheduledSourceNode[] = [];
    if (e.drum !== 'hat') {
      const osc = c.createOscillator();
      osc.frequency.setValueAtTime(e.drum === 'tom' ? 1.6 * e.tone : e.tone, t);
      osc.frequency.setTargetAtTime(e.tone, t, 0.03);
      const og = c.createGain();
      og.gain.setValueAtTime(0.8, t);
      og.gain.setTargetAtTime(0, t, ring / 3);
      osc.connect(og).connect(lp);
      osc.start(t);
      sources.push(osc);
    }
    const noise = c.createBufferSource();
    noise.buffer = noiseBuf;
    const band = c.createBiquadFilter();
    band.type = e.drum === 'hat' ? 'highpass' : 'bandpass';
    band.frequency.value = e.drum === 'hat' ? 7000 : 2200;
    const ng = c.createGain();
    ng.gain.setValueAtTime(noiseLevel, t);
    ng.gain.setTargetAtTime(0, t, noiseLen / 3);
    noise.connect(band).connect(ng).connect(lp);
    noise.start(t);
    sources.push(noise);
    panned(c, g, e.pan);
    finish({ sources, out: g }, t + Math.max(ring, noiseLen) + 0.2);
  };

  return {
    now: () => ctx?.currentTime ?? 0,
    play(events, at) {
      const c = context();
      if (c.state === 'suspended') void c.resume();
      const t0 = at ?? c.currentTime + 0.05;
      for (const e of events) {
        if (e.kind === 'note') note(c, e, t0);
        else if (e.kind === 'hit') hit(c, e, t0);
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
