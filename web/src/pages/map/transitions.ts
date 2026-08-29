/**
 * Where a tile-type transition actually happens, on the plane.
 *
 * The transition graph says the chase went `Delta → Gamma1` eleven times.
 * This answers the next question — WHERE — in the two senses that differ:
 *
 *  - **on screen**: every place in the current cut where a Delta tile hands
 *    its strand to a Gamma1 tile, whether or not any chase went through it.
 *    That is a property of the tiling and the rule, not of the walk.
 *  - **in the path**: only the crossings the traced strand actually made.
 *    A subset of the above, and usually a small one.
 *
 * Both are reported as an "elbow": the chord the strand arrives on, the
 * connection point, and the chord it leaves on — `[from, at, to]`. That draws
 * as a short length of strand straddling the seam, which is the crossing
 * itself rather than a marker floating near it.
 *
 * The on-screen scan is the expensive one — a continuation probe per chord end
 * — so it is built ONCE per cut, bucketed by ordered pair. Hovering is then a
 * map lookup, which is what makes moving the pointer around a hundred graph
 * edges affordable.
 *
 * Pure module (core + map types only): no DOM, no GL, no React.
 */

import { COS30, SIN30, isAggregateType, type Pt } from '../../core';
import { continuationAt, type ChordIndex, type StrandTrail } from './strandWalk';

/** Arrival chord end, the connection point, departure chord end. */
export type Elbow = readonly [Pt, Pt, Pt];

export interface TransitionIndex {
  /** Leaf types per side, so `from * types + to` keys a pair. */
  readonly types: number;
  /** Elbows per ordered pair; absent key = that transition is not on screen. */
  readonly byPair: ReadonlyMap<number, readonly Elbow[]>;
  /** Crossings found, before any per-pair cap. */
  readonly total: number;
  /** True when the scan stopped early at `maxElbows`. */
  readonly capped: boolean;
}

/**
 * Most crossings one scan will collect. A dense cut has one per chord end, so
 * this is a memory and time bound rather than a display one — the per-pair
 * result is much smaller.
 */
export const MAX_TRANSITION_ELBOWS = 120_000;

export const pairKey = (types: number, from: number, to: number): number => from * types + to;

/**
 * Every directed type-to-type crossing in `index`, bucketed by ordered pair.
 *
 * Each chord is probed at BOTH ends: the chord `A—B` of a tile gives the
 * crossing at `B` into whatever continues there, and the one at `A`. Two tiles
 * meeting at a point therefore contribute both directions, which is the point —
 * `Delta → Gamma1` and `Gamma1 → Delta` are different facts.
 */
export function buildTransitionIndex(
  index: ChordIndex,
  types: number,
  maxElbows: number = MAX_TRANSITION_ELBOWS,
): TransitionIndex {
  const byPair = new Map<number, Elbow[]>();
  const cut = index.cut;
  const table = index.chords;
  let total = 0;
  let capped = false;

  const add = (from: Pt, at: Pt, to: Pt, fromType: number, toType: number): void => {
    const key = pairKey(types, fromType, toType);
    let bucket = byPair.get(key);
    if (!bucket) {
      bucket = [];
      byPair.set(key, bucket);
    }
    bucket.push([from, at, to]);
    total++;
  };

  outer: for (let i = 0; i < cut.count; i++) {
    const typeByte = cut.type[i];
    if (isAggregateType(typeByte)) continue;
    const local = table.segments[typeByte];
    if (!local || local.length === 0) continue;
    const code = cut.code[i];
    const rot = code & 15;
    const mir = (code & 16) !== 0 ? -1 : 1;
    const co = COS30[rot];
    const si = SIN30[rot];
    const px = cut.pos[i * 2] + cut.origin.x;
    const py = cut.pos[i * 2 + 1] + cut.origin.y;

    for (const [la, lb] of local) {
      const a: Pt = { x: co * mir * la.x - si * la.y + px, y: si * mir * la.x + co * la.y + py };
      const b: Pt = { x: co * mir * lb.x - si * lb.y + px, y: si * mir * lb.x + co * lb.y + py };
      // Leaving by b, having arrived along a → b; and the mirror case.
      const fwd = continuationAt(index, b, a);
      if (fwd.kind === 'step') add(a, b, fwd.next, typeByte, fwd.leafType);
      const back = continuationAt(index, a, b);
      if (back.kind === 'step') add(b, a, back.next, typeByte, back.leafType);
      if (total >= maxElbows) {
        capped = true;
        break outer;
      }
    }
  }

  return { types, byPair, total, capped };
}

/**
 * The crossings the TRACED strand made from `fromType` into `toType`, in the
 * order it made them.
 *
 * The trail's chord `k` runs between points `k` and `k + 1`, so the crossing
 * from chord `k - 1` into chord `k` sits at point `k` — and the elbow is
 * simply the three points around it. No probing and no cut: this is the line
 * that was actually drawn, so it stays right even where the camera has moved
 * on and those tiles are no longer emitted.
 */
export function pathTransitions(
  trail: StrandTrail,
  fromType: number,
  toType: number,
  limit = 4_000,
): Elbow[] {
  const out: Elbow[] = [];
  const chords = trail.count - 1;
  const at = (i: number): Pt => ({ x: trail.xy[i * 2], y: trail.xy[i * 2 + 1] });
  for (let k = 1; k < chords && out.length < limit; k++) {
    if (trail.types[k - 1] !== fromType || trail.types[k] !== toType) continue;
    out.push([at(k - 1), at(k), at(k + 1)]);
  }
  return out;
}
