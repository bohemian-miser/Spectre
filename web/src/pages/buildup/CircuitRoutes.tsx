/**
 * The routes a selected circuit uses: drawn over its supertile's children
 * and their border tables, counted at every level below the one it closes
 * at, and set beside a circuit of the same family closing two levels up
 * (or down), composition by composition.
 */
import { useEffect, useMemo, useRef } from 'react';
import { buildSystem, transPt, type Affine, type MetaNode } from '../../core';
import { slotOf, type CircuitShapes } from '../shapes/circuitShapes';
import type { Closing } from './buildup';
import { byComposition, circuitUse, usedRoutes, type LevelUse } from './circuitRoutes';
import { bounds } from './TableFigure';

const nf = (n: number) => n.toLocaleString('en-US');
const pct = (a: number, b: number) => `${Math.round((100 * a) / Math.max(1, b))}%`;
/** The circuit is drawn as runs of tiles within this share of its radius of gyration, each at its mean. */
const SHARE = 1 / 100;
/** Routes listed per level. */
const TOP = 4;
/** Levels below the circuit's own compared with its harmonic's. */
const DEPTH = 4;
/** Characters of a composition shown before it is cut. */
const CUT = 60;

/** The circuit over its supertile's children, each child's border table drawn, the routes the circuit takes highlighted. */
function Overlay(props: { cs: CircuitShapes; c: Closing }): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { cs, c } = props;
  const N = c.circuit.level;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const kids = (buildSystem(cs.family, N)[c.circuit.type] as MetaNode).children;
    // per slot: the lower places of the child routes the circuit takes, with passes
    const taken = new Map<number, Map<number, number>>();
    for (const s of c.circuit.steps) {
      const ch = cs.childOf(N, c.circuit.type, s);
      const m = cs.levels[N - 1][ch.type].mate(ch.k);
      const lo = Math.min(ch.k, m);
      const t = taken.get(slotOf(s)) ?? taken.set(slotOf(s), new Map()).get(slotOf(s))!;
      t.set(lo, (t.get(lo) ?? 0) + 1);
    }
    const circuit = cs.coarse(c.circuit, SHARE).pts;
    const all = kids.flatMap((ch) => {
      const T = cs.levels[N - 1][ch.node.type];
      return Array.from(T.crossings(), (k) => transPt(ch.xform as Affine, T.pts[k]));
    });
    const [minX, maxX] = bounds(all.map((p) => p.x)), [minY, maxY] = bounds(all.map((p) => p.y));
    const size = Math.max(maxX - minX, maxY - minY) * 1.04 || 1;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const px = 700;
    cv.width = px;
    cv.height = px;
    const g = cv.getContext('2d')!;
    const css = getComputedStyle(cv);
    const color = (v: string, d: string) => css.getPropertyValue(v).trim() || d;
    const X = (x: number) => ((x - cx) / size + 0.5) * px, Y = (y: number) => ((cy - y) / size + 0.5) * px;
    g.clearRect(0, 0, px, px);
    let longest = 2;
    for (const ch of kids) for (const k of cs.levels[N - 1][ch.node.type].crossings()) longest = Math.max(longest, cs.levels[N - 1][ch.node.type].len(k));
    const routes = (ch: (typeof kids)[number], only: Map<number, number> | null) => {
      const T = cs.levels[N - 1][ch.node.type];
      const x = ch.xform as Affine;
      const ks = T.crossings();
      const [lx, hx] = bounds(Array.from(ks, (k) => T.pts[k].x)), [ly, hy] = bounds(Array.from(ks, (k) => T.pts[k].y));
      const mid = transPt(x, { x: (lx + hx) / 2, y: (ly + hy) / 2 });
      for (const k of ks) {
        const m = T.mate(k);
        if (m <= k || (only && !only.has(k))) continue;
        // fainter for fewer tiles, as on the tables
        if (!only) g.globalAlpha = 0.03 + (0.6 * Math.log(T.len(k))) / Math.log(longest);
        const p = transPt(x, T.pts[k]), q = transPt(x, T.pts[m]);
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        g.beginPath();
        g.moveTo(X(p.x), Y(p.y));
        g.quadraticCurveTo(X(mx + (mid.x - mx) * 0.55), Y(my + (mid.y - my) * 0.55), X(q.x), Y(q.y));
        g.stroke();
      }
    };
    g.strokeStyle = color('--accent', '#2f7d6d');
    g.lineWidth = 1;
    for (const ch of kids) routes(ch, null);
    g.globalAlpha = 1;
    g.strokeStyle = color('--danger', '#c0392b');
    g.lineWidth = 2.5;
    for (const ch of kids) if (taken.has(ch.pos)) routes(ch, taken.get(ch.pos)!);
    g.strokeStyle = color('--text', '#000');
    g.lineWidth = 0.8;
    g.beginPath();
    circuit.forEach((p, i) => (i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y))));
    g.closePath();
    g.stroke();
  }, [cs, c, N]);
  return <canvas ref={ref} className="bu-canvas" aria-label="The circuit over its supertile's children and their border tables" />;
}

/** The routes of every type at a level, once per pair. */
const routesAt = (cs: CircuitShapes, n: number): number =>
  Object.values(cs.levels[n]).reduce((s, T) => s + (T.crossings().length - Array.from(T.crossings()).filter((k) => T.mate(k) < 0).length) / 2, 0);

export function CircuitRoutes(props: { cs: CircuitShapes; c: Closing; use: readonly LevelUse[]; closings: readonly (readonly Closing[])[] }): JSX.Element {
  const { cs, c, use } = props;
  const N = c.circuit.level;
  const rows = useMemo(() => use.map((u) => ({ u, total: routesAt(cs, u.level), top: usedRoutes(cs, u).slice(0, TOP) })).reverse(), [cs, use]);
  // a circuit of the same family that first closes two levels up, else two levels down: the biggest
  const partner = useMemo(() => {
    for (const m of [N + 2, N - 2]) {
      const there = (props.closings[m] ?? []).filter((x) => x.family === c.family && x.first === m).sort((a, b) => b.length - a.length)[0];
      if (there) return there;
    }
    return null;
  }, [props.closings, N, c.family]);
  const compared = useMemo(() => {
    if (!partner) return [];
    const [lo, hi] = partner.circuit.level > N ? [c, partner] : [partner, c];
    const ul = lo === c ? use : circuitUse(cs, lo.circuit), uh = hi === c ? use : circuitUse(cs, hi.circuit);
    const out = [];
    for (let d = 1; d <= DEPTH && lo.circuit.level - d >= 0; d++) {
      const a = ul[lo.circuit.level - d], b = uh[hi.circuit.level - d];
      const ca = byComposition(usedRoutes(cs, a)), cb = byComposition(usedRoutes(cs, b));
      const shared = [...ca.keys()].filter((k) => cb.has(k));
      out.push({
        a, b, ca: ca.size, cb: cb.size, shared: shared.length,
        pa: shared.reduce((s, k) => s + ca.get(k)!, 0), pb: shared.reduce((s, k) => s + cb.get(k)!, 0),
      });
    }
    return out;
  }, [cs, c, partner, use, N]);
  return (
    <div className="bu-circuit-view" data-testid="bu-circuit-routes">
      <h3>{nf(c.length)} tiles, closing in a level-{N} {c.circuit.type}: the routes it uses</h3>
      <div className="bu-circuit-body">
        <figure>
          <Overlay cs={cs} c={c} />
          <figcaption>Its children's level-{N - 1} border tables, fainter for fewer tiles; the routes it takes in red, the circuit over them.</figcaption>
        </figure>
        <div className="bu-circuit-tables">
          <table className="bu-summary-table bu-arcs" data-testid="bu-circuit-use">
            <thead><tr><th>Level</th><th className="num">Routes used</th><th className="num">Passes</th><th>Most passed</th></tr></thead>
            <tbody>
              {rows.map(({ u, total, top }) => (
                <tr key={u.level}>
                  <td>{u.level === 0 ? 'tiles' : u.level}</td>
                  <td className="num">{nf(u.routes)} of {nf(total)}</td>
                  <td className="num">{nf(u.passes)}</td>
                  <td className="bu-comp">{top.map((r) => `${r.type}: ${r.composition.length > CUT ? `${r.composition.slice(0, CUT)}…` : r.composition} ×${nf(r.passes)}`).join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {partner ? (
            <table className="bu-summary-table bu-arcs" data-testid="bu-harmonic">
              <caption className="bu-muted">
                Against the {nf(partner.length)}-tile circuit of the same children ({c.family}) closing at level {partner.circuit.level}: compositions (type and child types) of the routes each uses, level k beside level k + 2.
              </caption>
              <thead><tr><th>Levels</th><th className="num">Routes</th><th className="num">Compositions</th><th className="num">Shared</th><th className="num">Passes on shared</th></tr></thead>
              <tbody>
                {compared.map((r) => (
                  <tr key={r.a.level}>
                    <td>{r.a.level} / {r.b.level}</td>
                    <td className="num">{nf(r.a.routes)} / {nf(r.b.routes)}</td>
                    <td className="num">{r.ca} / {r.cb}</td>
                    <td className="num">{r.shared}</td>
                    <td className="num">{pct(r.pa, r.a.passes)} / {pct(r.pb, r.b.passes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="bu-muted">No circuit of the same children closes first two levels up or down among the levels built.</p>}
        </div>
      </div>
    </div>
  );
}
