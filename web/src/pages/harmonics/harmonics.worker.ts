/** Harmonics worker: keeps one combination's renormalisation and answers `start` and `next` (`harmonicsJob.ts`). */

import { HarmonicsEngine, type WorkerMessage } from './harmonicsJob';

type Message = WorkerMessage & { id: number };
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
    if (!engine) throw new Error('no combination started');
    if (m.type === 'next') engine.next();
    scope.postMessage({ id: m.id, result: m.type === 'compare' ? engine.compare(m.a, m.b) : engine.result() });
  } catch (err) {
    scope.postMessage({ id: m.id, error: err instanceof Error ? err.message : String(err) });
  }
};
