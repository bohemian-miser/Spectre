/**
 * The traced strand as pixels, decided exactly.
 *
 * The Explorer draws a strand as one capsule per segment, round-capped,
 * opaque, in order (`webglRenderer.ts`, the trail pass): a pixel shows the
 * last segment whose capsule holds the pixel's centre. A later segment's arc
 * is never below an earlier one's, so "last drawn" is "highest index", and a
 * picture is the per-pixel maximum of the covering segments' indices. A
 * maximum splits over any partition of the segments, which is what lets a
 * picture be assembled from stored tiles and re-walked chunks and still be
 * the picture of the whole strand.
 *
 * Pixels sit on one global lattice per level: pixel `(m, n)` of level `s` has
 * its centre at `((m + 1/2) * 2^s, (n + 1/2) * 2^s)` from the strand's first
 * point, so a pixel is `2^s` tile edges wide. The capsule radius is a
 * rational number of pixels.
 *
 * "Holds the centre" is decided exactly. Lattice points have `y` in
 * `sqrt(3) * Q` and pixel centres are rational, so the distance test is the
 * sign of an element of `Q(sqrt(3))`. Doubles decide it whenever the result
 * clears a bound on their rounding; the rest are settled in BigInt.
 */

import { SQRT3 } from './store';

/** The capsule radius in pixels, `num / den`. */
export interface Radius {
  readonly num: number;
  readonly den: number;
}

/** The Explorer's trail: half of 1.4 px * 1.8 (`BASE_LINE_PX`, `DEFAULT_TRAIL_SCALE`) at one device pixel per CSS pixel. */
export const TRAIL_RADIUS: Radius = { num: 63, den: 50 };

/** A window of the pixel lattice of level `s`: pixels `m0 .. m0 + w - 1` by `n0 .. n0 + h - 1`. */
export interface PixelGrid {
  readonly s: number;
  readonly m0: number;
  readonly n0: number;
  readonly w: number;
  readonly h: number;
}

/** Counts of how pixel decisions were made. */
export interface RasterStats {
  tested: number;
  exact: number;
}

export const newStats = (): RasterStats => ({ tested: 0, exact: 0 });

/** A pixel picture: per pixel, the highest covering segment index, or -1. Row `n - n0`, column `m - m0`. */
export function emptyPicture(g: PixelGrid): Float64Array {
  return new Float64Array(g.w * g.h).fill(-1);
}

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
 * Whether the capsule of segment `A -> B` (relative lattice points) holds the
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

// ---------------------------------------------------------------------------
// Rasterizing
// ---------------------------------------------------------------------------

/**
 * Visit every pixel of level `s` whose centre segment `A -> B`'s capsule
 * holds, within columns `mLo..mHi` and rows `nLo..nHi`. Pixels are visited
 * row by row.
 */
export function segmentPixels(
  ai: number,
  aj: number,
  bi: number,
  bj: number,
  s: number,
  r: Radius,
  clip: { mLo: number; mHi: number; nLo: number; nHi: number },
  visit: (m: number, n: number) => void,
  stats?: RasterStats,
): void {
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
  out: Float64Array,
  r: Radius = TRAIL_RADIUS,
  stats?: RasterStats,
): void {
  const clip = { mLo: g.m0, mHi: g.m0 + g.w - 1, nLo: g.n0, nHi: g.n0 + g.h - 1 };
  for (let k = 0; k < count; k++) {
    const idx = k0 + k;
    segmentPixels(pts[2 * k], pts[2 * k + 1], pts[2 * k + 2], pts[2 * k + 3], g.s, r, clip, (m, n) => {
      out[(n - g.n0) * g.w + (m - g.m0)] = idx;
    }, stats);
  }
}
