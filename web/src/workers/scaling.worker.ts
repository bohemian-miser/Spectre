/**
 * Scaling worker: measures a batch of strand rules across supertile levels
 * (`core/scaling.ts`), posting each row as it is done so the page fills in.
 */

import { measureScaling } from '../core';
import type { ScalingJob, ScalingReply } from './scalingClient';

type WorkerScope = {
  onmessage: ((event: MessageEvent<ScalingJob>) => void) | null;
  postMessage(message: ScalingReply): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<ScalingJob>) => {
  const job = event.data;
  job.rows.forEach((row, index) => {
    try {
      scope.postMessage({ id: job.id, index, scaling: measureScaling(job.family, job.root, job.levels, row.subset, row.combo) });
    } catch (err) {
      scope.postMessage({ id: job.id, index, error: err instanceof Error ? err.message : String(err) });
    }
  });
  scope.postMessage({ id: job.id, done: true });
};
