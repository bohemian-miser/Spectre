/**
 * The fates of every combination's tails (`src/pages/fates/investigate.ts`):
 * every fate of every tail over every placement, the classifiable level, the
 * account's weighting checked, the infinite lines, and the remainder in the
 * limit with its reasons.
 *
 *   node --max-old-space-size=6000 node_modules/.bin/vite-node circuit-classes/tail-fates.ts -- <rule> [levels] [samples] [shard shards] [combo,...] [--page]
 *   node node_modules/.bin/vite-node circuit-classes/tail-fates.ts -- --report <rule>
 *
 * The first writes `circuit-classes/data/tail-fates/hex-<rule>/<combo>.json`
 * (levels 9 and 200 tails followed to level 14 by default); with `--page`,
 * also the Foundations sweep's file of the combination
 * (`data/foundations/hex-<rule>/<combo>.json`, as `foundations-sweep.ts`
 * writes it) and the page's cut of it, which then hold the infinite lines'
 * shares. The second
 * gathers them into `docs/tail-fates/hex-<rule>.json` and writes the tables
 * of `docs/TAIL_FATES.md` between its `<!-- tables -->` and
 * `<!-- /tables -->` marks.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { comboDigitChar, comboOptionCounts } from '../src/core';
import { investigate, type Investigation } from '../src/pages/fates/investigate';
import type { Part } from '../src/pages/fates/remainder';
import { namesOf } from '../src/pages/fates/investigate';
import { account, pageCombo, type PageCombo, type SweepFile } from '../src/pages/foundations/pageData';

const CAP = 14;
const all = process.argv.slice(2).filter((a) => a !== '--');
const toPage = all.includes('--page');
const args = all.filter((a) => a !== '--page');


function sweep(): void {
  const [rule, lv, sm] = args;
  const levels = Number(lv ?? 9);
  const samples = Number(sm ?? 200);
  const shard = Number(args[3] ?? 0), shards = Number(args[4] ?? 1);
  const only = args[5]?.split(',');
  const subset = [...rule].map(Number);
  const counts = comboOptionCounts('hex', subset);
  const combos: string[] = [];
  const build = (i: number, acc: string): void => {
    if (i === counts.length) return void combos.push(acc);
    for (let d = 0; d < counts[i]; d++) build(i + 1, acc + comboDigitChar(d));
  };
  build(0, '');
  const outDir = resolve(__dirname, `data/tail-fates/hex-${rule}`);
  mkdirSync(outDir, { recursive: true });
  combos.forEach((combo, ci) => {
    if (ci % shards !== shard || (only && !only.includes(combo))) return;
    let last = '';
    const t0 = Date.now();
    const r = investigate(subset, combo, {
      levels,
      samples,
      cap: CAP,
      onProgress: (stage, done, of) => {
        if (stage === last && done % 20 !== 0) return;
        last = stage;
        process.stderr.write(`${combo} ${stage} ${done}/${of} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
      },
    });
    const { analysis, ...rest } = r;
    writeFileSync(resolve(outDir, `${combo}.json`), JSON.stringify(rest));
    if (toPage) {
      writeFileSync(resolve(__dirname, `data/foundations/hex-${rule}/${combo}.json`), JSON.stringify(analysis));
      writeFileSync(resolve(__dirname, `../public/data/foundations/hex-${rule}/${combo}.json`), JSON.stringify(pageCombo(analysis)));
    }
    const pt = r.remainder.parts;
    console.log(
      `${combo} classifiable=${r.classifiable} (with open ${r.classifiableWithOpen}) weights=${Math.max(...r.weights.map((w) => w.diff)).toExponential(1)}` +
        ` lines@${r.top}=${r.lines[r.top].share} remainder=${r.remainder.remainder.toFixed(5)} [${Object.entries(pt).map(([k, v]) => `${k} ${v.share.toFixed(5)}±${v.se.toFixed(5)}`).join(', ')}]` +
        ` ${r.seconds.toFixed(0)}s ${Math.round(process.memoryUsage().rss / 1e6)}MB`,
    );
  });
}

/** One combination's line in the summary. */
interface Row {
  readonly combo: string;
  readonly limit: number;
  readonly classifiable: number | null;
  readonly classifiableWithOpen: number | null;
  /** Per level, tails of every type closing into two classes or more, and their share of the tiles on tails (each type weighted equally). */
  readonly split: [level: number, tails: number, of: number][];
  readonly weightDiff: number;
  readonly lines: number[];
  readonly lineArcs: number;
  readonly remainder: Investigation['remainder'];
  readonly example: Investigation['splits'][number] | null;
  readonly names: Record<string, string>;
  readonly seconds: number;
}

/** A remainder with the lines' part as the account of the sweep's file has it (the lines enter the open part with the opposite sign). */
function withLines(rem: Investigation['remainder'], p: PageCombo): Investigation['remainder'] {
  const acc = account(p, 'class');
  const lines = acc.segments.find((x) => x.key === 'lines')?.values[acc.columns.length - 1] ?? 0;
  const { parts } = rem;
  return { ...rem, parts: { ...parts, lines: { share: lines, se: 0 }, openPastCap: { ...parts.openPastCap, share: parts.openPastCap.share + parts.lines.share - lines } } };
}

function report(rule: string): void {
  const from = resolve(__dirname, `data/tail-fates/hex-${rule}`);
  const rows: Row[] = readdirSync(from)
    .filter((f) => /^[0-9a-z]{9}\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(resolve(from, f), 'utf8')) as Omit<Investigation, 'analysis'>)
    .map((r) => {
      const levels = [...new Set(r.counts.map((c) => c.level))].sort((a, b) => a - b);
      // the sweep's file of the combination holds the lines' shares to seven figures
      const sweep = JSON.parse(readFileSync(resolve(__dirname, `data/foundations/hex-${rule}/${r.combo}.json`), 'utf8')) as SweepFile;
      return {
        combo: r.combo,
        limit: r.limit,
        classifiable: r.classifiable,
        classifiableWithOpen: r.classifiableWithOpen,
        split: levels.map((m) => {
          const at = r.counts.filter((c) => c.level === m);
          return [m, at.reduce((s, c) => s + c.closingClasses, 0), at.reduce((s, c) => s + c.tails, 0)] as [number, number, number];
        }),
        weightDiff: Math.max(...r.weights.map((w) => w.diff)),
        lines: sweep.shares.lines ?? r.lines.map((l) => l.share),
        lineArcs: r.lines[r.top].arcs.length,
        remainder: withLines(r.remainder, pageCombo(sweep)),
        example: r.splits.find((s) => s.level === 5) ?? r.splits.find((s) => s.level === Math.max(...r.splits.map((x) => x.level))) ?? null,
        names: r.names ?? namesOf(pageCombo(sweep)),
        seconds: r.seconds,
      };
    });
  const docs = resolve(__dirname, '../../docs');
  mkdirSync(resolve(docs, 'tail-fates'), { recursive: true });
  writeFileSync(resolve(docs, `tail-fates/hex-${rule}.json`), JSON.stringify(rows, null, 1));
  const md = resolve(docs, 'TAIL_FATES.md');
  if (!existsSync(md)) return;
  const text = readFileSync(md, 'utf8');
  const start = text.indexOf('<!-- tables -->'), end = text.indexOf('<!-- /tables -->');
  if (start < 0 || end < 0) throw new Error('TAIL_FATES.md has no tables marks');
  writeFileSync(md, text.slice(0, start + '<!-- tables -->'.length) + '\n' + tables(rule, rows) + '\n' + text.slice(end));
}

const pct = (x: number, d = 3): string => `${(100 * x).toFixed(d)}%`;

/** The followed tails' fates other than a chain or nugget, in words. */
const FATE: Record<string, string> = { budget: 'routes ran out, open', open: 'open at 14', unknown: 'a circuit not known', ends: 'ends in a tile' };

/** A closing's bucket (`root|class|order`) in words. */
function labelName(label: string, names: Record<string, string>): string {
  const [root, cls, order] = label.split('|');
  if (cls === undefined) return label;
  if (cls === 'nugget') return names[`nugget ${root}`] ?? `nugget ${root}`;
  const chain = names[`chain ${root}`] ?? `chain ${root}`;
  return cls === 'foundational' ? `${chain}, foundational` : `${chain}, harmonic ${order}`;
}
const lvl = (x: number | null): string => (x === null ? 'none' : String(x));

function tables(rule: string, rows: readonly Row[]): string {
  const out: string[] = [];
  const short = rows.filter((r) => r.limit < 0.995).sort((a, b) => a.limit - b.limit);
  out.push(`Combinations of ${rule} run: ${rows.length}.`, '');
  out.push('### Classifiable level', '');
  const byLevel = new Map<string, string[]>();
  for (const r of rows) {
    const k = lvl(r.classifiable);
    (byLevel.get(k) ?? byLevel.set(k, []).get(k)!).push(r.combo);
  }
  out.push('| classifiable from level | combinations | of them |', '|---|---|---|');
  for (const [k, cs] of [...byLevel].sort((a, b) => (a[0] === 'none' ? 1 : b[0] === 'none' ? -1 : Number(a[0]) - Number(b[0])))) {
    out.push(`| ${k} | ${cs.length} | ${cs.slice(0, 6).join(', ')}${cs.length > 6 ? ', …' : ''} |`);
  }
  out.push('');
  const at5 = rows.filter((r) => (r.split.find((x) => x[0] === 5)?.[1] ?? 0) > 0).length;
  out.push(`| combinations with a level-5 tail closing into two classes or more | ${at5} of ${rows.length} |`, '|---|---|', '');
  out.push('Tails closing into two classes or more, all types, per level (short combinations first):', '');
  const levels = rows[0]?.split.map((s) => s[0]) ?? [];
  out.push(`| combination | ${levels.join(' | ')} |`, `|---|${levels.map(() => '---').join('|')}|`);
  const shown = [...short, ...rows.filter((r) => r.limit >= 0.995 && r.classifiable === null)].slice(0, 12);
  for (const r of shown) out.push(`| ${r.combo} | ${r.split.map((s) => (s[1] ? `${s[1]} of ${s[2]}` : '0')).join(' | ')} |`);
  out.push('');
  const withEx = [...short, ...rows].find((r) => r.example?.level === 5) ?? rows.find((r) => r.example);
  const ex = withEx?.example;
  if (withEx && ex) {
    out.push(`A level-${ex.level} ${ex.type} tail of ${withEx.combo}, from place ${ex.a} to ${ex.b} (${ex.tiles} tiles), by the shortest placements to each class:`, '');
    out.push('| placements up | closes at | into |', '|---|---|---|');
    for (const p of ex.paths) out.push(`| ${p.steps.map((s) => `slot ${s.slot} of a ${s.parent}`).join(', ')} | ${p.level} | ${labelName(p.label, withEx.names)} |`);
    out.push('');
  }
  out.push('### Weighting', '');
  const worst = rows.reduce((a, r) => Math.max(a, r.weightDiff), 0);
  out.push(`| largest difference, any combination, level and class | ${worst.toExponential(1)} |`, '|---|---|', '');
  out.push('### Infinite lines', '');
  out.push('| combination | arcs certified at the top | share at the top | share one level down |', '|---|---|---|---|');
  for (const r of [...rows].sort((a, b) => b.lines[b.lines.length - 1] - a.lines[a.lines.length - 1]).slice(0, 8)) {
    const n = r.lines.length - 1;
    out.push(`| ${r.combo} | ${r.lineArcs} | ${r.lines[n].toExponential(2)} | ${r.lines[n - 1].toExponential(2)} |`);
  }
  out.push(`| all ${rows.length}, mean | | ${(rows.reduce((s, r) => s + r.lines[r.lines.length - 1], 0) / rows.length).toExponential(2)} | |`);
  out.push('');
  out.push('### The remainder', '');
  out.push('Shares of all chords, ± one standard error of the sample:', '');
  out.push('| combination | limit | remainder | not forecast | several fates | infinite lines | unknown | forecast error | open past 14 | tails followed |', '|---|---|---|---|---|---|---|---|---|---|');
  const remRows = [...short, ...rows.filter((r) => r.limit >= 0.995 && r.remainder.followed.samples > 0).sort((a, b) => b.remainder.remainder - a.remainder.remainder).slice(0, 6)];
  const pm = (x: Part): string => (x.se ? `${pct(x.share, 2)} ± ${pct(x.se, 2)}` : x.share > 0 && x.share < 1e-4 ? `${(100 * x.share).toPrecision(2)}%` : pct(x.share, 2));
  for (const r of remRows) {
    const p = r.remainder.parts;
    out.push(`| ${r.combo} | ${pct(r.limit, 2)} | ${pct(r.remainder.remainder, 2)} | ${pm(p.notForecast)} | ${pm(p.severalFates)} | ${pm(p.lines)} | ${pm(p.unknown)} | ${pm(p.forecastError)} | ${pm(p.openPastCap)} | ${r.remainder.followed.samples} |`);
  }
  out.push('');
  out.push('| combination | chains not forecast |', '|---|---|');
  for (const r of short) out.push(`| ${r.combo} | ${r.remainder.notForecast.map((k) => r.names[k] ?? k).join(', ') || 'none'} |`);
  out.push('');
  out.push('Where the followed tails of the short combinations went, as shares of the tails at the top (± one standard error):', '');
  out.push('| combination | fates by level 14 |', '|---|---|');
  for (const r of short) {
    out.push(`| ${r.combo} | ${Object.entries(r.remainder.followed.shares).map(([k, v]) => `${FATE[k] ?? r.names[k] ?? k} ${pct(v.share, 1)} ± ${pct(v.se, 1)}`).join('; ')} |`);
  }
  out.push('');
  out.push('| run time per combination | mean | longest |', '|---|---|---|');
  out.push(`| seconds | ${(rows.reduce((s, r) => s + r.seconds, 0) / Math.max(1, rows.length)).toFixed(0)} | ${Math.max(...rows.map((r) => r.seconds)).toFixed(0)} |`);
  return out.join('\n');
}

if (args[0] === '--report') report(args[1]);
else sweep();
