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

/** Which digits a position takes across a selection, commonest first. */
export interface DigitSpread {
  readonly position: number;
  readonly type: TileTypeId;
  readonly values: readonly { readonly digit: string; readonly count: number }[];
}

export interface SelectionPattern {
  readonly rule: string;
  readonly subset: readonly number[];
  readonly count: number;
  /** The shared digit where every selected pairing of this rule agrees, '?' where they differ. */
  readonly pattern: string;
  readonly spread: readonly DigitSpread[];
}

/** Per rule in a selection: its combination strings summed up as one pattern with '?' wildcards. */
export function selectionPatterns(
  family: TileFamilyId,
  items: readonly { readonly rule: string; readonly subset: readonly number[]; readonly combo: string }[],
): SelectionPattern[] {
  const types = leafOrder(family);
  const by = new Map<string, { subset: readonly number[]; combos: string[] }>();
  for (const it of items) {
    const e = by.get(it.rule) ?? { subset: it.subset, combos: [] };
    e.combos.push(it.combo);
    by.set(it.rule, e);
  }
  return [...by].map(([rule, { subset, combos }]) => {
    const len = Math.max(...combos.map((c) => c.length));
    const spread: DigitSpread[] = Array.from({ length: len }, (_, i) => {
      const tally = new Map<string, number>();
      for (const c of combos) tally.set(c[i] ?? '0', (tally.get(c[i] ?? '0') ?? 0) + 1);
      return {
        position: i,
        type: types[i],
        values: [...tally].map(([digit, count]) => ({ digit, count })).sort((a, b) => b.count - a.count || a.digit.localeCompare(b.digit)),
      };
    });
    return { rule, subset, count: combos.length, pattern: spread.map((s) => (s.values.length === 1 ? s.values[0].digit : '?')).join(''), spread };
  });
}

/** One chord drawn on a tile, in the tile's own frame, and how many selected pairings draw it. */
export interface TileChordTally {
  readonly a: { readonly x: number; readonly y: number };
  readonly b: { readonly x: number; readonly y: number };
  readonly count: number;
}

/** Every chord the selected pairings draw on one tile, with how many of them draw it. */
export function selectionTileChords(
  family: TileFamilyId,
  items: readonly { readonly subset: readonly number[]; readonly combo: string }[],
  type: TileTypeId,
): TileChordTally[] {
  const t = leafOrder(family).indexOf(type);
  if (t < 0) return [];
  const key = (p: { x: number; y: number }) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  const tally = new Map<string, { a: { x: number; y: number }; b: { x: number; y: number }; count: number }>();
  for (const it of items) {
    const pts = connectionPoints(family, type, new Set(it.subset)).map((c) => c.pt);
    if (pts.length < 2 || pts.length % 2) continue;
    const m = matchingAt(pts.length, comboToMatchingIndices(family, it.subset, it.combo)[t] ?? 0);
    for (const [i, j] of m ?? []) {
      const [a, b] = key(pts[i]) < key(pts[j]) ? [pts[i], pts[j]] : [pts[j], pts[i]];
      const k = `${key(a)}|${key(b)}`;
      const e = tally.get(k);
      if (e) e.count++;
      else tally.set(k, { a, b, count: 1 });
    }
  }
  return [...tally.values()].sort((x, y) => x.count - y.count);
}
