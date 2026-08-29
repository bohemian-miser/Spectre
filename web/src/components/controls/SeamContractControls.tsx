/**
 * `SeamContractControls` — where a drawn line crosses each seam class.
 *
 * Extracted from `ExplorerPage` alongside {@link StrandRuleControls}: moving a
 * contract slides every connection point on that class without changing the
 * topology, so it belongs with the pattern controls wherever they appear.
 * Controlled, like its sibling — the page owns the contracts.
 */

import { useMemo } from 'react';
import {
  DEFAULT_CONTRACTS,
  familyMajors,
  leafOrder,
  metaEdges,
  type EdgeContract,
  type EdgeContracts,
  type TileFamilyId,
} from '../../core';
import { edgeClassColor } from '../../lib/palette';
import { ContractSlider } from './ContractSlider';

export interface SeamContractControlsProps {
  readonly family: TileFamilyId;
  /** Classes in the active rule — the others are shown greyed. */
  readonly subset: readonly number[];
  readonly contracts?: EdgeContracts;
  /** Open on first paint (the Explorer keeps it folded away). */
  readonly open?: boolean;
  onChange(major: number, contract: EdgeContract): void;
  onReset(): void;
}

export function SeamContractControls(props: SeamContractControlsProps): JSX.Element {
  const { family, subset, contracts, open = false, onChange, onReset } = props;

  const majors = useMemo(() => familyMajors(family), [family]);
  const minorCounts = useMemo(() => {
    const out: Record<number, number> = {};
    for (const type of leafOrder(family)) {
      for (const seam of metaEdges(family, type)) {
        out[seam.major] = Math.max(out[seam.major] ?? 1, seam.edgeIndices.length);
      }
    }
    return out;
  }, [family]);

  const contractOf = (major: number): EdgeContract =>
    contracts?.[major] ?? DEFAULT_CONTRACTS[major] ?? { minor: 0, t: 0.5 };

  return (
    <details className="explorer-advanced" open={open}>
      <summary>Advanced: seam contracts</summary>
      <p className="muted">
        Where a drawn line crosses each seam class. Each slider spans the whole seam — notches mark
        the vertices between its physical edges — and moving a contract slides every dot and line
        end on that class; the topology never changes. Greyed classes are not part of the current
        edge rule.
      </p>
      {majors.map((major) => {
        const c = contractOf(major);
        const minorCount = Math.max(1, minorCounts[major] ?? 1);
        const activeClass = subset.includes(major);
        const pinned = major === 0;
        return (
          <div
            className={`contract-row${activeClass ? '' : ' is-inactive'}`}
            key={major}
            data-major={major}
            style={{ color: edgeClassColor(major) }}
          >
            <span className="contract-name">class {major === 7 ? '7 (M)' : major}</span>
            <ContractSlider
              major={major}
              minorCount={minorCount}
              value={c}
              active={activeClass}
              pinned={pinned}
              onChange={(contract) => onChange(major, contract)}
            />
            <em>{pinned ? 'centre' : `${c.minor}.${Math.round(c.t * 100)}%`}</em>
          </div>
        );
      })}
      <button type="button" onClick={onReset}>
        Reset contracts
      </button>
    </details>
  );
}

export default SeamContractControls;
