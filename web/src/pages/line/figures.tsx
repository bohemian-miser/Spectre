/**
 * The page's still figures, drawn as SVG from computed objects: a patch of
 * tiles with its strands (`strand.ts`).
 */
import type { ReactNode } from 'react';
import { tileColor } from '../../lib/palette';
import type { Pt } from '../../core';
import type { Patch } from './strand';

const d = (pts: readonly Pt[], close = false): string =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(3)} ${(-p.y).toFixed(3)}`).join('') + (close ? 'Z' : '');

function frame(pts: Iterable<Pt>, pad = 0.04): string {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, -p.y); y1 = Math.max(y1, -p.y);
  }
  const m = pad * Math.max(x1 - x0, y1 - y0);
  return `${x0 - m} ${y0 - m} ${x1 - x0 + 2 * m} ${y1 - y0 + 2 * m}`;
}

/** A colour along a strand, from one end (t = 0) to the other (t = 1). */
export const along = (t: number): string => `hsl(${Math.round(250 - 230 * t)} 80% 50%)`;

function Svg(props: { box: string; label: string; className?: string; children: ReactNode }): JSX.Element {
  return (
    <svg viewBox={props.box} role="img" aria-label={props.label} className={props.className ?? 'ln-svg'} preserveAspectRatio="xMidYMid meet">
      {props.children}
    </svg>
  );
}

/** A patch's tiles, and each chord coloured by `colour` (null: drawn faint). */
export function PatchFigure(props: {
  patch: Patch;
  label: string;
  colour: (chord: number) => string | null;
  fill?: (tile: number) => string;
  dots?: readonly { p: Pt; text?: string }[];
  width?: number;
  className?: string;
}): JSX.Element {
  const { patch } = props;
  const all = patch.tiles.flatMap((t) => t.outline);
  const fill = props.fill ?? ((i: number) => tileColor(patch.tiles[i].type));
  const many = patch.tiles.length > 500;
  const w = props.width ?? (many ? 0.6 : 1.4);
  const span = Math.sqrt(patch.tiles.length);
  return (
    <Svg box={frame(all)} label={props.label} className={props.className}>
      <g className="ln-tiles">
        {patch.tiles.map((t, i) => (
          <path key={i} d={d(t.outline, true)} fill={fill(i)} className="ln-tile" vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g strokeLinecap="round">
        {patch.chords.map((c, i) => {
          const col = props.colour(i);
          return (
            <line
              key={i}
              x1={c.a.x} y1={-c.a.y} x2={c.b.x} y2={-c.b.y}
              stroke={col ?? 'var(--muted)'}
              strokeOpacity={col ? 1 : 0.55}
              strokeWidth={col ? w * 1.6 : w}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
      {props.dots?.map((x, i) => (
        <g key={i}>
          <circle cx={x.p.x} cy={-x.p.y} r={0.12 * Math.max(1, span / 3)} className="ln-dot" />
          {x.text !== undefined && (
            <text x={x.p.x} y={-x.p.y} dy={-0.25 * Math.max(1, span / 3)} fontSize={0.5 * Math.max(1, span / 3)} className="ln-num" textAnchor="middle">{x.text}</text>
          )}
        </g>
      ))}
    </Svg>
  );
}

/** A patch's strands coloured from one end to the other, each chord by its place along its strand. */
export function alongColours(patch: Patch): (chord: number) => string {
  const at = new Map<number, string>();
  for (const s of patch.strands) s.chords.forEach(({ chord }, i) => at.set(chord, along(s.chords.length > 1 ? i / (s.chords.length - 1) : 0.5)));
  return (c) => at.get(c) ?? 'var(--muted)';
}

/** The ends of a patch's open strands, matched to the crossings of a border in order; the route index each strand is. */
export function routeIndexOf(patch: Patch, dots: readonly Pt[], routes: readonly (readonly [number, number])[]): Map<number, number> {
  const near = (p: Pt): number => {
    let best = 0, bd = Infinity;
    dots.forEach((q, i) => {
      const e = Math.hypot(p.x - q.x, p.y - q.y);
      if (e < bd) { bd = e; best = i; }
    });
    return best;
  };
  const out = new Map<number, number>();
  patch.strands.forEach((s) => {
    if (s.closed) return;
    const lo = Math.min(near(s.ends[0]), near(s.ends[1]));
    const r = routes.findIndex(([p]) => p === lo);
    for (const { chord } of s.chords) out.set(chord, r);
  });
  return out;
}
