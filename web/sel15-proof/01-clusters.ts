/**
 * Obligation B — the cluster atlas of selection `15`.
 *
 * A CLUSTER is a connected component of the active-adjacency graph: tiles are
 * nodes, and two tiles are joined once for every active dot they share. The
 * cluster decomposition does NOT depend on the combination string — the combo
 * only chooses how each tile's own dots are paired up inside it — so one atlas
 * settles all four combos at once.
 *
 * PROVED here (given the atlas):
 *  - B1  every dot of a complete cluster has multiplicity exactly 2;
 *  - B2  a cluster with `d` dots carries exactly `d` chords, so its strands have
 *        total length `d`; hence max circuit length <= max chords over the atlas.
 *
 * CHECKED EXACTLY, NOT PROVED:
 *  - B3  the atlas is complete. It is computed over all 9 substitution roots at
 *        levels 1..5 and at level 6 for the Delta and Psi roots, in exact
 *        `Z[zeta12]` arithmetic, and is unchanged from level 4 on. Upgrading
 *        this to a theorem needs the finite-local-complexity step that
 *        docs/FASS_PROOF.md section 5 records as OPEN.
 *
 * Writes `sel15-proof/atlas.json` (the certificate consumed by the Lean
 * development and by `02-vocabulary.ts`) and nothing else.
 *
 * Run: cd web && npx --yes tsx sel15-proof/01-clusters.ts [maxLevel]
 */

import { writeFileSync } from 'node:fs';
import {
  ROOTS,
  SELECTION,
  admissibleCombos,
  buildPatch,
  chordsOf,
  canonicalCluster,
  chordCount,
  decompose,
  finish,
  heading,
  note,
  scanClusters,
  seamsOf,
  verdict,
  type Cluster,
  type Contact,
} from './lib15';

const MAX = Number(process.argv[2] ?? 5);
const COMBOS = admissibleCombos();

const atlas = new Map<string, Cluster>();
const contacts = new Map<string, Contact>();
const memo = new Map<string, string>();
const rows: string[][] = [];
let worstMultiplicity = 0;

function sweep(label: string, roots: readonly (typeof ROOTS)[number][], level: number): void {
  const beforeC = atlas.size;
  const beforeN = contacts.size;
  let tiles = 0;
  let complete = 0;
  let truncated = 0;
  for (const root of roots) {
    const patch = buildPatch(root, level);
    tiles += patch.instances.length;
    const scan = scanClusters(patch, memo, level <= 4);
    truncated += scan.truncated;
    for (const [k, v] of scan.atlas) {
      complete += v.count;
      if (!atlas.has(k)) atlas.set(k, v.cluster);
    }
    for (const [k, c] of scan.contacts) if (!contacts.has(k)) contacts.set(k, c);
    for (const m of scan.dotMultiplicity.keys()) worstMultiplicity = Math.max(worstMultiplicity, m);
  }
  rows.push([
    label,
    String(roots.length),
    tiles.toLocaleString('en-US'),
    complete.toLocaleString('en-US'),
    truncated.toLocaleString('en-US'),
    `${contacts.size}${contacts.size === beforeN ? '' : ` (+${contacts.size - beforeN})`}`,
    `${atlas.size}${atlas.size === beforeC ? '' : ` (+${atlas.size - beforeC})`}`,
  ]);
}

heading(`B. Contact set and cluster atlas, selection {${SELECTION.join(',')}}`);
for (let lv = 1; lv <= MAX; lv++) sweep(`level ${lv}`, ROOTS, lv);
sweep(`level ${MAX + 1}`, ['Delta', 'Psi'], MAX + 1);

const head = ['patch', 'roots', 'tiles', 'complete clusters', 'truncated', 'contact types', 'cluster types'];
const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
console.log(`        ${head.map((h, i) => h.padEnd(w[i])).join('  ')}`);
for (const r of rows) console.log(`        ${r.map((c, i) => c.padEnd(w[i])).join('  ')}`);

verdict(worstMultiplicity === 2, 'B1: no dot anywhere has multiplicity 3 or more', `max = ${worstMultiplicity}`);

const sizes = new Map<string, number>();
for (const c of atlas.values()) {
  const key = `${c.types.length} tiles / ${chordCount(c)} chords`;
  sizes.set(key, (sizes.get(key) ?? 0) + 1);
}
for (const [k, n] of [...sizes].sort()) console.log(`        ${n} cluster types of ${k}`);

let b2 = true;
for (const c of atlas.values()) b2 = b2 && c.links.length === chordCount(c);
verdict(b2, 'B2: every cluster has exactly as many shared dots as chords (2-regular)');

const maxChords = Math.max(...[...atlas.values()].map(chordCount));
verdict(maxChords === 9, 'B2: the largest cluster carries 9 chords, so no circuit can exceed length 9', `max = ${maxChords}`);

const lastTwo = rows.slice(-3).map((r) => r[6]);
verdict(
  new Set(lastTwo.map((s) => s.split(' ')[0])).size === 1,
  'B3: the atlas is unchanged over the last three sweeps',
  lastTwo.join(' -> '),
);
note(
  'B3 is a finite check, not a theorem',
  'completeness of the atlas needs the finite-local-complexity step that docs/FASS_PROOF.md section 5 lists as OPEN',
);

heading('B4. The atlas');
const keys = [...atlas.keys()].sort();
keys.forEach((k, i) => {
  const c = atlas.get(k)!;
  const four = c.types.filter((t) => seamsOf(t).length === 4);
  console.log(
    `\n        [C${i + 1}] ${c.types.length} tiles, ${chordCount(c)} chords, ` +
      `${four.length} four-dot: {${[...c.types].sort().join(', ')}}`,
  );
  for (const [a, sa, b, sb] of c.links) {
    console.log(
      `               ${c.types[a]}${seamsOf(c.types[a])[sa].name}` +
        ` = ${c.types[b]}${seamsOf(c.types[b])[sb].name}`,
    );
  }
  for (const combo of COMBOS) {
    const d = decompose(c, combo);
    console.log(`               ${combo}  cycles=[${d.cycles.join(',')}] paths=[${d.paths.join(',')}]`);
  }
});

writeFileSync(
  new URL('./atlas.json', import.meta.url),
  `${JSON.stringify(
    {
      selection: SELECTION,
      combos: COMBOS,
      tiles: Object.fromEntries(
        [...new Set([...atlas.values()].flatMap((c) => c.types))].sort().map((t) => [
          t,
          {
            seams: seamsOf(t).map((s) => s.name),
            chords: Object.fromEntries(COMBOS.map((cb) => [cb, chordsOf(t, cb).map((x) => [...x])])),
          },
        ]),
      ),
      clusters: keys.map((k, i) => ({
        id: `C${i + 1}`,
        types: atlas.get(k)!.types,
        links: atlas.get(k)!.links,
      })),
      provenance: {
        roots: ROOTS,
        levels: `1..${MAX} all roots; ${MAX + 1} for Delta and Psi`,
        arithmetic: 'exact Z[zeta12], doubled lattice coordinates',
      },
    },
    null,
    2,
  )}\n`,
);
console.log('\n        wrote sel15-proof/atlas.json');

verdict(
  canonicalCluster(atlas.get(keys[0])!) === keys[0],
  'B5: the stored canonical form round-trips',
);

finish();
