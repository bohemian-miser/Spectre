/**
 * Find-all worker entry: runs {@link FindPassState} passes off the main
 * thread, so a find pass over a big display cut never stalls a pan. The pass
 * itself lives in `pages/map/findPass.ts`, which is pure; this file only
 * touches the worker global scope, as `tiling.worker.ts` does. Result arrays
 * go back as transferables.
 */

import { FindPassState, type FindTable } from '../pages/map/findPass';
import type { FindReply, FindRequest } from './findClient';

type WorkerScope = {
  onmessage: ((event: MessageEvent<FindRequest>) => void) | null;
  postMessage(message: FindReply, transfer?: Transferable[]): void;
};

const scope = globalThis as unknown as WorkerScope;
const state = new FindPassState();
let table: FindTable | null = null;

scope.onmessage = (event: MessageEvent<FindRequest>) => {
  const req = event.data;
  try {
    if (req.table) table = req.table;
    if (req.keep) state.keep(req.keep);
    if (!table) throw new Error('find worker: no chord table yet');
    const result = state.pass(req.cut, table);
    const transfer: Transferable[] = [];
    for (const l of result.fresh) transfer.push(l.xy.buffer, l.arc.buffer);
    scope.postMessage({ ok: true, id: req.id, result }, transfer);
  } catch (err) {
    scope.postMessage({ ok: false, id: req.id, error: err instanceof Error ? err.message : String(err) });
  }
};
