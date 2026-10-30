/**
 * One combination: its summary, what is proven and what only observed, the
 * account of chords by level, and its foundational circuits as cards by the
 * level they first close at, each drawn from a fresh build in a worker.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TileTypeId } from '../../core';
import { explorerCircuitHref } from '../shapes/explorerLink';
import { AccountChart } from './AccountChart';
import { TailsPanel } from './TailsPanel';
import { buildupHref, compact, harmonicsHref, nf, pct, slots, subsetOf } from './data';
import type { DrawClient, Drawing } from './drawings';
import { chainOf, isGiant, isLate, provenNote, type ChainMember, type FoundRow, type PageCombo } from './pageData';

const MARK: Record<ChainMember['mark'], { sign: string; title: string }> = {
  confirmed: { sign: '✓', title: 'predicted from two levels down, then built' },
  built: { sign: '', title: 'built (below the levels predictions start at)' },
  missed: { sign: '!', title: 'built, but not predicted' },
  predicted: { sign: '?', title: 'predicted, above the build' },
  other: { sign: '≠', title: "the walk predicted is another circuit's harmonic" },
};

function Glyph(props: { drawing: Drawing | undefined; size: number }): JSX.Element {
  const d = props.drawing;
  if (!d) return <div className="fd-glyph fd-glyph-wait" style={{ width: props.size, height: props.size }} />;
  const xy = d.xy;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < xy.length; i += 2) {
    x0 = Math.min(x0, xy[i]);
    x1 = Math.max(x1, xy[i]);
    y0 = Math.min(y0, xy[i + 1]);
    y1 = Math.max(y1, xy[i + 1]);
  }
  const s = Math.max(x1 - x0, y1 - y0) || 1;
  const pad = 0.06 * s;
  const pts: string[] = [];
  for (let i = 0; i < xy.length; i += 2) pts.push(`${(xy[i] - x0 + (s - (x1 - x0)) / 2 + pad).toFixed(3)},${(y1 - xy[i + 1] + (s - (y1 - y0)) / 2 + pad).toFixed(3)}`);
  return (
    <svg className="fd-glyph" viewBox={`0 0 ${s + 2 * pad} ${s + 2 * pad}`} width={props.size} height={props.size} aria-hidden="true">
      <polygon points={pts.join(' ')} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Card(props: { data: PageCombo; f: FoundRow; drawing: Drawing | undefined; selected: boolean; onSelect: () => void }): JSX.Element {
  const { data, f, drawing } = props;
  const [id, level, length, families, , copies, types, , places, nugget] = f;
  const fams = [...new Set(families.split(' '))];
  const base = import.meta.env.BASE_URL;
  const chain = useMemo(() => chainOf(data, id), [data, id]);
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
        <div className="fd-chain" data-testid="fd-chain">
          {chain.length ? (
            chain.map((st) => (
              <span key={st.level} className="fd-step">
                <span className="fd-arrow">→</span>
                {st.members.map((m, i) => (
                  <span key={i} className={`fd-member fd-m-${m.mark}`} title={`${nf(m.length)} tiles at level ${st.level}: ${MARK[m.mark].title}`}>
                    {compact(m.length)}
                    <small> L{st.level}</small>
                    {MARK[m.mark].sign ? ` ${MARK[m.mark].sign}` : ''}
                  </span>
                ))}
              </span>
            )).flatMap((el, i) => (i ? [' ', el] : [el]))
          ) : (
            <span className="fd-muted">{nugget ? 'nugget: no harmonic' : 'no harmonic built'}</span>
          )}
        </div>
        <div className="fd-links" onClick={(e) => e.stopPropagation()}>
          {explorer ? <a href={explorer}>Explorer</a> : <span className="fd-muted">Explorer</span>}
          <a href={harmonicsHref(base, data.combo, Math.min(level + 2, 9), data.rule)}>Harmonics</a>
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
          Each chain lists its harmonics by level, as tiles and level:{' '}
          <span className="fd-member fd-m-confirmed">✓</span> predicted, then built; <span className="fd-member fd-m-predicted">?</span> predicted above the build;{' '}
          <span className="fd-member">!</span> built, not predicted. A nugget has no harmonic: it only closes again, in more places, as the same circuit.
        </p>
        {error ? <p className="fd-muted">Could not draw: {error}</p> : null}
        {byLevel.map(([level, list]) => (
          <div key={level} className="fd-level">
            <h4>
              Level {level} <span className="fd-muted">· {list.length} {list.length === 1 ? 'circuit' : 'circuits'}{isLate(level, data.floor) ? ' · floor + ' + (level - data.floor) : ''}</span>
            </h4>
            <div className="fd-grid-cards">
              {list.map((f) => (
                <Card key={f[0]} data={data} f={f} drawing={byId?.get(f[0])} selected={props.circuit === f[0]} onSelect={() => props.onCircuit(props.circuit === f[0] ? null : f[0])} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
