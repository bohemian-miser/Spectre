/**
 * A level's types, grouped where their routes join the same crossings
 * through as many tiles: one drawing per group, its outline through every
 * border crossing and its routes walked a level or two down, drawn once per
 * level and setting into a canvas, a group at a time so a deep level does
 * not hold the page up.
 *
 * Shown whole, or as what each group adds: first the core, the routes every
 * type but Gamma has identically (`routes.ts`), then each group's routes
 * beyond it, and Gamma's whole table, Gamma being outside the core. With a
 * circuit followed, the routes it uses at this level are drawn over the
 * rest, and groups it does not use are dimmed.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { HexType } from '../../core';
import { tileColor } from '../../lib/palette';
import type { LevelUse } from './circuitRoutes';
import { CORE_TYPES, coreRoutes, extraRoutes } from './routes';
import { IDENTITY, ringOf, routeSet, type Geometry } from './viewer';

const nf = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, one: string) => `${nf(n)} ${one}${n === 1 ? '' : 's'}`;

/** What a drawing shows: a type's frame, the routes (by their lower crossing) drawn strongly, and whether the rest are drawn faint. */
interface Drawing {
  readonly type: HexType;
  /** Routes drawn strongly; null for all of them. */
  readonly strong: ReadonlySet<number> | null;
  /** Routes drawn at all; null for all of them. */
  readonly only?: ReadonlySet<number>;
  readonly use: LevelUse | null;
  readonly types: readonly HexType[];
}

function draw(c: HTMLCanvasElement, px: number, g: Geometry, level: number, d: Drawing): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = px * dpr;
  c.height = px * dpr;
  const ctx = c.getContext('2d')!;
  const css = getComputedStyle(c);
  const color = (v: string) => css.getPropertyValue(v).trim() || '#888';
  const ring = ringOf(g, level, d.type).pts;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < ring.length; i += 2) {
    x0 = Math.min(x0, ring[i]); x1 = Math.max(x1, ring[i]);
    y0 = Math.min(y0, ring[i + 1]); y1 = Math.max(y1, ring[i + 1]);
  }
  const s = (px * 0.94) / Math.max(x1 - x0, y1 - y0, 1e-9);
  const ox = px / 2 - ((x0 + x1) / 2) * s, oy = px / 2 + ((y0 + y1) / 2) * s;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, px, px);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const path = (pts: Float64Array, into: Path2D) => {
    let lx = 0, ly = 0;
    for (let i = 0; i < pts.length; i += 2) {
      const X = pts[i] * s + ox, Y = -pts[i + 1] * s + oy;
      if (i === 0) into.moveTo(X, Y);
      else if (i === pts.length - 2 || Math.abs(X - lx) >= 0.5 || Math.abs(Y - ly) >= 0.5) into.lineTo(X, Y);
      else continue;
      lx = X;
      ly = Y;
    }
  };
  // routes walked one level down at the deep levels, two at the others; each keeps inside the outline
  const stop = level >= 7 ? level - 1 : Math.max(0, level - 2);
  const rs = routeSet(g.cs, level, d.type);
  const most = Math.log(rs.tiles[rs.tiles.length - 1] || 1) || 1;
  const used = new Set<number>();
  if (d.use) for (const t of d.types) for (const k of d.use.byType.get(t)?.keys() ?? []) used.add(k);
  const shades = [new Path2D(), new Path2D(), new Path2D()];
  const faint = new Path2D();
  const hot = new Path2D();
  // a ring round each strongly drawn route, as one is often a few tiles long
  const marks = new Path2D();
  rs.from.forEach((k, i) => {
    if (d.only && !d.only.has(k)) return;
    const pts = (into: Path2D) => {
      const a = g.arc(level, d.type, k, IDENTITY, stop, null);
      path(a, into);
      if (into !== faint && d.strong) {
        let mx = 0, my = 0;
        for (let j = 0; j < a.length; j += 2) { mx += a[j]; my += a[j + 1]; }
        const X = (mx / (a.length / 2)) * s + ox, Y = -(my / (a.length / 2)) * s + oy;
        marks.moveTo(X + 9, Y);
        marks.arc(X, Y, 9, 0, 2 * Math.PI);
      }
    };
    if (d.use && used.has(k)) pts(hot);
    else if (d.strong && !d.strong.has(k)) {
      // the core, behind what the group adds: left out at the deep levels, where it would cost the most and show the least
      if (level < 7) pts(faint);
    } else pts(shades[Math.min(2, Math.floor((3 * Math.log(rs.tiles[i])) / most))]);
  });
  ctx.strokeStyle = color('--muted');
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 0.7;
  ctx.stroke(faint);
  ctx.strokeStyle = color(d.strong ? '--danger' : '--accent');
  ctx.lineWidth = d.strong ? 1.8 : 0.9;
  shades.forEach((p, b) => {
    ctx.globalAlpha = (d.use ? 0.35 : 1) * (d.strong ? 1 : [0.35, 0.65, 1][b]);
    ctx.stroke(p);
  });
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.5;
  ctx.stroke(marks);
  ctx.globalAlpha = 1;
  if (d.use) {
    ctx.strokeStyle = color('--danger');
    ctx.lineWidth = 1.6;
    ctx.stroke(hot);
  }
  ctx.strokeStyle = color('--muted');
  ctx.lineWidth = 1;
  const outline = new Path2D();
  path(ring, outline);
  ctx.stroke(outline);
}

/** One drawing in the strip, with what its caption says and the type a click loads. */
interface Item {
  readonly key: string;
  readonly drawing: Drawing;
  readonly names: readonly HexType[] | null;
  readonly label: string;
  readonly count: string;
  readonly pick: HexType | null;
  readonly dim: boolean;
}

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
  const [adds, setAdds] = useState(false);
  const px = typeof window !== 'undefined' && window.innerWidth < 640 ? 200 : 260;
  const items = useMemo((): Item[] => {
    const routesOf = (t: HexType) => Array.from(g.cs.levels[level][t].crossings()).filter((k) => g.cs.levels[level][t].mate(k) > k).length;
    const dimOf = (gr: readonly HexType[]) => use !== null && !gr.some((t) => use.byType.has(t));
    // the group's types share one table, so a route counts as used when the circuit takes it in any of them
    const usedOf = (gr: readonly HexType[]) => new Set(gr.flatMap((t) => [...(use?.byType.get(t)?.keys() ?? [])])).size;
    const countOf = (gr: readonly HexType[]) => {
      const all = routesOf(gr[0]);
      if (!use) return plural(all, 'route');
      const used = usedOf(gr);
      return `uses ${used.toLocaleString('en-US')} of ${plural(all, 'route')} (${all ? Math.round((100 * used) / all) : 0}%)`;
    };
    if (!adds) {
      return groups.map((gr) => {
        return {
          key: gr.join(), drawing: { type: gr[0], strong: null, use, types: gr }, names: gr, label: `Routes of ${gr.join(', ')}`,
          count: countOf(gr), pick: gr[0], dim: dimOf(gr),
        };
      });
    }
    const core = coreRoutes(g.cs, level);
    const out: Item[] = [{
      key: 'core', drawing: { type: 'Delta', strong: null, only: new Set(core.map((r) => r[0])), use, types: CORE_TYPES as unknown as HexType[] }, names: null,
      label: 'Routes every type but Gamma shares', count: `Shared by every type but Gamma: ${plural(core.length, 'route')}`, pick: null, dim: false,
    }];
    for (const gr of groups) {
      if (!(CORE_TYPES as readonly string[]).includes(gr[0])) {
        out.push({
          key: gr.join(), drawing: { type: gr[0], strong: null, use, types: gr }, names: gr, label: `Routes of ${gr.join(', ')}`,
          count: `not in the shared routes: ${countOf(gr)}`, pick: gr[0], dim: dimOf(gr),
        });
        continue;
      }
      const extras = extraRoutes(g.cs, level, gr[0], core);
      out.push({
        key: gr.join(), drawing: { type: gr[0], strong: new Set(extras.map((r) => r[0])), use, types: gr }, names: gr,
        label: `What ${gr.join(', ')} adds to the shared routes`, count: extras.length ? `+${plural(extras.length, 'route')}, ringed` : 'nothing beyond the shared routes', pick: gr[0], dim: dimOf(gr),
      });
    }
    return out;
  }, [g, level, groups, use, adds]);
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  // one drawing per task, so the page stays responsive while a deep level is drawn
  useEffect(() => {
    let i = 0;
    let id = 0;
    const next = () => {
      const c = refs.current[i];
      if (c) draw(c, px, g, level, items[i].drawing);
      i++;
      if (i < items.length) id = window.setTimeout(next, 0);
    };
    id = window.setTimeout(next, 0);
    return () => clearTimeout(id);
  }, [g, level, items, px]);
  return (
    <section className="bu-groups-wrap">
      <div className="bu-toggle bu-groups-show" role="group" aria-label="Show">
        <button type="button" aria-pressed={!adds} className={!adds ? 'is-active' : ''} onClick={() => setAdds(false)} data-testid="bu-groups-whole">Whole tables</button>
        <button type="button" aria-pressed={adds} className={adds ? 'is-active' : ''} onClick={() => setAdds(true)} data-testid="bu-groups-adds">What each adds</button>
      </div>
      <div className="bu-groups" role="group" aria-label="Types with the same routes" data-testid="bu-groups">
        {items.map((it, i) => {
          const active = it.names?.includes(props.type) ?? false;
          const body = (
            <>
              <canvas ref={(el) => { refs.current[i] = el; }} style={{ width: px, height: px }} aria-label={it.label} />
              {it.names ? (
                <span className="bu-group-names">
                  {it.names.map((t) => <span key={t} className="bu-name" style={{ background: tileColor(t) }}>{t}</span>)}
                </span>
              ) : null}
              <span className="bu-group-count">{it.count}</span>
            </>
          );
          return it.pick ? (
            <button key={it.key} type="button" className={`bu-group${active ? ' is-active' : ''}${it.dim ? ' is-dim' : ''}`}
              onClick={() => props.onPick(active ? props.type : it.pick!)} data-testid="bu-group">{body}</button>
          ) : <div key={it.key} className="bu-group is-core" data-testid="bu-group-core">{body}</div>;
        })}
      </div>
    </section>
  );
}
