/**
 * What the Foundations page reads, cut from an analysis (`comboAnalysis.ts`, run
 * by the sweep or the page's worker) by `pageCombo`: per combination its
 * circuits (chains and nuggets), how each prediction fared, and the shares
 * of chords by chain, class and harmonic order level by level; and an index
 * of every combination with its monsters and flags. The page derives the
 * account, the tail attribution, the back-test and the forecast from these,
 * with the functions here.
 */
import type { ComboAnalysis, SweepVerdict } from './comboAnalysis';

/** The parts of an analysis the page uses. */
export type SweepFile = Pick<
  ComboAnalysis,
  'rule' | 'combo' | 'levels' | 'floor' | 'settled' | 'lastNew' | 'growth' | 'closings' | 'predictions' | 'shares' | 'above' | 'assumption'
>;

/** How a prediction from a circuit fared: its harmonic two levels up closed as predicted; the predicted circuit closed, one seen lower down; nothing was predicted and nothing closed; a harmonic closed that was not predicted; another circuit's harmonic closed; or the level is above the build. */
export type Verdict = 'confirmed' | 'built' | 'none' | 'missed' | 'other' | 'forecast';

const VERDICTS: Record<SweepVerdict, Verdict> = {
  confirmed: 'confirmed',
  built: 'built',
  none: 'none',
  missed: 'missed',
  other: 'other',
  'not built': 'other',
  forecast: 'forecast',
};

/**
 * A foundational circuit: id, level it first closes at, tiles, the child
 * slots of each place it closes in there (space-separated, the place drawn
 * first), child crossings, copies over every place, level and type, types it
 * closes in, the place drawn (its index in `closingGroups`), places at every
 * level, and whether it is a nugget (1) or starts a chain (0).
 */
export type FoundRow = [id: number, level: number, length: number, families: string, steps: number, copies: number, types: number, place: number, places: number, nugget: number];
/** A harmonic: id, level it first closes at, tiles, the circuit two levels down it is the harmonic of, the foundational circuit its chain starts at, its places at that level, how many of them read as a place of `of`, its order (1 two levels above the foundational circuit). */
export type HarmRow = [id: number, level: number, length: number, of: number, root: number, places: number, matched: number, order: number];
/** A prediction: the circuit predicted from, its level, the verdict, and the predicted circuit's tiles (0 when none). */
export type PredRow = [from: number, level: number, verdict: Verdict, length: number];
/** Shares closing at each level, 0 to levels + 1: the chain's root, class (0 nugget, 1 foundational, 2 harmonic), harmonic order, and the shares. */
export type ShareRow = [root: number, cls: 0 | 1 | 2, order: number, shares: number[]];

export interface PageCombo {
  readonly rule: string;
  readonly combo: string;
  /** The highest level classified; one more is built for what the tails close into. */
  readonly levels: number;
  readonly floor: number;
  /** Whether the top two levels close nothing foundational at this floor. */
  readonly settled: boolean;
  /** The highest level a foundational circuit first closes at. */
  readonly lastNew: number;
  /** How many times a supertile's chords grow a level. */
  readonly growth: number;
  readonly found: FoundRow[];
  readonly harm: HarmRow[];
  readonly pred: PredRow[];
  /** Per level 0 to levels + 1, the share of chords on tails (each type weighted by its frequency). */
  readonly tails: number[];
  readonly shares: ShareRow[];
  /** Per level, the share closing into circuits at levels + 1 that are no known word and were not predicted. */
  readonly unseen: number[];
  /** At levels + 1: places whose word is a known circuit, places predicted as harmonics, and unseen circuits (tiles, places, word key). */
  readonly above: { readonly known: number; readonly predicted: number; readonly unseen: [length: number, places: number, word: string][] };
  /** Harmonics' copies per type against their parents' two levels down: pairs checked, pairs that differ. */
  readonly assumption: { readonly checked: number; readonly exceptions: number };
}

export interface IndexRow {
  readonly combo: string;
  readonly levels: number;
  readonly floor: number;
  readonly settled: boolean;
  readonly lastNew: number;
  /** Foundational circuits, and how many of them are nuggets. */
  readonly found: number;
  readonly nuggets: number;
  /** Tiles of the largest foundational circuit. */
  readonly largest: number;
  readonly monsters: number;
  /** Predictions that missed a harmonic the build has, or found another circuit's. */
  readonly misses: number;
  /** Share of chords on tails at the top level classified. */
  readonly tails: number;
  readonly flags: Flag[];
}

export interface Monster {
  readonly combo: string;
  readonly floor: number;
  readonly id: number;
  readonly level: number;
  readonly length: number;
  /** The child slots of each place it closes in at its first level, space-separated. */
  readonly families: string;
  /** Starts a chain or is a nugget at floor + 4 or later. */
  readonly late: boolean;
  /** At least `GIANT` tiles. */
  readonly giant: boolean;
}

export interface PageIndex {
  readonly rule: string;
  readonly combos: IndexRow[];
  readonly monsters: Monster[];
}

/** A foundational circuit at least this long is a giant. */
export const GIANT = 100000;

/** Whether a foundational circuit is a monster: late (from floor + 4) or a giant. */
export const isLate = (level: number, floor: number): boolean => level >= floor + 4;
export const isGiant = (length: number): boolean => length >= GIANT;

const round = (x: number): number => Math.round(x * 1e7) / 1e7;

/** An analysis cut to what the page shows. */
export function pageCombo(d: SweepFile): PageCombo {
  const byId = new Map(d.closings.map((c) => [c.id, c] as const));
  const orderOf = (id: number): number => {
    let n = 0;
    for (let c = byId.get(id)!; c.of !== null; c = byId.get(c.of)!) n++;
    return n;
  };
  const found: FoundRow[] = [];
  const harm: HarmRow[] = [];
  for (const c of d.closings) {
    if (c.status === 'foundational') found.push([c.id, c.level, c.length, c.families.join(' '), c.steps, c.copies, c.types, c.place, c.places, c.nugget ? 1 : 0]);
    else harm.push([c.id, c.level, c.length, c.of!, c.root, c.families.length, c.matched, orderOf(c.id)]);
  }
  const pred: PredRow[] = d.predictions.map((p) => [p.from, p.level, VERDICTS[p.verdict], p.walk?.length ?? 0]);
  const shares: ShareRow[] = [];
  const n = d.shares.tails.length;
  let unseen: number[] = new Array<number>(n).fill(0);
  for (const [key, values] of Object.entries(d.shares.closings)) {
    if (key === 'unseen') { unseen = values.map(round); continue; }
    const [root, cls, order] = key.split('|');
    shares.push([Number(root), cls === 'nugget' ? 0 : cls === 'foundational' ? 1 : 2, Number(order), values.map(round)]);
  }
  shares.sort((a, b) => a[0] - b[0] || a[2] - b[2]);
  return {
    rule: d.rule,
    combo: d.combo,
    levels: d.levels,
    floor: d.floor,
    settled: d.settled,
    lastNew: d.lastNew,
    growth: d.growth,
    found,
    harm,
    pred,
    tails: d.shares.tails.map(round),
    shares,
    unseen,
    above: { known: d.above.known, predicted: d.above.predicted, unseen: d.above.unseen.map((u) => [u.length, u.places, u.word]) },
    assumption: { checked: d.assumption.checked, exceptions: d.assumption.exceptions.length },
  };
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/** How the account chart splits the closed chords. */
export type Split = 'class' | 'order' | 'chain';

export interface Segment {
  /** Stable key: the colour follows it. */
  readonly key: string;
  readonly label: string;
  /** Per level 0 to levels + 1, the share of chords on circuits of this segment closed at or below the level (tails: on tails). */
  readonly values: number[];
}

/** The largest chains shown on their own when splitting by chain; the rest are grouped. */
export const CHAINS_SHOWN = 6;

/**
 * The account chart's segments, bottom up, ending with tails: nuggets, then
 * the chains split by class (foundational, harmonics), by harmonic order, or
 * by chain (the largest `CHAINS_SHOWN`, then the others), then circuits at
 * the level above the build that no known circuit explains, then tails. At
 * every level they add up to 1, but for rounding.
 */
export function segments(p: PageCombo, split: Split): Segment[] {
  const n = p.tails.length;
  const cum = (rows: readonly ShareRow[]): number[] => {
    const out = new Array<number>(n).fill(0);
    let acc = 0;
    for (let m = 0; m < n; m++) {
      acc += sum(rows.map((r) => r[3][m]));
      out[m] = acc;
    }
    return out;
  };
  const nuggets = p.shares.filter((r) => r[1] === 0);
  const chains = p.shares.filter((r) => r[1] !== 0);
  const out: Segment[] = [{ key: 'nugget', label: 'Nuggets', values: cum(nuggets) }];
  if (split === 'class') {
    out.push({ key: 'found', label: 'Chains: foundational', values: cum(chains.filter((r) => r[1] === 1)) });
    out.push({ key: 'harm', label: 'Chains: harmonics', values: cum(chains.filter((r) => r[1] === 2)) });
  } else if (split === 'order') {
    const top = Math.max(0, ...chains.map((r) => r[2]));
    for (let o = 0; o <= top; o++) out.push({ key: `order${Math.min(o, ORDERS - 1)}-${o}`, label: o === 0 ? 'Foundational (order 0)' : `Harmonic order ${o}`, values: cum(chains.filter((r) => r[2] === o)) });
  } else {
    const roots = [...new Set(chains.map((r) => r[0]))];
    const total = (root: number): number => sum(chains.filter((r) => r[0] === root).map((r) => sum(r[3])));
    roots.sort((a, b) => total(b) - total(a));
    roots.slice(0, CHAINS_SHOWN).forEach((root, i) => {
      const f = p.found.find((x) => x[0] === root);
      out.push({ key: `chain${i}`, label: f ? `Chain of ${f[2].toLocaleString('en-US')} at level ${f[1]}` : `Chain ${root}`, values: cum(chains.filter((r) => r[0] === root)) });
    });
    if (roots.length > CHAINS_SHOWN) out.push({ key: 'chains-other', label: 'Other chains', values: cum(chains.filter((r) => roots.indexOf(r[0]) >= CHAINS_SHOWN)) });
  }
  out.push({ key: 'unseen', label: 'Unseen circuits', values: (() => { let a = 0; return p.unseen.map((x) => (a += x)); })() });
  out.push({ key: 'tails', label: 'Tails', values: [...p.tails] });
  return out;
}

/** Harmonic orders with a colour of their own; higher orders share the last. */
export const ORDERS = 5;

/** What the tails at level L become, k levels up: shares of those tails closing into each chain (largest first), into nuggets, into unseen circuits, and still open. */
export interface TailFate {
  readonly k: number;
  readonly chains: [root: number, share: number][];
  readonly nuggets: number;
  readonly unseen: number;
  readonly open: number;
}

/**
 * The tails at level L followed up: every chord on them closes, k levels
 * up or sooner, into a circuit that closes at levels L + 1 to L + k (a
 * circuit closing at level m is made of chords on tails at every level below
 * m), or is still on a tail at L + k. The shares are of the chords on tails
 * at L, so each row adds up to 1, but for rounding.
 */
export function tailFates(p: PageCombo, L: number): TailFate[] {
  const out: TailFate[] = [];
  const base = p.tails[L];
  if (!(base > 0)) return out;
  for (let k = 1; L + k < p.tails.length; k++) {
    const within = (r: ShareRow): number => sum(r[3].slice(L + 1, L + k + 1));
    const byRoot = new Map<number, number>();
    let nuggets = 0;
    for (const r of p.shares) {
      if (r[1] === 0) nuggets += within(r);
      else byRoot.set(r[0], (byRoot.get(r[0]) ?? 0) + within(r));
    }
    out.push({
      k,
      chains: [...byRoot].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([r, v]) => [r, v / base]),
      nuggets: nuggets / base,
      unseen: sum(p.unseen.slice(L + 1, L + k + 1)) / base,
      open: p.tails[L + k] / base,
    });
  }
  return out;
}

export interface BackTest {
  readonly level: number;
  /** Of the chords on tails at this level: closing (to the level above the build) into circuits whose chain was known by this level, into ones found later or unseen, and still open there. */
  readonly explained: number;
  readonly unexplained: number;
  readonly open: number;
  /** The foundational circuits first closing at the next level, and the share of this level's tails their chains close. */
  readonly found: [root: number, share: number][];
}

/**
 * The back-test: at each level L from 2 up, the circuits known by L (their
 * chains' later members included) against what the tails at L close into, to
 * the level above the build. The unexplained part falls by exactly the
 * chains first found at L + 1.
 */
export function backTest(p: PageCombo): BackTest[] {
  const first = new Map(p.found.map((f) => [f[0], f[1]] as const));
  const out: BackTest[] = [];
  const top = p.tails.length - 1;
  for (let L = 2; L < top; L++) {
    const base = p.tails[L];
    if (!(base > 0)) continue;
    let explained = 0, unexplained = sum(p.unseen.slice(L + 1));
    const newRoots = new Map<number, number>();
    for (const r of p.shares) {
      const v = sum(r[3].slice(L + 1));
      const at = first.get(r[0]) ?? Infinity;
      if (at <= L) explained += v;
      else {
        unexplained += v;
        if (at === L + 1) newRoots.set(r[0], (newRoots.get(r[0]) ?? 0) + v);
      }
    }
    out.push({ level: L, explained: explained / base, unexplained: unexplained / base, open: p.tails[top] / base, found: [...newRoots].map(([r, v]) => [r, v / base]) });
  }
  return out;
}

/**
 * The tails at the level above the build that the chains' future harmonics
 * are expected to take. A chain's next member closes in as many places per
 * birth supertile as its last (the one assumption, checked at every level
 * built in `assumption`), with tiles growing as they did over its last two
 * levels, while a supertile's chords grow by `growth` squared every two
 * levels: its share shrinks by q = (tile ratio) / growth² a member, and the
 * members still to come add up to share · q / (1 - q). Chains with one
 * member built, and nuggets, add nothing here; nor do repeat closings of
 * known circuits.
 */
export function expectedTails(p: PageCombo): { expected: number; actual: number; chains: [root: number, share: number][] } {
  const top = p.tails.length - 1;
  const chains: [number, number][] = [];
  for (const f of p.found) {
    if (f[9]) continue;
    const members = [[f[0], f[1], f[2]] as const, ...p.harm.filter((h) => h[4] === f[0]).map((h) => [h[0], h[1], h[2]] as const)];
    // the last two members of the line through the longest harmonics, two levels apart
    const byLevel = new Map<number, number>();
    for (const [, level, len] of members) byLevel.set(level, Math.max(byLevel.get(level) ?? 0, len));
    const levels = [...byLevel.keys()].sort((a, b) => a - b);
    const last = levels[levels.length - 1];
    if (levels.length < 2 || !byLevel.has(last - 2)) continue;
    const q = byLevel.get(last)! / byLevel.get(last - 2)! / p.growth ** 2;
    if (!(q > 0 && q < 1)) continue;
    // the share of chords the newest members took where they first closed, at the last two levels
    let share = 0;
    for (const lv of [last - 1, last]) {
      if (lv > top) continue;
      for (const r of p.shares) if (r[0] === f[0] && r[1] === 2 && lv - 2 * r[2] === f[1]) share += r[3][lv];
    }
    // their successors past the build's top: q per member, two levels at a time, each counted from where it first closes
    const sharePast = share * q / (1 - q);
    if (sharePast > 0) chains.push([f[0], sharePast]);
  }
  return { expected: sum(chains.map((c) => c[1])), actual: p.tails[top], chains: chains.sort((a, b) => b[1] - a[1]) };
}

export type Flag = 'unseen' | 'open' | 'nuggets' | 'gap' | 'forecast' | 'assumption';

export const FLAG_TEXT: Record<Flag, string> = {
  unseen: 'tails close into a circuit seen nowhere below',
  open: 'the tails not closed do not shrink',
  nuggets: 'only nuggets, and the tails stay large',
  gap: 'circuits found at the top levels close tails no known chain explains',
  forecast: 'the chains are expected to take more tails than there are',
  assumption: "a harmonic closes in a different number of places than its parent",
};

/** A combination's flags, from its data. */
export function flagsOf(p: PageCombo): Flag[] {
  const out: Flag[] = [];
  const top = p.tails.length - 1;
  if (p.above.unseen.length) out.push('unseen');
  if (p.tails[top] >= 0.97 * p.tails[top - 1] && p.tails[top] > 0) out.push('open');
  if (!p.found.some((f) => !f[9]) && p.tails[p.levels] > 0.2) out.push('nuggets');
  const bt = backTest(p).filter((b) => b.level >= p.levels - 1);
  if (bt.some((b) => b.unexplained > 1e-9)) out.push('gap');
  const e = expectedTails(p);
  if (e.expected > e.actual) out.push('forecast');
  if (p.assumption.exceptions) out.push('assumption');
  return out;
}

/** The monsters of a combination: its foundational circuits at floor + 4 or later, or giants. */
export function monstersOf(p: PageCombo): Monster[] {
  return p.found
    .filter(([, level, length]) => isLate(level, p.floor) || isGiant(length))
    .map(([id, level, length, families]) => ({ combo: p.combo, floor: p.floor, id, level, length, families, late: isLate(level, p.floor), giant: isGiant(length) }));
}

/** A combination's row of the index. */
export function indexRow(p: PageCombo): IndexRow {
  return {
    combo: p.combo,
    levels: p.levels,
    floor: p.floor,
    settled: p.settled,
    lastNew: p.lastNew,
    found: p.found.length,
    nuggets: p.found.filter((f) => f[9]).length,
    largest: Math.max(0, ...p.found.map((f) => f[2])),
    monsters: monstersOf(p).length,
    misses: p.pred.filter((x) => x[2] === 'missed' || x[2] === 'other').length,
    tails: p.tails[p.levels],
    flags: flagsOf(p),
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
   * other: the walk predicted is another circuit's harmonic.
   */
  readonly mark: 'built' | 'confirmed' | 'missed' | 'predicted' | 'other';
}

export interface ChainStep {
  readonly level: number;
  readonly members: readonly ChainMember[];
}

/**
 * The chain a foundational circuit starts, by level: the harmonics built,
 * each with how its prediction fared, then what was predicted from the last
 * of them above the build. The foundational circuit itself is not listed.
 */
export function chainOf(p: PageCombo, id: number): ChainStep[] {
  const f = p.found.find((x) => x[0] === id);
  if (!f) return [];
  const predFrom = new Map<number, PredRow>();
  for (const x of p.pred) predFrom.set(x[0], x);
  const steps: ChainStep[] = [];
  let tip: number[] = [id];
  // harmonics by `of`: a harmonic closes two levels above a place of its parent, which may close again above where it first closes
  for (;;) {
    const built = p.harm.filter((h) => tip.includes(h[3]));
    if (built.length) {
      for (const level of [...new Set(built.map((h) => h[1]))].sort((a, b) => a - b)) {
        steps.push({
          level,
          members: built.filter((h) => h[1] === level).map((h) => {
            const v = predFrom.get(h[3])?.[2];
            return { id: h[0], length: h[2], mark: v === 'confirmed' ? 'confirmed' : v === 'missed' ? 'missed' : 'built' };
          }),
        });
      }
      tip = built.map((h) => h[0]);
      continue;
    }
    const after = new Map<number, ChainMember[]>();
    for (const t of tip) {
      const x = predFrom.get(t);
      if (!x || !x[3] || (x[2] !== 'forecast' && x[2] !== 'other')) continue;
      const level = x[1] + 2;
      (after.get(level) ?? after.set(level, []).get(level)!).push({ id: null, length: x[3], mark: x[2] === 'forecast' ? 'predicted' : 'other' });
    }
    for (const [level, members] of [...after].sort((a, b) => a[0] - b[0])) steps.push({ level, members });
    break;
  }
  return steps;
}

const pct = (x: number): string => `${(100 * x).toFixed(x < 0.01 ? 2 : 1)}%`;
const span = (a: number, b: number): string => (a === b ? `level ${a}` : `levels ${a} to ${b}`);

/** What the data shows for a combination, and what of it is proven: sentences generated from the data. */
export function provenNote(p: PageCombo): string[] {
  const L = p.levels;
  const top = p.tails.length - 1;
  const out: string[] = [];
  if (p.settled) out.push(`Nothing foundational first closes at ${span(p.lastNew + 1, L)} (built to ${L}); not proven beyond.`);
  else out.push(`A foundational circuit first closes at level ${p.lastNew} of the ${L} built, at every floor tried, so the floor is not settled.`);
  out.push(`Any circuit closing above level ${top} is made of chords on tails at level ${top}: at most ${pct(p.tails[top])} of them (proven).`);
  const unseen = p.above.unseen.length;
  out.push(
    unseen
      ? `At level ${top}, ${unseen} circuit${unseen > 1 ? 's' : ''} close${unseen > 1 ? '' : 's'} that ${unseen > 1 ? 'are' : 'is'} no known circuit and no predicted harmonic.`
      : `Every circuit closing at level ${top} (one above the classified levels) is a known circuit (${p.above.known} places) or a predicted harmonic (${p.above.predicted} places).`,
  );
  const n = (v: Verdict): number => p.pred.filter((x) => x[2] === v).length;
  const checked = p.pred.length - n('forecast');
  if (checked) {
    const parts = [
      n('confirmed') && `${n('confirmed')} closed as the harmonic predicted`,
      n('built') && `${n('built')} closed as a circuit seen lower down`,
      n('none') && `${n('none')} predicted nothing and nothing closed`,
      n('missed') && `${n('missed')} predicted nothing where a harmonic closed`,
      n('other') && `${n('other')} found another circuit's harmonic`,
    ].filter(Boolean);
    out.push(`Of ${checked} predictions checked against the build, ${parts.join(', ')}.`);
  }
  out.push(
    `The forecast's one assumption, that a harmonic closes in as many places per supertile of each type as its parent two levels down, held in ${p.assumption.checked - p.assumption.exceptions} of ${p.assumption.checked} checks${p.assumption.exceptions ? '' : ''}.`,
  );
  return out;
}
