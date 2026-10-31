/**
 * Identify worker: runs one strand's analysis level by level, posting each
 * level's report (`identify.ts`), until done or halted; and answers
 * questions about the members drawn (`members.ts`) from what it has built.
 */

import { IdentifyEngine, type IdentifyJob } from './identify';
import { Members } from './members';
import { answer, type MembersCall } from './client';

type Message = { type: 'start'; job: IdentifyJob } | { type: 'halt' } | { type: 'ask'; id: number; call: MembersCall };
type WorkerScope = {
  onmessage: ((event: MessageEvent<Message>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;
let run = 0;
let members: Members | null = null;

scope.onmessage = (event) => {
  const m = event.data;
  if (m.type === 'ask') {
    try {
      scope.postMessage({ type: 'answer', id: m.id, result: answer(members, m.call) });
    } catch (err) {
      scope.postMessage({ type: 'answer', id: m.id, error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }
  const mine = ++run;
  if (m.type === 'halt') return;
  let engine: IdentifyEngine;
  try {
    engine = new IdentifyEngine(m.job);
    members = new Members(engine);
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
