/**
 * Un-rooted (infinite-plane) spectre tile generation
 * (docs/TILE_ALGOS_INVESTIGATION.md section 5, docs/BIGMAP_INVESTIGATION.md
 * section 2 — the lazy-DAG viewport expansion of `web/spike/lazy-gen.ts`
 * re-based onto a typed lazy ancestor chain and exact Z[zeta12] transforms).
 *
 * Instead of expanding DOWN from a fixed level-9 root, the world is anchored
 * at a level-0 "seed" tile at the origin and the hierarchy grows UPWARD on
 * demand: a serializable integer seed drives a deterministic PRNG that picks
 * each `(parentType, slot)` ancestor step, eigenvector-weighted by the
 * substitution's stationary type distribution (Tatham's `Possibility`
 * scheme), so every seed names one concrete tiling of the whole plane and
 * the chain is prefix-stable — extending it never changes earlier steps.
 *
 * Coordinates: the anchor's frame IS the world frame. The world transform of
 * ancestor `A_L` is the exact inverse of the composed child transforms down
 * the chain, so re-anchoring when the chain grows is EXACT — a tile's world
 * transform is bit-identical no matter which ancestor the query descends
 * from. Because each substitution step carries one reflection, every leaf's
 * world transform composes to mirror-parity 0: leaves are never mirrored in
 * world frame (the tiling is chiral); a level-c aggregate carries mirror
 * parity `c & 1`.
 *
 * Viewport queries pick a budget-driven LOD cut level (each level up divides
 * instance counts by ~7.873), DFS-cull the shared substitution DAG by cached
 * bounding boxes, and emit the compact 10-byte wire format of the spike:
 * `x, y (f32, origin-relative), code (rot 0..11 | mirror<<4), type (u8)`.
 *
 * Pure module: no DOM, no worker globals. The worker wrapper lives in
 * `src/workers/tiling.worker.ts` / `tilingClient.ts`.
 */

import type { Affine, Pt } from './geom';
import { LEAF_ORDER, SPECTRE_PTS, TILE_NAMES, leafPts, type TileTypeId } from './families';
import { SUPER_RULES, buildSystem, type TileNode } from './tiles';
import {
  COS30,
  SIN30,
  Z_COEFF_LIMIT,
  Z_IDENT,
  zAffineMaxAbsCoeff,
  zConj,
  zGamma2Xform,
  zInv,
  zMul,
  zRot,
  zSupertileTransforms,
  zX,
  zY,
  type ZAffine,
  type ZVec,
} from './exact';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Dominant eigenvalue of the substitution matrix — tiles per level. */
export const SUBSTITUTION_GROWTH = 7.8730178;

/**
 * Hard ceiling on ancestor-chain height. Exact integer coefficients grow
 * ~1.53 bits per level; 32 levels stay comfortably under `Z_COEFF_LIMIT`
 * (checked again at runtime on every growth step). A level-32 patch spans
 * ~2.8^32 = 1e14 world units — far beyond anything a camera can express.
 */
export const UNROOTED_MAX_LEVEL = 32;

/** `type` byte values >= this are supertile aggregates: `128 + TILE_NAMES index`. */
export const AGGREGATE_TYPE_BASE = 128;

/** Exact area of one spectre tile (shoelace over `SPECTRE_PTS`). */
export const SPECTRE_TILE_AREA = (() => {
  let a = 0;
  for (let i = 0; i < SPECTRE_PTS.length; ++i) {
    const p = SPECTRE_PTS[i];
    const q = SPECTRE_PTS[(i + 1) % SPECTRE_PTS.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
})();

/**
 * Coverage margins: a query descends from the lowest chain ancestor whose
 * bounding box, shrunk by `COVER_SHRINK` per side, still contains the view
 * rect padded by `COVER_MARGIN_TILES` world units. The shrink + pad keep the
 * fractal patch boundary (and tiles of *sibling* supertiles that poke into
 * the bbox) safely away from the view, so the emitted tile set is complete
 * and independent of how far the chain has grown — verified by the
 * growth-stability tests.
 */
const COVER_MARGIN_TILES = 8;
const COVER_SHRINK = 0.2;

const LEAF_INDEX = new Map<TileTypeId, number>(LEAF_ORDER.map((t, i) => [t, i]));
const META_INDEX = new Map<TileTypeId, number>(TILE_NAMES.map((t, i) => [t, i]));
const LOG_GROWTH = Math.log(SUBSTITUTION_GROWTH);
const HALF_SQRT3 = Math.sqrt(3) / 2;

// ---------------------------------------------------------------------------
// Deterministic PRNG + stationary type distribution (chain growth weights)
// ---------------------------------------------------------------------------

/** splitmix32 — tiny, deterministic, uniform in [0, 1). */
function splitmix32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

let stationaryCache: Readonly<Record<TileTypeId, number>> | null = null;

/**
 * Limit frequencies of the 9 metatile types under substitution (the Perron
 * eigenvector, normalized to sum 1) — the statistically honest weights for
 * upward ancestor choice: `P(parent = P, slot = s | child type c)` is
 * proportional to `freq(P)` over all `(P, s)` with `SUPER_RULES[P][s] == c`.
 * Computed by power iteration (deterministic; converges to ~1e-15).
 */
export function stationaryTypeDistribution(): Readonly<Record<TileTypeId, number>> {
  if (stationaryCache) return stationaryCache;
  let freq = new Map<string, number>(TILE_NAMES.map((t) => [t, 1 / TILE_NAMES.length]));
  for (let iter = 0; iter < 256; ++iter) {
    const next = new Map<string, number>(TILE_NAMES.map((t) => [t, 0]));
    for (const parent of TILE_NAMES) {
      const w = freq.get(parent) ?? 0;
      for (const child of SUPER_RULES[parent]) {
        if (child === 'null') continue;
        next.set(child, (next.get(child) ?? 0) + w);
      }
    }
    let sum = 0;
    for (const v of next.values()) sum += v;
    for (const [k, v] of next) next.set(k, v / sum);
    freq = next;
  }
  const out = {} as Record<TileTypeId, number>;
  for (const t of TILE_NAMES) out[t] = freq.get(t) ?? 0;
  stationaryCache = Object.freeze(out);
  return stationaryCache;
}

// ---------------------------------------------------------------------------
// Cached node-local bounding boxes over the shared substitution DAG
// ---------------------------------------------------------------------------

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const bboxCache = new WeakMap<TileNode, BBox>();

function localBBox(node: TileNode): BBox {
  const hit = bboxCache.get(node);
  if (hit) return hit;
  const box: BBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  if (node.kind === 'leaf') {
    for (const p of leafPts('spectre', node.type)) {
      if (p.x < box.minX) box.minX = p.x;
      if (p.y < box.minY) box.minY = p.y;
      if (p.x > box.maxX) box.maxX = p.x;
      if (p.y > box.maxY) box.maxY = p.y;
    }
  } else {
    for (const child of node.children) {
      const b = localBBox(child.node);
      const T = child.xform;
      for (const [cx, cy] of [
        [b.minX, b.minY],
        [b.maxX, b.minY],
        [b.minX, b.maxY],
        [b.maxX, b.maxY],
      ]) {
        const x = T[0] * cx + T[1] * cy + T[2];
        const y = T[3] * cx + T[4] * cy + T[5];
        if (x < box.minX) box.minX = x;
        if (y < box.minY) box.minY = y;
        if (x > box.maxX) box.maxX = x;
        if (y > box.maxY) box.maxY = y;
      }
    }
  }
  bboxCache.set(node, box);
  return box;
}

// ---------------------------------------------------------------------------
// Fast exact-composition tables
// ---------------------------------------------------------------------------
// A child transform C = (ck, cm, ct) composed under a parent (k, m, t) is
//   k' = m ? k - ck : k + ck   (mod 12)
//   m' = m ^ cm
//   t' = t + d^k * conj^m(ct)
// The rotated translations d^k * conj^m(ct) depend only on (level, slot, k, m)
// so they are precomputed once per level: 8 slots x 12 rotations x 2 mirrors
// x 4 integer coefficients. The DFS then costs 4 float adds per child.

interface ComposeTable {
  readonly ck: Int32Array; // child rotation steps per slot
  readonly cm: number; // child mirror flag (1 for substitution levels, 0 for the Gamma pair)
  readonly rt: Float64Array; // rotated child translations, [(slot*12 + k)*2 + m] * 4
}

function buildComposeTable(children: readonly ZAffine[], cm: number): ComposeTable {
  const slots = children.length;
  const ck = new Int32Array(slots);
  const rt = new Float64Array(slots * 12 * 2 * 4);
  for (let slot = 0; slot < slots; ++slot) {
    const C = children[slot];
    if (C.m !== cm) throw new Error('compose table: unexpected child mirror flag');
    ck[slot] = C.k;
    const conjT = zConj(C.t);
    for (let k = 0; k < 12; ++k) {
      for (let m = 0; m < 2; ++m) {
        const v = zRot(m ? conjT : C.t, k);
        const base = ((slot * 12 + k) * 2 + m) * 4;
        rt[base] = v[0];
        rt[base + 1] = v[1];
        rt[base + 2] = v[2];
        rt[base + 3] = v[3];
      }
    }
  }
  return { ck, cm, rt };
}

const composeTableCache: ComposeTable[] = []; // index level - 1
let pairTableCache: ComposeTable | null = null;

function composeTable(level: number): ComposeTable {
  while (composeTableCache.length < level) {
    composeTableCache.push(buildComposeTable(zSupertileTransforms(composeTableCache.length + 1), 1));
  }
  return composeTableCache[level - 1];
}

function pairTable(): ComposeTable {
  if (!pairTableCache) pairTableCache = buildComposeTable([Z_IDENT, zGamma2Xform()], 0);
  return pairTableCache;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** One upward step of the ancestor chain: A_i sits at `slot` inside a `parentType` A_{i+1}. */
export interface ChainStep {
  readonly parentType: TileTypeId;
  readonly slot: number;
}

/** Camera rect in world coordinates (axis-aligned, center + half extents). */
export interface ViewRect {
  readonly cx: number;
  readonly cy: number;
  readonly halfW: number;
  readonly halfH: number;
}

export interface ViewportQueryOptions {
  /** Also emit a seed-relative stable string id per instance. */
  readonly emitIds?: boolean;
  /** Also emit the exact Z[zeta12] translation (4 doubles) per instance. */
  readonly emitExact?: boolean;
  /** Subtract this world point from emitted positions (default: view center). */
  readonly origin?: Pt;
  /** Testing/advanced: force the DFS to descend from this chain ancestor. */
  readonly ancestorLevel?: number;
}

/**
 * A budget-driven LOD cut of the viewport. Instances are leaves when
 * `cutLevel == 0`, level-`cutLevel` supertile aggregates otherwise.
 *
 * Wire format per instance (the spike's 10-byte encoding):
 *  - `pos[2i], pos[2i+1]` — f32 world position minus `origin`;
 *  - `code[i]` — rotation index 0..11 (30-degree steps) | mirror << 4; the
 *    float linear part is `R(30 * rot) * diag(mirror ? -1 : 1, 1)`. Leaves
 *    always have mirror 0; aggregates have mirror `cutLevel & 1`;
 *  - `type[i]` — `LEAF_ORDER` index for leaves, `AGGREGATE_TYPE_BASE +
 *    TILE_NAMES index` for aggregates.
 */
export interface ViewportCut {
  readonly count: number;
  readonly cutLevel: number;
  /** Chain ancestor the DFS descended from. */
  readonly ancestorLevel: number;
  readonly origin: Pt;
  /** True if the instance cap was hit (result incomplete; raise the cut). */
  readonly truncated: boolean;
  readonly visitedNodes: number;
  readonly pos: Float32Array;
  readonly code: Uint8Array;
  readonly type: Uint8Array;
  /** Present when `emitIds` was set: seed-relative stable tile ids. */
  readonly ids?: readonly string[];
  /** Present when `emitExact` was set: exact translation coefficients, 4 per instance. */
  readonly exact?: Float64Array;
}

export interface UnrootedEngine {
  readonly seed: number;
  readonly family: 'spectre';
  /** Type of the level-0 anchor tile (may be the composite 'Gamma' pair). */
  anchorType(): TileTypeId;
  /** Type of the anchor's ancestor at `level` (0 = the anchor itself). */
  ancestorType(level: number): TileTypeId;
  /** The ancestor steps materialized so far (grows on demand, prefix-stable). */
  chain(): readonly ChainStep[];
  topLevel(): number;
  ensureLevel(level: number): void;
  /** Smallest chain level whose patch safely covers `view` (grows the chain). */
  coverageLevel(view: ViewRect): number;
  /** Exact world transform of ancestor `A_level` (the anchor frame is world). */
  ancestorWorldXform(level: number): ZAffine;
  /** Float world bounding box of ancestor `A_level`. */
  ancestorWorldBounds(level: number): { min: Pt; max: Pt };
  query(view: ViewRect, budget: number, opts?: ViewportQueryOptions): ViewportCut;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

function weightedPick<T>(items: readonly T[], weights: readonly number[], u: number): T {
  let total = 0;
  for (const w of weights) total += w;
  let r = u * total;
  for (let i = 0; i < items.length; ++i) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

export function createUnrootedEngine(seed: number): UnrootedEngine {
  const normSeed = Math.floor(seed) >>> 0;
  const rng = splitmix32(normSeed);
  const freq = stationaryTypeDistribution();

  // Anchor type: one stationary-weighted draw.
  const anchorType = weightedPick(
    TILE_NAMES,
    TILE_NAMES.map((t) => freq[t]),
    rng(),
  );

  const chain: ChainStep[] = [];
  // X[l] maps anchor frame -> A_l frame; world transform of A_l is inv(X[l]).
  const anchorToAncestor: ZAffine[] = [Z_IDENT];
  const worldOfAncestor: ZAffine[] = [Z_IDENT];

  const typeAt = (level: number): TileTypeId =>
    level === 0 ? anchorType : chain[level - 1].parentType;

  const nodeAt = (level: number): TileNode => buildSystem('spectre', level)[typeAt(level)];

  function ensureLevel(level: number): void {
    if (level > UNROOTED_MAX_LEVEL) {
      throw new Error(`unrooted chain would exceed UNROOTED_MAX_LEVEL (${UNROOTED_MAX_LEVEL})`);
    }
    while (chain.length < level) {
      const childType = typeAt(chain.length);
      const candidates: ChainStep[] = [];
      const weights: number[] = [];
      for (const parentType of TILE_NAMES) {
        const row = SUPER_RULES[parentType];
        for (let slot = 0; slot < row.length; ++slot) {
          if (row[slot] === childType) {
            candidates.push({ parentType, slot });
            weights.push(freq[parentType]);
          }
        }
      }
      if (candidates.length === 0) throw new Error(`no legal parent for ${childType}`);
      const step = weightedPick(candidates, weights, rng());
      const nextLevel = chain.length + 1;
      chain.push(step);
      const X = zMul(zSupertileTransforms(nextLevel)[step.slot], anchorToAncestor[nextLevel - 1]);
      const W = zInv(X);
      if (zAffineMaxAbsCoeff(X) > Z_COEFF_LIMIT || zAffineMaxAbsCoeff(W) > Z_COEFF_LIMIT) {
        chain.pop();
        throw new Error(`exact-coefficient overflow guard tripped at level ${nextLevel}`);
      }
      anchorToAncestor.push(X);
      worldOfAncestor.push(W);
    }
  }

  function ancestorWorldBounds(level: number): { min: Pt; max: Pt } {
    ensureLevel(level);
    const W = worldOfAncestor[level];
    const b = localBBox(nodeAt(level));
    const c = COS30[W.k];
    const s = SIN30[W.k];
    const l00 = c;
    const l01 = W.m ? s : -s;
    const l10 = s;
    const l11 = W.m ? -c : c;
    const tx = zX(W.t);
    const ty = zY(W.t);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [px, py] of [
      [b.minX, b.minY],
      [b.maxX, b.minY],
      [b.minX, b.maxY],
      [b.maxX, b.maxY],
    ]) {
      const x = l00 * px + l01 * py + tx;
      const y = l10 * px + l11 * py + ty;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
  }

  function coverageLevel(view: ViewRect): number {
    const needMinX = view.cx - view.halfW - COVER_MARGIN_TILES;
    const needMaxX = view.cx + view.halfW + COVER_MARGIN_TILES;
    const needMinY = view.cy - view.halfH - COVER_MARGIN_TILES;
    const needMaxY = view.cy + view.halfH + COVER_MARGIN_TILES;
    for (let level = 0; level <= UNROOTED_MAX_LEVEL; ++level) {
      ensureLevel(level);
      const wb = ancestorWorldBounds(level);
      const shrinkX = COVER_SHRINK * (wb.max.x - wb.min.x) * 0.5;
      const shrinkY = COVER_SHRINK * (wb.max.y - wb.min.y) * 0.5;
      if (
        needMinX >= wb.min.x + shrinkX &&
        needMaxX <= wb.max.x - shrinkX &&
        needMinY >= wb.min.y + shrinkY &&
        needMaxY <= wb.max.y - shrinkY
      ) {
        return level;
      }
    }
    throw new Error('view rect not coverable within UNROOTED_MAX_LEVEL');
  }

  /**
   * Count nodes at `probeCut` (or leaves) whose bbox intersects `view`,
   * descending from ancestor `level`. Used by the coverage-stabilization
   * loop: descending from a higher ancestor always yields a superset, so
   * equal probe counts prove no foreign supertile (and hence no foreign
   * tile — every tile's ancestors' bboxes contain its own) can reach the
   * view from outside the lower ancestor's subtree.
   */
  function probeCount(level: number, probeCut: number, view: ViewRect): number {
    const W = worldOfAncestor[level];
    const wMinX = view.cx - view.halfW;
    const wMaxX = view.cx + view.halfW;
    const wMinY = view.cy - view.halfH;
    const wMaxY = view.cy + view.halfH;
    let count = 0;
    const walk = (
      node: TileNode,
      lvl: number,
      k: number,
      m: number,
      a: number,
      b: number,
      c: number,
      d: number,
    ): void => {
      const tx = a + b * HALF_SQRT3 + c * 0.5;
      const ty = b * 0.5 + c * HALF_SQRT3 + d;
      const co = COS30[k];
      const si = SIN30[k];
      const l00 = co;
      const l01 = m ? si : -si;
      const l10 = si;
      const l11 = m ? -co : co;
      const bb = localBBox(node);
      const xs0 = l00 * bb.minX;
      const xs1 = l00 * bb.maxX;
      const ys0 = l01 * bb.minY;
      const ys1 = l01 * bb.maxY;
      const xt0 = l10 * bb.minX;
      const xt1 = l10 * bb.maxX;
      const yt0 = l11 * bb.minY;
      const yt1 = l11 * bb.maxY;
      if (
        Math.max(xs0 + ys0, xs0 + ys1, xs1 + ys0, xs1 + ys1) + tx < wMinX ||
        Math.min(xs0 + ys0, xs0 + ys1, xs1 + ys0, xs1 + ys1) + tx > wMaxX ||
        Math.max(xt0 + yt0, xt0 + yt1, xt1 + yt0, xt1 + yt1) + ty < wMinY ||
        Math.min(xt0 + yt0, xt0 + yt1, xt1 + yt0, xt1 + yt1) + ty > wMaxY
      ) {
        return;
      }
      if (node.kind === 'leaf' || (probeCut > 0 && lvl <= probeCut)) {
        count++;
        return;
      }
      const table = lvl >= 1 ? composeTable(lvl) : pairTable();
      const childLevel = lvl >= 1 ? lvl - 1 : 0;
      for (const child of node.children) {
        const slot = child.pos;
        const base = ((slot * 12 + k) * 2 + m) * 4;
        walk(
          child.node,
          childLevel,
          m ? (k - table.ck[slot] + 12) % 12 : (k + table.ck[slot]) % 12,
          m ^ table.cm,
          a + table.rt[base],
          b + table.rt[base + 1],
          c + table.rt[base + 2],
          d + table.rt[base + 3],
        );
      }
    };
    walk(nodeAt(level), level, W.k, W.m, W.t[0], W.t[1], W.t[2], W.t[3]);
    return count;
  }

  // Reusable scratch buffers (results are exact-size copies, so the scratch
  // is never aliased by callers and stays transfer-safe).
  let scratchCap = 0;
  let scratchPos = new Float32Array(0);
  let scratchCode = new Uint8Array(0);
  let scratchType = new Uint8Array(0);
  let scratchExact = new Float64Array(0);

  function query(view: ViewRect, budget: number, opts: ViewportQueryOptions = {}): ViewportCut {
    if (!(budget >= 1)) throw new Error(`invalid budget ${budget}`);
    const est = (4 * view.halfW * view.halfH) / SPECTRE_TILE_AREA;
    const cutEstimate = Math.max(0, Math.ceil(Math.log(Math.max(1, est / budget)) / LOG_GROWTH));

    let ancestorLevel: number;
    if (opts.ancestorLevel !== undefined) {
      // testing/advanced: fixed descent root, no completeness stabilization
      ancestorLevel = opts.ancestorLevel;
      ensureLevel(ancestorLevel);
    } else {
      // Start at the bbox-fit level, then grow until a coarse probe proves the
      // emitted set complete: the fractal patch does not fill its bbox, so
      // bbox containment alone is not coverage. Probing at `cut + 4` costs
      // ~1/G^4 of the full expansion; the +3-level comparison window matches
      // the growth-stability acceptance test.
      ancestorLevel = coverageLevel(view);
      for (;;) {
        const upper = Math.min(ancestorLevel + 3, UNROOTED_MAX_LEVEL);
        ensureLevel(upper);
        const probeCut = Math.min(ancestorLevel, cutEstimate + 4);
        const lower = probeCount(ancestorLevel, probeCut, view);
        if (lower > 0 && lower === probeCount(upper, probeCut, view)) break;
        if (ancestorLevel >= UNROOTED_MAX_LEVEL) {
          throw new Error('viewport coverage did not stabilize within UNROOTED_MAX_LEVEL');
        }
        ancestorLevel += 1;
      }
    }

    const cutLevel = Math.min(ancestorLevel, cutEstimate);

    const cap = Math.max(4096, 2 * Math.ceil(budget) + 1024);
    if (cap > scratchCap) {
      scratchCap = cap;
      scratchPos = new Float32Array(cap * 2);
      scratchCode = new Uint8Array(cap);
      scratchType = new Uint8Array(cap);
      scratchExact = new Float64Array(0); // re-sized below if needed
    }
    const emitExact = opts.emitExact === true;
    if (emitExact && scratchExact.length < cap * 4) scratchExact = new Float64Array(cap * 4);
    const emitIds = opts.emitIds === true;
    const ids: string[] | undefined = emitIds ? [] : undefined;

    const origin = opts.origin ?? { x: view.cx, y: view.cy };
    const ox = origin.x;
    const oy = origin.y;
    const wMinX = view.cx - view.halfW;
    const wMaxX = view.cx + view.halfW;
    const wMinY = view.cy - view.halfH;
    const wMaxY = view.cy + view.halfH;

    const pos = scratchPos;
    const codeArr = scratchCode;
    const typeArr = scratchType;
    const exactArr = scratchExact;

    let n = 0;
    let truncated = false;
    let visited = 0;
    // Seed-relative id state: while the DFS is still ON the ancestor chain the
    // node is A_level itself; after the first divergence the id base is the
    // chain level where it happened, plus the slot path since.
    const idStack: number[] = [];

    // ON_CHAIN sentinel for chainState; otherwise chainState = diverge level.
    const ON_CHAIN = -1;

    const walk = (
      node: TileNode,
      level: number,
      k: number,
      m: number,
      a: number,
      b: number,
      c: number,
      d: number,
      chainState: number,
    ): void => {
      visited++;
      const tx = a + b * HALF_SQRT3 + c * 0.5;
      const ty = b * 0.5 + c * HALF_SQRT3 + d;
      const co = COS30[k];
      const si = SIN30[k];
      const l00 = co;
      const l01 = m ? si : -si;
      const l10 = si;
      const l11 = m ? -co : co;
      const bb = localBBox(node);
      const xs0 = l00 * bb.minX;
      const xs1 = l00 * bb.maxX;
      const ys0 = l01 * bb.minY;
      const ys1 = l01 * bb.maxY;
      const xt0 = l10 * bb.minX;
      const xt1 = l10 * bb.maxX;
      const yt0 = l11 * bb.minY;
      const yt1 = l11 * bb.maxY;
      const bMinX = Math.min(xs0 + ys0, xs0 + ys1, xs1 + ys0, xs1 + ys1);
      const bMaxX = Math.max(xs0 + ys0, xs0 + ys1, xs1 + ys0, xs1 + ys1);
      const bMinY = Math.min(xt0 + yt0, xt0 + yt1, xt1 + yt0, xt1 + yt1);
      const bMaxY = Math.max(xt0 + yt0, xt0 + yt1, xt1 + yt0, xt1 + yt1);
      if (
        bMaxX + tx < wMinX ||
        bMinX + tx > wMaxX ||
        bMaxY + ty < wMinY ||
        bMinY + ty > wMaxY
      ) {
        return;
      }

      if (node.kind === 'leaf' || (cutLevel > 0 && level <= cutLevel)) {
        if (n >= cap) {
          truncated = true;
          return;
        }
        pos[n * 2] = tx - ox;
        pos[n * 2 + 1] = ty - oy;
        codeArr[n] = m ? ((k + 6) % 12) | 16 : k;
        typeArr[n] =
          node.kind === 'leaf'
            ? (LEAF_INDEX.get(node.type) ?? 0)
            : AGGREGATE_TYPE_BASE + (META_INDEX.get(node.type) ?? 0);
        if (emitExact) {
          const e = n * 4;
          exactArr[e] = a;
          exactArr[e + 1] = b;
          exactArr[e + 2] = c;
          exactArr[e + 3] = d;
        }
        if (ids) {
          ids[n] =
            chainState === ON_CHAIN ? `${level}:` : `${chainState}:${idStack.join('.')}`;
        }
        n++;
        return;
      }

      const table = level >= 1 ? composeTable(level) : pairTable();
      const cm = table.cm;
      const ck = table.ck;
      const rt = table.rt;
      const childLevel = level >= 1 ? level - 1 : 0;
      for (const child of node.children) {
        const slot = child.pos;
        const base = ((slot * 12 + k) * 2 + m) * 4;
        const k2 = m ? (k - ck[slot] + 12) % 12 : (k + ck[slot]) % 12;
        const m2 = m ^ cm;
        const onChainChild =
          chainState === ON_CHAIN && level >= 1 && chain[level - 1].slot === slot;
        const childState = onChainChild ? ON_CHAIN : chainState === ON_CHAIN ? level : chainState;
        if (!onChainChild) idStack.push(slot);
        walk(
          child.node,
          childLevel,
          k2,
          m2,
          a + rt[base],
          b + rt[base + 1],
          c + rt[base + 2],
          d + rt[base + 3],
          childState,
        );
        if (!onChainChild) idStack.pop();
      }
    };

    const W = worldOfAncestor[ancestorLevel];
    walk(nodeAt(ancestorLevel), ancestorLevel, W.k, W.m, W.t[0], W.t[1], W.t[2], W.t[3], ON_CHAIN);

    return {
      count: n,
      cutLevel,
      ancestorLevel,
      origin,
      truncated,
      visitedNodes: visited,
      pos: scratchPos.slice(0, n * 2),
      code: scratchCode.slice(0, n),
      type: scratchType.slice(0, n),
      ...(ids ? { ids } : {}),
      ...(emitExact ? { exact: scratchExact.slice(0, n * 4) } : {}),
    };
  }

  return {
    seed: normSeed,
    family: 'spectre',
    anchorType: () => anchorType,
    ancestorType: (level: number) => {
      ensureLevel(level);
      return typeAt(level);
    },
    chain: () => chain.slice(),
    topLevel: () => chain.length,
    ensureLevel,
    coverageLevel,
    ancestorWorldXform: (level: number) => {
      ensureLevel(level);
      return worldOfAncestor[level];
    },
    ancestorWorldBounds,
    query,
  };
}

// ---------------------------------------------------------------------------
// Wire-format helpers (renderer / test side)
// ---------------------------------------------------------------------------

/** Decode the `code` byte: rotation index 0..11 and mirror flag. */
export function decodeInstanceCode(code: number): { rot: number; mirrored: boolean } {
  return { rot: code & 15, mirrored: (code & 16) !== 0 };
}

/** Reconstruct the float world transform from wire fields (plus `origin`). */
export function instanceAffine(x: number, y: number, code: number): Affine {
  const rot = code & 15;
  const mir = (code & 16) !== 0 ? -1 : 1;
  const c = COS30[rot];
  const s = SIN30[rot];
  return [c * mir, -s, x, s * mir, c, y];
}

/** Reconstruct the exact transform from `code` + the 4 `exact` coefficients. */
export function instanceExactAffine(code: number, exact: ArrayLike<number>, i: number): ZAffine {
  const rot = code & 15;
  const mirrored = (code & 16) !== 0;
  const k = mirrored ? (rot + 6) % 12 : rot;
  const t: ZVec = [exact[i * 4], exact[i * 4 + 1], exact[i * 4 + 2], exact[i * 4 + 3]];
  return { k, m: mirrored ? 1 : 0, t };
}

/** True if the `type` byte denotes a supertile aggregate. */
export function isAggregateType(typeByte: number): boolean {
  return typeByte >= AGGREGATE_TYPE_BASE;
}

/** Map a `type` byte back to its `TileTypeId`. */
export function instanceTypeId(typeByte: number): TileTypeId {
  return typeByte >= AGGREGATE_TYPE_BASE
    ? TILE_NAMES[typeByte - AGGREGATE_TYPE_BASE]
    : LEAF_ORDER[typeByte];
}

// ---------------------------------------------------------------------------
// Request/response layer for the worker wrapper (pure — no worker globals)
// ---------------------------------------------------------------------------

export interface UnrootedQueryRequest {
  /** Echoed back for newest-wins cancellation in the client. */
  readonly id: number;
  readonly seed: number;
  readonly view: ViewRect;
  readonly budget: number;
  readonly emitIds?: boolean;
  readonly emitExact?: boolean;
}

export interface UnrootedQueryResponse {
  readonly id: number;
  readonly seed: number;
  readonly cut: ViewportCut;
}

const engineCache = new Map<number, UnrootedEngine>();

/** Get (or lazily create) the shared engine for a seed. */
export function unrootedEngineFor(seed: number): UnrootedEngine {
  const key = Math.floor(seed) >>> 0;
  let engine = engineCache.get(key);
  if (!engine) {
    engine = createUnrootedEngine(key);
    engineCache.set(key, engine);
  }
  return engine;
}

/** Pure request handler; `workers/tiling.worker.ts` is a thin shell around it. */
export function runUnrootedQuery(req: UnrootedQueryRequest): UnrootedQueryResponse {
  const engine = unrootedEngineFor(req.seed);
  const cut = engine.query(req.view, req.budget, {
    emitIds: req.emitIds,
    emitExact: req.emitExact,
  });
  return { id: req.id, seed: engine.seed, cut };
}
