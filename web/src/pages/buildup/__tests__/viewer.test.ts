/**
 * What the viewer draws, against the tables and the crossing positions:
 * a route drawn down to any level starts and ends at its two crossings, and
 * drawn down to the tiles it has one line per tile; the lines counted per
 * level are the lines drawn; leaving out children outside the view keeps
 * every line that meets it. Passes at every depth join end to end and add
 * up to the route's or circuit's tiles.
 */
import { describe, expect, it } from 'vitest';

import { transPt } from '../../../core';
import { CircuitShapes } from '../../shapes/circuitShapes';
import { Geometry, IDENTITY, circuitPasses, linesPerStop, routePasses, routeSet, subPasses, type Pass } from '../viewer';

const subset = [0, 2, 3, 4, 6, 8];
const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;

describe('the viewer', () => {
  for (const combo of ['140000001', '000100000']) {
    const cs = new CircuitShapes('hex', subset, [...combo].map((c) => parseInt(c, 36)), 5, 1, false);
    const g = new Geometry(cs);

    it(`draws each route between its crossings, one line per tile at the bottom, for ${combo}`, () => {
      for (let n = 1; n <= 5; n++) {
        for (const type of ['Delta', 'Gamma', 'Pi']) {
          const T = cs.levels[n][type];
          const rs = routeSet(cs, n, type);
          const lines = linesPerStop(g, rs);
          for (let s = 0; s < n; s++) {
            let drawn = 0;
            rs.from.forEach((k, i) => {
              const pts = g.arc(n, type, k, IDENTITY, s, null);
              const m = pts.length / 2;
              expect(near({ x: pts[0], y: pts[1] }, T.pts[k])).toBe(true);
              expect(near({ x: pts[2 * m - 2], y: pts[2 * m - 1] }, T.pts[T.mate(k)])).toBe(true);
              if (s === 0) expect(m - 1).toBe(rs.tiles[i]);
              drawn += m - 1;
            });
            expect(drawn, `level ${n} ${type} stop ${s}`).toBe(lines[s]);
          }
        }
      }
    }, 60000);

    it(`keeps every line that meets the view when it leaves children out, for ${combo}`, () => {
      const n = 5;
      const rs = routeSet(cs, n, 'Delta');
      const b = g.box(n, 'Delta');
      const w = b.max.x - b.min.x, h = b.max.y - b.min.y;
      const view = { min: { x: b.min.x + 0.4 * w, y: b.min.y + 0.4 * h }, max: { x: b.min.x + 0.6 * w, y: b.min.y + 0.6 * h } };
      const inside = (x: number, y: number) => x >= view.min.x && x <= view.max.x && y >= view.min.y && y <= view.max.y;
      for (const k of rs.from) {
        const full = g.arc(n, 'Delta', k, IDENTITY, 0, null);
        const cut = g.arc(n, 'Delta', k, IDENTITY, 0, view);
        const keep = (pts: Float64Array) => {
          const out: string[] = [];
          for (let i = 0; i + 3 < pts.length; i += 2) if (inside(pts[i], pts[i + 1]) || inside(pts[i + 2], pts[i + 3])) out.push(pts.slice(i, i + 4).join());
          return out;
        };
        expect(keep(cut)).toEqual(keep(full));
      }
    });

    it(`hands out the same points a chunk at a time, for ${combo}`, () => {
      const n = 5;
      const rs = routeSet(cs, n, 'Delta');
      const b = g.box(n, 'Delta');
      const view = { min: { x: b.min.x, y: b.min.y }, max: { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2 } };
      for (const k of rs.from.slice(-30)) {
        for (const [s, v] of [[0, null], [1, view], [2, null], [0, view]] as const) {
          const src = g.source(n, 'Delta', k, IDENTITY, s, v);
          const got: number[] = [];
          for (let c = src.take(7); c; c = src.take(7)) got.push(...c);
          expect(got).toEqual(Array.from(g.arc(n, 'Delta', k, IDENTITY, s, v)));
        }
      }
    });

    const joined = (ps: readonly Pass[], a: { x: number; y: number }, b: { x: number; y: number }, tiles: number) => {
      expect(near(ps[0].a, a)).toBe(true);
      expect(near(ps[ps.length - 1].b, b)).toBe(true);
      for (let i = 1; i < ps.length; i++) expect(ps[i].a).toBe(ps[i - 1].b);
      // each pass's ends are its own child's crossings, placed by that child's transform
      for (const p of ps) {
        const T = cs.levels[p.level][p.type];
        expect(near(p.a, transPt(p.x, T.pts[p.k]))).toBe(true);
        expect(near(p.b, transPt(p.x, T.pts[T.mate(p.k)]))).toBe(true);
      }
      expect(ps.reduce((s, p) => s + p.tiles, 0)).toBe(tiles);
    };

    it(`breaks routes into passes that join end to end, level by level, for ${combo}`, () => {
      const n = 5;
      const T = cs.levels[n].Delta;
      for (const k of routeSet(cs, n, 'Delta').from.slice(-20)) {
        let ps = routePasses(g, n, 'Delta', k);
        for (let d = n - 1; d >= 0; d--) {
          joined(ps, T.pts[k], T.pts[T.mate(k)], T.len(k));
          expect(ps.every((p) => p.level === d)).toBe(true);
          if (d > 0) ps = ps.flatMap((p) => subPasses(g, p));
        }
      }
    });

    it(`breaks circuits into passes that close up, level by level, for ${combo}`, () => {
      for (const c of cs.born) {
        let ps = circuitPasses(g, c);
        for (let d = c.level - 1; d >= 0; d--) {
          joined(ps, ps[0].a, ps[0].a, c.length);
          if (d > 0) ps = ps.flatMap((p) => subPasses(g, p));
        }
      }
    }, 30000);
  }
});
