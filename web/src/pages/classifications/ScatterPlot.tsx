/**
 * The Classifications scatter: every combination as one dot, coloured by
 * class, on any two of the dataset's fields.
 *
 * 600k+ dots are written straight into an `ImageData` in one pass. The same
 * pass records, per CSS pixel, the last dot drawn there and how many landed on
 * it, so hover picking is a small neighbourhood search instead of a spatial
 * index. Three layers: axes underneath, the dots clipped to the plot area, and
 * hover and pin rings on top, so moving the pointer never repaints the dots.
 *
 * Zoom: the wheel zooms about the pointer, dragging pans, two fingers pinch,
 * and a double click or the Reset button goes back to the fitted view. During
 * a gesture only the axes and rings are redrawn; the dot bitmap is moved with a
 * CSS transform, and the full redraw happens once the gesture settles.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fieldTicks,
  fieldUnit,
  rowClass,
  tickLabel,
  MISSING_CLASS,
  type ClassificationData,
  type FieldInfo,
} from './data';
import {
  MIN_SPAN,
  panBy,
  pinchView,
  previewTransform,
  sameView,
  toPlot,
  unionView,
  wheelFactor,
  zoomAt,
  type View,
  type ViewLimits,
} from './zoom';

export interface PlotHover {
  readonly row: number;
  /** Pointer position relative to the plot element, CSS px. */
  readonly x: number;
  readonly y: number;
  /** Dots drawn on the picked pixel. */
  readonly stacked: number;
}

export interface ScatterPlotProps {
  readonly data: ClassificationData;
  readonly xField: number;
  readonly yField: number;
  /** Per class id: drawn at all? */
  readonly visibleClass: readonly boolean[];
  /** Per block: drawn at all? */
  readonly visibleBlock: readonly boolean[];
  /** CSS colour per class id. */
  readonly classColor: readonly string[];
  /** Spread each dot within its quantisation bin so the bins do not print as a grid. */
  readonly jitter: boolean;
  readonly pinned: number | null;
  readonly onHover: (hover: PlotHover | null) => void;
  readonly onPick: (row: number | null) => void;
  readonly ariaLabel: string;
}

const M = { left: 58, right: 14, top: 14, bottom: 46 };
const PICK_RADIUS = 7;
/** Wheel events closer together than this are one gesture. */
const WHEEL_SETTLE_MS = 250;
/** A press that moves less than this is a click, not a drag. */
const DRAG_SLOP = 4;
const BUTTON_ZOOM = 1.6;

function parseColor(css: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(css.trim());
  if (m) {
    const n = Number.parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const r = /rgba?\(([^)]+)\)/.exec(css);
  if (r) {
    const [a, b, c] = r[1].split(',').map((s) => Number.parseFloat(s));
    return [a, b, c];
  }
  return [128, 128, 128];
}

/** Deterministic in [-0.5, 0.5): a dot keeps its place across redraws. */
function hashJitter(row: number, salt: number): number {
  let h = Math.imul(row ^ salt, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca77);
  h ^= h >>> 13;
  return ((h >>> 0) / 4294967296) - 0.5;
}

/**
 * One axis fitted to the unit range [a, b] its dots cover, so a stat whose
 * values sit in a sliver of its range (max nesting 0..6 of 0..255) still fills
 * the plot. Integer fields get at least a few whole steps.
 */
export function fitAxis(a: number, b: number, f: FieldInfo): [number, number] {
  if (a > b) return [0, 1];
  const minSpan = f.integer ? Math.min(1, 4 / (f.hi - f.lo)) : 0.05;
  let span = Math.max(b - a, minSpan);
  const mid = (a + b) / 2;
  let lo = Math.max(0, mid - span / 2);
  const hi = Math.min(1, lo + span);
  lo = Math.max(0, hi - span);
  const pad = (hi - lo) * 0.04;
  const plo = Math.max(0, lo - pad);
  const phi = Math.min(1, hi + pad);
  span = phi - plo;
  return [plo, plo + span];
}

/** The fitted (unzoomed) view: every shown dot, with a little room. */
export function fitView(
  data: ClassificationData,
  xField: number,
  yField: number,
  visibleClass: readonly boolean[],
  visibleBlock: readonly boolean[],
): View {
  const rb = data.meta.rowBytes;
  const nClasses = data.meta.classes.length;
  let ux0 = 1;
  let ux1 = 0;
  let uy0 = 1;
  let uy1 = 0;
  for (let r = 0; r < data.nRows; r++) {
    const c = data.rows[r * rb];
    if (c >= nClasses || !visibleClass[c] || !visibleBlock[data.blockOf[r]]) continue;
    const u = data.rows[r * rb + 1 + xField] / 255;
    const v = data.rows[r * rb + 1 + yField] / 255;
    if (u < ux0) ux0 = u;
    if (u > ux1) ux1 = u;
    if (v < uy0) uy0 = v;
    if (v > uy1) uy1 = v;
  }
  const [x0, x1] = fitAxis(ux0, ux1, data.meta.fields[xField]);
  const [y0, y1] = fitAxis(uy0, uy1, data.meta.fields[yField]);
  return { x0, x1, y0, y1 };
}

/** Row indices of each class, so a redraw visits every row once. */
export function rowsByClass(data: ClassificationData): Int32Array[] {
  const nc = data.meta.classes.length;
  const counts = new Int32Array(nc);
  for (let r = 0; r < data.nRows; r++) {
    const c = rowClass(data, r);
    if (c < nc) counts[c]++;
  }
  const out = [...counts].map((n) => new Int32Array(n));
  const fill = new Int32Array(nc);
  for (let r = 0; r < data.nRows; r++) {
    const c = rowClass(data, r);
    if (c < nc) out[c][fill[c]++] = r;
  }
  return out;
}

interface Frame {
  readonly w: number;
  readonly h: number;
  /** The view the dot bitmap and pick grid were drawn for. */
  readonly view: View;
  readonly owner: Int32Array;
  readonly stack: Uint16Array;
  /** A row's position in unit coordinates, jitter included. */
  readonly unit: (row: number) => [number, number];
}

function drawAxes(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  fx: FieldInfo,
  fy: FieldInfo,
  view: View,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = canvas.width / Math.max(1, w);
  const style = getComputedStyle(canvas);
  const muted = style.getPropertyValue('--muted').trim() || '#999';
  const line = style.getPropertyValue('--line').trim() || '#444';
  const pw = w - M.left - M.right;
  const ph = h - M.top - M.bottom;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.lineWidth = 1;
  ctx.strokeStyle = line;
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const [v, u] of fieldTicks(fx, view.x0, view.x1)) {
    const x = Math.round(M.left + toPlot(view, u, 0, pw, ph)[0]) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, M.top);
    ctx.lineTo(x, M.top + ph);
    ctx.stroke();
    ctx.fillText(tickLabel(v), x, M.top + ph + 6);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const [v, u] of fieldTicks(fy, view.y0, view.y1)) {
    const y = Math.round(M.top + toPlot(view, 0, u, pw, ph)[1]) + 0.5;
    ctx.beginPath();
    ctx.moveTo(M.left, y);
    ctx.lineTo(M.left + pw, y);
    ctx.stroke();
    ctx.fillText(tickLabel(v), M.left - 6, y);
  }
  ctx.font = '12px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(fx.label + (fx.scale === 'log2' ? ' (log)' : ''), M.left + pw / 2, h - 4);
  ctx.save();
  ctx.translate(13, M.top + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'middle';
  ctx.fillText(fy.label + (fy.scale === 'log2' ? ' (log)' : ''), 0, 0);
  ctx.restore();
}

type Gesture =
  | { kind: 'press'; id: number; x0: number; y0: number; start: View; moved: boolean }
  | { kind: 'pinch'; start: View; mid0: [number, number]; dist0: number };

export function ScatterPlot(props: ScatterPlotProps): JSX.Element {
  const { data, xField, yField, visibleClass, visibleBlock, classColor, jitter, pinned } = props;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const axesRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<Frame | null>(null);
  const hoverRef = useRef<number | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fx = data.meta.fields[xField];
  const fy = data.meta.fields[yField];
  const byClass = useMemo(() => rowsByClass(data), [data]);
  const base = useMemo(
    () => fitView(data, xField, yField, visibleClass, visibleBlock),
    [data, xField, yField, visibleClass, visibleBlock],
  );
  const limits = useMemo<ViewLimits>(
    () => ({ bounds: unionView(base, { x0: 0, x1: 1, y0: 0, y1: 1 }), minSpan: MIN_SPAN }),
    [base],
  );
  // The zoom belongs to one pair of axes: choosing another axis drops it.
  const [zoom, setZoom] = useState<{ x: number; y: number; view: View } | null>(null);
  const view = zoom && zoom.x === xField && zoom.y === yField ? zoom.view : base;
  const zoomed = !sameView(view, base);

  // The view shown right now: `view`, or where a gesture in progress has got to.
  const liveRef = useRef<View>(view);
  const gestureRef = useRef<Gesture | null>(null);
  const pointersRef = useRef(new Map<number, [number, number]>());
  const rafRef = useRef(0);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const latest = useRef({ base, limits, xField, yField, fx, fy, size });
  latest.current = { base, limits, xField, yField, fx, fy, size };

  const plotArea = (s = size) => ({ pw: Math.max(1, s.w - M.left - M.right), ph: Math.max(1, s.h - M.top - M.bottom) });

  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = canvas.width / Math.max(1, frame.w);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, frame.w, frame.h);
    const pw = frame.w - M.left - M.right;
    const ph = frame.h - M.top - M.bottom;
    ctx.save();
    ctx.beginPath();
    ctx.rect(M.left - 10, M.top - 10, pw + 20, ph + 20);
    ctx.clip();
    const style = getComputedStyle(canvas);
    const ink = style.getPropertyValue('--text').trim() || '#fff';
    const live = liveRef.current;
    const ring = (row: number, r: number, width: number) => {
      const [u, v] = frame.unit(row);
      const [px, py] = toPlot(live, u, v, pw, ph);
      const x = M.left + px;
      const y = M.top + py;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.lineWidth = width;
      ctx.strokeStyle = style.getPropertyValue('--panel').trim() || '#000';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.lineWidth = width / 2;
      ctx.strokeStyle = ink;
      ctx.stroke();
    };
    if (pinned !== null) ring(pinned, 8, 4);
    if (hoverRef.current !== null && hoverRef.current !== pinned) ring(hoverRef.current, 6, 3);
    ctx.restore();
  }, [pinned]);

  // Axes: cheap, redrawn for every committed view (and every gesture frame).
  useEffect(() => {
    const canvas = axesRef.current;
    const { w, h } = size;
    if (!canvas || w < 50 || h < 50) return;
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    drawAxes(canvas, w, h, fx, fy, view);
  }, [size, fx, fy, view]);

  // Dots and the pick grid.
  useEffect(() => {
    const canvas = dotsRef.current;
    const overlay = overlayRef.current;
    const { w, h } = size;
    if (!canvas || !overlay || w < 50 || h < 50) return;
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const { pw, ph } = plotArea();
    overlay.width = Math.round(w * dpr);
    overlay.height = Math.round(h * dpr);
    canvas.width = Math.round(pw * dpr);
    canvas.height = Math.round(ph * dpr);
    canvas.style.transform = '';
    liveRef.current = view;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rb = data.meta.rowBytes;

    // Spread within a quantisation bin, or within ±0.35 of a step for whole numbers.
    const spread = (f: FieldInfo) => (!jitter ? 0 : f.integer ? 0.7 / (f.hi - f.lo) : 1 / 255);
    const jx = spread(fx);
    const jy = spread(fy);
    const unit = (row: number): [number, number] => [
      fieldUnit(data, row, xField) + jx * hashJitter(row, 17),
      fieldUnit(data, row, yField) + jy * hashJitter(row, 91),
    ];
    const kx = pw / (view.x1 - view.x0);
    const ky = ph / (view.y1 - view.y0);

    // Common classes first so rare ones sit on top.
    const order = [...byClass.keys()].sort((a, b) => byClass[b].length - byClass[a].length);
    const rows = data.rows;
    const ox = 1 + xField;
    const oy = 1 + yField;
    const rgb = classColor.map(parseColor);
    const img = ctx.createImageData(canvas.width, canvas.height);
    const pix = img.data;
    const W = canvas.width;
    const H = canvas.height;
    const owner = new Int32Array(w * h).fill(-1);
    const stack = new Uint16Array(w * h);
    const dot = Math.max(2, Math.round(2 * dpr));
    for (const cls of order) {
      if (!visibleClass[cls]) continue;
      const [cr, cg, cb] = rgb[cls];
      const list = byClass[cls];
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        if (!visibleBlock[data.blockOf[r]]) continue;
        // Inlined `unit(r)`: this loop runs 600k times per redraw.
        const u = rows[r * rb + ox] / 255 + (jx && jx * hashJitter(r, 17));
        const v = rows[r * rb + oy] / 255 + (jy && jy * hashJitter(r, 91));
        const x = (u - view.x0) * kx;
        const y = (view.y1 - v) * ky;
        if (x < -2 || y < -2 || x > pw + 2 || y > ph + 2) continue;
        const cx = Math.floor(x + M.left);
        const cy = Math.floor(y + M.top);
        if (x >= 0 && y >= 0 && x < pw && y < ph && cx < w && cy < h) {
          const k = cy * w + cx;
          owner[k] = r;
          if (stack[k] < 65535) stack[k]++;
        }
        const x0 = Math.round(x * dpr - dot / 2);
        const y0 = Math.round(y * dpr - dot / 2);
        for (let yy = Math.max(0, y0); yy < Math.min(H, y0 + dot); yy++) {
          let p = (yy * W + Math.max(0, x0)) * 4;
          for (let xx = Math.max(0, x0); xx < Math.min(W, x0 + dot); xx++, p += 4) {
            pix[p] = cr;
            pix[p + 1] = cg;
            pix[p + 2] = cb;
            pix[p + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    frameRef.current = { w, h, view, owner, stack, unit };
    drawOverlay();
  }, [data, byClass, xField, yField, fx, fy, visibleClass, visibleBlock, classColor, jitter, size, view, drawOverlay]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  /** Show `live` now without redrawing the dots: move the bitmap, redraw axes and rings. */
  const preview = useCallback(
    (live: View) => {
      liveRef.current = live;
      if (rafRef.current) return;
      const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f: FrameRequestCallback) => setTimeout(() => f(0), 16) as unknown as number;
      rafRef.current = raf(() => {
        rafRef.current = 0;
        const frame = frameRef.current;
        const dots = dotsRef.current;
        const axes = axesRef.current;
        const { fx: lfx, fy: lfy, size: s } = latest.current;
        if (!frame || !dots || !axes) return;
        const { pw, ph } = plotArea(s);
        const t = previewTransform(frame.view, liveRef.current, pw, ph);
        dots.style.transform = `translate(${t.tx}px, ${t.ty}px) scale(${t.sx}, ${t.sy})`;
        drawAxes(axes, s.w, s.h, lfx, lfy, liveRef.current);
        drawOverlay();
      });
    },
    [drawOverlay],
  );

  /** The gesture has settled: make `live` the view, which triggers the full redraw. */
  const commit = useCallback((live: View) => {
    const { base: b, xField: x, yField: y } = latest.current;
    setZoom(sameView(live, b) ? null : { x, y, view: live });
  }, []);

  const resetZoom = useCallback(() => {
    // Also undoes a wheel gesture that has not settled yet (zoom is still null).
    if (settleRef.current) clearTimeout(settleRef.current);
    settleRef.current = null;
    gestureRef.current = null;
    preview(latest.current.base);
    setZoom(null);
  }, [preview]);

  const zoomButton = (factor: number) => {
    const next = zoomAt(liveRef.current, 0.5, 0.5, factor, limits);
    preview(next);
    commit(next);
  };

  useEffect(
    () => () => {
      if (settleRef.current) clearTimeout(settleRef.current);
      if (rafRef.current && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { limits: lim, size: s } = latest.current;
      const { pw, ph } = plotArea(s);
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - M.left;
      const y = e.clientY - rect.top - M.top;
      if (x < 0 || y < 0 || x > pw || y > ph) return;
      e.preventDefault();
      const next = zoomAt(liveRef.current, x / pw, 1 - y / ph, wheelFactor(e.deltaY, e.deltaMode, ph), lim);
      hoverRef.current = null;
      props.onHover(null);
      preview(next);
      if (settleRef.current) clearTimeout(settleRef.current);
      settleRef.current = setTimeout(() => {
        settleRef.current = null;
        commit(liveRef.current);
      }, WHEEL_SETTLE_MS);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [preview, commit]);

  const pick = (clientX: number, clientY: number): PlotHover | null => {
    const frame = frameRef.current;
    const el = wrapRef.current;
    // Mid-gesture the pick grid belongs to the view before it: pick nothing.
    if (!frame || !el || !sameView(frame.view, liveRef.current)) return null;
    const rect = el.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    let best = -1;
    let bestD = Infinity;
    let bestK = -1;
    const x0 = Math.floor(mx);
    const y0 = Math.floor(my);
    for (let dy = -PICK_RADIUS; dy <= PICK_RADIUS; dy++) {
      const y = y0 + dy;
      if (y < 0 || y >= frame.h) continue;
      for (let dx = -PICK_RADIUS; dx <= PICK_RADIUS; dx++) {
        const x = x0 + dx;
        if (x < 0 || x >= frame.w) continue;
        const k = y * frame.w + x;
        const r = frame.owner[k];
        if (r < 0) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = r;
          bestK = k;
        }
      }
    }
    if (best < 0 || bestD > PICK_RADIUS * PICK_RADIUS) return null;
    if (rowClass(props.data, best) === MISSING_CLASS) return null;
    return { row: best, x: mx, y: my, stacked: frame.stack[bestK] };
  };

  const local = (e: { clientX: number; clientY: number }): [number, number] => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left - M.left, e.clientY - rect.top - M.top];
  };

  const startPinch = () => {
    const pts = [...pointersRef.current.values()];
    const mid0: [number, number] = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
    const dist0 = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
    gestureRef.current = { kind: 'pinch', start: liveRef.current, mid0, dist0 };
  };

  return (
    <div className="cls-plot">
    <div
      ref={wrapRef}
      className="cls-plot-surface"
      role="img"
      aria-label={props.ariaLabel}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const p = local(e);
        pointersRef.current.set(e.pointerId, p);
        e.currentTarget.setPointerCapture?.(e.pointerId);
        if (pointersRef.current.size === 2) startPinch();
        else if (pointersRef.current.size === 1) {
          gestureRef.current = { kind: 'press', id: e.pointerId, x0: p[0], y0: p[1], start: liveRef.current, moved: false };
        }
      }}
      onPointerMove={(e) => {
        const g = gestureRef.current;
        if (g && pointersRef.current.has(e.pointerId)) {
          const p = local(e);
          pointersRef.current.set(e.pointerId, p);
          const { pw, ph } = plotArea();
          if (g.kind === 'pinch' && pointersRef.current.size >= 2) {
            const pts = [...pointersRef.current.values()];
            const mid: [number, number] = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
            const dist = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
            preview(pinchView(g.start, g.mid0, mid, g.dist0, dist, pw, ph, limits));
            return;
          }
          if (g.kind === 'press' && g.id === e.pointerId) {
            const dx = p[0] - g.x0;
            const dy = p[1] - g.y0;
            if (!g.moved && Math.hypot(dx, dy) >= DRAG_SLOP) {
              g.moved = true;
              hoverRef.current = null;
              props.onHover(null);
            }
            if (g.moved) {
              preview(panBy(g.start, dx / pw, dy / ph, limits));
              return;
            }
          }
        }
        if (g?.kind === 'pinch') return;
        const hit = pick(e.clientX, e.clientY);
        const row = hit ? hit.row : null;
        if (row !== hoverRef.current) {
          hoverRef.current = row;
          drawOverlay();
        }
        props.onHover(hit);
      }}
      onPointerUp={(e) => {
        pointersRef.current.delete(e.pointerId);
        const g = gestureRef.current;
        if (!g) return;
        if (g.kind === 'pinch') {
          suppressClickRef.current = true;
          if (pointersRef.current.size === 0) {
            gestureRef.current = null;
            commit(liveRef.current);
          }
          return;
        }
        gestureRef.current = null;
        if (g.moved) {
          suppressClickRef.current = true;
          commit(liveRef.current);
        }
      }}
      onPointerCancel={(e) => {
        pointersRef.current.delete(e.pointerId);
        if (pointersRef.current.size === 0 && gestureRef.current) {
          gestureRef.current = null;
          commit(liveRef.current);
        }
      }}
      onPointerLeave={(e) => {
        if (pointersRef.current.has(e.pointerId)) return;
        hoverRef.current = null;
        drawOverlay();
        props.onHover(null);
      }}
      onClick={(e) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        const hit = pick(e.clientX, e.clientY);
        props.onPick(hit ? hit.row : null);
      }}
      onDoubleClick={resetZoom}
    >
      <canvas ref={axesRef} className="cls-plot-layer" />
      <div
        className="cls-plot-clip"
        style={{ left: M.left, top: M.top, right: M.right, bottom: M.bottom }}
      >
        <canvas ref={dotsRef} className="cls-plot-dots" />
      </div>
      <canvas ref={overlayRef} className="cls-plot-layer" />
    </div>
      <div className="cls-zoom" role="group" aria-label="Zoom">
        <button type="button" onClick={() => zoomButton(BUTTON_ZOOM)} aria-label="Zoom in" title="Zoom in (or scroll over the plot)">
          +
        </button>
        <button type="button" onClick={() => zoomButton(1 / BUTTON_ZOOM)} aria-label="Zoom out" title="Zoom out" disabled={!zoomed}>
          −
        </button>
        <button
          type="button"
          onClick={resetZoom}
          disabled={!zoomed}
          title="Back to every shown dot (or double-click the plot)"
          data-testid="cls-zoom-reset"
        >
          Reset zoom
        </button>
      </div>
    </div>
  );
}
