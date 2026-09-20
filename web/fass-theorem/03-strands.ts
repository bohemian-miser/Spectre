/**
 * 03 — The strands on top of the substitution: the routing operator is fixed.
 *
 * Given the tables of 01/02, a connection dot on the boundary of a level-k
 * supertile is a dot on a leaf edge of one of its six meta-edges, and the leaf
 * label word of a meta-edge obeys the fixed recursion of 02 (labels are
 * properties of the leaf tiles, and a parent traverses each child edge
 * backwards). So the boundary dots of every type, their cyclic order, which
 * pairs of children's dots are welded, and which children's dots become the
 * parent's dots are all determined by B and G alone — the same at every level
 * (this is the "L3" of docs/FASS_PROOF.md, now a corollary).
 *
 * The routing state of a type is the perfect matching its internal arcs induce
 * on its boundary dots, plus its number of circuits. The substitution acts on
 * states by a FIXED operator F (children states -> parent state). This script
 *   1. derives the dot datum from the tables and checks it against exact
 *      geometry at levels 1..5;
 *   2. reads the level-1 states from geometry, iterates F until the state
 *      repeats, and reports the cycle: zero circuits throughout, and Psi's
 *      state is the single arc joining its two dots;
 *   3. checks the iterated states against the traced geometry at levels 2..5.
 * Together with the induction of 02 this proves, for every level k >= 1:
 * no circuits in any supertile, and the Psi supertile's strands are ONE arc.
 *
 * Run: cd web && npx --yes tsx fass-theorem/03-strands.ts [hex128|spectre1278|flagship]
 */
import { readFileSync } from 'node:fs';
import { zAdd, zKey, type TileTypeId } from '../src/core';
import { CONFIGS, buildStrands, heading, trace, verdict, zExpand } from '../fass-proof/lib';
import { TYPES, leaves, outlineOf, edgeLabels } from './geom';

const cfg = CONFIGS[process.argv[2] ?? 'hex128'];
const J = JSON.parse(readFileSync(`fass-theorem/tables-${cfg.family}.json`, 'utf8'));
const B: Record<string, { s: number; e: number }[][]> = J.B;
const G: Record<string, [{ s: number; e: number }, { s: number; e: number }][]> = J.G;
const rules: Record<string, string[]> = J.rules;
const child = (T: string, s: number): string => rules[T][s];
const sel = new Set(cfg.subset);
let allOk = true;
const check = (ok: boolean, label: string, detail = ''): boolean => { allOk = verdict(ok, label, detail) && allOk; return ok; };
const hasDot = (label: string): boolean => { const m = /^(-?)(\d+)\.(\d+)[A-Z]$/.exec(label)!; return +m[3] === 0 && sel.has(+m[2]); };

// ---------------------------------------------------------------------------
// 1. dot datum from the tables
// ---------------------------------------------------------------------------
type Dots = Record<string, boolean[][]>; // type -> edge -> per leaf edge: carries a dot?
const level1: Dots = {};
for (const T of TYPES) level1[T] = J.words['1'][T].map((w: { lab: string[] }) => w.lab.map(hasDot));
const stepDots = (prev: Dots): Dots => { const out: Dots = {}; for (const T of TYPES) out[T] = B[T].map((arc) => arc.flatMap(({ s, e }) => [...prev[child(T, s)][e]].reverse())); return out; };
const dotsAt: Dots[] = [level1]; for (let k = 2; k <= 6; k++) dotsAt.push(stepDots(dotsAt[dotsAt.length - 1]));
const counts = (d: Dots): Record<string, number[]> => Object.fromEntries(TYPES.map((T) => [T, d[T].map((e) => e.filter(Boolean).length)]));

heading(`${cfg.id}: boundary dots per meta-edge, from the tables`);
for (let k = 1; k <= 6; k++) console.log(`      level ${k}: ` + TYPES.map((T) => `${T}=[${counts(dotsAt[k - 1])[T].join(',')}]`).join(' '));
{
  const per = (d: Dots): string => TYPES.map((T) => d[T].reduce((a, e) => a + e.filter(Boolean).length, 0)).join(',');
  const all = dotsAt.map(per);
  check(all.every((x) => x === all[0]), 'the number of boundary dots of every type is the same at levels 1-6', `[${TYPES.join(',')}] = [${all[0]}]`);
  const c = dotsAt.map((d) => JSON.stringify(counts(d)));
  check(c[2] === c[0] && c[3] === c[1] && c[4] === c[2] && c[5] === c[3], 'the per-edge dot counts repeat with period 2 (levels 1..6)');
}

// geometric boundary dots of a level-k supertile, as keys in outline order, and the corner positions
function geoBoundary(T: TileTypeId, k: number): { keys: string[]; perEdge: number[] } {
  const lv = leaves(cfg.family, T, k); const o = outlineOf(cfg.family, lv); const n = o.loop.length;
  const corners: number[] = J.corners[String(k)][T];
  const keys: string[] = []; const perEdge: number[] = [];
  for (let j = 0; j < 6; j++) {
    const a = corners[j], b = corners[(j + 1) % 6]; const len = ((b - a) % n + n) % n; let cnt = 0;
    for (let p = 0; p < len; p++) {
      const i = (a + p) % n; const ow = o.owner[i];
      if (hasDot(edgeLabels(cfg.family, lv[ow.leaf].type)[ow.edge])) { keys.push(zKey(zAdd(o.coord.get(o.loop[i])!, o.coord.get(o.loop[(i + 1) % n])!))); cnt++; }
    }
    perEdge.push(cnt);
  }
  return { keys, perEdge };
}
{
  let ok = true;
  for (let k = 1; k <= 4; k++) for (const T of TYPES) {
    const g = geoBoundary(T, k); const d = counts(dotsAt[k - 1])[T];
    if (JSON.stringify(g.perEdge) !== JSON.stringify(d)) ok = false;
    // the dot pattern along each edge, too
    const pattern = dotsAt[k - 1][T].map((e) => e.map((x) => (x ? 1 : 0)).join(''));
    const lv = leaves(cfg.family, T, k); const o = outlineOf(cfg.family, lv); const n = o.loop.length; const corners: number[] = J.corners[String(k)][T];
    const geoPattern = [0, 1, 2, 3, 4, 5].map((j) => { const a = corners[j], b = corners[(j + 1) % 6]; const len = ((b - a) % n + n) % n; let s = ''; for (let p = 0; p < len; p++) { const ow = o.owner[(a + p) % n]; s += hasDot(edgeLabels(cfg.family, lv[ow.leaf].type)[ow.edge]) ? '1' : '0'; } return s; });
    if (JSON.stringify(pattern) !== JSON.stringify(geoPattern)) ok = false;
  }
  check(ok, 'the derived dot pattern along every meta-edge equals the geometric one at levels 1-4');
}

// ---------------------------------------------------------------------------
// 2. routing states and the operator F
// ---------------------------------------------------------------------------
interface State { pairs: [number, number][]; circuits: number } // matching on boundary dot indices
type States = Record<string, State>;

/** boundary dots of the parent = concatenation over parent edges of reversed child edges' dots */
function parentLayout(T: string, prev: Dots): { outer: { s: number; e: number; i: number }[]; nDots: (s: number, e: number) => number } {
  const nDots = (s: number, e: number): number => prev[child(T, s)][e].filter(Boolean).length;
  const outer: { s: number; e: number; i: number }[] = [];
  for (const arc of B[T]) for (const { s, e } of arc) for (let i = nDots(s, e) - 1; i >= 0; i--) outer.push({ s, e, i });
  return { outer, nDots };
}
/** dot index (in the child's cyclic boundary list) of dot i on edge e of the child at slot s */
function childDotIndex(T: string, prev: Dots, s: number, e: number, i: number): number {
  const d = prev[child(T, s)]; let idx = 0; for (let j = 0; j < e; j++) idx += d[j].filter(Boolean).length; return idx + i;
}
function F(T: string, prev: Dots, states: States): State {
  const { outer, nDots } = parentLayout(T, prev);
  const key = (s: number, g: number): string => `${s}:${g}`;
  const link = new Map<string, string[]>(); // node -> neighbours (matching edges + welds)
  const add = (a: string, b: string): void => { (link.get(a) ?? link.set(a, []).get(a)!).push(b); (link.get(b) ?? link.set(b, []).get(b)!).push(a); };
  for (let s = 0; s < 8; s++) { if (child(T, s) === 'null') continue; for (const [a, b] of states[child(T, s)].pairs) add(key(s, a), key(s, b)); }
  for (const [a, b] of G[T]) { const n = nDots(a.s, a.e); if (n !== nDots(b.s, b.e)) throw new Error('glued edges carry different dot counts'); for (let i = 0; i < n; i++) add(key(a.s, childDotIndex(T, prev, a.s, a.e, i)), key(b.s, childDotIndex(T, prev, b.s, b.e, n - 1 - i))); }
  const outerIndex = new Map<string, number>(); outer.forEach((o, idx) => outerIndex.set(key(o.s, childDotIndex(T, prev, o.s, o.e, o.i)), idx));
  for (const [node, nb] of link) if (nb.length !== (outerIndex.has(node) ? 1 : 2)) throw new Error(`dot ${node} of ${T} has degree ${nb.length}`);
  const seen = new Set<string>(); const pairs: [number, number][] = [];
  for (const [node, idx] of outerIndex) {
    if (seen.has(node)) continue;
    let prevNode = node, cur = link.get(node)![0]; seen.add(node);
    while (!outerIndex.has(cur)) { seen.add(cur); const nb = link.get(cur)!; const next = nb[0] === prevNode ? nb[1] : nb[0]; prevNode = cur; cur = next; }
    seen.add(cur); pairs.push([idx, outerIndex.get(cur)!]);
  }
  let circuits = 0;
  for (const [s, st] of Object.entries(states)) void s, void st;
  for (let s = 0; s < 8; s++) if (child(T, s) !== 'null') circuits += states[child(T, s)].circuits;
  for (const node of link.keys()) { if (seen.has(node)) continue; circuits++; let prevNode = node, cur = link.get(node)![0]; seen.add(node); while (cur !== node) { seen.add(cur); const nb = link.get(cur)!; const next = nb[0] === prevNode ? nb[1] : nb[0]; prevNode = cur; cur = next; } }
  pairs.sort((x, y) => Math.min(...x) - Math.min(...y));
  return { pairs: pairs.map(([a, b]) => (a < b ? [a, b] : [b, a])), circuits };
}
const stateKey = (st: States): string => JSON.stringify(TYPES.map((T) => [st[T].pairs, st[T].circuits]));

/** the state of a level-k supertile from exact geometry */
function geoState(T: TileTypeId, k: number): State {
  const strands = buildStrands(cfg, zExpand(cfg.family, T, k)); const tr = trace(strands);
  const { keys } = geoBoundary(T, k); const index = new Map(keys.map((key, i) => [key, i] as const));
  const pairs: [number, number][] = [];
  for (const arc of tr.arcs) { const [a, b] = arc.endpoints.map((key) => index.get(key)); if (a === undefined || b === undefined) throw new Error(`${T}@${k}: an arc ends off the boundary`); pairs.push(a < b ? [a, b] : [b, a]); }
  pairs.sort((x, y) => x[0] - y[0]);
  if (tr.maxDegree > 2 || tr.junctions > 0) throw new Error('junction');
  return { pairs, circuits: tr.circuits.length };
}

heading(`${cfg.id}: the routing operator F, iterated from the level-1 states`);
let states: States = Object.fromEntries(TYPES.map((T) => [T, geoState(T, 1)]));
const orbit: States[] = [states]; const seenKeys = new Map<string, number>([[stateKey(states), 1]]);
let cycleStart = 0, cycleLen = 0;
for (let k = 2; k <= 40; k++) {
  // the children's dot layout at level k-1 has period 2 in k (checked above), and F only reads counts
  const next: States = Object.fromEntries(TYPES.map((T) => [T, F(T, dotsAt[(k - 2) % 2], states)]));
  const key = stateKey(next);
  if (seenKeys.has(key)) { cycleStart = seenKeys.get(key)!; cycleLen = k - cycleStart; break; }
  seenKeys.set(key, k); orbit.push(next); states = next;
}
check(cycleLen > 0, `the orbit of F is eventually periodic: level ${cycleStart + cycleLen} repeats level ${cycleStart}`, `pre-period ${cycleStart - 1}, period ${cycleLen}`);
check(orbit.every((st) => TYPES.every((T) => st[T].circuits === 0)), 'zero circuits in every type at every level of the orbit (hence at every level)');
check(orbit.every((st) => st.Psi.pairs.length === 1), 'the Psi supertile is one arc joining its two boundary dots at every level');
for (let i = 0; i < orbit.length; i++) console.log(`      level ${i + 1}: ` + TYPES.map((T) => `${T}:${orbit[i][T].pairs.map(([a, b]) => `${a}-${b}`).join(' ')}`).join('  '));
{
  let ok = true;
  const stateAt = (k: number): States => (k - 1 < orbit.length ? orbit[k - 1] : orbit[cycleStart - 1 + ((k - cycleStart) % cycleLen)]);
  for (let k = 2; k <= 4; k++) for (const T of TYPES) { const g = geoState(T, k); if (JSON.stringify(g) !== JSON.stringify(stateAt(k)[T])) { ok = false; console.log(`      mismatch ${T}@${k}: geometry ${JSON.stringify(g)} vs F ${JSON.stringify(stateAt(k)[T])}`); } }
  check(ok, 'the iterated states agree with the traced geometry at levels 2-4 (every type)');
}
{
  // every tile visited: every leaf type carries a chord (an even non-zero dot count), so with no circuits every chord is on an arc
  const lv = leaves(cfg.family, 'Psi', 3); const tr = trace(buildStrands(cfg, zExpand(cfg.family, 'Psi', 3)));
  check(tr.tilesCovered === lv.length && tr.arcs.length === 1, 'Psi level 3: the one arc visits every tile', `${lv.length} tiles`);
}
console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
