/**
 * `StrandRuleControls` — the pattern selection: which seam classes carry a
 * strand, and how each tile joins its own connection points up.
 *
 * The edge rule (class chips, strands per class, the tail-free sets) and,
 * below it, the combination bar (`ComboBar`) for the pairings. A page that
 * places the bar elsewhere (the Explorer, under its field) sets `bar={false}`.
 *
 * Fully controlled: it owns no state, so each page keeps its own store and URL
 * codec and this component stays a pure view of `(subset, matching, contracts)`.
 */

import {
  leafOrder,
  type ColorSchemeId,
  type EdgeContracts,
  type TileFamilyId,
  type TileTypeId,
} from '../../core';
import { useMemo } from 'react';
import { basisCoords, parityBasis, xorGroup } from '../../lib/parityBasis';
import { ComboBar } from './ComboBar';
import { EdgeSubsetPicker } from './EdgeSubsetPicker';

export interface StrandRuleControlsProps {
  readonly family: TileFamilyId;
  /** Selected seam classes (majors), sorted. */
  readonly subset: readonly number[];
  /** Matching index per leaf, in `leafOrder(family)` order. */
  readonly matching: readonly number[];
  readonly contracts?: EdgeContracts;
  readonly colorScheme?: ColorSchemeId;
  readonly customColors?: Readonly<Record<string, string>>;
  /** Bow the pairings' chords toward each tile's centre. */
  readonly curvedStrands?: boolean;
  /** Offer only matchings whose chords do not cross inside the tile. */
  readonly nonCrossingOnly?: boolean;
  /** Classes to pick out in the picker (hover feedback from the page). */
  readonly highlightMajors?: ReadonlySet<number>;
  /** Show the combination bar under the edge rule; on by default. */
  readonly bar?: boolean;
  onSubsetChange(subset: readonly number[]): void;
  onToggleMajor(major: number): void;
  onHoverMajor?(major: number | null): void;
  onMatchingChange(tileType: TileTypeId, index: number): void;
  onToggleNonCrossing?(): void;
  /** Set how many strands cross each seam of a class; omit to hide the control. */
  onStrandCountChange?(major: number, count: number): void;
  /**
   * Set every tile's matching at once. A change of rule from the bar calls
   * `onSubsetChange` and then this, so both must update from the latest
   * state; without it, each changed tile goes through `onMatchingChange`.
   */
  onMatchingVectorChange?(matching: readonly number[]): void;
}

export function StrandRuleControls(props: StrandRuleControlsProps): JSX.Element {
  const {
    family,
    subset,
    matching,
    contracts,
    colorScheme = 'bright',
    customColors,
    curvedStrands = false,
    nonCrossingOnly = false,
    highlightMajors,
    bar = true,
    onSubsetChange,
    onToggleMajor,
    onHoverMajor,
    onMatchingChange,
    onToggleNonCrossing,
    onStrandCountChange,
    onMatchingVectorChange,
  } = props;

  // A basis of the tail-free rules, strands per class counted: flipping a group's classes keeps a rule tail-free.
  const basis = useMemo(() => parityBasis(family, contracts), [family, contracts]);
  const coords = useMemo(() => basisCoords(basis, subset), [basis, subset]);

  return (
    <>
      <fieldset>
        <legend>Edge rule</legend>
        <EdgeSubsetPicker
          family={family}
          subset={subset}
          contracts={contracts}
          onStrandCountChange={onStrandCountChange}
          highlightMajors={highlightMajors}
          onSubsetChange={onSubsetChange}
          onToggleMajor={onToggleMajor}
          onHoverMajor={onHoverMajor}
        />
        {basis.basis.length > 0 ? (
          <details className="rule-groups">
            <summary>Groups</summary>
            <div className="rule-groups-chips" role="group" aria-label="Basis groups" data-testid="rule-groups">
              {basis.basis.map((g, i) => (
                <button
                  type="button"
                  key={g.join(',')}
                  className={coords?.[i] ? 'on' : undefined}
                  aria-pressed={coords?.[i] ?? false}
                  title={`Flip classes ${g.join(', ')} together`}
                  onClick={() => onSubsetChange(xorGroup(subset, g))}
                >
                  {g.join('·')}
                </button>
              ))}
              <span className="muted">
                {basis.count.toLocaleString('en-US')} tail-free rule{basis.count === 1 ? '' : 's'}
              </span>
            </div>
          </details>
        ) : null}
        {onToggleNonCrossing ? (
          <label className="control-row">
            <input type="checkbox" checked={nonCrossingOnly} onChange={onToggleNonCrossing} />
            <span>Non-crossing pairings only</span>
          </label>
        ) : null}
      </fieldset>

      {bar ? (
        <fieldset className="explorer-matchings">
          <legend>Combination</legend>
          <ComboBar
            family={family}
            subset={subset}
            matching={matching}
            contracts={contracts}
            nonCrossingOnly={nonCrossingOnly}
            curvedStrands={curvedStrands}
            colorScheme={colorScheme}
            customColors={customColors}
            onStrands={onStrandCountChange}
            onChange={(next) => {
              if (next.subset.join() !== subset.join()) onSubsetChange(next.subset);
              if (onMatchingVectorChange) onMatchingVectorChange(next.matching);
              else leafOrder(family).forEach((t, i) => next.matching[i] !== matching[i] && onMatchingChange(t, next.matching[i]));
            }}
          />
        </fieldset>
      ) : null}
    </>
  );
}

export default StrandRuleControls;
