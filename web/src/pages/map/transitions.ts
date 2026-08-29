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
 * Every leaf chord in the cut, in world coordinates, with the leaf type it
 * belongs to. Return false from `cb` to stop early.
 *
 * The instance transform is the same one the renderer and the walk use — a
 * rotation from the 12-step table, an optional mirror, then the instance
 * position added to the cut's origin. Written once here because two scans
 * need it: the crossing index below, and the per-type chord scan.
 */
export function forEachWorldChord(
  index: ChordIndex,
  cb: (a: Pt, b: Pt, leafType: number) => boolean | void,
): void {
  const cut = index.cut;
  const table = index.chords;
  for (let i = 0; i < cut.count; i++) {
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
      if (cb(a, b, typeByte) === false) return;
    }
  }
}

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

  forEachWorldChord(index, (a, b, typeByte) => {
    // Leaving by b, having arrived along a → b; and the mirror case.
    const fwd = continuationAt(index, b, a);
    if (fwd.kind === 'step') add(a, b, fwd.next, typeByte, fwd.leafType);
    const back = continuationAt(index, a, b);
    if (back.kind === 'step') add(b, a, back.next, typeByte, back.leafType);
    if (total >= maxElbows) {
      capped = true;
      return false;
    }
    return true;
  });

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

/**
 * What the graph panel has picked out. Three shapes, because three questions
 * get asked of the same drawing:
 *
 *  - `pair`  — one directed transition, `Delta → Gamma1`: the crossings.
 *  - `type`  — one tile type, `Lambda`: every strand chord inside a Lambda,
 *              which is what "all the edges for Lambda" means on the tiling.
 *  - `chain` — a run of types the walk made in order, `Phi Gamma2 Gamma1 Xi`:
 *              every place the path spelled that sequence out.
 */
export type GraphSelection =
  | { readonly kind: 'pair'; readonly from: number; readonly to: number }
  | { readonly kind: 'type'; readonly type: number }
  | { readonly kind: 'chain'; readonly types: readonly number[] };

/** Stable identity for a selection — cheap to compare, safe as an effect dep. */
export function selectionKey(sel: GraphSelection | null | undefined): string {
  if (!sel) return '';
  if (sel.kind === 'pair') return `p:${sel.from}>${sel.to}`;
  if (sel.kind === 'type') return `t:${sel.type}`;
  return `c:${sel.types.join(',')}`;
}

/** A run of the strand, in world coordinates — two points or more. */
export type Polyline = readonly Pt[];

/**
 * Half-open chord ranges `[from, to)`, merged where they touch or overlap.
 *
 * Adjacent matches are one piece of line, not two: three Lambdas in a row draw
 * as one four-point run rather than three overlapping two-point ones. That is
 * both what it looks like on the tiling and a third of the draw calls.
 */
function mergeRuns(runs: readonly (readonly [number, number])[]): [number, number][] {
  const out: [number, number][] = [];
  for (const [a, b] of runs) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** Points `from`..`to` of the trail (inclusive), as world coordinates. */
function slice(trail: StrandTrail, from: number, to: number): Polyline {
  const out: Pt[] = [];
  for (let i = from; i <= to; i++) out.push({ x: trail.xy[i * 2], y: trail.xy[i * 2 + 1] });
  return out;
}

/**
 * Every chord of `leafType` the traced strand crossed, as runs of line.
 *
 * Chord `k` spans trail points `k` and `k + 1`, so a run of chords
 * `[a, b)` is the points `a`..`b`.
 */
export function pathTypeChords(trail: StrandTrail, leafType: number, limit = 20_000): Polyline[] {
  const chords = trail.count - 1;
  const runs: [number, number][] = [];
  for (let k = 0; k < chords && runs.length < limit; k++) {
    if (trail.types[k] === leafType) runs.push([k, k + 1]);
  }
  return mergeRuns(runs).map(([a, b]) => slice(trail, a, b));
}

/**
 * Every chord of `leafType` in the current cut, walked or not — the on-screen
 * answer to "where are the Lambdas?". One pass over the cut, no probing.
 */
export function screenTypeChords(
  index: ChordIndex,
  leafType: number,
  limit = 40_000,
): Polyline[] {
  const out: Polyline[] = [];
  forEachWorldChord(index, (a, b, typeByte) => {
    if (typeByte !== leafType) return true;
    out.push([a, b]);
    return out.length < limit;
  });
  return out;
}

/**
 * Every place the traced strand spelled out `seq`, as runs of line.
 *
 * Overlapping occurrences merge — `Phi Phi Phi` contains two `Phi Phi`s that
 * share a tile, and drawing them as one three-tile run is both honest about
 * the line and cheaper. The ranked list is where the COUNT is read; this is
 * where the shape is.
 */
export function pathChains(
  trail: StrandTrail,
  seq: readonly number[],
  limit = 20_000,
): Polyline[] {
  const L = seq.length;
  if (L === 0) return [];
  const chords = trail.count - 1;
  const runs: [number, number][] = [];
  outer: for (let k = 0; k + L <= chords && runs.length < limit; k++) {
    for (let j = 0; j < L; j++) if (trail.types[k + j] !== seq[j]) continue outer;
    runs.push([k, k + L]);
  }
  return mergeRuns(runs).map(([a, b]) => slice(trail, a, b));
}

/** One distinct run of tile types the path took, and how often it took it. */
export interface Chain {
  readonly types: readonly number[];
  readonly count: number;
}

/**
 * How often each run of `length` consecutive tile types appears in `types`,
 * commonest first.
 *
 * Every window is counted, overlaps included: `A A A` holds two `A A`s, which
 * is the answer to "how often does this length-2 section show up" — the
 * alternative (non-overlapping tiling of the path) would depend on where you
 * started counting.
 *
 * Keys are packed base-`radix` integers while they fit exactly in a double
 * (a chase speaks ten leaf types, so that is a 15-tile run); longer runs fall
 * back to a string key. The packed path is what keeps this affordable to
 * re-run on a walking chase.
 */
export function chainCounts(
  types: ArrayLike<number>,
  length: number,
  radix = 10,
): Chain[] {
  const L = Math.floor(length);
  const n = types.length;
  if (L < 1 || n < L) return [];

  const packed = L <= Math.floor(Math.log(Number.MAX_SAFE_INTEGER) / Math.log(radix));
  const seen = new Map<number | string, { at: number; count: number }>();

  if (packed) {
    const drop = radix ** (L - 1);
    let key = 0;
    for (let i = 0; i < n; i++) {
      key = (key % drop) * radix + types[i];
      if (i < L - 1) continue;
      const at = i - L + 1;
      const hit = seen.get(key);
      if (hit) hit.count++;
      else seen.set(key, { at, count: 1 });
    }
  } else {
    for (let at = 0; at + L <= n; at++) {
      let key = '';
      for (let j = 0; j < L; j++) key += String.fromCharCode(types[at + j]);
      const hit = seen.get(key);
      if (hit) hit.count++;
      else seen.set(key, { at, count: 1 });
    }
  }

  const out: Chain[] = [];
  for (const { at, count } of seen.values()) {
    const seq: number[] = [];
    for (let j = 0; j < L; j++) seq.push(types[at + j]);
    out.push({ types: seq, count });
  }
  // Commonest first; ties broken by the sequence itself so the list does not
  // reshuffle under a reader between two refreshes of the same chase.
  out.sort((a, b) => b.count - a.count || compareSeq(a.types, b.types));
  return out;
}

function compareSeq(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length && i < b.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}
