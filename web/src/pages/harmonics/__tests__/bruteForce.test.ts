/**
 * Brute force against the full build: harmonics found two levels up with
 * the routes worked out above a low base are the circuits the build closes
 * there (length, family and word key); readings match `readCircuit`'s; a
 * climbed strand's arcs and closing match the full tables.
 */
import { describe, expect, it } from 'vitest';

import { readCircuit, wordKey } from '../../foundations/foundations';
import { CircuitShapes, familyOf, type BornCircuit } from '../../shapes/circuitShapes';
import { climb, harmonicAbove, longestArc, parentOf, readWalked, type Progress } from '../bruteForce';
import { describeResult } from '../bruteJob';
import { bornOfFound, Placed, SparseRows } from '../found';
import { ARC_POINTS, type SearchPicture } from '../searchPicture';
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

  it('draws the search: the harmonic arc is the 8,784 drawn through its level-5 visits, every other arc leaves the Delta or closes otherwise', () => {
    const cs = build('000100000', 6);
    const R = new SparseRoutes(cs, 4);
    const a = bornAt(cs, 4, 441);
    const seen: Progress[] = [];
    const pictures: SearchPicture[] = [];
    const r = harmonicAbove(R, R.walked(a), {
      floor: 1,
      onProgress: (p, draw) => {
        seen.push(p);
        if (seen.length % 5 === 0) pictures.push(draw());
      },
    });
    expect(seen.length).toBeGreaterThan(0);
    const pic = r.picture;
    expect(pic).toMatchObject({ level: 6, type: a.type });
    expect(pic.children.map((c) => c.slot)).toEqual(cs.childTypes(6, a.type).map((c) => c.pos));
    expect(pic.windows.length).toBeGreaterThan(0);
    expect(pic.windowCount).toBe(r.windows);
    // a window is the member's level-1 visit's place two levels up: the level-3 supertile at the same slot path
    expect(pic.windows.every((w) => w.level === 3)).toBe(true);
    // the arcs followed are the ones counted, each ended one way
    const total = Object.values(pic.counts).reduce((x, y) => x + y, 0);
    expect(total).toBe(r.tried);
    expect(pic.counts.following).toBe(0);
    expect(pic.counts.closed).toBe(0);
    expect(pic.counts.harmonic).toBe(1);
    expect(pic.counts.open).toBe(r.open);
    // the others are listed once per length and family; the picture counts every arc
    expect(pic.counts.other + pic.counts.differs).toBeGreaterThanOrEqual(r.others.length);
    // the harmonic's line is the 8,784 drawn at level 5 by the tables (its rows over routes based at the tables' top): the crossing each visit enters by, in order, thinned alike
    const h = pic.arcs.find((x) => x.end === 'harmonic')!;
    expect(h.length).toBe(8784);
    const R6 = new SparseRoutes(cs, 6);
    const b = bornOfFound(R6, { ...r.found!, deep: r.found!.deep });
    const full = new Placed(cs, new SparseRows(cs, R6, b)).line(5);
    expect(h.steps).toBe(full.length / 2);
    const n = full.length / 2;
    const want: number[] = [];
    if (n <= ARC_POINTS) for (let i = 0; i < n; i++) want.push(full[2 * i], full[2 * i + 1]);
    else {
      for (let j = 0; j < ARC_POINTS - 1; j++) {
        const i = Math.floor((j * (n - 1)) / (ARC_POINTS - 1));
        want.push(full[2 * i], full[2 * i + 1]);
      }
      want.push(full[2 * n - 2], full[2 * n - 1]);
    }
    expect(Array.from(h.pts).map((v) => +v.toFixed(9))).toEqual(want.map((v) => +v.toFixed(9)));
    // every point of every arc sits on a child's outline or seam: within the Delta's outline
    const xs = Array.from(pic.outline).filter((_, i) => i % 2 === 0), ys = Array.from(pic.outline).filter((_, i) => i % 2 === 1);
    const x0 = Math.min(...xs) - 1e-9, x1 = Math.max(...xs) + 1e-9, y0 = Math.min(...ys) - 1e-9, y1 = Math.max(...ys) + 1e-9;
    for (const arc of pic.arcs) {
      expect(arc.pts.length).toBeLessThanOrEqual(2 * ARC_POINTS);
      for (let i = 0; i < arc.pts.length; i += 2) {
        expect(arc.pts[i]).toBeGreaterThanOrEqual(x0);
        expect(arc.pts[i]).toBeLessThanOrEqual(x1);
        expect(arc.pts[i + 1]).toBeGreaterThanOrEqual(y0);
        expect(arc.pts[i + 1]).toBeLessThanOrEqual(y1);
      }
    }
    // the pictures drawn on the way grow into the last
    for (const q of pictures) {
      expect(q.windowCount).toBeLessThanOrEqual(pic.windowCount);
      expect(q.arcs.length).toBeLessThanOrEqual(pic.arcs.length + 1);
    }
  });

  it('looks through every window by default, and stops at the first when asked', () => {
    const cs = build('000100000', 6);
    const R = new SparseRoutes(cs, 4);
    const a = bornAt(cs, 4, 441);
    const one = harmonicAbove(R, R.walked(a), { floor: 1, windows: 1 });
    expect(one.windows).toBe(1);
    const all = harmonicAbove(R, R.walked(a), { floor: 1 });
    expect(all.windows).toBeGreaterThanOrEqual(1);
    expect(all.found?.length).toBe(one.found?.length ?? 8784);
  });

  it('four levels up at once: the 175,221 at level 8 from the 441, reading as it with every tile grown into a level-4 supertile', () => {
    const cs = build('000100000', 8);
    const R = new SparseRoutes(cs, 8);
    const r = harmonicAbove(R, R.walked(bornAt(cs, 4, 441)), { floor: 1, gap: 4 });
    expect(r.gap).toBe(4);
    expect(r.found).toMatchObject({ level: 8, length: 175221, family: '013467', agreed: 1 });
    expect(r.found!.key).toBe(wordKey(cs, bornAt(cs, 8, 175221)));
    // the windows are the 441's level-1 visits' places four levels up
    expect(r.picture.windows.every((w) => w.level === 5)).toBe(true);
    expect(() => harmonicAbove(R, R.walked(bornAt(cs, 4, 441)), { floor: 1, gap: 3 })).toThrow(/even/);
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

describe('a circuit closing again in a bigger supertile', () => {
  it('is not its own harmonic: 110000001’s 126 at level 4 closes in the level-6, 8 and 10 Deltas with its own word, and nothing reads as it there', () => {
    const cs = build('110000001', 8);
    const R = new SparseRoutes(cs, 6);
    const a = bornAt(cs, 4, 126);
    expect(familyOf(a)).toBe('14');
    for (const gap of [2, 4]) {
      const r = harmonicAbove(R, R.walked(a), { floor: 2, gap });
      expect(r.found).toBeNull();
      expect(r.copies).toBeGreaterThanOrEqual(1);
      expect(r.others.some((o) => o.length === 126)).toBe(false);
      expect(r.picture.counts.harmonic).toBe(0);
    }
    const six = harmonicAbove(R, R.walked(a), { floor: 2, gap: 2 });
    expect(describeResult(six)).toMatch(/^Level 6: no circuit reading as the 126 closes in the Delta\. The 126 itself closes there (once|[\d,]+ times), in a bigger supertile\./);
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
    const c = climb(R, 4, D, start, { cap: 9 });
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
    const c = climb(R, 8, D, longestArc(R, 8, D), { cap: 16 });
    expect(c.closed).toBeNull();
    expect(c.limitedAt).toBeGreaterThan(9);
    expect(c.levels[c.levels.length - 1].level).toBe(c.limitedAt! - 1);
    expect(c.work.calls).toBe(1000);
  });

  it('draws the arc through each supertile climbed into: its two halves from the seam, as many child crossings as the tables’ arc', () => {
    const cs = build('140000001', 9);
    const R = new SparseRoutes(cs, 4);
    const placeAt = (n: number, a: number): number => {
      if (n <= R.base) return a;
      const step = placeAt(n - 1, Math.floor(a / 8)) * 8 + (a % 8);
      return cs.levels[n].Delta.level.under.indexOf(step);
    };
    const D = typeIndex.get('Delta')!;
    const levels: number[] = [];
    const c = climb(R, 4, D, longestArc(R, 4, D), { cap: 9, onProgress: (p, draw) => levels.push(p.level, draw().level) });
    const last = c.levels[c.levels.length - 1];
    // a picture per level climbed into: one more than the levels reached when the climb closed or ended below the cap
    expect(c.pictures.length).toBe(c.closed || last.level < 9 ? c.levels.length : c.levels.length - 1);
    expect(levels.length).toBeGreaterThan(0);
    for (let i = 0; i + 1 < levels.length; i += 2) expect(levels[i]).toBe(levels[i + 1]);
    c.pictures.forEach((pic, q) => {
      const below = c.levels[q];
      expect(pic.level).toBe(below.level + 1);
      const up = parentOf(R, typeIndex.get(below.type)!);
      expect(pic.type).toBe(TYPES[up.type]);
      expect(pic.windowCount).toBe(0);
      expect(pic.children.length).toBe(cs.childTypes(pic.level, pic.type).length);
      const next = c.levels[q + 1];
      if (next) {
        // open: the half from the seam onwards and, unless the seam is on the outline, the half back; together every child crossing the arc enters
        expect(pic.arcs.length).toBeGreaterThanOrEqual(1);
        expect(pic.arcs.length).toBeLessThanOrEqual(2);
        expect(pic.arcs.every((a) => a.end === 'open')).toBe(true);
        expect(pic.arcs.reduce((x, a) => x + a.steps, 0)).toBe(cs.enters(next.level, next.type, placeAt(next.level, next.place)).length);
        expect(pic.arcs.reduce((x, a) => x + a.length, 0)).toBe(next.length);
      } else if (c.closed) {
        expect(pic.arcs.map((a) => a.end)).toEqual(['closed']);
        expect(pic.arcs[0].length).toBe(c.closed.length);
      }
    });
  });
});

