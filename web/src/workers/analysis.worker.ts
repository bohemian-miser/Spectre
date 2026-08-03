/**
 * Circuit-analysis worker entry (DESIGN.md §5.5).
 *
 * The heavy lifting lives in `core/analysis-request.ts` (`runAnalysis`), which
 * is pure; this file exists only to touch the worker global scope, which is why
 * it sits in the app layer rather than in `core/` (see the note at the top of
 * `core/analysis-request.ts`).
 */

import { runAnalysis, type AnalysisRequest, type AnalysisResponse } from '../core';

type WorkerScope = {
  onmessage: ((event: MessageEvent<AnalysisRequest>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = self as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<AnalysisRequest>) => {
  const req = event.data;
  try {
    const response: AnalysisResponse = runAnalysis(req);
    scope.postMessage({ ok: true, response });
  } catch (err) {
    scope.postMessage({
      ok: false,
      id: req?.id ?? -1,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
