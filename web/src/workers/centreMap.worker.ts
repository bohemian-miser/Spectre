/**
 * Centre-map worker: circuit centres of many pairings, the directed chamfer
 * matrix between them, and a UMAP of its rows, posting progress as it goes.
 */

import { runCentreMap } from './centreMapJobs';
import type { CentreMapReply, CentreMapRequest } from './centreMapClient';

type WorkerScope = {
  onmessage: ((event: MessageEvent<CentreMapRequest>) => void) | null;
  postMessage(message: CentreMapReply, transfer?: Transferable[]): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<CentreMapRequest>) => {
  const req = event.data;
  try {
    let last = 0;
    const result = runCentreMap(req.job, (phase, done, total) => {
      const now = Date.now();
      if (now - last > 100 || done === total || phase === 'layout') {
        last = now;
        scope.postMessage({ id: req.id, kind: 'progress', phase, done, total });
      }
    });
    scope.postMessage({ id: req.id, kind: 'done', result }, [result.matrix.buffer, result.embedding.buffer]);
  } catch (err) {
    scope.postMessage({ id: req.id, kind: 'error', error: err instanceof Error ? err.message : String(err) });
  }
};
