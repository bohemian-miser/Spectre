/**
 * A border table drawn: each route a curve between its two crossings, bent
 * toward the middle, fainter for fewer tiles. Small tables are SVG, one
 * element per route that can be pointed at and picked; big ones are a canvas
 * with the longest routes offered as a list to pick from.
 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Pt } from '../../core';
import type { Route } from './routes';

const nf = (n: number) => n.toLocaleString('en-US');
/** Tables with more routes and places than this are drawn on a canvas. */
const SVG_ITEMS = 1500;
/** Routes offered for picking under a canvas. */
const LONGEST = 5;

export const bounds = (xs: Iterable<number>): [number, number] => {
  let lo = Infinity, hi = -Infinity;
  for (const x of xs) { if (x < lo) lo = x; if (x > hi) hi = x; }
  return [lo, hi];
};

export interface FigureProps {
  readonly pts: readonly Pt[];
  /** Places drawn as crossings. */
  readonly dots: ArrayLike<number>;
  /** Places the figure is framed on, when not the drawn ones. */
  readonly frameOn?: ArrayLike<number>;
  /** Places drawn faint (places of the level the type does not have). */
  readonly faint?: ArrayLike<number>;
  readonly routes: readonly Route[];
  /** Routes drawn highlighted. */
  readonly own?: readonly Route[];
  readonly shade: (tiles: number) => number;
  /** Routes a circuit uses, by lower place, with their passes: drawn over the rest, which fade. */
  readonly uses?: ReadonlyMap<number, number> | null;
  /** The passes drawn thickest. */
  readonly maxUse?: number;
  /** The picked route's first place. */
  readonly picked?: number | null;
  readonly onPick?: (from: number, to: number) => void;
  readonly label: string;
  readonly head?: ReactNode;
  readonly caption: ReactNode;
  readonly className?: string;
}

/** Stroke width of a used route: 1 to 4.5, by log passes. */
const useWidth = (passes: number, max: number) => 1 + (3.5 * Math.log(passes)) / Math.log(Math.max(2, max));

const curve = (p: Pt, q: Pt, cx: number, cy: number) => {
  const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
  return { qx: mx + (cx - mx) * 0.55, qy: my + (cy - my) * 0.55 };
};

function Canvas(props: FigureProps & { frame: { cx: number; cy: number; size: number } }): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { pts, routes, own, faint, shade, picked, frame, uses, maxUse } = props;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const px = 600;
    c.width = px;
    c.height = px;
    const g = c.getContext('2d')!;
    const css = getComputedStyle(c);
    const color = (v: string, d: string) => css.getPropertyValue(v).trim() || d;
    const { cx, cy, size } = frame;
    const X = (x: number) => ((x - cx) / size + 0.5) * px, Y = (y: number) => ((cy - y) / size + 0.5) * px;
    const draw = (r: Route) => {
      const p = pts[r[0]], q = pts[r[1]];
      const { qx, qy } = curve(p, q, cx, cy);
      g.beginPath();
      g.moveTo(X(p.x), Y(p.y));
      g.quadraticCurveTo(X(qx), Y(qy), X(q.x), Y(q.y));
      g.stroke();
    };
    g.clearRect(0, 0, px, px);
    g.strokeStyle = color('--accent', '#2f7d6d');
    g.lineWidth = 1;
    for (const r of routes) {
      g.globalAlpha = uses ? 0.08 : shade(r[2]);
      draw(r);
    }
    g.globalAlpha = 1;
    if (faint) {
      g.fillStyle = color('--muted', '#888');
      g.globalAlpha = 0.5;
      for (let i = 0; i < faint.length; i++) g.fillRect(X(pts[faint[i]].x) - 1, Y(pts[faint[i]].y) - 1, 2, 2);
      g.globalAlpha = 1;
    }
    g.strokeStyle = color('--warn', '#b7791f');
    g.lineWidth = 2.5;
    for (const r of own ?? []) draw(r);
    if (uses) {
      g.strokeStyle = color('--danger', '#c0392b');
      for (const r of [...routes, ...(own ?? [])]) {
        const u = uses.get(r[0]);
        if (!u) continue;
        g.lineWidth = useWidth(u, maxUse ?? u) * 1.3;
        draw(r);
      }
    }
    const hit = picked == null ? undefined : [...(own ?? []), ...routes].find((r) => r[0] === picked || r[1] === picked);
    if (hit) {
      g.strokeStyle = color('--text', '#000');
      g.lineWidth = 3.5;
      draw(hit);
    }
  }, [pts, routes, own, faint, shade, picked, frame, uses, maxUse]);
  return <canvas ref={ref} className="bu-canvas" aria-label={`${props.label}, drawn as an image`} />;
}

export function TableFigure(props: FigureProps): JSX.Element {
  const { pts, dots, faint, routes, own, shade, picked, onPick, uses, maxUse } = props;
  const frame = useMemo(() => {
    const all = props.frameOn ? Array.from(props.frameOn) : [...Array.from(dots), ...Array.from(faint ?? [])];
    const [minX, maxX] = bounds(all.map((k) => pts[k].x)), [minY, maxY] = bounds(all.map((k) => pts[k].y));
    const span = Math.max(maxX - minX, maxY - minY) || 1;
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, size: span * 1.16, span };
  }, [pts, dots, faint, props.frameOn]);
  const { cx, cy, size, span } = frame;
  const big = routes.length + (own?.length ?? 0) + (faint?.length ?? 0) > SVG_ITEMS;
  const longest = useMemo(() => (big ? [...(own ?? []), ...routes].sort((a, b) => b[2] - a[2]).slice(0, LONGEST) : []), [big, routes, own]);
  const path = (r: Route, cls: string, i: number) => {
    const p = pts[r[0]], q = pts[r[1]];
    const { qx, qy } = curve(p, q, cx, cy);
    const isPicked = picked != null && (r[0] === picked || r[1] === picked);
    const used = uses?.get(r[0]);
    if (cls === 'bu-used' && !used) return null;
    return (
      <path
        key={`${cls}${i}`}
        d={`M${p.x} ${-p.y} Q${qx} ${-qy} ${q.x} ${-q.y}`}
        className={`${cls}${isPicked ? ' is-picked' : ''}${onPick ? ' is-pickable' : ''}`}
        strokeOpacity={cls === 'bu-route' && !isPicked ? (uses ? 0.12 : shade(r[2])) : undefined}
        strokeWidth={cls === 'bu-used' && used ? useWidth(used, maxUse ?? used) : undefined}
        vectorEffect="non-scaling-stroke"
        onClick={onPick ? () => onPick(r[0], r[1]) : undefined}
      >
        <title>{`Crossing ${r[0]} to crossing ${r[1]}: ${nf(r[2])} tiles${used ? `, passed ${nf(used)} times` : ''}`}</title>
      </path>
    );
  };
  const r = span * 0.008 + 0.02;
  return (
    <figure className={`bu-table${props.className ? ` ${props.className}` : ''}`} data-testid="bu-table">
      {props.head}
      {big ? <Canvas {...props} frame={frame} /> : (
        <svg viewBox={`${cx - size / 2} ${-cy - size / 2} ${size} ${size}`} role="img" aria-label={props.label}>
          {routes.map((x, i) => path(x, 'bu-route', i))}
          {(own ?? []).map((x, i) => path(x, 'bu-own', i))}
          {uses && [...routes, ...(own ?? [])].map((x, i) => path(x, 'bu-used', i))}
          {Array.from(faint ?? [], (k) => <circle key={`f${k}`} cx={pts[k].x} cy={-pts[k].y} r={r} className="bu-absent" vectorEffect="non-scaling-stroke" />)}
          {Array.from(dots, (k) => <circle key={k} cx={pts[k].x} cy={-pts[k].y} r={r} className="bu-crossing" />)}
        </svg>
      )}
      <figcaption>{props.caption}</figcaption>
      {big && onPick && longest.length > 0 && (
        <div className="bu-longest" data-testid="bu-longest">
          <span>Longest:</span>
          {longest.map((x) => (
            <button key={x[0]} type="button" className={picked === x[0] || picked === x[1] ? 'is-active' : ''} onClick={() => onPick(x[0], x[1])}>
              {nf(x[2])}
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
