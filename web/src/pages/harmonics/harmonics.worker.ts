/** Harmonics worker: keeps one combination's renormalisation and answers `start` and `next` (`harmonicsJob.ts`). */

import { HarmonicsEngine, type HarmonicsJob } from './harmonicsJob';

type Message = { id: number; type: 'start'; job: HarmonicsJob } | { id: number; type: 'next' };
type WorkerScope = {
  onmessage: ((event: MessageEvent<Message>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;
let engine: HarmonicsEngine | null = null;

scope.onmessage = (event) => {
  const m = event.data;
  try {
    if (m.type === 'start') engine = new HarmonicsEngine(m.job);
    else if (!engine) throw new Error('no combination started');
    else engine.next();
    scope.postMessage({ id: m.id, result: engine.result() });
  } catch (err) {
    scope.postMessage({ id: m.id, error: err instanceof Error ? err.message : String(err) });
  }
};
