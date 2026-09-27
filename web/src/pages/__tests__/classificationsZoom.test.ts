import { describe, expect, it } from 'vitest';
import {
  MIN_SPAN,
  clampView,
  fromPlot,
  panBy,
  pinchView,
  previewTransform,
  sameView,
  toPlot,
  wheelFactor,
  zoomAt,
  type View,
  type ViewLimits,
} from '../classifications/zoom';
import { fieldTicks, type FieldInfo } from '../classifications/data';

const unit: View = { x0: 0, x1: 1, y0: 0, y1: 1 };
const limits: ViewLimits = { bounds: unit, minSpan: MIN_SPAN };
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 9);

describe('zoom maths', () => {
  it('keeps the point under the pointer fixed', () => {
    const v: View = { x0: 0.2, x1: 0.6, y0: 0.1, y1: 0.5 };
    const fx = 0.25;
    const fy = 0.8;
    const before = [v.x0 + fx * (v.x1 - v.x0), v.y0 + fy * (v.y1 - v.y0)];
    const z = zoomAt(v, fx, fy, 2, limits);
    close(z.x1 - z.x0, 0.2);
    close(z.y1 - z.y0, 0.2);
    close(z.x0 + fx * (z.x1 - z.x0), before[0]);
    close(z.y0 + fy * (z.y1 - z.y0), before[1]);
  });

  it('stops at the bounds when zooming out and at the smallest span when zooming in', () => {
    const out = zoomAt({ x0: 0.4, x1: 0.6, y0: 0.4, y1: 0.6 }, 0.1, 0.1, 1e-3, limits);
    expect(sameView(out, unit)).toBe(true);
    const tight = zoomAt(unit, 0.5, 0.5, 1e6, limits);
    close(tight.x1 - tight.x0, MIN_SPAN);
    close((tight.x0 + tight.x1) / 2, 0.5);
  });

  it('zooms about a corner without leaving the bounds', () => {
    const z = zoomAt(unit, 0, 1, 4, limits);
    close(z.x0, 0);
    close(z.y1, 1);
    close(z.x1, 0.25);
    close(z.y0, 0.75);
  });

  it('pans with the pointer and stops at the edges', () => {
    const v: View = { x0: 0.4, x1: 0.6, y0: 0.4, y1: 0.6 };
    // Dragging right by half the plot shows what was to the left.
    const p = panBy(v, 0.5, 0, limits);
    close(p.x0, 0.3);
    // Dragging down shows what was above.
    const d = panBy(v, 0, 0.5, limits);
    close(d.y0, 0.5);
    const far = panBy(v, 100, -100, limits);
    close(far.x0, 0);
    close(far.y0, 0);
    close(far.x1 - far.x0, 0.2);
  });

  it('clamps a view that is too wide or outside the bounds', () => {
    const c = clampView({ x0: -1, x1: 3, y0: 0.9, y1: 1.3 }, limits);
    expect(sameView(c, { x0: 0, x1: 1, y0: 0.6, y1: 1 })).toBe(true);
  });

  it('pinches about the fingers and follows their midpoint', () => {
    const pw = 400;
    const ph = 200;
    const z = pinchView(unit, [200, 100], [200, 100], 50, 100, pw, ph, limits);
    expect(sameView(z, { x0: 0.25, x1: 0.75, y0: 0.25, y1: 0.75 })).toBe(true);
    const moved = pinchView(unit, [200, 100], [240, 100], 50, 100, pw, ph, limits);
    close(moved.x0, 0.25 - 0.1 * 0.5);
  });

  it('maps unit coordinates to the plot and back', () => {
    const v: View = { x0: 0.2, x1: 0.6, y0: 0.1, y1: 0.5 };
    const [x, y] = toPlot(v, 0.3, 0.4, 400, 200);
    close(x, 100);
    close(y, 50);
    const [u, w] = fromPlot(v, x, y, 400, 200);
    close(u, 0.3);
    close(w, 0.4);
  });

  it('moves the old bitmap to where the new view puts each dot', () => {
    const drawn: View = { x0: 0, x1: 1, y0: 0, y1: 1 };
    const live: View = { x0: 0.2, x1: 0.7, y0: 0.3, y1: 0.55 };
    const pw = 300;
    const ph = 200;
    const t = previewTransform(drawn, live, pw, ph);
    for (const [u, w] of [
      [0.2, 0.3],
      [0.5, 0.5],
      [0.9, 0.1],
    ]) {
      const [x0, y0] = toPlot(drawn, u, w, pw, ph);
      const [x1, y1] = toPlot(live, u, w, pw, ph);
      close(t.tx + t.sx * x0, x1);
      close(t.ty + t.sy * y0, y1);
    }
    const id = previewTransform(live, live, pw, ph);
    expect([id.sx, id.sy, id.tx, id.ty]).toEqual([1, 1, 0, 0]);
  });

  it('zooms in for wheel-up and scales line and page modes', () => {
    expect(wheelFactor(-100, 0, 500)).toBeGreaterThan(1);
    expect(wheelFactor(100, 0, 500)).toBeLessThan(1);
    close(wheelFactor(3, 1, 500), wheelFactor(48, 0, 500));
    // One huge event cannot jump the whole range.
    expect(wheelFactor(-1e6, 0, 500)).toBeLessThan(2);
  });
});

describe('axis ticks follow the zoom', () => {
  const linear: FieldInfo = { key: 'a', label: 'A', lo: 0, hi: 2.5, scale: 'linear', description: '' };
  const log: FieldInfo = { key: 'b', label: 'B', lo: 0, hi: 20, scale: 'log2', description: '', integer: true };

  it('ticks a zoomed linear range with finer steps inside it', () => {
    const ticks = fieldTicks(linear, 0.4, 0.42);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    for (const [v, u] of ticks) {
      expect(u).toBeGreaterThanOrEqual(0.4 - 1e-9);
      expect(u).toBeLessThanOrEqual(0.42 + 1e-9);
      expect(v).toBeGreaterThan(0.99);
      expect(v).toBeLessThan(1.06);
    }
  });

  it('falls back to evenly spaced whole numbers deep inside a log range', () => {
    // log2(1 + v) from 12 to 12.05: v from 4095 to about 4237.
    const ticks = fieldTicks(log, 12 / 20, 12.05 / 20);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    for (const [v] of ticks) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(4095);
      expect(v).toBeLessThanOrEqual(4240);
    }
  });
});
