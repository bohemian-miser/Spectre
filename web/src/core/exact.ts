/**
 * Exact Z[zeta12] arithmetic for the spectre substitution
 * (docs/TILE_ALGOS_INVESTIGATION.md section 6, promoted from
 * `web/algo-investigation/exact-coords.ts`).
 *
 * Every vertex of a spectre tiling is an integer linear combination of
 * `{1, d, d^2, d^3}` with `d = exp(i*pi/6)`, reduced by the minimal polynomial
 * `Phi_12(x) = x^4 - x^2 + 1`, i.e. `d^4 = d^2 - 1`. Points are stored as the
 * 4 integer coefficients (a {@link ZVec}); every transform in the substitution
 * system is `p -> d^k * conj^m(p) + t` (a {@link ZAffine}) because all
 * rotations are multiples of 30 degrees and the only reflection is
 * `REFLECT_X = d^6 * conj`.
 *
 * Why this exists (measured in the investigation):
 *  - float composition drifts (1.1e-2 tile-edge units over a 16-level path);
 *    exact composition does not, so deep zoom, world re-anchoring when the
 *    un-rooted ancestor chain grows, and weld/dedup keys are all exact;
 *  - integer coefficients grow ~1.53 bits per substitution level, so plain
 *    JS doubles (exact to 2^53) are safe to roughly level 34 — see
 *    {@link Z_MAX_SAFE_LEVEL} and {@link Z_COEFF_LIMIT}. No BigInt needed.
 *
 * Pure module: imports only sibling core modules, no side effects beyond
 * internal memo tables.
 */

import type { Affine, Pt } from './geom';
import { SPECTRE_PTS, quadIndices } from './families';
import { T_RULES } from './tiles';

// ---------------------------------------------------------------------------
// ZVec — a point of Z[zeta12]
// ---------------------------------------------------------------------------

/**
 * Integer coefficients `[c0, c1, c2, c3]` of `c0 + c1*d + c2*d^2 + c3*d^3`,
 * `d = exp(i*pi/6)`. The complex value maps to the plane as
 * `x = c0 + c1*sqrt(3)/2 + c2/2`, `y = c1/2 + c2*sqrt(3)/2 + c3`.
 */
export type ZVec = readonly [number, number, number, number];

export const Z_ZERO: ZVec = [0, 0, 0, 0];
export const Z_ONE: ZVec = [1, 0, 0, 0];

/**
 * Coefficient magnitude ceiling for exactness. Additions in a composition can
 * at most double magnitudes per step, so staying two bits under 2^53 keeps
 * every intermediate integer exact.
 */
export const Z_COEFF_LIMIT = 2 ** 51;

/**
 * Deepest substitution level with guaranteed exact integer arithmetic in
 * doubles. Coefficients grow ~1.53 bits/level (measured), so level 34 uses
 * ~52 bits; {@link Z_COEFF_LIMIT} is checked at runtime wherever chains grow.
 */
export const Z_MAX_SAFE_LEVEL = 34;

export function zAdd(a: ZVec, b: ZVec): ZVec {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
}

export function zSub(a: ZVec, b: ZVec): ZVec {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
}

export function zNeg(a: ZVec): ZVec {
  return [-a[0], -a[1], -a[2], -a[3]];
}

export function zEq(a: ZVec, b: ZVec): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

/** Multiply by `d` once: `(c0,c1,c2,c3) -> (-c3, c0, c1+c3, c2)` (via d^4 = d^2 - 1). */
export function zMulD(p: ZVec): ZVec {
  return [-p[3], p[0], p[1] + p[3], p[2]];
}

/** Rotate by `k * 30` degrees (multiplication by `d^k`). */
export function zRot(p: ZVec, k: number): ZVec {
  let r = p;
  const s = ((k % 12) + 12) % 12;
  for (let i = 0; i < s; ++i) r = zMulD(r);
  return r;
}

/** Complex conjugation: `conj(d^j) = d^(-j)`. */
export function zConj(p: ZVec): ZVec {
  let r: ZVec = [p[0], 0, 0, 0];
  r = zAdd(r, zRot([p[1], 0, 0, 0], 11));
  r = zAdd(r, zRot([p[2], 0, 0, 0], 10));
  r = zAdd(r, zRot([p[3], 0, 0, 0], 9));
  return r;
}

const HALF_SQRT3 = Math.sqrt(3) / 2;

/** Float x-coordinate of the point (projection to the render plane). */
export function zX(p: ZVec): number {
  return p[0] + p[1] * HALF_SQRT3 + p[2] * 0.5;
}

/** Float y-coordinate of the point. */
export function zY(p: ZVec): number {
  return p[1] * 0.5 + p[2] * HALF_SQRT3 + p[3];
}

export function zToPt(p: ZVec): Pt {
  return { x: zX(p), y: zY(p) };
}

/**
 * Canonical integer key of a point — injective on all of Z[zeta12], so it is
 * safe for welding/dedup at ANY patch span (float keys cap at ~2^26 units).
 */
export function zKey(p: ZVec): string {
  return `${p[0]},${p[1]},${p[2]},${p[3]}`;
}

export function zMaxAbsCoeff(p: ZVec): number {
  return Math.max(Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]), Math.abs(p[3]));
}

// ---------------------------------------------------------------------------
// ZAffine — the exact transforms of the substitution system
// ---------------------------------------------------------------------------

/**
 * `T(p) = d^k * conj^m(p) + t`: rotation by `k * 30` degrees, optional mirror
 * (complex conjugation, applied BEFORE the rotation), then translation.
 * Closed under composition; every transform `buildSupertiles` produces is of
 * this shape (verified by the investigation and by `exact.test.ts`).
 */
export interface ZAffine {
  readonly k: number; // rotation steps in 30-degree units, always 0..11
  readonly m: 0 | 1; // mirror (conjugation) flag
  readonly t: ZVec; // translation
}

export const Z_IDENT: ZAffine = { k: 0, m: 0, t: Z_ZERO };

/** Core's `REFLECT_X` (`(x,y) -> (-x,y)`) is exactly `z -> d^6 * conj(z)`. */
export const Z_REFLECT: ZAffine = { k: 6, m: 1, t: Z_ZERO };

function norm12(k: number): number {
  return ((k % 12) + 12) % 12;
}

export function zTranslation(t: ZVec): ZAffine {
  return { k: 0, m: 0, t };
}

export function zRotation(k: number): ZAffine {
  return { k: norm12(k), m: 0, t: Z_ZERO };
}

export function zApply(T: ZAffine, p: ZVec): ZVec {
  const q = T.m ? zConj(p) : p;
  return zAdd(zRot(q, T.k), T.t);
}

/** Composition matching `geom.mul(A, B)`: apply B first, then A. */
export function zMul(A: ZAffine, B: ZAffine): ZAffine {
  const k = norm12(A.k + (A.m ? -B.k : B.k));
  const m = (A.m ^ B.m) as 0 | 1;
  const rotated = zRot(A.m ? zConj(B.t) : B.t, A.k);
  return { k, m, t: zAdd(rotated, A.t) };
}

/** Exact inverse: `zMul(T, zInv(T))` is `Z_IDENT` with integer equality. */
export function zInv(T: ZAffine): ZAffine {
  if (T.m) {
    // p = d^k * conj(q - t) = d^k conj(q) - d^k conj(t)
    return { k: T.k, m: 1, t: zNeg(zRot(zConj(T.t), T.k)) };
  }
  const k = norm12(-T.k);
  return { k, m: 0, t: zNeg(zRot(T.t, k)) };
}

export function zAffineEq(A: ZAffine, B: ZAffine): boolean {
  return A.k === B.k && A.m === B.m && zEq(A.t, B.t);
}

/** Canonical integer key of a transform (tile identity / dedup). */
export function zAffineKey(T: ZAffine): string {
  return `${T.k}|${T.m}|${zKey(T.t)}`;
}

export function zAffineMaxAbsCoeff(T: ZAffine): number {
  return zMaxAbsCoeff(T.t);
}

/** Project to the float row-major 2x3 `Affine` used by the render pipeline. */
export function zToAffine(T: ZAffine): Affine {
  const c = COS30[T.k];
  const s = SIN30[T.k];
  const tx = zX(T.t);
  const ty = zY(T.t);
  // Linear part = R(30k) * Conj^m, Conj = diag(1, -1).
  return T.m ? [c, s, tx, s, -c, ty] : [c, -s, tx, s, c, ty];
}

/** Exact cos/sin of `k * 30` degrees (values are 0, ±1/2, ±sqrt3/2, ±1). */
export const COS30: readonly number[] = [
  1, HALF_SQRT3, 0.5, 0, -0.5, -HALF_SQRT3, -1, -HALF_SQRT3, -0.5, 0, 0.5, HALF_SQRT3,
];
export const SIN30: readonly number[] = [
  0, 0.5, HALF_SQRT3, 1, HALF_SQRT3, 0.5, 0, -0.5, -HALF_SQRT3, -1, -HALF_SQRT3, -0.5,
];

// ---------------------------------------------------------------------------
// Exact spectre base geometry
// ---------------------------------------------------------------------------

let spectrePtsCache: readonly ZVec[] | null = null;

/**
 * Exact Z[zeta12] coordinates of `SPECTRE_PTS`: the outline is a closed walk
 * of 14 unit steps, each a `d^k`. Recovered from the float table by matching
 * every edge against the 12 unit vectors (max float deviation 8e-16, checked
 * here with a 1e-9 gate — the derivation throws if the family table changes).
 */
export function zSpectrePts(): readonly ZVec[] {
  if (spectrePtsCache) return spectrePtsCache;
  const pts: ZVec[] = [Z_ZERO];
  let acc: ZVec = Z_ZERO;
  for (let i = 1; i < SPECTRE_PTS.length; ++i) {
    const dx = SPECTRE_PTS[i].x - SPECTRE_PTS[i - 1].x;
    const dy = SPECTRE_PTS[i].y - SPECTRE_PTS[i - 1].y;
    let best = -1;
    let bestErr = Infinity;
    for (let k = 0; k < 12; ++k) {
      const err = Math.hypot(COS30[k] - dx, SIN30[k] - dy);
      if (err < bestErr) {
        bestErr = err;
        best = k;
      }
    }
    if (bestErr > 1e-9) throw new Error(`SPECTRE_PTS[${i}]: edge is not a unit d^k (err ${bestErr})`);
    acc = zAdd(acc, zRot(Z_ONE, best));
    pts.push(acc);
  }
  spectrePtsCache = pts;
  return pts;
}

/** Exact quad (key points 3, 5, 7, 11) of the spectre leaf. */
export function zSpectreQuad(): readonly ZVec[] {
  const pts = zSpectrePts();
  const [a, b, c, d] = quadIndices('spectre');
  return [pts[a], pts[b], pts[c], pts[d]];
}

/**
 * Exact transform of the `Gamma2` leaf inside the base Gamma (Mystic) pair:
 * `ttrans(spectre[8]) o trot(pi/6)` from `buildSpectreBase`.
 */
export function zGamma2Xform(): ZAffine {
  return zMul(zTranslation(zSpectrePts()[8]), zRotation(1));
}

// ---------------------------------------------------------------------------
// Exact substitution transforms (the shared Ts of buildSupertiles, per level)
// ---------------------------------------------------------------------------

interface ZLevel {
  readonly Ts: readonly ZAffine[]; // 8 shared child transforms (slot 0..7)
  readonly quad: readonly ZVec[];
}

const levelCache: ZLevel[] = [];

function buildLevel(quad: readonly ZVec[]): ZLevel {
  const Ts: ZAffine[] = [Z_IDENT];
  let totalAng = 0;
  let rotK = 0;
  let tquad = [...quad];
  for (const [ang, from, to] of T_RULES) {
    totalAng += ang;
    if (ang !== 0) {
      if (totalAng % 30 !== 0) throw new Error('substitution rotation is not a multiple of 30 deg');
      rotK = totalAng / 30;
      tquad = quad.map((q) => zRot(q, rotK));
    }
    const prev = zApply(Ts[Ts.length - 1], quad[from]);
    Ts.push(zMul(zTranslation(zSub(prev, tquad[to])), zRotation(rotK)));
  }
  for (let i = 0; i < Ts.length; ++i) Ts[i] = zMul(Z_REFLECT, Ts[i]);
  const superQuad = [
    zApply(Ts[6], quad[2]),
    zApply(Ts[5], quad[1]),
    zApply(Ts[3], quad[2]),
    zApply(Ts[0], quad[1]),
  ];
  return { Ts, quad: superQuad };
}

function levelOf(level: number): ZLevel {
  if (level < 1 || !Number.isInteger(level)) throw new Error(`invalid substitution level ${level}`);
  while (levelCache.length < level) {
    const prevQuad = levelCache.length === 0 ? zSpectreQuad() : levelCache[levelCache.length - 1].quad;
    levelCache.push(buildLevel(prevQuad));
  }
  return levelCache[level - 1];
}

/**
 * The 8 shared child transforms of substitution level `level >= 1`, exactly —
 * the integer twin of the `Ts` array `buildSupertiles` derives (reflection R
 * pre-multiplied, indexed by child slot / `TileChild.pos`). `Ts[slot]` maps a
 * level-`level - 1` child's local frame into its level-`level` parent's frame.
 * Memoized; identical for every parent type (only the type labels differ).
 */
export function zSupertileTransforms(level: number): readonly ZAffine[] {
  return levelOf(level).Ts;
}

/** Exact quad of a level-`level` supertile (all types share it). */
export function zSupertileQuad(level: number): readonly ZVec[] {
  return level === 0 ? zSpectreQuad() : levelOf(level).quad;
}
