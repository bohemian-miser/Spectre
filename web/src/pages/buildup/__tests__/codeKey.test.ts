/**
 * Circuits keyed by their words as numbers (`codeKey`) against their keys
 * as letters (`circuitKey` in `core/circuitWord.ts`): the same circuits
 * share a key either way.
 */
import { describe, expect, it } from 'vitest';

import { circuitKey, leafOrder, tileLetter, type HexType } from '../../../core';
import { CircuitShapes } from '../../shapes/circuitShapes';
import { codeKey } from '../buildup';

const subset = [0, 2, 3, 4, 6, 8];

describe('circuit keys from words as numbers', () => {
  for (const combo of ['111000001', '140000001']) {
    it(`group the born circuits as their letter keys do, for ${combo}`, () => {
      const cs = new CircuitShapes('hex', subset, [...combo].map((c) => parseInt(c, 36)), 6, 1, false);
      const types = leafOrder('hex');
      const byCode = new Map<string, string>();
      const byLetters = new Map<string, string>();
      for (const c of cs.born) {
        const codes = cs.wordCodes(c);
        // the codes read back as the word's letters
        expect(Array.from(codes, (x) => tileLetter(types[x >> 6] as HexType, (x >> 3) & 7, x & 7))).toEqual(cs.word(c));
        const a = codeKey(codes), b = circuitKey(cs.word(c));
        if (byCode.has(a)) expect(byCode.get(a)).toBe(b);
        else byCode.set(a, b);
        if (byLetters.has(b)) expect(byLetters.get(b)).toBe(a);
        else byLetters.set(b, a);
      }
      expect(byCode.size).toBeGreaterThan(5);
    }, 60000);
  }
});
