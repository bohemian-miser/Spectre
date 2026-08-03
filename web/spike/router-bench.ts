/**
 * Spike 4 benchmark — hierarchical router at levels the oracle cannot reach.
 *
 *  - lvl6: full cross-check against analyze() (272 791 tiles, the current
 *    site's worker-limit case).
 *  - lvl7/8/9: router only. Reports per-level: time, RSS, summary sizes
 *    (ports/chains), boundary-edge counts, and the exact global circuit/tail
 *    tallies for a full level-9 patch.
 *
 * Run:  node --expose-gc --import tsx spike/router-bench.ts
 */

import { analyze, pathLength } from '../src/core/circuits';
import { comboToMatchingIndices } from '../src/core/matchings';
import { LEAF_ORDER } from '../src/core/families';
import { buildSystem, flatten, type TileNode } from '../src/core/tiles';
import {
  boundaryOf,
  finalize,
  newRun,
  resetJunctionKeys,
  summarize,
} from './router';

const family = 'spectre' as const;

function histOf(paths: readonly { points: readonly unknown[]; closed: boolean }[]) {
  const out = new Map<number, number>();
  for (const p of paths) {
    const len = pathLength(p as never);
    out.set(len, (out.get(len) ?? 0) + 1);
  }
  return out;
}
function histEq(a: Map<number, number>, b: Map<number, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}
function topOf(h: Map<number, number>, k = 8): string {
  const entries = [...h.entries()].sort((x, y) => x[0] - y[0]);
  const head = entries.slice(0, k).map(([l, n]) => `${l}:${n}`).join(', ');
  return `${entries.length} lengths [${head}${entries.length > k ? ', …' : ''}]`;
}
function total(h: Map<number, number>): number {
  let t = 0;
  for (const n of h.values()) t += n;
  return t;
}
const mb = (b: number) => (b / 1e6).toFixed(0) + ' MB';

const CONFIGS = [
  { subset: [2, 5, 7, 8], combo: '0100101100' },
  { subset: [0, 2, 3, 6, 7, 8], combo: '0001000010' },
];

for (const { subset, combo } of CONFIGS) {
  console.log(`\n=== subset ${subset.join('')}, combo ${combo} ===`);
  const indices = comboToMatchingIndices(family, subset, combo);
  const matchingIndexByType: Record<string, number> = {};
  LEAF_ORDER.forEach((t, i) => (matchingIndexByType[t] = indices[i]));

  // --- lvl6 oracle cross-check ---
  {
    const sys = buildSystem(family, 6);
    const root = sys['Delta'];
    const t0 = performance.now();
    const oracle = analyze({
      family,
      instances: flatten(root),
      selected: new Set(subset),
      matchingIndexByType,
    });
    const t1 = performance.now();
    resetJunctionKeys();
    const run = newRun({ family, selected: new Set(subset), matchingIndexByType });
    const router = finalize(root, run);
    const t2 = performance.now();
    const ok =
      histEq(histOf(oracle.circuits), router.circuits) &&
      histEq(histOf(oracle.tails), router.tails) &&
      oracle.junctionCount === router.junctions;
    console.log(
      `lvl6 cross-check: ${ok ? 'PASS' : 'FAIL'} — oracle ${(t1 - t0).toFixed(0)} ms vs router ${(
        t2 - t1
      ).toFixed(0)} ms  (circuits ${oracle.circuits.length}, tails ${oracle.tails.length})`,
    );
    if (!ok) process.exitCode = 1;
  }

  // --- lvl7..9, router only, fresh caches per level for honest timing ---
  for (const level of [7, 8, 9]) {
    if (globalThis.gc) globalThis.gc();
    const before = process.memoryUsage().rss;
    const sys = buildSystem(family, level);
    const root = sys['Delta'];
    resetJunctionKeys();
    const run = newRun({ family, selected: new Set(subset), matchingIndexByType });
    const t0 = performance.now();
    const summary = summarize(root, run);
    const result = finalize(root, run);
    const t1 = performance.now();
    const after = process.memoryUsage().rss;

    const rootBoundary = boundaryOf(root as TileNode, family).length / 4;
    console.log(
      `lvl${level}: ${(t1 - t0).toFixed(0)} ms, RSS +${mb(after - before)} | ` +
        `root ports ${summary.nodes.length}, live chains ${summary.chains.length}, boundary edges ${rootBoundary}`,
    );
    console.log(
      `   circuits ${total(result.circuits).toLocaleString('en-US')} (${topOf(result.circuits)})`,
    );
    console.log(
      `   tails ${total(result.tails).toLocaleString('en-US')} (${topOf(result.tails)}), junctions ${result.junctions}`,
    );
  }
}

// Boundary growth table (subset-independent).
console.log('\n=== boundary edge growth per level (Delta) ===');
for (let lv = 0; lv <= 9; lv++) {
  const sys = buildSystem(family, lv);
  const e = boundaryOf(sys['Delta'], family).length / 4;
  console.log(`lvl ${lv}: ${e.toLocaleString('en-US')} boundary edges`);
}
