/**
 * Flow on the Explorer's circuits: give each strand the direction its edge
 * labels imply and see where it fails to balance.
 *
 * A seam labelled `+k` sends flow out of its tile, `−k` takes it in; glued
 * seams carry opposite signs, so a strand leaving one tile enters the next. A
 * class counts as directed only if the family uses both `k` and `−k` (class 0
 * never does, so it stays neutral).
 *
 * With the Explorer's own pairings fixed, every chord inside a tile is one of
 *   through — enters at one end, leaves at the other;
 *   source  — both ends send flow out;
 *   sink    — both ends take flow in;
 *   half    — one end on an undirected class, the other directed: the
 *             directed end sets the way flow runs, and only the half of the
 *             chord on the undirected end is left without a direction;
 *   neutral — both ends sit on undirected classes.
 * Where two chord ends meet across a seam with the same sign, flow collides
 * there (a sink on the edge) or splits there (a source on the edge). Through
 * and half chords then chain into runs that start at a source and end at a sink, or
 * close up into a true flow loop.
 */

import { connectionPoints, DEFAULT_CONTRACTS, parseEdgeLabel, type EdgeContracts } from './edges';
import { edgeLabels, leafOrder, type TileFamilyId, type TileTypeId } from './families';
import { transPt, type Pt } from './geom';
import { matchingAt } from './matchings';
import { pointKey, weldSegments, type Segment } from './circuits';
import type { TileInstance } from './tiles';
import { strandCurve, type StrandCurve } from './strandCurves';

export type ChordKind = 'through' | 'half' | 'source' | 'sink' | 'neutral';

export interface FlowChord {
  /** World coordinates; for a through or half chord the flow runs from `a` to `b`. */
  readonly a: Pt;
  readonly b: Pt;
  readonly kind: ChordKind;
  /** A half chord's end on the undirected class: the half of it nearer that end has no direction. */
  readonly undirectedEnd?: 'a' | 'b';
  /** The chord's curve handles, for drawing it curved. */
  readonly ctrl: StrandCurve;
}

export interface FlowRun {
  /** Indices into `chords`, in flow order. */
  readonly chords: readonly number[];
  /** A loop with no source or sink on it. */
  readonly closed: boolean;
}

export interface FlowOverlay {
  readonly chords: readonly FlowChord[];
  readonly runs: readonly FlowRun[];
  /** Run index per chord, −1 for source, sink and neutral chords. */
  readonly runOf: readonly number[];
  /**
   * Where flow starts / ends: the source (sink) chords' midpoints first, in
   * `sourceChords` (`sinkChords`) order, then any seams where ends clash.
   */
  readonly sources: readonly Pt[];
  readonly sinks: readonly Pt[];
  readonly sourceChords: readonly number[];
  readonly sinkChords: readonly number[];
}

export interface FlowOverlayInput {
  readonly family: TileFamilyId;
  readonly instances: readonly TileInstance[];
  readonly selected: ReadonlySet<number>;
  readonly matchingIndexByType: Readonly<Record<string, number>>;
  readonly contracts?: EdgeContracts;
}

const directedCache = new Map<TileFamilyId, ReadonlySet<number>>();

/** Classes the family labels both ways round (`k` and `−k`): the ones that can carry a direction. */
export function directedClasses(family: TileFamilyId): ReadonlySet<number> {
  const hit = directedCache.get(family);
  if (hit) return hit;
  const plus = new Set<number>();
  const minus = new Set<number>();
  for (const type of leafOrder(family)) {
    for (const raw of edgeLabels(family, type)) {
      const l = parseEdgeLabel(raw);
      (l.sign > 0 ? plus : minus).add(l.major);
    }
  }
  const out = new Set([...plus].filter((k) => minus.has(k)));
  directedCache.set(family, out);
  return out;
}

/** One tile type's chords, in its own frame, each end with its sign (0 = undirected). */
export function signedLocalChords(
  family: TileFamilyId,
  type: TileTypeId,
  selected: ReadonlySet<number>,
  matchingIndex: number,
  contracts: EdgeContracts = DEFAULT_CONTRACTS,
): readonly { a: Pt; b: Pt; sa: number; sb: number }[] {
  const cps = connectionPoints(family, type, selected, contracts);
  if (cps.length < 2 || cps.length % 2 !== 0) return [];
  const matching = matchingAt(cps.length, matchingIndex);
  if (!matching) return [];
  const directed = directedClasses(family);
  const sign = (i: number) => (directed.has(cps[i].edge.major) ? cps[i].edge.sign : 0);
  return matching.map(([i, j]) => ({ a: cps[i].pt, b: cps[j].pt, sa: sign(i), sb: sign(j) }));
}

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function flowOverlay(input: FlowOverlayInput): FlowOverlay {
  const contracts = input.contracts ?? DEFAULT_CONTRACTS;
  const local = new Map<string, ReturnType<typeof signedLocalChords>>();
  const raw: Segment[] = [];
  const signs: [number, number][] = [];
  const ctrls: StrandCurve[] = [];
  for (const inst of input.instances) {
    let chords = local.get(inst.type);
    if (!chords) {
      chords = signedLocalChords(input.family, inst.type, input.selected, input.matchingIndexByType[inst.type] ?? 0, contracts);
      local.set(inst.type, chords);
    }
    for (const c of chords) {
      raw.push([transPt(inst.xform, c.a), transPt(inst.xform, c.b)]);
      signs.push([c.sa, c.sb]);
      const h = strandCurve(input.family, inst.type, c.a, c.b);
      ctrls.push({ c1: transPt(inst.xform, h.c1), c2: transPt(inst.xform, h.c2) });
    }
  }
  const welded = weldSegments(raw);

  // Orient each chord: out (+) end last for a through chord.
  const chords: FlowChord[] = welded.map(([p, q], i) => {
    const [sa, sb] = signs[i];
    const ctrl = ctrls[i];
    if (sa === 0 && sb === 0) return { a: p, b: q, kind: 'neutral', ctrl };
    // One end undirected: flow leaves through a + end and enters through a − end.
    if (sa === 0) return sb > 0 ? { a: p, b: q, kind: 'half', undirectedEnd: 'a', ctrl } : { a: q, b: p, kind: 'half', undirectedEnd: 'b', ctrl };
    if (sb === 0) return sa > 0 ? { a: q, b: p, kind: 'half', undirectedEnd: 'a', ctrl } : { a: p, b: q, kind: 'half', undirectedEnd: 'b', ctrl };
    if (sa === sb) return { a: p, b: q, kind: sa > 0 ? 'source' : 'sink', ctrl };
    return sa < 0 ? { a: p, b: q, kind: 'through', ctrl } : { a: q, b: p, kind: 'through', ctrl };
  });

  // Every end at each welded point, with whether flow arrives there (an out end) or leaves.
  type End = { chord: number; arrives: boolean };
  const ends = new Map<string, End[]>();
  const add = (p: Pt, e: End) => {
    const k = pointKey(p);
    const list = ends.get(k);
    if (list) list.push(e);
    else ends.set(k, [e]);
  };
  chords.forEach((c, i) => {
    if (c.kind === 'neutral') return;
    if (c.kind === 'through') {
      add(c.b, { chord: i, arrives: true });
      add(c.a, { chord: i, arrives: false });
    } else if (c.kind === 'half') {
      // Only the directed end meets anything with a direction.
      if (c.undirectedEnd === 'a') add(c.b, { chord: i, arrives: true });
      else add(c.a, { chord: i, arrives: false });
    } else {
      // A source pushes flow into both its end points; a sink draws from both.
      add(c.a, { chord: i, arrives: c.kind === 'source' });
      add(c.b, { chord: i, arrives: c.kind === 'source' });
    }
  });

  const sourceChords = chords.flatMap((c, i) => (c.kind === 'source' ? [i] : []));
  const sinkChords = chords.flatMap((c, i) => (c.kind === 'sink' ? [i] : []));
  const sources: Pt[] = sourceChords.map((i) => mid(chords[i].a, chords[i].b));
  const sinks: Pt[] = sinkChords.map((i) => mid(chords[i].a, chords[i].b));
  // Seams where two ends meet the same way: flow piles up or splits on the edge itself.
  for (const [k, list] of ends) {
    if (list.length !== 2 || list[0].arrives !== list[1].arrives) continue;
    const [x, y] = k.split(',').map(Number);
    (list[0].arrives ? sinks : sources).push({ x, y });
  }

  // Follow through and half chords head to tail. At a point, the chord that
  // arrives hands on to the one that leaves, if there is one. A half chord
  // can only start a run (flow out of its undirected end) or end one.
  const carries = (c: FlowChord) => c.kind === 'through' || c.kind === 'half';
  const next = new Map<number, number>();
  const hasPrev = new Set<number>();
  for (const list of ends.values()) {
    if (list.length !== 2) continue;
    const inEnd = list.find((e) => e.arrives);
    const outEnd = list.find((e) => !e.arrives);
    if (!inEnd || !outEnd) continue;
    if (carries(chords[inEnd.chord]) && carries(chords[outEnd.chord])) {
      next.set(inEnd.chord, outEnd.chord);
      hasPrev.add(outEnd.chord);
    }
  }
  const runOf = chords.map(() => -1);
  const runs: FlowRun[] = [];
  const walk = (start: number) => {
    const out: number[] = [];
    let i: number | undefined = start;
    while (i !== undefined && runOf[i] === -1) {
      runOf[i] = runs.length;
      out.push(i);
      i = next.get(i);
    }
    runs.push({ chords: out, closed: i === start });
  };
  chords.forEach((c, i) => {
    if (carries(c) && !hasPrev.has(i) && runOf[i] === -1) walk(i);
  });
  chords.forEach((c, i) => {
    if (carries(c) && runOf[i] === -1) walk(i);
  });
  return { chords, runs, runOf, sources, sinks, sourceChords, sinkChords };
}
