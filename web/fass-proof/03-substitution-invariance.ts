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
 * exact edge cancellation over Z[zeta12] integer keys — no floats anywhere —
 * and then shows the resulting FIXED rule really does compose the routings.
 *
 * PART 3 hunts for a genuinely inductive invariant. Two of the candidates the
 * brief proposes are REFUTED; what survives is a substitution on the quad-to-
 * quad ARCS of a supertile boundary, and the level-independence of the
 * quad-point incidence pattern underneath it, which is PROVED for all k >= 2 by
 * a Cayley-Hamilton argument on the exact semilinear quad recursion.
 *
 * PART 4 states what is proved, what is checked to finite k, what is assumed,
 * and the single crisp gap that remains.
 *
 * Run: cd web && npx --yes tsx fass-proof/03-substitution-invariance.ts [maxLevel] [validateLevel]
 * Deep runs want more heap, e.g.
 *   NODE_OPTIONS=--max-old-space-size=8192 npx tsx fass-proof/03-substitution-invariance.ts 7 4
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

const MAX = Math.max(2, Number(process.argv[2] ?? 8));
const VALIDATE = Math.min(Number(process.argv[3] ?? 4), MAX);
/** Cheap exact sweep for the quad-incidence argument; coefficients stay exact to ~34. */
const DEEP = 24;
/** Levels whose boundary data stays resident (the ground-truth checks need them). */
const KEEP = Math.max(VALIDATE, 2);

const TYPES: readonly TileTypeId[] = [
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi',
];
const FAMILIES: readonly TileFamilyId[] = ['hex', 'spectre'];
const CFG_KEYS = ['hex128', 'spectre1278', 'flagship'] as const;
const cfgsOf = (f: TileFamilyId): Config[] =>
  f === 'hex' ? [CONFIGS.hex128] : [CONFIGS.spectre1278, CONFIGS.flagship];

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

const toB = (v: ZVec): BVec => [BigInt(v[0]), BigInt(v[1]), BigInt(v[2]), BigInt(v[3])];
const bAdd = (a: BVec, b: BVec): BVec => [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
const bSub = (a: BVec, b: BVec): BVec => [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
const bNeg = (a: BVec): BVec => [-a[0], -a[1], -a[2], -a[3]];

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
const bConj = (a: BVec): BVec => [a[0] + a[2], a[1], -a[2], -a[1] - a[3]];
function bRot(a: BVec, k: number): BVec {
  let r = a;
  for (let i = ((k % 12) + 12) % 12; i > 0; i--) r = bMul(r, B_POW[1]);
  return r;
}
const bIsZero = (a: BVec): boolean => a[0] === 0n && a[1] === 0n && a[2] === 0n && a[3] === 0n;
const bStr = (a: BVec): string => `[${a[0]}, ${a[1]}, ${a[2]}, ${a[3]}]`;

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
 * a linear system over Q(zeta12) in three unknowns. Solve from three slots by
 * Cramer (determinant and numerators stay in the ring) and test the remaining
 * slots by cross-multiplication with the determinant: division-free and exact.
 *
 * This is the WEAKEST form of the hypothesis — it allows a different similarity
 * on each side, which is what exact self-similarity of the hierarchy gives.
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
    `${family}: the similarity DEFECT takes only ${distinctDirect.size} value(s) over levels 1..${maxLevel}`,
    `{${[...distinctDirect].join(' , ')}} — a FIXED bounded non-zero ring element, while the quad itself inflates by 2.806 per level; that is exactly why the measured RATIO converges while the defect never vanishes`,
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
// PART 2 — exact boundary machinery
// ===========================================================================

/**
 * The GEOMETRY of a level-k supertile's boundary, plus the provenance of each
 * boundary edge and the full list of cancelled (welded) edge pairs.
 *
 * Only TWO shapes exist per level. Every supertile type gives its children the
 * same eight slots with the same transforms; slot 7 is Gamma for every type and
 * slots 0-6 are never Gamma, and only Gamma has an empty slot. So by induction
 * all eight non-Gamma types have literally the same boundary loop, edge index
 * for edge index, and Gamma has its own. That is what makes deep levels
 * affordable — only the LABELS differ between types, and those are cheap.
 */
interface Shape {
  /** Loop vertices; boundary edge i runs verts[i] -> verts[(i+1) % n]. */
  readonly verts: readonly ZVec[];
  /**
   * Loop index of each quad point, or -1 when that quad point is INTERIOR (the
   * only case in these two families is quad[2] of the spectre family's level-0
   * composite Gamma, which sits inside the Gamma1/Gamma2 seam). quadAt[0] === 0.
   */
  readonly quadAt: readonly [number, number, number, number];
  /** Provenance of boundary edge i: which child slot, which child boundary index. */
  readonly provSlot: Int32Array;
  readonly provIdx: Int32Array;
  /** Welded pairs, as four parallel arrays of (slot, idx). */
  readonly glueSlotA: Int32Array;
  readonly glueIdxA: Int32Array;
  readonly glueSlotB: Int32Array;
  readonly glueIdxB: Int32Array;
}

const isGammaType = (t: TileTypeId): boolean => t === 'Gamma';

interface PoolEdge {
  readonly slot: number;
  readonly idx: number;
  readonly a: ZVec;
  readonly b: ZVec;
}

function ekey(a: ZVec, b: ZVec): string {
  const ka = zKey(a);
  const kb = zKey(b);
  return ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
}

/**
 * Cancel a pool of physical edges (each appearing once or twice) and chain the
 * survivors into one loop, anchored at quad[0] and oriented so quad[1] is
 * reached before quad[3]. That direction rule is chirality-stable, which is
 * required because `buildSupertiles` pre-multiplies a reflection and therefore
 * mirrors every level relative to the previous one. Entirely exact: edges are
 * keyed by their integer Z[zeta12] endpoints.
 *
 * The routine also VERIFIES the tiling property at each level it is called on:
 * no edge is used by three tiles, every boundary vertex has degree 2, and the
 * survivors form exactly one closed loop. That is finite verification of the
 * hypothesis PART 4 names as the remaining gap, not a proof of it.
 */
function cancelAndLoop(pool: readonly PoolEdge[], quad: readonly ZVec[], tag: string): Shape {
  const byKey = new Map<string, PoolEdge[]>();
  for (const p of pool) {
    const k = ekey(p.a, p.b);
    const hit = byKey.get(k);
    if (hit) hit.push(p);
    else byKey.set(k, [p]);
  }
  const survivors: PoolEdge[] = [];
  const glue: [PoolEdge, PoolEdge][] = [];
  for (const group of byKey.values()) {
    if (group.length === 1) survivors.push(group[0]);
    else if (group.length === 2) glue.push([group[0], group[1]]);
    else throw new Error(`${tag}: an edge is used by ${group.length} tiles`);
  }
  byKey.clear();

  const nbr = new Map<string, { to: string; p: PoolEdge }[]>();
  const coord = new Map<string, ZVec>();
  for (const p of survivors) {
    const ka = zKey(p.a);
    const kb = zKey(p.b);
    coord.set(ka, p.a);
    coord.set(kb, p.b);
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

  const orderFrom: string[] = [];
  const orderEdge: PoolEdge[] = [];
  let cur = q0;
  for (;;) {
    const opts = nbr.get(cur)!;
    const last = orderEdge.length ? orderEdge[orderEdge.length - 1] : null;
    const step = opts.find((o) => o.p !== last) ?? opts[0];
    orderFrom.push(cur);
    orderEdge.push(step.p);
    cur = step.to;
    if (cur === q0) break;
    if (orderEdge.length > survivors.length + 1) throw new Error(`${tag}: outline did not close`);
  }
  if (orderEdge.length !== survivors.length) {
    throw new Error(`${tag}: ${orderEdge.length} of ${survivors.length} boundary edges — multiple loops`);
  }

  const n = orderEdge.length;
  const posOf = new Map<string, number>();
  for (let i = 0; i < n; i++) posOf.set(orderFrom[i], i);
  const i1 = posOf.get(zKey(quad[1])) ?? -1;
  const i3 = posOf.get(zKey(quad[3])) ?? -1;
  if (i1 < 0 || i3 < 0) throw new Error(`${tag}: quad[1] or quad[3] is not a boundary vertex`);
  const forward = i1 < i3;

  const verts: ZVec[] = new Array(n);
  const provSlot = new Int32Array(n);
  const provIdx = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const src = forward ? i : (n - i) % n;
    const e = forward ? orderEdge[src] : orderEdge[(src - 1 + n) % n];
    verts[i] = coord.get(orderFrom[src])!;
    provSlot[i] = e.slot;
    provIdx[i] = e.idx;
  }
  const keyIndex = new Map<string, number>();
  for (let i = 0; i < n; i++) keyIndex.set(zKey(verts[i]), i);
  const at = (z: ZVec): number => keyIndex.get(zKey(z)) ?? -1;
  const quadAt: [number, number, number, number] = [at(quad[0]), at(quad[1]), at(quad[2]), at(quad[3])];
  if (quadAt[0] !== 0) throw new Error(`${tag}: anchor is not at loop index 0`);
  const present = quadAt.filter((x) => x >= 0);
  for (let i = 1; i < present.length; i++) {
    if (present[i] <= present[i - 1]) throw new Error(`${tag}: quad points out of cyclic order: ${quadAt.join(',')}`);
  }

  const g = glue.length;
  const glueSlotA = new Int32Array(g);
  const glueIdxA = new Int32Array(g);
  const glueSlotB = new Int32Array(g);
  const glueIdxB = new Int32Array(g);
  for (let i = 0; i < g; i++) {
    glueSlotA[i] = glue[i][0].slot;
    glueIdxA[i] = glue[i][0].idx;
    glueSlotB[i] = glue[i][1].slot;
    glueIdxB[i] = glue[i][1].idx;
  }
  return { verts, quadAt, provSlot, provIdx, glueSlotA, glueIdxA, glueSlotB, glueIdxB };
}

const shapeCache = new Map<string, Shape>();
const labelCache = new Map<string, readonly string[]>();

function shapeOf(family: TileFamilyId, gamma: boolean, level: number): Shape {
  const key = `${family}|${gamma ? 'G' : 'N'}|${level}`;
  const hit = shapeCache.get(key);
  if (hit) return hit;
  let sh: Shape;
  if (level === 0) {
    const type: TileTypeId = gamma ? 'Gamma' : 'Delta';
    const insts = zExpand(family, type, 0);
    const pool: PoolEdge[] = [];
    for (let s = 0; s < insts.length; s++) {
      const pts = zLeafPts(family, insts[s].type).map((p) => zApply(insts[s].xform, p));
      for (let i = 0; i < pts.length; i++) {
        pool.push({ slot: s, idx: i, a: pts[i], b: pts[(i + 1) % pts.length] });
      }
    }
    sh = cancelAndLoop(pool, zSupertileQuad(family, 0), `${family}/${type}@0`);
  } else {
    const Ts = zSupertileTransforms(family, level);
    const subs = SUPER_RULES[gamma ? 'Gamma' : 'Delta'];
    const pool: PoolEdge[] = [];
    for (let slot = 0; slot < 8; slot++) {
      if (subs[slot] === 'null') continue;
      const cs = shapeOf(family, isGammaType(subs[slot] as TileTypeId), level - 1);
      const T = Ts[slot];
      const n = cs.verts.length;
      const img: ZVec[] = new Array(n);
      for (let i = 0; i < n; i++) img[i] = zApply(T, cs.verts[i]);
      for (let i = 0; i < n; i++) pool.push({ slot, idx: i, a: img[i], b: img[(i + 1) % n] });
    }
    sh = cancelAndLoop(pool, zSupertileQuad(family, level), `${family}/${gamma ? 'Gamma' : 'generic'}@${level}`);
  }
  shapeCache.set(key, sh);
  return sh;
}

/** Edge labels along the canonical boundary loop of one type at one level. */
function labelsOf(family: TileFamilyId, type: TileTypeId, level: number): readonly string[] {
  const key = `${family}|${type}|${level}`;
  const hit = labelCache.get(key);
  if (hit) return hit;
  const sh = shapeOf(family, isGammaType(type), level);
  const n = sh.verts.length;
  const out: string[] = new Array(n);
  if (level === 0) {
    const insts = zExpand(family, type, 0);
    const tables = insts.map((inst) => edgeLabels(family, inst.type));
    for (let i = 0; i < n; i++) out[i] = tables[sh.provSlot[i]][sh.provIdx[i]];
  } else {
    const subs = SUPER_RULES[type];
    const childLabels: (readonly string[] | null)[] = [];
    for (let slot = 0; slot < 8; slot++) {
      childLabels.push(subs[slot] === 'null' ? null : labelsOf(family, subs[slot] as TileTypeId, level - 1));
    }
    for (let i = 0; i < n; i++) out[i] = childLabels[sh.provSlot[i]]![sh.provIdx[i]];
  }
  labelCache.set(key, out);
  return out;
}

/** Drop everything cached for one level (memory control during a deep sweep). */
function evictLevel(level: number): void {
  for (const k of [...shapeCache.keys()]) if (k.endsWith(`|${level}`)) shapeCache.delete(k);
  for (const k of [...labelCache.keys()]) if (k.endsWith(`|${level}`)) labelCache.delete(k);
}

/**
 * Boundary connection dots: the loop positions of the boundary edges whose label
 * is a `minor == 0` edge of a selected class. A connection dot is exactly the
 * midpoint of such an edge, and a boundary edge belongs to exactly one leaf, so
 * these are precisely the welded degree-1 dots — confirmed against the full
 * welded strand graph in PART 2a.
 */
function dotEdgeIdxs(cfg: Config, labels: readonly string[]): number[] {
  const sel = new Set(cfg.subset);
  const out: number[] = [];
  for (let i = 0; i < labels.length; i++) {
    const { major, minor } = parseEdgeLabel(labels[i]);
    if (minor === 0 && sel.has(major)) out.push(i);
  }
  return out;
}

/** Doubled exact coordinate of the dot on boundary edge i. */
function dotPoint2(sh: Shape, i: number): ZVec {
  return zAdd(sh.verts[i], sh.verts[(i + 1) % sh.verts.length]);
}

/**
 * Which quad-to-quad arc a boundary edge belongs to, named by the quad point
 * that starts it. Interior quad points (quadAt = -1) do not split, so such a
 * boundary has fewer than four arcs.
 */
function arcOf(sh: Shape, idx: number): number {
  const q = sh.quadAt;
  let best = -1;
  let bestAt = -1;
  for (let m = 0; m < 4; m++) {
    if (q[m] >= 0 && q[m] <= idx && q[m] >= bestAt) {
      bestAt = q[m];
      best = m;
    }
  }
  if (best >= 0) return best;
  for (let m = 3; m >= 0; m--) if (q[m] >= 0) return m;
  return 0;
}

interface Datum {
  readonly ifaceSize: number;
  readonly childSizes: readonly (number | null)[];
  readonly gluing: string;
  readonly outer: string;
  readonly gluePairs: readonly (readonly [string, string])[];
  readonly outerMap: ReadonlyMap<string, number>;
  readonly dotsPerArc: readonly number[];
}

interface ArcReport {
  readonly word: string;
  readonly mixed: number;
  readonly mixedDetail: string;
  readonly flipsOnQuadPoints: boolean;
  readonly flipDetail: string;
}

interface Analysis {
  readonly arc: ArcReport;
  readonly datum: Map<string, Datum>;
}

/** Everything one (family, type, level) contributes, computed from one assembly. */
function analyze(family: TileFamilyId, type: TileTypeId, level: number): Analysis {
  const sh = shapeOf(family, isGammaType(type), level);
  const labels = labelsOf(family, type, level);
  const subs = SUPER_RULES[type];
  const n = sh.verts.length;

  const childShape: (Shape | null)[] = [];
  const childLabels: (readonly string[] | null)[] = [];
  for (let slot = 0; slot < 8; slot++) {
    if (subs[slot] === 'null') {
      childShape.push(null);
      childLabels.push(null);
      continue;
    }
    const ct = subs[slot] as TileTypeId;
    childShape.push(shapeOf(family, isGammaType(ct), level - 1));
    childLabels.push(labelsOf(family, ct, level - 1));
  }

  // ---- the substitution datum, per configuration --------------------------
  const datum = new Map<string, Datum>();
  for (const cfg of cfgsOf(family)) {
    const parentDots = dotEdgeIdxs(cfg, labels);
    const parentDotAt = new Map<number, number>();
    parentDots.forEach((e, d) => parentDotAt.set(e, d));
    const childDotOf: (Map<number, number> | null)[] = [];
    const childSizes: (number | null)[] = [];
    for (let slot = 0; slot < 8; slot++) {
      const cl = childLabels[slot];
      if (!cl) {
        childDotOf.push(null);
        childSizes.push(null);
        continue;
      }
      const idxs = dotEdgeIdxs(cfg, cl);
      const m = new Map<number, number>();
      idxs.forEach((e, d) => m.set(e, d));
      childDotOf.push(m);
      childSizes.push(idxs.length);
    }
    const carries = (slot: number, idx: number): number | null => {
      const m = childDotOf[slot];
      if (!m) return null;
      const d = m.get(idx);
      return d === undefined ? null : d;
    };
    const glue: string[] = [];
    const gluePairs: (readonly [string, string])[] = [];
    for (let g = 0; g < sh.glueSlotA.length; g++) {
      const dp = carries(sh.glueSlotA[g], sh.glueIdxA[g]);
      const dq = carries(sh.glueSlotB[g], sh.glueIdxB[g]);
      if (dp === null && dq === null) continue;
      if (dp === null || dq === null) {
        throw new Error(
          `${cfg.id} ${type}@${level}: a welded edge carries a dot on one side only (slots ${sh.glueSlotA[g]}/${sh.glueSlotB[g]})`,
        );
      }
      const A = `${sh.glueSlotA[g]}:${dp}`;
      const B = `${sh.glueSlotB[g]}:${dq}`;
      gluePairs.push(A < B ? [A, B] : [B, A]);
      glue.push(A < B ? `${A}=${B}` : `${B}=${A}`);
    }
    glue.sort();
    const outer: string[] = [];
    const outerMap = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const d = carries(sh.provSlot[i], sh.provIdx[i]);
      if (d === null) continue;
      const pd = parentDotAt.get(i);
      if (pd === undefined) throw new Error(`${cfg.id} ${type}@${level}: a surviving dot is not a parent dot`);
      outer.push(`${sh.provSlot[i]}:${d}>${pd}`);
      outerMap.set(`${sh.provSlot[i]}:${d}`, pd);
    }
    outer.sort();
    const dpa = [0, 0, 0, 0];
    for (const e of parentDots) dpa[arcOf(sh, e)]++;
    datum.set(cfg.id, {
      ifaceSize: parentDots.length,
      childSizes,
      gluing: glue.join(' '),
      outer: outer.join(' '),
      gluePairs,
      outerMap,
      dotsPerArc: dpa,
    });
  }

  // ---- the quad-arc structure --------------------------------------------
  const Ts = zSupertileTransforms(family, level);
  const Qprev = zSupertileQuad(family, level - 1);
  const slotQuadKeys = new Set<string>();
  for (let s = 0; s < 8; s++) for (let p = 0; p < 4; p++) slotQuadKeys.add(zKey(zApply(Ts[s], Qprev[p])));

  const status: (Int8Array | null)[] = childShape.map((cs) => (cs ? new Int8Array(cs.verts.length).fill(-1) : null));
  const count = new Map<string, { glued: number; outer: number }>();
  const bump = (slot: number, idx: number, glued: boolean): void => {
    const cs = childShape[slot];
    if (!cs) return;
    status[slot]![idx] = glued ? 1 : 0;
    const k = `${slot}:${arcOf(cs, idx)}`;
    const c = count.get(k) ?? { glued: 0, outer: 0 };
    if (glued) c.glued++;
    else c.outer++;
    count.set(k, c);
  };
  for (let g = 0; g < sh.glueSlotA.length; g++) {
    bump(sh.glueSlotA[g], sh.glueIdxA[g], true);
    bump(sh.glueSlotB[g], sh.glueIdxB[g], true);
  }
  for (let i = 0; i < n; i++) bump(sh.provSlot[i], sh.provIdx[i], false);

  let mixed = 0;
  const mixedDetail: string[] = [];
  for (const [k, c] of [...count.entries()].sort()) {
    if (c.outer !== 0 && c.glued !== 0) {
      mixed++;
      mixedDetail.push(`${k}(${c.glued}g/${c.outer}o)`);
    }
  }

  let flipsOnQuadPoints = true;
  const flipDetail: string[] = [];
  for (let s = 0; s < 8; s++) {
    const cs = childShape[s];
    const st = status[s];
    if (!cs || !st) continue;
    const m = cs.verts.length;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      if (st[i] === st[j]) continue;
      if (!slotQuadKeys.has(zKey(zApply(Ts[s], cs.verts[j])))) {
        flipsOnQuadPoints = false;
        flipDetail.push(`slot ${s} at child edge ${j}`);
      }
    }
  }

  const toks: string[] = [];
  let prevTok = '';
  for (let i = 0; i < n; i++) {
    const s = sh.provSlot[i];
    const cs = childShape[s]!;
    const m = cs.verts.length;
    let dir = '?';
    if (i + 1 < n && sh.provSlot[i + 1] === s) dir = (sh.provIdx[i + 1] - sh.provIdx[i] + m) % m === 1 ? '+' : '-';
    else if (i > 0 && sh.provSlot[i - 1] === s) dir = (sh.provIdx[i] - sh.provIdx[i - 1] + m) % m === 1 ? '+' : '-';
    const tok = `${arcOf(sh, i)}<${s}.${arcOf(cs, sh.provIdx[i])}${dir}`;
    if (tok !== prevTok) {
      toks.push(tok);
      prevTok = tok;
    }
  }

  return {
    arc: {
      word: toks.join(' '),
      mixed,
      mixedDetail: mixedDetail.join(' '),
      flipsOnQuadPoints,
      flipDetail: flipDetail.slice(0, 4).join(', '),
    },
    datum,
  };
}

// ---------------------------------------------------------------------------
// Lemma 3(c) in action: composing the routing with the FIXED rule F_T
// ---------------------------------------------------------------------------

/** A routing is a perfect matching of boundary dot indices, e.g. '0-3 1-2'. */
function routingGroundTruth(cfg: Config, type: TileTypeId, level: number): string {
  const tr = trace(buildStrands(cfg, zExpand(cfg.family, type, level)));
  if (tr.circuits.length) return `CIRCUITS:${tr.circuits.length}`;
  const sh = shapeOf(cfg.family, isGammaType(type), level);
  const idxOf = new Map<string, number>();
  dotEdgeIdxs(cfg, labelsOf(cfg.family, type, level)).forEach((e, d) => idxOf.set(zKey(dotPoint2(sh, e)), d));
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

const datumStore = new Map<string, Datum>();
const datumKey = (cfg: Config, t: TileTypeId, lv: number): string => `${cfg.id}|${t}|${lv}`;

/**
 * Thread the children's own routings through the parent's gluing map and read
 * off how the parent's outer dots end up paired. Uses the datum of level
 * min(level, 2); since the datum is constant from level 2, every level >= 2
 * uses literally the same F_T.
 */
function composeRouting(
  cfg: Config,
  type: TileTypeId,
  level: number,
  childRouting: (slot: number) => string,
): string {
  const d = datumStore.get(datumKey(cfg, type, Math.min(level, 2)));
  if (!d) throw new Error(`no datum for ${cfg.id}/${type}@${Math.min(level, 2)}`);
  const adjArc = new Map<string, string>();
  const subs = SUPER_RULES[type];
  for (let slot = 0; slot < 8; slot++) {
    if (subs[slot] === 'null') continue;
    const r = childRouting(slot);
    if (!r) continue;
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
      if (guard > 1e6) return 'NON-TERMINATING';
      const next = useArc ? adjArc.get(cur) : adjGlue.get(cur);
      if (next === undefined) return `DANGLING:${cur}`;
      cur = next;
      useArc = !useArc;
      const end = d.outerMap.get(cur);
      if (end !== undefined && !useArc) {
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
  const k = datumKey(cfg, type, level);
  const hit = routeCache.get(k);
  if (hit !== undefined) return hit;
  const r =
    level === 0
      ? routingGroundTruth(cfg, type, 0)
      : composeRouting(cfg, type, level, (slot) =>
          routingByFixedRule(cfg, SUPER_RULES[type][slot] as TileTypeId, level - 1),
        );
  routeCache.set(k, r);
  return r;
}

// ===========================================================================
// PART 3 helpers — boundary words and the symbolic quad recursion
// ===========================================================================

const UNIT_BY_KEY = new Map<string, number>();
{
  let v: ZVec = [1, 0, 0, 0];
  for (let j = 0; j < 12; j++) {
    UNIT_BY_KEY.set(zKey(v), j);
    v = [-v[3], v[0], v[1] + v[3], v[2]];
  }
}

function turningWord(sh: Shape): string {
  const n = sh.verts.length;
  const dirs: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const j = UNIT_BY_KEY.get(zKey(zSub(sh.verts[(i + 1) % n], sh.verts[i])));
    if (j === undefined) throw new Error('boundary step is not a unit d^k');
    dirs[i] = j;
  }
  const turns: number[] = new Array(n);
  for (let i = 0; i < n; i++) turns[i] = (((dirs[(i + 1) % n] - dirs[i]) % 12) + 12) % 12;
  return turns.join(',');
}

interface MetaRun {
  readonly cls: string;
  readonly len: number;
}

/** Maximal runs of consecutive boundary edges of one seam (same class, consecutive minors). */
function metaRuns(labels: readonly string[]): MetaRun[] {
  const n = labels.length;
  const lab = labels.map(parseEdgeLabel);
  const brk: boolean[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = lab[i];
    const b = lab[(i + 1) % n];
    brk[i] = !(a.sign === b.sign && a.major === b.major && a.variant === b.variant && Math.abs(a.minor - b.minor) === 1);
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
    out.push({ cls: `${lab[s].sign < 0 ? '-' : '+'}${lab[s].major}${lab[s].variant}`, len: j - i + 1 });
    i = j + 1;
  }
  return out;
}

/** Booth's least-rotation, O(n) — the naive O(n^2) version is far too slow at depth. */
function leastRotation(s: readonly number[]): number {
  const n = s.length;
  if (n === 0) return 0;
  const f = new Int32Array(2 * n).fill(-1);
  let k = 0;
  for (let j = 1; j < 2 * n; j++) {
    const sj = s[j % n];
    let i = f[j - k - 1];
    while (i !== -1 && sj !== s[(k + i + 1) % n]) {
      if (sj < s[(k + i + 1) % n]) k = j - i - 1;
      i = f[i];
    }
    if (sj !== s[(k + i + 1) % n]) {
      if (sj < s[k % n]) k = j;
      f[j - k] = -1;
    } else {
      f[j - k] = i + 1;
    }
  }
  return k;
}

const classId = new Map<string, number>();
function canonicalCyclic(word: readonly string[]): string {
  const n = word.length;
  if (n === 0) return '';
  const ids: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let id = classId.get(word[i]);
    if (id === undefined) {
      id = classId.size;
      classId.set(word[i], id);
    }
    ids[i] = id;
  }
  const k = leastRotation(ids);
  const out: string[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = word[(k + i) % n];
  return out.join('|');
}

/**
 * A formal element `sum_m c[m] Q[m] + sum_m cc[m] conj(Q[m])`, with Q[0..3] the
 * four quad points of the PREVIOUS level as indeterminates. Every operation
 * `buildLevel` performs on a quad is one of these, so running it symbolically
 * yields the exact matrix of the quad recursion — no fitting, no guessing.
 */
interface Sym {
  readonly c: readonly BVec[];
  readonly cc: readonly BVec[];
}
const S_ZERO: Sym = { c: [B_ZERO, B_ZERO, B_ZERO, B_ZERO], cc: [B_ZERO, B_ZERO, B_ZERO, B_ZERO] };
const symbolQ = (m: number): Sym => ({
  c: [0, 1, 2, 3].map((i) => (i === m ? B_ONE : B_ZERO)),
  cc: [B_ZERO, B_ZERO, B_ZERO, B_ZERO],
});
const sAdd = (x: Sym, y: Sym): Sym => ({
  c: x.c.map((v, i) => bAdd(v, y.c[i])),
  cc: x.cc.map((v, i) => bAdd(v, y.cc[i])),
});
const sSub = (x: Sym, y: Sym): Sym => ({
  c: x.c.map((v, i) => bSub(v, y.c[i])),
  cc: x.cc.map((v, i) => bSub(v, y.cc[i])),
});
const sRot = (x: Sym, k: number): Sym => ({ c: x.c.map((v) => bRot(v, k)), cc: x.cc.map((v) => bRot(v, k)) });
const sConj = (x: Sym): Sym => ({ c: x.cc.map(bConj), cc: x.c.map(bConj) });
interface SAffine {
  readonly k: number;
  readonly m: 0 | 1;
  readonly t: Sym;
}
const sApply = (T: SAffine, x: Sym): Sym => sAdd(sRot(T.m ? sConj(x) : x, T.k), T.t);
const sMul = (A: SAffine, B: SAffine): SAffine => ({
  k: (((A.k + (A.m ? -B.k : B.k)) % 12) + 12) % 12,
  m: (A.m ^ B.m) as 0 | 1,
  t: sAdd(sRot(A.m ? sConj(B.t) : B.t, A.k), A.t),
});

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
  return {
    Ts,
    superQuad: [sApply(Ts[6], quad[2]), sApply(Ts[5], quad[1]), sApply(Ts[3], quad[2]), sApply(Ts[0], quad[1])],
  };
}

function symEval(x: Sym, Q: readonly ZVec[]): BVec {
  let acc = B_ZERO;
  for (let m = 0; m < 4; m++) {
    acc = bAdd(acc, bMul(x.c[m], toB(Q[m])));
    acc = bAdd(acc, bMul(x.cc[m], bConj(toB(Q[m]))));
  }
  return acc;
}

// ===========================================================================
// Sweep: one assembly per (family, type, level), level-major
// ===========================================================================

interface Row {
  readonly nBoundary: number;
  readonly metaCount: number;
  readonly metaCanon: string;
  readonly turn: string;
  readonly arc: ArcReport | null;
}

const rows = new Map<string, Row>();
const metaLenByClass = new Map<string, Map<string, Set<number>>>();
const rowKey = (f: TileFamilyId, t: TileTypeId, lv: number): string => `${f}|${t}|${lv}`;

function sweep(): void {
  for (const family of FAMILIES) {
    metaLenByClass.set(family, new Map());
    const lens = metaLenByClass.get(family)!;
    for (let lv = 0; lv <= MAX; lv++) {
      for (const T of TYPES) {
        const sh = shapeOf(family, isGammaType(T), lv);
        const runs = metaRuns(labelsOf(family, T, lv));
        for (const r of runs) {
          if (!lens.has(r.cls)) lens.set(r.cls, new Set());
          lens.get(r.cls)!.add(r.len);
        }
        const a = lv >= 1 ? analyze(family, T, lv) : null;
        if (a) for (const cfg of cfgsOf(family)) datumStore.set(datumKey(cfg, T, lv), a.datum.get(cfg.id)!);
        rows.set(rowKey(family, T, lv), {
          nBoundary: sh.verts.length,
          metaCount: runs.length,
          metaCanon: canonicalCyclic(runs.map((r) => r.cls)),
          turn: lv <= 4 ? turningWord(sh) : `len=${sh.verts.length}`,
          arc: a ? a.arc : null,
        });
      }
      if (lv - 1 > KEEP) evictLevel(lv - 1);
    }
  }
}

/** Smallest k0 with vals[k0..] all equal, as a level (1-based via `base`); -1 if none. */
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
// Reporting
// ===========================================================================

function part2a(): void {
  for (const family of FAMILIES) {
    heading(`PART 2a — ${family}: the recursive boundary equals the fully-expanded one (exact)`);
    for (const cfg of cfgsOf(family)) {
      let good = true;
      let detail = '';
      for (let lv = 1; lv <= VALIDATE; lv++) {
        for (const T of TYPES) {
          const sh = shapeOf(family, isGammaType(T), lv);
          const mine = dotEdgeIdxs(cfg, labelsOf(family, T, lv)).map((i) => zKey(dotPoint2(sh, i)));
          // Ground truth: expand all the way to leaves, cancel edges over the
          // whole patch, and read the dots off the resulting outline.
          const insts = zExpand(family, T, lv);
          const pool: PoolEdge[] = [];
          const labTable: string[] = [];
          for (let s = 0; s < insts.length; s++) {
            const pts = zLeafPts(family, insts[s].type).map((p) => zApply(insts[s].xform, p));
            const labs = edgeLabels(family, insts[s].type);
            for (let i = 0; i < pts.length; i++) {
              pool.push({ slot: labTable.length, idx: 0, a: pts[i], b: pts[(i + 1) % pts.length] });
              labTable.push(labs[i]);
            }
          }
          const gtShape = cancelAndLoop(pool, zSupertileQuad(family, lv), `gt ${T}@${lv}`);
          const gtLabels = Array.from(gtShape.provSlot, (s) => labTable[s]);
          const gt = dotEdgeIdxs(cfg, gtLabels).map((i) => zKey(dotPoint2(gtShape, i)));
          let deg1 = 0;
          for (const d of buildStrands(cfg, insts).degree.values()) if (d === 1) deg1++;
          if (mine.length !== deg1 || mine.join(' ') !== gt.join(' ')) {
            good = false;
            detail = `${T}@${lv}: recursive ${mine.length} dots vs welded-degree-1 ${deg1} vs expanded-outline ${gt.length}`;
          }
        }
      }
      ok(
        good,
        `${cfg.id}: recursive boundary dots = welded degree-1 dots = fully-expanded outline dots, same order, levels 1..${VALIDATE}`,
        detail,
      );
    }
  }
}

function part2b(): void {
  for (const family of FAMILIES) {
    for (const cfg of cfgsOf(family)) {
      heading(`PART 2b — ${cfg.id}: interface size, GLUING and OUTER maps, levels 1..${MAX}`);
      console.log('  | type | |dB| by level | gluing map | outer map |');
      console.log('  |---|---|---|---|');
      const stables: number[] = [];
      for (const T of TYPES) {
        const sizes: number[] = [];
        const glues: string[] = [];
        const outers: string[] = [];
        for (let lv = 1; lv <= MAX; lv++) {
          const d = datumStore.get(datumKey(cfg, T, lv))!;
          sizes.push(d.ifaceSize);
          glues.push(d.gluing);
          outers.push(d.outer);
        }
        const gs = firstStable(glues, 1);
        const os = firstStable(outers, 1);
        if (gs > 0) stables.push(gs);
        if (os > 0) stables.push(os);
        console.log(`  | ${pad(T, 7)} | ${sizes.join(' ')} | ${periodOf(glues, 1)} | ${periodOf(outers, 1)} |`);
        ok(new Set(sizes).size === 1, `${T}: |dB| constant over levels 1..${MAX}`, `= ${sizes[0]}`);
        ok(gs > 0, `${T}: GLUING map literally CONSTANT from some level on`, periodOf(glues, 1));
        ok(os > 0, `${T}: OUTER map literally CONSTANT from some level on`, periodOf(outers, 1));
      }
      const pre = stables.length ? Math.max(...stables) : -1;
      ok(
        pre > 0,
        `${cfg.id}: the whole substitution datum is constant for EVERY type from level ${pre} through ${MAX}`,
        `pre-period ${pre - 1}; the period is 1, NOT 2 — the chirality-stable anchoring already absorbs the per-level mirror flip that docs/FASS_1278.md reports as a period-2 alternation`,
      );
      const rep: TileTypeId = 'Psi';
      console.log(`\n  ${rep} substitution datum (the fixed rule F_Psi), levels 1..${Math.min(3, MAX)}:`);
      for (let lv = 1; lv <= Math.min(3, MAX); lv++) {
        const d = datumStore.get(datumKey(cfg, rep, lv))!;
        console.log(`    lv${lv}  |dB|=${d.ifaceSize}  children |dB| = [${d.childSizes.join(', ')}]`);
        console.log(`          gluing ${d.gluing}`);
        console.log(`          outer  ${d.outer}`);
      }
    }
  }
}

function part2c(): void {
  heading(`PART 2c — the FIXED rule F_T really is the composition operator (levels 1..${VALIDATE})`);
  console.log(
    `  Thread each child's own routing through the LEVEL-2 gluing map and read off how the parent's\n` +
      `  outer dots end up paired. If Lemma 3(c) holds, that reproduces the parent's routing computed\n` +
      `  independently from the fully welded strand graph, at every level.\n`,
  );
  for (const key of CFG_KEYS) {
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
      good ? 'Lemma 3(c) verified as an identity, not just as two tables that happen to agree' : detail,
    );
  }
}

function part3a(): void {
  heading('PART 3a — the boundary WORD candidates of the brief: what they actually do');
  for (const family of FAMILIES) {
    for (const T of ['Psi', 'Gamma'] as TileTypeId[]) {
      const counts: number[] = [];
      const canon: string[] = [];
      const perim: number[] = [];
      const turns: string[] = [];
      for (let lv = 0; lv <= MAX; lv++) {
        const r = rows.get(rowKey(family, T, lv))!;
        counts.push(r.metaCount);
        canon.push(r.metaCanon);
        perim.push(r.nBoundary);
        turns.push(r.turn);
      }
      console.log(`  ${family}/${T}: |boundary| ${perim.join(' ')} ; boundary meta-edges ${counts.join(' ')}`);
      if (new Set(canon).size === 1) ok(true, `${family}/${T}: boundary meta-edge class word constant`);
      else
        refuted(
          `${family}/${T}: the boundary meta-edge CLASS word is NOT constant in k`,
          `${new Set(canon).size} distinct words over levels 0..${MAX}; the count grows ${counts.join(' -> ')}`,
        );
      if (new Set(turns).size === 1) ok(true, `${family}/${T}: turning-angle sequence constant`);
      else
        refuted(
          `${family}/${T}: the turning-angle sequence is NOT constant in k`,
          `its length alone grows ${perim.join(' -> ')}`,
        );
    }
  }
  console.log('');
  for (const T of TYPES) {
    let same = true;
    let from0 = true;
    for (let lv = 0; lv <= MAX; lv++) {
      const a = rows.get(rowKey('hex', T, lv))!.metaCanon;
      const b = rows.get(rowKey('spectre', T, lv))!.metaCanon;
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
        : 'level 0 differs only because the spectre composite Gamma is two leaves welded along their class-7 seam while the hex Gamma is a single hexagon',
    );
  }
  for (const family of FAMILIES) {
    const lens = metaLenByClass.get(family)!;
    const pure = [...lens.values()].every((s) => s.size === 1);
    ok(
      pure,
      `${family}: a boundary meta-edge's physical LENGTH is a function of its class alone`,
      [...lens.entries()].sort().map(([k, s]) => `${k}:${[...s].join('/')}`).join(' '),
    );
  }
  console.log(
    `\n  Reading: the length vector therefore carries no information the class word does not already\n` +
      `  carry, and the class word is NOT level-independent, so the brief's "fixed integer matrix acting\n` +
      `  on a length vector" route does not close the induction. The supertile boundary is fractal\n` +
      `  (08-supertile-outline.ts: perimeter x4.23 per level against a linear inflation of 2.806), so its\n` +
      `  word grows without bound and any level-independent datum must live on a COARSER decomposition.`,
  );
}

function part3b(): void {
  heading('PART 3b — the quad-ARC decomposition: the invariant that survives');
  console.log(
    `  Every supertile boundary carries its four quad points, and the substitution places children by\n` +
      `  identifying quad points (T_RULES). Split each boundary at its quad points into ARCS and ask\n` +
      `  whether the substitution acts on arcs rather than on edges.\n`,
  );
  for (const family of FAMILIES) {
    for (const T of TYPES) {
      const words: string[] = [];
      const mixedByLevel: string[] = [];
      let mixedLevels = 0;
      let flipsOk = true;
      let flipDetail = '';
      for (let lv = 1; lv <= MAX; lv++) {
        const a = rows.get(rowKey(family, T, lv))!.arc!;
        words.push(a.word);
        if (a.mixed) mixedLevels++;
        mixedByLevel.push(a.mixed ? `lv${lv}:{${a.mixedDetail}}` : `lv${lv}:none`);
        if (!a.flipsOnQuadPoints) {
          flipsOk = false;
          if (!flipDetail) flipDetail = `lv${lv}: ${a.flipDetail}`;
        }
      }
      const st = firstStable(words, 1);
      if (mixedLevels === 0) {
        ok(
          true,
          `${family}/${T}: every child quad-arc is entirely glued or entirely outer`,
          'contacts between children are whole quad-arcs',
        );
      } else {
        console.log(`  ${family}/${pad(T, 7)} mixed arcs: ${mixedByLevel.join(' ')}`);
        refuted(
          `${family}/${T}: NOT every child quad-arc is pure`,
          'Gamma is the only type with an empty slot (slot 2); the two arcs flanking the notch are split, at every level',
        );
      }
      if (T === 'Gamma' && !flipsOk) {
        refuted(
          `${family}/Gamma: two glued/outer transitions do NOT sit on any slot quad point`,
          `${flipDetail} — these are the two ends of the notch left by the empty slot 2, where the absent child would have stopped touching children 1 and 3; their position inside the arc is level-DEPENDENT`,
        );
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
  console.log(`\n  spectre/Psi arc substitution (parentArc<slot.childArc,direction), level ${Math.min(3, MAX)}:`);
  console.log(`    ${rows.get(rowKey('spectre', 'Psi', Math.min(3, MAX)))!.arc!.word}`);

  heading('PART 3b(ii) — per-arc dot counts are a FIXED POINT of the arc substitution');
  for (const key of CFG_KEYS) {
    const cfg = CONFIGS[key];
    let constant = true;
    let fromLevel1 = true;
    let detail = '';
    const cells: string[] = [];
    for (const T of TYPES) {
      const vs: string[] = [];
      for (let lv = 1; lv <= MAX; lv++) vs.push(datumStore.get(datumKey(cfg, T, lv))!.dotsPerArc.join(','));
      if (new Set(vs.slice(1)).size !== 1) {
        constant = false;
        detail = `${T}: ${vs.join(' | ')}`;
      }
      if (new Set(vs).size !== 1) fromLevel1 = false;
      cells.push(`${T}=[${vs[vs.length - 1]}]`);
    }
    console.log(`  ${cfg.id} (level ${MAX}): ${cells.join(' ')}`);
    ok(
      constant,
      `${cfg.id}: the per-arc dot-count vector is constant over levels 2..${MAX}`,
      constant
        ? `a fixed point of the non-negative integer matrix the arc substitution abelianises to${fromLevel1 ? '' : '; level 1 differs for Gamma alone, whose children there are leaves'}`
        : detail,
    );
  }
}

function part3c(): void {
  heading('PART 3c — the quad-point incidence pattern, PROVED level-independent for all k >= 2');
  const { Ts: sTs, superQuad: sSuper } = symbolicLevel();
  for (const family of FAMILIES) {
    let symOk = true;
    for (let lv = 1; lv <= Math.min(DEEP, 20); lv++) {
      const Q = zSupertileQuad(family, lv - 1);
      const real = zSupertileQuad(family, lv);
      for (let m = 0; m < 4; m++) if (!bIsZero(bSub(symEval(sSuper[m], Q), toB(real[m])))) symOk = false;
      const realTs = zSupertileTransforms(family, lv);
      for (let j = 0; j < 8; j++) {
        if (sTs[j].k !== realTs[j].k || sTs[j].m !== realTs[j].m) symOk = false;
        if (!bIsZero(bSub(symEval(sTs[j].t, Q), toB(realTs[j].t)))) symOk = false;
      }
    }
    ok(
      symOk,
      `${family}: the symbolic quad recursion reproduces buildLevel exactly, levels 1..${Math.min(DEEP, 20)}`,
      'Q_k = M . conj(Q_{k-1}) with M a FIXED matrix over Z[zeta12], and every Ts[j].t a FIXED linear functional of conj(Q_{k-1})',
    );
    ok(
      sSuper.every((s) => s.c.every(bIsZero)),
      `${family}: the quad recursion is exactly semilinear`,
      'Q_k depends on conj(Q_{k-1}) only — there is no Q_{k-1} term',
    );

    const funcs: { tag: string; f: Sym }[] = [];
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        for (let p = 0; p < 4; p++) {
          for (let q = 0; q < 4; q++) {
            funcs.push({
              tag: `${i}.${p}=${j}.${q}`,
              f: sSub(sApply(sTs[i], symbolQ(p)), sApply(sTs[j], symbolQ(q))),
            });
          }
        }
      }
    }
    // v_j = (Q_j, conj Q_j) obeys v_j = N v_{j-1} for the FIXED 8x8 matrix
    // N = [[0, M], [conj M, 0]] over Q(zeta12). Cayley-Hamilton puts v_{j+8} in
    // the span of v_j..v_{j+7}, so a fixed linear functional vanishing on
    // v_1..v_8 vanishes on every v_j with j >= 1 — i.e. at every SUPERTILE level
    // k >= 2, whose children are placed by Ts built from Q_{k-1}. The base quad
    // Q_0 is separate: the hexagon's is degenerate and carries extra coincidences.
    const CH_FROM = 1;
    const hits: string[] = [];
    const baseHits: string[] = [];
    let provedAll = true;
    let sporadic = '';
    let minNonZero = Infinity;
    for (const { tag, f } of funcs) {
      const vals: BVec[] = [];
      for (let lv = 0; lv <= DEEP; lv++) vals.push(symEval(f, zSupertileQuad(family, lv)));
      if (bIsZero(vals[0])) baseHits.push(tag);
      if (vals.slice(CH_FROM, CH_FROM + 8).every(bIsZero)) {
        hits.push(tag);
        if (!vals.slice(CH_FROM).every(bIsZero)) provedAll = false;
      } else {
        for (const v of vals.slice(CH_FROM)) {
          if (bIsZero(v)) sporadic = tag;
          else minNonZero = Math.min(minNonZero, bAbs(v));
        }
      }
    }
    console.log(
      `  ${family}: ${hits.length} coincident quad-point pairs among the 8 children, at every supertile level >= 2:`,
    );
    console.log(`    ${hits.join('  ')}`);
    const extraBase = baseHits.filter((t) => !hits.includes(t));
    console.log(
      `  ${family}: at supertile level 1 (the base quad) there are ${baseHits.length} pairs` +
        (extraBase.length ? `, the EXTRA one(s) being ${extraBase.join(' ')}` : ', the same set'),
    );
    ok(
      provedAll && !sporadic,
      `${family}: the quad-point incidence pattern is the SAME at every supertile level k >= 2 — PROVED for all such k`,
      `each incidence is the vanishing of a FIXED Z[zeta12]-linear functional of (Q_{k-1}, conj Q_{k-1}); that pair obeys a fixed 8x8 linear recursion, so Cayley-Hamilton reduces "vanishes for all k >= 2" to the window k = 2..9, checked exactly here. Non-incidences re-checked exactly to level ${DEEP} (smallest non-zero gap ${Number.isFinite(minNonZero) ? minNonZero.toFixed(4) : 'n/a'})`,
    );
    if (extraBase.length) {
      note(
        `${family}: supertile level 1 is EXCEPTIONAL`,
        `${extraBase.length} extra quad-point coincidence(s) ${extraBase.join(' ')} hold for the base quad only — the hexagon's quad is degenerate. That is exactly why every level-1 datum in PART 2 differs from levels 2+`,
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
      with a_j fixed; only the translation t_j moves with k.
  P2. The level-k quad is never an exact similar image of the level-(k-1) quad,
      and Ts^(k+1) is never conjugate to Ts^(k) by any pair of plane similarities.
      The exact integer residuals are non-zero at every level, and the DEFECT is a
      FIXED bounded ring element, so it cannot vanish however deep one goes, even
      though the measured ratio converges to sqrt(4+sqrt(15)) and the angle to
      +-11.5669 deg (spectre) / +-54.0947 deg (hex). The anti-similarity variant is
      impossible outright because the slot rotations are not all congruent mod 6.
      => docs/FASS_1278.md section 4.4's stated justification for the crux lemma is
      FALSE, and every geometric-similarity route to Lemma 3 is closed.
  P3. All eight non-Gamma supertile types have the IDENTICAL boundary loop at
      every level, vertex index for vertex index (induction on the substitution
      rules: slot 7 is Gamma for every type, slots 0-6 are never Gamma, only Gamma
      has an empty slot). Their LABELLED boundaries differ, which is exactly why
      |dB| differs by type while the outline does not.
  P4. The quad-point incidence pattern among the eight children is the same at
      every supertile level k >= 2. Each candidate incidence is the vanishing of a
      FIXED Z[zeta12]-linear functional of (Q_{k-1}, conj Q_{k-1}); that pair
      satisfies a fixed 8x8 linear recursion over Q(zeta12), so Cayley-Hamilton
      reduces "vanishes for all k" to a window of eight consecutive levels, which
      is checked exactly. This is the level-independent skeleton the arrangement
      hangs on, and it is a genuine theorem rather than a table.

CHECKED EXACTLY, for the levels stated, NOT proved for all k
  C1. |dB(T,k)| is constant over the computed levels, for all 9 types, in all
      three configurations.
  C2. The GLUING and OUTER maps are literally CONSTANT (period 1, not 2) from
      level 2 onward, for all 9 types, in all three configurations, under the
      chirality-stable canonical labelling. Level 1 is the only exception and P4
      explains it: the base quad carries extra coincidences.
  C3. Contacts between children are whole quad-to-quad arcs for all 8 non-Gamma
      types. For Gamma the two arcs flanking its empty slot 2 are split, at a
      position inside the arc that is level-DEPENDENT.
  C4. The arc substitution word — the parent boundary as a word in (parent arc,
      child slot, child arc, direction) — is constant from level 2 onward, for
      every type in both families, Gamma included.
  C5. The per-arc dot-count vector (9 types x 4 arcs) is constant from level 2.
  C6. The fixed rule F_T built from the level-2 datum reproduces the routing of
      every type at every computed level, matching the independently computed
      welded strand graph exactly. That is Lemma 3(c) as an identity.

WHAT THIS BUYS
  C4 + C2 give a genuine induction SCHEME. If the arc substitution is
  level-independent then the parent's contact structure is a fixed finite datum,
  the per-arc dot counts obey x^(k) = A x^(k-1) with A the fixed abelianisation,
  and x^(3) = x^(2) forces x^(k) = x^(2) for ALL k >= 2 — so C1, C3 and C5 upgrade
  from "checked" to "proved", the dot-level GLUING and OUTER maps are forced, and
  Lemma 3(a),(b),(c) hold for every k. The induction closes on ONE hypothesis.

THE REMAINING GAP — one crisp statement
  GAP. For every k >= 2 and every supertile type T, the eight children of the
       level-k supertile of T tile it without overlap and edge-to-edge, meeting
       exactly along the boundary arcs delimited by the coincident quad points.
  Equivalently: whenever two children's quad-arcs share both endpoints, those arcs
  coincide as point sets. P4 already fixes WHICH endpoints coincide, at every
  level; what is missing is that coincident endpoints force coincident arcs. That
  is precisely the statement that the arrangement is a genuine tiling at every
  level. This script VERIFIES the tiling property at every level it computes — no
  edge used by three tiles, every boundary vertex of degree 2, exactly one closed
  boundary loop, throwing otherwise — but that is finite verification, not proof.

THE FALLBACK, stated precisely
  The gap is supplied by the substitution theorem for the hat/spectre metatiles:
  Smith, Myers, Kaplan and Goodman-Strauss, "An aperiodic monotile" (2023) and
  "A chiral aperiodic monotile" (2023), with the follow-up substitution-structure
  literature. Their metatile substitution is a genuine combinatorial substitution
  whose supertiles tile without overlap at every level, with level-independent
  adjacency among the children. Assuming that theorem, GAP holds and Lemma 3 is
  PROVED for all k.
  ASSUMED under the fallback: only that the 8-metatile arrangement defined by
    T_RULES is an overlap-free, edge-to-edge tiling at every level.
  PROVED here independently of it: P1-P4, including the exact failure of
    self-similarity and the exact level-independence of the quad-point skeleton.
  NOT established here: that the transform chain in web/src/core/tiles.ts IS the
    published metatile substitution. The two agree on everything measured, but
    this script does not prove they are the same substitution, so the fallback
    imports a small identification step as well as the theorem itself.`);
}

function main(): void {
  console.log("Lemma 3 — level-independence of the substitution's strand composition");
  console.log(`max level ${MAX}; ground-truth cross-check to level ${VALIDATE}; exact quad sweep to level ${DEEP}`);
  for (const family of FAMILIES) part1(family, Math.min(MAX + 1, 14));
  sweep();
  part2a();
  part2b();
  part2c();
  part3a();
  part3b();
  part3c();
  part4();
}

main();
console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
