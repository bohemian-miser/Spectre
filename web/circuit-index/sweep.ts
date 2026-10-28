/**
 * Every circuit of every combination of a rule, measured, as CSV.
 *
 * Usage: tsx sweep.ts <rule> <maxLevel> [outDir] [shard] [nShards] [combo,combo...]
 *
 * Writes, under `outDir/<rule>/` (default `circuit-index/data`):
 *  - `circuits.csv`: one row per circuit of each combination; the circuit
 *    column is its canonical word in compact letters (`keys.ts`);
 *  - `combos.csv`: one row per combination: levels traced, circuits, open strands.
 * Rows are appended and combinations already in `combos.csv` are skipped, so a
 * run resumes. Shard k of n takes combination indices i with i % n === k.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { comboOptionCounts, comboDigitsFromIndex } from '../src/core';
import { collect, measure } from './circuits';

const [rule, lvArg, outArg = 'circuit-index/data', shardArg = '0', nArg = '1', list] = process.argv.slice(2);
const subset = [...rule].map(Number);
const maxLevel = Number(lvArg);
const dir = `${outArg}/${rule}`;
mkdirSync(dir, { recursive: true });
const K = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const CIRCUIT_COLUMNS = [
  'rule', 'combo', 'circuit', 'level', 'roots', 'copies', 'length', 'order',
  'corners', 'corner_letters', 'corner_id', 'tiles_id', 'fit',
  'arm_lengths', 'arm_distances', 'arm_score', ...K.map((k) => `seg${k}`),
];

const file = (name: string, header: string): string => {
  const p = `${dir}/${name}`;
  if (!existsSync(p)) appendFileSync(p, `${header}\n`);
  return p;
};
const circuitsCsv = file(`circuits.${shardArg}.csv`, CIRCUIT_COLUMNS.join(','));
const combosCsv = file(`combos.${shardArg}.csv`, 'rule,combo,level,circuits,open,longest_open,capped');

const done = new Set(readFileSync(combosCsv, 'utf8').split('\n').slice(1).filter(Boolean).map((l) => l.split(',')[1]));

const counts = comboOptionCounts('hex', subset);
const total = counts.reduce((a, b) => a * b, 1);
const combos = list
  ? list.split(',')
  : Array.from({ length: total }, (_, i) => i)
    .filter((i) => i % Number(nArg) === Number(shardArg))
    .map((i) => comboDigitsFromIndex(counts, i).map((d) => d.toString(36)).join(''));

const t0 = Date.now();
let n = 0;
for (const combo of combos) {
  n++;
  if (done.has(combo)) continue;
  const c = collect(subset, combo, maxLevel);
  const rows: string[] = [];
  for (const f of c.circuits) {
    const m = measure(f);
    rows.push([
      rule, combo, m.id, f.level, f.roots.join(' '), f.copies, m.length, m.order,
      m.corners.corners.join(' '), m.cornerLetters.join(' '), m.cornerId, m.tilesId, m.corners.fit.toFixed(4),
      m.arms.lengths.join(' '), m.arms.distances.join(' '), m.arms.score.toFixed(4),
      ...K.map((k) => m.segments.find((s) => s.k === k)?.score.toFixed(4) ?? ''),
    ].join(','));
  }
  if (rows.length) appendFileSync(circuitsCsv, `${rows.join('\n')}\n`);
  appendFileSync(combosCsv, `${rule},${combo},${c.level},${c.circuits.length},${c.open},${c.longestOpen},${c.circuits.length >= 1000 ? 1 : 0}\n`);
  console.error(`${n}/${combos.length} ${combo}: ${c.circuits.length} circuits, longest ${c.circuits.at(-1)?.word.length ?? 0} (${Math.round((Date.now() - t0) / 1000)} s)`);
}
