/**
 * Infinite lines: open strands that a repeating ancestry never closes.
 *
 * A border place of a level-m supertile has a **border path**: the slot of
 * the child it sits on, then that child's slot, and so on down to the tile,
 * then the tile's edge (`SparseRoutes.deep`, digit by digit). Take an arc of
 * a supertile of type X, and follow it up a repeating ancestry (`Cycle`, q
 * levels a turn) to the arc of X it lies on q levels up. The arc is **fixed**
 * when each end's border path up there is its border path down here with one
 * block of q slots repeated where it already stood once: the ends sit at the
 * same place of the same pattern, one turn of the pattern further out. A
 * strand is certified as an infinite line when its arc is fixed for two
 * turns running, and neither end lies on an edge of X that the ancestry keeps
 * on the outline for ever (the strand would leave the union of the
 * supertiles there, into whatever surrounds it).
 *
 * In 023468 · 140000001 a level-4 Delta taken as slot 1 of a Delta at every
 * level has one such strand: its ends at levels 6, 8 and 10 are
 *
 *     1 4 4 4 5 5 | edge 4      1 4 4 4 4 4 5 5 | edge 4      1 4 4 4 4 4 4 4 5 5 | edge 4
 *
 * a Sigma's Sigma child at slot 4, once more each turn.
 */
import { edgeParts, type HexType } from '../../core';
import { typeIndex, type SparseRoutes } from '../harmonics/sparseRoutes';
import { lift, liftsOf, type Lifts } from './lifts';
import { typeFrequencies } from '../foundations/foundations';
import { cycles, placements, type Cycle } from './placements';

/** A border place's path: the slot at each level from the top down, then the tile's edge; and the type at each level from the top down to the tile. */
export interface BorderPath {
  readonly slots: readonly number[];
  readonly edge: number;
  readonly types: readonly number[];
}

/** The border path of crossing `a` of a level-n supertile of type `ti`. */
export function borderPath(R: SparseRoutes, n: number, ti: number, a: number): BorderPath {
  let d = R.deep(n, a);
  const slots: number[] = [];
  const types: number[] = [ti];
  for (let m = n; m > 0; m--) {
    const s = d % 8;
    slots.push(s);
    d = (d - s) / 8;
    types.push(R.kid(types[types.length - 1], s));
  }
  return { slots, edge: d, types };
}

/**
 * Where `hi` repeats a block of q slots of `lo`: the index in `lo`'s slots
 * after which the block (the q slots before it) stands twice in `hi`, or -1
 * when `hi` is not `lo` so pumped.
 */
export function pumpAt(lo: BorderPath, hi: BorderPath, q: number): number {
  const m = lo.slots.length;
  if (hi.slots.length !== m + q || hi.edge !== lo.edge || hi.types[0] !== lo.types[0]) return -1;
  for (let i = q; i <= m; i++) {
    let ok = true;
    for (let j = 0; ok && j < m + q; j++) {
      if (hi.slots[j] !== (j < i ? lo.slots[j] : lo.slots[j - q])) ok = false;
    }
    // the slots after the block hang from the same type
    if (ok && hi.types[i + q] === lo.types[i]) return i;
  }
  return -1;
}

/** The edges of the cycle's type that its ancestry keeps on the outline at every turn. */
export function outerEdges(c: Cycle): Set<number> {
  const turn = (e: number): number => {
    let x = e;
    for (const st of c.steps) {
      let j = -1;
      for (let k = 0; k < 6 && j < 0; k++) if (edgeParts(st.parent, k).some((p) => p.s === st.slot && p.e === x)) j = k;
      if (j < 0) return -1;
      x = j;
    }
    return x;
  };
  const out = new Set<number>();
  for (let e = 0; e < 6; e++) {
    let x = e;
    for (let k = 0; k < 7 && x >= 0; k++) x = turn(x);
    if (x >= 0) out.add(e);
  }
  return out;
}

/** An arc of a supertile: its level, type and two ends. */
export interface ArcAt {
  readonly level: number;
  readonly type: HexType;
  readonly a: number;
  readonly b: number;
}

/** Whether `hi` is `lo` one turn (q levels) further out: both ends pumped, in either order. */
export function isTurn(R: SparseRoutes, lo: ArcAt, hi: ArcAt): boolean {
  const q = hi.level - lo.level;
  const ti = typeIndex.get(lo.type)!;
  if (q <= 0 || ti !== typeIndex.get(hi.type)) return false;
  const p = (n: number, x: number) => borderPath(R, n, ti, x);
  const [la, lb, ha, hb] = [p(lo.level, lo.a), p(lo.level, lo.b), p(hi.level, hi.a), p(hi.level, hi.b)];
  return (pumpAt(la, ha, q) >= 0 && pumpAt(lb, hb, q) >= 0) || (pumpAt(la, hb, q) >= 0 && pumpAt(lb, ha, q) >= 0);
}

/** Whether an end of the arc lies on an edge the ancestry keeps on the outline. */
export function leavesUnion(R: SparseRoutes, arc: ArcAt, outer: Set<number>): boolean {
  if (!outer.size) return false;
  const ti = typeIndex.get(arc.type)!;
  return [arc.a, arc.b].some((x) => outer.has(R.locate(arc.level, ti, x) & 7));
}

/** Three arcs a turn apart along one ancestry: certified when each is the one before one turn further out and the last stays inside. */
export function certifies(R: SparseRoutes, arcs: readonly [ArcAt, ArcAt, ArcAt], outer: Set<number>): boolean {
  return isTurn(R, arcs[0], arcs[1]) && isTurn(R, arcs[1], arcs[2]) && !leavesUnion(R, arcs[2], outer);
}

/** An arc certified at a level: the cycle, and its three arcs a turn apart (lower ends' places), the last at the level. */
export interface Certified {
  readonly cycle: Cycle;
  readonly level: number;
  readonly places: readonly [number, number, number];
}

/**
 * The arcs of the full tables at `level` certified along some cycle, each
 * with the arcs two turns and one turn down that it is the fixed point of.
 * `liftsAt` gives the lifts into a supertile of a type at a level.
 */
export function certifiedArcs(R: SparseRoutes, level: number, cycles: readonly Cycle[], liftsAt: (level: number, type: string) => Lifts): Certified[] {
  const cs = R.cs;
  const out: Certified[] = [];
  for (const c of cycles) {
    const q = c.steps.length;
    const from = level - 2 * q;
    if (from < 1) continue;
    const outer = outerEdges(c);
    const T0 = cs.levels[from][c.type];
    const up = (m: number, k: number): number => {
      for (let i = 0; i < q; i++) {
        const st = c.steps[i];
        const to = lift(liftsAt(m + i + 1, st.parent), k, st.slot);
        if (!to || !('arc' in to)) return -1;
        k = to.arc;
      }
      return k;
    };
    const arcAt = (m: number, k: number): ArcAt => ({ level: m, type: c.type, a: k, b: cs.levels[m][c.type].mate(k) });
    for (const k of T0.crossings()) {
      if (T0.mate(k) < k) continue;
      const k1 = up(from, k);
      if (k1 < 0) continue;
      const k2 = up(from + q, k1);
      if (k2 >= 0 && certifies(R, [arcAt(from, k), arcAt(from + q, k1), arcAt(level, k2)], outer)) out.push({ cycle: c, level, places: [k, k1, k2] });
    }
  }
  return out;
}

/** The certified arcs by type: the lower end's place of each. */
export function lineArcs(list: readonly Certified[]): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  for (const c of list) (out.get(c.cycle.type) ?? out.set(c.cycle.type, new Set()).get(c.cycle.type)!).add(c.places[2]);
  return out;
}

/** The share of a type's copies whose next two turns of ancestry are the cycle. */
export function twoTurns(c: Cycle): number {
  const place = placements();
  let p = 1;
  let below: HexType = c.type;
  for (const st of [...c.steps, ...c.steps]) {
    p *= place[below].find((x) => x.parent === st.parent && x.slot === st.slot)!.weight;
    below = st.parent;
  }
  return p;
}

/**
 * The share of all chords on certified lines at a level, through the
 * ancestry that certifies them: the chords on each arc two turns down (as
 * a share of every chord at that level, each type weighted by its
 * frequency; `chordsAt` gives the weighted total), times the share of that
 * type's copies whose next two turns of ancestry are the cycle. All of them
 * are on a tail at the level, on a fixed arc. The chance of the cycle going
 * on for ever is nil, so in the limit the share is too.
 */
export function lineShare(R: SparseRoutes, list: readonly Certified[], chordsAt: (level: number) => number): number {
  const freq = typeFrequencies('hex');
  let out = 0;
  const seen = new Set<string>();
  for (const c of list) {
    const from = c.level - 2 * c.cycle.steps.length;
    const key = `${c.cycle.type} ${from} ${c.places[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out += (freq[typeIndex.get(c.cycle.type)!] * R.cs.levels[from][c.cycle.type].len(c.places[0]) * twoTurns(c.cycle)) / chordsAt(from);
  }
  return out;
}

/**
 * The arcs certified at every level from 0 to `top` (`certifiedArcs` over
 * every cycle of `placements.cycles`), keeping only the lifts the next
 * level needs, or reading them from `liftsAt` when given.
 */
export function linesByLevel(R: SparseRoutes, top: number, liftsAt?: (level: number, type: string) => Lifts): Certified[][] {
  const all = cycles();
  const reach = 2 * Math.max(...all.map((c) => c.steps.length));
  const kept = new Map<string, Lifts>();
  const at =
    liftsAt ??
    ((level: number, type: string): Lifts => {
      const key = `${level}/${type}`;
      let l = kept.get(key);
      if (!l) kept.set(key, (l = liftsOf(R.cs, level, type)));
      return l;
    });
  const out: Certified[][] = [];
  for (let n = 0; n <= top; n++) {
    out.push(certifiedArcs(R, n, all, at));
    for (const [key, l] of kept) if (l.level <= n - reach) kept.delete(key);
  }
  return out;
}
