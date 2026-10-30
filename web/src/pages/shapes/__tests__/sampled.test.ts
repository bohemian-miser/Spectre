/**
 * `sampled` against `shape(c, 0)`, the circuit drawn tile by tile: for every
 * circuit born up to level 6 of a combination, the sampled points are the
 * tile-by-tile drawing's points at tiles round(j L / n), and a budget at
 * least the circuit's length gives back the whole drawing.
 */
import { describe, expect, it } from 'vitest';

import { CircuitShapes } from '../circuitShapes';

describe('sampled', () => {
  const cs = new CircuitShapes('hex', [0, 2, 3, 4, 6, 8], [...'140000001'].map((c) => parseInt(c, 36)), 6, 1, true);

  it('takes the tile-by-tile drawing at evenly spaced tiles', () => {
    expect(cs.born.some((c) => c.length > 1000)).toBe(true);
    for (const c of cs.born) {
      const all = cs.shape(c, 0);
      expect(all.length).toBe(c.length);
      for (const samples of [1, 7, 100]) {
        const n = Math.min(c.length, samples);
        expect(cs.sampled(c, samples)).toEqual(Array.from({ length: n }, (_, j) => all[Math.round((j * c.length) / n)]));
      }
      expect(cs.sampled(c, c.length + 5)).toEqual(all);
    }
  });
});
