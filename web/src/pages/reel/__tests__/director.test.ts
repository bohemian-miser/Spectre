import { describe, expect, it } from 'vitest';
import { cameraAt, fitsCut, loadWorld, planReel, reelDefaults, stepsAt, traceTime, type ReelOptions } from '../director';

const options: ReelOptions = {
  seed: 1,
  family: 'hex',
  ...reelDefaults('hex'),
  radius: 160,
  seconds: 60,
  circuits: 6,
  fps: 30,
  bpm: 110,
  width: 540,
  height: 960,
};
const world = loadWorld(options);
const plan = planReel(options, world);
const bar = (4 * 60) / options.bpm;

describe('planReel', () => {
  it('traces circuits of a new type each time', () => {
    expect(plan.traces.length).toBeGreaterThanOrEqual(3);
    const shapes = plan.traces.map((t) => t.circuit.shape);
    expect(new Set(shapes).size).toBe(shapes.length);
    // Nothing on a traced circuit is lit before it closes.
    for (const tr of plan.traces) expect(plan.lit.get(tr.circuit.id)?.frame).toBe(Math.ceil(tr.close * options.fps - 0.5));
  });

  it('closes on bar lines and lights the type two beats later', () => {
    for (const tr of plan.traces) {
      expect(Math.abs(tr.close / bar - Math.round(tr.close / bar))).toBeLessThan(1e-9);
      expect(tr.fill - tr.close).toBeCloseTo(bar / 2, 9);
    }
    const closes = plan.log.events.filter((e) => e.type === 'close');
    expect(closes.length).toBe(plan.traces.length);
    for (const e of closes) expect(Math.abs(e.t - Math.round(e.t / bar) * bar)).toBeLessThanOrEqual(0.5 / options.fps + 1e-9);
  });

  it('logs every step in order, no trace longer than four bars', () => {
    const steps = plan.log.events.filter((e) => e.type === 'step');
    expect(steps.length).toBe(plan.traces.reduce((n, t) => n + t.points.length, 0));
    for (let i = 1; i < steps.length; i++) expect(steps[i].frame).toBeGreaterThanOrEqual(steps[i - 1].frame);
    for (const t of plan.traces) expect(t.close - t.start).toBeLessThanOrEqual(4 * bar + 1e-9);
  });

  it('picks the circuit owning the unexplored segment nearest the view', () => {
    const shown = new Set<string>();
    let at = { x: 0, y: 0 };
    for (const tr of plan.traces) {
      const nearest = (pts: readonly { x: number; y: number }[]): number => {
        let best = Infinity;
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const q = pts[(i + 1) % pts.length];
          best = Math.min(best, Math.hypot((p.x + q.x) / 2 - at.x, (p.y + q.y) / 2 - at.y));
        }
        return best;
      };
      const mine = nearest(tr.circuit.points);
      for (const c of world.circuits) {
        if (shown.has(c.shape) || !fitsCut(options, c)) continue;
        expect(nearest(c.points)).toBeGreaterThanOrEqual(mine - 1e-9);
      }
      // The trace starts on that segment.
      const [a, b] = [tr.points[0], tr.points[1]];
      expect(Math.hypot((a.x + b.x) / 2 - at.x, (a.y + b.y) / 2 - at.y)).toBeCloseTo(mine, 9);
      shown.add(tr.circuit.shape);
      at = { x: (tr.circuit.min.x + tr.circuit.max.x) / 2, y: (tr.circuit.min.y + tr.circuit.max.y) / 2 };
    }
  });

  it('stretches the traces to fill the time with fit', () => {
    const long = planReel({ ...options, seconds: 300, circuits: Infinity, fit: true }, world);
    expect(long.log.seconds).toBeGreaterThan(300 - bar);
    expect(long.log.seconds).toBeLessThanOrEqual(300);
    const bars = long.traces.map((t) => Math.round((t.close - Math.floor(t.start / bar + 1e-9) * bar) / bar));
    const longest = long.traces.reduce((k, t, i) => (t.points.length > long.traces[k].points.length ? i : k), 0);
    expect(bars[longest]).toBe(Math.max(...bars));
  });

  it('runs until nothing unexplored is left without a cap', () => {
    const open = { ...options, seconds: 600, circuits: Infinity };
    const all = planReel(open, world);
    const shown = new Set(all.traces.map((t) => t.circuit.shape));
    for (const c of world.circuits) if (fitsCut(open, c)) expect(shown.has(c.shape)).toBe(true);
  });

  it('speeds up within a trace', () => {
    expect(traceTime(0)).toBe(0);
    expect(traceTime(1)).toBeCloseTo(1, 12);
    const tr = plan.traces[0];
    const d = tr.close - tr.start;
    const early = stepsAt(tr, tr.start + 0.2 * d) - stepsAt(tr, tr.start + 0.1 * d);
    const late = stepsAt(tr, tr.start + 0.9 * d) - stepsAt(tr, tr.start + 0.8 * d);
    expect(late).toBeGreaterThan(2 * early);
  });

  it('is the same every time', () => {
    const again = planReel(options, loadWorld(options));
    expect(JSON.stringify(again.log)).toBe(JSON.stringify(plan.log));
    expect(Array.from(again.cameras)).toEqual(Array.from(plan.cameras));
  });

  it('ends pulled back over the cut', () => {
    const end = cameraAt(plan, plan.frames - 1);
    expect(end.scale).toBeLessThan(options.scale / 2);
    expect(Math.abs(end.cx) + options.width / 2 / end.scale).toBeLessThanOrEqual(options.radius + 1);
  });
});
