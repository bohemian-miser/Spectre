/**
 * Graded links against independent sources: the cyclic edit distance
 * against a brute force that tries every rotation and reversal by
 * recursion; the chains at 100% under the readings' own fold against the
 * exact rule's (`chains.ts`); and lowering the threshold, which only merges
 * chains.
 */
import { describe, expect, it } from 'vitest';

import { HarmonicsEngine } from '../harmonicsJob';
import { chainsOf, type Chain } from '../chains';
import { cyclicDistance, editDistance, linksAt } from '../similarity';

/** Edit distance by plain recursion with memo on (i, j). */
function slowDistance(a: readonly string[], b: readonly string[]): number {
  const memo = new Map<string, number>();
  const go = (i: number, j: number): number => {
    if (i === a.length) return b.length - j;
    if (j === b.length) return a.length - i;
    const key = `${i} ${j}`;
    if (!memo.has(key)) memo.set(key, Math.min(go(i + 1, j + 1) + (a[i] === b[j] ? 0 : 1), go(i + 1, j) + 1, go(i, j + 1) + 1));
    return memo.get(key)!;
  };
  return go(0, 0);
}

/** The least of it over every rotation of B and of B reversed. */
function slowCyclic(a: readonly string[], b: readonly string[]): number {
  let best = Infinity;
  for (const bb of [b, [...b].reverse()])
    for (let r = 0; r < Math.max(1, bb.length); r++) best = Math.min(best, slowDistance(a, [...bb.slice(r), ...bb.slice(0, r)]));
  return best;
}

describe('cyclic edit distance', () => {
  it('equals the brute force on random short sequences', () => {
    let seed = 11;
    const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n);
    const word = () => Array.from({ length: rand(9) }, () => 'ABCD'[rand(4)]);
    for (let t = 0; t < 500; t++) {
      const a = word(), b = word();
      expect(editDistance(a, b)).toBe(slowDistance(a, b));
      const c = cyclicDistance(a, b);
      expect(c.bound).toBe('exact');
      expect(c.distance).toBe(slowCyclic(a, b));
    }
  });

  it('gives an upper bound past the exact budget, and the lengths when banded work is too much', () => {
    let seed = 5;
    const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n);
    const a = Array.from({ length: 400 }, () => 'ABC'[rand(3)]);
    const b = [...a.slice(150), ...a.slice(0, 150)];
    b.splice(30, 3);
    const c = cyclicDistance(a, b);
    expect(c.bound).toBe('at least');
    expect(c.distance).toBeGreaterThanOrEqual(3);
    expect(c.distance).toBeLessThanOrEqual(3 + 2);
  });
});

const sets = (chains: readonly Chain[]) => chains.map((c) => c.members.join(' ')).sort();

describe.each(['000100000', '140000001'])('graded links of 023468 / %s', (combo) => {
  const engine = new HarmonicsEngine({ family: 'hex', subset: [0, 2, 3, 4, 6, 8], combo, level: 8 });
  const r = engine.result();

  it('at 100% under weaving and detours, chains as the exact rule makes them', () => {
    const scored = engine.similarities('fixpoint');
    expect(sets(chainsOf(r.circuits, linksAt(scored, 1)))).toEqual(sets(r.chains));
    // and every exact link scores 100%
    for (const l of r.links) expect(scored.find((s) => s.a === l.a && s.b === l.b)?.score).toBe(1);
  });

  it.each(['fixpoint', 'weave', 'none'] as const)('lowering the threshold under %s only merges chains', (fold) => {
    const scored = engine.similarities(fold);
    let prev: Chain[] | null = null;
    for (const t of [1, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5]) {
      const now = chainsOf(r.circuits, linksAt(scored, t));
      if (prev) {
        // every chain before lies inside one chain now
        const at = new Map<number, number>();
        now.forEach((c, q) => c.members.forEach((m) => at.set(m, q)));
        for (const c of prev) expect(new Set(c.members.map((m) => at.get(m))).size).toBe(1);
        expect(now.length).toBeLessThanOrEqual(prev.length);
      }
      prev = now;
    }
    for (const s of scored) {
      const compared = s.levels.filter((l) => l.similarity !== null);
      if (s.score > 0) expect(s.score).toBe(Math.min(...compared.map((l) => l.similarity!)));
    }
  });
});
