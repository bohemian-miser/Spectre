/**
 * Choose a combination of any tail-free rule on the hexagons with the
 * combination bar, then the level to run the renormalisation to. Nothing is
 * handed on until the button is pressed, so a page's heavy work starts only
 * then.
 */

import { useMemo, useState, type ReactNode } from 'react';
import {
  comboOptionCounts,
  comboToMatchingIndices,
  leafOrder,
  matchingIndicesToCombo,
  normalizeMatchingVector,
  validEdgeSubsets,
} from '../../core';
import { ComboBar } from '../../components/controls/ComboBar';

export interface ComboChoice {
  readonly subset: readonly number[];
  readonly combo: string;
  readonly level: number;
}

const LEVELS = [6, 7, 8, 9];
const HEX = ['hex'] as const;

export function ComboPicker(props: {
  busy: boolean;
  onAdd: (c: ComboChoice) => void;
  levels?: readonly number[] | 'any';
  verb?: string;
  initialLevel?: number;
  initialCombo?: string;
  initialRule?: string;
  /** More inputs, placed after the level. */
  children?: ReactNode;
  /** Whether to say how many combinations the rule has; on by default. */
  count?: boolean;
}): JSX.Element {
  const levels = props.levels ?? LEVELS;
  const nine = leafOrder('hex').length;
  const [subset, setSubset] = useState<readonly number[]>(() => [...(props.initialRule ?? '023468')].map(Number));
  const [matching, setMatching] = useState<readonly number[]>(() =>
    comboToMatchingIndices('hex', subset, (props.initialCombo ?? '').padEnd(nine, '0').slice(0, nine)),
  );
  const [level, setLevel] = useState(props.initialLevel ?? 7);
  // the box's text, which may be empty or partial while typing; `level` keeps the last whole number from 1 up
  const [levelText, setLevelText] = useState(String(level));

  const rule = subset.join('');
  const combo = matchingIndicesToCombo('hex', subset, matching);
  const tailFree = useMemo(() => validEdgeSubsets('hex').some((v) => v.edges.join('') === rule), [rule]);
  const total = useMemo(() => comboOptionCounts('hex', subset).reduce((a, b) => a * b, 1), [subset]);
  const ready = subset.length > 0 && tailFree && combo !== null;
  const verb = props.verb ?? 'Add';

  return (
    <div className="shapes-combo" data-testid="shapes-combo">
      <ComboBar
        family="hex"
        subset={subset}
        matching={matching}
        families={HEX}
        nonCrossingOnly
        tilesInRow
        onChange={(next) => {
          setSubset(next.subset);
          setMatching(normalizeMatchingVector('hex', next.subset, next.matching));
        }}
      />
      <div className="shapes-combo-run">
        <label>
          Up to level
          {levels === 'any' ? (
            <input
              type="number"
              min={1}
              step={1}
              style={{ width: '4.5em' }}
              value={levelText}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value));
                setLevelText(e.target.value);
                if (e.target.value.trim() !== '' && n >= 1) setLevel(n);
              }}
              onBlur={() => setLevelText(String(level))}
              data-testid="shapes-combo-level"
            />
          ) : (
            <select value={level} onChange={(e) => setLevel(Number(e.target.value))} data-testid="shapes-combo-level">
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </label>
        {props.children}
        <button
          type="button"
          disabled={props.busy || !ready}
          onClick={() => combo !== null && props.onAdd({ subset, combo, level })}
          data-testid="shapes-combo-add"
        >
          {props.busy ? 'Computing…' : `${verb} ${rule} · ${combo ?? '?'}`}
        </button>
        <span className="shapes-note">
          {!ready
            ? subset.length === 0
              ? 'Pick an edge set to read.'
              : !tailFree
                ? 'This edge set has tails; pick a tail-free one to read.'
                : 'A pairing whose lines cross has no code; step that tile.'
            : props.count === false
              ? null
              : `${total.toLocaleString('en-US')} combinations of this rule. Nothing changes below until you press ${verb}.`}
        </span>
      </div>
    </div>
  );
}
