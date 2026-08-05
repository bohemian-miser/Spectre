/**
 * Renderer contract shared by the WebGL2 path and the Canvas2D fallback, so
 * `MapPage` / `InfiniteCanvas` drive either through one interface (and tests
 * can inject fakes).
 */

import type { Pt, Rgb, ViewportCut } from '../../core';
import type { MapCamera } from './camera';
import type { LeafChordTable } from './chords';

export type RendererMode = 'webgl2' | 'canvas2d';

/**
 * One traced strand, ready to draw: a polyline in f32 coordinates RELATIVE TO
 * `origin` (the same precision discipline the instance stream follows — the GPU
 * never sees absolute world coordinates), plus the cumulative arc length at
 * each point.
 *
 * The rainbow is a function of `arc / totalLength`, so it always spans the
 * whole coloured line: growing the trail restretches the gradient without
 * rewriting a single vertex, because `arc` is absolute and only `totalLength`
 * moves. `version` changes exactly when the vertex data did, so a renderer can
 * skip re-uploading between frames.
 */
export interface TrailGeometry {
  readonly origin: Pt;
  /** 2 floats per point, relative to `origin`. */
  readonly xy: Float32Array;
  /** Cumulative arc length per point, in world units. */
  readonly arc: Float32Array;
  readonly pointCount: number;
  readonly totalLength: number;
  readonly version: number;
}

/**
 * Appearance knobs the embedding page may override. Everything is optional;
 * omitting the whole record keeps the Infinite Map's own look (bright
 * per-flavour fills, fading outlines, white strand lines).
 */
export interface MapRenderStyle {
  /** Leaf fill colours in `LEAF_ORDER` order (0..255 per channel). */
  readonly leafColors?: readonly Rgb[];
  /** Aggregate glyph colours in `TILE_NAMES` order. */
  readonly aggColors?: readonly Rgb[];
  /** Draw the per-tile fills at all (false = strand lines on the background). */
  readonly showFills?: boolean;
  /** Draw the leaf outline pass once zoomed in far enough. */
  readonly showOutlines?: boolean;
  /** Strand line colour, 0..1 RGBA. */
  readonly lineColor?: readonly [number, number, number, number];
  /**
   * Strand line thickness MULTIPLIER over the renderer's base width (1 =
   * unchanged). Applies to the chord lines only — never to the leaf outline
   * pass, which stays hairline so it reads as tile structure rather than ink.
   */
  readonly lineScale?: number;
  /**
   * Clip overlapping strands at the midpoint between their centrelines rather
   * than letting the thicker one pile on top. Costs one extra pass over the
   * chords; WebGL2 only (the Canvas2D fallback has no depth buffer to do it
   * with, and ignores this).
   */
  readonly noOverlap?: boolean;
  /**
   * Traced-strand thickness MULTIPLIER over the strand width, so the rainbow
   * reads as the same line the user tapped, only fatter (1.8 by default —
   * enough to cover the ink underneath without hiding its neighbours).
   */
  readonly trailScale?: number;
}

export interface MapRenderStats {
  readonly mode: RendererMode;
  /** Instances actually drawn this frame. */
  readonly instances: number;
  readonly drawCalls: number;
  /** Wall-clock ms of the draw (WebGL2 path includes a `finish()` sync). */
  readonly drawMs: number;
  /** True when the fallback renderer clipped the instance list. */
  readonly capped: boolean;
  /**
   * Strand chords actually rasterized this frame — `instances × chords/tile`
   * at a leaf cut, and exactly 0 at an aggregate cut (lines are hidden there;
   * see `webglRenderer`'s note). The HUD reports this verbatim so it can never
   * claim lines that were not drawn.
   */
  readonly chordsDrawn: number;
  /** Points of the traced strand rasterized this frame (0 when there is none). */
  readonly trailPoints: number;
}

export interface MapRenderer {
  readonly mode: RendererMode;
  /** Adopt a new viewport cut (uploads instance buffers). */
  setCut(cut: ViewportCut): void;
  /** Adopt a strand-chord table (null/empty disables the line pass). */
  setChords(table: LeafChordTable | null): void;
  /**
   * Adopt a traced strand (null clears it). Unlike the cut, this is NOT tied
   * to the viewport: the trail is world-anchored, so it keeps drawing wherever
   * the camera goes — including back where the walk started.
   */
  setTrail(trail: TrailGeometry | null): void;
  /** Override appearance (merged over the defaults). */
  setStyle(style: MapRenderStyle | null): void;
  /** Draw the current cut under `cam`. CSS-pixel size + devicePixelRatio. */
  render(cam: MapCamera, cssWidth: number, cssHeight: number, dpr: number): MapRenderStats;
  dispose(): void;
}
