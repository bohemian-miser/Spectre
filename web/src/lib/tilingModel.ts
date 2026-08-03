/**
 * Render models for the tiling widgets (DESIGN.md §5.1).
 *
 * Everything here is pure and memoized: outline path strings are generated once
 * per (family, tileType, curvy) so `TilingView` can emit a `<defs>` entry per
 * leaf type and one `<use>` per instance instead of thousands of path strings.
 */

import {
  DEFAULT_CONTRACTS,
  IDENT,
  bounds,
  buildSystem,
  connectionPoints,
  countTiles,
  edgeLabels,
  flatten,
  leafOrder,
  leafPts,
  levelMirror,
  metaEdges,
  mul,
  outlinePath,
  transPt,
  type Affine,
  type ConnectionPoint,
  type EdgeContracts,
  type MetaEdge,
  type Pt,
  type TileFamilyId,
  type TileInstance,
  type TileNode,
  type TileTypeId,
} from '../core';
import { boxOfPoints, transformBox, type Box } from './viewport';

// ---------------------------------------------------------------------------
// Outlines
// ---------------------------------------------------------------------------

const outlineCache = new Map<string, string>();

/** Memoized outline path for one leaf type. */
export function tileOutline(family: TileFamilyId, type: TileTypeId, curvy: boolean): string {
  const key = `${family}/${type}/${curvy ? 'c' : 's'}`;
  const hit = outlineCache.get(key);
  if (hit !== undefined) return hit;
  const d = outlinePath(leafPts(family, type), curvy);
  outlineCache.set(key, d);
  return d;
}

/** DOM id for the `<defs>` entry of a leaf type (scoped by an instance prefix). */
export function tileDefId(prefix: string, type: TileTypeId): string {
  return `${prefix}-tile-${type}`;
}

export function dotsDefId(prefix: string, type: TileTypeId): string {
  return `${prefix}-dots-${type}`;
}

// ---------------------------------------------------------------------------
// Connection points / seams
// ---------------------------------------------------------------------------

const connectionCache = new Map<string, readonly ConnectionPoint[]>();

/**
 * Memoized `connectionPoints`. Contracts are part of the key only when they are
 * not the defaults, which is the overwhelmingly common case.
 */
export function tileConnectionPoints(
  family: TileFamilyId,
  type: TileTypeId,
  selected: ReadonlySet<number>,
  contracts: EdgeContracts = DEFAULT_CONTRACTS,
): readonly ConnectionPoint[] {
  const custom = contracts !== DEFAULT_CONTRACTS ? JSON.stringify(contracts) : '';
  const key = `${family}/${type}/${[...selected].sort((a, b) => a - b).join('')}/${custom}`;
  const hit = connectionCache.get(key);
  if (hit) return hit;
  const pts = connectionPoints(family, type, selected, contracts);
  connectionCache.set(key, pts);
  return pts;
}

/**
 * Vertex chain of a seam: the edge indices are a maximal *consecutive* run, so
 * the polyline is `pts[i0], pts[i0+1], …, pts[iLast+1]`.
 */
export function seamPolyline(pts: readonly Pt[], seam: MetaEdge): readonly Pt[] {
  const n = pts.length;
  if (seam.edgeIndices.length === 0) return [];
  const out: Pt[] = [pts[seam.edgeIndices[0]]];
  for (const i of seam.edgeIndices) out.push(pts[(i + 1) % n]);
  return out;
}

export function polylineD(pts: readonly Pt[]): string {
  if (pts.length === 0) return '';
  return `M ${pts[0].x} ${pts[0].y}` + pts.slice(1).map((p) => ` L ${p.x} ${p.y}`).join('');
}

/** True when the tile type has any drawable geometry in this family. */
export function hasGeometry(family: TileFamilyId, type: TileTypeId): boolean {
  return edgeLabels(family, type).length > 0;
}

// ---------------------------------------------------------------------------
// Tile parts (the Gamma composite is two leaves)
// ---------------------------------------------------------------------------

export interface TilePart {
  readonly type: TileTypeId;
  readonly xform: Affine;
  readonly pts: readonly Pt[];
}

const partsCache = new Map<string, readonly TilePart[]>();

/**
 * The leaf parts a single-tile widget must draw. Every type except the
 * composite `Gamma` in non-hex families is one part at the identity.
 */
export function tileParts(family: TileFamilyId, type: TileTypeId): readonly TilePart[] {
  const key = `${family}/${type}`;
  const hit = partsCache.get(key);
  if (hit) return hit;

  let out: TilePart[];
  if (type === 'Gamma' && family !== 'hex') {
    const node = buildSystem(family, 0)['Gamma'];
    out =
      node && node.kind === 'meta'
        ? node.children.map((c) => ({
            type: (c.node as { type: TileTypeId }).type,
            xform: c.xform,
            pts: leafPts(family, (c.node as { type: TileTypeId }).type),
          }))
        : [];
  } else {
    out = [{ type, xform: IDENT, pts: leafPts(family, type) }];
  }
  partsCache.set(key, out);
  return out;
}

/** World-space bounding box of a single-tile widget. */
export function tilePartsBox(parts: readonly TilePart[]): Box {
  const pts: Pt[] = [];
  for (const part of parts) for (const p of part.pts) pts.push(transPt(part.xform, p));
  return boxOfPoints(pts);
}

// ---------------------------------------------------------------------------
// Whole-tiling model
// ---------------------------------------------------------------------------

export interface TileDef {
  readonly type: TileTypeId;
  readonly d: string;
}

export interface TilingModelOptions {
  readonly family: TileFamilyId;
  readonly rootTile: TileTypeId;
  readonly level: number;
  readonly curvy?: boolean;
  /**
   * Each substitution level mirrors the previous one (DESIGN.md §3.4), so the
   * view pre-multiplies `levelMirror(level)` to keep stepping visually stable.
   */
  readonly stabilizeChirality?: boolean;
}

export interface TilingModel {
  readonly family: TileFamilyId;
  readonly rootTile: TileTypeId;
  readonly level: number;
  readonly curvy: boolean;
  readonly root: TileNode;
  readonly instances: readonly TileInstance[];
  /** One `<defs>` outline per distinct leaf type present. */
  readonly defs: readonly TileDef[];
  /** Outer view transform (identity unless chirality stabilization is on). */
  readonly viewTransform: Affine;
  /** Bounds AFTER `viewTransform` — what the camera should fit. */
  readonly bounds: Box;
  readonly tileCount: number;
}

const modelCache = new Map<string, TilingModel>();

/** Memoized `buildSystem` + `flatten` + per-type outline defs. */
export function buildTilingModel(opts: TilingModelOptions): TilingModel {
  const curvy = opts.curvy ?? false;
  const stabilize = opts.stabilizeChirality ?? true;
  const level = Math.max(0, Math.floor(opts.level));
  const key = `${opts.family}/${opts.rootTile}/${level}/${curvy ? 'c' : 's'}/${stabilize ? 'm' : 'r'}`;
  const hit = modelCache.get(key);
  if (hit) return hit;

  const sys = buildSystem(opts.family, level);
  const root = sys[opts.rootTile] ?? sys['Delta'];
  const viewTransform = stabilize ? levelMirror(level) : IDENT;
  const instances = flatten(root);

  const seen = new Set<TileTypeId>();
  const defs: TileDef[] = [];
  for (const inst of instances) {
    if (seen.has(inst.type)) continue;
    seen.add(inst.type);
    defs.push({ type: inst.type, d: tileOutline(opts.family, inst.type, curvy) });
  }

  const model: TilingModel = {
    family: opts.family,
    rootTile: opts.rootTile,
    level,
    curvy,
    root,
    instances,
    defs,
    viewTransform,
    bounds: transformBox(viewTransform, bounds(root, opts.family)),
    tileCount: countTiles(root),
  };
  modelCache.set(key, model);
  return model;
}

/** World transform of one instance including the view transform. */
export function instanceTransform(model: TilingModel, inst: TileInstance): Affine {
  return mul(model.viewTransform, inst.xform);
}

/** Tile-count preview for the level stepper without building the system. */
export function tileCountAt(family: TileFamilyId, rootTile: TileTypeId, level: number): number {
  const sys = buildSystem(family, Math.max(0, Math.floor(level)));
  const root = sys[rootTile] ?? sys['Delta'];
  return countTiles(root);
}

/** Leaf types that actually own connection points under a subset. */
export function tilesWithDots(
  family: TileFamilyId,
  selected: ReadonlySet<number>,
): readonly TileTypeId[] {
  return leafOrder(family).filter(
    (type) => tileConnectionPoints(family, type, selected).length > 0,
  );
}

/** Seams of a tile, filtered to the selected classes (for legends/hit areas). */
export function selectedSeams(
  family: TileFamilyId,
  type: TileTypeId,
  selected?: ReadonlySet<number>,
): readonly MetaEdge[] {
  const all = metaEdges(family, type);
  return selected ? all.filter((s) => selected.has(s.major)) : all;
}
