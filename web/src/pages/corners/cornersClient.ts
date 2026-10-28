/**
 * The Corners page's computations, run in a worker (`corners.worker.ts`) with
 * a main-thread fallback. Every job carries its own loop, so the worker holds
 * no state; `reset` drops whatever is still running when the circuit changes.
 */

import { chordCurve, fitSymmetric, spectrum, type ChordCurve, type Loop, type PolygonFit, type Spectrum } from './measure';
import { surveyCircuit, type SurveyRow } from './survey';

export type CornersJob =
  | { readonly kind: 'walk'; readonly loop: Loop; readonly rg: number; readonly k: number; readonly starts: readonly number[] }
  | { readonly kind: 'polygon'; readonly loop: Loop; readonly rg: number; readonly k: number; readonly m: number; readonly step: number }
  | { readonly kind: 'spectrum'; readonly loop: Loop }
  | { readonly kind: 'survey'; readonly loop: Loop; readonly rg: number };

export type CornersResult = ChordCurve | PolygonFit | Spectrum | SurveyRow;

export function runJob(job: CornersJob): CornersResult {
  switch (job.kind) {
    case 'walk':
      return chordCurve(job.loop, job.k, job.starts, job.rg);
    case 'polygon':
      return fitSymmetric(job.loop, job.k, job.m, job.rg, job.step);
    case 'spectrum':
      return spectrum(job.loop);
    case 'survey':
      return surveyCircuit(job.loop, job.rg);
  }
}

export type CornersReply = { readonly id: number; readonly result: CornersResult } | { readonly id: number; readonly error: string };

export interface CornersClient {
  run<T extends CornersResult>(job: CornersJob): Promise<T>;
  /** Abandon every job still queued or running (their promises never settle). */
  reset(): void;
  dispose(): void;
}

let nextId = 1;

export function createCornersClient(opts: { forceSync?: boolean } = {}): CornersClient {
  const spawn = (): Worker | null => {
    if (opts.forceSync || typeof Worker === 'undefined') return null;
    try {
      return new Worker(new URL('./corners.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return null;
    }
  };
  let worker = spawn();
  let waiting = new Map<number, { resolve: (r: CornersResult) => void; reject: (e: Error) => void }>();
  let epoch = 0;
  const listen = (w: Worker) => {
    w.onmessage = (e: MessageEvent<CornersReply>) => {
      const h = waiting.get(e.data.id);
      if (!h) return;
      waiting.delete(e.data.id);
      if ('result' in e.data) h.resolve(e.data.result);
      else h.reject(new Error(e.data.error));
    };
  };
  if (worker) listen(worker);
  return {
    run<T extends CornersResult>(job: CornersJob): Promise<T> {
      const id = nextId++;
      if (!worker) {
        const mine = epoch;
        return new Promise<T>((resolve, reject) => {
          setTimeout(() => {
            if (mine !== epoch) return;
            try {
              resolve(runJob(job) as T);
            } catch (err) {
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          }, 0);
        });
      }
      return new Promise<T>((resolve, reject) => {
        waiting.set(id, { resolve: resolve as (r: CornersResult) => void, reject });
        worker!.postMessage({ id, job });
      });
    },
    reset() {
      epoch++;
      waiting = new Map();
      if (worker) {
        worker.terminate();
        worker = spawn();
        if (worker) listen(worker);
      }
    },
    dispose() {
      epoch++;
      waiting = new Map();
      worker?.terminate();
      worker = null;
    },
  };
}
