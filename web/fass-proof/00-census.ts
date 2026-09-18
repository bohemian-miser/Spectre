/**
 * How special are the two conjectured configurations?
 *
 * Sweeps EVERY non-empty edge-class selection in both families — class 0
 * INCLUDED — and every non-crossing combination on the surviving selections,
 * and reports which give a single self-avoiding line. The answer is a complete
 * classification: one selection per family, four combinations each, in exact
 * cross-family correspondence, and nothing else anywhere.
 *
 * Class 0 is included deliberately. An earlier draft excluded it on the grounds
 * that the self-gluing class lets three tiles meet at one dot and so produces
 * degree-3 junctions. That is FALSE — see 01-local-structure.ts, which shows
 * the maximum dot multiplicity is 2 for every class in both families, so no
 * selection whatsoever produces a junction. Excluding class 0 would therefore
 * have left a real gap in the classification, and this script closes it.
 *
 * The two near-full selections have 1,953,125 and 625,000 combinations, too
 * many for a level-4 trace each, so they are cascaded: filter at level 1 (eight
 * or nine tiles), then 2, 3, 4. Single-line at level 4 implies single-line at
 * every lower level, so the cascade loses nothing.
 *
 * Run: cd web && npx --yes tsx fass-proof/00-census.ts
 */

import {
  comboDigitChar,
  connectionCount,
  familyMajors,
  leafOrder,
  nonCrossingForTile,
  validEdgeSubsets,
  type TileFamilyId,
} from '../src/core';
import { buildStrands, heading, trace, verdict, zExpand, type Config } from './lib';

const LEVEL = Number(process.argv[2] ?? 4);

function subsets(pool: readonly number[]): number[][] {
  const out: number[][] = [];
  for (let m = 1; m < 1 << pool.length; m++) {
    const s: number[] = [];
    for (let i = 0; i < pool.length; i++) if (m & (1 << i)) s.push(pool[i]);
    out.push(s);
  }
  return out;
}

interface Survivor {
  readonly subset: number[];
  readonly counts: number[];
  readonly options: number[];
  readonly combos: number;
  readonly circuitFree: string[];
  readonly singleLine: string[];
}

let allOk = true;
const winners: Record<string, string[]> = {};

for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  heading(`${family} — census over every selection and combination (Psi root, level ${LEVEL})`);
  const majors = familyMajors(family);
  const order = leafOrder(family);
  console.log(`  classes available (class 0 included): ${majors.join(', ')}`);
  console.log(`  leaf types (${order.length}): ${order.join(', ')}\n`);

  let noDot = 0;
  let oddDot = 0;
  const survivors: Survivor[] = [];

  for (const subset of subsets(majors)) {
    const sel = new Set(subset);
    const counts = order.map((t) => connectionCount(family, t, sel));
    // A leaf type with no dot is never visited, so the curve cannot be
    // space-filling. A leaf type with an ODD dot count has no perfect matching
    // at all, so it contributes nothing and is likewise never visited.
    if (counts.some((c) => c === 0)) {
      noDot++;
      continue;
    }
    if (counts.some((c) => c % 2 !== 0)) {
      oddDot++;
      continue;
    }

    const options = order.map((t) => nonCrossingForTile(family, t, sel).length);
    const combos = options.reduce((a, b) => a * b, 1);
    const comboAt = (n: number): string => {
      let rem = n;
      return options
        .map((o) => {
          const d = rem % o;
          rem = Math.floor(rem / o);
          return comboDigitChar(d) ?? '0';
        })
        .join('');
    };
    const single = (combo: string, lv: number): boolean => {
      const cfg: Config = { id: `${family}-${subset.join('')}-${combo}`, family, subset, combo };
      const instances = zExpand(family, 'Psi', lv);
      const tr = trace(buildStrands(cfg, instances));
      return (
        tr.circuits.length === 0 &&
        tr.arcs.length === 1 &&
        tr.maxDegree <= 2 &&
        tr.tilesCovered === instances.length
      );
    };
    const circuitFree: string[] = [];
    let singleLine: string[] = [];

    if (combos > 20000) {
      // Cascade: a single line at level LEVEL is a single line at every lower
      // level, so filtering cheaply first loses nothing.
      for (let n = 0; n < combos; n++) {
        const combo = comboAt(n);
        if (single(combo, 1)) singleLine.push(combo);
      }
      console.log(`    (S = {${subset.join(',')}}: ${combos} combinations, cascaded; ${singleLine.length} pass level 1)`);
      for (let lv = 2; lv <= LEVEL && singleLine.length; lv++) {
        singleLine = singleLine.filter((c) => single(c, lv));
      }
      circuitFree.push(...singleLine);
    } else {
      for (let n = 0; n < combos; n++) {
        const combo = comboAt(n);
        const cfg: Config = { id: `${family}-${subset.join('')}-${combo}`, family, subset, combo };
        const instances = zExpand(family, 'Psi', LEVEL);
        const tr = trace(buildStrands(cfg, instances));
        if (tr.circuits.length === 0) circuitFree.push(combo);
        if (
          tr.circuits.length === 0 &&
          tr.arcs.length === 1 &&
          tr.maxDegree <= 2 &&
          tr.tilesCovered === instances.length
        ) {
          singleLine.push(combo);
        }
      }
    }
    survivors.push({ subset, counts, options, combos, circuitFree, singleLine });
  }

  console.log(`  swept ${(1 << majors.length) - 1} non-empty selections`);
  console.log(`  ${noDot} leave some leaf type with NO dot -> that type is never visited`);
  console.log(`  ${oddDot} more leave some leaf type with an ODD dot count -> no perfect matching`);
  console.log(`  ${survivors.length} selections survive the necessary condition:\n`);

  for (const s of survivors) {
    console.log(`    S = {${s.subset.join(',')}}`);
    console.log(`      dots per type : [${s.counts.join(', ')}]`);
    console.log(`      nc options    : [${s.options.join('')}]  -> ${s.combos} combinations`);
    console.log(`      circuit-free  : ${s.circuitFree.length}${s.circuitFree.length ? '  (' + s.circuitFree.join(' ') + ')' : ''}`);
    console.log(`      SINGLE LINE   : ${s.singleLine.length}${s.singleLine.length ? '  (' + s.singleLine.join(' ') + ')' : ''}`);
  }
  winners[family] = survivors.flatMap((s) => s.singleLine.map((c) => `${s.subset.join('')}-${c}`));
}

// ---------------------------------------------------------------------------
// Independent cross-check: the "even dot count" condition IS the GF(2) kernel
// ---------------------------------------------------------------------------

heading('Cross-check against the documented GF(2) kernel');
console.log(`  core/subsets.ts computes the valid edge-class selections independently, as
  the kernel of the tiles x class count matrix over GF(2) (DESIGN.md section
  3.8). "Every leaf type has an EVEN dot count" is exactly that kernel
  condition, so the sweep above should reproduce it, minus the members this
  census additionally drops for leaving some leaf type with NO dot.\n`);

for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  const order = leafOrder(family);
  const kernel = validEdgeSubsets(family)
    .map((v) => [...v.edges].sort((a, b) => a - b).join(''))
    .filter((k) => k.length > 0);
  const even: string[] = [];
  const evenNonZero: string[] = [];
  const majors = familyMajors(family);
  for (let m = 1; m < 1 << majors.length; m++) {
    const sub = majors.filter((_, i) => m & (1 << i));
    const counts = order.map((t) => connectionCount(family, t, new Set(sub)));
    if (counts.some((c) => c % 2 !== 0)) continue;
    even.push(sub.join(''));
    if (!counts.some((c) => c === 0)) evenNonZero.push(sub.join(''));
  }
  const dropped = kernel.filter((k) => !evenNonZero.includes(k));
  console.log(`  ${family}:`);
  console.log(`    kernel (non-empty)      : ${kernel.join(' ')}`);
  console.log(`    even dot count          : ${even.sort().join(' ')}`);
  console.log(`    even AND non-zero       : ${evenNonZero.sort().join(' ')}`);
  console.log(`    dropped for a zero count: ${dropped.join(' ') || 'none'}`);
  allOk = verdict(
    even.slice().sort().join(' ') === kernel.slice().sort().join(' '),
    `${family}: the even-dot-count selections are exactly the GF(2) kernel`,
  ) && allOk;
}

// ---------------------------------------------------------------------------
// No selection, in any family, produces a junction
// ---------------------------------------------------------------------------

heading('No selection produces a degree-3 junction');
console.log(`  core/circuits.ts and DESIGN.md section 3.7 say three tiles can meet at a
  class-0 connection point, making it "the source of degree-3 junctions". With
  the default contracts that never happens, in any of the four families.\n`);
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  const order = leafOrder(family);
  const majors = familyMajors(family);
  let worst = 0;
  let junctions = 0;
  for (let m = 1; m < 1 << majors.length; m++) {
    const subset = majors.filter((_, i) => m & (1 << i));
    const counts = order.map((t) => connectionCount(family, t, new Set(subset)));
    if (counts.some((c) => c % 2 !== 0)) continue;
    const cfg: Config = { id: 'x', family, subset, combo: '0'.repeat(10) };
    const tr = trace(buildStrands(cfg, zExpand(family, 'Delta', 3)));
    worst = Math.max(worst, tr.maxDegree);
    junctions += tr.junctions;
  }
  allOk = verdict(
    worst <= 2 && junctions === 0,
    `${family}: max welded degree over EVERY even-count selection is ${worst}, junctions ${junctions}`,
  ) && allOk;
}

heading('Conclusions');

allOk = verdict(
  winners.hex.length === 4 && winners.hex.every((w) => w.startsWith('128-')),
  'hex: exactly 4 single-line configurations, all under selection 128',
  winners.hex.join(' '),
) && allOk;

allOk = verdict(
  winners.spectre.length === 4 && winners.spectre.every((w) => w.startsWith('1278-')),
  'spectre: exactly 4 single-line configurations, all under selection 1278',
  winners.spectre.join(' '),
) && allOk;

// The cross-family correspondence: strip the selection and the Gamma digits,
// leaving the digits of the eight shared leaf types.
const shared = (w: string): string => w.split('-')[1].slice(0, 8);
const hexShared = new Set(winners.hex.map(shared));
const specShared = new Set(winners.spectre.map(shared));
allOk = verdict(
  hexShared.size === 4 &&
    specShared.size === 4 &&
    [...hexShared].every((d) => specShared.has(d)),
  'the two quartets agree digit-for-digit on the eight shared leaf types',
  [...hexShared].sort().join(' '),
) && allOk;

allOk = verdict(
  winners.hex.includes('128-010100000'),
  'the conjectured hex configuration 128-010100000 is one of them',
) && allOk;
allOk = verdict(
  winners.spectre.includes('1278-0101000000'),
  'the conjectured spectre configuration 1278-0101000000 is one of them',
) && allOk;
allOk = verdict(
  winners.spectre.includes('1278-0100100000'),
  "the FASS_1278.md flagship 1278-0100100000 is one of them",
) && allOk;

// The notebook's 2578 guesses (Spectre_Patterns.ipynb cells 45 and 50).
const notebookGuesses: [number[], string][] = [
  [[2, 5, 7, 8], '0011001100'],
  [[2, 5, 7, 8], '0100101100'],
];
for (const [subset, combo] of notebookGuesses) {
  const cfg: Config = { id: 'nb', family: 'spectre', subset, combo };
  const instances = zExpand('spectre', 'Psi', LEVEL);
  const tr = trace(buildStrands(cfg, instances));
  allOk = verdict(
    tr.circuits.length > 0 || tr.arcs.length !== 1,
    `notebook guess ${subset.join('')}/${combo} is NOT a single line`,
    `${tr.circuits.length} circuits, ${tr.arcs.length} arcs`,
  ) && allOk;
}

console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
