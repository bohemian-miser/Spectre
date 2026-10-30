/**
 * Gathers the per-combination files of `foundations-sweep.ts` into
 * `circuit-classes/data/foundations/hex-<rule>/index.json`: per combination,
 * the floor, the last level a foundational circuit first closes at, the
 * foundational circuits (chains and nuggets), the share of chords still on
 * tails at the top level classified and one above, what closes one level
 * above, the forecast's assumption check and how the predictions fared.
 * Prints the summary tables of `docs/FOUNDATIONS.md`.
 *
 *   node node_modules/.bin/vite-node circuit-classes/foundations-index.ts -- 023468
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ComboAnalysis } from '../src/pages/foundations/comboAnalysis';

const rule = process.argv.slice(2).filter((a) => a !== '--')[0];
const dir = resolve(__dirname, `data/foundations/hex-${rule}`);

const rows = readdirSync(dir)
  .filter((f) => /^[0-9a-z]+\.json$/.test(f) && f !== 'index.json')
  .map((f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as ComboAnalysis)
  .sort((a, b) => a.combo.localeCompare(b.combo))
  .map((d) => {
    const L = d.levels;
    const fnd = d.closings.filter((c) => c.status === 'foundational');
    const verdicts: Record<string, number> = {};
    for (const p of d.predictions) verdicts[p.verdict] = (verdicts[p.verdict] ?? 0) + 1;
    return {
      combo: d.combo,
      levels: L,
      floor: d.floor,
      settled: d.settled,
      lastNew: d.lastNew,
      /** level, tiles, families, child crossings, nugget */
      foundational: fnd.map((c) => [c.level, c.length, c.families.join(' '), c.steps, c.nugget ? 1 : 0] as [number, number, string, number, number]),
      circuits: d.closings.length,
      tails: d.shares.tails[L],
      tailsAbove: d.shares.tails[L + 1],
      unseen: d.above.unseen,
      assumption: { checked: d.assumption.checked, exceptions: d.assumption.exceptions.length },
      verdicts,
    };
  });
writeFileSync(resolve(dir, 'index.json'), JSON.stringify({ family: 'hex', rule, combos: rows }));

const table = (title: string, key: (r: (typeof rows)[number]) => string): void => {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  console.log(`\n| ${title} | combinations |\n|---|---|`);
  for (const [k, v] of [...m].sort()) console.log(`| ${k} | ${v} |`);
};
table('floor, last level a foundational circuit first closes at', (r) => `${r.floor}, ${r.lastNew}${r.settled ? '' : ' (unsettled)'}`);
table('foundational circuits (chains + nuggets)', (r) => {
  const n = r.foundational.filter((f) => f[4]).length;
  return `${String(r.foundational.length).padStart(2)} (${r.foundational.length - n} + ${n})`;
});
table('highest foundational level, less the floor', (r) => String(Math.max(...r.foundational.map((f) => f[0])) - r.floor));
const total = (f: (r: (typeof rows)[number]) => number): number => rows.reduce((s, r) => s + f(r), 0);
console.log(`\nfoundational circuits ${total((r) => r.foundational.length)}, nuggets ${total((r) => r.foundational.filter((f) => f[4]).length)}, circuits ${total((r) => r.circuits)}`);
console.log(`late (floor + 4 or later) ${total((r) => r.foundational.filter((f) => f[0] >= r.floor + 4).length)}, giant (100,000 tiles or more) ${total((r) => r.foundational.filter((f) => f[1] >= 100000).length)}, monsters ${total((r) => r.foundational.filter((f) => f[0] >= r.floor + 4 || f[1] >= 100000).length)}`);
console.log(`unseen circuits one level above: ${total((r) => r.unseen.length)} in ${rows.filter((r) => r.unseen.length).length} combinations`);
console.log(`assumption: ${total((r) => r.assumption.checked)} checks, ${total((r) => r.assumption.exceptions)} exceptions in ${rows.filter((r) => r.assumption.exceptions).length} combinations`);
const verdicts: Record<string, number> = {};
for (const r of rows) for (const [k, v] of Object.entries(r.verdicts)) verdicts[k] = (verdicts[k] ?? 0) + v;
console.log(`\n| prediction | count |\n|---|---|`);
for (const [k, v] of Object.entries(verdicts)) console.log(`| ${k} | ${v} |`);
