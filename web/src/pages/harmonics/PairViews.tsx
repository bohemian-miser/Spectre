/**
 * A circuit beside the circuit it is lined up with, supertile for supertile
 * (`pairView.ts`): drawn over the supertiles each runs through, B at level
 * k + offset beside A at level k, and expanded from their birth supertiles
 * level by level. Supertiles and visits the other reading does not share are
 * outlined.
 */

import { useEffect, useMemo, useState } from 'react';
import { tileColor } from '../../lib/palette';
import type { CircuitInfo, HarmonicsClient } from './harmonicsJob';
import { SUPERTILE_CAP, VISIT_CAP, type Expansion, type ExpandedRow, type PairPicture, type Side } from './pairView';

const nf = (n: number) => n.toLocaleString('en-US');

const path = (xy: Float64Array, close: boolean): string => {
  let d = '';
  for (let i = 0; i < xy.length; i += 2) d += `${i ? 'L' : 'M'}${xy[i].toFixed(3)} ${xy[i + 1].toFixed(3)}`;
  return close && d ? `${d}Z` : d;
};

function SideFigure(props: { side: Side; colour: string; name: string; testId: string }): JSX.Element {
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
        <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} role="img" aria-label={`${props.name} over its supertiles at level ${side.level}`}>
          <g transform="scale(1 -1)">
            {side.supertiles.map((s) => (
              <path
                key={s.path}
                d={path(s.outline, true)}
                className={s.unshared ? 'harm-st harm-st-unshared' : 'harm-st'}
                style={{ ['--chip' as string]: tileColor(s.type, 'bright') }}
                vectorEffect="non-scaling-stroke"
              >
                <title>{`${s.type} ${s.path}`}</title>
              </path>
            ))}
            <path d={path(side.circuit, true)} fill="none" stroke={props.colour} strokeOpacity={0.8} strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
      ) : (
        <div className="harm-side-empty">{nf(side.visits)} visits at level {side.level}: more than {nf(VISIT_CAP)}, not drawn.</div>
      )}
      <figcaption>
        {props.name} at level {side.level}: {nf(side.visits)} visits through {drawn ? nf(side.count) : 'its'} supertiles
        {drawn && side.count > side.supertiles.length ? ` (the first ${nf(SUPERTILE_CAP)} drawn)` : ''}
        {unshared ? `; ${nf(unshared)} hold visits the other lacks` : ''}.
      </figcaption>
    </figure>
  );
}

const STATE: Record<PairPicture['state'], string> = {
  same: 'The two readings agree at these levels.',
  differs: 'The readings differ here: outlined supertiles hold visits the other reading does not share.',
  long: 'The readings are too long to line up at these levels.',
  unread: 'One of the two is not read at its level.',
};

/** B over its supertiles at level k + offset beside A over its supertiles at level k, with a slider for k. */
export function PairSupertiles(props: { client: HarmonicsClient; level: number; ai: number; bi: number; a: CircuitInfo; b: CircuitInfo }): JSX.Element {
  const { client, ai, bi, a, b } = props;
  const offset = b.level - a.level;
  const lo = Math.max(0, -offset);
  const hi = Math.min(a.level - 1, b.level - 1 - offset);
  const [k, setK] = useState(hi);
  const [picture, setPicture] = useState<PairPicture | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setK(hi), [ai, bi, hi, props.level]);
  const at = Math.min(Math.max(k, lo), hi);
  useEffect(() => {
    let on = true;
    setError(null);
    client
      .picture(ai, bi, at)
      .then((p) => on && setPicture(p))
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
  }, [client, ai, bi, at, props.level]);
  if (hi < lo) return <></>;
  const current = picture && picture.k === at ? picture : null;
  const types = current ? [...new Set([...current.a.supertiles, ...current.b.supertiles].map((s) => s.type))].sort() : [];
  return (
    <div className="harm-supertiles" data-testid="harm-supertiles">
      <h3>Supertile for supertile</h3>
      <label className="harm-slider">
        Level k = {at}
        <input type="range" min={lo} max={hi} step={1} value={at} onChange={(e) => setK(Number(e.target.value))} data-testid="harm-k" />
        <span className="shapes-note">
          the {nf(b.length)} at level {at + offset} beside the {nf(a.length)} at level {at}
        </span>
      </label>
      {error ? <p className="shapes-note">Could not draw: {error}</p> : null}
      {current ? (
        <>
          <p className="shapes-note" data-testid="harm-picture-state">
            {STATE[current.state]}
          </p>
          <div className="harm-pair">
            <SideFigure side={current.b} colour="currentColor" name={`the ${nf(b.length)}`} testId="harm-side-b" />
            <SideFigure side={current.a} colour="currentColor" name={`the ${nf(a.length)}`} testId="harm-side-a" />
          </div>
          <p className="harm-legend">
            {types.map((t) => (
              <span key={t} className="harm-chip" style={{ ['--chip' as string]: tileColor(t, 'bright') }}>
                {t}
              </span>
            ))}
          </p>
        </>
      ) : (
        <p className="shapes-note">Drawing…</p>
      )}
    </div>
  );
}

function Row(props: { row: ExpandedRow; deepest: boolean; backtracks: boolean; onExpand: () => void }): JSX.Element {
  const { row } = props;
  const shown = props.backtracks ? row.raw : row.kept;
  const total = props.backtracks ? row.visits : row.visits - row.cancelled;
  return (
    <div className="harm-xrow">
      <div className="harm-xhead">
        level {row.level} · {nf(row.visits)} visits{row.cancelled ? `, ${nf(row.cancelled)} cancelled` : ''}
        {row.unshared ? `, ${nf(row.unshared)} unshared` : ''}
      </div>
      <div className="harm-tokens">
        {shown.map((v, q) => (
          <button
            type="button"
            key={q}
            className={`harm-chip harm-xchip harm-x-${v.mark}${v.mark === 'unshared' ? ' harm-token-differs' : ''}${q && v.up !== shown[q - 1].up ? ' harm-xnew' : ''}`}
            style={{ ['--chip' as string]: tileColor(v.type, 'bright') }}
            title={`${v.type} in slot ${v.slot}${v.mark === 'cancelled' ? ', a backtrack: not in the reading' : v.mark === 'unshared' ? ', not shared by the other reading' : ''}${props.deepest ? '; click to expand a level further' : ''}`}
            onClick={props.deepest ? props.onExpand : undefined}
          >
            {v.type} {v.slot}
          </button>
        ))}
        {total > shown.length ? <span className="harm-token harm-more">… {nf(total - shown.length)} more</span> : null}
      </div>
    </div>
  );
}

/** B and A expanded from their birth supertiles a level at a time, B's level n + offset beside A's level n. */
export function PairExpansion(props: { client: HarmonicsClient; level: number; ai: number; bi: number; a: CircuitInfo; b: CircuitInfo }): JSX.Element {
  const { client, ai, bi, a, b } = props;
  const [depth, setDepth] = useState(0);
  const [backtracks, setBacktracks] = useState(false);
  const [result, setResult] = useState<{ depth: number; x: Expansion } | null>(null);
  useEffect(() => setDepth(0), [ai, bi, props.level]);
  useEffect(() => {
    let on = true;
    client.expansion(ai, bi, depth).then((x) => on && setResult({ depth, x }));
    return () => {
      on = false;
    };
  }, [client, ai, bi, depth, props.level]);
  const x = result?.x ?? null;
  const more = x ? x.more : true;
  const expand = () => more && setDepth((d) => (x ? x.rows.length : d) + 1);
  const birth = (c: CircuitInfo) => (
    <button type="button" className="harm-chip harm-xchip harm-xbirth" style={{ ['--chip' as string]: tileColor(c.type, 'bright') }} onClick={() => (depth === 0 ? expand() : undefined)} title="the birth supertile; click to expand">
      {c.type}, level {c.level}
    </button>
  );
  return (
    <div className="harm-expansion" data-testid="harm-expansion">
      <h3>Expanded from the birth supertiles</h3>
      <div className="shapes-controls">
        <button type="button" disabled={!more} onClick={expand} data-testid="harm-expand">
          One level down
        </button>
        <button type="button" disabled={depth === 0} onClick={() => setDepth((d) => Math.max(0, Math.min(d, x?.rows.length ?? d) - 1))}>
          One level up
        </button>
        <label className="harm-check">
          <input type="checkbox" checked={backtracks} onChange={(e) => setBacktracks(e.target.checked)} data-testid="harm-backtracks" /> backtracks
        </label>
        <span className="shapes-note">
          Each row lists the supertiles the circuit runs through at a level, in order, as type and slot; a gap starts the children of the next supertile
          above. Backtracks across a seam are left out of the reading, and listed faded when asked for; outlined visits are ones the other reading does
          not share. = marks a level where the two readings agree.
        </span>
      </div>
      <div className="harm-xgrid">
        <div className="harm-xcol-head">the {nf(b.length)}</div>
        <div />
        <div className="harm-xcol-head">the {nf(a.length)}</div>
        <div>{birth(b)}</div>
        <div />
        <div>{birth(a)}</div>
        {(x?.rows ?? []).map((r, i, rows) => (
          <div key={r.depth} className="harm-xline" data-testid="harm-xrow">
            <Row row={r.b} deepest={i === rows.length - 1} backtracks={backtracks} onExpand={expand} />
            <div className={r.same ? 'harm-same' : 'harm-differs'}>{r.same ? '=' : '≠'}</div>
            <Row row={r.a} deepest={i === rows.length - 1} backtracks={backtracks} onExpand={expand} />
          </div>
        ))}
      </div>
      {x && !x.more && x.rows.length < Math.min(a.level, b.level) ? <p className="shapes-note">The next level has too many visits to list.</p> : null}
    </div>
  );
}
