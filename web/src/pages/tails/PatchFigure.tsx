/**
 * `PatchFigure` — the explainer's workhorse: a patch of Spectres under one edge
 * rule, with the crossing dots and the drawn lines on top.
 *
 * It is a thin composition of the shared widgets (`TilingView` + `CircuitLayer`,
 * optionally inside `PanZoom`) plus `useCircuitAnalysis`, so every beat of the
 * article that says "look at the floor" renders the same way — the only thing
 * that changes between beats is the rule, the matchings and the camera.
 *
 * Analysis runs in world space while the view may be mirrored (§3.4), hence the
 * `viewTransform` wrapper around the overlay — the same trick the Explorer uses.
 */

import { useMemo } from 'react';
import { svgMatrixString, type TileFamilyId, type TileTypeId } from '../../core';
import { CircuitLayer, PanZoom, TilingView } from '../../components';
import { useCircuitAnalysis } from '../../hooks/useCircuitAnalysis';
import { buildTilingModel } from '../../lib/tilingModel';
import { FAMILY } from './presets';
import { Readout } from './Figure';

export interface PatchFigureProps {
  readonly level: number;
  /** The article is about Spectres; the coda re-runs the same code on hexagons. */
  readonly family?: TileFamilyId;
  readonly rootTile?: TileTypeId;
  /** Selected edge classes; an empty rule draws nothing (the ∅ card). */
  readonly subset: readonly number[];
  readonly matchingIndexByType?: Readonly<Record<string, number>>;
  readonly showDots?: boolean;
  readonly showLines?: boolean;
  readonly showOutlines?: boolean;
  readonly showBackgrounds?: boolean;
  readonly markOddTiles?: boolean;
  readonly tailEndMarkers?: boolean;
  /** Wheel/drag camera. Off by default: small figures self-frame. */
  readonly pannable?: boolean;
  /** Zoom buttons. Off for a crossfade's hidden layer (no focusable ghosts). */
  readonly showZoomControls?: boolean;
  readonly strokeWidth?: number;
  /** CSS height of the viewport box. */
  readonly height?: number | string;
  /** Circuits / wanderers / longest-of-each row under the patch. */
  readonly showStats?: boolean;
  readonly idPrefix: string;
  readonly ariaLabel?: string;
  readonly className?: string;
}

function longest(summary: readonly { length: number; count: number }[]): number {
  return summary.reduce((m, s) => Math.max(m, s.length), 0);
}

export function PatchFigure(props: PatchFigureProps): JSX.Element {
  const {
    level,
    family = FAMILY,
    rootTile = 'Delta',
    subset,
    matchingIndexByType,
    showDots = true,
    showLines = true,
    showOutlines = true,
    showBackgrounds = true,
    markOddTiles = true,
    tailEndMarkers = true,
    pannable = false,
    showZoomControls = true,
    strokeWidth = 0.12,
    height = 340,
    showStats = false,
    idPrefix,
    ariaLabel,
    className,
  } = props;

  const selected = useMemo(() => new Set(subset), [subset]);
  const model = useMemo(
    () => buildTilingModel({ family, rootTile, level, stabilizeChirality: true }),
    [family, rootTile, level],
  );

  const matchings = useMemo(
    () => matchingIndexByType ?? {},
    [matchingIndexByType],
  );

  const input = useMemo(
    () =>
      showLines && subset.length
        ? {
            family,
            rootTile,
            level,
            subset: [...subset],
            matchingIndexByType: matchings,
          }
        : null,
    [showLines, subset, family, rootTile, level, matchings],
  );
  const analysis = useCircuitAnalysis(input, { workerMinLevel: 3 });
  const result = analysis.result;

  const overlay =
    result && showLines ? (
      <g transform={svgMatrixString(model.viewTransform)}>
        <CircuitLayer
          circuits={result.circuits}
          tails={result.tails}
          circuitColorByLength={result.circuitColors}
          segmentColor={result.segmentColors}
          tailEndMarkers={tailEndMarkers && level <= 3}
          strokeWidth={strokeWidth}
          maxRecords={40000}
        />
      </g>
    ) : null;

  const scene = (camera?: { x: number; y: number; scale: number }): JSX.Element => (
    <TilingView
      family={family}
      rootTile={rootTile}
      level={level}
      camera={camera}
      selectedEdges={selected}
      showDots={showDots}
      showOutlines={showOutlines}
      showBackgrounds={showBackgrounds}
      markOddTiles={markOddTiles}
      idPrefix={idPrefix}
      ariaLabel={
        ariaLabel ??
        `Level ${level} patch, rule ${subset.length ? subset.join('') : 'none'}`
      }
    >
      {overlay}
    </TilingView>
  );

  return (
    <div className={['tails-patch', className ?? ''].filter(Boolean).join(' ')}>
      <div className="tails-patch-viewport" style={{ height }}>
        {pannable ? (
          <PanZoom
            fitBounds={model.bounds}
            fitKey={`${rootTile}:${level}`}
            padding={16}
            showControls={showZoomControls}
            ariaLabel="Patch viewport — drag to pan, wheel to zoom"
          >
            {(api) => scene(api.camera)}
          </PanZoom>
        ) : (
          scene()
        )}
        {analysis.running ? (
          <p className="tails-patch-veil" role="status">
            drawing…
          </p>
        ) : null}
      </div>

      {showStats ? (
        <div className="tails-readouts">
          <Readout label="tiles" value={model.tileCount.toLocaleString()} />
          <Readout
            label="circuits"
            value={result ? result.circuits.length.toLocaleString() : '—'}
            tone={result && result.circuits.length > 0 ? 'good' : 'neutral'}
          />
          <Readout
            label="wanderers"
            value={result ? result.tails.length.toLocaleString() : '—'}
            tone={result && result.tails.length > 0 ? 'bad' : 'neutral'}
          />
          <Readout
            label="longest circuit"
            value={result ? longest(result.circuitSummary).toLocaleString() : '—'}
          />
          <Readout
            label="longest wanderer"
            value={result ? longest(result.tailSummary).toLocaleString() : '—'}
          />
        </div>
      ) : null}

      {analysis.error ? <p className="error">Analysis failed: {analysis.error}</p> : null}
    </div>
  );
}

export default PatchFigure;
