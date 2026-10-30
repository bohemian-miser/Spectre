/** Foundations worker: draws a combination's foundational circuits (`drawings.ts`). */

import { drawCircuits, type DrawJob } from './drawings';

type WorkerScope = {
  onmessage: ((event: MessageEvent<{ id: number; job: DrawJob }>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { id, job } = event.data;
  try {
    scope.postMessage({ id, result: drawCircuits(job) });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
