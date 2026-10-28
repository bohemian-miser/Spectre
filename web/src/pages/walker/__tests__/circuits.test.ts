/**
 * Taking every landing, against `walkStrand` on one full stack: each circuit
 * the tree closes on is a circuit `walkStrand` walks in a stack behind its
 * branch, of the same length and word. A circuit's key does not change
 * when its word is read from another tile or the other way round.
 */
import { describe, expect, it } from 'vitest';

import { walkStrand } from '../../../core';
import { circuitKey, circuitsOf } from '../circuits';
import { concreteChain, explore, makeWalker, startWalk, type Seen } from '../possible';
import { matchingByType, patternOf } from '../walk';

const triangle = patternOf([0, 2, 3, 4, 6, 8], '000100000');
const matching = Object.fromEntries(matchingByType(triangle));

describe('every landing taken', () => {
  it('closes on circuits that walkStrand walks, each related to a smaller one', () => {
    const wk = makeWalker(triangle, 'Delta', 0, 5);
    const { pw, done } = explore(startWalk(wk), { forks: 30, tiles: 600 });
    expect(done).toBe(true);
    const circuits = circuitsOf(pw);
    expect(circuits.length).toBeGreaterThan(2);
    for (const c of circuits) {
      for (const id of c.nodes) {
        const end = pw.nodes[id].end!;
        expect(end.seen).toHaveLength(c.tiles);
        expect(circuitKey(end.seen)).toBe(c.key);
        for (const world of end.worlds.slice(0, 5)) {
          const ref = walkStrand(triangle.subset, matching, { address: { leaf: 'Delta', path: [...concreteChain(world)] }, entry: 0 }, 100000);
          expect(ref.end).toBe('circuit');
          expect(ref.states.map((s) => `${s.address.leaf}${s.entry}`)).toEqual(end.seen.map((s) => `${s.type}${s.entry}`));
        }
      }
    }
    // the smallest has nothing smaller to leave; every other leaves a smaller one at a fork on its own branch
    expect(circuits[0].branching).toBeNull();
    for (const c of circuits.slice(1)) {
      const b = c.branching!;
      expect(b.fromTiles).toBeLessThan(c.tiles);
      expect(pw.nodes[b.node].fork!.options.map((o) => o.key)).toEqual(expect.arrayContaining([b.took, b.other]));
    }
  }, 60000);

  it('keys a circuit the same from any tile, either way round', () => {
    const seen: Seen[] = [
      { type: 'Delta', entry: 0, exit: 3 }, { type: 'Psi', entry: 5, exit: 1 }, { type: 'Phi', entry: 4, exit: 2 }, { type: 'Psi', entry: 0, exit: 4 },
    ];
    const key = circuitKey(seen);
    for (let k = 0; k < seen.length; k++) {
      const r = [...seen.slice(k), ...seen.slice(0, k)];
      expect(circuitKey(r)).toBe(key);
      expect(circuitKey([...r].reverse().map((s) => ({ ...s, entry: s.exit, exit: s.entry })))).toBe(key);
    }
  });
});
