/**
 * Task 1 groundwork: what does each digit of a 1278 combo mean?
 *
 * For every leaf tile type (LEAF_ORDER = combo digit order), list:
 *  - the active connection points under selection {1,2,7,8} (seam labels),
 *  - all non-crossing matchings (what each digit value selects),
 *  - whether the digit is FORCED (only one option).
 *
 * Run: cd web && npx --yes tsx fass-investigation/01-tile-options.ts
 */

import {
  connectionPoints,
  enumerateMatchings,
  leafOrder,
  nonCrossingForTile,
} from '../src/core';
import { FAMILY, SUBSET_1278 } from './lib';

const selected = new Set(SUBSET_1278);
const order = leafOrder(FAMILY);

console.log('Selection 1278 — per-tile matching options (combo digit semantics)');
console.log('digit position -> tile -> options\n');

let optionCounts = '';
for (let i = 0; i < order.length; i++) {
  const type = order[i];
  const cps = connectionPoints(FAMILY, type, selected);
  const seams = cps.map((c) => c.edge.id.split('/')[1]);
  const all = enumerateMatchings(cps.length);
  const nc = nonCrossingForTile(FAMILY, type, selected);
  optionCounts += String(nc.length);
  console.log(
    `digit[${i}] ${type.padEnd(7)} dots=${cps.length}  seams=[${seams.join(', ')}]  ` +
      `matchings=${all.length} nonCrossing=${nc.length}${nc.length === 1 ? '  << FORCED' : ''}`,
  );
  nc.forEach((mi, d) => {
    const pairs = all[mi]
      .map(([a, b]) => `${seams[a]}—${seams[b]}`)
      .join('  ');
    console.log(`         digit=${d} -> matching #${mi}: ${pairs}`);
  });
}
console.log(`\noption-count string (notebook cell 44 style): ${optionCounts}`);
console.log(`combos for 1278 = product = ${[...optionCounts].reduce((a, c) => a * Number(c), 1)}`);

const psiIdx = order.indexOf('Psi');
console.log(`\nPsi is digit position ${psiIdx}.`);
const psiNc = nonCrossingForTile(FAMILY, 'Psi', selected);
console.log(
  psiNc.length === 1
    ? 'Psi has EXACTLY ONE matching under 1278 — its digit is structurally forced to 0.'
    : `Psi has ${psiNc.length} options.`,
);
