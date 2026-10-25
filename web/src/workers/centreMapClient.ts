/**
 * Runs centre-map surveys in a worker, with a main-thread fallback. A new
 * survey cancels the one running.
 */

import { runCentreMap, type CentreMapJob, type CentreMapPhase, type CentreMapResult } from './centreMapJobs';

export type CentreMapRequest = { readonly id: number; readonly job: CentreMapJob };

export type CentreMapReply =
  | { readonly id: number; readonly kind: 'progress'; readonly phase: CentreMapPhase; readonly done: number; readonly total: number }
  | { readonly id: number; readonly kind: 'done'; readonly result: CentreMapResult }
  | { readonly id: number; readonly kind: 'error'; readonly error: string };

export interface CentreMapHandlers {
  onProgress?(phase: CentreMapPhase, done: number, total: number): void;
  onDone(result: CentreMapResult): void;
  onError?(error: string): void;
}

export interface CentreMapClient {
  /** Start a survey; returns a function that cancels it. */
  run(job: CentreMapJob, handlers: CentreMapHandlers): () => void;
  dispose(): void;
}

let nextId = 1;

export function createCentreMapClient(opts: { forceSync?: boolean } = {}): CentreMapClient {
  if (opts.forceSync || typeof Worker === 'undefined') return syncClient();
  const spawn = (): Worker | null => {
    try {
      return new Worker(new URL('./centreMap.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return null;
    }
  };
  let worker: Worker | null = spawn();
  if (!worker) return syncClient();
  return {
    run(job, handlers) {
      // A fresh worker per survey: cancelling means dropping the old one.
      worker?.terminate();
      worker = spawn();
      if (!worker) return () => {};
      const id = nextId++;
      worker.onmessage = (e: MessageEvent<CentreMapReply>) => {
        const m = e.data;
        if (m.id !== id) return;
        if (m.kind === 'progress') handlers.onProgress?.(m.phase, m.done, m.total);
        else if (m.kind === 'done') handlers.onDone(m.result);
        else handlers.onError?.(m.error);
      };
      worker.postMessage({ id, job } satisfies CentreMapRequest);
      const mine = worker;
      return () => {
        if (worker === mine) {
          mine.terminate();
          worker = null;
        }
      };
    },
    dispose() {
      worker?.terminate();
      worker = null;
    },
  };
}

function syncClient(): CentreMapClient {
  return {
    run(job, handlers) {
      let cancelled = false;
      void (async () => {
        await new Promise((r) => setTimeout(r, 0));
        if (cancelled) return;
        try {
          const result: CentreMapResult = runCentreMap(job, handlers.onProgress);
          if (!cancelled) handlers.onDone(result);
        } catch (err) {
          if (!cancelled) handlers.onError?.(err instanceof Error ? err.message : String(err));
        }
      })();
      return () => {
        cancelled = true;
      };
    },
    dispose() {},
  };
}
