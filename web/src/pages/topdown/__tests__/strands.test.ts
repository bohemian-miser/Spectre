/**
 * Strands on the Top-down map against the Explorer's own analysis
 * (`analyze`, which welds and traces the flattened supertile): on a map of
 * one depth they must find the same circuits, and a circuit must name the
 * tiles it runs through.
 */
import { describe, expect, it } from 'vitest';
import {
  analyze,
  buildSystem,
  comboToMatchingIndices,
  flatten,
  levelMirror,
  normalizeMatchingVector,
  pathLength,
  type TopDownFamily,
} from '../../../core';
import { matchingVectorToRecord } from '../../../lib/matchingModel';
import { startMap, substitute, type TopDownMap } from '../map';
import { strandNear, traceMap, type StrandRule } from '../strands';

const SUBSET = [2, 5, 7, 8];
const rule = (family: TopDownFamily): StrandRule => ({
  subset: SUBSET,
  matching: normalizeMatchingVector(family, SUBSET, comboToMatchingIndices('spectre', SUBSET, '0100101100')),
});
const histogram = (lengths: number[]): Record<number, number> => {
  const out: Record<number, number> = {};
  for (const l of lengths) out[l] = (out[l] ?? 0) + 1;
  return out;
};
const ok = (r: ReturnType<typeof substitute>): TopDownMap => {
  if (!r.ok) throw new Error(r.reason);
  return r.map;
};

for (const family of ['hex', 'spectre'] as const) {
  describe(`${family}: strands on the map`, () => {
    it('a map of one depth has the circuits the Explorer finds', () => {
      const level = 3;
      const r = rule(family);
      const ours = traceMap(startMap(family, 'Delta', level), r);
      const ref = analyze({
        family,
        instances: flatten(buildSystem(family, level).Delta, levelMirror(level)),
        selected: new Set(r.subset),
        matchingIndexByType: matchingVectorToRecord(family, r.matching),
      });
      expect(ours.circuits).toBe(ref.circuits.length);
      expect(ours.open).toBe(ref.tails.length);
      expect(histogram(ours.strands.filter((s) => s.closed).map((s) => s.length))).toEqual(
        histogram(ref.circuits.map(pathLength)),
      );
    });

    it('substituting every tile gives the circuits of the deeper supertile', () => {
      const r = rule(family);
      let m = startMap(family, 'Psi', 2);
      m = ok(substitute(m, [...m.tiles.keys()]));
      const a = traceMap(m, r);
      const b = traceMap(startMap(family, 'Psi', 3), r);
      expect(histogram(a.strands.filter((s) => s.closed).map((s) => s.length))).toEqual(
        histogram(b.strands.filter((s) => s.closed).map((s) => s.length)),
      );
    });

    it('a circuit names its tiles, and substituting them leaves none of them behind', () => {
      const r = rule(family);
      const m = startMap(family, 'Delta', 3);
      const traced = traceMap(m, r);
      const circuit = traced.strands.filter((s) => s.closed).sort((x, y) => y.length - x.length)[0];
      expect(circuit.tiles.length).toBeGreaterThan(0);
      for (const id of circuit.tiles) expect(m.tiles.has(id)).toBe(true);
      // the strand passes through each tile it names: some point of it lies in the tile's box
      for (const id of circuit.tiles) {
        const p = m.tiles.get(id)!;
        const pad = 1e-9;
        expect(
          circuit.points.some(
            (q) => q.x >= p.min.x - pad && q.x <= p.max.x + pad && q.y >= p.min.y - pad && q.y <= p.max.y + pad,
          ),
        ).toBe(true);
      }
      const after = ok(substitute(m, circuit.tiles));
      for (const id of circuit.tiles) expect(after.tiles.has(id)).toBe(false);
    });

    it('strandNear finds a strand from one of its own points', () => {
      const traced = traceMap(startMap(family, 'Delta', 2), rule(family));
      const s = traced.strands[0];
      expect(strandNear(traced.strands, s.points[0], 1e-6)).not.toBeNull();
      expect(strandNear(traced.strands, { x: 1e6, y: 1e6 }, 1)).toBeNull();
    });
  });
}
