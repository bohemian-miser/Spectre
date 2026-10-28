import { describe, expect, it } from 'vitest';
import { chordFit, radiusOfGyration as rgPts, referenceShape } from '../../../../circuit-classes/chord-fit';
import {
  RunSums,
  chooseCorners,
  chordCurve,
  cutRuns,
  epicyclePoint,
  epicycles,
  evenStarts,
  fitPolygon,
  fitSymmetric,
  harmonic,
  radiusOfGyration,
  spectrum,
  symmetryShare,
  type Loop,
} from '../measure';

const toLoop = (pts: readonly { x: number; y: number }[]): Loop => ({ xy: Float64Array.from(pts.flatMap((p) => [p.x, p.y])), n: pts.length });

/** A closed polygon through `corners`, traced anticlockwise by n points evenly spaced along its length. */
function polygon(corners: readonly [number, number][], n: number): Loop {
  const len = corners.map((c, i) => Math.hypot(corners[(i + 1) % corners.length][0] - c[0], corners[(i + 1) % corners.length][1] - c[1]));
  const total = len.reduce((a, b) => a + b, 0);
  const out: { x: number; y: number }[] = [];
  for (let j = 0; j < n; j++) {
    let d = (j / n) * total;
    let s = 0;
    while (d > len[s]) d -= len[s++];
    const a = corners[s];
    const b = corners[(s + 1) % corners.length];
    out.push({ x: a[0] + ((b[0] - a[0]) * d) / len[s], y: a[1] + ((b[1] - a[1]) * d) / len[s] });
  }
  return toLoop(out);
}

/** A triangle whose corners are cut off: three long sides, three short. */
const truncated = (cut: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let j = 0; j < 3; j++) {
    const a = (2 * Math.PI * j) / 3;
    const b = (2 * Math.PI * (j + 1)) / 3;
    const A = [Math.cos(a), Math.sin(a)];
    const B = [Math.cos(b), Math.sin(b)];
    out.push([A[0] + (B[0] - A[0]) * cut, A[1] + (B[1] - A[1]) * cut]);
    out.push([A[0] + (B[0] - A[0]) * (1 - cut), A[1] + (B[1] - A[1]) * (1 - cut)]);
  }
  return out;
};

describe('corners walked round', () => {
  it('matches web/circuit-classes/chord-fit.ts on the same points', () => {
    const pts = referenceShape(0, 600).map((p, i) => ({ x: p.x * (1 + 0.2 * Math.sin(5 * i * 0.0105)), y: p.y }));
    const loop = toLoop(pts);
    const rg = radiusOfGyration(loop);
    expect(rg).toBeCloseTo(rgPts(pts), 12);
    const starts = evenStarts(600, 60);
    for (const k of [3, 5, 9]) {
      const want = chordFit(pts, k, starts);
      const got = chordCurve(loop, k, starts, rg);
      want.unsigned.forEach((v, q) => expect(got.unsigned[q]).toBeCloseTo(v / (600 * rg), 12));
      want.signed.forEach((v, q) => expect(got.signed[q]).toBeCloseTo(v / (600 * rg), 12));
    }
  });

  it('a circle does not care where the corners start; a triangle does', () => {
    const circle = toLoop(referenceShape(0, 600));
    const tri = toLoop(referenceShape(3, 600));
    const starts = evenStarts(600, 120);
    expect(chordCurve(circle, 3, starts, radiusOfGyration(circle)).contrast).toBeLessThan(1e-9);
    const t = chordCurve(tri, 3, starts, radiusOfGyration(tri));
    expect(t.unsigned[t.best]).toBeCloseTo(0, 12);
    expect(t.contrast).toBeGreaterThan(1);
    expect(t.swing).toBeGreaterThan(0.5);
  });
});

describe('fitted polygons', () => {
  it('a run’s cost is the smaller eigenvalue of its scatter, as computed directly', () => {
    const loop = toLoop(Array.from({ length: 40 }, (_, i) => ({ x: Math.cos(i) * 3 + i * 0.1, y: Math.sin(1.7 * i) })));
    const sums = new RunSums(loop.xy, 1);
    for (const [a, b] of [[0, 5], [3, 17], [10, 40]]) {
      let mx = 0;
      let my = 0;
      for (let i = a; i < b; i++) {
        mx += loop.xy[2 * i];
        my += loop.xy[2 * i + 1];
      }
      mx /= b - a;
      my /= b - a;
      // Minimise the squared distance over line directions by brute force.
      let best = Infinity;
      for (let s = 0; s < 20000; s++) {
        const t = (Math.PI * s) / 20000;
        let c = 0;
        for (let i = a; i < b; i++) c += ((loop.xy[2 * i] - mx) * Math.sin(t) - (loop.xy[2 * i + 1] - my) * Math.cos(t)) ** 2;
        best = Math.min(best, c);
      }
      expect(sums.cost(a, b)).toBeCloseTo(best, 4);
    }
  });

  it('open cuts are the cheapest of every possible set of cuts', () => {
    const loop = toLoop(Array.from({ length: 14 }, (_, i) => ({ x: Math.cos(i * 1.3) + i * 0.2, y: Math.sin(i * 0.7) * 2 })));
    const sums = new RunSums(loop.xy, 1);
    const k = 3;
    let best = Infinity;
    for (let a = 2; a <= 14; a++) for (let b = a + 2; b <= 12; b++) best = Math.min(best, sums.cost(0, a) + sums.cost(a, b) + sums.cost(b, 14));
    expect(cutRuns(sums, 0, 14, k).cost).toBeCloseTo(best, 12);
  });

  it('finds a triangle with its corners cut off as six sides of two lengths', () => {
    const corners = truncated(0.2);
    const loop = polygon(corners, 1080);
    const rg = radiusOfGyration(loop);
    const six = fitPolygon(loop, 6, rg);
    expect(six.rms).toBeLessThan(1e-3);
    expect(fitPolygon(loop, 3, rg).rms).toBeGreaterThan(0.02);
    const sides = [...six.sides].sort((a, b) => a - b);
    const want = corners.map((c, i) => Math.hypot(corners[(i + 1) % 6][0] - c[0], corners[(i + 1) % 6][1] - c[1])).sort((a, b) => a - b);
    sides.forEach((s, i) => expect(s).toBeCloseTo(want[i], 2));
    // Turning it by a third maps it to itself, so the symmetric fit is as good.
    expect(fitSymmetric(loop, 6, 3, rg).rms).toBeLessThan(1e-3);
  });

  it('error never rises with more sides, and the score keeps the corners that pay', () => {
    const loop = polygon(truncated(0.15), 1080);
    const rg = radiusOfGyration(loop);
    const rms = new Map([3, 4, 5, 6, 7, 8, 9].map((k) => [k, fitPolygon(loop, k, rg).rms]));
    for (let k = 4; k <= 9; k++) expect(rms.get(k)!).toBeLessThanOrEqual(rms.get(k - 1)! + 1e-6);
    expect(chooseCorners(rms, 0.2)).toBe(6);
    expect(chooseCorners(new Map([[3, 0.1], [4, 0.095], [6, 0.05]]), 0.2)).toBe(6);
    expect(chooseCorners(new Map([[3, 0.1], [4, 0.095], [6, 0.08]]), 0.2)).toBe(3);
  });
});

describe('Fourier', () => {
  it('a regular m-gon has harmonics only at f = 1 (mod m), falling as 1 / f^2', () => {
    for (const m of [3, 6]) {
      const loop = toLoop(referenceShape(m, 1080));
      const s = spectrum(loop);
      expect(symmetryShare(s, m)).toBeCloseTo(1, 10);
      const c1 = Math.hypot(harmonic(s, 1).re, harmonic(s, 1).im);
      for (const f of [1 - m, 1 + m, 1 - 2 * m]) {
        const c = harmonic(s, f);
        expect(Math.hypot(c.re, c.im) / c1).toBeCloseTo(1 / f ** 2, 3);
      }
    }
    // A triangle is not six-fold: beyond the circle, its harmonics fall as 1 / f^4 in energy,
    // f = -2, 4, -5, 7, ..., of which only -5, 7, -11, 13, ... are 1 (mod 6).
    const tri = spectrum(toLoop(referenceShape(3, 1080)));
    expect(symmetryShare(tri, 3, true)).toBeCloseTo(1, 10);
    let on = 0;
    let all = 0;
    for (let j = -60; j <= 60; j++) {
      const f = 1 + 3 * j;
      if (f === 1) continue;
      all += f ** -4;
      if ((f - 1) % 6 === 0) on += f ** -4;
    }
    expect(symmetryShare(tri, 6, true)).toBeCloseTo(on / all, 3);
    expect(symmetryShare(spectrum(toLoop(referenceShape(6, 1080))), 6, true)).toBeCloseTo(1, 10);
  });

  it('every epicycle together redraws the loop', () => {
    const loop = polygon(truncated(0.2), 360);
    const s = spectrum(loop);
    const cycles = epicycles(s, 360);
    for (const j of [0, 17, 200]) {
      const p = epicyclePoint(cycles, j / 360);
      expect(p.x + s.cx).toBeCloseTo(loop.xy[2 * j], 9);
      expect(p.y + s.cy).toBeCloseTo(loop.xy[2 * j + 1], 9);
    }
  });
});
