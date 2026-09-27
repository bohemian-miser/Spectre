/**
 * Zoom and pan maths for the Classifications scatter, kept free of the DOM so
 * it can be tested on its own.
 *
 * A view is the window of the plot in unit coordinates: each field's value on
 * its plotting scale mapped to 0..1 (see `fieldUnit`). x grows to the right and
 * y grows upwards, as on the plot.
 */

export interface View {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

export interface ViewLimits {
  /** The furthest the view may reach; zooming out stops when it covers this. */
  readonly bounds: View;
  /** Smallest span on either axis, in unit coordinates. */
  readonly minSpan: number;
}

/** About one quantisation bin: zooming further only magnifies the jitter. */
export const MIN_SPAN = 1 / 256;

export function unionView(a: View, b: View): View {
  return {
    x0: Math.min(a.x0, b.x0),
    x1: Math.max(a.x1, b.x1),
    y0: Math.min(a.y0, b.y0),
    y1: Math.max(a.y1, b.y1),
  };
}

function clampAxis(a0: number, a1: number, b0: number, b1: number, minSpan: number): [number, number] {
  const maxSpan = b1 - b0;
  const span = Math.min(maxSpan, Math.max(Math.min(minSpan, maxSpan), a1 - a0));
  let lo = (a0 + a1) / 2 - span / 2;
  if (lo < b0) lo = b0;
  if (lo + span > b1) lo = b1 - span;
  return [lo, lo + span];
}

/** Keep a view inside the bounds and between the smallest and largest span. */
export function clampView(v: View, limits: ViewLimits): View {
  const b = limits.bounds;
  const [x0, x1] = clampAxis(v.x0, v.x1, b.x0, b.x1, limits.minSpan);
  const [y0, y1] = clampAxis(v.y0, v.y1, b.y0, b.y1, limits.minSpan);
  return { x0, x1, y0, y1 };
}

/**
 * Zoom by `factor` (above 1 zooms in) about a point given as fractions of the
 * plot: `fx` from the left edge, `fy` from the bottom edge. The point under
 * the pointer stays under the pointer unless the limits stop it.
 */
export function zoomAt(v: View, fx: number, fy: number, factor: number, limits: ViewLimits): View {
  const sx = v.x1 - v.x0;
  const sy = v.y1 - v.y0;
  const b = limits.bounds;
  const nsx = Math.min(b.x1 - b.x0, Math.max(limits.minSpan, sx / factor));
  const nsy = Math.min(b.y1 - b.y0, Math.max(limits.minSpan, sy / factor));
  const px = v.x0 + fx * sx;
  const py = v.y0 + fy * sy;
  const x0 = px - fx * nsx;
  const y0 = py - fy * nsy;
  return clampView({ x0, x1: x0 + nsx, y0, y1: y0 + nsy }, limits);
}

/**
 * Pan so the content follows the pointer: `dx` and `dy` are the pointer's move
 * as fractions of the plot's width and height, in screen directions (right
 * and down are positive).
 */
export function panBy(v: View, dx: number, dy: number, limits: ViewLimits): View {
  const sx = v.x1 - v.x0;
  const sy = v.y1 - v.y0;
  return clampView(
    { x0: v.x0 - dx * sx, x1: v.x1 - dx * sx, y0: v.y0 + dy * sy, y1: v.y1 + dy * sy },
    limits,
  );
}

/**
 * Two-finger pinch: zoom the view the gesture started from by the change in
 * finger distance, about where the fingers started, then pan by how far their
 * midpoint has moved. Positions are CSS px within the plot area.
 */
export function pinchView(
  start: View,
  mid0: readonly [number, number],
  mid: readonly [number, number],
  dist0: number,
  dist: number,
  pw: number,
  ph: number,
  limits: ViewLimits,
): View {
  const factor = dist0 > 0 ? dist / dist0 : 1;
  const zoomed = zoomAt(start, mid0[0] / pw, 1 - mid0[1] / ph, factor, limits);
  return panBy(zoomed, (mid[0] - mid0[0]) / pw, (mid[1] - mid0[1]) / ph, limits);
}

/** Zoom factor for one wheel event: smooth for trackpads, a step per mouse notch. */
export function wheelFactor(deltaY: number, deltaMode: number, pageHeight: number): number {
  const px = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * pageHeight : deltaY;
  const clamped = Math.max(-200, Math.min(200, px));
  return Math.exp(-clamped * 0.002);
}

export function sameView(a: View, b: View, eps = 1e-6): boolean {
  return (
    Math.abs(a.x0 - b.x0) < eps &&
    Math.abs(a.x1 - b.x1) < eps &&
    Math.abs(a.y0 - b.y0) < eps &&
    Math.abs(a.y1 - b.y1) < eps
  );
}

/** Unit coordinates to CSS px within a plot area of pw x ph. */
export function toPlot(v: View, u: number, w: number, pw: number, ph: number): [number, number] {
  return [((u - v.x0) / (v.x1 - v.x0)) * pw, ((v.y1 - w) / (v.y1 - v.y0)) * ph];
}

/** CSS px within the plot area back to unit coordinates. */
export function fromPlot(v: View, x: number, y: number, pw: number, ph: number): [number, number] {
  return [v.x0 + (x / pw) * (v.x1 - v.x0), v.y1 - (y / ph) * (v.y1 - v.y0)];
}

/**
 * The CSS transform (origin at the plot area's top-left) that moves a bitmap
 * drawn for view `drawn` to where view `live` would put its dots. Used during a
 * gesture, so the expensive redraw waits until the gesture settles.
 */
export function previewTransform(
  drawn: View,
  live: View,
  pw: number,
  ph: number,
): { sx: number; sy: number; tx: number; ty: number } {
  const sx = (drawn.x1 - drawn.x0) / (live.x1 - live.x0);
  const sy = (drawn.y1 - drawn.y0) / (live.y1 - live.y0);
  const tx = ((drawn.x0 - live.x0) / (live.x1 - live.x0)) * pw;
  const ty = ((live.y1 - drawn.y1) / (live.y1 - live.y0)) * ph;
  return { sx, sy, tx, ty };
}
