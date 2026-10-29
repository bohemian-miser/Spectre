/**
 * A circuit's harmonic, grown on the Top-down map.
 *
 * The harmonic of a circuit is the circuit with every tile grown into a
 * level-2 supertile (`docs/HARMONICS.md`). On the map that is literal: take
 * the circuit's tiles and a margin of one tile round them (the harmonic
 * wiggles along the seams and loops round junctions, so it dips into the
 * neighbours), substitute them twice, trace the strands among the tiles two
 * depths down, and find the closed strand that reads as the circuit: the
 * sequence of the circuit's tiles its chords lie in, backtracks across a
 * seam and loops into the margin cancelled, is the circuit's own route.
 *
 * Hexagons only: the margin comes from the neighbour machine on slot paths.
 * Pure — no React, no DOM.
 */

import { addressFromId, idOf, neighbour, type HexType, type Pt } from '../../core';
import { cancelBacktracks, sameCyclic, type Visit } from '../harmonics/readings';
import { prune, substitute, type Batch, type TopDownMap } from './map';
import type { MapStrand } from './strands';
import { clusterOutline } from './world';

/** The tiles across each edge of these tiles that are on the map at the same depth. */
export function neighboursOf(map: TopDownMap, ids: readonly string[]): string[] {
  if (map.family !== 'hex') return [];
  const out = new Set<string>();
  const have = new Set(ids);
  for (const id of ids) {
    const placed = map.tiles.get(id);
    if (!placed) continue;
    const a = addressFromId(map.type as HexType, id);
    for (let e = 0; e < 6; e++) {
      const nb = neighbour(a, e);
      if (!nb.ok) continue;
      const nid = idOf(nb.address);
      if (!have.has(nid) && map.tiles.get(nid)?.depth === placed.depth) out.add(nid);
    }
  }
  return [...out];
}

export type GrowResult =
  | { readonly ok: true; readonly map: TopDownMap; readonly batches: readonly [Batch, Batch]; readonly margin: readonly string[] }
  | { readonly ok: false; readonly reason: string };

/** Tiles grown this way may bring the map to this many tiles: the harmonic of a 441-tile circuit needs about 70,000. */
export const GROW_LIMIT = 120_000;

/**
 * Substitutes the tiles and a margin of two tiles round them, twice (the
 * harmonic's loops round junctions reach two tiles out). With `trim`, every
 * other tile is dropped from the map first.
 */
export function growTwice(map: TopDownMap, ids: readonly string[], trim = false): GrowResult {
  const ring1 = neighboursOf(map, ids);
  const ring2 = neighboursOf(map, [...ids, ...ring1]);
  const margin = [...ring1, ...ring2];
  const region = new Set([...ids, ...margin]);
  const base = trim ? prune(map, (p) => region.has(p.tile.id)) : map;
  const first = substitute(base, [...ids, ...margin], GROW_LIMIT);
  if (!first.ok) return first;
  const children = [...first.batch.children.values()].flat().map((p) => p.tile.id);
  const second = substitute(first.map, children, GROW_LIMIT);
  if (!second.ok) return second;
  return { ok: true, map: second.map, batches: [first.batch, second.batch], margin };
}

/** The slot path `up` levels above a tile's. */
export const ancestorOf = (id: string, up: number): string => (up ? id.split('.').slice(0, -up).join('.') : id);

/**
 * A strand read `up` levels above its tiles: one visit per run of chords in
 * the same ancestor, backtracks cancelled, then every excursion of at most
 * two visits out of `inside` and back to the same ancestor cancelled too
 * (the loops round junctions). Returns the ancestors visited, in order, and
 * how many loops were cancelled.
 */
export function readUp(route: readonly string[], up: number, inside: ReadonlySet<string>): { ids: string[]; loops: number } {
  const raw: Visit[] = [];
  for (const id of route) {
    const anc = ancestorOf(id, up);
    const last = raw[raw.length - 1];
    if (last && last.id === anc) raw[raw.length - 1] = { ...last, tiles: last.tiles + 1 };
    else raw.push({ id: anc, type: '', slot: 0, parent: '', tiles: 1 });
  }
  if (raw.length > 1 && raw[0].id === raw[raw.length - 1].id) {
    raw[0] = { ...raw[0], tiles: raw[0].tiles + raw[raw.length - 1].tiles };
    raw.pop();
  }
  let out = cancelBacktracks(raw);
  let loops = 0;
  for (;;) {
    const n = out.length;
    let hit = -1;
    let len = 0;
    for (let i = 0; i < n && hit < 0; i++) {
      if (!inside.has(out[i].id)) continue;
      for (let m = 1; m <= 2 && m + 1 < n; m++) {
        const back = (i + m + 1) % n;
        if (out[back].id !== out[i].id) continue;
        let outside = true;
        for (let q = 1; q <= m; q++) if (inside.has(out[(i + q) % n].id)) outside = false;
        if (outside) { hit = i; len = m; break; }
      }
    }
    if (hit < 0) break;
    const idx = Array.from({ length: len + 2 }, (_, q) => (hit + q) % n);
    const merged: Visit = { ...out[hit], tiles: idx.reduce((s, q) => s + out[q].tiles, 0) };
    const set = new Set(idx);
    out = out.flatMap((v, q) => (q === hit ? [merged] : set.has(q) ? [] : [v]));
    loops++;
  }
  return { ids: out.map((v) => v.id), loops };
}

export interface HarmonicMatch {
  /** Index into the strands. */
  readonly strand: number;
  readonly loops: number;
  /** Whether the strand's reading is exactly the circuit's route. */
  readonly exact: boolean;
  /** Of the circuit's tiles, how many the strand runs through. */
  readonly covered: number;
}

/**
 * Among the closed strands two depths below the circuit's tiles, the one
 * that reads as the circuit; failing that, the one through most of its tiles.
 */
export function findHarmonic(strands: readonly MapStrand[], route: readonly string[], depth: number): HarmonicMatch | null {
  const tiles = new Set(route);
  const want = readUp(route, 0, tiles).ids;
  let best: HarmonicMatch | null = null;
  strands.forEach((s, i) => {
    if (!s.closed || s.depth !== depth + 2) return;
    const r = readUp(s.route, 2, tiles);
    const covered = new Set(r.ids.filter((id) => tiles.has(id))).size;
    const exact = sameCyclic(want, r.ids);
    const m: HarmonicMatch = { strand: i, loops: r.loops, exact, covered };
    if (!best || (exact && !best.exact) || (exact === best.exact && covered > best.covered)) best = m;
  });
  return best;
}

/** The outline of each of these tiles' descendants `down` depths below, in world coordinates. */
export function descendantOutlines(map: TopDownMap, ids: readonly string[], down: number): (readonly (readonly [Pt, Pt])[])[] {
  const out: (readonly (readonly [Pt, Pt])[])[] = [];
  for (const id of ids) {
    const kids = [...map.tiles.values()].filter((p) => p.tile.id.startsWith(`${id}.`) && p.tile.id.split('.').length === id.split('.').length + down).map((p) => p.tile);
    if (!kids.length) continue;
    const frame = map.frames[kids[0].id.split('.').length - map.start];
    if (frame) out.push(clusterOutline(map.family, kids, frame));
  }
  return out;
}
