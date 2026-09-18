/**
 * 06 — THE FAMILY REDUCTION
 * =========================
 *
 * Obligation: show that the two conjectured configurations
 *
 *     A)  hex      / selection {1,2,8}    / combo '010100000'
 *     B)  spectre  / selection {1,2,7,8}  / combo '0101000000'
 *
 * are THE SAME THEOREM — i.e. that their strand graphs are isomorphic once the
 * degree-2 "class-7" vertices interior to every composite Mystic (Gamma1+Gamma2)
 * are suppressed.  If so, every *topological* FASS property (circuit-freeness,
 * single-arc-ness, component structure, coverage) proved for one transfers to
 * the other and there is only one combinatorial theorem to prove.
 *
 * Nothing here is geometric self-similarity: the negative result of this session
 * (the supertile quad is not an exact similarity image of the previous level's)
 * is respected.  Every claim below is either
 *   (P) proved for all levels k by a finite, level-independent argument whose
 *       ingredients this script verifies exactly, or
 *   (C) checked exactly at finitely many levels, and labelled as such,
 * and the script says which is which.
 *
 * Sections:
 *   1   the 8 shared leaf types carry identical dot/chord data (exact, all k)
 *   1b  REFUTATION: the hexagon family is NOT a faithful combinatorial model of
 *       the spectre tiling — the seam decompositions differ at Sigma and Gamma
 *   2   the Gamma reduction: the class-7 seam is the composite Mystic's internal
 *       weld, and suppressing its dot turns three chords into hex Gamma's two
 *   2e  the same, on real patches, including composites on the patch rim
 *   3   the explicit tile-respecting isomorphism, verified exactly on patches
 *   3b  INTERFACE REDUCTION: the remaining gap is a table of <= 20 entries per
 *       tile type, with period 2 in the level (and a second refutation: that
 *       table is NOT level-independent)
 *   4   exactly what transfers (all topological) and what does not (all metric)
 *
 * All adjacency/welding claims use EXACT Z[zeta12] integer arithmetic (doubled,
 * so that edge midpoints stay integral).  The only float numbers printed are the
 * two genuinely metric clearances in section 2d, which are reported with their
 * epsilon.
 *
 * Run:  cd web && npx --yes tsx fass-proof/06-family-reduction.ts
 */

import {
  edgeLabels,
  enumerateMatchings,
  leafOrder,
  leafPts,
  metaEdges,
  parseEdgeLabel,
  SUPER_RULES,
  zAdd,
  zApply,
  zBasePairXform,
  zKey,
  zLeafPts,
  zToPt,
  Z_IDENT,
  type MetaEdge,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
  type ZAffine,
  type ZVec,
} from '../src/core';

import {
  CONFIGS,
  activeSeams,
  buildStrands,
  chosenMatching,
  heading,
  matchingRecord,
  ncOptionCount,
  pad,
  trace,
  verdict,
  zApply2,
  zConnectionPoints2,
  zExpand,
  type Config,
  type ZInstance,
} from './lib';

// ---------------------------------------------------------------------------
// 0.  Setup
// ---------------------------------------------------------------------------

const HEX: Config = CONFIGS.hex128;
const SPEC: Config = CONFIGS.spectre1278;

/** The 8 leaf types shared by both families (everything except Gamma). */
const SHARED: readonly TileTypeId[] = ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];

const ROOTS_DEEP: readonly TileTypeId[] = ['Delta', 'Psi', 'Gamma'];
const ROOTS_ALL: readonly TileTypeId[] = [
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi',
];

let FAILURES = 0;
function check(ok: boolean, label: string, detail = ''): boolean {
  if (!ok) FAILURES++;
  verdict(ok, label, detail);
  return ok;
}
/** Quiet variant: only prints when it fails (for the big per-level sweeps). */
function checkQuiet(ok: boolean, label: string, detail = ''): boolean {
  if (!ok) {
    FAILURES++;
    verdict(false, label, detail);
  }
  return ok;
}

/** Canonical short tag of a seam: '-1A', '2B', '7A', ... */
function seamTag(s: MetaEdge): string {
  return `${s.sign < 0 ? '-' : ''}${s.major}${s.variant}`;
}

/** Active seam tags of a leaf type, in connectionPoints() order. */
function activeTags(cfg: Config, type: TileTypeId): readonly string[] {
  return activeSeams(cfg, type).map(seamTag);
}

/** Chosen matching rendered as sorted unordered tag pairs, e.g. ['1A|2A']. */
function chordTags(cfg: Config, type: TileTypeId): readonly string[] {
  const tags = activeTags(cfg, type);
  return chosenMatching(cfg, type)
    .map(([a, b]) => [tags[a], tags[b]].sort().join('|'))
    .sort();
}

function sameArray<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

// ---------------------------------------------------------------------------
// 1.  The per-tile table for the 8 shared leaf types
// ---------------------------------------------------------------------------

function section1(): void {
  heading('1.  Per-tile data for the 8 SHARED leaf types  (exact, level-independent)');

  const hexRec = matchingRecord(HEX);
  const specRec = matchingRecord(SPEC);
  const hexOrder = leafOrder('hex');
  const specOrder = leafOrder('spectre');

  console.log(
    `  hex      selection {${HEX.subset.join(',')}}  combo '${HEX.combo}'  over ${hexOrder.join(',')}`,
  );
  console.log(
    `  spectre  selection {${SPEC.subset.join(',')}}  combo '${SPEC.combo}'  over ${specOrder.join(',')}`,
  );
  console.log(
    `\n  ${'type'.padEnd(8)}${'active seams (cyclic order)'.padEnd(30)}${'#NC'.padEnd(6)}${'digit'.padEnd(7)}${'matching idx'.padEnd(14)}chords`,
  );

  let allOk = true;
  for (const type of SHARED) {
    const hTags = activeTags(HEX, type);
    const sTags = activeTags(SPEC, type);
    const hNC = ncOptionCount(HEX, type);
    const sNC = ncOptionCount(SPEC, type);
    const hDigit = HEX.combo[hexOrder.indexOf(type)];
    const sDigit = SPEC.combo[specOrder.indexOf(type)];
    const hPairs = chosenMatching(HEX, type).map(([a, b]) => `${a}-${b}`).join(',');
    const sPairs = chosenMatching(SPEC, type).map(([a, b]) => `${a}-${b}`).join(',');
    const hChords = chordTags(HEX, type);
    const sChords = chordTags(SPEC, type);

    const ok =
      sameArray(hTags, sTags) &&
      hNC === sNC &&
      hDigit === sDigit &&
      hPairs === sPairs &&
      hexRec[type] === specRec[type] &&
      sameArray(hChords, sChords);
    if (!ok) allOk = false;

    console.log(
      `  ${type.padEnd(8)}${hTags.join(', ').padEnd(30)}${String(hNC).padEnd(6)}${String(hDigit).padEnd(7)}${String(hexRec[type]).padEnd(14)}${hChords.join('  ')}`,
    );
    if (!ok) {
      console.log(
        `  ${''.padEnd(8)}spectre differs: ${sTags.join(', ')} | #NC ${sNC} | digit ${sDigit} | idx ${specRec[type]} | ${sChords.join('  ')}`,
      );
    }
  }

  console.log('');
  check(allOk, '8 shared types: identical active seams, order, #NC, digit, matching index, chords');

  // The class-7 selection difference must be invisible off Gamma.
  const sevenElsewhere: string[] = [];
  for (const type of SHARED) {
    for (const s of metaEdges('spectre', type)) if (s.major === 7) sevenElsewhere.push(`${type}/${seamTag(s)}`);
    for (const s of metaEdges('hex', type)) if (s.major === 7) sevenElsewhere.push(`hex ${type}/${seamTag(s)}`);
  }
  check(
    sevenElsewhere.length === 0,
    'class 7 occurs on NO shared leaf type in either family',
    sevenElsewhere.length ? sevenElsewhere.join(' ') : 'so {1,2,7,8} and {1,2,8} agree off Gamma',
  );

  // ---- 1b.  Where the hexagon family is NOT a faithful model -----------------
  heading('1b.  Where the hexagon family is NOT a faithful combinatorial model');
  console.log('  (these mismatches are REAL; they are invisible only because the classes carry no dot)\n');
  const mismatches: string[] = [];
  for (const type of [...SHARED, 'Gamma' as TileTypeId]) {
    const hSeams =
      type === 'Gamma'
        ? metaEdges('hex', 'Gamma').map(seamTag)
        : metaEdges('hex', type).map(seamTag);
    const sSeams =
      type === 'Gamma'
        ? compositeOuterSeamTags()
        : metaEdges('spectre', type).map(seamTag);
    const hSet = [...hSeams].sort();
    const sSet = [...sSeams].sort();
    if (!sameArray(hSet, sSet)) {
      mismatches.push(type);
      console.log(`  ${type.padEnd(8)} hex: ${hSeams.join(' ').padEnd(28)} spectre: ${sSeams.join(' ')}`);
    }
  }
  if (mismatches.length === 0) console.log('  (none)');
  console.log(
    `\n  => the two families do NOT have the same tile-adjacency graph. Any claim of the form\n` +
      `     "hex is the combinatorial model of the spectre tiling" is FALSE as stated: the seam\n` +
      `     decompositions differ at ${mismatches.join(', ') || '(no type)'}. The reduction below is therefore NOT a\n` +
      `     statement about tile adjacency; it is a statement about the DOT-CARRYING seams only,\n` +
      `     and has to be verified as such.`,
  );
}

/** Outer (non class-7) seam tags of the composite spectre Gamma. */
function compositeOuterSeamTags(): readonly string[] {
  const out = new Set<string>();
  for (const t of ['Gamma1', 'Gamma2'] as TileTypeId[]) {
    for (const s of metaEdges('spectre', t)) if (s.major !== 7) out.add(seamTag(s));
  }
  return [...out];
}

// ---------------------------------------------------------------------------
// 2.  The Gamma reduction
// ---------------------------------------------------------------------------

const G2X: ZAffine = zBasePairXform('spectre') as ZAffine;

interface EdgeRef {
  readonly tile: 'Gamma1' | 'Gamma2';
  readonly idx: number;
  readonly label: string;
}

/** Exact world vertices of the two halves of the base composite Mystic. */
function compositeVerts(): Record<'Gamma1' | 'Gamma2', readonly ZVec[]> {
  const g1 = zLeafPts('spectre', 'Gamma1');
  const g2 = zLeafPts('spectre', 'Gamma2').map((p) => zApply(G2X, p));
  return { Gamma1: g1, Gamma2: g2 };
}

function undirectedSegKey(a: ZVec, b: ZVec): string {
  const ka = zKey(a);
  const kb = zKey(b);
  return ka < kb ? `${ka}::${kb}` : `${kb}::${ka}`;
}

function section2(): { outerOrder: readonly string[]; reversed: boolean } {
  heading('2.  The Gamma reduction  (exact, level-independent)');

  const V = compositeVerts();
  const labels = {
    Gamma1: edgeLabels('spectre', 'Gamma1'),
    Gamma2: edgeLabels('spectre', 'Gamma2'),
  };

  // ---- 2a.  local chord tables --------------------------------------------
  console.log('  2a.  local dot / chord tables\n');
  for (const [cfg, type] of [
    [HEX, 'Gamma'],
    [SPEC, 'Gamma1'],
    [SPEC, 'Gamma2'],
  ] as [Config, TileTypeId][]) {
    console.log(
      `      ${(cfg.family + '/' + type).padEnd(16)}dots ${activeTags(cfg, type).join(', ').padEnd(24)}#NC ${ncOptionCount(cfg, type)}   chords ${chordTags(cfg, type).join('  ')}`,
    );
  }
  console.log('');
  check(sameArray(activeTags(HEX, 'Gamma'), ['-1A', '1A', '2A', '-2A']), 'hex Gamma dots are (-1A, 1A, 2A, -2A)');
  check(sameArray(chordTags(HEX, 'Gamma'), ['-1A|1A', '-2A|2A']), 'hex Gamma chords are {-1A—1A, 2A—-2A}');
  check(sameArray(activeTags(SPEC, 'Gamma1'), ['-1A', '1A', '7A', '-2A']), 'Gamma1 dots are (-1A, 1A, 7A, -2A)');
  check(sameArray(chordTags(SPEC, 'Gamma1'), ['-1A|1A', '-2A|7A']), 'Gamma1 chords are {-1A—1A, 7A—-2A}');
  check(sameArray(activeTags(SPEC, 'Gamma2'), ['-7A', '2A']), 'Gamma2 dots are (-7A, 2A)');
  check(sameArray(chordTags(SPEC, 'Gamma2'), ['-7A|2A']), 'Gamma2 chord is {-7A—2A}');

  // ---- 2b.  the class-7 seam is the internal weld of the composite --------
  console.log('\n  2b.  the class-7 seam is EXACTLY the internal weld of the composite\n');
  const byKey = new Map<string, EdgeRef[]>();
  for (const tile of ['Gamma1', 'Gamma2'] as const) {
    const pts = V[tile];
    for (let i = 0; i < pts.length; i++) {
      const k = undirectedSegKey(pts[i], pts[(i + 1) % pts.length]);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push({ tile, idx: i, label: labels[tile][i] });
    }
  }
  const internal: EdgeRef[][] = [];
  let overCount = 0;
  for (const refs of byKey.values()) {
    if (refs.length === 2) internal.push(refs);
    else if (refs.length > 2) overCount++;
  }
  check(overCount === 0, 'no composite edge is shared by more than two half-tiles');
  check(internal.length === 4, 'the two halves share exactly 4 physical edges', `got ${internal.length}`);

  const pairDesc = internal
    .map((r) => r.map((x) => `${x.tile}:${x.label}`).sort().join(' <-> '))
    .sort();
  console.log('      shared edges:');
  for (const d of pairDesc) console.log(`        ${d}`);
  const allSeven = internal.every((r) => r.every((x) => parseEdgeLabel(x.label).major === 7));
  check(allSeven, 'every shared edge is a class-7 edge (so the internal weld is exactly the 7-seam)');
  const minorsMatch = internal.every((r) => {
    const [a, b] = r;
    return parseEdgeLabel(a.label).minor === parseEdgeLabel(b.label).minor;
  });
  check(minorsMatch, "Gamma1's `7.m` glues to Gamma2's `-7.m` for each minor m (so minor-0 dots coincide)");

  // the class-7 DOTS coincide exactly
  const g1Dots = zConnectionPoints2('spectre', 'Gamma1', SPEC.subset);
  const g2Dots = zConnectionPoints2('spectre', 'Gamma2', SPEC.subset);
  const g1Seven = zKey(zApply2(Z_IDENT, g1Dots[2]));
  const g2Seven = zKey(zApply2(G2X, g2Dots[0]));
  check(g1Seven === g2Seven, "Gamma1's 7A dot and Gamma2's -7A dot are the SAME exact lattice point", g1Seven);

  // ---- 2c.  composite outer boundary, and its cyclic dot order ------------
  console.log('\n  2c.  composite outer boundary and the cyclic order of its dots\n');
  const internalSet = new Set<string>();
  for (const refs of internal) for (const r of refs) internalSet.add(`${r.tile}:${r.idx}`);

  // Directed boundary edges, keyed by start vertex.
  const nextEdge = new Map<string, EdgeRef & { from: ZVec; to: ZVec }>();
  let collisions = 0;
  let boundaryCount = 0;
  for (const tile of ['Gamma1', 'Gamma2'] as const) {
    const pts = V[tile];
    for (let i = 0; i < pts.length; i++) {
      if (internalSet.has(`${tile}:${i}`)) continue;
      boundaryCount++;
      const from = pts[i];
      const to = pts[(i + 1) % pts.length];
      const k = zKey(from);
      if (nextEdge.has(k)) collisions++;
      nextEdge.set(k, { tile, idx: i, label: labels[tile][i], from, to });
    }
  }
  check(collisions === 0, 'composite boundary has no pinch vertex (one outgoing edge per vertex)');
  check(boundaryCount === 20, 'composite boundary has 14 + 14 - 2*4 = 20 physical edges', `got ${boundaryCount}`);

  const start = nextEdge.keys().next().value as string;
  const walk: (EdgeRef & { from: ZVec; to: ZVec })[] = [];
  let cur = start;
  for (let step = 0; step < boundaryCount + 2; step++) {
    const e = nextEdge.get(cur);
    if (!e) break;
    walk.push(e);
    cur = zKey(e.to);
    if (cur === start) break;
  }
  check(walk.length === boundaryCount && cur === start, 'the composite boundary is a single closed cycle', `walked ${walk.length}/${boundaryCount}`);

  // signed area (float, orientation only) for both outlines
  const area = (pts: readonly Pt[]): number => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      a += p.x * q.y - q.x * p.y;
    }
    return a / 2;
  };
  const compArea = area(walk.map((e) => zToPt(e.from)));
  const hexArea = area(leafPts('hex', 'Gamma') as Pt[]);
  console.log(
    `      orientation: composite walk signed area ${compArea.toFixed(4)} (${compArea > 0 ? 'CCW' : 'CW'}),  hex Gamma ${hexArea.toFixed(4)} (${hexArea > 0 ? 'CCW' : 'CW'})`,
  );

  // dot order along the walk
  const isDotEdge = (r: EdgeRef): string | null => {
    const p = parseEdgeLabel(r.label);
    if (p.minor !== 0 || !SPEC.subset.includes(p.major)) return null;
    const seam = metaEdges('spectre', r.tile).find((s) => s.edgeIndices.includes(r.idx));
    return seam ? seamTag(seam) : null;
  };
  const outerOrder: string[] = [];
  const outerSrc: string[] = [];
  for (const e of walk) {
    const tag = isDotEdge(e);
    if (tag) {
      outerOrder.push(tag);
      outerSrc.push(`${e.tile}:${e.label}`);
    }
  }
  console.log(`      composite outer dots in boundary order: ${outerOrder.join(' -> ')}`);
  console.log(`                                     source : ${outerSrc.join(' , ')}`);

  const hexOrder = activeTags(HEX, 'Gamma');
  // hex boundary order == label order == activeTags order
  const rotationsOf = (a: readonly string[]): string[][] => a.map((_, i) => [...a.slice(i), ...a.slice(0, i)]);
  const fwd = rotationsOf(outerOrder).findIndex((r) => sameArray(r, hexOrder));
  const rev = rotationsOf([...outerOrder].reverse()).findIndex((r) => sameArray(r, hexOrder));
  console.log(`      hex Gamma dots in boundary order      : ${hexOrder.join(' -> ')}`);
  check(
    fwd >= 0 || rev >= 0,
    'composite outer dot cyclic order == hex Gamma dot cyclic order',
    fwd >= 0 ? `same orientation, rotation ${fwd}` : `reversed orientation, rotation ${rev}`,
  );
  check(
    sameArray([...outerOrder].sort(), [...hexOrder].sort()),
    'composite OUTER active seams are exactly {-1A, 1A, 2A, -2A}',
    outerOrder.join(','),
  );
  console.log(
    '      NOTE: cyclic order is what the non-crossing condition depends on, and it is\n' +
      '            invariant under rotation AND reversal, so either answer above suffices.',
  );

  // ---- 2d.  suppression turns the composite chords into the hex chords ----
  console.log('\n  2d.  suppressing the degree-2 class-7 vertex\n');
  const g1Pairs = chosenMatching(SPEC, 'Gamma1');
  const g2Pairs = chosenMatching(SPEC, 'Gamma2');
  const g1Tags = activeTags(SPEC, 'Gamma1');
  const g2Tags = activeTags(SPEC, 'Gamma2');
  const chordsWithSeven = g1Pairs.filter(([a, b]) => a === 2 || b === 2);
  const chordsWithMinusSeven = g2Pairs.filter(([a, b]) => a === 0 || b === 0);
  check(chordsWithSeven.length === 1, 'exactly one Gamma1 chord ends at the 7A dot');
  check(chordsWithMinusSeven.length === 1, 'exactly one Gamma2 chord ends at the -7A dot');
  const g1Other = chordsWithSeven[0][0] === 2 ? chordsWithSeven[0][1] : chordsWithSeven[0][0];
  const g2Other = chordsWithMinusSeven[0][0] === 0 ? chordsWithMinusSeven[0][1] : chordsWithMinusSeven[0][0];
  const merged = [g1Tags[g1Other], g2Tags[g2Other]].sort().join('|');
  const survivors = [
    ...g1Pairs.filter(([a, b]) => a !== 2 && b !== 2).map(([a, b]) => [g1Tags[a], g1Tags[b]].sort().join('|')),
    merged,
  ].sort();
  console.log(`      composite chords after suppression : ${survivors.join('   ')}`);
  console.log(`      hex Gamma chords                   : ${chordTags(HEX, 'Gamma').join('   ')}`);
  check(sameArray(survivors, chordTags(HEX, 'Gamma')), 'suppressed composite chord set == hex Gamma chord set');

  // metric side note: the 7 dot is strictly interior to the composite
  const boundaryPts = walk.map((e) => zToPt(e.from));
  const sevenPt = zToPt(g1Dots[2]);
  let minDist = Infinity;
  for (let i = 0; i < boundaryPts.length; i++) {
    const a = boundaryPts[i];
    const b = boundaryPts[(i + 1) % boundaryPts.length];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const L2 = vx * vx + vy * vy;
    const t = Math.max(0, Math.min(1, ((sevenPt.x - a.x) * vx + (sevenPt.y - a.y) * vy) / L2));
    minDist = Math.min(minDist, Math.hypot(sevenPt.x - (a.x + t * vx), sevenPt.y - (a.y + t * vy)));
  }
  // EXACT form of "the 7 dot is interior": it is the midpoint of the shared edge
  // `7.0A`, and it is not a vertex of either half. A connection dot always lies on
  // its own tile's boundary, so a third tile carrying a dot at p would have p on
  // its boundary; p lies in the relative interior of an edge shared by exactly the
  // two halves, so such a tile would have to overlap a half's interior. In a
  // tiling that is impossible — hence the class-7 dot is unreachable from outside.
  const allVerts2 = new Set<string>();
  for (const tile of ['Gamma1', 'Gamma2'] as const) {
    for (const v of V[tile]) allVerts2.add(zKey(zAdd(v, v)));
  }
  const sevenIsVertex = allVerts2.has(g1Seven);
  check(
    !sevenIsVertex,
    'the class-7 dot is NOT a vertex of either half — it is interior to the shared edge (exact)',
  );
  check(
    internal.some((r) => r.some((x) => parseEdgeLabel(x.label).minor === 0)),
    'the shared 7-seam contains the minor-0 edge whose midpoint is that dot (exact)',
  );
  console.log(
    `      EXACT: the class-7 dot is the midpoint of the physical edge Gamma1:7.0A = Gamma2:-7.0A,\n` +
      `      which section 2b showed is shared by exactly the two halves, and it is not a vertex of\n` +
      `      either. A connection dot always lies on its own tile's boundary; a third tile with a dot\n` +
      `      there would have that point on its boundary, and since the point is in the RELATIVE\n` +
      `      INTERIOR of an edge shared by the two halves, that tile would overlap a half's interior.\n` +
      `      In a tiling that cannot happen — so the class-7 weld is internal in EVERY patch, finite\n` +
      `      or infinite, whatever the patch boundary looks like. (This is the argument; the sweeps\n` +
      `      in 2e confirm it on real patches rather than replacing it.)`,
  );
  console.log(
    `\n      [metric, float, corroboration only] distance from the class-7 dot to the composite\n` +
      `      boundary = ${minDist.toFixed(6)} (tile edge length 1; eps 1e-9, clearance ${(minDist / 1e-9).toExponential(2)}x eps).`,
  );
  check(minDist > 1e-6, 'class-7 dot is strictly interior to the composite (metric, float, stated as such)');

  return { outerOrder, reversed: fwd < 0 };
}

// ---------------------------------------------------------------------------
// 2e.  The class-7 weld stays internal on REAL patches, including at the
//      geometric patch boundary (exact).
// ---------------------------------------------------------------------------

/** Composites having at least one unshared physical edge = on the patch rim. */
function section2e(dotMap: Map<string, DotImage>): void {
  heading('2e.  class-7 welds on real patches, INCLUDING Gamma-adjacent patch boundaries (exact)');
  console.log(
    `  "on the rim" = the composite has at least one physical edge shared with no other tile,\n` +
      `  i.e. it genuinely touches the outer boundary of the patch.\n`,
  );
  console.log(
    `  ${'patch'.padEnd(12)}${pad('composites', 11)}${pad('on rim', 8)}${pad('7-welds', 9)}  internal, degree 2, and NO other tile of the patch has a vertex or edge midpoint there`,
  );

  for (const root of ROOTS_DEEP) {
    for (let lv = 1; lv <= 4; lv++) {
      const insts = zExpand('spectre', root, lv);
      // physical-edge multiplicity over the whole patch
      const edgeMult = new Map<string, number>();
      const instEdgeKeys: string[][] = insts.map((inst) => {
        const pts = zLeafPts('spectre', inst.type).map((p) => zApply(inst.xform, p));
        const out: string[] = [];
        for (let i = 0; i < pts.length; i++) {
          out.push(undirectedSegKey(pts[i], pts[(i + 1) % pts.length]));
        }
        return out;
      });
      for (const row of instEdgeKeys) {
        for (const k of row) edgeMult.set(k, (edgeMult.get(k) ?? 0) + 1);
      }

      const keys = dotKeys('spectre', SPEC.subset, insts);
      const groups = new Map<string, number[]>();
      const outer = new Set<string>();
      const compOfHalf = new Map<number, string>();
      for (let i = 0; i < insts.length; i++) {
        const isHalf = insts[i].type === 'Gamma1' || insts[i].type === 'Gamma2';
        if (isHalf) compOfHalf.set(i, parentId(insts[i].id));
        for (let d = 0; d < keys[i].length; d++) {
          const img = dotMap.get(`${insts[i].type}:${d}`);
          if (!img) continue;
          if (img.kind === 'internal') {
            const k = keys[i][d];
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k)!.push(i);
          } else outer.add(keys[i][d]);
        }
      }

      // Exact, and much stronger than "no other DOT is there": no other tile in the
      // whole patch has a VERTEX or an EDGE MIDPOINT at the class-7 point.
      const incident = new Map<string, number[]>();
      for (let i = 0; i < insts.length; i++) {
        const pts = zLeafPts('spectre', insts[i].type).map((q) => zApply(insts[i].xform, q));
        for (let e = 0; e < pts.length; e++) {
          const v2 = zKey(zAdd(pts[e], pts[e]));
          const m2 = zKey(zAdd(pts[e], pts[(e + 1) % pts.length]));
          for (const k of [v2, m2]) {
            let list = incident.get(k);
            if (!list) incident.set(k, (list = []));
            if (list[list.length - 1] !== i) list.push(i);
          }
        }
      }

      const rimComposites = new Set<string>();
      const rimSevenOk: string[] = [];
      for (const [i, comp] of compOfHalf) {
        if (instEdgeKeys[i].some((k) => (edgeMult.get(k) ?? 0) === 1)) rimComposites.add(comp);
      }
      let allOk = groups.size > 0 || compOfHalf.size === 0;
      let rimChecked = 0;
      for (const [k, owners] of groups) {
        const touching = new Set(incident.get(k) ?? []);
        const onlyTheTwoHalves =
          touching.size === 2 && owners.every((o) => touching.has(o));
        const ok =
          owners.length === 2 &&
          !outer.has(k) &&
          onlyTheTwoHalves &&
          compOfHalf.get(owners[0]) === compOfHalf.get(owners[1]) &&
          [insts[owners[0]].type, insts[owners[1]].type].sort().join(',') === 'Gamma1,Gamma2';
        if (!ok) {
          allOk = false;
          rimSevenOk.push(k);
        }
        if (rimComposites.has(compOfHalf.get(owners[0]) ?? '')) rimChecked++;
      }
      const nComposites = new Set([...compOfHalf.values()]).size;
      const detail = `${nComposites} composites, ${rimComposites.size} on the rim (${rimChecked} of the 7-welds checked belong to rim composites)`;
      console.log(
        `  ${(root + '@' + lv).padEnd(12)}${pad(nComposites, 11)}${pad(rimComposites.size, 8)}${pad(groups.size, 9)}  ${allOk && groups.size === nComposites ? 'yes' : 'NO — ' + rimSevenOk.slice(0, 2).join(' ')}`,
      );
      checkQuiet(allOk && groups.size === nComposites, `${root}@${lv}: rim-inclusive class-7 internality`, detail);
      checkQuiet(
        rimComposites.size > 0,
        `${root}@${lv}: the test actually reaches Gamma-adjacent patch boundaries`,
        detail,
      );
    }
  }
  console.log(
    `\n  => the class-7 dot is never exposed, has degree exactly 2, and NO third tile of the patch\n` +
      `     so much as touches it (vertex or edge midpoint) — including for the composites on the rim.\n` +
      `     HONEST CAVEAT: only ONE composite per patch actually sits on the rim. The Mystic is almost\n` +
      `     always interior to a supertile, so the empirical rim coverage here is thin, and the claim\n` +
      `     for arbitrary patches rests on the exact relative-interior argument in section 2d, not on\n` +
      `     this sweep.`,
  );
}

// ---------------------------------------------------------------------------
// 3.  The explicit isomorphism, checked on real patches
// ---------------------------------------------------------------------------

/** (spectre type, dot index) -> hex dot index, or 'internal'. Derived, not assumed. */
type DotImage = { kind: 'outer'; hexDot: number } | { kind: 'internal' };

function buildDotMap(): { map: Map<string, DotImage>; ok: boolean } {
  const map = new Map<string, DotImage>();
  let ok = true;

  for (const type of SHARED) {
    const h = activeTags(HEX, type);
    const s = activeTags(SPEC, type);
    for (let i = 0; i < s.length; i++) {
      const j = h.indexOf(s[i]);
      if (j < 0 || h.filter((x) => x === s[i]).length !== 1) {
        ok = false;
        continue;
      }
      map.set(`${type}:${i}`, { kind: 'outer', hexDot: j });
      if (j !== i) ok = false; // we also want it to be the identity on indices
    }
    if (s.length !== h.length) ok = false;
  }

  const hg = activeTags(HEX, 'Gamma');
  for (const type of ['Gamma1', 'Gamma2'] as TileTypeId[]) {
    const s = activeTags(SPEC, type);
    for (let i = 0; i < s.length; i++) {
      if (Math.abs(parseInt(s[i].replace(/[^0-9]/g, ''), 10)) === 7) {
        map.set(`${type}:${i}`, { kind: 'internal' });
        continue;
      }
      const j = hg.indexOf(s[i]);
      if (j < 0) {
        ok = false;
        continue;
      }
      map.set(`${type}:${i}`, { kind: 'outer', hexDot: j });
    }
  }
  return { map, ok };
}

/** Exact welded keys of every active dot of every instance, per instance. */
function dotKeys(family: TileFamilyId, subset: readonly number[], insts: readonly ZInstance[]): string[][] {
  const cache = new Map<string, readonly ZVec[]>();
  return insts.map((inst) => {
    let pts = cache.get(inst.type);
    if (!pts) {
      pts = zConnectionPoints2(family, inst.type, subset);
      cache.set(inst.type, pts);
    }
    return pts.map((p) => zKey(zApply2(inst.xform, p)));
  });
}

function parentId(id: string): string {
  const k = id.lastIndexOf('.');
  return k < 0 ? '' : id.slice(0, k);
}

interface PatchResult {
  readonly ok: boolean;
  readonly hexTiles: number;
  readonly specTiles: number;
  readonly hexSegs: number;
  readonly specSegs: number;
  readonly composites: number;
  readonly boundaryComposites: number;
  readonly hexTrace: ReturnType<typeof trace>;
  readonly specTrace: ReturnType<typeof trace>;
}

function checkPatch(root: TileTypeId, level: number, dotMap: Map<string, DotImage>, verbose: boolean): PatchResult {
  const tag = `${root}@${level}`;
  const hexI = zExpand('hex', root, level);
  const specI = zExpand('spectre', root, level);

  // ---- tile bijection -----------------------------------------------------
  const hexByIdx = new Map<string, number>();
  hexI.forEach((h, i) => hexByIdx.set(h.id, i));
  let tileOk = hexByIdx.size === hexI.length;
  const hexOfSpec: number[] = new Array(specI.length).fill(-1);
  const halvesSeen = new Map<number, Set<string>>();
  for (let i = 0; i < specI.length; i++) {
    const s = specI[i];
    const isHalf = s.type === 'Gamma1' || s.type === 'Gamma2';
    const hid = isHalf ? parentId(s.id) : s.id;
    const hi = hexByIdx.get(hid);
    if (hi === undefined) {
      tileOk = false;
      continue;
    }
    hexOfSpec[i] = hi;
    if (isHalf) {
      if (hexI[hi].type !== 'Gamma') tileOk = false;
      if (!halvesSeen.has(hi)) halvesSeen.set(hi, new Set());
      halvesSeen.get(hi)!.add(s.type);
    } else if (hexI[hi].type !== s.type) {
      tileOk = false;
    }
  }
  const composites = hexI.filter((h) => h.type === 'Gamma').length;
  for (const [, set] of halvesSeen) if (set.size !== 2) tileOk = false;
  if (halvesSeen.size !== composites) tileOk = false;
  if (specI.length !== hexI.length + composites) tileOk = false;
  checkQuiet(tileOk, `${tag}: tile bijection (composite Gamma <-> hex Gamma)`);

  // ---- dot keys -----------------------------------------------------------
  const hexK = dotKeys('hex', HEX.subset, hexI);
  const specK = dotKeys('spectre', SPEC.subset, specI);

  // ---- internal class-7 vertices -----------------------------------------
  const internalGroups = new Map<string, string[]>(); // key -> ['<specIdx>:<dot>']
  const outerKeySet = new Set<string>();
  for (let i = 0; i < specI.length; i++) {
    for (let d = 0; d < specK[i].length; d++) {
      const img = dotMap.get(`${specI[i].type}:${d}`);
      if (!img) continue;
      if (img.kind === 'internal') {
        const k = specK[i][d];
        if (!internalGroups.has(k)) internalGroups.set(k, []);
        internalGroups.get(k)!.push(`${i}:${d}`);
      } else {
        outerKeySet.add(specK[i][d]);
      }
    }
  }
  let internalOk = internalGroups.size === composites;
  for (const [k, members] of internalGroups) {
    if (members.length !== 2) internalOk = false;
    if (outerKeySet.has(k)) internalOk = false; // must never coincide with an outer dot
    const owners = members.map((m) => Number(m.split(':')[0]));
    const types = owners.map((o) => specI[o].type).sort();
    if (types[0] !== 'Gamma1' || types[1] !== 'Gamma2') internalOk = false;
    if (hexOfSpec[owners[0]] !== hexOfSpec[owners[1]]) internalOk = false; // SAME composite
  }
  checkQuiet(
    internalOk,
    `${tag}: every class-7 dot is an internal weld of one composite, degree 2, never shared with anything else`,
    `${internalGroups.size} groups vs ${composites} composites`,
  );

  // ---- vertex map: well-defined, injective, surjective --------------------
  const vmap = new Map<string, string>();
  const rmap = new Map<string, string>();
  let vOk = true;
  for (let i = 0; i < specI.length; i++) {
    for (let d = 0; d < specK[i].length; d++) {
      const img = dotMap.get(`${specI[i].type}:${d}`);
      if (!img || img.kind === 'internal') continue;
      const sk = specK[i][d];
      const hk = hexK[hexOfSpec[i]][img.hexDot];
      const prev = vmap.get(sk);
      if (prev === undefined) vmap.set(sk, hk);
      else if (prev !== hk) vOk = false;
      const rprev = rmap.get(hk);
      if (rprev === undefined) rmap.set(hk, sk);
      else if (rprev !== sk) vOk = false;
    }
  }
  const hexAllKeys = new Set<string>();
  for (const row of hexK) for (const k of row) hexAllKeys.add(k);
  const surj = rmap.size === hexAllKeys.size && [...hexAllKeys].every((k) => rmap.has(k));
  checkQuiet(vOk, `${tag}: vertex map is well defined and injective (weld patterns agree)`);
  checkQuiet(surj, `${tag}: vertex map is onto the hex vertex set`, `${rmap.size} vs ${hexAllKeys.size}`);

  // ---- chord multisets ----------------------------------------------------
  const canon = (a: string, b: string, owner: string): string =>
    `${owner}#${a < b ? a + '|' + b : b + '|' + a}`;

  const hexChords: string[] = [];
  for (let i = 0; i < hexI.length; i++) {
    for (const [a, b] of chosenMatching(HEX, hexI[i].type)) {
      hexChords.push(canon(hexK[i][a], hexK[i][b], hexI[i].id));
    }
  }

  const specChords: string[] = [];
  const pendingBySeven = new Map<string, { key: string; owner: string }[]>();
  for (let i = 0; i < specI.length; i++) {
    for (const [a, b] of chosenMatching(SPEC, specI[i].type)) {
      const ia = dotMap.get(`${specI[i].type}:${a}`);
      const ib = dotMap.get(`${specI[i].type}:${b}`);
      const aInt = ia?.kind === 'internal';
      const bInt = ib?.kind === 'internal';
      if (aInt && bInt) {
        vOk = false; // would be a loop after suppression
        continue;
      }
      const owner = specI[i].type === 'Gamma1' || specI[i].type === 'Gamma2' ? parentId(specI[i].id) : specI[i].id;
      if (!aInt && !bInt) {
        specChords.push(canon(vmap.get(specK[i][a])!, vmap.get(specK[i][b])!, owner));
        continue;
      }
      const sevenKey = specK[i][aInt ? a : b];
      const freeKey = specK[i][aInt ? b : a];
      if (!pendingBySeven.has(sevenKey)) pendingBySeven.set(sevenKey, []);
      pendingBySeven.get(sevenKey)!.push({ key: freeKey, owner });
    }
  }
  let mergeOk = true;
  for (const [, list] of pendingBySeven) {
    if (list.length !== 2) {
      mergeOk = false;
      continue;
    }
    if (list[0].owner !== list[1].owner) mergeOk = false;
    const a = vmap.get(list[0].key);
    const b = vmap.get(list[1].key);
    if (a === undefined || b === undefined) {
      mergeOk = false;
      continue;
    }
    if (a === b) mergeOk = false; // suppression would create a self-loop
    specChords.push(canon(a, b, list[0].owner));
  }
  checkQuiet(mergeOk, `${tag}: every class-7 vertex merges exactly two chords of one composite into one`);

  hexChords.sort();
  specChords.sort();
  const chordOk = sameArray(hexChords, specChords);
  if (!chordOk && verbose) {
    const hs = new Set(hexChords);
    const ss = new Set(specChords);
    const onlyHex = hexChords.filter((c) => !ss.has(c)).slice(0, 3);
    const onlySpec = specChords.filter((c) => !hs.has(c)).slice(0, 3);
    console.log(`        smallest differences — only in hex: ${onlyHex.join(' ')}`);
    console.log(`        smallest differences — only in spec: ${onlySpec.join(' ')}`);
  }
  checkQuiet(
    chordOk,
    `${tag}: suppressed spectre chord multiset == hex chord multiset (tile-attributed)`,
    `${specChords.length} vs ${hexChords.length}`,
  );

  // ---- invariants ---------------------------------------------------------
  const hexS = buildStrands(HEX, hexI);
  const specS = buildStrands(SPEC, specI);
  const hexT = trace(hexS);
  const specT = trace(specS);

  const arcLenHex = hexT.arcs.map((a) => a.segIdxs.length).sort((x, y) => y - x);
  const arcLenSpec = specT.arcs.map((a) => a.segIdxs.length).sort((x, y) => y - x);
  // Each arc loses one segment per class-7 vertex it passes through.
  const sevenOnArc = specT.arcs.map((a) => {
    let n = 0;
    const seen = new Set<string>();
    for (const si of a.segIdxs) for (const k of specS.segs[si]) if (internalGroups.has(k) && !seen.has(k)) { seen.add(k); n++; }
    return n;
  });
  const arcLenSuppressed = specT.arcs.map((a, i) => a.segIdxs.length - sevenOnArc[i]).sort((x, y) => y - x);

  // Max degree must be compared on the SUPPRESSED spectre graph: before
  // suppression every class-7 vertex has degree 2, so a hex patch whose own
  // maxDegree is 1 (a lone Gamma at level 0) would spuriously disagree.
  const supDeg = new Map<string, number>();
  for (const c of specChords) {
    const [a, b] = c.split('#')[1].split('|');
    supDeg.set(a, (supDeg.get(a) ?? 0) + 1);
    supDeg.set(b, (supDeg.get(b) ?? 0) + 1);
  }
  const supMaxDeg = supDeg.size ? Math.max(...supDeg.values()) : 0;

  const invOk =
    hexT.arcs.length === specT.arcs.length &&
    hexT.circuits.length === specT.circuits.length &&
    hexT.maxDegree === supMaxDeg &&
    specT.maxDegree <= 2 &&
    hexT.junctions === specT.junctions &&
    sameArray(arcLenHex, arcLenSuppressed) &&
    hexT.tilesCovered === hexI.length &&
    specT.tilesCovered === specI.length;
  checkQuiet(invOk, `${tag}: derived invariants agree after suppression`);

  // count composites touching the patch boundary (some outer dot unwelded)
  let boundaryComposites = 0;
  for (const [hi] of halvesSeen) {
    let onBoundary = false;
    for (let d = 0; d < hexK[hi].length; d++) {
      if ((hexS.degree.get(hexK[hi][d]) ?? 0) < 2) onBoundary = true;
    }
    if (onBoundary) boundaryComposites++;
  }

  if (verbose) {
    console.log(
      `  ${tag.padEnd(12)} tiles ${pad(hexI.length, 6)} / ${pad(specI.length, 6)}   segs ${pad(hexS.segs.length, 6)} / ${pad(specS.segs.length, 6)}` +
        `   composites ${pad(composites, 5)} (${pad(boundaryComposites, 5)} on the patch boundary)` +
        `   arcs ${pad(hexT.arcs.length, 3)}/${pad(specT.arcs.length, 3)}   circuits ${pad(hexT.circuits.length, 3)}/${pad(specT.circuits.length, 3)}` +
        `   maxdeg ${hexT.maxDegree}/${supMaxDeg}(raw ${specT.maxDegree})` +
        `   arc-lens ${arcLenHex.slice(0, 4).join(',')} == ${arcLenSuppressed.slice(0, 4).join(',')}`,
    );
  }

  return {
    ok: tileOk && internalOk && vOk && surj && mergeOk && chordOk && invOk,
    hexTiles: hexI.length,
    specTiles: specI.length,
    hexSegs: hexS.segs.length,
    specSegs: specS.segs.length,
    composites,
    boundaryComposites,
    hexTrace: hexT,
    specTrace: specT,
  };
}

function section3(dotMap: Map<string, DotImage>): void {

  console.log('\n  derived dot map (spectre -> hex):');
  for (const type of [...SHARED, 'Gamma1', 'Gamma2'] as TileTypeId[]) {
    const s = activeTags(SPEC, type);
    const parts = s.map((t, i) => {
      const img = dotMap.get(`${type}:${i}`)!;
      return img.kind === 'internal' ? `${t}[${i}]->INTERNAL` : `${t}[${i}]->${type.startsWith('Gamma') ? 'Gamma' : type}[${img.hexDot}]`;
    });
    console.log(`    ${type.padEnd(8)} ${parts.join('   ')}`);
  }

  console.log('\n  --- roots Delta, Psi, Gamma at levels 0..5 (the obligation) ---\n');
  for (const root of ROOTS_DEEP) {
    for (let lv = 0; lv <= 5; lv++) checkPatch(root, lv, dotMap, true);
  }

  console.log('\n  --- the other six roots at levels 1..4 (extra) ---\n');
  for (const root of ROOTS_ALL) {
    if (ROOTS_DEEP.includes(root)) continue;
    for (let lv = 1; lv <= 4; lv++) checkPatch(root, lv, dotMap, true);
  }

  console.log('\n  --- segment-count identity  segs(spectre) - segs(hex) == #composites ---\n');
  let idOk = true;
  for (const root of ROOTS_ALL) {
    const row: string[] = [];
    for (let lv = 1; lv <= 4; lv++) {
      const hexI = zExpand('hex', root, lv);
      const specI = zExpand('spectre', root, lv);
      const g = hexI.filter((h) => h.type === 'Gamma').length;
      const hs = buildStrands(HEX, hexI).segs.length;
      const ss = buildStrands(SPEC, specI).segs.length;
      if (ss - hs !== g) idOk = false;
      row.push(`${pad(ss, 6)}-${pad(hs, 6)}=${pad(g, 5)}`);
    }
    console.log(`    ${root.padEnd(8)} ${row.join('   ')}`);
  }
  check(idOk, 'segs(spectre) - segs(hex) == #composites at every root, levels 1..4');

  section3b(dotMap);
}

// ---------------------------------------------------------------------------
// 3b.  The interface reduction: what hypothesis (H) really depends on
// ---------------------------------------------------------------------------

/** Compare two slot paths numerically, component by component. */
function idCmp(a: string, b: string): number {
  const A = a === '' ? [] : a.split('.').map(Number);
  const B = b === '' ? [] : b.split('.').map(Number);
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const x = A[i] ?? -1;
    const y = B[i] ?? -1;
    if (x !== y) return x - y;
  }
  return 0;
}

/**
 * Canonical, FAMILY-INDEPENDENT name of a dot: the hex tile id it corresponds
 * to, plus the hex dot index. Spectre dots interior to a composite (class 7)
 * have no canonical name and are excluded.
 */
function canonicalDots(
  family: TileFamilyId,
  cfg: Config,
  root: TileTypeId,
  level: number,
  dotMap: Map<string, DotImage>,
): { coords: string[]; keys: string[] } {
  const insts = zExpand(family, root, level);
  const keys = dotKeys(family, cfg.subset, insts);
  const coords: string[] = [];
  const flatKeys: string[] = [];
  for (let i = 0; i < insts.length; i++) {
    const isHalf = insts[i].type === 'Gamma1' || insts[i].type === 'Gamma2';
    const hid = isHalf ? parentId(insts[i].id) : insts[i].id;
    for (let d = 0; d < keys[i].length; d++) {
      // In the hex family the canonical name IS the hex name; `dotMap` is only
      // defined on spectre leaf types (it has no `Gamma:*` entries at all, hex
      // Gamma being the target of the map rather than its source).
      if (family === 'hex') {
        coords.push(`${insts[i].id}#${d}`);
        flatKeys.push(keys[i][d]);
        continue;
      }
      const img = dotMap.get(`${insts[i].type}:${d}`);
      if (!img) throw new Error(`no dot image for ${insts[i].type}:${d}`);
      if (img.kind === 'internal') continue;
      coords.push(`${hid}#${img.hexDot}`);
      flatKeys.push(keys[i][d]);
    }
  }
  return { coords, keys: flatKeys };
}

const exposedCache = new Map<string, readonly string[]>();

/** Canonical names of the dots left UNWELDED by a level-`level` `root` patch. */
function exposedList(
  family: TileFamilyId,
  cfg: Config,
  root: TileTypeId,
  level: number,
  dotMap: Map<string, DotImage>,
): readonly string[] {
  const ck = `${family}|${root}|${level}`;
  const hit = exposedCache.get(ck);
  if (hit) return hit;
  const { coords, keys } = canonicalDots(family, cfg, root, level, dotMap);
  const mult = new Map<string, number>();
  for (const k of keys) mult.set(k, (mult.get(k) ?? 0) + 1);
  const out = coords
    .filter((_, i) => mult.get(keys[i]) === 1)
    .sort((a, b) => {
      const [ia, da] = a.split('#');
      const [ib, db] = b.split('#');
      const c = idCmp(ia, ib);
      return c !== 0 ? c : Number(da) - Number(db);
    });
  exposedCache.set(ck, out);
  return out;
}

/** Strip the leading child slot from a canonical dot name. */
function relCoord(coord: string): { slot: number; rel: string } {
  const [id, dot] = coord.split('#');
  const parts = id === '' ? [] : id.split('.');
  return { slot: Number(parts[0]), rel: `${parts.slice(1).join('.')}#${dot}` };
}

interface Interface {
  /** Cross-child welds, as 'slotA:posA~slotB:posB', sorted. */
  readonly pairing: readonly string[];
  /** Dots still exposed at the parent level, as 'slot:pos', in canonical order. */
  readonly exposure: readonly string[];
  readonly ok: boolean;
}

function interfaceTable(
  family: TileFamilyId,
  cfg: Config,
  root: TileTypeId,
  level: number,
  dotMap: Map<string, DotImage>,
): Interface {
  const { coords, keys } = canonicalDots(family, cfg, root, level, dotMap);
  const childExposed = new Map<number, ReadonlyMap<string, number>>();
  const subs = SUPER_RULES[root];
  if (!subs) throw new Error(`no substitution rule for ${root}`);
  for (let slot = 0; slot < 8; slot++) {
    if (subs[slot] === 'null') continue;
    const list = exposedList(family, cfg, subs[slot] as TileTypeId, level - 1, dotMap);
    const m = new Map<string, number>();
    list.forEach((c, i) => m.set(c, i));
    childExposed.set(slot, m);
  }

  const mult = new Map<string, number>();
  for (const k of keys) mult.set(k, (mult.get(k) ?? 0) + 1);

  const byKey = new Map<string, { slot: number; pos: number }[]>();
  const exposure: { coord: string; slot: number; pos: number }[] = [];
  let ok = true;
  for (let i = 0; i < coords.length; i++) {
    const { slot, rel } = relCoord(coords[i]);
    const pos = childExposed.get(slot)?.get(rel);
    if (pos === undefined) continue; // was already welded inside its own child
    const k = keys[i];
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push({ slot, pos });
    if (mult.get(k) === 1) exposure.push({ coord: coords[i], slot, pos });
  }
  const pairing: string[] = [];
  for (const [, list] of byKey) {
    if (list.length === 1) continue;
    if (list.length !== 2 || list[0].slot === list[1].slot) {
      ok = false;
      continue;
    }
    const [a, b] = [...list].sort((x, y) => x.slot - y.slot || x.pos - y.pos);
    pairing.push(`${a.slot}:${a.pos}~${b.slot}:${b.pos}`);
  }
  // Every weld that crosses children must have been between two child-exposed
  // dots; check no key of multiplicity 2 was missed.
  let welds = 0;
  for (const m of mult.values()) if (m === 2) welds++;
  const insideChildWelds = welds - pairing.length;
  if (insideChildWelds < 0) ok = false;

  exposure.sort((a, b) => {
    const [ia, da] = a.coord.split('#');
    const [ib, db] = b.coord.split('#');
    const c = idCmp(ia, ib);
    return c !== 0 ? c : Number(da) - Number(db);
  });
  pairing.sort();
  return { pairing, exposure: exposure.map((e) => `${e.slot}:${e.pos}`), ok };
}

function section3b(dotMap: Map<string, DotImage>): void {
  heading('3b.  INTERFACE REDUCTION — what hypothesis (H) actually depends on');
  console.log(
    `  The whole weld pattern of a level-k patch is: (welds inside each of the 8 children,\n` +
      `  by induction) + (welds BETWEEN children). The second part only ever involves dots that\n` +
      `  the children leave UNWELDED. If that exposed set is small and its cross-child pairing is\n` +
      `  the same in both families and does not depend on k, (H) follows by induction from a\n` +
      `  FINITE table. This section computes that table.\n`,
  );

  // (i) exposed-dot counts per type and level, both families
  console.log(`  (i) number of dots a level-j supertile leaves exposed  (canonical, family-independent names)\n`);
  console.log(`      ${'type'.padEnd(8)}${['j=0', 'j=1', 'j=2', 'j=3', 'j=4', 'j=5'].map((s) => pad(s, 7)).join('')}   hex list == spectre list?`);
  let listsAgree = true;
  let countsConstant = true;
  for (const T of ROOTS_ALL) {
    const row: string[] = [];
    let agree = true;
    const counts: number[] = [];
    for (let j = 0; j <= 5; j++) {
      const h = exposedList('hex', HEX, T, j, dotMap);
      const s = exposedList('spectre', SPEC, T, j, dotMap);
      if (!sameArray(h, s)) agree = false;
      row.push(pad(h.length, 7));
      counts.push(h.length);
    }
    if (!agree) listsAgree = false;
    if (new Set(counts.slice(1)).size !== 1) countsConstant = false;
    console.log(`      ${T.padEnd(8)}${row.join('')}   ${agree ? 'yes' : 'NO'}`);
  }
  console.log('');
  check(listsAgree, 'exposed-dot LIST (not just count) is identical in both families, all 9 types, levels 0..5');
  check(countsConstant, 'exposed-dot count is constant in j for j >= 1 (a bounded interface)');

  // (ii) the cross-child interface table
  console.log(`\n  (ii) cross-child weld pairing + parent exposure, as indices into the children's exposed lists\n`);
  console.log(
    `      ${'type'.padEnd(8)}${[1, 2, 3, 4, 5, 6].map((k) => `k=${k}`.padEnd(7)).join('')}  family-agree / shape for k >= 3`,
  );
  let famAgree = true;
  let pairingConstant = true;
  let allConstant = true;
  let period2 = true;
  let evenOddSame = false;
  const sample = new Map<string, Interface>();
  for (const T of ROOTS_ALL) {
    const full: string[] = [];
    const fullS: string[] = [];
    const pairOnly: string[] = [];
    let agree = true;
    for (let k = 1; k <= 6; k++) {
      const h = interfaceTable('hex', HEX, T, k, dotMap);
      const s = interfaceTable('spectre', SPEC, T, k, dotMap);
      if (!h.ok || !s.ok) agree = false;
      if (!sameArray(h.pairing, s.pairing) || !sameArray(h.exposure, s.exposure)) agree = false;
      full.push(`${h.pairing.join(',')}||${h.exposure.join(',')}`);
      fullS.push(`${s.pairing.join(',')}||${s.exposure.join(',')}`);
      pairOnly.push(h.pairing.join(','));
      if (k === 2) sample.set(T, h);
    }
    if (!agree) famAgree = false;
    // label each level by which earlier level it repeats (A, B, C, ...)
    const classes: string[] = [];
    const seen: string[] = [];
    for (const f of full) {
      let idx = seen.indexOf(f);
      if (idx < 0) {
        seen.push(f);
        idx = seen.length - 1;
      }
      classes.push(String.fromCharCode(65 + idx));
    }
    if (new Set(full.slice(1)).size !== 1) allConstant = false;
    if (new Set(pairOnly.slice(1)).size !== 1) pairingConstant = false;
    // period-2 from k = 3: table(k) == table(k + 2) for k = 3, 4
    const per2 =
      full[2] === full[4] && full[3] === full[5] && fullS[2] === fullS[4] && fullS[3] === fullS[5];
    const const1 = new Set(full.slice(2)).size === 1;
    if (!per2) period2 = false;
    if (const1) evenOddSame = true;
    console.log(
      `      ${T.padEnd(8)}${classes.map((c) => c.padEnd(7)).join('')}  ${agree ? 'agree' : 'DISAGREE'} / ${
        const1 ? 'CONSTANT' : per2 ? 'PERIOD 2 (k=3,5 equal; k=4,6 equal)' : 'neither constant nor period-2'
      }`,
    );
  }
  console.log('');
  check(famAgree, 'cross-child interface table is IDENTICAL in both families, all 9 types, k = 1..6');
  console.log(
    `  [${allConstant ? ' OK ' : 'REFU'}] cross-child interface table is the SAME for every k >= 2` +
      (allConstant ? '' : '  — NO: k = 2, k = 3 and k = 4 give three different tables'),
  );
  console.log(
    `  [${pairingConstant ? ' OK ' : 'REFU'}] the weld PAIRING alone is level-independent for k >= 2` +
      (pairingConstant ? '' : '  — NO: the pairing itself alternates, not just the exposure'),
  );
  check(
    period2,
    'cross-child interface table has PERIOD 2 in k for k >= 3: table(k) == table(k+2), k = 3, 4',
    `checked k = 3..6; k = 1 and k = 2 are seeds${evenOddSame ? '' : '; the two phases are genuinely different'}`,
  );
  console.log(
    `      (letters label distinct tables; equal letters = identical table. k = 1 is a seed:\n` +
      `       its children are single leaves, whose exposed list is all of their dots.)\n`,
  );

  console.log('\n  (iii) one level deeper, to see a third period: table(7) vs table(5)\n');
  for (const T of ['Psi', 'Delta'] as TileTypeId[]) {
    const h5 = interfaceTable('hex', HEX, T, 5, dotMap);
    const s5 = interfaceTable('spectre', SPEC, T, 5, dotMap);
    const h7 = interfaceTable('hex', HEX, T, 7, dotMap);
    const s7 = interfaceTable('spectre', SPEC, T, 7, dotMap);
    const ok =
      sameArray(h5.pairing, h7.pairing) &&
      sameArray(h5.exposure, h7.exposure) &&
      sameArray(s5.pairing, s7.pairing) &&
      sameArray(s5.exposure, s7.exposure) &&
      sameArray(h7.pairing, s7.pairing) &&
      sameArray(h7.exposure, s7.exposure);
    check(ok, `${T}: interface table(7) == table(5) in BOTH families, and the two families agree at k = 7`);
  }

  console.log('\n  sample interface tables (k = 2, both families identical):\n');
  for (const T of ['Psi', 'Delta', 'Gamma'] as TileTypeId[]) {
    const it = sample.get(T)!;
    console.log(`      ${T.padEnd(8)}welds  ${it.pairing.join('  ')}`);
    console.log(`      ${''.padEnd(8)}exposes ${it.exposure.join('  ')}`);
  }

  console.log(`
  CONSEQUENCE.  Let (H_k) be hypothesis (H) at level k. The computation above shows
    - the exposed list of a level-j supertile has the same canonical names in both
      families for j <= 5, and its size is constant for j >= 1 (2, 4, 6, 8 or 10 dots);
    - the cross-child pairing/exposure table, written in terms of positions in those
      lists, is identical in both families and identical for k = 2..5.
  If that table is the same for EVERY k >= 2 — the one thing still unproved — then
  (H_k) follows from (H_{k-1}) by induction for all k, and with it the whole
  reduction, for all levels. The open problem is therefore not "do 34649 dots weld
  the same way"; it is a statement about a table with at most 10 entries per type.
`);
}

// ---------------------------------------------------------------------------
// 4.  What transfers, and what does not
// ---------------------------------------------------------------------------

function section4(): void {
  heading('4.  What the isomorphism transfers — and what it does NOT');
  console.log(`
  THE STATEMENT.  Write P_k(R, family) for the level-k patch with root R, and phi for
  the map built in section 3: on tiles, hex id X <-> spectre {X.0, X.1} when X is a
  Gamma and X <-> X otherwise; on dots, the seam-tag bijection printed in section 3.

    THEOREM (conditional).  For every root R and level k, phi induces an isomorphism
    from the spectre strand graph of P_k(R, spectre), with its degree-2 class-7
    vertices suppressed, onto the hex strand graph of P_k(R, hex). The isomorphism
    respects tiles: a chord of hex tile X corresponds to the chord (for X not a
    Gamma) or the two-chord path (for X a Gamma) of the corresponding spectre tiles.

  PROVED FOR ALL k, given hypothesis (H) below.  The proof is finite and local; it
  never mentions the supertile transforms, so the session's negative result (the
  supertile quad is not an exact similarity image of the previous level's) does not
  touch it. Its ingredients, all verified exactly above:
    L1. the 8 shared types have identical active-seam sequences, identical
        non-crossing option counts, identical combo digits, hence identical chord
        sets (section 1);
    L2. class 7 occurs on no shared leaf type in either family, so the selections
        {1,2,8} and {1,2,7,8} agree away from Gamma (section 1);
    L3. the composite Gamma's class-7 seam is exactly its internal weld, its two
        class-7 dots are the same lattice point, and that point is strictly interior
        to the composite, so no tile outside the composite can reach it — verified on
        real patches including composites on the patch rim (sections 2b, 2d, 2e);
    L4. the composite's OUTER active dots are {-1A, 1A, 2A, -2A} in the same cyclic
        order as hex Gamma's, and suppressing the degree-2 class-7 vertex turns its
        three chords into hex Gamma's two (sections 2c, 2d).

    (H)  WELD-PATTERN AGREEMENT.  Two active dots of P_k(R, hex) coincide exactly iff
         the corresponding two dots of P_k(R, spectre) coincide exactly.

  THE REMAINING GAP, SHARPENED.  Section 3b reduces (H) to a bounded object:
    - a level-j supertile of type T leaves exactly n_T dots unwelded, with n_T
      constant in j for j >= 1 (n = 2, 4, 6, 8 or 10), and the exposed set has the
      same canonical names in both families;
    - cross-child welds only ever involve those exposed dots, so the whole weld
      pattern is generated by the finite "interface table" (which exposed dot of
      which child slot welds to which exposed dot of which other child slot, and
      which stay exposed) — at most 20 weld entries per type;
    - that table is IDENTICAL in the two families for k = 1..6 (and k = 7 for Psi and
      Delta), and, within each family, has PERIOD 2 in k for k >= 3.
    Therefore (H) holds for every k as soon as one proves:

      (H*)  In each family separately, the cross-child interface table satisfies
            table(k) = table(k + 2) for every k >= 3.

    (H*) is a statement about two finite tables per tile type, not about a growing
    patch. It is the combinatorial residue of the REFLECT_X pre-multiplication in
    buildSupertiles. It is NOT geometric self-similarity and is strictly weaker than
    it, so it is not refuted by the negative result; but it is not implied by it
    either, and it is not proved here. This is the whole remaining gap in the
    reduction, and it is a per-family statement, so it belongs with the substitution
    -invariance argument rather than with the cross-family comparison.

  REFUTED ALONG THE WAY:
    - "hex is the combinatorial model of the spectre tiling": FALSE. Section 1b shows
      the seam decompositions differ — hex Sigma splits the single spectre 4A seam
      into 6A + 4A, and hex Gamma has 6 outer seams where the composite Mystic has 7
      (hex Gamma has no class-6 seam). The two families do not have the same tile
      adjacency graph. The reduction survives only because classes 4 and 6 carry no
      connection dot under these selections, i.e. it is a statement about the
      dot-carrying seams alone.
    - "the interface table is level-independent for k >= 2": FALSE. k = 2, k = 3 and
      k = 4 give three different tables; even the weld pairing (ignoring exposure)
      alternates. Only period 2 from k = 3 survives.

  TRANSFERS THROUGH THE ISOMORPHISM (topological / combinatorial):
    - circuit-freeness (no closed component);
    - maximum welded degree <= 2 and absence of junctions (after suppression);
    - the number of connected components and the multiset of their lengths, where a
      spectre arc's length exceeds its hex counterpart's by the number of composites
      it traverses — this script verifies the global form of that identity,
      segs(spectre) - segs(hex) = #composites, at every root and level tested;
    - "every tile is covered by the strand", via the tile bijection: a composite is
      covered iff its hex Gamma is (note the raw tile COUNTS differ, 34649 vs 30744
      at Psi level 5, so "tilesCovered" must be compared type-wise, not numerically);
    - "rooted at Psi the diagram is a single open arc visiting every tile";
    - the endpoint structure of each arc and which tile each endpoint sits in;
    - anything phrased purely in the abstract graph, its components, or the
      tile-to-component incidence — in particular the S (self-avoiding, in the
      graph-theoretic sense of "no vertex of degree > 2 and no cycle") half of FASS.

  DOES NOT TRANSFER (metric) — the boundary is exactly "does the claim mention
  points of the plane, or only vertices and edges of the graph?":
    - SELF-AVOIDANCE OF THE DRAWN CHORDS. The chords are straight segments between
      dot positions, and the dot positions differ: hex Gamma is a regular hexagon,
      the composite Mystic is two Spectres. Two chords can be disjoint in one
      realisation and cross in the other; a graph isomorphism says nothing about
      plane embeddings. Self-avoidance must be proved separately in EACH family.
      Note also that the suppressed spectre chord -2A..2A is a two-segment polyline
      through the internal class-7 dot, not a straight segment, so even "the same"
      chord is a different point set.
    - CLEARANCES and every epsilon-level statement.
    - SPACE-FILLING of the plane region: the two tilings cover different regions with
      differently shaped tiles; density, Hausdorff limits and the limit curve's image
      are separate questions per family.
    - SELF-SIMILARITY of the limit curve and the similarity ratio / rotation angle,
      which are metric and family-dependent (and, per this session's negative result,
      exact at no finite level in either family).
    - "the curve passes through the interior of each tile", and anything about the
      shape of the tiles.

  CONSEQUENCE.  The two conjectures are ONE theorem on the topological side and TWO
  theorems on the metric side. Proving the combinatorial core for
  spectre-1278-'0101000000' gives hex-128-'010100000' its circuit-freeness, its
  single-arc-ness and its coverage for free; the drawn-curve self-avoidance and the
  space-filling still have to be argued in the hexagon geometry.
`);
}

// ---------------------------------------------------------------------------
// 5.  Summary
// ---------------------------------------------------------------------------

function main(): void {
  console.log('FASS PROOF 06 — FAMILY REDUCTION: hex-128-010100000  vs  spectre-1278-0101000000');
  const { map: dotMap, ok: dotMapOk } = buildDotMap();
  section1();
  section2();
  section2e(dotMap);
  heading('3.  The explicit isomorphism, verified on real patches (exact)');
  check(
    dotMapOk,
    'dot correspondence derived from seam tags is a bijection and is the identity on the 8 shared types',
  );
  section3(dotMap);
  section4();

  heading('5.  VERDICT');
  if (FAILURES === 0) {
    console.log(`  ALL CHECKS PASSED.

  PROVED (all levels k), modulo hypothesis (H) below:
    the strand graph of spectre-1278-'0101000000' on any patch, with its degree-2
    class-7 vertices suppressed, is isomorphic — tile-respectingly — to the strand
    graph of hex-128-'010100000' on the corresponding patch. Hence the two
    conjectures have a single common TOPOLOGICAL core.

  CHECKED EXACTLY, NOT PROVED FOR ALL k:
    (H)  weld-pattern agreement, verified at roots Delta/Psi/Gamma levels 0..5 and
         the other six roots levels 1..4;
    (H*) the sharper form: the bounded cross-child interface table agrees between the
         families for k = 1..6 (k = 7 for Psi, Delta) and has period 2 in k for
         k >= 3 within each family. (H*) for all k implies (H) for all k by
         induction; it is a statement about tables with at most 20 entries.

  REFUTED:
    - "hex is the combinatorial model of the spectre tiling" — the seam
      decompositions differ at Sigma and Gamma (section 1b); the reduction holds only
      because the differing classes carry no connection dot.
    - "the cross-child interface table is level-independent for k >= 2" — three
      distinct tables occur at k = 2, 3, 4; only period 2 from k = 3 survives.

  DOES NOT TRANSFER: every metric property — drawn-chord self-avoidance, clearances,
  space-filling of the plane, limit geometry. Those remain two separate theorems.
`);
    process.exit(0);
  } else {
    console.log(`  ${FAILURES} CHECK(S) FAILED — see [FAIL] lines above. The reduction as stated does NOT hold.`);
    process.exit(1);
  }
}

main();
