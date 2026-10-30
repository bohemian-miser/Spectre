/**
 * Analysing combinations live, for rules or levels with no precomputed data:
 * `analyseCombo` (the code the sweep runs) cut by `pageCombo`, in a worker
 * (`comboAnalysis.worker.ts`) with a main-thread fallback, one combination
 * or every combination of a rule, with progress. A rule's results are kept
 * in IndexedDB when the browser has it; without it the page works the same.
 */
import { comboDigitChar, comboOptionCounts } from '../../core';
import { analyseCombo } from './comboAnalysis';
import { pageCombo, type PageCombo } from './pageData';

export interface LiveJob {
  readonly rule: string;
  readonly level: number;
  readonly combos: readonly string[];
}

export interface LiveProgress {
  /** The combination being analysed, how many are done of how many, and the stage within it. */
  readonly combo: string;
  readonly done: number;
  readonly of: number;
  readonly stage: string;
  readonly step: number;
  readonly steps: number;
}

/** Runs a job, in order; `onResult` gets each combination as it is done. */
export function runLive(job: LiveJob, onResult: (p: PageCombo) => void, onProgress: (p: LiveProgress) => void): PageCombo[] {
  const subset = [...job.rule].map(Number);
  return job.combos.map((combo, i) => {
    const p = pageCombo(analyseCombo(subset, combo, job.level, (stage, step, steps) => onProgress({ combo, done: i, of: job.combos.length, stage, step, steps })));
    onResult(p);
    return p;
  });
}

/** Every combination of a rule, in digit order. */
export function combosOf(rule: string): string[] {
  const counts = comboOptionCounts('hex', [...rule].map(Number));
  const out: string[] = [];
  const build = (i: number, acc: string): void => {
    if (i === counts.length) { out.push(acc); return; }
    for (let d = 0; d < Math.max(1, counts[i]); d++) build(i + 1, acc + comboDigitChar(d));
  };
  build(0, '');
  return out;
}

/** How many combinations a rule has. */
export const comboCount = (rule: string): number => comboOptionCounts('hex', [...rule].map(Number)).reduce((a, b) => a * Math.max(1, b), 1);

export interface LiveClient {
  /** Starts a job; a new job cancels the one running. */
  run(job: LiveJob, onResult: (p: PageCombo) => void, onProgress: (p: LiveProgress) => void): Promise<void>;
  cancel(): void;
  dispose(): void;
}

export function createLiveClient(opts: { forceSync?: boolean } = {}): LiveClient {
  const canWork = !opts.forceSync && typeof Worker !== 'undefined';
  let worker: Worker | null = null;
  let reject: ((e: Error) => void) | null = null;
  const stop = (): void => {
    worker?.terminate();
    worker = null;
    reject?.(new Error('cancelled'));
    reject = null;
  };
  return {
    run(job, onResult, onProgress) {
      stop();
      if (!canWork) {
        return new Promise((resolve, rej) =>
          setTimeout(() => {
            try {
              runLive(job, onResult, onProgress);
              resolve();
            } catch (err) {
              rej(err instanceof Error ? err : new Error(String(err)));
            }
          }, 0),
        );
      }
      return new Promise((resolve, rej) => {
        try {
          worker = new Worker(new URL('./comboAnalysis.worker.ts', import.meta.url), { type: 'module' });
        } catch (err) {
          rej(err instanceof Error ? err : new Error(String(err)));
          return;
        }
        reject = rej;
        worker.onmessage = (e: MessageEvent<{ result?: PageCombo; progress?: LiveProgress; done?: boolean; error?: string }>) => {
          if (e.data.result) onResult(e.data.result);
          else if (e.data.progress) onProgress(e.data.progress);
          else if (e.data.error) { reject = null; rej(new Error(e.data.error)); }
          else if (e.data.done) { reject = null; resolve(); }
        };
        worker.postMessage(job);
      });
    },
    cancel: stop,
    dispose: stop,
  };
}

const DB = 'foundations';
const STORE = 'combos';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

const key = (rule: string, level: number): string => `hex-${rule}@${level}`;

/** The results kept for a rule at a level, by combination; empty when nothing is kept or IndexedDB is not there. */
export async function loadKept(rule: string, level: number): Promise<Record<string, PageCombo>> {
  try {
    const db = await openDb();
    if (!db) return {};
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key(rule, level));
      req.onsuccess = () => resolve((req.result as Record<string, PageCombo> | undefined) ?? {});
      req.onerror = () => resolve({});
    });
  } catch {
    return {};
  }
}

/** Keeps a rule's results at a level; does nothing when IndexedDB is not there. */
export async function keep(rule: string, level: number, results: Record<string, PageCombo>): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(results, key(rule, level));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // keeping is a convenience
  }
}
