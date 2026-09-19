/**
 * The strand automaton. These are the load-bearing claims of the machine page
 * and of `sel15-proof/07-permitted-search.ts`.
 */

import { describe, expect, it } from 'vitest';
import {
  ANGLE_FULL_TURN,
  allSlots,
  chordPairing,
  edgeDirection,
  interiorAngleUnits,
  joinTransform,
  leafOrder,
  options,
  permittedJoins,
  slotCountMatchesCore,
  slotsOfType,
  startWalk,
  step,
  undo,
  zLeafPts,
  type WalkState,
} from '../index';

const F = 'spectre' as const;
const S15 = [1, 5];
const BASE: Record<string, number> = Object.fromEntries(leafOrder(F).map((t) => [t, 0]));

describe('slots', () => {
  it('agrees with the core connection-point count for every type', () => {
    for (const t of leafOrder(F)) expect(slotCountMatchesCore(F, t, S15)).toBe(true);
  });

  it('finds 20 slots under selection 15, with Theta and Gamma2 carrying none', () => {
    expect(allSlots(F, S15)).toHaveLength(20);
    expect(slotsOfType(F, 'Theta', S15)).toHaveLength(0);
    expect(slotsOfType(F, 'Gamma2', S15)).toHaveLength(0);
    expect(slotsOfType(F, 'Pi', S15).map((s) => s.id)).toEqual([
      'Pi -1A',
      'Pi +5A',
      'Pi -5A',
      'Pi +1A',
    ]);
  });
});

describe('exact angles', () => {
  it('gives every spectre tile interior angles summing to 2160 degrees', () => {
    for (const t of leafOrder(F)) {
      const n = zLeafPts(F, t).length;
      let sum = 0;
      for (let v = 0; v < n; v++) sum += interiorAngleUnits(F, t, v);
      expect(sum * 30).toBe((n - 2) * 180);
    }
  });

  it('makes every corner a whole number of 30-degree units inside (0, 360)', () => {
    for (const t of leafOrder(F)) {
      const n = zLeafPts(F, t).length;
      for (let v = 0; v < n; v++) {
        const u = interiorAngleUnits(F, t, v);
        expect(Number.isInteger(u)).toBe(true);
        expect(u).toBeGreaterThan(0);
        expect(u).toBeLessThan(ANGLE_FULL_TURN);
      }
    }
  });

  it('puts 120 degrees at every corner a selection-15 base chord cuts', () => {
    for (const t of leafOrder(F)) {
      const seams = slotsOfType(F, t, S15);
      if (seams.length === 0) continue;
      const pairing = chordPairing(F, t, S15, 0);
      const n = zLeafPts(F, t).length;
      for (let s = 0; s < seams.length; s++) {
        const other = pairing[s];
        if (other < 0) continue;
        const a = seams[s].edge;
        const b = seams[other].edge;
        const shared = [a, (a + 1) % n].filter((v) => v === b || v === (b + 1) % n);
        if (shared.length === 0) continue; // a long chord, not a corner cut
        expect(interiorAngleUnits(F, t, shared[0]) * 30).toBe(120);
      }
    }
  });
});

describe('joining', () => {
  it('reads every spectre edge as a unit lattice step', () => {
    for (const t of leafOrder(F)) {
      const n = zLeafPts(F, t).length;
      for (let i = 0; i < n; i++) {
        const k = edgeDirection(F, t, i);
        expect(k).toBeGreaterThanOrEqual(0);
        expect(k).toBeLessThan(12);
      }
    }
  });

  it('places the neighbour so the shared edge is traversed in reverse', () => {
    // Phi's two active seams are edges 6 and 7; gluing 7 to another Phi's 6
    // rotates by 8 steps, and three of them compose back to the identity.
    const rel = joinTransform(F, 'Phi', 7, 'Phi', 6);
    expect(rel.m).toBe(0);
    expect(rel.k).toBe(8);
    expect((rel.k * 3) % 12).toBe(0);
  });
});

describe('the permitted relation is a strict superset of the observed one', () => {
  it('offers 100 joins under selection 15, where only 24 are ever seen', () => {
    const permitted = permittedJoins(F, S15);
    let n = 0;
    for (const l of permitted.values()) n += l.length;
    expect(n).toBe(100);
    // Lambda's +1A may meet four different -1A slots by label algebra.
    expect((permitted.get('Lambda +1A') ?? []).map((s) => s.id)).toEqual([
      'Xi -1A',
      'Pi -1A',
      'Psi -1A',
      'Gamma1 -1A',
    ]);
  });
});

describe('walking', () => {
  it('closes three Phi tiles into a length-3 circuit, and rejects every other filler', () => {
    let st = startWalk(F, S15, BASE, 'Phi', 0);
    for (let i = 0; i < 2; i++) {
      const o = options(st).find((x) => x.slot.type === 'Phi');
      expect(o?.admissible).toBe(true);
      st = step(st, o!);
    }
    const final = options(st);
    const closing = final.filter((o) => o.closes);
    expect(closing).toHaveLength(1);
    expect(closing[0].slot.type).toBe('Phi');
    expect(closing[0].admissible).toBe(true);
    // the same position filled by any other type piles 630 degrees on a vertex
    for (const o of final.filter((x) => !x.closes)) {
      expect(o.admissible).toBe(false);
      expect(o.worstAngle).toBeGreaterThan(ANGLE_FULL_TURN);
    }
    expect(st.tiles).toHaveLength(3);
  });

  it('undoes back to the first tile and no further', () => {
    let st = startWalk(F, S15, BASE, 'Phi', 0);
    st = step(st, options(st).find((o) => o.slot.type === 'Phi')!);
    expect(st.tiles).toHaveLength(2);
    st = undo(st);
    expect(st.tiles).toHaveLength(1);
    expect(undo(st).tiles).toHaveLength(1);
  });

  it('admits ONLY length-3 circuits in the base combo, exhaustively over the superset', () => {
    // The headline of sel15-proof/07-permitted-search.ts, kept as a regression:
    // searching the PERMITTED relation with the exact angle and overlap tests
    // terminates on its own here, so the bound needs no cluster atlas.
    const closed = new Set<number>();
    let open = 0;
    const DEPTH = 8;
    const dfs = (state: WalkState): void => {
      if (state.tiles.length > DEPTH) {
        open++;
        return;
      }
      for (const o of options(state).filter((x) => x.admissible)) {
        if (o.closes) closed.add(state.tiles.length);
        else dfs(step(state, o));
      }
    };
    for (const s of allSlots(F, S15)) {
      if (chordPairing(F, s.type, S15, 0)[s.seam] < 0) continue;
      dfs(startWalk(F, S15, BASE, s.type, s.seam));
    }
    expect([...closed].sort((a, b) => a - b)).toEqual([3]);
    expect(open).toBe(0);
  });
});
