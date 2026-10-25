/**
 * Where do the circuits sit? One record per combination, for placements.py.
 *
 * All combinations of a family are drawn on the same level-L Delta supertile,
 * so the tiles are shared and two combinations can be compared tile by tile.
 * Per combination this writes:
 *   - a per-tile map: log2 of the longest circuit through the tile (0 if none);
 *   - per circuit-length bucket, how its crossings split over the "fault level"
 *     of the seam they cross. A seam between two tiles whose smallest common
 *     supertile is level b sits on a level-(b-1) supertile boundary, so b = 1
 *     is inside a level-1 supertile, b = L is the deepest fault in the patch,
 *     and b = 0 is the seam inside a Mystic.
 *
 * Usage: tsx placement-maps.ts <family> <level> <outDir> [rules,comma] [maxCombos]
 * With maxCombos, a rule with more combinations is sampled at evenly spaced indices.
 * Writes <outDir>/<family>-L<level>[-rules].json (meta + per-combo summaries) and
 * the matching .tiles.bin (uint8, 10 x log2 length, one row of nTiles per combo).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildGraph, comboCount, comboFromIndex, comboString } from './engine';
import {
  buildSystem, flatten, leafPts, transPt, strandComponents, strandWorkspace, validEdgeSubsets, type TileFamilyId,
} from '../src/core';

const [familyArg, levelArg, outDir, rulesArg, maxArg] = process.argv.slice(2);
const maxCombos = maxArg ? Number(maxArg) : Infinity;
const family = familyArg as TileFamilyId;
const level = Number(levelArg);
const rules = rulesArg && rulesArg !== 'small'
  ? rulesArg.split(',')
  : validEdgeSubsets(family).filter((s) => s.edges.length > 0 && s.edges.length < 8).map((s) => s.edges.join(''));

const insts = flatten(buildSystem(family, level)['Delta']);
const centre = insts.map((t) => {
  const pts = leafPts(family, t.type);
  const m = pts.reduce((a, p) => ({ x: a.x + p.x / pts.length, y: a.y + p.y / pts.length }), { x: 0, y: 0 });
  const w = transPt(t.xform, m);
  return [Math.round(w.x * 100) / 100, Math.round(w.y * 100) / 100];
});
const ids = insts.map((t) => t.id.split('.'));
const nTiles = insts.length;
// Level-1 and level-2 supertile of every tile, for coarse maps.
// Mystic halves (Gamma1/Gamma2) carry one extra id component, so cut from the root.
const parentKey = (k: number) => ids.map((p) => p.slice(0, level - k).join('.'));
const sup1 = parentKey(1);
const sup2 = parentKey(2);
const index = (keys: string[]) => {
  const m = new Map<string, number>();
  return { idx: keys.map((k) => (m.has(k) ? m.get(k)! : (m.set(k, m.size), m.size - 1))), n: () => m.size };
};
const s1 = index(sup1);
const s2 = index(sup2);
const faultOf = (a: number, b: number) => {
  const p = ids[a];
  const q = ids[b];
  let c = 0;
  while (c < level && p[c] === q[c]) c++;
  return level - c; // 0 between the two halves of one Mystic

};

const NB = 20; // circuit-length buckets: [2^k, 2^(k+1))
mkdirSync(outDir, { recursive: true });
const combos: unknown[] = [];
const rows: Uint8Array[] = [];
const ruleMeta: unknown[] = [];

for (const rule of rules) {
  const subset = [...rule].map(Number);
  const g = buildGraph(family, subset, level);
  if (g.nTiles !== nTiles) throw new Error('tile count mismatch');
  const occTile = new Int32Array(g.occNode.length);
  for (let t = 0; t < g.nTiles; t++) for (let k = g.tileOcc[t]; k < g.tileOcc[t + 1]; k++) occTile[k] = t;
  // Fault level per node (-1 on the patch boundary).
  const nodeFault = new Int8Array(g.nNodes).fill(-1);
  const baseline = new Array(level + 1).fill(0);
  for (let n = 0; n < g.nNodes; n++) {
    if (g.nodeDeg[n] !== 2) continue;
    const a = occTile[g.nodeOcc[g.nodeOccStart[n]]];
    const b = occTile[g.nodeOcc[g.nodeOccStart[n] + 1]];
    nodeFault[n] = faultOf(a, b);
    baseline[nodeFault[n]]++;
  }
  ruleMeta.push({ rule, nNodes: g.nNodes, faultBaseline: baseline });
  const ws = strandWorkspace(g);
  const total = comboCount(g);
  const n = Math.min(total, maxCombos);
  for (let s = 0; s < n; s++) {
    const ci = Math.floor((s * total) / n);
    const digits = comboFromIndex(g, ci);
    const c = strandComponents(g, digits, ws);
    const bucket = new Int8Array(c.n);
    for (let k = 0; k < c.n; k++) {
      bucket[k] = c.ends[k] === 0 && c.junc[k] === 0 ? Math.min(NB - 1, Math.floor(Math.log2(c.segs[k]))) : -1;
    }
    // faultHist[bucket][level], openFault[level]
    const faultHist = Array.from({ length: NB }, () => new Array(level + 1).fill(0));
    const openFault = new Array(level + 1).fill(0);
    for (let n = 0; n < g.nNodes; n++) {
      const f = nodeFault[n];
      if (f < 0) continue;
      const b = bucket[c.comp[n]];
      if (b >= 0) faultHist[b][f]++;
      else openFault[f]++;
    }
    const row = new Uint8Array(nTiles);
    for (let t = 0; t < nTiles; t++) {
      let best = 0;
      for (let k = g.tileOcc[t]; k < g.tileOcc[t + 1]; k++) {
        const comp = c.comp[g.occNode[k]];
        if (bucket[comp] >= 0) best = Math.max(best, Math.log2(c.segs[comp]));
      }
      row[t] = Math.round(best * 10);
    }
    rows.push(row);
    let lmax = 0;
    for (let k = 0; k < c.n; k++) if (bucket[k] >= 0) lmax = Math.max(lmax, c.segs[k]);
    let omax = 0;
    for (let k = 0; k < c.n; k++) if (bucket[k] < 0) omax = Math.max(omax, c.segs[k]);
    combos.push({ rule, index: ci, combo: comboString(digits), lmax, omax, faultHist, openFault });
  }
  process.stderr.write(`${family} ${rule}: ${n} of ${total} combos\n`);
}

const base = `${outDir}/${family}-L${level}${rulesArg ? `-${rulesArg.replace(/,/g, '_')}` : ''}`;
writeFileSync(`${base}.json`, JSON.stringify({
  family, level, nTiles, types: insts.map((t) => t.type), centre,
  sup1: s1.idx, sup2: s2.idx, nSup1: s1.n(), nSup2: s2.n(),
  // supK[k-1][tile] = index of the tile's level-k supertile, k = 1..level-1
  supK: Array.from({ length: level - 1 }, (_, k) => index(parentKey(k + 1)).idx),
  rules: ruleMeta, combos,
}));
const bin = new Uint8Array(rows.length * nTiles);
rows.forEach((r, i) => bin.set(r, i * nTiles));
writeFileSync(`${base}.tiles.bin`, bin);
process.stderr.write(`wrote ${base}.* (${rows.length} combos x ${nTiles} tiles)\n`);
