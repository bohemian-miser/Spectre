/**
 * A polyline with the points that do not change its shape at a tolerance
 * left out (Douglas and Peucker, 1973: the points farthest from the chord
 * between two kept points are kept first, until every point left out is
 * within the tolerance of the line through the kept ones). The first and
 * last points are always kept, so a closed line stays closed.
 */

/** `pts` as x, y pairs; `tolerance` in the same units. */
export function simplify(pts: Float64Array, tolerance: number): Float64Array {
  const n = pts.length / 2;
  if (n <= 2 || tolerance <= 0) return pts;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const tol2 = tolerance * tolerance;
  const stack: number[] = [0, n - 1];
  while (stack.length) {
    const b = stack.pop()!;
    const a = stack.pop()!;
    if (b - a < 2) continue;
    const ax = pts[2 * a], ay = pts[2 * a + 1];
    const dx = pts[2 * b] - ax, dy = pts[2 * b + 1] - ay;
    const len2 = dx * dx + dy * dy;
    let far = -1;
    let best = tol2;
    for (let i = a + 1; i < b; i++) {
      const px = pts[2 * i] - ax, py = pts[2 * i + 1] - ay;
      let d2: number;
      if (len2 === 0) d2 = px * px + py * py;
      else {
        const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
        const ex = px - t * dx, ey = py - t * dy;
        d2 = ex * ex + ey * ey;
      }
      if (d2 > best) {
        best = d2;
        far = i;
      }
    }
    if (far < 0) continue;
    keep[far] = 1;
    stack.push(a, far, far, b);
  }
  let count = 0;
  for (let i = 0; i < n; i++) count += keep[i];
  const out = new Float64Array(2 * count);
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (!keep[i]) continue;
    out[j++] = pts[2 * i];
    out[j++] = pts[2 * i + 1];
  }
  return out;
}

/** The longer side of the points' bounding box. */
export function spanOf(pts: Float64Array): number {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i]);
    x1 = Math.max(x1, pts[i]);
    y0 = Math.min(y0, pts[i + 1]);
    y1 = Math.max(y1, pts[i + 1]);
  }
  return Math.max(x1 - x0, y1 - y0);
}
