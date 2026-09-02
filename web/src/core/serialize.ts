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
import { DEFAULT_INSTANCE_BUDGET, clampInstanceBudget } from './unrooted';

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
 */
export type ExplorerMode = 'rooted' | 'infinite';

export const EXPLORER_MODES: readonly ExplorerMode[] = ['rooted', 'infinite'];

/**
 * Families the un-rooted engine can actually generate — all of them, now that
 * the engine, the exact arithmetic and the renderers take the family as a
 * parameter. Kept as the single predicate so any future family lands here.
 */
export const INFINITE_MODE_FAMILIES: readonly TileFamilyId[] = FAMILIES;

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
  /**
   * Instance budget for infinite mode (`bg=`). Additive in the same way: only
   * a non-default value is written, and only while the mode that uses it is
   * active. Read it as `state.budget ?? DEFAULT_INSTANCE_BUDGET`.
   */
  readonly budget?: number;
  /**
   * Strand-line thickness MULTIPLIER (`lw=`), applied to the chord lines drawn
   * on the tiles — not to tile outlines and not to the overlay tool. Additive:
   * omitted at 1. Read it as `state.lineWidth ?? DEFAULT_LINE_SCALE`.
   */
  readonly lineWidth?: number;
  /**
   * Tap a strand in infinite mode to colour it (`tc=0` when OFF). Additive the
   * other way round from its neighbours — the default is ON, so only switching
   * it off writes a parameter and every pre-existing link still decodes to the
   * same state. Read it as `state.trace ?? true`.
   */
  readonly trace?: boolean;
  /**
   * Auto-follow the traced strand (`fw=0` when OFF): the camera chases the
   * walk's head and the walk feeds itself, no panning required. Default ON,
   * like `trace`. Read it as `state.follow ?? true`.
   */
  readonly follow?: boolean;
  /**
   * Most trail points the follow mode holds on to (`hp=`) — a moving window
   * behind the chased head, `0` (the default) keeping all of it. Additive:
   * omitted at {@link DEFAULT_TRAIL_HOLD}.
   */
  readonly hold?: number;
  /**
   * Keep a strand that closes into a circuit coloured when the next one is
   * traced (`kc=0` when OFF). Default ON, like `trace`. Read it as
   * `state.keepCircuits ?? true`.
   */
  readonly keepCircuits?: boolean;
  /**
   * Keep a strand that genuinely ENDED (a tail) coloured when the next one is
   * traced (`kt=0` when OFF). Default ON, like `keepCircuits`.
   */
  readonly keepTails?: boolean;
  /**
   * Find and colour every circuit on screen (`fc=0` when OFF). Default ON:
   * the point of the view is the circuits. Read it as
   * `state.findCircuits ?? true`.
   */
  readonly findCircuits?: boolean;
  /**
   * Keep the circuits found at a leaf cut drawn when the camera zooms out past
   * what find-all can analyse (`pf=0` when OFF). Default ON, so pulling back
   * accumulates what was found rather than dropping it.
   */
  readonly persistFound?: boolean;
  /**
   * Show the ticker naming the tiles a chase crosses (`tk=0` when OFF).
   * Default ON, so every link written before the toggle existed still shows
   * the ticker. Read it as `state.showTicker ?? true`.
   */
  readonly showTicker?: boolean;
  /**
   * Show the tile-type transition graph above the ticker (`tg=1`). Additive:
   * omitted when off (the default). Read it as `state.showTransitions ?? false`.
   */
  readonly showTransitions?: boolean;
  /**
   * Tiles find-all may analyse in one pass (`fx=`), which also sets where
   * "circuit zoom" parks. Absent = {@link DEFAULT_FIND_CEILING}.
   */
  readonly findCeiling?: number;
  /**
   * How many found circuits "keep them" holds (`fh=`), 0 = no limit. Absent =
   * {@link DEFAULT_FOUND_HOLD}.
   */
  readonly foundHold?: number;
  /**
   * Light every place the hovered transition happens on screen (`hs=1`), and
   * the same restricted to the traced strand (`ht=1`). Both additive: omitted
   * when off, which is the default, because both cost work per cut.
   */
  readonly highlightOnScreen?: boolean;
  readonly highlightInPath?: boolean;
  /**
   * Chase pace in tiles per second (`fp=`). Absent = full speed (the
   * default); present = watch the walk explore tile by tile at this rate.
   */
  readonly pace?: number;
  /**
   * Follow-camera damping multiplier (`fd=`). Scales how heavily the chase
   * camera's motion is smoothed — 1 is the built-in tuning, higher floats
   * (and trails further behind at pace), lower snaps. Absent =
   * {@link DEFAULT_FOLLOW_DAMPING}.
   */
  readonly damping?: number;
  /**
   * The tapped chord a trace grew from (`ts=`): world coordinates
   * `[atX, atY, toX, toY]`, three decimals. Present while a strand is being
   * traced, so the link replays the same chase from the same chord.
   */
  readonly traceSeed?: readonly [number, number, number, number];
}

/**
 * Strand-line thickness is a MULTIPLIER, not an absolute width, because each
 * renderer measures thickness in its own natural unit: the rooted SVG view
 * strokes in world units (so lines scale with the tiles, and thin out as you
 * zoom away), while the map's WebGL/Canvas2D views stroke in CSS pixels (so
 * lines hold their weight at any zoom). One multiplier scales whichever of
 * those a page happens to be using, and 1 reproduces the old fixed widths.
 *
 * There is deliberately NO UPPER BOUND: the control is a number box precisely
 * so any value can be typed. The only floor is the one arithmetic needs — a
 * zero or negative width is not a thinner line, it is a degenerate one.
 */
export const DEFAULT_LINE_SCALE = 1;
export const MIN_LINE_SCALE = 0.01;
/** Arrow-key increment on the number box; typing is not restricted to it. */
export const LINE_SCALE_STEP = 0.25;

export function clampLineScale(scale: number): number {
  if (!Number.isFinite(scale)) return DEFAULT_LINE_SCALE;
  // Two decimals keeps `lw=` short and the round-trip exact.
  const snapped = Math.round(scale * 100) / 100;
  return Math.max(MIN_LINE_SCALE, snapped);
}

/**
 * Follow-mode trail window ("how many things the chase holds on to"): the
 * most trail points kept behind the head while auto-following, one point per
 * tile crossed. `0` — the default — keeps the whole trail, so nothing the
 * chase drew is thrown away behind it.
 *
 * There is deliberately no ceiling, as with {@link DEFAULT_FIND_CEILING}: a
 * window costs ~40 bytes a point CPU-side plus the GPU copy, and how much of
 * that to spend is the reader's call. `TRAIL_MAX_POINTS` in
 * `pages/map/strandWalk.ts` still backstops the walk itself so a chase left
 * running cannot take the tab down. The floor is the least a window can hold
 * and still look like a trail.
 */
export const DEFAULT_TRAIL_HOLD = 0;
export const MIN_TRAIL_HOLD = 16;

export function clampTrailHold(hold: number): number {
  if (!Number.isFinite(hold) || hold <= 0) return 0;
  return Math.max(MIN_TRAIL_HOLD, Math.round(hold));
}

/**
 * Chase pace, in tiles per second, when the "full speed" toggle is off. The
 * ceiling is where individual tiles stop being followable by eye anyway.
 */
/**
 * Tiles find-all will weld and trace in one pass, and so the widest view
 * "circuit zoom" parks at. The pass is synchronous, so this is really a time
 * budget: a bigger one shows more circuits at once and costs more per cut.
 */
export const DEFAULT_FIND_CEILING = 30_000;
/**
 * Floor only. There is deliberately no ceiling: how long a pass may take, and
 * how much memory the result may use, is the reader's call and not something
 * to be decided for them. The floor exists because a pass smaller than this
 * cannot hold a circuit at all, so it would only ever report "zoom in".
 */
export const MIN_FIND_CEILING = 100;
/** Suggestions for the input's datalist, cheapest first. Not limits. */
export const FIND_CEILINGS: readonly number[] = Object.freeze([
  5_000, 10_000, 30_000, 60_000, 120_000, 250_000, 1_000_000,
]);

export function clampFindCeiling(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_FIND_CEILING;
  return Math.max(MIN_FIND_CEILING, Math.round(n));
}

/**
 * How many found circuits to hold on to while "keep them" accumulates —
 * `0` meaning all of them, however many that turns out to be.
 *
 * A cap here is the one thing that can silently lose a circuit that was
 * genuinely found, so the default is now "keep everything" and any limit is
 * one the reader chose. Each held circuit costs a draw call and its own small
 * vertex buffer; 1200 of them measured 1.8 ms of draw.
 */
export const DEFAULT_FOUND_HOLD = 0;

export function clampFoundHold(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

export const DEFAULT_TRACE_PACE = 24;
export const MIN_TRACE_PACE = 1;
export const MAX_TRACE_PACE = 1000;

export function clampTracePace(pace: number): number {
  if (!Number.isFinite(pace)) return DEFAULT_TRACE_PACE;
  return Math.max(MIN_TRACE_PACE, Math.min(MAX_TRACE_PACE, Math.round(pace)));
}

/**
 * Follow-camera damping (`fd=`): a multiplier on the follow camera's
 * smoothing time constants (`pages/map/followCamera.ts`). 1 is the tuned
 * default; up is floatier and trails further behind at pace, down is tighter.
 * The bounds keep every setting usable — the floor is near-rigid tracking,
 * and the ceiling (a ~9-second dolly constant: extreme cinematic drift) stays
 * honest because the camera's viewport-relative catch-up rules deliberately
 * do NOT scale with it: past half a viewport of lag the tracker blends up to
 * an un-damped catch-up rate, so no damping ever loses the head. Snapped to
 * 0.05 so the URL stays short and slider positions are exact.
 */
export const DEFAULT_FOLLOW_DAMPING = 1;
export const MIN_FOLLOW_DAMPING = 0.25;
export const MAX_FOLLOW_DAMPING = 30;

export function clampFollowDamping(damping: number): number {
  if (!Number.isFinite(damping)) return DEFAULT_FOLLOW_DAMPING;
  const snapped = Math.round(damping * 20) / 20;
  return Math.max(MIN_FOLLOW_DAMPING, Math.min(MAX_FOLLOW_DAMPING, snapped));
}

/** `ts=` codec: 4 world coordinates at 3 decimals, comma-joined. */
export function encodeTraceSeed(seed: readonly [number, number, number, number]): string {
  return seed.map((v) => v.toFixed(3)).join(',');
}

export function decodeTraceSeed(raw: string): readonly [number, number, number, number] | undefined {
  const parts = raw.split(',').map((p) => Number.parseFloat(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return undefined;
  return [parts[0], parts[1], parts[2], parts[3]];
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
  /**
   * Hide the stats readout over the view. Phrased as HIDE rather than SHOW so
   * the default stays 23 and every link written before it still means what it
   * meant.
   */
  HIDE_STATS: 256,
} as const;

/**
 * Every bit `fl=` may carry. Derived, not written out: the codec and the
 * reducer both clamp to it, and a hard-coded ceiling silently swallowed the
 * ninth flag the day it was added.
 */
export const ALL_FLAGS: number = Object.values(FLAG).reduce((a, b) => a | b, 0);

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

/** Clamp a matching vector to what the family and subset actually allow. */
export function normalizeMatching(
  family: TileFamilyId,
  subset: readonly number[],
  matching: readonly number[],
): readonly number[] {
  return leafOrder(family).map((type, i) =>
    clampInt(matching[i] ?? 0, 0, maxMatchingIndex(family, type, subset)),
  );
}

/** `ct=` payload: `major.minor.t` per contract, exported for other pages' codecs. */
export function encodeContracts(c: EdgeContracts): string {
  return Object.entries(c)
    .map(([major, v]) => [Number(major), v as EdgeContract] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([major, v]) => `${major}:${v.minor}@${v.t.toFixed(2)}`)
    .join(';');
}

/** Inverse of {@link encodeContracts}; unknown or malformed entries are dropped. */
export function decodeContracts(
  raw: string,
  family: TileFamilyId,
): EdgeContracts | undefined {
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
  const infinite = s.mode === 'infinite' && supportsInfiniteMode(s.family);
  if (infinite) q.set('md', 'infinite');
  // The budget only means anything in infinite mode, so it rides along with it
  // rather than cluttering every rooted link.
  if (infinite && s.budget !== undefined) {
    const b = clampInstanceBudget(s.budget);
    if (b !== DEFAULT_INSTANCE_BUDGET) q.set('bg', String(b));
  }
  // Line thickness applies in both modes, so unlike `bg=` it does not ride on
  // `md=` — only on being off its default.
  if (s.lineWidth !== undefined) {
    const lw = clampLineScale(s.lineWidth);
    if (lw !== DEFAULT_LINE_SCALE) q.set('lw', String(lw));
  }
  if (s.trace === false) q.set('tc', '0');
  if (s.follow === false) q.set('fw', '0');
  if (s.hold !== undefined) {
    const hp = clampTrailHold(s.hold);
    if (hp !== DEFAULT_TRAIL_HOLD) q.set('hp', String(hp));
  }
  if (s.keepCircuits === false) q.set('kc', '0');
  if (s.keepTails === false) q.set('kt', '0');
  if (s.findCircuits === false) q.set('fc', '0');
  if (s.persistFound === false) q.set('pf', '0');
  if (s.showTicker === false) q.set('tk', '0');
  if (s.showTransitions) q.set('tg', '1');
  if (s.findCeiling !== undefined && clampFindCeiling(s.findCeiling) !== DEFAULT_FIND_CEILING) {
    q.set('fx', String(clampFindCeiling(s.findCeiling)));
  }
  if (s.foundHold !== undefined && clampFoundHold(s.foundHold) !== DEFAULT_FOUND_HOLD) {
    q.set('fh', String(clampFoundHold(s.foundHold)));
  }
  if (s.highlightOnScreen) q.set('hs', '1');
  if (s.highlightInPath) q.set('ht', '1');
  if (s.pace !== undefined) q.set('fp', String(clampTracePace(s.pace)));
  if (s.damping !== undefined && clampFollowDamping(s.damping) !== DEFAULT_FOLLOW_DAMPING) {
    q.set('fd', String(clampFollowDamping(s.damping)));
  }
  if (s.traceSeed) q.set('ts', encodeTraceSeed(s.traceSeed));
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
  const flags = Number.isFinite(flNum) ? clampInt(flNum, 0, ALL_FLAGS) : d.flags;

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

  // Only meaningful alongside `md=infinite`; a stray `bg=` on a rooted link is
  // dropped the same way a stray `md=` on a hex link is.
  const bgRaw = Number.parseInt(q.get('bg') ?? '', 10);
  const budget =
    mode === 'infinite' && Number.isFinite(bgRaw) ? clampInstanceBudget(bgRaw) : undefined;

  const lwRaw = Number.parseFloat(q.get('lw') ?? '');
  const lineWidth = Number.isFinite(lwRaw) ? clampLineScale(lwRaw) : undefined;
  const tcRaw = q.get('tc');
  const trace = tcRaw === '0' || tcRaw === 'false' ? false : undefined;
  const fwRaw = q.get('fw');
  const follow = fwRaw === '0' || fwRaw === 'false' ? false : undefined;
  const hpRaw = Number.parseInt(q.get('hp') ?? '', 10);
  const hold =
    Number.isFinite(hpRaw) && clampTrailHold(hpRaw) !== DEFAULT_TRAIL_HOLD
      ? clampTrailHold(hpRaw)
      : undefined;
  const kcRaw = q.get('kc');
  const keepCircuits = kcRaw === '0' || kcRaw === 'false' ? false : undefined;
  const ktRaw = q.get('kt');
  const keepTails = ktRaw === '0' || ktRaw === 'false' ? false : undefined;
  const fcRaw = q.get('fc');
  const findCircuits = fcRaw === '0' || fcRaw === 'false' ? false : undefined;
  const pfRaw = q.get('pf');
  const persistFound = pfRaw === '0' || pfRaw === 'false' ? false : undefined;
  const tkRaw = q.get('tk');
  const showTicker = tkRaw === '0' || tkRaw === 'false' ? false : undefined;
  const tgRaw = q.get('tg');
  const showTransitions = tgRaw === '1' || tgRaw === 'true' ? true : undefined;
  const fxRaw = Number.parseInt(q.get('fx') ?? '', 10);
  const findCeiling = Number.isFinite(fxRaw) ? clampFindCeiling(fxRaw) : undefined;
  const fhRaw = Number.parseInt(q.get('fh') ?? '', 10);
  const foundHold = Number.isFinite(fhRaw) ? clampFoundHold(fhRaw) : undefined;
  const hsRaw = q.get('hs');
  const highlightOnScreen = hsRaw === '1' || hsRaw === 'true' ? true : undefined;
  // `hp` is already the trail hold window; the path highlight is `ht`.
  const htRaw = q.get('ht');
  const highlightInPath = htRaw === '1' || htRaw === 'true' ? true : undefined;
  const fpRaw = Number.parseInt(q.get('fp') ?? '', 10);
  const pace = Number.isFinite(fpRaw) ? clampTracePace(fpRaw) : undefined;
  const fdRaw = Number.parseFloat(q.get('fd') ?? '');
  const damping = Number.isFinite(fdRaw) ? clampFollowDamping(fdRaw) : undefined;
  const tsRaw = q.get('ts');
  const traceSeed = tsRaw ? decodeTraceSeed(tsRaw) : undefined;

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
    ...(budget !== undefined ? { budget } : {}),
    ...(lineWidth !== undefined ? { lineWidth } : {}),
    ...(trace === false ? { trace } : {}),
    ...(follow === false ? { follow } : {}),
    ...(hold !== undefined ? { hold } : {}),
    ...(keepCircuits === false ? { keepCircuits } : {}),
    ...(keepTails === false ? { keepTails } : {}),
    ...(findCircuits === false ? { findCircuits } : {}),
    ...(persistFound === false ? { persistFound } : {}),
    ...(showTicker === false ? { showTicker } : {}),
    ...(showTransitions ? { showTransitions } : {}),
    ...(findCeiling !== undefined && findCeiling !== DEFAULT_FIND_CEILING ? { findCeiling } : {}),
    ...(foundHold !== undefined && foundHold !== DEFAULT_FOUND_HOLD ? { foundHold } : {}),
    ...(highlightOnScreen ? { highlightOnScreen } : {}),
    ...(highlightInPath ? { highlightInPath } : {}),
    ...(pace !== undefined ? { pace } : {}),
    ...(damping !== undefined && damping !== DEFAULT_FOLLOW_DAMPING ? { damping } : {}),
    ...(traceSeed ? { traceSeed } : {}),
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
