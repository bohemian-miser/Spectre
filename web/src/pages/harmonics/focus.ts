/**
 * One supertile of a circuit, picked from its chips: where it sits in the
 * circuit, the visits it expands into one level down, its route table built
 * from its children's (as the Build-up page draws it, `buildup/viewer.ts`)
 * with the routes the circuit takes through it, and the supertile the other
 * circuit's reading pairs it with.
 *
 * A circuit's visits at each level are kept as rows (`readings.ts`), each
 * row with its backtracks cancelled as its reading does; a visit's chip is
 * its index in its row. The supertile picked first is the birth supertile:
 * its children are the circuit's top-level chips.
 */
import { mul, transPt, type Affine, type Pt } from '../../core';
import { circuitPasses, Geometry, routePasses, type Pass } from '../buildup/viewer';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { alignReadings, cancelBacktracksAt, expandVisits, pathOf, token, topVisits, type VisitColumns } from './readings';

/** Rows of more visits than this are not worked out. */
export const MAX_ROW = 3000000;
/** Route tables of more child routes than this show only the routes the circuit takes. */
export const MAX_PASSES = 30000;
/** Items (kept visits and runs of backtracks) sent per supertile. */
export const MAX_ITEMS = 3000;

/** A visit of a circuit: its level and index in that level's row; index -1 is the birth supertile itself. */
export interface Sel {
  readonly level: number;
  readonly i: number;
}

/**
 * A supertile's visits one level down, in order: each visit the reading
 * keeps, and each run of consecutive visits it cancels (back and forth
 * across a seam) as one item.
 */
export type ChildItem =
  | {
      readonly kind: 'visit';
      /** Its index in its row. */
      readonly i: number;
      readonly type: string;
      readonly slot: number;
      /** Its token in the reading. */
      readonly token: string;
    }
  | {
      readonly kind: 'run';
      /** Visits in the run, and the supertile types they pass through. */
      readonly count: number;
      readonly types: readonly string[];
    };

export interface RouteTable {
  readonly level: number;
  readonly type: string;
  /** The supertile's outline, and its children's outlines by type, in their own frames. */
  readonly outline: readonly Pt[];
  readonly kidOutlines: Readonly<Record<string, readonly Pt[]>>;
  /** Its routes as its children's routes (`routePasses`), in its frame; pass i belongs to the route from crossing `route[i]` (the lower of its two), which the circuit takes `uses[i]` times. */
  readonly passes: readonly Pass[];
  readonly route: readonly number[];
  readonly uses: readonly number[];
  /** Routes in its table, and routes the circuit takes through it. */
  readonly routes: number;
  readonly taken: number;
  /** Whether every route is drawn (otherwise only those taken). */
  readonly all: boolean;
}

export interface FocusNode {
  readonly sel: Sel;
  readonly type: string;
  /** Slot path from the birth supertile ('' for the birth supertile). */
  readonly path: string;
  /** Arcs the circuit makes through it. */
  readonly arcs: number;
  /** Its outline in the birth supertile's frame. */
  readonly outline: Float64Array;
  /** Its visits one level down, in order (at most `MAX_ITEMS` items); `childCount` visits in all, `cancelled` of them in runs of backtracks. */
  readonly items: readonly ChildItem[];
  readonly childCount: number;
  readonly cancelled: number;
  readonly routes: RouteTable | null;
  /** The visit the other circuit's reading pairs it with, when asked and paired. */
  readonly partner: Sel | null;
}

interface Row {
  readonly v: VisitColumns;
  readonly keep: Int32Array;
  /** Per visit, its index among the kept ones, or -1. */
  readonly keptAt: Int32Array;
  readonly tokens: readonly string[];
}

/** Each visit kept by `cancelBacktracksAt` paired with one of the other row's by the reading alignment: a rotation (either way round) when the readings are the same, else `alignReadings`. Null when too long to align. */
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

/** Longest common subsequence of two short token lists, as pairs of indices (in order). */
export function commonRun(a: readonly string[], b: readonly string[]): [number, number][] {
  const d = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) d[i][j] = a[i] === b[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
  const out: [number, number][] = [];
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) out.push([i++, j++]);
    else if (d[i + 1][j] >= d[i][j + 1]) i++;
    else j++;
  }
  return out;
}

/** A circuit's rows, worked out downwards as asked for, and its supertiles picked from them. */
export class CircuitFocus {
  private readonly rows = new Map<number, Row>();
  private readonly pairs = new Map<string, { ab: Int32Array; ba: Int32Array } | null>();

  constructor(
    readonly cs: CircuitShapes,
    readonly g: Geometry,
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

  /** Its reading's visits at `level` paired with the other's at `other` (its level less this one's birth plus the other's). */
  pairing(level: number, other: CircuitFocus): { ab: Int32Array; ba: Int32Array } | null {
    const key = `${level} ${other.c.level} ${other.c.type} ${other.c.length}`;
    if (!this.pairs.has(key)) this.pairs.set(key, pairReadings(this.row(level).tokens, other.row(level + other.c.level - this.c.level).tokens));
    return this.pairs.get(key)!;
  }

  /** Where a visit's supertile sits in the birth supertile's frame. */
  private placeOf(sel: Sel): Affine {
    let x: Affine = [1, 0, 0, 0, 1, 0];
    if (sel.i < 0) return x;
    const chain: number[] = [];
    for (let n = sel.level, i = sel.i; n < this.c.level; n++) {
      chain.unshift(i);
      i = this.row(n).v.up[i];
    }
    let parent: string = this.c.type;
    chain.forEach((i, d) => {
      const n = this.c.level - 1 - d;
      const v = this.row(n).v;
      x = mul(x, this.cs.childOf(n + 1, parent, v.slot[i]).xform);
      parent = v.type[i];
    });
    return x;
  }

  /** A visit's supertile: where it is, its visits one level down, and its route table. */
  node(sel: Sel, other: CircuitFocus | null): FocusNode {
    const { cs, c } = this;
    const birth = sel.i < 0;
    const level = birth ? c.level : sel.level;
    const row = birth ? null : this.row(level);
    const type: string = row ? row.v.type[sel.i] : c.type;
    const id = row ? row.v.id[sel.i] : -1;
    const path = row ? pathOf(id, c.level - level) : '';
    const x = this.placeOf(sel);
    const pts = cs.outline(level, type);
    const outline = new Float64Array(2 * pts.length);
    pts.forEach((p, j) => {
      const q = transPt(x, p);
      outline[2 * j] = q.x;
      outline[2 * j + 1] = q.y;
    });
    // the visits at this level through the same supertile, and their visits one level down
    const arcs: number[] = [];
    if (row) for (let i = 0; i < row.v.id.length; i++) if (row.v.id[i] === id) arcs.push(i);
    const items: ChildItem[] = [];
    let childCount = 0;
    let cancelled = 0;
    if (level > 0) {
      const below = this.row(level - 1);
      const mine = new Set(arcs);
      for (let j = 0; j < below.v.type.length; j++) {
        if (!birth && !mine.has(below.v.up[j])) continue;
        childCount++;
        const q = below.keptAt[j];
        if (q < 0) cancelled++;
        if (items.length > MAX_ITEMS) continue;
        const last = items[items.length - 1];
        if (q >= 0) items.push({ kind: 'visit', i: j, type: below.v.type[j], slot: below.v.slot[j], token: below.tokens[q] });
        else if (last?.kind === 'run') items[items.length - 1] = { kind: 'run', count: last.count + 1, types: last.types.includes(below.v.type[j]) ? last.types : [...last.types, below.v.type[j]] };
        else items.push({ kind: 'run', count: 1, types: [below.v.type[j]] });
      }
    }
    const routes = level === 0 ? null : birth ? this.birthRoutes() : this.routes(level, type, arcs.map((i) => row!.v.cross[i]));
    let partner: Sel | null = null;
    if (other) {
      const lo = level + other.c.level - c.level;
      if (birth) partner = { level: other.c.level, i: -1 };
      else if (lo >= 0 && lo < other.c.level) {
        const q = row!.keptAt[sel.i];
        const p = q >= 0 ? this.pairing(level, other) : null;
        const j = p ? p.ab[q] : -1;
        if (j >= 0) partner = { level: lo, i: other.row(lo).keep[j] };
      }
    }
    return { sel: { level, i: sel.i }, type, path, arcs: arcs.length, outline, items: items.slice(0, MAX_ITEMS), childCount, cancelled, routes, partner };
  }

  private kidOutlines(level: number): Record<string, readonly Pt[]> {
    const out: Record<string, readonly Pt[]> = {};
    for (const t of Object.keys(this.cs.levels[level])) out[t] = this.cs.outline(level, t);
    return out;
  }

  /** The circuit's passes through the birth supertile's children: all of them taken once. */
  private birthRoutes(): RouteTable {
    const { c } = this;
    const passes = circuitPasses(this.g, c);
    return { level: c.level, type: c.type, outline: this.cs.outline(c.level, c.type), kidOutlines: this.kidOutlines(c.level - 1), passes, route: passes.map(() => -1), uses: passes.map(() => 1), routes: 0, taken: 0, all: true };
  }

  /** A level-n supertile's route table built from its children's, with how often the circuit takes each route (entered at `entered`). */
  private routes(n: number, type: string, entered: readonly number[]): RouteTable {
    const T = this.cs.levels[n][type];
    const lower = (k: number) => {
      const m = T.mate(k);
      return m < 0 ? k : Math.min(k, m);
    };
    const taken = new Map<number, number>();
    for (const k of entered) taken.set(lower(k), (taken.get(lower(k)) ?? 0) + 1);
    const all: number[] = [];
    let total = 0;
    for (const k of T.crossings()) {
      if (lower(k) !== k) continue;
      all.push(k);
      total += T.route(k).steps.length;
    }
    const drawAll = total <= MAX_PASSES;
    const passes: Pass[] = [];
    const uses: number[] = [];
    const route: number[] = [];
    for (const k of drawAll ? all : [...taken.keys()].sort((p, q) => p - q)) {
      if (!drawAll && passes.length >= MAX_PASSES) break;
      for (const p of routePasses(this.g, n, type, k)) {
        passes.push(p);
        uses.push(taken.get(k) ?? 0);
        route.push(k);
      }
    }
    return { level: n, type, outline: this.cs.outline(n, type), kidOutlines: this.kidOutlines(n - 1), passes, route, uses, routes: all.length, taken: taken.size, all: drawAll };
  }

  /** The circuit as a closed line in the birth supertile's frame, each run of tiles within `share` of its radius of gyration drawn at its mean (`coarse`). */
  drawing(share: number): Float64Array {
    const { pts } = this.cs.coarse(this.c, share);
    const out = new Float64Array(2 * pts.length + 2);
    pts.forEach((p, j) => {
      out[2 * j] = p.x;
      out[2 * j + 1] = p.y;
    });
    if (pts.length) {
      out[2 * pts.length] = pts[0].x;
      out[2 * pts.length + 1] = pts[0].y;
    }
    return out;
  }
}
