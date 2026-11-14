/**
 * Renders a voice's clips off the page's thread, one job per message, in
 * the order the jobs arrive (`renderClient.ts`). A spectrum with hundreds of
 * terms takes seconds; the page keeps playing and drawing meanwhile.
 */

import { runRender, type RenderJob, type RenderReply } from './renderClient';

type WorkerScope = {
  onmessage: ((event: MessageEvent<RenderJob>) => void) | null;
  postMessage(message: RenderReply, transfer: Transferable[]): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  const job = event.data;
  try {
    const clip = runRender(job);
    scope.postMessage({ id: job.id, clip }, [clip.left.buffer, clip.right.buffer]);
  } catch (err) {
    scope.postMessage({ id: job.id, error: err instanceof Error ? err.message : String(err) }, []);
  }
};
