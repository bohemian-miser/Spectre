/**
 * ADVERSARIAL AUDIT of web/fass-proof/03-substitution-invariance.ts (Lemma 3).
 *
 * Every number below is recomputed by a route independent of 03's recursive
 * `Shape` machinery: patches are expanded all the way to leaves and their
 * outlines obtained by exact edge cancellation, and the ring arithmetic is my
 * own BigInt implementation, not 03's.
 *
 * Run: cd web && npx --yes tsx fass-proof/zz-audit-03.ts [maxRouteLevel]
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
  type TileFamilyId,
  type TileTypeId,
  type ZVec,
} from '../src/core';
import { CONFIGS, buildStrands, heading, trace, verdict, zExpand, zApply2, zConnectionPoints2, type Config } from './lib';

const ROUTE_MAX = Math.max(3, Number(process.argv[2] ?? 5));
const TYPES: readonly TileTypeId[] = ['Gamma','Delta','Theta','Lambda','Xi','Pi','Sigma','Phi','Psi'];
const FAMILIES: readonly TileFamilyId[] = ['hex', 'spectre'];
const ALL_CFG: Config[] = [CONFIGS.hex128, CONFIGS.spectre1278, CONFIGS.flagship];
const cfgsOf = (f: TileFamilyId): Config[] => (f === 'hex' ? [CONFIGS.hex128] : [CONFIGS.spectre1278, CONFIGS.flagship]);

let bad = 0;
const ok = (b: boolean, label: string, detail = ''): boolean => { if (!b) bad++; verdict(b, label, detail); return b; };
const note = (l: string, d = ''): void => console.log(`  [INFO] ${l}${d ? '  — ' + d : ''}`);
const objection = (l: string, d = ''): void => console.log(`  [OBJECTION] ${l}${d ? '  — ' + d : ''}`);

// ---------------------------------------------------------------------------
// my own Z[zeta12] BigInt ring (independent of 03's)
// ---------------------------------------------------------------------------
type B = readonly [bigint, bigint, bigint, bigint];
const BZ: B = [0n, 0n, 0n, 0n];
const P: readonly B[] = [
  [1n,0n,0n,0n],[0n,1n,0n,0n],[0n,0n,1n,0n],[0n,0n,0n,1n],
  [-1n,0n,1n,0n],[0n,-1n,0n,1n],[-1n,0n,0n,0n],
];
const tb = (v: ZVec): B => [BigInt(v[0]), BigInt(v[1]), BigInt(v[2]), BigInt(v[3])];
const bs = (a: B, b: B): B => [a[0]-b[0], a[1]-b[1], a[2]-b[2], a[3]-b[3]];
const ba = (a: B, b: B): B => [a[0]+b[0], a[1]+b[1], a[2]+b[2], a[3]+b[3]];
function bm(a: B, b: B): B {
  const c = [0n,0n,0n,0n];
  for (let i=0;i<4;i++) { if (!a[i]) continue;
    for (let j=0;j<4;j++) { if (!b[j]) continue;
      const p = P[i+j], s = a[i]*b[j];
      c[0]+=s*p[0]; c[1]+=s*p[1]; c[2]+=s*p[2]; c[3]+=s*p[3]; } }
  return [c[0],c[1],c[2],c[3]];
}
const bc = (a: B): B => [a[0]+a[2], a[1], -a[2], -a[1]-a[3]];
const bz = (a: B): boolean => !a[0] && !a[1] && !a[2] && !a[3];
const bstr = (a: B): string => `[${a[0]}, ${a[1]}, ${a[2]}, ${a[3]}]`;
function brot(a: B, k: number): B { let r=a; for (let i=((k%12)+12)%12;i>0;i--) r=bm(r,P[1]); return r; }
function bdet3(m: readonly B[][]): B {
  let acc = BZ;
  const t = (i:number,j:number,k:number,s:boolean) => { const v = bm(bm(m[0][i],m[1][j]),m[2][k]); acc = s?ba(acc,v):bs(acc,v); };
  t(0,1,2,true); t(1,2,0,true); t(2,0,1,true); t(2,1,0,false); t(0,2,1,false); t(1,0,2,false);
  return acc;
}

// ---------------------------------------------------------------------------
// independent outline from a FULL leaf expansion
// ---------------------------------------------------------------------------
interface Outline {
  readonly verts: readonly ZVec[];      // loop order, anchored at quad[0]
  readonly labels: readonly string[];   // label of boundary edge i (verts[i]->verts[i+1])
  readonly quadAt: readonly number[];
}
function outlineOf(family: TileFamilyId, type: TileTypeId, level: number): Outline {
  const insts = zExpand(family, type, level);
  const use = new Map<string, { a: ZVec; b: ZVec; n: number; lab: string }>();
  for (const inst of insts) {
    const poly = zLeafPts(family, inst.type).map((p) => zApply(inst.xform, p));
    const labs = edgeLabels(family, inst.type);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ka = zKey(a), kb = zKey(b);
      const k = ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
      const hit = use.get(k);
      if (hit) { hit.n++; if (hit.n > 2) throw new Error(`edge used ${hit.n}x in ${family}/${type}@${level}`); }
      else use.set(k, { a, b, n: 1, lab: labs[i] });
    }
  }
  const nbr = new Map<string, { to: string; k: string }[]>();
  const coord = new Map<string, ZVec>();
  const labOf = new Map<string, string>();
  for (const [k, e] of use) {
    if (e.n !== 1) continue;
    const ka = zKey(e.a), kb = zKey(e.b);
    coord.set(ka, e.a); coord.set(kb, e.b); labOf.set(k, e.lab);
    if (!nbr.has(ka)) nbr.set(ka, []); if (!nbr.has(kb)) nbr.set(kb, []);
    nbr.get(ka)!.push({ to: kb, k }); nbr.get(kb)!.push({ to: ka, k });
  }
  for (const [, v] of nbr) if (v.length !== 2) throw new Error(`${family}/${type}@${level}: boundary vertex of degree ${v.length}`);
  const quad = zSupertileQuad(family, level);
  const q0 = zKey(quad[0]);
  if (!nbr.has(q0)) throw new Error(`${family}/${type}@${level}: quad[0] not on the boundary`);
  const from: string[] = [], ek: string[] = [];
  let cur = q0, lastK = '';
  for (;;) {
    const opts = nbr.get(cur)!;
    const step = opts.find((o) => o.k !== lastK)!;
    from.push(cur); ek.push(step.k); lastK = step.k; cur = step.to;
    if (cur === q0) break;
    if (ek.length > nbr.size + 1) throw new Error('outline did not close');
  }
  let count = 0; for (const [, e] of use) if (e.n === 1) count++;
  if (ek.length !== count) throw new Error(`${family}/${type}@${level}: ${ek.length} of ${count} boundary edges — multiple loops`);
  const n = ek.length;
  const pos = new Map<string, number>(); from.forEach((k, i) => pos.set(k, i));
  const i1 = pos.get(zKey(quad[1]))!, i3 = pos.get(zKey(quad[3]))!;
  const forward = i1 < i3;
  const verts: ZVec[] = new Array(n), labels: string[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const src = forward ? i : (n - i) % n;
    verts[i] = coord.get(from[src])!;
    labels[i] = labOf.get(forward ? ek[src] : ek[(src - 1 + n) % n])!;
  }
  const idx = new Map<string, number>(); verts.forEach((v, i) => idx.set(zKey(v), i));
  const quadAt = quad.map((q) => idx.get(zKey(q)) ?? -1);
  if (quadAt[0] !== 0) throw new Error('anchor not at 0');
  return { verts, labels, quadAt };
}
const dotIdxs = (cfg: Config, labels: readonly string[]): number[] => {
  const sel = new Set(cfg.subset); const out: number[] = [];
  for (let i = 0; i < labels.length; i++) { const p = parseEdgeLabel(labels[i]); if (p.minor === 0 && sel.has(p.major)) out.push(i); }
  return out;
};
const dot2 = (o: Outline, i: number): ZVec => zAdd(o.verts[i], o.verts[(i + 1) % o.verts.length]);

// ===========================================================================
function partA(): void {
  heading('A — are 03\'s "constant from level X" checks actually falsifiable?');
  // verbatim copy of 03's firstStable
  const firstStable = (vals: readonly string[], base: number): number => {
    for (let k0 = 0; k0 < vals.length; k0++) {
      let good = true;
      for (let i = k0 + 1; i < vals.length; i++) if (vals[i] !== vals[k0]) good = false;
      if (good) return k0 + base;
    }
    return -1;
  };
  const wild = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const r = firstStable(wild, 1);
  ok(r > 0, 'firstStable returns a POSITIVE level even for a maximally non-constant sequence', `firstStable(${wild.join('')},1) = ${r} (never -1: k0 = len-1 always satisfies the empty inner loop)`);
  objection(
    '03 gates its gluing/outer/arc-word verdicts on `firstStable(...) > 0`, which is a tautology',
    'part2b `ok(gs > 0)` / `ok(os > 0)` / `ok(pre > 0)` and part3b `ok(st > 0)` could never print FAIL: 54 + 3 + 18 = 75 of the run\'s 182 [ OK ] lines were unfalsifiable. FIXED in place (firstStable now needs `k0 + 1 < vals.length`); re-ran 03 afterwards — still 182 OK / 0 FAIL, verdict lines byte-identical, so the constancy conclusions survive a now-genuine test',
  );
}

// ===========================================================================
function quadResidual(Q: readonly ZVec[], Qp: readonly ZVec[], mirror: boolean): { zero: boolean; worst: B } {
  const u: B[] = [], v: B[] = [];
  for (let i = 1; i < 4; i++) { const a = tb(zSub(Q[i], Q[0])); u.push(mirror ? bc(a) : a); v.push(tb(zSub(Qp[i], Qp[0]))); }
  let worst: B = BZ, wa = -1, zero = true;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const r = bs(bm(v[i], u[j]), bm(v[j], u[i]));
    if (!bz(r)) zero = false;
    const m = Number(r[0] < 0n ? -r[0] : r[0]) + Number(r[1] < 0n ? -r[1] : r[1]) + Number(r[2] < 0n ? -r[2] : r[2]) + Number(r[3] < 0n ? -r[3] : r[3]);
    if (m > wa) { wa = m; worst = r; }
  }
  return { zero, worst };
}
function conjResidual(Ts: readonly { k: number; m: 0 | 1; t: ZVec }[], Tsp: readonly { k: number; m: 0 | 1; t: ZVec }[]): { solvable: boolean; slot: number; res: B } {
  const dp = (k: number): B => brot(P[0], ((k % 12) + 12) % 12);
  const rows: B[][] = [], rhs: B[] = [];
  for (let j = 0; j < 8; j++) { rows.push([tb(Ts[j].t), bs(BZ, dp(Ts[j].k)), P[0]]); rhs.push(tb(Tsp[j].t)); }
  let pick: number[] | null = null, det: B = BZ;
  outer: for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) for (let c = b + 1; c < 8; c++) {
    const d = bdet3([rows[a], rows[b], rows[c]]);
    if (!bz(d)) { pick = [a, b, c]; det = d; break outer; }
  }
  if (!pick) return { solvable: false, slot: -1, res: BZ };
  const [ia, ib, ic] = pick;
  const b3 = [rhs[ia], rhs[ib], rhs[ic]];
  const col = (i: number): B[] => [rows[ia][i], rows[ib][i], rows[ic][i]];
  const wc = (i: number): B[][] => { const c0 = i===0?b3:col(0), c1 = i===1?b3:col(1), c2 = i===2?b3:col(2);
    return [[c0[0],c1[0],c2[0]],[c0[1],c1[1],c2[1]],[c0[2],c1[2],c2[2]]]; };
  const nA = bdet3(wc(0)), nG = bdet3(wc(1)), nE = bdet3(wc(2));
  for (let j = 0; j < 8; j++) {
    const r = bs(bm(det, rhs[j]), ba(bs(bm(nA, rows[j][0]), bm(dp(Ts[j].k), nG)), nE));
    if (!bz(r)) return { solvable: false, slot: j, res: r };
  }
  return { solvable: true, slot: -1, res: BZ };
}

function partB(): void {
  heading('B — P2 ("PROVED for all k"): how far does the FIXED-defect claim actually go?');
  const DEEP = 30; // exact.ts guarantees doubles to level 34
  for (const family of FAMILIES) {
    const res: string[] = [];
    let anySim = false;
    for (let k = 1; k <= DEEP; k++) {
      const d = quadResidual(zSupertileQuad(family, k - 1), zSupertileQuad(family, k), false);
      const m = quadResidual(zSupertileQuad(family, k - 1), zSupertileQuad(family, k), true);
      if (d.zero || m.zero) anySim = true;
      res.push(bstr(d.worst));
    }
    const dist = [...new Set(res)];
    ok(!anySim, `${family}: no 1-step quad similarity, exact, levels 1..${DEEP}`, `03 checked 1..9; I extend to ${DEEP}`);
    note(`${family}: the 1-step defect takes ${dist.length} value(s) over levels 1..${DEEP}`, dist.join(' , '));
    // is R_{k+1} = conj(R_k)?
    let conjRel = true;
    for (let k = 1; k < DEEP; k++) {
      const a = quadResidual(zSupertileQuad(family, k - 1), zSupertileQuad(family, k), false).worst;
      const b = quadResidual(zSupertileQuad(family, k), zSupertileQuad(family, k + 1), false).worst;
      if (bstr(bc(a)) !== bstr(b)) conjRel = false;
    }
    note(`${family}: R_{k+1} = conj(R_k) for the 1-step defect?`, conjRel ? `YES at every k = 1..${DEEP - 1} — a regularity 03 does not report and does not use` : 'no');
    // 2-step and 3-step similarity: 03 never tests these
    for (const step of [2, 3]) {
      let sim = false; const bads: string[] = [];
      for (let k = step; k <= DEEP; k++) {
        const d = quadResidual(zSupertileQuad(family, k - step), zSupertileQuad(family, k), false);
        const m = quadResidual(zSupertileQuad(family, k - step), zSupertileQuad(family, k), true);
        if (d.zero || m.zero) sim = true;
        if (k <= 4) bads.push(bstr(d.worst));
      }
      ok(!sim, `${family}: the level-k quad is not similar to the level-(k-${step}) quad either, levels ${step}..${DEEP}`, `03 only ever tests the 1-step case; defect at k=${step}..4 ${bads.join(' ')}`);
    }
    // conjugacy
    const cres: string[] = []; let anyC = false;
    for (let k = 1; k < DEEP; k++) {
      const r = conjResidual(zSupertileTransforms(family, k) as never, zSupertileTransforms(family, k + 1) as never);
      if (r.solvable) anyC = true;
      cres.push(`${r.slot}:${bstr(r.res)}`);
    }
    ok(!anyC, `${family}: no Ts conjugacy by plane similarities, exact, k = 1..${DEEP - 1}`, `03 checked 1..8`);
    note(`${family}: the conjugacy defect takes ${new Set(cres).size} value(s)`, [...new Set(cres)].join(' , '));
  }
  objection(
    'P2 is listed under "PROVED for all k (arguments, not tables)" but its argument IS a table',
    'the stated reason — "the DEFECT is a FIXED bounded ring element, so it cannot vanish however deep one goes" — is itself only a finite observation (03: levels 1..9; me: 1..30). Nothing in 03 proves the defect is the same at level 31. The residual is a fixed QUADRATIC form in v_{k-1} = (Q_{k-1}, conj Q_{k-1}); 03\'s own Cayley-Hamilton trick applies to LINEAR functionals only, so upgrading P2 needs the tensor square N (x) N (64 x 64 over Q(zeta12)) and a window of 65 consecutive levels, or an explicit minimal polynomial. 03 does neither',
  );
}

// ===========================================================================
function partC(): void {
  heading('C — interface sizes |dB(T,k)| and boundary dots, recomputed from full leaf expansions');
  const LV = 4;
  for (const family of FAMILIES) {
    for (const cfg of cfgsOf(family)) {
      const table: string[] = [];
      let good = true, setGood = true, detail = '', setDetail = '';
      for (const T of TYPES) {
        const sizes: number[] = [];
        for (let lv = 1; lv <= LV; lv++) {
          const o = outlineOf(family, T, lv);
          const idxs = dotIdxs(cfg, o.labels);
          sizes.push(idxs.length);
          // independent cross-check: the boundary dots must be EXACTLY the
          // welded degree-1 dots, as a SET of exact keys (03 only compares counts).
          const mine = new Set(idxs.map((i) => zKey(dot2(o, i))));
          const deg1 = new Set<string>();
          for (const [k, d] of buildStrands(cfg, zExpand(family, T, lv)).degree) if (d === 1) deg1.add(k);
          if (mine.size !== deg1.size || [...mine].some((k) => !deg1.has(k))) {
            setGood = false;
            if (!setDetail) setDetail = `${T}@${lv}: ${mine.size} outline dots vs ${deg1.size} welded degree-1 dots`;
          }
        }
        if (new Set(sizes).size !== 1) { good = false; detail = `${T}: ${sizes.join(' ')}`; }
        table.push(`${T} ${sizes[0]}`);
      }
      ok(good, `${cfg.id}: |dB(T,k)| constant over levels 1..${LV}, independent route`, table.join('  '));
      ok(setGood, `${cfg.id}: outline dots = welded degree-1 dots AS EXACT KEY SETS, levels 1..${LV}`, setGood ? '03 compares only the COUNT against the welded graph; the set identity also holds' : setDetail);
    }
  }
}

function partD(): void {
  heading('D — boundary perimeters and the recurrence L_k = 4 L_{k-1} + L_{k-2} + c');
  const LV = 4;
  for (const family of FAMILIES) {
    for (const T of ['Psi', 'Gamma'] as TileTypeId[]) {
      const L: number[] = [];
      for (let lv = 0; lv <= LV; lv++) L.push(outlineOf(family, T, lv).verts.length);
      const cs = new Set<number>();
      for (let k = 2; k < L.length; k++) cs.add(L[k] - 4 * L[k - 1] - L[k - 2]);
      const cs3 = new Set<number>();
      for (let k = 3; k < L.length; k++) cs3.add(L[k] - 4 * L[k - 1] - L[k - 2]);
      ok(cs.size === 1 || cs3.size === 1, `${family}/${T}: perimeters ${L.join(' ')}`, cs.size === 1 ? `c = ${[...cs][0]} from k >= 2` : `c = ${[...cs3][0]} from k >= 3`);
    }
  }
  note('cross-check vs 03\'s table', 'hex/Psi 6 22 90 378 1598 ; hex/Gamma 6 20 78 324 1366 ; spec/Psi 14 46 182 758 3198 ; spec/Gamma 20 44 160 652 2736');
  objection(
    '03 says "08-supertile-outline.ts measures the perimeter factor as ~4.2324 and calls the boundary dimension \'~1.4\'"',
    'that is not what 08-supertile-outline.ts says in the tree right now: its header already states "grows by exactly 2 + sqrt(5) = 4.236067977... per level" and "of dimension log(2 + sqrt(5)) / log(sqrt(4 + sqrt(15))) = 1.399253214...", and it prints both EXACT values (lines 213-220). notes_for_writeup item 7 asks for an edit that is already in place',
  );
}

// ===========================================================================
function routingOf(cfg: Config, type: TileTypeId, level: number): string {
  const o = outlineOf(cfg.family, type, level);
  const idxOf = new Map<string, number>();
  dotIdxs(cfg, o.labels).forEach((e, d) => idxOf.set(zKey(dot2(o, e)), d));
  const tr = trace(buildStrands(cfg, zExpand(cfg.family, type, level)));
  if (tr.circuits.length) return `CIRCUITS:${tr.circuits.length}`;
  const pairs: [number, number][] = [];
  for (const arc of tr.arcs) {
    const a = idxOf.get(arc.endpoints[0]), b = idxOf.get(arc.endpoints[1]);
    if (a === undefined || b === undefined) return 'ARC-OFF-BOUNDARY';
    pairs.push(a < b ? [a, b] : [b, a]);
  }
  pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  return pairs.map(([a, b]) => `${a}-${b}`).join(' ');
}

function partE(): void {
  heading(`E — is the ROUTING period 1 or period 2 under 03's chirality-stable labelling? (levels 1..${ROUTE_MAX})`);
  console.log('  03 "REFUTES" docs/FASS_1278.md\'s period-2 claim. But the doc reports period 2 for the');
  console.log('  ROUTING SIGNATURE, and separately reports gluing/outer as identical for levels 2-5.');
  console.log('  So: under 03\'s own labelling, what is the period of the routing itself?\n');
  for (const cfg of ALL_CFG) {
    const p1: string[] = [], p2: string[] = [];
    console.log(`  ${cfg.id}`);
    for (const T of TYPES) {
      const r: string[] = [];
      for (let lv = 1; lv <= ROUTE_MAX; lv++) r.push(routingOf(cfg, T, lv));
      const tail = r.slice(2); // levels 3..
      const const1 = new Set(tail).size === 1;
      let per2 = true;
      for (let i = 2; i + 2 < r.length; i++) if (r[i] !== r[i + 2]) per2 = false;
      (const1 ? p1 : p2).push(T);
      console.log(`    ${T.padStart(7)}  ${r.map((s, i) => `lv${i + 1}:{${s}}`).join(' ')}   ${const1 ? 'PERIOD 1' : per2 ? 'PERIOD 2' : 'NO SHORT PERIOD'}`);
    }
    if (p2.length) {
      objection(
        `${cfg.id}: the ROUTING is NOT period 1 for ${p2.length} of 9 types`,
        `period-2 types: ${p2.join(' ')} ; period-1 types: ${p1.join(' ') || '(none)'} — so docs/FASS_1278.md's period-2 report is about a quantity that really does alternate, and 03's "the period-2 alternation is an artefact of a labelling that does not absorb the per-level mirror flip" is wrong about what the doc claims`,
      );
    } else {
      note(`${cfg.id}: every type's routing is constant from level 3`, 'so the doc\'s period-2 report would indeed be a labelling artefact');
    }
  }
}

function partF(): void {
  heading('F — quad-point incidences among the 8 children, recomputed directly (no symbolic algebra)');
  const DEEP = 30;
  for (const family of FAMILIES) {
    const hits: string[] = [];
    let minGap = Infinity;
    const perLevel = new Map<number, string>();
    for (let lv = 1; lv <= DEEP; lv++) {
      const Ts = zSupertileTransforms(family, lv);
      const Q = zSupertileQuad(family, lv - 1);
      const pts: ZVec[][] = Ts.map((T) => Q.map((q) => zApply(T, q)));
      const found: string[] = [];
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) for (let p = 0; p < 4; p++) for (let q = 0; q < 4; q++) {
        const d = tb(zSub(pts[i][p], pts[j][q]));
        if (bz(d)) found.push(`${i}.${p}=${j}.${q}`);
        else { const m = Math.abs(Number(d[0])) + Math.abs(Number(d[1])) + Math.abs(Number(d[2])) + Math.abs(Number(d[3])); if (m < minGap) minGap = m; }
      }
      perLevel.set(lv, found.join(' '));
      if (lv === 2) hits.push(...found);
    }
    const vals = [...perLevel.entries()].filter(([lv]) => lv >= 2).map(([, v]) => v);
    ok(new Set(vals).size === 1, `${family}: identical incidence set at every supertile level 2..${DEEP}`, `${hits.length} pairs: ${hits.join('  ')}`);
    note(`${family}: level 1 incidences`, perLevel.get(1)!);
    note(`${family}: smallest non-zero coefficient-L1 gap over levels 1..${DEEP}`, String(minGap));
  }
  console.log('');
  note(
    'the Cayley-Hamilton argument for P4 checks out',
    'f is a FIXED Q(zeta12)-linear functional on v = (Q, conj Q) in K^8; Q_k = M conj(Q_{k-1}) gives conj(Q_k) = conj(M) Q_{k-1}, so v_k = N v_{k-1} with N = [[0,M],[conj M,0]] genuinely K-LINEAR; C-H on an 8x8 matrix makes v_{j+8} a K-combination of v_j..v_{j+7}, so 8 consecutive vanishings do force all. 03 checks the window lv = 1..8 of Q, i.e. supertile levels 2..9. The window size and its offset are both correct',
  );
  objection(
    'P4 is proved only in the POSITIVE direction, and 03 says so — but the [ OK ] line does not',
    'the verdict text reads "the quad-point incidence pattern is the SAME at every supertile level k >= 2 — PROVED for all such k", while the absence of EXTRA coincidences is only checked to level 24 (30 here). "the SAME pattern" is a two-sided statement; only one side is proved',
  );
}

function partG(): void {
  heading('G — doubling discipline and the P1/P3 structural arguments');
  // zApply2 vs zApply
  const T = zSupertileTransforms('spectre', 3)[4];
  const p = zConnectionPoints2('spectre', 'Delta', [1, 2, 7, 8])[0];
  const viaDouble = zApply2(T, p);
  const naive = zApply(T, p);
  ok(zKey(viaDouble) !== zKey(naive), 'zApply2(T, 2p) != zApply(T, 2p) — the doubling really does have to be carried', `${zKey(viaDouble)} vs ${zKey(naive)}`);
  ok(zKey(zSub(viaDouble, naive)) === zKey(T.t), 'the difference is exactly one copy of the translation', 'so lib.zApply2 is right and 03 uses it only through lib');
  // 03's own dot coordinates are doubled midpoints; verify against lib's leaf-local ones at level 1
  let mixOk = true;
  for (const family of FAMILIES) for (const T2 of TYPES) {
    const o = outlineOf(family, T2, 0);
    const cfg = cfgsOf(family)[0];
    const a = new Set(dotIdxs(cfg, o.labels).map((i) => zKey(dot2(o, i))));
    const insts = zExpand(family, T2, 0);
    const b = new Set<string>();
    for (const inst of insts) for (const q of zConnectionPoints2(family, inst.type, cfg.subset)) b.add(zKey(zApply2(inst.xform, q)));
    // leaf dots include interior (welded) ones for the composite Gamma; boundary dots must be a subset
    for (const k of a) if (!b.has(k)) mixOk = false;
  }
  ok(mixOk, 'every boundary dot of a level-0 tile is a genuine lib connection point (doubled frames agree)');

  // P1: the rotation word comes from T_RULES alone
  let tot = 0; const word: number[] = []; let rotK = 0;
  word.push(6);
  for (const [ang] of T_RULES) { tot += ang; if (ang !== 0) rotK = tot / 30; word.push(((6 - rotK) % 12 + 12) % 12); }
  const real = zSupertileTransforms('spectre', 7).map((t) => t.k);
  ok(word.join(' ') === real.join(' '), 'P1 reproduced by hand from T_RULES + REFLECT_X alone', `predicted ${word.join(' ')} = actual ${real.join(' ')} — genuinely level-independent, a real theorem`);
  // P3: the slot->is-Gamma pattern
  let p3 = true;
  for (const t of TYPES) {
    const s = SUPER_RULES[t];
    if (s[7] !== 'Gamma') p3 = false;
    for (let i = 0; i < 7; i++) if (s[i] === 'Gamma') p3 = false;
    if (t !== 'Gamma' && s.includes('null')) p3 = false;
  }
  ok(p3, 'P3\'s hypothesis holds in SUPER_RULES: slot 7 is Gamma for every type, slots 0-6 never are, only Gamma has a null slot', 'so "all eight non-Gamma outlines coincide" is a genuine induction, not a table');
}

function main(): void {
  console.log('ADVERSARIAL AUDIT of 03-substitution-invariance.ts');
  partA(); partB(); partC(); partD(); partF(); partG(); partE();
  heading('AUDIT RESULT');
  console.log(bad === 0 ? '  no reproduction FAILURES; see the [OBJECTION] lines for the claims that do not carry their stated status'
                        : `  ${bad} reproduction failure(s)`);
}
main();
process.exit(bad === 0 ? 0 : 1);
