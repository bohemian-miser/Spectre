/**
 * One world for tiles of every depth.
 *
 * A tile at depth `n` has an exact transform `z` in the depth-`n` board frame
 * (`core/topDown.ts`). Successive board frames are related, up to a bounded
 * error, by one similarity `S`: mirrored, scaled by sqrt(4 + sqrt(15)) and
 * turned by a fixed angle. Its linear part comes from the supertile key quads
 * at levels 20 and 21, whose shape has converged to double precision; that
 * precision matters, since an error in it moves deep tiles by a fixed world
 * distance at every depth. Its translation is set per depth by the map, when
 * the depth is first reached (`depthFrame`). Every depth is exact within
 * itself, and a cluster drawn where its tile was is a bounded slide from its
 * place, at every depth.
 *
 * Pure — no React, no DOM. Floats only position the picture.
 */

import {
  SUPER_RULES,
  Z_IDENT,
  Z_REFLECT,
  inv,
  leafPts,
  mul,
  substituteTile,
  topDownLeaves,
  transPt,
  zLeafPts,
  zApply,
  zKey,
  zMul,
  zSupertileTransforms,
  zToAffine,
  zSupertileQuad,
  zToPt,
  zX,
  zY,
  type Affine,
  type Pt,
  type TileTypeId,
  type TopDownFamily,
  type TopDownTile,
  type ZAffine,
} from '../../core';
import { applySimilarity, fitSimilarity, similarityAffine, type Similarity } from './animate';

/** Depth of a tile: the length of its slot path. */
export function depthOf(id: string): number {
  return id === '' ? 0 : id.split('.').length;
}

/** Mean of a tile's outline vertices in its own frame (both leaves for the spectre's Gamma). */
const centreCache = new Map<string, Pt>();
function localCentre(family: TopDownFamily, type: TileTypeId): Pt {
  const key = `${family}/${type}`;
  const hit = centreCache.get(key);
  if (hit) return hit;
  let x = 0;
  let y = 0;
  let n = 0;
  for (const leaf of topDownLeaves([{ id: '', type, z: Z_IDENT }], family)) {
    const a = zToAffine(leaf.z);
    for (const p of leafPts(family, leaf.type)) {
      const q = transPt(a, p);
      x += q.x;
      y += q.y;
      n++;
    }
  }
  const c = { x: x / n, y: y / n };
  centreCache.set(key, c);
  return c;
}

export function tileCentre(family: TopDownFamily, tile: TopDownTile): Pt {
  return transPt(zToAffine(tile.z), localCentre(family, tile.type));
}

/** Exact frames of a level-`level` Delta supertile's tiles, by slot path. */
function supertileTiles(family: TopDownFamily, level: number): TopDownTile[] {
  const out: TopDownTile[] = [];
  const walk = (type: string, lv: number, z: ZAffine, id: string): void => {
    if (lv === 0) {
      out.push({ id, type: type as TileTypeId, z });
      return;
    }
    const Ts = zSupertileTransforms(family, lv);
    SUPER_RULES[type].forEach((child, slot) => {
      if (child !== 'null') walk(child, lv - 1, zMul(z, Ts[slot]), id === '' ? String(slot) : `${id}.${slot}`);
    });
  };
  walk('Delta', level, level % 2 === 0 ? Z_IDENT : Z_REFLECT, '');
  return out;
}

/** Level of the key quads the linear part of `S` is fitted on (shape converged to double precision). */
export const QUAD_LEVEL = 20;
/** Level of the supertile the slide bound is measured on: 3,905 tiles and their 30,744 children. */
export const FIT_LEVEL = 4;

export interface LevelMap {
  readonly similarity: Similarity;
  /** Its scale, turn in degrees, and whether it mirrors. */
  readonly scale: number;
  readonly turn: number;
  readonly mirror: boolean;
  /** Tiles the slide bound was measured on. */
  readonly tiles: number;
  /** Largest and root-mean-square distance, in edge lengths of the deeper level, from a cluster's centre to where `S` puts its tile's centre. */
  readonly maxOffset: number;
  readonly rmsOffset: number;
}

/** A level's key quad in its board frame (levels mirror; boards undo it). */
function boardQuad(family: TopDownFamily, level: number): Pt[] {
  return zSupertileQuad(family, level).map((p) => zToPt(level % 2 === 0 ? p : zApply(Z_REFLECT, p)));
}

/** Centres of a level's tiles and of their clusters, in board frames. */
export function centrePairs(family: TopDownFamily, tiles: readonly TopDownTile[]): { from: Pt; to: Pt }[] {
  return tiles.map((t) => {
    const kids = substituteTile(t, family);
    let x = 0;
    let y = 0;
    for (const k of kids) {
      const c = tileCentre(family, k);
      x += c.x;
      y += c.y;
    }
    return { from: tileCentre(family, t), to: { x: x / kids.length, y: y / kids.length } };
  });
}

/** The translation that, with a fixed linear part, best carries each `from` onto its `to`. */
export function fitTranslation(a: Pt, mirror: boolean, pairs: readonly { from: Pt; to: Pt }[]): Similarity {
  const linear: Similarity = { a, b: { x: 0, y: 0 }, mirror };
  let x = 0;
  let y = 0;
  for (const q of pairs) {
    const p = applySimilarity(linear, q.from);
    x += q.to.x - p.x;
    y += q.to.y - p.y;
  }
  return { a, mirror, b: { x: x / pairs.length, y: y / pairs.length } };
}

const mapCache = new Map<TopDownFamily, LevelMap>();

export function levelMap(family: TopDownFamily): LevelMap {
  const hit = mapCache.get(family);
  if (hit) return hit;
  const quad = boardQuad(family, QUAD_LEVEL);
  const next = boardQuad(family, QUAD_LEVEL + 1);
  const linear = fitSimilarity(quad.map((p, i) => ({ from: p, to: next[i] })));
  const pairs = centrePairs(family, supertileTiles(family, FIT_LEVEL));
  const similarity = fitTranslation(linear.a, linear.mirror, pairs);
  let max = 0;
  let sq = 0;
  for (const q of pairs) {
    const p = applySimilarity(similarity, q.from);
    const d = Math.hypot(p.x - q.to.x, p.y - q.to.y);
    max = Math.max(max, d);
    sq += d * d;
  }
  const map: LevelMap = {
    similarity,
    scale: Math.hypot(similarity.a.x, similarity.a.y),
    turn: (Math.atan2(similarity.a.y, similarity.a.x) * 180) / Math.PI,
    mirror: similarity.mirror,
    tiles: pairs.length,
    maxOffset: max,
    rmsOffset: Math.sqrt(sq / pairs.length),
  };
  mapCache.set(family, map);
  return map;
}

/**
 * The world frame of depth `n + 1` from that of depth `n`: through `S`, with
 * the translation that centres these clusters, on average, on their tiles.
 * `pairs` are tile centres (depth `n` board) and cluster centres (depth
 * `n + 1` board).
 */
export function depthFrame(family: TopDownFamily, frame: Affine, pairs: readonly { from: Pt; to: Pt }[]): Affine {
  const { a, mirror } = levelMap(family).similarity;
  return mul(frame, inv(similarityAffine(fitTranslation(a, mirror, pairs))));
}

export interface Placed {
  readonly tile: TopDownTile;
  readonly depth: number;
  /** Leaf outlines and leaf types, in world coordinates. */
  readonly leaves: readonly { readonly type: TileTypeId; readonly poly: readonly Pt[] }[];
  readonly centre: Pt;
  readonly min: Pt;
  readonly max: Pt;
}

/** A tile drawn through its depth's world frame `w`. */
export function place(family: TopDownFamily, tile: TopDownTile, w: Affine): Placed {
  const depth = depthOf(tile.id);
  const leaves = topDownLeaves([tile], family).map((leaf) => {
    const a = mul(w, zToAffine(leaf.z));
    return { type: leaf.type, poly: leafPts(family, leaf.type).map((p) => transPt(a, p)) };
  });
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const l of leaves) {
    for (const p of l.poly) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
      sx += p.x;
      sy += p.y;
      n++;
    }
  }
  return {
    tile,
    depth,
    leaves,
    centre: { x: sx / n, y: sy / n },
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
  };
}

/**
 * The outline of a group of sibling tiles in world coordinates, as segments:
 * edges keyed by their exact endpoints, kept when they occur once.
 */
export function clusterOutline(
  family: TopDownFamily,
  children: readonly TopDownTile[],
  w: Affine,
): readonly (readonly [Pt, Pt])[] {
  if (children.length === 0) return [];
  const edges = new Map<string, { a: Pt; b: Pt; n: number }>();
  for (const leaf of topDownLeaves(children, family)) {
    const pts = zLeafPts(family, leaf.type).map((p) => zApply(leaf.z, p));
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const ka = zKey(a);
      const kb = zKey(b);
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const hit = edges.get(key);
      if (hit) hit.n++;
      else edges.set(key, { a: transPt(w, { x: zX(a), y: zY(a) }), b: transPt(w, { x: zX(b), y: zY(b) }), n: 1 });
    }
  }
  const out: [Pt, Pt][] = [];
  for (const e of edges.values()) if (e.n === 1) out.push([e.a, e.b]);
  return out;
}

/**
 * Clip a polygon to an axis-aligned rectangle (Sutherland–Hodgman), so a
 * tile far larger than the screen is drawn from coordinates the canvas can
 * hold.
 */
export function clipToRect(poly: readonly Pt[], min: Pt, max: Pt): Pt[] {
  let out: Pt[] = [...poly];
  const edges: [(p: Pt) => boolean, (a: Pt, b: Pt) => Pt][] = [
    [(p) => p.x >= min.x, (a, b) => ({ x: min.x, y: a.y + ((b.y - a.y) * (min.x - a.x)) / (b.x - a.x) })],
    [(p) => p.x <= max.x, (a, b) => ({ x: max.x, y: a.y + ((b.y - a.y) * (max.x - a.x)) / (b.x - a.x) })],
    [(p) => p.y >= min.y, (a, b) => ({ x: a.x + ((b.x - a.x) * (min.y - a.y)) / (b.y - a.y), y: min.y })],
    [(p) => p.y <= max.y, (a, b) => ({ x: a.x + ((b.x - a.x) * (max.y - a.y)) / (b.y - a.y), y: max.y })],
  ];
  for (const [inside, cut] of edges) {
    if (out.length === 0) break;
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cut(prev, cur));
        out.push(cur);
      } else if (inside(prev)) {
        out.push(cut(prev, cur));
      }
    }
  }
  return out;
}
