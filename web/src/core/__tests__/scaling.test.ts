import { describe, expect, it } from 'vitest';
import { measureScaling, rulePairings, summarizeScaling, type LevelStats } from '..';

const lv = (level: number, tiles: number, longest: number): LevelStats => ({
  level,
  tiles,
  maxCircuit: longest,
  maxTail: 0,
  longest,
  circuitLengths: 1,
  onCircuits: 1,
});

describe('scaling', () => {
  it('reads bounded, steady and bursty growth, and the dimension against the patch growth', () => {
    // Tiles ×9 per level: the patch is 3 times wider each time.
    const bounded = summarizeScaling([lv(2, 10, 5), lv(3, 90, 5), lv(4, 810, 5)]);
    expect(bounded.kind).toBe('bounded');
    expect(bounded.dimension).toBe(0);
    expect(bounded.inflation).toBeCloseTo(3, 9);
    const curve = summarizeScaling([lv(2, 10, 4), lv(3, 90, 12), lv(4, 810, 36)]);
    expect(curve.kind).toBe('steady');
    expect(curve.dimension).toBeCloseTo(1, 9);
    const fill = summarizeScaling([lv(2, 10, 4), lv(3, 90, 36), lv(4, 810, 324)]);
    expect(fill.dimension).toBeCloseTo(2, 9);
    const bursts = summarizeScaling([lv(2, 10, 4), lv(3, 90, 4), lv(4, 810, 36)]);
    expect(bursts.kind).toBe('bursty');
    expect(bursts.dimension).toBeCloseTo(1, 9);
  });

  it('measures real rules: 15 stays bounded, 2578 on 0100101100 grows like area', () => {
    const small = measureScaling('spectre', 'Delta', [2, 3, 4], [1, 5], '0000000000');
    expect(small.kind).toBe('bounded');
    expect(small.levels.map((l) => l.tiles)).toEqual([71, 559, 4401]);
    expect(small.inflation).toBeGreaterThan(2.7);
    expect(small.inflation).toBeLessThan(2.9);
    const big = measureScaling('spectre', 'Delta', [3, 4, 5], [2, 5, 7, 8], '0100101100');
    expect(big.levels.map((l) => l.longest)).toEqual([113, 503, 6632]);
    expect(big.dimension).toBeGreaterThan(1.8);
  }, 30000);

  it('lists every pairing of a small rule, and samples a big one', () => {
    const all = rulePairings('spectre', [2, 5, 7, 8], 200);
    expect(all.total).toBe(64);
    expect(new Set(all.combos).size).toBe(64);
    expect(all.combos).toContain('0100101100');
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const some = rulePairings('spectre', [0, 1, 2, 3, 5, 6, 7, 8], 50, random);
    expect(some.total).toBe(625000);
    expect(new Set(some.combos).size).toBe(50);
  });
});
