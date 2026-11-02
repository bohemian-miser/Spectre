/**
 * What the open strands of a rooted patch close into.
 *
 * The patch is a level-L supertile of the root type; its open strands are
 * the arcs of the root's level-L table, one per pair of border places. Each
 * is followed up through the root's ancestors, every supertile taken as a
 * child of its own type where the substitution has one (`bruteForce.ts`'s
 * `parentOf`; a Delta is slot 1 of a Delta, as Identify takes it), until it
 * closes. Through the full tables (`buildShapes`, to `build`) the walk is
 * the build's; above them the routes are worked out on demand
 * (`sparseRoutes.ts`), the brute force's oracle, up to level `cap` or a
 * budget of routes. The arcs are followed a level at a time, and every arc
 * met on another's walk is taken with it, so each distinct closing walk is
 * followed once.
 *
 * A closed walk is named from the combination's own circuits (the
 * Foundations data, or `analyseCombo` run live), in turn:
 *
 * 1. by its word (`foundations.wordKey`) against each circuit's place in the build;
 * 2. by its place (`closingKey`), which the analysis counts as one circuit's
 *    even where two words share it;
 * 3. as a harmonic first closing here, read from the floor up against the
 *    circuits two levels down in the same children, as the brute force does
 *    (`agreement`);
 * 4. as a known circuit or its harmonic closing again, in another supertile
 *    or a bigger one: the same reading (two levels up for the harmonic) at
 *    every level from the floor to one below the highest where neither
 *    leaves types out, at least `SAME_LEVELS`.
 *
 * What none names is a circuit not known, shown with the circuit it reads
 * most like at the lowest levels.
 */
import type { HexType } from '../../core';
import { agreement, buildShapes, canonicalCycle, closingGroups, isHarmonic, wordKeyOf, type Group, type TopReadings } from '../foundations/foundations';
import type { PageCombo } from '../foundations/pageData';
import { familyOfSteps, parentOf, readWalked, walkedWordCodes } from '../harmonics/bruteForce';
import { RouteLimit, SparseRoutes, TYPES, typeIndex, type Walked } from '../harmonics/sparseRoutes';
import type { CircuitShapes } from '../shapes/circuitShapes';
import { liftArc } from '../fates/follow';
import { certifies, isTurn, outerEdges, type ArcAt } from '../fates/lines';
import { cycleName, type Cycle } from '../fates/placements';
import { IdentifyEngine, labelOf, type Candidate } from '../identify/identify';

/** The highest level of the full tables (level 9 holds about half a million places). */
export const BUILD = 9;
/** The highest level a strand is followed to. */
export const CAP = 14;
/** Routes above the full tables worked out at most. */
export const ROUTES = 4e6;
/** Closings longer than this are named by their reading alone. */
export const WORD_CAP = 2e7;
/** Levels two readings must agree at, from the floor up, to name a closing as a circuit closing again. */
const SAME_LEVELS = 3;
/** Raw visits a level is read with at most (`readWalked`). */
const MAX_RAW = 3e6;
/** The level `analyseCombo` classifies to when there is no precomputed data. */
export const LIVE_LEVELS = 8;

/** An open strand of the patch, as the Explorer traces it: its first tile (`slotPathCode`), the edge it enters that tile by, and its tiles in the patch. */
export interface TailInput {
  readonly code: number;
  readonly edge: number;
  readonly tiles: number;
}

export interface TailJob {
  readonly subset: readonly number[];
  readonly combo: string;
  readonly root: HexType;
  readonly level: number;
  readonly tails: readonly TailInput[];
  readonly cap?: number;
  readonly routes?: number;
  /** The root's ancestors from level L + 1 up, each a type and the slot of the one below in it; past them, `parentOf`. */
  readonly above?: readonly { readonly type: HexType; readonly slot: number }[];
}

/** A circuit of the combination: where it first closes, its tiles, and its place in its chain. */
export interface Named {
  readonly level: number;
  readonly length: number;
  /** Harmonic order: 0 for a foundational circuit or a nugget. */
  readonly order: number;
  readonly nugget: boolean;
  /** The foundational circuit its chain starts at (itself at order 0). */
  readonly root: { readonly level: number; readonly length: number; readonly id: number; readonly families: string };
  /** Its id in the combination's analysis, or null for a harmonic found here above it. */
  readonly id: number | null;
  /**
   * Named by its word; by its place, where its word is none of the
   * combination's circuits' but its place (`closingKey`) is one the analysis
   * counts as one of theirs; or by its reading against the circuit two
   * levels down.
   */
  readonly how: 'word' | 'place' | 'reading';
}

/** A closing walk the strands of the patch end on. */
export interface Closing {
  readonly level: number;
  readonly type: string;
  readonly length: number;
  /** Its word key, or null past `WORD_CAP` tiles. */
  readonly word: string | null;
  /** Through the full tables, or the routes above them. */
  readonly via: 'tables' | 'routes';
  /** What it is, or null for a circuit not known. */
  readonly named: Named | null;
  /** Not known: the circuit it reads most like at the lowest levels, shown as a candidate. */
  readonly near: Near | null;
}

/** A circuit a closing reads the same as at its levels `from` to `to`, and not the next level up. */
export interface Near {
  readonly named: Named;
  readonly from: number;
  readonly to: number;
}

/** What became of one open strand of the patch. */
export type TailFate =
  | { readonly state: 'closed'; readonly closing: number }
  | { readonly state: 'open'; readonly level: number; readonly tiles: number; readonly why: 'cap' | 'routes'; /** The tail every tail on the same strand is followed as. */ readonly strand: number }
  | { readonly state: 'ends'; readonly level: number }
  /** On a strand certified as an infinite line at `level` (`fates/lines.ts`), through the ancestry's repeating part, `cycle` (`cycleName`). */
  | { readonly state: 'line'; readonly level: number; readonly tiles: number; readonly cycle: string; readonly strand: number };

/** A class of the legend: a chain, a nugget, a circuit not known, or still open (the Explorer keys an infinite line `line`). */
export const classKey = (c: Closing | null): string =>
  !c ? 'open' : !c.named ? 'unknown' : `${c.named.nugget ? 'nugget' : 'chain'} ${c.named.root.id}`;

export interface TailUpdate {
  readonly stage: string;
  /** Tails with a fate, of all. */
  readonly done: number;
  readonly total: number;
  /** Fates by tail index, the new ones since the last update. */
  readonly fates: readonly (readonly [number, TailFate])[];
  /** Closings, the new ones since the last update, by index. */
  readonly closings: readonly (readonly [number, Closing])[];
  readonly finished: boolean;
  /** The chains by their foundational circuit's id, as the Foundations chart orders them: most chords closed in the build first. */
  readonly chains: readonly number[];
  readonly seconds: number;
}

/** A circuit known by name: the place its word is read from, and its places at its first level, each read when needed. */
interface Entry {
  readonly named: Named;
  readonly rep: Walked;
  word: string | null;
  places: Walked[] | null;
  readonly reads: Map<Walked, TopReadings>;
}

/**
 * The combination's circuits as names: each data row's circuit, with its
 * places in the build; and those named here as harmonics above it.
 */
export class Catalog {
  private readonly byLength = new Map<number, Entry[]>();
  private readonly byLevel = new Map<number, Entry[]>();
  private readonly groups: Group[];
  readonly floor: number;

  constructor(
    private readonly cs: CircuitShapes,
    private readonly R: SparseRoutes,
    readonly data: PageCombo,
  ) {
    this.floor = data.floor;
    this.groups = closingGroups(cs, Math.min(cs.maxLevel, data.levels));
    const rootOf = (id: number): Named['root'] => {
      const f = data.found.find((r) => r[0] === id)!;
      return { level: f[1], length: f[2], id, families: f[3] };
    };
    const add = (named: Named, place: number): void => {
      const g = this.groups[place];
      if (!g || g.level !== named.level || g.length !== named.length) return;
      this.index({ named, rep: R.walked(g.rep), word: null, places: null, reads: new Map() });
    };
    for (const f of data.found) add({ level: f[1], length: f[2], order: 0, nugget: f[9] === 1, root: rootOf(f[0]), id: f[0], how: 'word' }, f[7]);
    for (const h of data.harm) add({ level: h[1], length: h[2], order: h[7], nugget: false, root: rootOf(h[4]), id: h[0], how: 'word' }, h[8]);
  }

  private index(e: Entry): void {
    (this.byLength.get(e.named.length) ?? this.byLength.set(e.named.length, []).get(e.named.length)!).push(e);
    (this.byLevel.get(e.named.level) ?? this.byLevel.set(e.named.level, []).get(e.named.level)!).push(e);
  }

  private readonly groupWords = new Map<Group, string>();

  private wordOf(e: Entry): string {
    return (e.word ??= wordKeyOf(walkedWordCodes(this.R, e.rep)));
  }

  private groupWord(g: Group): string {
    let w = this.groupWords.get(g);
    if (w === undefined) this.groupWords.set(g, (w = wordKeyOf(walkedWordCodes(this.R, this.R.walked(g.rep)))));
    return w;
  }

  private readonly bornWords = new Map<Walked, string>();

  /**
   * A circuit's places at its first level, in a supertile of every type it
   * closes in there: the build's closings with its tiles (and its word,
   * when another circuit there has as many).
   */
  private placesOf(e: Entry): Walked[] {
    if (e.places) return e.places;
    const { level, length } = e.named;
    const alike = (this.byLevel.get(level) ?? []).filter((x) => x.named.length === length).length > 1;
    const word = alike ? this.wordOf(e) : null;
    const same = (c: Walked): boolean => {
      if (word === null) return true;
      let w = this.bornWords.get(c);
      if (w === undefined) this.bornWords.set(c, (w = wordKeyOf(walkedWordCodes(this.R, c))));
      return w === word;
    };
    e.places = this.cs.born.filter((c) => c.level === level && c.length === length).map((c) => this.R.walked(c)).filter(same);
    return e.places;
  }

  /** The circuit the analysis counts a closing's place as: the one whose word its group's walk has. */
  private byPlace(b: Walked): Entry | null {
    const key = `${b.level}/${b.length}/${familyOfSteps(b.steps)}/${canonicalCycle(b.steps.map((s) => s % 8)).join('')}`;
    const g = this.groups.find((x) => x.key === key);
    if (!g) return null;
    const of = this.byLength.get(g.length) ?? [];
    return of.length === 1 && of[0].named.how === 'word' ? of[0] : (of.find((e) => this.wordOf(e) === this.groupWord(g)) ?? null);
  }

  private readOf(e: Entry, w: Walked): TopReadings {
    let r = e.reads.get(w);
    if (!r) e.reads.set(w, (r = readWalked(this.R, w, this.floor, MAX_RAW)));
    return r;
  }

  /** The circuit a closing walk is: by its word, else as a harmonic of a circuit two levels down; null when neither. */
  name(b: Walked, word: string | null): Named | null {
    this.near = null;
    const seen = word === null ? undefined : this.aliases.get(word);
    if (seen) return seen;
    const named = this.nameOf(b, word);
    // a word named other than by its own: the same name when it closes again
    if (named && word !== null && named.how !== 'word') this.aliases.set(word, named);
    return named;
  }

  /** Words named by place or reading, with their names. */
  private readonly aliases = new Map<string, Named>();

  private nameOf(b: Walked, word: string | null): Named | null {
    if (word !== null) {
      for (const e of this.byLength.get(b.length) ?? []) {
        if (this.wordOf(e) !== word) continue;
        // a harmonic found here, closing again: one more place to read it in
        if (e.named.how === 'reading' && e.named.level === b.level && !e.places!.some((w) => w.type === b.type)) e.places!.push(b);
        return e.named;
      }
    }
    const placed = this.byPlace(b);
    if (placed) return { ...placed.named, how: 'place' };
    const family = familyOfSteps(b.steps);
    let rb: TopReadings | null = null;
    const readB = (): TopReadings => (rb ??= readWalked(this.R, b, this.floor, MAX_RAW, this.floor));
    const found = (a: Entry, lift: number): Named => {
      const named: Named =
        lift === 0
          ? { ...a.named, how: 'reading' }
          : { level: a.named.level + 2, length: b.length, order: a.named.order + 1, nugget: false, root: a.named.root, id: this.idOf(b, a.named), how: 'reading' };
      if (lift) this.index({ named, rep: b, word, places: [b], reads: new Map() });
      return named;
    };
    // a harmonic first closing here, as the brute force reads one: two levels above a circuit, through the same children, reading as it from the floor up
    for (const a of this.byLevel.get(b.level - 2) ?? []) {
      // its places in a supertile of the closing's type first
      for (const w of [...this.placesOf(a)].sort((x, y) => Number(y.type === b.type) - Number(x.type === b.type))) {
        if (w.level !== a.named.level || familyOfSteps(w.steps) !== family) continue;
        const g = agreement(this.readOf(a, w), a.named.level, readB());
        if (isHarmonic(g.floor, a.named.level, this.floor) || (g.limited && g.floor <= a.named.level - 2)) return found(a, 2);
      }
    }
    // a known circuit or its harmonic closing again, in another supertile or a bigger one: the same reading, at the same levels or two up, from the floor to one level below the highest where neither closing leaves types out (there a token's parent is a child of the supertile it closes in)
    for (const lift of [0, 2]) {
      for (const [level, list] of this.byLevel) {
        if (level > b.level - lift) continue;
        for (const a of list) {
          if (lift === 0 && a.named.length !== b.length) continue;
          for (const w of this.placesOf(a)) {
            const top = Math.min(w.level - 4, b.level - 4 - lift);
            if (top - this.floor + 1 < SAME_LEVELS) continue;
            const ra = this.readOf(a, w);
            const rB = readB();
            let k = this.floor;
            while (k <= top && ra.levels[k] && rB.levels[k + lift] && equal(ra.levels[k]!, rB.levels[k + lift]!)) k++;
            if (k > top) return found(a, lift);
            const levels = k - this.floor;
            if (levels >= 2 && (!this.near || levels > this.near.to - this.near.from + 1)) {
              const named: Named = lift === 0 ? a.named : { ...a.named, level: a.named.level + 2, length: b.length, order: a.named.order + 1, id: null, how: 'reading' };
              this.near = { named, from: this.floor + lift, to: k - 1 + lift };
            }
          }
        }
      }
    }
    return null;
  }

  /** For the last closing `name` could not name: the circuit it reads most like, and the levels (counted as that circuit's) where it reads the same. */
  near: Near | null = null;

  /** The data's id for a harmonic named by reading, when the data has it: the row two levels above `of` with these tiles. */
  private idOf(b: Walked, of: Named): number | null {
    if (of.id === null) return null;
    return this.data.harm.find((h) => h[3] === of.id && h[1] === b.level && h[2] === b.length)?.[0] ?? null;
  }
}

function equal(a: Int32Array, b: Int32Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Each border place of a level-L supertile of `root` as the tile it enters and that tile's edge: code * 8 + edge. */
export function placeTiles(cs: CircuitShapes, root: string, L: number): Map<number, number> {
  const out = new Map<number, number>();
  const T = cs.levels[L][root];
  for (const k of T.crossings()) {
    let p = k;
    let type = root;
    let code = 0;
    for (let n = L; n > 0; n--) {
      const step = cs.levels[n][type].level.under[p];
      const ch = cs.childOf(n, type, step);
      code = code * 8 + ch.pos;
      type = ch.type;
      p = ch.k;
    }
    out.set(code * 8 + p, k);
  }
  return out;
}

/** An arc being followed: its two ends at its level, the tails on it, and the arcs a level down it was followed from. */
interface Arc {
  readonly a: number;
  readonly b: number;
  readonly tiles: number;
  readonly tails: number[];
  readonly below: Arc[];
}

/** A combination's full tables, the routes above them and its circuits by name, kept for every patch of it. */
export interface TailShapes {
  readonly subset: readonly number[];
  readonly combo: string;
  /** The level the tables are built to, and the highest the strands are followed through them; past `base` the routes are worked out. */
  readonly build: number;
  readonly base: number;
  readonly cs: CircuitShapes;
  readonly R: SparseRoutes;
  readonly catalog: Catalog;
}

/**
 * Builds a combination's tables to `build` and names its circuits: from its
 * Foundations data, or `live` (`analyseCombo`) without. Strands are followed
 * through the tables to `base` (`build` but for tests), and by routes above.
 */
export function tailShapes(
  subset: readonly number[],
  combo: string,
  known: PageCombo | null,
  live: (subset: readonly number[], combo: string, levels: number) => PageCombo,
  build = BUILD,
  onStage: (stage: string) => void = () => {},
  base = build,
): TailShapes {
  const cs = buildShapes(subset, combo, 1);
  for (let n = 2; n <= build; n++) {
    onStage(`building level ${n}`);
    cs.extend(n);
  }
  const R = new SparseRoutes(cs, base);
  onStage('naming circuits');
  const data = known ?? live(subset, combo, Math.min(LIVE_LEVELS, build - 1));
  return { subset, combo, build, base, cs, R, catalog: new Catalog(cs, R, data) };
}

/**
 * The open strands of a patch followed until they close, a level at a time,
 * with updates as their fates are known.
 */
export class TailClassifier {
  readonly cs: CircuitShapes;
  readonly R: SparseRoutes;
  readonly cap: number;
  private readonly catalog: Catalog;
  readonly fates: (TailFate | null)[];
  readonly closings: Closing[] = [];
  private readonly t0 = Date.now();
  private done = 0;
  private readonly chains: readonly number[];

  constructor(
    readonly job: TailJob,
    readonly shapes: TailShapes,
    private readonly onUpdate: (u: TailUpdate) => void = () => {},
    /** Whether a strand certified as an infinite line is settled as one, rather than followed to the cap. */
    private readonly lines = true,
  ) {
    if (job.level > shapes.base) throw new Error(`the tables are followed to level ${shapes.base}, below the patch`);
    this.cs = shapes.cs;
    this.R = shapes.R;
    this.catalog = shapes.catalog;
    this.cap = Math.max(shapes.build + 1, job.cap ?? CAP);
    this.fates = job.tails.map(() => null);
    this.chains = chainOrder(shapes.catalog.data);
  }

  private post(stage: string, fates: (readonly [number, TailFate])[], closings: (readonly [number, Closing])[], finished = false): void {
    this.onUpdate({ stage, done: this.done, total: this.job.tails.length, fates, closings, finished, chains: this.chains, seconds: (Date.now() - this.t0) / 1000 });
  }

  private settle(arc: Arc, fate: TailFate, out: (readonly [number, TailFate])[]): void {
    for (const t of arc.tails) {
      if (this.fates[t]) continue;
      this.fates[t] = fate;
      this.done++;
      out.push([t, fate]);
    }
  }

  /** Follows every tail; returns their fates (null for a tail that is no arc of the root's table). */
  run(): (TailFate | null)[] {
    const { cs, R, job } = this;
    const L = job.level;
    R.limit = R.work.calls + (job.routes ?? ROUTES);

    // the tails as arcs of the root's table
    const T = cs.levels[L][job.root];
    const at = placeTiles(cs, job.root, L);
    let frontier = new Map<number, Arc>();
    job.tails.forEach((t, i) => {
      const k = at.get(t.code * 8 + t.edge);
      const m = k === undefined ? -1 : T.mate(k);
      if (k === undefined || m < 0 || T.len(k) !== t.tiles) return;
      const key = Math.min(k, m);
      const arc = frontier.get(key) ?? frontier.set(key, { a: k, b: m, tiles: T.len(k), tails: [], below: [] }).get(key)!;
      arc.tails.push(i);
    });

    let ti = typeIndex.get(job.root)!;
    // the type at each level from L, and the slot it sits in one level up
    const anc: { type: number; slot: number }[] = [];
    for (let n = L; n < this.cap && frontier.size; n++) {
      const given = job.above?.[n - L];
      const p = given ? { type: typeIndex.get(given.type)!, slot: given.slot } : parentOf(R, ti);
      anc[n] = { type: ti, slot: p.slot };
      anc[n + 1] = { type: p.type, slot: -1 };
      if (R.kid(p.type, p.slot) !== ti) throw new Error(`a level-${n + 1} ${TYPES[p.type]} has no ${TYPES[ti]} in slot ${p.slot}`);
      const next = new Map<number, Arc>();
      const fates: (readonly [number, TailFate])[] = [];
      const closings: (readonly [number, Closing])[] = [];
      // each place of an arc at level n, to its arc
      const byPlace = new Map<number, number>();
      for (const [key, arc] of frontier) {
        byPlace.set(arc.a, key);
        byPlace.set(arc.b, key);
      }
      const taken = new Set<number>();
      /** The arcs a walk at level n + 1 runs through, taken with it. */
      const absorb = (steps: readonly number[], into: (arc: Arc) => void): void => {
        for (const s of steps) {
          if (s % 8 !== p.slot) continue;
          const key = byPlace.get((s - p.slot) / 8);
          if (key === undefined || taken.has(key)) continue;
          taken.add(key);
          into(frontier.get(key)!);
        }
      };
      let limited = false;
      for (const [key, arc] of frontier) {
        if (taken.has(key)) continue;
        if (limited) {
          this.settle(arc, { state: 'open', level: n, tiles: arc.tiles, strand: arc.tails[0], why: 'routes' }, fates);
          continue;
        }
        try {
          const up1 = liftArc(R, n, arc.a, p.type, p.slot, TYPES);
          if (up1.kind === 'ends') {
            taken.add(key);
            this.settle(arc, { state: 'ends', level: n + 1 }, fates);
            continue;
          }
          if (up1.kind === 'closed') {
            const ci = this.closings.length;
            const closing = this.close(up1.walk, n > this.shapes.base ? 'routes' : 'tables');
            this.closings.push(closing);
            closings.push([ci, closing]);
            taken.add(key);
            this.settle(arc, { state: 'closed', closing: ci }, fates);
            absorb(up1.steps, (o) => this.settle(o, { state: 'closed', closing: ci }, fates));
            continue;
          }
          const { a, b } = up1;
          const up: Arc = { a, b, tiles: up1.tiles, tails: [], below: [] };
          const merge = (o: Arc): void => {
            up.tails.push(...o.tails);
            up.below.push(o);
          };
          taken.add(key);
          merge(arc);
          absorb(up1.steps, merge);
          const nk = Math.min(a, b);
          const had = next.get(nk);
          if (had) {
            had.tails.push(...up.tails);
            had.below.push(...up.below);
          } else next.set(nk, up);
        } catch (err) {
          if (!(err instanceof RouteLimit)) throw err;
          limited = true;
          this.settle(arc, { state: 'open', level: n, tiles: arc.tiles, strand: arc.tails[0], why: 'routes' }, fates);
        }
      }
      if (limited) for (const arc of next.values()) this.settle(arc, { state: 'open', level: n + 1, tiles: arc.tiles, strand: arc.tails[0], why: 'routes' }, fates);
      else if (this.lines) {
        for (const [key, arc] of next) {
          const c = certifiedLine(R, n + 1, arc, anc, L);
          if (!c) continue;
          next.delete(key);
          this.settle(arc, { state: 'line', level: n + 1, tiles: arc.tiles, cycle: cycleName(c), strand: arc.tails[0] }, fates);
        }
      }
      frontier = limited ? new Map() : next;
      ti = p.type;
      this.post(`followed to level ${n + 1}`, fates, closings);
    }
    const fates: (readonly [number, TailFate])[] = [];
    for (const arc of frontier.values()) this.settle(arc, { state: 'open', level: this.cap, tiles: arc.tiles, strand: arc.tails[0], why: 'cap' }, fates);
    this.post('done', fates, [], true);
    return this.fates;
  }

  /** A closing walk, named. */
  private close(walk: Walked, via: Closing['via']): Closing {
    return nameClosing(this.R, this.catalog, walk, via);
  }
}

/** A closing walk, named from the combination's circuits. */
export function nameClosing(R: SparseRoutes, catalog: Catalog, walk: Walked, via: Closing['via']): Closing {
  const word = walk.length <= WORD_CAP ? wordKeyOf(walkedWordCodes(R, walk)) : null;
  const named = catalog.name(walk, word);
  return { level: walk.level, type: walk.type, length: walk.length, word, via, named, near: named ? null : catalog.near };
}

/** The longest period of ancestry an infinite line is looked for along. */
const PERIOD = 4;

/**
 * The cycle along which an arc at level M is certified as an infinite line
 * (`fates/lines.ts`): the ancestry from M - 2q to M repeats with period q,
 * and the arc is fixed over both turns, through arcs it was followed from.
 */
function certifiedLine(R: SparseRoutes, M: number, arc: Arc, anc: readonly { type: number; slot: number }[], L: number): Cycle | null {
  const down = (xs: Arc[], k: number): Arc[] => (k === 0 ? xs : down(xs.flatMap((x) => x.below), k - 1));
  for (let q = 1; q <= PERIOD && M - 2 * q >= L; q++) {
    let periodic = anc[M].type === anc[M - q].type;
    for (let i = 0; periodic && i < q; i++) periodic = anc[M - 2 * q + i].type === anc[M - q + i].type && anc[M - 2 * q + i].slot === anc[M - q + i].slot;
    if (!periodic) continue;
    const type = TYPES[anc[M].type];
    const cycle: Cycle = { type, steps: Array.from({ length: q }, (_, i) => ({ parent: TYPES[anc[M - q + i + 1].type], slot: anc[M - q + i].slot })) };
    const outer = outerEdges(cycle);
    const at = (m: number, x: Arc): ArcAt => ({ level: m, type, a: x.a, b: x.b });
    for (const a1 of down([arc], q)) {
      if (!isTurn(R, at(M - q, a1), at(M, arc))) continue;
      for (const a0 of down([a1], q)) if (certifies(R, [at(M - 2 * q, a0), at(M - q, a1), at(M, arc)], outer)) return cycle;
    }
  }
  return null;
}

/** A tail's first tile as a slot path from a level-L root (`1.7.0`). */
export const slotPath = (code: number, L: number): string => Array.from({ length: L }, (_, i) => Math.floor(code / 8 ** (L - 1 - i)) % 8).join('.');

/**
 * Identify's best guess for a strand still open at the cap, from the tail
 * it is followed as: its ranking of the chains carried above the build
 * against the strand's reading at the highest level built (`IdentifyEngine`).
 * Only for a Delta patch with Identify's ancestors (no `above`); null when
 * it ranks nothing.
 */
export function openCandidate(job: TailJob, tail: number, shapes: TailShapes): string | null {
  if (job.root !== 'Delta' || job.above) return null;
  const t = job.tails[tail];
  const engine = new IdentifyEngine({ subset: job.subset, combo: job.combo, tile: slotPath(t.code, job.level), edge: t.edge, level: job.level, cap: shapes.build, known: shapes.catalog.data });
  let best: Candidate | null = null;
  while (!engine.done) {
    const r = engine.step();
    if (r.found !== 'open') return null;
    best = r.candidates[0] ?? best;
  }
  return best ? labelOf(best) : null;
}

/** Chains by their foundational circuit's id, the most chords closed in the build first (the Foundations chart's order by chain). */
export function chainOrder(p: PageCombo): number[] {
  const built = new Map<number, number>();
  for (const r of p.shares) if (r[1] !== 0) built.set(r[0], (built.get(r[0]) ?? 0) + r[3].reduce((a, b) => a + b, 0));
  return [...built.keys()].sort((a, b) => built.get(b)! - built.get(a)!);
}
