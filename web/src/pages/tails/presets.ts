/**
 * Pure data + helpers for the tails-problem explainer (`docs/EXPLAINER_COPY.md`,
 * DESIGN.md §7.2).
 *
 * Everything the article asserts in prose — Delta's six seams, each class's
 * "fingerprint", the mod-2 count matrix, the eight kernel members and their
 * group structure — is *computed from `core/`* here rather than transcribed, so
 * the page can never drift from the tile tables. The unit tests in
 * `__tests__/presets.test.ts` pin these against the numbers printed in the copy.
 */

import {
  DEFAULT_EXPLORER_STATE,
  comboToMatchingIndices,
  connectionCount,
  edgesToSubset,
  familyMajors,
  leafOrder,
  metaEdges,
  subsetToEdges,
  validEdgeSubsets,
  type MetaEdge,
  type TileFamilyId,
  type TileTypeId,
} from '../../core';
import { edgeClassColor } from '../../lib/palette';
import { navHref, navItem } from '../../lib/siteNav';
import { stateToHash } from '../../lib/urlState';

/** The article is about the Spectre; other families appear only in the coda. */
export const FAMILY: TileFamilyId = 'spectre';

/** Edge classes 0–8, in the order the copy's table lists them. */
export const CLASSES: readonly number[] = familyMajors(FAMILY);

/**
 * Row order of the copy's matrix: the Mystic halves first, then the eight
 * plain tiles. A test asserts this is a permutation of `leafOrder`.
 */
export const MATRIX_ROWS: readonly TileTypeId[] = [
  'Gamma1',
  'Gamma2',
  'Delta',
  'Theta',
  'Lambda',
  'Xi',
  'Pi',
  'Sigma',
  'Phi',
  'Psi',
];

// ---------------------------------------------------------------------------
// Seams
// ---------------------------------------------------------------------------

export interface SeamInfo {
  /** `Delta/-5A` — the `MetaEdge` id. */
  readonly id: string;
  /** `-5A` — how the article writes it. */
  readonly name: string;
  readonly major: number;
  readonly sign: 1 | -1;
  readonly variant: string;
  /** The physical edge labels walking along the seam, e.g. `2.0A 2.1A 2.2A`. */
  readonly labels: readonly string[];
  readonly color: string;
}

function seamName(seam: MetaEdge): string {
  return `${seam.sign < 0 ? '-' : ''}${seam.major}${seam.variant}`;
}

/** Every seam of a tile, in label order — the "six handshakes" sidebar. */
export function seamTally(type: TileTypeId, family: TileFamilyId = FAMILY): readonly SeamInfo[] {
  return metaEdges(family, type).map((seam) => ({
    id: seam.id,
    name: seamName(seam),
    major: seam.major,
    sign: seam.sign,
    variant: seam.variant,
    labels: seam.labels.map((l) => l.raw),
    color: edgeClassColor(seam.major),
  }));
}

/**
 * Positions of a class's seams within `metaEdges()` order — the index space
 * `TileView`'s `overlays` prop speaks, used to draw "this pair, not that one".
 */
export function seamIndicesOfClass(
  type: TileTypeId,
  major: number,
  family: TileFamilyId = FAMILY,
): readonly number[] {
  const out: number[] = [];
  metaEdges(family, type).forEach((seam, i) => {
    if (seam.major === major) out.push(i);
  });
  return out;
}

/** Distinct edge classes a tile touches, ascending (drives seam pickers). */
export function classesOf(type: TileTypeId, family: TileFamilyId = FAMILY): readonly number[] {
  return [...new Set(metaEdges(family, type).map((s) => s.major))].sort((a, b) => a - b);
}

/** Longest seam of a class anywhere in the family — the contract slider's range. */
export function seamMinorCount(major: number, family: TileFamilyId = FAMILY): number {
  let max = 1;
  for (const type of leafOrder(family)) {
    for (const seam of metaEdges(family, type)) {
      if (seam.major === major) max = Math.max(max, seam.edgeIndices.length);
    }
  }
  return max;
}

/**
 * A tile owning the `+` side of a class — the left half of a handshake. The
 * *widest* such seam wins, so class 2 picks a tile carrying the full
 * `2.0 2.1 2.2` run rather than Gamma1's straddling tail-end `2.2A`.
 */
export function hostOf(major: number, family: TileFamilyId = FAMILY): TileTypeId {
  let best: { type: TileTypeId; width: number } | null = null;
  for (const type of MATRIX_ROWS) {
    for (const seam of metaEdges(family, type)) {
      if (seam.major !== major || seam.sign < 0) continue;
      const width = seam.edgeIndices.length;
      if (!best || width > best.width) best = { type, width };
    }
  }
  return best?.type ?? 'Delta';
}

/**
 * A tile whose crossings under this class alone can actually be paired up —
 * the one worth drawing a chord on. Falls back to any tile touching the class.
 */
export function pairableUnder(major: number, family: TileFamilyId = FAMILY): TileTypeId {
  // Prefer a plain tile: a lone Mystic half is a confusing thing to put in a
  // figure when eight ordinary Spectres would do.
  const order = [
    ...MATRIX_ROWS.filter((t) => !t.startsWith('Gamma')),
    ...MATRIX_ROWS.filter((t) => t.startsWith('Gamma')),
  ];
  const counts = order.map(
    (type) => [type, connectionCount(family, type, new Set([major]))] as const,
  );
  const even = counts.find(([, n]) => n >= 2 && n % 2 === 0);
  return even?.[0] ?? counts.find(([, n]) => n > 0)?.[0] ?? 'Delta';
}

/** Split a position `u` along a seam (in edge units) into a contract. */
export function contractAt(u: number, minorCount: number): { minor: number; t: number } {
  const clamped = Math.max(0, Math.min(minorCount, u));
  const minor = Math.max(0, Math.min(minorCount - 1, Math.floor(clamped)));
  return { minor, t: clamped - minor };
}

// ---------------------------------------------------------------------------
// Parity: the whole point of the article
// ---------------------------------------------------------------------------

/** Crossing points a tile gets under a subset (one per selected seam). */
export function crossingCount(
  type: TileTypeId,
  selected: ReadonlySet<number>,
  family: TileFamilyId = FAMILY,
): number {
  return connectionCount(family, type, selected);
}

/** Tile types left with an odd number of crossings — the sad ones. */
export function oddTypes(
  selected: ReadonlySet<number>,
  family: TileFamilyId = FAMILY,
): readonly TileTypeId[] {
  return MATRIX_ROWS.filter((type) => crossingCount(type, selected, family) % 2 === 1);
}

/** A class's *fingerprint*: which tile types it alone makes odd. */
export function fingerprint(major: number, family: TileFamilyId = FAMILY): readonly TileTypeId[] {
  return oddTypes(new Set([major]), family);
}

export interface MatrixRow {
  readonly type: TileTypeId;
  /** Seam counts per class, aligned with {@link CLASSES}. */
  readonly counts: readonly number[];
}

/** The copy's table, counted straight off the tile definitions. */
export const COUNT_MATRIX: readonly MatrixRow[] = MATRIX_ROWS.map((type) => ({
  type,
  counts: CLASSES.map((major) => connectionCount(FAMILY, type, new Set([major]))),
}));

/** Sum of a row's selected entries, mod 2 — 1 means "this tile is sad". */
export function rowParity(row: MatrixRow, selected: ReadonlySet<number>): 0 | 1 {
  let sum = 0;
  CLASSES.forEach((major, i) => {
    if (selected.has(major)) sum += row.counts[i];
  });
  return (sum % 2) as 0 | 1;
}

// ---------------------------------------------------------------------------
// Subsets (masks over classes 0–8)
// ---------------------------------------------------------------------------

export type Mask = number;

export const maskOf = (edges: Iterable<number>): Mask => edgesToSubset(edges);
export const edgesOf = (mask: Mask): readonly number[] => subsetToEdges(mask);
export const setOf = (mask: Mask): ReadonlySet<number> => new Set(subsetToEdges(mask));

/** `{1, 5}` / `∅` — how the article prints a rule. */
export function maskLabel(mask: Mask): string {
  const edges = subsetToEdges(mask);
  return edges.length === 0 ? '∅' : `{${edges.join(', ')}}`;
}

/** `15` / `∅` — the compact form used on chips and in URLs. */
export function maskDigits(mask: Mask): string {
  const edges = subsetToEdges(mask);
  return edges.length === 0 ? '∅' : edges.join('');
}

/** The kernel: the eight rules that leave nobody with a tail. */
export const KERNEL_MASKS: readonly Mask[] = validEdgeSubsets(FAMILY).map((v) => v.mask);

export function isKernel(mask: Mask): boolean {
  return KERNEL_MASKS.includes(mask);
}

/** Symmetric difference — the group operation on the kernel. */
export const xorMask = (a: Mask, b: Mask): Mask => a ^ b;

/** Classes appearing in no kernel member at all (the copy's easter egg: 4). */
export const NEVER_INVITED: readonly number[] = CLASSES.filter(
  (major) => !KERNEL_MASKS.some((mask) => (mask >> major) & 1),
);

// ---------------------------------------------------------------------------
// Matchings & profiles
// ---------------------------------------------------------------------------

/** `matchingIndexByType` for an `analyze()` request, from a combination string. */
export function matchingRecord(
  subset: readonly number[],
  combo: string,
  family: TileFamilyId = FAMILY,
): Record<string, number> {
  const indices = comboToMatchingIndices(family, subset, combo);
  const out: Record<string, number> = {};
  leafOrder(family).forEach((type, i) => {
    out[type] = indices[i] ?? 0;
  });
  return out;
}

export interface MatchingProfile {
  readonly id: string;
  readonly label: string;
  readonly subset: readonly number[];
  readonly combo: string;
  readonly blurb: string;
}

/**
 * The copy's "circuits vs. wanderers" pair. Same rule, same tiles; only the
 * per-tile matchmaking differs, and the drawing changes completely.
 */
export const PROFILES: readonly MatchingProfile[] = [
  {
    id: 'lace',
    label: 'Profile A — 2578-0000000000',
    subset: [2, 5, 7, 8],
    combo: '0000000000',
    blurb: 'every tile takes its first matching: the floor dissolves into small circuits',
  },
  {
    id: 'wanderer',
    label: 'Profile B — 2578-0100101100',
    subset: [2, 5, 7, 8],
    combo: '0100101100',
    blurb: 'four tiles re-pair, and the lace collapses into a line that will not stop',
  },
];

// ---------------------------------------------------------------------------
// Article structure
// ---------------------------------------------------------------------------

export interface SectionMeta {
  readonly id: string;
  readonly title: string;
}

/** Section anchors, in reading order (drives the contents rail). */
export const SECTIONS: readonly SectionMeta[] = [
  { id: 'spectre', title: 'Meet the Spectre' },
  { id: 'numbers', title: 'Numbers on the edges' },
  { id: 'game', title: 'The game, and the fine print' },
  { id: 'theta', title: 'Three lines walk into a Theta' },
  { id: 'sad', title: 'The sad tile' },
  { id: 'puzzle', title: 'Your turn' },
  { id: 'fingerprints', title: 'Fingerprints' },
  { id: 'matrix', title: 'The matrix' },
  { id: 'kernel', title: 'The eight answers' },
  { id: 'drawings', title: 'One kernel, endless drawings' },
  { id: 'mirrors', title: 'Mirrors all the way up' },
];

// ---------------------------------------------------------------------------
// Links & persistence
// ---------------------------------------------------------------------------

function siteBase(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? '/';
}

/** Deep link into the Explorer with a rule (and optionally a combo) loaded. */
export function explorerHref(
  subset: readonly number[],
  opts: { level?: number; combo?: string } = {},
): string {
  const level = opts.level ?? 3;
  const matching = opts.combo
    ? comboToMatchingIndices(FAMILY, subset, opts.combo)
    : DEFAULT_EXPLORER_STATE.matching;
  const hash = stateToHash({
    ...DEFAULT_EXPLORER_STATE,
    level,
    subset: [...subset].sort((a, b) => a - b),
    matching,
  });
  const item = navItem('explorer');
  return `${item ? navHref(item, siteBase()) : siteBase()}${hash}`;
}

/** Nav href for another page of the site (used by the coda). */
export function pageHref(id: string): string {
  const item = navItem(id);
  return item ? navHref(item, siteBase()) : siteBase();
}

export const EXPLORED_KEY = 'spectre.tails.explored';
export const SOLVED_KEY = 'spectre.tails.solved';

/** All 512 candidate subsets — what the puzzle console counts against. */
export const CANDIDATE_COUNT = 1 << CLASSES.length;

function readMasks(key: string): Mask[] {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is number => typeof v === 'number' && v >= 0 && v < CANDIDATE_COUNT);
  } catch {
    return [];
  }
}

function writeMasks(key: string, masks: Iterable<Mask>): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify([...masks]));
  } catch {
    /* private mode / no storage: progress is simply not persisted */
  }
}

export const loadMasks = (key: string): Set<Mask> => new Set(readMasks(key));
export const saveMasks = (key: string, masks: Iterable<Mask>): void => writeMasks(key, masks);
