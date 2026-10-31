/**
 * Where a supertile's chords are, level by level, each counted once: on
 * nuggets, on chains (split into foundational circuits and harmonics, by
 * harmonic order, or by chain), on circuits at the level above the build no
 * known circuit explains, or on tails; the tails split into what known
 * circuits close later and what nothing known accounts for. Past the top
 * level built, a few columns forecast (`pageData.ts`, `account`), then the
 * limit. One stacked column per level, shares of 100%; hovering a column
 * gives each segment's share.
 */
import { Fragment, useMemo, useState } from 'react';
import { account, type PageCombo, type Segment, type Split } from './pageData';
import { pct } from './data';

const H = 150;
const TOP = 8;
const LEFT = 34;
const COL = 34;
const BAR = 20;
const GAP = 2;
/** Room between the last forecast column and the limit. */
const BREAK = 14;

const SPLITS: readonly { key: Split; label: string }[] = [
  { key: 'class', label: 'Class' },
  { key: 'order', label: 'Order' },
  { key: 'chain', label: 'Chain' },
];

/** The segments in two groups: chords on closed circuits, and on tails. */
const groups = (segs: readonly Segment[]): [string, Segment[]][] => [
  ['Closed', segs.filter((s) => !s.tail)],
  ['Tails', segs.filter((s) => s.tail)],
];

/** A segment's class, by its key: the colour follows the segment's identity. */
const classOf = (key: string): string => (key.startsWith('order') ? `fd-seg-${key.split('-')[0]}` : `fd-seg-${key}`);

export function AccountChart(props: { data: PageCombo }): JSX.Element {
  const { data } = props;
  const [hover, setHover] = useState<number | null>(null);
  const [split, setSplit] = useState<Split>('class');
  const acc = useMemo(() => account(data, split), [data, split]);
  const segs = useMemo(() => acc.segments.filter((s) => s.key === 'unaccounted' || s.values.some((v) => v > 1e-6)), [acc]);
  const { columns, projection: pr } = acc;
  const top = pr.top;
  const xOf = (c: number): number => LEFT + COL * c + (columns[c].level === null ? BREAK : 0);
  const W = xOf(columns.length - 1) + COL + 4;
  const y = (share: number): number => TOP + H * (1 - share);
  const shown = hover ?? top;
  const colName = (c: number): string => {
    const l = columns[c].level;
    return l === null ? 'The limit' : l > top ? `Level ${l}, forecast` : `Level ${l}`;
  };
  return (
    <figure className="fd-chart" data-testid="fd-chart">
      <div className="fd-chart-tools">
        <span className="fd-muted">Split</span>
        <div className="fd-toggle" role="radiogroup" aria-label="Split the chains">
          {SPLITS.map((s) => (
            <button key={s.key} type="button" role="radio" aria-checked={split === s.key} className={split === s.key ? 'fd-on' : undefined} onClick={() => setSplit(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="fd-legend" data-testid="fd-legend">
        {groups(segs).map(([title, list]) => (
          <div key={title} className="fd-legend-group">
            <b>{title}</b>
            {list.map((s) => (
              <span key={s.key}>
                <i className={classOf(s.key)} /> {s.label}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="fd-chart-body">
        <svg
          viewBox={`0 0 ${W} ${TOP + H + 22}`}
          width={W}
          height={TOP + H + 22}
          role="img"
          aria-label={`Share of chords on tails falls from 100% to ${pct(data.tails[top])} by level ${top}; known circuits are forecast to close ${pct(pr.limit)} in the limit`}
        >
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={LEFT - 4} x2={W} y1={y(t)} y2={y(t)} className="fd-grid" />
              <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" className="fd-axis">
                {t * 100}%
              </text>
            </g>
          ))}
          {columns.map((col, c) => {
            const x = xOf(c) + (COL - BAR) / 2;
            let base = 0;
            const parts = segs.map((s) => {
              const r = { s, from: base, to: base + s.values[c] };
              base += s.values[c];
              return r;
            });
            const cls = `fd-col${hover === c ? ' fd-col-on' : ''}${col.forecast ? ' fd-col-forecast' : ''}`;
            return (
              <g key={c} tabIndex={0} aria-label={colName(c)} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(c)} onBlur={() => setHover(null)} className={cls} data-testid="fd-col">
                <rect x={xOf(c)} y={TOP} width={COL} height={H} className="fd-hit" />
                {parts.map(({ s, from, to }) => {
                  const h = H * (to - from) - (to < 0.9999 && to - from > 0 ? GAP : 0);
                  return h > 0.3 ? <rect key={s.key} x={x} y={y(to) + (to < 0.9999 ? GAP : 0)} width={BAR} height={h} className={classOf(s.key)} rx={to >= 0.9999 ? 3 : 0} /> : null;
                })}
                <text x={x + BAR / 2} y={TOP + H + 16} textAnchor="middle" className="fd-axis">
                  {col.level ?? '∞'}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="fd-chart-read" aria-live="polite">
          <strong>{colName(shown)}</strong>
          {hover === null ? <span className="fd-muted"> · hover a column</span> : null}
          <dl>
            {groups(segs).map(([title, list]) => (
              <Fragment key={title}>
                <dt className="fd-read-group">{title}</dt>
                <dd className="fd-read-group" />
                {list.map((s) => (
                  <Fragment key={s.key}>
                    <dt>
                      <i className={classOf(s.key)} /> {s.label}
                    </dt>
                    <dd>{pct(s.values[shown])}</dd>
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </dl>
        </div>
      </div>
      <figcaption className="fd-muted">
        Lighter columns and ∞ are forecast.
        {acc.over > 0.0005 ? ` The forecast takes ${pct(acc.over)} more than the tails hold; its parts are drawn scaled to fit.` : ''}
      </figcaption>
    </figure>
  );
}
