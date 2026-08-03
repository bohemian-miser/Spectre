/**
 * `StatsSummary` — circuit / wanderer counts with clickable length chips
 * (DESIGN.md §6.4). Chips carry the circuit colours, so a chip and the paths it
 * refers to are visually the same thing; clicking one asks the parent to zoom.
 */

import { useMemo } from 'react';
import { summaryChips } from '../../lib/overlayPaths';
import type { AnalysisResponse } from '../../core';

export interface StatsSummaryProps {
  readonly result: AnalysisResponse | null;
  readonly running?: boolean;
  readonly error?: string | null;
  readonly highlightLength?: number | null;
  onSelectLength?(length: number | null): void;
  readonly className?: string;
}

export function StatsSummary(props: StatsSummaryProps): JSX.Element {
  const { result, running, error, highlightLength, onSelectLength, className } = props;

  const circuitChips = useMemo(
    () => (result ? summaryChips(result.circuitSummary, result.circuitColors) : []),
    [result],
  );
  const tailChips = useMemo(
    () => (result ? summaryChips(result.tailSummary) : []),
    [result],
  );
  const maxTail = useMemo(
    () => tailChips.reduce((m, c) => Math.max(m, c.count), 1),
    [tailChips],
  );

  return (
    <div className={['stats-summary', className ?? ''].filter(Boolean).join(' ')}>
      {error ? <p className="error">Analysis failed: {error}</p> : null}
      {running ? <p className="muted">Analysing…</p> : null}
      {!result ? (
        <p className="muted">No analysis yet.</p>
      ) : (
        <>
          <dl className="stats-figures">
            <div>
              <dt>Tiles</dt>
              <dd>{result.tileCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Circuits</dt>
              <dd>{result.circuits.length.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Wanderers</dt>
              <dd>{result.tails.length.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Junctions</dt>
              <dd>{result.junctionCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{result.elapsedMs} ms</dd>
            </div>
          </dl>

          <h4>Circuit lengths</h4>
          <div className="length-chips">
            {circuitChips.length === 0 ? <span className="muted">none</span> : null}
            {circuitChips.map((chip) => (
              <button
                key={chip.length}
                type="button"
                className={[
                  'length-chip',
                  highlightLength === chip.length ? 'is-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ borderColor: chip.color }}
                onClick={() =>
                  onSelectLength?.(highlightLength === chip.length ? null : chip.length)
                }
              >
                <span className="length-chip-swatch" style={{ background: chip.color }} />
                {chip.length} × {chip.count}
              </button>
            ))}
          </div>

          <h4>Wanderer lengths</h4>
          <div className="tail-histogram">
            {tailChips.length === 0 ? <span className="muted">none</span> : null}
            <svg
              viewBox={`0 0 ${Math.max(1, tailChips.length) * 12} 40`}
              role="img"
              aria-label="Wanderer length histogram"
              height={60}
              width="100%"
              preserveAspectRatio="none"
            >
              {tailChips.map((chip, i) => (
                <rect
                  key={chip.length}
                  x={i * 12 + 2}
                  y={40 - (chip.count / maxTail) * 38}
                  width={8}
                  height={(chip.count / maxTail) * 38}
                  fill="#808080"
                >
                  <title>
                    length {chip.length}: {chip.count}
                  </title>
                </rect>
              ))}
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

export default StatsSummary;
