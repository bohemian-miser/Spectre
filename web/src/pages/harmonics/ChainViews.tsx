/**
 * The circuits of a combination by family and by chain (`chains.ts`), and a
 * chain's members lined up over their supertiles (`pairView.ts`): every
 * member at once, each two levels above the member before, one slider
 * stepping them together. Supertiles holding a visit the neighbouring
 * member's reading does not share are outlined.
 */

import { Fragment, useEffect, useMemo, useState } from 'react';
import { tileColor } from '../../lib/palette';
import type { CircuitInfo, HarmonicsClient, HarmonicsResult } from './harmonicsJob';
import { SUPERTILE_CAP, VISIT_CAP, type Agreement, type ChainPicture, type Side } from './pairView';

const nf = (n: number) => n.toLocaleString('en-US');
export const short = (c: CircuitInfo) => `${nf(c.length)} L${c.level}`;

const path = (xy: Float64Array, close: boolean): string => {
  let d = '';
  for (let i = 0; i < xy.length; i += 2) d += `${i ? 'L' : 'M'}${xy[i].toFixed(3)} ${xy[i + 1].toFixed(3)}`;
  return close && d ? `${d}Z` : d;
};

/** One circuit as a chip; `rel` marks how it relates to the chosen one. */
function Pick(props: { r: HarmonicsResult; i: number; picked: number | null; onPick: (i: number) => void; dashed?: boolean; title?: string }): JSX.Element {
  const c = props.r.circuits[props.i];
  return (
    <button
      type="button"
      className={`harm-pick${props.picked === props.i ? ' harm-picked' : ''}${props.dashed ? ' harm-related' : ''}`}
      onClick={() => props.onPick(props.i)}
      title={props.title ?? `${nf(c.length)} tiles, born at level ${c.level} in a ${c.type}`}
      data-testid="harm-member"
    >
      {nf(c.length)}
      <small> L{c.level}</small>
    </button>
  );
}

/** Every family (circuits through the same children of their birth supertile), each with its chains as rows and its circuits in no chain with others listed apart. */
export function FamilyList(props: { r: HarmonicsResult; picked: number | null; onPick: (i: number) => void }): JSX.Element {
  const { r } = props;
  const families = useMemo(() => {
    const by = new Map<string, { chains: number[]; alone: number[] }>();
    r.chains.forEach((ch, q) => {
      const f = by.get(ch.family) ?? by.set(ch.family, { chains: [], alone: [] }).get(ch.family)!;
      (ch.members.length > 1 ? f.chains : f.alone).push(q);
    });
    return [...by.entries()];
  }, [r]);
  const nearInto = (q: number) => r.near.find((n) => n.b === r.chains[q].members[0]);
  return (
    <div className="harm-families" data-testid="harm-families">
      {families.map(([family, f]) => {
        const count = [...f.chains, ...f.alone].reduce((s, q) => s + r.chains[q].members.length, 0);
        return (
          <div key={family} className="harm-family" data-testid="harm-family">
            <h3>
              Family {family} <small>{nf(count)} circuits through children {[...family].join(', ')}</small>
            </h3>
            {f.chains.map((q) => {
              const ch = r.chains[q];
              const near = nearInto(q);
              return (
                <div key={q} className="harm-chain-row" data-testid="harm-chain">
                  <span className="harm-row-label">Chain</span>
                  {near ? (
                    <span className="harm-link">
                      <Pick r={r} i={near.a} picked={props.picked} onPick={props.onPick} dashed title={`Reads as this chain's lowest member at its top ${near.top} levels only`} />
                      <span className="harm-arrow harm-near" title={`Agrees at the top ${near.top} levels only`}>⇢</span>
                    </span>
                  ) : null}
                  {ch.members.map((m, j) => (
                    <span key={m} className="harm-link">
                      {j ? <span className="harm-arrow">→ ×{(r.circuits[m].length / r.circuits[ch.members[j - 1]].length).toFixed(1)}</span> : null}
                      <Pick r={r} i={m} picked={props.picked} onPick={props.onPick} />
                    </span>
                  ))}
                </div>
              );
            })}
            {f.alone.length ? (
              <div className="harm-chain-row" data-testid="harm-alone">
                <span className="harm-row-label">{f.chains.length ? 'In no chain' : 'Alone'}</span>
                {f.alone.map((q) => {
                  const m = r.chains[q].members[0];
                  const near = r.closest[m];
                  return (
                    <span key={m} className="harm-link">
                      <Pick r={r} i={m} picked={props.picked} onPick={props.onPick} />
                      {near ? (
                        <span className="harm-arrow">
                          agrees with the {short(r.circuits[near.other])} at {near.top === 1 ? 'the top level' : `the top ${near.top} levels`}
                        </span>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function SideFigure(props: { side: Side; c: CircuitInfo; testId: string }): JSX.Element {
  const { side } = props;
  const box = useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const take = (xy: Float64Array) => {
      for (let i = 0; i < xy.length; i += 2) {
        x0 = Math.min(x0, xy[i]);
        x1 = Math.max(x1, xy[i]);
        y0 = Math.min(y0, xy[i + 1]);
        y1 = Math.max(y1, xy[i + 1]);
      }
    };
    side.supertiles.forEach((s) => take(s.outline));
    take(side.circuit);
    const pad = Math.max(x1 - x0, y1 - y0) * 0.03 || 1;
    return { x: x0 - pad, y: -y1 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
  }, [side]);
  const unshared = side.supertiles.filter((s) => s.unshared).length;
  const drawn = side.supertiles.length > 0;
  return (
    <figure className="harm-side" data-testid={props.testId}>
      {drawn ? (
        <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} role="img" aria-label={`The ${nf(props.c.length)} over its supertiles at level ${side.level}`}>
          <g transform="scale(1 -1)">
            {side.supertiles.map((s) => (
              <path key={s.path} d={path(s.outline, true)} className={s.unshared ? 'harm-st harm-st-unshared' : 'harm-st'} style={{ ['--chip' as string]: tileColor(s.type, 'bright') }} vectorEffect="non-scaling-stroke">
                <title>{`${s.type} ${s.path}`}</title>
              </path>
            ))}
            <path d={path(side.circuit, true)} fill="none" stroke="currentColor" strokeOpacity={0.8} strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
      ) : (
        <div className="harm-side-empty">{nf(side.visits)} visits at level {side.level}: more than {nf(VISIT_CAP)}, not drawn.</div>
      )}
      <figcaption>
        <strong>{short(props.c)}</strong> at level {side.level}: {nf(side.visits)} visits{drawn ? ` through ${nf(side.count)} supertiles` : ''}
        {drawn && side.count > side.supertiles.length ? ` (the first ${nf(SUPERTILE_CAP)} drawn)` : ''}
        {unshared ? `; ${nf(unshared)} hold visits its neighbour lacks` : ''}.
      </figcaption>
    </figure>
  );
}

const STEP: Record<Agreement, { mark: string; title: string }> = {
  same: { mark: '=', title: 'The two readings agree at these levels' },
  differs: { mark: '≠', title: 'The readings differ: outlined supertiles hold visits the other lacks' },
  long: { mark: '?', title: 'Too long to line up at these levels' },
  unread: { mark: '–', title: 'One of the two is not read at its level' },
};

/** Every member of a chain over its supertiles, the lowest at level k and each two levels above the one before, with one slider for k. */
export function ChainSupertiles(props: { client: HarmonicsClient; level: number; members: readonly number[]; circuits: readonly CircuitInfo[] }): JSX.Element {
  const { client, members, circuits } = props;
  const lowest = circuits[members[0]];
  const hi = lowest.level - 1;
  const [k, setK] = useState(hi);
  const [picture, setPicture] = useState<ChainPicture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = members.join(' ');
  useEffect(() => setK(hi), [key, hi, props.level]);
  const at = Math.min(Math.max(k, 0), hi);
  useEffect(() => {
    let on = true;
    setError(null);
    client
      .picture(members, at)
      .then((p) => on && setPicture(p))
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key, at, props.level]);
  if (hi < 0) return <></>;
  const current = picture && picture.k === at && picture.sides.length === members.length ? picture : null;
  const skipped = current ? members.filter((_, j) => !current.sides[j].supertiles.length) : [];
  return (
    <div className="harm-supertiles" data-testid="harm-supertiles">
      <h3>The chain over its supertiles</h3>
      <label className="harm-slider">
        Lowest member at level {at}
        <input type="range" min={0} max={hi} step={1} value={at} onChange={(e) => setK(Number(e.target.value))} data-testid="harm-k" />
        <span className="shapes-note">each member two levels above the one before; outlined supertiles hold visits the neighbouring member&apos;s reading lacks</span>
      </label>
      {error ? <p className="shapes-note">Could not draw: {error}</p> : null}
      {current ? (
        <>
          {skipped.length ? (
            <p className="shapes-note" data-testid="harm-skipped">
              Not drawn at these levels, over {nf(VISIT_CAP)} visits: {skipped.map((m) => short(circuits[m])).join(', ')}.
            </p>
          ) : null}
          <div className="harm-chain-pics">
            {members.map((m, j) => (
              <Fragment key={m}>
                {j ? (
                  <span className="harm-step" title={STEP[current.steps[j - 1]].title} data-testid="harm-step">
                    {STEP[current.steps[j - 1]].mark}
                  </span>
                ) : null}
                <SideFigure side={current.sides[j]} c={circuits[m]} testId="harm-side" />
              </Fragment>
            ))}
          </div>
        </>
      ) : (
        <p className="shapes-note">Drawing…</p>
      )}
    </div>
  );
}
