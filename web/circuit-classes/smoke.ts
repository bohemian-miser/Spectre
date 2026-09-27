import { buildGraph, comboCount, comboFromIndex, comboString } from './engine';
import { levelFeatures, workspace } from './features';
import { analyze, comboToMatchingIndices, leafOrder, buildSystem, flatten } from '../src/core';
for (const lv of [3, 4, 5]) {
  const t0 = Date.now();
  const g = buildGraph('spectre', [2, 5, 7, 8], lv);
  const ws = workspace(g);
  const t1 = Date.now();
  const d = [0,1,0,0,1,0,1,1,0,0];
  const f = levelFeatures(g, d, ws);
  const t2 = Date.now();
  for (let i = 0; i < 20; i++) levelFeatures(g, comboFromIndex(g, i), ws);
  const t3 = Date.now();
  console.log(lv, 'build', t1 - t0, 'one', t2 - t1, 'per', (t3 - t2) / 20, 'ms', comboCount(g), JSON.stringify({ ...f, top: f.top.slice(0, 3) }));
  if (lv <= 4) {
    // Cross-check against the reference analyzer.
    const idx = comboToMatchingIndices('spectre', [2,5,7,8], comboString(d));
    const m: Record<string, number> = {};
    leafOrder('spectre').forEach((t, i) => (m[t] = idx[i]));
    const r = analyze({ family: 'spectre', instances: flatten(buildSystem('spectre', lv)['Delta']), selected: new Set([2,5,7,8]), matchingIndexByType: m });
    const cl = Math.max(...r.circuits.map((p) => p.points.length));
    console.log('  ref circuits', r.circuits.length, 'tails', r.tails.length, 'maxCircuit', cl, '| mine closed', f.nClosed, 'open', f.nOpen, 'maxClosed', f.lmaxClosed);
  }
}
