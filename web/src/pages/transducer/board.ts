/**
 * Drawing helpers for the neighbour machine board: the orientation flag of a
 * hexagon, the supertile boundaries among a set of placed tiles, and picking
 * the tiles near a point when a supertile is too large to draw whole.
 */
import { idOf, neighbour, transPt, type Address, type Affine } from '../../core';

/**
 * A flag from the hexagon's centre towards the midpoint of edge 0, with its
 * barb on the edge-1 side. The barb shows which way the edges are numbered,
 * so the flag tells a mirrored hexagon from a rotated one. In the tile's own
 * frame (HEX_PTS: edge 0 runs from (0,0) to (1,0), the centre is
 * (0.5, √3/2)); `xform` places it.
 */
const H = Math.sqrt(3) / 2;
const FLAG_LOCAL = {
  tail: { x: 0.5, y: H * 0.62 },
  base: { x: 0.5, y: H * 0.5 },
  tip: { x: 0.5, y: H * 0.18 },
  barb: { x: 0.72, y: H * 0.5 },
};

export function orientationPath(xform: Affine): string {
  const p = (q: { x: number; y: number }): string => { const r = transPt(xform, q); return `${r.x} ${r.y}`; };
  return `M ${p(FLAG_LOCAL.tail)} L ${p(FLAG_LOCAL.tip)} L ${p(FLAG_LOCAL.barb)} L ${p(FLAG_LOCAL.base)}`;
}

export interface BoardTile {
  readonly id: string;
  readonly xform: Affine;
  readonly address: Address;
}

export interface BoundaryEdge {
  readonly key: string;
  readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number;
  /** the level of the largest supertile whose boundary this edge lies on (0 = inside a level-1 supertile) */
  readonly level: number;
}

/**
 * Every edge of the given tiles that lies on a supertile boundary, once.
 * Crossing an edge settles at the level of the smallest supertile holding both
 * tiles, so an edge settled at level k lies on the boundary of the two
 * level-(k-1) supertiles either side of it. An edge that leaves the root lies
 * on the root's boundary, level `rootLevel`.
 */
export function supertileEdges(tiles: readonly BoardTile[], pts: readonly { x: number; y: number }[], rootLevel: number): BoundaryEdge[] {
  const out: BoundaryEdge[] = [];
  const seen = new Set<string>();
  for (const t of tiles) {
    for (let e = 0; e < 6; e++) {
      const key = `${t.id}/${e}`;
      if (seen.has(key)) continue;
      const nb = neighbour(t.address, e);
      const level = nb.ok ? nb.level - 1 : rootLevel;
      if (nb.ok) seen.add(`${idOf(nb.address)}/${nb.edge}`);
      if (level < 1) continue;
      const a = transPt(t.xform, pts[e]), b = transPt(t.xform, pts[(e + 1) % 6]);
      out.push({ key, x1: a.x, y1: a.y, x2: b.x, y2: b.y, level });
    }
  }
  return out;
}

/** Up to `cap` of the given tiles, nearest first to `focus` by the tile's centre. */
export function nearest<T extends { xform: Affine }>(tiles: readonly T[], focus: { x: number; y: number }, cap: number): T[] {
  if (tiles.length <= cap) return [...tiles];
  const d = tiles.map((t) => { const c = transPt(t.xform, { x: 0.5, y: H }); return { t, d: (c.x - focus.x) ** 2 + (c.y - focus.y) ** 2 }; });
  d.sort((a, b) => a.d - b.d);
  return d.slice(0, cap).map((x) => x.t);
}
