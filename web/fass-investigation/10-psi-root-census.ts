/**
 * Census at the PSI supertile root: for all 32 combos of 1278, levels 2..4,
 * count circuits and open arcs. Expectation: exactly the 4 circuit-free
 * combos give ONE single arc and nothing else; all other combos have
 * circuits there too (so no other combo can be the single line).
 *
 * Run: cd web && npx --yes tsx fass-investigation/10-psi-root-census.ts
 */

import { runAnalysis } from '../src/core';
import { FAMILY, SUBSET_1278, matchingRecord } from './lib';

const combos: string[] = [];
for (const t of [0, 1])
  for (const l of [0, 1])
    for (const x of [0, 1])
      for (const p of [0, 1])
        for (const g of [0, 1]) combos.push(`0${t}${l}${x}${p}0000${g}`);

let singleLine: string[] = [];
console.log('combo       Psi@2 C/T   Psi@3 C/T   Psi@4 C/T');
for (const combo of combos) {
  const cells: string[] = [];
  let ok = true;
  for (const level of [2, 3, 4]) {
    const res = runAnalysis({
      id: 0,
      family: FAMILY,
      rootTile: 'Psi',
      level,
      subset: SUBSET_1278,
      matchingIndexByType: matchingRecord(combo),
    });
    cells.push(`${res.circuits.length}/${res.tails.length}`.padEnd(12));
    if (res.circuits.length !== 0 || res.tails.length !== 1) ok = false;
  }
  if (ok) singleLine.push(combo);
  console.log(`${combo}  ${cells.join('')}${ok ? '  << SINGLE LINE' : ''}`);
}
console.log(`\nCombos that are ONE line (and nothing else) at the Psi root: ${singleLine.join(', ')}`);
