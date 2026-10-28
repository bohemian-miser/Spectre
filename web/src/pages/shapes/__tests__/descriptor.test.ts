import { describe, expect, it } from 'vitest';
import { centroid, radiusOfGyration, type Loop } from '../../corners/measure';
import { align, cluster, cut, gaps, meanShape, medoid, outline, planeLayout, terms } from '../descriptor';

/** A lopsided closed curve: no turn or mirror maps it to itself. */
function blob(n: number, wobble = 0.3): Loop {
  const xy = new Float64Array(2 * n);
  for (let j = 0; j < n; j++) {
    const t = (2 * Math.PI * j) / n;
    const r = 1 + wobble * Math.cos(2 * t + 0.4) + 0.15 * Math.sin(3 * t) + 0.08 * Math.cos(5 * t + 1);
    xy[2 * j] = r * Math.cos(t);
    xy[2 * j + 1] = r * Math.sin(t);
  }
  return { xy, n };
}

/** The same curve scaled, turned, moved, restarted at sample k and, if asked, mirrored (and run backwards to stay anticlockwise). */
function copy(loop: Loop, scale: number, turn: number, k: number, mirror: boolean): Loop {
  const { xy, n } = loop;
  const out = new Float64Array(2 * n);
  for (let j = 0; j < n; j++) {
    const s = mirror ? (((k - j) % n) + n) % n : (j + k) % n;
    const x = xy[2 * s];
    const y = mirror ? -xy[2 * s + 1] : xy[2 * s + 1];
    out[2 * j] = 5 + scale * (x * Math.cos(turn) - y * Math.sin(turn));
    out[2 * j + 1] = -2 + scale * (x * Math.sin(turn) + y * Math.cos(turn));
  }
  return { xy: out, n };
}

/** Least rms distance between two loops' samples (centred, over their radii of gyration), over whole-sample restarts and a fine grid of turns. */
function pointGap(a: Loop, b: Loop): number {
  const ca = centroid(a);
  const cb = centroid(b);
  const ra = radiusOfGyration(a);
  const rb = radiusOfGyration(b);
  const n = a.n;
  let best = Infinity;
  for (let k = 0; k < n; k++) {
    // For a fixed restart the best turn is the angle of sum conj(b) a.
    let pr = 0;
    let pi = 0;
    let na = 0;
    let nb = 0;
    for (let j = 0; j < n; j++) {
      const ax = (a.xy[2 * j] - ca.x) / ra;
      const ay = (a.xy[2 * j + 1] - ca.y) / ra;
      const s = (j + k) % n;
      const bx = (b.xy[2 * s] - cb.x) / rb;
      const by = (b.xy[2 * s + 1] - cb.y) / rb;
      pr += ax * bx + ay * by;
      pi += ay * bx - ax * by;
      na += ax * ax + ay * ay;
      nb += bx * bx + by * by;
    }
    best = Math.min(best, Math.sqrt(Math.max(0, (na + nb - 2 * Math.hypot(pr, pi)) / n)));
  }
  return best;
}

describe('shape terms', () => {
  it('do not see size, position, turn or starting tile', () => {
    const a = blob(400);
    const b = copy(a, 3.7, 0.9, 123, false);
    const al = align(terms(a, 30), terms(b, 30), false);
    expect(al.gap).toBeLessThan(1e-9);
    // b restarted 123 samples on is a again, so a sits 123 samples back on b... b(t + s) = a(t) at s = -123/400.
    const off = (((al.s + 123 / 400) % 1) + 1) % 1;
    expect(Math.min(off, 1 - off)).toBeLessThan(1e-6);
  });

  it('see a mirror image unless mirrors are allowed', () => {
    const a = blob(400);
    const b = copy(a, 0.5, 2.1, 77, true);
    expect(align(terms(a, 30), terms(b, 30), false).gap).toBeGreaterThan(0.1);
    const al = align(terms(a, 30), terms(b, 30), true);
    expect(al.mirror).toBe(true);
    expect(al.gap).toBeLessThan(1e-9);
  });

  it('give the same gap as lining the samples up directly', () => {
    const a = blob(300);
    const b = copy(blob(300, 0.5), 2, 0.3, 40, false);
    const g = align(terms(a, 149), terms(b, 149), false).gap;
    const p = pointGap(a, b);
    // A start between samples can only do as well or better.
    expect(g).toBeLessThanOrEqual(p + 1e-9);
    expect(p - g).toBeLessThan(2e-3);
    expect(g).toBeGreaterThan(0.05);
  });

  it('redraw the loop with every term', () => {
    const a = blob(64);
    const t = terms(a, 31);
    const o = outline(t, 64);
    const c = centroid(a);
    const r = radiusOfGyration(a);
    // The term at f = 32 (the Nyquist one) is left out, and this blob has none.
    for (const j of [0, 9, 40]) {
      expect(o[2 * j]).toBeCloseTo((a.xy[2 * j] - c.x) / r, 9);
      expect(o[2 * j + 1]).toBeCloseTo((a.xy[2 * j + 1] - c.y) / r, 9);
    }
  });
});

describe('groups', () => {
  it('join the closest clusters by mean gap', () => {
    // Points on a line at 0, 1, 5, 6.5: {0, 1} at 1, then {5, 6.5} at 1.5, then everything at the mean of the cross gaps.
    const x = [0, 1, 5, 6.5];
    const d = new Float64Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) d[i * 4 + j] = Math.abs(x[i] - x[j]);
    const m = cluster(d, 4);
    expect(m.map((v) => [Math.min(v.a, v.b), Math.max(v.a, v.b), v.height])).toEqual([
      [0, 1, 1],
      [2, 3, 1.5],
      [4, 5, (5 + 6.5 + 4 + 5.5) / 4],
    ]);
    expect(cut(m, 4, 1.2)).toEqual([0, 0, 1, 2]);
    expect(cut(m, 4, 2)).toEqual([0, 0, 1, 1]);
    expect(medoid([0, 1, 2], d, 4)).toBe(1);
  });

  it('put copies together and the mean of copies is the shape', () => {
    const a = blob(200);
    const loops = [a, copy(a, 2, 1, 50, false), copy(a, 0.3, 4, 11, true), blob(200, 0.7)];
    const all = loops.map((l) => terms(l, 20));
    const d = gaps(all, true);
    const groups = cut(cluster(d, 4), 4, 0.01);
    expect(groups).toEqual([0, 0, 0, 1]);
    const mean = meanShape([0, 1, 2], all, 0, true);
    for (let k = 0; k < mean.c.length; k++) expect(mean.c[k]).toBeCloseTo(all[0].c[k], 7);
  });

  it('lay points of a plane back out at their own distances', () => {
    const p = [
      [0, 0],
      [3, 0],
      [0, 4],
      [2, 2],
      [-1, 3],
    ];
    const n = p.length;
    const d = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) d[i * n + j] = Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]);
    const q = planeLayout(d, n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) expect(Math.hypot(q[2 * i] - q[2 * j], q[2 * i + 1] - q[2 * j + 1])).toBeCloseTo(d[i * n + j], 6);
  });
});
