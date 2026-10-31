/** A rule's combinations, sortable and filtered, one compact row each. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FLAG_TEXT, type IndexRow } from './pageData';
import { compact } from './data';

type SortKey = 'combo' | 'floor' | 'lastNew' | 'found' | 'largest' | 'monsters' | 'flags';

const COLUMNS: readonly { key: SortKey; label: string; title: string }[] = [
  { key: 'combo', label: 'Combination', title: 'Combination digits' },
  { key: 'floor', label: 'First', title: 'Level the first circuit closes at (the floor)' },
  { key: 'lastNew', label: 'Last new', title: 'Level the last foundational circuit first closes at' },
  { key: 'found', label: 'Foundational', title: 'Foundational circuits' },
  { key: 'largest', label: 'Largest', title: 'Tiles of the largest foundational circuit' },
  { key: 'monsters', label: '', title: 'Monsters' },
  { key: 'flags', label: '⚑', title: 'Flags' },
];

export interface Filters {
  readonly search: string;
  readonly floor: number | null;
  readonly lastNew: number | null;
  readonly monsters: boolean;
  readonly misses: boolean;
  readonly flagged: boolean;
}

export const NO_FILTERS: Filters = { search: '', floor: null, lastNew: null, monsters: false, misses: false, flagged: false };

export function filterRows(rows: readonly IndexRow[], f: Filters): IndexRow[] {
  const digits = f.search.replace(/[^0-9a-z]/gi, '').toLowerCase();
  return rows.filter(
    (r) =>
      r.combo.startsWith(digits) &&
      (f.floor === null || r.floor === f.floor) &&
      (f.lastNew === null || r.lastNew === f.lastNew) &&
      (!f.monsters || r.monsters > 0) &&
      (!f.misses || r.misses > 0) &&
      (!f.flagged || r.flags.length > 0),
  );
}

export function ComboList(props: { rows: readonly IndexRow[]; selected: string | null; onSelect: (combo: string) => void }): JSX.Element {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'combo', desc: false });
  const floors = useMemo(() => [...new Set(props.rows.map((r) => r.floor))].sort(), [props.rows]);
  const lasts = useMemo(() => [...new Set(props.rows.map((r) => r.lastNew))].sort(), [props.rows]);
  const shown = useMemo(() => {
    const out = filterRows(props.rows, filters);
    const k = sort.key;
    return out.sort((a, b) => {
      const d = k === 'combo' ? a.combo.localeCompare(b.combo) : k === 'flags' ? a.flags.length - b.flags.length : (a[k] as number) - (b[k] as number);
      return (sort.desc ? -d : d) || a.combo.localeCompare(b.combo);
    });
  }, [props.rows, filters, sort]);

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
          Last new
          <select value={filters.lastNew ?? ''} onChange={(e) => set({ lastNew: e.target.value ? Number(e.target.value) : null })} aria-label="Last foundational level">
            <option value="">any</option>
            {lasts.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="fd-check">
          <input type="checkbox" checked={filters.monsters} onChange={(e) => set({ monsters: e.target.checked })} data-testid="fd-only-monsters" />
          Monsters
        </label>
        <label className="fd-check">
          <input type="checkbox" checked={filters.misses} onChange={(e) => set({ misses: e.target.checked })} title="Combinations with a prediction that missed" />
          Misses
        </label>
        <label className="fd-check">
          <input type="checkbox" checked={filters.flagged} onChange={(e) => set({ flagged: e.target.checked })} data-testid="fd-only-flagged" />
          Flagged
        </label>
      </div>
      <div className="fd-rows" role="listbox" aria-label="Combinations" ref={body} data-testid="fd-rows">
        <div className="fd-row fd-head" role="presentation">
          {COLUMNS.map((c) => (
            <button
              key={c.key}
              type="button"
              title={`Sort by ${c.title.toLowerCase()}`}
              className={sort.key === c.key ? 'fd-sorted' : undefined}
              onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : c.key !== 'combo' }))}
            >
              {c.label || 'M'}
              {sort.key === c.key ? (sort.desc ? ' ↓' : ' ↑') : ''}
            </button>
          ))}
        </div>
        {shown.map((r) => (
          <div
            key={r.combo}
            role="option"
            aria-selected={r.combo === props.selected}
            className="fd-row"
            onClick={() => props.onSelect(r.combo)}
            title={`first circuit at level ${r.floor}, last new foundational circuit at level ${r.lastNew}, ${r.found} foundational circuits, largest ${r.largest.toLocaleString('en-US')} tiles${r.misses ? `, ${r.misses} missed predictions` : ''}`}
          >
            <span className="fd-digits">{r.combo}</span>
            <span>{r.floor}</span>
            <span>{r.lastNew}</span>
            <span>{r.found}</span>
            <span>{compact(r.largest)}</span>
            <span>{r.monsters ? <span className="fd-badge" title={`${r.monsters} monsters`}>{r.monsters}</span> : null}</span>
            <span title={r.flags.map((f) => FLAG_TEXT[f]).join('; ')} data-testid="fd-flags">
              {r.flags.length ? <span className="fd-flag">⚑{r.flags.length > 1 ? r.flags.length : ''}</span> : null}
            </span>
          </div>
        ))}
      </div>
      <p className="fd-count">
        {shown.length === props.rows.length ? `${props.rows.length} combinations` : `${shown.length} of ${props.rows.length}`}; ↑ ↓ to move
      </p>
    </div>
  );
}
