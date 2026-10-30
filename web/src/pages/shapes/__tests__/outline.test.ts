/**
 * `outline` against the supertile's border found by cancelling the edges its
 * tiles share (`map/glyphs.ts`): every corner is a vertex of that border,
 * every crossing the midpoint of one of its edges, and the outline runs once
 * round it in order.
 */
import { describe, expect, it } from 'vitest';

import { buildSystem, type TileNode } from '../../../core';
import { boundaryLoop } from '../../map/glyphs';
import { CircuitShapes } from '../circuitShapes';

const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;

describe.each(['140000001', '000100000'])('outline of 023468 / %s', (combo) => {
  const cs = new CircuitShapes('hex', [0, 2, 3, 4, 6, 8], [...combo].map((c) => parseInt(c, 36)), 5, 1, true);

  it('runs once round each supertile through its corners and border crossings', () => {
    for (let n = 0; n <= 5; n++) {
      for (const type of Object.keys(cs.levels[n])) {
        const loop = boundaryLoop(buildSystem('hex', n)[type] as TileNode, 'hex');
        const L = loop.length;
        const at = cs.outline(n, type).map((p) => {
          const v = loop.findIndex((q) => near(p, q));
          if (v >= 0) return v;
          const s = loop.findIndex((q, i) => near(p, { x: (q.x + loop[(i + 1) % L].x) / 2, y: (q.y + loop[(i + 1) % L].y) / 2 }));
          expect(s, `level ${n} ${type}: a point off the border`).toBeGreaterThanOrEqual(0);
          return s + 0.5;
        });
        for (let j = 0; j < 6; j++) expect(Number.isInteger(at[cs.outline(n, type).indexOf(cs.corner(n, type, j))])).toBe(true);
        const steps = at.map((p, i) => (((at[(i + 1) % at.length] - p) % L) + L) % L);
        const forward = steps.reduce((a, b) => a + b, 0);
        const backward = steps.reduce((a, b) => a + (b === 0 ? 0 : L - b), 0);
        expect(Math.min(forward, backward), `level ${n} ${type}`).toBe(L);
      }
    }
  });
});
