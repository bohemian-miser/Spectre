/**
 * The three overview figures, hand-rolled in SVG (no chart dependency):
 *
 *  - {@link CircuitScalingChart} — circuits at level 4 vs level 6, log–log,
 *    one point per configuration, with the ×62 / ×74.8 / ×140 reference lines
 *    (STATS_NOTES finding 4 / visualization suggestion 1).
 *  - {@link TailGrowthChart} — tails per configuration at each depth, one line
 *    per edge selection, against a φ⁶ guide (finding 2 / suggestion 5).
 *  - {@link SelectionMixChart} — how the 270 combos split across selections,
 *    each bar divided into frozen vs growing circuit vocabularies
 *    (finding 3 / suggestion 2).
 *
 * All three read colours from CSS custom properties, so they follow the site's
 * dark/light tokens without duplicating a palette.
 */

import {
  PHI_6,
  formatCompact,
  formatCount,
  formatRatio,
  type ConfigRow,
  type GrowthSummary,
  type SelectionSummary,
  type TailGrowthPoint,
} from './statsData';
import { extent, logScale, spreadLabels, ticksWithin } from './scales';
import { selectionColor } from './selectionTheme';

interface ScatterProps {
  readonly rows: readonly ConfigRow[];
  readonly growth: GrowthSummary;
  readonly selectedId?: string | null;
  readonly onSelect?: (row: ConfigRow) => void;
}

const SCATTER = { w: 680, h: 430, left: 62, right: 18, top: 18, bottom: 48 };

export function CircuitScalingChart(props: ScatterProps): JSX.Element {
  const { rows, growth, selectedId, onSelect } = props;
  // Log axes cannot show the circuit-free configurations; they are called out
  // in the caption instead of being silently dropped.
  const plotted = rows.filter((r) => r.lvl4.circuits > 0 && r.lvl6.circuits > 0);
  const omitted = rows.length - plotted.length;

  const xDomain = extent(plotted.map((r) => r.lvl4.circuits));
  const yDomain = extent(plotted.map((r) => r.lvl6.circuits));
  const x = logScale([xDomain[0] / 1.6, xDomain[1] * 1.6], [SCATTER.left, SCATTER.w - SCATTER.right]);
  const y = logScale([yDomain[0] / 1.6, yDomain[1] * 1.6], [SCATTER.h - SCATTER.bottom, SCATTER.top]);

  const refs: readonly { k: number; label: string }[] = [
    { k: growth.circuitCountRatio.min, label: `slowest ${formatRatio(growth.circuitCountRatio.min)}` },
    { k: growth.circuitCountRatio.mean, label: `mean ${formatRatio(growth.circuitCountRatio.mean)}` },
    { k: growth.circuitCountRatio.max, label: `fastest ${formatRatio(growth.circuitCountRatio.max)}` },
  ];

  return (
    <svg
      className="stats-chart"
      viewBox={`0 0 ${SCATTER.w} ${SCATTER.h}`}
      role="img"
      aria-label={`Scatter of circuit counts at level 4 against level 6 for ${plotted.length} configurations, both axes logarithmic. Growth factors run from ${formatRatio(growth.circuitCountRatio.min)} to ${formatRatio(growth.circuitCountRatio.max)}.`}
    >
      {ticksWithin(x.domain).map((t) => (
        <g key={`x${t}`}>
          <line
            className="stats-grid"
            x1={x(t)}
            x2={x(t)}
            y1={SCATTER.top}
            y2={SCATTER.h - SCATTER.bottom}
          />
          <text className="stats-tick" x={x(t)} y={SCATTER.h - SCATTER.bottom + 16} textAnchor="middle">
            {formatCompact(t)}
          </text>
        </g>
      ))}
      {ticksWithin(y.domain).map((t) => (
        <g key={`y${t}`}>
          <line
            className="stats-grid"
            x1={SCATTER.left}
            x2={SCATTER.w - SCATTER.right}
            y1={y(t)}
            y2={y(t)}
          />
          <text className="stats-tick" x={SCATTER.left - 8} y={y(t) + 4} textAnchor="end">
            {formatCompact(t)}
          </text>
        </g>
      ))}

      {refs.map((r, i) => {
        // y = k·x, trimmed to the part that lies inside the plotted box.
        const xa = Math.max(x.domain[0], y.domain[0] / r.k);
        const xb = Math.min(x.domain[1], y.domain[1] / r.k);
        if (!(xb > xa)) return null;
        return (
          <g key={r.label}>
            <line
              className={`stats-ref ${i === 1 ? 'is-mean' : ''}`}
              x1={x(xa)}
              y1={y(xa * r.k)}
              x2={x(xb)}
              y2={y(xb * r.k)}
            />
            <text
              className="stats-ref-label"
              x={x(xb) - 4}
              y={Math.max(SCATTER.top + 10, y(xb * r.k) - 5)}
              textAnchor="end"
            >
              {r.label}
            </text>
          </g>
        );
      })}

      {plotted.map((row) => (
        <circle
          key={row.id}
          className={`stats-point ${selectedId === row.id ? 'is-selected' : ''}`}
          cx={x(row.lvl4.circuits)}
          cy={y(row.lvl6.circuits)}
          r={selectedId === row.id ? 6 : 3.4}
          style={{ fill: selectionColor(row.selection) }}
          onClick={onSelect ? () => onSelect(row) : undefined}
        >
          <title>{`${row.id} — ${formatCount(row.lvl4.circuits)} → ${formatCount(row.lvl6.circuits)} circuits (${formatRatio(row.circuitRatio)})`}</title>
        </circle>
      ))}

      <line
        className="stats-axis"
        x1={SCATTER.left}
        y1={SCATTER.h - SCATTER.bottom}
        x2={SCATTER.w - SCATTER.right}
        y2={SCATTER.h - SCATTER.bottom}
      />
      <line
        className="stats-axis"
        x1={SCATTER.left}
        y1={SCATTER.top}
        x2={SCATTER.left}
        y2={SCATTER.h - SCATTER.bottom}
      />
      <text
        className="stats-axis-label"
        x={(SCATTER.left + SCATTER.w - SCATTER.right) / 2}
        y={SCATTER.h - 10}
        textAnchor="middle"
      >
        circuits at level 4
      </text>
      <text
        className="stats-axis-label"
        transform={`translate(14 ${(SCATTER.top + SCATTER.h - SCATTER.bottom) / 2}) rotate(-90)`}
        textAnchor="middle"
      >
        circuits at level 6
      </text>
      {omitted > 0 ? (
        <text className="stats-tick" x={SCATTER.left + 6} y={SCATTER.top + 12}>
          {`${omitted} circuit-free configuration${omitted === 1 ? '' : 's'} cannot appear on a log axis`}
        </text>
      ) : null}
    </svg>
  );
}

// ---------------------------------------------------------------------------

const SLOPE = { w: 680, h: 340, left: 96, right: 132, top: 26, bottom: 42 };

/** Tails at level 4 vs level 6, one line per selection, against a φ⁶ guide. */
export function TailGrowthChart(props: {
  readonly points: readonly TailGrowthPoint[];
}): JSX.Element {
  const { points } = props;
  const values = points.flatMap((p) => [p.lvl4, p.lvl6, p.lvl4 * PHI_6]);
  const [lo, hi] = extent(values.filter((v) => v > 0));
  const y = logScale([lo / 2, hi * 2], [SLOPE.h - SLOPE.bottom, SLOPE.top]);
  const xLeft = SLOPE.left;
  const xRight = SLOPE.w - SLOPE.right;
  // Selections whose tail counts differ by one would print on top of each
  // other; nudge the labels apart while the lines stay put.
  const leftLabels = spreadLabels(points.map((p) => y(p.lvl4) - 8), 13);
  const rightLabels = spreadLabels(points.map((p) => y(p.lvl6) + 4), 13);

  return (
    <svg
      className="stats-chart"
      viewBox={`0 0 ${SLOPE.w} ${SLOPE.h}`}
      role="img"
      aria-label={`Tail counts per configuration at level 4 and level 6 for each edge selection, logarithmic scale. Every selection except 1278 grows by roughly φ⁶ ≈ ${PHI_6.toFixed(1)}; 1278 stays at four tails.`}
    >
      {ticksWithin(y.domain).map((t) => (
        <g key={`y${t}`}>
          <line className="stats-grid" x1={xLeft} x2={xRight} y1={y(t)} y2={y(t)} />
          {/* Axis numbers hug the far left so the per-selection labels next to
              the level-4 column have room of their own. */}
          <text className="stats-tick" x={6} y={y(t) + 4}>
            {formatCompact(t)}
          </text>
        </g>
      ))}

      {points.map((p, i) => (
        <g key={p.selection}>
          <line
            className="stats-guide"
            x1={xLeft}
            y1={y(p.lvl4)}
            x2={xRight}
            y2={y(p.lvl4 * PHI_6)}
          />
          <line
            className="stats-slope"
            x1={xLeft}
            y1={y(p.lvl4)}
            x2={xRight}
            y2={y(p.lvl6)}
            style={{ stroke: selectionColor(p.selection) }}
          />
          <circle
            className="stats-slope-dot"
            cx={xLeft}
            cy={y(p.lvl4)}
            r={4}
            style={{ fill: selectionColor(p.selection) }}
          />
          <circle
            className="stats-slope-dot"
            cx={xRight}
            cy={y(p.lvl6)}
            r={4}
            style={{ fill: selectionColor(p.selection) }}
          />
          <text className="stats-tick is-strong" x={xLeft - 8} y={leftLabels[i]} textAnchor="end">
            {p.selection}
          </text>
          <text className="stats-tick is-strong" x={xRight + 8} y={rightLabels[i]}>
            {`${formatCount(p.lvl6)} · ${formatRatio(p.ratio)}`}
          </text>
        </g>
      ))}

      <line
        className="stats-axis"
        x1={xLeft}
        y1={SLOPE.h - SLOPE.bottom}
        x2={xRight}
        y2={SLOPE.h - SLOPE.bottom}
      />
      <text className="stats-axis-label" x={xLeft} y={SLOPE.h - 14} textAnchor="middle">
        level 4
      </text>
      <text className="stats-axis-label" x={xRight} y={SLOPE.h - 14} textAnchor="middle">
        level 6
      </text>
      <text className="stats-ref-label" x={xRight} y={SLOPE.top - 10} textAnchor="end">
        {`dashed = φ⁶ growth (×${PHI_6.toFixed(2)})`}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------

const MIX_ROW_H = 34;

/**
 * Combos per selection (the coverage skew), each bar split into the combos
 * whose circuit-length set is frozen between the two depths and those that
 * gain new lengths.
 */
export function SelectionMixChart(props: {
  readonly selections: readonly SelectionSummary[];
  readonly active?: readonly string[];
  readonly onSelect?: (selection: string) => void;
}): JSX.Element {
  const { selections, active = [], onSelect } = props;
  const w = 680;
  const left = 78;
  const right = 190;
  const h = selections.length * MIX_ROW_H + 34;
  const max = Math.max(1, ...selections.map((s) => s.nCombos));
  const barW = (n: number): number => ((w - left - right) * n) / max;

  return (
    <svg
      className="stats-chart"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Combos analysed per edge selection: ${selections
        .map((s) => `${s.selection} ${s.nCombos}`)
        .join(', ')}. The solid part of each bar is the combos whose circuit-length set is identical at both depths.`}
    >
      {selections.map((s, i) => {
        const yTop = 10 + i * MIX_ROW_H;
        const isActive = active.includes(s.selection);
        return (
          <g
            key={s.selection}
            className={`stats-mix-row ${isActive ? 'is-active' : ''} ${onSelect ? 'is-clickable' : ''}`}
            onClick={onSelect ? () => onSelect(s.selection) : undefined}
          >
            <rect className="stats-mix-hit" x={0} y={yTop - 4} width={w} height={MIX_ROW_H} />
            <text className="stats-tick is-strong" x={left - 10} y={yTop + 16} textAnchor="end">
              {s.selection}
            </text>
            <rect
              className="stats-bar is-grown"
              x={left}
              y={yTop}
              width={Math.max(2, barW(s.nCombos))}
              height={20}
              style={{ fill: selectionColor(s.selection) }}
            />
            <rect
              className="stats-bar is-frozen"
              x={left}
              y={yTop}
              width={barW(s.nStableCircuitLengthSets)}
              height={20}
              style={{ fill: selectionColor(s.selection) }}
            />
            <text className="stats-tick" x={left + Math.max(2, barW(s.nCombos)) + 10} y={yTop + 15}>
              {`${s.nCombos} combo${s.nCombos === 1 ? '' : 's'} · ${s.nStableCircuitLengthSets} frozen`}
            </text>
          </g>
        );
      })}
      <text className="stats-ref-label" x={left} y={h - 6}>
        solid = frozen circuit-length set · pale = gains new lengths at level 6
      </text>
    </svg>
  );
}
