/**
 * The Top-down page's small pieces: its URL, picking tiles by point and by
 * lasso, and the characteristic polynomial it prints.
 *
 * Pure — no React, no DOM.
 */

import { TILE_NAMES, type Pt, type TileTypeId, type TopDownFamily } from '../../core';
import type { Placed } from './world';

export const DEFAULT_FAMILY: TopDownFamily = 'hex';
export const DEFAULT_TYPE: TileTypeId = 'Delta';
export const DEFAULT_LEVEL = 2;
export const MAX_START_LEVEL = 4;

// ---------------------------------------------------------------------------
// URL
// ---------------------------------------------------------------------------

export interface TopDownUrlState {
  readonly family: TopDownFamily;
  readonly type: TileTypeId;
  /** The level of the supertile the map starts as. */
  readonly level: number;
}

/** `#family=hex&type=Delta&level=2`. */
export function stateToHash(state: TopDownUrlState): string {
  return `#family=${state.family}&type=${state.type}&level=${state.level}`;
}

export function hashToState(hash: string): TopDownUrlState {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const f = params.get('family');
  const family: TopDownFamily = f === 'hex' || f === 'spectre' ? f : DEFAULT_FAMILY;
  const raw = params.get('type') as TileTypeId | null;
  const type = raw && TILE_NAMES.includes(raw) ? raw : DEFAULT_TYPE;
  const n = Number(params.get('level'));
  const level = params.has('level') && Number.isInteger(n) && n >= 0 && n <= MAX_START_LEVEL ? n : DEFAULT_LEVEL;
  return { family, type, level };
}

// ---------------------------------------------------------------------------
// Picking
// ---------------------------------------------------------------------------

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

export function tileAt(tiles: Iterable<Placed>, p: Pt): Placed | null {
  for (const t of tiles) {
    if (p.x < t.min.x || p.x > t.max.x || p.y < t.min.y || p.y > t.max.y) continue;
    if (t.leaves.some((l) => pointInPolygon(p, l.poly))) return t;
  }
  return null;
}

/** Slot paths of the tiles whose centre lies inside the lasso. */
export function tilesInLasso(tiles: Iterable<Placed>, lasso: readonly Pt[]): string[] {
  if (lasso.length < 3) return [];
  const out: string[] = [];
  for (const t of tiles) if (pointInPolygon(t.centre, lasso)) out.push(t.tile.id);
  return out;
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
