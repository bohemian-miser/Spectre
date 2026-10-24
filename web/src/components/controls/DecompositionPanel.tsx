/**
 * `DecompositionPanel` — how the current rule's pairings split its strands,
 * the Multi-edge page's analysis brought to the Explorer (`core/decomposition`).
 *
 *  - The factors the pairings force: groups of strand lanes no tile joins to
 *    another group, each a valid rule of its own.
 *  - Which classes each tile's pairing joins; the tiles joining different
 *    classes are the ones that merge factors.
 *  - With a rooted patch's analysis, its closed loops grouped by count vector
 *    (crossings per class); click a group to pick its loops out.
 */

import { useMemo } from 'react';
import {
  decomposeRule,
  formatCounts,
  type EdgeContracts,
  type TileFamilyId,
} from '../../core';

export interface DecompositionPanelProps {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly matching: readonly number[];
  readonly contracts?: EdgeContracts;
  /** Each circuit's crossings per class, from the analysis (rooted view only). */
  readonly circuitVectors?: readonly Readonly<Record<number, number>>[];
  /** The loop group picked out (`formatCounts` of its vector). */
  readonly focus?: string | null;
  onFocus?(key: string | null): void;
}

export function DecompositionPanel(props: DecompositionPanelProps): JSX.Element | null {
  const { family, subset, matching, contracts, circuitVectors, focus = null, onFocus } = props;
  const d = useMemo(() => decomposeRule(family, subset, matching, contracts), [family, subset, matching, contracts]);
  const groups = useMemo(() => {
    if (!circuitVectors) return null;
    const out = new Map<string, number>();
    for (const v of circuitVectors) out.set(formatCounts(v), (out.get(formatCounts(v)) ?? 0) + 1);
    return [...out].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [circuitVectors]);
  if (!subset.length) return null;
  const mixed = d.joins.filter((j) => j.mixed);
  return (
    <div className="decomposition" data-testid="decomposition">
      <p className="decomposition-factors" data-testid="decomposition-factors">
        {d.factors.length === 1 ? 'One factor: ' : `${d.factors.length} factors: `}
        {d.factors.map((f, i) => (
          <span key={i}>
            {i > 0 && ' + '}
            <b className="mono" title={f.atom ? 'An atom: no pairing can split it' : f.atom === false ? 'Other pairings could split it' : undefined}>
              {formatCounts(f.counts)}
            </b>
            {f.atom ? <span className="decomposition-atom" aria-label="atom">●</span> : null}
          </span>
        ))}
      </p>
      <p className="muted decomposition-note" data-testid="decomposition-joins">
        {mixed.length === 0
          ? 'Every tile joins strands of the same class to each other.'
          : `Joining different classes: ${mixed.map((j) => `${j.type} (${j.text})`).join('; ')}.`}
      </p>
      {groups && groups.length > 0 ? (
        <>
          <p className="decomposition-sub">Loops by crossings per class</p>
          <ul className="decomposition-groups" data-testid="decomposition-groups">
            {groups.map(([key, n]) => (
              <li key={key}>
                <button type="button" aria-pressed={focus === key} onClick={() => onFocus?.(focus === key ? null : key)}>
                  <span className="mono">{key}</span> <span className="muted">× {n}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="muted decomposition-note">
        A factor is a group of strand positions no tile joins to another group, so it is a valid rule on its own (● marks an atom,
        which no pairing can split). Each loop lies inside one factor; a factor is usually several kinds of loop.
      </p>
    </div>
  );
}

export default DecompositionPanel;
