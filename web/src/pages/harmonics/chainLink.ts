/**
 * Views of two members of a chain kept in step: a box in view in one
 * member's frame mapped to the other's through the supertile at its centre,
 * which has the same slot path in both. A supertile's outline starts at its
 * corner 0 (`CircuitShapes.outline`), so the two outlines give the
 * similarity between the frames: centre to centre, turned to carry corner 0
 * onto corner 0, scaled by the square root of the ratio of their areas,
 * mirrored when the two run opposite ways round.
 */
import type { Pt } from '../../core';
import type { Box } from '../../lib/viewport';
import type { Side, Supertile } from './pairView';

/** Whether a point is inside a closed outline (x, y pairs), by crossings of a ray. */
export function inside(xy: Float64Array, p: Pt): boolean {
  let hit = false;
  const n = xy.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = xy[2 * i], yi = xy[2 * i + 1], xj = xy[2 * j], yj = xy[2 * j + 1];
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const centre = (xy: Float64Array): Pt => {
  let x = 0, y = 0;
  const n = xy.length / 2;
  for (let i = 0; i < n; i++) {
    x += xy[2 * i];
    y += xy[2 * i + 1];
  }
  return { x: x / n, y: y / n };
};

const area = (xy: Float64Array): number => {
  let a = 0;
  const n = xy.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) a += xy[2 * j] * xy[2 * i + 1] - xy[2 * i] * xy[2 * j + 1];
  return a / 2;
};

/** The supertile drawn at a point, or the one whose centre is nearest. */
export function supertileAt(side: Side, p: Pt): Supertile | null {
  let best: Supertile | null = null, bestD = Infinity;
  for (const s of side.supertiles) {
    if (inside(s.outline, p)) return s;
    const c = centre(s.outline);
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bestD) { best = s; bestD = d; }
  }
  return best;
}

/** The similarity taking outline `a` onto outline `b`: centres matched, corner 0's direction matched, areas matched (mirrored when they run opposite ways). */
export function similarity(a: Float64Array, b: Float64Array): { map: (p: Pt) => Pt; scale: number } {
  const ca = centre(a), cb = centre(b);
  const flip = Math.sign(area(a)) !== Math.sign(area(b)) ? -1 : 1;
  const ax = a[0] - ca.x, ay = flip * (a[1] - ca.y), bx = b[0] - cb.x, by = b[1] - cb.y;
  const s = Math.sqrt(Math.abs(area(b) / (area(a) || 1)));
  const t = Math.atan2(by, bx) - Math.atan2(ay, ax);
  const cos = s * Math.cos(t), sin = s * Math.sin(t);
  const map = (p: Pt): Pt => {
    const x = p.x - ca.x, y = flip * (p.y - ca.y);
    return { x: cb.x + cos * x - sin * y, y: cb.y + sin * x + cos * y };
  };
  return { map, scale: s };
}

/**
 * A box in view in member `from` mapped to member `to` through the supertile
 * at its centre, by its slot path: its centre carried over, its size scaled
 * (the view keeps its shape; a turn between the frames shows as a turn of
 * the drawing). Null when `to` does not visit that supertile.
 */
export function linkBox(from: Side, to: Side, box: Box): Box | null {
  const c = { x: (box.min.x + box.max.x) / 2, y: (box.min.y + box.max.y) / 2 };
  const here = supertileAt(from, c);
  const there = here && to.supertiles.find((s) => s.path === here.path);
  if (!here || !there) return null;
  const { map, scale } = similarity(here.outline, there.outline);
  const m = map(c);
  const w = ((box.max.x - box.min.x) * scale) / 2, h = ((box.max.y - box.min.y) * scale) / 2;
  return { min: { x: m.x - w, y: m.y - h }, max: { x: m.x + w, y: m.y + h } };
}
