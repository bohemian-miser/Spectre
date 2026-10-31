/**
 * Worker wrapper around `core`'s `runUnrootedQuery`, with a synchronous
 * fallback — the same pattern as `analysisClient.ts`. In node (vitest) or any
 * environment without `Worker`, `query()` resolves on the calling thread with
 * an identical result, which is what keeps the engine testable end-to-end.
 * Newest-request-wins cancellation is handled by the `id` echoed through
 * `UnrootedQueryRequest`/`UnrootedQueryResponse`. Several schedulers share
 * one client, each counting its own ids, so the worker is sent the client's
 * own sequence number and every reply goes back with its caller's id.
 */

import { runUnrootedQuery, type UnrootedQueryRequest, type UnrootedQueryResponse } from '../core';

export interface TilingClient {
  readonly usesWorker: boolean;
  query(req: UnrootedQueryRequest): Promise<UnrootedQueryResponse>;
  dispose(): void;
}

type WorkerReply =
  | { ok: true; response: UnrootedQueryResponse }
  | { ok: false; id: number; error: string };

export interface TilingClientOptions {
  /** Skip the worker entirely (tests, SSR, tiny budgets). */
  readonly forceSync?: boolean;
}

function createSyncClient(): TilingClient {
  return {
    usesWorker: false,
    // Answered on a timer task, as a worker's reply would be, never as a
    // microtask: a caller that issues its next query from the last one's
    // result (the trace feeder does, whenever a query outlasts its throttle)
    // would otherwise chain queries forever without the thread ever reaching
    // a timer, an event or a frame.
    query: (req) =>
      new Promise<UnrootedQueryResponse>((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(runUnrootedQuery(req));
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        }, 0);
      }),
    dispose: () => {},
  };
}

/**
 * Create a tiling client. Falls back to synchronous execution whenever a
 * module worker cannot be constructed (node, older browsers, CSP).
 */
export function createTilingClient(opts: TilingClientOptions = {}): TilingClient {
  if (opts.forceSync || typeof Worker === 'undefined') return createSyncClient();

  let worker: Worker;
  try {
    worker = new Worker(new URL('./tiling.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return createSyncClient();
  }

  const pending = new Map<number, { id: number; resolve(r: UnrootedQueryResponse): void; reject(e: Error): void }>();
  let seq = 0;

  worker.onmessage = (event: MessageEvent<WorkerReply>) => {
    const msg = event.data;
    if (!msg) return;
    if (msg.ok) {
      const p = pending.get(msg.response.id);
      pending.delete(msg.response.id);
      p?.resolve({ ...msg.response, id: p.id });
    } else {
      pending.get(msg.id)?.reject(new Error(msg.error));
      pending.delete(msg.id);
    }
  };
  worker.onerror = (event) => {
    const err = new Error(`tiling worker failed: ${event.message ?? 'unknown error'}`);
    for (const p of pending.values()) p.reject(err);
    pending.clear();
  };

  return {
    usesWorker: true,
    query: (req) =>
      new Promise<UnrootedQueryResponse>((resolve, reject) => {
        const key = ++seq;
        pending.set(key, { id: req.id, resolve, reject });
        worker.postMessage({ ...req, id: key });
      }),
    dispose: () => {
      pending.clear();
      worker.terminate();
    },
  };
}

/** Synchronous escape hatch, used in tests and below any worker threshold. */
export function queryTilingSync(req: UnrootedQueryRequest): UnrootedQueryResponse {
  return runUnrootedQuery(req);
}
