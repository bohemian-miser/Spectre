/**
 * Flow lattice: give every hexagon edge a direction and the tail-free rule
 * becomes "flow in = flow out", whose whole-number solutions form a lattice.
 * The left plot is a 2D slice of it (a·u + b·v for two basis loops); clicking
 * a point draws that circuit on a hexagon supertile, with as many parallel
 * lines per edge as its flow needs. The maths lives in core/flowLattice.ts.
 */

import { useMemo, useState } from 'react';
import {
  combine,
  defaultAxes,
  describeFlow,
  flowModel,
  hexPatch,
  linesNeeded,
  pairStrands,
  tileStrandPoints,
  type FlowMode,
  type FlowModel,
  type Strand,
} from '../core/flowLattice';
import type { Pt } from '../core/geom';
import '../styles/lattice.css';

const RANGE = 3;
const CELL = 46;
const LEVELS = [1, 2, 3] as const;

const MODE_TEXT: Record<FlowMode, string> = {
  labels: 'Project labels: one flow per class',
  groups: 'Meeting groups: one flow per set of edges that touch',
};

function vecAt(model: FlowModel, axes: readonly [number, number], a: number, b: number): number[] {
  const coeffs = model.basis.map((_, i) => (i === axes[0] ? a : 0) + (i === axes[1] && axes[1] !== axes[0] ? b : 0));
  return combine(model.basis, coeffs, model.vars.length);
}

export default function LatticePage(): JSX.Element {
  const [mode, setMode] = useState<FlowMode>('labels');
  const model = useMemo(() => flowModel(mode), [mode]);
  const [axes, setAxes] = useState<[number, number]>(() => defaultAxes(flowModel('labels')));
  const [maxLines, setMaxLines] = useState(1);
  const [level, setLevel] = useState(2);
  const [sel, setSel] = useState<[number, number]>([1, 0]);

  const pickMode = (m: FlowMode) => {
    setMode(m);
    setAxes(defaultAxes(flowModel(m)));
    setSel([1, 0]);
  };
  const flat = model.basis.length < 2;
  const x = useMemo(() => vecAt(model, axes, sel[0], flat ? 0 : sel[1]), [model, axes, sel, flat]);

  return (
    <article className="lattice-page">
      <header>
        <h1>Flow lattice</h1>
        <p className="muted">
          Give every edge a direction. A strand leaving one hexagon enters its neighbour, so glued
          edges get opposite signs (the <span className="mono">+k</span> /{' '}
          <span className="mono">−k</span> in the labels). A tile is happy when as much flows in as
          flows out. Each edge class then carries a whole number: +1 is one strand out, −1 one strand
          in, +2 two strands out. The circuits that balance every tile form a <em>lattice</em>: add
          two and you get another.
        </p>
        <p className="muted">
          The plot shows a slice of that lattice: <em>a</em> copies of one basis loop plus{' '}
          <em>b</em> of another. Each dot shows how many lines its busiest edge needs. Click one to
          draw it.
        </p>
      </header>

      <div className="lattice-controls" role="group" aria-label="Lattice controls">
        <label>
          Unknowns
          <select value={mode} onChange={(e) => pickMode(e.target.value as FlowMode)}>
            {(['labels', 'groups'] as const).map((m) => (
              <option key={m} value={m}>
                {MODE_TEXT[m]}
              </option>
            ))}
          </select>
        </label>
        {(['a', 'b'] as const).map((name, k) =>
          flat && k === 1 ? null : (
            <label key={name}>
              Axis {name}
              <select
                value={axes[k]}
                onChange={(e) => {
                  const next: [number, number] = [...axes];
                  next[k] = Number(e.target.value);
                  setAxes(next);
                }}
              >
                {model.basis.map((b, i) => (
                  <option key={i} value={i}>
                    {describeFlow(model, b)}
                  </option>
                ))}
              </select>
            </label>
          ),
        )}
        <label>
          Lines per edge
          <select value={maxLines} onChange={(e) => setMaxLines(Number(e.target.value))}>
            {[1, 2, 3].map((m) => (
              <option key={m} value={m}>
                up to {m}
              </option>
            ))}
          </select>
        </label>
        <label>
          Supertile level
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="lattice-panels">
        <section className="lattice-panel" aria-labelledby="lattice-plot-h">
          <h2 id="lattice-plot-h">Lattice slice</h2>
          <LatticePlot
            model={model}
            axes={axes}
            flat={flat}
            maxLines={maxLines}
            sel={sel}
            onPick={(a, b) => setSel([a, b])}
          />
          <Readout model={model} x={x} sel={sel} flat={flat} />
        </section>
        <section className="lattice-panel" aria-labelledby="lattice-patch-h">
          <h2 id="lattice-patch-h">The circuit</h2>
          <CircuitPatch model={model} x={x} level={level} />
        </section>
      </div>

      <section aria-labelledby="lattice-matrix-h">
        <h2 id="lattice-matrix-h">The signed matrix</h2>
        <p>
          One row per tile type, one column per unknown. An entry is the tile&rsquo;s outward edges of
          that kind minus its inward ones, so a circuit is a column of numbers that makes every row
          sum to zero. Dropped as directionless:{' '}
          <span className="mono">{model.dropped.join(', ') || 'nothing'}</span> (the Psi&rsquo;s
          class-0 edge meets another Psi&rsquo;s class-0 edge, so its flow would have to equal its own
          negative). The lattice has dimension {model.basis.length}.
        </p>
        <MatrixTable model={model} />
        <p className="muted">
          The two choices of unknowns differ. Some classes (2, 3, 5, 8) split into groups of edges that
          never touch each other. The labels tie those groups&rsquo; flows together with their{' '}
          <span className="mono">±</span> convention; the meeting groups let each one flow on its own,
          which is why that lattice is bigger.
        </p>
      </section>
    </article>
  );
}

function LatticePlot(props: {
  model: FlowModel;
  axes: readonly [number, number];
  flat: boolean;
  maxLines: number;
  sel: readonly [number, number];
  onPick: (a: number, b: number) => void;
}): JSX.Element {
  const { model, axes, flat, maxLines, sel, onPick } = props;
  const span = 2 * RANGE + 1;
  const pad = 30;
  const size = span * CELL + 2 * pad;
  const rows = flat ? [0] : Array.from({ length: span }, (_, i) => RANGE - i);
  const cols = Array.from({ length: span }, (_, i) => i - RANGE);
  const height = flat ? CELL + 2 * pad : size;
  const cx = (a: number) => pad + (a + RANGE + 0.5) * CELL;
  const cy = (b: number) => pad + (flat ? 0.5 * CELL : (RANGE - b + 0.5) * CELL);
  const within = new Map<number, number>();
  const dots = rows.flatMap((b) =>
    cols.map((a) => {
      const lines = linesNeeded(vecAt(model, axes, a, b));
      for (let m = Math.max(lines, 1); m <= 3; m++) within.set(m, (within.get(m) ?? 0) + 1);
      return { a, b, lines };
    }),
  );
  return (
    <div className="lattice-plot-box">
      <svg
        className="lattice-plot"
        viewBox={`0 0 ${size} ${height}`}
        role="img"
        aria-label="Lattice slice: click a point to draw its circuit"
      >
        <line className="lattice-axis" x1={pad} x2={size - pad} y1={cy(0)} y2={cy(0)} />
        {!flat && <line className="lattice-axis" x1={cx(0)} x2={cx(0)} y1={pad} y2={size - pad} />}
        <text className="lattice-axis-label" x={size - pad} y={cy(0) - 8} textAnchor="end">
          a
        </text>
        {!flat && (
          <text className="lattice-axis-label" x={cx(0) + 8} y={pad + 10}>
            b
          </text>
        )}
        {dots.map(({ a, b, lines }) => {
          const picked = a === sel[0] && b === sel[1];
          const tier = lines === 0 ? 'zero' : lines > maxLines ? 'out' : String(Math.min(lines, 3));
          return (
            <g
              key={`${a},${b}`}
              className={`lattice-pt lattice-pt-${tier}${picked ? ' is-picked' : ''}`}
              data-testid={`lattice-pt-${a}_${b}`}
              role="button"
              tabIndex={0}
              aria-label={`a = ${a}, b = ${b}: ${lines} line${lines === 1 ? '' : 's'}`}
              onClick={() => onPick(a, b)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick(a, b);
                }
              }}
            >
              <title>{describeFlow(model, vecAt(model, axes, a, b))}</title>
              <circle cx={cx(a)} cy={cy(b)} r={15} />
              <text x={cx(a)} y={cy(b) + 4} textAnchor="middle">
                {lines}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="muted lattice-counts" data-testid="lattice-counts">
        In this slice: {within.get(1) ?? 0} circuits with one line per edge,{' '}
        {within.get(2) ?? 0} with up to two, {within.get(3) ?? 0} with up to three.
      </p>
    </div>
  );
}

function Readout(props: { model: FlowModel; x: readonly number[]; sel: readonly [number, number]; flat: boolean }): JSX.Element {
  const { model, x, sel, flat } = props;
  const odd = x.flatMap((v, k) => (v % 2 !== 0 ? [model.vars[k].label] : []));
  const lines = linesNeeded(x);
  return (
    <dl className="lattice-readout" data-testid="lattice-readout">
      <dt>Point</dt>
      <dd className="mono">{flat ? `a = ${sel[0]}` : `a = ${sel[0]}, b = ${sel[1]}`}</dd>
      <dt>Flow</dt>
      <dd className="mono">{describeFlow(model, x)}</dd>
      <dt>Lines needed</dt>
      <dd>{lines === 0 ? 'none' : lines}</dd>
      <dt>What mod 2 sees</dt>
      <dd>
        <span className="mono">{odd.length ? odd.join(' ') : 'nothing'}</span>
        <span className="muted"> (the edges with an odd number of lines)</span>
      </dd>
    </dl>
  );
}

function strandPath(s: Strand, centre: Pt): string {
  const mid = { x: (s.from.pos.x + s.to.pos.x) / 2, y: (s.from.pos.y + s.to.pos.y) / 2 };
  const c = { x: mid.x + (centre.x - mid.x) * 0.6, y: mid.y + (centre.y - mid.y) * 0.6 };
  return `M${s.from.pos.x},${s.from.pos.y} Q${c.x},${c.y} ${s.to.pos.x},${s.to.pos.y}`;
}

/** Arrowhead at the curve's midpoint, pointing the way the strand flows. */
function arrowHead(s: Strand, centre: Pt): string {
  const mid = { x: (s.from.pos.x + s.to.pos.x) / 2, y: (s.from.pos.y + s.to.pos.y) / 2 };
  const c = { x: mid.x + (centre.x - mid.x) * 0.6, y: mid.y + (centre.y - mid.y) * 0.6 };
  const p = { x: 0.25 * s.from.pos.x + 0.5 * c.x + 0.25 * s.to.pos.x, y: 0.25 * s.from.pos.y + 0.5 * c.y + 0.25 * s.to.pos.y };
  const dx = s.to.pos.x - s.from.pos.x;
  const dy = s.to.pos.y - s.from.pos.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const k = 0.17;
  const tip = { x: p.x + ux * k, y: p.y + uy * k };
  const l = { x: p.x - ux * k - uy * k * 0.8, y: p.y - uy * k + ux * k * 0.8 };
  const r = { x: p.x - ux * k + uy * k * 0.8, y: p.y - uy * k - ux * k * 0.8 };
  return `M${tip.x},${tip.y} L${l.x},${l.y} L${r.x},${r.y} Z`;
}

function CircuitPatch(props: { model: FlowModel; x: readonly number[]; level: number }): JSX.Element {
  const { model, x, level } = props;
  const tiles = useMemo(() => hexPatch(level), [level]);
  const view = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const t of tiles) {
      for (const p of t.pts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    const m = 0.4;
    return `${minX - m} ${minY - m} ${maxX - minX + 2 * m} ${maxY - minY + 2 * m}`;
  }, [tiles]);
  const drawn = useMemo(
    () =>
      tiles.map((t) => {
        const centre = {
          x: t.pts.reduce((a, p) => a + p.x, 0) / t.pts.length,
          y: t.pts.reduce((a, p) => a + p.y, 0) / t.pts.length,
        };
        const strands = pairStrands(tileStrandPoints(model, t.inst.type, x, t.pts)) ?? [];
        return { t, centre, strands };
      }),
    [tiles, model, x],
  );
  const strandCount = drawn.reduce((a, d) => a + d.strands.length, 0);
  return (
    <div className="lattice-patch-box">
      <svg
        className="lattice-patch"
        viewBox={view}
        role="img"
        aria-label={`Level ${level} hexagon supertile with the selected circuit`}
        data-strands={strandCount}
      >
        {drawn.map(({ t }) => (
          <polygon key={t.inst.id} className="lattice-tile" points={t.pts.map((p) => `${p.x},${p.y}`).join(' ')}>
            <title>{t.inst.type}</title>
          </polygon>
        ))}
        {drawn.map(({ t, centre, strands }) =>
          strands.map((s, i) => (
            <g key={`${t.inst.id}:${i}`} className="lattice-strand">
              <path d={strandPath(s, centre)} />
              <path className="lattice-arrow" d={arrowHead(s, centre)} />
            </g>
          )),
        )}
      </svg>
      <p className="muted">
        {strandCount === 0
          ? 'The empty circuit: pick another point.'
          : `${strandCount} strand pieces across ${tiles.length} tiles. Arrows point the way the flow runs; edges with flow 2 carry two parallel lines.`}
      </p>
    </div>
  );
}

function MatrixTable({ model }: { model: FlowModel }): JSX.Element {
  return (
    <div className="lattice-table-box">
      <table className="lattice-table" data-testid="lattice-matrix">
        <thead>
          <tr>
            <th scope="col">Tile</th>
            {model.vars.map((v) => (
              <th key={v.label} scope="col">
                {v.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.types.map((t, i) => (
            <tr key={t}>
              <th scope="row">{t}</th>
              {model.matrix[i].map((v, k) => (
                <td key={k} className={v === 0 ? 'is-zero' : undefined}>
                  {v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '·'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
