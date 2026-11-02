import { describe, expect, it } from 'vitest';
import { simplify, spanOf } from '../simplify';

/** Distance from p to the segment ab. */
function dist(pts: Float64Array, i: number, a: number, b: number): number {
  const ax = pts[2 * a], ay = pts[2 * a + 1], dx = pts[2 * b] - ax, dy = pts[2 * b + 1] - ay;
  const px = pts[2 * i] - ax, py = pts[2 * i + 1] - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / len2)) : 0;
  return Math.hypot(px - t * dx, py - t * dy);
}

/** A deterministic wandering line: a random walk with a drift, `n` points. */
function wander(n: number, seed: number): Float64Array {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out = new Float64Array(2 * n);
  let x = 0, y = 0;
  for (let i = 0; i < n; i++) {
    out[2 * i] = x;
    out[2 * i + 1] = y;
    x += 1 + rnd();
    y += rnd() * 2 - 1;
  }
  return out;
}

describe('simplify', () => {
  it('keeps the ends, keeps a subsequence of the points, and leaves out only points within the tolerance of the line kept', () => {
    const pts = wander(5000, 7);
    for (const tol of [0.1, 0.5, 2, 10]) {
      const out = simplify(pts, tol);
      expect(out.length).toBeLessThan(pts.length);
      expect([out[0], out[1]]).toEqual([pts[0], pts[1]]);
      expect([out[out.length - 2], out[out.length - 1]]).toEqual([pts[pts.length - 2], pts[pts.length - 1]]);
      // the kept points, in order, as indices into the original
      const kept: number[] = [];
      let i = 0;
      for (let j = 0; j < out.length; j += 2) {
        while (pts[2 * i] !== out[j] || pts[2 * i + 1] !== out[j + 1]) i++;
        kept.push(i);
      }
      expect(kept.length).toBe(out.length / 2);
      for (let q = 0; q + 1 < kept.length; q++) {
        for (let k = kept[q] + 1; k < kept[q + 1]; k++) expect(dist(pts, k, kept[q], kept[q + 1])).toBeLessThanOrEqual(tol + 1e-12);
      }
    }
  });

  it('keeps fewer points at a coarser tolerance, and every point at none', () => {
    const pts = wander(2000, 3);
    const a = simplify(pts, 0.2).length, b = simplify(pts, 1).length, c = simplify(pts, 5).length;
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    expect(simplify(pts, 0)).toBe(pts);
  });

  it('keeps the corners of a square and drops the points along its sides', () => {
    const pts: number[] = [];
    for (let i = 0; i <= 10; i++) pts.push(i, 0);
    for (let i = 1; i <= 10; i++) pts.push(10, i);
    for (let i = 9; i >= 0; i--) pts.push(i, 10);
    for (let i = 9; i >= 0; i--) pts.push(0, i);
    const out = simplify(Float64Array.from(pts), 0.01);
    expect(Array.from(out)).toEqual([0, 0, 10, 0, 10, 10, 0, 10, 0, 0]);
    expect(spanOf(out)).toBe(10);
  });
});
