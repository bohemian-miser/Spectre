/**
 * Where a supertile of each type sits one level up: every parent type and
 * slot whose child it is, with how often it sits there among all its
 * copies. A type's copies at level m + 1 come from its parents' copies, so
 * a placement's share is its parent type's frequency over the sum of that
 * frequency across every placement of the type.
 */
import { childType, leafOrder, type HexType } from '../../core';
import { typeFrequencies } from '../foundations/foundations';

export const TYPES = leafOrder('hex') as readonly HexType[];

/** A supertile as slot `slot` of a supertile of `parent`. */
export interface Placement {
  readonly parent: HexType;
  readonly slot: number;
  /** Its share of the type's copies. */
  readonly weight: number;
}

/** Each type's placements, by type. */
export function placements(): Record<HexType, Placement[]> {
  const freq = typeFrequencies('hex');
  const out = Object.fromEntries(TYPES.map((t) => [t, [] as Placement[]])) as Record<HexType, Placement[]>;
  TYPES.forEach((p, pi) => {
    for (let s = 0; s < 8; s++) {
      const c = childType(p, s);
      if (c) out[c as HexType].push({ parent: p, slot: s, weight: freq[pi] });
    }
  });
  for (const t of TYPES) {
    const sum = out[t].reduce((a, x) => a + x.weight, 0);
    out[t] = out[t].map((x) => ({ ...x, weight: x.weight / sum }));
  }
  return out;
}

/** A repeating ancestry: from a supertile of `type` up through `steps` (each a parent and the slot of the one below), back to a supertile of `type`. */
export interface Cycle {
  readonly type: HexType;
  readonly steps: readonly { readonly parent: HexType; readonly slot: number }[];
}

export const cycleName = (c: Cycle): string => [c.type, ...c.steps.map((s) => `${s.slot}${s.parent}`)].join(' ');

/**
 * Every repeating ancestry of one or two levels, and each of them twice
 * round (a strand's ends can repeat every second turn of the ancestry), so
 * periods 1 to 4.
 */
export function cycles(): Cycle[] {
  const prim: Cycle[] = [];
  for (const t of TYPES) {
    for (let s = 0; s < 8; s++) if (childType(t, s) === t) prim.push({ type: t, steps: [{ parent: t, slot: s }] });
  }
  for (const t of TYPES) {
    for (const u of TYPES) {
      if (u === t) continue;
      for (let s = 0; s < 8; s++) {
        if (childType(u, s) !== t) continue;
        for (let r = 0; r < 8; r++) if (childType(t, r) === u) prim.push({ type: t, steps: [{ parent: u, slot: s }, { parent: t, slot: r }] });
      }
    }
  }
  return [...prim, ...prim.map((c) => ({ type: c.type, steps: [...c.steps, ...c.steps] }))];
}
