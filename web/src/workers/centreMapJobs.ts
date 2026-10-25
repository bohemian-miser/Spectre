/**
 * The pure half of the centre-map worker, shared with the synchronous
 * fallback: the chamfer matrix (`core/centreMap.ts`) and a UMAP layout of
 * its rows.
 */

import { UMAP } from 'umap-js';
import { centreMap, comboDigits, leafOrder, type TileFamilyId } from '../core';

export interface CentreMapJob {
  readonly family: TileFamilyId;
  readonly level: number;
  readonly rules: readonly { readonly subset: readonly number[]; readonly combos: readonly string[] }[];
  readonly matchSizes: boolean;
  readonly weightBySize: boolean;
}

export interface CentreMapResult {
  readonly level: number;
  readonly counts: readonly { readonly all: number; readonly inside: number }[];
  /** Directed chamfer A → B, row-major, world units. */
  readonly matrix: Float32Array;
  /** UMAP of the matrix rows: x, y per pairing. */
  readonly embedding: Float32Array;
}

export type CentreMapPhase = 'centres' | 'distances' | 'layout';

export function runCentreMap(job: CentreMapJob, onProgress?: (phase: CentreMapPhase, done: number, total: number) => void): CentreMapResult {
  const types = leafOrder(job.family).length;
  const map = centreMap(
    job.family,
    job.level,
    job.rules.map((r) => ({ subset: r.subset, combos: r.combos.map((c) => comboDigits(c, types)) })),
    { matchSizes: job.matchSizes, weightBySize: job.weightBySize },
    onProgress,
  );
  onProgress?.('layout', 0, 1);
  return { level: map.level, counts: map.counts, matrix: map.matrix, embedding: layoutRows(map.matrix, map.counts.length) };
}

/**
 * A 2-D UMAP of the matrix rows (each pairing as its distances to all the
 * others, log-scaled so the many small distances aren't flattened by a few
 * big ones). Seeded, so the same survey lays out the same way.
 */
export function layoutRows(matrix: Float32Array, n: number): Float32Array {
  const out = new Float32Array(n * 2);
  if (n < 3) return out;
  let max = 0;
  for (const v of matrix) if (Number.isFinite(v) && v > max) max = v;
  const rows = Array.from({ length: n }, (_, a) =>
    Array.from({ length: n }, (_, b) => {
      const v = matrix[a * n + b];
      return Math.log1p(Number.isFinite(v) ? v : max);
    }),
  );
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const umap = new UMAP({ nComponents: 2, nNeighbors: Math.min(15, n - 1), minDist: 0.1, random });
  const xy = umap.fit(rows);
  xy.forEach(([x, y], i) => {
    out[i * 2] = x;
    out[i * 2 + 1] = y;
  });
  return out;
}
