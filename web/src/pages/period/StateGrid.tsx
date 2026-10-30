/**
 * Every type's border at every level, drawn straight: crossings spaced
 * evenly along the six edges of a regular hexagon, routes coloured by the
 * order of their first crossing. Equal borders are equal pictures.
 */
import { HEX_TYPES, type Pt } from '../../core';
import { sameState, type Border, type State } from './period';
import { routeCurve } from './scene';

/** Corner 0 of the hexagon a border is drawn on, at this angle from its centre. */
const STRAIGHT_START = (5 * Math.PI) / 6;

/** Most crossings a cell is drawn with. */
const MAX_DRAWN = 300;

const nf = (n: number) => n.toLocaleString('en-US');

export function straightPts(b: Border): Pt[] {
  const hex = Array.from({ length: 6 }, (_, j) => ({ x: Math.cos(STRAIGHT_START + (j * Math.PI) / 3), y: Math.sin(STRAIGHT_START + (j * Math.PI) / 3) }));
  const out: Pt[] = [];
  for (let j = 0; j < 6; j++) {
    const p = hex[j], q = hex[(j + 1) % 6], m = b.perEdge[j];
    for (let i = 0; i < m; i++) out.push({ x: p.x + ((q.x - p.x) * (i + 1)) / (m + 1), y: p.y + ((q.y - p.y) * (i + 1)) / (m + 1) });
  }
  return out;
}

export function StraightBorder(props: { b: Border; label: string }): JSX.Element {
  const { b } = props;
  if (b.mate.length > MAX_DRAWN) return <span className="pd-many">{nf(b.mate.length)} crossings</span>;
  const pts = straightPts(b);
  const hex = Array.from({ length: 6 }, (_, j) => `${Math.cos(STRAIGHT_START + (j * Math.PI) / 3)},${-Math.sin(STRAIGHT_START + (j * Math.PI) / 3)}`).join(' ');
  const routes: [number, number][] = [];
  b.mate.forEach((q, p) => { if (q > p) routes.push([p, q]); });
  return (
    <svg viewBox="-1.15 -1.15 2.3 2.3" role="img" aria-label={props.label} className="pd-straight">
      <polygon points={hex} className="pd-hex" vectorEffect="non-scaling-stroke" />
      {routes.map(([p, q], i) => (
        <path
          key={p}
          d={routeCurve(pts[p], pts[q], { x: 0, y: 0 }, 16).map((c, k) => `${k ? 'L' : 'M'}${c.x.toFixed(3)} ${(-c.y).toFixed(3)}`).join('')}
          className={`pd-r pd-r${i < 8 ? i : 'x'}`}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {pts.length <= 60 && pts.map((p, i) => <circle key={i} cx={p.x} cy={-p.y} r={0.045} className="pd-dot" />)}
    </svg>
  );
}

/** For each level, the lowest level with the same borders (itself if none lower). */
export function firstEqual(states: readonly State[]): number[] {
  return states.map((s, n) => {
    for (let m = 0; m < n; m++) if (sameState(states[m], s)) return m;
    return n;
  });
}

export function StateGrid(props: { states: readonly State[] }): JSX.Element {
  const { states } = props;
  const eq = firstEqual(states);
  return (
    <div className="pd-grid-wrap">
      <table className="pd-grid" data-testid="pd-grid">
        <thead>
          <tr>
            <th scope="col">Type</th>
            {states.map((_, n) => (
              <th key={n} scope="col" className={eq[n] !== n ? 'is-repeat' : ''}>
                {n === 0 ? 'Tiles' : `Level ${n}`}
                <span>{eq[n] !== n ? `= ${eq[n] === 0 ? 'tiles' : `level ${eq[n]}`}` : ' '}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HEX_TYPES.map((t) => (
            <tr key={t}>
              <th scope="row">{t}</th>
              {states.map((s, n) => (
                <td key={n} className={eq[n] !== n ? 'is-repeat' : ''}>
                  <StraightBorder b={s[t]} label={`${t} at level ${n}: ${s[t].mate.length} crossings`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
