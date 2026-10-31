/**
 * The page's figures against the borders: strands welded from the tiles
 * (`strand.ts`) against the routes and chord counts of `period/period.ts`,
 * a level-3 supertile stitched from its level-1 pieces against the level-1
 * borders, and each Psi child's chords against the parent's one strand.
 */
import { describe, expect, it } from 'vitest';
import { HEX_TYPES, childType } from '../../../core';
import { CircuitShapes } from '../../shapes/circuitShapes';
import { run, sameBorder } from '../../period/period';
import { graphOf } from '../../period/scene';
import { routeIndexOf } from '../figures';
import { stitched } from '../stitch';
import { pairsRound, runsUnder, tracePatch } from '../strand';
import { chordsThrough, recipes, sameRecipes } from '../recipe';
import { borderScene } from '../morph';

const SUBSET = [1, 2, 8];
const DIGITS = [0, 1, 0, 1, 0, 0, 0, 0, 0];
const r = run(SUBSET, DIGITS, 4);

describe('strands welded from the tiles', () => {
  it('make the Psi one open strand through every chord, as long as its route', () => {
    for (let n = 0; n <= 4; n++) {
      const p = tracePatch(SUBSET, DIGITS, n, 'Psi');
      expect(p.strands).toHaveLength(1);
      expect(p.strands[0].closed).toBe(false);
      expect(p.strands[0].chords).toHaveLength(p.chords.length);
      expect(p.chords.length).toBe(r.states[n].Psi.chords[0]);
    }
  });

  it('join the same border crossings as every type\'s level-1 and level-2 routes', () => {
    const cs = new CircuitShapes('hex', SUBSET, DIGITS, 2, 1, true);
    for (const n of [1, 2]) {
      for (const t of HEX_TYPES) {
        const p = tracePatch(SUBSET, DIGITS, n, t);
        const g = graphOf(cs, n, t, r.states[n][t]);
        expect(p.strands.filter((s) => s.closed)).toHaveLength(0);
        expect(p.strands).toHaveLength(g.routes.length);
        const route = routeIndexOf(p, g.dots, g.routes);
        for (const s of p.strands) {
          const i = route.get(s.chords[0].chord)!;
          const [a, b] = g.routes[i];
          const at = (q: { x: number; y: number }) => g.dots.findIndex((d) => Math.hypot(d.x - q.x, d.y - q.y) < 1e-6);
          expect([at(s.ends[0]), at(s.ends[1])].sort((x, y) => x - y)).toEqual([a, b]);
          expect(s.chords.length).toBe(r.states[n][t].chords[a]);
        }
      }
    }
  });
});

describe('two rounds of stitching', () => {
  it('walk every type\'s level-1 pieces into level 3\'s routes, which are level 1\'s', () => {
    const cs = new CircuitShapes('hex', SUBSET, DIGITS, 3, 1, true);
    for (const t of HEX_TYPES) {
      const s = stitched(cs, r.states, 1, 2, t);
      expect(s.circuits).toBe(0);
      expect(s.walks).toHaveLength(r.states[3][t].mate.length / 2);
      expect(sameBorder(r.states[3][t], r.states[1][t])).toBe(true);
      let grand = 0;
      for (let a = 0; a < 8; a++) {
        const c = childType(t, a);
        if (c) for (let b = 0; b < 8; b++) if (childType(c, b)) grand++;
      }
      expect(s.pieces).toHaveLength(grand);
    }
  });
});

describe('Psi children', () => {
  it('each carry one stretch of the parent\'s strand, with chords on both sides', () => {
    for (let n = 2; n <= 4; n++) {
      const p = tracePatch(SUBSET, DIGITS, n, 'Psi');
      for (const slot of [0, 2, 5]) {
        expect(childType('Psi', slot)).toBe('Psi');
        const runs = runsUnder(p, p.strands[0], String(slot));
        expect(runs).toHaveLength(1);
        expect(runs[0].end - runs[0].start).toBe(r.states[n - 1].Psi.chords[0]);
        expect(runs[0].start).toBeGreaterThan(0);
        expect(runs[0].end).toBeLessThan(p.chords.length);
      }
    }
  });
});

describe('the chords of one tile', () => {
  it('join crossings that do not interleave, and the segments do not meet', () => {
    const cross = (p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    for (const t of HEX_TYPES) {
      const p = tracePatch(SUBSET, DIGITS, 0, t);
      expect(pairsRound(r.states[0][t].mate).interleave).toBe(false);
      if (p.chords.length < 2) continue;
      const [u, v] = p.chords;
      const meet = cross(u.a, u.b, v.a) * cross(u.a, u.b, v.b) < 0 && cross(v.a, v.b, u.a) * cross(v.a, v.b, u.b) < 0;
      expect(meet).toBe(false);
      expect(Math.min(...[v.a, v.b].map((q) => Math.min(Math.hypot(q.x - u.a.x, q.y - u.a.y), Math.hypot(q.x - u.b.x, q.y - u.b.y))))).toBeGreaterThan(0.1);
    }
  });
});

describe('recipes', () => {
  const r7 = run(SUBSET, DIGITS, 7);
  it('are the same from level 1 to 3, 3 to 5 and 5 to 7, and from 2 to 4 and 4 to 6', () => {
    expect(sameRecipes(recipes(r7.states, 1, 2), recipes(r7.states, 3, 2))).toBe(true);
    expect(sameRecipes(recipes(r7.states, 1, 2), recipes(r7.states, 5, 2))).toBe(true);
    expect(sameRecipes(recipes(r7.states, 2, 2), recipes(r7.states, 4, 2))).toBe(true);
  });

  it('count every route\'s chords two levels up, as the strands welded from the tiles do', () => {
    const R = recipes(r7.states, 1, 2);
    for (const t of HEX_TYPES) {
      const p = tracePatch(SUBSET, DIGITS, 3, t);
      const lengths = p.strands.map((s) => s.chords.length).sort((a, b) => a - b);
      const through = R[t].map((x) => chordsThrough(r7.states, 1, x)).sort((a, b) => a - b);
      expect(through).toEqual(lengths);
    }
  });

  it('take every piece route whole: a step leaves by the mate of the crossing it enters', () => {
    const R = recipes(r7.states, 1, 2);
    for (const t of HEX_TYPES) for (const x of R[t]) for (const u of x.uses) expect(r7.states[1][u.type].mate[u.enter]).toBe(u.leave);
  });
});

describe('what the animations morph between', () => {
  const r7 = run(SUBSET, DIGITS, 5);
  it('match one for one: level 3 onto level 1', () => {
    const cs = new CircuitShapes('hex', SUBSET, DIGITS, 3, 1, true);
    for (const t of HEX_TYPES) {
      const a = borderScene(cs, r7.states, SUBSET, DIGITS, 3, t), b = borderScene(cs, r7.states, SUBSET, DIGITS, 1, t);
      expect(a.outline).toHaveLength(b.outline.length);
      expect(a.dots).toHaveLength(b.dots.length);
      expect(a.routes).toEqual(b.routes);
      expect(a.strands.every((s) => s.length > 0)).toBe(true);
    }
  });

  it('cut an outline at its corners: each edge starts at its corner', () => {
    const cs = new CircuitShapes('hex', SUBSET, DIGITS, 3, 1, true);
    const a = borderScene(cs, r7.states, SUBSET, DIGITS, 3, 'Delta');
    for (let j = 0; j < 6; j++) {
      const c = cs.corner(3, 'Delta', j), p = a.outline[j * 48];
      expect(Math.hypot(c.x - p.x, c.y - p.y)).toBeLessThan(1e-6);
    }
  });
});
