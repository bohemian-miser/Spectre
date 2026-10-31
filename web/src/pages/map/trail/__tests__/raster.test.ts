/**
 * The exact rasterizer (`raster.ts`) against a brute force written apart
 * (`q3.ts`): every pixel against every segment in BigInt `Q(sqrt 3)`, with
 * the capsule as "near an end or near the line between the ends" rather than
 * the rasterizer's single inequality.
 */
import { describe, expect, it } from 'vitest';
import { coversExact, emptyPicture, newStats, rasterize, TRAIL_RADIUS, type PixelGrid } from '../raster';
import { SQRT3 } from '../store';
import { coversBrute } from './q3';

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

function brutePicture(pts: Float64Array, count: number, g: PixelGrid): Float64Array {
  const out = emptyPicture(g);
  for (let n = g.n0; n < g.n0 + g.h; n++) {
    for (let m = g.m0; m < g.m0 + g.w; m++) {
      for (let k = count - 1; k >= 0; k--) {
        if (coversBrute(pts[2 * k], pts[2 * k + 1], pts[2 * k + 2], pts[2 * k + 3], m, n, g.s, TRAIL_RADIUS.num, TRAIL_RADIUS.den)) {
          out[(n - g.n0) * g.w + (m - g.m0)] = k;
          break;
        }
      }
    }
  }
  return out;
}

/** A grid of level s around the polyline's first point, w x h pixels. */
function gridAround(pts: Float64Array, s: number, w: number, h: number, rand: () => number): PixelGrid {
  const p = 2 ** s;
  const x = pts[0] / 4;
  const y = (pts[1] * SQRT3) / 4;
  return { s, m0: Math.floor(x / p) - Math.floor(w * rand()), n0: Math.floor(y / p) - Math.floor(h * rand()), w, h };
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
      expect(Array.from(got), `seed ${seed}, level ${s}`).toEqual(Array.from(want));
      pictures++;
      covered += want.filter((v) => v >= 0).length;
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
    const g: PixelGrid = { s: -2, m0: -4, n0: -4, w: 16, h: 8 };
    const got = emptyPicture(g);
    rasterize(pts, 1, 0, g, got, { num: 1, den: 2 }, stats);
    const want = emptyPicture(g);
    for (let n = g.n0; n < g.n0 + g.h; n++)
      for (let m = g.m0; m < g.m0 + g.w; m++)
        if (coversBrute(0, 0, 6, 0, m, n, g.s, 1, 2)) want[(n - g.n0) * g.w + (m - g.m0)] = 0;
    expect(Array.from(got)).toEqual(Array.from(want));
    expect(stats.exact).toBeGreaterThan(0);
    // The two rows touching y = 0 are both drawn, their centres exactly half a pixel away.
    expect(want.filter((v) => v === 0).length).toBeGreaterThanOrEqual(2 * 6);
  }, 60000);
});
