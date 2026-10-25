/**
 * Flow lattice: give every hexagon edge a direction and the tail-free rule
 * becomes "flow in = flow out", whose whole-number solutions form a lattice.
 * The left plot is a 2D slice of it (a·u + b·v for two basis loops); clicking
 * a point draws that circuit on a hexagon supertile, with as many parallel
 * lines per edge as its flow needs. The maths lives in core/flowLattice.ts.
 */

import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  applyMatching,
  combine,
  defaultAxes,
  directedMatchings,
  describeFlow,
  directedNet,
  edgeVar,
  flowLines,
  flowModel,
  hexPatch,
  liftZero,
  netFlow,
  signedArea,
  tileStrandPoints,
  traceStrandPaths,
  zeroFlow,
  zeroLines,
  type FlowMode,
  type DirectedMatching,
  type FlowModel,
  type Strand,
} from '../core/flowLattice';
import { HEX_PTS, edgeLabels, type TileTypeId } from '../core/families';
import { parseEdgeLabel } from '../core/edges';
import type { Pt } from '../core/geom';
import { edgeClassColor } from '../lib/palette';
import '../styles/lattice.css';

const RANGE = 3;
/** How far the per-class counters go each way. */
const MAX_COUNT = 9;
const CELL = 46;
const LEVELS = [1, 2, 3] as const;

const MODE_TEXT: Record<FlowMode, string> = {
  labels: 'Project labels: one flow per class',
  groups: 'Meeting groups: one flow per set of edges that touch',
};

function vecAt(model: FlowModel, axes: readonly [number, number], a: number, b: number): number[] {
  const coeffs = model.basis.map((_, i) => (i === axes[0] ? a : 0) + (i === axes[1] && axes[1] !== axes[0] ? b : 0));
  return liftZero(model, combine(model.basis, coeffs, model.vars.length));
}

/**
 * The usual axes, but with class 0 in, axis b is a loop that uses it: one that
 * mixes class 0 with the directed classes if there is one, else the pure ±2.
 */
function startAxes(model: FlowModel): [number, number] {
  const [a, b] = defaultAxes(model);
  const z = model.zeroVar;
  if (z < 0) return [a, b];
  const uses = model.basis.map((v) => v[z] !== 0);
  const mixed = model.basis.findIndex((v, i) => uses[i] && v.some((w, k) => k !== z && w !== 0));
  const pick = mixed >= 0 ? mixed : uses.indexOf(true);
  if (pick < 0 || pick === a || pick === b) return [a, b];
  return [a === pick ? b : a, pick];
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** Shown in the gallery at most; the counter still steps through all of them. */
const GALLERY_MAX = 60;

type ComboTable = Readonly<Record<string, ReturnType<typeof directedMatchings>>>;

const sameFlow = (p: readonly number[], q: readonly number[]) => p.length === q.length && p.every((v, k) => v === q[k]);

/** The slice point a flow sits on, or null when it's off the slice. */
function slicePoint(model: FlowModel, axes: readonly [number, number], flat: boolean, x: readonly number[]): [number, number] | null {
  for (let a = -RANGE; a <= RANGE; a++) {
    for (const b of flat ? [0] : Array.from({ length: 2 * RANGE + 1 }, (_, i) => i - RANGE)) {
      if (sameFlow(vecAt(model, axes, a, b), x)) return [a, b];
    }
  }
  return null;
}

function firstFlow(m: FlowModel): number[] {
  return vecAt(m, startAxes(m), 1, 0);
}

/** The tile's class-0 edge when class 0 runs either way, else −1. */
function zeroEdgeOf(model: FlowModel, type: TileTypeId): number {
  return model.zeroTypes.includes(type) ? edgeLabels('hex', type).findIndex((l) => parseEdgeLabel(l).major === 0) : -1;
}

export default function LatticePage(): JSX.Element {
  const [mode, setMode] = useState<FlowMode>('labels');
  const [zeroEither, setZeroEither] = useState(false);
  const model = useMemo(() => flowModel(mode, zeroEither), [mode, zeroEither]);
  const [axes, setAxes] = useState<[number, number]>(() => startAxes(flowModel('labels')));
  const [maxLines, setMaxLines] = useState(1);
  const [level, setLevel] = useState(2);
  const [x, setX] = useState<number[]>(() => firstFlow(flowModel('labels')));
  const [hoverVar, setHoverVar] = useState<number | null>(null);
  /** The column the arrow keys edit. */
  const [col, setCol] = useState(0);
  /** Which in→out pairing each tile type uses, and the tile the strip keys edit. */
  const [comboIdx, setComboIdx] = useState<Readonly<Record<string, number>>>({});
  const [tileSel, setTileSel] = useState(0);
  /** Last slice point picked; the plot's arrow keys move from here when the flow is off the slice. */
  const [cursor, setCursor] = useState<[number, number]>([1, 0]);

  const pickMode = (m: FlowMode) => {
    setMode(m);
    setAxes(startAxes(flowModel(m, zeroEither)));
    setX(firstFlow(flowModel(m, zeroEither)));
    setHoverVar(null);
    setCol(0);
    setComboIdx({});
    setTileSel(0);
    setCursor([1, 0]);
  };
  // The flow is kept, gaining (or losing) its class-0 lines; the basis moves.
  const pickZero = (on: boolean) => {
    const next = flowModel(mode, on);
    const byLabel = new Map(model.vars.map((v, k) => [v.label, x[k]]));
    setZeroEither(on);
    setAxes(startAxes(next));
    setX(liftZero(next, next.vars.map((v) => byLabel.get(v.label) ?? 0)));
    setCol(0);
    setComboIdx({});
  };
  const flat = model.basis.length < 2;
  const sel = slicePoint(model, axes, flat, x);
  const combos: ComboTable = useMemo(
    () => Object.fromEntries(model.types.map((t) => [t, directedMatchings(tileStrandPoints(model, t, x, HEX_PTS))])),
    [model, x],
  );
  const pick = (t: TileTypeId): number => {
    const n = combos[t].matchings.length;
    return n === 0 ? 0 : (((comboIdx[t] ?? 0) % n) + n) % n;
  };
  const chosen = useMemo(
    () => Object.fromEntries(model.types.map((t) => [t, combos[t].matchings[pick(t)] ?? null])) as Readonly<Record<string, DirectedMatching | null>>,
    // pick reads only combos and comboIdx.
    [model, combos, comboIdx],
  );
  const setCombo = (t: TileTypeId, i: number) => setComboIdx((c) => ({ ...c, [t]: i }));

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
          draw it, or set the flow on each class yourself in the matrix below: −2 on class 3 means two
          strands running through class 3 the reverse way.
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
        <label className="lattice-check">
          <input type="checkbox" checked={zeroEither} onChange={(e) => pickZero(e.target.checked)} data-testid="lattice-zero-toggle" />
          Class 0 either way
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
            cursor={sel ?? cursor}
            onPick={(a, b) => {
              setCursor([a, b]);
              setX(vecAt(model, axes, a, b));
            }}
          />
          <Readout model={model} x={x} sel={sel} flat={flat} />
        </section>
        <section className="lattice-panel" aria-labelledby="lattice-patch-h">
          <h2 id="lattice-patch-h">The circuit</h2>
          <CircuitPatch model={model} x={x} level={level} chosen={chosen} />
        </section>
      </div>

      <section aria-labelledby="lattice-matrix-h">
        <h2 id="lattice-matrix-h">Balance it by hand</h2>
        <p>
          One row per tile type, one column per {model.mode === 'labels' ? 'class' : 'group'}. An entry
          is the tile&rsquo;s outward edges of that kind minus its inward ones. Set a flow in the top
          row and every entry in that column turns into what it contributes (entry × flow), so each row
          reads as a sum: <span className="mono">+2 − 1 − 1</span>. The last column is that sum, the
          tile&rsquo;s net flow. A circuit is a top row that makes every net zero.
        </p>
        <div className="lattice-balance-grid">
          <MatrixEditor
            model={model}
            x={x}
            onChange={setX}
            hover={hoverVar}
            onHover={setHoverVar}
            selected={col}
            onSelect={setCol}
          />
          <FlowTileStrip
            model={model}
            x={x}
            hover={hoverVar ?? col}
            onHover={setHoverVar}
            combos={combos}
            pick={pick}
            onCombo={setCombo}
            selected={tileSel}
            onSelect={setTileSel}
          />
        </div>
        <p className="muted">
          Each tile shows its edges in their class colours with the class number outside. Strands run
          in through one edge and out through another; a tile whose row doesn&rsquo;t sum to zero has
          ends left over, drawn as dots (filled where flow leaves, hollow where it enters). Hover a
          column or an edge to find its partners.
        </p>
        {model.zeroEitherWay ? (
          <p data-testid="lattice-zero-note">
            Class 0 runs either way: every class-0 edge carries the same number of lines, and at each
            tile any of them may go in or out. Its counter sets that number, and every tile with a
            class-0 edge (Theta, Xi, Phi, Psi) gains its <span className="mono">±</span>: the lines take
            up the tile&rsquo;s imbalance as long as there are enough of them and the parity matches.
            Editing a flow by hand never changes them; picking a point on the slice gives the fewest
            that work. Two extra lines that go in and straight back
            out are a circuit by themselves (<span className="mono">0: ±2</span>). Where two strands meet
            head-on across a class-0 edge the flow simply stops. The lattice has dimension{' '}
            {model.basis.length}.
          </p>
        ) : (
          <p>
            Dropped as directionless:{' '}
            <span className="mono">{model.dropped.join(', ') || 'nothing'}</span> (the Psi&rsquo;s
            class-0 edge meets another Psi&rsquo;s class-0 edge, so its flow would have to equal its own
            negative; tick <em>Class 0 either way</em> to let it in without a direction). The lattice has
            dimension {model.basis.length}.
          </p>
        )}
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
  sel: readonly [number, number] | null;
  cursor: readonly [number, number];
  onPick: (a: number, b: number) => void;
}): JSX.Element {
  const { model, axes, flat, maxLines, sel, cursor, onPick } = props;
  const clamp = (v: number) => Math.max(-RANGE, Math.min(RANGE, v));
  // ← → move along a, ↑ ↓ along b, picking each point as you go.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const [a, b] = cursor;
    const move: Record<string, [number, number]> = {
      ArrowLeft: [a - 1, b],
      ArrowRight: [a + 1, b],
      ArrowUp: [a, flat ? b : b + 1],
      ArrowDown: [a, flat ? b : b - 1],
    };
    const next = move[e.key];
    if (!next) return;
    e.preventDefault();
    const [na, nb] = [clamp(next[0]), clamp(next[1])];
    if (na !== a || nb !== b || sel === null) onPick(na, nb);
  };
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
      const lines = flowLines(model, vecAt(model, axes, a, b));
      for (let m = Math.max(lines, 1); m <= 3; m++) within.set(m, (within.get(m) ?? 0) + 1);
      return { a, b, lines };
    }),
  );
  return (
    <div
      className="lattice-plot-box"
      tabIndex={0}
      role="group"
      aria-label={`Lattice slice at a = ${cursor[0]}${flat ? '' : `, b = ${cursor[1]}`}. Arrow keys move around it.`}
      data-testid="lattice-plot"
      onKeyDown={onKeyDown}
    >
      <p className="lattice-keys muted">
        Click a dot, then <kbd>←</kbd> <kbd>→</kbd> move along <em>a</em>
        {flat ? '' : (
          <>
            {' '}and <kbd>↑</kbd> <kbd>↓</kbd> along <em>b</em>
          </>
        )}
        .
      </p>
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
          const picked = sel !== null && a === sel[0] && b === sel[1];
          const tier = lines === 0 ? 'zero' : lines > maxLines ? 'out' : String(Math.min(lines, 3));
          return (
            <g
              key={`${a},${b}`}
              className={`lattice-pt lattice-pt-${tier}${picked ? ' is-picked' : ''}`}
              data-testid={`lattice-pt-${a}_${b}`}
              role="button"
              tabIndex={-1}
              aria-label={`a = ${a}, b = ${b}: ${lines} line${lines === 1 ? '' : 's'}`}
              onClick={() => onPick(a, b)}
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

function Readout(props: { model: FlowModel; x: readonly number[]; sel: readonly [number, number] | null; flat: boolean }): JSX.Element {
  const { model, x, sel, flat } = props;
  const odd = x.flatMap((v, k) => (v % 2 !== 0 ? [model.vars[k].label] : []));
  const lines = flowLines(model, x);
  const net = netFlow(model, x);
  const off = model.types.flatMap((t, i) =>
    net[i] === 0 ? [] : [`${t} has ${Math.abs(net[i])} more ${net[i] > 0 ? 'out' : 'in'}`],
  );
  return (
    <dl className="lattice-readout" data-testid="lattice-readout">
      <dt>Balance</dt>
      <dd className={off.length ? 'is-bad' : 'is-good'} data-testid="lattice-balance">
        {off.length ? `Not a circuit: ${off.join('; ')}` : 'Every tile balances: a circuit'}
      </dd>
      <dt>On the slice</dt>
      <dd className="mono">{sel === null ? 'off this slice' : flat ? `a = ${sel[0]}` : `a = ${sel[0]}, b = ${sel[1]}`}</dd>
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

/** The point halfway along a strand's curve. */
function curveMid(s: Strand, centre: Pt): Pt {
  const mid = { x: (s.from.pos.x + s.to.pos.x) / 2, y: (s.from.pos.y + s.to.pos.y) / 2 };
  const c = { x: mid.x + (centre.x - mid.x) * 0.6, y: mid.y + (centre.y - mid.y) * 0.6 };
  return { x: 0.25 * s.from.pos.x + 0.5 * c.x + 0.25 * s.to.pos.x, y: 0.25 * s.from.pos.y + 0.5 * c.y + 0.25 * s.to.pos.y };
}

type Turn = 'cw' | 'ccw' | 'open';

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

function CircuitPatch(props: {
  model: FlowModel;
  x: readonly number[];
  level: number;
  chosen: Readonly<Record<string, DirectedMatching | null>>;
}): JSX.Element {
  const { model, x, level, chosen } = props;
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
        const points = tileStrandPoints(model, t.inst.type, x, t.pts);
        const pairs = chosen[t.inst.type] ?? null;
        return { t, centre, strands: pairs ? applyMatching(points, pairs) : [], loose: pairs ? [] : points };
      }),
    [tiles, model, x, chosen],
  );
  const strandCount = drawn.reduce((a, d) => a + d.strands.length, 0);
  const unbalanced = drawn.filter((d) => d.loose.length > 0).length;
  // Follow strands tile to tile into loops; a closed loop's turn is the sign
  // of its area as drawn (y down, so positive is clockwise on screen).
  const turns = useMemo(() => {
    const flat = drawn.flatMap((d, ti) => d.strands.map((s, si) => ({ s, key: `${ti}:${si}`, centre: d.centre })));
    const turnOf = new Map<string, Turn>();
    const count = { cw: 0, ccw: 0, open: 0 };
    for (const path of traceStrandPaths(flat.map((f) => f.s))) {
      let turn: Turn = 'open';
      if (path.closed) {
        const ring = path.strands.flatMap((i) => [flat[i].s.from.pos, curveMid(flat[i].s, flat[i].centre)]);
        turn = signedArea(ring) > 0 ? 'cw' : 'ccw';
      }
      count[turn]++;
      for (const i of path.strands) turnOf.set(flat[i].key, turn);
    }
    return { turnOf, count };
  }, [drawn]);
  return (
    <div className="lattice-patch-box">
      <svg
        className="lattice-patch"
        viewBox={view}
        role="img"
        aria-label={`Level ${level} hexagon supertile with the selected circuit`}
        data-strands={strandCount}
        data-unbalanced={unbalanced}
        data-cw={turns.count.cw}
        data-ccw={turns.count.ccw}
        data-open={turns.count.open}
      >
        {drawn.map(({ t, loose }) => (
          <polygon
            key={t.inst.id}
            className={`lattice-tile${loose.length ? ' is-unbalanced' : ''}`}
            points={t.pts.map((p) => `${p.x},${p.y}`).join(' ')}
          >
            <title>{t.inst.type}</title>
          </polygon>
        ))}
        {drawn.map(({ t, centre, strands }, ti) =>
          strands.map((s, i) => (
            <g key={`${t.inst.id}:${i}`} className={`lattice-strand is-${turns.turnOf.get(`${ti}:${i}`) ?? 'open'}`}>
              <path d={strandPath(s, centre)} />
              <path className="lattice-arrow" d={arrowHead(s, centre)} />
            </g>
          )),
        )}
        {drawn.map(({ t, loose }) =>
          loose.map((p, i) => (
            <circle key={`${t.inst.id}:loose:${i}`} className={`lattice-loose is-${p.dir}`} cx={p.pos.x} cy={p.pos.y} r={0.09} />
          )),
        )}
      </svg>
      {strandCount > 0 && unbalanced === 0 && (
        <p className="lattice-turns" data-testid="lattice-turns">
          <span className="lattice-swatch is-cw" /> {turns.count.cw} clockwise loop{turns.count.cw === 1 ? '' : 's'}
          <span className="lattice-swatch is-ccw" /> {turns.count.ccw} anticlockwise
          <span className="lattice-swatch is-open" /> {turns.count.open} running off the edge
          {model.zeroEitherWay ? ' or meeting head-on across class 0' : ''}
        </p>
      )}
      <p className="muted">
        {unbalanced > 0
          ? `${unbalanced} of ${tiles.length} tiles don't balance (tinted): their strand ends are shown as dots, filled where flow leaves and hollow where it enters.`
          : strandCount === 0
            ? 'The empty circuit: pick another point or raise a counter.'
            : `${strandCount} strand pieces across ${tiles.length} tiles. Arrows point the way the flow runs; an edge with flow ±2 carries two parallel lines.`}
      </p>
    </div>
  );
}

function MatrixEditor(props: {
  model: FlowModel;
  x: readonly number[];
  onChange: (x: number[]) => void;
  hover: number | null;
  onHover: (k: number | null) => void;
  selected: number;
  onSelect: (k: number) => void;
}): JSX.Element {
  const { model, x, onChange, hover, onHover, selected, onSelect } = props;
  // Class 0's counter is its line count, so it stops at 0. Edits are kept as typed: no column moves another.
  const zv = model.zeroVar;
  const set = (k: number, v: number) =>
    onChange(x.map((old, i) => (i === k ? Math.max(k === zv ? 0 : -MAX_COUNT, Math.min(MAX_COUNT, v)) : old)));
  const net = netFlow(model, x);
  const dnet = directedNet(model, x);
  const z = zeroFlow(model, x);
  const n0 = zeroLines(model, x);
  const last = model.vars.length - 1;
  const cur = Math.min(selected, last);
  const hoverProps = (k: number) => ({
    onPointerEnter: () => onHover(k),
    onPointerLeave: () => onHover(null),
    onClick: () => onSelect(k),
  });
  const colClass = (k: number) =>
    [k === cur ? 'is-selected' : '', hover === k ? 'is-hovered' : '', x[k] !== 0 ? 'is-live' : ''].filter(Boolean).join(' ') ||
    undefined;
  // ← → pick a column, ↑ ↓ change its flow, anywhere inside the matrix.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const step: Record<string, () => void> = {
      ArrowLeft: () => onSelect(Math.max(0, cur - 1)),
      ArrowRight: () => onSelect(Math.min(last, cur + 1)),
      ArrowUp: () => set(cur, x[cur] + 1),
      ArrowDown: () => set(cur, x[cur] - 1),
    };
    const act = step[e.key];
    if (!act) return;
    e.preventDefault();
    act();
  };
  return (
    <div
      className="lattice-table-box lattice-editor-box"
      tabIndex={0}
      role="group"
      aria-label={`Flow editor: column ${model.vars[cur]?.label}. Left and right arrows pick a column, up and down change its flow.`}
      data-testid="lattice-editor"
      onKeyDown={onKeyDown}
    >
      <p className="lattice-keys muted">
        Click here, then <kbd>←</kbd> <kbd>→</kbd> pick a column and <kbd>↑</kbd> <kbd>↓</kbd> change its flow.
      </p>
      <table className="lattice-table lattice-editor" data-testid="lattice-matrix">
        <thead>
          <tr>
            <th scope="col">Tile</th>
            {model.vars.map((v, k) => (
              <th key={v.label} scope="col" className={colClass(k)} style={{ borderBottomColor: edgeClassColor(v.major) }} {...hoverProps(k)}>
                {v.label}
              </th>
            ))}
            <th scope="col">Net</th>
          </tr>
          <tr className="lattice-flow-row">
            <th scope="row">Flow</th>
            {model.vars.map((v, k) => (
              <td key={v.label} className={[colClass(k), x[k] > 0 ? 'is-pos' : x[k] < 0 ? 'is-neg' : 'is-zero'].filter(Boolean).join(' ')} {...hoverProps(k)}>
                <div className="lattice-stepper">
                  <button type="button" aria-label={`More flow on ${v.label}`} onClick={() => set(k, x[k] + 1)} disabled={x[k] >= MAX_COUNT}>
                    +
                  </button>
                  <output data-testid={`lattice-count-${v.label}`} title={k === zv ? 'Lines on every class-0 edge, each free to run either way' : undefined}>
                    {k === zv ? `±${n0}` : signed(x[k])}
                  </output>
                  <button type="button" aria-label={`Less flow on ${v.label}`} onClick={() => set(k, x[k] - 1)} disabled={x[k] <= (k === zv ? 0 : -MAX_COUNT)}>
                    −
                  </button>
                </div>
              </td>
            ))}
            <td>
              <button type="button" className="lattice-clear" onClick={() => onChange(x.map(() => 0))}>
                Clear
              </button>
            </td>
          </tr>
        </thead>
        <tbody>
          {model.types.map((t, i) => (
            <tr key={t} className={net[i] === 0 ? undefined : 'is-unbalanced'}>
              <th scope="row">{t}</th>
              {model.matrix[i].map((v, k) => {
                if (k === zv) {
                  // Class 0 spreads its ± to every tile with a class-0 edge; the tooltip says what it takes up.
                  const has = model.zeroTypes.includes(t);
                  return (
                    <td
                      key={k}
                      className={[colClass(k), has ? '' : 'is-zero', has && n0 > 0 ? 'is-term' : ''].filter(Boolean).join(' ')}
                      title={has ? `±${n0}: takes up ${signed(z[i])} here` : undefined}
                      data-testid={`lattice-cell-${t}-${model.vars[k].label}`}
                      {...hoverProps(k)}
                    >
                      {has ? `±${n0}` : '·'}
                    </td>
                  );
                }
                const live = x[k] !== 0 && v !== 0;
                return (
                  <td
                    key={k}
                    className={[colClass(k), v === 0 ? 'is-zero' : '', live ? 'is-term' : ''].filter(Boolean).join(' ')}
                    title={live ? `${signed(v)} × ${signed(x[k])}` : undefined}
                    data-testid={`lattice-cell-${t}-${model.vars[k].label}`}
                    {...hoverProps(k)}
                  >
                    {v === 0 ? '·' : live ? signed(v * x[k]) : signed(v)}
                  </td>
                );
              })}
              {zv >= 0 && model.zeroTypes.includes(t) && n0 > 0 ? (
                // The row's sum keeps class 0's ±: d ± n, which balances when it can reach 0.
                <td
                  className={`lattice-net ${net[i] === 0 ? 'is-good' : 'is-bad'}`}
                  title={net[i] === 0 ? `class 0 takes up ${signed(z[i])}: balances` : `class 0 can only take up ${signed(z[i])}: ${signed(net[i])} left over`}
                  data-testid={`lattice-net-${t}`}
                >
                  {signed(dnet[i])} ±{n0}
                </td>
              ) : (
                <td className={`lattice-net ${net[i] === 0 ? 'is-good' : 'is-bad'}`} data-testid={`lattice-net-${t}`}>
                  {signed(net[i])}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlowTileStrip(props: {
  model: FlowModel;
  x: readonly number[];
  hover: number | null;
  onHover: (k: number | null) => void;
  combos: ComboTable;
  pick: (t: TileTypeId) => number;
  onCombo: (t: TileTypeId, i: number) => void;
  selected: number;
  onSelect: (i: number) => void;
}): JSX.Element {
  const { model, x, hover, onHover, combos, pick, onCombo, selected, onSelect } = props;
  const net = netFlow(model, x);
  const types = model.types;
  const cur = Math.min(selected, types.length - 1);
  const curType = types[cur];
  const step = (t: TileTypeId, d: number) => {
    const n = combos[t].matchings.length;
    if (n > 1) onCombo(t, (((pick(t) + d) % n) + n) % n);
  };
  // ← → pick a tile, ↑ ↓ step its combination.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const act: Record<string, () => void> = {
      ArrowLeft: () => onSelect(Math.max(0, cur - 1)),
      ArrowRight: () => onSelect(Math.min(types.length - 1, cur + 1)),
      ArrowUp: () => step(curType, 1),
      ArrowDown: () => step(curType, -1),
    };
    if (!act[e.key]) return;
    e.preventDefault();
    act[e.key]();
  };
  const cur$ = combos[curType];
  return (
    <div
      className="lattice-strip-box"
      tabIndex={0}
      role="group"
      aria-label={`Tiles: ${curType} selected. Left and right arrows pick a tile, up and down step its combination.`}
      data-testid="lattice-strip"
      onKeyDown={onKeyDown}
    >
      <p className="lattice-keys muted">
        Click here, then <kbd>←</kbd> <kbd>→</kbd> pick a tile and <kbd>↑</kbd> <kbd>↓</kbd> step through its in→out pairings.
      </p>
      <ul className="lattice-strip" aria-label="The tile types with their flow">
        {types.map((t, i) => {
          const n = combos[t].matchings.length;
          return (
            <li key={t} className={i === cur ? 'is-selected' : undefined} onClick={() => onSelect(i)}>
              <FlowTile model={model} type={t} x={x} hover={hover} onHover={onHover} pairs={combos[t].matchings[pick(t)] ?? null} />
              <span className={`lattice-strip-net ${net[i] === 0 ? 'is-good' : 'is-bad'}`} data-testid={`lattice-strip-${t}`}>
                <strong>{t}</strong>{' '}
                {net[i] === 0 ? 'balances' : `${Math.abs(net[i])} more ${net[i] > 0 ? 'out' : 'in'}`}
              </span>
              {n > 1 && (
                <span className="lattice-combo" data-testid={`lattice-combo-${t}`}>
                  <button type="button" aria-label={`Previous combination for ${t}`} onClick={() => step(t, -1)}>
                    ‹
                  </button>
                  combo {pick(t) + 1} of {n}
                  {combos[t].truncated ? '+' : ''}
                  <button type="button" aria-label={`Next combination for ${t}`} onClick={() => step(t, 1)}>
                    ›
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="lattice-gallery" data-testid="lattice-gallery">
        <h3>
          {curType}:{' '}
          {cur$.matchings.length === 0
            ? 'doesn’t balance, so its ends can’t all pair up'
            : cur$.matchings[0].length === 0
              ? 'no strands cross it'
              : `${cur$.matchings.length}${cur$.truncated ? '+' : ''} way${cur$.matchings.length === 1 ? '' : 's'} to join its entries to its exits`}
        </h3>
        {cur$.matchings.length > 0 && cur$.matchings[0].length > 0 && (
          <ul>
            {cur$.matchings.slice(0, GALLERY_MAX).map((m, i) => (
              <li key={i} className={i === pick(curType) ? 'is-selected' : undefined}>
                <button type="button" aria-label={`${curType} combination ${i + 1}`} aria-pressed={i === pick(curType)} onClick={() => onCombo(curType, i)}>
                  <FlowTile model={model} type={curType} x={x} hover={hover} onHover={onHover} pairs={m} />
                  <span>{i + 1}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {cur$.matchings.length > GALLERY_MAX && <p className="muted">Showing the first {GALLERY_MAX}; the arrow keys reach the rest.</p>}
      </div>
    </div>
  );
}

function FlowTile(props: {
  model: FlowModel;
  type: TileTypeId;
  x: readonly number[];
  hover: number | null;
  onHover: (k: number | null) => void;
  pairs: DirectedMatching | null;
}): JSX.Element {
  const { model, type, x, hover, onHover, pairs } = props;
  const pts = HEX_PTS;
  const centre = { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
  const points = tileStrandPoints(model, type, x, pts);
  const strands = pairs ? applyMatching(points, pairs) : null;
  const zeroEdge = zeroEdgeOf(model, type);
  const zeroDirs = points.filter((p) => p.edge === zeroEdge);
  const zeroOut = zeroDirs.filter((p) => p.dir === 'out').length;
  const pad = 0.55;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const view = `${Math.min(...xs) - pad} ${Math.min(...ys) - pad} ${Math.max(...xs) - Math.min(...xs) + 2 * pad} ${Math.max(...ys) - Math.min(...ys) + 2 * pad}`;
  return (
    <svg className="lattice-flow-tile" viewBox={view} role="img" aria-label={`${type} tile`}>
      <polygon className="lattice-flow-tile-body" points={pts.map((p) => `${p.x},${p.y}`).join(' ')} />
      {pts.map((a, e) => {
        const b = pts[(e + 1) % pts.length];
        const ev = edgeVar(model, type, e);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const len = Math.hypot(mid.x - centre.x, mid.y - centre.y) || 1;
        const lab = { x: mid.x + ((mid.x - centre.x) / len) * 0.3, y: mid.y + ((mid.y - centre.y) / len) * 0.3 };
        const flow = ev ? ev.sign * x[ev.index] : 0;
        const v = ev ? model.vars[ev.index] : null;
        const isZero = e === zeroEdge;
        const colour = v ? edgeClassColor(v.major) : isZero ? edgeClassColor(0) : 'var(--muted)';
        const cls = [
          'lattice-flow-edge',
          ev === null && !isZero ? 'is-dropped' : '',
          flow !== 0 || (isZero && zeroDirs.length > 0) ? 'is-live' : '',
          ev && hover === ev.index ? 'is-hovered' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <g
            key={e}
            className={cls}
            onPointerEnter={ev ? () => onHover(ev.index) : undefined}
            onPointerLeave={ev ? () => onHover(null) : undefined}
          >
            <title>
              {isZero
                ? `class 0, either way: ${zeroDirs.length === 0 ? 'no lines' : `${zeroOut} out, ${zeroDirs.length - zeroOut} in`}`
                : v
                  ? `${v.label}: ${flow === 0 ? 'no flow' : `${Math.abs(flow)} ${flow > 0 ? 'out' : 'in'}`}`
                  : 'class 0 (no direction)'}
            </title>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={{ stroke: colour }} />
            <line className="lattice-flow-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <text x={lab.x} y={lab.y + 0.09} textAnchor="middle" style={{ fill: colour }}>
              {v ? v.label : '0'}
            </text>
          </g>
        );
      })}
      {(strands ?? []).map((s, i) => (
        <g key={i} className="lattice-strand">
          <path d={strandPath(s, centre)} />
          <path className="lattice-arrow" d={arrowHead(s, centre)} />
        </g>
      ))}
      {strands === null &&
        points.map((p, i) => <circle key={i} className={`lattice-loose is-${p.dir}`} cx={p.pos.x} cy={p.pos.y} r={0.09} />)}
    </svg>
  );
}
