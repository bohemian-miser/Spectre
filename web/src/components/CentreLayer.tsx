/**
 * `CentreLayer` — SVG overlay of circuit centres: a dot per closed circuit at
 * the average of its points, coloured like the circuit and sized by the log of
 * its length, biggest first. Open strands have no centre and are skipped.
 */

import { useMemo } from 'react';
import type { Path } from '../core';
import { buildCentreDots } from '../lib/overlayPaths';

export interface CentreLayerProps {
  readonly circuits: readonly Path[];
  readonly circuitColorByLength?: ReadonlyMap<number, string> | readonly (readonly [number, string])[];
  /** Dim every dot whose length is not in this set; empty or absent dims none. */
  readonly highlightLengths?: ReadonlySet<number> | null;
  /** Dim every dot but these circuits (indices into `circuits`), when given. */
  readonly highlightCircuits?: ReadonlySet<number> | null;
  /** Outline width, world units. */
  readonly strokeWidth?: number;
  /** Multiplies every dot's radius (the Explorer's line-width slider). */
  readonly scale?: number;
}

export function CentreLayer(props: CentreLayerProps): JSX.Element {
  const { circuits, circuitColorByLength, highlightLengths = null, highlightCircuits = null, strokeWidth = 0.06, scale = 1 } = props;
  const dots = useMemo(() => buildCentreDots(circuits, circuitColorByLength), [circuits, circuitColorByLength]);
  return (
    <g className="centre-layer" stroke="rgba(0,0,0,0.65)" strokeWidth={strokeWidth}>
      {dots.map((d) => (
        <circle
          key={d.index}
          className="circuit-centre"
          data-length={d.length}
          cx={d.x}
          cy={d.y}
          r={d.r * scale}
          fill={d.color}
          opacity={
            (highlightLengths?.size && !highlightLengths.has(d.length)) || (highlightCircuits && !highlightCircuits.has(d.index))
              ? 0.15
              : 0.9
          }
        />
      ))}
    </g>
  );
}

export default CentreLayer;
