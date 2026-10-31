/**
 * The supertiles of a patch at one level, with their outlines, for the
 * Explorer's X-ray. An outline is the supertile's boundary as
 * `boundaryLoop` finds it (edge cancellation over its children, `map/glyphs`),
 * computed once per node: `buildSystem` shares one node per type and level,
 * so a level has at most nine outlines however many supertiles it holds.
 *
 * Drawing keeps a few decimated copies of each outline and picks one by the
 * supertile's size on screen, so a frame costs about as many vertices as
 * the screen has room for.
 */

import {
  averageLeafArea,
  buildSystem,
  SUBSTITUTION_GROWTH,
  leafOrder,
  leafPts,
  instanceAffine,
  instanceTypeId,
  inv,
  mul,
  transPt,
  type Affine,
  type MetaNode,
  type Pt,
  type TileFamilyId,
  type TileNode,
  type TileTypeId,
  type UnrootedEngine,
  type ViewRect,
} from '../../core';
import { boundaryLoop, decimateLoop, earClip, glyphFitForCut } from '../map/glyphs';
import type { RegionFillGeometry, RegionMeshTable } from '../map/rendererTypes';

/** One supertile: its type, its slot path from the root, the node it is, and where it sits. */
export interface XraySupertile {
  readonly type: TileTypeId;
  /** Slot path from the root (`1.7.0`); empty for the root itself. */
  readonly path: string;
  readonly node: TileNode;
  /** The node's frame in the patch frame. */
  readonly xform: Affine;
  /** Bounding box in the patch frame. */
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Most supertiles the X-ray lists for a rooted patch; below the level where a patch holds more, the slider stops. */
export const XRAY_MAX_SUPERTILES = 40_000;

/**
 * Highest level whose outlines are worked out exactly (`boundaryLoop`).
 * Above it a supertile's outline is its type's outline at this level, scaled
 * up by the similarity the infinite view draws its supertile glyphs with
 * (`glyphFitForCut`): the exact boundary there has hundreds of thousands of
 * edges and only the shape shows at that size.
 */
export const EXACT_OUTLINE_MAX = 6;

/** Vertex counts of the decimated copies kept per outline; the full loop is the last resort. */
const LODS = [8, 24, 64, 200, 640, 2000] as const;

interface Outline {
  readonly full: readonly Pt[];
  readonly lods: (readonly Pt[] | undefined)[];
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

const outlines = new WeakMap<TileNode, Outline>();

/** A node's outline in its own frame (computed once per node). */
export function outlineOf(node: TileNode, family: TileFamilyId): Outline {
  const hit = outlines.get(node);
  if (hit) return hit;
  const full = boundaryLoop(node, family);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of full) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const out: Outline = { full, lods: LODS.map(() => undefined), minX, minY, maxX, maxY };
  outlines.set(node, out);
  return out;
}

/** The outline of a level-`level` node, scaled up from {@link EXACT_OUTLINE_MAX} when above it (computed once per node). */
export function outlineAtLevel(node: TileNode, family: TileFamilyId, level: number): Outline {
  if (level <= EXACT_OUTLINE_MAX || node.kind === 'leaf') return outlineOf(node, family);
  const hit = outlines.get(node);
  if (hit) return hit;
  const base = outlineOf(buildSystem(family, EXACT_OUTLINE_MAX)[node.type], family);
  const M = glyphFitForCut(level, EXACT_OUTLINE_MAX, family);
  // A coarse copy is enough at this size.
  const full = outlineAtSize(base, LODS[LODS.length - 1]).map((p) => transPt(M, p));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of full) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const out: Outline = { full, lods: LODS.map(() => undefined), minX, minY, maxX, maxY };
  outlines.set(node, out);
  return out;
}

/** The outline with about `points` vertices (never fewer than needed to look right at that size). */
export function outlineAtSize(o: Outline, points: number): readonly Pt[] {
  for (let i = 0; i < LODS.length; i++) {
    if (LODS[i] < points) continue;
    if (LODS[i] >= o.full.length) return o.full;
    return (o.lods[i] ??= decimateLoop(o.full, LODS[i]));
  }
  return o.full;
}

/** How many nodes sit `depth` levels below `root` (Gamma pairs of the Spectre family count once). */
export function countAtDepth(root: TileNode, depth: number): number {
  const memo = new Map<TileNode, number>();
  const go = (n: TileNode, d: number): number => {
    if (d === 0 || n.kind === 'leaf') return 1;
    const hit = memo.get(n);
    if (hit !== undefined) return hit;
    let s = 0;
    for (const c of (n as MetaNode).children) s += go(c.node, d - 1);
    memo.set(n, s);
    return s;
  };
  // A node at a given level always sits at one depth, so memoising by node alone is sound.
  return go(root, depth);
}

/** The lowest level whose supertiles the X-ray lists for a patch of `patchLevel` (see {@link XRAY_MAX_SUPERTILES}). */
export function lowestXrayLevel(root: TileNode, patchLevel: number): number {
  for (let k = 0; k < patchLevel; k++) if (countAtDepth(root, patchLevel - k) <= XRAY_MAX_SUPERTILES) return k;
  return patchLevel;
}

function boxed(type: TileTypeId, path: string, node: TileNode, xform: Affine, family: TileFamilyId): XraySupertile {
  const o = outlineOf(node, family);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const q of [
    { x: o.minX, y: o.minY },
    { x: o.maxX, y: o.minY },
    { x: o.maxX, y: o.maxY },
    { x: o.minX, y: o.maxY },
  ]) {
    const p = transPt(xform, q);
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { type, path, node, xform, minX, minY, maxX, maxY };
}

/**
 * The supertiles at `level` of a patch rooted at `root` (a level-`patchLevel`
 * node), each with its slot path. Level 0 is the tiles themselves (a Spectre
 * Gamma pair is one tile, as its slot path is one slot).
 */
export function supertilesAt(family: TileFamilyId, root: TileNode, patchLevel: number, level: number, frame: Affine = [1, 0, 0, 0, 1, 0]): XraySupertile[] {
  const out: XraySupertile[] = [];
  const go = (n: TileNode, x: Affine, path: string, d: number): void => {
    if (d === 0 || n.kind === 'leaf') {
      out.push(boxed(n.type, path, n, x, family));
      return;
    }
    for (const c of (n as MetaNode).children) go(c.node, mul(x, c.xform), path === '' ? String(c.pos) : `${path}.${c.pos}`, d - 1);
  };
  go(root, frame, '', Math.max(0, patchLevel - level));
  return out;
}

/**
 * Level-`level` supertiles of a patch named by code: a slot path from the
 * root (a level-`patchLevel` node) read in base 8, as `slotPathCode` writes a
 * tile's, over 8^level. Codes naming no supertile are passed over.
 */
export function supertilesByCode(
  family: TileFamilyId,
  root: TileNode,
  patchLevel: number,
  level: number,
  codes: Iterable<number>,
  frame: Affine = [1, 0, 0, 0, 1, 0],
): XraySupertile[] {
  const depth = patchLevel - level;
  const place = (code: number): XraySupertile | null => {
    let node = root;
    let x = frame;
    const slots: number[] = [];
    for (let d = depth - 1; d >= 0; d--) {
      const slot = Math.floor(code / 8 ** d) % 8;
      const c = node.kind === 'leaf' ? undefined : (node as MetaNode).children.find((ch) => ch.pos === slot);
      if (!c) return null;
      x = mul(x, c.xform);
      node = c.node;
      slots.push(slot);
    }
    return boxed(node.type, slots.join('.'), node, x, family);
  };
  const out: XraySupertile[] = [];
  for (const code of codes) {
    const s = place(code);
    if (s) out.push(s);
  }
  return out;
}

/** Even-odd test of a point against a closed loop. */
export function insideLoop(loop: readonly Pt[], p: Pt): boolean {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const a = loop[i];
    const b = loop[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** The supertile under a point of the patch frame, or null. */
export function supertileAt(list: readonly XraySupertile[], p: Pt, family: TileFamilyId): XraySupertile | null {
  for (const s of list) {
    if (p.x < s.minX || p.x > s.maxX || p.y < s.minY || p.y > s.maxY) continue;
    if (insideLoop(outlineOf(s.node, family).full, transPt(inv(s.xform), p))) return s;
  }
  return null;
}

const leafNodes = new Map<string, TileNode>();

/** A leaf node of a type, for its outline (the engine emits leaves by type alone). */
function leafNode(family: TileFamilyId, type: TileTypeId): TileNode {
  const key = `${family}/${type}`;
  let n = leafNodes.get(key);
  if (!n) leafNodes.set(key, (n = { kind: 'leaf', type, quad: [] }));
  return n;
}

/** The supertiles of one level meeting a view of the infinite plane, named from the chain ancestor the view descends from. */
export interface XrayCut {
  readonly items: readonly XraySupertile[];
  /** Level and type of the chain ancestor the slot paths start at. */
  readonly rootLevel: number;
  readonly rootType: TileTypeId;
  /** More than `cap` supertiles meet the view; nothing is listed. */
  readonly tooMany: boolean;
}

/** The level-`level` supertiles of the unrooted engine's plane meeting `view`, at most about `cap` of them. */
/**
 * About how many level-`level` supertiles meet a view: its area over a
 * supertile's. The engine walks every node down to the level asked for even
 * once past its budget, so a view holding far too many is not asked for.
 */
export function supertilesInView(family: TileFamilyId, view: ViewRect, level: number): number {
  return (4 * view.halfW * view.halfH) / (averageLeafArea(family) * SUBSTITUTION_GROWTH ** level);
}

export function xrayFromEngine(engine: UnrootedEngine, view: ViewRect, level: number, cap: number): XrayCut {
  const family = engine.family;
  if (supertilesInView(family, view, level) > 2 * cap) return { items: [], rootLevel: 0, rootType: engine.ancestorType(0), tooMany: true };
  let cut = engine.query(view, cap, { cutLevel: level, emitIds: true });
  // The view sits inside a smaller ancestor than the level asked for: descend from that level's ancestor instead.
  if (cut.cutLevel < level) cut = engine.query(view, cap, { cutLevel: level, ancestorLevel: level, emitIds: true });
  const rootLevel = cut.ancestorLevel;
  const rootType = engine.ancestorType(rootLevel);
  if (cut.truncated) return { items: [], rootLevel, rootType, tooMany: true };
  const chain = engine.chain();
  const sys = level > 0 ? buildSystem(family, level) : null;
  const items: XraySupertile[] = [];
  for (let i = 0; i < cut.count; i++) {
    const type = instanceTypeId(cut.type[i], family);
    const node = sys ? sys[type] : leafNode(family, type);
    outlineAtLevel(node, family, level);
    const xform = instanceAffine(cut.pos[2 * i] + cut.origin.x, cut.pos[2 * i + 1] + cut.origin.y, cut.code[i]);
    const path = cut.ids ? pathFromAncestor(chain, rootLevel, cut.ids[i]) : null;
    items.push(boxed(type, path ?? '?', node, xform, family));
  }
  return { items, rootLevel, rootType, tooMany: false };
}

/**
 * Slot path, from the chain ancestor at `rootLevel`, of a node the unrooted
 * engine emitted with id `id` (`ViewportCut.ids`): `"d:s.s.s"` is the slot
 * path below the chain ancestor at level d; `"d:"` is that ancestor itself.
 * The chain supplies the slots from the root down to it.
 */
export function pathFromAncestor(chain: readonly { readonly slot: number }[], rootLevel: number, id: string): string | null {
  const m = /^(\d+):([\d.]*)$/.exec(id);
  if (!m) return null;
  const d = Number(m[1]);
  if (d > rootLevel || chain.length < rootLevel) return null;
  const slots: number[] = [];
  for (let i = rootLevel - 1; i >= d; i--) slots.push(chain[i].slot);
  if (m[2] !== '') slots.push(...m[2].split('.').map(Number));
  return slots.join('.');
}

/** Most single tiles the infinite view's X-ray colours under the strands; past it the view shows supertile glyphs and no strands. */
export const TINT_CAP = 40_000;

const leafMeshes = new Map<TileFamilyId, RegionMeshTable>();

/** Every leaf type's outline triangulated, one row per type in `leafOrder` order (the byte the engine emits). */
export function leafMesh(family: TileFamilyId): RegionMeshTable {
  const hit = leafMeshes.get(family);
  if (hit) return hit;
  const polys = leafOrder(family).map((t) => leafPts(family, t));
  const tris = polys.map((poly) => earClip(poly).flatMap((i) => [poly[i].x, poly[i].y]));
  const verts = Math.max(3, ...tris.map((t) => t.length / 2));
  const data = new Float32Array(polys.length * verts * 2);
  tris.forEach((t, row) => {
    data.set(t, row * verts * 2);
    // Padding repeats the last vertex: degenerate triangles.
    for (let j = t.length / 2; j < verts; j++) {
      data[(row * verts + j) * 2] = t[t.length - 2] ?? 0;
      data[(row * verts + j) * 2 + 1] = t[t.length - 1] ?? 0;
    }
  });
  const mesh: RegionMeshTable = { rows: polys.length, verts, data, rowPolys: polys };
  leafMeshes.set(family, mesh);
  return mesh;
}

/**
 * The single tiles meeting `view`, each coloured as the level-`level`
 * supertile of `cut` that holds it, for `InfiniteCanvasApi.setTint`; null
 * when more than {@link TINT_CAP} tiles meet the view or none is placed.
 */
export function tintFromEngine(
  engine: UnrootedEngine,
  view: ViewRect,
  cut: XrayCut,
  level: number,
  rgbOf: (type: TileTypeId) => readonly [number, number, number],
  alpha: number,
): RegionFillGeometry | null {
  if (cut.tooMany || supertilesInView(engine.family, view, 0) > TINT_CAP) return null;
  const leaves = engine.query(view, TINT_CAP, { cutLevel: 0, emitIds: true });
  if (leaves.truncated || leaves.cutLevel !== 0 || !leaves.ids) return null;
  const typeAt = new Map(cut.items.map((s) => [s.path, s.type]));
  const chain = engine.chain();
  const keep: number[] = [];
  const rgb: number[] = [];
  for (let i = 0; i < leaves.count; i++) {
    const path = pathFromAncestor(chain, cut.rootLevel, leaves.ids[i]);
    if (path === null) continue;
    const slots = path === '' ? [] : path.split('.');
    if (slots.length < level) continue;
    const type = typeAt.get(slots.slice(0, slots.length - level).join('.'));
    if (!type) continue;
    keep.push(i);
    rgb.push(...rgbOf(type));
  }
  if (!keep.length) return null;
  const pos = new Float32Array(keep.length * 2);
  const code = new Uint8Array(keep.length);
  const row = new Uint8Array(keep.length);
  keep.forEach((i, q) => {
    pos[2 * q] = leaves.pos[2 * i];
    pos[2 * q + 1] = leaves.pos[2 * i + 1];
    code[q] = leaves.code[i];
    row[q] = leaves.type[i];
  });
  return { mesh: leafMesh(engine.family), origin: leaves.origin, count: keep.length, pos, code, row, rgb: Uint8Array.from(rgb), alpha };
}
