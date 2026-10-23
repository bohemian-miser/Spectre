/**
 * Undirected circuits with any number of strands per edge.
 *
 * Each edge class carries a count n = 0, 1, 2, …; a tile is happy when the
 * strand ends on its boundary come to an even total, so they can pair up
 * inside it. Only n mod 2 matters for that, so the valid counts are the mod-2
 * tail-free selections plus any number of extra pairs on any edge: a lattice
 * of full rank whose quotient by "+2 anywhere" is the old (Z/2)^d.
 *
 * Unlike flows, nothing needs a direction, so class 0 is back.
 */

import { HEX_LEAF_ORDER, HEX_PTS, edgeLabels, type TileTypeId } from './families';
import { parseEdgeLabel } from './edges';
import { transPt, type Pt } from './geom';

export interface MultiEdgeModel {
  readonly types: readonly TileTypeId[];
  /** The edge classes, in column order. */
  readonly classes: readonly number[];
  /** types x classes: how many of the tile's edges are of that class. */
  readonly counts: readonly (readonly number[])[];
  /** Mod-2 tail-free selections spanning the rest, lightest first, as 0/1 per class. */
  readonly basis: readonly (readonly number[])[];
}

/** The class of each of a hexagon type's six edges. */
export function edgeClasses(type: TileTypeId): number[] {
  return edgeLabels('hex', type).map((l) => parseEdgeLabel(l).major);
}

let cached: MultiEdgeModel | null = null;

export function multiEdgeModel(): MultiEdgeModel {
  if (cached) return cached;
  const types = HEX_LEAF_ORDER;
  const classes = [...new Set(types.flatMap(edgeClasses))].sort((a, b) => a - b);
  const counts = types.map((t) => {
    const cs = edgeClasses(t);
    return classes.map((c) => cs.filter((x) => x === c).length);
  });
  cached = { types, classes, counts, basis: gf2LightBasis(counts.map((r) => r.map((v) => v % 2)), classes.length) };
  return cached;
}

export interface Gf2Rref {
  /** Non-zero reduced rows, pivot first. */
  readonly rows: readonly (readonly number[])[];
  /** For each reduced row, the original row indices that XOR to it. */
  readonly from: readonly (readonly number[])[];
  /** Pivot column of each reduced row. */
  readonly pivots: readonly number[];
  /** Original rows that reduced to zero: their rule follows from the others. */
  readonly redundant: readonly number[];
}

/** Reduced row echelon form over GF(2), remembering which rows went into each. */
export function gf2Rref(input: readonly (readonly number[])[]): Gf2Rref {
  const rows = input.map((r) => r.map((v) => v & 1));
  const from = input.map((_, i) => new Set([i]));
  const n = rows[0]?.length ?? 0;
  const pivots: number[] = [];
  let r = 0;
  const xorInto = (dst: number, src: number) => {
    rows[dst] = rows[dst].map((v, k) => v ^ rows[src][k]);
    for (const i of from[src]) {
      if (from[dst].has(i)) from[dst].delete(i);
      else from[dst].add(i);
    }
  };
  for (let c = 0; c < n && r < rows.length; c++) {
    const p = rows.findIndex((row, i) => i >= r && row[c] === 1);
    if (p < 0) continue;
    [rows[r], rows[p]] = [rows[p], rows[r]];
    [from[r], from[p]] = [from[p], from[r]];
    for (let i = 0; i < rows.length; i++) if (i !== r && rows[i][c] === 1) xorInto(i, r);
    pivots.push(c);
    r++;
  }
  const sortSet = (s: Set<number>) => [...s].sort((a, b) => a - b);
  // A zero row's own index is in its set, along with the rows it was cleared by.
  const redundant = rows.slice(r).map((_, i) => Math.min(...from[r + i]));
  return { rows: rows.slice(0, r), from: from.slice(0, r).map(sortSet), pivots, redundant };
}

/** Null space over GF(2), as the lightest independent vectors (greedy over the whole span). */
export function gf2LightBasis(rows: readonly (readonly number[])[], n: number): number[][] {
  const { rows: red, pivots } = gf2Rref(rows);
  const free = Array.from({ length: n }, (_, c) => c).filter((c) => !pivots.includes(c));
  const raw = free.map((f) => {
    const v = new Array<number>(n).fill(0);
    v[f] = 1;
    red.forEach((row, i) => {
      if (row[f]) v[pivots[i]] = 1;
    });
    return v;
  });
  const span: number[][] = [];
  for (let m = 1; m < 1 << raw.length; m++) {
    const v = new Array<number>(n).fill(0);
    raw.forEach((b, i) => {
      if (m & (1 << i)) for (let k = 0; k < n; k++) v[k] ^= b[k];
    });
    span.push(v);
  }
  const weight = (v: readonly number[]) => v.reduce((a, b) => a + b, 0);
  span.sort((a, b) => weight(a) - weight(b) || b.join('').localeCompare(a.join('')));
  const basis: number[][] = [];
  for (const v of span) {
    if (basis.length === raw.length) break;
    if (gf2Rref([...basis, v]).rows.length > basis.length) basis.push(v);
  }
  return basis;
}

/** Strand ends on each tile type: the row of counts times n. */
export function tileEnds(model: MultiEdgeModel, x: readonly number[]): number[] {
  return model.counts.map((row) => row.reduce((a, v, k) => a + v * (x[k] ?? 0), 0));
}

/** Which basis selections XOR to x's parity pattern, or null if it leaves a tail somewhere. */
export function cubeCoords(model: MultiEdgeModel, x: readonly number[]): number[] | null {
  const p = x.map((v) => v & 1);
  const d = model.basis.length;
  for (let m = 0; m < 1 << d; m++) {
    const v = new Array<number>(p.length).fill(0);
    model.basis.forEach((b, i) => {
      if (m & (1 << i)) for (let k = 0; k < v.length; k++) v[k] ^= b[k];
    });
    if (v.every((bit, k) => bit === p[k])) return model.basis.map((_, i) => (m >> i) & 1);
  }
  return null;
}

export interface EndPoint {
  readonly edge: number;
  readonly pos: Pt;
}

/** n_c points spaced evenly along each class-c edge, in boundary order. */
export function tileEndPoints(model: MultiEdgeModel, type: TileTypeId, x: readonly number[], pts: readonly Pt[]): EndPoint[] {
  const cs = edgeClasses(type);
  const out: EndPoint[] = [];
  for (let edge = 0; edge < pts.length; edge++) {
    const n = x[model.classes.indexOf(cs[edge])] ?? 0;
    const a = pts[edge];
    const b = pts[(edge + 1) % pts.length];
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      out.push({ edge, pos: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t } });
    }
  }
  return out;
}

export type Pairing = readonly (readonly [number, number])[];

/**
 * Every non-crossing way to pair n points round a boundary, in a fixed order
 * (Catalan(n/2) of them). Point 0 pairs with an odd-offset point so an even
 * number sits inside, which pairs among itself; the rest pair after.
 */
export function nonCrossingPairings(n: number, limit = 500): { pairings: Pairing[]; truncated: boolean } {
  if (n % 2 !== 0) return { pairings: [], truncated: false };
  function* gen(lo: number, hi: number): Generator<[number, number][]> {
    if (lo >= hi) {
      yield [];
      return;
    }
    for (let j = lo + 1; j < hi; j += 2) {
      for (const inner of gen(lo + 1, j)) for (const outer of gen(j + 1, hi)) yield [[lo, j], ...inner, ...outer];
    }
  }
  const pairings: Pairing[] = [];
  for (const p of gen(0, n)) {
    if (pairings.length === limit) return { pairings, truncated: true };
    pairings.push(p);
  }
  return { pairings, truncated: false };
}

export interface Segment {
  readonly a: Pt;
  readonly b: Pt;
}

export interface Loop {
  readonly segments: readonly number[];
  readonly closed: boolean;
}

/**
 * Join undirected segments into loops through their shared end points (each
 * point is used by one segment on each side of an edge). Open paths are walked
 * from a free end, so they come out whole.
 */
export function traceLoops(segments: readonly Segment[]): Loop[] {
  const key = (p: Pt) => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;
  const at = new Map<string, number[]>();
  segments.forEach((s, i) => {
    for (const p of [s.a, s.b]) at.set(key(p), [...(at.get(key(p)) ?? []), i]);
  });
  const seen = new Set<number>();
  const loops: Loop[] = [];
  const walk = (start: number, fromKey: string) => {
    const out: number[] = [];
    let i: number | undefined = start;
    let came = fromKey;
    let closed = false;
    while (i !== undefined) {
      if (seen.has(i)) {
        closed = i === start;
        break;
      }
      seen.add(i);
      out.push(i);
      const s: Segment = segments[i];
      const next = key(s.a) === came ? key(s.b) : key(s.a);
      came = next;
      i = (at.get(next) ?? []).find((j) => j !== out[out.length - 1]);
    }
    loops.push({ segments: out, closed });
  };
  segments.forEach((s, i) => {
    if (seen.has(i)) return;
    for (const p of [s.a, s.b]) {
      if ((at.get(key(p)) ?? []).length === 1 && !seen.has(i)) walk(i, key(p));
    }
  });
  segments.forEach((s, i) => {
    if (!seen.has(i)) walk(i, key(s.a));
  });
  return loops;
}

/** How many count vectors with every n ≤ m leave no tails, without listing them. */
export function countWithin(model: MultiEdgeModel, m: number): number {
  const odd = Math.ceil(m / 2);
  const even = Math.floor(m / 2) + 1;
  const k = model.classes.length;
  let total = 0;
  const d = model.basis.length;
  for (let mask = 0; mask < 1 << d; mask++) {
    const v = new Array<number>(k).fill(0);
    model.basis.forEach((b, i) => {
      if (mask & (1 << i)) for (let j = 0; j < k; j++) v[j] ^= b[j];
    });
    const w = v.reduce((a, b) => a + b, 0);
    total += odd ** w * even ** (k - w);
  }
  return total;
}

/** A hexagon tile's corners placed by an instance transform. */
export function hexCorners(xform: Parameters<typeof transPt>[0]): Pt[] {
  return HEX_PTS.map((p) => transPt(xform, p));
}
