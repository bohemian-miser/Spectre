/**
 * 04 — Vertex stars: finite local complexity, and self-avoidance at every level.
 *
 * A vertex star is the cyclic sequence of (leaf type, leaf vertex) around a
 * vertex of the tiling. Every vertex of the hierarchy is, at the level where
 * it stops being a boundary vertex, either
 *   (i)  a corner class of a parent where several children meet — its star is
 *        the concatenation of the children's CORNER FANS, or
 *   (ii) interior to a glued pair of meta-edges — its star is the union of the
 *        two supertiles' boundary fans there, which are JUNCTION FANS of the
 *        sub-edges, paired as the word claims of 02 pair them.
 * Corner and junction fans obey a fixed recursion in the level (a boundary
 * fan of a parent is the concatenation of the fans of the children meeting
 * there, in the order of the vertex link), so the state "all fans" is
 * eventually periodic and the set of ALL vertex stars at ALL levels is finite
 * and enumerable. This script enumerates it, realises every star as an actual
 * placement of leaf tiles (checking the angles close to 360 degrees), and
 * checks that no two drawn chords of the configuration cross in any star.
 *
 * Two tiles that share a point share a vertex (the tiling is edge-to-edge), so
 * this covers every pair of touching tiles. Tiles that do NOT touch are at
 * distance at least d (Lemma in docs/FASS_THEOREM.md §6), while a chord never
 * strays farther than eps from its own tile; the constants r_min, w_min, eps
 * that lemma needs are computed here too.
 *
 * Run: cd web && npx --yes tsx fass-theorem/04-stars.ts [hex128|spectre1278|flagship]
 */
import { readFileSync } from 'node:fs';
import { leafPts, type TileTypeId } from '../src/core';
import { CONFIGS, floatChords, heading, verdict } from '../fass-proof/lib';
import { TYPES, leaves, outlineOf, stepDir, UNIT_INDEX, zKey, zApply, zLeafPts, zSub, type Leaf } from './geom';

const cfg = CONFIGS[process.argv[2] ?? 'hex128'];
const family = cfg.family;
const J = JSON.parse(readFileSync(`fass-theorem/tables-${family}.json`, 'utf8'));
const B: Record<string, { s: number; e: number }[][]> = J.B;
const G: Record<string, [{ s: number; e: number }, { s: number; e: number }][]> = J.G;
const CT: Record<string, { s: number; e: number }[]> = J.CT;
const rules: Record<string, string[]> = J.rules;
const child = (T: string, s: number): string => rules[T][s];
const mod6 = (x: number): number => ((x % 6) + 6) % 6;
let allOk = true;
const check = (ok: boolean, label: string, detail = ''): boolean => { allOk = verdict(ok, label, detail) && allOk; return ok; };

type Fan = string[]; // "leafType:vertexIndex" in ccw order, from the tile on the outgoing outline edge to the tile on the incoming one
const rev = (f: Fan): Fan => [...f].reverse();
// A star is listed counter-clockwise in the frame of the level where it forms; the leaves of
// that level all carry the same mirror parity (odd levels are mirror images). Normalise to
// parity 0 by reversing an odd-level list, then take the least rotation. The realisation
// below places UNMIRRORED leaves counter-clockwise, which is exactly a parity-0 star.
const canonStar = (star: Fan, parity: number): string => { const s = parity ? rev(star) : star; const n = s.length; let best = ''; for (let r = 0; r < n; r++) { const w = [...s.slice(r), ...s.slice(0, r)].join(' '); if (!best || w < best) best = w; } return best; };

// ---------------------------------------------------------------------------
// Level-1 fans and stars from exact geometry
// ---------------------------------------------------------------------------
interface Sector { leaf: number; vertex: number; start: number; end: number } // ccw sector [start, end) in 30-degree units
function sectorsAt(lv: Leaf[]): Map<string, Sector[]> {
  const out = new Map<string, Sector[]>();
  lv.forEach((it, li) => {
    const poly = zLeafPts(family, it.type).map((p) => zApply(it.xform, p)); const n = poly.length;
    // orientation of the placed polygon: mirrored transforms flip it
    const ccw = it.xform.m === 0;
    for (let i = 0; i < n; i++) {
      const v = poly[i], nx = poly[(i + 1) % n], pv = poly[(i - 1 + n) % n];
      const dNext = UNIT_INDEX.get(zKey(zSub(nx, v)))!, dPrev = UNIT_INDEX.get(zKey(zSub(pv, v)))!;
      const [start, end] = ccw ? [dNext, dPrev] : [dPrev, dNext];
      (out.get(zKey(v)) ?? out.set(zKey(v), []).get(zKey(v))!).push({ leaf: li, vertex: i, start, end });
    }
  });
  return out;
}
function fanFrom(lv: Leaf[], secs: Sector[], startDir: number, endDir: number | null): Fan {
  // chain sectors ccw from startDir; endDir null = full circle
  const fan: Fan = []; let cur = startDir; const used = new Set<number>();
  for (let guard = 0; guard < secs.length; guard++) {
    const idx = secs.findIndex((s, i) => !used.has(i) && s.start === cur);
    if (idx < 0) throw new Error('sector chain broken');
    used.add(idx); fan.push(`${lv[secs[idx].leaf].type}:${secs[idx].vertex}`); cur = secs[idx].end;
    if (endDir !== null && cur === endDir) break;
    if (endDir === null && cur === startDir) break;
  }
  if (endDir === null ? cur !== startDir : cur !== endDir) throw new Error('sector chain does not close');
  if (endDir === null && used.size !== secs.length) throw new Error('extra sectors at an interior vertex');
  return fan;
}
const level1 = { CF: {} as Record<string, Fan[]>, BF: {} as Record<string, Fan[][]>, stars: new Set<string>() };
for (const T of TYPES) {
  const lv = leaves(family, T, 1); const o = outlineOf(family, lv); const secs = sectorsAt(lv); const n = o.loop.length;
  const onOutline = new Set(o.loop);
  for (const [k, ss] of secs) if (!onOutline.has(k)) level1.stars.add(canonStar(fanFrom(lv, ss, ss[0].start, null), 1)); // level-1 leaves are mirrored
  const fanAtLoop = (i: number): Fan => { const v = o.loop[i]; const dOut = stepDir(o.coord, v, o.loop[(i + 1) % n]); const dIn = stepDir(o.coord, v, o.loop[(i - 1 + n) % n]); return fanFrom(lv, secs.get(v)!, dOut, dIn); };
  const corners: number[] = J.corners['1'][T];
  level1.CF[T] = corners.map(fanAtLoop);
  level1.BF[T] = [0, 1, 2, 3, 4, 5].map((j) => { const a = corners[j], b = corners[(j + 1) % 6]; const len = ((b - a) % n + n) % n; const fans: Fan[] = []; for (let p = 0; p < len; p++) fans.push(fanAtLoop((a + p) % n)); return fans; });
}

// ---------------------------------------------------------------------------
// Abstract vertex classes and their links, with the traversal direction of each corner
// ---------------------------------------------------------------------------
interface LinkEntry { s: number; c: number; forward: boolean } // forward: the walk passes the corner from its outgoing edge (s,c) to its incoming edge (s,c-1)
interface ClassInfo { members: [number, number][]; kind: 'cycle' | 'path'; order: LinkEntry[]; parentCorner: number | null; junction: { j: number; i: number } | null }
function analyse(T: string): ClassInfo[] {
  const parent = new Map<string, string>();
  const key = (s: number, c: number): string => `${s}.${mod6(c)}`;
  const find = (k: string): string => { while (parent.get(k) !== k) k = parent.get(k)!; return k; };
  const union = (a: string, b: string): void => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (let s = 0; s < 8; s++) if (child(T, s) !== 'null') for (let c = 0; c < 6; c++) parent.set(key(s, c), key(s, c));
  for (const [a, b] of G[T]) { union(key(a.s, a.e), key(b.s, b.e + 1)); union(key(a.s, a.e + 1), key(b.s, b.e)); }
  const all = B[T].flat();
  for (let i = 0; i < all.length; i++) { const x = all[i], y = all[(i + 1) % all.length]; union(key(x.s, x.e), key(y.s, y.e + 1)); }
  const gluedTo = new Map<string, string>(); for (const [a, b] of G[T]) { gluedTo.set(key(a.s, a.e), key(b.s, b.e)); gluedTo.set(key(b.s, b.e), key(a.s, a.e)); }
  const edgeNode = (s: number, e: number): string => { const k = key(s, e); const g = gluedTo.get(k); return g && g < k ? g : k; };
  const byRoot = new Map<string, [number, number][]>();
  for (const k of parent.keys()) (byRoot.get(find(k)) ?? byRoot.set(find(k), []).get(find(k))!).push(k.split('.').map(Number) as [number, number]);
  const out: ClassInfo[] = [];
  for (const members of byRoot.values()) {
    const deg = new Map<string, [number, number][]>();
    for (const [s, c] of members) for (const en of [edgeNode(s, c - 1), edgeNode(s, c)]) (deg.get(en) ?? deg.set(en, []).get(en)!).push([s, c]);
    const ends = [...deg.entries()].filter(([, v]) => v.length === 1).map(([en]) => en);
    const kind: 'cycle' | 'path' = ends.length ? 'path' : 'cycle';
    // path: start at the incoming outer edge (the outer edge (s, c-1) ending at a member corner)
    let cur = kind === 'path' ? ends.find((en) => members.some(([s, c]) => edgeNode(s, c - 1) === en && !gluedTo.has(key(s, c - 1))))! : edgeNode(members[0][0], members[0][1]);
    const order: LinkEntry[] = []; const used = new Set<string>();
    for (let guard = 0; guard <= members.length; guard++) {
      const next = (deg.get(cur) ?? []).find(([s, c]) => !used.has(key(s, c))); if (!next) break;
      used.add(key(next[0], next[1]));
      const forward = edgeNode(next[0], next[1]) === cur; // entered via the outgoing edge (s,c)
      order.push({ s: next[0], c: next[1], forward });
      cur = forward ? edgeNode(next[0], next[1] - 1) : edgeNode(next[0], next[1]);
    }
    if (order.length !== members.length) throw new Error(`${T}: link walk incomplete`);
    if (!order.every((o) => o.forward === order[0].forward)) throw new Error(`${T}: inconsistent link direction`);
    if (kind === 'path' && order[0].forward) throw new Error(`${T}: a boundary walk should pass every child clockwise in its own frame`);
    const parentCorner = CT[T].findIndex((q) => find(key(q.s, q.e)) === find(key(members[0][0], members[0][1])));
    let junction: { j: number; i: number } | null = null;
    if (kind === 'path' && parentCorner < 0) {
      for (let j = 0; j < 6 && !junction; j++) for (let i = 0; i + 1 < B[T][j].length; i++) { const x = B[T][j][i]; if (find(key(x.s, x.e)) === find(key(members[0][0], members[0][1]))) { junction = { j, i }; break; } }
      if (!junction) throw new Error(`${T}: boundary class is neither a parent corner nor a junction`);
    }
    out.push({ members, kind, order, parentCorner: parentCorner < 0 ? null : parentCorner, junction });
  }
  return out;
}
const classInfo: Record<string, ClassInfo[]> = Object.fromEntries(TYPES.map((T) => [T, analyse(T)]));

// ---------------------------------------------------------------------------
// The recursion on fans
// ---------------------------------------------------------------------------
// The link walk of a boundary class starts at the parent's OUTGOING outer edge (a child's incoming
// edge, since the parent traverses child edges backwards) and ends at the parent's incoming one, so
// it sweeps counter-clockwise in the parent frame; that is clockwise in every child's frame, and
// each child's sector is passed from its incoming to its outgoing edge, i.e. as rev(fan). Hence
//   parent fan (ccw, outgoing -> incoming) = concat over the walk of (forward ? fan : rev fan),
// and an interior class read the same way is a star listed ccw in the parent frame.
type FanState = { CF: Record<string, Fan[]>; JF: Record<string, Map<string, Fan>> }; // JF keyed "j.i"
function sweep(T: string, ci: ClassInfo, CFprev: Record<string, Fan[]>): Fan {
  const parts: Fan[] = ci.order.map(({ s, c, forward }) => (forward ? CFprev[child(T, s)][c] : rev(CFprev[child(T, s)][c])));
  return parts.flat();
}
function stepFans(prev: Record<string, Fan[]>): { state: FanState; interiorStars: Set<string> } {
  const CF: Record<string, Fan[]> = {}; const JF: Record<string, Map<string, Fan>> = {}; const interiorStars = new Set<string>();
  for (const T of TYPES) {
    CF[T] = new Array(6); JF[T] = new Map();
    for (const ci of classInfo[T]) {
      const sw = sweep(T, ci, prev);
      // a cycle walk has no preferred start: if it passed the children counter-clockwise in their own frames it is clockwise in the parent's, so flip it
      if (ci.kind === 'cycle') interiorStars.add((ci.order[0].forward ? rev(sw) : sw).join(' ')); // ccw in the parent frame; parity applied by the caller
      else if (ci.parentCorner !== null) CF[T][ci.parentCorner] = sw;
      else JF[T].set(`${ci.junction!.j}.${ci.junction!.i}`, sw);
    }
  }
  return { state: { CF, JF }, interiorStars };
}
// glued-internal stars for a claim (a,e)~(b,e') at children level k (fans of level k): junction i of (a,e) meets junction m-i of (b,e')
type ClaimRef = { a: string; e: number; b: string; f: number };
function claimsClosure(): ClaimRef[] {
  const seen = new Map<string, ClaimRef>(); const queue: ClaimRef[] = [];
  const add = (c: ClaimRef): void => { const k = `${c.a}.${c.e}|${c.b}.${c.f}`; if (!seen.has(k)) { seen.set(k, c); queue.push(c); } };
  for (const T of TYPES) for (const [x, y] of G[T]) { add({ a: child(T, x.s), e: x.e, b: child(T, y.s), f: y.e }); add({ a: child(T, y.s), e: y.e, b: child(T, x.s), f: x.e }); }
  while (queue.length) { const c = queue.shift()!; const Ba = B[c.a][c.e], Bb = B[c.b][c.f]; const m = Ba.length; for (let i = 0; i < m; i++) { const x = Ba[i], y = Bb[m - 1 - i]; add({ a: child(c.a, x.s), e: x.e, b: child(c.b, y.s), f: y.e }); } }
  return [...seen.values()];
}
const claims = claimsClosure();

// geometric corner and junction fans at levels 2 and 3, to pin the orientation convention of the recursion
function geoFans(k: number): { CF: Record<string, Fan[]>; JF: Record<string, Map<string, Fan>> } {
  const CF: Record<string, Fan[]> = {}; const JF: Record<string, Map<string, Fan>> = {};
  for (const T of TYPES) {
    const lv = leaves(family, T, k); const o = outlineOf(family, lv); const secs = sectorsAt(lv); const n = o.loop.length;
    const fanAtLoop = (i: number): Fan => { const v = o.loop[i]; const dOut = stepDir(o.coord, v, o.loop[(i + 1) % n]); const dIn = stepDir(o.coord, v, o.loop[(i - 1 + n) % n]); return fanFrom(lv, secs.get(v)!, dOut, dIn); };
    const corners: number[] = J.corners[String(k)][T];
    CF[T] = corners.map(fanAtLoop); JF[T] = new Map();
    // junction positions: cumulative lengths of the sub-edges (children at level k-1)
    const lenPrev = (t: string, e: number): number => { const lc = leaves(family, t as TileTypeId, k - 1); const oc = outlineOf(family, lc); const cc: number[] = J.corners[String(k - 1)][t]; return ((cc[(e + 1) % 6] - cc[e]) % oc.loop.length + oc.loop.length) % oc.loop.length; };
    for (let j = 0; j < 6; j++) { let pos = corners[j]; for (let i = 0; i + 1 < B[T][j].length; i++) { pos = (pos + lenPrev(child(T, B[T][j][i].s), B[T][j][i].e)) % n; JF[T].set(`${j}.${i}`, fanAtLoop(pos)); } }
  }
  return { CF, JF };
}
{
  let prevCF = level1.CF; let ok = true; let detail = '';
  for (const k of [2, 3]) {
    const { state } = stepFans(prevCF); const g = geoFans(k);
    for (const T of TYPES) {
      for (let c = 0; c < 6; c++) if (state.CF[T][c].join(' ') !== g.CF[T][c].join(' ')) { ok = false; detail = detail || `CF_${k}(${T},${c}): recursion [${state.CF[T][c]}] geometry [${g.CF[T][c]}]`; }
      for (const [key, fan] of state.JF[T]) if (fan.join(' ') !== g.JF[T].get(key)!.join(' ')) { ok = false; detail = detail || `JF_${k}(${T},${key}): recursion [${fan}] geometry [${g.JF[T].get(key)}]`; }
    }
    prevCF = g.CF;
  }
  check(ok, 'the fan recursion reproduces the geometric corner and junction fans at levels 2 and 3, tile by tile and in order', detail);
}

heading(`${cfg.id}: enumerating every vertex star of every level`);
const allStars = new Map<string, number>(); // canonical star -> first level seen
const origin = new Map<string, string>();
for (const s of level1.stars) { allStars.set(s, 1); origin.set(s, 'level-1 interior'); }
// level-2 glued-internal stars come from the level-1 boundary fans at every position
for (const c of claims) {
  const fa = level1.BF[c.a][c.e], fb = level1.BF[c.b][c.f]; const n = fa.length;
  if (n !== fb.length) throw new Error('claim edges differ in length at level 1');
  for (let p = 1; p < n; p++) { const key = canonStar([...rev(fa[p]), ...rev(fb[n - p])], 0); if (!allStars.has(key)) { allStars.set(key, 2); origin.set(key, `level-2 glued interior of claim ${c.a}.${c.e}~${c.b}.${c.f} at p=${p}`); } } // formed in the level-2 frame
}
let state: FanState = { CF: level1.CF, JF: {} }; const seenStates = new Map<string, number>([[JSON.stringify(level1.CF), 1]]);
let periodInfo = '';
for (let k = 2; k <= 60; k++) {
  const { state: next, interiorStars } = stepFans(state.CF); // next = fans of level k; interior stars of level-k parents
  for (const s of interiorStars) { const key = canonStar(s.split(' '), k % 2); if (!allStars.has(key)) { allStars.set(key, k); origin.set(key, `level-${k} interior class`); } }
  // glued-internal stars at level k+1 between level-k supertiles a and b, at their junctions
  for (const c of claims) {
    const m = B[c.a][c.e].length;
    for (let i = 1; i < m; i++) { const fa = next.JF[c.a].get(`${c.e}.${i - 1}`)!, fb = next.JF[c.b].get(`${c.f}.${m - i - 1}`)!; const key = canonStar([...rev(fa), ...rev(fb)], (k + 1) % 2); if (!allStars.has(key)) { allStars.set(key, k + 1); origin.set(key, `level-${k + 1} junction of claim ${c.a}.${c.e}~${c.b}.${c.f} at i=${i} of ${m}`); } }
  }
  const key = JSON.stringify(next.CF);
  if (seenStates.has(key)) { periodInfo = `fan state at level ${k} repeats level ${seenStates.get(key)}`; break; }
  seenStates.set(key, k); state = next;
}
check(periodInfo !== '', 'the corner fans are eventually periodic in the level, so the enumeration is complete', periodInfo);
const byLevel = new Map<number, number>(); for (const lv of allStars.values()) byLevel.set(lv, (byLevel.get(lv) ?? 0) + 1);
console.log(`      distinct vertex stars: ${allStars.size}; first seen at level: ${[...byLevel.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' ')}`);

// ---------------------------------------------------------------------------
// Validation against exact geometry: the interior vertex stars of every root at levels 1..VAL
// ---------------------------------------------------------------------------
const VAL = Number(process.argv[3] ?? 5);
{
  const geo = new Map<string, number>();
  for (let k = 1; k <= VAL; k++) for (const T of TYPES) {
    const lv = leaves(family, T, k); const o = outlineOf(family, lv); const onOutline = new Set(o.loop); const secs = sectorsAt(lv);
    for (const [key, ss] of secs) if (!onOutline.has(key)) { const c = canonStar(fanFrom(lv, ss, ss[0].start, null), k % 2); if (!geo.has(c)) geo.set(c, k); }
  }
  const predictedByNow = [...allStars.entries()].filter(([, lv]) => lv <= VAL).map(([s]) => s);
  const missing = [...geo.keys()].filter((s) => !allStars.has(s));
  const spurious = predictedByNow.filter((s) => !geo.has(s));
  check(missing.length === 0, `every interior vertex star found in the level 1..${VAL} patches of all nine roots is in the enumeration`, `${geo.size} geometric stars`);
  check(spurious.length === 0, `every enumerated star first seen at level <= ${VAL} occurs in those patches`, spurious.length ? `spurious: ${spurious.map((x) => `${x} [${origin.get(x)}]`).join(' | ')}` : '');
  let lvOk = true; for (const [s, k] of geo) if (allStars.get(s)! > k) lvOk = false;
  check(lvOk, 'no star occurs geometrically before the level the enumeration first forms it');
}

// ---------------------------------------------------------------------------
// Realise each star and check the chords
// ---------------------------------------------------------------------------
type P = { x: number; y: number };
const chordsLocal: Record<string, [P, P][]> = {}; for (const t of new Set(TYPES.flatMap((T) => leaves(family, T, 1).map((l) => l.type)))) chordsLocal[t] = floatChords(cfg, t as TileTypeId).map(([a, b]) => [a, b]);
function interiorAngle(pts: readonly P[], i: number): number { const n = pts.length; const v = pts[i], a = pts[(i + 1) % n], b = pts[(i - 1 + n) % n]; let ang = Math.atan2(b.y - v.y, b.x - v.x) - Math.atan2(a.y - v.y, a.x - v.x); while (ang <= 0) ang += 2 * Math.PI; while (ang > 2 * Math.PI) ang -= 2 * Math.PI; return ang; }
function segDist(a: P, b: P, c: P, d: P): number { // distance between segments ab and cd
  const pd = (p: P, s: P, t: P): number => { const l2 = (t.x - s.x) ** 2 + (t.y - s.y) ** 2; const u = Math.max(0, Math.min(1, ((p.x - s.x) * (t.x - s.x) + (p.y - s.y) * (t.y - s.y)) / l2)); return Math.hypot(p.x - s.x - u * (t.x - s.x), p.y - s.y - u * (t.y - s.y)); };
  return Math.min(pd(a, c, d), pd(b, c, d), pd(c, a, b), pd(d, a, b));
}
// proper crossing, with a 1e-9 tolerance: orientations of chords that share a welded endpoint are zero up to rounding
function cross(a: P, b: P, c: P, d: P): boolean { const o = (p: P, q: P, r: P): number => { const v = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x); return Math.abs(v) < 1e-9 ? 0 : v; }; const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b); return o1 * o2 < 0 && o3 * o4 < 0; }
let realiseOk = true, crossings = 0, minClear = Infinity, maxTiles = 0;
for (const star of allStars.keys()) {
  const items = star.split(' ').map((w) => { const [t, v] = w.split(':'); return { t: t as TileTypeId, v: +v }; });
  let ang = 0; const placed: { pts: P[]; chords: [P, P][] }[] = [];
  for (const { t, v } of items) {
    const pts = leafPts(family, t); const n = pts.length; const vtx = pts[v], nx = pts[(v + 1) % n];
    const base = Math.atan2(nx.y - vtx.y, nx.x - vtx.x); const rot = ang - base;
    const tf = (p: P): P => ({ x: Math.cos(rot) * (p.x - vtx.x) - Math.sin(rot) * (p.y - vtx.y), y: Math.sin(rot) * (p.x - vtx.x) + Math.cos(rot) * (p.y - vtx.y) });
    placed.push({ pts: pts.map(tf), chords: chordsLocal[t].map(([a, b]) => [tf(a), tf(b)]) });
    ang += interiorAngle(pts, v);
  }
  if (Math.abs(ang - 2 * Math.PI) > 1e-9) realiseOk = false;
  maxTiles = Math.max(maxTiles, items.length);
  for (let i = 0; i < placed.length; i++) for (let j = i; j < placed.length; j++) for (const [a, b] of placed[i].chords) for (const [c, d] of placed[j].chords) {
    if (i === j && a === c) continue;
    if (cross(a, b, c, d)) { crossings++; if (crossings <= 3) console.log(`      crossing in star [${star}] tiles ${i},${j}`); }
    const shared = [a, b].some((p) => [c, d].some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-9));
    if (!shared) minClear = Math.min(minClear, segDist(a, b, c, d));
  }
}
check(realiseOk, 'every enumerated star closes up to exactly 360 degrees when its tiles are placed');
check(crossings === 0, 'no two chords of tiles sharing a vertex cross, in any star', `min clearance between chords without a common endpoint ${minClear.toFixed(6)}; up to ${maxTiles} tiles at a vertex`);

// ---------------------------------------------------------------------------
// Constants for the separation lemma
// ---------------------------------------------------------------------------
heading(`${cfg.id}: constants for tiles that do not touch`);
{
  const leafTypes = [...new Set(TYPES.flatMap((T) => leaves(family, T, 1).map((l) => l.type)))] as TileTypeId[];
  let rMin = Infinity, wMin = Infinity, eps = 0, angMin = Infinity;
  const pd = (p: P, s: P, t: P): number => { const l2 = (t.x - s.x) ** 2 + (t.y - s.y) ** 2; const u = Math.max(0, Math.min(1, ((p.x - s.x) * (t.x - s.x) + (p.y - s.y) * (t.y - s.y)) / l2)); return Math.hypot(p.x - s.x - u * (t.x - s.x), p.y - s.y - u * (t.y - s.y)); };
  const inside = (p: P, poly: readonly P[]): boolean => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { if ((poly[i].y > p.y) !== (poly[j].y > p.y) && p.x < ((poly[j].x - poly[i].x) * (p.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x) c = !c; } return c; };
  for (const t of leafTypes) {
    const pts = leafPts(family, t); const n = pts.length;
    for (let i = 0; i < n; i++) { angMin = Math.min(angMin, interiorAngle(pts, i)); for (let e = 0; e < n; e++) { if (e === i || (e + 1) % n === i) continue; rMin = Math.min(rMin, pd(pts[i], pts[e], pts[(e + 1) % n])); } }
    for (let e = 0; e < n; e++) for (let f = e + 2; f < n; f++) { if (e === 0 && f === n - 1) continue; wMin = Math.min(wMin, segDist(pts[e], pts[(e + 1) % n], pts[f], pts[(f + 1) % n])); }
    for (const [a, b] of chordsLocal[t]) for (let k = 0; k <= 4000; k++) { const p = { x: a.x + (k / 4000) * (b.x - a.x), y: a.y + (k / 4000) * (b.y - a.y) }; if (!inside(p, pts)) { let d = Infinity; for (let e = 0; e < n; e++) d = Math.min(d, pd(p, pts[e], pts[(e + 1) % n])); eps = Math.max(eps, d); } }
  }
  console.log(`      r_min (vertex to non-incident edge) = ${rMin.toFixed(6)}`);
  console.log(`      w_min (non-adjacent edges)          = ${wMin.toFixed(6)}`);
  console.log(`      smallest interior angle             = ${(angMin * 180 / Math.PI).toFixed(2)} degrees`);
  console.log(`      eps (farthest a chord strays outside its tile, sampled) = ${eps.toFixed(6)}  (closed form (2*sqrt3-3)/8 = ${((2 * Math.sqrt(3) - 3) / 8).toFixed(6)} for the spectre)`);
  const sinT = Math.sin(angMin); const d = Math.min(wMin, (rMin * sinT) / (1 + sinT));
  console.log(`      separation d = min(w_min, r_min sin(theta)/(1+sin(theta))) = ${d.toFixed(6)} versus 2 eps = ${(2 * eps).toFixed(6)}`);
  check(d > 2 * eps + 1e-9, 'tiles that do not share a vertex are farther apart than twice the chord excursion, so their chords cannot meet');
}
console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
