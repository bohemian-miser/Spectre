/**
 * A circuit's placements and breakdowns against independent sources: each
 * placement's tiles measured one by one (`tileLoop`), its visits counted
 * route by route with passes carried (`buildup/circuitRoutes.ts`), each
 * level read from the top on its own (`visitsAt`, backtracks cancelled on
 * the visits themselves, one at a time), the slots each walk enters, and the harmonic
 * pairs found by the chain rule on one placement each (`chains.ts`).
 */
import { describe, expect, it } from 'vitest';

import { CircuitShapes, slotOf, tileLoop, type BornCircuit } from '../../shapes/circuitShapes';
import { circuitUse } from '../../buildup/circuitRoutes';
import { HarmonicsEngine } from '../harmonicsJob';
import { FLOOR } from '../chains';
import { sameCyclic, token, visitsAt } from '../readings';
import { breakdownsOf, canonicalReading, groupReadings, overlap, readsAs, verdict, type CircuitBreakdowns } from '../breakdowns';

const RULE = [0, 2, 3, 4, 6, 8];
const build = (combo: string, level: number, onePerLength: boolean) => new CircuitShapes('hex', RULE, [...combo].map((ch) => parseInt(ch, 36)), level, 1, onePerLength);
/** Cancels the first backtrack A B A (cyclically) in the sequence as it stands, until none is left. */
function cancelOneByOne<T>(ids: readonly T[]): T[] {
  let out = [...ids];
  for (;;) {
    const n = out.length;
    let hit = -1;
    for (let i = 0; i < n && hit < 0; i++) if (n > 2 && out[(i + 2) % n] === out[i] && out[(i + 1) % n] !== out[i]) hit = i;
    if (hit < 0) return out;
    const drop = new Set([(hit + 1) % n, (hit + 2) % n]);
    out = out.filter((_, q) => !drop.has(q));
  }
}
const rg = (cs: CircuitShapes, c: BornCircuit) => tileLoop(cs.shape(c, 0), 64).rg;

describe('a reading up to rotation and reversal', () => {
  it('gives two readings the same string exactly when sameCyclic says they are the same', () => {
    const base = ['D<1', 'G<7', 'S<4', 'Ph<6', 'D<1', 'X<5', 'Pi<5'];
    const variants: string[][] = [];
    for (let r = 0; r < base.length; r++) {
      const rot = [...base.slice(r), ...base.slice(0, r)];
      variants.push(rot, [...rot].reverse());
    }
    variants.push(['D<1', 'G<7', 'S<4', 'Ph<6', 'X<5', 'D<1', 'Pi<5'], ['D<1', 'D<1', 'G<7', 'S<4', 'Ph<6', 'X<5', 'Pi<5'], ['A', 'B', 'A', 'B']);
    for (const x of variants) for (const y of variants) expect(canonicalReading(x) === canonicalReading(y)).toBe(sameCyclic(x, y));
  });
});

describe('a circuit read in every placement', () => {
  const cs = build('140000001', 6, false);
  const one = build('140000001', 6, true);
  const pick = (level: number, length: number) => one.born.find((c) => c.level === level && c.length === length)!;

  it('finds placements of one shape: the same length and radius of gyration, measured tile by tile', () => {
    for (const [level, length] of [[5, 57], [6, 447]] as const) {
      const c = pick(level, length);
      const b = breakdownsOf(cs, c);
      expect(b.placements.length).toBe(160);
      const want = rg(one, c);
      for (const p of b.placements) {
        expect(p.length).toBe(length);
        expect(Math.abs(rg(cs, p) - want)).toBeLessThanOrEqual(1e-6 * want);
      }
    }
  });

  it('reads every placement as the reference does, visit counts as the routes used give them', () => {
    const c = pick(5, 57);
    const b = breakdownsOf(cs, c);
    b.placements.forEach((p, i) => {
      const use = circuitUse(cs, p);
      for (let k = 0; k < c.level; k++) {
        const raw = visitsAt(cs, p, k);
        expect(raw.length).toBe(use[k].passes);
        const kept = cancelOneByOne(raw.map((v) => v.id));
        const byId = new Map(raw.map((v) => [v.id, v]));
        const key = canonicalReading(kept.map((id) => token(byId.get(id)!, k, c.level)));
        const at = b.levels[k].breakdowns.find((x) => x.key === key);
        expect(at?.placements, `placement ${i} at level ${k}`).toContain(i);
      }
    });
    for (const l of b.levels) expect(l.breakdowns.reduce((s, x) => s + x.placements.length, 0)).toBe(l.read);
  });

  it('reads each placement at the level below its own as the slots its walk enters, backtracks cancelled', () => {
    for (const [level, length] of [[5, 57], [6, 447], [4, 303]] as const) {
      const b = breakdownsOf(cs, pick(level, length));
      const top = b.levels[level - 1].breakdowns;
      b.placements.forEach((p, i) => {
        const slots = cancelOneByOne(p.steps.map(slotOf)).map((x) => `<${x}`);
        expect(top.find((x) => x.key === canonicalReading(slots))?.placements).toContain(i);
      });
    }
  });
});

describe('two circuits compared by their breakdowns', () => {
  it('counts shared and lone breakdowns, and placements reading as the other', () => {
    const mk = (level: number, sets: string[][][]): CircuitBreakdowns => {
      const readings = sets[0].map((_, p) => new Map(sets.map((s, k) => [k, s[p]] as const)));
      return { level, length: 0, word: '', placements: [], families: [], later: 0, levels: groupReadings(level, readings) };
    };
    // A at level 1: three placements; B at level 3, its level 2 against A's level 0
    const a = mk(1, [[['x', 'y'], ['y', 'x'], ['z']]]);
    const b = mk(3, [[['q'], ['q'], ['q'], ['q']], [['q'], ['q'], ['q'], ['q']], [['x', 'y'], ['w'], ['w'], ['x', 'y']]]);
    const [o] = overlap(a, b);
    expect(o).toMatchObject({ level: 0, levelB: 2, shared: 1, onlyA: 1, onlyB: 1, placementsA: { shared: 2, read: 3 }, placementsB: { shared: 2, read: 4 }, sameCounts: true });
    expect(readsAs(o, 'A', 'B')).toBe('B reads as A in 1 of 2 breakdowns (2 of 4 placements)');
    expect(verdict([o])).toBe('overlap');
  });

  it('finds every harmonic pair of the chain rule sharing breakdowns from the floor up, the pair itself among them', () => {
    for (const combo of ['000100000', '140000001']) {
      const engine = new HarmonicsEngine({ family: 'hex', subset: RULE, combo, level: 6 });
      const r = engine.result();
      const cs = build(combo, 6, false);
      expect(r.links.length).toBeGreaterThan(0);
      for (const l of r.links) {
        const a = breakdownsOf(cs, engine.bornOf(l.a)), b = breakdownsOf(cs, engine.bornOf(l.b));
        const rows = overlap(a, b);
        for (const o of rows.filter((x) => x.level >= Math.max(FLOOR, l.from))) {
          expect(o.shared, `${a.length} and ${b.length} at level ${o.level}`).toBeGreaterThan(0);
          const ra = r.circuits[l.a].readings.find((x) => x.level === o.level)!;
          const key = canonicalReading(ra.tokens);
          expect(a.levels[o.level].breakdowns.some((x) => x.key === key)).toBe(true);
          expect(b.levels[o.levelB].breakdowns.some((x) => x.key === key)).toBe(true);
        }
      }
    }
  }, 60000);
});
