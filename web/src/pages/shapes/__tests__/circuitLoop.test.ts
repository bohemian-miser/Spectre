/**
 * `circuitLoop` against `tileLoop(shape(c, 0))`, the circuit drawn tile by
 * tile: for every circuit born up to level 6 of two combinations, the same
 * tile count, radius of gyration and sampled loop; and `distinctCircuits`
 * against the same selection made from the tile-by-tile loops.
 */
import { describe, expect, it } from 'vitest';

import { CircuitShapes, circuitLoop, distinctCircuits, familyOf, tileLoop } from '../circuitShapes';

const RULE = [0, 2, 3, 4, 6, 8];

/** `distinctCircuits` with every loop taken from the tile-by-tile drawing. */
function distinctFromTiles(cs: CircuitShapes, samples: number) {
  const top = new Map<string, number>();
  for (const c of cs.born) top.set(familyOf(c), Math.max(top.get(familyOf(c)) ?? 0, c.length));
  const order = [...cs.born].sort((a, b) => a.level - b.level || b.length - a.length);
  const out: { family: string; aliases: string[]; level: number; type: string; length: number; rg: number }[] = [];
  for (const c of order) {
    const loop = tileLoop(cs.shape(c, 0), samples);
    const family = familyOf(c);
    const twin = out.find((o) => o.length === c.length && Math.abs(o.rg - loop.rg) <= 1e-6 * loop.rg);
    if (twin) {
      if (twin.family !== family && !twin.aliases.includes(family)) twin.aliases.push(family);
    } else out.push({ family, aliases: [], level: c.level, type: c.type, length: c.length, rg: loop.rg });
  }
  const rank = (f: string) => -(top.get(f) ?? 0);
  return out.sort((a, b) => rank(a.family) - rank(b.family) || a.family.localeCompare(b.family) || a.level - b.level || b.length - a.length);
}

describe.each(['000100000', '140000001'])('circuitLoop of 023468 / %s', (combo) => {
  const cs = new CircuitShapes('hex', RULE, [...combo].map((c) => parseInt(c, 36)), 6, 1, true);

  it('gives the tile-by-tile loop of every circuit born', () => {
    expect(cs.born.some((c) => c.length > 1000)).toBe(true);
    for (const c of cs.born) {
      expect(cs.circuitSums(c)[0]).toBe(c.length);
      for (const samples of [1, 64, c.length + 3]) {
        const want = tileLoop(cs.shape(c, 0), samples);
        const got = circuitLoop(cs, c, samples);
        expect(got.n).toBe(want.n);
        expect(Math.abs(got.rg - want.rg)).toBeLessThan(1e-9 * want.rg);
        for (let i = 0; i < want.xy.length; i++) expect(Math.abs(got.xy[i] - want.xy[i])).toBeLessThan(1e-9);
      }
    }
  });

  it('keeps the same distinct circuits', () => {
    const got = distinctCircuits(cs, 64).map((d) => ({ family: d.family, aliases: d.aliases, level: d.level, type: d.type, length: d.length }));
    const want = distinctFromTiles(cs, 64).map(({ rg: _, ...d }) => d);
    expect(got).toEqual(want);
  });
});
