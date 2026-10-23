/**
 * Multi-edge circuits: no directions, but any number of strands per edge.
 *
 * A tile only needs an even number of strand ends, so the valid counts are the
 * mod-2 selections plus extra pairs anywhere: a rank-8 lattice drawn here as a
 * cube of the 8 parity patterns times a stack of pairs per class. The matrix
 * edits the counts (arrow keys too) and can show its mod-2 reduced form; the
 * tiles pick among their non-crossing pairings; the patch colours each loop.
 * The pairings also split the strands into factors, each a valid count vector
 * of its own; the factor panel lists them and steps through every combination
 * of pairings to show which splits they reach. The maths lives in
 * core/multiEdge.ts.
 */

import { useMemo, useState, type KeyboardEvent } from 'react';
import { hexPatch } from '../core/flowLattice';
import { HEX_PTS, type TileTypeId } from '../core/families';
import type { Pt } from '../core/geom';
import {
  countWithin,
  cubeCoords,
  edgeClasses,
  factorSignature,
  formatVector,
  gf2Rref,
  multiEdgeModel,
  nonCrossingPairings,
  pairingFactorisation,
  tileEndPoints,
  tileEnds,
  traceLoops,
  type EndPoint,
  type Factorisation,
  type MultiEdgeModel,
  type Pairing,
} from '../core/multiEdge';
import { edgeClassColor } from '../lib/palette';
import '../styles/lattice.css';
import '../styles/multiedge.css';

const MAX_COUNT = 4;
const LEVELS = [1, 2, 3] as const;
const GALLERY_MAX = 60;
/** Loop colours, cycled; open paths are drawn grey. */
const LOOP_COLOURS = ['#4f8ff7', '#f0883e', '#3fb68b', '#c86bd8', '#e5534b', '#d4a72c', '#2fb5c9', '#8b8ff0'];
/** Enumerate every combination of pairings for the splits list only up to this many. */
const SPLITS_MAX = 20000;
/** How far "next new split" looks ahead. */
const SEARCH_MAX = 50000;

type PairTable = Readonly<Record<string, ReturnType<typeof nonCrossingPairings>>>;

const centreOf = (pts: readonly Pt[]): Pt => ({
  x: pts.reduce((a, p) => a + p.x, 0) / pts.length,
  y: pts.reduce((a, p) => a + p.y, 0) / pts.length,
});

function chordPath(a: Pt, b: Pt, centre: Pt): string {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const c = { x: mid.x + (centre.x - mid.x) * 0.6, y: mid.y + (centre.y - mid.y) * 0.6 };
  return `M${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}`;
}

export default function MultiEdgePage(): JSX.Element {
  const model = multiEdgeModel();
  const [x, setX] = useState<number[]>(() => [...model.basis[0]]);
  const [col, setCol] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [level, setLevel] = useState(2);
  const [pairIdx, setPairIdx] = useState<Readonly<Record<string, number>>>({});
  const [tileSel, setTileSel] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [byFactor, setByFactor] = useState(true);
  const [focusFactor, setFocusFactor] = useState<number | null>(null);

  const pairs: PairTable = useMemo(
    () =>
      Object.fromEntries(
        model.types.map((t) => {
          const n = tileEndPoints(model, t, x, HEX_PTS).length;
          return [t, nonCrossingPairings(n)];
        }),
      ),
    [model, x],
  );
  const pick = (t: TileTypeId): number => {
    const n = pairs[t].pairings.length;
    return n === 0 ? 0 : (((pairIdx[t] ?? 0) % n) + n) % n;
  };
  const chosen = useMemo(
    () => Object.fromEntries(model.types.map((t) => [t, pairs[t].pairings[pick(t)] ?? null])) as Readonly<Record<string, Pairing | null>>,
    // pick reads only pairs and pairIdx.
    [model, pairs, pairIdx],
  );
  const factors = useMemo(() => pairingFactorisation(model, x, chosen), [model, x, chosen]);

  return (
    <article className="lattice-page multiedge-page">
      <header>
        <h1>Multi-edge circuits</h1>
        <p className="muted">
          Forget directions and let any number of strands run along an edge. A tile only needs an{' '}
          <em>even</em> number of strand ends, so they can pair up inside it. Only each count&rsquo;s
          parity matters for that, so every valid choice is one of the eight mod-2 selections plus extra
          pairs of strands wherever you like: <span className="mono">{'{8: 2}'}</span> is valid, and mod 2
          it&rsquo;s the empty selection. Class 0 is back, since nothing needs a direction.
        </p>
      </header>

      <div className="lattice-controls" role="group" aria-label="Controls">
        <label className="multiedge-toggle">
          <input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} data-testid="multiedge-rref" />
          Show the matrix row reduced (mod 2)
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

      <div className="lattice-balance-grid">
        <section aria-labelledby="multiedge-matrix-h">
          <h2 id="multiedge-matrix-h">Strands per class</h2>
          <CountEditor model={model} x={x} onChange={setX} selected={col} onSelect={setCol} reduced={reduced} hover={hover} onHover={setHover} />
        </section>
        <section aria-labelledby="multiedge-lattice-h">
          <h2 id="multiedge-lattice-h">Where it sits in the lattice</h2>
          <LatticeView model={model} x={x} onChange={setX} />
        </section>
      </div>

      <section aria-labelledby="multiedge-tiles-h">
        <h2 id="multiedge-tiles-h">Tiles and their pairings</h2>
        <div className="lattice-balance-grid">
          <TileStrip
            model={model}
            x={x}
            pairs={pairs}
            pick={pick}
            onPick={(t, i) => setPairIdx((c) => ({ ...c, [t]: i }))}
            selected={tileSel}
            onSelect={setTileSel}
            hover={hover}
            onHover={setHover}
          />
          <Patch
            model={model}
            x={x}
            level={level}
            chosen={chosen}
            factors={byFactor ? factors : null}
            focus={focusFactor}
          />
        </div>
      </section>

      <section aria-labelledby="multiedge-factors-h">
        <h2 id="multiedge-factors-h">How the pairings split the strands</h2>
        <FactorPanel
          model={model}
          x={x}
          pairs={pairs}
          pick={pick}
          setPicks={(p) => setPairIdx(p)}
          factors={factors}
          byFactor={byFactor}
          onByFactor={setByFactor}
          focus={focusFactor}
          onFocus={setFocusFactor}
        />
      </section>
    </article>
  );
}

function CountEditor(props: {
  model: MultiEdgeModel;
  x: readonly number[];
  onChange: (x: number[]) => void;
  selected: number;
  onSelect: (k: number) => void;
  reduced: boolean;
  hover: number | null;
  onHover: (k: number | null) => void;
}): JSX.Element {
  const { model, x, onChange, selected, onSelect, reduced, hover, onHover } = props;
  const last = model.classes.length - 1;
  const cur = Math.min(selected, last);
  const set = (k: number, v: number) => onChange(x.map((old, i) => (i === k ? Math.max(0, Math.min(MAX_COUNT, v)) : old)));
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const act: Record<string, () => void> = {
      ArrowLeft: () => onSelect(Math.max(0, cur - 1)),
      ArrowRight: () => onSelect(Math.min(last, cur + 1)),
      ArrowUp: () => set(cur, x[cur] + 1),
      ArrowDown: () => set(cur, x[cur] - 1),
    };
    if (!act[e.key]) return;
    e.preventDefault();
    act[e.key]();
  };
  const rref = useMemo(() => gf2Rref(model.counts), [model]);
  const rows = reduced
    ? rref.rows.map((r, i) => ({
        key: `R${i + 1}`,
        label: `R${i + 1}`,
        title: `${rref.from[i].map((t) => model.types[t]).join(' ⊕ ')} (mod 2)`,
        cells: r,
      }))
    : model.types.map((t, i) => ({ key: t, label: t, title: undefined as string | undefined, cells: model.counts[i] }));
  const colClass = (k: number) =>
    [k === cur ? 'is-selected' : '', hover === k ? 'is-hovered' : '', x[k] !== 0 ? 'is-live' : ''].filter(Boolean).join(' ') || undefined;
  const colProps = (k: number) => ({ onPointerEnter: () => onHover(k), onPointerLeave: () => onHover(null), onClick: () => onSelect(k) });
  return (
    <div
      className="lattice-table-box lattice-editor-box"
      tabIndex={0}
      role="group"
      aria-label={`Strand counts: class ${model.classes[cur]} selected. Left and right arrows pick a class, up and down change its count.`}
      data-testid="multiedge-editor"
      onKeyDown={onKeyDown}
    >
      <p className="lattice-keys muted">
        Click here, then <kbd>←</kbd> <kbd>→</kbd> pick a class and <kbd>↑</kbd> <kbd>↓</kbd> change its strands (0–{MAX_COUNT}).
      </p>
      <table className="lattice-table lattice-editor" data-testid="multiedge-matrix">
        <thead>
          <tr>
            <th scope="col">{reduced ? 'Row' : 'Tile'}</th>
            {model.classes.map((c, k) => (
              <th key={c} scope="col" className={colClass(k)} style={{ borderBottomColor: edgeClassColor(c) }} {...colProps(k)}>
                {c}
                {reduced && <span className="multiedge-colkind">{rref.pivots.includes(k) ? 'pivot' : 'free'}</span>}
              </th>
            ))}
            <th scope="col">Ends</th>
          </tr>
          <tr className="lattice-flow-row">
            <th scope="row">Strands</th>
            {model.classes.map((c, k) => (
              <td key={c} className={[colClass(k), x[k] > 0 ? 'is-pos' : 'is-zero'].filter(Boolean).join(' ')} {...colProps(k)}>
                <div className="lattice-stepper">
                  <button type="button" aria-label={`More strands on ${c}`} onClick={() => set(k, x[k] + 1)} disabled={x[k] >= MAX_COUNT}>
                    +
                  </button>
                  <output data-testid={`multiedge-count-${c}`}>{x[k]}</output>
                  <button type="button" aria-label={`Fewer strands on ${c}`} onClick={() => set(k, x[k] - 1)} disabled={x[k] <= 0}>
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
          {rows.map((r) => {
            const ends = r.cells.reduce((a, v, k) => a + v * x[k], 0);
            const even = ends % 2 === 0;
            return (
              <tr key={r.key} className={even ? undefined : 'is-unbalanced'}>
                <th scope="row" title={r.title}>
                  {r.label}
                </th>
                {r.cells.map((v, k) => {
                  const live = v !== 0 && x[k] !== 0;
                  return (
                    <td
                      key={k}
                      className={[colClass(k), v === 0 ? 'is-zero' : '', live ? 'is-term' : ''].filter(Boolean).join(' ')}
                      title={live ? `${v} × ${x[k]}` : undefined}
                      data-testid={`multiedge-cell-${r.key}-${model.classes[k]}`}
                      {...colProps(k)}
                    >
                      {v === 0 ? '·' : live ? v * x[k] : v}
                    </td>
                  );
                })}
                <td className={`lattice-net ${even ? 'is-good' : 'is-bad'}`} data-testid={`multiedge-ends-${r.key}`}>
                  {ends} {even ? 'even' : 'odd'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted multiedge-note">
        {reduced
          ? `Mod 2 the nine tile rules reduce to ${rref.rows.length}; ${rref.redundant.length} follow from the others. Hover a row to see which tiles it adds up. Free classes (${rref.pivots.length === model.classes.length ? 'none' : model.classes.filter((_, k) => !rref.pivots.includes(k)).join(', ')}) can be chosen freely; each pivot class is then forced to an odd or even count.`
          : 'Each entry is how many edges of that class the tile has; with strands on, it becomes the strand ends they bring (edges × strands). A tile needs an even total.'}
      </p>
    </div>
  );
}

/** The 8 parity patterns as a cube, and the extra pairs as a stack per class. */
function LatticeView(props: { model: MultiEdgeModel; x: readonly number[]; onChange: (x: number[]) => void }): JSX.Element {
  const { model, x, onChange } = props;
  const coords = cubeCoords(model, x);
  const d = model.basis.length;
  // Isometric-ish projection of the d=3 cube; a fourth basis direction would just offset again.
  const axes: Pt[] = [
    { x: 120, y: 0 },
    { x: -60, y: 70 },
    { x: 0, y: -110 },
    { x: 50, y: 40 },
  ];
  const origin = { x: 70, y: 150 };
  const corners = Array.from({ length: 1 << d }, (_, m) => {
    const bits = Array.from({ length: d }, (_, i) => (m >> i) & 1);
    const pos = bits.reduce((p, b, i) => (b ? { x: p.x + axes[i].x, y: p.y + axes[i].y } : p), origin);
    const v = model.classes.map((_, k) => model.basis.reduce((a, bv, i) => a ^ (bits[i] & bv[k]), 0));
    return { m, bits, pos, v, label: model.classes.filter((_, k) => v[k]).join('') || '∅' };
  });
  const pairsOf = x.map((n) => Math.floor(n / 2));
  const jump = (v: readonly number[]) => onChange(x.map((n, k) => v[k] + 2 * Math.floor(n / 2)));
  const maxPairs = Math.max(2, ...pairsOf);
  return (
    <div className="multiedge-lattice">
      <svg className="multiedge-cube" viewBox="0 0 300 230" role="img" aria-label="The eight mod-2 patterns as a cube">
        {corners.flatMap((a) =>
          corners
            .filter((b) => b.m > a.m && ((a.m ^ b.m) & ((a.m ^ b.m) - 1)) === 0)
            .map((b) => {
              const axis = Math.log2(a.m ^ b.m);
              return <line key={`${a.m}-${b.m}`} className={`multiedge-cube-edge axis-${axis}`} x1={a.pos.x} y1={a.pos.y} x2={b.pos.x} y2={b.pos.y} />;
            }),
        )}
        {corners.map((c) => {
          const here = coords !== null && c.bits.every((b, i) => b === coords[i]);
          return (
            <g
              key={c.m}
              className={`multiedge-corner${here ? ' is-here' : ''}`}
              role="button"
              aria-label={`Parity pattern ${c.label}`}
              data-testid={`multiedge-corner-${c.label}`}
              onClick={() => jump(c.v)}
            >
              <circle cx={c.pos.x} cy={c.pos.y} r={here ? 9 : 7} />
              <text x={c.pos.x + 11} y={c.pos.y - 8}>
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="multiedge-axes" aria-label="What each cube direction adds">
        {model.basis.map((b, i) => (
          <span key={i}>
            <span className={`multiedge-axis-swatch axis-${i}`} /> ⊕ {model.classes.filter((_, k) => b[k]).join('')}
          </span>
        ))}
      </p>
      <p className="multiedge-where" data-testid="multiedge-where">
        {coords === null
          ? 'Off the cube: some tile has an odd number of ends, so this isn’t a circuit.'
          : `Parity pattern ${corners.find((c) => c.bits.every((b, i) => b === coords[i]))!.label}${
              coords.some(Boolean) ? ` = ${model.basis.filter((_, i) => coords[i]).map((b) => model.classes.filter((_, k) => b[k]).join('')).join(' ⊕ ')}` : ''
            }, plus ${pairsOf.reduce((a, b) => a + b, 0)} extra pair${pairsOf.reduce((a, b) => a + b, 0) === 1 ? '' : 's'}.`}
      </p>
      <div className="multiedge-stacks" aria-label="Extra pairs on each class">
        {model.classes.map((c, k) => (
          <div key={c} className="multiedge-stack" data-testid={`multiedge-stack-${c}`}>
            <div className="multiedge-stack-pairs" style={{ height: `${maxPairs * 14}px` }}>
              {Array.from({ length: pairsOf[k] }, (_, i) => (
                <span key={i} className="multiedge-pair" style={{ background: edgeClassColor(c) }} title="an extra pair of strands" />
              ))}
            </div>
            <span className={`multiedge-bit${x[k] % 2 ? ' is-odd' : ''}`} style={{ borderColor: edgeClassColor(c) }} title={x[k] % 2 ? 'odd: on mod 2' : 'even: off mod 2'}>
              {x[k] % 2}
            </span>
            <span className="multiedge-stack-label">{c}</span>
          </div>
        ))}
      </div>
      <p className="muted multiedge-note">
        Every count is its parity (the bottom square: the cube corner it belongs to) plus 2 × the pairs stacked above it. The
        cube holds the {1 << d} mod-2 selections, {d} independent directions; the stacks are the {model.classes.length} &ldquo;add a pair
        here&rdquo; directions, so the lattice has full rank {model.classes.length}. Click a corner to change the parity and keep the
        pairs. With at most 1, 2 or 3 strands per class there are {countWithin(model, 1)}, {countWithin(model, 2)} and{' '}
        {countWithin(model, 3).toLocaleString('en-US')} valid choices.
      </p>
    </div>
  );
}

function TileGlyph(props: {
  model: MultiEdgeModel;
  type: TileTypeId;
  x: readonly number[];
  pairing: Pairing | null;
  hover: number | null;
  onHover: (k: number | null) => void;
}): JSX.Element {
  const { model, type, x, pairing, hover, onHover } = props;
  const pts = HEX_PTS;
  const centre = centreOf(pts);
  const ends = tileEndPoints(model, type, x, pts);
  const cs = edgeClasses(type);
  const pad = 0.55;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const view = `${Math.min(...xs) - pad} ${Math.min(...ys) - pad} ${Math.max(...xs) - Math.min(...xs) + 2 * pad} ${Math.max(...ys) - Math.min(...ys) + 2 * pad}`;
  return (
    <svg className="lattice-flow-tile" viewBox={view} role="img" aria-label={`${type} tile`}>
      <polygon className="lattice-flow-tile-body" points={pts.map((p) => `${p.x},${p.y}`).join(' ')} />
      {pts.map((a, e) => {
        const b = pts[(e + 1) % pts.length];
        const k = model.classes.indexOf(cs[e]);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const len = Math.hypot(mid.x - centre.x, mid.y - centre.y) || 1;
        const lab = { x: mid.x + ((mid.x - centre.x) / len) * 0.3, y: mid.y + ((mid.y - centre.y) / len) * 0.3 };
        const colour = edgeClassColor(cs[e]);
        const cls = ['lattice-flow-edge', x[k] ? 'is-live' : '', hover === k ? 'is-hovered' : ''].filter(Boolean).join(' ');
        return (
          <g key={e} className={cls} onPointerEnter={() => onHover(k)} onPointerLeave={() => onHover(null)}>
            <title>{`class ${cs[e]}: ${x[k]} strand${x[k] === 1 ? '' : 's'}`}</title>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={{ stroke: colour }} />
            <line className="lattice-flow-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <text x={lab.x} y={lab.y + 0.09} textAnchor="middle" style={{ fill: colour }}>
              {cs[e]}
            </text>
          </g>
        );
      })}
      {pairing?.map(([i, j], n) => <path key={n} className="multiedge-chord" d={chordPath(ends[i].pos, ends[j].pos, centre)} />)}
      {pairing === null && ends.map((p, i) => <circle key={i} className="lattice-loose is-out" cx={p.pos.x} cy={p.pos.y} r={0.09} />)}
    </svg>
  );
}

function TileStrip(props: {
  model: MultiEdgeModel;
  x: readonly number[];
  pairs: PairTable;
  pick: (t: TileTypeId) => number;
  onPick: (t: TileTypeId, i: number) => void;
  selected: number;
  onSelect: (i: number) => void;
  hover: number | null;
  onHover: (k: number | null) => void;
}): JSX.Element {
  const { model, x, pairs, pick, onPick, selected, onSelect, hover, onHover } = props;
  const ends = tileEnds(model, x);
  const types = model.types;
  const cur = Math.min(selected, types.length - 1);
  const curType = types[cur];
  const step = (t: TileTypeId, d: number) => {
    const n = pairs[t].pairings.length;
    if (n > 1) onPick(t, (((pick(t) + d) % n) + n) % n);
  };
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
  const curPairs = pairs[curType];
  return (
    <div
      className="lattice-strip-box"
      tabIndex={0}
      role="group"
      aria-label={`Tiles: ${curType} selected. Left and right arrows pick a tile, up and down step its pairing.`}
      data-testid="multiedge-strip"
      onKeyDown={onKeyDown}
    >
      <p className="lattice-keys muted">
        Click here, then <kbd>←</kbd> <kbd>→</kbd> pick a tile and <kbd>↑</kbd> <kbd>↓</kbd> step through its pairings.
      </p>
      <ul className="lattice-strip" aria-label="The tile types">
        {types.map((t, i) => {
          const n = pairs[t].pairings.length;
          const even = ends[i] % 2 === 0;
          return (
            <li key={t} className={i === cur ? 'is-selected' : undefined} onClick={() => onSelect(i)}>
              <TileGlyph model={model} type={t} x={x} pairing={pairs[t].pairings[pick(t)] ?? null} hover={hover} onHover={onHover} />
              <span className={`lattice-strip-net ${even ? 'is-good' : 'is-bad'}`} data-testid={`multiedge-strip-${t}`}>
                <strong>{t}</strong> {ends[i]} end{ends[i] === 1 ? '' : 's'}
              </span>
              {n > 1 && (
                <span className="lattice-combo" data-testid={`multiedge-combo-${t}`}>
                  <button type="button" aria-label={`Previous pairing for ${t}`} onClick={() => step(t, -1)}>
                    ‹
                  </button>
                  {pick(t) + 1} of {n}
                  {pairs[t].truncated ? '+' : ''}
                  <button type="button" aria-label={`Next pairing for ${t}`} onClick={() => step(t, 1)}>
                    ›
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="lattice-gallery" data-testid="multiedge-gallery">
        <h3>
          {curType}:{' '}
          {curPairs.pairings.length === 0
            ? 'an odd number of ends, so one is left as a tail'
            : curPairs.pairings[0].length === 0
              ? 'no strands cross it'
              : `${curPairs.pairings.length}${curPairs.truncated ? '+' : ''} way${curPairs.pairings.length === 1 ? '' : 's'} to pair its ${ends[cur]} ends`}
        </h3>
        {curPairs.pairings.length > 0 && curPairs.pairings[0].length > 0 && (
          <ul>
            {curPairs.pairings.slice(0, GALLERY_MAX).map((p, i) => (
              <li key={i} className={i === pick(curType) ? 'is-selected' : undefined}>
                <button type="button" aria-label={`${curType} pairing ${i + 1}`} aria-pressed={i === pick(curType)} onClick={() => onPick(curType, i)}>
                  <TileGlyph model={model} type={curType} x={x} pairing={p} hover={hover} onHover={onHover} />
                  <span>{i + 1}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {curPairs.pairings.length > GALLERY_MAX && <p className="muted">Showing the first {GALLERY_MAX}; the arrow keys reach the rest.</p>}
      </div>
    </div>
  );
}

function Patch(props: {
  model: MultiEdgeModel;
  x: readonly number[];
  level: number;
  chosen: Readonly<Record<string, Pairing | null>>;
  /** Colour strands by factor instead of by loop. */
  factors: Factorisation | null;
  /** Factor to pick out; the others fade. */
  focus: number | null;
}): JSX.Element {
  const { model, x, level, chosen, factors, focus } = props;
  const tiles = useMemo(() => hexPatch(level), [level]);
  const view = useMemo(() => {
    const all = tiles.flatMap((t) => t.pts);
    const xs = all.map((p) => p.x);
    const ys = all.map((p) => p.y);
    const m = 0.4;
    return `${Math.min(...xs) - m} ${Math.min(...ys) - m} ${Math.max(...xs) - Math.min(...xs) + 2 * m} ${Math.max(...ys) - Math.min(...ys) + 2 * m}`;
  }, [tiles]);
  const drawn = useMemo(
    () =>
      tiles.map((t) => {
        const ends: EndPoint[] = tileEndPoints(model, t.inst.type, x, t.pts);
        const pairing = chosen[t.inst.type] ?? null;
        const factorOf = factors?.endFactor[t.inst.type];
        return {
          t,
          centre: centreOf(t.pts),
          ends,
          segments: pairing ? pairing.map(([i, j]) => ({ a: ends[i].pos, b: ends[j].pos, factor: factorOf?.[i] ?? null })) : [],
          odd: pairing === null,
        };
      }),
    [tiles, model, x, chosen, factors],
  );
  const loops = useMemo(() => {
    const flat = drawn.flatMap((d, ti) => d.segments.map((s, si) => ({ s, key: `${ti}:${si}` })));
    const colourOf = new Map<string, string | null>();
    let closed = 0;
    let open = 0;
    for (const loop of traceLoops(flat.map((f) => f.s))) {
      const colour = loop.closed ? LOOP_COLOURS[closed++ % LOOP_COLOURS.length] : null;
      if (!loop.closed) open++;
      for (const i of loop.segments) colourOf.set(flat[i].key, colour);
    }
    return { colourOf, closed, open };
  }, [drawn]);
  const segCount = drawn.reduce((a, d) => a + d.segments.length, 0);
  const odd = drawn.filter((d) => d.odd && d.ends.length > 0).length;
  return (
    <div className="lattice-patch-box">
      <svg className="lattice-patch" viewBox={view} role="img" aria-label={`Level ${level} hexagon supertile`} data-closed={loops.closed} data-open={loops.open} data-odd={odd}>
        {drawn.map(({ t, odd: o, ends }) => (
          <polygon key={t.inst.id} className={`lattice-tile${o && ends.length ? ' is-unbalanced' : ''}`} points={t.pts.map((p) => `${p.x},${p.y}`).join(' ')}>
            <title>{t.inst.type}</title>
          </polygon>
        ))}
        {drawn.map(({ t, centre, segments }, ti) =>
          segments.map((s, i) => {
            const loopColour = loops.colourOf.get(`${ti}:${i}`) ?? null;
            const colour = s.factor !== null ? LOOP_COLOURS[s.factor % LOOP_COLOURS.length] : loopColour;
            const dim = focus !== null && s.factor !== null && s.factor !== focus;
            return (
              <path
                key={`${t.inst.id}:${i}`}
                data-factor={s.factor ?? undefined}
                className={['multiedge-strand', colour ? '' : 'is-open', dim ? 'is-dim' : ''].filter(Boolean).join(' ')}
                style={colour ? { stroke: colour } : undefined}
                d={chordPath(s.a, s.b, centre)}
              />
            );
          }),
        )}
        {drawn.map(({ t, odd: o, ends }) =>
          o ? ends.map((p, i) => <circle key={`${t.inst.id}:e${i}`} className="lattice-loose is-out" cx={p.pos.x} cy={p.pos.y} r={0.09} />) : null,
        )}
      </svg>
      <p className="muted" data-testid="multiedge-loops">
        {odd > 0
          ? `${odd} of ${tiles.length} tiles have an odd number of ends (tinted), so they can't pair up.`
          : segCount === 0
            ? 'No strands: raise a count or click a cube corner.'
            : `${loops.closed} closed loop${loops.closed === 1 ? '' : 's'} and ${loops.open} path${loops.open === 1 ? '' : 's'} running off the edge, ${
                factors ? 'coloured by the factor they belong to' : 'each closed loop in its own colour, open paths grey'
              }.`}
      </p>
    </div>
  );
}

/** Combination n of the tiles' pairings, the first tile type turning fastest. */
function comboPicks(types: readonly TileTypeId[], sizes: readonly number[], n: number): Record<string, number> {
  const out: Record<string, number> = {};
  let r = n;
  types.forEach((t, i) => {
    const size = Math.max(1, sizes[i]);
    out[t] = r % size;
    r = Math.floor(r / size);
  });
  return out;
}

function FactorPanel(props: {
  model: MultiEdgeModel;
  x: readonly number[];
  pairs: PairTable;
  pick: (t: TileTypeId) => number;
  setPicks: (p: Record<string, number>) => void;
  factors: Factorisation | null;
  byFactor: boolean;
  onByFactor: (on: boolean) => void;
  focus: number | null;
  onFocus: (k: number | null) => void;
}): JSX.Element {
  const { model, x, pairs, pick, setPicks, factors, byFactor, onByFactor, focus, onFocus } = props;
  const types = model.types;
  const sizes = types.map((t) => pairs[t].pairings.length);
  const odd = sizes.some((n, i) => n === 0 && tileEnds(model, x)[i] > 0);
  const total = odd ? 0 : sizes.reduce((a, n) => a * Math.max(1, n), 1);
  const truncated = types.some((t) => pairs[t].truncated);
  const current = types.reduceRight((a, t, i) => a * Math.max(1, sizes[i]) + pick(t), 0);
  const signatureAt = (n: number): string | null => {
    const picks = comboPicks(types, sizes, n);
    const chosen = Object.fromEntries(types.map((t) => [t, pairs[t].pairings[picks[t]] ?? null]));
    const f = pairingFactorisation(model, x, chosen);
    return f && factorSignature(model, f);
  };
  const go = (n: number) => {
    if (total > 0) setPicks(comboPicks(types, sizes, ((n % total) + total) % total));
  };
  const splits = useMemo(() => {
    if (total === 0 || total > SPLITS_MAX) return null;
    const out = new Map<string, { count: number; first: number }>();
    for (let n = 0; n < total; n++) {
      const sig = signatureAt(n);
      if (sig === null) continue;
      const hit = out.get(sig);
      if (hit) hit.count++;
      else out.set(sig, { count: 1, first: n });
    }
    return [...out.entries()].sort((a, b) => a[1].first - b[1].first);
    // signatureAt reads only model, x and pairs.
  }, [model, x, pairs, total]);
  const here = factors ? factorSignature(model, factors) : null;
  const nextNew = () => {
    if (here === null) return;
    for (let d = 1; d < Math.min(total, SEARCH_MAX); d++) {
      const n = (current + d) % total;
      if (signatureAt(n) !== here) return go(n);
    }
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = factors?.factors.length ?? 0;
    const act: Record<string, () => void> = {
      ArrowLeft: () => go(current - 1),
      ArrowRight: () => go(current + 1),
      ArrowUp: () => k && onFocus(focus === null ? k - 1 : focus === 0 ? null : focus - 1),
      ArrowDown: () => k && onFocus(focus === null ? 0 : focus === k - 1 ? null : focus + 1),
    };
    if (!act[e.key]) return;
    e.preventDefault();
    act[e.key]();
  };
  return (
    <div
      className="lattice-table-box multiedge-factors"
      tabIndex={0}
      role="group"
      aria-label="Factors. Left and right arrows step through the combinations of pairings, up and down pick out a factor."
      data-testid="multiedge-factors"
      onKeyDown={onKeyDown}
    >
      <p className="lattice-keys muted">
        Click here, then <kbd>←</kbd> <kbd>→</kbd> step through every combination of pairings and <kbd>↑</kbd> <kbd>↓</kbd> pick out a factor in the patch.
      </p>
      <div className="multiedge-factor-controls">
        <span className="lattice-combo" data-testid="multiedge-combo-all">
          <button type="button" aria-label="Previous combination" onClick={() => go(current - 1)} disabled={total < 2}>
            ‹
          </button>
          Combination {total ? (current + 1).toLocaleString('en-US') : 0} of {total.toLocaleString('en-US')}
          {truncated ? '+' : ''}
          <button type="button" aria-label="Next combination" onClick={() => go(current + 1)} disabled={total < 2}>
            ›
          </button>
        </span>
        <button type="button" className="lattice-clear" onClick={nextNew} disabled={total < 2 || here === null} data-testid="multiedge-next-split">
          Next different split
        </button>
        <label className="multiedge-toggle">
          <input type="checkbox" checked={byFactor} onChange={(e) => onByFactor(e.target.checked)} data-testid="multiedge-by-factor" />
          Colour the patch by factor
        </label>
      </div>
      {factors === null ? (
        <p className="muted multiedge-note">Some tile has an odd number of ends, so there is no drawing to split.</p>
      ) : !x.some(Boolean) ? (
        <p className="muted multiedge-note">No strands, so nothing to split.</p>
      ) : (
        <>
          <p className="multiedge-split" data-testid="multiedge-split">
            <span className="mono">{formatVector(model, x)}</span> ={' '}
            {factors.factors.map((f, i) => (
              <span key={i}>
                {i > 0 && ' + '}
                <span className="mono multiedge-factor-name" style={{ color: LOOP_COLOURS[i % LOOP_COLOURS.length] }}>
                  {formatVector(model, f.vector)}
                </span>
              </span>
            ))}
          </p>
          <table className="lattice-table" data-testid="multiedge-factor-table">
            <thead>
              <tr>
                <th scope="col">Factor</th>
                {model.classes.map((c) => (
                  <th key={c} scope="col" style={{ borderBottomColor: edgeClassColor(c) }}>
                    {c}
                  </th>
                ))}
                <th scope="col">Splits further?</th>
              </tr>
            </thead>
            <tbody>
              {factors.factors.map((f, i) => (
                <tr
                  key={i}
                  className={focus === i ? 'is-selected' : undefined}
                  onPointerEnter={() => onFocus(i)}
                  onPointerLeave={() => onFocus(null)}
                  data-testid={`multiedge-factor-${i}`}
                >
                  <th scope="row">
                    <span className="multiedge-factor-swatch" style={{ background: LOOP_COLOURS[i % LOOP_COLOURS.length] }} />
                    {formatVector(model, f.vector)}
                  </th>
                  {f.vector.map((v, k) => (
                    <td key={k} className={v === 0 ? 'is-zero' : undefined}>
                      {v === 0 ? '·' : v}
                    </td>
                  ))}
                  <td>{f.atom ? 'no: an atom' : 'yes, with other pairings'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {splits && splits.length > 0 && (
        <div className="multiedge-splits" data-testid="multiedge-splits">
          <h3>
            Every split these pairings reach ({splits.length} from {total.toLocaleString('en-US')} combination{total === 1 ? '' : 's'})
          </h3>
          <ul>
            {splits.map(([sig, { count, first }]) => (
              <li key={sig}>
                <button type="button" aria-pressed={sig === here} onClick={() => go(first)}>
                  <span className="mono">{sig}</span>
                  <span className="muted">
                    {' '}
                    {count.toLocaleString('en-US')} combination{count === 1 ? '' : 's'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {total > SPLITS_MAX && (
        <p className="muted multiedge-note">
          {total.toLocaleString('en-US')} combinations is too many to list every split; step through them, or use &ldquo;Next different split&rdquo;.
        </p>
      )}
      <p className="muted multiedge-note">
        A strand position on an edge (counted from the edge&rsquo;s + side; class 0 glues to itself, so a position and its mirror are one) is
        joined to whatever its tile pairs it with. Each group of joined positions is a drawing on its own, so its counts are a valid choice:
        a factor. Different pairings group the strands differently, so one count vector can split in several ways. A factor marked
        &ldquo;an atom&rdquo; can&rsquo;t split however you pair it.
      </p>
    </div>
  );
}
