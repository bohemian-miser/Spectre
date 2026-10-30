/**
 * Every monster of every combination in one sortable table. Monsters of one
 * combination with the same level and tiles, in different families, share a
 * row.
 */
import { useMemo, useState } from 'react';
import type { Monster } from './pageData';
import { nf, slots } from './data';

type Key = 'combo' | 'floor' | 'level' | 'length' | 'count' | 'kind';

interface Row {
  readonly combo: string;
  readonly floor: number;
  readonly level: number;
  readonly length: number;
  readonly kind: string;
  readonly members: readonly Monster[];
}

const COLUMNS: readonly { key: Key; label: string }[] = [
  { key: 'combo', label: 'Combination' },
  { key: 'floor', label: 'Floor' },
  { key: 'level', label: 'Level' },
  { key: 'length', label: 'Tiles' },
  { key: 'count', label: 'Children' },
  { key: 'kind', label: 'Kind' },
];

const kind = (m: Monster): string => (m.late && m.giant ? 'late, giant' : m.late ? 'late' : 'giant');

export function groupMonsters(monsters: readonly Monster[]): Row[] {
  const by = new Map<string, Monster[]>();
  for (const m of monsters) {
    const k = `${m.combo}/${m.level}/${m.length}`;
    (by.get(k) ?? by.set(k, []).get(k)!).push(m);
  }
  return [...by.values()].map((ms) => ({ combo: ms[0].combo, floor: ms[0].floor, level: ms[0].level, length: ms[0].length, kind: kind(ms[0]), members: ms }));
}

/** A circuit's places, compactly: the children of its one place, or how many places and the first few families. */
function placesText(families: string): string {
  const f = families.split(' ');
  const u = [...new Set(f)];
  return f.length === 1 ? slots(f[0]) : `${f.length} places, children ${u.slice(0, 3).join(', ')}${u.length > 3 ? ', …' : ''}`;
}

export function MonstersTable(props: { monsters: readonly Monster[]; onOpen: (m: Monster) => void }): JSX.Element {
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: 'length', desc: true });
  const grouped = useMemo(() => groupMonsters(props.monsters), [props.monsters]);
  const rows = useMemo(() => {
    const val = (r: Row): string | number => (sort.key === 'count' ? r.members.length : r[sort.key]);
    return [...grouped].sort((a, b) => {
      const x = val(a), y = val(b);
      const d = typeof x === 'number' ? x - (y as number) : x.localeCompare(y as string);
      return (sort.desc ? -d : d) || a.combo.localeCompare(b.combo) || a.length - b.length;
    });
  }, [grouped, sort]);
  const combos = new Set(props.monsters.map((m) => m.combo)).size;
  return (
    <section className="fd-monsters" data-testid="fd-monsters">
      <p className="fd-muted">
        {nf(props.monsters.length)} monsters in {combos} combinations: {props.monsters.filter((m) => m.late).length} late (starting a chain at floor + 4 or
        later), {props.monsters.filter((m) => m.giant).length} giant (100,000 tiles or more). Circuits of one combination with the same level and tiles share a
        row. Choose one to open its combination.
      </p>
      <table className="fd-table">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key}>
                <button
                  type="button"
                  className={sort.key === c.key ? 'fd-sorted' : undefined}
                  onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : c.key === 'length' || c.key === 'level' || c.key === 'count' }))}
                >
                  {c.label}
                  {sort.key === c.key ? (sort.desc ? ' ↓' : ' ↑') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.combo}/${r.level}/${r.length}`} onClick={() => props.onOpen(r.members[0])} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && props.onOpen(r.members[0])}>
              <td className="fd-digits">{r.combo}</td>
              <td>{r.floor}</td>
              <td>{r.level}</td>
              <td>{nf(r.length)}</td>
              <td title={r.members.map((m) => m.families.split(' ').map(slots).join(', ')).join('; ')}>
                {placesText(r.members[0].families)}
                {r.members.length > 1 ? <span className="fd-muted"> and {r.members.length - 1} more</span> : null}
              </td>
              <td>
                <span className="fd-monster">{r.kind}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
