/**
 * The walk on every tiling at once, against `walkStrand` (the recursive
 * algorithm on one full slot path): a walk started on one known stack closes
 * with no choices after as many tiles as `walkStrand`; a walk started on a
 * bare tile, choosing the commonest outcome each time, closes on a circuit
 * that every surviving stack really has, of that length, seen the same way.
 * Stacks that went over a seam above level 5 are checked the same way, in
 * the fewest parents that close the seam.
 */
import { describe, expect, it } from 'vitest';

import { addressFromId, walkStrand, type HexType } from '../../../core';
import { circuitsAhead, concreteChain, explore, stageAfter, initialWorlds, makeWalker, reducePossible, replay, startWalk, type PossibleWalk } from '../possible';
import { longestCircuit, matchingByType, patternOf } from '../walk';

const triangle = patternOf([0, 2, 3, 4, 6, 8], '000100000');
const matching = Object.fromEntries(matchingByType(triangle));

function runChoosing(pw: PossibleWalk): PossibleWalk {
  let w = reducePossible(pw, { type: 'run', cap: 5000 });
  for (let i = 0; i < 100 && w.stage.status === 'choice'; i++) {
    w = reducePossible(w, { type: 'choose', key: w.stage.pending[0].key });
    w = reducePossible(w, { type: 'run', cap: 5000 });
  }
  return w;
}

describe('walking every tiling at once', () => {
  it('closes a known circuit with no choices', () => {
    const best = longestCircuit(triangle, 'Delta', 4)!;
    const a = addressFromId('Delta', best.id);
    const wk = makeWalker(triangle, a.leaf, best.edge, 5);
    const pw = reducePossible(startWalk(wk, [{ chain: a.path, at: a, entry: best.edge }]), { type: 'run', cap: 5000 });
    expect(pw.stage.status).toBe('closed');
    expect(pw.nodes).toHaveLength(1);
    expect(pw.stage.seen).toHaveLength(best.length);
  });

  it('from a bare tile, closes on a circuit every surviving stack has', () => {
    for (const [start, edge] of [['Delta', 4], ['Phi', 4]] as const) {
      const wk = makeWalker(triangle, start as HexType, edge, 5);
      expect(initialWorlds(wk)).toHaveLength(1);
      const pw = runChoosing(startWalk(wk));
      expect(pw.stage.status).toBe('closed');
      const n = pw.stage.seen.length;
      for (const world of pw.stage.worlds.slice(0, 50)) {
        const ref = walkStrand(triangle.subset, matching, { address: { leaf: start, path: [...concreteChain(world)] }, entry: edge }, 100000);
        expect(ref.end).toBe('circuit');
        expect(ref.states).toHaveLength(n);
        expect(ref.states.map((s) => `${s.address.leaf}${s.entry}`)).toEqual(pw.stage.seen.map((s) => `${s.type}${s.entry}`));
        expect(replay(wk, world, n).at).toHaveLength(n + 1);
      }
    }
  });

  it('goes on over a seam above level 5, and the circuit is real in the stacks that did', () => {
    const wk = makeWalker(triangle, 'Delta', 0, 5);
    const pw = runChoosing(startWalk(wk));
    expect(pw.stage.status).toBe('closed');
    const seamed = pw.stage.worlds.filter((w) => w.seam);
    expect(seamed.length).toBeGreaterThan(0);
    for (const world of seamed.slice(0, 50)) {
      const ref = walkStrand(triangle.subset, matching, { address: { leaf: 'Delta', path: [...concreteChain(world)] }, entry: 0 }, 100000);
      expect(ref.end).toBe('circuit');
      expect(ref.states.map((s) => `${s.address.leaf}${s.entry}`)).toEqual(pw.stage.seen.map((s) => `${s.type}${s.entry}`));
    }
    // where two walls meet, the tile across the second is forced in every stack, and it is where the rest land
    expect(pw.stage.corners.length).toBeGreaterThan(0);
    for (const c of pw.stage.corners) {
      expect(c.unforced).toBe(0);
      expect(c.tiles.map((t) => t.tile)).toEqual([`${pw.stage.seen[c.step].type} ${pw.stage.seen[c.step].entry}`]);
    }
  });

  it('takes a landing on the side as choosing it would, without adding it to the tree', () => {
    const pw = reducePossible(startWalk(makeWalker(triangle, 'Delta', 0, 5)), { type: 'run', cap: 5000 });
    expect(pw.stage.status).toBe('choice');
    for (const o of pw.stage.pending) {
      const side = stageAfter(pw, pw.current, o.key, 5000);
      const chosen = reducePossible(reducePossible(pw, { type: 'choose', key: o.key }), { type: 'run', cap: 5000 }).stage;
      expect(side.seen).toEqual(chosen.seen);
      expect(side.status).toBe(chosen.status);
      expect(side.worlds.length).toBe(chosen.worlds.length);
    }
    expect(pw.nodes).toHaveLength(1);
  });

  it('finds the shortest circuit ahead, as every branch explored finds it, and its landings walk to it', () => {
    const wk = makeWalker(triangle, 'Delta', 0, 5);
    const start = startWalk(wk);
    const all = explore(start, { forks: 40, tiles: 600 }).pw;
    const shortest = Math.min(...all.nodes.filter((x) => x.end?.status === 'closed').map((x) => x.end!.seen.length));
    const ahead = circuitsAhead(wk, start.stage, { choices: 20, forks: 200, tiles: 600 }, true);
    expect(ahead.min).toBe(shortest);
    let w = reducePossible(start, { type: 'run', cap: 5000 });
    for (const key of ahead.path!) w = reducePossible(reducePossible(w, { type: 'choose', key }), { type: 'run', cap: 5000 });
    expect(w.stage.status).toBe('closed');
    expect(w.stage.seen).toHaveLength(shortest);
  }, 60000);
});
