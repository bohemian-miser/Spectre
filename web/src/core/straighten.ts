/**
 * Straightening seams, level by level, in a patch of supertiles.
 *
 * The patch is a level-(n+2) Delta supertile cut into its level-n
 * supertiles (the pieces). Each piece's outline is a run of leaf edges, and
 * each stretch of it between two **corners** (points where three or more
 * regions meet) is one seam, shared with the neighbour on the other side.
 * Round r replaces every seam between two level-(r−1) supertiles by one
 * straight edge: round 1 straightens the seams between tiles, round n+1 the
 * seams between the pieces themselves.
 *
 * A vertex is a level-k corner when, walking the outline through it, the
 * level-k supertile inside or the one outside changes. Corners at level k
 * are corners at every level below, so each vertex carries one number, the
 * highest level it is a corner at (−1 for a vertex on a single seam between
 * two tiles). Round r keeps the vertices at r − 1 or higher and moves every
 * other one onto the chord between the kept vertices either side of it, at
 * the same fraction of the way along. A seam has the same vertices and the
 * same corners from both sides, so the two pieces sharing it move it the
 * same way and never overlap. Outside the patch counts as one region.
 *
 * Corners and the patch are exact (`exact.ts`); only the positions of the
 * rounds after the first are floats.
 */

import { zApply, zKey, zMul, zSupertileTransforms, zToPt, type ZAffine, type ZVec } from './exact';
import type { TileFamilyId, TileTypeId } from './families';
import type { Pt } from './geom';
import { supertileOutline } from './limitShape';
import { SUPER_RULES } from './tiles';

export interface StraightenPiece {
  /** Slot path of the piece from the patch's root. */
  readonly id: string;
  readonly type: TileTypeId;
  /** Outline vertices in the patch's frame; vertex k starts edge k. */
  readonly pts: readonly ZVec[];
  /** Per vertex, the highest level it is a corner at, or −1. */
  readonly corner: Int8Array;
  /** No edge of the outline is on the patch's boundary. */
  readonly interior: boolean;
}

export interface StraightenPatch {
  readonly family: TileFamilyId;
  /** Level of the pieces; the patch is level + 2. */
  readonly level: number;
  readonly pieces: readonly StraightenPiece[];
}

/** Length of the common prefix of two slot paths. */
function common(a: readonly number[], b: readonly number[]): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * The patch of level-`level` pieces in a level-(level+2) Delta supertile,
 * with each outline vertex's corner level.
 */
export function straightenPatch(family: TileFamilyId, level: number): StraightenPatch {
  const top = level + 2;
  const T1 = zSupertileTransforms(family, top);
  const T2 = zSupertileTransforms(family, top - 1);
  const placed: { id: string; slots: number[]; type: TileTypeId; T: ZAffine }[] = [];
  for (let a = 0; a < 8; a++) {
    const child = SUPER_RULES.Delta[a];
    for (let b = 0; b < 8; b++) {
      const type = SUPER_RULES[child][b];
      if (type === 'null') continue;
      placed.push({ id: `${a}.${b}`, slots: [a, b], type: type as TileTypeId, T: zMul(T1[a], T2[b]) });
    }
  }

  // Each directed leaf edge of every outline, keyed, with the slot path of
  // its leaf from the root (the Mystic's half digit dropped: one tile).
  const leafOf = new Map<string, number[]>();
  const outlines = placed.map((p) => {
    const edges = supertileOutline(family, level, p.type === 'Gamma').map((e) => {
      const from = zApply(p.T, e.from);
      const to = zApply(p.T, e.to);
      const slots = [...p.slots, ...(e.id === '' ? [] : e.id.split('.').map(Number))].slice(0, top);
      leafOf.set(`${zKey(from)}>${zKey(to)}`, slots);
      return { from, to, slots };
    });
    return edges;
  });

  const pieces = placed.map((p, i): StraightenPiece => {
    const edges = outlines[i];
    const outside = edges.map((e) => leafOf.get(`${zKey(e.to)}>${zKey(e.from)}`) ?? null);
    const corner = new Int8Array(edges.length);
    edges.forEach((e, k) => {
      const j = (k - 1 + edges.length) % edges.length;
      // The shortest prefix at which the region inside or outside changes.
      let m = common(edges[j].slots, e.slots);
      const oa = outside[j];
      const ob = outside[k];
      if (oa && ob) m = Math.min(m, common(oa, ob));
      else if (oa || ob) m = 0;
      // A change at prefix length m + 1 is a change of level-k supertile for top − k > m.
      corner[k] = Math.min(level, top - m - 1);
    });
    return { id: p.id, type: p.type, pts: edges.map((e) => e.from), corner, interior: outside.every((o) => o !== null) };
  });
  return { family, level, pieces };
}

/**
 * A piece's outline after each round, x/y interleaved: entry r is round r,
 * from 0 (the leaves' outline) to `level + 1` (seams between the pieces
 * straight).
 */
export function straightenRounds(piece: StraightenPiece, level: number): Float64Array[] {
  const n = piece.pts.length;
  const start = new Float64Array(2 * n);
  piece.pts.forEach((p, k) => {
    const q = zToPt(p);
    start[2 * k] = q.x;
    start[2 * k + 1] = q.y;
  });
  const out = [start];
  for (let r = 1; r <= level + 1; r++) {
    const prev = out[r - 1];
    const next = Float64Array.from(prev);
    const kept: number[] = [];
    for (let k = 0; k < n; k++) if (piece.corner[k] >= r - 1) kept.push(k);
    for (let q = 0; q < kept.length; q++) {
      const a = kept[q];
      const b = kept[(q + 1) % kept.length];
      const run = kept.length === 1 ? n : (b - a + n) % n;
      // Arc length along the previous round, a to b.
      const at = [0];
      for (let s = 1; s <= run; s++) {
        const u = (a + s - 1) % n;
        const v = (a + s) % n;
        at.push(at[s - 1] + Math.hypot(prev[2 * v] - prev[2 * u], prev[2 * v + 1] - prev[2 * u + 1]));
      }
      const total = at[run];
      for (let s = 1; s < run; s++) {
        const v = (a + s) % n;
        const t = total === 0 ? 0 : at[s] / total;
        next[2 * v] = prev[2 * a] + (prev[2 * b] - prev[2 * a]) * t;
        next[2 * v + 1] = prev[2 * a + 1] + (prev[2 * b + 1] - prev[2 * a + 1]) * t;
      }
    }
    out.push(next);
  }
  return out;
}

/** A piece's corners at its own level: the vertices of its last round. */
export function pieceCorners(piece: StraightenPiece, level: number): Pt[] {
  return piece.pts.filter((_, k) => piece.corner[k] >= level).map(zToPt);
}
