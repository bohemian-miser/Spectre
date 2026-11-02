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
 * - **open past the cap**: the tails still open at the cap (or where the
 *   routes ran out), less the forecast's closings above the cap, less the
 *   infinite lines.
 *
 * The parts other than the lines and several fates are estimates from the
 * sample, each with its standard error.
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
  // the forecast by class: by the cap, and above it
  const byCap = new Map<string, number>();
  let above = 0;
  for (const l of pr.lines) {
    const key = `${l.cls === 0 ? 'nugget' : 'chain'} ${l.root}`;
    byCap.set(key, (byCap.get(key) ?? 0) + sum(l.values.slice(T + 1, cap + 1)));
    above += sum(l.values.slice(cap + 1)) + l.rest;
  }
  const forecast = sum([...byCap.values()]) + above;
  const remainder = tailsTop - forecast;
  const N = followed.length;
  const counts = new Map<string, number>();
  for (const f of followed) counts.set(f.fate, (counts.get(f.fate) ?? 0) + 1);
  const part = (keys: (k: string) => boolean): Part => {
    const s = N ? sum([...counts].filter(([k]) => keys(k)).map(([, c]) => c)) / N : 0;
    return { share: s * tailsTop, se: N ? Math.sqrt((s * (1 - s)) / N) * tailsTop : 0 };
  };
  const shares: Record<string, Part> = {};
  for (const [k, c] of [...counts].sort((a, b) => b[1] - a[1])) shares[k] = { share: c / N, se: Math.sqrt(((c / N) * (1 - c / N)) / N) };
  const notForecast = pr.fits.filter((f) => !f.nugget && notCarried(f)).map((f) => `chain ${f.root}`);
  const nf = new Set(notForecast);
  const open = (k: string): boolean => k === 'open' || k === 'budget' || k === 'ends';
  const forecastHit = part((k) => !open(k) && k !== 'unknown' && !nf.has(k));
  const byCapOf = (f: (k: string) => boolean): number => sum([...byCap].filter(([k]) => f(k)).map(([, v]) => v));
  const forecastByCap = byCapOf((k) => !nf.has(k));
  const opened = part(open);
  const notCarriedOn = part((k) => nf.has(k));
  return {
    remainder,
    parts: {
      notForecast: { share: notCarriedOn.share - byCapOf((k) => nf.has(k)), se: notCarriedOn.se },
      severalFates: { share: 0, se: 0 },
      lines: { share: lines, se: 0 },
      unknown: part((k) => k === 'unknown'),
      forecastError: { share: forecastHit.share - forecastByCap, se: forecastHit.se },
      openPastCap: { share: opened.share - above - lines, se: opened.se },
    },
    followed: { samples: N, cap, shares },
    notForecast,
  };
}
