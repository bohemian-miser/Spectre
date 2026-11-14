/**
 * The selected voice's circuit drawn large with its mapping, following the
 * voice's place in its clip: the curve rebuilt from the terms joined so far
 * and the bars (spectrum), the head and its line to the centroid (radius),
 * or the fitted polygon with the corners passed so far (corners).
 */

import { useEffect, useMemo, useRef } from 'react';
import { FLOOR_DB, isComb, partialCurve, pointAt, shapeTerms, termLevel, termRef, type CornerFit, type Shape } from './shape';
import { PEN_START, PRE, SPECTRUM_LAP, joinedAt, type Mapping, type Settings } from './render';

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

export interface ShapeViewProps {
  readonly shape: Shape;
  readonly mapping: Mapping;
  readonly settings: Settings;
  readonly fit: CornerFit;
  /** Seconds into the voice's clip, or null when it is not playing. */
  time(): number | null;
}

export function ShapeView(props: ShapeViewProps): JSX.Element {
  const { shape, mapping, settings, fit } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(props.time);
  timeRef.current = props.time;
  const H = LOOP_H + (mapping === 'spectrum' ? BARS_H : 0);
  const ts = useMemo(() => (mapping === 'spectrum' ? shapeTerms(shape, settings.spectrum.terms) : []), [shape, mapping, settings.spectrum.terms]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

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
    const scale = (0.8 * W) / Math.max(hix - lox, hiy - loy, 1e-9);
    const ox = W / 2 - ((lox + hix) / 2) * scale;
    const oy = LOOP_H / 2 + ((loy + hiy) / 2) * scale;
    const X = (x: number): number => ox + x * scale;
    const Y = (y: number): number => oy - y * scale;
    const path = (xy: Float64Array, n: number, count = n, close = true): void => {
      g.beginPath();
      for (let i = 0; i < count; i++) {
        if (i === 0) g.moveTo(X(xy[0]), Y(xy[1]));
        else g.lineTo(X(xy[2 * i]), Y(xy[2 * i + 1]));
      }
      if (close) g.closePath();
    };
    const dot = (x: number, y: number, r: number, fill: string): void => {
      g.beginPath();
      g.arc(X(x), Y(y), r, 0, 2 * Math.PI);
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
      g.lineWidth = 3;
      g.stroke();
    };

    const K = Math.max(1, ...ts.map((t) => Math.abs(t.k)));
    const ref = ts.length ? termRef(ts) : 1;
    const curves = new Map<number, Float64Array>();
    const curve = (kmax: number): Float64Array => {
      let c = curves.get(kmax);
      if (!c) curves.set(kmax, (c = partialCurve(ts, kmax, CURVE_POINTS)));
      return c;
    };
    let lastPen = 0;

    const draw = (): void => {
      const t = timeRef.current();
      g.fillStyle = BG;
      g.fillRect(0, 0, W, H);
      path(shape.full, shape.steps);
      g.strokeStyle = FAINT;
      g.lineWidth = 2;
      g.stroke();

      if (mapping === 'spectrum') {
        const kmax = t === null ? K : ts.reduce((m, x) => (joinedAt(x.k, K) <= t ? Math.max(m, Math.abs(x.k)) : m), 0);
        if (kmax > 0) {
          path(curve(kmax), CURVE_POINTS);
          g.strokeStyle = TRAIL;
          g.lineWidth = 3;
          g.stroke();
        }
        const s = settings.spectrum;
        if (s.pen && t !== null && t >= PEN_START && t <= PRE + SPECTRUM_LAP) {
          const u1 = (s.penSpeed * (t - PEN_START)) / shape.steps;
          const u0 = Math.max(0, Math.min(lastPen, u1));
          const pts: number[] = [];
          const all = u1 - u0 >= 1;
          const m = all ? CURVE_POINTS : 200;
          for (let i = 0; i <= m; i++) pts.push(...pointAt(shape.full, shape.steps, all ? i / m : u0 + ((u1 - u0) * i) / m));
          path(Float64Array.from(pts), m + 1, m + 1, false);
          g.strokeStyle = '#fff';
          g.lineWidth = 3;
          g.stroke();
          const [hx, hy] = pointAt(shape.full, shape.steps, u1);
          dot(hx, hy, 6, '#fff');
          lastPen = u1;
        } else lastPen = 0;

        // Bars: |c_k| in dB below term 1, negative k on the left.
        const top = LOOP_H + 14;
        const bot = LOOP_H + BARS_H - 26;
        const x0 = 16;
        const bw = (W - 52) / (2 * K + 1);
        g.strokeStyle = 'rgb(30,33,42)';
        g.lineWidth = 1;
        g.font = '11px system-ui, sans-serif';
        g.fillStyle = 'rgb(110,115,130)';
        g.textAlign = 'left';
        for (let db = 0; db >= -40; db -= 10) {
          const yy = bot - ((db + FLOOR_DB) / FLOOR_DB) * (bot - top);
          g.beginPath();
          g.moveTo(x0, yy);
          g.lineTo(W - 34, yy);
          g.stroke();
          g.fillText(`${db}`, W - 30, yy + 4);
        }
        for (const x of ts) {
          const h = termLevel(x.amp, ref) * (bot - top);
          const xx = x0 + (x.k + K) * bw;
          const on = t === null || joinedAt(x.k, K) <= t;
          g.fillStyle = isComb(x.k) ? (on ? ORANGE : ORANGE_DIM) : on ? BLUE : BLUE_DIM;
          g.fillRect(xx + 1, bot - h, Math.max(1, bw - 2), h);
        }
        g.strokeStyle = 'rgb(90,95,110)';
        g.beginPath();
        g.moveTo(x0, bot);
        g.lineTo(W - 34, bot);
        g.stroke();
        g.fillStyle = TICK;
        g.textAlign = 'center';
        for (const k of [...new Set([-K, -1, 1, K])]) g.fillText(k > 0 ? `+${k}` : `${k}`, x0 + (k + K + 0.5) * bw, bot + 15);
        g.textAlign = 'left';
      } else if (mapping === 'radius') {
        const lap = settings.radius.lap;
        dot(0, 0, 4, TICK);
        if (t !== null) {
          const u = Math.max(0, Math.min(1, (t - PRE) / lap));
          trail(u);
          const [hx, hy] = pointAt(shape.p, shape.n, u);
          g.beginPath();
          g.moveTo(X(0), Y(0));
          g.lineTo(X(hx), Y(hy));
          g.strokeStyle = 'rgba(255,255,255,0.5)';
          g.lineWidth = 1.5;
          g.stroke();
          dot(hx, hy, 7, '#fff');
        }
      } else {
        const lap = settings.corners.lap;
        const u = t === null ? 1 : Math.max(0, Math.min(1, (t - PRE) / lap));
        if (t !== null) trail(u);
        const cs = fit.cuts;
        const poly = new Float64Array(2 * cs.length);
        cs.forEach((i, j) => {
          poly[2 * j] = shape.full[2 * i];
          poly[2 * j + 1] = shape.full[2 * i + 1];
        });
        path(poly, cs.length);
        g.strokeStyle = POLY;
        g.lineWidth = 2;
        g.stroke();
        if (cs.length <= 400) {
          const r = cs.length > 120 ? 3 : 5;
          for (const i of cs) {
            g.beginPath();
            g.arc(X(shape.full[2 * i]), Y(shape.full[2 * i + 1]), r, 0, 2 * Math.PI);
            if (t === null || i / shape.steps <= u) {
              g.fillStyle = CORNER;
              g.fill();
            } else {
              g.strokeStyle = CORNER;
              g.lineWidth = 1.5;
              g.stroke();
            }
          }
        }
        if (t !== null) {
          const [hx, hy] = pointAt(shape.p, shape.n, u);
          dot(hx, hy, 7, '#fff');
        }
      }
    };

    let frame = 0;
    let still = false;
    const loop = (): void => {
      // A voice that is not playing is drawn once.
      const playing = timeRef.current() !== null;
      if (playing || !still) draw();
      still = !playing;
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [shape, mapping, settings, fit, ts, H]);

  return <canvas ref={canvasRef} className="shapesound-view" style={{ width: W, height: H }} data-testid="shapesound-view" />;
}
