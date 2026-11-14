import { describe, expect, it } from 'vitest';
import type { Pt } from '../../../core';
import { loadWorld, reelDefaults } from '../../reel/director';
import { CONSTANT_SECONDS, DEFAULT_SETTINGS, MAPPINGS, MAX_DRONE, PEN_START, foldHz, penMotion, penPlan, penSpeedAt, penSpeedNow, penSteps, renderPenMotion, SPECTRUM_LAP, VOICE_RMS, clipSeconds, cornerChord, cornerSides, radiusDrone, renderConstant, renderCorners, renderPen, renderPenConstant, renderRadius, renderSpectrum } from '../render';
import { applyBrush, paint, type Brush, type Voice } from '../paint';
import { FLOOR_DB, fitCorners, isComb, makeShape, rdp, shapeTerms, termLevel, termRef } from '../shape';

/** z(s) = e^{2 pi i s} + w e^{2 pi i k s}, sampled at n points. */
function wobble(n: number, k: number, w: number): Pt[] {
  return Array.from({ length: n }, (_, j) => {
    const s = j / n;
    return { x: Math.cos(2 * Math.PI * s) + w * Math.cos(2 * Math.PI * k * s), y: Math.sin(2 * Math.PI * s) + w * Math.sin(2 * Math.PI * k * s) };
  });
}

/** Amplitude of the sine at `hz` in x[i0..i1) by projection. */
function amplitude(x: Float32Array, sr: number, hz: number, i0: number, i1: number): number {
  let c = 0;
  let s = 0;
  for (let i = i0; i < i1; i++) {
    c += x[i] * Math.cos((2 * Math.PI * hz * i) / sr);
    s += x[i] * Math.sin((2 * Math.PI * hz * i) / sr);
  }
  return (2 * Math.hypot(c, s)) / (i1 - i0);
}

const rms = (a: Float32Array, b: Float32Array): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i] + b[i] * b[i];
  return Math.sqrt(s / (2 * a.length));
};

describe('Fourier terms as partials', () => {
  it('finds the terms of a known loop', () => {
    const ts = shapeTerms(makeShape(wobble(240, -2, 0.1)), 8);
    const ref = termRef(ts);
    const m2 = ts.find((t) => t.k === -2)!;
    expect(m2.amp / ref).toBeCloseTo(0.1, 6);
    for (const t of ts) if (t.k !== 1 && t.k !== -2) expect(t.amp / ref).toBeLessThan(1e-9);
  });

  it('maps dB below term 1 to levels', () => {
    expect(termLevel(1, 1)).toBeCloseTo(1);
    expect(termLevel(0.1, 1)).toBeCloseTo(1 - 20 / FLOOR_DB);
    expect(termLevel(1e-4, 1)).toBe(0);
  });

  it('plays term k at |k| x f0 as loud as its level', () => {
    const sr = 8000;
    const f0 = 100;
    const shape = makeShape(wobble(240, -2, 0.1));
    const c = renderSpectrum(shape, { ...DEFAULT_SETTINGS.spectrum, f0, terms: 8 }, sr);
    const i0 = Math.round(2 * sr);
    const i1 = Math.round((SPECTRUM_LAP - 0.2) * sr);
    const amp = (hz: number): number => Math.hypot(amplitude(c.left, sr, hz, i0, i1), amplitude(c.right, sr, hz, i0, i1));
    expect(amp(200) / amp(100)).toBeCloseTo(termLevel(0.1, 1), 2);
    expect(amp(300) / amp(100)).toBeLessThan(1e-3);
    // k = +1 to the right, k = -2 to the left.
    expect(amplitude(c.right, sr, 100, i0, i1)).toBeGreaterThan(amplitude(c.left, sr, 100, i0, i1));
    expect(amplitude(c.left, sr, 200, i0, i1)).toBeGreaterThan(amplitude(c.right, sr, 200, i0, i1));
  });

  it('colours k = 1 mod 3', () => {
    expect([-5, -2, 1, 4, 7].every(isComb)).toBe(true);
    expect([-1, 2, 3, -3, 5].some(isComb)).toBe(false);
  });
});

describe('corner threshold', () => {
  it('keeps every corner of a 12-step 12-gon at the default', () => {
    const shape = makeShape(wobble(12, 1, 0));
    const { cuts } = fitCorners(shape, 1);
    expect(cuts).toHaveLength(12);
    // Each side is one tile: two octaves above the root.
    for (const s of cornerSides(shape, cuts, DEFAULT_SETTINGS.corners)) expect(s.midi).toBe(DEFAULT_SETTINGS.corners.root + 24);
  });

  it('finds fewer corners as the threshold rises, on a real circuit', () => {
    const d = reelDefaults('hex');
    const world = loadWorld({ ...d, radius: 30, seed: 1, family: 'hex', seconds: 0, circuits: 0, fps: 30, bpm: 110, width: 1, height: 1 });
    const c = [...world.circuits].sort((a, b) => b.points.length - a.points.length)[0];
    expect(c.points.length).toBeGreaterThan(50);
    const shape = makeShape(c.points);
    const scales = Array.from({ length: 25 }, (_, i) => 0.05 * 1000 ** (i / 24));
    const counts = scales.map((s) => fitCorners(shape, s).cuts.length);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    expect(counts[0]).toBeGreaterThan(counts[counts.length - 1]);
    // A larger threshold keeps a subset of a smaller one's corners.
    const fine = new Set(fitCorners(shape, 0.5).cuts);
    expect(fitCorners(shape, 5).cuts.every((i) => fine.has(i))).toBe(true);
  });

  it('rdp keeps a straight run as its two ends', () => {
    const xy = Float64Array.from([0, 0, 1, 0, 2, 0, 3, 0, 3, 1, 0, 1]);
    expect(rdp(xy, 6, 0.01)).toEqual([0, 3, 4, 5]);
  });
});

describe('renders', () => {
  const shape = makeShape(wobble(90, -2, 0.2));
  it('brings each mapping and the pen to the same loudness, at the clip length', () => {
    const sr = 8000;
    const s = DEFAULT_SETTINGS;
    for (const [m, c] of [
      ['spectrum', renderSpectrum(shape, s.spectrum, sr)],
      ['radius', renderRadius(shape, s.radius, sr)],
      ['corners', renderCorners(shape, s.corners, sr)],
    ] as const) {
      expect(c.left.length).toBe(Math.round(clipSeconds(m, s) * sr));
      expect(rms(c.left, c.right)).toBeCloseTo(VOICE_RMS, 6);
    }
    const pen = renderPen(shape, s.spectrum, sr);
    const i0 = Math.ceil(PEN_START * sr);
    expect(rms(pen.left.subarray(i0), pen.right.subarray(i0))).toBeCloseTo(VOICE_RMS, 6);
  });

  it('pitches the radius voice up where the head is further out', () => {
    // Base 220 Hz, range 1.3 octaves per unit: radius 1 + 0.2 and 1 - 0.2 give 220 x 2^(±0.26).
    const sr = 8000;
    const s = { f0: 220, range: 1.3, lap: 4 };
    const c = renderRadius(makeShape(wobble(400, -2, 0.2)), s, sr);
    const zeroCrossHz = (t0: number): number => {
      const i0 = Math.round(t0 * sr);
      const len = Math.round(0.05 * sr);
      let n = 0;
      const m = (i: number): number => c.left[i] + c.right[i];
      for (let i = i0 + 1; i < i0 + len; i++) if (m(i - 1) < 0 && m(i) >= 0) n++;
      return n / 0.05;
    };
    // The loop is out at u = 0 (and every third of the lap) and in at u = 1/6.
    expect(zeroCrossHz(4 / 3)).toBeGreaterThan(zeroCrossHz(4 / 6 + 4 / 3));
  });
});

describe('constant tones', () => {
  const sr = 8000;
  const shape = makeShape(wobble(90, -2, 0.2));
  const clips = [
    ...MAPPINGS.map((m) => [m, renderConstant(shape, m, DEFAULT_SETTINGS, sr)] as const),
    ['pen', renderPenConstant(shape, 7000, sr)] as const,
  ];

  it('holds a steady level', () => {
    for (const [, c] of clips) {
      const win = Math.round(0.25 * sr);
      const levels: number[] = [];
      for (let i = 0; i + win <= c.left.length; i += win) levels.push(rms(c.left.subarray(i, i + win), c.right.subarray(i, i + win)));
      expect(Math.min(...levels) / Math.max(...levels)).toBeGreaterThan(0.8);
      expect(rms(c.left, c.right)).toBeCloseTo(VOICE_RMS, 6);
    }
  });

  it('loops without a click at the seam', () => {
    for (const [m, c] of clips) {
      for (const ch of [c.left, c.right]) {
        let step = 0;
        for (let i = 1; i < ch.length; i++) step = Math.max(step, Math.abs(ch[i] - ch[i - 1]));
        // Going from the last sample back to the first is no bigger a step than any inside the clip.
        expect(Math.abs(ch[0] - ch[ch.length - 1]), m).toBeLessThanOrEqual(step * 1.05);
      }
      if (m !== 'pen') expect(c.left.length).toBe(CONSTANT_SECONDS * sr);
    }
  });

  it('weights the drone by the share of the loop at each radius, and the chord by side length', () => {
    const drone = radiusDrone(shape, DEFAULT_SETTINGS.radius);
    expect(drone.reduce((a, b) => a + b.weight, 0)).toBeCloseTo(1, 9);
    expect(drone.length).toBeGreaterThan(1);
    const gon = makeShape(wobble(12, 1, 0));
    const chord = cornerChord(gon, DEFAULT_SETTINGS.corners);
    expect(chord).toHaveLength(1);
    expect(chord[0].midi).toBe(DEFAULT_SETTINGS.corners.root + 24);
    expect(chord[0].weight).toBeCloseTo(1, 9);
  });
});

describe('painting', () => {
  const brush: Brush = { mode: 'corners', play: 'constant', settings: DEFAULT_SETTINGS };
  const circ = (k: string) => ({ key: k, points: wobble(12, 1, 0) });

  it('turns an off circuit on with the brush and selects it', () => {
    const r = paint([], null, circ('a'), brush, false, 1);
    expect(r.kind).toBe('add');
    expect(r.selected).toBe(1);
    expect(r.voices[0]).toMatchObject({ key: 'a', mode: 'corners', play: 'constant', on: true });
  });

  it('turns an on circuit off, dropping the selection only if it was selected', () => {
    let vs = paint([], null, circ('a'), brush, false, 1).voices;
    vs = paint(vs, 1, circ('b'), brush, false, 2).voices;
    const off = paint(vs, 2, circ('a'), brush, false, 3);
    expect(off.kind).toBe('remove');
    expect(off.voices.map((v) => v.key)).toEqual(['b']);
    expect(off.selected).toBe(2);
    expect(paint(off.voices, 2, circ('b'), brush, false, 3).selected).toBeNull();
  });

  it('selects an on circuit with shift, without turning it off', () => {
    let vs = paint([], null, circ('a'), brush, false, 1).voices;
    vs = paint(vs, 1, circ('b'), brush, false, 2).voices;
    const r = paint(vs, 2, circ('a'), { ...brush, mode: 'spectrum' }, true, 3);
    expect(r.kind).toBe('select');
    expect(r.selected).toBe(1);
    expect(r.voices).toBe(vs);
  });

  it('stops at the cap', () => {
    const vs = Array.from({ length: 3 }, (_, i) => paint([], null, circ(`k${i}`), brush, false, i).voices[0]);
    expect(paint(vs, null, circ('new'), brush, false, 9, 3).kind).toBe('full');
  });

  it('edits only the selected circuit', () => {
    let vs: readonly Voice[] = paint([], null, circ('a'), brush, false, 1).voices;
    vs = paint(vs, 1, circ('b'), brush, false, 2).voices;
    const edited: Brush = { ...brush, play: 'loop', settings: { ...DEFAULT_SETTINGS, corners: { ...DEFAULT_SETTINGS.corners, tolerance: 4 } } };
    const out = applyBrush(vs, 2, edited);
    expect(out.find((v) => v.id === 2)).toMatchObject({ play: 'loop', settings: edited.settings });
    expect(out.find((v) => v.id === 1)).toBe(vs[0]);
    expect(applyBrush(vs, null, edited)).toBe(vs);
  });
});

describe('loops', () => {
  const sr = 8000;
  const real = (() => {
    const d = reelDefaults('hex');
    const world = loadWorld({ ...d, radius: 30, seed: 1, family: 'hex', seconds: 0, circuits: 0, fps: 30, bpm: 110, width: 1, height: 1 });
    return makeShape([...world.circuits].sort((a, b) => b.points.length - a.points.length)[0].points);
  })();
  const s = DEFAULT_SETTINGS;
  const clips = [real, makeShape(wobble(90, -2, 0.2))].flatMap((shape) => [
    ['spectrum', renderSpectrum(shape, s.spectrum, sr)] as const,
    ['radius', renderRadius(shape, s.radius, sr)] as const,
    ['corners', renderCorners(shape, s.corners, sr)] as const,
  ]);
  const win = Math.round(0.05 * sr);

  it('are one lap with no gap at either end', () => {
    for (const [m, c] of clips) {
      const n = c.left.length;
      const mid = rms(c.left.subarray(win, n - win), c.right.subarray(win, n - win));
      const first = rms(c.left.subarray(0, win), c.right.subarray(0, win));
      const last = rms(c.left.subarray(n - win), c.right.subarray(n - win));
      // The spectrum starts each lap from its circle terms alone, so its ends are quieter than its middle, never silent.
      const floor = m === 'spectrum' ? 0.2 : 0.4;
      expect(first / mid, `${m} first`).toBeGreaterThan(floor);
      expect(last / mid, `${m} last`).toBeGreaterThan(floor);
      expect(first / mid, `${m} first`).toBeLessThan(2.5);
    }
  });

  it('have no step at the seam', () => {
    for (const [m, c] of clips) {
      for (const ch of [c.left, c.right]) {
        // The step from the last sample back to the first is no bigger than the steps either side of it.
        const n = ch.length;
        let near = 0;
        for (let i = 1; i < win; i++) near = Math.max(near, Math.abs(ch[i] - ch[i - 1]), Math.abs(ch[n - i] - ch[n - i - 1]));
        expect(Math.abs(ch[0] - ch[n - 1]), m).toBeLessThanOrEqual(1.2 * near);
      }
    }
  });
});

describe('distance at the extremes', () => {
  const sr = 44100;
  const shape = makeShape(wobble(400, -2, 0.2));
  const seamStep = (ch: Float32Array): [number, number] => {
    const n = ch.length;
    const w = Math.round(0.005 * sr);
    let near = 0;
    for (let i = 1; i < w; i++) near = Math.max(near, Math.abs(ch[i] - ch[i - 1]), Math.abs(ch[n - i] - ch[n - i - 1]));
    return [Math.abs(ch[0] - ch[n - 1]), near];
  };

  it('loops a 0.1 s lap without a seam', () => {
    for (const f0 of [55, 220, 880]) {
      const c = renderRadius(shape, { f0, range: 1.3, lap: 0.1 }, sr);
      expect(c.left.length).toBe(Math.round(0.1 * sr));
      for (const ch of [c.left, c.right]) {
        const [seam, near] = seamStep(ch);
        expect(seam, `f0 ${f0}`).toBeLessThanOrEqual(1.2 * near);
      }
    }
  });

  it('keeps a 100-octave range audible, below 18 kHz and finite', () => {
    const c = renderRadius(shape, { f0: 220, range: 100, lap: 2 }, sr);
    let peak = 0;
    for (const ch of [c.left, c.right]) for (const x of ch) peak = Math.max(peak, Math.abs(x));
    expect(Number.isFinite(peak)).toBe(true);
    expect(peak).toBeLessThan(1);
    for (const hz of [1e-9, 1, 19, 20, 440, 18000, 1e30]) {
      const f = foldHz(hz);
      expect(f).toBeGreaterThanOrEqual(20);
      expect(f).toBeLessThan(20 * 2 ** 9);
      // Folding keeps the note.
      const octaves = Math.log2(f / hz);
      expect(Math.abs(octaves - Math.round(octaves))).toBeLessThan(1e-6);
    }
    const [seam, near] = seamStep(c.left);
    expect(seam).toBeLessThanOrEqual(1.2 * near);
  });

  it('caps the held tone at 64 pitches, the most visited', () => {
    const drone = radiusDrone(shape, { f0: 220, range: 100 });
    expect(drone.length).toBeLessThanOrEqual(MAX_DRONE);
    // Rounded to the semitone, the top of the fold can round up to 20 x 2^9.
    expect(drone.every((b) => b.hz >= 20 && b.hz <= 20 * 2 ** 9)).toBe(true);
    const held = renderConstant(shape, 'radius', { ...DEFAULT_SETTINGS, radius: { f0: 220, range: 100, lap: 5 } }, 8000);
    expect(rms(held.left, held.right)).toBeCloseTo(VOICE_RMS, 6);
  });
});

describe('pen ramp', () => {
  const ramp = penMotion({ ...DEFAULT_SETTINGS.spectrum, pen: true, penRate: 1000, penFrom: 0, penMax: 40000 });

  it('integrates the speed, so the position never jumps', () => {
    const dt = 1e-3;
    for (const tau of [0.5, 10, 39.9995, 40, 40.0005, 41]) {
      const v = (penSteps(ramp, tau + dt / 2) - penSteps(ramp, tau - dt / 2)) / dt;
      expect(v).toBeCloseTo(penSpeedAt(ramp, tau), 0);
    }
    expect(penSteps(ramp, 40)).toBeCloseTo(800000, 6);
    expect(penSteps(ramp, 42)).toBeCloseTo(880000, 6);
    expect(penSpeedAt(ramp, 100)).toBe(40000);
  });

  it('sounds at the rate it laps, as the speed rises', () => {
    // A 100-step circle: the direction of travel turns once a lap, so the pen is a sine at speed / 100.
    const sr = 22050;
    const circle = makeShape(wobble(100, 1, 0));
    const fast = penMotion({ ...DEFAULT_SETTINGS.spectrum, pen: true, penRate: 2000, penFrom: 0, penMax: 20000 });
    const c = renderPenMotion(circle, fast, 0, 10, sr);
    const hzAt = (t: number): number => {
      const w = 0.1;
      let n = 0;
      for (let i = Math.round((t - w / 2) * sr) + 1; i < Math.round((t + w / 2) * sr); i++) if (c.left[i - 1] < 0 && c.left[i] >= 0) n++;
      return n / w;
    };
    for (const t of [5, 9]) expect(hzAt(t) / (penSpeedAt(fast, t) / 100)).toBeGreaterThan(0.85);
    for (const t of [5, 9]) expect(hzAt(t) / (penSpeedAt(fast, t) / 100)).toBeLessThan(1.15);
  });
});

describe('corners at a 0.1 s lap', () => {
  it('loops without a seam, its notes wrapping round more than once', () => {
    const sr = 44100;
    const d = reelDefaults('hex');
    const world = loadWorld({ ...d, radius: 30, seed: 1, family: 'hex', seconds: 0, circuits: 0, fps: 30, bpm: 110, width: 1, height: 1 });
    const big = makeShape([...world.circuits].sort((a, b) => b.points.length - a.points.length)[0].points);
    for (const shape of [big, makeShape(wobble(12, 1, 0))]) {
      const s = { ...DEFAULT_SETTINGS.corners, lap: 0.1 };
      const c = renderCorners(shape, s, sr);
      expect(c.left.length).toBe(Math.round(0.1 * sr));
      // Every note (at least 0.28 s with its tail) is longer than the lap.
      expect(cornerSides(shape, fitCorners(shape, 1).cuts, s).every((x) => Math.max(x.dur, 0.03) + 0.25 > 0.1)).toBe(true);
      const n = c.left.length;
      const w = Math.round(0.005 * sr);
      for (const ch of [c.left, c.right]) {
        let near = 0;
        for (let i = 1; i < w; i++) near = Math.max(near, Math.abs(ch[i] - ch[i - 1]), Math.abs(ch[n - i] - ch[n - i - 1]));
        expect(Math.abs(ch[0] - ch[n - 1])).toBeLessThanOrEqual(1.2 * near);
      }
      expect(rms(c.left, c.right)).toBeCloseTo(VOICE_RMS, 6);
    }
  });
});

describe('pen hold', () => {
  const circle = makeShape(wobble(100, 1, 0));
  const sr = 22050;
  const zeroCrossHz = (ch: Float32Array, t: number, w = 0.1): number => {
    let n = 0;
    for (let i = Math.round((t - w / 2) * sr) + 1; i < Math.round((t + w / 2) * sr); i++) if (ch[i - 1] < 0 && ch[i] >= 0) n++;
    return n / w;
  };
  const rmsAt = (ch: Float32Array, t: number, w = 0.05): number => {
    let s2 = 0;
    const i0 = Math.round(t * sr);
    const n = Math.round(w * sr);
    for (let i = i0; i < i0 + n; i++) s2 += ch[i] ** 2;
    return Math.sqrt(s2 / n);
  };

  it('holds the top speed for its hold, then stops, when ramp and hold fit in a lap', () => {
    const s = { ...DEFAULT_SETTINGS.spectrum, pen: true, penRate: 2000, penFrom: 0, penMax: 2000, penHold: 0.5 };
    const plan = penPlan(s, 100);
    expect(plan.kind).toBe('lap');
    expect(penSpeedNow(plan, PEN_START + 1.2, 0)).toBe(2000);
    expect(penSpeedNow(plan, PEN_START + 1.7, 0)).toBeNull();
    const c = renderPen(circle, s, sr);
    // 2000 steps a second round a 100-step circle: 20 Hz is below the high-pass, so hear the hold by level instead.
    expect(rmsAt(c.left, PEN_START + 1.3)).toBeGreaterThan(0);
    expect(rmsAt(c.left, PEN_START + 1.75)).toBeLessThan(1e-6);
  });

  it('carries a ramp too long for a lap across laps: ramp, hold, again', () => {
    const s = { ...DEFAULT_SETTINGS.spectrum, pen: true, penRate: 1000, penFrom: 0, penMax: 40000, penHold: 2 };
    const plan = penPlan(s, 100);
    expect(plan.kind).toBe('cycle');
    expect(plan.ramp).toBe(40);
    // 800000 steps in the ramp are 8000 laps of the circle, so the hold needs no stretch.
    expect(plan.hold).toBeCloseTo(2, 9);
    expect(penSpeedNow(plan, 0, 41)).toBe(40000);
    expect(penSpeedNow(plan, 0, 20)).toBe(20000);
    const c = renderPen(circle, s, sr);
    expect(c.seconds).toBeCloseTo(42, 3);
    // The pen sounds at its lap rate: 200 Hz halfway up the ramp, 400 Hz through the hold.
    expect(zeroCrossHz(c.left, 20) / 200).toBeGreaterThan(0.9);
    expect(zeroCrossHz(c.left, 20) / 200).toBeLessThan(1.1);
    for (const t of [40.5, 41.5]) {
      expect(zeroCrossHz(c.left, t) / 400).toBeGreaterThan(0.95);
      expect(zeroCrossHz(c.left, t) / 400).toBeLessThan(1.05);
    }
    // No seam where the cycle starts again.
    const n = c.left.length;
    let near = 0;
    for (let i = 1; i < 200; i++) near = Math.max(near, Math.abs(c.left[i] - c.left[i - 1]), Math.abs(c.left[n - i] - c.left[n - i - 1]));
    expect(Math.abs(c.left[0] - c.left[n - 1])).toBeLessThanOrEqual(1.2 * near);
  });

  it('stretches the hold to whole laps of the loop, by under one lap at the top speed', () => {
    const s = { ...DEFAULT_SETTINGS.spectrum, pen: true, penRate: 1000, penFrom: 0, penMax: 40000, penHold: 2 };
    const plan = penPlan(s, 429);
    const covered = penSteps(plan.motion, plan.ramp) + 40000 * plan.hold;
    expect(covered / 429).toBeCloseTo(Math.round(covered / 429), 6);
    expect(Math.abs(plan.hold - 2)).toBeLessThanOrEqual(429 / 40000);
  });
});

describe('many terms', () => {
  it('gives a loop half its steps in terms, up to 512', () => {
    const d = reelDefaults('hex');
    const world = loadWorld({ ...d, radius: 30, seed: 1, family: 'hex', seconds: 0, circuits: 0, fps: 30, bpm: 110, width: 1, height: 1 });
    const c = [...world.circuits].sort((a, b) => b.points.length - a.points.length)[0];
    const shape = makeShape(c.points);
    const ts = shapeTerms(shape, 512);
    expect(Math.max(...ts.map((t) => t.k))).toBe(Math.min(512, Math.floor((c.points.length - 1) / 2)));
  });
});

describe('pen on a curve', () => {
  it('slows down along it, its pitch falling with its speed, without clicks', () => {
    // 40000 steps/s easing down to 13300: v = v1 + (v0 - v1) e^(-tau / 2), and its integral.
    const [v0, v1, tc] = [40000, 13300, 2];
    const motion = { start: v0, rate: 0, max: v0, steps: (tau: number) => v1 * tau + (v0 - v1) * tc * (1 - Math.exp(-tau / tc)) };
    expect(penSpeedAt(motion, 3)).toBeCloseTo(v1 + (v0 - v1) * Math.exp(-3 / tc), 0);
    const sr = 22050;
    const circle = makeShape(wobble(100, 1, 0));
    const c = renderPenMotion(circle, motion, 0, 10, sr);
    const hzAt = (t: number): number => {
      let n = 0;
      for (let i = Math.round((t - 0.05) * sr) + 1; i < Math.round((t + 0.05) * sr); i++) if (c.left[i - 1] < 0 && c.left[i] >= 0) n++;
      return n / 0.1;
    };
    for (const t of [1, 3, 5, 9]) {
      const want = penSpeedAt(motion, t) / 100;
      expect(hzAt(t) / want, `t ${t}`).toBeGreaterThan(0.9);
      expect(hzAt(t) / want, `t ${t}`).toBeLessThan(1.1);
    }
    // No clicks: no sample-to-sample jump beyond what its highest pitch (400 Hz) allows.
    let peak = 0;
    let step = 0;
    for (let i = Math.round(0.2 * sr); i < c.left.length; i++) {
      peak = Math.max(peak, Math.abs(c.left[i]));
      step = Math.max(step, Math.abs(c.left[i] - c.left[i - 1]));
    }
    expect(step / peak).toBeLessThan((2 * Math.PI * 400 * 1.5) / sr);
  });
});
