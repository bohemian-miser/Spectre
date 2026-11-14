import { describe, expect, it } from 'vitest';
import type { Pt } from '../../../core';
import { loadWorld, reelDefaults } from '../../reel/director';
import { DEFAULT_SETTINGS, PRE, SPECTRUM_LAP, VOICE_RMS, clipSeconds, cornerSides, renderCorners, renderPen, renderRadius, renderSpectrum } from '../render';
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
    const i0 = Math.round((PRE + 2) * sr);
    const i1 = Math.round((PRE + SPECTRUM_LAP - 0.2) * sr);
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
      expect(c.left.length).toBe(Math.ceil(clipSeconds(m, s) * sr));
      expect(rms(c.left, c.right)).toBeCloseTo(VOICE_RMS, 6);
    }
    const pen = renderPen(shape, 7000, sr);
    expect(rms(pen.left, pen.right)).toBeCloseTo(VOICE_RMS, 6);
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
    expect(zeroCrossHz(PRE + 4 / 3)).toBeGreaterThan(zeroCrossHz(PRE + 4 / 6 + 4 / 3));
  });
});
