/**
 * Sweep every combination of one rule at several levels, one JSON line each.
 *
 * Usage: tsx sweep.ts <family> <rule> <levels,comma> <out.jsonl> [shard] [nShards] [combos.txt]
 * Shard k of n handles combination indices i with i % n === k, so several
 * processes can share one rule. Output is appended; rerunning resumes by
 * skipping combos already present in the file. With combos.txt (one combo
 * string per line) only those combinations are swept: the refinement pass.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { buildGraph, comboCount, comboFromIndex, comboString } from './engine';
import { levelFeatures, workspace } from './features';
import type { TileFamilyId } from '../src/core';

const [family, rule, levelsArg, out, shardArg = '0', nArg = '1', listArg] = process.argv.slice(2);
const levels = levelsArg.split(',').map(Number);
const nShards = Number(nArg);
function shardNum() { return Number(shardArg); }
const subset = [...rule].map(Number);
const graphs = levels.map((lv) => buildGraph(family as TileFamilyId, subset, lv));
const wss = graphs.map(workspace);
const total = comboCount(graphs[0]);

const done = new Set<string>();
if (existsSync(out)) {
  for (const line of readFileSync(out, 'utf8').split('\n')) {
    if (line) done.add(JSON.parse(line).combo);
  }
}
const round = (x: unknown): unknown =>
  typeof x === 'number' ? Math.round(x * 1e4) / 1e4 : Array.isArray(x) ? x.map(round)
    : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, round(v)])) : x;

let buf: string[] = [];
const t0 = Date.now();
let n = 0;
const list = listArg
  ? readFileSync(listArg, 'utf8').split('\n').filter(Boolean).map((c) => [...c].map((ch) => parseInt(ch, 36)))
  : null;
const count = list ? list.length : total;
for (let i = shardNum(); i < count; i += nShards) {
  const d = list ? list[i] : comboFromIndex(graphs[0], i);
  const combo = comboString(d);
  if (done.has(combo)) continue;
  const feats = graphs.map((g, k) => levelFeatures(g, d, wss[k]));
  buf.push(JSON.stringify({ family, rule, combo, levels: round(feats) }));
  n++;
  if (buf.length >= 200) {
    appendFileSync(out, buf.join('\n') + '\n');
    buf = [];
    const rate = n / ((Date.now() - t0) / 1000);
    console.error(`${family}-${rule} shard ${shardNum()}: ${n} done, ${rate.toFixed(1)}/s, ~${(((count / nShards) - n) / rate / 60).toFixed(1)} min left`);
  }
}
if (buf.length) appendFileSync(out, buf.join('\n') + '\n');
console.error(`${family}-${rule} shard ${shardNum()} finished: ${n} combos in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
