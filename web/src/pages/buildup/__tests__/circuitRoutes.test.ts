/**
 * The routes a circuit uses, counted with passes carried, against the
 * circuit's length and against its word (`core/circuitWord.ts`), which
 * lists its tiles one by one.
 */
import { describe, expect, it } from 'vitest';

import { tileLetter } from '../../../core';
import { CircuitShapes } from '../../shapes/circuitShapes';
import { circuitUse } from '../circuitRoutes';

const subset = [0, 2, 3, 4, 6, 8];

describe('the routes a circuit uses', () => {
  for (const combo of ['140000001', '000100000']) {
    it(`passes through as many tiles as the circuit has, tile for tile as its word, for ${combo}`, () => {
      const cs = new CircuitShapes('hex', subset, [...combo].map((c) => parseInt(c, 36)), 6, 1, false);
      expect(cs.born.length).toBeGreaterThan(5);
      for (const c of cs.born) {
        const use = circuitUse(cs, c);
        expect(use.length).toBe(c.level);
        expect(use[c.level - 1].passes).toBe(c.steps.length);
        for (const u of use) {
          let tiles = 0;
          for (const [type, m] of u.byType) for (const [k, passes] of m) tiles += passes * cs.levels[u.level][type].len(k);
          expect(tiles, `level ${u.level} of a ${c.length}-tile circuit`).toBe(c.length);
        }
        expect(use[0].passes).toBe(c.length);
        // a tile's letter is its type's prefix and the two edges; the table counts it by its lower edge
        const fromWord = new Map<string, number>();
        for (const w of cs.word(c)) {
          const [, p, a, b] = /^([A-Za-z]+)(\d)(\d)$/.exec(w)!;
          const key = `${p} ${Math.min(+a, +b)}`;
          fromWord.set(key, (fromWord.get(key) ?? 0) + 1);
        }
        const fromUse = new Map<string, number>();
        for (const [type, m] of use[0].byType) {
          for (const [k, passes] of m) {
            const [, p] = /^([A-Za-z]+)/.exec(tileLetter(type, k, cs.levels[0][type].mate(k)))!;
            fromUse.set(`${p} ${k}`, passes);
          }
        }
        expect(fromUse).toEqual(fromWord);
      }
    }, 60000);
  }
});
