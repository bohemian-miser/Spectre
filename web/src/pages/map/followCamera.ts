/**
 * The stabilised follow camera: how the viewport rides a chase smoothly enough
 * to film.
 *
 * The naive follow (chase the walk's raw head with a first-order exponential)
 * has three visible defects, all of them velocity discontinuities:
 *
 *  - the head is a DISCRETE target — it hops connection point to connection
 *    point, and at full speed it leaps thousands of tiles the instant a feed
 *    cut lands — so the camera's aim jumps and the motion twitches;
 *  - a first-order chase converges and STOPS between hops (the sub-pixel
 *    gate), then lurches at the next one: stop-start at exactly the pace a
 *    watchable chase runs at;
 *  - a fixed viewports-per-second cap is slower than a default-pace chase at
 *    default zoom, so the camera repeatedly falls a viewport behind and then
 *    surges when the catch-up rule releases it — a yo-yo.
 *
 * The cure is to stop chasing the head and start riding the PATH. The trail
 * already stores cumulative arc length per point, which makes it a dolly
 * track: a 1-D position along it is enough to name a world point on the line
 * the walk actually drew.
 *
 *  1. A DOLLY rides the trail's arc length toward the head's odometer with a
 *     critically damped spring (SmoothDamp). Bursts in the odometer become
 *     smooth acceleration; stalls become smooth deceleration; the dolly's
 *     velocity is continuous by construction, whatever the walk does.
 *  2. The camera AIMS a little ahead of the dolly — `speed × lead` further
 *     along the path (never past the head). This is velocity feed-forward: a
 *     tracker lags a ramp by `speed × its time constant`, and the lead cancels
 *     most of that, so the head stays near the middle of the frame at steady
 *     pace instead of drifting toward the edge as the pace rises.
 *  3. The camera TRACKS the aim point with a short first-order constant. The
 *     aim is velocity-continuous (stage 1) and mostly lag-free (stage 2), so
 *     tight tracking is smooth — the short constant's remaining job is to
 *     round the chord-to-chord zig-zag of the path itself. Its step is capped
 *     at a speed that SCALES with the chase speed: the cap never binds during
 *     steady tracking (no yo-yo), but a cold engage — a fresh tap, the swoop
 *     back after a drag — moves at a stately viewport-relative pace, and the
 *     cap opens up with distance so a runaway head is still caught.
 *
 * Pure module: no DOM, no React, no component state — everything here is a
 * function of (state, trail, camera, dt, viewport), which is what makes the
 * motion testable in node down to per-frame acceleration bounds.
 */

import type { Pt } from '../../core';

/** The slice of a {@link StrandTrail} the camera reads (structural subset). */
export interface TrailArcView {
  /** Absolute world coordinates, 2 doubles per point; `count` points used. */
  readonly xy: Float64Array;
  /** Cumulative arc length at each point — the odometer, absolute. */
  readonly arc: Float64Array;
  readonly count: number;
}

/**
 * Dolly time constant (SmoothDamp smoothTime, ms): how long a burst or stall
 * in the walk takes to become full speed or full stop. The one knob that
 * trades butter for lag — a critically damped tracker follows a steady chase
 * `speed × this` behind, which stage 2 then mostly cancels.
 */
export const FOLLOW_ARC_SMOOTH_MS = 300;

/**
 * Feed-forward lead, in seconds of dolly speed. Cancels that much of the
 * combined tracking lag; deliberately less than the dolly's own lag
 * (`FOLLOW_ARC_SMOOTH_MS`), so the un-clamped aim always lies BEHIND the head
 * on the drawn path and never has to extrapolate beyond it. The difference —
 * `speed × (smooth − lead)`, plus the tracker's own small lag — is the resting
 * offset: at a watchable pace the head sits just ahead of centre, in the
 * direction of travel, which is where a chase shot wants it.
 */
export const FOLLOW_LEAD_S = 0.22;

/**
 * The lead's OWN low-pass (ms). The dolly's speed is a spring state and rises
 * sharply the moment a burst lands — fed straight into the lead that sharpness
 * would reappear in the aim, which is the discontinuity this module exists to
 * remove. The lead therefore follows the speed through this filter: at steady
 * pace they agree (full feed-forward), at a burst's onset the lead swells over
 * a quarter second instead of jumping.
 */
export const FOLLOW_LEAD_TAU_MS = 250;

/**
 * Tracker time constant (ms) for the final camera-to-aim approach. Short on
 * purpose: its job is only to round the path's per-chord zig-zag (which at
 * watchable paces wiggles many times per second), not to hide bursts — the
 * dolly has already done that.
 */
export const FOLLOW_TRACK_TAU_MS = 80;

/**
 * Cold-engage speed, in viewports (min dimension) per second: how fast the
 * camera moves toward a chase it is not yet riding — the glide to a fresh
 * tap, the swoop back after a drag. Deliberately stately.
 */
export const FOLLOW_ENGAGE_VIEWPORTS_PER_S = 1.1;

/**
 * The tracker's step cap scales with the chase's own speed by this factor, so
 * steady tracking is NEVER the thing being capped — that was the yo-yo: a cap
 * below the chase speed made the camera fall behind until the catch-up rule
 * released it, surge, and fall behind again.
 */
export const FOLLOW_CAP_SPEED_FACTOR = 1.6;

/**
 * Beyond this many viewports of camera-to-aim distance the cap opens by
 * {@link FOLLOW_CAP_OPEN_PER_VIEWPORT} for each further viewport —
 * continuously, not as a cliff — so a head that has pulled far ahead (a
 * full-speed burst, a long drag away) is caught up with rather than lost.
 */
export const FOLLOW_RELEASE_VIEWPORTS = 1.2;
export const FOLLOW_CAP_OPEN_PER_VIEWPORT = 8;

/**
 * The dolly is never allowed to fall further behind the head than one
 * viewport of arc: past that the intervening path is off screen anyway, so
 * gliding along it is indistinguishable from arriving — and unbounded lag
 * would mean unbounded catch-up time.
 */
export const FOLLOW_DOLLY_MAX_BEHIND_VIEWPORTS = 1.0;

/** Settle thresholds: below these the camera writes nothing (CSS px, px/s). */
export const FOLLOW_SETTLE_PX = 0.4;
export const FOLLOW_SETTLE_PX_PER_S = 2;

/** Mutable dolly state — one per live chase; re-seeded when a chase starts. */
export interface FollowCameraState {
  /** Dolly position along the trail, in odometer arc units. */
  arc: number;
  /** Dolly speed in world units per second (the smoothed chase speed). */
  speed: number;
  /** The lead's low-passed copy of `speed` — see {@link FOLLOW_LEAD_TAU_MS}. */
  leadSpeed: number;
}

/** A fresh dolly, parked at the walk's current head. */
export function createFollowCamera(trail: TrailArcView): FollowCameraState {
  return { arc: trail.count > 0 ? trail.arc[trail.count - 1] : 0, speed: 0, leadSpeed: 0 };
}

/**
 * The world point at odometer arc `s` on the trail, clamped to the points the
 * (possibly trimmed) window still holds. Binary search over the cumulative
 * arc — which is non-decreasing by construction — then a lerp; a zero-length
 * segment (a degenerate chord) lerps as its own endpoint.
 */
export function pointAtArc(trail: TrailArcView, s: number): Pt {
  const n = trail.count;
  if (n === 0) return { x: 0, y: 0 };
  const arc = trail.arc;
  if (s <= arc[0] || n === 1) return { x: trail.xy[0], y: trail.xy[1] };
  const last = arc[n - 1];
  if (s >= last) return { x: trail.xy[(n - 1) * 2], y: trail.xy[(n - 1) * 2 + 1] };
  // Smallest i with arc[i] >= s; i >= 1 because s > arc[0].
  let lo = 1;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arc[mid] < s) lo = mid + 1;
    else hi = mid;
  }
  const a0 = arc[lo - 1];
  const len = arc[lo] - a0;
  const t = len > 0 ? (s - a0) / len : 1;
  const x0 = trail.xy[(lo - 1) * 2];
  const y0 = trail.xy[(lo - 1) * 2 + 1];
  return {
    x: x0 + (trail.xy[lo * 2] - x0) * t,
    y: y0 + (trail.xy[lo * 2 + 1] - y0) * t,
  };
}

/**
 * One step of a critically damped spring toward `target` (Game Programming
 * Gems' SmoothDamp): continuous velocity, no overshoot to speak of, stable at
 * any `dt` thanks to the polynomial bound on e^-x. `smoothTime` is roughly
 * the time to close most of the gap.
 */
function smoothDamp(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  dt: number,
): { value: number; velocity: number } {
  const omega = 2 / Math.max(1e-6, smoothTime);
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity + omega * change) * dt;
  return {
    value: target + (change + temp) * decay,
    velocity: (velocity - omega * temp) * decay,
  };
}

export interface FollowFrame {
  /** Where the camera centre should be this frame (world coordinates). */
  readonly cx: number;
  readonly cy: number;
  /**
   * True when nothing perceptible remains to do — dolly at the head, camera
   * at the aim, everything below the settle thresholds. The caller can skip
   * the camera write, and once the walk is terminal, stop ticking entirely.
   */
  readonly settled: boolean;
}

/**
 * Advance the dolly and produce this frame's camera centre. Mutates `state`
 * (the dolly is an integrator); the camera itself stays the caller's — the
 * returned centre is a suggestion the caller applies unless `settled`.
 *
 * `viewMinWorld` is the viewport's min(width, height) in world units — the
 * yardstick every viewport-relative rule here is quoted in. Passing the live
 * value each frame is what makes wheel zoom compose freely with the follow:
 * a zoom changes the yardstick, never the state.
 */
export function advanceFollowCamera(
  state: FollowCameraState,
  trail: TrailArcView,
  cam: Pt,
  dtMs: number,
  viewMinWorld: number,
  scale: number,
): FollowFrame {
  if (trail.count === 0) return { cx: cam.x, cy: cam.y, settled: true };
  const dt = Math.min(0.064, Math.max(0.001, dtMs / 1000));
  const first = trail.arc[0];
  const total = trail.arc[trail.count - 1];

  // --- stage 1: the dolly ---------------------------------------------------
  const damped = smoothDamp(state.arc, total, state.speed, FOLLOW_ARC_SMOOTH_MS / 1000, dt);
  // The trail only ever grows forward; the dolly must too — a camera that
  // backs up along the line it just travelled reads as broken, whatever a
  // spring's residual wobble says.
  let arc = Math.min(total, Math.max(state.arc, damped.value));
  // Never further behind than the catch-up bound, and never off the trimmed
  // window's tail.
  arc = Math.max(arc, total - FOLLOW_DOLLY_MAX_BEHIND_VIEWPORTS * viewMinWorld, first);
  state.arc = arc;
  state.speed = Math.max(0, damped.velocity);
  state.leadSpeed +=
    (state.speed - state.leadSpeed) * (1 - Math.exp(-(dt * 1000) / FOLLOW_LEAD_TAU_MS));

  // --- stage 2: the aim -----------------------------------------------------
  const aimArc = Math.min(total, arc + state.leadSpeed * FOLLOW_LEAD_S);
  const aim = pointAtArc(trail, aimArc);

  // --- stage 3: the tracker -------------------------------------------------
  const dx = aim.x - cam.x;
  const dy = aim.y - cam.y;
  const dist = Math.hypot(dx, dy);
  const gap = total - arc;
  const settled =
    dist * scale < FOLLOW_SETTLE_PX &&
    gap * scale < FOLLOW_SETTLE_PX &&
    state.speed * scale < FOLLOW_SETTLE_PX_PER_S;
  if (settled || dist === 0) return { cx: cam.x, cy: cam.y, settled };

  let step = dist * (1 - Math.exp(-(dt * 1000) / FOLLOW_TRACK_TAU_MS));
  const distViewports = viewMinWorld > 0 ? dist / viewMinWorld : 0;
  const capViewportsPerS = Math.max(
    FOLLOW_ENGAGE_VIEWPORTS_PER_S,
    viewMinWorld > 0 ? (FOLLOW_CAP_SPEED_FACTOR * state.speed) / viewMinWorld : 0,
    FOLLOW_ENGAGE_VIEWPORTS_PER_S +
      Math.max(0, distViewports - FOLLOW_RELEASE_VIEWPORTS) * FOLLOW_CAP_OPEN_PER_VIEWPORT,
  );
  const maxStep = capViewportsPerS * viewMinWorld * dt;
  if (step > maxStep) step = maxStep;
  return {
    cx: cam.x + (dx / dist) * step,
    cy: cam.y + (dy / dist) * step,
    settled: false,
  };
}
