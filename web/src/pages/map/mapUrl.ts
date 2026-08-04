/**
 * Hash-URL codec for The Infinite Map — `#/map?seed=&cx=&cy=&z=&budget=`.
 *
 * Same shape as `lib/urlState.ts` for the explorer: a pure string codec so the
 * round-trip property is testable in node, with the React side supplying
 * `location.hash` / `history.replaceState`. Encoding is CANONICAL (stable
 * under encode→decode→encode) so the page can suppress no-op `replaceState`
 * calls and stay back/forward safe.
 */

import { DEFAULT_SCALE, clampScale } from './camera';

export const MAP_ROUTE = '#/map';

export interface MapUrlState {
  readonly seed: number;
  readonly cx: number;
  readonly cy: number;
  /** CSS px per world unit (the camera zoom). */
  readonly scale: number;
  readonly budget: number;
}

/** Instance-budget presets offered by the selector. */
export const MAP_BUDGETS: readonly number[] = [50_000, 100_000, 250_000, 500_000, 1_000_000];
export const DEFAULT_BUDGET = 100_000;
export const MIN_BUDGET = 10_000;
export const MAX_BUDGET = 1_000_000;

export const DEFAULT_MAP_STATE: MapUrlState = {
  seed: 1,
  cx: 0,
  cy: 0,
  scale: DEFAULT_SCALE,
  budget: DEFAULT_BUDGET,
};

/** World coordinates: fixed 3 decimals (0.4 px at max zoom), canonicalized. */
function fmtCoord(n: number): string {
  return String(Number(n.toFixed(3)));
}

/** Zoom: 5 significant digits, canonicalized through Number → String. */
function fmtScale(n: number): string {
  return String(Number(n.toPrecision(5)));
}

export function clampBudget(budget: number): number {
  if (!Number.isFinite(budget)) return DEFAULT_BUDGET;
  return Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, Math.round(budget)));
}

export function encodeMapQuery(state: MapUrlState): string {
  const q = new URLSearchParams();
  q.set('seed', String(Math.floor(state.seed) >>> 0));
  q.set('cx', fmtCoord(state.cx));
  q.set('cy', fmtCoord(state.cy));
  q.set('z', fmtScale(clampScale(state.scale)));
  q.set('budget', String(clampBudget(state.budget)));
  return q.toString();
}

export function decodeMapQuery(query: string): MapUrlState {
  const q = new URLSearchParams(query.replace(/^[?#]/, ''));
  const num = (key: string): number | null => {
    const raw = q.get(key);
    if (raw === null || raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
  const seedRaw = num('seed');
  const cx = num('cx');
  const cy = num('cy');
  const z = num('z');
  const budget = num('budget');
  return {
    seed: seedRaw === null ? DEFAULT_MAP_STATE.seed : Math.floor(seedRaw) >>> 0,
    cx: cx ?? DEFAULT_MAP_STATE.cx,
    cy: cy ?? DEFAULT_MAP_STATE.cy,
    scale: z === null ? DEFAULT_MAP_STATE.scale : clampScale(z),
    budget: budget === null ? DEFAULT_MAP_STATE.budget : clampBudget(budget),
  };
}

/** Full hash for a state, e.g. `#/map?seed=1&cx=0&cy=0&z=36&budget=100000`. */
export function mapStateToHash(state: MapUrlState): string {
  return `${MAP_ROUTE}?${encodeMapQuery(state)}`;
}

/** Decode from `#/map?…`, `?…` or a bare query; missing fields use defaults. */
export function hashToMapState(hash: string): MapUrlState {
  const raw = hash.replace(/^[#?]/, '');
  const at = raw.indexOf('?');
  if (at >= 0) return decodeMapQuery(raw.slice(at + 1));
  // A route-only hash (`#/map`) carries no state; anything else is a query
  // (the same leniency as lib/urlState's hashToState).
  return raw === '' || raw.startsWith('/') ? { ...DEFAULT_MAP_STATE } : decodeMapQuery(raw);
}

/** Two states are "the same URL" when they encode identically. */
export function sameMapState(a: MapUrlState, b: MapUrlState): boolean {
  return encodeMapQuery(a) === encodeMapQuery(b);
}
