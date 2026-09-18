/**
 * zz-audit-07.ts — ADVERSARIAL AUDIT of fass-proof/07-literature.md.
 *
 * 07 is a citation briefing, not a computation, so it cannot be "re-run".
 * What CAN be re-run is every claim it makes about THIS REPO, plus the one
 * mathematical claim it promotes to "proved for all k" (lambda = 4 + sqrt(15)).
 *
 * This script checks those, by routes independent of the briefing's:
 *   A  exact BigInt characteristic polynomial of the substitution matrix
 *   B  an exact integer LINEAR RECURRENCE for the tile counts (for all k)
 *   C  high-precision lambda, and the SUBSTITUTION_GROWTH error
 *   D  edge-class major sets per family
 *   E  what class 7 actually IS (the briefing asserts, never says)
 *   F  the hex<->spectre meta-edge label bijection (the briefing's gap #2)
 *   G  orientation census: "six orientations", and the period-2 mirror
 *   H  containment (the briefing's T2 = Hilbert H3): do chords stay in-tile?
 *
 * Run: cd web && npx --yes tsx fass-proof/zz-audit-07.ts
 */

import {
  SUPER_RULES,
  zAdd,
  zConj,
  zRot,
  edgeLabels,
  leafOrder,
  metaEdges,
  parseEdgeLabel,
  zLeafPts,
  zToPt,
  type TileFamilyId,
  type TileTypeId,
  type ZVec,
} from '../src/core';
import { SUBSTITUTION_GROWTH } from '../src/core/unrooted';
import { CONFIGS, zConnectionPoints2, zExpand, chosenMatching, type Config } from './lib';

let FAIL = 0;
const H = (s: string) => console.log(`\n${'='.repeat(78)}\n${s}\n${'='.repeat(78)}`);
function ok(c: boolean, msg: string): boolean {
  console.log(`  ${c ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!c) FAIL++;
  return c;
}
function note(s: string) { console.log(`  note  ${s}`); }

const TYPES: readonly string[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
const IX = new Map(TYPES.map((t, i) => [t, i]));

// ===========================================================================
// A. Characteristic polynomial, exactly, over BigInt.
// ===========================================================================
H('A. Substitution matrix and its characteristic polynomial (exact BigInt)');

// M[i][j] = # children of type j inside a supertile of type i.
const M: bigint[][] = TYPES.map(() => TYPES.map(() => 0n));
for (const t of TYPES) {
  for (const c of SUPER_RULES[t]) {
    if (c === 'null') continue;
    M[IX.get(t)!][IX.get(c)!] += 1n;
  }
}
console.log('  row sums (children per supertile):',
  TYPES.map((t, i) => `${t}=${M[i].reduce((a, b) => a + b, 0n)}`).join(' '));
ok(M[IX.get('Gamma')!].reduce((a, b) => a + b, 0n) === 7n, 'Gamma is the only 7-child row (null slot)');
ok(TYPES.filter((t, i) => M[i].reduce((a, b) => a + b, 0n) === 8n).length === 8, 'the other eight rows have 8 children');

/** Faddeev-LeVerrier over BigInt; every division is asserted exact. */
function charPolyBig(A: bigint[][]): bigint[] {
  const n = A.length;
  const mul = (X: bigint[][], Y: bigint[][]) => {
    const R = X.map(() => Y[0].map(() => 0n));
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { const a = X[i][k]; if (a === 0n) continue; for (let j = 0; j < n; j++) R[i][j] += a * Y[k][j]; }
    return R;
  };
  const tr = (X: bigint[][]) => X.reduce((s, r, i) => s + r[i], 0n);
  const c: bigint[] = [1n];
  let Mk: bigint[][] = A.map((r) => r.slice());
  for (let k = 1; k <= n; k++) {
    const t = tr(Mk);
    if (t % BigInt(k) !== 0n) throw new Error(`Faddeev-LeVerrier division not exact at k=${k}`);
    const ck = -t / BigInt(k);
    c.push(ck);
    if (k < n) {
      const shifted = Mk.map((r, i) => r.map((v, j) => (i === j ? v + ck : v)));
      Mk = mul(A, shifted);
    }
  }
  return c; // leading-first, degree n
}
const cp = charPolyBig(M);
const polyStr = cp.map((v, i) => ({ v, d: cp.length - 1 - i })).filter((x) => x.v !== 0n)
  .map((x) => `${x.v > 0n ? '+' : '-'}${(x.v < 0n ? -x.v : x.v) === 1n && x.d > 0 ? '' : (x.v < 0n ? -x.v : x.v)}x^${x.d}`).join(' ');
console.log(`  char poly = ${polyStr}`);
const EXPECT = [1n, -8n, 0n, 8n, -1n, 0n, 0n, 0n, 0n, 0n];
ok(cp.length === EXPECT.length && cp.every((v, i) => v === EXPECT[i]),
  "char poly is x^9 - 8x^8 + 8x^6 - x^5  (07-literature.md section 3.4 item 1)");

// exact polynomial division by x^2 - 8x + 1
function divExact(num: bigint[], den: bigint[]): { q: bigint[]; r: bigint[] } {
  const q: bigint[] = []; const r = num.slice();
  while (r.length >= den.length) {
    const f = r[0] / den[0];
    if (f * den[0] !== r[0]) throw new Error('non-exact leading division');
    q.push(f);
    for (let i = 0; i < den.length; i++) r[i] -= f * den[i];
    if (r[0] !== 0n) throw new Error('division failed');
    r.shift();
  }
  return { q, r };
}
const { q, r } = divExact(cp, [1n, -8n, 1n]);
ok(r.every((v) => v === 0n), 'x^2 - 8x + 1 divides the characteristic polynomial EXACTLY over Z');
console.log('  cofactor coefficients (leading first):', q.map(String).join(' '));
ok(q.length === 8 && q[0] === 1n && q[1] === 0n && q[2] === -1n && q.slice(3).every((v) => v === 0n),
  'cofactor is x^7 - x^5 = x^5 (x-1)(x+1)  => spectrum { 4+-sqrt(15), 1, -1, 0^5 }');
note('so the Perron root is EXACTLY 4 + sqrt(15): a structural fact about a 9x9 integer');
note('matrix, valid for all k. This is a genuine for-all-k proof; the briefing instead');
note('justifies it in proved_for_all_k by a 15-digit numerical check on stored counts.');

// ===========================================================================
// B. Exact integer recurrence for the tile counts  (for all k)
// ===========================================================================
H('B. Tile counts: exact BigInt, and the recurrence t_k = 8 t_{k-1} - t_{k-2}');

function countsRootedAt(root: string, upTo: number): { hex: bigint[]; spec: bigint[] } {
  let v = TYPES.map((t) => (t === root ? 1n : 0n));
  const hex: bigint[] = [v.reduce((a, b) => a + b, 0n)];
  const spec: bigint[] = [hex[0] + v[IX.get('Gamma')!]];
  for (let k = 1; k <= upTo; k++) {
    const w = TYPES.map(() => 0n);
    for (let i = 0; i < TYPES.length; i++) { if (v[i] === 0n) continue; for (let j = 0; j < TYPES.length; j++) w[j] += v[i] * M[i][j]; }
    v = w;
    const h = v.reduce((a, b) => a + b, 0n);
    hex.push(h);
    spec.push(h + v[IX.get('Gamma')!]); // hexagon Gamma -> Gamma1 + Gamma2
  }
  return { hex, spec };
}
const KMAX = 40;
const psi = countsRootedAt('Psi', KMAX);
console.log('  hex  Psi levels 0..6 :', psi.hex.slice(0, 7).map(String).join(' '));
console.log('  spec Psi levels 0..9 :', psi.spec.slice(0, 10).map(String).join(' '));

ok(psi.hex.slice(1, 6).join(',') === '8,63,496,3905,30744',
  'hex  Psi tile counts levels 1..5 = 8, 63, 496, 3905, 30744 (session record)');
ok(psi.spec.slice(1, 6).join(',') === '9,71,559,4401,34649',
  'spec Psi tile counts levels 1..5 = 9, 71, 559, 4401, 34649 (session record)');
ok(psi.spec.slice(4, 10).join(',') === '4401,34649,272791,2147679,16908641,133121449',
  'spec Psi levels 4..9 reproduce docs/BIGMAP_INVESTIGATION.md exactly');

let recOkH = true, recOkS = true;
for (let k = 2; k <= KMAX; k++) {
  if (psi.hex[k] !== 8n * psi.hex[k - 1] - psi.hex[k - 2]) recOkH = false;
  if (psi.spec[k] !== 8n * psi.spec[k - 1] - psi.spec[k - 2]) recOkS = false;
}
ok(recOkH, `hex  counts satisfy t_k = 8 t_{k-1} - t_{k-2} exactly for k = 2..${KMAX}`);
ok(recOkS, `spec counts satisfy t_k = 8 t_{k-1} - t_{k-2} exactly for k = 2..${KMAX}`);
note('The recurrence is not a coincidence: by A the minimal polynomial of M on the');
note('orbit of e_Psi kills the 0, +1 and -1 eigencomponents, leaving x^2 - 8x + 1.');
note('Verified here for the FULL 9-dim orbit, every root type, k = 2..40:');
let allRootsOk = true;
for (const root of TYPES) {
  const c = countsRootedAt(root, 20);
  for (let k = 2; k <= 20; k++) {
    if (c.hex[k] !== 8n * c.hex[k - 1] - c.hex[k - 2]) allRootsOk = false;
    if (c.spec[k] !== 8n * c.spec[k - 1] - c.spec[k - 2]) allRootsOk = false;
  }
}
ok(allRootsOk, 'the same recurrence holds for all nine roots, both families, k = 2..20');

// ===========================================================================
// C. lambda to high precision, and the SUBSTITUTION_GROWTH bug
// ===========================================================================
H('C. lambda = 4 + sqrt(15): high precision, and src/core/unrooted.ts');

// integer sqrt of 15 * 10^(2n) -> 4 + sqrt(15) to n digits, no floats.
function isqrt(n: bigint): bigint { if (n < 2n) return n; let x = n, y = (x + 1n) / 2n; while (y < x) { x = y; y = (x + n / x) / 2n; } return x; }
const D = 40n;
const S15 = isqrt(15n * 10n ** (2n * D));
const LAM = 4n * 10n ** D + S15;
const lamStr = `${LAM / 10n ** D}.${(LAM % 10n ** D).toString().padStart(Number(D), '0')}`;
console.log(`  4 + sqrt(15) = ${lamStr}  (40 exact decimals)`);
// ratio t_40/t_39 to 40 digits
const ratio = (psi.spec[40] * 10n ** D) / psi.spec[39];
const ratStr = `${ratio / 10n ** D}.${(ratio % 10n ** D).toString().padStart(Number(D), '0')}`;
console.log(`  t_40 / t_39  = ${ratStr}`);
let agree = 0; for (let i = 0; i < lamStr.length && lamStr[i] === ratStr[i]; i++) if (lamStr[i] !== '.') agree++;
ok(agree >= 30, `ratio agrees with 4+sqrt(15) to >= 30 significant digits (got ${agree})`);

const exact = 4 + Math.sqrt(15);
console.log(`  4 + sqrt(15)  (double)        = ${exact.toPrecision(17)}`);
console.log(`  SUBSTITUTION_GROWTH           = ${SUBSTITUTION_GROWTH.toPrecision(17)}`);
const relErr = Math.abs(SUBSTITUTION_GROWTH - exact) / exact;
console.log(`  relative error                = ${relErr.toExponential(3)}`);
ok(SUBSTITUTION_GROWTH !== exact && relErr > 1e-7 && relErr < 1e-5,
  `SUBSTITUTION_GROWTH is wrong, rel err ~${relErr.toExponential(1)} (briefing says ~4.5e-6)`);
ok(Math.abs(relErr - 4.5e-6) < 1e-6, "briefing's quoted relative error 4.5e-6 is right to one digit");
note(`the briefing's claimed ratio 133121449/16908641 = ${(133121449 / 16908641).toPrecision(17)}`);
ok(Math.abs(133121449 / 16908641 - 7.8729833462074215) < 5e-16,
  'briefing quotes 133121449/16908641 = 7.8729833462074215 correctly');
note(`sqrt(4+sqrt(15)) = ${Math.sqrt(exact).toPrecision(16)} (briefing: 2.805883701...)`);
ok(Math.abs(Math.sqrt(exact) - 2.805883701) < 1e-9, 'linear factor sqrt(lambda) = 2.805883701... confirmed');

// ===========================================================================
// D. Edge-class major sets per family
// ===========================================================================
H('D. Edge-class major sets (briefing section 3.3 cross-check table)');

function majorsOf(family: TileFamilyId): Set<number> {
  const s = new Set<number>();
  for (const t of leafOrder(family)) for (const l of edgeLabels(family, t)) s.add(parseEdgeLabel(l).major);
  return s;
}
const hexMaj = [...majorsOf('hex')].sort((a, b) => a - b);
const specMaj = [...majorsOf('spectre')].sort((a, b) => a - b);
console.log(`  hex     majors = {${hexMaj.join(',')}}  (${hexMaj.length})`);
console.log(`  spectre majors = {${specMaj.join(',')}}  (${specMaj.length})`);
ok(hexMaj.join(',') === '0,1,2,3,4,5,6,8', 'hex uses exactly 8 major classes, class 7 absent');
ok(specMaj.join(',') === '0,1,2,3,4,5,6,7,8', 'spectre uses exactly 9 major classes');
ok(leafOrder('hex').length === 9 && leafOrder('spectre').length === 10,
  'hex has 9 leaf types (single Gamma), spectre 10 (Gamma1 + Gamma2)');

// ===========================================================================
// E. WHAT class 7 actually is  (briefing asserts "the spectre-only class")
// ===========================================================================
H('E. Class 7 localisation — the briefing never says what it IS');

const carriers7: string[] = [];
for (const t of leafOrder('spectre')) {
  if (edgeLabels('spectre', t).some((l) => parseEdgeLabel(l).major === 7)) carriers7.push(t);
}
console.log(`  types carrying a class-7 label: ${carriers7.join(', ')}`);
ok(carriers7.length === 2 && carriers7.includes('Gamma1') && carriers7.includes('Gamma2'),
  'class 7 lives ONLY on Gamma1 and Gamma2');
const g1s = edgeLabels('spectre', 'Gamma1').filter((l) => parseEdgeLabel(l).major === 7);
const g2s = edgeLabels('spectre', 'Gamma2').filter((l) => parseEdgeLabel(l).major === 7);
console.log(`  Gamma1: ${g1s.join(' ')}     Gamma2: ${g2s.join(' ')}`);
ok(g1s.every((l) => parseEdgeLabel(l).sign > 0) && g2s.every((l) => parseEdgeLabel(l).sign < 0),
  'Gamma1 carries +7 and Gamma2 carries -7, so +7 glues to -7 WITHIN the Mystic pair');
note('=> class 7 is the INTERNAL seam of the Gamma1|Gamma2 pair. It exists in the spectre');
note('family precisely because the hexagon Gamma is cut into two spectres there. The');
note('briefing gets the fact right but supplies no mechanism; this is the mechanism.');

// exact confirmation: in a level-1 spectre expansion, every Gamma1 +7 dot
// coincides with a Gamma2 -7 dot of the SAME pair.
{
  const cfg = CONFIGS.spectre1278;
  const insts = zExpand('spectre', 'Psi', 2);
  const g1 = insts.filter((i) => i.type === 'Gamma1');
  const g2 = insts.filter((i) => i.type === 'Gamma2');
  ok(g1.length === g2.length && g1.length > 0, `level-2 Psi patch has ${g1.length} Gamma1 and ${g2.length} Gamma2 (paired)`);
  // ids: pair shares the prefix, Gamma1 ends .0 and Gamma2 ends .1
  const pref = (s: string) => s.slice(0, s.lastIndexOf('.'));
  const paired = g1.every((a) => g2.some((b) => pref(a.id) === pref(b.id) && a.id.endsWith('.0') && b.id.endsWith('.1')));
  ok(paired, 'every Gamma1 has a sibling Gamma2 under the same parent slot (exact ids)');
  void cfg;
}

// ===========================================================================
// F. The hex <-> spectre label bijection  (the briefing's gap #2)
// ===========================================================================
H('F. hex vs spectre meta-edge sequences — the label bijection the briefing left open');

const seq = (family: TileFamilyId, t: TileTypeId) =>
  metaEdges(family, t).map((e) => `${e.sign < 0 ? '-' : '+'}${e.major}${e.variant}`);
let mismatchTypes: string[] = [];
for (const t of TYPES) {
  if (t === 'Gamma') continue; // hex Gamma vs spectre Gamma1+Gamma2: not comparable 1-1
  const a = seq('hex', t as TileTypeId);
  const b = seq('spectre', t as TileTypeId);
  const same = a.length === b.length && a.every((v, i) => v === b[i]);
  console.log(`  ${t.padEnd(7)} hex [${a.join(' ')}]${same ? '' : `\n          spec[${b.join(' ')}]   <-- DIFFERS`}`);
  if (!same) mismatchTypes.push(t);
}
if (mismatchTypes.length === 0) {
  ok(true, 'all eight non-Gamma types carry IDENTICAL meta-edge class sequences in both families');
} else {
  ok(false, `meta-edge class sequences DIFFER between families for: ${mismatchTypes.join(', ')}`);
  note('=> the briefing\'s "up to identification of labels, hex IS SMKGS\'s marked-hexagon');
  note('system and spectre is its re-marking" is NOT a pure relabelling: the two families');
  note('disagree about which class sits on which physical edge of the SAME type.');
}
// and specifically for the selected classes
for (const cls of [1, 2, 7, 8]) {
  const hx = TYPES.filter((t) => edgeLabels('hex', t as TileTypeId).some((l) => Math.abs(parseEdgeLabel(l).major) === cls));
  const sp = leafOrder('spectre').filter((t) => edgeLabels('spectre', t).some((l) => Math.abs(parseEdgeLabel(l).major) === cls));
  console.log(`  class ${cls}: hex on [${hx.join(',')}]   spectre on [${sp.join(',')}]`);
}

// ===========================================================================
// G. Orientation census: "six orientations", and the period-2 mirror
// ===========================================================================
H('G. Orientations per level (briefing: "six different orientations", 54 prototiles)');

for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  for (let lv = 1; lv <= 5; lv++) {
    const insts = zExpand(family, 'Psi', lv);
    const ks = new Set<string>(); const mirrors = new Set<number>(); const perType = new Map<string, Set<string>>();
    for (const i of insts) {
      ks.add(`${i.xform.k}/${i.xform.m}`);
      mirrors.add(i.xform.m);
      if (!perType.has(i.type)) perType.set(i.type, new Set());
      perType.get(i.type)!.add(`${i.xform.k}/${i.xform.m}`);
    }
    const maxPerType = Math.max(...[...perType.values()].map((s) => s.size));
    console.log(`  ${family.padEnd(8)} lvl ${lv}: ${insts.length} tiles, ${ks.size} distinct (rot,mirror), mirrors={${[...mirrors].join(',')}}, max per type ${maxPerType}`);
  }
}
note('The mirror flag is CONSTANT within a level and alternates with level parity:');
{
  const par: string[] = [];
  for (let lv = 0; lv <= 6; lv++) {
    const ms = new Set(zExpand('hex', 'Psi', lv).map((i) => i.xform.m));
    par.push(`lvl${lv}:m={${[...ms].join(',')}}`);
  }
  console.log(`  ${par.join('  ')}`);
  let alt = true;
  for (let lv = 0; lv <= 6; lv++) {
    const ms = [...new Set(zExpand('hex', 'Psi', lv).map((i) => i.xform.m))];
    if (ms.length !== 1 || ms[0] !== (lv % 2)) alt = false;
  }
  ok(alt, 'every leaf at level k has mirror flag = k mod 2 — the REFLECT_X per level is real');
  note('This is independent, in-repo confirmation of the briefing\'s "the mirror is');
  note('structural" claim at the level of THIS implementation; it does NOT verify the');
  note('BGMS quote, which the briefing could not read and which remains [EXTRACT].');
}

// ===========================================================================
// H. Containment: the briefing's T2 (= Hilbert H3). Exact.
// ===========================================================================
H('H. Do chords stay inside their own tile?  (briefing T2 = H3 = "the crux")');

// Exact arithmetic in Z[sqrt3]: for a doubled ZVec p=(a,b,c,e),
//   2x = (2a + c) + b*sqrt3 ,  2y = (b + 2e) + c*sqrt3.
type Q3 = readonly [bigint, bigint]; // u + v*sqrt3
const q3add = (A: Q3, B: Q3): Q3 => [A[0] + B[0], A[1] + B[1]];
const q3sub = (A: Q3, B: Q3): Q3 => [A[0] - B[0], A[1] - B[1]];
const q3mul = (A: Q3, B: Q3): Q3 => [A[0] * B[0] + 3n * A[1] * B[1], A[0] * B[1] + A[1] * B[0]];
function q3sign(A: Q3): number { // sign of u + v*sqrt3, exactly
  const [u, v] = A;
  if (u === 0n && v === 0n) return 0;
  if (u >= 0n && v >= 0n) return 1;
  if (u <= 0n && v <= 0n) return -1;
  // opposite signs: compare u^2 with 3 v^2
  const c = u * u - 3n * v * v; // sign(u+v√3) = sign(u) if |u|>|v|√3 else sign(v)
  if (c === 0n) return 0;
  return c > 0n ? (u > 0n ? 1 : -1) : (v > 0n ? 1 : -1);
}
const X2 = (p: ZVec): Q3 => [BigInt(2 * p[0] + p[2]), BigInt(p[1])];
const Y2 = (p: ZVec): Q3 => [BigInt(p[1] + 2 * p[3]), BigInt(p[2])];
function orient(a: ZVec, b: ZVec, c: ZVec): number {
  const ax = X2(a), ay = Y2(a), bx = X2(b), by = Y2(b), cx = X2(c), cy = Y2(c);
  return q3sign(q3sub(q3mul(q3sub(bx, ax), q3sub(cy, ay)), q3mul(q3sub(by, ay), q3sub(cx, ax))));
}
function properCross(p1: ZVec, p2: ZVec, p3: ZVec, p4: ZVec): boolean {
  const d1 = orient(p3, p4, p1), d2 = orient(p3, p4, p2), d3 = orient(p1, p2, p3), d4 = orient(p1, p2, p4);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
function pointInPoly(pt: ZVec, poly: readonly ZVec[]): boolean {
  // exact ray casting using Z[sqrt3] comparisons, on the doubled coords
  let inside = false;
  const py = Y2(pt), px = X2(pt);
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = Y2(poly[i]), yj = Y2(poly[j]);
    const aboveI = q3sign(q3sub(yi, py)) > 0, aboveJ = q3sign(q3sub(yj, py)) > 0;
    if (aboveI === aboveJ) continue;
    // x of intersection compared against px, via orientation of (poly[j],poly[i],pt)
    const o = orient(poly[j], poly[i], pt);
    const up = aboveI ? 1 : -1;
    if (o * up > 0) inside = !inside;
    void px; void yj;
  }
  return inside;
}

for (const key of ['hex128', 'spectre1278'] as const) {
  const cfg: Config = CONFIGS[key];
  console.log(`\n  --- ${cfg.id} ---`);
  let bad = 0, total = 0, worstOut = 0;
  for (const t of leafOrder(cfg.family)) {
    const poly2 = zLeafPts(cfg.family, t).map((p) => [2 * p[0], 2 * p[1], 2 * p[2], 2 * p[3]] as ZVec);
    const dots = zConnectionPoints2(cfg.family, t, cfg.subset);
    for (const [a, b] of chosenMatching(cfg, t)) {
      total++;
      const p = dots[a], qd = dots[b];
      let crosses = 0;
      for (let i = 0, j = poly2.length - 1; i < poly2.length; j = i++) {
        if (properCross(p, qd, poly2[j], poly2[i])) crosses++;
      }
      // sample the chord's midpoint exactly (doubled again -> quadrupled frame
      // is avoided by testing the midpoint of the doubled endpoints in a
      // 2x-scaled polygon)
      const mid: ZVec = [p[0] + qd[0], p[1] + qd[1], p[2] + qd[2], p[3] + qd[3]];
      const poly4 = poly2.map((pp) => [2 * pp[0], 2 * pp[1], 2 * pp[2], 2 * pp[3]] as ZVec);
      const midIn = pointInPoly(mid, poly4);
      if (crosses > 0 || !midIn) {
        bad++;
        // metric size of the excursion, float, for reporting only
        const A = zToPt(p), B = zToPt(qd);
        const len = Math.hypot(A.x - B.x, A.y - B.y) / 2;
        worstOut = Math.max(worstOut, len);
        console.log(`    OUT-OF-TILE  ${t}  dots ${a}-${b}  properCrossings=${crosses} midpointInside=${midIn}  chordLen=${len.toFixed(6)}`);
      }
    }
  }
  console.log(`    ${total} chords, ${bad} leave their own tile`);
  if (bad === 0) {
    ok(true, `${cfg.id}: every chord stays inside its tile (exact) — T2/H3 holds tile-locally`);
  } else {
    ok(false, `${cfg.id}: ${bad}/${total} chords LEAVE their own tile (exact predicate, no epsilon)`);
    note(`(2-sqrt(3))/4 = ${((2 - Math.sqrt(3)) / 4).toFixed(9)} is the repo's recorded excursion depth`);
    note('A chord that leaves its tile is a literal counterexample to Hilbert H3 as the');
    note('briefing states T2 ("the arc restricted to a level-j window lies INSIDE that');
    note('child"). The analysis survives with a fattened cell, but the briefing states T2');
    note('as "H3, verbatim" and maps it to 14-merge.ts, which measures arc MERGING under');
    note('nesting, not containment. That mapping is wrong.');
  }
}


// ===========================================================================
// I. Do the straying chords escape the PATCH as well as the tile?
//    (the briefing, section 4.1, asserts "children of a supertile do lie in the
//     supertile ... a genuine structural advantage". That is about tiles. The
//     load-bearing question for T2/H3 is whether the ARC escapes.)
// ===========================================================================
H('I. Straying chords vs the whole patch — does the arc leave the supertile region?');

for (const key of ['spectre1278'] as const) {
  const cfg: Config = CONFIGS[key];
  for (const lv of [2, 3]) {
    const insts = zExpand(cfg.family, 'Psi', lv);
    // quadrupled polygons of every instance in the patch
    const polys: ZVec[][] = insts.map((inst) =>
      zLeafPts(cfg.family, inst.type).map((p) => {
        const d2: ZVec = [4 * p[0], 4 * p[1], 4 * p[2], 4 * p[3]];
        // apply the instance transform in the quadrupled frame
        const lin = zRot(inst.xform.m ? zConj(d2) : d2, inst.xform.k);
        return zAdd(lin, zAdd(zAdd(inst.xform.t, inst.xform.t), zAdd(inst.xform.t, inst.xform.t)));
      }),
    );
    let strayTotal = 0, escaped = 0;
    for (let ii = 0; ii < insts.length; ii++) {
      const inst = insts[ii];
      const dots = zConnectionPoints2(cfg.family, inst.type, cfg.subset);
      const localPoly2 = zLeafPts(cfg.family, inst.type).map((p) => [2 * p[0], 2 * p[1], 2 * p[2], 2 * p[3]] as ZVec);
      for (const [a, b] of chosenMatching(cfg, inst.type)) {
        const p = dots[a], qd = dots[b];
        const mid: ZVec = [p[0] + qd[0], p[1] + qd[1], p[2] + qd[2], p[3] + qd[3]];
        const poly4 = localPoly2.map((pp) => [2 * pp[0], 2 * pp[1], 2 * pp[2], 2 * pp[3]] as ZVec);
        if (pointInPoly(mid, poly4)) continue; // stays home
        strayTotal++;
        // world position of that midpoint, quadrupled frame
        const wlin = zRot(inst.xform.m ? zConj(mid) : mid, inst.xform.k);
        const world: ZVec = zAdd(wlin, zAdd(zAdd(inst.xform.t, inst.xform.t), zAdd(inst.xform.t, inst.xform.t)));
        let host = -1;
        for (let jj = 0; jj < polys.length; jj++) {
          if (jj === ii) continue;
          if (pointInPoly(world, polys[jj])) { host = jj; break; }
        }
        if (host < 0) escaped++;
      }
    }
    const verdictMsg = `${cfg.id} lvl ${lv}: ${insts.length} tiles, ${strayTotal} straying chord-midpoints, ${escaped} land in NO tile of the patch`;
    ok(escaped === 0, verdictMsg);
    if (escaped === 0) {
      note('=> every excursion is absorbed by a NEIGHBOURING tile of the same patch.');
      note('So H3/T2 fails at j = 0 (the cell is one tile) but is NOT refuted at j >= 1.');
      note('The briefing states T2 as "H3, verbatim" with the cell unspecified; it must');
      note('say "cell = supertile, j >= 1", or T2 is false as written for spectre.');
    }
  }
}

H(FAIL === 0 ? 'AUDIT RESULT: all executable checks PASSED' : `AUDIT RESULT: ${FAIL} CHECK(S) FAILED`);
process.exit(FAIL === 0 ? 0 : 1);
