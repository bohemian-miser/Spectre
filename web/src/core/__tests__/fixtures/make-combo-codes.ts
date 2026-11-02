/**
 * Writes `combo-codes.json`: what today's codec says every code means, so a
 * new codec can be held to it. For each family and tail-free rule, every
 * code when the rule has at most 1,000 combinations, otherwise 300 drawn by a
 * fixed generator, each with the matching vector (full-enumeration indices
 * per leaf type) that `comboToMatchingIndices` gives it.
 *
 * Run from web/: npx vite-node src/core/__tests__/fixtures/make-combo-codes.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FAMILIES, comboDigitChar, comboOptionCounts, comboToMatchingIndices, validEdgeSubsets } from '../..';

const ALL_UP_TO = 1000;
const SAMPLE = 300;

/** A fixed sequence in [0, 1): the 32-bit generator of Numerical Recipes. */
function generator(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const out: Record<string, Record<string, Record<string, number[]>>> = {};
for (const family of FAMILIES) {
  out[family] = {};
  for (const v of validEdgeSubsets(family)) {
    const subset = v.edges;
    const counts = comboOptionCounts(family, subset);
    const total = counts.reduce((a, b) => a * b, 1);
    const codes = new Set<string>();
    const code = (ds: readonly number[]) => ds.map((d) => comboDigitChar(d)).join('');
    if (total <= ALL_UP_TO) {
      for (let k = 0; k < total; k++) {
        let r = k;
        codes.add(code(counts.map((c) => { const d = r % c; r = Math.floor(r / c); return d; })));
      }
    } else {
      const next = generator(subset.reduce((a, b) => a * 10 + b + 1, 7));
      codes.add(code(counts.map(() => 0)));
      codes.add(code(counts.map((c) => c - 1)));
      while (codes.size < SAMPLE) codes.add(code(counts.map((c) => Math.floor(next() * c))));
    }
    const rule = subset.join('');
    out[family][rule] = {};
    for (const c of [...codes].sort()) out[family][rule][c] = [...comboToMatchingIndices(family, subset, c)];
  }
}
writeFileSync(join(__dirname, 'combo-codes.json'), JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([f, rules]) => [f, Object.values(rules).reduce((a, r) => a + Object.keys(r).length, 0)])));
