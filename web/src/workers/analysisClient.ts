/**
 * Worker wrapper around `core`'s `runAnalysis`, with a synchronous fallback.
 *
 * The fallback is what keeps the widget layer testable: in node (vitest) or any
 * environment without `Worker`, `run()` still resolves with a real result, just
 * on the calling thread. Newest-request-wins cancellation is handled by the
 * `id` echoed through `AnalysisRequest`/`AnalysisResponse`.
 */

import { runAnalysis, type AnalysisRequest, type AnalysisResponse } from '../core';

export interface AnalysisClient {
  readonly usesWorker: boolean;
  run(req: AnalysisRequest): Promise<AnalysisResponse>;
  dispose(): void;
}

type WorkerReply =
  | { ok: true; response: AnalysisResponse }
  | { ok: false; id: number; error: string };

export interface AnalysisClientOptions {
  /** Skip the worker entirely (tests, tiny levels, SSR). */
  readonly forceSync?: boolean;
}

function createSyncClient(): AnalysisClient {
  return {
    usesWorker: false,
    run: (req) =>
      new Promise<AnalysisResponse>((resolve, reject) => {
        try {
          resolve(runAnalysis(req));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }),
    dispose: () => {},
  };
}

/**
 * Create an analysis client. Falls back to synchronous execution whenever a
 * module worker cannot be constructed (node, older browsers, CSP).
 */
export function createAnalysisClient(opts: AnalysisClientOptions = {}): AnalysisClient {
  if (opts.forceSync || typeof Worker === 'undefined') return createSyncClient();

  let worker: Worker;
  try {
    worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return createSyncClient();
  }

  const pending = new Map<number, { resolve(r: AnalysisResponse): void; reject(e: Error): void }>();

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
    const err = new Error(`analysis worker failed: ${event.message ?? 'unknown error'}`);
    for (const p of pending.values()) p.reject(err);
    pending.clear();
  };

  return {
    usesWorker: true,
    run: (req) =>
      new Promise<AnalysisResponse>((resolve, reject) => {
        pending.set(req.id, { resolve, reject });
        worker.postMessage(req);
      }),
    dispose: () => {
      pending.clear();
      worker.terminate();
    },
  };
}

/** Synchronous escape hatch, used below the worker threshold and in tests. */
export function analyzeSync(req: AnalysisRequest): AnalysisResponse {
  return runAnalysis(req);
}
