import { describe, expect, it } from 'vitest';
import { FAMILIES, connectionCount, leafOrder, validEdgeSubsets, type EdgeContracts } from '../../core';
import { basisCoords, oddLeaves, parityBasis, xorGroup } from '../parityBasis';

const tailFree = (family: (typeof FAMILIES)[number], subset: readonly number[], contracts?: EdgeContracts) =>
  leafOrder(family).every((t) => connectionCount(family, t, new Set(subset), contracts) % 2 === 0);

describe('parityBasis', () => {
  it('spans exactly the valid subsets when every class carries one strand', () => {
    for (const family of FAMILIES) {
      const pb = parityBasis(family);
      expect(pb.count).toBe(validEdgeSubsets(family).length);
      expect(2 ** pb.basis.length).toBe(pb.count);
      for (const g of pb.basis) expect(tailFree(family, g)).toBe(true);
    }
  });

  it('picks the lightest basis: no group can be swapped for a smaller tail-free rule', () => {
    const pb = parityBasis('spectre');
    const lightest = validEdgeSubsets('spectre')
      .filter((v) => v.edges.length > 0)
      .map((v) => v.edges.length)
      .sort((a, b) => a - b);
    const weights = pb.basis.map((g) => g.length).sort((a, b) => a - b);
    expect(weights[0]).toBe(lightest[0]);
  });

  it('a class at two strands is tail-free on its own', () => {
    const contracts: EdgeContracts = { 5: { minor: 0, t: 0.5, count: 2 } };
    const pb = parityBasis('spectre', contracts);
    expect(pb.basis).toContainEqual([5]);
    expect(oddLeaves('spectre', new Set([5]), contracts)).toEqual([]);
    // ...and the old 2578 is no longer tail-free once 5 stops counting.
    expect(oddLeaves('spectre', new Set([2, 5, 7, 8]), contracts).length).toBeGreaterThan(0);
  });

  it('decomposes tail-free rules and rejects the rest', () => {
    const pb = parityBasis('spectre');
    for (const v of validEdgeSubsets('spectre')) {
      const coords = basisCoords(pb, v.edges);
      expect(coords).not.toBeNull();
      const rebuilt = pb.basis.reduce<readonly number[]>((acc, g, i) => (coords![i] ? xorGroup(acc, g) : acc), []);
      expect(rebuilt).toEqual([...v.edges]);
    }
    expect(basisCoords(pb, [2])).toBeNull();
  });

  it('XOR-ing a group keeps a tail-free rule tail-free', () => {
    const pb = parityBasis('spectre');
    for (const v of validEdgeSubsets('spectre')) {
      for (const g of pb.basis) expect(tailFree('spectre', xorGroup(v.edges, g))).toBe(true);
    }
  });
});
