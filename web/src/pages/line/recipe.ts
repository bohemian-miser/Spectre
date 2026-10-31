/**
 * A route's recipe: the pieces two (or `d`) levels down that a route of a
 * supertile passes through, in order, and which route of each it takes,
 * from the walk of `period.walkExpansion`. A route is named by its type and
 * the crossing it is entered at and left by; recipes are walked from the
 * lower-numbered end.
 */
import { HEX_TYPES, type HexType } from '../../core';
import { expand, walkExpansion, type State } from '../period/period';

/** One piece a route passes: its slot path below the supertile, its type, and the crossings of its border it is entered at and left by. */
export interface Use {
  readonly piece: number;
  readonly path: readonly number[];
  readonly type: HexType;
  readonly enter: number;
  readonly leave: number;
}

export interface Recipe {
  readonly type: HexType;
  readonly from: number;
  readonly to: number;
  readonly uses: readonly Use[];
}

/** Every route of every type at level n + d, as the level-n routes it is walked through. */
export function recipes(states: readonly State[], n: number, d: number): Record<HexType, Recipe[]> {
  const out = {} as Record<HexType, Recipe[]>;
  for (const type of HEX_TYPES) {
    const x = expand(states, n + d, type, d);
    const mateOf = (piece: number, pos: number) => states[n][x.pieces[piece].type].mate[pos];
    const walked = walkExpansion(x, (i) => states[n][x.pieces[i].type]);
    out[type] = walked.routes
      .map((r) => {
        let uses: Use[] = r.enters.map((c) => ({ piece: c.piece, path: x.pieces[c.piece].path, type: x.pieces[c.piece].type, enter: c.pos, leave: mateOf(c.piece, c.pos) }));
        if (r.from > r.to) uses = uses.reverse().map((u) => ({ ...u, enter: u.leave, leave: u.enter }));
        return { type, from: Math.min(r.from, r.to), to: Math.max(r.from, r.to), uses };
      })
      .sort((a, b) => a.from - b.from);
  }
  return out;
}

const useKey = (u: Use): string => `${u.path.join('.')}:${u.type}:${u.enter}>${u.leave}`;

/** Same routes, through the same pieces, taking the same routes in the same order. */
export function sameRecipes(a: Record<HexType, Recipe[]>, b: Record<HexType, Recipe[]>): boolean {
  return HEX_TYPES.every((t) => a[t].length === b[t].length && a[t].every((r, i) => {
    const s = b[t][i];
    return r.from === s.from && r.to === s.to && r.uses.length === s.uses.length && r.uses.every((u, k) => useKey(u) === useKey(s.uses[k]));
  }));
}

/** A route's chords at level n + d, counted through its recipe from the level-n routes' chords. */
export const chordsThrough = (states: readonly State[], n: number, r: Recipe): number =>
  r.uses.reduce((a, u) => a + states[n][u.type].chords[u.enter], 0);
