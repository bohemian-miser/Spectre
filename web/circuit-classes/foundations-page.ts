/**
 * Cuts the sweep's output (`foundations-sweep.ts`, in
 * `circuit-classes/data/foundations/hex-<rule>/`) to what the Foundations
 * page shows (`src/pages/foundations/pageData.ts`), and writes it to
 * `public/data/foundations/hex-<rule>/`: one file per combination, loaded
 * when it is chosen, and `index.json` with every combination's summary and
 * every monster.
 *
 * A rule swept as index lines (`lines-<shard>.txt`) gets them sorted into a
 * file per first digit (`<digit>.txt`) and an `index.json` naming the level
 * and the count per digit (`LinesHead`); the level is the second argument.
 * Every combination of the rule must be there, once.
 *
 *   node node_modules/.bin/vite-node circuit-classes/foundations-page.ts -- 023468
 *   node node_modules/.bin/vite-node circuit-classes/foundations-page.ts -- 01234568 4
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LinesHead } from '../src/pages/foundations/data';
import { comboCount } from '../src/pages/foundations/liveAnalysis';
import { pageCombo, pageIndex, type SweepFile } from '../src/pages/foundations/pageData';

const [rule, lvArg] = process.argv.slice(2).filter((a) => a !== '--');
const from = resolve(__dirname, `data/foundations/hex-${rule}`);
const to = resolve(__dirname, `../public/data/foundations/hex-${rule}`);
const files = readdirSync(from);
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });

const lineFiles = files.filter((f) => /^lines-\d+\.txt$/.test(f));
if (lineFiles.length) {
  const levels = Number(lvArg);
  if (!(levels > 0)) throw new Error('give the level the rule was swept to');
  const lines = lineFiles
    .flatMap((f) => readFileSync(resolve(from, f), 'utf8').split('\n'))
    .filter((l) => l.trim())
    .sort();
  const combos = lines.map((l) => l.slice(0, l.indexOf(' ')));
  const dup = combos.find((c, i) => i > 0 && combos[i - 1] === c);
  if (dup) throw new Error(`${dup} is swept twice`);
  const total = comboCount(rule);
  if (combos.length !== total) throw new Error(`${combos.length} of ${total} combinations swept`);
  const byDigit = new Map<string, string[]>();
  for (const l of lines) {
    if (!byDigit.has(l[0])) byDigit.set(l[0], []);
    byDigit.get(l[0])!.push(l);
  }
  let bytes = 0;
  for (const [d, ls] of byDigit) {
    const s = `${ls.join('\n')}\n`;
    bytes += s.length;
    writeFileSync(resolve(to, `${d}.txt`), s);
  }
  const head: LinesHead = { rule, format: 'lines', levels, shards: Object.fromEntries([...byDigit].map(([d, ls]) => [d, ls.length])) };
  writeFileSync(resolve(to, 'index.json'), JSON.stringify(head));
  console.log(`${lines.length} combinations in ${byDigit.size} files, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
} else {
  const combos = files.filter((f) => /^[0-9a-z]{9}\.json$/.test(f)).map((f) => pageCombo(JSON.parse(readFileSync(resolve(from, f), 'utf8')) as SweepFile));
  if (combos.length !== comboCount(rule)) throw new Error(`${combos.length} of ${comboCount(rule)} combinations swept`);
  let bytes = 0;
  for (const p of combos) {
    const s = JSON.stringify(p);
    bytes += s.length;
    writeFileSync(resolve(to, `${p.combo}.json`), s);
  }
  const index = JSON.stringify(pageIndex(rule, combos));
  writeFileSync(resolve(to, 'index.json'), index);
  console.log(`${combos.length} combinations, ${(bytes / 1024).toFixed(0)} KB; index ${(index.length / 1024).toFixed(0)} KB`);
}
