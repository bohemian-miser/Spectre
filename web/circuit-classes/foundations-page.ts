/**
 * Cuts the sweep's output (`foundations-sweep.ts`, in
 * `circuit-classes/data/foundations/hex-<rule>/`) to what the Foundations
 * page shows (`src/pages/foundations/pageData.ts`), and writes it to
 * `public/data/foundations/hex-<rule>/`: one file per combination, loaded
 * when it is chosen, and `index.json` with every combination's summary and
 * every monster.
 *
 *   node node_modules/.bin/vite-node circuit-classes/foundations-page.ts -- 023468
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pageCombo, pageIndex, type SweepFile } from '../src/pages/foundations/pageData';

const rule = process.argv.slice(2).filter((a) => a !== '--')[0];
const from = resolve(__dirname, `data/foundations/hex-${rule}`);
const to = resolve(__dirname, `../public/data/foundations/hex-${rule}`);
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });

const combos = readdirSync(from)
  .filter((f) => /^[0-9a-z]{9}\.json$/.test(f))
  .map((f) => pageCombo(JSON.parse(readFileSync(resolve(from, f), 'utf8')) as SweepFile));
let bytes = 0;
for (const p of combos) {
  const s = JSON.stringify(p);
  bytes += s.length;
  writeFileSync(resolve(to, `${p.combo}.json`), s);
}
const index = JSON.stringify(pageIndex(rule, combos));
writeFileSync(resolve(to, 'index.json'), index);
console.log(`${combos.length} combinations, ${(bytes / 1024).toFixed(0)} KB; index ${(index.length / 1024).toFixed(0)} KB`);
