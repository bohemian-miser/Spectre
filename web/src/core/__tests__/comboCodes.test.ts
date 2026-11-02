import { describe, expect, it } from 'vitest';
import { comboToMatchingIndices, matchingIndicesToCombo, type TileFamilyId } from '..';
import pinned from './fixtures/combo-codes.json';

/**
 * What every code meant when the fixture was written
 * (`fixtures/make-combo-codes.ts`): a codec that changes is held to it.
 */
describe('combination codes, pinned', () => {
  const table = pinned as Record<string, Record<string, Record<string, number[]>>>;
  for (const [family, rules] of Object.entries(table)) {
    for (const [rule, codes] of Object.entries(rules)) {
      it(`${family} ${rule || '∅'}: ${Object.keys(codes).length} codes read and written as pinned`, () => {
        const subset = [...rule].map(Number);
        for (const [code, matching] of Object.entries(codes)) {
          expect(comboToMatchingIndices(family as TileFamilyId, subset, code)).toEqual(matching);
          expect(matchingIndicesToCombo(family as TileFamilyId, subset, matching)).toBe(code);
        }
      });
    }
  }
});
