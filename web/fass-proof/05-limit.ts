/**
 * LEMMA 5 — passing to the infinite limit.
 *
 * Run: cd web && npx --yes tsx fass-proof/05-limit.ts [maxLevel] [maxGeomLevel]
 *      (defaults 5 5; the geometry pass at level 6 needs ~2 GB and ~1 min)
 *
 * ===========================================================================
 * WHAT HAS TO BE PROVED, AND WHAT THIS SCRIPT ACTUALLY ESTABLISHES
 * ===========================================================================
 *
 * A finite patch has two endpoints, so "infinite FASS curve" is never a
 * statement about one patch. It is a statement about a nested sequence
 *
 *     P_1  subset  P_2  subset  P_3  subset  ...              (*)
 *
 * of Psi supertiles together with a compatible sequence of arcs. Four things
 * have to hold, and they are genuinely independent of one another:
 *
 *   (N)  NESTING. The level-k arc must sit inside the level-(k+1) arc as a
 *        CONTIGUOUS sub-path, not merely as a sub-SET of segments. Set
 *        containment is automatic (see below); contiguity is the content.
 *   (B)  BI-INFINITENESS. The parent arc must carry material on BOTH sides of
 *        the child's sub-path, with both amounts diverging. If one side stays
 *        bounded the union is a ray, not a line.
 *   (E)  EXHAUSTION. The union of (*) must eventually contain any bounded set.
 *        This is the one that can fail, and for the obvious choice of (*) it
 *        DOES fail.
 *   (S)  SPACE-FILLING. The arcs must converge, uniformly after
 *        reparameterisation, to a continuous surjection of an interval onto a
 *        set of positive area.
 *
 * HOW (*) IS BUILT.  SUPER_RULES.Psi = [Psi, Delta, Psi, Phi, Sigma, Psi, Phi,
 * Gamma], so a Psi supertile contains Psi supertiles at slots 0, 2 and 5. Fix
 * an "address" a_2, a_3, ... with every a_j in {0, 2, 5} and set
 *
 *     E_1 = id,        E_k = E_{k-1} . inverse(Ts_k[a_k]),
 *
 * where Ts_k = zSupertileTransforms(family, k). Then E_k(P_k) contains
 * E_{k-1}(P_{k-1}) exactly, because E_k . Ts_k[a_k] = E_{k-1} as ZAffines —
 * integer equality, not a numerical coincidence. Every E_k is a rigid motion,
 * so ALL the metric quantities below may be, and are, computed in the
 * un-embedded frame of P_k, where the level-(k-1) child is the sub-supertile
 * with tile-id prefix a_k. That is what this script does; it is the same
 * statement, one rigid motion away.
 *
 * Note what this buys and what it does not. `zExpand` composes the child
 * transform of level k with the level-(k-1) expansion, so the sub-supertile of
 * P_k at slot a_k is LITERALLY Ts_k[a_k] applied to the standalone P_{k-1}.
 * Hence the segment-key containment in (N) is an identity of transforms, and
 * is verified below as a guard rather than discovered. What is NOT automatic,
 * and is the real check, is that the child's segments occupy one unbroken run
 * of the parent's arc.
 *
 * WHY THERE IS NO GEOMETRIC SHORTCUT.  `buildSupertiles` recomputes Ts from
 * the CURRENT level's quad, and the quad is not an exact similarity image of
 * the previous one (the per-level ratio only converges to sqrt(4+sqrt 15)).
 * So the Ts are not conjugate across levels, P_k is not a scaled copy of
 * P_{k-1}, and no self-similarity argument is available. Everything below is
 * either exact integer combinatorics at finitely many levels, a metric
 * inequality that holds for arbitrary compact sets, or an explicitly flagged
 * appeal to the level-independence of the substitution's COMBINATORIAL
 * structure (obligation L3 of docs/FASS_PROOF.md), which this script assumes
 * and does not prove.
 *
 * ---------------------------------------------------------------------------
 * THE TWO METRIC LEMMAS USED FOR (E)
 * ---------------------------------------------------------------------------
 *
 * LEMMA A (persistent edge => no exhaustion). Let the tiles of every P_k meet
 * edge-to-edge (verified exactly in section 3: every edge of every patch is
 * used once or twice, never more, and no directed edge repeats). Suppose an
 * edge e is used exactly ONCE in P_k for every k. Then the open half-disc D
 * on the empty side of e, of radius less than half the shortest tile edge,
 * misses every P_k, hence misses the union.
 *   Proof. "Used once in P_k" means exactly one tile of P_k has e on its
 *   boundary. Any other tile of P_k whose interior meets D arbitrarily close
 *   to the midpoint of e would have that midpoint in its closure, hence — the
 *   tiling being edge-to-edge — would have e itself as one of its edges, a
 *   second use. So D meets no tile of P_k. As the P_k increase, D misses the
 *   union. QED
 *
 * LEMMA B (collar inequality). Let Q subset P be compact, x in int Q, and
 * boundary(Q) disjoint from boundary(P). Then
 *
 *     d(x, boundary P)  >=  d(x, boundary Q) + d(boundary Q, boundary P).
 *
 *   Proof. Take y in boundary(P) with |x - y| = d(x, boundary P). Since x is
 *   interior to Q and y is not in int Q, the segment [x, y] crosses
 *   boundary(Q) at some z, so |x-y| = |x-z| + |z-y| >= d(x, boundary Q) +
 *   d(boundary Q, boundary P). QED
 *
 * Lemma B is what converts a purely combinatorial fact — "the seed's ancestor
 * is INTERIOR to its own ancestor, touching no outline edge" — into divergence
 * of the inradius, which is what (E) needs. It holds for arbitrary compact
 * sets, so it costs nothing.
 *
 * ---------------------------------------------------------------------------
 * THE SPACE-FILLING ARGUMENT (section 4), stated so its hypotheses are visible
 * ---------------------------------------------------------------------------
 *
 * Write A_k for the level-k arc, parameterised on [0, 1] proportionally to
 * segment count, and D_k for the patch diameter.
 *
 * THE OBVIOUS HYPOTHESIS IS FALSE, AND THE SCRIPT REFUTES IT. One would like
 *
 *   (H1-naive) for every j < k, the segments of A_k inside a given level-j
 *              sub-supertile form ONE contiguous parameter interval,
 *
 * which is the literal Hilbert-curve nesting. It does NOT hold here. Section
 * 1b below finds, exactly, that a level-j sub-supertile is re-entered several
 * times: a Psi sub-supertile exactly once, but a Gamma or Sigma one five
 * times, a Delta four, a Theta or Lambda three, a Xi, Pi or Phi twice. The
 * reason is structural, not accidental: the standalone strand diagram of a
 * type-T supertile splits into exactly that many arcs (its interface carries
 * that many pairs of dots), and the parent must thread each of them
 * separately. Only Psi has a single arc, which is exactly why Psi is the
 * right root and the right nesting slot. The counts are LEVEL-INDEPENDENT at
 * every level checked, and identical in both families.
 *
 * So the usable hypotheses are:
 *
 *   (H1) BOUNDED RE-ENTRY. Every level-j sub-supertile is entered by A_k at
 *        most m = 5 times, m being the largest arc count over the 9 types,
 *        and the number of entries of a given sub-supertile is exactly the
 *        arc count of its own type. Along the Psi chain that count is 1, so
 *        the Psi nesting IS literal containment as a contiguous sub-path.
 *   (H2) LOCALISATION. The piece of A_k inside a level-j sub-supertile stays
 *        within distance eps0 of it, where eps0 is a CONSTANT (measured
 *        below; 0 for hexagons, (2 sqrt 3 - 3)/8 = 0.0580127 for the spectre,
 *        whose chords cut the reflex corner. NOT (2 - sqrt 3)/4: that is the
 *        distance from the reflex VERTEX to the chord, a different quantity,
 *        which is what docs/FASS_PROOF.md 4.2 labels it). Since sub-supertile diameters grow like
 *        lambda^(j/2), the relative excursion eps0 / diam tends to 0.
 *   (H3) SHRINKING SCALE. maxTileDiameter / D_k -> 0, at rate lambda^(-k/2)
 *        with lambda = 4 + sqrt 15. (Measured below.)
 *   (H4) EVERY TILE IS VISITED (Lemma 4), so the arcs fill the patch and do
 *        not merely thread part of it. (Re-verified below.)
 *   (H5) NO STARVED SUB-SUPERTILE. Every level-j sub-supertile carries at
 *        least c * lambda^(j-k) of the arc's total length, because it holds
 *        exactly its share of the tiles and every tile carries at least one
 *        chord. (Checked below. NOTE: individual RUNS can be as short as one
 *        segment — section 1b measures a shortest-arc fraction decaying like
 *        lambda^(-j) — so no argument may assume runs are substantial. Only
 *        the TOTAL per sub-supertile is bounded below.)
 *
 * THE MODULUS-OF-CONTINUITY ARGUMENT, repaired to use (H1) rather than
 * (H1-naive). Let I be a parameter interval of length delta and put
 * j = k - log(1/delta)/log(lambda), so that delta = lambda^(j-k). Let R be
 * the number of runs of A_k|I and S the number of DISTINCT level-j
 * sub-supertiles it meets. By (H1) each sub-supertile supplies at most m
 * runs, so S >= R/m. Those S sub-supertiles are distinct, so by (H5) their
 * total parameter time is at least S * c * lambda^(j-k) = S * c * delta,
 * and it is at most delta. Hence S <= 1/c: a BOUNDED number, independent of
 * j, k and delta. Consecutive runs sit in ADJACENT sub-supertiles (the arc
 * crosses their common boundary), so A_k(I) lies in the union of at most 1/c
 * sub-supertiles plus an eps0 collar, of diameter
 *
 *     O(lambda^(j/2)) + 2 eps0  =  O(sqrt(delta) * lambda^(k/2))
 *                               =  O(sqrt(delta) * D_k).
 *
 * That is a uniform Hoelder-1/2 bound for the rescaled arcs A_k / D_k, which
 * is exactly the regularity a space-filling curve has and the best it can
 * have. Arzela-Ascoli then extracts a uniformly convergent subsequence; its
 * limit A is continuous, and by (H3) + (H4) its image is dense in, hence
 * equal to, the rescaled limit set. By (E) that set has positive area, so A
 * is a continuous surjection of an interval onto a set of positive area: a
 * space-filling curve, whose image therefore has Hausdorff dimension 2.
 *
 * THE BI-INFINITE CURVE NEEDS NO LIMIT AT ALL. Along the Psi chain the arcs
 * are literally nested as paths — same segments, same order — so their union
 * is a single bi-infinite polygonal curve gamma : R -> plane, defined with no
 * convergence argument whatsoever. gamma is simple, and by (H4) it passes
 * through every tile of the limit tiling, hence within one tile diameter of
 * every point of the plane once (E) holds. That is the object the repo's
 * pictures draw. It is NOT the measure-theoretic space-filling curve: a
 * polygonal curve has Hausdorff dimension 1. The space-filling curve is the
 * rescaled limit above. Both statements are true and they are different
 * statements; a write-up must not blur them.
 *
 * SELF-AVOIDANCE IS A PROPERTY OF THE APPROXIMANTS, NOT THE LIMIT. The limit A
 * cannot be injective: a continuous injection of an interval into the plane
 * has image of measure zero. "Self-avoiding" in FASS means every finite
 * approximant A_k is a simple (non-self-crossing) polygonal arc, which is what
 * 01/02/11-*.ts establish. Any write-up that claims the limit curve itself is
 * self-avoiding is claiming something false; the doc must say "approximants".
 *
 * ===========================================================================
 */

import {
  connectionPoints,
  dist,
  leafOrder,
  leafPts,
  SUPER_RULES,
  zApply,
  zKey,
  zLeafPts,
  zMul,
  zSupertileTransforms,
  zToPt,
  Z_IDENT,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
  type ZAffine,
  type ZVec,
} from '../src/core';
import {
  buildStrands,
  CONFIGS,
  floatChords,
  heading,
  pad,
  trace,
  verdict,
  zApply2,
  zExpand,
  type Config,
  type Strands,
  type ZInstance,
} from './lib';

const MAX = Number(process.argv[2] ?? 5);
const MAXG = Number(process.argv[3] ?? Math.min(MAX, 5));
const KEYS = ['hex128', 'spectre1278'] as const;
/** Psi's own slots inside Psi, read off SUPER_RULES.Psi. */
const PSI_SLOTS = (SUPER_RULES.Psi ?? [])
  .map((t, i) => (t === 'Psi' ? i : -1))
  .filter((i) => i >= 0);
const TYPES: TileTypeId[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
const LAMBDA = 4 + Math.sqrt(15);
const SQRT_LAMBDA = Math.sqrt(LAMBDA);

let allOk = true;
const ok = (b: boolean, label: string, detail = ''): boolean => {
  allOk = verdict(b, label, detail) && allOk;
  return b;
};

// ---------------------------------------------------------------------------
// Memoised exact expansion and strands (every level is used several times)
// ---------------------------------------------------------------------------

const expCache = new Map<string, readonly ZInstance[]>();
function expand(family: TileFamilyId, level: number): readonly ZInstance[] {
  const key = `${family}:${level}`;
  let hit = expCache.get(key);
  if (!hit) {
    hit = zExpand(family, 'Psi', level);
    expCache.set(key, hit);
  }
  return hit;
}

const strandCache = new Map<string, Strands>();
function strandsOf(cfg: Config, level: number): Strands {
  const key = `${cfg.id}:${level}`;
  let hit = strandCache.get(key);
  if (!hit) {
    hit = buildStrands(cfg, expand(cfg.family, level));
    strandCache.set(key, hit);
  }
  return hit;
}

/** Undirected canonical key of a segment (endpoint keys are already exact). */
function segKey(s: Strands, i: number): string {
  const [a, b] = s.segs[i];
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

interface ArcInfo {
  /** position in arc order -> segment index */
  readonly order: readonly number[];
  /** segment index -> position in arc order */
  readonly posOf: readonly number[];
  readonly segments: number;
  readonly tiles: number;
}

function arcOf(cfg: Config, level: number): ArcInfo | null {
  const s = strandsOf(cfg, level);
  const tr = trace(s);
  if (tr.arcs.length !== 1 || tr.circuits.length !== 0) return null;
  const order = tr.arcs[0].segIdxs;
  const posOf = new Array<number>(s.segs.length).fill(-1);
  order.forEach((seg, i) => {
    posOf[seg] = i;
  });
  return { order, posOf, segments: s.segs.length, tiles: s.instances.length };
}

// ===========================================================================
// 1. NESTING: the child arc is a contiguous sub-path of the parent arc
// ===========================================================================

interface NestRow {
  readonly level: number;
  readonly contiguous: boolean;
  readonly keysMatch: boolean;
  readonly before: number;
  readonly after: number;
  readonly childSegs: number;
  readonly parentSegs: number;
}

const nestRows = new Map<string, NestRow[]>(); // `${cfgKey}:${slot}` -> rows

heading('1. NESTING — is the child arc a contiguous sub-path of the parent arc?');
console.log(`  Psi occurs inside Psi at slots ${PSI_SLOTS.join(', ')} (SUPER_RULES.Psi).
  At level k the child is the sub-supertile with tile-id prefix "slot"; its
  dots are Ts_k[slot] applied to the standalone level-(k-1) patch's dots, so
  the SET containment is an identity of ZAffines (checked as a guard). The
  content is whether those segments form one unbroken run of the parent arc.\n`);

for (const key of KEYS) {
  const cfg = CONFIGS[key];
  console.log(`  ${cfg.id}`);
  console.log('    | level | tiles | segments | slot | child segs | contiguous | keys | before | after |');
  console.log('    |---|---|---|---|---|---|---|---|---|');
  for (let lv = 1; lv <= MAX; lv++) {
    const arc = arcOf(cfg, lv);
    if (!arc) {
      ok(false, `${cfg.id} level ${lv}: the patch is not a single arc`);
      break;
    }
    if (lv === 1) {
      console.log(`    | 1 | ${pad(arc.tiles, 5)} | ${pad(arc.segments, 8)} | — | — | — | — | — | — |`);
      continue;
    }
    const s = strandsOf(cfg, lv);
    const child = strandsOf(cfg, lv - 1);
    const Ts = zSupertileTransforms(cfg.family, lv);
    const topSlot = s.instances.map((i) => Number(i.id.split('.')[0]));
    for (const slot of PSI_SLOTS) {
      // positions, in arc order, of every segment owned by the slot-`slot` child
      const pos: number[] = [];
      for (let i = 0; i < s.segs.length; i++) if (topSlot[s.instOf[i]] === slot) pos.push(arc.posOf[i]);
      pos.sort((a, b) => a - b);
      const contiguous = pos.length > 0 && pos[pos.length - 1] - pos[0] + 1 === pos.length;

      // exact key containment: Ts_lv[slot] carries the standalone child's
      // segment keys onto exactly the child's segment keys inside the parent.
      const want = new Set<string>();
      for (let i = 0; i < child.segs.length; i++) {
        const [a, b] = child.segs[i];
        const pa = zKey(zApply2(Ts[slot], child.coord.get(a) as ZVec));
        const pb = zKey(zApply2(Ts[slot], child.coord.get(b) as ZVec));
        want.add(pa < pb ? `${pa}|${pb}` : `${pb}|${pa}`);
      }
      const got = new Set<string>();
      for (let i = 0; i < s.segs.length; i++) if (topSlot[s.instOf[i]] === slot) got.add(segKey(s, i));
      let keysMatch = want.size === got.size && got.size === pos.length;
      if (keysMatch) for (const k of want) if (!got.has(k)) { keysMatch = false; break; }

      const before = pos[0];
      const after = arc.segments - 1 - pos[pos.length - 1];
      const rowKey = `${key}:${slot}`;
      if (!nestRows.has(rowKey)) nestRows.set(rowKey, []);
      nestRows.get(rowKey)!.push({
        level: lv, contiguous, keysMatch, before, after,
        childSegs: pos.length, parentSegs: arc.segments,
      });
      console.log(
        `    | ${lv} | ${pad(arc.tiles, 5)} | ${pad(arc.segments, 8)} | ${slot} | ${pad(pos.length, 10)} | ${pad(contiguous ? 'yes' : 'NO', 10)} | ${pad(keysMatch ? 'exact' : 'MISMATCH', 8)} | ${pad(before, 6)} | ${pad(after, 5)} |`,
      );
      if (!contiguous || !keysMatch) allOk = false;
    }
  }
}
for (const key of KEYS) {
  for (const slot of PSI_SLOTS) {
    const rows = nestRows.get(`${key}:${slot}`) ?? [];
    ok(
      rows.length > 0 && rows.every((r) => r.contiguous && r.keysMatch),
      `${CONFIGS[key].id} slot ${slot}: child arc is an exact contiguous sub-path, levels 2..${MAX}`,
    );
  }
}

// --- the stronger Hilbert property: EVERY sub-supertile, every depth --------

heading('1b. REFUTED: the naive Hilbert nesting. What is true instead.');
console.log(`  (H1-naive) would say: for every depth d the tiles sharing an id prefix of
  length d — a level-(k-d) sub-supertile — occupy ONE contiguous interval of
  the level-k arc. That is FALSE here, and the failure is completely regular.

  A standalone level-j supertile of type T has its own strand diagram, which
  splits into a fixed number arcs(T) of open arcs and NO circuits. The parent
  arc has to thread each of them separately, so it enters that sub-supertile
  exactly arcs(T) times. Only Psi has arcs(Psi) = 1 — which is why Psi is the
  only type that nests literally, and the only viable root.\n`);

/** Arc/circuit profile of a standalone type-T supertile at level j. */
const profCache = new Map<string, { arcs: number; circuits: number; minFrac: number; segs: number; tiles: number; covered: boolean }>();
function profileOf(cfg: Config, type: TileTypeId, level: number) {
  const ck = `${cfg.id}:${type}:${level}`;
  let hit = profCache.get(ck);
  if (!hit) {
    const inst = zExpand(cfg.family, type, level);
    const s = buildStrands(cfg, inst);
    const tr = trace(s);
    const lens = tr.arcs.map((a) => a.segIdxs.length);
    hit = {
      arcs: tr.arcs.length,
      circuits: tr.circuits.length,
      minFrac: lens.length ? Math.min(...lens) / s.segs.length : 0,
      segs: s.segs.length,
      tiles: inst.length,
      covered: tr.tilesCovered === inst.length,
    };
    profCache.set(ck, hit);
  }
  return hit;
}

const typeOfPrefix = (slots: readonly number[]): TileTypeId => {
  let t: TileTypeId = 'Psi';
  for (const s of slots) t = SUPER_RULES[t][s] as TileTypeId;
  return t;
};

for (const key of KEYS) {
  const cfg = CONFIGS[key];
  console.log(`  ${cfg.id} — arcs(T) of a standalone level-j supertile of type T`);
  console.log(`    | level j | ${TYPES.map((t) => pad(t.slice(0, 5), 6)).join(' |')} | circuits | min arc share |`);
  console.log(`    |---|${TYPES.map(() => '---').join('|')}|---|---|`);
  const arcsAt: number[][] = [];
  let noCircuits = true;
  for (let j = 1; j <= Math.max(1, MAX - 1); j++) {
    const profs = TYPES.map((t) => profileOf(cfg, t, j));
    arcsAt.push(profs.map((p) => p.arcs));
    const circuits = profs.reduce((a, p) => a + p.circuits, 0);
    const minFrac = Math.min(...profs.map((p) => p.minFrac));
    console.log(
      `    | ${j} | ${profs.map((p) => pad(p.arcs, 6)).join(' |')} | ${pad(circuits, 8)} | ${pad(minFrac.toFixed(5), 13)} |`,
    );
    if (circuits !== 0 || !profs.every((p) => p.covered)) noCircuits = false;
  }
  if (!noCircuits) allOk = false;
  ok(noCircuits, `${cfg.id}: no supertile type of any level <= ${Math.max(1, MAX - 1)} has a circuit, and each covers all its tiles`);
  const levelIndependent = arcsAt.every((r) => r.every((v, i) => v === arcsAt[0][i]));
  ok(levelIndependent, `${cfg.id}: arcs(T) is LEVEL-INDEPENDENT`,
    `${TYPES.map((t, i) => `${t}=${arcsAt[0][i]}`).join(' ')}`);
  ok(arcsAt[0][TYPES.indexOf('Psi')] === 1, `${cfg.id}: Psi is the unique type with a single arc`,
    `every other type has ${TYPES.filter((t) => t !== 'Psi').map((t) => arcsAt[0][TYPES.indexOf(t)]).join('/')} arcs`);
  ok(Math.max(...arcsAt[0]) === 5, `${cfg.id}: the re-entry bound is m = ${Math.max(...arcsAt[0])}`, 'this is hypothesis (H1)');
  console.log(`    NOTE: the smallest arc's share of the segments decays like lambda^(-j),
    so individual RUNS can be as short as a couple of segments. Any argument
    that assumes runs are a fixed fraction of the sub-supertile is wrong.\n`);
}

console.log('  Direct check of (H1) and (H5) on the level-k arc itself:');
console.log('    | config | level | depth | sub-supertiles | runs = arcs(type)? | contiguous | max runs | min time share * lambda^d |');
console.log('    |---|---|---|---|---|---|---|---|');
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  let allMatch = true;
  let contigExact = true;
  let worstRuns = 0;
  let worstShare = Infinity;
  for (let lv = 2; lv <= MAX; lv++) {
    const arc = arcOf(cfg, lv);
    if (!arc) continue;
    const s = strandsOf(cfg, lv);
    for (let d = 1; d < lv; d++) {
      const runsOf = new Map<string, number>();
      const cntOf = new Map<string, number>();
      let prev = '';
      for (const seg of arc.order) {
        const pre = s.instances[s.instOf[seg]].id.split('.').slice(0, d).join('.');
        cntOf.set(pre, (cntOf.get(pre) ?? 0) + 1);
        if (pre !== prev) runsOf.set(pre, (runsOf.get(pre) ?? 0) + 1);
        prev = pre;
      }
      let matches = 0;
      let contiguous = 0;
      let psiCount = 0;
      let contiguousArePsi = true;
      let maxRuns = 0;
      let minShare = Infinity;
      for (const [pre, r] of runsOf) {
        const type = typeOfPrefix(pre.split('.').map(Number));
        if (type === 'Psi') psiCount++;
        if (r === profileOf(cfg, type, lv - d).arcs) matches++;
        if (r === 1) {
          contiguous++;
          if (type !== 'Psi') contiguousArePsi = false;
        }
        maxRuns = Math.max(maxRuns, r);
        minShare = Math.min(minShare, (cntOf.get(pre) as number) / s.segs.length);
      }
      const total = runsOf.size;
      if (matches !== total) allMatch = false;
      if (contiguous !== psiCount || !contiguousArePsi) contigExact = false;
      worstRuns = Math.max(worstRuns, maxRuns);
      worstShare = Math.min(worstShare, minShare * LAMBDA ** d);
      console.log(
        `    | ${pad(cfg.id, 24)} | ${lv} | ${d} | ${pad(total, 14)} | ${pad(`${matches}/${total}`, 18)} | ${pad(`${contiguous}/${total}`, 10)} | ${pad(maxRuns, 8)} | ${pad((minShare * LAMBDA ** d).toFixed(5), 25)} |`,
      );
    }
  }
  ok(allMatch, `${cfg.id}: every sub-supertile is entered exactly arcs(its type) times, all depths, all levels`);
  ok(contigExact, `${cfg.id}: a sub-supertile is contiguous IF AND ONLY IF it is a Psi sub-supertile`,
    'the "contiguous" column above is exactly the Psi count at that depth');
  ok(worstRuns <= 5, `${cfg.id}: the re-entry count never exceeds m = 5 — hypothesis (H1)`, `worst ${worstRuns}`);
  ok(worstShare > 0.05, `${cfg.id}: no starved sub-supertile — hypothesis (H5)`,
    `least time share over all depths is ${worstShare.toFixed(5)} * lambda^(-depth)`);
}
console.log(`\n  So (H1-naive) is REFUTED and replaced by (H1): re-entry is bounded by 5,
  and the number of entries of a sub-supertile is exactly arcs(its type) —
  matched for every single sub-supertile at every depth and level checked.`);

// ===========================================================================
// 2. BOTH ENDS GROW
// ===========================================================================

heading('2. BI-INFINITENESS — does the parent arc grow on BOTH sides?');
console.log(`  trace() picks an arc direction arbitrarily and independently at each level,
  so "before" and "after" cannot be summed across levels — which end of the
  growing curve each one feeds is not tracked. The direction-free statement
  is what matters and is stronger than it looks: at level k the two ends of
  the child's sub-path ARE the two ends of the level-(k-1) arc, and they are
  extended by "before" and "after" segments in some order. So EACH end of the
  growing curve receives at least min(before, after) new segments at every
  level, hence at least the running sum of those minima in total. If that sum
  diverges the union is a LINE; if some level had min = 0 the curve would
  stop growing at one end and the union could be a RAY.

  The structural reason: the level-k arc visits the 8 top-level children in a
  definite order WITH REPEATS — 21 runs, not 8, because of section 1b — but
  each Psi child is visited exactly once. If that single visit is neither the
  first nor the last run, both sides are non-empty; and since the neighbouring
  children's segment counts grow like lambda^k, both sides grow geometrically.
  The visit sequences are printed first (slot numbers, in arc order).\n`);

for (const key of KEYS) {
  const cfg = CONFIGS[key];
  console.log(`  ${cfg.id} — top-level slot visit sequence per level (canonicalised by direction)`);
  const orders: string[] = [];
  for (let lv = 2; lv <= MAX; lv++) {
    const arc = arcOf(cfg, lv);
    if (!arc) continue;
    const s = strandsOf(cfg, lv);
    const seq: number[] = [];
    for (const seg of arc.order) {
      const slot = Number(s.instances[s.instOf[seg]].id.split('.')[0]);
      if (seq.length === 0 || seq[seq.length - 1] !== slot) seq.push(slot);
    }
    const fwd = seq.join(' ');
    const rev = [...seq].reverse().join(' ');
    const canon = fwd < rev ? fwd : rev;
    orders.push(canon);
    const psiOnce = PSI_SLOTS.every((p) => seq.filter((x) => x === p).length === 1);
    console.log(`    level ${lv}: ${canon}   (${seq.length} runs; Psi slots visited once: ${psiOnce ? 'yes' : 'NO'})`);
    if (!psiOnce) allOk = false;
  }
  const evenOrders = orders.filter((_, i) => i % 2 === 0);
  const oddOrders = orders.filter((_, i) => i % 2 === 1);
  const period2 =
    evenOrders.every((o) => o === evenOrders[0]) && oddOrders.every((o) => o === oddOrders[0]);
  ok(period2, `${cfg.id}: the slot visit sequence is period-2 in the level (the mirror parity)`,
    period2 && evenOrders[0] === oddOrders[0] ? 'in fact constant' : `two sequences, alternating`);
  for (const slot of PSI_SLOTS) {
    const neverEnd = orders.every((o) => {
      const parts = o.split(' ').map(Number);
      return parts[0] !== slot && parts[parts.length - 1] !== slot;
    });
    ok(neverEnd, `${cfg.id}: nesting slot ${slot} is never the first or last run`,
      neverEnd ? 'so both sides are non-empty at every level' : 'that slot yields a RAY, not a line');
  }
}

for (const key of KEYS) {
  const cfg = CONFIGS[key];
  console.log(`\n  ${cfg.id} — material on each side of the nested child`);
  console.log('    | slot | level | before | after | min | guaranteed per end (sum of mins) | total added | min ratio |');
  console.log('    |---|---|---|---|---|---|---|---|');
  for (const slot of PSI_SLOTS) {
    const rows = nestRows.get(`${key}:${slot}`) ?? [];
    let guaranteed = 0;
    let total = 0;
    let prevMin = 0;
    const mins: number[] = [];
    for (const r of rows) {
      const mn = Math.min(r.before, r.after);
      guaranteed += mn;
      total += r.before + r.after;
      mins.push(mn);
      console.log(
        `    | ${slot} | ${r.level} | ${pad(r.before, 6)} | ${pad(r.after, 6)} | ${pad(mn, 6)} | ${pad(guaranteed, 31)} | ${pad(total, 11)} | ${pad(prevMin ? (mn / prevMin).toFixed(3) : '—', 9)} |`,
      );
      prevMin = mn;
    }
    // Each substitution level is a MIRROR of the previous one, so the natural
    // comparison is at equal parity: mins[i] against mins[i-2]. The ratio
    // should approach lambda^2 = 61.98.
    const positive = mins.every((m) => m > 0);
    const parityGrows = mins.length < 3 || mins.every((m, i) => i < 2 || m > mins[i - 2]);
    const ratios = mins.map((m, i) => (i < 2 ? null : m / mins[i - 2])).filter((r): r is number => r !== null);
    ok(positive && parityGrows,
      `${cfg.id} slot ${slot}: min(before, after) > 0 at every level and grows at equal parity`,
      `mins ${mins.join(' -> ')}; two-level ratios ${ratios.map((r) => r.toFixed(1)).join(', ') || '(need level >= 4)'} vs lambda^2 = ${(LAMBDA * LAMBDA).toFixed(1)}; each end gains >= ${guaranteed} segments by level ${MAX}`);
  }
}

// ===========================================================================
// 3. EXHAUSTION OF THE PLANE
// ===========================================================================

heading('3. EXHAUSTION — does the nested union eventually contain any bounded set?');

/** Exact patch skeleton: edge multiplicities, outline, per-tile boundary flag. */
interface Patch {
  readonly inst: readonly ZInstance[];
  /** undirected exact edge key -> multiplicity */
  readonly mult: ReadonlyMap<string, number>;
  /** outline edges as float segments */
  readonly outline: readonly (readonly [Pt, Pt])[];
  /** tile index -> does it own an outline edge? */
  readonly touches: readonly boolean[];
  /** exact undirected keys of the outline */
  readonly bkeys: ReadonlySet<string>;
  /** the outline again, as exact endpoint pairs */
  readonly bexact: readonly (readonly [ZVec, ZVec])[];
  readonly hull: readonly Pt[];
}

const ukey = (a: ZVec, b: ZVec): string => {
  const ka = zKey(a);
  const kb = zKey(b);
  return ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
};

function convexHull(pts: readonly Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => (a.x - b.x) || (a.y - b.y));
  if (p.length < 3) return p;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

const patchCache = new Map<string, Patch>();
function patchOf(family: TileFamilyId, level: number): Patch {
  const ck = `${family}:${level}`;
  const hit = patchCache.get(ck);
  if (hit) return hit;
  const inst = expand(family, level);
  const mult = new Map<string, number>();
  for (const i of inst) {
    const poly = zLeafPts(family, i.type).map((p) => zApply(i.xform, p));
    for (let j = 0; j < poly.length; j++) {
      const u = ukey(poly[j], poly[(j + 1) % poly.length]);
      mult.set(u, (mult.get(u) ?? 0) + 1);
    }
  }
  const outline: (readonly [Pt, Pt])[] = [];
  const bexact: (readonly [ZVec, ZVec])[] = [];
  const bkeys = new Set<string>();
  const touches = new Array<boolean>(inst.length).fill(false);
  const bverts: Pt[] = [];
  for (let t = 0; t < inst.length; t++) {
    const poly = zLeafPts(family, inst[t].type).map((p) => zApply(inst[t].xform, p));
    for (let j = 0; j < poly.length; j++) {
      const a = poly[j];
      const b = poly[(j + 1) % poly.length];
      const u = ukey(a, b);
      if (mult.get(u) === 1) {
        touches[t] = true;
        bkeys.add(u);
        bexact.push([a, b]);
        const pa = zToPt(a);
        const pb = zToPt(b);
        outline.push([pa, pb]);
        bverts.push(pa);
      }
    }
  }
  const out: Patch = { inst, mult, outline, touches, bkeys, bexact, hull: convexHull(bverts) };
  patchCache.set(ck, out);
  return out;
}

function pointSegDist(p: Pt, a: Pt, b: Pt): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const c2 = vx * vx + vy * vy;
  const t = c2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / c2)) : 0;
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

function inradius(p: Patch, c: Pt): number {
  let r = Infinity;
  for (const [a, b] of p.outline) {
    const d = pointSegDist(c, a, b);
    if (d < r) r = d;
  }
  return r;
}

function centroidOf(family: TileFamilyId, inst: readonly ZInstance[], idxs: readonly number[]): Pt {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const t of idxs) {
    for (const p of zLeafPts(family, inst[t].type)) {
      const w = zToPt(zApply(inst[t].xform, p));
      sx += w.x;
      sy += w.y;
      n++;
    }
  }
  return { x: sx / n, y: sy / n };
}

// --- 3a: the tilings really are edge-to-edge (Lemma A's hypothesis) --------

console.log(`  3a. Lemma A needs the patches to be edge-to-edge. Exact check: no edge is
      used more than twice, and the outline is a disjoint union of simple
      cycles (every outline vertex has outline-degree 2).\n`);
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  for (let lv = 1; lv <= MAXG; lv++) {
    const p = patchOf(family, lv);
    let maxMult = 0;
    for (const v of p.mult.values()) maxMult = Math.max(maxMult, v);
    const deg = new Map<string, number>();
    for (const u of p.bkeys) {
      const [a, b] = u.split('_');
      deg.set(a, (deg.get(a) ?? 0) + 1);
      deg.set(b, (deg.get(b) ?? 0) + 1);
    }
    let allDeg2 = true;
    for (const d of deg.values()) if (d !== 2) allDeg2 = false;
    ok(
      maxMult === 2 && allDeg2,
      `${family} level ${lv}: edge-to-edge (max multiplicity ${maxMult}), outline = simple cycles`,
      `${p.inst.length} tiles, ${p.bkeys.size} outline edges`,
    );
  }
}

// --- 3b: the constant-slot nesting does NOT exhaust the plane --------------

console.log(`\n  3b. CONSTANT SLOT. The seed P_1 sits at address (slot, slot, ..., slot).
      If one of its outline edges stays an outline edge of P_k for every k,
      Lemma A says the union misses an open half-disc — the union is NOT the
      plane. Below: the number of the seed's own outline edges that are still
      outline edges of P_k (the "frozen" edges), and the inradius about the
      seed's centroid, which is monotone in k.\n`);

/** Ts_lv[slot] . Ts_{lv-1}[slot] . ... . Ts_2[slot]: where the seed sits in P_lv. */
function seedXform(family: TileFamilyId, slots: readonly number[]): ZAffine {
  // `slots` is root-down: slots[0] is the outermost choice.
  let T = Z_IDENT;
  const lv = slots.length + 1;
  for (let i = 0; i < slots.length; i++) T = zMul(T, zSupertileTransforms(family, lv - i)[slots[i]]);
  return T;
}

for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  console.log(`  ${family}`);
  console.log('    | slot | level | tiles | seed outline edges | still frozen | inradius | patch radius |');
  console.log('    |---|---|---|---|---|---|---|');
  for (const slot of PSI_SLOTS) {
    const inradii: number[] = [];
    const frozen: number[] = [];
    for (let lv = 1; lv <= MAXG; lv++) {
      const p = patchOf(family, lv);
      const pre = new Array(lv - 1).fill(slot).join('.');
      const idxs: number[] = [];
      for (let t = 0; t < p.inst.length; t++) {
        if (lv === 1 || p.inst[t].id.split('.').slice(0, lv - 1).join('.') === pre) idxs.push(t);
      }
      const c = centroidOf(family, p.inst, idxs);
      const A = seedXform(family, new Array(lv - 1).fill(slot));
      const seed = patchOf(family, 1);
      let fro = 0;
      for (const [va, vb] of seed.bexact) {
        if (p.bkeys.has(ukey(zApply(A, va), zApply(A, vb)))) fro++;
      }
      const r = inradius(p, c);
      let rad = 0;
      for (const [a] of p.outline) rad = Math.max(rad, dist(c, a));
      inradii.push(r);
      frozen.push(fro);
      console.log(
        `    | ${slot} | ${lv} | ${pad(p.inst.length, 6)} | ${pad(seed.bexact.length, 18)} | ${pad(fro, 12)} | ${pad(r.toFixed(4), 8)} | ${pad(rad.toFixed(2), 12)} |`,
      );
    }
    const flat = inradii.every((r) => Math.abs(r - inradii[0]) < 1e-9);
    const stillFrozen = frozen[frozen.length - 1] > 0;
    ok(
      flat && stillFrozen,
      `${family} slot ${slot}: inradius CONSTANT and ${frozen[frozen.length - 1]} seed edge(s) still on the outline`,
      `=> by Lemma A the constant-slot union MISSES an open set: it does NOT exhaust the plane`,
    );
  }
}

// --- 3c: a varying Psi-only address DOES bury the seed --------------------

console.log(`\n  3c. VARYING ADDRESS, STILL INSIDE Psi. The address may use any of the
      slots ${PSI_SLOTS.join(', ')} at each step, so there are 3^(k-1) of them at level k, and
      EVERY patch in the sequence is still a Psi supertile — hence still a
      single arc (Lemma 4). All of them are enumerated exactly below. An
      address is "buried" at level k when its seed sub-supertile owns no
      outline edge of P_k at all.\n`);

interface AddrRow { readonly addr: string; readonly buried: boolean; readonly inr: number; }

for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  console.log(`  ${family}`);
  console.log('    | level | Psi addresses | buried | best inradius | best address (a_2 a_3 ... a_k) |');
  console.log('    |---|---|---|---|---|');
  const perLevel: AddrRow[][] = [];
  for (let lv = 2; lv <= MAXG; lv++) {
    const p = patchOf(family, lv);
    // group tiles by their level-1 address prefix
    const groups = new Map<string, number[]>();
    for (let t = 0; t < p.inst.length; t++) {
      const pre = p.inst[t].id.split('.').slice(0, lv - 1).join('.');
      let g = groups.get(pre);
      if (!g) { g = []; groups.set(pre, g); }
      g.push(t);
    }
    const rows: AddrRow[] = [];
    for (const [pre, idxs] of groups) {
      const slots = pre.split('.').map(Number);
      if (!slots.every((s) => PSI_SLOTS.includes(s))) continue;
      const buried = !idxs.some((t) => p.touches[t]);
      const inr = inradius(p, centroidOf(family, p.inst, idxs));
      rows.push({ addr: [...slots].reverse().join(''), buried, inr });
    }
    rows.sort((a, b) => b.inr - a.inr);
    perLevel.push(rows);
    console.log(
      `    | ${lv} | ${pad(rows.length, 13)} | ${pad(rows.filter((r) => r.buried).length, 6)} | ${pad(rows[0].inr.toFixed(4), 13)} | ${rows[0].addr}${rows[0].buried ? '  (BURIED)' : ''} |`,
    );
  }
  const last = perLevel[perLevel.length - 1];
  const anyBuried = last.some((r) => r.buried);
  if (MAXG >= 5) {
    ok(
      anyBuried,
      `${family}: a Psi-only address buries the seed by level ${MAXG}`,
      anyBuried
        ? `${last.filter((r) => r.buried).length} of ${last.length} addresses; best inradius ${last[0].inr.toFixed(4)}`
        : `no Psi-only address buries the seed at level <= ${MAXG}`,
    );
  } else {
    console.log(`    (burial first happens at level 5; this run stopped at ${MAXG}, so the`);
    console.log(`     burial verdict is skipped — re-run with maxGeomLevel >= 5.)`);
  }

  // Track one fixed infinite address through the levels: the inradius is
  // monotone in k for a FIXED address (P_k increases), so the sequence below
  // is the real growth of a single nested union.
  if (anyBuried) {
    const chosen = last[0].addr; // a_2 a_3 ... a_MAXG, inside-out
    const chain: number[] = [];
    const bury: boolean[] = [];
    for (let lv = 2; lv <= MAXG; lv++) {
      const rows = perLevel[lv - 2];
      const pre = chosen.slice(0, lv - 1);
      const hit = rows.find((r) => r.addr === pre);
      chain.push(hit ? hit.inr : NaN);
      bury.push(hit ? hit.buried : false);
    }
    console.log(`\n    fixed address a = ${chosen}... : inradius at k = 2..${MAXG}`);
    console.log(`      ${chain.map((v, i) => `${v.toFixed(3)}${bury[i] ? '*' : ''}`).join('  ->  ')}    (* = seed buried)`);
    const mono = chain.every((v, i) => i === 0 || v >= chain[i - 1] - 1e-9);
    ok(mono, `${family}: the inradius of a fixed address is monotone in k (as it must be)`);
    const grew = chain[chain.length - 1] > chain[0] + 1e-9;
    ok(grew, `${family}: and it has strictly increased by level ${MAXG}`,
      `${chain[0].toFixed(3)} -> ${chain[chain.length - 1].toFixed(3)}`);
    // Lemma B's collar gap for the last step.
    const p = patchOf(family, MAXG);
    const preSlots = chosen.split('').map(Number).reverse().join('.');
    const idxs: number[] = [];
    for (let t = 0; t < p.inst.length; t++) {
      if (p.inst[t].id.split('.').slice(0, MAXG - 1).join('.') === preSlots) idxs.push(t);
    }
    if (idxs.length) {
      // boundary of the seed Q inside P: edges of Q's tiles not shared with another Q tile
      const qm = new Map<string, number>();
      for (const t of idxs) {
        const poly = zLeafPts(family, p.inst[t].type).map((q) => zApply(p.inst[t].xform, q));
        for (let j = 0; j < poly.length; j++) {
          const u = ukey(poly[j], poly[(j + 1) % poly.length]);
          qm.set(u, (qm.get(u) ?? 0) + 1);
        }
      }
      const qEdges: [Pt, Pt][] = [];
      for (const t of idxs) {
        const poly = zLeafPts(family, p.inst[t].type).map((q) => zApply(p.inst[t].xform, q));
        for (let j = 0; j < poly.length; j++) {
          const u = ukey(poly[j], poly[(j + 1) % poly.length]);
          if (qm.get(u) === 1) qEdges.push([zToPt(poly[j]), zToPt(poly[(j + 1) % poly.length])]);
        }
      }
      // d(bdy Q, bdy P) for polygonal boundaries is attained at a vertex of
      // one against a point of the other, so BOTH directions are needed.
      let gap = Infinity;
      for (const [qa, qb] of qEdges) {
        for (const [a, b] of p.outline) {
          gap = Math.min(
            gap,
            pointSegDist(qa, a, b), pointSegDist(qb, a, b),
            pointSegDist(a, qa, qb), pointSegDist(b, qa, qb),
          );
        }
      }
      console.log(`      Lemma B collar gap d(boundary Q, boundary P) at level ${MAXG}: ${gap.toFixed(4)}  (${idxs.length} tiles in Q)`);
      ok(gap > 1e-9, `${family}: the collar gap is strictly positive, so Lemma B applies`,
        `gap ${gap.toFixed(4)} (both directions, vertex-to-edge); burial only forbids a shared EDGE, so a shared VERTEX would give gap 0 and Lemma B would say nothing — it does not happen here`);
    }
  }
}

// --- 3d: is burial a LEVEL-INDEPENDENT depth-4 fact? ----------------------

const BURY_DEPTH = 4;
if (MAXG >= BURY_DEPTH + 2) {
  console.log(`\n  3d. IS BURIAL LEVEL-INDEPENDENT? The divergence argument needs more than
      one buried level: it needs the seed's ancestor to be buried inside ITS
      ancestor at every step of a periodic address. That is the statement

        "in a level-M Psi supertile, the level-(M-${BURY_DEPTH}) sub-supertile at
         root-down address alpha owns no outline edge"

      for every M, not just M = ${BURY_DEPTH + 1}. It is a purely combinatorial statement
      about the depth-${BURY_DEPTH} decomposition, so L3 would give it for all M. Here
      it is checked directly at M = ${BURY_DEPTH + 1} .. ${MAXG}: if the buried SET of addresses is
      the same at each M, the depth-${BURY_DEPTH} burial does not depend on the level.\n`);
  for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
    const sets: string[][] = [];
    for (let M = BURY_DEPTH + 1; M <= MAXG; M++) {
      const p = patchOf(family, M);
      const groups = new Map<string, number[]>();
      for (let t = 0; t < p.inst.length; t++) {
        const pre = p.inst[t].id.split('.').slice(0, BURY_DEPTH).join('.');
        let g = groups.get(pre);
        if (!g) { g = []; groups.set(pre, g); }
        g.push(t);
      }
      const buried: string[] = [];
      for (const [pre, idxs] of groups) {
        const slots = pre.split('.').map(Number);
        if (slots.length !== BURY_DEPTH || !slots.every((s) => PSI_SLOTS.includes(s))) continue;
        if (!idxs.some((t) => p.touches[t])) buried.push(pre);
      }
      buried.sort();
      sets.push(buried);
      console.log(`    ${pad(family, 8)} M = ${M}: ${buried.length} of ${3 ** BURY_DEPTH} depth-${BURY_DEPTH} Psi addresses buried — ${buried.join(' ') || '(none)'}`);
    }
    const same = sets.every((s) => s.length === sets[0].length && s.every((v, i) => v === sets[0][i]));
    ok(
      same && sets[0].length > 0,
      `${family}: the buried depth-${BURY_DEPTH} address set is IDENTICAL at M = ${BURY_DEPTH + 1}..${MAXG}`,
      same
        ? `${sets[0].length} addresses, so burial is a depth-${BURY_DEPTH} fact, not a level-${BURY_DEPTH + 1} accident`
        : `sets differ between levels: ${sets.map((s) => s.length).join(' vs ')}`,
    );
    // The periodic construction repeats ONE root-down address alpha as the
    // block, so any alpha in the buried set is a usable period: at every
    // block boundary the ancestor sits at exactly that address inside its
    // own ancestor. No extra closure condition is needed.
    if (sets[0].length) {
      const alpha = sets[0][0];
      const inOut = alpha.split('.').reverse().join('');
      ok(true,
        `${family}: periodic address available — repeat the inside-out block (${inOut})`,
        `root-down block ${alpha}; at every block boundary Q_i sits at that address inside Q_{i+1}, so Lemma B applies once per block`);
    }
  }
} else {
  console.log(`\n  3d. (skipped: needs maxGeomLevel >= ${BURY_DEPTH + 2} to compare two levels of depth-${BURY_DEPTH} burial)`);
}

console.log(`
  READING OF SECTION 3. Two findings, and they point opposite ways.

   * A CONSTANT nesting slot does NOT exhaust the plane. The seed keeps an
     outline edge at every level, so by Lemma A the union misses an open set.
     This is a proof (given the edge-to-edge check and the persistence of the
     edge, which is verified to level ${MAXG} and is a combinatorial statement
     that L3 would extend to all levels) — not a numerical impression. Note
     this is WEAKER than the claim in docs/FASS_PROOF.md §4.5 and in
     fass-proof/13-nesting-limit.ts that the constant-slot union "fills a
     sector". Missing an open set is what the computation supports; that the
     complement is a sector is not checked anywhere, here or there.
   * A VARYING address, still entirely within Psi supertiles, DOES bury the
     seed, at every level from 5 on. Every patch in that sequence is a Psi
     supertile and hence already a single arc, so nothing is given up. This
     corrects fass-proof/13-nesting-limit.ts, which states that pushing the
     seed inside "needs an address that passes through other supertile types"
     — it does not — and it makes the Delta-nesting-plus-merge route of
     docs/FASS_PROOF.md §4.5 and fass-proof/14-merge.ts unnecessary rather
     than wrong: that route reaches the same conclusion through four arcs
     that merge over two levels, where the Psi route never leaves one arc.

  What is still needed for divergence at ALL levels: that the seed's ancestor
  stays buried at every level, i.e. that the burial is a level-independent
  combinatorial fact about the depth-${BURY_DEPTH} decomposition. Section 3d checks exactly
  that, at two levels; L3 is what would give it for all of them. Granted it,
  Lemma B adds at least one collar gap per period of the address, the inradius
  is unbounded, and the union is the whole plane — with every approximant
  still a single arc, because every patch in the chain is a Psi supertile.

  The one gap that survives even given L3: Lemma B gives inradius >= sum of
  the per-block collar gaps, so divergence needs that sum to be infinite. Each
  gap is strictly positive (measured), but no argument here bounds them below
  by a fixed constant. In practice they grow like lambda^(period/2) with the
  patches, which is overwhelmingly the expected behaviour and is what the
  measured sequence shows; it is not proved.`);

// ===========================================================================
// 4. SPACE-FILLING: the remaining hypotheses
// ===========================================================================

heading('4. SPACE-FILLING — the hypotheses of the modulus-of-continuity argument');

console.log(`  (H1) bounded re-entry (m = 5) and (H5) no starved sub-supertile: both
       checked in section 1b above, along with the refutation of the naive
       Hilbert nesting that the textbook version of this argument assumes.\n`);

// --- (H2) how far a chord can leave its own tile --------------------------

function pointInPoly(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function distToPoly(p: Pt, poly: readonly Pt[]): number {
  if (pointInPoly(p, poly)) return 0;
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) d = Math.min(d, pointSegDist(p, poly[i], poly[(i + 1) % poly.length]));
  return d;
}

console.log('  (H2) localisation: how far can a chord leave its OWN tile?');
console.log('    | config | worst leaf type | max excursion | (2 sqrt3 - 3)/8 | (2-sqrt3)/4 |');
console.log('    |---|---|---|---|---|');
const EXPECT = (2 - Math.sqrt(3)) / 4;
const EXCURSION = (2 * Math.sqrt(3) - 3) / 8;
const eps0: Record<string, number> = {};
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  let worst = 0;
  let worstType = '—';
  for (const type of leafOrder(cfg.family)) {
    const poly = leafPts(cfg.family, type);
    for (const [a, b] of floatChords(cfg, type)) {
      for (let s = 0; s <= 4000; s++) {
        const t = s / 4000;
        const d = distToPoly({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }, poly);
        if (d > worst) { worst = d; worstType = type; }
      }
    }
  }
  eps0[key] = worst;
  console.log(
    `    | ${cfg.id} | ${pad(worstType, 15)} | ${pad(worst.toFixed(6), 13)} | ${pad(EXCURSION.toFixed(6), 15)} | ${EXPECT.toFixed(6)} |`,
  );
}
ok(eps0.hex128 < 1e-9, 'hex: every chord stays inside its own tile (eps0 = 0)');
ok(
  eps0.spectre1278 > 0 && eps0.spectre1278 < 0.1,
  'spectre: chords DO leave their tiles, but by a bounded CONSTANT independent of level',
  `eps0 = ${eps0.spectre1278.toFixed(6)}, clearance ${(0.1 - eps0.spectre1278).toFixed(4)} below the 0.1 bound`,
);
ok(
  Math.abs(eps0.spectre1278 - EXCURSION) < 1e-5,
  'spectre: that constant is (2 sqrt 3 - 3)/8, NOT the (2 - sqrt 3)/4 of docs/FASS_PROOF.md §4.2',
  `measured ${eps0.spectre1278.toFixed(9)} vs (2 sqrt3 - 3)/8 = ${EXCURSION.toFixed(9)} (difference ${Math.abs(eps0.spectre1278 - EXCURSION).toExponential(2)}),` +
    ` vs (2-sqrt3)/4 = ${EXPECT.toFixed(9)} (difference ${Math.abs(eps0.spectre1278 - EXPECT).toExponential(2)});` +
    ` 4001 samples per chord, so the sampling resolution is ~2.5e-4 of chord length — the agreement is far inside it, the disagreement far outside.` +
    ` The doc's constant is presumably for the sibling combo 0100100000, which selects different chords`,
);
console.log(`    A chord that leaves its own tile can only enter a tile that shares the
    edge it crosses. So the arc restricted to a level-j sub-supertile stays
    within eps0 of that sub-supertile, with eps0 the CONSTANT above — and
    eps0 / diam(level-j sub-supertile) -> 0 like lambda^(-j/2). That is all
    (H2) is required to give.`);

// --- (H3) tile diameter vs patch diameter ---------------------------------

console.log('\n  (H3) shrinking scale: max tile diameter / patch diameter');
console.log('    | family | level | tiles | max tile diam | patch diam | ratio | ratio * lambda^(k/2) |');
console.log('    |---|---|---|---|---|---|---|');
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  let maxTile = 0;
  for (const type of leafOrder(family)) {
    const poly = leafPts(family, type);
    for (let i = 0; i < poly.length; i++) for (let j = i + 1; j < poly.length; j++) maxTile = Math.max(maxTile, dist(poly[i], poly[j]));
  }
  const ratios: number[] = [];
  for (let lv = 1; lv <= MAXG; lv++) {
    const p = patchOf(family, lv);
    let diam = 0;
    for (let i = 0; i < p.hull.length; i++) for (let j = i + 1; j < p.hull.length; j++) diam = Math.max(diam, dist(p.hull[i], p.hull[j]));
    const r = maxTile / diam;
    ratios.push(r);
    console.log(
      `    | ${pad(family, 7)} | ${lv} | ${pad(p.inst.length, 7)} | ${pad(maxTile.toFixed(5), 13)} | ${pad(diam.toFixed(4), 10)} | ${pad(r.toFixed(6), 9)} | ${pad((r * SQRT_LAMBDA ** lv).toFixed(5), 19)} |`,
    );
  }
  const decays = ratios.every((r, i) => i === 0 || r < ratios[i - 1]);
  const rate = ratios.length >= 2 ? ratios[ratios.length - 2] / ratios[ratios.length - 1] : 0;
  ok(decays, `${family}: max tile diameter / patch diameter is strictly decreasing`,
    `last ratio-of-ratios ${rate.toFixed(5)} vs sqrt(lambda) = ${SQRT_LAMBDA.toFixed(5)}`);
}

// --- (H4) every tile visited ----------------------------------------------

console.log('\n  (H4) every tile is visited (Lemma 4), re-verified here');
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  const misses: number[] = [];
  for (let lv = 1; lv <= MAX; lv++) {
    const s = strandsOf(cfg, lv);
    const tr = trace(s);
    if (tr.tilesCovered !== s.instances.length) misses.push(lv);
  }
  ok(misses.length === 0, `${cfg.id}: every tile carries arc, levels 1..${MAX}`,
    misses.length ? `missed at levels ${misses.join(', ')}` : '');
}

// ===========================================================================
// 5. THE LIMIT CONSTANTS, DERIVED SYMBOLICALLY
// ===========================================================================

heading('5. THE CONSTANTS — exact, over Q(sqrt 15)');

// --- exact rationals over BigInt ------------------------------------------
type Rat = { readonly n: bigint; readonly d: bigint };
const bgcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) { const t = x % y; x = y; y = t; }
  return x;
};
function rat(n: bigint, d: bigint = 1n): Rat {
  if (d === 0n) throw new Error('rational with zero denominator');
  if (d < 0n) { n = -n; d = -d; }
  const g = bgcd(n, d) || 1n;
  return { n: n / g, d: d / g };
}
const R0 = rat(0n);
const R1 = rat(1n);
const radd = (x: Rat, y: Rat) => rat(x.n * y.d + y.n * x.d, x.d * y.d);
const rsub = (x: Rat, y: Rat) => rat(x.n * y.d - y.n * x.d, x.d * y.d);
const rmul = (x: Rat, y: Rat) => rat(x.n * y.n, x.d * y.d);
const rdiv = (x: Rat, y: Rat) => rat(x.n * y.d, x.d * y.n);
const rIsZero = (x: Rat) => x.n === 0n;
const rStr = (x: Rat) => (x.d === 1n ? `${x.n}` : `${x.n}/${x.d}`);
const rNum = (x: Rat) => Number(x.n) / Number(x.d);

// --- exact elements of Q(sqrt 15) -----------------------------------------
const DD = 15n;
const DDn = Number(DD);
type Fld = { readonly a: Rat; readonly b: Rat }; // a + b sqrt(15)
const fld = (a: Rat, b: Rat = R0): Fld => ({ a, b });
const fInt = (n: number): Fld => fld(rat(BigInt(n)));
const F0 = fInt(0);
const F1 = fInt(1);
const fadd = (x: Fld, y: Fld) => fld(radd(x.a, y.a), radd(x.b, y.b));
const fsub = (x: Fld, y: Fld) => fld(rsub(x.a, y.a), rsub(x.b, y.b));
const fmul = (x: Fld, y: Fld) =>
  fld(radd(rmul(x.a, y.a), rmul(rat(DD), rmul(x.b, y.b))), radd(rmul(x.a, y.b), rmul(x.b, y.a)));
function fdiv(x: Fld, y: Fld): Fld {
  const den = rsub(rmul(y.a, y.a), rmul(rat(DD), rmul(y.b, y.b)));
  if (rIsZero(den)) throw new Error('division by zero in Q(sqrt 15)');
  return fld(
    rdiv(rsub(rmul(x.a, y.a), rmul(rat(DD), rmul(x.b, y.b))), den),
    rdiv(rsub(rmul(x.b, y.a), rmul(x.a, y.b)), den),
  );
}
const fIsZero = (x: Fld) => rIsZero(x.a) && rIsZero(x.b);
const fNum = (x: Fld) => rNum(x.a) + rNum(x.b) * Math.sqrt(DDn);
function fStr(x: Fld): string {
  if (rIsZero(x.b)) return rStr(x.a);
  const neg = x.b.n < 0n;
  const mag = neg ? rat(-x.b.n, x.b.d) : x.b;
  const coef = mag.n === 1n && mag.d === 1n ? '' : `${rStr(mag)} `;
  const tail = `${coef}sqrt(15)`;
  if (rIsZero(x.a)) return `${neg ? '-' : ''}${tail}`;
  return `${rStr(x.a)} ${neg ? '-' : '+'} ${tail}`;
}

// --- the substitution matrix ----------------------------------------------
const tIdx = new Map(TYPES.map((t, i) => [t, i]));
const SUB: number[][] = TYPES.map(() => TYPES.map(() => 0));
for (let j = 0; j < TYPES.length; j++) {
  for (const child of SUPER_RULES[TYPES[j]]) {
    if (child === 'null') continue;
    SUB[tIdx.get(child as TileTypeId) as number][j] += 1;
  }
}
console.log('  substitution matrix M[i][j] = # children of type i in a supertile of type j');
console.log(`         ${TYPES.map((t) => pad(t.slice(0, 6), 7)).join('')}`);
TYPES.forEach((t, i) => console.log(`  ${pad(t, 7)}${SUB[i].map((v) => pad(v, 7)).join('')}`));

// --- characteristic polynomial, exactly over Q (Faddeev-LeVerrier) ---------
function charPoly(A: number[][]): Rat[] {
  const N = A.length;
  const Ar = A.map((r) => r.map((v) => rat(BigInt(v))));
  let Mk: Rat[][] = Ar.map((_, i) => Ar.map((_, j) => (i === j ? R1 : R0)));
  const coeffs: Rat[] = [R1];
  for (let k = 1; k <= N; k++) {
    const P = Ar.map((_, i) =>
      Ar.map((_, j) => {
        let s = R0;
        for (let t = 0; t < N; t++) s = radd(s, rmul(Ar[i][t], Mk[t][j]));
        return s;
      }),
    );
    let tr = R0;
    for (let i = 0; i < N; i++) tr = radd(tr, P[i][i]);
    const c = rdiv(rat(-tr.n, tr.d), rat(BigInt(k)));
    coeffs.push(c);
    Mk = P.map((r, i) => r.map((v, j) => (i === j ? radd(v, c) : v)));
  }
  return coeffs;
}
const cp = charPoly(SUB);
const allInt = cp.every((c) => c.d === 1n);
ok(allInt, 'the characteristic polynomial has integer coefficients (exact BigInt arithmetic)');
const polyStr = cp
  .map((c, i) => {
    const p = cp.length - 1 - i;
    if (rIsZero(c)) return null;
    const sign = c.n < 0n ? '-' : i === 0 ? '' : '+';
    const mag = c.n < 0n ? -c.n : c.n;
    const m = mag === 1n && p > 0 ? '' : `${mag}`;
    return `${sign} ${m}${p === 0 ? '' : p === 1 ? 'x' : `x^${p}`}`;
  })
  .filter(Boolean)
  .join(' ');
console.log(`\n  char poly: ${polyStr}`);
// factor it: the computed coefficients are exactly those of x^5 (x-1)(x+1)(x^2-8x+1)
const FACT = [1n, -8n, 0n, 8n, -1n, 0n, 0n, 0n, 0n, 0n];
ok(
  cp.length === FACT.length && cp.every((c, i) => c.d === 1n && c.n === FACT[i]),
  'char poly = x^5 (x - 1)(x + 1)(x^2 - 8x + 1), i.e. eigenvalues 0^5, 1, -1, 4 +- sqrt(15)',
);
console.log(`  so the Perron eigenvalue is exactly lambda = 4 + sqrt(15) = ${LAMBDA.toFixed(12)},`);
console.log(`  its Galois conjugate 4 - sqrt(15) = ${(4 - Math.sqrt(15)).toFixed(12)} is its reciprocal`);
console.log(`  (the product of the roots of x^2 - 8x + 1 is 1), and the LINEAR inflation`);
console.log(`  factor is sqrt(lambda) = ${SQRT_LAMBDA.toFixed(12)}.`);

// --- Perron right eigenvector, exactly ------------------------------------
const lam: Fld = fld(rat(4n), R1);
const Aug: Fld[][] = SUB.map((row, i) => row.map((v, j) => (i === j ? fsub(fInt(v), lam) : fInt(v))));
const n9 = TYPES.length;
const pivots: number[] = [];
let row = 0;
for (let c = 0; c < n9 && row < n9; c++) {
  let p = -1;
  for (let i = row; i < n9; i++) if (!fIsZero(Aug[i][c])) { p = i; break; }
  if (p < 0) continue;
  const tmp = Aug[row]; Aug[row] = Aug[p]; Aug[p] = tmp;
  const inv = Aug[row][c];
  for (let j = 0; j < n9; j++) Aug[row][j] = fdiv(Aug[row][j], inv);
  for (let i = 0; i < n9; i++) {
    if (i === row) continue;
    const f = Aug[i][c];
    if (fIsZero(f)) continue;
    for (let j = 0; j < n9; j++) Aug[i][j] = fsub(Aug[i][j], fmul(f, Aug[row][j]));
  }
  pivots.push(c);
  row++;
}
const freeCols = [...Array(n9).keys()].filter((c) => !pivots.includes(c));
ok(freeCols.length === 1, `the lambda-eigenspace is 1-dimensional (rank ${row} of ${n9})`);
const fc = freeCols[0];
const vRaw: Fld[] = new Array(n9).fill(F0);
vRaw[fc] = F1;
for (let i = 0; i < pivots.length; i++) vRaw[pivots[i]] = fsub(F0, Aug[i][fc]);
let vsum = F0;
for (const x of vRaw) vsum = fadd(vsum, x);
const V = vRaw.map((x) => fdiv(x, vsum));
let eigenOk = true;
for (let i = 0; i < n9; i++) {
  let s = F0;
  for (let j = 0; j < n9; j++) s = fadd(s, fmul(fInt(SUB[i][j]), V[j]));
  if (!fIsZero(fsub(s, fmul(lam, V[i])))) eigenOk = false;
}
ok(eigenOk, 'M v = lambda v holds EXACTLY in Q(sqrt 15) (not to within a tolerance)');
let vtot = F0;
for (const x of V) vtot = fadd(vtot, x);
ok(fIsZero(fsub(vtot, F1)), 'the normalised eigenvector sums to exactly 1');
console.log('\n  Perron right eigenvector = limiting frequency of each supertile type:');
TYPES.forEach((t, i) => console.log(`    ${pad(t, 7)}  ${pad(fStr(V[i]), 22)}  = ${fNum(V[i]).toFixed(12)}`));

// --- segments per tile, exactly --------------------------------------------
for (const key of KEYS) {
  const cfg = CONFIGS[key];
  const sel = new Set(cfg.subset);
  const chordsOfLeaf = (t: TileTypeId): number => {
    const d = connectionPoints(cfg.family, t, sel).length;
    return d >= 2 && d % 2 === 0 ? d / 2 : 0;
  };
  const leafChords: Record<string, number> = {};
  for (const t of leafOrder(cfg.family)) leafChords[t] = chordsOfLeaf(t);
  const chordsOfType = (t: TileTypeId): number =>
    t === 'Gamma' && cfg.family !== 'hex' ? leafChords.Gamma1 + leafChords.Gamma2 : leafChords[t] ?? 0;
  const leavesOfType = (t: TileTypeId): number => (t === 'Gamma' && cfg.family !== 'hex' ? 2 : 1);

  let num = F0;
  let den = F0;
  for (let i = 0; i < n9; i++) {
    num = fadd(num, fmul(fInt(chordsOfType(TYPES[i])), V[i]));
    den = fadd(den, fmul(fInt(leavesOfType(TYPES[i])), V[i]));
  }
  const spt = fdiv(num, den);
  console.log(`\n  ${cfg.id}`);
  console.log(`    chords per supertile type: ${TYPES.map((t) => `${t.slice(0, 3)}=${chordsOfType(t)}`).join(' ')}`);
  console.log(`    (chords . v) = ${fStr(num)}`);
  console.log(`    (leaves . v) = ${fStr(den)}`);
  console.log(`    segments per tile -> ${fStr(spt)} = ${fNum(spt).toFixed(12)}`);
  console.log('\n    | level | tiles | segments | segments/tile | tile ratio |');
  console.log('    |---|---|---|---|---|');
  let prevTiles = 0;
  let measured = 0;
  for (let lv = 1; lv <= MAX; lv++) {
    const s = strandsOf(cfg, lv);
    measured = s.segs.length / s.instances.length;
    console.log(
      `    | ${lv} | ${pad(s.instances.length, 7)} | ${pad(s.segs.length, 8)} | ${pad(measured.toFixed(6), 13)} | ${pad(prevTiles ? (s.instances.length / prevTiles).toFixed(6) : '—', 10)} |`,
    );
    prevTiles = s.instances.length;
  }
  ok(
    Math.abs(measured - fNum(spt)) < 5e-3,
    `${cfg.id}: measured segments/tile agrees with the exact eigenvector value`,
    `measured ${measured.toFixed(6)} vs exact ${fNum(spt).toFixed(9)}`,
  );
  if (MAX >= 3) {
    const tileRatio = prevTiles / strandsOf(cfg, MAX - 1).instances.length;
    ok(
      Math.abs(tileRatio - LAMBDA) < 5e-3,
      `${cfg.id}: tile growth factor -> 4 + sqrt(15) = ${LAMBDA.toFixed(9)}`,
      `level ${MAX}/${MAX - 1} ratio ${tileRatio.toFixed(6)}`,
    );
  }
}

console.log(`
  HAUSDORFF DIMENSION OF THE LIMIT IMAGE = 2. Under an exhausting address the
  image of the limit map is the whole plane; under a non-exhausting one it is
  a closed region of positive Lebesgue measure (it contains every patch, and
  patch areas grow like lambda^k times the tile area). Either way it is a
  planar set of positive measure, and any such set has Hausdorff dimension 2.
  This is a citation, not a computation: the substitution's own similarity
  dimension is not being used, and could not be, because the supertiles are
  not exact similarity images of one another.

  For contrast, the BOUNDARY of a supertile is a genuine fractal. The outline
  edge counts measured in section 3a grow by a factor tending to about 4.236
  per level, against a linear inflation of sqrt(lambda) = ${SQRT_LAMBDA.toFixed(6)}, giving a
  boundary dimension of about ${(Math.log(4.2361) / Math.log(SQRT_LAMBDA)).toFixed(3)}. That is a MEASUREMENT at the levels
  reached, not a theorem, and it is not needed anywhere above.`);

// ===========================================================================

heading('SUMMARY — what is proved, what is checked, what is assumed');
console.log(`  PROVED for all k, no level bound:
    * segment-key containment of the child arc in the parent arc, because
      E_k . Ts_k[slot] = E_{k-1} is an identity of exact ZAffines;
    * Lemma A: a persistent outline edge makes the union miss an open set,
      given the exact edge-to-edge check;
    * Lemma B: the collar inequality, for arbitrary compact sets;
    * lambda = 4 + sqrt(15) is the Perron eigenvalue, from the exact integer
      characteristic polynomial x^5 (x-1)(x+1)(x^2 - 8x + 1);
    * the Perron eigenvector and both segments-per-tile constants, exactly in
      Q(sqrt 15), verified by an exact eigen-equation rather than a tolerance.

  REFUTED (each by an exact computation, not an estimate):
    * the naive Hilbert nesting — a level-j sub-supertile does NOT in general
      occupy one interval of the level-k arc. It is entered exactly arcs(T)
      times, T its type: Gamma 5, Sigma 5, Delta 4, Theta 3, Lambda 3, Xi 2,
      Pi 2, Phi 2, Psi 1. Only 3 of 8 top-level children are contiguous, and
      they are exactly the three Psi children. Every argument that assumed
      the naive nesting has to be redone with the bounded-re-entry version.
    * the idea that runs are a fixed fraction of a sub-supertile. The
      smallest arc of a level-j supertile is O(lambda^(-j)) of its segments.
    * that whole-plane exhaustion needs an address through non-Psi supertile
      types (fass-proof/13-nesting-limit.ts). A varying address inside Psi
      buries the seed, keeping every approximant a single arc, so the
      Delta-plus-merge route of docs/FASS_PROOF.md §4.5 is not needed.
    * that the spectre chord excursion is (2 - sqrt 3)/4 for THIS combination
      (docs/FASS_PROOF.md §4.2). For 0101000000 it is (2 sqrt 3 - 3)/8.

  CHECKED at levels <= ${MAX} (arcs) / <= ${MAXG} (geometry), NOT proved for all k:
    * contiguity of the child sub-path along the Psi chain;
    * arcs(T) being level-independent, and every sub-supertile being entered
      exactly arcs(its type) times (hypothesis H1) with no starved
      sub-supertile (hypothesis H5);
    * the slot visit sequence and its period-2 behaviour, hence two-sided
      growth;
    * the constant-slot seed edge staying frozen on the outline;
    * a Psi-only varying address burying the seed, and its inradius growth;
    * max tile diameter / patch diameter decaying like lambda^(-k/2).

  OPEN, EVEN GIVEN L3:
    * that the per-block collar gaps of Lemma B sum to infinity. Each is
      strictly positive and they visibly grow with the patches, but nothing
      here bounds them below. Without that, exhaustion is "the inradius is
      strictly increasing", not "the inradius diverges".

  ASSUMED / CITED:
    * L3 — level-independence of the substitution's combinatorial adjacency.
      Everything in the "checked" list is a finite combinatorial statement
      that L3 promotes to all levels. Without L3 they are statements about
      the levels actually computed.
    * The Arzela-Ascoli / modulus-of-continuity argument for space-filling
      curves, whose hypotheses H1-H5 are what this script checks.
    * A planar set of positive Lebesgue measure has Hausdorff dimension 2.

  EXPLICITLY NOT CLAIMED:
    * that the LIMIT curve is self-avoiding. It cannot be. Self-avoidance in
      FASS is a property of the finite approximants.
    * that the bi-infinite polygonal curve gamma IS the space-filling curve.
      gamma has Hausdorff dimension 1; the space-filling curve is the
      rescaled limit of the approximants. Two different objects.`);

console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
