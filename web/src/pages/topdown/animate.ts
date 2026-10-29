/**
 * The substitution step as an animation, in the new board's coordinates.
 *
 * The old board is drawn enlarged by the similarity that best carries each
 * substituted tile's centre onto its supertile's centre (least squares; it
 * mirrors, since each level mirrors the one below). Each tile then fades into
 * its supertile, which first appears centred where the enlarged tile was, and
 * finally slides by its own small offset to the place the rule puts it. The
 * offsets differ from tile to tile, which is why no scaling of the old board
 * lands every supertile in place.
 *
 * Tiles are replaced one after another in a sweep across the board. Pure —
 * the floats here only position a picture; the boards themselves are exact.
 */

import { mul, type Affine, type Pt } from '../../core';
import type { DrawTile } from './board';
import { parentId } from '../../core';

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

export interface ParentPlan {
  /** Slot path of the old tile (and parent of its supertile's tiles). */
  readonly id: string;
  /** When this tile's replacement starts, as a fraction of the whole step. */
  readonly start: number;
  /** Supertile position minus enlarged old tile position. */
  readonly offset: Pt;
}

export interface StepPlan {
  /** Old board coordinates to new board coordinates. */
  readonly enlarge: Affine;
  readonly parents: readonly ParentPlan[];
}

/** Share of the step one tile's replacement takes; the starts spread over the rest. */
export const TILE_SPAN = 0.55;
/** Within one tile's span: the fade, then the slide. */
const FADE = 0.45;

export function planStep(previous: readonly DrawTile[], next: readonly DrawTile[]): StepPlan {
  const sums = new Map<string, { x: number; y: number; n: number }>();
  for (const t of next) {
    const pid = parentId(t.id);
    const s = sums.get(pid) ?? { x: 0, y: 0, n: 0 };
    s.x += t.centre.x;
    s.y += t.centre.y;
    s.n++;
    sums.set(pid, s);
  }
  const old = previous.filter((t) => sums.has(t.id));
  const pairs = old.map((t) => {
    const s = sums.get(t.id)!;
    return { from: t.centre, to: { x: s.x / s.n, y: s.y / s.n } };
  });
  const sim = fitSimilarity(pairs);
  const placed = pairs.map((q) => applySimilarity(sim, q.from));
  // sweep from left to right across the enlarged board
  const order = old.map((_, i) => i).sort((i, j) => placed[i].x - placed[j].x || placed[i].y - placed[j].y);
  const rank = new Map(order.map((i, r) => [i, r]));
  const last = Math.max(1, old.length - 1);
  return {
    enlarge: similarityAffine(sim),
    parents: old.map((t, i) => ({
      id: t.id,
      start: ((1 - TILE_SPAN) * rank.get(i)!) / last,
      offset: { x: pairs[i].to.x - placed[i].x, y: pairs[i].to.y - placed[i].y },
    })),
  };
}

const ease = (u: number): number => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));
const clamp = (u: number): number => Math.min(1, Math.max(0, u));

/** One tile's state at step progress `t` in [0, 1]: supertile opacity, and how much of the offset remains. */
export function tileFrame(start: number, t: number): { shown: number; remaining: number } {
  const u = clamp((t - start) / TILE_SPAN);
  return { shown: ease(clamp(u / FADE)), remaining: 1 - ease(clamp((u - FADE) / (1 - FADE))) };
}

/** An old leaf's transform in the new board's coordinates. */
export function enlarged(plan: StepPlan, xform: Affine): Affine {
  return mul(plan.enlarge, xform);
}
