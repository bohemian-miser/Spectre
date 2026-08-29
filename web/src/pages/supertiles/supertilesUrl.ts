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
  LEAF_ORDER,
  TILE_NAMES,
  comboToMatchingIndices,
  decodeContracts,
  edgesToSubset,
  encodeContracts,
  matchingIndicesToCombo,
  normalizeMatching,
  subsetFromString,
  subsetToEdges,
  subsetToString,
  type EdgeContracts,
  type TileTypeId,
} from '../../core';
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
  /**
   * Draw the strand lines and analyse the supertile's circuits (`ln=1`).
   * Off by default, exactly as on the Infinite Map, so every link written
   * before the rule controls existed still decodes to the same picture.
   */
  readonly lines: boolean;
  /** Selected seam classes, sorted (the strand rule). */
  readonly subset: readonly number[];
  /**
   * Matching index per leaf, in `LEAF_ORDER`. Stored as the vector rather than
   * as a combination string because the sliders can reach states no
   * combination expresses; the codec writes `c=` when one exists and falls
   * back to `m=` when it does not, exactly as the Explorer's does.
   */
  readonly matching: readonly number[];
  /** Seam contracts, omitted when every class is at its default. */
  readonly contracts?: EdgeContracts;
}

/**
 * The rule the page offers first — the same pair the Infinite Map opens with,
 * so "switch lines on" lands on a configuration with a known global answer
 * rather than an arbitrary one.
 */
export const DEFAULT_SUBSET: readonly number[] = [2, 5, 7, 8];
export const DEFAULT_COMBO = '0100101100';
/** Combination strings carry one digit per leaf type. */
export const COMBO_LENGTH = 10;

/** Keep only base-36 digits and pad/trim to {@link COMBO_LENGTH}. */
export function normalizeCombo(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^0-9a-z]/g, '')
    .slice(0, COMBO_LENGTH)
    .padEnd(COMBO_LENGTH, '0');
}

/** Canonicalize an edge list (dedup + sort) through the bitmask form. */
const edgesToMask = (edges: readonly number[]): number =>
  edgesToSubset(edges.filter((n) => Number.isInteger(n) && n >= 0 && n <= 9));

export const DEFAULT_SUPERTILES_STATE: SupertilesUrlState = {
  rootTile: DEFAULT_ROOT_TILE,
  level: DEFAULT_EXPLODE_LEVEL,
  gap: DEFAULT_GAP,
  depth: DEFAULT_DEPTH,
  showTiles: true,
  showLabels: true,
  lines: false,
  subset: DEFAULT_SUBSET,
  matching: comboToMatchingIndices('spectre', DEFAULT_SUBSET, DEFAULT_COMBO),
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
  // Rule params, additive in the same way: the subset and combination ride
  // along whenever lines are on, or whenever they differ from the preset.
  const edges = subsetToEdges(edgesToMask(state.subset));
  const subset = subsetToString(edgesToMask(state.subset));
  const defaultSubset = subsetToString(edgesToMask(DEFAULT_SUBSET));
  const matching = normalizeMatching('spectre', edges, state.matching);
  const combo = matchingIndicesToCombo('spectre', edges, matching, state.contracts);
  if (state.lines) q.set('ln', '1');
  if (state.lines || subset !== defaultSubset) q.set('e', subset);
  if (combo !== null) {
    if (state.lines || combo !== DEFAULT_COMBO) q.set('c', combo);
  } else {
    // No combination string can express this matching set; keep it losslessly.
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
  const contracts = ctRaw ? decodeContracts(ctRaw, 'spectre') : undefined;
  const subset =
    eRaw === null ? DEFAULT_SUBSET : subsetToEdges(subsetFromString(eRaw));
  const matching = mRaw
    ? LEAF_ORDER.map((_, i) => {
        const v = Number.parseInt(mRaw.split('.')[i] ?? '', 10);
        return Number.isFinite(v) ? v : 0;
      })
    : comboToMatchingIndices('spectre', subset, normalizeCombo(cRaw ?? DEFAULT_COMBO), contracts);
  return {
    rootTile: normalizeRootTile(q.get('t')),
    level: lv === null ? DEFAULT_SUPERTILES_STATE.level : clampExplodeLevel(lv),
    gap: gap === null ? DEFAULT_SUPERTILES_STATE.gap : clampGap(gap),
    depth: depth === null ? DEFAULT_SUPERTILES_STATE.depth : clampExplodeDepth(depth),
    showTiles: !(tl === '0' || tl === 'false'),
    showLabels: !(lb === '0' || lb === 'false'),
    lines: ln === '1' || ln === 'true',
    subset,
    matching: normalizeMatching('spectre', subset, matching),
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
