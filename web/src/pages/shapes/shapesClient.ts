/**
 * The Shapes page's heavy step, run in a worker (`shapes.worker.ts`) with a
 * main-thread fallback: every circuit's terms, every pair's gap, the merge
 * order and the plane layout. Starting a new job abandons the one running.
 */

import type { Loop } from '../corners/measure';
import { cluster, gaps, planeLayout, terms, type Merge, type Terms } from './descriptor';

export interface ShapesJob {
  readonly loops: readonly Loop[];
  readonly F: number;
  readonly mirror: boolean;
}

export interface ShapesResult {
  readonly terms: readonly Terms[];
  readonly gaps: Float64Array;
  readonly merges: readonly Merge[];
  readonly layout: Float64Array;
}

export function runShapes(job: ShapesJob): ShapesResult {
  const all = job.loops.map((l) => terms(l, job.F));
  const d = gaps(all, job.mirror);
  return { terms: all, gaps: d, merges: cluster(d, all.length), layout: planeLayout(d, all.length) };
}

export interface ShapesClient {
  run(job: ShapesJob): Promise<ShapesResult>;
  dispose(): void;
}

export function createShapesClient(opts: { forceSync?: boolean } = {}): ShapesClient {
  let worker: Worker | null = null;
  let epoch = 0;
  const spawn = (): Worker | null => {
    if (opts.forceSync || typeof Worker === 'undefined') return null;
    try {
      return new Worker(new URL('./shapes.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return null;
    }
  };
  return {
    run(job) {
      const mine = ++epoch;
      worker?.terminate();
      worker = spawn();
      if (!worker)
        return new Promise((resolve, reject) =>
          setTimeout(() => {
            if (mine !== epoch) return;
            try {
              resolve(runShapes(job));
            } catch (err) {
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          }, 0),
        );
      const w = worker;
      return new Promise((resolve, reject) => {
        w.onmessage = (e: MessageEvent<ShapesResult | { error: string }>) => {
          if (mine !== epoch) return;
          if ('error' in e.data) reject(new Error(e.data.error));
          else resolve(e.data);
        };
        w.postMessage(job);
      });
    },
    dispose() {
      epoch++;
      worker?.terminate();
      worker = null;
    },
  };
}
