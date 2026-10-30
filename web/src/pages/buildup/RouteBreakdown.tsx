/**
 * One route of a supertile taken apart: drawn on the supertile with its
 * children outlined, the children it passes through filled, and listed as
 * its child arcs in order, each of which opens into its own child arcs.
 */
import { Fragment, useMemo, useState } from 'react';
import type { HexType } from '../../core';
import { tileColor } from '../../lib/palette';
import type { CircuitShapes } from '../shapes/circuitShapes';
import { childArcs, childShapes, composition, drawLevel, routePieces, type ChildArc } from './routes';
import { bounds } from './TableFigure';

const nf = (n: number) => n.toLocaleString('en-US');
/** Most chords the route is drawn with. */
const BUDGET = 4000;

export interface Pick {
  readonly level: number;
  /** Types sharing the table the route was picked on. */
  readonly types: readonly HexType[];
  readonly type: HexType;
  readonly from: number;
}

function ArcRows(props: { cs: CircuitShapes; n: number; arcs: readonly ChildArc[]; path: string; keyBase: string; open: Set<string>; toggle: (p: string) => void; hover?: (i: number | null) => void }): JSX.Element {
  const { cs, n, arcs, path, open, toggle } = props;
  return (
    <>
      {arcs.map((a, i) => {
        const at = path ? `${path}.${a.slot}` : `${a.slot}`;
        const key = `${props.keyBase}/${i}`;
        const deeper = n - 1 >= 1;
        const isOpen = open.has(key);
        const sub = deeper && isOpen ? childArcs(cs, n - 1, a.type, a.from) : null;
        return (
          <Fragment key={key}>
            <tr onMouseEnter={props.hover ? () => props.hover!(i) : undefined} onMouseLeave={props.hover ? () => props.hover!(null) : undefined}>
              <td className="bu-path" style={{ paddingLeft: `${path.split('.').filter(Boolean).length * 1.1}em` }}>
                {deeper ? (
                  <button type="button" className="bu-open" aria-expanded={isOpen} onClick={() => toggle(key)} data-testid="bu-open">
                    {isOpen ? '−' : '+'}
                  </button>
                ) : <span className="bu-open" />}
                {at}
              </td>
              <td><span className="bu-name" style={{ background: tileColor(a.type) }}>{a.type}</span></td>
              <td className="num">{a.from} → {a.to}</td>
              <td className="num">{nf(a.tiles)}</td>
              <td className="bu-comp">{deeper ? composition(cs.enters(n - 1, a.type, a.from).map((e) => e.type)) : ''}</td>
            </tr>
            {sub && <ArcRows cs={cs} n={n - 1} arcs={sub} path={at} keyBase={key} open={open} toggle={toggle} />}
          </Fragment>
        );
      })}
    </>
  );
}

export function RouteBreakdown(props: { cs: CircuitShapes; pick: Pick; onType: (t: HexType) => void }): JSX.Element {
  const { cs, pick } = props;
  const n = pick.level;
  const T = cs.levels[n][pick.type];
  const to = T.mate(pick.from);
  const arcs = useMemo(() => childArcs(cs, n, pick.type, pick.from), [cs, n, pick.type, pick.from]);
  const drawn = useMemo(() => {
    const stop = drawLevel(cs, n, pick.type, pick.from, BUDGET);
    const kids = childShapes(cs, n, pick.type);
    const pieces = routePieces(cs, n, pick.type, pick.from, stop);
    const all = kids.flatMap((c) => c.outline);
    const [minX, maxX] = bounds(all.map((p) => p.x)), [minY, maxY] = bounds(all.map((p) => p.y));
    const span = Math.max(maxX - minX, maxY - minY) || 1;
    const centre = (pts: readonly { x: number; y: number }[]) => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length });
    return { stop, kids, pieces, minX, maxY, span, centre };
  }, [cs, n, pick.type, pick.from]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);
  const toggle = (k: string) => setOpen((s) => { const t = new Set(s); if (t.has(k)) t.delete(k); else t.add(k); return t; });
  const passed = new Set(arcs.map((a) => a.slot));
  const { minX, maxY, span } = drawn;
  const pad = span * 0.04;
  const line = (pts: readonly { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${(p.x - minX).toFixed(4)} ${(maxY - p.y).toFixed(4)}`).join('');
  const slots = composition(arcs.map((a) => String(a.slot)));
  return (
    <div className="bu-route-view" data-testid="bu-breakdown">
      <div className="bu-route-head">
        <strong>{nf(T.len(pick.from))} tiles</strong>
        <span className="bu-muted">place {pick.from} to place {to} of a level-{n}</span>
        {pick.types.length > 1 ? (
          <span className="bu-names">
            {pick.types.map((t) => (
              <button key={t} type="button" className={`bu-name${t === pick.type ? ' is-active' : ''}`} style={{ background: tileColor(t) }} onClick={() => props.onType(t)}>{t}</button>
            ))}
          </span>
        ) : <span className="bu-name" style={{ background: tileColor(pick.type) }}>{pick.type}</span>}
      </div>
      <dl className="bu-comp-line">
        <dt>Composition</dt><dd data-testid="bu-composition">{composition(arcs.map((a) => a.type))}</dd>
        <dt>Slots</dt><dd>{slots}</dd>
      </dl>
      <div className="bu-route-body">
        <figure className="bu-route-fig">
          <svg viewBox={`${-pad} ${-pad} ${span + 2 * pad} ${span + 2 * pad}`} role="img" aria-label="The route on its supertile, children outlined">
            {drawn.kids.map((c) => (
              <path key={c.slot} d={`${line(c.outline)}Z`} className={`bu-child${passed.has(c.slot) ? ' is-passed' : ''}`} style={passed.has(c.slot) ? { fill: tileColor(c.type) } : undefined} vectorEffect="non-scaling-stroke">
                <title>{`Slot ${c.slot}: ${c.type}`}</title>
              </path>
            ))}
            {drawn.pieces.map((p, i) => <path key={i} d={line(p)} className={`bu-piece${hover === i ? ' is-hover' : ''}`} vectorEffect="non-scaling-stroke" />)}
            {drawn.kids.map((c) => {
              const m = drawn.centre(c.outline);
              return <text key={c.slot} x={m.x - minX} y={maxY - m.y} className="bu-slot" fontSize={span * 0.045}>{c.slot}</text>;
            })}
          </svg>
          <figcaption>Drawn through level-{drawn.stop} arcs.</figcaption>
        </figure>
        <div className="bu-arcs-wrap">
          <table className="bu-summary-table bu-arcs" data-testid="bu-arcs">
            <thead><tr><th>Slot path</th><th>Child</th><th className="num">Entry → exit</th><th className="num">Tiles</th><th>Its composition</th></tr></thead>
            <tbody>
              <ArcRows cs={cs} n={n} arcs={arcs} path="" keyBase="" open={open} toggle={toggle} hover={setHover} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
