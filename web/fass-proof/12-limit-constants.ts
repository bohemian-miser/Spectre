/**
 * The limit constants, derived rather than measured.
 *
 * docs/FASS_1278.md asks (Open Question 3) for closed forms for the tile growth
 * factor and the segments-per-tile ratio. Both come out of the substitution
 * matrix, and this script derives them exactly and checks them against directly
 * expanded patches.
 *
 *   M[i][j] = number of children of type i that a level-1 supertile of type j
 *             contains, read straight off SUPER_RULES.
 *
 * Tile counts satisfy n(k+1) = M n(k), so the growth factor is M's Perron
 * eigenvalue lambda. Segments per tile converges to (s . v) / (1 . v) where v is
 * the Perron right-eigenvector and s[i] is the chord count of type i, because
 * the type distribution of a deep patch converges to the direction of v.
 *
 * The characteristic polynomial is computed exactly over the integers via the
 * Faddeev-LeVerrier recursion, so lambda is exhibited as an algebraic number
 * rather than a decimal.
 *
 * Run: cd web && npx --yes tsx fass-proof/12-limit-constants.ts [maxLevel]
 */

import {
  connectionPoints,
  leafOrder,
  SUPER_RULES,
  type TileFamilyId,
  type TileTypeId,
} from '../src/core';
import { buildStrands, CONFIGS, heading, pad, trace, verdict, zExpand } from './lib';

const MAX = Number(process.argv[2] ?? 5);
const TYPES: TileTypeId[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];

/** Substitution matrix over the 9 supertile types, straight from SUPER_RULES. */
function substitutionMatrix(): number[][] {
  const idx = new Map(TYPES.map((t, i) => [t, i]));
  const M = TYPES.map(() => TYPES.map(() => 0));
  for (let j = 0; j < TYPES.length; j++) {
    for (const child of SUPER_RULES[TYPES[j]]) {
      if (child === 'null') continue;
      M[idx.get(child as TileTypeId)!][j] += 1;
    }
  }
  return M;
}

/** Characteristic polynomial coefficients (leading first) by Faddeev-LeVerrier. */
function charPoly(M: number[][]): number[] {
  const n = M.length;
  const I = M.map((_, i) => M.map((_, j) => (i === j ? 1 : 0)));
  const mul = (A: number[][], B: number[][]) =>
    A.map((row, i) => B[0].map((_, j) => row.reduce((s, _v, k) => s + A[i][k] * B[k][j], 0)));
  const trace_ = (A: number[][]) => A.reduce((s, r, i) => s + r[i], 0);
  const coeffs = [1];
  let Mk: number[][] = I.map((r) => [...r]);
  for (let k = 1; k <= n; k++) {
    Mk = mul(M, Mk);
    const c = -trace_(Mk) / k;
    coeffs.push(c);
    for (let i = 0; i < n; i++) Mk[i][i] += c;
  }
  return coeffs.map((c) => Math.round(c));
}

/** Dominant eigenvalue and right eigenvector by power iteration. */
function perron(M: number[][]): { lambda: number; v: number[] } {
  let v = M.map(() => 1);
  let lambda = 0;
  for (let it = 0; it < 4000; it++) {
    const w = M.map((row) => row.reduce((s, m, j) => s + m * v[j], 0));
    const norm = w.reduce((s, x) => s + x, 0);
    lambda = norm / v.reduce((s, x) => s + x, 0);
    v = w.map((x) => x / norm);
  }
  return { lambda, v };
}

/** Evaluate a polynomial given leading-first coefficients. */
function evalPoly(coeffs: readonly number[], x: number): number {
  return coeffs.reduce((acc, c) => acc * x + c, 0);
}

let allOk = true;

heading('The substitution matrix');
const M = substitutionMatrix();
console.log(`         ${TYPES.map((t) => pad(t.slice(0, 5), 6)).join('')}`);
TYPES.forEach((t, i) => console.log(`  ${pad(t, 7)}${M[i].map((v) => pad(v, 6)).join('')}`));
console.log(`\n  column sums (children per supertile): ${TYPES.map((_, j) => M.reduce((s, r) => s + r[j], 0)).join(', ')}`);

const poly = charPoly(M);
const terms = poly
  .map((c, i) => {
    const p = poly.length - 1 - i;
    if (c === 0) return null;
    const sign = c < 0 ? '-' : i === 0 ? '' : '+';
    const mag = Math.abs(c) === 1 && p > 0 ? '' : String(Math.abs(c));
    return `${sign} ${mag}${p === 0 ? '' : p === 1 ? 'x' : `x^${p}`}`;
  })
  .filter(Boolean);
console.log(`\n  characteristic polynomial: ${terms.join(' ')}`);

const { lambda, v } = perron(M);
const exact = 4 + Math.sqrt(15);
console.log(`\n  Perron eigenvalue (power iteration) = ${lambda.toFixed(12)}`);
console.log(`  4 + sqrt(15)                        = ${exact.toFixed(12)}`);
allOk = verdict(Math.abs(lambda - exact) < 1e-9, 'the growth factor is exactly 4 + sqrt(15)') && allOk;

// 4 + sqrt(15) is a root of x^2 - 8x + 1, so that quadratic must divide the
// characteristic polynomial exactly over the integers.
function polyDivide(num: readonly number[], den: readonly number[]): { q: number[]; r: number[] } {
  const q: number[] = [];
  const work = [...num];
  for (let i = 0; i + den.length <= work.length; i++) {
    const c = work[i] / den[0];
    q.push(c);
    for (let j = 0; j < den.length; j++) work[i + j] -= c * den[j];
  }
  return { q, r: work.slice(work.length - (den.length - 1)) };
}
const { q, r } = polyDivide(poly, [1, -8, 1]);
allOk = verdict(
  r.every((x) => Math.abs(x) < 1e-9),
  'x^2 - 8x + 1 divides the characteristic polynomial exactly',
  `quotient [${q.map((x) => Math.round(x)).join(', ')}], remainder [${r.map((x) => Math.round(x)).join(', ')}]`,
) && allOk;
console.log(`  so lambda = 4 + sqrt(15) is an algebraic integer, root of x^2 - 8x + 1;`);
console.log(`  its conjugate 4 - sqrt(15) = ${(4 - Math.sqrt(15)).toFixed(12)} is the reciprocal, since the product is 1.`);
console.log(`  the linear inflation factor is sqrt(lambda) = ${Math.sqrt(exact).toFixed(12)}.`);

console.log(`\n  Perron right-eigenvector (normalised to sum 1), i.e. the limiting`);
console.log(`  frequency of each supertile type in a deep patch. Every entry lies in`);
console.log(`  Z[sqrt(15)], and the closed forms are checked against the iteration:`);
const R15 = Math.sqrt(15);
const CLOSED: Readonly<Record<string, [number, number, string]>> = {
  Gamma: [4, -1, '4 - sqrt(15)'],
  Delta: [4, -1, '4 - sqrt(15)'],
  Sigma: [4, -1, '4 - sqrt(15)'],
  Theta: [31, -8, '31 - 8 sqrt(15)'],
  Lambda: [31, -8, '31 - 8 sqrt(15)'],
  Xi: [-58, 15, '15 sqrt(15) - 58'],
  Pi: [-58, 15, '15 sqrt(15) - 58'],
  Phi: [-54, 14, '14 sqrt(15) - 54'],
  Psi: [97, -25, '97 - 25 sqrt(15)'],
};
TYPES.forEach((t, i) => {
  const [a, b, label] = CLOSED[t];
  const closed = a + b * R15;
  const ok = Math.abs(closed - v[i]) < 1e-9;
  if (!ok) allOk = false;
  console.log(`    ${pad(t, 7)} ${v[i].toFixed(9)}  = ${pad(label, 16)} ${ok ? '' : '  <-- MISMATCH'}`);
});
allOk = verdict(
  Math.abs(TYPES.reduce((s2, t) => s2 + CLOSED[t][0] + CLOSED[t][1] * R15, 0) - 1) < 1e-9,
  'the closed-form frequencies sum to 1',
) && allOk;

// --- segments per tile ------------------------------------------------------

for (const key of ['hex128', 'spectre1278', 'flagship'] as const) {
  const cfg = CONFIGS[key];
  heading(`${cfg.id} — segments per tile`);

  // Chords per LEAF type, then per supertile type (the composite Gamma of the
  // non-hex families is Gamma1 + Gamma2).
  const sel = new Set(cfg.subset);
  const chordsOfLeaf = (t: TileTypeId) => {
    const n = connectionPoints(cfg.family, t, sel).length;
    return n >= 2 && n % 2 === 0 ? n / 2 : 0;
  };
  const leafChords: Record<string, number> = {};
  for (const t of leafOrder(cfg.family)) leafChords[t] = chordsOfLeaf(t);
  const chordsOfType = (t: TileTypeId): number =>
    t === 'Gamma' && cfg.family !== 'hex'
      ? leafChords.Gamma1 + leafChords.Gamma2
      : leafChords[t] ?? 0;
  const tilesOfType = (t: TileTypeId): number => (t === 'Gamma' && cfg.family !== 'hex' ? 2 : 1);

  console.log(`  chords per supertile type: ${TYPES.map((t) => `${t.slice(0, 3)}=${chordsOfType(t)}`).join(' ')}`);
  allOk = verdict(
    TYPES.every((t) => chordsOfType(t) >= 1),
    'every type carries at least one chord, so every tile is crossed by some strand',
  ) && allOk;

  const num = TYPES.reduce((s, t, i) => s + chordsOfType(t) * v[i], 0);
  const den = TYPES.reduce((s, t, i) => s + tilesOfType(t) * v[i], 0);
  const predicted = num / den;
  console.log(`\n  predicted segments per tile = (chords . v) / (leaves . v) = ${predicted.toFixed(9)}`);

  console.log('\n  | level | tiles | segments | segments/tile | tile ratio |');
  console.log('  |---|---|---|---|---|');
  let prevTiles = 0;
  let measured = 0;
  for (let lv = 1; lv <= MAX; lv++) {
    const instances = zExpand(cfg.family, 'Psi', lv);
    const strands = buildStrands(cfg, instances);
    const tr = trace(strands);
    measured = strands.segs.length / instances.length;
    console.log(
      `  | ${lv} | ${pad(instances.length, 7)} | ${pad(strands.segs.length, 7)} | ${measured.toFixed(6)} | ${prevTiles ? (instances.length / prevTiles).toFixed(6) : '—'} |`,
    );
    prevTiles = instances.length;
    if (lv === MAX) {
      allOk = verdict(tr.arcs.length === 1 && tr.circuits.length === 0, `Psi@${lv} is a single arc with no circuits`) && allOk;
    }
  }
  allOk = verdict(
    Math.abs(measured - predicted) < 5e-3,
    `the level-${MAX} patch count matches the eigenvector prediction`,
    `measured ${measured.toFixed(6)} vs predicted ${predicted.toFixed(6)}`,
  ) && allOk;

  // A 5e-3 tolerance against a level-5 patch is far looser than the evidence
  // available. The ratio is an exact rational at every level, because the counts
  // are integer matrix powers, so take it to levels 20 and 40 in BigInt and
  // compare against the closed form at double precision instead.
  {
    const MB = substitutionMatrix().map((r) => r.map((x) => BigInt(x)));
    const psi = TYPES.indexOf('Psi');
    const step = (row: readonly bigint[]): bigint[] =>
      TYPES.map((_, col) => TYPES.reduce((acc, _t, i) => acc + row[i] * MB[i][col], 0n));
    let chordRow: bigint[] = TYPES.map((t) => BigInt(chordsOfType(t)));
    let leafRow: bigint[] = TYPES.map((t) => BigInt(tilesOfType(t)));
    const SCALE = 10n ** 18n;
    let worst = 0;
    for (let lv = 1; lv <= 40; lv++) {
      chordRow = step(chordRow);
      leafRow = step(leafRow);
      if (lv === 20 || lv === 40) {
        const exact = Number((chordRow[psi] * SCALE) / leafRow[psi]) / 1e18;
        console.log(`  exact integer count ratio at level ${lv}: ${exact.toFixed(12)}`);
        worst = Math.max(worst, Math.abs(exact - predicted));
      }
    }
    allOk = verdict(
      worst < 1e-11,
      'the exact integer count ratio matches the closed form at levels 20 and 40',
      `worst deviation ${worst.toExponential(2)}`,
    ) && allOk;
  }

  // Closed forms, answering docs/FASS_1278.md Open Question 3. Both are the
  // eigenvector combination above, cleared of its denominator over Q(sqrt 15).
  const R = Math.sqrt(15);
  const closed = cfg.family === 'hex' ? 13 * R - 49 : (3 * (R - 3)) / 2;
  const label = cfg.family === 'hex' ? '13 sqrt(15) - 49' : '3 (sqrt(15) - 3) / 2';
  console.log(`\n  closed form: segments per tile -> ${label} = ${closed.toFixed(12)}`);
  allOk = verdict(
    Math.abs(closed - predicted) < 1e-9,
    `the closed form ${label} equals the eigenvector prediction`,
  ) && allOk;
}

console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
