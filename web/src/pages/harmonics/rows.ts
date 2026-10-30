/**
 * A chain's members read level by level as rows of visits, from the birth
 * supertile down to a level, and which visits one visit expands into.
 *
 * A visit at level n (one arc through a level-n supertile) expands into one
 * contiguous run of visits at level n − 1: the arc's passes through the
 * supertile's children, in order (`readings.ts`). A strand that leaves a
 * supertile and comes back makes two visits, each with its own run. So a
 * row keeps, per visit, where its run starts in the row below (`start`),
 * and the runs of a row's visits, one after another, are the row below.
 *
 * The rows are raw. What a reading folds away is a setting (`Fold`):
 *
 * - `fixpoint`: every backtrack A B A cancelled until none is left
 *   (`cancelBacktracksAt`), the readings' own rule. It folds weaving across
 *   a seam and also detours, excursions that leave and come back the same
 *   way (A B C B A).
 * - `weave`: only weaving, one pass: each maximal stretch alternating
 *   between the same two supertiles (A B A B …, at least three visits) keeps
 *   its first visit, and its last when it ends on the other supertile.
 * - `none`: nothing.
 *
 * Under `fixpoint` the visits it folds are shown as weaving (those `weave`
 * folds too) and detours (the rest), each run as one item. The members'
 * kept visits are paired by their readings (`pairReadings`) under the same
 * setting.
 */
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { alignReadings, cancelBacktracksAt, expandVisits, token, topVisits, type VisitColumns } from './readings';

/** Rows of more visits than this are not worked out. */
export const MAX_ROW = 3000000;
/** Items (kept visits and runs) sent per row. */
export const ROW_ITEMS = 400;

export type Fold = 'none' | 'weave' | 'fixpoint';
export const FOLDS: readonly { id: Fold; name: string }[] = [
  { id: 'none', name: 'nothing' },
  { id: 'weave', name: 'weaving only' },
  { id: 'fixpoint', name: 'weaving and detours' },
];

/** The visits kept by folding only weaving: each maximal stretch alternating between two supertiles, of three visits or more, keeps its first visit and, when it ends on the other one, its last. */
export function weaveKeep(ids: ArrayLike<number>): Int32Array {
  const n = ids.length;
  const kept = new Uint8Array(n).fill(1);
  let i = 0;
  while (i < n) {
    let e = i;
    if (i + 1 < n && ids[i + 1] !== ids[i]) {
      e = i + 1;
      while (e + 1 < n && ids[e + 1] === ids[e - 1]) e++;
    }
    const len = e - i + 1;
    if (len >= 3) {
      for (let x = i + 1; x <= e; x++) kept[x] = 0;
      if (len % 2 === 0) kept[e] = 1;
      i = e + 1;
    } else i++;
  }
  const out: number[] = [];
  for (let x = 0; x < n; x++) if (kept[x]) out.push(x);
  return Int32Array.from(out);
}

interface Folded {
  readonly keep: Int32Array;
  /** Per visit, its index among the kept ones, or -1. */
  readonly keptAt: Int32Array;
  readonly tokens: readonly string[];
}

interface Row {
  readonly v: VisitColumns;
  readonly folds: Partial<Record<Fold, Folded>>;
}

/**
 * Each visit kept by the reading paired with one of the other row's by the
 * reading alignment: a rotation (either way round) when the readings are the
 * same, else `alignReadings`. Null when too long to align. A reading that
 * repeats itself is the same at several rotations; given `gaps`, the visits
 * each reading folds after each kept one, the rotation is the one whose
 * gaps go up and down together most (correlation of log(1 + gap)).
 */
export function pairReadings(a: readonly string[], b: readonly string[], gaps?: readonly [ArrayLike<number>, ArrayLike<number>]): { ab: Int32Array; ba: Int32Array } | null {
  const ab = new Int32Array(a.length).fill(-1);
  const ba = new Int32Array(b.length).fill(-1);
  const n = a.length;
  if (n === b.length && n > 0) {
    let best: { back: boolean; r: number; fit: number } | null = null;
    const la = gaps ? Array.from(gaps[0], (g) => Math.log1p(g)) : null;
    const lb = gaps ? Array.from(gaps[1], (g) => Math.log1p(g)) : null;
    const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
    const ma = la ? mean(la) : 0, mb = lb ? mean(lb) : 0;
    for (const back of [false, true]) {
      const at = (q: number) => (back ? n - 1 - q : q);
      for (let r = 0; r < n; r++) {
        if (b[at(r)] !== a[0]) continue;
        let ok = true;
        for (let q = 1; q < n && ok; q++) if (a[q] !== b[at((r + q) % n)]) ok = false;
        if (!ok) continue;
        if (!la || !lb) {
          best = { back, r, fit: 0 };
          break;
        }
        // the gap after A's q-th kept visit lies, read backwards, after B's visit one further on
        let fit = 0;
        for (let q = 0; q < n; q++) fit += (la[q] - ma) * (lb[back ? at((r + q + 1) % n) : at((r + q) % n)] - mb);
        if (!best || fit > best.fit + 1e-9) best = { back, r, fit };
      }
      if (best && (!la || !lb)) break;
    }
    if (best) {
      const { back, r } = best;
      const at = (q: number) => (back ? n - 1 - q : q);
      for (let q = 0; q < n; q++) {
        ab[q] = at((r + q) % n);
        ba[ab[q]] = q;
      }
      return { ab, ba };
    }
  }
  const al = alignReadings(a, b);
  if (!al) return null;
  const m = b.length;
  const ia: number[] = [];
  const ib: number[] = [];
  al.matchedA.forEach((x, q) => x && ia.push(q));
  al.matchedB.forEach((x, q) => {
    if (!x) return;
    const i = (al.rotation + q) % m;
    ib.push(al.back ? m - 1 - i : i);
  });
  ia.forEach((q, t) => {
    ab[q] = ib[t];
    ba[ib[t]] = q;
  });
  return { ab, ba };
}

/** A circuit's rows, worked out downwards as asked for. */
export class CircuitRows {
  private readonly rows = new Map<number, Row>();
  private readonly pairs = new Map<string, { ab: Int32Array; ba: Int32Array } | null>();

  constructor(
    readonly cs: CircuitShapes,
    readonly c: BornCircuit,
  ) {}

  /** The visits at a level below the birth. */
  visits(level: number): VisitColumns {
    return this.row(level).v;
  }

  private row(level: number): Row {
    const hit = this.rows.get(level);
    if (hit) return hit;
    let v: VisitColumns;
    if (level === this.c.level - 1) v = topVisits(this.cs, this.c);
    else {
      const above = this.row(level + 1).v;
      let n = 0;
      for (let i = 0; i < above.type.length; i++) n += this.cs.levels[above.level][above.type[i]].route(above.cross[i]).steps.length;
      if (n > MAX_ROW) throw new Error(`level ${level} has ${n.toLocaleString('en-US')} visits, too many to list`);
      v = expandVisits(this.cs, above);
    }
    const row = { v, folds: {} };
    this.rows.set(level, row);
    return row;
  }

  /** A level's reading under a fold: the visits it keeps and their tokens. */
  fold(level: number, fold: Fold): Folded {
    const r = this.row(level);
    const hit = r.folds[fold];
    if (hit) return hit;
    const v = r.v;
    const keep = fold === 'fixpoint' ? cancelBacktracksAt(v.id, v.tiles).keep : fold === 'weave' ? weaveKeep(v.id) : Int32Array.from(v.id, (_, i) => i);
    const keptAt = new Int32Array(v.type.length).fill(-1);
    keep.forEach((i, q) => { keptAt[i] = q; });
    const tokens = Array.from(keep, (i) => token({ id: '', type: v.type[i], slot: v.slot[i], parent: v.parent[i], tiles: 0 }, level, this.c.level));
    const out = { keep, keptAt, tokens };
    (r.folds as Record<Fold, Folded>)[fold] = out;
    return out;
  }

  /** Its reading's visits at `level` paired with the other's at the level as far below the other's birth, under a fold. */
  pairing(level: number, other: CircuitRows, fold: Fold = 'fixpoint'): { ab: Int32Array; ba: Int32Array } | null {
    const key = `${level} ${fold} ${other.c.level} ${other.c.type} ${other.c.length}`;
    if (!this.pairs.has(key)) {
      const lo = level + other.c.level - this.c.level;
      this.pairs.set(key, pairReadings(this.fold(level, fold).tokens, other.fold(lo, fold).tokens, [this.gaps(level, fold), other.gaps(lo, fold)]));
    }
    return this.pairs.get(key)!;
  }

  /** Per kept visit, the visits folded after it before the next kept one (the row read as a loop). */
  gaps(level: number, fold: Fold): Int32Array {
    const keep = this.fold(level, fold).keep;
    const n = this.row(level).v.type.length;
    return Int32Array.from(keep, (i, q) => (q + 1 < keep.length ? keep[q + 1] : keep[0] + n) - i - 1);
  }

  /** Where each visit's run starts in the row below, and the row's length at the end. */
  starts(level: number): Int32Array {
    const below = this.row(level - 1).v.up;
    const n = this.row(level).v.type.length;
    const out = new Int32Array(n + 1);
    let j = 0;
    for (let i = 0; i < n; i++) {
      out[i] = j;
      while (j < below.length && below[j] === i) j++;
    }
    out[n] = j;
    return out;
  }
}

/** A supertile visited, by type and slot. */
export interface Stop {
  readonly type: string;
  readonly slot: number;
}

/**
 * A run of visits the reading folds: `weave`, back and forth across a seam,
 * mostly between two supertiles `a` and `b`; or `detour`, an excursion that
 * leaves and comes back the same way. `after` is the kept visit before it
 * (its index among the kept; for a run at the start of the row, the last,
 * the row being a loop) and `nth` its place among the runs of its kind
 * after that visit.
 * `head` and `tail` are its first and last visits (all of them when short),
 * `odd` the visits that are neither `a` nor `b` (where in the run, and
 * which), `oddCount` of them in all.
 */
export interface Run {
  readonly kind: 'run';
  readonly fold: 'weave' | 'detour';
  readonly from: number;
  readonly to: number;
  readonly types: readonly string[];
  readonly after: number;
  readonly nth: number;
  readonly a: Stop;
  readonly b: Stop | null;
  readonly head: readonly Stop[];
  readonly tail: readonly Stop[];
  readonly odd: readonly (Stop & { readonly at: number })[];
  readonly oddCount: number;
}

/** A kept visit; under `weave`, `detour` marks one the fixpoint would fold as part of a detour. */
export type RowItem = { readonly kind: 'visit'; readonly i: number; readonly q: number; readonly type: string; readonly slot: number; readonly detour: boolean } | Run;

/** Visits of a run shown at each end before it is cut short. */
export const RUN_ENDS = 24;
/** Odd visits of a run sent. */
const RUN_ODD = 40;

/** A run's description from its visits in a row. */
function runOf(v: VisitColumns, fold: 'weave' | 'detour', from: number, to: number, after: number, nth: number): Run {
  const count = new Map<number, number>();
  for (let i = from; i < to; i++) count.set(v.id[i], (count.get(v.id[i]) ?? 0) + 1);
  const [ia, ib] = [...count.entries()].sort((x, y) => y[1] - x[1]).map(([id]) => id);
  const stopAt = (i: number): Stop => ({ type: v.type[i], slot: v.slot[i] });
  const first = (id: number | undefined) => (id === undefined ? -1 : v.id.indexOf(id, from));
  const types: string[] = [];
  const odd: (Stop & { at: number })[] = [];
  let oddCount = 0;
  for (let i = from; i < to; i++) {
    if (!types.includes(v.type[i])) types.push(v.type[i]);
    if (v.id[i] !== ia && v.id[i] !== ib) {
      oddCount++;
      if (odd.length < RUN_ODD) odd.push({ ...stopAt(i), at: i - from });
    }
  }
  const n = to - from;
  const ends = (a: number, b: number) => Array.from({ length: Math.max(0, b - a) }, (_, q) => stopAt(a + q));
  return {
    kind: 'run',
    fold,
    from,
    to,
    types,
    after,
    nth,
    a: stopAt(first(ia)),
    b: ib === undefined ? null : stopAt(first(ib)),
    head: ends(from, from + Math.min(n, 2 * RUN_ENDS)),
    tail: n > 2 * RUN_ENDS ? ends(to - RUN_ENDS, to) : [],
    odd,
    oddCount,
  };
}

export interface RowLevel {
  readonly level: number;
  /** Raw visits, and the first `ROW_ITEMS` items; `more` items not sent. */
  readonly raw: number;
  readonly items: readonly RowItem[];
  readonly more: number;
  /** The raw index of each kept visit. */
  readonly keep: Int32Array;
  /** Visits the fixpoint folds and weaving alone does not (detours), and the runs they make. */
  readonly detours: number;
  readonly detourRuns: number;
  /** Where each visit's run starts in the next row, the next row's length last; null for the last row. */
  readonly start: Int32Array | null;
}

export interface MemberRows {
  /** From the level below the birth down to the level drawn. */
  readonly levels: readonly RowLevel[];
  /** Per visit of the last row, the index of its supertile among those drawn (first visited first), or -1 past `cap`. */
  readonly tile: Int32Array;
}

export interface ChainRows {
  /** The level the lowest member is read down to; member j to k plus its birth level less the lowest's. */
  readonly k: number;
  readonly fold: Fold;
  readonly members: readonly MemberRows[];
  /** pairs[j][d]: member j's kept visits at depth d (row d) paired with member j + 1's, both ways; null where too long to align. */
  readonly pairs: readonly (readonly ({ ab: Int32Array; ba: Int32Array } | null)[])[];
}

/** A row's items under a fold, the detour visits and runs counted. */
function itemsOf(m: CircuitRows, level: number, fold: Fold): { items: RowItem[]; more: number; keep: Int32Array; detours: number; detourRuns: number } {
  const v = m.visits(level);
  const n = v.type.length;
  const f = m.fold(level, fold);
  const fix = m.fold(level, 'fixpoint').keptAt;
  const weave = m.fold(level, 'weave').keptAt;
  // a visit folded by the fixpoint but kept by weaving alone is part of a detour
  const isDetour = (i: number) => fix[i] < 0 && weave[i] >= 0;
  let detours = 0, detourRuns = 0;
  for (let i = 0; i < n; i++) if (isDetour(i)) { detours++; if (i === 0 || !isDetour(i - 1)) detourRuns++; }
  const items: RowItem[] = [];
  let count = 0;
  const lastKept = f.keep.length - 1;
  let after = -1;
  // runs of each kind since the last kept visit
  const nth = { weave: 0, detour: 0 };
  const leading: Run[] = [];
  for (let i = 0; i < n; ) {
    const q = f.keptAt[i];
    if (q >= 0) {
      if (items.length < ROW_ITEMS) items.push({ kind: 'visit', i, q, type: v.type[i], slot: v.slot[i], detour: fold === 'weave' && isDetour(i) });
      count++;
      after = q;
      nth.weave = nth.detour = 0;
      i++;
      continue;
    }
    // a run: folded visits of one kind, weaving (folded by weaving alone too) or a detour
    const kind = weave[i] < 0 ? 'weave' : 'detour';
    let j = i;
    while (j < n && f.keptAt[j] < 0 && (weave[j] < 0 ? 'weave' : 'detour') === kind) j++;
    const run = runOf(v, kind, i, j, after < 0 ? lastKept : after, nth[kind]++);
    if (after < 0) leading.push(run);
    if (items.length < ROW_ITEMS) items.push(run);
    count++;
    i = j;
  }
  // the row is a loop: runs before the first kept visit follow those after the last one
  if (leading.length && after >= 0) {
    for (let q = 0; q < items.length; q++) {
      const it = items[q];
      if (it.kind === 'run' && leading.includes(it)) items[q] = { ...it, nth: it.nth + nth[it.fold] };
    }
  }
  return { items, more: count - items.length, keep: f.keep, detours, detourRuns };
}

/**
 * The members' rows from the level below each birth down to level k for the
 * lowest member (and as far below each other member's birth), under a fold,
 * with each neighbouring pair's readings paired row by row. `cap`
 * supertiles of the last row are numbered, as `pairView.ts` draws them.
 */
export function chainRows(members: readonly CircuitRows[], k: number, cap: number, fold: Fold = 'fixpoint'): ChainRows {
  const base = members[0].c.level;
  const depth = base - k;
  const out = members.map((m) => {
    const levels: RowLevel[] = [];
    for (let d = 0; d < depth; d++) {
      const level = m.c.level - 1 - d;
      levels.push({ level, raw: m.visits(level).type.length, ...itemsOf(m, level, fold), start: d + 1 < depth ? m.starts(level) : null });
    }
    const last = m.visits(m.c.level - depth).id;
    const seen = new Map<number, number>();
    const tile = Int32Array.from(last, (id) => {
      let t = seen.get(id);
      if (t === undefined) seen.set(id, (t = seen.size));
      return t < cap ? t : -1;
    });
    return { levels, tile };
  });
  const pairs = members.slice(1).map((m, j) => Array.from({ length: depth }, (_, d) => members[j].pairing(members[j].c.level - 1 - d, m, fold)));
  return { k, fold, members: out, pairs };
}

/** Raw ranges [from, to) of a row. */
export type Ranges = readonly (readonly [number, number])[];

/** The visits a row's ranges expand into in the next row: each range's runs, joined. */
export function below(start: Int32Array, ranges: Ranges): Ranges {
  return ranges.map(([a, b]) => [start[a], start[b]] as const).filter(([a, b]) => b > a);
}

/** The visits of the row above whose runs hold a row's visits. */
export function above(start: Int32Array, ranges: Ranges): Ranges {
  const parent = (x: number) => {
    let lo = 0, hi = start.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (start[mid] <= x) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const out: [number, number][] = [];
  for (const [a, b] of ranges) {
    const p = parent(a), q = parent(b - 1) + 1;
    const last = out[out.length - 1];
    if (last && last[1] >= p) last[1] = Math.max(last[1], q);
    else out.push([p, q]);
  }
  return out;
}

export const holds = (ranges: Ranges | undefined, a: number, b = a + 1): boolean => !!ranges?.some(([x, y]) => a < y && x < b);

/** Where something hovered sits: a visit (or run) of member j in row d, or a supertile of the drawing by its slot path. */
export type Hovered = { readonly kind: 'visit'; readonly j: number; readonly d: number; readonly from: number; readonly to: number; readonly q: number | null } | { readonly kind: 'tile'; readonly path: string };

/**
 * What a hover lights up, per member: ranges per row, and supertiles of the
 * drawing. A visit lights its run in every row below and, through the
 * readings' pairing, the paired visit and its runs in the other members; a
 * supertile lights the visits of the last row inside the supertile with that
 * slot path in every member, and the visits above them.
 */
export function lit(rows: ChainRows, hovered: Hovered, tilePaths: readonly (readonly string[])[]): { ranges: Ranges[][]; tiles: Set<number>[] } {
  const n = rows.members.length;
  const depth = rows.members[0].levels.length;
  const ranges: Ranges[][] = rows.members.map(() => []);
  const tiles = rows.members.map(() => new Set<number>());
  const down = (j: number, d: number, seed: Ranges) => {
    let r = seed;
    for (let e = d; e < depth; e++) {
      ranges[j][e] = r;
      const s = rows.members[j].levels[e].start;
      if (!s) break;
      r = below(s, r);
    }
  };
  if (hovered.kind === 'visit') {
    down(hovered.j, hovered.d, [[hovered.from, hovered.to]]);
    if (hovered.q !== null) {
      for (const dir of [1, -1]) {
        let q: number = hovered.q;
        for (let m = hovered.j + dir; m >= 0 && m < n && q >= 0; m += dir) {
          const p = rows.pairs[dir > 0 ? m - 1 : m][hovered.d];
          q = p ? (dir > 0 ? p.ab[q] : p.ba[q]) : -1;
          if (q >= 0) {
            const i = rows.members[m].levels[hovered.d].keep[q];
            down(m, hovered.d, [[i, i + 1]]);
          }
        }
      }
    }
  } else {
    rows.members.forEach((m, j) => {
      const t = tilePaths[j].indexOf(hovered.path);
      if (t < 0) return;
      const r: [number, number][] = [];
      m.tile.forEach((x, i) => {
        if (x !== t) return;
        const last = r[r.length - 1];
        if (last && last[1] === i) last[1] = i + 1;
        else r.push([i, i + 1]);
      });
      let cur: Ranges = r;
      for (let e = depth - 1; e >= 0; e--) {
        ranges[j][e] = cur;
        if (e > 0) cur = above(m.levels[e - 1].start!, cur);
      }
    });
  }
  rows.members.forEach((m, j) => {
    for (const [a, b] of ranges[j][depth - 1] ?? []) for (let i = a; i < b; i++) if (m.tile[i] >= 0) tiles[j].add(m.tile[i]);
  });
  return { ranges, tiles };
}

/** Where a run sits: member, row, the kept visit before it, and its kind and place among the runs of that kind there. */
export interface RunAt {
  readonly j: number;
  readonly d: number;
  readonly after: number;
  readonly fold: 'weave' | 'detour';
  readonly nth: number;
}

const runsAfter = (rows: ChainRows, j: number, d: number, after: number, fold: 'weave' | 'detour'): Run[] =>
  rows.members[j].levels[d].items.filter((it): it is Run => it.kind === 'run' && it.after === after && it.fold === fold).sort((x, y) => x.nth - y.nth);

/**
 * The runs matched with a run in every member: the run in the same place
 * after the kept visit the readings pair with the one before it, neighbour
 * by neighbour; null in a member with no such run (or past an unpaired
 * visit).
 */
export function matchedRuns(rows: ChainRows, at: RunAt): (Run | null)[] {
  const out: (Run | null)[] = rows.members.map(() => null);
  out[at.j] = runsAfter(rows, at.j, at.d, at.after, at.fold).find((r) => r.nth === at.nth) ?? null;
  for (const dir of [1, -1]) {
    let cur = out[at.j];
    for (let m = at.j + dir; m >= 0 && m < rows.members.length && cur; m += dir) {
      const p = rows.pairs[dir > 0 ? m - 1 : m][at.d];
      const map = p ? (dir > 0 ? p.ab : p.ba) : null;
      const n = rows.members[m - dir].levels[at.d].keep.length, n2 = rows.members[m].levels[at.d].keep.length;
      const x = map ? map[cur.after] : -1, y = map ? map[(cur.after + 1) % n] : -1;
      let next: Run | null = null;
      if (x >= 0 && y >= 0) {
        // the same two kept visits on either side: in order, or in reverse when the readings pair the other way round
        const here = runsAfter(rows, m - dir, at.d, cur.after, at.fold).length;
        if (y === (x + 1) % n2) next = runsAfter(rows, m, at.d, x, at.fold).find((r) => r.nth === cur!.nth) ?? null;
        else if (x === (y + 1) % n2) {
          const there = runsAfter(rows, m, at.d, y, at.fold);
          next = there.length === here ? there[there.length - 1 - cur.nth] ?? null : null;
        }
      }
      out[m] = next;
      cur = next;
    }
  }
  return out;
}

/** One line of the runs summary: a run matched across the members, its lengths, and the ratios between neighbours. */
export interface RunLine {
  readonly d: number;
  readonly runs: readonly (Run | null)[];
  readonly lengths: readonly (number | null)[];
  readonly ratios: readonly (number | null)[];
  /** Whether the ratios between neighbouring members stay within a sixth of each other. */
  readonly steady: boolean;
}

/** Every run of every row matched across the members, each once, rows in order. */
export function runLines(rows: ChainRows): RunLine[] {
  const out: RunLine[] = [];
  const seen = rows.members.map(() => new Set<string>());
  rows.members.forEach((m, j) =>
    m.levels.forEach((lv, d) => {
      for (const it of lv.items) {
        if (it.kind !== 'run' || seen[j].has(`${d} ${it.after} ${it.fold} ${it.nth}`)) continue;
        const runs = matchedRuns(rows, { j, d, after: it.after, fold: it.fold, nth: it.nth });
        runs.forEach((r, q) => r && seen[q].add(`${d} ${r.after} ${r.fold} ${r.nth}`));
        const lengths = runs.map((r) => (r ? r.to - r.from : null));
        const ratios = lengths.slice(1).map((l, q) => (l !== null && lengths[q] !== null ? l / lengths[q]! : null));
        const known = ratios.filter((x): x is number => x !== null);
        const steady = known.length < 2 || Math.max(...known) / Math.min(...known) <= 7 / 6;
        out.push({ d, runs, lengths, ratios, steady });
      }
    }),
  );
  return out.sort((x, y) => x.d - y.d);
}
