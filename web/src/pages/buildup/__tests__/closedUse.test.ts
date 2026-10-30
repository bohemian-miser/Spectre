/**
 * The routes on circuits closing above a level, and the children's routes
 * a circuit joins where it closes, against a walk of each closing down to
 * its tiles that lists every arc it passes, one pass at a time, from the
 * stored routes (`Table.route`) rather than `enters`.
 */
import { describe, expect, it } from 'vitest';

import { CircuitShapes } from '../../shapes/circuitShapes';
import { closedUse, joinedRoutes } from '../circuitRoutes';

const subset = [0, 2, 3, 4, 6, 8];

/** The level-n arc from place k and every arc it passes below, added to its level's set as `type lower-place`. */
function descend(cs: CircuitShapes, n: number, type: string, k: number, into: Set<string>[]): void {
  const T = cs.levels[n][type];
  const m = T.mate(k);
  into[n].add(`${type} ${m < 0 ? k : Math.min(k, m)}`);
  if (n === 0) return;
  const { steps, forward } = T.route(k);
  const order = forward ? Array.from(steps) : Array.from(steps).reverse();
  for (const s of order) {
    const ch = cs.childOf(n, type, s);
    // a route stored from the mate is entered at each child crossing's mate
    const ck = forward ? ch.k : cs.levels[n - 1][ch.type].mate(ch.k);
    descend(cs, n - 1, ch.type, ck, into);
  }
}

describe('routes on circuits closing above a level', () => {
  for (const combo of ['111000001', '140000001']) {
    it(`are the arcs of every closing at a higher level, passed one by one, for ${combo}`, () => {
      const top = 5;
      const cs = new CircuitShapes('hex', subset, [...combo].map((c) => parseInt(c, 36)), top, 1, true);
      const perLevel: Set<string>[][] = [];
      for (let n = 1; n <= top; n++) {
        perLevel[n] = Array.from({ length: top + 1 }, () => new Set());
        for (const [type, steps] of cs.closed[n]) {
          // every closed walk again, from each of its child crossings, through the tables below
          for (const s of steps) {
            const again = cs.walkAbove(type, s, n - 1);
            expect(again.closed).toBe(true);
            const ch = cs.childOf(n, type, s);
            descend(cs, n - 1, ch.type, ch.k, perLevel[n]);
          }
        }
      }
      for (let k = 1; k <= top; k++) {
        const want = new Set<string>();
        for (let n = k + 1; n <= top; n++) for (const r of perLevel[n][k]) want.add(r);
        const got = new Set<string>();
        for (const [type, los] of closedUse(cs, k)) for (const lo of los) got.add(`${type} ${lo}`);
        expect(got, `level ${k}`).toEqual(want);
        if (k < top) expect(got.size).toBeGreaterThan(0);
      }
      expect(closedUse(cs, top).size).toBe(0);
    }, 60000);
  }

  it('a closing joins the children routes its walk enters, counted against every child route', () => {
    const cs = new CircuitShapes('hex', subset, [...'111000001'].map((c) => parseInt(c, 36)), 5, 1, true);
    for (const c of cs.born) {
      const { joined, of } = joinedRoutes(cs, c);
      // walked again from its first child crossing through the tables below
      const again = cs.walkAbove(c.type, c.steps[0], c.level - 1);
      expect(again.closed).toBe(true);
      const routes = new Set(again.steps.map((s) => {
        const ch = cs.childOf(c.level, c.type, s);
        const m = cs.levels[c.level - 1][ch.type].mate(ch.k);
        return `${ch.pos} ${Math.min(ch.k, m)}`;
      }));
      expect(joined).toBe(routes.size);
      let all = 0;
      for (const ch of cs.childTypes(c.level, c.type)) {
        const T = cs.levels[c.level - 1][ch.type];
        all += (T.size - T.absent()) / 2;
      }
      expect(of).toBe(all);
    }
  });
});
