/**
 * Canvas2D fallback renderer (docs/BIGMAP_INVESTIGATION.md §3: Skia's
 * software path beats GL emulation ~13–26× on GPU-less machines, good for
 * ~25–50k tiles). Same `MapRenderer` contract as the WebGL2 path: one shared
 * `Path2D` per shape, `setTransform` + `fill` per instance, instances grouped
 * by type byte so fill style changes at most 10 times per frame.
 *
 * Strand lines follow the same "one path per leaf type, `<use>`d per instance"
 * shape: `chords.ts` hands over tile-local segments, this file bakes one
 * `Path2D` per leaf type and strokes it under each instance's transform. Like
 * the WebGL path they are drawn ONLY at a leaf cut (`cutLevel === 0`).
 */

import {
  AGGREGATE_TYPE_BASE,
  LEAF_ORDER,
  SPECTRE_PTS,
  TILE_NAMES,
  TILE_PALETTES,
  instanceAffine,
  mul,
  rgbToCss,
  type Affine,
  type Pt,
  type Rgb,
  type Segment,
  type ViewportCut,
} from '../../core';
import { originRelativeCenter, type MapCamera } from './camera';
import type { LeafChordTable } from './chords';
import { GLYPH_LEVEL, buildGlyphMeshes, glyphFitForCut } from './glyphs';
import type { MapRenderStats, MapRenderStyle, MapRenderer } from './rendererTypes';
import {
  BASE_LINE_PX,
  DEFAULT_LINE_COLOR,
  OUTLINE_FADE_START,
  outlineAlphaForScale,
} from './webglRenderer';

/** Hard instance ceiling for the software path (≈ the report's 50k budget). */
export const CANVAS2D_MAX_INSTANCES = 50_000;
/** Outline stroking is only affordable below this many instances. */
const OUTLINE_MAX_INSTANCES = 30_000;

const BG_CSS = '#0e1118';

/**
 * Screen transform (CSS px, before dpr) for one instance: camera ∘ instance
 * decode ∘ optional glyph fit. Pure and exported for the packing test.
 */
export function instanceScreenTransform(
  cam: MapCamera,
  cssW: number,
  cssH: number,
  origin: Pt,
  ix: number,
  iy: number,
  code: number,
  fit?: Affine,
): Affine {
  const off = originRelativeCenter(cam, origin);
  const s = cam.scale;
  const screen: Affine = [s, 0, cssW / 2 - off.x * s, 0, s, cssH / 2 - off.y * s];
  const inst = instanceAffine(ix, iy, code);
  const m = mul(screen, inst);
  return fit ? mul(m, fit) : m;
}

function pathOf(pts: readonly Pt[]): Path2D {
  const p = new Path2D();
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y);
  p.closePath();
  return p;
}

/** One open path holding every chord of a leaf type (`M a L b M c L d …`). */
function chordPathOf(segments: readonly Segment[]): Path2D | null {
  if (!segments.length) return null;
  const p = new Path2D();
  for (const [a, b] of segments) {
    p.moveTo(a.x, a.y);
    p.lineTo(b.x, b.y);
  }
  return p;
}

function cssRgba(c: readonly [number, number, number, number]): string {
  const ch = (v: number): number => Math.max(0, Math.min(255, Math.round(v * 255)));
  return `rgba(${ch(c[0])}, ${ch(c[1])}, ${ch(c[2])}, ${c[3].toFixed(3)})`;
}

/** Returns null when a 2D context cannot be created either. */
export function createCanvas2dRenderer(canvas: HTMLCanvasElement): MapRenderer | null {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  } catch {
    ctx = null;
  }
  if (!ctx || typeof Path2D === 'undefined') return null;
  const C = ctx;

  // Shared paths: leaf spectre + (lazily) the nine aggregate glyph outlines.
  const leafPath = pathOf(SPECTRE_PTS);
  let glyphPaths: Path2D[] | null = null;

  const defaultLeafColors = LEAF_ORDER.map((t) =>
    rgbToCss(TILE_PALETTES.bright[t] ?? [200, 200, 200]),
  );
  const defaultAggColors = TILE_NAMES.map((t) =>
    rgbToCss(TILE_PALETTES.bright[t] ?? [200, 200, 200]),
  );
  let leafColors = defaultLeafColors;
  let aggColors = defaultAggColors;
  let showFills = true;
  let showOutlines = true;
  let lineCss = cssRgba(DEFAULT_LINE_COLOR);
  let lineScale = 1;

  let cutRef: ViewportCut | null = null;
  let byType: Map<number, number[]> = new Map();
  let capped = false;
  let chordPaths: (Path2D | null)[] | null = null;
  let chordCounts: readonly number[] = [];

  const cssPalette = (colors: readonly Rgb[] | undefined, fallback: readonly string[]): string[] =>
    colors ? fallback.map((f, i) => (colors[i] ? rgbToCss(colors[i]) : f)) : [...fallback];

  const setChords = (table: LeafChordTable | null): void => {
    const live = table && table.vertsPerInstance > 0 ? table : null;
    chordPaths = live ? live.segments.map(chordPathOf) : null;
    chordCounts = live ? live.segments.map((s) => s.length) : [];
  };

  const setStyle = (style: MapRenderStyle | null): void => {
    leafColors = cssPalette(style?.leafColors, defaultLeafColors);
    aggColors = cssPalette(style?.aggColors, defaultAggColors);
    showFills = style?.showFills ?? true;
    showOutlines = style?.showOutlines ?? true;
    lineCss = cssRgba(style?.lineColor ?? DEFAULT_LINE_COLOR);
    lineScale = style?.lineScale ?? 1;
  };

  const setCut = (cut: ViewportCut): void => {
    cutRef = cut;
    byType = new Map();
    capped = cut.count > CANVAS2D_MAX_INSTANCES;
    const n = Math.min(cut.count, CANVAS2D_MAX_INSTANCES);
    for (let i = 0; i < n; i++) {
      const t = cut.type[i];
      const list = byType.get(t);
      if (list) list.push(i);
      else byType.set(t, [i]);
    }
    if (cut.cutLevel > 0 && !glyphPaths) {
      glyphPaths = buildGlyphMeshes(GLYPH_LEVEL).map((m) => pathOf(m.outline));
    }
  };

  const render = (cam: MapCamera, cssW: number, cssH: number, dpr: number): MapRenderStats => {
    const t0 = performance.now();
    const bw = Math.max(1, Math.round(cssW * dpr));
    const bh = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;

    C.setTransform(1, 0, 0, 1, 0, 0);
    C.fillStyle = BG_CSS;
    C.fillRect(0, 0, bw, bh);

    let drawn = 0;
    let chordsDrawn = 0;
    const cut = cutRef;
    if (cut && cut.count > 0) {
      const aggregate = cut.cutLevel > 0;
      const fit = aggregate ? glyphFitForCut(cut.cutLevel) : undefined;
      const outline =
        showOutlines &&
        !aggregate &&
        cam.scale > OUTLINE_FADE_START &&
        Math.min(cut.count, CANVAS2D_MAX_INSTANCES) <= OUTLINE_MAX_INSTANCES;
      const strokeAlpha = outlineAlphaForScale(cam.scale);

      for (const [typeByte, list] of byType) {
        if (!showFills) {
          drawn += list.length;
          continue;
        }
        const path = aggregate
          ? (glyphPaths as Path2D[])[typeByte - AGGREGATE_TYPE_BASE]
          : leafPath;
        C.fillStyle = aggregate
          ? aggColors[typeByte - AGGREGATE_TYPE_BASE]
          : leafColors[typeByte] ?? '#c8c8c8';
        for (const i of list) {
          const m = instanceScreenTransform(
            cam,
            cssW,
            cssH,
            cut.origin,
            cut.pos[i * 2],
            cut.pos[i * 2 + 1],
            cut.code[i],
            fit,
          );
          C.setTransform(dpr * m[0], dpr * m[3], dpr * m[1], dpr * m[4], dpr * m[2], dpr * m[5]);
          C.fill(path);
          drawn++;
        }
      }

      // Strand lines — leaf cuts only, same rule as the WebGL2 path.
      if (!aggregate && chordPaths) {
        // The instance transform carries the camera scale, so a constant width
        // here would be world units and would thin out on zoom-out. Dividing
        // by the scale pins it to CSS px, matching the WebGL2 path.
        C.lineWidth = (BASE_LINE_PX * lineScale) / Math.max(1e-6, cam.scale);
        C.strokeStyle = lineCss;
        for (const [typeByte, list] of byType) {
          const path = chordPaths[typeByte];
          if (!path) continue;
          for (const i of list) {
            const m = instanceScreenTransform(
              cam,
              cssW,
              cssH,
              cut.origin,
              cut.pos[i * 2],
              cut.pos[i * 2 + 1],
              cut.code[i],
            );
            C.setTransform(dpr * m[0], dpr * m[3], dpr * m[1], dpr * m[4], dpr * m[2], dpr * m[5]);
            C.stroke(path);
            chordsDrawn += chordCounts[typeByte] ?? 0;
          }
        }
      }

      if (outline && strokeAlpha > 0.02) {
        C.lineWidth = 0.06;
        C.strokeStyle = `rgba(10, 13, 20, ${(0.85 * strokeAlpha).toFixed(3)})`;
        for (const [, list] of byType) {
          for (const i of list) {
            const m = instanceScreenTransform(
              cam,
              cssW,
              cssH,
              cut.origin,
              cut.pos[i * 2],
              cut.pos[i * 2 + 1],
              cut.code[i],
            );
            C.setTransform(dpr * m[0], dpr * m[3], dpr * m[1], dpr * m[4], dpr * m[2], dpr * m[5]);
            C.stroke(leafPath);
          }
        }
      }
      C.setTransform(1, 0, 0, 1, 0, 0);
    }

    return {
      mode: 'canvas2d',
      instances: drawn,
      drawCalls: drawn, // one fill per instance — reported for honesty
      drawMs: performance.now() - t0,
      capped,
      chordsDrawn,
    };
  };

  return {
    mode: 'canvas2d',
    setCut,
    setChords,
    setStyle,
    render,
    dispose(): void {
      cutRef = null;
      chordPaths = null;
      byType.clear();
    },
  };
}
