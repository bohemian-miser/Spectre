/**
 * A circuit and the circuit it is lined up with, shown supertile for
 * supertile: B at level k + offset beside A at level k, each over the
 * outlines of the supertiles it runs through, those holding a visit the
 * other reading does not share marked; and the two expanded from their birth
 * supertiles level by level, as the raw visits (`readings.ts`).
 */
import { mul, transPt, type Affine } from '../../core';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { alignReadings, cancelBacktracksAt, expandVisits, pathOf, sameCyclic, token, topVisits, type Reading, type VisitColumns } from './readings';

/** Supertiles are drawn for a level while the circuit has at most this many raw visits there. */
export const VISIT_CAP = 400000;
/** The circuit is drawn through at most this many of its crossings at the level, evenly spaced. */
const CIRCUIT_POINTS = 20000;
/** At most this many supertiles are drawn per picture, the first the circuit enters. */
export const SUPERTILE_CAP = 600;
/** Levels are expanded while both circuits have at most this many raw visits there. */
export const ROW_CAP = 400000;
/** Visits sent per row of an expansion, of all and of those kept. */
export const ROW_SHOWN = 72;

export interface Supertile {
  /** Slot path from the birth supertile down. */
  readonly path: string;
  readonly type: string;
  /** Outline points, x, y pairs in the birth supertile's frame. */
  readonly outline: Float64Array;
  /** Whether it holds a visit the other reading does not share. */
  readonly unshared: boolean;
}

export interface Side {
  readonly level: number;
  /** Raw visits at this level. */
  readonly visits: number;
  /** Supertiles the circuit runs through; 0 when the level has more than `VISIT_CAP` visits. */
  readonly count: number;
  readonly supertiles: readonly Supertile[];
  /** The circuit at this level (each arc a chord, through at most `CIRCUIT_POINTS` crossings), x, y pairs; empty when not drawn. */
  readonly circuit: Float64Array;
}

export interface PairPicture {
  readonly k: number;
  readonly offset: number;
  /** 'same' (the readings agree), 'differs' (with the unshared visits marked), 'long' (too long to align), 'unread'. */
  readonly state: 'same' | 'differs' | 'long' | 'unread';
  readonly a: Side;
  readonly b: Side;
}

/** Per token of each reading, whether the other shares it, in the readings' own order; null when they are too long to align. */
export function sharedTokens(a: readonly string[], b: readonly string[]): { state: 'same' | 'differs' | 'long'; a: boolean[] | null; b: boolean[] | null } {
  if (sameCyclic(a, b)) return { state: 'same', a: a.map(() => true), b: b.map(() => true) };
  const al = alignReadings(a, b);
  if (!al) return { state: 'long', a: null, b: null };
  const n = b.length;
  const inB = new Array<boolean>(n).fill(false);
  al.matchedB.forEach((m, q) => {
    const i = (al.rotation + q) % n;
    inB[al.back ? n - 1 - i : i] = m;
  });
  return { state: 'differs', a: [...al.matchedA], b: inB };
}

/** A born circuit's visits at a level, with each visited supertile's place in the birth supertile's frame. */
export function visitsWithFrames(cs: CircuitShapes, c: BornCircuit, level: number): { v: VisitColumns; xform: Affine[] } {
  let v = topVisits(cs, c);
  let xform = v.slot.map((s) => cs.childOf(c.level, c.type, s).xform);
  while (v.level > level) {
    const below = expandVisits(cs, v);
    xform = below.up.map((u, i) => mul(xform[u], cs.childOf(v.level, v.type[u], below.slot[i]).xform));
    v = below;
  }
  return { v, xform };
}

/** One side of the picture: the circuit's supertiles at `level`, those holding an unshared token (by `shared`, per token of its reading) marked. */
export function sideAt(cs: CircuitShapes, c: BornCircuit, level: number, reading: Reading | undefined, shared: readonly boolean[] | null): Side {
  const visits = reading?.raw ?? Infinity;
  if (visits > VISIT_CAP) return { level, visits, count: 0, supertiles: [], circuit: new Float64Array(0) };
  const { v, xform } = visitsWithFrames(cs, c, level);
  const unshared = new Set<number>();
  if (shared) {
    const { keep } = cancelBacktracksAt(v.id, v.tiles);
    keep.forEach((i, q) => { if (!shared[q]) unshared.add(v.id[i]); });
  }
  const first = new Map<number, number>();
  v.id.forEach((id, i) => { if (!first.has(id)) first.set(id, i); });
  const depth = c.level - level;
  const supertiles: Supertile[] = [];
  for (const [id, i] of first) {
    if (supertiles.length === SUPERTILE_CAP) break;
    const pts = cs.outline(level, v.type[i]);
    const outline = new Float64Array(2 * pts.length);
    pts.forEach((p, j) => {
      const q = transPt(xform[i], p);
      outline[2 * j] = q.x;
      outline[2 * j + 1] = q.y;
    });
    supertiles.push({ path: pathOf(id, depth), type: v.type[i], outline, unshared: unshared.has(id) });
  }
  const all = cs.shape(c, level);
  const pts = all.length <= CIRCUIT_POINTS ? all : Array.from({ length: CIRCUIT_POINTS }, (_, j) => all[Math.floor((j * all.length) / CIRCUIT_POINTS)]);
  const circuit = new Float64Array(2 * pts.length);
  pts.forEach((p, j) => { circuit[2 * j] = p.x; circuit[2 * j + 1] = p.y; });
  return { level, visits: v.type.length, count: first.size, supertiles, circuit };
}

/** A at level k and B at level k + offset (offset = B's birth level less A's), each over its supertiles, unshared visits marked. */
export function pairPicture(cs: CircuitShapes, a: { circuit: BornCircuit; readings: readonly Reading[] }, b: { circuit: BornCircuit; readings: readonly Reading[] }, k: number): PairPicture {
  const offset = b.circuit.level - a.circuit.level;
  const ra = a.readings.find((r) => r.level === k);
  const rb = b.readings.find((r) => r.level === k + offset);
  const m = ra && rb ? sharedTokens(ra.tokens, rb.tokens) : null;
  return {
    k,
    offset,
    state: m?.state ?? 'unread',
    a: sideAt(cs, a.circuit, k, ra, m?.a ?? null),
    b: sideAt(cs, b.circuit, k + offset, rb, m?.b ?? null),
  };
}

export type Mark = 'cancelled' | 'shared' | 'unshared' | 'kept';

/** A visit of an expanded row: the supertile's type and slot, the visit of the row above it came from, and its mark. */
export interface Visited {
  readonly type: string;
  readonly slot: number;
  readonly up: number;
  /**
   * 'cancelled' (a backtrack, gone from the reading), 'shared' or 'unshared'
   * (whether the other circuit's reading at its level shares the visit's
   * token), or 'kept' (the readings are too long to align).
   */
  readonly mark: Mark;
}

export interface ExpandedRow {
  readonly level: number;
  readonly visits: number;
  readonly cancelled: number;
  readonly unshared: number;
  /** The first visits in order, backtracks included, and the first of those kept in the reading. */
  readonly raw: readonly Visited[];
  readonly kept: readonly Visited[];
}

/** Each visit's mark, from the reading made of its kept visits and, per token of that reading, whether the other reading shares it. */
function marksOf(v: VisitColumns, keep: Int32Array, shared: readonly boolean[] | null): Mark[] {
  const marks: Mark[] = v.type.map(() => 'cancelled');
  keep.forEach((i, q) => { marks[i] = shared ? (shared[q] ? 'shared' : 'unshared') : 'kept'; });
  return marks;
}

export interface Expansion {
  /** Rows by depth below the birth supertiles, from 1: B's level birth − depth beside A's, with whether their readings agree. */
  readonly rows: readonly { readonly depth: number; readonly same: boolean; readonly a: ExpandedRow; readonly b: ExpandedRow }[];
  /** Whether one level more can be expanded within `ROW_CAP`. */
  readonly more: boolean;
}

/** A and B expanded from their birth supertiles down to `depth` levels below, row against row. */
export function expansion(cs: CircuitShapes, a: BornCircuit, b: BornCircuit, depth: number, shown = Infinity): Expansion {
  const rows: Expansion['rows'][number][] = [];
  let va = topVisits(cs, a);
  let vb = topVisits(cs, b);
  const lowest = Math.min(a.level, b.level);
  for (let d = 1; d <= Math.min(depth, lowest); d++) {
    if (d > 1) {
      if (Math.max(estimate(cs, va), estimate(cs, vb)) > ROW_CAP) break;
      va = expandVisits(cs, va);
      vb = expandVisits(cs, vb);
    }
    const read = (v: VisitColumns, birth: number) => {
      const { keep } = cancelBacktracksAt(v.id, v.tiles);
      return { keep, tokens: Array.from(keep, (i) => token({ id: '', type: v.type[i], slot: v.slot[i], parent: v.parent[i], tiles: 0 }, v.level, birth)) };
    };
    const ra = read(va, a.level);
    const rb = read(vb, b.level);
    const m = sharedTokens(ra.tokens, rb.tokens);
    const row = (v: VisitColumns, keep: Int32Array, shared: boolean[] | null): ExpandedRow => {
      const marks = marksOf(v, keep, shared);
      const at = (i: number): Visited => ({ type: v.type[i], slot: v.slot[i], up: v.up[i], mark: marks[i] });
      return {
        level: v.level,
        visits: v.type.length,
        cancelled: v.type.length - keep.length,
        unshared: marks.filter((m) => m === 'unshared').length,
        raw: Array.from({ length: Math.min(shown, v.type.length) }, (_, i) => at(i)),
        kept: Array.from(keep.subarray(0, Math.min(shown, keep.length)), at),
      };
    };
    rows.push({ depth: d, same: m.state === 'same', a: row(va, ra.keep, m.a), b: row(vb, rb.keep, m.b) });
  }
  const last = rows[rows.length - 1];
  const more = rows.length < lowest && (!last || Math.max(estimate(cs, va), estimate(cs, vb)) <= ROW_CAP);
  return { rows, more };
}

/** How many visits the level below would have. */
function estimate(cs: CircuitShapes, v: VisitColumns): number {
  let n = 0;
  for (let i = 0; i < v.type.length; i++) n += cs.levels[v.level][v.type[i]].route(v.cross[i]).steps.length;
  return n;
}
