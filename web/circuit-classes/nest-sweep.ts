/**
 * Circuit nesting for every combination of a rule (see `circuitNesting` in
 * src/core/strandGraph.ts): per level, the deepest nesting and the sum of all
 * depths (+1 for every circuit inside another circuit).
 *
 * Usage: tsx nest-sweep.ts <family> <rule> <levels,comma> <out.jsonl> [shard] [nShards]
 * Resumable like sweep.ts: combos already in the output file are skipped.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import {
  buildStrandGraph, circuitNesting, comboDigitsFromIndex, strandComboCount, strandComponents,
  strandWorkspace, type TileFamilyId,
} from '../src/core';

const [family, rule, levelsArg, out, shardArg = '0', nArg = '1'] = process.argv.slice(2);
const levels = levelsArg.split(',').map(Number);
const shard = Number(shardArg);
const nShards = Number(nArg);
const subset = [...rule].map(Number);
const graphs = levels.map((lv) => buildStrandGraph(family as TileFamilyId, subset, lv));
const wss = graphs.map(strandWorkspace);
const counts = graphs[0].options.map((o) => o.length);
const total = strandComboCount(graphs[0]);

const done = new Set<string>();
if (existsSync(out)) for (const line of readFileSync(out, 'utf8').split('\n')) if (line) done.add(JSON.parse(line).combo);

let buf: string[] = [];
const t0 = Date.now();
let n = 0;
for (let i = shard; i < total; i += nShards) {
  const d = comboDigitsFromIndex(counts, i);
  const combo = d.map((v) => v.toString(36)).join('');
  if (done.has(combo)) continue;
  const nest = graphs.map((g, k) => {
    const c = strandComponents(g, d, wss[k]);
    const r = circuitNesting(g, c);
    return { level: g.level, max: r.maxDepth, sum: r.depthSum, nested: r.nested };
  });
  buf.push(JSON.stringify({ family, rule, combo, nest }));
  n++;
  if (buf.length >= 200) {
    appendFileSync(out, buf.join('\n') + '\n');
    buf = [];
    const rate = n / ((Date.now() - t0) / 1000);
    console.error(`${family}-${rule} shard ${shard}: ${n} done, ${rate.toFixed(1)}/s, ~${((total / nShards - n) / rate / 60).toFixed(1)} min left`);
  }
}
if (buf.length) appendFileSync(out, buf.join('\n') + '\n');
console.error(`${family}-${rule} shard ${shard} finished: ${n} combos in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
