/**
 * Seams above the top of a stack, checked against `neighbour()` on a deeper
 * stack: cut every tile's address of a level-4 supertile at level 2; where a
 * crossing leaves the level-2 root but settles higher up, `across` must offer
 * the true tile across (cut at level 2), and growing its pair by the true
 * parents must follow the true far ancestors until the two sides meet in the
 * true common ancestor. Every other tile offered must be the tile across in
 * some stack: the one that closes its seam in the fewest parents.
 */
import { describe, expect, it } from 'vitest';
import {
  HEX_TYPES, across, edgeClass, addressFromId, buildSystem, flatten, growPair, meetingOf, neighbour, pairAlive, sameAddress,
  type Address, type HexType, type Pair,
} from '..';

const cut = (a: Address, level: number): Address => ({ leaf: a.leaf, path: a.path.slice(0, level) });

describe('seams', () => {
  it('offer the true tile across, and grow to the true common ancestor', () => {
    let checked = 0;
    let most = 0;
    for (const root of HEX_TYPES) {
      for (const inst of flatten(buildSystem('hex', 4)[root])) {
        const full = addressFromId(root as HexType, inst.id);
        for (let e = 0; e < 6; e++) {
          const nb = neighbour(full, e);
          if (!nb.ok || nb.level <= 2) continue;
          const near = cut(full, 2);
          const offers = across(near, e);
          most = Math.max(most, offers.length);
          const truth = offers.filter((o) => sameAddress(o.address, cut(nb.address, 2)) && o.edge === nb.edge);
          expect(truth.length).toBe(1);
          // every offer is real: closing its seam in a common ancestor, neighbour() finds it there
          for (const o of offers) {
            const m = meetingOf(o.pair)!;
            const top = m.links[m.links.length - 1].parent;
            const nearUp = { leaf: near.leaf, path: [...near.path, ...m.links] };
            const farUp = { leaf: o.address.leaf, path: [...o.address.path, ...m.farLinks, { slot: m.farSlot, parent: top }] };
            const there = neighbour(nearUp, e);
            expect(there.ok && sameAddress(there.address, farUp) && there.edge === o.edge).toBe(true);
          }
          // grow by the true parents: the pair follows the true far ancestors until they meet
          let pair: Pair = truth[0].pair;
          for (let k = 2; k < nb.level; k++) {
            const grown = growPair(pair, full.path[k]);
            if (k === nb.level - 1) {
              expect(grown).toContainEqual({ kind: 'meet', farSlot: nb.address.path[k].slot });
            } else {
              const next = grown.find((g) => g.kind === 'pair' && g.farLink.slot === nb.address.path[k].slot && g.farLink.parent === nb.address.path[k].parent);
              expect(next).toBeDefined();
              pair = (next as { pair: Pair }).pair;
              expect(pairAlive(pair)).toBe(true);
            }
          }
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(most).toBeLessThanOrEqual(8);
  }, 30000);

  it('of 264 pairs of edges with opposite classes, 101 are live, and each can meet within 3 levels', () => {
    let pairs = 0, liveCount = 0;
    for (const T of HEX_TYPES) for (let j = 0; j < 6; j++) for (const U of HEX_TYPES) for (let jj = 0; jj < 6; jj++) {
      if (edgeClass(U, jj) !== -edgeClass(T, j)) continue;
      pairs++;
      const p = { near: T, j, far: U, jj };
      if (!pairAlive(p)) continue;
      liveCount++;
      const m = meetingOf(p)!;
      expect(m.links.length).toBeLessThanOrEqual(3);
      expect(m.links.length).toBe(m.farLinks.length + 1);
    }
    expect([pairs, liveCount]).toEqual([264, 101]);
  });
});
