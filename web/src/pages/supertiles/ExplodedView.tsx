/**
 * `ExplodedView` — draws an {@link ExplodedLayout} as SVG.
 *
 * One `<g>` per piece, so the grouping the substitution rule describes is the
 * grouping in the DOM: a piece's boundary, the spectres inside it, and its
 * label all live together and share one colour. Leaf tiles are `<use>` of a
 * per-type `<defs>` path, the same trick `TilingView` uses to keep thousands
 * of instances cheap.
 */

import { useMemo } from 'react';
import {
  cameraAffine,
  type Camera,
} from '../../lib/viewport';
import { leafOrder, outlinePath, svgMatrixString, type TileFamilyId } from '../../core';
import { tileColor } from '../../lib/palette';
import { tileDefId, tileOutline } from '../../lib/tilingModel';
import { islandTiles, type ExplodedLayout, type Island } from './explode';

/**
 * Above this many spectres the individual tiles stop being drawn: they are
 * smaller than a pixel long before the DOM gives out, and the piece outlines
 * carry the shape on their own.
 */
export const TILE_DRAW_BUDGET = 6_000;
/** Labels stop earning their space once the pieces are this numerous. */
export const LABEL_BUDGET = 96;

export interface ExplodedViewProps {
  readonly layout: ExplodedLayout;
  readonly family?: TileFamilyId;
  readonly camera?: Camera;
  /** Draw the individual spectres inside each piece (budget permitting). */
  readonly showTiles?: boolean;
  /** Name each piece with its substitution flavour. */
  readonly showLabels?: boolean;
  readonly idPrefix?: string;
  readonly className?: string;
  readonly ariaLabel?: string;
}

let uid = 0;

/** A piece is inked by its own flavour, so the grouping reads as one colour. */
const islandColor = (island: Island): string => tileColor(island.type, 'bright');

export function ExplodedView(props: ExplodedViewProps): JSX.Element {
  const {
    layout,
    family = 'spectre',
    camera,
    showTiles = true,
    showLabels = true,
    idPrefix,
    className,
    ariaLabel,
  } = props;

  const prefix = useMemo(() => idPrefix ?? `sx${++uid}`, [idPrefix]);
  const drawTiles = showTiles && layout.tileCount <= TILE_DRAW_BUDGET;
  const drawLabels = showLabels && layout.leaves.length <= LABEL_BUDGET;

  const defs = useMemo(
    () => leafOrder(family).map((type) => ({ type, d: tileOutline(family, type, false) })),
    [family],
  );

  /**
   * Ink scales with the PIECE, not the scene: a nested explode makes the
   * pieces several times smaller than the whole, and a stroke or a label
   * sized to the scene would swamp them.
   */
  const spans = useMemo(
    () =>
      layout.leaves.map((island) => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const p of island.outline) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        return Math.max(1e-6, Math.max(maxX - minX, maxY - minY));
      }),
    [layout],
  );

  const pieces = useMemo(
    () =>
      layout.leaves.map((island, i) => {
        const color = islandColor(island);
        const tiles = drawTiles ? islandTiles(island) : null;
        const hairline = spans[i] / 260;
        return (
          <g
            key={island.id}
            className="supertile-island"
            data-type={island.type}
            data-slot={island.slot}
            data-level={island.level}
          >
            <path
              className="supertile-island-shape"
              d={outlinePath(island.outline, false)}
              fill={color}
              fillOpacity={tiles ? 0.35 : 1}
              stroke="#10131a"
              strokeWidth={hairline * 2.4}
              strokeLinejoin="round"
            />
            {tiles
              ? tiles.map((inst) => (
                  <use
                    key={inst.id}
                    href={`#${tileDefId(prefix, inst.type)}`}
                    xlinkHref={`#${tileDefId(prefix, inst.type)}`}
                    transform={svgMatrixString(inst.xform)}
                    fill={color}
                    stroke="#10131a"
                    strokeWidth={hairline * 0.9}
                  />
                ))
              : null}
          </g>
        );
      }),
    [layout, drawTiles, spans, prefix],
  );

  const labels = useMemo(() => {
    if (!drawLabels) return null;
    return layout.leaves.map((island, i) => {
      // Size the name to the piece it names: roughly two thirds of its width,
      // at the ~0.6em average width of this font.
      const size = (spans[i] * 0.66) / Math.max(3, island.type.length * 0.6);
      return (
        <text
          key={`l${island.id}`}
          className="supertile-label"
          x={island.center.x}
          y={island.center.y}
          fontSize={size}
          textAnchor="middle"
          dominantBaseline="central"
          // Drawn over a filled shape, so it carries its own contrast.
          stroke="#fff"
          strokeWidth={size * 0.22}
          paintOrder="stroke"
          fill="#10131a"
        >
          {island.type}
        </text>
      );
    });
  }, [drawLabels, layout, spans]);

  const viewBox = `${layout.bounds.min.x} ${layout.bounds.min.y} ${
    layout.bounds.max.x - layout.bounds.min.x
  } ${layout.bounds.max.y - layout.bounds.min.y}`;

  return (
    <svg
      className={['supertile-view', className ?? ''].filter(Boolean).join(' ')}
      role="img"
      aria-label={
        ariaLabel ??
        `${layout.root.type} supertile, level ${layout.root.level}, taken apart into ${layout.leaves.length} pieces`
      }
      width="100%"
      height="100%"
      viewBox={camera ? undefined : viewBox}
      preserveAspectRatio="xMidYMid meet"
      data-piece-count={layout.leaves.length}
      data-tile-count={layout.tileCount}
      data-tiles-drawn={drawTiles ? 'yes' : 'no'}
    >
      <defs>
        {defs.map((def) => (
          <path key={def.type} id={tileDefId(prefix, def.type)} d={def.d} />
        ))}
      </defs>
      <g
        className="supertile-camera"
        transform={camera ? svgMatrixString(cameraAffine(camera)) : undefined}
      >
        <g className="supertile-pieces" strokeLinejoin="round">
          {pieces}
        </g>
        {labels ? <g className="supertile-labels">{labels}</g> : null}
      </g>
    </svg>
  );
}

export default ExplodedView;
