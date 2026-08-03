/**
 * Synthetic unit tests for the router's junction semantics, since no spectre
 * configuration we scanned (235 random + 49 curated) ever produces a
 * degree>=3 weld point. Each scenario is fed both to core's tracePaths (the
 * oracle, on raw unit segments) and to the router's resolveWorkspace (as
 * single-segment chains), and the circuit/tail/junction tallies must agree.
 *
 * Run:  npx tsx spike/junction-unit.ts
 */

import { tracePaths, pathLength, type Segment } from '../src/core/circuits';
import { resolveWorkspace, resetJunctionKeys } from './router';
import type { Pt } from '../src/core/geom';

interface Scenario {
  readonly name: string;
  readonly points: Record<string, Pt>;
  readonly segs: readonly (readonly [string, string])[];
}

const SCENARIOS: Scenario[] = [
  {
    name: 'Y junction (3 tails)',
    points: { C: { x: 0, y: 0 }, A: { x: 2, y: 0 }, B: { x: -2, y: 1 }, D: { x: -2, y: -1 } },
    segs: [
      ['C', 'A'],
      ['C', 'B'],
      ['C', 'D'],
    ],
  },
  {
    name: 'loop + stem at one junction (circuit through single junction)',
    points: {
      C: { x: 0, y: 0 },
      P: { x: 1, y: 1 },
      Q: { x: 2, y: 0 },
      R: { x: 1, y: -1 },
      A: { x: -2, y: 0 },
    },
    segs: [
      ['C', 'P'],
      ['P', 'Q'],
      ['Q', 'R'],
      ['R', 'C'],
      ['C', 'A'],
    ],
  },
  {
    name: 'theta graph (two junctions, 3 tails)',
    points: {
      J: { x: 0, y: 0 },
      K: { x: 4, y: 0 },
      P: { x: 2, y: 1 },
      Q: { x: 2, y: -1 },
    },
    segs: [
      ['J', 'P'],
      ['P', 'K'],
      ['J', 'Q'],
      ['Q', 'K'],
      ['J', 'K'],
    ],
  },
  {
    name: 'pure cycle (no junction)',
    points: {
      A: { x: 0, y: 0 },
      B: { x: 1, y: 0 },
      C: { x: 1, y: 1 },
      D: { x: 0, y: 1 },
    },
    segs: [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
      ['D', 'A'],
    ],
  },
  {
    name: 'two loops at one junction (double figure-eight)',
    points: {
      C: { x: 0, y: 0 },
      P: { x: 1, y: 1 },
      Q: { x: -1, y: 1 },
      R: { x: 1, y: -1 },
      S: { x: -1, y: -1 },
    },
    segs: [
      ['C', 'P'],
      ['P', 'Q'],
      ['Q', 'C'],
      ['C', 'R'],
      ['R', 'S'],
      ['S', 'C'],
    ],
  },
  {
    name: 'open chain (single tail)',
    points: { A: { x: 0, y: 0 }, B: { x: 1, y: 0 }, C: { x: 2, y: 0 } },
    segs: [
      ['A', 'B'],
      ['B', 'C'],
    ],
  },
];

function hist(paths: readonly { points: readonly Pt[]; closed: boolean }[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const p of paths) out.set(pathLength(p), (out.get(pathLength(p)) ?? 0) + 1);
  return out;
}
function histEq(a: Map<number, number>, b: Map<number, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}
const show = (h: Map<number, number>) =>
  '{' + [...h.entries()].sort((x, y) => x[0] - y[0]).map(([l, n]) => `${l}:${n}`).join(',') + '}';

let pass = 0;
for (const sc of SCENARIOS) {
  // Oracle: tracePaths on raw segments.
  const segs: Segment[] = sc.segs.map(([a, b]) => [sc.points[a], sc.points[b]]);
  const oracle = tracePaths(segs);

  // Router: same segments as single-unit chains through resolveWorkspace with
  // an empty boundary (everything resolves, like the finalize step).
  resetJunctionKeys();
  const wNodes = Object.values(sc.points).map((p) => ({
    x: p.x,
    y: p.y,
    kind: 'vertex' as const,
    jkey: null,
    ends: [] as [number, 0 | 1][],
  }));
  const nameToIdx = new Map(Object.keys(sc.points).map((k, i) => [k, i]));
  const wChains = sc.segs.map(([a, b], ci) => {
    const ia = nameToIdx.get(a)!;
    const ib = nameToIdx.get(b)!;
    wNodes[ia].ends.push([ci, 0]);
    wNodes[ib].ends.push([ci, 1]);
    return { len: 1, a: { t: 'node' as const, idx: ia }, b: { t: 'node' as const, idx: ib } };
  });
  const circuits = new Map<number, number>();
  const tails = new Map<number, number>();
  const junctions = { n: 0 };
  resolveWorkspace(wNodes, wChains, new Set<number>(), circuits, tails, junctions);

  const co = hist(oracle.circuits);
  const to = hist(oracle.tails);
  const ok = histEq(co, circuits) && histEq(to, tails) && oracle.junctionCount === junctions.n;
  if (ok) pass++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${sc.name}: oracle circuits=${show(co)} tails=${show(to)} j=${oracle.junctionCount}` +
      (ok ? '' : ` | router circuits=${show(circuits)} tails=${show(tails)} j=${junctions.n}`),
  );
}
console.log(`\n${pass}/${SCENARIOS.length} junction-semantics scenarios match tracePaths.`);
if (pass !== SCENARIOS.length) process.exitCode = 1;
