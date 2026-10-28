/**
 * The Corners page's figures, drawn as SVG from computed objects: a circuit's
 * outline with polygons over it, the walk-round curves, fit error against
 * sides, side lengths, symmetry shares and the Fourier spectrum.
 */

import { useRef, useState, type ReactNode } from 'react';
import type { ChordCurve, Loop, Spectrum } from './measure';

export interface Frame {
  readonly w: number;
  readonly h: number;
  X(x: number): number;
  Y(y: number): number;
}

/** World to a 1000-unit square, y up, centred. */
export function frameOf(loop: Loop): Frame {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < loop.n; i++) {
    x0 = Math.min(x0, loop.xy[2 * i]);
    x1 = Math.max(x1, loop.xy[2 * i]);
    y0 = Math.min(y0, loop.xy[2 * i + 1]);
    y1 = Math.max(y1, loop.xy[2 * i + 1]);
  }
  const s = 1000 / Math.max(x1 - x0, y1 - y0, 1e-9);
  const ox = (1000 - (x1 - x0) * s) / 2;
  const oy = (1000 - (y1 - y0) * s) / 2;
  return { w: 1000, h: 1000, X: (x) => ox + (x - x0) * s, Y: (y) => oy + (y1 - y) * s };
}

export function loopPath(loop: Loop, f: Frame, max = 3000): string {
  const step = Math.max(1, Math.ceil(loop.n / max));
  let d = '';
  for (let i = 0; i < loop.n; i += step) d += `${i ? 'L' : 'M'}${f.X(loop.xy[2 * i]).toFixed(1)} ${f.Y(loop.xy[2 * i + 1]).toFixed(1)}`;
  return `${d}Z`;
}

export interface Overlay {
  readonly key: string;
  readonly pts: readonly { x: number; y: number }[];
  readonly color: string;
  readonly width?: number;
}

export function OutlineView(props: { loop: Loop; overlays: readonly Overlay[]; label: string; testId?: string }): JSX.Element {
  const { loop, overlays, label } = props;
  const f = frameOf(loop);
  return (
    <svg viewBox="-40 -40 1080 1080" role="img" aria-label={label} data-testid={props.testId}>
      <path d={loopPath(loop, f)} fill="none" stroke="var(--muted)" strokeOpacity={0.7} strokeWidth={2} strokeLinejoin="round" />
      {overlays.map((o) => (
        <g key={o.key}>
          <polygon
            points={o.pts.map((p) => `${f.X(p.x).toFixed(1)},${f.Y(p.y).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={o.color}
            strokeWidth={o.width ?? 4.5}
            strokeLinejoin="round"
          />
          {o.pts.map((p, j) => (
            <circle key={j} cx={f.X(p.x)} cy={f.Y(p.y)} r={j === 0 ? 14 : 9} fill={o.color} stroke="var(--canvas-bg)" strokeWidth={3} />
          ))}
        </g>
      ))}
    </svg>
  );
}

const fmt = (v: number, d = 3) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}`;

function niceStep(x: number): number {
  const p = 10 ** Math.floor(Math.log10(x));
  const r = x / p;
  return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * p;
}

/** Push labels apart vertically, keeping them inside [lo, hi]. */
function spread<T extends { y: number }>(items: T[], gap: number, lo: number, hi: number): T[] {
  items.sort((a, b) => a.y - b.y);
  for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < gap) items[i].y = items[i - 1].y + gap;
  const over = items.length ? items[items.length - 1].y - hi : 0;
  if (over > 0) {
    for (const it of items) it.y -= over;
    for (let i = items.length - 2; i >= 0; i--) if (items[i + 1].y - items[i].y < gap) items[i].y = items[i + 1].y - gap;
  }
  for (const it of items) it.y = Math.max(lo, it.y);
  return items;
}

function Tip(props: { at: { x: number; y: number } | null; children: ReactNode }): JSX.Element | null {
  if (!props.at) return null;
  return (
    <div className="corners-tip" style={{ left: props.at.x, top: props.at.y }}>
      {props.children}
    </div>
  );
}

/** Mean distance to the chords against the start sample, one line per corner count. */
export function WalkChart(props: {
  curves: readonly ChordCurve[];
  n: number;
  /** Tiles in the circuit (samples are evenly spaced over them). */
  tiles: number;
  colorOf: (k: number) => string;
  signed: boolean;
  onHover: (startIndex: number | null) => void;
}): JSX.Element {
  const { curves, n, tiles, colorOf, signed, onHover } = props;
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ at: { x: number; y: number }; i: number } | null>(null);
  const W = 720;
  const H = 360;
  const m = { l: 52, r: 36, t: 12, b: 40 };
  const key = signed ? 'signed' : 'unsigned';
  let lo = 0;
  let hi = 0;
  for (const c of curves) for (const v of c[key]) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  if (hi === lo) hi = lo + 0.1;
  const step = niceStep((hi - lo) / 5);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const X = (s: number) => m.l + (s / n) * (W - m.l - m.r);
  const Y = (v: number) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
  const starts = curves[0]?.starts ?? [];
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  const labels = spread(
    curves.map((c) => ({ k: c.k, y: Y(c[key][c[key].length - 1]) })),
    13,
    m.t + 4,
    H - m.b,
  );
  const move = (e: React.PointerEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement!;
    const r = svg.getBoundingClientRect();
    const s = ((((e.clientX - r.left) / r.width) * W - m.l) / (W - m.l - m.r)) * n;
    const i = Math.max(0, Math.min(starts.length - 1, Math.round((s / n) * starts.length)));
    const br = box.current!.getBoundingClientRect();
    let x = e.clientX - br.left + 14;
    if (x + 150 > br.width) x = e.clientX - br.left - 160;
    setTip({ at: { x, y: Math.max(0, e.clientY - br.top - 30 - 15 * curves.length) }, i });
    onHover(i);
  };
  return (
    <div className="corners-fig" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Distance to the chords against the start" data-testid="corners-walk">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} stroke={Math.abs(v) < step / 2 ? 'var(--muted)' : 'var(--grid)'} />
            <text x={m.l - 7} y={Y(v) + 3.5} textAnchor="end" className="tick">
              {fmt(v, step < 0.01 ? 3 : 2)}
            </text>
          </g>
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((j) => (
          <g key={j}>
            <line x1={X((j * n) / 6)} x2={X((j * n) / 6)} y1={m.t} y2={H - m.b} stroke="var(--grid)" />
            <text x={X((j * n) / 6)} y={H - m.b + 15} textAnchor="middle" className="tick">
              {j === 0 ? '0' : j === 6 ? 'L' : `${j}L/6`}
            </text>
          </g>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 4} textAnchor="middle">
          first corner’s tile
        </text>
        <text x={12} y={(m.t + H - m.b) / 2} textAnchor="middle" transform={`rotate(-90 12 ${(m.t + H - m.b) / 2})`}>
          {signed ? 'mean signed distance ÷ Rg' : 'mean distance ÷ Rg'}
        </text>
        {curves.map((c) => (
          <path
            key={c.k}
            d={c[key].reduce((d, v, i) => `${d}${i ? 'L' : 'M'}${X(starts[i]).toFixed(1)} ${Y(v).toFixed(1)}`, '')}
            fill="none"
            stroke={colorOf(c.k)}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
        {curves.map((c) => (
          <g key={c.k}>
            <circle cx={X(starts[c.best])} cy={Y(c[key][c.best])} r={4.5} fill={colorOf(c.k)} stroke="var(--panel)" strokeWidth={2} />
            <circle cx={X(starts[c.worst])} cy={Y(c[key][c.worst])} r={4.5} fill="var(--panel)" stroke={colorOf(c.k)} strokeWidth={2} />
          </g>
        ))}
        {labels.map((l) => (
          <text key={l.k} x={W - m.r + 6} y={l.y + 4} className="label-strong">
            {l.k}
          </text>
        ))}
        {tip && <line x1={X(starts[tip.i])} x2={X(starts[tip.i])} y1={m.t} y2={H - m.b} stroke="var(--text)" strokeDasharray="3 3" />}
        <rect
          x={m.l}
          y={m.t}
          width={W - m.l - m.r}
          height={H - m.t - m.b}
          fill="transparent"
          onPointerMove={move}
          onPointerDown={move}
          onPointerLeave={() => {
            setTip(null);
            onHover(null);
          }}
        />
      </svg>
      <Tip at={tip?.at ?? null}>
        {tip && [`tile ${Math.round((starts[tip.i] * tiles) / n).toLocaleString('en-US')} of ${tiles.toLocaleString('en-US')}`, ...curves.map((c) => `${String(c.k).padStart(2)}  ${fmt(c[key][tip.i], 4)}`)].join('\n')}
      </Tip>
    </div>
  );
}

export interface ErrorSeries {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly points: readonly { readonly k: number; readonly v: number }[];
  readonly dashed?: boolean;
}

/** Fit error against number of sides; the chosen count marked, any count clickable. */
export function ErrorChart(props: { series: readonly ErrorSeries[]; chosen: number | null; picked: number; onPick: (k: number) => void; kMin: number; kMax: number }): JSX.Element {
  const { series, chosen, picked, onPick, kMin, kMax } = props;
  const W = 620;
  const H = 300;
  const m = { l: 52, r: 120, t: 12, b: 40 };
  let hi = 0;
  for (const s of series) for (const p of s.points) if (Number.isFinite(p.v)) hi = Math.max(hi, p.v);
  const step = niceStep(Math.max(hi, 0.05) / 5);
  hi = Math.ceil(Math.max(hi, 0.05) / step) * step;
  const X = (k: number) => m.l + ((k - kMin) / (kMax - kMin)) * (W - m.l - m.r);
  const Y = (v: number) => m.t + (1 - v / hi) * (H - m.t - m.b);
  const ticks: number[] = [];
  for (let v = 0; v <= hi + step / 2; v += step) ticks.push(v);
  const ks = Array.from({ length: kMax - kMin + 1 }, (_, i) => kMin + i);
  const labels = spread(
    series.filter((s) => s.points.length).map((s) => ({ id: s.id, text: s.label, y: Y(s.points[s.points.length - 1].v), color: s.color })),
    13,
    m.t + 4,
    H - m.b,
  );
  return (
    <div className="corners-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Fit error against number of sides" data-testid="corners-error">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} stroke="var(--grid)" />
            <text x={m.l - 7} y={Y(v) + 3.5} textAnchor="end" className="tick">
              {v.toFixed(step < 0.01 ? 3 : 2)}
            </text>
          </g>
        ))}
        {ks.map((k) => (
          <g key={k} onClick={() => onPick(k)} style={{ cursor: 'pointer' }}>
            <rect x={X(k) - 12} y={m.t} width={24} height={H - m.t - m.b} fill={k === picked ? 'var(--panel-2)' : 'transparent'} />
            <text x={X(k)} y={H - m.b + 15} textAnchor="middle" className={k % 3 === 0 ? 'tick label-strong' : 'tick'}>
              {k}
            </text>
          </g>
        ))}
        {chosen !== null && <line x1={X(chosen)} x2={X(chosen)} y1={m.t} y2={H - m.b} stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" />}
        <text x={(m.l + W - m.r) / 2} y={H - 4} textAnchor="middle">
          sides
        </text>
        <text x={12} y={(m.t + H - m.b) / 2} textAnchor="middle" transform={`rotate(-90 12 ${(m.t + H - m.b) / 2})`}>
          rms distance ÷ Rg
        </text>
        {series.map((s) => (
          <g key={s.id}>
            <path
              d={s.points.reduce((d, p, i) => `${d}${i ? 'L' : 'M'}${X(p.k).toFixed(1)} ${Y(p.v).toFixed(1)}`, '')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '5 4' : undefined}
            />
            {s.points.map((p) => (
              <circle key={p.k} cx={X(p.k)} cy={Y(p.v)} r={p.k === picked ? 6 : 4} fill={s.color} stroke="var(--panel)" strokeWidth={1.5} pointerEvents="none">
                <title>{`${s.label}, ${p.k} sides: ${p.v.toFixed(4)}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {labels.map((l) => (
          <text key={l.id} x={W - m.r + 8} y={l.y + 4} className="label-strong">
            {l.text}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Each side's length as a bar, in order round the loop. */
export function SidesBars(props: { sides: readonly number[] }): JSX.Element {
  const max = Math.max(...props.sides, 1e-9);
  const total = props.sides.reduce((a, b) => a + b, 0);
  return (
    <div className="corners-sides" role="img" aria-label="Side lengths in order round the loop" data-testid="corners-sides">
      {props.sides.map((s, i) => (
        <div key={i} style={{ height: `${(s / max) * 100}%` }} title={`side ${i + 1}: ${((s / total) * 100).toFixed(1)}% of the perimeter`} />
      ))}
    </div>
  );
}

/** Share beyond the circle on the harmonics f = 1 (mod m), for each m. */
export function SymmetryBars(props: { shares: readonly { m: number; share: number }[] }): JSX.Element {
  const W = 520;
  const H = 220;
  const m = { l: 40, r: 10, t: 16, b: 34 };
  const bw = (W - m.l - m.r) / props.shares.length;
  const Y = (v: number) => m.t + (1 - v) * (H - m.t - m.b);
  return (
    <div className="corners-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Symmetry shares by number of turns" data-testid="corners-symmetry">
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} stroke="var(--grid)" />
            <text x={m.l - 6} y={Y(v) + 3.5} textAnchor="end" className="tick">
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        {props.shares.map((s, i) => {
          const x = m.l + i * bw;
          return (
            <g key={s.m}>
              <rect x={x + 3} y={Y(s.share)} width={bw - 6} height={Y(0) - Y(s.share)} rx={3} fill={s.share > 0.999 ? 'var(--accent)' : 'var(--muted)'} fillOpacity={s.share > 0.999 ? 1 : 0.55}>
                <title>{`${s.m}-fold: ${(s.share * 100).toFixed(2)}%`}</title>
              </rect>
              <text x={x + bw / 2} y={Y(s.share) - 4} textAnchor="middle" className="tick">
                {s.share > 0.995 ? '1' : s.share.toFixed(2)}
              </text>
              <text x={x + bw / 2} y={H - m.b + 15} textAnchor="middle" className="tick label-strong">
                {s.m}
              </text>
            </g>
          );
        })}
        <text x={(m.l + W - m.r) / 2} y={H - 3} textAnchor="middle">
          turns m (harmonics f = 1 mod m)
        </text>
      </svg>
    </div>
  );
}

/** |c_f| ÷ |c_1| on a log scale for f in [−F, F]; the harmonics a third of a turn allows in the accent colour. */
export function SpectrumChart(props: { spectrum: Spectrum; F: number }): JSX.Element {
  const { spectrum: s, F } = props;
  const W = 720;
  const H = 240;
  const m = { l: 44, r: 10, t: 10, b: 36 };
  const amp = (f: number) => {
    const i = ((f % s.n) + s.n) % s.n;
    return Math.hypot(s.re[i], s.im[i]);
  };
  const a1 = amp(1) || 1;
  const decades = 5;
  const Y = (r: number) => {
    const l = Math.max(-decades, Math.log10(Math.max(r, 1e-12)));
    return m.t + (-l / decades) * (H - m.t - m.b);
  };
  const X = (f: number) => m.l + ((f + F) / (2 * F)) * (W - m.l - m.r);
  const bars = [];
  for (let f = -F; f <= F; f++) {
    if (f === 0) continue;
    const r = amp(f) / a1;
    const third = (((f - 1) % 3) + 3) % 3 === 0;
    bars.push(
      <line key={f} x1={X(f)} x2={X(f)} y1={Y(10 ** -decades)} y2={Y(r)} stroke={third ? 'var(--accent)' : 'var(--muted)'} strokeWidth={third ? 2.4 : 1.6} strokeLinecap="round">
        <title>{`f = ${f}: ${r.toExponential(2)} of the circle`}</title>
      </line>,
    );
  }
  return (
    <div className="corners-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Fourier amplitudes by harmonic" data-testid="corners-spectrum">
        {Array.from({ length: decades + 1 }, (_, d) => (
          <g key={d}>
            <line x1={m.l} x2={W - m.r} y1={Y(10 ** -d)} y2={Y(10 ** -d)} stroke="var(--grid)" />
            <text x={m.l - 6} y={Y(10 ** -d) + 3.5} textAnchor="end" className="tick">
              {d === 0 ? '1' : `1e−${d}`}
            </text>
          </g>
        ))}
        {bars}
        {[-F, -F / 2, 0, F / 2, F].map((f) => (
          <text key={f} x={X(f)} y={H - m.b + 15} textAnchor="middle" className="tick">
            {f}
          </text>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 3} textAnchor="middle">
          harmonic f (turns per loop)
        </text>
      </svg>
    </div>
  );
}

export { fmt };
