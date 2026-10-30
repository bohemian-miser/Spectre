/**
 * Limit shape worker: builds the outlines level by level
 * (`pages/limit/compute.ts`), posting progress, the outlines, then how far
 * each start is from the top level.
 */

import { compareStarts, computeLimit, type LimitData, type StartGaps } from '../pages/limit/compute';

export type LimitReply =
  | { readonly level: number }
  | { readonly data: LimitData }
  | { readonly starts: readonly StartGaps[] }
  | { readonly error: string };

type WorkerScope = {
  onmessage: ((event: MessageEvent<{ top: number }>) => void) | null;
  postMessage(message: LimitReply): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  try {
    const data = computeLimit(event.data.top, (level) => scope.postMessage({ level }));
    scope.postMessage({ data });
    scope.postMessage({ starts: compareStarts(data) });
  } catch (err) {
    scope.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
