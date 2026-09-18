/**
 * zz-audit-06 — ADVERSARIAL AUDIT of fass-proof/06-family-reduction.ts
 *
 * Independent re-derivation, by deliberately different routes where possible.
 * Nothing here imports 06-family-reduction.ts; every number is recomputed.
 *
 * Run: cd web && npx --yes tsx fass-proof/zz-audit-06.ts
 */

import {
  buildSystem,
  comboToMatchingIndices,
  connectionPoints,
  enumerateMatchings,
  edgeLabels,
  flatten,
  leafOrder,
  leafPts,
  metaEdges,
  parseEdgeLabel,
  SUPER_RULES,
  transPt,
  zAdd,
  zApply,
  zKey,
  zLeafPts,
  zToPt,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
  type ZAffine,
  type ZVec,
} from '../src/core';

import { CONFIGS, activeSeams, buildStrands, chosenMatching, trace, zApply2, zConnectionPoints2, zExpand, type Config, type ZInstance } from './lib';

const HEX: Config = CONFIGS.hex128;
const SPEC: Config = CONFIGS.spectre1278;

let FAIL = 0;
let NOTE = 0;
function ck(ok: boolean, label: string, detail = ''): boolean {
  if (!ok) FAIL++;
  console.log(`  [${ok ? ' OK ' : 'FAIL'}] ${label}${detail ? '  — ' + detail : ''}`);
  return ok;
}
function note(label: string, detail = ''): void {
  NOTE++;
  console.log(`  [NOTE] ${label}${detail ? '  — ' + detail : ''}`);
}
function head(t: string): void {
  console.log(`\n${'='.repeat(78)}\n${t}\n${'='.repeat(78)}`);
}
const pad = (s: unknown, n: number) => String(s).padStart(n);

// ===========================================================================
// A. Does lib's zConnectionPoints2 really mirror core connectionPoints?
//    (core SKIPS a minor-0 label with no containing seam; lib does not.)
// ===========================================================================
function sectionA(): void {
  head('A.  zConnectionPoints2 / activeSeams / core connectionPoints alignment (exact vs float)');
  let ok = true;
  let worst = 0;
  for (const cfg of [HEX, SPEC]) {
    const types = new Set<TileTypeId>([...leafOrder(cfg.family)]);
    for (const t of types) {
      const core = connectionPoints(cfg.family, t, new Set(cfg.subset));
      const z = zConnectionPoints2(cfg.family, t, cfg.subset);
      const a = activeSeams(cfg, t);
      if (core.length !== z.length || core.length !== a.length) {
        ok = false;
        console.log(`    ${cfg.family}/${t}: core ${core.length}  z ${z.length}  activeSeams ${a.length}`);
      }
      for (let i = 0; i < Math.min(core.length, z.length); i++) {
        const p = zToPt(z[i]);
        worst = Math.max(worst, Math.hypot(p.x / 2 - core[i].pt.x, p.y / 2 - core[i].pt.y));
      }
      // also: does every minor-0 selected label have a containing seam?
      const labels = edgeLabels(cfg.family, t);
      const seams = metaEdges(cfg.family, t);
      for (let i = 0; i < labels.length; i++) {
        const { major, minor } = parseEdgeLabel(labels[i]);
        if (minor !== 0 || !cfg.subset.includes(major)) continue;
        if (!seams.some((s) => s.edgeIndices.includes(i))) {
          ok = false;
          console.log(`    ${cfg.family}/${t}: label ${labels[i]} at index ${i} has NO containing seam`);
        }
      }
    }
  }
  ck(ok, 'exact dot lists align 1:1 with core connectionPoints for every leaf type in both configs');
  ck(worst < 1e-9, 'exact doubled dots agree with core float dots', `worst ${worst.toExponential(2)}`);
}

// ===========================================================================
// B. Fully independent FLOAT route: buildSystem/flatten/connectionPoints,
//    welded by rounded coordinate key. Must reproduce the exact route.
// ===========================================================================
interface FloatStats {
  tiles: number;
  segs: number;
  arcs: number;
  circuits: number;
  maxDeg: number;
  arcLens: number[];
  covered: number;
}
function floatRoute(cfg: Config, root: TileTypeId, level: number): FloatStats {
  const sys = buildSystem(cfg.family, level);
  const insts = flatten(sys[root]);
  const idxs = comboToMatchingIndices(cfg.family, cfg.subset, cfg.combo);
  const order = leafOrder(cfg.family);
  const recByType = new Map<string, number>();
  order.forEach((t, i) => recByType.set(t, idxs[i]));
  const cache = new Map<string, { pts: readonly Pt[]; pairs: readonly (readonly [number, number])[] }>();
  const segs: [string, string][] = [];
  const instOf: number[] = [];
  const K = (p: Pt) => `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)}`;
  for (let i = 0; i < insts.length; i++) {
    const t = insts[i].type;
    let loc = cache.get(t);
    if (!loc) {
      const pts = connectionPoints(cfg.family, t, new Set(cfg.subset)).map((c) => c.pt);
      const pairs = pts.length >= 2 && pts.length % 2 === 0
        ? enumerateMatchings(pts.length)[recByType.get(t) ?? 0] ?? []
        : [];
      loc = { pts, pairs };
      cache.set(t, loc);
    }
    for (const [a, b] of loc.pairs) {
      segs.push([K(transPt(insts[i].xform, loc.pts[a])), K(transPt(insts[i].xform, loc.pts[b]))]);
      instOf.push(i);
    }
  }
  // trace
  const adj = new Map<string, { seg: number; other: string }[]>();
  for (let i = 0; i < segs.length; i++) {
    const [a, b] = segs[i];
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push({ seg: i, other: b });
    adj.get(b)!.push({ seg: i, other: a });
  }
  let maxDeg = 0;
  for (const l of adj.values()) maxDeg = Math.max(maxDeg, l.length);
  const used = new Array<boolean>(segs.length).fill(false);
  const arcLens: number[] = [];
  const covered = new Set<number>();
  let circuits = 0;
  const walk = (startKey: string, startSeg: number): number => {
    let n = 0;
    let cur = startKey;
    let seg = startSeg;
    for (;;) {
      used[seg] = true;
      n++;
      covered.add(instOf[seg]);
      const [a, b] = segs[seg];
      const next = a === cur ? b : a;
      if (next === startKey) return n;
      const cont = (adj.get(next) ?? []).filter((x) => !used[x.seg]);
      if ((adj.get(next)?.length ?? 0) !== 2 || cont.length !== 1) return n;
      cur = next;
      seg = cont[0].seg;
    }
  };
  for (const [key, list] of adj) {
    if (list.length === 2) continue;
    for (const x of list) {
      if (used[x.seg]) continue;
      arcLens.push(walk(key, x.seg));
    }
  }
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    walk(segs[i][0], i);
    circuits++;
  }
  arcLens.sort((a, b) => b - a);
  return { tiles: insts.length, segs: segs.length, arcs: arcLens.length, circuits, maxDeg, arcLens, covered: covered.size };
}

function exactRoute(cfg: Config, root: TileTypeId, level: number): FloatStats {
  const insts = zExpand(cfg.family, root, level);
  const s = buildStrands(cfg, insts);
  const t = trace(s);
  return {
    tiles: insts.length,
    segs: s.segs.length,
    arcs: t.arcs.length,
    circuits: t.circuits.length,
    maxDeg: t.maxDegree,
    arcLens: t.arcs.map((a) => a.segIdxs.length).sort((x, y) => y - x),
    covered: t.tilesCovered,
  };
}

function sectionB(): void {
  head('B.  INDEPENDENT ROUTE: core float buildSystem/flatten/connectionPoints vs lib exact zExpand');
  console.log(`  ${'patch'.padEnd(16)}${'tiles'.padStart(8)}${'segs'.padStart(8)}${'arcs'.padStart(6)}${'circ'.padStart(6)}${'maxdeg'.padStart(8)}   arc-lens (float route)`);
  let ok = true;
  for (const cfg of [HEX, SPEC]) {
    for (const root of ['Psi', 'Delta', 'Gamma'] as TileTypeId[]) {
      for (let lv = 1; lv <= 4; lv++) {
        const f = floatRoute(cfg, root, lv);
        const e = exactRoute(cfg, root, lv);
        const same =
          f.tiles === e.tiles && f.segs === e.segs && f.arcs === e.arcs &&
          f.circuits === e.circuits && f.maxDeg === e.maxDeg && f.covered === e.covered &&
          f.arcLens.join(',') === e.arcLens.join(',');
        if (!same) ok = false;
        console.log(
          `  ${(cfg.family + ' ' + root + '@' + lv).padEnd(16)}${pad(f.tiles, 8)}${pad(f.segs, 8)}${pad(f.arcs, 6)}${pad(f.circuits, 6)}${pad(f.maxDeg, 8)}   ${f.arcLens.slice(0, 4).join(',')}${same ? '' : '   <<< MISMATCH vs exact route'}`,
        );
      }
    }
  }
  ck(ok, 'float route reproduces the exact route exactly (tiles, segs, arcs, circuits, maxdeg, arc-length multiset, coverage)');
  // level 5 spot-check on the headline numbers
  const h5 = exactRoute(HEX, 'Psi', 5);
  const s5 = exactRoute(SPEC, 'Psi', 5);
  ck(h5.tiles === 30744 && h5.segs === 41465 && h5.arcs === 1 && h5.circuits === 0,
     'headline hex Psi@5 = 30744 tiles / 41465 segs / 1 arc / 0 circuits');
  ck(s5.tiles === 34649 && s5.segs === 45370 && s5.arcs === 1 && s5.circuits === 0,
     'headline spectre Psi@5 = 34649 tiles / 45370 segs / 1 arc / 0 circuits');
  ck(s5.segs - h5.segs === 3905 && h5.tiles === 30744,
     'segs(spectre)-segs(hex) = 3905 = #composites at Psi@5');
}

// ===========================================================================
// C. THE HOLE IN THE (H*) => (H) INDUCTION.
//    interfaceTable() in 06 silently DROPS any coincidence that involves a dot
//    already welded inside its own child (it `continue`s when the dot is not in
//    the child's exposed list, and such a key has global multiplicity >= 3 so it
//    is not counted by `welds` either). Test for such coincidences directly.
// ===========================================================================
function dotKeysOf(cfg: Config, insts: readonly ZInstance[]): string[][] {
  const cache = new Map<string, readonly ZVec[]>();
  return insts.map((inst) => {
    let pts = cache.get(inst.type);
    if (!pts) { pts = zConnectionPoints2(cfg.family, inst.type, cfg.subset); cache.set(inst.type, pts); }
    return pts.map((p) => zKey(zApply2(inst.xform, p)));
  });
}

function sectionC(): void {
  head('C.  Is the interface table SOUND?  (cross-child welds involving child-interior dots)');
  console.log('  For each level-k patch: group all active dots by exact key. For each group ask');
  console.log('  (1) is |group| <= 2 (no triple point), and');
  console.log('  (2) if |group| = 2 and the two dots live in DIFFERENT top-level children, is each of');
  console.log('      them UNWELDED inside its own child?  If not, 06\'s interfaceTable() drops it.\n');
  console.log(`  ${'patch'.padEnd(18)}${'dots'.padStart(9)}${'groups>=3'.padStart(11)}${'cross-child'.padStart(13)}${'of those, into a child-interior dot'.padStart(38)}`);
  let ok = true;
  for (const cfg of [HEX, SPEC]) {
    for (const root of ['Psi', 'Delta', 'Gamma'] as TileTypeId[]) {
      for (let lv = 2; lv <= 5; lv++) {
        const insts = zExpand(cfg.family, root, lv);
        const keys = dotKeysOf(cfg, insts);
        // group globally
        const grp = new Map<string, { inst: number; slot: number }[]>();
        let ndots = 0;
        for (let i = 0; i < insts.length; i++) {
          const slot = Number(insts[i].id.split('.')[0]);
          for (const k of keys[i]) {
            ndots++;
            let g = grp.get(k);
            if (!g) grp.set(k, (g = []));
            g.push({ inst: i, slot });
          }
        }
        // per-child multiplicity (welded inside its own child?)
        const perChild = new Map<string, number>(); // slot|key -> count
        for (let i = 0; i < insts.length; i++) {
          const slot = Number(insts[i].id.split('.')[0]);
          for (const k of keys[i]) {
            const ck2 = `${slot}|${k}`;
            perChild.set(ck2, (perChild.get(ck2) ?? 0) + 1);
          }
        }
        let big = 0;
        let cross = 0;
        let crossIntoInterior = 0;
        for (const [k, g] of grp) {
          if (g.length >= 3) big++;
          if (g.length === 2 && g[0].slot !== g[1].slot) {
            cross++;
            for (const m of g) if ((perChild.get(`${m.slot}|${k}`) ?? 0) !== 1) crossIntoInterior++;
          }
        }
        if (big > 0 || crossIntoInterior > 0) ok = false;
        console.log(
          `  ${(cfg.family + ' ' + root + '@' + lv).padEnd(18)}${pad(ndots, 9)}${pad(big, 11)}${pad(cross, 13)}${pad(crossIntoInterior, 38)}`,
        );
      }
    }
  }
  ck(ok, 'no triple points, and every cross-child weld joins two dots each unwelded inside its own child');
  note('06 does NOT check either condition: interfaceTable() `continue`s on a dot missing from the');
  note('child\'s exposed list, and its `welds` counter only counts keys of multiplicity exactly 2,');
  note('so a multiplicity-3 coincidence would vanish from the table with ok still true.');
  note('=> "(H*) for all k implies (H) for all k" needs this as an EXTRA hypothesis, unstated in 06.');
}

// ===========================================================================
// D. Push hypothesis (H) one level beyond what 06 checked: k = 6.
//    Independent re-implementation of the weld-pattern comparison.
// ===========================================================================
function dotImage(type: TileTypeId, d: number): { internal: boolean; hexDot: number } {
  // derived here from seam tags, independently of 06's buildDotMap
  const sTags = activeSeams(SPEC, type).map((s) => `${s.sign < 0 ? '-' : ''}${s.major}${s.variant}`);
  const tag = sTags[d];
  if (tag.replace('-', '').startsWith('7')) return { internal: true, hexDot: -1 };
  const hexType: TileTypeId = type === 'Gamma1' || type === 'Gamma2' ? 'Gamma' : type;
  const hTags = activeSeams(HEX, hexType).map((s) => `${s.sign < 0 ? '-' : ''}${s.major}${s.variant}`);
  const j = hTags.indexOf(tag);
  if (j < 0) throw new Error(`no hex dot for ${type}:${d} (${tag})`);
  return { internal: false, hexDot: j };
}

function parentId(id: string): string {
  const k = id.lastIndexOf('.');
  return k < 0 ? '' : id.slice(0, k);
}

function checkH(root: TileTypeId, level: number): { ok: boolean; detail: string } {
  const hexI = zExpand('hex', root, level);
  const specI = zExpand('spectre', root, level);
  const hexK = dotKeysOf(HEX, hexI);
  const specK = dotKeysOf(SPEC, specI);
  const hexIdx = new Map<string, number>();
  hexI.forEach((h, i) => hexIdx.set(h.id, i));

  // spectre dot -> hex dot key, as a partition comparison
  const fwd = new Map<string, string>();
  const bwd = new Map<string, string>();
  let ok = true;
  let internalGroups = 0;
  const internalSeen = new Map<string, number>();
  const outerSpec = new Set<string>();
  for (let i = 0; i < specI.length; i++) {
    const isHalf = specI[i].type === 'Gamma1' || specI[i].type === 'Gamma2';
    const hid = isHalf ? parentId(specI[i].id) : specI[i].id;
    const hi = hexIdx.get(hid);
    if (hi === undefined) { ok = false; continue; }
    for (let d = 0; d < specK[i].length; d++) {
      const img = dotImage(specI[i].type, d);
      if (img.internal) {
        internalSeen.set(specK[i][d], (internalSeen.get(specK[i][d]) ?? 0) + 1);
        continue;
      }
      outerSpec.add(specK[i][d]);
      const sk = specK[i][d];
      const hk = hexK[hi][img.hexDot];
      const p = fwd.get(sk);
      if (p === undefined) fwd.set(sk, hk); else if (p !== hk) ok = false;
      const q = bwd.get(hk);
      if (q === undefined) bwd.set(hk, sk); else if (q !== sk) ok = false;
    }
  }
  for (const [k, n] of internalSeen) {
    if (n !== 2) ok = false;
    if (outerSpec.has(k)) ok = false;
    internalGroups++;
  }
  const hexAll = new Set<string>();
  for (const row of hexK) for (const k of row) hexAll.add(k);
  if (bwd.size !== hexAll.size) ok = false;
  const composites = hexI.filter((h) => h.type === 'Gamma').length;
  if (internalGroups !== composites) ok = false;

  // and the derived invariants
  const hs = buildStrands(HEX, hexI);
  const ss = buildStrands(SPEC, specI);
  const ht = trace(hs);
  const st = trace(ss);
  if (ss.segs.length - hs.segs.length !== composites) ok = false;
  if (ht.arcs.length !== st.arcs.length || ht.circuits.length !== st.circuits.length) ok = false;
  if (ht.junctions !== 0 || st.junctions !== 0) ok = false;
  if (st.maxDegree > 2 || ht.maxDegree > 2) ok = false;
  if (ht.tilesCovered !== hexI.length || st.tilesCovered !== specI.length) ok = false;
  return {
    ok,
    detail: `hex ${hexI.length}t/${hs.segs.length}s  spec ${specI.length}t/${ss.segs.length}s  comp ${composites}  arcs ${ht.arcs.length}/${st.arcs.length}  circ ${ht.circuits.length}/${st.circuits.length}  maxdeg ${ht.maxDegree}/${st.maxDegree}  vertices ${bwd.size}`,
  };
}

function sectionD(): void {
  head('D.  Hypothesis (H) pushed BEYOND 06\'s range: level 6 (06 stopped at 5)');
  let ok = true;
  for (const root of ['Psi', 'Delta', 'Gamma', 'Sigma'] as TileTypeId[]) {
    for (const lv of [5, 6]) {
      const r = checkH(root, lv);
      if (!r.ok) ok = false;
      console.log(`  ${(root + '@' + lv).padEnd(10)} ${r.ok ? ' OK ' : 'FAIL'}   ${r.detail}`);
    }
  }
  ck(ok, '(H) + the derived invariants still hold at level 6 for Psi, Delta, Gamma, Sigma');
}


// ===========================================================================
// E. Rim composites: 06 reports exactly ONE composite on the patch rim at every
//    root and level. Recount independently (directed-edge boundary, not edge
//    multiplicity), and also count composites that touch the patch outline at a
//    VERTEX rather than an edge.
// ===========================================================================
function ccwWorldPolys(family: TileFamilyId, insts: readonly ZInstance[]): ZVec[][] {
  return insts.map((inst) => {
    const pts = zLeafPts(family, inst.type).map((p) => zApply(inst.xform, p));
    // orient CCW in world: reflections flip the local orientation
    const f = pts.map(zToPt);
    let a = 0;
    for (let i = 0; i < f.length; i++) {
      const q = f[(i + 1) % f.length];
      a += f[i].x * q.y - q.x * f[i].y;
    }
    return a >= 0 ? pts : [...pts].reverse();
  });
}

function sectionE(): void {
  head('E.  Composites on the patch rim — independent recount');
  console.log(`  ${'patch'.padEnd(14)}${'composites'.padStart(12)}${'rim (edge)'.padStart(12)}${'rim (vertex)'.padStart(14)}`);
  for (const root of ['Psi', 'Delta', 'Gamma'] as TileTypeId[]) {
    for (let lv = 1; lv <= 4; lv++) {
      const insts = zExpand('spectre', root, lv);
      const polys = ccwWorldPolys('spectre', insts);
      const dir = new Map<string, number>();
      for (let i = 0; i < polys.length; i++) {
        const P = polys[i];
        for (let e = 0; e < P.length; e++) dir.set(`${zKey(P[e])}>${zKey(P[(e + 1) % P.length])}`, i);
      }
      const bVerts = new Set<string>();
      const bTiles = new Set<number>();
      for (const [k, i] of dir) {
        const [a, b] = k.split('>');
        if (!dir.has(`${b}>${a}`)) { bTiles.add(i); bVerts.add(a); bVerts.add(b); }
      }
      const compOf = (id: string) => id.slice(0, id.lastIndexOf('.'));
      const rimEdge = new Set<string>();
      const rimVert = new Set<string>();
      for (let i = 0; i < insts.length; i++) {
        if (insts[i].type !== 'Gamma1' && insts[i].type !== 'Gamma2') continue;
        if (bTiles.has(i)) rimEdge.add(compOf(insts[i].id));
        if (polys[i].some((v) => bVerts.has(zKey(v)))) rimVert.add(compOf(insts[i].id));
      }
      const nComp = new Set(insts.filter((x) => x.type === 'Gamma1').map((x) => compOf(x.id))).size;
      console.log(`  ${(root + '@' + lv).padEnd(14)}${pad(nComp, 12)}${pad(rimEdge.size, 12)}${pad(rimVert.size, 14)}`);
    }
  }
  note('06 prints "on rim" using edge-multiplicity 1, which is the edge column above.');
}

// ===========================================================================
// F. The docs/FASS_1278.md sec 4.4 question: 06 claims to REFUTE the
//    level-independence of the gluing/outer table. 06 labels exposed dots by
//    DESCENT PATH; the doc labels them by position along the supertile OUTLINE
//    with a chirality-stable rule. Compute the outline order and see whether the
//    two labellings differ by a level-dependent rotation/reflection.
// ===========================================================================
function outlineDotOrder(cfg: Config, T: TileTypeId, level: number): { seq: string[]; allOnRim: boolean } {
  const insts = zExpand(cfg.family, T, level);
  const polys = ccwWorldPolys(cfg.family, insts);
  const dir = new Map<string, { inst: number; edge: number; to: ZVec }>();
  for (let i = 0; i < polys.length; i++) {
    const P = polys[i];
    for (let e = 0; e < P.length; e++) {
      dir.set(`${zKey(P[e])}>${zKey(P[(e + 1) % P.length])}`, { inst: i, edge: e, to: P[(e + 1) % P.length] });
    }
  }
  const nextOf = new Map<string, { key: string; inst: number; edge: number }>();
  for (const [k, v] of dir) {
    const [a, b] = k.split('>');
    if (dir.has(`${b}>${a}`)) continue;
    nextOf.set(a, { key: b, inst: v.inst, edge: v.edge });
  }
  // dot keys + canonical names, and global multiplicity
  const keys = dotKeysOf(cfg, insts);
  const mult = new Map<string, number>();
  for (const row of keys) for (const k of row) mult.set(k, (mult.get(k) ?? 0) + 1);
  // edge index -> dot index for each type
  const edgeToDot = new Map<string, Map<number, number>>();
  const dotAt = (type: TileTypeId, edge: number): number | undefined => {
    let m = edgeToDot.get(type);
    if (!m) {
      m = new Map<number, number>();
      const labels = edgeLabels(cfg.family, type);
      let d = 0;
      for (let i = 0; i < labels.length; i++) {
        const { major, minor } = parseEdgeLabel(labels[i]);
        if (minor !== 0 || !cfg.subset.includes(major)) continue;
        m.set(i, d++);
      }
      edgeToDot.set(type, m);
    }
    return m.get(edge);
  };
  // walk
  const start = nextOf.keys().next().value as string;
  const seq: string[] = [];
  let cur = start;
  let steps = 0;
  const nB = nextOf.size;
  const seen = new Set<string>();
  for (; steps <= nB; steps++) {
    const nx = nextOf.get(cur);
    if (!nx) break;
    const inst = insts[nx.inst];
    // polygon may be reversed relative to zLeafPts; recover the LOCAL edge index
    const local = zLeafPts(cfg.family, inst.type);
    const P = polys[nx.inst];
    const reversed = zKey(P[0]) !== zKey(zApply(inst.xform, local[0])) || zKey(P[1]) !== zKey(zApply(inst.xform, local[1]));
    const n = local.length;
    const li = reversed ? (n - 1 - nx.edge + n - 1) % n : nx.edge;
    const d = dotAt(inst.type, li);
    if (d !== undefined) {
      const k = keys[nx.inst][d];
      if (mult.get(k) === 1) {
        const isHalf = inst.type === 'Gamma1' || inst.type === 'Gamma2';
        const hid = isHalf ? parentId(inst.id) : inst.id;
        const img = cfg.family === 'hex' ? { internal: false, hexDot: d } : dotImage(inst.type, d);
        if (!img.internal) { seq.push(`${hid}#${img.hexDot}`); seen.add(k); }
      }
    }
    cur = nx.key;
    if (cur === start) break;
  }
  const exposedTotal = [...mult.values()].filter((v) => v === 1).length;
  return { seq, allOnRim: seen.size === exposedTotal };
}

function cyclicEq(a: readonly string[], b: readonly string[]): number | null {
  if (a.length !== b.length) return null;
  for (let r = 0; r < a.length; r++) {
    let ok = true;
    for (let i = 0; i < a.length; i++) if (a[(i + r) % a.length] !== b[i]) { ok = false; break; }
    if (ok) return r;
  }
  return null;
}

function sectionF(): void {
  head('F.  06 vs docs/FASS_1278.md sec 4.4 — is the "refutation" a change of LABELLING?');
  console.log('  06 indexes a supertile\'s exposed dots by DESCENT PATH (level-independent names).');
  console.log('  docs sec 4.4 indexes them by position along the supertile OUTLINE, "chirality-stable".');
  console.log('  If the outline order of the same names rotates/reflects with the level, the two');
  console.log('  labellings differ level by level and the two constancy claims are NOT comparable.\n');
  console.log(`  ${'type'.padEnd(8)}${'j'.padStart(3)}  outline order of exposed dots (canonical descent-path names)   vs j-1`);
  for (const T of ['Psi', 'Xi', 'Phi', 'Delta'] as TileTypeId[]) {
    let prev: string[] | null = null;
    for (let j = 2; j <= 5; j++) {
      const { seq, allOnRim } = outlineDotOrder(HEX, T, j);
      let rel = '';
      if (prev) {
        const f = cyclicEq(seq, prev);
        const r = cyclicEq([...seq].reverse(), prev);
        rel = f !== null ? `rotation ${f}` : r !== null ? `REVERSED, rotation ${r}` : 'unrelated';
      }
      console.log(`  ${T.padEnd(8)}${pad(j, 3)}  ${seq.join(' ').padEnd(58)} ${rel}${allOnRim ? '' : '  (WARNING: some exposed dot not on the walked outline)'}`);
      prev = seq;
    }
    console.log('');
  }
}


// ===========================================================================
// G. Is 06's "the interface table is NOT level-independent" a real fact about
//    the welding, or an artefact of ITS labelling?  Test: does there exist a
//    per-type permutation sigma_T of the exposed lists with table(k+1) =
//    sigma(table(k))?  If yes, the doc's constancy claim (in a different,
//    chirality-stable labelling) is consistent and 06 has refuted nothing.
//    Everything below is an INDEPENDENT reimplementation of 06's sec 3b.
// ===========================================================================
function idCmp(a: string, b: string): number {
  const A = a === '' ? [] : a.split('.').map(Number);
  const B = b === '' ? [] : b.split('.').map(Number);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i] ?? -1, y = B[i] ?? -1;
    if (x !== y) return x - y;
  }
  return 0;
}
function canonDots(cfg: Config, root: TileTypeId, level: number): { coords: string[]; keys: string[] } {
  const insts = zExpand(cfg.family, root, level);
  const keys = dotKeysOf(cfg, insts);
  const coords: string[] = [], flat: string[] = [];
  for (let i = 0; i < insts.length; i++) {
    const isHalf = insts[i].type === 'Gamma1' || insts[i].type === 'Gamma2';
    const hid = isHalf ? parentId(insts[i].id) : insts[i].id;
    for (let d = 0; d < keys[i].length; d++) {
      if (cfg.family === 'hex') { coords.push(`${insts[i].id}#${d}`); flat.push(keys[i][d]); continue; }
      const img = dotImage(insts[i].type, d);
      if (img.internal) continue;
      coords.push(`${hid}#${img.hexDot}`); flat.push(keys[i][d]);
    }
  }
  return { coords, keys: flat };
}
const expCache = new Map<string, string[]>();
function exposed(cfg: Config, T: TileTypeId, level: number): string[] {
  const ck2 = `${cfg.family}|${T}|${level}`;
  const h = expCache.get(ck2); if (h) return h;
  const { coords, keys } = canonDots(cfg, T, level);
  const m = new Map<string, number>();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  const out = coords.filter((_, i) => m.get(keys[i]) === 1).sort((a, b) => {
    const [ia, da] = a.split('#'), [ib, db] = b.split('#');
    const c = idCmp(ia, ib); return c !== 0 ? c : Number(da) - Number(db);
  });
  expCache.set(ck2, out); return out;
}
interface ITab { pairing: string[]; exposure: { slot: number; pos: number }[] }
function iTable(cfg: Config, T: TileTypeId, k: number): ITab {
  const { coords, keys } = canonDots(cfg, T, k);
  const subs = SUPER_RULES[T]!;
  const childExp = new Map<number, Map<string, number>>();
  for (let s = 0; s < 8; s++) {
    if (subs[s] === 'null') continue;
    const m = new Map<string, number>();
    exposed(cfg, subs[s] as TileTypeId, k - 1).forEach((c, i) => m.set(c, i));
    childExp.set(s, m);
  }
  const mult = new Map<string, number>();
  for (const key of keys) mult.set(key, (mult.get(key) ?? 0) + 1);
  const byKey = new Map<string, { slot: number; pos: number }[]>();
  const expo: { coord: string; slot: number; pos: number }[] = [];
  for (let i = 0; i < coords.length; i++) {
    const [id, dot] = coords[i].split('#');
    const parts = id.split('.');
    const slot = Number(parts[0]);
    const rel = `${parts.slice(1).join('.')}#${dot}`;
    const pos = childExp.get(slot)?.get(rel);
    if (pos === undefined) continue;
    let g = byKey.get(keys[i]); if (!g) byKey.set(keys[i], (g = []));
    g.push({ slot, pos });
    if (mult.get(keys[i]) === 1) expo.push({ coord: coords[i], slot, pos });
  }
  const pairing: string[] = [];
  for (const g of byKey.values()) {
    if (g.length !== 2) continue;
    const [a, b] = [...g].sort((x, y) => x.slot - y.slot || x.pos - y.pos);
    pairing.push(`${a.slot}:${a.pos}~${b.slot}:${b.pos}`);
  }
  expo.sort((a, b) => {
    const [ia, da] = a.coord.split('#'), [ib, db] = b.coord.split('#');
    const c = idCmp(ia, ib); return c !== 0 ? c : Number(da) - Number(db);
  });
  pairing.sort();
  return { pairing, exposure: expo.map((e) => ({ slot: e.slot, pos: e.pos })) };
}

function sectionG(): void {
  head('G.  Does a per-type RELABELLING turn 06\'s alternating table into a constant one?');
  // 1. reproduce 06's letters independently
  console.log('  independent recomputation of 06 sec 3b(ii) signatures (hex family):');
  const TYPES = ['Gamma','Delta','Theta','Lambda','Xi','Pi','Sigma','Phi','Psi'] as TileTypeId[];
  const tabs = new Map<string, ITab>();
  for (const T of TYPES) {
    const letters: string[] = [], seen: string[] = [];
    for (let k = 1; k <= 6; k++) {
      const t = iTable(HEX, T, k);
      tabs.set(`${T}|${k}`, t);
      const sig = `${t.pairing.join(',')}||${t.exposure.map((e) => `${e.slot}:${e.pos}`).join(',')}`;
      let i = seen.indexOf(sig); if (i < 0) { seen.push(sig); i = seen.length - 1; }
      letters.push(String.fromCharCode(65 + i));
    }
    console.log(`    ${T.padEnd(8)}${letters.join(' ')}`);
  }
  // 1b. exposed-dot counts pushed to j = 6 (06 stopped at j = 5)
  {
    const row: string[] = [];
    let constant = true;
    for (const T of TYPES) {
      const c: number[] = [];
      for (let j = 1; j <= 6; j++) c.push(exposed(HEX, T, j).length);
      if (new Set(c).size !== 1) constant = false;
      row.push(`${T} ${c.join('/')}`);
    }
    console.log(`\n  exposed-dot counts j=1..6 (hex): ${row.join('  ')}`);
    ck(constant, 'n_T is still constant at j = 6 (06 checked j <= 5 only)');
    let agree = true;
    for (const T of ['Psi', 'Delta', 'Xi'] as TileTypeId[]) {
      if (exposed(HEX, T, 6).join(',') !== exposed(SPEC, T, 6).join(',')) agree = false;
    }
    ck(agree, 'exposed-dot LIST still agrees between the families at j = 6 (Psi, Delta, Xi)');
  }

  // 2. search for sigma with table(k+1) = sigma(table(k))
  const childType = (T: TileTypeId, slot: number) => SUPER_RULES[T]![slot] as TileTypeId;
  const nOf = new Map<TileTypeId, number>();
  for (const T of TYPES) nOf.set(T, exposed(HEX, T, 3).length);

  const search = (k: number): Map<TileTypeId, number[]> | null => {
    const sig = new Map<TileTypeId, (number | undefined)[]>();
    const used = new Map<TileTypeId, Set<number>>();
    for (const T of TYPES) { sig.set(T, new Array(nOf.get(T)!).fill(undefined)); used.set(T, new Set()); }
    const assign = (T: TileTypeId, p: number, q: number): (() => void) | null => {
      const cur = sig.get(T)![p];
      if (cur !== undefined) return cur === q ? () => {} : null;
      if (used.get(T)!.has(q)) return null;
      sig.get(T)![p] = q; used.get(T)!.add(q);
      return () => { sig.get(T)![p] = undefined; used.get(T)!.delete(q); };
    };
    // unknowns: (T, p) for every parent position; constraints from exposure
    const units: [TileTypeId, number][] = [];
    for (const T of TYPES) for (let p = 0; p < nOf.get(T)!; p++) units.push([T, p]);
    const rec = (idx: number): boolean => {
      if (idx === units.length) {
        // verify pairing for both levels
        for (const T of TYPES) {
          const A = tabs.get(`${T}|${k}`)!, B = tabs.get(`${T}|${k + 1}`)!;
          const mapped = A.pairing.map((s) => {
            const [x, y] = s.split('~');
            const [sa, pa] = x.split(':').map(Number), [sb, pb] = y.split(':').map(Number);
            const na = sig.get(childType(T, sa))![pa], nb = sig.get(childType(T, sb))![pb];
            if (na === undefined || nb === undefined) return 'UNDEF';
            const u = { s: sa, p: na }, v = { s: sb, p: nb };
            const [f, g] = [u, v].sort((m, n) => m.s - n.s || m.p - n.p);
            return `${f.s}:${f.p}~${g.s}:${g.p}`;
          }).sort();
          if (mapped.join('|') !== [...B.pairing].sort().join('|')) return false;
        }
        return true;
      }
      const [T, p] = units[idx];
      if (sig.get(T)![p] !== undefined) return rec(idx + 1);
      const A = tabs.get(`${T}|${k}`)!, B = tabs.get(`${T}|${k + 1}`)!;
      if (p >= A.exposure.length || A.exposure.length !== B.exposure.length) return false;
      const { slot, pos } = A.exposure[p];
      const U = childType(T, slot);
      for (let q = 0; q < B.exposure.length; q++) {
        if (B.exposure[q].slot !== slot) continue;
        const u1 = assign(T, p, q); if (!u1) continue;
        const u2 = assign(U, pos, B.exposure[q].pos);
        if (u2 && rec(idx + 1)) return true;
        if (u2) u2(); u1();
      }
      return false;
    };
    if (!rec(0)) return null;
    const out = new Map<TileTypeId, number[]>();
    for (const T of TYPES) out.set(T, sig.get(T)!.map((x) => x ?? -1));
    return out;
  };

  console.log('');
  for (const k of [1, 2, 3, 4, 5]) {
    const r = search(k);
    if (k === 1) {
      note(`k = 1 -> 2: relabelling ${r ? 'exists' : 'does NOT exist'} (k = 1 is a genuine seed: its children are bare leaves)`);
      continue;
    }
    if (r) {
      // independent re-verification of the returned sigma (pairing AND exposure)
      let verified = true;
      for (const T of TYPES) {
        const A = tabs.get(`${T}|${k}`)!, B = tabs.get(`${T}|${k + 1}`)!;
        const sT = r.get(T)!;
        if (new Set(sT).size !== sT.length) verified = false;
        const mapped = A.pairing.map((str) => {
          const [x, y] = str.split('~');
          const [sa, pa] = x.split(':').map(Number), [sb, pb] = y.split(':').map(Number);
          const u = { s: sa, p: r.get(childType(T, sa))![pa] }, v = { s: sb, p: r.get(childType(T, sb))![pb] };
          const [f, g] = [u, v].sort((m, n) => m.s - n.s || m.p - n.p);
          return `${f.s}:${f.p}~${g.s}:${g.p}`;
        }).sort();
        if (mapped.join('|') !== [...B.pairing].sort().join('|')) verified = false;
        for (let p2 = 0; p2 < A.exposure.length; p2++) {
          const tgt = B.exposure[sT[p2]];
          if (!tgt || tgt.slot !== A.exposure[p2].slot ||
              tgt.pos !== r.get(childType(T, A.exposure[p2].slot))![A.exposure[p2].pos]) verified = false;
        }
      }
      ck(verified, `sigma for k=${k}->${k + 1} re-verified independently (bijective; pairing and exposure both map correctly)`);
      ck(true, `a per-type relabelling sigma with table(${k + 1}) = sigma(table(${k})) EXISTS`,
         TYPES.map((T) => `${T}=${(r.get(T) ?? []).join('')}`).join(' ') + `  | involution: ${TYPES.every((T) => (r.get(T) ?? []).every((v, i2) => (r.get(T) ?? [])[v] === i2))}`);
    } else {
      ck(false, `NO per-type relabelling sigma with table(${k + 1}) = sigma(table(${k}))`,
         'so the level-dependence is intrinsic, not a naming artefact');
    }
  }
}


// ===========================================================================
// H. 06's refutation #1: "hex is NOT the combinatorial model of the spectre
//    tiling — the two families do NOT have the same tile-adjacency graph."
//    Test it directly: build the edge-adjacency graph of real patches in both
//    families (composite Mystic contracted to one node) and compare under the
//    tile-id bijection.
// ===========================================================================
function adjacency(cfg: Config, root: TileTypeId, level: number): Map<string, Set<string>> {
  const insts = zExpand(cfg.family, root, level);
  const nodeOf = (inst: ZInstance) =>
    inst.type === 'Gamma1' || inst.type === 'Gamma2' ? parentId(inst.id) : inst.id;
  const byEdge = new Map<string, string[]>();
  for (const inst of insts) {
    const pts = zLeafPts(cfg.family, inst.type).map((q) => zApply(inst.xform, q));
    for (let i = 0; i < pts.length; i++) {
      const a = zKey(pts[i]), b = zKey(pts[(i + 1) % pts.length]);
      const k = a < b ? `${a}::${b}` : `${b}::${a}`;
      let g = byEdge.get(k); if (!g) byEdge.set(k, (g = []));
      g.push(nodeOf(inst));
    }
  }
  const adj = new Map<string, Set<string>>();
  for (const inst of insts) if (!adj.has(nodeOf(inst))) adj.set(nodeOf(inst), new Set());
  for (const g of byEdge.values()) {
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      if (g[i] === g[j]) continue;
      adj.get(g[i])!.add(g[j]); adj.get(g[j])!.add(g[i]);
    }
  }
  return adj;
}

function sectionH(): void {
  head('H.  06\'s refutation #1: do the two families really have DIFFERENT tile adjacency?');
  console.log(`  ${'patch'.padEnd(12)}${'nodes h/s'.padStart(16)}${'edges h/s'.padStart(14)}   identical under the tile-id bijection?`);
  let anyDiff = false;
  for (const root of ['Psi', 'Delta'] as TileTypeId[]) {
    for (let lv = 1; lv <= 3; lv++) {
      const H = adjacency(HEX, root, lv), S = adjacency(SPEC, root, lv);
      const eh = [...H.values()].reduce((a, b) => a + b.size, 0) / 2;
      const es = [...S.values()].reduce((a, b) => a + b.size, 0) / 2;
      let same = H.size === S.size;
      const diffs: string[] = [];
      for (const [n, set] of H) {
        const t = S.get(n);
        if (!t || t.size !== set.size || [...set].some((x) => !t.has(x))) {
          same = false;
          if (diffs.length < 3) {
            const only = [...set].filter((x) => !(t?.has(x) ?? false));
            const onlyS = [...(t ?? [])].filter((x) => !set.has(x));
            diffs.push(`${n}: hex-only {${only.join(',')}} spec-only {${onlyS.join(',')}}`);
          }
        }
      }
      if (!same) anyDiff = true;
      console.log(`  ${(root + '@' + lv).padEnd(12)}${(H.size + '/' + S.size).padStart(16)}${(eh + '/' + es).padStart(14)}   ${same ? 'IDENTICAL' : 'DIFFERENT — ' + diffs[0]}`);
    }
  }
  ck(anyDiff, '06\'s claim "the two families do NOT have the same tile-adjacency graph" is borne out on real patches',
     anyDiff ? 'adjacency really differs' : 'the adjacency graphs are IDENTICAL under the tile bijection, so 06\'s refutation #1 is WRONG as stated');
}

// ===========================================================================
// G2. sigma across all 9 types, both families, and k = 2..5.
// ===========================================================================

function main(): void {
  console.log('ADVERSARIAL AUDIT of fass-proof/06-family-reduction.ts');
  sectionA();
  sectionB();
  sectionC();
  sectionD();
  sectionE();
  sectionF();
  sectionG();
  sectionH();
  head('SUMMARY');
  console.log(`  failures: ${FAIL}   notes: ${NOTE}`);
  process.exit(FAIL === 0 ? 0 : 1);
}
main();
