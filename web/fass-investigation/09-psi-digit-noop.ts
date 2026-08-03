/**
 * Demonstrate that the Psi digit (combo position 7) is a NO-OP under
 * selection 1278: every digit value decodes to the same matching vector,
 * and the strand analysis is bit-identical. (Psi has only 2 active dots
 * under 1278 -> exactly one perfect matching -> nothing to choose.)
 *
 * Also: flipping any *active* digit (Theta/Lambda/Xi/Pi/Gamma1) of the
 * winner combo away from the circuit-free predicate creates circuits.
 *
 * Run: cd web && npx --yes tsx fass-investigation/09-psi-digit-noop.ts
 */

import { comboToMatchingIndices, runAnalysis } from '../src/core';
import { FAMILY, SUBSET_1278, matchingRecord } from './lib';

const WINNER = '0100100000';

// 1. Psi digit no-op
const base = comboToMatchingIndices(FAMILY, SUBSET_1278, WINNER).join(',');
for (const d of ['1', '2', '5']) {
  const variant = WINNER.slice(0, 7) + d + WINNER.slice(8);
  const got = comboToMatchingIndices(FAMILY, SUBSET_1278, variant).join(',');
  console.log(`combo ${variant} (Psi digit=${d}) decodes to [${got}] — ${got === base ? 'IDENTICAL to' : 'DIFFERS from'} ${WINNER} [${base}]`);
}

// 2. flipping each active digit of the winner
console.log('\nEffect of flipping one active digit of the winner at Delta@4:');
const positions: [number, string][] = [
  [1, 'Theta'],
  [2, 'Lambda'],
  [3, 'Xi'],
  [4, 'Pi'],
  [9, 'Gamma1'],
];
for (const [pos, name] of positions) {
  const flipped =
    WINNER.slice(0, pos) + (WINNER[pos] === '0' ? '1' : '0') + WINNER.slice(pos + 1);
  const res = runAnalysis({
    id: 0,
    family: FAMILY,
    rootTile: 'Delta',
    level: 4,
    subset: SUBSET_1278,
    matchingIndexByType: matchingRecord(flipped),
  });
  console.log(
    `  flip ${name.padEnd(7)} -> ${flipped}: circuits=${res.circuits.length}, tails=${res.tails.length}`,
  );
}
