/**
 * The world every depth is drawn in. The claim the page rests on: one fixed
 * similarity between levels puts every tile's cluster within a bounded
 * distance of where the tile was, at every depth. Checked here against the
 * substitution at levels the fit did not use.
 */
import { describe, expect, it } from 'vitest';
import { substituteBoard, startBoard, type TopDownFamily } from '../../../core';
import { applySimilarity } from '../animate';
import { clipToRect, clusterOutline, levelMap, place, tileCentre } from '../world';

const LAMBDA = Math.sqrt(4 + Math.sqrt(15));

for (const family of ['hex', 'spectre'] as TopDownFamily[]) {
  describe(`${family}: the map between levels`, () => {
    it('scales by sqrt(4 + sqrt(15)) and mirrors', () => {
      const lm = levelMap(family);
      expect(Math.abs(lm.scale - LAMBDA)).toBeLessThan(1e-12);
      expect(lm.mirror).toBe(true);
    });

    it('leaves every cluster within the fitted bound at levels 0 to 4, from four types', () => {
      const lm = levelMap(family);
      for (const type of ['Delta', 'Gamma', 'Psi', 'Sigma'] as const) {
        let board = startBoard(type);
        for (let level = 0; level <= 4; level++) {
          for (const t of board) {
            const kids = substituteBoard([t], undefined, family);
            const cx = kids.reduce((s, k) => s + tileCentre(family, k).x, 0) / kids.length;
            const cy = kids.reduce((s, k) => s + tileCentre(family, k).y, 0) / kids.length;
            const p = applySimilarity(lm.similarity, tileCentre(family, t));
            expect(Math.hypot(p.x - cx, p.y - cy)).toBeLessThan(lm.maxOffset * 1.25);
          }
          board = substituteBoard(board, undefined, family);
        }
      }
    });

    it('leaves every cluster of the level-5 Delta supertile, which the fit did not use, within the bound', () => {
      const lm = levelMap(family);
      let board = startBoard('Delta');
      for (let level = 0; level < 5; level++) board = substituteBoard(board, undefined, family);
      let max = 0;
      for (const t of board) {
        const kids = substituteBoard([t], undefined, family);
        const cx = kids.reduce((s, k) => s + tileCentre(family, k).x, 0) / kids.length;
        const cy = kids.reduce((s, k) => s + tileCentre(family, k).y, 0) / kids.length;
        const p = applySimilarity(lm.similarity, tileCentre(family, t));
        max = Math.max(max, Math.hypot(p.x - cx, p.y - cy));
      }
      expect(max).toBeLessThan(lm.maxOffset * 1.25);
    }, 60000);

    it('places a depth one deeper smaller', () => {
      const [tile] = startBoard('Delta');
      const [kid] = substituteBoard([tile], undefined, family);
      const id = [1, 0, 0, 0, 1, 0] as const;
      const a = place(family, tile, id);
      const b = place(family, kid, [1 / LAMBDA, 0, 0, 0, 1 / LAMBDA, 0]);
      const span = (p: typeof a): number => Math.hypot(p.max.x - p.min.x, p.max.y - p.min.y);
      expect(span(a) / span(b)).toBeGreaterThan(LAMBDA * 0.6);
    });

    it('outlines a cluster with a closed boundary', () => {
      const kids = substituteBoard(startBoard('Delta'), undefined, family);
      const ends = new Map<string, number>();
      for (const [a, b] of clusterOutline(family, kids, [1, 0, 0, 0, 1, 0])) {
        for (const p of [a, b]) {
          const k = `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
          ends.set(k, (ends.get(k) ?? 0) + 1);
        }
      }
      expect(ends.size).toBeGreaterThan(6);
      for (const n of ends.values()) expect(n % 2).toBe(0);
    });
  });
}

describe('clipToRect', () => {
  it('cuts a polygon to the rectangle', () => {
    const tri = [
      { x: -10, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ];
    const out = clipToRect(tri, { x: -1, y: -1 }, { x: 1, y: 1 });
    for (const p of out) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1 + 1e-12);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1 + 1e-12);
    }
    expect(out.length).toBeGreaterThanOrEqual(4);
  });
});
