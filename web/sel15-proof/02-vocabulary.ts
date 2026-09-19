/**
 * Obligation C — the circuit vocabulary, and the cross-checks.
 *
 * PROVED here, GIVEN the atlas of `01-clusters.ts`:
 *  - C1  every circuit of selection `15` has length 3, 6 or 9;
 *  - C2  the per-combo vocabulary is [3], [3,6,9], [3,6,9], [3,6], and the
 *        number of circuit ISOMORPHISM types is fixed and finite;
 *  - C3  the vocabulary carries no level index, because the atlas does not.
 *
 * CHECKED EXACTLY against the atlas:
 *  - C4  every circuit traced in a real patch — including the ones inside
 *        clusters the patch boundary truncates — is one of the atlas circuits,
 *        word for word, at levels 3..6 and in all four combos;
 *  - C5  the number of circuit CONGRUENCE classes (exact geometry, modulo the
 *        24 lattice isometries and translation) is constant in the level;
 *  - C6  level-4 and level-6 totals agree with `graph_analysis/lvl{4,6}.csv`,
 *        produced by different code years earlier;
 *  - C7  in the base combo every chord cuts a tile corner and every circuit is
 *        the three-fold loop around ONE tiling vertex, which has exactly three
 *        tiles around it.
 *
 * Run: cd web && npx --yes tsx sel15-proof/02-vocabulary.ts [maxLevel]
 * Reads `sel15-proof/atlas.json`; writes nothing.
 */

import { readFileSync } from 'node:fs';
import {
  ORDER,
  SELECTION,
  buildPatch,
  chordsOf,
  cornerOf,
  decompose,
  finish,
  heading,
  note,
  seamsOf,
  verdict,
  zAdd,
  zApply2,
  zKey,
  zLeafPts,
  type Cluster,
  type Patch,
} from './lib15';
import { zConnectionPoints2 } from '../fass-proof/lib';
import { zConj, zRot, zSub, type TileTypeId, type ZVec } from '../src/core';

const MAX = Number(process.argv[2] ?? 6);
const cert = JSON.parse(readFileSync(new URL('./atlas.json', import.meta.url), 'utf8')) as {
  combos: string[];
  clusters: { id: string; types: TileTypeId[]; links: [number, number, number, number][] }[];
};
const COMBOS = cert.combos;
const CLUSTERS: { id: string; cluster: Cluster }[] = cert.clusters.map((c) => ({
  id: c.id,
  cluster: { types: c.types, links: c.links },
}));

// ---------------------------------------------------------------------------
// Circuits of a real patch, with their words and their exact geometry
// ---------------------------------------------------------------------------

interface PatchCircuit {
  readonly length: number;
  /** `Type in>out` per step, rotation/reversal-minimal. */
  readonly word: string;
  /** The dots visited, in order, as doubled lattice vectors. */
  readonly dots: readonly ZVec[];
  /** Per step, the doubled world position of the tile corner the chord cuts, or null. */
  readonly corners: readonly (string | null)[];
}

function patchCircuits(p: Patch, combo: string): readonly PatchCircuit[] {
  interface Half { chord: number; other: string }
  const chords: { inst: number; a: string; b: string; sa: number; sb: number }[] = [];
  const adj = new Map<string, Half[]>();
  const local = new Map<TileTypeId, readonly ZVec[]>();
  for (let i = 0; i < p.instances.length; i++) {
    const type = p.instances[i].type;
    let pts = local.get(type);
    if (!pts) { pts = zConnectionPoints2('spectre', type, SELECTION); local.set(type, pts); }
    for (const [sa, sb] of chordsOf(type, combo)) {
      const a = zKey(zApply2(p.instances[i].xform, pts[sa]));
      const b = zKey(zApply2(p.instances[i].xform, pts[sb]));
      const id = chords.length;
      chords.push({ inst: i, a, b, sa, sb });
      for (const [x, y] of [[a, b], [b, a]] as const) {
        let l = adj.get(x);
        if (!l) { l = []; adj.set(x, l); }
        l.push({ chord: id, other: y });
      }
    }
  }
  const used = new Array<boolean>(chords.length).fill(false);
  const out: PatchCircuit[] = [];
  const coord = new Map<string, ZVec>();
  for (const [k, v] of p.dots) {
    const inst = p.instances[v[0].i];
    const pts = local.get(inst.type) ?? zConnectionPoints2('spectre', inst.type, SELECTION);
    coord.set(k, zApply2(inst.xform, pts[v[0].s]));
  }
  const walk = (start: string, first: number): void => {
    const steps: string[] = [];
    const dots: ZVec[] = [];
    const corners: (string | null)[] = [];
    let cur = start;
    let ch = first;
    for (;;) {
      used[ch] = true;
      const c = chords[ch];
      const next = c.a === cur ? c.b : c.a;
      const inSeam = c.a === cur ? c.sa : c.sb;
      const outSeam = c.a === cur ? c.sb : c.sa;
      const t = p.instances[c.inst].type;
      steps.push(`${t}${seamsOf(t)[inSeam].name}>${seamsOf(t)[outSeam].name}`);
      dots.push(coord.get(cur)!);
      const v = cornerOf(t, [c.sa, c.sb]);
      corners.push(
        v === null
          ? null
          : zKey(zApply2(p.instances[c.inst].xform, zAdd(zLeafPts('spectre', t)[v], zLeafPts('spectre', t)[v]))),
      );
      if (next === start) {
        const rots: string[] = [];
        for (const s of [steps, [...steps].reverse()]) {
          for (let r = 0; r < s.length; r++) rots.push(s.slice(r).concat(s.slice(0, r)).join(' | '));
        }
        out.push({ length: steps.length, word: rots.sort()[0], dots, corners });
        return;
      }
      const cont = (adj.get(next) ?? []).filter((z) => !used[z.chord]);
      if ((adj.get(next) ?? []).length !== 2 || cont.length !== 1) return;   // an arc, not a circuit
      cur = next;
      ch = cont[0].chord;
    }
  };
  for (const [d, list] of adj) if (list.length !== 2) for (const h of list) if (!used[h.chord]) walk(d, h.chord);
  for (let ch = 0; ch < chords.length; ch++) if (!used[ch]) walk(chords[ch].a, ch);
  return out;
}

/** Congruence key: modulo translation and the 24 lattice isometries `d^k conj^m`. */
function congruenceKey(dots: readonly ZVec[]): string {
  const cands: string[] = [];
  for (let m = 0; m < 2; m++) {
    for (let k = 0; k < 12; k++) {
      const img = dots.map((d) => zRot(m ? zConj(d) : d, k));
      for (const seq of [img, [...img].reverse()]) {
        for (let r = 0; r < seq.length; r++) {
          const rot = seq.slice(r).concat(seq.slice(0, r));
          const o = rot[0];
          cands.push(rot.map((q) => zKey(zSub(q, o))).join(';'));
        }
      }
    }
  }
  return cands.sort()[0];
}

// ---------------------------------------------------------------------------

heading('C1/C2. Circuit vocabulary per combination string, read off the atlas');
const EXPECTED: Record<string, number[]> = {
  '0000000000': [3],
  '0000000100': [3, 6, 9],
  '0000100000': [3, 6, 9],
  '0000100100': [3, 6],
};
const atlasWords = new Map<string, Map<number, Set<string>>>();
for (const combo of COMBOS) {
  const byLen = new Map<number, Set<string>>();
  for (const { cluster } of CLUSTERS) {
    const d = decompose(cluster, combo);
    d.words.forEach((wd) => {
      const L = wd.split(' | ').length;
      if (!byLen.has(L)) byLen.set(L, new Set());
      byLen.get(L)!.add(wd);
    });
  }
  atlasWords.set(combo, byLen);
}
for (const combo of COMBOS) {
  const byLen = atlasWords.get(combo)!;
  const voc = [...byLen.keys()].sort((a, b) => a - b);
  const total = [...byLen.values()].reduce((a, s) => a + s.size, 0);
  console.log(
    `        ${combo}  lengths=[${voc.join(',')}]  distinct circuit words=${total}  (` +
      `${voc.map((L) => `${byLen.get(L)!.size} of length ${L}`).join(', ')})`,
  );
}
let c2 = true;
for (const combo of COMBOS) {
  const voc = [...atlasWords.get(combo)!.keys()].sort((a, b) => a - b);
  c2 = c2 && JSON.stringify(voc) === JSON.stringify(EXPECTED[combo]);
}
verdict(c2, 'C2: the four vocabularies are [3], [3,6,9], [3,6,9], [3,6]');
const all = new Set<number>();
for (const combo of COMBOS) for (const L of atlasWords.get(combo)!.keys()) all.add(L);
verdict(
  [...all].every((L) => L % 3 === 0 && L <= 9),
  'C1: every circuit length is a multiple of 3 and at most 9',
  `{${[...all].sort((a, b) => a - b).join(',')}}`,
);
note('C3: the atlas carries no level index', 'so neither does the vocabulary read off it');

heading('C4/C5. Every circuit of a real patch is an atlas circuit');
let c4 = true;
let c5 = true;
const congByCombo = new Map<string, number[]>();
for (let lv = 3; lv <= MAX; lv++) {
  const patch = buildPatch('Delta', lv);
  for (const combo of COMBOS) {
    const circs = patchCircuits(patch, combo);
    const known = atlasWords.get(combo)!;
    const bad = circs.filter((c) => !(known.get(c.length)?.has(c.word) ?? false));
    const lens = [...new Set(circs.map((c) => c.length))].sort((a, b) => a - b);
    const cong = new Set(circs.map((c) => congruenceKey(c.dots))).size;
    const words = new Set(circs.map((c) => c.word)).size;
    const ok = bad.length === 0 && lens.every((L) => [3, 6, 9].includes(L));
    c4 = c4 && ok;
    const prev = congByCombo.get(combo) ?? [];
    prev.push(cong);
    congByCombo.set(combo, prev);
    console.log(
      `        lv${lv} ${combo}  circuits=${circs.length} lengths=[${lens.join(',')}]` +
        `  words=${words}/${[...known.values()].reduce((a, s) => a + s.size, 0)}` +
        `  congruenceClasses=${cong}  ${ok ? 'all known' : `${bad.length} UNKNOWN`}`,
    );
  }
}
verdict(c4, 'C4: no patch at any level and combo produces a circuit outside the atlas');
for (const combo of COMBOS) {
  const seq = congByCombo.get(combo)!;
  const stable = seq.length >= 2 && new Set(seq.slice(-2)).size === 1;
  c5 = c5 && stable;
  console.log(`        ${combo}  congruence classes by level: ${seq.join(' -> ')}`);
}
if (MAX >= 5 || c5) {
  verdict(c5, 'C5: the number of circuit congruence classes is constant over the last two levels');
} else {
  note(
    `C5 not yet settled at maxLevel ${MAX}`,
    'the class counts first saturate at level 4, so run with maxLevel 5 or more',
  );
}

heading('C6. Cross-check against graph_analysis/lvl{4,6}.csv');
let c6 = true;
for (const lv of [4, 6]) {
  if (lv > MAX) continue;
  const lines = readFileSync(new URL(`../../graph_analysis/lvl${lv}.csv`, import.meta.url), 'utf8')
    .trim().split('\n');
  const patch = buildPatch('Delta', lv);
  for (const combo of COMBOS) {
    const row = lines.find((l) => l.startsWith(`${combo},`) && l.trimEnd().endsWith(',15'));
    if (!row) { c6 = verdict(false, `csv row for lvl${lv} ${combo}`) && c6; continue; }
    const circuits = Number(row.split(',')[2]);
    const lenSet = (row.match(/\[([0-9, ]*)\]/)?.[1] ?? '').split(',')
      .map((x) => Number(x.trim())).filter(Number.isFinite);
    const mine = patchCircuits(patch, combo);
    const myLens = [...new Set(mine.map((c) => c.length))].sort((a, b) => a - b);
    const ok = mine.length === circuits && JSON.stringify(myLens) === JSON.stringify(lenSet);
    c6 = c6 && ok;
    console.log(
      `        lvl${lv} ${combo}  csv ${circuits} [${lenSet.join(',')}]  |  exact ${mine.length}` +
        ` [${myLens.join(',')}]  ${ok ? 'match' : 'MISMATCH'}`,
    );
  }
}
verdict(c6, 'C6: the exact recomputation reproduces the stored census for selection 15');

heading('C7. The base combination: corner cuts and vertex loops');
const BASE = '0000000000';
let c7 = true;
for (let lv = 3; lv <= Math.min(MAX, 5); lv++) {
  const patch = buildPatch('Delta', lv);
  // every tile vertex of the patch, with the tiles that own it
  const vertexTiles = new Map<string, Set<number>>();
  for (let i = 0; i < patch.instances.length; i++) {
    for (const v of zLeafPts('spectre', patch.instances[i].type)) {
      const k = zKey(zApply2(patch.instances[i].xform, zAdd(v, v)));
      let s = vertexTiles.get(k);
      if (!s) { s = new Set(); vertexTiles.set(k, s); }
      s.add(i);
    }
  }
  const circs = patchCircuits(patch, BASE);
  const everyChordCuts = patch.instances.every((inst) =>
    chordsOf(inst.type, BASE).every((pr) => cornerOf(inst.type, pr) !== null),
  );
  let loops = 0;
  let valence3 = 0;
  for (const c of circs) {
    const vs = new Set(c.corners);
    if (c.length !== 3 || vs.size !== 1 || vs.has(null)) continue;
    loops++;
    if ((vertexTiles.get([...vs][0] as string) ?? new Set()).size === 3) valence3++;
  }
  const ok = everyChordCuts && loops === circs.length && valence3 === circs.length;
  c7 = c7 && ok;
  console.log(
    `        lv${lv}  everyChordCutsACorner=${everyChordCuts}  circuits=${circs.length}` +
      `  singleVertexLoops=${loops}  thoseVerticesHaveExactly3Tiles=${valence3}`,
  );
}
verdict(c7, 'C7: in the base combo every circuit is the 3-loop around a 3-valent tiling vertex');

heading('C9. The circuits themselves, up to congruence');
{
  const patch = buildPatch('Delta', Math.min(MAX, 5));
  const union = new Set<string>();
  for (const combo of COMBOS) {
    const byKey = new Map<string, { len: number; words: Set<string>; count: number }>();
    for (const c of patchCircuits(patch, combo)) {
      const k = congruenceKey(c.dots);
      union.add(k);
      let hit = byKey.get(k);
      if (!hit) { hit = { len: c.length, words: new Set(), count: 0 }; byKey.set(k, hit); }
      hit.words.add(c.word);
      hit.count++;
    }
    const rows = [...byKey.values()].sort((a, b) => a.len - b.len || b.count - a.count);
    console.log(`        ${combo}: ${rows.length} congruence class${rows.length === 1 ? '' : 'es'}`);
    for (const r of rows) {
      console.log(
        `            length ${r.len}  occurrences ${r.count.toLocaleString('en-US')}` +
          `  distinct tile-type words ${r.words.size}`,
      );
    }
  }
  console.log(`        union over all four combos: ${union.size} congruence classes`);
  verdict(union.size < 16, 'C9: the four combos together realise a single small finite list of shapes', `${union.size}`);
}

heading('C8. Which tiles a strand never enters');
verdict(
  ORDER.filter((t) => seamsOf(t).length === 0).join(',') === 'Theta,Gamma2',
  'C8: exactly Theta and Gamma2 carry no chord, so no strand ever enters them',
);
note(
  'that is the difference from the space-filling selections',
  'docs/FASS_PROOF.md section 3 requires every leaf type to carry a chord, which is why `15` is dropped there',
);

finish();
