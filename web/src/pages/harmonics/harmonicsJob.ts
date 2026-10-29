/**
 * The circuits of a combination with their readings at every level, and the
 * lineages among them, from the renormalisation (`shapes/circuitShapes.ts`).
 * The engine keeps the renormalisation and extends it one level at a time,
 * reading only the circuits born since; it runs in a worker
 * (`harmonics.worker.ts`) with a main-thread fallback.
 */
import type { TileFamilyId } from '../../core';
import { CircuitShapes, distinctCircuits, familyOf, type BornCircuit } from '../shapes/circuitShapes';
import { cancelBacktracks, extraRuns, lineages, sameCyclic, token, visitsAt, type Lineage, type Reading } from './readings';

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
  readonly lineages: readonly Lineage[];
  /** For lineages that differ at the tiles: the harmonic's extra runs of visits at level 2, keyed `a-b`. */
  readonly extras: Readonly<Record<string, { unmatched: number; runs: string[][] }>>;
  /** Seconds the last level took. */
  readonly seconds: number;
}

/** Outlines are drawn at the levels where the circuit has at most this many points. */
const MAX_POINTS = 3000;
/** A level is read while its raw visits stay within this. */
const MAX_VISITS = 1500000;

/** The readings of a born circuit, from the top down while they stay within the budget. */
function readDown(cs: CircuitShapes, c: BornCircuit): { readings: Reading[]; readFrom: number } {
  const out: Reading[] = [];
  let k = c.level - 1;
  for (; k >= 0; k--) {
    const raw = visitsAt(cs, c, k);
    const cut = cancelBacktracks(raw);
    out.unshift({ level: k, raw: raw.length, tokens: cut.map((v) => token(v, k, c.level)), tiles: cut.map((v) => v.tiles) });
    if (raw.length * 6 > MAX_VISITS) break;
  }
  return { readings: out, readFrom: Math.max(0, k) };
}

export class HarmonicsEngine {
  private readonly cs: CircuitShapes;
  private readonly cache = new Map<string, CircuitInfo>();
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
    const { readings, readFrom } = readDown(this.cs, c);
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

  result(): HarmonicsResult {
    const circuits = distinctCircuits(this.cs, 64)
      .map((d) => this.info(d.circuit))
      .sort((a, b) => a.length - b.length || a.level - b.level);
    const ls = lineages(circuits);
    const extras: Record<string, { unmatched: number; runs: string[][] }> = {};
    for (const l of ls) {
      if (l.levels[0] !== false) continue;
      const a = circuits[l.a].readings.find((r) => r.level === 0);
      const b = circuits[l.b].readings.find((r) => r.level === 2);
      const e = a && b ? extraRuns(a.tokens, b.tokens) : null;
      if (e) extras[`${l.a}-${l.b}`] = e;
    }
    return { level: this.cs.maxLevel, circuits, lineages: ls, extras, seconds: this.seconds };
  }
}

export { sameCyclic };

export interface HarmonicsClient {
  /** Starts a combination afresh. */
  start(job: HarmonicsJob): Promise<HarmonicsResult>;
  /** One level more of the combination started. */
  next(): Promise<HarmonicsResult>;
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
  const waiting = new Map<number, { resolve: (r: HarmonicsResult) => void; reject: (e: Error) => void }>();
  if (worker)
    worker.onmessage = (e: MessageEvent<{ id: number; result?: HarmonicsResult; error?: string }>) => {
      const h = waiting.get(e.data.id);
      if (!h) return;
      waiting.delete(e.data.id);
      if (e.data.result) h.resolve(e.data.result);
      else h.reject(new Error(e.data.error ?? 'failed'));
    };
  const sync = (f: () => HarmonicsResult): Promise<HarmonicsResult> =>
    new Promise((resolve, reject) =>
      setTimeout(() => {
        try {
          resolve(f());
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }, 0),
    );
  const ask = (message: { type: 'start'; job: HarmonicsJob } | { type: 'next' }): Promise<HarmonicsResult> => {
    const n = id++;
    return new Promise((resolve, reject) => {
      waiting.set(n, { resolve, reject });
      worker!.postMessage({ id: n, ...message });
    });
  };
  return {
    start(job) {
      if (!worker) return sync(() => { engine = new HarmonicsEngine(job); return engine.result(); });
      return ask({ type: 'start', job });
    },
    next() {
      if (!worker) return sync(() => { if (!engine) throw new Error('no combination started'); engine.next(); return engine.result(); });
      return ask({ type: 'next' });
    },
    dispose() {
      worker?.terminate();
      worker = null;
      waiting.clear();
    },
  };
}
