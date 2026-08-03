/**
 * Space-filling quantification for 1278/<combo>:
 * for the Psi and Delta supertiles at levels 1..maxLevel, report
 *   tiles, strand segments, arcs, longest-arc share,
 *   tiles visited by the longest arc / by the two big arcs / by any arc,
 *   segments-per-tile ratio.
 * Every tile holds >= 1 chord under 1278 (chords per tile: 1 for
 * Delta/Sigma/Phi/Psi/Gamma2, 2 for Theta/Lambda/Xi/Pi/Gamma1), so
 * "tiles visited by all arcs together" must equal ALL tiles — asserted.
 *
 * Run: cd web && npx --yes tsx fass-investigation/06-coverage.ts <combo> <maxLevel>
 */

import type { TileTypeId } from '../src/core';
import { buildPatch, collectTagged, traceIndexed } from './lib';

const COMBO = process.argv[2] ?? '0100100000';
const MAX_LEVEL = Number(process.argv[3] ?? 5);

for (const root of ['Psi', 'Delta'] as TileTypeId[]) {
  console.log(`\n=== ${root} supertile, 1278/${COMBO} ===`);
  console.log('lvl   tiles     segs      arcs  arcLens(top3)              longest%   tilesByLongest  tilesBy2Big  tilesByAll  segs/tile');
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const { instances } = buildPatch(root, level);
    const tagged = collectTagged(instances, COMBO);
    const trace = traceIndexed(tagged.segs);
    if (trace.circuits.length || trace.junctionCount) {
      console.log(`lvl${level}: HAS CIRCUITS/JUNCTIONS`);
      continue;
    }
    const tails = [...trace.tails].sort((a, b) => b.segIdxs.length - a.segIdxs.length);
    const tilesOf = (arcIdxs: number[]): Set<number> => {
      const s = new Set<number>();
      for (const ai of arcIdxs)
        for (const si of tails[ai].segIdxs) s.add(tagged.instOf[si]);
      return s;
    };
    const byLongest = tilesOf([0]).size;
    const by2 = tilesOf(tails.length >= 2 ? [0, 1] : [0]).size;
    const byAll = tilesOf(tails.map((_, i) => i)).size;
    if (byAll !== instances.length) {
      throw new Error(`coverage gap: ${byAll} of ${instances.length} tiles visited`);
    }
    const lens = tails.map((t) => t.segIdxs.length);
    console.log(
      `${String(level).padEnd(4)}${String(instances.length).padEnd(10)}${String(tagged.segs.length).padEnd(10)}` +
        `${String(lens.length).padEnd(6)}${lens.slice(0, 3).join(',').padEnd(27)}` +
        `${((lens[0] / tagged.segs.length) * 100).toFixed(2).padStart(7)}%   ` +
        `${String(byLongest).padEnd(16)}${String(by2).padEnd(13)}${String(byAll).padEnd(12)}` +
        `${(tagged.segs.length / instances.length).toFixed(4)}`,
    );
  }
}
