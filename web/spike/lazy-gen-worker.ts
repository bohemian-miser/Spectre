/**
 * Worker body for the parallel expansion benchmark (node worker_threads; a
 * browser Web Worker version is line-for-line the same modulo postMessage).
 *
 * Each worker rebuilds the (tiny, 8 ms) substitution DAG itself, then expands
 * the subtrees assigned to it. That mirrors the browser plan: workers hold
 * their own DAG; only compact typed arrays cross thread boundaries.
 */
import { parentPort, workerData } from 'node:worker_threads';
import { buildSystem } from '../src/core/tiles';
import { mul, type Affine } from '../src/core/geom';
import { expand, type View } from './lazy-gen';

interface Job {
  level: number;
  root: string;
  /** Indices into a depth-2 subtree enumeration (children of children). */
  subtrees: number[];
  view: View;
  budget: number;
}

const job = workerData as Job;
const sys = buildSystem('spectre', job.level);
const root = sys[job.root];

// Enumerate depth-2 subtrees with their composed transforms.
const subs: { node: import('../src/core/tiles').TileNode; xform: Affine; level: number }[] = [];
if (root.kind === 'meta') {
  for (const c1 of root.children) {
    if (c1.node.kind === 'meta') {
      for (const c2 of c1.node.children) {
        subs.push({ node: c2.node, xform: mul(c1.xform, c2.xform), level: job.level - 2 });
      }
    } else {
      subs.push({ node: c1.node, xform: c1.xform, level: job.level - 1 });
    }
  }
}

// Wrap ALL assigned subtrees in one synthetic meta so expand() runs once and
// the output buffers are allocated once (they are reused across frames in the
// real renderer).
const mine = job.subtrees.map((idx) => subs[idx]);
const wrapped = {
  kind: 'meta' as const,
  type: 'Delta' as const,
  quad: [],
  children: mine.map((s, i) => ({ node: s.node, xform: s.xform, pos: i })),
};
const t0 = performance.now();
const em = expand(wrapped, mine[0].level + 1, job.view, job.budget);
const ms = performance.now() - t0;
parentPort!.postMessage({ count: em.count, ms });
