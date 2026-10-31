/** Harmonic search worker: holds one patch's strands (`load`) and scores them against a circuit per `search` (`harmonicSearch.ts`). */

import type { WorkerIn } from './harmonicSearchClient';
import { HarmonicPatch } from './harmonicSearchClient';

type WorkerScope = {
  onmessage: ((event: MessageEvent<WorkerIn>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;
let patch: HarmonicPatch | null = null;

scope.onmessage = (event) => {
  const m = event.data;
  if (m.type === 'load') {
    patch = new HarmonicPatch(m.patch);
    return;
  }
  try {
    if (!patch || patch.key !== m.key) throw new Error('no patch loaded');
    scope.postMessage({ id: m.id, result: patch.search(m.params) });
  } catch (err) {
    scope.postMessage({ id: m.id, error: err instanceof Error ? err.message : String(err) });
  }
};
