/**
 * The Classifications scatter: every combination as one dot, coloured by
 * class, on any two of the dataset's fields.
 *
 * 600k+ dots are written straight into an `ImageData` in one pass. The same
 * pass records, per CSS pixel, the last dot drawn there and how many landed on
 * it, so hover picking is a small neighbourhood search instead of a spatial
 * index. Hover and pin rings live on a second canvas so moving the pointer
 * never repaints the dots.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fieldTicks,
  fieldUnit,
  rowClass,
  MISSING_CLASS,
  type ClassificationData,
} from './data';

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

interface Frame {
  readonly w: number;
  readonly h: number;
  readonly owner: Int32Array;
  readonly stack: Uint16Array;
  readonly px: (row: number) => [number, number];
}

export function ScatterPlot(props: ScatterPlotProps): JSX.Element {
  const { data, xField, yField, visibleClass, visibleBlock, classColor, jitter, pinned } = props;
  const wrapRef = useRef<HTMLDivElement | null>(null);
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

  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = canvas.width / Math.max(1, frame.w);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, frame.w, frame.h);
    const style = getComputedStyle(canvas);
    const ink = style.getPropertyValue('--text').trim() || '#fff';
    const ring = (row: number, r: number, width: number) => {
      const [x, y] = frame.px(row);
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
  }, [pinned]);

  // Dots, axes and the pick grid.
  useEffect(() => {
    const canvas = dotsRef.current;
    const overlay = overlayRef.current;
    const { w, h } = size;
    if (!canvas || !overlay || w < 50 || h < 50) return;
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    for (const c of [canvas, overlay]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const style = getComputedStyle(canvas);
    const muted = style.getPropertyValue('--muted').trim() || '#999';
    const line = style.getPropertyValue('--line').trim() || '#444';
    const fx = data.meta.fields[xField];
    const fy = data.meta.fields[yField];

    const pw = w - M.left - M.right;
    const ph = h - M.top - M.bottom;
    const jx = jitter ? 1 / 255 : 0;
    const px = (row: number): [number, number] => {
      const u = fieldUnit(data, row, xField) + jx * hashJitter(row, 17);
      const v = fieldUnit(data, row, yField) + jx * hashJitter(row, 91);
      return [M.left + u * pw, M.top + (1 - v) * ph];
    };

    // Axes first (vector, under the dots).
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.lineWidth = 1;
    ctx.strokeStyle = line;
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const [v, u] of fieldTicks(fx)) {
      const x = Math.round(M.left + u * pw) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, M.top);
      ctx.lineTo(x, M.top + ph);
      ctx.stroke();
      ctx.fillText(fx.scale === 'log2' ? v.toLocaleString('en-US') : String(v), x, M.top + ph + 6);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const [v, u] of fieldTicks(fy)) {
      const y = Math.round(M.top + (1 - u) * ph) + 0.5;
      ctx.beginPath();
      ctx.moveTo(M.left, y);
      ctx.lineTo(M.left + pw, y);
      ctx.stroke();
      ctx.fillText(fy.scale === 'log2' ? v.toLocaleString('en-US') : String(v), M.left - 6, y);
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

    // Dots: common classes first so rare ones sit on top.
    const nClasses = data.meta.classes.length;
    const totals = new Array<number>(nClasses).fill(0);
    for (let r = 0; r < data.nRows; r++) {
      const c = rowClass(data, r);
      if (c < nClasses) totals[c]++;
    }
    const order = [...totals.keys()].sort((a, b) => totals[b] - totals[a]);
    const rgb = classColor.map(parseColor);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pix = img.data;
    const W = canvas.width;
    const H = canvas.height;
    const owner = new Int32Array(w * h).fill(-1);
    const stack = new Uint16Array(w * h);
    const dot = Math.max(2, Math.round(2 * dpr));
    for (const cls of order) {
      if (!visibleClass[cls]) continue;
      const [cr, cg, cb] = rgb[cls];
      for (let r = 0; r < data.nRows; r++) {
        if (data.rows[r * data.meta.rowBytes] !== cls || !visibleBlock[data.blockOf[r]]) continue;
        const [x, y] = px(r);
        const cx = Math.floor(x);
        const cy = Math.floor(y);
        if (cx >= 0 && cy >= 0 && cx < w && cy < h) {
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
    frameRef.current = { w, h, owner, stack, px };
    drawOverlay();
  }, [data, xField, yField, visibleClass, visibleBlock, classColor, jitter, size, drawOverlay]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  const pick = (clientX: number, clientY: number): PlotHover | null => {
    const frame = frameRef.current;
    const el = wrapRef.current;
    if (!frame || !el) return null;
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

  return (
    <div
      ref={wrapRef}
      className="cls-plot"
      role="img"
      aria-label={props.ariaLabel}
      onPointerMove={(e) => {
        const hit = pick(e.clientX, e.clientY);
        const row = hit ? hit.row : null;
        if (row !== hoverRef.current) {
          hoverRef.current = row;
          drawOverlay();
        }
        props.onHover(hit);
      }}
      onPointerLeave={() => {
        hoverRef.current = null;
        drawOverlay();
        props.onHover(null);
      }}
      onClick={(e) => {
        const hit = pick(e.clientX, e.clientY);
        props.onPick(hit ? hit.row : null);
      }}
      style={{ cursor: 'crosshair' }}
    >
      <canvas ref={dotsRef} className="cls-plot-layer" />
      <canvas ref={overlayRef} className="cls-plot-layer" />
    </div>
  );
}
