/**
 * Hash-URL codec for The Infinite Map —
 * `#/map?seed=&cx=&cy=&z=&budget=&ln=&e=&c=`.
 *
 * Same shape as `lib/urlState.ts` for the explorer: a pure string codec so the
 * round-trip property is testable in node, with the React side supplying
 * `location.hash` / `history.replaceState`. Encoding is CANONICAL (stable
 * under encode→decode→encode) so the page can suppress no-op `replaceState`
 * calls and stay back/forward safe.
 *
 * `e` / `c` are byte-compatible with the Explorer's own edge-rule and
 * combination-string parameters (`core/serialize.ts`), so a rule copied from
 * the stats page or a shared Explorer link means the same thing here.
 */

import { edgesToSubset, subsetFromString, subsetToEdges, subsetToString } from '../../core';
import { DEFAULT_SCALE, clampScale } from './camera';

/** Canonicalize an edge list (dedup + sort) through the bitmask form. */
const edgesToMask = (edges: readonly number[]): number =>
  edgesToSubset(edges.filter((n) => Number.isInteger(n) && n >= 0 && n <= 9));

export const MAP_ROUTE = '#/map';

export interface MapUrlState {
  readonly seed: number;
  readonly cx: number;
  readonly cy: number;
  /** CSS px per world unit (the camera zoom). */
  readonly scale: number;
  readonly budget: number;
  /**
   * Strand-line fields, ADDITIVE: optional on input (a pre-stage-3 state
   * object stays assignable and encodes byte-identically), always present on
   * anything `decodeMapQuery` returns.
   */
  /** Draw the strand lines (default OFF — the map opens as bare tiles). */
  readonly lines?: boolean;
  /** Selected edge classes, sorted (the strand rule). */
  readonly subset?: readonly number[];
  /** Combination string: one non-crossing matching digit per leaf. */
  readonly combo?: string;
}

/** Instance-budget presets offered by the selector. */
export const MAP_BUDGETS: readonly number[] = [50_000, 100_000, 250_000, 500_000, 1_000_000];
export const DEFAULT_BUDGET = 100_000;
export const MIN_BUDGET = 10_000;
export const MAX_BUDGET = 1_000_000;

/**
 * Default strand rule. `2578` is a valid subset (every tile pairs up) and
 * `0100101100` is the CSV/notebook-verified combination that the stats page
 * and `docs/BIGMAP_INVESTIGATION.md` §4 both use, so switching lines on shows
 * a configuration with a known global answer rather than an arbitrary one.
 */
export const DEFAULT_SUBSET: readonly number[] = [2, 5, 7, 8];
export const DEFAULT_COMBO = '0100101100';
/** Combination strings are one digit per leaf type (`LEAF_ORDER.length`). */
export const COMBO_LENGTH = 10;

export const DEFAULT_MAP_STATE: MapUrlState = {
  seed: 1,
  cx: 0,
  cy: 0,
  scale: DEFAULT_SCALE,
  budget: DEFAULT_BUDGET,
  lines: false,
  subset: DEFAULT_SUBSET,
  combo: DEFAULT_COMBO,
};

/** Keep only base-36 digits and pad/trim to `COMBO_LENGTH`. */
export function normalizeCombo(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^0-9a-z]/g, '')
    .slice(0, COMBO_LENGTH);
  return cleaned.padEnd(COMBO_LENGTH, '0');
}

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
  // Line params are additive: omitted while everything is at its default, so
  // pre-stage-3 links keep encoding byte-identically.
  const lines = state.lines ?? false;
  const subset = subsetToString(edgesToMask(state.subset ?? DEFAULT_SUBSET));
  const combo = normalizeCombo(state.combo ?? DEFAULT_COMBO);
  const defaultSubset = subsetToString(edgesToMask(DEFAULT_SUBSET));
  if (lines) q.set('ln', '1');
  if (lines || subset !== defaultSubset) q.set('e', subset);
  if (lines || combo !== DEFAULT_COMBO) q.set('c', combo);
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
  const lnRaw = q.get('ln');
  const eRaw = q.get('e');
  const cRaw = q.get('c');
  return {
    seed: seedRaw === null ? DEFAULT_MAP_STATE.seed : Math.floor(seedRaw) >>> 0,
    cx: cx ?? DEFAULT_MAP_STATE.cx,
    cy: cy ?? DEFAULT_MAP_STATE.cy,
    scale: z === null ? DEFAULT_MAP_STATE.scale : clampScale(z),
    budget: budget === null ? DEFAULT_MAP_STATE.budget : clampBudget(budget),
    lines: lnRaw === null ? DEFAULT_MAP_STATE.lines : lnRaw === '1' || lnRaw === 'true',
    subset: eRaw === null ? DEFAULT_MAP_STATE.subset : subsetToEdges(subsetFromString(eRaw)),
    combo: cRaw === null ? DEFAULT_MAP_STATE.combo : normalizeCombo(cRaw),
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
