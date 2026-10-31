/** Identify worker: runs one strand's analysis level by level, posting each level's report (`identify.ts`), until done or told to stop. */

import { IdentifyEngine, type IdentifyJob } from './identify';

type Message = { type: 'start'; job: IdentifyJob } | { type: 'stop' };
type WorkerScope = {
  onmessage: ((event: MessageEvent<Message>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;
let run = 0;

scope.onmessage = (event) => {
  const m = event.data;
  const mine = ++run;
  if (m.type === 'stop') return;
  let engine: IdentifyEngine;
  try {
    engine = new IdentifyEngine(m.job);
  } catch (err) {
    scope.postMessage({ type: 'error', error: err instanceof Error ? err.message : String(err) });
    return;
  }
  const step = (): void => {
    if (run !== mine) return;
    try {
      const report = engine.step();
      scope.postMessage({ type: 'report', report });
      if (!report.done) setTimeout(step, 0);
    } catch (err) {
      scope.postMessage({ type: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  };
  setTimeout(step, 0);
};
