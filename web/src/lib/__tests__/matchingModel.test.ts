import { describe, expect, it } from 'vitest';
import {
  connectionCount,
  enumerateMatchings,
  leafOrder,
  matchingCount,
  nonCrossingForTile,
} from '../../core';
import {
  canonicalMatching,
  cycleMatchingIndex,
  matchingChords,
  matchingIndexOf,
  matchingOptions,
  matchingVectorToRecord,
  normalizeMatchingIndex,
  optionPosition,
  pairPoints,
  partnerOf,
  recordToMatchingVector,
  tileMatchingInfo,
} from '../matchingModel';

const SUBSET = new Set([2, 5, 7, 8]);

describe('tileMatchingInfo', () => {
  it('agrees with the core counts', () => {
    for (const type of leafOrder('spectre')) {
      const info = tileMatchingInfo('spectre', type, SUBSET);
      const n = connectionCount('spectre', type, SUBSET);
      expect(info.pointCount).toBe(n);
      expect(info.points).toHaveLength(n);
      expect(info.total).toBe(matchingCount(n));
      expect(info.odd).toBe(n % 2 !== 0);
      expect(info.nonCrossing).toEqual(nonCrossingForTile('spectre', type, SUBSET));
    }
  });

  it('memoizes (same identity for the same query)', () => {
    expect(tileMatchingInfo('spectre', 'Psi', SUBSET)).toBe(
      tileMatchingInfo('spectre', 'Psi', new Set([8, 7, 5, 2])),
    );
  });
});

describe('option lists and cycling', () => {
  const info = tileMatchingInfo('spectre', 'Psi', SUBSET);

  it('non-crossing filter is a subset of the full enumeration', () => {
    expect(matchingOptions(info, false)).toHaveLength(info.total);
    const nc = matchingOptions(info, true);
    expect(nc.length).toBeGreaterThan(0);
    expect(nc.length).toBeLessThanOrEqual(info.total);
    for (const i of nc) expect(i).toBeLessThan(info.total);
  });

  it('cycles forwards and backwards, wrapping', () => {
    let v = 0;
    for (let i = 0; i < info.total; i++) v = cycleMatchingIndex(info, v, 1);
    expect(v).toBe(0);

    const back = cycleMatchingIndex(info, 0, -1);
    expect(back).toBe(info.total - 1);
  });

  it('cycling with the filter only visits non-crossing options', () => {
    const nc = new Set(info.nonCrossing);
    let v = info.nonCrossing[0];
    for (let i = 0; i < nc.size * 2; i++) {
      v = cycleMatchingIndex(info, v, 1, true);
      expect(nc.has(v)).toBe(true);
    }
  });

  it('normalizeMatchingIndex snaps a filtered-out value onto an option', () => {
    const crossing = [...Array(info.total).keys()].find((i) => !info.nonCrossing.includes(i));
    expect(crossing).toBeDefined();
    const snapped = normalizeMatchingIndex(info, crossing as number, true);
    expect(info.nonCrossing).toContain(snapped);
    expect(optionPosition(info, snapped, true)).toBeGreaterThanOrEqual(0);
  });

  it('degenerate tiles (no dots) have exactly the empty matching', () => {
    const empty = tileMatchingInfo('spectre', 'Delta', new Set([4]));
    expect(empty.pointCount).toBe(0);
    expect(empty.total).toBe(1); // the empty matching
    expect(cycleMatchingIndex(empty, 0, 1)).toBe(0);
    expect(matchingOptions(empty, true)).toEqual([0]);
    expect(matchingChords(empty, 0)).toEqual([]);
  });

  it('odd tiles have no matchings at all', () => {
    const odd = tileMatchingInfo('spectre', 'Delta', new Set([1]));
    expect(odd.odd).toBe(true);
    expect(odd.total).toBe(0);
    expect(matchingOptions(odd, false)).toEqual([]);
    expect(cycleMatchingIndex(odd, 0, 1)).toBe(0);
  });
});

describe('chords and pairing', () => {
  const info = tileMatchingInfo('spectre', 'Psi', SUBSET);

  it('matchingChords pairs every point exactly once', () => {
    const chords = matchingChords(info, info.nonCrossing[0]);
    expect(chords).toHaveLength(info.pointCount / 2);
    const seen = new Set<number>();
    for (const c of chords) {
      expect(seen.has(c.a)).toBe(false);
      expect(seen.has(c.b)).toBe(false);
      seen.add(c.a);
      seen.add(c.b);
      expect(c.from).toEqual(info.points[c.a].pt);
      expect(c.to).toEqual(info.points[c.b].pt);
    }
    expect(seen.size).toBe(info.pointCount);
  });

  it('matchingIndexOf inverts enumerateMatchings for every n we use', () => {
    for (const n of [2, 4, 6, 8]) {
      const all = enumerateMatchings(n);
      all.forEach((m, i) => {
        expect(matchingIndexOf(n, m)).toBe(i);
        // Order of pairs and of each pair's members must not matter.
        const shuffled = [...m].reverse().map(([a, b]) => [b, a] as const);
        expect(matchingIndexOf(n, shuffled)).toBe(i);
      });
    }
  });

  it('canonicalMatching sorts pairs and members', () => {
    expect(canonicalMatching([[3, 1], [2, 0]])).toEqual([
      [0, 2],
      [1, 3],
    ]);
  });

  it('pairPoints re-pairs two dots and repairs the orphans', () => {
    const start = info.nonCrossing[0];
    for (let i = 0; i < info.pointCount; i++) {
      for (let j = i + 1; j < info.pointCount; j++) {
        const next = pairPoints(info, start, i, j);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(info.total);
        expect(partnerOf(info, next, i)).toBe(j);
        expect(partnerOf(info, next, j)).toBe(i);
      }
    }
  });

  it('pairPoints is a no-op for degenerate requests', () => {
    expect(pairPoints(info, 0, 1, 1)).toBe(0);
    const alreadyPaired = partnerOf(info, 0, 0);
    expect(pairPoints(info, 0, 0, alreadyPaired)).toBe(0);
  });
});

describe('matching vectors', () => {
  it('round-trips through the record form the analyzer wants', () => {
    const vector = leafOrder('spectre').map((_, i) => i % 3);
    const record = matchingVectorToRecord('spectre', vector);
    expect(record.Delta).toBe(vector[0]);
    expect(record.Gamma1).toBe(vector[9]);
    expect(recordToMatchingVector('spectre', record)).toEqual(vector);
  });

  it('handles the shorter hex leaf order', () => {
    const vector = leafOrder('hex').map(() => 1);
    const record = matchingVectorToRecord('hex', vector);
    expect(Object.keys(record)).toHaveLength(9);
    expect(record.Gamma).toBe(1);
    expect(record.Gamma1).toBeUndefined();
  });
});
