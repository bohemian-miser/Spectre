/**
 * The levels above the last built, to level 30 (`deep.ts`): per level the
 * exact size of a supertile and of its route table, and the circuits the
 * chains carry on there, drawn by their readings over the supertile.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSystem, transPt, type Affine, type HexType, type MetaNode } from '../../core';
import type { CircuitShapes } from '../shapes/circuitShapes';
import type { Closing } from './buildup';
import { chainsOf, levelCounts, outlineOf, placeOfPath, predictAt, readingPolyline, type Chain, type Predicted } from './deep';

const nf = (n: number | bigint) => n.toLocaleString('en-US');
/** A count too long to read whole: its leading figures and power of ten. */
const big = (n: bigint): JSX.Element => {
  const s = n.toString();
  return s.length <= 9 ? <>{nf(n)}</> : <>{s[0]}.{s.slice(1, 4)} × 10<sup>{s.length - 1}</sup></>;
};
/** The highest level offered. */
const TOP = 30;
const COLORS = ['--danger', '--accent'];

/** Points mapped by a placement. */
const moved = (x: Affine, o: Float64Array): Float64Array => {
  const out = new Float64Array(o.length);
  for (let i = 0; i < o.length; i += 2) {
    const q = transPt(x, { x: o[i], y: o[i + 1] });
    out[i] = q.x;
    out[i + 1] = q.y;
  }
  return out;
};

/**
 * The supertile with its children and the predicted circuits; or, with
 * `zoom`, the circuits close up among the supertiles their readings run
 * through.
 */
function draw(c: HTMLCanvasElement, px: number, cs: CircuitShapes, level: number, type: HexType, shown: readonly Predicted[], zoom: boolean): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = px * dpr;
  c.height = px * dpr;
  const ctx = c.getContext('2d')!;
  const css = getComputedStyle(c);
  const color = (v: string) => css.getPropertyValue(v).trim() || '#888';
  const ring = outlineOf(cs, level, type, 3);
  const lines = shown.map((p) => readingPolyline(cs, p, p.chain.depth));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const pts of zoom ? lines : [ring]) {
    for (let i = 0; i < pts.length; i += 2) {
      x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
      y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
    }
  }
  const s = (px * (zoom ? 0.6 : 0.94)) / Math.max(x1 - x0, y1 - y0, 1e-9);
  const ox = px / 2 - ((x0 + x1) / 2) * s, oy = px / 2 + ((y0 + y1) / 2) * s;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, px, px);
  const path = (pts: Float64Array): Path2D => {
    const p = new Path2D();
    for (let i = 0; i < pts.length; i += 2) {
      const X = pts[i] * s + ox, Y = -pts[i + 1] * s + oy;
      if (i === 0) p.moveTo(X, Y);
      else p.lineTo(X, Y);
    }
    return p;
  };
  ctx.strokeStyle = color('--muted');
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 0.8;
  if (zoom) {
    // each supertile a reading runs through, once
    const seen = new Set<string>();
    for (const p of shown) {
      const d = p.chain.depth;
      for (const id of p.reading.paths[d]) {
        if (seen.has(`${d} ${id}`)) continue;
        seen.add(`${d} ${id}`);
        const at = placeOfPath(cs.family, level, p.type, id, d);
        ctx.stroke(path(moved(at.x, outlineOf(cs, level - d, at.type, 1))));
      }
    }
  } else {
    // the children, each through its own children's corners
    for (const ch of (buildSystem(cs.family, level)[type] as MetaNode).children) ctx.stroke(path(moved(ch.xform as Affine, outlineOf(cs, level - 1, ch.node.type as HexType, 2))));
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.2;
  ctx.stroke(path(ring));
  ctx.lineJoin = 'round';
  lines.forEach((pts, i) => {
    ctx.strokeStyle = color(COLORS[i % COLORS.length]);
    ctx.lineWidth = zoom ? 2 : 1.5;
    ctx.stroke(path(pts));
  });
}

export function DeepPane(props: { cs: CircuitShapes; built: number; closings: readonly (readonly Closing[])[] }): JSX.Element {
  const { cs, built, closings } = props;
  const [level, setLevel] = useState<number | null>(null);
  const counts = useMemo(() => levelCounts(cs, TOP), [cs]);
  const chains: Chain[] = useMemo(() => chainsOf(cs, closings, built), [cs, closings, built]);
  // first shown: the highest level a chain closes at
  const highest = useMemo(() => {
    for (let n = TOP; n > built; n--) if (predictAt(chains, n).length) return n;
    return TOP;
  }, [chains, built]);
  const at = Math.max(level ?? highest, built + 1);
  const shown = useMemo(() => predictAt(chains, at), [chains, at]);
  const type: HexType = shown[0]?.type ?? 'Delta';
  const ref = useRef<HTMLCanvasElement | null>(null);
  const near = useRef<HTMLCanvasElement | null>(null);
  const px = typeof window !== 'undefined' && window.innerWidth < 640 ? 300 : 380;
  useEffect(() => {
    if (ref.current) draw(ref.current, px, cs, at, type, shown, false);
    if (near.current && shown.length) draw(near.current, px, cs, at, type, shown, true);
  }, [cs, at, type, shown, px]);
  const words = ['no', 'one', 'two', 'three', 'four'];
  const levels = Array.from({ length: TOP - built }, (_, i) => built + 1 + i);
  const memberLine = (c: Chain) => c.members.map((m) => `${nf(m.length)} at ${m.level}`).join(', ');
  return (
    <section className="bu-deep" data-testid="bu-deep">
      <p className="bu-muted">
        Levels 0 to {built} are built. Above them a table is too big to hold, so a level is not built but counted and predicted.
        Counted exactly, from the substitution: the tiles in a supertile and the routes of its table (half the crossings on its border), as at every built level.
        Predicted, from the chains: a chain is a run of new circuits two levels apart, each reading at its top levels as the one before, and its next member is taken to read so too, placement for placement.
        Those circuits are drawn by the supertiles their readings run through; their tiles are not counted.
      </p>
      {chains.length === 0 ? <p className="bu-muted">No chain among the circuits built so far: build further up.</p> : (
        <ul className="bu-deep-chains" data-testid="bu-deep-chains">
          {chains.map((c, i) => (
            <li key={memberLine(c)}>
              <i style={{ background: `var(${COLORS[i % COLORS.length]})` }} />
              Family {c.family}: {memberLine(c)}; each reads as the one before {c.depth} levels down
            </li>
          ))}
        </ul>
      )}
      <div className="bu-deep-main">
        <div>
          <label className="bu-check">
            Level{' '}
            <select value={at} onChange={(e) => setLevel(Number(e.target.value))} data-testid="bu-deep-level">
              {levels.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <p className="bu-line" data-testid="bu-deep-line">
            {shown.length === 0
              ? `A level-${at} ${type}: no chain closes here (chains close every two levels)`
              : `A level-${at} ${type} and the ${words[shown.length] ?? shown.length} ${shown.length === 1 ? 'circuit' : 'circuits'} predicted to close in it, each drawn through the middles of the level-${at - shown[0].chain.depth} supertiles of its reading; close up on the right`}
          </p>
          <div className="bu-deep-pics">
            <canvas ref={ref} style={{ width: px, height: px }} aria-label={`A level-${at} ${type} with its predicted circuits`} />
            {shown.length > 0 && <canvas ref={near} style={{ width: px, height: px }} aria-label={`The predicted circuits close up, among the level-${at - shown[0].chain.depth} supertiles of their readings`} data-testid="bu-deep-near" />}
          </div>
        </div>
        <table className="bu-summary-table" data-testid="bu-deep-table">
          <thead>
            <tr><th>Level</th><th className="num">Tiles in a Delta</th><th className="num">Routes of its table</th><th>New circuits, predicted</th></tr>
          </thead>
          <tbody>
            {levels.map((n) => {
              const p = predictAt(chains, n);
              return (
                <tr key={n} className={n === at ? 'is-active' : ''} onClick={() => setLevel(n)}>
                  <td>{n}</td>
                  <td className="num">{big(counts[n].tiles.get('Delta')!)}</td>
                  <td className="num">{big(counts[n].crossings.get('Delta')! / 2n)}</td>
                  <td>{p.length ? `${p.length}, in the chains of the ${p.map((x) => nf(x.chain.members[x.chain.members.length - 1].length)).join(' and the ')}` : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
