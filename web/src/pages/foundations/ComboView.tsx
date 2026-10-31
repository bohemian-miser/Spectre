/**
 * One combination, in one panel: its key numbers and marks, a table of what
 * is proven and what only observed, the account of chords by level, and its
 * foundational circuits by the level they first close at: each chain as a
 * row, its foundational circuit's card then its harmonics (`ChainRow.tsx`),
 * and each nugget as a card. Every circuit is drawn from a fresh build in a
 * worker.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { TileTypeId } from '../../core';
import { explorerCircuitHref } from '../shapes/explorerLink';
import { AccountChart } from './AccountChart';
import type { ChainBrute } from './bruteChains';
import { bruteLevels, ChainRow } from './ChainRow';
import { Glyph } from './Glyph';
import { TailsPanel } from './TailsPanel';
import { buildupHref, harmonicsHref, limitPct, nf, pct, slots, subsetOf } from './data';
import type { DrawClient, Drawing } from './drawings';
import { ChainLine, kindOf } from './MonstersTable';
import { chainOf, factsOf, indexRow, isLate, MARKS, marksOf, monstersOf, SHORT, type ChainStep, type FoundRow, type Monster, type PageCombo } from './pageData';

function Card(props: {
  data: PageCombo;
  f: FoundRow;
  chain: readonly ChainStep[];
  drawing: Drawing | undefined;
  selected: boolean;
  onSelect: () => void;
  monster: Monster | undefined;
  brute: ChainBrute;
}): JSX.Element {
  const { data, f, drawing, chain, monster } = props;
  const [id, level, length, families, , copies, types, , places, nugget] = f;
  const fams = [...new Set(families.split(' '))];
  const base = import.meta.env.BASE_URL;
  // the Harmonics page read to the chain's last member built, opened on this circuit's chain
  const built = chain.filter((st) => st.members.some((m) => m.id !== null));
  const harmonicsLevel = built.length ? built[built.length - 1].level : Math.min(level + 2, data.levels);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (props.selected) ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [props.selected]);
  const explorer = drawing
    ? explorerCircuitHref(base, {
        family: 'hex',
        subset: subsetOf(data.rule),
        combo: data.combo,
        type: drawing.type as TileTypeId,
        level,
        path: drawing.first.path.map((p) => ({ type: p.type as TileTypeId, pos: p.pos })),
        chord: [
          { x: drawing.first.chord[0], y: drawing.first.chord[1] },
          { x: drawing.first.chord[2], y: drawing.first.chord[3] },
        ],
      })
    : null;
  return (
    <article
      ref={ref}
      className={`fd-card${props.selected ? ' fd-card-on' : ''}${monster ? ' fd-card-monster' : ''}`}
      onClick={props.onSelect}
      data-testid="fd-card"
      data-circuit={id}
    >
      <Glyph drawing={drawing} size={84} />
      <div className="fd-card-text">
        <div className="fd-card-head">
          <strong>{nf(length)} tiles</strong>
          {monster ? (
            <span
              className={`fd-monster${monster.late && !monster.chain.length ? ' fd-monster-open' : ''}`}
              title={[monster.late ? `first closes at level ${level}, floor + ${level - data.floor}` : '', monster.giant ? 'at least 100,000 tiles' : ''].filter(Boolean).join('; ')}
              data-testid="fd-card-kind"
            >
              {kindOf(monster)}
            </span>
          ) : null}
        </div>
        <div className="fd-muted">
          <span title={`children ${fams.map(slots).join('; ')} at level ${level}`}>
            {nf(places)} {places === 1 ? 'place' : 'places'} from level {level} · children {fams.slice(0, 4).join(', ')}
            {fams.length > 4 ? ', …' : ''}
          </span>{' '}
          ·{' '}
          {drawing ? (
            <span title={`${drawing.types.join(', ')}; ${nf(copies)} copies`}>
              {drawing.types.length === 9 ? 'every type' : drawing.types.length === 1 ? drawing.types[0] : `${drawing.types.length} types`}
            </span>
          ) : (
            `${types} ${types === 1 ? 'type' : 'types'}`
          )}
        </div>
        {monster?.late ? (
          <div className="fd-card-chain" data-testid="fd-card-chain">
            <ChainLine m={monster} found={props.brute.foundOn(data.rule, data.combo, id)} brief />
          </div>
        ) : chain.length ? null : (
          <div className="fd-muted">{nugget ? 'nugget' : 'no harmonic built'}</div>
        )}
        <div className="fd-links" onClick={(e) => e.stopPropagation()}>
          {explorer ? <a href={explorer}>Explorer</a> : <span className="fd-muted">Explorer</span>}
          <a href={harmonicsHref(base, data.combo, harmonicsLevel, data.rule, { level, length })}>Harmonics</a>
          <a href={buildupHref(base, data.combo, level, length, data.rule)}>Build-up</a>
        </div>
      </div>
    </article>
  );
}

export function ComboView(props: { data: PageCombo; client: DrawClient; brute: ChainBrute; circuit: number | null; onCircuit: (id: number | null) => void }): JSX.Element {
  const { data } = props;
  const [drawings, setDrawings] = useState<{ combo: string; byId: Map<number, Drawing> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    setError(null);
    props.client
      .draw({ subset: subsetOf(data.rule), combo: data.combo, want: data.found.map(([id, level, length, families, , , , place]) => ({ id, place, level, length, family: families.split(' ')[0] })) })
      .then((ds) => on && setDrawings({ combo: data.combo, byId: new Map(ds.map((d) => [d.id, d])) }))
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
  }, [data, props.client]);
  const byId = drawings?.combo === data.combo ? drawings.byId : null;
  const byLevel = useMemo(() => {
    const m = new Map<number, FoundRow[]>();
    for (const f of data.found) (m.get(f[1]) ?? m.set(f[1], []).get(f[1])!).push(f);
    return [...m].sort((a, b) => a[0] - b[0]);
  }, [data]);
  const withChains = useMemo(() => new Set(data.harm.map((h) => h[4])), [data]);
  const chains = useMemo(() => new Map(data.found.map((f) => [f[0], chainOf(data, f[0])] as const)), [data]);
  const L = data.levels;
  const facts = useMemo(() => factsOf(data), [data]);
  const row = useMemo(() => indexRow(data), [data]);
  const marks = marksOf(row);
  const monsters = useMemo(() => new Map(monstersOf(data).map((m) => [m.id, m] as const)), [data]);
  const chainCount = data.found.filter(([id]) => withChains.has(id)).length;
  const keys: [string, ReactNode, string?][] = [
    ['First', data.floor, 'level the first circuit closes at (the floor)'],
    ['Last found', data.lastNew, 'highest level a foundational circuit first closes at'],
    ['Foundational', data.found.length],
    ['Chains / nuggets', `${chainCount} / ${row.nuggets}`],
    [`Tails at ${L}`, pct(data.tails[L]), `share of chords on tails at level ${L}`],
    ['Limit', <span data-testid="fd-limit-share">{limitPct(row.limit)}</span>, 'share of chords on known circuits in the limit'],
    ...(row.limit < SHORT ? [['Not accounted for', <span className="fd-warn" data-testid="fd-unaccounted">{limitPct(1 - row.limit)}</span>, 'room for unknown circuits or strands that never close'] as [string, ReactNode, string]] : []),
  ];
  return (
    <section className="fd-combo" data-testid="fd-combo" aria-labelledby="fd-combo-title">
      <header className="fd-combo-head">
        <h2 id="fd-combo-title">
          {data.combo} <span className="fd-muted">rule {data.rule}</span>
        </h2>
        <dl className="fd-keys" data-testid="fd-summary">
          {keys.map(([k, v, title]) => (
            <div key={k} title={title}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          <div>
            <dt>Marks</dt>
            <dd data-testid="fd-combo-marks">
              {marks.length
                ? marks.map((m) => (
                    <span key={m} className={`fd-mark-chip fd-chip-${m}`} title={MARKS[m].title}>
                      <i className={`fd-dot fd-mark-${m}`} /> {MARKS[m].label}
                    </span>
                  ))
                : 'none'}
            </dd>
          </div>
        </dl>
      </header>
      <table className="fd-facts" data-testid="fd-note">
        <tbody>
          {facts.map((f, i) => (
            <tr key={i} title={f.title}>
              <th scope="row">{f.label}</th>
              <td>{f.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <AccountChart data={data} />
      <TailsPanel data={data} />
      <section className="fd-cards">
        <h3>Foundational circuits</h3>
        <p className="fd-muted fd-key">
          <span className="fd-m-confirmed">✓</span> predicted, then built · <span className="fd-m-missed">!</span> built, not predicted · ? predicted above the build
        </p>
        {error ? <p className="fd-muted">Could not draw: {error}</p> : null}
        {byLevel.map(([level, list]) => {
          const card = (f: FoundRow) => (
            <Card
              key={f[0]}
              data={data}
              f={f}
              chain={chains.get(f[0])!}
              drawing={byId?.get(f[0])}
              selected={props.circuit === f[0]}
              onSelect={() => props.onCircuit(props.circuit === f[0] ? null : f[0])}
              monster={monsters.get(f[0])}
              brute={props.brute}
            />
          );
          const rows = list.filter((f) => chains.get(f[0])!.length);
          const single = list.filter((f) => !chains.get(f[0])!.length);
          const columns = [
            ...new Set(rows.flatMap((f) => [...chains.get(f[0])!.map((st) => st.level), ...bruteLevels(data, f[0], chains.get(f[0])!, props.brute).flatMap((b) => b.levels)])),
          ].sort((a, b) => a - b);
          return (
            <div key={level} className="fd-level">
              <h4>
                Level {level} <span className="fd-muted">· {list.length} {list.length === 1 ? 'circuit' : 'circuits'}{isLate(level, data.floor) ? ' · floor + ' + (level - data.floor) : ''}</span>
              </h4>
              {rows.length ? (
                <div className="fd-chains" style={{ ['--fd-cols' as string]: columns.length }}>
                  {rows.map((f) => (
                    <ChainRow
                      key={`${data.combo}/${f[0]}`}
                      data={data}
                      root={f[0]}
                      chain={chains.get(f[0])!}
                      columns={columns}
                      client={props.client}
                      card={card(f)}
                      brute={props.brute}
                      rootDrawing={byId?.get(f[0])}
                    />
                  ))}
                </div>
              ) : null}
              {single.length ? <div className="fd-grid-cards">{single.map(card)}</div> : null}
            </div>
          );
        })}
      </section>
    </section>
  );
}
