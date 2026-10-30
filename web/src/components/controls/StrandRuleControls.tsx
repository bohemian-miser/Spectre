/**
 * `StrandRuleControls` — the pattern selection: which seam classes carry a
 * strand, and how each tile joins its own connection points up.
 *
 * Extracted from `ExplorerPage` so the Supertiles view drives the SAME
 * controls rather than a second copy of them. Fully controlled: it owns no
 * state, so each page keeps its own store and URL codec and this component
 * stays a pure view of `(subset, matching, contracts)`.
 */

import { useMemo, useState } from 'react';
import {
  familyMajors,
  hasMultiStrands,
  leafOrder,
  nonCrossingForTile,
  type ColorSchemeId,
  type EdgeContracts,
  type TileFamilyId,
  type TileTypeId,
} from '../../core';
import { copyText } from '../../hooks/shareLink';
import { comboOdometer } from '../../lib/comboOdometer';
import { ruleFromShare, ruleShare } from '../../lib/strandRule';
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
  /**
   * Set every tile's matching at once: the whole-rule combination stepper,
   * and typing a combination string, which calls `onSubsetChange` and then
   * this, so both must update from the latest state. Omit to hide the stepper
   * and leave the string read-only.
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
  const combo = useMemo(
    () => ruleShare(family, { subset, matching, contracts }),
    [family, subset, matching, contracts],
  );
  /** A combination string being typed; null shows the rule's own. */
  const [draft, setDraft] = useState<string | null>(null);
  const [comboNote, setComboNote] = useState<string | null>(null);

  const applyDraft = (): void => {
    if (draft === null || !onMatchingVectorChange) return;
    if (draft.trim() === '' || draft.trim() === combo) {
      setDraft(null);
      setComboNote(null);
      return;
    }
    const rule = ruleFromShare(family, draft, contracts);
    if (!rule) {
      setComboNote(
        `Not a combination string here: classes from ${familyMajors(family).join('')}, a dash, then ${order.length} digits.`,
      );
      return;
    }
    onSubsetChange(rule.subset);
    onMatchingVectorChange(rule.matching);
    setDraft(null);
    setComboNote(null);
  };

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

  /** Every tile's options at once, as one odometer (shared with the quick bar). */
  const combos = useMemo(
    () => comboOdometer(family, selected, matching, contracts, nonCrossingOnly),
    [family, selected, matching, contracts, nonCrossingOnly],
  );

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
        <div className="combo-readout">
          <label className="combo-field">
            <span>Combination string</span>
            <input
              type="text"
              aria-label="Combination string of the rule"
              data-testid="combo-string"
              spellCheck={false}
              readOnly={!onMatchingVectorChange}
              placeholder={combo === null ? 'none' : undefined}
              value={draft ?? combo ?? ''}
              onChange={(e) => {
                setDraft(e.target.value);
                setComboNote(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyDraft();
                if (e.key === 'Escape') {
                  setDraft(null);
                  setComboNote(null);
                }
              }}
              onBlur={applyDraft}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <button
            type="button"
            disabled={combo === null}
            onClick={() => combo && void copyText(combo).then((ok) => setComboNote(ok ? 'Copied.' : 'Copying is blocked here; select the string and copy it.'))}
          >
            Copy
          </button>
          {comboNote ? (
            <span className="muted" role="status" data-testid="combo-note">
              {comboNote}
            </span>
          ) : null}
          {combo === null ? (
            <span className="muted" data-testid="combo-crossing">
              {multi
                ? 'Several strands on a class: a combination string has no room for that, so the link spells the matchings out.'
                : crossing.length === 1
                  ? `${crossing[0]}’s matching crosses itself, so there is no combination string.`
                  : `These matchings cross themselves, so there is no combination string: ${crossing.join(', ')}.`}
            </span>
          ) : null}
        </div>
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
