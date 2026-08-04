/**
 * ExplorerState <-> URL query codec (DESIGN.md §9).
 *
 * The `c` (combination string) parameter is byte-compatible with the
 * blog/notebook/CSV combo format, so `e=2578&c=0100101100` is the canonical
 * `2578-0100101100`. `m` is the lossless fallback for states that are not
 * combo-representable.
 */

import type { ColorSchemeId } from './colors';
import { COLOR_SCHEME_IDS } from './colors';
import { validateContracts, type EdgeContract, type EdgeContracts } from './edges';
import { FAMILIES, leafOrder, TILE_NAMES, type TileFamilyId, type TileTypeId } from './families';
import { comboToMatchingIndices, matchingIndicesToCombo } from './matchings';
import { matchingCount } from './matchings';
import { connectionCount } from './edges';

export const CODEC_VERSION = 1;

/** Indices into `metaEdges(family, type)` order. */
export type Chord = readonly [metaEdgeIdxA: number, metaEdgeIdxB: number];

export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

/**
 * How the Explorer draws the scene.
 *  - `rooted` (default): materialize a level-N patch from a root tile — the
 *    only mode where circuit analysis is possible, because analysis needs a
 *    finite patch to weld and trace.
 *  - `infinite`: the un-rooted engine (`core/unrooted.ts`) rendered through
 *    the Infinite Map's WebGL2 viewport. No root, no patch, no analysis —
 *    just tiles and the local strand lines, at any depth.
 *
 * The engine implements the SPECTRE family only, so `infinite` is offered
 * only while `family === 'spectre'`.
 */
export type ExplorerMode = 'rooted' | 'infinite';

export const EXPLORER_MODES: readonly ExplorerMode[] = ['rooted', 'infinite'];

/** Families the un-rooted engine can actually generate. */
export const INFINITE_MODE_FAMILIES: readonly TileFamilyId[] = ['spectre'];

export function supportsInfiniteMode(family: TileFamilyId): boolean {
  return INFINITE_MODE_FAMILIES.includes(family);
}

export interface ExplorerState {
  readonly family: TileFamilyId;
  readonly rootTile: TileTypeId;
  readonly level: number;
  /** Selected majors, sorted. */
  readonly subset: readonly number[];
  /** Per-leaf matching index, in `leafOrder(family)` order. */
  readonly matching: readonly number[];
  readonly flags: number;
  readonly colorScheme: ColorSchemeId;
  readonly customColors?: Readonly<Record<string, string>>;
  readonly contracts?: EdgeContracts;
  readonly overlays: Readonly<Record<string, readonly Chord[]>>;
  readonly camera?: Camera;
  /**
   * Renderer mode (`md=` in the URL). OPTIONAL and omitted when `rooted`, so
   * the default state still encodes to exactly `v=1` and every pre-existing
   * link decodes unchanged. Read it as `state.mode ?? 'rooted'`.
   */
  readonly mode?: ExplorerMode;
}

/** Display flag bits (§9.2 `fl`). */
export const FLAG = {
  BACKGROUNDS: 1,
  OUTLINES: 2,
  LINES: 4,
  DOTS: 8,
  RAINBOW_TAILS: 16,
  EDGE_LABELS: 32,
  CURVY: 64,
  NON_CROSSING_ONLY: 128,
} as const;

export const DEFAULT_FLAGS =
  FLAG.BACKGROUNDS | FLAG.OUTLINES | FLAG.LINES | FLAG.RAINBOW_TAILS; // 23

export const DEFAULT_EXPLORER_STATE: ExplorerState = Object.freeze({
  family: 'spectre' as TileFamilyId,
  rootTile: 'Delta' as TileTypeId,
  level: 2,
  subset: Object.freeze([]) as readonly number[],
  matching: Object.freeze(leafOrder('spectre').map(() => 0)) as readonly number[],
  flags: DEFAULT_FLAGS,
  colorScheme: 'bright' as ColorSchemeId,
  overlays: Object.freeze({}) as Readonly<Record<string, readonly Chord[]>>,
});

/**
 * Ceiling for the *rooted* explorer, which materializes every tile of the
 * patch. Past level 6 that is millions of tiles (≈7.87× per level), so the
 * page warns before it commits; the Infinite Map's un-rooted engine is the
 * route to arbitrary depth without materializing anything.
 */
export const MAX_LEVEL = 9;
/** Above this the rooted patch is heavy enough to be worth warning about. */
export const HEAVY_LEVEL = 6;

function clampInt(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** Highest legal matching index for a leaf tile under a subset. */
function maxMatchingIndex(
  family: TileFamilyId,
  type: TileTypeId,
  subset: readonly number[],
): number {
  const n = connectionCount(family, type, new Set(subset));
  return Math.max(0, matchingCount(n) - 1);
}

function normalizeMatching(
  family: TileFamilyId,
  subset: readonly number[],
  matching: readonly number[],
): readonly number[] {
  return leafOrder(family).map((type, i) =>
    clampInt(matching[i] ?? 0, 0, maxMatchingIndex(family, type, subset)),
  );
}

function encodeContracts(c: EdgeContracts): string {
  return Object.entries(c)
    .map(([major, v]) => [Number(major), v as EdgeContract] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([major, v]) => `${major}:${v.minor}@${v.t.toFixed(2)}`)
    .join(';');
}

function decodeContracts(raw: string, family: TileFamilyId): EdgeContracts | undefined {
  const out: Record<number, EdgeContract> = {};
  let any = false;
  for (const part of raw.split(';')) {
    const m = /^(\d+):(\d+)@([0-9.]+)$/.exec(part.trim());
    if (!m) continue;
    const t = Number.parseFloat(m[3]);
    if (!Number.isFinite(t)) continue;
    out[Number.parseInt(m[1], 10)] = { minor: Number.parseInt(m[2], 10), t };
    any = true;
  }
  if (!any) return undefined;
  const validated = validateContracts(family, out);
  return Object.keys(validated).length ? validated : undefined;
}

function encodeOverlays(overlays: Readonly<Record<string, readonly Chord[]>>): string {
  return Object.entries(overlays)
    .filter(([, chords]) => chords.length > 0)
    .map(([type, chords]) => `${type}:${chords.map(([a, b]) => `${a}-${b}`).join(',')}`)
    .join(';');
}

function decodeOverlays(raw: string): Record<string, readonly Chord[]> {
  const out: Record<string, Chord[]> = {};
  for (const group of raw.split(';')) {
    const idx = group.indexOf(':');
    if (idx <= 0) continue;
    const type = group.slice(0, idx);
    const chords: Chord[] = [];
    for (const pair of group.slice(idx + 1).split(',')) {
      const m = /^(\d+)-(\d+)$/.exec(pair.trim());
      if (!m) continue;
      chords.push([Number.parseInt(m[1], 10), Number.parseInt(m[2], 10)]);
    }
    if (chords.length) out[type] = chords;
  }
  return out;
}

function encodeCustomColors(colors: Readonly<Record<string, string>>): string {
  return Object.entries(colors)
    .map(([type, hex]) => `${type}:${hex.replace(/^#/, '').toLowerCase()}`)
    .join(',');
}

function decodeCustomColors(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split(',')) {
    const m = /^([A-Za-z0-9]+):#?([0-9a-fA-F]{6})$/.exec(part.trim());
    if (m) out[m[1]] = m[2].toLowerCase();
  }
  return out;
}

/** Encode state to query params, omitting anything at its default. */
export function encodeExplorerState(s: ExplorerState): URLSearchParams {
  const q = new URLSearchParams();
  const d = DEFAULT_EXPLORER_STATE;

  q.set('v', String(CODEC_VERSION));
  if (s.family !== d.family) q.set('f', s.family);
  if (s.rootTile !== d.rootTile) q.set('t', s.rootTile);
  if (s.level !== d.level) q.set('lv', String(s.level));

  const subset = [...s.subset].sort((a, b) => a - b);
  if (subset.length) q.set('e', subset.join(''));

  const matching = normalizeMatching(s.family, subset, s.matching);
  if (matching.some((v) => v !== 0)) {
    const combo = matchingIndicesToCombo(s.family, subset, matching, s.contracts);
    if (combo !== null) {
      q.set('c', combo);
    } else {
      // trailing zeros trimmed
      const trimmed = [...matching];
      while (trimmed.length && trimmed[trimmed.length - 1] === 0) trimmed.pop();
      q.set('m', trimmed.join('.'));
    }
  }

  if (s.flags !== d.flags) q.set('fl', String(s.flags));
  if (s.colorScheme !== d.colorScheme) q.set('cs', s.colorScheme);
  if (s.colorScheme === 'custom' && s.customColors && Object.keys(s.customColors).length) {
    q.set('cc', encodeCustomColors(s.customColors));
  }
  if (s.contracts && Object.keys(s.contracts).length) q.set('ct', encodeContracts(s.contracts));
  const ov = encodeOverlays(s.overlays);
  if (ov) q.set('ov', ov);
  if (s.camera) {
    q.set('cam', `${s.camera.x.toFixed(2)},${s.camera.y.toFixed(2)},${s.camera.scale.toFixed(2)}`);
  }
  // Additive: only a non-default mode appears, and only where it is real.
  if (s.mode === 'infinite' && supportsInfiniteMode(s.family)) q.set('md', 'infinite');
  return q;
}

/** Lenient decoder: unknown params ignored, malformed values fall back. */
export function decodeExplorerState(q: URLSearchParams): ExplorerState {
  const d = DEFAULT_EXPLORER_STATE;

  const fRaw = q.get('f');
  const family = (FAMILIES as readonly string[]).includes(fRaw ?? '')
    ? (fRaw as TileFamilyId)
    : d.family;

  const tRaw = q.get('t');
  const rootTile = (TILE_NAMES as readonly string[]).includes(tRaw ?? '')
    ? (tRaw as TileTypeId)
    : d.rootTile;

  const lvNum = Number.parseInt(q.get('lv') ?? '', 10);
  const level = Number.isFinite(lvNum) ? clampInt(lvNum, 0, MAX_LEVEL) : d.level;

  const eRaw = q.get('e') ?? '';
  const subset = [
    ...new Set(
      [...eRaw]
        .map((ch) => Number.parseInt(ch, 10))
        .filter((n) => Number.isFinite(n) && n >= 0 && n <= 9),
    ),
  ].sort((a, b) => a - b);

  const ctRaw = q.get('ct');
  const contracts = ctRaw ? decodeContracts(ctRaw, family) : undefined;

  const order = leafOrder(family);
  let matching: readonly number[] = order.map(() => 0);
  const cRaw = q.get('c');
  const mRaw = q.get('m');
  if (cRaw) {
    matching = comboToMatchingIndices(family, subset, cRaw.toLowerCase(), contracts);
  } else if (mRaw) {
    const parts = mRaw.split('.').map((p) => Number.parseInt(p, 10));
    matching = order.map((_, i) => (Number.isFinite(parts[i]) ? parts[i] : 0));
  }
  matching = normalizeMatching(family, subset, matching);

  const flNum = Number.parseInt(q.get('fl') ?? '', 10);
  const flags = Number.isFinite(flNum) ? clampInt(flNum, 0, 255) : d.flags;

  const csRaw = q.get('cs');
  const colorScheme = (COLOR_SCHEME_IDS as readonly string[]).includes(csRaw ?? '')
    ? (csRaw as ColorSchemeId)
    : d.colorScheme;

  const ccRaw = q.get('cc');
  const customColors =
    colorScheme === 'custom' && ccRaw ? decodeCustomColors(ccRaw) : undefined;

  const ovRaw = q.get('ov');
  const overlays = ovRaw ? decodeOverlays(ovRaw) : {};

  const camRaw = q.get('cam');
  let camera: Camera | undefined;
  if (camRaw) {
    const parts = camRaw.split(',').map((p) => Number.parseFloat(p));
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      camera = { x: parts[0], y: parts[1], scale: parts[2] };
    }
  }

  // Unknown / unsupported modes fall back to rooted rather than failing, and
  // `md=infinite` is dropped for families the un-rooted engine cannot draw.
  const mdRaw = q.get('md');
  const mode: ExplorerMode | undefined =
    mdRaw === 'infinite' && supportsInfiniteMode(family) ? 'infinite' : undefined;

  const state: ExplorerState = {
    family,
    rootTile,
    level,
    subset,
    matching,
    flags,
    colorScheme,
    overlays,
    ...(customColors && Object.keys(customColors).length ? { customColors } : {}),
    ...(contracts ? { contracts } : {}),
    ...(camera ? { camera } : {}),
    ...(mode ? { mode } : {}),
  };
  return state;
}

/** Convenience wrappers for the hash-router query string. */
export function encodeExplorerQuery(s: ExplorerState): string {
  return encodeExplorerState(s).toString();
}

export function decodeExplorerQuery(query: string): ExplorerState {
  return decodeExplorerState(new URLSearchParams(query.replace(/^\?/, '')));
}

/** Normalize a state the way the decoder would, for round-trip comparisons. */
export function normalizeExplorerState(s: ExplorerState): ExplorerState {
  return decodeExplorerState(encodeExplorerState(s));
}
