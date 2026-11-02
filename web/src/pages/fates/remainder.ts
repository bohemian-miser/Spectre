/**
 * What the Foundations account leaves over in the limit, and why.
 *
 * The remainder is the share of all chords on tails at the top level built
 * that the forecast does not take: the account's "not accounted for" and its
 * infinite lines, in the limit column. Tiles on tails at the top, sampled and
 * followed up through the routes to a cap (`above.ts`), say where those
 * tails go; the forecast says, chain by chain, how much of them closes by the
 * cap and how much above it (`project`). The remainder is then, exactly,
 *
 * - **not forecast**: the tails closing by the cap into a chain the forecast
 *   does not carry on (`notCarried`), less its circuits' closings again that
 *   it does forecast;
 * - **several fates**: a tail's share not split by placement. The account
 *   counts every copy of every supertile, so a tail is split by how often
 *   each placement occurs (`fateMass.ts` checks the shares against it), and
 *   this part is nil;
 * - **infinite lines**: the account's certified lines (`lines.ts`);
 * - **unknown**: the tails closing by the cap into a circuit the
 *   combination's circuits do not name;
 * - **forecast error**: the tails closing by the cap into every other chain
 *   and nugget less what the forecast puts there;
 * - **open past the cap**: the tails still open at the cap, less the
 *   forecast's closings above the cap, less the infinite lines.
 *
 * A tail whose routes run out before the cap is compared with the forecast
 * to the level it reached. The parts other than the lines and several fates
 * are estimates from the sample, each with its standard error; they add up
 * to the remainder.
 */
import { account, notCarried, type PageCombo } from '../foundations/pageData';
import type { Followed } from './above';

export interface Part {
  readonly share: number;
  /** One standard error, from the sample. */
  readonly se: number;
}

export interface Remainder {
  /** The tails at the top less every closing forecast above it, of all chords: the limit column's not accounted for and infinite lines (negative when the forecast takes more than the tails hold). */
  readonly remainder: number;
  readonly parts: {
    readonly notForecast: Part;
    readonly severalFates: Part;
    readonly lines: Part;
    readonly unknown: Part;
    readonly forecastError: Part;
    readonly openPastCap: Part;
  };
  /** The samples, the cap, and the share of the tails at the top by fate. */
  readonly followed: { readonly samples: number; readonly cap: number; readonly shares: Record<string, Part> };
  /** The chains not carried on: `chain <id>`. */
  readonly notForecast: string[];
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

export function remainderOf(p: PageCombo, followed: readonly Followed[], cap: number): Remainder {
  const acc = account(p, 'class');
  const pr = acc.projection;
  const T = pr.top;
  if (cap <= T || cap > pr.ahead) throw new Error(`the forecast is split by level from ${T + 1} to ${pr.ahead}, not at ${cap}`);
  const last = acc.columns.length - 1;
  const lines = acc.segments.find((s) => s.key === 'lines')?.values[last] ?? 0;
  const tailsTop = p.tails[T];
  // the forecast by class and level, from T + 1 to the cap
  const byLevel = new Map<string, number[]>();
  let total = 0;
  for (const l of pr.lines) {
    const key = `${l.cls === 0 ? 'nugget' : 'chain'} ${l.root}`;
    const row = byLevel.get(key) ?? byLevel.set(key, new Array<number>(cap + 1).fill(0)).get(key)!;
    for (let m = T + 1; m <= cap; m++) row[m] += l.values[m];
    total += sum(l.values.slice(T + 1)) + l.rest;
  }
  /** The forecast closing into the classes `keep` from T + 1 to level c. */
  const by = (c: number, keep: (k: string) => boolean): number => sum([...byLevel].filter(([k]) => keep(k)).map(([, row]) => sum(row.slice(T + 1, c + 1))));
  const remainder = tailsTop - total;
  const N = followed.length;
  const counts = new Map<string, number>();
  for (const f of followed) counts.set(f.fate, (counts.get(f.fate) ?? 0) + 1);
  const shares: Record<string, Part> = {};
  for (const [k, c] of [...counts].sort((a, b) => b[1] - a[1])) shares[k] = { share: c / N, se: Math.sqrt(((c / N) * (1 - c / N)) / N) };
  const notForecast = pr.fits.filter((f) => !f.nugget && notCarried(f)).map((f) => `chain ${f.root}`);
  const nf = new Set(notForecast);
  const none = { share: 0, se: 0 };
  // nothing followed: only the lines are told apart
  if (!N) {
    return {
      remainder,
      parts: { notForecast: none, severalFates: none, lines: { share: lines, se: 0 }, unknown: none, forecastError: none, openPastCap: { share: remainder - lines, se: 0 } },
      followed: { samples: 0, cap, shares },
      notForecast,
    };
  }
  const open = (k: string): boolean => k === 'open' || k === 'budget' || k === 'ends';
  // each sample against the forecast to the level it was followed to: the cap, or where the routes ran out
  const reach = (f: Followed): number => (f.fate === 'budget' ? Math.max(T, Math.min(cap, f.level)) : cap);
  /** Tails in the classes `keep` (as a share of all chords) less the forecast's share there by each sample's reach, with its standard error. */
  const part = (inSample: (k: string) => boolean, forecast: (c: number) => number): Part => {
    const x = followed.map((f) => (inSample(f.fate) ? tailsTop : 0) - forecast(reach(f)));
    const mean = sum(x) / N;
    return { share: mean, se: Math.sqrt(sum(x.map((v) => (v - mean) ** 2)) / (N * Math.max(1, N - 1))) };
  };
  return {
    remainder,
    parts: {
      notForecast: part((k) => nf.has(k), (c) => by(c, (k) => nf.has(k))),
      severalFates: none,
      lines: { share: lines, se: 0 },
      unknown: part((k) => k === 'unknown', () => 0),
      forecastError: part((k) => !open(k) && k !== 'unknown' && !nf.has(k), (c) => by(c, (k) => !nf.has(k))),
      openPastCap: part(open, (c) => total - by(c, () => true) + lines),
    },
    followed: { samples: N, cap, shares },
    notForecast,
  };
}
