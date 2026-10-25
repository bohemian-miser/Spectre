/**
 * Centre-map sweep: every pairing of every rule of one family at one level,
 * each measured against a fixed set of landmark pairings by the Centre map's
 * directed chamfer distance (src/core/centreMap.ts: size-matched,
 * size-weighted). The full pairing × pairing matrix is out of reach (millions
 * squared), so each pairing gets a row against the landmarks instead, and the
 * rows are what the embedding step (centremap-embed.py) lays out.
 *
 * Usage: tsx centremap-sweep.ts <family> <level> <shard> <nShards> <outDir>
 *
 * CENTREMAP_LIMIT=n (environment) sweeps only the first n pairings: a quick
 * local run of the whole pipeline.
 *
 * Pairings are numbered globally: rules in validEdgeSubsets order (the empty
 * one skipped), each rule's pairings in combination-index order. Shard k of n
 * handles one contiguous run of them and writes:
 *   rows-<k>.u8     one byte per (pairing, landmark): log-quantised distance
 *   stats-<k>.u32   per pairing: circuits, circuits inside the mask, longest
 * The landmark list is in centremap-landmarks.ts, so every shard agrees.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  buildStrandGraph,
  centreSurveyFrame,
  chamferSource,
  chamferTarget,
  chamferToTarget,
  circuitCentreSet,
  comboDigitsFromIndex,
  strandWorkspace,
  type TileFamilyId,
} from '../src/core';
import { CENTREMAP_OPTIONS, centremapPairings, centremapLandmarks, quantiseDistance } from './centremap-landmarks';

const [familyArg, levelArg, shardArg, nArg, outDir] = process.argv.slice(2);
if (!outDir) {
  console.error('usage: tsx centremap-sweep.ts <family> <level> <shard> <nShards> <outDir>');
  process.exit(1);
}
const family = familyArg as TileFamilyId;
const level = Number(levelArg);
const shard = Number(shardArg);
const nShards = Number(nArg);
mkdirSync(outDir, { recursive: true });

const t0 = Date.now();
const full = centremapPairings(family);
const limit = Number(process.env.CENTREMAP_LIMIT) || full.total;
const plan = { ...full, total: Math.min(full.total, limit) };
const graphs = plan.rules.map((r) => buildStrandGraph(family, r.subset, level));
const wss = graphs.map((g) => strandWorkspace(g));
const { grid, mask } = centreSurveyFrame(graphs);
const at = (index: number) => {
  const r = plan.ruleOf(index);
  return { r, digits: comboDigitsFromIndex(plan.rules[r].optionCounts, index - plan.rules[r].offset) };
};

// Landmark distance maps, built once per shard.
const landmarks = centremapLandmarks(plan);
const targets = landmarks.map((index) => {
  const { r, digits } = at(index);
  return chamferTarget(circuitCentreSet(graphs[r], digits, wss[r]), grid, CENTREMAP_OPTIONS.matchSizes);
});
console.error(`${family} L${level} shard ${shard}/${nShards}: ${landmarks.length} landmarks ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// What every shard measured, for the embedding step (identical from each shard).
writeFileSync(
  `${outDir}/plan.json`,
  JSON.stringify({
    family,
    level,
    shards: nShards,
    total: plan.total,
    options: CENTREMAP_OPTIONS,
    span: grid.size * grid.h,
    quantisation: 'q = round(254 * ln(1 + d) / ln(1 + span)), 255 = no centres',
    rules: plan.rules.map((r) => ({ subset: r.subset, optionCounts: r.optionCounts, offset: r.offset, total: r.total })),
    landmarks,
  }),
);

const start = Math.floor((plan.total * shard) / nShards);
const end = Math.floor((plan.total * (shard + 1)) / nShards);
const L = targets.length;
const rows = new Uint8Array((end - start) * L);
const stats = new Uint32Array((end - start) * 3);
const span = grid.size * grid.h;
const t1 = Date.now();
for (let index = start; index < end; index++) {
  const { r, digits } = at(index);
  const set = circuitCentreSet(graphs[r], digits, wss[r]);
  const src = chamferSource(set, grid, mask, CENTREMAP_OPTIONS);
  const k = index - start;
  for (let j = 0; j < L; j++) rows[k * L + j] = quantiseDistance(chamferToTarget(src, targets[j], grid), span);
  let longest = 0;
  for (let i = 0; i < set.n; i++) if (set.lens[i] > longest) longest = set.lens[i];
  stats[k * 3] = set.n;
  stats[k * 3 + 1] = src.cell.length;
  stats[k * 3 + 2] = longest;
  if ((k + 1) % 2000 === 0) {
    const rate = (k + 1) / ((Date.now() - t1) / 1000);
    console.error(`shard ${shard}: ${k + 1} / ${end - start}, ${rate.toFixed(0)}/s, ~${((end - start - k - 1) / rate / 60).toFixed(1)} min left`);
  }
}
writeFileSync(`${outDir}/rows-${shard}.u8`, rows);
writeFileSync(`${outDir}/stats-${shard}.u32`, new Uint8Array(stats.buffer));
console.error(`shard ${shard} finished: pairings ${start}..${end - 1} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
