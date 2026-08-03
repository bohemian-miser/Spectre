/**
 * Camera / viewport math for the pan-zoom widgets (DESIGN.md §5.4).
 *
 * Pure and DOM-free so the invariants (zoom-to-cursor, fit-to-bounds, pinch)
 * are unit-testable without a browser. React components in `components/` and
 * `hooks/` consume these functions; nothing here touches `window`.
 *
 * Convention: `screen = world * scale + (x, y)`, i.e. the camera is the affine
 * `[scale 0 x / 0 scale y]`. Matches the `cam=x,y,scale` URL parameter (§9.2).
 */

import type { Affine, Pt } from '../core';

export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface Box {
  readonly min: Pt;
  readonly max: Pt;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface ScaleLimits {
  readonly minScale?: number;
  readonly maxScale?: number;
}

export const MIN_SCALE = 0.01;
export const MAX_SCALE = 5000;

export const IDENTITY_CAMERA: Camera = Object.freeze({ x: 0, y: 0, scale: 1 });

export function clampScale(scale: number, limits: ScaleLimits = {}): number {
  const lo = limits.minScale ?? MIN_SCALE;
  const hi = limits.maxScale ?? MAX_SCALE;
  if (!Number.isFinite(scale) || scale <= 0) return lo;
  return Math.max(lo, Math.min(hi, scale));
}

/** The camera as a row-major `Affine`, ready for `svgMatrixString`. */
export function cameraAffine(cam: Camera): Affine {
  return [cam.scale, 0, cam.x, 0, cam.scale, cam.y];
}

export function worldToScreen(cam: Camera, p: Pt): Pt {
  return { x: p.x * cam.scale + cam.x, y: p.y * cam.scale + cam.y };
}

export function screenToWorld(cam: Camera, p: Pt): Pt {
  return { x: (p.x - cam.x) / cam.scale, y: (p.y - cam.y) / cam.scale };
}

/**
 * Set an absolute scale while keeping the world point currently under
 * `anchor` (screen coordinates) pinned to that same screen position.
 */
export function zoomTo(
  cam: Camera,
  anchor: Pt,
  nextScale: number,
  limits: ScaleLimits = {},
): Camera {
  const scale = clampScale(nextScale, limits);
  const w = screenToWorld(cam, anchor);
  return { scale, x: anchor.x - w.x * scale, y: anchor.y - w.y * scale };
}

/** Multiply the scale by `factor` about `anchor`. */
export function zoomBy(cam: Camera, anchor: Pt, factor: number, limits: ScaleLimits = {}): Camera {
  if (!Number.isFinite(factor) || factor <= 0) return cam;
  return zoomTo(cam, anchor, cam.scale * factor, limits);
}

export interface WheelZoomOptions extends ScaleLimits {
  /** Exponential sensitivity; 0.0015 ≈ 1.15× per notch of a typical mouse. */
  readonly intensity?: number;
}

/**
 * Wheel handler math, replicating the old `sketch.ts p.mouseWheel` behaviour
 * (zoom about the cursor). `deltaY > 0` (scroll down) zooms out.
 */
export function wheelZoom(
  cam: Camera,
  anchor: Pt,
  deltaY: number,
  opts: WheelZoomOptions = {},
): Camera {
  const intensity = opts.intensity ?? 0.0015;
  // Clamp the delta so a single trackpad fling cannot jump several decades.
  const d = Math.max(-600, Math.min(600, Number.isFinite(deltaY) ? deltaY : 0));
  return zoomBy(cam, anchor, Math.exp(-d * intensity), opts);
}

export function panBy(cam: Camera, dx: number, dy: number): Camera {
  return { ...cam, x: cam.x + dx, y: cam.y + dy };
}

/** Move the camera so `world` lands on `screen`. */
export function panWorldTo(cam: Camera, world: Pt, screen: Pt): Camera {
  return { ...cam, x: screen.x - world.x * cam.scale, y: screen.y - world.y * cam.scale };
}

// ---------------------------------------------------------------------------
// Boxes
// ---------------------------------------------------------------------------

export const EMPTY_BOX: Box = Object.freeze({
  min: Object.freeze({ x: Infinity, y: Infinity }),
  max: Object.freeze({ x: -Infinity, y: -Infinity }),
});

export function isEmptyBox(b: Box): boolean {
  return !(Number.isFinite(b.min.x) && Number.isFinite(b.max.x)) || b.max.x < b.min.x;
}

export function boxOfPoints(pts: readonly Pt[]): Box {
  if (pts.length === 0) return EMPTY_BOX;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

export function unionBox(a: Box, b: Box): Box {
  if (isEmptyBox(a)) return b;
  if (isEmptyBox(b)) return a;
  return {
    min: { x: Math.min(a.min.x, b.min.x), y: Math.min(a.min.y, b.min.y) },
    max: { x: Math.max(a.max.x, b.max.x), y: Math.max(a.max.y, b.max.y) },
  };
}

/** Grow a box by an absolute world-unit margin. */
export function expandBox(b: Box, margin: number): Box {
  if (isEmptyBox(b)) return b;
  return {
    min: { x: b.min.x - margin, y: b.min.y - margin },
    max: { x: b.max.x + margin, y: b.max.y + margin },
  };
}

export function boxCenter(b: Box): Pt {
  return { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2 };
}

export function boxSize(b: Box): Size {
  return { width: b.max.x - b.min.x, height: b.max.y - b.min.y };
}

/** Transform a box by an affine (returns the AABB of the transformed corners). */
export function transformBox(m: Affine, b: Box): Box {
  if (isEmptyBox(b)) return b;
  const corners: Pt[] = [
    { x: b.min.x, y: b.min.y },
    { x: b.max.x, y: b.min.y },
    { x: b.max.x, y: b.max.y },
    { x: b.min.x, y: b.max.y },
  ].map((p) => ({ x: m[0] * p.x + m[1] * p.y + m[2], y: m[3] * p.x + m[4] * p.y + m[5] }));
  return boxOfPoints(corners);
}

export interface FitOptions extends ScaleLimits {
  /** Fraction of the viewport left as margin on each side (default 0.06). */
  readonly padding?: number;
}

/**
 * Camera that centres `box` in a viewport of `size` with a padding margin.
 * Degenerate boxes (zero width/height, or an empty box) still centre sensibly.
 */
export function fitToBounds(box: Box, size: Size, opts: FitOptions = {}): Camera {
  const padding = Math.max(0, Math.min(0.45, opts.padding ?? 0.06));
  const vw = Number.isFinite(size.width) && size.width > 0 ? size.width : 1;
  const vh = Number.isFinite(size.height) && size.height > 0 ? size.height : 1;

  if (isEmptyBox(box)) {
    return { x: vw / 2, y: vh / 2, scale: clampScale(1, opts) };
  }

  const availW = vw * (1 - 2 * padding);
  const availH = vh * (1 - 2 * padding);
  const { width, height } = boxSize(box);

  const sx = width > 1e-9 ? availW / width : Infinity;
  const sy = height > 1e-9 ? availH / height : Infinity;
  let scale = Math.min(sx, sy);
  if (!Number.isFinite(scale) || scale <= 0) scale = 1;
  scale = clampScale(scale, opts);

  const c = boxCenter(box);
  return { scale, x: vw / 2 - c.x * scale, y: vh / 2 - c.y * scale };
}

/** True when every corner of `box` is inside the `size` viewport under `cam`. */
export function boxFitsInViewport(cam: Camera, box: Box, size: Size, epsilon = 1e-6): boolean {
  if (isEmptyBox(box)) return true;
  const a = worldToScreen(cam, box.min);
  const b = worldToScreen(cam, box.max);
  return (
    Math.min(a.x, b.x) >= -epsilon &&
    Math.min(a.y, b.y) >= -epsilon &&
    Math.max(a.x, b.x) <= size.width + epsilon &&
    Math.max(a.y, b.y) <= size.height + epsilon
  );
}

// ---------------------------------------------------------------------------
// Pinch
// ---------------------------------------------------------------------------

export interface PinchPair {
  readonly a: Pt;
  readonly b: Pt;
}

export function pinchMid(p: PinchPair): Pt {
  return { x: (p.a.x + p.b.x) / 2, y: (p.a.y + p.b.y) / 2 };
}

export function pinchSpread(p: PinchPair): number {
  return Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y);
}

/**
 * Two-pointer pinch (replicates `touchStarted`/`touchMoved`, sketch.ts:1270).
 * The world point under the gesture's *starting* midpoint stays under the
 * *current* midpoint, so pinch pans and zooms in one motion.
 */
export function pinchUpdate(
  startCam: Camera,
  start: PinchPair,
  current: PinchPair,
  limits: ScaleLimits = {},
): Camera {
  const startSpread = pinchSpread(start);
  const curSpread = pinchSpread(current);
  const factor = startSpread > 1e-6 ? curSpread / startSpread : 1;
  const scale = clampScale(startCam.scale * factor, limits);
  const anchorWorld = screenToWorld(startCam, pinchMid(start));
  const target = pinchMid(current);
  return { scale, x: target.x - anchorWorld.x * scale, y: target.y - anchorWorld.y * scale };
}

/** Round a camera for URL sharing (§9.2 `cam` is 2-decimal fixed). */
export function roundCamera(cam: Camera): Camera {
  return {
    x: Number(cam.x.toFixed(2)),
    y: Number(cam.y.toFixed(2)),
    scale: Number(cam.scale.toFixed(2)),
  };
}

export function camerasEqual(a: Camera | undefined, b: Camera | undefined, eps = 1e-6): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps && Math.abs(a.scale - b.scale) < eps
  );
}
