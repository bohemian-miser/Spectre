/**
 * Does Tile(1,1) rule R embed in the iso labelling's rule R ∪ {4}?
 *
 * The iso labels split Sigma's four-edge class-4 seam (and Gamma2's matching
 * -4 seam) into a 6 half and a 4 half. Every other crossing is shared. So for
 * each Tile(1,1) combination, build the iso combination with the same pairing
 * everywhere and, in Sigma and Gamma2, the two new crossings joined to each
 * other. That adds one closed 2-segment "bubble" per Sigma–Gamma2 contact and
 * should change nothing else. Checked here by comparing strand lengths.
 *
 * Usage: tsx iso-embed.ts
 */
import {
  buildStrandGraph, comboDigitsFromIndex, comboOptionCounts, connectionPoints, enumerateMatchings,
  leafOrder, nonCrossingForTile, strandComponents, validEdgeSubsets, type TileTypeId,
} from '../src/core';

const tag = (e: { sign: number; major: number; variant: string }) => `${e.sign < 0 ? '-' : ''}${e.major}${e.variant}`;
const types = leafOrder('spectre');

function optionTags(family: 'spectre' | 'spectre-iso', t: TileTypeId, rule: Set<number>): string[] {
  const pts = connectionPoints(family, t, rule).map((c) => tag(c.edge));
  const all = enumerateMatchings(pts.length);
  const nc = nonCrossingForTile(family, t, rule);
  return (nc.length ? nc.map((i) => all[i]) : [[]]).map((m) =>
    m.map(([a, b]) => [pts[a], pts[b]].sort().join('~')).sort().join(' '));
}

function lengths(family: 'spectre' | 'spectre-iso', rule: number[], d: number[], g = buildStrandGraph(family, rule, 4)) {
  const c = strandComponents(g, d);
  const out: number[] = [];
  for (let k = 0; k < c.n; k++) if (c.segs[k]) out.push(c.segs[k] * (c.ends[k] ? -1 : 1));
  return out.sort((a, b) => a - b);
}

const spectreRules = new Set(validEdgeSubsets('spectre').map((s) => s.edges.join('')));
for (const iso of validEdgeSubsets('spectre-iso')) {
  if (!iso.edges.includes(4)) continue;
  const sRule = iso.edges.filter((e) => e !== 4);
  if (!spectreRules.has(sRule.join(''))) { console.log(`iso ${iso.edges.join('')}: ${sRule.join('')} is not a Tile(1,1) rule`); continue; }
  const sSet = new Set(sRule), iSet = new Set(iso.edges);
  // Per tile: Tile(1,1) digit -> iso digit.
  const maps = types.map((t) => {
    const so = optionTags('spectre', t, sSet);
    const io = optionTags('spectre-iso', t, iSet);
    const extra = t === 'Sigma' ? '4A~6A' : t === 'Gamma2' ? '-4A~-6A' : '';
    return so.map((s) => io.indexOf([s, extra].filter(Boolean).join(' ').split(' ').filter(Boolean).sort().join(' ')));
  });
  const counts = comboOptionCounts('spectre', sRule);
  const total = counts.reduce((a, b) => a * b, 1);
  const gs = buildStrandGraph('spectre', sRule, 4), gi = buildStrandGraph('spectre-iso', iso.edges, 4);
  const isoTotal = comboOptionCounts('spectre-iso', iso.edges).reduce((a, b) => a * b, 1);
  let ok = 0, unmapped = 0, bubbles = -1;
  const step = Math.max(1, Math.floor(total / 60));
  let tested = 0;
  for (let i = 0; i < total; i += step) {
    const d = comboDigitsFromIndex(counts, i);
    const di = d.map((v, k) => maps[k][v]);
    if (di.some((v) => v < 0)) { unmapped++; continue; }
    tested++;
    const a = lengths('spectre', sRule, d, gs), b = lengths('spectre-iso', iso.edges, di, gi);
    const extra = [...b];
    for (const x of a) { const j = extra.indexOf(x); if (j >= 0) extra.splice(j, 1); }
    const onlyBubbles = extra.every((x) => x === 2) && extra.length + a.length === b.length;
    if (onlyBubbles) { ok++; bubbles = extra.length; }
  }
  console.log(`Tile(1,1) ${sRule.join('')} (${total.toLocaleString()}) -> iso ${iso.edges.join('')} (${isoTotal.toLocaleString()}): ${ok}/${tested} sampled combos identical up to ${bubbles} two-segment bubbles at level 4${unmapped ? `, ${unmapped} had no iso image` : ''}`);
}
