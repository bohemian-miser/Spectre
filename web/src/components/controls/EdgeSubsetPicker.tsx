/**
 * `EdgeSubsetPicker` — dropdown of the valid subsets plus a free-toggle row
 * (DESIGN.md §6.4).
 *
 * The valid subsets are the kernel of the GF(2) count matrix (§3.8) and form a
 * group under symmetric difference, so "combine two rules" is offered as an
 * XOR action. Manual selections outside the kernel are allowed but flagged —
 * that is how the explainer demonstrates the tails problem.
 */

import { useMemo } from 'react';
import {
  MAX_STRANDS,
  connectionCount,
  edgesToSubset,
  strandCount,
  type EdgeContracts,
  leafOrder,
  subsetToString,
  validEdgeSubsets,
  type TileFamilyId,
} from '../../core';
import { EdgeClassLegend } from './EdgeClassLegend';

export interface EdgeSubsetPickerProps {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  /** Carries each class's strand count, which can change a tile's parity. */
  readonly contracts?: EdgeContracts;
  /** Set a class's strand count; shows ▲ / ▼ on the selected chips. */
  onStrandCountChange?(major: number, count: number): void;
  onSubsetChange(subset: readonly number[]): void;
  onToggleMajor?(major: number): void;
  onHoverMajor?(major: number | null): void;
  readonly highlightMajors?: ReadonlySet<number>;
  /** Show the advanced free-toggle row (default true, per §12.13). */
  readonly advanced?: boolean;
  readonly className?: string;
}

export function EdgeSubsetPicker(props: EdgeSubsetPickerProps): JSX.Element {
  const {
    family,
    subset,
    contracts,
    onStrandCountChange,
    onSubsetChange,
    onToggleMajor,
    onHoverMajor,
    highlightMajors,
    advanced = true,
    className,
  } = props;

  const valid = useMemo(() => validEdgeSubsets(family), [family]);
  const selectedSet = useMemo(() => new Set(subset), [subset]);
  const mask = useMemo(() => edgesToSubset(subset), [subset]);
  const current = valid.find((v) => v.mask === mask);

  /** Leaf types that cannot be fully paired under this selection. */
  const oddTypes = useMemo(
    () => leafOrder(family).filter((t) => connectionCount(family, t, selectedSet, contracts) % 2 !== 0),
    [family, selectedSet, contracts],
  );

  const strands = useMemo(
    () => Object.fromEntries(subset.map((m) => [m, strandCount(contracts, m)])),
    [subset, contracts],
  );

  const counts = useMemo(() => {
    const out: Record<number, number> = {};
    for (const t of leafOrder(family)) {
      for (const major of Array.from({ length: 10 }, (_, i) => i)) {
        out[major] = (out[major] ?? 0) + connectionCount(family, t, new Set([major]));
      }
    }
    return out;
  }, [family]);

  return (
    <div className={['edge-subset-picker', className ?? ''].filter(Boolean).join(' ')}>
      <label className="control-row">
        <span>Edge rule</span>
        <select
          value={current ? subsetToString(current.mask) : '__custom'}
          onChange={(e) => {
            const v = valid.find((s) => subsetToString(s.mask) === e.target.value);
            if (v) onSubsetChange(v.edges);
          }}
        >
          {!current ? (
            <option value="__custom">Custom — {subset.join('') || 'none'}</option>
          ) : null}
          {valid.map((v) => (
            <option key={v.mask} value={subsetToString(v.mask)}>
              {v.edges.length === 0 ? '∅ (no edges)' : v.label}
            </option>
          ))}
        </select>
      </label>

      {advanced ? (
        <EdgeClassLegend
          family={family}
          selected={selectedSet}
          highlight={highlightMajors}
          counts={counts}
          strands={strands}
          onStrands={onStrandCountChange}
          maxStrands={MAX_STRANDS}
          legend="Classes"
          onToggle={(major) =>
            onToggleMajor
              ? onToggleMajor(major)
              : onSubsetChange(
                  selectedSet.has(major)
                    ? subset.filter((m) => m !== major)
                    : [...subset, major].sort((a, b) => a - b),
                )
          }
          onHover={onHoverMajor}
        />
      ) : null}

      {oddTypes.length > 0 ? (
        <p className="warning-badge" role="status">
          ⚠ {oddTypes.length} tile type{oddTypes.length === 1 ? '' : 's'} ({oddTypes.join(', ')})
          have an odd number of connection points — this selection leaves tails.
        </p>
      ) : subset.length > 0 ? (
        <p className="ok-badge" role="status">
          ✓ Every tile pairs up — this is a valid rule.
        </p>
      ) : null}
    </div>
  );
}

export default EdgeSubsetPicker;
