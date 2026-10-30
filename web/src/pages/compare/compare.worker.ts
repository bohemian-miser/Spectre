/** Compare worker: two circuits named from outside, computed and lined up (`compareJob.ts`). */

import { compareRefs } from './compareJob';
import type { CircuitRef } from './refs';

type WorkerScope = {
  onmessage: ((event: MessageEvent<{ id: number; a: CircuitRef; b: CircuitRef }>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { id, a, b } = event.data;
  try {
    scope.postMessage({ id, result: compareRefs(a, b) });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
