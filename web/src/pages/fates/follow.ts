/**
 * One arc followed one level up through the routes (`SparseRoutes`), at any
 * level the routes reach: into the parent's children from its end `a`, and
 * from the child across `a` back the other way, as the Explorer's tail
 * classes follow a patch's strands.
 */
import type { SparseRoutes, Walked } from '../harmonics/sparseRoutes';

export type Lifted =
  | { readonly kind: 'closed'; readonly walk: Walked; readonly steps: readonly number[] }
  /** Open: its ends one level up, `a` past the old `a` and `b` past the old `b`, its tiles, and the child crossings both walks entered. */
  | { readonly kind: 'open'; readonly a: number; readonly b: number; readonly tiles: number; readonly steps: readonly number[] }
  | { readonly kind: 'ends' };

/** The arc of a level-n supertile entering at `a`, as slot `slot` of a level-(n + 1) supertile of type `parent` (type indices of `sparseRoutes.TYPES`). */
export function liftArc(R: SparseRoutes, n: number, a: number, parent: number, slot: number, types: readonly string[]): Lifted {
  const x0 = a * 8 + slot;
  const fwd: number[] = [];
  const w = R.walk(n + 1, parent, x0, fwd);
  if (w.end === 'ends') return { kind: 'ends' };
  if (w.end === 'closed') return { kind: 'closed', walk: { level: n + 1, type: types[parent], length: w.length, steps: fwd }, steps: fwd };
  const z = R.across(n + 1, parent, x0);
  const back: number[] = [];
  const bw = z < 0 ? null : R.walk(n + 1, parent, z, back);
  if (bw && bw.end !== 'out') throw new Error(`level ${n + 1}: an arc that leaves one way does not leave the other`);
  return { kind: 'open', a: bw ? bw.exit : R.placeOf(n + 1, x0), b: w.exit, tiles: w.length + (bw ? bw.length : 0), steps: [...fwd, ...back] };
}
