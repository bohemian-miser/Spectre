/**
 * Exact-arithmetic re-derivation of the spectre substitution.
 *
 * Every point of the spectre tiling lies in Z[zeta12] — integer combinations
 * of {1, d, d^2, d^3} where d = exp(i*pi/6) (Tatham uses exactly this in
 * spectre-internal.h of his puzzle collection: "integer linear combination of
 * {1, d, d^2, d^3}"; necocen/spectre uses the equivalent (i + j*sqrt3)/2 per
 * axis). Rotations by multiples of 30 deg are multiplication by d^k; the
 * substitution's REFLECT_X (x -> -x) is z -> -conj(z) = d^6 * conj(z).
 *
 * This script:
 *   1. recovers exact Z[zeta12] coordinates for SPECTRE_PTS (successive
 *      vertex differences are unit vectors d^k — verified against floats);
 *   2. re-runs core's buildSupertiles transform derivation in exact
 *      arithmetic (mirroring tiles.ts line by line: T_RULES, quad chaining,
 *      pre-multiplied reflection, Gamma pair);
 *   3. walks the exact and float systems side by side and reports the max
 *      absolute error of all 6 affine entries over every leaf transform at
 *      the chosen level;
 *   4. measures float drift on a single deep path (level 16) against the
 *      exact value, and integer coefficient growth per level (bits needed).
 *
 * Run (from web/):
 *   <path-to>/tsx algo-investigation/exact-coords.ts [level]
 */

import {
  IDENT,
  REFLECT_X,
  mul,
  radians,
  transPt,
  trot,
  ttrans,
  type Affine,
  type Pt,
} from '../src/core/geom';
import { SPECTRE_PTS, quadIndices } from '../src/core/families';
import { buildSystem, flatten } from '../src/core/tiles';

// ---------------------------------------------------------------------------
// Z[zeta12] points: p = c0 + c1*d + c2*d^2 + c3*d^3, d = exp(i*pi/6),
// with the reduction d^4 = d^2 - 1 (Phi_12(x) = x^4 - x^2 + 1).
// ---------------------------------------------------------------------------
type ZPoint = readonly [number, number, number, number]; // int coeffs

const Z0: ZPoint = [0, 0, 0, 0];
const Z1: ZPoint = [1, 0, 0, 0];

function zadd(a: ZPoint, b: ZPoint): ZPoint {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
}
function zsub(a: ZPoint, b: ZPoint): ZPoint {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
}
/** multiply by d once: (c0,c1,c2,c3) -> (-c3, c0, c1+c3, c2) */
function zmulD(p: ZPoint): ZPoint {
  return [-p[3], p[0], p[1] + p[3], p[2]];
}
function zrot(p: ZPoint, k: number): ZPoint {
  let r = p;
  const s = ((k % 12) + 12) % 12;
  for (let i = 0; i < s; ++i) r = zmulD(r);
  return r;
}
/** complex conjugate: conj(d) = d^-1 = d^11. conj(c0+c1 d+c2 d^2+c3 d^3) */
function zconj(p: ZPoint): ZPoint {
  // conj(1)=1; conj(d)=d^11=zrot(1,11)... compute via basis images.
  let r: ZPoint = [p[0], 0, 0, 0];
  r = zadd(r, zrot([p[1], 0, 0, 0], 11));
  r = zadd(r, zrot([p[2], 0, 0, 0], 10));
  r = zadd(r, zrot([p[3], 0, 0, 0], 9));
  return r;
}
const SQRT3 = Math.sqrt(3);
/** real/imag parts: Re(d)=sqrt3/2, Re(d^2)=1/2, Re(d^3)=0; Im(d)=1/2, Im(d^2)=sqrt3/2, Im(d^3)=1 */
function zx(p: ZPoint): number {
  return p[0] + (p[1] * SQRT3) / 2 + p[2] / 2;
}
function zy(p: ZPoint): number {
  return p[1] / 2 + (p[2] * SQRT3) / 2 + p[3];
}
/** exact halves representation: x = (x1 + xr3*sqrt3)/2 etc. (for printing) */
function zxExact(p: ZPoint): [number, number] {
  return [2 * p[0] + p[2], p[1]];
}
function zyExact(p: ZPoint): [number, number] {
  return [p[1] + 2 * p[3], p[2]];
}

// ---------------------------------------------------------------------------
// Exact spectre affine transform: T(p) = d^k * conj^m(p) + t.
// Composition matches geom.mul(A, B) = "A after B".
// ---------------------------------------------------------------------------
interface ZAffine {
  readonly k: number; // rotation steps (30 deg units), 0..11
  readonly m: 0 | 1; // mirror (complex conjugation) applied BEFORE rotation
  readonly t: ZPoint;
}
const ZIDENT: ZAffine = { k: 0, m: 0, t: Z0 };
/** REFLECT_X = [-1,0,0, 0,1,0]: (x,y) -> (-x,y) = -conj(z) = d^6*conj(z) */
const ZREFLECT: ZAffine = { k: 6, m: 1, t: Z0 };

function zapply(T: ZAffine, p: ZPoint): ZPoint {
  const q = T.m ? zconj(p) : p;
  return zadd(zrot(q, T.k), T.t);
}
function zmul(A: ZAffine, B: ZAffine): ZAffine {
  // (A o B)(p) = A(B(p))
  const k = (((A.k + (A.m ? -B.k : B.k)) % 12) + 12) % 12;
  const m = (A.m ^ B.m) as 0 | 1;
  const t = zadd(zapply({ k: A.k, m: A.m, t: Z0 }, B.t), A.t);
  return { k, m, t };
}
function ztrans(t: ZPoint): ZAffine {
  return { k: 0, m: 0, t };
}
function zrotAffine(k: number): ZAffine {
  return { k: ((k % 12) + 12) % 12, m: 0, t: Z0 };
}
/** Convert to float Affine (row-major 2x3) for comparison. */
function zToAffine(T: ZAffine): Affine {
  // columns: images of (1,0) and (0,1) minus translation
  const e1 = zapply(T, Z1);
  const e2 = zapply(T, zrot(Z1, 3)); // i = d^3
  const t = T.t;
  const tx = zx(t);
  const ty = zy(t);
  return [zx(e1) - tx, zx(e2) - tx, tx, zy(e1) - ty, zy(e2) - ty, ty];
}

// ---------------------------------------------------------------------------
// 1. Exact SPECTRE_PTS: successive differences must be unit vectors d^k.
// ---------------------------------------------------------------------------
function exactSpectrePts(): ZPoint[] {
  const pts: ZPoint[] = [Z0];
  let acc: ZPoint = Z0;
  let maxErr = 0;
  for (let i = 1; i < SPECTRE_PTS.length; ++i) {
    const dx = SPECTRE_PTS[i].x - SPECTRE_PTS[i - 1].x;
    const dy = SPECTRE_PTS[i].y - SPECTRE_PTS[i - 1].y;
    let best = -1;
    let bestErr = Infinity;
    for (let k = 0; k < 12; ++k) {
      const u = zrot(Z1, k);
      const err = Math.hypot(zx(u) - dx, zy(u) - dy);
      if (err < bestErr) {
        bestErr = err;
        best = k;
      }
    }
    if (bestErr > 1e-9) throw new Error(`vertex ${i}: no unit-vector match (err ${bestErr})`);
    maxErr = Math.max(maxErr, bestErr);
    acc = zadd(acc, zrot(Z1, best));
    pts.push(acc);
  }
  console.log(`1. SPECTRE_PTS exact: all 13 edges are unit vectors d^k (max float err ${maxErr.toExponential(2)})`);
  return pts;
}

// ---------------------------------------------------------------------------
// 2+3. Exact buildSupertiles, run alongside the float system.
// ---------------------------------------------------------------------------
const T_RULES: readonly (readonly [number, number, number])[] = [
  [60, 3, 1],
  [0, 2, 0],
  [60, 3, 1],
  [60, 3, 1],
  [0, 2, 0],
  [60, 3, 1],
  [-120, 3, 3],
];

interface ZSystemLevel {
  /** the 7 child transforms shared by every supertile (after R premul) */
  Ts: ZAffine[];
  /** this level's quad (all supertile types share it) */
  quad: ZPoint[];
}

/** Mirrors tiles.ts buildSupertiles' transform derivation, exactly. */
function buildLevelExact(quad: ZPoint[]): ZSystemLevel {
  const Ts: ZAffine[] = [ZIDENT];
  let totalAng = 0;
  let rotK = 0;
  let tquad = [...quad];
  for (const [ang, from, to] of T_RULES) {
    totalAng += ang;
    if (ang !== 0) {
      if (totalAng % 30 !== 0) throw new Error('non-30-degree rotation');
      rotK = totalAng / 30;
      tquad = quad.map((q) => zrot(q, rotK));
    }
    const prev = zapply(Ts[Ts.length - 1], quad[from]);
    const ttt = ztrans(zsub(prev, tquad[to]));
    Ts.push(zmul(ttt, zrotAffine(rotK)));
  }
  for (let i = 0; i < Ts.length; ++i) Ts[i] = zmul(ZREFLECT, Ts[i]);
  const superQuad = [
    zapply(Ts[6], quad[2]),
    zapply(Ts[5], quad[1]),
    zapply(Ts[3], quad[2]),
    zapply(Ts[0], quad[1]),
  ];
  return { Ts, quad: superQuad };
}

function main(level: number): void {
  const zpts = exactSpectrePts();
  const [qa, qb, qc, qd] = quadIndices('spectre');
  const baseQuad = [zpts[qa], zpts[qb], zpts[qc], zpts[qd]];

  // Gamma pair: Gamma2 xform = ttrans(spectre[8]) o trot(pi/6)  (tiles.ts:87)
  const zGamma2: ZAffine = zmul(ztrans(zpts[8]), zrotAffine(1));
  const fGamma2: Affine = mul(ttrans(SPECTRE_PTS[8].x, SPECTRE_PTS[8].y), trot(Math.PI / 6));

  // Build per-level exact transforms.
  const levels: ZSystemLevel[] = [];
  let quad = baseQuad;
  for (let l = 1; l <= level; ++l) {
    const lv = buildLevelExact(quad);
    levels.push(lv);
    quad = lv.quad;
  }

  // Float system for ground truth.
  const sys = buildSystem('spectre', level);

  // Walk float tree and exact transforms side by side.
  // Child transform at level l>=1 is levels[l-1].Ts[pos]; at level 0 the only
  // meta node is Gamma (children: IDENT and zGamma2).
  let maxErr = 0;
  let count = 0;
  let maxCoeff = 0;
  const walk = (
    node: (typeof sys)[string],
    depth: number, // levels of substitution remaining below this node
    fx: Affine,
    zxf: ZAffine,
  ): void => {
    if (node.kind === 'leaf') {
      const fa = zToAffine(zxf);
      for (let i = 0; i < 6; ++i) maxErr = Math.max(maxErr, Math.abs(fa[i] - fx[i]));
      for (const c of zxf.t) maxCoeff = Math.max(maxCoeff, Math.abs(c));
      ++count;
      return;
    }
    for (const child of node.children) {
      let fchild: Affine;
      let zchild: ZAffine;
      if (depth === 0) {
        // Gamma meta at base level
        fchild = child.pos === 0 ? IDENT : fGamma2;
        zchild = child.pos === 0 ? ZIDENT : zGamma2;
      } else {
        fchild = trotTs(depth)[child.pos];
        zchild = levels[depth - 1].Ts[child.pos];
      }
      walk(child.node, node.kind === 'meta' && depth > 0 ? depth - 1 : 0, mul(fx, fchild), zmul(zxf, zchild));
    }
  };

  // Recompute the float Ts per level the same way tiles.ts does, so the
  // comparison uses core's own numbers. (We re-derive rather than reading
  // them off the tree because TileChild.xform is exactly these Ts.)
  const floatTsCache = new Map<number, Affine[]>();
  function trotTs(depthLevel: number): Affine[] {
    const hit = floatTsCache.get(depthLevel);
    if (hit) return hit;
    // reproduce float quad chain up to depthLevel
    let fquad: Pt[] = [qa, qb, qc, qd].map((i) => SPECTRE_PTS[i]);
    let Ts: Affine[] = [];
    for (let l = 1; l <= depthLevel; ++l) {
      Ts = [IDENT];
      let totalAng = 0;
      let rot: Affine = IDENT;
      let tq = [...fquad];
      for (const [ang, from, to] of T_RULES) {
        totalAng += ang;
        if (ang !== 0) {
          rot = trot(radians(totalAng));
          tq = fquad.map((q) => transPt(rot, q));
        }
        const prev = transPt(Ts[Ts.length - 1], fquad[from]);
        Ts.push(mul(ttrans(prev.x - tq[to].x, prev.y - tq[to].y), rot));
      }
      for (let i = 0; i < Ts.length; ++i) Ts[i] = mul(REFLECT_X, Ts[i]);
      fquad = [
        transPt(Ts[6], fquad[2]),
        transPt(Ts[5], fquad[1]),
        transPt(Ts[3], fquad[2]),
        transPt(Ts[0], fquad[1]),
      ];
    }
    floatTsCache.set(depthLevel, Ts);
    return Ts;
  }

  // Sanity: float Ts derived here must equal the ones inside buildSystem's
  // tree (they are the same code path); verify on the root's children.
  {
    const root = sys['Delta'];
    if (root.kind !== 'meta') throw new Error('root not meta');
    const Ts = trotTs(level);
    let err = 0;
    for (const child of root.children) {
      const a = Ts[child.pos];
      for (let i = 0; i < 6; ++i) err = Math.max(err, Math.abs(a[i] - child.xform[i]));
    }
    if (err > 0) throw new Error(`float Ts rederivation mismatch: ${err}`);
  }

  console.log(`2. exact buildSupertiles derived for levels 1..${level} (all rotations were multiples of 30 deg)`);

  for (const rootLabel of ['Delta', 'Gamma', 'Xi'] as const) {
    maxErr = 0;
    count = 0;
    walk(sys[rootLabel], level, IDENT, ZIDENT);
    console.log(
      `3. root=${rootLabel} level=${level}: ${count} leaf transforms, max |float - exact| = ${maxErr.toExponential(3)}`,
    );
  }
  console.log(`   max |integer coefficient| seen: ${maxCoeff} (${Math.ceil(Math.log2(maxCoeff + 1))} bits)`);

  // 4. Deep-path drift: alternate child slots 5 and 3 for 16 levels
  // (slot 0's transform is the pure reflection, so it has no translation).
  {
    let coeffBits: number[] = [];
    let q = baseQuad;
    let lv: ZSystemLevel;
    let zc: ZAffine = ZIDENT;
    let fc: Affine = IDENT;
    const perLevel: ZAffine[] = [];
    for (let l = 1; l <= 16; ++l) {
      lv = buildLevelExact(q);
      perLevel.push(lv.Ts[l % 2 ? 5 : 3]);
      q = lv.quad;
    }
    // compose root-first (highest level first), like flatten does
    let drift = 0;
    for (let l = 16; l >= 1; --l) {
      const zchild = perLevel[l - 1];
      const fchild = zToAffine(zchild); // floats rounded ONCE per child, like core's tables
      zc = zmul(zc, zchild);
      fc = mul(fc, fchild);
      const exact = zToAffine(zc);
      let e = 0;
      for (let i = 0; i < 6; ++i) e = Math.max(e, Math.abs(exact[i] - fc[i]));
      drift = Math.max(drift, e);
      const bits = Math.ceil(Math.log2(Math.max(...zc.t.map(Math.abs)) + 1));
      coeffBits.push(bits);
      if (l <= 4 || l === 8 || l === 16) {
        // print a few
      }
    }
    const mag = Math.max(Math.abs(zx(zc.t)), Math.abs(zy(zc.t)));
    console.log(
      `4. deep path (16 levels, alternating slots 5/3): cumulative float drift ${drift.toExponential(3)} tile-edge units (relative ${(drift / mag).toExponential(2)})`,
    );
    console.log(`   translation coeff bits by depth: [${coeffBits.join(', ')}]`);
    const t = zc.t;
    console.log(
      `   exact final translation: x=(${zxExact(t)[0]}+${zxExact(t)[1]}*sqrt3)/2, y=(${zyExact(t)[0]}+${zyExact(t)[1]}*sqrt3)/2`,
    );
  }
}

main(Number(process.argv[2] ?? 4));
