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

import {
  TILE_NAMES,
  comboToMatchingIndices,
  decodeContracts,
  encodeContracts,
  leafOrder,
  normalizeMatching,
  subsetFromString,
  subsetToEdges,
  subsetToString,
  edgesToSubset,
  type EdgeContracts,
  type TileTypeId,
} from '../../core';
import { DEFAULT_SHARE, defaultRule, ruleFromShare, ruleShare } from '../../lib/strandRule';
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

/** The tile families whose supertiles the page takes apart. */
export type SupertilesFamily = 'hex' | 'spectre';

export interface SupertilesUrlState {
  /** Hexagons or spectres (`f=hex`; spectres when absent). */
  readonly family: SupertilesFamily;
  /** Which of the nine types is taken apart. */
  readonly rootTile: TileTypeId;
  /** Substitution level of the whole. */
  readonly level: number;
  /** How far the pieces are pushed apart (0 = the true tiling). */
  readonly gap: number;
  /** Rounds of nesting separated. */
  readonly depth: number;
  /** Draw the individual tiles inside each piece (`tl=0` when off). */
  readonly showTiles: boolean;
  /** Name each piece with its type (`lb=0` when off). */
  readonly showLabels: boolean;
  /** Draw the strands and analyse the supertile's circuits (`ln=1`). */
  readonly lines: boolean;
  /** Selected seam classes, sorted (the strand rule). */
  readonly subset: readonly number[];
  /**
   * Matching index per leaf, in `leafOrder(family)`. Stored as the vector
   * because the sliders can reach matchings no combination string names; the
   * codec writes `c=023468-111000100` when one exists and `e=` with `m=` when
   * it does not, as the Explorer's does.
   */
  readonly matching: readonly number[];
  /** Seam contracts, omitted when every class is at its default. */
  readonly contracts?: EdgeContracts;
}

/** Keep only base-36 digits and pad/trim to `length`. */
export function normalizeCombo(raw: string, length: number): string {
  return raw
    .toLowerCase()
    .replace(/[^0-9a-z]/g, '')
    .slice(0, length)
    .padEnd(length, '0');
}

/** Canonicalize an edge list (dedup + sort) through the bitmask form. */
const edgesToMask = (edges: readonly number[]): number =>
  edgesToSubset(edges.filter((n) => Number.isInteger(n) && n >= 0 && n <= 9));

/** The page as it opens for a family: its usual rule, lines off. */
export function defaultSupertilesState(family: SupertilesFamily): SupertilesUrlState {
  const rule = defaultRule(family);
  return {
    family,
    rootTile: DEFAULT_ROOT_TILE,
    level: DEFAULT_EXPLODE_LEVEL,
    gap: DEFAULT_GAP,
    depth: DEFAULT_DEPTH,
    showTiles: true,
    showLabels: true,
    lines: false,
    subset: rule.subset,
    matching: rule.matching,
  };
}

export const DEFAULT_SUPERTILES_STATE: SupertilesUrlState = defaultSupertilesState('spectre');

/** Only the nine substitution types are addressable. */
export function normalizeRootTile(raw: string | null): TileTypeId {
  if (!raw) return DEFAULT_ROOT_TILE;
  const match = TILE_NAMES.find((n) => n.toLowerCase() === raw.toLowerCase());
  return (match as TileTypeId | undefined) ?? DEFAULT_ROOT_TILE;
}

export function encodeSupertilesQuery(state: SupertilesUrlState): string {
  const q = new URLSearchParams();
  const family: SupertilesFamily = state.family === 'hex' ? 'hex' : 'spectre';
  const d = DEFAULT_SUPERTILES_STATE;
  const rootTile = normalizeRootTile(state.rootTile);
  const level = clampExplodeLevel(state.level);
  const gap = clampGap(state.gap);
  const depth = clampExplodeDepth(state.depth);
  if (family !== 'spectre') q.set('f', family);
  if (rootTile !== d.rootTile) q.set('t', rootTile);
  if (level !== d.level) q.set('lv', String(level));
  if (gap !== d.gap) q.set('gap', String(gap));
  if (depth !== d.depth) q.set('d', String(depth));
  if (!state.showTiles) q.set('tl', '0');
  if (!state.showLabels) q.set('lb', '0');
  // The rule rides along whenever lines are on, or whenever it is not the
  // family's usual one.
  const edges = subsetToEdges(edgesToMask(state.subset));
  const matching = normalizeMatching(family, edges, state.matching);
  const share = ruleShare(family, { subset: edges, matching, contracts: state.contracts });
  if (state.lines) q.set('ln', '1');
  if (share !== null) {
    if (state.lines || share !== DEFAULT_SHARE[family]) q.set('c', share);
  } else {
    // No combination string can express this matching set; keep it losslessly.
    q.set('e', subsetToString(edgesToMask(edges)));
    q.set('m', matching.join('.'));
  }
  if (state.contracts && Object.keys(state.contracts).length) {
    q.set('ct', encodeContracts(state.contracts));
  }
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
  const family: SupertilesFamily = q.get('f') === 'hex' ? 'hex' : 'spectre';
  const base = defaultSupertilesState(family);
  const lv = num('lv');
  const gap = num('gap');
  const depth = num('d');
  const tl = q.get('tl');
  const lb = q.get('lb');
  const ln = q.get('ln');
  const eRaw = q.get('e');
  const cRaw = q.get('c');
  const mRaw = q.get('m');
  const ctRaw = q.get('ct');
  const contracts = ctRaw ? decodeContracts(ctRaw, family) : undefined;
  const order = leafOrder(family);

  let subset = base.subset;
  let matching = base.matching;
  if (mRaw) {
    if (eRaw !== null) subset = subsetToEdges(subsetFromString(eRaw));
    matching = order.map((_, i) => {
      const v = Number.parseInt(mRaw.split('.')[i] ?? '', 10);
      return Number.isFinite(v) ? v : 0;
    });
  } else if (cRaw !== null && cRaw.includes('-')) {
    const rule = ruleFromShare(family, cRaw, contracts);
    if (rule) ({ subset, matching } = rule);
  } else if (cRaw !== null || eRaw !== null) {
    // Older links carry the classes and the digits apart: `e=2578&c=0100101100`.
    if (eRaw !== null) subset = subsetToEdges(subsetFromString(eRaw));
    const digits = cRaw ?? DEFAULT_SHARE[family].split('-')[1];
    matching = comboToMatchingIndices(family, subset, normalizeCombo(digits, order.length), contracts);
  }
  return {
    family,
    rootTile: normalizeRootTile(q.get('t')),
    level: lv === null ? base.level : clampExplodeLevel(lv),
    gap: gap === null ? base.gap : clampGap(gap),
    depth: depth === null ? base.depth : clampExplodeDepth(depth),
    showTiles: !(tl === '0' || tl === 'false'),
    showLabels: !(lb === '0' || lb === 'false'),
    lines: ln === '1' || ln === 'true',
    subset,
    matching: normalizeMatching(family, subset, matching),
    ...(contracts ? { contracts } : {}),
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
