/**
 * The circuit walker's breadth-first search on every core but one: a worker
 * per core, each walking its share of the branches (`search.worker.ts`).
 * The first worker starts from the root; a worker that runs out is given
 * half the waiting branches of the one with most. The page gets the records
 * of the branches walked, and the branch each worker walked last. Without
 * `Worker` (node, vitest) one `Subtrees` runs on the calling thread.
 */

import { Subtrees, branchOf, type Branch, type Handle, type Walked } from '../pages/walker/search';
import { FRESH } from '../pages/walker/canon';
import type { Stage, Walker } from '../pages/walker/possible';

export type SearchRequest =
  | { readonly type: 'init'; readonly walker: Walker; readonly tag: string; readonly tiles: number }
  | { readonly type: 'add'; readonly branches: readonly Branch[] }
  | { readonly type: 'give'; readonly n: number }
  | { readonly type: 'stop' };

export type SearchReply =
  | { readonly type: 'walked'; readonly walked: readonly Walked[]; readonly waiting: number }
  | { readonly type: 'given'; readonly branches: readonly Branch[]; readonly waiting: number };

export interface SearchUpdate {
  readonly walked: readonly Walked[];
  /** The branch each worker walked last. */
  readonly at: readonly Handle[];
  /** Branches waiting, in all; 0 once the search has nothing left within its tile limit. */
  readonly waiting: number;
}

export interface Search {
  readonly workers: number;
  stop(): void;
}

/** `oneReading`: cut every branch that is not the first reading of what it closes on (`canon.ts`). */
export function startSearch(walker: Walker, root: Stage, tiles: number, oneReading: boolean, onUpdate: (u: SearchUpdate) => void, size = Math.max(1, (globalThis.navigator?.hardwareConcurrency ?? 2) - 1)): Search {
  const rootBranch = branchOf('0', root, oneReading ? FRESH : undefined);
  if (typeof Worker === 'undefined') {
    const sub = new Subtrees(walker, 'w0', tiles);
    sub.add([rootBranch]);
    let live = true;
    const slice = (): void => {
      if (!live) return;
      const walked = sub.run(100);
      onUpdate({ walked, at: walked.length ? [walked[walked.length - 1].handle] : [], waiting: sub.waiting });
      if (sub.waiting > 0) setTimeout(slice, 0);
    };
    setTimeout(slice, 0);
    return { workers: 1, stop: () => { live = false; } };
  }
  const workers = Array.from({ length: size }, (_, i) => ({
    worker: new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' }),
    waiting: i === 0 ? 1 : 0,
    at: '' as Handle,
    asked: false,
  }));
  let live = true;
  const balance = (): void => {
    for (const idle of workers.filter((w) => w.waiting === 0)) {
      const rich = workers.reduce((a, b) => (b.waiting > a.waiting ? b : a));
      if (rich.waiting < 2 || rich.asked) return;
      rich.asked = true;
      rich.worker.postMessage({ type: 'give', n: Math.ceil(rich.waiting / 2) } satisfies SearchRequest);
      idle.waiting = -1; // promised branches
    }
  };
  workers.forEach((w, i) => {
    w.worker.postMessage({ type: 'init', walker, tag: `w${i}`, tiles } satisfies SearchRequest);
    w.worker.onmessage = (event: MessageEvent<SearchReply>) => {
      if (!live) return;
      const msg = event.data;
      if (msg.type === 'walked') {
        w.waiting = msg.waiting;
        if (msg.walked.length) w.at = msg.walked[msg.walked.length - 1].handle;
        onUpdate({ walked: msg.walked, at: workers.map((x) => x.at).filter(Boolean), waiting: workers.reduce((a, x) => a + Math.max(0, x.waiting), 0) });
      } else {
        w.asked = false;
        w.waiting = msg.waiting;
        const to = workers.find((x) => x.waiting === -1);
        if (to && msg.branches.length) {
          to.waiting = msg.branches.length;
          to.worker.postMessage({ type: 'add', branches: msg.branches } satisfies SearchRequest);
        } else if (to) to.waiting = 0;
      }
      balance();
    };
  });
  workers[0].worker.postMessage({ type: 'add', branches: [rootBranch] } satisfies SearchRequest);
  return {
    workers: size,
    stop: () => {
      live = false;
      for (const w of workers) w.worker.terminate();
    },
  };
}
