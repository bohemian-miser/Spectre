/**
 * zz-audit-01.ts — ADVERSARIAL AUDIT of fass-proof/01-local-structure.ts.
 *
 * Nothing here trusts that script. Every headline number it reports is
 * recomputed by a DIFFERENT route and compared:
 *   A  core's FLOAT pipeline (buildSystem/flatten/connectionPoints/transPt,
 *      welded by rounding) vs the exact doubled-lattice census;
 *   B  arc counts by ACTUAL tracing vs the (#degree-1)/2 shortcut;
 *   C  brute force over all 511 selections, WITHOUT the per-class shortcut;
 *   D  transversal-crossing scan with a wider broad phase and an orientation
 *      predicate that is BigInt all the way down (no float gate at all);
 *   E  orientation of every stored leaf polygon (01's cornerCensus assumes CCW
 *      without checking, unlike its tilingCheck);
 *   F  label compatibility incl. the class-0 minors reversal, levels 1..5;
 *   G  the chosen matchings, from comboToMatchingIndices;
 *   H  can a SINGLE tile put two dots at one point? (the step 01's (1c) skips);
 *   I  crossing scan at levels 4 and 5;
 *   J  are the 1-corner class-0 centres really all on the patch boundary?
 *   K  is any interior edge dotted on one side only? ("degree EXACTLY 2");
 *   L  exact zExpand vs float flatten as POINT SETS, ids and types included;
 *   M  level-6 tile counts from the SUPER_RULES transfer matrix, no geometry;
 *   N  level-6 dot/edge census, streamed.
 *
 * Run: cd web && npx tsx fass-proof/zz-audit-01.ts        (skips L/M/N)
 *      cd web && DEEP=1 NODE_OPTIONS=--max-old-space-size=8192 \
 *                npx tsx fass-proof/zz-audit-01.ts        (adds level 6, ~10 min)
 * Exits non-zero on any disagreement. Writes nothing.
 */

import {
  buildSystem, flatten, connectionPoints, comboToMatchingIndices, enumerateMatchings,
  leafOrder, leafPts, metaEdges, edgeLabels, parseEdgeLabel, transPt, SUPER_RULES,
  zAdd, zApply, zConj, zKey, zLeafPts, zRot, zSub, zToPt, Z_ONE,
  type Pt, type TileFamilyId, type TileTypeId, type ZVec,
} from '../src/core';
import { CONFIGS, buildStrands, trace, zExpand } from './lib';

const FAIL: string[] = [];
function chk(ok: boolean, label: string, detail = ''): void {
  console.log(`  [${ok ? ' OK ' : 'FAIL'}] ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) FAIL.push(label + ' :: ' + detail);
}
function hd(s: string) { console.log(`\n${'='.repeat(76)}\n${s}\n${'='.repeat(76)}`); }

// ---- local re-implementation of dot placement (independent of 01's dotSpecs) --
// Deliberately written from core's *float* connectionPoints semantics, then
// lifted to exact by recognising which of {edge midpoint, edge endpoint} it is.
interface Spot { kind: 'mid' | 'v0' | 'v1'; edgeIndex: number; major: number }
function spots(family: TileFamilyId, type: TileTypeId, sel: ReadonlySet<number>): Spot[] {
  const labels = edgeLabels(family, type);
  const seams = metaEdges(family, type);
  const pts = leafPts(family, type);
  const n = pts.length;
  const cps = connectionPoints(family, type, sel);
  const out: Spot[] = [];
  let c = 0;
  for (let i = 0; i < labels.length; i++) {
    const p = parseEdgeLabel(labels[i]);
    if (p.minor !== 0 || !sel.has(p.major)) continue;
    const seam = seams.find((s) => s.edgeIndices.includes(i));
    if (!seam) continue;
    const target = cps[c++].pt;
    // identify the physical edge + position purely from the FLOAT point
    let found: Spot | null = null;
    for (let e = 0; e < n && !found; e++) {
      const a = pts[e], b = pts[(e + 1) % n];
      const cand: [Spot, Pt][] = [
        [{ kind: 'mid', edgeIndex: e, major: p.major }, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }],
        [{ kind: 'v0', edgeIndex: e, major: p.major }, a],
        [{ kind: 'v1', edgeIndex: e, major: p.major }, b],
      ];
      for (const [s, q] of cand) if (Math.hypot(q.x - target.x, q.y - target.y) < 1e-9) { found = s; break; }
    }
    if (!found) throw new Error(`cannot localise dot ${family}/${type}#${c - 1}`);
    out.push(found);
  }
  return out;
}
function dot2(W: readonly ZVec[], s: Spot): ZVec {
  const n = W.length;
  if (s.kind === 'mid') return zAdd(W[s.edgeIndex], W[(s.edgeIndex + 1) % n]);
  const v = s.kind === 'v0' ? W[s.edgeIndex] : W[(s.edgeIndex + 1) % n];
  return zAdd(v, v);
}
function worldVerts(family: TileFamilyId, root: TileTypeId, level: number) {
  const insts = zExpand(family, root, level);
  return insts.map((i) => ({ type: i.type, W: zLeafPts(family, i.type).map((p) => zApply(i.xform, p)) }));
}

// ===========================================================================
hd('A — float pipeline (core buildSystem/flatten/connectionPoints) vs exact census');
// Completely separate code path: float transforms, float welding by rounding.
for (const cfg of [CONFIGS.hex128, CONFIGS.spectre1278]) {
  for (const root of ['Psi', 'Delta', 'Gamma'] as TileTypeId[]) {
    const lv = 4;
    const sys = buildSystem(cfg.family, lv);
    const insts = flatten(sys[root]);
    const sel = new Set(cfg.subset);
    const cache = new Map<string, readonly Pt[]>();
    const mult = new Map<string, number>();
    for (const inst of insts) {
      let lp = cache.get(inst.type);
      if (!lp) { lp = connectionPoints(cfg.family, inst.type, sel).map((c) => c.pt); cache.set(inst.type, lp); }
      for (const p of lp) {
        const w = transPt(inst.xform, p);
        const k = `${Math.round(w.x * 1e6)},${Math.round(w.y * 1e6)}`;
        mult.set(k, (mult.get(k) ?? 0) + 1);
      }
    }
    let m1 = 0, m2 = 0, m3 = 0;
    for (const m of mult.values()) { if (m === 1) m1++; else if (m === 2) m2++; else m3++; }
    // exact route
    const pv = worldVerts(cfg.family, root, lv);
    const sp = new Map<TileTypeId, Spot[]>();
    const emult = new Map<string, number>();
    for (const t of pv) {
      let s = sp.get(t.type); if (!s) { s = spots(cfg.family, t.type, sel); sp.set(t.type, s); }
      for (const q of s) { const k = zKey(dot2(t.W, q)); emult.set(k, (emult.get(k) ?? 0) + 1); }
    }
    let e1 = 0, e2 = 0, e3 = 0;
    for (const m of emult.values()) { if (m === 1) e1++; else if (m === 2) e2++; else e3++; }
    chk(insts.length === pv.length && mult.size === emult.size && m1 === e1 && m2 === e2 && m3 === e3,
      `${cfg.id} ${root}@${lv}: float census == exact census`,
      `tiles ${insts.length}/${pv.length} dots ${mult.size}/${emult.size} m1 ${m1}/${e1} m2 ${m2}/${e2} m>=3 ${m3}/${e3}`);
  }
}

// ===========================================================================
hd('B — arc count by ACTUAL tracing vs the (#degree-1)/2 shortcut');
for (const cfg of [CONFIGS.hex128, CONFIGS.spectre1278]) {
  for (const root of ['Psi', 'Delta', 'Gamma'] as TileTypeId[]) {
    for (const lv of [1, 2, 3, 4]) {
      const st = buildStrands(cfg, zExpand(cfg.family, root, lv));
      const tr = trace(st);
      let d1 = 0; for (const d of st.degree.values()) if (d === 1) d1++;
      const expect = root === 'Psi' ? 1 : root === 'Delta' ? 4 : 5;
      chk(tr.arcs.length === d1 / 2 && tr.arcs.length === expect && tr.circuits.length === 0
          && tr.tilesCovered === st.instances.length,
        `${cfg.id} ${root}@${lv}: traced arcs == deg1/2 == ${expect}`,
        `arcs ${tr.arcs.length}, deg1/2 ${d1 / 2}, circuits ${tr.circuits.length}, covered ${tr.tilesCovered}/${st.instances.length}`);
    }
  }
}

// ===========================================================================
hd('C — brute force over ALL 511 selections (no per-class shortcut)');
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  for (const root of ['Psi', 'Delta'] as TileTypeId[]) {
    for (const lv of [3, 4]) {
      const pv = worldVerts(family, root, lv);
      // per-class dot keys, computed independently per class
      const perClass: Map<number, Map<string, number>> = new Map();
      for (let c = 0; c <= 8; c++) perClass.set(c, new Map());
      const sp = new Map<TileTypeId, Spot[]>();
      for (const t of pv) {
        let s = sp.get(t.type);
        if (!s) { s = spots(family, t.type, new Set([0, 1, 2, 3, 4, 5, 6, 7, 8])); sp.set(t.type, s); }
        for (const q of s) {
          const m = perClass.get(q.major)!;
          const k = zKey(dot2(t.W, q));
          m.set(k, (m.get(k) ?? 0) + 1);
        }
      }
      let worst = 0; let worstSel = '';
      for (let mask = 1; mask < 512; mask++) {
        const acc = new Map<string, number>();
        for (let c = 0; c <= 8; c++) {
          if (!(mask & (1 << c))) continue;
          for (const [k, v] of perClass.get(c)!) acc.set(k, (acc.get(k) ?? 0) + v);
        }
        let w = 0; for (const v of acc.values()) if (v > w) w = v;
        if (w > worst) { worst = w; worstSel = mask.toString(2); }
      }
      chk(worst <= 2, `${family} ${root}@${lv}: brute force over all 511 selections, max dot multiplicity`,
        `= ${worst} (worst mask ${worstSel})`);
    }
  }
}

// ===========================================================================
hd('D — independent transversal-crossing scan (different broad phase)');
function orient2(a: ZVec, b: ZVec, c: ZVec): number {
  // exact via BigInt throughout — no float gate anywhere
  const u = zSub(b, a), v = zSub(c, a);
  // cross = Im(conj(u) * v)
  const cu = zConj(u);
  const cf = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) cf[i + j] += cu[i] * v[j];
  const w = [cf[0] - cf[4] - cf[6], cf[1] - cf[5], cf[2] + cf[4], cf[3] + cf[5]];
  const A = BigInt(w[1] + 2 * w[3]); const B = BigInt(w[2]);
  if (A === 0n && B === 0n) return 0;
  if (A >= 0n && B >= 0n) return 1;
  if (A <= 0n && B <= 0n) return -1;
  const l = A * A, r = 3n * B * B;
  if (l === r) return 0;
  return l > r ? (A > 0n ? 1 : -1) : (B > 0n ? 1 : -1);
}
function cross2(a: ZVec, b: ZVec, c: ZVec, d: ZVec): boolean {
  const d1 = orient2(a, b, c), d2 = orient2(a, b, d);
  if (d1 === 0 || d2 === 0 || d1 === d2) return false;
  const d3 = orient2(c, d, a), d4 = orient2(c, d, b);
  return d3 !== 0 && d4 !== 0 && d3 !== d4;
}
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  for (const root of ['Psi', 'Delta', 'Gamma'] as TileTypeId[]) {
    const lv = 3;
    const pv = worldVerts(family, root, lv);
    const edges = new Map<string, [ZVec, ZVec]>();
    for (const t of pv) {
      const n = t.W.length;
      for (let i = 0; i < n; i++) {
        const a = t.W[i], b = t.W[(i + 1) % n];
        const ka = zKey(a), kb = zKey(b);
        edges.set(ka < kb ? `${ka}#${kb}` : `${kb}#${ka}`, ka < kb ? [a, b] : [b, a]);
      }
    }
    const list = [...edges.values()];
    // broad phase: bucket by rounded midpoint, scan radius 2 (vs 01's radius 1)
    const cell = new Map<string, number[]>();
    const mids = list.map(([a, b]) => {
      const pa = zToPt(a), pb = zToPt(b);
      return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
    });
    for (let i = 0; i < list.length; i++) {
      const k = `${Math.round(mids[i].x)},${Math.round(mids[i].y)}`;
      let l = cell.get(k); if (!l) { l = []; cell.set(k, l); }
      l.push(i);
    }
    let x = 0; let pairs = 0;
    for (let i = 0; i < list.length; i++) {
      const cx = Math.round(mids[i].x), cy = Math.round(mids[i].y);
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
        for (const j of cell.get(`${cx + dx},${cy + dy}`) ?? []) {
          if (j <= i) continue;
          pairs++;
          if (cross2(list[i][0], list[i][1], list[j][0], list[j][1])) x++;
        }
      }
    }
    chk(x === 0, `${family} ${root}@${lv}: independent crossing scan (radius-2 buckets, all-BigInt predicate)`,
      `${list.length} edges, ${pairs} candidate pairs tested, ${x} transversal crossings`);
  }
}

// ===========================================================================
hd('E — corner census: does 01 assume local leaf polygons are CCW?');
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  const signs: string[] = [];
  for (const t of leafOrder(family)) {
    const p = zLeafPts(family, t);
    // shoelace sign
    let P = 0, Q = 0;
    for (let i = 0; i < p.length; i++) {
      const a = zConj(p[i]), b = p[(i + 1) % p.length];
      const cf = [0, 0, 0, 0, 0, 0, 0];
      for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) cf[x + y] += a[x] * b[y];
      const w = [cf[0] - cf[4] - cf[6], cf[1] - cf[5], cf[2] + cf[4], cf[3] + cf[5]];
      P += w[1] + 2 * w[3]; Q += w[2];
    }
    const s = P + Q * Math.sqrt(3);
    signs.push(`${t}:${s > 0 ? 'CCW' : 'CW'}`);
  }
  chk(signs.every((s) => s.endsWith('CCW')), `${family}: every leaf polygon table is CCW as stored`, signs.join(' '));
}

// ===========================================================================
hd('F — does the class-0 "minors reversed" gluing hold at deeper levels?');
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  for (const lv of [1, 2, 3, 4, 5]) {
    const pv = worldVerts(family, 'Psi', lv);
    const use = new Map<string, [number, number][]>();
    for (let ii = 0; ii < pv.length; ii++) {
      const W = pv[ii].W, n = W.length;
      for (let e = 0; e < n; e++) {
        const ka = zKey(W[e]), kb = zKey(W[(e + 1) % n]);
        const k = ka < kb ? `${ka}#${kb}` : `${kb}#${ka}`;
        let l = use.get(k); if (!l) { l = []; use.set(k, l); } l.push([ii, e]);
      }
    }
    let bad = 0, shared = 0, zeroShared = 0;
    for (const l of use.values()) {
      if (l.length !== 2) continue;
      shared++;
      const [iA, eA] = l[0], [iB, eB] = l[1];
      const la = parseEdgeLabel(edgeLabels(family, pv[iA].type)[eA]);
      const lb = parseEdgeLabel(edgeLabels(family, pv[iB].type)[eB]);
      let ok: boolean;
      if (la.major !== lb.major) ok = false;
      else if (la.major === 0) {
        zeroShared++;
        const mA = metaEdges(family, pv[iA].type).find((s) => s.edgeIndices.includes(eA))!.edgeIndices.length;
        const mB = metaEdges(family, pv[iB].type).find((s) => s.edgeIndices.includes(eB))!.edgeIndices.length;
        ok = la.sign === lb.sign && mA === mB && la.minor + lb.minor === mA - 1;
      } else ok = la.minor === lb.minor && la.sign === -lb.sign;
      if (!ok) bad++;
    }
    chk(bad === 0, `${family} Psi@${lv}: label compatibility on every shared edge`,
      `${shared} shared edges (${zeroShared} class-0), ${bad} bad`);
  }
}

// ===========================================================================
hd('G — chosen matchings: recompute globally from comboToMatchingIndices');
for (const cfg of [CONFIGS.hex128, CONFIGS.spectre1278]) {
  const idx = comboToMatchingIndices(cfg.family, cfg.subset, cfg.combo);
  const order = leafOrder(cfg.family);
  let ok = true; const rows: string[] = [];
  for (let i = 0; i < order.length; i++) {
    const n = connectionPoints(cfg.family, order[i], new Set(cfg.subset)).length;
    const ms = enumerateMatchings(n);
    const m = ms[idx[i]];
    if (n % 2 !== 0 || !m || m.length * 2 !== n) { ok = false; rows.push(`${order[i]}:BAD(n=${n},idx=${idx[i]})`); continue; }
    const seen = new Set<number>();
    for (const [a, b] of m) { if (seen.has(a) || seen.has(b)) ok = false; seen.add(a); seen.add(b); }
    if (seen.size !== n) ok = false;
    rows.push(`${order[i]}:${n}/${idx[i]}`);
  }
  chk(ok, `${cfg.id}: perfect matching for every leaf type (independent route)`, rows.join(' '));
}

// ---------------------------------------------------------------------------
hd('O — cross-check against the repo\'s PRE-EXISTING graph_analysis/lvl4.csv');
// Row `0101000000,...,1278` of that file was produced by an older, independent
// pipeline. It must agree with the exact library tail-for-tail.
{
  const fs = require('fs') as typeof import('fs');
  const csv = fs.readFileSync('../graph_analysis/lvl4.csv', 'utf8').split('\n');
  const row = csv.find((l) => l.startsWith('0101000000,') && l.trim().endsWith('1278'));
  const st = buildStrands(CONFIGS.spectre1278, zExpand('spectre', 'Delta', 4));
  const tr = trace(st);
  const mine = tr.arcs.map((a) => a.segIdxs.length).sort((a, b) => a - b);
  const want = row ? [...row.matchAll(/(\d+): (\d+)/g)].flatMap((m) => Array(Number(m[2])).fill(Number(m[1]))).sort((a, b) => a - b) : [];
  chk(row !== undefined && tr.circuits.length === 0 && JSON.stringify(mine) === JSON.stringify(want),
    'spectre 1278/0101000000 Delta@4: tail multiset matches graph_analysis/lvl4.csv',
    `mine [${mine.join(',')}] vs csv [${want.join(',')}], circuits ${tr.circuits.length}`);
}

hd('AUDIT VERDICT');
if (FAIL.length === 0) console.log('  all independent checks agree with 01-local-structure.ts');
else { console.log(`  ${FAIL.length} DISAGREEMENT(S):`); for (const f of FAIL) console.log('   - ' + f); process.exitCode = 1; }


// ---------------------------------------------------------------------------
hd('H — can a SINGLE tile put two dots at the same point? (step (1c) skips this)');
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  for (const sub of [[1, 2, 8], [1, 2, 7, 8], [0, 1, 2, 3, 4, 5, 6, 7, 8]]) {
    let worst = 0; let where = '';
    for (const t of leafOrder(family)) {
      const cps = connectionPoints(family, t, new Set(sub)).map((c) => c.pt);
      for (let i = 0; i < cps.length; i++) for (let j = i + 1; j < cps.length; j++) {
        if (Math.hypot(cps[i].x - cps[j].x, cps[i].y - cps[j].y) < 1e-9) { worst++; where = `${t}#${i}=${j}`; }
      }
    }
    chk(worst === 0, `${family} S={${sub.join(',')}}: no leaf type has two coincident dots`, where || 'none');
  }
}

// ---------------------------------------------------------------------------
hd('I — crossing scan at levels 4 and 5 with radius-2 float buckets');
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  for (const lv of [4, 5]) {
    const insts = zExpand(family, 'Psi', lv);
    const edges = new Map<string, [ZVec, ZVec]>();
    for (const i of insts) {
      const W = zLeafPts(family, i.type).map((p) => zApply(i.xform, p));
      for (let e = 0; e < W.length; e++) {
        const a = W[e], b = W[(e + 1) % W.length];
        const ka = zKey(a), kb = zKey(b);
        edges.set(ka < kb ? `${ka}#${kb}` : `${kb}#${ka}`, ka < kb ? [a, b] : [b, a]);
      }
    }
    const list = [...edges.values()];
    const mid = list.map(([a, b]) => { const pa = zToPt(a), pb = zToPt(b); return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }; });
    const cell = new Map<string, number[]>();
    for (let i = 0; i < list.length; i++) { const k = `${Math.round(mid[i].x)},${Math.round(mid[i].y)}`; let l = cell.get(k); if (!l) { l = []; cell.set(k, l); } l.push(i); }
    let x = 0, pairs = 0;
    for (let i = 0; i < list.length; i++) {
      const cx = Math.round(mid[i].x), cy = Math.round(mid[i].y);
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (const j of cell.get(`${cx + dx},${cy + dy}`) ?? []) {
        if (j <= i) continue; pairs++;
        if (cross2(list[i][0], list[i][1], list[j][0], list[j][1])) x++;
      }
    }
    chk(x === 0, `${family} Psi@${lv}: radius-2 crossing scan`, `${list.length} edges, ${pairs} pairs, ${x} crossings`);
  }
}

// ---------------------------------------------------------------------------
hd('J — the 377 class-0 centres with one corner: really all on the patch boundary?');
{
  const family: TileFamilyId = 'spectre';
  const insts = zExpand(family, 'Psi', 4);
  const corners = new Map<string, number>();
  const centres = new Set<string>();
  const dirs = new Map<string, number>();
  const UNITK = new Map<string, number>();
  for (let k = 0; k < 12; k++) { let r: ZVec = [1, 0, 0, 0]; for (let i = 0; i < k; i++) r = [-r[3], r[0], r[1] + r[3], r[2]]; UNITK.set(zKey(r), k); }
  for (const i of insts) {
    const W = zLeafPts(family, i.type).map((p) => zApply(i.xform, p));
    const n = W.length;
    const ccw = i.xform.m === 1 ? [...W].reverse() : W;
    for (let e = 0; e < n; e++) corners.set(zKey(W[e]), (corners.get(zKey(W[e])) ?? 0) + 1);
    for (let e = 0; e < n; e++) {
      const dIn = UNITK.get(zKey(zSub(ccw[e], ccw[(e - 1 + n) % n])))!;
      const dOut = UNITK.get(zKey(zSub(ccw[(e + 1) % n], ccw[e])))!;
      const delta = (((dIn + 6 - dOut) % 12) + 12) % 12;
      let mask = dirs.get(zKey(ccw[e])) ?? 0;
      for (let s = 0; s < delta; s++) mask |= 1 << ((dOut + s) % 12);
      dirs.set(zKey(ccw[e]), mask);
    }
    for (const seam of metaEdges(family, i.type)) {
      if (seam.major !== 0) continue;
      const M = seam.edgeIndices.length;
      if (M % 2 !== 0) continue;
      const idx = seam.edgeIndices[M / 2 - 1];
      centres.add(zKey(W[(idx + 1) % n]));
    }
  }
  let one = 0, two = 0, other = 0, oneInterior = 0, twoBoundary = 0;
  for (const k of centres) {
    const c = corners.get(k) ?? 0;
    const interior = dirs.get(k) === 0xfff;
    if (c === 1) { one++; if (interior) oneInterior++; }
    else if (c === 2) { two++; if (!interior) twoBoundary++; }
    else other++;
  }
  chk(other === 0, `spectre Psi@4: ${centres.size} class-0 centres, corners`, `1x${one} 2x${two} other=${other}`);
  chk(oneInterior === 0, 'every 1-corner class-0 centre is a BOUNDARY vertex', `${oneInterior} interior exceptions`);
  console.log(`    (of the ${two} 2-corner centres, ${twoBoundary} are boundary vertices)`);
}

// ---------------------------------------------------------------------------
hd('K — is "welded degree EXACTLY 2 in the interior" implied without label compat?');
// Count interior dots whose carrying edge is shared but where the PARTNER tile's
// own label on that edge is not a selected minor-0 label. If label compat ever
// failed this count would be > 0 and interior degree would drop to 1.
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  const sub = family === 'hex' ? [1, 2, 8] : [1, 2, 7, 8];
  const sel = new Set(sub);
  for (const lv of [3, 4]) {
    const insts = zExpand(family, 'Psi', lv);
    const use = new Map<string, [number, number][]>();
    const Ws = insts.map((i) => zLeafPts(family, i.type).map((p) => zApply(i.xform, p)));
    for (let ii = 0; ii < insts.length; ii++) {
      const W = Ws[ii], n = W.length;
      for (let e = 0; e < n; e++) {
        const ka = zKey(W[e]), kb = zKey(W[(e + 1) % n]);
        const k = ka < kb ? `${ka}#${kb}` : `${kb}#${ka}`;
        let l = use.get(k); if (!l) { l = []; use.set(k, l); } l.push([ii, e]);
      }
    }
    let asym = 0, interiorDotted = 0;
    for (const l of use.values()) {
      if (l.length !== 2) continue;
      const f = l.map(([ii, e]) => {
        const p = parseEdgeLabel(edgeLabels(family, insts[ii].type)[e]);
        return p.minor === 0 && sel.has(p.major);
      });
      if (f[0] !== f[1]) asym++;
      if (f[0] && f[1]) interiorDotted++;
    }
    chk(asym === 0, `${family} Psi@${lv}: no interior edge is dotted on one side only`,
      `${interiorDotted} two-sided dotted interior edges, ${asym} one-sided`);
  }
}


if (process.env.DEEP) {

hd('L — exact zExpand vs float flatten: identical POINT SETS (not just counts)');
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  for (const root of ['Psi', 'Delta', 'Gamma'] as TileTypeId[]) {
    const lv = 3;
    const fi = flatten(buildSystem(family, lv)[root]);
    const zi = zExpand(family, root, lv);
    const fk = new Set<string>(); const zk = new Set<string>();
    for (const i of fi) for (const p of leafPts(family, i.type)) {
      const w = transPt(i.xform, p); fk.add(`${Math.round(w.x * 1e6)},${Math.round(w.y * 1e6)}`);
    }
    for (const i of zi) for (const p of zLeafPts(family, i.type)) {
      const w = zToPt(zApply(i.xform, p)); zk.add(`${Math.round(w.x * 1e6)},${Math.round(w.y * 1e6)}`);
    }
    let miss = 0; for (const k of fk) if (!zk.has(k)) miss++;
    let extra = 0; for (const k of zk) if (!fk.has(k)) extra++;
    // also per-instance id/type alignment
    let typeMismatch = 0;
    for (let i = 0; i < Math.min(fi.length, zi.length); i++) if (fi[i].type !== zi[i].type || fi[i].id !== zi[i].id) typeMismatch++;
    chk(miss === 0 && extra === 0 && fi.length === zi.length && typeMismatch === 0,
      `${family} ${root}@${lv}: exact and float patches are the SAME point set`,
      `${fi.length}/${zi.length} tiles, ${fk.size}/${zk.size} vertices, miss ${miss} extra ${extra}, id/type mismatches ${typeMismatch}`);
  }
}

hd('M — level-6 tile counts from the SUPER_RULES transfer matrix (no geometry)');
const TYPES = Object.keys(SUPER_RULES);
function countAt(root: string, level: number, split: boolean): number {
  let v = new Map<string, number>(TYPES.map((t) => [t, t === root ? 1 : 0]));
  for (let i = 0; i < level; i++) {
    const w = new Map<string, number>(TYPES.map((t) => [t, 0]));
    for (const [t, c] of v) { if (!c) continue; for (const s of SUPER_RULES[t]) if (s !== 'null') w.set(s, (w.get(s) ?? 0) + c); }
    v = w;
  }
  let n = 0; for (const [t, c] of v) n += c * (split && t === 'Gamma' ? 2 : 1);
  return n;
}
const expect: Record<string, number> = {
  'hex/Delta/6': 242047, 'hex/Psi/6': 242047, 'hex/Gamma/6': 211303,
  'spectre/Delta/6': 272791, 'spectre/Psi/6': 272791, 'spectre/Gamma/6': 238142,
  'hex/Delta/5': 30744, 'spectre/Delta/5': 34649,
};
for (const [k, want] of Object.entries(expect)) {
  const [fam, root, lv] = k.split('/');
  const got = countAt(root, Number(lv), fam !== 'hex');
  chk(got === want, `${k}: transfer-matrix tile count`, `${got} vs reported ${want}`);
}

hd('N — level-6 dot/edge census, streamed (independent of 01, low memory)');
for (const cfg of [CONFIGS.hex128, CONFIGS.spectre1278]) {
  for (const root of ['Delta', 'Psi', 'Gamma'] as TileTypeId[]) {
    const lv = 6;
    const sel = new Set(cfg.subset);
    const spotCache = new Map<TileTypeId, number[]>();  // physical edge indices carrying a dot
    for (const t of leafOrder(cfg.family)) {
      const labels = edgeLabels(cfg.family, t);
      const seams = metaEdges(cfg.family, t);
      const out: number[] = [];
      for (let i = 0; i < labels.length; i++) {
        const p = parseEdgeLabel(labels[i]);
        if (p.minor !== 0 || !sel.has(p.major) || p.major === 0) continue;
        if (seams.find((s) => s.edgeIndices.includes(i))) out.push(i);
      }
      spotCache.set(t, out);
    }
    const insts = zExpand(cfg.family, root, lv);
    const dot = new Map<string, number>();
    const edge = new Map<string, number>();
    for (const inst of insts) {
      const L = zLeafPts(cfg.family, inst.type);
      const n = L.length;
      const W: ZVec[] = new Array(n);
      for (let i = 0; i < n; i++) W[i] = zApply(inst.xform, L[i]);
      for (let e = 0; e < n; e++) {
        const a = zKey(W[e]), b = zKey(W[(e + 1) % n]);
        const k = a < b ? `${a}#${b}` : `${b}#${a}`;
        edge.set(k, (edge.get(k) ?? 0) + 1);
      }
      for (const e of spotCache.get(inst.type)!) {
        const k = zKey(zAdd(W[e], W[(e + 1) % n]));
        dot.set(k, (dot.get(k) ?? 0) + 1);
      }
    }
    let m1 = 0, m2 = 0, m3 = 0; for (const m of dot.values()) { if (m === 1) m1++; else if (m === 2) m2++; else m3++; }
    let bd = 0, inte = 0, gt2 = 0; for (const m of edge.values()) { if (m === 1) bd++; else if (m === 2) inte++; else gt2++; }
    const arcs = root === 'Psi' ? 1 : root === 'Delta' ? 4 : 5;
    console.log(`    ${cfg.family.padEnd(8)} ${root.padEnd(6)}@6  tiles ${String(insts.length).padStart(7)}  dots ${String(dot.size).padStart(7)}  m1 ${String(m1).padStart(3)}  m2 ${String(m2).padStart(7)}  m>=3 ${m3}  edges ${String(edge.size).padStart(8)}  bd ${String(bd).padStart(6)}  edge>2 ${gt2}`);
    chk(m3 === 0 && gt2 === 0 && m1 / 2 === arcs, `${cfg.id} ${root}@6: m>=3 = 0, edge>2 = 0, arcs = ${arcs}`, `m1=${m1}`);
  }
}


}


hd('AUDIT VERDICT');
if (FAIL.length === 0) console.log('  all independent checks agree with 01-local-structure.ts');
else { console.log(`  ${FAIL.length} DISAGREEMENT(S):`); for (const f of FAIL) console.log('   - ' + f); process.exitCode = 1; }


// ---------------------------------------------------------------------------
hd('H — can a SINGLE tile put two dots at the same point? (step (1c) skips this)');
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  for (const sub of [[1, 2, 8], [1, 2, 7, 8], [0, 1, 2, 3, 4, 5, 6, 7, 8]]) {
    let worst = 0; let where = '';
    for (const t of leafOrder(family)) {
      const cps = connectionPoints(family, t, new Set(sub)).map((c) => c.pt);
      for (let i = 0; i < cps.length; i++) for (let j = i + 1; j < cps.length; j++) {
        if (Math.hypot(cps[i].x - cps[j].x, cps[i].y - cps[j].y) < 1e-9) { worst++; where = `${t}#${i}=${j}`; }
      }
    }
    chk(worst === 0, `${family} S={${sub.join(',')}}: no leaf type has two coincident dots`, where || 'none');
  }
}

// ---------------------------------------------------------------------------
hd('I — crossing scan at levels 4 and 5 with radius-2 float buckets');
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  for (const lv of [4, 5]) {
    const insts = zExpand(family, 'Psi', lv);
    const edges = new Map<string, [ZVec, ZVec]>();
    for (const i of insts) {
      const W = zLeafPts(family, i.type).map((p) => zApply(i.xform, p));
      for (let e = 0; e < W.length; e++) {
        const a = W[e], b = W[(e + 1) % W.length];
        const ka = zKey(a), kb = zKey(b);
        edges.set(ka < kb ? `${ka}#${kb}` : `${kb}#${ka}`, ka < kb ? [a, b] : [b, a]);
      }
    }
    const list = [...edges.values()];
    const mid = list.map(([a, b]) => { const pa = zToPt(a), pb = zToPt(b); return { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }; });
    const cell = new Map<string, number[]>();
    for (let i = 0; i < list.length; i++) { const k = `${Math.round(mid[i].x)},${Math.round(mid[i].y)}`; let l = cell.get(k); if (!l) { l = []; cell.set(k, l); } l.push(i); }
    let x = 0, pairs = 0;
    for (let i = 0; i < list.length; i++) {
      const cx = Math.round(mid[i].x), cy = Math.round(mid[i].y);
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (const j of cell.get(`${cx + dx},${cy + dy}`) ?? []) {
        if (j <= i) continue; pairs++;
        if (cross2(list[i][0], list[i][1], list[j][0], list[j][1])) x++;
      }
    }
    chk(x === 0, `${family} Psi@${lv}: radius-2 crossing scan`, `${list.length} edges, ${pairs} pairs, ${x} crossings`);
  }
}

// ---------------------------------------------------------------------------
hd('J — the 377 class-0 centres with one corner: really all on the patch boundary?');
{
  const family: TileFamilyId = 'spectre';
  const insts = zExpand(family, 'Psi', 4);
  const corners = new Map<string, number>();
  const centres = new Set<string>();
  const dirs = new Map<string, number>();
  const UNITK = new Map<string, number>();
  for (let k = 0; k < 12; k++) { let r: ZVec = [1, 0, 0, 0]; for (let i = 0; i < k; i++) r = [-r[3], r[0], r[1] + r[3], r[2]]; UNITK.set(zKey(r), k); }
  for (const i of insts) {
    const W = zLeafPts(family, i.type).map((p) => zApply(i.xform, p));
    const n = W.length;
    const ccw = i.xform.m === 1 ? [...W].reverse() : W;
    for (let e = 0; e < n; e++) corners.set(zKey(W[e]), (corners.get(zKey(W[e])) ?? 0) + 1);
    for (let e = 0; e < n; e++) {
      const dIn = UNITK.get(zKey(zSub(ccw[e], ccw[(e - 1 + n) % n])))!;
      const dOut = UNITK.get(zKey(zSub(ccw[(e + 1) % n], ccw[e])))!;
      const delta = (((dIn + 6 - dOut) % 12) + 12) % 12;
      let mask = dirs.get(zKey(ccw[e])) ?? 0;
      for (let s = 0; s < delta; s++) mask |= 1 << ((dOut + s) % 12);
      dirs.set(zKey(ccw[e]), mask);
    }
    for (const seam of metaEdges(family, i.type)) {
      if (seam.major !== 0) continue;
      const M = seam.edgeIndices.length;
      if (M % 2 !== 0) continue;
      const idx = seam.edgeIndices[M / 2 - 1];
      centres.add(zKey(W[(idx + 1) % n]));
    }
  }
  let one = 0, two = 0, other = 0, oneInterior = 0, twoBoundary = 0;
  for (const k of centres) {
    const c = corners.get(k) ?? 0;
    const interior = dirs.get(k) === 0xfff;
    if (c === 1) { one++; if (interior) oneInterior++; }
    else if (c === 2) { two++; if (!interior) twoBoundary++; }
    else other++;
  }
  chk(other === 0, `spectre Psi@4: ${centres.size} class-0 centres, corners`, `1x${one} 2x${two} other=${other}`);
  chk(oneInterior === 0, 'every 1-corner class-0 centre is a BOUNDARY vertex', `${oneInterior} interior exceptions`);
  console.log(`    (of the ${two} 2-corner centres, ${twoBoundary} are boundary vertices)`);
}

// ---------------------------------------------------------------------------
hd('K — is "welded degree EXACTLY 2 in the interior" implied without label compat?');
// Count interior dots whose carrying edge is shared but where the PARTNER tile's
// own label on that edge is not a selected minor-0 label. If label compat ever
// failed this count would be > 0 and interior degree would drop to 1.
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  const sub = family === 'hex' ? [1, 2, 8] : [1, 2, 7, 8];
  const sel = new Set(sub);
  for (const lv of [3, 4]) {
    const insts = zExpand(family, 'Psi', lv);
    const use = new Map<string, [number, number][]>();
    const Ws = insts.map((i) => zLeafPts(family, i.type).map((p) => zApply(i.xform, p)));
    for (let ii = 0; ii < insts.length; ii++) {
      const W = Ws[ii], n = W.length;
      for (let e = 0; e < n; e++) {
        const ka = zKey(W[e]), kb = zKey(W[(e + 1) % n]);
        const k = ka < kb ? `${ka}#${kb}` : `${kb}#${ka}`;
        let l = use.get(k); if (!l) { l = []; use.set(k, l); } l.push([ii, e]);
      }
    }
    let asym = 0, interiorDotted = 0;
    for (const l of use.values()) {
      if (l.length !== 2) continue;
      const f = l.map(([ii, e]) => {
        const p = parseEdgeLabel(edgeLabels(family, insts[ii].type)[e]);
        return p.minor === 0 && sel.has(p.major);
      });
      if (f[0] !== f[1]) asym++;
      if (f[0] && f[1]) interiorDotted++;
    }
    chk(asym === 0, `${family} Psi@${lv}: no interior edge is dotted on one side only`,
      `${interiorDotted} two-sided dotted interior edges, ${asym} one-sided`);
  }
}


if (process.env.DEEP) {

hd('L — exact zExpand vs float flatten: identical POINT SETS (not just counts)');
for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  for (const root of ['Psi', 'Delta', 'Gamma'] as TileTypeId[]) {
    const lv = 3;
    const fi = flatten(buildSystem(family, lv)[root]);
    const zi = zExpand(family, root, lv);
    const fk = new Set<string>(); const zk = new Set<string>();
    for (const i of fi) for (const p of leafPts(family, i.type)) {
      const w = transPt(i.xform, p); fk.add(`${Math.round(w.x * 1e6)},${Math.round(w.y * 1e6)}`);
    }
    for (const i of zi) for (const p of zLeafPts(family, i.type)) {
      const w = zToPt(zApply(i.xform, p)); zk.add(`${Math.round(w.x * 1e6)},${Math.round(w.y * 1e6)}`);
    }
    let miss = 0; for (const k of fk) if (!zk.has(k)) miss++;
    let extra = 0; for (const k of zk) if (!fk.has(k)) extra++;
    // also per-instance id/type alignment
    let typeMismatch = 0;
    for (let i = 0; i < Math.min(fi.length, zi.length); i++) if (fi[i].type !== zi[i].type || fi[i].id !== zi[i].id) typeMismatch++;
    chk(miss === 0 && extra === 0 && fi.length === zi.length && typeMismatch === 0,
      `${family} ${root}@${lv}: exact and float patches are the SAME point set`,
      `${fi.length}/${zi.length} tiles, ${fk.size}/${zk.size} vertices, miss ${miss} extra ${extra}, id/type mismatches ${typeMismatch}`);
  }
}

hd('M — level-6 tile counts from the SUPER_RULES transfer matrix (no geometry)');
const TYPES = Object.keys(SUPER_RULES);
function countAt(root: string, level: number, split: boolean): number {
  let v = new Map<string, number>(TYPES.map((t) => [t, t === root ? 1 : 0]));
  for (let i = 0; i < level; i++) {
    const w = new Map<string, number>(TYPES.map((t) => [t, 0]));
    for (const [t, c] of v) { if (!c) continue; for (const s of SUPER_RULES[t]) if (s !== 'null') w.set(s, (w.get(s) ?? 0) + c); }
    v = w;
  }
  let n = 0; for (const [t, c] of v) n += c * (split && t === 'Gamma' ? 2 : 1);
  return n;
}
const expect: Record<string, number> = {
  'hex/Delta/6': 242047, 'hex/Psi/6': 242047, 'hex/Gamma/6': 211303,
  'spectre/Delta/6': 272791, 'spectre/Psi/6': 272791, 'spectre/Gamma/6': 238142,
  'hex/Delta/5': 30744, 'spectre/Delta/5': 34649,
};
for (const [k, want] of Object.entries(expect)) {
  const [fam, root, lv] = k.split('/');
  const got = countAt(root, Number(lv), fam !== 'hex');
  chk(got === want, `${k}: transfer-matrix tile count`, `${got} vs reported ${want}`);
}

hd('N — level-6 dot/edge census, streamed (independent of 01, low memory)');
for (const cfg of [CONFIGS.hex128, CONFIGS.spectre1278]) {
  for (const root of ['Delta', 'Psi', 'Gamma'] as TileTypeId[]) {
    const lv = 6;
    const sel = new Set(cfg.subset);
    const spotCache = new Map<TileTypeId, number[]>();  // physical edge indices carrying a dot
    for (const t of leafOrder(cfg.family)) {
      const labels = edgeLabels(cfg.family, t);
      const seams = metaEdges(cfg.family, t);
      const out: number[] = [];
      for (let i = 0; i < labels.length; i++) {
        const p = parseEdgeLabel(labels[i]);
        if (p.minor !== 0 || !sel.has(p.major) || p.major === 0) continue;
        if (seams.find((s) => s.edgeIndices.includes(i))) out.push(i);
      }
      spotCache.set(t, out);
    }
    const insts = zExpand(cfg.family, root, lv);
    const dot = new Map<string, number>();
    const edge = new Map<string, number>();
    for (const inst of insts) {
      const L = zLeafPts(cfg.family, inst.type);
      const n = L.length;
      const W: ZVec[] = new Array(n);
      for (let i = 0; i < n; i++) W[i] = zApply(inst.xform, L[i]);
      for (let e = 0; e < n; e++) {
        const a = zKey(W[e]), b = zKey(W[(e + 1) % n]);
        const k = a < b ? `${a}#${b}` : `${b}#${a}`;
        edge.set(k, (edge.get(k) ?? 0) + 1);
      }
      for (const e of spotCache.get(inst.type)!) {
        const k = zKey(zAdd(W[e], W[(e + 1) % n]));
        dot.set(k, (dot.get(k) ?? 0) + 1);
      }
    }
    let m1 = 0, m2 = 0, m3 = 0; for (const m of dot.values()) { if (m === 1) m1++; else if (m === 2) m2++; else m3++; }
    let bd = 0, inte = 0, gt2 = 0; for (const m of edge.values()) { if (m === 1) bd++; else if (m === 2) inte++; else gt2++; }
    const arcs = root === 'Psi' ? 1 : root === 'Delta' ? 4 : 5;
    console.log(`    ${cfg.family.padEnd(8)} ${root.padEnd(6)}@6  tiles ${String(insts.length).padStart(7)}  dots ${String(dot.size).padStart(7)}  m1 ${String(m1).padStart(3)}  m2 ${String(m2).padStart(7)}  m>=3 ${m3}  edges ${String(edge.size).padStart(8)}  bd ${String(bd).padStart(6)}  edge>2 ${gt2}`);
    chk(m3 === 0 && gt2 === 0 && m1 / 2 === arcs, `${cfg.id} ${root}@6: m>=3 = 0, edge>2 = 0, arcs = ${arcs}`, `m1=${m1}`);
  }
}


}

// ---------------------------------------------------------------------------
hd('O — cross-check against the repo\'s PRE-EXISTING graph_analysis/lvl4.csv');
// Row `0101000000,...,1278` of that file was produced by an older, independent
// pipeline. It must agree with the exact library tail-for-tail.
{
  const fs = require('fs') as typeof import('fs');
  const csv = fs.readFileSync('../graph_analysis/lvl4.csv', 'utf8').split('\n');
  const row = csv.find((l) => l.startsWith('0101000000,') && l.trim().endsWith('1278'));
  const st = buildStrands(CONFIGS.spectre1278, zExpand('spectre', 'Delta', 4));
  const tr = trace(st);
  const mine = tr.arcs.map((a) => a.segIdxs.length).sort((a, b) => a - b);
  const want = row ? [...row.matchAll(/(\d+): (\d+)/g)].flatMap((m) => Array(Number(m[2])).fill(Number(m[1]))).sort((a, b) => a - b) : [];
  chk(row !== undefined && tr.circuits.length === 0 && JSON.stringify(mine) === JSON.stringify(want),
    'spectre 1278/0101000000 Delta@4: tail multiset matches graph_analysis/lvl4.csv',
    `mine [${mine.join(',')}] vs csv [${want.join(',')}], circuits ${tr.circuits.length}`);
}

hd('AUDIT VERDICT');
if (FAIL.length === 0) console.log('  every independent recomputation agrees with 01-local-structure.ts');
else { console.log(`  ${FAIL.length} DISAGREEMENT(S):`); for (const f of FAIL) console.log('   - ' + f); process.exitCode = 1; }
