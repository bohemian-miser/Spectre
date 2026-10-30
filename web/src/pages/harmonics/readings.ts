/**
 * A circuit read at a level, and which circuits read as which.
 *
 * Read at level k, a circuit is the sequence of level-k supertiles its
 * strand runs through: one visit per arc through a level-k supertile, as the
 * supertile's type, its slot in its parent and the parent's type. Where the
 * strand runs along a seam it crosses it back and forth; a visit followed
 * straight away by a return to the supertile just left (A B A) is cancelled,
 * so the reading records the supertiles the strand runs through and not how
 * often it crosses the seams between them. The supertile a circuit is born
 * in can be of any type, and so can that supertile's children, so types are
 * compared only from two levels below the birth; slots always.
 *
 * Circuit B is a harmonic of circuit A when B is born two levels above A and
 * B read at level k + 2 is A read at level k at every level: B is A with
 * every tile grown into a level-2 supertile.
 *
 * The visits come from the renormalisation (`shapes/circuitShapes.ts`),
 * which keeps every arc's route through its children, so a circuit born at
 * any level can be read without building a patch.
 */
import { TYPE_PREFIX, type HexType } from '../../core';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';

/** Type names by their letters in a token. */
export const LONG: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(TYPE_PREFIX).map(([k, v]) => [v, k]));
/** The type a token names (`Ph<6D` → Phi), or null when the token leaves it out. */
export const tokenType = (tok: string): string | null => LONG[tok.split('<')[0]] ?? null;

export interface Visit {
  /** The supertile: its slots from the birth supertile down. */
  readonly id: string;
  readonly type: string;
  readonly slot: number;
  readonly parent: string;
  /** Tiles the strand spends in it. */
  readonly tiles: number;
}

/** The raw visits of a born circuit at level k (k below its birth level): one per arc through a level-k supertile. */
export function visitsAt(cs: CircuitShapes, c: BornCircuit, k: number): Visit[] {
  const out: Visit[] = [];
  const descend = (n: number, type: string, cross: number, path: readonly number[], parent: string): void => {
    if (n <= k) {
      out.push({ id: path.join('.'), type, slot: path[path.length - 1], parent, tiles: cs.levels[n][type].len(cross) });
      return;
    }
    for (const e of cs.enters(n, type, cross)) descend(n - 1, e.type, e.k, [...path, e.slot], type);
  };
  for (const s of c.steps) {
    const ch = cs.childOf(c.level, c.type, s);
    descend(c.level - 1, ch.type, ch.k, [ch.pos], c.type);
  }
  return out;
}

/**
 * Cancels every backtrack A B A (cyclically) until none is left, always the
 * first one in the sequence as it stands; the tiles of the three visits are
 * kept on A. Returns the visits kept (indices, in order) and their tiles.
 *
 * The visits are taken in order onto a stack that never holds a backtrack, so
 * the first backtrack is always among its top three; once the end is reached,
 * the backtracks left run round from the end to the start.
 */
export function cancelBacktracksAt(ids: ArrayLike<number | string>, tiles: ArrayLike<number>): { keep: Int32Array; tiles: Float64Array } {
  const n = ids.length;
  const at = new Int32Array(n);
  const sum = new Float64Array(n);
  let head = 0;
  let top = 0;
  const id = (q: number) => ids[at[q]];
  const settle = (): void => {
    while (top - head >= 3 && id(top - 1) === id(top - 3) && id(top - 2) !== id(top - 3)) {
      sum[top - 3] += sum[top - 2] + sum[top - 1];
      top -= 2;
    }
  };
  for (let i = 0; i < n; i++) {
    at[top] = i;
    sum[top++] = tiles[i];
    settle();
  }
  while (top - head > 2) {
    if (id(head) === id(top - 2) && id(top - 1) !== id(top - 2)) {
      // the last two and the first
      const kept = at[top - 2], s = sum[top - 2] + sum[top - 1] + sum[head];
      head++;
      top -= 2;
      at[top] = kept;
      sum[top++] = s;
    } else if (id(head + 1) === id(top - 1) && id(head) !== id(top - 1)) {
      // the last and the first two
      sum[top - 1] += sum[head] + sum[head + 1];
      head += 2;
    } else break;
    settle();
  }
  return { keep: at.slice(head, top), tiles: sum.slice(head, top) };
}

/** `cancelBacktracksAt` on visits. */
export function cancelBacktracks(visits: readonly Visit[]): Visit[] {
  const { keep, tiles } = cancelBacktracksAt(
    visits.map((v) => v.id),
    visits.map((v) => v.tiles),
  );
  return Array.from(keep, (i, q) => (visits[i].tiles === tiles[q] ? visits[i] : { ...visits[i], tiles: tiles[q] }));
}

/** A visit's token at level k of a circuit born at level `birth`: `Ph<6D`, with the type left out from the level just below the birth and the parent from the one below that. */
export function token(v: Visit, k: number, birth: number): string {
  const type = k <= birth - 2 ? TYPE_PREFIX[v.type as HexType] : '';
  const parent = k <= birth - 3 ? TYPE_PREFIX[v.parent as HexType] : '';
  return `${type}<${v.slot}${parent}`;
}

export interface Reading {
  readonly level: number;
  /** Visits before backtracks are cancelled. */
  readonly raw: number;
  readonly tokens: readonly string[];
  readonly tiles: readonly number[];
}

/**
 * The raw visits at one level, as columns: the arc through the supertile
 * (its type and the place entered), the supertile's slot path from the birth
 * supertile down as one number (base 8), its slot, its parent's type, the
 * tiles on the arc, and the visit of the level above it came from.
 */
export interface VisitColumns {
  readonly level: number;
  readonly type: string[];
  readonly cross: number[];
  readonly id: number[];
  readonly slot: number[];
  readonly parent: string[];
  readonly tiles: number[];
  readonly up: number[];
}

const noVisits = (level: number): VisitColumns => ({ level, type: [], cross: [], id: [], slot: [], parent: [], tiles: [], up: [] });

/** The visits of a born circuit at the level below its birth: the children of the birth supertile it runs through, in order. */
export function topVisits(cs: CircuitShapes, c: BornCircuit): VisitColumns {
  const v = noVisits(c.level - 1);
  for (const s of c.steps) {
    const ch = cs.childOf(c.level, c.type, s);
    v.type.push(ch.type);
    v.cross.push(ch.k);
    v.id.push(ch.pos);
    v.slot.push(ch.pos);
    v.parent.push(c.type);
    v.tiles.push(cs.levels[v.level][ch.type].len(ch.k));
    v.up.push(-1);
  }
  return v;
}

/** The visits of the level below: each arc's route through the children of its supertile. */
export function expandVisits(cs: CircuitShapes, v: VisitColumns): VisitColumns {
  const out = noVisits(v.level - 1);
  const below = cs.levels[out.level];
  for (let i = 0; i < v.type.length; i++) {
    for (const e of cs.enters(v.level, v.type[i], v.cross[i])) {
      out.type.push(e.type);
      out.cross.push(e.k);
      out.id.push(v.id[i] * 8 + e.slot);
      out.slot.push(e.slot);
      out.parent.push(v.type[i]);
      out.tiles.push(below[e.type].len(e.k));
      out.up.push(i);
    }
  }
  return out;
}

/** The slot path a visit's id stands for, from the birth supertile down (`1.7.0`). */
export function pathOf(id: number, depth: number): string {
  const slots: number[] = [];
  for (let d = 0; d < depth; d++, id = Math.floor(id / 8)) slots.unshift(id % 8);
  return slots.join('.');
}

/**
 * A born circuit read from the level below its birth downwards, each level's
 * visits expanded from the level above's, until a level has more than
 * `stopAbove` raw visits (that level is read and is the last).
 */
export function readDown(cs: CircuitShapes, c: BornCircuit, stopAbove = Infinity): { readings: Reading[]; readFrom: number } {
  const out: Reading[] = [];
  const names = new Map<string, string>();
  const name = (t: string): string => names.get(t) ?? (names.set(t, t), t);
  let k = c.level - 1;
  let v = topVisits(cs, c);
  for (; k >= 0; k--) {
    if (k < c.level - 1) v = expandVisits(cs, v);
    const cut = cancelBacktracksAt(v.id, v.tiles);
    const at = v;
    const tokens = Array.from(cut.keep, (i) => name(token({ id: '', type: at.type[i], slot: at.slot[i], parent: at.parent[i], tiles: 0 }, k, c.level)));
    out.unshift({ level: k, raw: v.type.length, tokens, tiles: Array.from(cut.tiles) });
    if (v.type.length > stopAbove) break;
  }
  return { readings: out, readFrom: Math.max(0, k) };
}

/** The circuit read at every level below its birth, backtracks cancelled. */
export function readings(cs: CircuitShapes, c: BornCircuit): Reading[] {
  return readDown(cs, c).readings;
}

/** Whether two cyclic token sequences are the same, read either way round. Rotations are tried only where the first token matches. */
export function sameCyclic(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  const n = a.length;
  for (const bb of [b, [...b].reverse()]) {
    for (let r = 0; r < n; r++) {
      if (bb[r] !== a[0]) continue;
      let ok = true;
      for (let i = 1; i < n && ok; i++) if (a[i] !== bb[(r + i) % n]) ok = false;
      if (ok) return true;
    }
  }
  return false;
}

export interface Lineage {
  /** Indices into the circuits compared. */
  readonly a: number;
  readonly b: number;
  /** Per level of A (index = level), whether B two levels up reads the same; null where either was not read. */
  readonly levels: readonly (boolean | null)[];
}

/**
 * Every pair where B is born two levels above A and reads the same at every
 * level compared but possibly the lowest, with at least one level compared.
 * Readings longer than `maxTokens` are compared by length only.
 */
export function lineages(circuits: readonly { readonly level: number; readonly readings: readonly Reading[] }[], maxTokens = 60000): Lineage[] {
  const out: Lineage[] = [];
  circuits.forEach((b, bi) => {
    circuits.forEach((a, ai) => {
      if (a.level + 2 !== b.level) return;
      const levels: (boolean | null)[] = [];
      for (let k = 0; k < a.level; k++) {
        const ra = a.readings.find((r) => r.level === k);
        const rb = b.readings.find((r) => r.level === k + 2);
        if (!ra || !rb) { levels.push(null); continue; }
        if (ra.tokens.length > maxTokens || rb.tokens.length > maxTokens) levels.push(ra.tokens.length === rb.tokens.length);
        else levels.push(sameCyclic(ra.tokens, rb.tokens));
      }
      const compared = levels.slice(1).filter((x) => x !== null);
      if (compared.length && compared.every(Boolean)) out.push({ a: ai, b: bi, levels });
    });
  });
  return out;
}

/** B's visits that A's tiles do not account for, as runs between matched visits: the loops round junctions. Only for readings up to `maxTokens`. */
export function extraRuns(a: readonly string[], b: readonly string[], maxTokens = 1500): { unmatched: number; runs: string[][] } | null {
  if (a.length > maxTokens || b.length > maxTokens || a.length === 0) return null;
  const table = (rb: readonly string[]): number[][] => {
    const d: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(rb.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= rb.length; j++) d[i][j] = a[i - 1] === rb[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
    return d;
  };
  let best: { lcs: number; seq: readonly string[] } | null = null;
  for (const bb of [b, [...b].reverse()]) {
    for (let r = 0; r < bb.length; r++) {
      if (bb[r] !== a[0]) continue;
      const rb = [...bb.slice(r), ...bb.slice(0, r)];
      const lcs = table(rb)[a.length][rb.length];
      if (!best || lcs > best.lcs) best = { lcs, seq: rb };
    }
  }
  if (!best) return { unmatched: a.length, runs: [b.slice()] };
  const rb = best.seq;
  const d = table(rb);
  const matched = new Array<boolean>(rb.length).fill(false);
  for (let i = a.length, j = rb.length; i > 0 && j > 0;) {
    if (a[i - 1] === rb[j - 1]) { matched[j - 1] = true; i--; j--; }
    else if (d[i - 1][j] >= d[i][j - 1]) i--;
    else j--;
  }
  const runs: string[][] = [];
  let run: string[] = [];
  rb.forEach((t, q) => { if (!matched[q]) run.push(t); else if (run.length) { runs.push(run); run = []; } });
  if (run.length) runs.push(run);
  return { unmatched: a.length - best.lcs, runs };
}

export interface Alignment {
  /** B as aligned: read backwards when `back`, from `rotation`. */
  readonly rotation: number;
  readonly back: boolean;
  /** Per token of A, whether it is matched in B; per token of B as aligned, likewise. */
  readonly matchedA: readonly boolean[];
  readonly matchedB: readonly boolean[];
  /** The tokens of B in the aligned order. */
  readonly tokensB: readonly string[];
}

/**
 * Lines two readings up as well as they go: the longest common subsequence
 * over the rotations of B where its token matches A's first, read either
 * way round. Null when either is longer than `maxTokens`.
 */
export function alignReadings(a: readonly string[], b: readonly string[], maxTokens = 2500): Alignment | null {
  if (a.length > maxTokens || b.length > maxTokens || a.length === 0 || b.length === 0) return null;
  const table = (rb: readonly string[]): Uint16Array[] => {
    const d: Uint16Array[] = Array.from({ length: a.length + 1 }, () => new Uint16Array(rb.length + 1));
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= rb.length; j++) d[i][j] = a[i - 1] === rb[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
    return d;
  };
  let best: { lcs: number; rotation: number; back: boolean; seq: readonly string[] } | null = null;
  for (const back of [false, true]) {
    const bb = back ? [...b].reverse() : b;
    const starts = bb.map((t, r) => (t === a[0] ? r : -1)).filter((r) => r >= 0);
    for (const r of starts.length ? starts : [0]) {
      const rb = [...bb.slice(r), ...bb.slice(0, r)];
      const lcs = table(rb)[a.length][rb.length];
      if (!best || lcs > best.lcs) best = { lcs, rotation: r, back, seq: rb };
    }
  }
  if (!best) return null;
  const rb = best.seq;
  const d = table(rb);
  const matchedA = new Array<boolean>(a.length).fill(false);
  const matchedB = new Array<boolean>(rb.length).fill(false);
  for (let i = a.length, j = rb.length; i > 0 && j > 0;) {
    if (a[i - 1] === rb[j - 1]) { matchedA[i - 1] = true; matchedB[j - 1] = true; i--; j--; }
    else if (d[i - 1][j] >= d[i][j - 1]) i--;
    else j--;
  }
  return { rotation: best.rotation, back: best.back, matchedA, matchedB, tokensB: rb };
}
