import { describe, expect, it } from 'vitest';
import {
  countWithin,
  cubeCoords,
  gf2Rref,
  multiEdgeModel,
  nonCrossingPairings,
  tileEnds,
  traceLoops,
} from '../multiEdge';

const sel = (m: ReturnType<typeof multiEdgeModel>, v: readonly number[]) => m.classes.filter((_, k) => v[k]).join('');

describe('multiEdge', () => {
  it('finds the three hexagon basis selections from the Spectre project, class 0 included', () => {
    const m = multiEdgeModel();
    expect(m.classes).toEqual([0, 1, 2, 3, 4, 5, 6, 8]);
    expect(m.basis.map((b) => sel(m, b))).toEqual(['15', '128', '01346']);
  });

  it('row reduces mod 2 to rank 5, naming the rows behind each reduced row', () => {
    const m = multiEdgeModel();
    const r = gf2Rref(m.counts);
    expect(r.rows).toHaveLength(5);
    expect(r.redundant).toHaveLength(4);
    // Each reduced row really is the XOR of the rows it names.
    r.rows.forEach((row, i) => {
      const xor = m.counts[0].map((_, k) => r.from[i].reduce((a, t) => a ^ (m.counts[t][k] & 1), 0));
      expect(xor).toEqual(row);
    });
  });

  it('counts are valid exactly when their parity is a basis combination', () => {
    const m = multiEdgeModel();
    const x = (o: Record<number, number>) => m.classes.map((c) => o[c] ?? 0);
    expect(tileEnds(m, x({ 8: 2 })).every((e) => e % 2 === 0)).toBe(true);
    expect(cubeCoords(m, x({ 8: 2 }))).toEqual([0, 0, 0]);
    expect(cubeCoords(m, x({ 1: 3, 5: 1 }))).toEqual([1, 0, 0]);
    expect(cubeCoords(m, x({ 8: 1 }))).toBeNull();
  });

  it('counts the valid vectors in a box without listing them', () => {
    const m = multiEdgeModel();
    expect(countWithin(m, 1)).toBe(8);
    expect(countWithin(m, 2)).toBe(405);
    expect(countWithin(m, 3)).toBe(2048);
  });

  it('non-crossing pairings are Catalan', () => {
    expect([0, 2, 4, 6, 8].map((n) => nonCrossingPairings(n).pairings.length)).toEqual([1, 1, 2, 5, 14]);
    expect(nonCrossingPairings(3).pairings).toHaveLength(0);
    expect(nonCrossingPairings(20, 7)).toMatchObject({ truncated: true });
  });

  it('traces undirected loops and open paths', () => {
    const p = (x: number, y: number) => ({ x, y });
    const square = [
      { a: p(0, 0), b: p(1, 0) },
      { a: p(1, 1), b: p(1, 0) }, // either way round
      { a: p(1, 1), b: p(0, 1) },
      { a: p(0, 0), b: p(0, 1) },
    ];
    const path = [{ a: p(6, 0), b: p(7, 0) }, { a: p(5, 0), b: p(6, 0) }];
    const loops = traceLoops([square[2], ...path, square[0], square[3], square[1]]);
    expect(loops.filter((l) => l.closed).map((l) => l.segments.length)).toEqual([4]);
    expect(loops.filter((l) => !l.closed).map((l) => l.segments.length)).toEqual([2]);
  });
});
