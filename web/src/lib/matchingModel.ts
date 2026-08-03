/**
 * Per-tile matching logic for the matching editor / slider widgets
 * (DESIGN.md §3.6 slider semantics, §6.4 `MatchingSlider`).
 *
 * Two index spaces are in play and must never be confused:
 *  - the FULL enumeration index (`enumerateMatchings` order) — what the URL
 *    `m=` parameter, `CircuitInput.matchingIndexByType` and the slider store;
 *  - the NON-CROSSING option position — what a combination-string digit is.
 * `nonCrossingForTile` bridges them, and everything below stores the full index.
 */

import {
  DEFAULT_CONTRACTS,
  connectionCount,
  enumerateMatchings,
  leafOrder,
  matchingCount,
  nonCrossingForTile,
  type ConnectionPoint,
  type EdgeContracts,
  type Matching,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import { tileConnectionPoints } from './tilingModel';

export interface TileMatchingInfo {
  readonly family: TileFamilyId;
  readonly type: TileTypeId;
  readonly points: readonly ConnectionPoint[];
  /** Number of connection points (`connectionCount`). */
  readonly pointCount: number;
  /** Total matchings, i.e. `(n-1)!!` — 0 when the count is odd. */
  readonly total: number;
  /** Full-enumeration indices of the non-crossing options, in canonical order. */
  readonly nonCrossing: readonly number[];
  /** Odd connection count: this tile can never be fully paired (the "sad tile"). */
  readonly odd: boolean;
}

const infoCache = new Map<string, TileMatchingInfo>();

export function tileMatchingInfo(
  family: TileFamilyId,
  type: TileTypeId,
  selected: ReadonlySet<number>,
  contracts: EdgeContracts = DEFAULT_CONTRACTS,
): TileMatchingInfo {
  const custom = contracts !== DEFAULT_CONTRACTS ? JSON.stringify(contracts) : '';
  const key = `${family}/${type}/${[...selected].sort((a, b) => a - b).join('')}/${custom}`;
  const hit = infoCache.get(key);
  if (hit) return hit;

  const points = tileConnectionPoints(family, type, selected, contracts);
  const n = connectionCount(family, type, selected);
  const info: TileMatchingInfo = {
    family,
    type,
    points,
    pointCount: n,
    total: matchingCount(n),
    nonCrossing: nonCrossingForTile(family, type, selected),
    odd: n % 2 !== 0,
  };
  infoCache.set(key, info);
  return info;
}

/** The indices a slider may cycle through, honouring the non-crossing filter. */
export function matchingOptions(info: TileMatchingInfo, nonCrossingOnly: boolean): readonly number[] {
  if (nonCrossingOnly) return info.nonCrossing;
  return Array.from({ length: info.total }, (_, i) => i);
}

/** Clamp/snap an index into the current option list. */
export function normalizeMatchingIndex(
  info: TileMatchingInfo,
  index: number,
  nonCrossingOnly: boolean,
): number {
  const opts = matchingOptions(info, nonCrossingOnly);
  if (opts.length === 0) return 0;
  if (opts.includes(index)) return index;
  // Snap to the nearest option at or below the requested index.
  let best = opts[0];
  for (const o of opts) {
    if (o <= index) best = o;
    else break;
  }
  return best;
}

/** Position of a full index within the option list (-1 when filtered out). */
export function optionPosition(
  info: TileMatchingInfo,
  index: number,
  nonCrossingOnly: boolean,
): number {
  return matchingOptions(info, nonCrossingOnly).indexOf(index);
}

/** Cycle by `delta` option slots, wrapping. Returns the new FULL index. */
export function cycleMatchingIndex(
  info: TileMatchingInfo,
  current: number,
  delta: number,
  nonCrossingOnly = false,
): number {
  const opts = matchingOptions(info, nonCrossingOnly);
  if (opts.length === 0) return 0;
  const at = opts.indexOf(normalizeMatchingIndex(info, current, nonCrossingOnly));
  const from = at < 0 ? 0 : at;
  const next = ((from + delta) % opts.length + opts.length) % opts.length;
  return opts[next];
}

export interface Chord {
  /** Indices into `connectionPoints()` order. */
  readonly a: number;
  readonly b: number;
  readonly from: Pt;
  readonly to: Pt;
}

/** The chords a matching draws between a tile's connection points. */
export function matchingChords(info: TileMatchingInfo, index: number): readonly Chord[] {
  const all = enumerateMatchings(info.pointCount);
  const m = all[index];
  if (!m) return [];
  return m.map(([a, b]) => ({
    a,
    b,
    from: info.points[a].pt,
    to: info.points[b].pt,
  }));
}

/** Canonical form: each pair sorted, pairs sorted by their first element. */
export function canonicalMatching(m: Matching): Matching {
  return [...m]
    .map(([a, b]) => (a <= b ? ([a, b] as const) : ([b, a] as const)))
    .sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}

function matchingSignature(m: Matching): string {
  return canonicalMatching(m)
    .map((p) => p.join('-'))
    .join(',');
}

const indexCache = new Map<number, Map<string, number>>();

/** Full-enumeration index of an arbitrary matching (-1 when it is not one). */
export function matchingIndexOf(n: number, m: Matching): number {
  let table = indexCache.get(n);
  if (!table) {
    table = new Map<string, number>();
    enumerateMatchings(n).forEach((cand, i) => table!.set(matchingSignature(cand), i));
    indexCache.set(n, table);
  }
  return table.get(matchingSignature(m)) ?? -1;
}

/**
 * Result of the "pair these two dots" gesture (§6.5): pair `i` with `j`, then
 * re-pair the two points they were orphaned from. Returns the new FULL index,
 * or the unchanged index when the request is degenerate.
 */
export function pairPoints(
  info: TileMatchingInfo,
  currentIndex: number,
  i: number,
  j: number,
): number {
  if (i === j || info.total === 0) return currentIndex;
  const base = enumerateMatchings(info.pointCount)[currentIndex];
  if (!base) return currentIndex;
  if (base.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) return currentIndex;

  const orphans: number[] = [];
  const kept: (readonly [number, number])[] = [];
  for (const [a, b] of base) {
    if (a === i || a === j || b === i || b === j) {
      if (a !== i && a !== j) orphans.push(a);
      if (b !== i && b !== j) orphans.push(b);
    } else {
      kept.push([a, b]);
    }
  }
  const next: (readonly [number, number])[] = [...kept, [i, j] as const];
  if (orphans.length === 2) next.push([orphans[0], orphans[1]] as const);
  else if (orphans.length !== 0) return currentIndex; // should not happen

  const idx = matchingIndexOf(info.pointCount, next);
  return idx < 0 ? currentIndex : idx;
}

/** The point currently paired with `i`, or -1. */
export function partnerOf(info: TileMatchingInfo, index: number, i: number): number {
  const m = enumerateMatchings(info.pointCount)[index];
  if (!m) return -1;
  for (const [a, b] of m) {
    if (a === i) return b;
    if (b === i) return a;
  }
  return -1;
}

/** Matching-index vector (in `leafOrder` order) as the record `analyze` wants. */
export function matchingVectorToRecord(
  family: TileFamilyId,
  matching: readonly number[],
): Record<string, number> {
  const out: Record<string, number> = {};
  leafOrder(family).forEach((type, i) => {
    out[type] = matching[i] ?? 0;
  });
  return out;
}

/** Inverse of {@link matchingVectorToRecord}. */
export function recordToMatchingVector(
  family: TileFamilyId,
  record: Readonly<Record<string, number>>,
): readonly number[] {
  return leafOrder(family).map((type) => record[type] ?? 0);
}
