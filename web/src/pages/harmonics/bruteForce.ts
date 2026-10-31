/**
 * Circuits above the full tables, found by following strands with routes
 * worked out on demand (`sparseRoutes.ts`).
 *
 * `harmonicAbove` looks for a chain's next member two levels above a
 * circuit A, where `foundations/foundations.ts` (`predictHarmonic`) looks
 * for it: A read at level `floor` runs first through the level-`floor`
 * supertile at slot path P from its birth supertile, and its harmonic runs
 * through the level-(floor + 2) supertile at the same path in a supertile of
 * A's type two levels up. Every strand entering that supertile is lifted
 * through its ancestors to the child at P's first slot, and the arc of the
 * child it is on is followed through the children of the supertile two
 * levels up. A closed walk through the same children as A that reads as A
 * from `floor` up is the harmonic.
 *
 * `climb` follows one strand up a level at a time until it closes, each
 * supertile taken as a child of its own type where the substitution has one.
 */
import { agreement, canonicalCycle, cancelCyclic, isHarmonic, NONE, tokenCode, wordKeyOf, type TopReadings } from '../foundations/foundations';
import { RouteLimit, SparseRoutes, TYPES, typeIndex, type Walked, type Work } from './sparseRoutes';

/** Child slots a walk runs through, sorted: its family. */
export const familyOfSteps = (steps: readonly number[]): string => [...new Set(steps.map((s) => s % 8))].sort((x, y) => x - y).join('');

/** A walk's place: level, length, family and its cyclic sequence of child slots, hashed past 64 slots (`foundations.ts`'s `closingKey` below that). */
export function placeKey(c: Walked): string {
  const cycle = canonicalCycle(c.steps.map((s) => s % 8));
  let slots = cycle.join('');
  if (cycle.length > 64) {
    let h1 = 0x811c9dc5, h2 = 0x1b873593;
    for (let j = 0; j < cycle.length; j++) {
      h1 = Math.imul(h1 ^ cycle[j], 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ (cycle[j] + j * 7919), 0x5bd1e995) >>> 0;
    }
    slots = `${cycle.length}:${h1.toString(36)}:${h2.toString(36)}`;
  }
  return `${c.level}/${c.length}/${familyOfSteps(c.steps)}/${slots}`;
}

/** A's visits at level `floor`, each supertile once in the order the strand first meets it, as slot paths from its birth supertile down. */
export function* visitPaths(R: SparseRoutes, a: Walked, floor: number): Generator<number[]> {
  const met = new Set<number>();
  const path: number[] = [];
  function* down(m: number, ti: number, place: number, id: number): Generator<number[]> {
    if (m === floor) {
      if (!met.has(id)) {
        met.add(id);
        yield path.slice();
      }
      return;
    }
    const kids: number[] = [];
    R.enters(m, ti, place, (sl, ct, cp) => kids.push(sl, ct, cp));
    for (let q = 0; q < kids.length; q += 3) {
      path.push(kids[q]);
      yield* down(m - 1, kids[q + 1], kids[q + 2], id * 8 + kids[q]);
      path.pop();
    }
  }
  const top = typeIndex.get(a.type)!;
  for (const s of a.steps) {
    const sl = s % 8;
    path.push(sl);
    yield* down(a.level - 1, R.kid(top, sl), (s - sl) / 8, sl);
    path.pop();
  }
}

/**
 * A walk read at every level from the one below its birth down to `lowest`,
 * or as far down as stays within `maxRaw` raw visits at a level, but always
 * down to `must`: `foundations.ts`'s `readCircuit`, with the routes worked
 * out on demand.
 */
export function readWalked(R: SparseRoutes, c: Walked, lowest = 0, maxRaw = 3e6, must = lowest): TopReadings {
  const n = c.level;
  const levels: (Int32Array | null)[] = new Array(n).fill(null);
  const raw: number[] = new Array(n).fill(0);
  const top = typeIndex.get(c.type)!;
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
      if (ids[m].length > 8 * maxRaw) {
        over = true;
        return;
      }
      if (m === stop) return;
      R.enters(m, ti, place, (sl, ct, cp) => visit(m - 1, ct, cp, id * 8 + sl, sl, ti));
    };
    for (const s of c.steps) {
      const sl = s % 8;
      visit(n - 1, R.kid(top, sl), (s - sl) / 8, sl, sl, top);
    }
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

/** A walk's word as `foundations.ts`'s `wordCodes`: type * 64 + entry edge * 8 + exit edge, a tile each. */
export function walkedWordCodes(R: SparseRoutes, c: Walked): Int32Array {
  const out = new Int32Array(c.length);
  let i = 0;
  const visit = (m: number, ti: number, place: number): void => {
    if (m === 0) {
      out[i++] = ti * 64 + place * 8 + R.mate(0, ti, place);
      return;
    }
    R.enters(m, ti, place, (_, ct, cp) => visit(m - 1, ct, cp));
  };
  const top = typeIndex.get(c.type)!;
  for (const s of c.steps) {
    const sl = s % 8;
    visit(c.level - 1, R.kid(top, sl), (s - sl) / 8);
  }
  if (i !== c.length) throw new Error(`a ${c.length}-tile walk met ${i} tiles`);
  return out;
}

/** What a strand entering a child at a crossing does in the parent: closes there, leaves it by a crossing of its outline, or ends in a tile. */
export type Lift = { readonly end: 'closed'; readonly length: number; readonly steps: number[] } | { readonly end: 'out'; readonly place: number } | { readonly end: 'ends' };

/**
 * The strand entering a level-n child (in slot `slot` of a type-`pti`
 * parent) at crossing q, followed in the parent: closed, with its walk, or
 * open, by the crossing of the parent's outline it enters at (the end it
 * reaches going back from q).
 */
export function lift(R: SparseRoutes, n: number, q: number, pti: number, slot: number): Lift {
  const x0 = q * 8 + slot;
  const steps: number[] = [];
  const w = R.walk(n + 1, pti, x0, steps);
  if (w.end === 'closed') return { end: 'closed', length: w.length, steps };
  if (w.end === 'ends') return { end: 'ends' };
  const z = R.across(n + 1, pti, x0);
  if (z < 0) return { end: 'out', place: R.placeOf(n + 1, x0) };
  const back = R.walk(n + 1, pti, z);
  return back.end === 'out' ? { end: 'out', place: back.exit } : { end: 'ends' };
}

/** A type's parent when climbing: itself where its substitution has a child of its type, else the first type that has one; and the slot. */
export function parentOf(R: SparseRoutes, ti: number): { type: number; slot: number } {
  for (const u of [ti, ...TYPES.keys()]) for (let s = 0; s < 8; s++) if (R.kid(u, s) === ti) return { type: u, slot: s };
  throw new Error(`no type has a ${TYPES[ti]} child`);
}

/** Progress of a brute force: the level being followed and the work so far. */
export interface Progress extends Work {
  readonly level: number;
}

/** The harmonic found: a closed walk two levels above its fundamental. */
export interface Harmonic {
  readonly level: number;
  readonly type: string;
  readonly length: number;
  readonly steps: readonly number[];
  readonly family: string;
  /** Its word key (`foundations.ts`'s `wordKey`), or its place key past the word cap. */
  readonly key: string;
  /** The lowest level of A from which every level up to A's top reads the same in it, and whether the readings stopped there. */
  readonly agreed: number;
  readonly limited: boolean;
}

export interface Closure {
  readonly level: number;
  readonly type: string;
  readonly length: number;
  readonly family: string;
}

export interface BruteResult {
  readonly from: { readonly level: number; readonly length: number };
  /** The level from which up the harmonic must read as A. */
  readonly floor: number;
  readonly level: number;
  readonly type: string;
  readonly found: Harmonic | null;
  /** A's visits at the floor looked through, the first first, until the harmonic closes. */
  readonly windows: number;
  /** Arcs of the children followed through the supertile. */
  readonly tried: number;
  /** Closed walks there that are not the harmonic: another family, or not reading as A. */
  readonly others: readonly (Closure & { readonly agreed: number | null })[];
  /** Walks that left the supertile. */
  readonly open: number;
  /** Without a harmonic: where the walks that left the supertile close, climbing on (`climb`). */
  readonly beyond: readonly Closure[];
  readonly work: Work;
  readonly seconds: number;
}

export interface BruteOptions {
  readonly floor?: number;
  readonly maxRaw?: number;
  /** Walks longer than this get a place key instead of a word key. */
  readonly wordCap?: number;
  /** Levels to climb above the supertile when no harmonic closes in it. */
  readonly beyond?: number;
  /** A's visits at the floor to look through at most. */
  readonly windows?: number;
  readonly onProgress?: (p: Progress) => void;
}

/** The harmonic of A (closed at `a.level`, its steps as addresses) two levels up. */
export function harmonicAbove(R: SparseRoutes, a: Walked, opts: BruteOptions = {}): BruteResult {
  const t0 = Date.now();
  const floor = opts.floor ?? 2;
  const maxRaw = opts.maxRaw ?? 3e6;
  const wordCap = opts.wordCap ?? 6e7;
  let at = a.level;
  R.onWork = opts.onProgress ? (w) => opts.onProgress!({ level: at, ...w }) : null;
  const ra = readWalked(R, a, floor, maxRaw);
  const family = familyOfSteps(a.steps);
  const top = a.level + 2;
  const T = typeIndex.get(a.type)!;
  /** Child arcs of the supertile two levels up already followed, as place * 8 + slot. */
  const done = new Set<number>();
  const found: Harmonic[] = [];
  const others = new Map<string, Closure & { agreed: number | null }>();
  const open: number[] = [];
  let tried = 0;
  let windows = 0;
  // each window: A's visit at level `floor`, as its slots from the birth down, the first visit first
  for (const path of visitPaths(R, a, floor)) {
    if (found.length || windows === (opts.windows ?? 32)) break;
    windows++;
    // the supertiles from two levels above A down to the one at the window: anc[i] at level top - i
    const anc = [T];
    for (const s of path) anc.push(R.kid(anc[anc.length - 1], s));
    const seen = Array.from({ length: top }, () => new Set<number>());
    const arcs: number[] = [];
    for (const q0 of R.outline(top - path.length, anc[path.length])) {
      let q = q0;
      let ok = true;
      for (let i = path.length - 1; ok && i >= 1; i--) {
        const n = top - i - 1;
        if (seen[n].has(q)) ok = false;
        else {
          seen[n].add(q);
          const m = R.mate(n, anc[i + 1], q);
          if (m >= 0) seen[n].add(m);
          at = n + 1;
          const up = lift(R, n, q, anc[i], path[i]);
          if (up.end === 'out') q = up.place;
          else ok = false;
        }
      }
      if (ok) arcs.push(q);
    }
    const C = anc[1];
    at = top;
    for (const q of arcs) {
      if (done.has(q * 8 + path[0])) continue;
      tried++;
      const steps: number[] = [];
      const w = R.walk(top, T, q * 8 + path[0], steps);
      for (const s of steps) {
        if (s % 8 !== path[0]) continue;
        done.add(s);
        done.add(R.mate(top - 1, C, (s - path[0]) / 8) * 8 + path[0]);
      }
      if (w.end === 'out') open.push(w.exit);
      if (w.end !== 'closed') continue;
      const b: Walked = { level: top, type: a.type, length: w.length, steps };
      const fam = familyOfSteps(steps);
      const other = `${w.length}/${fam}`;
      if (others.has(other)) continue;
      if (fam !== family) {
        others.set(other, { level: top, type: a.type, length: w.length, family: fam, agreed: null });
        continue;
      }
      const rb = readWalked(R, b, floor + 2, maxRaw);
      const g = agreement(ra, a.level, rb);
      if (isHarmonic(g.floor, a.level, floor) || (g.limited && g.floor <= a.level - 2)) {
        found.push({ ...b, family: fam, key: '', agreed: g.floor, limited: g.limited });
      } else others.set(other, { level: top, type: a.type, length: w.length, family: fam, agreed: g.floor });
    }
  }
  found.sort((x, y) => y.length - x.length);
  const best = found[0] ?? null;
  for (const f of found.slice(1)) others.set(`${f.length}/${f.family}`, { level: f.level, type: f.type, length: f.length, family: f.family, agreed: f.agreed });
  const beyond: Closure[] = [];
  if (!best && opts.beyond) {
    const met = new Set<string>();
    for (const x of new Set(open)) {
      const c = climb(R, top, T, x, top + opts.beyond, (n) => { at = n; });
      if (c.closed && !met.has(`${c.closed.level}/${c.closed.length}`)) {
        met.add(`${c.closed.level}/${c.closed.length}`);
        beyond.push(c.closed);
      }
    }
  }
  const key = best ? (best.length <= wordCap ? wordKeyOf(walkedWordCodes(R, best)) : placeKey(best)) : '';
  R.onWork = null;
  return {
    from: { level: a.level, length: a.length },
    floor,
    level: top,
    type: a.type,
    found: best ? { ...best, key } : null,
    windows,
    tried,
    others: [...others.values()],
    open: open.length,
    beyond,
    work: R.work,
    seconds: (Date.now() - t0) / 1000,
  };
}

export interface ClimbResult {
  /** The arc at each level climbed, from the start: its supertile's type, its tiles and the crossing it enters by. */
  readonly levels: readonly { readonly level: number; readonly type: string; readonly length: number; readonly place: number }[];
  /** Where the strand closed, or null when it reached the cap open, ended in a tile or met the routes' limit. */
  readonly closed: Closure | null;
  /** The level the routes' limit (`SparseRoutes.limit`) stopped the climb at, or null. */
  readonly limitedAt: number | null;
  readonly work: Work;
  readonly seconds: number;
}

/**
 * The strand entering crossing `place` of a level-n supertile of type ti,
 * climbed a level at a time (`parentOf`) until it closes, the arc reaches
 * level `cap` or the routes reach their limit.
 */
export function climb(R: SparseRoutes, n: number, ti: number, place: number, cap: number, onLevel?: (level: number) => void): ClimbResult {
  const t0 = Date.now();
  const levels: { level: number; type: string; length: number; place: number }[] = [{ level: n, type: TYPES[ti], length: R.len(n, ti, place), place }];
  let closed: Closure | null = null;
  let limitedAt: number | null = null;
  while (n < cap) {
    const p = parentOf(R, ti);
    onLevel?.(n + 1);
    let up: Lift;
    try {
      up = lift(R, n, place, p.type, p.slot);
    } catch (err) {
      if (!(err instanceof RouteLimit)) throw err;
      limitedAt = n + 1;
      break;
    }
    if (up.end === 'closed') {
      closed = { level: n + 1, type: TYPES[p.type], length: up.length, family: familyOfSteps(up.steps) };
      break;
    }
    if (up.end === 'ends') break;
    n++;
    ti = p.type;
    place = up.place;
    levels.push({ level: n, type: TYPES[ti], length: R.len(n, ti, place), place });
  }
  return { levels, closed, limitedAt, work: R.work, seconds: (Date.now() - t0) / 1000 };
}

/** The longest arc of a level-n supertile of type ti held by the full tables: its crossing. */
export function longestArc(R: SparseRoutes, n: number, ti: number): number {
  const T = R.cs.levels[n][TYPES[ti]];
  let best = -1;
  for (const k of T.crossings()) if (best < 0 || T.len(k) > T.len(best)) best = k;
  return best;
}
