import { describe, expect, it } from 'vitest';
import { cancelBacktracks, harmonics, readingAt, sameReading, traceCircuits, type Circuit, type Visit } from '../harmonics';

const LEVEL = 5;
const circuits = traceCircuits([0, 2, 3, 4, 6, 8], '000000000', LEVEL, 'Delta');
const byLength = (n: number): Circuit => circuits.find((c) => c.length === n)!;

describe('readings of a circuit', () => {
  it('finds the circuits of the base combination of rule 023468 in a level-5 Delta', () => {
    expect(circuits.map((c) => c.length)).toEqual([9, 15, 27, 75, 189, 513]);
    expect(circuits.map((c) => c.height)).toEqual([2, 4, 2, 4, 4, 4]);
  });

  it('a reading covers every tile once: its tiles sum to the length, raw or with backtracks cancelled', () => {
    for (const c of circuits) {
      for (let k = 0; k < c.height; k++) {
        const raw = readingAt(c, k, LEVEL, false);
        expect(raw.reduce((s, v) => s + v.tiles, 0)).toBe(c.length);
        expect(cancelBacktracks(raw).reduce((s, v) => s + v.tiles, 0)).toBe(c.length);
      }
    }
  });

  it('has one raw visit per crossing above the level, counted straight from the strand', () => {
    for (const c of circuits) {
      for (let k = 0; k < c.height; k++) {
        const crossings = c.steps.filter((s) => s.level > k).length;
        expect(readingAt(c, k, LEVEL, false)).toHaveLength(crossings);
      }
    }
  });

  it('consecutive raw visits are to different supertiles, and no cancelled reading holds a backtrack', () => {
    for (const c of circuits) {
      for (let k = 0; k < c.height; k++) {
        const raw = readingAt(c, k, LEVEL, false);
        raw.forEach((v, i) => expect(v.id).not.toBe(raw[(i + 1) % raw.length].id));
        const cut = readingAt(c, k, LEVEL);
        if (cut.length > 2) cut.forEach((v, i) => expect(v.id).not.toBe(cut[(i + 2) % cut.length].id));
      }
    }
  });

  it('cancelling a backtrack keeps its tiles on the supertile returned to', () => {
    const v = (id: string, tiles: number): Visit => ({ id, tok: id, tiles });
    expect(cancelBacktracks([v('a', 1), v('b', 2), v('a', 3), v('c', 4)])).toEqual([v('a', 6), v('c', 4)]);
    expect(cancelBacktracks([v('b', 2), v('a', 3), v('c', 4), v('a', 1)])).toEqual([v('b', 2), v('a', 8)]);
  });

  it('a reading compares equal to itself read from another tile or the other way round', () => {
    const r = readingAt(byLength(27), 0, LEVEL);
    expect(sameReading(r, [...r.slice(5), ...r.slice(0, 5)])).toBe(true);
    expect(sameReading(r, [...r].reverse())).toBe(true);
    expect(sameReading(r, readingAt(byLength(9), 0, LEVEL))).toBe(false);
  });
});

describe('harmonics', () => {
  it('the 513-tile circuit read at level 2 is the 27-tile circuit, and at level 3 its level-1 reading', () => {
    expect(sameReading(readingAt(byLength(513), 2, LEVEL), readingAt(byLength(27), 0, LEVEL))).toBe(true);
    expect(sameReading(readingAt(byLength(513), 3, LEVEL), readingAt(byLength(27), 1, LEVEL))).toBe(true);
    expect(sameReading(readingAt(byLength(513), 2, LEVEL), readingAt(byLength(9), 0, LEVEL))).toBe(false);
  });

  it('lists 27 -> 513 and 9 -> 189, the same at every level', () => {
    const pairs = harmonics(circuits, LEVEL).map((h) => [h.a.length, h.b.length, h.levels.every(Boolean)]);
    expect(pairs).toEqual([[9, 189, true], [27, 513, true]]);
  });
}, 60000);

describe('readings from the renormalisation', () => {
  it('agree with the readings traced tile by tile on a patch, for every circuit at every level', async () => {
    const { CircuitShapes, distinctCircuits } = await import('../../src/pages/shapes/circuitShapes');
    const { readings: fromArcs, sameCyclic } = await import('../../src/pages/harmonics/readings');
    const cs = new CircuitShapes('hex', [0, 2, 3, 4, 6, 8], [0, 0, 0, 0, 0, 0, 0, 0, 0], LEVEL, 1, true);
    const born = distinctCircuits(cs, 64);
    expect(born.map((b) => b.length).sort((a, b) => a - b)).toEqual(circuits.map((c) => c.length));
    for (const b of born) {
      const traced = circuits.find((c) => c.length === b.length)!;
      expect(b.level).toBe(traced.height);
      const arcs = fromArcs(cs, b.circuit);
      for (let k = 0; k < b.level; k++) {
        const patch = readingAt(traced, k, LEVEL);
        expect(arcs[k].raw).toBe(readingAt(traced, k, LEVEL, false).length);
        expect(sameCyclic(arcs[k].tokens, patch.map((v) => v.tok))).toBe(true);
      }
    }
  });
}, 60000);
