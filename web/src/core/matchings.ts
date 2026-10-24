/**
 * Perfect matchings of a tile's connection points, plus the canonical
 * "combination string" codec used by the blog / notebook / CSV data.
 *
 * `enumerateMatchings` is an index-based port of `analysis.findPerfectMatchings`
 * and preserves its enumeration order exactly.
 */

import type { Pt } from './geom';
import { connectionCount, connectionPoints, DEFAULT_CONTRACTS, hasMultiStrands, type EdgeContracts } from './edges';
import { leafOrder, type TileFamilyId, type TileTypeId } from './families';

/** Pairs of indices into `connectionPoints()` order. */
export type Matching = readonly (readonly [number, number])[];

const matchingCache = new Map<number, readonly Matching[]>();

function enumerateOn(indices: readonly number[]): Matching[] {
  if (indices.length === 0) return [[]];
  if (indices.length % 2 !== 0) return [];

  const first = indices[0];
  const rest = indices.slice(1);
  const solutions: Matching[] = [];
  for (let i = 0; i < rest.length; i++) {
    const pair: readonly [number, number] = [first, rest[i]];
    const remaining = rest.slice(0, i).concat(rest.slice(i + 1));
    for (const sub of enumerateOn(remaining)) solutions.push([pair, ...sub]);
  }
  return solutions;
}

/**
 * All perfect matchings of `n` points in the exact order of the old
 * `findPerfectMatchings`: the first point pairs with each remaining point in
 * order, recursing on the rest. Count = (n-1)!! = 1, 3, 15, 105, 945, …
 */
export function enumerateMatchings(n: number): readonly Matching[] {
  if (n < 0 || !Number.isInteger(n)) return [];
  const hit = matchingCache.get(n);
  if (hit) return hit;
  const out = enumerateOn(Array.from({ length: n }, (_, i) => i));
  matchingCache.set(n, out);
  return out;
}

/** Above this many points, matchings are unranked one at a time instead of listed. */
const LIST_MAX_POINTS = 12;

/**
 * Matching `index` of `n` points, in {@link enumerateMatchings} order, without
 * listing the others: the first point's partner picks a block of
 * `(n − 3)!!` matchings, and so on down. Undefined when out of range.
 */
export function matchingAt(n: number, index: number): Matching | undefined {
  if (n <= LIST_MAX_POINTS) return enumerateMatchings(n)[index];
  if (n % 2 !== 0 || index < 0 || index >= matchingCount(n) || !Number.isInteger(index)) return undefined;
  const left = Array.from({ length: n }, (_, i) => i);
  const out: [number, number][] = [];
  let r = index;
  while (left.length) {
    const block = matchingCount(left.length - 2);
    const pick = Math.floor(r / block);
    r -= pick * block;
    const first = left.shift()!;
    const [partner] = left.splice(pick, 1);
    out.push([first, partner]);
  }
  return out;
}

/** Inverse of {@link matchingAt}: the index of a perfect matching of `n` points, or -1. */
export function matchingRank(n: number, m: Matching): number {
  const partner = new Array<number>(n).fill(-1);
  for (const [a, b] of m) {
    if (a < 0 || b < 0 || a >= n || b >= n || a === b || partner[a] !== -1 || partner[b] !== -1) return -1;
    partner[a] = b;
    partner[b] = a;
  }
  if (partner.some((p) => p === -1)) return -1;
  const left = Array.from({ length: n }, (_, i) => i);
  let index = 0;
  while (left.length) {
    const first = left.shift()!;
    const pos = left.indexOf(partner[first]);
    index += pos * matchingCount(left.length - 1);
    left.splice(pos, 1);
  }
  return index;
}

/** (n-1)!! — the number of perfect matchings of n points (0 for odd n). */
export function matchingCount(n: number): number {
  if (n < 0 || n % 2 !== 0) return 0;
  let acc = 1;
  for (let k = n - 1; k > 0; k -= 2) acc *= k;
  return acc;
}

// ---------------------------------------------------------------------------
// Non-crossing matchings
// ---------------------------------------------------------------------------

function cross(ox: number, oy: number, ax: number, ay: number, bx: number, by: number): number {
  return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
}

/** Proper segment intersection (shared endpoints and touching do not count). */
export function segmentsCross(a1: Pt, a2: Pt, b1: Pt, b2: Pt): boolean {
  const d1 = cross(a1.x, a1.y, a2.x, a2.y, b1.x, b1.y);
  const d2 = cross(a1.x, a1.y, a2.x, a2.y, b2.x, b2.y);
  const d3 = cross(b1.x, b1.y, b2.x, b2.y, a1.x, a1.y);
  const d4 = cross(b1.x, b1.y, b2.x, b2.y, a2.x, a2.y);
  const EPS = 1e-9;
  return (
    ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) &&
    ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))
  );
}

/**
 * Indices (into `enumerateMatchings` order) of the matchings whose chords do
 * not intersect when drawn between the given connection points.
 *
 * NOTE: this *geometric* test is strictly more permissive than the topological
 * one below, because a Spectre is concave — chords between midpoints of
 * interleaved seams can still miss each other in the plane. The canonical
 * combination-string encoding uses the topological rule (see
 * {@link nonCrossingMatchingIndicesCyclic} and {@link nonCrossingForTile}).
 */
export function geometricNonCrossingMatchingIndices(points: readonly Pt[]): readonly number[] {
  const all = enumerateMatchings(points.length);
  const out: number[] = [];
  for (let mi = 0; mi < all.length; mi++) {
    const m = all[mi];
    let ok = true;
    for (let i = 0; ok && i < m.length; i++) {
      for (let j = i + 1; ok && j < m.length; j++) {
        if (segmentsCross(points[m[i][0]], points[m[i][1]], points[m[j][0]], points[m[j][1]])) {
          ok = false;
        }
      }
    }
    if (ok) out.push(mi);
  }
  return out;
}

/**
 * Topological (and canonical) variant: connection points are listed in cyclic
 * order around the tile, so two chords cross iff their index intervals
 * interleave. This is the notebook's `no_crossing` test and therefore the
 * definition the CSV combination strings are built on.
 */
export function nonCrossingMatchingIndicesCyclic(n: number): readonly number[] {
  if (n > LIST_MAX_POINTS) return nonCrossingByRank(n);
  const all = enumerateMatchings(n);
  const out: number[] = [];
  for (let mi = 0; mi < all.length; mi++) {
    const pairs = all[mi].map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as const);
    let ok = true;
    for (let i = 0; ok && i < pairs.length; i++) {
      for (let j = i + 1; ok && j < pairs.length; j++) {
        const [a1, a2] = pairs[i];
        const [b1, b2] = pairs[j];
        if ((a1 < b1 && b1 < a2 && a2 < b2) || (b1 < a1 && a1 < b2 && b2 < a2)) ok = false;
      }
    }
    if (ok) out.push(mi);
  }
  return out;
}

const nonCrossingCache = new Map<number, readonly number[]>();

/** The same list built directly (Catalan(n/2) of them) and ranked, for big n. */
function nonCrossingByRank(n: number): readonly number[] {
  if (n % 2 !== 0) return [];
  const hit = nonCrossingCache.get(n);
  if (hit) return hit;
  const out: number[] = [];
  const pairs: [number, number][] = [];
  const gen = (lo: number, hi: number, then: () => void): void => {
    if (lo >= hi) return then();
    for (let j = lo + 1; j < hi; j += 2) {
      pairs.push([lo, j]);
      gen(lo + 1, j, () => gen(j + 1, hi, then));
      pairs.pop();
    }
  };
  gen(0, n, () => out.push(matchingRank(n, pairs)));
  out.sort((a, b) => a - b);
  nonCrossingCache.set(n, out);
  return out;
}

/**
 * Non-crossing matching indices for one leaf tile under a subset of classes,
 * using the canonical topological rule. This is what combination-string digits
 * index into, and it is verified against `graph_analysis/lvl4.csv`.
 *
 * Contracts do not affect the result (they slide points along their seams
 * without reordering them), so the parameter is accepted but unused.
 */
export function nonCrossingForTile(
  family: TileFamilyId,
  type: TileTypeId,
  selected: ReadonlySet<number>,
  /** Only the strand counts matter: they decide how many points there are. */
  contracts?: EdgeContracts,
): readonly number[] {
  return nonCrossingMatchingIndicesCyclic(connectionCount(family, type, selected, contracts));
}

/** Geometric variant of {@link nonCrossingForTile} (chords that truly miss). */
export function geometricNonCrossingForTile(
  family: TileFamilyId,
  type: TileTypeId,
  selected: ReadonlySet<number>,
  contracts: EdgeContracts = DEFAULT_CONTRACTS,
): readonly number[] {
  const pts = connectionPoints(family, type, selected, contracts).map((c) => c.pt);
  return geometricNonCrossingMatchingIndices(pts);
}

// ---------------------------------------------------------------------------
// Combination strings
// ---------------------------------------------------------------------------

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

export function comboDigitValue(ch: string): number {
  const v = DIGITS.indexOf(ch.toLowerCase());
  return v < 0 ? 0 : v;
}

export function comboDigitChar(v: number): string | null {
  return v >= 0 && v < DIGITS.length ? DIGITS[v] : null;
}

function toSet(subset: readonly number[]): ReadonlySet<number> {
  return new Set(subset);
}

/**
 * Combination string -> full matching-enumeration indices, in
 * `leafOrder(family)` order. Digit `d` selects that tile's d-th NON-CROSSING
 * matching (clamped when out of range, per the lenient decoder rule).
 */
export function comboToMatchingIndices(
  family: TileFamilyId,
  subset: readonly number[],
  combo: string,
  /** Positions never reorder points; only the strand counts matter here. */
  contracts?: EdgeContracts,
): readonly number[] {
  const selected = toSet(subset);
  const order = leafOrder(family);
  return order.map((type, i) => {
    const nc = nonCrossingForTile(family, type, selected, contracts);
    if (nc.length === 0) return 0;
    const d = i < combo.length ? comboDigitValue(combo[i]) : 0;
    return nc[Math.min(d, nc.length - 1)];
  });
}

/**
 * Inverse of {@link comboToMatchingIndices}; returns null when some selected
 * matching is crossing (not representable as a combo digit) or its
 * non-crossing index is >= 36, or when some class carries several strands.
 */
export function matchingIndicesToCombo(
  family: TileFamilyId,
  subset: readonly number[],
  indices: readonly number[],
  /** Positions never reorder points; only the strand counts matter here. */
  contracts?: EdgeContracts,
): string | null {
  // A digit per tile can't say how many strands each class carries.
  if (hasMultiStrands(contracts)) return null;
  const selected = toSet(subset);
  const order = leafOrder(family);
  let out = '';
  for (let i = 0; i < order.length; i++) {
    const nc = nonCrossingForTile(family, order[i], selected, contracts);
    const want = indices[i] ?? 0;
    if (nc.length === 0) {
      // No choice to make for this tile; canonical digit is 0.
      if (want !== 0) return null;
      out += '0';
      continue;
    }
    const pos = nc.indexOf(want);
    if (pos < 0) return null;
    const ch = comboDigitChar(pos);
    if (ch === null) return null;
    out += ch;
  }
  return out;
}

const SHARE_RE = /^([0-9]*)-([0-9a-z]+)$/i;

/** Parse the canonical share form, e.g. '2578-0100101100'. */
export function parseComboShareString(
  s: string,
): { subset: readonly number[]; combo: string } | null {
  const m = SHARE_RE.exec(s.trim());
  if (!m) return null;
  const subset = [...m[1]].map((c) => Number.parseInt(c, 10));
  if (subset.some((n) => !Number.isFinite(n))) return null;
  const sorted = [...new Set(subset)].sort((a, b) => a - b);
  if (sorted.length !== subset.length) return null;
  return { subset: sorted, combo: m[2].toLowerCase() };
}

export function formatComboShareString(subset: readonly number[], combo: string): string {
  return `${[...subset].sort((a, b) => a - b).join('')}-${combo}`;
}

/**
 * Largest valid matching index for one tile under a seam subset. The subset
 * decides how many connection points the tile has, and that decides how many
 * ways they can be paired up.
 */
export function maxMatchingIndex(
  family: TileFamilyId,
  type: TileTypeId,
  subset: readonly number[],
  contracts?: EdgeContracts,
): number {
  return Math.max(0, matchingCount(connectionCount(family, type, new Set(subset), contracts)) - 1);
}

/**
 * Re-shape and clamp a matching vector for a family and seam subset. Must be
 * called after ANY change that can invalidate indices — a family swap or, far
 * more often, a subset edit: removing a seam class removes connection points,
 * so an index that was valid a moment ago can now be past the end.
 *
 * Skipping this is not a cosmetic bug. `matchingIndicesToCombo` rejects an
 * out-of-range index exactly as it rejects a crossing one, so a stale vector
 * makes a perfectly good rule report that it "crosses itself" and refuse to
 * produce a combination string.
 */
export function normalizeMatchingVector(
  family: TileFamilyId,
  subset: readonly number[],
  matching: readonly number[],
  contracts?: EdgeContracts,
): readonly number[] {
  return leafOrder(family).map((type, i) => {
    const max = maxMatchingIndex(family, type, subset, contracts);
    const want = Math.round(matching[i] ?? 0);
    if (!Number.isFinite(want)) return 0;
    return Math.min(max, Math.max(0, want));
  });
}
