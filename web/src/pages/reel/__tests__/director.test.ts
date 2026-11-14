import { describe, expect, it } from 'vitest';
import { cameraAt, loadWorld, planReel, reelDefaults, stepsAt, traceTime, type ReelOptions } from '../director';

const options: ReelOptions = {
  seed: 1,
  family: 'hex',
  ...reelDefaults('hex'),
  seconds: 30,
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

  it('logs every step in order, each trace faster than the last', () => {
    const steps = plan.log.events.filter((e) => e.type === 'step');
    expect(steps.length).toBe(plan.traces.reduce((n, t) => n + t.points.length, 0));
    for (let i = 1; i < steps.length; i++) expect(steps[i].frame).toBeGreaterThanOrEqual(steps[i - 1].frame);
    const pace = plan.traces.map((t) => t.points.length / (t.close - t.start));
    for (let i = 1; i < pace.length; i++) expect(pace[i]).toBeGreaterThan(pace[i - 1]);
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
