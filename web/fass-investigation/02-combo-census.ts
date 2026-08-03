/**
 * Census of all 32 combos of selection 1278 on the Delta supertile:
 *  - levels 2,3,4 computed here with core runAnalysis;
 *  - level-4 rows cross-validated against graph_analysis/lvl4.csv;
 *  - circuit-freeness predicate identified from the digits.
 *
 * A configuration whose strands form a single line must be circuit-free:
 * a circuit is a closed connected component, and 1278 always has 4 open
 * tails as well, so any circuit means >= 5 strand components.
 *
 * Run: cd web && npx --yes tsx fass-investigation/02-combo-census.ts
 */

import { readFileSync } from 'node:fs';
import { runAnalysis } from '../src/core';
import { matchingRecord, SUBSET_1278, FAMILY } from './lib';

const combos: string[] = [];
for (const t of [0, 1]) // Theta
  for (const l of [0, 1]) // Lambda
    for (const x of [0, 1]) // Xi
      for (const p of [0, 1]) // Pi
        for (const g of [0, 1]) // Gamma1
          combos.push(`0${t}${l}${x}${p}0000${g}`);

// --- parse lvl4.csv for the 1278 family --------------------------------------
const csv = readFileSync(new URL('../../graph_analysis/lvl4.csv', import.meta.url), 'utf8');
interface CsvRow {
  tails: number;
  circuits: number;
  maxTail: number;
  maxCircuit: number;
  tailHist: Map<number, number>;
}
const csvRows = new Map<string, CsvRow>();
for (const line of csv.split('\n')) {
  if (!line.endsWith(',1278')) continue;
  const m = /^(\d{10}),(\d+),(\d+),(\d+),(\d+),"?(\[[^\]]*\])"?,"?(\{[^}]*\})"?,1278$/.exec(
    line.trim(),
  );
  if (!m) throw new Error(`unparsed CSV line: ${line}`);
  const tailHist = new Map<number, number>();
  for (const kv of m[7].replace(/[{}]/g, '').split(',')) {
    if (!kv.trim()) continue;
    const [k, v] = kv.split(':').map((s) => Number(s.trim()));
    tailHist.set(k, v);
  }
  csvRows.set(m[1], {
    tails: Number(m[2]),
    circuits: Number(m[3]),
    maxTail: Number(m[4]),
    maxCircuit: Number(m[5]),
    tailHist,
  });
}
console.log(`lvl4.csv rows for 1278: ${csvRows.size}`);

// --- compute ------------------------------------------------------------------
let csvMismatches = 0;
const circuitFree: string[] = [];
console.log(
  '\ncombo       lvl2 C/T          lvl3 C/T          lvl4 C/T   maxTail4  tails4-hist            CSV',
);
for (const combo of combos) {
  const rows: string[] = [];
  let lvl4: ReturnType<typeof runAnalysis> | null = null;
  for (const level of [2, 3, 4]) {
    const res = runAnalysis({
      id: 0,
      family: FAMILY,
      rootTile: 'Delta',
      level,
      subset: SUBSET_1278,
      matchingIndexByType: matchingRecord(combo),
    });
    if (res.junctionCount !== 0) throw new Error(`junctions at ${combo} lvl${level}`);
    rows.push(`${res.circuits.length}/${res.tails.length}`.padEnd(12));
    if (level === 4) lvl4 = res;
  }
  const tailLens = lvl4!.tails.map((t) => t.points.length - 1);
  const maxTail = Math.max(...tailLens);
  const hist = new Map<number, number>();
  for (const l of tailLens) hist.set(l, (hist.get(l) ?? 0) + 1);

  const ref = csvRows.get(combo)!;
  let ok =
    ref.circuits === lvl4!.circuits.length &&
    ref.tails === lvl4!.tails.length &&
    ref.maxTail === maxTail;
  for (const [k, v] of hist) if (ref.tailHist.get(k) !== v) ok = false;
  for (const [k, v] of ref.tailHist) if (hist.get(k) !== v) ok = false;
  if (!ok) csvMismatches++;

  if (lvl4!.circuits.length === 0) circuitFree.push(combo);
  const histStr = [...hist.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([l, c]) => (c > 1 ? `${l}x${c}` : `${l}`))
    .join(',');
  console.log(
    `${combo}  ${rows.join(' ')} ${String(maxTail).padStart(6)}   ${histStr.padEnd(22)} ${ok ? 'MATCH' : 'MISMATCH'}`,
  );
}

console.log(`\nCSV cross-validation: ${combos.length - csvMismatches}/${combos.length} rows match lvl4.csv exactly.`);
console.log(`Circuit-free combos (all levels 2-4): ${circuitFree.join(', ')}`);

// Digit predicate
const pred = circuitFree.every((c) => {
  const d = [...c].map(Number);
  return d[1] !== d[2] && d[3] !== d[4] && d[9] === 0;
});
const predCount = combos.filter((c) => {
  const d = [...c].map(Number);
  return d[1] !== d[2] && d[3] !== d[4] && d[9] === 0;
}).length;
console.log(
  `Predicate check: circuit-free  <=>  Theta!=Lambda AND Xi!=Pi AND Gamma1=0 : ` +
    `${pred && predCount === circuitFree.length ? 'HOLDS' : 'FAILS'} (predicate selects ${predCount} combos)`,
);
