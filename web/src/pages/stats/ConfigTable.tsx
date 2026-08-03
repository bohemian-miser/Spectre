/**
 * The browsable table of every analysed `(edge_selection, combo)` configuration
 * plus its filter controls.
 *
 * Each numeric cell carries **both** analysed depths: the active level in the
 * foreground, the other one underneath, so the level toggle changes emphasis
 * and sort order without hiding half the dataset.
 */

import {
  LEVEL_KEYS,
  LEVEL_LABEL,
  formatCount,
  formatRatio,
  otherLevel,
  statAt,
  type ComboStat,
  type ConfigRow,
  type LevelKey,
  type SelectionSummary,
} from './statsData';
import { SORT_LABELS, type RowFlavor, type SortKey, type SortSpec, type TableFilter } from './statsTable';
import { selectionColor } from './selectionTheme';

const FLAVORS: readonly { readonly id: RowFlavor; readonly label: string }[] = [
  { id: 'all', label: 'All configurations' },
  { id: 'circuit-free', label: 'Circuit-free only' },
  { id: 'stable-lengths', label: 'Frozen circuit lengths' },
  { id: 'new-lengths', label: 'Gains lengths at level 6' },
];

export interface TableControlsProps {
  readonly selections: readonly SelectionSummary[];
  readonly filter: TableFilter;
  readonly onFilter: (next: TableFilter) => void;
  readonly level: LevelKey;
  readonly onLevel: (level: LevelKey) => void;
  readonly shown: number;
  readonly total: number;
}

export function TableControls(props: TableControlsProps): JSX.Element {
  const { selections, filter, onFilter, level, onLevel, shown, total } = props;
  const toggle = (selection: string): void => {
    const on = filter.selections.includes(selection);
    onFilter({
      ...filter,
      selections: on
        ? filter.selections.filter((s) => s !== selection)
        : [...filter.selections, selection],
    });
  };

  return (
    <div className="stats-controls">
      <div className="stats-control-row">
        <span className="stats-control-label" id="stats-level-label">
          Level
        </span>
        <div className="stats-segmented" role="group" aria-labelledby="stats-level-label">
          {LEVEL_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`stats-seg ${level === key ? 'is-on' : ''}`}
              aria-pressed={level === key}
              onClick={() => onLevel(key)}
            >
              {LEVEL_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-control-row">
        <span className="stats-control-label" id="stats-sel-label">
          Edge selection
        </span>
        <div className="edge-legend-chips" role="group" aria-labelledby="stats-sel-label">
          {selections.map((s) => {
            const on = filter.selections.includes(s.selection);
            return (
              <button
                key={s.selection}
                type="button"
                className={`edge-chip stats-sel-chip ${on ? 'is-on' : ''}`}
                aria-pressed={on}
                data-selection={s.selection}
                onClick={() => toggle(s.selection)}
              >
                <span
                  className="edge-chip-swatch"
                  style={{ background: selectionColor(s.selection) }}
                  aria-hidden="true"
                />
                {s.selection}
                <span className="stats-chip-count">{s.nCombos}</span>
              </button>
            );
          })}
          {filter.selections.length > 0 ? (
            <button
              type="button"
              className="edge-chip stats-clear"
              onClick={() => onFilter({ ...filter, selections: [] })}
            >
              clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="stats-control-row">
        <label className="stats-control-label" htmlFor="stats-search">
          Combo
        </label>
        <input
          id="stats-search"
          type="text"
          inputMode="numeric"
          placeholder="e.g. 0100 or 2578-0000001100"
          value={filter.query}
          onChange={(e) => onFilter({ ...filter, query: e.target.value })}
        />
        <label className="stats-control-label" htmlFor="stats-flavor">
          Show
        </label>
        <select
          id="stats-flavor"
          value={filter.flavor}
          onChange={(e) => onFilter({ ...filter, flavor: e.target.value as RowFlavor })}
        >
          {FLAVORS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <span className="stats-count muted" data-testid="stats-row-count">
          {shown === total ? `${total} configurations` : `${shown} of ${total} configurations`}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface ColumnDef {
  readonly key: SortKey;
  readonly label: string;
  readonly pick?: (s: ComboStat) => number;
}

const COLUMNS: readonly ColumnDef[] = [
  { key: 'circuits', label: 'Circuits', pick: (s) => s.circuits },
  { key: 'tails', label: 'Tails', pick: (s) => s.tails },
  { key: 'maxCircuit', label: 'Max circuit', pick: (s) => s.maxCircuit },
  { key: 'maxTail', label: 'Max tail', pick: (s) => s.maxTail },
  { key: 'distinct', label: 'Lengths', pick: (s) => s.nDistinctCircuitLengths },
];

export interface ConfigTableProps {
  /** Already filtered and sorted. */
  readonly rows: readonly ConfigRow[];
  readonly level: LevelKey;
  readonly sort: SortSpec;
  readonly onSort: (key: SortKey) => void;
  readonly selectedId: string | null;
  readonly onSelect: (row: ConfigRow) => void;
}

function ariaSort(sort: SortSpec, key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none';
  return sort.dir === 'asc' ? 'ascending' : 'descending';
}

export function ConfigTable(props: ConfigTableProps): JSX.Element {
  const { rows, level, sort, onSort, selectedId, onSelect } = props;
  const other = otherLevel(level);

  return (
    <div className="stats-table-scroll">
      <table className="stats-table">
        <caption className="stats-table-caption">
          Every analysed configuration. Each cell shows {LEVEL_LABEL[level]} in bold with{' '}
          {LEVEL_LABEL[other]} beneath it; lengths count strand segments. Click a row for its
          circuit-length set, tail histogram and explorer links.
        </caption>
        <thead>
          <tr>
            <th scope="col" aria-sort={ariaSort(sort, 'config')}>
              <button type="button" className="stats-sort" onClick={() => onSort('config')}>
                Configuration
                <SortMark active={sort.key === 'config'} dir={sort.dir} />
              </button>
            </th>
            {COLUMNS.map((c) => (
              <th key={c.key} scope="col" className="is-num" aria-sort={ariaSort(sort, c.key)}>
                <button
                  type="button"
                  className="stats-sort"
                  onClick={() => onSort(c.key)}
                  title={`Sort by ${SORT_LABELS[c.key].toLowerCase()} at ${LEVEL_LABEL[level]}`}
                >
                  {c.label}
                  <SortMark active={sort.key === c.key} dir={sort.dir} />
                </button>
              </th>
            ))}
            <th scope="col" className="is-num" aria-sort={ariaSort(sort, 'circuitRatio')}>
              <button type="button" className="stats-sort" onClick={() => onSort('circuitRatio')}>
                Growth
                <SortMark active={sort.key === 'circuitRatio'} dir={sort.dir} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = row.id === selectedId;
            return (
              <tr
                key={row.id}
                className={`stats-row ${isSelected ? 'is-selected' : ''}`}
                data-row-id={row.id}
                onClick={() => onSelect(row)}
              >
                <th scope="row" className="stats-row-head">
                  <button
                    type="button"
                    className="stats-row-open"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(row);
                    }}
                  >
                    <span
                      className="stats-sel-dot"
                      style={{ background: selectionColor(row.selection) }}
                      aria-hidden="true"
                    />
                    <span className="stats-sel-name">{row.selection}</span>
                    <code className="stats-combo">{row.combo}</code>
                  </button>
                </th>
                {COLUMNS.map((c) => {
                  const pick = c.pick!;
                  return (
                    <td key={c.key} className="is-num">
                      <span className="stats-cell-primary">{formatCount(pick(statAt(row, level)))}</span>
                      <span className="stats-cell-secondary">
                        {formatCount(pick(statAt(row, other)))}
                      </span>
                    </td>
                  );
                })}
                <td className="is-num">
                  <span className="stats-cell-primary">{formatRatio(row.circuitRatio)}</span>
                  <span className="stats-cell-secondary">
                    {row.circuitFree ? 'circuit-free' : 'circuits'}
                  </span>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length + 2} className="stats-empty-row">
                No configuration matches these filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function SortMark(props: { readonly active: boolean; readonly dir: 'asc' | 'desc' }): JSX.Element {
  return (
    <span className={`stats-sort-mark ${props.active ? 'is-active' : ''}`} aria-hidden="true">
      {props.active ? (props.dir === 'asc' ? '▲' : '▼') : '·'}
    </span>
  );
}
