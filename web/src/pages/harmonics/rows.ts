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
 * The rows are raw, backtracks kept; each row also keeps which visits its
 * reading keeps (backtracks cancelled as in `cancelBacktracksAt`) and how
 * the members' readings pair those visits up (`pairReadings`).
 */
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { alignReadings, cancelBacktracksAt, expandVisits, token, topVisits, type VisitColumns } from './readings';

/** Rows of more visits than this are not worked out. */
export const MAX_ROW = 3000000;
/** Items (kept visits and runs of backtracks) sent per row. */
export const ROW_ITEMS = 400;

interface Row {
  readonly v: VisitColumns;
  readonly keep: Int32Array;
  /** Per visit, its index among the kept ones, or -1. */
  readonly keptAt: Int32Array;
  readonly tokens: readonly string[];
}

/** Each visit kept by the reading paired with one of the other row's by the reading alignment: a rotation (either way round) when the readings are the same, else `alignReadings`. Null when too long to align. */
export function pairReadings(a: readonly string[], b: readonly string[]): { ab: Int32Array; ba: Int32Array } | null {
  const ab = new Int32Array(a.length).fill(-1);
  const ba = new Int32Array(b.length).fill(-1);
  const n = a.length;
  if (n === b.length && n > 0) {
    for (const back of [false, true]) {
      const at = (q: number) => (back ? n - 1 - q : q);
      for (let r = 0; r < n; r++) {
        if (b[at(r)] !== a[0]) continue;
        let ok = true;
        for (let q = 1; q < n && ok; q++) if (a[q] !== b[at((r + q) % n)]) ok = false;
        if (!ok) continue;
        for (let q = 0; q < n; q++) {
          ab[q] = at((r + q) % n);
          ba[ab[q]] = q;
        }
        return { ab, ba };
      }
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

  /** The row at a level below the birth. */
  row(level: number): Row {
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
    const { keep } = cancelBacktracksAt(v.id, v.tiles);
    const keptAt = new Int32Array(v.type.length).fill(-1);
    keep.forEach((i, q) => { keptAt[i] = q; });
    const tokens = Array.from(keep, (i) => token({ id: '', type: v.type[i], slot: v.slot[i], parent: v.parent[i], tiles: 0 }, level, this.c.level));
    const row = { v, keep, keptAt, tokens };
    this.rows.set(level, row);
    return row;
  }

  /** Its reading's visits at `level` paired with the other's at the level as far below the other's birth. */
  pairing(level: number, other: CircuitRows): { ab: Int32Array; ba: Int32Array } | null {
    const key = `${level} ${other.c.level} ${other.c.type} ${other.c.length}`;
    if (!this.pairs.has(key)) this.pairs.set(key, pairReadings(this.row(level).tokens, other.row(level + other.c.level - this.c.level).tokens));
    return this.pairs.get(key)!;
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

/** One item of a row as shown: a visit the reading keeps, or a run of consecutive visits it cancels. */
export type RowItem =
  | { readonly kind: 'visit'; readonly i: number; readonly q: number; readonly type: string; readonly slot: number }
  | { readonly kind: 'run'; readonly from: number; readonly to: number; readonly types: readonly string[] };

export interface RowLevel {
  readonly level: number;
  /** Raw visits, and the first `ROW_ITEMS` items; `more` items not sent. */
  readonly raw: number;
  readonly items: readonly RowItem[];
  readonly more: number;
  /** The raw index of each kept visit. */
  readonly keep: Int32Array;
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
  readonly members: readonly MemberRows[];
  /** pairs[j][d]: member j's kept visits at depth d (row d) paired with member j + 1's, both ways; null where too long to align. */
  readonly pairs: readonly (readonly ({ ab: Int32Array; ba: Int32Array } | null)[])[];
}

function itemsOf(r: Row): { items: RowItem[]; more: number } {
  const items: RowItem[] = [];
  let count = 0;
  let inRun = false;
  const n = r.v.type.length;
  for (let i = 0; i < n; i++) {
    const q = r.keptAt[i];
    if (q < 0 && inRun) {
      const last = items[items.length - 1];
      if (last?.kind === 'run' && last.to === i) items[items.length - 1] = { ...last, to: i + 1, types: last.types.includes(r.v.type[i]) ? last.types : [...last.types, r.v.type[i]] };
      continue;
    }
    inRun = q < 0;
    count++;
    if (items.length >= ROW_ITEMS) continue;
    items.push(q >= 0 ? { kind: 'visit', i, q, type: r.v.type[i], slot: r.v.slot[i] } : { kind: 'run', from: i, to: i + 1, types: [r.v.type[i]] });
  }
  return { items, more: count - items.length };
}

/**
 * The members' rows from the level below each birth down to level k for the
 * lowest member (and as far below each other member's birth), with each
 * neighbouring pair's readings paired row by row. `cap` supertiles of the
 * last row are numbered, as `pairView.ts` draws them.
 */
export function chainRows(members: readonly CircuitRows[], k: number, cap: number): ChainRows {
  const base = members[0].c.level;
  const depth = base - k;
  const out = members.map((m) => {
    const levels: RowLevel[] = [];
    for (let d = 0; d < depth; d++) {
      const level = m.c.level - 1 - d;
      const r = m.row(level);
      levels.push({ level, raw: r.v.type.length, ...itemsOf(r), keep: r.keep, start: d + 1 < depth ? m.starts(level) : null });
    }
    const last = m.row(m.c.level - depth).v.id;
    const seen = new Map<number, number>();
    const tile = Int32Array.from(last, (id) => {
      let t = seen.get(id);
      if (t === undefined) seen.set(id, (t = seen.size));
      return t < cap ? t : -1;
    });
    return { levels, tile };
  });
  const pairs = members.slice(1).map((m, j) => Array.from({ length: depth }, (_, d) => members[j].pairing(members[j].c.level - 1 - d, m)));
  return { k, members: out, pairs };
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
