/**
 * The Top-down page's board: the boards a family, a start type and a list of
 * substitution steps produce, what to draw for each tile, picking tiles by
 * point and by lasso, and the outline of every previous-step tile's children.
 *
 * Pure — no React, no DOM.
 */

import {
  TILE_NAMES,
  leafPts,
  parentId,
  startBoard,
  substituteBoard,
  topDownLeaves,
  transPt,
  zApply,
  zKey,
  zLeafPts,
  zToAffine,
  zX,
  zY,
  type Affine,
  type Pt,
  type TileTypeId,
  type TopDownFamily,
  type TopDownTile,
} from '../../core';

/** A step substitutes the whole board (`'*'`) or the tiles with these slot paths. */
export type Step = '*' | readonly string[];

/** Past this many tiles a step is refused: the SVG stops being usable. */
export const MAX_BOARD_TILES = 20_000;

export const DEFAULT_FAMILY: TopDownFamily = 'spectre';
export const DEFAULT_TYPE: TileTypeId = 'Delta';
export const DEFAULT_STEPS: readonly Step[] = ['*'];

/** Child count per type: what substituting a tile adds. */
export function childCount(type: TileTypeId): number {
  return type === 'Gamma' ? 7 : 8;
}

/** Every board along the way: `boards[0]` is the single start tile. */
export function boardsFor(
  family: TopDownFamily,
  type: TileTypeId,
  steps: readonly Step[],
): TopDownTile[][] {
  const boards: TopDownTile[][] = [startBoard(type)];
  for (const step of steps) {
    const prev = boards[boards.length - 1];
    const picked = step === '*' ? null : new Set(step);
    boards.push(substituteBoard(prev, picked ? (t) => picked.has(t.id) : undefined, family));
  }
  return boards;
}

export interface DrawLeaf {
  readonly type: TileTypeId;
  readonly xform: Affine;
}

export interface DrawTile {
  readonly id: string;
  readonly type: TileTypeId;
  readonly leaves: readonly DrawLeaf[];
  /** Leaf outlines in world coordinates, for picking. */
  readonly polys: readonly (readonly Pt[])[];
  readonly centre: Pt;
}

export function drawTiles(board: readonly TopDownTile[], family: TopDownFamily): DrawTile[] {
  return board.map((tile) => {
    const leaves = topDownLeaves([tile], family).map((l) => ({ type: l.type, xform: zToAffine(l.z) }));
    const polys = leaves.map((l) => leafPts(family, l.type).map((p) => transPt(l.xform, p)));
    let x = 0;
    let y = 0;
    let n = 0;
    for (const poly of polys) {
      for (const p of poly) {
        x += p.x;
        y += p.y;
        n++;
      }
    }
    return { id: tile.id, type: tile.type, leaves, polys, centre: { x: x / n, y: y / n } };
  });
}

export function boundsOf(tiles: readonly DrawTile[]): { min: Pt; max: Pt } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const t of tiles) {
    for (const poly of t.polys) {
      for (const p of poly) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
  }
  if (!Number.isFinite(minX)) return { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } };
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

/** Even-odd ray test. */
export function pointInPolygon(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function tileAt(tiles: readonly DrawTile[], p: Pt): DrawTile | null {
  for (const t of tiles) if (t.polys.some((poly) => pointInPolygon(p, poly))) return t;
  return null;
}

/** Slot paths of the tiles whose centre lies inside the lasso. */
export function tilesInLasso(tiles: readonly DrawTile[], lasso: readonly Pt[]): string[] {
  if (lasso.length < 3) return [];
  return tiles.filter((t) => pointInPolygon(t.centre, lasso)).map((t) => t.id);
}

export interface SupertileOutline {
  /** Slot path of the previous-step tile these children replaced. */
  readonly id: string;
  /** SVG path of the edges its children do not share with each other. */
  readonly d: string;
}

/**
 * The boundary of each group of siblings: every leaf edge is keyed by its two
 * exact endpoints, and an edge that occurs once within its group is on the
 * group's outline.
 */
export function supertileOutlines(board: readonly TopDownTile[], family: TopDownFamily): SupertileOutline[] {
  const groups = new Map<string, TopDownTile[]>();
  for (const tile of board) {
    const pid = parentId(tile.id);
    (groups.get(pid) ?? groups.set(pid, []).get(pid)!).push(tile);
  }
  const out: SupertileOutline[] = [];
  for (const [id, tiles] of groups) {
    const edges = new Map<string, { a: Pt; b: Pt; n: number }>();
    for (const leaf of topDownLeaves(tiles, family)) {
      const w = zLeafPts(family, leaf.type).map((p) => zApply(leaf.z, p));
      for (let i = 0; i < w.length; i++) {
        const a = w[i];
        const b = w[(i + 1) % w.length];
        const ka = zKey(a);
        const kb = zKey(b);
        const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
        const hit = edges.get(key);
        if (hit) hit.n++;
        else edges.set(key, { a: { x: zX(a), y: zY(a) }, b: { x: zX(b), y: zY(b) }, n: 1 });
      }
    }
    let d = '';
    for (const e of edges.values()) {
      if (e.n === 1) d += `M${e.a.x} ${e.a.y}L${e.b.x} ${e.b.y}`;
    }
    out.push({ id, d });
  }
  return out;
}

// ---------------------------------------------------------------------------
// URL
// ---------------------------------------------------------------------------

export interface TopDownUrlState {
  readonly family: TopDownFamily;
  readonly type: TileTypeId;
  readonly steps: readonly Step[];
}

/** `#family=hex&type=Delta&steps=*;1,3.0,7` — steps separated by `;`, slot paths by `,`. */
export function stateToHash(state: TopDownUrlState): string {
  const steps = state.steps.map((s) => (s === '*' ? '*' : s.join(','))).join(';');
  return `#family=${state.family}&type=${state.type}&steps=${steps}`;
}

export function hashToState(hash: string): TopDownUrlState {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const family: TopDownFamily = params.get('family') === 'hex' ? 'hex' : DEFAULT_FAMILY;
  const raw = params.get('type') as TileTypeId | null;
  const type = raw && TILE_NAMES.includes(raw) ? raw : DEFAULT_TYPE;
  const stepsRaw = params.get('steps');
  if (stepsRaw === null) return { family, type, steps: DEFAULT_STEPS };
  if (stepsRaw === '') return { family, type, steps: [] };
  const steps = stepsRaw
    .split(';')
    .map((s): Step => (s === '*' ? '*' : s.split(',').filter((id) => /^\d+(\.\d+)*$/.test(id))));
  return { family, type, steps };
}

// ---------------------------------------------------------------------------
// Characteristic polynomial (Faddeev–LeVerrier, exact in integers)
// ---------------------------------------------------------------------------

/** Coefficients `[1, c1, ..., cn]` of `det(lambda I - M)`, highest power first. */
export function charPoly(M: readonly (readonly number[])[]): number[] {
  const n = M.length;
  const mul = (A: number[][], B: readonly (readonly number[])[]): number[][] =>
    A.map((r) => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0)));
  const coeffs = [1];
  let Mk: number[][] = M.map((r) => r.map(() => 0)); // M_0 = 0
  for (let k = 1; k <= n; k++) {
    const c = coeffs[k - 1];
    const prev = Mk.map((r, i) => r.map((x, j) => x + (i === j ? c : 0)));
    Mk = mul(prev, M);
    let trace = 0;
    for (let i = 0; i < n; i++) trace += Mk[i][i];
    coeffs.push(-trace / k + 0); // + 0 turns -0 into 0
  }
  return coeffs;
}

const SUPERSCRIPT = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

/** `λ⁴ − 8λ² + 1` from `[1, 0, -8, 0, 1]`. */
export function formatPoly(coeffs: readonly number[], v = 'λ'): string {
  const n = coeffs.length - 1;
  let out = '';
  coeffs.forEach((c, i) => {
    if (c === 0) return;
    const pow = n - i;
    const mag = Math.abs(c);
    const term = pow === 0 ? String(mag) : `${mag === 1 ? '' : mag}${v}${pow === 1 ? '' : SUPERSCRIPT[pow]}`;
    if (out === '') out = c < 0 ? `−${term}` : term;
    else out += c < 0 ? ` − ${term}` : ` + ${term}`;
  });
  return out || '0';
}
