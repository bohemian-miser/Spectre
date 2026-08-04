/**
 * Renderer selection: raw WebGL2 instancing when available, Canvas2D
 * (~≤50k instances) otherwise, `null` when neither context exists — the page
 * then shows a static unsupported notice (docs/BIGMAP_INVESTIGATION.md §3).
 */

import { createCanvas2dRenderer } from './canvasRenderer';
import { createWebGLRenderer, type WebGLRendererOptions } from './webglRenderer';
import type { MapRenderer } from './rendererTypes';

export type { MapRenderer, MapRenderStats, RendererMode } from './rendererTypes';

export function createMapRenderer(
  canvas: HTMLCanvasElement,
  opts: WebGLRendererOptions = {},
): MapRenderer | null {
  return createWebGLRenderer(canvas, opts) ?? createCanvas2dRenderer(canvas);
}
