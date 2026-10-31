/**
 * What the Straightening section draws for one level: every piece's outline
 * after each round, and the interior pieces' last round laid over the
 * limit's key points. Pure; `straighten.worker.ts` runs it.
 */

import { zToPt } from '../../core/exact';
import type { TileFamilyId, TileTypeId } from '../../core/families';
import { transPt } from '../../core/geom';
import { familyGeometry, levelQuad, limitFrame, supertileOutline } from '../../core/limitShape';
import { straightenPatch, straightenRounds } from '../../core/straighten';

export interface StraightenLevel {
  readonly family: TileFamilyId;
  readonly level: number;
  readonly pieces: readonly {
    readonly id: string;
    readonly type: TileTypeId;
    readonly interior: boolean;
    /** Round 0 to level + 1, x/y interleaved. */
    readonly rounds: readonly Float64Array[];
  }[];
  /** Vertices kept by each round, over all pieces. */
  readonly kept: readonly number[];
  /** The interior pieces' corners, each in the limit's frame, one entry per distinct shape. */
  readonly shapes: readonly { readonly gamma: boolean; readonly count: number; readonly pts: Float64Array }[];
  /** Corners per interior piece, and how many pieces have that many. */
  readonly cornerCounts: readonly [number, number][];
}

export function computeStraighten(family: TileFamilyId, level: number): StraightenLevel {
  const patch = straightenPatch(family, level);
  const F = limitFrame(levelQuad(familyGeometry(family), level));
  const kept = Array.from({ length: level + 2 }, (_, r) =>
    patch.pieces.reduce((s, p) => s + (r === 0 ? p.corner.length : p.corner.filter((c) => c >= r - 1).length), 0),
  );
  const shapes = new Map<string, { gamma: boolean; count: number; pts: Float64Array }>();
  const counts = new Map<number, number>();
  for (const p of patch.pieces) {
    if (!p.interior) continue;
    const gamma = p.type === 'Gamma';
    const local = supertileOutline(family, level, gamma);
    const pts = local.flatMap((e, k) => (p.corner[k] >= level ? [transPt(F, zToPt(e.from))] : []));
    counts.set(pts.length, (counts.get(pts.length) ?? 0) + 1);
    const key = `${gamma}:${pts.map((q) => `${q.x.toFixed(6)},${q.y.toFixed(6)}`).join(' ')}`;
    const hit = shapes.get(key);
    if (hit) hit.count++;
    else shapes.set(key, { gamma, count: 1, pts: Float64Array.from(pts.flatMap((q) => [q.x, q.y])) });
  }
  return {
    family,
    level,
    pieces: patch.pieces.map((p) => ({ id: p.id, type: p.type, interior: p.interior, rounds: straightenRounds(p, level) })),
    kept,
    shapes: [...shapes.values()],
    cornerCounts: [...counts.entries()].sort((a, b) => a[0] - b[0]),
  };
}
