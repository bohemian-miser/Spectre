/**
 * 02 — Closure: the finite, level-free checks that make the induction a theorem.
 *
 * Input: fass-theorem/tables-<family>.json from 01 (the substitution tables
 * B, G, CT, the quad-corner table, the slot linear parts, and the level-1
 * direction and label words of every meta-edge).
 *
 * The induction hypothesis IH(k), for every type T (docs/FASS_THEOREM.md §3):
 *   (a) the abstract complex A(T,k) — the leaf tiles glued as the hierarchy
 *       says — is a closed disk;
 *   (b) its map to the plane (placing each leaf by its transform) is a local
 *       isometry at every point, boundary included;
 *   (c) its boundary is the cyclic concatenation of six meta-edges, and the
 *       direction word of meta-edge e of type T in T's local frame is D_k(T,e);
 *   (d) the quad points of T that the construction uses are the corners the
 *       quad-corner table names.
 * IH(1) is checked from exact geometry in 01. IH(k-1) => IH(k) needs only the
 * checks below, none of which mentions k:
 *
 *   C1  every child edge is glued to exactly one sibling edge or lies on
 *       exactly one parent edge; parent edges chain through the corners CT;
 *   C2  WORD CLAIMS: the set of statements "g.D(a,e) = revneg D(b,e')" seeded
 *       by the glued pairs is closed under one substitution step, and every
 *       statement in the closure holds at level 1 (directions AND labels);
 *   C3  the seven quad-point chainings identify corners, and from them the
 *       coincidence of every identified corner pair follows by walking glued
 *       edges whose words agree (C2);
 *   C4  the abstract complex is a disk: connected, Euler characteristic 1,
 *       vertex links are paths or cycles, one boundary cycle;
 *   C5  ANGLES: the first/last directions of all meta-edges obey a fixed
 *       recursion, so are eventually periodic in k; at every level of the
 *       cycle the corner angles of the children meeting at an interior vertex
 *       sum to 360 degrees and at a boundary vertex to less;
 *   C6  the parent's quad points are the corners the table says (so (d) is
 *       inherited), and every quad point the construction uses is a corner;
 *   C7  BURIAL: the sub-supertile at address 0.0.5.0 of a Psi supertile owns
 *       no edge of the outline, at every level — computed from B alone.
 *
 * Run: cd web && npx --yes tsx fass-theorem/02-closure.ts [hex|spectre]
 */
import { readFileSync } from 'node:fs';
import { heading, verdict } from '../fass-proof/lib';

const family = process.argv[2] ?? 'hex';
const J = JSON.parse(readFileSync(`fass-theorem/tables-${family}.json`, 'utf8'));
const TYPES: string[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
const rules: Record<string, string[]> = J.rules;
const B: Record<string, { s: number; e: number }[][]> = J.B;
const G: Record<string, [{ s: number; e: number }, { s: number; e: number }][]> = J.G;
const CT: Record<string, { s: number; e: number }[]> = J.CT;
const linear: { k: number; m: number }[] = J.linear;
let allOk = true;
const check = (ok: boolean, label: string, detail = ''): boolean => { allOk = verdict(ok, label, detail) && allOk; return ok; };
const child = (T: string, s: number): string => rules[T][s];

// ---------------------------------------------------------------------------
// Maps on directions: x -> sigma*x + c (mod 12). L_s = (sigma=-1 if mirror, c=k).
// phi_s = neg o L_s is the map a child's direction word undergoes when the parent
// traverses that child edge backwards: reverse the word and apply phi_s.
// ---------------------------------------------------------------------------
interface DMap { sigma: 1 | -1; c: number }
const mod = (x: number): number => ((x % 12) + 12) % 12;
const compose = (f: DMap, g: DMap): DMap => ({ sigma: (f.sigma * g.sigma) as 1 | -1, c: mod(f.sigma * g.c + f.c) }); // f o g
const inverse = (f: DMap): DMap => ({ sigma: f.sigma, c: mod(-f.sigma * f.c) });
const apply = (f: DMap, x: number): number => mod(f.sigma * x + f.c);
const L: DMap[] = linear.map((l) => ({ sigma: l.m ? -1 : 1, c: l.k }));
const NEG: DMap = { sigma: 1, c: 6 };
const PHI: DMap[] = L.map((l) => compose(NEG, l));
const mapKey = (f: DMap): string => `${f.sigma}:${f.c}`;
const revneg = (w: number[]): number[] => [...w].reverse().map((x) => mod(x + 6));
const mapWord = (f: DMap, w: number[]): number[] => w.map((x) => apply(f, x));

// ---------------------------------------------------------------------------
// C1 — structure
// ---------------------------------------------------------------------------
heading(`${family}: C1 structure of the tables`);
{
  let ok = true;
  for (const T of TYPES) {
    const seen = new Map<string, number>();
    for (const arc of B[T]) for (const { s, e } of arc) seen.set(`${s}.${e}`, (seen.get(`${s}.${e}`) ?? 0) + 1);
    for (const [a, b] of G[T]) { seen.set(`${a.s}.${a.e}`, (seen.get(`${a.s}.${a.e}`) ?? 0) + 1); seen.set(`${b.s}.${b.e}`, (seen.get(`${b.s}.${b.e}`) ?? 0) + 1); }
    for (let s = 0; s < 8; s++) { if (child(T, s) === 'null') continue; for (let e = 0; e < 6; e++) if (seen.get(`${s}.${e}`) !== 1) ok = false; }
    if (seen.size !== 6 * (8 - (rules[T].includes('null') ? 1 : 0))) ok = false;
  }
  check(ok, 'every child edge is either glued to exactly one sibling edge or lies on exactly one parent edge');
}

// abstract vertex classes: corner (s,c) -> class id, per parent type
function cornerClasses(T: string): { find: (s: number, c: number) => number; classes: Map<number, [number, number][]> } {
  const parent = new Map<string, string>();
  const key = (s: number, c: number): string => `${s}.${mod6(c)}`;
  const find = (k: string): string => { while (parent.get(k) !== undefined && parent.get(k) !== k) k = parent.get(k)!; return k; };
  const union = (a: string, b: string): void => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (let s = 0; s < 8; s++) if (child(T, s) !== 'null') for (let c = 0; c < 6; c++) parent.set(key(s, c), key(s, c));
  // glued (s,e)~(s',e'): start of e = end of e' and end of e = start of e'
  for (const [a, b] of G[T]) { union(key(a.s, a.e), key(b.s, b.e + 1)); union(key(a.s, a.e + 1), key(b.s, b.e)); }
  // consecutive outer edges chain: parent traverses child edges backwards, so
  // the end of (s,e) [child corner e] meets the start of the next (s',e') [child corner e'+1]
  const all = B[T].flat();
  for (let i = 0; i < all.length; i++) { const x = all[i], y = all[(i + 1) % all.length]; union(key(x.s, x.e), key(y.s, y.e + 1)); }
  const ids = new Map<string, number>(); const classes = new Map<number, [number, number][]>();
  for (const k of parent.keys()) { const r = find(k); if (!ids.has(r)) { ids.set(r, ids.size); classes.set(ids.get(r)!, []); } classes.get(ids.get(r)!)!.push(k.split('.').map(Number) as [number, number]); }
  return { find: (s, c) => ids.get(find(key(s, c)))!, classes };
}
const mod6 = (x: number): number => ((x % 6) + 6) % 6;
{
  let ok = true;
  for (const T of TYPES) {
    const cc = cornerClasses(T);
    for (let j = 0; j < 6; j++) {
      const first = B[T][j][0]; const prevLast = B[T][mod6(j - 1)].slice(-1)[0];
      // CT(T,j) is child corner (first.s, first.e+1); it must also be the end of the previous parent edge
      if (!(CT[T][j].s === first.s && CT[T][j].e === mod6(first.e + 1))) ok = false;
      if (cc.find(CT[T][j].s, CT[T][j].e) !== cc.find(prevLast.s, prevLast.e)) ok = false;
    }
  }
  check(ok, 'parent edge j starts at corner CT(T,j), which is where parent edge j-1 ends');
}

// ---------------------------------------------------------------------------
// C2 — word claims and their closure
// ---------------------------------------------------------------------------
heading(`${family}: C2 word claims, closed under substitution and true at level 1`);
interface Claim { a: string; e: number; b: string; f: number; g: DMap }
const claimKey = (c: Claim): string => `${c.a}.${c.e}|${c.b}.${c.f}|${mapKey(c.g)}`;
const claims = new Map<string, Claim>();
const addClaim = (c: Claim): boolean => {
  const k = claimKey(c); if (claims.has(k)) return false;
  claims.set(k, c);
  // symmetric form: revneg is an involution commuting with g, so g^-1 D(b,f) = revneg D(a,e)
  const sym: Claim = { a: c.b, e: c.f, b: c.a, f: c.e, g: inverse(c.g) };
  claims.set(claimKey(sym), sym);
  return true;
};
for (const T of TYPES) for (const [x, y] of G[T]) addClaim({ a: child(T, x.s), e: x.e, b: child(T, y.s), f: y.e, g: compose(inverse(L[y.s]), L[x.s]) });
const seedCount = claims.size;
let expandOk = true; let rounds = 0;
for (;;) {
  const snapshot = [...claims.values()]; let grew = false; rounds++;
  for (const c of snapshot) {
    const Ba = B[c.a][c.e], Bb = B[c.b][c.f];
    if (Ba.length !== Bb.length) { expandOk = false; continue; }
    const m = Ba.length;
    for (let i = 0; i < m; i++) {
      const x = Ba[i], y = Bb[m - 1 - i];
      const g2 = compose(inverse(PHI[y.s]), compose(c.g, PHI[x.s]));
      if (addClaim({ a: child(c.a, x.s), e: x.e, b: child(c.b, y.s), f: y.e, g: g2 })) grew = true;
    }
  }
  if (!grew) break;
}
check(expandOk, 'every claim expands: the two glued edges decompose into the same number of child edges');
check(true, `closure reached after ${rounds} round(s)`, `${seedCount} seed statements -> ${claims.size} statements (each glued pair read both ways)`);

type Words = Record<string, { dir: number[]; lab: string[] }[]>;
const W: Record<number, Words> = { 1: J.words['1'], 2: J.words['2'], 3: J.words['3'] };
function labelsMatch(la: string[], lb: string[]): boolean {
  if (la.length !== lb.length) return false;
  const P = (s: string): { sign: number; major: number; minor: number } => { const m = /^(-?)(\d+)\.(\d+)[A-Z]$/.exec(s)!; return { sign: m[1] ? -1 : 1, major: +m[2], minor: +m[3] }; };
  for (let i = 0; i < la.length; i++) {
    const p = P(la[i]), q = P(lb[lb.length - 1 - i]);
    if (p.major !== q.major) return false;
    if (p.major === 0) { if (p.sign !== q.sign) return false; continue; } // self-glued class: minors reversed within the seam, checked below
    if (p.sign !== -q.sign || p.minor !== q.minor) return false;
  }
  return true;
}
function class0Ok(la: string[], lb: string[]): boolean {
  // along a class-0 run of length M glued to a class-0 run, minor i meets minor M-1-i
  const P = (s: string): { major: number; minor: number } => { const m = /^(-?)(\d+)\.(\d+)[A-Z]$/.exec(s)!; return { major: +m[2], minor: +m[3] }; };
  for (let i = 0; i < la.length; i++) {
    const p = P(la[i]); if (p.major !== 0) continue;
    // find the run of zeros containing i
    let s = i; while (s > 0 && P(la[s - 1]).major === 0) s--;
    let t = i; while (t + 1 < la.length && P(la[t + 1]).major === 0) t++;
    const q = P(lb[lb.length - 1 - i]);
    if (q.minor !== (t - s) - (p.minor)) return false;
  }
  return true;
}
for (const lv of [1, 2, 3]) {
  let dirOk = true, labOk = true, z0Ok = true;
  for (const c of claims.values()) {
    const wa = W[lv][c.a][c.e], wb = W[lv][c.b][c.f];
    if (JSON.stringify(mapWord(c.g, wa.dir)) !== JSON.stringify(revneg(wb.dir))) dirOk = false;
    if (!labelsMatch(wa.lab, wb.lab)) labOk = false;
    if (!class0Ok(wa.lab, wb.lab)) z0Ok = false;
  }
  check(dirOk, `level ${lv}: every claim holds for the direction words${lv === 1 ? '  (THE BASE CASE)' : '  (consistency)'}`);
  check(labOk, `level ${lv}: along every glued pair the leaf labels are +c.m against -c.m`);
  check(z0Ok, `level ${lv}: class-0 seams meet with their minors reversed`);
}
// the word recursion reproduces the level-2 and level-3 words from level 1
{
  const step = (prev: Words): Words => {
    const out: Words = {};
    for (const T of TYPES) out[T] = B[T].map((arc) => {
      const dir: number[] = []; const lab: string[] = [];
      for (const { s, e } of arc) { const w = prev[child(T, s)][e]; dir.push(...mapWord(PHI[s], [...w.dir].reverse())); lab.push(...[...w.lab].reverse()); }
      return { dir, lab };
    });
    return out;
  };
  const W2 = step(W[1]); const W3 = step(W2);
  check(JSON.stringify(W2) === JSON.stringify(W[2]) && JSON.stringify(W3) === JSON.stringify(W[3]), 'the word recursion D_k = concat rev(phi_s D_{k-1}) reproduces the measured level-2 and level-3 words');
}

// ---------------------------------------------------------------------------
// C3 — quad chaining seeds corner coincidences; glued edges propagate them
// ---------------------------------------------------------------------------
// SameCorner: corner c of type a and corner c' of type b (both non-Gamma, which share
// one outline) are the same point of the shared local frame. Greatest fixpoint of:
// CT(a)[c] and CT(b)[c'] name the same slot s and corner index, and the children
// there (child(a,s), child(b,s)) are SameCorner at that index. Verified at level 1
// from the corner indices in the shared outline; then true at every level by induction.
const sameCorner = new Set<string>();
{
  const nonGamma = TYPES.filter((t) => !rules[t].includes('null'));
  for (const a of nonGamma) for (const b of nonGamma) for (let c = 0; c < 6; c++) for (let d2 = 0; d2 < 6; d2++) {
    if (CT[a][c].s === CT[b][d2].s && CT[a][c].e === CT[b][d2].e) sameCorner.add(`${a}.${c}|${b}.${d2}`);
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const k of [...sameCorner]) {
      const [x, y] = k.split('|'); const [a, c] = x.split('.'); const b = y.split('.')[0];
      const s = CT[a][+c].s; const e = CT[a][+c].e;
      if (!sameCorner.has(`${child(a, s)}.${e}|${child(b, s)}.${e}`)) { sameCorner.delete(k); changed = true; }
    }
  }
  const corners1: Record<string, number[]> = J.corners['1'];
  let base = true;
  for (const k of sameCorner) { const [x, y] = k.split('|'); const [a, c] = x.split('.'); const [b, d] = y.split('.'); if (corners1[a][+c] !== corners1[b][+d]) base = false; }
  heading(`${family}: corners shared between types (SameCorner)`);
  check(base, 'every SameCorner pair coincides at level 1 (base) and the relation is closed under CT (step)', `${sameCorner.size} ordered pairs, ${[...sameCorner].filter((k) => { const [x, y] = k.split('|'); return x.split('.')[0] === 'Theta' && y.split('.')[0] === 'Phi'; }).length} of them Theta/Phi`);
}

heading(`${family}: C3 corner coincidences from the quad chaining`);
const T_RULES: [number, number, number][] = [[60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1], [0, 2, 0], [60, 3, 1], [-120, 3, 3]];
const SUPERQUAD: [number, number][] = [[6, 2], [5, 1], [3, 2], [0, 1]];
const QC: Record<string, Record<string, (number | null)[]>> = J.quadCorner; // level '1' and '2'
function propagationOk(qc: Record<string, (number | null)[]>): boolean {
  let ok = true;
  for (const T of TYPES) {
    const cc = cornerClasses(T);
    // known coincidences as a union-find over corners, seeded by the chaining
    const par = new Map<string, string>();
    const key = (s: number, c: number): string => `${s}.${mod6(c)}`;
    const find = (k: string): string => { while (par.get(k) !== undefined && par.get(k) !== k) k = par.get(k)!; return k; };
    const union = (a: string, b: string): void => { const ra = find(a), rb = find(b); if (ra !== rb) par.set(ra, rb); };
    for (let s = 0; s < 8; s++) if (child(T, s) !== 'null') for (let c = 0; c < 6; c++) par.set(key(s, c), key(s, c));
    for (let s = 1; s <= 7; s++) {
      if (child(T, s) === 'null' || child(T, s - 1) === 'null') continue; // Gamma: slot 2 empty; slot 3 chains to slot 2's frame, handled below
      const [, from, to] = T_RULES[s - 1];
      const qa = qc[child(T, s)][to], qb = qc[child(T, s - 1)][from];
      if (qa === null || qb === null) { ok = false; continue; }
      if (cc.find(s, qa) !== cc.find(s - 1, qb)) ok = false; // the chaining must identify abstractly identified corners
      union(key(s, qa), key(s - 1, qb));
    }
    if (rules[T].includes('null')) {
      // An empty slot breaks the chain. All slot transforms are shared by every
      // parent type, so a coincidence proved in a parent WITHOUT the empty slot
      // transfers to this one for every corner that the two children sitting in
      // the same slot share as a point (SameCorner). Seed from those.
      for (let s = 0; s < 8; s++) {
        if (child(T, s) === 'null') continue;
        for (const P of TYPES) {
          if (rules[P].includes('null')) continue;
          const ccP = cornerClasses(P);
          for (const membersP of ccP.classes.values()) {
            // corners of this parent's children that are SameCorner with members of the class in P
            const here: [number, number][] = [];
            for (const [sp, cp] of membersP) {
              if (child(T, sp) === 'null') continue;
              for (let c = 0; c < 6; c++) if (sameCorner.has(`${child(T, sp)}.${c}|${child(P, sp)}.${cp}`)) here.push([sp, c]);
            }
            for (let i = 1; i < here.length; i++) union(key(here[0][0], here[0][1]), key(here[i][0], here[i][1]));
          }
        }
        break;
      }
    }
    // propagate along glued edges: if one end pair coincides, the words agree (C2), so the other end pair coincides
    for (let changed = true; changed;) {
      changed = false;
      for (const [a, b] of G[T]) {
        const s1 = key(a.s, a.e), e1 = key(a.s, a.e + 1), s2 = key(b.s, b.e + 1), e2 = key(b.s, b.e);
        if (find(s1) === find(s2) && find(e1) !== find(e2)) { union(e1, e2); changed = true; }
        if (find(e1) === find(e2) && find(s1) !== find(s2)) { union(s1, s2); changed = true; }
      }
    }
    for (const members of cc.classes.values()) for (const [s, c] of members) if (find(key(s, c)) !== find(key(members[0][0], members[0][1]))) ok = false;
  }
  return ok;
}
check(propagationOk(QC['2']), 'every abstract corner identification follows from the seven chainings by walking glued edges (level >= 2 table)');
check(propagationOk(QC['1']), 'the same with the level-1 quad-corner table (children at level 1)');

// ---------------------------------------------------------------------------
// C4 — the abstract complex is a disk
// ---------------------------------------------------------------------------
heading(`${family}: C4 the glued children form a disk`);
interface Link { kind: 'cycle' | 'path'; order: [number, number][] } // corners in link order
const links = new Map<string, Map<number, Link>>();
{
  let ok = true;
  for (const T of TYPES) {
    const cc = cornerClasses(T);
    const gluedTo = new Map<string, string>();
    for (const [a, b] of G[T]) { gluedTo.set(`${a.s}.${a.e}`, `${b.s}.${b.e}`); gluedTo.set(`${b.s}.${b.e}`, `${a.s}.${a.e}`); }
    const edgeNode = (s: number, e: number): string => { const k = `${s}.${mod6(e)}`; const g = gluedTo.get(k); return g && g < k ? g : k; };
    const nF = TYPES.filter(() => true).length && (8 - (rules[T].includes('null') ? 1 : 0));
    const nOuter = B[T].flat().length; const nE = G[T].length + nOuter; const nV = cc.classes.size;
    if (nV - nE + nF !== 1) ok = false;
    // connectivity of children through gluings
    const adj = new Map<number, Set<number>>(); for (const [a, b] of G[T]) { (adj.get(a.s) ?? adj.set(a.s, new Set()).get(a.s)!).add(b.s); (adj.get(b.s) ?? adj.set(b.s, new Set()).get(b.s)!).add(a.s); }
    const seen = new Set<number>([0]); const stack = [0]; while (stack.length) { const x = stack.pop()!; for (const y of adj.get(x) ?? []) if (!seen.has(y)) { seen.add(y); stack.push(y); } }
    if (seen.size !== nF) ok = false;
    // links
    const lm = new Map<number, Link>();
    for (const [id, members] of cc.classes) {
      // graph: nodes = edge-nodes incident to the class; each corner (s,c) joins edgeNode(s,c-1) and edgeNode(s,c)
      const deg = new Map<string, [number, number][]>();
      for (const [s, c] of members) for (const en of [edgeNode(s, c - 1), edgeNode(s, c)]) (deg.get(en) ?? deg.set(en, []).get(en)!).push([s, c]);
      const ends = [...deg.entries()].filter(([, v]) => v.length === 1);
      if ([...deg.values()].some((v) => v.length > 2)) { ok = false; continue; }
      if (ends.length !== 0 && ends.length !== 2) { ok = false; continue; }
      // walk
      const order: [number, number][] = []; const used = new Set<string>();
      let cur = ends.length ? ends[0][0] : [...deg.keys()][0];
      // for a path, start at the INCOMING outer edge: it is the outer edge whose corner (s,c) has edgeNode(s,c) === cur (edge c starts at corner c)
      if (ends.length) {
        const isOutgoingStart = (en: string): boolean => members.some(([s, c]) => edgeNode(s, c) === en && !gluedTo.has(`${s}.${c}`));
        // incoming outer edge ends at the corner: edgeNode(s, c-1) === en with (s,c-1) outer
        const isIncoming = (en: string): boolean => members.some(([s, c]) => edgeNode(s, c - 1) === en && !gluedTo.has(`${s}.${mod6(c - 1)}`));
        if (!ends.every(([en]) => !gluedTo.has(en))) { ok = false; continue; }
        cur = ends.find(([en]) => isIncoming(en))![0];
        void isOutgoingStart;
      }
      for (let guard = 0; guard <= members.length; guard++) {
        const next = (deg.get(cur) ?? []).find(([s, c]) => !used.has(`${s}.${c}`));
        if (!next) break;
        used.add(`${next[0]}.${next[1]}`); order.push(next);
        cur = edgeNode(next[0], next[1] - 1) === cur ? edgeNode(next[0], next[1]) : edgeNode(next[0], next[1] - 1);
      }
      if (order.length !== members.length) { ok = false; continue; }
      lm.set(id, { kind: ends.length ? 'path' : 'cycle', order });
    }
    links.set(T, lm);
  }
  check(ok, 'each parent: children connected through gluings, Euler characteristic 1, every vertex link a path (boundary) or a cycle (interior)');
}

// ---------------------------------------------------------------------------
// C5 — corner angles, over the eventual period of the first/last directions
// ---------------------------------------------------------------------------
heading(`${family}: C5 corner angles at every level`);
{
  // state: for each (type, edge): [first, last] direction in the type's frame
  type State = Record<string, [number, number][]>;
  let state: State = {}; for (const T of TYPES) state[T] = W[1][T].map((w) => [w.dir[0], w.dir[w.dir.length - 1]]);
  const stepState = (st: State): State => {
    const out: State = {};
    for (const T of TYPES) out[T] = B[T].map((arc) => {
      const f = arc[0], l = arc[arc.length - 1];
      // D_k(T,j) = rev(phi D(child f)) ... rev(phi D(child l)): first = phi(last of child f's edge), last = phi(first of child l's edge)
      return [apply(PHI[f.s], st[child(T, f.s)][f.e][1]), apply(PHI[l.s], st[child(T, l.s)][l.e][0])];
    });
    return out;
  };
  const turn = (st: State, T: string, c: number): number => { // left turn at corner c, in 30-degree units, in (-6, 6)
    const d = mod(st[T][c][0] - st[T][mod6(c - 1)][1]); if (d === 6) throw new Error(`u-turn at ${T} corner ${c}`); return d > 6 ? d - 12 : d;
  };
  const seen = new Map<string, number>(); const states: State[] = [];
  for (let lv = 1; ; lv++) {
    const k = JSON.stringify(state);
    if (seen.has(k)) { check(true, `the first/last directions are periodic: level ${lv} repeats level ${seen.get(k)}`); break; }
    seen.set(k, lv); states.push(state); state = stepState(state);
    if (lv > 100) throw new Error('no period found');
  }
  // sanity: the recursion reproduces the measured level 2 and 3 first/last directions
  {
    const s2 = stepState(states[0]); const s3 = stepState(s2);
    const m2 = TYPES.every((T) => W[2][T].every((w, j) => w.dir[0] === s2[T][j][0] && w.dir[w.dir.length - 1] === s2[T][j][1]));
    const m3 = TYPES.every((T) => W[3][T].every((w, j) => w.dir[0] === s3[T][j][0] && w.dir[w.dir.length - 1] === s3[T][j][1]));
    check(m2 && m3, 'the recursion reproduces the measured first/last directions at levels 2 and 3');
  }
  let ok = true; let worst = '';
  for (let i = 0; i < states.length; i++) {
    const st = states[i]; const next = stepState(st); // children at level i+1, parent at level i+2
    for (const T of TYPES) {
      const cc = cornerClasses(T); const lm = links.get(T)!;
      for (const [id, members] of cc.classes) {
        const n = members.length;
        const sum = members.reduce((acc, [s, c]) => acc + turn(st, child(T, s), c), 0);
        const interior = lm.get(id)!.kind === 'cycle';
        if (interior) { if (sum !== 6 * (n - 2)) { ok = false; worst = `${T} class ${id} interior sum ${sum} n=${n}`; } }
        else {
          if (!(sum > 6 * (n - 2) && sum < 6 * n)) { ok = false; worst = `${T} class ${id} boundary sum ${sum} n=${n}`; }
          // the parent's own turn there, if it is a parent corner, equals sum - 6(n-1)
          const j = CT[T].findIndex((q) => cc.find(q.s, q.e) === id);
          if (j >= 0 && turn(next, T, j) !== sum - 6 * (n - 1)) { ok = false; worst = `${T} corner ${j} parent turn mismatch`; }
        }
      }
    }
  }
  check(ok, 'at every level: interior vertices get exactly 360 degrees, boundary vertices less, and parent corner angles are the sums', worst);
  // report the corner angle multiset of the types at the two phases
  for (let i = 0; i < Math.min(2, states.length); i++) console.log(`      level ${i + 1} interior angles (deg): ` + TYPES.map((T) => `${T}=[${[0, 1, 2, 3, 4, 5].map((c) => 180 - 30 * turn(states[i], T, c)).join(',')}]`).join(' '));
}

// ---------------------------------------------------------------------------
// C6 — the quad points of the parent are the corners the table says
// ---------------------------------------------------------------------------
heading(`${family}: C6 the quad points`);
{
  const qc = QC['2']; let ok = true;
  // needed(T, i): quad point i of a level-k supertile of type T enters the construction —
  // through the chaining when T sits in a slot, or through the parent quad of a parent
  // P whose quad point is itself needed. Least fixpoint.
  const used = new Map<string, Set<number>>(); for (const T of TYPES) used.set(T, new Set());
  for (const P of TYPES) for (let s = 0; s < 8; s++) {
    const t = child(P, s); if (t === 'null') continue;
    if (s >= 1 && child(P, s - 1) !== 'null') used.get(t)!.add(T_RULES[s - 1][2]);
    if (s <= 6 && child(P, s + 1) !== 'null') used.get(t)!.add(T_RULES[s][1]);
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const P of TYPES) for (const i of [...used.get(P)!]) { const [s, j] = SUPERQUAD[i]; const t = child(P, s); if (!used.get(t)!.has(j)) { used.get(t)!.add(j); changed = true; } }
  }
  for (const T of TYPES) for (const i of used.get(T)!) if (qc[T][i] === null) { ok = false; console.log(`      ${T} quad[${i}] is used but is not a corner`); }
  check(ok, 'every quad point the chaining or the parent quad uses is a corner of the child type');
  // also for the level-1 table
  let ok1 = true; for (const T of TYPES) for (const i of used.get(T)!) if (QC['1'][T][i] === null) ok1 = false;
  check(ok1, 'the same for the level-1 table (the only difference, Gamma quad[2], is unused)');
  // inheritance: parent quad[i] = Ts[s_i](child quad[j_i]); if the parent's quad[i] is used, the child's corner must be the parent corner
  let ok2 = true;
  for (const T of TYPES) for (let i = 0; i < 4; i++) {
    const [s, j] = SUPERQUAD[i]; const t = child(T, s); const cj = qc[t][j];
    const cc = cornerClasses(T);
    if (qc[T][i] !== null) {
      if (cj === null || cc.find(s, cj) !== cc.find(CT[T][qc[T][i]!].s, CT[T][qc[T][i]!].e)) { ok2 = false; console.log(`      ${T} quad[${i}] inheritance fails`); }
    } else if (used.get(T)!.has(i)) ok2 = false;
  }
  check(ok2, 'the parent quad points are the corners the table names (inherited through CT), so the table is level-independent');
  for (const T of TYPES) console.log(`      ${T.padEnd(6)} uses quad ${[...used.get(T)!].sort().join(',')}  corners ${JSON.stringify(qc[T])}`);
}

// ---------------------------------------------------------------------------
// C7 — burial, from B alone
// ---------------------------------------------------------------------------
heading(`${family}: C7 burial`);
{
  // exposed edges of the sub-supertile at address addr (top-down slots) inside a root of type R
  const exposed = (R: string, addr: number[]): { type: string; edges: Set<number> } => {
    let type = R; let ex = new Set<number>([0, 1, 2, 3, 4, 5]);
    for (const s of addr) {
      const t = child(type, s); if (t === 'null') throw new Error('empty slot');
      const nex = new Set<number>();
      for (let j = 0; j < 6; j++) if (ex.has(j)) for (const { s: ss, e } of B[type][j]) if (ss === s) nex.add(e);
      type = t; ex = nex;
    }
    return { type, edges: ex };
  };
  const psiSlots = [0, 1, 2, 3, 4, 5, 6, 7].filter((s) => child('Psi', s) === 'Psi');
  const buried: string[] = [];
  const rec = (addr: number[]): void => { if (addr.length === 4) { if (exposed('Psi', addr).edges.size === 0) buried.push(addr.join('.')); return; } for (const s of psiSlots) rec([...addr, s]); };
  rec([]);
  check(buried.includes('0.0.5.0'), 'the Psi sub-supertile at address 0.0.5.0 of a Psi supertile shares no edge with the outline', `buried depth-4 Psi addresses: ${buried.join(' ')}`);
  let none3 = true; const rec3 = (addr: number[]): void => { if (addr.length === 3) { if (exposed('Psi', addr).edges.size === 0) none3 = false; return; } for (const s of psiSlots) rec3([...addr, s]); }; rec3([]);
  check(none3, 'no depth-3 Psi address is buried (depth 4 is the first)');
  // every type is a sub-supertile of Psi within three levels
  const reach = new Set<string>(['Psi']); for (let d = 0; d < 3; d++) for (const t of [...reach]) for (const c of rules[t]) if (c !== 'null') reach.add(c);
  check(TYPES.every((t) => reach.has(t)), 'every type occurs inside a Psi supertile three levels up');
}

console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
