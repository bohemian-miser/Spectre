/**
 * Each type's table rebuilt two ways, against the table read through
 * `mate`/`len`: from the stored common table, overrides and presence (and,
 * at low levels, against the renormalisation that glues children by
 * position, `circuit-classes/renormalize.ts`); and from the core every
 * non-Gamma type shares plus the type's extras.
 */
import { describe, expect, it } from 'vitest';

import { renormalize } from '../../../../circuit-classes/renormalize';
import { CircuitShapes } from '../../shapes/circuitShapes';
import { CORE_TYPES, coreRoutes, extraRoutes, rebuilt } from '../routes';

const CASES: [number[], string, number][] = [
  [[0, 2, 3, 4, 6, 8], '140000001', 7],
  [[0, 2, 3, 4, 6, 8], '000100000', 7],
  [[0, 1], '000000000', 5],
  [[0, 1, 2, 3, 4, 5, 6, 7, 8], '111000100', 5],
];
/** Levels checked against the renormalisation by position. */
const BY_POSITION = 4;

const at = (p: { x: number; y: number }) => `${Math.round(p.x * 64)},${Math.round(p.y * 64)}`;

describe('tables rebuilt', () => {
  for (const [subset, combo, top] of CASES) {
    const digits = [...combo].map((c) => parseInt(c, 36));
    const cs = new CircuitShapes('hex', subset, digits, top, 1, false);

    it(`from the common table, overrides and presence, for ${subset.join('')} ${combo}`, () => {
      const ref = renormalize('hex', subset, digits, BY_POSITION);
      for (let n = 0; n <= top; n++) {
        for (const [t, T] of Object.entries(cs.levels[n])) {
          const { mate, len } = rebuilt(cs, n, t);
          expect(mate, `${t} at level ${n}`).toEqual(Int32Array.from({ length: T.size }, (_, p) => T.mate(p)));
          expect(len, `${t} at level ${n}`).toEqual(Float64Array.from({ length: T.size }, (_, p) => T.len(p)));
          expect(T.absent() + T.crossings().length).toBe(T.size);
          if (n > BY_POSITION) continue;
          const b = ref.levels[n][t];
          const ours: string[] = [];
          for (let p = 0; p < T.size; p++) if (T.has(p)) ours.push(`${at(T.pts[p])} ${mate[p] < 0 ? '-' : at(T.pts[mate[p]])} ${len[p]}`);
          const theirs = b.pts.map((q, k) => `${at(q)} ${b.mate[k] < 0 ? '-' : at(b.pts[b.mate[k]])} ${b.arcLen[k]}`);
          expect(ours.sort(), `${t} at level ${n}`).toEqual(theirs.sort());
        }
      }
    }, 60000);

    it(`from the core and each type's extras, for ${subset.join('')} ${combo}`, () => {
      for (let n = 0; n <= top; n++) {
        const core = coreRoutes(cs, n);
        for (const [t, T] of Object.entries(cs.levels[n])) {
          const mate = new Int32Array(T.size).fill(-1);
          const len = new Float64Array(T.size);
          const had = new Uint8Array(T.size);
          const put = ([a, b, l]: readonly [number, number, number]) => {
            had[a] = 1;
            mate[a] = b;
            len[a] = l;
            if (b >= 0) { had[b] = 1; mate[b] = a; len[b] = l; }
          };
          // a core route is in every non-Gamma type; Gamma has those of its crossings
          for (const r of core) {
            if ((CORE_TYPES as readonly string[]).includes(t)) put(r);
            else if (T.has(r[0]) && T.mate(r[0]) === r[1] && T.len(r[0]) === r[2]) put(r);
          }
          for (const r of extraRoutes(cs, n, t, core)) put(r);
          expect(Array.from(had), `${t} at level ${n}`).toEqual(Array.from({ length: T.size }, (_, p) => (T.has(p) ? 1 : 0)));
          expect(mate, `${t} at level ${n}`).toEqual(Int32Array.from({ length: T.size }, (_, p) => T.mate(p)));
          expect(len, `${t} at level ${n}`).toEqual(Float64Array.from({ length: T.size }, (_, p) => T.len(p)));
        }
      }
    }, 60000);
  }

  it('leaves few routes outside the core', () => {
    const cs = new CircuitShapes('hex', [0, 2, 3, 4, 6, 8], [...'140000001'].map((c) => parseInt(c, 36)), 6, 1, true);
    const core = coreRoutes(cs, 6);
    const extras = extraRoutes(cs, 6, 'Delta', core);
    expect(extras.length * 50).toBeLessThan(core.length);
  });

  it('walks each type border round in order', () => {
    const cs = new CircuitShapes('hex', [0, 2, 3, 4, 6, 8], [...'000100000'].map((c) => parseInt(c, 36)), 5, 1, true);
    for (let n = 0; n <= 5; n++) {
      for (const [t, T] of Object.entries(cs.levels[n])) {
        const ring = cs.border(n, t).flatMap((r) => Array.from(r));
        expect([...ring].sort((x, y) => x - y)).toEqual(Array.from(T.crossings()));
      }
    }
  });
});
