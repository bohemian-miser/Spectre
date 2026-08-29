/**
 * Strand lines across an exploded supertile.
 *
 * The circuits of a patch are a fact about the WHOLE patch: a strand runs
 * from tile to tile and does not care which piece each tile belongs to. But
 * this view pushes the pieces apart, so a line drawn in patch coordinates
 * would float away from the tiles it belongs to.
 *
 * The fix rests on one property of the layout: every push is a translation
 * laid on top of a piece's true placement, and translations compose, so each
 * piece's whole displacement is a single vector ({@link Island.offset}). So
 * the strands are welded and traced where the tiling really puts them — the
 * honest topology, identical to what the rooted analysis sees — and only then
 * is each run of the path moved by the offset of the piece that owns it.
 *
 * A path that crosses from one piece to another therefore comes apart at
 * exactly that crossing, which is the thing worth seeing: those are the
 * strands that stitch the supertile's pieces into one.
 */

import {
  LEAF_ORDER,
  pathLength,
  tracePaths,
  transPt,
  weldSegments,
  type Path,
  type Pt,
  type Segment,
} from '../../core';
import type { LeafChordTable } from '../map/chords';
import { islandTilesUnexploded, type ExplodedLayout, type Island } from './explode';

/**
 * Most tiles this will weld and trace on the main thread. The pass is a few
 * tens of ms at this size; past it the view keeps its stats (the worker
 * analysis has no such limit) and simply stops drawing the lines.
 */
export const STRAND_DRAW_BUDGET = 20_000;

/** One drawable run of a strand: the part of a path inside a single piece. */
export interface StrandRun {
  /** The piece this run belongs to — `Island.id`. */
  readonly islandId: string;
  /** Exploded world coordinates, ready to draw. */
  readonly points: readonly Pt[];
  /** Segment count of the WHOLE path this run came from — its length class. */
  readonly length: number;
  /** Whether the whole path is a circuit (vs a tail). */
  readonly closed: boolean;
}

export interface ExplodedStrands {
  readonly runs: readonly StrandRun[];
  /** Distinct circuit lengths present, ascending. */
  readonly circuitLengths: readonly number[];
  readonly circuitCount: number;
  readonly tailCount: number;
  /** True when the patch was too big to weld and trace here. */
  readonly skipped: boolean;
  readonly tileCount: number;
}

const EMPTY: ExplodedStrands = Object.freeze({
  runs: Object.freeze([]) as readonly StrandRun[],
  circuitLengths: Object.freeze([]) as readonly number[],
  circuitCount: 0,
  tailCount: 0,
  skipped: false,
  tileCount: 0,
});

/**
 * Chords of every tile of every drawn piece, in TRUE (unexploded) world
 * coordinates, with the index of the piece each one belongs to.
 */
function collectSegments(
  islands: readonly Island[],
  chords: LeafChordTable,
): { segs: Segment[]; owner: number[] } {
  const segs: Segment[] = [];
  const owner: number[] = [];
  // `segments` is indexed in LEAF_ORDER, which is what the engine's type byte
  // means elsewhere; here the tiles name their type, so map it once per type.
  const indexOfType = new Map<string, number>(LEAF_ORDER.map((t, i) => [t, i]));
  islands.forEach((island, islandIndex) => {
    for (const inst of islandTilesUnexploded(island)) {
      const local = chords.segments[indexOfType.get(inst.type) ?? -1];
      if (!local || local.length === 0) continue;
      for (const [a, b] of local) {
        segs.push([transPt(inst.xform, a), transPt(inst.xform, b)]);
        owner.push(islandIndex);
      }
    }
  });
  return { segs, owner };
}

/**
 * Split one traced path into runs of consecutive segments owned by the same
 * piece, each moved by that piece's offset.
 *
 * `welded` shares its point OBJECTS with what the tracer handed back (welding
 * replaces every endpoint with one representative, and the tracer carries
 * those same objects into its paths), so a segment is identified by identity
 * rather than by comparing coordinates — no epsilon, no ambiguity.
 */
function runsOfPath(
  path: Path,
  segmentAt: Map<Pt, Map<Pt, number>>,
  owner: readonly number[],
  islands: readonly Island[],
  out: StrandRun[],
): void {
  const pts = path.points;
  const n = pts.length;
  const steps = path.closed ? n : n - 1;
  if (steps < 1) return;
  const length = pathLength(path);

  let runIsland = -1;
  let run: Pt[] = [];
  const flush = (): void => {
    if (runIsland >= 0 && run.length >= 2) {
      const { x: dx, y: dy } = islands[runIsland].offset;
      out.push({
        islandId: islands[runIsland].id,
        points: run.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        length,
        closed: path.closed,
      });
    }
    run = [];
  };

  for (let i = 0; i < steps; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const segIndex = segmentAt.get(a)?.get(b);
    const island = segIndex === undefined ? -1 : owner[segIndex];
    if (island !== runIsland) {
      flush();
      runIsland = island;
      if (island >= 0) run.push(a);
    }
    if (island >= 0) run.push(b);
  }
  flush();
}

/**
 * Weld and trace the strands of an exploded layout, returning them cut into
 * per-piece runs. Returns `skipped` when the patch is past
 * {@link STRAND_DRAW_BUDGET}; the caller says so rather than drawing a lie.
 */
export function buildExplodedStrands(
  layout: ExplodedLayout,
  chords: LeafChordTable | null,
): ExplodedStrands {
  if (!chords || chords.chordCount === 0) return EMPTY;
  if (layout.tileCount > STRAND_DRAW_BUDGET) {
    return { ...EMPTY, skipped: true, tileCount: layout.tileCount };
  }

  const { segs, owner } = collectSegments(layout.leaves, chords);
  if (segs.length === 0) return { ...EMPTY, tileCount: layout.tileCount };

  // Welding returns one segment per input segment, in order, so `owner` still
  // lines up with it.
  const welded = weldSegments(segs);
  const segmentAt = new Map<Pt, Map<Pt, number>>();
  const link = (a: Pt, b: Pt, i: number): void => {
    let inner = segmentAt.get(a);
    if (!inner) {
      inner = new Map<Pt, number>();
      segmentAt.set(a, inner);
    }
    inner.set(b, i);
  };
  welded.forEach(([a, b], i) => {
    link(a, b, i);
    link(b, a, i); // a path may traverse the chord either way round
  });

  const { circuits, tails } = tracePaths(welded);
  const runs: StrandRun[] = [];
  for (const path of circuits) runsOfPath(path, segmentAt, owner, layout.leaves, runs);
  for (const path of tails) runsOfPath(path, segmentAt, owner, layout.leaves, runs);

  const lengths = new Set<number>();
  for (const c of circuits) lengths.add(pathLength(c));

  return {
    runs,
    circuitLengths: [...lengths].sort((a, b) => a - b),
    circuitCount: circuits.length,
    tailCount: tails.length,
    skipped: false,
    tileCount: layout.tileCount,
  };
}
