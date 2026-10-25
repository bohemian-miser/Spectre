/**
 * Searching pairings: by combination string with `?` wildcards, and by what a
 * tile's pairing joins ("Theta joins its edge 0 to its edge 3").
 *
 * Edges are a tile's physical edges, numbered as in `leafPts` (edge i runs
 * from vertex i to i + 1). A connection point sits on one seam (`MetaEdge`),
 * which may span several physical edges; a chord joins edges a and b when one
 * end's seam covers a and the other's covers b. A rule that leaves either
 * edge without a strand can't match.
 */

import { connectionPoints } from './edges';
import { leafOrder, type TileFamilyId, type TileTypeId } from './families';
import { comboToMatchingIndices, matchingAt } from './matchings';

/** Tile `type`'s pairing joins its edge `a` to its edge `b`. */
export interface EdgeJoin {
  readonly type: TileTypeId;
  readonly a: number;
  readonly b: number;
}

/** `pattern` against a combination string: `?` matches any digit; a short pattern leaves the rest free. */
export function matchesPattern(combo: string, pattern: string): boolean {
  const p = pattern.trim().toLowerCase();
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '?') continue;
    if (i >= combo.length || combo[i].toLowerCase() !== p[i]) return false;
  }
  return true;
}

const chordCache = new Map<string, readonly (readonly [readonly number[], readonly number[]])[]>();

/** Each chord of a tile's pairing, as the physical edges under its two ends. */
export function pairingEdgeChords(
  family: TileFamilyId,
  subset: readonly number[],
  combo: string,
  type: TileTypeId,
): readonly (readonly [readonly number[], readonly number[]])[] {
  const order = leafOrder(family);
  const t = order.indexOf(type);
  if (t < 0) return [];
  const indices = comboToMatchingIndices(family, subset, combo);
  const idx = indices[t] ?? 0;
  const key = `${family}|${subset.join('')}|${type}|${idx}`;
  const hit = chordCache.get(key);
  if (hit) return hit;
  const pts = connectionPoints(family, type, new Set(subset));
  const m = pts.length >= 2 && pts.length % 2 === 0 ? matchingAt(pts.length, idx) : null;
  const out = (m ?? []).map(([p, q]) => [pts[p].edge.edgeIndices, pts[q].edge.edgeIndices] as const);
  chordCache.set(key, out);
  return out;
}

/** Every join holds in this pairing. */
export function matchesJoins(family: TileFamilyId, subset: readonly number[], combo: string, joins: readonly EdgeJoin[]): boolean {
  return joins.every((j) =>
    pairingEdgeChords(family, subset, combo, j.type).some(
      ([p, q]) => (p.includes(j.a) && q.includes(j.b)) || (p.includes(j.b) && q.includes(j.a)),
    ),
  );
}
