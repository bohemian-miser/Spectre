/** Brute-force worker: keeps a combination's routes and answers `harmonic`, `climb` and `thumb` (`bruteJob.ts`), posting progress as it goes. */

import { answer, BruteEngine, reporter, type BruteMessage } from './bruteJob';

type Message = BruteMessage & { id: number };
type WorkerScope = {
  onmessage: ((event: MessageEvent<Message>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;
const engine = new BruteEngine();

scope.onmessage = (event) => {
  const m = event.data;
  const progress = reporter((p) => scope.postMessage({ id: m.id, progress: p }));
  try {
    const result = answer(engine, m, progress);
    scope.postMessage({ id: m.id, result });
  } catch (err) {
    scope.postMessage({ id: m.id, error: err instanceof Error ? err.message : String(err) });
  }
};
