/**
 * Build-up: the supertiles of a combination built level by level. Each
 * level shows every supertile type's border table (which crossing a strand
 * entering at each crossing leaves by, and through how many tiles), types
 * with identical tables drawn once, and the circuits that close at that
 * level, new ones marked. Tables and circuits come from the renormalisation
 * (`shapes/circuitShapes.ts`), read by `buildup/buildup.ts`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { tileColor } from '../lib/palette';
import type { TileTypeId } from '../core';
import { CircuitShapes } from './shapes/circuitShapes';
import { ComboPicker, type ComboChoice } from './shapes/ComboPicker';
import { explorerCircuitHref } from './shapes/explorerLink';
import { closingsByLevel, groupsAt, tablesAt, type Closing, type Table } from './buildup/buildup';
import '../styles/shapes.css';
import '../styles/buildup.css';

const nf = (n: number) => n.toLocaleString('en-US');
const DEFAULT: ComboChoice = { subset: [0, 2, 3, 4, 6, 8], combo: '140000001', level: 6 };
/** Most points a circuit is drawn with; longer circuits are drawn through evenly spaced tiles. */
const MAX_POINTS = 4000;
/** Tables with more routes than this are drawn on a canvas, without a reading per route. */
const SVG_ROUTES = 1500;

const bounds = (xs: readonly number[]): [number, number] => {
  let lo = Infinity, hi = -Infinity;
  for (const x of xs) { if (x < lo) lo = x; if (x > hi) hi = x; }
  return [lo, hi];
};

/** A large table, drawn on a canvas in the page's colours. */
function TableCanvas(props: { table: Table; shade: (n: number) => number; frame: { cx: number; cy: number; size: number } }): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const px = 600;
    c.width = px;
    c.height = px;
    const g = c.getContext('2d')!;
    const css = getComputedStyle(c);
    const { cx, cy, size } = props.frame;
    const X = (x: number) => ((x - cx) / size + 0.5) * px, Y = (y: number) => ((cy - y) / size + 0.5) * px;
    g.clearRect(0, 0, px, px);
    g.strokeStyle = css.getPropertyValue('--accent').trim() || '#2f7d6d';
    g.lineWidth = 1;
    for (const [a, b, n] of props.table.routes) {
      const p = props.table.pts[a], q = props.table.pts[b];
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      g.globalAlpha = props.shade(n);
      g.beginPath();
      g.moveTo(X(p.x), Y(p.y));
      g.quadraticCurveTo(X(mx + (cx - mx) * 0.55), Y(my + (cy - my) * 0.55), X(q.x), Y(q.y));
      g.stroke();
    }
  }, [props.table, props.shade, props.frame]);
  return <canvas ref={ref} className="bu-canvas" aria-label="Border table, drawn as an image" />;
}

function TableCard(props: { table: Table; names: readonly string[]; logMin: number; logMax: number }): JSX.Element {
  const { table, names } = props;
  const [minX, maxX] = bounds(Array.from(table.crossings, (k) => table.pts[k].x)), [minY, maxY] = bounds(Array.from(table.crossings, (k) => table.pts[k].y));
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const size = span * 1.16;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const frame = useMemo(() => ({ cx, cy, size }), [cx, cy, size]);
  const { logMin, logMax } = props;
  const shade = useMemo(() => (n: number) => (logMax > logMin ? 0.25 + 0.75 * (Math.log(n) - logMin) / (logMax - logMin) : 1), [logMin, logMax]);
  return (
    <figure className={`bu-table${names.length > 1 ? ' is-shared' : ''}`} data-testid="bu-table">
      <div className="bu-names">
        {names.map((n) => <span key={n} className="bu-name" style={{ background: tileColor(n) }}>{n}</span>)}
      </div>
      {table.routes.length > SVG_ROUTES ? <TableCanvas table={table} shade={shade} frame={frame} /> : (
      <svg viewBox={`${cx - size / 2} ${-cy - size / 2} ${size} ${size}`} role="img" aria-label={`Border table of ${names.join(', ')}`}>
        {table.routes.map(([a, b, n], i) => {
          const p = table.pts[a], q = table.pts[b];
          const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
          // bend toward the middle so routes between neighbouring crossings stay near the border
          const qx = mx + (cx - mx) * 0.55, qy = my + (cy - my) * 0.55;
          return (
            <path key={i} d={`M${p.x} ${-p.y} Q${qx} ${-qy} ${q.x} ${-q.y}`} className="bu-route" strokeOpacity={shade(n)} vectorEffect="non-scaling-stroke">
              <title>{`Crossing ${a} to crossing ${b}: ${nf(n)} tiles`}</title>
            </path>
          );
        })}
        {Array.from(table.crossings, (k) => <circle key={k} cx={table.pts[k].x} cy={-table.pts[k].y} r={span * 0.008 + 0.02} className="bu-crossing" />)}
      </svg>
      )}
      <figcaption>{nf(table.crossings.length)} crossings, {nf(table.routes.length)} routes</figcaption>
    </figure>
  );
}

function CircuitCard(props: { cs: CircuitShapes; c: Closing; level: number; href: string }): JSX.Element {
  const { cs, c } = props;
  const d = useMemo(() => {
    const pts = cs.sampled(c.circuit, MAX_POINTS);
    const [minX, maxX] = bounds(pts.map((p) => p.x)), [minY, maxY] = bounds(pts.map((p) => p.y));
    const span = Math.max(maxX - minX, maxY - minY) || 1;
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${((p.x - minX) / span * 100).toFixed(2)} ${((maxY - p.y) / span * 100).toFixed(2)}`).join('') + 'Z';
    return { path, w: (maxX - minX) / span * 100, h: (maxY - minY) / span * 100 };
  }, [cs, c]);
  const isNew = c.first === props.level;
  return (
    <figure className={`bu-circuit${isNew ? ' is-new' : ''}`} data-testid="bu-circuit">
      <svg viewBox={`-4 -4 ${d.w + 8} ${d.h + 8}`} role="img" aria-label={`Circuit of ${c.length} tiles`}>
        <path d={d.path} className="bu-outline" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption>
        <strong>{nf(c.length)} tiles</strong>
        <span>{isNew ? 'new at this level' : `also at level ${c.first}`}</span>
        <span>in a {c.circuit.type}, through children {c.family}</span>
        <a href={props.href}>Open in the Explorer</a>
      </figcaption>
    </figure>
  );
}

export default function BuildUpPage(): JSX.Element {
  const base = import.meta.env.BASE_URL;
  const [choice, setChoice] = useState<ComboChoice>(DEFAULT);
  const cs = useRef<CircuitShapes | null>(null);
  const [built, setBuilt] = useState(0);
  const [level, setLevel] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // builds a level at a time, each in its own task so the page can draw between them
  const buildTo = (target: number, fresh?: ComboChoice): void => {
    setBusy(true);
    setError(null);
    const step = (): void => {
      try {
        const now = cs.current;
        if (!now) return;
        if (now.maxLevel >= target) { setBuilt(now.maxLevel); setBusy(false); return; }
        now.extend(now.maxLevel + 1);
        setBuilt(now.maxLevel);
        setTimeout(step, 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setBusy(false);
      }
    };
    if (fresh) {
      setTimeout(() => {
        try {
          cs.current = new CircuitShapes('hex', fresh.subset, [...fresh.combo].map((ch) => parseInt(ch, 36)), 1, 1, true);
          setChoice(fresh);
          setBuilt(1);
          setLevel(1);
          step();
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setBusy(false);
        }
      }, 0);
    } else setTimeout(step, 0);
  };
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    buildTo(DEFAULT.level, DEFAULT);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tables = useMemo(() => (cs.current && level <= built ? tablesAt(cs.current, level) : null), [built, level]); // eslint-disable-line react-hooks/exhaustive-deps
  const closings = useMemo(() => (cs.current ? closingsByLevel(cs.current) : []), [built]); // eslint-disable-line react-hooks/exhaustive-deps
  const [logMin, logMax] = tables ? bounds(tables.tables.flatMap((t) => t.routes.map((r) => Math.log(r[2])))) : [0, 0];
  // a built level never changes, so each level's count is worked out once
  const counted = useRef<{ cs: CircuitShapes | null; counts: number[] }>({ cs: null, counts: [] });
  const groupCounts = useMemo(() => {
    const now = cs.current;
    if (!now) return [];
    if (counted.current.cs !== now) counted.current = { cs: now, counts: [] };
    const { counts } = counted.current;
    for (let k = counts.length; k <= built; k++) counts.push(groupsAt(now, k).length);
    return counts.slice(0, built + 1);
  }, [built]); // eslint-disable-line react-hooks/exhaustive-deps
  const here = closings[level] ?? [];

  const hrefOf = (c: Closing): string => {
    const first = cs.current!.firstTile(c.circuit);
    return explorerCircuitHref(base, {
      family: 'hex', subset: choice.subset, combo: choice.combo, type: c.circuit.type as TileTypeId, level: c.circuit.level,
      path: first.path, chord: first.chord,
    });
  };

  return (
    <div className="bu-page">
      <header className="bu-head">
        <h1>Build-up</h1>
        <p>
          Every supertile of a type is the same supertile, so a combination can be built one level at a time: each type's border table, which crossing a strand entering at each crossing leaves by and through how many tiles, is made from its children's tables, placed as the type lays them out. A strand that closes up inside, without reaching the border, is a circuit closing at that level.
        </p>
        <p className="bu-muted">Types whose tables are identical are drawn once with all their names: from outside they behave the same, though they are built differently inside.</p>
      </header>

      <ComboPicker busy={busy} onAdd={(c) => buildTo(c.level, c)} levels={[4, 5, 6, 7, 8, 9, 10]} verb="Build" initialLevel={DEFAULT.level} initialCombo={DEFAULT.combo} />
      {error && <p className="bu-error">{error}</p>}

      <div className="bu-levels" role="group" aria-label="Level" data-testid="bu-levels">
        {Array.from({ length: built + 1 }, (_, k) => (
          <button key={k} type="button" aria-pressed={k === level} className={k === level ? 'is-active' : ''} onClick={() => setLevel(k)} data-testid={`bu-level-${k}`}>
            {k === 0 ? 'Tiles' : `Level ${k}`}
          </button>
        ))}
        <button type="button" disabled={busy} onClick={() => { buildTo(built + 1); setLevel(built + 1); }} data-testid="bu-next">
          {busy ? `Building level ${built + 1}…` : `Build level ${built + 1}`}
        </button>
        <span className="bu-muted">{choice.subset.join('')} · {choice.combo}</span>
      </div>

      {tables && (
        <section className="bu-section">
          <h2>Border tables at {level === 0 ? 'the tiles' : `level ${level}`}</h2>
          <p className="bu-muted" data-testid="bu-summary">
            {tables.groups.length} different tables among the {tables.tables.length} types. Fainter routes pass fewer tiles; point at one to read it.
          </p>
          <div className="bu-tables">
            {tables.groups.map((g) => {
              const t = tables.tables.find((x) => x.type === g[0])!;
              return <TableCard key={g.join()} table={t} names={g} logMin={logMin} logMax={logMax} />;
            })}
          </div>
        </section>
      )}

      <section className="bu-section">
        <h2>Circuits closing at {level === 0 ? 'the tiles' : `level ${level}`}</h2>
        {here.length === 0 ? (
          <p className="bu-muted">None: every strand reaches the border of its {level === 0 ? 'tile' : 'supertile'}.</p>
        ) : (
          <div className="bu-circuits">
            {cs.current && here.map((c) => <CircuitCard key={c.key} cs={cs.current!} c={c} level={level} href={hrefOf(c)} />)}
          </div>
        )}
      </section>

      <section className="bu-section">
        <h2>Every level so far</h2>
        <table className="bu-summary-table" data-testid="bu-every-level">
          <thead><tr><th>Level</th><th className="num">Different tables</th><th>New circuits (tiles)</th><th>Closing again</th></tr></thead>
          <tbody>
            {closings.map((cl, k) => (
              <tr key={k} className={k === level ? 'is-active' : ''} onClick={() => setLevel(k)}>
                <td>{k === 0 ? 'tiles' : k}</td>
                <td className="num">{groupCounts[k] ?? ''}</td>
                <td>{cl.filter((c) => c.first === k).map((c) => nf(c.length)).join(', ')}</td>
                <td>{cl.filter((c) => c.first < k).map((c) => nf(c.length)).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
