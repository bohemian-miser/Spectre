/**
 * The pure half of the thumbnail worker, shared with the synchronous fallback.
 */

import {
  DARK_STRAND_PALETTE,
  LIGHT_STRAND_PALETTE,
  buildStrandGraph,
  rasterizeStrands,
  strandWorkspace,
  type StrandGraph,
  type StrandWorkspace,
  type TileFamilyId,
} from '../core';

export interface ThumbnailRequest {
  readonly id: number;
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly level: number;
  readonly digits: readonly number[];
  readonly size: number;
  readonly dark: boolean;
}

export interface ThumbnailReply {
  readonly id: number;
  readonly size: number;
  readonly rgba: Uint8ClampedArray;
  readonly ms: number;
}

/** Most recent graphs, newest last. Level 6 graphs are large, so keep two. */
const cache: { key: string; graph: StrandGraph; ws: StrandWorkspace }[] = [];
const CACHE_SIZE = 2;

export function renderThumbnail(
  req: ThumbnailRequest,
  onBuilding?: (building: boolean) => void,
): ThumbnailReply {
  const started = Date.now();
  const key = `${req.family}|${req.subset.join('')}|${req.level}`;
  let hit = cache.find((c) => c.key === key);
  if (!hit) {
    onBuilding?.(true);
    const graph = buildStrandGraph(req.family, req.subset, req.level);
    hit = { key, graph, ws: strandWorkspace(graph) };
    cache.push(hit);
    if (cache.length > CACHE_SIZE) cache.shift();
    onBuilding?.(false);
  }
  const palette = req.dark ? DARK_STRAND_PALETTE : LIGHT_STRAND_PALETTE;
  const rgba = rasterizeStrands(hit.graph, req.digits, req.size, palette, hit.ws);
  return { id: req.id, size: req.size, rgba, ms: Date.now() - started };
}
