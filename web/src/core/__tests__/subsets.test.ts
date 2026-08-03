import { describe, expect, it } from 'vitest';
import {
  SPECTRE_VALID_SUBSETS,
  bruteForceValidSubsets,
  edgeCountMatrix,
  edgesToSubset,
  kernelBasis,
  subsetFromString,
  subsetLabel,
  subsetToEdges,
  subsetToString,
  validEdgeSubsets,
  xorSubsets,
} from '../subsets';
import { connectionCount, familyMajors } from '../edges';
import { FAMILIES, edgeLabels, leafOrder } from '../families';

/** Independent transcription of the old `getValidEdgeCombinations` (analysis.ts:326). */
function legacyValidEdgeCombinations(
  family: (typeof FAMILIES)[number],
  tileNames: readonly string[],
): { edges: number[]; label: string }[] {
  const availableEdges = new Set<number>();
  for (const tile of tileNames) {
    for (const lab of edgeLabels(family, tile as never)) {
      const major = parseInt(lab.replace('-', '').charAt(0));
      if (!isNaN(major)) availableEdges.add(major);
    }
  }
  const edgeTypes = [...availableEdges].sort((a, b) => a - b);
  const combinations: { edges: number[]; label: string }[] = [];
  const numSubsets = 1 << edgeTypes.length;
  for (let i = 1; i < numSubsets; i++) {
    const subsetArray: number[] = [];
    const subset = new Set<number>();
    for (let j = 0; j < edgeTypes.length; j++) {
      if ((i >> j) & 1) {
        subset.add(edgeTypes[j]);
        subsetArray.push(edgeTypes[j]);
      }
    }
    let allEven = true;
    for (const tile of tileNames) {
      if (connectionCount(family, tile as never, subset) % 2 !== 0) {
        allEven = false;
        break;
      }
    }
    if (allEven) {
      combinations.push({
        edges: subsetArray,
        label: subsetArray.map((e) => (e === 7 ? '7(M)' : e.toString())).join(', '),
      });
    }
  }
  return combinations;
}

describe('GF(2) kernel of the tile x edge-class matrix', () => {
  it('returns exactly the eight known spectre subsets', () => {
    const got = validEdgeSubsets('spectre').map((s) => subsetToString(s.mask));
    expect([...got].sort()).toEqual([...SPECTRE_VALID_SUBSETS].sort());
    expect(got).toEqual(['', '15', '0136', '0356', '1278', '2578', '023678', '01235678']);
    expect(kernelBasis(edgeCountMatrix('spectre')).length).toBe(3); // dimension 3
  });

  it('the matrix is built from connection-count parities', () => {
    const m = edgeCountMatrix('spectre');
    expect(m.rows).toEqual(leafOrder('spectre'));
    expect(m.cols).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    m.rows.forEach((type, r) => {
      m.cols.forEach((major, c) => {
        expect(m.bits[r][c]).toBe(connectionCount('spectre', type, new Set([major])) % 2);
      });
    });
  });

  it('every valid subset gives every tile an even number of connection points', () => {
    for (const family of FAMILIES) {
      for (const vs of validEdgeSubsets(family)) {
        const sel = new Set(vs.edges);
        for (const type of leafOrder(family)) {
          expect(connectionCount(family, type, sel) % 2, `${family}/${type}/${vs.label}`).toBe(0);
        }
      }
    }
  });

  it('agrees with the brute-force port for every family', () => {
    for (const family of FAMILIES) {
      const kernel = validEdgeSubsets(family).map((s) => s.mask);
      expect(kernel).toEqual([...bruteForceValidSubsets(family)]);
      // and with an independent transcription of the legacy function
      const legacy = legacyValidEdgeCombinations(family, leafOrder(family)).map((c) =>
        edgesToSubset(c.edges),
      );
      expect([...legacy].sort((a, b) => a - b)).toEqual(
        kernel.filter((m) => m !== 0).sort((a, b) => a - b),
      );
    }
  });

  it('is a group under symmetric difference (XOR closure)', () => {
    for (const family of FAMILIES) {
      const masks = validEdgeSubsets(family).map((s) => s.mask);
      const set = new Set(masks);
      expect(set.has(0)).toBe(true); // identity
      expect(masks.length).toBe(1 << kernelBasis(edgeCountMatrix(family)).length);
      for (const a of masks) {
        for (const b of masks) expect(set.has(xorSubsets(a, b))).toBe(true);
      }
    }
  });

  it('pins the kernels of the other three families', () => {
    // hat and turtle share the spectre label tables, so they share its kernel
    for (const family of ['hat', 'turtle'] as const) {
      expect(validEdgeSubsets(family).map((s) => subsetToString(s.mask))).toEqual([
        ...SPECTRE_VALID_SUBSETS,
      ]);
    }
    // hexagons: a DIFFERENT kernel, but also of dimension 3 (8 elements).
    // DESIGN.md §2/§12.11 expected 16; brute force says 8 and wins (§12.11).
    expect(validEdgeSubsets('hex').map((s) => subsetToString(s.mask))).toEqual([
      '',
      '15',
      '128',
      '258',
      '01346',
      '03456',
      '023468',
      '01234568',
    ]);
    expect(familyMajors('hex')).toEqual([0, 1, 2, 3, 4, 5, 6, 8]); // no class 7
  });

  it('formats and parses subsets', () => {
    const mask = subsetFromString('2578');
    expect(subsetToEdges(mask)).toEqual([2, 5, 7, 8]);
    expect(subsetToString(mask)).toBe('2578');
    expect(subsetLabel(mask)).toBe('2, 5, 7(M), 8'); // class 7 keeps its Mystic marker
    expect(subsetToString(edgesToSubset([8, 2]))).toBe('28');
    expect(subsetFromString('')).toBe(0);
  });
});
