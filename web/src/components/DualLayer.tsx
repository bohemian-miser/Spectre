/**
 * `DualLayer` — SVG overlay of the dual of the strand graph (`buildDualGraph`).
 *
 * Each region between the strands gets its own fill and a node coloured by
 * its depth (strands crossed to reach it from the patch edge); each pair of
 * regions a strand separates is joined by a dual edge drawn through the point
 * where it crosses that strand. Fills are one `<path>` per hue bucket, so a
 * level-4 patch is a few dozen DOM nodes rather than one per piece.
 */

import { useMemo } from 'react';
import type { DualGraph } from '../core';

export interface DualLayerProps {
  readonly dual: DualGraph;
  readonly showFills?: boolean;
  readonly showGraph?: boolean;
  /** World units. */
  readonly strokeWidth?: number;
  /** Skip the node/edge drawing past this many regions (DOM budget). */
  readonly maxRegions?: number;
}

/** Fill colour for a region at `depth` (patch-edge regions are depth 0). */
export function dualDepthColor(depth: number): string {
  return `hsl(${(200 + depth * 47) % 360} 70% 58%)`;
}

const FILL_BUCKETS = 24;

/** Neighbouring regions get far-apart hues (golden-angle steps over the region index). */
function regionBucket(region: number): number {
  return Math.floor(((region * 0.618033988749895) % 1) * FILL_BUCKETS);
}

const fmt = (v: number): string => (Math.round(v * 1000) / 1000).toString();

export function DualLayer(props: DualLayerProps): JSX.Element {
  const { dual, showFills = true, showGraph = true, strokeWidth = 0.08, maxRegions = 20000 } = props;

  const fills = useMemo(() => {
    const { pieceStart, pieceXY, pieceRegion } = dual;
    if (!showFills || !pieceStart || !pieceXY || !pieceRegion) return [];
    const byBucket = new Map<number, string[]>();
    for (let p = 0; p + 1 < pieceStart.length; p++) {
      const bucket = regionBucket(pieceRegion[p]);
      const parts: string[] = [];
      for (let k = pieceStart[p]; k < pieceStart[p + 1]; k++) {
        parts.push(`${k === pieceStart[p] ? 'M' : 'L'}${fmt(pieceXY[2 * k])} ${fmt(pieceXY[2 * k + 1])}`);
      }
      parts.push('Z');
      let list = byBucket.get(bucket);
      if (!list) byBucket.set(bucket, (list = []));
      list.push(parts.join(''));
    }
    return [...byBucket.entries()].map(([bucket, ds]) => ({ bucket, d: ds.join('') }));
  }, [dual, showFills]);

  const graph = useMemo(() => {
    if (!showGraph || dual.nRegions > maxRegions) return null;
    const { regionX: X, regionY: Y } = dual;
    const edges = dual.edges
      .map(
        (e) =>
          `M${fmt(X[e.a])} ${fmt(Y[e.a])}L${fmt(e.x)} ${fmt(e.y)}L${fmt(X[e.b])} ${fmt(Y[e.b])}`,
      )
      .join('');
    return { edges };
  }, [dual, showGraph, maxRegions]);

  const r = strokeWidth * 2.5;
  return (
    <g className="dual-layer" data-testid="dual-layer">
      {fills.map((f) => (
        <path
          key={f.bucket}
          className="dual-fill"
          d={f.d}
          fill={`hsl(${Math.round((f.bucket * 360) / FILL_BUCKETS)} 65% 62%)`}
          fillOpacity={0.7}
          stroke="none"
        />
      ))}
      {graph ? (
        <g className="dual-graph">
          <path
            d={graph.edges}
            fill="none"
            stroke="#111"
            strokeOpacity={0.55}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeDasharray={`${strokeWidth * 3} ${strokeWidth * 2}`}
          />
          {Array.from({ length: dual.nRegions }, (_, i) => (
            <circle
              key={i}
              cx={dual.regionX[i]}
              cy={dual.regionY[i]}
              r={dual.regionBoundary[i] ? r * 0.7 : r}
              fill={dualDepthColor(dual.regionDepth[i])}
              stroke="#111"
              strokeWidth={strokeWidth * 0.6}
            />
          ))}
        </g>
      ) : null}
    </g>
  );
}

export default DualLayer;
