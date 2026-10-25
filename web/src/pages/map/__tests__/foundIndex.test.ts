import { describe, expect, it } from 'vitest';
import { FoundIndex } from '../foundIndex';

describe('FoundIndex', () => {
  it('finds a found circuit by any of its chord midpoints, a hair off', () => {
    const index = new FoundIndex<string>();
    index.add('a', [0.5, 0.5, 1.5, 0.5, 3.2, -7.9]);
    index.add('b', [10, 10]);
    expect(index.circuits).toBe(2);
    expect(index.sizes).toEqual([3, 1]);
    expect(index.find(1.5 + 3e-5, 0.5 - 3e-5)).toBe(0);
    expect(index.find(3.2, -7.9)).toBe(0);
    expect(index.find(10, 10)).toBe(1);
    // Nothing found there, or not near enough.
    expect(index.find(5, 5)).toBe(-1);
    expect(index.find(0.5, 0.53)).toBe(-1);
  });

  it('matches across a grid line, where the two sightings round differently', () => {
    const index = new FoundIndex<number>();
    index.add(7, [2 - 1e-6, -3 + 1e-6]);
    expect(index.find(2 + 1e-6, -3 - 1e-6)).toBe(0);
  });

  it('is empty until something is added', () => {
    expect(new FoundIndex<number>().find(0, 0)).toBe(-1);
  });
});
