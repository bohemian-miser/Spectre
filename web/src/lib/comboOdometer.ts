/**
 * Every tile's matching options at once, as one odometer: the first tile type
 * with a choice turns fastest, as in aperiodic-circuits' "next pairing". Shared
 * by the sidebar's combination stepper and the Explorer's quick bar so the two
 * always agree on what "next" and "N of M" mean.
 */

import { leafOrder, type EdgeContracts, type TileFamilyId } from '../core';
import { matchingOptions, tileMatchingInfo } from './matchingModel';

export interface ComboOdometer {
  /** Options per leaf, as full matching indices (empty for an odd tile). */
  readonly options: readonly (readonly number[])[];
  /** How many whole-rule combinations there are. */
  readonly total: number;
  /** Where the current matching vector sits among them (0-based). */
  readonly position: number;
  /** False once `total` is too big to count exactly. */
  readonly exact: boolean;
  /** The matching vector one step along (with carry). */
  step(delta: 1 | -1): readonly number[];
  /** A uniformly random matching vector. */
  random(): readonly number[];
}

export function comboOdometer(
  family: TileFamilyId,
  selected: ReadonlySet<number>,
  matching: readonly number[],
  contracts: EdgeContracts | undefined,
  nonCrossingOnly: boolean,
): ComboOdometer {
  const order = leafOrder(family);
  const options = order.map((type) => {
    const info = tileMatchingInfo(family, type, selected, contracts);
    return info.odd ? [] : matchingOptions(info, nonCrossingOnly);
  });
  const sizes = options.map((o) => Math.max(1, o.length));
  const total = sizes.reduce((a, b) => a * b, 1);
  const digits = order.map((_, i) => Math.max(0, options[i].indexOf(matching[i] ?? 0)));
  const position = digits.reduceRight((acc, d, i) => acc * sizes[i] + d, 0);
  const vectorOf = (ds: readonly number[]) => order.map((_, i) => options[i][ds[i]] ?? 0);
  return {
    options,
    total,
    position,
    exact: Number.isSafeInteger(total),
    step(delta) {
      const ds = [...digits];
      for (let i = 0; i < ds.length; i++) {
        if (sizes[i] <= 1) continue;
        ds[i] += delta;
        if (ds[i] >= 0 && ds[i] < sizes[i]) break;
        ds[i] = delta > 0 ? 0 : sizes[i] - 1; // carry on to the next tile
      }
      return vectorOf(ds);
    },
    random: () => vectorOf(sizes.map((n) => Math.floor(Math.random() * n))),
  };
}
