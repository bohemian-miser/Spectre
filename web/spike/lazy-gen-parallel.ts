/**
 * Parallel expansion benchmark driver: splits the level-9 root's depth-2
 * subtrees (60 of them) round-robin across N node worker_threads.
 *
 * Run:  npx tsx spike/lazy-gen-parallel.ts
 */
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { buildSystem } from '../src/core/tiles';
import { expand, type View } from './lazy-gen';

const LEVEL = 9;
const here = dirname(fileURLToPath(import.meta.url));
// Bundle the worker to plain ESM (worker_threads + tsx loader do not resolve
// extensionless TS imports); this mirrors what Vite does for web workers.
const workerPath = join(here, '.build', 'lazy-gen-worker.mjs');
execFileSync(
  join(here, '..', 'node_modules', '.bin', 'esbuild'),
  [
    join(here, 'lazy-gen-worker.ts'),
    '--bundle',
    '--format=esm',
    '--platform=node',
    `--outfile=${workerPath}`,
  ],
  { stdio: 'pipe' },
);

const sys = buildSystem('spectre', LEVEL);
const root = sys['Delta'];

// count depth-2 subtrees
let subtreeCount = 0;
if (root.kind === 'meta') {
  for (const c1 of root.children) {
    subtreeCount += c1.node.kind === 'meta' ? c1.node.children.length : 1;
  }
}

const cx = 11388; // center-ish of the lvl9 patch (from lazy-gen bbox)
const cy = -12598;
const view: View = { cx, cy, halfW: 1430, halfH: 1430 };
const budget = 1_200_000;

async function runWorkers(
  n: number,
): Promise<{ wallMs: number; innerMs: number; count: number }> {
  const buckets: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < subtreeCount; i++) buckets[i % n].push(i);
  const t0 = performance.now();
  const results = await Promise.all(
    buckets.map(
      (subtrees) =>
        new Promise<{ count: number; ms: number }>((resolve, reject) => {
          const w = new Worker(workerPath, {
            workerData: { level: LEVEL, root: 'Delta', subtrees, view, budget },
          });
          w.once('message', (m) => {
            resolve(m as { count: number; ms: number });
            void w.terminate();
          });
          w.once('error', reject);
        }),
    ),
  );
  const wallMs = performance.now() - t0;
  return {
    wallMs,
    // Critical path of the actual expansion work (browser workers are
    // long-lived, so spawn/compile cost is one-time, not per-frame).
    innerMs: Math.max(...results.map((r) => r.ms)),
    count: results.reduce((a, r) => a + r.count, 0),
  };
}

// single-thread baseline (same machine, same view)
expand(root, LEVEL, view, budget); // warm
const t0 = performance.now();
const single = expand(root, LEVEL, view, budget);
const singleMs = performance.now() - t0;
console.log(
  `single-thread: ${single.count.toLocaleString('en-US')} instances in ${singleMs.toFixed(0)} ms ` +
    `(${Math.round(single.count / (singleMs / 1000)).toLocaleString('en-US')} inst/s)`,
);

const cores = os.cpus().length;
console.log(`machine has ${cores} cores; ${subtreeCount} depth-2 subtrees`);

async function main(): Promise<void> {
  for (const n of [2, 4, 8]) {
    // one warm run to amortize worker startup/tsx compile, then a timed run
    await runWorkers(n);
    const r = await runWorkers(n);
    console.log(
      `${n} workers: ${r.count.toLocaleString('en-US')} instances, wall ${r.wallMs.toFixed(0)} ms ` +
        `(incl. spawn), inner critical path ${r.innerMs.toFixed(0)} ms ` +
        `(${Math.round(r.count / (r.innerMs / 1000)).toLocaleString('en-US')} inst/s)`,
    );
  }
}
void main();
