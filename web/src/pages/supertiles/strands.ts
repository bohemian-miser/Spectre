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
 *
 * Each chord is drawn as the curve `strandCurve` gives it (the table's
 * `controls`, when built curved), and remembers its tile, so a picked circuit
 * can say which tiles and pieces it runs through.
 */

import {
  leafOrder,
  orientCurve,
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
  /** The whole path it is part of: an index into {@link ExplodedStrands.paths}. */
  readonly path: number;
  /** Exploded world coordinates, ready to draw. */
  readonly points: readonly Pt[];
  /**
   * Curve handles per step of `points`, in exploded coordinates; absent when
   * the chord table was built straight.
   */
  readonly curves?: readonly (readonly [Pt, Pt])[];
  /** Segment count of the WHOLE path this run came from — its length class. */
  readonly length: number;
  /** Whether the whole path is a circuit (vs a tail). */
  readonly closed: boolean;
}

/** One whole traced path, across every piece it runs through. */
export interface StrandPath {
  readonly closed: boolean;
  /** Chords along it, as the analysis counts them. */
  readonly length: number;
  /** Slot paths of the tiles it runs through, each once, in order. */
  readonly tiles: readonly string[];
  /** Ids of the pieces it runs through, each once, in order. */
  readonly pieces: readonly string[];
}

export interface ExplodedStrands {
  readonly runs: readonly StrandRun[];
  /** Circuits first, then open strands; `StrandRun.path` indexes this. */
  readonly paths: readonly StrandPath[];
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
  paths: Object.freeze([]) as readonly StrandPath[],
  circuitLengths: Object.freeze([]) as readonly number[],
  circuitCount: 0,
  tailCount: 0,
  skipped: false,
  tileCount: 0,
});

/** What a chord carries besides its ends: its piece, its tile, its curve. */
interface ChordMeta {
  readonly island: number;
  /** Slot path of its tile from the root. */
  readonly tile: string;
  /** Curve handles in TRUE world coordinates, or null when drawn straight. */
  readonly curve: { readonly c1: Pt; readonly c2: Pt } | null;
}

/**
 * Chords of every tile of every drawn piece, in TRUE (unexploded) world
 * coordinates, with what each one carries.
 */
function collectSegments(
  islands: readonly Island[],
  chords: LeafChordTable,
): { segs: Segment[]; meta: ChordMeta[] } {
  const segs: Segment[] = [];
  const meta: ChordMeta[] = [];
  // `segments` is indexed in the family's leaf order, which is what the
  // engine's type byte means elsewhere; here the tiles name their type, so
  // map it once per type.
  const indexOfType = new Map<string, number>(leafOrder(chords.family).map((t, i) => [t, i]));
  islands.forEach((island, islandIndex) => {
    for (const inst of islandTilesUnexploded(island)) {
      const at = indexOfType.get(inst.type) ?? -1;
      const local = chords.segments[at];
      if (!local || local.length === 0) continue;
      const controls = chords.controls?.[at];
      const tile = island.id === '' ? inst.id : inst.id === '' ? island.id : `${island.id}.${inst.id}`;
      local.forEach(([a, b], k) => {
        segs.push([transPt(inst.xform, a), transPt(inst.xform, b)]);
        const c = controls?.[k];
        meta.push({
          island: islandIndex,
          tile,
          curve: c ? { c1: transPt(inst.xform, c.c1), c2: transPt(inst.xform, c.c2) } : null,
        });
      });
    }
  });
  return { segs, meta };
}

/**
 * Split one traced path into runs of consecutive segments owned by the same
 * piece, each moved by that piece's offset, and say what the whole path runs
 * through.
 *
 * `welded` shares its point OBJECTS with what the tracer handed back (welding
 * replaces every endpoint with one representative, and the tracer carries
 * those same objects into its paths), so a segment is identified by identity
 * rather than by comparing coordinates — no epsilon, no ambiguity.
 */
function runsOfPath(
  path: Path,
  pathIndex: number,
  segmentAt: Map<Pt, Map<Pt, number>>,
  meta: readonly ChordMeta[],
  islands: readonly Island[],
  out: StrandRun[],
): StrandPath {
  const pts = path.points;
  const n = pts.length;
  const steps = path.closed ? n : n - 1;
  const length = pathLength(path);
  const tiles: string[] = [];
  const pieces: string[] = [];
  const seenTiles = new Set<string>();
  const seenPieces = new Set<string>();

  let runIsland = -1;
  let run: Pt[] = [];
  let curves: (readonly [Pt, Pt])[] = [];
  let curved = true;
  const flush = (): void => {
    if (runIsland >= 0 && run.length >= 2) {
      const { x: dx, y: dy } = islands[runIsland].offset;
      const move = (p: Pt): Pt => ({ x: p.x + dx, y: p.y + dy });
      out.push({
        islandId: islands[runIsland].id,
        path: pathIndex,
        points: run.map(move),
        ...(curved ? { curves: curves.map(([c1, c2]) => [move(c1), move(c2)] as const) } : {}),
        length,
        closed: path.closed,
      });
    }
    run = [];
    curves = [];
    curved = true;
  };

  for (let i = 0; i < steps; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const segIndex = segmentAt.get(a)?.get(b);
    const m = segIndex === undefined ? undefined : meta[segIndex];
    const island = m ? m.island : -1;
    if (island !== runIsland) {
      flush();
      runIsland = island;
      if (island >= 0) run.push(a);
    }
    if (!m) continue;
    run.push(b);
    if (m.curve) curves.push(orientCurve(m.curve, a));
    else curved = false;
    if (!seenTiles.has(m.tile)) {
      seenTiles.add(m.tile);
      tiles.push(m.tile);
    }
    const piece = islands[m.island].id;
    if (!seenPieces.has(piece)) {
      seenPieces.add(piece);
      pieces.push(piece);
    }
  }
  flush();
  return { closed: path.closed, length, tiles, pieces };
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

  const { segs, meta } = collectSegments(layout.leaves, chords);
  if (segs.length === 0) return { ...EMPTY, tileCount: layout.tileCount };

  // Welding returns one segment per input segment, in order, so `meta` still
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
  const paths = [...circuits, ...tails].map((path, i) =>
    runsOfPath(path, i, segmentAt, meta, layout.leaves, runs),
  );

  const lengths = new Set<number>();
  for (const c of circuits) lengths.add(pathLength(c));

  return {
    runs,
    paths,
    circuitLengths: [...lengths].sort((a, b) => a - b),
    circuitCount: circuits.length,
    tailCount: tails.length,
    skipped: false,
    tileCount: layout.tileCount,
  };
}
