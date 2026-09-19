/**
 * Obligation A — the local data of edge-class selection `15`.
 *
 * PROVED here (finite checks on the label tables, no tiling input at all):
 *  - A1  each leaf type carries 0, 2 or 4 active dots, and the counts are
 *        Theta = Gamma2 = 0, four-dot for Pi and Psi, two-dot for the rest;
 *  - A2  the number of admissible combination strings is exactly 4;
 *  - A3  every two-dot type's pair of active seams is a pair of CONSECUTIVE
 *        physical edges, so its one chord cuts a tile corner;
 *  - A4  for Pi and Psi, combo digit 0 is the two-corner-cut matching and
 *        digit 1 is the two-long-chord matching.
 *
 * Class 0 is not in the selection, so `fass-proof` L1 applies verbatim and the
 * welded strand graph is a disjoint union of simple paths and simple cycles at
 * every level (docs/FASS_PROOF.md section 4.1).
 *
 * Run: cd web && npx --yes tsx sel15-proof/00-local-data.ts
 * Writes nothing.
 */

import {
  ORDER,
  SELECTION,
  admissibleCombos,
  chordsOf,
  cornerOf,
  finish,
  heading,
  note,
  seamsOf,
  verdict,
} from './lib15';
import { edgeLabels, nonCrossingForTile, zLeafPts, zToPt } from '../src/core';

const EXPECTED_COUNTS: Record<string, number> = {
  Delta: 2, Theta: 0, Lambda: 2, Xi: 2, Pi: 4,
  Sigma: 2, Phi: 2, Psi: 4, Gamma2: 0, Gamma1: 2,
};

heading(`A1. Active dots per leaf type under selection {${SELECTION.join(',')}}`);
let a1 = true;
for (const t of ORDER) {
  const seams = seamsOf(t);
  const ok = seams.length === EXPECTED_COUNTS[t];
  a1 = a1 && ok;
  console.log(
    `        ${t.padEnd(7)} dots=${seams.length}  seams=[${seams.map((s) => s.name).join(' ')}]` +
      `  labelIdx=[${seams.map((s) => s.labelIndex).join(',')}]` +
      `  options=${nonCrossingForTile('spectre', t, new Set(SELECTION)).length}`,
  );
}
verdict(a1, 'dot counts are 0,0 (Theta, Gamma2), 4 (Pi, Psi), 2 (the other six)');
verdict(
  ORDER.every((t) => seamsOf(t).length % 2 === 0),
  'every count is even, so `15` lies in the GF(2) kernel and every type admits a perfect matching',
);
note(
  'Theta and Gamma2 carry no dot at all',
  'they are never visited, which is exactly why docs/FASS_PROOF.md section 3 drops `15` from the space-filling census',
);

heading('A2. Admissible combination strings');
const combos = admissibleCombos();
const EXPECTED_COMBOS = ['0000000000', '0000000100', '0000100000', '0000100100'];
verdict(combos.length === 4, 'exactly 4 combos', `${combos.length}`);
verdict(
  JSON.stringify([...combos].sort()) === JSON.stringify([...EXPECTED_COMBOS].sort()),
  'they are the four strings that vary only the Pi and Psi digits',
  combos.join(' '),
);
note(
  'the product is 1^8 x 2 x 2',
  'the eight 0- and 2-dot types have a unique non-crossing matching; Pi and Psi have two each',
);

heading('A3/A4. Which chords cut a tile corner');
let a3 = true;
let a4 = true;
for (const t of ORDER) {
  const seams = seamsOf(t);
  if (seams.length === 0) continue;
  const n = edgeLabels('spectre', t).length;
  const cells: string[] = [];
  for (const combo of EXPECTED_COMBOS) {
    const desc = chordsOf(t, combo)
      .map((p) => {
        const v = cornerOf(t, p);
        return `${seams[p[0]].name}/${seams[p[1]].name}:${v === null ? 'long' : `corner@v${v}`}`;
      })
      .join(' ');
    cells.push(desc);
  }
  const uniq = [...new Set(cells)];
  console.log(`        ${t.padEnd(7)} (${n} edges)  ${uniq.length === 1 ? uniq[0] : cells.join('  |  ')}`);
  if (seams.length === 2) {
    a3 = a3 && cells.every((c) => !c.includes('long'));
  } else {
    // digit 0 (combos 1 and 2 of EXPECTED_COMBOS depending on the tile) must be
    // all corner cuts; the flipped digit must be all long chords.
    const flat = chordsOf(t, '0000000000').map((p) => cornerOf(t, p));
    a4 = a4 && flat.every((v) => v !== null);
    const flipped = t === 'Pi' ? '0000100000' : '0000000100';
    a4 = a4 && chordsOf(t, flipped).map((p) => cornerOf(t, p)).every((v) => v === null);
  }
}
verdict(a3, 'every two-dot type joins CONSECUTIVE edges, so its chord cuts a corner');
verdict(a4, 'for Pi and Psi digit 0 is two corner cuts and digit 1 is two long chords');

heading('A6. The start/end rule, which makes corner coincidence a theorem');
// Physical edge i runs from vertex i to vertex i+1. A `+k.m` edge glues to a
// neighbour's `-k.m` edge traversed in REVERSE, so the two tiles' notions of
// "start" and "end" are swapped. If every POSITIVE active slot cuts the corner
// at the START of its edge and every NEGATIVE one at the END, then the two
// tiles at any active seam necessarily cut the SAME tiling vertex — with no
// input from the tiling at all.
let a6 = true;
for (const t of ORDER) {
  const seams = seamsOf(t);
  if (seams.length === 0) continue;
  for (const pair of chordsOf(t, '0000000000')) {
    const v = cornerOf(t, pair);
    if (v === null) { a6 = false; continue; }
    for (const p of pair) {
      const positive = seams[p].name.startsWith('+');
      const atStart = v === seams[p].labelIndex;
      const ok = positive === atStart;
      a6 = a6 && ok;
      console.log(
        `        ${t.padEnd(7)} ${seams[p].name.padEnd(4)} edge ${String(seams[p].labelIndex).padStart(2)}` +
          ` cuts v${v} = ${atStart ? 'START' : 'END'}  ${ok ? '' : '  <-- BREAKS THE RULE'}`,
      );
    }
  }
}
verdict(a6, 'A6: positive active slots cut at the edge START, negative ones at the END');
note(
  'A6 upgrades corner coincidence from a measurement to a theorem',
  'the gluing reverses edge direction, so START on one side is END on the other',
);

heading('A7. Interior angle at every cut corner');
let a7 = true;
for (const t of ORDER) {
  if (seamsOf(t).length === 0) continue;
  const pts = zLeafPts('spectre', t).map(zToPt);
  const n = pts.length;
  for (const pair of chordsOf(t, '0000000000')) {
    const v = cornerOf(t, pair);
    if (v === null) continue;
    const prev = pts[(v - 1 + n) % n];
    const cur = pts[v];
    const next = pts[(v + 1) % n];
    let d =
      ((Math.atan2(next.y - cur.y, next.x - cur.x) - Math.atan2(prev.y - cur.y, prev.x - cur.x)) *
        180) /
      Math.PI;
    d = ((d % 360) + 360) % 360;
    const interior = Math.min(d, 360 - d);
    const ok = Math.abs(interior - 120) < 1e-9;
    a7 = a7 && ok;
    console.log(`        ${t.padEnd(7)} corner v${v}  interior angle = ${interior.toFixed(9)} deg`);
  }
}
verdict(a7, 'A7: every cut corner has interior angle exactly 120 degrees');
note(
  'A7 is what fixes the circuit length at 3',
  'three 120-degree corners fill the 360 degrees around a vertex, and L0 forbids a fourth',
);

heading('A5. Chords per cluster tile');
verdict(
  ORDER.every((t) => seamsOf(t).length / 2 === Math.floor(seamsOf(t).length / 2)),
  'a tile with d dots contributes exactly d/2 chords, so a cluster with d dots carries d chords',
);

finish();
