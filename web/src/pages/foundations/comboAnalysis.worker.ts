/** Foundations worker: analyses combinations live (`liveAnalysis.ts`), posting each result and the progress. */

import { runLive, type LiveJob } from './liveAnalysis';

type WorkerScope = {
  onmessage: ((event: MessageEvent<LiveJob>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  try {
    runLive(
      event.data,
      (result) => scope.postMessage({ result }),
      (progress) => scope.postMessage({ progress }),
    );
    scope.postMessage({ done: true });
  } catch (err) {
    scope.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
