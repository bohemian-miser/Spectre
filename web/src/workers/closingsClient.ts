/**
 * The level each circuit a search finds first closes at, from the
 * supertiles built up level by level (`firstClosings` in
 * `pages/buildup/buildup.ts`), in a worker that keeps the levels built for
 * the next question. Without `Worker` (node, vitest) it answers on the
 * calling thread, after a timeout.
 */

import { CircuitShapes } from '../pages/shapes/circuitShapes';
import { firstClosings, type FirstClosing } from '../pages/buildup/buildup';

export interface ClosingsRequest {
  readonly id: number;
  readonly subset: readonly number[];
  readonly combo: string;
  readonly circuits: readonly { readonly key: string; readonly length: number }[];
  readonly upTo: number;
}

/** Per circuit asked about, where it first closes, or null when it has not closed by `upTo`. */
export interface ClosingsReply { readonly id: number; readonly closings: readonly (readonly [string, FirstClosing | null])[] }

/** The levels built for one rule and combination, kept between questions. */
export class ClosingsJob {
  private cs: CircuitShapes | null = null;
  private rule = '';

  answer(req: Omit<ClosingsRequest, 'id'>): (readonly [string, FirstClosing | null])[] {
    const rule = `${req.subset.join('')}-${req.combo}`;
    if (!this.cs || this.rule !== rule) {
      this.cs = new CircuitShapes('hex', req.subset, [...req.combo].map((c) => parseInt(c, 36)), 0, 1, false);
      this.rule = rule;
    }
    const got = firstClosings(this.cs, req.circuits, req.upTo);
    return req.circuits.map((c) => [c.key, got.get(c.key) ?? null] as const);
  }
}

export interface ClosingsClient {
  ask(subset: readonly number[], combo: string, circuits: readonly { readonly key: string; readonly length: number }[], upTo: number, onAnswer: (closings: readonly (readonly [string, FirstClosing | null])[]) => void): void;
  dispose(): void;
}

let nextId = 1;

export function createClosingsClient(): ClosingsClient {
  const waiting = new Map<number, (closings: ClosingsReply['closings']) => void>();
  let worker: Worker | null = null;
  if (typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./closings.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<ClosingsReply>) => {
        const done = waiting.get(e.data.id);
        waiting.delete(e.data.id);
        done?.(e.data.closings);
      };
    } catch {
      worker = null;
    }
  }
  const job = worker ? null : new ClosingsJob();
  let live = true;
  return {
    ask(subset, combo, circuits, upTo, onAnswer) {
      if (!live) return;
      if (worker) {
        const id = nextId++;
        waiting.set(id, onAnswer);
        worker.postMessage({ id, subset, combo, circuits, upTo } satisfies ClosingsRequest);
        return;
      }
      setTimeout(() => { if (live) onAnswer(job!.answer({ subset, combo, circuits, upTo })); }, 0);
    },
    dispose() {
      live = false;
      worker?.terminate();
      worker = null;
      waiting.clear();
    },
  };
}
