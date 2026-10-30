/**
 * A level's types, grouped where their routes join the same crossings
 * through as many tiles: one small drawing per group, its outline through
 * every border crossing and its routes walked one or two levels down, drawn
 * once per level into a canvas, a group at a time so a deep level does not
 * hold the page up. With a circuit followed, the routes it uses at this
 * level are drawn over the rest, and groups it does not use are dimmed.
 */
import { useEffect, useRef } from 'react';
import type { HexType } from '../../core';
import { tileColor } from '../../lib/palette';
import type { LevelUse } from './circuitRoutes';
import { IDENTITY, ringOf, routeSet, type Geometry } from './viewer';

const nf = (n: number) => n.toLocaleString('en-US');
/** Pixels across a drawing. */
const PX = 132;

function draw(c: HexCanvas, g: Geometry, level: number, types: readonly HexType[], use: LevelUse | null): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = PX * dpr;
  c.height = PX * dpr;
  const ctx = c.getContext('2d')!;
  const css = getComputedStyle(c);
  const color = (v: string) => css.getPropertyValue(v).trim() || '#888';
  const type = types[0];
  const ring = ringOf(g, level, type).pts;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < ring.length; i += 2) {
    x0 = Math.min(x0, ring[i]); x1 = Math.max(x1, ring[i]);
    y0 = Math.min(y0, ring[i + 1]); y1 = Math.max(y1, ring[i + 1]);
  }
  const s = (PX * 0.92) / Math.max(x1 - x0, y1 - y0, 1e-9);
  const ox = PX / 2 - ((x0 + x1) / 2) * s, oy = PX / 2 + ((y0 + y1) / 2) * s;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, PX, PX);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const path = (pts: Float64Array) => {
    const p = new Path2D();
    let lx = 0, ly = 0;
    for (let i = 0; i < pts.length; i += 2) {
      const X = pts[i] * s + ox, Y = -pts[i + 1] * s + oy;
      if (i === 0) p.moveTo(X, Y);
      else if (i === pts.length - 2 || Math.abs(X - lx) >= 0.5 || Math.abs(Y - ly) >= 0.5) p.lineTo(X, Y);
      else continue;
      lx = X;
      ly = Y;
    }
    return p;
  };
  // routes walked one level down at the deep levels, two at the others, for few lines; each keeps inside the outline
  const stop = level >= 6 ? level - 1 : Math.max(0, level - 2);
  const rs = routeSet(g.cs, level, type);
  const most = Math.log(rs.tiles[rs.tiles.length - 1] || 1) || 1;
  const used = new Set<number>();
  if (use) for (const t of types) for (const k of use.byType.get(t)?.keys() ?? []) used.add(k);
  const shades = [new Path2D(), new Path2D(), new Path2D()];
  const hot = new Path2D();
  rs.from.forEach((k, i) => {
    const p = path(g.arc(level, type, k, IDENTITY, stop, null));
    if (used.has(k)) hot.addPath(p);
    else shades[Math.min(2, Math.floor((3 * Math.log(rs.tiles[i])) / most))].addPath(p);
  });
  ctx.strokeStyle = color('--accent');
  ctx.lineWidth = 0.8;
  shades.forEach((p, b) => {
    ctx.globalAlpha = (use ? 0.35 : 1) * [0.3, 0.6, 1][b];
    ctx.stroke(p);
  });
  ctx.globalAlpha = 1;
  if (use) {
    ctx.strokeStyle = color('--danger');
    ctx.lineWidth = 1.4;
    ctx.stroke(hot);
  }
  ctx.strokeStyle = color('--muted');
  ctx.lineWidth = 1;
  ctx.stroke(path(ring));
}

type HexCanvas = HTMLCanvasElement;

export function GroupStrip(props: {
  g: Geometry;
  level: number;
  groups: readonly (readonly HexType[])[];
  type: HexType;
  onPick: (t: HexType) => void;
  /** The routes of a followed circuit at this level. */
  use: LevelUse | null;
}): JSX.Element {
  const { g, level, groups, use } = props;
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  // one group per task, so the page stays responsive while a deep level is drawn
  useEffect(() => {
    let i = 0;
    let id = 0;
    const next = () => {
      const c = refs.current[i];
      if (c) draw(c, g, level, groups[i], use);
      i++;
      if (i < groups.length) id = window.setTimeout(next, 0);
    };
    id = window.setTimeout(next, 0);
    return () => clearTimeout(id);
  }, [g, level, groups, use]);
  return (
    <div className="bu-groups" role="group" aria-label="Types with the same routes" data-testid="bu-groups">
      {groups.map((gr, i) => {
        const T = g.cs.levels[level][gr[0]];
        const crossings = T.crossings();
        const routes = Array.from(crossings).filter((k) => T.mate(k) > k).length;
        const active = gr.includes(props.type);
        const dim = use !== null && !gr.some((t) => use.byType.has(t));
        return (
          <button key={gr.join()} type="button" className={`bu-group${active ? ' is-active' : ''}${dim ? ' is-dim' : ''}`} onClick={() => props.onPick(active ? props.type : gr[0])} data-testid="bu-group">
            <canvas ref={(el) => { refs.current[i] = el; }} style={{ width: PX, height: PX }} aria-label={`Routes of ${gr.join(', ')}`} />
            <span className="bu-group-names">
              {gr.map((t) => <span key={t} className="bu-name" style={{ background: tileColor(t) }}>{t}</span>)}
            </span>
            <span className="bu-group-count">{nf(routes)} routes · {nf(crossings.length)} crossings</span>
          </button>
        );
      })}
    </div>
  );
}
