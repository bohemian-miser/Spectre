/**
 * 01-local-structure.ts — Lemma 1 (Simple) and Lemma 0 (the tiling property).
 *
 * Obligations discharged here, for BOTH conjectured configurations
 * (A) hex / {1,2,8} / '010100000'  and  (B) spectre / {1,2,7,8} / '0101000000':
 *
 *   1. class 0 (the self-gluing seam class) is not selected, plus a concrete
 *      demonstration of what a vertex-valued contract does. NOTE: this section
 *      REFUTES the justification given in docs/FASS_PROOF.md §L1 — selecting
 *      class 0 does NOT create degree-3 junctions, in either family, at any
 *      level checked. See section 5 for the replacement argument.
 *   2. every welded dot is a 2-tile seam point (degree 2 interior, 1 on the
 *      patch boundary, NEVER >= 3) — exact integer key equality;
 *   3. each tile's chosen matching is a perfect matching of its active dots;
 *   4. Lemma 0 — the leaf tiles of a patch have pairwise disjoint interiors.
 *
 * Everything combinatorial/adjacency is EXACT: vertices live in Z[zeta12] as
 * 4 integer coefficients (unique representation, so zKey is identity), dots
 * live in the DOUBLED lattice (edge midpoints are half-integral), and areas
 * are computed as exact integer pairs (P + Q*sqrt3)/4.
 *
 * Run:
 *   cd web && npx tsx fass-proof/01-local-structure.ts
 *   cd web && CENSUS_MAX=6 TILING_LEVELS=4,5,6 npx tsx fass-proof/01-local-structure.ts
 * Defaults are census levels 1..5 and tiling levels 3,4,5 (~35 s). Level 6
 * works and passes, but needs roughly 3.5 GB of heap and several minutes.
 *
 * Exits non-zero on any failed check. Nothing outside this file is written or
 * modified (lib.ts and src/ are read-only here).
 */

import {
  comboDigitValue,
  connectionPoints,
  edgeLabels,
  enumerateMatchings,
  leafOrder,
  leafPts,
  metaEdges,
  nonCrossingForTile,
  parseEdgeLabel,
  zAdd,
  zApply,
  zConj,
  zKey,
  zLeafPts,
  zMaxAbsCoeff,
  zRot,
  zSub,
  zToPt,
  Z_ONE,
  type MetaEdge,
  type TileFamilyId,
  type TileTypeId,
  type ZVec,
} from '../src/core';

import {
  CONFIGS,
  buildStrands,
  chosenMatching,
  heading,
  matchingRecord,
  pad,
  trace,
  zExpand,
  type ZInstance,
} from './lib';

// ---------------------------------------------------------------------------
// failure bookkeeping
// ---------------------------------------------------------------------------

const FAILURES: string[] = [];
const NOTES: string[] = [];

function check(ok: boolean, label: string, detail = ''): boolean {
  console.log(`  [${ok ? ' OK ' : 'FAIL'}] ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) FAILURES.push(label + (detail ? ` (${detail})` : ''));
  return ok;
}

function note(s: string): void {
  NOTES.push(s);
  console.log(`  [NOTE] ${s}`);
}

// ---------------------------------------------------------------------------
// Z[zeta12] extras this script needs (lib.ts is off-limits, so they live here)
// ---------------------------------------------------------------------------

/** Ring multiplication in Z[zeta12] = Z[x]/(x^4 - x^2 + 1). */
function zMulZ(a: ZVec, b: ZVec): ZVec {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) c[i + j] += a[i] * b[j];
  // d^4 = d^2 - 1, d^5 = d^3 - d, d^6 = -1
  return [c[0] - c[4] - c[6], c[1] - c[5], c[2] + c[4], c[3] + c[5]];
}

/**
 * 2*Im(z) as an exact integer pair [A, B] meaning `A + B*sqrt(3)`.
 * (y = c1/2 + c2*sqrt3/2 + c3, so 2y = (c1 + 2c3) + c2*sqrt3.)
 */
function twiceIm(z: ZVec): [bigint, bigint] {
  return [BigInt(z[1] + 2 * z[3]), BigInt(z[2])];
}

/**
 * Exact shoelace of a closed polygon with UNDOUBLED Z[zeta12] vertices.
 * Returns [P, Q] with signed area = (P + Q*sqrt3) / 4.
 * (2*Area = sum Im(conj(v_i) v_{i+1}); each term's 2*Im is the integer pair.)
 */
function exactShoelace4(pts: readonly ZVec[]): [bigint, bigint] {
  let P = 0n;
  let Q = 0n;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const w = zMulZ(zConj(pts[i]), pts[(i + 1) % n]);
    const [a, b] = twiceIm(w);
    P += a;
    Q += b;
  }
  return [P, Q];
}

/**
 * Exact orientation predicate: sign of `cross(b - a, c - a)`.
 * Positive = c is left of the directed line a->b. Uses plain doubles, which are
 * exact here: coefficients stay under ~2^12 through level 6, so the products
 * below stay far under 2^53 (the script asserts the coefficient ceiling).
 */
function orient(a: ZVec, b: ZVec, c: ZVec): number {
  const w = zMulZ(zConj(zSub(b, a)), zSub(c, a));
  return signPQnum(w[1] + 2 * w[3], w[2]);
}

/**
 * Sign of `A + B*sqrt3` for integer A, B held exactly in doubles. Same-sign
 * cases are decided combinatorially; the mixed-sign case is decided in floating
 * point only when the value is comfortably clear of the rounding error
 * (absolute error <= 2.3e-16 * |B| * sqrt3, and the gate is 1e-9 * max(|A|,|B|)),
 * and otherwise falls back to the exact bigint comparison. So the result is
 * exact, with no epsilon in the mathematics.
 */
function signPQnum(A: number, B: number): number {
  if (A === 0 && B === 0) return 0;
  if (A >= 0 && B >= 0) return 1;
  if (A <= 0 && B <= 0) return -1;
  const v = A + B * Math.sqrt(3);
  const gate = Math.max(Math.abs(A), Math.abs(B)) * 1e-9;
  if (Math.abs(v) > gate) return v > 0 ? 1 : -1;
  return signPQ(BigInt(A), BigInt(B));
}

/** Proper (transversal) crossing of segments a-b and c-d: no endpoint touching. */
function properlyCross(a: ZVec, b: ZVec, c: ZVec, d: ZVec): boolean {
  const d1 = orient(a, b, c);
  const d2 = orient(a, b, d);
  if (d1 === 0 || d2 === 0 || d1 === d2) return false;
  const d3 = orient(c, d, a);
  const d4 = orient(c, d, b);
  return d3 !== 0 && d4 !== 0 && d3 !== d4;
}

/** Sign of `P + Q*sqrt3` — exact, via 3*Q^2 vs P^2. */
function signPQ(P: bigint, Q: bigint): number {
  if (P === 0n && Q === 0n) return 0;
  if (P >= 0n && Q >= 0n) return 1;
  if (P <= 0n && Q <= 0n) return -1;
  const lhs = P * P;
  const rhs = 3n * Q * Q;
  // P and Q have opposite signs; |P| vs |Q|sqrt3 decides.
  if (lhs === rhs) return 0;
  const bigger = lhs > rhs ? (P > 0n ? 1 : -1) : Q > 0n ? 1 : -1;
  return bigger;
}

function pqToFloat(P: bigint, Q: bigint, denom: number): number {
  return (Number(P) + Number(Q) * Math.sqrt(3)) / denom;
}

/** k such that `step == zRot(Z_ONE, k)`, or -1. */
const UNIT_K = new Map<string, number>();
for (let k = 0; k < 12; k++) UNIT_K.set(zKey(zRot(Z_ONE, k)), k);
function unitDir(step: ZVec): number {
  return UNIT_K.get(zKey(step)) ?? -1;
}

// ---------------------------------------------------------------------------
// Connection dots, exactly — INCLUDING class 0 (lib.ts deliberately refuses it)
// ---------------------------------------------------------------------------

/**
 * Where a dot sits relative to the tile outline:
 *  - 'mid'  : midpoint of physical edge `edgeIndex` -> doubled = v[i] + v[i+1]
 *  - 'vert' : the vertex `vertIndex`                -> doubled = 2*v[j]
 */
interface DotSpec {
  readonly seam: MetaEdge;
  readonly seamId: string;
  readonly major: number;
  readonly sign: 1 | -1;
  readonly kind: 'mid' | 'vert';
  /** physical edge carrying the contract (label order index) */
  readonly edgeIndex: number;
  /** for 'vert': index of the vertex */
  readonly vertIndex: number;
}

/**
 * Replicates `core.connectionPoints` EXACTLY (physical-label order, one dot
 * per `minor == 0` label of a selected class), but symbolically — so the
 * doubled lattice position can be read straight off a tile's world vertices.
 *
 * Class 0 is the self-gluing class: `resolveContract` forces its contract to
 * the seam CENTRE. In `hex` the class-0 seam is a single edge so the centre is
 * that edge's midpoint; in `spectre` the seam is two edges so the centre is the
 * VERTEX between them. That difference is the whole of obligation 1.
 */
function dotSpecs(
  family: TileFamilyId,
  type: TileTypeId,
  subset: readonly number[],
  /**
   * Diagnostic override used only by section 1: place every class-1..8 dot at
   * the START VERTEX of its minor-0 edge (contract t = 0) instead of the
   * midpoint (t = 0.5). This is NOT a selectable configuration — it exists to
   * demonstrate what a vertex-valued contract does to the welded degree.
   */
  vertexContract = false,
): readonly DotSpec[] {
  const sel = new Set(subset);
  const labels = edgeLabels(family, type);
  const seams = metaEdges(family, type);
  const n = leafPts(family, type).length;
  const out: DotSpec[] = [];
  for (let i = 0; i < labels.length; i++) {
    const parsed = parseEdgeLabel(labels[i]);
    if (parsed.minor !== 0 || !sel.has(parsed.major)) continue;
    const seam = seams.find((s) => s.edgeIndices.includes(i));
    if (!seam) continue;

    let cMinor: number;
    let cT: number;
    if (seam.major === 0) {
      // core `centerContract(seam)`
      const M = seam.edgeIndices.length;
      const u = M / 2;
      let minor = Math.floor(u);
      let t = u - minor;
      if (t === 0 && minor > 0) {
        minor -= 1;
        t = 1;
      }
      if (minor >= M) {
        minor = M - 1;
        t = 1;
      }
      cMinor = minor;
      cT = t;
    } else {
      cMinor = 0;
      cT = vertexContract ? 0 : 0.5; // DEFAULT_CONTRACTS for classes 1..8 is t = 0.5
    }

    // core: pick the seam entry whose minor is closest to cMinor
    let best = 0;
    let bestDelta = Infinity;
    for (let k = 0; k < seam.minors.length; k++) {
      const d = Math.abs(seam.minors[k] - cMinor);
      if (d < bestDelta) {
        bestDelta = d;
        best = k;
      }
    }
    const idx = seam.edgeIndices[best];
    const t = seam.sign > 0 ? cT : 1 - cT;

    if (t === 0.5) {
      out.push({ seam, seamId: seam.id, major: seam.major, sign: seam.sign, kind: 'mid', edgeIndex: idx, vertIndex: -1 });
    } else if (t === 1) {
      out.push({ seam, seamId: seam.id, major: seam.major, sign: seam.sign, kind: 'vert', edgeIndex: idx, vertIndex: (idx + 1) % n });
    } else if (t === 0) {
      out.push({ seam, seamId: seam.id, major: seam.major, sign: seam.sign, kind: 'vert', edgeIndex: idx, vertIndex: idx });
    } else {
      throw new Error(`unexpected contract t=${t} for ${family}/${type} seam ${seam.id}`);
    }
  }
  return out;
}

/** Doubled world position of a dot, given the tile's UNDOUBLED world vertices. */
function dotAt(W: readonly ZVec[], spec: DotSpec): ZVec {
  if (spec.kind === 'mid') return zAdd(W[spec.edgeIndex], W[(spec.edgeIndex + 1) % W.length]);
  const v = W[spec.vertIndex];
  return zAdd(v, v);
}

// ---------------------------------------------------------------------------
// Patch: exact world vertices per instance
// ---------------------------------------------------------------------------

interface Patch {
  readonly instances: readonly ZInstance[];
  /** world vertices, UNDOUBLED (tile vertices are integral in Z[zeta12]) */
  readonly verts: readonly (readonly ZVec[])[];
  /** true when the instance transform mirrors (vertex order reverses) */
  readonly mirrored: readonly boolean[];
}

const localPtsCache = new Map<string, readonly ZVec[]>();
function localPts(family: TileFamilyId, type: TileTypeId): readonly ZVec[] {
  const k = `${family}/${type}`;
  let v = localPtsCache.get(k);
  if (!v) {
    v = zLeafPts(family, type);
    localPtsCache.set(k, v);
  }
  return v;
}

function buildPatch(family: TileFamilyId, root: TileTypeId, level: number): Patch {
  const instances = zExpand(family, root, level);
  const verts: ZVec[][] = [];
  const mirrored: boolean[] = [];
  for (const inst of instances) {
    const p = localPts(family, inst.type);
    const W: ZVec[] = new Array(p.length);
    for (let i = 0; i < p.length; i++) W[i] = zApply(inst.xform, p[i]);
    verts.push(W);
    mirrored.push(inst.xform.m === 1);
  }
  return { instances, verts, mirrored };
}

// ---------------------------------------------------------------------------
// Census: dots, edges, labels
// ---------------------------------------------------------------------------

interface Census {
  readonly tiles: number;
  /** dot key (doubled) -> number of (tile, dot) incidences */
  readonly dotMult: Map<string, number>;
  /** dot key -> undirected edge key of the physical edge carrying it */
  readonly dotEdge: Map<string, string>;
  /** dot key -> set of distinct undirected edge keys seen (should be 1) */
  readonly dotEdgeConflicts: number;
  /** undirected edge key -> incident tile count */
  readonly edgeMult: Map<string, number>;
  /** undirected edge key -> list of (instIdx, edgeIdx) */
  readonly edgeUse: Map<string, number[][]>;
  readonly maxCoeff: number;
}

function censusOf(family: TileFamilyId, subset: readonly number[], patch: Patch): Census {
  const specsByType = new Map<TileTypeId, readonly DotSpec[]>();
  const dotMult = new Map<string, number>();
  const dotEdge = new Map<string, string>();
  const edgeMult = new Map<string, number>();
  const edgeUse = new Map<string, number[][]>();
  let dotEdgeConflicts = 0;
  let maxCoeff = 0;

  for (let ii = 0; ii < patch.instances.length; ii++) {
    const inst = patch.instances[ii];
    const W = patch.verts[ii];
    const n = W.length;

    // physical edges
    for (let e = 0; e < n; e++) {
      const a = zKey(W[e]);
      const b = zKey(W[(e + 1) % n]);
      const key = a < b ? `${a}#${b}` : `${b}#${a}`;
      edgeMult.set(key, (edgeMult.get(key) ?? 0) + 1);
      let uses = edgeUse.get(key);
      if (!uses) {
        uses = [];
        edgeUse.set(key, uses);
      }
      uses.push([ii, e]);
    }
    for (const v of W) {
      const m = zMaxAbsCoeff(v);
      if (m > maxCoeff) maxCoeff = m;
    }

    // dots
    let specs = specsByType.get(inst.type);
    if (!specs) {
      specs = dotSpecs(family, inst.type, subset);
      specsByType.set(inst.type, specs);
    }
    for (const spec of specs) {
      const p = dotAt(W, spec);
      const dk = zKey(p);
      dotMult.set(dk, (dotMult.get(dk) ?? 0) + 1);
      const a = zKey(W[spec.edgeIndex]);
      const b = zKey(W[(spec.edgeIndex + 1) % n]);
      const ek = a < b ? `${a}#${b}` : `${b}#${a}`;
      const prev = dotEdge.get(dk);
      if (prev === undefined) dotEdge.set(dk, ek);
      else if (prev !== ek) dotEdgeConflicts++;
    }
  }
  return { tiles: patch.instances.length, dotMult, dotEdge, dotEdgeConflicts, edgeMult, edgeUse, maxCoeff };
}

// ---------------------------------------------------------------------------
// SECTION 0 — bridges and structural preconditions
// ---------------------------------------------------------------------------

function section0(): void {
  heading('SECTION 0 — exact/float bridge and the two structural preconditions');

  // (a) symbolic dot specs reproduce core connectionPoints, for the FULL class
  //     set 0..8 (so the class-0 path is validated too).
  const all = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  let worst = 0;
  let worstWhere = '';
  for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
    for (const type of leafOrder(family)) {
      const specs = dotSpecs(family, type, all);
      const W = localPts(family, type);
      const mine = specs.map((s) => zToPt(dotAt(W, s)));
      const theirs = connectionPoints(family, type, new Set(all)).map((c) => c.pt);
      if (mine.length !== theirs.length) {
        check(false, `dot count ${family}/${type}`, `${mine.length} vs core ${theirs.length}`);
        continue;
      }
      for (let i = 0; i < mine.length; i++) {
        const d = Math.hypot(mine[i].x / 2 - theirs[i].x, mine[i].y / 2 - theirs[i].y);
        if (d > worst) {
          worst = d;
          worstWhere = `${family}/${type}#${i}`;
        }
      }
    }
  }
  check(worst < 1e-12, 'symbolic doubled dots == core connectionPoints (all classes 0..8)',
    `max deviation ${worst.toExponential(2)} at ${worstWhere} (eps 1e-12)`);

  // (b) every leaf edge of hex and spectre is a UNIT step d^k.
  for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
    let ok = true;
    const seen = new Set<number>();
    for (const type of leafOrder(family)) {
      const p = localPts(family, type);
      for (let i = 0; i < p.length; i++) {
        const k = unitDir(zSub(p[(i + 1) % p.length], p[i]));
        if (k < 0) ok = false;
        else seen.add(k);
      }
    }
    check(ok, `${family}: every leaf edge is a unit step d^k`,
      `directions used: {${[...seen].sort((a, b) => a - b).join(',')}}`);
  }

  // (c) no point of Z[zeta12] lies in the RELATIVE INTERIOR of a unit edge.
  //     Proof: an interior point is v + t*d^k with t in (0,1); it is in the
  //     ring iff t*d^k is, and every d^k has integer coefficients with gcd 1,
  //     so t must be an integer. Machine-witness: the coefficient vectors.
  {
    const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
    let ok = true;
    const rows: string[] = [];
    for (let k = 0; k < 12; k++) {
      const d = zRot(Z_ONE, k);
      const g = d.reduce((acc, c) => gcd(acc, c), 0);
      rows.push(`d^${k}=[${d.join(',')}] gcd=${g}`);
      if (g !== 1) ok = false;
    }
    check(ok, 'gcd of the coefficients of every d^k is 1 => no lattice point strictly inside a unit edge',
      rows.slice(0, 4).join('  ') + ' …');
  }

  // (d) Z[zeta12] DOES admit two unit segments between lattice points that cross
  //     at a non-lattice point, so the transversal-crossing scan in section 4 is
  //     not vacuous. Witness: [0, 1] against [e, e + d^3] with e = 1 - d; they
  //     meet at 1 - sqrt3/2 = 0.1339…, which by (c) cannot be a lattice point.
  {
    const a: ZVec = [0, 0, 0, 0];
    const b: ZVec = [1, 0, 0, 0];
    const c: ZVec = [1, -1, 0, 0];
    const d: ZVec = [1, -1, 0, 1];
    const hit = properlyCross(a, b, c, d);
    const px = zToPt(c).x;
    check(hit, 'witness: two unit lattice segments CAN cross at a non-lattice point',
      `[0,1] x [1-d, 1-d+d^3] cross at x = ${px.toFixed(6)} = 1 - sqrt3/2 — so section 4(f) is a real check`);
  }

  // (e) every leaf polygon is SIMPLE (needed for "winding number of dT is the
  //     indicator of T" in Lemma 0), and its exact area.
  for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
    let allSimple = true;
    for (const type of leafOrder(family)) {
      const p = localPts(family, type);
      const n = p.length;
      if (new Set(p.map(zKey)).size !== n) allSimple = false;
      for (let i = 0; i < n && allSimple; i++) {
        for (let j = i + 1; j < n; j++) {
          if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
          if (properlyCross(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) allSimple = false;
        }
      }
    }
    const p = localPts(family, 'Delta');
    const [P, Q] = exactShoelace4(p);
    const s = signPQ(P, Q);
    const area = pqToFloat(s < 0 ? -P : P, s < 0 ? -Q : Q, 4);
    check(allSimple && s !== 0, `${family}: every leaf polygon is simple, with non-zero exact area`,
      `area = (${P} + ${Q}*sqrt3)/4 = ${area.toFixed(9)}, orientation ${s > 0 ? 'CCW' : 'CW'}`);
  }
}

// ---------------------------------------------------------------------------
// SECTION 1 — class 0 is the self-gluing class, and it is not selected
// ---------------------------------------------------------------------------

function section1(): void {
  heading('SECTION 1 — obligation 1: no self-gluing class is selected');

  for (const cfg of [CONFIGS.hex128, CONFIGS.spectre1278]) {
    check(!cfg.subset.includes(0), `${cfg.id}: 0 is NOT in the selection`,
      `S = {${cfg.subset.join(',')}}`);
  }

  console.log('\n  Class-0 seam anatomy (why class 0 is special):');
  console.log(`  ${pad('family', 8)} ${pad('type', 7)} ${pad('seam', 7)} ${pad('#edges', 7)}  contract  dot lands on`);
  for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
    for (const type of leafOrder(family)) {
      for (const seam of metaEdges(family, type)) {
        if (seam.major !== 0) continue;
        const spec = dotSpecs(family, type, [0]).find((s) => s.seamId === seam.id);
        console.log(
          `  ${pad(family, 8)} ${pad(type, 7)} ${pad(seam.id.split('/')[1], 7)} ${pad(seam.edgeIndices.length, 7)}  ` +
          `centre    ${spec ? (spec.kind === 'mid' ? 'edge MIDPOINT (2-tile)' : 'a tile VERTEX (n-tile!)') : '(no minor-0 edge)'}`,
        );
      }
    }
  }

  // Positive/negative class census: which classes have a '-' partner?
  console.log('\n  Sign census (a "+k" seam glues to a "-k" seam; class 0 has no partner):');
  for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
    const pos = new Set<number>();
    const neg = new Set<number>();
    for (const type of leafOrder(family)) {
      for (const seam of metaEdges(family, type)) (seam.sign > 0 ? pos : neg).add(seam.major);
    }
    const selfGlue = [...pos].filter((m) => !neg.has(m)).sort((a, b) => a - b);
    console.log(`  ${pad(family, 8)} positive {${[...pos].sort((a, b) => a - b).join(',')}}  negative {${[...neg].sort((a, b) => a - b).join(',')}}  SELF-GLUING {${selfGlue.join(',')}}`);
    check(selfGlue.length === 1 && selfGlue[0] === 0,
      `${family}: class 0 is the unique self-gluing class`, `self-gluing = {${selfGlue.join(',')}}`);
  }

  // --- how many tiles actually meet at a vertex? ----------------------------
  console.log('\n  Tile corners per lattice vertex (this is what a vertex-valued contract would weld):');
  const cornerStats = new Map<TileFamilyId, { all: Map<number, number>; interior: Map<number, number> }>();
  for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
    const s = cornerCensus(family, 'Psi', 4);
    cornerStats.set(family, s);
    console.log(`    ${pad(family, 8)} Psi@4  all vertices      : ${histStr(s.all)}`);
    console.log(`    ${pad(family, 8)}        interior vertices : ${histStr(s.interior)}`);
  }

  // --- exhaustive sweep over EVERY selection --------------------------------
  //
  // A dot key is only ever produced by tiles of ONE edge class (verified below),
  // and a dot's multiplicity does not depend on which OTHER classes are
  // selected. So the per-class maximum multiplicity table settles all 511
  // non-empty selections at once: max over S = max over k in S.
  console.log('\n  Per-edge-class dot multiplicity, computed once with ALL classes {0..8} active.');
  console.log('  Because a dot key is produced by tiles of a single class, this table settles all');
  console.log('  511 non-empty selections simultaneously: max multiplicity over S = max over k in S.');
  let anyJunctionFound = false;
  const perClassTables = new Map<string, Map<number, number>>();
  for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
    for (const root of ['Psi', 'Delta'] as TileTypeId[]) {
      const patch = buildPatch(family, root, 4);
      const all = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      const majorOf = new Map<string, number>();
      const mult = new Map<string, number>();
      let mixedMajor = 0;
      const specCache = new Map<TileTypeId, readonly DotSpec[]>();
      for (let ii = 0; ii < patch.instances.length; ii++) {
        const type = patch.instances[ii].type;
        let specs = specCache.get(type);
        if (!specs) {
          specs = dotSpecs(family, type, all);
          specCache.set(type, specs);
        }
        const W = patch.verts[ii];
        for (const s of specs) {
          const k = zKey(dotAt(W, s));
          mult.set(k, (mult.get(k) ?? 0) + 1);
          const prev = majorOf.get(k);
          if (prev === undefined) majorOf.set(k, s.major);
          else if (prev !== s.major) mixedMajor++;
        }
      }
      const perClassMax = new Map<number, number>();
      const perClassCount = new Map<number, number>();
      for (const [k, m] of mult) {
        const maj = majorOf.get(k)!;
        perClassCount.set(maj, (perClassCount.get(maj) ?? 0) + 1);
        if (m > (perClassMax.get(maj) ?? 0)) perClassMax.set(maj, m);
        if (m >= 3) anyJunctionFound = true;
      }
      console.log(
        `    ${pad(family, 8)} ${pad(root, 6)}@4  ` +
        all.map((k) => `c${k}:${perClassCount.get(k) ?? 0}dots/max${perClassMax.get(k) ?? 0}`).join('  '),
      );
      check(mixedMajor === 0, `${family} ${root}@4: every dot key comes from exactly one edge class`,
        mixedMajor === 0 ? 'so the per-class table above covers every selection' : `${mixedMajor} mixed keys`);
      const worst = Math.max(0, ...perClassMax.values());
      check(worst <= 2, `${family} ${root}@4: NO selection of edge classes reaches dot multiplicity 3`,
        `max over all 9 classes = ${worst}`);
      perClassTables.set(`${family}/${root}`, perClassCount);
    }
  }

  // Cross-family: the two families' dot combinatorics coincide class by class
  // (hex simply has no class 7). Independent support for FASS_PROOF §2's claim
  // that the two conjectures are one theorem.
  for (const root of ['Psi', 'Delta'] as TileTypeId[]) {
    const h = perClassTables.get(`hex/${root}`)!;
    const s = perClassTables.get(`spectre/${root}`)!;
    const diffs: string[] = [];
    for (let k = 0; k <= 8; k++) {
      const a = h.get(k) ?? 0;
      const b = s.get(k) ?? 0;
      if (a !== b) diffs.push(`c${k}: hex ${a} vs spectre ${b}`);
    }
    check(diffs.length === 1 && diffs[0].startsWith('c7:'),
      `${root}@4: hex and spectre have identical per-class dot counts except class 7`,
      diffs.length ? diffs.join('; ') : 'identical for all 9 classes');
  }

  // how many class-0 selections are even configurable?
  for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
    let sels0 = 0;
    let matchable = 0;
    for (let mask = 0; mask < 256; mask++) {
      const subset = [0];
      for (let b = 0; b < 8; b++) if (mask & (1 << b)) subset.push(b + 1);
      sels0++;
      let even = true;
      for (const t of leafOrder(family)) if (dotSpecs(family, t, subset).length % 2 !== 0) even = false;
      if (even) matchable++;
    }
    console.log(
      `    ${pad(family, 8)} of the ${sels0} selections CONTAINING class 0, ${matchable} give every leaf type an even` +
      ` dot count (needed for a perfect matching); the other ${sels0 - matchable} are not configurable at all.`,
    );
  }

  if (!anyJunctionFound) {
    note(
      'REFUTED: docs/FASS_PROOF.md §L1 ("three tiles can meet at a class-0 vertex dot, which is ' +
      'exactly how junctions of degree 3 arise") does NOT describe anything that happens. Over ALL ' +
      '511 non-empty selections — every one containing class 0 included — in both families, at roots ' +
      'Psi and Delta, level 4, the maximum dot multiplicity is 2. Class 0 never produces a junction. ' +
      'Excluding class 0 is still what makes Lemma 1 a THEOREM rather than a finite check (see §5).',
    );
  }

  // --- why class 0 escapes, in the family where its dot IS a vertex ---------
  console.log('\n  Why the class-0 vertex dot escapes (spectre, where its contract IS a tile vertex):');
  for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
    const r = class0CentreCensus(family, 'Psi', 4);
    if (r === null) {
      console.log(`    ${pad(family, 8)} class-0 contract is an edge midpoint, so nothing to explain.`);
      continue;
    }
    console.log(
      `    ${pad(family, 8)} ${r.total} class-0 centre vertices at Psi@4; tile corners meeting there: ${histStr(r.corners)}`,
    );
    const only12 = [...r.corners.keys()].every((k) => k <= 2);
    check(only12,
      `${family}: at most TWO tile corners meet at any class-0 centre vertex`,
      'the seam-mate fills the complementary sector, so no third tile can touch');
  }
  console.log(`
    Reason (a proof, not a measurement): a class-0 seam of M physical edges glues to another
    class-0 seam with the minors REVERSED ('0.m' meets '0.(M-1-m)'), so the neighbour's own seam
    centre lands on the very same point. With M = 2 that point is the vertex v between the seam's
    two edges e1, e2. The neighbour B is across BOTH e1 and e2 from A, so B's corner at v is the
    sector complementary to A's: A and B together fill a whole neighbourhood of v and no third
    tile can reach it. Multiplicity is exactly 2 (1 when the seam is cut by the patch boundary).`);

  // --- the hazard IS real: demonstrate it with a vertex-valued contract -----
  console.log('\n  The hazard is real for VERTEX-valued contracts in general. Same selection, same combo,');
  console.log('  only the contract moved from the edge midpoint (t = 0.5) to the edge start (t = 0):');
  console.log(`  ${pad('family', 8)} ${pad('S', 12)} ${pad('contract', 10)} ${pad('segs', 7)} ${pad('maxDeg', 7)} ${pad('junctions', 10)} degree histogram`);
  let demonstrated = false;
  for (const cfg of [CONFIGS.hex128, CONFIGS.spectre1278]) {
    const patch = buildPatch(cfg.family, 'Psi', 4);
    for (const vc of [false, true]) {
      const r = degreeReport(cfg.family, cfg.subset, cfg.combo, patch, vc);
      console.log(
        `  ${pad(cfg.family, 8)} ${pad('{' + cfg.subset.join(',') + '}', 12)} ${pad(vc ? 'VERTEX' : 'midpoint', 10)} ` +
        `${pad(r.segs, 7)} ${pad(r.maxDeg, 7)} ${pad(r.junctions, 10)} ${r.hist}`,
      );
      if (vc && r.junctions > 0) demonstrated = true;
      if (!vc) {
        check(r.maxDeg <= 2 && r.junctions === 0,
          `${cfg.id}: the shipped midpoint contract gives max degree 2, zero junctions at Psi@4`);
      }
    }
  }
  check(demonstrated,
    'exhibited a concrete configuration whose welded strand graph HAS degree-3 junctions',
    'hex, selection {1,2,8}, combo 010100000, dots moved to tile vertices — every interior hex vertex carries 3 tile corners');
}

function histStr(h: ReadonlyMap<number, number>): string {
  return [...h.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k} corner(s) x ${v}`).join(',  ');
}

/** How many tile corners sit at each lattice vertex, and which vertices are interior. */
function cornerCensus(
  family: TileFamilyId,
  root: TileTypeId,
  level: number,
): { all: Map<number, number>; interior: Map<number, number> } {
  const patch = buildPatch(family, root, level);
  const corners = new Map<string, number>();
  const slots = new Map<string, number>();
  for (let ii = 0; ii < patch.instances.length; ii++) {
    const W0 = patch.verts[ii];
    const m = W0.length;
    const W = patch.mirrored[ii] ? [...W0].reverse() : W0;
    for (let i = 0; i < m; i++) {
      const k = zKey(W[i]);
      corners.set(k, (corners.get(k) ?? 0) + 1);
      const dIn = unitDir(zSub(W[i], W[(i - 1 + m) % m]));
      const dOut = unitDir(zSub(W[(i + 1) % m], W[i]));
      const delta = (((dIn + 6 - dOut) % 12) + 12) % 12;
      let mask = slots.get(k) ?? 0;
      for (let s = 0; s < delta; s++) mask |= 1 << ((dOut + s) % 12);
      slots.set(k, mask);
    }
  }
  const all = new Map<number, number>();
  const interior = new Map<number, number>();
  for (const [k, c] of corners) {
    all.set(c, (all.get(c) ?? 0) + 1);
    if (slots.get(k) === 0xfff) interior.set(c, (interior.get(c) ?? 0) + 1);
  }
  return { all, interior };
}

/** Tile-corner counts at the vertices that are class-0 seam centres (null if the class-0 dot is a midpoint). */
function class0CentreCensus(
  family: TileFamilyId,
  root: TileTypeId,
  level: number,
): { total: number; corners: Map<number, number> } | null {
  const anyVertex = leafOrder(family).some((t) =>
    dotSpecs(family, t, [0]).some((s) => s.kind === 'vert'));
  if (!anyVertex) return null;
  const patch = buildPatch(family, root, level);
  const corners = new Map<string, number>();
  const centres = new Set<string>();
  for (let ii = 0; ii < patch.instances.length; ii++) {
    const W = patch.verts[ii];
    for (const v of W) corners.set(zKey(v), (corners.get(zKey(v)) ?? 0) + 1);
    for (const s of dotSpecs(family, patch.instances[ii].type, [0])) {
      if (s.kind === 'vert') centres.add(zKey(W[s.vertIndex]));
    }
  }
  const hist = new Map<number, number>();
  for (const k of centres) {
    const c = corners.get(k) ?? 0;
    hist.set(c, (hist.get(c) ?? 0) + 1);
  }
  return { total: centres.size, corners: hist };
}

/** Welded-degree report for an arbitrary (family, subset, combo) on a patch. */
function degreeReport(
  family: TileFamilyId,
  subset: readonly number[],
  combo: string,
  patch: Patch,
  vertexContract = false,
): { segs: number; maxDeg: number; junctions: number; hist: string } {
  const order = leafOrder(family);
  const pairsByType = new Map<TileTypeId, readonly (readonly [number, number])[]>();
  const specsByType = new Map<TileTypeId, readonly DotSpec[]>();
  for (let i = 0; i < order.length; i++) {
    const type = order[i];
    const specs = dotSpecs(family, type, subset, vertexContract);
    specsByType.set(type, specs);
    const nc = nonCrossingForTile(family, type, new Set(subset));
    const d = i < combo.length ? comboDigitValue(combo[i]) : 0;
    const gi = nc.length === 0 ? 0 : nc[Math.min(d, nc.length - 1)];
    const ms = enumerateMatchings(specs.length);
    pairsByType.set(type, specs.length >= 2 && specs.length % 2 === 0 ? (ms[gi] ?? []) : []);
  }
  const degree = new Map<string, number>();
  let segs = 0;
  for (let ii = 0; ii < patch.instances.length; ii++) {
    const type = patch.instances[ii].type;
    const specs = specsByType.get(type)!;
    const W = patch.verts[ii];
    for (const [a, b] of pairsByType.get(type)!) {
      const ka = zKey(dotAt(W, specs[a]));
      const kb = zKey(dotAt(W, specs[b]));
      degree.set(ka, (degree.get(ka) ?? 0) + 1);
      degree.set(kb, (degree.get(kb) ?? 0) + 1);
      segs++;
    }
  }
  let maxDeg = 0;
  let junctions = 0;
  const hist = new Map<number, number>();
  for (const d of degree.values()) {
    if (d > maxDeg) maxDeg = d;
    if (d > 2) junctions++;
    hist.set(d, (hist.get(d) ?? 0) + 1);
  }
  return {
    segs,
    maxDeg,
    junctions,
    hist: [...hist.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}x${v}`).join(' '),
  };
}

// ---------------------------------------------------------------------------
// SECTION 2 — every dot is a 2-tile seam point
// ---------------------------------------------------------------------------

const ROOTS: readonly TileTypeId[] = ['Delta', 'Psi', 'Gamma'];

function section2(maxLevel: number): void {
  let worstCoeff = 0;
  heading('SECTION 2 — obligation 2: every welded dot is a 2-tile seam point');
  console.log('  Exact integer key equality in the DOUBLED Z[zeta12] lattice.');
  console.log('  "mult" = number of (tile, dot) incidences at a key; "edge" = the physical');
  console.log('  edge carrying that dot, keyed by its two exact (undoubled) endpoints.');
  console.log('  "arcs" = mult1/2. Once max degree is 2 the graph is paths + cycles, so the');
  console.log('  number of OPEN arcs is exactly half the number of degree-1 dots — no tracing');
  console.log('  needed. Psi gives 1, Delta 4, Gamma 5, at every level, for both configs.\n');

  for (const cfg of [CONFIGS.hex128, CONFIGS.spectre1278]) {
    console.log(`  --- ${cfg.id} ---`);
    console.log(
      `  ${pad('root', 6)} ${pad('lvl', 4)} ${pad('tiles', 8)} ${pad('dots', 8)} ${pad('mult1', 8)} ` +
      `${pad('mult2', 8)} ${pad('mult>=3', 8)} ${pad('arcs', 5)} ${pad('bdEdges', 8)} ${pad('intEdges', 9)} ${pad('edge>2', 7)} ${pad('maxCoef', 9)}`,
    );
    for (const root of ROOTS) {
      for (let lv = 1; lv <= maxLevel; lv++) {
        const patch = buildPatch(cfg.family, root, lv);
        const c = censusOf(cfg.family, cfg.subset, patch);
        if (c.maxCoeff > worstCoeff) worstCoeff = c.maxCoeff;

        let m1 = 0;
        let m2 = 0;
        let m3 = 0;
        for (const m of c.dotMult.values()) {
          if (m === 1) m1++;
          else if (m === 2) m2++;
          else m3++;
        }
        let bd = 0;
        let inte = 0;
        let bad = 0;
        for (const m of c.edgeMult.values()) {
          if (m === 1) bd++;
          else if (m === 2) inte++;
          else bad++;
        }
        console.log(
          `  ${pad(root, 6)} ${pad(lv, 4)} ${pad(c.tiles, 8)} ${pad(c.dotMult.size, 8)} ${pad(m1, 8)} ` +
          `${pad(m2, 8)} ${pad(m3, 8)} ${pad(m1 / 2, 5)} ${pad(bd, 8)} ${pad(inte, 9)} ${pad(bad, 7)} ${pad(c.maxCoeff, 9)}`,
        );

        const tag = `${cfg.id} ${root}@${lv}`;
        // Free corollary: with max degree 2 the strand graph is paths + cycles,
        // so #open arcs = (#degree-1 vertices)/2 exactly. No tracing needed.
        if (m1 % 2 !== 0) check(false, `${tag}: the number of degree-1 dots is even`, `${m1}`);
        const expectArcs = root === 'Psi' ? 1 : root === 'Delta' ? 4 : 5;
        if (m1 / 2 !== expectArcs) {
          check(false, `${tag}: open-arc count is ${expectArcs}`, `deg1/2 = ${m1 / 2}`);
        }
        if (m3 !== 0) check(false, `${tag}: no dot of multiplicity >= 3`, `${m3} such dots`);
        if (bad !== 0) check(false, `${tag}: no physical edge used by >2 tiles`, `${bad} such edges`);
        if (c.dotEdgeConflicts !== 0) {
          check(false, `${tag}: each dot key belongs to a unique physical edge`, `${c.dotEdgeConflicts} conflicts`);
        }

        // dot multiplicity == multiplicity of its carrying edge, key by key
        let mismatch = 0;
        let bdDotNotOnBdEdge = 0;
        for (const [dk, m] of c.dotMult) {
          const ek = c.dotEdge.get(dk)!;
          const em = c.edgeMult.get(ek) ?? 0;
          if (em !== m) mismatch++;
          if (m === 1 && em !== 1) bdDotNotOnBdEdge++;
        }
        if (mismatch !== 0) {
          check(false, `${tag}: dot multiplicity == carrying-edge multiplicity`, `${mismatch} mismatches`);
        }
        if (bdDotNotOnBdEdge !== 0) {
          check(false, `${tag}: multiplicity-1 dots sit exactly on boundary edges`, `${bdDotNotOnBdEdge} violations`);
        }

        // Label compatibility across every shared edge.
        //   signed class k: '+k.m' meets '-k.m'   (same minor, opposite sign)
        //   class 0 (self-gluing, no sign partner): '0.m' meets '0.(M-1-m)',
        //     i.e. the seam is traversed in the opposite direction, so the
        //     minors REVERSE. That is why its only fixed point — the only
        //     admissible contract — is the seam centre.
        let labelBad = 0;
        for (const uses of c.edgeUse.values()) {
          if (uses.length !== 2) continue;
          const [iA, eA] = uses[0];
          const [iB, eB] = uses[1];
          const tA = patch.instances[iA].type;
          const tB = patch.instances[iB].type;
          const la = parseEdgeLabel(edgeLabels(cfg.family, tA)[eA]);
          const lb = parseEdgeLabel(edgeLabels(cfg.family, tB)[eB]);
          let ok: boolean;
          if (la.major !== lb.major) ok = false;
          else if (la.major === 0) {
            const mA = metaEdges(cfg.family, tA).find((s) => s.edgeIndices.includes(eA))!.edgeIndices.length;
            const mB = metaEdges(cfg.family, tB).find((s) => s.edgeIndices.includes(eB))!.edgeIndices.length;
            ok = la.sign === lb.sign && mA === mB && la.minor + lb.minor === mA - 1;
          } else {
            ok = la.minor === lb.minor && la.sign === -lb.sign;
          }
          if (!ok) labelBad++;
        }
        if (labelBad !== 0) {
          check(false, `${tag}: shared edges glue '+k.m'/'-k.m' (class 0: '0.m'/'0.(M-1-m)')`, `${labelBad} bad contacts`);
        }

        // strand-graph degree equals dot multiplicity
        const strands = buildStrands(cfg, patch.instances);
        let degMismatch = 0;
        for (const [k, d] of strands.degree) if ((c.dotMult.get(k) ?? -1) !== d) degMismatch++;
        for (const [k, m] of c.dotMult) if ((strands.degree.get(k) ?? -1) !== m) degMismatch++;
        if (degMismatch !== 0) {
          check(false, `${tag}: welded strand degree == dot multiplicity`, `${degMismatch} mismatches`);
        }
        const tr = trace(strands);
        if (tr.maxDegree > 2 || tr.junctions !== 0) {
          check(false, `${tag}: trace() sees max degree 2, zero junctions`,
            `maxDegree ${tr.maxDegree}, junctions ${tr.junctions}`);
        }
      }
    }
    console.log('');
  }
  check(FAILURES.length === 0, 'obligation 2: all per-level dot/edge invariants held', `levels 1..${maxLevel}, roots ${ROOTS.join('/')}`);
  check(worstCoeff < 2 ** 51,
    'every coordinate stayed exact in doubles (Z_COEFF_LIMIT = 2^51)',
    `largest |coefficient| at level ${maxLevel} = ${worstCoeff}, i.e. 2^${Math.log2(worstCoeff).toFixed(1)}`);
}

// ---------------------------------------------------------------------------
// SECTION 3 — per-type matching table
// ---------------------------------------------------------------------------

function section3(): void {
  heading('SECTION 3 — obligation 3: every chosen matching is a PERFECT matching');

  for (const cfg of [CONFIGS.hex128, CONFIGS.spectre1278]) {
    console.log(`\n  --- ${cfg.id}  (selection {${cfg.subset.join(',')}}, combo '${cfg.combo}') ---`);
    console.log(
      `  ${pad('i', 2)} ${pad('type', 7)} ${pad('#dots', 6)} ${pad('#NCopt', 7)} ${pad('digit', 6)} ` +
      `${pad('idx', 4)}  dots (seam ids)                          chosen pairs`,
    );
    const order = leafOrder(cfg.family);
    const rec = matchingRecord(cfg);
    let allPerfect = true;
    let allInRange = true;
    let totalChords = 0;
    for (let i = 0; i < order.length; i++) {
      const type = order[i];
      const specs = dotSpecs(cfg.family, type, cfg.subset);
      const nc = nonCrossingForTile(cfg.family, type, new Set(cfg.subset));
      const digit = i < cfg.combo.length ? comboDigitValue(cfg.combo[i]) : 0;
      const clamped = nc.length === 0 ? false : digit > nc.length - 1;
      if (clamped) allInRange = false;
      const pairs = chosenMatching(cfg, type);
      totalChords += pairs.length;

      // perfect-matching test: every dot index used exactly once
      const used = new Array<number>(specs.length).fill(0);
      for (const [a, b] of pairs) {
        used[a] = (used[a] ?? 0) + 1;
        used[b] = (used[b] ?? 0) + 1;
      }
      const perfect = specs.length % 2 === 0 && pairs.length * 2 === specs.length && used.every((u) => u === 1);
      if (!perfect) allPerfect = false;

      const names = specs.map((s) => s.seamId.split('/')[1]);
      console.log(
        `  ${pad(i, 2)} ${pad(type, 7)} ${pad(specs.length, 6)} ${pad(nc.length, 7)} ${pad(cfg.combo[i] ?? '0', 6)} ` +
        `${pad(rec[type] ?? 0, 4)}  ${(names.join(', ') + '                                         ').slice(0, 41)} ` +
        `${pairs.map(([a, b]) => `${names[a]}—${names[b]}`).join(', ') || '(none)'}${perfect ? '' : '   <-- NOT PERFECT'}`,
      );

      // also: seams that are active but carry no dot (partial seams)
      const sel = new Set(cfg.subset);
      const activeNoDot = metaEdges(cfg.family, type)
        .filter((e) => sel.has(e.major) && !specs.some((s) => s.seamId === e.id))
        .map((e) => e.id.split('/')[1]);
      if (activeNoDot.length) {
        console.log(`     ${' '.repeat(28)}(selected seams with no minor-0 edge, hence no dot: ${activeNoDot.join(', ')})`);
      }
    }
    check(allPerfect, `${cfg.id}: chosen matching is a perfect matching for EVERY leaf type`,
      `${totalChords} chords per full leaf set`);
    check(allInRange, `${cfg.id}: every combo digit is in range (no silent clamping)`);
  }
}

// ---------------------------------------------------------------------------
// SECTION 4 — Lemma 0, the tiling property
// ---------------------------------------------------------------------------

interface TilingVerdict {
  readonly midClashes: number;
  /** each crossing is counted twice by the neighbour scan */
  readonly crossings: number;
  readonly distinctEdges: number;
  readonly tiles: number;
  readonly dupDirected: number;
  readonly edgeGt2: number;
  readonly boundaryEdges: number;
  readonly cycles: number;
  readonly simpleCycles: boolean;
  readonly sectorClashes: number;
  readonly interiorVertices: number;
  readonly boundaryVertices: number;
  readonly areaSumP: bigint;
  readonly areaSumQ: bigint;
  readonly areaBdP: bigint;
  readonly areaBdQ: bigint;
  readonly areaMatch: boolean;
}

function tilingCheck(family: TileFamilyId, root: TileTypeId, level: number): TilingVerdict {
  const patch = buildPatch(family, root, level);
  const n = patch.instances.length;

  // Orientation: make every tile's world vertex list CCW.
  const baseSign = new Map<TileTypeId, number>();
  for (const t of leafOrder(family)) {
    const [P, Q] = exactShoelace4(localPts(family, t));
    baseSign.set(t, signPQ(P, Q));
  }

  const directed = new Map<string, number>();
  const undirected = new Map<string, number>();
  const coord = new Map<string, ZVec>();
  // vertex key -> occupied 30deg slots (bitmask over 12 slots), and clash count
  const slots = new Map<string, number>();
  let sectorClashes = 0;

  let areaSumP = 0n;
  let areaSumQ = 0n;

  for (let ii = 0; ii < n; ii++) {
    const type = patch.instances[ii].type;
    const W0 = patch.verts[ii];
    const ccw = (baseSign.get(type) ?? 1) * (patch.mirrored[ii] ? -1 : 1) > 0;
    const W = ccw ? W0 : [...W0].reverse();
    const m = W.length;

    const [P, Q] = exactShoelace4(W);
    areaSumP += P;
    areaSumQ += Q;

    for (let i = 0; i < m; i++) {
      const a = zKey(W[i]);
      const b = zKey(W[(i + 1) % m]);
      coord.set(a, W[i]);
      directed.set(`${a}>${b}`, (directed.get(`${a}>${b}`) ?? 0) + 1);
      const uk = a < b ? `${a}#${b}` : `${b}#${a}`;
      undirected.set(uk, (undirected.get(uk) ?? 0) + 1);
    }

    // angular sectors at each corner, in exact 30-degree slots
    for (let i = 0; i < m; i++) {
      const prev = W[(i - 1 + m) % m];
      const cur = W[i];
      const next = W[(i + 1) % m];
      const dIn = unitDir(zSub(cur, prev));
      const dOut = unitDir(zSub(next, cur));
      if (dIn < 0 || dOut < 0) throw new Error('non-unit edge in sector scan');
      const a = (dIn + 6) % 12;
      const delta = ((a - dOut) % 12 + 12) % 12;
      const key = zKey(cur);
      let mask = slots.get(key) ?? 0;
      for (let s = 0; s < delta; s++) {
        const bit = 1 << ((dOut + s) % 12);
        if (mask & bit) sectorClashes++;
        mask |= bit;
      }
      slots.set(key, mask);
    }
  }

  let dupDirected = 0;
  for (const c of directed.values()) if (c > 1) dupDirected++;
  let edgeGt2 = 0;
  for (const c of undirected.values()) if (c > 2) edgeGt2++;

  // residual boundary chain: directed edges whose reverse is absent
  const outAdj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  let boundaryEdges = 0;
  for (const [dk, c] of directed) {
    const [a, b] = dk.split('>');
    const rev = directed.get(`${b}>${a}`) ?? 0;
    const net = c - rev;
    if (net <= 0) continue;
    for (let r = 0; r < net; r++) {
      let lst = outAdj.get(a);
      if (!lst) {
        lst = [];
        outAdj.set(a, lst);
      }
      lst.push(b);
      inDeg.set(b, (inDeg.get(b) ?? 0) + 1);
      boundaryEdges++;
    }
  }

  // walk the residual into cycles; "simple" = every boundary vertex has
  // out-degree == in-degree == 1 (so each cycle visits a vertex at most once)
  let simpleCycles = true;
  for (const [v, lst] of outAdj) {
    if (lst.length !== 1 || (inDeg.get(v) ?? 0) !== 1) simpleCycles = false;
  }
  for (const v of inDeg.keys()) if (!outAdj.has(v)) simpleCycles = false;

  let cycles = 0;
  let areaBdP = 0n;
  let areaBdQ = 0n;
  {
    const remaining = new Map<string, string[]>();
    for (const [k, v] of outAdj) remaining.set(k, [...v]);
    for (const start of [...remaining.keys()]) {
      while ((remaining.get(start)?.length ?? 0) > 0) {
        const poly: ZVec[] = [];
        let cur = start;
        for (;;) {
          const lst = remaining.get(cur);
          if (!lst || lst.length === 0) break;
          const nxt = lst.pop()!;
          poly.push(coord.get(cur)!);
          cur = nxt;
          if (cur === start) break;
        }
        if (poly.length === 0) break;
        cycles++;
        const [P, Q] = exactShoelace4(poly);
        areaBdP += P;
        areaBdQ += Q;
      }
    }
  }

  let interiorVertices = 0;
  let boundaryVertices = 0;
  for (const mask of slots.values()) {
    if (mask === 0xfff) interiorVertices++;
    else boundaryVertices++;
  }

  // (f) no two DISTINCT patch edges share a midpoint, and no two cross
  //     transversally. The first is the hypothesis Lemma 1 (1b) needs; the
  //     second closes the only hole in the Jordan-curve argument (two edges
  //     could in principle cross at a NON-lattice point, which neither the edge
  //     census nor the vertex-sector census would see).
  const midOwner = new Map<string, string>();
  let midClashes = 0;
  const cells = new Map<string, { a: ZVec; b: ZVec }[]>();
  for (const uk of undirected.keys()) {
    const [ka, kb] = uk.split('#');
    const a = coord.get(ka)!;
    const b = coord.get(kb)!;
    const mid = zKey(zAdd(a, b));
    const prev = midOwner.get(mid);
    if (prev === undefined) midOwner.set(mid, uk);
    else if (prev !== uk) midClashes++;
    const cx = Math.floor((zToPt(a).x + zToPt(b).x) / 2);
    const cy = Math.floor((zToPt(a).y + zToPt(b).y) / 2);
    const ck = `${cx},${cy}`;
    let lst = cells.get(ck);
    if (!lst) {
      lst = [];
      cells.set(ck, lst);
    }
    lst.push({ a, b });
  }
  let crossings = 0;
  for (const [ck, lst] of cells) {
    const [cx, cy] = ck.split(',').map(Number);
    const near: { a: ZVec; b: ZVec }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const other = cells.get(`${cx + dx},${cy + dy}`);
        if (other && (dx !== 0 || dy !== 0)) near.push(...other);
      }
    }
    for (let i = 0; i < lst.length; i++) {
      for (let j = i + 1; j < lst.length; j++) {
        if (properlyCross(lst[i].a, lst[i].b, lst[j].a, lst[j].b)) crossings++;
      }
      for (const o of near) {
        if (properlyCross(lst[i].a, lst[i].b, o.a, o.b)) crossings++;
      }
    }
  }

  return {
    midClashes,
    crossings,
    distinctEdges: undirected.size,
    tiles: n,
    dupDirected,
    edgeGt2,
    boundaryEdges,
    cycles,
    simpleCycles,
    sectorClashes,
    interiorVertices,
    boundaryVertices,
    areaSumP,
    areaSumQ,
    areaBdP,
    areaBdQ,
    areaMatch: areaSumP === areaBdP && areaSumQ === areaBdQ,
  };
}

function section4(levels: readonly number[]): void {
  heading('SECTION 4 — Lemma 0: the leaf tiles have pairwise disjoint interiors');
  console.log('  Method (all exact):');
  console.log('   (a) orient every tile CCW; collect its directed boundary edges;');
  console.log('   (b) NO directed edge may repeat (two tiles on the same side of an edge);');
  console.log('   (c) cancel opposite pairs; the residual is the patch boundary 1-cycle;');
  console.log('   (d) if that residual is a SIMPLE closed curve then, because the covering');
  console.log('       multiplicity m(p) equals the winding number w(p) of the residual chain');
  console.log('       (interior edges cancel; each tile is a simple CCW polygon), m(p) in {0,1}');
  console.log('       everywhere => pairwise disjoint interiors AND no gaps. PROOF, not evidence.');
  console.log('   (e) independently: 30-degree angular-slot occupancy at every lattice vertex;');
  console.log('   (f) exact orientation predicates: no two patch edges cross transversally, and');
  console.log('       distinct patch edges have distinct midpoints. (f) closes the only hole in');
  console.log('       (d): two edges could in principle meet at a NON-lattice point, which the');
  console.log('       endpoint-keyed edge census and the vertex census would both miss.\n');
  console.log('  Note: "area==" compares sum(tile areas) with the residual shoelace. Those are');
  console.log('  equal by cancellation whenever (b)/(c) hold, so it is a consistency check on the');
  console.log('  orientation bookkeeping, not independent evidence. The load-bearing area fact is');
  console.log('  the per-family identity printed below it.\n');

  console.log(
    `  ${pad('family', 8)} ${pad('root', 6)} ${pad('lvl', 4)} ${pad('tiles', 8)} ${pad('edges', 8)} ${pad('dupDir', 7)} ` +
    `${pad('edge>2', 7)} ${pad('bdEdges', 8)} ${pad('cycles', 7)} ${pad('simple', 7)} ${pad('sectorX', 8)} ` +
    `${pad('midX', 6)} ${pad('crossX', 7)} ${pad('intVtx', 8)} ${pad('area==', 7)}`,
  );
  const verdicts = new Map<string, TilingVerdict>();
  for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
    for (const root of ROOTS) {
      for (const lv of levels) {
        const v = tilingCheck(family, root, lv);
        verdicts.set(`${family}/${root}/${lv}`, v);
        console.log(
          `  ${pad(family, 8)} ${pad(root, 6)} ${pad(lv, 4)} ${pad(v.tiles, 8)} ${pad(v.distinctEdges, 8)} ${pad(v.dupDirected, 7)} ` +
          `${pad(v.edgeGt2, 7)} ${pad(v.boundaryEdges, 8)} ${pad(v.cycles, 7)} ${pad(v.simpleCycles ? 'yes' : 'NO', 7)} ` +
          `${pad(v.sectorClashes, 8)} ${pad(v.midClashes, 6)} ${pad(v.crossings, 7)} ${pad(v.interiorVertices, 8)} ${pad(v.areaMatch ? 'yes' : 'NO', 7)}`,
        );
        const tag = `${family} ${root}@${lv}`;
        if (v.dupDirected !== 0) check(false, `${tag}: no directed edge is used twice`, `${v.dupDirected}`);
        if (v.edgeGt2 !== 0) check(false, `${tag}: no edge used by >2 tiles`, `${v.edgeGt2}`);
        if (v.sectorClashes !== 0) check(false, `${tag}: no two tile corners overlap at a vertex`, `${v.sectorClashes} clashes`);
        if (v.midClashes !== 0) check(false, `${tag}: distinct patch edges have distinct midpoints`, `${v.midClashes} clashes`);
        if (v.crossings !== 0) check(false, `${tag}: no two patch edges cross transversally`, `${v.crossings} crossings`);
        if (!v.areaMatch) {
          check(false, `${tag}: sum of tile areas == shoelace of the residual boundary`,
            `(${v.areaSumP},${v.areaSumQ}) vs (${v.areaBdP},${v.areaBdQ})`);
        }
        if (!(v.cycles === 1 && v.simpleCycles)) {
          check(false, `${tag}: residual boundary is ONE simple closed curve`,
            `${v.cycles} cycle(s), simple=${v.simpleCycles}`);
        }
      }
    }
  }

  // exact areas, reported once per family
  console.log('\n  Exact areas (all values are integers over the ring; area = (P + Q*sqrt3)/4):');
  for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
    const [P, Q] = exactShoelace4(localPts(family, 'Delta'));
    const s = signPQ(P, Q);
    const p = s < 0 ? -P : P;
    const q = s < 0 ? -Q : Q;
    const deepest = levels[levels.length - 1];
    const v = verdicts.get(`${family}/Delta/${deepest}`) ?? tilingCheck(family, 'Delta', deepest);
    const sTot = signPQ(v.areaSumP, v.areaSumQ);
    const tp = sTot < 0 ? -v.areaSumP : v.areaSumP;
    const tq = sTot < 0 ? -v.areaSumQ : v.areaSumQ;
    console.log(
      `    ${pad(family, 8)} one leaf = (${p} + ${q}*sqrt3)/4 = ${pqToFloat(p, q, 4).toFixed(9)}   ` +
      `Delta@${levels[levels.length - 1]} patch = (${tp} + ${tq}*sqrt3)/4 = ${pqToFloat(tp, tq, 4).toFixed(6)}   ` +
      `= ${v.tiles} x leaf ? ${tp === BigInt(v.tiles) * p && tq === BigInt(v.tiles) * q ? 'YES (exact)' : 'no'}`,
    );
    check(tp === BigInt(v.tiles) * p && tq === BigInt(v.tiles) * q,
      `${family}: patch area == (tile count) x (leaf area), exactly`);
  }
}

// ---------------------------------------------------------------------------
// SECTION 5 — what is proved for all k, what is checked to k
// ---------------------------------------------------------------------------

function section5(censusLevels: number, tilingLevels: readonly number[]): void {
  heading('SECTION 5 — precise statement of what Lemma 1 and Lemma 0 deliver');

  console.log(`
  LEMMA 0 (tiling property).  [obligation 4]
    PROVED, for all k, structurally:
      (0a) Every leaf edge of the hex and spectre families is a UNIT step d^k of
           Z[zeta12]; every substitution transform is p -> d^j conj^m(p) + t with
           t in Z[zeta12], so every patch vertex is in Z[zeta12] and every patch
           edge is a unit step. [finite check on 2 tables, closed
           under the transform group — section 0]
      (0b) No point of Z[zeta12] lies in the RELATIVE INTERIOR of a unit edge:
           such a point is v + t*d^j, and d^j has coprime integer coefficients,
           so t must be an integer. Hence NO T-JUNCTIONS at any level, ever, and
           every patch is edge-to-edge. [section 0]
      (0c) Consequently the covering multiplicity m(p) of a patch equals the
           winding number w(p) of the residual boundary 1-chain (interior edges
           cancel in pairs; each tile is a simple CCW polygon, and winding number
           is additive over 1-chains). So if the residual boundary is a simple
           closed curve, m(p) in {0,1} for every p off the edges: the tiles have
           pairwise DISJOINT INTERIORS and the union is exactly the closed Jordan
           region. This is an implication valid at every level.
    VERIFIED (finite, exact) at the levels in section 4: the residual boundary
      IS a single closed walk through distinct vertices, no directed edge
      repeats, no two patch edges cross transversally (exact orientation
      predicates — so the residual really is a Jordan curve, not merely
      vertex-simple), no angular sector clashes, distinct edges have distinct
      midpoints, and sum(tile areas) == area enclosed by the boundary.
      Together with (0c) that is a COMPLETE PROOF of disjointness for each
      patch actually checked — levels ${tilingLevels.join(', ')}, roots ${ROOTS.join('/')}, both families.
    CITED for the spectre family at all k: Smith-Myers-Kaplan-Goodman-Strauss
      (the Spectre/Tile(1,1) substitution tiles the plane). The 'hex' family is
      this repo's own reduced realisation and has NO such citation; for it,
      Lemma 0 is finite-verified only, by the argument above.
    ALSO UPGRADED here: docs/FASS_PROOF.md §L0 calls the area identity "the float
      half", agreeing to 6e-12 / 9e-10. It is EXACT here — areas are integer
      pairs (P + Q*sqrt3)/4 — and, separately, that identity is automatic once
      the directed-edge cancellation holds, so it is a bookkeeping check, not
      evidence of tiling. The step that actually proves tiling is (0c).
    NOT PROVED: an induction giving Lemma 0 for the hex family at all k. The
      obstruction is the session's negative result — the supertile quad is not
      an exact similarity image of the previous level's, so the level-(k+1)
      placement of 8 level-k patches is not a rescaled copy of the level-k
      placement of 8 level-(k-1) patches, and the usual one-step
      "supertiles meet edge-to-edge" induction does not transfer verbatim.

  LEMMA 1 (Simple: the welded strand graph has maximum degree 2).  [obligations 1-3]
    PROVED, for all k, given Lemma 0 at level k:
      (1a) 0 is not in either selection. Class 0 is the unique self-gluing class
           (section 1), and it is the only class whose contract is NOT free to be
           an edge midpoint: core's resolveContract forces class 0 to its seam
           centre, which in the spectre family (seam = 2 physical edges) is a
           tile VERTEX. With 0 excluded, EVERY dot of EVERY tile is the midpoint
           of a single physical unit edge of that tile (DEFAULT_CONTRACTS gives
           minor 0, t = 1/2 for every class 1..8, and t = 1/2 is the fixed point
           of the gluing involution t -> 1 - t, which is why abutting tiles agree).
      (1b) If two tiles both carry a dot at the same point p, then p is the
           midpoint of a unit edge of each. Two distinct unit segments with a
           common midpoint are either equal or cross transversally at an
           interior point of both; the latter forces the two tiles to overlap in
           a sector of positive area, contradicting Lemma 0. Hence they carry
           the SAME edge, and by Lemma 0 an edge belongs to at most 2 tiles.
           Therefore the number of tiles contributing a dot at p is at most 2.
           (Section 4 also checks the hypothesis directly and exactly at each
           level: distinct patch edges have distinct midpoints.)
      (1c) By obligation 3 the chosen matching of every leaf type is a PERFECT
           matching of that type's dots, so each tile contributes exactly ONE
           chord-end per dot. Welded degree at p = number of contributing tiles
           <= 2.  =>  max degree 2, no junctions, at every level.
      (1d) Corollary: the welded strand graph is a disjoint union of simple
           paths and simple cycles, at every level. (This is the whole content
           of "Simple"; it says nothing yet about how many components there are
           or whether chords cross — those are Lemmas 2 and 4.)
    VERIFIED (finite, exact) at levels 1..${censusLevels}, roots ${ROOTS.join('/')}, both configs:
      dot multiplicity == carrying-edge multiplicity, multiplicity 1 exactly on
      the patch boundary, multiplicity 2 in the interior, never >= 3; and the
      welded degree map of lib.buildStrands agrees key-for-key.
    CHECKED-TO-k, NOT PROVED: the claim "degree 2 at every INTERIOR dot".
      That needs label compatibility across shared edges ('+k.m' always meets
      '-k.m'; '0.m' always meets '0.(M-1-m)'), a property of the label TABLES
      under the substitution, verified here at levels 1..${censusLevels} but not derived.
      Note the "<= 2" half of Lemma 1 does NOT depend on it — only the "exactly
      2 in the interior" half does, and that half is what Lemmas 3/4 will need.

  WHAT WAS REFUTED (section 1).
    docs/FASS_PROOF.md §L1 justifies excluding class 0 by saying "three tiles can
    meet at a class-0 vertex dot, which is exactly how junctions of degree 3
    arise". That mechanism does not occur. Computed here: with ALL nine classes
    active, the per-class maximum dot multiplicity is 2 for every class, in both
    families, at roots Psi and Delta, level 4 — and since a dot key is produced
    by tiles of a single class, that settles all 511 non-empty selections at
    once. No selection whatsoever, class 0 included, produces a junction.
    The correct statement is a small theorem, proved in section 1:
      a class-0 seam glues to another class-0 seam with the MINORS REVERSED, so
      the neighbour's own seam centre lands on the same point; with M = 2 that
      point is the vertex between the seam's two edges, the neighbour lies across
      BOTH of them, and the two tiles' corners are complementary sectors filling
      a whole neighbourhood of the vertex. No third tile can reach it. Measured:
      every one of the interior class-0 centre vertices carries exactly 2 tile
      corners (spectre, Psi@4), although the ambient tiling has plenty of
      3- and 4-corner vertices.
    A SECOND gap in the same published proof: it continues "a dot on such a seam
    belongs to exactly two tiles" without saying why no THIRD tile can put a dot
    at that point. (1b) above supplies the missing step — distinct unit segments
    with a common midpoint coincide, so the third tile would have to carry the
    same edge, and Lemma 0 caps an edge at two tiles.
    Excluding class 0 therefore is NOT what rescues degree <= 2 in practice. What
    it buys is that (1b) becomes a THEOREM about midpoints rather than a
    case analysis about vertices — and it is what the exact library assumes
    (lib.zConnectionPoints2 rejects class 0 outright).
    That the hazard is real for vertex-valued contracts in general is
    demonstrated concretely in section 1: keep each configuration's selection and
    combo, move the contract from t = 1/2 to t = 0, and junctions appear at once
    (hex: 496 junction dots, max degree 4; spectre: 992, max degree 4 — at
    Psi@4). The structural reason is in the same section's corner census: every
    interior vertex of the hex patch carries exactly 3 tile corners, and the
    spectre patch has interior vertices with 2, 3 and 4.

  DIFFERENCES BETWEEN THE TWO CONFIGURATIONS.
    * Nothing in Lemma 1 separates them: both selections avoid class 0, both give
      every leaf type an even dot count and a perfect matching, and both show
      max degree 2 / zero junctions at every level checked.
    * Lemma 0 separates them in provenance only: the spectre tiling is the
      Smith-Myers-Kaplan-Goodman-Strauss theorem; the hex realisation is this
      repo's own and is finite-verified here. Both pass the same exact test.
    * Class 0 is geometrically special only in the SPECTRE family: its seam has
      two physical edges there (centre = a vertex), but one edge in hex (centre =
      a midpoint). So in hex, class 0 is not even a vertex contract.
    * hex has no class 7 at all; the two families' per-class dot counts agree
      exactly on the other eight classes at the same root and level.

  OPEN, stated crisply so they can be attacked or cited.
    (G1) [hex, all k] For every k >= 1 and every supertile type T, the 8 child
         patches T_i^(k) . P_(k-1)(c_i) (7 for Gamma) have pairwise disjoint
         interiors. Everything else in Lemma 0 follows by induction from this.
         Partial reduction obtained here: because no lattice point lies inside a
         unit edge (0b), the level-k check need only be run at vertices lying on
         a CHILD BOUNDARY — vertices interior to one child are covered by the
         induction hypothesis. That lowers the per-level cost from O(area) to
         O(boundary), but the boundary grows by a factor ~4.23 per level
         (22, 90, 378, 1598, 6766, 28658 for hex Delta), so it is not a finite
         certificate. NOTE: the session's negative result — the supertile quad is
         not an exact similarity image of the previous level's — is exactly what
         blocks the usual "one geometric check, transported by the similarity"
         shortcut, because Ts is recomputed per level.
    (G2) [spectre, all k] Lemma 0 is cited (Smith-Myers-Kaplan-Goodman-Strauss),
         not derived from this repo's label tables. Deriving it here — i.e.
         proving the label matching rules force an edge-to-edge tiling — is open
         and would also give (G1) for hex if the label tables are shown
         isomorphic (the per-class dot counts coincide, which is suggestive).
    (G3) [both, all k] Label compatibility: every shared physical edge of a
         level-k patch carries '+c.m' against '-c.m' (c != 0), or '0.m' against
         '0.(M-1-m)'. Verified here at every level run; not derived. This is what
         upgrades "welded degree <= 2" to "welded degree is EXACTLY 2 at every
         interior dot", which Lemmas 3 and 4 need.
    (G4) [both, all k] A transversal crossing of two unit edges at a NON-lattice
         point is not ruled out a priori in Z[zeta12] (explicit near-miss: the
         segments [0,1] and [eps, eps+i] with eps = 1 - d cross at a non-lattice
         point). Section 4 rules it out by exact orientation predicates at each
         level; a structural reason it can never happen in these tilings is open,
         and without it the "boundary is a Jordan curve" step of (0c) is a
         per-level verification rather than a corollary of (0b).
`);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main(): void {
  const t0 = Date.now();
  const CENSUS_MAX = Number(process.env.CENSUS_MAX ?? 5);
  const TILING_LEVELS = (process.env.TILING_LEVELS ?? '3,4,5').split(',').map(Number);

  console.log('FASS proof — script 01: local structure (Lemma 1 "Simple", Lemma 0 "tiling")');
  console.log(`configs: ${CONFIGS.hex128.id}   |   ${CONFIGS.spectre1278.id}`);
  console.log(`this run: dot/edge census levels 1..${CENSUS_MAX}; tiling-property levels ${TILING_LEVELS.join(',')}; roots ${ROOTS.join(', ')}`);
  console.log('(override with CENSUS_MAX=<n> TILING_LEVELS=<a,b,c>; level 6 needs ~3.5 GB of heap)');

  section0();
  section1();
  section2(CENSUS_MAX);
  section3();
  section4(TILING_LEVELS);
  section5(CENSUS_MAX, TILING_LEVELS);

  heading('VERDICT');
  console.log(`  coverage of THIS run: census levels 1..${CENSUS_MAX}, tiling levels ${TILING_LEVELS.join(',')}, roots ${ROOTS.join('/')},`);
  console.log('  both configurations, all arithmetic exact over Z[zeta12].\n');
  for (const n of NOTES) console.log(`  note: ${n}`);
  if (FAILURES.length === 0) {
    console.log(`\n  ALL CHECKS PASSED  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } else {
    console.log(`\n  ${FAILURES.length} FAILURE(S):`);
    for (const f of FAILURES) console.log(`    - ${f}`);
    process.exitCode = 1;
  }
}

main();
