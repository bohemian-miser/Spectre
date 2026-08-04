/**
 * Un-rooted tiling worker entry (BIGMAP stage 1).
 *
 * The engine lives in `core/unrooted.ts` (`runUnrootedQuery`), which is pure;
 * this file only touches the worker global scope — the same split as
 * `analysis.worker.ts`. Result typed arrays are passed as transferables
 * (zero-copy: ~10 bytes/instance).
 */

import { runUnrootedQuery, type UnrootedQueryRequest, type UnrootedQueryResponse } from '../core';

type WorkerScope = {
  onmessage: ((event: MessageEvent<UnrootedQueryRequest>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<UnrootedQueryRequest>) => {
  const req = event.data;
  try {
    const response: UnrootedQueryResponse = runUnrootedQuery(req);
    const transfer: Transferable[] = [
      response.cut.pos.buffer,
      response.cut.code.buffer,
      response.cut.type.buffer,
    ];
    if (response.cut.exact) transfer.push(response.cut.exact.buffer);
    scope.postMessage({ ok: true, response }, transfer);
  } catch (err) {
    scope.postMessage({
      ok: false,
      id: req?.id ?? -1,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
