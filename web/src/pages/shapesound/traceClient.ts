/**
 * Strands traced in `trace.worker.ts`: `traceInWorker` starts one, reports
 * its step count as it goes, and resolves with the path (or null when the
 * point was on no strand, or the trace was cancelled).
 */

import { startTrace, type TraceRequest, type TraceResult } from './trace';
import type { TraceMessage, TraceReply } from './trace.worker';

let worker: Worker | null = null;
let next = 1;
const live = new Map<number, { progress: (steps: number) => void; resolve: (r: TraceResult | null) => void }>();

export interface TraceHandle {
  readonly done: Promise<TraceResult | null>;
  cancel(): void;
}

export function traceInWorker(req: TraceRequest, progress: (steps: number) => void): TraceHandle {
  if (typeof Worker === 'undefined') {
    // No workers (tests): trace here, all at once.
    const t = startTrace(req);
    while (t && !t.done) progress(t.run(1000));
    return { done: Promise.resolve(t ? t.result() : null), cancel: () => undefined };
  }
  if (!worker) {
    worker = new Worker(new URL('./trace.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<TraceReply>) => {
      const r = e.data;
      const w = live.get(r.id);
      if (!w) return;
      if (r.kind === 'progress') w.progress(r.steps);
      else {
        live.delete(r.id);
        w.resolve(r.kind === 'done' ? r.result : null);
      }
    };
  }
  const id = next++;
  const done = new Promise<TraceResult | null>((resolve) => live.set(id, { progress, resolve }));
  worker.postMessage({ type: 'start', id, req } satisfies TraceMessage);
  return {
    done,
    cancel() {
      const w = live.get(id);
      if (!w) return;
      live.delete(id);
      worker!.postMessage({ type: 'cancel', id } satisfies TraceMessage);
      w.resolve(null);
    },
  };
}
