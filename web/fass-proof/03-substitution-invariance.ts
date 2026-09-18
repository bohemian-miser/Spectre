/**
 * Lemma 3 (the CRUX): is the substitution's strand composition level-independent?
 *
 * Everything else in the FASS proof reduces to this. The claim under test, for
 * each supertile type T and level k:
 *
 *   (a) |dB(T,k)|, the number of connection dots on the boundary of the level-k
 *       supertile, is constant in k;
 *   (b) under a canonical labelling of those dots, the GLUING map (which child
 *       boundary dot welds to which sibling boundary dot inside the parent) and
 *       the OUTER map (which child boundary dots survive as parent boundary
 *       dots) are constant in k;
 *   (c) hence routing(T,k+1) = F_T(routings of the children at level k) with
 *       F_T a FIXED function, so the whole result follows by iterating a fixed
 *       map on a finite state space.
 *
 * docs/FASS_1278.md section 4.4 justifies (b) by saying it is "structurally
 * pinned by the level-independent child transforms of buildSupertiles".
 * PART 1 shows in exact integer arithmetic that this justification is FALSE:
 * `buildSupertiles` recomputes Ts from each level's own quad, the quads are not
 * similar across levels, and the Ts are not conjugate across levels. What IS
 * level-independent is only the rotation/mirror part of each Ts.
 *
 * PART 2 extracts the combinatorial substitution datum exactly, per level, by
 * exact edge cancellation over Z[zeta12] integer keys (no floats anywhere), and
 * tests (a) and (b).
 *
 * PART 3 hunts for a genuinely inductive invariant. Three of the candidates the
 * brief proposes are REFUTED here; the one that survives is a substitution on
 * the four quad-to-quad ARCS of a supertile boundary, and the level-
 * independence of the quad-point incidence pattern underneath it is PROVED for
 * all k by a Cayley-Hamilton argument on the exact semilinear quad recursion.
 *
 * PART 4 states exactly what is proved, what is checked to finite k, what is
 * assumed, and the single crisp gap that remains.
 *
 * Run: cd web && npx --yes tsx fass-proof/03-substitution-invariance.ts [maxLevel] [validateLevel]
 */

import {
  SUPER_RULES,
  T_RULES,
  edgeLabels,
  parseEdgeLabel,
  zAdd,
  zApply,
  zKey,
  zLeafPts,
  zSub,
  zSupertileQuad,
  zSupertileTransforms,
  zToPt,
  Z_ONE,
  zRot,
  type TileFamilyId,
  type TileTypeId,
  type ZAffine,
  type ZVec,
} from '../src/core';
import { CONFIGS, buildStrands, heading, pad, trace, verdict, zExpand, type Config } from './lib';

const MAX = Number(process.argv[2] ?? 6);
const VALIDATE = Number(process.argv[3] ?? 4);
/** Levels used for the cheap exact quad-incidence sweep (coefficients stay exact to ~34). */
const DEEP = 24;

const TYPES: readonly TileTypeId[] = [
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi',
];
const FAMILIES: readonly TileFamilyId[] = ['hex', 'spectre'];

let allOk = true;
const ok = (b: boolean, label: string, detail = ''): boolean => {
  allOk = verdict(b, label, detail) && allOk;
  return b;
};
const note = (label: string, detail = ''): void => {
  console.log(`  [INFO] ${label}${detail ? '  — ' + detail : ''}`);
};
const refuted = (label: string, detail = ''): void => {
  console.log(`  [REFUTED] ${label}${detail ? '  — ' + detail : ''}`);
};

// ===========================================================================
// PART 0 — exact ring arithmetic in Z[zeta12], with BigInt headroom
// ===========================================================================

/** `c0 + c1 d + c2 d^2 + c3 d^3`, d = exp(i*pi/6), d^4 = d^2 - 1. */
type BVec = readonly [bigint, bigint, bigint, bigint];

const B_ZERO: BVec = [0n, 0n, 0n, 0n];
const B_ONE: BVec = [1n, 0n, 0n, 0n];

/** d^p for p = 0..6, reduced into the basis (d^4 = d^2 - 1, d^6 = -1). */
const B_POW: readonly BVec[] = [
  [1n, 0n, 0n, 0n],
  [0n, 1n, 0n, 0n],
  [0n, 0n, 1n, 0n],
  [0n, 0n, 0n, 1n],
  [-1n, 0n, 1n, 0n],
  [0n, -1n, 0n, 1n],
  [-1n, 0n, 0n, 0n],
];

function toB(v: ZVec): BVec {
  return [BigInt(v[0]), BigInt(v[1]), BigInt(v[2]), BigInt(v[3])];
}

function bAdd(a: BVec, b: BVec): BVec {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
}
function bSub(a: BVec, b: BVec): BVec {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
}
function bNeg(a: BVec): BVec {
  return [-a[0], -a[1], -a[2], -a[3]];
}
function bMul(a: BVec, b: BVec): BVec {
  const c = [0n, 0n, 0n, 0n];
  for (let i = 0; i < 4; i++) {
    if (a[i] === 0n) continue;
    for (let j = 0; j < 4; j++) {
      if (b[j] === 0n) continue;
      const p = B_POW[i + j];
      const s = a[i] * b[j];
      c[0] += s * p[0];
      c[1] += s * p[1];
      c[2] += s * p[2];
      c[3] += s * p[3];
    }
  }
  return [c[0], c[1], c[2], c[3]];
}
/** conj(a0 + a1 d + a2 d^2 + a3 d^3) = (a0+a2) + a1 d - a2 d^2 - (a1+a3) d^3. */
function bConj(a: BVec): BVec {
  return [a[0] + a[2], a[1], -a[2], -a[1] - a[3]];
}
function bRot(a: BVec, k: number): BVec {
  const s = ((k % 12) + 12) % 12;
  let r = a;
  for (let i = 0; i < s; i++) r = bMul(r, B_POW[1]);
  return r;
}
function bIsZero(a: BVec): boolean {
  return a[0] === 0n && a[1] === 0n && a[2] === 0n && a[3] === 0n;
}
function bStr(a: BVec): string {
  return `[${a[0]}, ${a[1]}, ${a[2]}, ${a[3]}]`;
}

const HALF_SQRT3 = Math.sqrt(3) / 2;
function bAbs(a: BVec): number {
  const c = [Number(a[0]), Number(a[1]), Number(a[2]), Number(a[3])];
  return Math.hypot(c[0] + c[1] * HALF_SQRT3 + c[2] * 0.5, c[1] * 0.5 + c[2] * HALF_SQRT3 + c[3]);
}

/** 3x3 determinant over the commutative ring Z[zeta12]. */
function bDet3(m: readonly BVec[][]): BVec {
  let acc = B_ZERO;
  const term = (i: number, j: number, k: number, sign: boolean): void => {
    const t = bMul(bMul(m[0][i], m[1][j]), m[2][k]);
    acc = sign ? bAdd(acc, t) : bSub(acc, t);
  };
  term(0, 1, 2, true);
  term(1, 2, 0, true);
  term(2, 0, 1, true);
  term(2, 1, 0, false);
  term(0, 2, 1, false);
  term(1, 0, 2, false);
  return acc;
}

// ===========================================================================
// PART 1 — the substitution is NOT a similarity, exactly
// ===========================================================================

function part1RotationParts(family: TileFamilyId, maxLevel: number): void {
  const sig = (Ts: readonly ZAffine[]): string => Ts.map((T) => `${T.k}${T.m ? 'm' : ''}`).join(' ');
  const base = sig(zSupertileTransforms(family, 1));
  let same = true;
  for (let lv = 2; lv <= maxLevel; lv++) if (sig(zSupertileTransforms(family, lv)) !== base) same = false;
  console.log(`  ${family}: rotation|mirror word of Ts[0..7] = ${base}`);
  ok(
    same,
    `${family}: the rotation and mirror parts of Ts are identical at every level`,
    `PROVED for all k — buildLevel derives rotK from T_RULES alone, never from the quad; re-checked 1..${maxLevel}`,
  );
  const t1 = zSupertileTransforms(family, 1).map((T) => zKey(T.t)).join(' ');
  let transSame = true;
  for (let lv = 2; lv <= maxLevel; lv++) {
    if (zSupertileTransforms(family, lv).map((T) => zKey(T.t)).join(' ') !== t1) transSame = false;
  }
  ok(!transSame, `${family}: the TRANSLATIONS of Ts DO change with the level`, 'so Ts itself is level-dependent');
}

/**
 * Exact test: is the level-k quad a similar image of the level-(k-1) quad?
 *
 * A direct similarity is z -> alpha z + beta, so Q'[i] - Q'[0] = alpha (Q[i] - Q[0]).
 * Eliminating alpha by cross-multiplication keeps everything in the ring:
 *     (Q'[i]-Q'[0]) * (Q[j]-Q[0]) - (Q'[j]-Q'[0]) * (Q[i]-Q[0]) = 0.
 * The mirror variant conjugates the Q side. No division, no floats.
 */
function quadSimilarityResidual(
  Q: readonly ZVec[],
  Qp: readonly ZVec[],
  mirror: boolean,
): { zero: boolean; worst: BVec; worstAbs: number } {
  const u: BVec[] = [];
  const v: BVec[] = [];
  for (let i = 1; i < 4; i++) {
    const a = toB(zSub(Q[i], Q[0]));
    u.push(mirror ? bConj(a) : a);
    v.push(toB(zSub(Qp[i], Qp[0])));
  }
  let worst: BVec = B_ZERO;
  let worstAbs = 0;
  let zero = true;
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const r = bSub(bMul(v[i], u[j]), bMul(v[j], u[i]));
      if (!bIsZero(r)) zero = false;
      const a = bAbs(r);
      if (a > worstAbs) {
        worstAbs = a;
        worst = r;
      }
    }
  }
  return { zero, worst, worstAbs };
}

/**
 * Exact test of the conjugacy hypothesis on the child transforms themselves.
 *
 * Every Ts[j] has the shape  z -> d^{a_j} conj(z) + t_j  (the reflection is
 * pre-multiplied, so the mirror flag is 1 in every slot). Conjugating by
 * similarities S(z) = alpha z + beta and S'(z) = alpha' z + beta' gives
 *   S' Ts[j] S^{-1}(z) = (alpha'/conj(alpha)) d^{a_j} conj(z)
 *                        + [alpha' t_j - (alpha'/conj(alpha)) d^{a_j} conj(beta) + beta'].
 * Matching the linear part against d^{a'_j} = d^{a_j} (PART 1's first result)
 * forces alpha' = conj(alpha), and then with A = conj(alpha), g = conj(beta),
 * e = beta',
 *     t'_j = A t_j - d^{a_j} g + e                        for every slot j,
 * a linear system over Q(zeta12) in three unknowns. Solve it from three slots by
 * Cramer (determinant and numerators all stay in the ring) and test the other
 * slots by cross-multiplication with the determinant: division-free and exact.
 */
function conjugacyResidual(
  Ts: readonly ZAffine[],
  Tsp: readonly ZAffine[],
): { solvable: boolean; firstBad: number; residual: BVec; residAbs: number } {
  const dPow = (k: number): BVec => toB(zRot(Z_ONE, ((k % 12) + 12) % 12));
  const rows: BVec[][] = [];
  const rhs: BVec[] = [];
  for (let j = 0; j < 8; j++) {
    rows.push([toB(Ts[j].t), bNeg(dPow(Ts[j].k)), B_ONE]);
    rhs.push(toB(Tsp[j].t));
  }
  let pick: [number, number, number] | null = null;
  let det: BVec = B_ZERO;
  outer: for (let a = 0; a < 8; a++) {
    for (let b = a + 1; b < 8; b++) {
      for (let c = b + 1; c < 8; c++) {
        const d = bDet3([rows[a], rows[b], rows[c]]);
        if (!bIsZero(d)) {
          pick = [a, b, c];
          det = d;
          break outer;
        }
      }
    }
  }
  if (!pick) return { solvable: false, firstBad: -1, residual: B_ZERO, residAbs: 0 };
  const [ia, ib, ic] = pick;
  const b3: BVec[] = [rhs[ia], rhs[ib], rhs[ic]];
  const col = (idx: number): BVec[] => [rows[ia][idx], rows[ib][idx], rows[ic][idx]];
  const withCol = (idx: number): BVec[][] => {
    const c0 = idx === 0 ? b3 : col(0);
    const c1 = idx === 1 ? b3 : col(1);
    const c2 = idx === 2 ? b3 : col(2);
    return [[c0[0], c1[0], c2[0]], [c0[1], c1[1], c2[1]], [c0[2], c1[2], c2[2]]];
  };
  const numA = bDet3(withCol(0));
  const numG = bDet3(withCol(1));
  const numE = bDet3(withCol(2));
  for (let j = 0; j < 8; j++) {
    const lhs = bMul(det, rhs[j]);
    const rv = bAdd(bSub(bMul(numA, rows[j][0]), bMul(dPow(Ts[j].k), numG)), numE);
    const r = bSub(lhs, rv);
    if (!bIsZero(r)) return { solvable: false, firstBad: j, residual: r, residAbs: bAbs(r) };
  }
  return { solvable: true, firstBad: -1, residual: B_ZERO, residAbs: 0 };
}

function part1(family: TileFamilyId, maxLevel: number): void {
  heading(`PART 1 — ${family}: is the substitution exactly self-similar? (exact integer test)`);
  part1RotationParts(family, maxLevel);

  const aMod6 = new Set(zSupertileTransforms(family, 1).map((T) => T.k % 6));
  ok(
    aMod6.size > 1,
    `${family}: an ANTI-similarity conjugation S(z) = alpha conj(z) + beta is impossible for all k`,
    `slot rotations mod 6 are {${[...aMod6].sort().join(',')}}; matching the linear parts would need alpha'/conj(alpha) = d^{2 a_j} for every slot at once`,
  );

  console.log('\n  quad-similarity residual  Q_k  vs  Q_{k-1}   (exact ring element; 0 would mean similar)');
  console.log('  | k | direct residual | abs | mirror residual | abs | |alpha| | arg(alpha) deg |');
  console.log('  |---|---|---|---|---|---|---|');
  let anySimilar = false;
  const directResiduals: string[] = [];
  for (let k = 1; k <= maxLevel; k++) {
    const Q = zSupertileQuad(family, k - 1);
    const Qp = zSupertileQuad(family, k);
    const dir = quadSimilarityResidual(Q, Qp, false);
    const mir = quadSimilarityResidual(Q, Qp, true);
    if (dir.zero || mir.zero) anySimilar = true;
    directResiduals.push(bStr(dir.worst));
    const p0 = zToPt(zSub(Q[1], Q[0]));
    const p1 = zToPt(zSub(Qp[1], Qp[0]));
    const den = p0.x * p0.x + p0.y * p0.y;
    const re = (p1.x * p0.x + p1.y * p0.y) / den;
    const im = (p1.y * p0.x - p1.x * p0.y) / den;
    console.log(
      `  | ${k} | ${bStr(dir.worst)} | ${dir.worstAbs.toFixed(4)} | ${bStr(mir.worst)} | ${mir.worstAbs.toExponential(3)} | ${Math.hypot(re, im).toFixed(9)} | ${((Math.atan2(im, re) * 180) / Math.PI).toFixed(6)} |`,
    );
  }
  ok(
    !anySimilar,
    `${family}: the level-k quad is NEVER an exact similar image of the level-(k-1) quad`,
    `levels 1..${maxLevel}; every exact integer residual above is non-zero`,
  );
  const distinctDirect = new Set(directResiduals);
  note(
    `${family}: the direct similarity DEFECT takes only ${distinctDirect.size} value(s) over levels 1..${maxLevel}`,
    `{${[...distinctDirect].join(' , ')}} — a bounded non-zero constant while the quad itself inflates by 2.806 per level, which is why the RATIO converges without the defect ever vanishing`,
  );

  console.log("\n  Ts conjugacy residual   Ts^(k+1) =?= S' . Ts^(k) . S^-1  (slot-preserving, plane similarities)");
  console.log('  | k -> k+1 | solvable | first bad slot | residual | abs |');
  console.log('  |---|---|---|---|---|');
  let anyConj = false;
  for (let k = 1; k < maxLevel; k++) {
    const r = conjugacyResidual(zSupertileTransforms(family, k), zSupertileTransforms(family, k + 1));
    if (r.solvable) anyConj = true;
    console.log(`  | ${k} -> ${k + 1} | ${r.solvable ? 'YES' : 'no'} | ${r.firstBad} | ${bStr(r.residual)} | ${r.residAbs.toFixed(4)} |`);
  }
  ok(
    !anyConj,
    `${family}: Ts^(k+1) is NOT conjugate to Ts^(k) by ANY pair of plane similarities`,
    'the linear system in (A, g, e) over Q(zeta12) is inconsistent at every step, in exact integer arithmetic',
  );

  const lam = 4 + Math.sqrt(15);
  const K = Math.min(maxLevel, 12);
  const Q = zSupertileQuad(family, K - 1);
  const Qp = zSupertileQuad(family, K);
  const ratios: { r: number; a: number }[] = [];
  for (let i = 1; i < 4; i++) {
    const p0 = zToPt(zSub(Q[i], Q[0]));
    const p1 = zToPt(zSub(Qp[i], Qp[0]));
    const den = p0.x * p0.x + p0.y * p0.y;
    const re = (p1.x * p0.x + p1.y * p0.y) / den;
    const im = (p1.y * p0.x - p1.x * p0.y) / den;
    ratios.push({ r: Math.hypot(re, im), a: (Math.atan2(im, re) * 180) / Math.PI });
  }
  const spread = Math.max(...ratios.map((x) => x.r)) - Math.min(...ratios.map((x) => x.r));
  console.log(`\n  at k = ${K}: per-edge |alpha| = ${ratios.map((x) => x.r.toFixed(9)).join(', ')}  (spread ${spread.toExponential(3)})`);
  console.log(`            per-edge arg(alpha) = ${ratios.map((x) => x.a.toFixed(6)).join(', ')} deg`);
  console.log(`            sqrt(4+sqrt(15)) = ${Math.sqrt(lam).toFixed(9)}, tile growth 4+sqrt(15) = ${lam.toFixed(9)}`);
  ok(
    spread > 0,
    `${family}: the three quad edges scale by DIFFERENT factors, so no single similarity fits`,
    `spread ${spread.toExponential(3)} at k = ${K} (shrinking with k, never 0)`,
  );
}

// ===========================================================================
// PART 2 — the combinatorial substitution datum, exactly, per level
// ===========================================================================

interface BEdge {
  readonly a: ZVec;
  readonly b: ZVec;
  /** Raw edge label of the leaf owning this physical edge, e.g. '-5.1A'. */
  readonly label: string;
}
interface Bnd {
  /** Boundary edges in canonical loop order; edges[i].b === edges[i+1].a. */
  readonly edges: readonly BEdge[];
  /**
   * Loop index of each quad point, or -1 when that quad point is INTERIOR to the
   * patch (the only case in these two families is quad[2] of the spectre
   * family's level-0 composite Gamma, which sits inside the Gamma1/Gamma2 seam).
   * quadAt[0] === 0 by construction.
   */
  readonly quadAt: readonly [number, number, number, number];
}

function ekey(a: ZVec, b: ZVec): string {
  const ka = zKey(a);
  const kb = zKey(b);
  return ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
}

interface Placed {
  readonly slot: number;
  readonly idx: number;
  readonly e: BEdge;
}

/**
 * Cancel a pool of physical edges (each appearing once or twice) and chain the
 * survivors into one loop, anchored at quad[0] and oriented so that quad[1] is
 * reached before quad[3]. That direction rule is chirality-stable, which is
 * required because `buildSupertiles` pre-multiplies a reflection and so mirrors
 * every level relative to the previous one. Entirely exact: edges are keyed by
 * their integer Z[zeta12] endpoints.
 */
function cancelAndLoop(
  pool: readonly Placed[],
  quad: readonly ZVec[],
  tag: string,
): { bnd: Bnd; prov: readonly Placed[]; cancelled: readonly (readonly [Placed, Placed])[] } {
  const byKey = new Map<string, Placed[]>();
  for (const p of pool) {
    const k = ekey(p.e.a, p.e.b);
    const hit = byKey.get(k);
    if (hit) hit.push(p);
    else byKey.set(k, [p]);
  }
  const survivors: Placed[] = [];
  const cancelled: (readonly [Placed, Placed])[] = [];
  for (const group of byKey.values()) {
    if (group.length === 1) survivors.push(group[0]);
    else if (group.length === 2) cancelled.push([group[0], group[1]]);
    else throw new Error(`${tag}: an edge is used by ${group.length} tiles`);
  }

  const nbr = new Map<string, { to: string; p: Placed }[]>();
  const coord = new Map<string, ZVec>();
  for (const p of survivors) {
    const ka = zKey(p.e.a);
    const kb = zKey(p.e.b);
    coord.set(ka, p.e.a);
    coord.set(kb, p.e.b);
    if (!nbr.has(ka)) nbr.set(ka, []);
    if (!nbr.has(kb)) nbr.set(kb, []);
    nbr.get(ka)!.push({ to: kb, p });
    nbr.get(kb)!.push({ to: ka, p });
  }
  for (const [k, v] of nbr) {
    if (v.length !== 2) throw new Error(`${tag}: boundary vertex ${k} has degree ${v.length}`);
  }
  const q0 = zKey(quad[0]);
  if (!nbr.has(q0)) throw new Error(`${tag}: quad[0] is not a boundary vertex`);

  const order: { from: string; p: Placed }[] = [];
  let cur = q0;
  for (;;) {
    const opts = nbr.get(cur)!;
    const last = order.length ? order[order.length - 1].p : null;
    const step = opts.find((o) => o.p !== last) ?? opts[0];
    order.push({ from: cur, p: step.p });
    cur = step.to;
    if (cur === q0) break;
    if (order.length > survivors.length + 1) throw new Error(`${tag}: outline did not close`);
  }
  if (order.length !== survivors.length) {
    throw new Error(`${tag}: ${order.length} of ${survivors.length} boundary edges — multiple loops`);
  }

  const n = order.length;
  const findVertex = (z: ZVec): number => {
    const k = zKey(z);
    for (let i = 0; i < n; i++) if (order[i].from === k) return i;
    return -1;
  };
  const i1 = findVertex(quad[1]);
  const i3 = findVertex(quad[3]);
  if (i1 < 0 || i3 < 0) throw new Error(`${tag}: quad[1] or quad[3] is not a boundary vertex`);
  const forward = i1 < i3;

  const seq: { from: string; p: Placed }[] = forward
    ? order
    : Array.from({ length: n }, (_, i) => {
        const j = (n - i) % n;
        return { from: order[j % n].from, p: order[(j - 1 + n) % n].p };
      });

  const edges: BEdge[] = [];
  const prov: Placed[] = [];
  for (let i = 0; i < n; i++) {
    const a = coord.get(seq[i].from)!;
    const p = seq[i].p;
    const b = zKey(p.e.a) === seq[i].from ? p.e.b : p.e.a;
    edges.push({ a, b, label: p.e.label });
    prov.push(p);
  }
  for (let i = 0; i < n; i++) {
    if (zKey(edges[i].b) !== zKey(edges[(i + 1) % n].a)) throw new Error(`${tag}: loop chain broken at ${i}`);
  }
  const at = (z: ZVec): number => {
    const k = zKey(z);
    for (let i = 0; i < n; i++) if (zKey(edges[i].a) === k) return i;
    return -1;
  };
  const quadAt: [number, number, number, number] = [at(quad[0]), at(quad[1]), at(quad[2]), at(quad[3])];
  if (quadAt[0] !== 0) throw new Error(`${tag}: anchor is not at loop index 0`);
  const present = quadAt.filter((x) => x >= 0);
  for (let i = 1; i < present.length; i++) {
    if (present[i] <= present[i - 1]) throw new Error(`${tag}: quad points out of cyclic order: ${quadAt.join(',')}`);
  }
  return { bnd: { edges, quadAt }, prov, cancelled };
}

const bndCache = new Map<string, Bnd>();

function boundaryLevel0(family: TileFamilyId, type: TileTypeId): Bnd {
  const insts = zExpand(family, type, 0);
  const pool: Placed[] = [];
  for (let s = 0; s < insts.length; s++) {
    const inst = insts[s];
    const pts = zLeafPts(family, inst.type).map((p) => zApply(inst.xform, p));
    const labs = edgeLabels(family, inst.type);
    for (let i = 0; i < pts.length; i++) {
      pool.push({ slot: s, idx: i, e: { a: pts[i], b: pts[(i + 1) % pts.length], label: labs[i] } });
    }
  }
  return cancelAndLoop(pool, zSupertileQuad(family, 0), `${family}/${type}@0`).bnd;
}

/**
 * Assemble a level-k supertile's boundary from its children's boundaries.
 *
 * Valid because the patch is a tiling: an edge interior to a child already
 * cancelled inside that child, and an edge on a child's boundary survives in
 * the parent exactly when no sibling uses it. So the parent's boundary is the
 * exact cancellation of the children's boundaries and there is no need to
 * expand down to leaves — which is what makes deep levels affordable.
 * Cross-checked against the full leaf expansion in PART 2a.
 */
function assemble(family: TileFamilyId, type: TileTypeId, level: number): {
  bnd: Bnd;
  prov: readonly Placed[];
  cancelled: readonly (readonly [Placed, Placed])[];
  childTypes: readonly (TileTypeId | null)[];
} {
  const Ts = zSupertileTransforms(family, level);
  const subs = SUPER_RULES[type];
  if (!subs) throw new Error(`no substitution rule for ${type}`);
  const childTypes: (TileTypeId | null)[] = [];
  const pool: Placed[] = [];
  for (let slot = 0; slot < 8; slot++) {
    if (subs[slot] === 'null') {
      childTypes.push(null);
      continue;
    }
    const ct = subs[slot] as TileTypeId;
    childTypes.push(ct);
    const cb = boundaryOf(family, ct, level - 1);
    const T = Ts[slot];
    for (let i = 0; i < cb.edges.length; i++) {
      const e = cb.edges[i];
      pool.push({ slot, idx: i, e: { a: zApply(T, e.a), b: zApply(T, e.b), label: e.label } });
    }
  }
  const r = cancelAndLoop(pool, zSupertileQuad(family, level), `${family}/${type}@${level}`);
  return { ...r, childTypes };
}

function boundaryOf(family: TileFamilyId, type: TileTypeId, level: number): Bnd {
  const key = `${family}|${type}|${level}`;
  const hit = bndCache.get(key);
  if (hit) return hit;
  const b = level === 0 ? boundaryLevel0(family, type) : assemble(family, type, level).bnd;
  bndCache.set(key, b);
  return b;
}

/**
 * Boundary connection dots of a supertile: the loop positions of the boundary
 * edges whose label is a `minor == 0` edge of a selected class. A connection dot
 * is exactly the midpoint of such an edge, and a boundary edge belongs to
 * exactly one leaf, so these are precisely the welded degree-1 dots — confirmed
 * against the full welded strand graph in PART 2a.
 */
function boundaryDotEdgeIdxs(cfg: Config, bnd: Bnd): number[] {
  const sel = new Set(cfg.subset);
  const out: number[] = [];
  for (let i = 0; i < bnd.edges.length; i++) {
    const { major, minor } = parseEdgeLabel(bnd.edges[i].label);
    if (minor === 0 && sel.has(major)) out.push(i);
  }
  return out;
}

function dotPoint2(bnd: Bnd, i: number): ZVec {
  return zAdd(bnd.edges[i].a, bnd.edges[i].b);
}

interface Datum {
  readonly ifaceSize: number;
  readonly childSizes: readonly (number | null)[];
  readonly gluing: string;
  readonly outer: string;
  /** Structured form of `gluing`: welded pairs of `slot:dot` node names. */
  readonly gluePairs: readonly (readonly [string, string])[];
  /** Structured form of `outer`: `slot:dot` -> parent boundary dot index. */
  readonly outerMap: ReadonlyMap<string, number>;
}

function substitutionDatum(cfg: Config, type: TileTypeId, level: number): Datum {
  const family = cfg.family;
  const { bnd, prov, cancelled, childTypes } = assemble(family, type, level);
  const parentDotIdxs = boundaryDotEdgeIdxs(cfg, bnd);
  const parentDotAt = new Map<number, number>();
  parentDotIdxs.forEach((e, d) => parentDotAt.set(e, d));

  const childDotOf: (Map<number, number> | null)[] = [];
  const childSizes: (number | null)[] = [];
  for (let slot = 0; slot < 8; slot++) {
    const ct = childTypes[slot];
    if (!ct) {
      childDotOf.push(null);
      childSizes.push(null);
      continue;
    }
    const idxs = boundaryDotEdgeIdxs(cfg, boundaryOf(family, ct, level - 1));
    const m = new Map<number, number>();
    idxs.forEach((e, d) => m.set(e, d));
    childDotOf.push(m);
    childSizes.push(idxs.length);
  }
  const carries = (p: Placed): number | null => {
    const m = childDotOf[p.slot];
    if (!m) return null;
    const d = m.get(p.idx);
    return d === undefined ? null : d;
  };

  const glue: string[] = [];
  const gluePairs: (readonly [string, string])[] = [];
  for (const [p, q] of cancelled) {
    const dp = carries(p);
    const dq = carries(q);
    if (dp === null && dq === null) continue;
    if (dp === null || dq === null) {
      throw new Error(`${cfg.id} ${type}@${level}: a welded edge carries a dot on one side only (slots ${p.slot}/${q.slot})`);
    }
    if (zKey(zAdd(p.e.a, p.e.b)) !== zKey(zAdd(q.e.a, q.e.b))) {
      throw new Error(`${cfg.id} ${type}@${level}: welded dots differ exactly`);
    }
    const A = `${p.slot}:${dp}`;
    const B = `${q.slot}:${dq}`;
    gluePairs.push(A < B ? [A, B] : [B, A]);
    glue.push(A < B ? `${A}=${B}` : `${B}=${A}`);
  }
  glue.sort();

  const outer: string[] = [];
  const outerMap = new Map<string, number>();
  for (let i = 0; i < prov.length; i++) {
    const d = carries(prov[i]);
    if (d === null) continue;
    const pd = parentDotAt.get(i);
    if (pd === undefined) throw new Error(`${cfg.id} ${type}@${level}: a surviving dot is not a parent dot`);
    outer.push(`${prov[i].slot}:${d}>${pd}`);
    outerMap.set(`${prov[i].slot}:${d}`, pd);
  }
  outer.sort();

  return {
    ifaceSize: parentDotIdxs.length,
    childSizes,
    gluing: glue.join(' '),
    outer: outer.join(' '),
    gluePairs,
    outerMap,
  };
}

const datumCache = new Map<string, Datum>();
function datumOf(cfg: Config, type: TileTypeId, level: number): Datum {
  const k = `${cfg.id}|${type}|${level}`;
  const hit = datumCache.get(k);
  if (hit) return hit;
  const d = substitutionDatum(cfg, type, level);
  datumCache.set(k, d);
  return d;
}

// ---------------------------------------------------------------------------
// Lemma 3(c) in action: composing the routing with the FIXED rule F_T
// ---------------------------------------------------------------------------

/** A routing is a perfect matching of boundary dot indices, e.g. '0-3 1-2'. */
function routingGroundTruth(cfg: Config, type: TileTypeId, level: number): string {
  const strands = buildStrands(cfg, zExpand(cfg.family, type, level));
  const tr = trace(strands);
  if (tr.circuits.length) return `CIRCUITS:${tr.circuits.length}`;
  const bnd = boundaryOf(cfg.family, type, level);
  const idxOf = new Map<string, number>();
  boundaryDotEdgeIdxs(cfg, bnd).forEach((e, d) => idxOf.set(zKey(dotPoint2(bnd, e)), d));
  const pairs: [number, number][] = [];
  for (const arc of tr.arcs) {
    const a = idxOf.get(arc.endpoints[0]);
    const b = idxOf.get(arc.endpoints[1]);
    if (a === undefined || b === undefined) return 'ARC-OFF-BOUNDARY';
    pairs.push(a < b ? [a, b] : [b, a]);
  }
  pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  return pairs.map(([a, b]) => `${a}-${b}`).join(' ');
}

/**
 * Apply the substitution's composition operator: thread the children's own
 * routings through the parent's gluing map and read off the pairing the parent's
 * outer dots end up with. Uses the datum of level min(level, 2) — and since the
 * datum is constant from level 2, every level >= 2 uses literally the same F_T.
 */
function composeRouting(
  cfg: Config,
  type: TileTypeId,
  level: number,
  childRouting: (slot: number) => string,
): string {
  const d = datumOf(cfg, type, Math.min(level, 2));
  const adjArc = new Map<string, string>();
  const subs = SUPER_RULES[type];
  for (let slot = 0; slot < 8; slot++) {
    if (subs[slot] === 'null') continue;
    const r = childRouting(slot);
    if (r === '') continue;
    for (const tok of r.split(' ')) {
      const [a, b] = tok.split('-');
      adjArc.set(`${slot}:${a}`, `${slot}:${b}`);
      adjArc.set(`${slot}:${b}`, `${slot}:${a}`);
    }
  }
  const adjGlue = new Map<string, string>();
  for (const [a, b] of d.gluePairs) {
    adjGlue.set(a, b);
    adjGlue.set(b, a);
  }
  const pairs: [number, number][] = [];
  const seen = new Set<string>();
  for (const [start, startIdx] of d.outerMap) {
    if (seen.has(start)) continue;
    seen.add(start);
    let cur = start;
    let useArc = true;
    for (let guard = 0; ; guard++) {
      if (guard > 100000) return 'NON-TERMINATING';
      const next = useArc ? adjArc.get(cur) : adjGlue.get(cur);
      if (next === undefined) return `DANGLING:${cur}`;
      cur = next;
      useArc = !useArc;
      const end = d.outerMap.get(cur);
      if (end !== undefined && !useArc) {
        // Arrived at an outer dot after traversing an arc: the path ends here.
        seen.add(cur);
        pairs.push(startIdx < end ? [startIdx, end] : [end, startIdx]);
        break;
      }
    }
  }
  pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  return pairs.map(([a, b]) => `${a}-${b}`).join(' ');
}

const routeCache = new Map<string, string>();
function routingByFixedRule(cfg: Config, type: TileTypeId, level: number): string {
  const k = `${cfg.id}|${type}|${level}`;
  const hit = routeCache.get(k);
  if (hit !== undefined) return hit;
  let r: string;
  if (level === 0) {
    r = routingGroundTruth(cfg, type, 0);
  } else {
    const subs = SUPER_RULES[type];
    r = composeRouting(cfg, type, level, (slot) => routingByFixedRule(cfg, subs[slot] as TileTypeId, level - 1));
  }
  routeCache.set(k, r);
  return r;
}

function groundTruthBoundaryDots(cfg: Config, type: TileTypeId, level: number): number {
  const strands = buildStrands(cfg, zExpand(cfg.family, type, level));
  let n = 0;
  for (const d of strands.degree.values()) if (d === 1) n++;
  return n;
}

function groundTruthOrderedDots(cfg: Config, type: TileTypeId, level: number): string[] {
  const insts = zExpand(cfg.family, type, level);
  const pool: Placed[] = [];
  for (let s = 0; s < insts.length; s++) {
    const inst = insts[s];
    const pts = zLeafPts(cfg.family, inst.type).map((p) => zApply(inst.xform, p));
    const labs = edgeLabels(cfg.family, inst.type);
    for (let i = 0; i < pts.length; i++) {
      pool.push({ slot: s, idx: i, e: { a: pts[i], b: pts[(i + 1) % pts.length], label: labs[i] } });
    }
  }
  const { bnd } = cancelAndLoop(pool, zSupertileQuad(cfg.family, level), `gt ${type}@${level}`);
  return boundaryDotEdgeIdxs(cfg, bnd).map((i) => zKey(dotPoint2(bnd, i)));
}

/** Smallest k0 with vals[k0..] all equal, as a 1-based level; -1 if none. */
function firstStable(vals: readonly string[], base: number): number {
  for (let k0 = 0; k0 < vals.length; k0++) {
    let good = true;
    for (let i = k0 + 1; i < vals.length; i++) if (vals[i] !== vals[k0]) good = false;
    if (good) return k0 + base;
  }
  return -1;
}

function periodOf(vals: readonly string[], base: number): string {
  const st = firstStable(vals, base);
  if (st >= 0) return `constant (period 1) from level ${st}`;
  const n = vals.length;
  for (let p = 2; p <= Math.max(1, Math.floor(n / 2)); p++) {
    for (let k0 = 0; k0 + 2 * p <= n; k0++) {
      let good = true;
      for (let i = k0; i + p < n; i++) if (vals[i] !== vals[i + p]) good = false;
      if (good) return `period ${p} from level ${k0 + base}`;
    }
  }
  return 'NO period in the computed range';
}

// ===========================================================================
// PART 3 — candidate inductive invariants
// ===========================================================================

const UNIT_BY_KEY = new Map<string, number>();
{
  let v: ZVec = [1, 0, 0, 0];
  for (let j = 0; j < 12; j++) {
    UNIT_BY_KEY.set(zKey(v), j);
    v = [-v[3], v[0], v[1] + v[3], v[2]];
  }
}

function directionWord(bnd: Bnd): number[] {
  return bnd.edges.map((e) => {
    const j = UNIT_BY_KEY.get(zKey(zSub(e.b, e.a)));
    if (j === undefined) throw new Error('boundary step is not a unit d^k');
    return j;
  });
}

interface MetaRun {
  readonly sign: 1 | -1;
  readonly major: number;
  readonly variant: string;
  readonly len: number;
}

/** Maximal runs of consecutive boundary edges of one seam (same class, consecutive minors). */
function metaRuns(bnd: Bnd): MetaRun[] {
  const n = bnd.edges.length;
  const lab = bnd.edges.map((e) => parseEdgeLabel(e.label));
  const brk: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const a = lab[i];
    const b = lab[(i + 1) % n];
    brk.push(!(a.sign === b.sign && a.major === b.major && a.variant === b.variant && Math.abs(a.minor - b.minor) === 1));
  }
  let start = 0;
  while (start < n && !brk[(start - 1 + n) % n]) start++;
  if (start === n) start = 0;
  const out: MetaRun[] = [];
  let i = 0;
  while (i < n) {
    const s = (start + i) % n;
    let j = i;
    while (j < n && !brk[(start + j) % n]) j++;
    out.push({ sign: lab[s].sign, major: lab[s].major, variant: lab[s].variant, len: j - i + 1 });
    i = j + 1;
  }
  return out;
}

function classWord(runs: readonly MetaRun[]): string[] {
  return runs.map((r) => `${r.sign < 0 ? '-' : '+'}${r.major}${r.variant}`);
}

function canonicalCyclic(word: readonly string[]): string {
  const n = word.length;
  let best: string | null = null;
  for (let s = 0; s < n; s++) {
    let acc = '';
    for (let i = 0; i < n; i++) acc += word[(s + i) % n] + '|';
    if (best === null || acc < best) best = acc;
  }
  return best ?? '';
}

/**
 * Which quad-to-quad arc a boundary edge index belongs to, named by the quad
 * point that starts it. Interior quad points (quadAt = -1) simply do not split,
 * so such a boundary has fewer than four arcs.
 */
function arcOf(bnd: Bnd, idx: number): number {
  const q = bnd.quadAt;
  let best = 0;
  let bestAt = -1;
  for (let m = 0; m < 4; m++) {
    if (q[m] >= 0 && q[m] <= idx && q[m] >= bestAt) {
      bestAt = q[m];
      best = m;
    }
  }
  if (bestAt < 0) {
    // Before the first split: the arc that wraps, i.e. the last present quad.
    for (let m = 3; m >= 0; m--) if (q[m] >= 0) return m;
  }
  return best;
}

interface ArcReport {
  /** The parent boundary as a run-length-encoded word of (parentArc, slot, childArc, dir). */
  readonly word: string;
  /** slot:arc entries fully cancelled (glued to a sibling) / fully surviving / mixed. */
  readonly pureGlued: number;
  readonly pureOuter: number;
  readonly mixed: number;
  readonly mixedDetail: string;
  /** Every glued/outer transition on a child boundary sits on a slot quad point. */
  readonly flipsOnQuadPoints: boolean;
  readonly flipDetail: string;
}

function arcAnalysis(family: TileFamilyId, type: TileTypeId, level: number): ArcReport {
  const { bnd, prov, cancelled, childTypes } = assemble(family, type, level);
  const childBnd: (Bnd | null)[] = childTypes.map((ct) => (ct ? boundaryOf(family, ct, level - 1) : null));

  // The 32 slot quad points of this level, in the parent frame. Note Ts has all
  // eight slots even for Gamma, whose slot 2 is empty: the PHANTOM slot-2 quad
  // points are exactly where Gamma's notch is, so they belong in this set.
  const Ts = zSupertileTransforms(family, level);
  const Qprev = zSupertileQuad(family, level - 1);
  const slotQuadKeys = new Set<string>();
  for (let sIdx = 0; sIdx < 8; sIdx++) {
    for (let p = 0; p < 4; p++) slotQuadKeys.add(zKey(zApply(Ts[sIdx], Qprev[p])));
  }

  // Purity of each child's four quad-arcs under the glued / surviving split,
  // plus the per-edge status needed for the transition test.
  const count = new Map<string, { glued: number; outer: number }>();
  const status: (Int8Array | null)[] = childBnd.map((cb) => (cb ? new Int8Array(cb.edges.length).fill(-1) : null));
  const bump = (slot: number, idx: number, glued: boolean): void => {
    const cb = childBnd[slot];
    if (!cb) return;
    status[slot]![idx] = glued ? 1 : 0;
    const k = `${slot}:${arcOf(cb, idx)}`;
    const c = count.get(k) ?? { glued: 0, outer: 0 };
    if (glued) c.glued++;
    else c.outer++;
    count.set(k, c);
  };
  for (const [p, q] of cancelled) {
    bump(p.slot, p.idx, true);
    bump(q.slot, q.idx, true);
  }
  for (const p of prov) bump(p.slot, p.idx, false);

  let pureGlued = 0;
  let pureOuter = 0;
  let mixed = 0;
  const mixedDetail: string[] = [];
  for (const [k, c] of [...count.entries()].sort()) {
    if (c.outer === 0) pureGlued++;
    else if (c.glued === 0) pureOuter++;
    else {
      mixed++;
      mixedDetail.push(`${k}(${c.glued}g/${c.outer}o)`);
    }
  }

  // Every place where a child's boundary switches between glued and outer must
  // be a slot quad point — that is what makes the contact pattern a finite datum.
  let flipsOnQuadPoints = true;
  const flipDetail: string[] = [];
  for (let sIdx = 0; sIdx < 8; sIdx++) {
    const cb = childBnd[sIdx];
    const st = status[sIdx];
    if (!cb || !st) continue;
    const n = cb.edges.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (st[i] === st[j]) continue;
      const v = zApply(Ts[sIdx], cb.edges[j].a);
      if (!slotQuadKeys.has(zKey(v))) {
        flipsOnQuadPoints = false;
        flipDetail.push(`slot ${sIdx} at child edge ${j}`);
      }
    }
  }

  // Parent boundary as a word in (slot, child arc, direction), run-length encoded.
  const toks: string[] = [];
  let prevTok = '';
  for (let i = 0; i < prov.length; i++) {
    const p = prov[i];
    const cb = childBnd[p.slot]!;
    const a = arcOf(cb, p.idx);
    let dir = '?';
    if (i + 1 < prov.length && prov[i + 1].slot === p.slot) {
      const n = cb.edges.length;
      dir = (prov[i + 1].idx - p.idx + n) % n === 1 ? '+' : '-';
    } else if (i > 0 && prov[i - 1].slot === p.slot) {
      const n = cb.edges.length;
      dir = (p.idx - prov[i - 1].idx + n) % n === 1 ? '+' : '-';
    }
    const tok = `${arcOf(bnd, i)}<${p.slot}.${a}${dir}`;
    if (tok !== prevTok) {
      toks.push(tok);
      prevTok = tok;
    }
  }
  return {
    word: toks.join(' '),
    pureGlued,
    pureOuter,
    mixed,
    mixedDetail: mixedDetail.join(' '),
    flipsOnQuadPoints,
    flipDetail: flipDetail.slice(0, 4).join(', '),
  };
}

/** Connection dots per quad-arc of a supertile. */
function dotsPerArc(cfg: Config, type: TileTypeId, level: number): number[] {
  const bnd = boundaryOf(cfg.family, type, level);
  const out = [0, 0, 0, 0];
  for (const i of boundaryDotEdgeIdxs(cfg, bnd)) out[arcOf(bnd, i)]++;
  return out;
}

// ---------------------------------------------------------------------------
// PART 3c — the exact semilinear quad recursion, and the incidence pattern
// ---------------------------------------------------------------------------

/**
 * A formal element `sum_m c[m] Q[m] + sum_m cc[m] conj(Q[m])`, where Q[0..3] are
 * the four quad points of the PREVIOUS level, treated as indeterminates.
 * Everything `buildLevel` does to a quad is built from these operations, so
 * running it symbolically yields the exact matrix of the quad recursion.
 */
interface Sym {
  readonly c: readonly BVec[];
  readonly cc: readonly BVec[];
}
const S_ZERO: Sym = { c: [B_ZERO, B_ZERO, B_ZERO, B_ZERO], cc: [B_ZERO, B_ZERO, B_ZERO, B_ZERO] };
function symbolQ(m: number): Sym {
  return {
    c: [0, 1, 2, 3].map((i) => (i === m ? B_ONE : B_ZERO)),
    cc: [B_ZERO, B_ZERO, B_ZERO, B_ZERO],
  };
}
function sAdd(x: Sym, y: Sym): Sym {
  return { c: x.c.map((v, i) => bAdd(v, y.c[i])), cc: x.cc.map((v, i) => bAdd(v, y.cc[i])) };
}
function sSub(x: Sym, y: Sym): Sym {
  return { c: x.c.map((v, i) => bSub(v, y.c[i])), cc: x.cc.map((v, i) => bSub(v, y.cc[i])) };
}
function sRot(x: Sym, k: number): Sym {
  return { c: x.c.map((v) => bRot(v, k)), cc: x.cc.map((v) => bRot(v, k)) };
}
function sConj(x: Sym): Sym {
  return { c: x.cc.map(bConj), cc: x.c.map(bConj) };
}
interface SAffine {
  readonly k: number;
  readonly m: 0 | 1;
  readonly t: Sym;
}
function sApply(T: SAffine, x: Sym): Sym {
  return sAdd(sRot(T.m ? sConj(x) : x, T.k), T.t);
}
function sMul(A: SAffine, B: SAffine): SAffine {
  return {
    k: (((A.k + (A.m ? -B.k : B.k)) % 12) + 12) % 12,
    m: (A.m ^ B.m) as 0 | 1,
    t: sAdd(sRot(A.m ? sConj(B.t) : B.t, A.k), A.t),
  };
}

/** Symbolic twin of `buildLevel`: exact, family-independent, quad-free. */
function symbolicLevel(): { Ts: SAffine[]; superQuad: Sym[] } {
  const quad = [0, 1, 2, 3].map(symbolQ);
  const Ts: SAffine[] = [{ k: 0, m: 0, t: S_ZERO }];
  let totalAng = 0;
  let rotK = 0;
  let tquad = [...quad];
  for (const [ang, from, to] of T_RULES) {
    totalAng += ang;
    if (ang !== 0) {
      rotK = totalAng / 30;
      tquad = quad.map((q) => sRot(q, rotK));
    }
    const prev = sApply(Ts[Ts.length - 1], quad[from]);
    Ts.push(sMul({ k: 0, m: 0, t: sSub(prev, tquad[to]) }, { k: ((rotK % 12) + 12) % 12, m: 0, t: S_ZERO }));
  }
  const REFLECT: SAffine = { k: 6, m: 1, t: S_ZERO };
  for (let i = 0; i < Ts.length; i++) Ts[i] = sMul(REFLECT, Ts[i]);
  const superQuad = [
    sApply(Ts[6], quad[2]),
    sApply(Ts[5], quad[1]),
    sApply(Ts[3], quad[2]),
    sApply(Ts[0], quad[1]),
  ];
  return { Ts, superQuad };
}

/** Evaluate a formal element at a concrete quad. */
function symEval(x: Sym, Q: readonly ZVec[]): BVec {
  let acc = B_ZERO;
  for (let m = 0; m < 4; m++) {
    acc = bAdd(acc, bMul(x.c[m], toB(Q[m])));
    acc = bAdd(acc, bMul(x.cc[m], bConj(toB(Q[m]))));
  }
  return acc;
}

// ===========================================================================
// Driver
// ===========================================================================

function part2(): void {
  for (const family of FAMILIES) {
    heading(`PART 2a — ${family}: the recursive boundary equals the fully-expanded one (exact)`);
    const cfgs = family === 'hex' ? [CONFIGS.hex128] : [CONFIGS.spectre1278, CONFIGS.flagship];
    for (const cfg of cfgs) {
      let good = true;
      let detail = '';
      for (let lv = 1; lv <= VALIDATE; lv++) {
        for (const T of TYPES) {
          const bnd = boundaryOf(family, T, lv);
          const mine = boundaryDotEdgeIdxs(cfg, bnd).map((i) => zKey(dotPoint2(bnd, i)));
          const gt = groundTruthOrderedDots(cfg, T, lv);
          const gtCount = groundTruthBoundaryDots(cfg, T, lv);
          if (mine.length !== gtCount || mine.join(' ') !== gt.join(' ')) {
            good = false;
            detail = `${T}@${lv}: recursive ${mine.length} dots vs welded-degree-1 ${gtCount}`;
          }
        }
      }
      ok(
        good,
        `${cfg.id}: recursive boundary dots = welded degree-1 dots, same points, same order, levels 1..${VALIDATE}`,
        detail,
      );
    }
  }

  for (const family of FAMILIES) {
    const cfgs = family === 'hex' ? [CONFIGS.hex128] : [CONFIGS.spectre1278, CONFIGS.flagship];
    for (const cfg of cfgs) {
      heading(`PART 2b — ${cfg.id}: interface size, GLUING and OUTER maps, levels 1..${MAX}`);
      console.log(`  | type | |dB| by level | gluing map | outer map |`);
      console.log(`  |---|---|---|---|`);
      const stables: number[] = [];
      for (const T of TYPES) {
        const sizes: number[] = [];
        const glues: string[] = [];
        const outers: string[] = [];
        for (let lv = 1; lv <= MAX; lv++) {
          const d = substitutionDatum(cfg, T, lv);
          sizes.push(d.ifaceSize);
          glues.push(d.gluing);
          outers.push(d.outer);
        }
        const gp = periodOf(glues, 1);
        const op = periodOf(outers, 1);
        const gs = firstStable(glues, 1);
        const os = firstStable(outers, 1);
        if (gs > 0) stables.push(gs);
        if (os > 0) stables.push(os);
        console.log(`  | ${pad(T, 7)} | ${sizes.join(' ')} | ${gp} | ${op} |`);
        ok(new Set(sizes).size === 1, `${T}: |dB| constant over levels 1..${MAX}`, `= ${sizes[0]}`);
        ok(gs > 0, `${T}: GLUING map literally CONSTANT from some level on`, gp);
        ok(os > 0, `${T}: OUTER map literally CONSTANT from some level on`, op);
      }
      const pre = stables.length ? Math.max(...stables) : -1;
      ok(
        pre > 0,
        `${cfg.id}: the whole substitution datum is constant for every type from level ${pre} up to ${MAX}`,
        `pre-period ${pre - 1}; period 1, NOT 2 — the chirality-stable anchoring already absorbs the per-level mirror flip`,
      );
      const rep: TileTypeId = 'Psi';
      console.log(`\n  ${rep} substitution datum (the fixed rule F_Psi), levels 1..${Math.min(3, MAX)}:`);
      for (let lv = 1; lv <= Math.min(3, MAX); lv++) {
        const d = datumOf(cfg, rep, lv);
        console.log(`    lv${lv}  |dB|=${d.ifaceSize}  children |dB| = [${d.childSizes.join(', ')}]`);
        console.log(`          gluing ${d.gluing}`);
        console.log(`          outer  ${d.outer}`);
      }
    }
  }

  // --- 2c: Lemma 3(c) in action -------------------------------------------
  heading(`PART 2c — the FIXED rule F_T really is the composition operator (levels 1..${VALIDATE})`);
  console.log(
    `  Thread each child's own routing through the LEVEL-2 gluing map and read off how the parent's
` +
    `  outer dots end up paired. If Lemma 3(c) holds, that reproduces the parent's routing computed
` +
    `  independently from the fully welded strand graph, at every level.
`,
  );
  for (const key of ['hex128', 'spectre1278', 'flagship'] as const) {
    const cfg = CONFIGS[key];
    let good = true;
    let detail = '';
    const psiRows: string[] = [];
    for (let lv = 1; lv <= VALIDATE; lv++) {
      for (const T of TYPES) {
        const by = routingByFixedRule(cfg, T, lv);
        const gt = routingGroundTruth(cfg, T, lv);
        if (by !== gt) {
          good = false;
          if (!detail) detail = `${T}@${lv}: fixed rule gives "${by}", welded graph gives "${gt}"`;
        }
        if (T === 'Psi') psiRows.push(`lv${lv} ${gt || '(empty)'}`);
      }
    }
    console.log(`  ${cfg.id}: Psi routing ${psiRows.join(' | ')}`);
    ok(
      good,
      `${cfg.id}: the fixed rule F_T reproduces every type's routing at levels 1..${VALIDATE}`,
      good ? 'Lemma 3(c) verified as an identity, not just as matching tables' : detail,
    );
  }
}

function part3(): void {
  // --- 3a: three candidate invariants from the brief, all REFUTED -----------
  heading('PART 3a — the boundary WORD candidates (brief section 3, bullets 1-3)');
  for (const family of FAMILIES) {
    for (const T of ['Psi', 'Gamma'] as TileTypeId[]) {
      const counts: number[] = [];
      const canon: string[] = [];
      const perim: number[] = [];
      const turns: string[] = [];
      for (let lv = 0; lv <= MAX; lv++) {
        const bnd = boundaryOf(family, T, lv);
        const runs = metaRuns(bnd);
        counts.push(runs.length);
        canon.push(canonicalCyclic(classWord(runs)));
        perim.push(bnd.edges.length);
        const dirs = directionWord(bnd);
        turns.push(dirs.map((d, i) => ((dirs[(i + 1) % dirs.length] - d) % 12 + 12) % 12).join(','));
      }
      console.log(`  ${family}/${T}: |boundary| ${perim.join(' ')} ; meta-edges ${counts.join(' ')}`);
      if (new Set(canon).size === 1) {
        ok(true, `${family}/${T}: boundary meta-edge class word constant`, canon[0].slice(0, 60));
      } else {
        refuted(
          `${family}/${T}: the boundary meta-edge CLASS word is NOT constant in k`,
          `${new Set(canon).size} distinct words over levels 0..${MAX}; the meta-edge count grows ${counts.join(' -> ')}`,
        );
      }
      if (new Set(turns).size === 1) {
        ok(true, `${family}/${T}: turning-angle sequence constant`);
      } else {
        refuted(`${family}/${T}: the turning-angle sequence is NOT constant in k`, `lengths ${counts.map((_, i) => perim[i]).join(' -> ')}`);
      }
    }
  }
  // Cross-family: the meta-edge class word is the same object in both families.
  console.log('');
  for (const T of TYPES) {
    let same = true;
    let from0 = true;
    for (let lv = 0; lv <= MAX; lv++) {
      const a = classWord(metaRuns(boundaryOf('hex', T, lv))).join(' ');
      const b = classWord(metaRuns(boundaryOf('spectre', T, lv))).join(' ');
      if (a !== b) {
        from0 = false;
        if (lv >= 1) same = false;
      }
    }
    ok(
      same,
      `${T}: the boundary meta-edge class word is IDENTICAL for hex and spectre at every level 1..${MAX}`,
      from0
        ? 'and at level 0 too'
        : 'level 0 differs only because the spectre composite Gamma is two leaves welded along its class-7 seam, while the hex Gamma is a single hexagon',
    );
  }
  // Meta-edge length as a function of class alone — the "length vector" question.
  for (const family of FAMILIES) {
    const byClass = new Map<string, Set<number>>();
    for (const T of TYPES) {
      for (let lv = 0; lv <= MAX; lv++) {
        for (const r of metaRuns(boundaryOf(family, T, lv))) {
          const k = `${r.sign < 0 ? '-' : '+'}${r.major}${r.variant}`;
          if (!byClass.has(k)) byClass.set(k, new Set());
          byClass.get(k)!.add(r.len);
        }
      }
    }
    const pure = [...byClass.values()].every((s) => s.size === 1);
    ok(
      pure,
      `${family}: a boundary meta-edge's physical LENGTH is a function of its class alone`,
      [...byClass.entries()].sort().map(([k, s]) => `${k}:${[...s].join('/')}`).join(' '),
    );
  }
  console.log(
    `\n  Reading: the length vector therefore carries no information beyond the class word, and the class\n` +
    `  word is not level-independent, so the "fixed integer matrix on a length vector" route of the brief\n` +
    `  does NOT close the induction. The boundary is fractal (08-supertile-outline.ts) and its word grows\n` +
    `  without bound; any level-independent datum has to live on a COARSER decomposition of the boundary.`,
  );

  // --- 3b: the invariant that does work — the four quad-to-quad arcs --------
  heading('PART 3b — the quad-ARC decomposition: the invariant that survives');
  console.log(
    `  Every supertile boundary carries its four quad points, and the substitution places children by\n` +
    `  identifying quad points (T_RULES). Split each boundary at its quad points into four ARCS and ask\n` +
    `  whether the substitution acts on arcs rather than on edges.\n`,
  );
  for (const family of FAMILIES) {
    for (const T of TYPES) {
      const words: string[] = [];
      const mixedByLevel: string[] = [];
      let mixedTotal = 0;
      let flipsOk = true;
      let flipDetail = '';
      const pures: string[] = [];
      for (let lv = 1; lv <= MAX; lv++) {
        const r = arcAnalysis(family, T, lv);
        words.push(r.word);
        mixedTotal += r.mixed;
        mixedByLevel.push(r.mixed ? `lv${lv}:{${r.mixedDetail}}` : `lv${lv}:none`);
        if (!r.flipsOnQuadPoints) {
          flipsOk = false;
          if (!flipDetail) flipDetail = `lv${lv}: ${r.flipDetail}`;
        }
        pures.push(`${r.pureGlued}g/${r.pureOuter}o/${r.mixed}x`);
      }
      const st = firstStable(words, 1);
      if (mixedTotal > 0) console.log(`  ${family}/${pad(T, 7)} arc purity by level: ${pures.join(' ')}   mixed arcs ${mixedByLevel.join(' ')}`);
      if (mixedTotal === 0) {
        ok(true, `${family}/${T}: every child quad-arc is entirely glued or entirely outer`, 'contacts between children are whole quad-arcs');
      } else {
        refuted(
          `${family}/${T}: NOT every child quad-arc is pure — ${mixedTotal / MAX} arc(s) are split at every level`,
          `${mixedByLevel.join(' ')} (Gamma is the only type with an empty slot, and the split arcs are the two flanking it)`,
        );
      }
      if (T === 'Gamma') {
        if (flipsOk) {
          ok(true, `${family}/Gamma: every glued/outer TRANSITION on a child boundary sits on a slot quad point`);
        } else {
          refuted(
            `${family}/Gamma: two glued/outer transitions do NOT sit on any slot quad point`,
            `${flipDetail} — these are the two ends of the notch left by Gamma's empty slot 2, where the absent child stops touching children 1 and 3; their position inside the arc is level-DEPENDENT`,
          );
        }
      } else {
        ok(
          flipsOk,
          `${family}/${T}: every glued/outer TRANSITION on a child boundary sits on a slot quad point`,
          flipsOk ? 'so the contact pattern is cut out by the 32 slot quad points alone' : flipDetail,
        );
      }
      ok(
        st > 0,
        `${family}/${T}: the ARC SUBSTITUTION word is constant from level ${st}`,
        st > 0 ? `levels ${st}..${MAX} identical` : `${new Set(words).size} distinct words`,
      );
    }
  }
  const showFam: TileFamilyId = 'spectre';
  console.log(`\n  ${showFam}/Psi arc substitution (parentArc<slot.childArc+dir), level ${Math.min(3, MAX)}:`);
  console.log(`    ${arcAnalysis(showFam, 'Psi', Math.min(3, MAX)).word}`);

  // Dot counts per arc: the abelianisation of the arc substitution.
  heading('PART 3b(ii) — per-arc dot counts are a FIXED POINT of the arc substitution');
  for (const key of ['hex128', 'spectre1278', 'flagship'] as const) {
    const cfg = CONFIGS[key];
    let constant = true;
    let detail = '';
    const rows: string[] = [];
    let fromLevel1 = true;
    for (const T of TYPES) {
      const vs: string[] = [];
      for (let lv = 1; lv <= MAX; lv++) vs.push(dotsPerArc(cfg, T, lv).join(','));
      if (new Set(vs.slice(1)).size !== 1) {
        constant = false;
        detail = `${T}: ${vs.join(' | ')}`;
      }
      if (new Set(vs).size !== 1) fromLevel1 = false;
      rows.push(`${T}=[${vs[vs.length - 1]}]`);
    }
    console.log(`  ${cfg.id} (level ${MAX}): ${rows.join(' ')}`);
    ok(
      constant,
      `${cfg.id}: the per-arc dot-count vector is constant over levels 2..${MAX}`,
      constant
        ? `so the 36-entry vector (9 types x 4 arcs) is a fixed point of the non-negative integer matrix that the arc substitution abelianises to${fromLevel1 ? '' : '; level 1 differs for Gamma only (its children are leaves, and the hex/spectre base Gamma is not a supertile)'}`
        : detail,
    );
  }

  // --- 3c: the quad-point incidence pattern, PROVED for all k ---------------
  heading('PART 3c — the quad-point incidence pattern, PROVED level-independent for all k');
  const { Ts: sTs, superQuad: sSuper } = symbolicLevel();
  for (const family of FAMILIES) {
    // Check the symbolic level against the real one, exactly.
    let symOk = true;
    for (let lv = 1; lv <= Math.min(DEEP, 20); lv++) {
      const Q = zSupertileQuad(family, lv - 1);
      const real = zSupertileQuad(family, lv);
      for (let m = 0; m < 4; m++) {
        if (!bIsZero(bSub(symEval(sSuper[m], Q), toB(real[m])))) symOk = false;
      }
      const realTs = zSupertileTransforms(family, lv);
      for (let j = 0; j < 8; j++) {
        if (sTs[j].k !== realTs[j].k || sTs[j].m !== realTs[j].m) symOk = false;
        if (!bIsZero(bSub(symEval(sTs[j].t, Q), toB(realTs[j].t)))) symOk = false;
      }
    }
    ok(
      symOk,
      `${family}: the symbolic quad recursion reproduces buildLevel exactly, levels 1..${Math.min(DEEP, 20)}`,
      'Q_k = M . conj(Q_{k-1}) with M a FIXED matrix over Z[zeta12], and each Ts[j].t a FIXED linear functional of conj(Q_{k-1})',
    );
    const pureConj = sSuper.every((s) => s.c.every(bIsZero));
    ok(pureConj, `${family}: the quad recursion is exactly semilinear`, 'Q_k depends on conj(Q_{k-1}) only — no Q_{k-1} term');

    // Every candidate incidence between two children's quad points.
    const funcs: { tag: string; f: Sym }[] = [];
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        for (let p = 0; p < 4; p++) {
          for (let q = 0; q < 4; q++) {
            const x = sSub(sApply(sTs[i], symbolQ(p)), sApply(sTs[j], symbolQ(q)));
            funcs.push({ tag: `${i}.${p}=${j}.${q}`, f: x });
          }
        }
      }
    }
    // The pair v_j = (Q_j, conj Q_j) obeys v_j = N v_{j-1} for the FIXED 8x8
    // matrix N = [[0, M], [conj M, 0]] over Q(zeta12). Cayley-Hamilton gives
    // v_{j+8} in the span of v_j..v_{j+7}, so a fixed linear functional that
    // vanishes on v_1..v_8 vanishes on every v_j with j >= 1 — i.e. at every
    // SUPERTILE level k >= 2, whose children are placed by Ts built from Q_{k-1}.
    // The base quad Q_0 is handled separately: it is the raw leaf quad and the
    // hexagon's is degenerate, so level 1 may carry extra coincidences.
    const CH_FROM = 1; // first quad index used by the Cayley-Hamilton window
    const hits: string[] = [];
    const baseHits: string[] = [];
    let provedAll = true;
    let sporadic = '';
    let minNonZero = Infinity;
    for (const { tag, f } of funcs) {
      const vals: BVec[] = [];
      for (let lv = 0; lv <= DEEP; lv++) vals.push(symEval(f, zSupertileQuad(family, lv)));
      if (bIsZero(vals[0])) baseHits.push(tag);
      const zeroWindow = vals.slice(CH_FROM, CH_FROM + 8).every(bIsZero);
      const zeroTail = vals.slice(CH_FROM).every(bIsZero);
      if (zeroWindow) {
        hits.push(tag);
        if (!zeroTail) provedAll = false; // would contradict Cayley-Hamilton
      } else {
        for (const v of vals.slice(CH_FROM)) {
          if (!bIsZero(v)) minNonZero = Math.min(minNonZero, bAbs(v));
          else sporadic = tag;
        }
      }
    }
    console.log(`  ${family}: ${hits.length} coincident quad-point pairs among the 8 children, at every supertile level >= 2:`);
    console.log(`    ${hits.join('  ')}`);
    const extraBase = baseHits.filter((t) => !hits.includes(t));
    console.log(
      `  ${family}: at supertile level 1 (base quad) the pattern has ${baseHits.length} pairs` +
        (extraBase.length ? `, with the EXTRA coincidence(s) ${extraBase.join(' ')}` : ', the same set'),
    );
    ok(
      provedAll && !sporadic,
      `${family}: the quad-point incidence pattern is the SAME at every supertile level k >= 2 — PROVED for all such k`,
      `each incidence is the vanishing of a FIXED Z[zeta12]-linear functional of (Q_{k-1}, conj Q_{k-1}); that pair obeys a fixed 8x8 linear recursion, so Cayley-Hamilton reduces "vanishes for all k >= 2" to the window k = 2..9, checked exactly. Non-incidences re-checked exactly to level ${DEEP} (smallest non-zero gap ${Number.isFinite(minNonZero) ? minNonZero.toFixed(4) : 'n/a'})`,
    );
    if (extraBase.length) {
      note(
        `${family}: supertile level 1 is EXCEPTIONAL`,
        `${extraBase.length} extra quad-point coincidence(s) ${extraBase.join(' ')} that hold only for the base quad — the degenerate hexagon; this is exactly why every level-1 datum in PART 2 differs from levels 2+`,
      );
    }
  }
}

function part4(): void {
  heading('PART 4 — what is PROVED, what is CHECKED, what is ASSUMED, and the remaining gap');
  console.log(`
PROVED for all k (arguments, not tables)
  P1. The rotation and mirror parts of the eight child transforms Ts[0..7] are
      level-independent: buildLevel derives them from T_RULES' cumulative angle
      sequence alone, never from the quad. Every Ts[j] is z -> d^{a_j} conj(z) + t_j
      with a_j fixed; only t_j moves with k.
  P2. The level-k quad is never an exact similar image of the level-(k-1) quad,
      and Ts^(k+1) is never conjugate to Ts^(k) by a pair of plane similarities.
      Exact integer residuals, non-zero at every level, and the DEFECT is a fixed
      bounded ring element, so it never vanishes however deep one goes. The
      anti-similarity variant is impossible outright because the slot rotations
      are not all congruent mod 6. => docs/FASS_1278.md section 4.4's stated
      justification for the crux lemma is FALSE, and every geometric-similarity
      route to Lemma 3 is closed.
  P3. All eight non-Gamma supertile types have the identical boundary SHAPE at
      every level (induction on the substitution rules: slot 7 is Gamma for every
      type, slots 0-6 are never Gamma, and only Gamma has an empty slot).
      Their LABELLED boundaries differ, which is exactly why |dB| differs by type.
  P4. The quad-point incidence pattern among the eight children is the same at
      every level. Each candidate incidence is the vanishing of a FIXED
      Z[zeta12]-linear functional of (Q_{k-1}, conj Q_{k-1}); that pair satisfies
      a fixed 8x8 linear recursion over Q(zeta12), so Cayley-Hamilton reduces
      "vanishes for all k" to "vanishes for k = 1..8", which is checked exactly.
      This is the level-independent skeleton the arrangement hangs on.

CHECKED EXACTLY, for the levels stated, not proved for all k
  C1. |dB(T,k)| is constant over the computed levels, for all 9 types, in all
      three configurations.
  C2. The GLUING and OUTER maps are literally CONSTANT (period 1, not 2) from
      level 2 onward, for all 9 types, in all three configurations, under the
      chirality-stable canonical labelling. Level 1 differs only because the
      children there are leaves rather than supertiles.
  C3. Contacts between children are always WHOLE quad-to-quad arcs: no child
      quad-arc is partly glued and partly outer, at any computed level.
  C4. The arc substitution word - the parent boundary written as a word in
      (child slot, child arc, direction) - is constant from level 2 onward.
  C5. The per-arc dot-count vector (9 types x 4 arcs) is constant over the
      computed levels, i.e. it is a fixed point of the non-negative integer
      matrix that C4's arc substitution abelianises to.

WHAT THIS BUYS
  C4 + C3 + P4 give a genuine induction SCHEME: if the arc substitution is
  level-independent, then the per-arc dot counts obey x^(k) = A x^(k-1) with A
  the fixed abelianisation, and x^(2) = x^(1) then forces x^(k) = x^(1) for ALL
  k - so C1 and C5 upgrade from "checked" to "proved", and with C3 the dot-level
  GLUING and OUTER maps are forced too, giving Lemma 3(a),(b),(c) for all k.
  The induction therefore closes on ONE hypothesis.

THE REMAINING GAP - a single crisp statement
  GAP. For every k >= 2 and every supertile type T, the level-k patch of T is
       edge-to-edge and overlap-free, and the eight children meet exactly along
       the quad-to-quad arcs whose endpoints coincide.
  Equivalently: whenever two children's quad-arcs share both endpoints, those
  arcs coincide as point sets. P4 already fixes which endpoints coincide, for
  all k; what is missing is that coincident endpoints force coincident arcs,
  which is precisely the statement that the substitution produces a genuine
  tiling at every level rather than an overlapping patch.

THE FALLBACK, stated precisely
  The gap is supplied by the substitution theorem for the hat/spectre metatiles
  (Smith, Myers, Kaplan, Goodman-Strauss, "An aperiodic monotile", and the
  companion "A chiral aperiodic monotile", together with the follow-up
  substitution-structure literature): the metatile substitution used here is a
  genuine combinatorial substitution whose supertiles tile without overlap at
  every level, with level-independent adjacency between the eight children.
  Assuming that theorem, GAP holds and Lemma 3 is PROVED for all k.
  What is then assumed: only that the arrangement of 8 metatiles defined by
  T_RULES is a tiling at every level. What is proved here, independently of it:
  P1-P4 above, the exact failure of self-similarity, and the exact constancy of
  the substitution datum for the computed levels. What is NOT established by
  this script: the gap for the SPECIFIC transform chain in web/src/core/tiles.ts
  as opposed to the published metatile substitution - the two agree numerically
  here, but this script does not prove they are the same substitution.`);
}

function main(): void {
  console.log(`Lemma 3 — level-independence of the substitution's strand composition`);
  console.log(`max level ${MAX}; ground-truth cross-check to level ${VALIDATE}; quad sweep to level ${DEEP}`);
  for (const family of FAMILIES) part1(family, Math.min(MAX + 1, 14));
  part2();
  part3();
  part4();
}

main();
console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
