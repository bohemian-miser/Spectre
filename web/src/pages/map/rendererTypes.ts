/**
 * Renderer contract shared by the WebGL2 path and the Canvas2D fallback, so
 * `MapPage` drives either through one interface (and tests can inject fakes).
 */

import type { ViewportCut } from '../../core';
import type { MapCamera } from './camera';

export type RendererMode = 'webgl2' | 'canvas2d';

export interface MapRenderStats {
  readonly mode: RendererMode;
  /** Instances actually drawn this frame. */
  readonly instances: number;
  readonly drawCalls: number;
  /** Wall-clock ms of the draw (WebGL2 path includes a `finish()` sync). */
  readonly drawMs: number;
  /** True when the fallback renderer clipped the instance list. */
  readonly capped: boolean;
}

export interface MapRenderer {
  readonly mode: RendererMode;
  /** Adopt a new viewport cut (uploads instance buffers). */
  setCut(cut: ViewportCut): void;
  /** Draw the current cut under `cam`. CSS-pixel size + devicePixelRatio. */
  render(cam: MapCamera, cssWidth: number, cssHeight: number, dpr: number): MapRenderStats;
  dispose(): void;
}
