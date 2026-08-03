/**
 * Pure filtering + sorting for the configuration table.
 *
 * Kept out of the component so 270-row behaviour (including the level-aware
 * sort keys and the stable tie-break) can be unit tested without a DOM.
 */

import {
  statAt,
  type ConfigRow,
  type LevelKey,
} from './statsData';

export type SortKey =
  | 'config'
  | 'circuits'
  | 'tails'
  | 'maxCircuit'
  | 'maxTail'
  | 'distinct'
  | 'circuitRatio';

export type SortDir = 'asc' | 'desc';

export interface SortSpec {
  readonly key: SortKey;
  readonly dir: SortDir;
  /** Which depth the numeric keys read. */
  readonly level: LevelKey;
}

/** Extra row predicates offered next to the selection chips. */
export type RowFlavor = 'all' | 'circuit-free' | 'stable-lengths' | 'new-lengths';

export interface TableFilter {
  /** Empty means "every selection". */
  readonly selections: readonly string[];
  /** Case-insensitive substring of the combo or the `sel-combo` share string. */
  readonly query: string;
  readonly flavor: RowFlavor;
}

export const EMPTY_FILTER: TableFilter = Object.freeze({
  selections: Object.freeze([]) as readonly string[],
  query: '',
  flavor: 'all' as RowFlavor,
});

export const DEFAULT_SORT: SortSpec = Object.freeze({
  key: 'config' as SortKey,
  dir: 'asc' as SortDir,
  level: 'lvl6' as LevelKey,
});

/** Column labels, also used for the header buttons' accessible names. */
export const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  config: 'Configuration',
  circuits: 'Circuits',
  tails: 'Tails',
  maxCircuit: 'Max circuit',
  maxTail: 'Max tail',
  distinct: 'Distinct circuit lengths',
  circuitRatio: 'Circuit growth',
};

function matchesFlavor(row: ConfigRow, flavor: RowFlavor): boolean {
  switch (flavor) {
    case 'circuit-free':
      return row.circuitFree;
    case 'stable-lengths':
      return row.stableCircuitLengths;
    case 'new-lengths':
      return row.newLengthsAtLvl6.length > 0;
    default:
      return true;
  }
}

export function filterRows(
  rows: readonly ConfigRow[],
  filter: TableFilter = EMPTY_FILTER,
): readonly ConfigRow[] {
  const wanted = new Set(filter.selections);
  const q = filter.query.trim().toLowerCase();
  return rows.filter((row) => {
    if (wanted.size > 0 && !wanted.has(row.selection)) return false;
    if (!matchesFlavor(row, filter.flavor)) return false;
    if (q && !row.id.toLowerCase().includes(q) && !row.combo.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}

/** Numeric value a sort key reads for a row, at the spec's level. */
export function sortValue(row: ConfigRow, key: SortKey, level: LevelKey): number {
  const s = statAt(row, level);
  switch (key) {
    case 'circuits':
      return s.circuits;
    case 'tails':
      return s.tails;
    case 'maxCircuit':
      return s.maxCircuit;
    case 'maxTail':
      return s.maxTail;
    case 'distinct':
      return s.nDistinctCircuitLengths;
    case 'circuitRatio':
      // Circuit-free rows have no ratio; park them below every real ratio.
      return row.circuitRatio ?? -1;
    default:
      return 0;
  }
}

/**
 * Sort a copy of `rows`. `config` orders by selection (largest family first,
 * as the model already lists them) then combo; every other key is numeric with
 * a `config` tie-break, so the order is total and stable across re-renders.
 */
export function sortRows(rows: readonly ConfigRow[], spec: SortSpec): readonly ConfigRow[] {
  const sign = spec.dir === 'asc' ? 1 : -1;
  const byConfig = (a: ConfigRow, b: ConfigRow): number =>
    a.selection === b.selection
      ? a.combo.localeCompare(b.combo)
      : a.selection.localeCompare(b.selection);

  const out = [...rows];
  out.sort((a, b) => {
    if (spec.key === 'config') return sign * byConfig(a, b);
    const d = sortValue(a, spec.key, spec.level) - sortValue(b, spec.key, spec.level);
    return d !== 0 ? sign * d : byConfig(a, b);
  });
  return out;
}

/** Header click behaviour: same column flips direction, new column starts on
 * the direction that is most useful for it (descending for the numbers). */
export function nextSort(current: SortSpec, key: SortKey): SortSpec {
  if (current.key === key) {
    return { ...current, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  }
  return { ...current, key, dir: key === 'config' ? 'asc' : 'desc' };
}
