/**
 * Extra oracle check: class-0 subsets (vertex connection points, the
 * boundary-liveness logic's hard case) at level 5, plus a Gamma root.
 * Run:  npx tsx spike/verify-lvl5-class0.ts
 */
import { analyze, pathLength } from '../src/core/circuits';
import { comboToMatchingIndices } from '../src/core/matchings';
import { LEAF_ORDER, type TileTypeId } from '../src/core/families';
import { buildSystem, flatten } from '../src/core/tiles';
import { finalize, newRun, resetJunctionKeys } from './router';

const cases: { level: number; subset: number[]; combo: string; root: TileTypeId }[] = [
  { level: 5, subset: [0, 3, 5, 6], combo: '0010001000', root: 'Delta' },
  { level: 5, subset: [0, 1, 3, 6], combo: '1000000000', root: 'Delta' },
  { level: 4, subset: [0, 3, 5, 6], combo: '0010001000', root: 'Gamma' },
];

function hist(paths: readonly { points: readonly unknown[]; closed: boolean }[]) {
  const out = new Map<number, number>();
  for (const p of paths) {
    const l = pathLength(p as never);
    out.set(l, (out.get(l) ?? 0) + 1);
  }
  return out;
}
const eq = (a: Map<number, number>, b: Map<number, number>) =>
  a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);

let ok = true;
for (const c of cases) {
  const family = 'spectre' as const;
  const indices = comboToMatchingIndices(family, c.subset, c.combo);
  const matchingIndexByType: Record<string, number> = {};
  LEAF_ORDER.forEach((t, i) => (matchingIndexByType[t] = indices[i]));
  const root = buildSystem(family, c.level)[c.root];
  const oracle = analyze({
    family,
    instances: flatten(root),
    selected: new Set(c.subset),
    matchingIndexByType,
  });
  resetJunctionKeys();
  const router = finalize(root, newRun({ family, selected: new Set(c.subset), matchingIndexByType }));
  const pass =
    eq(hist(oracle.circuits), router.circuits) &&
    eq(hist(oracle.tails), router.tails) &&
    oracle.junctionCount === router.junctions;
  ok &&= pass;
  console.log(
    `${pass ? 'PASS' : 'FAIL'} lvl${c.level} ${c.root} e=${c.subset.join('')} m=${c.combo} ` +
      `circuits=${oracle.circuits.length} tails=${oracle.tails.length}`,
  );
}
if (!ok) process.exitCode = 1;
