/**
 * Spike 4 verification — hierarchical router vs core analyze() oracle.
 *
 * For a grid of (level, subset, combo, root) configurations, materialize the
 * patch and run the site's real `analyze()` (collect -> weld -> tracePaths),
 * then run the hierarchical router, and compare:
 *   - total circuit count and the full circuits-by-length histogram,
 *   - total tail count and the full tails-by-length histogram,
 *   - junction count.
 *
 * Run:  npx tsx spike/verify-router.ts           (from web/)
 */

import { analyze, pathLength } from '../src/core/circuits';
import { comboToMatchingIndices } from '../src/core/matchings';
import { LEAF_ORDER, type TileTypeId } from '../src/core/families';
import { buildSystem, flatten } from '../src/core/tiles';
import { finalize, newRun, resetJunctionKeys, type RouterResult } from './router';

function histOf(paths: readonly { points: readonly unknown[]; closed: boolean }[]): Map<number, number> {
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
    [...h.entries()]
      .sort((x, y) => x[0] - y[0])
      .map(([len, n]) => `${len}:${n}`)
      .join(', ') +
    '}'
  );
}

interface Case {
  readonly level: number;
  readonly subset: readonly number[];
  readonly combo: string;
  readonly root: TileTypeId;
}

const CASES: Case[] = [];
const SUBSETS: readonly (readonly number[])[] = [
  [1, 5],
  [0, 1, 3, 6],
  [0, 3, 5, 6],
  [1, 2, 7, 8],
  [2, 5, 7, 8],
  [0, 2, 3, 6, 7, 8],
];
// Non-trivial combos taken from graph_analysis CSV rows / exported charts.
const COMBOS: Readonly<Record<string, readonly string[]>> = {
  '15': ['0000000000', '0100000000'],
  '0136': ['0000000000', '1000000000'],
  '0356': ['0000000000', '0010001000'],
  '1278': ['0000000000', '0001000010'],
  '2578': ['0000000000', '0100101100', '0111001100'],
  '023678': ['0000000000', '0001000010', '1410001000'],
};

for (const level of [2, 3, 4]) {
  for (const subset of SUBSETS) {
    const key = subset.join('');
    for (const combo of COMBOS[key]) {
      CASES.push({ level, subset, combo, root: 'Delta' });
    }
  }
}
// Other roots (incl. the Gamma mystic pair as root) and an INVALID subset.
CASES.push({ level: 3, subset: [2, 5, 7, 8], combo: '0100101100', root: 'Gamma' });
CASES.push({ level: 3, subset: [2, 5, 7, 8], combo: '0100101100', root: 'Xi' });
CASES.push({ level: 3, subset: [0, 2, 3, 6, 7, 8], combo: '1410001000', root: 'Gamma' });
CASES.push({ level: 2, subset: [2], combo: '0000000000', root: 'Delta' }); // invalid: tails everywhere
CASES.push({ level: 3, subset: [2], combo: '0000000000', root: 'Delta' });
// Level 5 smoke test on two configurations (analyze() ~1 s each).
CASES.push({ level: 5, subset: [2, 5, 7, 8], combo: '0100101100', root: 'Delta' });
CASES.push({ level: 5, subset: [0, 2, 3, 6, 7, 8], combo: '0001000010', root: 'Delta' });

let pass = 0;
let fail = 0;

for (const c of CASES) {
  const family = 'spectre' as const;
  const indices = comboToMatchingIndices(family, c.subset, c.combo);
  const matchingIndexByType: Record<string, number> = {};
  LEAF_ORDER.forEach((t, i) => (matchingIndexByType[t] = indices[i]));

  const sys = buildSystem(family, c.level);
  const root = sys[c.root];

  // Oracle
  const t0 = performance.now();
  const oracle = analyze({
    family,
    instances: flatten(root),
    selected: new Set(c.subset),
    matchingIndexByType,
  });
  const t1 = performance.now();

  // Router
  resetJunctionKeys();
  const run = newRun({ family, selected: new Set(c.subset), matchingIndexByType });
  const router: RouterResult = finalize(root, run);
  const t2 = performance.now();

  const oCirc = histOf(oracle.circuits);
  const oTail = histOf(oracle.tails);

  const circOk = histEq(oCirc, router.circuits);
  const tailOk = histEq(oTail, router.tails);
  const juncOk = oracle.junctionCount === router.junctions;
  const ok = circOk && tailOk && juncOk;
  if (ok) pass++;
  else fail++;

  const label = `lvl${c.level} ${c.root} e=${c.subset.join('')} m=${c.combo}`;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  circuits=${oracle.circuits.length} tails=${oracle.tails.length} ` +
      `junctions=${oracle.junctionCount}  (oracle ${(t1 - t0).toFixed(0)} ms, router ${(t2 - t1).toFixed(0)} ms)`,
  );
  if (!circOk) {
    console.log(`   circuit hist  oracle: ${histStr(oCirc)}`);
    console.log(`   circuit hist  router: ${histStr(router.circuits)}`);
  }
  if (!tailOk) {
    console.log(`   tail hist     oracle: ${histStr(oTail)}`);
    console.log(`   tail hist     router: ${histStr(router.tails)}`);
  }
  if (!juncOk) {
    console.log(`   junctions     oracle: ${oracle.junctionCount}  router: ${router.junctions}`);
  }
}

console.log(`\n${pass}/${pass + fail} configurations match the analyze() oracle exactly.`);
if (fail > 0) process.exitCode = 1;
