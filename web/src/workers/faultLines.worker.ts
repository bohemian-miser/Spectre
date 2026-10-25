/**
 * Fault-lines worker: places and compares many pairings (`core/faultLines.ts`),
 * posting progress as it goes, and renders band-coloured thumbnails.
 */

import { renderFaultThumb, runFaultSurvey } from './faultJobs';
import type { FaultReply, FaultRequest } from './faultLinesClient';

type WorkerScope = {
  onmessage: ((event: MessageEvent<FaultRequest>) => void) | null;
  postMessage(message: FaultReply, transfer?: Transferable[]): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<FaultRequest>) => {
  const req = event.data;
  try {
    if (req.kind === 'survey') {
      let last = 0;
      const survey = runFaultSurvey(req.job, (done, total) => {
        const now = Date.now();
        if (now - last > 100 || done === total) {
          last = now;
          scope.postMessage({ id: req.id, kind: 'progress', done, total });
        }
      });
      scope.postMessage({ id: req.id, kind: 'survey', survey }, [survey.matrix.buffer]);
    } else {
      const rgba = renderFaultThumb(req.job);
      scope.postMessage({ id: req.id, kind: 'thumb', rgba }, [rgba.buffer]);
    }
  } catch (err) {
    scope.postMessage({ id: req.id, kind: 'error', error: err instanceof Error ? err.message : String(err) });
  }
};
