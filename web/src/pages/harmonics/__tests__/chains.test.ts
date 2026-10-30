/**
 * Chains against the pairwise relation they are built from: each chain is
 * one connected set of the relation (found here by search from each
 * circuit), ordered by level, every member two levels above the one before
 * and its harmonic.
 */
import { describe, expect, it } from 'vitest';

import { HarmonicsEngine } from '../harmonicsJob';
import { agreement, chainsOf, harmonicLinks, isHarmonic } from '../chains';

describe.each(['000100000', '140000001'])('chains of 023468 / %s', (combo) => {
  const { circuits } = new HarmonicsEngine({ family: 'hex', subset: [0, 2, 3, 4, 6, 8], combo, level: 8 }).result();
  const links = harmonicLinks(circuits);
  const chains = chainsOf(circuits, links);

  it('are the connected sets of the harmonic relation, each ordered by level, each step a harmonic', () => {
    expect(links.length).toBeGreaterThan(2);
    const near = new Map<number, number[]>();
    for (const l of links) {
      (near.get(l.a) ?? near.set(l.a, []).get(l.a)!).push(l.b);
      (near.get(l.b) ?? near.set(l.b, []).get(l.b)!).push(l.a);
    }
    const seen = new Set<number>();
    const sets: number[][] = [];
    circuits.forEach((_, i) => {
      if (seen.has(i)) return;
      const set: number[] = [];
      const todo = [i];
      seen.add(i);
      while (todo.length) {
        const j = todo.pop()!;
        set.push(j);
        for (const k of near.get(j) ?? []) if (!seen.has(k)) { seen.add(k); todo.push(k); }
      }
      sets.push(set.sort((x, y) => x - y));
    });
    expect(chains.map((c) => [...c.members].sort((x, y) => x - y)).sort()).toEqual(sets.sort());
    for (const ch of chains) {
      ch.members.forEach((m, q) => {
        expect(circuits[m].family).toBe(ch.family);
        if (q === 0) return;
        const a = circuits[ch.members[q - 1]], b = circuits[m];
        expect(b.level).toBe(a.level + 2);
        expect(isHarmonic(agreement(a, b), a.level)).toBe(true);
      });
    }
    expect(chains.some((c) => c.members.length >= 3)).toBe(true);
  }, 120000);
});
