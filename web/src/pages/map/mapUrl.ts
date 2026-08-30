/**
 * Hash-URL codec for The Infinite Map —
 * `#/map?seed=&f=&cx=&cy=&z=&budget=&ln=&e=&c=`.
 *
 * Same shape as `lib/urlState.ts` for the explorer: a pure string codec so the
 * round-trip property is testable in node, with the React side supplying
 * `location.hash` / `history.replaceState`. Encoding is CANONICAL (stable
 * under encode→decode→encode) so the page can suppress no-op `replaceState`
 * calls and stay back/forward safe.
 *
 * `e` / `c` / `f` are byte-compatible with the Explorer's own edge-rule,
 * combination-string and family parameters (`core/serialize.ts`), so a rule
 * copied from the stats page or a shared Explorer link means the same thing
 * here. `f` is written only when the family is not the spectre — every link
 * from before families keeps meaning the spectre, byte for byte.
 */

import {
  DEFAULT_INSTANCE_BUDGET,
  DEFAULT_LINE_SCALE,
  DEFAULT_TRAIL_HOLD,
  DEFAULT_FIND_CEILING,
  DEFAULT_FOUND_HOLD,
  FAMILIES,
  INSTANCE_BUDGETS,
  MAX_INSTANCE_BUDGET,
  MIN_INSTANCE_BUDGET,
  clampInstanceBudget,
  clampLineScale,
  clampFindCeiling,
  clampFoundHold,
  clampTracePace,
  clampTrailHold,
  decodeTraceSeed,
  edgesToSubset,
  encodeTraceSeed,
  leafOrder,
  subsetFromString,
  subsetToEdges,
  subsetToString,
  type TileFamilyId,
} from '../../core';
import { DEFAULT_SCALE, clampScale } from './camera';

/** Canonicalize an edge list (dedup + sort) through the bitmask form. */
const edgesToMask = (edges: readonly number[]): number =>
  edgesToSubset(edges.filter((n) => Number.isInteger(n) && n >= 0 && n <= 9));

export const MAP_ROUTE = '#/map';

export interface MapUrlState {
  readonly seed: number;
  /**
   * Tile family of the world, ADDITIVE: optional on input (absent = spectre,
   * so every pre-family state object and link keeps meaning what it meant),
   * always present on anything `decodeMapQuery` returns.
   */
  readonly family?: TileFamilyId;
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
  /** Strand-line thickness multiplier (`lw=`), omitted at 1. */
  readonly lineWidth?: number;
  /** Clip overlapping strands at the midpoint (`no=1`), omitted when off. */
  readonly noOverlap?: boolean;
  /**
   * Tap a strand to colour it (`tr=0` when OFF). Default ON, so only switching
   * it off writes a parameter — pre-existing links keep encoding unchanged.
   */
  readonly trace?: boolean;
  /** Auto-follow the traced strand (`fw=1`), omitted when off (the default). */
  readonly follow?: boolean;
  /** Most trail points held while following (`hp=`), omitted at the default. */
  readonly hold?: number;
  /**
   * Keep strands that close into circuits coloured (`kc=0` when OFF). Default
   * ON, like `trace`.
   */
  readonly keepCircuits?: boolean;
  /** Keep dead-ended strands (tails) coloured (`kt=0` when OFF). Default ON. */
  readonly keepTails?: boolean;
  /** Find and colour every on-screen circuit (`fc=1`), default OFF. */
  readonly findCircuits?: boolean;
  /** Hold found circuits on screen past find-all's zoom (`pf=1`), default OFF. */
  readonly persistFound?: boolean;
  /** Name the tiles a chase crosses along the bottom (`tk=0` when OFF). Default ON. */
  readonly showTicker?: boolean;
  /** Graph which tile type follows which (`tg=1`), default OFF. */
  readonly showTransitions?: boolean;
  /** Tiles find-all may analyse in one pass (`fx=`), and where circuit zoom parks. */
  readonly findCeiling?: number;
  /** Found circuits "keep them" holds (`fh=`), 0 = no limit. */
  readonly foundHold?: number;
  /** Light the hovered transition everywhere on screen (`hs=1`), default OFF. */
  readonly highlightOnScreen?: boolean;
  /** …and only along the traced strand (`ht=1`), default OFF. */
  readonly highlightInPath?: boolean;
  /** Chase pace in tiles/second (`fp=`); absent/null = full speed. */
  readonly pace?: number | null;
  /** The tapped chord the current trace grew from (`ts=`), for share links. */
  readonly traceSeed?: readonly [number, number, number, number] | null;
}

/**
 * Instance-budget presets offered by the selector. These are the ENGINE's
 * budgets (`core/unrooted.ts`) — the same ladder the Explorer's infinite mode
 * offers, so a budget means the same thing on both pages.
 */
export const MAP_BUDGETS = INSTANCE_BUDGETS;
export const DEFAULT_BUDGET = DEFAULT_INSTANCE_BUDGET;
export const MIN_BUDGET = MIN_INSTANCE_BUDGET;
export const MAX_BUDGET = MAX_INSTANCE_BUDGET;

/**
 * Default strand rule. `2578` is a valid subset (every tile pairs up) and
 * `0100101100` is the CSV/notebook-verified combination that the stats page
 * and `docs/BIGMAP_INVESTIGATION.md` §4 both use, so switching lines on shows
 * a configuration with a known global answer rather than an arbitrary one.
 * The verification is the SPECTRE's; other families default to the same edge
 * classes with the all-zeros (index-0 matchings) combination, there being no
 * notebook-verified rule for them yet.
 */
export const DEFAULT_SUBSET: readonly number[] = [2, 5, 7, 8];
export const DEFAULT_COMBO = '0100101100';
/** Combination strings are one digit per leaf type (`LEAF_ORDER.length`). */
export const COMBO_LENGTH = 10;

/** One combo digit per leaf type of the family (9 for hex, 10 otherwise). */
export function comboLength(family: TileFamilyId): number {
  return leafOrder(family).length;
}

/** The family's default combination string (see {@link DEFAULT_COMBO}). */
export function defaultCombo(family: TileFamilyId): string {
  return family === 'spectre' ? DEFAULT_COMBO : '0'.repeat(comboLength(family));
}

export const DEFAULT_MAP_STATE: MapUrlState = {
  seed: 1,
  cx: 0,
  cy: 0,
  scale: DEFAULT_SCALE,
  budget: DEFAULT_BUDGET,
  lines: false,
  subset: DEFAULT_SUBSET,
  combo: DEFAULT_COMBO,
  lineWidth: DEFAULT_LINE_SCALE,
  noOverlap: false,
  trace: true,
  follow: false,
  hold: DEFAULT_TRAIL_HOLD,
  keepCircuits: true,
  keepTails: true,
  findCircuits: false,
  persistFound: false,
  showTicker: true,
  showTransitions: false,
  findCeiling: DEFAULT_FIND_CEILING,
  foundHold: DEFAULT_FOUND_HOLD,
  highlightOnScreen: false,
  highlightInPath: false,
  pace: null,
  traceSeed: null,
};

/** Keep only base-36 digits and pad/trim to the family's combo length. */
export function normalizeCombo(raw: string, family: TileFamilyId = 'spectre'): string {
  const len = comboLength(family);
  const cleaned = raw
    .toLowerCase()
    .replace(/[^0-9a-z]/g, '')
    .slice(0, len);
  return cleaned.padEnd(len, '0');
}

/** World coordinates: fixed 3 decimals (0.4 px at max zoom), canonicalized. */
function fmtCoord(n: number): string {
  return String(Number(n.toFixed(3)));
}

/** Zoom: 5 significant digits, canonicalized through Number → String. */
function fmtScale(n: number): string {
  return String(Number(n.toPrecision(5)));
}

export const clampBudget = clampInstanceBudget;

/** Selector label for a budget: `500k`, `1M`, `10M`. */
export function formatBudget(b: number): string {
  return b >= 1_000_000 ? `${b / 1_000_000}M` : `${Math.round(b / 1000)}k`;
}

export function encodeMapQuery(state: MapUrlState): string {
  const family = state.family ?? 'spectre';
  const q = new URLSearchParams();
  q.set('seed', String(Math.floor(state.seed) >>> 0));
  // Family is additive: only a non-spectre world writes it, so pre-family
  // links (and the golden default encoding) stay byte-identical.
  if (family !== 'spectre') q.set('f', family);
  q.set('cx', fmtCoord(state.cx));
  q.set('cy', fmtCoord(state.cy));
  q.set('z', fmtScale(clampScale(state.scale)));
  q.set('budget', String(clampBudget(state.budget)));
  // Line params are additive: omitted while everything is at its default, so
  // pre-stage-3 links keep encoding byte-identically.
  const lines = state.lines ?? false;
  const subset = subsetToString(edgesToMask(state.subset ?? DEFAULT_SUBSET));
  const combo = normalizeCombo(state.combo ?? defaultCombo(family), family);
  const defaultSubset = subsetToString(edgesToMask(DEFAULT_SUBSET));
  if (lines) q.set('ln', '1');
  if (lines || subset !== defaultSubset) q.set('e', subset);
  if (lines || combo !== defaultCombo(family)) q.set('c', combo);
  const lw = clampLineScale(state.lineWidth ?? DEFAULT_LINE_SCALE);
  if (lw !== DEFAULT_LINE_SCALE) q.set('lw', String(lw));
  if (state.noOverlap) q.set('no', '1');
  if (state.trace === false) q.set('tr', '0');
  if (state.follow) q.set('fw', '1');
  const hp = clampTrailHold(state.hold ?? DEFAULT_TRAIL_HOLD);
  if (hp !== DEFAULT_TRAIL_HOLD) q.set('hp', String(hp));
  if (state.keepCircuits === false) q.set('kc', '0');
  if (state.keepTails === false) q.set('kt', '0');
  if (state.findCircuits) q.set('fc', '1');
  if (state.persistFound) q.set('pf', '1');
  if (state.showTicker === false) q.set('tk', '0');
  if (state.showTransitions) q.set('tg', '1');
  if (
    state.findCeiling !== undefined &&
    clampFindCeiling(state.findCeiling) !== DEFAULT_FIND_CEILING
  ) {
    q.set('fx', String(clampFindCeiling(state.findCeiling)));
  }
  if (state.foundHold !== undefined && clampFoundHold(state.foundHold) !== DEFAULT_FOUND_HOLD) {
    q.set('fh', String(clampFoundHold(state.foundHold)));
  }
  if (state.highlightOnScreen) q.set('hs', '1');
  if (state.highlightInPath) q.set('ht', '1');
  if (state.pace != null) q.set('fp', String(clampTracePace(state.pace)));
  if (state.traceSeed) q.set('ts', encodeTraceSeed(state.traceSeed));
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
  const lwRaw = num('lw');
  const lnRaw = q.get('ln');
  const noRaw = q.get('no');
  const trRaw = q.get('tr');
  const fwRaw = q.get('fw');
  const hpRaw = num('hp');
  const kcRaw = q.get('kc');
  const ktRaw = q.get('kt');
  const fcRaw = q.get('fc');
  const pfRaw = q.get('pf');
  const tkRaw = q.get('tk');
  const tgRaw = q.get('tg');
  const fxRaw = num('fx');
  const fhRaw = num('fh');
  const hsRaw = q.get('hs');
  // `hp` is the trail hold window, so the path highlight is `ht`.
  const htRaw = q.get('ht');
  const fpRaw = num('fp');
  const tsRaw = q.get('ts');
  const eRaw = q.get('e');
  const cRaw = q.get('c');
  // Family first: `e`/`c` decode in its context (combo length is per family).
  const fRaw = q.get('f');
  const family: TileFamilyId =
    fRaw !== null && (FAMILIES as readonly string[]).includes(fRaw)
      ? (fRaw as TileFamilyId)
      : 'spectre';
  return {
    seed: seedRaw === null ? DEFAULT_MAP_STATE.seed : Math.floor(seedRaw) >>> 0,
    family,
    cx: cx ?? DEFAULT_MAP_STATE.cx,
    cy: cy ?? DEFAULT_MAP_STATE.cy,
    scale: z === null ? DEFAULT_MAP_STATE.scale : clampScale(z),
    budget: budget === null ? DEFAULT_MAP_STATE.budget : clampBudget(budget),
    lines: lnRaw === null ? DEFAULT_MAP_STATE.lines : lnRaw === '1' || lnRaw === 'true',
    subset: eRaw === null ? DEFAULT_MAP_STATE.subset : subsetToEdges(subsetFromString(eRaw)),
    combo: cRaw === null ? defaultCombo(family) : normalizeCombo(cRaw, family),
    lineWidth: lwRaw === null ? DEFAULT_LINE_SCALE : clampLineScale(lwRaw),
    noOverlap: noRaw === '1' || noRaw === 'true',
    trace: !(trRaw === '0' || trRaw === 'false'),
    follow: fwRaw === '1' || fwRaw === 'true',
    hold: hpRaw === null ? DEFAULT_TRAIL_HOLD : clampTrailHold(hpRaw),
    keepCircuits: !(kcRaw === '0' || kcRaw === 'false'),
    keepTails: !(ktRaw === '0' || ktRaw === 'false'),
    findCircuits: fcRaw === '1' || fcRaw === 'true',
    persistFound: pfRaw === '1' || pfRaw === 'true',
    showTicker: !(tkRaw === '0' || tkRaw === 'false'),
    showTransitions: tgRaw === '1' || tgRaw === 'true',
    findCeiling: fxRaw === null ? DEFAULT_FIND_CEILING : clampFindCeiling(fxRaw),
    foundHold: fhRaw === null ? DEFAULT_FOUND_HOLD : clampFoundHold(fhRaw),
    highlightOnScreen: hsRaw === '1' || hsRaw === 'true',
    highlightInPath: htRaw === '1' || htRaw === 'true',
    pace: fpRaw === null ? null : clampTracePace(fpRaw),
    traceSeed: tsRaw ? (decodeTraceSeed(tsRaw) ?? null) : null,
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
