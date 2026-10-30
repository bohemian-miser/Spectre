/**
 * Gathers the per-combination files of `foundations-sweep.ts` into
 * `public/data/foundations/hex-<rule>/index.json`: per combination, the last
 * level with a foundational circuit, the foundational circuits, the share of
 * chords still on tails at the top level, the share of the room at each level
 * taken by foundational closings (the part harmonics and repeats do not
 * account for), and how the predictions fared. Prints the summary tables of
 * `docs/FOUNDATIONS.md`.
 *
 *   node node_modules/.bin/vite-node circuit-classes/foundations-index.ts -- 023468
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rule = process.argv.slice(2).filter((a) => a !== '--')[0];
const dir = resolve(__dirname, `../public/data/foundations/hex-${rule}`);

interface ComboFile {
  combo: string;
  levels: number;
  floor: number;
  settled: boolean;
  lastNew: number;
  closings: { id: number; level: number; length: number; family: string; steps: number; status: string; of: number | null; root: number; copies: number }[];
  predictions: { level: number; verdict: string }[];
  account: { byStatus: { tails: number; room: number; closedHere: Record<string, number> }[]; byChain: Record<string, number>[] };
}

/**
 * Where a share heads as the level grows, from its last three even-spaced
 * values: the change over two levels shrinks by a ratio r, and the changes
 * still to come add up to D r / (1 - r). An estimate, labelled as one.
 */
export function limitOf(s: readonly number[]): number {
  const L = s.length - 1;
  const D = s[L] - s[L - 2], D0 = s[L - 2] - s[L - 4];
  // shares are ratios of exact counts; differences below this are rounding
  if (Math.abs(D) < 1e-12) return s[L];
  const r = D / D0;
  return r > 0 && r < 1 ? s[L] + (D * r) / (1 - r) : NaN;
}

const rows = readdirSync(dir)
  .filter((f) => /^[0-9a-z]+\.json$/.test(f) && f !== 'index.json')
  .map((f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as ComboFile)
  .sort((a, b) => a.combo.localeCompare(b.combo))
  .map((d) => {
    const L = d.levels;
    const fnd = d.closings.filter((c) => c.status === 'foundational');
    const verdicts: Record<string, number> = {};
    for (const p of d.predictions) verdicts[p.verdict] = (verdicts[p.verdict] ?? 0) + 1;
    const newShare = d.account.byStatus.map((a) => (a.room > 0 ? (a.closedHere.foundational ?? 0) / a.room : 0));
    return {
      combo: d.combo,
      levels: L,
      floor: d.floor,
      settled: d.settled,
      lastNew: d.lastNew,
      foundational: fnd.map((c) => [c.level, c.length, c.family, c.steps]),
      chains: fnd.map((c) => d.closings.filter((x) => x.root === c.id && x.status === 'harmonic').length),
      tails: d.account.byStatus[L].tails,
      tailsRatio: d.account.byStatus[L].tails / d.account.byStatus[L - 1].tails,
      newShare,
      verdicts,
      // estimates: each chain's share of the chords and the tails' share, extrapolated
      limits: (() => {
        const roots = Object.keys(d.account.byChain[L]);
        const chains = Object.fromEntries(roots.map((r) => [r, limitOf(d.account.byChain.map((x) => x[r] ?? 0))]));
        const tails = limitOf(d.account.byStatus.map((x) => x.tails));
        const closed = Object.values(chains).reduce((a, b) => a + b, 0);
        return { tails, closed, total: tails + closed, chains };
      })(),
    };
  });
writeFileSync(resolve(dir, 'index.json'), JSON.stringify({ family: 'hex', rule, combos: rows }));

const table = (title: string, key: (r: (typeof rows)[number]) => string): void => {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  console.log(`\n| ${title} | combinations |\n|---|---|`);
  for (const [k, v] of [...m].sort()) console.log(`| ${k} | ${v} |`);
};
table('levels built', (r) => String(r.levels));
table('floor', (r) => `${r.floor}${r.settled ? '' : ' (unsettled)'}`);
table('foundational circuits', (r) => String(r.foundational.length).padStart(3));
table("tails' share, top level over the level below", (r) => (r.tailsRatio < 0.7 ? 'under 0.7' : r.tailsRatio < 0.9 ? '0.7 to 0.9' : r.tailsRatio < 0.97 ? '0.9 to 0.97' : '0.97 and over'));
table('tails at the top level', (r) => (r.tails < 0.05 ? 'under 5%' : r.tails < 0.2 ? '5% to 20%' : r.tails < 0.5 ? '20% to 50%' : '50% and over'));
const byLast = new Map<number, number>();
for (const r of rows) byLast.set(r.lastNew, (byLast.get(r.lastNew) ?? 0) + 1);
console.log(`| last level with a foundational circuit | combinations |\n|---|---|`);
for (const [k, v] of [...byLast].sort((a, b) => a[0] - b[0])) console.log(`| ${k} | ${v} |`);
const verdicts: Record<string, number> = {};
for (const r of rows) for (const [k, v] of Object.entries(r.verdicts)) verdicts[k] = (verdicts[k] ?? 0) + v;
console.log(`\n| prediction | count |\n|---|---|`);
for (const [k, v] of Object.entries(verdicts)) console.log(`| ${k} | ${v} |`);
console.log(`\nfoundational circuits first closing at level >= 7, or new at either of the top two levels built:`);
for (const r of rows) {
  const late = r.foundational.filter((f) => (f[0] as number) >= 7);
  if (late.length || r.lastNew >= r.levels - 1) console.log(`${r.combo} levels=${r.levels} lastNew=${r.lastNew} tails@${r.levels}=${r.tails.toFixed(3)} ratio=${r.tailsRatio.toFixed(3)} late=${JSON.stringify(late)} newShare=${r.newShare.slice(-3).map((x) => x.toFixed(4)).join(',')}`);
}
