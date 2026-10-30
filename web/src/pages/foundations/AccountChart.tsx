/**
 * Where a supertile's chords are, level by level, each counted once: on
 * nuggets, on chains (split into foundational circuits and harmonics, by
 * harmonic order, or by chain), on circuits at the level above the build no
 * known circuit explains, or on tails. One stacked column per level, shares
 * of 100%; hovering a column gives each segment's share.
 */
import { Fragment, useMemo, useState } from 'react';
import { segments, type PageCombo, type Split } from './pageData';
import { pct } from './data';

const H = 150;
const TOP = 8;
const LEFT = 34;
const COL = 34;
const BAR = 20;
const GAP = 2;

const SPLITS: readonly { key: Split; label: string }[] = [
  { key: 'class', label: 'Off' },
  { key: 'order', label: 'By order' },
  { key: 'chain', label: 'By chain' },
];

/** A segment's class, by its key: the colour follows the segment's identity. */
const classOf = (key: string): string => {
  if (key.startsWith('order')) return `fd-seg-${key.split('-')[0]}`;
  if (key.startsWith('chain')) return `fd-seg-${key}`;
  return `fd-seg-${key}`;
};

export function AccountChart(props: { data: PageCombo }): JSX.Element {
  const { data } = props;
  const [hover, setHover] = useState<number | null>(null);
  const [split, setSplit] = useState<Split>('class');
  const segs = useMemo(() => segments(data, split).filter((s) => s.key === 'tails' || s.values.some((v) => v > 0)), [data, split]);
  const levels = data.tails.map((_, n) => n);
  const W = LEFT + COL * levels.length + 4;
  const y = (share: number): number => TOP + H * (1 - share);
  const top = levels.length - 1;
  const shown = hover ?? top;
  return (
    <figure className="fd-chart" data-testid="fd-chart">
      <div className="fd-chart-tools">
        <span className="fd-muted">Harmonics</span>
        <div className="fd-toggle" role="radiogroup" aria-label="Split the chains">
          {SPLITS.map((s) => (
            <button key={s.key} type="button" role="radio" aria-checked={split === s.key} className={split === s.key ? 'fd-on' : undefined} onClick={() => setSplit(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="fd-legend">
        {segs.map((s) => (
          <span key={s.key}>
            <i className={classOf(s.key)} /> {s.label}
          </span>
        ))}
      </div>
      <div className="fd-chart-body">
        <svg viewBox={`0 0 ${W} ${TOP + H + 22}`} width={W} height={TOP + H + 22} role="img" aria-label={`Share of chords on tails falls from 100% to ${pct(data.tails[top])} by level ${top}`}>
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={LEFT - 4} x2={W} y1={y(t)} y2={y(t)} className="fd-grid" />
              <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" className="fd-axis">
                {t * 100}%
              </text>
            </g>
          ))}
          {levels.map((n) => {
            const x = LEFT + COL * n + (COL - BAR) / 2;
            let base = 0;
            const parts = segs.map((s) => {
              const r = { s, from: base, to: base + s.values[n] };
              base += s.values[n];
              return r;
            });
            return (
              <g key={n} tabIndex={0} aria-label={`Level ${n}`} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(n)} onBlur={() => setHover(null)} className={hover === n ? 'fd-col fd-col-on' : 'fd-col'}>
                <rect x={LEFT + COL * n} y={TOP} width={COL} height={H} className="fd-hit" />
                {parts.map(({ s, from, to }) => {
                  const h = H * (to - from) - (to < 0.9999 && to - from > 0 ? GAP : 0);
                  return h > 0.3 ? <rect key={s.key} x={x} y={y(to) + (to < 0.9999 ? GAP : 0)} width={BAR} height={h} className={classOf(s.key)} rx={to >= 0.9999 ? 3 : 0} /> : null;
                })}
                <text x={x + BAR / 2} y={TOP + H + 16} textAnchor="middle" className="fd-axis">
                  {n}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="fd-chart-read" aria-live="polite">
          <strong>Level {shown}</strong>
          {hover === null ? <span className="fd-muted"> (top built; hover a column)</span> : null}
          <dl>
            {segs.map((s) => (
              <Fragment key={s.key}>
                <dt>
                  <i className={classOf(s.key)} /> {s.label}
                </dt>
                <dd>{pct(s.values[shown])}</dd>
              </Fragment>
            ))}
          </dl>
        </div>
      </div>
      <figcaption className="fd-muted">
        Shares of a supertile&apos;s chords by the level it is built to, each type weighted by how often it occurs; level {top} is built one past the
        circuits sorted, to see what the tails close into. A circuit not seen yet can only be made of what is still on tails.
      </figcaption>
    </figure>
  );
}
