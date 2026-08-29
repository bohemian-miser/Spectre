/**
 * `StrandRuleControls` — the pattern selection: which seam classes carry a
 * strand, and how each tile joins its own connection points up.
 *
 * Extracted from `ExplorerPage` so the Supertiles view drives the SAME
 * controls rather than a second copy of them. Fully controlled: it owns no
 * state, so each page keeps its own store and URL codec and this component
 * stays a pure view of `(subset, matching, contracts)`.
 */

import { useMemo } from 'react';
import {
  formatComboShareString,
  leafOrder,
  matchingIndicesToCombo,
  type ColorSchemeId,
  type EdgeContracts,
  type TileFamilyId,
  type TileTypeId,
} from '../../core';
import { EdgeSubsetPicker } from './EdgeSubsetPicker';
import { MatchingSlider } from './MatchingSlider';

export interface StrandRuleControlsProps {
  readonly family: TileFamilyId;
  /** Selected seam classes (majors), sorted. */
  readonly subset: readonly number[];
  /** Matching index per leaf, in `leafOrder(family)` order. */
  readonly matching: readonly number[];
  readonly contracts?: EdgeContracts;
  readonly colorScheme?: ColorSchemeId;
  readonly customColors?: Readonly<Record<string, string>>;
  readonly curvy?: boolean;
  /** Offer only matchings whose chords do not cross inside the tile. */
  readonly nonCrossingOnly?: boolean;
  /** Classes to pick out in the picker (hover feedback from the page). */
  readonly highlightMajors?: ReadonlySet<number>;
  readonly tileSize?: number;
  onSubsetChange(subset: readonly number[]): void;
  onToggleMajor(major: number): void;
  onHoverMajor?(major: number | null): void;
  onMatchingChange(tileType: TileTypeId, index: number): void;
  onToggleNonCrossing?(): void;
}

export function StrandRuleControls(props: StrandRuleControlsProps): JSX.Element {
  const {
    family,
    subset,
    matching,
    contracts,
    colorScheme = 'bright',
    customColors,
    curvy = false,
    nonCrossingOnly = false,
    highlightMajors,
    tileSize = 116,
    onSubsetChange,
    onToggleMajor,
    onHoverMajor,
    onMatchingChange,
    onToggleNonCrossing,
  } = props;

  const order = useMemo(() => leafOrder(family), [family]);
  const selected = useMemo(() => new Set(subset), [subset]);
  const combo = useMemo(() => {
    const digits = matchingIndicesToCombo(family, subset, matching);
    return digits === null ? null : formatComboShareString(subset, digits);
  }, [family, subset, matching]);

  return (
    <>
      <fieldset>
        <legend>Edge rule</legend>
        <EdgeSubsetPicker
          family={family}
          subset={subset}
          highlightMajors={highlightMajors}
          onSubsetChange={onSubsetChange}
          onToggleMajor={onToggleMajor}
          onHoverMajor={onHoverMajor}
        />
      </fieldset>

      <fieldset className="explorer-matchings">
        <legend>Matchings</legend>
        <p className="combo-readout">
          {combo ? (
            <>
              Combination string: <code>{combo}</code>
            </>
          ) : (
            <span className="muted">
              This matching set crosses itself, so it has no combination string.
            </span>
          )}
        </p>
        {onToggleNonCrossing ? (
          <label className="control-row">
            <input type="checkbox" checked={nonCrossingOnly} onChange={onToggleNonCrossing} />
            <span>Non-crossing options only</span>
          </label>
        ) : null}
        <div className="matching-grid">
          {order.map((type, i) => (
            <MatchingSlider
              key={type}
              family={family}
              tileType={type}
              selectedEdges={selected}
              contracts={contracts}
              value={matching[i] ?? 0}
              nonCrossingOnly={nonCrossingOnly}
              curvy={curvy}
              colorScheme={colorScheme}
              customColors={customColors}
              tileSize={tileSize}
              onChange={(index) => onMatchingChange(type, index)}
            />
          ))}
        </div>
        {subset.length === 0 ? (
          <p className="muted">Pick an edge rule above to give the tiles connection points.</p>
        ) : null}
      </fieldset>
    </>
  );
}

export default StrandRuleControls;
