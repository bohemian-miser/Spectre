/**
 * Circuits & stats page (DESIGN.md §7.3).
 *
 * Everything on this page comes from one precomputed, independently verified
 * dataset — `public/data/circuit_stats.json`, documented in
 * `docs/STATS_NOTES.md` — fetched at runtime and turned into a model by
 * `pages/stats/statsData.ts`. The page has three jobs:
 *
 *  1. say what was analysed, honestly (6 of the 8 valid edge selections, 270
 *     combos per level, and a coverage skew worth naming);
 *  2. tell the verified stories with real numbers and hand-rolled SVG figures;
 *  3. let anyone browse all 270 configurations, sort and filter them, open one
 *     up, and rebuild that exact scene in the Explorer.
 *
 * State that is worth sharing (level + open row) mirrors into the hash as
 * `#/stats?ds=lvl6&sel=2578&combo=0000001100` (§9.3).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { ConfigDetail } from './stats/ConfigDetail';
import { ConfigTable, TableControls } from './stats/ConfigTable';
import { Findings } from './stats/Findings';
import { parseStatsHash, statsHash } from './stats/explorerLink';
import {
  LEVEL_DEPTH,
  LEVEL_LABEL,
  formatCount,
  type ConfigRow,
  type LevelKey,
  type StatsDataset,
} from './stats/statsData';
import {
  DEFAULT_SORT,
  EMPTY_FILTER,
  filterRows,
  nextSort,
  sortRows,
  type SortKey,
  type SortSpec,
  type TableFilter,
} from './stats/statsTable';
import { statsDataUrl, useStatsData, type StatsLoadState } from './stats/useStatsData';
import '../styles/stats.css';

export interface StatsPageProps {
  /** Deploy base; defaults to Vite's `BASE_URL` (`/Spectre/` in production). */
  readonly base?: string;
  /** Override the dataset URL (tests point this at a fixture). */
  readonly dataUrl?: string;
  /** Mirror level + open row into `location.hash` (default true). */
  readonly syncUrl?: boolean;
}

function defaultBase(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? '/';
}

export default function StatsPage(props: StatsPageProps = {}): JSX.Element {
  const base = props.base ?? defaultBase();
  const syncUrl = props.syncUrl ?? true;
  const url = props.dataUrl ?? statsDataUrl(base);
  const { state, reload } = useStatsData(url);

  const initial = useMemo(
    () =>
      syncUrl && typeof window !== 'undefined'
        ? parseStatsHash(window.location.hash)
        : { level: 'lvl6' as LevelKey, rowId: null },
    [syncUrl],
  );

  const [level, setLevel] = useState<LevelKey>(initial.level);
  const [selectedId, setSelectedId] = useState<string | null>(initial.rowId);
  const [filter, setFilter] = useState<TableFilter>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortSpec>({ ...DEFAULT_SORT, level: initial.level });
  const tableRef = useRef<HTMLElement | null>(null);

  // Level drives which depth the numeric sorts read.
  useEffect(() => {
    setSort((s) => (s.level === level ? s : { ...s, level }));
  }, [level]);

  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const next = statsHash({ level, rowId: selectedId });
    if (window.location.hash !== next) {
      window.history.replaceState(window.history.state, '', next);
    }
  }, [syncUrl, level, selectedId]);

  const openRow = useCallback((row: ConfigRow) => {
    setSelectedId(row.id);
    const host = tableRef.current;
    if (host && typeof host.scrollIntoView === 'function') {
      host.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, []);

  const toggleSelectionFilter = useCallback((selection: string) => {
    setFilter((f) => ({
      ...f,
      selections: f.selections.includes(selection)
        ? f.selections.filter((s) => s !== selection)
        : [...f.selections, selection],
    }));
  }, []);

  const onSort = useCallback((key: SortKey) => setSort((s) => nextSort(s, key)), []);

  if (state.status !== 'ready') {
    return <StatsFallback state={state} url={url} onRetry={reload} />;
  }
  const { data } = state;

  return (
    <StatsPageBody
      data={data}
      base={base}
      level={level}
      onLevel={setLevel}
      filter={filter}
      onFilter={setFilter}
      sort={sort}
      onSort={onSort}
      selectedId={selectedId}
      onOpenRow={openRow}
      onCloseRow={() => setSelectedId(null)}
      onToggleSelection={toggleSelectionFilter}
      tableRef={tableRef}
    />
  );
}

// ---------------------------------------------------------------------------

interface BodyProps {
  readonly data: StatsDataset;
  readonly base: string;
  readonly level: LevelKey;
  readonly onLevel: (level: LevelKey) => void;
  readonly filter: TableFilter;
  readonly onFilter: (filter: TableFilter) => void;
  readonly sort: SortSpec;
  readonly onSort: (key: SortKey) => void;
  readonly selectedId: string | null;
  readonly onOpenRow: (row: ConfigRow) => void;
  readonly onCloseRow: () => void;
  readonly onToggleSelection: (selection: string) => void;
  readonly tableRef: MutableRefObject<HTMLElement | null>;
}

function StatsPageBody(props: BodyProps): JSX.Element {
  const {
    data,
    base,
    level,
    onLevel,
    filter,
    onFilter,
    sort,
    onSort,
    selectedId,
    onOpenRow,
    onCloseRow,
    onToggleSelection,
    tableRef,
  } = props;

  const visible = useMemo(
    () => sortRows(filterRows(data.rows, filter), sort),
    [data.rows, filter, sort],
  );
  const selected = selectedId ? data.rowsById.get(selectedId) ?? null : null;
  const meta = data.meta;
  const missing = meta.absentFromData.map((s) => (s === '' ? '∅' : s));

  return (
    <div className="stats-page">
      <header className="stats-hero">
        <h1>Circuits &amp; stats</h1>
        <p className="stats-lede">
          Every strand in a Spectre patch is either a closed <strong>circuit</strong> or an open{' '}
          <strong>tail</strong>. This page is the precomputed census of both:{' '}
          {formatCount(data.rows.length)} configurations, each analysed at two supertile depths, with
          every length measured in <strong>strand segments</strong> — one segment is one strand
          crossing one tile.
        </p>
      </header>

      <section className="stats-overview" aria-labelledby="stats-overview-h">
        <h2 id="stats-overview-h">What was analysed</h2>
        <dl className="stats-tiles is-wide">
          <div className="stats-tile">
            <dt>Configurations</dt>
            <dd>{formatCount(data.rows.length)}</dd>
            <dd className="stats-tile-sub">per level, identical key sets at both depths</dd>
          </div>
          <div className="stats-tile">
            <dt>Edge selections</dt>
            <dd>
              {meta.selectionsInData.length} of {meta.appValidSelections.length}
            </dd>
            <dd className="stats-tile-sub">valid selections have data</dd>
          </div>
          <div className="stats-tile">
            <dt>Depths</dt>
            <dd>
              {LEVEL_DEPTH.lvl4} &amp; {LEVEL_DEPTH.lvl6}
            </dd>
            <dd className="stats-tile-sub">supertile iterations from the Delta metatile</dd>
          </div>
          <div className="stats-tile">
            <dt>Circuits at level 6</dt>
            <dd>{formatCount(data.totals.lvl6.circuits)}</dd>
            <dd className="stats-tile-sub">
              summed across combos · {formatCount(data.totals.lvl4.circuits)} at level 4
            </dd>
          </div>
          <div className="stats-tile">
            <dt>Tails at level 6</dt>
            <dd>{formatCount(data.totals.lvl6.tails)}</dd>
            <dd className="stats-tile-sub">
              summed across combos · {formatCount(data.totals.lvl4.tails)} at level 4
            </dd>
          </div>
          <div className="stats-tile">
            <dt>Longest strand</dt>
            <dd>{formatCount(data.records.longestTail.lengthSegments)}</dd>
            <dd className="stats-tile-sub">
              segments · longest circuit {formatCount(data.records.longestCircuit.lengthSegments)}
            </dd>
          </div>
        </dl>

        <p className="stats-caveat">
          <strong>Coverage caveat.</strong> Only {meta.selectionsInData.length} of the{' '}
          {meta.appValidSelections.length} edge selections the app considers valid appear in the
          data — {missing.join(' and ')} were never run — and the combos are lopsided across the
          six that were:{' '}
          {data.selections.map((s) => `${s.selection} ×${s.nCombos}`).join(', ')}. Roughly{' '}
          {Math.round((data.selections[0].nCombos / data.rows.length) * 100)}% of every “across all
          configurations” number below therefore comes from one family. Per-selection totals are{' '}
          <em>summed across combos</em>, which are mutually exclusive alternatives for the same
          region: no single tiling ever has all of them at once.
        </p>

        <details className="stats-more">
          <summary>How to read these numbers</summary>
          <ul className="stats-caveat-list">
            <li>
              <strong>Lengths are segments.</strong> {meta.lengthUnitExplanation}
            </li>
            {meta.caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </details>
      </section>

      <Findings
        data={data}
        base={base}
        onOpenRow={onOpenRow}
        onFilterSelection={onToggleSelection}
        activeSelections={filter.selections}
        selectedId={selectedId}
      />

      <section className="stats-browse" aria-labelledby="stats-browse-h" ref={tableRef}>
        <h2 id="stats-browse-h">Browse every configuration</h2>
        <p className="muted">
          {formatCount(data.rows.length)} rows — one per (edge selection, combo) pair. Sort by any
          column at {LEVEL_LABEL[level]}, filter by family, or search a combination string.
        </p>
        <TableControls
          selections={data.selections}
          filter={filter}
          onFilter={onFilter}
          level={level}
          onLevel={onLevel}
          shown={visible.length}
          total={data.rows.length}
        />
        <ConfigTable
          rows={visible}
          level={level}
          sort={sort}
          onSort={onSort}
          selectedId={selectedId}
          onSelect={onOpenRow}
        />
        {selected ? (
          <ConfigDetail row={selected} level={level} base={base} onClose={onCloseRow} />
        ) : (
          <p className="stats-detail-hint muted">
            Select a row to see its circuit-length set, its full tail-length census, and links that
            rebuild the configuration in the Explorer.
          </p>
        )}
      </section>

      <footer className="stats-provenance">
        <h2>Provenance</h2>
        <p className="muted">
          {meta.title} · schema {meta.schemaVersion} · generated {meta.generated} from{' '}
          {Object.entries(meta.sourceFiles)
            .filter(([k]) => k !== 'note')
            .map(([, v]) => v)
            .join(' and ')}
          .
        </p>
        {meta.provenance.verification ? (
          <p className="muted">{meta.provenance.verification}</p>
        ) : null}
        {meta.provenance.readme_erratum ? (
          <p className="muted">{meta.provenance.readme_erratum}</p>
        ) : null}
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------

function StatsFallback(props: {
  readonly state: StatsLoadState;
  readonly url: string;
  readonly onRetry: () => void;
}): JSX.Element {
  const { state, url, onRetry } = props;
  if (state.status === 'loading') {
    return (
      <div className="stats-page">
        <h1>Circuits &amp; stats</h1>
        <p className="stats-loading" aria-live="polite" aria-busy="true">
          Loading the circuit dataset…
        </p>
      </div>
    );
  }
  return (
    <div className="stats-page">
      <h1>Circuits &amp; stats</h1>
      <div className="stats-error-panel" role="alert">
        <p>
          <strong>The circuit dataset could not be loaded.</strong>
        </p>
        <p className="muted">
          {state.status === 'error' ? state.message : 'unknown error'} — tried{' '}
          <code>{url}</code>.
        </p>
        <p>
          <button type="button" className="stats-retry" onClick={onRetry}>
            Try again
          </button>
        </p>
        <p className="muted">
          Everything else on the site still works: the Explorer computes circuits and tails live in
          your browser.
        </p>
      </div>
    </div>
  );
}
