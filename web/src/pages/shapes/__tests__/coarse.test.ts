/**
 * `coarse` against `shape(c, 0)`, the circuit drawn tile by tile: for every
 * circuit born up to level 6 of a combination, the runs cover its tiles in
 * order from the first, each point is the mean of its run's chord midpoints,
 * each run stays within the share of the circuit's radius of gyration, and a
 * share of 0 gives every tile's midpoint.
 */
import { describe, expect, it } from 'vitest';

import { CircuitShapes } from '../circuitShapes';

describe('coarse', () => {
  const cs = new CircuitShapes('hex', [0, 2, 3, 4, 6, 8], [...'140000001'].map((c) => parseInt(c, 36)), 6, 1, true);

  it('cuts the tile-by-tile drawing into runs within the share, each at its mean', () => {
    expect(cs.born.some((c) => c.length > 1000)).toBe(true);
    for (const c of cs.born) {
      const ends = cs.shape(c, 0);
      const mid = ends.map((p, i) => {
        const q = ends[(i + 1) % ends.length];
        return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      });
      const cx = mid.reduce((s, p) => s + p.x, 0) / mid.length, cy = mid.reduce((s, p) => s + p.y, 0) / mid.length;
      const rg = Math.sqrt(mid.reduce((s, p) => s + (p.x - cx) ** 2 + (p.y - cy) ** 2, 0) / mid.length);
      const near = 1e-9 * (Math.abs(cx) + Math.abs(cy) + rg);

      for (const share of [1 / 50, 1 / 10, 1 / 3]) {
        const { pts, tiles } = cs.coarse(c, share);
        expect(pts.length).toBe(tiles.length);
        expect(tiles.reduce((s, n) => s + n, 0)).toBe(c.length);
        let from = 0;
        tiles.forEach((n, j) => {
          const run = mid.slice(from, from + n);
          from += n;
          const mx = run.reduce((s, p) => s + p.x, 0) / n, my = run.reduce((s, p) => s + p.y, 0) / n;
          expect(Math.abs(pts[j].x - mx)).toBeLessThan(near);
          expect(Math.abs(pts[j].y - my)).toBeLessThan(near);
          const r = Math.sqrt(run.reduce((s, p) => s + (p.x - mx) ** 2 + (p.y - my) ** 2, 0) / n);
          expect(r).toBeLessThanOrEqual(share * rg + near);
        });
      }

      const each = cs.coarse(c, 0);
      expect(each.tiles.every((n) => n === 1)).toBe(true);
      each.pts.forEach((p, j) => {
        expect(Math.abs(p.x - mid[j].x)).toBeLessThan(near);
        expect(Math.abs(p.y - mid[j].y)).toBeLessThan(near);
      });
    }
  });
});
