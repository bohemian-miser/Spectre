/**
 * What the Build-up viewer draws, worked out from the renormalisation
 * (`shapes/circuitShapes.ts`).
 *
 * A route is drawn as the strand's path through the supertile: the
 * crossings it meets, one per child arc down to a level `stop` (each arc at
 * `stop` drawn as the straight line between its two crossings). The viewer
 * picks `stop` from the zoom so the points on screen stay bounded, and skips
 * the inside of children that lie outside the view: a strand stays inside
 * a child between entering and leaving it, so a child out of view is passed
 * with one line that is out of view too.
 *
 * A pass is one arc of a child supertile: the strand entering a child at a
 * crossing and leaving it at that crossing's mate. A route or a circuit is a
 * sequence of passes through its supertile's children, and each pass is a
 * sequence of passes one level down.
 */
import { buildSystem, edgeParts, mul, transPt, type Affine, type HexType, type MetaNode, type Pt } from '../../core';
import type { Box } from '../../lib/viewport';
import { Ring, outlinePoints } from './ring';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';

export const IDENTITY: Affine = [1, 0, 0, 0, 1, 0];

const boxOf = (pts: readonly Pt[]): Box => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  return { min: { x: x0, y: y0 }, max: { x: x1, y: y1 } };
};

/** The box round a box's corners mapped by x. */
export function mapBox(x: Affine, b: Box): Box {
  return boxOf([
    transPt(x, b.min), transPt(x, { x: b.max.x, y: b.min.y }), transPt(x, b.max), transPt(x, { x: b.min.x, y: b.max.y }),
  ]);
}


/** Where a walk puts its crossings, as x, y pairs: an array, or anything else taking them. */
export interface Sink {
  push(x: number, y: number): void;
}

/**
 * A walked line and its last point (`last`, or the line's first to close
 * it): every point while there are at most `2 * budget` with the last,
 * otherwise `budget` of them evenly spaced and the last, `capped`; null
 * when over and `thinned` is false. The points are held only up to that
 * many: a longer line is walked again for the ones kept.
 */
export function walkedLine(walk: (out: Sink) => void, last: Pt | null, budget: number, thinned = true): { pts: Float64Array; capped: boolean } | null {
  const xs: number[] = [];
  const room = 2 * budget - 1;
  let n = 0;
  walk({
    push(x, y) {
      if (n++ < room) xs.push(x, y);
    },
  });
  const end = (out: number[]) => (last ? out.push(last.x, last.y) : out.push(out[0], out[1]));
  if (n <= room) {
    end(xs);
    return { pts: Float64Array.from(xs), capped: false };
  }
  if (!thinned) return null;
  const out: number[] = [];
  let i = 0, j = 0, pick = 0;
  walk({
    push(x, y) {
      if (i++ !== pick) return;
      out.push(x, y);
      pick = ++j < budget ? Math.floor((j * n) / budget) : -1;
    },
  });
  end(out);
  return { pts: Float64Array.from(out), capped: true };
}

/** One child arc as the walk meets it: the child's slot, type and the crossing it enters by. */
interface Step {
  readonly slot: number;
  readonly type: string;
  readonly k: number;
}

/** The renormalisation read for drawing: child arcs, child placements and supertile boxes, each worked out once. */
export class Geometry {
  private readonly steps = new Map<string, Step[]>();
  private readonly kids = new Map<string, Affine[]>();
  private readonly boxes = new Map<string, Box>();

  constructor(readonly cs: CircuitShapes) {
    this.types = Object.keys(cs.levels[0]);
    this.types.forEach((t, i) => this.typeAt.set(t, i));
  }

  /** The child arcs of the level-n arc of `type` from crossing k (`cs.enters`). */
  enters(n: number, type: string, k: number): Step[] {
    const key = `${n} ${type} ${k}`;
    let hit = this.steps.get(key);
    if (!hit) this.steps.set(key, (hit = this.cs.enters(n, type, k)));
    return hit;
  }

  /** Each child's placement in a level-n supertile of `type`, by slot. */
  kidX(n: number, type: string): Affine[] {
    const key = `${n} ${type}`;
    let hit = this.kids.get(key);
    if (!hit) {
      hit = [];
      for (const ch of (buildSystem(this.cs.family, n)[type] as MetaNode).children) hit[ch.pos] = ch.xform as Affine;
      this.kids.set(key, hit);
    }
    return hit;
  }

  /** A box round a level-n supertile of `type` in its frame: its outline's, grown by a tenth, as the border between the outline's points can bulge out. */
  box(n: number, type: string): Box {
    const key = `${n} ${type}`;
    let hit = this.boxes.get(key);
    if (!hit) {
      const b = boxOf(this.cs.outline(n, type));
      const m = 0.1 * Math.max(b.max.x - b.min.x, b.max.y - b.min.y);
      hit = { min: { x: b.min.x - m, y: b.min.y - m }, max: { x: b.max.x + m, y: b.max.y + m } };
      this.boxes.set(key, hit);
    }
    return hit;
  }

  private readonly types: string[];
  private readonly typeAt = new Map<string, number>();
  /** Per level: (crossing * 16 + type) -> child arcs, packed slot, type and crossing in threes. */
  private readonly packed: Map<number, Int32Array>[] = [];
  /** Per level and type: the eight child placements, six numbers each, by slot. */
  private readonly kidsFlat: Float64Array[][] = [];
  /** Per level and type: a box round the supertile as centre and half sizes. */
  private readonly half: Float64Array[][] = [];

  private stepsOf(n: number, ti: number, k: number): Int32Array {
    const m = (this.packed[n] ??= new Map());
    const key = k * 16 + ti;
    let hit = m.get(key);
    if (!hit) {
      const es = this.enters(n, this.types[ti], k);
      hit = new Int32Array(3 * es.length);
      es.forEach((e, i) => { hit![3 * i] = e.slot; hit![3 * i + 1] = this.typeAt.get(e.type)!; hit![3 * i + 2] = e.k; });
      m.set(key, hit);
    }
    return hit;
  }

  private kidsOf(n: number, ti: number): Float64Array {
    const row = (this.kidsFlat[n] ??= []);
    let hit = row[ti];
    if (!hit) {
      hit = new Float64Array(48);
      this.kidX(n, this.types[ti]).forEach((x, slot) => hit!.set(x, 6 * slot));
      row[ti] = hit;
    }
    return hit;
  }

  private halfOf(n: number, ti: number): Float64Array {
    const row = (this.half[n] ??= []);
    let hit = row[ti];
    if (!hit) {
      const b = this.box(n, this.types[ti]);
      hit = Float64Array.of((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.max.x - b.min.x) / 2, (b.max.y - b.min.y) / 2);
      row[ti] = hit;
    }
    return hit;
  }

  private readonly masks = new Map<number, number>();

  /**
   * Which edges of the child at `slot` lie on the outline, given which
   * edges of its parent (a level-n `type`, by `ti`) do (`mask`, bit j for
   * edge j): the child edges `edgeParts` puts on those parent edges.
   */
  private maskOf(ti: number, mask: number, slot: number): number {
    if (mask === 0) return 0;
    const key = (ti * 64 + mask) * 8 + slot;
    let hit = this.masks.get(key);
    if (hit === undefined) {
      hit = 0;
      for (let j = 0; j < 6; j++) {
        if (!(mask & (1 << j))) continue;
        for (const part of edgeParts(this.types[ti] as HexType, j)) if (part.s === slot) hit |= 1 << part.e;
      }
      this.masks.set(key, hit);
    }
    return hit;
  }

  /**
   * The crossings the level-n arc from k (placed by x) meets, down to level
   * `stop`, as x, y pairs appended to `out`, leaving out its last crossing
   * (where the next arc starts). Children on the supertile's border are
   * entered further, down to `edgeStop`, so the drawing keeps to the
   * outline; children whose box misses `view` are not entered.
   */
  walk(n: number, type: string, k: number, x: Affine, stop: number, view: Box | null, out: Sink, edgeStop = stop): void {
    const v = view ? [view.min.x, view.min.y, view.max.x, view.max.y] : null;
    this.go(n, this.typeAt.get(type)!, k, x[0], x[1], x[2], x[3], x[4], x[5], stop, v, out, edgeStop, 63);
  }

  private go(n: number, ti: number, k: number, a: number, b: number, c: number, d: number, e: number, f: number, stop: number, v: number[] | null, out: Sink, edgeStop: number, mask: number): void {
    if (n <= (mask ? edgeStop : stop)) {
      const p = this.cs.levels[n][this.types[ti]].pt(k);
      out.push(a * p.x + b * p.y + c, d * p.x + e * p.y + f);
      return;
    }
    const st = this.stepsOf(n, ti, k);
    const kx = this.kidsOf(n, ti);
    for (let i = 0; i < st.length; i += 3) {
      const o = 6 * st[i], ct = st[i + 1], ck = st[i + 2];
      const A = a * kx[o] + b * kx[o + 3], B = a * kx[o + 1] + b * kx[o + 4], C = a * kx[o + 2] + b * kx[o + 5] + c;
      const D = d * kx[o] + e * kx[o + 3], E = d * kx[o + 1] + e * kx[o + 4], F = d * kx[o + 2] + e * kx[o + 5] + f;
      const cm = this.maskOf(ti, mask, st[i]);
      const deeper = n - 1 > (cm ? edgeStop : stop);
      if (!deeper) {
        const p = this.cs.levels[n - 1][this.types[ct]].pt(ck);
        out.push(A * p.x + B * p.y + C, D * p.x + E * p.y + F);
        continue;
      }
      if (v) {
        const h = this.halfOf(n - 1, ct);
        const mx = A * h[0] + B * h[1] + C, my = D * h[0] + E * h[1] + F;
        const hx = Math.abs(A) * h[2] + Math.abs(B) * h[3], hy = Math.abs(D) * h[2] + Math.abs(E) * h[3];
        if (mx + hx < v[0] || mx - hx > v[2] || my + hy < v[1] || my - hy > v[3]) {
          const p = this.cs.levels[n - 1][this.types[ct]].pt(ck);
          out.push(A * p.x + B * p.y + C, D * p.x + E * p.y + F);
          continue;
        }
      }
      this.go(n - 1, ct, ck, A, B, C, D, E, F, stop, v, out, edgeStop, cm);
    }
  }

  /**
   * The same points as `arc`, handed out a chunk at a time, so one long
   * route can be drawn over several frames: the walk keeps its own stack of
   * the arcs it is inside.
   */
  source(n: number, type: string, k: number, x: Affine, stop: number, view: Box | null, edgeStop = stop): PointSource {
    const v = view ? [view.min.x, view.min.y, view.max.x, view.max.y] : null;
    const T = this.cs.levels[n][type];
    const endP = transPt(x, T.pt(T.mate(k)));
    const D = n + 1;
    const lv = new Int32Array(D), tis = new Int32Array(D), idx = new Int32Array(D), ms = new Int32Array(D);
    const sts: Int32Array[] = [];
    const xs = new Float64Array(6 * D);
    let depth = 0;
    let started = false;
    let finished = false;
    const ti0 = this.typeAt.get(type)!;
    return {
      take: (max: number): Float64Array | null => {
        if (finished) return null;
        const out: number[] = [];
        if (!started) {
          started = true;
          if (n <= stop) {
            const p = transPt(x, T.pt(k));
            out.push(p.x, p.y, endP.x, endP.y);
            finished = true;
            return Float64Array.from(out);
          }
          lv[0] = n; tis[0] = ti0; idx[0] = 0; ms[0] = 63; sts[0] = this.stepsOf(n, ti0, k);
          xs.set(x, 0);
          depth = 1;
        }
        while (depth > 0 && out.length < 2 * max) {
          const t = depth - 1;
          const st = sts[t];
          if (idx[t] >= st.length) { depth--; continue; }
          const i = idx[t];
          idx[t] += 3;
          const m = lv[t];
          const kx = this.kidsOf(m, tis[t]);
          const o = 6 * st[i], ct = st[i + 1], ck = st[i + 2];
          const q = 6 * t;
          const a = xs[q], b = xs[q + 1], c = xs[q + 2], d = xs[q + 3], e = xs[q + 4], f = xs[q + 5];
          const A = a * kx[o] + b * kx[o + 3], B = a * kx[o + 1] + b * kx[o + 4], C = a * kx[o + 2] + b * kx[o + 5] + c;
          const Dd = d * kx[o] + e * kx[o + 3], E = d * kx[o + 1] + e * kx[o + 4], F = d * kx[o + 2] + e * kx[o + 5] + f;
          const cm = this.maskOf(tis[t], ms[t], st[i]);
          let leaf = m - 1 <= (cm ? edgeStop : stop);
          if (!leaf && v) {
            const h = this.halfOf(m - 1, ct);
            const mx = A * h[0] + B * h[1] + C, my = Dd * h[0] + E * h[1] + F;
            const hx = Math.abs(A) * h[2] + Math.abs(B) * h[3], hy = Math.abs(Dd) * h[2] + Math.abs(E) * h[3];
            leaf = mx + hx < v[0] || mx - hx > v[2] || my + hy < v[1] || my - hy > v[3];
          }
          if (leaf) {
            const p = this.cs.levels[m - 1][this.types[ct]].pt(ck);
            out.push(A * p.x + B * p.y + C, Dd * p.x + E * p.y + F);
            continue;
          }
          lv[depth] = m - 1; tis[depth] = ct; idx[depth] = 0; ms[depth] = cm; sts[depth] = this.stepsOf(m - 1, ct, ck);
          xs[6 * depth] = A; xs[6 * depth + 1] = B; xs[6 * depth + 2] = C; xs[6 * depth + 3] = Dd; xs[6 * depth + 4] = E; xs[6 * depth + 5] = F;
          depth++;
        }
        if (depth === 0) {
          out.push(endP.x, endP.y);
          finished = true;
        }
        return Float64Array.from(out);
      },
    };
  }

  /** A whole arc: `walk`, then its last crossing. */
  arc(n: number, type: string, k: number, x: Affine, stop: number, view: Box | null, edgeStop = stop): Float64Array {
    const out: number[] = [];
    this.walk(n, type, k, x, stop, view, out, edgeStop);
    const T = this.cs.levels[n][type];
    const q = transPt(x, T.pt(T.mate(k)));
    out.push(q.x, q.y);
    return Float64Array.from(out);
  }

}

/** Points handed out in chunks: `take` gives the next (x, y pairs, at most about `max` points), null once all are out. */
export interface PointSource {
  take(max: number): Float64Array | null;
}

/** A source for points already worked out. */
export const fixedSource = (pts: Float64Array): PointSource => {
  let done = false;
  return { take: () => (done ? null : ((done = true), pts)) };
};

/** A type's routes at a level: the crossing each starts at (the lower of its two) and its tiles, longest last so they are drawn on top. */
export interface RouteSet {
  readonly level: number;
  readonly type: string;
  readonly from: Int32Array;
  readonly tiles: Float64Array;
  /** Routes of the table, of which `from` holds the longest. */
  readonly total: number;
}

/** A type's routes at a level, at most the `most` longest of them. */
export function routeSet(cs: CircuitShapes, n: number, type: string, most = Infinity): RouteSet {
  const T = cs.levels[n][type];
  const ks = T.crossings().filter((k) => T.mate(k) > k);
  const len = Float64Array.from(ks, (k) => T.len(k));
  const order = Int32Array.from(ks, (_, i) => i).sort((a, b) => len[a] - len[b] || ks[a] - ks[b]);
  const kept = order.subarray(Math.max(0, order.length - most));
  return { level: n, type, from: Int32Array.from(kept, (i) => ks[i]), tiles: Float64Array.from(kept, (i) => len[i]), total: ks.length };
}

/**
 * Lines all of a type's routes are drawn with down to each level: lines[s]
 * for stop s. The arcs met at each level are counted once per distinct
 * (type, crossing) with their number carried, level by level down.
 */
export function linesPerStop(g: Geometry, rs: RouteSet): number[] {
  const types = Object.keys(g.cs.levels[0]);
  const ti = new Map(types.map((t, i) => [t, i]));
  let cur = new Map<number, number>();
  for (const k of rs.from) {
    const key = k * 16 + ti.get(rs.type)!;
    cur.set(key, (cur.get(key) ?? 0) + 1);
  }
  const out: number[] = [];
  for (let n = rs.level; n >= 0; n--) {
    let total = 0;
    for (const c of cur.values()) total += c;
    out[n] = total;
    if (n === 0) break;
    const next = new Map<number, number>();
    for (const [key, c] of cur) {
      for (const e of g.cs.enters(n, types[key & 15], key >> 4)) {
        const k2 = e.k * 16 + ti.get(e.type)!;
        next.set(k2, (next.get(k2) ?? 0) + c);
      }
    }
    cur = next;
  }
  return out.slice(0, Math.max(1, rs.level));
}

/**
 * The finest level the routes can be drawn down to with at most `budget`
 * lines in view, given what fraction of the supertile is in view, and no
 * finer than needed: a level whose supertiles span under `px` pixels.
 */
export function chooseStop(lines: readonly number[], inView: number, budget: number, spanAt: (s: number) => number, px = 3): number {
  let s = 0;
  while (s < lines.length - 1 && (lines[s] * inView > budget || spanAt(s + 1) < px)) s++;
  return s;
}

/** One pass: a child arc placed in the frame of the supertile at the top, with its two ends. */
export interface Pass {
  readonly level: number;
  readonly type: string;
  readonly k: number;
  readonly x: Affine;
  /** Slots from the top supertile down to this pass's child. */
  readonly path: readonly number[];
  readonly a: Pt;
  readonly b: Pt;
  readonly tiles: number;
}

const passOf = (cs: CircuitShapes, level: number, type: string, k: number, x: Affine, path: readonly number[]): Pass => {
  const T = cs.levels[level][type];
  return { level, type, k, x, path, a: transPt(x, T.pt(k)), b: transPt(x, T.pt(T.mate(k))), tiles: T.len(k) };
};

/**
 * Passes in order with each one's start made the very point the one before
 * ends at (and the first's and last's the given ends), so neighbours meet at
 * one coordinate, not two worked out through different children.
 */
const chain = (ps: Pass[], a?: Pt, b?: Pt): Pass[] => {
  for (let i = 1; i < ps.length; i++) ps[i] = { ...ps[i], a: ps[i - 1].b };
  if (a && ps.length) ps[0] = { ...ps[0], a };
  if (b && ps.length) ps[ps.length - 1] = { ...ps[ps.length - 1], b };
  return ps;
};

/** The passes of the route from crossing k of a level-n `type`, through its children. */
export function routePasses(g: Geometry, n: number, type: string, k: number): Pass[] {
  const kx = g.kidX(n, type);
  return chain(g.enters(n, type, k).map((e) => passOf(g.cs, n - 1, e.type, e.k, kx[e.slot], [e.slot])));
}

/** The passes of a circuit through the children of the supertile it closes in. */
export function circuitPasses(g: Geometry, c: BornCircuit): Pass[] {
  const ps = chain(c.steps.map((s) => {
    const ch = g.cs.childOf(c.level, c.type, s);
    return passOf(g.cs, c.level - 1, ch.type, ch.k, ch.xform, [ch.pos]);
  }));
  // the loop closes on the first pass's start
  if (ps.length) ps[ps.length - 1] = { ...ps[ps.length - 1], b: ps[0].a };
  return ps;
}

/** A pass broken into its passes one level down. */
export function subPasses(g: Geometry, p: Pass): Pass[] {
  if (p.level === 0) return [p];
  const kx = g.kidX(p.level, p.type);
  return chain(g.enters(p.level, p.type, p.k).map((e) => passOf(g.cs, p.level - 1, e.type, e.k, mul(p.x, kx[e.slot]), [...p.path, e.slot])), p.a, p.b);
}

/** How many passes one level down a list of passes breaks into. */
export function subCount(g: Geometry, ps: readonly Pass[]): number {
  let c = 0;
  for (const p of ps) c += p.level === 0 ? 1 : g.enters(p.level, p.type, p.k).length;
  return c;
}

/** A pass's signature: its type and the types of its passes one level down. */
export function signature(g: Geometry, p: Pass): string {
  return p.level === 0 ? p.type : `${p.type}:${g.enters(p.level, p.type, p.k).map((e) => e.type).join(' ')}`;
}

const rings = new WeakMap<Geometry, Map<string, Ring>>();
const straight = new WeakMap<Geometry, Map<string, boolean>>();

/** A level-n `type`'s outline (`ring.ts`), in its frame, worked out once. */
export function ringOf(g: Geometry, n: number, type: string): Ring {
  const m = rings.get(g) ?? rings.set(g, new Map()).get(g)!;
  const key = `${n} ${type}`;
  let hit = m.get(key);
  if (!hit) m.set(key, (hit = new Ring(outlinePoints(g.cs, n, type))));
  return hit;
}

/** Whether the straight line between crossing k of a level-n `type` and its mate stays inside the type's outline. */
function keepsInside(g: Geometry, n: number, type: string, k: number): boolean {
  const m = straight.get(g) ?? straight.set(g, new Map()).get(g)!;
  const key = `${n} ${type} ${k}`;
  let hit = m.get(key);
  if (hit === undefined) {
    const T = g.cs.levels[n][type];
    const a = T.pt(k), b = T.pt(T.mate(k));
    const ring = ringOf(g, n, type);
    hit = n === 0 || ring.holds(a.x, a.y, b.x, b.y, 1e4 * ring.eps);
    m.set(key, hit);
  }
  return hit;
}

/**
 * A pass as the viewer draws it: the straight line between its two
 * crossings where that stays inside its child, otherwise bent through its
 * own passes one level down, each of them drawn the same way.
 */
export function bentPass(g: Geometry, p: Pass): Float64Array {
  const out: number[] = [p.a.x, p.a.y];
  const go = (q: Pass): void => {
    if (keepsInside(g, q.level, q.type, q.k)) out.push(q.b.x, q.b.y);
    else for (const s of subPasses(g, q)) go(s);
  };
  go(p);
  return Float64Array.from(out);
}
