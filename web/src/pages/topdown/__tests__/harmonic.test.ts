import { describe, expect, it } from 'vitest';
import { comboToMatchingIndices } from '../../../core';
import { descendantOutlines, findHarmonic, growTwice, neighboursOf, readUp } from '../harmonic';
import { startMap } from '../map';
import { traceMap } from '../strands';
import type { StrandRule } from '../../../lib/strandRule';

const SUBSET = [0, 2, 3, 4, 6, 8];
const rule = (combo: string): StrandRule => ({ subset: SUBSET, matching: comboToMatchingIndices('hex', SUBSET, combo) });

describe('a circuit grown twice on the Top-down map', () => {
  it('reads up as itself: the 18-tile triangle of 023468-000100000 grows into the 441 with three loops round junctions', () => {
    const map = startMap('hex', 'Delta', 4);
    const r = rule('000100000');
    const before = traceMap(map, r);
    const small = before.strands.find((s) => s.closed && s.length === 18)!;
    expect(small).toBeDefined();
    expect(small.route).toHaveLength(18);
    expect(small.tiles).toHaveLength(18);
    // Six neighbours per tile at most, all on the map at the same depth, none the circuit's own.
    const margin = neighboursOf(map, small.tiles);
    expect(margin.length).toBeGreaterThan(6);
    expect(margin.some((id) => small.tiles.includes(id))).toBe(false);
    for (const id of margin) expect(map.tiles.get(id)?.depth).toBe(4);

    const grown = growTwice(map, small.tiles);
    if (!grown.ok) throw new Error(grown.reason);
    expect(grown.map.tiles.size).toBeGreaterThan(map.tiles.size);
    const after = traceMap(grown.map, r);
    const found = findHarmonic(after.strands, small.route, 4);
    expect(found).not.toBeNull();
    const b = after.strands[found!.strand];
    expect(b.closed).toBe(true);
    expect(b.depth).toBe(6);
    expect(b.length).toBe(441);
    expect(found!.exact).toBe(true);
    expect(found!.loops).toBe(3);
    expect(found!.covered).toBe(18);
    // Its reading two levels up, loops cancelled, is the small circuit's route.
    const read = readUp(b.route, 2, new Set(small.tiles));
    expect(read.ids).toHaveLength(18);
    // One outline per tile of the small circuit, each closed round its 62 or so descendants.
    const outlines = descendantOutlines(grown.map, small.tiles, 2);
    expect(outlines).toHaveLength(18);
    for (const o of outlines) expect(o.length).toBeGreaterThan(10);
  }, 60000);

  it('in the base combination the 27-tile triangle grows into the 513 with no loops', () => {
    const map = startMap('hex', 'Delta', 4);
    const r = rule('000000000');
    const small = traceMap(map, r).strands.find((s) => s.closed && s.length === 27)!;
    const grown = growTwice(map, small.tiles);
    if (!grown.ok) throw new Error(grown.reason);
    const after = traceMap(grown.map, r);
    const found = findHarmonic(after.strands, small.route, 4)!;
    expect(after.strands[found.strand].length).toBe(513);
    expect(found.exact).toBe(true);
    expect(found.loops).toBe(0);
  }, 60000);
});
