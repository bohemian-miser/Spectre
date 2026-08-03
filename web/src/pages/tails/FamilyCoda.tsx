/**
 * Coda — "the same game, other floors". The kernel is a property of the tile
 * tables, not of the Spectre in particular: swap in the marked-hexagon
 * skeleton and the eight answers become a different eight.
 *
 * `EdgeSubsetPicker` is the Explorer's own control, so this last figure is
 * effectively a doorway: whatever the reader builds here, the Explorer will
 * take further.
 */

import { useMemo, useState } from 'react';
import {
  FAMILIES,
  FAMILY_DISPLAY_NAMES,
  subsetToString,
  validEdgeSubsets,
  type TileFamilyId,
} from '../../core';
import { EdgeSubsetPicker } from '../../components';
import { FigureControls, Readout } from './Figure';
import { PatchFigure } from './PatchFigure';

export function FamilyCoda(): JSX.Element {
  const [family, setFamily] = useState<TileFamilyId>('spectre');
  const [subset, setSubset] = useState<readonly number[]>([1, 5]);

  const valid = useMemo(() => validEdgeSubsets(family), [family]);
  const inKernel = useMemo(
    () => valid.some((v) => subsetToString(v.mask) === [...subset].sort((a, b) => a - b).join('')),
    [valid, subset],
  );

  return (
    <div className="tails-split">
      <div className="tails-split-main">
        <PatchFigure
          idPrefix="tails-coda"
          family={family}
          level={2}
          subset={subset}
          showStats
          pannable
          height={360}
          ariaLabel={`${FAMILY_DISPLAY_NAMES[family]} patch under rule ${subset.join('') || 'none'}`}
        />
      </div>

      <aside className="tails-split-aside">
        <FigureControls label="Family">
          <label className="tails-field">
            <span>Floor</span>
            <select
              aria-label="Tile family"
              value={family}
              onChange={(e) => {
                const next = e.target.value as TileFamilyId;
                setFamily(next);
                setSubset(validEdgeSubsets(next)[1]?.edges ?? []);
              }}
            >
              {FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {FAMILY_DISPLAY_NAMES[f]}
                </option>
              ))}
            </select>
          </label>
        </FigureControls>

        <EdgeSubsetPicker
          family={family}
          subset={subset}
          onSubsetChange={setSubset}
          onToggleMajor={(major) =>
            setSubset((prev) =>
              prev.includes(major)
                ? prev.filter((m) => m !== major)
                : [...prev, major].sort((a, b) => a - b),
            )
          }
        />

        <div className="tails-readouts">
          <Readout label="kernel size" value={valid.length} />
          <Readout label="in the kernel" value={inKernel ? 'yes' : 'no'} tone={inKernel ? 'good' : 'bad'} />
        </div>
        <p className="muted">
          The hexagon skeleton plays a slightly different game — its Gamma is one fused tile with no
          class-7 edges, and its Sigma carries a class-6 edge the Spectre's does not — so its kernel
          is a different set. The eight answers above are specifically the Spectre's.
        </p>
      </aside>
    </div>
  );
}

export default FamilyCoda;
