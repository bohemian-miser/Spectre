/**
 * The fates of tails against independent sources, in 023468 · 140000001:
 * every fate over every placement (`fateSets.ts`) against tails followed up
 * explicit ancestors one by one (`CircuitShapes.walkAbove` and the tables'
 * mates, not the lifts); the placement-weighted shares (`fateMass.ts`)
 * against the account's (`tailFates`); certified infinite lines followed a
 * full turn further through the routes (`SparseRoutes`), still open and
 * fixed; and the remainder's parts against the account's not accounted for.
 */
import { describe, expect, it } from 'vitest';
import { classifyCombo, type Classified } from '../../foundations/comboAnalysis';
import { buildShapes } from '../../foundations/foundations';
import { account, pageCombo } from '../../foundations/pageData';
import { RouteLimit, SparseRoutes, typeIndex } from '../../harmonics/sparseRoutes';
import { placeOf, slotOf, type BornCircuit } from '../../shapes/circuitShapes';
import { random, type Followed } from '../above';
import { liftArc } from '../follow';
import { fateGraph, pathTo } from '../fateSets';
import { classOf } from '../labels';
import { borderPath, isTurn, lineArcs, TURNS, type ArcAt } from '../lines';
import { liftCache, weightCheck } from '../investigate';
import { cycleName, placements, TYPES } from '../placements';
import { remainderOf } from '../remainder';

const RULE = [0, 2, 3, 4, 6, 8];
const COMBO = '140000001';

const builds = new Map<number, Classified>();
const built = (levels: number): Classified => {
  if (!builds.has(levels)) builds.set(levels, classifyCombo(RULE, COMBO, levels));
  return builds.get(levels)!;
};

/** A tail followed up explicit ancestors with `walkAbove`: the label it ends on. */
function follow(c: Classified, R: SparseRoutes, m: number, a: number, b: number, chain: readonly { parent: string; slot: number }[], top: number): string {
  const lines = lineArcs(c.lines[top]);
  for (let n = m; n < top; n++) {
    const { parent, slot } = chain[n - m];
    const fwd = c.cs.walkAbove(parent, a * 8 + slot, n);
    if (fwd.closed) {
      const slots: number[] = [];
      for (const x of fwd.steps) if (!slots.includes(slotOf(x))) slots.push(slotOf(x));
      const born: BornCircuit = { level: n + 1, type: parent as BornCircuit['type'], length: fwd.length, slots, steps: fwd.steps };
      return c.bucket(born);
    }
    const end = (steps: number[]): number => {
      const last = steps[steps.length - 1];
      const child = c.cs.childOf(n + 1, parent, last);
      return R.placeOf(n + 1, c.cs.levels[n][child.type].mate(placeOf(last)) * 8 + slotOf(last));
    };
    const rev = c.cs.walkAbove(parent, b * 8 + slot, n);
    [a, b] = [end(rev.steps), end(fwd.steps)];
    expect(c.cs.levels[n + 1][parent].mate(a)).toBe(b);
  }
  const T = c.cs.levels[top][chain[chain.length - 1].parent];
  return lines.get(T.type)?.has(Math.min(a, b)) ? 'line' : 'open';
}

describe('every fate of a tail over every placement', () => {
  it('is what following explicit ancestors one by one gives', () => {
    const c = built(6);
    const top = 7;
    const R = new SparseRoutes(c.cs);
    const liftsAt = liftCache(c);
    const g = fateGraph(c.cs, liftsAt, c.bucket, top, lineArcs(c.lines[top]));
    const place = placements();
    const rnd = random(206);
    let several = 0;
    for (const m of [3, 5, 6]) {
      for (const X of TYPES) {
        const T = c.cs.levels[m][X];
        const arcs = Array.from(T.crossings()).filter((k) => T.mate(k) > k);
        for (let i = 0; i < 4; i++) {
          const a = arcs[Math.floor(rnd() * arcs.length)];
          const fates = g.sets.names(g.fates[m][X][a]);
          if (new Set(fates.map(classOf)).size > 1) several++;
          // a level below the top: every placement, so the sets agree exactly
          if (m === top - 1) {
            const got = new Set(place[X].map((p) => follow(c, R, m, a, T.mate(a), [p], top)));
            expect([...got].sort()).toEqual([...fates].sort());
            continue;
          }
          // further down: explicit ancestors drawn at random land in the set, and each fate has a path that reaches it
          for (let j = 0; j < 6; j++) {
            const chain: { parent: string; slot: number }[] = [];
            let below: string = X;
            for (let n = m; n < top; n++) {
              const ps = place[below as keyof typeof place];
              const p = ps[Math.floor(rnd() * ps.length)];
              chain.push(p);
              below = p.parent;
            }
            expect(fates).toContain(follow(c, R, m, a, T.mate(a), chain, top));
          }
          for (const cls of new Set(fates.map(classOf))) {
            const path = pathTo(g, liftsAt, m, X, a, cls)!;
            expect(classOf(follow(c, R, m, a, T.mate(a), path.steps, path.level))).toBe(cls);
          }
        }
      }
    }
    // some tails do have several fates
    expect(several).toBeGreaterThan(0);
  }, 300000);
});

describe('the account weights a tail with several fates by placement', () => {
  it('gives the shares the placement-weighted push gives, level by level', () => {
    const c = built(6);
    const p = pageCombo(c.analysis);
    const liftsAt = liftCache(c);
    for (let L = 1; L < 7; L++) {
      const w = weightCheck(p, c, liftsAt, L);
      // the account's shares are kept to seven significant figures
      expect(w.diff).toBeLessThan(2e-6 / Math.max(1e-3, p.tails[L]));
    }
  }, 120000);
});

describe('infinite lines', () => {
  it('stay open and fixed when followed a full turn further through the routes', async () => {
    // let the test runner hear from the worker between the long steps
    const breathe = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
    const c = built(8);
    await breathe();
    const top = 9;
    const R = new SparseRoutes(c.cs);
    const certified = c.lines[top];
    expect(certified.length).toBeGreaterThan(0);
    const share = pageCombo(c.analysis).lines!;
    expect(share[top]).toBeGreaterThan(0);
    // one certificate of each cycle, followed past its last arc as far as a budget of routes reaches
    const byCycle = new Map(certified.map((x) => [cycleName(x.cycle), x]));
    let walked = 0;
    for (const x of byCycle.values()) {
      await breathe();
      let at: ArcAt = x.arcs[TURNS];
      const start = at;
      R.limit = R.work.calls + 3e6;
      try {
        for (const st of x.cycle.steps) {
          const up = liftArc(R, at.level, at.a, typeIndex.get(st.parent)!, st.slot, TYPES);
          expect(up.kind).toBe('open');
          if (up.kind !== 'open') return;
          at = { level: at.level + 1, type: st.parent, a: up.a, b: up.b };
        }
      } catch (err) {
        if (err instanceof RouteLimit) continue;
        throw err;
      }
      expect(isTurn(R, start, at)).toBe(true);
      walked++;
    }
    expect(walked).toBeGreaterThan(0);
  }, 300000);
});

describe('the line of a Delta as slot 1 of a Delta, in 140000001', () => {
  it('has ends one more turn of a Sigma as slot 4 of a Sigma out, every second level', () => {
    const cs = buildShapes(RULE, COMBO, 1);
    for (let n = 2; n <= 10; n++) cs.extend(n);
    const R = new SparseRoutes(cs, 10);
    const D = typeIndex.get('Delta')!;
    // its arc at level 6, as the Delta's level-4 tails reach it (Identify's ancestry)
    let a = 1577;
    let b = 2381;
    const ends: string[] = [];
    const path = (n: number, x: number): string => {
      const p = borderPath(R, n, D, x);
      return `${p.slots.join('')}|${p.edge}`;
    };
    for (let n = 6; n <= 12; n++) {
      if (n % 2 === 0) ends.push(`${path(n, a)} ${path(n, b)}`);
      if (n === 12) break;
      const up = liftArc(R, n, a, D, 1, TYPES);
      expect(up.kind).toBe('open');
      if (up.kind !== 'open') return;
      [a, b] = [up.a, up.b];
    }
    expect(ends).toEqual(['144455|4 344563|4', '14444455|4 34444563|4', '1444444455|4 3444444563|4', '144444444455|4 344444444563|4']);
  }, 300000);
});

describe('the remainder', () => {
  it('adds up to what the account leaves in the limit', () => {
    const c = built(6);
    const p = pageCombo(c.analysis);
    const acc = account(p, 'class');
    const last = acc.columns.length - 1;
    const left = (acc.segments.find((s) => s.key === 'unaccounted')?.values[last] ?? 0) + (acc.segments.find((s) => s.key === 'lines')?.values[last] ?? 0);
    const roots = acc.projection.fits.map((f) => `${f.nugget ? 'nugget' : 'chain'} ${f.root}`);
    const fates = [...roots, 'unknown', 'open', 'open', 'budget'];
    const followed: Followed[] = fates.map((fate) => ({ type: 'Delta', a: 0, tiles: 1, ancestry: [], fate, level: 9 }));
    const r = remainderOf(p, followed, 9);
    const sum = Object.values(r.parts).reduce((a, x) => a + x.share, 0);
    expect(left).toBeGreaterThan(0);
    expect(r.remainder).toBeCloseTo(left, 9);
    expect(sum).toBeCloseTo(left, 9);
  }, 120000);
});
