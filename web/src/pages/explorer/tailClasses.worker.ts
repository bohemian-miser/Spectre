/** Tail classes worker: keeps the last combination's tables (`tailShapes`) and follows a patch's tails (`TailClassifier`), posting fates as they are known, then a candidate for each strand still open. */

import { analyseCombo } from '../foundations/comboAnalysis';
import { pageCombo } from '../foundations/pageData';
import { openCandidate, TailClassifier, tailShapes, type TailShapes } from './tailClasses';
import type { TailsIn, TailsOut } from './tailClassesClient';

type WorkerScope = {
  onmessage: ((event: MessageEvent<TailsIn>) => void) | null;
  postMessage(message: TailsOut): void;
};

const scope = globalThis as unknown as WorkerScope;
let held: TailShapes | null = null;

scope.onmessage = (event) => {
  const { id, job, known } = event.data;
  try {
    const t0 = Date.now();
    if (!held || held.combo !== job.combo || held.subset.join('') !== job.subset.join('')) {
      held = null;
      held = tailShapes(job.subset, job.combo, known, (s, c, l) => pageCombo(analyseCombo(s, c, l)), undefined, (stage) =>
        scope.postMessage({ id, update: { stage, done: 0, total: job.tails.length, fates: [], closings: [], finished: false, chains: [], seconds: (Date.now() - t0) / 1000 } }),
      );
    }
    const tc = new TailClassifier(job, held, (update) => scope.postMessage({ id, update }));
    const fates = tc.run();
    const strands = new Set<number>();
    for (const f of fates) if (f?.state === 'open') strands.add(f.strand);
    for (const s of strands) scope.postMessage({ id, candidate: { strand: s, label: openCandidate(job, s, held) } });
    scope.postMessage({ id, end: true });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
