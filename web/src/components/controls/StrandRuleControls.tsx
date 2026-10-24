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
  hasMultiStrands,
  leafOrder,
  nonCrossingForTile,
  matchingIndicesToCombo,
  type ColorSchemeId,
  type EdgeContracts,
  type TileFamilyId,
  type TileTypeId,
} from '../../core';
import { matchingOptions, tileMatchingInfo } from '../../lib/matchingModel';
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
  /** Bow the matching previews' chords toward each tile's centre. */
  readonly curvedStrands?: boolean;
  /** Offer only matchings whose chords do not cross inside the tile. */
  readonly nonCrossingOnly?: boolean;
  /** Classes to pick out in the picker (hover feedback from the page). */
  readonly highlightMajors?: ReadonlySet<number>;
  /** Spell every edge out (`2.0A`) instead of its bare class number. */
  readonly showEdgeLabels?: boolean;
  readonly tileSize?: number;
  onSubsetChange(subset: readonly number[]): void;
  onToggleMajor(major: number): void;
  onHoverMajor?(major: number | null): void;
  onMatchingChange(tileType: TileTypeId, index: number): void;
  onToggleNonCrossing?(): void;
  /** Set how many strands cross each seam of a class; omit to hide the control. */
  onStrandCountChange?(major: number, count: number): void;
  /** Open a tile's pairing in the big editor; omit to hide the Edit buttons. */
  onOpenTile?(tileType: TileTypeId): void;
  /** Set every tile's matching at once (the whole-rule combination stepper); omit to hide it. */
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
    curvy = false,
    curvedStrands = false,
    nonCrossingOnly = false,
    highlightMajors,
    showEdgeLabels = false,
    tileSize = 116,
    onSubsetChange,
    onToggleMajor,
    onHoverMajor,
    onMatchingChange,
    onToggleNonCrossing,
    onStrandCountChange,
    onOpenTile,
    onMatchingVectorChange,
  } = props;
  const multi = hasMultiStrands(contracts);

  const order = useMemo(() => leafOrder(family), [family]);
  const selected = useMemo(() => new Set(subset), [subset]);
  const combo = useMemo(() => {
    const digits = matchingIndicesToCombo(family, subset, matching, contracts);
    return digits === null ? null : formatComboShareString(subset, digits);
  }, [family, subset, matching, contracts]);

  /**
   * Which tiles are the reason there is no combination string. The encoder
   * only says "no", so without this the message had to blame the whole set —
   * and it blamed it for crossing even when the real trouble was an index left
   * over from a wider subset.
   */
  const crossing = useMemo(() => {
    if (combo !== null || multi) return [];
    const selected = new Set(subset);
    return order.filter((type, i) => {
      const nc = nonCrossingForTile(family, type, selected, contracts);
      const want = matching[i] ?? 0;
      return nc.length === 0 ? want !== 0 : !nc.includes(want);
    });
  }, [combo, multi, family, order, subset, matching, contracts]);

  /**
   * Every tile's options at once, as one odometer: the first tile type with a
   * choice turns fastest, as in aperiodic-circuits' "next combination".
   */
  const combos = useMemo(() => {
    const options = order.map((type) => {
      const info = tileMatchingInfo(family, type, selected, contracts);
      return info.odd ? [] : matchingOptions(info, nonCrossingOnly);
    });
    const sizes = options.map((o) => Math.max(1, o.length));
    const total = sizes.reduce((a, b) => a * b, 1);
    const digits = order.map((_, i) => Math.max(0, options[i].indexOf(matching[i] ?? 0)));
    const position = digits.reduceRight((acc, d, i) => acc * sizes[i] + d, 0);
    const vectorOf = (ds: readonly number[]) => order.map((_, i) => options[i][ds[i]] ?? 0);
    const step = (delta: 1 | -1): readonly number[] => {
      const ds = [...digits];
      for (let i = 0; i < ds.length; i++) {
        if (sizes[i] <= 1) continue;
        ds[i] += delta;
        if (ds[i] >= 0 && ds[i] < sizes[i]) break;
        ds[i] = delta > 0 ? 0 : sizes[i] - 1; // carry on to the next tile
      }
      return vectorOf(ds);
    };
    const random = (): readonly number[] => vectorOf(sizes.map((n) => Math.floor(Math.random() * n)));
    return { total, position, step, random, exact: Number.isSafeInteger(total) };
  }, [order, family, selected, contracts, nonCrossingOnly, matching]);

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
      </fieldset>

      <fieldset className="explorer-matchings">
        <legend>Matchings</legend>
        <p className="combo-readout">
          {combo ? (
            <>
              Combination string: <code>{combo}</code>
            </>
          ) : (
            <span className="muted" data-testid="combo-crossing">
              {multi
                ? 'Several strands on a class: a combination string has no room for that, so the link spells the matchings out.'
                : crossing.length === 1
                  ? `${crossing[0]}’s matching crosses itself, so there is no combination string.`
                  : `These matchings cross themselves, so there is no combination string: ${crossing.join(', ')}.`}
            </span>
          )}
        </p>
        {onMatchingVectorChange && combos.total > 1 ? (
          <div className="combo-stepper" role="group" aria-label="Every tile's matching at once" data-testid="combo-stepper">
            <button type="button" aria-label="Previous combination" onClick={() => onMatchingVectorChange(combos.step(-1))}>
              ‹
            </button>
            <span className="combo-stepper-count" data-testid="combo-position">
              Combination {combos.exact ? `${(combos.position + 1).toLocaleString('en-US')} of ${combos.total.toLocaleString('en-US')}` : ''}
            </span>
            <button type="button" aria-label="Next combination" onClick={() => onMatchingVectorChange(combos.step(1))}>
              ›
            </button>
            <button type="button" onClick={() => onMatchingVectorChange(combos.random())}>
              Random
            </button>
          </div>
        ) : null}
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
              showEdgeLabels={showEdgeLabels}
              curvy={curvy}
              curvedStrands={curvedStrands}
              colorScheme={colorScheme}
              customColors={customColors}
              tileSize={tileSize}
              onChange={(index) => onMatchingChange(type, index)}
              onOpen={onOpenTile ? () => onOpenTile(type) : undefined}
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
