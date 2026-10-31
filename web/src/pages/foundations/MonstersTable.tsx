/**
 * Every monster of every combination in one sortable table. Monsters of one
 * combination with the same level and tiles, in different families, share a
 * row. A late monster that starts a chain is explained: its row shows the
 * chain's members (built, brute-forced this visit, predicted) and the share
 * its chain is forecast to take above the build.
 */
import { Fragment, useMemo, useState } from 'react';
import type { BruteFound } from './bruteChains';
import { compact, limitPct, nf, pct, slots } from './data';
import { explained, SHORT, STOP_TEXT, type IndexRow, type Monster } from './pageData';

type Key = 'combo' | 'floor' | 'level' | 'length' | 'count' | 'kind' | 'share';

interface Row {
  readonly combo: string;
  readonly floor: number;
  readonly level: number;
  readonly length: number;
  readonly kind: string;
  /** The share its chain (all its members) is forecast to take above the build, or -1. */
  readonly share: number;
  readonly members: readonly Monster[];
}

const COLUMNS: readonly { key: Key; label: string }[] = [
  { key: 'combo', label: 'Combination' },
  { key: 'floor', label: 'First' },
  { key: 'level', label: 'Level' },
  { key: 'length', label: 'Tiles' },
  { key: 'count', label: 'Children' },
  { key: 'kind', label: 'Kind' },
  { key: 'share', label: 'Chain' },
];

/** A monster's kind in words: late (starting a chain at floor + 4 or later, with the chain known, or a nugget there, unexplained) and giant. */
export function kindOf(m: Monster): string {
  const late = m.late ? (explained(m) ? 'late, chain known' : 'late, unexplained') : '';
  return [late, m.giant ? 'giant' : ''].filter(Boolean).join('; ');
}

export function groupMonsters(monsters: readonly Monster[]): Row[] {
  const by = new Map<string, Monster[]>();
  for (const m of monsters) {
    const k = `${m.combo}/${m.level}/${m.length}`;
    (by.get(k) ?? by.set(k, []).get(k)!).push(m);
  }
  return [...by.values()].map((ms) => ({
    combo: ms[0].combo,
    floor: ms[0].floor,
    level: ms[0].level,
    length: ms[0].length,
    kind: kindOf(ms[0]),
    share: ms[0].toCome === null ? -1 : (ms[0].toCome ?? 0) + (ms[0].again ?? 0),
    members: ms,
  }));
}

/** A circuit's places, compactly: the children of its one place, or how many places and the first few families. */
function placesText(families: string): string {
  const f = families.split(' ');
  const u = [...new Set(f)];
  return f.length === 1 ? slots(f[0]) : `${f.length} places, children ${u.slice(0, 3).join(', ')}${u.length > 3 ? ', …' : ''}`;
}

/**
 * A monster's chain in a line: each member after it by level, marked built
 * (✓ where predicted first), predicted, or brute-forced (its exact tiles
 * against the prediction); then what the chain is forecast to take past
 * the build, or why it is not forecast.
 */
export function ChainLine(props: { m: Monster; found: readonly BruteFound[]; brief?: boolean }): JSX.Element {
  const { m, found } = props;
  if (!m.chain.length) return <span className="fd-muted">nugget{m.again ? `; closes again ${pct(m.again)} past the build` : ''}</span>;
  const forecast =
    m.toCome !== null
      ? `past the build: next harmonics ${pct(m.toCome)}, closing again ${pct(m.again ?? 0)}`
      : m.stop
        ? `not forecast: ${STOP_TEXT[m.stop]}`
        : '';
  // on a card the chain's members are its row of thumbnails
  if (props.brief)
    return (
      <span className="fd-muted" data-testid="fd-monster-chain">
        {forecast}
      </span>
    );
  const levels = [...new Set([...m.chain.map((c) => c[0]), ...found.map((f) => f.level)])].sort((a, b) => a - b);
  return (
    <span className="fd-chain" data-testid="fd-monster-chain">
      {levels.map((level, i) => {
        const built = m.chain.filter((c) => c[0] === level && c[2] !== 'predicted');
        const pred = m.chain.filter((c) => c[0] === level && c[2] === 'predicted');
        const bf = found.filter((f) => f.level === level);
        return (
          <Fragment key={level}>
            {i ? <span className="fd-arrow">→</span> : null}
            <span className="fd-step">
              {built.map((c) => (
                <span key={`b${c[1]}`} title={`level ${level}, built`}>
                  {compact(c[1])}
                  {c[2] === 'confirmed' ? ' ✓' : ''}{' '}
                </span>
              ))}
              {bf.map((f) => {
                const p = pred.find((c) => c[1] === f.length);
                return (
                  <span key={`f${f.length}`} title={`level ${level}, brute-forced${p ? ', as predicted' : ''}`} data-testid="fd-monster-found">
                    {compact(f.length)} <small>brute-forced{p ? ' ✓' : ''}</small>{' '}
                  </span>
                );
              })}
              {pred
                .filter((c) => !bf.some((f) => f.length === c[1]))
                .map((c) => (
                  <span key={`p${c[1]}`} className="fd-m-predicted" title={`level ${level}, predicted above the build`}>
                    {compact(c[1])}?{' '}
                  </span>
                ))}
              <small>L{level}</small>
            </span>
          </Fragment>
        );
      })}
      <span className="fd-muted">
        {' · '}
        {forecast}
      </span>
    </span>
  );
}

/** The combinations whose limit is short: tails no known circuit accounts for, whether or not a circuit is late. */
function ShortTable(props: { rows: readonly IndexRow[]; onOpen: (combo: string) => void }): JSX.Element {
  const rows = [...props.rows].filter((r) => r.limit < SHORT).sort((a, b) => a.limit - b.limit);
  return (
    <div className="fd-short-block" data-testid="fd-short">
      <h3>
        <i className="fd-dot fd-mark-short" /> Short combinations: {rows.length}
      </h3>
      {rows.length ? (
        <div className="fd-table-wrap">
          <table className="fd-table">
            <thead>
              <tr>
                <th>Combination</th>
                <th>Limit</th>
                <th>Not accounted for</th>
                <th>Not forecast</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.combo} onClick={() => props.onOpen(r.combo)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && props.onOpen(r.combo)} data-testid="fd-short-row">
                  <td className="fd-digits">{r.combo}</td>
                  <td>{limitPct(r.limit)}</td>
                  <td className="fd-short">{limitPct(1 - r.limit)}</td>
                  <td className="fd-chain-cell">{r.notForecast.length ? r.notForecast.join('; ') : <span className="fd-muted">every chain forecast</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export function MonstersTable(props: {
  monsters: readonly Monster[];
  combos: readonly IndexRow[];
  onOpen: (m: Monster) => void;
  onOpenCombo: (combo: string) => void;
  found: (m: Monster) => BruteFound[];
}): JSX.Element {
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
  const late = props.monsters.filter((m) => m.late);
  const known = late.filter(explained);
  return (
    <section className="fd-monsters" data-testid="fd-monsters">
      <ShortTable rows={props.combos} onOpen={props.onOpenCombo} />
      <h3>Monster circuits</h3>
      <p className="fd-muted">
        {nf(props.monsters.length)} in {combos} combinations: {nf(late.length)} late, {nf(props.monsters.filter((m) => m.giant).length)} giant. Late with a
        chain: <b data-testid="fd-explained">{nf(known.length)}</b>; unexplained: <b data-testid="fd-unexplained">{nf(late.length - known.length)}</b>. Choose a row
        to open it.
      </p>
      <div className="fd-table-wrap">
        <table className="fd-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key}>
                  <button
                    type="button"
                    className={sort.key === c.key ? 'fd-sorted' : undefined}
                    onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : c.key === 'length' || c.key === 'level' || c.key === 'count' || c.key === 'share' }))}
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
              <tr key={`${r.combo}/${r.level}/${r.length}`} onClick={() => props.onOpen(r.members[0])} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && props.onOpen(r.members[0])} data-testid="fd-monster-row">
                <td className="fd-digits">{r.combo}</td>
                <td>{r.floor}</td>
                <td>{r.level}</td>
                <td>{nf(r.length)}</td>
                <td title={r.members.map((m) => m.families.split(' ').map(slots).join(', ')).join('; ')}>
                  {placesText(r.members[0].families)}
                  {r.members.length > 1 ? <span className="fd-muted"> and {r.members.length - 1} more</span> : null}
                </td>
                <td>
                  <span className={`fd-monster${r.members[0].late && !explained(r.members[0]) ? ' fd-monster-open' : ''}`}>{r.kind}</span>
                </td>
                <td className="fd-chain-cell">
                  <ChainLine m={r.members[0]} found={props.found(r.members[0])} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
