/**
 * The supertiles built up by border place, with each level's table shared
 * between the types, against the renormalisation that glues children by
 * position (`circuit-classes/renormalize.ts`): every type's crossings, where
 * each leads and through how many tiles, and the circuits closing at each
 * level.
 */
import { describe, expect, it } from 'vitest';

import { renormalize } from '../../../../circuit-classes/renormalize';
import { CircuitShapes } from '../circuitShapes';

const CASES: [number[], string][] = [
  [[0, 2, 3, 4, 6, 8], '140000001'],
  [[0, 2, 3, 4, 6, 8], '000100000'],
  [[0, 1], '000000000'],
  [[0, 1, 2, 3, 4, 5, 6, 7, 8], '111000100'],
];
const LEVEL = 5;

const at = (p: { x: number; y: number }) => `${Math.round(p.x * 64)},${Math.round(p.y * 64)}`;

describe('built up by border place', () => {
  for (const [subset, combo] of CASES) {
    it(`matches the renormalisation by position for ${subset.join('')} ${combo}`, () => {
      const digits = [...combo].map((c) => parseInt(c, 36));
      const cs = new CircuitShapes('hex', subset, digits, LEVEL, 1, false);
      const ref = renormalize('hex', subset, digits, LEVEL);
      for (let n = 0; n <= LEVEL; n++) {
        for (const [t, b] of Object.entries(ref.levels[n])) {
          const T = cs.levels[n][t];
          const ours = Array.from(T.crossings(), (k) => `${at(T.pts[k])} ${T.mate(k) < 0 ? '-' : at(T.pts[T.mate(k)])} ${T.len(k)}`).sort();
          const theirs = b.pts.map((p, k) => `${at(p)} ${b.mate[k] < 0 ? '-' : at(b.pts[b.mate[k]])} ${b.arcLen[k]}`).sort();
          expect(ours, `${t} at level ${n}`).toEqual(theirs);
        }
      }
      const born = (cs.born.map((c) => `${c.level} ${c.type} ${c.length} ${[...c.slots].sort().join('')}`)).sort();
      expect(born).toEqual(ref.births.map((c) => `${c.level} ${c.type} ${c.length} ${[...c.slots].sort().join('')}`).sort());
    });
  }

  it('keeps few entries of its own per type', () => {
    const cs = new CircuitShapes('hex', [0, 2, 3, 4, 6, 8], [...'140000001'].map((c) => parseInt(c, 36)), 6, 1, true);
    const tables = Object.values(cs.levels[6]);
    const entries = tables.reduce((a, T) => a + T.crossings().length, 0);
    const own = tables.reduce((a, T) => a + T.overrides, 0);
    expect(own * 100).toBeLessThan(entries);
  });
});
