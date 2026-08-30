/**
 * Strand-line geometry for The Infinite Map (BIGMAP stage 3, part 1).
 *
 * The map draws the strand LINES themselves — not circuits, not colours. That
 * is possible at any depth because the geometry is purely LOCAL: a leaf tile's
 * chords are decided by the active edge subset plus that tile type's chosen
 * matching, and nothing else. No tracing, no welding, no global identity.
 *
 * So this module bakes one little chord set per leaf type of the family —
 * `leafOrder(family)` order, which is precisely the engine's leaf `type` byte
 * — into a texture-shaped table the instanced renderer can vertex-pull, giving
 * one extra draw call for the entire viewport regardless of tile count.
 *
 * The chord geometry itself is NOT reimplemented here: `localChords` (core's
 * `circuits.ts`, the same function `collectSegments`/`analyze` use) resolves
 * `connectionPoints` under the current `EdgeContracts` and pairs them with
 * `enumerateMatchings`. Lines drawn on the map are therefore identical, point
 * for point, to the lines the rooted Explorer would draw for the same
 * configuration.
 *
 * Wire format (mirrors the glyph table in `glyphs.ts`): an RGBA32F image with
 * one ROW per leaf type and `vertsPerInstance = 2 * maxChords` COLUMNS. Texel
 * `(vertexId, typeByte)` is `(x, y, valid, 0)` in tile-local coordinates;
 * `valid = 0` marks padding, which the vertex shader pushes outside the clip
 * volume so the primitive is discarded. Every leaf type shares one row length
 * so ANY mix of types is still a single `drawArraysInstanced(LINES, …)`.
 *
 * Pure module (core only): no DOM, no GL — the packing is unit-testable.
 */

import {
  DEFAULT_CONTRACTS,
  LEAF_ORDER,
  leafOrder,
  leafPts,
  localChords,
  type EdgeContracts,
  type Segment,
  type TileFamilyId,
} from '../../core';

/** Rows of a SPECTRE chord table; a family's own count is `table.rows`. */
export const CHORD_ROWS = LEAF_ORDER.length;

/** Floats per packed chord vertex: x, y, valid, (pad). */
export const CHORD_STRIDE = 4;

export interface LeafChordTable {
  /** Family whose leaf order the rows follow (= the engine's type bytes). */
  readonly family: TileFamilyId;
  /** Vertices per instance = `2 * maxChords`; 0 when nothing is drawable. */
  readonly vertsPerInstance: number;
  /** `leafOrder(family).length` (one row per leaf type byte). */
  readonly rows: number;
  /**
   * Farthest any chord endpoint of any leaf type sits from its tile's emitted
   * position, in world units — what bounds the walk's neighbourhood probe.
   * Derived from the family's leaf outlines (a chord endpoint is a convex
   * combination of outline vertices), so the hat/turtle Gamma2 shape swap is
   * covered automatically.
   */
  readonly reach: number;
  /** RGBA32F payload, `rows * vertsPerInstance * CHORD_STRIDE` floats. */
  readonly data: Float32Array;
  /** Tile-local chord segments per leaf type, in `leafOrder(family)` order. */
  readonly segments: readonly (readonly Segment[])[];
  /** Largest chord count over the leaf types (drives `vertsPerInstance`). */
  readonly maxChords: number;
  /** Total chords across all leaf types (HUD / tests). */
  readonly chordCount: number;
  /** Leaf types that contribute no chords at all (odd or empty point sets). */
  readonly emptyTypes: readonly string[];
}

const reachCache = new Map<TileFamilyId, number>();

/**
 * Max vertex radius over every leaf outline of the family — the family's
 * chord reach (see {@link LeafChordTable.reach}).
 */
export function familyChordReach(family: TileFamilyId): number {
  const hit = reachCache.get(family);
  if (hit !== undefined) return hit;
  let reach = 0;
  for (const type of leafOrder(family)) {
    for (const p of leafPts(family, type)) {
      reach = Math.max(reach, Math.hypot(p.x, p.y));
    }
  }
  reachCache.set(family, reach);
  return reach;
}

const emptyTableCache = new Map<TileFamilyId, LeafChordTable>();

/** The family's frozen "no drawable chords" table. */
export function emptyChordTable(family: TileFamilyId): LeafChordTable {
  const hit = emptyTableCache.get(family);
  if (hit) return hit;
  const order = leafOrder(family);
  const table: LeafChordTable = Object.freeze({
    family,
    vertsPerInstance: 0,
    rows: order.length,
    reach: familyChordReach(family),
    data: new Float32Array(0),
    segments: Object.freeze(order.map(() => Object.freeze([]) as readonly Segment[])),
    maxChords: 0,
    chordCount: 0,
    emptyTypes: Object.freeze([...order]) as readonly string[],
  });
  emptyTableCache.set(family, table);
  return table;
}

/**
 * Build the per-leaf-type chord table for one configuration.
 *
 * `matching` is the FULL `enumerateMatchings` index per leaf, in
 * `leafOrder(family)` order — byte-identical to `ExplorerState.matching`, so
 * the Explorer's vector and the map's combo-string decode feed the same input.
 * Tiles whose selected connection count is odd (or below 2) contribute
 * nothing, exactly as `localChords` decides for the rooted analysis.
 */
export function buildLeafChordTable(
  family: TileFamilyId,
  subset: readonly number[],
  matching: readonly number[],
  contracts: EdgeContracts = DEFAULT_CONTRACTS,
): LeafChordTable {
  const selected = new Set(subset);
  if (selected.size === 0) return emptyChordTable(family);

  const order = leafOrder(family);
  const rows = order.length;
  const segments: (readonly Segment[])[] = [];
  const emptyTypes: string[] = [];
  let maxChords = 0;
  let chordCount = 0;
  for (let i = 0; i < rows; i++) {
    const type = order[i];
    const local = localChords(family, type, selected, matching[i] ?? 0, contracts);
    segments.push(local);
    if (local.length === 0) emptyTypes.push(type);
    if (local.length > maxChords) maxChords = local.length;
    chordCount += local.length;
  }
  if (maxChords === 0) return emptyChordTable(family);

  const vertsPerInstance = maxChords * 2;
  const data = new Float32Array(rows * vertsPerInstance * CHORD_STRIDE);
  for (let row = 0; row < rows; row++) {
    const local = segments[row];
    const base = row * vertsPerInstance * CHORD_STRIDE;
    for (let c = 0; c < local.length; c++) {
      const [a, b] = local[c];
      const at = base + c * 2 * CHORD_STRIDE;
      data[at] = a.x;
      data[at + 1] = a.y;
      data[at + 2] = 1; // valid
      data[at + 4] = b.x;
      data[at + 5] = b.y;
      data[at + 6] = 1; // valid
    }
    // Remaining texels stay (0, 0, 0, 0): valid = 0 ⇒ discarded by the shader.
  }

  return {
    family,
    vertsPerInstance,
    rows,
    reach: familyChordReach(family),
    data,
    segments,
    maxChords,
    chordCount,
    emptyTypes,
  };
}

/**
 * Memo key for a chord table. Contracts participate because they slide the
 * connection points along their seams (they never reorder them, so the
 * matching indices stay meaningful).
 */
export function chordTableKey(
  family: TileFamilyId,
  subset: readonly number[],
  matching: readonly number[],
  contracts?: EdgeContracts,
): string {
  const ct = contracts
    ? Object.entries(contracts)
        .map(([k, v]) => `${k}:${v?.minor}@${v?.t}`)
        .sort()
        .join(';')
    : '';
  return `${family}|${[...subset].sort((a, b) => a - b).join('')}|${matching.join('.')}|${ct}`;
}
