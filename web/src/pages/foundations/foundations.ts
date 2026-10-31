/**
 * The foundational circuits of a combination, the harmonic chains grown from
 * them, and an account of every chord of every supertile.
 *
 * Built on the renormalisation (`shapes/circuitShapes.ts`). A circuit closing
 * at level n is read at every level below it as in `harmonics/readings.ts`:
 * the level-k supertiles its strand runs through, backtracks cancelled, each
 * as type, slot and parent type, with types left out at the top two levels.
 *
 * Circuit B closing at level n + 2 is a harmonic of circuit A closing at
 * level n above level `floor` when the two run through the same child slots
 * (the same family) and B read at level k + 2 is A read at level k for every
 * k from `floor` up to A's top, and for at least A's top two levels. In
 * 023468 / 140000001 every pair agrees from A's level 2 up and differs at
 * levels 0 and 1; other combinations need a floor of 1, 3 or 4.
 *
 * A circuit is its word (`core/circuitWord.ts`): every closing with that
 * word, in any place and at any level, is the same circuit. Where it first
 * closes, a circuit is a harmonic of a circuit closing two levels down, or
 * foundational. A foundational circuit with harmonics starts a chain; one
 * without is a nugget.
 *
 * `account` splits the chords of every level-n supertile into the circuits
 * closed inside it, by the level they close at and what they are, and the
 * open arcs (tails) that leave it.
 */
import { buildSystem, connectionPoints, leafOrder, type HexType, type MetaNode, type TileFamilyId } from '../../core';
import { CircuitShapes, familyOf, placeOf, slotOf, type BornCircuit } from '../shapes/circuitShapes';

const TYPES = leafOrder('hex') as readonly string[];
const typeIndex = new Map(TYPES.map((t, i) => [t, i] as const));
/** A token's code for a left-out type or parent. */
export const NONE = 9;

/** Each level's child types: kids[n][type][slot] = child type index, -1 for an empty slot. */
function kidTypes(family: TileFamilyId, n: number): Int8Array[] {
  const sys = buildSystem(family, n);
  return TYPES.map((t) => {
    const out = new Int8Array(8).fill(-1);
    for (const ch of (sys[t] as MetaNode).children) out[ch.pos] = typeIndex.get(ch.node.type)!;
    return out;
  });
}

const kidCache = new WeakMap<CircuitShapes, Int8Array[][]>();
function kidsOf(cs: CircuitShapes, n: number): Int8Array[] {
  let all = kidCache.get(cs);
  if (!all) kidCache.set(cs, (all = []));
  return (all[n] ??= kidTypes(cs.family, n));
}

/** A token as a number: type (or NONE) * 100 + slot * 10 + parent (or NONE). */
export const tokenCode = (type: number, slot: number, parent: number): number => type * 100 + slot * 10 + parent;

/** The token string `harmonics/readings.ts` writes for a code. */
export function tokenString(code: number): string {
  const PREFIX: Record<string, string> = { Gamma: 'G', Delta: 'D', Theta: 'T', Lambda: 'L', Xi: 'X', Pi: 'Pi', Sigma: 'S', Phi: 'Ph', Psi: 'Ps' };
  const t = Math.floor(code / 100), s = Math.floor(code / 10) % 10, p = code % 10;
  return `${t === NONE ? '' : PREFIX[TYPES[t]]}<${s}${p === NONE ? '' : PREFIX[TYPES[p]]}`;
}

/**
 * Cancels backtracks in a cyclic sequence of visits: a visit, a visit to
 * another supertile and a return (A B A) become A, until none is left or two
 * visits remain. Each visit is a step across a seam and back again is no
 * step, so the order of cancelling does not matter; this is
 * `cancelBacktracks` of `harmonics/readings.ts` in one pass with a stack.
 * Returns the indices of the visits kept, in order.
 */
export function cancelCyclic(ids: ArrayLike<number>): Int32Array {
  const n = ids.length;
  const keep = new Int32Array(n);
  let top = 0;
  for (let i = 0; i < n; i++) {
    if (top >= 2 && ids[keep[top - 2]] === ids[i]) top--;
    else keep[top++] = i;
  }
  let lo = 0, hi = top;
  while (hi - lo > 2) {
    if (ids[keep[hi - 2]] === ids[keep[lo]]) { hi--; lo++; }
    else if (ids[keep[hi - 1]] === ids[keep[lo + 1]]) lo += 2;
    else break;
  }
  return keep.slice(lo, hi);
}

/** Index of the least rotation of a sequence of numbers (Booth's algorithm). */
function leastRotation(s: ArrayLike<number>): number {
  const n = s.length;
  const f = new Int32Array(2 * n).fill(-1);
  let k = 0;
  for (let j = 1; j < 2 * n; j++) {
    const sj = s[j % n];
    let i = f[j - k - 1];
    while (i !== -1 && sj !== s[(k + i + 1) % n]) {
      if (sj < s[(k + i + 1) % n]) k = j - i - 1;
      i = f[i];
    }
    if (sj !== s[(k + i + 1) % n]) {
      if (sj < s[k % n]) k = j;
      f[j - k] = -1;
    } else f[j - k] = i + 1;
  }
  return n === 0 ? 0 : k % n;
}

/** A cyclic sequence read from its least rotation in its least direction, so equal sequences come out equal. */
export function canonicalCycle(s: ArrayLike<number>): Int32Array {
  const n = s.length;
  const rot = (a: ArrayLike<number>, k: number): Int32Array => {
    const out = new Int32Array(n);
    for (let i = 0; i < n; i++) out[i] = a[(i + k) % n];
    return out;
  };
  const f = rot(s, leastRotation(s));
  const r = Int32Array.from(s).reverse();
  const b = rot(r, leastRotation(r));
  for (let i = 0; i < n; i++) if (f[i] !== b[i]) return f[i] < b[i] ? f : b;
  return f;
}

const sameArray = (a: ArrayLike<number>, b: ArrayLike<number>): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

export interface TopReadings {
  /** Per level k below the birth: the canonical cancelled reading as token codes, or null where not read. */
  readonly levels: (Int32Array | null)[];
  /** Raw visits per level read. */
  readonly raw: number[];
  /** The lowest level read. */
  readonly lowest: number;
}

/**
 * A born circuit read at every level from the one below its birth down to
 * `lowest`, or as far down as stays within `maxRaw` raw visits at a level,
 * but always down to `must`.
 */
export function readCircuit(cs: CircuitShapes, c: BornCircuit, lowest = 0, maxRaw = 3e6, must = lowest): TopReadings {
  const n = c.level;
  const levels: (Int32Array | null)[] = new Array(n).fill(null);
  const raw: number[] = new Array(n).fill(0);
  let stop = n - 1;
  let read = n;
  for (;;) {
    const ids: number[][] = Array.from({ length: n }, () => []);
    const toks: number[][] = Array.from({ length: n }, () => []);
    let over = false;
    const visit = (m: number, ti: number, place: number, id: number, slot: number, parent: number): void => {
      if (over) return;
      ids[m].push(id);
      toks[m].push(tokenCode(m <= n - 2 ? ti : NONE, slot, m <= n - 3 ? parent : NONE));
      if (ids[m].length > 8 * maxRaw) { over = true; return; }
      if (m === stop) return;
      const T = cs.levels[m][TYPES[ti]];
      const { steps, forward } = T.route(place);
      const kids = kidsOf(cs, m)[ti];
      const len = steps.length;
      for (let q = 0; q < len; q++) {
        const s = steps[forward ? q : len - 1 - q];
        const sl = slotOf(s);
        const ct = kids[sl];
        const cp = forward ? placeOf(s) : cs.levels[m - 1][TYPES[ct]].mate(placeOf(s));
        visit(m - 1, ct, cp, id * 8 + sl, sl, ti);
      }
    };
    const top = kidsOf(cs, n)[typeIndex.get(c.type)!];
    for (const s of c.steps) visit(n - 1, top[slotOf(s)], placeOf(s), slotOf(s), slotOf(s), typeIndex.get(c.type)!);
    if (over) break;
    for (let k = stop; k < n; k++) {
      if (levels[k]) continue;
      const keep = cancelCyclic(ids[k]);
      levels[k] = canonicalCycle(Array.from(keep, (i) => toks[k][i]));
      raw[k] = ids[k].length;
    }
    read = stop;
    if (stop <= lowest || (stop <= must && ids[stop].length * 6 > maxRaw)) break;
    stop--;
  }
  return { levels, raw, lowest: read };
}

/** How far down B (two levels up) reads as A: the lowest level of A from which every level up to A's top agrees, A's level when the top differs, and whether the agreement reaches the lowest level both were read at. */
export function agreement(a: TopReadings, aLevel: number, b: TopReadings): { floor: number; limited: boolean } {
  let k = aLevel - 1;
  for (; k >= 0; k--) {
    const x = a.levels[k], y = b.levels[k + 2];
    if (!x || !y) return { floor: k + 1, limited: true };
    if (!sameArray(x, y)) return { floor: k + 1, limited: false };
  }
  return { floor: 0, limited: false };
}

/**
 * Whether an agreement down to `agreed` (`agreement`'s floor) of a circuit
 * closing at `level` makes a harmonic: every level from `floor` up agrees,
 * and at least two levels do, since the top level alone says only which
 * children the circuit runs through.
 */
export const isHarmonic = (agreed: number, level: number, floor: number): boolean => agreed <= floor && agreed <= level - 2;

export type Status = 'foundational' | 'harmonic';

/**
 * A circuit's word as numbers, one per tile: type * 64 + entry edge * 8 +
 * exit edge, in the order the strand meets the tiles (`CircuitShapes.word`
 * writes the same tiles as letters).
 */
export function wordCodes(cs: CircuitShapes, c: BornCircuit): Int32Array {
  const out = new Int32Array(c.length);
  let i = 0;
  const visit = (m: number, ti: number, place: number): void => {
    const T = cs.levels[m][TYPES[ti]];
    if (m === 0) {
      out[i++] = ti * 64 + place * 8 + T.mate(place);
      return;
    }
    const { steps, forward } = T.route(place);
    const kids = kidsOf(cs, m)[ti];
    const len = steps.length;
    for (let q = 0; q < len; q++) {
      const st = steps[forward ? q : len - 1 - q];
      const ct = kids[slotOf(st)];
      visit(m - 1, ct, forward ? placeOf(st) : cs.levels[m - 1][TYPES[ct]].mate(placeOf(st)));
    }
  };
  const top = kidsOf(cs, c.level)[typeIndex.get(c.type)!];
  for (const st of c.steps) visit(c.level - 1, top[slotOf(st)], placeOf(st));
  if (i !== c.length) throw new Error(`a ${c.length}-tile circuit walked ${i} tiles`);
  return out;
}

/**
 * Which circuit a closing is, as a key: its word read from the tile and in
 * the direction where it reads least (as `circuitKey` does with letters),
 * hashed with its length. Two closings have the same key when they are the
 * same circuit, moved; two different circuits share one only if two
 * independent 32-bit hashes collide.
 */
export function wordKey(cs: CircuitShapes, c: BornCircuit): string {
  return wordKeyOf(wordCodes(cs, c));
}

/** `wordKey` of a word given as `wordCodes`. */
export function wordKeyOf(w: Int32Array): string {
  const n = w.length;
  const back = new Int32Array(n);
  for (let j = 0; j < n; j++) {
    const x = w[n - 1 - j];
    back[j] = (x & ~63) | ((x & 7) << 3) | ((x >> 3) & 7);
  }
  const f = leastRotation(w), r = leastRotation(back);
  let pick = w, at = f;
  for (let j = 0; j < n; j++) {
    const a = w[(f + j) % n], b = back[(r + j) % n];
    if (a !== b) {
      if (b < a) { pick = back; at = r; }
      break;
    }
  }
  let h1 = 0x811c9dc5, h2 = 0x1b873593;
  for (let j = 0; j < n; j++) {
    const v = pick[(at + j) % n];
    h1 = Math.imul(h1 ^ v, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (v + j * 7919), 0x5bd1e995) >>> 0;
  }
  return `${n}:${h1.toString(36)}:${h2.toString(36)}`;
}

/**
 * One circuit: one word, with every place it closes in, at every level. A
 * place is a closing with its own child slots (`closingKey`); the same
 * circuit closes across different pairs of children, in different places of
 * a supertile, and again across the seams of bigger supertiles.
 */
export interface Closing {
  readonly id: number;
  /** `closingKey` of each of its places. */
  readonly keys: readonly string[];
  /** Its places' indices in `closingGroups`, lowest level first; the first is the one read and drawn. */
  readonly places: readonly number[];
  /** The lowest level it closes at. */
  readonly level: number;
  readonly length: number;
  /** The family (child slots) of each of its places at its lowest level. */
  readonly families: readonly string[];
  /** How many places it closes in at each level, from its lowest. */
  readonly placesByLevel: Readonly<Record<number, number>>;
  /** Copies closing in a supertile of each type at each level: copiesByLevel[level][type]. */
  readonly copiesByLevel: Readonly<Record<number, Readonly<Record<string, number>>>>;
  /** Child crossings of the walk read. */
  readonly steps: number;
  /** Copies closing in a supertile of each type, every place and level together, by type name. */
  readonly copies: Readonly<Record<string, number>>;
  /** Foundational: starts a chain (`nugget` when nothing is a harmonic of it); harmonic: a harmonic of `of`. */
  readonly status: Status;
  /** Harmonic: the circuit it is a harmonic of, closing two levels below its lowest level. */
  readonly of: number | null;
  /** Harmonic: the floor of its agreement with `of`, the highest over its places that agree. Foundational: the best floor found against any circuit two levels down, or null when there was none. */
  readonly floor: number | null;
  /** Harmonic: how many of its places at its lowest level read as a place of `of`. */
  readonly matched: number;
  /** The foundational circuit at the root of its chain (itself when foundational). */
  readonly root: number;
  /** A foundational circuit nothing is a harmonic of, and its harmonics none either: its chain is itself. */
  readonly nugget: boolean;
  /** Raw visits per level read, and the lowest level read (of the place read). */
  readonly visits: readonly number[];
  readonly lowest: number;
}

export interface Foundations {
  readonly levels: number;
  readonly floor: number;
  readonly closings: readonly Closing[];
  /** The highest level a foundational circuit first closes at. */
  readonly lastNew: number;
}

/** Word keys and readings of the places, kept between calls of `foundations` on the same renormalisation. */
export interface FoundationsCache {
  readonly words: Map<BornCircuit, string>;
  readonly reads: Map<BornCircuit, TopReadings>;
}

/** What makes copies of a born circuit one place: level, length, family and the cyclic sequence of child slots. */
export const closingKey = (c: BornCircuit): string => `${c.level}/${c.length}/${familyOf(c)}/${canonicalCycle(c.steps.map(slotOf)).join('')}`;

/** One kept walk per supertile type and place, with its copies counted. */
export const bornKey = (c: BornCircuit): string => `${c.type}|${closingKey(c)}`;

/** The renormalisation of a hexagon combination to `level`, keeping every place once per type with its copies counted. */
export const buildShapes = (subset: readonly number[], combo: string, level: number): CircuitShapes =>
  new CircuitShapes('hex', subset, [...combo].map((ch) => parseInt(ch, 36)), level, 1, false, bornKey);

/** Every copy of one place: its walk read (a Delta's when there is one) and its copies per type. */
export interface Group {
  readonly key: string;
  readonly level: number;
  readonly length: number;
  readonly family: string;
  readonly steps: number;
  readonly copies: Record<string, number>;
  rep: BornCircuit;
}

/**
 * The places of a renormalisation up to level `upTo`, in a fixed order (a
 * place's index is its position here): by level, then length, then family,
 * ties in the order they were born. Levels never reorder as the build
 * grows, so a build to any level at or above a place's gives it the same
 * index.
 */
export function closingGroups(cs: CircuitShapes, upTo = cs.maxLevel): Group[] {
  const groups = new Map<string, Group>();
  for (const c of cs.born) {
    if (c.level > upTo) continue;
    const key = closingKey(c);
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, level: c.level, length: c.length, family: familyOf(c), steps: c.steps.length, copies: {}, rep: c }));
    g.copies[c.type] = (g.copies[c.type] ?? 0) + cs.copiesOf(c);
    if (c.type === 'Delta' && g.rep.type !== 'Delta') g.rep = c;
  }
  return [...groups.values()].sort((a, b) => a.level - b.level || a.length - b.length || a.family.localeCompare(b.family));
}

/**
 * The places' words, where they decide anything: a place whose length no
 * other place shares is a circuit of its own and gets its key instead.
 * Places past `wordCap` tiles keep their key too.
 */
export function placeWords(cs: CircuitShapes, places: readonly Group[], cache: FoundationsCache, wordCap = 6e7): string[] {
  const sameLength = new Map<number, number>();
  for (const g of places) sameLength.set(g.length, (sameLength.get(g.length) ?? 0) + 1);
  return places.map((g) => {
    if (sameLength.get(g.length)! < 2 || g.length > wordCap) return `place ${g.key}`;
    return cache.words.get(g.rep) ?? cache.words.set(g.rep, wordKey(cs, g.rep)).get(g.rep)!;
  });
}

/**
 * Sorts every circuit the renormalisation closed, up to level `upTo`, into
 * foundational and harmonic. `cs` must keep every closing (`buildShapes`,
 * or `keepAtLeast` 1 without `onePerLength`). The places with one word, at
 * any level, are one circuit, sorted where it first closes. Each place is
 * read (a Delta's copy when there is one). A circuit is a harmonic of the
 * circuit two levels below its lowest level that the most of its places
 * there read as (a place of it with the same family, agreeing from `floor`
 * up); `matched` says how many do.
 */
export function foundations(cs: CircuitShapes, opts: { floor?: number; maxRaw?: number; wordCap?: number; cache?: FoundationsCache; upTo?: number } = {}): Foundations {
  const floor = opts.floor ?? 2;
  const maxRaw = opts.maxRaw ?? 3e6;
  const upTo = opts.upTo ?? cs.maxLevel;
  const places = closingGroups(cs, upTo);
  const cache = opts.cache ?? { words: new Map(), reads: new Map() };
  const words = placeWords(cs, places, cache, opts.wordCap);
  const readOf = (g: Group): TopReadings => {
    let r = cache.reads.get(g.rep);
    if (!r || r.lowest > floor + 2) cache.reads.set(g.rep, (r = readCircuit(cs, g.rep, 0, maxRaw, floor + 2)));
    return r;
  };
  const byWord = new Map<string, number[]>();
  places.forEach((_, i) => (byWord.get(words[i]) ?? byWord.set(words[i], []).get(words[i])!).push(i));
  const circuits = [...byWord.values()].sort((a, b) => a[0] - b[0]);
  const out: (Closing & { nugget: boolean })[] = [];
  circuits.forEach((ps, id) => {
    const g = places[ps[0]];
    const first = ps.filter((p) => places[p].level === g.level);
    const copies: Record<string, number> = {};
    const placesByLevel: Record<number, number> = {};
    const copiesByLevel: Record<number, Record<string, number>> = {};
    for (const p of ps) {
      const lv = places[p].level;
      placesByLevel[lv] = (placesByLevel[lv] ?? 0) + 1;
      const at = (copiesByLevel[lv] ??= {});
      for (const [t, n] of Object.entries(places[p].copies)) {
        copies[t] = (copies[t] ?? 0) + n;
        at[t] = (at[t] ?? 0) + n;
      }
    }
    const r = readOf(g);
    const base = {
      id, keys: ps.map((p) => places[p].key), places: ps, level: g.level, length: g.length, families: first.map((p) => places[p].family),
      placesByLevel, copiesByLevel, steps: g.steps, copies, visits: r.raw, lowest: r.lowest, nugget: false,
    };
    // the circuit with places two levels down that the most of this one's lowest places read as
    let best = -1, bestMatched = 0, bestFloor = Infinity, anyFloor = Infinity;
    out.forEach((a, j) => {
      const below = a.places.filter((q) => places[q].level + 2 === g.level);
      if (!below.length) return;
      let matched = 0, worst = -Infinity;
      for (const p of first) {
        let pf = Infinity;
        for (const q of below) {
          if (places[q].family !== places[p].family) continue;
          const { floor: f } = agreement(readOf(places[q]), places[q].level, readOf(places[p]));
          if (f < places[q].level) { pf = Math.min(pf, f); anyFloor = Math.min(anyFloor, f); }
        }
        if (isHarmonic(pf, g.level - 2, floor)) { matched++; worst = Math.max(worst, pf); }
      }
      if (matched > bestMatched || (matched > 0 && matched === bestMatched && worst < bestFloor)) { best = j; bestMatched = matched; bestFloor = worst; }
    });
    if (best >= 0) out.push({ ...base, status: 'harmonic', of: best, floor: bestFloor, matched: bestMatched, root: out[best].root });
    else out.push({ ...base, status: 'foundational', of: null, floor: Number.isFinite(anyFloor) ? anyFloor : null, matched: 0, root: id });
  });
  const rooted = new Set(out.filter((c) => c.status === 'harmonic').map((c) => c.root));
  for (const c of out) if (c.status === 'foundational' && !rooted.has(c.id)) c.nugget = true;
  const lastNew = Math.max(0, ...out.filter((c) => c.status === 'foundational').map((c) => c.level));
  return { levels: upTo, floor, closings: out, lastNew };
}

/** A circuit's class in the account: a nugget, or the foundational circuit or a harmonic of a chain. */
export const classOf = (c: Closing): 'nugget' | 'foundational' | 'harmonic' => (c.nugget ? 'nugget' : c.status);

/** A closed walk `walkAbove` found, as a circuit closing at `level` in a supertile of `type`. */
export function bornAbove(level: number, type: string, walk: { steps: number[]; length: number }): BornCircuit {
  const slots: number[] = [];
  for (const s of walk.steps) if (!slots.includes(slotOf(s))) slots.push(slotOf(s));
  return { level, type: type as never, length: walk.length, slots, steps: walk.steps };
}

/**
 * The harmonic of a born circuit A, two levels up, from the tables up to one
 * level above A alone: nothing of the level the harmonic closes at is read,
 * so it may be built or not. A read at level `floor` runs first through the
 * level-`floor` supertile at slot path P from its supertile; its harmonic
 * runs through the level-(floor + 2) supertile at the same path in a
 * supertile of A's type two levels up. Every arc of the child at P's first
 * slot that passes through that supertile is followed through the children
 * (`walkAbove`); the closed walks through the same children as A that read
 * as A from `floor` up are the predictions (without `read`, every closed
 * walk through the same children, unread, for circuits too long to read).
 */
export function predictHarmonic(cs: CircuitShapes, a: BornCircuit, floor: number, maxRaw = 3e6, read = true): { predicted: BornCircuit[]; tried: number; reading: TopReadings } {
  if (cs.maxLevel < a.level + 1) throw new Error(`predicting from level ${a.level} needs the build at level ${a.level + 1}`);
  const ra = readCircuit(cs, a, read ? floor : a.level - 1, maxRaw);
  // A's first visit at level `floor`: its slots from the birth down
  const path: number[] = [];
  {
    const first = cs.childOf(a.level, a.type, a.steps[0]);
    path.push(first.pos);
    let type = first.type, k = first.k;
    for (let n = a.level - 1; n > floor; n--) {
      const e = cs.enters(n, type, k)[0];
      path.push(e.slot);
      type = e.type;
      k = e.k;
    }
  }
  const top = a.level + 2;
  const kidsTop = kidTypes(cs.family, top)[typeIndex.get(a.type)!];
  const child = TYPES[kidsTop[path[0]]];
  // whether the level-m arc entering `place` of `ti` reaches the supertile at path[i..]
  const passes = (m: number, ti: number, place: number, i: number): boolean => {
    if (i === path.length) return true;
    const { steps, forward } = cs.levels[m][TYPES[ti]].route(place);
    const kids = kidsOf(cs, m)[ti];
    for (const s of steps) {
      if (slotOf(s) !== path[i]) continue;
      const ct = kids[path[i]];
      const cp = forward ? placeOf(s) : cs.levels[m - 1][TYPES[ct]].mate(placeOf(s));
      if (passes(m - 1, ct, cp, i + 1)) return true;
    }
    return false;
  };
  const T = cs.levels[top - 1][child];
  const predicted: BornCircuit[] = [];
  const seen = new Set<number>();
  let tried = 0;
  for (const k of T.crossings()) {
    const m = T.mate(k);
    if (m < 0 || m < k || seen.has(k)) continue;
    if (!passes(top - 1, typeIndex.get(child)!, k, 1)) continue;
    tried++;
    const w = cs.walkAbove(a.type, k * 8 + path[0], top - 1);
    for (const s of w.steps) if (slotOf(s) === path[0]) { seen.add(placeOf(s)); seen.add(cs.levels[top - 1][child].mate(placeOf(s))); }
    if (!w.closed) continue;
    const b = bornAbove(top, a.type, w);
    if (familyOf(b) !== familyOf(a)) continue;
    if (!read) { predicted.push(b); continue; }
    const rb = readCircuit(cs, b, floor + 2, maxRaw);
    const { floor: f } = agreement(ra, a.level, rb);
    if (isHarmonic(f, a.level, floor)) predicted.push(b);
  }
  return { predicted, tried, reading: ra };
}

/** The same closed walk: the same child crossings, from any start, either way round. */
export function sameWalk(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y), sb = [...b].sort((x, y) => x - y);
  return sa.every((x, i) => x === sb[i]);
}

/** Per type, how many children of each type: the substitution matrix, M[t][u]. */
export function substitutionMatrix(family: TileFamilyId): number[][] {
  const sys = buildSystem(family, 1);
  return TYPES.map((t) => {
    const row = new Array<number>(TYPES.length).fill(0);
    for (const ch of (sys[t] as MetaNode).children) row[typeIndex.get(ch.node.type)!]++;
    return row;
  });
}

export interface AccountRow {
  readonly level: number;
  readonly type: string;
  /** Tiles counted with the strands through them: a tile with two chords counts twice. */
  readonly chords: number;
  /** Chords on circuits closed inside, by bucket, and the ones closing at this level. */
  readonly closed: Readonly<Record<string, number>>;
  readonly closedHere: Readonly<Record<string, number>>;
  /** Chords on no circuit closed inside: chords less closed. */
  readonly tails: number;
  /** The table's arc lengths, once per arc: the tails, for a rule that pairs every crossing of every tile (otherwise strands that end at a tile with unpaired crossings are left out). */
  readonly arcs: number;
  /** The children's tails: what the closings at this level are made of. */
  readonly room: number;
}

/**
 * Every chord of every level-n supertile of every type, for every level
 * built: on a circuit closed inside it (counted with its copies, by the
 * level it closes at, in the bucket `bucketOf` puts it in), or on an open
 * arc. The level-n supertile holds M^(n-m)[t][u] level-m supertiles of type
 * u (M the substitution matrix). Counts are integers; the tails are chords
 * less closed, and the test checks them against the tables' arc lengths
 * (`arcs`), an independent count, for a rule that pairs every crossing.
 */
export function account(cs: CircuitShapes, bucketOf: (c: BornCircuit) => string): AccountRow[] {
  const M = substitutionMatrix(cs.family);
  const nT = TYPES.length;
  const born: Map<string, number>[][] = Array.from({ length: cs.maxLevel + 1 }, () => TYPES.map(() => new Map()));
  const buckets = new Set<string>();
  for (const c of cs.born) {
    const b = bucketOf(c);
    buckets.add(b);
    const m = born[c.level][typeIndex.get(c.type)!];
    m.set(b, (m.get(b) ?? 0) + c.length * cs.copiesOf(c));
  }
  const tailsAt = (n: number, t: string): number => {
    const T = cs.levels[n][t];
    let s = 0;
    for (const k of T.crossings()) s += T.len(k);
    return s / 2;
  };
  const rows: AccountRow[] = [];
  // a tile's chords: its crossings paired by the combination (a tile whose crossings the rule cannot pair has none)
  let chords = TYPES.map((t) => {
    const T = cs.levels[0][t];
    return Array.from(T.crossings()).filter((k) => T.mate(k) >= 0).length / 2;
  });
  let tails = chords.slice();
  let closed: Map<string, number>[] = TYPES.map(() => new Map());
  const plain = (m: Map<string, number>): Record<string, number> => Object.fromEntries([...buckets].map((b) => [b, m.get(b) ?? 0]));
  const total = (m: Map<string, number>): number => [...m.values()].reduce((a, b) => a + b, 0);
  for (let t = 0; t < nT; t++) rows.push({ level: 0, type: TYPES[t], chords: chords[t], closed: plain(closed[t]), closedHere: plain(born[0][t]), tails: tails[t], arcs: tailsAt(0, TYPES[t]), room: 0 });
  for (let n = 1; n <= cs.maxLevel; n++) {
    const nc = new Array<number>(nT).fill(0);
    const room = new Array<number>(nT).fill(0);
    const ncl = TYPES.map((_, t) => new Map(born[n][t]));
    for (let t = 0; t < nT; t++) {
      for (let u = 0; u < nT; u++) {
        if (!M[t][u]) continue;
        nc[t] += M[t][u] * chords[u];
        room[t] += M[t][u] * tails[u];
        for (const [b, v] of closed[u]) ncl[t].set(b, (ncl[t].get(b) ?? 0) + M[t][u] * v);
      }
      if (!Number.isSafeInteger(nc[t])) throw new Error('chord counts past exact integers');
    }
    const nt = TYPES.map((_, t) => nc[t] - total(ncl[t]));
    for (let t = 0; t < nT; t++) rows.push({ level: n, type: TYPES[t], chords: nc[t], closed: plain(ncl[t]), closedHere: plain(born[n][t]), tails: nt[t], arcs: tailsAt(n, TYPES[t]), room: room[t] });
    chords = nc;
    closed = ncl;
    tails = nt;
  }
  return rows;
}

/** The account by class: nugget, or the foundational circuit or a harmonic of a chain. */
export function tileAccount(cs: CircuitShapes, f: Foundations): AccountRow[] {
  const classOfKey = new Map(f.closings.flatMap((c) => c.keys.map((k) => [k, classOf(c)] as const)));
  return account(cs, (c) => classOfKey.get(closingKey(c)) ?? 'unclassified');
}

/** The account by chain and class: each circuit under `root|class`, its chain's foundational circuit (its id) and what it is, so each chord counts once. */
export function chainAccount(cs: CircuitShapes, f: Foundations): AccountRow[] {
  const rootOf = new Map(f.closings.flatMap((c) => c.keys.map((k) => [k, `${c.root}|${classOf(c)}`] as const)));
  return account(cs, (c) => rootOf.get(closingKey(c)) ?? 'unclassified');
}

/** Chords per leaf type under a rule: half its crossings. */
export function chordsPerTile(family: TileFamilyId, subset: readonly number[]): Record<string, number> {
  const sel = new Set(subset);
  return Object.fromEntries(TYPES.map((t) => [t, connectionPoints(family, t as HexType, sel).length / 2]));
}

/** The substitution's tile-type frequencies: the Perron-Frobenius eigenvector of M (columns: how many of each type a supertile holds), by power iteration, summing to 1. */
export function typeFrequencies(family: TileFamilyId): number[] {
  const M = substitutionMatrix(family);
  let v = new Array<number>(TYPES.length).fill(1 / TYPES.length);
  for (let it = 0; it < 200; it++) {
    const w = new Array<number>(TYPES.length).fill(0);
    for (let t = 0; t < TYPES.length; t++) for (let u = 0; u < TYPES.length; u++) w[u] += v[t] * M[t][u];
    const s = w.reduce((x, y) => x + y, 0);
    v = w.map((x) => x / s);
  }
  return v;
}

export interface LongestArc {
  readonly level: number;
  readonly type: string;
  readonly length: number;
  /** Whether it runs through the whole of a child's longest arc. */
  readonly nested: boolean;
}

/**
 * The longest open arc of each type at each level, and whether it runs
 * through the longest arc of one of its children: an open strand that does at
 * every level is one strand growing at both ends without closing.
 */
export function longestArcs(cs: CircuitShapes): LongestArc[] {
  const memo = new Map<string, number>();
  const best = (n: number, t: string): number => {
    const key = `${n}/${t}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    const T = cs.levels[n][t];
    let b = -1;
    for (const k of T.crossings()) if (b < 0 || T.len(k) > T.len(b)) b = k;
    memo.set(key, b);
    return b;
  };
  const out: LongestArc[] = [];
  for (let n = 0; n <= cs.maxLevel; n++) {
    for (const t of TYPES) {
      const k = best(n, t);
      let nested = false;
      if (n > 0 && k >= 0) {
        for (const e of cs.enters(n, t, k)) {
          const b = best(n - 1, e.type);
          if (e.k === b || cs.levels[n - 1][e.type].mate(e.k) === b) nested = true;
        }
      }
      out.push({ level: n, type: t, length: k < 0 ? 0 : cs.levels[n][t].len(k), nested });
    }
  }
  return out;
}

/** How often a closed walk crosses each seam: per pair of child slots, the crossings between them. */
export function seamCrossings(c: BornCircuit): Record<string, number> {
  const out: Record<string, number> = {};
  const n = c.steps.length;
  for (let i = 0; i < n; i++) {
    const a = slotOf(c.steps[(i + n - 1) % n]), b = slotOf(c.steps[i]);
    if (a === b) continue;
    const key = a < b ? `${a}${b}` : `${b}${a}`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** The substitution's growth: the Perron-Frobenius eigenvalue of M, how many times the tiles (and chords) of a supertile grow a level. */
export function substitutionGrowth(family: TileFamilyId): number {
  const M = substitutionMatrix(family);
  const f = typeFrequencies(family);
  return f.reduce((s, ft, t) => s + ft * M[t].reduce((a, b) => a + b, 0), 0);
}
