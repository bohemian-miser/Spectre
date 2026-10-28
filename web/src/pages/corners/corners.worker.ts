/**
 * Corners worker: runs one job per message (`cornersClient.ts`) and posts its
 * result, in the order the jobs arrive.
 */

import { runJob, type CornersJob, type CornersReply } from './cornersClient';

type WorkerScope = {
  onmessage: ((event: MessageEvent<{ id: number; job: CornersJob }>) => void) | null;
  postMessage(message: CornersReply): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { id, job } = event.data;
  try {
    scope.postMessage({ id, result: runJob(job) });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
