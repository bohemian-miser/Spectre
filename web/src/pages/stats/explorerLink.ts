/**
 * Links out of the stats page, and the stats page's own shareable hash.
 *
 * "Open in Explorer" turns a `(edge_selection, combo)` row into a real
 * `ExplorerState` through the *shared* codec — `comboToMatchingIndices`
 * (core/matchings) and `encodeExplorerState` (core/serialize) — so the CSV
 * combination strings, the `c=` URL parameter and this page agree by
 * construction. The mapping is pinned by `core/__tests__/oracle.test.ts`
 * (analysis of the linked scene reproduces the row) and this module's own
 * round-trip test over all 270 configurations.
 */

import {
  DEFAULT_EXPLORER_STATE,
  MAX_LEVEL,
  comboToMatchingIndices,
  type ExplorerState,
} from '../../core';
import { normalizeBase } from '../../lib/siteNav';
import { EXPLORER_ROUTE, stateToHash } from '../../lib/urlState';
import { LEVEL_KEYS, type LevelKey } from './statsData';

/** `'2578'` -> `[2,5,7,8]` (sorted, deduplicated). */
export function selectionToSubset(selection: string): readonly number[] {
  const digits = [...selection]
    .map((ch) => Number.parseInt(ch, 10))
    .filter((n) => Number.isFinite(n));
  return [...new Set(digits)].sort((a, b) => a - b);
}

/** The explorer scene a table row describes, at `level` supertile iterations. */
export function explorerStateFor(
  selection: string,
  combo: string,
  level: number,
): ExplorerState {
  const subset = selectionToSubset(selection);
  const clamped = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  return {
    ...DEFAULT_EXPLORER_STATE,
    level: clamped,
    subset,
    matching: comboToMatchingIndices('spectre', subset, combo),
  };
}

/**
 * Absolute href for that scene. `base` is the deploy base
 * (`import.meta.env.BASE_URL`, `/Spectre/` in production); the explorer is the
 * site's front door, so the base itself is its document.
 */
export function explorerHref(
  selection: string,
  combo: string,
  level: number,
  base = '/',
): string {
  return `${normalizeBase(base)}${stateToHash(
    explorerStateFor(selection, combo, level),
    EXPLORER_ROUTE,
  )}`;
}

/** Levels offered per row: a quick preview, then the two analysed depths. */
export const EXPLORER_LINK_LEVELS: readonly number[] = [2, 4, 6];

/** Levels heavy enough to warn about before the browser starts drawing. */
export function isHeavyLevel(level: number): boolean {
  return level >= 5;
}

// ---------------------------------------------------------------------------
// The stats page's own hash state (DESIGN.md §9.3)
// ---------------------------------------------------------------------------

export const STATS_ROUTE = '#/stats';

export interface StatsUrlState {
  readonly level: LevelKey;
  /** `${selection}-${combo}` of the open detail panel, if any. */
  readonly rowId: string | null;
}

function isLevelKey(v: string | null): v is LevelKey {
  return v !== null && (LEVEL_KEYS as readonly string[]).includes(v);
}

/** Lenient: unknown or malformed parameters fall back to the defaults. */
export function parseStatsHash(hash: string): StatsUrlState {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const at = raw.indexOf('?');
  const q = new URLSearchParams(at < 0 ? '' : raw.slice(at + 1));
  const ds = q.get('ds');
  const sel = q.get('sel');
  const combo = q.get('combo');
  return {
    level: isLevelKey(ds) ? ds : 'lvl6',
    rowId: sel && combo ? `${sel}-${combo}` : null,
  };
}

/** `#/stats?ds=lvl6&sel=2578&combo=0000001100`. */
export function statsHash(state: StatsUrlState): string {
  const q = new URLSearchParams();
  q.set('ds', state.level);
  if (state.rowId) {
    const dash = state.rowId.indexOf('-');
    if (dash > 0) {
      q.set('sel', state.rowId.slice(0, dash));
      q.set('combo', state.rowId.slice(dash + 1));
    }
  }
  return `${STATS_ROUTE}?${q.toString()}`;
}
