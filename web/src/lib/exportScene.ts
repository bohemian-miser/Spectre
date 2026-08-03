/**
 * Scene serialization for `SharePanel`'s "Download SVG / PNG" (DESIGN.md §6.4).
 *
 * Replaces the old `streamSVG` path: instead of re-emitting geometry, the live
 * `TilingView` DOM *is* the picture, so what downloads is exactly what is on
 * screen. Only the pure half lives here — `lib/` stays free of `document` /
 * `window` (enforced by `lib/__tests__/layering.test.ts`); the browser-only
 * download + rasterise half is `pages/sceneDownload.ts`.
 */

export interface SerializeSceneOptions {
  /** Pixel size to stamp on the exported root (defaults to the live size). */
  readonly width?: number;
  readonly height?: number;
  /** Solid background rect, e.g. the page background. Omit for transparency. */
  readonly background?: string;
  readonly title?: string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/**
 * Clone a live `<svg>` into a standalone, self-contained document string.
 *
 * The live renderer sizes itself with `width="100%"` and positions the scene
 * with a camera transform in screen pixels; the export pins that to a concrete
 * pixel box and adds the matching `viewBox`, so the file opens at the same
 * framing in any viewer.
 */
export function serializeSceneSvg(svg: SVGSVGElement, opts: SerializeSceneOptions = {}): string {
  const rect =
    typeof svg.getBoundingClientRect === 'function' ? svg.getBoundingClientRect() : null;
  const width = Math.max(1, Math.round(opts.width || rect?.width || 800));
  const height = Math.max(1, Math.round(opts.height || rect?.height || 600));

  const doc = svg.ownerDocument;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('xmlns:xlink', XLINK_NS);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  // A camera-driven view carries no viewBox of its own (screen-space transform).
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  if (opts.background) {
    const bg = doc.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', opts.background);
    clone.insertBefore(bg, clone.firstChild);
  }
  if (opts.title) {
    const title = doc.createElementNS(SVG_NS, 'title');
    title.textContent = opts.title;
    clone.insertBefore(title, clone.firstChild);
  }

  const body = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

/** Filename stem for an export, e.g. `spectre-Delta-lv3-2578`. */
export function sceneFilename(
  family: string,
  rootTile: string,
  level: number,
  subset: readonly number[],
): string {
  const rule = subset.length ? subset.join('') : 'none';
  return `${family}-${rootTile}-lv${level}-${rule}`;
}
