/**
 * `TilingView` — SVG renderer for expanded tilings, levels 0–4 (DESIGN.md §5.1).
 *
 * Emits one `<defs>` entry per leaf type present and one `<use>` per instance,
 * so a level-4 patch (~4 400 tiles) is ~4 400 tiny DOM nodes with a single
 * shared path string instead of 4 400 path strings. Pan/zoom is a transform
 * update on one `<g>`, so camera changes never re-render the tiles.
 *
 * Connection dots use the same trick: a `<defs>` group of dots per leaf type,
 * `<use>`d once per instance, and skipped entirely past `dotBudget` tiles.
 */

import { useEffect, useMemo, type ReactNode } from 'react';
import {
  DEFAULT_CONTRACTS,
  mul,
  svgMatrixString,
  type ColorSchemeId,
  type EdgeContracts,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import { cameraAffine, isEmptyBox, type Camera } from '../lib/viewport';
import { edgeClassColor, tileColor } from '../lib/palette';
import {
  buildTilingModel,
  dotsDefId,
  tileConnectionPoints,
  tileDefId,
  type TilingModel,
} from '../lib/tilingModel';

export interface TilingViewProps {
  readonly family: TileFamilyId;
  readonly rootTile?: TileTypeId;
  readonly level: number;
  readonly curvy?: boolean;
  readonly colorScheme?: ColorSchemeId;
  readonly customColors?: Readonly<Record<string, string>>;
  readonly contracts?: EdgeContracts;

  readonly showBackgrounds?: boolean;
  readonly showOutlines?: boolean;
  readonly showDots?: boolean;
  /** Majors whose connection dots are drawn. */
  readonly selectedEdges?: ReadonlySet<number>;
  /** Pulse tiles whose connection count is odd (the "sad tile" beat). */
  readonly markOddTiles?: boolean;

  /**
   * Each substitution level mirrors the previous one, so stepping the level
   * would visually flip the scene without this (default true, DESIGN.md §3.4).
   */
  readonly stabilizeChirality?: boolean;

  /** Screen-space camera; identity when omitted. */
  readonly camera?: Camera;
  readonly width?: number | string;
  readonly height?: number | string;
  /** Unique per mounted instance so `<defs>` ids never collide. */
  readonly idPrefix?: string;
  /** Overlays (`CircuitLayer`, highlights) drawn in the camera's space. */
  readonly children?: ReactNode;
  readonly className?: string;
  /** Skip dots above this tile count (guards level 4+ from 20k circles). */
  readonly dotBudget?: number;
  /** Called with the built model — handy for fitting the camera. */
  onModel?(model: TilingModel): void;
  readonly ariaLabel?: string;
}

let uid = 0;

export function TilingView(props: TilingViewProps): JSX.Element {
  const {
    family,
    rootTile = 'Delta',
    level,
    curvy = false,
    colorScheme = 'bright',
    customColors,
    contracts = DEFAULT_CONTRACTS,
    showBackgrounds = true,
    showOutlines = true,
    showDots = false,
    selectedEdges,
    markOddTiles = false,
    stabilizeChirality = true,
    camera,
    width = '100%',
    height = '100%',
    idPrefix,
    children,
    className,
    dotBudget = 6000,
    onModel,
    ariaLabel,
  } = props;

  const prefix = useMemo(() => idPrefix ?? `tv${++uid}`, [idPrefix]);

  const model = useMemo(
    () => buildTilingModel({ family, rootTile, level, curvy, stabilizeChirality }),
    [family, rootTile, level, curvy, stabilizeChirality],
  );
  useEffect(() => {
    onModel?.(model);
  }, [model, onModel]);

  const dotsByType = useMemo(() => {
    if (!showDots || !selectedEdges || selectedEdges.size === 0) return null;
    if (model.instances.length > dotBudget) return null;
    const out = new Map<TileTypeId, { x: number; y: number; color: string }[]>();
    for (const def of model.defs) {
      const pts = tileConnectionPoints(family, def.type, selectedEdges, contracts);
      if (!pts.length) continue;
      out.set(
        def.type,
        pts.map((p) => ({ x: p.pt.x, y: p.pt.y, color: edgeClassColor(p.edge.major) })),
      );
    }
    return out;
  }, [showDots, selectedEdges, contracts, family, model, dotBudget]);

  const oddTypes = useMemo(() => {
    if (!markOddTiles || !selectedEdges) return new Set<TileTypeId>();
    const out = new Set<TileTypeId>();
    for (const def of model.defs) {
      const n = tileConnectionPoints(family, def.type, selectedEdges, contracts).length;
      if (n % 2 !== 0) out.add(def.type);
    }
    return out;
  }, [markOddTiles, selectedEdges, model, family, contracts]);

  const cameraTransform = camera ? svgMatrixString(cameraAffine(camera)) : undefined;
  const strokeWidth = 0.1;

  const tiles = useMemo(
    () =>
      model.instances.map((inst) => (
        <use
          key={inst.id}
          href={`#${tileDefId(prefix, inst.type)}`}
          xlinkHref={`#${tileDefId(prefix, inst.type)}`}
          transform={svgMatrixString(mul(model.viewTransform, inst.xform))}
          className={oddTypes.has(inst.type) ? 'tile-instance is-odd' : 'tile-instance'}
          fill={showBackgrounds ? tileColor(inst.type, colorScheme, customColors) : 'none'}
          stroke={showOutlines ? '#000' : 'none'}
          strokeWidth={showOutlines ? strokeWidth : 0}
        />
      )),
    [model, prefix, showBackgrounds, showOutlines, colorScheme, customColors, oddTypes],
  );

  const dotUses = useMemo(() => {
    if (!dotsByType) return null;
    return model.instances
      .filter((inst) => dotsByType.has(inst.type))
      .map((inst) => (
        <use
          key={`d${inst.id}`}
          href={`#${dotsDefId(prefix, inst.type)}`}
          xlinkHref={`#${dotsDefId(prefix, inst.type)}`}
          transform={svgMatrixString(mul(model.viewTransform, inst.xform))}
        />
      ));
  }, [dotsByType, model, prefix]);

  const viewBox = isEmptyBox(model.bounds)
    ? '0 0 1 1'
    : `${model.bounds.min.x} ${model.bounds.min.y} ${model.bounds.max.x - model.bounds.min.x} ${
        model.bounds.max.y - model.bounds.min.y
      }`;

  return (
    <svg
      className={['tiling-view', className ?? ''].filter(Boolean).join(' ')}
      role="img"
      aria-label={ariaLabel ?? `${family} tiling, level ${level}, ${model.tileCount} tiles`}
      width={width}
      height={height}
      // Without a camera the widget self-frames via viewBox; with one, the
      // camera group does the framing in screen pixels.
      viewBox={camera ? undefined : viewBox}
      data-tile-count={model.tileCount}
      data-level={level}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {model.defs.map((def) => (
          <path key={def.type} id={tileDefId(prefix, def.type)} d={def.d} />
        ))}
        {dotsByType
          ? [...dotsByType.entries()].map(([type, pts]) => (
              <g key={`dots-${type}`} id={dotsDefId(prefix, type)}>
                {pts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={0.15} fill={p.color} />
                ))}
              </g>
            ))
          : null}
      </defs>
      <g className="tiling-camera" transform={cameraTransform}>
        <g className="tiling-tiles" strokeLinejoin="round">
          {tiles}
        </g>
        {dotUses ? <g className="tiling-dots">{dotUses}</g> : null}
        {children}
      </g>
    </svg>
  );
}

export default TilingView;
