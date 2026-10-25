/**
 * Find-all passes in a worker, with an inline fallback — the same pattern as
 * `tilingClient.ts`. Inline (node, vitest, no `Worker`) a pass returns its
 * result directly, so the component's find-all stays synchronous and testable
 * end to end; in a worker it resolves later and the main thread never waits.
 *
 * The pass remembers what it has found ({@link FindPassState}), so the state
 * lives wherever the passes run. `keep` tells it which circuits the caller
 * still holds; the chord table is sent only when it changes.
 */

import { FindPassState, type FindCut, type FindPassResult, type FindTable } from '../pages/map/findPass';

export interface FindRequest {
  readonly id: number;
  readonly cut: FindCut;
  readonly table?: FindTable;
  readonly keep?: readonly number[];
}

export type FindReply =
  | { readonly ok: true; readonly id: number; readonly result: FindPassResult }
  | { readonly ok: false; readonly id: number; readonly error: string };

export interface FindClient {
  readonly usesWorker: boolean;
  /**
   * One pass over `cut`. `table` is compared by identity; `keep`, when given,
   * first narrows what the pass remembers to those circuit ids.
   */
  pass(cut: FindCut, table: FindTable, keep?: readonly number[]): FindPassResult | Promise<FindPassResult>;
  dispose(): void;
}

export interface FindClientOptions {
  /** Run passes inline, on the calling thread. */
  readonly forceSync?: boolean;
}

function createInlineClient(): FindClient {
  const state = new FindPassState();
  return {
    usesWorker: false,
    pass: (cut, table, keep) => {
      if (keep) state.keep(keep);
      return state.pass(cut, table);
    },
    dispose: () => {},
  };
}

export function createFindClient(opts: FindClientOptions = {}): FindClient {
  if (opts.forceSync || typeof Worker === 'undefined') return createInlineClient();

  let worker: Worker;
  try {
    worker = new Worker(new URL('./find.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return createInlineClient();
  }

  const pending = new Map<number, { resolve(r: FindPassResult): void; reject(e: Error): void }>();
  let nextId = 1;
  let sentTable: FindTable | null = null;

  worker.onmessage = (event: MessageEvent<FindReply>) => {
    const msg = event.data;
    const p = msg && pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.ok) p.resolve(msg.result);
    else p.reject(new Error(msg.error));
  };
  worker.onerror = (event) => {
    const err = new Error(`find worker failed: ${event.message ?? 'unknown error'}`);
    for (const p of pending.values()) p.reject(err);
    pending.clear();
    sentTable = null;
  };

  return {
    usesWorker: true,
    pass: (cut, table, keep) =>
      new Promise<FindPassResult>((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        // Only what the pass reads: the cut's arrays are copied, as the
        // renderer still holds them.
        const req: FindRequest = {
          id,
          cut: { count: cut.count, origin: cut.origin, pos: cut.pos, code: cut.code, type: cut.type },
          table: table === sentTable ? undefined : table,
          keep,
        };
        sentTable = table;
        worker.postMessage(req);
      }),
    dispose: () => {
      pending.clear();
      worker.terminate();
    },
  };
}
