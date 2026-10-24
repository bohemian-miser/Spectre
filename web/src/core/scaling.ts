/**
 * How a strand rule's patterns grow with the supertile level: the numbers
 * behind "bounded circuits", "ever-bigger triangles", "space-filling".
 *
 * For a rule (edge classes plus a pairing per tile type) the patch at each
 * level is analysed and its longest strand measured, closed or not: a strand
 * that runs off the patch is one that hasn't closed by this level, so the huge
 * ones show up there first. Each supertile level makes the patch about λ ≈ 2.81
 * times wider (measured here from the tile counts, so any family works), and
 * the longest strand grows by some factor g per level. Then
 *
 *     d = log g / log λ
 *
 * is the strands' dimension: 0 for circuits of bounded size, 1 for curves that
 * just get bigger, 2 for curves that fill area, fractal in between.
 *
 * Pure: no DOM, no workers. `workers/scaling.worker.ts` runs it off the page.
 */

import { analyze, pathLength } from './circuits';
import { leafOrder, type TileFamilyId, type TileTypeId } from './families';
import { comboToMatchingIndices, nonCrossingForTile, comboDigitChar } from './matchings';
import { buildSystem, flatten, type TileInstance } from './tiles';

export interface LevelStats {
  readonly level: number;
  readonly tiles: number;
  readonly maxCircuit: number;
  readonly maxTail: number;
  /** The longer of the two: the biggest strand this level can see. */
  readonly longest: number;
  /** How many different circuit lengths occur. */
  readonly circuitLengths: number;
  /** Share of strand length on closed circuits (the rest runs off the patch). */
  readonly onCircuits: number;
}

export type GrowthKind = 'bounded' | 'steady' | 'bursty';

export interface Scaling {
  readonly levels: readonly LevelStats[];
  /** Linear growth of the patch per level (√ of the tile-count ratio). */
  readonly inflation: number;
  /** Growth of the longest strand per level, over the last two steps. */
  readonly growth: number;
  readonly dimension: number;
  readonly kind: GrowthKind;
}

const instanceCache = new Map<string, readonly TileInstance[]>();

function instancesOf(family: TileFamilyId, root: TileTypeId, level: number): readonly TileInstance[] {
  const key = `${family}/${root}/${level}`;
  let hit = instanceCache.get(key);
  if (!hit) {
    hit = flatten(buildSystem(family, level)[root]);
    instanceCache.set(key, hit);
  }
  return hit;
}

/** One level's numbers for a rule. */
export function levelStats(
  family: TileFamilyId,
  root: TileTypeId,
  level: number,
  subset: readonly number[],
  matching: readonly number[],
): LevelStats {
  const instances = instancesOf(family, root, level);
  const matchingIndexByType = Object.fromEntries(leafOrder(family).map((t, i) => [t, matching[i] ?? 0]));
  const r = analyze({ family, instances, selected: new Set(subset), matchingIndexByType });
  const circuits = r.circuits.map(pathLength);
  const tails = r.tails.map(pathLength);
  const maxCircuit = circuits.reduce((a, b) => Math.max(a, b), 0);
  const maxTail = tails.reduce((a, b) => Math.max(a, b), 0);
  const onC = circuits.reduce((a, b) => a + b, 0);
  const all = onC + tails.reduce((a, b) => a + b, 0);
  return {
    level,
    tiles: instances.length,
    maxCircuit,
    maxTail,
    longest: Math.max(maxCircuit, maxTail),
    circuitLengths: new Set(circuits).size,
    onCircuits: all ? onC / all : 0,
  };
}

/**
 * Growth, dimension and kind from per-level stats (levels ascending, at least
 * three). Growth is taken over the last two steps together, so a rule whose
 * big strands only grow every other level still reads its average rate.
 */
export function summarizeScaling(levels: readonly LevelStats[]): Scaling {
  const n = levels.length;
  const first = levels[0];
  const last = levels[n - 1];
  const inflation = Math.sqrt(Math.pow(last.tiles / first.tiles, 1 / (n - 1)));
  const a = levels[Math.max(0, n - 3)].longest;
  const b = levels[n - 2].longest;
  const c = last.longest;
  const span = n >= 3 ? 2 : 1;
  const growth = a > 0 ? Math.pow(c / (span === 2 ? a : b), 1 / span) : 1;
  const bounded = n >= 3 && a === b && b === c;
  const dimension = bounded ? 0 : Math.max(0, Math.log(growth) / Math.log(inflation));
  let kind: GrowthKind = 'bounded';
  if (!bounded) {
    const r1 = b / Math.max(1, a);
    const r2 = c / Math.max(1, b);
    kind = Math.max(r1, r2) / Math.max(1e-9, Math.min(r1, r2)) < 1.6 ? 'steady' : 'bursty';
  }
  return { levels, inflation, growth, dimension, kind };
}

/** Measure a rule at each of `levels`. */
export function measureScaling(
  family: TileFamilyId,
  root: TileTypeId,
  levels: readonly number[],
  subset: readonly number[],
  combo: string,
): Scaling {
  const matching = comboToMatchingIndices(family, subset, combo);
  return summarizeScaling(levels.map((lv) => levelStats(family, root, lv, subset, matching)));
}

/** How many non-crossing pairings each tile type has under a rule (at least 1). */
export function comboSizes(family: TileFamilyId, subset: readonly number[]): number[] {
  const sel = new Set(subset);
  return leafOrder(family).map((t) => Math.max(1, nonCrossingForTile(family, t, sel).length));
}

/**
 * Combination strings for a rule: every one when there are at most `limit`,
 * otherwise `limit` distinct ones drawn at random (`random` in [0, 1)).
 */
export function rulePairings(
  family: TileFamilyId,
  subset: readonly number[],
  limit: number,
  random: () => number = Math.random,
): { combos: string[]; total: number } {
  const sizes = comboSizes(family, subset);
  const total = sizes.reduce((x, y) => x * y, 1);
  const encode = (digits: readonly number[]) => digits.map((d) => comboDigitChar(d) ?? '0').join('');
  if (total <= limit) {
    const combos: string[] = [];
    for (let k = 0; k < total; k++) {
      let r = k;
      combos.push(encode(sizes.map((s) => {
        const d = r % s;
        r = Math.floor(r / s);
        return d;
      })));
    }
    return { combos, total };
  }
  const seen = new Set<string>();
  while (seen.size < limit) seen.add(encode(sizes.map((s) => Math.floor(random() * s))));
  return { combos: [...seen], total };
}
