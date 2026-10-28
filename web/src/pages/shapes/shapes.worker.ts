/** Shapes worker: one job per message (`shapesClient.ts`), its result posted back. */

import { runShapes, type ShapesJob } from './shapesClient';

type WorkerScope = {
  onmessage: ((event: MessageEvent<ShapesJob>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  try {
    scope.postMessage(runShapes(event.data));
  } catch (err) {
    scope.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
