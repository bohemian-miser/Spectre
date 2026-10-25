/**
 * Which supertile does each big circuit belong to?
 *
 * For every closed circuit of at least `minSegs` segments, find the smallest
 * supertile that contains all the tiles it passes through, and tally the
 * circuits by that supertile's level and type, and by the child slots of that
 * supertile the circuit visits. If a placement is a substitution-invariant
 * thing, the tally should read like "one circuit around every level-k Psi,
 * through slots {…}", the same at every k.
 *
 * Usage: tsx circuit-sites.ts <family> <level> <minSegs> <rule-combo> [<rule-combo> ...]
 * Prints one JSON object per combination.
 */
import { buildGraph } from './engine';
import {
  buildSystem, flatten, strandComponents, type TileFamilyId, type TileNode,
} from '../src/core';

const [familyArg, levelArg, minArg, ...shares] = process.argv.slice(2);
const family = familyArg as TileFamilyId;
const level = Number(levelArg);
const minSegs = Number(minArg);
const root = buildSystem(family, level)['Delta'];
const insts = flatten(root);
const ids = insts.map((t) => t.id.split('.').slice(0, level).map(Number));

/** Type of the supertile reached from the root by these child positions. */
function typeAt(path: readonly number[]): string {
  let node: TileNode = root;
  for (const p of path) {
    if (node.kind === 'leaf') break;
    node = node.children.find((c) => c.pos === p)!.node;
  }
  return node.type;
}

const graphs = new Map<string, ReturnType<typeof buildGraph>>();
for (const share of shares) {
  const [rule, combo] = share.split('-');
  if (!graphs.has(rule)) graphs.set(rule, buildGraph(family, [...rule].map(Number), level));
  const g = graphs.get(rule)!;
  const digits = [...combo].map((ch) => parseInt(ch, 36));
  const c = strandComponents(g, digits);
  const occTile = new Int32Array(g.occNode.length);
  for (let t = 0; t < g.nTiles; t++) for (let k = g.tileOcc[t]; k < g.tileOcc[t + 1]; k++) occTile[k] = t;
  // Common prefix of the tile ids each big circuit passes through.
  const prefix = new Map<number, number[]>();
  const slots = new Map<number, Set<number>>();
  for (let n = 0; n < g.nNodes; n++) {
    const k = c.comp[n];
    if (c.ends[k] || c.junc[k] || c.segs[k] < minSegs) continue;
    for (let j = g.nodeOccStart[n]; j < g.nodeOccStart[n + 1]; j++) {
      const id = ids[occTile[g.nodeOcc[j]]];
      const p = prefix.get(k);
      if (!p) {
        prefix.set(k, [...id]);
        continue;
      }
      let m = 0;
      while (m < p.length && p[m] === id[m]) m++;
      p.length = m;
    }
  }
  for (let n = 0; n < g.nNodes; n++) {
    const k = c.comp[n];
    const p = prefix.get(k);
    if (!p) continue;
    if (!slots.has(k)) slots.set(k, new Set());
    for (let j = g.nodeOccStart[n]; j < g.nodeOccStart[n + 1]; j++) {
      const id = ids[occTile[g.nodeOcc[j]]];
      if (id.length > p.length) slots.get(k)!.add(id[p.length]);
    }
  }
  const tally = new Map<string, { n: number; segs: number[] }>();
  for (const [k, p] of prefix) {
    const key = `L${level - p.length} ${typeAt(p)} slots ${[...slots.get(k)!].sort((a, b) => a - b).join('')}`;
    const e = tally.get(key) ?? { n: 0, segs: [] };
    e.n++;
    if (!e.segs.includes(c.segs[k])) e.segs.push(c.segs[k]);
    tally.set(key, e);
  }
  const rows = [...tally].sort((a, b) => a[0].localeCompare(b[0]));
  console.log(JSON.stringify({ share, circuits: prefix.size, sites: Object.fromEntries(rows) }));
}
