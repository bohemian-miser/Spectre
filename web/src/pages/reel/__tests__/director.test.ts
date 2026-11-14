import { describe, expect, it } from 'vitest';
import { cameraAt, fitsCut, loadWorld, planReel, reelColor, reelDefaults, stepsAt, traceTime, type ReelOptions } from '../director';

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

  it('logs every step in order', () => {
    const steps = plan.log.events.filter((e) => e.type === 'step');
    expect(steps.length).toBe(plan.traces.reduce((n, t) => n + t.points.length, 0));
    for (let i = 1; i < steps.length; i++) expect(steps[i].frame).toBeGreaterThanOrEqual(steps[i - 1].frame);
  });

  it('gives a trace bars by the square root of its length', () => {
    for (const t of plan.traces) {
      const bars = Math.round((t.close - Math.floor(t.start / bar + 1e-9) * bar) / bar);
      expect(bars).toBe(Math.max(1, Math.round(0.5 * Math.sqrt(t.points.length))));
    }
  });

  it('goes smallest first, each from the copy nearest where the last finished', () => {
    const lengths = plan.traces.map((t) => t.points.length);
    for (let i = 1; i < lengths.length; i++) expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]);
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
        if (c.shape !== tr.circuit.shape || !fitsCut(options, c)) continue;
        expect(nearest(c.points)).toBeGreaterThanOrEqual(mine - 1e-9);
      }
      // The trace starts on that segment.
      const [a, b] = [tr.points[0], tr.points[1]];
      expect(Math.hypot((a.x + b.x) / 2 - at.x, (a.y + b.y) / 2 - at.y)).toBeCloseTo(mine, 9);
      at = tr.points[0];
    }
  });

  it('is the start of a longer reel', () => {
    const long = planReel({ ...options, seconds: 300, circuits: Infinity }, world);
    expect(long.traces.length).toBeGreaterThanOrEqual(plan.traces.length);
    plan.traces.forEach((t, k) => {
      expect(long.traces[k].circuit.id).toBe(t.circuit.id);
      expect(long.traces[k].close).toBe(t.close);
    });
  });

  it('ends a short reel, pull-back included, inside its seconds', () => {
    const short = planReel({ ...options, seconds: 59, circuits: Infinity }, world);
    expect(short.log.seconds).toBeLessThanOrEqual(59);
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

  it('lifts the blues out of navy', () => {
    for (let k = 1; k < 40; k++) {
      const [r, g, b] = reelColor(k);
      if (b > 1.5 * Math.max(r, g)) expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeGreaterThan(80);
    }
  });

  it('ends pulled back over the cut', () => {
    const end = cameraAt(plan, plan.frames - 1);
    expect(end.scale).toBeLessThan(options.scale / 2);
    expect(Math.abs(end.cx) + options.width / 2 / end.scale).toBeLessThanOrEqual(options.radius + 1);
  });
});
