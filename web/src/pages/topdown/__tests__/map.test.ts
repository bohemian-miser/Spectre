import { describe, expect, it } from 'vitest';
import { zAffineKey } from '../../../core';
import { MAX_DEPTH, MAX_MAP_TILES, prune, startMap, substitute, undo, type TopDownMap } from '../map';
import { levelMap } from '../world';

const ok = (r: ReturnType<typeof substitute>): TopDownMap => {
  if (!r.ok) throw new Error(r.reason);
  return r.map;
};
const exact = (m: TopDownMap): Map<string, string> =>
  new Map([...m.tiles].map(([id, p]) => [id, `${p.tile.type}@${zAffineKey(p.tile.z)}`]));

for (const family of ['hex', 'spectre'] as const) {
  describe(`${family}: the map`, () => {
    it('substituting one tile replaces it by its cluster and leaves the rest alone', () => {
      const m0 = startMap(family, 'Delta', 2);
      const id = [...m0.tiles.keys()][5];
      const r = substitute(m0, [id]);
      const m1 = ok(r);
      expect(m1.tiles.has(id)).toBe(false);
      const kids = [...m1.tiles.keys()].filter((k) => k.startsWith(`${id}.`));
      expect(kids.length).toBe(m0.tiles.get(id)!.tile.type === 'Gamma' ? 7 : 8);
      for (const [k, p] of m0.tiles) if (k !== id) expect(m1.tiles.get(k)).toBe(p);
      expect(m1.outlines.has(id)).toBe(true);
    });

    it('substituting every tile, twice, gives the supertile two levels deeper exactly', () => {
      let m = startMap(family, 'Psi', 1);
      m = ok(substitute(m, [...m.tiles.keys()]));
      m = ok(substitute(m, [...m.tiles.keys()]));
      expect(exact(m)).toEqual(exact(startMap(family, 'Psi', 3)));
    });

    it('undo collapses the last clusters back', () => {
      const m0 = startMap(family, 'Sigma', 2);
      const ids = [...m0.tiles.keys()].slice(0, 9);
      const m2 = undo(ok(substitute(m0, ids)));
      expect(exact(m2)).toEqual(exact(m0));
      expect(m2.history.length).toBe(0);
    });

    it('goes deep in one place while the rest stays', () => {
      let m = startMap(family, 'Delta', 1);
      let id = [...m.tiles.keys()][0];
      for (let i = 0; i < 12; i++) {
        m = ok(substitute(m, [id]));
        id = [...m.tiles.keys()].filter((k) => k.startsWith(`${id}.`))[0];
      }
      expect(Math.max(...[...m.tiles.values()].map((p) => p.depth))).toBe(13);
      expect([...m.tiles.values()].filter((p) => p.depth === 1).length).toBe(7);
    });

    it('twenty levels down, a cluster substituted after its depth is set still slides at most the bound', () => {
      const lm = levelMap(family);
      let m = startMap(family, 'Delta', 2);
      let id = [...m.tiles.keys()][17];
      for (let i = 0; i < 20; i++) {
        // from the second step on, this tile's depth below was framed by its siblings
        const first = substitute(m, [id]);
        if (!first.ok) throw new Error(first.reason);
        m = first.map;
        if (i > 0) {
          const unit = Math.pow(lm.scale, -(first.batch.parents[0].depth + 1 - m.start));
          const off = first.batch.plan[0].offset;
          expect(Math.hypot(off.x, off.y) / unit).toBeLessThan(2.5 * lm.maxOffset);
        }
        const kids = [...m.tiles.keys()].filter((k) => k.startsWith(`${id}.`));
        // its siblings' clusters set the frame one depth further
        const r = substitute(m, kids.slice(1));
        if (!r.ok) throw new Error(r.reason);
        m = r.map;
        const depth = r.batch.parents[0].depth;
        const unit = Math.pow(lm.scale, -(depth + 1 - m.start));
        for (const plan of r.batch.plan) {
          expect(Math.hypot(plan.offset.x, plan.offset.y) / unit).toBeLessThan(2.5 * lm.maxOffset);
        }
        // keep the map small: only the first tile goes on
        id = kids[0];
        m = prune(m, (p) => p.tile.id === id);
      }
      expect(m.tiles.get(id)!.depth).toBe(22);
    });

    it('prune keeps outlines only round whole clusters', () => {
      const m0 = startMap(family, 'Delta', 0);
      const m1 = ok(substitute(m0, ['']));
      const kept = [...m1.tiles.keys()].slice(0, 3);
      const m2 = prune(m1, (p) => kept.includes(p.tile.id));
      expect(m2.tiles.size).toBe(3);
      expect(m2.outlines.size).toBe(0);
      expect(prune(m1, () => true).outlines.size).toBe(1);
    });
  });
}

describe('refusals', () => {
  it('past the tile limit', () => {
    let m = startMap('hex', 'Delta', 3);
    while (m.tiles.size * 8 <= MAX_MAP_TILES) m = ok(substitute(m, [...m.tiles.keys()]));
    const r = substitute(m, [...m.tiles.keys()]);
    expect(r.ok).toBe(false);
  });

  it('past the deepest depth', () => {
    let m = startMap('hex', 'Delta', 0);
    let id = '';
    for (let i = 0; i < MAX_DEPTH; i++) {
      m = ok(substitute(m, [id]));
      id = id === '' ? '0' : `${id}.0`;
      m = prune(m, (p) => p.tile.id === id);
    }
    expect(substitute(m, [id]).ok).toBe(false);
  });
});
