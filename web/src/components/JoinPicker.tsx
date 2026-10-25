/**
 * `JoinPicker` — search pairings by what a tile joins. One tile at a time,
 * drawn like the `TileEditor` (edges in their class colours, numbered by
 * class): tap an edge, then another, to ask for a chord between them on that
 * tile. ‹ › (or ← →) step through the tiles; each join shows as a chip, and
 * all of them must hold.
 */

import { useMemo, useState } from 'react';
import { edgeLabels, leafOrder, leafPts, parseEdgeLabel, type EdgeJoin, type Pt, type TileFamilyId } from '../core';
import { edgeClassColor } from '../lib/palette';

export interface JoinPickerProps {
  readonly family: TileFamilyId;
  readonly joins: readonly EdgeJoin[];
  onChange(joins: readonly EdgeJoin[]): void;
}

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function JoinPicker(props: JoinPickerProps): JSX.Element {
  const { family, joins, onChange } = props;
  const types = leafOrder(family);
  const [t, setT] = useState(0);
  const [pending, setPending] = useState<number | null>(null);
  const type = types[Math.min(t, types.length - 1)];
  const outline = leafPts(family, type);
  const classes = useMemo(() => edgeLabels(family, type).map((l) => parseEdgeLabel(l).major), [family, type]);
  const box = useMemo(() => {
    const xs = outline.map((p) => p.x);
    const ys = outline.map((p) => p.y);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const pad = span * 0.16;
    return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + 2 * pad, h: Math.max(...ys) - Math.min(...ys) + 2 * pad, span };
  }, [outline]);
  const centre = outline.reduce((c, p) => ({ x: c.x + p.x / outline.length, y: c.y + p.y / outline.length }), { x: 0, y: 0 });
  const sw = box.span / 60;
  const step = (d: number) => {
    setPending(null);
    setT((i) => (i + d + types.length) % types.length);
  };
  const tap = (e: number) => {
    if (pending === null) return setPending(e);
    if (pending === e) return setPending(null);
    const a = Math.min(pending, e);
    const b = Math.max(pending, e);
    setPending(null);
    if (!joins.some((j) => j.type === type && j.a === a && j.b === b)) onChange([...joins, { type, a, b }]);
  };
  const edgeMid = (e: number) => mid(outline[e], outline[(e + 1) % outline.length]);
  const label = (j: EdgeJoin) => {
    const cls = edgeLabels(family, j.type).map((l) => parseEdgeLabel(l).major);
    return `${j.type} ${cls[j.a]}–${cls[j.b]}`;
  };
  return (
    <div
      className="join-picker"
      data-testid="join-picker"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'ArrowRight') step(1);
        else return;
        e.preventDefault();
      }}
    >
      <div className="join-picker-head">
        <button type="button" onClick={() => step(-1)} aria-label="Previous tile">
          ‹
        </button>
        <b data-testid="join-picker-type">{type}</b>
        <button type="button" onClick={() => step(1)} aria-label="Next tile">
          ›
        </button>
        <span className="muted">{pending === null ? 'tap an edge, then the edge it should join' : 'now the edge to join it to'}</span>
      </div>
      <svg className="join-picker-stage" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}>
        <polygon points={outline.map((p) => `${p.x},${p.y}`).join(' ')} className="tile-editor-body" />
        {joins
          .filter((j) => j.type === type)
          .map((j) => {
            const a = edgeMid(j.a);
            const b = edgeMid(j.b);
            return <line key={`${j.a}-${j.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--accent)" strokeWidth={sw * 2} strokeLinecap="round" />;
          })}
        {outline.map((p, e) => {
          const q = outline[(e + 1) % outline.length];
          const m = mid(p, q);
          const len = Math.hypot(m.x - centre.x, m.y - centre.y) || 1;
          const out = { x: m.x + ((m.x - centre.x) / len) * box.span * 0.08, y: m.y + ((m.y - centre.y) / len) * box.span * 0.08 };
          const on = pending === e;
          return (
            <g key={e} className="join-picker-edge" data-edge={e} data-major={classes[e]} onClick={() => tap(e)} role="button" aria-label={`${type} edge ${e} (class ${classes[e]})`} aria-pressed={on}>
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="transparent" strokeWidth={sw * 8} />
              <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={on ? 'var(--accent)' : edgeClassColor(classes[e])} strokeWidth={sw * (on ? 3.2 : 1.8)} strokeLinecap="round" />
              <text x={out.x} y={out.y} fontSize={box.span * 0.065} textAnchor="middle" dominantBaseline="central" fill={edgeClassColor(classes[e])}>
                {classes[e]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="join-picker-joins" data-testid="join-picker-joins">
        {joins.length === 0 ? <span className="muted">No joins: any pairing matches.</span> : null}
        {joins.map((j, i) => (
          <button key={`${j.type}-${j.a}-${j.b}`} type="button" className="join-chip mono" onClick={() => onChange(joins.filter((_, k) => k !== i))} title="Remove">
            {label(j)} ×
          </button>
        ))}
      </div>
    </div>
  );
}

export default JoinPicker;
