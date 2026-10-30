/**
 * The foundational circuits of every combination of a hexagon rule, one
 * file per combination: `analyseCombo` (`src/pages/foundations/comboAnalysis.ts`,
 * pure, so a worker on the page can run the same code) at `level`, the build
 * going one level further for what the tails close into.
 *
 *   node --max-old-space-size=4000 node_modules/.bin/vite-node circuit-classes/foundations-sweep.ts -- <rule> <level> [shard shards] [combo,...]
 *
 * Writes `circuit-classes/data/foundations/hex-<rule>/<combo>.json`;
 * `foundations-index.ts` gathers them into `index.json` and
 * `foundations-page.ts` cuts them for the page.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { comboDigitChar, comboOptionCounts } from '../src/core';
import { analyseCombo } from '../src/pages/foundations/comboAnalysis';

const args = process.argv.slice(2).filter((a) => a !== '--');
const [rule, lvArg] = args;
const shard = Number(args[2] ?? 0), shards = Number(args[3] ?? 1);
const only = args[4]?.split(',');
const subset = [...rule].map(Number);
const L = Number(lvArg);

const counts = comboOptionCounts('hex', subset);
const combos: string[] = [];
const build = (i: number, acc: string): void => {
  if (i === counts.length) { combos.push(acc); return; }
  for (let d = 0; d < counts[i]; d++) build(i + 1, acc + comboDigitChar(d));
};
build(0, '');
const outDir = resolve(__dirname, `data/foundations/hex-${rule}`);
mkdirSync(outDir, { recursive: true });

combos.forEach((combo, ci) => {
  if (ci % shards !== shard || (only && !only.includes(combo))) return;
  const out = analyseCombo(subset, combo, L);
  writeFileSync(resolve(outDir, `${combo}.json`), JSON.stringify(out));
  const verdicts: Record<string, number> = {};
  for (const p of out.predictions) verdicts[p.verdict] = (verdicts[p.verdict] ?? 0) + 1;
  const fnd = out.closings.filter((c) => c.status === 'foundational');
  console.log(
    `${combo} floor=${out.floor}${out.settled ? '' : ' unsettled'} lastNew=${out.lastNew} foundational=${fnd.length} nuggets=${fnd.filter((c) => c.nugget).length} circuits=${out.closings.length}` +
      ` unseen@${out.above.level}=${out.above.unseen.length} exceptions=${out.assumption.exceptions.length}/${out.assumption.checked} tails@${L}=${out.shares.tails[L].toFixed(4)} predictions=${JSON.stringify(verdicts)} ${out.seconds.toFixed(1)}s`,
  );
});
