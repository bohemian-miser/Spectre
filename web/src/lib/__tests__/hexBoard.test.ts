/**
 * The board's strand pieces start and end on the right edges: the connection
 * point found for an edge lies on that edge of the hexagon outline, for every
 * type and every rule.
 */
import { describe, expect, it } from 'vitest';

import { HEX_TYPES, slotsOfType, validEdgeSubsets, type TileTypeId } from '../../core';
import { HEX_OUTLINE, pointOnEdge } from '../hexBoard';

describe('pointOnEdge', () => {
  it('puts each connection point on its own edge', () => {
    for (const rule of validEdgeSubsets('hex')) {
      for (const t of HEX_TYPES) {
        for (const seam of slotsOfType('hex', t as TileTypeId, rule.edges)) {
          const p = pointOnEdge(t, rule.edges, seam.edge)!;
          const a = HEX_OUTLINE[seam.edge];
          const b = HEX_OUTLINE[(seam.edge + 1) % 6];
          // collinear with the edge and between its ends
          const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
          const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
          expect(Math.abs(cross)).toBeLessThan(1e-9);
          expect(dot).toBeGreaterThan(0);
          expect(dot).toBeLessThan((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
        }
      }
    }
  });
});
