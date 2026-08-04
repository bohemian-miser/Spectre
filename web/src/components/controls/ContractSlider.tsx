/**
 * Seam-contract slider whose track spans the ENTIRE seam: u ∈ [0, minorCount]
 * in physical-edge units, so one control places the crossing anywhere on the
 * meta-edge. A notch marks every vertex the seam crosses (integer u — where
 * one minor edge hands over to the next). `active: false` renders the control
 * greyed out (the class isn't part of the current edge rule, so its contract
 * has no visible effect); `pinned` (class 0, which glues to itself) locks the
 * handle to the seam's centre of symmetry.
 */

import type { EdgeContract } from '../../core';

/** Contract → position along the seam in physical-edge units. */
export function contractToU(c: EdgeContract): number {
  return c.minor + c.t;
}

/** Position along the seam → contract. u = minorCount lands on {last, t: 1}. */
export function uToContract(u: number, minorCount: number): EdgeContract {
  const clamped = Math.max(0, Math.min(minorCount, u));
  const minor = Math.max(0, Math.min(minorCount - 1, Math.floor(clamped)));
  return { minor, t: clamped - minor };
}

export interface ContractSliderProps {
  readonly major: number;
  /** Physical edges in the longest seam of this class — the track is [0, minorCount]. */
  readonly minorCount: number;
  readonly value: EdgeContract;
  readonly onChange: (contract: EdgeContract) => void;
  /** Part of the current edge rule? false renders greyed (still adjustable). */
  readonly active?: boolean;
  /** Class 0 glues to itself: handle pinned to the seam centre, input disabled. */
  readonly pinned?: boolean;
  readonly ariaLabel?: string;
  /** Fired on pointer/keyboard engagement so a parent can focus this class. */
  readonly onEngage?: () => void;
}

export function ContractSlider(props: ContractSliderProps): JSX.Element {
  const { major, minorCount, value, onChange, ariaLabel, onEngage } = props;
  const active = props.active ?? true;
  const pinned = props.pinned ?? false;
  const u = pinned ? minorCount / 2 : Math.max(0, Math.min(minorCount, contractToU(value)));

  const vertices: number[] = [];
  for (let i = 1; i < minorCount; i += 1) vertices.push(i);

  const title = pinned
    ? 'Class 0 glues to itself — the crossing is pinned to the seam’s centre of symmetry.'
    : active
      ? 'Slide the crossing point along the whole seam; notches mark the vertices between physical edges.'
      : `Class ${major} is not in the current edge rule, so this contract has no visible effect right now.`;

  const cls = ['contract-slider', active ? '' : 'is-inactive', pinned ? 'is-pinned' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cls} title={title} data-major={major}>
      <span className="contract-slider-track" aria-hidden="true">
        {vertices.map((v) => (
          <i
            key={v}
            className="contract-notch"
            style={{ left: `${(v / minorCount) * 100}%` }}
          />
        ))}
      </span>
      <input
        type="range"
        min={0}
        max={minorCount}
        step={0.01}
        value={u}
        disabled={pinned}
        aria-label={ariaLabel ?? `class ${major} contract position`}
        onPointerDown={onEngage}
        onFocus={onEngage}
        onChange={(e) => onChange(uToContract(Number.parseFloat(e.target.value), minorCount))}
      />
    </span>
  );
}

export default ContractSlider;
