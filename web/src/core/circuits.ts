/**
 * Segment collection, welding, path tracing and coloring.
 *
 * `collectSegments` and `weldSegments` are ports of `analysis.collectEdges`
 * and `analysis.weldEdges` with the DOM/p5 coupling removed. The tracer is a
 * deliberate rewrite of `processCircuits` (see DESIGN.md §3.7): the old DFS
 * mishandles branch points, which do occur — three tiles can meet at a class-0
 * vertex connection point.
 */

import { transPt, type Pt } from './geom';
import { DEFAULT_CONTRACTS, connectionPoints, type EdgeContracts } from './edges';
import type { TileFamilyId, TileTypeId } from './families';
import { matchingAt } from './matchings';
import { circuitHueColor, rainbow, TAIL_COLOR } from './colors';
import type { TileInstance } from './tiles';
import { strandCurve, type StrandCurve } from './strandCurves';

export type Segment = readonly [Pt, Pt];

export interface CircuitInput {
  readonly family: TileFamilyId;
  readonly instances: readonly TileInstance[];
  /** Selected major edge classes. */
  readonly selected: ReadonlySet<number>;
  /** Matching index per leaf tile type (into `enumerateMatchings` order, see `matchingAt`). */
  readonly matchingIndexByType: Readonly<Record<string, number>>;
  readonly contracts?: EdgeContracts;
  /**
   * Chords per leaf type, in each leaf's frame, used instead of working them
   * out from `selected` / `matchingIndexByType` (see `hexRuleSpectreChords`).
   */
  readonly chords?: Readonly<Record<string, readonly Segment[]>>;
  /**
   * Chords (the very objects in `chords`) that are drawn and traced but do
   * not count towards a path's length — the Mystic's internal links when a
   * hexagon rule is drawn on Spectres, so lengths stay the hexagons'.
   */
  readonly auxChords?: Readonly<Record<string, readonly Segment[]>>;
}

/** Canonical key for a point, rounded to 3 decimals (ports `pointToKey`). */
export function pointKey(p: Pt): string {
  return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
}

/** Canonical, order-independent key for a segment (ports `edgeToKey`). */
export function segmentKey(s: Segment): string {
  const k1 = pointKey(s[0]);
  const k2 = pointKey(s[1]);
  return k1 < k2 ? `${k1}_${k2}` : `${k2}_${k1}`;
}

/**
 * Tile-local chords of one leaf type under the given subset/matching.
 * Tiles with an odd (or zero) connection count contribute nothing — the same
 * early return as the old code, which is what makes invalid subsets leave
 * tails at tile granularity.
 */
export function localChords(
  family: TileFamilyId,
  type: TileTypeId,
  selected: ReadonlySet<number>,
  matchingIndex: number,
  contracts: EdgeContracts = DEFAULT_CONTRACTS,
): readonly Segment[] {
  const pts = connectionPoints(family, type, selected, contracts).map((c) => c.pt);
  if (pts.length < 2 || pts.length % 2 !== 0) return [];
  const matching = matchingAt(pts.length, matchingIndex);
  if (!matching) return [];
  return matching.map(([a, b]) => [pts[a], pts[b]] as Segment);
}

/** Ports `collectEdges`: all chords of all instances in world coordinates. */
export function collectSegments(input: CircuitInput): readonly Segment[] {
  return collectTaggedSegments(input).segments;
}

/**
 * {@link collectSegments}, plus which of them are `auxChords`, and (with
 * `withControls`) each chord's curve handles in world coordinates.
 */
function collectTaggedSegments(
  input: CircuitInput,
  withControls = false,
): { segments: Segment[]; aux: boolean[]; controls: StrandCurve[]; owner: number[] } {
  const contracts = input.contracts ?? DEFAULT_CONTRACTS;
  const cache = new Map<string, readonly Segment[]>();
  const auxOf = new Set<Segment>();
  for (const list of Object.values(input.auxChords ?? {})) for (const seg of list) auxOf.add(seg);
  const out: Segment[] = [];
  const aux: boolean[] = [];
  const controls: StrandCurve[] = [];
  const owner: number[] = [];
  // Control points depend only on the leaf type and its local chord.
  const ctrlCache = new Map<Segment, StrandCurve>();
  input.instances.forEach((inst, at) => {
    let local = input.chords ? input.chords[inst.type] ?? [] : cache.get(inst.type);
    if (!local) {
      local = localChords(
        input.family,
        inst.type,
        input.selected,
        input.matchingIndexByType[inst.type] ?? 0,
        contracts,
      );
      cache.set(inst.type, local);
    }
    for (const seg of local) {
      out.push([transPt(inst.xform, seg[0]), transPt(inst.xform, seg[1])]);
      aux.push(auxOf.has(seg));
      owner.push(at);
      if (withControls) {
        let c = ctrlCache.get(seg);
        if (!c) {
          c = strandCurve(input.family, inst.type, seg[0], seg[1]);
          ctrlCache.set(seg, c);
        }
        controls.push({ c1: transPt(inst.xform, c.c1), c2: transPt(inst.xform, c.c2) });
      }
    }
  });
  return { segments: out, aux, controls, owner };
}

/**
 * Verbatim port of `weldEdges` — snaps near-coincident endpoints to a shared
 * representative so abutting tiles' chords join. Epsilon is in world units;
 * all transforms are rigid so tile scale never drifts.
 */
export function weldSegments(segs: readonly Segment[], epsilon = 0.05): readonly Segment[] {
  const flat: Pt[] = [];
  for (const e of segs) {
    flat.push(e[0]);
    flat.push(e[1]);
  }
  const count = flat.length;
  const representatives: (Pt | null)[] = new Array(count).fill(null);

  const indices = Array.from({ length: count }, (_, i) => i);
  indices.sort((a, b) => flat[a].x - flat[b].x);

  const epsilonSq = epsilon * epsilon;
  for (let i = 0; i < count; i++) {
    const idx = indices[i];
    if (representatives[idx]) continue;
    const p = flat[idx];
    representatives[idx] = p;
    for (let j = i + 1; j < count; j++) {
      const neighborIdx = indices[j];
      const neighbor = flat[neighborIdx];
      if (neighbor.x - p.x > epsilon) break;
      if (!representatives[neighborIdx]) {
        const dy = neighbor.y - p.y;
        if ((neighbor.x - p.x) * (neighbor.x - p.x) + dy * dy < epsilonSq) {
          representatives[neighborIdx] = p;
        }
      }
    }
  }

  const out: Segment[] = [];
  for (let i = 0; i < segs.length; i++) {
    out.push([representatives[i * 2] as Pt, representatives[i * 2 + 1] as Pt]);
  }
  return out;
}

export interface Path {
  readonly points: readonly Pt[];
  /** Closed paths do not repeat their first point at the end. */
  readonly closed: boolean;
  /**
   * Length when some of the path's segments do not count (`auxChords`);
   * absent otherwise. Read it through {@link pathLength}.
   */
  readonly length?: number;
}

/** The average of a path's points (a closed path's first point is not repeated, so each counts once). */
export function pathCentre(p: Path): Pt {
  let x = 0;
  let y = 0;
  for (const q of p.points) {
    x += q.x;
    y += q.y;
  }
  const n = Math.max(1, p.points.length);
  return { x: x / n, y: y / n };
}

/**
 * Radius, in world units (a tile edge is about 1), of the dot marking a
 * circuit's centre: grows with the square of the log of its length, so a
 * small loop gets a speck inside it and a circuit of tens of thousands of
 * tiles a blob a few tiles across.
 */
export function centreRadius(length: number): number {
  const l = Math.log(1 + Math.max(0, length));
  return CENTRE_SCALE * l * l;
}

const CENTRE_SCALE = 0.05;

/** Number of (counted) segments in a path. */
export function pathLength(p: Path): number {
  return p.length ?? (p.closed ? p.points.length : p.points.length - 1);
}

export function pathSegments(p: Path): readonly Segment[] {
  const out: Segment[] = [];
  const n = p.points.length;
  const last = p.closed ? n : n - 1;
  for (let i = 0; i < last; i++) out.push([p.points[i], p.points[(i + 1) % n]]);
  return out;
}

export interface TraceResult {
  readonly circuits: readonly Path[];
  readonly tails: readonly Path[];
  /** Weld-points where three or more segment ends meet. */
  readonly junctionCount: number;
  /** Per circuit and per tail, its segments in order: indices into the segments traced (`pathSegments` order). */
  readonly circuitSegs: readonly Int32Array[];
  readonly tailSegs: readonly Int32Array[];
}

interface Incidence {
  readonly seg: number;
  readonly other: string;
}

/**
 * Junction-safe tracer: chains are walked from every degree-1 and degree->=3
 * node without passing through a junction; whatever is left over consists of
 * pure degree-2 cycles.
 */
export function tracePaths(segs: readonly Segment[]): TraceResult {
  const coords = new Map<string, Pt>();
  const adj = new Map<string, Incidence[]>();

  const usable: { a: string; b: string; i: number }[] = [];
  for (let i = 0; i < segs.length; i++) {
    const [p1, p2] = segs[i];
    const k1 = pointKey(p1);
    const k2 = pointKey(p2);
    if (k1 === k2) continue; // degenerate chord; contributes nothing
    coords.set(k1, p1);
    coords.set(k2, p2);
    const si = usable.length;
    usable.push({ a: k1, b: k2, i });
    if (!adj.has(k1)) adj.set(k1, []);
    if (!adj.has(k2)) adj.set(k2, []);
    adj.get(k1)!.push({ seg: si, other: k2 });
    adj.get(k2)!.push({ seg: si, other: k1 });
  }

  const used = new Array<boolean>(usable.length).fill(false);
  const degree = (k: string): number => adj.get(k)?.length ?? 0;

  let junctionCount = 0;
  for (const inc of adj.values()) {
    if (inc.length >= 3) junctionCount++;
  }

  const circuits: Path[] = [];
  const tails: Path[] = [];
  const circuitSegs: Int32Array[] = [];
  const tailSegs: Int32Array[] = [];

  const walkFrom = (startKey: string, startSeg: number): { path: Path; segs: Int32Array } => {
    const keys: string[] = [startKey];
    const along: number[] = [];
    let cur = startKey;
    let segIdx = startSeg;
    for (;;) {
      used[segIdx] = true;
      const s = usable[segIdx];
      along.push(s.i);
      const next = s.a === cur ? s.b : s.a;
      keys.push(next);
      if (next === startKey) break; // closed loop
      if (degree(next) !== 2) break; // hit an endpoint or a junction
      const cont = adj.get(next)!.find((i) => !used[i.seg]);
      if (!cont) break;
      cur = next;
      segIdx = cont.seg;
    }
    const closed = keys.length > 2 && keys[0] === keys[keys.length - 1];
    const pts = (closed ? keys.slice(0, -1) : keys).map((k) => coords.get(k) as Pt);
    return { path: { points: pts, closed }, segs: Int32Array.from(along) };
  };
  const keep = ({ path, segs }: { path: Path; segs: Int32Array }): void => {
    (path.closed ? circuits : tails).push(path);
    (path.closed ? circuitSegs : tailSegs).push(segs);
  };

  // 1. chains anchored at endpoints and junctions
  for (const [key, inc] of adj) {
    if (inc.length === 2) continue;
    for (const i of inc) {
      if (used[i.seg]) continue;
      keep(walkFrom(key, i.seg));
    }
  }

  // 2. everything still unused is a pure cycle of degree-2 nodes
  for (let i = 0; i < usable.length; i++) {
    if (used[i]) continue;
    keep(walkFrom(usable[i].a, i));
  }

  return { circuits, tails, junctionCount, circuitSegs, tailSegs };
}

export interface CircuitAnalysis {
  readonly circuits: readonly Path[];
  readonly tails: readonly Path[];
  readonly junctionCount: number;
  readonly circuitsByLength: ReadonlyMap<number, readonly Path[]>;
  readonly tailsByLength: ReadonlyMap<number, readonly Path[]>;
  /** segmentKey -> css color */
  readonly segmentColor: ReadonlyMap<string, string>;
  readonly circuitColorByLength: ReadonlyMap<number, string>;
  /** The welded segments the analysis ran on (handy for renderers). */
  readonly segments: readonly Segment[];
  /** segmentKey -> curve handles, when asked for with `curved`. */
  readonly segmentControl?: ReadonlyMap<string, StrandCurve>;
  /**
   * With `loopVectors`: each circuit's count vector, aligned with `circuits`:
   * how many times it crosses an edge of each class.
   */
  readonly circuitVectors?: readonly Readonly<Record<number, number>>[];
  /**
   * With `pathTiles`: per circuit and per tail, the tile each counted segment
   * lies in, in order along the path (indices into `instances`).
   */
  readonly circuitTiles?: readonly Int32Array[];
  readonly tailTiles?: readonly Int32Array[];
}

export interface AnalyzeOptions {
  readonly rainbowTails?: boolean;
  readonly epsilon?: number;
  /** Also return each segment's curve handles (`segmentControl`). */
  readonly curved?: boolean;
  /** Also return each circuit's count vector (`circuitVectors`). */
  readonly loopVectors?: boolean;
  /** Also return the tiles each path runs through (`circuitTiles`, `tailTiles`). */
  readonly pathTiles?: boolean;
}

/** Ports `analyzeAndColor` (collect -> weld -> trace -> color), p5-free. */
export function analyze(input: CircuitInput, opts: AnalyzeOptions = {}): CircuitAnalysis {
  const tagged = collectTaggedSegments(input, opts.curved ?? false);
  const segments = weldSegments(tagged.segments, opts.epsilon ?? 0.05);
  const segmentControl = opts.curved ? new Map<string, StrandCurve>() : undefined;
  if (segmentControl) segments.forEach((seg, i) => segmentControl.set(segmentKey(seg), tagged.controls[i]));
  const traced = tracePaths(segments);
  const { junctionCount } = traced;
  let { circuits, tails } = traced;
  if (tagged.aux.includes(true)) {
    const auxKeys = new Set<string>();
    segments.forEach((seg, i) => {
      if (tagged.aux[i]) auxKeys.add(segmentKey(seg));
    });
    const recount = (p: Path): Path => {
      const skip = pathSegments(p).filter((seg) => auxKeys.has(segmentKey(seg))).length;
      return skip ? { ...p, length: pathLength(p) - skip } : p;
    };
    circuits = circuits.map(recount);
    tails = tails.map(recount);
  }

  const circuitsByLength = groupByLength(circuits);
  const tailsByLength = groupByLength(tails);

  // One hue per distinct circuit length, stepping 40 degrees (analysis.ts:257).
  const circuitColorByLength = new Map<number, string>();
  const lengths = [...circuitsByLength.keys()].sort((a, b) => a - b);
  lengths.forEach((len, i) => circuitColorByLength.set(len, circuitHueColor(i)));

  const segmentColor = new Map<string, string>();
  for (const [len, list] of circuitsByLength) {
    const color = circuitColorByLength.get(len) as string;
    for (const path of list) {
      for (const seg of pathSegments(path)) segmentColor.set(segmentKey(seg), color);
    }
  }
  for (const path of tails) {
    const segs = pathSegments(path);
    segs.forEach((seg, i) => {
      const color = opts.rainbowTails
        ? rainbow(segs.length > 1 ? i / (segs.length - 1) : 0)
        : TAIL_COLOR;
      segmentColor.set(segmentKey(seg), color);
    });
  }

  return {
    circuits,
    tails,
    junctionCount,
    circuitsByLength,
    tailsByLength,
    segmentColor,
    circuitColorByLength,
    segments,
    segmentControl,
    ...(opts.loopVectors && !input.chords ? { circuitVectors: loopVectors(input, circuits) } : {}),
    ...(opts.pathTiles
      ? {
          circuitTiles: traced.circuitSegs.map((segs) => tilesAlong(segs, tagged.owner, tagged.aux)),
          tailTiles: traced.tailSegs.map((segs) => tilesAlong(segs, tagged.owner, tagged.aux)),
        }
      : {}),
  };
}

/** The tiles a path's counted segments lie in, in order. */
function tilesAlong(segs: Int32Array, owner: readonly number[], aux: readonly boolean[]): Int32Array {
  const out: number[] = [];
  for (const i of segs) if (!aux[i]) out.push(owner[i]);
  return Int32Array.from(out);
}

/** Each closed circuit's crossings per edge class (its points are its crossings, once each). */
function loopVectors(input: CircuitInput, circuits: readonly Path[]): Readonly<Record<number, number>>[] {
  const contracts = input.contracts ?? DEFAULT_CONTRACTS;
  const local = new Map<string, readonly { pt: Pt; major: number }[]>();
  const classAt = new Map<string, number>();
  for (const inst of input.instances) {
    let cps = local.get(inst.type);
    if (!cps) {
      cps = connectionPoints(input.family, inst.type, input.selected, contracts).map((c) => ({ pt: c.pt, major: c.edge.major }));
      local.set(inst.type, cps);
    }
    for (const c of cps) classAt.set(pointKey(transPt(inst.xform, c.pt)), c.major);
  }
  return circuits.map((p) => {
    const v: Record<number, number> = {};
    for (const q of p.points) {
      const k = classAt.get(pointKey(q));
      if (k !== undefined) v[k] = (v[k] ?? 0) + 1;
    }
    return v;
  });
}

function groupByLength(paths: readonly Path[]): ReadonlyMap<number, readonly Path[]> {
  const out = new Map<number, Path[]>();
  for (const p of paths) {
    const len = pathLength(p);
    const list = out.get(len);
    if (list) list.push(p);
    else out.set(len, [p]);
  }
  return out;
}

/** Counts by length, e.g. for the stats summary. */
export function lengthHistogram(paths: readonly Path[]): ReadonlyMap<number, number> {
  const out = new Map<number, number>();
  for (const p of paths) {
    const len = pathLength(p);
    out.set(len, (out.get(len) ?? 0) + 1);
  }
  return out;
}
