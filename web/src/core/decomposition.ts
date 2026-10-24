/**
 * How a rule's pairings split its strands into independent factors, for any
 * family and any number of strands per class: the Multi-edge page's
 * decomposition (`multiEdge.ts`), generalised to the Explorer.
 *
 * A strand position on the edges of class k is a *lane*. Crossing a seam,
 * slot i on the `+` side is slot n − 1 − i on the `−` side, so counting from
 * the `+` side names each lane once; class 0 glues to itself, so a lane and
 * its mirror are one. Each tile's pairing joins lanes; a group of joined lanes
 * is a drawing in its own right (keep those lanes everywhere, drop the rest),
 * so it is a valid rule, a *factor*, and the factors' counts add up to the
 * rule's. One tile joining two classes merges their factors everywhere, even
 * where most of the loops you see stay within one class.
 */

import { connectionCount, connectionPoints, strandCount, type EdgeContracts } from './edges';
import { leafOrder, type TileFamilyId, type TileTypeId } from './families';
import { matchingAt } from './matchings';

/** Strands per class, as a sparse record (absent = 0). */
export type ClassCounts = Readonly<Record<number, number>>;

export interface RuleFactor {
  readonly counts: ClassCounts;
  /** No pairing could split it further (undefined when too big to check). */
  readonly atom?: boolean;
}

export interface RuleDecomposition {
  /** Heaviest first. */
  readonly factors: readonly RuleFactor[];
  /** Factor index of each tile type's connection points, in `connectionPoints` order. */
  readonly pointFactor: Readonly<Record<string, readonly number[]>>;
  /** Each tile type's chords as joins between classes, e.g. '1–5 ×2'; mixed ones join different classes. */
  readonly joins: readonly { readonly type: TileTypeId; readonly text: string; readonly mixed: boolean }[];
}

/** Each connection point's class and lane, in `connectionPoints` order. */
export function pointLanes(
  family: TileFamilyId,
  type: TileTypeId,
  selected: ReadonlySet<number>,
  contracts?: EdgeContracts,
): readonly { readonly major: number; readonly lane: number }[] {
  const cps = connectionPoints(family, type, selected, contracts);
  const out: { major: number; lane: number }[] = [];
  for (let i = 0; i < cps.length; i++) {
    const seam = cps[i].edge;
    // A seam's points are consecutive; the slot is the place in that run.
    let slot = 0;
    while (i - slot - 1 >= 0 && cps[i - slot - 1].edge.id === seam.id) slot++;
    const n = strandCount(contracts, seam.major);
    const flip = n - 1 - slot;
    const lane = seam.major === 0 ? Math.min(slot, flip) : seam.sign > 0 ? slot : flip;
    out.push({ major: seam.major, lane });
  }
  return out;
}

/** A class-count record as text: '1 2×2 5'. */
export function formatCounts(c: ClassCounts): string {
  const parts = Object.entries(c)
    .filter(([, n]) => n > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([k, n]) => (n > 1 ? `${k}×${n}` : k));
  return parts.join(' ') || '∅';
}

/** Every tile has an even number of strand ends under these counts. */
export function countsValid(family: TileFamilyId, c: ClassCounts): boolean {
  const majors = Object.keys(c).map(Number).filter((k) => c[k] > 0);
  if (!majors.length) return false;
  const contracts = Object.fromEntries(majors.map((k) => [k, { minor: 0, t: 0.5, count: c[k] }]));
  const sel = new Set(majors);
  return leafOrder(family).every((t) => connectionCount(family, t, sel, contracts) % 2 === 0);
}

const atomCache = new Map<string, boolean | undefined>();
/** Sub-count vectors to try before giving up on the atom check. */
const ATOM_SEARCH_MAX = 4096;

/** No smaller non-empty valid counts fit inside c with a valid remainder (undefined if too many to try). */
export function countsAtom(family: TileFamilyId, c: ClassCounts): boolean | undefined {
  const key = `${family}|${formatCounts(c)}`;
  if (atomCache.has(key)) return atomCache.get(key);
  const majors = Object.keys(c).map(Number).filter((k) => c[k] > 0).sort((a, b) => a - b);
  const sizes = majors.map((k) => c[k] + 1);
  const total = sizes.reduce((a, b) => a * b, 1);
  let result: boolean | undefined = true;
  if (total > ATOM_SEARCH_MAX) result = undefined;
  else {
    for (let code = 1; code < total - 1; code++) {
      let r = code;
      const sub: Record<number, number> = {};
      majors.forEach((k, i) => {
        sub[k] = r % sizes[i];
        r = Math.floor(r / sizes[i]);
      });
      if (!countsValid(family, sub)) continue;
      const rest = Object.fromEntries(majors.map((k) => [k, c[k] - sub[k]]));
      if (countsValid(family, rest)) {
        result = false;
        break;
      }
    }
  }
  atomCache.set(key, result);
  return result;
}

/**
 * The factors a rule's pairings force. `matching` is the full matching index
 * per leaf type in `leafOrder(family)` order. Tiles with an odd number of
 * points (no pairing) contribute no joins.
 */
export function decomposeRule(
  family: TileFamilyId,
  subset: readonly number[],
  matching: readonly number[],
  contracts?: EdgeContracts,
): RuleDecomposition {
  const selected = new Set(subset);
  const id = (major: number, lane: number) => `${major}:${lane}`;
  const parent = new Map<string, string>();
  const find = (a: string): string => {
    let r = a;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(a, r);
    return r;
  };
  for (const k of subset) {
    const n = strandCount(contracts, k);
    for (let s = 0; s < n; s++) {
      const l = k === 0 ? Math.min(s, n - 1 - s) : s;
      parent.set(id(k, l), id(k, l));
    }
  }
  const order = leafOrder(family);
  const lanesByType: Record<string, readonly { major: number; lane: number }[]> = {};
  const joins: { type: TileTypeId; text: string; mixed: boolean }[] = [];
  order.forEach((type, i) => {
    const lanes = pointLanes(family, type, selected, contracts);
    lanesByType[type] = lanes;
    if (lanes.length < 2 || lanes.length % 2 !== 0) return;
    const m = matchingAt(lanes.length, matching[i] ?? 0);
    if (!m) return;
    const tally = new Map<string, number>();
    let mixed = false;
    for (const [a, b] of m) {
      parent.set(find(id(lanes[a].major, lanes[a].lane)), find(id(lanes[b].major, lanes[b].lane)));
      const [x, y] = [lanes[a].major, lanes[b].major].sort((p, q) => p - q);
      if (x !== y) mixed = true;
      tally.set(`${x}–${y}`, (tally.get(`${x}–${y}`) ?? 0) + 1);
    }
    joins.push({ type, mixed, text: [...tally].map(([j, n]) => (n > 1 ? `${j} ×${n}` : j)).join(', ') });
  });
  // Each slot (not lane) counts once toward its group, so a class-0 mirror pair counts twice.
  const groups = new Map<string, Record<number, number>>();
  for (const k of subset) {
    const n = strandCount(contracts, k);
    for (let s = 0; s < n; s++) {
      const r = find(id(k, k === 0 ? Math.min(s, n - 1 - s) : s));
      const g = groups.get(r) ?? {};
      g[k] = (g[k] ?? 0) + 1;
      groups.set(r, g);
    }
  }
  const weight = (c: ClassCounts) => Object.values(c).reduce((a, b) => a + b, 0);
  const roots = [...groups.keys()].sort((a, b) => weight(groups.get(b)!) - weight(groups.get(a)!) || formatCounts(groups.get(a)!).localeCompare(formatCounts(groups.get(b)!)));
  const index = new Map(roots.map((r, i) => [r, i]));
  return {
    factors: roots.map((r) => ({ counts: groups.get(r)!, atom: countsAtom(family, groups.get(r)!) })),
    pointFactor: Object.fromEntries(order.map((t) => [t, lanesByType[t].map((l) => index.get(find(id(l.major, l.lane)))!)])),
    joins,
  };
}
