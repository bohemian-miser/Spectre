/**
 * The three shape-to-sound mappings of social/experiments/shapesound,
 * rendered to stereo sample buffers: `spectrum.spectrum` (Fourier terms as
 * partials), `mappings.radius` (distance from the centre as pitch) and
 * `mappings.corners_v2` (one note per fitted side). The pen trace
 * (`mappings.pen_trace`) renders on its own so it can be mixed in or left out.
 * A loop clip is exactly one lap with no lead-in or tail: whatever sounds
 * across the end of the lap is wrapped onto its start, so it repeats without
 * a gap. Reverb is the live bus's (`mixer.ts`), not part of the clip.
 */

import { fitCorners, pointAt, shapeTerms, termLevel, termRef, type Shape } from './shape';

/** Spectrum: seconds into the lap for the terms to join, and when the pen starts. */
export const JOIN = 1.8;
export const SPECTRUM_LAP = 5;
export const PEN_START = JOIN + 0.2;
/** Seconds the joined terms and the pen take to fade before the lap ends. */
const LAP_FADE = 0.15;
/** Partials above this are left out. */
const MAX_HZ = 18000;

export interface Clip {
  readonly sr: number;
  readonly left: Float32Array<ArrayBuffer>;
  readonly right: Float32Array<ArrayBuffer>;
  readonly seconds: number;
}

export interface SpectrumSettings {
  readonly f0: number;
  readonly terms: number;
  readonly pen: boolean;
  /** Steps a second, when the pen runs at one speed. */
  readonly penSpeed: number;
  readonly penLevel: number;
  /** Ramp: steps a second gained every second (0: no ramp, the pen runs at `penSpeed`). */
  readonly penRate: number;
  /** Ramp: the speed it starts from and the speed it stops rising at, steps a second. */
  readonly penFrom: number;
  readonly penMax: number;
  /** Ramp: seconds a card holds the top speed before it ends. */
  readonly penHold: number;
}
export interface RadiusSettings {
  readonly f0: number;
  /** Octaves per unit of radius. */
  readonly range: number;
  readonly lap: number;
}
export interface CornerSettings {
  /** Multiple of the default fit tolerance. */
  readonly tolerance: number;
  readonly root: number;
  readonly lap: number;
}

export const MAPPINGS = ['spectrum', 'radius', 'corners'] as const;
export type Mapping = (typeof MAPPINGS)[number];

export interface Settings {
  readonly spectrum: SpectrumSettings;
  readonly radius: RadiusSettings;
  readonly corners: CornerSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  spectrum: { f0: 131, terms: 24, pen: false, penSpeed: 7000, penLevel: 0.5, penRate: 0, penFrom: 0, penMax: 40000, penHold: 2 },
  radius: { f0: 220, range: 1.3, lap: 5 },
  corners: { tolerance: 1, root: 64, lap: 5 },
};

/** Each setting's range: the sliders, the URL hash and export_card.py all keep to it. */
export const LIMITS: { readonly [M in Mapping]: { readonly [K in keyof Settings[M]]?: readonly [number, number] } } = {
  spectrum: { f0: [40, 400], terms: [2, 512], penSpeed: [500, 40000], penLevel: [0, 1], penRate: [0, 10000], penFrom: [0, 40000], penMax: [500, 40000], penHold: [0, 30] },
  radius: { f0: [55, 880], range: [0.05, 100], lap: [0.1, 20] },
  corners: { tolerance: [0.05, 50], root: [36, 84], lap: [0.1, 20] },
};

/** Lowest and highest pitch a voice plays; further out, pitches fold back by octaves. */
export const LOW_HZ = 20;
/** Nine octaves up from `LOW_HZ`, so folding keeps a pitch's note. */
export const FOLD_OCTAVES = 9;

/** `hz` folded by whole octaves into [LOW_HZ, LOW_HZ x 2^FOLD_OCTAVES). */
export function foldHz(hz: number): number {
  const o = Math.log2(hz / LOW_HZ);
  return LOW_HZ * 2 ** (((o % FOLD_OCTAVES) + FOLD_OCTAVES) % FOLD_OCTAVES);
}

/** A harmonic's level near the top: full below MAX_HZ - 2 kHz, gone at MAX_HZ, so nothing aliases. */
const below = (hz: number): number => Math.max(0, Math.min(1, (MAX_HZ - hz) / 2000));

/** Reverb send each mapping had in the prototypes. */
export const REVERB: Record<Mapping, number> = { spectrum: 0.12, radius: 0.22, corners: 0.2 };

export function clipSeconds(m: Mapping, s: Settings): number {
  return m === 'spectrum' ? SPECTRUM_LAP : s[m].lap;
}

// ---------------------------------------------------------------- helpers

/** Equal-power pan, -1 left .. 1 right (`mappings.stereo`). */
function panGains(pan: number): [number, number] {
  const th = ((pan + 1) * Math.PI) / 4;
  return [Math.cos(th), Math.sin(th)];
}

/** A second-order Butterworth section (bilinear transform), run in place. */
export function butter2(x: Float32Array | Float64Array, hz: number, sr: number, type: 'low' | 'high'): void {
  const w = Math.tan((Math.PI * Math.min(hz, 0.49 * sr)) / sr);
  const r = Math.SQRT2;
  const n = 1 / (1 + r * w + w * w);
  const b0 = type === 'low' ? w * w * n : n;
  const b1 = type === 'low' ? 2 * b0 : -2 * b0;
  const b2 = b0;
  const a1 = 2 * (w * w - 1) * n;
  const a2 = (1 - r * w + w * w) * n;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
}

/** Gaussian smoothing (`gaussian_filter1d`), the ends held, or wrapped round for a lap. */
function gauss(x: Float64Array, sigma: number, wrap = false): Float64Array {
  const s = Math.max(sigma, 1e-3);
  const r = Math.ceil(4 * s);
  const w = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-0.5 * ((i - r) / s) ** 2));
  const sum = w.reduce((a, b) => a + b, 0);
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let acc = 0;
    const n = x.length;
    for (let j = -r; j <= r; j++) acc += w[j + r] * x[wrap ? (((i + j) % n) + n) % n : Math.max(0, Math.min(n - 1, i + j))];
    out[i] = acc / sum;
  }
  return out;
}

/** Central differences, one-sided at the ends (`np.gradient`). */
function gradient(x: Float64Array): Float64Array {
  const n = x.length;
  const out = new Float64Array(n);
  if (n < 2) return out;
  out[0] = x[1] - x[0];
  out[n - 1] = x[n - 1] - x[n - 2];
  for (let i = 1; i < n - 1; i++) out[i] = (x[i + 1] - x[i - 1]) / 2;
  return out;
}

/** Scale both channels so their mean square is `rms`². */
export function normalise(l: Float32Array, r: Float32Array, rms: number): void {
  let s = 0;
  for (let i = 0; i < l.length; i++) s += l[i] * l[i] + r[i] * r[i];
  const now = Math.sqrt(s / (2 * l.length));
  if (now < 1e-12) return;
  const g = rms / now;
  for (let i = 0; i < l.length; i++) {
    l[i] *= g;
    r[i] *= g;
  }
}

/** Seeded uniform noise in -1..1 (mulberry32), for the corner clicks and the card reverb. */
export function noise(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

function blank(seconds: number, sr: number): Clip {
  const len = Math.round(seconds * sr);
  return { sr, seconds: len / sr, left: new Float32Array(len), right: new Float32Array(len) };
}

/** Half-cosine ramp 0..1 over [a, b]. */
const ramp = (t: number, a: number, b: number): number => (t <= a ? 0 : t >= b ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * (t - a)) / (b - a)));

/** Loudness every voice is brought to, RMS of the clip. */
export const VOICE_RMS = 0.1;

// ---------------------------------------------------------------- 1. spectrum

/** Seconds into the lap at which term k joins. */
export function joinedAt(k: number, K: number): number {
  return (JOIN * (Math.abs(k) - 1)) / Math.max(1, K - 1);
}

/**
 * `spectrum.spectrum` without its pen: term k is a sine at |k| × f0, panned
 * 0.7 left for k < 0 and right for k > 0, as loud as its bar, joining from
 * |k| = 1 to K over `JOIN` seconds (the same time however many there are),
 * then held to the end of the lap. Each
 * partial makes a whole number of cycles in the lap; the circle terms
 * (|k| = 1) sound throughout, and the rest fade out just before the lap
 * ends so the next lap can join them again. `held`: a longer clip in which
 * the terms join and then hold to its end.
 */
export function renderSpectrum(shape: Shape, s: SpectrumSettings, sr: number, seconds = SPECTRUM_LAP, held = false): Clip {
  const clip = blank(seconds, sr);
  const ts = shapeTerms(shape, s.terms);
  const K = Math.max(...ts.map((t) => Math.abs(t.k)));
  const ref = termRef(ts);
  const { left, right } = clip;
  const len = left.length;
  for (const t of ts) {
    const a = termLevel(t.amp, ref);
    const hz = whole(Math.abs(t.k) * s.f0, clip.seconds);
    if (a <= 0 || hz > MAX_HZ) continue;
    const [gl, gr] = panGains(0.7 * Math.sign(t.k));
    const on = joinedAt(t.k, K);
    const circle = Math.abs(t.k) === 1;
    // A rotating phasor instead of a sine per sample.
    const w = (2 * Math.PI * hz) / sr;
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const ph = Math.atan2(t.im, t.re);
    let c = Math.cos(ph);
    let si = Math.sin(ph);
    for (let i = 0; i < len; i++) {
      const tt = i / sr;
      const e = circle ? 1 : Math.max(0, Math.min(1, (tt - on) / 0.03)) * (held ? 1 : 1 - ramp(tt, clip.seconds - LAP_FADE, clip.seconds));
      if (e > 0) {
        const x = a * si * e;
        left[i] += x * gl;
        right[i] += x * gr;
      }
      const nc = c * cw - si * sw;
      si = si * cw + c * sw;
      c = nc;
      if ((i & 1023) === 0) {
        const m = 1 / Math.hypot(c, si);
        c *= m;
        si *= m;
      }
    }
  }
  normalise(left, right, VOICE_RMS);
  return clip;
}

/**
 * How the pen moves once it starts: from `start` steps a second, gaining
 * `rate` every second up to `max`; or, when `steps` is given, along that
 * curve instead (any motion, slowing down included).
 */
export interface PenMotion {
  readonly start: number;
  readonly rate: number;
  readonly max: number;
  /** Steps covered `tau` seconds after the pen starts; non-decreasing, 0 at 0. */
  readonly steps?: (tau: number) => number;
  /** Its speed in steps a second, if known exactly; else taken from `steps`. */
  readonly speed?: (tau: number) => number;
}

/** Seconds either side for the speed of a `steps` curve with no `speed`. */
const SPEED_DT = 1e-4;

export function penMotion(s: SpectrumSettings): PenMotion {
  return s.penRate > 0 ? { start: s.penFrom, rate: s.penRate, max: Math.max(s.penFrom, s.penMax) } : { start: s.penSpeed, rate: 0, max: s.penSpeed };
}

/** Seconds the ramp takes to reach its top speed (0 for a steady pen). */
export const rampSeconds = (m: PenMotion): number => (m.rate > 0 ? (m.max - m.start) / m.rate : 0);

/** Steps a second, `tau` seconds after the pen starts. */
export function penSpeedAt(m: PenMotion, tau: number): number {
  if (m.speed) return m.speed(Math.max(0, tau));
  if (m.steps) {
    const a = Math.max(0, tau - SPEED_DT);
    const b = Math.max(a + SPEED_DT, tau + SPEED_DT);
    return (m.steps(b) - m.steps(a)) / (b - a);
  }
  return tau <= 0 ? m.start : Math.min(m.max, m.start + m.rate * tau);
}

/**
 * Where a pen speed sits between its lowest and highest, 0..1, on a log
 * scale: a ramp's from its start (or a thousandth of its top, when it starts
 * at rest) to its top; a steady pen's on the pen speed slider's range.
 */
export function penBarFraction(s: SpectrumSettings, speed: number): number {
  if (speed <= 0) return 0;
  const [lo, hi] = s.penRate > 0 ? [s.penFrom > 0 ? s.penFrom : s.penMax / 1000, s.penMax] : (LIMITS.spectrum.penSpeed as readonly [number, number]);
  if (hi <= lo) return 1;
  return Math.max(0, Math.min(1, Math.log(speed / lo) / Math.log(hi / lo)));
}

/** Steps covered `tau` seconds after the pen starts: the speed integrated, so the pen never jumps. */
export function penSteps(m: PenMotion, tau: number): number {
  if (tau <= 0) return 0;
  if (m.steps) return m.steps(tau);
  const up = rampSeconds(m);
  if (tau <= up) return m.start * tau + (m.rate * tau * tau) / 2;
  return m.start * up + (m.rate * up * up) / 2 + m.max * (tau - up);
}

/**
 * `mappings.pen_trace`: a pen runs round the full loop from `from` seconds,
 * moving as `motion` says. The sound is its direction of travel per step (x
 * left, y right; for a steady pen, its velocity over its speed), mixed 0.7 :
 * 0.3 with its position, low-passed at 9 kHz and high-passed at 60 Hz, so it
 * repeats at the rate the pen laps and follows its speed as that changes.
 * Brought to `VOICE_RMS` over the part where it runs; fades in over 0.1 s and
 * out over [fadeFrom, fadeTo].
 */
export function renderPenMotion(shape: Shape, motion: PenMotion, from: number, seconds: number, sr: number, fadeFrom = seconds, fadeTo = seconds): Clip {
  const clip = blank(seconds, sr);
  const len = clip.left.length;
  const i0 = Math.min(len, Math.ceil(from * sr));
  const m = len - i0;
  if (m < 2) return clip;
  // Positions one sample either side of the run too, for the differences.
  const ss = new Float64Array(m + 2);
  const zx = new Float64Array(m + 2);
  const zy = new Float64Array(m + 2);
  for (let i = 0; i < m + 2; i++) {
    ss[i] = penSteps(motion, (i0 + i - 1) / sr - from);
    const [x, y] = pointAt(shape.full, shape.steps, ss[i] / shape.steps);
    zx[i] = x;
    zy[i] = y;
  }
  const vx = new Float64Array(m);
  const vy = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const ds = ss[i + 2] - ss[i];
    if (ds > 1e-9) {
      vx[i] = (zx[i + 2] - zx[i]) / ds;
      vy[i] = (zy[i + 2] - zy[i]) / ds;
    } else {
      // Standing still: the direction of the step it stands on.
      const j = Math.floor(ss[i + 1]) % shape.steps;
      const k = (j + 1) % shape.steps;
      vx[i] = shape.full[2 * k] - shape.full[2 * j];
      vy[i] = shape.full[2 * k + 1] - shape.full[2 * j + 1];
    }
  }
  butter2(vx, 9000, sr, 'low');
  butter2(vy, 9000, sr, 'low');
  let mx = 0;
  let my = 0;
  for (let i = 1; i <= m; i++) {
    mx += zx[i];
    my += zy[i];
  }
  mx /= m;
  my /= m;
  let sv = 0;
  let sz = 0;
  for (let i = 0; i < m; i++) {
    sv += vx[i] ** 2 + vy[i] ** 2;
    sz += (zx[i + 1] - mx) ** 2 + (zy[i + 1] - my) ** 2;
  }
  const rv = Math.sqrt(sv / (2 * m)) + 1e-9;
  const rz = Math.sqrt(sz / (2 * m)) + 1e-9;
  const yl = new Float64Array(m);
  const yr = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    yl[i] = (0.7 * vx[i]) / rv + (0.3 * (zx[i + 1] - mx)) / rz;
    yr[i] = (0.7 * vy[i]) / rv + (0.3 * (zy[i + 1] - my)) / rz;
  }
  butter2(yl, 60, sr, 'high');
  butter2(yr, 60, sr, 'high');
  let s2 = 0;
  for (let i = 0; i < m; i++) {
    const t = (i0 + i) / sr;
    const e = ramp(t, from, from + 0.1) * (1 - ramp(t, fadeFrom, fadeTo));
    clip.left[i0 + i] = yl[i] * e;
    clip.right[i0 + i] = yr[i] * e;
    s2 += clip.left[i0 + i] ** 2 + clip.right[i0 + i] ** 2;
  }
  const g = VOICE_RMS / (Math.sqrt(s2 / (2 * m)) || 1);
  for (let i = i0; i < len; i++) {
    clip.left[i] *= g;
    clip.right[i] *= g;
  }
  return clip;
}

/** Seconds of a spectrum lap the pen has: from `PEN_START` to the lap's fade. */
export const PEN_WINDOW = SPECTRUM_LAP - LAP_FADE - PEN_START;
/** Seconds a ramped pen takes to fade out after its hold. */
const PEN_FADE = 0.1;

/**
 * How the pen plays in a live loop:
 * - steady: one speed, from `PEN_START` to the end of each lap;
 * - lap: a ramp and hold that fit in the lap: from `PEN_START` it ramps,
 *   holds `penHold` seconds at the top, then fades out, every lap;
 * - cycle: a ramp and hold too long for a lap: the pen runs on its own loop,
 *   carried across laps: it ramps, holds, then starts again from `penFrom`.
 *   The hold is stretched (by under one lap of the loop at the top speed) so
 *   the cycle covers whole laps of the loop and its seam does not jump.
 */
export interface PenPlan {
  readonly kind: 'steady' | 'lap' | 'cycle';
  readonly motion: PenMotion;
  readonly ramp: number;
  readonly hold: number;
  /** The pen's own loop, seconds (cycle), else the spectrum lap. */
  readonly seconds: number;
}

export function penPlan(s: SpectrumSettings, steps: number): PenPlan {
  const motion = penMotion(s);
  if (s.penRate <= 0) return { kind: 'steady', motion, ramp: 0, hold: 0, seconds: SPECTRUM_LAP };
  const up = rampSeconds(motion);
  if (up + s.penHold + PEN_FADE <= PEN_WINDOW) return { kind: 'lap', motion, ramp: up, hold: s.penHold, seconds: SPECTRUM_LAP };
  const covered = penSteps(motion, up);
  const top = Math.max(motion.max, 1e-9);
  const laps = Math.max(Math.ceil(covered / steps - 1e-9), Math.round((covered + top * s.penHold) / steps), 1);
  const hold = Math.max(0, (laps * steps - covered) / top);
  return { kind: 'cycle', motion, ramp: up, hold, seconds: up + hold };
}

/**
 * The pen's speed in steps a second at `t` seconds into the voice's lap
 * (`penT`: into the pen's own loop, for a cycle), or null when it is silent.
 */
export function penSpeedNow(plan: PenPlan, t: number, penT: number): number | null {
  if (plan.kind === 'cycle') return penSpeedAt(plan.motion, penT);
  const tau = t - PEN_START;
  if (tau < 0) return null;
  if (plan.kind === 'lap' && tau > plan.ramp + plan.hold) return null;
  return penSpeedAt(plan.motion, tau);
}

/** Steps the pen has covered at those times (for drawing it), or null when it is silent. */
export function penStepsNow(plan: PenPlan, t: number, penT: number): number | null {
  if (plan.kind === 'cycle') return penSteps(plan.motion, penT);
  const tau = t - PEN_START;
  if (tau < 0 || (plan.kind === 'lap' && tau > plan.ramp + plan.hold) || tau > SPECTRUM_LAP - PEN_START) return null;
  return penSteps(plan.motion, tau);
}

/**
 * A ramped pen on its own loop (`penPlan` cycle): ramp, hold, again, with no
 * seam: its position is continuous because the cycle covers whole laps, and
 * the filters run over the end of the cycle first.
 */
export function renderPenCycle(shape: Shape, plan: PenPlan, sr: number): Clip {
  const clip = blank(plan.seconds, sr);
  const len = clip.left.length;
  const T = plan.seconds;
  const lapSteps = penSteps(plan.motion, T);
  const warm = Math.min(len, Math.ceil(0.1 * sr));
  const m = warm + len;
  // Steps covered at sample i (from -warm - 1), unwrapped across cycles.
  const at = (i: number): number => {
    const u = (i * T) / len;
    const k = Math.floor(u / T);
    return k * lapSteps + penSteps(plan.motion, u - k * T);
  };
  const ss = new Float64Array(m + 2);
  const zx = new Float64Array(m + 2);
  const zy = new Float64Array(m + 2);
  for (let i = 0; i < m + 2; i++) {
    ss[i] = at(i - warm - 1);
    const [x, y] = pointAt(shape.full, shape.steps, ss[i] / shape.steps);
    zx[i] = x;
    zy[i] = y;
  }
  const vx = new Float64Array(m);
  const vy = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const ds = ss[i + 2] - ss[i];
    if (ds > 1e-9) {
      vx[i] = (zx[i + 2] - zx[i]) / ds;
      vy[i] = (zy[i + 2] - zy[i]) / ds;
    } else {
      const j = ((Math.floor(ss[i + 1]) % shape.steps) + shape.steps) % shape.steps;
      const k = (j + 1) % shape.steps;
      vx[i] = shape.full[2 * k] - shape.full[2 * j];
      vy[i] = shape.full[2 * k + 1] - shape.full[2 * j + 1];
    }
  }
  butter2(vx, 9000, sr, 'low');
  butter2(vy, 9000, sr, 'low');
  let sv = 0;
  for (let i = warm; i < m; i++) sv += vx[i] ** 2 + vy[i] ** 2;
  // The loop is centred, so its position needs no mean taken off.
  let sz = 0;
  for (let i = warm; i < m; i++) sz += zx[i + 1] ** 2 + zy[i + 1] ** 2;
  const rv = Math.sqrt(sv / (2 * len)) + 1e-9;
  const rz = Math.sqrt(sz / (2 * len)) + 1e-9;
  const yl = new Float64Array(m);
  const yr = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    yl[i] = (0.7 * vx[i]) / rv + (0.3 * zx[i + 1]) / rz;
    yr[i] = (0.7 * vy[i]) / rv + (0.3 * zy[i + 1]) / rz;
  }
  butter2(yl, 60, sr, 'high');
  butter2(yr, 60, sr, 'high');
  for (let i = 0; i < len; i++) {
    clip.left[i] = yl[warm + i];
    clip.right[i] = yr[warm + i];
  }
  normalise(clip.left, clip.right, VOICE_RMS);
  return clip;
}

/** The pen in a live spectrum loop, as `penPlan` says. */
export function renderPen(shape: Shape, s: SpectrumSettings, sr: number): Clip {
  const plan = penPlan(s, shape.steps);
  if (plan.kind === 'cycle') return renderPenCycle(shape, plan, sr);
  if (plan.kind === 'lap') {
    const end = PEN_START + plan.ramp + plan.hold;
    return renderPenMotion(shape, plan.motion, PEN_START, SPECTRUM_LAP, sr, end, end + PEN_FADE);
  }
  return renderPenMotion(shape, plan.motion, PEN_START, SPECTRUM_LAP, sr, SPECTRUM_LAP - LAP_FADE);
}

// ---------------------------------------------------------------- 2. radius

/** Head track and pitch rate for the radius mapping. */
const CONTROL_HZ = 1000;

/**
 * `mappings.radius`: the head's distance r from the centroid (radius of
 * gyration 1) is the pitch, f0 × 2^(range (r - 1)); its bearing is the pan;
 * how fast the path turns at the head brightens the tone with harmonics 2, 3
 * and 5. Pitches beyond 20 Hz - 10 kHz fold back by octaves, and harmonics
 * fade out before 18 kHz. The head track is periodic in the lap, the vibrato
 * makes whole cycles in it, and the pitch is nudged (by under half a cycle a
 * lap) so the tone's phase closes at the seam.
 */
export function renderRadius(shape: Shape, s: RadiusSettings, sr: number): Clip {
  const clip = blank(s.lap, sr);
  const T = clip.seconds;
  // At least four control points per thinned point, so short laps still follow every turn.
  const nc = Math.max(4 * shape.n, Math.round(T * CONTROL_HZ));
  let px: Float64Array = new Float64Array(nc);
  let py: Float64Array = new Float64Array(nc);
  for (let i = 0; i < nc; i++) {
    const [x, y] = pointAt(shape.p, shape.n, i / nc);
    px[i] = x;
    py[i] = y;
  }
  // Smoothed over 0.6 of a thinned point.
  const perPoint = nc / shape.n;
  px = gauss(px, 0.6 * perPoint, true);
  py = gauss(py, 0.6 * perPoint, true);
  const ang = new Float64Array(nc);
  for (let i = 0; i < nc; i++) {
    const a = (i + nc - 1) % nc;
    const b = (i + 1) % nc;
    ang[i] = Math.atan2(py[b] - py[a], px[b] - px[a] + 1e-12);
  }
  // Radians per thinned point.
  const turn = new Float64Array(nc);
  for (let i = 0; i < nc; i++) {
    const d = ang[(i + 1) % nc] - ang[(i + nc - 1) % nc];
    const w = Math.abs((((d + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) / 2;
    turn[i] = Math.min(3, w * perPoint);
  }
  const bright = gauss(turn, (0.02 * nc) / T, true).map((v) => Math.min(1, v / 1.2));
  // Octaves above f0, interpolated before folding so a fold is a jump, never a sweep through the range.
  const oct = new Float64Array(nc);
  const pan = new Float64Array(nc);
  for (let i = 0; i < nc; i++) {
    oct[i] = s.range * (Math.hypot(px[i], py[i]) - 1);
    pan[i] = 0.7 * Math.cos(Math.atan2(py[i], px[i]));
  }
  const at = (arr: Float64Array, t: number): number => {
    const x = (t / T) * nc;
    const i = Math.floor(x) % nc;
    const f = x - Math.floor(x);
    return arr[i] * (1 - f) + arr[(i + 1) % nc] * f;
  };
  const { left, right } = clip;
  const len = left.length;
  // Whole vibrato cycles in the lap; none when the lap is too short for one.
  const vib = Math.round(5.5 * T) / T;
  const hz = new Float64Array(len);
  let cycles = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    hz[i] = foldHz(s.f0 * 2 ** at(oct, t)) * (1 + 0.004 * Math.sin(2 * Math.PI * vib * t));
    cycles += hz[i] / sr;
  }
  const close = Math.max(1, Math.round(cycles)) / cycles;
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const b = at(bright, t);
    const w = 2 * Math.PI * ph;
    const f = hz[i] * close;
    const x =
      Math.sin(w) + (0.25 + 0.5 * b) * below(2 * f) * Math.sin(2 * w) + 0.35 * b * below(3 * f) * Math.sin(3 * w) + 0.2 * b * below(5 * f) * Math.sin(5 * w);
    const [gl, gr] = panGains(at(pan, t));
    left[i] = x * gl;
    right[i] = x * gr;
    ph += (hz[i] * close) / sr;
  }
  normalise(left, right, VOICE_RMS);
  return clip;
}

// ---------------------------------------------------------------- 3. corners

const PENTA_DOWN = [0, 3, 5, 8, 10];

export interface Side {
  /** Seconds into the lap the side starts, and how long it lasts. */
  readonly start: number;
  readonly dur: number;
  readonly midi: number;
  /** 0 (shallow) .. 1 (turn of 120° or more). */
  readonly sharp: number;
  readonly pan: number;
}

/**
 * `mappings.corners_v2`'s notes: a side per pair of neighbouring corners,
 * sounding while the head runs along it. A side one tile long plays two
 * octaves above the root; each doubling of its length is one octave lower,
 * in pentatonic steps. The turn into it sets how sharp its attack is.
 */
export function cornerSides(shape: Shape, cuts: readonly number[], s: CornerSettings): Side[] {
  const n = shape.steps;
  const k = cuts.length;
  const C = (j: number): [number, number] => {
    const i = cuts[((j % k) + k) % k];
    return [shape.full[2 * i], shape.full[2 * i + 1]];
  };
  const out: Side[] = [];
  for (let j = 0; j < k; j++) {
    const a0 = cuts[j];
    const a1 = cuts[(j + 1) % k];
    const span = ((((a1 - a0) % n) + n) % n) || n;
    const [x0, y0] = C(j);
    const [x1, y1] = C(j + 1);
    const [xp, yp] = C(j - 1);
    const h = Math.atan2(y1 - y0, x1 - x0);
    const length = Math.max(Math.hypot(x1 - x0, y1 - y0) / shape.tile, 0.5);
    const deg = Math.round(((12 * Math.log2(length)) / 12) * 5);
    const midi = s.root + 24 - 12 * Math.floor(deg / 5) - PENTA_DOWN[((deg % 5) + 5) % 5];
    const d = h - Math.atan2(y0 - yp, x0 - xp) + Math.PI;
    const turn = Math.abs((((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI);
    out.push({
      start: (s.lap * a0) / n,
      dur: (s.lap * span) / n,
      midi,
      sharp: Math.max(0, Math.min(1, turn / ((120 * Math.PI) / 180))),
      pan: 0.5 * Math.cos(h),
    });
  }
  return out;
}

/**
 * Each side an FM note (modulator at twice the note, index 0.3 + 4 × sharp)
 * with a sub-octave, its attack quick for a sharp corner and slow for a
 * shallow one, and a click as loud as the corner is sharp. A note still
 * ringing at the end of the lap carries on at its start, wrapping as many
 * times as it needs when it is longer than the lap.
 */
export function renderCorners(shape: Shape, s: CornerSettings, sr: number): Clip {
  const clip = blank(s.lap, sr);
  const { cuts } = fitCorners(shape, s.tolerance);
  const sides = cornerSides(shape, cuts, s);
  const rnd = noise(3);
  const { left, right } = clip;
  const len = left.length;
  for (const sd of sides) {
    const hold = Math.max(sd.dur, 0.03);
    const m = Math.floor((hold + 0.25) * sr);
    const f = 440 * 2 ** ((sd.midi - 69) / 12);
    const att = Math.min(0.002 + 0.1 * (1 - sd.sharp) ** 2, 0.4 * hold);
    const idx = 0.3 + 4 * sd.sharp;
    const modDecay = 0.03 + 0.3 * (1 - sd.sharp);
    const click = new Float64Array(Math.min(m, Math.ceil(0.03 * sr)));
    if (sd.sharp > 0) {
      for (let i = 0; i < click.length; i++) click[i] = rnd() * Math.sqrt(3) * Math.exp(-i / sr / 0.003) * sd.sharp ** 2 * 0.6;
      butter2(click, 2500, sr, 'high');
    }
    const [gl, gr] = panGains(sd.pan);
    const i0 = Math.floor(sd.start * sr);
    for (let i = 0; i < m; i++) {
      const tt = i / sr;
      let env = Math.min(1, tt / att) * Math.exp(-tt / (0.08 + hold));
      env *= Math.max(0, Math.min(1, (hold + 0.06 - tt) / 0.06));
      const mod = Math.sin(2 * Math.PI * 2 * f * tt) * idx * Math.exp(-tt / modDecay);
      let x = (Math.sin(2 * Math.PI * f * tt + mod) + 0.3 * Math.sin(Math.PI * f * tt)) * env;
      if (i < click.length) x += click[i];
      const j = (i0 + i) % len;
      left[j] += x * gl;
      right[j] += x * gr;
    }
  }
  normalise(left, right, VOICE_RMS);
  return clip;
}

export const PLAYS = ['loop', 'constant'] as const;
export type Play = (typeof PLAYS)[number];

export function render(shape: Shape, m: Mapping, s: Settings, sr: number, play: Play = 'loop'): Clip {
  if (play === 'constant') return renderConstant(shape, m, s, sr);
  if (m === 'spectrum') return renderSpectrum(shape, s.spectrum, sr);
  if (m === 'radius') return renderRadius(shape, s.radius, sr);
  return renderCorners(shape, s.corners, sr);
}

// ---------------------------------------------------------------- constant tones

/**
 * Seconds of a constant clip. Every partial is moved to a whole number of
 * cycles in it (at most 1/(2 CONSTANT_SECONDS) Hz away), so it loops without
 * a seam.
 */
export const CONSTANT_SECONDS = 4;

/** One sustained partial: frequency, level, pan, and an optional FM index (modulator at 2 x). */
export interface Partial {
  readonly hz: number;
  readonly amp: number;
  readonly pan: number;
  readonly fm?: number;
  /** 0..1, for tones whose harmonics follow the turning rate. */
  readonly bright?: number;
}

/** `hz` rounded to a whole number of cycles in `seconds` divided by `div`. */
const whole = (hz: number, seconds: number, div = 1): number => (Math.max(1, Math.round((hz * seconds) / div)) * div) / seconds;

function sustain(partials: readonly Partial[], sr: number, harmonics: (p: Partial) => readonly [number, number][]): Clip {
  const clip = blank(CONSTANT_SECONDS, sr);
  const { left, right } = clip;
  for (const p of partials) {
    if (p.amp <= 0 || p.hz > MAX_HZ) continue;
    const [gl, gr] = panGains(p.pan);
    const hs = harmonics(p);
    for (let i = 0; i < left.length; i++) {
      const w = (2 * Math.PI * p.hz * i) / sr;
      const mod = p.fm ? p.fm * Math.sin(2 * w) : 0;
      let x = 0;
      for (const [mult, a] of hs) x += a * below(mult * p.hz) * Math.sin(mult * w + (mult === 1 ? mod : 0));
      x *= p.amp;
      left[i] += x * gl;
      right[i] += x * gr;
    }
  }
  normalise(left, right, VOICE_RMS);
  return clip;
}

/** Spectrum held: every term's partial at once, at its bar's level. */
export function spectrumPartials(shape: Shape, s: SpectrumSettings): Partial[] {
  const ts = shapeTerms(shape, s.terms);
  const ref = termRef(ts);
  return ts.map((t) => ({ hz: whole(Math.abs(t.k) * s.f0, CONSTANT_SECONDS), amp: termLevel(t.amp, ref), pan: 0.7 * Math.sign(t.k) }));
}

export interface DroneBin {
  /** The held pitch, folded into the audible range. */
  readonly hz: number;
  /** Share of the steps whose radius gives this pitch. */
  readonly weight: number;
  /** Mean radius (radius of gyration 1) of those steps. */
  readonly radius: number;
  readonly pan: number;
  /** Mean brightness, 0..1, as the lap's turning rate sets it. */
  readonly bright: number;
}

/** Pitches a held distance tone keeps at most: the most-visited ones. */
export const MAX_DRONE = 64;

/**
 * Distance held: the lap's pitch f0 x 2^(range (r - 1)) at every thinned
 * point, folded by octaves into the audible range and rounded to the
 * semitone; each semitone weighted by how many points give it, panned by
 * their mean bearing; at most `MAX_DRONE` of them.
 */
export function radiusDrone(shape: Shape, s: Pick<RadiusSettings, 'range' | 'f0'>): DroneBin[] {
  const bins = new Map<number, { n: number; r: number; pan: number; bright: number }>();
  const { p, n } = shape;
  for (let i = 0; i < n; i++) {
    const x = p[2 * i];
    const y = p[2 * i + 1];
    const r = Math.hypot(x, y);
    const key = Math.round(12 * Math.log2(foldHz(s.f0 * 2 ** (s.range * (r - 1))) / LOW_HZ));
    const a = (i + n - 1) % n;
    const b = (i + 1) % n;
    const d = Math.atan2(p[2 * b + 1] - y, p[2 * b] - x) - Math.atan2(y - p[2 * a + 1], x - p[2 * a]);
    const turn = Math.abs((((d + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
    const e = bins.get(key) ?? { n: 0, r: 0, pan: 0, bright: 0 };
    e.n++;
    e.r += r;
    e.pan += 0.7 * Math.cos(Math.atan2(y, x));
    e.bright += Math.min(1, turn / 1.2);
    bins.set(key, e);
  }
  return [...bins.entries()]
    .sort((a, b) => b[1].n - a[1].n || a[0] - b[0])
    .slice(0, MAX_DRONE)
    .sort((a, b) => a[0] - b[0])
    .map(([key, e]) => ({ hz: LOW_HZ * 2 ** (key / 12), weight: e.n / n, radius: e.r / e.n, pan: e.pan / e.n, bright: e.bright / e.n }));
}

export interface ChordNote {
  readonly midi: number;
  /** Share of the lap spent on sides with this note. */
  readonly weight: number;
  readonly sharp: number;
  readonly pan: number;
}

/** Corners held: each side's note once, weighted by how much of the lap its sides take. */
export function cornerChord(shape: Shape, s: CornerSettings): ChordNote[] {
  const sides = cornerSides(shape, fitCorners(shape, s.tolerance).cuts, { ...s, lap: 1 });
  const notes = new Map<number, { w: number; sharp: number; pan: number }>();
  for (const sd of sides) {
    const e = notes.get(sd.midi) ?? { w: 0, sharp: 0, pan: 0 };
    e.w += sd.dur;
    e.sharp += sd.sharp * sd.dur;
    e.pan += sd.pan * sd.dur;
    notes.set(sd.midi, e);
  }
  return [...notes.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([midi, e]) => ({ midi, weight: e.w, sharp: e.sharp / e.w, pan: e.pan / e.w }));
}

export function renderConstant(shape: Shape, m: Mapping, s: Settings, sr: number): Clip {
  if (m === 'spectrum') return sustain(spectrumPartials(shape, s.spectrum), sr, () => [[1, 1]]);
  if (m === 'radius') {
    const parts = radiusDrone(shape, s.radius).map((b) => ({ hz: whole(b.hz, CONSTANT_SECONDS), amp: b.weight, pan: b.pan, bright: b.bright }));
    // The lap's tone: harmonics 2, 3 and 5 grow with brightness.
    return sustain(parts, sr, (p) => {
      const br = p.bright ?? 0;
      return [
        [1, 1],
        [2, 0.25 + 0.5 * br],
        [3, 0.35 * br],
        [5, 0.2 * br],
      ];
    });
  }
  const chord = cornerChord(shape, s.corners);
  // Sub-octave at half the note: keep the note a whole number of cycles in half the clip.
  return sustain(
    chord.map((c) => ({ hz: whole(440 * 2 ** ((c.midi - 69) / 12), CONSTANT_SECONDS, 2), amp: Math.sqrt(c.weight), pan: c.pan, fm: 0.3 + c.sharp })),
    sr,
    () => [
      [1, 1],
      [0.5, 0.3],
    ],
  );
}

/**
 * The pen held: running round the loop without stopping, for a whole number
 * of laps (about `CONSTANT_SECONDS`), filters run over a lap first so the
 * buffer starts where it ends.
 */
export function renderPenConstant(shape: Shape, speed: number, sr: number): Clip {
  if (speed <= 0) return blank(CONSTANT_SECONDS, sr);
  const lap = shape.steps / speed;
  const laps = Math.max(1, Math.round(CONSTANT_SECONDS / lap));
  const len = Math.round(laps * lap * sr);
  // Samples per lap need not be whole: index by lap share so the buffer still closes.
  const per = len / laps;
  const warm = Math.ceil(per) * Math.max(1, Math.ceil((0.05 * sr) / per));
  const m = warm + len + 1;
  const zx = new Float64Array(m);
  const zy = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const [x, y] = pointAt(shape.full, shape.steps, (i - warm) / per);
    zx[i] = x;
    zy[i] = y;
  }
  const vx = gradient(zx).map((v) => (v * sr) / speed);
  const vy = gradient(zy).map((v) => (v * sr) / speed);
  butter2(vx, 9000, sr, 'low');
  butter2(vy, 9000, sr, 'low');
  const yl = new Float64Array(m);
  const yr = new Float64Array(m);
  let sv = 0;
  let sz = 0;
  for (let i = warm; i < m; i++) {
    sv += vx[i] ** 2 + vy[i] ** 2;
    sz += zx[i] ** 2 + zy[i] ** 2;
  }
  const rv = Math.sqrt(sv / (2 * len)) + 1e-9;
  const rz = Math.sqrt(sz / (2 * len)) + 1e-9;
  for (let i = 0; i < m; i++) {
    yl[i] = (0.7 * vx[i]) / rv + (0.3 * zx[i]) / rz;
    yr[i] = (0.7 * vy[i]) / rv + (0.3 * zy[i]) / rz;
  }
  butter2(yl, 60, sr, 'high');
  butter2(yr, 60, sr, 'high');
  const clip: Clip = { sr, seconds: len / sr, left: new Float32Array(len), right: new Float32Array(len) };
  for (let i = 0; i < len; i++) {
    clip.left[i] = yl[warm + i];
    clip.right[i] = yr[warm + i];
  }
  normalise(clip.left, clip.right, VOICE_RMS);
  return clip;
}
