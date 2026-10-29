/**
 * Similarities, and the timing of a substitution as an animation.
 *
 * A substituted tile fades into its supertile cluster, drawn first centred
 * where the tile was, and the cluster then slides by its own offset to its
 * place. Pure — the floats here only position a picture; the tiles
 * themselves are exact.
 */

import type { Affine, Pt } from '../../core';

/** `sqrt(4 + sqrt(15))`, the linear inflation, for a step from a single tile. */
const INFLATION = Math.sqrt(4 + Math.sqrt(15));

/** `z -> a z + b`, or `z -> a conj(z) + b` when mirrored, in complex form. */
export interface Similarity {
  readonly a: Pt;
  readonly b: Pt;
  readonly mirror: boolean;
}

export function applySimilarity(s: Similarity, p: Pt): Pt {
  const y = s.mirror ? -p.y : p.y;
  return { x: s.a.x * p.x - s.a.y * y + s.b.x, y: s.a.y * p.x + s.a.x * y + s.b.y };
}

export function similarityAffine(s: Similarity): Affine {
  const m = s.mirror ? -1 : 1;
  return [s.a.x, -s.a.y * m, s.b.x, s.a.y, s.a.x * m, s.b.y];
}

/** Least-squares similarity carrying each `from` onto its `to`, mirrored or not, whichever fits better. */
export function fitSimilarity(pairs: readonly { from: Pt; to: Pt }[]): Similarity {
  const n = pairs.length;
  const mean = (f: (q: { from: Pt; to: Pt }) => Pt): Pt => {
    let x = 0;
    let y = 0;
    for (const q of pairs) {
      const p = f(q);
      x += p.x;
      y += p.y;
    }
    return { x: x / n, y: y / n };
  };
  const fit = (mirror: boolean): { s: Similarity; err: number } => {
    const src = (q: { from: Pt }): Pt => (mirror ? { x: q.from.x, y: -q.from.y } : q.from);
    const zc = mean(src);
    const wc = mean((q) => q.to);
    let nx = 0;
    let ny = 0;
    let den = 0;
    for (const q of pairs) {
      const z = src(q);
      const zx = z.x - zc.x;
      const zy = z.y - zc.y;
      const wx = q.to.x - wc.x;
      const wy = q.to.y - wc.y;
      // w * conj(z)
      nx += wx * zx + wy * zy;
      ny += wy * zx - wx * zy;
      den += zx * zx + zy * zy;
    }
    const a = den > 0 ? { x: nx / den, y: ny / den } : { x: INFLATION, y: 0 };
    const b = { x: wc.x - (a.x * zc.x - a.y * zc.y), y: wc.y - (a.y * zc.x + a.x * zc.y) };
    const s: Similarity = { a, b, mirror };
    let err = 0;
    for (const q of pairs) {
      const p = applySimilarity(s, q.from);
      err += (p.x - q.to.x) ** 2 + (p.y - q.to.y) ** 2;
    }
    return { s, err };
  };
  if (n < 2) return fit(true).s;
  const plain = fit(false);
  const mirrored = fit(true);
  return mirrored.err <= plain.err ? mirrored.s : plain.s;
}

/** Share of a batch one cluster's change takes; the starts spread over the rest. */
export const TILE_SPAN = 0.55;
/** Within one cluster's span: the fade, then the slide. */
const FADE = 0.45;

export interface ClusterPlan {
  /** Slot path of the tile the cluster replaces. */
  readonly id: string;
  /** When this cluster's change starts, as a fraction of the batch. */
  readonly start: number;
  /** From where the cluster is drawn in place of its tile to its own place. */
  readonly offset: Pt;
}

/**
 * Each cluster first appears centred on the tile it replaces, then slides by
 * `offset` to where it belongs; clusters change one after another in a sweep
 * from left to right.
 */
export function planClusters(
  clusters: readonly { readonly id: string; readonly tileCentre: Pt; readonly clusterCentre: Pt }[],
): ClusterPlan[] {
  const order = clusters
    .map((_, i) => i)
    .sort((i, j) => clusters[i].tileCentre.x - clusters[j].tileCentre.x || clusters[i].tileCentre.y - clusters[j].tileCentre.y);
  const rank = new Map(order.map((i, r) => [i, r]));
  const last = Math.max(1, clusters.length - 1);
  return clusters.map((c, i) => ({
    id: c.id,
    start: ((1 - TILE_SPAN) * rank.get(i)!) / last,
    offset: { x: c.tileCentre.x - c.clusterCentre.x, y: c.tileCentre.y - c.clusterCentre.y },
  }));
}

const ease = (u: number): number => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));
const clamp = (u: number): number => Math.min(1, Math.max(0, u));

/** One cluster at batch progress `t` in [0, 1]: its opacity, and how much of the offset remains. */
export function tileFrame(start: number, t: number): { shown: number; remaining: number } {
  const u = clamp((t - start) / TILE_SPAN);
  return { shown: ease(clamp(u / FADE)), remaining: 1 - ease(clamp((u - FADE) / (1 - FADE))) };
}
