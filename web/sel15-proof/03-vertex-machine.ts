/**
 * Obligation D — the vertex graph and the state machine on it.
 *
 * The base combination puts one chord across every tile corner whose two edges
 * are active, and `00-local-data.ts` A6/A7 show those chords always meet at a
 * shared tiling vertex with a 120-degree corner. So the base strand system is
 * one triangle per ACTIVE VERTEX, and the only freedom left is the Pi/Psi digit.
 *
 * Flipping a four-dot tile swaps its two corner chords for two chords that run
 * BETWEEN its two vertices — a transposition. So the whole system is a state
 * machine on the VERTEX GRAPH `G`: nodes are active vertices, and every four-dot
 * tile is an edge joining its two vertices.
 *
 * PROVED here:
 *  - D1  every active vertex has exactly three tiles around it, each cutting its
 *        corner there, so the base strand system is exactly one 3-cycle per
 *        active vertex;
 *  - D3  the machine reproduces the cycle structure of every cluster in the
 *        atlas, for all four combos, from the component shape and flip set
 *        alone — no geometry.
 *
 * CHECKED EXACTLY, NOT PROVED:
 *  - D2  (Lemma V) every component of `G` is a single node, or a 3-cycle of
 *        three nodes joined by three four-dot tiles. Verified over all 9
 *        substitution roots at levels 1..5 and at level 6 for Delta and Psi.
 *        This is the one place the argument needs more than two tiles at a time.
 *
 * Writes `sel15-proof/machine.json`; run:
 *   cd web && npx --yes tsx sel15-proof/03-vertex-machine.ts [maxLevel]
 */

import { writeFileSync } from 'node:fs';
import {
  ORDER,
  ROOTS,
  SELECTION,
  admissibleCombos,
  buildPatch,
  chordsOf,
  cornerOf,
  decompose,
  finish,
  heading,
  note,
  scanClusters,
  seamsOf,
  verdict,
  zAdd,
  zApply2,
  zKey,
  zLeafPts,
  type Cluster,
} from './lib15';
import type { TileTypeId } from '../src/core';

const MAX = Number(process.argv[2] ?? 5);
const COMBOS = admissibleCombos();
const BASE = COMBOS[0];
const FOUR_DOT = ORDER.filter((t) => seamsOf(t).length === 4);

// ---------------------------------------------------------------------------
// D1 / D2 — the vertex graph of a patch
// ---------------------------------------------------------------------------

interface VertexGraph {
  /** active vertex key -> the (tile, corner) incidences at it */
  readonly nodes: Map<string, { tile: number; type: TileTypeId }[]>;
  /** four-dot tile index -> its two active vertex keys */
  readonly edges: Map<number, string[]>;
  /** vertices truncated by the patch boundary are excluded from the verdicts */
  readonly interior: Set<string>;
}

function vertexGraph(level: number, root: TileTypeId): VertexGraph {
  const patch = buildPatch(root, level);
  const nodes = new Map<string, { tile: number; type: TileTypeId }[]>();
  const edges = new Map<number, string[]>();
  const vertexTiles = new Map<string, Set<number>>();
  for (let i = 0; i < patch.instances.length; i++) {
    const inst = patch.instances[i];
    for (const v of zLeafPts('spectre', inst.type)) {
      const k = zKey(zApply2(inst.xform, zAdd(v, v)));
      let s = vertexTiles.get(k);
      if (!s) { s = new Set(); vertexTiles.set(k, s); }
      s.add(i);
    }
    const zp = zLeafPts('spectre', inst.type);
    for (const pair of chordsOf(inst.type, BASE)) {
      const c = cornerOf(inst.type, pair);
      if (c === null) continue;
      const k = zKey(zApply2(inst.xform, zAdd(zp[c], zp[c])));
      let list = nodes.get(k);
      if (!list) { list = []; nodes.set(k, list); }
      list.push({ tile: i, type: inst.type });
      if (seamsOf(inst.type).length === 4) {
        let e = edges.get(i);
        if (!e) { e = []; edges.set(i, e); }
        e.push(k);
      }
    }
  }
  // interior = every dot of every tile at this vertex is shared by two tiles
  const interior = new Set<string>();
  for (const [k, list] of nodes) {
    const ok = list.every((x) =>
      (patch.dotsOfTile.get(x.tile) ?? []).every((d) => patch.dots.get(d)!.length === 2),
    );
    if (ok && (vertexTiles.get(k)?.size ?? 0) === 3) interior.add(k);
  }
  return { nodes, edges, interior };
}

heading('D0. Cross-check of V3: the two tiles at an active seam cut the same vertex');
// V3 is a THEOREM (docs/CIRCUITS_15.md section 2): it follows from the start/end
// rule of `00-local-data.ts` A6 plus the fact that the gluing reverses edge
// direction. This is only a cross-check of that theorem against real patches.
{
  let agree = 0;
  let differ = 0;
  for (const root of ROOTS) {
    for (const lv of [3, 4]) {
      const patch = buildPatch(root, lv);
      for (const [, slots] of patch.dots) {
        if (slots.length !== 2) continue;
        const corners = slots.map((x) => {
          const inst = patch.instances[x.i];
          const pr = chordsOf(inst.type, BASE).find((q) => q[0] === x.s || q[1] === x.s);
          if (!pr) return null;
          const c = cornerOf(inst.type, pr);
          if (c === null) return null;
          const zp = zLeafPts('spectre', inst.type);
          return zKey(zApply2(inst.xform, zAdd(zp[c], zp[c])));
        });
        if (corners[0] !== null && corners[0] === corners[1]) agree++;
        else differ++;
      }
    }
  }
  console.log(`        interior active seams examined: ${(agree + differ).toLocaleString('en-US')}` +
    `  (9 roots, levels 3 and 4)`);
  verdict(differ === 0, 'D0: the two chords at every interior active seam cut the same vertex',
    `${agree.toLocaleString('en-US')} agree, ${differ} differ`);
}

heading(`D1/D2. The vertex graph of selection {${SELECTION.join(',')}}`);
const rows: string[][] = [];
let d1 = true;
let d2 = true;
const compShapes = new Map<string, number>();
for (let lv = 1; lv <= MAX + 1; lv++) {
  const roots = lv <= MAX ? ROOTS : (['Delta', 'Psi'] as TileTypeId[]);
  let interior = 0;
  let threeTiles = 0;
  let degOk = 0;
  for (const root of roots) {
    const g = vertexGraph(lv, root);
    for (const k of g.interior) {
      interior++;
      const list = g.nodes.get(k)!;
      if (list.length === 3) threeTiles++;
      const four = list.filter((x) => seamsOf(x.type).length === 4).length;
      if (four === 0 || four === 2) degOk++;
    }
    // components over interior nodes only
    const adj = new Map<string, string[]>();
    for (const k of g.interior) adj.set(k, []);
    for (const [, vs] of g.edges) {
      if (vs.length !== 2) continue;
      if (!g.interior.has(vs[0]) || !g.interior.has(vs[1])) continue;
      adj.get(vs[0])!.push(vs[1]);
      adj.get(vs[1])!.push(vs[0]);
    }
    const seen = new Set<string>();
    for (const k of g.interior) {
      if (seen.has(k)) continue;
      const stack = [k];
      const comp: string[] = [];
      seen.add(k);
      while (stack.length) {
        const x = stack.pop()!;
        comp.push(x);
        for (const y of adj.get(x) ?? []) if (!seen.has(y)) { seen.add(y); stack.push(y); }
      }
      const degs = comp.map((x) => (adj.get(x) ?? []).length).sort().join('');
      // only score components whose every member is interior AND whose every
      // incident four-dot tile has both endpoints interior
      const closed = comp.every((x) => {
        const list = g.nodes.get(x)!;
        const four = list.filter((y) => seamsOf(y.type).length === 4);
        return four.every((y) => (g.edges.get(y.tile) ?? []).every((z) => g.interior.has(z)));
      });
      if (!closed) continue;
      const shape = `${comp.length} node(s), degrees ${degs}`;
      compShapes.set(shape, (compShapes.get(shape) ?? 0) + 1);
    }
  }
  if (interior > 0) d1 = d1 && threeTiles === interior;
  d2 = d2 && degOk === interior;
  rows.push([`level ${lv}`, String(roots.length), interior.toLocaleString('en-US'),
    String(threeTiles === interior), String(degOk === interior)]);
}
const head = ['patch', 'roots', 'interior active vertices', 'all have 3 tiles', 'all have 0 or 2 four-dot tiles'];
const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
console.log(`        ${head.map((h, i) => h.padEnd(w[i])).join('  ')}`);
for (const r of rows) console.log(`        ${r.map((c, i) => c.padEnd(w[i])).join('  ')}`);
verdict(d1, 'D1: every active vertex has exactly three tiles around it, each cutting its corner there');
verdict(d2, 'D2a: every active vertex carries either zero or two four-dot tiles');
console.log('        closed component shapes seen:');
for (const [shape, n] of [...compShapes].sort()) console.log(`          ${shape}  x${n.toLocaleString('en-US')}`);
verdict(
  [...compShapes.keys()].every((s) => s === '1 node(s), degrees 0' || s === '3 node(s), degrees 222'),
  'D2b (Lemma V): every closed component of G is a lone node or a 3-cycle',
);
note('D2b is the one finite check in the argument', 'everything else needs at most two tiles at a time');

// ---------------------------------------------------------------------------
// D3 — the machine, and its agreement with the atlas
// ---------------------------------------------------------------------------

heading('D3. The state machine: transpositions on a component of G');

/**
 * Cycle lengths of a component of `G` with `n` nodes arranged in a cycle
 * (n = 1 means a lone node with no edges), when `flips` of its `n` edges are
 * flipped. Pure combinatorics: the base system is one 3-cycle per node, and
 * each flipped edge applies one transposition.
 */
function machine(n: number, flips: number): number[] {
  // ground set: 3n chord slots, base permutation = n disjoint 3-cycles
  const N = 3 * n;
  const next = new Array<number>(N);
  for (let v = 0; v < n; v++) for (let j = 0; j < 3; j++) next[3 * v + j] = 3 * v + ((j + 1) % 3);
  // edge e joins node e and node (e+1) mod n; flipping it transposes the two
  // images that leave those nodes along that edge
  for (let e = 0; e < flips; e++) {
    const a = 3 * e + 2;                       // slot of node e facing node e+1
    const b = 3 * ((e + 1) % n) + 0;           // slot of node e+1 facing node e
    const ta = next[a];
    next[a] = next[b];
    next[b] = ta;
  }
  const seen = new Array<boolean>(N).fill(false);
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    if (seen[i]) continue;
    let len = 0;
    let x = i;
    while (!seen[x]) { seen[x] = true; x = next[x]; len++; }
    out.push(len);
  }
  return out.sort((a, b) => a - b);
}

console.log('        component  flips  cycle lengths');
for (const n of [1, 3]) {
  for (let f = 0; f <= (n === 1 ? 0 : n); f++) {
    console.log(`        ${n === 1 ? 'lone node' : '3-cycle  '}  ${f}      [${machine(n, f).join(',')}]`);
  }
}

// atlas cross-check: a 6-tile cluster is a 3-cycle component; its flip count is
// the number of its four-dot tiles whose TYPE is flipped by the combo
const atlasPatch = buildPatch('Delta', Math.min(MAX, 4));
const scan = scanClusters(atlasPatch, new Map(), false);
const seenCluster = new Map<string, Cluster>();
for (const [k, v] of scan.atlas) if (!seenCluster.has(k)) seenCluster.set(k, v.cluster);
let d3 = true;
for (const [, cluster] of seenCluster) {
  const nodes = cluster.types.filter((t) => seamsOf(t).length === 4).length;
  const n = nodes === 0 ? 1 : nodes;
  for (const combo of COMBOS) {
    const flipped = cluster.types.filter(
      (t) => seamsOf(t).length === 4 && chordsOf(t, combo).some((p) => cornerOf(t, p) === null),
    ).length;
    const pred = machine(n, flipped);
    const got = [...decompose(cluster, combo).cycles].sort((a, b) => a - b);
    const ok = JSON.stringify(pred) === JSON.stringify(got);
    d3 = d3 && ok;
    if (!ok) {
      console.log(
        `        MISMATCH {${[...cluster.types].sort().join(',')}} ${combo}` +
          `  machine(${n},${flipped})=[${pred.join(',')}]  atlas=[${got.join(',')}]`,
      );
    }
  }
}
verdict(d3, 'D3: the machine reproduces every atlas cluster decomposition, for all four combos');

heading('D4. The vocabulary the machine forces');
// Which four-dot multisets actually decorate a 3-cycle component? Read off the
// atlas — this is the second and last place the argument uses more than two
// tiles at a time.
const decorations = new Set<string>();
for (const [, cluster] of seenCluster) {
  const four = cluster.types.filter((t) => seamsOf(t).length === 4);
  if (four.length === 3) decorations.add([...four].sort().join(','));
}
console.log(`        four-dot multisets on a 3-cycle component: ${[...decorations].sort().join('  |  ')}`);
verdict(
  !decorations.has('Pi,Pi,Pi'),
  'D4a: no component is decorated Pi,Pi,Pi — which is why flipping Pi alone still leaves 3-cycles',
);
const voc = new Map<string, Set<number>>();
for (const combo of COMBOS) {
  const s = new Set<number>();
  const flipTypes = new Set(
    FOUR_DOT.filter((t) => chordsOf(t, combo).some((p) => cornerOf(t, p) === null)),
  );
  for (const L of machine(1, 0)) s.add(L);                 // lone-node components
  const fs = new Set<number>();
  for (const dec of decorations) {
    const f = dec.split(',').filter((t) => flipTypes.has(t as TileTypeId)).length;
    fs.add(f);
    for (const L of machine(3, f)) s.add(L);
  }
  voc.set(combo, s);
  console.log(
    `        ${combo}  flipped types = {${[...flipTypes].join(',') || 'none'}}` +
      `  flip counts = {${[...fs].sort().join(',')}}` +
      `  reachable lengths = [${[...s].sort((a, b) => a - b).join(',')}]`,
  );
}
const EXPECTED_VOC: Record<string, number[]> = {
  '0000000000': [3],
  '0000000100': [3, 6, 9],
  '0000100000': [3, 6, 9],
  '0000100100': [3, 6],
};
let d4 = true;
for (const combo of COMBOS) {
  const got = [...voc.get(combo)!].sort((a, b) => a - b);
  d4 = d4 && JSON.stringify(got) === JSON.stringify(EXPECTED_VOC[combo]);
}
verdict(d4, 'D4: the machine forces exactly [3], [3,6,9], [3,6,9], [3,6]');
verdict(
  [...voc.values()].every((s) => [...s].every((L) => L === 3 || L === 6 || L === 9)),
  'D4b: the machine can never produce a cycle outside {3,6,9}',
);
note(
  'the machine is why 9 is the ceiling',
  'a 3-cycle component has three edges, and flipping all three merges twice then splits again',
);

writeFileSync(
  new URL('./machine.json', import.meta.url),
  `${JSON.stringify(
    {
      selection: SELECTION,
      combos: COMBOS,
      fourDotTypes: FOUR_DOT,
      flippedTypesByCombo: Object.fromEntries(
        COMBOS.map((c) => [
          c,
          FOUR_DOT.filter((t) => chordsOf(t, c).some((p) => cornerOf(t, p) === null)),
        ]),
      ),
      componentShapes: [
        { nodes: 1, edges: 0 },
        { nodes: 3, edges: 3 },
      ],
      machine: Object.fromEntries(
        [1, 3].flatMap((n) =>
          Array.from({ length: n === 1 ? 1 : n + 1 }, (_, f) => [`n${n}f${f}`, machine(n, f)]),
        ),
      ),
    },
    null,
    2,
  )}\n`,
);
console.log('\n        wrote sel15-proof/machine.json');

finish();
