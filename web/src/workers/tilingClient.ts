/**
 * Worker wrapper around `core`'s `runUnrootedQuery`, with a synchronous
 * fallback — the same pattern as `analysisClient.ts`. In node (vitest) or any
 * environment without `Worker`, `query()` resolves on the calling thread with
 * an identical result, which is what keeps the engine testable end-to-end.
 * Newest-request-wins cancellation is handled by the `id` echoed through
 * `UnrootedQueryRequest`/`UnrootedQueryResponse`.
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
    query: (req) =>
      new Promise<UnrootedQueryResponse>((resolve, reject) => {
        try {
          resolve(runUnrootedQuery(req));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
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

  const pending = new Map<number, { resolve(r: UnrootedQueryResponse): void; reject(e: Error): void }>();

  worker.onmessage = (event: MessageEvent<WorkerReply>) => {
    const msg = event.data;
    if (!msg) return;
    if (msg.ok) {
      pending.get(msg.response.id)?.resolve(msg.response);
      pending.delete(msg.response.id);
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
        pending.set(req.id, { resolve, reject });
        worker.postMessage(req);
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
