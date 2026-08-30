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
 *
 * The traced strand (`setTrail`) is the exception to all of that: it is one
 * world-anchored polyline, independent of the cut, stroked directly in device
 * pixels as a run of constant-colour rainbow bands.
 */

import {
  AGGREGATE_TYPE_BASE,
  TILE_NAMES,
  TILE_PALETTES,
  instanceAffine,
  leafOrder,
  leafPts,
  mul,
  rainbow,
  rgbToCss,
  type Affine,
  type Pt,
  type Rgb,
  type Segment,
  type TileFamilyId,
  type ViewportCut,
} from '../../core';
import { originRelativeCenter, type MapCamera } from './camera';
import type { LeafChordTable } from './chords';
import { GLYPH_LEVEL, buildGlyphMeshes, glyphFitForCut } from './glyphs';
import {
  HIGHLIGHT_WIDTH,
  type MapRenderStats,
  type MapRenderStyle,
  type MapRenderer,
  type TrailGeometry,
} from './rendererTypes';
import {
  BASE_LINE_PX,
  DEFAULT_LINE_COLOR,
  DEFAULT_TRAIL_SCALE,
  OUTLINE_FADE_START,
  outlineAlphaForScale,
} from './webglRenderer';

/**
 * Rainbow segments per frame. The 2D path pays a `strokeStyle` change and a
 * `stroke()` per colour band, so a 200 k-point trail cannot be drawn one
 * segment at a time; bands cover several points each and the gradient reads
 * the same. (The WebGL path shades per fragment and needs no such trick.)
 */
const TRAIL_BANDS = 96;

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
export function createCanvas2dRenderer(
  canvas: HTMLCanvasElement,
  family: TileFamilyId = 'spectre',
): MapRenderer | null {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
  } catch {
    ctx = null;
  }
  if (!ctx || typeof Path2D === 'undefined') return null;
  const C = ctx;

  // Shared paths: one leaf outline per type byte (the hat family's Gamma2 is
  // a turtle, so a single shared path stopped being enough) + (lazily) the
  // nine aggregate glyph outlines.
  const leafTypes = leafOrder(family);
  const leafPaths = leafTypes.map((t) => pathOf(leafPts(family, t)));
  let glyphPaths: Path2D[] | null = null;

  const defaultLeafColors = leafTypes.map((t) =>
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
  let trailScale = DEFAULT_TRAIL_SCALE;
  let trail: TrailGeometry | null = null;
  let circuits: readonly TrailGeometry[] = [];
  let highlights: readonly TrailGeometry[] = [];

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

  const setTrail = (next: TrailGeometry | null): void => {
    trail = next && next.pointCount >= 2 ? next : null;
  };

  const setCircuits = (next: readonly TrailGeometry[] | null): void => {
    circuits = (next ?? []).filter((c) => c.pointCount >= 2);
  };

  const setHighlights = (next: readonly TrailGeometry[] | null): void => {
    highlights = (next ?? []).filter((c) => c.pointCount >= 2);
  };

  const setStyle = (style: MapRenderStyle | null): void => {
    leafColors = cssPalette(style?.leafColors, defaultLeafColors);
    aggColors = cssPalette(style?.aggColors, defaultAggColors);
    showFills = style?.showFills ?? true;
    showOutlines = style?.showOutlines ?? true;
    lineCss = cssRgba(style?.lineColor ?? DEFAULT_LINE_COLOR);
    lineScale = style?.lineScale ?? 1;
    trailScale = style?.trailScale ?? DEFAULT_TRAIL_SCALE;
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
      glyphPaths = buildGlyphMeshes(GLYPH_LEVEL, family).map((m) => pathOf(m.outline));
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
      const fit = aggregate ? glyphFitForCut(cut.cutLevel, GLYPH_LEVEL, family) : undefined;
      const outline =
        showOutlines &&
        !aggregate &&
        cam.scale > OUTLINE_FADE_START &&
        Math.min(cut.count, CANVAS2D_MAX_INSTANCES) <= OUTLINE_MAX_INSTANCES;
      const strokeAlpha = outlineAlphaForScale(cam.scale);

      // Backgrounds off means no tile fills at ANY level of detail — leaf
      // tiles and supertile glyphs alike. Skipping the pass outright (rather
      // than counting instances nobody filled) keeps `instances`/`drawCalls`
      // honest: they report what was actually painted.
      if (showFills) {
        for (const [typeByte, list] of byType) {
          const path = aggregate
            ? (glyphPaths as Path2D[])[typeByte - AGGREGATE_TYPE_BASE]
            : leafPaths[typeByte] ?? leafPaths[0];
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
        for (const [typeByte, list] of byType) {
          const path = leafPaths[typeByte] ?? leafPaths[0];
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
          }
        }
      }
      C.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Traced strand and kept circuits — drawn straight in device pixels (no
    // per-instance transform to ride) and NOT gated on the cut: they are
    // world-anchored, so they stay put when the viewport leaves them and comes
    // back. Circuits first so the live trail stays on top.
    let trailPoints = 0;
    C.setTransform(1, 0, 0, 1, 0, 0);
    for (const c of circuits) {
      trailPoints += strokeTrail(C, c, cam, bw, bh, dpr, BASE_LINE_PX * lineScale * trailScale);
    }
    if (trail) {
      trailPoints += strokeTrail(C, trail, cam, bw, bh, dpr, BASE_LINE_PX * lineScale * trailScale);
    }
    // Last, and wider: a highlight sits ON the line it points at.
    for (const h of highlights) {
      trailPoints += strokeTrail(
        C,
        h,
        cam,
        bw,
        bh,
        dpr,
        BASE_LINE_PX * lineScale * trailScale * HIGHLIGHT_WIDTH,
      );
    }

    return {
      mode: 'canvas2d',
      instances: drawn,
      drawCalls: drawn, // one fill per instance — reported for honesty
      drawMs: performance.now() - t0,
      capped,
      chordsDrawn,
      trailPoints,
    };
  };

  return {
    mode: 'canvas2d',
    setCut,
    setChords,
    setTrail,
    setCircuits,
    setHighlights,
    setStyle,
    render,
    dispose(): void {
      cutRef = null;
      chordPaths = null;
      trail = null;
      circuits = [];
      highlights = [];
      byType.clear();
    },
  };
}

/**
 * Stroke the traced strand in {@link TRAIL_BANDS} constant-colour bands, each
 * clipped to the viewport: a band's points are only joined while the segment
 * could touch the canvas, so a 100 k-point trail seen through a keyhole costs
 * one pass of arithmetic and a handful of short strokes rather than a
 * 100 k-segment path.
 *
 * Returns the number of points walked, for the HUD.
 */
function strokeTrail(
  C: CanvasRenderingContext2D,
  trail: TrailGeometry,
  cam: MapCamera,
  bw: number,
  bh: number,
  dpr: number,
  widthCssPx: number,
): number {
  const n = trail.pointCount;
  const off = originRelativeCenter(cam, trail.origin);
  const s = cam.scale * dpr;
  const hx = bw / 2;
  const hy = bh / 2;
  // Generous margin so a segment that only crosses the corner still joins up.
  const pad = Math.max(64, widthCssPx * dpr);
  const total = Math.max(1e-6, trail.totalLength);

  C.lineWidth = Math.max(1, widthCssPx * dpr);
  C.lineCap = 'round';
  C.lineJoin = 'round';

  const solid = trail.color
    ? `rgb(${Math.round(trail.color[0] * 255)}, ${Math.round(trail.color[1] * 255)}, ${Math.round(trail.color[2] * 255)})`
    : null;
  const bands = solid ? 1 : Math.min(TRAIL_BANDS, n - 1);
  for (let b = 0; b < bands; b++) {
    const from = Math.floor((b * (n - 1)) / bands);
    const to = Math.floor(((b + 1) * (n - 1)) / bands); // inclusive: bands share a point
    C.strokeStyle = solid ?? rainbow(trail.arc[Math.floor((from + to) / 2)] / total);
    C.beginPath();
    let penDown = false;
    let px = 0;
    let py = 0;
    let pIn = false;
    for (let i = from; i <= to; i++) {
      const x = (trail.xy[i * 2] - off.x) * s + hx;
      const y = (trail.xy[i * 2 + 1] - off.y) * s + hy;
      const inView = x >= -pad && x <= bw + pad && y >= -pad && y <= bh + pad;
      if (i > from && (inView || pIn)) {
        if (!penDown) {
          C.moveTo(px, py);
          penDown = true;
        }
        C.lineTo(x, y);
      } else {
        penDown = false;
      }
      px = x;
      py = y;
      pIn = inView;
    }
    C.stroke();
  }
  return n;
}
