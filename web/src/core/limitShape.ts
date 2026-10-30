/**
 * Supertile outlines, level after level, and the shape they settle on.
 *
 * A level-n supertile's outline is the boundary of its leaves. It is built
 * from its children's outlines: place each child's outline by its slot
 * transform, drop every edge that meets the same edge run the other way (two
 * children share it), and walk what is left. The arithmetic is exact
 * (`exact.ts`), so an edge cancels only against its exact reverse, and the
 * walk throws unless what is left is one simple closed loop.
 *
 * The outline depends only on which slots hold a Gamma: slot 7 always does,
 * and a Gamma supertile has no slot 2. So every type other than Gamma has the
 * same outline at every level, and Gamma's is that outline less slot 2's
 * piece. There are two outlines per level, not nine.
 *
 * Where the children go depends only on a tile's four key points (`quad`),
 * and one level maps the key points of level n to those of level n + 1 by a
 * fixed real-linear map ({@link supertileTransforms}). Up to translation its
 * eigenvalues are ±λ, ±1 and ±1/λ with λ = √(4+√15): the ±λ pair is the
 * shape every start tends to ({@link LIMIT_QUAD}), the ±1/λ pair dies away
 * by 1/λ² = 4−√15 a level, and no tile here has any of the ±1 pair.
 *
 * A tile's outline is the other half. Scaled by λ⁻ⁿ, a level-n outline is the
 * leaves' outline run along the supertile's boundary, so it carries detail
 * the size of one leaf, λ⁻ⁿ of the whole. That detail fades by 1/λ a level
 * whatever tile the levels start from; the outlines started from the hexagon
 * and from the Spectre close in on the same curve.
 *
 * The Spectre is Tile(1,1) of the family Tile(a,b): the edges at multiples
 * of 60° have length a, the others length b. Let a and b be complex (each
 * kind of edge also turns by a fixed angle) and the same substitution still
 * places the tiles edge to edge, since every map it uses is a rotation, a
 * translation or the mirror. Then one ratio b/a ({@link SELF_SIMILAR_B})
 * puts the key points exactly at the limit, and every level is a similar
 * copy of the last.
 */

import { leafPts, type TileFamilyId, type TileTypeId } from './families';
import { lerpPt, mul, transPt, trot, ttrans, type Affine, type Pt } from './geom';
import { fitSimilarity, vertexHomes } from './morph';
import {
  zApply,
  zBasePairXform,
  zKey,
  zLeafPts,
  zSupertileQuad,
  zSupertileTransforms,
  zToPt,
  Z_IDENT,
  type ZAffine,
  type ZVec,
} from './exact';
import { SUPER_RULES, supertileTransforms } from './tiles';

// ---------------------------------------------------------------------------
// Outlines, exactly
// ---------------------------------------------------------------------------

/** One boundary edge of a supertile, in the supertile's frame. */
export interface OutlineEdge {
  /**
   * Slot path of the leaf it belongs to, from the supertile: one slot per
   * level, then `0` or `1` for a Mystic's halves ('' for a single tile).
   */
  readonly id: string;
  /** Which edge of that leaf: from vertex `edge` to vertex `edge + 1`. */
  readonly edge: number;
  readonly from: ZVec;
  readonly to: ZVec;
}

/** A level-0 tile's edges: one leaf, or the Mystic's two. */
function leafEdges(family: TileFamilyId, gamma: boolean): OutlineEdge[] {
  const out: OutlineEdge[] = [];
  const add = (id: string, type: TileTypeId, T: ZAffine): void => {
    const pts = zLeafPts(family, type).map((p) => zApply(T, p));
    for (let k = 0; k < pts.length; k++) out.push({ id, edge: k, from: pts[k], to: pts[(k + 1) % pts.length] });
  };
  const pair = zBasePairXform(family);
  if (gamma && pair) {
    add('0', 'Gamma1', Z_IDENT);
    add('1', 'Gamma2', pair);
  } else add('', gamma ? 'Gamma' : 'Delta', Z_IDENT);
  return out;
}

/** The edges no other edge runs back along, walked into one loop. */
function boundary(edges: readonly OutlineEdge[]): OutlineEdge[] {
  const runs = new Set(edges.map((e) => `${zKey(e.from)}>${zKey(e.to)}`));
  const kept = edges.filter((e) => !runs.has(`${zKey(e.to)}>${zKey(e.from)}`));
  const leaving = new Map<string, number>();
  kept.forEach((e, i) => {
    const k = zKey(e.from);
    if (leaving.has(k)) throw new Error(`outline passes vertex ${k} twice`);
    leaving.set(k, i);
  });
  const out: OutlineEdge[] = [];
  let i = 0;
  do {
    out.push(kept[i]);
    const next = leaving.get(zKey(kept[i].to));
    if (next === undefined) throw new Error('outline is not closed');
    i = next;
  } while (i !== 0 && out.length <= kept.length);
  if (out.length !== kept.length) throw new Error(`outline is ${kept.length} edges but its loop is ${out.length}`);
  return out;
}

const outlineCache = new Map<string, readonly OutlineEdge[]>();

/**
 * The outline of a level-`level` supertile, Gamma or not, in the frame
 * `buildSystem(family, level)` builds it in, run the way its leaves run.
 * Memoized.
 */
export function supertileOutline(family: TileFamilyId, level: number, gamma: boolean): readonly OutlineEdge[] {
  const key = `${family}:${level}:${gamma ? 'Gamma' : 'other'}`;
  const hit = outlineCache.get(key);
  if (hit) return hit;
  let placed: OutlineEdge[];
  if (level === 0) placed = leafEdges(family, gamma);
  else {
    const Ts = zSupertileTransforms(family, level);
    placed = [];
    for (let slot = 0; slot < 8; slot++) {
      if (gamma && slot === 2) continue;
      for (const e of supertileOutline(family, level - 1, slot === 7)) {
        placed.push({
          id: e.id === '' ? String(slot) : `${slot}.${e.id}`,
          edge: e.edge,
          from: zApply(Ts[slot], e.from),
          to: zApply(Ts[slot], e.to),
        });
      }
    }
  }
  const out = boundary(placed);
  outlineCache.set(key, out);
  return out;
}

/** The type of the leaf at slot path `id` under a level-`level` supertile of type `root`. */
export function leafTypeAt(level: number, root: TileTypeId, id: string): TileTypeId {
  const slots = id === '' ? [] : id.split('.').map(Number);
  let type: string = root;
  for (let i = 0; i < level; i++) type = SUPER_RULES[type][slots[i]];
  if (slots.length > level) return slots[level] === 0 ? 'Gamma1' : 'Gamma2';
  return type as TileTypeId;
}

// ---------------------------------------------------------------------------
// Key points
// ---------------------------------------------------------------------------

/** Linear growth per level: √(4+√15). */
export const INFLATION = Math.sqrt(4 + Math.sqrt(15));

/** Four points up to similarity: the first moved to 0, the last to 1. */
export function normalizeQuad(quad: readonly Pt[]): Pt[] {
  const o = quad[0];
  const ux = quad[3].x - o.x;
  const uy = quad[3].y - o.y;
  const n = ux * ux + uy * uy;
  return quad.map((p) => {
    const x = p.x - o.x;
    const y = p.y - o.y;
    return { x: (x * ux + y * uy) / n, y: (y * ux - x * uy) / n };
  });
}

/**
 * The key points every start converges on, first at 0 and last at 1:
 * iterated from the Spectre's until a level no longer moves them.
 */
export const LIMIT_QUAD: readonly Pt[] = (() => {
  let q = normalizeQuad(zSupertileQuad('spectre', 0).map(zToPt));
  for (let i = 0; i < 64; i++) {
    const next = normalizeQuad(supertileTransforms(q).quad);
    if (next.every((p, k) => p.x === q[k].x && p.y === q[k].y)) break;
    q = next;
  }
  return q;
})();

/** How far a level's key points are from {@link LIMIT_QUAD}, as a similarity class. */
export function quadGap(quad: readonly Pt[]): number {
  const q = normalizeQuad(quad);
  return Math.max(...q.map((p, k) => Math.hypot(p.x - LIMIT_QUAD[k].x, p.y - LIMIT_QUAD[k].y)));
}

// ---------------------------------------------------------------------------
// Tile(a,b) with complex a and b
// ---------------------------------------------------------------------------

const cmul = (a: Pt, b: Pt): Pt => ({ x: a.x * b.x - a.y * b.y, y: a.x * b.y + a.y * b.x });
const cdiv = (a: Pt, b: Pt): Pt => {
  const n = b.x * b.x + b.y * b.y;
  return { x: (a.x * b.x + a.y * b.y) / n, y: (a.y * b.x - a.x * b.y) / n };
};
const csub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });

/**
 * Tile(a,b) for complex a and b: the Spectre's walk with each edge at a
 * multiple of 60° multiplied by a and each other edge by b. Tile(1,1) is the
 * Spectre and Tile(1,√3) the hat.
 */
export function tileAB(a: Pt, b: Pt): Pt[] {
  const unit = zLeafPts('spectre', 'Delta');
  const out: Pt[] = [{ x: 0, y: 0 }];
  for (let k = 0; k + 1 < unit.length; k++) {
    const step = zToPt([
      unit[k + 1][0] - unit[k][0],
      unit[k + 1][1] - unit[k][1],
      unit[k + 1][2] - unit[k][2],
      unit[k + 1][3] - unit[k][3],
    ]);
    const atSixty = Math.round((Math.atan2(step.y, step.x) * 6) / Math.PI) % 2 === 0;
    const s = cmul(step, atSixty ? a : b);
    out.push({ x: out[k].x + s.x, y: out[k].y + s.y });
  }
  return out;
}

const QUAD_VERTICES = [3, 5, 7, 11] as const;

/**
 * The b for which Tile(1,b) has the limit's key points. The key points of
 * Tile(1,b) are A + bB for fixed A and B; matching them to the limit's up to
 * similarity is linear in b, solved here from the first three of them. The
 * fourth agrees (tested), which is the absence of the ±1 pair.
 */
export const SELF_SIMILAR_B: Pt = (() => {
  const A = tileAB({ x: 1, y: 0 }, { x: 0, y: 0 });
  const B = tileAB({ x: 0, y: 0 }, { x: 1, y: 0 });
  const [i0, i1, , i3] = QUAD_VERTICES;
  const a10 = csub(A[i1], A[i0]);
  const a30 = csub(A[i3], A[i0]);
  const b10 = csub(B[i1], B[i0]);
  const b30 = csub(B[i3], B[i0]);
  // (a10 + b·b10) = (a30 + b·b30)·L1, with L0 = 0 and L3 = 1.
  const L1 = LIMIT_QUAD[1];
  return cdiv(csub(cmul(a30, L1), a10), csub(b10, cmul(b30, L1)));
})();

// ---------------------------------------------------------------------------
// Placing an outline in a tile geometry
// ---------------------------------------------------------------------------

/** A level-0 tile: its key points, and where the Mystic's second half sits. */
export interface TileGeometry {
  readonly quad: readonly Pt[];
  /** Gamma2's transform in the Mystic, or null when Gamma is one tile. */
  readonly gamma2: Affine | null;
  /** Leaf outline per type. */
  readonly leaf: (type: TileTypeId) => readonly Pt[];
}

export function familyGeometry(family: TileFamilyId): TileGeometry {
  const pair = zBasePairXform(family);
  return {
    quad: zSupertileQuad(family, 0).map(zToPt),
    gamma2: pair && (zToAffineFloat(pair) as Affine),
    leaf: (type) => leafPts(family, type),
  };
}

function zToAffineFloat(T: ZAffine): Affine {
  const a = (T.k * Math.PI) / 6;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const t = zToPt(T.t);
  return T.m ? [c, s, t.x, s, -c, t.y] : [c, -s, t.x, s, c, t.y];
}

/**
 * Tile(a,b) as a tile geometry. Gamma2 is Tile(b,a) turned 30°, which puts
 * its edges at multiples of 60° in the b class, at the Mystic's vertex 8.
 */
export function tileABGeometry(a: Pt, b: Pt): TileGeometry {
  const one = tileAB(a, b);
  const two = tileAB(b, a);
  return {
    quad: QUAD_VERTICES.map((i) => one[i]),
    gamma2: mul(ttrans(one[8].x, one[8].y), trot(Math.PI / 6)),
    leaf: (type) => (type === 'Gamma2' ? two : one),
  };
}

const levelsCache = new WeakMap<TileGeometry, { Ts: Affine[]; quad: Pt[] }[]>();

/** Child transforms and key points of each level, from level 1 up. */
function levels(geom: TileGeometry, level: number): { Ts: Affine[]; quad: Pt[] }[] {
  let list = levelsCache.get(geom);
  if (!list) {
    list = [];
    levelsCache.set(geom, list);
  }
  while (list.length < level) list.push(supertileTransforms(list.length === 0 ? geom.quad : list[list.length - 1].quad));
  return list;
}

/** Key points of a level-`level` supertile of a geometry. */
export function levelQuad(geom: TileGeometry, level: number): readonly Pt[] {
  return level === 0 ? geom.quad : levels(geom, level)[level - 1].quad;
}

/** A leaf's frame inside a level-`level` supertile, from its slot path. */
export function leafFrame(geom: TileGeometry, level: number, id: string): Affine {
  const list = levels(geom, level);
  const slots = id === '' ? [] : id.split('.').map(Number);
  let T: Affine = [1, 0, 0, 0, 1, 0];
  for (let i = 0; i < level; i++) T = mul(T, list[level - 1 - i].Ts[slots[i]]);
  if (slots.length > level && slots[level] === 1 && geom.gamma2) T = mul(T, geom.gamma2);
  return T;
}

/**
 * An outline's vertices placed in another geometry: each edge's start, as
 * that leaf's vertex in `geom`. The outline's combinatorics are the Spectre
 * family's; any Tile(a,b) shares them.
 */
export function placeOutline(outline: readonly OutlineEdge[], geom: TileGeometry, level: number, root: TileTypeId): Pt[] {
  return outline.map((e) => transPt(leafFrame(geom, level, e.id), geom.leaf(leafTypeAt(level, root, e.id))[e.edge]));
}

/**
 * The same outline on the hexagons: each Spectre vertex at its home on the
 * hexagon edge of the same seam (`vertexHomes`, as the Explorer's morph
 * places it), in the hexagon supertile's frame. Vertices with no home (in
 * Gamma2's thin wedge) sit between their neighbours along the outline.
 */
export function hexOutline(outline: readonly OutlineEdge[], level: number, root: TileTypeId): Pt[] {
  const hex = familyGeometry('hex');
  const at = outline.map((e) => {
    const home = vertexHomes(leafTypeAt(level, root, e.id))[e.edge];
    if (!home) return null;
    const hexId = e.id.split('.').slice(0, level).join('.');
    return transPt(leafFrame(hex, level, hexId), home);
  });
  const n = at.length;
  return at.map((p, k) => {
    if (p) return p;
    let back = 1;
    while (!at[(k - back + n) % n]) back++;
    let fwd = 1;
    while (!at[(k + fwd) % n]) fwd++;
    return lerpPt(at[(k - back + n) % n] as Pt, at[(k + fwd) % n] as Pt, back / (back + fwd));
  });
}

/**
 * The similarity that lays a level's key points over {@link LIMIT_QUAD},
 * least squares over the four.
 */
export function limitFrame(quad: readonly Pt[]): Affine {
  return fitSimilarity(LIMIT_QUAD, quad);
}

// ---------------------------------------------------------------------------
// Distances between outlines
// ---------------------------------------------------------------------------

/** Distance from p to segment ab. */
function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const n = dx * dx + dy * dy;
  const t = n === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / n));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** The farthest any vertex of closed polyline A is from closed polyline B. */
function oneSided(A: readonly Pt[], B: readonly Pt[]): number {
  // Bucket B's segments on a grid about as fine as its mean segment.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, len = 0;
  B.forEach((p, i) => {
    const q = B[(i + 1) % B.length];
    len += Math.hypot(q.x - p.x, q.y - p.y);
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  const cell = Math.max(len / B.length, 1e-12) * 2;
  const cols = Math.max(1, Math.ceil((maxX - minX) / cell) + 1);
  const rows = Math.max(1, Math.ceil((maxY - minY) / cell) + 1);
  const grid = new Map<number, number[]>();
  const cellOf = (x: number, y: number): [number, number] => [
    Math.min(cols - 1, Math.max(0, Math.floor((x - minX) / cell))),
    Math.min(rows - 1, Math.max(0, Math.floor((y - minY) / cell))),
  ];
  B.forEach((p, i) => {
    const q = B[(i + 1) % B.length];
    const [c0, r0] = cellOf(Math.min(p.x, q.x), Math.min(p.y, q.y));
    const [c1, r1] = cellOf(Math.max(p.x, q.x), Math.max(p.y, q.y));
    for (let c = c0; c <= c1; c++)
      for (let r = r0; r <= r1; r++) {
        const k = r * cols + c;
        const list = grid.get(k);
        if (list) list.push(i);
        else grid.set(k, [i]);
      }
  });
  let worst = 0;
  for (const p of A) {
    const [c, r] = cellOf(p.x, p.y);
    let best = Infinity;
    // Widen the search ring until a segment is found and the ring is past it.
    for (let ring = 0; ring < Math.max(cols, rows); ring++) {
      for (let dc = -ring; dc <= ring; dc++)
        for (let dr = -ring; dr <= ring; dr++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
          for (const i of grid.get((r + dr) * cols + (c + dc)) ?? []) {
            if (c + dc < 0 || c + dc >= cols || r + dr < 0 || r + dr >= rows) continue;
            best = Math.min(best, segDist(p, B[i], B[(i + 1) % B.length]));
          }
        }
      if (best <= ring * cell) break;
    }
    // Outside the grid's reach: fall back to every segment.
    if (!Number.isFinite(best)) for (let i = 0; i < B.length; i++) best = Math.min(best, segDist(p, B[i], B[(i + 1) % B.length]));
    worst = Math.max(worst, best);
  }
  return worst;
}

/** Hausdorff distance between two closed polylines (vertices against segments). */
export function outlineGap(A: readonly Pt[], B: readonly Pt[]): number {
  return Math.max(oneSided(A, B), oneSided(B, A));
}
