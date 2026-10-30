/**
 * The common table and each type's own entries, against the tables read
 * through `mate`/`len` and against the renormalisation that glues children
 * by position (`circuit-classes/renormalize.ts`); a route's child arcs,
 * against the positions of the crossings they join.
 */
import { describe, expect, it } from 'vitest';

import { renormalize } from '../../../../circuit-classes/renormalize';
import { buildSystem, transPt, type Affine, type MetaNode } from '../../../core';
import { CircuitShapes } from '../../shapes/circuitShapes';
import { childArcs, commonTable, composition, levelRoutes, ownPart, rebuilt, routeName } from '../routes';

const CASES: [number[], string, number][] = [
  [[0, 2, 3, 4, 6, 8], '140000001', 7],
  [[0, 2, 3, 4, 6, 8], '000100000', 7],
  [[0, 1], '000000000', 5],
  [[0, 1, 2, 3, 4, 5, 6, 7, 8], '111000100', 5],
];
/** Levels checked against the renormalisation by position. */
const BY_POSITION = 4;

const at = (p: { x: number; y: number }) => `${Math.round(p.x * 64)},${Math.round(p.y * 64)}`;

describe('common table and own entries', () => {
  for (const [subset, combo, top] of CASES) {
    const digits = [...combo].map((c) => parseInt(c, 36));
    const cs = new CircuitShapes('hex', subset, digits, top, 1, false);

    it(`rebuild each type's table for ${subset.join('')} ${combo}`, () => {
      const ref = renormalize('hex', subset, digits, BY_POSITION);
      for (let n = 0; n <= top; n++) {
        for (const [t, T] of Object.entries(cs.levels[n])) {
          const { mate, len } = rebuilt(cs, n, t);
          expect(mate, `${t} at level ${n}`).toEqual(Int32Array.from({ length: T.size }, (_, p) => T.mate(p)));
          expect(len, `${t} at level ${n}`).toEqual(Float64Array.from({ length: T.size }, (_, p) => T.len(p)));
          expect(T.absent() + T.crossings().length).toBe(T.size);
          const own = ownPart(cs, n, t as never);
          expect(own.absent.length).toBe(T.absent());
          expect(own.places.length).toBe(T.overrides);
          if (n > BY_POSITION) continue;
          const b = ref.levels[n][t];
          const ours: string[] = [];
          for (let p = 0; p < T.size; p++) if (T.has(p)) ours.push(`${at(T.pts[p])} ${mate[p] < 0 ? '-' : at(T.pts[mate[p]])} ${len[p]}`);
          const theirs = b.pts.map((q, k) => `${at(q)} ${b.mate[k] < 0 ? '-' : at(b.pts[b.mate[k]])} ${b.arcLen[k]}`);
          expect(ours.sort(), `${t} at level ${n}`).toEqual(theirs.sort());
        }
      }
    }, 60000);

    it(`draws the common table once per pair for ${subset.join('')} ${combo}`, () => {
      for (let n = 0; n <= top; n++) {
        const L = Object.values(cs.levels[n])[0].level;
        const c = commonTable(cs, n);
        const paired = Array.from(L.mate).filter((m, p) => m >= 0 && L.mate[m] === p).length;
        expect(c.routes.length).toBe(paired / 2 + c.oneSided);
      }
    });
  }
});

describe('a route as its child arcs', () => {
  const subset = [0, 2, 3, 4, 6, 8];
  for (const combo of ['140000001', '000100000']) {
    const cs = new CircuitShapes('hex', subset, [...combo].map((c) => parseInt(c, 36)), 5, 1, false);

    it(`joins child crossings that sit together, through as many tiles, for ${combo}`, () => {
      let checked = 0;
      for (let n = 1; n <= 5; n++) {
        for (const [t, T] of Object.entries(cs.levels[n])) {
          const xf: Affine[] = [];
          for (const ch of (buildSystem('hex', n)[t] as MetaNode).children) xf[ch.pos] = ch.xform as Affine;
          for (const k of T.crossings()) {
            const m = T.mate(k);
            if (m < 0) continue;
            const arcs = childArcs(cs, n, t, k);
            const pt = (slot: number, type: string, p: number) => at(transPt(xf[slot], cs.levels[n - 1][type].pts[p]));
            expect(pt(arcs[0].slot, arcs[0].type, arcs[0].from)).toBe(at(T.pts[k]));
            const last = arcs[arcs.length - 1];
            expect(pt(last.slot, last.type, last.to)).toBe(at(T.pts[m]));
            for (let i = 1; i < arcs.length; i++) {
              const a = arcs[i - 1], b = arcs[i];
              expect(pt(a.slot, a.type, a.to)).toBe(pt(b.slot, b.type, b.from));
              expect(a.slot).not.toBe(b.slot);
            }
            expect(arcs.reduce((s, a) => s + a.tiles, 0)).toBe(T.len(k));
            checked++;
          }
        }
      }
      expect(checked).toBeGreaterThan(5000);
    }, 60000);

    it(`groups a level's routes by composition for ${combo}`, () => {
      for (let n = 1; n <= 5; n++) {
        const lr = levelRoutes(cs, n, 'Delta');
        const T = cs.levels[n].Delta;
        const count = new Map<string, number>();
        for (const k of T.crossings()) {
          if (T.mate(k) <= k) continue;
          const name = routeName(childArcs(cs, n, 'Delta', k).map((a) => a.type)).composition;
          count.set(name, (count.get(name) ?? 0) + 1);
        }
        expect(new Map(lr.groups.map((g) => [g.composition, g.count]))).toEqual(count);
        expect(lr.routes).toBe(T.crossings().filter((k) => T.mate(k) > k).length);
      }
    });

    it(`walks each type's border round in order for ${combo}`, () => {
      for (let n = 0; n <= 5; n++) {
        for (const [t, T] of Object.entries(cs.levels[n])) {
          const ring = cs.border(n, t).flatMap((r) => Array.from(r));
          expect([...ring].sort((x, y) => x - y)).toEqual(Array.from(T.crossings()));
        }
      }
    });
  }
});

describe('composition', () => {
  it('writes runs once with their count', () => {
    expect(composition(['Xi', 'Delta', 'Delta', 'Phi', 'Delta'])).toBe('Xi Delta×2 Phi Delta');
    expect(routeName(['Xi', 'Delta', 'Delta'])).toEqual(routeName(['Delta', 'Delta', 'Xi']));
    expect(routeName(['Xi', 'Delta', 'Delta']).shape).toBe('Delta Xi');
    expect(composition(['Pi', 'Delta', 'Gamma', 'Delta', 'Gamma', 'Delta', 'Gamma', 'Pi'])).toBe('Pi (Delta Gamma)×3 Pi');
    const nested = [...Array(3)].flatMap(() => ['Xi', 'Delta', 'Gamma', 'Delta', 'Gamma']);
    expect(composition(nested)).toBe('(Xi (Delta Gamma)×2)×3');
  });
});
