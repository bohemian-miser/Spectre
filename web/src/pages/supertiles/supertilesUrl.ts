/**
 * Hash-URL codec for the Supertiles view — `#/supertiles?t=&lv=&gap=&d=&…`.
 *
 * Same shape and discipline as `pages/map/mapUrl.ts`: a pure string codec so
 * the round trip is testable in node, with the React side supplying
 * `location.hash` and `history.replaceState`. Encoding is CANONICAL (stable
 * under encode→decode→encode) so the page can suppress no-op `replaceState`
 * calls and stay back/forward safe, and every parameter is omitted at its
 * default so a link only carries what was actually changed.
 */

import { TILE_NAMES, type TileTypeId } from '../../core';
import {
  DEFAULT_DEPTH,
  DEFAULT_EXPLODE_LEVEL,
  DEFAULT_GAP,
  clampExplodeDepth,
  clampExplodeLevel,
  clampGap,
} from './explode';

export const SUPERTILES_ROUTE = '#/supertiles';

export const DEFAULT_ROOT_TILE: TileTypeId = 'Delta';

export interface SupertilesUrlState {
  /** Which of the nine flavours is taken apart. */
  readonly rootTile: TileTypeId;
  /** Substitution level of the whole — the "layer number". */
  readonly level: number;
  /** How far the pieces are pushed apart (0 = the true tiling). */
  readonly gap: number;
  /** Rounds of nesting separated. */
  readonly depth: number;
  /** Draw the individual spectres inside each piece (`tl=0` when off). */
  readonly showTiles: boolean;
  /** Name each piece with its flavour (`lb=0` when off). */
  readonly showLabels: boolean;
}

export const DEFAULT_SUPERTILES_STATE: SupertilesUrlState = {
  rootTile: DEFAULT_ROOT_TILE,
  level: DEFAULT_EXPLODE_LEVEL,
  gap: DEFAULT_GAP,
  depth: DEFAULT_DEPTH,
  showTiles: true,
  showLabels: true,
};

/** Only the nine substitution flavours are addressable. */
export function normalizeRootTile(raw: string | null): TileTypeId {
  if (!raw) return DEFAULT_ROOT_TILE;
  const match = TILE_NAMES.find((n) => n.toLowerCase() === raw.toLowerCase());
  return (match as TileTypeId | undefined) ?? DEFAULT_ROOT_TILE;
}

export function encodeSupertilesQuery(state: SupertilesUrlState): string {
  const q = new URLSearchParams();
  const d = DEFAULT_SUPERTILES_STATE;
  const rootTile = normalizeRootTile(state.rootTile);
  const level = clampExplodeLevel(state.level);
  const gap = clampGap(state.gap);
  const depth = clampExplodeDepth(state.depth);
  if (rootTile !== d.rootTile) q.set('t', rootTile);
  if (level !== d.level) q.set('lv', String(level));
  if (gap !== d.gap) q.set('gap', String(gap));
  if (depth !== d.depth) q.set('d', String(depth));
  if (!state.showTiles) q.set('tl', '0');
  if (!state.showLabels) q.set('lb', '0');
  return q.toString();
}

export function decodeSupertilesQuery(query: string): SupertilesUrlState {
  const q = new URLSearchParams(query.replace(/^[?#]/, ''));
  const num = (key: string): number | null => {
    const raw = q.get(key);
    if (raw === null || raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
  const lv = num('lv');
  const gap = num('gap');
  const depth = num('d');
  const tl = q.get('tl');
  const lb = q.get('lb');
  return {
    rootTile: normalizeRootTile(q.get('t')),
    level: lv === null ? DEFAULT_SUPERTILES_STATE.level : clampExplodeLevel(lv),
    gap: gap === null ? DEFAULT_SUPERTILES_STATE.gap : clampGap(gap),
    depth: depth === null ? DEFAULT_SUPERTILES_STATE.depth : clampExplodeDepth(depth),
    showTiles: !(tl === '0' || tl === 'false'),
    showLabels: !(lb === '0' || lb === 'false'),
  };
}

export function supertilesStateToHash(state: SupertilesUrlState): string {
  const query = encodeSupertilesQuery(state);
  return query ? `${SUPERTILES_ROUTE}?${query}` : SUPERTILES_ROUTE;
}

/** Decode from `#/supertiles?…`, `?…` or a bare query; missing fields default. */
export function hashToSupertilesState(hash: string): SupertilesUrlState {
  const raw = hash.replace(/^[#?]/, '');
  const at = raw.indexOf('?');
  if (at >= 0) return decodeSupertilesQuery(raw.slice(at + 1));
  return raw === '' || raw.startsWith('/')
    ? { ...DEFAULT_SUPERTILES_STATE }
    : decodeSupertilesQuery(raw);
}

/** Two states are "the same URL" when they encode identically. */
export function sameSupertilesState(a: SupertilesUrlState, b: SupertilesUrlState): boolean {
  return encodeSupertilesQuery(a) === encodeSupertilesQuery(b);
}
