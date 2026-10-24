/**
 * Runs scaling jobs in a worker (one row at a time, posted as it lands), with
 * a main-thread fallback that yields between rows. Starting a new job cancels
 * the one running.
 */

import { measureScaling, type Scaling, type TileFamilyId, type TileTypeId } from '../core';

export interface ScalingJob {
  readonly id: number;
  readonly family: TileFamilyId;
  readonly root: TileTypeId;
  readonly levels: readonly number[];
  readonly rows: readonly { readonly subset: readonly number[]; readonly combo: string }[];
}

export type ScalingReply =
  | { readonly id: number; readonly index: number; readonly scaling: Scaling }
  | { readonly id: number; readonly index: number; readonly error: string }
  | { readonly id: number; readonly done: true };

export interface ScalingHandlers {
  onRow(index: number, scaling: Scaling): void;
  onError?(index: number, error: string): void;
  onDone(): void;
}

export interface ScalingClient {
  /** Start a job; returns a function that cancels it. */
  run(job: Omit<ScalingJob, 'id'>, handlers: ScalingHandlers): () => void;
  dispose(): void;
}

let nextId = 1;

export function createScalingClient(opts: { forceSync?: boolean } = {}): ScalingClient {
  if (opts.forceSync || typeof Worker === 'undefined') return syncClient();
  let worker: Worker | null = null;
  const spawn = (): Worker | null => {
    try {
      return new Worker(new URL('./scaling.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return null;
    }
  };
  worker = spawn();
  if (!worker) return syncClient();
  return {
    run(job, handlers) {
      // A fresh worker per job: cancelling means dropping the old one mid-row.
      worker?.terminate();
      worker = spawn();
      if (!worker) return () => {};
      const id = nextId++;
      worker.onmessage = (e: MessageEvent<ScalingReply>) => {
        const m = e.data;
        if (m.id !== id) return;
        if ('done' in m) handlers.onDone();
        else if ('scaling' in m) handlers.onRow(m.index, m.scaling);
        else handlers.onError?.(m.index, m.error);
      };
      worker.postMessage({ ...job, id });
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

function syncClient(): ScalingClient {
  return {
    run(job, handlers) {
      let cancelled = false;
      void (async () => {
        for (let i = 0; i < job.rows.length && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, 0));
          if (cancelled) return;
          try {
            handlers.onRow(i, measureScaling(job.family, job.root, job.levels, job.rows[i].subset, job.rows[i].combo));
          } catch (err) {
            handlers.onError?.(i, err instanceof Error ? err.message : String(err));
          }
        }
        if (!cancelled) handlers.onDone();
      })();
      return () => {
        cancelled = true;
      };
    },
    dispose() {},
  };
}
