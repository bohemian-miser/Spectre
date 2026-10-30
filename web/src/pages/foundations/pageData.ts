/**
 * What the Foundations page reads, cut from the sweep's output
 * (`circuit-classes/foundations-sweep.ts`, one file per combination) by
 * `circuit-classes/foundations-page.ts`: per combination its foundational
 * and harmonic closings, how each prediction fared, its reborn copies and
 * the account of chords level by level; and an index of every combination
 * with its monsters. The page derives chains, monsters and the note on what
 * is proven from these, with the functions here.
 */

/** The parts of a sweep file the page uses. */
export interface SweepFile {
  readonly combo: string;
  readonly levels: number;
  readonly floor: number;
  readonly settled: boolean;
  readonly lastNew: number;
  readonly closings: readonly {
    readonly id: number;
    readonly level: number;
    readonly length: number;
    readonly family: string;
    readonly steps: number;
    readonly status: string;
    readonly of: number | null;
    readonly root: number;
    readonly copies: number;
    readonly types: number;
  }[];
  readonly reborn: readonly { readonly of: number; readonly level: number; readonly closings: number; readonly copies: number }[];
  readonly predictions: readonly { readonly from: number | null; readonly level: number; readonly verdict: string; readonly walk: { readonly length: number } | null }[];
  readonly account: {
    readonly byStatus: readonly { readonly tails: number; readonly closed: Readonly<Record<string, number>> }[];
    readonly byChain: readonly Readonly<Record<string, number>>[];
  };
}

/** How a prediction from a closing fared: its harmonic two levels up closed as predicted, as a reborn copy, nothing was predicted and nothing closed, a harmonic closed that was not predicted, another circuit's harmonic closed, or the level is above the build. */
export type Verdict = 'confirmed' | 'reborn' | 'none' | 'missed' | 'other' | 'forecast';

const VERDICTS: Record<string, Verdict> = {
  confirmed: 'confirmed',
  'built as reborn': 'reborn',
  none: 'none',
  missed: 'missed',
  'built as harmonic': 'other',
  forecast: 'forecast',
};

/** A foundational closing: id, level, tiles, family (child slots), child crossings, copies over every type, types it closes in. */
export type FoundRow = [id: number, level: number, length: number, family: string, steps: number, copies: number, types: number];
/** A harmonic closing: id, level, tiles, the closing two levels down it is the harmonic of, the foundational closing its chain starts at. */
export type HarmRow = [id: number, level: number, length: number, of: number, root: number];
/** A prediction: the closing predicted from, its level, the verdict, and the predicted circuit's tiles (0 when none). */
export type PredRow = [from: number, level: number, verdict: Verdict, length: number];
/** Reborn copies of a closing at a level: the closing (its first), the level, how many distinct closings, copies over every type. */
export type RebornRow = [of: number, level: number, closings: number, copies: number];

export interface PageCombo {
  readonly combo: string;
  /** The highest level built. */
  readonly levels: number;
  readonly floor: number;
  /** Whether the top two levels built close nothing foundational at this floor. */
  readonly settled: boolean;
  /** The highest level with a foundational closing. */
  readonly lastNew: number;
  readonly found: FoundRow[];
  readonly harm: HarmRow[];
  readonly pred: PredRow[];
  readonly reborn: RebornRow[];
  /** Per level from 0, shares of a supertile's chords (each type weighted by its frequency): on chains (foundational and harmonic closings), on reborn copies, on tails. */
  readonly account: [chains: number, reborn: number, tails: number][];
  /** Per level from 0, the three chains with the largest share there, reborn copies included: [root id, share]. */
  readonly topChains: [root: number, share: number][][];
}

export interface IndexRow {
  readonly combo: string;
  readonly levels: number;
  readonly floor: number;
  readonly settled: boolean;
  readonly lastNew: number;
  /** Foundational closings. */
  readonly found: number;
  /** Foundational closings with at least one harmonic built. */
  readonly chains: number;
  /** Tiles of the largest foundational closing. */
  readonly largest: number;
  readonly monsters: number;
  /** Predictions that missed a harmonic the build has, or found another circuit's. */
  readonly misses: number;
  /** Share of chords on tails at the top level. */
  readonly tails: number;
}

export interface Monster {
  readonly combo: string;
  readonly floor: number;
  readonly id: number;
  readonly level: number;
  readonly length: number;
  readonly family: string;
  /** Starts a chain at floor + 4 or later. */
  readonly late: boolean;
  /** At least `GIANT` tiles. */
  readonly giant: boolean;
}

export interface PageIndex {
  readonly rule: string;
  readonly combos: IndexRow[];
  readonly monsters: Monster[];
}

/** A foundational circuit at least this long is a giant: the 19 largest of rule 023468, all closing at level 7; the next is under 63,000. */
export const GIANT = 100000;

/** Whether a foundational closing is a monster: late (from floor + 4) or a giant. */
export const isLate = (level: number, floor: number): boolean => level >= floor + 4;
export const isGiant = (length: number): boolean => length >= GIANT;

const round = (x: number): number => Math.round(x * 1e5) / 1e5;

/** A sweep file cut to what the page shows. */
export function pageCombo(d: SweepFile): PageCombo {
  const found: FoundRow[] = [];
  const harm: HarmRow[] = [];
  for (const c of d.closings) {
    if (c.status === 'foundational') found.push([c.id, c.level, c.length, c.family, c.steps, c.copies, c.types]);
    else if (c.status === 'harmonic') harm.push([c.id, c.level, c.length, c.of!, c.root]);
  }
  const pred: PredRow[] = d.predictions
    .filter((p) => p.from !== null)
    .map((p) => {
      const v = VERDICTS[p.verdict];
      if (!v) throw new Error(`${d.combo}: unknown verdict ${p.verdict}`);
      return [p.from!, p.level, v, p.walk?.length ?? 0];
    });
  return {
    combo: d.combo,
    levels: d.levels,
    floor: d.floor,
    settled: d.settled,
    lastNew: d.lastNew,
    found,
    harm,
    pred,
    reborn: d.reborn.map((r) => [r.of, r.level, r.closings, r.copies]),
    account: d.account.byStatus.map((a) => [round((a.closed.foundational ?? 0) + (a.closed.harmonic ?? 0)), round(a.closed.reborn ?? 0), round(a.tails)]),
    topChains: d.account.byChain.map((m) =>
      Object.entries(m)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([r, v]) => [Number(r), round(v)]),
    ),
  };
}

/** The monsters of a combination. */
export function monstersOf(p: PageCombo): Monster[] {
  return p.found
    .filter(([, level, length]) => isLate(level, p.floor) || isGiant(length))
    .map(([id, level, length, family]) => ({ combo: p.combo, floor: p.floor, id, level, length, family, late: isLate(level, p.floor), giant: isGiant(length) }));
}

/** A combination's row of the index. */
export function indexRow(p: PageCombo): IndexRow {
  const rooted = new Set(p.harm.map((h) => h[4]));
  return {
    combo: p.combo,
    levels: p.levels,
    floor: p.floor,
    settled: p.settled,
    lastNew: p.lastNew,
    found: p.found.length,
    chains: p.found.filter(([id]) => rooted.has(id)).length,
    largest: Math.max(0, ...p.found.map((f) => f[2])),
    monsters: monstersOf(p).length,
    misses: p.pred.filter((x) => x[2] === 'missed' || x[2] === 'other').length,
    tails: p.account[p.levels][2],
  };
}

export function pageIndex(rule: string, combos: readonly PageCombo[]): PageIndex {
  const sorted = [...combos].sort((a, b) => a.combo.localeCompare(b.combo));
  return { rule, combos: sorted.map(indexRow), monsters: sorted.flatMap(monstersOf) };
}

/** One member of a chain: its tiles, and how it is known. */
export interface ChainMember {
  readonly id: number | null;
  readonly length: number;
  /**
   * built: closed, not predicted (below the levels predictions start at);
   * confirmed: predicted from two levels down, then closed as predicted;
   * missed: closed, but nothing was predicted;
   * predicted: predicted for a level above the build;
   * reborn: the walk predicted closes, as a copy of a circuit closed lower down;
   * other: the walk predicted is another circuit's harmonic.
   */
  readonly mark: 'built' | 'confirmed' | 'missed' | 'predicted' | 'reborn' | 'other';
}

export interface ChainStep {
  readonly level: number;
  readonly members: readonly ChainMember[];
}

/**
 * The chain a foundational closing starts, two levels at a time after it:
 * the harmonics built, each with how its prediction fared, then what was
 * predicted from the last of them (above the build, or closing as a reborn
 * copy). The foundational closing itself is not listed.
 */
export function chainOf(p: PageCombo, id: number): ChainStep[] {
  const f = p.found.find((x) => x[0] === id);
  if (!f) return [];
  const predFrom = new Map<number, PredRow>();
  for (const x of p.pred) predFrom.set(x[0], x);
  const steps: ChainStep[] = [];
  let tip: number[] = [id];
  for (let level = f[1] + 2; tip.length; level += 2) {
    const built = p.harm.filter((h) => h[1] === level && tip.includes(h[3]));
    if (built.length) {
      steps.push({
        level,
        members: built.map((h) => {
          const v = predFrom.get(h[3])?.[2];
          return { id: h[0], length: h[2], mark: v === 'confirmed' ? 'confirmed' : v === 'missed' ? 'missed' : 'built' };
        }),
      });
      tip = built.map((h) => h[0]);
      continue;
    }
    const after: ChainMember[] = [];
    for (const t of tip) {
      const x = predFrom.get(t);
      if (!x || !x[3]) continue;
      if (x[2] === 'forecast') after.push({ id: null, length: x[3], mark: 'predicted' });
      else if (x[2] === 'reborn') after.push({ id: null, length: x[3], mark: 'reborn' });
      else if (x[2] === 'other') after.push({ id: null, length: x[3], mark: 'other' });
    }
    if (after.length) steps.push({ level, members: after });
    break;
  }
  return steps;
}

/** The levels at which the closings of a chain close again as reborn copies, lowest and highest. */
export function rebornLevels(p: PageCombo, id: number): [number, number] | null {
  const ids = new Set([id, ...p.harm.filter((h) => h[4] === id).map((h) => h[0])]);
  const levels = p.reborn.filter((r) => ids.has(r[0])).map((r) => r[1]);
  return levels.length ? [Math.min(...levels), Math.max(...levels)] : null;
}

const pct = (x: number): string => `${(100 * x).toFixed(x < 0.01 ? 2 : 1)}%`;
const span = (a: number, b: number): string => (a === b ? `level ${a}` : `levels ${a} to ${b}`);

/** What the data shows for a combination, and what of it is proven: sentences generated from the data. */
export function provenNote(p: PageCombo): string[] {
  const L = p.levels;
  const out: string[] = [];
  if (p.settled) out.push(`Nothing foundational closes at ${span(p.lastNew + 1, L)} (built to ${L}); not proven beyond.`);
  else out.push(`A foundational circuit closes at level ${p.lastNew} of the ${L} built, at every floor tried, so the floor is not settled.`);
  out.push(`Any circuit closing above level ${L} is made of chords on tails at level ${L}: at most ${pct(p.account[L][2])} of them (proven).`);
  const n = (v: Verdict): number => p.pred.filter((x) => x[2] === v).length;
  const checked = p.pred.length - n('forecast');
  if (checked) {
    const parts = [
      n('confirmed') && `${n('confirmed')} closed as the harmonic predicted`,
      n('reborn') && `${n('reborn')} as a reborn copy`,
      n('none') && `${n('none')} predicted nothing and nothing closed`,
      n('missed') && `${n('missed')} predicted nothing where a harmonic closed`,
      n('other') && `${n('other')} found another circuit's harmonic`,
    ].filter(Boolean);
    out.push(`Of ${checked} predictions checked against the build, ${parts.join(', ')}.`);
  }
  if (n('forecast')) {
    const levels = [...new Set(p.pred.filter((x) => x[2] === 'forecast').map((x) => x[1] + 2))].sort((a, b) => a - b);
    out.push(`${n('forecast')} more predicted for ${levels.length > 1 ? `levels ${levels.join(' and ')}` : `level ${levels[0]}`}, above the build.`);
  }
  return out;
}
