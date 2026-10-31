/**
 * Naming the tile a trace starts in on the infinite hexagon plane: its slot
 * path in a root supertile of the world's ancestor chain, and the edge the
 * strand enters it by.
 *
 * The trace seed is the tapped chord, `[atX, atY, toX, toY]`: the walk
 * leaves by `at`, so it entered by `to`. The tile is the one holding the
 * chord's midpoint (a hexagon is convex); the root is the lowest Delta on
 * the chain that holds the tile, so a root of one type serves every link.
 */

import { instanceAffine, instanceTypeId, inv, leafPts, transPt, unrootedEngineFor, UNROOTED_MAX_LEVEL, type HexType, type Pt, type TileTypeId, type UnrootedEngine } from '../../core';
import { insideLoop, pathFromAncestor } from './xray';

/** The root type every located tile is named in. */
export const LOCATE_ROOT: HexType = 'Delta';

export interface LocatedTile {
  readonly type: TileTypeId;
  /** Slot path from the root. */
  readonly tile: string;
  /** Edge of the tile the strand enters by (0 to 5). */
  readonly edge: number;
  /** Level of the root. */
  readonly level: number;
}

function distanceToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** Locate the start of a trace in the engine's hexagon plane, or null when the seed is not in a tile. */
export function locateSeed(engine: UnrootedEngine, seed: readonly [number, number, number, number]): LocatedTile | null {
  if (engine.family !== 'hex') return null;
  const to = { x: seed[2], y: seed[3] };
  const mid = { x: (seed[0] + seed[2]) / 2, y: (seed[1] + seed[3]) / 2 };
  const cut = engine.query({ cx: mid.x, cy: mid.y, halfW: 1, halfH: 1 }, 64, { cutLevel: 0, emitIds: true });
  for (let i = 0; i < cut.count; i++) {
    const type = instanceTypeId(cut.type[i], 'hex');
    const pts = leafPts('hex', type);
    const back = inv(instanceAffine(cut.pos[2 * i] + cut.origin.x, cut.pos[2 * i + 1] + cut.origin.y, cut.code[i]));
    if (!insideLoop(pts, transPt(back, mid))) continue;
    const local = transPt(back, to);
    let edge = 0;
    for (let e = 1; e < pts.length; e++) {
      if (distanceToSegment(local, pts[e], pts[(e + 1) % pts.length]) < distanceToSegment(local, pts[edge], pts[(edge + 1) % pts.length])) edge = e;
    }
    const id = cut.ids?.[i];
    const m = id ? /^(\d+):/.exec(id) : null;
    if (!id || !m) return null;
    for (let level = Math.max(1, Number(m[1])); level <= UNROOTED_MAX_LEVEL; level++) {
      engine.ensureLevel(level);
      if (engine.ancestorType(level) !== LOCATE_ROOT) continue;
      const tile = pathFromAncestor(engine.chain(), level, id);
      return tile === null ? null : { type, tile, edge, level };
    }
    return null;
  }
  return null;
}

/** {@link locateSeed} in the world the Explorer's infinite view draws. */
export function locateTraceStart(seed: number, worldChain: string | undefined, traceSeed: readonly [number, number, number, number]): LocatedTile | null {
  return locateSeed(unrootedEngineFor(seed, 'hex', worldChain), traceSeed);
}
