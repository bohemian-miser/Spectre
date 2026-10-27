/**
 * Placing hexagon tiles and drawing on them, for the boards that walk the
 * hexagon tiling by slot path (the Neighbour machine, the Circuit walker):
 * placement, strand pieces, orientation flags, supertile boundaries.
 *
 * A board world is one root supertile; every tile in it is named by its slot
 * path and placed relative to the world's start tile. Strand pieces are drawn
 * the way the Explorer draws them: from connection point to connection point
 * on the tile's edges, curved square to each edge (`strandCurve`), so a strand
 * runs on smoothly into the next tile and two pieces in one tile never look
 * joined when they are not.
 */
import {
  buildSystem, chordPairing, flatten, idOf, inv, neighbour, leafPts, matchingAt, mul, orientCurve, slotsOfType, strandCurve, transPt,
  type Address, type Affine, type HexType, type MetaNode, type Pt, type TileNode, type TileTypeId,
} from '../core';
import { tileMatchingInfo } from './matchingModel';

export const HEX_OUTLINE: readonly Pt[] = leafPts('hex', 'Delta');
export const HEX_CENTRE: Pt = { x: 0.5, y: Math.sqrt(3) / 2 };

export interface BoardWorld {
  readonly root: HexType;
  readonly level: number;
  /** Slot path of the tile placed at the origin. */
  readonly startId: string;
}

/** The placement of the tile at slot path `id` inside the world's root. */
export function xformInRoot(world: BoardWorld, id: string): Affine {
  let node: TileNode = buildSystem('hex', world.level)[world.root];
  let x: Affine = [1, 0, 0, 0, 1, 0];
  for (const s of id === '' ? [] : id.split('.').map(Number)) {
    const ch = (node as MetaNode).children.find((c) => c.pos === s);
    if (!ch) throw new Error(`no slot ${s} under ${node.type}`);
    x = mul(x, ch.xform);
    node = ch.node;
  }
  return x;
}

export interface PlacedTile { readonly id: string; readonly type: HexType; readonly xform: Affine }

const placeCache = new Map<string, Map<string, PlacedTile>>();

/** Every tile of the world, placed relative to its start tile. The last few worlds are cached. */
export function placeWorld(world: BoardWorld): Map<string, PlacedTile> {
  const key = `${world.root}|${world.level}|${world.startId}`;
  const hit = placeCache.get(key);
  if (hit) {
    placeCache.delete(key);
    placeCache.set(key, hit);
    return hit;
  }
  const insts = flatten(buildSystem('hex', world.level)[world.root]);
  const start = insts.find((i) => i.id === world.startId);
  if (!start) throw new Error(`start tile ${world.startId} is not in the root`);
  const toStart = inv(start.xform);
  const out = new Map<string, PlacedTile>();
  for (const i of insts) out.set(i.id, { id: i.id, type: i.type as HexType, xform: mul(toStart, i.xform) });
  placeCache.set(key, out);
  while (placeCache.size > 4) placeCache.delete(placeCache.keys().next().value!);
  return out;
}

export const tileCentre = (xform: Affine): Pt => transPt(xform, HEX_CENTRE);
export const tilePoints = (xform: Affine): string => HEX_OUTLINE.map((q) => { const p = transPt(xform, q); return `${p.x},${p.y}`; }).join(' ');

/** Connection points of a type under a rule, in the order matchings are indexed by. */
function points(type: HexType, subset: readonly number[]): readonly Pt[] {
  return tileMatchingInfo('hex', type as TileTypeId, new Set(subset)).points.map((c) => c.pt);
}

/** The connection point on edge `edge` of a tile of this type, in the tile's frame; null if the edge carries none. */
export function pointOnEdge(type: HexType, subset: readonly number[], edge: number): Pt | null {
  const k = slotsOfType('hex', type as TileTypeId, subset).findIndex((s) => s.edge === edge);
  return k < 0 ? null : points(type, subset)[k] ?? null;
}

/** An SVG path from `a` to `b` (tile frame) in a tile of this type, placed by `xform`, curved as the Explorer draws it. */
export function chordD(xform: Affine, type: HexType, a: Pt, b: Pt, move = true): string {
  const [h1, h2] = orientCurve(strandCurve('hex', type as TileTypeId, a, b), a);
  const [p, c1, c2, q] = [a, h1, h2, b].map((v) => transPt(xform, v));
  return `${move ? `M ${p.x} ${p.y} ` : ''}C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${q.x} ${q.y}`;
}

/** Every chord of a tile's pairing, as one SVG path. */
export function pairingD(xform: Affine, type: HexType, subset: readonly number[], matching: number): string {
  const pts = points(type, subset);
  if (pts.length < 2 || pts.length % 2) return '';
  const pairs = matchingAt(pts.length, matching) ?? [];
  return pairs.map(([i, j]) => chordD(xform, type, pts[i], pts[j])).join(' ');
}

/** The partner edge of `edge` in a tile of this type, or null. */
export function partnerEdge(type: HexType, subset: readonly number[], matching: number, edge: number): number | null {
  const seams = slotsOfType('hex', type as TileTypeId, subset);
  const k = seams.findIndex((s) => s.edge === edge);
  if (k < 0) return null;
  const p = chordPairing('hex', type as TileTypeId, subset, matching)[k];
  return p === undefined || p < 0 ? null : seams[p].edge;
}

/** Where to write an edge's number: just outside the tile, off the edge's midpoint, clear of the orientation flag. */
export function edgeLabelAt(xform: Affine, edge: number): Pt {
  const a = HEX_OUTLINE[edge];
  const b = HEX_OUTLINE[(edge + 1) % 6];
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return transPt(xform, { x: m.x - (HEX_CENTRE.x - m.x) * 0.3, y: m.y - (HEX_CENTRE.y - m.y) * 0.3 });
}

/**
 * The tiles within `reach` of any of the `near` tiles (centre to centre),
 * nearest first, at most `cap`: the surroundings of a walk.
 */
export function tilesAround(all: Iterable<PlacedTile>, near: readonly PlacedTile[], reach: number, cap: number, skip: ReadonlySet<string>): PlacedTile[] {
  const cell = (v: number): number => Math.floor(v / reach);
  const grid = new Map<string, Pt[]>();
  for (const t of near) {
    const c = tileCentre(t.xform);
    const k = `${cell(c.x)},${cell(c.y)}`;
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(c);
  }
  const out: { t: PlacedTile; d: number }[] = [];
  for (const t of all) {
    if (skip.has(t.id)) continue;
    const c = tileCentre(t.xform);
    const cx = cell(c.x), cy = cell(c.y);
    let d = Infinity;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const q of grid.get(`${cx + i},${cy + j}`) ?? []) d = Math.min(d, Math.hypot(q.x - c.x, q.y - c.y));
    if (d <= reach) out.push({ t, d });
  }
  out.sort((a, b) => a.d - b.d);
  return out.slice(0, cap).map((x) => x.t);
}

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
