/**
 * Nothing the viewer draws leaves its supertile's outline (the polygon
 * through its corners and every border crossing, `ring.ts`): for each type
 * at levels 1 to 5, every point and every straight line of every route,
 * drawn down to each level the viewer can choose (children on the border
 * drawn down to the tiles, as the outline is), and every child route as
 * the viewer bends it in its child.
 */
import { describe, expect, it } from 'vitest';

import { CircuitShapes } from '../../shapes/circuitShapes';
import { Ring, outlinePoints } from '../ring';
import { Geometry, IDENTITY, bentPass, routePasses, routeSet } from '../viewer';

const subset = [0, 2, 3, 4, 6, 8];

describe('an outline', () => {
  it('tells lines and points inside a U from those across its notch', () => {
    const u = new Ring([[0, 0], [3, 0], [3, 3], [2, 3], [2, 1], [1, 1], [1, 3], [0, 3]].map(([x, y]) => ({ x, y })));
    expect(u.holds(0.5, 0.5, 2.5, 0.5)).toBe(true);
    expect(u.holds(0.5, 2.5, 2.5, 2.5)).toBe(false);
    expect(u.holds(0, 0, 3, 0)).toBe(true);
    expect(u.holds(1, 3, 2, 3)).toBe(false);
    expect(u.inside(1.5, 2)).toBe(false);
    expect(u.inside(1.5, 0.5)).toBe(true);
    expect(u.inside(1, 2)).toBe(true);
  });
});

describe('the drawing keeps inside the outline', () => {
  for (const combo of ['140000001', '000100000']) {
    const cs = new CircuitShapes('hex', subset, [...combo].map((c) => parseInt(c, 36)), 5, 1, false);
    const g = new Geometry(cs);

    it(`every route, at every level of detail, for ${combo}`, () => {
      let points = 0;
      for (let n = 1; n <= 5; n++) {
        for (const type of Object.keys(cs.levels[n])) {
          const ring = new Ring(outlinePoints(cs, n, type));
          const tol = 1e4 * ring.eps;
          for (const k of routeSet(cs, n, type).from) {
            for (let s = 0; s < n; s++) {
              const pts = g.arc(n, type, k, IDENTITY, s, null, 0);
              let before = 0;
              for (let i = 0; i < pts.length; i += 2) {
                if (!ring.inside(pts[i], pts[i + 1], tol)) expect.fail(`${type} ${n} route ${k} stop ${s}: point ${i / 2} outside`);
                // a line shorter than its start's distance from the outline stays in the disc round its start, inside
                const len = i > 0 ? Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]) : 0;
                if (i > 0 && len >= before && !ring.holds(pts[i - 2], pts[i - 1], pts[i], pts[i + 1], tol)) expect.fail(`${type} ${n} route ${k} stop ${s}: line ${i / 2} leaves`);
                before = ring.distance(pts[i], pts[i + 1]);
              }
              points += pts.length / 2;
            }
          }
        }
      }
      expect(points).toBeGreaterThan(10000);
    }, 120000);

    it(`every child route, bent where a straight line would leave its child, for ${combo}`, () => {
      for (let n = 2; n <= 5; n++) {
        for (const type of Object.keys(cs.levels[n])) {
          for (const k of routeSet(cs, n, type).from) {
            for (const p of routePasses(g, n, type, k)) {
              const ring = new Ring(outlinePoints(cs, p.level, p.type).map((q) => ({ x: p.x[0] * q.x + p.x[1] * q.y + p.x[2], y: p.x[3] * q.x + p.x[4] * q.y + p.x[5] })));
              const tol = 1e4 * ring.eps;
              const pts = bentPass(g, p);
              expect(pts[0]).toBe(p.a.x);
              expect(pts[pts.length - 1]).toBe(p.b.y);
              for (let i = 2; i < pts.length; i += 2) expect(ring.holds(pts[i - 2], pts[i - 1], pts[i], pts[i + 1], tol), `${p.type} at level ${p.level}`).toBe(true);
            }
          }
        }
      }
    }, 120000);
  }
});
