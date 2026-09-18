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

function main(): void {
  console.log('ADVERSARIAL AUDIT of fass-proof/06-family-reduction.ts');
  sectionA();
  sectionB();
  sectionC();
  sectionD();
  head('SUMMARY');
  console.log(`  failures: ${FAIL}   notes: ${NOTE}`);
  process.exit(FAIL === 0 ? 0 : 1);
}
main();
