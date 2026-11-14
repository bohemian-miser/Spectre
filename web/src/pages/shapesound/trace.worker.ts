/**
 * Traces strands off the page's thread (`trace.ts`), one at a time, posting
 * the step count as it goes; a `cancel` stops the trace in progress.
 */

import { startTrace, type TraceRequest, type TraceResult } from './trace';

export type TraceMessage = { readonly type: 'start'; readonly id: number; readonly req: TraceRequest } | { readonly type: 'cancel'; readonly id: number };

export type TraceReply =
  | { readonly id: number; readonly kind: 'progress'; readonly steps: number }
  | { readonly id: number; readonly kind: 'done'; readonly result: TraceResult }
  | { readonly id: number; readonly kind: 'none' };

type WorkerScope = {
  onmessage: ((event: MessageEvent<TraceMessage>) => void) | null;
  postMessage(message: TraceReply, transfer?: Transferable[]): void;
};

const scope = globalThis as unknown as WorkerScope;
const cancelled = new Set<number>();
/** Milliseconds of walking between progress reports (and chances to be cancelled). */
const SLICE = 80;

scope.onmessage = (event) => {
  const msg = event.data;
  if (msg.type === 'cancel') {
    cancelled.add(msg.id);
    return;
  }
  const tracer = startTrace(msg.req);
  if (!tracer) {
    scope.postMessage({ id: msg.id, kind: 'none' });
    return;
  }
  const slice = (): void => {
    if (cancelled.has(msg.id)) {
      cancelled.delete(msg.id);
      return;
    }
    const steps = tracer.run(SLICE);
    if (tracer.done) {
      const result = tracer.result();
      scope.postMessage({ id: msg.id, kind: 'done', result }, [result.xy.buffer]);
    } else {
      scope.postMessage({ id: msg.id, kind: 'progress', steps });
      setTimeout(slice, 0);
    }
  };
  slice();
};
