/** Combination worker: one combination's circuits per message (`comboCircuits.ts`). */

import { comboCircuits, type ComboJob } from './comboCircuits';

type WorkerScope = {
  onmessage: ((event: MessageEvent<{ id: number; job: ComboJob }>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { id, job } = event.data;
  try {
    scope.postMessage({ id, circuits: comboCircuits(job) });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
