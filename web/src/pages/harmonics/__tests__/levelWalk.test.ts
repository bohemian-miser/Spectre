/**
 * Members drawn from a walk of their visits (`levelWalk.ts`), against the
 * visits listed level by level with a frame each (`visitsWithFrames`): in
 * full, the same supertiles, outlines and line, number for number, as the
 * listed visits give; sampled, exactly every n-th visit of the list.
 */
import { describe, expect, it } from 'vitest';

import { CircuitShapes } from '../../shapes/circuitShapes';
import { arcsOf, circuitDescent, levelLine, visitsIn, walkLevel } from '../levelWalk';
import { CIRCUIT_POINTS, drawSide, lineOf, outlinePts, sideAt, SUPERTILE_CAP, supertilesOf, visitsWithFrames } from '../pairView';
import { transPt } from '../../../core';
import { thin } from '../harmonicsJob';
import { harmonicAbove } from '../bruteForce';
import { bornOfFound, Placed, SparseRows } from '../found';
import { SparseRoutes } from '../sparseRoutes';

const RULE = [0, 2, 3, 4, 6, 8];
const build = (combo: string, level: number) => new CircuitShapes('hex', RULE, [...combo].map((ch) => parseInt(ch, 36)), level, 1, true);

describe.each([
  ['000100000', 6],
  ['140000001', 7],
])('023468 / %s drawn in full', (combo, top) => {
  const cs = build(combo, top);
  const circuits = cs.born.filter((c) => c.level >= 2);

  it('draws every circuit at every level as its listed visits do: the same supertiles, outlines and line', () => {
    let levels = 0;
    for (const c of circuits) {
      for (let level = 0; level < c.level; level++) {
        const { v, xform } = visitsWithFrames(cs, c, level);
        if (v.type.length > 120000) continue;
        const want = supertilesOf(cs, v, xform, c.level - level, new Set());
        const line = lineOf(cs.shape(c, level));
        const side = sideAt(cs, c, level, null);
        expect(side.visits).toBe(v.type.length);
        expect(side.every).toBe(1);
        expect(side.count).toBe(want.count);
        expect(side.supertiles.map((s) => [s.path, s.type])).toEqual(want.supertiles.map((s) => [s.path, s.type]));
        side.supertiles.forEach((s, i) => expect(s.outline).toEqual(want.supertiles[i].outline));
        expect(side.circuit).toEqual(line);
        levels++;
      }
    }
    expect(levels).toBeGreaterThan(20);
  }, 120000);

  it('draws a line for a view through the listed crossings, thinned as a closed line is', () => {
    const c = [...circuits].sort((a, b) => b.length - a.length)[0];
    for (const budget of [50, 1000, 1e9]) {
      const all = cs.shape(c, 0);
      const closed = new Float64Array(2 * all.length + 2);
      all.forEach((p, i) => closed.set([p.x, p.y], 2 * i));
      closed.set([all[0].x, all[0].y], 2 * all.length);
      const got = levelLine(circuitDescent(arcsOf(cs), c), 0, budget);
      expect(got.capped).toBe(all.length + 1 > 2 * budget);
      expect(got.pts).toEqual(got.capped ? thin(closed, budget) : closed);
    }
  });
});

describe('a member found above the build', () => {
  it('draws as its rows list it, the routes above the tables walked', () => {
    const full = build('000100000', 6);
    const R0 = new SparseRoutes(full, 4);
    const f = harmonicAbove(R0, R0.walked(full.born.find((c) => c.level === 4 && c.length === 441)!), { floor: 1 }).found!;
    const cs = build('000100000', 4);
    const R = new SparseRoutes(cs, cs.maxLevel);
    const born = bornOfFound(R, { level: f.level, type: f.type, length: f.length, family: f.family, deep: f.deep });
    const rows = new SparseRows(cs, R, born);
    const placed = new Placed(cs, rows);
    const d = circuitDescent(arcsOf(cs, R), born);
    for (let level = 0; level < born.level; level++) {
      const v = rows.visits(level);
      const want = supertilesOf(cs, v, placed.frame(level), born.level - level, new Set());
      const side = drawSide(d, level);
      expect(side.visits).toBe(v.type.length);
      expect(side.count).toBe(want.count);
      expect(side.supertiles.map((s) => [s.path, s.type])).toEqual(want.supertiles.map((s) => [s.path, s.type]));
      side.supertiles.forEach((s, i) => expect(s.outline).toEqual(want.supertiles[i].outline));
      const all = placed.line(level);
      const m = all.length / 2;
      const line = m <= CIRCUIT_POINTS ? all : Float64Array.from({ length: 2 * CIRCUIT_POINTS }, (_, q) => all[2 * Math.floor((Math.floor(q / 2) * m) / CIRCUIT_POINTS) + (q % 2)]);
      expect(side.circuit).toEqual(line);
    }
  }, 60000);
});

describe('a member sampled', () => {
  const cs = build('140000001', 7);
  const c = cs.born.find((x) => x.level === 7 && x.length === 103851)!;

  it('takes exactly every 1,000th visit of the full list, from the first: its supertiles, outlines and crossings', () => {
    const level = 0;
    const { v, xform } = visitsWithFrames(cs, c, level);
    const d = circuitDescent(arcsOf(cs), c);
    expect(visitsIn(d, level)).toBe(v.type.length);
    const w = walkLevel(d, level, { cap: Infinity, points: Infinity, sampleAbove: 1000, every: 1000, outline: (t) => outlinePts(cs, level, t) });
    expect(w.every).toBe(1000);
    const picked = Array.from({ length: Math.ceil(v.type.length / 1000) }, (_, q) => 1000 * q);
    // the line: each picked visit's crossing, placed by its frame
    const line = picked.flatMap((i) => {
      const p = transPt(xform[i], cs.levels[level][v.type[i]].pt(v.cross[i]));
      return [p.x, p.y];
    });
    expect(Array.from(w.line)).toEqual(line);
    // the supertiles: the picked visits' own, first met first
    const firsts = new Map<number, number>();
    for (const i of picked) if (!firsts.has(v.id[i])) firsts.set(v.id[i], i);
    expect(w.count).toBe(firsts.size);
    expect(w.met.map((m) => m.id)).toEqual([...firsts.keys()]);
    w.met.forEach((m) => {
      const i = firsts.get(m.id)!;
      expect(m.type).toBe(v.type[i]);
      const want = outlinePts(cs, level, m.type).flatMap((p) => {
        const q = transPt(xform[i], p);
        return [q.x, q.y];
      });
      expect(Array.from(m.outline)).toEqual(want);
    });
  }, 60000);

  it('draws a side over the threshold through the sampled visits, the line thinned and the supertiles capped as in full', () => {
    const d = circuitDescent(arcsOf(cs), c);
    const full = walkLevel(d, 0, { cap: Infinity, points: Infinity, sampleAbove: 1000, every: 1000, outline: (t) => outlinePts(cs, 0, t) });
    const side = drawSide(d, 0, undefined, { above: 1000, every: 1000 });
    expect(side.every).toBe(1000);
    expect(side.visits).toBe(103851);
    expect(side.count).toBe(full.count);
    expect(side.supertiles.length).toBe(Math.min(SUPERTILE_CAP, full.count));
    expect(side.circuit.length).toBe(2 * Math.min(CIRCUIT_POINTS, Math.ceil(103851 / 1000)));
    // under the threshold, every visit
    expect(drawSide(d, 0).every).toBe(1);
  }, 60000);
});
