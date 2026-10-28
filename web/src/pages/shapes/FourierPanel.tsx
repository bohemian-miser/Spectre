/**
 * The Shapes page's Fourier views of one circuit: its terms (sizes and
 * phases, turned and restarted to a fixed position), the circuit rebuilt from
 * its first N terms over the original, its epicycles, and, against a second
 * circuit, the gap split by harmonic. All from the terms `descriptor.ts`
 * computes.
 */

import { useMemo, useState } from 'react';
import { Epicycles } from '../corners/Epicycles';
import { spectrum, type Loop } from '../corners/measure';
import { aligned, canonical, outline, termAt, termGaps, truncated, type Alignment, type Terms } from './descriptor';

const third = (f: number) => (((f - 1) % 3) + 3) % 3 === 0;

/** Sizes on a log scale and phases, f = -F..F. */
export function TermsChart(props: { terms: Terms; testId?: string }): JSX.Element {
  const t = canonical(props.terms);
  const F = t.F;
  const W = 720;
  const H = 250;
  const m = { l: 44, r: 10, t: 10, b: 30 };
  const split = 150;
  const decades = 4;
  const X = (f: number) => m.l + ((f + F) / (2 * F)) * (W - m.l - m.r);
  const Y = (r: number) => m.t + (-Math.max(-decades, Math.log10(Math.max(r, 1e-12))) / decades) * (split - m.t);
  const P = (ph: number) => split + 14 + ((Math.PI - ph) / (2 * Math.PI)) * (H - m.b - split - 14);
  const fs = Array.from({ length: 2 * F + 1 }, (_, i) => i - F).filter((f) => f !== 0);
  return (
    <svg className="shapes-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Fourier terms: sizes and phases" data-testid={props.testId}>
      {Array.from({ length: decades + 1 }, (_, d) => (
        <g key={d}>
          <line x1={m.l} x2={W - m.r} y1={Y(10 ** -d)} y2={Y(10 ** -d)} stroke="var(--line)" />
          <text x={m.l - 6} y={Y(10 ** -d) + 3.5} textAnchor="end">
            {d === 0 ? '1' : `1e−${d}`}
          </text>
        </g>
      ))}
      {[-Math.PI, 0, Math.PI].map((ph, i) => (
        <g key={i}>
          <line x1={m.l} x2={W - m.r} y1={P(ph)} y2={P(ph)} stroke="var(--line)" strokeDasharray={ph === 0 ? undefined : '2 3'} />
          <text x={m.l - 6} y={P(ph) + 3.5} textAnchor="end">
            {ph === 0 ? '0' : ph > 0 ? 'π' : '−π'}
          </text>
        </g>
      ))}
      {fs.map((f) => {
        const { re, im } = termAt(t, f);
        const r = Math.hypot(re, im);
        const on = third(f);
        return (
          <g key={f}>
            <line x1={X(f)} x2={X(f)} y1={Y(10 ** -decades)} y2={Y(r)} stroke={on ? 'var(--accent)' : 'var(--muted)'} strokeWidth={on ? 2.4 : 1.4} strokeLinecap="round">
              <title>{`f = ${f}: size ${r.toExponential(2)}, phase ${(Math.atan2(im, re) / Math.PI).toFixed(3)}π`}</title>
            </line>
            {r > 1e-4 && <circle cx={X(f)} cy={P(Math.atan2(im, re))} r={1.5 + 2.5 * Math.min(1, Math.sqrt(r) * 2)} fill={on ? 'var(--accent)' : 'var(--muted)'} />}
          </g>
        );
      })}
      {[-F, -F / 2, 0, F / 2, F].map((f) => (
        <text key={f} x={X(f)} y={H - m.b + 14} textAnchor="middle">
          {Math.round(f)}
        </text>
      ))}
      <text x={(m.l + W - m.r) / 2} y={H - 2} textAnchor="middle">
        harmonic f (turns per lap): size above, phase below (dot size follows the size)
      </text>
    </svg>
  );
}

function path(pts: Float64Array, k: number): string {
  let d = '';
  for (let i = 0; i < pts.length; i += 2) d += `${i ? 'L' : 'M'}${(pts[i] * k).toFixed(1)} ${(-pts[i + 1] * k).toFixed(1)}`;
  return `${d}Z`;
}

function reach(pts: Float64Array): number {
  let r = 0;
  for (let i = 0; i < pts.length; i++) r = Math.max(r, Math.abs(pts[i]));
  return r || 1;
}

/** The circuit rebuilt from N of its terms, over its own tiles. */
export function Rebuild(props: { terms: Terms; shape: Float64Array }): JSX.Element {
  const { terms, shape } = props;
  const total = 2 * terms.F;
  const [count, setCount] = useState(6);
  const [order, setOrder] = useState<'lowest' | 'largest'>('largest');
  const kept = useMemo(() => truncated(terms, Math.min(count, total), order), [terms, count, order, total]);
  const drawn = useMemo(() => outline(kept, 720), [kept]);
  let energy = 0;
  for (let i = 0; i < kept.c.length; i++) energy += kept.c[i] * kept.c[i];
  const size = 320;
  const k = (size * 0.46) / Math.max(reach(shape), reach(drawn));
  return (
    <div className="shapes-panel">
      <svg className="shapes-overlay" viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} role="img" aria-label={`The circuit rebuilt from ${count} terms`} data-testid="shapes-rebuild">
        <path d={path(shape, k)} fill="none" stroke="var(--muted)" strokeOpacity={0.6} strokeWidth={1} strokeLinejoin="round" />
        <path d={path(drawn, k)} fill="none" stroke="var(--g1)" strokeWidth={1.8} strokeLinejoin="round" />
      </svg>
      <div className="shapes-controls">
        <label>
          Terms kept: {Math.min(count, total)}
          <input type="range" min={1} max={total} value={Math.min(count, total)} onChange={(e) => setCount(Number(e.target.value))} data-testid="shapes-rebuild-count" />
        </label>
        <label>
          Order
          <select value={order} onChange={(e) => setOrder(e.target.value as 'lowest' | 'largest')}>
            <option value="largest">largest first</option>
            <option value="lowest">lowest |f| first</option>
          </select>
        </label>
      </div>
      <p className="shapes-note" data-testid="shapes-rebuild-left">
        rms distance left to the circuit: {Math.sqrt(Math.max(0, 1 - energy)).toFixed(3)} radii of gyration (the size of every term left out, the ones beyond
        |f| = {terms.F} included).
      </p>
    </div>
  );
}

/** Epicycles of a loop given in radii of gyration about its centroid. */
export function EpicyclesOf(props: { loop: Loop }): JSX.Element {
  const s = useMemo(() => spectrum(props.loop), [props.loop]);
  return <Epicycles loop={props.loop} spectrum={s} />;
}

/** A loop from terms, for drawing a mean shape as epicycles. */
export function loopFromTerms(t: Terms, n = 720): Loop {
  return { xy: outline(t, n), n };
}

/** The squared gap between two circuits, harmonic by harmonic, and how it builds up with |f|. */
export function TermGaps(props: { a: Terms; b: Terms; al: Alignment }): JSX.Element {
  const { a, b, al } = props;
  const parts = useMemo(() => termGaps(a, aligned(b, al)), [a, b, al]);
  const F = a.F;
  const W = 720;
  const H = 230;
  const m = { l: 48, r: 10, t: 12, b: 30 };
  const top = Math.max(...parts, 1e-12);
  const X = (f: number) => m.l + ((f + F) / (2 * F)) * (W - m.l - m.r);
  const Y = (v: number) => m.t + (1 - v / top) * (H - m.t - m.b);
  // Gap using |f| <= k, for each k.
  const cum: { k: number; g: number }[] = [];
  let acc = 0;
  for (let k = 1; k <= F; k++) {
    acc += parts[k + F] + parts[-k + F];
    cum.push({ k, g: Math.sqrt(acc) });
  }
  const total = Math.sqrt(acc);
  const worst = Array.from({ length: 2 * F + 1 }, (_, i) => i - F)
    .filter((f) => f !== 0)
    .sort((x, y) => parts[y + F] - parts[x + F])
    .slice(0, 4);
  return (
    <div className="shapes-panel">
      <svg className="shapes-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Squared gap by harmonic" data-testid="shapes-termgaps">
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={Y(v * top)} y2={Y(v * top)} stroke="var(--line)" />
            <text x={m.l - 6} y={Y(v * top) + 3.5} textAnchor="end">
              {(v * top).toExponential(1)}
            </text>
          </g>
        ))}
        {Array.from({ length: 2 * F + 1 }, (_, i) => i - F)
          .filter((f) => f !== 0)
          .map((f) => (
            <line key={f} x1={X(f)} x2={X(f)} y1={Y(0)} y2={Y(parts[f + F])} stroke={third(f) ? 'var(--accent)' : 'var(--muted)'} strokeWidth={2.2} strokeLinecap="round">
              <title>{`f = ${f}: ${parts[f + F].toExponential(2)} of the squared gap`}</title>
            </line>
          ))}
        {[-F, -F / 2, 0, F / 2, F].map((f) => (
          <text key={f} x={X(f)} y={H - m.b + 14} textAnchor="middle">
            {Math.round(f)}
          </text>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 2} textAnchor="middle">
          harmonic f: its part of the squared gap
        </text>
      </svg>
      <p className="shapes-note" data-testid="shapes-termgaps-note">
        Gap over these terms {total.toFixed(3)}; using |f| ≤ 3, 10, 20: {[3, 10, 20].filter((k) => k <= F).map((k) => cum[k - 1].g.toFixed(3)).join(', ')}. Largest
        parts: {worst.map((f) => `f = ${f} (${((parts[f + F] / (acc || 1)) * 100).toFixed(0)}%)`).join(', ')}.
      </p>
    </div>
  );
}

/** How strongly each harmonic's size separates the groups (between-group over within-group variance). */
export function SeparationChart(props: { scores: Float64Array; F: number }): JSX.Element {
  const { scores, F } = props;
  const W = 720;
  const H = 210;
  const m = { l: 48, r: 10, t: 12, b: 30 };
  const finite = [...scores].filter((v) => Number.isFinite(v));
  const top = Math.max(...finite, 1);
  const lt = Math.log10(top + 1);
  const X = (f: number) => m.l + ((f + F) / (2 * F)) * (W - m.l - m.r);
  const Y = (v: number) => m.t + (1 - Math.log10(Math.min(v, top) + 1) / lt) * (H - m.t - m.b);
  const best = Array.from({ length: 2 * F + 1 }, (_, i) => i - F)
    .filter((f) => f !== 0 && f !== 1)
    .sort((a, b) => scores[b + F] - scores[a + F])
    .slice(0, 5);
  return (
    <div className="shapes-panel">
      <svg className="shapes-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="How strongly each harmonic separates the groups" data-testid="shapes-separation">
        {[1, 10, 100, 1000, 10000].filter((v) => v <= top * 1.01).map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
            <text x={m.l - 6} y={Y(v) + 3.5} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {Array.from({ length: 2 * F + 1 }, (_, i) => i - F)
          .filter((f) => f !== 0)
          .map((f) => (
            <line key={f} x1={X(f)} x2={X(f)} y1={Y(0)} y2={Y(scores[f + F])} stroke={best.includes(f) ? 'var(--g2)' : third(f) ? 'var(--accent)' : 'var(--muted)'} strokeWidth={2.2} strokeLinecap="round">
              <title>{`f = ${f}: ratio ${Number.isFinite(scores[f + F]) ? scores[f + F].toFixed(1) : '∞'}`}</title>
            </line>
          ))}
        {best.map((f) => (
          <text key={f} x={X(f)} y={Y(scores[f + F]) - 5} textAnchor="middle" className="strong">
            {f}
          </text>
        ))}
        {[-F, -F / 2, 0, F / 2, F].map((f) => (
          <text key={f} x={X(f)} y={H - m.b + 14} textAnchor="middle">
            {Math.round(f)}
          </text>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 2} textAnchor="middle">
          harmonic f: between-group over within-group variance of its size (log scale)
        </text>
      </svg>
    </div>
  );
}
