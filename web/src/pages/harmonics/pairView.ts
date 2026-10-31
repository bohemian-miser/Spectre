/**
 * The members of a chain shown supertile for supertile: each member over
 * the outlines of the supertiles it runs through, each two levels above the
 * member before, those holding a visit the neighbouring member's reading
 * does not share marked.
 */
import { mul, transPt, type Affine, type Pt } from '../../core';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { alignReadings, cancelBacktracksAt, expandVisits, pathOf, sameCyclic, topVisits, type Reading, type VisitColumns } from './readings';

/** Supertiles are drawn for a level while the circuit has at most this many raw visits there. */
export const VISIT_CAP = 400000;
/** The circuit is drawn through at most this many of its crossings at the level, evenly spaced. */
export const CIRCUIT_POINTS = 20000;
/** At most this many supertiles are drawn per picture, the first the circuit enters. */
export const SUPERTILE_CAP = 600;

export interface Supertile {
  /** Slot path from the birth supertile down. */
  readonly path: string;
  readonly type: string;
  /** Outline points, x, y pairs in the birth supertile's frame. */
  readonly outline: Float64Array;
  /** Whether it holds a visit the other reading does not share. */
  readonly unshared: boolean;
  /** Whether it holds a visit matched in the neighbouring member's reading, where the two are a strand and a circuit it is set against. */
  readonly matched?: boolean;
  /** The slot path it is linked by in the other members, when not its own: a strand's supertile linked to the one its visit is matched with. */
  readonly link?: string;
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
  /** An open strand: its line is not closed. */
  readonly open?: boolean;
}

export type Agreement = 'same' | 'differs' | 'long' | 'unread';

export interface ChainPicture {
  /** The level the lowest member is drawn at; member j at k plus its birth level less the lowest's. */
  readonly k: number;
  readonly sides: readonly Side[];
  /** Per member from the second: how its reading compares with the member below's: 'same', 'differs' (unshared visits marked on both), 'long' (too long to align), 'unread'. */
  readonly steps: readonly Agreement[];
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
export function sideAt(cs: CircuitShapes, c: BornCircuit, level: number, reading: Reading | undefined, shared: readonly boolean[] | null, kept?: Int32Array): Side {
  const visits = reading?.raw ?? Infinity;
  if (visits > VISIT_CAP) return { level, visits, count: 0, supertiles: [], circuit: new Float64Array(0) };
  const { v, xform } = visitsWithFrames(cs, c, level);
  const keep = shared ? kept ?? cancelBacktracksAt(v.id, v.tiles).keep : null;
  const { count, supertiles } = supertilesOf(cs, v, xform, c.level - level, unsharedIds(v, keep, shared));
  return { level, visits: v.type.length, count, supertiles, circuit: lineOf(cs.shape(c, level)) };
}

/** The supertiles holding a kept visit (`keep`, indices into the visits) that `shared` (per kept visit) says the other reading lacks. */
export function unsharedIds(v: VisitColumns, keep: Int32Array | null, shared: readonly boolean[] | null): Set<number> {
  const out = new Set<number>();
  if (keep && shared) keep.forEach((i, q) => { if (!shared[q]) out.add(v.id[i]); });
  return out;
}

/**
 * The supertiles of visits `v`, each placed by its visit's frame, the first
 * `SUPERTILE_CAP` met; `depth` levels below the supertile the ids count
 * from. Ids in `unshared` and `matched` mark theirs; `link` names the slot
 * path a supertile is linked by in the other members.
 */
export function supertilesOf(
  cs: CircuitShapes,
  v: VisitColumns,
  xform: readonly Affine[],
  depth: number,
  unshared: ReadonlySet<number>,
  matched?: ReadonlySet<number>,
  link?: ReadonlyMap<number, string>,
): { count: number; supertiles: Supertile[] } {
  const first = new Map<number, number>();
  v.id.forEach((id, i) => { if (!first.has(id)) first.set(id, i); });
  const supertiles: Supertile[] = [];
  for (const [id, i] of first) {
    if (supertiles.length === SUPERTILE_CAP) break;
    const pts = cs.outline(v.level, v.type[i]);
    const outline = new Float64Array(2 * pts.length);
    pts.forEach((p, j) => {
      const q = transPt(xform[i], p);
      outline[2 * j] = q.x;
      outline[2 * j + 1] = q.y;
    });
    const s: Supertile = { path: pathOf(id, depth), type: v.type[i], outline, unshared: unshared.has(id) };
    const to = link?.get(id);
    supertiles.push(matched?.has(id) || to !== undefined ? { ...s, ...(matched?.has(id) ? { matched: true } : {}), ...(to !== undefined ? { link: to } : {}) } : s);
  }
  return { count: first.size, supertiles };
}

/** Points as x, y pairs, at most `CIRCUIT_POINTS` of them, evenly spaced. */
export function lineOf(all: readonly Pt[]): Float64Array {
  const pts = all.length <= CIRCUIT_POINTS ? all : Array.from({ length: CIRCUIT_POINTS }, (_, j) => all[Math.floor((j * all.length) / CIRCUIT_POINTS)]);
  const out = new Float64Array(2 * pts.length);
  pts.forEach((p, j) => { out[2 * j] = p.x; out[2 * j + 1] = p.y; });
  return out;
}

/**
 * The members of a chain over their supertiles, the lowest at level k and
 * each member two levels above the one before; a member's supertiles holding
 * a visit the member below does not share are marked (the lowest member's,
 * against the member above).
 */
export function chainPicture(cs: CircuitShapes, members: readonly { circuit: BornCircuit; readings: readonly Reading[]; keep?: (level: number) => Int32Array }[], k: number): ChainPicture {
  const base = Math.min(...members.map((m) => m.circuit.level));
  const reading = (j: number) => members[j].readings.find((r) => r.level === k + members[j].circuit.level - base);
  const steps: Agreement[] = [];
  const shared: (boolean[] | null)[] = members.map(() => null);
  for (let j = 1; j < members.length; j++) {
    const lo = reading(j - 1), hi = reading(j);
    if (!lo || !hi) { steps.push('unread'); continue; }
    const m = sharedTokens(lo.tokens, hi.tokens);
    steps.push(m.state);
    shared[j] = m.b;
    if (j === 1) shared[0] = m.a;
  }
  const sides = members.map((m, j) => {
    const level = k + m.circuit.level - base;
    return sideAt(cs, m.circuit, level, reading(j), shared[j], m.keep && reading(j) && reading(j)!.raw <= VISIT_CAP ? m.keep(level) : undefined);
  });
  return { k, sides, steps };
}
