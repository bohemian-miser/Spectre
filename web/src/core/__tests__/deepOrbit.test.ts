/**
 * circuit-classes/deep-orbit.ts renormalises the strands supertile by
 * supertile instead of tracing a rooted patch. These tests check it against
 * the rooted patch: at levels 3 and 4 the circuits a Delta supertile holds,
 * their lengths and the arcs that leave it must match the strand graph, on
 * every family, with class 0 included.
 */
import { describe, expect, it } from 'vitest';
import { runOrbit, TYPES } from '../../../circuit-classes/deep-orbit';
import {
  buildStrandGraph, strandComponents, strandWorkspace, comboToMatchingIndices, nonCrossingForTile, leafOrder,
  type TileFamilyId,
} from '..';

const DELTA = TYPES.indexOf('Delta');

/** Circuits and open strands of the rooted level-`level` Delta patch, from the strand graph. */
function traced(family: TileFamilyId, rule: string, combo: string, level: number) {
  const subset = [...rule].map(Number);
  const g = buildStrandGraph(family, subset, level);
  const idx = comboToMatchingIndices(family, subset, combo);
  const digits = leafOrder(family).map((t, i) => Math.max(0, nonCrossingForTile(family, t, new Set(subset)).indexOf(idx[i])));
  const c = strandComponents(g, digits, strandWorkspace(g));
  let closed = 0, open = 0, closedSegs = 0, maxClosed = 0, maxOpen = 0, openSegs = 0;
  const lengths = new Map<number, number>();
  for (let i = 0; i < c.n; i++) {
    expect(c.junc[i]).toBe(0);
    if (c.ends[i] === 0) {
      closed++;
      closedSegs += c.segs[i];
      maxClosed = Math.max(maxClosed, c.segs[i]);
      lengths.set(c.segs[i], (lengths.get(c.segs[i]) ?? 0) + 1);
    } else {
      open++;
      openSegs += c.segs[i];
      maxOpen = Math.max(maxOpen, c.segs[i]);
    }
  }
  return { tiles: g.nTiles, closed, open, closedSegs, maxClosed, maxOpen, openSegs, lengths };
}

const CASES: [TileFamilyId, string, string][] = [
  ['spectre', '023678', '0311000000'], // class 0: the dot sits on a vertex
  ['spectre', '2578', '0100101100'],
  ['spectre', '2578', '0000001100'],
  ['hex', '03456', '000000000'],
  ['hex', '258', '0100101100'],
  ['hat', '2578', '0110101100'],
  ['turtle', '023678', '0200000010'],
  ['spectre-iso', '0234678', '0000000000'],
];

describe('deep orbit against the rooted patch', () => {
  for (const [family, rule, combo] of CASES) {
    it(`${family} ${rule}-${combo}: the Delta supertile's circuits and arcs match at levels 3 and 4`, () => {
      const o = runOrbit(family, [...rule].map(Number), combo, 4);
      for (const level of [3, 4]) {
        const ref = traced(family, rule, combo, level);
        const d = o.levels[level].perType[DELTA];
        expect(d.tiles).toBe(ref.tiles);
        expect(d.closed).toBe(ref.closed);
        expect(d.closedSegs).toBe(ref.closedSegs);
        expect(d.dots / 2).toBe(ref.open);
        expect(d.arcMax).toBe(ref.maxOpen);
        expect(d.arcSum).toBe(ref.openSegs);
        expect(d.segs).toBe(ref.closedSegs + ref.openSegs);
        expect(d.innerOpen).toBe(0);
      }
      // The circuits born inside every Delta supertile up to level 4 are the
      // circuits of the rooted patch: the births, counted down the tree.
      const ref = traced(family, rule, combo, 4);
      const inside = new Map<number, number>();
      // count of level-k supertiles of each type inside the level-4 Delta
      const counts: Record<string, number>[] = [{ Delta: 1 }];
      for (let k = 1; k <= 4; k++) {
        const next: Record<string, number> = {};
        for (const [T, n] of Object.entries(counts[k - 1])) {
          for (const child of ({
            Gamma: ['Pi', 'Delta', 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'],
            Delta: ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
            Theta: ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
            Lambda: ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
            Xi: ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
            Pi: ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
            Sigma: ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Lambda', 'Gamma'],
            Phi: ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
            Psi: ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
          } as Record<string, string[]>)[T]) next[child] = (next[child] ?? 0) + n;
        }
        counts.push(next);
      }
      // a level-j supertile of type T sits (4 - j) levels below the root: counts[4 - j][T] of them
      for (let j = 1; j <= 4; j++) {
        for (const [T, , len, n] of o.levels[j].births) {
          const copies = counts[4 - j][T] ?? 0;
          inside.set(len, (inside.get(len) ?? 0) + n * copies);
        }
      }
      expect(Object.fromEntries([...inside].sort((a, b) => a[0] - b[0]))).toEqual(Object.fromEntries([...ref.lengths].sort((a, b) => a[0] - b[0])));
    });
  }

  it('hex 128-010100000 (the FASS curve): no circuit at any level to 8, the Psi supertile one arc, every tile visited', () => {
    const o = runOrbit('hex', [1, 2, 8], '010100000', 8);
    for (const r of o.levels) expect(r.births).toEqual([]);
    const psi = o.levels[8].perType[TYPES.indexOf('Psi')];
    expect(psi.dots).toBe(2);
    expect(psi.arcMax).toBe(psi.segs);
    expect(psi.segs).toBeGreaterThanOrEqual(psi.tiles); // every tile carries at least one chord
  });

  it('the boundary signature tells pairings apart only above the level where they differ', () => {
    // 2578-0000101100 and 2578-0010101100 share every boundary state from level 2 on (they differ
    // inside level-1 supertiles only); 2578-0110101100 never joins them.
    const a = runOrbit('spectre', [2, 5, 7, 8], '0000101100', 4);
    const b = runOrbit('spectre', [2, 5, 7, 8], '0010101100', 4);
    const c = runOrbit('spectre', [2, 5, 7, 8], '0110101100', 4);
    expect(a.levels[1].sig).not.toBe(b.levels[1].sig);
    for (const k of [2, 3, 4]) {
      expect(a.levels[k].sig).toBe(b.levels[k].sig);
      expect(a.levels[k].sig).not.toBe(c.levels[k].sig);
    }
  });
});
