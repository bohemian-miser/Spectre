/**
 * A circuit drawn large with a mapping, at a place in the lap: the curve
 * rebuilt from the terms joined so far and the bars (spectrum), the head and
 * its line to the centroid (radius), or the fitted polygon with the corners
 * passed so far (corners). Held tones are drawn whole; distance held adds a
 * ring per held pitch. `drawShape` draws one frame at any size, for the
 * brush preview and for exported cards.
 */

import { useEffect, useMemo, useRef } from 'react';
import { FLOOR_DB, isComb, partialCurve, pointAt, shapeTerms, termLevel, termRef, type CornerFit, type Shape, type Term } from './shape';
import { PEN_START, joinedAt, penMotion, penPlan, penSteps, penStepsNow, radiusDrone, type DroneBin, type Mapping, type Play, type Settings } from './render';

/** The preview's size, CSS px; line widths are set for it and scale with the width. */
const W = 460;
const LOOP_H = 460;
const BARS_H = 170;
const BG = '#0e1118';
const FAINT = 'rgb(60,64,78)';
const TRAIL = 'rgb(250,200,80)';
const POLY = 'rgb(90,220,170)';
const CORNER = 'rgb(120,240,190)';
const ORANGE = 'rgb(250,170,60)';
const BLUE = 'rgb(90,160,240)';
const ORANGE_DIM = 'rgb(55,50,45)';
const BLUE_DIM = 'rgb(40,48,62)';
const TICK = 'rgb(150,155,170)';
const CURVE_POINTS = 800;

export interface ShapeScene {
  readonly shape: Shape;
  readonly mapping: Mapping;
  readonly play: Play;
  readonly settings: Settings;
  readonly fit: CornerFit;
}

export interface Layout {
  readonly w: number;
  /** Height of the loop's square, and of the bars under it (spectrum only). */
  readonly loopH: number;
  readonly barsH: number;
  /** Draw the bar chart's dB and k labels. */
  readonly labels: boolean;
}

export const previewLayout = (m: Mapping): Layout => ({ w: W, loopH: LOOP_H, barsH: m === 'spectrum' ? BARS_H : 0, labels: true });

/** What a scene needs worked out once rather than per frame. */
export interface Prepared {
  readonly ts: readonly Term[];
  readonly drone: readonly DroneBin[];
  curve(kmax: number): Float64Array;
}

export function prepare(s: ShapeScene): Prepared {
  const ts = s.mapping === 'spectrum' ? shapeTerms(s.shape, s.settings.spectrum.terms) : [];
  const drone = s.mapping === 'radius' && s.play === 'constant' ? radiusDrone(s.shape, s.settings.radius) : [];
  const curves = new Map<number, Float64Array>();
  return {
    ts,
    drone,
    curve(kmax) {
      let c = curves.get(kmax);
      if (!c) curves.set(kmax, (c = partialCurve(ts, kmax, CURVE_POINTS)));
      return c;
    },
  };
}

/**
 * The pen is drawn as a camera with a short shutter would see it: only the
 * stretch it covers in this window, ending at the frame's time (an eighth of
 * a 30 fps frame). A fast pen's stretch then jumps round the loop from frame
 * to frame, like a wagon wheel, instead of filling it in.
 */
export const SHUTTER = 1 / 240;
/** The most of the loop the stretch shows, so it never closes into a solid line. */
const MAX_STROKE = 0.5;

/**
 * One frame of scene `s` at `t` seconds into the lap (null: the whole lap),
 * into a context whose user space is `layout.w` by `loopH + barsH`.
 * `timeline`: `t` runs past the lap and the pen keeps going (a ramp card).
 * `penT`: seconds into the pen's own loop, when it runs on one (`penPlan`).
 */
export function drawShape(g: CanvasRenderingContext2D, s: ShapeScene, pre: Prepared, layout: Layout, t: number | null, timeline = false, penT: number | null = null): void {
  const { shape, mapping, play, settings, fit } = s;
  const { ts, drone } = pre;
  const { w: Wd, loopH, barsH } = layout;
  const H = loopH + barsH;
  const u1 = Wd / W;
  let lox = Infinity;
  let loy = Infinity;
  let hix = -Infinity;
  let hiy = -Infinity;
  for (let i = 0; i < shape.n; i++) {
    lox = Math.min(lox, shape.p[2 * i]);
    hix = Math.max(hix, shape.p[2 * i]);
    loy = Math.min(loy, shape.p[2 * i + 1]);
    hiy = Math.max(hiy, shape.p[2 * i + 1]);
  }
  const scale = (0.8 * Math.min(Wd, loopH)) / Math.max(hix - lox, hiy - loy, 1e-9);
  const ox = Wd / 2 - ((lox + hix) / 2) * scale;
  // y down, as on the map.
  const oy = loopH / 2 - ((loy + hiy) / 2) * scale;
  const X = (x: number): number => ox + x * scale;
  const Y = (y: number): number => oy + y * scale;
  const path = (xy: Float64Array, n: number, close = true): void => {
    g.beginPath();
    for (let i = 0; i < n; i++) {
      if (i === 0) g.moveTo(X(xy[0]), Y(xy[1]));
      else g.lineTo(X(xy[2 * i]), Y(xy[2 * i + 1]));
    }
    if (close) g.closePath();
  };
  const dot = (x: number, y: number, r: number, fill: string): void => {
    g.beginPath();
    g.arc(X(x), Y(y), r * u1, 0, 2 * Math.PI);
    g.fillStyle = fill;
    g.fill();
  };
  /** The loop from its start to lap share u, drawn as the trace. */
  const trail = (u: number): void => {
    const m = Math.floor(u * shape.n);
    g.beginPath();
    g.moveTo(X(shape.p[0]), Y(shape.p[1]));
    for (let i = 1; i <= m && i < shape.n; i++) g.lineTo(X(shape.p[2 * i]), Y(shape.p[2 * i + 1]));
    const [hx, hy] = pointAt(shape.p, shape.n, u);
    g.lineTo(X(hx), Y(hy));
    g.strokeStyle = TRAIL;
    g.lineWidth = 3 * u1;
    g.stroke();
  };

  g.lineJoin = 'round';
  g.fillStyle = BG;
  g.fillRect(0, 0, Wd, H);
  path(shape.full, shape.steps);
  g.strokeStyle = FAINT;
  g.lineWidth = 2 * u1;
  g.stroke();

  if (mapping === 'spectrum') {
    const K = Math.max(1, ...ts.map((x) => Math.abs(x.k)));
    const ref = ts.length ? termRef(ts) : 1;
    const kmax = t === null ? K : ts.reduce((m, x) => (joinedAt(x.k, K) <= t ? Math.max(m, Math.abs(x.k)) : m), 0);
    if (kmax > 0) {
      path(pre.curve(kmax), CURVE_POINTS);
      g.strokeStyle = TRAIL;
      g.lineWidth = 3 * u1;
      g.stroke();
    }
    const sp = settings.spectrum;
    // Steps the pen has covered now and when the shutter opened, or null where it is silent.
    let stepsNow: number | null = null;
    let stepsBefore = 0;
    if (sp.pen && t !== null) {
      if (timeline) {
        const motion = penMotion(sp);
        if (t >= PEN_START) {
          stepsNow = penSteps(motion, t - PEN_START);
          stepsBefore = penSteps(motion, Math.max(0, t - PEN_START - SHUTTER));
        }
      } else {
        const plan = penPlan(sp, shape.steps);
        const pt = penT ?? 0;
        stepsNow = penStepsNow(plan, t, pt);
        stepsBefore = penStepsNow(plan, t - SHUTTER, Math.max(0, pt - SHUTTER)) ?? stepsNow ?? 0;
      }
    }
    if (stepsNow !== null) {
      // What the shutter caught, at most half the loop; the more laps it would catch, the harder it flashes.
      const u = stepsNow / shape.steps;
      const laps = Math.max(0, u - Math.min(u, stepsBefore / shape.steps));
      const u0 = u - Math.min(laps, MAX_STROKE);
      const flash = Math.min(1, laps / MAX_STROKE);
      const m = 200;
      const pts = new Float64Array(2 * (m + 1));
      for (let i = 0; i <= m; i++) {
        const [x, y] = pointAt(shape.full, shape.steps, u0 + ((u - u0) * i) / m);
        pts[2 * i] = x;
        pts[2 * i + 1] = y;
      }
      path(pts, m + 1, false);
      g.strokeStyle = '#fff';
      g.lineWidth = (3 + 4 * flash) * u1;
      g.shadowColor = 'rgba(255,255,255,0.9)';
      g.shadowBlur = 18 * flash * u1;
      g.stroke();
      g.shadowBlur = 0;
      const [hx, hy] = pointAt(shape.full, shape.steps, u);
      dot(hx, hy, 6, '#fff');
    }

    // Bars: |c_k| in dB below term 1, negative k on the left.
    const pad = 16 * u1;
    const right = layout.labels ? 34 * u1 : pad;
    const top = loopH + 14 * u1;
    const bot = loopH + barsH - (layout.labels ? 26 : 16) * u1;
    const bw = (Wd - pad - right) / (2 * K + 1);
    g.strokeStyle = 'rgb(30,33,42)';
    g.lineWidth = u1;
    g.font = `${11 * u1}px system-ui, sans-serif`;
    g.fillStyle = 'rgb(110,115,130)';
    g.textAlign = 'left';
    for (let db = 0; db >= -40; db -= 10) {
      const yy = bot - ((db + FLOOR_DB) / FLOOR_DB) * (bot - top);
      g.beginPath();
      g.moveTo(pad, yy);
      g.lineTo(Wd - right, yy);
      g.stroke();
      if (layout.labels) g.fillText(`${db}`, Wd - 30 * u1, yy + 4 * u1);
    }
    for (const x of ts) {
      const h = termLevel(x.amp, ref) * (bot - top);
      const xx = pad + (x.k + K) * bw;
      const on = t === null || joinedAt(x.k, K) <= t;
      g.fillStyle = isComb(x.k) ? (on ? ORANGE : ORANGE_DIM) : on ? BLUE : BLUE_DIM;
      // Gaps only while bars are wide enough to keep them; hundreds of bars sit edge to edge.
      const gap = bw >= 4 ? 0.1 * bw : 0;
      g.fillRect(xx + gap, bot - h, Math.max(0.5, bw - 2 * gap), h);
    }
    g.strokeStyle = 'rgb(90,95,110)';
    g.beginPath();
    g.moveTo(pad, bot);
    g.lineTo(Wd - right, bot);
    g.stroke();
    if (layout.labels) {
      g.fillStyle = TICK;
      g.textAlign = 'center';
      for (const k of [...new Set([-K, -1, 1, K])]) g.fillText(k > 0 ? `+${k}` : `${k}`, pad + (k + K + 0.5) * bw, bot + 15 * u1);
      g.textAlign = 'left';
    }
  } else if (mapping === 'radius') {
    const lap = settings.radius.lap;
    dot(0, 0, 4, TICK);
    if (play === 'constant') {
      // One ring per held pitch, as strong as the share of the loop at that radius.
      const top = Math.max(...drone.map((b) => b.weight));
      for (const b of drone) {
        g.beginPath();
        g.arc(X(0), Y(0), Math.max(0, b.radius) * scale, 0, 2 * Math.PI);
        g.strokeStyle = `rgba(250,200,80,${(0.15 + (0.85 * b.weight) / top).toFixed(3)})`;
        g.lineWidth = 2 * u1;
        g.stroke();
      }
    }
    if (t !== null) {
      const u = Math.max(0, Math.min(1, t / lap));
      trail(u);
      const [hx, hy] = pointAt(shape.p, shape.n, u);
      g.beginPath();
      g.moveTo(X(0), Y(0));
      g.lineTo(X(hx), Y(hy));
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 1.5 * u1;
      g.stroke();
      dot(hx, hy, 7, '#fff');
    }
  } else {
    const lap = settings.corners.lap;
    const u = t === null ? 1 : Math.max(0, Math.min(1, t / lap));
    if (t !== null) trail(u);
    const cs = fit.cuts;
    const poly = new Float64Array(2 * cs.length);
    cs.forEach((i, j) => {
      poly[2 * j] = shape.full[2 * i];
      poly[2 * j + 1] = shape.full[2 * i + 1];
    });
    path(poly, cs.length);
    g.strokeStyle = POLY;
    g.lineWidth = 2 * u1;
    g.stroke();
    if (cs.length <= 400) {
      const r = (cs.length > 120 ? 3 : 5) * u1;
      for (const i of cs) {
        g.beginPath();
        g.arc(X(shape.full[2 * i]), Y(shape.full[2 * i + 1]), r, 0, 2 * Math.PI);
        if (t === null || i / shape.steps <= u) {
          g.fillStyle = CORNER;
          g.fill();
        } else {
          g.strokeStyle = CORNER;
          g.lineWidth = 1.5 * u1;
          g.stroke();
        }
      }
    }
    if (t !== null) {
      const [hx, hy] = pointAt(shape.p, shape.n, u);
      dot(hx, hy, 7, '#fff');
    }
  }
}

export interface ShapeViewProps extends ShapeScene {
  /** Seconds into the lap, or null for the whole of it at once. */
  time(): number | null;
  /** Seconds into the pen's own loop, when it has one. */
  penTime?(): number | null;
}

export function ShapeView(props: ShapeViewProps): JSX.Element {
  const { shape, mapping, play, settings, fit } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(props.time);
  timeRef.current = props.time;
  const penRef = useRef(props.penTime);
  penRef.current = props.penTime;
  const layout = previewLayout(mapping);
  const H = layout.loopH + layout.barsH;
  const scene = useMemo(() => ({ shape, mapping, play, settings, fit }), [shape, mapping, play, settings, fit]);
  const pre = useMemo(() => prepare(scene), [scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    let frame = 0;
    let still = false;
    const loop = (): void => {
      // Drawn every frame while the lap runs, once when it is held.
      const t = timeRef.current();
      if (t !== null || !still) drawShape(g, scene, pre, layout, t, false, penRef.current?.() ?? null);
      still = t === null;
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [scene, pre, layout.w, layout.loopH, layout.barsH, H]);

  return <canvas ref={canvasRef} className="shapesound-view" style={{ width: W, height: H }} data-testid="shapesound-view" />;
}
