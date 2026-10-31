/**
 * Brute force for the harmonics page (`bruteForce.ts`): a combination's
 * full tables to the base level, the routes above worked out on demand and
 * kept between requests. Runs in its own worker (`bruteForce.worker.ts`), so
 * a long run can be stopped by ending the worker, with a main-thread
 * fallback.
 */
import type { BornCircuit } from '../shapes/circuitShapes';
import { CircuitShapes } from '../shapes/circuitShapes';
import { climb, harmonicAbove, longestArc, type BruteResult, type ClimbResult, type Progress, type Report } from './bruteForce';
import { bornOfFound, foundThumb, Placed, readRows, SparseRows, type Found } from './found';
import { SparseRoutes, TYPES, typeIndex, type Walked } from './sparseRoutes';

/** The highest full table kept: the routes above it are worked out on demand. */
export const BASE = 8;

export interface BruteCombo {
  readonly subset: readonly number[];
  readonly combo: string;
}

/** A circuit to look two levels above: closed in the full tables (its child crossings as places), or found here (as addresses). */
export interface BruteFrom {
  readonly circuit: Walked;
  readonly addressed: boolean;
  readonly floor: number;
}

export class BruteEngine {
  private held: { key: string; R: SparseRoutes } | null = null;

  /** The routes of a combination, the full tables built to the base and to `upTo`. */
  private routes(job: BruteCombo, upTo: number): SparseRoutes {
    const key = `${job.subset.join('')}/${job.combo}`;
    if (this.held?.key !== key) {
      const cs = new CircuitShapes('hex', job.subset, [...job.combo].map((ch) => parseInt(ch, 36)), Math.max(BASE, upTo), Number.MAX_SAFE_INTEGER);
      this.held = { key, R: new SparseRoutes(cs, BASE) };
    } else if (this.held.R.cs.maxLevel < upTo) this.held.R.cs.extend(upTo);
    return this.held.R;
  }

  /** A's harmonic two levels up: every visit of A at the floor looked through, and when none closes the open walks climbed until they do. */
  harmonic(job: BruteCombo, from: BruteFrom, onProgress?: Report): BruteResult {
    const a = from.circuit;
    const R = this.routes(job, from.addressed ? BASE : a.level - 1);
    return harmonicAbove(R, from.addressed ? a : R.walked(a), { floor: from.floor, beyond: Infinity, onProgress });
  }

  /** A circuit found, drawn small as `found.ts` draws one for the Harmonics page: at most `budget` points, closed. */
  thumb(job: BruteCombo, f: Found, budget: number): Float64Array {
    const R = this.routes(job, BASE);
    const rows = new SparseRows(R.cs, R, bornOfFound(R, f));
    return foundThumb(new Placed(R.cs, rows), readRows(rows, budget).readings, budget).pts;
  }

  /**
   * The longest arc of a level-`level` supertile of `type` (within the full
   * tables), climbed until its strand closes or ends in a tile; with routes
   * of its own, let go after.
   */
  climb(job: BruteCombo, level: number, type: string, onProgress?: Report): ClimbResult {
    const cs = this.routes(job, BASE).cs;
    const R = new SparseRoutes(cs, BASE);
    const n = Math.max(0, Math.min(level, cs.maxLevel));
    const ti = typeIndex.get(type);
    if (ti === undefined) throw new Error(`no type ${type}; the types are ${TYPES.join(', ')}`);
    return climb(R, n, ti, longestArc(R, n, ti), { onProgress });
  }
}

export type BruteMessage =
  | { type: 'harmonic'; job: BruteCombo; from: BruteFrom }
  | { type: 'climb'; job: BruteCombo; level: number; tile: string }
  | { type: 'thumb'; job: BruteCombo; found: Found; budget: number };

/** How often progress is posted at most, in milliseconds. */
export const REPORT_EVERY = 250;

/** A report that posts progress every `REPORT_EVERY` ms at most, the search drawn with it. */
export function reporter(post: (p: Progress) => void, every = REPORT_EVERY): Report {
  let last = 0;
  return (p, draw) => {
    const now = Date.now();
    if (now - last < every) return;
    last = now;
    post({ ...p, picture: draw() });
  };
}

/** Runs a message on an engine. */
export function answer(engine: BruteEngine, m: BruteMessage, progress: Report): BruteResult | ClimbResult | Float64Array {
  if (m.type === 'harmonic') return engine.harmonic(m.job, m.from, progress);
  if (m.type === 'climb') return engine.climb(m.job, m.level, m.tile, progress);
  return engine.thumb(m.job, m.found, m.budget);
}

export interface BruteClient {
  harmonic(job: BruteCombo, from: BruteFrom, onProgress: (p: Progress) => void): Promise<BruteResult>;
  climb(job: BruteCombo, level: number, type: string, onProgress: (p: Progress) => void): Promise<ClimbResult>;
  thumb(job: BruteCombo, found: Found, budget: number): Promise<Float64Array>;
  /** Ends every run under way or waiting (their promises reject with `STOPPED`); the routes kept so far go with them. */
  stop(): void;
  dispose(): void;
}

export const STOPPED = 'stopped';

/** A born circuit as the brute force takes it. */
export const fromBorn = (c: BornCircuit, floor: number): BruteFrom => ({ circuit: { level: c.level, type: c.type, length: c.length, steps: c.steps }, addressed: false, floor });

export function createBruteClient(opts: { forceSync?: boolean } = {}): BruteClient {
  const useWorker = !opts.forceSync && typeof Worker !== 'undefined';
  let worker: Worker | null = null;
  let engine: BruteEngine | null = null;
  let id = 1;
  const waiting = new Map<number, { resolve: (r: unknown) => void; reject: (e: Error) => void; progress: (p: Progress) => void }>();
  const start = (): Worker => {
    if (worker) return worker;
    const w = new Worker(new URL('./bruteForce.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; result?: unknown; progress?: Progress; error?: string }>) => {
      const h = waiting.get(e.data.id);
      if (!h) return;
      if (e.data.progress) return h.progress(e.data.progress);
      waiting.delete(e.data.id);
      if (e.data.result !== undefined) h.resolve(e.data.result);
      else h.reject(new Error(e.data.error ?? 'failed'));
    };
    // an error the worker does not catch fails every run with it
    w.onerror = (e: ErrorEvent) => {
      const msg = e.message || 'the brute force worker stopped';
      w.terminate();
      if (worker === w) worker = null;
      for (const h of waiting.values()) h.reject(new Error(msg));
      waiting.clear();
    };
    return (worker = w);
  };
  const ask = <T,>(message: BruteMessage, progress: (p: Progress) => void): Promise<T> => {
    if (!useWorker) {
      return new Promise((resolve, reject) =>
        setTimeout(() => {
          try {
            engine ??= new BruteEngine();
            resolve(answer(engine, message, reporter(progress)) as T);
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        }, 0),
      );
    }
    const n = id++;
    return new Promise((resolve, reject) => {
      waiting.set(n, { resolve: resolve as (r: unknown) => void, reject, progress });
      start().postMessage({ id: n, ...message });
    });
  };
  return {
    harmonic: (job, from, onProgress) => ask<BruteResult>({ type: 'harmonic', job, from }, onProgress),
    climb: (job, level, type, onProgress) => ask<ClimbResult>({ type: 'climb', job, level, tile: type }, onProgress),
    thumb: (job, found, budget) => ask<Float64Array>({ type: 'thumb', job, found, budget }, () => undefined),
    stop() {
      worker?.terminate();
      worker = null;
      for (const h of waiting.values()) h.reject(new Error(STOPPED));
      waiting.clear();
    },
    dispose() {
      worker?.terminate();
      worker = null;
      waiting.clear();
    },
  };
}

const nf = (n: number) => n.toLocaleString('en-US');
const secs = (s: number) => (s < 1 ? 'under a second' : `${s.toFixed(s < 10 ? 1 : 0)} s`);

/** What a brute force at a level found, in a sentence. */
export function describeResult(r: BruteResult): string {
  const fromLength = r.from.length;
  const f = r.found;
  const through = r.windows === 1 ? `the level-${r.floor + 2} supertile of the ${nf(fromLength)}'s first level-${r.floor} visit` : `the level-${r.floor + 2} supertiles of the ${nf(fromLength)}'s first ${r.windows} level-${r.floor} visits`;
  const work = `${nf(r.tried)} arc${r.tried === 1 ? '' : 's'} followed through ${through}; ${nf(r.work.calls)} routes worked out above level ${BASE}, in ${secs(r.seconds)}.`;
  if (f) {
    const reads = f.limited && f.agreed > r.floor ? `from level ${f.agreed} up, as far down as both were read` : `from level ${f.agreed} up`;
    return `Level ${r.level}: a ${nf(f.length)}-tile circuit of family ${f.family} closes in the ${r.type}, reading as the ${nf(fromLength)} two levels down ${reads}; ${f.key.includes('/') ? 'place' : 'word'} key ${f.key}. ${work}`;
  }
  const others = r.others.length ? ` Closed there instead: ${r.others.map((o) => `${nf(o.length)} (family ${o.family})`).join(', ')}.` : '';
  const beyond = r.beyond.length ? ` The ${nf(r.open)} walks that leave it close, climbed, at ${r.beyond.map((b) => `level ${b.level} (${nf(b.length)}, family ${b.family})`).join(', ')}.` : r.open ? ` ${nf(r.open)} walks leave it.` : '';
  return `Level ${r.level}: no circuit reading as the ${nf(fromLength)} closes in the ${r.type}.${others}${beyond} ${work}`;
}
