/**
 * The walker's reducer against `walkStrand` (the recursive neighbour
 * algorithm on full slot paths): a walk started on a circuit's tile closes
 * after the same tiles in the same order. The longest circuit of a level-4
 * Delta under the triangle combination has 441 tiles; two of its sides are
 * the same word and the third walks one 7-tile block backwards.
 */
import { describe, expect, it } from 'vitest';

import { addressFromId, comboToMatchingIndices, leafOrder, sideRuns, walkStrand, letter } from '../../../core';
import { parentOptions } from '../../transducer/world';
import { initialWalk, longestCircuit, reduceWalk, type Pattern } from '../walk';

const triangle: Pattern = { subset: [0, 2, 3, 4, 6, 8], combo: '000100000' };

function matchingOf(p: Pattern): Record<string, number> {
  const idx = comboToMatchingIndices('hex', p.subset, p.combo);
  return Object.fromEntries(leafOrder('hex').map((t, i) => [t, idx[i] ?? 0]));
}

describe('circuit walker', () => {
  it('closes the longest circuit of a level-4 Delta after as many tiles as walkStrand', () => {
    const best = longestCircuit(triangle, 'Delta', 4)!;
    const ref = walkStrand(triangle.subset, matchingOf(triangle), { address: addressFromId('Delta', best.id), entry: best.edge });
    expect(ref.end).toBe('circuit');
    expect(best.length).toBe(ref.states.length);
    let w = reduceWalk(initialWalk('Delta'), { type: 'place', world: { root: 'Delta', level: 4, startId: best.id }, edge: best.edge });
    w = reduceWalk(w, { type: 'run', pattern: triangle, cap: 100000 });
    expect(w.closed).toBe(true);
    expect(w.waiting).toBeNull();
    expect(w.steps.length).toBe(ref.states.length);
    // the same tiles in the same order
    expect(w.board.trail).toEqual(ref.states.map((s) => [...s.address.path].reverse().map((l) => l.slot).join('.')));
    const { runs } = sideRuns(w.steps.map((s) => letter(s.type, s.entry, s.exit)));
    expect(runs).toHaveLength(1);
    expect(runs[0].to - runs[0].from + 1).toBe(7);
    expect(runs[0].reversed).toBe(true);
  });

  it('waits for an ancestor when a crossing leaves the board, and goes on once one is chosen', () => {
    // A single Delta: every crossing leaves it.
    let w = reduceWalk(initialWalk('Delta'), { type: 'startEdge', edge: 0 });
    w = reduceWalk(w, { type: 'step', pattern: triangle });
    expect(w.waiting).not.toBeNull();
    expect(w.steps).toHaveLength(0);
    const lands = parentOptions(w.board).find((o) => o.landing !== null)!;
    w = reduceWalk(w, { type: 'grow', parent: lands.parent, slot: lands.slot });
    expect(w.waiting).toBeNull();
    expect(w.board.world.level).toBe(1);
    expect(w.steps).toHaveLength(1);
    expect(w.board.selected).toBe(lands.landing);
  });
});
