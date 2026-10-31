/**
 * A pan and zoom canvas for many lines in one supertile's frame (y up).
 *
 * The lines are drawn into a bitmap for one camera, a slice of lines per
 * animation frame, then shown; while the camera moves the last bitmap is
 * moved and scaled with it, and once it rests the lines are drawn again at
 * the detail the new zoom asks for. Outlines and marks are few and drawn
 * every frame. Pointing finds the nearest line through a grid of the
 * drawn segments.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePanZoom } from '../../hooks/usePanZoom';
import type { Pt } from '../../core';
import type { Box, Camera } from '../../lib/viewport';
import type { PointSource } from './viewer';

export interface LineStyle {
  readonly color: string;
  readonly width: number;
  readonly alpha: number;
}

/** The lines the viewer draws, given by index. */
export interface Lines {
  /** Changes when the lines change. */
  readonly key: string;
  readonly count: number;
  /** Line i as x, y pairs (y up), down to level `stop`, children outside `view` passed over, handed out in chunks. */
  points(i: number, stop: number, view: Box | null, edgeStop: number): PointSource;
  /** Index into `styles`. */
  style(i: number): number;
  readonly styles: readonly LineStyle[];
  /** The level to draw down to at `scale` pixels per unit, with this fraction of the frame in view. */
  stop(scale: number, inView: number): number;
  /** The level to draw down to next to the outline (as fine as the outline is drawn); `stop` when not given. */
  edge?(scale: number): number;
}

/** Something drawn over the lines every frame: a line, or dots. */
export interface Mark {
  readonly pts: Float64Array;
  readonly color: string;
  readonly width: number;
  readonly dots?: boolean;
  readonly fill?: string;
}

export interface ViewerApi {
  /** Frame a box (y up). */
  fit(box: Box): void;
  /** Show exactly a box (y up), as large as fits. */
  show(box: Box): void;
}

interface Drawn {
  readonly key: string;
  readonly cam: Camera;
  readonly canvas: HTMLCanvasElement;
  readonly stop: number;
  /** Per line, its points on the canvas (css px), as drawn. */
  readonly scr: (Float32Array | undefined)[];
  /** Cell -> pairs (line, segment). */
  readonly grid: Map<number, number[]>;
  done: boolean;
  marks: Mark[];
}

const CELL = 10;
/** Each mark's box (x0, y0, x1, y1), worked out once. */
const boxes = new WeakMap<Mark, number[]>();
/** Points taken from a line at a time. */
const CHUNK = 4000;
/** Milliseconds of drawing per animation frame. */
const SLICE = 10;
/** Milliseconds the camera rests before the lines are drawn again. */
const REST = 140;
/** Pixels a press may move and still count as a click. */
const CLICK = 4;

const flip = (b: Box): Box => ({ min: { x: b.min.x, y: -b.max.y }, max: { x: b.max.x, y: -b.min.y } });

export function Viewer(props: {
  frame: Box;
  fitKey: string;
  lines: Lines;
  /** Outlines and marks, worked out for a level and view when the lines are drawn. */
  marks: (stop: number, view: Box | null) => Mark[];
  /** Marks that follow the pointer or a selection, drawn every frame. */
  live?: Mark[];
  hovered?: number | null;
  /** Lines drawn again on top, as last drawn, every frame. */
  highlight?: readonly { readonly i: number; readonly color: string; readonly width: number }[];
  onHover?: (i: number | null) => void;
  onPick?: (i: number | null) => void;
  tooltip?: (i: number) => string;
  apiRef?: React.MutableRefObject<ViewerApi | null>;
  /** The box in view (y up), each time the camera moves. */
  onView?: (view: Box, resized: boolean) => void;
  /** The point under the pointer (y up), or null when it leaves. */
  onPoint?: (p: Pt | null) => void;
  /** On a resize, keep the centre and scale with the height instead of framing again; the lines are drawn again once the size rests. */
  keepOnResize?: boolean;
  label: string;
  className?: string;
  children?: ReactNode;
}): JSX.Element {
  const host = useRef<HTMLDivElement | null>(null);
  const cv = useRef<HTMLCanvasElement | null>(null);
  const sized = useRef({ width: 0, height: 0 });
  /** The size at the last camera change: a change with a new size comes from a resize. */
  const sizeAtView = useRef({ width: 0, height: 0 });
  const viewOf = (c: Camera): Box => {
    const { width: W, height: H } = sized.current;
    return { min: { x: -c.x / c.scale, y: (c.y - H) / c.scale }, max: { x: (W - c.x) / c.scale, y: c.y / c.scale } };
  };
  const pz = usePanZoom(host, {
    fitBounds: flip(props.frame),
    fitKey: props.fitKey,
    padding: 0.04,
    minScale: 1e-4,
    maxScale: 1e5,
    onCameraChange: (c) => {
      const s = sized.current, was = sizeAtView.current;
      sizeAtView.current = s;
      live.current.onView?.(viewOf(c), s.width !== was.width || s.height !== was.height);
    },
    keepOnResize: props.keepOnResize,
  });
  sized.current = pz.size;
  const cam = pz.camera;
  const drawn = useRef<Drawn | null>(null);
  const job = useRef<Drawn | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const live = useRef(props);
  live.current = props;
  const camRef = useRef(cam);
  camRef.current = cam;
  const sizeRef = useRef(pz.size);
  sizeRef.current = pz.size;
  const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);

  // css px of a point (y up) under a camera
  const sx = (c: Camera, x: number) => x * c.scale + c.x;
  const sy = (c: Camera, y: number) => -y * c.scale + c.y;

  const paint = useCallback(() => {
    const c = cv.current;
    const size = sizeRef.current;
    if (!c || size.width <= 0) return;
    const W = Math.round(size.width * dpr), H = Math.round(size.height * dpr);
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
      // the canvas shows its pixels one to one
      c.style.width = `${W / dpr}px`;
      c.style.height = `${H / dpr}px`;
    }
    const g = c.getContext('2d')!;
    const now = camRef.current;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    // the newest drawing of these lines: the finished one, or the one in progress when the lines changed
    const d = drawn.current && drawn.current.key === live.current.lines.key ? drawn.current : job.current ?? drawn.current;
    if (d) {
      const r = now.scale / d.cam.scale;
      g.imageSmoothingEnabled = true;
      g.drawImage(d.canvas, (now.x - d.cam.x * r) * dpr, (now.y - d.cam.y * r) * dpr, d.canvas.width * r, d.canvas.height * r);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(c);
    const color = (v: string) => (v.startsWith('--') ? css.getPropertyValue(v).trim() || '#888' : v);
    if (d) {
      const r = now.scale / d.cam.scale;
      for (const h of live.current.highlight ?? []) {
        const s = d.scr[h.i];
        if (!s) continue;
        g.beginPath();
        for (let j = 0; j < s.length; j += 2) {
          const X = now.x + (s[j] - d.cam.x) * r, Y = now.y + (s[j + 1] - d.cam.y) * r;
          if (j === 0) g.moveTo(X, Y);
          else g.lineTo(X, Y);
        }
        g.strokeStyle = color(h.color);
        g.lineWidth = h.width;
        g.lineJoin = 'round';
        g.lineCap = 'round';
        g.stroke();
      }
    }
    const marks = [...(d?.marks ?? []), ...(live.current.live ?? [])];
    const vw = size.width, vh = size.height;
    for (const m of marks) {
      // marks out of view are passed over
      let box = boxes.get(m);
      if (!box) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, run = 0;
        for (let i = 0; i < m.pts.length; i += 2) {
          x0 = Math.min(x0, m.pts[i]); x1 = Math.max(x1, m.pts[i]);
          y0 = Math.min(y0, m.pts[i + 1]); y1 = Math.max(y1, m.pts[i + 1]);
          if (i) run += Math.abs(m.pts[i] - m.pts[i - 2]) + Math.abs(m.pts[i + 1] - m.pts[i - 1]);
        }
        // the box, and the mean step between points
        boxes.set(m, (box = [x0, y0, x1, y1, run / Math.max(1, m.pts.length / 2 - 1)]));
      }
      if (sx(now, box[2]) < -8 || sx(now, box[0]) > vw + 8 || sy(now, box[1]) < -8 || sy(now, box[3]) > vh + 8) continue;
      if (m.dots) {
        g.fillStyle = color(m.color);
        for (let i = 0; i < m.pts.length; i += 2) {
          g.beginPath();
          g.arc(sx(now, m.pts[i]), sy(now, m.pts[i + 1]), m.width, 0, 2 * Math.PI);
          g.fill();
        }
        continue;
      }
      g.beginPath();
      // points within half a pixel of the last one drawn are passed over; the last point always kept
      let lx = 0, ly = 0;
      const last = m.pts.length - 2;
      // a long line seen from far: every stride-th point, the stride keeping the mean step near half a pixel
      const stride = 2 * Math.max(1, Math.floor(0.5 / (box[4] * now.scale || 1)));
      for (let i = 0; i < m.pts.length; i = i < last && i + stride > last ? last : i + stride) {
        const X = sx(now, m.pts[i]), Y = sy(now, m.pts[i + 1]);
        if (i === 0) g.moveTo(X, Y);
        else if (i === last || Math.abs(X - lx) >= 0.5 || Math.abs(Y - ly) >= 0.5) g.lineTo(X, Y);
        else continue;
        lx = X;
        ly = Y;
      }
      if (m.fill) {
        g.fillStyle = color(m.fill);
        g.fill();
      }
      if (m.width > 0) {
        g.strokeStyle = color(m.color);
        g.lineWidth = m.width;
        g.lineJoin = 'round';
        g.lineCap = 'round';
        g.stroke();
      }
    }
  }, [dpr]);

  const frameReq = useRef(0);
  const repaint = useCallback(() => {
    if (frameReq.current) return;
    frameReq.current = requestAnimationFrame(() => {
      frameReq.current = 0;
      paint();
    });
  }, [paint]);

  // draws the lines for the camera as it is now, a slice per animation frame
  const redraw = useCallback(() => {
    const size = sizeRef.current;
    if (size.width <= 0 || !host.current) return;
    const { lines, frame } = live.current;
    const c = { ...camRef.current };
    const css = getComputedStyle(host.current);
    const view: Box = {
      min: { x: (-0.25 * size.width - c.x) / c.scale, y: (c.y - 1.25 * size.height) / c.scale },
      max: { x: (1.25 * size.width - c.x) / c.scale, y: (c.y + 0.25 * size.height) / c.scale },
    };
    const ix = Math.max(0, Math.min(view.max.x, frame.max.x) - Math.max(view.min.x, frame.min.x));
    const iy = Math.max(0, Math.min(view.max.y, frame.max.y) - Math.max(view.min.y, frame.min.y));
    const fa = (frame.max.x - frame.min.x) * (frame.max.y - frame.min.y) || 1;
    const inView = Math.min(1, (ix * iy) / fa);
    const whole = inView >= 0.999 && view.min.x <= frame.min.x && view.min.y <= frame.min.y && view.max.x >= frame.max.x && view.max.y >= frame.max.y;
    const stop = lines.stop(c.scale, inView);
    const edgeStop = Math.min(stop, lines.edge ? lines.edge(c.scale) : stop);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    const d: Drawn = { key: lines.key, cam: c, canvas, stop, scr: [], grid: new Map(), done: false, marks: live.current.marks(stop, whole ? null : view) };
    job.current = d;
    const g = canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const colors = lines.styles.map((s) => (s.color.startsWith('--') ? css.getPropertyValue(s.color).trim() || '#888' : s.color));
    let i = 0;
    const W = size.width, H = size.height;
    // the line being drawn: its source, the points so far (css px), the last point
    let src: PointSource | null = null;
    let parts: Float32Array[] = [];
    let got = 0;
    let lx = 0, ly = 0;
    // the last point passed over for being too close, kept if the line ends on it
    let skipped = false, rx = 0, ry = 0;
    const step = () => {
      if (job.current !== d) return;
      const t0 = performance.now();
      const paths = lines.styles.map(() => new Path2D());
      while (i < lines.count && performance.now() - t0 < SLICE) {
        if (!src) {
          src = lines.points(i, stop, whole ? null : view, edgeStop);
          parts = [];
          got = 0;
        }
        const pts = src.take(CHUNK);
        if (!pts) {
          // the line's last point is kept even when it fell within half a pixel of the one before
          if (skipped) {
            const tail = Float32Array.of(rx, ry);
            const p = paths[lines.style(i)];
            p.moveTo(lx, ly);
            p.lineTo(rx, ry);
            parts.push(tail);
            got += 2;
            skipped = false;
          }
          // the line is done: keep its points for pointing at it
          const all = new Float32Array(got);
          let o = 0;
          for (const q of parts) { all.set(q, o); o += q.length; }
          d.scr[i] = all;
          src = null;
          i++;
          continue;
        }
        const s = new Float32Array(pts.length);
        const p = paths[lines.style(i)];
        if (got > 0) p.moveTo(lx, ly);
        let w = 0;
        for (let q = 0; q < pts.length; q += 2) {
          const X = pts[q] * c.scale + c.x, Y = -pts[q + 1] * c.scale + c.y;
          const first = got === 0 && w === 0;
          const px0 = w > 0 ? s[w - 2] : lx, py0 = w > 0 ? s[w - 1] : ly;
          // points within half a pixel of the last one drawn add nothing but jaggedness
          if (!first && Math.abs(X - px0) < 0.5 && Math.abs(Y - py0) < 0.5) {
            skipped = true;
            rx = X;
            ry = Y;
            continue;
          }
          skipped = false;
          s[w] = X;
          s[w + 1] = Y;
          const j = w;
          w += 2;
          if (first) p.moveTo(X, Y);
          else p.lineTo(X, Y);
          if (!first) {
            const x0 = px0, y0 = py0;
            if ((X < 0 && x0 < 0) || (X > W && x0 > W) || (Y < 0 && y0 < 0) || (Y > H && y0 > H)) continue;
            const cx0 = Math.floor(Math.min(X, x0) / CELL), cx1 = Math.floor(Math.max(X, x0) / CELL);
            const cy0 = Math.floor(Math.min(Y, y0) / CELL), cy1 = Math.floor(Math.max(Y, y0) / CELL);
            if ((cx1 - cx0 + 1) * (cy1 - cy0 + 1) > 400) continue;
            // the segment ending at this point starts at index got + j - 2 of the line's points
            for (let a = cx0; a <= cx1; a++) {
              for (let b = cy0; b <= cy1; b++) {
                const key = a * 100003 + b;
                const cell = d.grid.get(key);
                if (cell) cell.push(i, got + j - 2);
                else d.grid.set(key, [i, got + j - 2]);
              }
            }
          }
        }
        if (w) { lx = s[w - 2]; ly = s[w - 1]; }
        parts.push(s.subarray(0, w));
        got += w;
      }
      lines.styles.forEach((st, k) => {
        g.strokeStyle = colors[k];
        g.globalAlpha = st.alpha;
        g.lineWidth = st.width;
        g.stroke(paths[k]);
      });
      if (i < lines.count) requestAnimationFrame(step);
      else {
        d.done = true;
        drawn.current = d;
        job.current = null;
      }
      repaint();
    };
    requestAnimationFrame(step);
  }, [dpr, repaint]);

  // the lines changed, or the view size: draw them again now; the camera moved: once it rests.
  // With keepOnResize a resize moves the camera too, so the last drawing is shown moved and scaled until it rests.
  const rest = useRef(0);
  useEffect(() => {
    redraw();
  }, [props.lines, redraw]);
  const sizedOnce = useRef(false);
  useEffect(() => {
    if (!sizedOnce.current) {
      sizedOnce.current = true;
      return;
    }
    if (props.keepOnResize && drawn.current) repaint();
    else redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pz.size.width, pz.size.height]);
  useEffect(() => {
    repaint();
    clearTimeout(rest.current);
    rest.current = window.setTimeout(() => {
      const d = job.current ?? drawn.current;
      const c = camRef.current;
      if (!d || d.cam.x !== c.x || d.cam.y !== c.y || d.cam.scale !== c.scale) redraw();
    }, REST);
  }, [cam, repaint, redraw]);
  useEffect(() => repaint(), [props.live, props.highlight, repaint]);
  useEffect(() => () => { job.current = null; clearTimeout(rest.current); cancelAnimationFrame(frameReq.current); frameReq.current = 0; }, []);

  useEffect(() => {
    if (props.apiRef) props.apiRef.current = { fit: (b: Box) => pz.zoomToFit(flip(b), 0.08), show: (b: Box) => pz.zoomToFit(flip(b), 0) };
  }, [props.apiRef, pz]);

  /** The line nearest a point (css px in the host), within a few pixels. */
  const nearest = (px: number, py: number): number | null => {
    const d = drawn.current;
    if (!d || d.key !== live.current.lines.key) return null;
    const now = camRef.current;
    const r = now.scale / d.cam.scale;
    const bx = d.cam.x + (px - now.x) / r, by = d.cam.y + (py - now.y) / r;
    const reach = 6 / r;
    let best: number | null = null, bestD = reach;
    const c0 = Math.floor((bx - reach) / CELL), c1 = Math.floor((bx + reach) / CELL);
    const r0 = Math.floor((by - reach) / CELL), r1 = Math.floor((by + reach) / CELL);
    for (let a = c0; a <= c1; a++) {
      for (let b = r0; b <= r1; b++) {
        const cell = d.grid.get(a * 100003 + b);
        if (!cell) continue;
        for (let q = 0; q < cell.length; q += 2) {
          const s = d.scr[cell[q]]!, j = cell[q + 1];
          const x0 = s[j], y0 = s[j + 1], x1 = s[j + 2], y1 = s[j + 3];
          const vx = x1 - x0, vy = y1 - y0;
          const t = Math.max(0, Math.min(1, ((bx - x0) * vx + (by - y0) * vy) / (vx * vx + vy * vy || 1)));
          const dist = Math.hypot(bx - x0 - t * vx, by - y0 - t * vy);
          // the later line wins a tie: it is drawn on top
          if (dist < bestD || (dist === bestD && best !== null && cell[q] > best)) { bestD = dist; best = cell[q]; }
        }
      }
    }
    return best;
  };

  const press = useRef<{ x: number; y: number } | null>(null);
  const local = (e: React.PointerEvent) => {
    const r = host.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onMove = (e: React.PointerEvent) => {
    if (pz.panning) {
      setTip(null);
      return;
    }
    const p = local(e);
    if (live.current.onPoint) {
      const c = camRef.current;
      live.current.onPoint({ x: (p.x - c.x) / c.scale, y: -(p.y - c.y) / c.scale });
    }
    const i = nearest(p.x, p.y);
    if (i !== (live.current.hovered ?? null)) live.current.onHover?.(i);
    setTip(i !== null && props.tooltip ? { x: p.x, y: p.y, text: props.tooltip(i) } : null);
  };

  return (
    <div className={`bv-viewer${props.className ? ` ${props.className}` : ''}`}>
      {/* on a touch screen the drawing takes every drag; this strip scrolls the page */}
      <div className="bv-grip" aria-hidden="true" />
      <div
        ref={host}
        className={`bv-surface${pz.panning ? ' is-panning' : ''}`}
        style={{ touchAction: 'none' }}
        aria-label={props.label}
        role="img"
        onPointerMove={onMove}
        onPointerLeave={() => { setTip(null); props.onHover?.(null); props.onPoint?.(null); }}
        onPointerDown={(e) => { press.current = local(e); }}
        onPointerUp={(e) => {
          const p = local(e);
          if (press.current && Math.hypot(p.x - press.current.x, p.y - press.current.y) < CLICK) props.onPick?.(nearest(p.x, p.y));
          press.current = null;
        }}
        data-testid="bv-surface"
      >
        <canvas ref={cv} className="bv-canvas" />
        {tip && (
          <div className="bv-tip" style={tip.x > pz.size.width / 2 ? { right: pz.size.width - tip.x + 12, top: tip.y + 12 } : { left: tip.x + 12, top: tip.y + 12 }}>
            {tip.text}
          </div>
        )}
      </div>
      <div className="bv-tools" data-panzoom-ignore="">
        <button type="button" onClick={() => pz.zoomBy(1.5)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => pz.zoomBy(1 / 1.5)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => pz.zoomToFit(flip(props.frame), 0.04)} data-testid="bv-fit">Fit</button>
      </div>
      {props.children}
    </div>
  );
}
