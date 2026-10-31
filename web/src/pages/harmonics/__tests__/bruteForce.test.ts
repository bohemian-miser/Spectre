/**
 * Brute force against the full build: harmonics found two levels up with
 * the routes worked out above a low base are the circuits the build closes
 * there (length, family and word key); readings match `readCircuit`'s; a
 * climbed strand's arcs and closing match the full tables.
 */
import { describe, expect, it } from 'vitest';

import { readCircuit, wordKey } from '../../foundations/foundations';
import { CircuitShapes, familyOf, type BornCircuit } from '../../shapes/circuitShapes';
import { climb, harmonicAbove, longestArc, parentOf, readWalked } from '../bruteForce';
import { SparseRoutes, TYPES, typeIndex } from '../sparseRoutes';

const RULE = [0, 2, 3, 4, 6, 8];
const build = (combo: string, level: number) => new CircuitShapes('hex', RULE, [...combo].map((ch) => parseInt(ch, 36)), level, 1, true);
const bornAt = (cs: CircuitShapes, level: number, length: number, family?: string): BornCircuit =>
  cs.born.find((c) => c.level === level && c.length === length && (!family || familyOf(c) === family))!;

describe('the harmonics of 023468 · 140000001, from a base at level 5', () => {
  const cs = build('140000001', 8);
  const R = new SparseRoutes(cs, 5);

  it('reads a built circuit as readCircuit does', () => {
    for (const [level, length] of [[6, 14679], [7, 103851], [8, 21705]]) {
      const c = bornAt(cs, level, length);
      const want = readCircuit(cs, c, 0, 3e6);
      const got = readWalked(R, R.walked(c), 0, 3e6);
      expect(got.lowest).toBe(want.lowest);
      expect(got.raw).toEqual(want.raw);
      expect(got.levels.map((x) => x?.join())).toEqual(want.levels.map((x) => x?.join()));
    }
  });

  it('finds the 14,679 from the 303, then the 734,256 from what it found', () => {
    const a = bornAt(cs, 4, 303);
    const first = harmonicAbove(R, R.walked(a), { floor: 2 });
    expect(first.found).toMatchObject({ level: 6, type: a.type, length: 14679, family: '147' });
    const b6 = bornAt(cs, 6, 14679, '147');
    expect(first.found!.key).toBe(wordKey(cs, b6));
    const second = harmonicAbove(R, first.found!, { floor: 2 });
    expect(second.found).toMatchObject({ level: 8, type: a.type, length: 734256, family: '147' });
    expect(second.found!.agreed).toBeLessThanOrEqual(2);
    const b8 = bornAt(cs, 8, 734256, '147');
    expect(second.found!.key).toBe(wordKey(cs, b8));
    expect(second.work.calls).toBeGreaterThan(0);
  }, 60000);
});

describe('the harmonic of 023468 · 000100000’s 441', () => {
  it('is the 8,784 at level 6, from a base at level 4', () => {
    const cs = build('000100000', 6);
    const R = new SparseRoutes(cs, 4);
    const a = bornAt(cs, 4, 441);
    const r = harmonicAbove(R, R.walked(a), { floor: 1 });
    expect(r.found).toMatchObject({ level: 6, length: 8784, family: familyOf(a) });
    expect(r.found!.key).toBe(wordKey(cs, bornAt(cs, 6, 8784)));
  });

  it('then the 175,221 at level 8, every level of it in the full tables', () => {
    const cs = build('000100000', 8);
    const R = new SparseRoutes(cs, 8);
    const r = harmonicAbove(R, R.walked(bornAt(cs, 6, 8784)), { floor: 1 });
    expect(r.found).toMatchObject({ level: 8, length: 175221, family: '013467' });
    expect(r.windows).toBe(1);
    expect(r.work.calls).toBe(0);
    expect(r.found!.key).toBe(wordKey(cs, bornAt(cs, 8, 175221)));
  });
});

describe('climbing a strand', () => {
  it('meets the full tables’ arcs at every level and closes where walkAbove closes it', () => {
    const cs = build('140000001', 9);
    const R = new SparseRoutes(cs, 4);
    // the full tables' place for an address
    const placeAt = (n: number, a: number): number => {
      if (n <= R.base) return a;
      const step = placeAt(n - 1, Math.floor(a / 8)) * 8 + (a % 8);
      const p = cs.levels[n].Delta.level.under.indexOf(step);
      if (p < 0) throw new Error(`no place at level ${n} for ${a}`);
      return p;
    };
    const D = typeIndex.get('Delta')!;
    const start = longestArc(R, 4, D);
    const c = climb(R, 4, D, start, 9);
    expect(c.levels[0]).toEqual({ level: 4, type: 'Delta', length: cs.levels[4].Delta.len(start), place: start });
    expect(c.levels.length).toBeGreaterThan(1);
    c.levels.forEach((at, q) => {
      const p = placeAt(at.level, at.place);
      expect(cs.levels[at.level][at.type].len(p)).toBe(at.length);
      const up = parentOf(R, typeIndex.get(at.type)!);
      const w = cs.walkAbove(TYPES[up.type], p * 8 + up.slot, at.level);
      const next = c.levels[q + 1];
      if (next) {
        // the arc a level up runs through this one
        expect(w.closed).toBe(false);
        const k = placeAt(next.level, next.place);
        const via = cs.enters(next.level, next.type, k).filter((e) => e.slot === up.slot).map((e) => e.k);
        const T = cs.levels[at.level][at.type];
        expect(via.some((x) => x === p || x === T.mate(p))).toBe(true);
      } else if (c.closed) {
        expect(w).toMatchObject({ closed: true, length: c.closed.length });
        expect(c.closed.level).toBe(at.level + 1);
      }
    });
  });

  it('stops at the routes’ limit, open', () => {
    const cs = build('140000001', 8);
    const R = new SparseRoutes(cs, 8);
    R.limit = 1000;
    const D = typeIndex.get('Delta')!;
    const c = climb(R, 8, D, longestArc(R, 8, D), 16);
    expect(c.closed).toBeNull();
    expect(c.limitedAt).toBeGreaterThan(9);
    expect(c.levels[c.levels.length - 1].level).toBe(c.limitedAt! - 1);
    expect(c.work.calls).toBe(1000);
  });
});

