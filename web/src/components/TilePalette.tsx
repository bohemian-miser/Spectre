/**
 * `TilePalette` — a grid of `TileView`s with synced highlighting
 * (DESIGN.md §6.2).
 *
 * Deliberately *fully controlled*: the "dots appear on every tile" behaviour is
 * not internal magic. The palette raises `onEdgeHover` / `onEdgeToggle`, the
 * parent updates `highlightMajors` / `selectedEdges`, and every `TileView`
 * re-renders its dots. Selecting an edge class anywhere selects it everywhere —
 * the state model, not the widget, enforces the domain rule.
 */

import { useMemo, type ReactNode } from 'react';
import {
  leafOrder,
  type ColorSchemeId,
  type EdgeContracts,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import { TileView, type EdgeRef, type OverlayChord, type TileInteraction } from './TileView';

export interface TilePaletteProps {
  readonly family: TileFamilyId;
  /** Defaults to `leafOrder(family)`. */
  readonly tileTypes?: readonly TileTypeId[];
  readonly columns?: number;
  readonly tileSize?: number;
  readonly curvy?: boolean;
  readonly colorScheme?: ColorSchemeId;
  readonly customColors?: Readonly<Record<string, string>>;
  readonly contracts?: EdgeContracts;

  // shared / synced state
  readonly selectedEdges: ReadonlySet<number>;
  readonly highlightMajors?: ReadonlySet<number>;
  readonly matchingIndexByType?: Readonly<Record<string, number>>;
  readonly overlaysByType?: Readonly<Record<string, readonly OverlayChord[]>>;
  readonly showEdgeLabels?: boolean;
  readonly ghostMatchings?: boolean;
  readonly markOdd?: boolean;
  readonly interaction?: TileInteraction;
  readonly dimmedTypes?: ReadonlySet<string>;

  onEdgeHover?(edge: EdgeRef | null): void;
  onEdgeToggle?(major: number): void;
  onEdgeClick?(edge: EdgeRef): void;
  onChordDrawn?(tileType: TileTypeId, from: EdgeRef, to: EdgeRef): void;
  onMatchingCycle?(tileType: TileTypeId, delta: 1 | -1): void;
  /** Explorer injects a `MatchingSlider` here. */
  perTileFooter?(type: TileTypeId): ReactNode;

  readonly className?: string;
}

export function TilePalette(props: TilePaletteProps): JSX.Element {
  const {
    family,
    tileTypes,
    columns,
    tileSize = 150,
    curvy,
    colorScheme,
    customColors,
    contracts,
    selectedEdges,
    highlightMajors,
    matchingIndexByType,
    overlaysByType,
    showEdgeLabels,
    ghostMatchings,
    markOdd,
    interaction = 'hover',
    dimmedTypes,
    onEdgeHover,
    onEdgeToggle,
    onEdgeClick,
    onChordDrawn,
    onMatchingCycle,
    perTileFooter,
    className,
  } = props;

  const types = useMemo(() => tileTypes ?? leafOrder(family), [tileTypes, family]);

  return (
    <div
      className={['tile-palette', className ?? ''].filter(Boolean).join(' ')}
      style={
        columns
          ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
          : { gridTemplateColumns: `repeat(auto-fill, minmax(${tileSize}px, 1fr))` }
      }
    >
      {types.map((type) => (
        <figure key={type} className="tile-palette-cell" data-tile-type={type}>
          <TileView
            family={family}
            tileType={type}
            curvy={curvy}
            size={tileSize}
            colorScheme={colorScheme}
            customColors={customColors}
            contracts={contracts}
            selectedEdges={selectedEdges}
            highlightMajors={highlightMajors}
            matchingIndex={matchingIndexByType?.[type]}
            matchingIndexByType={matchingIndexByType}
            overlaysByType={overlaysByType}
            showEdgeLabels={showEdgeLabels}
            ghostMatchings={ghostMatchings}
            markOdd={markOdd}
            dimmed={dimmedTypes?.has(type)}
            interaction={interaction}
            onEdgeHover={onEdgeHover}
            onEdgeClick={(edge) => {
              onEdgeClick?.(edge);
              if (interaction === 'edge-select') onEdgeToggle?.(edge.major);
            }}
            onChordDrawn={
              onChordDrawn ? (from, to) => onChordDrawn(type, from, to) : undefined
            }
            onMatchingCycle={
              onMatchingCycle ? (delta) => onMatchingCycle(type, delta) : undefined
            }
          />
          <figcaption className="tile-palette-label">{type}</figcaption>
          {perTileFooter ? <div className="tile-palette-footer">{perTileFooter(type)}</div> : null}
        </figure>
      ))}
    </div>
  );
}

export default TilePalette;
