/** A rule's combinations, sortable and filtered, one compact row each, with their marks (`MARKS`). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MARKS, marksOf, SHORT, type IndexRow, type Mark } from './pageData';
import { compact, limitPct, nf } from './data';

export type SortKey = 'combo' | 'floor' | 'lastNew' | 'found' | 'largest' | 'monsters' | 'limit';

const COLUMNS: readonly { key: SortKey; label: string; title: string }[] = [
  { key: 'combo', label: 'Combination', title: 'Combination digits' },
  { key: 'floor', label: 'First', title: 'Level the first circuit closes at (the floor)' },
  { key: 'lastNew', label: 'Last found', title: 'Highest level a foundational circuit first closes at' },
  { key: 'found', label: 'Foundational', title: 'Foundational circuits' },
  { key: 'largest', label: 'Largest', title: 'Tiles of the largest foundational circuit' },
  { key: 'monsters', label: 'M', title: 'Monsters: late or giant circuits, and the combination itself when short' },
  { key: 'limit', label: 'Limit', title: 'Share of chords on known circuits in the limit' },
];

export const MARK_KEYS = Object.keys(MARKS) as Mark[];

export interface Filters {
  readonly search: string;
  readonly floor: number | null;
  readonly lastNew: number | null;
  /** Rows with any of these marks; none chosen, every row. */
  readonly marks: readonly Mark[];
}

export const NO_FILTERS: Filters = { search: '', floor: null, lastNew: null, marks: [] };

/** The rows the search and level filters keep, before the marks. */
function unmarked(rows: readonly IndexRow[], f: Filters): IndexRow[] {
  const digits = f.search.replace(/[^0-9a-z]/gi, '').toLowerCase();
  return rows.filter((r) => r.combo.startsWith(digits) && (f.floor === null || r.floor === f.floor) && (f.lastNew === null || r.lastNew === f.lastNew));
}

export function filterRows(rows: readonly IndexRow[], f: Filters): IndexRow[] {
  return unmarked(rows, f).filter((r) => !f.marks.length || f.marks.some((m) => MARKS[m].has(r)));
}

/** Per mark, the rows the other filters keep that have it: what choosing that mark alone shows. */
export function markCounts(rows: readonly IndexRow[], f: Filters): Record<Mark, number> {
  const kept = unmarked(rows, f);
  return Object.fromEntries(MARK_KEYS.map((m) => [m, kept.filter((r) => MARKS[m].has(r)).length])) as Record<Mark, number>;
}

export function sortRows(rows: readonly IndexRow[], sort: { key: SortKey; desc: boolean }): IndexRow[] {
  const k = sort.key;
  return [...rows].sort((a, b) => {
    const d = k === 'combo' ? a.combo.localeCompare(b.combo) : a[k] - b[k];
    return (sort.desc ? -d : d) || a.combo.localeCompare(b.combo);
  });
}

/** Where a column's sort starts: the combination and the limit (short ones first) ascending, the counts largest first. */
const firstDesc = (k: SortKey): boolean => k !== 'combo' && k !== 'limit';
const BY_LIMIT = { key: 'limit', desc: false } as const;

/** Rows drawn at most; the search and filters narrow a longer list. */
export const ROWS_DRAWN = 2000;

export function ComboList(props: { rows: readonly IndexRow[]; selected: string | null; onSelect: (combo: string) => void }): JSX.Element {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'combo', desc: false });
  const floors = useMemo(() => [...new Set(props.rows.map((r) => r.floor))].sort(), [props.rows]);
  const lasts = useMemo(() => [...new Set(props.rows.map((r) => r.lastNew))].sort(), [props.rows]);
  const counts = useMemo(() => markCounts(props.rows, filters), [props.rows, filters]);
  // a mark no combination of the rule has gets no toggle
  const present = useMemo(() => MARK_KEYS.filter((m) => props.rows.some((r) => MARKS[m].has(r))), [props.rows]);
  const shown = useMemo(() => sortRows(filterRows(props.rows, filters), sort), [props.rows, filters, sort]);

  // arrow keys move through the rows shown, wherever the focus is but a menu
  const ref = useRef({ shown, selected: props.selected, onSelect: props.onSelect });
  ref.current = { shown, selected: props.selected, onSelect: props.onSelect };
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement || e.altKey || e.metaKey || e.ctrlKey) return;
      const { shown: list, selected, onSelect } = ref.current;
      if (!list.length) return;
      const at = list.findIndex((r) => r.combo === selected);
      const next = at < 0 ? 0 : Math.max(0, Math.min(list.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)));
      e.preventDefault();
      onSelect(list[next].combo);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // scrolls the list only, never the page
    const box = body.current;
    const row = box?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!box || !row) return;
    const head = box.querySelector<HTMLElement>('.fd-head')?.offsetHeight ?? 0;
    if (row.offsetTop - head < box.scrollTop) box.scrollTop = row.offsetTop - head;
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight;
  }, [props.selected, shown]);

  const set = (patch: Partial<Filters>): void => setFilters((f) => ({ ...f, ...patch }));
  const toggle = (m: Mark): void => {
    const on = !filters.marks.includes(m);
    setFilters((f) => ({ ...f, marks: on ? [...f.marks, m] : f.marks.filter((x) => x !== m) }));
    // the short ones are read by how short
    if (on && m === 'short') setSort(BY_LIMIT);
  };
  return (
    <div className="fd-list">
      <div className="fd-filters">
        <input
          type="search"
          placeholder="Combination digits"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          aria-label="Search by combination digits"
          data-testid="fd-search"
        />
        <label>
          First
          <select value={filters.floor ?? ''} onChange={(e) => set({ floor: e.target.value ? Number(e.target.value) : null })}>
            <option value="">any</option>
            {floors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label>
          Last found
          <select value={filters.lastNew ?? ''} onChange={(e) => set({ lastNew: e.target.value ? Number(e.target.value) : null })} aria-label="Last foundational level">
            <option value="">any</option>
            {lasts.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="fd-marks" role="group" aria-label="Show combinations with these marks">
        {present.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={filters.marks.includes(m)}
            title={MARKS[m].title}
            onClick={() => toggle(m)}
            data-testid={`fd-mark-${m}`}
          >
            <i className={`fd-dot fd-mark-${m}`} /> {MARKS[m].label} <span className="fd-mark-n">{counts[m]}</span>
          </button>
        ))}
      </div>
      <div className="fd-rows" role="listbox" aria-label="Combinations" ref={body} data-testid="fd-rows">
        <div className="fd-row fd-head" role="presentation">
          {COLUMNS.map((c) => (
            <button
              key={c.key}
              type="button"
              title={`Sort by ${c.title.toLowerCase()}`}
              className={sort.key === c.key ? 'fd-sorted' : undefined}
              onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : firstDesc(c.key) }))}
              data-testid={`fd-sort-${c.key}`}
            >
              {c.label}
              {sort.key === c.key ? (sort.desc ? ' ↓' : ' ↑') : ''}
            </button>
          ))}
          <span />
        </div>
        {(shown.length > ROWS_DRAWN ? shown.slice(0, ROWS_DRAWN) : shown).map((r) => {
          const marks = marksOf(r);
          return (
            <div key={r.combo} role="option" aria-selected={r.combo === props.selected} className="fd-row" onClick={() => props.onSelect(r.combo)} data-testid="fd-row">
              <span className="fd-digits">{r.combo}</span>
              <span>{r.floor}</span>
              <span>{r.lastNew}</span>
              <span>{r.found}</span>
              <span title={`${r.largest.toLocaleString('en-US')} tiles`}>{compact(r.largest)}</span>
              <span>{r.monsters ? <span className="fd-badge" title={`${r.monsters} monsters`}>{r.monsters}</span> : null}</span>
              <span data-testid="fd-limit" className={r.limit < SHORT ? 'fd-short' : undefined}>
                {limitPct(r.limit)}
              </span>
              <span className="fd-row-marks" title={marks.map((m) => MARKS[m].label).join(', ')} data-testid="fd-marks" data-marks={marks.join(' ')}>
                {marks.map((m) => (
                  <i key={m} className={`fd-dot fd-mark-${m}`} />
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <p className="fd-count">
        {shown.length === props.rows.length ? `${nf(props.rows.length)} combinations` : `${nf(shown.length)} of ${nf(props.rows.length)}`}
        {shown.length > ROWS_DRAWN ? `, the first ${nf(ROWS_DRAWN)} drawn; search by digits for more` : ''}; ↑ ↓ to move
      </p>
    </div>
  );
}
