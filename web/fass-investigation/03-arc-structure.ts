/**
 * Arc structure of the circuit-free combos on the Delta supertile, levels 1-5:
 *  - exactly 4 open arcs, 0 circuits, 0 junctions at every level;
 *  - all 8 arc endpoints lie ON the patch boundary (point-on-outline proof,
 *    tol 1e-6) — so the strands only ever "end" because the patch does;
 *  - the pairing of the 8 boundary dots (canonical outline order, chirality-
 *    stable anchor at the supertile quad) — compared across levels;
 *  - dominant-arc share of all segments.
 *
 * Run: cd web && npx --yes tsx fass-investigation/03-arc-structure.ts [maxLevel]
 */

import {
  buildPatch,
  collectTagged,
  endpointsOf,
  locateOnOutline,
  patchOutline,
  traceIndexed,
} from './lib';

const MAX_LEVEL = Number(process.argv[2] ?? 5);
const COMBOS = ['0100100000', '0010100000', '0011000000', '0101000000'];

for (const combo of COMBOS) {
  console.log(`\n===== 1278 / ${combo} (Delta supertile) =====`);
  const pairingsByLevel: string[] = [];
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const { root, instances } = buildPatch('Delta', level);
    const tagged = collectTagged(instances, combo);
    const trace = traceIndexed(tagged.segs);
    const total = tagged.segs.length;
    const tails = [...trace.tails].sort((a, b) => b.segIdxs.length - a.segIdxs.length);
    const lens = tails.map((t) => t.segIdxs.length);
    if (trace.circuits.length || trace.junctionCount) {
      console.log(`lvl${level}: circuits=${trace.circuits.length} junctions=${trace.junctionCount} !!`);
      continue;
    }

    const outline =
      root.kind === 'meta'
        ? patchOutline(instances, root.quad)
        : patchOutline(instances, root.quad);
    // endpointsOf: all degree-1 welded points; locateOnOutline THROWS if any
    // endpoint is not on the boundary polygon.
    const eps = endpointsOf(trace);
    const dots = locateOnOutline(outline, eps);
    const labelOf = new Map(dots.map((d, i) => [d.key, i]));

    // pairing: for each tail, the outline labels of its two ends.
    const pairing = tails
      .map((t) => {
        const a = labelOf.get(t.keys[0])!;
        const b = labelOf.get(t.keys[t.keys.length - 1])!;
        return [Math.min(a, b), Math.max(a, b)] as const;
      })
      .sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const pairingStr = pairing.map(([a, b]) => `${a}-${b}`).join(' ');
    pairingsByLevel.push(pairingStr);

    // order arcs by pairing for stable identity: report length per pair
    const byPair = tails
      .map((t) => {
        const a = labelOf.get(t.keys[0])!;
        const b = labelOf.get(t.keys[t.keys.length - 1])!;
        return { pair: `${Math.min(a, b)}-${Math.max(a, b)}`, len: t.segIdxs.length };
      })
      .sort((x, y) => Number(x.pair.split('-')[0]) - Number(y.pair.split('-')[0]));

    console.log(
      `lvl${level}: tiles=${instances.length} segs=${total} circuits=0 junctions=0 tails=${lens.length} ` +
        `[${lens.join(', ')}] dominant=${((lens[0] / total) * 100).toFixed(2)}% ` +
        `endpointsOnBoundary=${dots.length}/8` +
        ` pairing{${byPair.map((x) => `${x.pair}:${x.len}`).join(' ')}}`,
    );
  }
  const allSame = pairingsByLevel.every((p) => p === pairingsByLevel[0]);
  console.log(
    `boundary-dot pairing across levels 1..${MAX_LEVEL}: ${allSame ? `IDENTICAL (${pairingsByLevel[0]})` : `VARIES: ${pairingsByLevel.join(' | ')}`}`,
  );
}
