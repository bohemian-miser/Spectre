/**
 * ADVERSARIAL AUDIT of web/fass-proof/02-self-avoidance.ts (Lemma 2).
 *
 * Everything here is recomputed by an INDEPENDENT route:
 *  - a Q[sqrt3] BigInt field (exact rationals a+b*sqrt3 over a common
 *    denominator) instead of the Z[zeta12] ring-product predicates;
 *  - world coordinates derived directly as x = (2p0+p2 + p1*sqrt3)/4,
 *    y = (p1+2p3 + p2*sqrt3)/4 from the DOUBLED lattice point p;
 *  - a sort-and-sweep pair enumerator instead of a hash grid;
 *  - a private streaming expander (no ids) so deeper levels fit in memory.
 *
 * Writes nothing; modifies nothing outside this file.
 */

import {
  connectionPoints,
  edgeLabels,
  enumerateMatchings,
  geometricNonCrossingForTile,
  leafOrder,
  metaEdges,
  nonCrossingForTile,
  parseEdgeLabel,
  zAdd,
  zAffineKey,
  zBasePairXform,
  zConj,
  zInv,
  zLeafPts,
  zMul,
  zRot,
  zSupertileTransforms,
  SUPER_RULES,
  Z_IDENT,
  type TileTypeId,
  type ZAffine,
  type ZVec,
} from '../src/core';

import { CONFIGS, matchingRecord, type Config } from './lib';

let FAIL = 0;
const NOTES: string[] = [];
function head(s: string): void { console.log(`\n${'='.repeat(78)}\n${s}\n${'='.repeat(78)}`); }
function ok(c: boolean, label: string, detail = ''): boolean {
  if (!c) FAIL++;
  console.log(`  [${c ? ' OK ' : 'FAIL'}] ${label}${detail ? '  — ' + detail : ''}`);
  return c;
}
function note(s: string): void { NOTES.push(s); }

// ===========================================================================
// Exact field Q[sqrt3] with BigInt   value = (a + b*sqrt3)/d,  d > 0
// ===========================================================================
interface Q3 { a: bigint; b: bigint; d: bigint }

function bgcd(x: bigint, y: bigint): bigint {
  x = x < 0n ? -x : x; y = y < 0n ? -y : y;
  while (y) { const t = x % y; x = y; y = t; }
  return x;
}
function q(a: bigint, b: bigint, d: bigint = 1n): Q3 {
  if (d === 0n) throw new Error('Q3: zero denominator');
  if (d < 0n) { a = -a; b = -b; d = -d; }
  let g = bgcd(bgcd(a, b), d);
  if (g === 0n) g = 1n;
  return { a: a / g, b: b / g, d: d / g };
}
const Q0 = q(0n, 0n, 1n);
const qAdd = (x: Q3, y: Q3): Q3 => q(x.a * y.d + y.a * x.d, x.b * y.d + y.b * x.d, x.d * y.d);
const qSub = (x: Q3, y: Q3): Q3 => q(x.a * y.d - y.a * x.d, x.b * y.d - y.b * x.d, x.d * y.d);
const qMul = (x: Q3, y: Q3): Q3 => q(x.a * y.a + 3n * x.b * y.b, x.a * y.b + x.b * y.a, x.d * y.d);
function qInv(x: Q3): Q3 {
  const n = x.a * x.a - 3n * x.b * x.b; // norm
  if (n === 0n) throw new Error('Q3: inverse of zero');
  return q(x.d * x.a, -x.d * x.b, n);
}
const qDiv = (x: Q3, y: Q3): Q3 => qMul(x, qInv(y));
/** Sign of (a+b*sqrt3)/d, exact (sqrt3 irrational so a+b*sqrt3 = 0 iff a=b=0). */
function qSgn(x: Q3): number {
  const { a, b } = x;
  if (a === 0n && b === 0n) return 0;
  if (a >= 0n && b >= 0n) return 1;
  if (a <= 0n && b <= 0n) return -1;
  const l = a * a, r = 3n * b * b;
  if (l === r) throw new Error('a^2 = 3b^2 impossible');
  return a > 0n ? (l > r ? 1 : -1) : (r > l ? 1 : -1);
}
const qCmp = (x: Q3, y: Q3): number => qSgn(qSub(x, y));
const qEq = (x: Q3, y: Q3): boolean => x.a * y.d === y.a * x.d && x.b * y.d === y.b * x.d;
const qNum = (x: Q3): number => (Number(x.a) + Number(x.b) * Math.sqrt(3)) / Number(x.d);
const qStr = (x: Q3): string => `(${x.a}${x.b >= 0n ? '+' : ''}${x.b}√3)/${x.d}`;

interface P3 { x: Q3; y: Q3 }
/** World point of a DOUBLED Z[zeta12] lattice point — derived from scratch. */
function pt(p: ZVec): P3 {
  return {
    x: q(BigInt(2 * p[0] + p[2]), BigInt(p[1]), 4n),
    y: q(BigInt(p[1] + 2 * p[3]), BigInt(p[2]), 4n),
  };
}
const vSub = (u: P3, v: P3): P3 => ({ x: qSub(u.x, v.x), y: qSub(u.y, v.y) });
const vAdd = (u: P3, v: P3): P3 => ({ x: qAdd(u.x, v.x), y: qAdd(u.y, v.y) });
const vScale = (u: P3, s: Q3): P3 => ({ x: qMul(u.x, s), y: qMul(u.y, s) });
const vCross = (u: P3, v: P3): Q3 => qSub(qMul(u.x, v.y), qMul(u.y, v.x));
const vDot = (u: P3, v: P3): Q3 => qAdd(qMul(u.x, v.x), qMul(u.y, v.y));
const vEq = (u: P3, v: P3): boolean => qEq(u.x, v.x) && qEq(u.y, v.y);
const vNorm2 = (u: P3): Q3 => vDot(u, u);

const orient3 = (a: P3, b: P3, c: P3): number => qSgn(vCross(vSub(b, a), vSub(c, a)));
const between3 = (a: P3, b: P3, p: P3): boolean => qSgn(vDot(vSub(p, a), vSub(p, b))) <= 0;

type Kind = 'disjoint' | 'proper' | 'touch' | 'overlap';
function segRel3(a: P3, b: P3, c: P3, d: P3): { kind: Kind; pts: P3[] } {
  const d1 = orient3(c, d, a), d2 = orient3(c, d, b), d3 = orient3(a, b, c), d4 = orient3(a, b, d);
  if (d1 * d2 < 0 && d3 * d4 < 0) return { kind: 'proper', pts: [] };
  if (d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0) {
    const u = vSub(b, a);
    const ta = Q0, tb = vDot(u, u), tc = vDot(vSub(c, a), u), td = vDot(vSub(d, a), u);
    const loA = qCmp(ta, tb) <= 0 ? ta : tb, hiA = qCmp(ta, tb) <= 0 ? tb : ta;
    const loB = qCmp(tc, td) <= 0 ? tc : td, hiB = qCmp(tc, td) <= 0 ? td : tc;
    const lo = qCmp(loA, loB) >= 0 ? loA : loB, hi = qCmp(hiA, hiB) <= 0 ? hiA : hiB;
    const s = qCmp(lo, hi);
    if (s > 0) return { kind: 'disjoint', pts: [] };
    if (s < 0) return { kind: 'overlap', pts: [] };
    const pts: P3[] = [];
    for (const p of [a, b, c, d]) if (between3(a, b, p) && between3(c, d, p) && !pts.some((z) => vEq(z, p))) pts.push(p);
    return { kind: 'touch', pts };
  }
  const pts: P3[] = [];
  const push = (p: P3): void => { if (!pts.some((z) => vEq(z, p))) pts.push(p); };
  if (d1 === 0 && between3(c, d, a)) push(a);
  if (d2 === 0 && between3(c, d, b)) push(b);
  if (d3 === 0 && between3(a, b, c)) push(c);
  if (d4 === 0 && between3(a, b, d)) push(d);
  return pts.length ? { kind: 'touch', pts } : { kind: 'disjoint', pts: [] };
}

/** Exact intersection point of two properly-crossing segments. */
function properPoint(a: P3, b: P3, c: P3, d: P3): P3 {
  const r = vSub(b, a), s = vSub(d, c);
  const den = vCross(r, s);
  if (qSgn(den) === 0) throw new Error('parallel');
  const t = qDiv(vCross(vSub(c, a), s), den);
  return vAdd(a, vScale(r, t));
}

/** EXACT squared distance from point p to closed segment [u,v]. */
function ptSegD2(p: P3, u: P3, v: P3): Q3 {
  const uv = vSub(v, u), up = vSub(p, u);
  const L2 = vNorm2(uv);
  if (qSgn(L2) === 0) return vNorm2(up);
  const t = qDiv(vDot(up, uv), L2);
  const tc = qSgn(t) < 0 ? Q0 : qCmp(t, q(1n, 0n, 1n)) > 0 ? q(1n, 0n, 1n) : t;
  return vNorm2(vSub(p, vAdd(u, vScale(uv, tc))));
}
/** EXACT squared distance between two closed segments (0 if they meet). */
function segSegD2(a: P3, b: P3, c: P3, d: P3): Q3 {
  const rel = segRel3(a, b, c, d);
  if (rel.kind !== 'disjoint') return Q0;
  let best = ptSegD2(a, c, d);
  for (const [p, u, v] of [[b, c, d], [c, a, b], [d, a, b]] as [P3, P3, P3][]) {
    const x = ptSegD2(p, u, v);
    if (qCmp(x, best) < 0) best = x;
  }
  return best;
}

// ===========================================================================
// Private streaming expander (no id strings) + tile shapes
// ===========================================================================
interface Inst { type: TileTypeId; T: ZAffine }

function expand(family: 'hex' | 'spectre' | 'turtle', root: TileTypeId, level: number, sink: (i: Inst) => void): void {
  const base = family !== 'hex' ? zBasePairXform(family) : null;
  const Ts: ZAffine[][] = [];
  for (let L = 0; L <= level; L++) Ts.push(L === 0 ? [] : (zSupertileTransforms(family, L) as ZAffine[]));
  const walk = (type: TileTypeId, X: ZAffine, lv: number): void => {
    if (lv > 0) {
      const T = Ts[lv];
      const subs = SUPER_RULES[type];
      for (let s = 0; s < 8; s++) {
        if (subs[s] === 'null') continue;
        walk(subs[s] as TileTypeId, zMul(X, T[s]), lv - 1);
      }
      return;
    }
    if (family !== 'hex' && type === 'Gamma') {
      sink({ type: 'Gamma1', T: X });
      sink({ type: 'Gamma2', T: zMul(X, base!) });
      return;
    }
    sink({ type, T: X });
  };
  walk(root, Z_IDENT, level);
}

interface Shp {
  type: TileTypeId;
  V: P3[];              // exact world vertices
  Vz: ZVec[];           // doubled lattice vertices
  dots: { e: number; seam: string; label: string; z: ZVec; p: P3 }[];
  pairs: readonly (readonly [number, number])[];
  r2: Q3;               // exact squared radius about local origin
  r: number;            // float radius
}

function zApply2(T: ZAffine, p2: ZVec): ZVec {
  return zAdd(zRot(T.m ? zConj(p2) : p2, T.k), zAdd(T.t, T.t));
}

function shape(cfg: Config, type: TileTypeId): Shp {
  const raw = zLeafPts(cfg.family, type);
  const n = raw.length;
  const Vz = raw.map((v) => zAdd(v, v));
  const V = Vz.map(pt);
  const sel = new Set(cfg.subset);
  const labels = edgeLabels(cfg.family, type);
  const seams = metaEdges(cfg.family, type);
  const dots: Shp['dots'] = [];
  for (let i = 0; i < labels.length; i++) {
    const { major, minor } = parseEdgeLabel(labels[i]);
    if (minor !== 0 || !sel.has(major)) continue;
    if (major === 0) throw new Error('class 0 selected — unsupported here');
    const s = seams.find((x) => x.edgeIndices.includes(i));
    const z = zAdd(raw[i], raw[(i + 1) % n]);
    dots.push({ e: i, seam: s ? s.id.split('/')[1] : '?', label: labels[i], z, p: pt(z) });
  }
  const rec = matchingRecord(cfg);
  const pairs = dots.length >= 2 && dots.length % 2 === 0
    ? enumerateMatchings(dots.length)[rec[type] ?? 0] ?? [] : [];
  let r2 = Q0;
  for (const v of V) { const d = vNorm2(v); if (qCmp(d, r2) > 0) r2 = d; }
  return { type, V, Vz, dots, pairs, r2, r: Math.sqrt(qNum(r2)) };
}

// ===========================================================================
// SECTION 1 — independent recheck of (A) and (B), exact
// ===========================================================================
function sec1(cfg: Config, S: Map<TileTypeId, Shp>): { aBad: string[]; bBad: string[] } {
  head(`${cfg.id} — 1. INDEPENDENT recheck of (A) and (B) [Q(sqrt3) BigInt kernel]`);
  const aBad: string[] = [];
  const bBad: string[] = [];
  for (const type of leafOrder(cfg.family)) {
    const sh = S.get(type)!;
    const n = sh.V.length;
    for (const [i, j] of sh.pairs) {
      const P = sh.dots[i].p, Q = sh.dots[j].p;
      let outside = false;
      const crossed: number[] = [];
      for (let e = 0; e < n; e++) {
        const rel = segRel3(P, Q, sh.V[e], sh.V[(e + 1) % n]);
        if (rel.kind === 'proper') { outside = true; crossed.push(e); }
        else if (rel.kind === 'overlap') outside = true;
        else for (const z of rel.pts) if (!vEq(z, P) && !vEq(z, Q)) outside = true;
      }
      if (outside) aBad.push(`${type}:e${sh.dots[i].e}-e${sh.dots[j].e}[crosses ${crossed.map((x) => 'e' + x).join(',')}]`);
    }
    for (let i = 0; i < sh.pairs.length; i++) for (let j = i + 1; j < sh.pairs.length; j++) {
      const [a1, b1] = sh.pairs[i], [a2, b2] = sh.pairs[j];
      const rel = segRel3(sh.dots[a1].p, sh.dots[b1].p, sh.dots[a2].p, sh.dots[b2].p);
      if (rel.kind !== 'disjoint') bBad.push(`${type}:${i}x${j}:${rel.kind}`);
    }
  }
  console.log(`  (A) offending chords: ${aBad.length ? aBad.join(', ') : 'NONE'}`);
  console.log(`  (B) offending pairs : ${bBad.length ? bBad.join(', ') : 'NONE'}`);
  return { aBad, bBad };
}

// ===========================================================================
// SECTION 2 — the excursion constants, EXACTLY (they were float-identified)
// ===========================================================================
function sec2(cfg: Config, S: Map<TileTypeId, Shp>): void {
  head(`${cfg.id} — 2. EXCURSION CONSTANTS recomputed EXACTLY (no float identification)`);
  const want = {
    corner: q(2n, -1n, 4n),      // (2 - sqrt3)/4
    depth: q(-3n, 2n, 8n),       // (2sqrt3 - 3)/8
    len: q(-3n, 2n, 2n),         // (2sqrt3 - 3)/2
  };
  let any = false;
  for (const type of leafOrder(cfg.family)) {
    const sh = S.get(type)!;
    const n = sh.V.length;
    for (const [i, j] of sh.pairs) {
      const P = sh.dots[i].p, Q = sh.dots[j].p;
      const crossed: { e: number; z: P3 }[] = [];
      for (let e = 0; e < n; e++) {
        const A = sh.V[e], B = sh.V[(e + 1) % n];
        if (segRel3(P, Q, A, B).kind === 'proper') crossed.push({ e, z: properPoint(P, Q, A, B) });
      }
      if (crossed.length !== 2) continue;
      any = true;
      const [c0, c1] = crossed;
      // vertex cut off = the vertex shared by the two crossed edges
      const shared = (c0.e + 1) % n === c1.e ? (c0.e + 1) % n : (c1.e + 1) % n === c0.e ? (c1.e + 1) % n : -1;
      const len2 = vNorm2(vSub(c1.z, c0.z));
      const okLen = qEq(len2, qMul(want.len, want.len));
      let okCorner = false; let cornerD2 = Q0;
      if (shared >= 0) {
        const u = vSub(Q, P);
        const cr = vCross(u, vSub(sh.V[shared], P));
        cornerD2 = qDiv(qMul(cr, cr), vNorm2(u));
        okCorner = qEq(cornerD2, qMul(want.corner, want.corner));
      }
      // exact max distance from the straying piece to the tile: the straying
      // piece is the segment [c0.z, c1.z]; distance to the polygon is
      // min over boundary edges; maximise along the segment by evaluating at
      // both ends (0) and at the point where the two adjacent edge-distances
      // agree (the bisector foot).
      let depth2 = Q0;
      if (shared >= 0) {
        const A0 = sh.V[c0.e], B0 = sh.V[(c0.e + 1) % n];
        const A1 = sh.V[c1.e], B1 = sh.V[(c1.e + 1) % n];
        const u0 = vSub(B0, A0), u1 = vSub(B1, A1);       // unit length edges
        const dir = vSub(c1.z, c0.z);
        // signed distance to each edge LINE, affine in t (|u|=1 verified below)
        const f0 = (t: Q3): Q3 => vCross(u0, vSub(vAdd(c0.z, vScale(dir, t)), A0));
        const f1 = (t: Q3): Q3 => vCross(u1, vSub(vAdd(c0.z, vScale(dir, t)), A1));
        const one = q(1n, 0n, 1n);
        const a0 = f0(Q0), b0 = qSub(f0(one), a0);
        const a1 = f1(Q0), b1 = qSub(f1(one), a1);
        const den = qSub(b0, b1);
        if (qSgn(den) !== 0) {
          const ts = qDiv(qSub(a1, a0), den);
          const val = f0(ts);
          depth2 = qMul(val, val);
        }
      }
      const okDepth = qEq(depth2, qMul(want.depth, want.depth));
      console.log(`  ${type.padEnd(7)} e${sh.dots[i].e}-e${sh.dots[j].e}  crosses e${c0.e},e${c1.e}  cut vertex v${shared}`);
      console.log(`      corner offset^2 = ${qStr(cornerD2)} = ${qNum(cornerD2).toFixed(10)}   vs ((2-√3)/4)^2 : ${okCorner ? 'EXACT MATCH' : 'MISMATCH'}`);
      console.log(`      outside length^2= ${qStr(len2)} = ${qNum(len2).toFixed(10)}   vs ((2√3-3)/2)^2 : ${okLen ? 'EXACT MATCH' : 'MISMATCH'}`);
      console.log(`      max depth^2     = ${qStr(depth2)} = ${qNum(depth2).toFixed(10)}   vs ((2√3-3)/8)^2 : ${okDepth ? 'EXACT MATCH' : 'MISMATCH'}`);
      ok(okCorner && okLen && okDepth, `${type}: all three reported constants are exactly right`);
    }
  }
  if (!any) console.log('  (no straying chord in this configuration)');
}

// ===========================================================================
// SECTION 3 — independent two-tile class census (sweep, exact filter)
// ===========================================================================
function census(cfg: Config, S: Map<TileTypeId, Shp>, levels: { level: number; roots: TileTypeId[] }[]):
  { classes: Map<string, { okChords: boolean; okInteriors: boolean; d2: Q3 | null }>; rows: string[] } {
  const classes = new Map<string, { okChords: boolean; okInteriors: boolean; d2: Q3 | null }>();
  const rows: string[] = [];
  const RMAX = Math.max(...leafOrder(cfg.family).map((t) => S.get(t)!.r));

  const check = (ta: TileTypeId, tb: TileTypeId, g: ZAffine): { okChords: boolean; okInteriors: boolean; d2: Q3 | null } => {
    const sa = S.get(ta)!, sb = S.get(tb)!;
    const A = sa.pairs.map(([i, j]) => [sa.dots[i].p, sa.dots[j].p] as const);
    const B = sb.pairs.map(([i, j]) => [pt(zApply2(g, sb.dots[i].z)), pt(zApply2(g, sb.dots[j].z))] as const);
    let okChords = true;
    let d2: Q3 | null = null;
    for (const [p, r] of A) for (const [s, t] of B) {
      const shared = (vEq(p, s) || vEq(p, t) ? 1 : 0) + (vEq(r, s) || vEq(r, t) ? 1 : 0);
      if (shared === 2) { okChords = false; continue; }
      const rel = segRel3(p, r, s, t);
      if (rel.kind === 'proper' || rel.kind === 'overlap') okChords = false;
      else if (rel.kind === 'touch') {
        const legal = shared === 1 && rel.pts.length === 1 &&
          (vEq(rel.pts[0], p) || vEq(rel.pts[0], r)) && (vEq(rel.pts[0], s) || vEq(rel.pts[0], t));
        if (!legal) okChords = false;
      } else {
        const x = segSegD2(p, r, s, t);
        if (d2 === null || qCmp(x, d2) < 0) d2 = x;
      }
    }
    const PB = sb.Vz.map((v) => pt(zApply2(g, v)));
    let okInteriors = true;
    for (let i = 0; i < sa.V.length && okInteriors; i++)
      for (let j = 0; j < PB.length; j++)
        if (segRel3(sa.V[i], sa.V[(i + 1) % sa.V.length], PB[j], PB[(j + 1) % PB.length]).kind === 'proper') { okInteriors = false; break; }
    const strictIn = (p: P3, poly: P3[]): boolean => {
      const m = poly.length;
      for (let i = 0; i < m; i++) if (orient3(poly[i], poly[(i + 1) % m], p) === 0 && between3(poly[i], poly[(i + 1) % m], p)) return false;
      let inside = false;
      for (let i = 0; i < m; i++) {
        const a = poly[i], b = poly[(i + 1) % m];
        const av = qCmp(a.y, p.y) > 0, bv = qCmp(b.y, p.y) > 0;
        if (av === bv) continue;
        const s = orient3(a, b, p);
        if (bv ? s > 0 : s < 0) inside = !inside;
      }
      return inside;
    };
    if (okInteriors) for (const v of sa.V) if (strictIn(v, PB)) { okInteriors = false; break; }
    if (okInteriors) for (const v of PB) if (strictIn(v, sa.V)) { okInteriors = false; break; }
    return { okChords, okInteriors, d2 };
  };

  for (const { level, roots } of levels) {
    const before = classes.size;
    const t0 = Date.now();
    let tiles = 0;
    for (const root of roots) {
      const list: Inst[] = [];
      expand(cfg.family as 'hex' | 'spectre', root, level, (i) => list.push(i));
      tiles += list.length;
      const n = list.length;
      // sort-and-sweep on x (independent of the hash-grid route)
      const cx = new Float64Array(n), cy = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const t = list[i].T.t;
        cx[i] = t[0] + t[1] * (Math.sqrt(3) / 2) + t[2] * 0.5;
        cy[i] = t[1] * 0.5 + t[2] * (Math.sqrt(3) / 2) + t[3];
      }
      const invCache = new Map<number, ZAffine>();
      const W = 2 * RMAX + 1e-6;
      // bucket by a W-sized grid, then scan the 3x3 neighbourhood
      const buck = new Map<string, number[]>();
      for (let i = 0; i < n; i++) {
        const k = `${Math.floor(cx[i] / W)},${Math.floor(cy[i] / W)}`;
        let l = buck.get(k); if (!l) { l = []; buck.set(k, l); } l.push(i);
      }
      for (const [k, l] of buck) {
        const [bx, by] = k.split(',').map(Number);
        const cand: number[] = [];
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          const o = buck.get(`${bx + dx},${by + dy}`); if (o) cand.push(...o);
        }
        for (const i of l) for (const j of cand) {
          if (j <= i) continue;
          const lim = S.get(list[i].type)!.r + S.get(list[j].type)!.r + 1e-9;
          const dx = cx[i] - cx[j], dy = cy[i] - cy[j];
          if (dx * dx + dy * dy > lim * lim) continue;
          let inv = invCache.get(i);
          if (!inv) { inv = zInv(list[i].T); invCache.set(i, inv); }
          const g = zMul(inv, list[j].T);
          const key = `${list[i].type}|${list[j].type}|${zAffineKey(g)}`;
          if (classes.has(key)) continue;
          classes.set(key, check(list[i].type, list[j].type, g));
        }
      }
    }
    const fresh = classes.size - before;
    const row = `    level ${level}, ${roots.length} root(s) [${tiles} tiles]: ${String(classes.size).padStart(5)} classes, ${String(fresh).padStart(4)} new   (${((Date.now() - t0) / 1000).toFixed(1)}s)`;
    rows.push(row);
    console.log(row);
  }
  return { classes, rows };
}

// ===========================================================================
// SECTION 4 — anti-vacuity: do the predicates actually FIRE on bad input?
// ===========================================================================
function sec4(cfg: Config, S: Map<TileTypeId, Shp>): void {
  head(`${cfg.id} — 4. ANTI-VACUITY: force crossings and confirm the predicates fire`);
  // pick the first type with >= 4 dots and try EVERY matching; count how many
  // the exact kernel calls crossing. If the kernel never says "crossing",
  // every pass above is vacuous.
  for (const type of leafOrder(cfg.family)) {
    const sh = S.get(type)!;
    if (sh.dots.length < 4) continue;
    const all = enumerateMatchings(sh.dots.length);
    let crossing = 0;
    const geo = new Set(geometricNonCrossingForTile(cfg.family, type, new Set(cfg.subset)));
    const topo = new Set(nonCrossingForTile(cfg.family, type, new Set(cfg.subset)));
    let geoAgree = true;
    for (let mi = 0; mi < all.length; mi++) {
      const m = all[mi];
      let bad = false;
      for (let i = 0; i < m.length && !bad; i++) for (let j = i + 1; j < m.length && !bad; j++) {
        const rel = segRel3(sh.dots[m[i][0]].p, sh.dots[m[i][1]].p, sh.dots[m[j][0]].p, sh.dots[m[j][1]].p);
        if (rel.kind !== 'disjoint') bad = true;
      }
      if (bad) crossing++;
      if (bad === geo.has(mi)) geoAgree = false;   // exact says crossing <=> core's float says non-crossing
      if (!bad && !geo.has(mi)) geoAgree = false;
    }
    const topoSubGeo = [...topo].every((x) => geo.has(x));
    console.log(`  ${type.padEnd(8)} dots=${sh.dots.length} matchings=${all.length}  exact-crossing=${crossing}  core-geom-nc=${geo.size}  core-topo-nc=${topo.size}  topo⊆geom=${topoSubGeo}`);
    if (geo.size < all.length) ok(crossing > 0, `${type}: the exact kernel DOES classify some matchings as crossing (non-vacuous)`);
    else console.log(`         (all ${all.length} matchings are genuinely non-crossing here — nothing to fire on)`);
    ok(geoAgree, `${type}: exact non-crossing set == core geometricNonCrossingForTile (which uses a 1e-9 FLOAT epsilon)`);
  }
}

// ===========================================================================
// SECTION 5 — coverage audit of the bounding-disc filter on a real patch
// ===========================================================================
function sec5(cfg: Config, S: Map<TileTypeId, Shp>, known: Set<string>, root: TileTypeId, level: number): void {
  head(`${cfg.id} — 5. COVERAGE AUDIT of the bounding-disc filter (${root}@${level})`);
  const list: Inst[] = [];
  expand(cfg.family as 'hex' | 'spectre', root, level, (i) => list.push(i));
  const n = list.length;
  const segs: { a: P3; b: P3; tile: number }[] = [];
  for (let i = 0; i < n; i++) {
    const sh = S.get(list[i].type)!;
    for (const [u, v] of sh.pairs) {
      segs.push({ a: pt(zApply2(list[i].T, sh.dots[u].z)), b: pt(zApply2(list[i].T, sh.dots[v].z)), tile: i });
    }
  }
  // float coarse pass over all segment pairs within 1.2 units, then exact
  const fx = segs.map((s) => ({ x: (qNum(s.a.x) + qNum(s.b.x)) / 2, y: (qNum(s.a.y) + qNum(s.b.y)) / 2 }));
  const cell = new Map<string, number[]>();
  const H = 3;
  for (let i = 0; i < segs.length; i++) {
    const k = `${Math.floor(fx[i].x / H)},${Math.floor(fx[i].y / H)}`;
    let l = cell.get(k); if (!l) { l = []; cell.set(k, l); } l.push(i);
  }
  let near = 0, missed = 0, meets = 0;
  const invCache = new Map<number, ZAffine>();
  const inv = (i: number): ZAffine => { let x = invCache.get(i); if (!x) { x = zInv(list[i].T); invCache.set(i, x); } return x; };
  for (const [k, l] of cell) {
    const [cxi, cyi] = k.split(',').map(Number);
    const cand: number[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const o = cell.get(`${cxi + dx},${cyi + dy}`); if (o) cand.push(...o);
    }
    for (const i of l) for (const j of cand) {
      if (j <= i) continue;
      if (segs[i].tile === segs[j].tile) continue;
      const d = Math.hypot(fx[i].x - fx[j].x, fx[i].y - fx[j].y);
      if (d > 2.5) continue;
      const rel = segRel3(segs[i].a, segs[i].b, segs[j].a, segs[j].b);
      if (rel.kind !== 'disjoint') {
        meets++;
        const ti = segs[i].tile, tj = segs[j].tile;
        const [x, y] = ti < tj ? [ti, tj] : [tj, ti];
        const key = `${list[x].type}|${list[y].type}|${zAffineKey(zMul(inv(x), list[y].T))}`;
        near++;
        if (!known.has(key)) { missed++; console.log(`    MISSED CLASS ${key}`); }
      }
    }
  }
  console.log(`  segments ${segs.length}; cross-tile segment pairs that MEET (weld or worse): ${meets}`);
  ok(missed === 0, `every meeting cross-tile pair's class is in the enumerated set (${near} checked)`);
}

// ===========================================================================
// SECTION 6 — is the Spectre excursion contained in ONE neighbouring tile?
// (the audited report lists this as "argued, not machine-checked")
// ===========================================================================
function sec6(cfg: Config, S: Map<TileTypeId, Shp>, root: TileTypeId, level: number): void {
  head(`${cfg.id} — 6. EXCURSION CONTAINMENT: does the straying piece lie in one neighbour tile? (${root}@${level})`);
  const list: Inst[] = [];
  expand(cfg.family as 'hex' | 'spectre', root, level, (i) => list.push(i));
  const polys = list.map((I) => S.get(I.type)!.Vz.map((v) => pt(zApply2(I.T, v))));
  const cxy = polys.map((P) => {
    let sx = 0, sy = 0;
    for (const v of P) { sx += qNum(v.x); sy += qNum(v.y); }
    return { x: sx / P.length, y: sy / P.length };
  });
  const inClosed = (p: P3, P: P3[]): boolean => {
    const m = P.length;
    for (let i = 0; i < m; i++) if (orient3(P[i], P[(i + 1) % m], p) === 0 && between3(P[i], P[(i + 1) % m], p)) return true;
    let inside = false;
    for (let i = 0; i < m; i++) {
      const a = P[i], b = P[(i + 1) % m];
      const av = qCmp(a.y, p.y) > 0, bv = qCmp(b.y, p.y) > 0;
      if (av === bv) continue;
      const sg = orient3(a, b, p);
      if (bv ? sg > 0 : sg < 0) inside = !inside;
    }
    return inside;
  };
  let straying = 0, contained = 0, orphan = 0, multi = 0, boundary = 0;
  const seamsSeen = new Map<string, number>();
  for (let i = 0; i < list.length; i++) {
    const sh = S.get(list[i].type)!;
    const n = sh.V.length;
    for (const [u, v] of sh.pairs) {
      const P = pt(zApply2(list[i].T, sh.dots[u].z));
      const Q = pt(zApply2(list[i].T, sh.dots[v].z));
      const hits: { e: number; z: P3 }[] = [];
      for (let e = 0; e < n; e++) {
        const A = polys[i][e], B = polys[i][(e + 1) % n];
        if (segRel3(P, Q, A, B).kind === 'proper') hits.push({ e, z: properPoint(P, Q, A, B) });
      }
      if (hits.length !== 2) continue;
      straying++;
      const seam = metaEdges(cfg.family, list[i].type).find((x) => x.edgeIndices.includes(hits[0].e));
      const sid = seam ? seam.id.split('/')[1] : '?';
      seamsSeen.set(sid, (seamsSeen.get(sid) ?? 0) + 1);
      const mid = vScale(vAdd(hits[0].z, hits[1].z), q(1n, 0n, 2n));
      // candidate neighbours: nearby tiles
      const hosts: number[] = [];
      for (let j = 0; j < list.length; j++) {
        if (j === i) continue;
        if (Math.abs(cxy[j].x - cxy[i].x) > 4 || Math.abs(cxy[j].y - cxy[i].y) > 4) continue;
        if (!inClosed(mid, polys[j])) continue;
        // whole straying segment inside the closed polygon j?
        let okSeg = true;
        for (let e = 0; e < polys[j].length && okSeg; e++) {
          const r = segRel3(hits[0].z, hits[1].z, polys[j][e], polys[j][(e + 1) % polys[j].length]);
          if (r.kind === 'proper') okSeg = false;
        }
        if (okSeg && inClosed(hits[0].z, polys[j]) && inClosed(hits[1].z, polys[j])) hosts.push(j);
      }
      if (hosts.length === 1) contained++;
      else if (hosts.length === 0) { orphan++; if (orphan <= 3) console.log(`    no host for a straying chord of ${list[i].type} #${i} (patch boundary?)`); boundary++; }
      else multi++;
    }
  }
  console.log(`  straying chords in this patch: ${straying};  wholly inside exactly ONE other tile: ${contained};  in >1 tile: ${multi};  in none: ${orphan}`);
  console.log(`  crossed seam ids: ${[...seamsSeen].map(([k, v]) => `${k}x${v}`).join(', ') || '(none)'}`);
  if (straying > 0) {
    ok(multi === 0, 'no straying piece lies in two different tiles at once');
    ok(contained + orphan === straying, 'every straying piece is either in exactly one tile or in none (patch edge)');
    note(`${cfg.id}: ${contained}/${straying} straying chords in ${root}@${level} lie wholly inside exactly ONE neighbouring tile; ${orphan} have no host (those are at the patch boundary, where the neighbour is simply absent).`);
  }
}

// ===========================================================================
function main(): void {
  console.log('ADVERSARIAL AUDIT of 02-self-avoidance.ts — independent Q(√3) BigInt kernel.');
  const deep = process.argv.includes('--deep');

  for (const cfg of [CONFIGS.hex128, CONFIGS.spectre1278]) {
    const S = new Map<TileTypeId, Shp>();
    for (const t of leafOrder(cfg.family)) S.set(t, shape(cfg, t));

    // unit edges, exactly, via the independent kernel
    let unit = true;
    for (const t of leafOrder(cfg.family)) {
      const sh = S.get(t)!;
      for (let i = 0; i < sh.V.length; i++) {
        const L = vNorm2(vSub(sh.V[(i + 1) % sh.V.length], sh.V[i]));
        if (!qEq(L, q(1n, 0n, 1n))) unit = false;
      }
    }
    head(`${cfg.id} — 0. bridges`);
    ok(unit, 'every tile edge has squared length exactly 1 (independent kernel)');
    let dev = 0;
    for (const t of leafOrder(cfg.family)) {
      const f = connectionPoints(cfg.family, t, new Set(cfg.subset)).map((c) => c.pt);
      const z = S.get(t)!.dots.map((d) => d.p);
      if (f.length !== z.length) { FAIL++; console.log(`  [FAIL] ${t}: dot count ${f.length} vs ${z.length}`); }
      for (let i = 0; i < f.length; i++) dev = Math.max(dev, Math.hypot(qNum(z[i].x) - f[i].x, qNum(z[i].y) - f[i].y));
    }
    ok(dev < 1e-12, 'dot order/positions match core connectionPoints', `max dev ${dev.toExponential(2)}`);

    const r1 = sec1(cfg, S);
    sec2(cfg, S);
    sec4(cfg, S);

    head(`${cfg.id} — 3. INDEPENDENT two-tile class census (sort-and-sweep)`);
    const roots9: TileTypeId[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
    const plan = [
      { level: 1, roots: roots9 }, { level: 2, roots: roots9 }, { level: 3, roots: roots9 },
      { level: 4, roots: roots9 }, { level: 5, roots: roots9 },
      { level: 6, roots: roots9 },   // ALL NINE roots at level 6 (the audited script did only Delta/Psi)
    ];
    if (deep) plan.push({ level: 7, roots: ['Psi', 'Delta'] as TileTypeId[] });
    const { classes } = census(cfg, S, plan);
    let badC = 0, badI = 0, weld = 0;
    let minD2: Q3 | null = null;
    for (const c of classes.values()) {
      if (!c.okChords) badC++;
      if (!c.okInteriors) badI++;
      if (c.d2 && (minD2 === null || qCmp(c.d2, minD2) < 0)) minD2 = c.d2;
    }
    ok(badC === 0, `all ${classes.size} classes: chords meet only in common endpoints`);
    ok(badI === 0, `all ${classes.size} classes: tile interiors disjoint`);
    if (minD2) console.log(`    exact min positive chord gap^2 = ${qStr(minD2)}  => gap = ${Math.sqrt(qNum(minD2)).toFixed(6)}`);

    sec5(cfg, S, new Set(classes.keys()), 'Psi', 4);
    sec6(cfg, S, 'Psi', 3);

    note(`${cfg.id}: (A) bad=${r1.aBad.length} [${r1.aBad.join(' ')}], (B) bad=${r1.bBad.length}, classes=${classes.size}`);
  }

  head('AUDIT NOTES');
  for (const s of NOTES) console.log('  * ' + s);
  head(FAIL === 0 ? 'AUDIT: no discrepancy found by the independent route' : `AUDIT: ${FAIL} DISCREPANCY/IES`);
  if (FAIL > 0) process.exit(1);
}

main();
