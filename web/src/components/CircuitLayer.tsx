/**
 * `CircuitLayer` — SVG overlay of traced circuit / tail polylines
 * (DESIGN.md §5.1). Closed circuits are coloured per length; open paths
 * ("wanderers") are grey, or rainbow-parameterised along their length.
 *
 * All path construction lives in `lib/overlayPaths.ts`; this component is a
 * thin, memoized mapping from those records to `<path>` elements.
 */

import { useMemo } from 'react';
import type { Path } from '../core';
import { buildOverlayPaths, tailEndpoints } from '../lib/overlayPaths';

export interface CircuitLayerProps {
  readonly circuits: readonly Path[];
  readonly tails: readonly Path[];
  readonly circuitColorByLength?: ReadonlyMap<number, string> | readonly (readonly [number, string])[];
  readonly segmentColor?: ReadonlyMap<string, string> | readonly (readonly [string, string])[];
  readonly rainbowTails?: boolean;
  readonly showCircuits?: boolean;
  readonly showTails?: boolean;
  /** World units. */
  readonly strokeWidth?: number;
  /**
   * Dim every path whose length is not in this set (length-chip highlighting).
   * Empty or absent means "no highlight" — everything draws at full strength.
   */
  readonly highlightLengths?: ReadonlySet<number> | null;
  /** Draw a marker at every open-path endpoint (the "fraying" beat). */
  readonly tailEndMarkers?: boolean;
  /** Truncation guard for very large levels. */
  readonly maxRecords?: number;
  readonly className?: string;
}

export function CircuitLayer(props: CircuitLayerProps): JSX.Element {
  const {
    circuits,
    tails,
    circuitColorByLength,
    segmentColor,
    rainbowTails = false,
    showCircuits = true,
    showTails = true,
    strokeWidth = 0.12,
    highlightLengths = null,
    tailEndMarkers = false,
    maxRecords,
    className,
  } = props;

  const records = useMemo(
    () =>
      buildOverlayPaths(
        { circuits, tails, circuitColorByLength, segmentColor },
        { showCircuits, showTails, rainbowTails, maxRecords },
      ),
    [
      circuits,
      tails,
      circuitColorByLength,
      segmentColor,
      showCircuits,
      showTails,
      rainbowTails,
      maxRecords,
    ],
  );

  const ends = useMemo(
    () => (tailEndMarkers && showTails ? tailEndpoints(tails) : []),
    [tailEndMarkers, showTails, tails],
  );

  return (
    <g className={['circuit-layer', className ?? ''].filter(Boolean).join(' ')}>
      {records.map((r) => (
        <path
          key={r.key}
          className={`circuit-path is-${r.kind}`}
          data-length={r.length}
          d={r.d}
          fill="none"
          stroke={r.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={highlightLengths?.size && !highlightLengths.has(r.length) ? 0.12 : 1}
        />
      ))}
      {ends.length ? (
        <g className="tail-ends">
          {ends.map((p, i) => (
            <circle
              key={`e${i}`}
              className="tail-end"
              cx={p.x}
              cy={p.y}
              r={strokeWidth * 1.6}
              fill="#ff3b30"
            />
          ))}
        </g>
      ) : null}
    </g>
  );
}

export default CircuitLayer;
