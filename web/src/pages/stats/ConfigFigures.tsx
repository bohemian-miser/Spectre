/**
 * Per-configuration figures used by the detail panel and the featured cards.
 *
 *  - {@link TailHistogram} — the complete tail-length census (`tail_lengths` is
 *    a full histogram, so this chart is exact), log length × log count.
 *  - {@link CircuitLengthSpectrum} — one tick per **unique** circuit length,
 *    level 4 above level 6, lengths that only appear at level 6 highlighted.
 *    Deliberately no bar heights: per-length circuit multiplicities are not in
 *    the data and must not be implied (STATS_NOTES suggestion 6).
 */

import { formatCompact, formatCount, type ConfigRow, type TailBin } from './statsData';
import { extent, logScale, ticksWithin } from './scales';

const HIST = { w: 560, h: 190, left: 46, right: 14, top: 16, bottom: 34 };

export function TailHistogram(props: {
  readonly bins: readonly TailBin[];
  readonly label: string;
}): JSX.Element {
  const { bins, label } = props;
  if (bins.length === 0) {
    return <p className="stats-empty">{`${label}: no tails in this configuration.`}</p>;
  }

  const lengths = bins.map((b) => b.length);
  const counts = bins.map((b) => b.count);
  const [lMin, lMax] = extent(lengths);
  const x = logScale([Math.max(0.8, lMin * 0.8), lMax * 1.25], [HIST.left, HIST.w - HIST.right]);
  const y = logScale([0.8, Math.max(...counts) * 1.3], [HIST.h - HIST.bottom, HIST.top]);
  const baseline = HIST.h - HIST.bottom;
  const barW = Math.max(2, Math.min(9, (HIST.w - HIST.left - HIST.right) / (bins.length * 1.6)));
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <svg
      className="stats-chart is-figure"
      viewBox={`0 0 ${HIST.w} ${HIST.h}`}
      role="img"
      aria-label={`${label}: ${formatCount(total)} tails across ${bins.length} distinct lengths, from ${formatCount(lMin)} to ${formatCount(lMax)} segments. Both axes logarithmic.`}
    >
      {ticksWithin(y.domain, 5).map((t) => (
        <g key={`y${t}`}>
          <line className="stats-grid" x1={HIST.left} x2={HIST.w - HIST.right} y1={y(t)} y2={y(t)} />
          <text className="stats-tick" x={HIST.left - 7} y={y(t) + 4} textAnchor="end">
            {formatCompact(t)}
          </text>
        </g>
      ))}
      {ticksWithin(x.domain, 7).map((t) => (
        <text
          key={`x${t}`}
          className="stats-tick"
          x={x(t)}
          y={baseline + 15}
          textAnchor="middle"
        >
          {formatCompact(t)}
        </text>
      ))}

      {bins.map((b) => (
        <rect
          key={b.length}
          className="stats-hist-bar"
          x={x(b.length) - barW / 2}
          y={Math.min(y(b.count), baseline - 2)}
          width={barW}
          height={Math.max(2, baseline - y(b.count))}
        >
          <title>{`${formatCount(b.count)} tail${b.count === 1 ? '' : 's'} of ${formatCount(b.length)} segments`}</title>
        </rect>
      ))}

      <line className="stats-axis" x1={HIST.left} y1={baseline} x2={HIST.w - HIST.right} y2={baseline} />
      <line className="stats-axis" x1={HIST.left} y1={HIST.top} x2={HIST.left} y2={baseline} />
      <text className="stats-axis-label" x={HIST.w - HIST.right} y={HIST.h - 4} textAnchor="end">
        tail length (segments) →
      </text>
      <text className="stats-axis-label" x={HIST.left - 40} y={HIST.top + 2} textAnchor="start">
        tails
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------

const SPEC = { w: 560, h: 128, left: 62, right: 16, top: 22 };

export function CircuitLengthSpectrum(props: { readonly row: ConfigRow }): JSX.Element {
  const { row } = props;
  const all = [...row.lvl4.circuitLengths, ...row.lvl6.circuitLengths];
  if (all.length === 0) {
    return (
      <p className="stats-empty">
        No circuits at either depth — every strand in this configuration is an open path.
      </p>
    );
  }

  const [lo, hi] = extent(all);
  const x = logScale([Math.max(0.8, lo * 0.75), hi * 1.3], [SPEC.left, SPEC.w - SPEC.right]);
  const rows: readonly { key: string; label: string; y: number; lengths: readonly number[] }[] = [
    { key: 'lvl4', label: 'level 4', y: SPEC.top + 6, lengths: row.lvl4.circuitLengths },
    { key: 'lvl6', label: 'level 6', y: SPEC.top + 44, lengths: row.lvl6.circuitLengths },
  ];
  const isNew = new Set(row.newLengthsAtLvl6);

  return (
    <svg
      className="stats-chart is-figure"
      viewBox={`0 0 ${SPEC.w} ${SPEC.h}`}
      role="img"
      aria-label={`Unique circuit lengths on a logarithmic axis. Level 4: ${
        row.lvl4.circuitLengths.join(', ') || 'none'
      }. Level 6: ${row.lvl6.circuitLengths.join(', ') || 'none'}${
        row.newLengthsAtLvl6.length ? `, of which ${row.newLengthsAtLvl6.length} are new at level 6` : ''
      }.`}
    >
      {rows.map((r) => (
        <g key={r.key}>
          <text className="stats-tick is-strong" x={SPEC.left - 10} y={r.y + 16} textAnchor="end">
            {r.label}
          </text>
          <line
            className="stats-spectrum-rail"
            x1={SPEC.left}
            x2={SPEC.w - SPEC.right}
            y1={r.y + 11}
            y2={r.y + 11}
          />
          {r.lengths.map((len) => (
            <line
              key={len}
              className={`stats-spectrum-tick ${r.key === 'lvl6' && isNew.has(len) ? 'is-new' : ''}`}
              x1={x(len)}
              x2={x(len)}
              y1={r.y}
              y2={r.y + 22}
            >
              <title>{`${len} segments`}</title>
            </line>
          ))}
        </g>
      ))}
      {ticksWithin(x.domain, 7).map((t) => (
        <text key={`x${t}`} className="stats-tick" x={x(t)} y={SPEC.h - 10} textAnchor="middle">
          {formatCompact(t)}
        </text>
      ))}
      <text className="stats-axis-label" x={SPEC.w - SPEC.right} y={SPEC.h - 26} textAnchor="end">
        circuit length (segments) →
      </text>
    </svg>
  );
}
