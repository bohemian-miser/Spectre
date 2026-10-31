/**
 * Routes worked out on demand against the full tables: every place of
 * every type at the levels above the base, its mate, its tiles, its
 * position on the outline and the child crossings its route enters.
 */
import { describe, expect, it } from 'vitest';

import { CircuitShapes } from '../../shapes/circuitShapes';
import { SparseRoutes, TYPES } from '../sparseRoutes';

const RULE = [0, 2, 3, 4, 6, 8];
const digits = (combo: string) => [...combo].map((ch) => parseInt(ch, 36));

/** The places of level n where the routes worked out disagree with the full table, at most a few. */
function disagreements(cs: CircuitShapes, R: SparseRoutes, n: number, every = 1): { checked: number; wrong: string[] } {
  const wrong: string[] = [];
  let checked = 0;
  const note = (s: string) => wrong.length < 5 && wrong.push(s);
  for (const [ti, t] of TYPES.entries()) {
    const T = cs.levels[n][t];
    cs.border(n, t).forEach((row, j) => {
      if (R.rowLen(n, ti, j) !== row.length) note(`${t} edge ${j}: ${R.rowLen(n, ti, j)} crossings, not ${row.length}`);
      for (let i = 0; i < row.length; i += every) {
        const a = R.address(n, row[i]);
        if (R.locate(n, ti, a) !== i * 8 + j) note(`${t} place ${row[i]} is not at ${i} on edge ${j}`);
        if (R.rowAt(n, ti, j, i) !== a) note(`${t} edge ${j} at ${i} is not place ${row[i]}`);
      }
    });
    const all = T.crossings();
    for (let q = 0; q < all.length; q += every) {
      const p = all[q];
      const a = R.address(n, p);
      const m = T.mate(p);
      checked++;
      if (R.mate(n, ti, a) !== (m < 0 ? -1 : R.address(n, m))) note(`${t} place ${p}: mate`);
      if (R.len(n, ti, a) !== T.len(p)) note(`${t} place ${p}: ${R.len(n, ti, a)} tiles, not ${T.len(p)}`);
      if (every > 1) continue;
      const got: number[] = [];
      R.enters(n, ti, a, (slot, ct, k) => got.push(slot, ct, k));
      const want = cs.enters(n, t, p).flatMap((e) => [e.slot, TYPES.indexOf(e.type as never), R.address(n - 1, e.k)]);
      if (got.join() !== want.join()) note(`${t} place ${p}: route`);
    }
  }
  return { checked, wrong };
}

describe.each(['140000001', '000100000', '111000001'])('routes of 023468 · %s above the base', (combo) => {
  const cs = new CircuitShapes('hex', RULE, digits(combo), 8, Number.MAX_SAFE_INTEGER);
  const R = new SparseRoutes(cs, 5);

  it.each([6, 7, 8])('level %i: every place of every type', (n) => {
    const { checked, wrong } = disagreements(cs, R, n);
    expect(wrong).toEqual([]);
    expect(checked).toBe(TYPES.reduce((s, t) => s + cs.levels[n][t].crossings().length, 0));
  }, 120000);
});

describe('routes at level 9 of 023468 · 140000001', () => {
  it('every 37th place of every type, from a base at level 7', () => {
    const cs = new CircuitShapes('hex', RULE, digits('140000001'), 9, Number.MAX_SAFE_INTEGER);
    const R = new SparseRoutes(cs, 7);
    const { checked, wrong } = disagreements(cs, R, 9, 37);
    expect(wrong).toEqual([]);
    expect(checked).toBeGreaterThan(100000);
  }, 120000);
});
