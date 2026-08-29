import { describe, expect, it } from 'vitest';
import { localChords } from '../circuits';
import {
  comboToMatchingIndices,
  enumerateMatchings,
  formatComboShareString,
  geometricNonCrossingMatchingIndices,
  matchingCount,
  matchingIndicesToCombo,
  nonCrossingForTile,
  normalizeMatchingVector,
  maxMatchingIndex,
  nonCrossingMatchingIndicesCyclic,
  parseComboShareString,
  segmentsCross,
} from '../matchings';
import { connectionCount, connectionPoints } from '../edges';
import { FAMILIES, leafOrder } from '../families';
import { subsetToEdges, validEdgeSubsets } from '../subsets';
import type { Pt } from '../geom';

/** Independent transcription of the old `findPerfectMatchings` (analysis.ts:27). */
function legacyFindPerfectMatchings<T>(points: T[]): T[][][] {
  if (points.length === 0) return [[]];
  if (points.length % 2 !== 0) return [];
  const first = points[0];
  const rest = points.slice(1);
  const solutions: T[][][] = [];
  for (let i = 0; i < rest.length; i++) {
    const pair = [first, rest[i]];
    const remaining = rest.slice(0, i).concat(rest.slice(i + 1));
    for (const sub of legacyFindPerfectMatchings(remaining)) solutions.push([pair].concat(sub));
  }
  return solutions;
}

describe('perfect matchings', () => {
  it('counts (n-1)!! for small point sets', () => {
    expect(enumerateMatchings(0).length).toBe(1);
    expect(enumerateMatchings(2).length).toBe(1);
    expect(enumerateMatchings(4).length).toBe(3);
    expect(enumerateMatchings(6).length).toBe(15);
    expect(enumerateMatchings(8).length).toBe(105);
    expect(enumerateMatchings(10).length).toBe(945);
    for (const n of [0, 2, 4, 6, 8, 10]) expect(enumerateMatchings(n).length).toBe(matchingCount(n));
    expect(enumerateMatchings(3).length).toBe(0);
    expect(matchingCount(3)).toBe(0);
  });

  it('reproduces the legacy enumeration order exactly', () => {
    for (const n of [0, 2, 4, 6, 8]) {
      const idx = Array.from({ length: n }, (_, i) => i);
      const want = legacyFindPerfectMatchings(idx);
      const got = enumerateMatchings(n);
      expect(got.length).toBe(want.length);
      got.forEach((m, i) => {
        expect(m.map(([a, b]) => [a, b])).toEqual(want[i].map((pair) => [pair[0], pair[1]]));
      });
    }
  });

  it('every matching is a partition into pairs', () => {
    for (const m of enumerateMatchings(6)) {
      expect(m.length).toBe(3);
      expect([...m.flat()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it('the canonical non-crossing rule is the cyclic (Catalan) one', () => {
    // 4 points -> 2 non-crossing matchings, 6 -> 5, 8 -> 14 (Catalan numbers)
    expect(nonCrossingMatchingIndicesCyclic(2).length).toBe(1);
    expect(nonCrossingMatchingIndicesCyclic(4).length).toBe(2);
    expect(nonCrossingMatchingIndicesCyclic(6).length).toBe(5);
    expect(nonCrossingMatchingIndicesCyclic(8).length).toBe(14);
  });

  it('geometric crossing test agrees with the cyclic one on convex points', () => {
    const convex: Pt[] = Array.from({ length: 6 }, (_, i) => ({
      x: Math.cos((i * Math.PI) / 3),
      y: Math.sin((i * Math.PI) / 3),
    }));
    expect(geometricNonCrossingMatchingIndices(convex)).toEqual(
      nonCrossingMatchingIndicesCyclic(6),
    );
    expect(segmentsCross({ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 })).toBe(true);
    expect(segmentsCross({ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 })).toBe(false);
  });

  it('the geometric rule is more permissive on the concave spectre', () => {
    // documented divergence: the combo codec must use the cyclic rule
    const sel = new Set([1, 5]);
    const pts = connectionPoints('spectre', 'Pi', sel).map((c) => c.pt);
    expect(geometricNonCrossingMatchingIndices(pts)).toEqual([0, 1, 2]);
    expect(nonCrossingForTile('spectre', 'Pi', sel)).toEqual([0, 2]);
  });
});

describe('combination strings', () => {
  it('round-trips share strings', () => {
    expect(parseComboShareString('2578-0100101100')).toEqual({
      subset: [2, 5, 7, 8],
      combo: '0100101100',
    });
    expect(formatComboShareString([8, 2, 7, 5], '0100101100')).toBe('2578-0100101100');
    expect(parseComboShareString('-0000000000')).toEqual({ subset: [], combo: '0000000000' });
    expect(parseComboShareString('nonsense')).toBeNull();
    expect(parseComboShareString('2255-000')).toBeNull(); // duplicate majors
  });

  it('maps combo digits to matchings and back, for every family and valid subset', () => {
    for (const family of FAMILIES) {
      for (const vs of validEdgeSubsets(family)) {
        const subset = subsetToEdges(vs.mask);
        const order = leafOrder(family);
        // exercise digit 0 and digit 1 (where available) on every tile
        for (const digit of ['0', '1', 'z']) {
          const combo = order.map(() => digit).join('');
          const indices = comboToMatchingIndices(family, subset, combo);
          expect(indices.length).toBe(order.length);
          indices.forEach((mi, i) => {
            const n = connectionCount(family, order[i], new Set(subset));
            expect(mi).toBeGreaterThanOrEqual(0);
            expect(mi).toBeLessThan(Math.max(1, matchingCount(n)));
          });
          const back = matchingIndicesToCombo(family, subset, indices);
          expect(back).not.toBeNull();
          // re-decoding the canonical combo yields the same matchings
          expect(comboToMatchingIndices(family, subset, back as string)).toEqual(indices);
        }
      }
    }
  });

  it('returns null for matchings that no combo digit can express', () => {
    const subset = [2, 5, 7, 8];
    const order = leafOrder('spectre');
    const indices = order.map((t) => {
      const nc = nonCrossingForTile('spectre', t, new Set(subset));
      const all = enumerateMatchings(connectionCount('spectre', t, new Set(subset))).length;
      // pick a crossing matching where one exists
      for (let i = 0; i < all; i++) if (!nc.includes(i)) return i;
      return 0;
    });
    expect(indices.some((v) => v !== 0)).toBe(true);
    expect(matchingIndicesToCombo('spectre', subset, indices)).toBeNull();
  });
});

describe('normalizeMatchingVector', () => {
  /**
   * The Supertiles regression: a rule chosen under a wide subset kept its
   * indices when a class was removed, and the encoder rejected the now
   * out-of-range index exactly as it rejects a crossing one — so the view told
   * the user their perfectly good rule "crosses itself".
   */
  it('brings a vector back into range when the subset shrinks', () => {
    const wide = [1, 2, 5, 7, 8];
    const selected = new Set(wide);
    const matching = leafOrder('spectre').map((t) => {
      const nc = nonCrossingForTile('spectre', t, selected);
      return nc.length ? nc[nc.length - 1] : 0;
    });
    expect(matchingIndicesToCombo('spectre', wide, matching)).not.toBeNull();

    const narrow = [1, 2, 5];
    // Untouched, the same vector has no combination string at all…
    expect(matchingIndicesToCombo('spectre', narrow, matching)).toBeNull();
    // …and normalizing is what gives it one back.
    const fixed = normalizeMatchingVector('spectre', narrow, matching);
    expect(matchingIndicesToCombo('spectre', narrow, fixed)).not.toBeNull();
  });

  it('leaves an already-valid vector alone', () => {
    const subset = [2, 5, 7, 8];
    const matching = normalizeMatchingVector('spectre', subset, [0, 1, 0, 0, 1, 0, 1, 1, 0, 0]);
    expect(normalizeMatchingVector('spectre', subset, matching)).toEqual(matching);
  });

  /**
   * The other half of the same Supertiles report — "some tiles aren't showing
   * the path". `localChords` returns NOTHING for an out-of-range index, so a
   * stale vector does not just cost the combination string: it silently stops
   * drawing that tile's strand.
   */
  it('restores a tile that a stale index had stopped drawing', () => {
    const wide = [0, 1, 2];
    const narrow = [0, 1];
    const i = leafOrder('spectre').indexOf('Xi');
    const stale = maxMatchingIndex('spectre', 'Xi', wide);
    const vector = leafOrder('spectre').map((_, j) => (j === i ? stale : 0));

    // Under the narrower subset that index is past the end, and Xi goes blank…
    expect(localChords('spectre', 'Xi', new Set(narrow), vector[i])).toHaveLength(0);
    // …even though Xi is perfectly drawable there once the index is in range.
    const fixed = normalizeMatchingVector('spectre', narrow, vector);
    expect(localChords('spectre', 'Xi', new Set(narrow), fixed[i]).length).toBeGreaterThan(0);
  });

  it('is total: junk in, a usable vector out', () => {
    const v = normalizeMatchingVector('spectre', [2, 5], [-4, 999, Number.NaN]);
    expect(v).toHaveLength(leafOrder('spectre').length);
    expect(v.every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
  });
});
