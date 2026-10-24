/**
 * Curved strands: each chord bends as a cubic Bézier instead of cutting
 * straight across its tile.
 *
 * The curve leaves each end square to the edge it starts on: each end's
 * handle points along that edge's inward normal ({@link strandCurve}).
 * Abutting tiles' normals at a shared crossing are opposite, so the curve on
 * one side carries straight on into the curve on the other, and a strand runs
 * smoothly through every seam instead of kinking there. Two handles also give
 * an S-bend where a strand crosses between edges that face each other off
 * line, which no single bend can do square at both ends.
 *
 * Only the drawing changes. Tracing, welding, lengths and colours all keep the
 * straight chords, so a curved circuit is the same circuit; renderers either
 * emit `C` commands with the handles or, where only straight pieces can be
 * drawn (the infinite map's instanced lines), use {@link curvePieces}.
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

/**
 * The control point that bows chord a–b toward `centre`: the first curve, kept
 * as the fallback when the edges' normals don't meet in front of both ends.
 */
export function chordControl(a: Pt, b: Pt, centre: Pt): Pt {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return { x: mx + (centre.x - mx) * CURVE_PULL, y: my + (centre.y - my) * CURVE_PULL };
}

const normalCache = new Map<string, { pts: readonly Pt[]; inward: readonly Pt[] }>();

/** A leaf's outline with each edge's unit inward normal. */
function outline(family: TileFamilyId, type: TileTypeId): { pts: readonly Pt[]; inward: readonly Pt[] } {
  const key = `${family}:${type}`;
  const hit = normalCache.get(key);
  if (hit) return hit;
  const pts = leafPts(family, type);
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    area += p.x * q.y - q.x * p.y;
  }
  // Counter-clockwise (positive area): inside is to the left of each edge.
  const side = area > 0 ? 1 : -1;
  const inward = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    return { x: (-(q.y - p.y) / len) * side, y: ((q.x - p.x) / len) * side };
  });
  const out = { pts, inward };
  normalCache.set(key, out);
  return out;
}

/** Unit inward normal of the outline at a boundary point (averaged at a corner); null if p is not on it. */
export function inwardNormal(family: TileFamilyId, type: TileTypeId, p: Pt): Pt | null {
  const { pts, inward } = outline(family, type);
  let x = 0;
  let y = 0;
  let hits = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    if (Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y) > 1e-6) continue;
    x += inward[i].x;
    y += inward[i].y;
    hits++;
  }
  const len = Math.hypot(x, y);
  return hits && len > 1e-9 ? { x: x / len, y: y / len } : null;
}

/** A curve's handles, one per end of its chord (either order: see {@link orientCurve}). */
export interface StrandCurve {
  readonly c1: Pt;
  readonly c2: Pt;
}

/** Handle length as a share of the chord's length. */
export const HANDLE = 0.4;
/** Longest handle, so a long chord through a concave tile stays close to it. */
export const HANDLE_MAX = 0.6;

/**
 * The handles of chord a–b of a leaf (tile frame): from each end, along its
 * edge's inward normal (the mean of both edges' at a corner), {@link HANDLE}
 * of the chord's length, at most {@link HANDLE_MAX}. A point off the outline
 * falls back to the old single bend toward the centre.
 */
export function strandCurve(family: TileFamilyId, type: TileTypeId, a: Pt, b: Pt): StrandCurve {
  const na = inwardNormal(family, type, a);
  const nb = inwardNormal(family, type, b);
  if (!na || !nb) {
    const q = chordControl(a, b, leafCentre(family, type));
    return { c1: lerp(a, q, 2 / 3), c2: lerp(b, q, 2 / 3) };
  }
  const d = Math.min(HANDLE_MAX, HANDLE * Math.hypot(b.x - a.x, b.y - a.y));
  return { c1: { x: a.x + na.x * d, y: a.y + na.y * d }, c2: { x: b.x + nb.x * d, y: b.y + nb.y * d } };
}

const lerp = (p: Pt, q: Pt, t: number): Pt => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

/**
 * The handles in drawing order for a curve starting at `from`: each handle
 * sits next to its own end (nearer it than the other end's handle is, by at
 * least the chord's length minus both handles), so the nearer one goes first.
 */
export function orientCurve(c: StrandCurve, from: Pt): readonly [Pt, Pt] {
  const d1 = (c.c1.x - from.x) ** 2 + (c.c1.y - from.y) ** 2;
  const d2 = (c.c2.x - from.x) ** 2 + (c.c2.y - from.y) ** 2;
  return d1 <= d2 ? [c.c1, c.c2] : [c.c2, c.c1];
}

/** The point at t on the cubic a → b with handles h1 (at a) and h2 (at b). */
export function cubicAt(a: Pt, h1: Pt, h2: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return { x: w0 * a.x + w1 * h1.x + w2 * h2.x + w3 * b.x, y: w0 * a.y + w1 * h1.y + w2 * h2.y + w3 * b.y };
}

/** The curve a → b as `pieces` straight segments. */
export function curvePieces(a: Pt, b: Pt, c: StrandCurve, pieces = CURVE_PIECES): Segment[] {
  const [h1, h2] = orientCurve(c, a);
  const out: Segment[] = [];
  let prev = a;
  for (let i = 1; i <= pieces; i++) {
    const next = i === pieces ? b : cubicAt(a, h1, h2, b, i / pieces);
    out.push([prev, next]);
    prev = next;
  }
  return out;
}

/** A leaf type's chords, each bent square to its edges and broken into pieces. */
export function curvedChordPieces(
  family: TileFamilyId,
  type: TileTypeId,
  chords: readonly Segment[],
  pieces = CURVE_PIECES,
): Segment[] {
  return chords.flatMap(([a, b]) => curvePieces(a, b, strandCurve(family, type, a, b), pieces));
}
