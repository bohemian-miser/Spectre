/**
 * Choose a combination of any valid rule on the hexagons: the rule, then one
 * pairing per tile type, then the level to run the renormalisation to.
 */

import { useMemo, useState } from 'react';
import { comboDigitChar, comboOptionCounts, leafOrder, validEdgeSubsets } from '../../core';

export interface ComboChoice {
  readonly subset: readonly number[];
  readonly combo: string;
  readonly level: number;
}

const LEVELS = [6, 7, 8, 9];

export function ComboPicker(props: { busy: boolean; onAdd: (c: ComboChoice) => void; levels?: readonly number[] | 'any'; verb?: string; initialLevel?: number; initialCombo?: string }): JSX.Element {
  const levels = props.levels ?? LEVELS;
  const rules = useMemo(() => validEdgeSubsets('hex').filter((r) => r.edges.length > 0), []);
  const [rule, setRule] = useState('023468');
  const subset = useMemo(() => [...rule].map(Number), [rule]);
  const counts = useMemo(() => comboOptionCounts('hex', subset), [subset]);
  const types = leafOrder('hex');
  const [digits, setDigits] = useState<number[]>(() => types.map((_, i) => parseInt(props.initialCombo?.[i] ?? '0', 36) || 0));
  const [level, setLevel] = useState(props.initialLevel ?? 7);
  const safe = digits.map((d, i) => (d < counts[i] ? d : 0));
  const combo = safe.map((d) => comboDigitChar(d) ?? '0').join('');
  const total = counts.reduce((a, b) => a * Math.max(1, b), 1);
  return (
    <div className="shapes-combo" data-testid="shapes-combo">
      <label>
        Rule
        <select
          value={rule}
          onChange={(e) => {
            setRule(e.target.value);
            setDigits(types.map(() => 0));
          }}
          data-testid="shapes-combo-rule"
        >
          {rules.map((r) => (
            <option key={r.mask} value={r.edges.join('')}>
              {r.edges.join('')}
            </option>
          ))}
        </select>
      </label>
      <div className="shapes-combo-digits">
        {types.map((t, i) => (
          <label key={t}>
            {t}
            <select
              value={safe[i]}
              disabled={counts[i] <= 1}
              onChange={(e) => setDigits(safe.map((d, j) => (j === i ? Number(e.target.value) : d)))}
              data-testid={`shapes-combo-${t}`}
            >
              {Array.from({ length: Math.max(1, counts[i]) }, (_, d) => (
                <option key={d} value={d}>
                  {comboDigitChar(d)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label>
        Up to level
        {levels === 'any' ? (
          <input type="number" min={1} step={1} style={{ width: '4.5em' }} value={level} onChange={(e) => setLevel(Math.max(1, Math.floor(Number(e.target.value)) || 1))} data-testid="shapes-combo-level" />
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
      <button type="button" onClick={() => setDigits(counts.map((c) => Math.floor(Math.random() * Math.max(1, c))))}>
        Random
      </button>
      <button type="button" disabled={props.busy} onClick={() => props.onAdd({ subset, combo, level })} data-testid="shapes-combo-add">
        {props.busy ? 'Computing…' : `${props.verb ?? 'Add'} ${rule} · ${combo}`}
      </button>
      <span className="shapes-note">{total.toLocaleString('en-US')} combinations of this rule. Nothing changes below until you press {props.verb ?? 'Add'}.</span>
    </div>
  );
}
