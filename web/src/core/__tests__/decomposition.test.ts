import { describe, expect, it } from 'vitest';
import {
  analyze,
  buildSystem,
  countsAtom,
  countsValid,
  decomposeRule,
  flatten,
  formatCounts,
  leafOrder,
  matchingRank,
  type EdgeContracts,
} from '..';
import { multiEdgeModel, nonCrossingPairings, pairingFactorisation, tileEndPoints, type Pairing } from '../multiEdge';
import { HEX_PTS } from '../families';

const twoEach: EdgeContracts = { 1: { minor: 0, t: 0.5, count: 2 }, 5: { minor: 0, t: 0.5, count: 2 } };

describe('decomposeRule', () => {
  it('agrees with the Multi-edge page on every pairing of 1155', () => {
    const m = multiEdgeModel();
    const x = m.classes.map((c) => (c === 1 || c === 5 ? 2 : 0));
    const pairs = m.types.map((t) => nonCrossingPairings(tileEndPoints(m, t, x, HEX_PTS).length).pairings);
    const total = pairs.reduce((a, p) => a * p.length, 1);
    const order = leafOrder('hex');
    const seen = new Set<string>();
    for (let n = 0; n < total; n++) {
      let r = n;
      const chosen: Record<string, Pairing> = {};
      m.types.forEach((t, i) => {
        chosen[t] = pairs[i][r % pairs[i].length];
        r = Math.floor(r / pairs[i].length);
      });
      const theirs = pairingFactorisation(m, x, chosen)!.factors.map((f) =>
        formatCounts(Object.fromEntries(m.classes.map((c, k) => [c, f.vector[k]]))),
      );
      const matching = order.map((t) => {
        const p = chosen[t];
        return p ? matchingRank(tileEndPoints(m, t, x, HEX_PTS).length, p) : 0;
      });
      const ours = decomposeRule('hex', [1, 5], matching, twoEach).factors.map((f) => formatCounts(f.counts));
      expect([...ours].sort()).toEqual([...theirs].sort());
      seen.add([...ours].sort().join(' + '));
    }
    expect([...seen].sort()).toEqual(['1 5 + 1 5', '1×2 + 5×2', '1×2 5×2']);
  });

  it('names the tiles whose pairing joins different classes', () => {
    const d = decomposeRule('hex', [1, 5], leafOrder('hex').map(() => 0));
    expect(d.factors.map((f) => formatCounts(f.counts))).toEqual(['1 5']);
    expect(d.joins.find((j) => j.type === 'Delta')).toMatchObject({ mixed: true, text: '1–5' });
  });

  it('checks validity and atoms on Spectres', () => {
    expect(countsValid('spectre', { 1: 1, 5: 1 })).toBe(true);
    expect(countsValid('spectre', { 1: 1 })).toBe(false);
    expect(countsAtom('spectre', { 1: 1, 5: 1 })).toBe(true);
    expect(countsAtom('spectre', { 1: 2, 5: 2 })).toBe(false);
  });

  it('counts each circuit’s crossings per class', () => {
    const r = analyze(
      { family: 'spectre', instances: flatten(buildSystem('spectre', 3)['Delta']), selected: new Set([1, 5]), matchingIndexByType: {} },
      { loopVectors: true },
    );
    expect(r.circuitVectors).toHaveLength(r.circuits.length);
    r.circuits.forEach((c, i) => {
      const v = r.circuitVectors![i];
      expect(Object.values(v).reduce((a, b) => a + b, 0)).toBe(c.points.length);
      expect(Object.keys(v).every((k) => k === '1' || k === '5')).toBe(true);
    });
  });
});
