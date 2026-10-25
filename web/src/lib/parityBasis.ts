/**
 * The tails problem as the quick bar sees it, strand counts included.
 *
 * A rule is tail-free when every tile gets an even number of connection
 * points. A class carrying `n` strands per seam adds `n` points for each of
 * its seams, so only `n` odd counts; a class at two strands is tail-free on
 * its own. The tail-free rules are the GF(2) kernel of the (tile x class)
 * parity matrix, as in `core/subsets`, but with the strand counts folded in.
 *
 * The basis is the one aperiodic-circuits' "groups" picker shows: as light as
 * possible (greedy over the lightest rules, which is optimal for a matroid),
 * so the groups read as small loops. XOR-ing a group in keeps a tail-free rule
 * tail-free.
 */

import {
  connectionCount,
  familyMajors,
  leafOrder,
  type EdgeContracts,
  type TileFamilyId,
  type TileTypeId,
} from '../core';

export interface ParityBasis {
  readonly classes: readonly number[];
  /** Basis groups, each a sorted list of classes. */
  readonly basis: readonly (readonly number[])[];
  /** How many tail-free rules there are, the empty one included. */
  readonly count: number;
}

/** Leaves left with an odd number of connection points. */
export function oddLeaves(
  family: TileFamilyId,
  selected: ReadonlySet<number>,
  contracts?: EdgeContracts,
): readonly TileTypeId[] {
  return leafOrder(family).filter((type) => connectionCount(family, type, selected, contracts) % 2 === 1);
}

/** Per class, which leaves it gives an odd number of points (bit i = leaf i). */
function parityColumns(family: TileFamilyId, classes: readonly number[], contracts?: EdgeContracts): number[] {
  const leaves = leafOrder(family);
  return classes.map((major) =>
    leaves.reduce(
      (bits, type, i) => (connectionCount(family, type, new Set([major]), contracts) % 2 ? bits | (1 << i) : bits),
      0,
    ),
  );
}

/** Incremental GF(2) span over class masks, remembering which inputs make each row. */
class XorSpan {
  private readonly rows: { v: number; combo: number }[] = [];
  private n = 0;

  private reduce(v: number): { v: number; combo: number } {
    let combo = 0;
    for (const r of this.rows) {
      if ((v ^ r.v) < v) {
        v ^= r.v;
        combo ^= r.combo;
      }
    }
    return { v, combo };
  }

  add(v: number): boolean {
    const r = this.reduce(v);
    if (r.v === 0) return false;
    this.rows.push({ v: r.v, combo: r.combo ^ (1 << this.n++) });
    this.rows.sort((a, b) => b.v - a.v);
    return true;
  }

  coords(v: number): number | null {
    const r = this.reduce(v);
    return r.v === 0 ? r.combo : null;
  }
}

const popcount = (v: number): number => {
  let n = 0;
  for (; v; v &= v - 1) n++;
  return n;
};

/** Masks here are over class positions in `classes`, not over majors. */
function maskOf(classes: readonly number[], majors: Iterable<number>): number | null {
  let m = 0;
  for (const c of majors) {
    const i = classes.indexOf(c);
    if (i < 0) return null;
    m |= 1 << i;
  }
  return m;
}

export function parityBasis(family: TileFamilyId, contracts?: EdgeContracts): ParityBasis {
  const classes = familyMajors(family);
  const cols = parityColumns(family, classes, contracts);
  // At most ten classes, so every rule can simply be tried.
  const kernel: number[] = [];
  for (let m = 1; m < 1 << classes.length; m++) {
    let parity = 0;
    for (let i = 0; i < classes.length; i++) if (m & (1 << i)) parity ^= cols[i];
    if (parity === 0) kernel.push(m);
  }
  kernel.sort((a, b) => popcount(a) - popcount(b) || a - b);
  const span = new XorSpan();
  const basis: number[][] = [];
  for (const m of kernel) {
    if (span.add(m)) basis.push(classes.filter((_, i) => m & (1 << i)));
  }
  return { classes, basis, count: kernel.length + 1 };
}

/**
 * How a rule decomposes over the basis: one flag per group, or null when the
 * rule is not tail-free (so it is outside their span).
 */
export function basisCoords(pb: ParityBasis, subset: Iterable<number>): readonly boolean[] | null {
  const span = new XorSpan();
  for (const g of pb.basis) span.add(maskOf(pb.classes, g)!);
  const m = maskOf(pb.classes, subset);
  if (m === null) return null;
  const combo = span.coords(m);
  return combo === null ? null : pb.basis.map((_, i) => (combo & (1 << i)) !== 0);
}

/** The rule with every class of `group` flipped: XOR keeps parity. */
export function xorGroup(subset: readonly number[], group: readonly number[]): readonly number[] {
  const next = new Set(subset);
  for (const c of group) {
    if (next.has(c)) next.delete(c);
    else next.add(c);
  }
  return [...next].sort((a, b) => a - b);
}
