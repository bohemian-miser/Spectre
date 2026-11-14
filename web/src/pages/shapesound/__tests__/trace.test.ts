import { describe, expect, it } from 'vitest';
import type { Pt } from '../../../core';
import { loadWorld, reelDefaults } from '../../reel/director';
import { DEFAULT_SETTINGS, renderSpectrum } from '../render';
import { FIT_POINTS, VIEW, fitCorners, makeShape, shapeTerms } from '../shape';
import { startTrace } from '../trace';

const rule = { family: 'hex' as const, subset: [0, 1, 2, 3, 4, 5, 6, 8], combo: '310021340' };
const world = loadWorld({ ...reelDefaults('hex'), ...rule, seed: 1, seconds: 0, circuits: 0, fps: 30, bpm: 110, width: 1, height: 1 });
const c429 = world.circuits.find((c) => c.points.length === 429)!;
const mid = (c: { points: readonly Pt[] }): Pt => ({ x: (c.points[10].x + c.points[11].x) / 2, y: (c.points[10].y + c.points[11].y) / 2 });

function trace(at: Pt, maxSteps: number) {
  const t = startTrace({ ...rule, at, maxSteps })!;
  while (!t.done) t.run(1000);
  return t.result();
}

describe('tracing any strand', () => {
  it('follows a circuit round to where it started', () => {
    const r = trace(mid(c429), 1_000_000);
    expect(r.closed).toBe(true);
    expect(r.capped).toBe(false);
    expect(r.xy.length / 2).toBe(429);
  });

  it('stops at the step limit and gives the path so far', () => {
    const r = trace(mid(c429), 100);
    expect(r.closed).toBe(false);
    expect(r.capped).toBe(true);
    expect(r.xy.length / 2).toBeGreaterThanOrEqual(100);
    expect(r.xy.length / 2).toBeLessThanOrEqual(102);
  });
});

describe('open and long paths', () => {
  it('closes an open path by its chord, centred on its own points', () => {
    const arc: Pt[] = Array.from({ length: 200 }, (_, i) => ({ x: Math.cos((Math.PI * i) / 199), y: Math.sin((Math.PI * i) / 199) }));
    const s = makeShape(arc, true);
    expect(s.open).toBe(true);
    // The chord from (-1, 0) to (1, 0), 2 units, in steps of about pi / 199.
    expect(s.steps - 200).toBeGreaterThan(120);
    expect(s.steps - 200).toBeLessThan(130);
    const terms = shapeTerms(s, 8);
    expect(terms.every((t) => Number.isFinite(t.amp))).toBe(true);
    expect(fitCorners(s, 1).cuts.length).toBeGreaterThan(2);
  });

  it('keeps a million-step path cheap: decimated terms and fit', () => {
    const n = 1_000_000;
    const big: Pt[] = Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n;
      return { x: Math.cos(a) + 0.1 * Math.cos(5 * a), y: Math.sin(a) + 0.1 * Math.sin(5 * a) };
    });
    const t0 = performance.now();
    const s = makeShape(big);
    expect(s.viewN).toBeLessThanOrEqual(VIEW);
    const ts = shapeTerms(s, 512);
    expect(Math.max(...ts.map((t) => t.k))).toBe(512);
    const five = ts.find((t) => t.k === 5)!.amp / ts.find((t) => t.k === 1)!.amp;
    expect(five).toBeCloseTo(0.1, 3);
    const fit = fitCorners(s, 1);
    expect(fit.cuts.every((i, j) => i < s.steps && (j === 0 || i > fit.cuts[j - 1]))).toBe(true);
    expect(s.steps / FIT_POINTS).toBeGreaterThan(1);
    renderSpectrum(s, { ...DEFAULT_SETTINGS.spectrum, terms: 214 }, 8000);
    // Generous: it is a few seconds on the Pi.
    expect(performance.now() - t0).toBeLessThan(60_000);
  });
});
