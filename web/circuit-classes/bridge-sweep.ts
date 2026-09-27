/**
 * Bridges for every combination of a rule (see `bridgeStats` in
 * src/core/strandGraph.ts): per level, over the strands that run from the
 * patch edge to the patch edge, the ratio (smaller side's area in tiles) /
 * (tiles the strand crosses): its mean, min and max, plus how many such
 * strands there are and the best one's share of the patch and length.
 *
 * Usage: tsx bridge-sweep.ts <family> <rule> <levels,comma> <out.jsonl> [shard] [nShards]
 * Resumable like sweep.ts: combos already in the output file are skipped.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import {
  bridgeStats, buildStrandGraph, patchBoundary, comboDigitsFromIndex, strandComboCount, strandComponents,
  strandWorkspace, type TileFamilyId,
} from '../src/core';

const [family, rule, levelsArg, out, shardArg = '0', nArg = '1'] = process.argv.slice(2);
const levels = levelsArg.split(',').map(Number);
const shard = Number(shardArg);
const nShards = Number(nArg);
const subset = [...rule].map(Number);
const graphs = levels.map((lv) => buildStrandGraph(family as TileFamilyId, subset, lv));
const wss = graphs.map(strandWorkspace);
for (const g of graphs) patchBoundary(g); // once per level, up front
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
  const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
  const bridge = graphs.map((g, k) => {
    const r = bridgeStats(g, strandComponents(g, d, wss[k]));
    return {
      level: g.level, count: r.count, mean: r4(r.mean), min: r4(r.min), max: r4(r.max),
      bestShare: r4(r.bestShare), bestLength: r.bestLength,
    };
  });
  buf.push(JSON.stringify({ family, rule, combo, bridge }));
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
