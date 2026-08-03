/**
 * Featured findings — the verified stories of `docs/STATS_NOTES.md`, each as a
 * card with a figure and numbers read live from the dataset (nothing here is
 * hard-coded prose arithmetic; if the data changed, the cards would too).
 *
 * Wording rules carried over from the notes: lengths are "segments"; pooled
 * per-selection figures are "summed across combos" and never a property of one
 * tiling; circuit-free configurations stay "candidates" (finite-depth
 * evidence); circuit-length sets are unique lengths without multiplicities.
 */

import {
  PHI_6,
  circuitFreeRows,
  fibonacciIndex,
  formatCount,
  formatRatio,
  ratioExtremeRows,
  rowsForHolders,
  shareString,
  tailGrowth,
  type ConfigRow,
  type StatsDataset,
} from './statsData';
import { CircuitScalingChart, SelectionMixChart, TailGrowthChart } from './OverviewCharts';
import { TailHistogram } from './ConfigFigures';
import { ExplorerLinks } from './ConfigDetail';
import { selectionColor } from './selectionTheme';

export interface FindingsProps {
  readonly data: StatsDataset;
  readonly base: string;
  readonly onOpenRow: (row: ConfigRow) => void;
  readonly onFilterSelection?: (selection: string) => void;
  readonly activeSelections?: readonly string[];
  readonly selectedId?: string | null;
}

/** A button that opens a configuration's detail panel in the table below. */
function RowLink(props: {
  readonly row: ConfigRow;
  readonly onOpenRow: (row: ConfigRow) => void;
  readonly label?: string;
}): JSX.Element {
  const { row, onOpenRow, label } = props;
  return (
    <button type="button" className="stats-rowlink" onClick={() => onOpenRow(row)}>
      <span
        className="stats-sel-dot"
        style={{ background: selectionColor(row.selection) }}
        aria-hidden="true"
      />
      <code>{label ?? shareString(row)}</code>
    </button>
  );
}

export function Findings(props: FindingsProps): JSX.Element {
  const { data, base, onOpenRow, onFilterSelection, activeSelections = [], selectedId } = props;

  // --- 1. the circuit-free candidates ------------------------------------
  const free = circuitFreeRows(data);
  const flagship = [...free].sort((a, b) => b.lvl6.maxTail - a.lvl6.maxTail)[0];
  const freeSelections = [...new Set(free.map((r) => r.selection))];

  // --- 2. tails per selection --------------------------------------------
  const growthPoints = tailGrowth(data);
  const growingTails = growthPoints.filter((p) => (p.ratio ?? 1) > 1.5);
  const tailRatioRange: [number, number] = [
    Math.min(...growingTails.map((p) => p.ratio ?? 0)),
    Math.max(...growingTails.map((p) => p.ratio ?? 0)),
  ];
  const frozenTails = growthPoints.filter((p) => (p.ratio ?? 1) <= 1.5);
  const fib = growthPoints.find((p) => fibonacciIndex(p.lvl4) !== null && fibonacciIndex(p.lvl6) !== null);

  // --- 3. frozen vs growing circuit vocabularies -------------------------
  const rows15 = data.rows.filter((r) => r.selection === '15');
  const lengths15 = [...new Set(rows15.flatMap((r) => r.lvl6.circuitLengths))].sort((a, b) => a - b);
  const frozenShare = (data.growth.stableCircuitLengthSets / data.rows.length) * 100;

  // --- 4. records ---------------------------------------------------------
  const longestCircuitRow = rowsForHolders(data, data.records.longestCircuit.holders)[0];
  const longestTailRow = rowsForHolders(data, data.records.longestTail.holders)[0];
  const richestRows = rowsForHolders(data, data.records.mostDistinctCircuitLengths.holders);

  // --- 5. growth ----------------------------------------------------------
  const withRatio = data.rows.filter((r) => r.circuitRatio !== null);
  // Both extremes are ties in this dataset, so every holder is listed.
  const fastest = ratioExtremeRows(data, 'max');
  const slowest = ratioExtremeRows(data, 'min');
  const slowestFamily = [...withRatio]
    .sort((a, b) => (a.circuitRatio ?? 0) - (b.circuitRatio ?? 0))
    .slice(0, 10);
  const slowestSelections = [...new Set(slowestFamily.map((r) => r.selection))];

  return (
    <section className="stats-findings" aria-labelledby="stats-findings-h">
      <h2 id="stats-findings-h">Featured findings</h2>

      {/* 1 --------------------------------------------------------------- */}
      <article className="stats-card">
        <h3>{free.length} configurations with no circuits at all</h3>
        <p>
          Across all {formatCount(data.rows.length)} analysed configurations, exactly {free.length}{' '}
          have <strong>zero circuits</strong> at both depths — and every one of them lives in edge
          selection <code>{freeSelections.join(', ')}</code>. The set is identical at level 4 and
          level 6. Because <code>1278</code> activates no class-0 seam, every vertex has degree ≤ 2,
          so each component is exactly a path or a cycle: “no circuits” is precise here, not an
          artefact of the classifier. Two depths are still finite evidence, so these stay{' '}
          <em>space-filling-curve candidates</em>.
        </p>
        {flagship ? (
          <>
            <p>
              The flagship is <RowLink row={flagship} onOpenRow={onOpenRow} />: at level 6 it is just{' '}
              <strong>{formatCount(flagship.lvl6.tails)} tails</strong> of lengths{' '}
              {[...flagship.lvl6.tailLengths]
                .sort((a, b) => b.length - a.length)
                .map((b) => `${formatCount(b.length)}${b.count > 1 ? ` ×${b.count}` : ''}`)
                .join(', ')}{' '}
              segments. Its longest strand grew from {formatCount(flagship.lvl4.maxTail)} to{' '}
              {formatCount(flagship.lvl6.maxTail)} segments (
              {formatRatio(flagship.lvl6.maxTail / flagship.lvl4.maxTail)}) while the strand{' '}
              <em>count</em> never moved.
            </p>
            <figure className="stats-figure">
              <TailHistogram
                bins={flagship.lvl6.tailLengths}
                label={`${shareString(flagship)} at level 6`}
              />
              <figcaption>
                Two one-segment stubs against two strands of order 10⁵ — the whole patch is four
                open paths.
              </figcaption>
            </figure>
          </>
        ) : null}
        <p className="stats-rowlinks">
          {free.map((r) => (
            <RowLink key={r.id} row={r} onOpenRow={onOpenRow} label={r.combo} />
          ))}
        </p>
        {flagship ? (
          <ExplorerLinks selection={flagship.selection} combo={flagship.combo} base={base} />
        ) : null}
      </article>

      {/* 2 --------------------------------------------------------------- */}
      <article className="stats-card">
        <h3>Tail counts depend only on the edge selection</h3>
        <p>
          Change which non-crossing pairing each tile uses and the circuits reshuffle completely —
          but the number of open strands does not move. Within every (level, selection) group the
          tail count is <strong>constant across all combos</strong>:{' '}
          {growthPoints
            .map((p) => `${p.selection} → ${formatCount(p.lvl6)}`)
            .join(', ')}{' '}
          at level 6.
        </p>
        <p>
          {fib ? (
            <>
              Selection <code>{fib.selection}</code> is exactly Fibonacci:{' '}
              <strong>{formatCount(fib.lvl4)}</strong> = F({fibonacciIndex(fib.lvl4)}) tails at level
              4 becomes <strong>{formatCount(fib.lvl6)}</strong> = F({fibonacciIndex(fib.lvl6)}) at
              level 6.{' '}
            </>
          ) : null}
          Two supertile iterations multiply tails by φ⁶ ≈ {PHI_6.toFixed(3)}; the measured ratios sit
          between {formatRatio(tailRatioRange[0])} and {formatRatio(tailRatioRange[1])} — except{' '}
          {frozenTails.map((p) => (
            <code key={p.selection}>{p.selection}</code>
          ))}
          , frozen at {formatCount(frozenTails[0]?.lvl6 ?? 0)} tails at both depths (
          {formatRatio(frozenTails[0]?.ratio ?? null)}).
        </p>
        <figure className="stats-figure">
          <TailGrowthChart points={growthPoints} />
          <figcaption>
            Tails per configuration at each depth (log scale). Dashed guides show where pure φ⁶
            growth would land; the solid lines land on top of them, apart from the flat{' '}
            <code>1278</code>.
          </figcaption>
        </figure>
      </article>

      {/* 3 --------------------------------------------------------------- */}
      <article className="stats-card">
        <h3>
          Frozen vocabularies: {data.growth.stableCircuitLengthSets} of {data.rows.length}{' '}
          configurations never learn a new circuit length
        </h3>
        <p>
          {data.growth.stableCircuitLengthSets} configurations ({frozenShare.toFixed(1)}%) have the
          identical set of circuit lengths at level 4 and level 6;{' '}
          {data.growth.pairsWithNewLengthsAtLvl6} gain longer ones, and{' '}
          <strong>{data.growth.pairsWithLostLengthsAtLvl6} ever lose one</strong>. The effect is
          concentrated by family: {data.selections
            .map((s) => `${s.selection} ${s.nStableCircuitLengthSets}/${s.nCombos}`)
            .join(', ')}
          .
        </p>
        <figure className="stats-figure">
          <SelectionMixChart
            selections={data.selections}
            active={activeSelections}
            onSelect={onFilterSelection}
          />
          <figcaption>
            Combos analysed per selection — note how lopsided the coverage is — with the frozen
            share solid. Click a bar to filter the table.
          </figcaption>
        </figure>
        <p>
          Selection <code>15</code> is the only wholly rigid one: all {rows15.length} of its combos
          keep their lengths, every set a subset of {'{'}
          {lengths15.join(', ')}
          {'}'} — while the circuit <em>count</em> multiplies by{' '}
          {formatRatio(
            rows15.reduce((a, r) => a + r.lvl6.circuits, 0) /
              Math.max(1, rows15.reduce((a, r) => a + r.lvl4.circuits, 0)),
          )}
          . More circuits, never bigger ones.
        </p>
        <table className="stats-mini-table">
          <caption>
            Selection <code>15</code>, per combo (lengths in segments, identical at both depths)
          </caption>
          <thead>
            <tr>
              <th scope="col">Combo</th>
              <th scope="col">Circuit lengths</th>
              <th scope="col" className="is-num">
                Circuits lvl4 → lvl6
              </th>
            </tr>
          </thead>
          <tbody>
            {rows15.map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  <RowLink row={r} onOpenRow={onOpenRow} label={r.combo} />
                </th>
                <td>
                  {'{'}
                  {r.lvl6.circuitLengths.join(', ')}
                  {'}'}
                </td>
                <td className="is-num">
                  {formatCount(r.lvl4.circuits)} → {formatCount(r.lvl6.circuits)}{' '}
                  <span className="muted">{formatRatio(r.circuitRatio)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      {/* 4 --------------------------------------------------------------- */}
      <article className="stats-card">
        <h3>Records</h3>
        <dl className="stats-tiles">
          <div className="stats-tile">
            <dt>Longest circuit</dt>
            <dd>{formatCount(data.records.longestCircuit.lengthSegments)}</dd>
            <dd className="stats-tile-sub">
              segments ·{' '}
              {longestCircuitRow ? <RowLink row={longestCircuitRow} onOpenRow={onOpenRow} /> : null}{' '}
              at level 6
              {data.records.longestCircuit.sameConfigMaxCircuitAtLvl4 !== null
                ? ` · ${formatCount(data.records.longestCircuit.sameConfigMaxCircuitAtLvl4)} at level 4 (${formatRatio(
                    data.records.longestCircuit.growthFactor,
                  )})`
                : ''}
            </dd>
          </div>
          <div className="stats-tile">
            <dt>Longest tail</dt>
            <dd>{formatCount(data.records.longestTail.lengthSegments)}</dd>
            <dd className="stats-tile-sub">
              segments ·{' '}
              {longestTailRow ? <RowLink row={longestTailRow} onOpenRow={onOpenRow} /> : null} at
              level 6 — the circuit-free flagship
            </dd>
          </div>
          <div className="stats-tile">
            <dt>Richest vocabulary</dt>
            <dd>{data.records.mostDistinctCircuitLengths.nDistinct}</dd>
            <dd className="stats-tile-sub">
              distinct circuit lengths, held by {data.records.mostDistinctCircuitLengths.holders.length}{' '}
              level-6 configurations
            </dd>
          </div>
        </dl>
        <p className="stats-rowlinks">
          {richestRows.map((r) => (
            <RowLink key={r.id} row={r} onOpenRow={onOpenRow} />
          ))}
        </p>
        {longestCircuitRow ? (
          <ExplorerLinks
            selection={longestCircuitRow.selection}
            combo={longestCircuitRow.combo}
            base={base}
          />
        ) : null}
      </article>

      {/* 5 --------------------------------------------------------------- */}
      <article className="stats-card">
        <h3>
          Two more supertile steps multiply circuits by {formatRatio(data.growth.circuitCountRatio.min)}{' '}
          to {formatRatio(data.growth.circuitCountRatio.max)}
        </h3>
        <p>
          Over the {data.growth.nCircuitBearingPairs} circuit-bearing configurations the level-4 →
          level-6 circuit count grows by a mean of{' '}
          {formatRatio(data.growth.circuitCountRatio.mean)} (median{' '}
          {formatRatio(data.growth.circuitCountRatio.median)}). The ten slowest all belong to{' '}
          <code>{slowestSelections.join(', ')}</code>, bottoming out at{' '}
          {formatRatio(data.growth.circuitCountRatio.min)} — shared by{' '}
          {slowest.map((r) => (
            <RowLink key={r.id} row={r} onOpenRow={onOpenRow} />
          ))}
          . The fastest, {formatRatio(data.growth.circuitCountRatio.max)}, is a{' '}
          {fastest.length}-way tie{
            fastest[0]
              ? ` (${formatCount(fastest[0].lvl4.circuits)} → ${formatCount(fastest[0].lvl6.circuits)} circuits)`
              : ''
          }:{' '}
          {fastest.map((r) => (
            <RowLink key={r.id} row={r} onOpenRow={onOpenRow} />
          ))}
          . In total the dataset counts{' '}
          {formatCount(data.totals.lvl4.circuits)} circuits at level 4 and{' '}
          {formatCount(data.totals.lvl6.circuits)} at level 6, summed across all combos.
        </p>
        <figure className="stats-figure">
          <CircuitScalingChart
            rows={data.rows}
            growth={data.growth}
            selectedId={selectedId ?? null}
            onSelect={onOpenRow}
          />
          <figcaption>
            One point per configuration, both axes logarithmic, coloured by edge selection. Click a
            point to open its detail below.
          </figcaption>
        </figure>
      </article>
    </section>
  );
}
