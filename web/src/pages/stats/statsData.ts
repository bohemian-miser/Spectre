/**
 * Data model for the circuits & stats page.
 *
 * Source: `public/data/circuit_stats.json` (schema 1.0), documented in
 * `docs/STATS_NOTES.md`. This module is pure — it takes the parsed JSON and
 * returns a typed, browsable model — so the whole dataset story is unit
 * testable against the real file without a DOM.
 *
 * Vocabulary (STATS_NOTES.md data dictionary):
 *  - *edge selection* — which major edge classes are active, e.g. `023678`.
 *    Only 6 of the app's 8 valid selections have rows; join against
 *    `meta.edge_selections.selections_in_data`, never `app_valid_selections`.
 *  - *combo* — a 10-character option-index string, one digit per tile in
 *    `LEAF_ORDER` (Delta … Gamma1). Digits are option indices, not bits.
 *  - all lengths count **strand segments** (graph edges), never tiles.
 *  - `circuit_lengths` is the set of *unique* lengths: per-length circuit
 *    multiplicities do not exist in the data and must never be implied.
 */

export type LevelKey = 'lvl4' | 'lvl6';

export const LEVEL_KEYS: readonly LevelKey[] = ['lvl4', 'lvl6'];

/** Supertile expansion depth behind each level key. */
export const LEVEL_DEPTH: Readonly<Record<LevelKey, number>> = { lvl4: 4, lvl6: 6 };

export const LEVEL_LABEL: Readonly<Record<LevelKey, string>> = {
  lvl4: 'level 4',
  lvl6: 'level 6',
};

export function otherLevel(level: LevelKey): LevelKey {
  return level === 'lvl4' ? 'lvl6' : 'lvl4';
}

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

/** One bin of the complete tail-length census: `count` tails of `length`. */
export interface TailBin {
  readonly length: number;
  readonly count: number;
}

/** One (edge_selection, combo) configuration at one level. */
export interface ComboStat {
  readonly circuits: number;
  readonly tails: number;
  readonly maxCircuit: number;
  readonly maxTail: number;
  /** Sorted **unique** circuit lengths (multiplicities are not in the data). */
  readonly circuitLengths: readonly number[];
  /** Complete histogram, sorted by length; counts sum to `tails`. */
  readonly tailLengths: readonly TailBin[];
  readonly nDistinctCircuitLengths: number;
}

/** A configuration across both analysed depths. */
export interface ConfigRow {
  /** `${selection}-${combo}`, the canonical share string. */
  readonly id: string;
  readonly selection: string;
  readonly combo: string;
  readonly lvl4: ComboStat;
  readonly lvl6: ComboStat;
  /** lvl6/lvl4 circuit count; `null` for the circuit-free configurations. */
  readonly circuitRatio: number | null;
  readonly tailRatio: number | null;
  /** No circuits at either depth — a space-filling-curve *candidate*. */
  readonly circuitFree: boolean;
  /** Identical circuit-length set at both depths ("finite vocabulary"). */
  readonly stableCircuitLengths: boolean;
  /** Lengths present at lvl6 but not lvl4 (never the other way round). */
  readonly newLengthsAtLvl6: readonly number[];
}

export function statAt(row: ConfigRow, level: LevelKey): ComboStat {
  return level === 'lvl4' ? row.lvl4 : row.lvl6;
}

/** min/max/mean/median plus the pooled sum over a selection's combos. */
export interface Stats5 {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
  /** Pooled across mutually exclusive combos — a dataset summary, never a
   * property of any single tiling. */
  readonly sumAcrossCombos: number;
}

export interface Exemplar {
  readonly combo: string;
  readonly value: number;
  readonly ties: readonly string[];
  readonly circuitLengths?: readonly number[];
}

export interface SelectionExemplars {
  readonly longestCircuit: Exemplar | null;
  readonly longestTail: Exemplar | null;
  readonly mostDistinctCircuitLengths: Exemplar | null;
}

export interface SelectionLevelSummary {
  readonly nCombos: number;
  readonly circuits: Stats5;
  readonly tails: Stats5;
  readonly maxCircuit: Stats5;
  readonly maxTail: Stats5;
  readonly distinctLengthsObserved: readonly number[];
  readonly tailAggregate: readonly TailBin[];
  readonly circuitFreeCombos: readonly string[];
  readonly tailFreeCombos: readonly string[];
  readonly exemplars: SelectionExemplars;
}

export interface SelectionSummary {
  readonly selection: string;
  readonly nCombos: number;
  readonly levels: Readonly<Record<LevelKey, SelectionLevelSummary>>;
  /**
   * Tails per combo when every combo of the selection agrees (it always does
   * in this dataset — tail counts depend on the selection alone).
   */
  readonly tailsPerCombo: Readonly<Record<LevelKey, number | null>>;
  /** lvl6/lvl4 of `tailsPerCombo`. */
  readonly tailRatio: number | null;
  /** Combos whose circuit-length set is identical at both depths. */
  readonly nStableCircuitLengthSets: number;
  readonly nCircuitFree: number;
}

export interface RatioStats {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
}

export interface GrowthSummary {
  readonly stableCircuitLengthSets: number;
  readonly pairsWithNewLengthsAtLvl6: number;
  readonly pairsWithLostLengthsAtLvl6: number;
  readonly nCircuitBearingPairs: number;
  readonly circuitCountRatio: RatioStats;
  readonly tailCountRatio: RatioStats;
  readonly maxCircuitGrew: number;
  readonly maxCircuitSame: number;
  readonly maxTailGrew: number;
}

export interface RecordHolder {
  readonly level: LevelKey;
  readonly selection: string;
  readonly combo: string;
}

export interface DatasetRecords {
  readonly longestCircuit: {
    readonly lengthSegments: number;
    readonly holders: readonly RecordHolder[];
    readonly sameConfigMaxCircuitAtLvl4: number | null;
    readonly growthFactor: number | null;
  };
  readonly longestTail: {
    readonly lengthSegments: number;
    readonly holders: readonly RecordHolder[];
  };
  readonly mostDistinctCircuitLengths: {
    readonly nDistinct: number;
    readonly holders: readonly RecordHolder[];
  };
}

export interface DatasetMeta {
  readonly title: string;
  readonly generated: string;
  readonly schemaVersion: string;
  readonly lengthUnit: string;
  readonly lengthUnitExplanation: string;
  readonly rowCounts: Readonly<Record<LevelKey, number>>;
  readonly tileNames: readonly string[];
  readonly appValidSelections: readonly string[];
  readonly selectionsInData: readonly string[];
  readonly absentFromData: readonly string[];
  readonly coverageNote: string;
  readonly caveats: readonly string[];
  readonly sourceFiles: Readonly<Record<string, string>>;
  readonly provenance: Readonly<Record<string, string>>;
}

export interface LevelTotals {
  readonly circuits: number;
  readonly tails: number;
  readonly configs: number;
}

export interface StatsDataset {
  readonly meta: DatasetMeta;
  readonly records: DatasetRecords;
  readonly growth: GrowthSummary;
  /** All 270 configurations, in selection then combo order. */
  readonly rows: readonly ConfigRow[];
  readonly rowsById: ReadonlyMap<string, ConfigRow>;
  /** Selections present in the data, largest family first. */
  readonly selections: readonly SelectionSummary[];
  readonly totals: Readonly<Record<LevelKey, LevelTotals>>;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export class StatsDataError extends Error {
  constructor(message: string) {
    super(`circuit_stats.json: ${message}`);
    this.name = 'StatsDataError';
  }
}

type Json = Record<string, unknown>;

function asObject(v: unknown, path: string): Json {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new StatsDataError(`expected an object at ${path}`);
  }
  return v as Json;
}

function asArray(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) throw new StatsDataError(`expected an array at ${path}`);
  return v;
}

function asNumber(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new StatsDataError(`expected a number at ${path}`);
  }
  return v;
}

function asString(v: unknown, path: string): string {
  if (typeof v !== 'string') throw new StatsDataError(`expected a string at ${path}`);
  return v;
}

function optString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function optNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function stringList(v: unknown): readonly string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function numberList(v: unknown, path: string): readonly number[] {
  return asArray(v, path).map((x, i) => asNumber(x, `${path}[${i}]`));
}

function stats5(v: unknown, path: string): Stats5 {
  const o = asObject(v, path);
  return {
    min: asNumber(o.min, `${path}.min`),
    max: asNumber(o.max, `${path}.max`),
    mean: asNumber(o.mean, `${path}.mean`),
    median: asNumber(o.median, `${path}.median`),
    sumAcrossCombos: asNumber(o.sum_across_combos, `${path}.sum_across_combos`),
  };
}

function ratioStats(v: unknown, path: string): RatioStats {
  const o = asObject(v, path);
  return {
    min: asNumber(o.min, `${path}.min`),
    max: asNumber(o.max, `${path}.max`),
    mean: asNumber(o.mean, `${path}.mean`),
    median: asNumber(o.median, `${path}.median`),
  };
}

/** `{ "12": 3 }` -> `[{ length: 12, count: 3 }]`, sorted by length. */
function tailBins(v: unknown, path: string): readonly TailBin[] {
  const o = asObject(v, path);
  const out: TailBin[] = [];
  for (const [k, n] of Object.entries(o)) {
    const length = Number.parseInt(k, 10);
    if (!Number.isFinite(length)) throw new StatsDataError(`bad tail length key at ${path}.${k}`);
    out.push({ length, count: asNumber(n, `${path}.${k}`) });
  }
  out.sort((a, b) => a.length - b.length);
  return out;
}

function comboStat(v: unknown, path: string): ComboStat {
  const o = asObject(v, path);
  const circuitLengths = [...numberList(o.circuit_lengths, `${path}.circuit_lengths`)].sort(
    (a, b) => a - b,
  );
  return {
    circuits: asNumber(o.circuits, `${path}.circuits`),
    tails: asNumber(o.tails, `${path}.tails`),
    maxCircuit: asNumber(o.max_circuit, `${path}.max_circuit`),
    maxTail: asNumber(o.max_tail, `${path}.max_tail`),
    circuitLengths,
    tailLengths: tailBins(o.tail_lengths, `${path}.tail_lengths`),
    nDistinctCircuitLengths:
      optNumber(o.n_distinct_circuit_lengths) ?? circuitLengths.length,
  };
}

function exemplar(v: unknown, valueKey: string): Exemplar | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Json;
  const combo = typeof o.combo === 'string' ? o.combo : null;
  const value = optNumber(o[valueKey]);
  if (combo === null || value === null) return null;
  const lengths = Array.isArray(o.circuit_lengths)
    ? o.circuit_lengths.filter((x): x is number => typeof x === 'number')
    : undefined;
  return {
    combo,
    value,
    ties: stringList(o.ties),
    ...(lengths ? { circuitLengths: lengths } : {}),
  };
}

function recordHolders(v: unknown, path: string): readonly RecordHolder[] {
  return asArray(v, path).map((h, i) => {
    const o = asObject(h, `${path}[${i}]`);
    const level = asString(o.level, `${path}[${i}].level`);
    if (level !== 'lvl4' && level !== 'lvl6') {
      throw new StatsDataError(`unknown level "${level}" at ${path}[${i}]`);
    }
    return {
      level,
      selection: asString(o.edge_selection, `${path}[${i}].edge_selection`),
      combo: asString(o.combo, `${path}[${i}].combo`),
    };
  });
}

function ratio(a: number, b: number): number | null {
  return b > 0 && Number.isFinite(a / b) ? a / b : null;
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Build the page model from the parsed JSON. Throws {@link StatsDataError}
 * with the offending path when the file does not match schema 1.0.
 */
export function parseStatsDataset(raw: unknown): StatsDataset {
  const root = asObject(raw, '$');
  const metaRaw = asObject(root.meta, 'meta');
  const selectionsRaw = asObject(metaRaw.edge_selections, 'meta.edge_selections');
  const unitsRaw = asObject(metaRaw.units, 'meta.units');
  const rowCountsRaw = asObject(metaRaw.row_counts, 'meta.row_counts');
  const levelsRaw = asObject(root.levels, 'levels');

  const selectionsInData = stringList(selectionsRaw.selections_in_data);
  if (selectionsInData.length === 0) {
    throw new StatsDataError('meta.edge_selections.selections_in_data is empty');
  }

  const meta: DatasetMeta = {
    title: optString(metaRaw.title, 'Spectre tiling strand statistics'),
    generated: optString(metaRaw.generated),
    schemaVersion: optString(metaRaw.schema_version, '1.0'),
    lengthUnit: optString(unitsRaw.length_unit, 'strand segments'),
    lengthUnitExplanation: optString(unitsRaw.explanation),
    rowCounts: {
      lvl4: optNumber(rowCountsRaw.lvl4) ?? 0,
      lvl6: optNumber(rowCountsRaw.lvl6) ?? 0,
    },
    tileNames: stringList(metaRaw.all_tile_names),
    appValidSelections: stringList(selectionsRaw.app_valid_selections),
    selectionsInData,
    absentFromData: stringList(selectionsRaw.absent_from_data),
    coverageNote: optString(selectionsRaw.note),
    caveats: stringList(metaRaw.caveats),
    sourceFiles: Object.fromEntries(
      Object.entries(asObject(metaRaw.source_files ?? {}, 'meta.source_files')).map(([k, v]) => [
        k,
        optString(v),
      ]),
    ),
    provenance: Object.fromEntries(
      Object.entries(asObject(metaRaw.provenance ?? {}, 'meta.provenance')).map(([k, v]) => [
        k,
        optString(v),
      ]),
    ),
  };

  // --- per (level, selection, combo) stats -------------------------------
  const perLevel: Record<LevelKey, Map<string, Map<string, ComboStat>>> = {
    lvl4: new Map(),
    lvl6: new Map(),
  };
  const levelSummaries: Record<LevelKey, Map<string, SelectionLevelSummary>> = {
    lvl4: new Map(),
    lvl6: new Map(),
  };

  for (const level of LEVEL_KEYS) {
    const lvl = asObject(levelsRaw[level], `levels.${level}`);
    const sels = asObject(lvl.edge_selections, `levels.${level}.edge_selections`);
    for (const selection of selectionsInData) {
      const path = `levels.${level}.edge_selections.${selection}`;
      const sel = asObject(sels[selection], path);
      const combosRaw = asObject(sel.combos, `${path}.combos`);
      const combos = new Map<string, ComboStat>();
      for (const [combo, stat] of Object.entries(combosRaw)) {
        combos.set(combo, comboStat(stat, `${path}.combos.${combo}`));
      }
      perLevel[level].set(selection, combos);

      const ex = asObject(sel.exemplars ?? {}, `${path}.exemplars`);
      levelSummaries[level].set(selection, {
        nCombos: optNumber(sel.n_combos) ?? combos.size,
        circuits: stats5(sel.circuits_stats, `${path}.circuits_stats`),
        tails: stats5(sel.tails_stats, `${path}.tails_stats`),
        maxCircuit: stats5(sel.max_circuit_stats, `${path}.max_circuit_stats`),
        maxTail: stats5(sel.max_tail_stats, `${path}.max_tail_stats`),
        distinctLengthsObserved: numberList(
          sel.distinct_circuit_lengths_observed ?? [],
          `${path}.distinct_circuit_lengths_observed`,
        ),
        tailAggregate: tailBins(
          sel.tail_length_distribution_aggregate ?? {},
          `${path}.tail_length_distribution_aggregate`,
        ),
        circuitFreeCombos: stringList(sel.circuit_free_combos),
        tailFreeCombos: stringList(sel.tail_free_combos),
        exemplars: {
          longestCircuit: exemplar(ex.longest_circuit, 'max_circuit'),
          longestTail: exemplar(ex.longest_tail, 'max_tail'),
          mostDistinctCircuitLengths: exemplar(ex.most_distinct_circuit_lengths, 'n_distinct'),
        },
      });
    }
  }

  // --- rows (both depths joined) ----------------------------------------
  const rows: ConfigRow[] = [];
  const selectionOrder = [...selectionsInData].sort(
    (a, b) => (perLevel.lvl4.get(b)?.size ?? 0) - (perLevel.lvl4.get(a)?.size ?? 0) || a.localeCompare(b),
  );

  for (const selection of selectionOrder) {
    const at4 = perLevel.lvl4.get(selection);
    const at6 = perLevel.lvl6.get(selection);
    if (!at4 || !at6) throw new StatsDataError(`selection ${selection} missing from a level`);
    for (const combo of [...at4.keys()].sort()) {
      const lvl4 = at4.get(combo);
      const lvl6 = at6.get(combo);
      if (!lvl4 || !lvl6) {
        throw new StatsDataError(`${selection}/${combo} is missing at one of the two levels`);
      }
      const stable = sameSet(lvl4.circuitLengths, lvl6.circuitLengths);
      const known = new Set(lvl4.circuitLengths);
      rows.push({
        id: `${selection}-${combo}`,
        selection,
        combo,
        lvl4,
        lvl6,
        circuitRatio: ratio(lvl6.circuits, lvl4.circuits),
        tailRatio: ratio(lvl6.tails, lvl4.tails),
        circuitFree: lvl4.maxCircuit === 0 && lvl6.maxCircuit === 0,
        stableCircuitLengths: stable,
        newLengthsAtLvl6: lvl6.circuitLengths.filter((l) => !known.has(l)),
      });
    }
  }

  const rowsById = new Map(rows.map((r) => [r.id, r]));

  // --- selection summaries ----------------------------------------------
  const selections: SelectionSummary[] = selectionOrder.map((selection) => {
    const mine = rows.filter((r) => r.selection === selection);
    const tailsPerCombo = {} as Record<LevelKey, number | null>;
    for (const level of LEVEL_KEYS) {
      const values = new Set(mine.map((r) => statAt(r, level).tails));
      tailsPerCombo[level] = values.size === 1 ? [...values][0] : null;
    }
    return {
      selection,
      nCombos: mine.length,
      levels: {
        lvl4: levelSummaries.lvl4.get(selection)!,
        lvl6: levelSummaries.lvl6.get(selection)!,
      },
      tailsPerCombo,
      tailRatio:
        tailsPerCombo.lvl4 !== null && tailsPerCombo.lvl6 !== null
          ? ratio(tailsPerCombo.lvl6, tailsPerCombo.lvl4)
          : null,
      nStableCircuitLengthSets: mine.filter((r) => r.stableCircuitLengths).length,
      nCircuitFree: mine.filter((r) => r.circuitFree).length,
    };
  });

  // --- records + growth --------------------------------------------------
  const recordsRaw = asObject(root.records, 'records');
  const lc = asObject(recordsRaw.longest_circuit, 'records.longest_circuit');
  const lt = asObject(recordsRaw.longest_tail, 'records.longest_tail');
  const md = asObject(
    recordsRaw.most_distinct_circuit_lengths,
    'records.most_distinct_circuit_lengths',
  );
  const records: DatasetRecords = {
    longestCircuit: {
      lengthSegments: asNumber(lc.length_segments, 'records.longest_circuit.length_segments'),
      holders: recordHolders(lc.holders, 'records.longest_circuit.holders'),
      sameConfigMaxCircuitAtLvl4: optNumber(lc.same_config_max_circuit_at_lvl4),
      growthFactor: optNumber(lc.lvl4_to_lvl6_growth_factor),
    },
    longestTail: {
      lengthSegments: asNumber(lt.length_segments, 'records.longest_tail.length_segments'),
      holders: recordHolders(lt.holders, 'records.longest_tail.holders'),
    },
    mostDistinctCircuitLengths: {
      nDistinct: asNumber(md.n_distinct, 'records.most_distinct_circuit_lengths.n_distinct'),
      holders: recordHolders(md.holders, 'records.most_distinct_circuit_lengths.holders'),
    },
  };

  const cmpRaw = asObject(root.lvl4_vs_lvl6, 'lvl4_vs_lvl6');
  const sumRaw = asObject(cmpRaw.summary, 'lvl4_vs_lvl6.summary');
  const growth: GrowthSummary = {
    stableCircuitLengthSets: optNumber(sumRaw.stable_circuit_length_sets) ?? 0,
    pairsWithNewLengthsAtLvl6: optNumber(sumRaw.pairs_with_new_lengths_at_lvl6) ?? 0,
    pairsWithLostLengthsAtLvl6: optNumber(sumRaw.pairs_with_lost_lengths_at_lvl6) ?? 0,
    nCircuitBearingPairs: optNumber(sumRaw.n_circuit_bearing_pairs) ?? 0,
    circuitCountRatio: ratioStats(
      sumRaw.circuit_count_ratio_stats,
      'lvl4_vs_lvl6.summary.circuit_count_ratio_stats',
    ),
    tailCountRatio: ratioStats(
      sumRaw.tail_count_ratio_stats,
      'lvl4_vs_lvl6.summary.tail_count_ratio_stats',
    ),
    maxCircuitGrew: optNumber(sumRaw.max_circuit_grew) ?? 0,
    maxCircuitSame: optNumber(sumRaw.max_circuit_same) ?? 0,
    maxTailGrew: optNumber(sumRaw.max_tail_grew) ?? 0,
  };

  const totals = {} as Record<LevelKey, LevelTotals>;
  for (const level of LEVEL_KEYS) {
    totals[level] = {
      circuits: rows.reduce((acc, r) => acc + statAt(r, level).circuits, 0),
      tails: rows.reduce((acc, r) => acc + statAt(r, level).tails, 0),
      configs: rows.length,
    };
  }

  return { meta, records, growth, rows, rowsById, selections, totals };
}

// ---------------------------------------------------------------------------
// Derived views used by the featured findings
// ---------------------------------------------------------------------------

/** The space-filling-curve candidates: no circuits at either analysed depth. */
export function circuitFreeRows(data: StatsDataset): readonly ConfigRow[] {
  return data.rows.filter((r) => r.circuitFree);
}

/** Golden-ratio tail story: one entry per selection, ordered by lvl6 tails. */
export interface TailGrowthPoint {
  readonly selection: string;
  readonly lvl4: number;
  readonly lvl6: number;
  readonly ratio: number | null;
}

export function tailGrowth(data: StatsDataset): readonly TailGrowthPoint[] {
  return data.selections
    .map((s) => ({
      selection: s.selection,
      lvl4: s.tailsPerCombo.lvl4 ?? s.levels.lvl4.tails.max,
      lvl6: s.tailsPerCombo.lvl6 ?? s.levels.lvl6.tails.max,
      ratio: s.tailRatio,
    }))
    .sort((a, b) => b.lvl6 - a.lvl6);
}

/** φ⁶ — where the tail-count ratios cluster (STATS_NOTES finding 2). */
export const PHI = (1 + Math.sqrt(5)) / 2;
export const PHI_6 = PHI ** 6;

/** The three highest Fibonacci numbers up to `n`, used to label 610 / 10946. */
export function fibonacciIndex(n: number): number | null {
  let a = 0;
  let b = 1;
  let i = 1;
  while (b < n && i < 90) {
    [a, b] = [b, a + b];
    i += 1;
  }
  return b === n ? i : null;
}

/**
 * Every row whose circuit growth equals the dataset's slowest / fastest
 * ratio — ties included. The extremes are genuinely shared (×61.98 by two
 * configurations, ×139.68 by three), so the page never names just one.
 * Compared at the dataset's own 2-decimal rounding.
 */
export function ratioExtremeRows(
  data: StatsDataset,
  which: 'min' | 'max',
): readonly ConfigRow[] {
  const target =
    which === 'min' ? data.growth.circuitCountRatio.min : data.growth.circuitCountRatio.max;
  return data.rows.filter(
    (r) => r.circuitRatio !== null && Math.abs(Math.round(r.circuitRatio * 100) / 100 - target) < 5e-3,
  );
}

/** Rows holding a dataset record, for the "featured" cards. */
export function rowsForHolders(
  data: StatsDataset,
  holders: readonly RecordHolder[],
): readonly ConfigRow[] {
  const out: ConfigRow[] = [];
  for (const h of holders) {
    const row = data.rowsById.get(`${h.selection}-${h.combo}`);
    if (row && !out.includes(row)) out.push(row);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

export function formatCount(n: number): string {
  return NUMBER_FORMAT.format(Math.round(n));
}

/** `×74.8`, or `—` when the ratio is undefined (a zero denominator). */
export function formatRatio(r: number | null): string {
  if (r === null) return '—';
  return `×${r >= 100 ? r.toFixed(0) : r.toFixed(1)}`;
}

/** Compact axis label: 1, 12, 1.2k, 250k, 1.2M. */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}k`;
  return String(Math.round(n));
}

/** `2578-0000001100` — the canonical share string used across the site. */
export function shareString(row: Pick<ConfigRow, 'selection' | 'combo'>): string {
  return `${row.selection}-${row.combo}`;
}
