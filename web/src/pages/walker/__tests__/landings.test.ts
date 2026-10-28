/**
 * The landings of an edge against geometry: in a level-4 Delta laid out by
 * the substitution's placements, the tile actually across each edge (the one
 * sharing that edge's midpoint) and the edge it shares are among the landings
 * listed for that tile type and edge. A stack still on the outline at level
 * 4 lands across the seam on the tile `neighbour()` finds once some parents
 * close that seam.
 */
import { describe, expect, it } from 'vitest';

import { HEX_TYPES, across, edgeClass, meetingOf, neighbour, slotsOfType, transPt, type TileTypeId } from '../../../core';
import { HEX_OUTLINE, placeWorld } from '../../../lib/hexBoard';
import { classLabel, landings } from '../landings';

describe('landings', () => {
  it('contain every crossing found by geometry in a level-4 Delta', () => {
    const tiles = [...placeWorld({ root: 'Delta', level: 4, startId: '0.0.0.0' }).values()];
    const key = (p: { x: number; y: number }): string => `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)}`;
    const mid = (t: (typeof tiles)[number], e: number) => {
      const a = transPt(t.xform, HEX_OUTLINE[e]);
      const b = transPt(t.xform, HEX_OUTLINE[(e + 1) % 6]);
      return key({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    };
    const at = new Map<string, { type: string; edge: number }[]>();
    for (const t of tiles) for (let e = 0; e < 6; e++) (at.get(mid(t, e)) ?? at.set(mid(t, e), []).get(mid(t, e))!).push({ type: t.type, edge: e });
    let checked = 0;
    for (const t of tiles) {
      for (let e = 0; e < 6; e++) {
        const here = at.get(mid(t, e))!;
        if (here.length < 2) continue; // on the outline of the level-4 Delta
        const across = here[0].type === t.type && here[0].edge === e ? here[1] : here[0];
        const found = landings(t.type, e, 4).landings.some((l) => l.type === across.type && l.edge === across.edge);
        expect(found, `${t.type} edge ${e} -> ${across.type} edge ${across.edge}`).toBe(true);
        // matching classes: +c meets -c
        expect(edgeClass(t.type, e) + edgeClass(across.type as never, across.edge)).toBe(0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10000);
  });

  it('land the stacks still on the outline across the seam, on the tile neighbour() finds once the seam is closed', () => {
    let checked = 0;
    for (const t of HEX_TYPES) for (const seam of slotsOfType('hex', t as TileTypeId, [0, 2, 3, 4, 6, 8])) {
      const l = landings(t, seam.edge, 4);
      expect(l.acrossSeam.reduce((n, x) => n + x.stacks.length, 0) + l.unforced.reduce((n, x) => n + x.stacks.length, 0)).toBe(l.outside.length);
      for (const x of l.acrossSeam) for (const stack of x.stacks) {
        for (const o of across({ leaf: t, path: stack }, seam.edge)) {
          const nb = neighbour({ leaf: t, path: [...stack, ...meetingOf(o.pair)!.links] }, seam.edge);
          expect(nb.ok && nb.address.leaf === x.type && nb.edge === x.edge).toBe(true);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('writes class labels signed', () => {
    expect(classLabel('Delta', 1)).toBe('+2A');
    expect(classLabel('Delta', 4)).toBe('−3A');
  });
});
