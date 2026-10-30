/**
 * The circuits of a combination with their readings at every level, and the
 * lineages among them, from the renormalisation (`shapes/circuitShapes.ts`).
 * The engine keeps the renormalisation and extends it one level at a time,
 * reading only the circuits born since; it runs in a worker
 * (`harmonics.worker.ts`) with a main-thread fallback.
 */
import type { TileFamilyId } from '../../core';
import type { Box } from '../../lib/viewport';
import { CircuitShapes, distinctCircuits, familyOf, type BornCircuit } from '../shapes/circuitShapes';
import { Geometry } from '../buildup/viewer';
import { chainRows, CircuitRows, type ChainRows } from './rows';
import { chainPicture, SUPERTILE_CAP, type ChainPicture } from './pairView';
import { chainsOf, closestInFamily, harmonicLinks, nearLinks, type Chain, type Link, type Near } from './chains';
import { alignReadings, extraRuns, readDown, sameCyclic, type Alignment, type Reading } from './readings';

export interface HarmonicsJob {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly combo: string;
  readonly level: number;
}

export interface CircuitInfo {
  readonly level: number;
  readonly type: string;
  readonly length: number;
  /** Child slots of its birth supertile it runs through, sorted. */
  readonly family: string;
  /** Its readings, one per level from `readFrom` up to the level below its birth; lower levels are too long to read. */
  readonly readings: readonly Reading[];
  readonly readFrom: number;
  /** Its outline drawn at each level from `drawnFrom` up to the level below its birth: x, y pairs in its supertile's frame, each level-k arc a chord. */
  readonly outlines: readonly Float64Array[];
  readonly drawnFrom: number;
  /** The tile it enters first: slots from its supertile down (type, slot), and its chord across that tile. */
  readonly first: { readonly path: readonly (readonly [string, number])[]; readonly chord: readonly number[] };
}

export interface HarmonicsResult {
  readonly level: number;
  readonly circuits: readonly CircuitInfo[];
  /** Every harmonic pair (`chains.ts`), the chains they make, and near links into the chains' lowest members. */
  readonly links: readonly Link[];
  readonly chains: readonly Chain[];
  readonly near: readonly Near[];
  /** For a circuit in a chain of its own: the circuit of its family two levels away agreeing at most top levels, by circuit index. */
  readonly closest: Readonly<Record<number, { other: number; top: number }>>;
  /** For pairs that differ at the tiles: the harmonic's extra runs of visits at level 2, keyed `a-b`. */
  readonly extras: Readonly<Record<string, { unmatched: number; runs: string[][] }>>;
  /** Seconds the last level took. */
  readonly seconds: number;
}

/** Outlines are drawn at the levels where the circuit has at most this many points. */
const MAX_POINTS = 3000;
/** Levels are read downwards until one has more raw visits than this; that one is the last read. */
const LAST_VISITS = 250000;

export class HarmonicsEngine {
  /** The renormalisation, built up level by level. */
  readonly cs: CircuitShapes;
  private readonly cache = new Map<string, CircuitInfo>();
  /** The circuits of the level last read, in the order of the result. */
  private circuits: { level: number; list: CircuitInfo[]; born: BornCircuit[] } | null = null;
  private last: HarmonicsResult | null = null;
  private seconds = 0;

  constructor(readonly job: HarmonicsJob) {
    const t0 = Date.now();
    this.cs = new CircuitShapes(job.family, job.subset, [...job.combo].map((ch) => parseInt(ch, 36)), job.level, 1, true);
    this.seconds = (Date.now() - t0) / 1000;
  }

  get level(): number {
    return this.cs.maxLevel;
  }

  /** One more level of the renormalisation. */
  next(): void {
    const t0 = Date.now();
    this.cs.extend(this.cs.maxLevel + 1);
    this.seconds = (Date.now() - t0) / 1000;
  }

  private info(c: BornCircuit): CircuitInfo {
    const key = `${c.level}/${c.type}/${c.length}/${c.steps[0]}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const { readings, readFrom } = readDown(this.cs, c, LAST_VISITS);
    const outlines: Float64Array[] = [];
    let drawnFrom = c.level - 1;
    for (let k = c.level - 1; k >= 0; k--) {
      const raw = readings.find((r) => r.level === k)?.raw;
      if (raw === undefined || raw > MAX_POINTS) break;
      const pts = this.cs.shape(c, k);
      const o = new Float64Array(2 * pts.length);
      pts.forEach((p, i) => { o[2 * i] = p.x; o[2 * i + 1] = p.y; });
      outlines.unshift(o);
      drawnFrom = k;
    }
    const { path, chord } = this.cs.firstTile(c);
    const info: CircuitInfo = {
      level: c.level,
      type: c.type,
      length: c.length,
      family: familyOf(c),
      readings,
      readFrom,
      outlines,
      drawnFrom,
      first: { path: path.map((p) => [p.type, p.pos] as [string, number]), chord: chord.flatMap((p) => [p.x, p.y]) },
    };
    this.cache.set(key, info);
    return info;
  }

  /** The distinct circuits up to the level built, shortest first, worked out once per level. */
  private list(): CircuitInfo[] {
    if (this.circuits?.level !== this.cs.maxLevel) {
      const pairs = distinctCircuits(this.cs, 1)
        .map((d) => ({ info: this.info(d.circuit), born: d.circuit }))
        .sort((a, b) => a.info.length - b.info.length || a.info.level - b.info.level);
      this.circuits = { level: this.cs.maxLevel, list: pairs.map((p) => p.info), born: pairs.map((p) => p.born) };
    }
    return this.circuits.list;
  }

  /** Circuits of the last result (a chain's members, by level) over their supertiles, the lowest at level k. */
  picture(members: readonly number[], k: number): ChainPicture {
    const list = this.list();
    const born = this.circuits!.born;
    return chainPicture(this.cs, members.map((i) => ({ circuit: born[i], readings: list[i].readings })), k);
  }

  private geometry: Geometry | null = null;
  private readonly rowsOf = new Map<BornCircuit, CircuitRows>();

  /** The born circuit behind circuit `ci` of the last result. */
  bornOf(ci: number): BornCircuit {
    this.list();
    return this.circuits!.born[ci];
  }

  private circuitRows(ci: number): CircuitRows {
    const c = this.bornOf(ci);
    let r = this.rowsOf.get(c);
    if (!r) this.rowsOf.set(c, (r = new CircuitRows(this.cs, c)));
    return r;
  }

  /** Circuits of the last result (a chain's members, by level) read row by row down to level k for the lowest (`rows.ts`). */
  rows(members: readonly number[], k: number): ChainRows {
    return chainRows(members.map((i) => this.circuitRows(i)), k, SUPERTILE_CAP);
  }

  /** Raw visits of circuit `ci` at a level below its birth: read, or carried on from the two lowest levels read by their ratio. */
  private visitsAt(ci: number, level: number): number {
    const rs = this.list()[ci].readings;
    const at = (k: number) => rs.find((r) => r.level === k)?.raw;
    const got = at(level);
    if (got !== undefined) return got;
    const lo = Math.min(...rs.map((r) => r.level));
    const a = at(lo)!, b = at(lo + 1) ?? a;
    return a * Math.pow(Math.max(1, a / b), lo - level);
  }

  /**
   * Circuit `ci` drawn down to a level for a view (y up, its birth frame):
   * as fine as `level - 2` while the crossings in view stay within about
   * `budget`, children out of view passed over (`buildup/viewer.ts`). At
   * `level` itself it is thinned to `budget` points when over, and `capped`.
   */
  detail(ci: number, level: number, view: Box | null, budget: number): { stop: number; pts: Float64Array; capped: boolean } {
    const c = this.bornOf(ci);
    const g = (this.geometry ??= new Geometry(this.cs));
    let share = 1;
    if (view) {
      const o = this.cs.outline(c.level, c.type);
      const x0 = Math.min(...o.map((p) => p.x)), x1 = Math.max(...o.map((p) => p.x)), y0 = Math.min(...o.map((p) => p.y)), y1 = Math.max(...o.map((p) => p.y));
      const w = Math.max(0, Math.min(x1, view.max.x) - Math.max(x0, view.min.x)), h = Math.max(0, Math.min(y1, view.max.y) - Math.max(y0, view.min.y));
      share = Math.min(1, (4 * w * h) / ((x1 - x0) * (y1 - y0) || 1));
    }
    for (let s = Math.max(0, level - 2); s <= level; s++) {
      if (s < level && this.visitsAt(ci, s) * share > budget) continue;
      const out: number[] = [];
      for (const st of c.steps) {
        const ch = this.cs.childOf(c.level, c.type, st);
        g.walk(c.level - 1, ch.type, ch.k, ch.xform, s, view, out);
      }
      out.push(out[0], out[1]);
      const pts = Float64Array.from(out);
      if (s < level && pts.length > 4 * budget) continue;
      const n = pts.length / 2;
      if (n <= 2 * budget) return { stop: s, pts, capped: false };
      return { stop: s, pts: thin(pts, budget), capped: true };
    }
    throw new Error('no level to draw at');
  }

  /**
   * Thumbnails of circuits: each drawn at the lowest level at most two below
   * its birth whose crossings stay within `budget`, or two below its birth
   * thinned to `budget` points when even that has more; closed, in the birth
   * frame.
   */
  thumbs(cis: readonly number[], budget: number): { stop: number; pts: Float64Array }[] {
    return cis.map((ci) => {
      const c = this.bornOf(ci);
      let s = Math.max(0, c.level - 2);
      while (s > 0 && this.visitsAt(ci, s - 1) <= budget) s--;
      const all = this.cs.shape(c, s);
      const pts = new Float64Array(2 * all.length + 2);
      all.forEach((p, j) => { pts[2 * j] = p.x; pts[2 * j + 1] = p.y; });
      pts[2 * all.length] = all[0].x;
      pts[2 * all.length + 1] = all[0].y;
      return { stop: s, pts: all.length > budget ? thin(pts, budget) : pts };
    });
  }

  /** Circuits `ai` and `bi` of the last result lined up, B's level k + offset against A's level k. */
  compare(ai: number, bi: number): Comparison {
    const circuits = this.list();
    return { a: ai, b: bi, ...lineUp(circuits[ai], circuits[bi]) };
  }

  /** The circuits, their chains and extra runs up to the level built; the seconds count the level's build and its reading. */
  result(): HarmonicsResult {
    if (this.last?.level === this.cs.maxLevel) return this.last;
    const t0 = Date.now();
    const circuits = this.list();
    const links = harmonicLinks(circuits);
    const chains = chainsOf(circuits, links);
    const near = nearLinks(circuits, chains);
    const closest: Record<number, { other: number; top: number }> = {};
    for (const ch of chains) {
      if (ch.members.length > 1) continue;
      const c = closestInFamily(circuits, ch.members[0]);
      if (c) closest[ch.members[0]] = c;
    }
    const extras: Record<string, { unmatched: number; runs: string[][] }> = {};
    for (const l of links) {
      if (l.from === 0) continue;
      const a = circuits[l.a].readings.find((r) => r.level === 0);
      const b = circuits[l.b].readings.find((r) => r.level === 2);
      const e = a && b ? extraRuns(a.tokens, b.tokens) : null;
      if (e) extras[`${l.a}-${l.b}`] = e;
    }
    this.last = { level: this.cs.maxLevel, circuits, links, chains, near, closest, extras, seconds: this.seconds + (Date.now() - t0) / 1000 };
    return this.last;
  }
}

export { sameCyclic };

/** B's readings lined up with A's: B's level k + offset against A's level k, offset being the difference of their birth levels. */
export function lineUp(a: CircuitInfo, b: CircuitInfo): { offset: number; rows: Comparison['rows'] } {
  const offset = b.level - a.level;
  const rows: Comparison['rows'][number][] = [];
  for (let k = 0; k < a.level; k++) {
    const ra = a.readings.find((r) => r.level === k);
    const rb = b.readings.find((r) => r.level === k + offset);
    if (!ra || !rb) { rows.push({ level: k, state: 'unread' }); continue; }
    if (sameCyclic(ra.tokens, rb.tokens)) { rows.push({ level: k, state: 'same' }); continue; }
    const alignment = alignReadings(ra.tokens, rb.tokens);
    rows.push(alignment ? { level: k, state: 'differs', alignment } : { level: k, state: 'long' });
  }
  return { offset, rows };
}

/** Two circuits lined up level by level: B at level k + offset against A at level k. */
export interface Comparison {
  readonly a: number;
  readonly b: number;
  readonly offset: number;
  readonly rows: readonly {
    readonly level: number;
    /** 'same', 'differs' (with the alignment), 'unread' (a level one of them was not read at), or 'long' (too long to align). */
    readonly state: 'same' | 'differs' | 'unread' | 'long';
    readonly alignment?: Alignment;
  }[];
}

export type WorkerMessage =
  | { type: 'start'; job: HarmonicsJob }
  | { type: 'next' }
  | { type: 'compare'; a: number; b: number }
  | { type: 'picture'; members: readonly number[]; k: number }
  | { type: 'rows'; members: readonly number[]; k: number }
  | { type: 'detail'; c: number; level: number; view: Box | null; budget: number }
  | { type: 'thumbs'; cs: readonly number[]; budget: number };

export interface HarmonicsClient {
  /** Starts a combination afresh. */
  start(job: HarmonicsJob): Promise<HarmonicsResult>;
  /** One level more of the combination started. */
  next(): Promise<HarmonicsResult>;
  /** Two circuits of the last result lined up. */
  compare(a: number, b: number): Promise<Comparison>;
  /** Two circuits of the last result over their supertiles, A at level k. */
  picture(members: readonly number[], k: number): Promise<ChainPicture>;
  /** A supertile of a circuit of the last result, picked by its visit, with the visit circuit `other` pairs it with. */
  /** Circuits of the last result read row by row (`rows.ts`). */
  rows(members: readonly number[], k: number): Promise<ChainRows>;
  /** A circuit of the last result drawn for a view, as fine as its budget allows. */
  detail(c: number, level: number, view: Box | null, budget: number): Promise<{ stop: number; pts: Float64Array; capped: boolean }>;
  /** Thumbnails of circuits of the last result. */
  thumbs(cs: readonly number[], budget: number): Promise<{ stop: number; pts: Float64Array }[]>;
  dispose(): void;
}

export function createHarmonicsClient(opts: { forceSync?: boolean } = {}): HarmonicsClient {
  let worker: Worker | null = null;
  if (!opts.forceSync && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./harmonics.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
  }
  let engine: HarmonicsEngine | null = null;
  let id = 1;
  const waiting = new Map<number, { resolve: (r: unknown) => void; reject: (e: Error) => void }>();
  if (worker)
    worker.onmessage = (e: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
      const h = waiting.get(e.data.id);
      if (!h) return;
      waiting.delete(e.data.id);
      if (e.data.result !== undefined) h.resolve(e.data.result);
      else h.reject(new Error(e.data.error ?? 'failed'));
    };
  const sync = <T,>(f: () => T): Promise<T> =>
    new Promise((resolve, reject) =>
      setTimeout(() => {
        try {
          resolve(f());
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }, 0),
    );
  const ask = <T,>(message: WorkerMessage): Promise<T> => {
    const n = id++;
    return new Promise((resolve, reject) => {
      waiting.set(n, { resolve: resolve as (r: unknown) => void, reject });
      worker!.postMessage({ id: n, ...message });
    });
  };
  const need = (): HarmonicsEngine => { if (!engine) throw new Error('no combination started'); return engine; };
  return {
    start(job) {
      if (!worker) return sync(() => { engine = new HarmonicsEngine(job); return engine.result(); });
      return ask({ type: 'start', job });
    },
    next() {
      if (!worker) return sync(() => { need().next(); return need().result(); });
      return ask({ type: 'next' });
    },
    compare(a, b) {
      if (!worker) return sync(() => need().compare(a, b));
      return ask({ type: 'compare', a, b });
    },
    picture(members, k) {
      if (!worker) return sync(() => need().picture(members, k));
      return ask({ type: 'picture', members, k });
    },
    rows(members, k) {
      if (!worker) return sync(() => need().rows(members, k));
      return ask({ type: 'rows', members, k });
    },
    detail(c, level, view, budget) {
      if (!worker) return sync(() => need().detail(c, level, view, budget));
      return ask({ type: 'detail', c, level, view, budget });
    },
    thumbs(cs, budget) {
      if (!worker) return sync(() => need().thumbs(cs, budget));
      return ask({ type: 'thumbs', cs, budget });
    },
    dispose() {
      worker?.terminate();
      worker = null;
      waiting.clear();
    },
  };
}

/** A closed line thinned to about `n` of its points, evenly spaced, still closed. */
export function thin(pts: Float64Array, n: number): Float64Array {
  const m = pts.length / 2 - 1;
  const out = new Float64Array(2 * n + 2);
  for (let j = 0; j < n; j++) {
    const i = Math.floor((j * m) / n);
    out[2 * j] = pts[2 * i];
    out[2 * j + 1] = pts[2 * i + 1];
  }
  out[2 * n] = out[0];
  out[2 * n + 1] = out[1];
  return out;
}
