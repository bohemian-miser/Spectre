/**
 * Circuits found above the build (`bruteForce.ts`) as members of the
 * Harmonics page: read, placed and drawn with the routes worked out on
 * demand (`sparseRoutes.ts`) above the build's top level and the full
 * tables at and below it.
 *
 * A circuit found comes with its child crossings as deep addresses
 * (`SparseRoutes.deepStep`), which name them whatever level the tables stop
 * at, and is taken back into the routes of the build it joins. Its rows are
 * read as `rows.ts` reads a built circuit's, each level's visits from the
 * level above (`SparseRows`); a visited supertile is placed in the birth
 * supertile's frame through its slot path, and the circuit is drawn at a
 * level as the line through the middles of the supertiles it visits there.
 */
import { mul, transPt, type Affine, type HexType, type Pt, type TileTypeId } from '../../core';
import type { Box } from '../../lib/viewport';
import { middleOf } from '../buildup/deep';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { MAX_ROW, CircuitRows } from './rows';
import { cancelBacktracksAt, token, type Reading, type VisitColumns } from './readings';
import { RouteLimit, TYPES, typeIndex, type SparseRoutes } from './sparseRoutes';
import { VISIT_CAP } from './pairView';

/** A circuit found above the build, as the brute force hands it over. */
export interface Found {
  readonly level: number;
  readonly type: string;
  readonly length: number;
  readonly family: string;
  /** The child crossings its closing walk enters, as deep addresses. */
  readonly deep: readonly number[];
}

export const foundKey = (f: Found): string => `${f.level}/${f.type}/${f.length}/${f.deep[0]}`;

/** A circuit found, as a born circuit of the routes: its steps as their addresses. */
export function bornOfFound(R: SparseRoutes, f: Found): BornCircuit {
  const steps = f.deep.map((d) => R.fromDeepStep(f.level, d));
  const slots: number[] = [];
  for (const s of steps) if (!slots.includes(s % 8)) slots.push(s % 8);
  return { level: f.level, type: f.type as TileTypeId, length: f.length, slots, steps };
}

/** A circuit's rows with the routes worked out on demand above the tables' top level. */
export class SparseRows extends CircuitRows {
  constructor(
    cs: CircuitShapes,
    readonly R: SparseRoutes,
    c: BornCircuit,
  ) {
    super(cs, c);
  }

  protected visitsOf(level: number): VisitColumns {
    const { R, c } = this;
    const v: VisitColumns = { level, type: [], cross: [], id: [], slot: [], parent: [], tiles: [], up: [] };
    const push = (type: number, cross: number, id: number, slot: number, parent: string, up: number) => {
      v.type.push(TYPES[type]);
      v.cross.push(cross);
      v.id.push(id);
      v.slot.push(slot);
      v.parent.push(parent);
      v.tiles.push(R.len(level, type, cross));
      v.up.push(up);
      if (v.type.length > MAX_ROW) throw new Error(`level ${level} has more than ${MAX_ROW.toLocaleString('en-US')} visits, too many to list`);
    };
    if (level === c.level - 1) {
      const top = typeIndex.get(c.type)!;
      for (const s of c.steps) {
        const slot = s % 8;
        push(R.kid(top, slot), (s - slot) / 8, slot, slot, c.type, -1);
      }
      return v;
    }
    if (level + 1 <= R.base) return super.visitsOf(level);
    const above = this.visits(level + 1);
    for (let i = 0; i < above.type.length; i++) {
      R.enters(level + 1, typeIndex.get(above.type[i])!, above.cross[i], (slot, ct, k) => push(ct, k, above.id[i] * 8 + slot, slot, above.type[i], i));
    }
    return v;
  }
}

/** A circuit read at every level from the one below its birth down, as `readDown` reads one, until a level has more than `stopAbove` raw visits (that level read and the last) or cannot be listed. */
export function readRows(rows: CircuitRows, stopAbove: number): { readings: Reading[]; readFrom: number } {
  const c = rows.c;
  const out: Reading[] = [];
  for (let k = c.level - 1; k >= 0; k--) {
    let v: VisitColumns;
    try {
      v = rows.visits(k);
    } catch (err) {
      if (err instanceof RouteLimit || (err instanceof Error && /too many to list/.test(err.message))) break;
      throw err;
    }
    const cut = cancelBacktracksAt(v.id, v.tiles);
    const tokens = Array.from(cut.keep, (i) => token({ id: '', type: v.type[i], slot: v.slot[i], parent: v.parent[i], tiles: 0 }, k, c.level));
    out.unshift({ level: k, raw: v.type.length, tokens, tiles: Array.from(cut.tiles) });
    if (v.type.length > stopAbove) break;
  }
  return { readings: out, readFrom: out[0]?.level ?? c.level - 1 };
}

/** A circuit's visits at a level with each supertile's place in the birth supertile's frame, worked out from the level above's. */
export class Placed {
  private readonly frames = new Map<number, Affine[]>();
  private readonly middles = new Map<string, Pt>();

  constructor(
    readonly cs: CircuitShapes,
    readonly rows: CircuitRows,
  ) {}

  frame(level: number): Affine[] {
    const hit = this.frames.get(level);
    if (hit) return hit;
    const { cs, rows } = this;
    const c = rows.c;
    const v = rows.visits(level);
    let out: Affine[];
    if (level === c.level - 1) out = v.slot.map((s) => cs.childOf(c.level, c.type, s).xform);
    else {
      const above = this.frame(level + 1);
      const types = rows.visits(level + 1).type;
      out = v.up.map((u, i) => mul(above[u], cs.childOf(level + 1, types[u], v.slot[i]).xform));
    }
    this.frames.set(level, out);
    return out;
  }

  /** The middle of a level-n supertile of a type, in its frame. */
  middle(n: number, type: string): Pt {
    const key = `${n} ${type}`;
    let m = this.middles.get(key);
    if (!m) this.middles.set(key, (m = middleOf(this.cs, n, type as HexType)));
    return m;
  }

  /** The line through the middles of the supertiles visited at a level, in order, x, y pairs (open). */
  line(level: number): Float64Array {
    const v = this.rows.visits(level);
    const xf = this.frame(level);
    const out = new Float64Array(2 * v.type.length);
    v.type.forEach((t, i) => {
      const p = transPt(xf[i], this.middle(level, t));
      out[2 * i] = p.x;
      out[2 * i + 1] = p.y;
    });
    return out;
  }
}

const closedLine = (xy: Float64Array): Float64Array => {
  const out = new Float64Array(xy.length + 2);
  out.set(xy);
  out[xy.length] = xy[0];
  out[xy.length + 1] = xy[1];
  return out;
};

/** About `n` of a closed line's points, evenly spaced, still closed. */
function thinned(pts: Float64Array, n: number): Float64Array {
  const m = pts.length / 2 - 1;
  if (m <= n) return pts;
  const out = new Float64Array(2 * n + 2);
  for (let j = 0; j < n; j++) {
    const i = Math.floor((j * m) / n);
    out[2 * j] = pts[2 * i];
    out[2 * j + 1] = pts[2 * i + 1];
  }
  out[2 * n] = out[0];
  out[2 * n + 1] = out[1];
  return out;
}

/** Raw visits at a level from the readings, or none known. */
const rawOf = (readings: readonly Reading[]) => (s: number) => readings.find((r) => r.level === s)?.raw ?? Infinity;

/**
 * A circuit's thumbnail: the line through the middles of the supertiles it
 * visits at the lowest level with at most `budget` visits (the level below
 * its birth at the highest), closed; thinned to `budget` points when that
 * level has more than twice as many.
 */
export function middleThumb(placed: Placed, readings: readonly Reading[], budget: number): { stop: number; pts: Float64Array } {
  const raw = rawOf(readings);
  const c = placed.rows.c;
  let s = c.level - 1;
  while (s > 0 && raw(s - 1) <= budget) s--;
  const pts = closedLine(placed.line(s));
  return { stop: s, pts: pts.length / 2 - 1 > 2 * budget ? thinned(pts, budget) : pts };
}

/**
 * A circuit drawn down to a level for a view, as `HarmonicsEngine.detail`
 * draws one: as fine as `level - 2` while the visits in view stay within
 * about `budget` (and the level has at most `VISIT_CAP`), through the
 * middles of the supertiles visited. Visits out of view are drawn at their
 * supertile at `level`.
 */
export function middleDetail(placed: Placed, readings: readonly Reading[], level: number, view: Box | null, budget: number): { stop: number; pts: Float64Array; capped: boolean } {
  const { cs, rows } = placed;
  const c = rows.c;
  const raw = rawOf(readings);
  let share = 1;
  let inView = (_x: number, _y: number) => true;
  if (view) {
    const o = Array.from({ length: 6 }, (_, j) => cs.corner(c.level, c.type, j));
    const x0 = Math.min(...o.map((p) => p.x)), x1 = Math.max(...o.map((p) => p.x)), y0 = Math.min(...o.map((p) => p.y)), y1 = Math.max(...o.map((p) => p.y));
    const w = Math.max(0, Math.min(x1, view.max.x) - Math.max(x0, view.min.x)), h = Math.max(0, Math.min(y1, view.max.y) - Math.max(y0, view.min.y));
    share = Math.min(1, (4 * w * h) / ((x1 - x0) * (y1 - y0) || 1));
    const mx = (view.max.x - view.min.x) / 2, my = (view.max.y - view.min.y) / 2;
    inView = (x, y) => x >= view.min.x - mx && x <= view.max.x + mx && y >= view.min.y - my && y <= view.max.y + my;
  }
  for (let s = Math.max(0, level - 2); s <= level; s++) {
    if (s < level && (raw(s) * share > budget || raw(s) > VISIT_CAP)) continue;
    const fine = placed.line(s);
    if (s === level || raw(s) <= budget) {
      const pts = closedLine(fine);
      return pts.length / 2 <= 2 * budget ? { stop: s, pts, capped: false } : { stop: s, pts: thinned(pts, budget), capped: true };
    }
    // in view at level s, else the supertile at `level` it lies in
    const coarse = placed.line(level);
    const up: Int32Array[] = [];
    for (let l = s; l < level; l++) up.push(Int32Array.from(rows.visits(l).up));
    const out: number[] = [];
    let last = -1;
    for (let i = 0; i < fine.length / 2; i++) {
      const x = fine[2 * i], y = fine[2 * i + 1];
      if (inView(x, y)) {
        out.push(x, y);
        last = -1;
        continue;
      }
      let a = i;
      for (const u of up) a = u[a];
      if (a === last) continue;
      last = a;
      out.push(coarse[2 * a], coarse[2 * a + 1]);
    }
    out.push(out[0], out[1]);
    return { stop: s, pts: Float64Array.from(out), capped: false };
  }
  throw new Error('no level to draw at');
}

/** The tile a circuit found enters first, as `CircuitShapes.firstTile` gives it: slots from its supertile down, and its chord across that tile. */
export function firstTileOf(cs: CircuitShapes, R: SparseRoutes, c: BornCircuit): { path: [string, number][]; chord: number[] } {
  const s0 = c.steps[0];
  const first = cs.childOf(c.level, c.type, s0 % 8);
  const path: [string, number][] = [[first.type, first.pos]];
  let x = first.xform;
  let ti = typeIndex.get(first.type)!;
  let k = (s0 - (s0 % 8)) / 8;
  for (let n = c.level - 1; n > 0; n--) {
    let got: [number, number, number] | null = null;
    R.enters(n, ti, k, (slot, ct, kk) => {
      got ??= [slot, ct, kk];
    });
    const [slot, ct, kk] = got!;
    path.push([TYPES[ct], slot]);
    x = mul(x, cs.childOf(n, TYPES[ti], slot).xform);
    ti = ct;
    k = kk;
  }
  const leaf = cs.levels[0][TYPES[ti]];
  const p = transPt(x, leaf.pt(k)), q = transPt(x, leaf.pt(leaf.mate(k)));
  return { path, chord: [p.x, p.y, q.x, q.y] };
}
