/**
 * The traced strand as pixels, decided exactly.
 *
 * The line has a width in tile edges. Where that is a pixel or more across,
 * a pixel shows the latest segment whose round-capped stroke holds the
 * pixel's centre: the Explorer's own drawing order (`webglRenderer.ts`, the
 * trail pass), where a later segment is never below an earlier one, so
 * "last drawn" is "highest index". Where the line is thinner than a pixel,
 * a pixel is lit by how much strand crosses it: every segment is counted
 * once, in the pixel its midpoint falls in, each worth the area of a strip a
 * width wide and a tile edge long over the pixel. Both are per-pixel maxima
 * and sums, so a picture assembled from stored tiles and re-walked chunks
 * is the picture of the whole strand.
 *
 * Pixels sit on one global lattice per level: pixel `(m, n)` of level `s` has
 * its centre at `((m + 1/2) * 2^s, (n + 1/2) * 2^s)` from the strand's first
 * point, so a pixel is `2^s` tile edges wide. A stroke's half-width is a
 * rational number of pixels.
 *
 * "Holds the centre" is decided exactly. Lattice points have `y` in
 * `sqrt(3) * Q` and pixel centres are rational, so the distance test is the
 * sign of an element of `Q(sqrt(3))`. Doubles decide it whenever the result
 * clears a bound on their rounding; the rest are settled in BigInt.
 */

import { SQRT3 } from './store';

/** A stroke's half-width in pixels, `num / den`. */
export interface Radius {
  readonly num: number;
  readonly den: number;
}

/** The Explorer's trail stroke: half of 1.4 px * 1.8 (`BASE_LINE_PX`, `DEFAULT_TRAIL_SCALE`) at one device pixel per CSS pixel. */
export const TRAIL_RADIUS: Radius = { num: 63, den: 50 };

/** The line's width in tile edges unless a page says otherwise. */
export const DEFAULT_LINE_WIDTH = 0.2;

/** How a level draws: a stroke of half-width `radius`, or coverage, each segment counted in its midpoint's pixel and worth `each` of it. */
export interface Rule {
  readonly mode: 'stroke' | 'coverage';
  readonly radius: Radius;
  readonly each: number;
}

/** The rule for level `s` with a line `width` tile edges wide. */
export function ruleAt(s: number, width = DEFAULT_LINE_WIDTH): Rule {
  const p = 2 ** s;
  const px = width / p;
  if (px >= 1) return { mode: 'stroke', radius: { num: Math.round((px / 2) * 1000), den: 1000 }, each: 0 };
  return { mode: 'coverage', radius: { num: 0, den: 1 }, each: width / (p * p) };
}

/** A stroke of a fixed half-width in pixels, whatever the level. */
export const strokeRule = (radius: Radius): Rule => ({ mode: 'stroke', radius, each: 0 });

/** A window of the pixel lattice of level `s`: pixels `m0 .. m0 + w - 1` by `n0 .. n0 + h - 1`, drawn by `rule`. */
export interface PixelGrid {
  readonly s: number;
  readonly m0: number;
  readonly n0: number;
  readonly w: number;
  readonly h: number;
  readonly rule: Rule;
}

export function pixelGrid(s: number, m0: number, n0: number, w: number, h: number, rule: Rule = ruleAt(s)): PixelGrid {
  return { s, m0, n0, w, h, rule };
}

/** A pixel picture: per pixel the highest covering segment index or -1, and, under coverage, how many segments crossed it. Row `n - n0`, column `m - m0`. */
export interface Picture {
  readonly idx: Float64Array;
  readonly cnt: Uint32Array | null;
}

export function emptyPicture(g: PixelGrid): Picture {
  return { idx: new Float64Array(g.w * g.h).fill(-1), cnt: g.rule.mode === 'coverage' ? new Uint32Array(g.w * g.h) : null };
}

/** Whether two pictures are the same, pixel for pixel; the first differing pixel's index, or -1. */
export function firstDifference(a: Picture, b: Picture): number {
  if (a.idx.length !== b.idx.length) return 0;
  for (let i = 0; i < a.idx.length; i++) {
    if (a.idx[i] !== b.idx[i]) return i;
    if ((a.cnt ? a.cnt[i] : 0) !== (b.cnt ? b.cnt[i] : 0)) return i;
  }
  return -1;
}

/** Counts of how pixel decisions were made. */
export interface RasterStats {
  tested: number;
  exact: number;
}

export const newStats = (): RasterStats => ({ tested: 0, exact: 0 });

const EPS = 2 ** -52;

// ---------------------------------------------------------------------------
// Exact test
// ---------------------------------------------------------------------------

/** Sign of `a + b * sqrt(3)`. */
function signQ3(a: bigint, b: bigint): number {
  const sa = a > 0n ? 1 : a < 0n ? -1 : 0;
  const sb = b > 0n ? 1 : b < 0n ? -1 : 0;
  if (sa >= 0 && sb >= 0) return sa || sb;
  if (sa <= 0 && sb <= 0) return -1;
  const d = a * a - 3n * b * b;
  const sd = d > 0n ? 1 : d < 0n ? -1 : 0;
  return sa > 0 ? sd : -sd;
}

const pow2 = (e: number): bigint => (e >= 0 ? 1n << BigInt(e) : 0n);

/**
 * Whether the stroke of segment `A -> B` (relative lattice points) holds the
 * centre of pixel `(m, n)` of level `s`, in exact arithmetic.
 *
 * Everything is scaled by a unit `g = 2^q` small enough that pixel centres
 * and lattice coordinates are integer multiples: the centre minus `A` is
 * `g * (X, Y - J sqrt(3))`, the segment `g * (Ei, Ej sqrt(3))`.
 */
export function coversExact(ai: number, aj: number, bi: number, bj: number, m: number, n: number, s: number, r: Radius): boolean {
  const q = Math.min(s - 1, -2);
  const up = (k: number, e: number): bigint => BigInt(k) * pow2(e);
  const X = up(2 * m + 1, s - 1 - q) - up(ai, -2 - q);
  const Y = up(2 * n + 1, s - 1 - q);
  const J = up(aj, -2 - q);
  const Ei = up(bi - ai, -2 - q);
  const Ej = up(bj - aj, -2 - q);
  const num = BigInt(r.num);
  const den = BigInt(r.den);
  // r^2 in units of g^2, times den^2: num^2 * 4^(s - q).
  const R2 = num * num * pow2(2 * (s - q));
  const D2 = den * den;
  const t0 = X * Ei - 3n * J * Ej;
  const t1 = Y * Ej;
  const L = Ei * Ei + 3n * Ej * Ej;
  // Distance to an end: |(X', Y - J' sqrt 3)|^2 <= r^2.
  const nearEnd = (x: bigint, j: bigint): boolean =>
    signQ3(D2 * (x * x + Y * Y + 3n * j * j) - R2, -2n * D2 * Y * j) <= 0;
  if (signQ3(t0, t1) <= 0) return nearEnd(X, J);
  if (signQ3(t0 - L, t1) >= 0) return nearEnd(X - Ei, J + Ej);
  // Inside: L |c|^2 - t^2 <= L r^2.
  const c0 = X * X + Y * Y + 3n * J * J;
  const c1 = -2n * Y * J;
  const a = D2 * (L * c0 - t0 * t0 - 3n * t1 * t1) - L * R2;
  const b = D2 * (L * c1 - 2n * t0 * t1);
  return signQ3(a, b) <= 0;
}

/**
 * The pixel of level `s` holding the midpoint of segment `A -> B`: column
 * `floor(x / p)` is exact in doubles (a dyadic rational), and the row, with
 * `y` a multiple of `sqrt(3) / 8`, is checked against its two edges exactly
 * when the double lands within rounding of one.
 */
export function midpointPixel(ai: number, aj: number, bi: number, bj: number, s: number): [number, number] {
  const p = 2 ** s;
  const m = Math.floor((ai + bi) / 8 / p);
  const J = aj + bj;
  const yOverP = (J * SQRT3) / 8 / p;
  let n = Math.floor(yOverP);
  const frac = yOverP - n;
  if (frac < 1e-9 || frac > 1 - 1e-9) {
    // n * p <= J sqrt(3) / 8 < (n + 1) * p, with every term an integer multiple of 2^q.
    const q = Math.min(s + 3, 0);
    const B = BigInt(J) * pow2(-q);
    const edge = (row: number): bigint => BigInt(row) * pow2(s + 3 - q);
    if (signQ3(edge(n), -B) > 0) n--;
    else if (signQ3(edge(n + 1), -B) <= 0) n++;
  }
  return [m, n];
}

// ---------------------------------------------------------------------------
// Rasterizing
// ---------------------------------------------------------------------------

/**
 * Visit every pixel of level `s` that segment `A -> B` lights under `g.rule`:
 * those whose centre its stroke holds, or under coverage the one holding its
 * midpoint, within columns `mLo..mHi` and rows `nLo..nHi`. Pixels are
 * visited row by row.
 */
export function segmentPixels(
  ai: number,
  aj: number,
  bi: number,
  bj: number,
  g: PixelGrid,
  clip: { mLo: number; mHi: number; nLo: number; nHi: number },
  visit: (m: number, n: number) => void,
  stats?: RasterStats,
): void {
  const s = g.s;
  if (g.rule.mode === 'coverage') {
    const [m, n] = midpointPixel(ai, aj, bi, bj, s);
    if (stats) stats.tested++;
    if (m >= clip.mLo && m <= clip.mHi && n >= clip.nLo && n <= clip.nHi) visit(m, n);
    return;
  }
  const r = g.rule.radius;
  const p = 2 ** s;
  const rw = (r.num / r.den) * p;
  const ax = ai / 4;
  const ay = (aj * SQRT3) / 4;
  const bx = bi / 4;
  const by = (bj * SQRT3) / 4;
  // Centres within rw of the segment, plus a pixel of slack for rounding.
  const mLo = Math.max(clip.mLo, Math.floor((Math.min(ax, bx) - rw) / p - 0.5) - 1);
  const mHi = Math.min(clip.mHi, Math.ceil((Math.max(ax, bx) + rw) / p - 0.5) + 1);
  const nLo = Math.max(clip.nLo, Math.floor((Math.min(ay, by) - rw) / p - 0.5) - 1);
  const nHi = Math.min(clip.nHi, Math.ceil((Math.max(ay, by) + rw) / p - 0.5) + 1);
  if (mLo > mHi || nLo > nHi) return;
  const ex = bx - ax;
  const ey = by - ay;
  const L = ex * ex + ey * ey;
  const r2 = rw * rw;
  const elen = Math.sqrt(L);
  // Rounding: every coordinate above is within EPS * magnitude of its true
  // value, and the differences below within 4 EPS * M of theirs.
  const M = Math.abs(ax) + Math.abs(ay) + Math.abs(bx) + Math.abs(by) + p * (Math.abs(mLo) + Math.abs(mHi) + Math.abs(nLo) + Math.abs(nHi) + 2);
  const delta = 8 * EPS * M;
  for (let n = nLo; n <= nHi; n++) {
    const cy = (n + 0.5) * p;
    const dy = cy - ay;
    for (let m = mLo; m <= mHi; m++) {
      const cx = (m + 0.5) * p;
      const dx = cx - ax;
      const t = dx * ex + dy * ey;
      const h = t <= 0 ? 0 : t >= L ? 1 : t / L;
      const qx = dx - ex * h;
      const qy = dy - ey * h;
      const d2 = qx * qx + qy * qy;
      const diff = d2 - r2;
      // A bound on the rounding in d2 - r2: errors of delta in the inputs
      // move the foot of the perpendicular by at most delta (1 + |d| / |e|)
      // and the distance by twice that, then squaring and the arithmetic.
      const dl = Math.sqrt(dx * dx + dy * dy);
      const qe = 4 * delta * (2 + dl / elen);
      const bound = 2 * Math.sqrt(d2) * qe + qe * qe + 16 * EPS * (d2 + r2);
      if (stats) stats.tested++;
      let hit: boolean;
      if (diff > bound) hit = false;
      else if (diff < -bound) hit = true;
      else {
        if (stats) stats.exact++;
        hit = coversExact(ai, aj, bi, bj, m, n, s, r);
      }
      if (hit) visit(m, n);
    }
  }
}

/**
 * Draw segments `first .. first + count - 1` (points `k` and `k + 1` of
 * `pts`, relative lattice `(i, j)` pairs, numbered from `k0`) into a picture,
 * in order, each over the ones before.
 */
export function rasterize(
  pts: Float64Array,
  count: number,
  k0: number,
  g: PixelGrid,
  out: Picture,
  stats?: RasterStats,
): void {
  const clip = { mLo: g.m0, mHi: g.m0 + g.w - 1, nLo: g.n0, nHi: g.n0 + g.h - 1 };
  const { idx, cnt } = out;
  const w = g.w;
  for (let k = 0; k < count; k++) {
    const index = k0 + k;
    segmentPixels(pts[2 * k], pts[2 * k + 1], pts[2 * k + 2], pts[2 * k + 3], g, clip, cnt
      ? (m, n) => { const o = (n - g.n0) * w + (m - g.m0); idx[o] = index; cnt[o]++; }
      : (m, n) => { idx[(n - g.n0) * w + (m - g.m0)] = index; }, stats);
  }
}
