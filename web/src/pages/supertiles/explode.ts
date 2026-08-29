/**
 * Exploded supertile layout — the geometry behind the Supertiles view.
 *
 * A level-L supertile is not a shape with a pattern inside it: it IS eight
 * smaller supertiles (seven for Gamma) locked together with no gaps, and each
 * of those is eight smaller ones again, all the way down to single spectres.
 * The tiling hides that — at rest the pieces share every interior edge, so the
 * seams cancel out and the whole thing reads as one blob.
 *
 * So this module takes the substitution tree apart in space. Every piece keeps
 * its real transform and is then pushed straight out from its parent's centre
 * by a fraction of its own offset. That is a translation on top of the true
 * placement, so nothing rotates and nothing distorts: `gap = 0` reproduces the
 * exact tiling, and turning `gap` up opens the seams the substitution glued
 * together.
 *
 * Pure geometry — no React, no DOM, testable in node.
 */

import {
  buildSystem,
  countTiles,
  flatten,
  levelMirror,
  mul,
  transPt,
  ttrans,
  type Affine,
  type Pt,
  type TileFamilyId,
  type TileInstance,
  type TileNode,
  type TileTypeId,
} from '../../core';
import { boundaryLoop, decimateLoop } from '../map/glyphs';

/**
 * Deepest level offered. The boundary walk is the cost, not the tile count:
 * measured on this machine, level 6 is ~0.9 s and 57k outline points, while
 * level 7 is ~3.7 s and 243k — past what a slider should ever hand a browser.
 */
export const MAX_EXPLODE_LEVEL = 6;
/** Level 0 is a single tile: there is nothing to take apart below 1. */
export const MIN_EXPLODE_LEVEL = 1;
export const DEFAULT_EXPLODE_LEVEL = 3;

/** How far pieces travel, as a fraction of their offset from the centre. */
export const MIN_GAP = 0;
export const MAX_GAP = 1.5;
export const DEFAULT_GAP = 0.35;

/**
 * How many rounds of nesting come apart: 1 separates a supertile into its
 * children, 2 separates those children as well. Each round multiplies the
 * piece count by ~8, so 3 (≈512 pieces) is where it stops being legible.
 */
export const MIN_DEPTH = 1;
export const MAX_DEPTH = 3;
export const DEFAULT_DEPTH = 1;

/**
 * Each nested round pushes less far than the one above it. Without the
 * falloff the inner gaps quickly dwarf the outer ones and the grouping stops
 * reading; at 0.55 a piece stays comfortably inside its parent's own gap.
 */
const NESTED_GAP_FALLOFF = 0.55;

/**
 * Total outline points across the drawn pieces. A level-6 boundary is 57k
 * points on its own — far past screen resolution — so the budget is shared
 * out and each piece is decimated to its slice of it.
 */
export const DEFAULT_OUTLINE_BUDGET = 48_000;
/** Enough to keep a piece's silhouette honest even when hundreds are drawn. */
const MIN_ISLAND_POINTS = 32;
const MAX_ISLAND_POINTS = 4_000;

/** One placed piece of the hierarchy. */
export interface Island {
  /** Dotted slot path from the root (`''`, `'3'`, `'3.7'`) — a stable key. */
  readonly id: string;
  /** Substitution flavour (Delta, Psi, …) — its label in the rule table. */
  readonly type: TileTypeId;
  /** Slot 0..7 within the parent; -1 for the root. */
  readonly slot: number;
  /** Substitution level of this piece: 0 is a single tile. */
  readonly level: number;
  /** How far below the root this piece sits (the root is 0). */
  readonly depth: number;
  /** Placement in world space, after the push. */
  readonly xform: Affine;
  /**
   * Where the piece sits in the REAL tiling — its placement before any push.
   * Anything computed against the true tiling (the strand lines, the circuit
   * analysis) is built here and then moved by {@link offset}.
   */
  readonly trueXform: Affine;
  /**
   * Exploded position minus true position. Every push is a translation laid
   * on top of the true placement, and translations compose, so a piece's whole
   * displacement — however deeply nested — is this one vector.
   */
  readonly offset: Pt;
  /** Fractal boundary in world space, decimated for drawing. */
  readonly outline: readonly Pt[];
  /** Centre of the piece's box — the push direction and the label anchor. */
  readonly center: Pt;
  /** Single spectres inside this piece. */
  readonly tileCount: number;
  /** The substitution node, for callers that want the tiles inside. */
  readonly node: TileNode;
  /** The pieces this one comes apart into; empty when it is not exploded. */
  readonly children: readonly Island[];
}

export interface ExplodeOptions {
  readonly family?: TileFamilyId;
  readonly rootTile?: TileTypeId;
  /** Substitution level of the ROOT piece. */
  readonly level: number;
  /** 0 reproduces the true tiling; larger values push the pieces apart. */
  readonly gap?: number;
  /** Rounds of nesting to separate (see {@link MAX_DEPTH}). */
  readonly depth?: number;
  /** Total outline points across drawn pieces (see the budget note above). */
  readonly outlineBudget?: number;
}

export interface Box {
  readonly min: Pt;
  readonly max: Pt;
}

export interface ExplodedLayout {
  readonly root: Island;
  /** Every piece including the root, parents before children. */
  readonly all: readonly Island[];
  /** Only the pieces nothing was exploded out of — what actually gets drawn. */
  readonly leaves: readonly Island[];
  readonly tileCount: number;
  /** World box of the exploded scene (wider than the tiling's own bounds). */
  readonly bounds: Box;
  /** Points each drawn piece was allowed, after sharing out the budget. */
  readonly pointsPerIsland: number;
}

const clampInt = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, Math.round(Number.isFinite(n) ? n : lo)));

export const clampExplodeLevel = (n: number): number =>
  clampInt(n, MIN_EXPLODE_LEVEL, MAX_EXPLODE_LEVEL);

export const clampExplodeDepth = (n: number): number => clampInt(n, MIN_DEPTH, MAX_DEPTH);

export function clampGap(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_GAP;
  // Two decimals: fine enough to scrub, short enough to put in a URL.
  return Math.round(Math.min(MAX_GAP, Math.max(MIN_GAP, n)) * 100) / 100;
}

/** Children of a node, or `[]` for a leaf — narrows the union in one place. */
function childrenOf(node: TileNode): readonly { node: TileNode; xform: Affine; pos: number }[] {
  return node.kind === 'meta' ? node.children : [];
}

export function boxOfPoints(pts: readonly Pt[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

const boxCenter = (b: Box): Pt => ({
  x: (b.min.x + b.max.x) / 2,
  y: (b.min.y + b.max.y) / 2,
});

/** Where a node placed by `xform` sits, without keeping its whole outline. */
function placedCenter(node: TileNode, xform: Affine): Pt {
  return boxCenter(boxOfPoints(boundaryLoop(node).map((p) => transPt(xform, p))));
}

interface Placement {
  readonly node: TileNode;
  readonly xform: Affine;
  /** The same placement without any push — the piece's spot in the tiling. */
  readonly trueXform: Affine;
  readonly id: string;
  readonly slot: number;
  readonly depth: number;
  readonly level: number;
}

/**
 * Walk the tree once to decide where every piece goes. Outlines are NOT built
 * here: how finely each one may be drawn depends on how many pieces there
 * turn out to be, which is only known once the walk is done.
 */
function planPlacements(
  root: Placement,
  gap: number,
  explodeDepth: number,
): { readonly order: Placement[]; readonly childrenOfId: Map<string, Placement[]> } {
  const order: Placement[] = [];
  const childrenOfId = new Map<string, Placement[]>();

  const visit = (p: Placement): void => {
    order.push(p);
    const kids = childrenOf(p.node);
    if (p.depth >= explodeDepth || kids.length === 0 || p.level === 0) {
      childrenOfId.set(p.id, []);
      return;
    }
    const center = placedCenter(p.node, p.xform);
    const push = gap * NESTED_GAP_FALLOFF ** p.depth;
    const placed = kids.map((child) => {
      const placedHere = mul(p.xform, child.xform);
      // Push straight out from the parent's centre towards the child's own.
      const at = placedCenter(child.node, placedHere);
      const shift = ttrans((at.x - center.x) * push, (at.y - center.y) * push);
      return {
        node: child.node,
        xform: mul(shift, placedHere),
        trueXform: mul(p.trueXform, child.xform),
        id: p.id === '' ? String(child.pos) : `${p.id}.${child.pos}`,
        slot: child.pos,
        depth: p.depth + 1,
        level: p.level - 1,
      };
    });
    childrenOfId.set(p.id, placed);
    placed.forEach(visit);
  };

  visit(root);
  return { order, childrenOfId };
}

/**
 * Take a supertile apart.
 *
 * The root is placed under {@link levelMirror}: every substitution round
 * mirrors the previous one, so without that compensation the whole scene
 * flips left-to-right each time the level changes.
 */
export function explodeSupertile(opts: ExplodeOptions): ExplodedLayout {
  const family = opts.family ?? 'spectre';
  const rootTile = opts.rootTile ?? 'Delta';
  const level = clampExplodeLevel(opts.level);
  const gap = clampGap(opts.gap ?? DEFAULT_GAP);
  // Nesting cannot outrun the hierarchy: a level-2 supertile has two rounds.
  const depth = Math.min(clampExplodeDepth(opts.depth ?? DEFAULT_DEPTH), level);
  const budget = Math.max(1_000, opts.outlineBudget ?? DEFAULT_OUTLINE_BUDGET);

  const node = buildSystem(family, level)[rootTile];
  const view = levelMirror(level);
  const { order, childrenOfId } = planPlacements(
    { node, xform: view, trueXform: view, id: '', slot: -1, depth: 0, level },
    gap,
    depth,
  );

  const drawnCount = order.filter((p) => (childrenOfId.get(p.id) ?? []).length === 0).length;
  const pointsPerIsland = Math.min(
    MAX_ISLAND_POINTS,
    Math.max(MIN_ISLAND_POINTS, Math.floor(budget / Math.max(1, drawnCount))),
  );

  // Build bottom-up so a piece can hold its finished children.
  const built = new Map<string, Island>();
  for (let i = order.length - 1; i >= 0; i--) {
    const p = order[i];
    const kids = (childrenOfId.get(p.id) ?? []).map((c) => built.get(c.id)!);
    const loop = boundaryLoop(p.node);
    // Only drawn pieces pay for detail; a parent's outline is bookkeeping.
    const outline = (kids.length === 0 ? decimateLoop(loop, pointsPerIsland) : loop).map((q) =>
      transPt(p.xform, q),
    );
    built.set(p.id, {
      id: p.id,
      type: p.node.type,
      slot: p.slot,
      level: p.level,
      depth: p.depth,
      xform: p.xform,
      trueXform: p.trueXform,
      offset: { x: p.xform[2] - p.trueXform[2], y: p.xform[5] - p.trueXform[5] },
      outline,
      center: boxCenter(boxOfPoints(outline)),
      tileCount: countTiles(p.node),
      node: p.node,
      children: kids,
    });
  }

  const root = built.get('')!;
  const all = order.map((p) => built.get(p.id)!);
  const leaves = all.filter((island) => island.children.length === 0);
  const pts: Pt[] = [];
  for (const island of leaves) pts.push(...island.outline);

  return {
    root,
    all,
    leaves,
    tileCount: root.tileCount,
    bounds: boxOfPoints(pts.length ? pts : root.outline),
    pointsPerIsland,
  };
}

/** The spectres inside one piece, already placed in world space. */
export function islandTiles(island: Island): readonly TileInstance[] {
  return flatten(island.node, island.xform);
}

/** The same tiles where the REAL tiling puts them, before the piece was pushed. */
export function islandTilesUnexploded(island: Island): readonly TileInstance[] {
  return flatten(island.node, island.trueXform);
}
