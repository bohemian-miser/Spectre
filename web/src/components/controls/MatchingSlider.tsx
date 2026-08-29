/**
 * `MatchingSlider` — the per-tile matching editor (DESIGN.md §6.4).
 *
 * A mini `TileView` showing the tile's active connection points and the chords
 * of the current matching, plus three ways to change it:
 *  - the range input / stepper buttons cycle the options;
 *  - the "non-crossing only" checkbox restricts the cycle to
 *    `nonCrossingForTile` (the option space combination strings index into);
 *  - dragging from one dot to another (chord-draw) re-pairs directly.
 *
 * The value is always a FULL `enumerateMatchings` index, so it drops straight
 * into `CircuitInput.matchingIndexByType` and the URL `m=` parameter.
 */

import { useCallback, useMemo } from 'react';
import {
  type ColorSchemeId,
  type EdgeContracts,
  type TileFamilyId,
  type TileTypeId,
} from '../../core';
import {
  cycleMatchingIndex,
  matchingOptions,
  normalizeMatchingIndex,
  optionPosition,
  pairPoints,
  tileMatchingInfo,
} from '../../lib/matchingModel';
import { TileView, type EdgeRef } from '../TileView';

export interface MatchingSliderProps {
  readonly family: TileFamilyId;
  readonly tileType: TileTypeId;
  readonly selectedEdges: ReadonlySet<number>;
  readonly contracts?: EdgeContracts;
  /** Full `enumerateMatchings` index. */
  readonly value: number;
  onChange(index: number): void;
  readonly nonCrossingOnly?: boolean;
  onNonCrossingOnlyChange?(value: boolean): void;
  readonly ghostMatchings?: boolean;
  readonly tileSize?: number;
  readonly curvy?: boolean;
  readonly colorScheme?: ColorSchemeId;
  readonly customColors?: Readonly<Record<string, string>>;
  /** Allow drag-to-pair on the mini tile (default true). */
  readonly allowPairing?: boolean;
  readonly className?: string;
}

export function MatchingSlider(props: MatchingSliderProps): JSX.Element | null {
  const {
    family,
    tileType,
    selectedEdges,
    contracts,
    value,
    onChange,
    nonCrossingOnly = false,
    onNonCrossingOnlyChange,
    ghostMatchings = true,
    tileSize = 130,
    curvy,
    colorScheme,
    customColors,
    allowPairing = true,
    className,
  } = props;

  const info = useMemo(
    () => tileMatchingInfo(family, tileType, selectedEdges, contracts),
    [family, tileType, selectedEdges, contracts],
  );

  const options = useMemo(
    () => matchingOptions(info, nonCrossingOnly),
    [info, nonCrossingOnly],
  );

  const normalized = normalizeMatchingIndex(info, value, nonCrossingOnly);
  const position = Math.max(0, optionPosition(info, normalized, nonCrossingOnly));

  const onPair = useCallback(
    (from: EdgeRef, to: EdgeRef) => {
      if (from.pointIndex < 0 || to.pointIndex < 0) return;
      onChange(pairPoints(info, normalized, from.pointIndex, to.pointIndex));
    },
    [info, normalized, onChange],
  );

  const cycle = useCallback(
    (delta: 1 | -1) => onChange(cycleMatchingIndex(info, normalized, delta, nonCrossingOnly)),
    [info, normalized, nonCrossingOnly, onChange],
  );

  // Tiles with fewer than two connection points have nothing to choose (§6.4).
  if (info.pointCount < 2) return null;

  return (
    <div
      className={['matching-slider', info.odd ? 'is-odd' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      data-tile-type={tileType}
    >
      <TileView
        family={family}
        tileType={tileType}
        size={tileSize}
        curvy={curvy}
        colorScheme={colorScheme}
        customColors={customColors}
        contracts={contracts}
        selectedEdges={selectedEdges}
        matchingIndex={normalized}
        ghostMatchings={ghostMatchings}
        markOdd
        // Which tile is this, and which classes does it carry? Both were
        // things you had to already know to read this panel.
        showTileName
        showMajorNumbers
        interaction={allowPairing ? 'chord-draw' : 'hover'}
        onChordDrawn={allowPairing ? onPair : undefined}
        onMatchingCycle={cycle}
        ariaLabel={`${tileType} matching editor`}
      />

      {info.odd ? (
        <p className="matching-odd-note">
          {info.pointCount} connection point{info.pointCount === 1 ? '' : 's'} — odd, so this tile
          can never be fully paired.
        </p>
      ) : (
        <>
          <div className="matching-controls">
            <button type="button" onClick={() => cycle(-1)} aria-label="Previous matching">
              ‹
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(0, options.length - 1)}
              step={1}
              value={position}
              aria-label={`${tileType} matching`}
              onChange={(e) => {
                const at = Number.parseInt(e.target.value, 10);
                onChange(options[Math.max(0, Math.min(options.length - 1, at))] ?? 0);
              }}
            />
            <button type="button" onClick={() => cycle(1)} aria-label="Next matching">
              ›
            </button>
            <span className="matching-badge">
              {position + 1}/{options.length}
            </span>
          </div>

          {onNonCrossingOnlyChange ? (
            <label className="matching-filter">
              <input
                type="checkbox"
                checked={nonCrossingOnly}
                onChange={(e) => onNonCrossingOnlyChange(e.target.checked)}
              />
              non-crossing only ({info.nonCrossing.length} of {info.total})
            </label>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Alias used by prose/UI copy that calls this widget an "editor". */
export const MatchingEditor = MatchingSlider;

export default MatchingSlider;
