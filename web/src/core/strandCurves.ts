/**
 * Curved strands: each chord bows toward its tile's centre as a quadratic
 * Bézier, instead of cutting straight across.
 *
 * Only the drawing changes. Tracing, welding, lengths and colours all keep the
 * straight chords, so a curved circuit is the same circuit; renderers either
 * emit `Q` commands with {@link chordControl} or, where only straight pieces
 * can be drawn (the infinite map's instanced lines), use {@link curvePieces}.
 */

import { leafPts, type TileFamilyId, type TileTypeId } from './families';
import type { Pt } from './geom';
import type { Segment } from './circuits';

/** How far the control point sits from the chord's midpoint toward the centre. */
export const CURVE_PULL = 0.6;

/** Straight pieces per curve where a renderer can only draw lines. */
export const CURVE_PIECES = 8;

const centreCache = new Map<string, Pt>();

/** A leaf tile's centre in its own frame: the mean of its outline's corners. */
export function leafCentre(family: TileFamilyId, type: TileTypeId): Pt {
  const key = `${family}:${type}`;
  const hit = centreCache.get(key);
  if (hit) return hit;
  const pts = leafPts(family, type);
  const c = { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
  centreCache.set(key, c);
  return c;
}

/** The control point that bows chord a–b toward `centre`. */
export function chordControl(a: Pt, b: Pt, centre: Pt): Pt {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return { x: mx + (centre.x - mx) * CURVE_PULL, y: my + (centre.y - my) * CURVE_PULL };
}

/** The quadratic a → b with control c, as `pieces` straight segments. */
export function curvePieces(a: Pt, b: Pt, c: Pt, pieces = CURVE_PIECES): Segment[] {
  const at = (t: number): Pt => {
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  };
  const out: Segment[] = [];
  let prev = a;
  for (let i = 1; i <= pieces; i++) {
    const next = i === pieces ? b : at(i / pieces);
    out.push([prev, next]);
    prev = next;
  }
  return out;
}

/** A leaf type's chords, each bowed toward its centre and broken into pieces. */
export function curvedChordPieces(
  family: TileFamilyId,
  type: TileTypeId,
  chords: readonly Segment[],
  pieces = CURVE_PIECES,
): Segment[] {
  const centre = leafCentre(family, type);
  return chords.flatMap(([a, b]) => curvePieces(a, b, chordControl(a, b, centre), pieces));
}
