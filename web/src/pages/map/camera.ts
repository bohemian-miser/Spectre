/**
 * Camera math for The Infinite Map (docs/BIGMAP_INVESTIGATION.md §3, §5).
 *
 * Pure functions over an immutable `{cx, cy, scale}` record so every invariant
 * — zoom-to-cursor, pan symmetry, origin-relative precision — is testable in
 * node. Screen space is CSS pixels, origin top-left, y down; world space is
 * the engine's frame (y also rendered downward, matching the SVG renderers).
 *
 * Precision rule: the camera center is a double and may grow without bound
 * (unbounded pan), but the GPU only ever sees ORIGIN-RELATIVE positions — the
 * engine emits `pos` minus the query origin, and the renderer subtracts
 * `originRelativeCenter` (camera minus that same origin, computed in doubles)
 * before anything is rounded to f32. Re-anchoring is therefore automatic:
 * every query result carries its own origin near the current view center.
 */

import type { Pt, ViewRect } from '../../core';

export interface MapCamera {
  /** World x of the view center. */
  readonly cx: number;
  /** World y of the view center. */
  readonly cy: number;
  /** CSS pixels per world unit (a spectre tile edge is 1 world unit). */
  readonly scale: number;
}

/**
 * Zoom-out floor. At 1e-8 px/unit a 1500 px viewport spans ~1.9e11 world
 * units — a level ~26-equivalent patch, still comfortably coverable inside
 * the engine's UNROOTED_MAX_LEVEL=32 ancestor chain (~1e14 units).
 */
export const MIN_SCALE = 1e-8;
/** Zoom-in ceiling: ~400 px per tile edge. */
export const MAX_SCALE = 400;
/** Default zoom: comfortable tile-level view. */
export const DEFAULT_SCALE = 36;

/** Extra view-rect margin so small pans do not immediately expose void. */
export const VIEW_MARGIN = 1.2;

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return DEFAULT_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function createCamera(cx = 0, cy = 0, scale = DEFAULT_SCALE): MapCamera {
  return {
    cx: Number.isFinite(cx) ? cx : 0,
    cy: Number.isFinite(cy) ? cy : 0,
    scale: clampScale(scale),
  };
}

/** World point under a screen (CSS px) position. */
export function screenToWorld(
  cam: MapCamera,
  sx: number,
  sy: number,
  width: number,
  height: number,
): Pt {
  return {
    x: cam.cx + (sx - width / 2) / cam.scale,
    y: cam.cy + (sy - height / 2) / cam.scale,
  };
}

/** Screen (CSS px) position of a world point. */
export function worldToScreen(
  cam: MapCamera,
  wx: number,
  wy: number,
  width: number,
  height: number,
): Pt {
  return {
    x: (wx - cam.cx) * cam.scale + width / 2,
    y: (wy - cam.cy) * cam.scale + height / 2,
  };
}

/** Drag the content by (dxPx, dyPx) CSS pixels (pointer-follows-content). */
export function panBy(cam: MapCamera, dxPx: number, dyPx: number): MapCamera {
  return { cx: cam.cx - dxPx / cam.scale, cy: cam.cy - dyPx / cam.scale, scale: cam.scale };
}

/**
 * Multiply the zoom by `factor`, keeping the world point under the screen
 * position (sx, sy) exactly fixed — the zoom-to-cursor invariant.
 */
export function zoomAt(
  cam: MapCamera,
  sx: number,
  sy: number,
  factor: number,
  width: number,
  height: number,
): MapCamera {
  const next = clampScale(cam.scale * factor);
  if (next === cam.scale) return cam;
  const wx = cam.cx + (sx - width / 2) / cam.scale;
  const wy = cam.cy + (sy - height / 2) / cam.scale;
  return {
    cx: wx - (sx - width / 2) / next,
    cy: wy - (sy - height / 2) / next,
    scale: next,
  };
}

/** Engine query rect for the current view, padded by `margin`. */
export function viewRectFor(
  cam: MapCamera,
  width: number,
  height: number,
  margin: number = VIEW_MARGIN,
): ViewRect {
  return {
    cx: cam.cx,
    cy: cam.cy,
    halfW: ((width / 2) / cam.scale) * margin,
    halfH: ((height / 2) / cam.scale) * margin,
  };
}

/**
 * Camera center in the coordinate frame of a query's `origin` — the only
 * camera quantity the renderer ever narrows to f32. Computed in doubles; as
 * long as the origin tracks the camera (it is the view center at query time)
 * this stays small no matter how large the absolute world coordinates grow.
 */
export function originRelativeCenter(cam: MapCamera, origin: Pt): Pt {
  return { x: cam.cx - origin.x, y: cam.cy - origin.y };
}

/**
 * Approximate count of whole tiles covered by the current view — drives the
 * HUD's "you are at depth ~N" framing alongside the cut's `ancestorLevel`.
 */
export function visibleWorldArea(cam: MapCamera, width: number, height: number): number {
  return (width / cam.scale) * (height / cam.scale);
}
