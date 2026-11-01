/**
 * Supertiles built from the routes a circuit uses at one level, against two
 * readings of the same condition that do not stack level by level: a route
 * or circuit descended to the kept level through the stored routes
 * (`Table.route`), every arc it passes there looked up in the kept set; and,
 * keeping the tiles, the words (`CircuitShapes.word`), a circuit built from
 * the tiles another uses being one whose letters are all among the other's.
 */
import { describe, expect, it } from 'vitest';

import { CircuitShapes } from '../../shapes/circuitShapes';
import { circuitUse } from '../circuitRoutes';
import { closesFromKept, keptFromUse, keptLevels, stackKept } from '../kept';

const subset = [0, 2, 3, 4, 6, 8];
const top = 6;

/** The level-`to` routes the level-n arc from place k passes, descended through the stored routes, as `type lower-place`. */
function descend(cs: CircuitShapes, n: number, type: string, k: number, to: number, into: Set<string>): void {
  const T = cs.levels[n][type];
  if (n === to) {
    const m = T.mate(k);
    into.add(`${type} ${m < 0 ? k : Math.min(k, m)}`);
    return;
  }
  const { steps, forward } = T.route(k);
  for (const s of forward ? Array.from(steps) : Array.from(steps).reverse()) {
    const ch = cs.childOf(n, type, s);
    descend(cs, n - 1, ch.type, forward ? ch.k : cs.levels[n - 1][ch.type].mate(ch.k), to, into);
  }
}

const keys = (k: { byType: ReadonlyMap<string, ReadonlySet<number>> }): Set<string> => {
  const out = new Set<string>();
  for (const [type, los] of k.byType) for (const lo of los) out.add(`${type} ${lo}`);
  return out;
};
const within = (xs: Set<string>, of: Set<string>) => [...xs].every((x) => of.has(x));

describe('supertiles built from the routes a circuit uses', () => {
  for (const combo of ['140000001', '111000001']) {
    const cs = new CircuitShapes('hex', subset, [...combo].map((c) => parseInt(c, 36)), top, 1, true);
    // the biggest circuit closing at each of levels 3 to 5
    const picked = [3, 4, 5].map((n) => cs.born.filter((c) => c.level === n).sort((a, b) => b.length - a.length)[0]).filter(Boolean);

    it(`keeps at each level above the routes whose arcs at the kept level are all kept, for ${combo}`, () => {
      expect(picked.length).toBeGreaterThan(1);
      let checked = 0;
      for (const c of picked) {
        const use = circuitUse(cs, c);
        for (const from of [0, c.level - 2, c.level - 1]) {
          const levels = keptLevels(cs, use[from], top);
          const kept0 = keys(levels[from]);
          expect(kept0).toEqual(new Set([...use[from].byType].flatMap(([t, m]) => [...m.keys()].map((k) => `${t} ${k}`))));
          // every route of a level descended to the kept one: three levels up at most, the descent listing every arc on the way
          for (let n = from + 1; n <= Math.min(top, from + 3); n++) {
            const want = new Set<string>();
            let of = 0;
            for (const [type, T] of Object.entries(cs.levels[n])) {
              for (const k of T.crossings()) {
                if (T.mate(k) <= k) continue;
                of++;
                const below = new Set<string>();
                descend(cs, n, type, k, from, below);
                if (within(below, kept0)) want.add(`${type} ${k}`);
              }
            }
            expect(keys(levels[n]), `level ${n} from ${from} of a ${c.length}-tile circuit`).toEqual(want);
            expect(levels[n].routes).toBe(want.size);
            expect(levels[n].of).toBe(of);
            checked++;
          }
          // the circuit's own routes above the kept level are among the kept
          for (let n = from + 1; n < c.level; n++) expect(within(keys(keptFromUse(cs, use[n])), keys(levels[n]))).toBe(true);
        }
      }
      expect(checked).toBeGreaterThan(10);
    }, 120000);

    it(`closes the circuits whose arcs at the kept level are all kept, the followed one among them, for ${combo}`, () => {
      for (const c of picked) {
        const use = circuitUse(cs, c);
        for (const from of [0, c.level - 1]) {
          const levels = keptLevels(cs, use[from], top);
          const kept0 = keys(levels[from]);
          expect(closesFromKept(cs, c, levels[c.level - 1])).toBe(true);
          for (const o of cs.born) {
            if (o.level <= from) continue;
            const below = new Set<string>();
            for (const s of o.steps) {
              const ch = cs.childOf(o.level, o.type, s);
              descend(cs, o.level - 1, ch.type, ch.k, from, below);
            }
            expect(closesFromKept(cs, o, levels[o.level - 1]), `a ${o.length}-tile circuit at level ${o.level}, keeping a ${c.length}-tile circuit's routes at ${from}`).toBe(within(below, kept0));
          }
        }
      }
    }, 120000);

    it(`keeping the tiles, closes the circuits whose letters are all among the followed one's, for ${combo}`, () => {
      const letters = (w: string[]) => new Set(w.map((x) => {
        const [, p, a, b] = /^([A-Za-z]+)(\d)(\d)$/.exec(x)!;
        return `${p}${Math.min(+a, +b)}`;
      }));
      let others = 0;
      for (const c of picked) {
        const levels = keptLevels(cs, circuitUse(cs, c)[0], top);
        const mine = letters(cs.word(c));
        for (const o of cs.born) {
          const built = closesFromKept(cs, o, levels[o.level - 1]);
          expect(built, `a ${o.length}-tile circuit from a ${c.length}-tile one's tiles`).toBe(within(letters(cs.word(o)), mine));
          if (built && o !== c) others++;
        }
      }
      expect(others).toBeGreaterThan(0);
    }, 120000);
  }

  it('carries on from levels already worked out, and refuses a level not built', () => {
    const cs = new CircuitShapes('hex', subset, [...'140000001'].map((c) => parseInt(c, 36)), 5, 1, true);
    const c = cs.born.find((x) => x.level === 4)!;
    const use = circuitUse(cs, c);
    const part = keptLevels(cs, use[2], 3);
    expect(part.length).toBe(4);
    expect(part[3]).toBeDefined();
    const whole = keptLevels(cs, use[2], 5, part);
    expect(whole[3]).toBe(part[3]);
    expect(keys(whole[5])).toEqual(keys(keptLevels(cs, use[2], 5)[5]));
    expect(() => stackKept(cs, whole[5])).toThrow();
  });
});
