/**
 * Find configurations whose welded strand graph actually contains degree>=3
 * junctions, then verify the router on those (the junction rules are the
 * subtlest part of the tracer semantics).
 *
 * Run:  npx tsx spike/find-junctions.ts
 */

import { analyze, pathLength } from '../src/core/circuits';
import { comboToMatchingIndices, nonCrossingForTile } from '../src/core/matchings';
import { LEAF_ORDER } from '../src/core/families';
import { buildSystem, flatten } from '../src/core/tiles';
import { finalize, newRun, resetJunctionKeys } from './router';

const family = 'spectre' as const;
const SUBSETS: readonly (readonly number[])[] = [
  [0, 1, 3, 6],
  [0, 3, 5, 6],
  [0, 2, 3, 6, 7, 8],
  [0, 1, 2, 3, 5, 6, 7, 8],
];

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
function histStr(h: Map<number, number>): string {
  return (
    '{' +
    [...h.entries()].sort((x, y) => x[0] - y[0]).map(([l, n]) => `${l}:${n}`).join(', ') +
    '}'
  );
}

// Random-ish deterministic sampling over the FULL matching space (crossing
// matchings included — the non-crossing scan found no junctions).
import { connectionCount } from '../src/core/edges';
import { matchingCount } from '../src/core/matchings';
function fullSpace(subset: readonly number[]): number[] {
  return LEAF_ORDER.map((t) =>
    Math.max(1, matchingCount(connectionCount(family, t, new Set(subset)))),
  );
}

let found = 0;
let checked = 0;
let pass = 0;
const level = 3;
const sys = buildSystem(family, level);
const root = sys['Delta'];
const instances = flatten(root);

for (const subset of SUBSETS) {
  const space = fullSpace(subset);
  const rng = (() => {
    let s = 12345;
    return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
  })();
  const seen = new Set<string>();
  for (let trial = 0; trial < 60; trial++) {
    const indices = space.map((n) => Math.floor(rng() * n));
    const combo = indices.join('.');
    if (seen.has(combo)) continue;
    seen.add(combo);
    const matchingIndexByType: Record<string, number> = {};
    LEAF_ORDER.forEach((t, i) => (matchingIndexByType[t] = indices[i]));
    const oracle = analyze({ family, instances, selected: new Set(subset), matchingIndexByType });
    checked++;
    if (oracle.junctionCount === 0) continue;
    found++;
    resetJunctionKeys();
    const run = newRun({ family, selected: new Set(subset), matchingIndexByType });
    const router = finalize(root, run);
    const ok =
      histEq(histOf(oracle.circuits), router.circuits) &&
      histEq(histOf(oracle.tails), router.tails) &&
      oracle.junctionCount === router.junctions;
    if (ok) pass++;
    console.log(
      `${ok ? 'PASS' : 'FAIL'} lvl${level} e=${subset.join('')} m=${combo} junctions=${oracle.junctionCount} ` +
        `circuits=${oracle.circuits.length} tails=${oracle.tails.length}`,
    );
    if (!ok) {
      console.log(`  circuits oracle ${histStr(histOf(oracle.circuits))}`);
      console.log(`  circuits router ${histStr(router.circuits)}`);
      console.log(`  tails oracle ${histStr(histOf(oracle.tails))}`);
      console.log(`  tails router ${histStr(router.tails)}`);
      console.log(`  junctions oracle ${oracle.junctionCount} router ${router.junctions}`);
    }
    if (found >= 12) break;
  }
  if (found >= 12) break;
}

console.log(`\nscanned ${checked} configs, ${found} with junctions, ${pass}/${found} router matches.`);
if (found > 0 && pass !== found) process.exitCode = 1;
