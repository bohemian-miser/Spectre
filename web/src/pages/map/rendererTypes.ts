/**
 * Renderer contract shared by the WebGL2 path and the Canvas2D fallback, so
 * `MapPage` / `InfiniteCanvas` drive either through one interface (and tests
 * can inject fakes).
 */

import type { Rgb, ViewportCut } from '../../core';
import type { MapCamera } from './camera';
import type { LeafChordTable } from './chords';

export type RendererMode = 'webgl2' | 'canvas2d';

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
}

export interface MapRenderer {
  readonly mode: RendererMode;
  /** Adopt a new viewport cut (uploads instance buffers). */
  setCut(cut: ViewportCut): void;
  /** Adopt a strand-chord table (null/empty disables the line pass). */
  setChords(table: LeafChordTable | null): void;
  /** Override appearance (merged over the defaults). */
  setStyle(style: MapRenderStyle | null): void;
  /** Draw the current cut under `cam`. CSS-pixel size + devicePixelRatio. */
  render(cam: MapCamera, cssWidth: number, cssHeight: number, dpr: number): MapRenderStats;
  dispose(): void;
}
