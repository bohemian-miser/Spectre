/**
 * Closings worker: answers where circuits first close as the supertiles are
 * built up (`ClosingsJob` in `closingsClient.ts`), keeping the levels built.
 */

import { ClosingsJob, type ClosingsReply, type ClosingsRequest } from './closingsClient';

type WorkerScope = {
  onmessage: ((event: MessageEvent<ClosingsRequest>) => void) | null;
  postMessage(message: ClosingsReply): void;
};

const scope = globalThis as unknown as WorkerScope;
const job = new ClosingsJob();

scope.onmessage = (event: MessageEvent<ClosingsRequest>) => {
  const { id, ...req } = event.data;
  scope.postMessage({ id, closings: job.answer(req) });
};
