import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildSystem, flatten } from './tiles';
import { leafOrder } from './families';
import { comboToMatchingIndices } from './matchings';
import { analyze, pathLength } from './circuits';
import { parseStatsCsv } from './stats';

const CSV = readFileSync(new URL('../data/lvl4.csv', import.meta.url), 'utf8');

describe('probe2', () => {
  it('csv sweep', () => {
    const rows = parseStatsCsv(CSV);
    const inst = flatten(buildSystem('spectre', 4)['Delta']);
    const t0 = Date.now();
    let ok = 0;
    const fails: string[] = [];
    for (const row of rows) {
      const subset = [...row.edgeSelection].map((c) => Number.parseInt(c, 10));
      const idx = comboToMatchingIndices('spectre', subset, row.combo);
      const mi: Record<string, number> = {};
      leafOrder('spectre').forEach((t, i) => (mi[t] = idx[i]));
      const a = analyze({ family: 'spectre', instances: inst, selected: new Set(subset), matchingIndexByType: mi });
      const lens = [...a.circuitsByLength.keys()].sort((x, y) => x - y);
      const maxTail = Math.max(0, ...a.tails.map(pathLength));
      const maxCircuit = Math.max(0, ...a.circuits.map(pathLength));
      const tailHist = [...a.tailsByLength.entries()].sort((x, y) => x[0] - y[0]).map(([k, v]) => [k, v.length]);
      const wantHist = [...row.tailLengths.entries()].sort((x, y) => x[0] - y[0]);
      const match =
        a.circuits.length === row.circuits &&
        a.tails.length === row.tails &&
        maxTail === row.maxTail &&
        maxCircuit === row.maxCircuit &&
        JSON.stringify(tailHist) === JSON.stringify(wantHist) &&
        JSON.stringify(lens) === JSON.stringify([...row.circuitLengths].sort((x, y) => x - y));
      if (match) ok++;
      else
        fails.push(
          `${row.edgeSelection}-${row.combo}: got c=${a.circuits.length} t=${a.tails.length} mt=${maxTail} mc=${maxCircuit} L=${JSON.stringify(lens)} TH=${JSON.stringify(tailHist)} | want c=${row.circuits} t=${row.tails} mt=${row.maxTail} mc=${row.maxCircuit} L=${JSON.stringify(row.circuitLengths)} TH=${JSON.stringify(wantHist)}`,
        );
    }
    console.log('rows', rows.length, 'ok', ok, 'ms', Date.now() - t0);
    console.log(fails.slice(0, 6).join('\n'));
  }, 300000);
});
