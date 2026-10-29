/**
 * Circuit walker search worker: walks its share of the search's branches
 * breadth first (`Subtrees` in `pages/walker/search.ts`), keeping their
 * stacks here, and posts a record per branch walked. It runs in slices,
 * so a request to hand branches to another worker is answered between them.
 */

import { Subtrees } from '../pages/walker/search';
import type { SearchReply, SearchRequest } from './searchClient';

type WorkerScope = {
  onmessage: ((event: MessageEvent<SearchRequest>) => void) | null;
  postMessage(message: SearchReply): void;
};

const scope = globalThis as unknown as WorkerScope;
let subtrees: Subtrees | null = null;
let running = false;

const slice = (): void => {
  if (!subtrees || !running) return;
  const walked = subtrees.run(100);
  scope.postMessage({ type: 'walked', walked, waiting: subtrees.waiting });
  if (subtrees.waiting > 0) setTimeout(slice, 0);
  else running = false;
};

scope.onmessage = (event: MessageEvent<SearchRequest>) => {
  const req = event.data;
  if (req.type === 'init') subtrees = new Subtrees(req.walker, req.tag, req.tiles);
  else if (req.type === 'add' && subtrees) {
    subtrees.add(req.branches);
    if (!running) { running = true; setTimeout(slice, 0); }
  } else if (req.type === 'give' && subtrees) scope.postMessage({ type: 'given', branches: subtrees.give(req.n), waiting: subtrees.waiting });
  else if (req.type === 'stop') running = false;
};
