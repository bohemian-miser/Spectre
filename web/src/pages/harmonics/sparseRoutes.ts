/**
 * Routes through supertiles above the levels the full tables hold
 * (`shapes/circuitShapes.ts`), worked out one at a time when asked for.
 *
 * A crossing of a level-n supertile is addressed by the child crossing it
 * is, `childAddress * 8 + slot`, down to the base level, the highest full
 * table kept, where the address is the table's place. At the base and below
 * the address is the place; above it, it names the crossing a full table
 * would number by the order it met it (`address` turns one into the other).
 *
 * The route entering a crossing is followed through the children as the
 * full build follows it: through the child entered to the place it leaves
 * by, across the seam to the neighbouring child, until it reaches the
 * outline. A seam is crossed from the edge lengths alone: the crossing's edge
 * and position along it (`locate`), then the crossing at the reversed
 * position on the glued edge (`rowAt`), each found by descending to the
 * base. A route found is kept from both its ends, so no route is followed
 * twice, and nothing is kept of the routes never asked for.
 */
import { childType, edgeParts, gluedPairs, leafOrder, type HexType } from '../../core';
import type { CircuitShapes } from '../shapes/circuitShapes';

export const TYPES = leafOrder('hex') as readonly HexType[];
export const typeIndex = new Map<string, number>(TYPES.map((t, i) => [t, i]));

/** A closed walk or an arc: the child crossings it enters at its level, in order, and its tiles. */
export interface Walked {
  readonly level: number;
  readonly type: string;
  readonly length: number;
  readonly steps: readonly number[];
}

/** How a walk through a supertile's children ended: back where it started, at the outline (by `exit`), or at a tile it cannot leave. */
export interface Walk {
  readonly end: 'closed' | 'out' | 'ends';
  readonly exit: number;
  readonly length: number;
}

/** The work done so far. */
export interface Work {
  /** Routes asked for above the base. */
  readonly calls: number;
  /** Routes kept, each end counted. */
  readonly routes: number;
  /** Child crossings kept in the routes. */
  readonly steps: number;
}

export class SparseRoutes {
  /** Child type index per type and slot, -1 for an empty slot. */
  private readonly kids: Int8Array[];
  /**
   * Per type, per child edge (slot * 6 + edge): on the outline, edge * 8 +
   * part (its place in `edgeParts`); glued, -2 - the other child edge; -1
   * for an empty slot.
   */
  private readonly side: Int32Array[];
  /** Per level above the base: route index by address * 16 + type. */
  private readonly memo: RouteIndex[] = [];
  /** Per route kept: its mate, tiles, whether its steps run from this end, and where they sit in `pool`. */
  private mates = new Float64Array(1024);
  private lens = new Float64Array(1024);
  private forward = new Uint8Array(1024);
  private from = new Float64Array(1024);
  private count = new Int32Array(1024);
  private kept = 0;
  private pool = new Float64Array(1 << 16);
  private stepCount = 0;
  private callCount = 0;
  /** Per level: row lengths by type * 6 + edge, and where each part of the edge starts along it. */
  private readonly rowLens: Float64Array[] = [];
  private readonly partStart: number[][][] = [];
  /** Per level up to the base, per type: index * 8 + edge for each place on the outline, else -1. */
  private readonly located: (Int32Array | undefined)[][] = [];

  /** Called every so many routes with the work done. */
  onWork: ((w: Work) => void) | null = null;

  constructor(
    readonly cs: CircuitShapes,
    readonly base = cs.maxLevel,
  ) {
    if (base > cs.maxLevel) throw new Error(`the tables stop at level ${cs.maxLevel}, below the base ${base}`);
    this.kids = TYPES.map((t) => Int8Array.from({ length: 8 }, (_, s) => {
      const c = childType(t, s);
      return c ? typeIndex.get(c)! : -1;
    }));
    this.side = TYPES.map((t, ti) => {
      const out = new Int32Array(48).fill(-1);
      for (let j = 0; j < 6; j++) edgeParts(t, j).forEach((p, q) => { out[p.s * 6 + p.e] = j * 8 + q; });
      for (const [a, b] of gluedPairs(t)) {
        out[a.s * 6 + a.e] = -2 - (b.s * 6 + b.e);
        out[b.s * 6 + b.e] = -2 - (a.s * 6 + a.e);
      }
      for (let s = 0; s < 8; s++) {
        for (let e = 0; e < 6; e++) if ((this.kids[ti][s] >= 0) !== (out[s * 6 + e] !== -1)) throw new Error(`${t}: child edge ${s}.${e} is neither glued nor on the outline`);
      }
      return out;
    });
  }

  /** The child type index at a slot of a type. */
  kid(ti: number, slot: number): number {
    return this.kids[ti][slot];
  }

  get work(): Work {
    return { calls: this.callCount, routes: this.kept, steps: this.stepCount };
  }

  /** Crossings on edge j of a level-n supertile of type ti. */
  rowLen(n: number, ti: number, j: number): number {
    return this.lensAt(n)[ti * 6 + j];
  }

  private lensAt(n: number): Float64Array {
    let out = this.rowLens[n];
    if (out) return out;
    out = new Float64Array(54);
    const starts: number[][] = [];
    if (n <= this.base) {
      TYPES.forEach((t, ti) => this.cs.border(n, t).forEach((row, j) => { out![ti * 6 + j] = row.length; }));
    } else {
      const below = this.lensAt(n - 1);
      TYPES.forEach((t, ti) => {
        for (let j = 0; j < 6; j++) {
          const at: number[] = [];
          let sum = 0;
          for (const p of edgeParts(t, j)) {
            at.push(sum);
            sum += below[this.kids[ti][p.s] * 6 + p.e];
          }
          starts[ti * 6 + j] = at;
          out![ti * 6 + j] = sum;
          if (!Number.isSafeInteger(sum)) throw new Error(`level ${n} has more crossings on an edge than are counted exactly`);
        }
      });
    }
    this.rowLens[n] = out;
    this.partStart[n] = starts;
    return out;
  }

  /** Where a crossing sits on a level-n supertile's outline: index * 8 + edge, or -1 for a crossing of glued children. */
  locate(n: number, ti: number, a: number): number {
    if (n <= this.base) {
      const byType = (this.located[n] ??= []);
      let at = byType[ti];
      if (!at) {
        at = new Int32Array(this.cs.levels[n][TYPES[ti]].size).fill(-1);
        const rows = this.cs.border(n, TYPES[ti]);
        for (let j = 0; j < 6; j++) for (let i = 0; i < rows[j].length; i++) at[rows[j][i]] = i * 8 + j;
        byType[ti] = at;
      }
      return at[a];
    }
    const s = a % 8, c = (a - s) / 8, ct = this.kids[ti][s];
    const l = this.locate(n - 1, ct, c);
    if (l < 0) throw new Error(`address ${a} is no crossing of a level-${n} ${TYPES[ti]}`);
    const e = l % 8, i = (l - e) / 8;
    const sd = this.side[ti][s * 6 + e];
    if (sd < 0) return -1;
    const j = sd >> 3;
    this.lensAt(n);
    return (this.partStart[n][ti * 6 + j][sd & 7] + this.rowLen(n - 1, ct, e) - 1 - i) * 8 + j;
  }

  /** The crossing at index i along edge j of a level-n supertile of type ti. */
  rowAt(n: number, ti: number, j: number, i: number): number {
    if (n <= this.base) return this.cs.border(n, TYPES[ti])[j][i];
    this.lensAt(n);
    const starts = this.partStart[n][ti * 6 + j];
    let q = starts.length - 1;
    while (starts[q] > i) q--;
    const p = edgeParts(TYPES[ti], j)[q];
    const ct = this.kids[ti][p.s];
    return this.rowAt(n - 1, ct, p.e, this.rowLen(n - 1, ct, p.e) - 1 - (i - starts[q])) * 8 + p.s;
  }

  /** The child crossing glued to child crossing y of a level-n supertile, or -1 when y is on the outline. */
  across(n: number, ti: number, y: number): number {
    const s = y % 8, c = (y - s) / 8, ct = this.kids[ti][s];
    const l = this.locate(n - 1, ct, c);
    const e = l % 8, i = (l - e) / 8;
    const sd = this.side[ti][s * 6 + e];
    if (sd >= 0) return -1;
    const g = -2 - sd, s2 = Math.floor(g / 6), e2 = g % 6;
    return this.rowAt(n - 1, this.kids[ti][s2], e2, this.rowLen(n - 1, ct, e) - 1 - i) * 8 + s2;
  }

  /** The route's index entering crossing a of a level-n supertile (n above the base), followed now if it was not before. */
  private entry(n: number, ti: number, a: number): number {
    const memo = (this.memo[n] ??= new RouteIndex());
    const key = a * 16 + ti;
    const hit = memo.get(key);
    if (hit >= 0) return hit;
    this.callCount++;
    const steps: number[] = [];
    const w = this.walk(n, ti, a, steps);
    const from = this.stepCount;
    if (from + steps.length > this.pool.length) this.pool = grown(this.pool, Math.max(2 * this.pool.length, from + steps.length));
    this.pool.set(steps, from);
    this.stepCount += steps.length;
    const at = this.keep(w.exit, w.end === 'out' ? w.length : 0, 1, from, steps.length);
    memo.set(key, at);
    if (w.exit >= 0) memo.set(w.exit * 16 + ti, this.keep(a, w.length, 0, from, steps.length));
    if (this.onWork && (this.callCount & 0x3fff) === 0) this.onWork(this.work);
    return at;
  }

  private keep(mate: number, len: number, forward: number, from: number, count: number): number {
    if (this.kept === this.mates.length) {
      const size = 2 * this.kept;
      this.mates = grown(this.mates, size);
      this.lens = grown(this.lens, size);
      this.forward = grown(this.forward, size);
      this.from = grown(this.from, size);
      this.count = grown(this.count, size);
    }
    const at = this.kept++;
    this.mates[at] = mate;
    this.lens[at] = len;
    this.forward[at] = forward;
    this.from[at] = from;
    this.count[at] = count;
    return at;
  }

  /** The crossing a strand entering at a leaves a level-n supertile by: -1 when it ends inside. */
  mate(n: number, ti: number, a: number): number {
    if (n <= this.base) return this.cs.levels[n][TYPES[ti]].mate(a);
    const at = this.entry(n, ti, a);
    return this.mates[at];
  }

  /** Tiles on the route entering at a. */
  len(n: number, ti: number, a: number): number {
    if (n <= this.base) return this.cs.levels[n][TYPES[ti]].len(a);
    const at = this.entry(n, ti, a);
    return this.lens[at];
  }

  /**
   * Follows a strand through the children of a level-n supertile from child
   * crossing x0 (`childAddress * 8 + slot`, the child entered there), until
   * it is back at x0, reaches the outline or ends in a tile; the child
   * crossings entered are appended to `steps`.
   */
  walk(n: number, ti: number, x0: number, steps?: number[]): Walk {
    let x = x0;
    let length = 0;
    for (;;) {
      steps?.push(x);
      const s = x % 8, c = (x - s) / 8, ct = this.kids[ti][s];
      const m = this.mate(n - 1, ct, c);
      if (m < 0) return { end: 'ends', exit: -1, length };
      length += this.len(n - 1, ct, c);
      const y = m * 8 + s;
      const z = this.across(n, ti, y);
      if (z < 0) return { end: 'out', exit: y, length };
      if (z === x0) return { end: 'closed', exit: -1, length };
      x = z;
    }
  }

  /** Each child crossing the route entering at a enters, in order: its slot, its type and the child's crossing entered. */
  enters(n: number, ti: number, a: number, f: (slot: number, ct: number, k: number) => void): void {
    let steps: ArrayLike<number>;
    let fwd: boolean;
    if (n <= this.base) {
      const r = this.cs.levels[n][TYPES[ti]].route(a);
      steps = r.steps;
      fwd = r.forward;
    } else {
      const at = this.entry(n, ti, a);
      steps = this.pool.subarray(this.from[at], this.from[at] + this.count[at]);
      fwd = this.forward[at] === 1;
    }
    const len = steps.length;
    for (let q = 0; q < len; q++) {
      const st = steps[fwd ? q : len - 1 - q];
      const s = st % 8, c = (st - s) / 8, ct = this.kids[ti][s];
      f(s, ct, fwd ? c : this.mate(n - 1, ct, c));
    }
  }

  /** The address of place p of a level-n full table (built that far). */
  address(n: number, p: number): number {
    if (n <= this.base) return p;
    const step = this.cs.levels[n].Delta.level.under[p];
    return this.address(n - 1, step >>> 3) * 8 + (step & 7);
  }

  /** A circuit closed in the full tables, its child crossings as addresses. */
  walked(c: Walked): Walked {
    if (c.level - 1 <= this.base) return c;
    return { level: c.level, type: c.type, length: c.length, steps: c.steps.map((s) => this.address(c.level - 1, s >>> 3) * 8 + (s & 7)) };
  }

  /** Every crossing of a level-n supertile of type ti, edge by edge. */
  outline(n: number, ti: number): number[] {
    const out: number[] = [];
    for (let j = 0; j < 6; j++) for (let i = 0, m = this.rowLen(n, ti, j); i < m; i++) out.push(this.rowAt(n, ti, j, i));
    return out;
  }
}

/** A copy of `a` with room for `size` entries. */
function grown<A extends Float64Array | Int32Array | Uint8Array>(a: A, size: number): A {
  const out = new (a.constructor as new (n: number) => A)(size);
  out.set(a);
  return out;
}

/** Route indices by key (address * 16 + type, below 2^53), in an open-addressed table. */
class RouteIndex {
  private keys = new Float64Array(1 << 12).fill(-1);
  private vals = new Int32Array(1 << 12);
  private size = 0;

  private slot(key: number, keys: Float64Array): number {
    const mask = keys.length - 1;
    let h = Math.imul((key >>> 0) ^ Math.imul((key / 4294967296) >>> 0, 0x9e3779b1), 0x85ebca6b);
    h = (h ^ (h >>> 15)) & mask;
    while (keys[h] !== -1 && keys[h] !== key) h = (h + 1) & mask;
    return h;
  }

  get(key: number): number {
    const h = this.slot(key, this.keys);
    return this.keys[h] === key ? this.vals[h] : -1;
  }

  set(key: number, v: number): void {
    if (2 * (this.size + 1) > this.keys.length) {
      const keys = new Float64Array(2 * this.keys.length).fill(-1);
      const vals = new Int32Array(keys.length);
      for (let i = 0; i < this.keys.length; i++) {
        if (this.keys[i] === -1) continue;
        const h = this.slot(this.keys[i], keys);
        keys[h] = this.keys[i];
        vals[h] = this.vals[i];
      }
      this.keys = keys;
      this.vals = vals;
    }
    const h = this.slot(key, this.keys);
    if (this.keys[h] !== key) this.size++;
    this.keys[h] = key;
    this.vals[h] = v;
  }
}
