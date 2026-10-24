import { describe, expect, it } from 'vitest';
import {
  buildSystem,
  connectionCount,
  connectionPoints,
  decodeExplorerState,
  encodeExplorerState,
  DEFAULT_EXPLORER_STATE,
  enumerateMatchings,
  familyMajors,
  flatten,
  leafOrder,
  localChords,
  matchingAt,
  matchingCount,
  matchingRank,
  nonCrossingMatchingIndicesCyclic,
  transPt,
  type EdgeContracts,
  type TileFamilyId,
} from '..';

const counts = (k: number, majors: readonly number[]): EdgeContracts =>
  Object.fromEntries(majors.map((m) => [m, { minor: 0, t: m === 0 ? 1 : 0.5, count: k }]));

/** How often each strand end lands on each point of a patch: interior points twice, the rim once. */
function endHistogram(family: TileFamilyId, subset: readonly number[], contracts: EdgeContracts | undefined): [number, number, number] {
  const sys = buildSystem(family, 3);
  const root = leafOrder(family)[0] in sys ? leafOrder(family)[0] : Object.keys(sys)[0];
  const seen = new Map<string, number>();
  const sel = new Set(subset);
  for (const inst of flatten(sys[root])) {
    for (const c of connectionPoints(family, inst.type, sel, contracts)) {
      const p = transPt(inst.xform, c.pt);
      // String(-0) is '0', unlike toFixed: a point on an axis gets one key.
      const k = `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
  }
  const h: [number, number, number] = [0, 0, 0];
  for (const n of seen.values()) h[Math.min(n, 3) - 1]++;
  return h;
}

describe('several strands per seam', () => {
  it('puts k points on each seam, and abutting tiles agree on every one of them', () => {
    for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
      const all = familyMajors(family);
      const one = endHistogram(family, all, undefined);
      expect(one[2]).toBe(0);
      for (const k of [2, 3]) {
        const many = endHistogram(family, all, counts(k, all));
        // Every glued crossing still meets exactly one partner, k times as many of them.
        expect(many).toEqual([one[0] * k, one[1] * k, 0]);
      }
    }
  });

  it('counts the points per tile, and spreads them along the seam in boundary order', () => {
    const c = counts(3, [1]);
    expect(connectionCount('hex', 'Delta', new Set([1, 5]), c)).toBe(connectionCount('hex', 'Delta', new Set([1, 5])) + 2);
    const pts = connectionPoints('hex', 'Delta', new Set([1]), c).map((p) => p.pt);
    expect(pts).toHaveLength(3);
    // Evenly spaced along one straight edge: equal gaps, middle one at the midpoint.
    const d01 = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const d12 = Math.hypot(pts[2].x - pts[1].x, pts[2].y - pts[1].y);
    expect(d01).toBeCloseTo(d12, 9);
    expect(d01).toBeCloseTo(0.25 * Math.hypot(pts[2].x - pts[0].x, pts[2].y - pts[0].y) * 2, 9);
  });

  it('unranks and ranks matchings without listing them', () => {
    for (const n of [0, 2, 4, 6, 8, 10]) {
      enumerateMatchings(n).forEach((m, i) => {
        expect(matchingRank(n, m)).toBe(i);
      });
    }
    const n = 18;
    for (const i of [0, 1, 12345, matchingCount(n) - 1]) expect(matchingRank(n, matchingAt(n, i)!)).toBe(i);
    expect(matchingAt(n, matchingCount(n))).toBeUndefined();
    expect(matchingRank(4, [[0, 1]])).toBe(-1);
  });

  it('lists the non-crossing matchings of many points directly (Catalan many, all non-crossing)', () => {
    const n = 14;
    const nc = nonCrossingMatchingIndicesCyclic(n);
    expect(nc).toHaveLength(429);
    expect([...nc].sort((a, b) => a - b)).toEqual(nc);
    for (const i of nc) {
      const pairs = matchingAt(n, i)!.map(([a, b]) => [Math.min(a, b), Math.max(a, b)]);
      for (const [a1, a2] of pairs) for (const [b1, b2] of pairs) expect(a1 < b1 && b1 < a2 && a2 < b2).toBe(false);
    }
    // The small-n path and the ranked path agree where both work.
    expect(nonCrossingMatchingIndicesCyclic(12)).toHaveLength(132);
  });

  it('draws chords for a multi-strand matching, and keeps the counts in the link', () => {
    const c = counts(2, [1, 5]);
    // Pi's edges are 1, 5, 5, 1, 8, 2: four of them carry two strands each.
    const n = connectionCount('hex', 'Pi', new Set([1, 5]), c);
    expect(n).toBe(8);
    const idx = nonCrossingMatchingIndicesCyclic(n)[3];
    expect(localChords('hex', 'Pi', new Set([1, 5]), idx, c)).toHaveLength(4);
    const pi = leafOrder('hex').indexOf('Pi');

    const state = { ...DEFAULT_EXPLORER_STATE, family: 'hex' as const, rootTile: 'Delta' as const, subset: [1, 5], contracts: c, matching: leafOrder('hex').map((_, i) => (i === pi ? idx : 0)) };
    const q = encodeExplorerState(state).toString();
    expect(q).toContain('x2');
    // No combination string can hold the counts, so the matchings are spelled out.
    expect(q).not.toMatch(/(^|&)c=/);
    const back = decodeExplorerState(new URLSearchParams(q));
    expect(back.contracts?.[1]?.count).toBe(2);
    expect(back.contracts?.[5]?.count).toBe(2);
    expect(back.matching[pi]).toBe(idx);
  });
});
