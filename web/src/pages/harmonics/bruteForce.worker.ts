/** Brute-force worker: keeps a combination's routes and answers `harmonic` and `climb` (`bruteJob.ts`), posting progress as it goes. */

import { BruteEngine, type BruteMessage } from './bruteJob';
import type { Progress } from './bruteForce';

type Message = BruteMessage & { id: number };
type WorkerScope = {
  onmessage: ((event: MessageEvent<Message>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;
const engine = new BruteEngine();

scope.onmessage = (event) => {
  const m = event.data;
  let last = 0;
  const progress = (p: Progress): void => {
    const now = Date.now();
    if (now - last < 250) return;
    last = now;
    scope.postMessage({ id: m.id, progress: p });
  };
  try {
    const result = m.type === 'harmonic' ? engine.harmonic(m.job, m.from, progress) : engine.climb(m.job, m.level, progress);
    scope.postMessage({ id: m.id, result });
  } catch (err) {
    scope.postMessage({ id: m.id, error: err instanceof Error ? err.message : String(err) });
  }
};
