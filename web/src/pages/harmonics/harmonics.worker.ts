/** Harmonics worker: one combination's circuits, readings and lineages per message (`harmonicsJob.ts`). */

import { harmonicsOf, type HarmonicsJob } from './harmonicsJob';

type WorkerScope = {
  onmessage: ((event: MessageEvent<{ id: number; job: HarmonicsJob }>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { id, job } = event.data;
  try {
    scope.postMessage({ id, result: harmonicsOf(job) });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
