/**
 * A circuit's visits at a level walked in order, without listing them: a
 * depth-first walk from its first visits down through each arc's child arcs
 * (`readings.ts` lists the same visits level by level), each supertile's
 * frame carried down the walk as six numbers. What a picture keeps of the
 * walk is bounded whatever the number of visits: the first supertiles met,
 * the crossings its line is drawn through, a bit per supertile seen.
 *
 * Visits counted per arc (memoised per level) let the walk step over a
 * child arc whose visits hold nothing it keeps: drawing every 1,000th
 * visit, or only a line through a stride of crossings, walks only the arcs
 * holding those.
 */
import type { Affine, Pt } from '../../core';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { crossingPt } from './found';
import { TYPES, typeIndex, type SparseRoutes } from './sparseRoutes';

/** Up to this many raw visits a level is drawn in full without a note. */
export const DRAW_WARN = 5000000;
/** Over this many raw visits a level is drawn through every `SAMPLE_EVERY`-th visit. */
export const SAMPLE_ABOVE = 20000000;
export const SAMPLE_EVERY = 1000;

/** The child arcs of the level-n arcs, and the children's placements: from the tables, or from routes worked out above them. */
export class Arcs {
  readonly types: readonly string[];
  private readonly typeAt = new Map<string, number>();
  /** Per level: crossing * 16 + type -> child arcs, packed slot, type and crossing in threes. */
  private readonly packed: Map<number, Float64Array>[] = [];
  private readonly kidsFlat: Float64Array[][] = [];
  /** Per level counted to, per level of arc: crossing * 16 + type -> its visits there. */
  private readonly counts = new Map<number, Map<number, number>[]>();

  constructor(
    readonly cs: CircuitShapes,
    readonly R: SparseRoutes | null = null,
  ) {
    this.types = Object.keys(cs.levels[0]);
    this.types.forEach((t, i) => this.typeAt.set(t, i));
  }

  typeOf(type: string): number {
    return this.typeAt.get(type)!;
  }

  /** The child arcs of the level-n arc of type `ti` entered at k, in the order the strand meets them. */
  steps(n: number, ti: number, k: number): Float64Array {
    const m = (this.packed[n] ??= new Map());
    const key = k * 16 + ti;
    let hit = m.get(key);
    if (!hit) {
      const out: number[] = [];
      const R = this.R;
      if (R && n > R.base) R.enters(n, typeIndex.get(this.types[ti])!, k, (slot, ct, ck) => out.push(slot, this.typeOf(TYPES[ct]), ck));
      else for (const e of this.cs.enters(n, this.types[ti], k)) out.push(e.slot, this.typeOf(e.type), e.k);
      hit = Float64Array.from(out);
      m.set(key, hit);
    }
    return hit;
  }

  /** The eight child placements of a level-n supertile of type `ti`, six numbers each, by slot. */
  kids(n: number, ti: number): Float64Array {
    const row = (this.kidsFlat[n] ??= []);
    let hit = row[ti];
    if (!hit) {
      hit = new Float64Array(48);
      for (const ch of this.cs.childTypes(n, this.types[ti])) hit.set(this.cs.childOf(n, this.types[ti], ch.pos).xform, 6 * ch.pos);
      row[ti] = hit;
    }
    return hit;
  }

  /** Visits at `level` of the level-n arc of type `ti` entered at k. */
  count(n: number, ti: number, k: number, level: number): number {
    if (n <= level) return 1;
    const per = this.counts.get(level) ?? this.counts.set(level, []).get(level)!;
    const m = (per[n] ??= new Map());
    const key = k * 16 + ti;
    let hit = m.get(key);
    if (hit === undefined) {
      const st = this.steps(n, ti, k);
      hit = 0;
      if (n - 1 === level) hit = st.length / 3;
      else for (let q = 0; q < st.length; q += 3) hit += this.count(n - 1, st[q + 1], st[q + 2], level);
      m.set(key, hit);
    }
    return hit;
  }
}

const arcsBy = new WeakMap<object, Arcs>();
/** The arcs of the tables of `cs`, or of the routes `R` above them, made once each. */
export function arcsOf(cs: CircuitShapes, R: SparseRoutes | null = null): Arcs {
  const key = R ?? cs;
  let a = arcsBy.get(key);
  if (!a) arcsBy.set(key, (a = new Arcs(cs, R)));
  return a;
}

/** Where a member's visits come from: its first visits, at level `top`, each with its slot path (base 8, from level `birth` down) and frame; and, for an open strand, the point its line ends at. */
export interface Descent {
  readonly arcs: Arcs;
  readonly birth: number;
  readonly top: number;
  readonly first: readonly { readonly type: string; readonly cross: number; readonly id: number; readonly xform: Affine }[];
  readonly end?: Pt;
}

/** A born circuit's descent: the children of its birth supertile it runs through. */
export function circuitDescent(arcs: Arcs, c: BornCircuit): Descent {
  const first = c.steps.map((s) => {
    const ch = arcs.cs.childOf(c.level, c.type, s);
    return { type: ch.type, cross: ch.k, id: ch.pos, xform: ch.xform };
  });
  return { arcs, birth: c.level, top: c.level - 1, first };
}

/** Raw visits at a level at or below `top`. */
export function visitsIn(d: Descent, level: number): number {
  let n = 0;
  for (const f of d.first) n += d.arcs.count(d.top, d.arcs.typeOf(f.type), f.cross, level);
  return n;
}

/** A supertile met first by a visit drawn: its slot path as one number, its type, its outline placed. */
export interface Met {
  readonly id: number;
  readonly type: string;
  readonly outline: Float64Array;
}

export interface Walked {
  /** Raw visits at the level. */
  readonly visits: number;
  /** Visits drawn: every one (1), or every `every`-th from the first. */
  readonly every: number;
  /** Supertiles of the visits drawn. */
  readonly count: number;
  /** The first `cap` of them, in the order met. */
  readonly met: readonly Met[];
  /** The line through the visits drawn (each at the crossing it enters by; an open strand's end after them), through at most `points` of them evenly spaced, x, y pairs. */
  readonly line: Float64Array;
  /** Every visit's slot path as one number, when asked for. */
  readonly ids: Float64Array | null;
}

export interface WalkOptions {
  /** Supertiles kept, at most; 0 walks only for the line, stepping over arcs holding no point of it. */
  readonly cap: number;
  /** Points of the line, at most. */
  readonly points: number;
  /** Over this many visits only every `every`-th is drawn. */
  readonly sampleAbove?: number;
  readonly every?: number;
  /** Keep every visit's slot path (drawn in full only). */
  readonly ids?: boolean;
  /** A level-n outline in its frame, x, y pairs. */
  readonly outline?: (type: string) => readonly Pt[];
}

/** Bits per page of the set of supertiles seen. */
const PAGE = 4096;

/**
 * A member's visits at `level` walked in order: the supertiles met first and
 * its line, from every visit, or from every `every`-th when there are more
 * than `sampleAbove`.
 */
export function walkLevel(d: Descent, level: number, o: WalkOptions): Walked {
  const { arcs } = d;
  const cs = arcs.cs;
  const N = visitsIn(d, level);
  const every = N > (o.sampleAbove ?? SAMPLE_ABOVE) ? o.every ?? SAMPLE_EVERY : 1;
  const drawn = Math.ceil(N / every);
  const L = drawn + (d.end ? 1 : 0);
  const P = Math.min(L, o.points);
  const pickAt = (j: number) => (j >= P ? -1 : L <= o.points ? j : Math.floor((j * L) / o.points));
  const line = new Float64Array(2 * P);
  let j = 0;
  let pick = pickAt(0);
  const ids = o.ids && every === 1 ? new Float64Array(N) : null;
  const met: Met[] = [];
  const pages = new Map<number, Uint32Array>();
  let count = 0;
  const outlines = new Map<number, readonly Pt[]>();
  const outlineOf = (ti: number) => {
    let hit = outlines.get(ti);
    if (!hit) outlines.set(ti, (hit = o.outline!(arcs.types[ti])));
    return hit;
  };
  const lineOnly = o.cap === 0 && !ids;
  let at = 0;

  /** The next visit the walk keeps anything of, from visit `i` on. */
  const wanted = (i: number): number => {
    if (lineOnly) return pick < 0 ? Infinity : pick * every;
    return every === 1 ? i : Math.ceil(i / every) * every;
  };

  const visit = (ti: number, k: number, id: number, a: number, b: number, c: number, dd: number, e: number, f: number): void => {
    const i = at++;
    if (every > 1 && i % every) return;
    const s = i / every;
    if (ids) ids[i] = id;
    if (!lineOnly) {
      const pg = Math.floor(id / PAGE), bit = id - pg * PAGE;
      let page = pages.get(pg);
      if (!page) pages.set(pg, (page = new Uint32Array(PAGE / 32)));
      const w = bit >>> 5, m = 1 << (bit & 31);
      if (!(page[w] & m)) {
        page[w] |= m;
        count++;
        if (met.length < o.cap) {
          const pts = outlineOf(ti);
          const out = new Float64Array(2 * pts.length);
          for (let q = 0; q < pts.length; q++) {
            const p = pts[q];
            out[2 * q] = a * p.x + b * p.y + c;
            out[2 * q + 1] = dd * p.x + e * p.y + f;
          }
          met.push({ id, type: arcs.types[ti], outline: out });
        }
      }
    }
    if (s === pick) {
      const p = crossingPt(cs, level, arcs.types[ti], k);
      line[2 * j] = a * p.x + b * p.y + c;
      line[2 * j + 1] = dd * p.x + e * p.y + f;
      pick = pickAt(++j);
    }
  };

  const go = (n: number, ti: number, k: number, id: number, a: number, b: number, c: number, dd: number, e: number, f: number): void => {
    const st = arcs.steps(n, ti, k);
    const kx = arcs.kids(n, ti);
    for (let q = 0; q < st.length; q += 3) {
      const slot = st[q], ct = st[q + 1], ck = st[q + 2];
      if (every > 1 || lineOnly) {
        const size = arcs.count(n - 1, ct, ck, level);
        if (wanted(at) >= at + size) {
          at += size;
          continue;
        }
      }
      const x = 6 * slot;
      const A = a * kx[x] + b * kx[x + 3], B = a * kx[x + 1] + b * kx[x + 4], C = a * kx[x + 2] + b * kx[x + 5] + c;
      const D = dd * kx[x] + e * kx[x + 3], E = dd * kx[x + 1] + e * kx[x + 4], F = dd * kx[x + 2] + e * kx[x + 5] + f;
      if (n - 1 === level) visit(ct, ck, id * 8 + slot, A, B, C, D, E, F);
      else go(n - 1, ct, ck, id * 8 + slot, A, B, C, D, E, F);
    }
  };

  for (const fv of d.first) {
    const ti = arcs.typeOf(fv.type);
    const x = fv.xform;
    if (d.top === level) visit(ti, fv.cross, fv.id, x[0], x[1], x[2], x[3], x[4], x[5]);
    else go(d.top, ti, fv.cross, fv.id, x[0], x[1], x[2], x[3], x[4], x[5]);
  }
  if (d.end && pick === drawn) {
    line[2 * j] = d.end.x;
    line[2 * j + 1] = d.end.y;
  }
  return { visits: N, every, count, met, line, ids };
}

/**
 * A member's line at a level through every visit, then its end (an open
 * strand's) or its first point again: whole while that is at most
 * `2 * budget` points, otherwise `budget` of the visits evenly spaced and
 * the end, `capped`, as `buildup/viewer.ts`'s `walkedLine` gives a walked
 * line. Only the arcs holding a point kept are walked.
 */
export function levelLine(d: Descent, level: number, budget: number): { pts: Float64Array; capped: boolean } {
  const N = visitsIn(d, level);
  const capped = N + 1 > 2 * budget;
  const w = walkLevel({ ...d, end: undefined }, level, { cap: 0, points: capped ? budget : N, sampleAbove: Infinity });
  const pts = new Float64Array(w.line.length + 2);
  pts.set(w.line);
  pts[w.line.length] = d.end ? d.end.x : w.line[0];
  pts[w.line.length + 1] = d.end ? d.end.y : w.line[1];
  return { pts, capped };
}
