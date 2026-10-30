import { describe, expect, it } from 'vitest';
import { alignReadings, sameCyclic, tokenType } from '../readings';

describe('lining two readings up', () => {
  it('finds a rotated, reversed copy and matches every token', () => {
    const a = ['D<1', 'G<7', 'S<4', 'Ph<6', 'Pi<5', 'X<5'];
    const b = ['Pi<5', 'Ph<6', 'S<4', 'G<7', 'D<1', 'X<5'];
    expect(sameCyclic(a, b)).toBe(true);
    const al = alignReadings(a, b)!;
    expect(al.matchedA.every(Boolean)).toBe(true);
    expect(al.matchedB.every(Boolean)).toBe(true);
    expect(al.tokensB).toEqual(a);
  });

  it('marks the tokens one reading has and the other lacks, on both sides', () => {
    const a = ['D<1', 'G<7', 'S<4', 'Ph<6', 'Pi<5', 'X<5'];
    const b = ['D<1', 'G<7', 'T<3', 'S<4', 'Pi<5', 'X<5'];
    const al = alignReadings(a, b)!;
    expect(al.matchedA).toEqual([true, true, true, false, true, true]);
    expect(al.matchedB).toEqual([true, true, false, true, true, true]);
  });

  it('gives up on readings past the size cap', () => {
    expect(alignReadings(['a'], ['a'], 0)).toBeNull();
  });

  it('names a token type, or null where the token leaves it out', () => {
    expect(tokenType('Ph<6D')).toBe('Phi');
    expect(tokenType('Ps<0')).toBe('Psi');
    expect(tokenType('<4')).toBeNull();
  });
});
