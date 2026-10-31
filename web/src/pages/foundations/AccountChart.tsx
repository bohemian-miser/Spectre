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
import { account, expectedTails, STOP_TEXT, type PageCombo, type Split } from './pageData';
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
  { key: 'class', label: 'Off' },
  { key: 'order', label: 'By order' },
  { key: 'chain', label: 'By chain' },
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
  const exp = useMemo(() => expectedTails(data), [data]);
  // the next members' first closings forecast from the top level (`expectedTails`), drawn into the top column's tails from below
  const mark = 1 - data.tails[top] + exp.expected;
  const limit = Math.min(1, pr.limit);
  const name = (root: number): string => {
    const f = data.found.find((x) => x[0] === root);
    return f ? `the chain of ${f[2].toLocaleString('en-US')} at level ${f[1]}` : `chain ${root}`;
  };
  const stopped = pr.fits.filter((f) => f.stop && f.stop !== 'ended' && f.stop !== 'loop');
  const colName = (c: number): string => {
    const l = columns[c].level;
    return l === null ? 'The limit' : l > top ? `Level ${l}, forecast` : `Level ${l}`;
  };
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
      <div className="fd-legend" data-testid="fd-legend">
        {segs.map((s) => (
          <span key={s.key}>
            <i className={classOf(s.key)} /> {s.label}
          </span>
        ))}
        <span title={`the next members of the known chains, where each first closes, forecast from level ${top} as two levels below forecast the build`}>
          <i className="fd-key-line" /> Next harmonics, forecast
        </span>
        <span>
          <i className="fd-key-line fd-key-limit" /> Limit
        </span>
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
          <line x1={xOf(top) + 3} x2={xOf(top) + COL - 3} y1={y(mark)} y2={y(mark)} className="fd-expected">
            <title>{`the next members' first closings, forecast from level ${top}: ${pct(exp.expected)} of the chords`}</title>
          </line>
          <line x1={xOf(top + 1)} x2={W - 2} y1={y(limit)} y2={y(limit)} className="fd-limit" data-testid="fd-limit">
            <title>{`the limit: ${pct(pr.limit)} of the chords on known circuits`}</title>
          </line>
        </svg>
        <div className="fd-chart-read" aria-live="polite">
          <strong>{colName(shown)}</strong>
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
        circuits sorted. The tails are split by what becomes of them: closed later by circuits known at level {top} (as built to {top}, forecast past it),
        or not accounted for. Levels {top + 1} to {pr.ahead} (lighter) and the limit (∞) are forecast: each circuit closes again as its closings have
        fallen level by level, and each chain gains a member every two levels, its share the last member&apos;s times the ratio between the last two. In
        the limit known circuits take <b data-testid="fd-limit-share">{pct(pr.limit)}</b> of the chords
        {acc.over > 0.0005 ? `, ${pct(acc.over)} more than the tails hold; the forecast parts are drawn scaled to fit.` : `; ${pct(1 - pr.limit)} is not accounted for.`}
        {stopped.length ? (
          <span data-testid="fd-not-forecast">
            {' '}
            Not forecast:{' '}
            {stopped.map((f, i) => (
              <Fragment key={f.root}>
                {i ? '; ' : ''}
                {name(f.root)}, {STOP_TEXT[f.stop!]}
                {f.stop === 'growing' && f.ratio !== null ? ` (ratio ${f.ratio.toFixed(2)})` : ''}
              </Fragment>
            ))}
            .
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
