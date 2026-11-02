/**
 * The foundational circuits of every combination of a hexagon rule:
 * `analyseCombo` (`src/pages/foundations/comboAnalysis.ts`, pure, so a worker
 * on the page can run the same code) at `level`, the build going one level
 * further for what the tails close into.
 *
 *   node --max-old-space-size=4000 node_modules/.bin/vite-node circuit-classes/foundations-sweep.ts -- <rule> <level> [shard shards] [combo,...]
 *
 * Writes `circuit-classes/data/foundations/hex-<rule>/<combo>.json`, one file
 * per combination, which `foundations-index.ts` gathers into `index.json` and
 * `foundations-page.ts` cuts for the page. A rule with more than `LINES_FROM`
 * combinations gets one index line per combination instead (`indexLine`),
 * appended to `lines-<shard>.txt` as each is done, which `foundations-page.ts`
 * sorts into a file per first digit.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyseCombo } from '../src/pages/foundations/comboAnalysis';
import { LINES_FROM } from '../src/pages/foundations/data';
import { comboCount, combosOf } from '../src/pages/foundations/liveAnalysis';
import { indexLine, indexRow, pageCombo } from '../src/pages/foundations/pageData';

const args = process.argv.slice(2).filter((a) => a !== '--');
const [rule, lvArg] = args;
const shard = Number(args[2] ?? 0), shards = Number(args[3] ?? 1);
const only = args[4]?.split(',');
const subset = [...rule].map(Number);
const L = Number(lvArg);
const asLines = comboCount(rule) > LINES_FROM;

const combos = combosOf(rule);
const outDir = resolve(__dirname, `data/foundations/hex-${rule}`);
mkdirSync(outDir, { recursive: true });
const linesFile = resolve(outDir, `lines-${shard}.txt`);
if (asLines) writeFileSync(linesFile, '');

combos.forEach((combo, ci) => {
  if (ci % shards !== shard || (only && !only.includes(combo))) return;
  const out = analyseCombo(subset, combo, L);
  if (asLines) {
    const line = indexLine(indexRow(pageCombo(out)));
    appendFileSync(linesFile, `${line}\n`);
    console.log(`${line} ${out.seconds.toFixed(2)}s`);
    return;
  }
  writeFileSync(resolve(outDir, `${combo}.json`), JSON.stringify(out));
  const verdicts: Record<string, number> = {};
  for (const p of out.predictions) verdicts[p.verdict] = (verdicts[p.verdict] ?? 0) + 1;
  const fnd = out.closings.filter((c) => c.status === 'foundational');
  console.log(
    `${combo} floor=${out.floor}${out.settled ? '' : ' unsettled'} lastNew=${out.lastNew} foundational=${fnd.length} nuggets=${fnd.filter((c) => c.nugget).length} circuits=${out.closings.length}` +
      ` unseen@${out.above.level}=${out.above.unseen.length} exceptions=${out.assumption.exceptions.length}/${out.assumption.checked} tails@${L}=${out.shares.tails[L].toFixed(4)} predictions=${JSON.stringify(verdicts)} ${out.seconds.toFixed(1)}s`,
  );
});
