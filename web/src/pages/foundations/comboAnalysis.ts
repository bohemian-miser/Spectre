/**
 * The whole analysis of one combination, as the sweep writes it and the
 * Foundations page reads it: built to `levels`, its circuits sorted into
 * chains and nuggets at the floor that settles it, every harmonic predicted
 * and checked, one more level built to see what the tails close into, and
 * every chord of every level accounted for. Pure, so the CLI sweep
 * (`circuit-classes/foundations-sweep.ts`) and the page's worker run the
 * same code.
 */
import { leafOrder } from '../../core';
import {
  account,
  buildShapes,
  closingGroups,
  closingKey,
  foundations,
  longestArcs,
  predictHarmonic,
  seamCrossings,
  substitutionGrowth,
  tileAccount,
  typeFrequencies,
  wordKey,
  type AccountRow,
  type Closing,
  type Foundations,
  type FoundationsCache,
} from './foundations';

const TYPES = leafOrder('hex') as readonly string[];

/** The floors tried; a combination's floor is the lowest after which its top two levels close nothing foundational. */
export const FLOORS = [1, 2, 3, 4];

/** How a prediction fared: the harmonic closed as predicted; the predicted circuit closed, but it is one seen lower down; nothing predicted and nothing closed; nothing predicted where a harmonic closed; the walk predicted is another circuit's harmonic; not among the closings; the level is above the build. */
export type SweepVerdict = 'confirmed' | 'built' | 'none' | 'missed' | 'other' | 'not built' | 'forecast';

export interface ComboAnalysis {
  readonly family: 'hex';
  readonly rule: string;
  readonly combo: string;
  /** The levels classified; the build goes one further (`above`). */
  readonly levels: number;
  readonly floor: number;
  readonly settled: boolean;
  readonly lastNew: number;
  /** Per floor tried: the last level a foundational circuit first closes at, and how many foundational circuits. */
  readonly floors: { floor: number; lastNew: number; foundational: number }[];
  readonly seconds: number;
  /** How many times a supertile's chords grow a level (the substitution's Perron-Frobenius eigenvalue). */
  readonly growth: number;
  /** Every circuit (word): `place` is the index (`closingGroups`) of the place read and drawn, `families` the child slots of its places at its lowest level, `places` how many places at every level, `placesByLevel` per level. */
  readonly closings: {
    id: number;
    place: number;
    level: number;
    length: number;
    families: string[];
    places: number;
    placesByLevel: Record<number, number>;
    steps: number;
    status: 'foundational' | 'harmonic';
    nugget: boolean;
    of: number | null;
    floor: number | null;
    matched: number;
    root: number;
    copies: number;
    types: number;
  }[];
  readonly predictions: {
    from: number;
    level: number;
    type: string;
    verdict: SweepVerdict;
    tried: number;
    walk: { length: number; steps: number; seams: Record<string, number> } | null;
    others: [number, number][];
  }[];
  /**
   * Shares of chords, each type weighted by how often a supertile of that
   * type occurs, per level 0 to levels + 1: on tails, and closing at that
   * level, by `root|class|order` (`bucketOf`) or
   * `unseen` (a circuit at levels + 1 that is no known word and was not
   * predicted). tails[m - 1] = tails[m] + the closings at m, exactly but for
   * rounding.
   */
  readonly shares: { tails: number[]; closings: Record<string, number[]> };
  /** The closings at levels + 1, built but not classified: places whose word is a known circuit, places predicted as a harmonic, and the rest, unseen. */
  readonly above: { level: number; known: number; predicted: number; unseen: { length: number; places: number; word: string }[] };
  /** Every harmonic's copies per type at its lowest level against its parent's copies two levels down: checked pairs and the exceptions. */
  readonly assumption: { checked: number; exceptions: { id: number; parent: number; level: number; type: string; copies: number; parentCopies: number }[] };
  /** A Delta's chords by level, exact: chords, the children's tails (room), tails, and what closes at the level by class. */
  readonly delta: { level: number; chords: number; room: number; tails: number; closedHere: Record<string, number> }[];
  readonly longestArcs: { level: number; length: number; nested: number }[];
}

export type Progress = (stage: string, done: number, of: number) => void;

const sig = (x: number): number => (x === 0 ? 0 : Number(x.toPrecision(7)));

export function analyseCombo(subset: readonly number[], combo: string, levels: number, onProgress: Progress = () => {}): ComboAnalysis {
  const t0 = Date.now();
  const L = levels;
  onProgress('building', 0, L + 1);
  const cs = buildShapes(subset, combo, 1);
  for (let n = 2; n <= L; n++) {
    cs.extend(n);
    onProgress('building', n, L + 1);
  }
  const cache: FoundationsCache = { words: new Map(), reads: new Map() };
  const byFloor: Foundations[] = FLOORS.map((floor, i) => {
    onProgress('sorting circuits', i, FLOORS.length);
    return foundations(cs, { floor, cache, upTo: L });
  });
  const settledAt = byFloor.findIndex((x) => x.lastNew <= L - 2);
  const pick = settledAt >= 0 ? settledAt : byFloor.reduce((b, x, i) => (x.lastNew < byFloor[b].lastNew ? i : b), 0);
  const f = byFloor[pick];
  const FLOOR = f.floor;
  const byKey = new Map(f.closings.flatMap((c) => c.keys.map((k) => [k, c] as const)));
  const places = closingGroups(cs, L);

  // each circuit, predicted two levels up from its place read, from the tables up to one level above it
  type Raw = { from: Closing; level: number; type: string; tried: number; walks: { key: string; length: number; steps: number; seams: Record<string, number> }[] };
  const raw: Raw[] = [];
  const todo = f.closings.filter((c) => c.level >= FLOOR + 2 && c.level + 1 <= L);
  todo.forEach((c, i) => {
    onProgress('predicting harmonics', i, todo.length);
    const a = places[c.places[0]].rep;
    const p = predictHarmonic(cs, a, FLOOR);
    raw.push({
      from: c, level: c.level, type: a.type, tried: p.tried,
      walks: p.predicted.sort((x, y) => y.length - x.length).map((b) => ({ key: closingKey(b), length: b.length, steps: b.steps.length, seams: seamCrossings(b) })),
    });
  });
  const predictions = raw.map((p) => {
    const top = p.walks[0];
    let verdict: SweepVerdict;
    if (p.level + 2 > L) verdict = 'forecast';
    else if (!top) verdict = f.closings.some((c) => c.status === 'harmonic' && c.of === p.from.id) ? 'missed' : 'none';
    else {
      const b = byKey.get(top.key);
      verdict = !b ? 'not built' : b.status === 'harmonic' && b.of === p.from.id ? 'confirmed' : b.level < p.level + 2 ? 'built' : 'other';
    }
    return {
      from: p.from.id, level: p.level, type: p.type, verdict, tried: p.tried,
      walk: top ? { length: top.length, steps: top.steps, seams: top.seams } : null,
      others: p.walks.slice(1).map((w) => [w.length, w.steps] as [number, number]),
    };
  });

  // the harmonic's copies per birth supertile, against the parent's two levels down
  const exceptions: ComboAnalysis['assumption']['exceptions'] = [];
  let checked = 0;
  for (const c of f.closings) {
    if (c.status !== 'harmonic') continue;
    const parent = f.closings[c.of!];
    const mine = c.copiesByLevel[c.level] ?? {};
    const theirs = parent.copiesByLevel[c.level - 2] ?? {};
    for (const t of TYPES) {
      checked++;
      if ((mine[t] ?? 0) !== (theirs[t] ?? 0)) exceptions.push({ id: c.id, parent: parent.id, level: c.level, type: t, copies: mine[t] ?? 0, parentCopies: theirs[t] ?? 0 });
    }
  }

  // one level more: what the tails close into
  onProgress('building the level above', L, L + 1);
  cs.extend(L + 1);
  const aboveBucket = new Map<string, string>();
  const unseen = new Map<string, { length: number; places: number; word: string }>();
  let known = 0, predicted = 0;
  {
    const top = closingGroups(cs).filter((g) => g.level === L + 1);
    const forecastFrom = new Map<string, Closing>();
    for (const p of raw) if (p.level + 2 === L + 1 && p.walks[0]) forecastFrom.set(p.walks[0].key, p.from);
    const knownLengths = new Map<number, Closing[]>();
    for (const c of f.closings) (knownLengths.get(c.length) ?? knownLengths.set(c.length, []).get(c.length)!).push(c);
    const topLengths = new Map<number, number>();
    for (const g of top) topLengths.set(g.length, (topLengths.get(g.length) ?? 0) + 1);
    const wordOfRep = (rep: (typeof top)[number]['rep']): string => cache.words.get(rep) ?? cache.words.set(rep, wordKey(cs, rep)).get(rep)!;
    const knownWord = new Map<string, Closing>();
    for (const [len, cs2] of knownLengths) if (topLengths.has(len)) for (const c of cs2) knownWord.set(wordOfRep(places[c.places[0]].rep), c);
    const needWord = (len: number): boolean => knownLengths.has(len) || (topLengths.get(len) ?? 0) > 1;
    const predictedWord = new Map<string, Closing>();
    for (const g of top) {
      const from = forecastFrom.get(g.key);
      if (from !== undefined && needWord(g.length)) predictedWord.set(wordOfRep(g.rep), from);
    }
    for (const g of top) {
      const w = needWord(g.length) ? wordOfRep(g.rep) : null;
      const k = w ? knownWord.get(w) : undefined;
      if (k) { known++; aboveBucket.set(g.key, bucketOf(k, order(f, k))); continue; }
      const from = forecastFrom.get(g.key) ?? (w ? predictedWord.get(w) : undefined);
      if (from !== undefined) { predicted++; aboveBucket.set(g.key, bucketOf({ root: from.root, nugget: false, status: 'harmonic' }, order(f, from) + 1)); continue; }
      aboveBucket.set(g.key, 'unseen');
      const u = unseen.get(w ?? g.key) ?? unseen.set(w ?? g.key, { length: g.length, places: 0, word: w ?? wordOfRep(g.rep) }).get(w ?? g.key)!;
      u.places++;
    }
  }

  // shares of chords, by chain and class, to the level above
  onProgress('accounting', 0, 1);
  const ofKey = new Map(f.closings.flatMap((c) => c.keys.map((k) => [k, bucketOf(c, order(f, c))] as const)));
  const chainRows = account(cs, (c) => {
    const k = closingKey(c);
    return ofKey.get(k) ?? aboveBucket.get(k) ?? 'unclassified';
  });
  const freq = typeFrequencies('hex');
  const shares: ComboAnalysis['shares'] = { tails: [], closings: {} };
  const buckets = new Set<string>();
  for (const r of chainRows) for (const b of Object.keys(r.closedHere)) buckets.add(b);
  for (const b of buckets) shares.closings[b] = [];
  for (let n = 0; n <= L + 1; n++) {
    const at = chainRows.filter((r) => r.level === n);
    const w = (g: (r: AccountRow) => number): number => at.reduce((s, r, t) => s + freq[t] * g(r), 0);
    const W = w((r) => r.chords);
    shares.tails.push(sig(w((r) => r.tails) / W));
    for (const b of buckets) shares.closings[b].push(sig(w((r) => r.closedHere[b] ?? 0) / W));
  }
  const status = tileAccount(cs, f);
  const arcs = longestArcs(cs);
  return {
    family: 'hex',
    rule: subset.join(''),
    combo,
    levels: L,
    floor: FLOOR,
    settled: settledAt >= 0,
    lastNew: f.lastNew,
    floors: byFloor.map((x) => ({ floor: x.floor, lastNew: x.lastNew, foundational: x.closings.filter((c) => c.status === 'foundational').length })),
    seconds: (Date.now() - t0) / 1000,
    growth: substitutionGrowth('hex'),
    closings: f.closings.map((c) => ({
      id: c.id, place: c.places[0], level: c.level, length: c.length, families: [...c.families], places: c.places.length, placesByLevel: { ...c.placesByLevel },
      steps: c.steps, status: c.status, nugget: c.nugget, of: c.of, floor: c.floor, matched: c.matched, root: c.root,
      copies: Object.values(c.copies).reduce((s, x) => s + x, 0), types: Object.keys(c.copies).length,
    })),
    predictions,
    shares,
    above: { level: L + 1, known, predicted, unseen: [...unseen.values()] },
    assumption: { checked, exceptions },
    delta: status
      .filter((r) => r.type === 'Delta' && r.level <= L)
      .map((r) => ({ level: r.level, chords: r.chords, room: r.room, tails: r.tails, closedHere: { ...r.closedHere } })),
    longestArcs: Array.from({ length: L + 2 }, (_, n) => {
      const at = arcs.filter((a) => a.level === n);
      return { level: n, length: Math.max(...at.map((a) => a.length)), nested: at.filter((a) => a.nested).length };
    }),
  };
}

/** A circuit's harmonic order: 0 for a foundational circuit, 1 for its harmonic two levels up, and so on. */
export function order(f: Foundations, c: Closing): number {
  let n = 0;
  for (let x = c; x.of !== null; x = f.closings[x.of]) n++;
  return n;
}

/** A circuit's bucket in the shares: its chain's root, its class (nugget, foundational, harmonic) and its harmonic order, `root|class|order`. */
export const bucketOf = (c: Pick<Closing, 'root' | 'nugget' | 'status'>, n: number): string => `${c.root}|${c.nugget ? 'nugget' : c.status}|${n}`;
