/**
 * The exact rasterizer (`raster.ts`) against a brute force written apart
 * (`q3.ts`): every pixel against every segment in BigInt `Q(sqrt 3)`, with
 * the capsule as "near an end or near the line between the ends" rather than
 * the rasterizer's single inequality.
 */
import { describe, expect, it } from 'vitest';
import { COUNT_CAP, coversExact, emptyPicture, newStats, pixelGrid, rasterize, ruleAt, strokeRule, TRAIL_RADIUS, type Picture, type PixelGrid } from '../raster';
import { SQRT3 } from '../store';
import { add, coversBrute, dyadic, latticePt, sign, sub } from './q3';

/** A small seeded generator, so a failure names its case. */
function rng(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 2 ** 32;
  };
}

/** Steps between chord ends of one hexagon: the 18 lattice vectors of lengths sqrt(3)/2, 3/2 and sqrt(3). */
const STEPS: [number, number][] = [];
for (const [i, j] of [[3, 1], [6, 0], [0, 4], [6, 2]] as [number, number][]) {
  for (const [si, sj] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const v: [number, number] = [i * si, j * sj];
    if (!STEPS.some((u) => u[0] === v[0] && u[1] === v[1])) STEPS.push(v);
  }
}

function randomPolyline(rand: () => number, n: number, start: [number, number]): Float64Array {
  const pts = new Float64Array(2 * (n + 1));
  pts[0] = start[0];
  pts[1] = start[1];
  for (let k = 1; k <= n; k++) {
    const [di, dj] = STEPS[Math.floor(rand() * STEPS.length)];
    pts[2 * k] = pts[2 * k - 2] + di;
    pts[2 * k + 1] = pts[2 * k - 1] + dj;
  }
  return pts;
}

/** Whether the midpoint of segment A -> B lies in pixel (m, n) of level s: `n p <= y < (n + 1) p` in BigInt Q(sqrt 3), and the same for x. */
function midpointIn(ai: number, aj: number, bi: number, bj: number, m: number, n: number, s: number): boolean {
  const [ax, ay] = latticePt(ai, aj);
  const [bx, by] = latticePt(bi, bj);
  const half = dyadic(1, -1);
  const x = { a: add(ax, bx).a * half.a, b: 0n, d: add(ax, bx).d * half.d };
  const y = { a: 0n, b: add(ay, by).b * half.a, d: add(ay, by).d * half.d };
  const inside = (v: { a: bigint; b: bigint; d: bigint }, k: number): boolean => sign(sub(v, dyadic(k, s))) >= 0 && sign(sub(dyadic(k + 1, s), v)) > 0;
  return inside(x, m) && inside(y, n);
}

/** Every pixel against every segment: the highest segment whose stroke holds the centre, or under coverage the highest and how many have their midpoint in it. */
function brutePicture(pts: Float64Array, count: number, g: PixelGrid): Picture {
  const out = emptyPicture(g);
  const r = g.rule.radius;
  for (let n = g.n0; n < g.n0 + g.h; n++) {
    for (let m = g.m0; m < g.m0 + g.w; m++) {
      const o = (n - g.n0) * g.w + (m - g.m0);
      for (let k = count - 1; k >= 0; k--) {
        const hit = g.rule.mode === 'coverage'
          ? midpointIn(pts[2 * k], pts[2 * k + 1], pts[2 * k + 2], pts[2 * k + 3], m, n, g.s)
          : coversBrute(pts[2 * k], pts[2 * k + 1], pts[2 * k + 2], pts[2 * k + 3], m, n, g.s, r.num, r.den);
        if (hit) {
          if (out.idx[o] < 0) out.idx[o] = k;
          if (out.cnt) { if (out.cnt[o] < COUNT_CAP) out.cnt[o]++; }
          else break;
        }
      }
    }
  }
  return out;
}

const same = (got: Picture, want: Picture): void => {
  expect(Array.from(got.idx)).toEqual(Array.from(want.idx));
  expect(got.cnt ? Array.from(got.cnt) : null).toEqual(want.cnt ? Array.from(want.cnt) : null);
};

/** A grid of level s around the polyline's first point, w x h pixels. */
function gridAround(pts: Float64Array, s: number, w: number, h: number, rand: () => number): PixelGrid {
  const p = 2 ** s;
  const x = pts[0] / 4;
  const y = (pts[1] * SQRT3) / 4;
  return pixelGrid(s, Math.floor(x / p) - Math.floor(w * rand()), Math.floor(y / p) - Math.floor(h * rand()), w, h, strokeRule(TRAIL_RADIUS));
}

describe('exact trail rasterizer', () => {
  it('matches the brute force pixel for pixel, from far in to far out', () => {
    let pictures = 0;
    let covered = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const rand = rng(seed);
      // Far from the origin too, where doubles round the most.
      const far = seed % 2 === 0 ? 0 : 1;
      const start: [number, number] = [2 * Math.floor(rand() * 4e6 * far) , 0];
      start[1] = 2 * Math.floor(rand() * 2e6 * far);
      const count = 6 + Math.floor(rand() * 20);
      const pts = randomPolyline(rand, count, start);
      const s = -6 + Math.floor(rand() * 9); // 64 pixels a tile edge to 4 tile edges a pixel
      const g = gridAround(pts, s, 28, 28, rand);
      const got = emptyPicture(g);
      rasterize(pts, count, 0, g, got);
      const want = brutePicture(pts, count, g);
      expect(Array.from(got.idx), `seed ${seed}, level ${s}`).toEqual(Array.from(want.idx));
      pictures++;
      covered += want.idx.filter((v) => v >= 0).length;
    }
    expect(pictures).toBe(40);
    expect(covered).toBeGreaterThan(1000);
  }, 60000);

  it('decides boundary pixels exactly when doubles cannot', () => {
    // Pixel centres within a hair of the capsule's edge: the exact test against the brute force.
    const rand = rng(7);
    let checked = 0;
    let near = 0;
    for (let trial = 0; trial < 3000; trial++) {
      const ai = 2 * Math.floor((rand() - 0.5) * 2e6);
      const aj = 2 * Math.floor((rand() - 0.5) * 2e6);
      const [di, dj] = STEPS[Math.floor(rand() * STEPS.length)];
      const s = -6 + Math.floor(rand() * 8);
      const p = 2 ** s;
      const x = ai / 4 + (di / 4) * rand();
      const y = (aj * SQRT3) / 4 + ((dj * SQRT3) / 4) * rand();
      const m = Math.floor(x / p + (rand() - 0.5) * 6);
      const n = Math.floor(y / p + (rand() - 0.5) * 6);
      const want = coversBrute(ai, aj, ai + di, aj + dj, m, n, s, 63, 50);
      expect(coversExact(ai, aj, ai + di, aj + dj, m, n, s, TRAIL_RADIUS)).toBe(want);
      checked++;
      if (want) near++;
    }
    expect(checked).toBe(3000);
    expect(near).toBeGreaterThan(100);
  }, 60000);

  it('falls back to exact arithmetic on ties that doubles cannot see', () => {
    // A segment along x through pixel centres at exactly the radius: with
    // radius 1/2 pixel and a lattice row, centres on rows n and n - 1 are at
    // distance 1/2 when the segment's y is on a pixel edge.
    const stats = newStats();
    // y = 0 (j = 0) is a pixel edge at every level; segment from i = 0 to i = 6 (x 0 .. 1.5).
    const pts = new Float64Array([0, 0, 6, 0]);
    const g = pixelGrid(-2, -4, -4, 16, 8, strokeRule({ num: 1, den: 2 }));
    const got = emptyPicture(g);
    rasterize(pts, 1, 0, g, got, stats);
    const want = brutePicture(pts, 1, g);
    same(got, want);
    expect(stats.exact).toBeGreaterThan(0);
    // The two rows touching y = 0 are both drawn, their centres exactly half a pixel away.
    expect(want.idx.filter((v) => v === 0).length).toBeGreaterThanOrEqual(2 * 6);
  }, 60000);

  it('counts the crossings under coverage, and strokes where the line is a pixel or more', () => {
    const rand = rng(21);
    let coverage = 0;
    let strokes = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const count = 20 + Math.floor(rand() * 40);
      const pts = randomPolyline(rand, count, [2 * Math.floor(rand() * 2000), 2 * Math.floor(rand() * 2000)]);
      // A line 0.2 tile edges wide: a stroke at 8 pixels a tile edge and closer, coverage from there out.
      const s = -4 + Math.floor(rand() * 8);
      const rule = ruleAt(s, 0.2);
      const p = 2 ** s;
      const g = pixelGrid(s, Math.floor(pts[0] / 4 / p) - 12, Math.floor((pts[1] * SQRT3) / 4 / p) - 10, 24, 20, rule);
      const got = emptyPicture(g);
      rasterize(pts, count, 0, g, got);
      same(got, brutePicture(pts, count, g));
      if (rule.mode === 'coverage') {
        coverage++;
        expect(got.cnt).not.toBeNull();
        // Every segment is counted once, in one pixel: never more than the segments, and the window holds some.
        const counted = got.cnt!.reduce((a, b) => a + b, 0);
        expect(counted).toBeGreaterThan(0);
        expect(counted).toBeLessThanOrEqual(count);
        expect(rule.each).toBeCloseTo(0.2 / (p * p), 12);
      } else {
        strokes++;
        expect(got.cnt).toBeNull();
      }
    }
    expect(coverage).toBeGreaterThan(3);
    expect(strokes).toBeGreaterThan(3);
  }, 60000);
});
