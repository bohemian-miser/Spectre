/**
 * Where a supertile's chords are, level by level: on chains (foundational
 * circuits and their harmonics), on reborn copies, or on tails. One stacked
 * column per level, shares of 100%; hovering a column gives its figures and
 * its three largest chains.
 */
import { useState } from 'react';
import type { PageCombo } from './pageData';
import { compact, pct } from './data';

const SEGMENTS = [
  { key: 0, label: 'On chains', className: 'fd-seg-chain' },
  { key: 1, label: 'Reborn copies', className: 'fd-seg-reborn' },
  { key: 2, label: 'Tails', className: 'fd-seg-tails' },
] as const;

const H = 150;
const TOP = 8;
const LEFT = 34;
const COL = 34;
const BAR = 20;
const GAP = 2;

export function AccountChart(props: { data: PageCombo }): JSX.Element {
  const { data } = props;
  const [hover, setHover] = useState<number | null>(null);
  const levels = data.account.map((_, n) => n);
  const W = LEFT + COL * levels.length + 4;
  const y = (share: number): number => TOP + H * (1 - share);
  const nameOf = (root: number): string => {
    const f = data.found.find((x) => x[0] === root);
    return f ? `${compact(f[2])} at level ${f[1]}, children ${f[3]}` : `closing ${root}`;
  };
  const L = data.levels;
  const shown = hover ?? L;
  const a = data.account[shown];
  return (
    <figure className="fd-chart" data-testid="fd-chart">
      <div className="fd-legend">
        {SEGMENTS.map((s) => (
          <span key={s.key}>
            <i className={s.className} /> {s.label}
          </span>
        ))}
      </div>
      <div className="fd-chart-body">
        <svg viewBox={`0 0 ${W} ${TOP + H + 22}`} width={W} height={TOP + H + 22} role="img" aria-label={`Share of chords on tails falls from 100% to ${pct(data.account[L][2])} by level ${L}`}>
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
            const parts = SEGMENTS.map((s) => {
              const v = data.account[n][s.key];
              const r = { s, from: base, to: base + v };
              base += v;
              return r;
            });
            return (
              <g key={n} tabIndex={0} aria-label={`Level ${n}`} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(n)} onBlur={() => setHover(null)} className={hover === n ? 'fd-col fd-col-on' : 'fd-col'}>
                <rect x={LEFT + COL * n} y={TOP} width={COL} height={H} className="fd-hit" />
                {parts.map(({ s, from, to }) => {
                  const h = H * (to - from) - (to < 0.9999 && to - from > 0 ? GAP : 0);
                  return h > 0.3 ? <rect key={s.key} x={x} y={y(to) + (to < 0.9999 ? GAP : 0)} width={BAR} height={h} className={s.className} rx={to >= 0.9999 ? 3 : 0} /> : null;
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
            <dt>On chains</dt>
            <dd>{pct(a[0])}</dd>
            <dt>Reborn copies</dt>
            <dd>{pct(a[1])}</dd>
            <dt>Tails</dt>
            <dd>{pct(a[2])}</dd>
          </dl>
          {data.topChains[shown]?.length ? (
            <>
              <div className="fd-muted">Largest chains, with their reborn copies</div>
              <ol>
                {data.topChains[shown].map(([root, share]) => (
                  <li key={root}>
                    {nameOf(root)}: {pct(share)}
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
      </div>
      <figcaption className="fd-muted">
        Shares of a supertile&apos;s chords by the level it is built to, each type weighted by how often it occurs. A new foundational circuit above
        level {L} can only be made of what is still on tails.
      </figcaption>
    </figure>
  );
}
