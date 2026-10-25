/**
 * What the centre-map sweep measures, shared by every shard and by the
 * metadata it ships: the global numbering of a family's pairings, the
 * landmark pairings each one is measured against, the options, and how a
 * distance is squeezed into one byte.
 */
import { comboOptionCounts, validEdgeSubsets, type ChamferOptions, type TileFamilyId } from '../src/core';

/** The Centre map page's defaults: size-matched, size-weighted. */
export const CENTREMAP_OPTIONS: ChamferOptions = { matchSizes: true, weightBySize: true };

/** How many of the all-edges rule's pairings join the landmarks (seeded). */
export const ALL_EDGES_LANDMARKS = 128;

export interface CentremapRule {
  readonly subset: readonly number[];
  readonly optionCounts: readonly number[];
  /** Global index of its first pairing. */
  readonly offset: number;
  readonly total: number;
}

export interface CentremapPlan {
  readonly rules: readonly CentremapRule[];
  readonly total: number;
  /** The rule a global pairing index belongs to. */
  ruleOf(index: number): number;
}

/** Every pairing of every (non-empty) rule, numbered globally. */
export function centremapPairings(family: TileFamilyId): CentremapPlan {
  let offset = 0;
  const rules = validEdgeSubsets(family)
    .filter((s) => s.edges.length)
    .map((s) => {
      const optionCounts = comboOptionCounts(family, s.edges);
      const total = optionCounts.reduce((a, b) => a * b, 1);
      const r = { subset: s.edges, optionCounts, offset, total };
      offset += total;
      return r;
    });
  return {
    rules,
    total: offset,
    ruleOf(index) {
      let r = rules.length - 1;
      while (r > 0 && rules[r].offset > index) r--;
      return r;
    },
  };
}

/**
 * The landmarks: every pairing of every rule but the biggest (the all-edges
 * one), and a seeded sample of the biggest. Sorted global indices.
 */
export function centremapLandmarks(plan: CentremapPlan, sample = ALL_EDGES_LANDMARKS): number[] {
  const big = plan.rules.reduce((b, r, i) => (r.total > plan.rules[b].total ? i : b), 0);
  const out: number[] = [];
  plan.rules.forEach((r, i) => {
    if (i === big) return;
    for (let k = 0; k < r.total; k++) out.push(r.offset + k);
  });
  const B = plan.rules[big];
  let seed = 20261025;
  const picked = new Set<number>();
  while (picked.size < Math.min(sample, B.total)) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    picked.add(B.offset + Math.floor((seed / 2147483648) * B.total));
  }
  return [...out, ...picked].sort((a, b) => a - b);
}

/** A distance (world units) as one byte, on a log scale up to the patch's span; 255 also for "no centres". */
export function quantiseDistance(d: number, span: number): number {
  if (!Number.isFinite(d)) return 255;
  return Math.max(0, Math.min(254, Math.round((254 * Math.log1p(Math.max(0, d))) / Math.log1p(span))));
}

/** The inverse of {@link quantiseDistance} (255 reads as the span). */
export function dequantiseDistance(q: number, span: number): number {
  return Math.expm1(((q >= 255 ? 254 : q) / 254) * Math.log1p(span));
}
