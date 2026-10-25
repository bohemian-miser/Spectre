/**
 * Comparing pairings by where their circuits' centres are: the directed
 * chamfer distance between two sets of centre dots.
 *
 * For pairings A and B on the same rooted patch, `chamfer(A → B)` is the
 * average, over A's circuit centres, of the distance to the nearest centre of
 * B. It is directed: if A's dots all sit among B's, A → B is 0 while B → A
 * need not be.
 *
 * Fast: B's dots are drawn onto a grid once and an exact Euclidean distance
 * transform (Felzenszwalb & Huttenlocher, two 1-D lower-envelope passes,
 * linear in the cells) gives every cell the distance to B's nearest dot. Each
 * of A's dots is then one lookup, so a whole n × n matrix costs n transforms
 * plus (total dots × n) lookups, instead of a nearest-neighbour search per
 * dot pair.
 *
 * Size-aware: with `matchSizes`, dots are split into size bands (×4 in
 * length per band) and a dot's distance to a dot k bands away pays an extra
 * `SIZE_STEP · k` world units, so a big circuit's centre is only near another
 * big one. It is a distance in (x, y, size) space, still one lookup per band,
 * and bands too far away to beat the best so far are skipped.
 *
 * Patch edges: circuits cut by the patch edge become open strands and lose
 * their dots, so only A's dots inside an inner mask (a margin in from the
 * patch outline) are averaged; B's dots anywhere are targets.
 *
 * Pure: no DOM, no workers.
 */

import { buildStrandGraph, strandComponents, strandWorkspace, type StrandGraph, type StrandWorkspace } from './strandGraph';
import type { TileFamilyId } from './families';

/** A pairing's closed circuits: centre (average of its points) and length. */
export interface CentreSet {
  readonly xs: Float64Array;
  readonly ys: Float64Array;
  readonly lens: Float64Array;
  readonly n: number;
}

export function circuitCentreSet(g: StrandGraph, digits: readonly number[], ws?: StrandWorkspace): CentreSet {
  const c = strandComponents(g, digits, ws);
  const sx = new Float64Array(c.n);
  const sy = new Float64Array(c.n);
  const nodes = new Int32Array(c.n);
  for (let v = 0; v < g.nNodes; v++) {
    const k = c.comp[v];
    sx[k] += g.nodeX[v];
    sy[k] += g.nodeY[v];
    nodes[k]++;
  }
  const keep: number[] = [];
  for (let k = 0; k < c.n; k++) if (c.ends[k] === 0 && c.junc[k] === 0 && c.segs[k] > 1) keep.push(k);
  const xs = new Float64Array(keep.length);
  const ys = new Float64Array(keep.length);
  const lens = new Float64Array(keep.length);
  keep.forEach((k, i) => {
    xs[i] = sx[k] / nodes[k];
    ys[i] = sy[k] / nodes[k];
    lens[i] = c.segs[k];
  });
  return { xs, ys, lens, n: keep.length };
}

/** A square grid over the patch. */
export interface CentreGrid {
  readonly minX: number;
  readonly minY: number;
  /** World units per cell. */
  readonly h: number;
  readonly size: number;
}

export function gridFor(minX: number, minY: number, maxX: number, maxY: number, size: number): CentreGrid {
  const span = Math.max(maxX - minX, maxY - minY, 1e-9);
  return { minX, minY, h: span / (size - 1), size };
}

export function cellOf(grid: CentreGrid, x: number, y: number): number {
  const i = Math.min(grid.size - 1, Math.max(0, Math.round((x - grid.minX) / grid.h)));
  const j = Math.min(grid.size - 1, Math.max(0, Math.round((y - grid.minY) / grid.h)));
  return j * grid.size + i;
}

const INF = 1e20;

/**
 * Exact squared Euclidean distance transform, in cells², of the marked cells
 * (Felzenszwalb & Huttenlocher 2012): rows, then columns, each a lower
 * envelope of parabolas. `out` is overwritten; unmarked-everywhere gives INF.
 */
export function distanceTransform(marked: Uint8Array, size: number, out = new Float64Array(size * size)): Float64Array {
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);
  const pass = (get: (i: number) => number, set: (i: number, val: number) => void) => {
    for (let q = 0; q < size; q++) f[q] = get(q);
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < size; q++) {
      if (f[q] >= INF) continue;
      if (f[v[k]] >= INF) {
        v[k] = q;
        continue;
      }
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    if (f[v[0]] >= INF) {
      for (let q = 0; q < size; q++) set(q, INF);
      return;
    }
    k = 0;
    for (let q = 0; q < size; q++) {
      while (z[k + 1] < q) k++;
      const dq = q - v[k];
      d[q] = dq * dq + f[v[k]];
    }
    for (let q = 0; q < size; q++) set(q, d[q]);
  };
  for (let j = 0; j < size; j++) {
    const row = j * size;
    pass(
      (i) => (marked[row + i] ? 0 : INF),
      (i, val) => (out[row + i] = val),
    );
  }
  for (let i = 0; i < size; i++) {
    pass(
      (j) => out[j * size + i],
      (j, val) => (out[j * size + i] = val),
    );
  }
  return out;
}

/** Size bands: ×4 in length each. */
export const SIZE_BANDS = 8;
const BAND_WIDTH = Math.log(4);

export function sizeBand(len: number): number {
  return Math.min(SIZE_BANDS - 1, Math.floor(Math.log(1 + len) / BAND_WIDTH));
}

/** World units a dot pays per size band of difference, with `matchSizes`. */
export const SIZE_STEP = 4;

export interface ChamferOptions {
  /** Compare in (x, y, size): a dot k bands away costs `SIZE_STEP · k` more. */
  readonly matchSizes: boolean;
  /** Average with weights ln(1 + length), so big circuits count for more than the sea of small ones. */
  readonly weightBySize: boolean;
}

/** Cells whose dots are averaged: inside the patch and at least `margin` world units from its edge. */
export function innerWindow(
  grid: CentreGrid,
  inside: { xs: ArrayLike<number>; ys: ArrayLike<number> },
  edge: { xs: ArrayLike<number>; ys: ArrayLike<number> },
  margin: number,
): Uint8Array {
  const size = grid.size;
  const mark = (pts: { xs: ArrayLike<number>; ys: ArrayLike<number> }) => {
    const m = new Uint8Array(size * size);
    for (let i = 0; i < pts.xs.length; i++) m[cellOf(grid, pts.xs[i], pts.ys[i])] = 1;
    return m;
  };
  const near = distanceTransform(mark(inside), size);
  const fromEdge = distanceTransform(mark(edge), size);
  const reach = (2 / grid.h) ** 2; // within ~2 world units of some strand point = on the patch
  const m2 = (margin / grid.h) ** 2;
  const out = new Uint8Array(size * size);
  for (let c = 0; c < out.length; c++) out[c] = near[c] <= reach && fromEdge[c] >= m2 ? 1 : 0;
  return out;
}

/**
 * `out[a·n + b]` = directed chamfer distance A → B, in world units, averaged
 * over A's dots inside `mask` (NaN when A has none there).
 */
export function chamferMatrix(
  sets: readonly CentreSet[],
  grid: CentreGrid,
  mask: Uint8Array,
  opts: ChamferOptions,
  onProgress?: (done: number, total: number) => void,
): Float32Array {
  const n = sets.length;
  const size = grid.size;
  const cells = size * size;
  const bands = opts.matchSizes ? SIZE_BANDS : 1;
  // Each set's dots inside the mask: cell, band, weight.
  const dots = sets.map((s) => {
    const cell: number[] = [];
    const band: number[] = [];
    const w: number[] = [];
    for (let i = 0; i < s.n; i++) {
      const c = cellOf(grid, s.xs[i], s.ys[i]);
      if (!mask[c]) continue;
      cell.push(c);
      band.push(opts.matchSizes ? sizeBand(s.lens[i]) : 0);
      w.push(opts.weightBySize ? Math.log(1 + s.lens[i]) : 1);
    }
    const total = w.reduce((a, b) => a + b, 0);
    return { cell: Int32Array.from(cell), band: Uint8Array.from(band), w: Float64Array.from(w), total };
  });
  const out = new Float32Array(n * n);
  const marked = new Uint8Array(cells);
  const dt = Array.from({ length: bands }, () => new Float64Array(cells));
  const present = new Uint8Array(bands);
  const step2 = (SIZE_STEP / grid.h) ** 2; // cells² per band² of difference
  for (let b = 0; b < n; b++) {
    const s = sets[b];
    for (let k = 0; k < bands; k++) {
      marked.fill(0);
      let any = 0;
      for (let i = 0; i < s.n; i++) {
        if (bands > 1 && sizeBand(s.lens[i]) !== k) continue;
        marked[cellOf(grid, s.xs[i], s.ys[i])] = 1;
        any = 1;
      }
      present[k] = any;
      if (any) distanceTransform(marked, size, dt[k]);
    }
    for (let a = 0; a < n; a++) {
      const A = dots[a];
      if (!A.total) {
        out[a * n + b] = NaN;
        continue;
      }
      let sum = 0;
      for (let i = 0; i < A.cell.length; i++) {
        const c = A.cell[i];
        let best = INF;
        if (bands === 1) best = present[0] ? dt[0][c] : INF;
        else {
          const home = A.band[i];
          for (let off = 0; off < bands; off++) {
            const pen = off * off * step2;
            if (pen >= best) break;
            for (const k of off === 0 ? [home] : [home - off, home + off]) {
              if (k < 0 || k >= bands || !present[k]) continue;
              const d2 = dt[k][c] + pen;
              if (d2 < best) best = d2;
            }
          }
        }
        // B has no dots at all: as far as the patch is wide.
        sum += A.w[i] * (best >= INF ? size : Math.sqrt(best));
      }
      out[a * n + b] = (sum / A.total) * grid.h;
    }
    onProgress?.(b + 1, n);
  }
  return out;
}

export interface CentreMapRule {
  readonly subset: readonly number[];
  /** Combination digits, one array per pairing. */
  readonly combos: readonly (readonly number[])[];
}

export interface CentreMap {
  readonly level: number;
  /** Per pairing: how many circuit centres, and how many inside the mask. */
  readonly counts: readonly { readonly all: number; readonly inside: number }[];
  readonly matrix: Float32Array;
}

/** Grid cells across the patch. */
export const CENTRE_GRID = 384;
/** Window margin, as a share of the patch's span. */
export const WINDOW_MARGIN = 0.06;

/** Everything for a survey: centres of every pairing, the mask, and the matrix. */
export function centreMap(
  family: TileFamilyId,
  level: number,
  rules: readonly CentreMapRule[],
  opts: ChamferOptions,
  onProgress?: (phase: 'centres' | 'distances', done: number, total: number) => void,
): CentreMap {
  const total = rules.reduce((t, r) => t + r.combos.length, 0);
  const sets: CentreSet[] = [];
  const insideXs: number[] = [];
  const insideYs: number[] = [];
  const edgeXs: number[] = [];
  const edgeYs: number[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rules) {
    const g = buildStrandGraph(family, r.subset, level);
    const ws = strandWorkspace(g);
    for (let v = 0; v < g.nNodes; v++) {
      const x = g.nodeX[v];
      const y = g.nodeY[v];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      insideXs.push(x);
      insideYs.push(y);
      if (g.nodeDeg[v] === 1) {
        edgeXs.push(x);
        edgeYs.push(y);
      }
    }
    for (const d of r.combos) {
      sets.push(circuitCentreSet(g, d, ws));
      onProgress?.('centres', sets.length, total);
    }
  }
  const grid = gridFor(minX, minY, maxX, maxY, CENTRE_GRID);
  const span = Math.max(maxX - minX, maxY - minY);
  const mask = innerWindow(grid, { xs: insideXs, ys: insideYs }, { xs: edgeXs, ys: edgeYs }, span * WINDOW_MARGIN);
  const matrix = chamferMatrix(sets, grid, mask, opts, (done, n) => onProgress?.('distances', done, n));
  const counts = sets.map((s) => {
    let inside = 0;
    for (let i = 0; i < s.n; i++) if (mask[cellOf(grid, s.xs[i], s.ys[i])]) inside++;
    return { all: s.n, inside };
  });
  return { level, counts, matrix };
}
