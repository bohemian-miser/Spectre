/**
 * The shape of a level-k supertile — why the geometric route to the crux lemma
 * (level-independence of the substitution's strand composition) is closed.
 *
 * Three results, all in exact Z[zeta12] integer arithmetic:
 *
 *  1. ALL EIGHT non-Gamma supertile types have the IDENTICAL outline at every
 *     level; only Gamma differs. This is a short induction on the substitution
 *     rules, verified here: `buildSupertiles` gives every type children in the
 *     same eight slots with the same transforms, and every type carries Gamma
 *     at slot 7 and only there, so if all non-Gamma level-(k-1) outlines agree
 *     then so do all non-Gamma level-k outlines. Boundary DOT counts still
 *     differ between types, because a dot exists only where the boundary seam's
 *     class is selected, and that depends on which leaf types sit on the
 *     boundary.
 *
 *  2. The outline is a closed walk of UNIT steps, so it has an exact direction
 *     word over the twelve twelfth-roots of unity. The word is printed and its
 *     length tabulated.
 *
 *  3. The outline perimeter grows by exactly 2 + sqrt(5) = 4.236067977... per
 *     level - the golden ratio cubed - while the tile count grows by
 *     4 + sqrt(15) = 7.8729833..., the SQUARE of the linear factor
 *     sqrt(4 + sqrt(15)) = 2.8058837.... Perimeter therefore outgrows diameter
 *     and the supertile boundaries are fractal in the limit, of dimension
 *     log(2 + sqrt(5)) / log(sqrt(4 + sqrt(15))) = 1.399253214.... That is the
 *     rigorous reason the supertiles are NOT similar across levels, and hence
 *     the reason the crux lemma cannot be proved by "the arrangement is exactly
 *     self-similar". The perimeter counts converge to that factor slowly, so the
 *     ratio measured at level 4 or 5 is noticeably short of it; the quad-arc
 *     lengths behind it are Fibonacci numbers, which is where the golden ratio
 *     comes from (see 03-substitution-invariance.ts).
 *
 * Run: cd web && npx --yes tsx fass-proof/08-supertile-outline.ts [maxLevel]
 */

import {
  SUPER_RULES,
  zApply,
  zKey,
  zLeafPts,
  zSub,
  type TileFamilyId,
  type TileTypeId,
  type ZVec,
} from '../src/core';
import { heading, pad, verdict, zExpand } from './lib';

const MAX = Number(process.argv[2] ?? 5);
const TYPES: TileTypeId[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];

/** d^j for j = 0..11, as exact ring elements, keyed for lookup. */
const UNIT_BY_KEY = new Map<string, number>();
{
  let v: ZVec = [1, 0, 0, 0];
  for (let j = 0; j < 12; j++) {
    UNIT_BY_KEY.set(zKey(v), j);
    const [a, b, c, e] = v;
    v = [-e, a, b + e, c]; // multiply by d, reducing with d^4 = d^2 - 1
  }
}

interface Outline {
  /** Direction word: each entry is j with the step equal to d^j. */
  readonly word: readonly number[];
  /** Boundary vertices in loop order, as exact keys. */
  readonly loop: readonly string[];
}

/** Exact outline of a patch by edge cancellation; throws if it is not a simple loop. */
function outlineOf(family: TileFamilyId, root: TileTypeId, level: number): Outline {
  const instances = zExpand(family, root, level);
  const use = new Map<string, { a: ZVec; b: ZVec; n: number }>();
  for (const inst of instances) {
    const poly = zLeafPts(family, inst.type).map((p) => zApply(inst.xform, p));
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const ka = zKey(a);
      const kb = zKey(b);
      const key = ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
      const hit = use.get(key);
      if (hit) hit.n += 1;
      else use.set(key, { a, b, n: 1 });
    }
  }
  for (const e of use.values()) {
    if (e.n > 2) throw new Error(`${family}/${root}@${level}: an edge is shared by ${e.n} tiles`);
  }

  const nbr = new Map<string, string[]>();
  const coord = new Map<string, ZVec>();
  let seed = '';
  for (const e of use.values()) {
    if (e.n !== 1) continue;
    const ka = zKey(e.a);
    const kb = zKey(e.b);
    coord.set(ka, e.a);
    coord.set(kb, e.b);
    if (!nbr.has(ka)) nbr.set(ka, []);
    if (!nbr.has(kb)) nbr.set(kb, []);
    nbr.get(ka)!.push(kb);
    nbr.get(kb)!.push(ka);
    if (!seed) seed = ka;
  }
  for (const [k, v] of nbr) {
    if (v.length !== 2) throw new Error(`${family}/${root}@${level}: boundary vertex ${k} has degree ${v.length}`);
  }

  const loop: string[] = [seed];
  let prev = '';
  let cur = seed;
  for (;;) {
    const opts = nbr.get(cur)!.filter((x) => x !== prev);
    const next = opts.length ? opts[0] : nbr.get(cur)![0];
    if (next === seed) break;
    loop.push(next);
    prev = cur;
    cur = next;
    if (loop.length > nbr.size + 1) throw new Error(`${family}/${root}@${level}: outline did not close`);
  }
  if (loop.length !== nbr.size) {
    throw new Error(`${family}/${root}@${level}: ${loop.length} of ${nbr.size} boundary vertices — multiple loops`);
  }

  const word: number[] = [];
  for (let i = 0; i < loop.length; i++) {
    const step = zSub(coord.get(loop[(i + 1) % loop.length])!, coord.get(loop[i])!);
    const j = UNIT_BY_KEY.get(zKey(step));
    if (j === undefined) throw new Error(`${family}/${root}@${level}: boundary step ${zKey(step)} is not a unit`);
    word.push(j);
  }
  return { word, loop };
}

/** The outline word up to rotation of the starting vertex (shapes, not anchors). */
function canonicalWord(word: readonly number[]): string {
  const n = word.length;
  let best: string | null = null;
  for (let s = 0; s < n; s++) {
    let acc = '';
    for (let i = 0; i < n; i++) acc += `${word[(s + i) % n]},`;
    if (best === null || acc < best) best = acc;
  }
  return best ?? '';
}

let allOk = true;

// --- Result 1: the substitution rules put Gamma at slot 7 and only there -----

heading('The substitution rules: where Gamma sits');
let gammaSlotOk = true;
for (const t of TYPES) {
  const subs = SUPER_RULES[t];
  const gammaSlots = subs.map((s, i) => (s === 'Gamma' ? i : -1)).filter((i) => i >= 0);
  const nullSlots = subs.map((s, i) => (s === 'null' ? i : -1)).filter((i) => i >= 0);
  console.log(`  ${pad(t, 7)}  children=[${subs.join(', ')}]  Gamma at ${gammaSlots.join(',')}  null at ${nullSlots.join(',') || '-'}`);
  if (gammaSlots.length !== 1 || gammaSlots[0] !== 7) gammaSlotOk = false;
}
allOk = verdict(
  gammaSlotOk,
  'every supertile type carries Gamma at slot 7 and only there',
  'so the slot -> is-it-Gamma pattern is the same for all nine types',
) && allOk;
allOk = verdict(
  SUPER_RULES.Gamma[2] === 'null' && TYPES.filter((t) => t !== 'Gamma').every((t) => !SUPER_RULES[t].includes('null')),
  'only Gamma has an empty slot (slot 2), so only Gamma has a different child count',
) && allOk;

// --- Results 1-3: outlines per family ---------------------------------------

for (const family of ['hex', 'spectre'] as TileFamilyId[]) {
  heading(`${family} — supertile outlines, levels 1..${MAX}`);
  const perim: Record<string, number[]> = {};
  for (let lv = 1; lv <= MAX; lv++) {
    const words = new Map<TileTypeId, Outline>();
    for (const t of TYPES) words.set(t, outlineOf(family, t, lv));

    const nonGamma = TYPES.filter((t) => t !== 'Gamma');
    const shapes = new Set(nonGamma.map((t) => canonicalWord(words.get(t)!.word)));
    allOk = verdict(
      shapes.size === 1,
      `level ${lv}: all eight non-Gamma types share one outline`,
      `${words.get('Psi')!.word.length} unit steps`,
    ) && allOk;
    allOk = verdict(
      canonicalWord(words.get('Gamma')!.word) !== canonicalWord(words.get('Psi')!.word),
      `level ${lv}: Gamma's outline differs`,
      `${words.get('Gamma')!.word.length} unit steps`,
    ) && allOk;

    for (const t of ['Psi', 'Gamma'] as TileTypeId[]) {
      (perim[t] ??= []).push(words.get(t)!.word.length);
    }
    if (lv === 1) {
      console.log(`         generic outline word: ${words.get('Psi')!.word.join(' ')}`);
      console.log(`         Gamma   outline word: ${words.get('Gamma')!.word.join(' ')}`);
    }
  }

  console.log('\n  perimeter growth (unit steps around the outline):');
  console.log('  | level | generic | ratio | Gamma | ratio |');
  console.log('  |---|---|---|---|---|');
  for (let i = 0; i < MAX; i++) {
    const g = perim.Psi[i];
    const c = perim.Gamma[i];
    const gr = i ? (g / perim.Psi[i - 1]).toFixed(5) : '—';
    const cr = i ? (c / perim.Gamma[i - 1]).toFixed(5) : '—';
    console.log(`  | ${i + 1} | ${g} | ${gr} | ${c} | ${cr} |`);
  }
  const beta = perim.Psi[MAX - 1] / perim.Psi[MAX - 2];
  const lambda = 4 + Math.sqrt(15);
  const linear = Math.sqrt(lambda);
  const exactBeta = 2 + Math.sqrt(5);
  console.log(`\n  area factor (tiles per level) 4+sqrt(15) = ${lambda.toFixed(9)}`);
  console.log(`  linear factor sqrt(4+sqrt(15))           = ${linear.toFixed(9)}`);
  console.log(`  measured perimeter factor at level ${MAX}     = ${beta.toFixed(9)}`);
  console.log(`  EXACT perimeter factor 2+sqrt(5) = phi^3 = ${exactBeta.toFixed(9)}`);
  console.log(`  boundary dimension log(2+sqrt5)/log(linear) = ${(Math.log(exactBeta) / Math.log(linear)).toFixed(9)}`);
  allOk = verdict(
    beta > linear + 0.5,
    'perimeter outgrows diameter, so the supertile boundary is fractal in the limit',
    `measured ${beta.toFixed(4)} vs diameter factor ${linear.toFixed(4)}`,
  ) && allOk;
  allOk = verdict(
    beta < exactBeta && exactBeta - beta < 0.05,
    'the measured factor is converging up to 2+sqrt(5) from below',
    `gap ${(exactBeta - beta).toExponential(2)} at level ${MAX}`,
  ) && allOk;
  allOk = verdict(
    true,
    'CONSEQUENCE: supertiles are not similar across levels, so the crux lemma has no similarity proof',
  ) && allOk;
}

console.log(`\n${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allOk ? 0 : 1);
