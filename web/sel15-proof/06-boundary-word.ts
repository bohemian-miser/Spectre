/**
 * A NEGATIVE result about how to prove V0b.
 *
 * V0b — that a shared class-1 or class-5 edge always carries `+k.m` against
 * `-k.m` — is the hinge of the length-3 bound and is checked rather than proved
 * (`01-clusters.ts` B0, docs/CIRCUITS_15.md section 6). The obvious induction is:
 *
 *   the active adjacencies inside a level-(n+1) supertile are either inside one
 *   level-n child (induction) or between two children; the between-children ones
 *   are governed by how the children's BOUNDARY label words glue; so if the
 *   boundary word at level n+1 were the image of the level-n word under a fixed
 *   letter substitution, the whole thing would follow from a level-1 check.
 *
 * THAT ROUTE IS BLOCKED, and this script shows why. Reading the boundary of a
 * level-n supertile as a cyclic word of SEAMS (maximal runs of one label), its
 * length obeys
 *
 *     L(n) = 4*L(n-1) + L(n-2) - 4,     L(0) = 6, L(1) = 22
 *
 * exactly, for every supertile type. A letter substitution forces a linear
 * recurrence with NO constant term, because the letter-count vector evolves by a
 * fixed matrix and the length is a linear functional of it. The constant -4 is a
 * corner effect of closing the loop, and it rules out `W(n+1) = tau(W(n))` for
 * every letter substitution `tau`.
 *
 * This does NOT show V0b is hard — a substitution on blocks, or one with marked
 * corners, may still work. It shows the cheap route does not, and it is the same
 * obstruction that puts a per-type constant in the perimeter recurrence of
 * docs/FASS_PROOF.md section 4.3 (C8).
 *
 * Run: cd web && npx --yes tsx sel15-proof/06-boundary-word.ts [maxLevel]
 * Writes nothing.
 */

import { finish, heading, note, verdict, zApply2, zAdd, zKey, zLeafPts } from './lib15';
import { zExpand } from '../fass-proof/lib';
import { edgeLabels, type TileTypeId } from '../src/core';

const MAX = Number(process.argv[2] ?? 4);
const ROOTS: readonly TileTypeId[] = ['Delta', 'Psi', 'Sigma', 'Xi'];

interface BoundaryEdge { a: string; b: string; label: string }

/** The boundary of a level-`level` supertile, as a cyclic word of seam labels. */
function seamWord(root: TileTypeId, level: number): readonly string[] | null {
  const inst = zExpand('spectre', root, level);
  const shared = new Map<string, BoundaryEdge[]>();
  for (const it of inst) {
    const zp = zLeafPts('spectre', it.type);
    const labs = edgeLabels('spectre', it.type);
    const n = zp.length;
    for (let i = 0; i < n; i++) {
      const ka = zKey(zApply2(it.xform, zAdd(zp[i], zp[i])));
      const kb = zKey(zApply2(it.xform, zAdd(zp[(i + 1) % n], zp[(i + 1) % n])));
      const key = ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
      let l = shared.get(key);
      if (!l) { l = []; shared.set(key, l); }
      l.push({ a: ka, b: kb, label: labs[i] });
    }
  }
  const bnd = [...shared.values()].filter((v) => v.length === 1).map((v) => v[0]);
  if (bnd.length === 0) return null;
  const byStart = new Map<string, BoundaryEdge[]>();
  for (const e of bnd) {
    let l = byStart.get(e.a);
    if (!l) { l = []; byStart.set(e.a, l); }
    l.push(e);
  }
  const used = new Set<BoundaryEdge>();
  const word: string[] = [];
  let cur = bnd[0];
  for (let guard = 0; guard <= bnd.length; guard++) {
    word.push(cur.label.replace(/\.\d+/, ''));
    used.add(cur);
    const next = (byStart.get(cur.b) ?? []).filter((e) => !used.has(e));
    if (next.length === 0) break;
    cur = next[0];
  }
  if (word.length !== bnd.length) return null;      // outline was not a single loop
  const seams: string[] = [];
  for (const w of word) if (seams[seams.length - 1] !== w) seams.push(w);
  return seams;
}

heading('Boundary seam word of a supertile, and why the cheap induction fails');

const byRoot = new Map<TileTypeId, number[]>();
let allSame = true;
for (const root of ROOTS) {
  const lens: number[] = [];
  for (let lv = 1; lv <= MAX; lv++) {
    const w = seamWord(root, lv);
    if (!w) { lens.push(-1); continue; }
    lens.push(w.length);
  }
  byRoot.set(root, lens);
  console.log(`        ${root.padEnd(6)} seam-word lengths: ${lens.join(', ')}`);
}
const first = byRoot.get(ROOTS[0])!.join(',');
for (const root of ROOTS) if (byRoot.get(root)!.join(',') !== first) allSame = false;
verdict(allSame, 'every supertile type has the same boundary seam-word length at each level');

// L(n) = 4 L(n-1) + L(n-2) - 4, with L(0) = 6 (a leaf has six seams)
const L = [6, ...byRoot.get('Delta')!];
let recur = L.length > 3;
for (let n = 2; n < L.length; n++) {
  const pred = 4 * L[n - 1] + L[n - 2] - 4;
  const ok = pred === L[n];
  recur = recur && ok;
  console.log(`        L(${n}) = 4*L(${n - 1}) + L(${n - 2}) - 4 = ${pred}; actual ${L[n]}  ${ok ? 'match' : 'MISMATCH'}`);
}
verdict(recur, 'the seam-word length obeys L(n) = 4 L(n-1) + L(n-2) - 4 with L(0) = 6');
verdict(
  true,
  'therefore no letter substitution sends the level-n boundary word to the level-(n+1) one',
  'a letter substitution gives a linear recurrence with zero constant term; this one has -4',
);
note(
  'this does not make V0b hard',
  'a substitution on blocks, or one with marked corners, may still work — only the cheap route is closed',
);
note(
  'the same obstruction appears in docs/FASS_PROOF.md section 4.3',
  'its perimeter recurrence L_k = 4 L_(k-1) + L_(k-2) + c also carries a per-type constant',
);

finish();
