/**
 * The Top-down map: tiles of mixed depths in one world. Substituting a tile
 * replaces it by its level-1 supertile cluster, one depth down, and leaves
 * every other tile where it is.
 *
 * Pure — no React, no DOM. Each change returns a new map.
 */

import {
  Z_MAX_SAFE_LEVEL,
  parentId,
  substituteBoard,
  substituteTile,
  startBoard,
  type Affine,
  type Pt,
  type TileTypeId,
  type TopDownFamily,
} from '../../core';
import { planClusters, type ClusterPlan } from './animate';
import { centrePairs, clusterOutline, depthFrame, place, type Placed } from './world';

/** Past this many tiles a substitution is refused: the canvas stops being usable. */
export const MAX_MAP_TILES = 60_000;

/**
 * Deepest depth offered. Exact coordinates stay within double-precision
 * integers to level 34 (`Z_MAX_SAFE_LEVEL`); the world picture, scaled by
 * `2.81^-depth`, keeps a thousandth of a tile's precision to about 30.
 */
export const MAX_DEPTH = Math.min(30, Z_MAX_SAFE_LEVEL - 1);

export interface Batch {
  /** The tiles substituted, as they were. */
  readonly parents: readonly Placed[];
  /** Their children, by parent slot path. */
  readonly children: ReadonlyMap<string, readonly Placed[]>;
  readonly plan: readonly ClusterPlan[];
}

export interface TopDownMap {
  readonly family: TopDownFamily;
  readonly type: TileTypeId;
  /** Depth of the starting tiles: the level of the supertile the map began as. */
  readonly start: number;
  /** World frame of each depth from `start` on, set when the depth is first reached. */
  readonly frames: readonly Affine[];
  readonly tiles: ReadonlyMap<string, Placed>;
  /** Outlines of clusters whose tiles are all still on the map, by parent slot path. */
  readonly outlines: ReadonlyMap<string, readonly (readonly [Pt, Pt])[]>;
  readonly history: readonly Batch[];
}

export function startMap(family: TopDownFamily, type: TileTypeId, level: number): TopDownMap {
  let board = startBoard(type);
  for (let i = 0; i < level; i++) board = substituteBoard(board, undefined, family);
  const frame: Affine = [1, 0, 0, 0, 1, 0];
  const tiles = new Map(board.map((t) => [t.id, place(family, t, frame)]));
  return { family, type, start: level, frames: [frame], tiles, outlines: new Map(), history: [] };
}

export type SubstituteResult =
  | { readonly ok: true; readonly map: TopDownMap; readonly batch: Batch }
  | { readonly ok: false; readonly reason: string };

/** Replace the tiles with these slot paths by their clusters; `limit` is the most tiles the map may then hold. */
export function substitute(map: TopDownMap, ids: readonly string[], limit = MAX_MAP_TILES): SubstituteResult {
  const parents = ids.map((id) => map.tiles.get(id)).filter((p): p is Placed => p !== undefined);
  if (parents.length === 0) return { ok: false, reason: 'no tiles to substitute' };
  const deepest = Math.max(...parents.map((p) => p.depth));
  if (deepest >= MAX_DEPTH) {
    return { ok: false, reason: `depth ${deepest + 1} is past the deepest the page draws exactly (${MAX_DEPTH})` };
  }
  const added = parents.reduce((s, p) => s + (p.tile.type === 'Gamma' ? 7 : 8) - 1, 0);
  if (map.tiles.size + added > limit) {
    return { ok: false, reason: `${(map.tiles.size + added).toLocaleString('en-US')} tiles is over ${limit.toLocaleString('en-US')}` };
  }
  // A depth reached for the first time gets its frame from these clusters.
  const frames = [...map.frames];
  for (let d = map.start; d <= deepest; d++) {
    if (frames[d + 1 - map.start]) continue;
    const here = parents.filter((p) => p.depth === d).map((p) => p.tile);
    if (here.length === 0) continue;
    frames[d + 1 - map.start] = depthFrame(map.family, frames[d - map.start], centrePairs(map.family, here));
  }
  const tiles = new Map(map.tiles);
  const outlines = new Map(map.outlines);
  const children = new Map<string, Placed[]>();
  const clusters: { id: string; tileCentre: Pt; clusterCentre: Pt }[] = [];
  for (const p of parents) {
    const kids = substituteTile(p.tile, map.family);
    const frame = frames[p.depth + 1 - map.start];
    const placed = kids.map((k) => place(map.family, k, frame));
    tiles.delete(p.tile.id);
    outlines.delete(parentId(p.tile.id));
    for (const k of placed) tiles.set(k.tile.id, k);
    outlines.set(p.tile.id, clusterOutline(map.family, kids, frame));
    children.set(p.tile.id, placed);
    let x = 0;
    let y = 0;
    for (const k of placed) {
      x += k.centre.x;
      y += k.centre.y;
    }
    clusters.push({ id: p.tile.id, tileCentre: p.centre, clusterCentre: { x: x / placed.length, y: y / placed.length } });
  }
  const batch: Batch = { parents, children, plan: planClusters(clusters) };
  return { ok: true, map: { ...map, frames, tiles, outlines, history: [...map.history, batch] }, batch };
}

/** Undo the last substitution: its clusters collapse back into their tiles. */
export function undo(map: TopDownMap): TopDownMap {
  const batch = map.history[map.history.length - 1];
  if (!batch) return map;
  const tiles = new Map(map.tiles);
  const outlines = new Map(map.outlines);
  for (const p of batch.parents) {
    for (const k of batch.children.get(p.tile.id) ?? []) tiles.delete(k.tile.id);
    outlines.delete(p.tile.id);
    tiles.set(p.tile.id, p);
  }
  return { ...map, tiles, outlines, history: map.history.slice(0, -1) };
}

/** Keep only the tiles `keep` accepts. Undo history does not survive it. */
export function prune(map: TopDownMap, keep: (p: Placed) => boolean): TopDownMap {
  const count = (ids: Iterable<string>): Map<string, number> => {
    const out = new Map<string, number>();
    for (const id of ids) out.set(parentId(id), (out.get(parentId(id)) ?? 0) + 1);
    return out;
  };
  const before = count(map.tiles.keys());
  const tiles = new Map([...map.tiles].filter(([, p]) => keep(p)));
  const after = count(tiles.keys());
  // an outline stays only round a cluster that is still whole
  const outlines = new Map([...map.outlines].filter(([id]) => after.get(id) === before.get(id)));
  return { ...map, tiles, outlines, history: [] };
}

/** Tiles whose bounding box meets a world rectangle. */
export function tilesIn(map: TopDownMap, min: Pt, max: Pt): Placed[] {
  const out: Placed[] = [];
  for (const p of map.tiles.values()) {
    if (p.max.x >= min.x && p.min.x <= max.x && p.max.y >= min.y && p.min.y <= max.y) out.push(p);
  }
  return out;
}
