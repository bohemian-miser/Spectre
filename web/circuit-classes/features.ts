/**
 * Per-combination features of the strand graph at one level.
 *
 * Everything here is scale-aware, because the four visual classes are really
 * statements about how strands grow as the patch grows:
 *   - fill   = segments of a component / segments expected in its convex hull.
 *              ~1 means the component covers the area it spans (space filling);
 *              -> 0 means it is an outline or a thin thread.
 *   - fat    = |enclosed area| / hull area, for closed components. A triangle
 *              outline encloses most of its hull; a thin doubled-back thread
 *              encloses almost nothing.
 *   - tri    = hull area / smallest enclosing equilateral triangle (1 for a
 *              triangle, 0.667 for a hexagon, 0.605 for a disk).
 *   - elong  = sqrt of the ratio of the covariance eigenvalues.
 */
import {
  strandComponents, strandWorkspace, type StrandGraph, type StrandWorkspace,
} from '../src/core';

export interface CompShape {
  segs: number;
  closed: boolean;
  hullArea: number;
  fill: number;
  fat: number;
  tri: number;
  elong: number;
  rg: number;
}

export interface LevelFeatures {
  level: number;
  tiles: number;
  segTotal: number;
  nComp: number;
  nClosed: number;
  nOpen: number;
  junctions: number;
  lmax: number;
  lmaxClosed: number;
  lmaxOpen: number;
  fracOpen: number;
  fracTop1: number;
  fracTop4: number;
  distinctClosed: number;
  /** Largest few components, closed ones first by size, with shape metrics. */
  top: CompShape[];
  /** Log-binned closed-size histogram: counts of closed comps with segs in [2^k, 2^(k+1)). */
  closedHist: number[];
  /** Fraction of all segments in closed comps with segs in [2^k, 2^(k+1)). */
  closedMass: number[];
}

function hull(xs: number[], ys: number[]): [number, number][] {
  // Akl-Toussaint: drop points strictly inside the octagon of extreme points.
  let idx = xs.map((_, i) => i);
  if (xs.length > 64) {
    const ext = [0, 0, 0, 0, 0, 0, 0, 0];
    const key = [
      (i: number) => xs[i], (i: number) => xs[i] + ys[i], (i: number) => ys[i], (i: number) => ys[i] - xs[i],
      (i: number) => -xs[i], (i: number) => -xs[i] - ys[i], (i: number) => -ys[i], (i: number) => xs[i] - ys[i],
    ];
    for (let i = 0; i < xs.length; i++) for (let k = 0; k < 8; k++) if (key[k](i) > key[k](ext[k])) ext[k] = i;
    const inside = (i: number) => {
      for (let k = 0; k < 8; k++) {
        const a = ext[k], b = ext[(k + 1) % 8];
        if ((xs[b] - xs[a]) * (ys[i] - ys[a]) - (ys[b] - ys[a]) * (xs[i] - xs[a]) <= 0) return false;
      }
      return true;
    };
    idx = idx.filter((i) => !inside(i));
  }
  idx.sort((a, b) => xs[a] - xs[b] || ys[a] - ys[b]);
  const cr = (o: number, a: number, b: number) =>
    (xs[a] - xs[o]) * (ys[b] - ys[o]) - (ys[a] - ys[o]) * (xs[b] - xs[o]);
  const lower: number[] = [], upper: number[] = [];
  for (const i of idx) {
    while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], i) <= 0) lower.pop();
    lower.push(i);
  }
  for (let k = idx.length - 1; k >= 0; k--) {
    const i = idx[k];
    while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], i) <= 0) upper.pop();
    upper.push(i);
  }
  const h = lower.slice(0, -1).concat(upper.slice(0, -1));
  return h.map((i) => [xs[i], ys[i]]);
}

function areaOf(p: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** Hull area over the smallest enclosing equilateral triangle (any rotation). */
function triangularity(h: [number, number][], area: number): number {
  if (h.length < 3 || area <= 0) return 0;
  let best = Infinity;
  for (let s = 0; s < 120; s += 1) {
    const th = (s * Math.PI) / 180;
    let sum = 0;
    for (let k = 0; k < 3; k++) {
      const a = th + (2 * Math.PI * k) / 3;
      const nx = Math.cos(a), ny = Math.sin(a);
      let m = -Infinity;
      for (const [x, y] of h) m = Math.max(m, x * nx + y * ny);
      sum += m;
    }
    // Equilateral triangle with these three support lines: inradius = sum/3.
    const r = sum / 3;
    best = Math.min(best, 3 * Math.sqrt(3) * r * r);
  }
  return area / best;
}

export type Workspace = StrandWorkspace;
export const workspace = strandWorkspace;
export const components = strandComponents;

const TOP_K = 6;

/** Ordered walk of a pure cycle, for the shoelace area. */
function cycleArea(g: StrandGraph, partner: Int32Array, start: number): number {
  let a = 0;
  let node = start;
  let occ = g.nodeOcc[g.nodeOccStart[start]];
  for (;;) {
    const p = partner[occ];
    const next = g.occNode[p];
    a += g.nodeX[node] * g.nodeY[next] - g.nodeX[next] * g.nodeY[node];
    node = next;
    if (node === start) break;
    const k0 = g.nodeOccStart[node];
    occ = g.nodeOcc[k0] === p ? g.nodeOcc[k0 + 1] : g.nodeOcc[k0];
  }
  return Math.abs(a) / 2;
}

export function levelFeatures(g: StrandGraph, digits: readonly number[], ws: Workspace): LevelFeatures {
  const c = components(g, digits, ws);
  let segTotal = 0, openSegs = 0, nClosed = 0, junctions = 0;
  let lmax = 0, lmaxClosed = 0, lmaxOpen = 0;
  const closedLens = new Set<number>();
  const closedHist: number[] = [], closedMass: number[] = [];
  for (let i = 0; i < c.n; i++) {
    const s = c.segs[i];
    segTotal += s;
    junctions += c.junc[i];
    if (s === 0) continue;
    lmax = Math.max(lmax, s);
    if (c.ends[i] > 0) {
      openSegs += s;
      lmaxOpen = Math.max(lmaxOpen, s);
    } else {
      nClosed++;
      lmaxClosed = Math.max(lmaxClosed, s);
      closedLens.add(s);
      const b = Math.floor(Math.log2(s));
      while (closedHist.length <= b) { closedHist.push(0); closedMass.push(0); }
      closedHist[b]++;
      closedMass[b] += s;
    }
  }
  for (let b = 0; b < closedMass.length; b++) closedMass[b] /= segTotal || 1;

  // Pick the largest closed and largest overall components for shape metrics.
  // Largest TOP_K closed components and largest 4 overall, by one linear scan.
  const topClosed: number[] = [], topAll: number[] = [];
  const offer = (list: number[], i: number, k: number) => {
    if (list.length === k && c.segs[list[k - 1]] >= c.segs[i]) return;
    let p = list.length < k ? list.length : k - 1;
    while (p > 0 && c.segs[list[p - 1]] < c.segs[i]) p--;
    list.splice(p, 0, i);
    if (list.length > k) list.pop();
  };
  for (let i = 0; i < c.n; i++) {
    if (c.segs[i] === 0) continue;
    offer(topAll, i, 4);
    if (c.ends[i] === 0) offer(topClosed, i, TOP_K);
  }
  const pick = new Set<number>([...topClosed, ...topAll.slice(0, 3)]);
  const top4 = topAll.reduce((a, i) => a + c.segs[i], 0);

  const slot = new Int32Array(c.n).fill(-1);
  const lists: number[][] = [];
  for (const i of pick) { slot[i] = lists.length; lists.push([]); }
  for (let n = 0; n < g.nNodes; n++) {
    const k = slot[c.comp[n]];
    if (k >= 0) lists[k].push(n);
  }
  const members = new Map([...pick].map((i) => [i, lists[slot[i]]] as const));
  const rho = segTotal / g.patchArea;
  const top: CompShape[] = [];
  for (const i of [...pick].sort((a, b) => c.segs[b] - c.segs[a])) {
    const ns = members.get(i)!;
    const xs = ns.map((n) => g.nodeX[n]), ys = ns.map((n) => g.nodeY[n]);
    const h = hull(xs, ys);
    const ha = Math.abs(areaOf(h));
    const closed = c.ends[i] === 0;
    const pure = closed && c.junc[i] === 0;
    let mx = 0, my = 0;
    for (let k = 0; k < xs.length; k++) { mx += xs[k]; my += ys[k]; }
    mx /= xs.length; my /= xs.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (let k = 0; k < xs.length; k++) {
      const dx = xs[k] - mx, dy = ys[k] - my;
      sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
    }
    sxx /= xs.length; syy /= xs.length; sxy /= xs.length;
    const tr = sxx + syy, det = sxx * syy - sxy * sxy;
    const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    const l1 = tr / 2 + disc, l2 = Math.max(1e-12, tr / 2 - disc);
    top.push({
      segs: c.segs[i],
      closed,
      hullArea: ha,
      fill: ha > 0 ? c.segs[i] / (rho * ha) : 1,
      fat: pure && ha > 0 ? cycleArea(g, c.partner, ns[0]) / ha : -1,
      tri: triangularity(h, ha),
      elong: Math.sqrt(l1 / l2),
      rg: Math.sqrt(tr),
    });
  }

  return {
    level: g.level,
    tiles: g.nTiles,
    segTotal,
    nComp: c.n,
    nClosed,
    nOpen: c.n - nClosed,
    junctions,
    lmax,
    lmaxClosed,
    lmaxOpen,
    fracOpen: openSegs / (segTotal || 1),
    fracTop1: lmax / (segTotal || 1),
    fracTop4: top4 / (segTotal || 1),
    distinctClosed: closedLens.size,
    top,
    closedHist,
    closedMass,
  };
}
