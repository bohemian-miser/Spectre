/**
 * Taking every landing, against `walkStrand` on one full stack: each circuit
 * the tree closes on is a circuit `walkStrand` walks in a stack behind its
 * branch, of the same length and word. A circuit's key does not change
 * when its word is read from another tile or the other way round. Walked
 * again from another of its tiles, either way round, by taking the landing it
 * goes to at each fork, it closes on the same circuit, which `walkStrand`
 * walks in a stack behind it.
 */
import { describe, expect, it } from 'vitest';

import { walkStrand } from '../../../core';
import { circuitKey, circuitsOf } from '../circuits';
import { concreteChain, explore, followWord, makeWalker, replayChoices, rotateWord, stageAhead, startWalk, type Seen } from '../possible';
import { decodeLink } from '../share';
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

  it('walks a circuit again from any of its tiles, either way round', () => {
    const l = decodeLink('r=023468&m=2.14.0.0.0.0.0.0.2&s=Xi&e=2&t=0-Theta5_0-Phi5_2-Phi1_3-Sigma4_4-Delta4_5-Phi1_6-Delta4_7-Delta4&c=8')!;
    const pattern = { subset: l.subset, matching: l.matching };
    const pw = replayChoices(startWalk(makeWalker(pattern, l.start, l.edge!, 5)), l.choices, l.current);
    const word = stageAhead(pw, pw.current, 100000).seen;
    expect(word).toHaveLength(57);
    const m = Object.fromEntries(matchingByType(pattern));
    for (const [k, back] of [[1, false], [20, false], [0, true], [33, true]] as const) {
      const w = rotateWord(word, k, back);
      const again = followWord(startWalk(makeWalker(pattern, w[0].type, w[0].entry, 5)), w, 100000);
      expect(again.stage.status).toBe('closed');
      expect(again.stage.seen).toEqual(w);
      expect(circuitKey(again.stage.seen)).toBe(circuitKey(word));
      const ref = walkStrand(pattern.subset, m, { address: { leaf: w[0].type, path: [...concreteChain(again.stage.worlds[0])] }, entry: w[0].entry }, 100000);
      expect(ref.states.map((s) => `${s.address.leaf}${s.entry}`)).toEqual(w.map((s) => `${s.type}${s.entry}`));
    }
  }, 60000);
});
