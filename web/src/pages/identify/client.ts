/** Runs a strand's analysis in a worker (`identify.worker.ts`), or on the page when workers are missing, one report per level. */

import { IdentifyEngine, type IdentifyJob, type Report } from './identify';

export interface IdentifyRun {
  stop(): void;
}

export function startIdentify(job: IdentifyJob, onReport: (r: Report) => void, onError: (message: string) => void, opts: { forceSync?: boolean } = {}): IdentifyRun {
  let worker: Worker | null = null;
  if (!opts.forceSync && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./identify.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
  }
  if (worker) {
    const w = worker;
    w.onmessage = (e: MessageEvent<{ type: 'report'; report: Report } | { type: 'error'; error: string }>) => {
      if (e.data.type === 'report') onReport(e.data.report);
      else onError(e.data.error);
    };
    w.onerror = (e) => onError(e.message || 'the worker failed');
    w.postMessage({ type: 'start', job });
    return { stop: () => w.terminate() };
  }
  let on = true;
  let engine: IdentifyEngine | null = null;
  const step = (): void => {
    if (!on) return;
    try {
      engine ??= new IdentifyEngine(job);
      const r = engine.step();
      onReport(r);
      if (!r.done) setTimeout(step, 0);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  };
  setTimeout(step, 0);
  return { stop: () => { on = false; } };
}
