/**
 * 01 — The combinatorial substitution: extract its tables from exact geometry.
 *
 * A level-m supertile (m >= 1) of type T is, combinatorially, a HEXAGON: its
 * outline carries six distinguished vertices (corners) and the six arcs between
 * them (meta-edges) are exactly the arcs along which siblings are glued inside
 * any parent. This script
 *
 *   1. finds the corners intrinsically, as the points where the neighbouring
 *      same-level supertile changes along the outline of a BURIED instance
 *      (one owning no outline edge of a level-(m+4) ancestor) — levels 1 and 2;
 *   2. assigns each meta-edge its hexagon edge class (the leaf label table of
 *      the type) by solving the gluing constraints "+c meets -c" — unique;
 *   3. reads off, at level 2, the tables of the substitution:
 *        B(T, j)  parent edge j = concatenation of child edges (slot, edge)
 *        G(T)     which child edges are glued to which
 *        CT(T)    parent corner j = start of B(T, j)[0]
 *        Q(T, i)  which corner the quad point i of type T is (or none)
 *   4. verifies that the SAME tables describe levels 3 and 4 when the corners
 *      there are DEFINED recursively through CT — the induction's consistency;
 *   5. writes everything, plus the level-1 direction and label words needed by
 *      the closure checks of 02, to fass-theorem/tables-<family>.json.
 *
 * Run: cd web && npx --yes tsx fass-theorem/01-tables.ts [hex|spectre]
 */
import { writeFileSync } from 'node:fs';
import { HEX_EDGE_LABELS, parseEdgeLabel, SUPER_RULES } from '../src/core';
import {
  TYPES, leaves, outlineOf, subSupertiles, stepDir, zApply, zKey, zInv,
  zSupertileTransforms, zSupertileQuad, edgeLabels,
  type Outline, type TileFamilyId, type TileTypeId,
} from './geom';
import { heading, verdict } from '../fass-proof/lib';

const family = (process.argv[2] ?? 'hex') as TileFamilyId;
let allOk = true;
const check = (ok: boolean, label: string, detail = ''): boolean => { allOk = verdict(ok, label, detail) && allOk; return ok; };

/** Hexagon edge classes of each type: the hex-family leaf labels, signed. */
const CLASSES: Record<string, number[]> = {};
for (const t of TYPES) CLASSES[t] = HEX_EDGE_LABELS[t].map((l) => parseEdgeLabel(l).sign * parseEdgeLabel(l).major);

// ---------------------------------------------------------------------------
// Local outlines and intrinsic corners
// ---------------------------------------------------------------------------

const localOutline = new Map<string, Outline>();
function local(t: TileTypeId, m: number): Outline {
  const k = `${t}@${m}`;
  if (!localOutline.has(k)) localOutline.set(k, outlineOf(family, leaves(family, t, m)));
  return localOutline.get(k)!;
}

/** Corner loop-indices (canonical, ccw) of every type at level m, from buried instances at level m+4. */
function intrinsicCorners(m: number): Map<TileTypeId, number[]> {
  const found = new Map<TileTypeId, Map<string, number>>();
  let unburiedOk = true;
  for (const root of TYPES) {
    const subs = subSupertiles(family, root, m + 4, m);
    const edgeOwner = new Map<string, number[]>();
    const outs = subs.map((s, i) => {
      const o = outlineOf(family, leaves(family, s.type, m, s.xform));
      for (let j = 0; j < o.loop.length; j++) {
        const a = o.loop[j], b = o.loop[(j + 1) % o.loop.length];
        const u = a < b ? `${a}_${b}` : `${b}_${a}`;
        (edgeOwner.get(u) ?? edgeOwner.set(u, []).get(u)!).push(i);
      }
      return o;
    });
    subs.forEach((s, i) => {
      const o = outs[i]; const n = o.loop.length;
      const nb = o.loop.map((a, j) => {
        const b = o.loop[(j + 1) % n];
        const u = a < b ? `${a}_${b}` : `${b}_${a}`;
        const others = edgeOwner.get(u)!.filter((k) => k !== i);
        return others.length ? others[0] : -1;
      });
      const inv = zInv(s.xform);
      const loc = local(s.type, m);
      const locIndex = new Map(loc.loop.map((k, idx) => [k, idx] as const));
      const cuts: number[] = [];
      for (let j = 0; j < n; j++) if (nb[(j - 1 + n) % n] !== nb[j]) cuts.push(locIndex.get(zKey(zApply(inv, o.coord.get(o.loop[j])!)))!);
      cuts.sort((a, b) => a - b);
      if (nb.every((x) => x >= 0)) {
        const fm = found.get(s.type) ?? found.set(s.type, new Map()).get(s.type)!;
        fm.set(cuts.join(','), (fm.get(cuts.join(',')) ?? 0) + 1);
      } else {
        const known = found.get(s.type);
        if (known && known.size === 1) {
          const cs = new Set([...known.keys()][0].split(',').map(Number));
          if (!cuts.every((c) => cs.has(c))) unburiedOk = false;
        }
      }
    });
  }
  const out = new Map<TileTypeId, number[]>();
  for (const t of TYPES) {
    const fm = found.get(t);
    check(!!fm && fm.size === 1 && [...fm.keys()][0].split(',').length === 6,
      `level ${m}: every buried ${t} has the same six corners`,
      fm ? [...fm.entries()].map(([k, v]) => `{${k}} x${v}`).join(' ') : 'no buried instance');
    out.set(t, [...fm!.keys()][0].split(',').map(Number));
  }
  check(unburiedOk, `level ${m}: an unburied instance changes neighbour only at corners`);
  return out;
}

// ---------------------------------------------------------------------------
// Gluing structure of one parent level, given class-indexed child corners
// ---------------------------------------------------------------------------

interface ChildEdgeRef { s: number; e: number }
interface ParentData {
  /** glued pairs, each as [(s,e),(s',e')] with s < s' */
  G: [ChildEdgeRef, ChildEdgeRef][];
  /** the outer child edges in ccw order around the parent outline, starting anywhere */
  outer: ChildEdgeRef[];
  /** parent outline (world) */
  outline: Outline;
  /** world key of child corner (s, j) */
  cornerKey: (s: number, j: number) => string;
  childTypes: (TileTypeId | null)[];
}

/** corners: type -> six loop indices in CLASS order (corner j starts edge j). */
function analyseParent(T: TileTypeId, P: number, corners: Map<TileTypeId, number[]>): ParentData {
  const m = P - 1;
  const Ts = zSupertileTransforms(family, P);
  const subs = SUPER_RULES[T];
  const seg = new Map<string, { s: number; e: number; pos: number; len: number }[]>(); // undirected unit edge -> owners
  const cornerKeys: string[][] = [];
  const childTypes: (TileTypeId | null)[] = [];
  const allLeaves = leaves(family, T, P);
  for (let s = 0; s < 8; s++) {
    if (subs[s] === 'null') { childTypes.push(null); cornerKeys.push([]); continue; }
    const t = subs[s] as TileTypeId; childTypes.push(t);
    const loc = local(t, m); const n = loc.loop.length;
    const cs = corners.get(t)!;
    const world = loc.loop.map((k) => zKey(zApply(Ts[s], loc.coord.get(k)!)));
    cornerKeys.push(cs.map((ci) => world[ci]));
    for (let j = 0; j < 6; j++) {
      const a = cs[j], b = cs[(j + 1) % 6];
      const len = ((b - a) % n + n) % n;
      for (let p = 0; p < len; p++) {
        const x = world[(a + p) % n], y = world[(a + p + 1) % n];
        const u = x < y ? `${x}_${y}` : `${y}_${x}`;
        (seg.get(u) ?? seg.set(u, []).get(u)!).push({ s, e: j, pos: p, len });
      }
    }
  }
  // whole-edge gluing
  const partner = new Map<string, string>(); // "s:e" -> "s':e'" or "out"
  const G: [ChildEdgeRef, ChildEdgeRef][] = [];
  const lenOf = new Map<string, number>();
  for (const owners of seg.values()) {
    if (owners.length > 2) throw new Error(`${T}@${P}: a unit edge owned by ${owners.length} children`);
    for (const o of owners) {
      const key = `${o.s}:${o.e}`; lenOf.set(key, o.len);
      const other = owners.find((q) => q !== o);
      const val = other ? `${other.s}:${other.e}` : 'out';
      const prev = partner.get(key);
      if (prev !== undefined && prev !== val) throw new Error(`${T}@${P}: child edge ${key} is partly glued to ${prev} and partly to ${val}`);
      partner.set(key, val);
      if (other) {
        if (other.len !== o.len || other.pos !== o.len - 1 - o.pos) throw new Error(`${T}@${P}: glued edges ${key}/${val} are not reversed copies`);
      }
    }
  }
  for (const [k, v] of partner) {
    if (v === 'out') continue;
    const [s, e] = k.split(':').map(Number); const [s2, e2] = v.split(':').map(Number);
    if (s < s2 || (s === s2 && e < e2)) G.push([{ s, e }, { s: s2, e: e2 }]);
  }
  // Parent outline as runs of whole child edges. Every slot transform carries a
  // mirror, so a child's outline (ccw in its own frame) is cw in the parent's
  // frame and the parent's ccw outline traverses each outer child edge BACKWARDS
  // (from its corner e+1 down to its corner e).
  const outline = outlineOf(family, allLeaves);
  const n = outline.loop.length;
  const runs: { s: number; e: number; pos: number; len: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = outline.loop[i], y = outline.loop[(i + 1) % n];
    const u = x < y ? `${x}_${y}` : `${y}_${x}`;
    const owners = seg.get(u)!;
    if (owners.length !== 1) throw new Error(`${T}@${P}: outline edge with ${owners.length} owners`);
    runs.push(owners[0]);
  }
  let start = 0; while (runs[start].pos !== runs[start].len - 1) start++;
  const outer: ChildEdgeRef[] = [];
  let i = 0;
  while (i < n) {
    const r = runs[(start + i) % n];
    if (r.pos !== r.len - 1) throw new Error(`${T}@${P}: outline is not a concatenation of whole child edges`);
    outer.push({ s: r.s, e: r.e });
    for (let p = r.len - 1; p >= 0; p--, i++) {
      const q = runs[(start + i) % n];
      if (q.s !== r.s || q.e !== r.e || q.pos !== p) throw new Error(`${T}@${P}: outline does not traverse child edge ${r.s}.${r.e} backwards in one piece`);
    }
  }
  return { G, outer, outline, cornerKey: (s, j) => cornerKeys[s][j], childTypes };
}

// ---------------------------------------------------------------------------
// Class assignment: rotate each type's canonical corners so that +c glues to -c
// ---------------------------------------------------------------------------

function solveRotations(P: number, canon: Map<TileTypeId, number[]>): Map<TileTypeId, number> {
  // constraints from every parent type at level P, children at level P-1 with canonical corners
  const cons: { a: TileTypeId; ea: number; b: TileTypeId; eb: number }[] = [];
  for (const T of TYPES) {
    const pd = analyseParent(T, P, canon);
    for (const [x, y] of pd.G) cons.push({ a: pd.childTypes[x.s]!, ea: x.e, b: pd.childTypes[y.s]!, eb: y.e });
  }
  const sols: Map<TileTypeId, number>[] = [];
  const rho = new Map<TileTypeId, number>();
  const rec = (i: number): void => {
    if (i === TYPES.length) { sols.push(new Map(rho)); return; }
    const t = TYPES[i];
    for (let r = 0; r < 6; r++) {
      rho.set(t, r);
      const ok = cons.every((c) => {
        if (!rho.has(c.a) || !rho.has(c.b)) return true;
        const ca = CLASSES[c.a][((c.ea - rho.get(c.a)!) % 6 + 6) % 6];
        const cb = CLASSES[c.b][((c.eb - rho.get(c.b)!) % 6 + 6) % 6];
        return ca === -cb;
      });
      if (ok) rec(i + 1);
      rho.delete(t);
    }
  };
  rec(0);
  check(sols.length === 1, `level ${P - 1}: the hexagon classes of the meta-edges are forced by the gluings`, `${sols.length} consistent assignment(s) over ${cons.length} glued pairs`);
  return sols[0];
}

/** class-indexed corners: corner j (start of the class-c(T,j) edge) = canonical corner (j + rho) mod 6 */
function classIndexed(canon: Map<TileTypeId, number[]>, rho: Map<TileTypeId, number>): Map<TileTypeId, number[]> {
  const out = new Map<TileTypeId, number[]>();
  for (const t of TYPES) out.set(t, [0, 1, 2, 3, 4, 5].map((j) => canon.get(t)![(j + rho.get(t)!) % 6]));
  return out;
}

// ---------------------------------------------------------------------------
// Tables at one parent level, given class-indexed corners for children AND parents
// ---------------------------------------------------------------------------

interface Tables {
  B: Record<string, ChildEdgeRef[][]>;
  G: Record<string, [ChildEdgeRef, ChildEdgeRef][]>;
  CT: Record<string, ChildEdgeRef[]>; // parent corner j = child corner (s, e): here e is a CORNER index
}

function tablesAt(P: number, childCorners: Map<TileTypeId, number[]>, parentCorners: Map<TileTypeId, number[]>): Tables {
  const B: Tables['B'] = {}; const G: Tables['G'] = {}; const CT: Tables['CT'] = {};
  for (const T of TYPES) {
    const pd = analyseParent(T, P, childCorners);
    // parent corner keys (world) from the parent's local outline == world outline (parent is in its own frame)
    const loc = local(T, P);
    const pcs = parentCorners.get(T)!.map((ci) => loc.loop[ci]);
    // locate parent corners among the child-corner starts of outer edges
    // traversed backwards: an outer child edge (s, e) starts (for the parent) at child corner e+1 and ends at child corner e
    const starts = pd.outer.map((o) => pd.cornerKey(o.s, (o.e + 1) % 6));
    const ends = pd.outer.map((o) => pd.cornerKey(o.s, o.e));
    const idx = pcs.map((k) => starts.indexOf(k));
    if (idx.some((x) => x < 0)) throw new Error(`${T}@${P}: a parent corner is not the start of an outer child edge`);
    // arcs between consecutive parent corners
    B[T] = []; CT[T] = [];
    for (let j = 0; j < 6; j++) {
      const a = idx[j], b = idx[(j + 1) % 6];
      const arc: ChildEdgeRef[] = [];
      for (let i = a; ; i = (i + 1) % pd.outer.length) { arc.push(pd.outer[i]); if ((i + 1) % pd.outer.length === b) break; }
      // consecutive outer edges must chain end-to-start
      for (let i = 0; i + 1 < arc.length; i++) if (ends[(a + i) % pd.outer.length] !== starts[(a + i + 1) % pd.outer.length]) throw new Error('outer edges do not chain');
      B[T].push(arc); CT[T].push({ s: arc[0].s, e: (arc[0].e + 1) % 6 });
    }
    G[T] = pd.G;
  }
  return { B, G, CT };
}

/** corners at level P defined through CT from class-indexed corners at level P-1 */
function derivedCorners(P: number, childCorners: Map<TileTypeId, number[]>, CT: Tables['CT']): Map<TileTypeId, number[]> {
  const out = new Map<TileTypeId, number[]>();
  const Ts = zSupertileTransforms(family, P);
  for (const T of TYPES) {
    const loc = local(T, P); const index = new Map(loc.loop.map((k, i) => [k, i] as const));
    out.set(T, CT[T].map(({ s, e }) => {
      const t = SUPER_RULES[T][s] as TileTypeId; const cl = local(t, P - 1);
      const key = zKey(zApply(Ts[s], cl.coord.get(cl.loop[childCorners.get(t)![e]])!));
      const i = index.get(key); if (i === undefined) throw new Error(`${T}@${P}: derived corner not on outline`);
      return i;
    }));
  }
  return out;
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

heading(`${family}: intrinsic corners`);
const canon1 = intrinsicCorners(1);
const canon2 = intrinsicCorners(2);

heading(`${family}: hexagon classes of the meta-edges`);
const rho1 = solveRotations(2, canon1);
const rho2 = solveRotations(3, canon2);
const C1 = classIndexed(canon1, rho1);
const C2 = classIndexed(canon2, rho2);

heading(`${family}: the tables at level 2, re-derived at levels 3 and 4`);
const T2 = tablesAt(2, C1, C2);
const C3 = derivedCorners(3, C2, T2.CT);
const T3 = tablesAt(3, C2, C3);
check(same(T2.B, T3.B) && same(T2.G, T3.G), 'levels 2 and 3 give identical B and G tables (level-3 corners defined via CT)');
// level 2 corners: are the CT-derived ones the intrinsic ones?
check(same(derivedCorners(2, C1, T2.CT), C2), 'CT applied to the level-1 corners returns the intrinsic level-2 corners (tautology guard)');
const C4 = derivedCorners(4, C3, T2.CT);
const T4 = tablesAt(4, C3, C4);
check(same(T2.B, T4.B) && same(T2.G, T4.G), 'level 4 gives the same B and G tables again');
// class-determined decomposition
{
  const byClass = new Map<number, string>();
  let ok = true;
  for (const T of TYPES) for (let j = 0; j < 6; j++) {
    const c = CLASSES[T][j];
    const word = T2.B[T][j].map(({ s, e }) => `${CLASSES[SUPER_RULES[T][s]][e]}`).join(' ');
    if (byClass.has(c) && byClass.get(c) !== word) ok = false;
    byClass.set(c, word);
  }
  check(ok, 'the class sequence of the child edges along a parent edge depends only on the parent edge class');
  for (const [c, w] of [...byClass.entries()].sort((a, b) => a[0] - b[0])) console.log(`      class ${String(c).padStart(2)} -> ${w}`);
}

// quad points as corners, levels 1..4
const quadCorner: Record<string, (number | null)[][]> = {};
for (const T of TYPES) quadCorner[T] = [];
for (const [m, C] of [[1, C1], [2, C2], [3, C3], [4, C4]] as const) {
  const q = zSupertileQuad(family, m).map(zKey);
  for (const T of TYPES) {
    const loc = local(T, m); const cs = C.get(T)!;
    quadCorner[T][m] = q.map((k) => { const i = loc.loop.indexOf(k); if (i < 0) throw new Error(`${T}@${m}: quad point not on outline`); const j = cs.indexOf(i); return j < 0 ? null : j; });
  }
}
{
  let ok = true;
  for (const T of TYPES) for (const m of [3, 4]) if (!same(quadCorner[T][m], quadCorner[T][2])) ok = false;
  check(ok, 'which corner each quad point is (or none) is the same at levels 2, 3 and 4');
  for (const T of TYPES) console.log(`      ${T.padEnd(6)} quad -> corners  lv1 ${JSON.stringify(quadCorner[T][1])}  lv2 ${JSON.stringify(quadCorner[T][2])}  lv3 ${JSON.stringify(quadCorner[T][3])}  lv4 ${JSON.stringify(quadCorner[T][4])}`);
}

// linear parts of the slot transforms, levels 1..12
{
  const L = zSupertileTransforms(family, 1).map((x) => ({ k: x.k, m: x.m }));
  let ok = true;
  for (let lv = 2; lv <= 12; lv++) if (!same(zSupertileTransforms(family, lv).map((x) => ({ k: x.k, m: x.m })), L)) ok = false;
  check(ok, 'the linear part of every slot transform is the same at levels 1-12', L.map((x) => `d^${x.k}${x.m ? 'conj' : ''}`).join(' '));
}

// level-1 words for the base case, and level 2/3 words for sanity, class-indexed
function words(m: number, C: Map<TileTypeId, number[]>): Record<string, { dir: number[]; lab: string[] }[]> {
  const out: Record<string, { dir: number[]; lab: string[] }[]> = {};
  for (const T of TYPES) {
    const loc = local(T, m); const n = loc.loop.length; const cs = C.get(T)!;
    const lv = leaves(family, T, m);
    out[T] = [0, 1, 2, 3, 4, 5].map((j) => {
      const a = cs[j], b = cs[(j + 1) % 6]; const len = ((b - a) % n + n) % n;
      const dir: number[] = []; const lab: string[] = [];
      for (let p = 0; p < len; p++) {
        const i = (a + p) % n;
        dir.push(stepDir(loc.coord, loc.loop[i], loc.loop[(i + 1) % n]));
        const o = loc.owner[i]; lab.push(edgeLabels(family, lv[o.leaf].type)[o.edge]);
      }
      return { dir, lab };
    });
  }
  return out;
}
const W1 = words(1, C1); const W2 = words(2, C2); const W3 = words(3, C3);

{
  let ok = true;
  for (const m of [1, 2, 3, 4]) { const ref = local('Psi', m).loop.join(' '); for (const T of TYPES) if (T !== 'Gamma' && local(T, m).loop.join(' ') !== ref) ok = false; }
  check(ok, 'the eight non-Gamma types have literally the same outline (same vertex loop) at levels 1-4, so equal corner indices are equal points');
}
{
  let ok = true;
  for (const T of TYPES) for (const m of [1, 2]) { try { local(T, m); } catch { ok = false; } }
  check(ok, 'levels 1 and 2: every supertile is a valid patch — no edge in three tiles, outline one simple loop (winding-number lemma)');
}
const linear = zSupertileTransforms(family, 1).map((x) => ({ k: x.k, m: x.m }));
const dump = {
  family, classes: CLASSES, rules: SUPER_RULES, linear,
  corners: { 1: Object.fromEntries(C1), 2: Object.fromEntries(C2), 3: Object.fromEntries(C3), 4: Object.fromEntries(C4) },
  quadCorner: { 1: Object.fromEntries(TYPES.map((T) => [T, quadCorner[T][1]])), 2: Object.fromEntries(TYPES.map((T) => [T, quadCorner[T][2]])) },
  B: T2.B, G: T2.G, CT: T2.CT,
  words: { 1: W1, 2: W2, 3: W3 },
};
writeFileSync(`fass-theorem/tables-${family}.json`, JSON.stringify(dump));
console.log(`\n  wrote fass-theorem/tables-${family}.json`);
for (const T of TYPES) {
  console.log(`  ${T.padEnd(6)} B: ${T2.B[T].map((arc) => arc.map(({ s, e }) => `${s}.${e}`).join('+')).join(' | ')}`);
  console.log(`         G: ${T2.G[T].map(([a, b]) => `${a.s}.${a.e}~${b.s}.${b.e}`).join(' ')}`);
}
console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
