/**
 * One combination: its summary, what is proven and what only observed, the
 * account of chords by level, and its foundational circuits by the level
 * they first close at: each chain as a row, its foundational circuit's card
 * then its harmonics (`ChainRow.tsx`), and each nugget as a card. Every
 * circuit is drawn from a fresh build in a worker.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TileTypeId } from '../../core';
import { explorerCircuitHref } from '../shapes/explorerLink';
import { AccountChart } from './AccountChart';
import { ChainRow } from './ChainRow';
import { Glyph } from './Glyph';
import { TailsPanel } from './TailsPanel';
import { buildupHref, harmonicsHref, nf, pct, slots, subsetOf } from './data';
import type { DrawClient, Drawing } from './drawings';
import { chainOf, isGiant, isLate, provenNote, type ChainStep, type FoundRow, type PageCombo } from './pageData';

function Card(props: { data: PageCombo; f: FoundRow; chain: readonly ChainStep[]; drawing: Drawing | undefined; selected: boolean; onSelect: () => void }): JSX.Element {
  const { data, f, drawing, chain } = props;
  const [id, level, length, families, , copies, types, , places, nugget] = f;
  const fams = [...new Set(families.split(' '))];
  const base = import.meta.env.BASE_URL;
  // the Harmonics page read to the chain's last member built, opened on this circuit's chain
  const built = chain.filter((st) => st.members.some((m) => m.id !== null));
  const harmonicsLevel = built.length ? built[built.length - 1].level : Math.min(level + 2, data.levels);
  const late = isLate(level, data.floor);
  const giant = isGiant(length);
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
      className={`fd-card${props.selected ? ' fd-card-on' : ''}${late || giant ? ' fd-card-monster' : ''}`}
      onClick={props.onSelect}
      data-testid="fd-card"
      data-circuit={id}
    >
      <Glyph drawing={drawing} size={84} />
      <div className="fd-card-text">
        <div className="fd-card-head">
          <strong>{nf(length)} tiles</strong>
          {late || giant ? (
            <span className="fd-monster" title={[late ? `starts a chain at level ${level}, floor + ${level - data.floor}` : '', giant ? 'at least 100,000 tiles' : ''].filter(Boolean).join('; ')}>
              {late && giant ? 'late, giant' : late ? 'late' : 'giant'}
            </span>
          ) : null}
        </div>
        <div className="fd-muted">
          <span title={`children ${fams.map(slots).join('; ')} at level ${level}`}>
            closes in {nf(places)} {places === 1 ? 'place' : 'places'} from level {level}, children {fams.slice(0, 4).join(', ')}
            {fams.length > 4 ? ', …' : ''}
          </span>{' '}
          ·{' '}
          {drawing ? (
            <span title={`${drawing.types.join(', ')}; ${nf(copies)} copies`}>
              in {drawing.types.length === 9 ? 'every type' : drawing.types.length === 1 ? drawing.types[0] : `${drawing.types.length} types`}
            </span>
          ) : (
            `in ${types} ${types === 1 ? 'type' : 'types'}`
          )}
        </div>
        {chain.length ? null : <div className="fd-muted">{nugget ? 'nugget: no harmonic' : 'no harmonic built'}</div>}
        <div className="fd-links" onClick={(e) => e.stopPropagation()}>
          {explorer ? <a href={explorer}>Explorer</a> : <span className="fd-muted">Explorer</span>}
          <a href={harmonicsHref(base, data.combo, harmonicsLevel, data.rule, { level, length })}>Harmonics</a>
          <a href={buildupHref(base, data.combo, level, length, data.rule)}>Build-up</a>
        </div>
      </div>
    </article>
  );
}

export function ComboView(props: { data: PageCombo; client: DrawClient; circuit: number | null; onCircuit: (id: number | null) => void }): JSX.Element {
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
  const note = useMemo(() => provenNote(data), [data]);
  return (
    <div className="fd-combo" data-testid="fd-combo">
      <header>
        <h2>
          {data.combo} <span className="fd-muted">rule {data.rule}</span>
        </h2>
        <p className="fd-summary" data-testid="fd-summary">
          <span>
            Floor <b>{data.floor}</b>
          </span>
          <span>
            Last foundational level <b>{data.lastNew}</b>
          </span>
          <span>
            <b>{data.found.length}</b> foundational circuits: <b>{data.found.filter(([id]) => withChains.has(id)).length}</b> chains,{' '}
            <b>{data.found.filter((f) => f[9]).length}</b> {data.found.filter((f) => f[9]).length === 1 ? 'nugget' : 'nuggets'}
          </span>
          <span>
            Tails at level {L}: <b>{pct(data.tails[L])}</b>
          </span>
        </p>
      </header>
      <ul className="fd-note" data-testid="fd-note">
        {note.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <AccountChart data={data} />
      <TailsPanel data={data} />
      <section className="fd-cards">
        <h3>Foundational circuits</h3>
        <p className="fd-muted fd-key">
          Each chain is a row: its foundational circuit, then its harmonics by level, each drawn and linked to its chain on the Harmonics page.{' '}
          <span className="fd-m-confirmed">✓</span> predicted from two levels down, then built; <span className="fd-m-missed">!</span> built, not predicted; a blank
          square is predicted above the build. A nugget has no harmonic: it only closes again, in more places, as the same circuit.
        </p>
        {error ? <p className="fd-muted">Could not draw: {error}</p> : null}
        {byLevel.map(([level, list]) => {
          const card = (f: FoundRow) => (
            <Card key={f[0]} data={data} f={f} chain={chains.get(f[0])!} drawing={byId?.get(f[0])} selected={props.circuit === f[0]} onSelect={() => props.onCircuit(props.circuit === f[0] ? null : f[0])} />
          );
          const rows = list.filter((f) => chains.get(f[0])!.length);
          const single = list.filter((f) => !chains.get(f[0])!.length);
          const columns = [...new Set(rows.flatMap((f) => chains.get(f[0])!.map((st) => st.level)))].sort((a, b) => a - b);
          return (
            <div key={level} className="fd-level">
              <h4>
                Level {level} <span className="fd-muted">· {list.length} {list.length === 1 ? 'circuit' : 'circuits'}{isLate(level, data.floor) ? ' · floor + ' + (level - data.floor) : ''}</span>
              </h4>
              {rows.length ? (
                <div className="fd-chains" style={{ ['--fd-cols' as string]: columns.length }}>
                  {rows.map((f) => (
                    <ChainRow key={`${data.combo}/${f[0]}`} data={data} chain={chains.get(f[0])!} columns={columns} client={props.client} card={card(f)} />
                  ))}
                </div>
              ) : null}
              {single.length ? <div className="fd-grid-cards">{single.map(card)}</div> : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}
