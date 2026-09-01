/**
 * The stabilised follow camera, frame by frame.
 *
 * These tests run the real update at 60 fps against synthetic trails and
 * assert the properties the module exists for — the ones whose absence is
 * visible in a recording:
 *
 *  - it settles on a stationary head and then writes nothing;
 *  - a burst in the odometer becomes smooth acceleration, never a teleport;
 *  - steady-pace tracking holds a stable, bounded lag (the old cap's yo-yo —
 *    fall behind, surge, fall behind — is the regression this pins);
 *  - the chord-to-chord zig-zag of the path is filtered out of the motion;
 *  - the trimmed-window and max-behind clamps hold.
 */
import { describe, expect, it } from 'vitest';
import {
  FOLLOW_DOLLY_MAX_BEHIND_VIEWPORTS,
  FOLLOW_SETTLE_PX,
  advanceFollowCamera,
  createFollowCamera,
  pointAtArc,
  type FollowCameraState,
  type TrailArcView,
} from '../followCamera';

/** A growable trail with the same shape the walk keeps. */
class TestTrail implements TrailArcView {
  xy = new Float64Array(4096 * 2);
  arc = new Float64Array(4096);
  count = 0;

  push(x: number, y: number): void {
    if (this.count === this.arc.length) {
      const xy = new Float64Array(this.arc.length * 4);
      xy.set(this.xy);
      const arc = new Float64Array(this.arc.length * 2);
      arc.set(this.arc);
      this.xy = xy;
      this.arc = arc;
    }
    const i = this.count;
    const step =
      i === 0 ? 0 : Math.hypot(x - this.xy[(i - 1) * 2], y - this.xy[(i - 1) * 2 + 1]);
    this.xy[i * 2] = x;
    this.xy[i * 2 + 1] = y;
    this.arc[i] = (i === 0 ? 0 : this.arc[i - 1]) + step;
    this.count = i + 1;
  }
}

const DT = 16;
const SCALE = 36; // CSS px per world unit
const VIEW_MIN = 20; // world units of min viewport dimension

interface Sim {
  readonly trail: TestTrail;
  readonly state: FollowCameraState;
  cam: { x: number; y: number };
  /** Distance the camera moved each frame, newest last. */
  readonly steps: number[];
  settled: boolean;
  frame(): void;
}

function makeSim(trail: TestTrail, camAt?: { x: number; y: number }): Sim {
  const head = { x: trail.xy[(trail.count - 1) * 2], y: trail.xy[(trail.count - 1) * 2 + 1] };
  const sim: Sim = {
    trail,
    state: createFollowCamera(trail),
    cam: camAt ?? head,
    steps: [],
    settled: false,
    frame() {
      const out = advanceFollowCamera(sim.state, trail, sim.cam, DT, VIEW_MIN, SCALE);
      sim.steps.push(Math.hypot(out.cx - sim.cam.x, out.cy - sim.cam.y));
      sim.cam = { x: out.cx, y: out.cy };
      sim.settled = out.settled;
    },
  };
  return sim;
}

function line(length: number, step = 1): TestTrail {
  const t = new TestTrail();
  for (let x = 0; x <= length + 1e-9; x += step) t.push(x, 0);
  return t;
}

describe('pointAtArc', () => {
  it('clamps to the window and lerps between points', () => {
    const t = new TestTrail();
    t.push(0, 0);
    t.push(2, 0);
    t.push(2, 2);
    expect(pointAtArc(t, -5)).toEqual({ x: 0, y: 0 });
    expect(pointAtArc(t, 99)).toEqual({ x: 2, y: 2 });
    expect(pointAtArc(t, 1)).toEqual({ x: 1, y: 0 });
    expect(pointAtArc(t, 3)).toEqual({ x: 2, y: 1 });
    // Exactly on a vertex.
    expect(pointAtArc(t, 2)).toEqual({ x: 2, y: 0 });
  });

  it('survives zero-length segments and a one-point trail', () => {
    const t = new TestTrail();
    t.push(1, 1);
    expect(pointAtArc(t, 0.5)).toEqual({ x: 1, y: 1 });
    t.push(1, 1); // degenerate chord
    t.push(3, 1);
    expect(pointAtArc(t, 0)).toEqual({ x: 1, y: 1 });
    expect(pointAtArc(t, 1)).toEqual({ x: 2, y: 1 });
  });

  it('respects a trimmed window whose odometer does not start at zero', () => {
    const t = new TestTrail();
    t.push(0, 0);
    t.push(10, 0);
    // Fake a trim: rebase the window so arc[0] = 5 at world x = 5.
    t.xy[0] = 5;
    t.arc[0] = 5;
    t.arc[1] = 10;
    expect(pointAtArc(t, 0)).toEqual({ x: 5, y: 0 });
    expect(pointAtArc(t, 7.5)).toEqual({ x: 7.5, y: 0 });
  });
});

describe('advanceFollowCamera — engage and settle', () => {
  it('glides to a stationary head without overshoot and then writes nothing', () => {
    const trail = line(10);
    const sim = makeSim(trail, { x: -8, y: 0 }); // 18 units short of the head
    let frames = 0;
    while (!sim.settled && frames < 600) {
      sim.frame();
      frames++;
      // Never past the head: the trail ends at x = 10.
      expect(sim.cam.x).toBeLessThanOrEqual(10 + 1e-6);
    }
    expect(sim.settled).toBe(true);
    expect(frames).toBeLessThan(400); // well under ~6.4 s of wall clock
    expect(Math.hypot(sim.cam.x - 10, sim.cam.y) * SCALE).toBeLessThan(FOLLOW_SETTLE_PX);

    // Settled means settled: further frames suggest no movement at all.
    const at = { ...sim.cam };
    for (let i = 0; i < 20; i++) sim.frame();
    expect(sim.settled).toBe(true);
    expect(sim.cam).toEqual(at);
  });

  it('engages at a stately pace: no first-frame teleport however far the head', () => {
    const trail = line(10);
    const sim = makeSim(trail, { x: -30, y: 0 }); // two viewports away
    sim.frame();
    // One frame may cover at most a modest slice of a viewport, not the gap.
    expect(sim.steps[0]).toBeLessThan(VIEW_MIN * 0.3);
  });
});

describe('advanceFollowCamera — bursts become acceleration', () => {
  it('ramps smoothly after the odometer leaps by half a viewport', () => {
    const trail = line(2);
    const sim = makeSim(trail);
    for (let i = 0; i < 120 && !sim.settled; i++) sim.frame();
    expect(sim.settled).toBe(true);

    // The walk drinks a feed cut: 10 world units land in one frame.
    for (let x = 3; x <= 12; x++) trail.push(x, 0);
    sim.steps.length = 0;
    sim.frame();
    // No lurch: the dolly has barely moved yet, so neither has the camera.
    expect(sim.steps[0]).toBeLessThan(0.1);
    for (let i = 0; i < 200 && !sim.settled; i++) sim.frame();
    // Acceleration, not a jump: consecutive steps grow gradually.
    for (let i = 1; i < sim.steps.length; i++) {
      expect(sim.steps[i]).toBeLessThan(sim.steps[i - 1] * 1.8 + 0.05);
    }
    // And it does arrive.
    expect(sim.settled).toBe(true);
    expect(Math.abs(sim.cam.x - 12) * SCALE).toBeLessThan(FOLLOW_SETTLE_PX);
  });

  it('clamps the dolly to a viewport behind after a runaway burst', () => {
    const trail = line(2);
    const sim = makeSim(trail);
    sim.frame();
    for (let x = 3; x <= 500; x++) trail.push(x, 0);
    sim.frame();
    const total = trail.arc[trail.count - 1];
    expect(sim.state.arc).toBeGreaterThanOrEqual(
      total - FOLLOW_DOLLY_MAX_BEHIND_VIEWPORTS * VIEW_MIN - 1e-9,
    );
    // The camera still catches the head in bounded time.
    for (let i = 0; i < 800 && !sim.settled; i++) sim.frame();
    expect(sim.settled).toBe(true);
  });
});

describe('advanceFollowCamera — steady pace', () => {
  /**
   * 30 world units/s on a 20-unit viewport is 1.5 viewports/s — faster than
   * the engage cap, which is precisely the regime where the old fixed cap
   * yo-yoed (fall a viewport behind, surge on the release, repeat).
   */
  it('holds a stable, bounded lag instead of yo-yoing', () => {
    const trail = line(2);
    const sim = makeSim(trail);
    const v = 30; // world units per second
    let head = 2;
    const lags: number[] = [];
    for (let i = 0; i < 600; i++) {
      head += (v * DT) / 1000;
      while (trail.arc[trail.count - 1] < head) {
        const x = trail.xy[(trail.count - 1) * 2] + 1;
        trail.push(Math.min(x, head), 0);
      }
      sim.frame();
      if (i > 150) lags.push(head - sim.cam.x); // past the warm-up
    }
    const min = Math.min(...lags);
    const max = Math.max(...lags);
    // Bounded: the head stays well inside the viewport…
    expect(max).toBeLessThan(VIEW_MIN * 0.4);
    // …and stable: no surge-and-fall-behind cycle.
    expect(max - min).toBeLessThan(VIEW_MIN * 0.1);
  });

  it('filters the chord zig-zag out of the camera path', () => {
    const trail = new TestTrail();
    trail.push(0, 0);
    const sim = makeSim(trail);
    const v = 30;
    const AMP = 0.4;
    let head = 0;
    let k = 0;
    const ys: number[] = [];
    for (let i = 0; i < 600; i++) {
      head += (v * DT) / 1000;
      while (trail.arc[trail.count - 1] < head) {
        k++;
        trail.push(k * 1.3, k % 2 === 0 ? AMP : -AMP); // ±0.4 wiggle per chord
      }
      sim.frame();
      if (i > 150) ys.push(sim.cam.y);
    }
    // The path swings ±0.4; the camera barely notices.
    expect(Math.max(...ys.map(Math.abs))).toBeLessThan(AMP * 0.5);
  });

  it('decelerates smoothly into a stall and settles at the head', () => {
    const trail = line(2);
    const sim = makeSim(trail);
    const v = 30;
    let head = 2;
    for (let i = 0; i < 300; i++) {
      head += (v * DT) / 1000;
      while (trail.arc[trail.count - 1] < head) {
        trail.push(trail.xy[(trail.count - 1) * 2] + 1, 0);
      }
      sim.frame();
    }
    // The walk hits a frontier: no more tiles, the odometer freezes.
    sim.steps.length = 0;
    let frames = 0;
    while (!sim.settled && frames < 600) {
      sim.frame();
      frames++;
    }
    expect(sim.settled).toBe(true);
    const headX = trail.xy[(trail.count - 1) * 2];
    expect(Math.abs(sim.cam.x - headX) * SCALE).toBeLessThan(FOLLOW_SETTLE_PX);
    // Deceleration, never a slam: steps shrink or hold, frame over frame.
    for (let i = 1; i < sim.steps.length; i++) {
      expect(sim.steps[i]).toBeLessThanOrEqual(sim.steps[i - 1] * 1.1 + 1e-4);
    }
  });
});

describe('advanceFollowCamera — the trimmed window', () => {
  it('keeps the dolly inside the points the window still holds', () => {
    const trail = line(50);
    const state = createFollowCamera(trail);
    state.arc = 10; // pretend the dolly was left far behind
    // A trim let the early points go: rebuild the window as [30..50].
    const trimmed = new TestTrail();
    for (let x = 30; x <= 50; x++) trimmed.push(x, 0);
    for (let i = 0; i < trimmed.count; i++) trimmed.arc[i] += 30; // odometer style
    const out = advanceFollowCamera(state, trimmed, { x: 0, y: 0 }, DT, VIEW_MIN, SCALE);
    expect(state.arc).toBeGreaterThanOrEqual(trimmed.arc[0]);
    expect(out.cx).toBeGreaterThan(0); // moving toward the window, not the void
  });

  it('never rides the dolly backwards, whatever the spring wobbles', () => {
    const trail = line(30);
    const sim = makeSim(trail, { x: 0, y: 0 });
    let last = sim.state.arc;
    for (let i = 0; i < 300; i++) {
      sim.frame();
      expect(sim.state.arc).toBeGreaterThanOrEqual(last - 1e-12);
      last = sim.state.arc;
    }
  });
});
